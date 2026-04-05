---
sidebar_position: 1
---

# API 约定

BasaltPass API 遵循 REST 风格和标准 HTTP 状态码。

## 基础地址

-   **开发环境**: `http://localhost:8101/api/v1`
-   **生产环境**: `https://your-domain.com/api/v1`

## 认证方式

大多数接口都需要认证。

-   **User / Tenant / Admin API**: `Authorization: Bearer <jwt_token>`
-   **S2S API**: 每次请求直接携带 `client_id` 与 `client_secret`，推荐放在请求头中

## 响应格式

### 成功响应

成功时通常返回 JSON 对象，常见格式为 `data` 包裹。

### 错误响应

错误时返回非 2xx 状态码以及 JSON 响应体。

```json
{
  "error": {
    "code": "resource_not_found",
    "message": "The requested user does not exist."
  },
  "request_id": "req-abc-123"
}
```

> **注意**: 请优先检查 HTTP 状态码。

## Request ID

每个请求都会分配唯一的 `request_id`。它会出现在响应头 `X-Request-Id` 中，也经常出现在错误响应体里。排查问题时请一并提供。
