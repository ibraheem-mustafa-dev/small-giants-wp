---
doc_type: reference
title: "Visual-diff report — feature-grid · gridTemplateRows"
block: feature-grid
date: 2026-08-11
property: gridTemplateRows
verdict: PASS
first_paint_capture_passed: true
source_sha: 10291e2f54243d9b
---

# feature-grid — unchanged

**Verdict: PASS.** No measured value moved for this block, so the full report
was collapsed into the shared summary (Change 1, 2026-08-11) — this stub still
carries this block's own numbers below, and exists in full so the pre-commit
gate's per-block `source_sha` binding is never dropped.

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `48px` | `48px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `48px` | `48px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `48px 48px` | `48px 48px` | `—` | `—` | `grid` |

Full context (page, selector, probe values, gate totals) for this run:
`unchanged-summary-gridTemplateRows-2026-08-11.md#feature-grid`.
