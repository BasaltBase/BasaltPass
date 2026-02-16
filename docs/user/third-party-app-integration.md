# 第三方 App 接入指南（基于 CanShelf 实践）

本文是一份“可落地”的 BasaltPass 第三方应用接入手册，按真实项目（CanShelf）实践整理，覆盖：

- OAuth2/OIDC 登录接入（Authorization Code + PKCE）
- 后端回调换 token 与安全会话落地
- S2S 拉取租户角色/权限并做业务鉴权
- 多租户上下文处理
- 角色权限初始化与批量导入
- 常见错误排查与上线前检查清单

适用对象：接入方后端工程师、架构师、技术负责人。

---

## 1. 总览：推荐接入架构

推荐使用“前端发起登录 + 后端处理 OAuth 回调 + 后端调用 S2S 鉴权”的模式。

```text
前端点击登录
  -> 业务后端 /auth/login
  -> 重定向 BasaltPass /oauth/authorize
  -> BasaltPass 登录/授权
  -> 回调到业务后端 /auth/callback
  -> 后端换 token + 验证 + 建立业务 session（httpOnly cookie）
  -> 前端携带 session 访问业务 API
  -> 业务后端按需调用 BasaltPass /s2s 查询 role/permission
  -> 业务后端执行最终授权判断
```

为什么推荐这样做：

- 避免在浏览器暴露 `client_secret`
- 避免把 token 存在 `localStorage`
- 方便在后端统一做租户与权限控制

---

## 2. 准备工作（BasaltPass 侧）

在 BasaltPass 控制台创建 OAuth Client，至少配置：

- Redirect URI（例如：`https://your-app.com/api/auth/callback`）
- CORS Origins（若有前端直连场景）
- Scopes（最小权限）
  - 登录常用：`openid profile email`
  - 需要长期会话：`offline_access`
  - 需要 S2S：`s2s.user.read`、`s2s.rbac.read`（按需增减）

参考：

- OAuth 对接：`./oauth2.md`
- S2S：`./s2s.md`
- 路由索引：`../ROUTES.md`

---

## 3. OAuth 登录接入（CanShelf 模式）

### 3.1 登录入口（后端）

后端生成：

- `state`（防 CSRF）
- `code_verifier` 与 `code_challenge`

然后重定向到 BasaltPass authorize 端点。

> 关键差异：BasaltPass 的 `code_challenge` 使用 **SHA256 的 hex 编码**，不是 RFC 常见的 base64url 编码。  
> 这也是多数 `invalid_grant` 的根因。

### 3.2 回调处理（后端）

回调步骤建议固定为：

1. 校验 `state`
2. 用 `code + code_verifier` 调用 `/api/v1/oauth/token`
3. 校验返回 token（JWT/JWKS 或 introspection）
4. 提取 `sub`（用户标识）和 `tid`（租户标识）
5. 建立业务 session（推荐 httpOnly cookie）

### 3.3 会话建议

- Cookie：`HttpOnly + Secure + SameSite`
- 服务端保存 `session_id -> user_id/tenant_id`
- 每次请求通过 session 恢复当前用户上下文

---

## 4. S2S 鉴权接入（角色/权限）

业务后端在鉴权阶段，调用 BasaltPass S2S 接口：

- `GET /api/v1/s2s/users/{id}/role-codes?tenant_id=...`
- `GET /api/v1/s2s/users/{id}/permissions?tenant_id=...`

请求头：

- `client_id`
- `client_secret`

建议：

- 对 `role_codes` / `permission_codes` 做短 TTL 缓存（例如 30~120 秒）
- 以权限码作为 API 层强鉴权依据
- 对 superadmin 做显式全通配策略

---

## 5. 多租户处理规范

接入方必须保证：

- 所有业务查询写入都带 `tenant_id`
- 鉴权时显式传 `tenant_id` 给 S2S 接口
- 禁止跨租户复用用户角色/权限缓存（缓存键需包含 tenant）

推荐缓存键：

`roles:{user_id}:{tenant_id}`

---

## 6. 角色与权限设计建议（可直接套用）

以 CanShelf 为例，可用三层角色：

- `user`：只读
- `admin`：业务管理（CRUD）
- `superadmin`：全量权限

权限码采用 `resource.action` 规范，例如：

- `entry.create|read|update|delete`
- `branch.create|read|update|delete`
- `version.create|read|update|delete`
- `tree.create|read|update|delete`

这样接入方后端可统一实现：

- `require_permission("entry.update")`
- `require_permission("tree.delete")`

---

## 7. 权限初始化（批量导入）

若你有大量权限码/角色码，建议用 BasaltPass 导入接口初始化：

- 租户权限导入：`POST /api/v1/tenant/permissions/import`
- 租户角色导入：`POST /api/v1/tenant/roles/import`
- 应用权限导入：`POST /api/v1/tenant/apps/:app_id/permissions/import`
- 应用角色导入：`POST /api/v1/tenant/apps/:app_id/roles/import`

导入规则（当前行为）：

- 支持文本粘贴或文件上传
- 自动去重
- 自动统一小写
- 已存在码自动跳过（幂等友好）

校验接口（用于接入方快速判断是否有权限）：

- `POST /api/v1/tenant/permissions/check`
- `POST /api/v1/tenant/roles/check`
- `POST /api/v1/tenant/apps/:app_id/users/:user_id/check-access`

---

## 8. CanShelf 参考实现位置

CanShelf 后端（FastAPI）可作为完整样板，关键点：

- OAuth + PKCE：`CanShelf/backend/app/integrations/basaltpass.py`
- 登录/回调：`CanShelf/backend/app/api/routes/auth.py`
- 当前用户恢复 + S2S 拉权限：`CanShelf/backend/app/api/deps.py`
- 权限模型：`CanShelf/backend/app/models/rbac.py`
- 权限码与默认映射：`CanShelf/backend/app/core/permissions.py`

---

## 9. 常见问题排查

### 9.1 `invalid_grant`（换 token 失败）

优先检查：

- `code_challenge` 是否用 hex SHA256
- `code_verifier` 是否与授权时一致
- `redirect_uri` 是否与 authorize 阶段完全一致
- `code` 是否被重复消费

### 9.2 `invalid_client`

- 检查 `client_id/client_secret` 是否正确
- 检查 OAuth Client 是否启用

### 9.3 `insufficient_scope`

- 检查 OAuth Client 的 scopes 配置
- 检查 S2S 接口所需 scope 与调用方是否匹配

### 9.4 鉴权结果异常

- 检查 tenant 传参是否正确
- 检查缓存是否按 `user_id + tenant_id` 维度隔离
- 检查权限码是否统一为小写

---

## 10. 上线前检查清单（Checklist）

- [ ] OAuth Client 已配置正确 redirect/cors/scopes
- [ ] PKCE 使用 hex SHA256 challenge
- [ ] 回调在后端处理，不暴露 `client_secret`
- [ ] session 使用安全 cookie 策略
- [ ] 业务 API 使用权限码做强校验
- [ ] 所有业务数据访问都带 tenant 条件
- [ ] S2S 调用做了超时、重试和短 TTL 缓存
- [ ] 角色/权限初始化完成并验证通过

---

## 进一步阅读

- OAuth：`./oauth2.md`
- S2S：`./s2s.md`
- 租户 API：`./tenant-admin.md`
- API 索引：`./routes-and-openapi.md`
- 开发规范（集成标准）：`../developer/app-website-standard.md`
