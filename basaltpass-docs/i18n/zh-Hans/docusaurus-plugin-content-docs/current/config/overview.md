---
sidebar_position: 1
---

# 配置概览 (Configuration Overview)

BasaltPass 旨在具有高度的可配置性。系统配置主要包括全局设置、服务连接和安全参数。

## 配置文件

主配置文件通常位于 `/opt/basaltpass/config/config.yaml`。

```yaml
server:
  host: "0.0.0.0"
  port: 8080

database:
  driver: "postgres"
  dsn: "postgres://user:pass@localhost:5432/basaltpass?sslmode=disable"

auth:
  jwt_secret: "CHANGE_ME_IN_PRODUCTION"
  token_expiry: 3600 # 秒

email:
  enabled: true
  provider: "smtp"
```

## 环境变量 (Env Vars)

所有的配置项都可以通过环境变量覆盖。环境变量的优先级高于配置文件。
格式通常为大写，并使用下划线分隔层级。

-   `BASALTPASS_SERVER_PORT=9090`
-   `BASALTPASS_DATABASE_DSN="mysql://..."`
-   `BASALTPASS_AUTH_JWT_SECRET="complex_random_string"`

## 加载顺序

1.  默认值 (代码内)
2.  `config.yaml`
3.  环境变量
4.  命令行参数 (Flags)
