---
sidebar_position: 2
---

# Client Registration

Before your app can authenticate users, it must be registered in BasaltPass.

## How to Register

1.  Log in to the **BasaltPass Admin Console** (or Tenant Console).
2.  Navigate to **OAuth Clients** -> **New Client**.
3.  Fill in the details:
    -   **Name**: Display name for user consent screens.
    -   **Description**: Internal notes.
    -   **Logo URI**: (Optional) URL to your app logo.
    -   **Policy URL**: (Optional) Privacy policy link.

## Configuration

### Redirect URIs
**Critical**: These are the allowed callback URLs where BasaltPass will send tokens/codes.
-   Must be absolute URLs (e.g., `https://myapp.com/callback`).
-   Localhost is allowed for development.
-   Wildcards are generally NOT supported for security.

### Allowed Origins (CORS)
Required for SPAs making direct requests to BasaltPass from the browser properly.
-   Example: `https://myapp.com`

### Scopes
The permissions your app is allowed to request.
-   `openid`: Required for OIDC.
-   `profile`: Grants access to name, avatar, etc.
-   `email`: Grants access to email address.
-   `offline_access`: Grants a Refresh Token.

## Credentials
Upon creation, you will receive:
-   **Client ID**: Public identifier. Safe to share.
-   **Client Secret**: Confidential key. **NEVER** expose this in frontend code.
