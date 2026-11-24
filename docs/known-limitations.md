# Minecode Known Limitations

This document outlines the known technical and architectural limitations of the Minecode composition system during v0.2 development.

## 1. Single Stack Adapter Support

Currently, the system only supports the `nextjs-supabase` stack adapter. Generating applications using alternative frameworks (such as Vue, Svelte, Django, or databases like MongoDB or MySQL) is not supported in this release.

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

Tables, constraints and RLS policies are generated from entities in dependency order. Generated migrations are create-only: they use `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS` followed by `CREATE POLICY`. The system does not support:

- Altering an existing database when an entity changes (adding a column or changing a type is not migrated).
- Live database schema diffing.
- Automatic database migration rollback script generation.
- Schema synchronization from a running database back into the feature declarations.

## 7. Feature Library

The system provides 19 built-in features (authentication, organizations, rbac, billing, projects, tasks, documents, ai-chat, and others under `composition-engine/features/builtin/`). Adding other capabilities requires developers to scaffold and develop custom features. A new feature currently also needs matching code in the stack's `api.ts`/`ui.ts`, because features declare contracts but do not yet ship their own generators.

## 8. Generated Application Gaps

The generated apps build and their database and routes are consistent, but several behaviours are not production-ready:

- **Permissions are not enforced in routes.** `config/permissions.ts` is generated but no route checks it, and no default roles are seeded. Tenant isolation is enforced by RLS; fine-grained permissions are not.
- **Billing:** checkout returns `501 Not Implemented`. The Stripe webhook verifies signatures and stores the customer mapping, but no subscription lifecycle is handled.
- **AI chat:** the assistant replies with canned text and is not connected to a model provider.
- **Client-supplied identifiers:** some create routes still take `userId` or `organizationId` from the request body. RLS stops cross-tenant writes, but a member can set another user's id on tenant-scoped rows.
- **Storage:** the `files` storage bucket is not created by any migration.
- **Dependencies:** the generated apps use Next.js 14 and the deprecated `@supabase/auth-helpers-nextjs`.
- **Ownership model:** `app/` is regenerated in full and overwritten; `extensions/` is not yet wired into the generated code, and there is no lockfile or upgrade path.
