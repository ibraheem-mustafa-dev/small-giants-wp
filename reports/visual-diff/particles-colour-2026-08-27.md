# Visual diff — FR-38-32 particle trail gains a colour control (D846)

**Date:** 2026-08-27 · **Branch:** `main` · **Canary:** page 2744
(`/gate-do-not-delete-particle-trail-fr-38-32/`) · **Viewport:** 1440×900 @2x

## Why this change exists

Bean flagged that he had never seen the particle trail. The doc said "OBSERVED 2026-08-25", which
covered the editor's inspector controls only — nobody had ever watched the frontend visual.

## The measurement that found the cause

⛔ **Not inferred — measured on the live canary before any code was written.**

| What | Value |
|---|---|
| Emitter computed `color` (the trail's colour source, `particles.js:241`) | `rgb(58, 46, 38)` |
| Emitter computed `background-color` (what it paints onto) | `rgb(16, 16, 24)` |
| **Contrast ratio** | **1.44 : 1** |
| Origin of that `color` | inherited from `<body>` — the container sets a dark background but no text colour |
| Lit canvas pixels during a 40-point pointer sweep | ~7,400 |

**The effect was firing perfectly and was invisible.** A lit-pixel count called it healthy; only the
contrast measurement and a screenshot disagreed. This is the `a-green-measurement-is-not-fidelity`
case with a number attached.

## The decisive experiment

Same page, same deployed code, **only the colour changed** — proving the effect itself was never
the problem.

| Run | Mean drawn pixel RGB | Lit px |
|---|---|---|
| as-shipped | `[58, 45, 37]` — exactly the inherited text colour | 7,449 |
| recoloured to `#ffe9c7` | `[255, 233, 199]` — exactly the value set | 6,355 |

⚠ **The first attempt at this control was VACUOUS and nearly produced a false negative.** It set
`el.style.color` and dispatched `window.resize`. The module observes a **`ResizeObserver` on the
element** (`particles.js:483`), not window resize, so the handler never re-ran, the colour never
changed, and the two screenshots came back identical. Read as "recolouring doesn't help" that would
have killed a correct hypothesis. The control was only trusted once the drawn pixel RGB was sampled
and shown to actually differ — a negative control has its own vacuity mode.

## Screenshots

- `particles-as-shipped.png` — what is live now. A faint arc of dark specks; the panel's own
  heading is near-illegible for the same reason.
- `particles-recoloured.png` — identical code, legible colour. A clean fading trail, brightest at
  the pointer.

## What shipped

Owner's ruling (2026-08-27): give the client a **control**, do not have the engine guess a colour.
The cursor field (FR-38-25) already ships a colour picker beside style and size; the particle trail
shipped style, density and size but no colour — so this closes an inconsistency between two sibling
effects as well as a live defect.

| File | Change |
|---|---|
| `includes/fx-attributes.php` | `fxParticleColour` → `data-sgs-fx-particle-colour`; added to the `particles` param scope |
| `includes/fx-particles.php` | **NEW.** `render_block` p11, mirrors `fx-cursor-field.php`. Reuses `sgs_fx_cursor_field_colour()` verbatim (as `fx-surface-treatment.php` already does) and emits a uid-scoped `<style>` setting `--sgs-fx-particle-colour` |
| `includes/class-sgs-blocks.php` | requires the new module |
| `src/blocks/extensions/fx.js` | attribute + data-attr emit + a `DesignTokenPicker` "Trail colour" control |
| `assets/css/fx-particles.css` | `.sgs-particles__canvas { color: var( --sgs-fx-particle-colour, inherit ) }` |
| `src/shared/effects/particles.js` | reads `getComputedStyle( canvas ).color` instead of the emitter's |

**Why the colour is read from the CANVAS, not the emitter** — this is the non-obvious part. The
override is stored as a palette SLUG and resolved to `var(--wp--preset--color--<slug>)` so the
client's token stays live. But a custom property read back with `getPropertyValue()` returns that
`var(...)` text **unresolved**, and a canvas cannot paint with a string. Declaring it on a real
`color` property forces the cascade to resolve it, so the JS always reads a concrete `rgb()`. The
`inherit` fallback is the shipped default, which is what makes this opt-in.

## Backwards compatibility

**Byte-identical with no colour set.** `fxParticleColour` defaults to `''`; the PHP filter returns
the original content untouched when empty; the CSS falls back to `inherit`, which is the emitter's
text colour — the pre-D846 behaviour exactly. No existing instance moves.

## Gates

- `check-fx-list-drift.py --check` → **10/10 invariants, exit 0** (I3 and I4 specifically confirm
  the new attribute joined the attr map and a param scope).
- `npx wp-scripts build` → **compiled successfully**.
- `php -l includes/fx-particles.php` → no syntax errors.

## ⛔ OWED — this is NOT closed

**Not deployed, therefore not live-verified.** `npm run build` cannot complete on `main`:
`check-control-ux.js` fails with `RESPONSIVE-FAMILY-WITHOUT-SWITCHER` on `sgs/site-header` and
`sgs/trust-bar`. **Proven pre-existing and unrelated** — a detached worktree at HEAD with zero local
changes fails the identical gate with identical violations. Nothing in this change touches those
blocks.

So the following remain owed once that gate is green:
1. Deploy and confirm the control appears in the editor and the override reaches the frontend.
2. **Bean's eye on the live trail** (R-31-13) — the whole point of the task. The screenshots here
   are evidence, not sign-off.
