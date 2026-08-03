# Monorepo Architecture and Package Boundaries

To prevent architectural drift, the **Minecode** system enforces strict layer boundaries and a unidirectional dependency flow.

## Directory Structure

The repository is structured as a TypeScript/Node.js monorepo under `composition-engine/`:

```
composition-engine/
├── apps/
│   ├── cli/             # CLI interface for human developers
│   └── mcp-server/      # MCP Server interface for AI agents
├── packages/
│   ├── core/            # Core domain models, interfaces, and base classes
│   ├── schemas/         # YAML schemas, parser and validator definitions
│   ├── registry/        # Feature Registry and discoverability layer
│   ├── resolver/        # Dependency resolver and feature graph builder
│   ├── composer/        # Feature composition engine
│   └── generator/       # Code generator/template adapter for target stacks
├── features/
│   ├── builtin/         # Maintained core capabilities (Authentication, etc.)
│   └── experimental/    # Optional or community features in testing
├── stacks/
│   └── nextjs-supabase/ # Stack-specific adapters and modules
└── examples/            # Example blueprints and fully-composed reference apps
```

## Dependency Direction

To ensure modularity and clean separation of concerns, packages should only depend on layers below them. **No circular dependencies are allowed.**

The expected dependency flow is:

```
      core
       ↓
    schemas
       ↓
    registry
       ↓
    resolver
       ↓
    composer
       ↓
   generator
```

_Note: The CLI app (`@minecode/cli`) and MCP Server app (`@minecode/mcp-server`) reside at the highest level and consume the layers underneath._

## Package Responsibilities

### `packages/core`

- **Ownership:** Shared domain types, Base interfaces (`Feature`, `Contract`, `Dependency`), domain models, and interfaces. It officially owns all shared types within the monorepo.
- **Rules:** Cannot depend on any other packages in the monorepo.

### `packages/schemas`

- **Ownership:** Blueprint, Feature, Contract, and Dependency YAML parsing, schemas, and structural validation.
- **Rules:** Can only depend on `@minecode/core`.

### `packages/registry`

- **Ownership:** Discoverability, searching, and managing features inside `features/` directory.
- **Rules:** Can only depend on `@minecode/schemas` and `@minecode/core`.

### `packages/resolver`

- **Ownership:** Resolving deep dependencies, compatibility checking, resolving version ranges, and building a deterministic `FeatureGraph`.
- **Rules:** Can only depend on `@minecode/registry` and below.

### `packages/composer`

- **Ownership:** Mapping a resolved feature graph and blueprint into a deterministic `CompositionPlan` consisting of structured, merged abstract artifacts (`database`, `api`, `ui`, `navigation`, `events`, `permissions`, `migrations`, and `extensionPoints`) and handling extension points contributions.
- **Rules:** Can only depend on `@minecode/resolver` and below.

### `packages/generator`

- **Ownership:** Taking a Composition Plan and physically writing files, initializing target templates, and formatting generated applications.
- **Rules:** Can only depend on `@minecode/composer` and below.
