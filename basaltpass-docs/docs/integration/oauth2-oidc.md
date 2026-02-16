---
sidebar_position: 3
---

# OAuth 2.0 & OIDC Endpoints

BasaltPass implements the standard OAuth 2.0 and OpenID Connect 1.0 protocols.

## Discovery
The easiest way to configure your client library is using the Discovery Document:
-   **URL**: `/.well-known/openid-configuration`
-   **Method**: `GET`
-   **Response**: JSON containing issuer, endpoints, and supported capabilities.

## Key Endpoints

### Authorization Endpoint
-   **Path**: `/oauth/authorize`
-   **Method**: `GET`
-   **Usage**: Redirect the user's browser here to start login.
-   **Params**: `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, `code_challenge` (PKCE).

### Token Endpoint
-   **Path**: `/oauth/token`
-   **Method**: `POST`
-   **Usage**: Exchange `authorization_code` for tokens.
-   **Auth**: Basic Auth (client_id:client_secret) or params in body.

### UserInfo Endpoint
-   **Path**: `/oauth/userinfo`
-   **Method**: `GET`
-   **Usage**: Get profile information for the authenticated user.
-   **Header**: `Authorization: Bearer <access_token>`

### JWKS Endpoint
-   **Path**: `/oauth/jwks`
-   **Method**: `GET`
-   **Usage**: Get public keys to verify JWT signatures locally.
