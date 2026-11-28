import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

export const TIERS = ['in-catalog', 'near-catalog', 'out-of-catalog'];

/**
 * The agent must see requirements, not Minecode vocabulary: otherwise tasks favour the treatment.
 * Static list on purpose; the evaluation does not read the framework's feature catalog.
 */
export const FORBIDDEN_TERMS = [
  'minecode',
  'blueprint',
  'contract',
  'feature id',
  'registry',
  'composition engine',
  'mcp',
];

export function validateTaskObject(task, dir = '') {
  const problems = [];
  const need = (cond, msg) => cond || problems.push(msg);
  need(
    typeof task?.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(task.id),
    'id must be a lowercase slug'
  );
  if (dir)
    need(
      path.basename(dir) === task?.id,
      `id '${task?.id}' must match directory name '${path.basename(dir)}'`
    );
  need(TIERS.includes(task?.tier), `tier must be one of ${TIERS.join(', ')}`);
  for (const key of ['requirement', 'followUp']) {
    need(
      typeof task?.[key] === 'string' && task[key].trim().length >= 20,
      `${key} must be a text of at least 20 characters`
    );
    const text = String(task?.[key] ?? '').toLowerCase();
    for (const term of FORBIDDEN_TERMS) {
      if (text.includes(term)) problems.push(`${key} uses Minecode vocabulary ('${term}')`);
    }
  }
  need(
    Number.isInteger(task?.limits?.turns) && task.limits.turns > 0,
    'limits.turns must be a positive integer'
  );
  need(
    Number.isInteger(task?.limits?.minutes) && task.limits.minutes > 0,
    'limits.minutes must be a positive integer'
  );
  return problems;
}

export function validateTaskDir(dir) {
  const file = path.join(dir, 'task.yaml');
  if (!fs.existsSync(file)) return [`${dir}: task.yaml is missing`];
  const problems = validateTaskObject(loadYaml(fs.readFileSync(file, 'utf8')), dir);
  if (!fs.existsSync(path.join(dir, 'review.md')))
    problems.push('review.md (independent review) is missing');
  if (!fs.existsSync(path.join(dir, 'acceptance')))
    problems.push('acceptance/ (hidden suite) is missing');
  return problems;
}

export function loadTask(dir) {
  return loadYaml(fs.readFileSync(path.join(dir, 'task.yaml'), 'utf8'));
}
