---
sidebar_position: 5
---

# 日志

BasaltPass 提供结构化日志以帮助监控和调试。

## 日志级别

可通过 `config.yaml` 或环境变量配置。

-   **debug**: 用于开发的详细信息。
-   **info**: 一般运行事件 (启动、关闭)。
-   **warn**: 非关键问题 (例如登录失败)。
-   **error**: 严重故障 (例如数据库连接丢失)。

## 输出

日志默认写入 `stdout`，与容器化环境 (Docker、Kubernetes) 兼容。

## 配置

```bash
export BASALTPASS_LOG_LEVEL=info
export BASALTPASS_LOG_FORMAT=json  # 或 text
```

**JSON 格式** 推荐用于生产环境，因为它可以被 ELK 或 Splunk 等日志聚合器轻松解析。
