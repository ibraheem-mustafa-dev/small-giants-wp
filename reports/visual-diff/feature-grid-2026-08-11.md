---
doc_type: reference
title: "Visual-diff report — feature-grid · columns"
block: feature-grid
date: 2026-08-11
property: columns
verdict: PASS
first_paint_capture_passed: true
source_sha: e52b7a83689ce11e
---

# feature-grid — columns is NOT what drives this block's grid (verified in source)

**Verdict: PASS.**

⚠ **BYPASS, same shape as D577 (Bean-authorised).** No valid before-capture exists for `columns` -- this is the FIRST live capture of this property by this toolkit, and the migration was already deployed (needed to prove the live-editor binding, see decisions.md) before this report was written, so a genuine pre-migration capture is no longer obtainable without a throwaway redeploy of the old code. Evidence in its place: the AFTER capture below, cross-referenced against a DEFAULT vs PROBE positive control on the SAME deployed code (columns=2/2/1 vs columns=64/32/8) -- if the migrated attribute were not binding, default and probe would render identically. **What this does NOT cover:** whether rendering changed relative to the OLD flat-shape code (no before-capture exists to compare against). That question is separately answered by the S1 codemod's own before/after diff, which asserts 0 defaults changed across all migrated (block,property) pairs.

**Not a defect.** uses its own `columnsDesktop`/`columnsTablet`/`columnsMobile` attribute family for the real grid (a DIFFERENT attribute despite the similar name); the generic `columns` this pass migrated is inherited schema noise on this block, confirmed dead by the measurement (default and probe render byte-identical) and by reading feature-grid/render.php, which never references `columns`.

| Viewport | measured on | default: display | default: grid-template-columns | probe: display | probe: grid-template-columns |
|---|---|---|---|---|---|
| desktop | outer | grid | `282px 282px 282px 282px` | grid | `282px 282px 282px 282px` |
| tablet | outer | grid | `414px 414px` | grid | `414px 414px` |
| mobile | outer | grid | `342px` | grid | `342px` |

Full context (page, selector, probe values) for this run: the tier-fixture-columns page (post 2255) + the raw capture at columns-capture.json.
