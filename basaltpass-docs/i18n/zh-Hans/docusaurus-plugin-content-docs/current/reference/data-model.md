---
sidebar_position: 4
---

# Data Model

Understanding the data relationships helps in designing your integration.

## Core Entities

### User
The central identity. A user belongs to a Tenant but can have linked accounts (Social Auth).
-   **Fields**: `id`, `email`, `password_hash`, `tenant_id`, `created_at`.

### Role & Permission
-   **Role**: A grouping of permissions.
-   **Permission**: A specific action code.
-   **Relationship**: Many-to-Many between User and Role.

### OAuth Client
Represents an application that requests access.
-   **Fields**: `client_id`, `client_secret`, `redirect_uris`, `allowed_origins`.

### Refresh Token
Long-lived token used to obtain new Access Tokens.
-   **Fields**: `token_hash`, `user_id`, `client_id`, `expires_at`.
