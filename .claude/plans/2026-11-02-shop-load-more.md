# Shop "Load more" mode (FR-30-3b)

Plan date 2026-11-02. Executed via `/subagent-driven-development` (Sonnet implementers; the main session deploys). Governing spec: `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` Part 3 (Spec 30), FR-30-3. Test site: `eye-care-test` (https://darkcyan-grouse-898606.hostingersite.com/shop/, 17 products), a hand-built site: set test values with theme mods and restore them in the same command (memory: restore live fixtures in the same command). Do not edit `plugins/sgs-blocks/src/blocks/post-grid/*` this round (another session owns it).

## 1. Goal and done

A shop and product-category archive can run in "Load more" mode: the first load shows 24 products (mobile figure) and, on wide screens, tops itself up to about 120; a "Load more" button adds one batch of 24 with "Showing N of M products" beside it; filters, sorting and chips keep working and stay in the URL; every load rewrites the URL with `history.replaceState` so Back from a product returns to the full loaded list scrolled to the clicked product; with JavaScript off the existing "Next page" link is the fallback. Done = every proof in section 7 passes on the live test site, and the FR status lines in section 6 read `built`.

Not in scope: infinite scroll on the shop, post-grid or card-grid changes (section 8), a per-device server render, a new REST route.

## 2. Research (cited)

- Baymard's study, as written up at https://www.smashingmagazine.com/2016/03/pagination-infinite-scrolling-load-more-buttons/ : pagination was perceived as slow and users browsed less of the list; "Load more" fixed the pagination problems and users read items more closely than with infinite scroll; desktop categories lazy-load 10 to 30 products at a time with the "Load more" threshold at 50 to 100 items; mobile loads only 15 to 30 products before the button, all at once; over 90% of benchmarked "Load more" sites send Back to the top of the list, and Baymard says the user must return to the same spot after visiting a product.
- Baymard's own pages: https://baymard.com/blog/return-same-place (return users to the same place in the list; update the URL on each click so Back lands correctly), https://baymard.com/blog/number-of-items-loaded-by-default , https://baymard.com/blog/back-button-expectations . These are paywalled summaries; only the Smashing text and search snippets could be read in full. The figures above come from Smashing's reproduction of Baymard.
- Two places where the owner's choice differs from the source, both deliberate: (a) desktop first load of about 120 is above Baymard's published 50 to 100 threshold; it is a setting (default 120) so it can be lowered; (b) Baymard names `pushState`; the owner chose `replaceState`, which keeps Back meaning "leave the list" and avoids a history entry per click. "Showing N of M" is the owner's addition, not in the source.

## 3. Ground truth and decisions

| # | Finding (evidence) | Decision |
|---|---|---|
| D1 | `theme/sgs-theme/templates/archive-product.html` runs `woocommerce/product-collection` with `query.inherit:true` inside a router region; filters re-render from server HTML. `plugins/sgs-blocks/src/blocks/product-card/render.php` emits `data-wp-interactive`, `data-wp-on--submit`, `data-wp-init` (add-to-basket and option picker). Cards appended with plain DOM code are never hydrated by the Interactivity API, so the add-to-basket would be dead on loaded cards. | The recommended "fetch next page and append cards" is replaced by "ask the Interactivity router for the same URL with one more batch". The button calls the router `navigate(url, { replace: true })`; the router swaps the region and hydrates every card, and writes the URL with replaceState itself. Server query, filters, sort and stock rules stay authoritative. Probe P1 records the evidence. |
| D2 | One mechanism does first load, Load more and Back: URL parameter `sgs_batches=k`. Server renders `k` batches of `P` products starting at `paged` (`posts_per_page = k*P`, `offset = (paged-1)*P`) in one response. | After Back the browser re-requests the replaced URL and gets all `k` batches in the HTML, no flash, no client re-fetch. `k` is clamped to 1..8 and `k*P` to 200 server-side (public URL, so abuse-capped). |
| D3 | Server cannot know the device (page cache is keyed by URL; Safari/Firefox send no mobile hint). | Server page size `P` is the mobile figure (default 24). On a wide screen (min-width 1024px and fine pointer) JS, after load and idle, navigates once with `replace` to `sgs_batches = ceil(desktop/P)` (default 5 = 120). First paint stays small, existing cards never move (new ones append below). Rejected: cookie or client-hint server variation (cache variation, partial browser support). |
| D4 | No-JS fallback: core `query-pagination-next` is unchanged. | JS reads the Next link, builds a real `<button>` and the count text, hides the numbers and Next link (`hidden`, still in the HTML for crawlers), keeps Previous visible (a visitor landing on `paged=3` can still go back). No new server markup. |
| D5 | Setting location. `theme/sgs-theme/inc/shop-toolbar-settings.php::register_shop_toolbar_customizer_settings` shows the pattern: theme mods in the existing "Shop Filters" Customizer section, one file per concern, localised to JS via `wp_add_inline_script` (see `shop-chosen-filters.php::enqueue_shop_chosen_filters`). | New file `theme/sgs-theme/inc/shop-load-more-settings.php`. Mods: `sgs_shop_pagination_mode` (`pages` or `load_more`, default `load_more`: pre-production, decide on merit), `sgs_shop_batch_size` (12 to 60, default 24), `sgs_shop_desktop_first_load` (24 to 200, default 120, rounded up to a multiple of the batch), `sgs_shop_load_more_label`, `sgs_shop_load_more_count_label` (`Showing %1$d of %2$d products`), `sgs_shop_load_more_loading_label`. Every mod has a Customizer control and a sanitiser. Template perPage 12 is ignored by `inherit:true`; the size comes from the `loop_shop_per_page` filter (P2 confirms). |
| D6 | Shared module for later post-grid reuse. The theme cannot import `plugins/sgs-blocks/src`; `plugins/sgs-blocks/includes/time-text.php` registers a plugin script module with `wp_register_script_module`. | New plugin module `@sgs/load-more-core` (`plugins/sgs-blocks/assets/js/sgs-load-more-core.js`): pure helpers only (`withBatches(url, k)`, `announce(region, text)`, `rememberAnchor` / `restoreAnchor`, `formatCount`). The theme module `@sgs/shop-load-more` depends on it. Post-grid keeps its own `announce` in `view-fetch.js` until section 8. |
| D7 | Filter change must reset to batch 1. WC filter navigations build the URL themselves. | Probe P3 checks whether filter hrefs carry `sgs_batches`. If not, nothing to do. If they do, the module compares a filter signature (query string without `paged` and `sgs_batches`) after every router navigation and, when it changed while `sgs_batches` > 1, navigates once more without it. Ship the guard only if P3 shows the carry. |
| D8 | Canonical and SEO. Paged URLs stay crawlable through the Next link. | `sgs_batches` URLs must canonicalise to the unparameterised URL (task S3 checks the `<link rel="canonical">` on `?sgs_batches=3` and strips the parameter via `get_canonical_url` filter if present) and carry `robots` noindex only if a SEO plugin does not already handle it. |
| D9 | Back-scroll. | On click of a product link inside the grid, store `{ id, offsetTop }` in `sessionStorage` under the key `sgs-lm:` + path + sorted query string. On load, when the navigation type is `back_forward` and the key exists, set `history.scrollRestoration = 'manual'`, scroll the `.post-<id>` card into view (centre), remove the key. bfcache restores (`pageshow` with `persisted`) are left to the browser. Product id comes from the `post-<id>` class on the product-template item (P2 confirms). |
| D10 | Accessibility. | After each load focus moves to the first new product's link; a polite live region (`role="status"`) announces "24 more products loaded. Showing 48 of 100 products."; at the end the button is removed and "All 100 products shown." is announced; button is at least 44px high, visible focus, `aria-busy` while loading, reduced-motion respected (no scroll animation). |
| D11 | Performance. | One module (target under 4 KB gzipped) plus the core helpers (under 1.5 KB), loaded only when the mode is on and `is_shop() || is_product_taxonomy()`; CSS under 1 KB, token-driven, no inline `style` attributes (Spec 32). Card images are already `loading="lazy"` except the priority ones (`product-card/render.php`). Proof P-PERF measures both budgets. |

## 4. Dependency graph

B0 (probes) -> B1 (server + settings) -> B2 (client + CSS) -> B3 (spec, docs, QA script, final proof). B1 and the QA-script half of B3 touch different files, so one implementer can write the check script while B1 runs, but B2 needs B1 deployed. Critical path is B0 -> B1 -> deploy -> B2 -> deploy -> B3. Estimates are the smallest plausible, first-attempt, no historical calibration: B0 about 10 min, B1 about 20 min, B2 about 25 min, B3 about 15 min, plus deploys.

First action (under 5 minutes, no dependencies): run probe P2 (a `curl` count).

## 5. Batches

### Batch 0: probes (main session or one Sonnet, read-only, no deploy needed)

Record each result as one line under "Probe results" at the bottom of this plan file and commit that edit.

- **P1 (hydration).** In the live page console (Playwright against the test site), fetch `/shop/?paged=2`, import the first `<li>` of the product grid into the first grid, click its add-to-basket or option control. Expected: it does nothing (unhydrated). This is the evidence for D1. Pass: result recorded either way (D1 stands regardless, because it also gives Back one code path).
- **P2 (server).** `curl -s https://darkcyan-grouse-898606.hostingersite.com/shop/ | grep -o 'post-[0-9]\+' | sort -u | wc -l` gives the cards per page now (expected 12). Also record the product-template item class (`post-<id>`), the `next` link href, and whether `loop_shop_per_page` is honoured (`ssh hd`, `wp eval 'var_dump(apply_filters("loop_shop_per_page",12));'` using the path in `.claude/dev-setup.md`).
- **P3 (filters).** Open `/shop/?sgs_batches=3` in Playwright, tick a filter, read `location.search`. Pass condition recorded: carried or dropped (decides D7 guard).
- **P4 (router API).** Read the installed source: `plugins/` or WP core `wp-includes/js/dist/script-modules/interactivity-router/index.js` on the canary (`ssh hd`, find path) and record the exact `navigate` option names (`replace`, `force`, `html`, announcements) and how the router module is imported (dynamic import then `store('core/router')`). Memory: verify third-party API shapes against installed source.

### Batch 1: server, settings, shared-module registration (one Sonnet implementer, `/sgs-wp-engine`)

Files:
- Create `theme/sgs-theme/inc/shop-load-more-settings.php` (under 500 lines; namespace `SGS\Theme`): Customizer registration (copy the field-array loop shape of `shop-toolbar-settings.php::register_shop_toolbar_customizer_settings`, same section), sanitisers, helper `shop_load_more_enabled(): bool` (mode is `load_more` and `is_shop() || is_product_taxonomy()`), `loop_shop_per_page` filter (priority 20) returning the batch size when enabled, `pre_get_posts` on the main product query reading `sgs_batches` (`absint`, clamped 1..8, `k*P` capped at 200) and setting `posts_per_page = k*P` and `offset = (paged-1)*P` (and unsetting `paged` for that query), `get_canonical_url` handling (D8), and `wp_enqueue_script_module` for `@sgs/shop-load-more` with the localised settings (use `wp_interactivity_config` or a JSON `<script type="application/json">` the module reads; no inline `style`).
- Modify `theme/sgs-theme/functions.php`: one `require_once __DIR__ . '/inc/shop-load-more-settings.php';` beside the other `shop-*` includes.
- Create `plugins/sgs-blocks/includes/load-more-core.php`: `wp_register_script_module( '@sgs/load-more-core', SGS_BLOCKS_URL . 'assets/js/sgs-load-more-core.js', array(), $version )`, same shape as `plugins/sgs-blocks/includes/time-text.php`; require it where time-text is required.
- Create `plugins/sgs-blocks/assets/js/sgs-load-more-core.js` with the pure helpers of D6 and unit tests `plugins/sgs-blocks/tests/js/sgs-load-more-core.test.js` (project test runner; pick the one already used under `plugins/sgs-blocks/tests/`).

Behaviour (exact): with the mode `pages` nothing changes anywhere. With `load_more`, `/shop/` returns the batch size of cards; `/shop/?sgs_batches=3` returns three batches; `/shop/?sgs_batches=3&paged=2` starts at product `P+1`; `?sgs_batches=99` is clamped; `?sgs_batches=abc` is treated as 1; filters and sort params keep working with it.

Proof (after the main session deploys: `python plugins/sgs-blocks/scripts/build-deploy.py --target eye-care-test`; set `wp theme mod set sgs_shop_batch_size 4` and `sgs_shop_desktop_first_load 8` over `ssh hd` for the test, and reset afterwards in the same command):
1. `curl -s "$URL/shop/" | grep -o 'post-[0-9]\+' | sort -u | wc -l` prints 4.
2. Same for `?sgs_batches=3` prints 12; `?sgs_batches=99` prints 17 (all) and the response is 200.
3. `?sgs_batches=2&paged=2` first card differs from page 1's first card and equals the fifth card of the unparameterised list.
4. With a price filter applied (`?min_price=..&max_price=..` from the live filter) plus `sgs_batches=2`, the card count equals min(8, filtered total).
5. Mode `pages`: `curl` shows 12 cards on `/shop/` (unchanged) and the module is absent: `curl -s "$URL/shop/" | grep -c 'sgs/shop-load-more'` prints 0.
6. `<link rel="canonical">` on `?sgs_batches=3` has no `sgs_batches`.
7. Unit tests for the core helpers pass: `cd plugins/sgs-blocks && npm test -- sgs-load-more-core` exits 0 (run from PowerShell).
8. `php -l` on both new PHP files, `composer`/PHPCS per `.claude/dev-setup.md`, and `python scripts/check-md-wrap.py --check` exit 0.

### Batch 2: client behaviour and styling (one Sonnet implementer, `/sgs-wp-engine`)

Files:
- Create `theme/sgs-theme/assets/js/sgs-shop-load-more.js` (ES module, under 400 lines, imports `@sgs/load-more-core`; dynamic-imports `@wordpress/interactivity-router` on first use, API per P4). Register it in `shop-load-more-settings.php` as the script module `@sgs/shop-load-more` with a dynamic dependency on the router and a static one on the core.
- Create `theme/sgs-theme/assets/css/shop-load-more.css` (loaded conditionally with the module, tokens only).
- Modify `theme/sgs-theme/inc/shop-load-more-settings.php` for the style registration only.

Behaviour (exact):
1. Stateless: every time the collection region exists or is replaced (event delegation on `document` plus a `MutationObserver` on the region parent, as `theme/sgs-theme/assets/js/sgs-shop-filters-chosen.js` does), read the DOM: loaded = count of `.post-<id>` items in the product template; total = the number in the results-count text, or from `query-pagination` data when absent (P2 settles which); next = the `query-pagination-next` href; current batches = `sgs_batches` in the URL, else 1.
2. Build `<div class="sgs-shop-load-more">` after the pagination nav: `<button class="sgs-shop-load-more__button" type="button">` (label from settings) and `<p class="sgs-shop-load-more__count" role="status">` ("Showing N of M products", using `formatCount`). Hide numbers and Next via `hidden`; keep Previous. When loaded >= total, build nothing and hide nothing extra.
3. Click: set `aria-busy="true"`, button `disabled`, label becomes the loading label; build the URL from the Next link's href with `sgs_batches = current + 1` and `paged` taken from the current URL (`withBatches`); call the router `navigate(url, { replace: true })`; on resolve rebuild per step 2, focus the first new product's link, announce per D10. On failure restore the button and announce "Could not load more products. Try again." (the plain Next link still works).
4. Desktop top-up (D3): once, on first idle (`requestIdleCallback` with a timeout fallback), if `matchMedia('(min-width: 1024px) and (pointer: fine)')` matches, `sgs_batches` is absent and total > loaded, navigate with `replace` to `sgs_batches = ceil(desktopFirstLoad / batch)` clamped to what remains. No focus move, no announcement for this top-up.
5. Back-scroll (D9) with `rememberAnchor` on product-link click and `restoreAnchor` on load. Reduced motion: use `scrollIntoView({ block: 'center' })` with no smooth behaviour.
6. Filter reset guard (D7) only if P3 showed the carry.
7. Never use `innerHTML`; the router performs the swap. No inline styles; state via classes `sgs-shop-load-more--busy` and the `hidden` attribute.
8. CSS: button uses the existing shop button tokens (copy the custom properties used by `theme/sgs-theme/inc/shop-controls-look-settings.php::output_shop_controls_look_style`), min-height 44px, visible focus ring, centred, count text beside it on wide screens and below it at 375px, hover brightens, never darkens.

Proof (main session deploys, then with batch 4 / desktop 8 on the test site; Playwright script `scripts/computed-route/shop-load-more-check.mjs`, written in B3 but runnable by the implementer from this spec; run `node scripts/computed-route/shop-load-more-check.mjs --target eye-care-test --case <name>`, each case exits 0 on pass):
- `first-mobile` (375px): 4 cards, button text "Load more", count "Showing 4 of 17 products", `.page-numbers` hidden.
- `first-desktop` (1440px): ends with 8 cards without a click, URL ends `sgs_batches=2`, no new history entry (`history.length` unchanged).
- `click`: one click gives 8 then 12 cards; URL gets `sgs_batches` 2 then 3; `history.length` unchanged; focus is on the first new card link; the live region text equals the expected sentence; add-to-basket on a LOADED card works (the cart count increases).
- `last`: after the final click the button is gone, the count reads "Showing 17 of 17 products" and the all-shown sentence is announced.
- `back`: from 12 loaded, click a card in the third batch, `page.goBack()`; 12 cards present, the clicked card centred within 100px of the viewport middle, URL still has `sgs_batches=3`.
- `filter`: with 12 loaded, tick a filter; the grid shows batch 1 of the filtered set (or all if fewer than 4) and `location.search` has no `sgs_batches` greater than 1; sort change behaves the same; removing a chip keeps working.
- `nojs`: JavaScript disabled in the browser context: 4 cards, the Next link present, following it shows cards 5 to 8.
- `a11y`: axe on `/shop/` with 12 loaded reports 0 violations; keyboard-only run reaches the button, activates it with Enter and Space; button height >= 44px at 375px.
- `perf`: transferred JS and CSS for the two new files recorded; page totals within the budgets (< 100 KB CSS, < 50 KB JS); no CLS above 0.05 across the top-up (Playwright `PerformanceObserver` layout-shift sum).

### Batch 3: spec, docs, check script, close (one Sonnet implementer)

Files:
- Modify `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`: directly under FR-30-3 add `#### FR-30-3b -- Shop "Load more" mode` with the behaviour of section 1, D2 to D4 and D9, the settings of D5, and a `Done when:` equal to the batch 2 proofs. Status line: `Status: built` once the proofs pass, else `Status: not built` (this plan ships it as `not built` in the first commit and flips it in the last). Also amend FR-30-3's `Done when` sentence "persist across a paginate-away-and-back" with "and across Load more". Keep prose on one line per paragraph. Check first whether `FR-30-3b` is free: `grep -n "FR-30-3b" .claude/specs/*.md` must print nothing.
- Create `scripts/computed-route/shop-load-more-check.mjs` implementing the cases above (credentials from `.claude/secrets/eye-care-test.env`; Playwright; one headed Chrome at a time per memory).
- Modify `theme/sgs-theme/CLAUDE.md` (the theme's own CLAUDE.md): one line pointing to `inc/shop-load-more-settings.php` and the `sgs_batches` parameter.
- Modify `.claude/LEDGER.md`: replace the current-front line for this work with the status (replace, never append).
- Run `python scripts/check-no-client-names.py --check`, `python scripts/check-md-wrap.py --check`, `python .claude/hooks/handoff-preflight.py --check`, `lint-spec-drift.py` (citations by symbol).

Proof: all of `grep -n "FR-30-3b" .claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` finds the heading and a `Status: built` line; the full check script (`--case all`) exits 0 on `eye-care-test` and the test-site theme mods are restored (`ssh hd "wp theme mod get sgs_shop_batch_size"` prints the original value); `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0.

## 6. FR status lines

| FR | Statement | Status now | Becomes |
|---|---|---|---|
| FR-30-3 | Shop archive UX shell | built | built (Done-when amended) |
| FR-30-3b | Shop Load more mode (this plan) | not built | built after B3 proof |
| FR-30-3b-post-grid | Same mode reusing `@sgs/load-more-core` in post-grid / card-grid | not built | stays not built; section 8 |

## 7. Gates

| Gate | After | Pass | Fail action |
|---|---|---|---|
| G0 | B0 | P1 to P4 recorded; D7 branch chosen | stop, re-plan D1 or D7 |
| G1 | B1 deployed | Batch 1 proofs 1 to 8 | fix server only; do not start B2 |
| G2 | B2 deployed | all `shop-load-more-check.mjs` cases green at 375 and 1440 | fix; Bean looks at the live page at both sizes (FP-13) |
| G3 | B3 | Batch 3 proof; `/qc-council` on the session's diff before handoff | fix before commit |

Risks and answers: router API shape differs on the canary (P4 reads the installed source first); `offset` with `posts_per_page` changes `found_posts` paging maths (proof 3 and 4 test it; the count shown uses `found_posts` of the unparameterised total, which the results-count block already prints); LiteSpeed caches each `sgs_batches` URL separately (harmless, capped at 8 values); a page cache serving a stale grid after products change is the existing behaviour.

## 8. Later tasks (parked, not this round)

1. After the other session finishes with post-grid: replace `plugins/sgs-blocks/src/blocks/post-grid/view-fetch.js::announce` and the `history.replaceState('?pg=')` code in `view-pagination.js::initStandardPagination` with `@sgs/load-more-core` helpers, and give `initLoadMore` the same Back-restore (batches in the URL plus anchor). Record it in `LEDGER.md` as a pointer when the other session closes.
2. Per-device first load on the server (cookie or client hints) only if the top-up flash is judged poor by Bean's eye.
3. "Show previous" for visitors who land on `paged` > 1.

## 9. Delegation

Each batch is one dispatch to `wp-sgs-developer`-style Sonnet work via `/subagent-driven-development` with a task review after B1 and B2 and one whole-branch review at the end. The main session deploys (`build-deploy.py --target eye-care-test`, never `--allow-dirty`), runs the proofs and commits with explicit pathspecs on `main`.

## Probe results

(Filled by Batch 0.)
