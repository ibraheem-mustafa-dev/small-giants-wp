# CLAUDE.md: MIC website test build

## What this is
A static, no-build website for Muslims In Construction (MIC). Everything deployable is in `site/`. Read `README.md` for the full overview.

## Rules
- **Do not add a build step, framework or package.json.** It's intentionally static. Upload `site/` as-is.
- **Do not change design, copy or layout** unless Ibraheem asks. The job is deploying, not redesigning.
- Keep all paths relative. The site must keep working in a subfolder.
- Keep `robots.txt` (Disallow all) and the `noindex` meta tags while it's on a test domain.
- UK English. No em dashes in anything you write for Ibraheem.
- Ibraheem is not a developer: explain steps plainly, give exact commands, and say what "done" looks like.
- Never put hosting passwords or API keys in files in this repo. Ask Ibraheem to enter credentials himself or use an existing SSH key / CLI login.

## Architecture (only if you need to fix something)
- `site/<page>.html`: thin shell with `<div id="app" data-page="Name">`. Loads `assets/js/preact.min.js` and `assets/js/dc-runtime.js`.
- `assets/js/dc-runtime.js`: fetches `dc/<Name>.dc.html`, parses the `<x-dc>` template (`{{holes}}`, `<sc-for>`, `<sc-if>`, `<dc-import>`), runs the `class Component extends DCLogic` script and renders with Preact.
- `dc/Header.dc.html`, `Footer`, `Gauge`, `JoinBand`, `BuildStage` are shared components imported by every page.
- `assets/css/mic.css` holds all styling, reveal animations and responsive rules (breakpoints at 1080px and 720px).
- Fonts are self-hosted in `assets/fonts/` via `assets/css/fonts.css`.
- Pages are fetched with `fetch()`, so the site must be served over http(s), not opened via `file://`.

## Verifying a deploy
1. Every page in the list below returns 200 and renders (not blank).
2. No console errors.
3. Burger menu opens a full-screen menu below 1080px wide.
4. Fonts: headings are a tall condensed display face (Big Shoulders Display), not Arial.
5. Images load from `assets/img/`.
6. A missing URL shows `404.html` (configure the host's 404 to use it if needed).

Pages: index, about, team, events, gala-2026, mentorship, sponsors, get-involved, directory, shop, product, basket, checkout, account, contact, legal (all `.html`).

## Host-specific notes
- **Apache / cPanel:** optional `.htaccess` in the web root: `ErrorDocument 404 /404.html` (adjust path if in a subfolder), plus gzip and long cache headers for `assets/`. Don't cache `dc/*.dc.html` aggressively; the runtime already requests them with `no-cache`.
- **Nginx:** `try_files $uri $uri/ =404; error_page 404 /404.html;`
- **Cloudflare Pages / Netlify:** no build command, publish directory `site`. `404.html` is picked up automatically.
- Optional: pretty URLs (`/about` instead of `/about.html`) are fine to add at the host level, but internal links use `.html`, so they'll keep working either way.
