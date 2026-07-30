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

---

## 3. `fxEnd` + `fxTrigger` controls — SHIPPED, verified in the real editor

`fxTrigger` was **not** deleted. An earlier plan proposed removing it because it "needs a CSS
selector no client could type" — that was wrong. Spec 38 §11.2:583 defines it as
`load | scroll | hover`, and it is named in the §11.3 converter mapping, so deleting it without a
spec amendment would have put the code out of conformance with FR-38-4 and FR-38-22.

Both controls read two new `fx_effects` columns rather than new hand-maintained arrays in `fx.js`
(which already carries two that no gate cross-checks):

| Column | Drives | Source of the values |
|---|---|---|
| `pins` | the `fxEnd` control's wording | VERIFIED from source — `fx-pin-scrub.js` and `fx-horizontal-panel.js` are the only two modules setting `pin: true` (`grep -rn "pin: true"` returns exactly 2 hits; line numbers deliberately omitted — they drifted to `:291`/`:266` when `48f34e9e` landed, and a stale line cite is worse than none). `owns_scroll_transform` is not a proxy: 5 effects set it, 2 pin. |
| `triggers` | which "When it starts" options appear | The per-effect enum §11.2 already specifies. |

### Verified live in the block editor (D388 — an edit.js change is not verified until the editor opens)

| Effect | Controls rendered |
|---|---|
| `horizontal-panel` (pins, `triggers=[scroll]`) | **How long it stays stuck** — Automatic / Short / Standard / Long. **No "When it starts"** — correctly suppressed, a one-value control is a dead control. |
| `scrub` (no pin, `triggers=[scroll,load,hover]`) | **When it starts** — the three options, `hover` set and honoured. **Where it finishes** — scroll-position options. |

Zero console errors; the editor loaded and the panel worked.

### The self-test was extended, because it could not have caught this

`check_motion_fx_reseed.py --self-test` injected only `owns_scroll_transform`. Adding two guarded
columns would have left it reading green while proving nothing about them — the same shape as
fixing one vacuous check and shipping another hours later. It now injects **every** guarded column
in turn and names any that go uncaught. All five verified catchable:

```
pin-scrub.owns_scroll_transform: 1 -> 0 — caught
pin-scrub.scope: 'block' -> '__selftest_block' — caught
pin-scrub.requires: 'section' -> '__selftest_section' — caught
pin-scrub.pins: 1 -> 0 — caught
pin-scrub.triggers: 'scroll' -> '__selftest_scroll' — caught
```

### The hover arm cannot strand content — by construction, not by device sniffing

`fx-scrub` and `fx-split-reveal` are `fromTo`/`from` tweens whose from-state is `opacity: 0`, and
both render that state immediately by default. A paused tween has therefore ALREADY hidden its
element, so a trigger that never arrives — touch screen, a visitor who never points at it, nothing
focusable inside — would leave the content invisible permanently. That is unreachable content.

`immediateRender: false` removes the failure mode entirely: the element stays exactly as the server
rendered it and hover REPLAYS the reveal. No `(hover: none)` branch, no assumption about how the
visitor is browsing. `focusin` is bound alongside `mouseenter` for keyboard parity — that is
parity, not the safety mechanism.

---

## Findings surfaced while verifying (parked, neither caused by this work)

1. **`P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR`** — every `sgs/container` on the canary pages
   is `isValid: false` in the editor (7 of 21 blocks on page 2024). Stored markup carries
   `<div class="wp-block-sgs-container"></div>`; `save.js` emits `<InnerBlocks.Content />` and no
   wrapper. Frontend unaffected and measured green. Confirmed pre-existing before recording:
   `container/save.js` last changed at `e1459e6d`, and no commit in this session touched a
   container file.
2. **`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE`** — `check-dead-controls.js:514`,
   `check-control-ux.js:455` and `audit-inspector-conformance.js:270` all exclude or never reach
   `src/blocks/extensions/`. The fx panel has never been linted, which is exactly how `fxTrigger`
   sat rendered-by-nothing unnoticed. Spec 38 §7:472-473's claim that the gate "covers every new
   panel automatically" is false for this panel.

---

## 4. Pin-scrub children never animated — FIXED (`4ae10dd9`), owner-reported

Bean's eye pass: 6 of 7 canaries passed. On `/motion-canary-pin-scrub/` the pin engaged but
nothing inside it moved, against a page whose own stated pass condition is that the children
animate. R-31-13 — the eye caught what every mechanical check had called green.

### Two independent faults, either alone sufficient

| Fault | Proof (source) | Proof (live DOM) |
|---|---|---|
| Nothing ever wrote `data-sgs-fx-child`, which the module required on every participant | grep across `src/`, `includes/`, `theme/`: the string appears only in `fx-pin-scrub.js` itself | `document.querySelectorAll('[data-sgs-fx-child]').length === 0` |
| It read DIRECT children; `sgs/container` renders content one level deeper | — | `el.children` = 1 × `div.wp-block-sgs-container`, holding the 3 real content blocks |

Both produce `MODULE_WOULD_ANIMATE: 0` with `pinEngaged: true` — a pin that holds a section still
to animate nothing. **It failed silently because an empty participant list still builds a valid
timeline**, so the effect looks wired from the outside. That is the same shape as `fxTrigger`: a
read with no writer, invisible to every gate.

The depth half is the same mistake that cost the horizontal panel two passes (`5830985e`:
*"I twice fixed the element IDENTIFICATION while the actual fault was the element DEPTH"*).
Identifying the right element and being at the right LEVEL are different questions.

### The fix

Follows FR-38-6's own wording — *"pins … while its CHILDREN'S tweens play"* — rather than an
opt-in marker the spec never asks for. Participants are the element children of the section's
content wrapper; `data-sgs-fx-child` survives as an optional NARROWING filter so deliberate
authoring still wins where it exists.

The unwrap steps through the two framework-owned wrapper classes only. A first draft descended
through any single element child, which is subtly wrong: a section holding one heading would
unwrap past the heading and animate the `<span>` inside it.

Zero participants now bails with a console warning rather than pinning for nothing.

### Verified live

| Child | opacity start → end | y start → end |
|---|---|---|
| "Pinned section" | 0.383 → 1.0 | 24.7 → 0 |
| "This child animates during the pin." | 0 → 1.0 | 40 → 0 |
| "So does this one, slightly later." | 0 → 0.999 | 40 → 0 |

Participants 0 → 3. Stagger confirmed real: at the pin midpoint the three read 1.0 / 0.997 / 0.94,
so the third genuinely trails as its own copy claims. End state fully visible — fail-open intact.
The probe asserts `participantCount >= 2` first, so a one-child section cannot pass it vacuously.

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
- **An effect that "engages" is not an effect that WORKS.** A pin with an empty timeline pins
  perfectly and animates nothing, and looks identical to a working one from outside. Assert on the
  thing the effect is supposed to MOVE, not on whether the machinery started.
- **A read with no writer fails silently and no gate catches it.** Both `fxTrigger` and
  `data-sgs-fx-child` were consumed by code and produced by nothing. When adding an attribute
  contract, grep for the WRITER before assuming one exists.
- **Identifying the right element ≠ being at the right depth.** Three separate defects this
  session came from reading one DOM level above the content. When a wrapper is involved, resolve
  by framework-owned class, never by position or by "the only child".
