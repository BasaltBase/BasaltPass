---
sidebar_position: 2
---

# Backend Architecture

BasaltPass is built with Go and follows a modular architecture.

## Tech Stack
-   **Language**: Go
-   **Web Framework**: Fiber v2
-   **Database**: GORM (SQLite/PostgreSQL/MySQL)

## Key Components

### 1. Router
Entry point at `internal/api/v1/router.go`. Routes are split by domain:
-   `auth`: Public authentication (login, register).
-   `oauth`: OAuth2/OIDC protocol endpoints.
-   `user`: End-user protected profile APIs.
-   `tenant`: Tenant administration APIs.
-   `admin`: Platform administration APIs.

### 2. Middleware
-   **JWTMiddleware**: Validates Access Tokens.
-   **TenantMiddleware**: Enforces tenant isolation.
-   **RateLimiter**: Protects against abuse.

### 3. Services
Business logic is encapsulated in services (e.g., `AuthService`, `UserService`).

## Database Migration
BasaltPass uses auto-migration on startup.
-   **Dev**: SQLite (`basaltpass.db`)
-   **Prod**: Configure PostgreSQL/MySQL via `config.yaml`.
