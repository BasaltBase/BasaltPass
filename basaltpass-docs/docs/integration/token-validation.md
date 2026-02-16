---
sidebar_position: 6
---

# Token Validation

When your application receives a Bearer Token (either from a frontend client or an S2S call), you must validate it before trusting the identity.

## Local Validation (Recommended)

BasaltPass issues JSON Web Tokens (JWT) signed with RS256. You can validate these locally without making a network request for every API call.

### 1. Fetch Public Keys (JWKS)
Retrieve the JSON Web Key Set from:
`GET /api/v1/oauth/jwks`

Cache this result. Keys rarely change, but you should refresh the cache if verification fails or periodically (e.g., every 24 hours).

### 2. Verify Signature
Use a JWT library (like `jsonwebtoken` in Node or `PyJWT` in Python) to verify the token signature using the Public Key.

### 3. Verify Claims
-   **`iss` (Issuer)**: Must match your BasaltPass instance URL.
-   **`aud` (Audience)**: Must contain your `client_id` (or the intended resource audience).
-   **`exp` (Expiration)**: The current time must be before `exp`.
-   **`sub` (Subject)**: The User ID.

## Introspection (Centralized)

If you require immediate revocation checks or don't want to handle cryptography, use the Introspection Endpoint.

**Request**:
```http
POST /api/v1/oauth/introspect
Content-Type: application/x-www-form-urlencoded

token={ACCESS_TOKEN}
```

**Response**:
```json
{
  "active": true,
  "sub": "user-123",
  "scope": "openid profile"
}
```
If `active` is false, the token is invalid or expired.
