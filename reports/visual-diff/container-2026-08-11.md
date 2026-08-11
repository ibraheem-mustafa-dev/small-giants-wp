---
doc_type: reference
title: "Visual-diff report — container · gridTemplateRows"
block: container
date: 2026-08-11
property: gridTemplateRows
verdict: PASS
first_paint_capture_passed: true
source_sha: af8893c61b46a0ac
---

# container — unchanged

**Verdict: PASS.** No measured value moved for this block, so the full report
was collapsed into the shared summary (Change 1, 2026-08-11) — this stub still
carries this block's own numbers below, and exists in full so the pre-commit
gate's per-block `source_sha` binding is never dropped.

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `25.5938px` | `25.5938px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `24.4219px` | `24.4219px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `22.4375px 22.4375px` | `22.4375px 22.4375px` | `—` | `—` | `grid` |

Full context (page, selector, probe values, gate totals) for this run:
`unchanged-summary-gridTemplateRows-2026-08-11.md#container`.
