---
sidebar_position: 3
---

# Security Configuration

Securing your BasaltPass instance is critical for protecting user data.

## JWT Secret

The most important setting is the `JWT_SECRET`.
-   **Usage**: Signs all Access Tokens and ID Tokens.
-   **Risk**: If leaked, attackers can forge tokens and impersonate any user.
-   **Configuration**:
    ```bash
    export BASALTPASS_JWT_SECRET="your-very-long-random-string"
    ```
    > **Note**: In production, ensure this is a long, high-entropy string.

## CORS (Cross-Origin Resource Sharing)

If you are hosting BasaltPass on a different domain than your frontend apps, you must configure CORS.

-   **Config**: `server.cors_allowed_origins`
-   **Env**: `BASALTPASS_SERVER_CORS_ALLOWED_ORIGINS`
-   **Value**: A comma-separated list of allowed origins (e.g., `https://myapp.com,https://admin.myapp.com`).

## HTTPS / SSL

BasaltPass (the Go binary) is designed to run behind a Reverse Proxy (Nginx, Caddy, AWS ALB) which handles SSL termination.
-   **Recommendation**: Always use HTTPS in production.
-   **Cookies**: BasaltPass sets `Secure` and `HttpOnly` flags on cookies automatically when detecting HTTPS.
