---
doc_type: design-gate
project: small-giants-wp
spec_ref: 38
created: 2026-07-31
status: AWAITING-BEAN-SIGNATURE
---

# Design gate — pointer-reactive container backgrounds (Bean ask #4, Wave D Step 7)

> **Nothing has been built.** This is a decision document. Root `CLAUDE.md` Rule 7 requires a design
> gate plus your approval before any change to the shared container wrapper, and Step 7 as written
> in the register would have edited `class-sgs-container-wrapper.php` as unattended parallel agent
> work. That is why it was pulled.

## What you asked for

A background whose pattern / colour / effect follows the pointer and reacts to the area it hovers.

## Problem → Effect → Solution

**Problem.** The register told me to build this by "generalising the `data-spotlight` implementations
in `nav-menu` and `mega-panel`". Two things are wrong with that instruction.

**Effect.** First, `nav-menu` contains **zero** spotlight code — that half of the premise is false.
Second, and more usefully: there is already a **shared module**,
[`src/shared/effects/spotlight.js`](../../plugins/sgs-blocks/src/shared/effects/spotlight.js), with
exactly one consumer (`mega-panel/view.js:160`). So the work is not "generalise two block
implementations" — it is "give an existing shared module a second consumer". That is a much smaller,
safer job than the register implies, and it changes which options are even on the table.

**Solution.** Pick one of the three routes below. They differ mainly in *how much of the wrapper they
touch*, which is the thing your Rule 7 exists to control.

## What already exists (verified, not assumed)

`spotlight.js` is in better shape than the register credits:

- It writes **only** the `--mx` / `--my` custom-property *values*. The actual `background-image` lives
  in the consuming block's own scoped stylesheet. That is already Spec 32 no-inline compliant.
- It is rAF-throttled and returns a cleanup function.
- **Reduced motion is already handled correctly.** It sets a static centre-ish position and then
  returns early without attaching any listener — so the spotlight never *moves*, but is never
  *absent*. That is precisely the SUPPRESS semantic Spec 38 §10 requires, and it means this effect
  arrives with its hardest accessibility requirement already met.
- **Touch already degrades correctly by construction** — it binds `mousemove`, which a touch-only
  device never fires, leaving the static position. (Note: "by construction" is a code reading, not a
  measurement. It needs the same real touch measurement Step 1 is applying to the drag surfaces.)

The container also already has a background-layer concept to hang this off: the `bgSvg*` family in
`class-sgs-container-wrapper.php` (lines ~451-469).

## The real design risk — and it is not the plumbing

The module's own docblock names it, and it is the thing worth your attention:

> the consuming block MUST verify text-over-the-lifted-zone contrast at the position the spotlight
> ACTUALLY occupies, not just at its resting spot

On `mega-panel` that is containable — one aside, known contents. On a **universal container
background** it is not, because any text a client drops into that container will sit over a *moving*
gradient. A contrast check at the resting position proves nothing about the position the spotlight
travels to. This is the captured rule `an-effect-recomputes-every-contrast-above-it`, and it is the
reason I would not ship the widest option first.

## The three routes

| | Route A — reuse, no wrapper edit | Route B — wrapper capability | Route C — full fx effect |
|---|---|---|---|
| **What it is** | A new opt-in attribute on `sgs/container` only, rendering its own scoped `::before` and calling the existing `initSpotlight` | A first-class background mode in the shared wrapper, so every wrapper-bearing composite (hero, cta-section, card-grid…) inherits it | A registered Tier V effect in the fx picker, offered on every qualifying block via the roster |
| **Wrapper edit** | **None** | Yes — Rule 7 territory | Yes, plus registry + seeder + roster |
| **Reach** | Containers | Every section/layout composite | Everything the roster qualifies |
| **Contrast risk** | Contained — one block, one opt-in | Wide — inherited by composites whose contents you do not control | Widest |
| **Effort** | ~45 min | ~2 h | ~3 h + a `/qc-council` pass |
| **Reversible** | Cleanly | Moderately | Hard once in the roster and seeded |

**My recommendation: Route A now, Route B once a client build actually asks for it.**

Reasoning: Route A gives you the visible capability this week with no change to a shared mechanism,
so it needs no Rule 7 gate beyond this document. It also lets us *measure* the contrast problem on a
real container with real client copy before deciding whether it is safe to inherit it across every
composite. Route C is the wrong shape regardless of appetite — a pointer-reactive background is a
property of a **container's background**, not a motion effect applied to an element, and putting it
in the fx picker would offer it on blocks that have no background to react with.

## What I need from you

1. **Route A, B or C** (or "not now").
2. **The look.** Currently the only implementation is a soft radial glow. Do you want that, or
   should I bring options — a gradient that shifts hue with pointer position, a subtle pattern that
   parallaxes, a spotlight that reveals a second background image underneath?
3. Whether the accent colour should default to your theme primary, as `mega-panel` does today.

## Proposed spec text, if you sign Route A

Next free number is **FR-38-25** (FR-38-24 is currently the highest).

> **FR-38-25 — Pointer-reactive container background (Tier V).** `sgs/container` MAY carry an
> opt-in pointer-reactive background layer. The pointer position is exposed to CSS as the `--mx` /
> `--my` custom properties by the shared `initSpotlight` module; the visual treatment is declared
> entirely in the block's own scoped stylesheet, never inline (Spec 32). **Reduced motion =
> SUPPRESS:** the layer renders at its static resting position and no pointer listener is attached,
> so the treatment is visible but never moves. Coarse-pointer devices degrade to the same static
> resting state — never a stuck hotspot. A container using this layer MUST have its text contrast
> verified at the position the layer actually travels to, not only at rest.

## Honest limits of this gate

1. The touch degradation is a **code reading, not a measurement**. If you sign any route, it needs a
   real coarse-pointer measurement, the same standard Wave D is applying everywhere else.
2. I have not designed the *look* beyond what already exists — that is question 2 above, and it is
   the part where your eye is worth more than my reasoning.
3. Route B's contrast exposure is stated as a risk, not a measured failure. I have not proven a
   composite would fail contrast; I am declining to inherit an unmeasured risk across every
   composite, which is a different and weaker claim.
