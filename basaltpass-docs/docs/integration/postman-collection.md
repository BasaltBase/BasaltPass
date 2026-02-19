---
sidebar_position: 9
---

# Testing with Postman

Postman is a popular tool for testing APIs. You can use it to simulate BasaltPass OAuth flows.

## Authorization Code Flow

1.  **Create a New Request**: Method `GET`.
2.  **Auth Tab**: Select Type **OAuth 2.0**.
3.  **Configure New Token**:
    -   **Grant Type**: Authorization Code
    -   **Callback URL**: Must match your client setting (e.g., `https://oauth.pstmn.io/v1/callback`).
    -   **Auth URL**: `http://localhost:8101/api/v1/oauth/authorize`
    -   **Access Token URL**: `http://localhost:8101/api/v1/oauth/token`
    -   **Client ID**: Your client ID.
    -   **Client Secret**: Your client secret.
    -   **Scope**: `openid profile`
    -   **Client Authentication**: Send as Basic Auth header.
4.  **Click Get New Access Token**: A popup window will appear for you to log in to BasaltPass.

## Client Credentials Flow

1.  **Auth Tab**: Select Type **OAuth 2.0**.
2.  **Configure New Token**:
    -   **Grant Type**: Client Credentials
    -   **Access Token URL**: `http://localhost:8101/api/v1/oauth/token`
    -   **Client ID/Secret**: Enter credentials.
    -   **Scope**: `s2s.user.read`
3.  **Click Get New Access Token**: Returns a token immediately.
