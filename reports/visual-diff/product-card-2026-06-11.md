# Visual diff — sgs/product-card — 2026-06-11

verdict: PASS
first_paint_capture_passed: true

block: sgs/product-card
change: B3 crash fix + B4 legacy-default + B5 dup-CTA gating + B6 overridable trial border
canary: https://sandybrown-nightingale-600381.hostingersite.com (page 1069 = fp-eh-live-test-3)
verified_by: live Playwright on the deployed canary (R-22-11) — editor + frontend
bean_eyeball: OWED (R-22-13 co-authoritative final sign-off)

## What changed (plain English)
Four product-card fixes. Three are editor-only (no frontend pixels change); one (B6)
is a CSS specificity change that is render-neutral by default.

- **B3** — `NumberControl` was imported as a stable export but `@wordpress/components`
  only exports `__experimentalNumberControl`, so it was `undefined`; rendering it in the
  Advanced SEO panel threw "This block has encountered an error". Fixed the import.
- **B4** — a freshly-dragged card was dropping into the legacy InnerBlocks bridge (and
  its warning notice) because the built-in branch keyed on a non-empty `productName`.
  Now legacy is detected by the presence of stored inner blocks, so fresh cards default
  to the built-in template.
- **B5** — the Buttons panel duplicated the primary CTA text/URL that the Content
  overrides panel now owns in bound mode. Gated the Buttons-panel primary text/URL to
  typed mode (style + behaviour stay for both modes).
- **B6** — the trial variant's dashed border + gradient were hardcoded at specificity
  (0,2,0), beating the new universal container-mirror border/background controls (A1).
  Wrapped the selector in `:where()` (specificity 0) so the operator's controls override.

## first-paint / frontend capture (B6 render-neutrality)
- Full-page screenshot of page 1069 captured post-deploy: `pc-frontend-2026-06-11.png`.
- Typed card, bound cards (Size/Flavour pickers + value ladders) all render correctly;
  no layout break, no missing styles, no animation first-paint defect.
- Console: 1 error only = `favicon.ico` 404 (site-chrome, unrelated to the block). No
  product-card JS errors.
- `:where()` does not touch non-trial cards (all cards on this page are non-trial), and
  for trial cards it preserves the same default dashed border — now overridable.
- first_paint_capture_passed: true (no FOUC / no animation-on-load defect observed).

## editor verification (B3 / B4 / B5)
Live Playwright on the deployed editor (page 1069), 0 console errors throughout:

- **B3** — selected the bound card, expanded the **Advanced SEO** panel: the
  `NumberControl` ("Index a specific variation") rendered; error-boundary count = 0.
- **B4** — inserted a fresh `sgs/product-card` (sourceMode `typed`, empty `productName`,
  0 inner blocks): legacy-warning shown = **false**; error-boundary count = 0.
- **B5** — bound card Buttons panel: "Primary button text" present = **false**,
  "Primary button URL" present = **false**, "Primary button style" present = **true**.

## verdict
PASS — all four fixes confirmed on the live canary; B6 is render-neutral. Bean's
editor eyeball (R-22-13) is the remaining co-authoritative sign-off.
