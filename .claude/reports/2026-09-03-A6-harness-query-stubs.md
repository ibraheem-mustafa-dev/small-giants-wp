# A6 — post-grid / buybox harness unblock

**Date:** 2026-09-03
**Scope:** `plugins/sgs-blocks/scripts/qa/lib/wp-stubs.php` only. No `render-css-harness.php`
change was needed. No `git` commands run, no deploy, no shared-DB write.

## Status: PARTIAL — one of two unblocked, honestly

- `sgs/post-grid` — **unblocked.** Its manual/default render path always constructs a
  `new WP_Query()`; the harness's `WP_Query` stub previously had no `have_posts()` /
  `the_post()` methods, so every call fataled. Added a faithful "zero posts found" stub
  (`have_posts()` always false, `the_post()` a no-op, `max_num_pages = 0`) — the real WP
  behaviour when a query matches nothing. Nothing about a post (title, image, excerpt) is
  invented; the card loop simply never executes, same as a live site with no matching
  posts, and render.php's own "no posts" branch renders honestly.
- `sgs/buybox` — **still NOT RUN, deliberately.** Investigated in full (read
  `Product_Manifest::build()`, 492 lines). Reaching its CSS-emitting code requires a
  working WooCommerce variable-product-with-variations object graph (`wc_get_product()`,
  `->get_children()`, `->get_variation_attributes()`, `wc_get_price_to_display()`,
  `->is_on_sale()`, `->is_in_stock()`, transients, `$wpdb` tax queries, term lookups —
  dozens of real commerce functions). That is not "minimum structure for the render path
  to execute" — it is reconstructing a slice of WooCommerce's commerce data model inside
  a test harness, which the file's own header rules out ("Real SGS logic ... is NEVER
  stubbed here" — `Product_Manifest::build()` is real SGS logic, and its outputs would be
  fabricated). Separately, stubbing only the one crashing call (`do_blocks()`) would not
  produce a usable unblock at all: `do_blocks()` fires only on buybox's WC-absent
  fallback branch, which prints zero of the block's own markup and no `<style>` tag —
  making it "run" would be a permanently vacuous result (every CSS assertion fails, both
  the true and the false claim), which is exactly the false-unblock failure mode the task
  brief warned against. Full reasoning documented inline in `wp-stubs.php`.

## Files changed

- `plugins/sgs-blocks/scripts/qa/lib/wp-stubs.php` — added `have_posts()`/`the_post()`/
  `max_num_pages` to the existing `WP_Query` stub class, with an inline doc-comment
  explaining exactly what is fabricated (an empty result set, nothing else) and why it
  does not affect `sgs/card-grid`'s separate, still-unstubbed `'query'`-source `WP_Query`
  path (the harness forces `source: 'manual'` by default; card-grid only constructs
  `WP_Query` when a caller explicitly opts into `source: 'query'`). Added a second
  documentation block explaining the buybox non-stub decision for a future reader.

## 1. Self-test

```
node plugins/sgs-blocks/scripts/qa/assert-css-effect.js --self-test
```

Tail of output:
```
  PASS  defect 3 (pricing-table priceColourHover independent of toggle label) — FAILS on the broken fixture
  PASS  defect 3 (pricing-table priceColourHover independent of toggle label) — PASSES on the current in-tree (fixed) file

ALL SELF-TESTS PASSED
```
All three historical defects (card-grid hover, form/modal gradient-only background,
pricing-table hover-independent-of-toggle) still correctly discriminate broken-fixture
vs current-tree. Unaffected by this change.

## 2. Full sweep — coverage figure

Swept all 83 `render.php` files through `render-css-harness.php --attrs '{}'`, reading
`ok`/`error` from stdout only (PHP notices go to stderr and were previously
misread as parse failures in an earlier, flawed version of this sweep script —
corrected before reporting).

**82 of 83 RUN.**

Still NOT RUN:

| Block | Reason |
|---|---|
| `sgs/buybox` | `Call to undefined function do_blocks() in .../buybox/render.php:72` — reached only on the WooCommerce-absent fallback branch; the real CSS-emitting branch needs a fabricated WC variable-product graph this harness deliberately does not build (see above). |

## 3. Discrimination — the load-bearing test

### sgs/post-grid

TRUE claim (real `backgroundColourHover` attribute → real emitted `background-color`):

```
node plugins/sgs-blocks/scripts/qa/assert-css-effect.js --slug sgs/post-grid \
  --attrs '{"backgroundColourHover":"#123abc"}' \
  --expect '[{"selectorContains":".sgs-post-grid__card","property":"background-color","value":"#123abc"}]'
```
Result: `PASS` — matched
`:where(:root:not(.sgs-touch-input)) .sgs-post-grid-9f3484b7.wp-block-sgs-post-grid .sgs-post-grid__card:hover { background-color:#123abc }`
— exit 0.

Deliberately FALSE claim (same run, wrong value):

```
node plugins/sgs-blocks/scripts/qa/assert-css-effect.js --slug sgs/post-grid \
  --attrs '{"backgroundColourHover":"#123abc"}' \
  --expect '[{"selectorContains":".sgs-post-grid__card","property":"background-color","value":"#ffffff"}]'
```
Result: `FAIL` — "no rule found containing selector \".sgs-post-grid__card\" with
background-color:#ffffff" — exit 1.

**post-grid genuinely discriminates.** Not a false unblock.

### sgs/buybox

Not applicable — the block is NOT RUN (see §2), so no discrimination claim was made or
counted. No PASS was fabricated for it.

## 4. Proof the emitted CSS is the block's own

From the post-grid TRUE run, a real scoped rule (per-instance `uid`, not a stub
artefact — `sgs-post-grid-9f3484b7` is computed by render.php itself from
`md5(wp_json_encode($attributes) . anchor)`):

```
:where(:root:not(.sgs-touch-input)) .sgs-post-grid-9f3484b7.wp-block-sgs-post-grid .sgs-post-grid__card:hover{background-color:#123abc}
```

and, in the same run, the block-level custom-property rule built entirely from caller
attributes (independent of the query loop):

```
.sgs-container-9f3484b7{--sgs-columns-desktop:3;--sgs-columns-tablet:2;--sgs-columns-mobile:1;--sgs-gap:30px;...}
```

Both selectors carry the real per-render `uid` and real SGS class names
(`sgs-post-grid__card`, `sgs-container`) — nothing from the harness stub appears in
either.

## 5. What the stubs make the harness unable to detect

- **`sgs/post-grid`:** any CSS or markup that depends on an actual post existing in the
  loop — per-card title/excerpt/date/image/category-badge markup and any styling that
  only appears when `Post_Grid_REST::render_card()` runs (it never runs under this
  stub — `have_posts()` is always false). The block-level colour/hover/gap/column CSS
  (the vast majority of its CSS surface) is unaffected and was proven above to
  discriminate correctly. The "no posts" empty-state branch is exercised instead of the
  populated-grid branch.
- Taxonomy-filter markup (`showFilters: true`) is untested — `get_terms()` is not
  stubbed and that branch was intentionally left alone (out of scope, matches this
  block's own conditional gating; `showFilters` defaults to `false`).
- Pagination types other than the default `'none'` (`standard`/`load-more`/`infinite`)
  are untested — they would need `add_query_arg()`/`wp_unslash()`, not stubbed here.
- **`sgs/buybox`:** entirely untested by this harness — see §2. No colour, layout, or
  any other CSS claim about buybox can be verified this way until a real (not fabricated)
  path is found, or the block is exercised some other way (e.g. a live-deploy check).

## Concerns

- The 82/83 figure is the count with the *default/manual* render path only, matching
  every other block already in the harness's coverage — `sgs/post-grid`'s taxonomy-filter
  and non-`'none'` pagination branches remain out of scope, consistent with how
  `sgs/card-grid`'s `'query'`-source branch has always been treated.
- `sgs/buybox` remains a genuine gap for CSS-effect verification. If it becomes urgent
  (e.g. a colour change to buybox needs the same guarantee post-grid now has), the real
  fix is a `WP_Query`/`google-reviews`-style boundary stub for a *minimal* fake
  `WC_Product_Variable` with exactly one variation — but that is a materially larger,
  separately-scoped piece of work (fabricating real commerce values through
  `Product_Manifest::build()`) and was correctly out of scope for a "minimum structure"
  stub in this pass.
