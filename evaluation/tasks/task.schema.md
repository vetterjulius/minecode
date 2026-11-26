# Task format

A task is one directory `tasks/<id>/` with:

- `task.yaml`: `id`, `tier` (`in-catalog`, `near-catalog`, `out-of-catalog`), `requirement` (natural language, what the agent sees), `followUp` (second requirement for H4), `limits` (turns, minutes).
- `acceptance/`: hidden acceptance suite, not given to the agent. It talks to the application through HTTP and the database only.
- `review.md`: name of the independent reviewer and their notes on bias towards Minecode feature names.

Tasks are frozen (tagged in git) before any run. The requirement text must not use Minecode vocabulary (feature ids, "blueprint", "contract").
