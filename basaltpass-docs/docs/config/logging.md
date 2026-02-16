---
sidebar_position: 5
---

# Logging

BasaltPass provides structured logging to help with monitoring and debugging.

## Log Levels

Can be configured via `config.yaml` or env vars.

-   **debug**: Detailed information for development.
-   **info**: General operational events (startup, shutdown).
-   **warn**: Non-critical issues (e.g., failed login attempts).
-   **error**: Critical failures (e.g., DB connection lost).

## Output

Logs are written to `stdout` by default, making it compatible with containerized environments (Docker, Kubernetes).

## Configuration

```bash
export BASALTPASS_LOG_LEVEL=info
export BASALTPASS_LOG_FORMAT=json  # or text
```

**JSON format** is recommended for production as it can be easily parsed by log aggregators like ELK or Splunk.
