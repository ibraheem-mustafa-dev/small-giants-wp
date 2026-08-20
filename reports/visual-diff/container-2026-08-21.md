# Visual diff — sgs/container — 2026-08-21

verdict: PASS
intent_capture_passed: true
source_sha: ae92ca9da9cbf4e7

## What changed

The horizontal gutter goes back to WordPress core's own `.has-global-padding`
mechanism, replacing a hand-rolled per-instance copy of it.

1. **`class-sgs-container-wrapper.php`** — emits `has-global-padding` on the
   container's outer element whenever it renders a content band
   (`$has_band_props`, and not when a caller suppressed the band via
   `$opts['wrap_inner'] => false`).
2. **`container/block.json`** — `padding.default` reverts from
   `{left:24px,right:24px}` to `{}`. The box-object attribute migration itself
   (f9f4368b) is KEPT; only the default is removed.

## Assertions — stated BEFORE measuring

- **A1.** The gutter applies ONCE per page, at the outermost container, not once
  per nesting level.
- **A2.** A product card on a ~323px viewport starts at 24px, not 72px.
- **A3.** No horizontal overflow is introduced.
- **A4.** Blocks whose `contentWidth` is `"full"` (site-header, site-header-row,
  site-footer, site-footer-row, physics-canvas) gain NO gutter, because they
  render no band.

## Live result — canary `/shop/`, viewport 323px

Measured on the live canary with the change applied to the rendered document,
via `getComputedStyle` + `getBoundingClientRect`, resolving every contributing
value back to the element that owns it.

| Measure | Before | After | Assertion |
|---|---|---|---|
| Product card `left` | 72px | **24px** | A2 ✅ |
| Product card width | 165px | **261px** (+58%) | A2 ✅ |
| `h1` "Shop" `left` | 48px | **24px** | A1 ✅ |
| Containers paying the gutter | 22 of 22 | **outermost only** | A1 ✅ |
| Horizontal overflow | 0 | **0** | A3 ✅ |

A4 is proven from source, not inference: `$sgs_resolve_content_width` maps
`'full'` → `''`, so those five blocks have `$has_band_props === false` and never
reach the class emit. Enumerated (not estimated): exactly 6 blocks default a
non-empty `contentWidth`; 5 default `"full"`, only `sgs/container` defaults
`"normal"`.

## ⚠ Why this is `intent_capture` and not `first_paint_capture`

A "before" IS meaningful here — it is recorded in the table above. This is
labelled `intent_capture` for one honest reason: **the "after" column was
measured by applying the exact change to the live canary document, not by
capturing a deployed build.** The deploy that would produce a genuinely
deployed after-state requires a clean tree, which requires this commit, so a
deployed after-capture cannot exist before the commit it gates.

Claiming `first_paint_capture_passed` would assert a before/after diff of
shipped output that has not been taken. It has not. The numbers above are real
measurements of real rendered elements, and the mechanism they exercise
(core's `.has-global-padding` rules and `--wp--style--root--padding-left`) was
confirmed already present and live on the page with zero elements using it,
computing to 1.5rem/24px — the same value the hand-rolled default hardcoded.

**Follow-up, not optional:** re-measure the same five rows against the deployed
build immediately after `build-deploy.py`, and correct this report if any row
moves.

## Residual, named not hidden

The editor canvas still renders no gutter. It never did — `edit.js` exposes the
padding control but never applies `padding` to the preview `style`, so the
removed default was invisible there both before and after. Editor parity for
the container is tracked separately; it is deliberately not mirrored in JS here,
because a second hand-written copy of this gate is exactly how the two surfaces
drift apart.
