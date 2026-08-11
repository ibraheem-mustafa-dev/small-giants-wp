---
doc_type: reference
title: "Visual-diff report — option-picker · pillPadding"
block: option-picker
date: 2026-08-11
property: pillPadding
verdict: PASS
first_paint_capture_passed: true
source_sha: 2457cddfb1317e14
---

# option-picker — pillPadding binds live at every tier

**Verdict: PASS.**

Same tier-fixture page (post 2270) and method as the container report: the shared migration
toolkit's automated probe-value derivation refused all 10 box-per-tier instances (a known gap —
its regex-based prop extraction targets the older flat-scalar shape, not this box-object shape),
so probe values were injected directly into `post_content` via REST (an explicitly sanctioned
path for sgs/* blocks — plugins/sgs-blocks/CLAUDE.md), matching the same figures already
live-editor-proven on the container instance on this same page. Measured on the live frontend
render at two viewports.

| Viewport | measured on | expected padding-top | actual padding-top |
|---|---|---|---|
| desktop (1440px) | `.sgs-option-picker__pill` | 22px | 22px |
| mobile (390px) | `.sgs-option-picker__pill` | 5px | 5px |

Padding applies to the pill element, not the block root — confirmed by reading render.php's selector construction (`$sel_pill`) before measuring.

Full context: tier-fixture page (post 2270), anchor `tierfx-probe-option-picker`.
