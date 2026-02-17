---
sidebar_position: 1
---

# Configuration Overview

BasaltPass uses a two-layer configuration system to offer flexibility and stability.

## 1. Service Configuration (`config.yaml`)

This layer controls the *infrastructure* settings of the application.
-   **File**: `basaltpass-backend/config/config.yaml`
-   **Scope**: Database connection, Server Port, Log Level, Email Provider credentials.
-   **Override**: Environment variables (e.g., `BASALTPASS_DATABASE_PORT`).

## 2. System Settings (`settings.yaml`)

This layer controls the *business logic* and *运行时 behavior*.
-   **File**: `basaltpass-backend/config/settings.yaml` (Automatically generated/managed).
-   **Scope**: Site Name, Registration rules, OAuth allow-lists.
-   **Management**: Can be updated via Admin API without restarting the server.

## Environment Variables

All `config.yaml` settings can be overridden by environment variables.
-   **Prefix**: `BASALTPASS_`
-   **Format**: Uppercase, dots replaced by underscores.
    -   `server.port` -> `BASALTPASS_SERVER_PORT`
    -   `database.host` -> `BASALTPASS_DATABASE_HOST`
