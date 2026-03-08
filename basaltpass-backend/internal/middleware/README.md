# Middleware Architecture

This folder now follows a layered structure while keeping backward compatibility for existing imports.

## Layers

- `core/`
  - Global HTTP middleware registration and global Fiber error handler.
- `transport/`
  - Response envelopes (`APIErrorResponse`, `S2SErrorResponse`) and request-id extraction.
- `authn/`
  - Authentication concerns (JWT extraction, parsing, and context injection).
- `authz/`
  - Authorization concerns (console scope, tenant role checks, super-admin checks).
- `s2s/`
  - Service-to-service chain (client auth, scope, audit, rate limit).
- `ops/`
  - Operational middlewares (maintenance mode).

## Root package role (`internal/middleware`)

Files in the root `middleware` package are facade wrappers.

- Keep function signatures stable for external callers.
- Delegate implementation to the layered subpackages.
- Do not add new business logic directly in root wrappers.

## Route usage

Route profiles in `internal/api/v1/routes/middleware_profiles.go` should prefer subpackages directly (`authn`, `authz`, `s2s`) to reduce accidental dependency on wrapper internals.

## Testing strategy

- Behavior tests remain in `internal/middleware/*_test.go` and target facade APIs.
- Subpackage refactors should keep facade behavior unchanged.
