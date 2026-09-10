# Visual diff — sgs/business-info — credit-link hover sweeps colour with the underline — 2026-09-10

verdict: PASS (live-verified on the canary after deploy)
first_paint_capture_passed: true
source_sha: 487ac7b14b944e72

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


---

## Amendment — 2026-09-10, after a QC council

A three-rater council reviewed this fix and found a REGRESSION it introduced:
**the credit printed invisible.**

`-webkit-text-fill-color: transparent` means the glyphs are painted by a
background image. Printers drop background images by default
(`print-color-adjust: economy`, or simply "Background graphics" unchecked).
Measured under print emulation, with the background removed exactly as a printer
would: the link's text row came back **byte-identical to a `visibility: hidden`
control** (166 bytes vs 166), against 3701 bytes for the shipped render — so the
probe demonstrably could tell a rendered word from a blank one.

Before this fix the resting state was an ordinary `color`, and this file's own
docblock had recorded that the earlier `background-clip: text` wipe was replaced
precisely because "there is no state in which the text can disappear". That
property was reintroduced without its guard.

**Fixed:** a `@media print` block mirroring the existing
`@media (forced-colors: active)` one — `background-image: none` and
`-webkit-text-fill-color: currentColor`. They are one failure class, not two:
the glyphs are painted BY a background, so anything that discards backgrounds
discards the text itself rather than its decoration.

Deliberately NOT `print-color-adjust: exact`. That would force a decorative gold
gradient onto a client's ink to solve a legibility problem.

The `::after` underline needs no print rule — it is `:hover`/`:focus-visible`
only, and neither state exists on paper.

**verdict: PASS** stands; the fix is amended, not withdrawn. The sweep synchrony
measurement (78.91% vs 78.91%) is unaffected — no timing or geometry changed.
