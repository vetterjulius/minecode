import fs from 'node:fs';
import path from 'node:path';

export interface TableUsage {
  file: string;
  table: string;
  columns: { name: string; via: string }[];
}

export interface FetchUsage {
  file: string;
  url: string;
  method: string;
}

const COLUMN_CALLS =
  /\.(eq|neq|gt|gte|lt|lte|is|like|ilike|in|order|contains)\(\s*'([A-Za-z_][\w]*)'/g;
const WRITE_CALLS = /\.(insert|update|upsert)\(/g;
const IDENTIFIER = /^[A-Za-z_]\w*$/;
const SOURCE_DIRS = ['app', 'lib', 'components', 'generated'];

export function listSourceFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) found.push(full);
    }
  };
  SOURCE_DIRS.forEach((d) => walk(path.join(root, d)));
  return found.sort();
}

function statementEnd(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) {
      depth--;
      if (depth < 0) return i;
    } else if (ch === ';' && depth <= 0) return i;
  }
  return source.length;
}

function matchingClose(source: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== '\\') quote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return source.length;
}

export function topLevelKeys(objectLiteral: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let token = '';
  let inValue = false;
  const flushKey = (next: string): void => {
    const name = token.trim();
    if (!inValue && depth === 1 && IDENTIFIER.test(name) && [':', ',', '}'].includes(next)) {
      keys.push(name);
    }
    token = '';
  };
  for (let i = 0; i < objectLiteral.length; i++) {
    const ch = objectLiteral[i];
    if (quote) {
      if (ch === quote && objectLiteral[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    } else if ('([{'.includes(ch)) {
      depth++;
      token = '';
    } else if (')]}'.includes(ch)) {
      if (depth === 1) flushKey(ch);
      depth--;
      token = '';
    } else if (depth === 1 && ch === ':' && !inValue) {
      flushKey(ch);
      inValue = true;
    } else if (depth === 1 && ch === ',') {
      flushKey(ch);
      inValue = false;
    } else if (depth === 1) {
      token += ch;
    }
  }
  return keys;
}

function writeKeys(segment: string): { via: string; keys: string[]; dynamic: boolean }[] {
  const results: { via: string; keys: string[]; dynamic: boolean }[] = [];
  for (const match of segment.matchAll(WRITE_CALLS)) {
    const open = (match.index as number) + match[0].length - 1;
    const body = segment.slice(open, matchingClose(segment, open) + 1);
    const inner = body.slice(1, -1).trim();
    const literal = inner.startsWith('[') ? inner.slice(1).trim() : inner;
    if (!literal.startsWith('{')) {
      results.push({ via: match[1], keys: [], dynamic: true });
      continue;
    }
    results.push({
      via: match[1],
      keys: topLevelKeys(literal.slice(0, matchingClose(literal, 0) + 1)),
      dynamic: false,
    });
  }
  return results;
}

function selectColumns(segment: string): string[] {
  const out: string[] = [];
  for (const match of segment.matchAll(/\.select\(\s*'([^']*)'/g)) {
    for (const part of match[1].split(',').map((p) => p.trim())) {
      if (IDENTIFIER.test(part)) out.push(part);
    }
  }
  return out;
}

export function extractTableUsages(file: string, source: string): TableUsage[] {
  const usages: TableUsage[] = [];
  for (const match of source.matchAll(/(?<!storage)\.from\(\s*'([^']+)'\s*\)/g)) {
    const start = match.index as number;
    const segment = source.slice(start, statementEnd(source, start + match[0].length));
    const columns: TableUsage['columns'] = [];
    for (const call of segment.matchAll(COLUMN_CALLS)) {
      columns.push({ name: call[2], via: call[1] });
    }
    selectColumns(segment).forEach((name) => columns.push({ name, via: 'select' }));
    writeKeys(segment).forEach((w) => w.keys.forEach((name) => columns.push({ name, via: w.via })));
    usages.push({ file, table: match[1], columns });
  }
  return usages;
}

export function extractFetchUsages(file: string, source: string): FetchUsage[] {
  const usages: FetchUsage[] = [];
  for (const match of source.matchAll(/fetch\(\s*(['"`])(\/api\/[^'"`?$]*)/g)) {
    const tail = source.slice(
      (match.index as number) + match[0].length,
      (match.index as number) + 300
    );
    const method = /method:\s*['"]([A-Z]+)['"]/.exec(tail.slice(0, tail.indexOf(')') + 1 || 300));
    usages.push({ file, url: match[2].replace(/\/$/, ''), method: method ? method[1] : 'GET' });
  }
  return usages;
}

export function listApiRoutes(root: string): Map<string, string[]> {
  const routes = new Map<string, string[]>();
  const apiDir = path.join(root, 'app/api');
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'route.ts') {
        const url = '/' + path.relative(path.join(root, 'app'), dir).split(path.sep).join('/');
        const src = fs.readFileSync(full, 'utf8');
        const methods = [
          ...src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g),
        ];
        routes.set(
          url,
          methods.map((m) => m[1])
        );
      }
    }
  };
  walk(apiDir);
  return routes;
}
