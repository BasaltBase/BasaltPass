---
sidebar_position: 10
---

# Mobile App Integration

Integrating mobile apps (iOS, Android) requires special attention to security and UX.

## Best Practices

### 1. Use PKCE
**Mandatory**. Mobile apps are public clients and cannot store a client secret safely. Always use the Authorization Code Flow with PKCE.

### 2. Custom URL Schemes / Universal Links
Use Deep Links to handle the redirect back to your app after login.
-   **iOS**: Universal Links (`https://myapp.com/callback`) or Custom Scheme (`myapp://callback`).
-   **Android**: App Links (`https://myapp.com/callback`) or Custom Scheme.

**Important**: Register these exact callback URLs in the BasaltPass Console.

### 3. Use System Browser (ASWebAuthenticationSession)
Do **NOT** use embedded WebViews for login.
-   **Security**: Embedded WebViews are vulnerable to keylogging.
-   **UX**: Users trust the system browser. Shared cookies (SSO) work better.
-   **iOS**: Use `ASWebAuthenticationSession`.
-   **Android**: Use `Custom Tabs`.

### 4. Secure Storage
Store Access and Refresh Tokens in the system's secure storage.
-   **iOS**: Keychain.
-   **Android**: EncryptedSharedPreferences.
