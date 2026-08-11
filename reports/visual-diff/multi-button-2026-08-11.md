---
doc_type: reference
title: "Visual-diff report — multi-button · gridTemplateRows"
block: multi-button
date: 2026-08-11
property: gridTemplateRows
verdict: PASS
first_paint_capture_passed: true
source_sha: 47aa622a82ebb60a
---

# multi-button — unchanged

**Verdict: PASS.** No measured value moved for this block, so the full report
was collapsed into the shared summary (Change 1, 2026-08-11) — this stub still
carries this block's own numbers below, and exists in full so the pre-commit
gate's per-block `source_sha` binding is never dropped.

**Auto-derived finding:** auto-derived: measured `display` is `flex` at every element and viewport captured — never `grid` or `inline-grid` — and `grid-template-rows` only takes effect under grid layout, so it cannot apply here by construction. desktop: set `64px` → outer `none`  ⚠ does NOT bind | mobile: set `8px` → outer `none`  ⚠ does NOT bind | tablet: set `32px` → outer `none`  ⚠ does NOT bind

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `—` | `—` | `flex` |
| tablet (900px) | `tablet` | `none` | `none` | `—` | `—` | `flex` |
| mobile (390px) | `mobile` | `none` | `none` | `—` | `—` | `flex` |

Full context (page, selector, probe values, gate totals) for this run:
`unchanged-summary-gridTemplateRows-2026-08-11.md#multi-button`.
