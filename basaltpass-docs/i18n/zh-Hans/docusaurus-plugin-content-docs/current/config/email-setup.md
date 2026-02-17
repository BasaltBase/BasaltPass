---
sidebar_position: 2
---

# 电子邮件设置 (Email Service Setup)

BasaltPass 使用电子邮件发送验证码、密码重置链接和系统通知。

## SMTP 配置

这是最常见的配置方式，支持 Gmail, Outlook, AWS SES, SendGrid 等。

在 `config.yaml` 中：

```yaml
email:
  provider: "smtp"
  smtp:
    host: "smtp.example.com"
    port: 587
    username: "postmaster@example.com"
    password: "secure_password"
    from_address: "no-reply@example.com"
    from_name: "BasaltPass Auth"
    # TLS/SSL 选项
    secure: false # 如果端口是 465 则设为 true
    require_tls: true # STARTTLS
```

## 调试

如果邮件发送失败：
1.  检查 Docker 容器是否可以访问外网 (DNS, Firewall)。
2.  验证 SMTP 凭据是否正确。
3.  查看应用日志 (`docker-compose logs backend`) 获取详细错误信息。

## 模板 (Templates)

邮件内容由 HTML 模板控制。您可以在 `templates/email/` 目录下找到并自定义它们。
请参阅 [邮件模板](./email-templates.md) 文档。
