---
report: sgs/mobile-nav drawer drop-zone widened for FR-S9-8 move-to-drawer
date: 2026-07-14
session: D331 (FR-S9-8 — per-device content adaptation)
target: https://sandybrown-nightingale-600381.hostingersite.com/
blocks_changed: [sgs/mobile-nav]
verdict: PASS
first_paint_capture_passed: true
---

# sgs/mobile-nav — drawer drop-zone widened (FR-S9-8 move-to-drawer)

`ALLOWED_BLOCKS` (edit.js) gains `sgs/business-info` so contact/social items can
be PLACED in the drawer's custom-content zone (zone 6) to render exclusively
inside the drawer — the spec's place-then-toggle model, no magic "move"
primitive. No render.php change (zone 6 already echoes its `$content` and the
drawer is `<body>`-portaled, so a placed element exists nowhere else). The `/sgs-update`
allowed_blocks scan re-registered the widened list (allowed_blocks_updated=1).

## Live verification (sandybrown, 375px, drawer open)

| Check | Evidence | Verdict |
|---|---|---|
| Drawer opens + `<body>`-parented | drawerOpen true, `parentElement === BODY` (P0 fix intact) | PASS |
| business-info email in drawer | `mailto:Zainab@mamasmunches.com`, inside `.sgs-mobile-nav__custom-content`, visible | PASS |
| business-info socials in drawer | instagram `https://www.instagram.com/mamasmunches/`, in custom zone, visible | PASS |
| Absent from collapsed header | 0 top-row contacts visible in the header at 375 (hidden via per-tier visibility) — no duplication | PASS |
| No console errors | 0 | PASS |

first_paint_capture_passed: true — drawer content renders on open (see
`assets/fr-s9-8-header-375-drawer.png`).
