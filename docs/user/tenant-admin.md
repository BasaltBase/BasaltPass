# 租户控制台 API（/api/v1/tenant）

租户控制台用于“某个租户”管理自己的资源。

## 鉴权要求

通常需要：
- JWT
- console scope 为 `tenant`
- 租户上下文（TenantMiddleware）

## 常用能力

- 租户信息
  - `GET /api/v1/tenant/info`

- 租户用户
  - `GET /api/v1/tenant/users`
  - `GET /api/v1/tenant/users/stats`
  - `POST /api/v1/tenant/users/invite`

- 租户 RBAC
  - `/api/v1/tenant/permissions/*`
  - `/api/v1/tenant/roles/*`

- 租户通知
  - `/api/v1/tenant/notifications/*`

- 租户 OAuth 客户端
  - `/api/v1/tenant/oauth/clients/*`

- 租户订阅/商品/定价
  - `/api/v1/tenant/subscription/products/*`
  - `/api/v1/tenant/subscription/plans/*`
  - `/api/v1/tenant/subscription/prices/*`
  - `/api/v1/tenant/subscription/subscriptions/*`
  - `/api/v1/tenant/subscription/coupons/*`

端点细节请以 `docs/ROUTES.md` 为准，并结合前端对应页面调用（tenant 控制台）。
