# DTO Unification Guide

This directory is the single source of truth for shared transport models (request/response DTOs).

## Target Structure

```text
internal/dto/
  tenant/
  team/
  invitation/
  user/
  email/
  subscription/
  profile/
```

One domain per folder, one or multiple files as needed.

## Naming Rules

- Package name follows domain: `tenant`, `team`, `user`, `email`.
- DTO names use role + action + type when needed:
  - `AdminUserListRequest`
  - `AdminUserListResponse`
  - `PaginationResponse`
- Keep JSON/query tags in DTO package; handlers/services should only consume types.

## Migration Pattern (Safe, Incremental)

1. Copy DTO definitions from `internal/handler/<scope>/<domain>/dto.go` to `internal/dto/<domain>/`.
2. Replace old handler DTO file with type aliases to the new package.
3. Keep handler/service code unchanged in first pass.
4. Verify build/tests.
5. In second pass, update imports in handlers/services to use `internal/dto/<domain>` directly.
6. Remove alias bridge file when references are fully migrated.

## Why alias bridge

- Avoids big-bang refactor.
- Reduces merge conflicts.
- Keeps API behavior identical while moving type ownership.

## Current Status

### Already centralized and referenced from `internal/dto`

- `tenant`
- `team`
- `invitation`

### Centralized with alias bridge in handler

- none

### Pending migration

- none

## Recommended execution order

1. `user` / `email` (done, bridge removed)
2. `user/team` (done, bridge removed)
3. `user/profile` (done, bridge removed)
4. `admin/team` / `admin/tenant` duplicate local DTO files removed
5. `public/subscription` (done, bridge removed)
