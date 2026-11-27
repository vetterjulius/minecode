const CLIENT_ONLY_PATTERN =
  /\b(useState|useEffect|useLayoutEffect|useRef|useReducer|useContext|useCallback|useMemo|useRouter|usePathname|useSearchParams)\b|\bon(Click|Change|Submit|Input|KeyDown|KeyUp|Blur|Focus)=/;

const DIRECTIVE_PATTERN = /^\s*(['"])use client\1;?/;

export function requiresClientDirective(source: string): boolean {
  return CLIENT_ONLY_PATTERN.test(source) && !DIRECTIVE_PATTERN.test(source);
}

export function ensureUseClientDirective(source: string): string {
  if (!requiresClientDirective(source)) {
    return source;
  }
  return `"use client";\n\n${source}`;
}

export function ensureUseClientDirectives(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    result[path] = ensureUseClientDirective(content);
  }
  return result;
}
