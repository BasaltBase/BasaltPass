---
sidebar_position: 2
---

# Key Concepts

Understanding the core concepts of BasaltPass is essential for effective integration and management.

## 1. Tenant (租户)

A **Tenant** is the fundamental unit of isolation in BasaltPass. It represents an organization, a customer, or a project.
-   **Isolation**: Users, roles, and data in one tenant are strictly isolated from others.
-   **Context**: Most API calls require a tenant context (usually derived from the token or domain).

## 2. User (用户)

A **User** is an identity within a tenant.
-   **Attributes**: Email, phone, profile data.
-   **Authentication**: Password, 2FA, Social Login.

## 3. OAuth 2.0 & OIDC

BasaltPass acts as the **Authorization Server**.
-   **Client**: Your application (web, mobile, backend service).
-   **Resource Owner**: The User.
-   **Scopes**: Permissions requested by the Client (e.g., `openid`, `profile`).

## 4. RBAC (Role-Based Access Control)

Access control is managed via Roles and Permissions.
-   **Permission**: A granular action (e.g., `user.create`, `report.read`).
-   **Role**: A collection of permissions (e.g., `Admin`, `Editor`).
-   **Assignment**: Users are assigned roles, inheriting their permissions.
