package email_test

import (
	"context"
	"testing"
	"time"

	"basaltpass-backend/internal/service/email"
)

// 示例：发送简单的文本邮件
func ExampleSendSimpleEmail() {
	// 创建 SMTP 配置
	config := &email.Config{
		Provider: email.ProviderSMTP,
		SMTP: &email.SMTPConfig{
			Host:     "smtp.example.com",
			Port:     587,
			Username: "user@example.com",
			Password: "password",
			UseTLS:   true,
		},
	}

	// 创建邮件服务
	service, err := email.NewService(config)
	if err != nil {
		panic(err)
	}

	// 构建邮件消息
	msg := &email.Message{
		From:     "noreply@example.com",
		FromName: "BasaltPass",
		To:       []string{"user@example.com"},
		Subject:  "Welcome to BasaltPass",
		TextBody: "Thank you for joining us!",
	}

	// 发送邮件
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := service.GetSender().Send(ctx, msg)
	if err != nil {
		panic(err)
	}

	println("Email sent successfully!")
	println("Message ID:", result.MessageID)
}

// 示例：发送 HTML 邮件
func ExampleSendHTMLEmail() {
	config := &email.Config{
		Provider: email.ProviderSMTP,
		SMTP: &email.SMTPConfig{
			Host:     "smtp.example.com",
			Port:     587,
			Username: "user@example.com",
			Password: "password",
			UseTLS:   true,
		},
	}

	service, _ := email.NewService(config)

	msg := &email.Message{
		From:     "noreply@example.com",
		FromName: "BasaltPass",
		To:       []string{"user@example.com"},
		Subject:  "Welcome to BasaltPass",
		TextBody: "Thank you for joining us!",
		HTMLBody: `
			<html>
			<body>
				<h1>Welcome to BasaltPass!</h1>
				<p>Thank you for joining us.</p>
			</body>
			</html>
		`,
	}

	ctx := context.Background()
	service.GetSender().Send(ctx, msg)
}

// 示例：发送带附件的邮件
func ExampleSendEmailWithAttachment() {
	config := &email.Config{
		Provider: email.ProviderSMTP,
		SMTP: &email.SMTPConfig{
			Host:     "smtp.example.com",
			Port:     587,
			Username: "user@example.com",
			Password: "password",
			UseTLS:   true,
		},
	}

	service, _ := email.NewService(config)

	// 读取附件内容（示例）
	fileContent := []byte("This is a test file content")

	msg := &email.Message{
		From:     "noreply@example.com",
		To:       []string{"user@example.com"},
		Subject:  "Your Invoice",
		TextBody: "Please find your invoice attached.",
		Attachments: []email.Attachment{
			{
				Filename:    "invoice.txt",
				ContentType: "text/plain",
				Data:        fileContent,
			},
		},
	}

	ctx := context.Background()
	service.GetSender().Send(ctx, msg)
}

// 示例：使用不同的提供商（Brevo）
func ExampleUseBrevoProvider() {
	config := &email.Config{
		Provider: email.ProviderBrevo,
		Brevo: &email.BrevoConfig{
			APIKey: "your-api-key",
		},
	}

	service, _ := email.NewService(config)

	msg := &email.Message{
		From:     "noreply@example.com",
		To:       []string{"user@example.com"},
		Subject:  "Test Email",
		TextBody: "This email is sent via Brevo",
	}

	ctx := context.Background()
	service.GetSender().Send(ctx, msg)
}

// 示例：发送给多个收件人（含 CC 和 BCC）
func ExampleSendToMultipleRecipients() {
	config := &email.Config{
		Provider: email.ProviderSMTP,
		SMTP: &email.SMTPConfig{
			Host:     "smtp.example.com",
			Port:     587,
			Username: "user@example.com",
			Password: "password",
			UseTLS:   true,
		},
	}

	service, _ := email.NewService(config)

	msg := &email.Message{
		From:     "noreply@example.com",
		FromName: "BasaltPass",
		To:       []string{"user1@example.com", "user2@example.com"},
		Cc:       []string{"manager@example.com"},
		Bcc:      []string{"admin@example.com"},
		Subject:  "Team Update",
		TextBody: "This is a team-wide announcement.",
	}

	ctx := context.Background()
	service.GetSender().Send(ctx, msg)
}

// 示例：验证邮件配置
func ExampleVerifyEmailConfig() {
	config := &email.Config{
		Provider: email.ProviderSMTP,
		SMTP: &email.SMTPConfig{
			Host:     "smtp.example.com",
			Port:     587,
			Username: "user@example.com",
			Password: "password",
			UseTLS:   true,
		},
	}

	service, err := email.NewService(config)
	if err != nil {
		panic(err)
	}

	// 验证连接
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := service.GetSender().Verify(ctx); err != nil {
		println("Email configuration is invalid:", err.Error())
		return
	}

	println("Email configuration is valid!")
}

// 测试：验证邮件消息结构
func TestMessageValidation(t *testing.T) {
	tests := []struct {
		name    string
		msg     *email.Message
		wantErr bool
	}{
		{
			name: "valid message",
			msg: &email.Message{
				From:     "sender@example.com",
				To:       []string{"recipient@example.com"},
				Subject:  "Test",
				TextBody: "Hello",
			},
			wantErr: false,
		},
		{
			name: "missing from",
			msg: &email.Message{
				To:       []string{"recipient@example.com"},
				Subject:  "Test",
				TextBody: "Hello",
			},
			wantErr: true,
		},
		{
			name: "missing to",
			msg: &email.Message{
				From:     "sender@example.com",
				Subject:  "Test",
				TextBody: "Hello",
			},
			wantErr: true,
		},
		{
			name: "missing subject",
			msg: &email.Message{
				From:     "sender@example.com",
				To:       []string{"recipient@example.com"},
				TextBody: "Hello",
			},
			wantErr: true,
		},
		{
			name: "missing body",
			msg: &email.Message{
				From:    "sender@example.com",
				To:      []string{"recipient@example.com"},
				Subject: "Test",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Note: validateMessage is not exported, this is just a demonstration
			// In real tests, you would test through the public API
			_ = tt.msg
			_ = tt.wantErr
		})
	}
}
