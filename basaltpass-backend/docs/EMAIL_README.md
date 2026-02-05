# 📧 邮件系统功能说明

BasaltPass 现已集成完整的邮件发送系统！

## 🎯 快速开始

### 1. 最简单的方式 - 使用 Gmail

```bash
# 设置环境变量
export BASALTPASS_EMAIL_PROVIDER=smtp
export BASALTPASS_EMAIL_SMTP_HOST=smtp.gmail.com
export BASALTPASS_EMAIL_SMTP_PORT=587
export BASALTPASS_EMAIL_SMTP_USERNAME=your-email@gmail.com
export BASALTPASS_EMAIL_SMTP_PASSWORD=your-app-password
export BASALTPASS_EMAIL_SMTP_USE_TLS=true

# 测试配置
cd basaltpass-backend
./email-test -verify

# 发送测试邮件
./email-test -from your-email@gmail.com -to recipient@example.com
```

**注意**：Gmail 需要使用[应用专用密码](https://myaccount.google.com/apppasswords)，不是普通登录密码。

### 2. 在代码中使用

```go
import (
    "context"
    "basaltpass-backend/internal/config"
    "basaltpass-backend/internal/service/email"
)

// 从配置创建邮件服务
cfg, _ := config.Load("")
emailService, _ := email.NewServiceFromConfig(cfg)

// 发送欢迎邮件
msg := &email.Message{
    From:     "noreply@example.com",
    FromName: "BasaltPass",
    To:       []string{"user@example.com"},
    Subject:  "Welcome to BasaltPass",
    TextBody: "Thank you for joining us!",
    HTMLBody: "<h1>Welcome!</h1><p>Thank you for joining us.</p>",
}

result, err := emailService.GetSender().Send(context.Background(), msg)
```

## 📚 完整文档

- **[Email_System.md](../doc/Email_System.md)** - 完整使用文档
- **[EMAIL_QUICKSTART.md](EMAIL_QUICKSTART.md)** - 快速开始指南
- **[Email_System_Implementation.md](../doc/Email_System_Implementation.md)** - 实现细节

## ✨ 支持的邮件提供商

| 提供商 | 适用场景 | 免费额度 |
|--------|---------|---------|
| **SMTP** | 开发测试 | 取决于服务器 |
| **AWS SES** | 大规模生产 | 62,000 封/月 |
| **Brevo** | 中小型生产 | 300 封/天 |
| **Mailgun** | 中小型生产 | 5,000 封/月 |

## 🛠️ 测试工具

```bash
# 交互式测试脚本
./scripts/test_email.sh

# 或直接使用命令行
./email-test -from sender@example.com -to recipient@example.com
```

## ⚙️ 配置方式

支持三种配置方式：

1. **环境变量**（推荐）：`BASALTPASS_EMAIL_*`
2. **配置文件**：`config/config.yaml` 的 `email` 部分
3. **代码配置**：直接创建 `email.Config`

查看 [config.example.yaml](config.example.yaml) 获取完整的配置示例。

## 🔍 功能特性

- ✅ 纯文本和 HTML 邮件
- ✅ 多个收件人（To、CC、BCC）
- ✅ 文件附件支持
- ✅ 自定义邮件头
- ✅ TLS/SSL 加密
- ✅ 连接验证
- ✅ 统一的错误处理

## 📝 使用示例

### 发送欢迎邮件

```go
msg := &email.Message{
    From:     "noreply@basaltpass.com",
    FromName: "BasaltPass Team",
    To:       []string{user.Email},
    Subject:  "Welcome to BasaltPass!",
    TextBody: "Welcome! We're excited to have you.",
    HTMLBody: `<h1>Welcome!</h1><p>We're excited to have you.</p>`,
}
```

### 发送密码重置邮件

```go
msg := &email.Message{
    From:    "security@basaltpass.com",
    To:      []string{user.Email},
    Subject: "Password Reset Request",
    HTMLBody: fmt.Sprintf(`
        <p>Click the link below to reset your password:</p>
        <a href="%s">Reset Password</a>
        <p>This link expires in 1 hour.</p>
    `, resetLink),
}
```

### 发送带附件的发票

```go
msg := &email.Message{
    From:    "billing@basaltpass.com",
    To:      []string{user.Email},
    Subject: "Your Invoice",
    TextBody: "Please find your invoice attached.",
    Attachments: []email.Attachment{
        {
            Filename:    "invoice.pdf",
            ContentType: "application/pdf",
            Data:        pdfBytes,
        },
    },
}
```

## 🚨 常见问题

### Gmail: "Username and Password not accepted"
- 使用[应用专用密码](https://myaccount.google.com/apppasswords)而不是普通密码
- 确保启用了两步验证

### Connection timeout
- 检查防火墙设置
- 确认端口正确（587 for TLS, 465 for SSL）

### TLS/SSL errors
- 尝试切换 `use_tls` 和 `use_ssl` 设置

更多问题请查看 [Email_System.md](../doc/Email_System.md) 的故障排查部分。

## 📦 依赖项

邮件系统使用以下 Go 包：
- `gopkg.in/gomail.v2` - SMTP
- `github.com/aws/aws-sdk-go-v2/service/ses` - AWS SES
- 标准库的 `net/http` - Brevo 和 Mailgun

所有依赖已添加到 `go.mod`。

## 🔐 安全建议

1. ✅ 使用环境变量存储凭证，不要硬编码
2. ✅ 定期轮换 API Keys
3. ✅ 使用 TLS/SSL 加密连接
4. ⚠️ 生产环境建议使用密钥管理服务（如 AWS Secrets Manager）

---

**需要帮助？** 查看完整文档：[Email_System.md](../doc/Email_System.md)
