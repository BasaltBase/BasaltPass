---
sidebar_position: 2
---

# 客户端注册 (Client Registration)

在任何应用程序可以与 BasaltPass 集成之前，它必须注册为 OAuth 2.0 客户端。

## 注册流程

1.  以 **租户管理员** 身份登录。
2.  导航到 **开发者 (Developer)** -> **OAuth 客户端 (OAuth Clients)**。
3.  点击 **创建客户端 (Create Client)**。

## 客户端类型

### 公共客户端 (Public Clients)
-   **用途**: 单页应用 (SPA)、移动应用、原生桌面应用。
-   **安全**: 无法安全存储 Client Secret。
-   **要求**: 必须使用 **PKCE** (Proof Key for Code Exchange)。
-   **配置**: 勾选 "Public Client" 或不生成 Client Secret。

### 机密客户端 (Confidential Clients)
-   **用途**: 传统 Web 应用 (服务端渲染)、后端服务 (S2S)。
-   **安全**: 可以安全存储 Client Secret。
-   **配置**: 系统会生成并显示 `client_secret`。**请务必保存，它只会显示一次！**

## 关键设置

### 重定向 URIs (Redirect URIs)
**允许** BasaltPass 将用户重定向回的 URL 白名单。
-   必须完全匹配 (包括 http/https, 端口, 尾随斜杠)。
-   例如: `http://localhost:3000/callback`, `https://myapp.com/api/auth/callback`

### 允许的来源 (Allowed Origins)
配置 CORS (跨域资源共享) 策略。
-   对于 SPA (在浏览器中运行)，必须添加前端的 Origin。
-   例如: `http://localhost:3000`, `https://myapp.com`

### 授权范围 (Scopes)
定义客户端可以请求的权限。
-   `openid`: 必须。启用 OIDC。
-   `profile`: 访问用户基本信息。
-   `email`: 访问用户邮箱。
-   `offline_access`: 请求 Refresh Token。
