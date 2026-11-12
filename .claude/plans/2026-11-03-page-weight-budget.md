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

Every page is over on both. The live page-weight gate (section "Gate" below) now measures both budgets after each deploy that asks for it.

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

## Fixed 2026-11-11 (on main, live on the canary and eye-care-test)

Measured by the gate (`scripts/check-page-weight.mjs`, median of 3 cold loads at 1440 px with a scroll so lazy files count; own-origin files only, third-party payment and captcha files reported apart):

| Page | CSS before -> after | JS before -> after |
|---|---|---|
| canary home | 195.4 -> 130.5 KB | 95.3 -> 101.9 KB (order attribution back on) |
| canary /blog/ | 175.7 -> 110.8 KB | 83.3 -> 89.6 KB (order attribution back on) |
| canary /shop/ | 190.2 -> 190.3 KB | 243.5 -> 190.9 KB |
| canary simple product | 201.5 -> 201.7 KB | 226.8 -> 181.7 KB |
| canary buybox product | 212.4 -> 212.9 KB | 203.5 -> 123.3 KB |
| eye-care-test home | 218.6 -> 150.9 KB | 104.7 -> 110.9 KB (order attribution back on) |
| eye-care-test /about/ | 191.6 -> 123.9 KB | 84.6 -> 90.9 KB (order attribution back on) |
| eye-care-test /shop/ | 210.7 -> 210.7 KB | 202.1 -> 149.2 KB |
| eye-care-test product page | 246.1 -> 246.1 KB | 383.3 -> 381.6 KB (the Stripe gateway declares jQuery, so it stays) |

- **Cause 1, fixed.** WooCommerce's stylesheets and the theme's `woocommerce.css` + notices load only where WooCommerce renders (`configurator-asset-optimiser.php::sgs_dequeue_wc_styles_off_wc_pages`); a `woocommerce/*` block rendered anywhere in the template keeps them (`sgs_note_wc_block_render`). Proof before shipping: on non-shop pages of both sites the only matching rules were `:root` properties and `.screen-reader-text`, and full-page and open-cart-drawer screenshots at 375 and 1440 were unchanged with every sheet disabled. The `sgs/cart` drawer needs nothing from them (its own `style.css`).
- **Cause 2, fixed for block-built shop and product pages.** `sgs_wc_page_runs_without_classic_scripts()` drops `woocommerce`, `wc-add-to-cart`, `jquery-blockui`, `js-cookie` and then jQuery when nothing declares it. It keeps them on cart, checkout and account, under a classic template or shortcode block, with a classic Ajax add-to-cart link, while the store notice shows, and restores jQuery when `wc_enqueue_js()` code is queued. Shop sort, filters, simple add to cart, the buybox choice flow, the cart drawer and checkout pass at 375 and 1440 with the six files blocked. The canary simple product keeps jQuery because WooCommerce's classic gallery declares it.
- **Cause 3, closed without a change.** `motion.css` + `motion-triggers.css` are 11.6 KB transferred (the 27 KB included `media-element.css`, which is Spec 49's) and already load only where used; the header's menu, mega menu and drawer use them on every page. Splitting `motion.css` per feature would save about 5 KB a page; parked.
- **Cause 4, closed without a change.** Each page loads exactly one collected `uploads/sgs-css/` file, including after a scroll; its name is the content hash plus the site's cache epoch (`sgs_css_epoch()`), stable between visits.
- **Cause 5, fixed.** On the front end `wp-polyfill` arrived only through `wc-settings`/`wc-types` on shop pages; `sgs_drop_polyfill_dependency()` removes the dependency (every supported browser has the features), saving 10.5 KB on /shop/.
- **Cause 6, reversed.** The optimiser had been stripping order attribution from non-shop pages, which lost the landing-page source of each order; it now loads everywhere (+6.3 KB JS), per Bean's 2026-11-03 decision. Those baselines were raised by hand with the reason.
- **New cause, fixed.** The "Animate WooCommerce product re-filtering" setting stamped GSAP Flip on every product collection, including related products on a single product page, which can never re-filter. It now applies only to a collection WooCommerce's filters act on (`query.inherit` or `query.filterable`), saving about 39 KB of JS on product pages.

## PageSpeed after the fixes (canary, 2026-11-11, PageSpeed API, `GOOGLE_API_KEY_MAIN`)

| Page | Mobile score | Mobile LCP | Desktop score | Desktop TBT |
|---|---|---|---|---|
| canary home | 72 to 75 | 9.0 to 9.2 s | 94 | 10 to 30 ms |
| canary /blog/ | 99 to 100 | 1.4 s | 100 | 0 ms |
| canary /shop/ | 83 to 90 | 3.3 to 3.7 s | 99 to 100 | 20 to 100 ms |
| canary simple product | 90 to 94 | 2.4 to 2.6 s | 99 to 100 | 10 to 100 ms |
| canary buybox product | 66 to 88 | 3.6 to 13.5 s | 99 to 100 | 10 to 20 ms |

Desktop is 94 to 100 everywhere and the shop's main-thread blocking is gone (the 1,200 ms on 2026-11-10 came from the classic jQuery stack). **The mobile LCP gap is media, Spec 49's:** on canary home the LCP element is the hero's mobile image (`img.sgs-hero__split-media--mobile`), already eager, `fetchpriority="high"` and discoverable, but a 1,028 KB WebP served full size to a 412 px phone with no smaller candidate; nothing hides it (sampled opacity, visibility, transform and clip every 250 ms from 400 ms). On the throttled mobile profile that one file is over 5 s. The next lever after it is render-blocking CSS: 23 to 40 separate stylesheets per page, which Lighthouse estimates at 1.0 to 1.5 s.

eye-care-test after the combined deploy (main 2b1896aea, 2026-11-11): home mobile 72 / 6.5 s LCP, desktop 87; /shop/ mobile 61 / 3.5 s with 1,060 ms TBT, desktop 78 with 370 to 520 ms TBT (was 1,200 ms); product page mobile 73 / 3.8 s, desktop 91; /about/ mobile 99, desktop 98. Shop sort, filters, the bag drawer on /about/ and every page's console are clean at 375 and 1440.

**The shop's main-thread time is now SGS's own scripts, not WooCommerce's.** Lighthouse attributes the long tasks on eye-care-test /shop/ to `theme/sgs-theme/assets/js/sgs-overlay-scroll.js` (tasks of 119 to 310 ms) and `sgs-blocks/build/header-behaviours/view.js` (377 ms on mobile), with 1.9 to 2.2 s of style and layout. In `sgs-overlay-scroll.js`, `mount()` reads `getComputedStyle( el ).position` after appending the thumb, element by element, so each mount forces a layout, and `start()` rescans the whole document on every body mutation, which the shop's Interactivity filters trigger constantly. The script skips coarse-pointer devices, so real phones mostly avoid it and Lighthouse's mobile emulation overstates the mobile cost; the desktop cost is real. Not yet proven by a before/after trace.

## Fixed 2026-11-12 (on main, live on the canary)

Gate (`check-page-weight.mjs`, median of 3 at 1440 px) on the canary, before (2026-11-11 baseline) -> after:

| Page | CSS | JS |
|---|---|---|
| home | 130.7 -> 75.6 KB (under budget) | 96.2 KB (see the home JS note below) |
| /blog/ | 113.5 -> 55.3 KB (under budget) | 91.8 -> 86.0 KB |
| /shop/ | 197.9 -> 104.9 KB | 195.5 -> 186.3 KB |
| simple product | 209.5 -> 116.8 KB | 186.1 -> 180.3 KB |
| buybox product | 221.2 -> 126.5 KB | 126.2 -> 120.4 KB |

- **Shop main-thread blocking, cause proven and fixed.** Chrome traces at 1440 px, 4x CPU, reading every forced style or layout event's JS stack: on the canary shop GSAP Flip's `getState()` built a full transform matrix per product card, forcing a style recalc at each ancestor (7 cards about 1,500 ms per call, 1 ms with `simple`), at boot and on every frame of the 2 s window any click armed; `fx-flip.js` now passes `{ simple: true }` to every `getState()` and `Flip.from()`. On eye-care-test's shop `sgs-overlay-scroll.js::mount` read `getComputedStyle().position` after each write (14 forced recalcs, 2,212 ms) and each scroller's `paint` ran in its own frame (14 more, 425 ms); `scan()` now reads every new scroller first and writes after, repaints share one frame that measures before writing, and the body observer scans only added subtrees. `header-behaviours/view.js` forces one recalc at boot, a pass the next frame would pay anyway, so it is unchanged. The overlay thumb also survives a script replacing its scroller's children (the bag lost its bar after its first render, before and after this work).
- **Hand-written CSS minified at deploy** (in place of item 1's per-surface split, Bean 2026-11-12: 32 KB of `woocommerce.css`'s 43 KB transferred was comments, so the split could save at most about 5 KB on the product page). `deploy_minify.py` + `minify-css.mjs` (csso, no restructuring) rewrite every `.css` under the theme's and the plugin's `assets/` in the payload; git keeps the commented source. 71 files, 209 KB gzipped to 51 KB. Proof (`.claude/qa/page-weight/css-minify-proof.mjs`): full-page screenshots, served vs minified in the browser, at 375 and 1440 on canary home, blog, shop, both products, cart, checkout and eye-care-test home, shop, product, about: identical, apart from two spots that also differ between unminified loads (load-timing races).
- **Header JS.** The shared `sgs/nav` store ships once as the script module `@sgs/nav-store` instead of bundled into each importer; the cart's panel renderer (`cart-panel.js`, 5.3 KB) loads on the first pointer, focus or key press on the bag, and the drawer menu's effects (`drawer-menu-effects.js`, 2.7 KB) on the first press anywhere or a drawer opening. `sgs/nav-drawer` still bundles its own store copy (Spec 49 Stage B folder freeze; switched at that branch's merge, its plan's Release step 1). Live checks (`node .claude/qa/page-weight/header-checks.mjs <base-url>`): neither chunk loads at page load, the store loads once, the bag opens and renders by mouse and keyboard at 1440 and by touch and keyboard at 375, the menu drawer opens by touch and keyboard, marks the current page and closes on Escape, no page errors.
- **Home JS note.** The 2026-11-11 22:43 baseline (80.5 KB) is not reproducible from the code then live: no front-end JS or PHP script loading changed from 4a050dfbc to be851a86f, and an in-browser A/B (be851a86f's build swapped in for the new one, gzip -9 of each body) measured home JS 95.9 KB before and 89.0 KB after. The baseline was set by hand to the measured 98,541 bytes with that reason.

## Still over budget, ranked by saving

1. **JS on shop and product pages (176 to 186 KB on the canary).** The Interactivity runtime (15.7 KB) and WooCommerce's product-filter and collection modules are most of it; GSAP on /shop/ (about 36 KB, for the re-filtering flip) can load on the first filter interaction instead of at page load.
2. **Hand-written JS is shipped unminified.** The theme's `assets/js` and the plugin's `assets/js` (25 files) carry about 24 KB of compressed comment weight; `sgs-shop-filters.js` alone 6.7 -> about 2.4 KB. The same deploy-time step as the CSS (a minifier that keeps module syntax and `wp_localize_script` globals) would save about 5 to 10 KB on a shop page.
3. **The header's remaining JS on every page.** Interactivity runtime 15.7 KB, nav bar menu 6.9, nav drawer 6.9 (4.5 of it the store copy until the Stage B merge), smooth scroll 6.1, header behaviours 4.3, nav store 4.7. A 50 KB JS page is not reachable while all of these load at start.
4. **WooCommerce's own `woocommerce.css` + layout on shop and product pages (about 19 KB).** Not removable as is: on the canary's product pages, screenshots change with them disabled (the classic gallery and parts of the add-to-cart form use them). Needs per-surface proof.
5. **`media-element.css` on every page: Spec 49** replaces it with `media-base.css` (now minified at deploy: 14.3 -> 1.8 KB in the meantime).
6. **Render-blocking stylesheet count (23 to 41 files a page).** Collecting the small per-block stylesheets into fewer files, or inlining the critical part, is the next mobile LCP lever after Spec 49's image sizes.
7. **The eye-care-test product page loads 382 KB of own-origin JS after a scroll**, most of it the Stripe gateway's scripts and React; worth a look with the payment plugin's lazy-load settings.

## Gate

Built 2026-11-11: `scripts/check-page-weight.mjs`, data and baselines in `scripts/data/page-weight.json` (canary and eye-care-test), run after the upload by `build-deploy.py --page-weight` and on every `--motion-qa-tier full` run (`deploy_verify.py::step_page_weight`; it cannot sit in the pre-upload full tier, which would measure the old code). Mechanism details: `.claude/deploy-architecture.md`, "Live page-weight gate". On its first real deploy it caught the order-attribution rise on home and blog.
