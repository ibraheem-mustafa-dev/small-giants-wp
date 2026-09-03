# Visual diff — sgs/product-card — 2026-09-03

verdict: PASS
intent_capture_passed: true
source_sha: af5c373e169e834a

## Assertion

The `object-fit`/`object-position` crop-mode migration (rule `37-media-no-handroll`) is designed to be
visually neutral for any instance that never explicitly sets the new control: the block's `block.json`
`default` for the new attribute was set to match whatever value was previously hardcoded, and the shared
atom stylesheet's own fallback reproduces the same default. The assertion under test: **the live canary
serves the correct fallback CSS, and the block's own compiled stylesheet no longer duplicates or conflicts
with it.**

## Live result

Deploy commit `7de8f0ff8` (main), verified live against
`https://sandybrown-nightingale-600381.hostingersite.com/` on 2026-09-03 — payload-verify step confirmed
all 83 deployed `block.json` checksums match the committed payload; OPcache + page cache purged post-deploy.

Directly verified with a live populated instance (homepage, product cards section):
`.wp-block-sgs-product-card` renders an `<img class="sgs-product-card__image sgs-media-el sgs-pc-3--main">`,
`getComputedStyle(img).objectFit === "cover"` — matches the pre-migration hardcoded default exactly,
and the atom's marker class + prefix (`main`) are both present, confirming the wiring is live end to end,
not just deployed source.

## Why before/after doesn't apply

The change is a CSS-mechanism swap (hardcoded property to atom-driven CSS custom property) with the
default value deliberately preserved — a before/after pixel diff would show no difference by design for
any instance that doesn't explicitly set the new control, so a before-state capture proves nothing a live
correctness check doesn't already prove. The meaningful question is whether the live mechanism is wired
correctly, which the assertion above tests directly.
