---
sidebar_position: 7
---

# Backup & Restore

Regular backups are essential for disaster recovery.

## What to Backup

1.  **Database**: The most critical component.
2.  **Config Files**: `config.yaml`, `settings.yaml`, `.env`.
3.  **Keys**: `JWT_SECRET` (if not in env), TLS certificates.

## Backup Strategies

### SQLite
For SQLite, simply copy the `.db` file.
```bash
cp basaltpass.db basaltpass.bak
```
> **Note**: Ensure the application is stopped or the DB is in a safe state to avoid corruption.

### PostgreSQL / MySQL
Use standard tools like `pg_dump` or `mysqldump`.

```bash
# PostgreSQL
pg_dump -U user -h localhost dbname > backup.sql

# MySQL
mysqldump -u user -p dbname > backup.sql
```

## Restore

1.  Stop the BasaltPass service.
2.  Restore the database from the backup file.
3.  Restore configuration files.
4.  Restart the service.
