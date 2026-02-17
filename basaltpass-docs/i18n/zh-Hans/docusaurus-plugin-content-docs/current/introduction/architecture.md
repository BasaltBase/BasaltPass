---
sidebar_position: 4
---

# High-Level Architecture

BasaltPass is designed as a centralized Identity Provider (IdP) mediating between Users, Clients (Apps), and Resource Servers (APIs).

## Components

1.  **Authorization Server**: Issues tokens upon successful user authentication.
2.  **User Database**: Stores user credentials, profiles, and role assignments.
3.  **Tenant Console**: Interface for organization admins.
4.  **Admin Console**: Interface for platform operators.
5.  **User Console**: Self-service profile management for end-users.

## Request Flow

1.  **User** attempts to access **Client App**.
2.  **Client App** redirects **User** to **BasaltPass**.
3.  **BasaltPass** authenticates **User** (presents login form).
4.  **BasaltPass** issues **Authorization Code** to **Client App**.
5.  **Client App** exchanges code for **Access Token**.
6.  **Client App** uses **Access Token** to call **Resource API**.
