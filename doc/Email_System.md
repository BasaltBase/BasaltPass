# BasaltPass Email System

BasaltPass 的统一邮件发送系统，支持多种邮件服务提供商。

## 功能特性

- 🔌 **统一接口**：提供一致的邮件发送接口，无论使用哪个提供商
- 🌐 **多提供商支持**：
  - 自部署 SMTP 服务器
  - AWS SES
  - Brevo (原 Sendinblue)
  - Mailgun
- 📎 **完整功能**：支持HTML/纯文本邮件、抄送、附件等
- 🧪 **测试工具**：内置命令行工具用于测试邮件配置
- 🔒 **安全**：支持 TLS/SSL 加密连接

## 配置说明

### 1. 基础配置

在 `config.yaml` 或通过环境变量配置邮件服务：

```yaml
email:
  provider: "smtp"  # 可选: smtp, aws_ses, brevo, mailgun
  
  # ... 提供商特定配置
```

### 2. 环境变量

所有配置都可以通过环境变量覆盖，使用 `BASALTPASS_` 前缀：

```bash
# 选择提供商
export BASALTPASS_EMAIL_PROVIDER=smtp

# SMTP 配置
export BASALTPASS_EMAIL_SMTP_HOST=smtp.example.com
export BASALTPASS_EMAIL_SMTP_PORT=587
export BASALTPASS_EMAIL_SMTP_USERNAME=your-username
export BASALTPASS_EMAIL_SMTP_PASSWORD=your-password
export BASALTPASS_EMAIL_SMTP_USE_TLS=true
```

## 提供商配置

### SMTP (自部署)

```yaml
email:
  provider: "smtp"
  smtp:
    host: "smtp.example.com"
    port: 587
    username: "your-username"
    password: "your-password"
    use_tls: true   # 使用 STARTTLS
    use_ssl: false  # 使用 SSL/TLS (通常用于端口 465)
```

**常见 SMTP 提供商配置：**

#### Gmail
```yaml
smtp:
  host: "smtp.gmail.com"
  port: 587
  username: "your-email@gmail.com"
  password: "your-app-password"  # 需要使用应用专用密码
  use_tls: true
```

#### Outlook/Office 365
```yaml
smtp:
  host: "smtp.office365.com"
  port: 587
  username: "your-email@outlook.com"
  password: "your-password"
  use_tls: true
```

### AWS SES

```yaml
email:
  provider: "aws_ses"
  aws_ses:
    region: "us-east-1"
    access_key_id: "AKIAIOSFODNN7EXAMPLE"
    secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    configuration_set: ""  # 可选
```

**注意事项：**
- 确保 IAM 用户有 `ses:SendEmail` 和 `ses:SendRawEmail` 权限
- 发件人邮箱需要在 SES 中验证（沙盒模式）或申请生产访问权限
- 推荐使用 IAM 角色而不是硬编码凭证

### Brevo (Sendinblue)

```yaml
email:
  provider: "brevo"
  brevo:
    api_key: "xkeysib-xxxxx"
    base_url: "https://api.brevo.com/v3"  # 可选
```

**获取 API Key：**
1. 登录 [Brevo](https://www.brevo.com/)
2. 进入 Settings → SMTP & API → API Keys
3. 创建新的 API key

### Mailgun

```yaml
email:
  provider: "mailgun"
  mailgun:
    domain: "mg.yourdomain.com"
    api_key: "key-xxxxx"
    base_url: "https://api.mailgun.net/v3"  # 美国区域
    # base_url: "https://api.eu.mailgun.net/v3"  # 欧洲区域
```

**获取配置：**
1. 登录 [Mailgun](https://www.mailgun.com/)
2. 选择或创建域名
3. 在域名设置中找到 API Key 和域名信息

## 使用方法

### 1. 在代码中使用

```go
package main

import (
    "context"
    "basaltpass-backend/internal/config"
    "basaltpass-backend/internal/service/email"
)

func main() {
    // 加载配置
    cfg, _ := config.Load("")
    
    // 创建邮件服务
    emailConfig := &email.Config{
        Provider: email.Provider(cfg.Email.Provider),
        SMTP: &email.SMTPConfig{
            Host: cfg.Email.SMTP.Host,
            Port: cfg.Email.SMTP.Port,
            // ... 其他配置
        },
    }
    
    service, _ := email.NewService(emailConfig)
    sender := service.GetSender()
    
    // 发送邮件
    msg := &email.Message{
        From:     "noreply@example.com",
        FromName: "BasaltPass",
        To:       []string{"user@example.com"},
        Subject:  "Welcome to BasaltPass",
        TextBody: "Welcome!",
        HTMLBody: "<h1>Welcome!</h1>",
    }
    
    result, err := sender.Send(context.Background(), msg)
    if err != nil {
        // 处理错误
    }
    
    // 使用结果
    println("Message ID:", result.MessageID)
}
```

### 2. 使用测试工具

编译测试工具：

```bash
cd basaltpass-backend
go build -o email-test ./cmd/email_test
```

#### 验证配置（不发送邮件）

```bash
./email-test -verify
```

#### 发送测试邮件

```bash
./email-test \
  -from "sender@example.com" \
  -to "recipient@example.com" \
  -subject "Test Email"
```

#### 使用特定配置文件

```bash
./email-test \
  -config "/path/to/config.yaml" \
  -from "sender@example.com" \
  -to "recipient@example.com"
```

#### 临时切换提供商

```bash
./email-test \
  -provider "brevo" \
  -from "sender@example.com" \
  -to "recipient@example.com"
```

## 邮件格式

### 基本邮件

```go
msg := &email.Message{
    From:     "noreply@example.com",
    FromName: "BasaltPass",
    To:       []string{"user@example.com"},
    Subject:  "Hello",
    TextBody: "This is plain text",
    HTMLBody: "<p>This is <b>HTML</b></p>",
}
```

### 带抄送和密送

```go
msg := &email.Message{
    From:    "noreply@example.com",
    To:      []string{"user1@example.com"},
    Cc:      []string{"user2@example.com"},
    Bcc:     []string{"admin@example.com"},
    Subject: "Team Update",
    // ...
}
```

### 带附件

```go
msg := &email.Message{
    From:    "noreply@example.com",
    To:      []string{"user@example.com"},
    Subject: "Invoice",
    Attachments: []email.Attachment{
        {
            Filename:    "invoice.pdf",
            ContentType: "application/pdf",
            Data:        pdfBytes,
        },
    },
    // ...
}
```

### 自定义头部

```go
msg := &email.Message{
    From:    "noreply@example.com",
    To:      []string{"user@example.com"},
    Subject: "Custom Headers",
    Headers: map[string]string{
        "X-Priority": "1",
        "X-Campaign-ID": "summer-2026",
    },
    // ...
}
```

## 故障排查

### SMTP 连接问题

1. **连接超时**
   - 检查防火墙设置
   - 确认端口正确（587 for TLS, 465 for SSL, 25 for plain）
   - 尝试 telnet 测试：`telnet smtp.example.com 587`

2. **认证失败**
   - 确认用户名和密码正确
   - Gmail 需要使用应用专用密码
   - 某些提供商需要启用"允许不够安全的应用"

3. **TLS/SSL 错误**
   - 尝试切换 `use_tls` 和 `use_ssl`
   - 检查服务器证书是否有效

### AWS SES 问题

1. **发送失败**
   - 确认邮箱已验证
   - 检查 IAM 权限
   - 查看 SES 发送配额

2. **沙盒模式**
   - 默认在沙盒模式，只能发送到已验证的邮箱
   - 申请生产访问以发送到任意邮箱

### API 提供商问题

1. **API Key 无效**
   - 确认 API Key 正确复制
   - 检查 API Key 权限和有效期

2. **速率限制**
   - 查看提供商的发送限制
   - 考虑实现重试逻辑

## 最佳实践

1. **安全性**
   - 不要在代码中硬编码凭证
   - 使用环境变量或密钥管理服务
   - 定期轮换 API Keys

2. **可靠性**
   - 实现错误处理和重试逻辑
   - 记录发送失败的邮件
   - 监控发送成功率

3. **性能**
   - 对于批量发送，考虑使用队列
   - 避免在关键路径中同步发送邮件
   - 使用连接池（SMTP）

4. **内容**
   - 同时提供 HTML 和纯文本版本
   - 使用响应式设计的 HTML 模板
   - 添加退订链接（如适用）

## 依赖项

邮件系统需要以下 Go 包：

```bash
go get gopkg.in/gomail.v2
go get github.com/aws/aws-sdk-go-v2/service/ses
go get github.com/aws/aws-sdk-go-v2/config
go get github.com/aws/aws-sdk-go-v2/credentials
```

## 许可证

与 BasaltPass 主项目保持一致。
