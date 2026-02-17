---
sidebar_position: 6
---

# 令牌验证 (Token Validation)

当您的应用程序收到 Bearer Token (来自前端客户端或 S2S 调用) 时，必须在使用之前验证其有效性。

## 本地验证 (推荐)

BasaltPass 颁发的 JSON Web Tokens (JWT) 使用 RS256 签名。您可以在本地验证这些令牌，而无需为每次 API 调用发起网络请求。

### 1. 获取公钥 (JWKS)
从以下地址获取 JSON Web Key Set:
`GET /api/v1/oauth/jwks`

缓存此结果。密钥很少更改，但如果验证失败或定期 (例如每 24 小时)，您应该刷新缓存。

### 2. 验证签名
使用 JWT 库 (如 Node 中的 `jsonwebtoken` 或 Python 中的 `PyJWT`) 使用公钥验证令牌签名。

### 3. 验证声明 (Claims)
-   **`iss` (Issuer)**: 必须匹配您的 BasaltPass 实例 URL。
-   **`aud` (Audience)**: 必须包含您的 `client_id` (或预期的资源 audience)。
-   **`exp` (Expiration)**: 当前时间必须早于 `exp`。
-   **`sub` (Subject)**: 用户 ID。

## 令牌内省 (集中式)

如果您需要立即检查撤销状态或不想处理加密操作，请使用内省端点 (Introspection Endpoint)。

**请求**:
```http
POST /api/v1/oauth/introspect
Content-Type: application/x-www-form-urlencoded

token={ACCESS_TOKEN}
```

**响应**:
```json
{
  "active": true,
  "sub": "user-123",
  "scope": "openid profile"
}
```
如果 `active` 为 false，则令牌无效或已过期。
