# Technical Specification v0.2: Decoupled Composition & Real-World SaaS

This specification defines the technical architecture, target goals, and implementation requirements for **Minecode v0.2**.

---

## 1. Primary Objectives
The primary focus of v0.2 is scaling the composition engine to support a complex, real-world multi-tenant SaaS application while refactoring the monolithic code generation adapter into a highly modular and extensible system.

---

## 2. Real-World B2B SaaS Application (Target App)
Instead of basic isolated capability demonstrations, v0.2 targets the composition of a comprehensive, production-ready SaaS product (e.g., an Enterprise Ticketing and Customer Support Hub).
- **Core Requirements:**
  - Multi-tenant data segregation.
  - Full support for nested roles and fine-grained RBAC permission checks.
  - End-to-end billing lifecycle integration with automated tier features enforcement.
  - Custom React components/routes working seamlessly alongside generated elements.

---

## 3. Modular Stack Adapter Architecture
To prevent the `NextJsSupabaseAdapter` from becoming an unmaintainable monolith, v0.2 refactors the compilation layer into registered, feature-specific sub-generators.

### Architecture Plan
The core `NextJsSupabaseAdapter` will act as a coordinator rather than an implementation class. It will dispatch composition plan elements to individual registered generators:

```
                  +--------------------------+
                  |  NextJsSupabaseAdapter   |
                  +------------+-------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
+------v------+         +------v------+         +------v------+
| DatabaseGen |         |   AuthGen   |         |  BillingGen | ...
+-------------+         +-------------+         +-------------+
```

### Generator Registry
The main adapter will expose a registry to attach custom generators:
- **`DatabaseGenerator`:** Compiles entities into tables, foreign keys, indexes, RLS policies and flat Supabase migrations, and builds static TS row types (see section 6).
- **`AuthGenerator`:** Generates authentication page templates, reset-password flows, and session middleware.
- **`BillingGenerator`:** Generates checkout checkout routers, webhook endpoints, and client-side subscription settings.
- **`RbacGenerator`:** Compiles roles and permissions checks, embedding them directly into API handlers and frontend layouts.

---

## 4. New First-Party Features
Four new production-quality built-in features will be designed and added to the filesystem registry under `composition-engine/features/builtin/`:

### 4.1 Storage Feature (`storage`)
- **Contract:** Declares files bucket creation, file upload size constraints, and allowed MIME types.
- **Generator Integration:** Compiles file upload API routes and client-side uploader components.

### 4.2 Notifications Feature (`notifications`)
- **Contract:** Declares delivery channels (Email, Slack webhooks, SMS) and templates.
- **Generator Integration:** Generates event listener hooks and integrations with third-party providers (e.g., Resend, Twilio).

### 4.3 Search Feature (`search`)
- **Contract:** Declares searchable tables, indexed text fields, and relevance rankings.
- **Generator Integration:** Generates database functions (PG Trgm/TSVector) and search UI searchbars.

### 4.4 Audit Logging Feature (`audit-logging`)
- **Contract:** Declares logged events, actor profiles, and database logging tables.
- **Generator Integration:** Inserts logging middleware into target API route handlers and compiles a secure dashboard layout.

---

## 5. Custom Code Integration & Roundtripping
Ensure developers can customize 100% of the generated application without losing custom logic upon subsequent code compositions.
- **Extensions Boundaries:** Formalize directories (`/extensions`, `/config`) as protected custom namespaces.
- **Contribution Points:** Enable developers to hook custom typescript classes or files into `extensionPoints` defined in feature contracts.

---

## 6. Schema and Access Model

Entities in feature contracts are the single source of truth for the database; features do not ship hand-written table SQL.

- **Entity model:** fields carry `references`, `generate`, `default`, `unique`, `primaryKey` and `indexed`. Each entity declares an `access` rule: `tenant` (members of an organization, optionally `via` a tenant-scoped parent), `owner`, `authenticated-read` or `private`, with `writes` of `members`, `insert-only` or `server-only`.
- **Security by default:** every generated table has row level security enabled. An entity without an access rule is private (service role only). Tenant isolation is enforced by the database, not by route code.
- **Permissions:** a tenant rule may add `permissions: { read, write }` naming permissions declared by the providing feature. With the `rbac` feature in the composition they are enforced in the database: policies call `has_permission(organization_id, name)`, which looks up the member's role (`membership.role`) in `role_permission`. Roles and grants are seeded from the composed permissions (defaults for `owner`, `admin`, `member`; read-only for other role names) and can be overridden per blueprint via the rbac `roles` config. Without `rbac`, membership alone grants access.
- **API endpoints:** each API entry declares either `crud` (entity and operation, optionally `include` for child rows) or a named `behavior`, plus the `permission` it requires. The composer rejects unknown entities, includes and permissions. A stack derives `crud` endpoints from the entity definition (accepted and required fields, defaults, generated columns) and implements `behavior` ids through its own registry, so contracts stay stack-agnostic. Request and response JSON use `snake_case` column names; list responses are `{ success, data }`, and row level security violations answer 403.
- **Organization functions:** with `Organization` and `Membership`, the database gets `create_organization(name)` (creates the organization and makes the caller owner) and, with rbac, `change_member_role(org, user, role)` (needs `rbac.write`, rejects unknown roles, keeps one owner). Routes call them; authorization failures are SQLSTATE 42501 and answer 403.
- **Lock and evolution:** every generation writes `app.lock.json` next to the app: a stack-agnostic snapshot of entities, fields, access rules, permissions and relevant config, plus the number of migrations generated so far. If the lock exists, the next generation only emits additive migrations (new tables, new columns, refreshed policies and seeds) continuing the numbering; existing migration files are never rewritten. Removing an entity or field, changing a field, or adding a required field without default is rejected with a message, because those changes can lose data. Seeds are additive: removed grants or roles are not revoked.
- **Ownership:** `app.lock.json` also records, per generated file, the hash of the generated source and of what was written to disk. Regeneration overwrites only files nobody has edited. If a person edited a file and the generator wants a different version, their file is kept, the new version is saved as `<file>.minecode-new`, and CLI and MCP report the conflict; `--force` overwrites. Files that are no longer generated are reported, not deleted; files a person deleted stay deleted while their generated source is unchanged. Code in `extensions/` is never generated and never touched.
- **Custom code interface:** generated files are not meant to be edited. Application code lives in `extensions/` and plugs in through extension points. Every generic `create`, `update` and `delete` endpoint exposes `<Entity>.before<Op>` (validate or adjust, throw to reject) and `<Entity>.after<Op>` (react to the result). The composer lists them as `function` extension points in the plan, so they can be discovered like any other. The stack scaffolds `extensions/index.ts` once, typed by the generated `generated/lib/extensions.ts`; the scaffold is never overwritten or tracked by the manifest.
- **Identity:** the application user is a `Profile` linked to `auth.users` and created by a trigger. There are no separate user or session tables.
- **Conventions:** `snake_case` tables and columns; flat timestamp-prefixed migrations in dependency order.
- **Validation:** missing references, circular references, unknown field types, missing primary keys, duplicate entities and invalid access rules fail composition with an error naming the entity and feature.

## 7. Generation Guarantees

- **No silent fallbacks:** an API route or migration without a generator or content is an error, not a placeholder.
- **Built output is verified:** CI regenerates the examples and requires them to be unchanged, runs the generated migrations on PostgreSQL, checks that tables, columns and fetch targets used by the generated app exist, and type-checks and builds the generated apps.
- **Secrets stay on the server:** the service role key is only used by server-side helpers and is never referenced from client components.
