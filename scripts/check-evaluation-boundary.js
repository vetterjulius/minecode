import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The framework (composition-engine) and the evaluation (evaluation/) must stay separate so
 * that results do not depend on framework internals and the framework cannot be tuned to the
 * evaluation. Two rules:
 *  1. The framework never mentions or imports the evaluation.
 *  2. The evaluation reaches the framework only as a black box (CLI or MCP server): no imports
 *     of @minecode/* packages and no relative imports into composition-engine.
 */
const CODE = /\.(ts|tsx|js|mjs|cjs|json|ya?ml)$/;
const SKIP = new Set(['node_modules', 'dist', '.next', 'coverage']);
// Generated example apps are build output, not framework code.
const FRAMEWORK_SKIP = new Set(['examples']);
const IMPORT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;

function walk(dir, skip) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name) || skip.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, skip) : CODE.test(entry.name) ? [full] : [];
  });
}

export function findViolations(root) {
  const violations = [];
  for (const file of walk(path.join(root, 'composition-engine'), FRAMEWORK_SKIP)) {
    const text = fs.readFileSync(file, 'utf8');
    if (/(^|[^\w-])evaluation\//.test(text) || /@minecode\/evaluation/.test(text)) {
      violations.push(`${path.relative(root, file)}: framework refers to the evaluation`);
    }
  }
  for (const file of walk(path.join(root, 'evaluation'), new Set())) {
    if (!/\.(ts|tsx|js|mjs|cjs)$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(IMPORT)) {
      const target = match[1];
      const resolved = target.startsWith('.') ? path.resolve(path.dirname(file), target) : '';
      const intoFramework = resolved.startsWith(path.join(root, 'composition-engine'));
      if (target.startsWith('@minecode/') || intoFramework) {
        violations.push(
          `${path.relative(root, file)}: evaluation imports framework code ('${target}'); use the CLI or MCP server`
        );
      }
    }
  }
  return violations;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const violations = findViolations(process.cwd());
  if (violations.length > 0) {
    console.error(
      '[ERROR] Evaluation boundary violated:\n' + violations.map((v) => `  - ${v}`).join('\n')
    );
    process.exit(1);
  }
  console.log('[SUCCESS] Framework and evaluation are separated.');
}
