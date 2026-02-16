---
sidebar_position: 8
---

# CORS Configuration

Cross-Origin Resource Sharing (CORS) is a security feature that restricts web pages from making requests to a different domain than the one that served the web page.

## Why is it needed?
If your frontend is hosted at `https://myapp.com` and BasaltPass is at `https://auth.example.com`, the browser will block requests unless BasaltPass explicitly allows `https://myapp.com`.

## Configuring Allowed Origins

1.  **Global Policy**: Set `BASALTPASS_SERVER_CORS_ALLOWED_ORIGINS` env var.
    -   This applies to generic API endpoints.
2.  **Client Policy**: Set **Allowed Origins** in the OAuth Client settings.
    -   This is critical for the Token Endpoint when called from a browser (PKCE flow).

## Troubleshooting

-   Check the browser console/Network tab.
-   Look for the `Access-Control-Allow-Origin` header in the response.
-   Ensure you include the protocol (e.g., `https://`) and port if non-standard.
