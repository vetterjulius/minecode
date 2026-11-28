/** Small, dependency-free statistics for paired comparisons across tasks. */

export function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Deterministic PRNG so analyses are reproducible. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Percentile bootstrap confidence interval for the mean of paired differences. */
export function bootstrapMeanCI(diffs, { iterations = 10000, level = 0.95, seed = 1 } = {}) {
  if (diffs.length === 0) return { mean: NaN, low: NaN, high: NaN };
  const rand = mulberry32(seed);
  const means = [];
  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < diffs.length; j++) sum += diffs[Math.floor(rand() * diffs.length)];
    means.push(sum / diffs.length);
  }
  means.sort((a, b) => a - b);
  const alpha = (1 - level) / 2;
  return {
    mean: mean(diffs),
    low: means[Math.floor(alpha * iterations)],
    high: means[Math.min(iterations - 1, Math.ceil((1 - alpha) * iterations) - 1)],
  };
}

/**
 * Exact two-sided Wilcoxon signed-rank test (zeros dropped, ties get average ranks).
 * Exact enumeration through a dynamic programme over doubled ranks; n up to a few hundred.
 */
export function wilcoxonSignedRank(diffs) {
  const d = diffs.filter((x) => x !== 0);
  const n = d.length;
  if (n === 0) return { n: 0, wPlus: 0, p: 1 };
  const order = d.map((x, i) => ({ a: Math.abs(x), i })).sort((x, y) => x.a - y.a);
  const rank2 = new Array(n); // doubled average ranks are integers
  for (let i = 0; i < n;) {
    let j = i;
    while (j + 1 < n && order[j + 1].a === order[i].a) j++;
    const avg2 = i + 1 + (j + 1); // 2 * mean(rank i+1 .. j+1)
    for (let k = i; k <= j; k++) rank2[order[k].i] = avg2;
    i = j + 1;
  }
  const total = rank2.reduce((a, b) => a + b, 0);
  const wPlus2 = d.reduce((s, x, i) => (x > 0 ? s + rank2[i] : s), 0);
  // number of sign assignments per doubled positive-rank sum
  let ways = new Map([[0, 1]]);
  for (const r of rank2) {
    const next = new Map(ways);
    for (const [sum, count] of ways) next.set(sum + r, (next.get(sum + r) ?? 0) + count);
    ways = next;
  }
  const all = 2 ** n;
  const center = total / 2;
  const dist = Math.abs(wPlus2 - center);
  let extreme = 0;
  for (const [sum, count] of ways) if (Math.abs(sum - center) >= dist) extreme += count;
  return { n, wPlus: wPlus2 / 2, p: Math.min(1, extreme / all) };
}

/**
 * Compares two conditions task by task: the per-task mean of `metric` under each condition,
 * then paired differences (b minus a). Tasks lacking either condition are skipped.
 */
export function pairedComparison(records, a, b, metric, options) {
  const perTask = new Map();
  for (const r of records) {
    if (r.condition !== a && r.condition !== b) continue;
    const value = metric(r);
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    const entry = perTask.get(r.task) ?? { [a]: [], [b]: [] };
    entry[r.condition].push(value);
    perTask.set(r.task, entry);
  }
  const diffs = [];
  for (const entry of perTask.values()) {
    if (entry[a].length && entry[b].length) diffs.push(mean(entry[b]) - mean(entry[a]));
  }
  return {
    tasks: diffs.length,
    diffs,
    ci: bootstrapMeanCI(diffs, options),
    wilcoxon: wilcoxonSignedRank(diffs),
  };
}
