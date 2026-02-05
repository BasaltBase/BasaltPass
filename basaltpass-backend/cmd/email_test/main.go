package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/service/email"
)

func main() {
	// Parse command line flags
	configPath := flag.String("config", "", "Path to config file (optional)")
	from := flag.String("from", "", "Sender email address (required)")
	to := flag.String("to", "", "Recipient email address (required)")
	subject := flag.String("subject", "Test Email from BasaltPass", "Email subject")
	verify := flag.Bool("verify", false, "Only verify connection without sending email")
	provider := flag.String("provider", "", "Override email provider (smtp, aws_ses, brevo, mailgun)")
	flag.Parse()

	// Validate required flags
	if !*verify && (*from == "" || *to == "") {
		fmt.Println("Usage: email-test -from sender@example.com -to recipient@example.com [options]")
		flag.PrintDefaults()
		os.Exit(1)
	}

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Override provider if specified
	if *provider != "" {
		cfg.Email.Provider = *provider
	}

	// Create email service from config
	service, err := email.NewServiceFromConfig(cfg)
	if err != nil {
		log.Fatalf("Failed to create email service: %v", err)
	}

	sender := service.GetSender()

	fmt.Printf("=== BasaltPass Email Test Tool ===\n")
	fmt.Printf("Provider: %s\n\n", sender.Provider())

	// Verify connection
	fmt.Println("🔍 Verifying connection...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := sender.Verify(ctx); err != nil {
		log.Fatalf("❌ Connection verification failed: %v", err)
	}
	fmt.Println("✅ Connection verified successfully!")

	// Exit if only verifying
	if *verify {
		fmt.Println("\n✨ Verification complete!")
		return
	}

	// Send test email
	fmt.Println("\n📧 Sending test email...")

	msg := &email.Message{
		From:     *from,
		FromName: "BasaltPass System",
		To:       []string{*to},
		Subject:  *subject,
		TextBody: generateTextBody(),
		HTMLBody: generateHTMLBody(),
	}

	result, err := sender.Send(ctx, msg)
	if err != nil {
		log.Fatalf("❌ Failed to send email: %v", err)
	}

	fmt.Println("✅ Email sent successfully!")
	fmt.Printf("\n📋 Details:\n")
	fmt.Printf("   Message ID: %s\n", result.MessageID)
	fmt.Printf("   Provider:   %s\n", result.Provider)
	fmt.Printf("   Sent at:    %s\n", result.SentAt.Format(time.RFC3339))
	fmt.Println("\n✨ Test complete!")
}

// generateTextBody creates a plain text email body
func generateTextBody() string {
	return `Hello!

This is a test email from BasaltPass email system.

If you received this email, it means the email service is configured correctly and working as expected.

Test Information:
- Date: ` + time.Now().Format(time.RFC1123) + `
- System: BasaltPass Email Service
- Purpose: Configuration verification

Best regards,
BasaltPass System`
}

// generateHTMLBody creates an HTML email body
func generateHTMLBody() string {
	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4a5568; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f7fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4299e1; }
        .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; }
        .success { color: #48bb78; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✉️ BasaltPass Email Test</h1>
        </div>
        <div class="content">
            <p><strong class="success">✓ Success!</strong></p>
            <p>This is a test email from the BasaltPass email system.</p>
            <p>If you received this email, it means the email service is configured correctly and working as expected.</p>
            
            <div class="info-box">
                <h3>📋 Test Information</h3>
                <ul>
                    <li><strong>Date:</strong> ` + time.Now().Format(time.RFC1123) + `</li>
                    <li><strong>System:</strong> BasaltPass Email Service</li>
                    <li><strong>Purpose:</strong> Configuration verification</li>
                </ul>
            </div>
            
            <p>Best regards,<br><strong>BasaltPass System</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated test email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>`
}
