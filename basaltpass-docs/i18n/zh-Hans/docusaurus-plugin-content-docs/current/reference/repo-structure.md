---
sidebar_position: 1
---

# Repository Structure

BasaltPass is a monorepo containing both backend and frontend code.

## Directory Layout

-   `basaltpass-backend/`: Go (Fiber + GORM) application.
-   `basaltpass-frontend/`: React (Vite) application.
-   `basaltpass-docs/`: This documentation site.
-   `scripts/`: Utility scripts for development and deployment.

## Backend Structure

-   `cmd/basaltpass/`: Entry point.
-   `internal/api/v1/`: Route definitions.
-   `internal/handler/`: HTTP Request handlers.
-   `internal/middleware/`: Auth, Tenant Context, Rate Limiting.
-   `internal/model/`: Database schemas.
-   `internal/service/`: Business logic (Auth, User, Tenant, etc.).

## Frontend Structure

-   `apps/`: Application entry points (admin, tenant, user).
-   `src/`: Shared components, hooks, and utilities.

## Console Scopes

The system distinguishes access via the `scp` (scope) claim in the JWT:

-   `user`: Access to User Console APIs.
-   `tenant`: Access to Tenant Console APIs.
-   `admin`: Access to Platform Admin APIs.
