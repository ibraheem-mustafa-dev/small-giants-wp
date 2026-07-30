---
doc_type: report
project: small-giants-wp
created: 2026-07-30
spec: 38
subject: "Horizontal panel — travel-distance fix + reduced-motion arm verdict"
---

# Horizontal panel: travel distance fixed, reduced-motion arm cleared

Two of the five Spec 38 Wave A close-out items, both closed on live measurement against the
sandybrown canary (`/motion-canary-horizontal-panel/`) at 1440×900.

---

## 1. Travel distance — FIXED (commit `810a15f9`)

### The reported defect

Owner: *"the 4th panel does show up but it doesn't go all the way across to the left where the
original panel's text was placed before it starts scrolling up again."*

### What the earlier record said, and why it was unusable

The block comment carried these figures: `track.scrollWidth 4189`, panel 1 starting at `-111`
relative to the band, panel 4 ending at `+153`, residual gap `~264px`.

**They are arithmetically impossible under the shipped CSS.** `flex: 0 0 clamp(280px, 80vw, 1100px)`
with `flex-shrink: 0` floors a four-panel row at 4 × 1100 = 4400 before any gap. 4189 cannot occur.

Resolution: the figures are **stale**, predating `1ca8d465` (the commit that gave panels a default
width). The `-111` is a probe artefact — `<html>` on this site carries `scroll-behavior: smooth`,
so a probe that scrolls and samples two frames later reads a page still in flight. A sweep taken
that way returned identical readings at every scroll position, i.e. "the effect never moves",
on an effect that demonstrably moves.

### Measured live, 2026-07-30

| Quantity | Value |
|---|---|
| panel `offsetLeft` | 0 / 1100 / 2200 / 3300 |
| panel width, `flex-basis` | 1100px (CSS **is** reaching the panels) |
| `track.scrollWidth` | 4400 |
| host `clientWidth` | 1200 |
| `track.children` | 4 SECTIONs — no `<style>` siblings |
| required travel | 3300 |
| travel applied (pre-fix) | 3200 |
| **landing error** | **exactly 100px** |

100px = host 1200 − panel 1100. That is the signature of *"stop when the row is flush right"*
rather than *"stop when panel N reaches panel 1's start"*. The owner's report is correct; the
figure is 100px, not 264px.

### The fix

`T = last.offsetLeft − first.offsetLeft`, taken over laid-out elements sharing one `offsetParent`.
Padding, gap and any whole-row offset cancel rather than needing to be discovered. `offsetLeft` is
defined over layout boxes and ignores the GSAP transform, so it survives every
`invalidateOnRefresh` recompute.

Guards: laid-out elements only (defence for contexts where the p99 CSS lift has not stripped the
scoped `<style>` siblings — the editor canvas); `< 2 panels → 0`; `offsetParent` equality asserted
not assumed; and `Math.max` with the flush-right distance as a **reachability floor**.

> **A council review proposed `Math.min( ideal, scrollWidth − clientWidth )` as a safety clamp.
> That evaluates to 3200 here — exactly the broken value — and would have silently reverted the
> fix.** The over-travel *is* the fix. The floor guards the opposite end: a client setting
> `--sgs-fx-panel-width` wider than the host would otherwise leave part of the last panel beyond an
> `overflow-x: clip` edge, which is not programmatically scrollable.

### Verification (negative control satisfied)

`scripts/motion-qa/probe-horizontal-panel.js`, same script both times:

| | pre-fix | post-fix |
|---|---|---|
| `pass` | **false** | **true** |
| `landingErrorPx` | 100 | **0** |
| `observedTravel` | 3200 | 3300 |
| `requiredTravel` | 3300 | 3300 |
| `reachable` | true | true |

The probe asserts the FINAL value against the REQUIRED value. Asserting that the row *moved*, or
moved *further than before*, passes while still being wrong by a fixed amount — which is how this
defect survived earlier passes.

**Accepted consequence (Bean, 2026-07-30):** the pin now ends with ~100px of empty band to the
right of the last panel. That is the direct trade for panel 4 reaching panel 1's start position.

### History correction

The block comment claimed `track.parentElement.clientWidth` had been tried and failed.
`git log -S "parentElement"` returns only the commit that wrote the *comment*. It was never
shipped. Two variants ever existed — `el.clientWidth` and `track.clientWidth` — and the second was
reverted. The comment now records this accurately.

---

## 2. Reduced-motion arm — CLEARED, the earlier report was wrong

### The claim under test

One probe reported `overflow-x: hidden`, `scroll-snap-type: none` and the last panel **unreachable**
at 1440px under `prefers-reduced-motion: reduce`. Never confirmed either way.

### Why those readings could not settle it

`overflow-x: clip` — what the motion-allowed override specifies — **computes to `hidden` in
Chrome** whenever the other axis is non-visible. Verified live with reduced motion OFF. And
`scroll-snap-type: none` is set by that same override. So both reported values are the signature of
the **motion-allowed** branch, and prove nothing about the reduced-motion one.

### Measured, both arms (`scripts/motion-qa/probe-reduced-motion.mjs`)

| | `reduce` | `no-preference` (negative control) |
|---|---|---|
| `overflow-x` | `auto` | `hidden` |
| `scroll-snap-type` | `x mandatory` | `none` |
| effect ran (pin-spacer) | **false** | true |
| track transform | `none` | `matrix(1,0,0,1,0,0)` |
| last panel | **REACHABLE** | REACHABLE |

The arms differ, so the emulation demonstrably takes effect and the run is not vacuous. The probe
exits 2 (INCONCLUSIVE) rather than 0 if the arms ever stop differing, or if the panel count drops
below 2.

### Verdict

**PASS.** Under reduced motion the GSAP effect does not run, the native scroll-snap fallback is
intact (`overflow-x: auto`, `scroll-snap-type: x mandatory`), nothing moves by itself, and every
panel is reachable. §10's SIMPLIFY requirement is met.

**The earlier "unreachable" report is FALSE.** It was measuring the motion-allowed branch and
attributing it to reduced motion. Recorded here so it is not carried forward again as an open
concern.

---

## Method notes earned this session

- **A measurement that contradicts the code it describes is stale until proven otherwise.** Check
  the recorded numbers against the CSS that governs them *before* building on them.
- **`scroll-behavior: smooth` silently invalidates scroll-and-sample probes.** Force `auto` for the
  duration, or every sample reads a page mid-flight.
- **A pinning effect does not begin at translate 0.** `resolveStart()` offsets the start by the
  header height, so the first in-range sample is already translated. Anchor "the start position"
  by finding translate `x === 0` explicitly — anchoring to the first sample overstated this gap as
  225 when it is 100.
- **Two candidate readings of the same symptom means you cannot predict a number.** Assert an
  invariant instead.
- **A computed value can differ from the specified one by browser normalisation** (`clip` → `hidden`).
  Never treat a computed reading as proof of which CSS branch applied — check the media query.
