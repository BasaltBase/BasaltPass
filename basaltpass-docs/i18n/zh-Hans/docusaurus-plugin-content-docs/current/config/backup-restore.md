---
sidebar_position: 7
---

# 备份与恢复 (Backup & Restore)

定期备份对于灾难恢复至关重要。

## 需要备份的内容

1.  **数据库**: 最关键的组件。
2.  **配置文件**: `config.yaml`, `settings.yaml`, `.env`。
3.  **密钥**: `JWT_SECRET` (如果不在环境变量中), TLS 证书。

## 备份策略

### SQLite
对于 SQLite，只需复制 `.db` 文件。
```bash
cp basaltpass.db basaltpass.bak
```
> **注意**: 确保应用程序已通过或数据库处于安全状态以避免损坏。

### PostgreSQL / MySQL
使用标准工具如 `pg_dump` 或 `mysqldump`。

```bash
# PostgreSQL
pg_dump -U user -h localhost dbname > backup.sql

# MySQL
mysqldump -u user -p dbname > backup.sql
```

## 恢复

1.  停止 BasaltPass 服务。
2.  从备份文件恢复数据库。
3.  恢复配置文件。
4.  重启服务。
