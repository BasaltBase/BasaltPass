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
docker-compose up -d --build
```

-   **Backend**: `http://localhost:8080`
-   **Frontend**: `http://localhost:3000` (check `docker-compose.yml` for exact port)

## Method B: Dev Scripts (Recommended)

For active development, use the provided helper scripts:

```bash
./scripts/dev.sh up
```

### Common Ports

| Service | Port | Description |
| :--- | :--- | :--- |
| **Backend** | `8080` | API Server |
| **User Console** | `5173` | End-user login & profile |
| **Tenant Console** | `5174` | Organization management |
| **Admin Console** | `5175` | Platform administration |

## Configuration

BasaltPass is configured via:
1.  **.env file**: For secrets and environment-specific variables.
2.  **config.yaml**: Default system configuration.
3.  **Environment Variables**: Override any config (e.g., `BASALTPASS_DB_HOST`).

> **Note**: Ensure `JWT_SECRET` is set in production!
