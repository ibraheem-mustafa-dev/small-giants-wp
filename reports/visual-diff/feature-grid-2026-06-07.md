---
block: feature-grid
date: 2026-06-07
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/feature-grid gap-control consolidation — 2026-06-07

**Change:** Gap control (number+gapUnit) consolidated onto the shared control; render routes via sgs_container_gap_value(); deprecated.js v3 migrates number->string; render.php px-back-compat fixed (digit-only legacy gaps render as px, not collapsed preset tokens). UNIT_OPTIONS (min-item-width unit) restored after an over-deletion. Editor: valid, 0 console errors.

**Back-compat verification:** Frontend-verified on a live page (R-22-11): old-shape stored gap 24 renders gap:24px on the grid (was at risk of var(--preset--24) collapse before the back-compat fix).

**QC:** /adversarial-council (6 personas) gated this change set pre-commit; the convergent back-compat must-fixes (per-block render px-append, dynamic-block deprecation isEligible, trust-bar editor preview, heading render coercion, wrapper esc_html) were applied and re-verified. Existing client content renders identically.

first_paint_capture_passed: true (live frontend / editor render confirmed; no visual regression vs pre-change output for existing stored values).
