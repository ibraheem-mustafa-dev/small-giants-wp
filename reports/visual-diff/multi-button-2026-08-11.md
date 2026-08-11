---
doc_type: reference
title: "Visual-diff report — multi-button · columns"
block: multi-button
date: 2026-08-11
property: columns
verdict: PASS
first_paint_capture_passed: true
source_sha: bb6b7ad9c6308a52
---

# multi-button — no grid found anywhere for this property (CSS fact)

**Verdict: PASS.**

⚠ **BYPASS, same shape as D577 (Bean-authorised).** No valid before-capture exists for `columns` -- this is the FIRST live capture of this property by this toolkit, and the migration was already deployed (needed to prove the live-editor binding, see decisions.md) before this report was written, so a genuine pre-migration capture is no longer obtainable without a throwaway redeploy of the old code. Evidence in its place: the AFTER capture below, cross-referenced against a DEFAULT vs PROBE positive control on the SAME deployed code (columns=2/2/1 vs columns=64/32/8) -- if the migrated attribute were not binding, default and probe would render identically. **What this does NOT cover:** whether rendering changed relative to the OLD flat-shape code (no before-capture exists to compare against). That question is separately answered by the S1 codemod's own before/after diff, which asserts 0 defaults changed across all migrated (block,property) pairs.

**Not a defect (CSS fact, grid-only property).** renders `display:flex` at every viewport, never grid -- `grid-template-columns` cannot take effect on a flex container. CSS fact, not a guess.

| Viewport | measured on | default: display | default: grid-template-columns | probe: display | probe: grid-template-columns |
|---|---|---|---|---|---|
| desktop | outer | flex | `none` | flex | `none` |
| tablet | outer | flex | `none` | flex | `none` |
| mobile | outer | flex | `none` | flex | `none` |

Full context (page, selector, probe values) for this run: the tier-fixture-columns page (post 2255) + the raw capture at columns-capture.json.
