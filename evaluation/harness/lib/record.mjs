import fs from 'node:fs';

export const CONDITIONS = ['A', 'B', 'C'];
export const ORACLE_FIELDS = [
  'builds',
  'migrationsApply',
  'tenantLeaks',
  'acceptancePassed',
  'acceptanceTotal',
  'securityFindings',
];

export function newRecord({ task, condition, tool, model, limits, startedAt }) {
  return {
    task,
    condition,
    tool,
    model,
    startedAt: startedAt ?? new Date().toISOString(),
    limits,
    observed: { turns: 0, minutes: 0, limitHit: false, toolErrors: 0, reportedUsage: null },
    artifactSha256: null,
    oracles: Object.fromEntries(ORACLE_FIELDS.map((f) => [f, null])),
    details: {},
    followUp: { diffLines: null, filesTouched: null, regressions: null },
  };
}

const isNum = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const isNullOr = (x, test) => x === null || test(x);

/** Returns a list of problems; empty means the record is well-formed. */
export function validateRecord(r) {
  const problems = [];
  const need = (cond, msg) => cond || problems.push(msg);
  need(typeof r?.task === 'string' && r.task !== '', 'task must be a non-empty string');
  need(CONDITIONS.includes(r?.condition), `condition must be one of ${CONDITIONS.join(', ')}`);
  need(typeof r?.tool === 'string' && r.tool !== '', 'tool must be a non-empty string');
  need(typeof r?.model === 'string' && r.model !== '', 'model must be a non-empty string');
  need(!Number.isNaN(Date.parse(r?.startedAt)), 'startedAt must be an ISO timestamp');
  need(
    isNum(r?.limits?.turns) && isNum(r?.limits?.minutes),
    'limits.turns and limits.minutes must be numbers'
  );
  const o = r?.observed ?? {};
  need(isNum(o.turns) && isNum(o.minutes), 'observed.turns and observed.minutes must be numbers');
  need(typeof o.limitHit === 'boolean', 'observed.limitHit must be boolean');
  need(isNum(o.toolErrors), 'observed.toolErrors must be a number');
  need(
    o.reportedUsage === null || typeof o.reportedUsage === 'object',
    'observed.reportedUsage must be null or an object'
  );
  need(
    isNullOr(r?.artifactSha256, (x) => /^[0-9a-f]{64}$/.test(x)),
    'artifactSha256 must be null or a sha256 hex string'
  );
  const q = r?.oracles ?? {};
  for (const f of ['builds', 'migrationsApply'])
    need(
      isNullOr(q[f], (x) => typeof x === 'boolean'),
      `oracles.${f} must be null or boolean`
    );
  for (const f of ['tenantLeaks', 'acceptancePassed', 'acceptanceTotal', 'securityFindings']) {
    need(isNullOr(q[f], isNum), `oracles.${f} must be null or a number`);
  }
  if (q.acceptancePassed !== null && q.acceptanceTotal !== null) {
    need(
      q.acceptancePassed <= q.acceptanceTotal,
      'oracles.acceptancePassed cannot exceed acceptanceTotal'
    );
  }
  const f = r?.followUp ?? {};
  for (const k of ['diffLines', 'filesTouched', 'regressions'])
    need(isNullOr(f[k], isNum), `followUp.${k} must be null or a number`);
  return problems;
}

export function readRecord(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeRecord(file, record) {
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
}
