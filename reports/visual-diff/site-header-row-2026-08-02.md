---
doc_type: visual-diff
block: sgs/site-header-row
date: 2026-08-02
verdict: PASS
first_paint_capture_passed: true
decision: D455
site: sandybrown-nightingale-600381.hostingersite.com
---

# sgs/site-header-row — visual diff: the `gap` default becomes a fluid clamp

## What changed

One line: the `gap` attribute default moved from `{"desktop": "16px"}` to
`{"desktop": "clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)"}`. Spacing between header
elements now scales continuously with the row's own width instead of sitting at
a fixed 16px everywhere.

This is a **visible rendering change** on every header-row instance that has not
had its gap explicitly overridden, which is why it needs this report rather than
the markup-neutral skip.

## Correction carried into this report

The change was originally documented — in `block.json` and in the LEDGER — as
being *enabled by* the `sgs_css_length_value()` validator shipped the same day.
**That was wrong, and a review caught it after the docs were written.**

`gap` is an OBJECT here, so `render.php` passes `responsive_model: 'object'` and
the value is emitted by `sgs_emit_responsive_css()` →
`sgs_responsive_sanitise_css_value()` (`includes/helpers-responsive.php`) — a
**pre-existing** character allowlist that already permitted parentheses and
commas. Verified by running that exact allowlist over that exact clamp string:
output unchanged. The clamp would have rendered before the validator existed.

The validator is load-bearing for the ~19 FLAT-scalar `gap` callers (card-grid,
hero, gallery and friends), not for this attribute. Recorded because a false
causal claim in a code comment is how the next person gets misled.

## Method

Deployed to the canary, then measured the live page. Cache-busted on every
navigation. Three independent assertions, because any one of them alone can pass
while the change is broken.

## 1. The served bytes carry an intact `clamp()`

Read from the actual lifted stylesheet the page loads, not inferred from source:

```
sgs-1095-019c4a7f05711236e49eedd1ed18fd9c.css: gap:clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)
```

## 2. The computed gap genuinely VARIES

A clamp that emits correctly but never changes is the same failure wearing
better clothes, so this was asserted separately from (1).

| viewport | row width | computed gap | emitted on |
|---|---|---|---|
| 1400 | 1400 | 16px | `__inner` |
| 1024 | 1024 | 16px | `__inner` |
| 900 | 900 | 16px | `__inner` |
| 768 | 768 | 15.52px | `__inner` |
| 600 | 600 | 13px | `__inner` |
| 500 | 500 | 11.5px | `__inner` |
| 420 | 420 | 10.3px | `__inner` |
| 380 | 380 | 9.7px | `__inner` |
| 320 | 320 | 8.8px | `__inner` |

7 distinct values, range 8.8–16px, inside the clamp's own bounds.

**Every sample landed on `.sgs-container__inner`, which is the load-bearing
detail.** `cqi` resolves against the nearest ANCESTOR query container — an
element can never query itself. The row sets `container-type: inline-size` on
itself, so the gap MUST land on the descendant band for `cqi` to resolve against
the row. `$grid_on_inner` is forced true for `layout` of `flex`/`grid`
(`class-sgs-container-wrapper.php:528`), which the editor's only two options
guarantee.

The measured flat/fluid boundaries match the arithmetic: the 1rem ceiling is
reached at container width ≥800px, the 0.5rem floor at ≤267px.

## 3. The D455 no-stack guarantee still holds

`scripts/row-fit-sweep.mjs --from 1400 --to 320 --step 10 --touch-targets`
→ **PASS, all assertions across 109 widths.** No stack, no horizontal overflow,
no interactive child below 44px, with the new fluid gap in place.

## 4. First paint

Measured at `domcontentloaded` with no settle wait, at 500px viewport:

```
gap at first paint (DCL) : 11.5px
gap after settle         : 11.5px
```

Identical — no flash, no fallback value painting first. Expected by
construction (the value comes from a stylesheet, no JS involved), but asserted
rather than assumed.

## Not verified

- **Bean's eye on the fluid gap specifically.** He signed off the D455 no-stack
  behaviour on 2026-08-01; the spacing curve is new and has not had his look.
- **200% browser zoom.** Cleared for D455 by Bean checking directly on desktop
  and phone. Not re-run for this change; no viewport/container-only unit was
  introduced that would alter the zoom behaviour (the clamp keeps a `rem`
  component), but that is reasoning, not measurement.
- **WebKit.** Measured in Chromium only. The footer's `auto-fit` work was
  separately confirmed identical in WebKit; this change introduces no new
  container-query feature beyond `cqi`, which that WebKit pass already exercised.

## Deploy note

Deployed with `--allow-dirty` at Bean's explicit instruction: a co-active track
had files staged in deploy scope for several hours, and he judged the canary
risk acceptable. Their in-progress `form/`, `gallery/` and theme CSS rode along.
**Canary only — this is not a precedent for production (D336).**
