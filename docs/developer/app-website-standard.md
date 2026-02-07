# BasaltPass 集成标准：应用 / 网站开发手册

本文档定义“一个符合 BasaltPass 标准的应用/网站”在接入身份、权限、多租户与 S2S 能力时应包含的内容与推荐实践。

目标是让你的产品：

- 能用 OAuth2/OIDC 与 BasaltPass 对接登录
- 能在多租户（Tenant）场景下正确隔离与鉴权
- 能用最小权限（Scopes）把权限边界管清楚
- 能在后端服务间（S2S）安全、可审计地获取用户/权限数据

> 约定：本文中的“应用/网站”泛指你的业务产品（Web/SPA/移动端/后端服务）。

---

## 你需要做的选择（先把路走通）

BasaltPass 支持两类主流对接方式，实际项目通常两者都会用：

1. **用户登录（OAuth2/OIDC）**：用户点击你产品的“登录/注册”后，**跳转到 BasaltPass 托管的登录/注册页面**完成操作；随后由 BasaltPass 对你的应用发放授权，你通过回调拿到 authorization code，再换取 token。
   - 推荐：Authorization Code + PKCE
   - 文档：`docs/developer/oauth2-oidc.md`、`docs/user/oauth2.md`

2. **服务间调用（S2S）**：你的后端服务用 `client_id + client_secret` 拉取用户/RBAC 等信息。
   - 路由前缀：`/api/v1/s2s/*`
   - 需要 scopes（最小权限），并建议启用限流/审计

---

## 必须具备（MUST）清单

### 1) OAuth Client 配置（管理端创建）

你需要在 Tenant/Admin 控制台为你的产品创建 OAuth Client，并配置：

- **Redirect URIs**：OAuth 回调地址（例如 `https://yourapp.com/oauth/callback`）
- **CORS Origins**：如果你是 SPA/前端直连，需要配置允许的 Origin
- **Scopes**：按最小权限勾选（不要一把梭 `s2s.read`）
- **PKCE**：对 SPA/移动端必须启用（服务端应用也建议启用）

相关设置（平台级白名单）：

- `oauth.allowed_redirect_hosts`
- `oauth.allowed_scopes`

### 2) 标准 OAuth2/OIDC 登录流程（Authorization Code + PKCE）

你的产品必须支持：

- 提供“登录/注册”入口，统一走 **redirect 到 BasaltPass**（不要在业务侧自建账号密码表单）
- 生成并校验 `state`（防 CSRF）
- 生成并校验 PKCE：`code_verifier` / `code_challenge=S256`
- 跳转到授权端点：`GET /api/v1/oauth/authorize`
- （如出现）处理用户授权/同意页：`POST /api/v1/oauth/consent`（由 BasaltPass 托管页面完成）
- 用授权码换 token：`POST /api/v1/oauth/token`
- （可选但推荐）通过 discovery 配置端点：`GET /api/v1/.well-known/openid-configuration`

最小推荐 scopes：

- `openid`（OIDC 必需）
- `profile`、`email`（按需求）
- `offline_access`（需要 refresh_token 时）

> 标准体验：登录、注册、忘记密码、授权同意等交互都在 BasaltPass 域名下完成；你的应用只负责发起 authorize、处理 callback、保存会话并继续业务流程。

### 3) 回调页与登录态落地（对 Web/SPA 很关键）

你的产品必须包含一个 OAuth callback 处理页面/路由（即 Redirect URI 对应的页面），它至少需要：

- 从 callback 参数读取 `code` 与 `state`，校验 `state`
- 用 `code + code_verifier` 调用 `/api/v1/oauth/token` 换取 token
- 建立你自己的登录态（建议：后端签发业务 session，或把 token 放在服务端/安全存储中）
- 处理错误分支：用户取消授权、code 过期、scope 不匹配、redirect 不允许等

### 4) Token 验证与会话管理

你的后端（或 API 网关）必须：

- 验证 JWT：签名（JWKS）、`exp`、`iss`、`aud` 等
- 把 `sub` 当作 **唯一用户标识**（在你系统中持久化关联）
- 处理 token 过期：
  - Web/SPA：使用 refresh token（若启用）或重新走 authorize
  - 服务端：可用 introspection（如你偏好中心化校验）

相关端点：

- `GET /api/v1/oauth/jwks`
- `POST /api/v1/oauth/introspect`
- `POST /api/v1/oauth/revoke`

### 5) 多租户上下文（Tenant）必须显式处理

BasaltPass 的多数租户接口依赖 tenant 上下文；你的应用也必须做到：

- 明确“当前租户”是什么（来源通常是 token 里的 `tid`，或你的业务上下文）
- 任何租户隔离的数据访问必须带 tenant 条件
- 前端/后端调用 BasaltPass 租户接口时，按约定传递租户上下文（具体以现有中间件/handler 为准）

参考：`docs/developer/rbac.md`、`docs/developer/api-conventions.md`

### 6) RBAC（角色/权限）必须在业务侧真正生效

你至少需要一个“鉴权点”把权限落到业务动作上，例如：

- UI 层：根据 permission codes 决定是否展示按钮（弱约束）
- API 层：根据 permission codes/roles 决定是否允许执行（强约束，必须做）

你可以选择：

- **方案 A（推荐，集中管理）**：业务后端通过 S2S 拉取用户 `permission_codes`，短 TTL 缓存。
- **方案 B（嵌入式）**：把角色/权限同步到你的业务库（需要一致性策略）。

---

## 推荐具备（SHOULD）清单

### 1) 使用 S2S + 最小 scopes

如果你的后端需要读取用户资料、RBAC、钱包、消息、商品拥有等信息，建议使用 S2S API。

S2S scopes（示例）：

- `s2s.user.read`
- `s2s.user.write`（仅用于测试写入链路，例如 PATCH nickname）
- `s2s.rbac.read`
- `s2s.wallet.read`
- `s2s.messages.read`
- `s2s.products.read`

不要把写权限给所有 client；写 scope 建议只给内部测试/受控服务。

### 2) S2S 安全基线

- **禁止 query 传 secret**：生产环境建议 `s2s.allow_query_credentials: false`
- **请求限流**：按 `client_id` 限流（多实例建议网关层全局限流）
- **审计日志**：记录 `request_id/client_id/app_id/tenant_id/path/status`

### 3) 错误与请求追踪（request id）

- BasaltPass 全局中间件会生成 request id
- S2S envelope 会返回 `request_id`
- 你的服务建议把 BasaltPass 的 `request_id` 透传到自身日志字段，方便跨服务排障

### 4) 本地开发与环境隔离

- 本地跑全栈：`./scripts/dev.sh up`
- 默认端口：backend `8080`，user `5173`，tenant `5174`，admin `5175`
- 建议为 dev/staging/prod 使用不同的 OAuth Client 与 redirect/cors 配置

---

## S2S 对接建议（参考实现）

典型后端流程：

1. 你的 API 收到用户 access token（Bearer）
2. 校验 token，拿到 `sub`（user id）与 `tid`（tenant id）
3. 需要鉴权时：用 S2S 调用 BasaltPass 获取 `permission_codes`
4. 在你自己的业务 API 层做授权判断

S2S API 返回使用统一 envelope；错误处理建议优先以 HTTP status 为准，再兼容解析 body。

参考：`docs/reference/s2s-api.md`、`docs/user/s2s.md`

---

## 常见踩坑清单

- 回调被拒：检查 `oauth.allowed_redirect_hosts` 与 client 的 redirect URI 是否匹配
- scope 被拒：检查 `oauth.allowed_scopes` 与 client 配置 scopes
- SPA 未使用 PKCE：会导致授权链路不安全或直接失败
- 多租户未隔离：查询/写入未带 tenant 条件会造成越权
- 前端存 token 到 `localStorage`：容易被 XSS 窃取（推荐 httpOnly cookie 或内存 + 刷新策略）

---

## 进一步阅读

- API 约定：`docs/developer/api-conventions.md`
- OAuth2/OIDC：`docs/developer/oauth2-oidc.md`
- RBAC：`docs/developer/rbac.md`
- 配置体系：`docs/developer/configuration.md`
- BasaltPass系统后端开发指南：`docs/developer/backend.md`
- BasaltPass系统前端开发指南：`docs/developer/frontend.md`
