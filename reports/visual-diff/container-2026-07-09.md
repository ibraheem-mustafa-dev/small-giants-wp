# Visual diff — sgs/container (Phase-0 no-inline base spacing) — 2026-07-09

verdict: PASS
first_paint_capture_passed: true

## What
Container base padding/margin now serialise to a scoped `.uid{}` stylesheet rule via
`wp_style_engine_get_styles` instead of an inline `style="…"` declaration. `block.json`
declares `supports.spacing.__experimentalSkipSerialization: true` (WP stops auto-inlining
the base spacing) and the shared `class-sgs-container-wrapper.php` emits the base spacing
into the block's existing scoped `<style>` (before the responsive `@media` tiers, no
`!important`, so tiers still win per source order). No `style.css` change; no visual
change to the rendered result — only WHERE the spacing declaration lives (scoped rule vs
inline). This is the Phase-0 de-risk proving the universal no-inline mechanism works on a
dynamic block on WP 7.0.

## LANDED verification on sandybrown page 8 (live, anonymous, post LiteSpeed + OPcache purge)
First-paint capture: `reports/visual-diff/container-phase0-2026-07-09.png` (full-page).
Computed-style + live-DOM measurements (Playwright, cache-bust):
- **Zero inline spacing** — all 10 `.wp-block-sgs-container` instances report NO inline
  `padding`/`margin` property declaration in their `style` attribute (only non-spacing
  props gap/display/max-width/background remain, where applicable).
- **Correct computed values (paints via the scoped rule)** — featured `56px 20px`,
  brand/ingredients/gift `64px 20px`, send-to-ward `14px 18px` — all matching the draft's
  values, unchanged from before the change.
- **Scoped rule confirmed** — e.g. `.sgs-container-b86261ed { padding: 22px 20px; }`
  present in the stylesheet (the `wp_style_engine_get_styles` output).
- **No regression** — hero (padding on its inner band, 0 on outer, no inline) and
  trust-bar (`22px 20px`, inline retained since it lacks skipSerialization, paints
  correctly) render unchanged; page body content intact; no console errors from the block.

The visual result is identical to the previous inline rendering (verified by computed
value match); the change is purely the declaration's location (scoped stylesheet vs
inline), which is what unlocks `:hover`/`@media` and per-client re-skin downstream.

npm build clean (dead-control + hardcoded-render-defaults gates pass; 180 conformance
fixtures pass); deployed + live-verified before commit.
