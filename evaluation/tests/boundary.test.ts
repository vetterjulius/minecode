import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
// @ts-expect-error plain JavaScript module without type declarations
import { findViolations } from '../../scripts/check-evaluation-boundary.js';

const PACKAGE = ['@minecode', 'composer'].join('/');
let root: string;
const write = (rel: string, content: string) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-boundary-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('evaluation boundary', () => {
  test('test_FindViolations_CleanLayout_ReturnsNothing', () => {
    write('composition-engine/packages/core/src/a.ts', 'export const a = 1;\n');
    write('evaluation/runner/run.ts', "import fs from 'node:fs';\n");
    expect(findViolations(root)).toEqual([]);
  });

  test('test_FindViolations_FrameworkMentionsEvaluation_IsReported', () => {
    write(
      'composition-engine/packages/core/src/a.ts',
      "import x from '../../../../evaluation/x';\n"
    );
    expect(findViolations(root)).toHaveLength(1);
  });

  test('test_FindViolations_EvaluationImportsFrameworkPackage_IsReported', () => {
    write(
      'evaluation/runner/run.ts',
      `import { Composer } from '${PACKAGE}';
`
    );
    expect(findViolations(root)[0]).toContain('use the CLI or MCP server');
  });

  test('test_FindViolations_EvaluationRelativeImportIntoFramework_IsReported', () => {
    write('composition-engine/packages/core/src/a.ts', 'export const a = 1;\n');
    write(
      'evaluation/runner/run.ts',
      "import { a } from '../../composition-" + "engine/packages/core/src/a.js';\n"
    );
    expect(findViolations(root)).toHaveLength(1);
  });

  test('test_FindViolations_GeneratedExamplesMayMentionAnything_AreIgnored', () => {
    write('composition-engine/examples/app/page.tsx', '// see evaluation/ notes\n');
    expect(findViolations(root)).toEqual([]);
  });

  test('test_FindViolations_RealRepository_HasNoViolations', () => {
    expect(findViolations(path.resolve(__dirname, '../..'))).toEqual([]);
  });
});
