---
block: multi-button
date: 2026-06-07
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/multi-button gap-control consolidation — 2026-06-07

**Change:** Gap control (number+gapUnit) consolidated onto the shared control; render routes via sgs_container_gap_value() with digit-only px back-compat; deprecated.js v3 gained isEligible (dynamic block — migrate now actually runs) and migrates number->string. Editor: block valid, 0 console errors.

**Back-compat verification:** Old-shape numeric gap renders as px via the render-side back-compat append (e.g. 12 -> 12px), preserving the old `$gap.$unit` output. No visual regression for existing buttons.

**QC:** /adversarial-council (6 personas) gated this change set pre-commit; the convergent back-compat must-fixes (per-block render px-append, dynamic-block deprecation isEligible, trust-bar editor preview, heading render coercion, wrapper esc_html) were applied and re-verified. Existing client content renders identically.

first_paint_capture_passed: true (live frontend / editor render confirmed; no visual regression vs pre-change output for existing stored values).
