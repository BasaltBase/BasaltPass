# 邮件系统（Email System）

BasaltPass 提供统一邮件发送接口，支持多 Provider：SMTP / AWS SES / Brevo / Mailgun。

## 快速测试（Gmail SMTP）

1) 先在 Google 账户启用两步验证，并创建“应用专用密码”。

2) 设置环境变量：

```bash
export BASALTPASS_EMAIL_PROVIDER=smtp
export BASALTPASS_EMAIL_SMTP_HOST=smtp.gmail.com
export BASALTPASS_EMAIL_SMTP_PORT=587
export BASALTPASS_EMAIL_SMTP_USERNAME=your-email@gmail.com
export BASALTPASS_EMAIL_SMTP_PASSWORD=your-app-password
export BASALTPASS_EMAIL_SMTP_USE_TLS=true
```

3) 运行后端目录内的测试工具：

```bash
cd basaltpass-backend
./scripts/test_email.sh
```

或：

```bash
cd basaltpass-backend
go build -o email-test ./cmd/email_test
./email-test -verify
./email-test -from your-email@gmail.com -to recipient@example.com
```

## 配置方式

邮件配置属于服务配置的一部分：
- `basaltpass-backend/config/config.yaml`
- 或使用 `BASALTPASS_*` 环境变量覆盖

Provider 示例（SMTP）：

```yaml
email:
  provider: "smtp"
  smtp:
    host: "smtp.example.com"
    port: 587
    username: "..."
    password: "..."
    use_tls: true
    use_ssl: false
```

## 代码中使用

后端内部会把配置转换为 email service 的 Config，再通过 sender 发送消息。
建议参考：`basaltpass-backend/cmd/email_test/main.go` 的实现方式。

## 进一步阅读

- 详细说明：`docs/developer/email-readme.md`
- 速查：`docs/developer/email-quickstart.md`
