---
block: sgs/product-card
date: 2026-08-09
source_sha: 25057bd595af728a
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: Playwright (chromium) against the live canary block EDITOR at wp-admin/post-new.php, registered attributes read from wp.blocks.getBlockType after the deploy; plus a stored-content census over every canary post and every theme pattern/part, validated against a positive control
deployed_build: build-deploy.py --target sandybrown --blocks-only, 2026-08-10, verify HTTP 200 + markers present
change: D540 — inert contentWidth attribute DELETED
---

## What changed and why

`sgs/product-card` declared `contentWidth` and passed it to the wrapper, but `render.php:313` sets
`'wrap_inner' => false` in the `$base_opts` that **every branch shares**, so
`.sgs-container__inner` never renders. The wrapper duly wrote the band CSS
(`class-sgs-container-wrapper.php:1263-1264`, `:1567-1568`) to a selector that does not exist, and
`render.php` reads the attribute nowhere in code — its only occurrence was a docblock line at `:21`.

The attribute was therefore **inert**: declared, deployed, and incapable of affecting anything.
D540 reserves the name for a block that renders a genuine inner band; this one cannot. Deleted — the
same remedy D540 applied to quote / testimonial / notice-banner / team-member / product-faq.

## Render-neutral — established before deleting, not asserted after

| Source | Instances setting `contentWidth` on this block |
|---|---|
| Theme patterns + parts | **0** |
| Canary posts, pages, revisions, header/footer CPTs | **0** |

The census query was validated against a positive control first: the same query shape returns **140**
for `sgs/container`, so a zero here is a measured absence rather than a query that cannot match.
That control earned its place — an earlier form of this query returned 0 for *everything*, including
container, and would have "confirmed" the right answer for the wrong reason.

## Live measurement — canary editor, after deploy

| Check | Result |
|---|---|
| `contentWidth` registered client-side | **false** (deleted) |
| `width` registered | false — never existed, and deliberately not added |
| `maxWidth` still registered | **true** — the block's real, working width layer is untouched |
| Console errors on insert + select | **0** |

## No control was removed from any client

There was never a control for this attribute: `edit.js` contains no reference to it. That is also
why `check-dead-controls` CHECK 4 never saw it — that check fires only when there is no control
**and** no render, and passing the attribute to the wrapper counted as a render. Deleting it removes
a dead declaration, not a capability.

## Gate result

`inspector-scan` rule 23 — the gate written in this same change to assert D540 — named this block
before the deletion and reports **0 flagged** across the library after it.
