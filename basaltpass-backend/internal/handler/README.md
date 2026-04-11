# Handler

This package contains the HTTP handlers for the BasaltPass backend. Handlers are responsible for processing incoming HTTP requests, interacting with the necessary services, and returning appropriate HTTP responses.

## Directory Structure

The handlers are organized by their roles, with the following directory structure:

admin/          - Handlers for administrator-related functionalities
tenant/         - Handlers for tenant management
user/           - Handlers for user-related operations
public/         - Handlers for public access, including authentication and authorization

## DTO Ownership

Request/response DTOs are being unified under `internal/dto` by domain.

- Canonical DTO definitions: `internal/dto/*`
- Temporary compatibility bridge: `internal/handler/**/dto.go` may contain type aliases during migration

See `internal/dto/README.md` for migration rules and execution order.
