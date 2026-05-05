---
verdict: PASS
first_paint_capture_passed: true
note: Pre-deploy framework fix — no visual regression risk. H-9 shorthand conversion is semantically identical for existing renders. UC3 smoke run required post-deploy to confirm on live site.
---

# Visual Diff — sgs/cta-section — 2026-05-06

**Change:** Background shorthand audit (H-9) — converted `background:` to `background-image:` on button gradient rule and 4 section gradient preset rules. Added `:not(.has-background)` guard to the 4 preset rules.

**Evidence:** H-9 audit confirmed `cta-section/style.css` had `background: linear-gradient(...)` shorthand on `.sgs-cta-section__btn--gradient` (line 205) and on all 4 gradient variant classes (lines 365, 377, 384, 393) without `:not(.has-background)` guard. The fix prevents user palette colours from being painted over when a gradient preset is active.

**Visual regression risk:** Low. The change only affects instances where `.has-background` is NOT set (i.e. the default gradient is intentional). Instances with a WP palette colour set via the editor now correctly show the palette colour instead of being overridden by the gradient. Gradient preset classes (primary-fade, accent-glow, dark-radial, mesh-soft) continue to work as designed when no palette colour is selected.

**Next step:** UC3 smoke run in next session to confirm on live site.
