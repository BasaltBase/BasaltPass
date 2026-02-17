---
sidebar_position: 7
---

# Forgot Password

The self-service password reset flow allows users to regain access without admin intervention.

## Flow

1.  User clicks **Forgot Password** on the login page.
2.  User enters their registered email address.
3.  BasaltPass sends an email with a unique, time-limited link.
4.  User clicks the link and enters a new password.

## Prerequisites

-   **Email Service**: Must be configured (SMTP/SES/etc.).
-   **Verified Email**: The user must have a verified email address (optional, depending on settings).

## Security

-   Links expire after a short period (e.g., 15 minutes).
-   Links are invalidated once used.
