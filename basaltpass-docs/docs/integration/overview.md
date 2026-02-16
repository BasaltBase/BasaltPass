---
sidebar_position: 1
---

# Integration Overview

Integrating your application with BasaltPass involves delegated authentication and authorization.

## Steps

1.  **Register your app**: Obtain a `client_id` and `client_secret` (for confidential clients).
2.  **Choose a Flow**:
    -   **Authorization Code**: Standard for server-side web apps.
    -   **PKCE**: Standard for SPAs (Single Page Apps) and Mobile apps.
    -   **Client Credentials**: Standard for Machine-to-Machine communication.
3.  **Implement Login**: Redirect users to BasaltPass for authentication.
4.  **Handle Tokens**: Validate and store tokens securely.
5.  **Access Resources**: Use tokens to access protected APIs (yours or others).

## Why Delegated Auth?

-   **Security**: Don't handle passwords directly.
-   **SSO**: Single Sign-On across multiple apps.
-   **Centralized Policies**: Enforce MFA, password policies centrally.
