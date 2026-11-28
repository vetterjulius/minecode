# Stacks

A stack turns the composed plan (entities, API contracts, permissions, extension points) into files. The engine
itself knows nothing about Next.js, Supabase or OpenAPI; it only talks to the `StackAdapter` interface from
`@minecode/core`.

## What a stack provides

| Member        | Purpose                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| `stackId`     | Id used in `app.yaml` (`stack.id`) and in a feature's `metadata.stack` list.               |
| `description` | Shown by `minecode stacks`.                                                                |
| `behaviors`   | Behavior ids the stack implements, or `'*'` if it accepts any (e.g. documentation stacks). |
| `layout`      | Where files go: `skeleton`, `resolve(path)`, `isScaffold(path)`, `isMigration(path)`.      |
| `generate()`  | Returns `{ virtualPath: content }` for the plan.                                           |

The generator resolves the stack from the registry, fails **before writing anything** if a feature needs a behavior
the stack lacks (`StackSupportError`, naming the feature), and applies lock, ownership and conflict rules uniformly
through the layout. Scaffold files are written once; migration files are counted in `app.lock.json`.

## Shipped stacks

- `nextjs-supabase` (default): full application with database migrations, RLS, route handlers and pages.
- `openapi`: an OpenAPI 3.1 document (`openapi.json`) derived from entities and API contracts. No scaffolds or
  migrations; behaviors appear as opaque operations with `x-behavior`, permissions as `x-permission`.

Run `minecode stacks` to list them. A feature is usable with a stack once its `metadata.stack` includes the stack id
(or `'*'`).

## Adding a stack

Implement `StackAdapter`, register it in a `StackRegistry` and pass the registry to `ApplicationGenerator`. Distribution
Feature libraries are distributed as npm packages, see below.

## Feature packages (npm)

A feature library is an ordinary npm package whose `package.json` has a `minecode` field:

```json
{
  "name": "acme-polls",
  "minecode": {
    "features": "features",
    "stacks": { "nextjs-supabase": "./dist/nextjs.js" }
  }
}
```

- `features`: directory with feature folders (`feature.yaml`, `contract.yaml`, ...), exactly like the built-in ones.
- `stacks`: per stack, a module exporting `behaviors`, a map from behavior id (as named in the package's contracts)
  to that stack's builder. For `nextjs-supabase` the builder type is `BehaviorBuilder` from
  `@minecode/nextjs-supabase`.

The CLI and MCP server look at the (dev)dependencies of the `package.json` next to the blueprint (MCP:
`MINECODE_PROJECT_DIR`, default cwd), add the packages' feature directories to the registry and register their
behaviors with the matching stacks. Rules:

- A package behavior may not reuse the id of a built-in behavior.
- A feature that names a behavior the chosen stack does not have fails before anything is written.
- Features are declared compatible with a stack through `metadata.stack`; a package that ships no module for a stack
  simply cannot be used with it.
- Stack modules are executed code. Install feature packages only from sources you trust, as with any npm dependency.

## MCP tools for agents

The MCP server is the interface an agent uses (the evaluation treats it as a black box). Besides the registry tools
(`list_features`, `get_feature`, `search_features`, `get_feature_schema`) and the blueprint tools (`validate_blueprint`,
`resolve_blueprint`, `compose_application`) it offers knowledge and planning tools:

| Tool                  | Purpose                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `get_authoring_guide` | Workflow, blueprint format and the rules of the generated app. Meant to be read first.        |
| `list_stacks`         | Available target stacks and the behaviors each implements.                                    |
| `find_provider`       | Which features provide an entity, capability, permission, api, behavior or hook.              |
| `plan_application`    | Dry run: entities, endpoints, permissions, extension hooks and unsupported behaviors; no I/O. |

`validate_blueprint` also returns `suggestions` ("did you mean") for unknown feature ids.
