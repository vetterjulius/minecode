# Evaluation

This directory holds everything needed to measure whether generating an application with Minecode beats letting an agent write it freely. It is deliberately separate from the framework in `composition-engine/`.

## Separation rules

Enforced by `pnpm check-boundaries` (part of `pnpm lint`) and its tests:

1. The framework never mentions or imports anything from `evaluation/`. It cannot be tuned to the evaluation.
2. The evaluation uses the framework only as a black box: the CLI (`minecode build`) or the MCP server. It never imports `@minecode/*` packages or framework source files. What an agent can do with Minecode is exactly what a user can do.
3. Oracles test behaviour of a running or migrated application, not Minecode's naming or file layout (for example they must not assume snake_case or a particular RLS layout). The framework's own tests may be stricter; the evaluation's oracles may not.

## Layout

| Path                 | Content                                                         |
| -------------------- | --------------------------------------------------------------- |
| `research-design.md` | Research question, hypotheses, conditions, statistics, threats  |
| `protocol.md`        | Manual run protocol for free-tier tools, what to record         |
| `tasks/`             | Frozen task definitions (`task.schema.md` describes the format) |
| `runs/`              | One record per run (`run-record.schema.md`); results, not code  |
| `harness/`           | Scoring tooling: oracles, run records, task checks, statistics  |
| `tests/`             | Tests of the evaluation tooling itself                          |

Generated applications from runs are artifacts of a run and are stored outside the repository (or under `runs/<id>/artifact/`, which is git-ignored) and referenced by hash.

## Status

The harness exists; no task has been written or run, and nothing here is a result.

## Harness

`pnpm eval <command>` (plain Node, no build step; it uses PGlite and js-yaml only, never `@minecode/*`):

| Command                                                   | Purpose                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `validate-tasks [dir]`                                    | Task files complete, no Minecode vocabulary in requirement text |
| `new-run --task --condition --tool --model --out`         | Create an empty run record from a task                          |
| `score <record> --workspace <dir> [--build]`              | Fill oracle fields from a saved workspace                       |
| `follow-up <record> --before <dir> --after <dir>`         | Record diff size of the follow-up change (H4)                   |
| `validate-records [dir]`, `analyze [dir] [--treatment B]` | Check records; per-tool summary, bootstrap CI, exact Wilcoxon   |

Oracles implemented now, all independent of the framework's layout:

- **migrationsApply**: every `.sql` file in the workspace, in path order, on PostgreSQL (PGlite) with Supabase-like stubs.
- **securityFindings**: tables without row level security, policies that admit everyone, committed credentials. Details are stored in `details`.
- **builds** (opt-in `--build`): the workspace's own `npm install` and `npm run build`.
- **artifactSha256**: content hash of the workspace without dependencies and build output.

### Running applications (`harness/runtime/`)

`startDataPlane` brings up Supabase's data plane on a throwaway machine: a real PostgreSQL (`initdb`/`pg_ctl`), a real PostgREST, and a small gateway that serves `/rest/v1` and answers `/auth/v1/user` from a verified JWT (a stand-in for GoTrue). `copyWorkspace`/`installAndBuild`/`startApp` build and start an application next to it, and `createUser` mints a session cookie that `@supabase/ssr` accepts. The application is reached only over HTTP, as in production, so row level security and the data API behave for real.

What it cannot do: sign-up, token refresh and storage need the full stack. Where Docker and the registries are available, `supabase start` is the closer match and the same acceptance suites can run against it. In the development sandbox the container registries are blocked, which is why this lighter plane exists.

`tests/runtime.test.ts` validates the plane against one known app (build, tenant creation, permission checks, cross-tenant reads and writes). It is skipped unless `MINECODE_EVAL_APP` points at an application workspace and `initdb`, `pg_ctl`, `psql` and `postgrest` are found (override with `INITDB`, `PG_CTL`, `PSQL`, `POSTGREST`):

```
MINECODE_EVAL_APP=composition-engine/examples/ai-workspace pnpm vitest run evaluation/tests/runtime.test.ts
```

Not implemented yet and recorded as `null` (not measured): `tenantLeaks` and the acceptance counts. They need the hidden acceptance suite of a task, which talks to a running application; the runtime above is the foundation for that suite, but the suite format and the generic leak probe are still to be designed. Until tasks exist, these fields must not be filled by hand.
