---
block: sgs/mobile-nav-toggle
date: 2026-07-13
verdict: PASS
first_paint_capture_passed: true
---

# sgs/mobile-nav-toggle — visibility ownership moved to sgs/adaptive-nav (P2)

Change: removed the fixed `@media (max-width:782px)` show rule from style.css. The
burger's show/hide is now owned by sgs/adaptive-nav (FR-S9-4), which emits scoped
`.sgs-site-header .sgs-mobile-nav-toggle` rules at the operator-configured collapse tier
(replacing the old fixed 768/782px hacks with ONE configurable source). Base stays
`display:none`; the editor-always-visible rule is unchanged.

LIVE-VERIFIED on sandybrown (same run as the adaptive-nav report): the toggle shows
(`display:flex`) below 768 and hides (`display:none`) at 768+ across 320/360/375/414/768/
1024/1280/1440, staying a 44×44 touch target when shown. No standalone regression — the
toggle's rendered markup + icon-swap are unchanged. Full evidence: adaptive-nav-2026-07-13.md.
