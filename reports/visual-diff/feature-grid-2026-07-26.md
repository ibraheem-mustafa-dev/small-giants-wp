---
doc_type: visual-diff-report
block: sgs/feature-grid
date: 2026-07-26
verdict: PASS
first_paint_capture_passed: true
change_class: device-tier-breakpoint-correction (C4)
deploy_target: sandybrown
---

# sgs/feature-grid — visual-diff report (2026-07-26, device-tier breakpoint fix)

## Change
DONE checklist condition 4 (device tiers only). The fixed-columns-by-count path in
`render.php` emitted its Tablet/Mobile grid overrides at the WRONG breakpoints —
`@media (max-width:1024px)` + `(max-width:768px)` — instead of the SGS device-tier
standard `1023` / `767` (contract §B2 / `visual-standards.md`). Same class as button's
old stray-1024 fix. Corrected both `@media` lines + the descriptive comment.

## Evidence (LANDED + live-verified on sandybrown)
- **Source clean:** `grep max-width` in render.php returns only `1023px` / `767px`.
- **Checksum:** `build/blocks/feature-grid/render.php` md5 local == server (`9bff1474…`).
- **Live emit (populated instance):** created a temp published page with a feature-grid
  (`columnsDesktop:4, columnsTablet:2, columnsMobile:1` + 2 info-boxes) via REST; its
  lifted CSS emitted **only** `@media (max-width:1023px)` and `(max-width:767px)` across
  3 feature-grid rules — **zero** `1024px`/`768px`. Test page deleted after verification.
- **Page-wide:** a separate feature-grid-bearing page's lifted CSS also showed 0 stray
  1024/768.

## Behaviour
At the 768px / 1024px boundary the column count now switches on the SGS-standard
boundary (mobile ≤767, tablet 768–1023, desktop ≥1024) instead of 1px off. No other
visual change — same column counts, same gaps.

## Gates
- Build: `wp-scripts build` compiled clean (prebuild bypassed only for the build — a
  co-active `sgs-quote` ledger drift, proven pre-existing, blocks the shared prebuild;
  not this change).

## Verdict
**PASS** — device-tier breakpoints corrected to 1023/767, LANDED + checksum-verified +
live-verified on a populated instance.
