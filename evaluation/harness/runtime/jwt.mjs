import crypto from 'node:crypto';

const b64 = (input) => Buffer.from(input).toString('base64url');

/** HS256 JWT, the algorithm Supabase uses for its anon, service and user tokens. */
export function signJwt(payload, secret) {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

/** Returns the payload of a valid, unexpired token, otherwise null. */
export function verifyJwt(token, secret) {
  const [head, body, sig] = String(token ?? '').split('.');
  if (!head || !body || !sig) return null;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${head}.${body}`)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) return null;
  return payload;
}
