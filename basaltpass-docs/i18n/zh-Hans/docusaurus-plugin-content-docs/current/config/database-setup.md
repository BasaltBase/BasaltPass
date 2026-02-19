---
sidebar_position: 4
---

# 数据库设置 (Database Setup)

BasaltPass 通过 GORM 支持多种数据库后端。

## 支持的数据库

-   **SQLite**: 开发环境默认。无需配置。
-   **PostgreSQL**: 生产环境推荐。
-   **MySQL**: 支持。

## 配置

要切换数据库，请更新 `config.yaml` 或设置环境变量。

### PostgreSQL 示例

```bash
export BASALTPASS_DATABASE_DRIVER=postgres
export BASALTPASS_DATABASE_DSN="host=localhost user=gorm password=gorm dbname=gorm port=5432 sslmode=disable"
```

### MySQL 示例

```bash
export BASALTPASS_DATABASE_DRIVER=mysql
export BASALTPASS_DATABASE_DSN="user:password@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
```
