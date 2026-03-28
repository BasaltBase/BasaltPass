---
sidebar_position: 4
---

# 数据库设置 (Database Setup)

BasaltPass 通过 GORM 支持多种数据库后端。

## 支持的数据库

-   **MySQL**: 本地 Docker 开发默认。
-   **PostgreSQL**: 生产环境推荐。
-   **SQLite**: 支持，适合轻量场景。

## 配置

要切换数据库，请更新 `config.yaml` 或设置环境变量。

### PostgreSQL 示例

```bash
export BASALTPASS_DATABASE_DRIVER=postgres
export BASALTPASS_DATABASE_DSN="host=db.example.com user=basaltpass password=change-me dbname=basaltpass port=5432 sslmode=disable"
```

### MySQL 示例

```bash
export BASALTPASS_DATABASE_DRIVER=mysql
export BASALTPASS_DATABASE_DSN="basaltpass:basaltpass@tcp(127.0.0.1:3307)/basaltpass?charset=utf8mb4&parseTime=True&loc=Local"
```
