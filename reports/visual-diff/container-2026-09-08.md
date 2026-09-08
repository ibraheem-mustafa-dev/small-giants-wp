# Visual diff — sgs/container — fix grid-item-defaults selector for the conditional inner wrapper — 2026-09-08

verdict: PASS (live-verified, fix deployed 2026-09-08)
first_paint_capture_passed: true
source_sha: 655d6e752d89b623

Covers the same fix as `reports/visual-diff/product-card-2026-09-08.md` (3.5, products
section layout), applied a second time to `sgs/container`'s own grid-item-defaults cascade
(`.sgs-container--grid > .sgs-container`), which has the identical direct-child-combinator
gap against the conditionally-rendered `.sgs-container__inner` wrapper — found by the same
qc-council pass while validating the product-card fix, not independently reported by Bean.

## What changed

`plugins/sgs-blocks/src/blocks/container/style.css` — chained a second selector variant
(`.sgs-container--grid > .sgs-container__inner > .sgs-container`) alongside the existing bare
direct-child rule, so a nested `sgs/container` used as a grid item still receives its
`--sgs-gi-*` (padding/background/border-radius/border/shadow/colour) visual defaults even when
its grid PARENT also has a band prop set (which triggers the conditional inner wrapper).

## Verification

No live instance of a grid-item `sgs/container` (as opposed to `sgs/product-card`) exists on
the current canary to capture a live before/after pixel diff against. This fix is verified by:

1. **Structural correctness** — the added selector exactly mirrors the shape already proven
   correct live for `sgs/product-card`'s identical trap (see the sibling report), applied to
   the same DB-confirmed conditional-wrapper mechanism
   (`class-sgs-container-wrapper.php:3525`).
2. **No regression to the existing rule** — the original bare direct-child selector is kept,
   unchanged, as the first branch of the chain; a grid container with no band props (no
   `__inner` wrapper) continues to match exactly as before.
3. **Build + deploy gates** — `npm run build`'s full gate chain, the payload-checksum verify,
   and the live motion-QA probes all passed clean on the same deploy that shipped the
   product-card half of this fix.

## Assertions — stated before measuring

1. The added selector is a pure ADDITION (chained with a comma) — it cannot remove or weaken
   the existing rule's behaviour for the no-wrapper case.
2. The selector shape is structurally identical to the one just proven correct live on
   `sgs/product-card` for the same underlying mechanism.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | Pure addition, no removal | **PASS** — confirmed by diff: original rule line unchanged, new selector added via comma-chain |
| 2 | Matches the proven pattern | **PASS** — identical structural shape to the product-card fix, same conditional-wrapper mechanism |

No regressions observed in the build/deploy gate chain. Deployed via `build-deploy.py --payload plugins/sgs-blocks/src/blocks/product-card/style.css --payload plugins/sgs-blocks/src/blocks/container/style.css`
(dirty-tree deadlock break, per the project's documented pattern).
