---
sidebar_position: 2
---

# S2S API

BasaltPass S2S API is intended for server-to-server access by an app's backend.

## Base URL

- Development: `http://localhost:8101/api/v1/s2s`
- Production: `https://your-domain.com/api/v1/s2s`

## Authentication

Current S2S endpoints authenticate directly with `client_id` and `client_secret`.

- Preferred: request headers `client_id` and `client_secret`
- Also supported: form fields `client_id` and `client_secret`
- Query parameters are only accepted when server configuration explicitly allows them

Example:

```http
GET /api/v1/s2s/me HTTP/1.1
Host: localhost:8101
client_id: your_client_id
client_secret: your_client_secret
Accept: application/json
```

## Response Envelope

Successful responses:

```json
{
  "data": {},
  "error": null,
  "request_id": "req_123"
}
```

Error responses:

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

Available S2S scopes:

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

`s2s.read` is a legacy umbrella scope and currently implies all `s2s.*.read` scopes.

## Meta Endpoints

### `GET /health`

Returns S2S health status.

Response:

```json
{
  "data": {
    "status": "ok"
  }
}
```

### `GET /me`

Returns current authenticated S2S client context.

Response fields:

- `client_id`
- `app_id`
- `tenant_id`
- `scopes`

## User Endpoints

### `GET /users/:id`

Required scope: `s2s.user.read`

Returns a user summary within the current tenant.

Fields:

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

Required scope: `s2s.user.read`

Query parameters:

- `email`
- `phone`
- `q`
- `page`
- `page_size`

Exactly one of `email`, `phone`, or `q` must be provided.

### `PATCH /users/:id`

Required scope: `s2s.user.write`

Request body:

```json
{
  "nickname": "New Nickname"
}
```

Legacy alias:

```json
{
  "username": "New Nickname"
}
```

## RBAC Endpoints

### `GET /users/:id/roles`

Required scope: `s2s.rbac.read`

Optional query:

- `tenant_id`

Returns role objects with:

- `id`
- `code`
- `name`
- `description`

### `GET /users/:id/role-codes`

Required scope: `s2s.rbac.read`

Optional query:

- `tenant_id`

### `GET /users/:id/permissions`

Required scope: `s2s.rbac.read`

Optional query:

- `tenant_id`

Returns:

- `permission_codes`
- `role_codes`
- `roles`

`roles` is kept for backward compatibility and currently mirrors `role_codes`.

## Team Endpoints

### `GET /teams`

Required scope: `s2s.team.read`

Optional query:

- `user_id`
- `q`
- `page`
- `page_size`

Behavior:

- Without `user_id`, lists tenant teams
- With `user_id`, returns teams that the specified user belongs to

### `POST /teams`

Required scope: `s2s.team.write`

Creates a team in the current tenant.

Request body:

```json
{
  "name": "Growth Team",
  "description": "Growth operations",
  "avatar_url": "https://example.com/team.png",
  "owner_user_id": 123,
  "member_user_ids": [124, 125]
}
```

Rules:

- `name` is required
- `owner_user_id` and `member_user_ids` must belong to the current tenant
- duplicate user IDs are ignored

### `GET /teams/:id`

Required scope: `s2s.team.read`

Returns a team with member details.

### `GET /users/:id/teams`

Required scope: `s2s.team.read`

Returns all teams that the specified user belongs to in the current tenant.

## Wallet Endpoints

### `GET /users/:id/wallets`

Required scope: `s2s.wallet.read`

Query parameters:

- `currency` required
- `limit` optional
- `tenant_id` optional

Returns:

- `wallet_id`
- `currency`
- `balance`
- `transactions`

### `POST /users/:id/wallets/adjust`

Required scope: `s2s.wallet.write`

Request body:

```json
{
  "operation": "increase",
  "amount": 100,
  "currency": "CNY",
  "reference": "invoice_123"
}
```

`operation` must be `increase` or `decrease`.

## Notification Endpoints

### `GET /users/:id/messages`

Required scope: `s2s.messages.read`

Query parameters:

- `status=all|unread`
- `page`
- `page_size`
- `tenant_id` optional

### `POST /notifications`

Required scope: `s2s.notifications.write`

Sends notifications only to users who:

- belong to the current app
- are authorized for the current app
- are currently in `active` app-user status

Request body:

```json
{
  "title": "Maintenance notice",
  "content": "Service window starts at 01:00 UTC",
  "type": "warning",
  "user_ids": [123, 124],
  "sender_name": "My App"
}
```

Broadcast example:

```json
{
  "title": "Welcome",
  "content": "New feature is live",
  "type": "info",
  "broadcast": true
}
```

Supported `type` values:

- `info`
- `success`
- `warning`
- `error`

Response fields:

- `sent_count`
- `target_user_ids`
- `notification_type`
- `broadcast`

## Product Endpoints

### `GET /users/:id/products`

Required scope: `s2s.products.read`

Returns products the user owns through active subscriptions or paid orders.

### `GET /users/:id/products/:product_id/ownership`

Required scope: `s2s.products.read`

Returns:

- `has_ownership`
- `via`

## Email Endpoints

### `POST /emails/send`

Required scope: `s2s.email.send`

Sends email only to users who:

- belong to the current app
- are authorized for the current app
- are currently in `active` app-user status

Request body:

```json
{
  "subject": "Your verification code",
  "text_body": "Code: 123456",
  "html_body": "<p>Code: <strong>123456</strong></p>",
  "user_ids": [123, 124],
  "reply_to": "support@example.com"
}
```

Broadcast example:

```json
{
  "subject": "Release note",
  "text_body": "A new version is available",
  "broadcast": true
}
```

Response:

- `results`
- `sent_count`
- `failed_count`
- `broadcast`

Each item in `results` may contain:

- `user_id`
- `email`
- `status`
- `email_log_id`
- `provider`
- `message_id`
- `sent_at`
- `error`

## Common Errors

- `invalid_client`
- `insufficient_scope`
- `invalid_parameter`
- `not_found`
- `wallet_error`
- `email_unavailable`
- `server_error`
