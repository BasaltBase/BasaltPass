---
sidebar_position: 3
---

# Getting Started

Learn how to run BasaltPass locally for development and testing.

## Prerequisites

-   Docker & Docker Compose
-   Git

## Method A: Docker Compose (Easiest)

Run the entire stack with a single command:

```bash
docker compose up -d --build
```

-   **Backend**: `http://localhost:8101`
-   **Frontend**: `http://localhost:5104`
-   **MySQL**: `localhost:3307`

## Method B: Dev Scripts (Recommended)

For active development, use the provided helper scripts:

```bash
./scripts/dev.sh up
```

### Common Ports

| Service | Port | Description |
| :--- | :--- | :--- |
| **Backend** | `8101` | API Server |
| **Frontend Gateway** | `5104` | Unified frontend entry |
| **MySQL** | `3307` | Local development database |

## Configuration

BasaltPass is configured via:
1.  **Root `.env` file**: For secrets and environment-specific variables.
2.  **config.yaml**: Default system configuration.
3.  **Environment Variables**: Override any config (e.g., `BASALTPASS_DATABASE_DSN`).

> **Note**: Ensure `JWT_SECRET` is set in production!
