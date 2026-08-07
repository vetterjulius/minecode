# AI Workspace Reference Application

This is a comprehensive, production-ready SaaS productivity workspace reference application composed and generated entirely using the **Minecode** composition engine.

## Overview

AI Workspace is a collaborative, AI-powered productivity platform designed for modern companies. It integrates multi-tenant organization structures, isolated workspaces, project and task tracking, collaborative documents, storage management, full-text search, audit logging, multi-channel notifications, satisfaction surveys, analytics charts, and conversational AI chat.

## Features Included

This application utilizes **all 19 standard Minecode business features**:

1.  **`database`**: Setup pooling, indexes, and full relational model tables.
2.  **`authentication`**: Login, logout, password resets, and session middleware.
3.  **`organizations`**: Tenants portal with team member invitations and management.
4.  **`workspaces`**: Isolated collaborative team workspace environments.
5.  **`projects`**: Initiatives tracking and organization.
6.  **`tasks`**: Agile Kanban boards with assignments, priority, and statuses.
7.  **`documents`**: Collaborative rich-text docs and specs.
8.  **`rbac`**: Permission gates and workspace role authorizations (owner, admin, member, guest).
9.  **`billing`**: Subscriptions, billing checkout redirects, and stripe payment lifecycle.
10. **`storage`**: Central file upload storage with type and size limits.
11. **`notifications`**: Multi-channel alerts (Email, SMS, Webhooks).
12. **`search`**: Full-text searching and results across tickets and documents.
13. **`audit-logging`**: Security trails and actor logs dashboard.
14. **`ai-chat`**: Conversational AI chatbot.
15. **`whiteboard`**: Interative canvas shape boards.
16. **`ticketing`**: Customer support queues.
17. **`customer-feedback`**: Satisfaction score surveys and average reviews.
18. **`analytics`**: Performance metric dashboards.
19. **`knowledge-base`**: Help Center and documentation articles.

## Running the Application

To run the generated Next.js & Supabase application:

1.  Navigate into the `ai-workspace` directory:
    ```bash
    cd composition-engine/examples/ai-workspace
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Start the Next.js development server:
    ```bash
    pnpm dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser.
