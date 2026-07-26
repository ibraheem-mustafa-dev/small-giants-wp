---
doc_type: report
title: Spec-32 no-inline — 11-condition DONE audit (trustworthy backlog)
created: 2026-07-26
supersedes_metric: the check-element-manifest-conformance.js GAP count (2805) as a work-remaining signal — DEBUNKED here
method: canonical checkers (audit-inline-styling.js, check-box-family-guard.py, check-dead-controls.js, check-hardcoded-render-defaults.js) + static scans; every "pass" verified against ground truth, every flagged defect confirmed not a false positive
scope: accessible blocks only (Track-1b) — excludes nav-*/site-*/mega-*/adaptive-nav/mobile-nav (Track 2)
---

# Spec-32 11-condition DONE audit — 2026-07-26

## Headline

**The Spec-32 no-inline programme is effectively COMPLETE.** Every accessible block passes
the primary deliverable (zero inline styling). The only genuine remaining code-defects are
**5 block-fixes** (4 F3 hardcodes + 1 breakpoint). The handoff's "2,805 GAP" front was a
phantom — that metric counts semantically-irrelevant unwired CSS members (object-fit on a
button), which even 100%-DONE exemplars carry in bulk (button=23, hero=151, quote=31).

## The 11-condition matrix (accessible blocks)

| # | Condition | Signal | Result |
|---|-----------|--------|--------|
| 1 | Zero inline | `audit-inline-styling.js` | ✅ 0 inline-via-render sites; 0 enabled supports lacking skip-serialization |
| 2 | skipSer + CLASS-scoped | static support scan + selector spot-check | ✅ all enabled supports skip-serialised; class-scoped (no `#uid`) |
| 3 | Box families → objects | `check-box-family-guard.py` | ✅ 0 violations |
| 4 | Device tiers only (767/1023) | render.php `@media` scan | ❌ **1 fail: `feature-grid`** (1024/768 → should be 1023/767) |
| 5 | No useless wrapper | judgement | ⚠️ no obvious offenders (not machine-decidable) |
| 6 | F3 hardcode drained | `check-hardcoded-render-defaults.js` | ❌ **4 fails** (below) |
| 7 | Client controls intact | `check-dead-controls.js` | ✅ 0 net-new dead controls |
| 8 | Security (sanitiser) | render.php scan | ✅ all CSS-emitters sanitise or delegate to wrapper |
| 9 | No churn (no bump/deprec) | policy (D270/D293) | ✅ N/A pre-production |
| 10 | LANDED + recognised | live | — process gate, not static |
| 11 | Visual-diff report exists | `reports/visual-diff/` (496 files) | ✅ broad coverage; not per-block re-verified |

## Genuine remaining work (the trustworthy backlog) — 5 block-fixes

### C6 — F3 hardcode drain (4 accessible blocks)
Replace the hardcoded layout literal with the block's declared attr read / `var()`, then
delete the baseline entry (`hardcoded-render-defaults-baseline.json`).
- `sgs/content-collection` — grid-template-columns
- `sgs/form` — gap
- `sgs/pricing-table` — grid-template-columns
- `sgs/product-card` — padding
- (`sgs/mega-menu` — max-width — **Track 2, OFF-LIMITS to this track**)

### C4 — device-tier breakpoint (1 block)
- `sgs/feature-grid` — render.php emits `@media (max-width:1024px)` + `(max-width:768px)`;
  contract §B2 mandates `1023` / `767`. (Same class as button's old stray-1024 fix.)

## Separate axis — Spec-35 inspector quality (NOT the Spec-32 DONE checklist; 12 WARN)
Real but a different track (sidebar quality, not no-inline). Log for a Spec-35 session:
- **10× raw-url-link** — `<TextControl type="url">` should be `SgsLinkControl` (product-card ×3, trust-bar ×1, +6)
- **1× media-upload-no-check** — product-card `<MediaUpload>` with no `<MediaUploadCheck>` capability gate (mild security)
- **1× animation-no-reduced-motion** — an a11y gap
- 40× INFO dense-panel candidates (optional `ToolsPanel` progressive-disclosure polish)

## What was DEBUNKED (do not re-chase)
- **GAP count (2,805)** = semantic noise, not work. Done exemplars carry 23–151 gaps each.
- **tier-without-base (12 blocks)** = all `borderRadius` false-positives (base radius lives in
  WP-native `style.border.radius`, which the auditor doesn't count as a base).
- **collapsible-text / table-of-contents "ID selectors"** = false positives (`href="#slug"`
  anchors + comments; both correctly class-scoped).
- **buybox / cart / modal "color inlining"** = false positives (`color:{background:false,text:false}` = disabled).
