// Serves the in-browser demo API (src/services/browserApi.js) over HTTP so the backend's
// test suite can check that it behaves like the real server:
//   node scripts/serve-browser-api.mjs 5055 & API_URL=http://127.0.0.1:5055/api npm test --prefix ../backend
import http from 'http';
import { handleRequest } from '../src/services/browserApi.js';

const port = Number(process.argv[2]) || 5055;
http
  .createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const url = new URL(req.url, 'http://localhost');
      const { status, data } = handleRequest(
        req.method,
        url.pathname.replace(/^\/api/, ''),
        Object.fromEntries(url.searchParams),
        raw ? JSON.parse(raw) : {}
      );
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    });
  })
  .listen(port, () => console.log(`browser API on http://127.0.0.1:${port}/api`));
