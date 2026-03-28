---
sidebar_position: 4
---

# Database Setup

BasaltPass supports multiple database backends via GORM.

## Supported Databases

-   **MySQL**: Default for local Docker development.
-   **PostgreSQL**: Recommended for production.
-   **SQLite**: Supported for non-Docker or lightweight scenarios.

## Configuration

To switch databases, update `config.yaml` or set environment variables.

### PostgreSQL Example

```bash
export BASALTPASS_DATABASE_DRIVER=postgres
export BASALTPASS_DATABASE_DSN="host=db.example.com user=basaltpass password=change-me dbname=basaltpass port=5432 sslmode=disable"
```

### MySQL Example

```bash
export BASALTPASS_DATABASE_DRIVER=mysql
export BASALTPASS_DATABASE_DSN="basaltpass:basaltpass@tcp(127.0.0.1:3307)/basaltpass?charset=utf8mb4&parseTime=True&loc=Local"
```
