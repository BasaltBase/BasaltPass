# 平台管理员 API（/api/v1/admin）

平台管理员用于全局管理：用户、租户、钱包、产品/订阅、OAuth clients、系统设置等。

## 鉴权要求

通常需要：
- JWT
- 具备平台管理员权限（SuperAdminMiddleware）

## 兼容性提示：/tenant 前缀别名

历史原因，一些管理员端点存在旧前缀：
- 旧：`/api/v1/tenant/...`
- 新：`/api/v1/admin/...`

建议新集成只使用 `/api/v1/admin/...`。

## 常用能力（示例）

- Dashboard
  - `GET /api/v1/admin/dashboard/stats`
  - `GET /api/v1/admin/dashboard/activities`

- Users
  - `GET /api/v1/admin/users`
  - `POST /api/v1/admin/users`
  - `POST /api/v1/admin/users/:id/ban`

- Tenants
  - `GET /api/v1/admin/tenants`
  - `POST /api/v1/admin/tenants`

- Settings
  - `GET /api/v1/admin/settings`
  - `POST /api/v1/admin/settings`
  - `PUT /api/v1/admin/settings/bulk`

- OAuth Clients
  - `/api/v1/admin/oauth/clients/*`

更多端点请查看：`docs/ROUTES.md`。
