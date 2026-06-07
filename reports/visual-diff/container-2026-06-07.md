---
block: container
date: 2026-06-07
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/container gap-control consolidation — 2026-06-07

**Change:** Removed the inert WP-native blockGap support (the SGS custom `gap` attr was always the active gap mechanism; blockGap never drove the rendered gap). Wrapper responsive <style> now esc_html'd (defence-in-depth; no effect on valid CSS). No frontend visual change.

**Back-compat verification:** blockGap removal is an editor-control change only; render reads the `gap` attr unchanged. esc_html does not alter valid length/colour/grid CSS. No visual delta.

**QC:** /adversarial-council (6 personas) gated this change set pre-commit; the convergent back-compat must-fixes (per-block render px-append, dynamic-block deprecation isEligible, trust-bar editor preview, heading render coercion, wrapper esc_html) were applied and re-verified. Existing client content renders identically.

first_paint_capture_passed: true (live frontend / editor render confirmed; no visual regression vs pre-change output for existing stored values).
