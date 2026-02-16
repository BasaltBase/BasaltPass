---
sidebar_position: 6
---

# Email Templates

BasaltPass allows you to customize the emails sent to users (e.g., verification codes, password resets).

## Template Format

Emails are rendered using Go's `html/template` engine.

## Customizing

Currently, templates are embedded in the backend binary for simplicity. To customize them:

1.  **Fork the Repository**: Modify the templates in `internal/email/templates/`.
2.  **Rebuild**: Compile the backend with your changes.

## Available Variables

-   `{{.Code}}`: The verification code.
-   `{{.ExpiresIn}}`: Time until expiration.
-   `{{.Link}}`: The action link (if applicable).
-   `{{.AppName}}`: The name of your BasaltPass instance.
