---
sidebar_position: 3
---

# Error Codes

BasaltPass uses standard error codes to help developers debug integration issues.

| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `invalid_request` | 400 | Missing required parameter. |
| `invalid_client` | 401 | Client authentication failed. |
| `invalid_grant` | 400 | Authorization code or refresh token is invalid/expired. |
| `unauthorized_client` | 400 | Client is not authorized to use this grant type. |
| `unsupported_grant_type` | 400 | Grant type requested is not supported. |
| `invalid_scope` | 400 | Requested scope is invalid or exceeds permissions. |
| `access_denied` | 403 | User or server denied the request. |
| `server_error` | 500 | Unexpected internal server error. |

## Custom Errors

Some endpoints may return application-specific error codes in the `code` field of the error object (e.g., `user_not_found`, `password_too_weak`).
