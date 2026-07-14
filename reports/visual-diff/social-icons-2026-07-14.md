---
verdict: PASS
first_paint_capture_passed: true
block: sgs/social-icons
change: add source=manual|site-info dynamic mode + 44x44 hit-area floor (WCAG 2.5.5)
date: 2026-07-14
decision: D335
site: palestine-lives (Indus) + sandybrown
---

# Visual-diff report — sgs/social-icons (D335)

## What changed
- New `source` attribute (`manual` | `site-info`, default `manual`). In `site-info` mode the
  block reads the 7 social URLs from the shared Site Info store (`sgs_site_info.socials.*`,
  same read + escaping as `sgs/business-info`) and renders them through the block's existing
  styled button markup — so social links can be inserted two ways (manual OR dynamic-from-settings).
- Every social link floored to a ≥44×44 hit area (WCAG 2.5.5 target size); the SVG glyph is
  pinned to its own size so it isn't stretched.
- `manual` mode is byte-unchanged.

## Live verification (palestine-lives / Indus, 375px)
During the intermediate deploy the block was placed in the drawer with `source:"site-info"` and
rendered live: `.sgs-social-icons--plain` with **3 links** (facebook / instagram / linkedin —
exactly Indus's filled Site Info socials), each **44×44** with an `aria-label`. The dynamic
source read + escaping + sizing all confirmed on the live DOM (`getComputedStyle` +
`getBoundingClientRect`). The instance was subsequently removed from the framework drawer (the
mobile-nav block renders its own styled socials — the placed block was redundant), so the
block is not currently placed on a live page, but the feature + the 44px floor were live-verified.

## Verdict: PASS
Dynamic Site-Info source proven live (3 correct links, escaped, labelled, 44×44); manual path
unchanged; no regression. `php -l` + `phpcs --standard=WordPress` clean.
