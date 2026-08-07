# Vercel Preview Deployments for Example Applications

This directory contains the GitHub Actions workflows. The `deploy-preview.yml` workflow automatically builds, regenerates, and deploys both reference applications to Vercel preview environments when a pull request is opened or updated. It also dynamically comments the deployment URLs back to the pull request.

---

## 🛠️ Required Setup & Configurations

To enable this automated pipeline, you need to configure specific secrets in your GitHub repository and link the applications in Vercel.

### 1. GitHub Secrets

Add the following Secrets under **Settings > Secrets and variables > Actions** in your GitHub repository:

| Secret Name                      | Description                                                    | How to Get                                                                                           |
| -------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`                   | Personal Access Token to authenticate with Vercel CLI.         | Go to Vercel Account Settings > **Tokens** and generate a new token.                                 |
| `VERCEL_ORG_ID`                  | Your Vercel team or user account ID.                           | Run `npx vercel login`, then inspect `.vercel/project.json` or retrieve it via Vercel CLI/dashboard. |
| `VERCEL_PROJECT_ID_B2B_SAAS`     | Project ID for the B2B SaaS example application in Vercel.     | Create a project in Vercel for `b2b-saas`, link it, and get the Project ID.                          |
| `VERCEL_PROJECT_ID_AI_WORKSPACE` | Project ID for the AI Workspace example application in Vercel. | Create a project in Vercel for `ai-workspace`, link it, and get the Project ID.                      |

---

### 2. Vercel Project Configurations

You should create two separate projects in Vercel:

1. **B2B SaaS Reference Application**
2. **AI Workspace Reference Application**

For each project, configure the following:

- **Framework Preset:** Next.js
- **Root Directory:**
  - For B2B SaaS: `composition-engine/examples/b2b-saas`
  - For AI Workspace: `composition-engine/examples/ai-workspace`
- **Build & Development Settings:** Leave as defaults (our pipeline uses `--prebuilt` which compiles the application inside the GitHub Actions runner first).

---

### 3. Database Connection (Supabase Setup)

Since the generated applications use Supabase for database schemas, authentication, and layouts, you need to link each Vercel preview environment to a valid Supabase instance.

In each Vercel Project's Settings under **Environment Variables**, add:

- `NEXT_PUBLIC_SUPABASE_URL`: The URL of your Supabase project (e.g. `https://your-project.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anonymous key for the Supabase project.

> ⚠️ **Note:** For security and isolation, it is highly recommended to use separate, dedicated Supabase projects or development/staging instances for each of the two example applications.

---

## 🔄 Automation Overview

When a Pull Request targeting `main` is created or updated:

1. The `deploy-preview.yml` workflow is triggered.
2. The code is checked out, dependencies are installed, and `pnpm build` is executed.
3. `pnpm build` compiles the packages and triggers the CLI command `pnpm build:example`, which completely regenerates the Next.js directories for `b2b-saas` and `ai-workspace` using their respective `app.yaml` blueprints.
4. The workflow runs `vercel pull` to fetch Vercel's remote configuration.
5. The workflow runs `vercel build` to generate the highly optimized build output.
6. The workflow runs `vercel deploy --prebuilt` to instantly deploy the build to a Preview environment.
7. Finally, it uses the official `@actions/github-script` to locate or create a single, sticky bot comment containing the preview links on the PR.
