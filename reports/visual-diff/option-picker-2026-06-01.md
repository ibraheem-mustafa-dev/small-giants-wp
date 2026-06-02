---
block: option-picker
date: 2026-06-01
verdict: PASS
first_paint_capture_passed: true
change_type: new-block
change_description: >
  New atomic block sgs/option-picker (Spec 24 FR-24-15 / D144 Phase A). An
  exclusive single-select pill chooser (radio-group semantics) for pack sizes,
  flavours, colours, plan tiers. Built battle-ready as the cloning converter's
  future emit target (D144.4). Live-verified on the sandybrown canary frontend
  (temporary published page, since removed) via Playwright.
verification_method: live frontend render (full-page screenshot) + interaction eval (CDP)
pixel_diff_skipped: true
pixel_diff_skip_reason: >
  Brand-new framework component with no mockup baseline — the cloning pixel-diff
  (mockup-vs-clone parity) workflow does not apply. Verified instead by rendered
  output + interaction per R-22-11.
verified_by: opus-main-thread-live-playwright
evidence_screenshot: reports/visual-diff/option-picker-2026-06-01-frontend.png
---

# sgs/option-picker — Visual + Behaviour Verification (2026-06-01)

## What was verified (live on canary frontend)

Two instances were rendered on a temporary published page and screenshotted
(`option-picker-2026-06-01-frontend.png`):

1. **Outlined picker "Pack size"** — pills `250g / 500g / 1kg`, default `500g`
   rendered with the selected (pink) state. Outlined resting pills.
2. **Filled picker "Flavour"** — pills `Vanilla / Chocolate`, default `Vanilla`
   rendered selected. Filled style.

## First-paint (no-JS) state — PASS
Server render bakes the `defaultSelected` `checked` attribute, so the correct
pill is selected on first paint before any JS runs (verified in the screenshot
and via the earlier REST block-renderer markup: `role="radiogroup"`,
`aria-labelledby`→legend, shared radio `name`, `checked` on the default).

## Interaction — PASS (CDP eval)
- Clicking the `250g` pill moved `input:checked` to `250g` (CSS `:checked ~ .pill`
  drives the visual state — no JS needed for appearance). Selected-pill computed
  `background-color` = `rgb(230,138,149)` (the active state).
- Selection dispatches the bubbling event with the exact D144 contract:
  `sgs:option-selected` → `{ typeKey:"pack-size", selectedKey:"1kg", contentImpact:[] }`,
  caught at `document` level (confirms `bubbles:true`).

## Accessibility
Native radio-group (real `<input type=radio>`, single tab stop, browser-native
arrow/Home/End), 44px min targets, `:focus-visible` ring, `prefers-reduced-motion`
honoured. axe-style structure: `role="radiogroup"` + `aria-labelledby` legend.

## Console
Zero console errors on the rendered page.
