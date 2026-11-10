---
status: active
---

# Page weight back under budget (CSS < 100 KB, JS < 50 KB transferred)

Plan date 2026-11-03. Found by the Eye Care stream (fix register R3-23) while proving the shop Load more mode. Budget: project `CLAUDE.md` Non-negotiables, "< 100 KB CSS and < 50 KB JS per page", measured as transferred (compressed) bytes (`plugins/sgs-blocks/includes/configurator-asset-optimiser.php` says "gzipped, as the browser receives it").

## Measured (2026-11-03, Playwright `transferSize`, Brotli)

| Page | JS transferred | CSS transferred |
|---|---|---|
| eye-care-test /shop/ | 197.7 KB (56 files) | 223.1 KB (40 files) |
| eye-care-test product page | 145.9 KB | 231.1 KB |
| eye-care-test /about/ | 69.8 KB | 185.5 KB |
| canary home | 80.3 KB | 194.2 KB |

Every page is over on both. No gate measures either budget (the only budget gate is `check-motion-bundle-budget.py`).

## Re-measured 2026-11-10: still over, and slow to paint on phones

Same method, one run per page at 1440 px: eye-care-test /shop/ 196.7 KB JS / 207.1 KB CSS; product page at least 145.9 KB JS / 243.1 KB CSS; /about/ 82.4 KB JS / 188.3 KB CSS; home 101.7 KB JS / 215.0 KB CSS; canary home 92.8 KB JS / 194.4 KB CSS. Nothing since 2026-11-03 has reduced them.

Google PageSpeed Insights (Lighthouse, run via the API with `GOOGLE_API_KEY_MAIN`; no field data yet, the test sites have no traffic):

| Page | Mobile score | Mobile LCP | Desktop score | Desktop TBT |
|---|---|---|---|---|
| eye-care-test home | 72 | 6.6 s | 89 | 170 ms |
| eye-care-test /shop/ | 85 | 3.5 s | 63 | 1,200 ms |
| eye-care-test product page | 77 | 3.5 s | 86 | 260 ms |
| eye-care-test /about/ | 97 | 1.8 s | 99 | 10 ms |
| canary home | 86 | 4.1 s | 93 | 10 ms |

CLS is under 0.1 everywhere; accessibility 92 to 98, best practices 100, SEO 92 to 100. The two problems are slow Largest Contentful Paint on phones (the hero media) and the shop's JavaScript blocking the main thread on desktop (cause 2 below). /about/ shows the framework can score 97 to 99.

**Split with Spec 49.** Hero and media loading (lead-image preload per device, modern image formats, media CSS only on pages with media) belongs to Spec 49, the media system rebuild; its session was sent these findings on 2026-11-10. This plan owns the non-media causes below. Done when both budgets hold and mobile LCP is under 2.5 s on the five pages above, measured the same two ways.

## Causes, ranked by transferred saving

1. Theme `woocommerce.css` (42 KB) and WooCommerce's `woocommerce.css` + `woocommerce-layout.css` (17 KB) load on pages with no WooCommerce surface (/about/, canary home). Fix: enqueue them only where `sgs_page_needs_wc_frontend()` (`includes/configurator-asset-optimiser.php`) is true, after proving what of theme `woocommerce.css` the site-wide header cart drawer (`sgs/cart`) and mini cart need (move that part into the cart block's own stylesheet first).
2. WooCommerce's jQuery stack on shop and product pages (`jquery-core`, `jquery-migrate`, `wc-jquery-blockui`, `woocommerce`, `wc-add-to-cart`, `wc-js-cookie`; about 45 KB): `sgs_page_needs_wc_frontend()` keeps it on every `is_woocommerce()` page. SGS front-end code never needs jQuery. Fix: on archive and product pages built only from SGS blocks, dequeue the classic handles; prove add-to-bag, the buybox, the lens flow, the cart drawer and checkout entry still work (a Playwright flow per surface) before shipping.
3. `media-element.css`, `motion.css`, `motion-triggers.css` (about 27 KB) load on every page. Fix: enqueue them from the blocks or features that use them (the SGS CSS registry), with a fail-safe for blocks that render media or motion.
4. A possible second collected `uploads/sgs-css/sgs-<page>-*.css` on /shop/ (about 20 KB), seen by Playwright but not by a plain curl. Prove the cause first (router prefetch, the Load more fetch, or a real double enqueue). Likely cause, found 2026-11-04: the collected file is renamed on every request (`sgs_scope_class_for_root` mints a random class), fixed by `plans/2026-11-04-clean-first-paint.md` fix A; re-measure after it.
5. `wp-polyfill` (10.7 KB), a core dependency of `wp-url` / `wp-api-fetch`; drop only if the dependants are not needed on the page.
6. Order attribution (`sourcebuster-js`, `wc-order-attribution`, about 5 KB): a WooCommerce feature (orders' "origin" column). Kept on (Bean, 2026-11-03: the channel behind each sale is worth more than 5 KB); not an SGS change, never dequeued by the budget work.

## Gate

Add a page-weight gate (a Playwright script in `scripts/` measuring transferred JS and CSS on a fixed page list per test site, failing over budget, with a dated baseline that only shrinks) and run it in the deploy's full tier, so the budget cannot regress silently again. Build it first so every fix above shows its saving.

## Order

Gate (baseline the current numbers) -> 1 -> 4 (proof) -> 3 -> 2 -> 5. Each fix: one commit, deployed to the canary and eye-care-test, gate re-run, live flows checked at 375 and 1440.
