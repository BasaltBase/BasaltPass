# Email 系统快速开始

## 快速配置

### 1. 使用 Gmail SMTP（最简单的测试方式）

1. 在 Google 账户中启用两步验证
2. 创建应用专用密码：https://myaccount.google.com/apppasswords
3. 配置环境变量：

```bash
export BASALTPASS_EMAIL_PROVIDER=smtp
export BASALTPASS_EMAIL_SMTP_HOST=smtp.gmail.com
export BASALTPASS_EMAIL_SMTP_PORT=587
export BASALTPASS_EMAIL_SMTP_USERNAME=your-email@gmail.com
export BASALTPASS_EMAIL_SMTP_PASSWORD=your-app-password
export BASALTPASS_EMAIL_SMTP_USE_TLS=true
```

### 2. 测试邮件发送

```bash
cd basaltpass-backend

# 方法 1: 使用交互式脚本
./scripts/test_email.sh

# 方法 2: 直接命令
./email-test -from your-email@gmail.com -to recipient@example.com
```

## 其他提供商快速配置

### Brevo (推荐用于生产环境)

```bash
export BASALTPASS_EMAIL_PROVIDER=brevo
export BASALTPASS_EMAIL_BREVO_API_KEY=your-api-key
```

### Mailgun

```bash
export BASALTPASS_EMAIL_PROVIDER=mailgun
export BASALTPASS_EMAIL_MAILGUN_DOMAIN=mg.yourdomain.com
export BASALTPASS_EMAIL_MAILGUN_API_KEY=your-api-key
```

### AWS SES

```bash
export BASALTPASS_EMAIL_PROVIDER=aws_ses
export BASALTPASS_EMAIL_AWS_SES_REGION=us-east-1
export BASALTPASS_EMAIL_AWS_SES_ACCESS_KEY_ID=your-key-id
export BASALTPASS_EMAIL_AWS_SES_SECRET_ACCESS_KEY=your-secret-key
```

## 在代码中使用

参考完整文档：[Email_System.md](../doc/Email_System.md)

```go
import (
    "basaltpass-backend/internal/config"
    "basaltpass-backend/internal/service/email"
)

// 加载配置并创建邮件服务
cfg, _ := config.Load("")
emailCfg := convertToEmailConfig(cfg)  // 见 cmd/email_test/main.go
service, _ := email.NewService(emailCfg)

// 发送邮件
msg := &email.Message{
    From:     "noreply@example.com",
    To:       []string{"user@example.com"},
    Subject:  "Welcome",
    TextBody: "Welcome to BasaltPass!",
}

result, err := service.GetSender().Send(context.Background(), msg)
```

## 故障排查

### 测试配置是否正确

```bash
./email-test -verify
```

### 常见问题

1. **Gmail: "Username and Password not accepted"**
   - 使用应用专用密码，不是 Gmail 登录密码
   - 确认已启用两步验证

2. **Connection timeout**
   - 检查防火墙设置
   - 确认端口正确

3. **TLS/SSL errors**
   - 尝试 `-provider smtp` 并调整 TLS 设置

更多信息请查看 [Email_System.md](../doc/Email_System.md)
