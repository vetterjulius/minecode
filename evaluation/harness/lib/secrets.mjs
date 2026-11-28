import fs from 'node:fs';
import path from 'node:path';
import { walkFiles } from './files.mjs';

const RULES = [
  { id: 'stripe-live-key', re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}\b/ },
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    id: 'jwt-service-role',
    re: /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  { id: 'anthropic-key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { id: 'openai-key', re: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/ },
];
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|sql|env|md|txt|html|css|toml)$|(^|\/)\.env[^/]*$/;

/** Looks for committed credentials. Placeholders such as sk_test_... or your-key do not match. */
export function scanSecrets(workspace) {
  const findings = [];
  for (const file of walkFiles(workspace)) {
    if (!TEXT.test(file)) continue;
    const text = fs.readFileSync(path.join(workspace, file), 'utf8');
    for (const rule of RULES) {
      if (rule.re.test(text)) findings.push({ rule: rule.id, file });
    }
  }
  return findings;
}
