// Local preview of dist/ that mirrors Vercel's cleanUrls and headers.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT) || 3000;
const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
const globalHeaders = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key, h.value]),
);
delete globalHeaders['Strict-Transport-Security'];
globalHeaders['Content-Security-Policy'] = globalHeaders['Content-Security-Policy'].replace('; upgrade-insecure-requests', '');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

async function resolve(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = clean === '/' ? ['index.html'] : [clean, `${clean}.html`];
  for (const c of candidates) {
    const file = join(dist, c);
    if (!file.startsWith(dist)) continue;
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {}
  }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.endsWith('.html') || (pathname.length > 1 && pathname.endsWith('/'))) {
    const target = pathname.replace(/(index)?\.html$/, '').replace(/(.)\/$/, '$1') || '/';
    res.writeHead(308, { Location: target });
    return res.end();
  }
  const file = await resolve(pathname);
  const status = file ? 200 : 404;
  const body = await readFile(file || join(dist, '404.html'));
  res.writeHead(status, { 'Content-Type': types[file ? extname(file) : '.html'] || 'application/octet-stream', ...globalHeaders });
  res.end(body);
}).listen(port, () => console.log(`Preview: http://localhost:${port}`));
