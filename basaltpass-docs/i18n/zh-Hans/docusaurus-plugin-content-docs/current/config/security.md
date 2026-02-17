---
sidebar_position: 5
---

# 安全配置 (Security Configuration)

保护您的 BasaltPass 部署是至关重要的。以下是关键的安全配置建议。

## 1. 强制 HTTPS

在生产环境中，**必须** 使用 HTTPS。BasaltPass 本身可以配置证书，但通常建议在反向代理 (Nginx, Traefik, ALB) 层处理 SSL 终结。

如果直接配置 TLS：
```yaml
server:
  tls:
    enabled: true
    cert_file: "/path/to/cert.pem"
    key_file: "/path/to/key.pem"
```

## 2. JWT 密钥 (JWT Secret)

`auth.jwt_secret` 用于签名所有访问令牌。
-   **绝对不要** 使用默认值。
-   在生产环境中使用长随机字符串 (至少 32 字符)。
-   定期轮换密钥 (这将使旧令牌失效)。

## 3. CORS 策略

仅允许受信任的域访问 API。
```yaml
security:
  cors:
    allowed_origins:
      - "https://myapp.com"
      - "https://admin.myapp.com"
    allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
```

## 4. 速率限制 (Rate Limiting)

防止暴力破解攻击。
```yaml
security:
  rate_limit:
    enabled: true
    requests_per_second: 10
    burst: 20
```
