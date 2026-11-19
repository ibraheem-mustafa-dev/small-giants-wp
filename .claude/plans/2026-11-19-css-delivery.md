---
status: active
doc_type: plan
created: 2026-11-19
---

# CSS delivery: no render-blocking stylesheets on any SGS site

Spec: Spec 32 FR-32-32 (shared stylesheets as order-preserving runs), FR-32-11 (page-specific CSS, `head` by default); Spec 01 §Fonts (size-matched fallback on every font preset). Research: `~/.claude/memory/research/2026-11-19-css-delivery-architecture.md`.

## Where it stands

Built, reviewed and live on sandybrown, mamas-test, indus-test and eye-care-test: release `45aef2042` (2026-11-19 14:32), then release `cd9718b2a` (2026-11-19 about 17:00) with the review fixes, the loop image rule and deferred SGS scripts, then release `b43b1ff18` (2026-11-19 evening) with the scrim fix (Stage C plan, "What Task 1 found"). `main` also carries `615f4af26` (the scrim script's removed-owner and late-scrim handling), not yet deployed. eye-care-clone-test still runs `c7b9372ff` (2026-11-02).

- **What it does:** each run of consecutive own-origin, media-all stylesheets is folded into its first handle (file content, then inline additions), so the cascade is unchanged (`plugins/sgs-blocks/includes/class-sgs-css-delivery.php::Css_Delivery`, on the `wp_print_styles` action at the last priority and `wp_footer` priority 2). Page-specific CSS prints inline in the head (`sgs_css_output_mode` default `head`). Every font preset carries its size-matched fallback (`theme/sgs-theme/inc/font-fallback.php::font_fallback_preset_overrides`), which removed the font-swap layout shift the faster first paint exposed.
- **Delivery mode per site (`sgs_css_shared_delivery`, SGS → CSS Output):** framework default `inline` (every stylesheet in the page). `inline` on every site. Mama's ran `bundle` from 14:39 to 15:12 on 2026-11-19 and moved to `inline` by Bean's ruling (Stage C makes inline the likely winner everywhere, so no switching back and forth). Mama's database was backed up before each write (`~/backups/db/mamasmunches.com-20261119-*.sql.gz` on the server, one per change).
- **Page cache:** LiteSpeed Cache (page caching only, every optimisation off, 10-hour lifetime) runs on sandybrown and mamas-test; `.claude/dev-setup.md` Known Gotchas has the setup and why. Cached pages answer in 0.10 to 0.15 s against 0.55 to 0.75 s before. Object cache (Hostinger's Memcached, reachable at `localhost:11211` from web and command line) was measured on the canary and made basket, checkout and account no faster, so it stays off.
- **Google Analytics:** left as it is. Delaying it gains lab points mainly because Lighthouse never interacts, and loses visitors; Mama's has no CrUX field data, so there is no ranking gain. The Google tag gateway was set up and reverted the same day: UK visitors are routed around it (`gtm_region_override=GB-ENG`), so the container downloaded twice. Research: `~/.claude/memory/research/2026-11-19-gtm-ga4-pagespeed-cost.md`.

## Results (PageSpeed API, phones)

| Page | Before (2026-11-19 morning) | `inline` | `bundle` |
|---|---|---|---|
| Canary Home (median of 3) | 92, render-blocking 1.30 s | 98, 0 ms | 97, 250 ms |
| Canary Shop (median of 3) | 90, 1.60 s | 95, 400 ms (footer JavaScript) | 94, 1.0 s |
| Mama's Home (median of 5) | 94 (median of 3), 1.55 s | 90, 0 ms, HTML 137 KB | **95**, 300 ms, HTML 72 KB |
| Mama's Shop (median of 5) | 82 (median of 3), 1.75 s | **86**, 100 ms | 82, 1.05 s |

Mama's on `inline` (PageSpeed API, phones, median of 5, 2026-11-19):

| Page | `inline` + page cache, before `cd9718b2a` | after `cd9718b2a` (loop images, deferred scripts) |
|---|---|---|
| Home | 87 (87 to 97), TBT 382 ms, render-blocking 0 ms | **94** (86 to 98), TBT 168 ms, render-blocking 0 ms |
| Shop | 81 (80 to 90), LCP 3.75 s, TBT 307 ms, render-blocking 100 ms | **87** (79 to 90), LCP 3.30 s, TBT 209 ms, render-blocking 50 ms |

After the scrim fix (`b43b1ff18`, 2026-11-19; Stage C plan "What Task 1 found"), PageSpeed API, phones, median of 5:

| Site | Page | Score | LCP | TBT |
|---|---|---|---|---|
| Mama's | Home | 94 | 1.55 s | 61 ms |
| Mama's | Shop | 88 | 3.30 s | 260 ms |
| Mama's | Product | 84 | 3.30 s | 172 ms |
| Mama's | Basket | 33 | 15.24 s | 13,512 ms (hCaptcha via Stripe) |
| Indus | Home | 88 | 2.78 s | 70 ms |
| Indus | Wholesale | 92 | 2.49 s | 72 ms |
| Indus | Brands | 95 | 2.18 s | 52 ms |
| Indus | Catalogue | 94 | 2.40 s | 74 ms |
| Indus | Contact | 72 | 7.13 s | 107 ms |
| Eye Care | Home | 87 | 2.87 s | 92 ms |
| Eye Care | Shop | 91 | 2.55 s | 16 ms |
| Eye Care | Product | 72 | 2.85 s | 516 ms |
| Eye Care | Prescription lenses | 99 | 1.27 s | 0 ms |
| Eye Care | Contact | 97 | 1.95 s | 42 ms |

- **What held Shop's LCP before the scrim fix:** the LCP element is the first product card's image (eager, `fetchpriority="high"`, 14 KB AVIF). It finished downloading about 0.2 s in, then waited about 2.1 s to paint (element render delay; about 0.2 s after the fix, the rest of the wait now being the image's late start behind the HTML). The largest main-thread cost is Style & Layout (about 0.7 s), the browser matching Mama's per-instance CSS (the page's HTML is about 1 MB raw with its CSS inline); the longest single tasks are Google's `gtag/js` (176 ms), `header-behaviours/view.js` (116 ms) and `gtm.js` (83 ms). Stage C's Tasks 5, 2 and 3 are the levers for Shop 95.

- **Why the modes split on Mama's:** a first visit downloads about the same total either way, but `inline` makes every page carry all of its styling. Mama's carries far more CSS than the canary (Home's per-page CSS alone is 415 KB raw), so on Mama's Home the heavier page cost more than the removed requests saved. Each page type (Home, Shop, product, basket) gets its own `bundle` file, so `bundle`'s saving shows on same-type pages and return visits.
- **Mama's journey after the release:** shop, add to basket, basket, checkout, account sign-in and no script errors, 6 of 6 (`E:/sgs-tmp/cc-plan/probe/journey.mjs`, which uses the real Add to basket button because the box builder refuses Store API adds).
- **No flash:** the first painted frame of Google's filmstrip is fully styled on canary Home and Shop.
- **Page weight:** inline CSS counts at its gzip size (`scripts/check-page-weight.mjs`); canary Home CSS 62.1 KB, Shop 84.4 KB, no blocking own-origin stylesheet link.

## Proof

- `wp eval-file plugins/sgs-blocks/tests/php/wp-eval-css-delivery.php` on local-mamas: 26 checks pass; 12 of 12 mutations of the class caught (before the review fixes).
- `php theme/sgs-theme/tests/run-font-fallback-standalone.php`: 15 pass; 3 of 3 mutations caught; fast gate `font-fallback-standalone`.
- `node scripts/check-page-weight.mjs --selftest` 25/25; `check-first-paint.mjs --selftest` 11/11; `check-state-exhaustiveness.py --self-test` 23/23.
- `build-deploy.py --gate-only` at `ac260c889` (the branch before its last rebase): fast 232/232, full 17/17. The release `45aef2042` went through `small-giants-wp-3a`'s deploy gates.
- Render check (`scripts/render-check/`) on the Mama's mirror: every state it reached rendered identically; the full runs on three mirrors were stopped by Bean as too slow for this change.
- Code review (2026-11-19, medium) fixed on `main`: font preset variables named with WordPress's `_wp_to_kebab_case`; the merge moved from `wp_head` priority 2 to the last `wp_print_styles` priority so styles added later in the head stay in order; the page-weight gate reads unquoted attributes, asks the browser which link media match, and ignores `<style>` in comments, `<noscript>`, `<template>` and `<svg>`; the state gate's links flag goes before a `#fragment`.

## Open

1. **`bundle` mode hardening (parked: no site runs `bundle`).** Needed before any site with a page cache selects `bundle`: every `save_post` bumps the CSS epoch and `sgs_css_gc` deletes every older file at once, so HTML cached longer than the bump (a CDN, an HTML-caching plugin) can point at a deleted file; keep the previous epoch's files for a grace period (about 24 hours) first. Ruled out on the live shop 2026-11-19: a file per URL (two product pages shared one file; files differ only by block set). Re-reading every stylesheet on each uncached request applies to `inline` too and is moot on cached pages; measure it on basket and checkout only if their response time matters.
2. **Shop LCP (Mama's Shop 88, short of 95).** Done in `cd9718b2a`: `class-sgs-media-priority.php::resolve` keeps only the first three items of a post or product loop eager (`wp_omit_loading_attr_threshold`; Spec 49 §7.7 rule 4); live Shop prints three eager product images, the first with `fetchpriority="high"`. Done in `b43b1ff18`: the scrim fix cut the LCP image's render delay from about 2.1 s to about 0.2 s. What remains: the image's request starts only as the HTML finishes arriving (737 to 951 ms in every PageSpeed run; the HTML is 141 KB compressed and the first product image sits after about 970 KB of inline CSS), so simulated LCP is still 3.30 s. Next levers are in the Stage C plan: Task 5 (a head preload of the first loop image), then Tasks 2 and 3 (fewer bytes before the image). The third font, Caveat (74 KB), requests at about 440 ms with VeryHigh priority, after the LCP image has finished, so it is not on the LCP image's path.
3. **Footer JavaScript: done in `cd9718b2a`; gate added 2026-11-19.** SGS's own classic frontend scripts print `defer` (served Shop HTML checked: `sgs-touch-input`, `sgs-js-flag`, `sgs-nav-accessibility` and the five `sgs-shop-filters*` handles, beside the ones that already deferred). Render-blocking is 0 ms on Mama's Home and 50 ms on Shop (WooCommerce's `woocommerce-smallscreen.css`). `plugins/sgs-blocks/scripts/check-script-strategy.py --check` (fast tier, with its `--self-test`) refuses a front-end `wp_enqueue_script`/`wp_register_script` in `plugins/sgs-blocks` or `theme/sgs-theme` that loads a file without a `strategy`; admin, editor, customiser and login hooks pass, and its `EXCEPTIONS` table names each script left blocking on purpose with the reason: the WooCommerce Blocks basket and checkout helpers (`sgs-checkout-delivery-cards`, `sgs-checkout-payment-loading`, the commerce-blocks front end, `sgs-gift-card-checkout`), `stripe-js` on `sgs/form` payment pages, and the editor-only `sgs-motion-defs`. It finds a call's comments through the shared PHP tokeniser (`scripts/lib/identity_scan.py::php_tokens`, so a `//` inside a URL string hides nothing) and takes the hook from the innermost function or closure around the call. On `main` it reads 55 calls with 0 blocking; a planted blocking enqueue in `theme/sgs-theme/inc/shop-chosen-filters.php` fails it.
4. **Stage C: shrink per-instance CSS at source.** Plan: `plans/2026-11-19-stage-c-per-instance-css.md`. Mama's Home per-page CSS is 415 KB raw: 3,200 rules but 993 distinct bodies. Task 1 (the detector) found the Shop cost was two `:has()` scrim rules rather than the bytes (fixed, released in `b43b1ff18`); the remaining Stage C tasks (head preload of the first loop image, then fewer bytes before it) are what is left for Shop's LCP.
5. **Font fallback consolidation.** `font_fallback_filter_stacks` (theme-origin stacks with their own faces) and `font_fallback_preset_overrides` (every preset, from the merged settings) both insert the fallback name; the override covers what the filter does on the front end, while the filter also reaches the editor. Fold them into one source of the insertion.
6. **Quick wins Bean asked for next session (PageSpeed phones, median of 5, after `b43b1ff18`; Results table).** (a) Mama's basket scores 33: the woo-stripe-payment plugin's express-pay loads Stripe's fraud check, which loads hCaptcha's `hsw.js` (about 13.5 s of main thread); load it only when a visitor reaches for the wallet buttons, and keep the journey check (6 of 6) and the wallet test intact. It is third-party code, so the lever is when it loads, not what it does. (b) Indus Contact scores 72 with LCP 7.13 s: cause not yet looked at. (c) Eye Care product scores 72 with TBT 516 ms and 4 render-blocking files: cause not yet looked at.

## Found along the way

- **Render check port race:** fixed on `main` by the render-check session (`e82c9926d`, ports claimed as each copy is made).
- **Deploys from Git Bash fail the media guard:** Git's MSYS `ssh.exe` mangles the guard's 9.7 KB export command; Windows OpenSSH runs it. Deploy from PowerShell (auto memory `windows-shell-gotchas`).
- **Hard-coded font in a block stylesheet:** in `plugins/sgs-blocks/src/blocks/product-card/style.css`, `.product-card--live .price--pct-off` and `.product-card--live .product-card__stock` set `font-family: 'Inter', sans-serif` directly (a client value in block CSS, Spec 32), so they bypass the theme's font presets.
