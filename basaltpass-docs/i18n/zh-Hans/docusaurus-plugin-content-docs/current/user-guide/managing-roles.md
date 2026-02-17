---
sidebar_position: 3
---

# Managing Roles & Permissions

BasaltPass uses a flexible **RBAC (Role-Based Access Control)** system.

## Concepts

-   **Permission**: A specifc right to perform an action (e.g., `article.create`).
-   **Role**: A named collection of permissions (e.g., `Editor`).

## Checking Permissions

You can verify if a user has specific access rights using the Check API. This is useful for debugging or integrating your backend.

**API**: `POST /api/v1/tenant/permissions/check`

```json
{
  "user_id": 123,
  "permission_codes": ["article.create", "article.delete"]
}
```

**Response**:
```json
{
  "permissions": {
    "article.create": true,
    "article.delete": false
  }
}
```

## Importing Permissions

To initialize your system, you can batch import permissions and roles.

**API**: `POST /api/v1/tenant/permissions/import`
-   **Input**: JSON array or text file.
-   **Feature**: Automatically deduplicates and normalizes (lowercase) codes.

## Best Practices

1.  **Granular Permissions**: Define permissions based on resource actions (`resource.action`).
2.  **Composite Roles**: Create roles that group logical sets of permissions.
3.  **Least Privilege**: Assign users the minimum role necessary for their job.
