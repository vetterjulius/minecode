# Minecode Known Limitations

This document outlines the known technical and architectural limitations of the Minecode composition system during v0.2 development.

## 1. Single Stack Adapter Support

Two stacks ship: `nextjs-supabase` (full application) and `openapi` (API specification only); see `docs/stacks.md`. Other frameworks (Vue, Svelte, Django) or databases (MongoDB, MySQL) are not supported yet. Builtin features are verified on `nextjs-supabase`; on `openapi` they are only documented.

## 2. Local-Only File-System Registry

The feature discovery and loading processes are restricted to local file-system registries. Features must be physically present in the registry directory (such as `composition-engine/features/`). There is no support for:

- Remote registry servers.
- Package manager integration (e.g., fetching features via npm or GitHub packages).
- Community marketplaces or online feature stores.

## 3. Local-Only Interface & Tooling

The developer workflows (CLI and MCP) are entirely local. There is no cloud-hosted dashboard, online compiler, or centralized deployment/orchestration interface available.

## 4. Static-Only Conflict Verification

Conflict detection (such as duplicate capabilities or incompatible features) is performed statically during the composition phase. There is no runtime isolation or containerization for features within the generated application. All integrated features run inside the same Next.js and Supabase environment, sharing database connections and environment variables.

## 5. Merging & Code Transformation Scope

The generator uses a deterministic file registry and pre-defined templates to compose the target application. It does not include:

- AST (Abstract Syntax Tree) parsing or code transformation of arbitrary files.
- Arbitrary custom code merging inside generated file blocks (custom code must instead reside cleanly in designated directories like `extensions/` or be contribution points connected to `extensionPoints`).

## 6. Database Migration Constraints

Tables, constraints and RLS policies are generated from entities in dependency order. Generated migrations are idempotent where possible: they use `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS` followed by `CREATE POLICY`. Schema evolution is additive only: `app.lock.json` turns blueprint changes into incremental migrations, but removals, renames and column changes must be written by hand and the lock updated (a rename looks like a removal plus an addition and is blocked); seeded grants are never revoked. The system does not support:

- Altering an existing database when an entity changes (adding a column or changing a type is not migrated).
- Live database schema diffing.
- Automatic database migration rollback script generation.
- Schema synchronization from a running database back into the feature declarations.

## 7. Feature Library

The system provides 19 built-in features (authentication, organizations, rbac, billing, projects, tasks, documents, ai-chat, and others under `composition-engine/features/builtin/`). Adding other capabilities requires developers to scaffold and develop custom features. A new feature currently also needs matching code in the stack's `api.ts`/`ui.ts`, because features declare contracts but do not yet ship their own generators.

## 8. Generated Application Gaps

The generated apps build and their database and routes are consistent, but several behaviours are not production-ready:

- **Permissions:** the database is the authority (RLS through `has_permission`). Routes of endpoints with a `permission` additionally check it through `my_permissions()` (401 when anonymous, 403 when missing; scoped to `organization_id` when the request names one) when the `rbac` feature is present. The UI does not hide actions the user may not perform yet. Creating an organization makes the caller `owner`; `change_member_role` requires `rbac.write` and keeps at least one owner; `accept_invitation` creates the membership (token, single use, expiry, matching email). Memberships have no composite unique key (the contract model has no multi-column constraints yet), so `accept_invitation` guards against double membership explicitly.
- **Billing:** checkout creates a Stripe Checkout session (`STRIPE_SECRET_KEY`; 503 without it). The webhook verifies signatures and stores the customer mapping, but the subscription lifecycle (status changes, cancellations) is not handled, and the `Subscription` table is never written. Both integrations are tested against a faked `fetch`, not against Stripe itself.
- **AI chat:** replies come from Anthropic or OpenAI (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`, optional `AI_PROVIDER`/`AI_MODEL`; 503 without a key), with the last 20 messages of the session as context, no streaming, no tools. Tested against a faked `fetch`, not against a live provider.
- **Client-supplied identifiers:** generic create routes reject generated columns, so ids and the acting user come from the database and session. Behavior routes (for example notifications send, storage upload, invite) still take some identifiers from the request and are checked by RLS only. The `crud` operations `get`, `update` and `delete` are not generated yet.
- **Storage:** the `files` storage bucket is not created by any migration.
- **Dependencies:** generated apps use Next.js 16, React 19 and `@supabase/ssr` through a generated `lib/supabase/server.ts`. They stay on Tailwind 3 and TypeScript 5 and no longer ship ESLint; versions are pinned in `workspace.ts` and only checked by building the two example apps.
- **Ownership model:** generated files are managed by the engine and protected by the manifest if edited anyway. Custom logic plugs in through `extensions/` hooks, which exist around generic `create`, `update` and `delete` endpoints (`before…`/`after…`). There are no hooks for list, get, behaviors, UI components or custom routes yet; additional routes and pages can be added next to generated ones in `app/`.
