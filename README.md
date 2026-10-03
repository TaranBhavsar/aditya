# Sadev Ventures — website

Static marketing site for Sadev Ventures (formerly Eternal Capital), built from the design canvas and deployed on Vercel.

Pages: `/` (home), `/team`, `/advisors`, `/bets` (filterable portfolio), plus a custom 404.

## Stack

- Plain HTML/CSS/JS, no framework and **no npm dependencies**.
- A small Node build (`scripts/build.mjs`) wraps each page in a shared layout (header, CTA, footer, SEO tags), renders the portfolio from `src/data/bets.json`, and writes `dist/` with `sitemap.xml` and `robots.txt`.

```
src/
  pages/        page bodies (index, team, advisors, bets, 404)
  data/         bets.json — portfolio companies
  assets/       styles.css, site.js (mobile nav), bets.js (filters)
  public/       favicon, apple-touch-icon, og.png (copied to the site root)
scripts/        build, local preview server, link checker
site.config.json  name, description, LinkedIn, pitch link
vercel.json       build settings, clean URLs, security & cache headers
```

## Develop

Requires Node 18+.

```bash
npm run dev      # build + preview at http://localhost:3000
npm run check    # build + verify every internal link and #anchor
```

## Deploy to Vercel

1. Import this repository in Vercel (**Add New → Project**). `vercel.json` already sets the build (`npm run build`) and output (`dist`); leave the framework preset as **Other**.
2. Optional environment variables:
   - `PITCH_URL`: where every "Pitch us" button goes (a form, Typeform or `mailto:`). You can also set `pitchUrl` in `site.config.json`. **Until one is set, the buttons fall back to the company LinkedIn page.**
   - `SITE_URL`: canonical domain, e.g. `https://sadev.vc`. If you don't set it, the build uses Vercel's production domain. It's used for canonical tags, Open Graph and the sitemap.
3. Deploy. Or from the CLI: `npx vercel --prod`.

## Editing content

- **Portfolio:** edit `src/data/bets.json`. Cards, filter options, counts and the homepage marquee all update on the next build.
- **Copy:** edit the files in `src/pages/`. Header, CTA band and footer live in `scripts/build.mjs`.
- **Brand colour:** `--accent` in `src/assets/styles.css` (plus `themeColor` in `site.config.json`).

If you add an inline `<script>`, update the `sha256-` hash in the Content-Security-Policy in `vercel.json`, or the browser will block the script.
