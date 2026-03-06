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
-   **Security requirement**: `state` is mandatory and must be an unguessable per-request value. BasaltPass validates `state` on callback and rejects mismatches with `400 invalid state`.
-   **Integration impact**: If your client already sends a unique `state` and returns it unchanged in the callback, no changes are required.

### Token Endpoint
-   **Path**: `/oauth/token`
-   **Method**: `POST`
-   **Usage**: Exchange `authorization_code` for tokens.
-   **Auth**: Basic Auth (client_id:client_secret) or params in body.

### One-Tap / Silent Auth (Hardened)
-   **Paths**:
  -   `POST /oauth/one-tap/login`
  -   `GET /oauth/silent-auth?prompt=none`
-   **Important change**: These endpoints now issue an OAuth2 `authorization_code` only. They do **not** return `id_token` directly.
-   **Security checks**:
  -   Client must be registered and active.
  -   `redirect_uri` must exactly match registered URIs.
  -   User must belong to the client tenant.
  -   User must have prior consent/authorization for the app (otherwise `interaction_required`).
-   **Integration flow**:
  -   Receive `code` (+ optional `state`) from One-Tap/Silent-Auth.
  -   Exchange `code` at `/oauth/token` using standard OAuth2 flow.
  -   Use returned `access_token` for `/oauth/userinfo`.

### Social OAuth Callback Delivery
-   **Important change**: Social login callback no longer appends `?token=...` to the success URL.
-   **Current behavior**:
  -   Backend sets `HttpOnly` cookies (`access_token`, `refresh_token`) with `SameSite=Lax`.
  -   Frontend success page should call `POST /api/v1/auth/refresh` to obtain `access_token` for SPA storage/runtime use.

### UserInfo Endpoint
-   **Path**: `/oauth/userinfo`
-   **Method**: `GET`
-   **Usage**: Get profile information for the authenticated user.
-   **Header**: `Authorization: Bearer <access_token>`

### JWKS Endpoint
-   **Path**: `/oauth/jwks`
-   **Method**: `GET`
-   **Usage**: Get public keys to verify JWT signatures locally.
