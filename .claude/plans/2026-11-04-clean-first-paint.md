# Clean first paint: no page jumps or unstyled parts while a page loads

Plan date 2026-11-04. Status: all seven fixes (C, F-lite, D, G, A, B, E) are built and live on eye-care-test and sandybrown. Found by the Eye Care stream, round 7. Bean: "things tend to look quite broken as the page loads for the first half a second". Bean chose (2026-11-04) to fix every proven cause once in the framework, then add a gate so it cannot come back.

An adversarial council reviewed this plan on 2026-11-04 (veteran builder, delivery lead, front-end performance engineer). Its critiques were fact-checked against the code and the live site. Accepted ones are folded in below. Rejected ones are listed at the end with the reason.

Applies to every client site. Evidence is in `E:/sgs-tmp/r7/flash/`: frame strips, layout-shift records (`ls.json`), waterfalls, delivered HTML, and the JS-off screenshots `nojs-*.png`. Research: `~/.claude/memory/research/2026-11-04-clean-first-paint-block-sites.md`.

## What a clean first paint means here

The first frame already has the final layout and look. Nothing moves, changes size or changes style when stylesheets, images, fonts or scripts arrive, except deliberate motion such as entrances, marquees and hover.

Two measures:
1. Cumulative layout shift (CLS) of 0.02 or less at 375, 768 and 1440 on the fixture pages.
2. The page with JavaScript off looks like the page with it on, as checked by the gate in F.

The second catches look changes that CLS misses. The shop filters at 1440 change style completely but barely move.

## Premises, each marked

| # | Premise | Status | Proof |
|---|---|---|---|
| P1 | The collected stylesheet's file name changes on every request, so it never caches. | PROVEN | Five fetches of eye-care-test `/` gave five names. Two files differ only in `sgs-child-sizing-<8hex>` classes. `includes/helpers-scoped-instance-vars.php::sgs_scope_class_for_root` mints `md5( tag . microtime( true ) . wp_rand() )` when a block has no uid class. Callers: child-sizing, image-controls, fx-path-routes, fx-shape-routes, post-content-lists, product-collection-card-min, product-filter-chips-gap. |
| P2 | Some CSS arrives after the first paint. | PROVEN (the first draft of this plan wrongly said all CSS was blocking) | `theme/sgs-theme/functions.php::defer_non_critical_css` rewrites `sgs-core-blocks` (36 KB), `sgs-utilities` (18 KB), `sgs-extensions` (17 KB) and `sgs-dark-mode` to `media='print' onload="this.media='all'"`, so they apply after paint. Together they hold about 34 header, logo and trust rules. WooCommerce's `wc-blocks-style` is printed in the body (footer), and so is `sgs-toast` on the product page. |
| P3 | Some images the framework prints carry no reserved size. | PROVEN | On `/`, the brand-strip and card-grid `<img>` tags have no `width`/`height`. The header logo has `width` only. `includes/helpers-media.php::sgs_render_media` does add both, through `wp_get_attachment_image`, or for a URL through `attachment_url_to_postid` plus `wp_get_attachment_image_src`. So one branch loses them on these blocks. That branch is not yet identified. |
| P4 | The trust bar's one-row layout exists only after JavaScript runs. | PROVEN | `trust-bar/style-index.css` has no row layout. `assets/css/fx-marquee.css` applies once `src/shared/effects/fx-marquee.js` sets `data-sgs-marquee="on"`. The JS also builds the repeating copies itself (`makeClone`, `data-sgs-marquee-clone`). With JS off at 375 the bar is a four-row black block about 171px tall. CLS is 0.18 on every page at 375, which is most of the measured shift. |
| P5 | The shop filters and the help FAQ change look and structure after paint. | PROVEN | With JS off, `/shop/` at 1440 shows every filter as an open list of plain chips. Live with JS, it shows the black All/Women/Men switch, colour dots and closed groups. The theme scripts `theme/sgs-theme/assets/js/sgs-shop-filters*.js` load at the very end of the HTML and build that look. CLS is 0.584 at 375. On `/help/`, accordion items jump 59px then 10px; its script has not been read yet. |
| P6 | The header logo shows "huge" for a moment. | NOT REPRODUCED, parked | It stays 48x24 with JS off, so the deferred stylesheets do not explain it. The logo's `sgs-rl-*` class is identical across requests and present in the stylesheet each page names, so the council's "class mismatch" theory is disproven. The live HTML is not edge-cached (`x-hcdn-cache-status: BYPASS`). This waits for Bean to name the page, width, browser and whether it is a first or repeat visit; then one Chrome performance trace. Nothing in Done waits on it. |
| P7 | A web font swap reflows headings. | PROVEN, minor | The `h1` on `/` is 475px wide at first paint and 584px after (layout shift 0.001). |

## Fixes, in order of visible gain

**C. Trust bar row from the first paint (P4).** The gain is 0.18 CLS on every page at 375. CSS reserves the final state before JS runs: one row, `overflow: hidden`, the track's final height, no wrapping, items in their settled positions. The JS keeps building the clones and running the animation, because those depend on the measured width, the "below a width" ranges, vertical mode and fade. Reduced motion shows the static row.

First list every block using `sgs_motion_root_has_effect( …, 'marquee' )` or `data-sgs-fx="marquee"`, with its mode. Known: trust-bar and brand-strip. Check google-reviews, trustpilot-reviews and gallery. Apply the same pre-JS rule through `fx-marquee.css`, so every consumer gets it.

**F-lite. The first gate (built right after C, so C's gain is measured).** `scripts/check-first-paint.mjs`, run with Playwright on a fixed page list per test site at 375, 768 and 1440:
- CLS: `PerformanceObserver({ type: 'layout-shift', buffered: true })`, skipping `hadRecentInput` entries, reporting the largest session window (gaps under 1s, window up to 5s). Take the median of 3 loads, plus one throttled load (CPU 4x, about 1.6 Mbps). Fail above 0.02.
- Late CSS: fail on any `<link rel="stylesheet">` or `<style>` after `</head>`, and on any `media='print'` onload swap, unless it is allowlisted with a reason. The allowlist is a data file entry of page plus handle, each with a reason.
- JS-off look check: load each page with JavaScript off and on, and compare screenshots region by region. Report-only at first; it becomes a failure once its noise is known.
- Stylesheet name: fetch two uncached responses and fail when the collected file's name differs (needed from A).

It runs after the upload as a post-deploy verify stage (`build-deploy.py --first-paint`, `.claude/deploy-architecture.md`, Live first-paint gate), because a pre-deploy tier would measure the old live code; it also runs by hand against any site in `scripts/data/first-paint.json`. Built; baselines are recorded in that file and each fix lowers them with `--update-baseline`.

**D. Shop filters and FAQ in their final look before JS (P5).**
- Shop: the filters are WooCommerce `product-filter-*` blocks, and SGS owns only a `render_block` filter on them (`includes/product-filter-look.php`). First step, CSS only: style the server markup into the final look before JS runs. Groups that start closed are hidden behind CSS from the first paint. The gender chips are laid out as the segmented switch. Colour chips become dots. No structural rewrite.
- A PHP restructure into `<details>` is a later option. It ships only behind a structural check that leaves WooCommerce's markup untouched when its shape differs, plus a test against the installed WooCommerce version.
- FAQ: read the accordion script first, then put its final structure into `render.php`.

**G. No late stylesheets (P2).** Built. `sgs-core-blocks`, `sgs-utilities`, `sgs-extensions` and `sgs-dark-mode` each hold first-viewport rules (navigation, buttons, logo tiles, spacing and media utilities, image controls, the `[data-theme]` dark scope) so none is deferred and `defer_non_critical_css` is gone; dark mode switches by attribute as well as media, so a media attribute would be wrong.
- `wc-blocks-style` was enqueued by WooCommerce from a priority-10 `wp_head` callback (styles print at 8), so `functions.php::enqueue_woocommerce_blocks_style_early` enqueues it on `wp_enqueue_scripts`; `Sgs_Toast::request()` enqueues `sgs-toast` while the template renders. The allowlist holds only two third-party payment-plugin sheets on the product page.

**A. Stable scope classes (P1).** Built: `sgs_scope_class_for_root` takes the callable that builds the rules and hashes them; the two anchor-name callers (fx-path, fx-shape) pass `per_instance` so repeats of one seed get a counted suffix. The collector already dedupes identical CSS, and its epoch-based pruning runs together with a full LiteSpeed purge, so no cached page names a deleted file. Design: The minted suffix becomes the hash of the CSS rules it scopes, `md5( prefix | rule text )`, built with a placeholder and then substituted. There are no counters, so render order, double renders, editor and REST renders all give the same class for the same rules. Identical blocks share one class and one rule, which also shrinks the collected file.
- A scope class is never reused: two blocks with the same first-injector rules share one hashed class, so code that reuses whatever `sgs-*-8hex` class is already on the root would cross a second injector's rules over (council fix `bad9c40fb` to `4c5f06ed2`). The fx path and shape routes are the per-instance exception: they pass `per_instance` and take a counted suffix.
- Superseded collected files stay on disk for the page-cache lifetime, so cached HTML never points at a missing file. A deploy that changes rules changes the name once, as expected.
- Before shipping, grep the snapshots, fixtures and motion-QA pages for any selector naming the old `sgs-child-sizing-<hex>` pattern.
- Afterwards, re-measure the page-weight plan's "possible second collected file on /shop/" (`plans/2026-11-03-page-weight-budget.md`, cause 4).

**B. Reserved image boxes (P3).**
- Built: `sgs_image_size_attrs` (`includes/helpers-image-dimensions.php`) reads a real size from attachment metadata, the file header or an SVG viewBox, cached by URL, and `sgs_render_media` plus 11 other printers now print `width` and `height`; the responsive logo prints a ratio-true `height`. `sgs_render_media` never printed dimensions on its URL path (the plan's premise that it did was wrong).
- Find the `sgs_render_media` branch that loses the dimensions on brand-strip and card-grid. Likely candidates: the URL path when `attachment_url_to_postid` fails, or the dimensions being dropped later in the block's own markup rewrite. Fix it at the source.
- Give the responsive logo its `height`.
- Census every other `<img>` printer (about 61 files print `<img>`), and fix only those that print an attachment without both attributes.
- For an SVG: use the viewBox when it has one. Without one, set no guessed attributes and reserve the space with CSS `aspect-ratio`.
- CSS keeps `height: auto`.
- These are HTML attributes, so Spec 32 is unaffected.

**E. Font swap (P7, last). Built.** `plugins/sgs-blocks/scripts/compute-font-fallback-metrics.py` reads unitsPerEm, hhea ascender, descender, lineGap and a frequency-weighted average advance from every woff2 under `theme/sgs-theme/assets/fonts/` (and from Arial / Times New Roman as the local stand-ins) into `assets/fonts/fallback-metrics.json`; `inc/font-fallback.php` prints a `<Family> Fallback` `@font-face` (`src: local()`, `size-adjust`, ascent, descent and line-gap overrides) per theme.json family and inserts the name right after the web font in the stack. Preloads come from the active global styles: the h1's font file and the body font file (one file when they match), replacing the hard-coded Inter preload. A box sized in `ch` (the hero h1 has `max-width: 15ch`) follows the font's zero glyph, so its box width cannot be matched by `size-adjust` without distorting text widths; text widths and line breaks match within 1%. Residual: the hero h1 box is 8.6% narrower before the web font arrives; nothing shifts because line breaks and height match.

**Rule for future blocks.** One line in `.claude/rules/` (block authoring):
- a block's server HTML plus CSS is its final first-paint layout and look, and JS only adds behaviour
- every printed `<img>` carries `width` and `height`.

## Order and shipping

C -> F-lite -> D (shop CSS, then FAQ) -> G -> A -> B -> E.

Each fix is one commit, deployed to the canary and eye-care-test, followed by a gate run and the flows at 375 and 1440. Each commit gets one before and after screenshot pair for Bean. Other client sites (Indus, Mama's) get the fixes with their next framework deploy. A new attribute, if any, joins the shared reseed through `publish-framework-db.py`.

Effort, low estimates: C 30 min; F-lite 45 min; D shop 45 min; FAQ 45 min; G 45 min; A 30 min; B 45 min; E 20 min.

## Done

- The F-lite CLS check passes at 375, 768 and 1440 on the fixture pages. MET: eye-care-test CLS 0 to 0.014 on all five fixture pages (was up to 0.785); canary home 0.023, 0.018, 0.012 (was 0.755 at 375). One 0.154 reading on the Eye Care home at 1440 occurred once in four runs and did not reproduce: intermittent, watch.
- The late-CSS check passes. MET on every page, and the collected stylesheet name is stable.
- The JS-off look check shows no difference outside deliberate motion. MET on the canary (0 difference). On Eye Care it differs only because the trust bar's no-JS fallback shows all four items stacked, the deliberate "degrade to more content" rule.
- Bean has looked at the pages on his phone and desktop (FP-13). OPEN: owed by Bean.

P6 is not part of Done; it is parked until Bean names the route.

## Council critiques not taken, with the reason

- **Treat the "huge logo" as a class mismatch between cached HTML and the collected file.** Disproven: the logo class is identical across requests and present in the stylesheet each page names, and the HTML is not edge-cached.
- **Ship a duplicated marquee track in the server HTML.** It conflicts with `fx-marquee.js::makeClone`, which builds the copies from the measured width. Reserving the final row in CSS gets the same first paint without doubling the loop.
- **Drop the JS-off comparison as gold-plating.** Kept, because it is the only check that catches the shop filters' style change at 1440, which CLS barely registers. It starts report-only.
- **Inline per-page CSS or critical CSS, and shrink the 315 KB collected file.** That is page weight, `plans/2026-11-03-page-weight-budget.md`. A and G here make the first frame correct; that plan makes it smaller.
