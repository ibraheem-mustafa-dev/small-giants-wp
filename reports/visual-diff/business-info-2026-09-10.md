# Visual diff — sgs/business-info — credit-link hover sweeps colour with the underline — 2026-09-10

verdict: PASS (live-verified on the canary after deploy)
first_paint_capture_passed: true
source_sha: 09c510dac188623a

Retroactive report. The commit (`53a6c906f`) took a scoped visual-gate skip with the reason
"before-state captured, after-capture requires this commit to deploy". This is the paired report
that skip promised.

## The defect

Bean reported it on the live footer: the underline animates left-to-right while the text colour
cross-fades uniformly, so the word turns gold all at once beneath a line still arriving.

## Before — measured live, pre-deploy

Transitions were slowed to `10s linear` via an injected stylesheet so the sampled frame is
deterministic rather than a race. Same instant, both halves:

| | Value |
|---|---|
| Underline | 140.4px of 222px swept = **63%** |
| Text colour | `rgb(251,243,220)` -> `rgb(253,243,207)` = **~8%** toward gold, UNIFORM on every letter |
| `transition` (text) | `color 0.3s` |
| `transition` (`::after`) | `width 0.3s` |
| `background-image` | `none` |

Capture: `credit-hover-BEFORE-midsweep.png` (whole word uniformly cream mid-hover).

## After — measured live, post-deploy

| | Value |
|---|---|
| `background-image` | linear-gradient present |
| `background-size` | `200% 100%` |
| `background-position` (rest) | `100% 0px` |
| `-webkit-text-fill-color` | `rgba(0, 0, 0, 0)` |
| `transition` (text) | `background-position 0.3s` |
| `::after` transform | `matrix(0, 0, 0, 1, 0, 0)` = `scaleX(0)` |
| `transition` (`::after`) | `transform 0.3s` |

**The measurement that closes it** — same instant, mid-sweep:

- text swept **78.91%** (`background-position` 100% -> 21.0865%)
- underline swept **78.91%** (`scaleX 0.789135`)

They now agree to three decimal places. Before: 63% vs 8%.

Capture: `credit-AFTER-50pct.png` — forced to exactly 50% so the boundary is visible: "Website by
Sm" gold, "all Giants Studio" cream, clean edge mid-word. The colour has a POSITION, which is the
whole point.

## Side effect: this unblocked every deploy in the repo

The old underline animated `width`, which `hover-guard/classify.js` cannot classify, so
`hover-guard/check.js` FAILED and aborted `npm run build` for the whole plugin — not just this
block. `transform` and `background-position` are both known motion properties, so both rules are
now auto-guarded for touch and the gate passes.

Chosen over adding `width`/`height` to `MOTION_PROPERTIES` (Bean's call): that is a shared
build-time classifier affecting every block, where this touches one file and removes a real
performance defect (`width` is a layout property; the old sweep reflowed the line every frame).
Blast radius of the rejected option was measured first: 4 hover rules repo-wide declare
width/height, 3 already classified.

## Not regressions, verified

- `:focus-visible` still shares the rule (WCAG 2.1.1 — the effect must not be mouse-only). The
  hover-guard splits the selector and wraps only the `:hover` member.
- `@media (forced-colors: active)` returns `currentColor` to the glyphs and drops the gradient.
  Without it a transparent text fill renders the credit INVISIBLE in Windows High Contrast,
  because forced-colors replaces backgrounds and the colour is now carried by one.
- Reduced motion keeps BOTH end states and drops only the travel.
