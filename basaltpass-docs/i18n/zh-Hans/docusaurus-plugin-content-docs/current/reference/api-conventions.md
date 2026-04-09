---
sidebar_position: 1
---

# API 约定

BasaltPass API 遵循 RESTful 原则和标准 HTTP 状态码。

## 基础 URL

-   **开发环境**: `http://localhost:8101/api/v1`
-   **生产环境**: `https://your-domain.com/api/v1`

## 认证

大多数端点需要通过 `Authorization` 头部进行认证。

-   **用户/租户/管理 API**: `Bearer <jwt_token>`
-   **S2S API**: 在每个请求上直接使用 `client_id` / `client_secret` 凭据。推荐通过请求头传输。

## 响应格式

### 标准响应
成功的请求通常返回一个 JSON 对象，通常包装在 `data` 中。

### 错误响应
错误返回非 2xx 状态码和 JSON 正文。

```json
{
  "error": {
    "code": "resource_not_found",
    "message": "The requested user does not exist."
  },
  "request_id": "req-abc-123"
}
```

> **注意**: 请始终首先检查 HTTP 状态码。

## 请求 ID
每个请求都会分配一个唯一的 `request_id`。此 ID 在响应头 (`X-Request-Id`) 和错误正文中返回。报告问题时请提供此 ID。
