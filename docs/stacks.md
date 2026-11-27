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
of stacks and features as npm packages is the next step.
