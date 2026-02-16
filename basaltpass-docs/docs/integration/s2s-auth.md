---
sidebar_position: 5
---

# Server-to-Server (S2S) Auth

S2S authentication is used when your backend service needs to access BasaltPass APIs directly, rather than on behalf of a user. This uses the **Client Credentials Flow**.

## Obtaining a Token

**Request**:
```http
POST /api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={YOUR_CLIENT_ID}
&client_secret={YOUR_CLIENT_SECRET}
&scope=s2s.user.read s2s.rbac.read
```

**Response**:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Available Scopes

It is best practice to request only the scopes you need (Principle of Least Privilege).

| Scope | Description |
| :--- | :--- |
| `s2s.user.read` | Read user profiles, lookups. |
| `s2s.user.write` | Update user details (careful!). |
| `s2s.rbac.read` | Read roles and permissions. |
| `s2s.wallet.read` | Access user wallet information. |
| `s2s.messages.read`| Access user internal messages. |

## S2S API Envelope

All S2S APIs return a standard envelope structure:

**Success**:
```json
{
  "data": { ... },
  "error": null,
  "request_id": "req-123"
}
```

**Error**:
```json
{
  "data": null,
  "error": {
    "code": "invalid_parameter",
    "message": "User not found"
  },
  "request_id": "req-123"
}
```
