# B2B SaaS Reference Application

This application represents a fully end-to-end generated B2B SaaS system, composed deterministically using Minecode from its declarative description in `app.yaml`.

## Features Included

1.  **Authentication:** Fully functional Supabase auth routing handlers, user password authentication, mock password reset, and session control.
2.  **Multi-Tenant Organizations:** Workspaces/organizations tenant structures, user memberships, and email join invitations.
3.  **Role-Based Access Control (RBAC):** Roles, permissions, and roles listing endpoint.
4.  **Billing:** Stripe integration mappings (customers, subscriptions) and checkout/webhook API handlers.
5.  **Database Primitive:** Direct SQL DDL schemas and structured database migrations.

## Project Structure

- `app.yaml`: The Minecode application blueprint specifying name, target stack (`nextjs-supabase`), features, versions, and feature configurations.
- `app/`: Main Next.js App Router source directory.
  - `app/api/api/`: Fully functional backend API route handlers (login, reset-password, logout, roles, billing webhook, checkout setup, organizations listing, and invitations).
  - `app/[routes]/page.tsx`: React/Next.js pages styled with Tailwind CSS for various capabilities (auth, billing, organizations dashboard, and rbac administration).
- `generated/`: central repository for generated TypeScript database interfaces and generated React UI components. Do not modify files in this directory manually.
- `config/`: Decentralized glue configurations (navigation configurators, permission structures, etc.).
- `supabase/migrations/`: Structured PostgreSQL migrations and DDL table definitions generated automatically based on feature entity contracts.

## How to Run & Deploy

This generated codebase is designed to run in a standard Next.js and Supabase ecosystem:

### 1. Prerequisites

- **Node.js** (v20+)
- **pnpm** or **npm**
- **Supabase CLI** (for local database development/migrations)

### 2. Install Dependencies

Navigate to this directory (or copy it to a standalone location) and install the standard stack packages:

```bash
npm install next react react-dom @supabase/auth-helpers-nextjs @supabase/supabase-js
```

### 3. Local Database & Migrations

Initialize local Supabase or use your Supabase Cloud project:

```bash
# Initialize local Supabase
supabase init

# Apply the generated migrations in order
supabase db start
```

Alternatively, execute the SQL migration files inside `supabase/migrations/` (including schemas under `database/`) directly inside your PostgreSQL instance.

### 4. Configuration

Configure the environment variables in a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 5. Start Development Server

Run the standard Next.js start script:

```bash
npm run dev
```

Open `http://localhost:3000` to interact with your fully functional Next.js/Supabase B2B SaaS application.
