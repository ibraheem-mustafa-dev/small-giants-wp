---
status: done
doc_type: plan
created: 2026-11-19
---

# CSS delivery: no render-blocking stylesheets on any SGS site

Spec: Spec 32 FR-32-32 (shared stylesheets as order-preserving runs), FR-32-11 (page-specific CSS, `head` by default); Spec 01 §Fonts (size-matched fallback on every font preset). Research: `~/.claude/memory/research/2026-11-19-css-delivery-architecture.md`.

## Where it stands

Done 2026-11-21: built, reviewed and live on sandybrown, mamas-test, indus-test and eye-care-test. What remains is Bean's own action (Open 6) or optional and parked (Open 1, 2 and 5, and "Found along the way"); LEDGER Parked points here. Release history: `45aef2042` (2026-11-19 14:32), then `cd9718b2a` (2026-11-19 about 17:00) with the review fixes, the loop image rule and deferred SGS scripts, then `b43b1ff18` (2026-11-19 evening) with the scrim fix, then `82124d18d` (2026-11-20 morning) with Stage C's shared per-instance CSS, the head preload of the lead image, the scrim script's robustness fixes (`615f4af26`), the basket Stripe hold and the lightbox fix, then `4841f0dfa` and `5f2455eee` (2026-11-21) with the full-size AVIF copies and the stylesheet fold below, and `79119581f` (2026-11-21) with the medium code review's seven fixes (the copy's own metadata key, a print sheet kept as a link, a failed encode retried). eye-care-clone-test still runs `c7b9372ff` (2026-11-02).

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

After the Stage C release (`82124d18d`, 2026-11-20: shared per-instance CSS rules, the head preload of the lead image, the basket Stripe hold switched on for Mama's, Indus Contact's hero text fade removed), PageSpeed API, phones, median of 5 (raw runs `E:/sgs-tmp/cc-plan/psi/*-after*`, rows in `E:/sgs-tmp/stagec/psi-*.txt`):

| Site | Page | Score (was) | LCP | TBT |
|---|---|---|---|---|
| Mama's | Home | 98 (94) | 1.46 s | 77 ms |
| Mama's | Shop | 86 (88) | 3.30 s | 257 ms |
| Mama's | Product | 89 (84) | 3.30 s | 100 ms |
| Mama's | Basket | 63 (33) | 10.39 s | 290 ms |
| Indus | Home | 91 (88) | 3.08 s | 19 ms |
| Indus | Wholesale | 95 (92) | 2.62 s | 73 ms |
| Indus | Brands | 96 (95) | 2.52 s | 66 ms |
| Indus | Catalogue | 96 (94) | 2.25 s | 86 ms |
| Indus | Contact | 95 (72) | 2.10 s | 98 ms |
| Eye Care | Home | 89 (87) | 2.75 s | 6 ms |
| Eye Care | Shop | 91 (91) | 2.85 s | 122 ms |
| Eye Care | Product | 76 (72) | 2.74 s | 414 ms |
| Eye Care | Prescription lenses | 99 (99) | 1.28 s | 0 ms |
| Eye Care | Contact | 97 (97) | 1.95 s | 43 ms |

Per-page CSS on the local mirrors (`stage_c.py --survey`, raw bytes of the collected per-instance CSS): Mama's Home 414 KB to 320 KB, Shop 218 KB to 186 KB, product 242 KB to 217 KB, basket 189 KB to 167 KB, Indus Home 502 KB to 422 KB, Eye Care Home 569 KB to 374 KB. Shop's compressed HTML moved only from 141 KB to 139 KB: repeated rules compress well, so removing them saves little on the wire.

After release `4841f0dfa` (2026-11-21: full-size AVIF copies made on all four sites, WooCommerce's small-screen stylesheet inline, `.sgs-js` in the head, an unread theme script deleted), Mama's, PageSpeed API, phones, median of 5 (raw runs `E:/sgs-tmp/cc-plan/psi/release-1121-*`):

| Page | Score (was) | LCP | TBT | Render-blocking |
|---|---|---|---|---|
| Home | 97 (98) | 1.45 s | 92 ms | 0 ms |
| Shop | 92 (86); runs 92 to 93 | 3.00 s (3.30) | 149 ms (257) | 0 ms (50) |
| Product | 92 (89) | 3.00 s | 92 ms | 200 ms |
| Basket | 66 (63) | 10.20 s | 238 ms | 200 ms |

On Shop the image's paint delay fell from about 0.23 s to 0.11 to 0.16 s; what still finishes before the observed LCP is 660 to 780 KB (the page 142 KB, Google Tag Manager 133 KB, the Caveat variable font 75 KB, jQuery 30 KB, two more fonts about 50 KB).

Final 12-page check after `5f2455eee` (2026-11-21, PageSpeed API, phones, median of 5; the 20 November baseline is in brackets):

| Site | Home | Other pages |
|---|---|---|
| Mama's | 94 (98); runs 91 to 95, 97 earlier the same day | Shop 91 (86), runs 90 to 96, 92 earlier; product 92 (89); basket 67 (63) |
| Indus | 91 (91) | Wholesale 95 (95); Brands 97 (96); Contact 94 (95) |
| Eye Care | 91 (89) | Shop 94 (91); product 81 (76); Contact 99 (97) |

Mama's Home sits between 91 and 97 run to run (page cache and phone simulation noise), so a gain or loss of a few points on Home is not a regression.

`bundle` against `inline` on Mama's after the Stage C release (2026-11-20, PageSpeed API, phones, median of 5, raw runs `E:/sgs-tmp/cc-plan/psi/bundle-trial-*`; database backed up as `mamasmunches.com-20261120-115151-bundle-trial.sql.gz`, switched back to `inline` straight after): Home 97 (`inline` 98), HTML 67 KB; Shop 87 (`inline` 86), HTML 55 KB (`inline` 134 KB), LCP 3.30 s either way. Mama's stays on `inline`.

- **What holds Shop's LCP now (2026-11-20):** not the HTML's size. Lantern (Lighthouse's simulator) replays on a throttled phone every request that finished before the LCP it observed, and on Shop that is about 700 to 750 KB in either mode: about 330 KB of scripts (Google Tag Manager 133 KB, jQuery 30 KB, about 40 small SGS and WooCommerce scripts), about 140 KB of other images, 50 to 130 KB of fonts (the Caveat variable font alone is 76 KB) and the page itself (`bundle` moves the CSS from the HTML into two files, so the sum stays the same). The observed LCP is about 1.0 s: the image arrives at about 0.79 s and paints about 0.23 s later (element render delay), and in that gap Tag Manager, jQuery, Caveat and about 20 scripts finish, so they are counted. Two image faults add about 90 KB: a below-the-fold promo image (`photo-gift-heart-1`) loads eagerly, and two images whose only AVIF copy is smaller than the size a phone asks for are fetched as the original JPEG (about 50 KB each).

- **What held Shop's LCP before the scrim fix:** the LCP element is the first product card's image (eager, `fetchpriority="high"`, 14 KB AVIF). It finished downloading about 0.2 s in, then waited about 2.1 s to paint (element render delay; about 0.2 s after the fix, the rest of the wait now being the image's late start behind the HTML). The largest main-thread cost is Style & Layout (about 0.7 s), the browser matching Mama's per-instance CSS (the page's HTML is about 1 MB raw with its CSS inline); the longest single tasks are Google's `gtag/js` (176 ms), `header-behaviours/view.js` (116 ms) and `gtm.js` (83 ms).

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
2. **Shop LCP (Mama's Shop 91 to 92; Bean ruled the 95 target arbitrary on 2026-11-21, so the levers below are optional).** Done: the loop image rule (`cd9718b2a`), the scrim fix (`b43b1ff18`), the head preload of the lead image (`82124d18d`; a real throttled phone requests the image with the first HTML chunk, `E:/sgs-tmp/stagec/preload-timing.mjs`), and a `bundle` trial (2026-11-20, no gain; Results). What holds the score is everything that finishes before the observed LCP (Results, "What holds Shop's LCP now"). Built and live in `4841f0dfa` (render check clean on local-mamas and local-indus; local-eye-care not run, the code being the same on every site): Shop 86 to 92: (a) every upload's main file gets a full-size AVIF (else WebP) copy that its srcset uses (Spec 49 FR-49-42; existing uploads need `wp sgs media modernise` on each site after the release, with a database backup first; Bean approved running it on eye-care-test too, 2026-11-20); (b) a throttled-phone trace of Shop (4x CPU, Slow 4G) found the image waiting 0.6 to 0.8 s to paint behind one first layout (about 0.4 s of a 0.5 s task) and the restyles two root scripts forced: WooCommerce's small-screen stylesheet now joins the inline run (Spec 32 FR-32-32), `.sgs-js` prints in the head, and an unread theme script is deleted (local Shop style time 478 ms to 379 ms at 4x). The first layout's cost has no single cause found (text-wrap, container queries, fonts and images each ruled out by switching them off). The copy command ran on all four sites (Mama's 20 attachments, sandybrown 528, indus-test 45, eye-care-test 68, Bean's approval for Eye Care). Caveat checked and left as it is (2026-11-21): Mama's draws it at two weights, normal (rendered at 500, 164 text runs across eight pages) and bold 700 (the cookie-box builder's pick summary on Home), so the variable file (75.0 KB) is already the smallest that draws both; limited to 500 to 700 it is 75.1 KB, and two single-weight files are 102.2 KB. A single 500 file (51.0 KB, about one PageSpeed point on Shop) would need that summary drawn at normal weight, a design change for Bean. Karla (400 to 900) and Young Serif (400 to 700) are each used at three or more weights, so their variable files are right too. Framework follow-up (not started): no check compares the weights a site draws with the font files it loads; a check per client (weights used, from the rendered pages, against the snapshot's font faces) would catch a variable file where one weight is used. Deferred by Bean (2026-11-21) together with splitting every font into everyday and rare characters (about 28 KB less on Mama's); the ready-to-paste prompt is `.claude/prompts/2026-11-21-site-speed-leftovers.md`. Google Tag Manager stays as it is (Bean's ruling).

   Follow-up (not started): on a template page (Shop, an archive) there is no saved page to measure, so `SGS_Media_Priority::above_fold` falls back to `Sgs_Motion_Fold::FOLD_SECTIONS` (the first two sections), and Shop's second section holds the whole product grid and the gift promo after it: the promo image (`photo-gift-heart-1`) loads eagerly though it sits 2,000 to 2,500 px down at 375, 768 and 1440 (`E:/sgs-tmp/stagec/fold-pos.mjs`). A fix changes the fold rule shared with motion (Spec 38A §9), so it needs its own design. Its cost drops from 49 KB to about 12 KB once its full-size AVIF copy exists.
3. **Footer JavaScript: done in `cd9718b2a`; gate added 2026-11-19.** SGS's own classic frontend scripts print `defer` (served Shop HTML checked: `sgs-touch-input`, `sgs-js-flag`, `sgs-nav-accessibility` and the five `sgs-shop-filters*` handles, beside the ones that already deferred). Render-blocking is 0 ms on Mama's Home and 50 ms on Shop (WooCommerce's `woocommerce-smallscreen.css`). `plugins/sgs-blocks/scripts/check-script-strategy.py --check` (fast tier, with its `--self-test`) refuses a front-end `wp_enqueue_script`/`wp_register_script` in `plugins/sgs-blocks` or `theme/sgs-theme` that loads a file without a `strategy`; admin, editor, customiser and login hooks pass, and its `EXCEPTIONS` table names each script left blocking on purpose with the reason: the WooCommerce Blocks basket and checkout helpers (`sgs-checkout-delivery-cards`, `sgs-checkout-payment-loading`, the commerce-blocks front end, `sgs-gift-card-checkout`), `stripe-js` on `sgs/form` payment pages, and the editor-only `sgs-motion-defs`. It finds a call's comments through the shared PHP tokeniser (`scripts/lib/identity_scan.py::php_tokens`, so a `//` inside a URL string hides nothing) and takes the hook from the innermost function or closure around the call. On `main` it reads 55 calls with 0 blocking; a planted blocking enqueue in `theme/sgs-theme/inc/shop-chosen-filters.php` fails it.
4. **Stage C: shrink per-instance CSS at source: done, released in `82124d18d`.** Plan (archived): `plans/archive/2026-11-19-stage-c-per-instance-css.md`. Task 1 found the Shop style cost was two `:has()` scrim rules (fixed in `b43b1ff18`); Tasks 2 and 3 cut the per-instance CSS 15 to 34% (Results); Task 5 is the head preload; Task 6 lowered the `sites/<client>/stage-c.json` baselines.
5. **Font fallback consolidation.** `font_fallback_filter_stacks` (theme-origin stacks with their own faces) and `font_fallback_preset_overrides` (every preset, from the merged settings) both insert the fallback name; the override covers what the filter does on the front end, while the filter also reaches the editor. Fold them into one source of the insertion.
6. **Quick wins (2026-11-20).** (a) Mama's basket 33 to 63 (67 on 2026-11-21): WooCommerce's basket block needs every payment method's script before it starts (`Payments/Api.php::add_payment_method_script_dependencies`), and taking the wallet buttons off the basket did not stop Stripe loading (tried on the live shop with a backup, then restored), so the basket now holds only the Stripe.js the plugin injects until the shopper's first scroll, tap or key (Spec 27 FR-27-BASKET-STRIPE-HOLD, switch on for Mama's; no Stripe request before interaction, 78 after with the wallet buttons shown, journey 6 of 6). What holds the 63: the LCP element is the empty basket's message, drawn by WooCommerce's block script, so the simulation waits for every script that block needs (LCP 10.4 s). What a shopper still pays after the first move (2026-11-20, `E:/sgs-tmp/stagec/basket-real-cost.mjs`: Chromium at 4x CPU slowdown with cross-site frames in the page's process, as on most Android phones; basket with one product; long-task time in the 15 s after the first scroll, median of 3): about 9.9 s with Stripe, with single freezes of 1.1 to 1.7 s; 4.2 s with only hCaptcha blocked; 0.06 s with Stripe blocked. Desktop Chrome runs the frames in their own processes and shows none of it. Checkout loads Stripe too, so it pays the same. Stripe Support can switch hCaptcha off for the account, about 5.8 s of the 9.9 s: the message is drafted and Bean's to send (not sent). (b) Indus Contact 72 to 95: the hero text was saved with `allowLcpFade` (from the draft), which let its load entrance start invisible; removed on the three blocks with Bean's OK (indus-test backed up), so it starts at opacity 0.01 and Google counts it at once. (c) Eye Care product 72 to 91 (2026-11-21): its test site moved to Payment Plugins for Stripe (Spec 27 design principle 8; test mode, its own test keys, the old plugin deactivated) and its buy box's `expressLoad` is `interaction`, so Stripe.js, hCaptcha and the wallet frames load after the first scroll or tap (0 Stripe requests before, 55 after, `E:/sgs-tmp/stagec/ec-wallet-after.mjs`).
7. **Indus: gallery lightbox inside a mega panel: done, released in `82124d18d`.** `src/shared/nav-interactivity/inner-dialog.js::keyBelongsToInnerDialog` hands every key pressed in a dialog inside a mega panel or the nav drawer to that dialog; live, Escape closes the lightbox, the Brands panel stays open and focus returns to the gallery image (`E:/sgs-tmp/stagec/lightbox-close.mjs`).
8. **Stage C tidy-up: done (2026-11-20).** `plugins/sgs-blocks/includes/helpers-shared-rules.php::sgs_shared_rules` builds a group's rules once (the minted class replaces the placeholder in the text), the container wrapper rebuilds its attributes once after both shared band groups, and the button's pressed-look class is minted by `sgs_shared_rules` through `helpers-button-shared-rules.php::sgs_button_press_shared` (`sgs_button_press_rule` deleted). `stage_c.py --compare` shows "same" on the six pages with the new code synced to the mirrors; the Stage C, button and preload PHP suites pass (63 tests).

## Found along the way

- **Render check port race:** fixed on `main` by the render-check session (`e82c9926d`, ports claimed as each copy is made).
- **Deploys from Git Bash fail the media guard:** Git's MSYS `ssh.exe` mangles the guard's 9.7 KB export command; Windows OpenSSH runs it. Deploy from PowerShell (auto memory `windows-shell-gotchas`).
- **Hard-coded font in a block stylesheet:** in `plugins/sgs-blocks/src/blocks/product-card/style.css`, `.product-card--live .price--pct-off` and `.product-card--live .product-card__stock` set `font-family: 'Inter', sans-serif` directly (a client value in block CSS, Spec 32), so they bypass the theme's font presets.
