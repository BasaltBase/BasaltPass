---
sidebar_position: 2
---

# Email Setup

BasaltPass requires an email service to send verification codes, password resets, and user invites.

## Supported Providers

-   **SMTP** (Generic, Gmail, Outlook, etc.)
-   **AWS SES**
-   **Mailgun**
-   **Brevo** (formerly Sendinblue)

## Configuration (SMTP Example)

You can configure this in `config.yaml` or via Environment Variables (Recommended).

```bash
export BASALTPASS_EMAIL_PROVIDER=smtp
export BASALTPASS_EMAIL_SMTP_HOST=smtp.gmail.com
export BASALTPASS_EMAIL_SMTP_PORT=587
export BASALTPASS_EMAIL_SMTP_USERNAME=your-email@gmail.com
export BASALTPASS_EMAIL_SMTP_PASSWORD=your-app-password
export BASALTPASS_EMAIL_SMTP_USE_TLS=true
```

## Testing

BasaltPass includes a helper script to verify email configuration:

```bash
cd basaltpass-backend
./scripts/test_email.sh
```

Or run the Go binary directly:
```bash
./email-test -from your-email@gmail.com -to recipient@example.com
```
