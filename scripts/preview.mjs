import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = Number(process.env.PORT || 4173);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/share.png', ['share.png', 'image/png']],
]);
createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname.replace(/^\/preview(?=\/)/, '');
  const entry = files.get(pathname);
  if (!entry) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const data = await readFile(resolve('dist', entry[0]));
    res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(503); res.end('Run npm run build first.'); }
}).listen(port, '127.0.0.1', () => console.log(`PLEA preview: http://127.0.0.1:${port}/preview/`));
