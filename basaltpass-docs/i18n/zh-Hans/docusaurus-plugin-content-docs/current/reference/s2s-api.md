---
sidebar_position: 2
---

# S2S API

BasaltPass S2S API 面向应用后端与服务端之间的调用。

## 基础地址

- 开发环境: `http://localhost:8101/api/v1/s2s`
- 生产环境: `https://your-domain.com/api/v1/s2s`

## 认证方式

当前 S2S 接口直接使用 `client_id` 与 `client_secret` 认证。

- 推荐方式: 在请求头中传递 `client_id` 与 `client_secret`
- 兼容方式: 表单字段 `client_id` 与 `client_secret`
- Query 参数方式只有在服务端显式开启时才会接受

示例:

```http
GET /api/v1/s2s/me HTTP/1.1
Host: localhost:8101
client_id: your_client_id
client_secret: your_client_secret
Accept: application/json
```

## 响应 Envelope

成功响应:

```json
{
  "data": {},
  "error": null,
  "request_id": "req_123"
}
```

错误响应:

```json
{
  "data": null,
  "error": {
    "code": "invalid_parameter",
    "message": "invalid user id"
  },
  "request_id": "req_123"
}
```

## Scopes

当前可用的 S2S scope:

- `s2s.read`
- `s2s.user.read`
- `s2s.user.write`
- `s2s.rbac.read`
- `s2s.team.read`
- `s2s.team.write`
- `s2s.wallet.read`
- `s2s.wallet.write`
- `s2s.messages.read`
- `s2s.notifications.write`
- `s2s.products.read`
- `s2s.email.send`

其中 `s2s.read` 是旧版聚合只读 scope，目前等价于所有 `s2s.*.read`。

## 元信息接口

### `GET /health`

返回 S2S 健康状态。

### `GET /me`

返回当前 S2S 客户端上下文：

- `client_id`
- `app_id`
- `tenant_id`
- `scopes`

## 用户接口

### `GET /users/:id`

所需 scope: `s2s.user.read`

返回当前 tenant 下的用户摘要信息。

### `GET /users/lookup`

所需 scope: `s2s.user.read`

查询参数:

- `email`
- `phone`
- `q`
- `page`
- `page_size`

`email`、`phone`、`q` 三者必须且只能传一个。

### `PATCH /users/:id`

所需 scope: `s2s.user.write`

请求体:

```json
{
  "nickname": "New Nickname"
}
```

兼容旧字段:

```json
{
  "username": "New Nickname"
}
```

## RBAC 接口

### `GET /users/:id/roles`

所需 scope: `s2s.rbac.read`

可选参数:

- `tenant_id`

### `GET /users/:id/role-codes`

所需 scope: `s2s.rbac.read`

可选参数:

- `tenant_id`

### `GET /users/:id/permissions`

所需 scope: `s2s.rbac.read`

可选参数:

- `tenant_id`

返回字段:

- `permission_codes`
- `role_codes`
- `roles`

其中 `roles` 为兼容旧返回，目前与 `role_codes` 相同。

## 团队接口

### `GET /teams`

所需 scope: `s2s.team.read`

可选参数:

- `user_id`
- `q`
- `page`
- `page_size`

行为说明:

- 不传 `user_id` 时，返回当前 tenant 的团队列表
- 传入 `user_id` 时，返回该用户所在的团队

### `POST /teams`

所需 scope: `s2s.team.write`

在当前 tenant 下创建团队。

请求体:

```json
{
  "name": "Growth Team",
  "description": "Growth operations",
  "avatar_url": "https://example.com/team.png",
  "owner_user_id": 123,
  "member_user_ids": [124, 125]
}
```

规则:

- `name` 必填
- `owner_user_id` 与 `member_user_ids` 必须属于当前 tenant
- 重复用户 ID 会自动去重

### `GET /teams/:id`

所需 scope: `s2s.team.read`

返回团队详情和成员信息。

### `GET /users/:id/teams`

所需 scope: `s2s.team.read`

返回指定用户在当前 tenant 下所属的全部团队。

## 钱包接口

### `GET /users/:id/wallets`

所需 scope: `s2s.wallet.read`

查询参数:

- `currency` 必填
- `limit` 可选
- `tenant_id` 可选

### `POST /users/:id/wallets/adjust`

所需 scope: `s2s.wallet.write`

请求体:

```json
{
  "operation": "increase",
  "amount": 100,
  "currency": "CNY",
  "reference": "invoice_123"
}
```

## 通知接口

### `GET /users/:id/messages`

所需 scope: `s2s.messages.read`

查询参数:

- `status=all|unread`
- `page`
- `page_size`
- `tenant_id` 可选

### `POST /notifications`

所需 scope: `s2s.notifications.write`

该接口只会向满足以下条件的用户发通知：

- 属于当前 app
- 已授权当前 app
- 在 `app_users` 中状态为 `active`

请求体:

```json
{
  "title": "Maintenance notice",
  "content": "Service window starts at 01:00 UTC",
  "type": "warning",
  "user_ids": [123, 124],
  "sender_name": "My App"
}
```

广播示例:

```json
{
  "title": "Welcome",
  "content": "New feature is live",
  "type": "info",
  "broadcast": true
}
```

支持的 `type`:

- `info`
- `success`
- `warning`
- `error`

## 商品接口

### `GET /users/:id/products`

所需 scope: `s2s.products.read`

返回用户通过活跃订阅或已支付订单拥有的产品。

### `GET /users/:id/products/:product_id/ownership`

所需 scope: `s2s.products.read`

返回:

- `has_ownership`
- `via`

## 邮件接口

### `POST /emails/send`

所需 scope: `s2s.email.send`

该接口只会向满足以下条件的用户发邮件：

- 属于当前 app
- 已授权当前 app
- 在 `app_users` 中状态为 `active`

请求体:

```json
{
  "subject": "Your verification code",
  "text_body": "Code: 123456",
  "html_body": "<p>Code: <strong>123456</strong></p>",
  "user_ids": [123, 124],
  "reply_to": "support@example.com"
}
```

广播示例:

```json
{
  "subject": "Release note",
  "text_body": "A new version is available",
  "broadcast": true
}
```

返回字段:

- `results`
- `sent_count`
- `failed_count`
- `broadcast`

`results` 中的单项可能包含:

- `user_id`
- `email`
- `status`
- `email_log_id`
- `provider`
- `message_id`
- `sent_at`
- `error`

## 常见错误码

- `invalid_client`
- `insufficient_scope`
- `invalid_parameter`
- `not_found`
- `wallet_error`
- `email_unavailable`
- `server_error`
