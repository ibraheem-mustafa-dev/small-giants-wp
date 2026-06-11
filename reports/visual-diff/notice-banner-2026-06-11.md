# Visual diff — sgs/notice-banner — 2026-06-11

verdict: PASS
first_paint_capture_passed: true

block: sgs/notice-banner
change: E9 — make variant bg/border/colour operator-overridable (allergen-box-style customisation capability)
canary: https://sandybrown-nightingale-600381.hostingersite.com
verified_by: deployed CSS inspection + block-renderer REST
bean_eyeball: OWED (R-22-13)

## What changed (plain English)
notice-banner is the FUNCTIONALITY change Bean asked for: the ability to customise the
box (background / border / radius / padding) so any notice — e.g. an allergen box — can be
styled per-instance, NOT hardcoded values. The 5 variant colour defaults
(info/success/warning/error/accent) were at specificity (0,1,0), which beat the operator's
native color.background + border controls. Wrapped each variant selector in `:where()`
(specificity 0) so operator-set or converter-transferred bg/border/colour always win.
Visible defaults are byte-identical (declarations unchanged) — only specificity dropped.

- block.json: version 0.5.0 -> 0.6.0 (CDN cache-bust for the style.css change). No new attrs.
- style.css: 5 variant selectors wrapped in `:where()`. The existing
  `.sgs-notice-banner__text:not([style*="color"])` text-colour override pattern was already correct.
- edit.js / render.php / save.js / deprecated.js: unchanged.

## Optional heading
Delivered by the EXISTING open InnerBlocks slot (no allowedBlocks lock) — it already accepts
an sgs/heading child, so the cloning converter can route a draft <h3> INTO the banner as a
child instead of emitting it as a sibling. (A `showHeading` toggle was prototyped + removed:
it would have been a dead control — it only seeded the editor template, did nothing at render.
The open slot is the correct, FR-22-6-consistent mechanism.) The converter-side routing of the
adjacent <h3> into the banner is a cloning-thread follow-on.

## Verification (live, deployed canary)
- Deployed style-index.css contains `:where(.sgs-notice-banner--info|success|warning|error|accent)`
  — overridability shipped; inline/native bg+border (1,0,0,0) now beats the variant default (0,0,0).
- block-renderer REST (variant=info): renders the .sgs-notice-banner wrapper + role="note". No breakage.
- 0 net-new dead controls; 0 net-new F3; first_paint_capture_passed: true.

## verdict
PASS — bg/border/colour are now operator/converter-overridable (the allergen-box capability),
render-neutral by default. Bean R-22-13 eyeball owed.
