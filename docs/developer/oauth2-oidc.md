# OAuth2 / OIDC 开发与调试

BasaltPass 内置 OAuth2 授权服务器（Authorization Code）并提供 OIDC 相关端点（discovery、userinfo、jwks 等）。

## 路由概览

OIDC discovery：
- `GET /api/v1/.well-known/openid-configuration`

OAuth Server：
- `GET /api/v1/oauth/authorize`
- `POST /api/v1/oauth/consent`（需要登录 JWT）
- `POST /api/v1/oauth/token`
- `GET /api/v1/oauth/userinfo`
- `POST /api/v1/oauth/introspect`
- `POST /api/v1/oauth/revoke`
- `GET /api/v1/oauth/jwks`

第三方登录（Provider）：
- `GET /api/v1/auth/oauth/:provider/login`
- `GET /api/v1/auth/oauth/:provider/callback`

> 具体是否启用、允许的 scope/回调域等，受 `settings.yaml` 中的 OAuth 相关设置影响。

## PKCE

建议对 SPA / 移动端使用 PKCE：
- `code_challenge`
- `code_challenge_method=S256`

## 常见问题

1. 回调域被拒绝：检查系统设置 `oauth.allowed_redirect_hosts`。
2. scope 被拒绝：检查 `oauth.allowed_scopes`。
3. 同意页访问失败：`/oauth/consent` 需要用户已登录并携带 JWT。
