---
block: collapsible-text
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/collapsible-text` inline-zero (D345) — 2026-07-18

Framework-wide inline-zero rollout (Spec 32 FR-32-4 as amended 2026-07-18 / D345).
Block-private conversion by a `wp-sgs-developer` agent; diff fact-checked + live-verified.
Per-instance `--var` VALUES relocated from an inline `style` attribute into a scoped
`.{uid}.{block-root-class}{…}` rule in the block's own `<style>` (consolidated by the CSS
registry); the `'style'` key / literal was dropped. No value changed; no version bump; no
`deprecated.js` (D270). `php -l` clean; 0 `[style*="--"]` presence-selectors.

**Specifics:** `--sgs-collapsible-text-collapsed-lines` (literal `style=` on `__body`, render.php:280)
→ scoped `.{uid}.sgs-collapsible-text .sgs-collapsible-text__body{…}`.
**Note:** not on either homepage canary — verified structurally (0 inline in source, php -l clean,
var scoped on the same `__body` element); resting/first-paint unchanged by construction.
