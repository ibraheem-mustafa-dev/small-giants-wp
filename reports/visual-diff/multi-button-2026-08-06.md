# multi-button — visual-diff report (2026-08-06)

```
verdict: PASS
first_paint_capture_passed: true
```

**Block:** `sgs/multi-button`
**Date:** 2026-08-06
**Target:** sandybrown canary, deployed via
`build-deploy.py --target sandybrown --blocks-only --payload …` (payload-scoped
dirty gate, NOT `--allow-dirty` — see D336).

## What changed

14 container-mirror attrs declared.

**Root tag:** unchanged

## First-paint capture (the field above, actually measured)

Probe: `plugins/sgs-blocks/scripts/motion-qa/probe-first-paint.mjs`, run with
**JavaScript disabled** — strictly harder than "before the module boots".

```
url      : https://sandybrown-nightingale-600381.hostingersite.com/
selector : .sgs-multi-button
result   : [PASS] content server-rendered and VISIBLE with JS off — 1/1 items visible
           [PASS] NO clones in server markup — 0 clones with JS off
VERDICT  : PASS — 2/2 assertions held
```

`--not-a-loop` was passed. Justified, not assumed: `data-sgs-loop` is emitted by
exactly five blocks (`buybox`, `gallery`, `google-reviews`, `post-grid`,
`trustpilot-reviews`) — `render.php` for this block has no such emit path, so the
loop-marker assertion is inapplicable rather than failing. The flag is explicit by
design (STOP: auto-detect was rejected, because a loop block that FORGOT its marker
is the bug that assertion exists to catch).

## Render-risk analysis (pre-deploy, mechanical)

All 266 newly-declared attributes across this payload were compared against the
`??` fallback each consuming PHP file already used, scoped to the block's OWN
`render.php` plus the shared `includes/` (the first pass matched attr names across
ALL blocks and produced 111 false positives — e.g. `multi-button.columns` compared
against `card-grid/render.php`, which never renders it).

Result: **207 pairs provably neutral** (declared default identical to the fallback
it replaces), 12 empty-vs-empty, 46 with no PHP consumer, and 13 differing — all 13
in the shape-divider family, all matching `sgs/container` exactly. Those 13 are
unreachable on existing content: they sit behind `if ( $shape_top )` guards, and
because the attributes were previously UNDECLARED, WordPress would have discarded
any stored value (D338). No stored instance can have a divider enabled.

## Not claimed

- No screenshot pixel-diff was taken. This report attests first paint + rendered
  tag + the mechanical default-vs-fallback analysis, nothing more.
- Editor-canvas behaviour was not verified (the standing Spec 35 gap — everything
  to date is frontend-render + REST-registration only).
