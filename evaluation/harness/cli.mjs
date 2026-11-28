#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadTask, validateTaskDir } from './lib/task.mjs';
import { newRecord, readRecord, validateRecord, writeRecord } from './lib/record.mjs';
import { scoreWorkspace } from './lib/score.mjs';
import { diffWorkspaces } from './lib/diff.mjs';
import { analyzeRecords } from './lib/analyze.mjs';

const USAGE = `Usage: node evaluation/harness/cli.mjs <command>

  validate-tasks [tasksDir]                       check all frozen tasks (ids starting with _ are templates)
  new-run --task <dir> --condition A|B|C --tool <name> --model <name> --out <record.json>
  score <record.json> --workspace <dir> [--build] run the oracles, write results into the record
  follow-up <record.json> --before <dir> --after <dir>
  validate-records [runsDir]                      check all run records
  analyze [runsDir] [--treatment B]               per-tool summary and paired comparisons (JSON)
`;

function flags(argv) {
  const positional = [];
  const named = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) named[key] = true;
      else named[key] = argv[++i];
    } else positional.push(argv[i]);
  }
  return { positional, named };
}

const recordFiles = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => path.join(dir, f))
    : [];

function need(value, name) {
  if (typeof value !== 'string') throw new Error(`--${name} is required`);
  return value;
}

export async function main(argv) {
  const [command, ...rest] = argv;
  const { positional, named } = flags(rest);

  switch (command) {
    case 'validate-tasks': {
      const dir = positional[0] ?? 'evaluation/tasks';
      const ids = fs.existsSync(dir)
        ? fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
        : [];
      let bad = 0;
      for (const entry of ids) {
        const problems = validateTaskDir(path.join(dir, entry.name));
        problems.forEach((p) => console.error(`${entry.name}: ${p}`));
        bad += problems.length;
      }
      console.log(`${ids.length} task(s) checked, ${bad} problem(s)`);
      return bad === 0 ? 0 : 1;
    }
    case 'new-run': {
      const taskDir = need(named.task, 'task');
      const task = loadTask(taskDir);
      const record = newRecord({
        task: task.id,
        condition: need(named.condition, 'condition'),
        tool: need(named.tool, 'tool'),
        model: need(named.model, 'model'),
        limits: task.limits,
      });
      const problems = validateRecord(record);
      if (problems.length) throw new Error(problems.join('; '));
      writeRecord(need(named.out, 'out'), record);
      return 0;
    }
    case 'score': {
      const file = positional[0];
      const record = readRecord(file);
      const scored = await scoreWorkspace(record, need(named.workspace, 'workspace'), {
        build: named.build === true,
      });
      const problems = validateRecord(scored);
      if (problems.length) throw new Error(problems.join('; '));
      writeRecord(file, scored);
      console.log(JSON.stringify(scored.oracles));
      return 0;
    }
    case 'follow-up': {
      const file = positional[0];
      const record = readRecord(file);
      const { diffLines, filesTouched } = diffWorkspaces(
        need(named.before, 'before'),
        need(named.after, 'after')
      );
      record.followUp = { ...record.followUp, diffLines, filesTouched };
      writeRecord(file, record);
      console.log(JSON.stringify(record.followUp));
      return 0;
    }
    case 'validate-records': {
      const files = recordFiles(positional[0] ?? 'evaluation/runs');
      let bad = 0;
      for (const f of files) {
        const problems = validateRecord(readRecord(f));
        problems.forEach((p) => console.error(`${path.basename(f)}: ${p}`));
        bad += problems.length;
      }
      console.log(`${files.length} record(s) checked, ${bad} problem(s)`);
      return bad === 0 ? 0 : 1;
    }
    case 'analyze': {
      const records = recordFiles(positional[0] ?? 'evaluation/runs').map(readRecord);
      console.log(
        JSON.stringify(analyzeRecords(records, { treatment: named.treatment ?? 'B' }), null, 2)
      );
      return 0;
    }
    default:
      console.error(USAGE);
      return command ? 1 : 0;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  );
}
