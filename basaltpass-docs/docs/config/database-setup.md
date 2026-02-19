---
sidebar_position: 4
---

# Database Setup

BasaltPass supports multiple database backends via GORM.

## Supported Databases

-   **SQLite**: Default for development. Zero config required.
-   **PostgreSQL**: Recommended for production.
-   **MySQL**: Supported.

## Configuration

To switch databases, update `config.yaml` or set environment variables.

### PostgreSQL Example

```bash
export BASALTPASS_DATABASE_DRIVER=postgres
export BASALTPASS_DATABASE_DSN="host=localhost user=gorm password=gorm dbname=gorm port=8101 sslmode=disable"
```

### MySQL Example

```bash
export BASALTPASS_DATABASE_DRIVER=mysql
export BASALTPASS_DATABASE_DSN="user:password@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
```
