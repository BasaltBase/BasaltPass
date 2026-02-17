---
sidebar_position: 2
---

# Managing Users

As a Tenant Admin, you can invite, manage, and remove users from your tenant.

## Inviting Users

You can invite new users via email or creating them directly.

**API Endpoint**: `POST /api/v1/tenant/users/invite`

**Console Action**:
1.  Go to **Users** page.
2.  Click **Invite User**.
3.  Enter the email address and assign initial roles.
4.  The user will receive an email with a setup link.

## User List & Search

You can view and filter users by:
-   Email / Name
-   Role
-   Status (Active/Suspended)

## Granting Access

Access is granted via **Roles**. You can assign multiple roles to a user.
-   **Go to**: User Detail Page -> Roles Tab.
-   **Action**: Select roles and click Save.

See [Managing Roles](./managing-roles.md) for more details.
