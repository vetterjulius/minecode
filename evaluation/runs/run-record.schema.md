# Run record

One JSON file per run, `runs/<task>-<condition>-<n>.json`:

```json
{
  "task": "t01",
  "condition": "B",
  "tool": "name as shown by the tool",
  "model": "model name as shown by the tool",
  "startedAt": "ISO timestamp",
  "limits": { "turns": 10, "minutes": 60 },
  "observed": {
    "turns": 0,
    "minutes": 0,
    "limitHit": false,
    "toolErrors": 0,
    "reportedUsage": null
  },
  "artifactSha256": "hash of the saved workspace",
  "oracles": {
    "builds": null,
    "migrationsApply": null,
    "tenantLeaks": null,
    "acceptancePassed": null,
    "acceptanceTotal": null,
    "securityFindings": null
  },
  "followUp": { "diffLines": null, "filesTouched": null, "regressions": null }
}
```

Oracle fields are filled by the harness script, never by hand. `null` means not measured.
