# BasaltPass 安全审计报告

- 审计日期：2026-03-19
- 审计方式：静态代码审计、配置审计、路由与认证链路复核
- 审计范围：
  - `basaltpass-backend`
  - `basaltpass-frontend`
  - 根目录部署与示例配置
- 未覆盖项：
  - 运行时渗透测试
  - 真实部署环境核验
  - 第三方依赖 CVE 在线扫描
  - Git 历史中的秘密泄露排查

## 一、执行摘要

本次审计确认 `BasaltPass` 存在多项可被代码直接证明的安全问题，既包括可直接导致身份体系失守的高危配置，也包括多租户上下文漂移、前端开放重定向、Passkey 二次验证绑定不严等业务逻辑问题。

最严重的问题集中在以下几类：

1. 默认密钥与默认高权限口令仍可能在误配置下进入运行环境。
2. `develop` 模式下的 CORS 策略过于宽松，且默认环境即为 `develop`。
3. 登录、刷新、Passkey 2FA 与 OAuth 会话之间存在若干令牌边界不一致问题。
4. 前端存在可确认的开放重定向与若干不安全链接处理问题。

## 二、风险总览

| 严重级别 | 数量 |
|---|---:|
| Critical | 2 |
| High | 5 |
| Medium | 5 |
| Low | 3 |

## 三、关键发现

### 1. `docker-compose.yml` 为 `JWT_SECRET` 提供固定默认值 `supersecret`

- 严重性：Critical
- 影响范围：根部署配置，所有 JWT 签发与校验链路
- 证据：
  - `docker-compose.yml` 中存在 `JWT_SECRET=${JWT_SECRET:-supersecret}`
- 风险说明：
  - 当运维未显式提供 `.env` 或环境变量时，系统会使用固定已知密钥。
  - 攻击者一旦知道该默认值，即可伪造 access token、refresh token、pre-auth token 等所有基于同一密钥的 JWT。
- 利用条件：
  - 部署遗漏 `JWT_SECRET`
- 修复建议：
  - 删除默认值回退，未设置时直接启动失败。
  - 在启动阶段增加密钥长度与熵检查。

### 2. 默认环境为 `develop`，且开发态 CORS 允许任意非空 Origin 并携带凭据

- 严重性：Critical
- 影响范围：浏览器访问的全部 API
- 证据：
  - `internal/config/config.go` 默认 `env=develop`
  - `internal/config/config.go` 默认 `cors.allow_credentials=true`
  - `internal/middleware/core/global.go` 在 `develop` 下对任意非空 `Origin` 返回允许
- 风险说明：
  - 若生产部署忘记显式设置 `BASALTPASS_ENV=production`，后端将进入开发态 CORS。
  - 浏览器会允许任意站点跨域携带 Cookie/凭据访问 API，显著放大 CSRF 与跨站数据读取风险。
- 利用条件：
  - 生产环境误用默认 `develop`
- 修复建议：
  - 将默认环境改为更保守的值，或要求未显式设置环境时拒绝启动。
  - 生产环境启动时若 `env=develop` 直接报错退出。

### 3. 配置管理员邮箱但未配置密码时，系统自动使用默认口令 `Admin@12345`

- 严重性：High
- 影响范围：平台级管理员账号
- 证据：
  - `internal/migration/migrate.go` 的 `seedConfiguredAdmin()` 中，`password == ""` 时回退为 `Admin@12345`
- 风险说明：
  - 若运维只设置了管理员邮箱，漏配密码，系统仍会创建高权限账号，且口令可预测。
- 利用条件：
  - 配置了 `BASALTPASS_ADMIN_EMAIL`，但未配置 `BASALTPASS_ADMIN_PASSWORD`
- 修复建议：
  - 密码为空时拒绝创建管理员并拒绝启动。
  - 禁止任何默认管理员密码。

### 4. 新库在 `develop` 环境下会注入弱口令超级管理员

- 严重性：High
- 影响范围：首次初始化环境
- 证据：
  - `internal/migration/migrate.go` 在新库 + `config.IsDevelop()` 时创建 `a@.a / 123456` 超管
- 风险说明：
  - 一旦生产环境误配成 `develop`，首次启动即可留下可公开猜测的超级管理员账户。
- 利用条件：
  - 新数据库
  - 环境误配为 `develop`
- 修复建议：
  - 开发种子必须再加一层显式开关。
  - 生产构建彻底移除开发超级管理员注入逻辑。

### 5. 登录页存在开放重定向

- 严重性：High
- 影响范围：前端登录入口
- 证据：
  - `src/features/auth/Login.tsx` 将 `redirect` 查询参数在满足 `http://` 或 `https://` 时直接赋给 `window.location.href`
- 风险说明：
  - 攻击者可构造合法站点登录链接，诱导用户登录后跳转到钓鱼域名。
  - 该问题尤其容易被用于社工链路与 OAuth 前置欺骗。
- 利用条件：
  - 用户点击携带恶意 `redirect` 的登录链接
- 修复建议：
  - 仅允许同源相对路径或白名单地址。
  - 严禁接受任意绝对 URL。

### 6. Passkey 二次验证未绑定 `pre_auth_token`，仍信任客户端传入的 `user_id`

- 严重性：High
- 影响范围：`/api/v1/passkey/2fa/begin`、`/api/v1/passkey/2fa/finish`
- 证据：
  - `internal/api/v1/routes/oauth.go` 中 `passkey/2fa/*` 路由未挂 `Verify2FARateLimit`
  - `internal/handler/public/passkey/handler.go` 的 `Begin2FAHandler` / `Finish2FAHandler` 直接从请求体接收 `user_id`
  - 对比 `internal/service/auth/service.go`，TOTP 2FA 已改为通过 `pre_auth_token` 绑定用户身份
- 风险说明：
  - Passkey 2FA 与 TOTP 2FA 的身份绑定策略不一致。
  - 攻击者可用猜测的 `user_id` 对接口进行枚举、探测某用户是否注册 Passkey，并制造额外会话状态压力。
- 利用条件：
  - 可访问 Passkey 2FA 端点
- 修复建议：
  - 强制要求 `pre_auth_token`，从服务端解析 `user_id` / `tenant_id`。
  - 给 `passkey/2fa/*` 增加与 `verify-2fa` 同级别限流。

### 7. Refresh 后重新签发的 JWT 将 `tid` 固定为 `0`

- 严重性：High
- 影响范围：多租户用户刷新令牌后的上下文
- 证据：
  - `internal/service/auth/service.go` 的 `Refresh()` 最终固定调用 `GenerateTokenPairWithTenantAndScope(userID, 0, scope)`
  - `internal/service/access/access_service.go` 在 `requestedTenantID == 0` 时会取用户最早的一条租户关联
- 风险说明：
  - Refresh 之后的租户声明与初始登录语义不一致，可能造成租户上下文漂移。
  - 对多租户用户来说，这会导致“刷新前后身份所在租户不一致”或“依赖 tid 的后续逻辑选错租户”。
- 利用条件：
  - 多租户用户使用 refresh 获取新 token
- 修复建议：
  - Refresh 时从数据库重新解析合法租户上下文，不可固定写 `0`。
  - 增加多租户刷新回归测试。

### 8. OAuth 会话提取逻辑接受任意有效 JWT，未限制 `typ`

- 严重性：Medium
- 影响范围：One-Tap / Silent Auth / Check Session
- 证据：
  - `internal/handler/public/oauth/onetap.go` 的 `getUserFromSession()` 仅校验 token 有效与 `sub`，未校验 `typ`
  - `internal/service/auth/jwt.go` 中 refresh token 明确带有 `typ=refresh`
- 风险说明：
  - 如果 refresh token 通过 `Authorization` 头或其他可解析位置进入上述会话逻辑，它可能被当成“已登录会话”使用。
  - 这会扩大 refresh token 的用途边界。
- 利用条件：
  - 客户端错误地把 refresh token 当 Bearer 使用，或 token 泄露后被错误接入
- 修复建议：
  - 对会话类接口显式只接受 access token。
  - 拒绝 `typ=refresh`、`typ=pre_auth` 等非会话令牌。

### 9. 自动刷新后把新 access token 写入错误的 localStorage 键

- 严重性：Medium
- 影响范围：前端三套控制台应用
- 证据：
  - `src/shared/utils/auth.ts` 使用 `VITE_TOKEN_KEY` 决定实际 token 存储键
  - `src/shared/api/client.ts` 刷新成功后却固定写入 `localStorage.setItem('access_token', access_token)`
- 风险说明：
  - 新 token 与真实读取键可能不一致，导致旧 token 继续被使用。
  - 这更偏“认证状态错乱”，但在复杂登录流程中容易演变为边界混乱、异常重试与错误绕过。
- 利用条件：
  - 各端使用不同 `VITE_TOKEN_KEY`
- 修复建议：
  - 刷新后统一调用 `setAccessToken()`。
  - 清理历史遗留的错误键。

### 10. 维护模式允许使用已过期 JWT 作为管理员放行依据

- 严重性：Medium
- 影响范围：维护模式访问控制
- 证据：
  - `internal/middleware/ops/maintenance.go` 调用 `authn.ParseJWTToken(tokenStr, true)`
  - `internal/middleware/authn/jwt.go` 中 `true` 会启用 `WithoutClaimsValidation()`
- 风险说明：
  - 维护模式下只要旧 JWT 还能验签成功，就可能继续作为超管/租户管理员绕过维护限制。
- 利用条件：
  - 维护模式开启
  - 攻击者持有历史已过期但未换密钥的管理员 JWT
- 修复建议：
  - 维护模式放行也必须检查 `exp`。
  - 如确需特殊放行，应单独设计短期维护票据。

### 11. TOTP 历史明文兼容逻辑仍允许数据库内保留未加密 secret

- 严重性：Medium
- 影响范围：TOTP 秘钥存储
- 证据：
  - `internal/utils/crypto.go` 的 `DecryptTOTPSecret()` 对无 `enc:v1:` 前缀的数据直接原样返回
- 风险说明：
  - 历史数据若未迁移，数据库泄露时 TOTP seed 将以明文形式暴露。
- 利用条件：
  - 库内仍存在未迁移旧数据
- 修复建议：
  - 启动迁移任务，将旧明文全部重写为加密格式。
  - 启动时检测到明文记录即告警。

### 12. OAuth 同意页与个人资料页存在不安全链接协议处理

- 严重性：Medium
- 影响范围：
  - `src/features/auth/OAuthConsent.tsx`
  - `src/features/user/profile/Index.tsx`
- 证据：
  - `privacy_policy_url` / `terms_of_service_url` 直接进入 `<a href>`
  - `userProfile.website` 直接进入 `<a href>`
- 风险说明：
  - 若这些值可被恶意写入，可能出现 `javascript:` 等危险协议链接。
  - 这更偏“点击触发型前端风险”，但属于可确认的输入未收敛。
- 利用条件：
  - 攻击者可控对应 URL 字段
- 修复建议：
  - 前后端都必须限制协议为 `https:` 或白名单协议。
  - 统一做 URL 规范化与校验。

### 13. `TOTP_ENCRYPTION_KEY` 的 64 位十六进制分支实现与注释不一致

- 严重性：Low
- 影响范围：TOTP 加密密钥派生
- 证据：
  - `internal/utils/crypto.go` 中尝试 hex 解析后并未真正使用解析结果，最终仍然对原字符串做 SHA-256
- 风险说明：
  - 该问题不会直接导致明文泄露，但会造成运维对密钥格式的安全预期与实际实现不一致。
- 修复建议：
  - 改用 `encoding/hex.DecodeString` 正确解析。

### 14. 测试模式存在 `test-secret` 回退

- 严重性：Low
- 影响范围：测试环境 JWT
- 证据：
  - `internal/common/jwt_secret.go`
  - `internal/service/auth/jwt.go`
- 风险说明：
  - 当前逻辑是为测试保留；若运行环境误设 `BASALTPASS_DYNO_MODE=test`，将退回固定密钥。
- 修复建议：
  - 仅在测试二进制内允许该逻辑，普通运行时彻底禁用。

### 15. S2S 仍保留通过 Query 传 `client_secret` 的能力开关

- 严重性：Low
- 影响范围：S2S 接口认证
- 证据：
  - `internal/config/config.go` 默认 `s2s.allow_query_credentials=false`
  - `internal/middleware/s2s/chain.go` 在开启时支持从 Query 读取凭据
- 风险说明：
  - 若误开，将导致密钥出现在日志、代理、历史记录、Referer 中。
- 修复建议：
  - 生产环境保持强制关闭。
  - 启动时如果生产配置里开启该项，应直接拒绝启动。

## 四、正向观察

以下设计方向是正确的，应继续保留并补足一致性：

- 用户密码使用 `bcrypt` 存储。
- TOTP 新逻辑已引入 `pre_auth_token`，方向正确。
- 后端默认启用了较严格的 Helmet 安全头。
- S2S 默认关闭 Query 凭据传递，说明设计上已意识到该风险。

## 五、修复优先级建议

### P0（立即修复）

1. 删除 `JWT_SECRET` 默认回退值。
2. 删除所有默认管理员密码。
3. 生产环境禁止默认 `develop`。
4. 修复登录开放重定向。

### P1（本周修复）

1. Passkey 2FA 改为强制绑定 `pre_auth_token`。
2. 修复 refresh 令牌的租户上下文重签逻辑。
3. OAuth 会话接口显式拒绝 refresh token。
4. 修复前端刷新 token 错写 localStorage 键的问题。

### P2（本迭代内修复）

1. 清理历史明文 TOTP secret。
2. 修复维护模式对过期 JWT 的放行问题。
3. 统一前端所有外链 URL 校验策略。
4. 修正 `TOTP_ENCRYPTION_KEY` hex 解析实现。

## 六、建议补充测试

1. 生产自检测试：
   - 未设置 `JWT_SECRET` 必须启动失败
   - `env=develop` 时禁止在生产配置启动
2. 认证测试：
   - refresh 前后 `tid` 一致性
   - refresh token 不能用于 OAuth 会话接口
   - Passkey 2FA 必须绑定 `pre_auth_token`
3. 前端安全测试：
   - `redirect=https://evil.example` 必须被拒绝
   - `javascript:` 链接必须被过滤
   - 不同控制台的 `VITE_TOKEN_KEY` 刷新后必须仍然一致
4. 运维测试：
   - 首次初始化环境不得出现任何默认高权限账户
   - 维护模式下过期管理员 token 不得放行

## 七、结论

`BasaltPass` 当前并非“不可上线”，但在身份与配置安全方面仍有几处明显短板，尤其是默认密钥、默认口令、开发态默认行为和登录/OAuth/Passkey 之间的令牌边界控制。这些问题一旦进入真实部署，风险并不是“理论上的”，而是可被较低成本利用或由误配置直接触发。

建议优先完成 P0 与 P1 项后，再进入下一轮复审；第二轮审计应补做依赖漏洞扫描、真实部署配置核验和针对 OAuth/OIDC 的协议级测试。
