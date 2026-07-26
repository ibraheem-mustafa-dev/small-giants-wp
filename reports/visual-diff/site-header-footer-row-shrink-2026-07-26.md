# Visual-diff report — per-row shrink made proportional (Spec 37 Phase 2, P2-S1 fix)

**Date:** 2026-07-26
**Fixes:** the defect measured live earlier the same day — a row with no padding sat at
`padding-block: 0px` at rest and `4px` while "shrunk". It GREW.

## Honest status: this change IS visual, and no rendered visual diff was run

Unlike the additive Phase-2 commit, this one deliberately changes rendered output for any
row that has BOTH shrink enabled AND padding set. A rendered before/after diff was **not**
executed. What follows is what *was* verified, stated plainly.

## Root cause

`assets/css/header-behaviours.css` carried an ABSOLUTE shrunk value:

```css
.sgs-row-behaviour.is-row-shrink-active.is-row-shrunk {
    padding-block: var( --wp--preset--spacing--10, 0.5rem );
}
```

At (0,3,0) it out-specifies the wrapper's own `.sgs-container-<uid>` padding rule (0,1,0),
so it forced **every** shrunk row to the same absolute size regardless of its resting
padding. A shared stylesheet cannot know the resting value it is meant to reduce, so no
value written there can be correct for all rows.

## The fix

- The absolute rule is **deleted**. The stylesheet now carries only the transition.
- The shrunk value is emitted **per instance** by each row's `render.php` via the new
  shared `sgs_row_shrink_css()` (`includes/helpers-row-behaviour.php`), which calls the
  existing shared engine `sgs_emit_responsive_css()` with two scalar specs
  (`padding-top`, `padding-bottom`) and a transform returning `calc(<value> / 2)`.
- Shrink is therefore **proportional by construction** — it cannot exceed the resting
  value for any input. A row with no padding emits nothing and does not resize.
- Ratio = **0.5**, owner-decided 2026-07-26. It was previously an undeclared number.

Deliberately NOT `box => true`: a box spec expands to all four sides
(`sgs_responsive_atoms_from_spec:347-365`), which would halve left/right padding too and
jolt the row horizontally on scroll.

## Verified

**Local proof of the emitted CSS** (`php` against the real helpers, all seven cases):

| Input | Emitted |
|---|---|
| padding unset | *(nothing — growth impossible)* |
| desktop `24px` top+bottom | `padding-top:calc(24px / 2);padding-bottom:calc(24px / 2);` |
| bare numeric `24` | `calc(24px / 2)` — unit appended by the transform |
| `2rem` + mobile `1rem` | base rule + correct `@media (max-width:767px)` override |
| `clamp(0.5rem,2vw,1.5rem)` | preserved intact inside the `calc()` |
| left/right only | *(nothing — no horizontal jolt)* |
| `10px;}body{display:none` | `;{}` stripped — cannot break out of the declaration |

The bare-numeric case matters: a `transform` short-circuits the engine's own unit handling
(`sgs_responsive_format_atom_value:379-390`), so without the transform appending `px` a
stored `24` would have produced the invalid, silently-dropped `calc(24 / 2)`.

Also verified: `npx wp-scripts build` green; `check-dead-controls.js` 0 net-new across 81
blocks; `feature-dev:code-reviewer` pass.

## Review findings and disposition

1. **`prefers-reduced-motion` reset lost on specificity.** The reset targeted
   `.sgs-row-behaviour` (0,1,0) while the new transition rule is
   `.sgs-row-behaviour.is-row-shrink-active` (0,2,0) — so a visitor who asked for no
   motion would still have seen the 200ms padding animation. **Fixed:** the reset now
   repeats the compound selector, matching the discipline the hide-on-scroll reset
   already used.
2. No growth path found for any input shape; specificity confirmed to win over the
   wrapper's rule regardless of `<style>`-lift ordering; escaping confirmed; the Notice
   condition cannot throw; header-level `body.sgs-header-behaviour-shrink` untouched.

## Design provenance

Option comparison (shared-engine custom property vs per-row derivation) was settled by a
5-persona adversarial council. Three of the brief's own claims were false and are recorded
as such: the shared-engine path reaches only **2 of 29** wrapper-using blocks (only
`site-header-row` and `site-footer-row` pass `responsive_model => 'object'`);
`sgs_emit_responsive_css()` is a public shared helper already called directly from
`mega-panel/render.php:182` and `nav-drawer/render.php:140`; and `calc()` was never
exclusive to the shared-engine option.

## Still outstanding (NOT fixed here, recorded honestly)

- **Live verification on the canary has not been run for this fix.** The required
  assertion: computed `padding-top`/`padding-bottom` when shrunk ≤ resting, at 375/768/1440,
  on a row WITH padding and a row WITHOUT.
- **No 44px floor.** A row whose interactive children are floored at `min-height:44px`
  (WCAG touch target) may shrink with no visible change.
- **Shrink on a non-sticky row is invisible** — the row has scrolled away by the time the
  state fires, and it reflows content below. No warning or gate exists.
- **No editor preview** — `header-behaviours.css` is not enqueued in the admin, so the
  operator sees nothing until they publish and scroll.
- **`assets/css/` is not covered by any gate.** `check-hardcoded-render-defaults.js` walks
  `src/blocks/*` only, so the hardcoded literal that caused this defect sat in an unscanned
  file and nothing prevents its return except the ⛔ comment now in its place.
