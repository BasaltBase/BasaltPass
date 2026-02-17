---
sidebar_position: 8
---

# Upgrading BasaltPass

Learn how to safely upgrade your BasaltPass instance to the latest version.

## Upgrade Steps

1.  **Backup**: Always backup your database and config before upgrading.
2.  **Pull Latest Image**: If using Docker.
    ```bash
    docker-compose pull
    ```
3.  **Check Changelog**: Review release notes for breaking changes.
4.  **Restart**:
    ```bash
    docker-compose up -d
    ```

## Database Migrations

BasaltPass automatically runs necessary database migrations on startup.
-   **Forward Compatible**: We strive to make migrations additive to avoid downtime.
-   **Rollback**: Automatic rollback is not supported. You must restore from backup if a migration fails catastrophically.

## Versioning Policy

BasaltPass follows Semantic Versioning (SemVer).
-   **Major (x.0.0)**: Breaking changes.
-   **Minor (0.x.0)**: New features, backward compatible.
-   **Patch (0.0.x)**: Bug fixes.
