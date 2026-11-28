# Plan: replace the SGS website with the new Claude Design draft (everything except /mic)

The work happens in the site's own repo, `C:\Users\Bean\Projects\small-giants-studio` (Next.js on Vercel, GitHub `ibraheem-mustafa-dev/small-giants-studio`); paths in this plan are in that repo unless they name small-giants-wp. This plan is Task 34's SGS half in `2026-11-25-land-fixes-and-editor-cleanup.md`. <!-- dangling-ok: paths below are in the small-giants-studio repo -->

**Goal and why (Bean, 2026-11-28):** the new SGS website design from Claude Design replaces the current site at smallgiantsstudio.co.uk now, instead of waiting for the WordPress clone (small-giants-wp plan `2026-11-25-land-fixes-and-editor-cleanup.md`, Task 34). The MIC stall page at `/mic` stays exactly as it is. The later WordPress clone of the same draft replaces this when it is ready.

**Decisions:**
- The draft is ported into this Next.js app as real, server-rendered pages. Uploading the `.dc.html` files as they are is ruled out: they build the page in the visitor's browser with React and Babel fetched from unpkg.com (about 1 MB of script before anything shows), so the page is slow, search engines see an empty shell, and the site's Content-Security-Policy blocks them.
- Hosting stays on Vercel (project `small-giants-studio`): the domain, `/mic` and `/hello` are already here, so there is no DNS change and rollback is one command.

## Must survive (each checked by `scripts/check-kept.mjs`, or by hand where marked)

| What | Where it lives today |
|---|---|
| `/mic` stall page, byte for byte | `public/mic/` (synced from small-giants-business `02-marketing/mic-gala-2026/deploy/sync-to-site.py`), the `/mic` rewrite and `MIC_CSP` in `next.config.ts`. Never edit these files here |
| `/hello` forwards 302 to `/mic` | `next.config.ts::redirects` (temporary, so it can be repointed per event) |
| Every known address answers | `scripts/kept-manifest.json::knownUrls`; a page the design drops gets a 301 in `next.config.ts::redirects` to its nearest new page. `/privacy` and `/terms` 404 today although the old sitemap lists them: 301 them to the legal pages |
| Contact form reaches the studio mailbox (by hand: one test submission) | Formspree endpoint `https://formspree.io/f/xeeloran`, as in `components/sections/ContactForm.tsx` (keep its honeypot and its success and error states) |
| Cal.com booking (by hand: calendar loads, a test booking) | `cal.com/smallgiantsstudio/chat`, inline embed in SGS teal: small-giants-business `02-marketing/mic-gala-2026/brand/cal-embed-teal-snippet.html`. The main CSP must then allow `https://app.cal.com` in `script-src`, `frame-src`, `connect-src` and `img-src` |
| Evertreen forest viewer (by hand: it renders) | iframe `https://www.evertreen.com/forest/697950af3dc86?iframe=1` (already in the CSP's `frame-src`) |
| Search basics | `app/robots.ts`, `app/sitemap.ts` (list the real routes only), `app/opengraph-image.tsx`, `components/ui/JsonLd.tsx`, `app/icon.svg` |
| Legal pages | `app/privacy-policy`, `app/terms-of-service`: carry their text over if the draft has none |
| Contact facts | phone 07424 449555 only; `hello@smallgiantsstudio.co.uk` public; "Small Giants Studio Ltd" (never MA Growth Digital) |

No analytics script loads today (the CSP names Google Analytics, nothing uses it); add none. Keep a cookie banner only if something on the new site sets a non-essential cookie.

## Steps

1. **Take in the draft.** Bean exports it with Claude Design's "Handoff to Claude Code" (small-giants-wp `.claude/claude-design-handoff/PROMPT.txt`); the `design_handoff_*` folder goes unchanged into small-giants-wp `sites/small-giants-studio/handoff/` (the later clone reads the same folder). Check it from small-giants-wp: `node scripts/computed-route/handoff-check.mjs sites/small-giants-studio/handoff`. Read its `README.md` (routes, breakpoints, global elements) and `READING-DC-FILES.md` (the template language).
2. **Map pages.** Each draft page to a route; record dropped old pages as 301s.
3. **Port the shared parts first** (one worker): header, mobile menu, footer, fonts (`next/font`, self-hosted), colour and type tokens from `tokens/` into `app/globals.css`, images from `assets/` into `public/images/`.
4. **Port the pages in parallel** (one worker per page, after step 3). Translation rules:
   - Per-width values (`L.x`, written `v(mobile, tablet, desktop)` in `renderVals()`) become CSS custom properties set in media queries at the draft's breakpoints. Nothing reads `window.innerWidth` to lay out a page: it breaks server rendering and makes the page jump.
   - `style-hover`, `style-focus-visible` and the other `style-<state>` attributes become CSS rules; `sc-if` and `sc-for` become JSX conditions and maps.
   - Pages are server components; only the parts with state (menus, accordions, sliders, forms, tabs) are client components.
   - Motion keeps the draft's timing and honours `prefers-reduced-motion`.
   - Prototype stand-ins (fake submits, local storage) are replaced by the real Formspree, Cal.com and Evertreen wiring above.
5. **Remove** old pages and components nothing uses any more (git keeps them).
6. **Check locally:** `npm run build`, `npm start`, then for each page `node scripts/compare-draft.mjs --draft-dir <handoff> --draft "<Page>.dc.html" --page http://localhost:3000/<route> --name <route>` and read the 375, 768 and 1440 side by sides it writes to `E:\sgs-tmp\sgs-port\compare\` (its numbers are a diagnostic; the pictures and Bean's eye close a page); `node scripts/check-kept.mjs http://localhost:3000` exits 0; keyboard-only pass of the menu and forms; Lighthouse on the home page.
7. **Preview, then live:** `npx vercel` gives a preview URL; run `check-kept.mjs` on it and send Bean the link. On Bean's go: `npx vercel promote <preview url>`, then `check-kept.mjs https://smallgiantsstudio.co.uk`, one Formspree test, one Cal.com test, and both QR codes scanned on a phone. Git pushes do not deploy (Vercel's git deploys are off), so also commit and push `main`.
8. **Rollback** if anything is wrong live: `npx vercel promote https://small-giants-studio-lxa3t2501-ibraheem-mustafas-projects.vercel.app` (the production deploy from 2026-11-27, before the redesign).

**Status (2026-11-28):** prepared. Both checks exist and are proven: `check-kept.mjs` passes 36 of 40 on the live site, failing only on the real `/privacy` and `/terms` 404s, and fails when a `/mic` file changes; `compare-draft.mjs` rendered Mama's Contact draft against its live page. Waiting for Bean's draft.

**Open:** the hero's Higgsfield scroll clip (small-giants-wp LEDGER, brief section 6.4) is made after launch if the draft ships with a still hero; Higgsfield Plus renews about 2026-12-28.
