package security

import (
	emailservice "basaltpass-backend/internal/service/email"
	settingssvc "basaltpass-backend/internal/service/settings"
	"context"
	"fmt"
	"strings"
)

func getSiteURL() string {
	url := strings.TrimSpace(settingssvc.GetString("general.site_url", "http://localhost:8080"))
	if url == "" {
		url = "http://localhost:8080"
	}
	return strings.TrimRight(url, "/")
}

// sendEmailChangeVerificationEmail 发送邮箱变更验证邮件
func (s *Service) sendEmailChangeVerificationEmail(newEmail, token, oldEmail string) error {
	siteURL := getSiteURL()
	confirmURL := fmt.Sprintf("%s/email-change-confirm?token=%s", siteURL, token)
	subject := "🔄 BasaltPass 邮箱变更验证"

	textBody := fmt.Sprintf(`
亲爱的用户，

您正在将 BasaltPass 账户的邮箱从 %s 更改为 %s。

请点击以下链接完成邮箱变更：
%s

此链接将在30分钟后过期。

如果您未进行此操作，请忽略此邮件。

祝好，
BasaltPass 团队
`, oldEmail, newEmail, confirmURL)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasaltPass 邮箱变更验证</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- 头部 -->
        <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 40px 30px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 28px;">🔄</div>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                BasaltPass
            </h1>
            <p style="color: #e1e8ff; font-size: 16px; margin: 8px 0 0; opacity: 0.9;">
                邮箱变更验证
            </p>
        </div>
        
        <!-- 主内容 -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 24px; text-align: center;">
                确认邮箱变更
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
                您正在将 BasaltPass 账户的邮箱从 <strong>%s</strong> 更改为 <strong style="color: #667eea;">%s</strong>
            </p>
            
            <!-- 操作按钮 -->
            <div style="text-align: center; margin: 0 0 32px;">
                <a href="%s" 
                   style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                    确认邮箱变更
                </a>
            </div>
            
            <!-- 提示信息 -->
            <div style="background-color: #fff8f0; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 0 0 32px;">
                <div style="display: flex; align-items: flex-start;">
                    <div style="color: #f59e0b; font-size: 18px; margin-right: 12px; margin-top: 2px;">⏰</div>
                    <div style="color: #92400e; font-size: 14px; line-height: 1.5;">
                        <strong>重要提醒：</strong>此验证链接将在 <strong style="color: #dc2626;">30 分钟</strong> 后过期。
                    </div>
                </div>
            </div>
            
            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                如果您未进行此操作，请忽略此邮件。如果按钮无法点击，请复制以下链接到浏览器：<br>
                <span style="word-break: break-all; color: #667eea;">%s</span>
            </p>
        </div>
        
        <!-- 页脚 -->
        <div style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0 0 12px;">
                此邮件由 BasaltPass 系统自动发送，请勿直接回复
            </p>
            <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0;">
                BasaltPass Team
            </p>
        </div>
    </div>
</body>
</html>`, oldEmail, newEmail, confirmURL, confirmURL)

	msg := &emailservice.Message{
		To:       []string{newEmail},
		Subject:  subject,
		TextBody: textBody,
		HTMLBody: htmlBody,
	}

	_, err := s.emailSvc.SendWithLogging(context.Background(), msg, nil, "email_change_verification")
	return err
}

// sendEmailChangeNotificationEmail 发送邮箱变更通知邮件到旧邮箱
func (s *Service) sendEmailChangeNotificationEmail(oldEmail, newEmail, token string) error {
	siteURL := getSiteURL()
	cancelURL := fmt.Sprintf("%s/email-change-cancel?token=%s", siteURL, token)
	subject := "⚠️ BasaltPass 邮箱变更通知"

	textBody := fmt.Sprintf(`
亲爱的用户，

我们收到了将您的 BasaltPass 账户邮箱更改为 %s 的请求。

如果这不是您的操作，请立即点击以下链接取消此变更：
%s

此变更请求将在30分钟后过期。

如果是您本人操作，请忽略此邮件。

祝好，
BasaltPass 团队
`, newEmail, cancelURL)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasaltPass 邮箱变更通知</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- 头部 -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%%, #d97706 100%%); padding: 40px 30px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 28px;">⚠️</div>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                BasaltPass
            </h1>
            <p style="color: #fef3c7; font-size: 16px; margin: 8px 0 0; opacity: 0.9;">
                邮箱变更通知
            </p>
        </div>
        
        <!-- 主内容 -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 24px; text-align: center;">
                邮箱变更请求
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
                我们收到了将您的 BasaltPass 账户邮箱更改为 <strong style="color: #667eea;">%s</strong> 的请求。
            </p>
            
            <!-- 警告框 -->
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 0 0 32px;">
                <div style="display: flex; align-items: flex-start;">
                    <div style="color: #dc2626; font-size: 18px; margin-right: 12px; margin-top: 2px;">🚨</div>
                    <div style="color: #991b1b; font-size: 14px; line-height: 1.5;">
                        <strong>如果这不是您的操作</strong>，请立即点击下面的按钮取消变更，并检查您的账户安全。
                    </div>
                </div>
            </div>
            
            <!-- 操作按钮 -->
            <div style="text-align: center; margin: 0 0 32px;">
                <a href="%s" 
                   style="background: #dc2626; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                    取消邮箱变更
                </a>
            </div>
            
            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                如果是您本人操作，请忽略此邮件。变更请求将在30分钟后自动过期。
            </p>
        </div>
        
        <!-- 页脚 -->
        <div style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0 0 12px;">
                此邮件由 BasaltPass 系统自动发送，请勿直接回复
            </p>
            <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0;">
                BasaltPass Team
            </p>
        </div>
    </div>
</body>
</html>`, newEmail, cancelURL)

	msg := &emailservice.Message{
		To:       []string{oldEmail},
		Subject:  subject,
		TextBody: textBody,
		HTMLBody: htmlBody,
	}

	_, err := s.emailSvc.SendWithLogging(context.Background(), msg, nil, "email_change_notification")
	return err
}

// sendEmailChangeSuccessEmail 发送邮箱变更成功邮件
func (s *Service) sendEmailChangeSuccessEmail(newEmail, oldEmail string) error {
	subject := "✅ BasaltPass 邮箱变更成功"

	textBody := fmt.Sprintf(`
亲爱的用户，

您的 BasaltPass 账户邮箱已成功从 %s 更改为 %s。

如果这不是您的操作，请立即联系我们的客服团队。

祝好，
BasaltPass 团队
`, oldEmail, newEmail)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasaltPass 邮箱变更成功</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- 头部 -->
        <div style="background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); padding: 40px 30px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 28px;">✅</div>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                BasaltPass
            </h1>
            <p style="color: #d1fae5; font-size: 16px; margin: 8px 0 0; opacity: 0.9;">
                邮箱变更成功
            </p>
        </div>
        
        <!-- 主内容 -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 24px; text-align: center;">
                变更完成
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
                您的 BasaltPass 账户邮箱已成功从 <strong>%s</strong> 更改为 <strong style="color: #10b981;">%s</strong>
            </p>
            
            <!-- 成功提示 -->
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 32px;">
                <div style="display: flex; align-items: flex-start;">
                    <div style="color: #10b981; font-size: 18px; margin-right: 12px; margin-top: 2px;">🎉</div>
                    <div style="color: #166534; font-size: 14px; line-height: 1.5;">
                        邮箱变更已生效，所有后续通知将发送到新邮箱地址。
                    </div>
                </div>
            </div>
            
            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                如果这不是您的操作，请立即联系我们的客服团队。
            </p>
        </div>
        
        <!-- 页脚 -->
        <div style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0 0 12px;">
                此邮件由 BasaltPass 系统自动发送，请勿直接回复
            </p>
            <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0;">
                BasaltPass Team
            </p>
        </div>
    </div>
</body>
</html>`, oldEmail, newEmail)

	msg := &emailservice.Message{
		To:       []string{newEmail},
		Subject:  subject,
		TextBody: textBody,
		HTMLBody: htmlBody,
	}

	_, err := s.emailSvc.SendWithLogging(context.Background(), msg, nil, "email_change_success")
	return err
}

// sendPasswordChangeNotificationEmail 发送密码修改通知邮件
func (s *Service) sendPasswordChangeNotificationEmail(email string) error {
	subject := "🔐 BasaltPass 密码修改通知"

	textBody := `
亲爱的用户，

您的 BasaltPass 账户密码已被成功修改。

如果这不是您的操作，请立即：
1. 使用找回密码功能重置密码
2. 检查账户其他安全设置
3. 联系我们的客服团队

祝好，
BasaltPass 团队
`

	htmlBody := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasaltPass 密码修改通知</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- 头部 -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 28px;">🔐</div>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                BasaltPass
            </h1>
            <p style="color: #e1e8ff; font-size: 16px; margin: 8px 0 0; opacity: 0.9;">
                密码修改通知
            </p>
        </div>
        
        <!-- 主内容 -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 24px; text-align: center;">
                密码已修改
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
                您的 BasaltPass 账户密码已被成功修改。
            </p>
            
            <!-- 安全提醒 -->
            <div style="background-color: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 0 0 32px;">
                <div style="display: flex; align-items: flex-start;">
                    <div style="color: #f59e0b; font-size: 18px; margin-right: 12px; margin-top: 2px;">🛡️</div>
                    <div style="color: #92400e; font-size: 14px; line-height: 1.5;">
                        <strong>如果这不是您的操作</strong>，请立即：<br>
                        • 使用找回密码功能重置密码<br>
                        • 检查账户其他安全设置<br>
                        • 联系我们的客服团队
                    </div>
                </div>
            </div>
            
            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                为了您的账户安全，我们已将您在其他设备上的登录会话设为过期。
            </p>
        </div>
        
        <!-- 页脚 -->
        <div style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0 0 12px;">
                此邮件由 BasaltPass 系统自动发送，请勿直接回复
            </p>
            <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0;">
                BasaltPass Team
            </p>
        </div>
    </div>
</body>
</html>`

	msg := &emailservice.Message{
		To:       []string{email},
		Subject:  subject,
		TextBody: textBody,
		HTMLBody: htmlBody,
	}

	_, err := s.emailSvc.SendWithLogging(context.Background(), msg, nil, "password_change_notification")
	return err
}

// sendPasswordResetEmail 发送密码重置邮件
func (s *Service) sendPasswordResetEmail(email, token string) error {
	siteURL := getSiteURL()
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", siteURL, token)
	subject := "🔑 BasaltPass 密码重置"

	textBody := fmt.Sprintf(`
亲爱的用户，

我们收到了您的密码重置请求。

请点击以下链接重置您的密码：
%s

此链接将在60分钟后过期。

如果您未申请密码重置，请忽略此邮件。

祝好，
BasaltPass 团队
`, resetURL)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasaltPass 密码重置</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- 头部 -->
        <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 40px 30px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 28px;">🔑</div>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                BasaltPass
            </h1>
            <p style="color: #e1e8ff; font-size: 16px; margin: 8px 0 0; opacity: 0.9;">
                密码重置
            </p>
        </div>
        
        <!-- 主内容 -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 24px; text-align: center;">
                重置密码
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
                我们收到了您的密码重置请求。请点击下面的按钮设置新密码。
            </p>
            
            <!-- 操作按钮 -->
            <div style="text-align: center; margin: 0 0 32px;">
                <a href="%s" 
                   style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                    重置密码
                </a>
            </div>
            
            <!-- 提示信息 -->
            <div style="background-color: #fff8f0; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 0 0 32px;">
                <div style="display: flex; align-items: flex-start;">
                    <div style="color: #f59e0b; font-size: 18px; margin-right: 12px; margin-top: 2px;">⏰</div>
                    <div style="color: #92400e; font-size: 14px; line-height: 1.5;">
                        <strong>重要提醒：</strong>此重置链接将在 <strong style="color: #dc2626;">60 分钟</strong> 后过期。
                    </div>
                </div>
            </div>
            
            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                如果您未申请密码重置，请忽略此邮件。如果按钮无法点击，请复制以下链接到浏览器：<br>
                <span style="word-break: break-all; color: #667eea;">%s</span>
            </p>
        </div>
        
        <!-- 页脚 -->
        <div style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0 0 12px;">
                此邮件由 BasaltPass 系统自动发送，请勿直接回复
            </p>
            <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0;">
                BasaltPass Team
            </p>
        </div>
    </div>
</body>
</html>`, resetURL, resetURL)

	msg := &emailservice.Message{
		To:       []string{email},
		Subject:  subject,
		TextBody: textBody,
		HTMLBody: htmlBody,
	}

	_, err := s.emailSvc.SendWithLogging(context.Background(), msg, nil, "password_reset")
	return err
}

// sendPasswordResetSuccessEmail 发送密码重置成功邮件
func (s *Service) sendPasswordResetSuccessEmail(email string) error {
	subject := "✅ BasaltPass 密码重置成功"

	textBody := `
亲爱的用户，

您的 BasaltPass 账户密码已成功重置。

为了您的账户安全，我们已将您在所有设备上的登录会话设为过期，请重新登录。

如果这不是您的操作，请立即联系我们的客服团队。

祝好，
BasaltPass 团队
`

	htmlBody := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasaltPass 密码重置成功</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- 头部 -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 28px;">✅</div>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                BasaltPass
            </h1>
            <p style="color: #d1fae5; font-size: 16px; margin: 8px 0 0; opacity: 0.9;">
                密码重置成功
            </p>
        </div>
        
        <!-- 主内容 -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 24px; text-align: center;">
                密码已重置
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
                您的 BasaltPass 账户密码已成功重置。
            </p>
            
            <!-- 安全提醒 -->
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 32px;">
                <div style="display: flex; align-items: flex-start;">
                    <div style="color: #10b981; font-size: 18px; margin-right: 12px; margin-top: 2px;">🛡️</div>
                    <div style="color: #166534; font-size: 14px; line-height: 1.5;">
                        为了您的账户安全，我们已将您在所有设备上的登录会话设为过期，请重新登录。
                    </div>
                </div>
            </div>
            
            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                如果这不是您的操作，请立即联系我们的客服团队。
            </p>
        </div>
        
        <!-- 页脚 -->
        <div style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 14px; margin: 0 0 12px;">
                此邮件由 BasaltPass 系统自动发送，请勿直接回复
            </p>
            <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0;">
                BasaltPass Team
            </p>
        </div>
    </div>
</body>
</html>`

	msg := &emailservice.Message{
		To:       []string{email},
		Subject:  subject,
		TextBody: textBody,
		HTMLBody: htmlBody,
	}

	_, err := s.emailSvc.SendWithLogging(context.Background(), msg, nil, "password_reset_success")
	return err
}
