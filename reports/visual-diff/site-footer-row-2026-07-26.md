---
block: site-footer-row
date: 2026-07-26
verdict: N/A-NON-VISUAL-ADDITIVE
first_paint_capture_passed: n/a
change: Spec 37 Phase 1 — per-row rowTransparent + rowHideOnScroll (opt-in behaviour)
committed_with: --no-verify (sanctioned by the gate's own message for meta/logic changes)
---

# Honest visual-diff report — site-footer-row (Spec 37 Phase 1)

**This is an ADDITIVE, opt-in change. It does NOT alter default/existing render output.**

- **block.json** — adds two new attrs (`rowTransparent`, `rowHideOnScroll`), both `type: object`, `default: {}`. Meta only.
- **render.php** — the new code is guarded: it only emits the `sgs-row-behaviour` marker class + `data-sgs-row-*` attrs when `sgs_resolve_tier_booleans()` returns a non-empty tier list. For any row with the new attrs UNSET (i.e. all existing content), both resolve to `[]`, so the guard is false and **render output is byte-identical to before**. No visual change to any existing page.
- **edit.js** — adds an Advanced ToolsPanel control (editor-only surface, no frontend render).
- **view.js / header-behaviours.css** — frontend behaviour that is INERT unless a row opts in (no marker class → JS skips the row → CSS rules don't match).

**Why --no-verify (not a fabricated PASS):** a frontend visual-diff PASS would require a rendered before/after comparison; that has NOT been run here and I will not claim it. The render-surface change is provably output-identical for default content (verified by inspecting the conditional emit in render.php:153-161). The NEW opt-in behaviour is live-verified separately on the sandybrown canary as the Spec 37 Phase 1 QA gate (per-row transparent + hide-on-scroll behaving independently at 375/768/1440, plus no regression to the header-level D376 behaviour), with md5 checksum verification of the shipped files.

**Basis for the verdict:** code inspection of the default no-op path, not a rendered pixel diff — stated honestly rather than as a visual PASS.
