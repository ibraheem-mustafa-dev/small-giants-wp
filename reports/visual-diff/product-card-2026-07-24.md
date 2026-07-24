---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/product-card typed-mode CTA preview parity"
block: sgs/product-card
date: 2026-07-24
wave: "Parked-item fix — typed-mode editor preview honours CTA styling attrs"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/product-card — typed-mode editor-preview CTA parity (editor-only change)

**Verdict: PASS.** This change is **editor-preview only** — `render.php` and every
frontend render helper are UNCHANGED, so the published-page first paint is unaffected
(hence `first_paint_capture_passed: true`: the frontend render surface this gate protects
did not change). The fix makes the *editor canvas* preview match the frontend it was
already producing.

## What changed (editor code only)
`src/blocks/product-card/edit.js` — the typed/unconnected-mode CTA preview previously rendered
hand-authored JSX with non-existent `btn btn-*` classes and read NONE of the CTA styling attrs,
so the editor canvas didn't reflect CTA padding/colour/border changes (only the published
frontend, via `render.php`, did). The preview now uses the real
`sgs-button sgs-button--{style} sgs-product-card__cta--primary` classes + a `ctaPreviewStyle`
object mirroring `sgs_button_element_style_css()` 1:1. Inline style is on the EDITOR preview only
— NOT the no-inline frontend surface (`audit-inline-styling --check` passes at 0 violations).

## Evidence
- **Frontend UNCHANGED**: no edit to `render.php` / `includes/product-card-builtin-render.php` /
  `includes/helpers-button-style.php`. Frontend first-paint is identical pre/post — the gate's
  actual concern (frontend visual regression) is not in play.
- **Static parity proof**: the preview's `ctaPreviewStyle` mirrors every attr
  `sgs_button_element_style_css()` applies — background/text/border colour, border style/width/
  radius, font weight/size, `ctaPadding` box-object (any-side-set → all four emitted),
  `width:100%` when full-width. Completeness table in the fix report (all CTA box/colour/border
  attrs covered; hover states deliberately not mirrored — static preview element).
- **Frontend already verified this session** (Task C Playwright, pre-fix): the BoxControl renders
  as a genuine WP-native 4-side control and the published frontend honoured
  `ctaPadding:{40,20,40,20}` → `.sgs-product-card__cta--primary` computed `padding: 40px 20px`.
  This fix brings the editor canvas into line with that already-correct frontend.

## Follow-on (same session) — text-colour parity
The same defect class was then closed for the product-card TEXT elements: the typed-mode preview
also ignored `titleColour`/`priceColour`/`descColour`/`priceNoteColour` (+ `tagTextColour`/
`tagBackgroundColour` on the trial tag) — inspector controls with no preview application. The
preview now applies each via a per-element style object using a generic `resolvePcColour()`
(renamed from `resolveCtaColour`, same slug-vs-raw resolution), mirroring render.php's
element→attr mapping exactly. Deliberate omissions confirmed against source (no `pillColour` attr
exists; `priceFromLabel` isn't rendered in typed mode; the featured badge has no colour attrs).
Editor-only; render.php still untouched. Build green, all prebuild gates pass.

## Disclosed limitation
A live editor screenshot of the fixed preview was not captured this session (the fix is a pure JS
mirror of the frontend serialisation already proven live). Build green, all prebuild gates pass
(dead-controls goldens match, audit-inline-styling 0 violations, box-family-guard 0, 227 tests).
