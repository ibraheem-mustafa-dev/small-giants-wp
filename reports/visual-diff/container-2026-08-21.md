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

**Follow-up DONE — deployed re-measurement, canary `/shop/` @323px, commit
`865e6d8e` deployed, cache-busted:**

| Measure | Predicted | Deployed actual | |
|---|---|---|---|
| Product card `left` | 24px | **24px** | ✅ |
| Product card width | 261px | **261px** | ✅ |
| `h1` "Shop" `left` | 24px | **24px** | ✅ |
| Horizontal overflow | 0 | **0** | ✅ |

Every predicted row held against the deployed build. No row moved.

## ⚠ RESIDUAL FOUND BY THE DEPLOYED ENUMERATION — not present in the prediction

Enumerating (not estimating) every container that still pays a gutter: of 22
containers, 9 carry `has-global-padding` and 7 pay a gutter — of which **5 are
nested and still pay**. Resolved back to their owners, all 5 sit inside the
HEADER or FOOTER template parts:

| uid | class | width | padding | content |
|---|---|---|---|---|
| `9a61c7e5` | `sgs-header-icons` | 92px | 48px | 44px |
| `dee41160` | `sgs-site-footer__links` | 48px | 48px | **0px** |
| `72cfa1f8` | `sgs-site-footer__brand` | 309px | 48px | 261px ✅ correct |
| `2b8476f3` | `sgs-shop-filters` | 0px (hidden at this width) | 48px | — |

**Why core's nesting reset does not fire here, and it is not a bug in the fix:**
core's reset requires a `.has-global-padding` ANCESTOR. `sgs/site-header` and
`sgs/site-footer` default `contentWidth:"full"`, so they render no band and
correctly carry no `has-global-padding` — meaning the first banded container
INSIDE them legitimately pays the gutter once. That is exactly core's own
behaviour for a constrained group inside a full-width section.

**The real defect is one layer down, and it is an AUTHORING/default problem:**
`sgs-header-icons` is authored as
`{"className":"sgs-header-icons","layout":"flex","flexWrap":"nowrap"}` — with NO
`contentWidth`. It therefore inherits `sgs/container`'s block.json default of
`{"desktop":"normal"}`, i.e. **a 92px row of header icons declares itself a
page-level content band.** `sgs-site-footer__links` is the same shape and is the
worst case: 48px wide, 48px of padding, zero content.

This is the SAME class of error as the padding default this commit reverts — a
page-level concern applied per-instance by default. It is NOT fixed here:
changing `contentWidth`'s default is a larger blast-radius call (that default is
what makes the band render at all, which `2d291992` had just repaired), so it is
a Rule 7 design-gate decision for Bean, not a drive-by.

`sgs-site-footer__links` at 48px/0px content is **pre-existing**, measured at
48px wide with 48px padding BEFORE this change too. It is not a regression
introduced here.

## Residual, named not hidden

The editor canvas still renders no gutter. It never did — `edit.js` exposes the
padding control but never applies `padding` to the preview `style`, so the
removed default was invisible there both before and after. Editor parity for
the container is tracked separately; it is deliberately not mirrored in JS here,
because a second hand-written copy of this gate is exactly how the two surfaces
drift apart.
