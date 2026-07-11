---
doc_type: reference
title: "Visual-diff / LANDED report — theme @layer flow-content margin reset (page-8 Fix 3 + Fix 8)"
block: sgs-theme (core-blocks-critical.css)
date: 2026-07-11
wave: "page-8 discrepancy programme — Fix 3 (+ Fix 8 side-effect)"
verdict: PASS
first_paint_capture_passed: true
---

# SGS theme — flow-content margin reset via `@layer reset` (LANDED)

**Verdict: PASS.** Cloned `<p>`/`<h*>`/`<blockquote>` leaked the browser's default margins
because the converter's CSS matcher silently drops the draft's global `*{margin:0}` reset
(a `*` selector matches neither the class-compound nor the tag branch in
`collect_css_decls_for_element`). Bean chose to reproduce the reset at the THEME level. Added
a flow-content margin reset to `theme/sgs-theme/assets/css/core-blocks-critical.css`,
theme Version bumped 1.5.6 → 1.5.7.

## Why `@layer reset` (Bean-requested research — /research-check extended, 3 researchers + WP core)
A bare element selector `p{margin:0}` (0,0,1) OVERRIDES WordPress's block-gap rule
`:where(.is-layout-flow) > *` (0,0,0) — a documented WP regression (gutenberg#53717) that
would collapse paragraph spacing on hand-built pages. Wrapping the reset in `@layer reset {}`
demotes it below ALL unlayered author CSS, so it YIELDS to WP block-gap + WP block-library
class rules + any SGS block's own scoped/inline margin, while still beating the UA default
(author origin > UA regardless of layer). Top block themes (TT4/TT5/Ollie) rely on WP
flow-layout + blockGap and never element-reset margins; this is the "reset then let the
layout system re-add spacing" pattern, made cascade-safe. Lists (ul/ol) excluded (padding
zeroing breaks bullets; no list defect reported).

## Evidence (live sandybrown page 8, all breakpoints — CDN cleared)
- **Fix 3 clone fidelity (1440 / 375):** info-box `<p>` margin `0px` (was `13px 0` = leaked UA);
  brand `<p>` margin `0px`.
- **Fix 3 block-gap SAFETY (the critical check):** an `<h3>` inside an authored
  `wp-block-column is-layout-flow` retained `margin-block-start: 16px` at BOTH 1440 and 375 —
  WP's block-gap is PRESERVED. The `@layer` form correctly yields to it.
- **Fix 8 (trustpilot bar, side-effect):** the bar was already an `sgs/container--flex` with the
  correct `padding:18px 24px` + white bg + 1px border; it was taller than the draft only because
  its flex items (`<p>`) carried the leaked UA margins. Post-reset, item margins all `0px`,
  bar padding `18px 24px` — resolved by Fix 3 (no separate padding fix needed; register's
  "padding defaulted" claim was false).

## Verify-live follow-up (research MEDIUM risk — not fixed blind)
WooCommerce notices + multi-paragraph comments render bare `<p>` outside WP flow-layout, so
they also lose their default spacing under the reset. Not present on the page-8 homepage;
spot-check the shop/PDP/comment pages and add a targeted `.woocommerce p+p / .comment-content p+p`
safety-net rule ONLY if they actually flatten.

## Files
- `theme/sgs-theme/assets/css/core-blocks-critical.css` — `@layer reset { p, h1-h6, blockquote, figure, figcaption, dl, dd, pre { margin:0 } }`
- `theme/sgs-theme/style.css` — Version 1.5.6 → 1.5.7
