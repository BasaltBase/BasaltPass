---
sidebar_position: 4
---

# Password Policies

Admins can configure password complexity requirements to enhance security.

## Configuration Options

-   **Minimum Length**: Minimum number of characters.
-   **Character Types**: Require uppercase, lowercase, numbers, or special symbols.
-   **History**: Prevent reuse of recent passwords.

## Enforcement

Policies are enforced during:
1.  User Registration.
2.  Password Change (by user).
3.  Password Reset (via email).

Errors will be returned if the new password does not meet the criteria.
