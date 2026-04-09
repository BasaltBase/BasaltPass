---
sidebar_position: 2
---

# S2S API

BasaltPass S2S API 用于应用后端的服务端到服务端访问。

## 基础 URL

- 开发环境: `http://localhost:8101/api/v1/s2s`
- 生产环境: `https://your-domain.com/api/v1/s2s`

## 认证

当前 S2S 端点直接使用 `client_id` 和 `client_secret` 进行认证。

- 推荐: 通过请求头传递 `client_id` 和 `client_secret`
- 也支持: 通过表单字段传递 `client_id` 和 `client_secret`
- 仅当服务器配置明确允许时才接受查询参数

示例:

```http
GET /api/v1/s2s/me HTTP/1.1
Host: localhost:8101
client_id: your_client_id
client_secret: your_client_secret
Accept: application/json
```

## 响应封装

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

## 权限范围 (Scopes)

可用的 S2S 权限范围:

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

`s2s.read` 是一个旧版的伞状权限，当前隐含所有 `s2s.*.read` 权限。

## 元信息端点

### `GET /health`

返回 S2S 健康状态。

响应:

```json
{
  "data": {
    "status": "ok"
  }
}
```

### `GET /me`

返回当前已认证的 S2S 客户端上下文。

响应字段:

- `client_id`
- `app_id`
- `tenant_id`
- `scopes`

## 用户端点

### `GET /users/:id`

所需权限: `s2s.user.read`

返回当前租户内的用户摘要。

字段:

- `id`
- `email`
- `nickname`
- `avatar_url`
- `email_verified`
- `phone`
- `phone_verified`
- `created_at`
- `updated_at`

### `GET /users/lookup`

所需权限: `s2s.user.read`

查询参数:

- `email`
- `phone`
- `q`
- `page`
- `page_size`

`email`、`phone` 或 `q` 三者必须提供其一。

### `PATCH /users/:id`

所需权限: `s2s.user.write`

请求体:

```json
{
  "nickname": "New Nickname"
}
```

旧版别名:

```json
{
  "username": "New Nickname"
}
```

## RBAC 端点

### `GET /users/:id/roles`

所需权限: `s2s.rbac.read`

可选查询参数:

- `tenant_id`

返回角色对象，包含:

- `id`
- `code`
- `name`
- `description`

### `GET /users/:id/role-codes`

所需权限: `s2s.rbac.read`

可选查询参数:

- `tenant_id`

### `GET /users/:id/permissions`

所需权限: `s2s.rbac.read`

可选查询参数:

- `tenant_id`

返回:

- `permission_codes`
- `role_codes`
- `roles`

`roles` 保留用于向后兼容，当前与 `role_codes` 相同。

## 团队端点

### `GET /teams`

所需权限: `s2s.team.read`

可选查询参数:

- `user_id`
- `q`
- `page`
- `page_size`

行为:

- 不带 `user_id` 时，列出租户内的团队
- 带 `user_id` 时，返回指定用户所属的团队

### `POST /teams`

所需权限: `s2s.team.write`

在当前租户中创建团队。

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

- `name` 为必填
- `owner_user_id` 和 `member_user_ids` 必须属于当前租户
- 重复的用户 ID 会被忽略

### `GET /teams/:id`

所需权限: `s2s.team.read`

返回团队及其成员详情。

### `GET /users/:id/teams`

所需权限: `s2s.team.read`

返回指定用户在当前租户中所属的所有团队。

## 钱包端点

### `GET /users/:id/wallets`

所需权限: `s2s.wallet.read`

查询参数:

- `currency` 必填
- `limit` 可选
- `tenant_id` 可选

返回:

- `wallet_id`
- `currency`
- `balance`
- `transactions`

### `POST /users/:id/wallets/adjust`

所需权限: `s2s.wallet.write`

请求体:

```json
{
  "operation": "increase",
  "amount": 100,
  "currency": "CNY",
  "reference": "invoice_123"
}
```

`operation` 必须为 `increase` 或 `decrease`。

## 通知端点

### `GET /users/:id/messages`

所需权限: `s2s.messages.read`

查询参数:

- `status=all|unread`
- `page`
- `page_size`
- `tenant_id` 可选

### `POST /notifications`

所需权限: `s2s.notifications.write`

仅向以下用户发送通知:

- 属于当前应用
- 已授权当前应用
- 当前处于 `active` 应用用户状态

请求体:

```json
{
  "title": "维护通知",
  "content": "服务窗口将于 UTC 01:00 开始",
  "type": "warning",
  "user_ids": [123, 124],
  "sender_name": "My App"
}
```

广播示例:

```json
{
  "title": "欢迎",
  "content": "新功能已上线",
  "type": "info",
  "broadcast": true
}
```

支持的 `type` 值:

- `info`
- `success`
- `warning`
- `error`

响应字段:

- `sent_count`
- `target_user_ids`
- `notification_type`
- `broadcast`

## 产品端点

### `GET /users/:id/products`

所需权限: `s2s.products.read`

返回用户通过活跃订阅或已付费订单拥有的产品。

### `GET /users/:id/products/:product_id/ownership`

所需权限: `s2s.products.read`

返回:

- `has_ownership`
- `via`

## 邮件端点

### `POST /emails/send`

所需权限: `s2s.email.send`

仅向以下用户发送邮件:

- 属于当前应用
- 已授权当前应用
- 当前处于 `active` 应用用户状态

请求体:

```json
{
  "subject": "您的验证码",
  "text_body": "验证码: 123456",
  "html_body": "<p>验证码: <strong>123456</strong></p>",
  "user_ids": [123, 124],
  "reply_to": "support@example.com"
}
```

广播示例:

```json
{
  "subject": "发布说明",
  "text_body": "新版本已发布",
  "broadcast": true
}
```

响应:

- `results`
- `sent_count`
- `failed_count`
- `broadcast`

`results` 中每个条目可能包含:

- `user_id`
- `email`
- `status`
- `email_log_id`
- `provider`
- `message_id`
- `sent_at`
- `error`

## 常见错误

- `invalid_client`
- `insufficient_scope`
- `invalid_parameter`
- `not_found`
- `wallet_error`
- `email_unavailable`
- `server_error`
