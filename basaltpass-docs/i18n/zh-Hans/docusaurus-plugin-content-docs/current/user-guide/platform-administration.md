---
sidebar_position: 10
---

# Platform Administration

Platform Admin APIs are used for managing the entire BasaltPass instance. These are distinct from Tenant Admin APIs.

## Authentication

Requires a JWT with `scp: admin`. Secure this role carefully.

## Key Capabilities

### Dashboard
View global statistics and activities.
-   `GET /api/v1/admin/dashboard/stats`

### Tenant Management
Create, suspend, or delete tenants.
-   `GET /api/v1/admin/tenants`
-   `POST /api/v1/admin/tenants`

### User Management
Manage specific users across any tenant (usually for support or moderation).
-   `POST /api/v1/admin/users/:id/ban`

### System Settings
Configure global policies (registrations, allowed emails, etc.).
-   `GET /api/v1/admin/settings`

## Note on Routing
Some legacy admin endpoints might be under `/api/v1/tenant/`. It is recommended to use `/api/v1/admin/` where available.
