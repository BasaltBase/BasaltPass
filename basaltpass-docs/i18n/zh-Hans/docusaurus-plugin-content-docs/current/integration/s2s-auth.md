---
sidebar_position: 5
---

# 服务端对服务端 (S2S) 认证

当您的后端服务需要直接访问 BasaltPass API (而不是代表用户) 时，使用 S2S 认证。这使用的是 **客户端凭证模式 (Client Credentials Flow)**。

## 获取令牌

**请求**:
```http
POST /api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={YOUR_CLIENT_ID}
&client_secret={YOUR_CLIENT_SECRET}
&scope=s2s.user.read s2s.rbac.read
```

**响应**:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## 可用范围 (Scopes)

最佳实践是只申请您需要的权限 (最小权限原则)。

| Scope | 描述 |
| :--- | :--- |
| `s2s.user.read` | 读取用户资料，查找用户。 |
| `s2s.user.write` | 更新用户详情 (小心使用!)。 |
| `s2s.rbac.read` | 读取角色和权限。 |
| `s2s.wallet.read` | 访问用户钱包信息。 |
| `s2s.messages.read`| 访问用户站内信。 |

## S2S API 统一封装 (Envelope)

所有 S2S API 返回标准的封装结构：

**成功**:
```json
{
  "data": { ... },
  "error": null,
  "request_id": "req-123"
}
```

**错误**:
```json
{
  "data": null,
  "error": {
    "code": "invalid_parameter",
    "message": "User not found"
  },
  "request_id": "req-123"
}
```
