---
doc_type: reference
title: "Visual-diff report — site-header-row · gridTemplateRows"
block: site-header-row
date: 2026-08-11
property: gridTemplateRows
verdict: PASS
first_paint_capture_passed: true
source_sha: d1d38ee89454106c
---

# site-header-row — unchanged

**Verdict: PASS.** No measured value moved for this block, so the full report
was collapsed into the shared summary (Change 1, 2026-08-11) — this stub still
carries this block's own numbers below, and exists in full so the pre-commit
gate's per-block `source_sha` binding is never dropped.

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `25.5938px` | `25.5938px` | `block` |
| tablet (900px) | `tablet` | `none` | `none` | `24.4219px` | `24.4219px` | `block` |
| mobile (390px) | `mobile` | `none` | `none` | `22.4375px 22.4375px` | `22.4375px 22.4375px` | `block` |

Full context (page, selector, probe values, gate totals) for this run:
`unchanged-summary-gridTemplateRows-2026-08-11.md#site-header-row`.
