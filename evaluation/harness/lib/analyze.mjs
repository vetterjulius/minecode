import { mean, pairedComparison } from './stats.mjs';

const ratio = (r) =>
  r.oracles.acceptancePassed !== null && r.oracles.acceptanceTotal
    ? r.oracles.acceptancePassed / r.oracles.acceptanceTotal
    : null;
const flag = (key) => (r) => (r.oracles[key] === null ? null : r.oracles[key] ? 1 : 0);

export const METRICS = {
  builds: flag('builds'),
  migrationsApply: flag('migrationsApply'),
  acceptanceRate: ratio,
  securityFindings: (r) => r.oracles.securityFindings,
  turns: (r) => r.observed.turns,
  minutes: (r) => r.observed.minutes,
  followUpDiffLines: (r) => r.followUp.diffLines,
};

/**
 * Per tool: per-condition descriptive means, then the paired comparisons of treatment against
 * each other condition. Results are never pooled across tools (protocol: tool effects differ).
 */
export function analyzeRecords(records, { treatment = 'B', options } = {}) {
  const tools = [...new Set(records.map((r) => r.tool))].sort();
  return tools.map((tool) => {
    const own = records.filter((r) => r.tool === tool);
    const conditions = [...new Set(own.map((r) => r.condition))].sort();
    const descriptive = Object.fromEntries(
      conditions.map((c) => {
        const group = own.filter((r) => r.condition === c);
        const row = { runs: group.length };
        for (const [name, metric] of Object.entries(METRICS)) {
          const values = group.map(metric).filter((v) => v !== null && v !== undefined);
          row[name] = values.length ? mean(values) : null;
        }
        return [c, row];
      })
    );
    const comparisons = {};
    for (const other of conditions.filter((c) => c !== treatment)) {
      if (!conditions.includes(treatment)) break;
      comparisons[`${treatment} vs ${other}`] = Object.fromEntries(
        Object.entries(METRICS).map(([name, metric]) => [
          name,
          pairedComparison(own, other, treatment, metric, options),
        ])
      );
    }
    return { tool, descriptive, comparisons };
  });
}
