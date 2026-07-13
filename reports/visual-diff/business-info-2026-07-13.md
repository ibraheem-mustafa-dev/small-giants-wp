---
report: sgs/business-info per-type variations + footer adoption
date: 2026-07-13
session: D325 (Track B — business-info-driven footer, Bean steer)
target: https://sandybrown-nightingale-600381.hostingersite.com/
blocks_changed: [sgs/business-info, sgs/site-footer]
verdict: PASS
first_paint_capture_passed: true
---

# sgs/business-info — draggable per-type variations (D325)

Bean's steer: don't wire business data via paragraph bindings — use the existing
`sgs/business-info` block, one variant per data type, so each field is a
draggable inserter item tied live to the Business Details settings page.

## Change (editor-inserter metadata + footer adoption)

- Added **8 block variations** to `sgs/business-info` block.json — one per
  `displayType`: Business Phone / Email / Address, Opening Hours, Social Links,
  Copyright Line, Business Tagline, Business Map. Each carries its own title,
  icon, keywords, `attributes.displayType`, `isActive:["displayType"]`, and
  `scope:["inserter","transform"]`. No render-output change to existing
  instances (pure inserter/authoring metadata).
- Footer (`framework-footer-default.php` pattern + `sgs/site-footer` edit.js
  TEMPLATE) rewired from `core/paragraph` + `sgs/site-info` bindings to
  `sgs/business-info` blocks with the matching `displayType`.

## Verification (live DOM + deployed built block.json)

| Check | Evidence | Verdict |
|---|---|---|
| 8 variations deployed | built block.json has Business Phone/Email/Address, Opening Hours, Social Links, Copyright Line, Business Tagline, Business Map | PASS |
| Footer renders live from settings | 7 `sgs/business-info` blocks in the footer; tagline "Real food for real mums…", address "Birmingham, United Kingdom", email "Zainab@mamasmunches.com", copyright "© 2026 Mama's Munches" all pulled from Business Details | PASS |
| Empty fields degrade | phone/hours/socials (unset in store) show the block's operator hint / render empty — no broken output | PASS |
| Footer layout intact | columns `2fr 1fr 1fr` desktop, collapse to 1 mobile, no overflow | PASS |
| Site health | HTTP 200 | PASS |

first_paint_capture_passed: true — footer renders on first paint with the
business data in place (see `site-footer-desktop-2026-07-13.png` for the
layout; data now sourced from Business Details, not placeholders).

No hardcoded client data anywhere: every field flows from the central Site Info
store via the block (FR-S4-5 linter stays green; generic nav labels are not
personal data).
