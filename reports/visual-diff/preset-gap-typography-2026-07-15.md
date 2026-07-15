# Visual-diff report — preset font-size gap (sgs/heading + sgs/text), 2026-07-15

verdict: PASS
first_paint_capture_passed: true

## What changed
Track C preset-gap closure (qc-council design-gated). A theme preset font-size
slug stored on `sgs/heading` / `sgs/text` (`"fontSize":"small"` — the shape a
migrated core block carries) now survives WP schema validation and renders as
`var(--wp--preset--font-size--{slug})` in the block's scoped `<style>`.
Changeset: block.json type union ×2, render.php preset branch ×2 (the numeric
emitter provably skips strings), `_canonical_attr_type()` in sgs-update-v2.py
(list-typed block.json `type` crashed the DB regen — reproduced pre-fix, dry-run
clean post-fix), TypographyControls opt-in preset dropdown, edit.js canvas
preview via `fontSizeVar()`. Zero inline styles (Spec 32); no version bumps (D293).

## Live evidence (canary probe page 1468, /tc-preset-gap-probe/)
Computed font-size, measured pre- and post-deploy (Playwright headless,
OPcache + server/CDN cache cleared before each measurement):

| Probe | Stored | Baseline (pre-fix) | Post-fix | Predicted | Result |
|---|---|---|---|---|---|
| A `sgs/text` `"fontSize":"small"` | slug | 16px (slug dropped) | **14px** | 14px | PASS |
| B `sgs/text` `"fontSize":18` | number | 18px | **18px** | 18px (unchanged) | PASS |
| C `sgs/heading` `"fontSize":"small"` h3 | slug | 24px (slug dropped) | **14px** | 14px | PASS |
| D `core/paragraph` preset small (parity ref) | slug | 14px | **14px** | 14px (untouched) | PASS |

## First-paint captures (this directory)
- preset-gap-probe-mobile-2026-07-15.png (375×812) — no horizontal overflow
- preset-gap-probe-tablet-2026-07-15.png (768×1024) — no horizontal overflow
- preset-gap-probe-desktop-2026-07-15.png (1440×900) — no horizontal overflow

## Gates
- npm run build: green (prebuild guards passed)
- sgs-update-v2.py --dry-run: all 11 stages clean (crash-fix proven)
- scripts/oracle/tests: 180 passed, 1 skipped
- converter/tests/test_css_resolvers.py: 21 passed (numeric lift regression clean)
- check-dead-pattern-attrs.py: unchanged (the 6 known hands-off info-box findings only)
