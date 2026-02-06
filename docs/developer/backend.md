# 后端开发指南

## 技术栈

- Go（项目内 go.mod）
- Fiber v2
- GORM（SQLite 为默认开发数据库）

## 路由注册位置

入口：`basaltpass-backend/internal/api/v1/router.go`

路由按模块拆分在：
- `basaltpass-backend/internal/api/v1/routes/public.go`
- `basaltpass-backend/internal/api/v1/routes/oauth.go`
- `basaltpass-backend/internal/api/v1/routes/user.go`
- `basaltpass-backend/internal/api/v1/routes/tenant.go`
- `basaltpass-backend/internal/api/v1/routes/admin.go`
- `basaltpass-backend/internal/api/v1/routes/s2s.go`

## 中间件（常见）

- `JWTMiddleware()`：用户 JWT 鉴权
- `TenantMiddleware()`：从 JWT/上下文推导租户，做租户隔离
- `SuperAdminMiddleware()`：平台管理员权限
- `RequireConsoleScope("tenant")`：控制台 scope 限制
- `ClientAuthMiddleware("s2s.read")`：S2S client 凭证与 scope

## 路由表导出

后端启动（develop）会导出：`docs/ROUTES.md`。
如果你要新增/修改路由，请优先看该表验证是否注册成功。

## 数据库与迁移

后端启动时会执行迁移逻辑（见 `internal/migration`）。
- 开发期默认 SQLite
- 迁移策略以“启动时自动迁移 + 初始化默认数据”为主

## Console Scope 与多控制台

JWT 中 `scp` 字段决定用户所处控制台语义：
- `user`：用户侧
- `tenant`：租户侧
- `admin`：平台管理员侧

租户相关路由通常要求：JWT + `RequireConsoleScope("tenant")` + `TenantMiddleware()`。
管理员相关路由通常要求：JWT + `SuperAdminMiddleware()`。
