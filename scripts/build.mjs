// Zero-dependency static site build: src/ -> dist/
// Wraps each page body in the shared layout, renders the portfolio from
// src/data/bets.json, and writes sitemap.xml / robots.txt.

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'dist');

const config = JSON.parse(await readFile(join(root, 'site.config.json'), 'utf8'));
const bets = JSON.parse(await readFile(join(src, 'data', 'bets.json'), 'utf8'));

// Production URL: explicit config/env first, then Vercel's production domain.
const siteUrl = (
  process.env.SITE_URL ||
  config.url ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/$/, '');
const pitchUrl = process.env.PITCH_URL || config.pitchUrl || config.linkedinUrl;
if (!process.env.PITCH_URL && !config.pitchUrl) {
  console.warn('! No pitchUrl set in site.config.json (or PITCH_URL env); "Pitch us" falls back to LinkedIn.');
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const extAttrs = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '');

const pages = [
  { file: 'index.html', route: '/', key: 'home', title: 'Sadev Ventures — Operator-led seed fund for Bharat' },
  { file: 'team.html', route: '/team', key: 'team', title: 'Team — Sadev Ventures',
    description: 'Meet the Sadev Ventures team: operators from BharatPe, CRED, Snabbit, Paytm and Airtel Payments Bank backing founders building for Bharat.' },
  { file: 'advisors.html', route: '/advisors', key: 'advisors', title: 'Advisors — Sadev Ventures',
    description: 'The Sadev Ventures tribe: advisors, co-investors and portfolio founders who help companies we back grow beyond the cheque.' },
  { file: 'bets.html', route: '/bets', key: 'bets', title: 'Our Bets — Sadev Ventures',
    description: `Explore the ${bets.length} startups in the Sadev Ventures portfolio, filterable by fund, sector, stage and status.` },
  { file: '404.html', route: null, key: '404', title: 'Page not found — Sadev Ventures', noindex: true },
];

const navItems = [
  { key: 'bets', href: '/bets', label: 'Our Bets' },
  { key: 'how', href: '/#how', label: 'What we look for' },
  { key: 'team', href: '/team', label: 'Team' },
  { key: 'advisors', href: '/advisors', label: 'Advisors' },
  { key: 'stories', href: '/#stories', label: 'Stories' },
];

const brand = (tag = 'a') =>
  tag === 'a'
    ? `<a class="brand" href="/" aria-label="Sadev Ventures home"><span class="brand__a">Sadev</span><span class="brand__b">Ventures</span></a>`
    : `<p class="brand"><span class="brand__a">Sadev</span> <span class="brand__b">Ventures</span></p>`;

const header = (active) => `<header class="site-header">
<nav class="nav" aria-label="Main">
${brand()}
<button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-links">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Menu
</button>
<div class="nav__links" id="nav-links">
${navItems
  .map((n) => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a>`)
  .join('\n')}
<a class="btn btn--primary btn--sm" href="${esc(pitchUrl)}"${extAttrs(pitchUrl)}>Pitch us</a>
</div>
</nav>
</header>`;

const cta = () => `<section id="pitch" class="cta" aria-labelledby="pitch-title">
<div class="container cta__inner">
<div class="cta__copy">
<h2 id="pitch-title">Building for Bharat? Let's talk.</h2>
<p>Share your deck. No warm intro needed.</p>
</div>
<a class="btn btn--light" href="${esc(pitchUrl)}"${extAttrs(pitchUrl)}>Pitch us</a>
</div>
</section>`;

const footer = () => `<footer class="site-footer">
<div class="container">
<div class="site-footer__top">
${brand('p')}
<nav class="site-footer__links" aria-label="Footer">
<a href="/">Home</a>
<a href="/bets">Our Bets</a>
<a href="/team">Team</a>
<a href="/advisors">Advisors</a>
<a href="/#stories">Stories</a>
<a href="${esc(config.linkedinUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
</nav>
</div>
<p class="site-footer__legal">Sadev Capital Trust is registered with SEBI as a Category I AIF – Venture Capital Fund (Angel Fund), Registration No. IN/AIF1/23-24/1404. Nothing on this site is an offer or solicitation.</p>
<p>© ${new Date().getFullYear()} Sadev Ventures. All rights reserved.</p>
</div>
</footer>`;

function layout(page, body, { scripts = [] } = {}) {
  const description = page.description || config.description;
  const canonical = siteUrl && page.route ? `${siteUrl}${page.route}` : '';
  const ogImage = siteUrl ? `${siteUrl}/og.png` : '';
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(description)}">
${page.noindex ? '<meta name="robots" content="noindex">\n' : ''}${canonical ? `<link rel="canonical" href="${canonical}">\n` : ''}<meta name="theme-color" content="${esc(config.themeColor)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(config.name)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${canonical}">\n` : ''}${ogImage ? `<meta property="og:image" content="${ogImage}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700&amp;family=Instrument+Sans:wght@400;500;600&amp;display=swap">
<link rel="stylesheet" href="/assets/styles.css">
<script>document.documentElement.classList.add('js')</script>
<script src="/assets/site.js" defer></script>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header(page.key)}
<main id="main">
${body.trim()}
${page.key === '404' ? '' : cta()}
</main>
${footer()}
</body>
</html>
`;
}

function renderBet(c) {
  const long = c.desc.length > 170;
  const id = `bet-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const founders = c.founders
    .map((f) =>
      f.li
        ? `<a class="founder" href="${esc(f.li)}" target="_blank" rel="noopener noreferrer">${esc(f.name)}</a>`
        : `<span class="founder">${esc(f.name)}</span>`,
    )
    .join('\n');
  return `<li class="bet" data-status="${esc(c.status)}" data-fund="${esc(c.fund)}" data-sector="${esc(c.sector)}" data-stage="${esc(c.stage)}">
<div class="bet__head">
<h2>${esc(c.name)}</h2>
<a class="bet__site" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(c.name)} website">Website ↗</a>
</div>
<div class="tags">
${c.status ? `<span class="tag tag--status">${esc(c.status)}</span>\n` : ''}<span class="tag tag--fund">${esc(c.fund)}</span>
<span class="tag">${esc(c.stage)}</span>
<span class="tag">${esc(c.model)}</span>
<span class="tag">${esc(c.sector)}</span>
</div>
<div>
<p class="bet__desc${long ? ' is-clamped' : ''}" id="${id}-desc">${esc(c.desc)}</p>
${long ? `<button class="bet__more" type="button" aria-expanded="false" aria-controls="${id}-desc" hidden>Show more</button>` : ''}
</div>
<dl class="bet__facts">
<div><dt>Sector</dt><dd>${esc(c.sector)}</dd></div>
<div><dt>Stage</dt><dd>${esc(c.stage)}</dd></div>
<div><dt>Biz Model</dt><dd>${esc(c.model)}</dd></div>
<div><dt>Location</dt><dd>${esc(c.location)}</dd></div>
</dl>
<div class="bet__founders">
<p class="bet__label">Founders</p>
<div class="founders">
${founders}
</div>
</div>
<a class="bet__li" href="${esc(c.li)}" target="_blank" rel="noopener noreferrer">${esc(c.name)} on LinkedIn →</a>
</li>`;
}

const uniq = (key) => [...new Set(bets.map((b) => b[key]).filter(Boolean))];
const ORDER = {
  stage: ['Pre-Seed', 'Seed', 'Pre Series A', 'Series A', 'Series B'],
};
const options = (key) => {
  const values = ORDER[key] || uniq(key).sort();
  return values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('\n');
};

// Portfolio names for the homepage marquee, newest first (reverse data order).
const marqueeNames = bets.map((b) => b.name.replace(/\s*\(.*\)$/, '')).reverse();
const marqueeGroup = (dup) =>
  `<ul class="marquee__group${dup ? ' marquee__group--dup' : ''}"${dup ? ' aria-hidden="true"' : ''}>\n${marqueeNames
    .map((n) => `<li class="marquee__item">${esc(n)}</li>`)
    .join('\n')}\n</ul>`;

const tokens = {
  '{{BETS}}': () => bets.map(renderBet).join('\n'),
  '{{BETS_TOTAL}}': () => String(bets.length),
  '{{OPTIONS_STATUS}}': () => options('status'),
  '{{OPTIONS_FUND}}': () => options('fund'),
  '{{OPTIONS_SECTOR}}': () => options('sector'),
  '{{OPTIONS_STAGE}}': () => options('stage'),
  '{{MARQUEE}}': () => marqueeGroup(false) + '\n' + marqueeGroup(true),
  '{{PITCH_URL}}': () => esc(pitchUrl),
  '{{PITCH_ATTRS}}': () => extAttrs(pitchUrl),
  '{{LINKEDIN_URL}}': () => esc(config.linkedinUrl),
};

await rm(out, { recursive: true, force: true });
await mkdir(join(out, 'assets'), { recursive: true });
await cp(join(src, 'assets'), join(out, 'assets'), { recursive: true });
await cp(join(src, 'public'), out, { recursive: true });

for (const page of pages) {
  let body = await readFile(join(src, 'pages', page.file), 'utf8');
  for (const [token, fn] of Object.entries(tokens)) {
    if (body.includes(token)) body = body.split(token).join(fn());
  }
  const leftover = body.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) throw new Error(`Unknown token ${leftover[0]} in ${page.file}`);
  const scripts = page.key === 'bets' ? ['/assets/bets.js'] : [];
  await writeFile(join(out, page.file), layout(page, body, { scripts }));
}

const robots = ['User-agent: *', 'Allow: /'];
if (siteUrl) {
  const urls = pages
    .filter((p) => p.route)
    .map((p) => `  <url><loc>${siteUrl}${p.route === '/' ? '/' : p.route}</loc></url>`)
    .join('\n');
  await writeFile(
    join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  robots.push(`Sitemap: ${siteUrl}/sitemap.xml`);
}
await writeFile(join(out, 'robots.txt'), robots.join('\n') + '\n');

console.log(`Built ${pages.length} pages to dist/${siteUrl ? ` for ${siteUrl}` : ''}`);
