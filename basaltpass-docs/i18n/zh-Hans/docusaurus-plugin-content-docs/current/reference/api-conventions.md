---
sidebar_position: 1
---

# API Conventions

BasaltPass APIs follow RESTful principles and standard HTTP status codes.

## Base URL

-   **Development**: `http://localhost:8080/api/v1`
-   **Production**: `https://your-domain.com/api/v1`

## Authentication

Most endpoints require authentication via the `Authorization` header.

-   **User/Tenant/Admin APIs**: `Bearer <jwt_token>`
-   **S2S APIs**: `Bearer <client_credentials_token>` (or Basic Auth for token endpoint).

## Response Format

### Standard Response
Successful requests typically return a JSON object, often wrapped in `data`.

### Error Response
Errors return a non-2xx status code and a JSON body.

```json
{
  "error": {
    "code": "resource_not_found",
    "message": "The requested user does not exist."
  },
  "request_id": "req-abc-123"
}
```

> **Note**: Always check the HTTP Status Code first.

## Request ID
Every request is assigned a unique `request_id`. This ID is returned in headers (`X-Request-Id`) and often in the error body. Please quote this ID when reporting issues.
