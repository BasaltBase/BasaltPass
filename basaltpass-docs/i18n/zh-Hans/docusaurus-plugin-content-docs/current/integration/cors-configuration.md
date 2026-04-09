---
sidebar_position: 8
---

# CORS 配置

跨域资源共享 (CORS) 是一种安全机制，限制网页向与提供该网页的域不同的域发起请求。

## 为什么需要 CORS？
如果您的前端托管在 `https://myapp.com`，而 BasaltPass 在 `https://auth.example.com`，浏览器将阻止请求，除非 BasaltPass 明确允许 `https://myapp.com`。

## 配置允许的来源

1.  **全局策略**: 设置 `BASALTPASS_SERVER_CORS_ALLOWED_ORIGINS` 环境变量。
    -   这适用于通用 API 端点。
2.  **客户端策略**: 在 OAuth 客户端设置中设置 **允许的来源 (Allowed Origins)**。
    -   当从浏览器调用令牌端点 (PKCE 流程) 时，这一点至关重要。

## 故障排除

-   检查浏览器控制台/网络标签页。
-   在响应中查找 `Access-Control-Allow-Origin` 头部。
-   确保包含协议 (例如 `https://`) 和非标准端口。
