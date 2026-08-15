# Visual diff — sgs/notice-banner — 2026-08-15

verdict: PASS
first_paint_capture_passed: true
source_sha: 6343b6ee40797f9f

## What changed

1. `block.json` — `selectors.typography` was `.sgs-notice-banner__text`, a class nothing
   renders; now `.sgs-notice-banner` (the block root).
2. `render.php` — the text-align read was top-level `$attributes['textAlign']` only; now reads
   `style.typography.textAlign` first, falling back to the top-level key.

## Why the change was needed

Two independent defects, both silent:

- **Dead selector.** `render.php:53` states the text slot became an InnerBlocks `sgs/text`
  child under FR-22-6. Confirmed on the live canary: `deadClass: false` — nothing renders
  `.sgs-notice-banner__text`.
- **Wrong key.** WP renders the "Align text" control from `supports.typography.textAlign` and
  writes it to `style.typography.textAlign`. This file read only the top-level `textAlign`, so
  the class was never emitted. A client set the alignment, it saved, nothing moved.

The top-level read is KEPT as the fallback because the cloning converter writes that key.
Same defect and same fix as `sgs/cta-section` this session.

## First-paint capture — live canary, computed styles

Container set to `textAlign: right`, no child content.

| Measure | Before | After |
|---|---|---|
| wrapper classes | no alignment class | `has-text-align-right` ✅ |
| computed `text-align` | `start` | **`right`** ✅ |
| `.sgs-notice-banner__text` present | no | no (confirms the dead class) |

The before-state was captured on this same canary earlier in the session, on the identical
probe shape, prior to the render.php change.

## Risk

No markup change. The only new output is a `has-text-align-*` class that WP core already
styles, emitted solely when the operator sets an alignment. An unset block renders byte-identical
to before.

## Gates

`check-dead-controls` 0 · `check-shared-panel-schema` 0 · `check-control-ux` 0 ·
`check-element-manifest-conformance` 0 · `npm run build` 0 · `php -l` clean · WPCS 0 errors ·
`oldshape-audit` PASS · `payload-verify` 83/83.
