// Checks built pages: every internal link resolves to a page, and every
// #fragment exists on its target page.
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const files = (await readdir(dist)).filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await readFile(join(dist, f), 'utf8')])));
const ids = (src) => new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const routeToFile = (route) => (route === '/' ? 'index.html' : `${route.slice(1)}.html`);
const assets = new Set((await readdir(dist, { recursive: true })).map((f) => '/' + f.replaceAll('\\', '/')));

let errors = 0;
for (const [file, src] of Object.entries(html)) {
  for (const [, href] of src.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(href)) continue;
    const [path, hash] = href.split('#');
    let target = file;
    if (path) {
      if (assets.has(path)) continue;
      target = routeToFile(path);
      if (!html[target]) {
        console.error(`${file}: broken link ${href}`);
        errors++;
        continue;
      }
    }
    if (hash && !ids(html[target]).has(hash)) {
      console.error(`${file}: missing anchor ${href}`);
      errors++;
    }
  }
}
if (errors) process.exit(1);
console.log(`Checked ${files.length} pages: all internal links and anchors resolve.`);
