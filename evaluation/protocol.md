# Run protocol for free-tier tools

Free tiers (for example Google AI Studio, Antigravity, GitHub Copilot free, other chat or agent tools) rarely expose token counts or an API. The protocol therefore measures effort and outcome in terms a person can observe and record, and keeps everything else identical across conditions.

## Fixed per run

- Tool, model name and version as shown by the tool, date and time, region if shown.
- Condition: A (free), B (with Minecode), C (starter template). Conditions are assigned by a pre-generated random order, not by choice.
- Task id and the exact task text from `tasks/`. The text is pasted verbatim; the operator adds nothing.
- Condition B only: the operator gives the agent access to Minecode through the CLI or MCP server and a one-paragraph fixed description of it. Nothing task-specific.
- Condition C only: the starter template named in the research design.

## Interaction rules

- Turn budget and time budget are fixed per task (default 10 turns, 60 minutes) and recorded as limits.
- A turn is one message from the operator. The operator may only (a) paste verbatim error output from build or test commands, (b) answer "continue" or "proceed", or (c) accept a tool permission prompt. No hints, no code edits by the operator.
- The run ends when the agent declares completion, the budget is exhausted, or the tool refuses further work.

## Recorded (see `runs/run-record.schema.md`)

Prompts count, turns, wall-clock minutes, whether a limit was hit, tool errors, and a copy of the final workspace. If the tool shows usage (tokens, credits, quota percentage) it is copied as is, never estimated.

## Scored afterwards, without the operator's judgement

Automatic oracles run on the saved workspace by the harness: build and type-check, migration apply, tenant isolation, hidden acceptance suite, static security rules, follow-up change (H4). Results are written to the run record by script. A sample of runs is re-scored by a second person to detect harness bugs.

## Why this stays valid with free tiers

- Quotas and model versions can change between runs: every run records date and model name, and conditions are interleaved in time rather than run in blocks.
- Cost in money (H2) is replaced by observable effort (turns, minutes, interventions) unless a tool reports usage. Claims about money are only made where usage was reported.
- Tools differ in capability. Results are always reported per tool, never pooled across tools without a model for the tool effect.
