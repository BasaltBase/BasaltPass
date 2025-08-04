# 路由结构重构

以前的router太乱了，将原来的单个 `router.go` 文件重构为多个子文件。

## 新的文件结构

```
internal/api/
├── router.go              # 主路由注册文件
└── routes/
    ├── admin.go           # 管理员相关路由
    ├── tenant.go          # 租户相关路由
    ├── user.go            # 用户相关路由
    ├── oauth.go           # OAuth相关路由
    └── public.go          # 公开路由（无需认证）
```

## 路由分类

### 1. `public.go` - 公开路由
- 健康检查端点 `/health`
- 支付页面路由 `/payment/checkout/:session_id`
- 模拟支付路由 `/payment/simulate/:session_id`
- 未实现端点 `./not-implemented`

### 2. `oauth.go` - OAuth相关路由
- OIDC Discovery端点 `/.well-known/openid-configuration`
- OAuth2授权端点 `/oauth/authorize`
- 令牌端点 `/oauth/token`
- 用户信息端点 `/oauth/userinfo`
- JWKS端点 `/oauth/jwks`
- One-Tap登录和Silent Auth端点

### 3. `user.go` - 用户相关路由
- 用户认证 `/api/v1/auth/*`
- 用户资料管理 `/api/v1/user/*`
- Passkey认证 `/api/v1/passkey/*`
- 用户搜索 `/api/v1/users/search`
- 团队管理 `/api/v1/teams/*`
- 邀请管理 `/api/v1/invitations/*`
- 钱包管理 `/api/v1/wallet/*`
- 支付管理 `/api/v1/payment/*`
- 订单管理 `/api/v1/orders/*`
- 安全设置 `/api/v1/security/*`
- 通知管理 `/api/v1/notifications/*`
- 订阅系统 `/api/v1/subscriptions/*`

### 4. `tenant.go` - 租户相关路由
- 租户级管理API `/api/v1/admin/*`（需要租户上下文和管理员权限）
- 租户信息管理
- 租户通知管理
- 租户角色管理
- 租户订阅管理
- 租户应用管理
- 租户OAuth客户端管理
- 一般租户路由 `/api/v1/tenant/*`（需要租户上下文但不需要管理员权限）

### 5. `admin.go` - 管理员相关路由
- 平台级管理API `/_admin/*`（超级管理员）
- 系统级管理员路由 `/api/v1/admin/*`
- 管理员仪表板
- 用户管理
- 角色管理
- 系统级应用管理
- 管理员通知
- 管理员订阅系统管理

## 使用方式

主路由文件 `router.go` 现在只负责调用各个子路由的注册函数：

```go
func RegisterRoutes(app *fiber.App) {
    // 注册公开路由（无需认证）
    routes.RegisterPublicRoutes(app)
    
    // 注册OAuth相关路由
    routes.RegisterOAuthRoutes(app)
    
    // API v1 路由
    v1 := app.Group("/api/v1")
    
    // 注册用户相关路由
    routes.RegisterUserRoutes(v1)
    
    // 注册租户相关路由
    routes.RegisterTenantRoutes(v1)
    
    // 注册管理员相关路由
    routes.RegisterAdminRoutes(v1)
}
```

## 注意事项

- 所有路由的实际处理逻辑（handlers）保持不变
- 路由的URL结构和访问权限要求保持不变
- 中间件的使用方式保持不变
- 向后兼容性得到保证
