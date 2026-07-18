---
block: option-picker
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/option-picker` inline-zero (D345) — 2026-07-18

Framework-wide inline-zero rollout (Spec 32 FR-32-4 as amended 2026-07-18 / D345).
Block-private conversion by a `wp-sgs-developer` agent; diff fact-checked + live-verified.
Per-instance `--var` VALUES relocated from an inline `style` attribute into a scoped
`.{uid}.{block-root-class}{…}` rule in the block's own `<style>` (consolidated by the CSS
registry); the `'style'` key / literal was dropped. No value changed; no version bump; no
`deprecated.js` (D270). `php -l` clean; 0 `[style*="--"]` presence-selectors.

**Specifics:** 9 root `--sgs-op-*` vars + 2 per-pill swatch vars → scoped rules (root uid rule
+ per-pill `#{input_id}` sibling rules). WCAG-tuned selected-pill colours unchanged, only relocated.
**Live (sandybrown Mama's):** option-picker inline = **0**; `--sgs-op-bg` resolves to `#fbf3dc`
from the scoped rule; the 8/12/20/40-pack pills render correctly with selected-state styling
(screenshot `mamas-product-optionpicker-final.png`).
