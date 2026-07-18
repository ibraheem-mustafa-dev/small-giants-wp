---
block: responsive-logo
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/responsive-logo` inline-zero (D345) — 2026-07-18

Framework-wide inline-zero rollout (Spec 32 FR-32-4 as amended 2026-07-18 / D345).
Block-private conversion by a `wp-sgs-developer` agent; diff fact-checked + live-verified.
Per-instance `--var` VALUES relocated from an inline `style` attribute into a scoped
`.{uid}.{block-root-class}{…}` rule in the block's own `<style>` (consolidated by the CSS
registry); the `'style'` key / literal was dropped. No value changed; no version bump; no
`deprecated.js` (D270). `php -l` clean; 0 `[style*="--"]` presence-selectors.

**Specifics:** `--logo-width` (render.php:195 `'style'` key) → scoped
`.{uid}.wp-block-sgs-responsive-logo{--logo-width:Npx}`.
**Live (palestine-lives Indus header):** responsive-logo inline = **0**; renders correctly.
