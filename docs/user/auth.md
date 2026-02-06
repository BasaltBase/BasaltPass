# 鉴权与会话

BasaltPass 的“用户侧/租户侧/管理员侧”大多数 API 使用 JWT。

## JWT Header

```
Authorization: Bearer <access_token>
```

## Console Scope（scp）

JWT 内含 `scp` 字段，用于区分控制台权限语义：

- `user`：普通用户侧
- `tenant`：租户控制台
- `admin`：平台管理员控制台

很多路由会显式要求 scope，例如：
- `/api/v1/tenant/*` 常见要求：JWT + scope=tenant + tenant 上下文
- `/api/v1/admin/*` 常见要求：JWT + 管理员权限

## Token 刷新

`POST /api/v1/auth/refresh`

> 刷新时后端会重新推导非 admin scope 的 tenant 上下文（避免信任旧 token 的租户信息）。

## 2FA（TOTP）

用户安全相关端点：
- `POST /api/v1/security/2fa/setup`
- `POST /api/v1/security/2fa/verify`
- `POST /api/v1/security/2fa/disable`

此外登录流程里也可能出现：
- `POST /api/v1/auth/verify-2fa`

具体返回结构以实际 handler 为准；你可以用 `docs/ROUTES.md` 快速定位端点是否存在。
