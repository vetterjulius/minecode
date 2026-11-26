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
| `tests/`             | Tests of the evaluation tooling itself                          |

Generated applications from runs are artifacts of a run and are stored outside the repository (or under `runs/<id>/artifact/`, which is git-ignored) and referenced by hash.

## Status

Design and protocol only. No task has been run; nothing here is a result.
