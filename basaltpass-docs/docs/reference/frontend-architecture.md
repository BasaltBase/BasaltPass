---
sidebar_position: 3
---

# Frontend Architecture

BasaltPass uses a modern React-based stack for its frontend applications.

## Tech Stack

-   **Framework**: React 18
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS

## Multi-App Structure

The frontend is a monorepo containing multiple distinct applications, usually found in `basaltpass-frontend/apps/`:

1.  **User Console**: For end-users to manage their profile and security.
    -   Port: `5173`
2.  **Tenant Console**: For organization admins to manage users and subscriptions.
    -   Port: `5174`
3.  **Admin Console**: For platform operators to manage the entire instance.
    -   Port: `5175`

## Backend Integration

-   **Default API URL**: `http://localhost:8080`
-   **CORS**: In development, the backend permits loose CORS policies. In production, strict origin whitelisting is enforced.
