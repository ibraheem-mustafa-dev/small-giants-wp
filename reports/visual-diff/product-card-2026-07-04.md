# Visual diff — sgs/product-card: legacy InnerBlocks machinery purged (D275, 2026-07-04)

verdict: PASS
first_paint_capture_passed: true

## What
Legacy child-block machinery deleted at source (the "removal" Bean believed had
shipped had never landed in any file):
1. block.json — `allowedBlocks` deleted.
2. index.js — `save: () => <InnerBlocks.Content />` → `save: () => null` (dynamic block,
   no InnerBlocks slot); import removed.
3. render.php — typed mode renders built-in elements ONLY
   (`sgs_product_card_builtin_render`); the FP-H `$content` transition bridge deleted
   per its own retirement clause. Bound/live-data branches untouched.
4. edit.js — legacy InnerBlocks bridge UI, the "legacy InnerBlocks layout" warning and
   the dead inner-block notice removed; `isBuiltIn = !isBound`.
5. style.css — stale InnerBlocks-era comments corrected (no rule changes).
Plus `db_lookup.content_attr_for_element()` (FR-31-2.6 resolver, INERT until the
Phase-2 per-attr walk wires it; TDD 3/3 green).

## LANDED verification on sandybrown (live, page 8, re-cloned this session)
- First-paint capture: `product-card-purge-2026-07-04.png` (element screenshot of the
  live standard card, anonymous front end).
- Live DOM (Playwright `getComputedStyle` + structure walk on both cards):
  - `builtinBody: true` on both (`.sgs-product-card__body`/`__title` render — the
    built-in path is the ONLY typed path now).
  - `legacyChildBlocks: 0` on both (no `.wp-block-sgs-text/-heading/-button` children —
    the legacy emission is dead).
  - Transferred styles land: card 1 `bg rgb(255,255,255)`, `border-radius 16px`,
    `border solid`; card 2 `border dashed` (trial). Widths 650 / 390 in the grid.
  - Console: only a favicon.ico 404 (site-level, unrelated); zero block errors.
- Converter emit (stage-4.json): both cards emit self-closing with style attrs only —
  zero child blocks, zero closers.
- `derive_has_inner_blocks('sgs/product-card') → 0` (was 1); DB resynced
  (`sgs-update-v2.py --stage 1`, `hib_updated=1`); the F6 build gate that first
  caught the drift now passes.

## Known + accepted (NOT a regression)
Typed content attrs (`productName`/`priceLarge`/`ctaText`) emit EMPTY — trace shows
`primary_content_attr → ambiguous`; the element→attr routing is the FR-31-2.6
per-attr walk (completion plan Phase 2, "lands product-card"). Cards render bare
(~48px tall) until Phase 2. Pre-purge output was text-block soup, not correct either.

281 converter tests + F6 + cheat-gate green; npm build clean; WPCS clean.
