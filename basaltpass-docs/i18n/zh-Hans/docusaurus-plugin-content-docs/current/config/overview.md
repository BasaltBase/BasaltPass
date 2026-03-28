---
sidebar_position: 1
---

# 配置概览 (Configuration Overview)

BasaltPass 旨在具有高度的可配置性。系统配置主要包括全局设置、服务连接和安全参数。

## 配置文件

主配置文件通常位于 `basaltpass-backend/config/config.yaml`，机密信息建议放在仓库根目录 `.env`。

```yaml
server:
  address: ":8101"

database:
  driver: "mysql"
  dsn: "basaltpass:basaltpass@tcp(127.0.0.1:3307)/basaltpass?charset=utf8mb4&parseTime=True&loc=Local"

email:
  provider: "smtp"
```

## 环境变量 (Env Vars)

所有的配置项都可以通过环境变量覆盖。环境变量的优先级高于配置文件。
格式通常为大写，并使用下划线分隔层级。

-   `BASALTPASS_SERVER_ADDRESS=:8101`
-   `BASALTPASS_DATABASE_DSN="mysql://..."`
-   `JWT_SECRET="complex_random_string"`

## 加载顺序

1.  默认值 (代码内)
2.  `config.yaml`
3.  根目录 `.env`
4.  环境变量
5.  命令行参数 (Flags)
