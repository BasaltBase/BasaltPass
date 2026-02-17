---
sidebar_position: 10
---

# 移动应用集成 (Mobile App Integration)

集成移动应用 (iOS, Android) 需要特别注意安全性和用户体验 (UX)。

## 最佳实践

### 1. 使用 PKCE
**强制性**。移动应用是公共客户端，无法安全存储 client secret。始终使用带 PKCE 的授权码流程。

### 2. 自定义 URL Schemes / Universal Links
使用深度链接 (Deep Links) 在登录后处理重定向回您的应用。
-   **iOS**: Universal Links (`https://myapp.com/callback`) 或 Custom Scheme (`myapp://callback`).
-   **Android**: App Links (`https://myapp.com/callback`) 或 Custom Scheme.

**重要**: 在 BasaltPass 控制台中注册这些确切的 callback URL。

### 3. 使用系统浏览器 (ASWebAuthenticationSession)
**不要** 使用嵌入式 WebView 进行登录。
-   **安全性**: 嵌入式 WebView 容易受到键盘记录攻击。
-   **UX**: 用户信任系统浏览器。共享 Cookie (SSO) 效果更好。
-   **iOS**: 使用 `ASWebAuthenticationSession`。
-   **Android**: 使用 `Custom Tabs`。

### 4. 安全存储
将访问令牌和刷新令牌存储在系统的安全存储中。
-   **iOS**: Keychain.
-   **Android**: EncryptedSharedPreferences.
