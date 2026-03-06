---
sidebar_position: 3
---

# OAuth 2.0 & OIDC 端点

BasaltPass 实现了标准的 OAuth 2.0 和 OpenID Connect 1.0 协议。

## 发现服务 (Discovery)
配置客户端库最简单的方法是使用发现文档：
-   **URL**: `/.well-known/openid-configuration`
-   **Method**: `GET`
-   **Response**: 包含发行者(issuer)、端点和支持功能的 JSON 数据。

## 关键端点

### 授权端点 (Authorization Endpoint)
-   **Path**: `/oauth/authorize`
-   **Method**: `GET`
-   **Usage**: 将用户浏览器重定向到此处以开始登录。
-   **Params**: `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, `code_challenge` (PKCE).
-   **安全要求**: `state` 为必需参数，且必须是每次请求唯一、不可预测的随机值。BasaltPass 在回调时会严格校验 `state`，不匹配将返回 `400 invalid state`。
-   **对接影响**: 如果你的接入方已经按标准传递随机 `state` 并在回调中原样返回，一般无需额外改动。

### 令牌端点 (Token Endpoint)
-   **Path**: `/oauth/token`
-   **Method**: `POST`
-   **Usage**: 用 `authorization_code` 交换令牌 (tokens)。
-   **Auth**: Basic Auth (client_id:client_secret) 或在 body 中传递参数。

### One-Tap / Silent-Auth（安全加固后）
-   **路径**：
  -   `POST /oauth/one-tap/login`
  -   `GET /oauth/silent-auth?prompt=none`
-   **重要变更**：以上端点现在只返回 OAuth2 `authorization_code`，不再直接返回 `id_token`。
-   **安全校验**：
  -   client 必须已注册且处于激活状态。
  -   `redirect_uri` 必须与已注册地址精确匹配。
  -   当前用户必须属于该 client 对应的租户。
  -   用户必须已经对该应用完成过授权同意（否则返回 `interaction_required`）。
-   **对接流程**：
  -   从 One-Tap / Silent-Auth 获取 `code`（及可选 `state`）。
  -   使用标准 OAuth2 流程调用 `/oauth/token` 交换令牌。
  -   使用返回的 `access_token` 调用 `/oauth/userinfo`。

### 社交 OAuth 回调交付方式
-   **重要变更**：社交登录成功回调不再在 URL 上拼接 `?token=...`。
-   **当前行为**：
  -   后端通过 `HttpOnly` Cookie（`access_token`、`refresh_token`，`SameSite=Lax`）下发会话。
  -   前端成功页应调用 `POST /api/v1/auth/refresh` 获取 `access_token` 供 SPA 使用。

### 用户信息端点 (UserInfo Endpoint)
-   **Path**: `/oauth/userinfo`
-   **Method**: `GET`
-   **Usage**: 获取已认证用户的个人信息。
-   **Header**: `Authorization: Bearer <access_token>`

### JWKS 端点 (JWKS Endpoint)
-   **Path**: `/oauth/jwks`
-   **Method**: `GET`
-   **Usage**: 获取公钥以在本地验证 JWT 签名。
