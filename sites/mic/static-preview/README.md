# Muslims In Construction: website redesign (test build)

Static, no-build website. Upload the contents of `site/` to any web host and it works. No PHP, no database, no npm install.

**Status:** design prototype for review on a test domain. Not the live site.

## What's in here

```
mic-site/
├── README.md                 ← this file
├── CLAUDE.md                 ← instructions for Claude Code
├── CLAUDE_CODE_PROMPT.md     ← copy-paste prompt to start the deploy
└── site/                     ← THE WEBSITE: upload everything inside this folder
    ├── index.html            ← home page
    ├── about.html, team.html, events.html, gala-2026.html,
    │   mentorship.html, sponsors.html, get-involved.html,
    │   directory.html, shop.html, product.html, basket.html,
    │   checkout.html, account.html, contact.html, legal.html
    ├── 404.html
    ├── robots.txt            ← blocks search engines (test domain only)
    ├── dc/                   ← page content and components (one file per page/component)
    └── assets/
        ├── css/              ← mic.css (all styling), fonts.css
        ├── fonts/            ← self-hosted fonts (no Google Fonts calls)
        ├── img/              ← photos, logos, shop images
        └── js/               ← preact.min.js + dc-runtime.js (renders the pages)
```

Total size is about 1.8 MB.

## How it works (plain English)

Each `.html` page is a thin shell. It loads `dc-runtime.js`, which fetches the matching file from `dc/` (for example `dc/About.dc.html`), turns it into the page and runs the animations and interactions. Shared pieces (header, burger menu, footer, gauge, join band, press-and-hold building) live in `dc/` too, so editing `dc/Header.dc.html` changes the header on every page.

All paths are **relative**, so the site works at a domain root (`test.example.com/`) **or** in a subfolder (`example.com/mic/`).

## Preview locally

It must be served over http (opening `index.html` straight from the file system won't work because the pages are fetched).

```bash
cd site
python3 -m http.server 8080
# then open http://localhost:8080
```

or `npx serve site`.

## Deploy to a test domain

Any of these work. Pick whatever the test domain already uses.

1. **cPanel / shared hosting (most likely):** upload the *contents* of `site/` into the domain's web root (often `public_html/` or `public_html/<subdomain>/`) via File Manager or SFTP.
2. **SFTP/SSH:** `rsync -avz --delete site/ user@host:/path/to/webroot/`
3. **Cloudflare Pages / Netlify:** point it at the `site/` folder. No build command. Output directory = `site`.

After upload, check: home page loads, burger menu opens, fonts look condensed and bold (not Arial), images show, a made-up URL shows the 404 page (on cPanel this needs the small .htaccess described in CLAUDE.md).

## Things that are front-end only (not wired up yet)

These look and behave right but don't send or save anything yet:

- Join / membership form, mailing list, contact, sponsorship enquiry, volunteer and mentorship forms
- Shop, basket, checkout and "My account" (no payments, no real orders)
- Gala and event ticketing (ticket tiers, countdown, e-tickets)
- Directory (marked "coming soon")

For the real build these would connect to WooCommerce (shop + tickets), the mailing list provider and a form handler. That's the next phase, not part of this upload.

## Placeholders still needed from MIC

Search the `site/dc/` files for `from MIC` and square brackets like `[Date]` to find them. Main ones:

- Gala 2026: award categories and winners, guest numbers, photos, sponsor logos, step-free access details
- Event photos for upcoming events, dates/times for some events
- Headshots for the wider team
- Sponsorship package details and prices
- Shop: delivery timescales, extra product angles
- Legal pages: policy dates and final wording
- Audited numbers (members, LinkedIn followers, gala guests)

## Before this goes live (not for the test domain)

- Delete `robots.txt` (or change to `Allow: /`) and remove the `noindex` meta tag from every page shell
- Replace placeholders above
- Wire up forms, shop and ticketing

---
Design and build: [Small Giants Studio](https://smallgiantsstudio.co.uk)
