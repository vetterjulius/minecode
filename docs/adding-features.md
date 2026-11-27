# Developer Guide: Adding Features to Minecode

This guide explains how to design, scaffold, implement, and integrate new features into the Minecode ecosystem.

---

## 1. Feature Architecture Overview

In Minecode, a **Feature** is a modular package declaring capabilities, dependencies, configuration schemas, and stack-specific migrations or source components. Features do not contain physical application files (like `.tsx` components or `.ts` routes) directly; instead, they declare **abstract capabilities** (or contracts) that are compiled by **Stack Adapters** into actual physical source files.

### Feature Structure

Each feature is located in its own sub-directory (typically under `composition-engine/features/builtin/` or a custom features directory) and must contain the following files:

```
feature-directory/
├── feature.yaml         # Base metadata (id, version, name)
├── contract.yaml        # Declared capabilities, UI pages, APIs, migrations
├── dependencies.yaml   # Dependencies and version constraints on other features
├── config.schema.yaml   # JSON Schema for configuration parameters
└── README.md            # Feature documentation
```

---

## 2. Base Configuration Files

### `feature.yaml`

Declares the identity, description, version, and the stacks supported by the feature.

```yaml
id: database
name: PostgreSQL Database
version: 0.1.0
description: Core relational database storage and migrations capability
stackCompatibility:
  - nextjs-supabase
```

### `contract.yaml`

Declares what capabilities the feature provides and any structural artifacts it registers (e.g., database tables, API handlers, UI routes, navigation settings, permissions, custom SQL migrations, and extension points).

```yaml
# Example contract (see composition-engine/features/builtin/* for real ones)
provides:
  capabilities:
    - tickets
  entities:
    - name: Ticket
      description: Support ticket of an organization
      fields:
        - name: id
          type: uuid
          required: true
          generate: uuid
        - name: organizationId
          type: uuid
          required: true
          references: { entity: Organization, onDelete: cascade }
        - name: title
          type: string
          required: true
        - name: createdAt
          type: timestamp
          required: true
          generate: now
      access:
        scope: tenant
        field: organizationId
  api:
    - name: ListTickets
      path: /api/tickets
      method: GET
      description: List support tickets.
  ui:
    - name: TicketBoard
      route: tickets
      slot: main
  permissions:
    - name: tickets.read
      description: Read tickets
```

See [Entities, schema and access rules](#entities-schema-and-access-rules) for the entity options.

### `dependencies.yaml`

Declares dependencies on other features.

```yaml
dependencies:
  - id: database
    version: '^0.1.0'
```

### `config.schema.yaml`

Defines the strict JSON Schema for the feature's configuration parameters.

```yaml
type: object
properties:
  poolSize:
    type: integer
    default: 10
  sslRequired:
    type: boolean
    default: true
required:
  - sslRequired
```

---

## 3. Scaffolding with the CLI (FDK)

The Minecode CLI provides utility commands to make feature development fast and standardized:

### Scaffolding a New Feature

Run the CLI `feature create` (alias `feature scaffold`) command to generate the required directory structure:

```bash
node composition-engine/apps/cli/dist/main.js feature create <feature-name-or-id>
```

This generates the full directory structure with sample configuration files, pre-configured JSON Schema, and a skeleton README.

### Validating a Feature

To check if your feature's YAML configurations are correct, well-formed, and valid:

```bash
node composition-engine/apps/cli/dist/main.js feature validate <path-to-feature-dir>
```

---

## 4. Crucial Step: Adapting the Stack Adapter

Creating feature contract configurations is only the first step. If a new feature introduces custom databases, specialized API routes, specific React layouts, or unique integration glue, **you must adapt the Stack Adapters** (e.g., the `NextJsSupabaseAdapter` inside `composition-engine/stacks/nextjs-supabase`) to handle these elements.

### How Stack Adapters Work

A Stack Adapter implements the `StackAdapter` interface:

```typescript
export interface StackAdapter {
  stackId: string;
  generate(plan: CompositionPlan, options?: GenerateOptions): Record<string, string>;
}
```

Under v0.2, Stack Adapters delegate code generation to **Artifact-Grouped Sub-Generators** located directly within the stack package (such as `composition-engine/stacks/nextjs-supabase/src/generators/`):

- **`database/`**: Tables, foreign keys, indexes, row level security policies, flat Supabase migrations and static row types, generated from `plan.database` (see below).
- **`api.ts`**: API route definitions. A route without a generator is an error (`UnsupportedContractError`); there is no generic fallback.
- **`ui.ts`**: Page structures, navigation screens, and custom components.
- **`navigation.ts`**: Hierarchical navigation configs.
- **`workspace.ts`**: Development environments and startup workspaces.
- **`events.ts`**: Inter-feature events definitions.
- **`extensions.ts`**: Security lists and extension point configurations.

The generator passes a merged and deduplicated `CompositionPlan` to the adapter, containing aggregated abstract artifacts:

- `plan.database` - Database entities and fields
- `plan.api` - API route definitions
- `plan.ui` - React components, pages, and route endpoints
- `plan.navigation` - Hierarchical navigation item configs
- `plan.events` - Global event definitions
- `plan.permissions` - Permission role strings
- `plan.migrations` - Ordered feature-specific database migration references
- `plan.extensionPoints` - Dynamic extension hooks and their contributions

### Integrating Your New Feature in the Adapter

If your new feature has unique requirements not covered by the generic templates, you should update the adapter implementation in `composition-engine/stacks/nextjs-supabase/src/index.ts`:

1. **Custom Database Types/Fields:** If the new feature requires custom Postgres types or functions, update the SQL generator logic within the adapter to map these types correctly.
2. **Specific API Route Behaviors:** The adapter generates files under `app/api/` based on the API routes listed in the plan. If your route handlers need specific middleware, third-party SDK clients, or environment-variable bindings, ensure the generator writes the correct imports and handler bodies.
3. **Specific UI Components & Pages:** The adapter translates UI artifacts into page components or custom templates. If your feature relies on specialized Tailwind styles, icons, or specific components, update the React templates in the adapter or register them as standard exports in the generated application.
4. **Custom Database Migrations:** Tables are generated from entities; do not write `CREATE TABLE` by hand. Raw SQL is only for things entities cannot express (for example an extension such as `pg_trgm`). Declare it as a migration module with its SQL content; a migration without content fails the build. Raw migrations run before the generated tables.

---

## 5. Entities, Schema and Access Rules

Entities declared in `contract.yaml` are the single source of truth for the database. The Supabase generator turns them into tables, foreign keys, indexes, row level security (RLS) policies and TypeScript row types. Do not add hand-written `CREATE TABLE` SQL for entities.

### Field options

| Option              | Meaning                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `type`              | `uuid`, `string`, `text`, `integer`, `float`, `boolean`, `timestamp`, `json` (unknown types fail the build)                   |
| `required`          | `NOT NULL`                                                                                                                    |
| `primaryKey`        | Part of the primary key. Without any flag, a field named `id` is the key. Several flagged fields form a composite key         |
| `generate`          | `uuid` (`gen_random_uuid()`), `now` (`now()`), `auth-user` (`auth.uid()`)                                                     |
| `default`           | Literal default value                                                                                                         |
| `unique`, `indexed` | `UNIQUE` constraint, secondary index. References and the access field are indexed automatically                               |
| `references`        | `{ entity, column?, onDelete? }` for another entity, or `{ external: 'auth.users', ... }` for a table outside the composition |

### Access rules

Each entity can declare one `access` rule. An entity without one is private: RLS is enabled and no policy exists, so only the service role can read it.

| Scope                | Visible and writable for                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenant` + `field`   | Members of the organization referenced by `field`. Add `via: Parent` when the field references a parent entity that itself has a direct tenant scope |
| `owner` + `field`    | The user whose id is stored in `field` (must reference `Profile`)                                                                                    |
| `authenticated-read` | Every signed-in user may read, nobody may write                                                                                                      |
| `private`            | Nobody except the service role                                                                                                                       |

`writes` narrows write access for `tenant` and `owner`: `members` (default, insert/update/delete), `insert-only` (append-only, for example audit logs) or `server-only` (reads only; writes need the service role, for example memberships or billing data).

Tenant rules need the `organizations` feature (entities `Organization` and `Membership`). The generator validates all of this and names the entity and feature that is wrong.

### Conventions

- Tables and columns are `snake_case` (`StripeCustomer.organizationId` is `stripe_customer.organization_id`). Row types in `types/database.ts` use the column names, so API responses are `snake_case`.
- Migrations are flat and timestamp-prefixed: `supabase/migrations/<timestamp>_<name>.sql`. Raw feature migrations come first, then one file per entity in dependency order, then RLS helpers, policies and the `auth.users` to `profile` trigger.
- Generated migrations only create (`CREATE TABLE IF NOT EXISTS`). Changing an entity later does not alter an existing database yet (see known limitations).

### Checklist for a new feature

1. `pnpm build` and `pnpm build:example` regenerate the examples; commit them.
2. `pnpm test` runs the generated migrations on PostgreSQL (PGlite), checks RLS behaviour, and checks that every table, column and `fetch` target used by the generated app exists.
3. `pnpm verify:examples` type-checks and builds the generated apps. CI runs both.
