# site-footer — visual-diff report (2026-08-06)

```
verdict: PASS
first_paint_capture_passed: true
```

**Block:** `sgs/site-footer`
**Date:** 2026-08-06
**Target:** sandybrown canary, deployed via
`build-deploy.py --target sandybrown --blocks-only --payload …` (payload-scoped
dirty gate, NOT `--allow-dirty` — see D336).

## What changed

71 container-mirror attrs + `tagName` wired; default set to `footer`.

**Root tag:** `<div>` -> `<footer>` (DELIBERATE — see the landmark section below)

## First-paint capture (the field above, actually measured)

Probe: `plugins/sgs-blocks/scripts/motion-qa/probe-first-paint.mjs`, run with
**JavaScript disabled** — strictly harder than "before the module boots".

```
url      : https://sandybrown-nightingale-600381.hostingersite.com/
selector : .sgs-site-footer
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

## The landmark change (why `<div>` -> `<footer>`)

Measured on the canary homepage BEFORE this change: four `<footer>` elements, every
one a sub-element (`sgs-quote__attribution`, `sgs-testimonial__footer` x3), and
**zero site-level `contentinfo` landmark**.

Cause is the exact mirror of the header's D375 bug:
`Sgs_Footer_Rules::filter_template_part()` (class-sgs-footer-rules.php:263)
short-circuits `core/template-part` on `pre_render_block` whenever the rules engine
serves a footer, so core never emits its own `<footer>` wrapper — despite the theme
templates referencing the part as `{"slug":"footer","tagName":"footer"}`.

This retires two false claims that sat in `render.php`'s docblock: that `footer` is
not in the wrapper's tag allowlist (it has been since D344), and that the template
part provides the landmark (measured false above).

Safety verified before the change: the block renders OUTSIDE `<main>` (starts at
byte 123217; `</main>` closes at 123208) with zero unclosed `<footer>` ancestors.

Measured AFTER, on a cache-busted fetch: exactly ONE contentinfo-qualifying
`<footer>` (outside `<main>`, no footer ancestor) — the site footer. The other four
sub-element footers are inside `<main>` and correctly do not qualify.
