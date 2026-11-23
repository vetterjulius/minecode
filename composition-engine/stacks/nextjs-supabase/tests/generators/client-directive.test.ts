import { test, expect } from 'vitest';
import {
  ensureUseClientDirective,
  ensureUseClientDirectives,
  requiresClientDirective,
} from '../../src/generators/client-directive.js';

test('test_RequiresClientDirective_SourceWithUseState_ReturnsTrue', () => {
  expect(requiresClientDirective(`import { useState } from 'react';`)).toBe(true);
});

test('test_RequiresClientDirective_SourceWithEventHandlerOnly_ReturnsTrue', () => {
  expect(requiresClientDirective('<button onClick={go}>x</button>')).toBe(true);
});

test('test_RequiresClientDirective_StaticServerComponent_ReturnsFalse', () => {
  expect(requiresClientDirective('export default function P() { return <p>hi</p>; }')).toBe(false);
});

test('test_RequiresClientDirective_AlreadyHasDoubleQuoteDirective_ReturnsFalse', () => {
  expect(requiresClientDirective(`"use client";\nimport { useState } from 'react';`)).toBe(false);
});

test('test_RequiresClientDirective_AlreadyHasSingleQuoteDirective_ReturnsFalse', () => {
  expect(requiresClientDirective(`'use client'\nconst [a] = useState(1);`)).toBe(false);
});

test('test_EnsureUseClientDirective_SourceWithHooks_PrependsDirectiveOnFirstLine', () => {
  const out = ensureUseClientDirective(`import { useEffect } from 'react';`);
  expect(out.startsWith('"use client";\n\n')).toBe(true);
});

test('test_EnsureUseClientDirective_CalledTwice_IsIdempotent', () => {
  const once = ensureUseClientDirective(`import { useRef } from 'react';`);
  expect(ensureUseClientDirective(once)).toBe(once);
});

test('test_EnsureUseClientDirective_ServerOnlySource_ReturnsUnchanged', () => {
  const src = 'export const x = 1;';
  expect(ensureUseClientDirective(src)).toBe(src);
});

test('test_EnsureUseClientDirectives_MixedFiles_OnlyClientFilesChanged', () => {
  const out = ensureUseClientDirectives({
    'app/a/page.tsx': 'const [s] = useState(0);',
    'app/b/page.tsx': 'export default () => null;',
  });
  expect(out['app/a/page.tsx'].startsWith('"use client";')).toBe(true);
  expect(out['app/b/page.tsx']).toBe('export default () => null;');
});
