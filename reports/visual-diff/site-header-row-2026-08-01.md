---
doc_type: visual-diff
block: sgs/site-header-row
date: 2026-08-01
verdict: PASS
first_paint_capture_passed: true
decision: D454
site: sandybrown-nightingale-600381.hostingersite.com
---

# sgs/site-header-row — visual diff, D454 (delete the authored stack, lock the row to one line)

## What changed

The row no longer stacks its contents into a vertical pile. The
`@container (max-width:767px){ flex-basis:100% }` rule was deleted and
`flexWrap` locked to `nowrap`; the logo's blanket `flex-shrink:0` was replaced
with a `min(100%, var(--sgs-header-logo-min, 7.5rem))` floor so it yields with
everything else instead of forcing overflow.

## Method

Deployed to the canary (`build-deploy.py --target sandybrown --blocks-only`,
exit 0, verify leg passed), then swept the **live** page. Every navigation
cache-busted. Layout polled until settled rather than sampled after a fixed
delay — `scroll-behavior: smooth` has produced false measurements on this
project before.

**NO-STACK metric:** the flex container's content height (its own padding
subtracted) versus its tallest child. Counting distinct child `top` values is
unsound and was rejected during D420 — children on the same flex line
legitimately differ in top. The flex container is *detected* per row
(it is `.sgs-container__inner`, not the row itself), not assumed.

## Result — swept 1400 → 320px in 10px steps (109 widths)

```
Rows found: 2 — #0 on .sgs-container__inner display:flex flex-wrap:nowrap
                #1 on .sgs-container__inner display:flex flex-wrap:nowrap

Narrowest sample (320px):
  row 0: rowWidth 320 | children 1 need 252.7px of 320px | contentH 22.4 vs tallest 22.4 | stacked=false
  row 1: rowWidth 320 | children 3 need 300.0px of 320px | contentH 66.6 vs tallest 66.6 | stacked=false

PASS — no stack, no overflow, no sub-44px target at any swept width.
```

`document.scrollWidth <= clientWidth` held at all 109 widths. No interactive
child fell below 44×44px at any width.

## Negative controls — the check is proven able to fail

A sweep that has never failed proves nothing. Two controls were run against the
live page.

**Control A — full original condition re-injected** (`flex-wrap:wrap` restored
*and* `flex-basis:100%`). **Correctly FAILED**, exit 1:

```
width 760: ROW 1 STACKED — content height 229.9px vs tallest child 109.9px
           (measured on .sgs-container__inner, flex-wrap:wrap,
            3 children needing 2312px of 760px)
... 7 failures, 760px down to 700px; clean at 800-770px
```

A clean cliff at the 767px boundary, and the measured stacked height of
**229.9px matches D420's independently measured 229px** — the control
reproduces the original defect, so the PASS above is meaningful.

**Control B — `flex-basis:100%` re-injected with the `nowrap` lock left
intact.** Expected to pass; it **FAILED with horizontal overflow** instead
(`scrollWidth 772 > clientWidth 740`, from 740px down).

This is the more useful result: it proves the two changes are **not overlapping
fixes**. Deleting the rule and locking `nowrap` each defend a different failure:

| condition | outcome |
|---|---|
| `wrap` + `flex-basis:100%` (original) | stacks |
| `nowrap` + `flex-basis:100%` | overflows horizontally (WCAG 1.4.10) |
| `nowrap`, rule deleted (**shipped**) | neither |

Both changes are load-bearing; neither is redundant, so neither can be quietly
removed later. If that rule is ever reintroduced the row will overflow rather
than stack — `plugins/sgs-blocks/scripts/row-fit-sweep.mjs` is the regression
guard for exactly this.

## First-paint capture

Measured at `domcontentloaded`, before `networkidle`, so a flash of the old
stacked layout would be caught; then re-measured settled to detect any shift.

| viewport | first paint | settled | shift |
|---|---|---|---|
| 390px | `nowrap`, contentH 22.4 vs tallest 22.4, stacked=false | `nowrap`, h 22.4 | none |
| 768px | `nowrap`, contentH 23.9 vs tallest 23.9, stacked=false | `nowrap`, h 23.9 | none |
| 1440px | `nowrap`, contentH 25.6 vs tallest 25.6, stacked=false | `nowrap`, h 25.6 | none |

`first_paint_capture_passed: true` — no stack and no non-`nowrap` state at
first paint at any width, and no layout shift between first paint and settled.

Screenshots written to `reports/visual-diff/site-header-row-2026-08-01-{390,768,1440}.png`
— **untracked: PNGs are gitignored in this directory**, so they are local
evidence only and are not part of this commit. Regenerate with
`scripts/row-fit-sweep.mjs` against the canary. At 390px the header renders as
one line: logo left, burger and cart right.

## Editor surface

`style.css` and `editor.css` compile to independent bundles, so the frontend fix
does not reach the editor canvas. Both were changed. Verified in the compiled
editor bundle that the row's own rule is `nowrap`, and that the two remaining
`flex-wrap:wrap` declarations belong to unrelated selectors
(`.sgs-icon-picker__tabs`, `.sgs-row-quick-insert__buttons`):

```
flex-wrap:wrap    <- .sgs-icon-picker__tabs
flex-wrap:nowrap  <- .editor-styles-wrapper .sgs-site-header-row
flex-wrap:wrap    <- .editor-styles-wrapper .sgs-row-quick-insert__buttons
```

## Not verified

- **Browser text zoom at 200% (WCAG 1.4.4).** Not measured. `deviceScaleFactor`
  was empirically confirmed to be a rendering-resolution knob with zero layout
  effect, and root-`font-size` scaling does not reach SGS typography because
  theme.json declares those sizes in fixed `px`. No honest instrument was
  available, so no claim is made. The change introduces no viewport- or
  container-unit sizing, so it does not add 1.4.4 risk — but that is reasoning,
  not measurement.
- **Bean's eye (R-31-13).** Numbers do not close this; a real header at 390 and
  1440 still needs his sign-off.
- The `SGS-CPT-HEADER-PROOF-20260722` banner visible in the screenshots is the
  known generic proof header already tracked in the LEDGER, not part of this
  change.
