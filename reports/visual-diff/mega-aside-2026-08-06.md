# mega-aside — visual-diff report (2026-08-06)

```
verdict: PASS
first_paint_capture_passed: true
```

**Block:** `sgs/mega-aside`
**Date:** 2026-08-06
**Target:** sandybrown canary, deployed via `build-deploy.py --target sandybrown
--blocks-only --payload …` (payload-scoped dirty gate, never `--allow-dirty`).

## What changed

`enum` (`feature|preview|cta`) added to the existing `asideFormat` attr.

Root tag: unchanged.

## First-paint capture (the field above, actually measured)

Probe: `plugins/sgs-blocks/scripts/motion-qa/probe-first-paint.mjs`, **JavaScript
disabled** — strictly harder than "before the module boots".

```
url      : https://sandybrown-nightingale-600381.hostingersite.com/mega-panel-canary-2026-08-06/
selector : .sgs-mega-aside
result   : [PASS] content server-rendered and VISIBLE with JS off — 1/1 items visible
           [PASS] NO clones in server markup — 0 clones with JS off
VERDICT  : PASS — 2/2 assertions held
```

Fixture: page 2154, nested inside `sgs/mega-panel` because this block declares `parent: ['sgs/mega-panel']`.

`--not-a-loop` passed and justified: `data-sgs-loop` is emitted by exactly five
blocks (`buybox`, `gallery`, `google-reviews`, `post-grid`, `trustpilot-reviews`).
This block's `render.php` has no such emit path, so the loop-marker assertion is
inapplicable rather than failing.

## Enum-narrowing risk (the real risk for this change)

Narrowing an `enum` can silently coerce a stored out-of-range value to the
attribute's default. Checked directly against the canary database rather than
assumed: a REGEXP over `wp_posts.post_content` for all six narrowed attrs in this
payload matched only two posts, holding `colourScheme:"dark"` and
`desktopFrameExt:"webp"` — both inside their new enums. **No stored value anywhere
falls outside a narrowed enum, so no content can be coerced.**

The pre-deploy `oldshape-audit` gate (which exists to catch a deploy whose schemas
strand or delete stored content) also passed on both canary deploys.

## Not claimed

- No screenshot pixel-diff. This attests first paint + the stored-value analysis.
- Editor-canvas behaviour not verified (standing Spec 35 gap).
