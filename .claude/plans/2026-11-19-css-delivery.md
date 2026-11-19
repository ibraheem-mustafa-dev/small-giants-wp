---
status: active
doc_type: plan
created: 2026-11-19
---

# CSS delivery: no render-blocking stylesheets on any SGS site

Spec: Spec 32 FR-32-32 (shared stylesheets as order-preserving runs), FR-32-11 (page-specific CSS, `head` by default); Spec 01 §Fonts (size-matched fallback on every font preset). Research: `~/.claude/memory/research/2026-11-19-css-delivery-architecture.md`.

## Where it stands

Built, reviewed and live on sandybrown, mamas-test, indus-test and eye-care-test (release `45aef2042`, deployed 2026-11-19 14:32 to 14:35); the review fixes are on `main` after that release and not yet deployed. eye-care-clone-test still runs `c7b9372ff` (2026-11-02).

- **What it does:** each run of consecutive own-origin, media-all stylesheets is folded into its first handle (file content, then inline additions), so the cascade is unchanged (`plugins/sgs-blocks/includes/class-sgs-css-delivery.php::Css_Delivery`, on the `wp_print_styles` action at the last priority and `wp_footer` priority 2). Page-specific CSS prints inline in the head (`sgs_css_output_mode` default `head`). Every font preset carries its size-matched fallback (`theme/sgs-theme/inc/font-fallback.php::font_fallback_preset_overrides`), which removed the font-swap layout shift the faster first paint exposed.
- **Delivery mode per site (`sgs_css_shared_delivery`, SGS → CSS Output):** framework default `inline` (every stylesheet in the page). Saved per site on 2026-11-19: `inline` on sandybrown, indus-test, eye-care-test and eye-care-clone-test; `bundle` (one cached file per run) on mamas-test, by Bean's ruling after measuring both on the live shop. Mama's database was backed up before each write (`~/backups/db/mamasmunches.com-20261119-142740-before-css-delivery-option.sql.gz`, `…-143919-before-css-bundle-trial.sql.gz` on the server).

## Results (PageSpeed API, phones)

| Page | Before (2026-11-19 morning) | `inline` | `bundle` |
|---|---|---|---|
| Canary Home (median of 3) | 92, render-blocking 1.30 s | 98, 0 ms | 97, 250 ms |
| Canary Shop (median of 3) | 90, 1.60 s | 95, 400 ms (footer JavaScript) | 94, 1.0 s |
| Mama's Home (median of 5) | 94 (median of 3), 1.55 s | 90, 0 ms, HTML 137 KB | **95**, 300 ms, HTML 72 KB |
| Mama's Shop (median of 5) | 82 (median of 3), 1.75 s | **86**, 100 ms | 82, 1.05 s |

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

1. **Harden `bundle` mode (Mama's runs it).** (a) Every `save_post` bumps the CSS epoch and `sgs_css_gc` deletes every older file at once, so HTML cached anywhere but LiteSpeed (a CDN, an HTML-caching plugin) can point at a deleted bundle and render unstyled: keep the previous epoch's files for a grace period (for example 24 hours) before deleting. (b) A run that holds per-page inline CSS (global styles' block additions, `core-block-supports`) hashes differently on every page, so each URL writes its own file: split per-page inline handles out of the bundled part, or key the file on the handle list and file times rather than the joined text. (c) Every uncached request reads and joins every stylesheet file: cache each run's CSS in a transient keyed on handles plus `filemtime`. Done when `wp-eval-css-delivery.php` covers each case and Mama's still scores Home 95 / Shop 82 or better.
2. **Shop image loading (Bean approved).** Mama's Shop is 82 with `bundle` (86 with `inline`), short of 95. Its LCP is the first product card's 14 KB image, competing with five other eager images and three fonts (27, 25, 74 KB). In `plugins/sgs-blocks/includes/media/class-sgs-media-priority.php::resolve`, images inside a product or post loop load eagerly only for the first three items (WordPress core's `wp_omit_loading_attr_threshold`), the rest lazily; check whether the 74 KB font needs to load before first paint. Done when Mama's Shop scores 95 or better (median of 5) with the journey check passing.
3. **Footer JavaScript counted as render-blocking.** On Shop, 18 scripts still count (WordPress `wp-*` helpers, WooCommerce, SGS's `sgs-shop-filters*`, `nav-accessibility`, `touch-input`, `js-flag`); on Mama's Home, Google Analytics, `fx-marquee.js` and a block `view.js` are the longest tasks (total blocking time about 185 to 290 ms). Load SGS's own scripts with `wp_enqueue_script( …, array( 'strategy' => 'defer' ) )` where their dependants allow. Done when render-blocking is under 300 ms on Mama's Home and Shop.
4. **Stage C: shrink per-instance CSS at source.** Mama's Home per-page CSS is 415 KB raw: 3,200 rules but 993 distinct bodies (one nav hover colour 217 times, the container content width about 240 times). Stop emitting values a block's stylesheet already applies, and share one rule across instances with identical settings; build the migration-method detector first (`.claude/skills/migration-method/SKILL.md`). This is the lever that lets one delivery mode win on every page. Its own plan.
5. **Font fallback consolidation.** `font_fallback_filter_stacks` (theme-origin stacks with their own faces) and `font_fallback_preset_overrides` (every preset, from the merged settings) both insert the fallback name; the override covers what the filter does on the front end, while the filter also reaches the editor. Fold them into one source of the insertion.

## Found along the way

- **Render check port race:** fixed on `main` by the render-check session (`e82c9926d`, ports claimed as each copy is made).
- **Deploys from Git Bash fail the media guard:** Git's MSYS `ssh.exe` mangles the guard's 9.7 KB export command; Windows OpenSSH runs it. Deploy from PowerShell (auto memory `windows-shell-gotchas`).
- **Hard-coded font in a block stylesheet:** in `plugins/sgs-blocks/src/blocks/product-card/style.css`, `.product-card--live .price--pct-off` and `.product-card--live .product-card__stock` set `font-family: 'Inter', sans-serif` directly (a client value in block CSS, Spec 32), so they bypass the theme's font presets.
