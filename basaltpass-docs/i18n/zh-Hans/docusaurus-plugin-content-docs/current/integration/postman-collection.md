---
sidebar_position: 9
---

# 使用 Postman 测试 (Testing with Postman)

Postman 是一个流行的 API 测试工具。您可以使用它来模拟 BasaltPass OAuth 流程。

## 授权码模式 (Authorization Code Flow)

1.  **新建请求**: 方法 `GET`。
2.  **Auth 标签**: 选择类型 **OAuth 2.0**。
3.  **配置新令牌**:
    -   **授权类型**: Authorization Code
    -   **回调 URL**: 必须与您的客户端设置匹配 (例如 `https://oauth.pstmn.io/v1/callback`).
    -   **授权 URL**: `http://localhost:8101/api/v1/oauth/authorize`
    -   **访问令牌 URL**: `http://localhost:8101/api/v1/oauth/token`
    -   **客户端 ID**: 您的 Client ID。
    -   **客户端密钥**: 您的 Client Secret。
    -   **范围 (Scope)**: `openid profile`
    -   **客户端认证**: Send as Basic Auth header.
4.  **点击 Get New Access Token**: 将弹出一个窗口供您登录 BasaltPass。

## 客户端凭证模式 (Client Credentials Flow)

1.  **Auth 标签**: 选择类型 **OAuth 2.0**。
2.  **配置新令牌**:
    -   **授权类型**: Client Credentials
    -   **访问令牌 URL**: `http://localhost:8101/api/v1/oauth/token`
    -   **客户端 ID/密钥**: 输入凭据。
    -   **范围 (Scope)**: `s2s.user.read`
3.  **点击 Get New Access Token**: 立即返回令牌。
