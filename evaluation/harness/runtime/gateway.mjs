import http from 'node:http';
import { verifyJwt } from './jwt.mjs';

/**
 * The part of Supabase's API gateway an application needs: /rest/v1 goes to PostgREST and
 * /auth/v1/user answers from a verified JWT (this stands in for GoTrue, which cannot run
 * everywhere). Sign-up and token refresh are intentionally not implemented; tests mint
 * sessions directly.
 */
export function startGateway({ postgrestPort, jwtSecret, port = 0 }) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://gateway');
    if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
      const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      const claims = verifyJwt(token, jwtSecret);
      if (!claims || claims.role !== 'authenticated' || !claims.sub) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          id: claims.sub,
          aud: 'authenticated',
          role: 'authenticated',
          email: claims.email ?? null,
          app_metadata: {},
          user_metadata: {},
          created_at: new Date(0).toISOString(),
        })
      );
      return;
    }
    if (url.pathname.startsWith('/rest/v1/') || url.pathname === '/rest/v1') {
      const upstream = http.request(
        {
          host: '127.0.0.1',
          port: postgrestPort,
          method: req.method,
          path: url.pathname.replace(/^\/rest\/v1/, '') + url.search,
          headers: { ...req.headers, host: `127.0.0.1:${postgrestPort}` },
        },
        (up) => {
          res.writeHead(up.statusCode ?? 502, up.headers);
          up.pipe(res);
        }
      );
      upstream.on('error', (error) => {
        res.writeHead(502, { 'content-type': 'text/plain' });
        res.end(String(error));
      });
      req.pipe(upstream);
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ msg: 'not found' }));
  });
  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () =>
      resolve({
        port: server.address().port,
        close: () => new Promise((done) => server.close(() => done())),
      })
    )
  );
}
