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
# Example contract
database:
  - id: 'auth:User'
    entityName: 'User'
    fields:
      - name: 'id'
        type: 'uuid'
        required: true
      - name: 'email'
        type: 'string'
        required: true
ui:
  - id: 'auth:LoginForm'
    name: 'LoginForm'
    component: 'LoginForm.tsx'
    slot: 'auth-slot'
navigation:
  - id: 'nav:dashboard'
    name: 'dashboard'
    label: 'Dashboard'
    path: '/dashboard'
    order: 1
```

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

- **`database.ts`**: Relational tables, schemas, and static database types.
- **`api.ts`**: API route definitions (generic templates and specialized feature templates like Auth or AI Chat).
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
4. **Custom Database Migrations:** If your feature relies on predefined raw database files, place the SQL files in virtual directories inside the feature directory (such as `modules/database/`), declare them under the `migrations` section of the feature's contract, and ensure the Stack Adapter copies or resolves these SQL contents during compilation.
