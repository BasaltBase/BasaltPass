# OAuth2 / OIDC（对接方文档）

BasaltPass 提供 OAuth2 授权服务器与 OIDC 常用端点，适用于：
- Web 应用（Authorization Code）
- SPA / 移动端（Authorization Code + PKCE）

## Discovery

- `GET /api/v1/.well-known/openid-configuration`

## 核心端点

- `GET /api/v1/oauth/authorize`
- `POST /api/v1/oauth/token`
- `GET /api/v1/oauth/userinfo`
- `GET /api/v1/oauth/jwks`

辅助端点：
- `POST /api/v1/oauth/introspect`
- `POST /api/v1/oauth/revoke`

## 授权码 + PKCE（建议）

典型流程：
1. 客户端生成 `code_verifier` 与 `code_challenge`（S256）
2. 访问 authorize 获取 code
3. 使用 code + code_verifier 换 token
4. 用 access token 调用 userinfo

## 客户端管理

- 平台管理员：`/api/v1/admin/oauth/clients/*`
- 租户管理员：`/api/v1/tenant/oauth/clients/*`

具体字段（redirect_uri/scopes 等）以管理端 API 返回为准。
