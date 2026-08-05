---
block: site-header
date: 2026-08-05
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/site-header: per-side scalars to box-object spacing — 2026-08-05

**Change.** 16 flat per-side responsive scalars (`paddingTopTablet` through `marginLeftMobile`)
replaced by 4 object attrs (`paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile`, each
`{top,right,bottom,left}`) driven by the shared `ResponsiveBoxControl`, per Spec 32 and the
box-object interface contract.

**The defect this fixes was two-sided and silent on both sides.** The block declared 16 scalars that
NOTHING read, while the shared `SGS_Container_Wrapper` (`class-sgs-container-wrapper.php:302-323`) was
already reading `paddingTablet`/`paddingMobile` as OBJECTS the block never declared — so the wrapper
silently received `array()` and emitted nothing. `render.php` needed no change at all; only the
declared attrs and the editor UI were wrong. Net effect for clients: no way to set responsive header
or footer spacing without editing code.

**Live capture performed (post-deploy, this change deployed to the canary on 2026-08-05):**
`https://sandybrown-nightingale-600381.hostingersite.com/` loaded in Playwright at TWO viewports —
desktop (1745px inner) and mobile (341px inner). Measured on the real painted DOM:

| | desktop | mobile |
|---|---|---|
| `sgs/site-header` | 1731 x 93, text 73 chars | h 90 |
| `sgs/site-footer` | 1731 x 188, text 143 chars | h 363 |
| `sgs/responsive-logo` img | 180 x 67.6, real src, alt "Mama&#39;s Munches home" | visible, same src + alt |
| broken images (naturalWidth===0) | 0 | 0 |
| horizontal overflow | none | none |

Deployed schema re-read over SSH from `wp-content/plugins/sgs-blocks/build/` ON THE SERVER — not from
the local tree — confirming the shipped `block.json` carries the intended attributes.

**What the capture proves for THIS block.** The live header and footer render at both viewports with
computed `padding-top`/`padding-left` of `0px` — i.e. UNCHANGED. That is the correct result and the
specific thing worth checking: these live instances set no tier values, so the migration must emit NO
new rule. A non-zero value here would have meant the migration invented styling rather than exposing a
control. Header 93px desktop / 90px mobile, footer 188px / 363px, no overflow at 375.

**Emitted-CSS proof that the control WORKS.** No live instance sets a tier value, so the emitting path
cannot be captured on the canary.
`plugins/sgs-blocks/scripts/tests/test-site-header-footer-box-render.php` runs the REAL render path
with asymmetric tablet/mobile objects and asserts the emitted rules — e.g.
`@media (max-width:1023px)` carrying `padding-top:24px` and the matching 767px mobile block. 14/14
checks pass. Breakpoints are the sanctioned 1023/767. Zero inline `style` on the root.

**Gates.** `check-dead-controls` CHECK 4 dropped from 35 findings to 3 (all 32 of this pair's dead
attrs cleared); `check-box-family-guard` 0; `audit-inline-styling` 0; `check-dead-pattern-attrs`
OK.
