# Directional sweep effect — design proposal (FR-41-37 follow-up)

**Status:** DESIGN ONLY — nothing built. For Bean's review.
**Date:** 2026-09-13

## What the shipped sweep actually is

`nav-menu-css.php` (border-sweep, ~line 614-627): a `::after` pseudo-element,
positioned absolutely, with:

- `inset-inline:0; bottom:calc(-1 * width); height:width` — band spans full
  WIDTH, sits flush against the BOTTOM edge (offset outward by the border
  width, from padding-box to where a real border would paint).
- `background-image:linear-gradient(to right, colourA 50%, colourB 50%);
  background-size:200% 100%` — a hard 2-colour edge, twice the element's
  width.
- `transition:background-position 300ms ease` sliding between `100% 0` and
  `0 0` (or reversed for `right-to-left`) — the "sweep" is the hard edge
  travelling across the visible window.

Everything that varies today (colour pair, width, duration, direction
flip) is already a parameter. The ONE hard-coded thing is the **axis**:
`to right` gradient + `200% 100%` size + `bottom` offset only ever produces
a horizontal band glued to the bottom. That's why FR-41-37's right-edge
separator (a vertical band, glued to the right edge) couldn't reuse it — the
gradient axis, the size axis, and the offset edge are all baked to
"horizontal, bottom" in one block of arithmetic.

## Two approaches

### A — CSS custom-property angle, server-computed, one shared helper (recommended)

Generalise the same primitive with an angle parameter. A directional wipe at
angle θ is: `linear-gradient(θ, colourA 50%, colourB 50%)` with
`background-size:200% 200%` (safe for every angle, not just the cardinal
ones) and background-position animating between two points that PHP computes
once from `cos(θ)`/`sin(θ)` at render time — no client JS. The 4 shipped
cardinal cases (0/90/180/270°) reduce to today's exact values, so this is
provably backward-compatible, not a new visual for existing rows.

Placement (which edge the band sits against) stays governed by which
border-box edge actually has a width — that's the pre-existing per-side
border control, untouched. The angle governs the gradient/travel direction
along whichever edge is active; a horizontal edge (top/bottom) meaningfully
takes 0°/180°, a vertical edge (left/right) takes 90°/270°. A true diagonal
sweep only makes sense on a *filled shape* (no single active edge), so it's
naturally out-of-scope for the border-sweep call site but the SAME helper
would already support it for a future non-edge-locked sweep (e.g. background
fill sweep on a card).

**Tradeoffs:** pure CSS/PHP, zero client JS (fits Spec 38's Tier V default).
One shared function, one call site changes signature (angle in, not
`rtl`/`to right` baked in). Migration cost: small — the existing bottom-edge
call becomes `angle: 0|180` instead of a boolean; ~30 lines in
`nav-menu-css.php` change, no new dependency, no markup change.

### B — JS-computed per-preset transform values

Compute the reveal via `transform: scaleX/scaleY/translate` driven by a
small JS lookup table per preset (horizontal-ltr, horizontal-rtl,
vertical-ttb, vertical-btt, diagonal×4), each preset hard-coding its own
transform-origin + axis. Arbitrary 360° angle would need real per-frame trig
in JS (a `viewScriptModule`), because `transform` has no native "travel
along an arbitrary CSS angle" primitive the way `linear-gradient(angle)`
does.

**Tradeoffs:** more inspector-friendly for presets alone, but the "true
360° dial" half of Bean's ask forces JS trig anyway — duplicating what
Approach A gets from the browser's own gradient-angle maths for free. Adds
a JS dependency to every nav-menu instance using any sweep (currently zero
JS is needed). Migration cost: rebuild, not parametrise — the shipped
bottom-edge CSS gets thrown away.

## Inspector UX

WordPress core ships exactly this control:
`@wordpress/components`' **`AnglePickerControl`** (used for gradient-angle
pickers in Cover/Gradient blocks) — a circular dial + numeric input, 0-360°.
Recommended layout: a preset `SelectControl`
(Horizontal / Vertical / Diagonal, each with a flip toggle) that WRITES
into the same `sweepAngle` attribute as sensible shortcuts (0°/180°,
90°/270°, 45°/225°), plus an "Advanced" disclosure exposing the raw
`AnglePickerControl` for power users. One attribute, one underlying
mechanism — presets are UI sugar, never a parallel data path.

## Where it should live

This is NOT nav-menu-specific. `check-hardcoded-render-defaults.js` and the
project's "universal mechanism" rule both point the same way: a directional
2-colour hard-edge wipe on a pseudo-element is a generic hover-effect
primitive. Recommend extracting the angle-aware band emitter into
`includes/helpers-tokens.php` (or a new `includes/sweep-css.php` sibling to
`nav-menu-treatments.php`) as `sgs_directional_sweep_css()`, callable by any
block with a hover-sweep (button, card-grid border, etc.) once they need
one — nav-menu is just the first caller. No other block currently has a
sweep of its own to migrate.

## Recommendation

**Approach A.** Server-computed angle, one shared PHP helper, CSS-only
output. It subsumes today's 4 cardinal cases exactly, needs no new JS
dependency, and reuses WordPress core's own `AnglePickerControl` for the
inspector rather than building bespoke UI. Change size: **small
parametrisation**, not a rebuild — the existing `::after` block's gradient
direction, background-size axis and position pair become angle-derived
values computed once in PHP; the border-edge/offset logic, colours, width
and transition timing are untouched.
