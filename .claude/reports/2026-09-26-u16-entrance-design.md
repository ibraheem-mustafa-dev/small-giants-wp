# U-16 design: header and footer entrance animation (M-11)

Wave 3C, lane B. Plan `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` §4 row 14. Bean column: `eye`
(Bean judges the built output; the design gate is closed by the council). Evidence: step 0d, headed capture
2026-09-26 (f839facc7), cells in `<ref>.json` (`entrance`, footer `motion` and `item_states`), raw samples local
in `.claude/reports/reference-requirements/raw/*-0d*.json`.

## 1. Problem

M-11 was "partial, evidence thin": the family assumed three references animate the header in and that SGS could
not express it because `site-header` and `site-footer` hide the Spec 38 `fx` picker. Step 0d measured it.

## 2. What already exists

Every SGS block carries the universal animation extension (`src/blocks/extensions/animation.js`,
`includes/animation-attributes.php`, `assets/js/animation-observer.js`, `assets/css/extensions.css`):
`sgsAnimation` (fade-up, fade-in, slide-down, scale-in, blur-in and more), `sgsAnimationDelay`,
`sgsAnimationDuration` (60ms to 800ms theme tokens), `sgsAnimationEasing`. It triggers as the block enters view (a
header in view at load plays on load), ends at `transform: none` (so a sticky header or a fixed dropdown is only
affected during the entrance itself) and is switched off entirely under reduced motion.
`hideExtensions: ['fx']` on header and footer hides only the Spec 38 picker, not this panel. Footer rows also
carry `fxFooterStagger`.

## 3. Exit cells

| Ref | Surface | Measured (0d) | Expressed by | Status |
|---|---|---|---|---|
| lamalama | header | pill opacity 0 to 1, no slide, about 800ms, after its preloader (about 7s) | `sgsAnimation: fade-in`, duration `extra-slow` (800ms) | reachable; the start delay is not (§4.2) |
| studionamma | header | nav slides to translateY 0, about 800ms (GSAP), about 9s after load | `slide-down`, `extra-slow` | reachable; distance to confirm at build, delay not (§4.2) |
| dogstudio | footer | fade-up, opacity 0 to 1, translateY 50px to 0 | `fade-up` | **gap: distance fixed at 30px** (§4.1) |
| lamalama | footer | text spans opacity 0 to 1 on scroll | `fade-in` on the text blocks | reachable |
| studionamma | footer | opacity 0 to 1, scale 0.9 to 1 on scroll | `scale-in` (starts at `scale(0.9)`) | reachable, exact |
| dogstudio, lusion, halcyon, indus-foods | header | no entrance | none needed | covered (no requirement) |
| lusion, halcyon, indus-foods | footer | none (canvas footer; the drafts have no footer) | none needed | covered (no requirement) |
| all six | footer hover | no colour change on any link | none needed | covered (no requirement) |

## 4. Design

### 4.1 One universal addition: travel distance, as presets

`sgsAnimationDistance` (universal extension attribute, enum `''` | `15` | `30` | `50` | `100`, default `''` = the
effect's own distance: 30px for fade, 100px for slide). It is written as `data-sgs-animation-distance` beside the
extension's other data attributes, and `extensions.css` maps each value with an attribute selector, so no
per-instance CSS and no inline style is needed (the extension has no scoped-CSS writer; council). Editor: a
"Distance" select in `AnimationControl`, shown for the directional effects only. dogstudio's footer: `fade-up`, 50.
Registration touches `animation.js`, `animation-attributes.php`, `scripts/generate-extension-attributes.js` and the
role map.

### 4.2 Start delay: two more steps, the preloader recorded as a divergence

`DELAYS` gains 500ms and 800ms (same string-ms shape; `animation-observer.js` already parses any integer). No
longer steps: a header hidden for seconds with no preloader in front of it is a blank bar (council). lamalama and
studionamma start 7 to 9 seconds in because their own preloader or intro runs first; SGS has none. Recorded
divergence: "preloader-gated start", both references.

### 4.3 The header's entrance is a keyframe animation, not a transition

The header root already has one `transition` writer (hide-on-scroll, shrink, the scrolled shadow, section ink) on
`.uid.sgs-site-header`, the same specificity as the extension's `.sgs-js [data-sgs-animation]` and printed later, so
its shorthand would reset the entrance to `transition-property: transform` at 200ms: a fade would snap (council,
census finding 4). On `sgs/site-header` the entrance therefore runs as a CSS animation: `extensions.css` gains one
keyframe per effect (from the effect's start pose to none) and
`.sgs-js .sgs-site-header[data-sgs-animation].sgs-animated { animation: sgs-entrance-<effect> <duration> <easing>
<delay> backwards; }`, with the header exempt from the transition-based start pose. `backwards` holds the start
pose through the delay and releases every property when it ends, so hide-on-scroll's transform works afterwards
and the header's transition list is never touched. Other blocks keep the transition mechanism unchanged.
A failsafe for the header only: if the observer never marks it (a script error), a CSS animation with a 3s delay
shows it anyway. Editor: an entrance set on the header shows a notice that it delays the header's first appearance.

### 4.4 Proof for the rest

- The header entrance on a sticky header with hide-on-scroll and shrink ON at the same tier: opacity sampled every
  50ms rises over the chosen duration (not a snap), the header pins during and after, hide-on-scroll still slides
  afterwards, and a dropdown opened mid-entrance and after it lands in place.
- The footer reveal on footer rows and footer content blocks on a fixture footer; how `fxFooterStagger`
  (site-footer-row) composes with a child's `sgsAnimation` is traced at build, not assumed.
- Reduced motion: the entrance does not run (positive control: it runs without the emulation).

## 5. Council (2026-09-26)

Code-path census (Sonnet) and adversarial reader (Haiku): both GO WITH FIXES. Applied: the header entrance as a
keyframe animation (the transition-shorthand collision); distance as presets on a data attribute (no scoped-CSS
path exists); delay steps capped at 800ms; a header-only failsafe; the first-appearance notice; the live check with
hide-on-scroll and shrink on. Declined: effect-keyed distances (one effect per element). Per plan §5 step 2a this
revision goes back past the same two reviewers before the build.

## 6. Risks

1. A `transform` on the header during its entrance makes the header the containing block for fixed descendants for
   those 800ms (a mega panel opened mid-entrance would sit wrong). Accepted: nobody opens a menu in the first 800ms;
   the live check opens one right after.
2. An entrance on the header hides it (opacity 0) until the observer fires; if the script fails, the header stays
   invisible. The extension's initial state is gated on `.sgs-js`, so with no script the header shows. Proved by the
   live check with JavaScript disabled.

## 7. Verification

Fixture on sandybrown (new cases in `qa-item-markup-fixture.php`): header `fade-in` extra-slow; a footer row
`fade-up` at 50px with stagger. Probe: sample the header's opacity every 50ms from navigation (starts at 0, reaches 1
by about 800ms, ends at `transform: none`, still pinned after scrolling 600px); footer rows' translateY 50 to 0 as
they enter; reduced motion flat; JavaScript off shows the header. 375, 768 and 1440.
