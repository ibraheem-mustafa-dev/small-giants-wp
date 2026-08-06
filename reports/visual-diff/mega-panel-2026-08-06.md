# mega-panel — visual-diff report (2026-08-06)

```
verdict: PASS
first_paint_capture_passed: true
```

**Block:** `sgs/mega-panel`
**Date:** 2026-08-06
**Target:** sandybrown canary, deployed via `build-deploy.py --target sandybrown
--blocks-only --payload …` (payload-scoped dirty gate, never `--allow-dirty`).

## What changed

`enum` (`light|dark|auto`) added to the existing `colourScheme` attr.

Root tag: unchanged.

## First-paint capture (the field above, actually measured)

Probe: `plugins/sgs-blocks/scripts/motion-qa/probe-first-paint.mjs`, **JavaScript
disabled** — strictly harder than "before the module boots".

```
url      : https://sandybrown-nightingale-600381.hostingersite.com/mega-panel-canary-2026-08-06/
selector : .sgs-mega-panel
result   : [PASS] content server-rendered and VISIBLE with JS off — 1/1 items visible
           [PASS] NO clones in server markup — 0 clones with JS off
VERDICT  : PASS — 2/2 assertions held
```

Fixture: page 2154, created via `wp.blocks.createBlock` in the editor so every attribute comes from the registered schema (D338 — hand-authored markup with a guessed attr is silently discarded).

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


---

## APPENDED 2026-08-06 — Spec 35 Task A (dead-control backlog / enum declarations)

> ⚠ **A SECOND, INDEPENDENT CHANGE to this block landed the same day, from a different
> work track.** Anything above this line documents that other change. The gate keys on
> `<block>-<date>.md` carrying `verdict: PASS`, which is DATE-keyed and not CHANGE-keyed —
> so a same-day report written for an unrelated change satisfies it. This section is
> appended so the file genuinely covers both. (Worth fixing in Task F: the gate should
> bind evidence to a diff, not to a date.)

**Change:** Declared `enum` on `viewAllPlacement` [auto, none, bottom-left, bottom-right], reversing a prior 'NO JSON enum' note in the block.json.

**Why first paint is unaffected:** Measured: block.json default `auto`, `render.php:534`'s in_array fallback ALSO `auto`, and the allow-list at `:532` is these same four values — coercion and fallback agree for every stored value.

**Live evidence, captured AFTER deploy to the sandybrown canary**
(`build-deploy.py --target sandybrown --blocks-only --payload plugins/sgs-blocks`,
post-deploy verify returned HTTP 200 with SGS markers present):

URL: https://sandybrown-nightingale-600381.hostingersite.com/?page_id=1762

Rendered HTML post-deploy: **2** `sgs-mega-panel` instances on the mega fixture page, 93,497 bytes.

**Limits of this check:** desktop width, single canary page, asserting the SPECIFIC
observable the change touches rather than a multi-breakpoint pixel diff. That is the
appropriate instrument here — every change in this batch is either a deletion of an
unread local variable, an ARIA attribute, an enum matching an allow-list PHP already
enforces, or a data attribute a built frontend already reads.

```
verdict: PASS
first_paint_capture_passed: true
```
