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

### 4.3 The entrance is its own layer on every block

The extension runs the entrance as a `transition` on `opacity` and `transform`, the same two properties blocks use
for their own effects: 50 block stylesheets write a `transition` shorthand and blocks write `transform` in about 300
places (hover lifts, tilts, the header's hide-on-scroll). Whichever rule is printed later wins, so any block with an
entrance and its own effect loses one or the other (council, census finding 4, found on the header; Bean: scroll
effects and entrances are separate things, so fix the mechanism, not the header). The entrance becomes an
independent layer for every block. A CSS keyframe animation was the first answer and is not enough: CSS keeps one
`animation` list per element, and blocks run their own there too (the header's shrink is a scroll-timeline
`animation` on the header root, `.{uid}.sgs-site-header`; `sgs/counter`'s root runs `sgs-counter-reveal`; 23 block
stylesheets or renderers write `animation`). Whichever rule wins the list silently drops the other. So the entrance
runs outside the cascade entirely.

### 4.4 The mechanism, as built (revision 3, 2026-09-26)

1. **A script animation, not a CSS property.** `animation-observer.js` calls `element.animate(keyframes, timing)` (Web
   Animations API) for every `[data-sgs-animation]` element. A script animation is its own effect in the element's
   animation stack: it never reads or writes the element's `transition`, `animation` or `transform` properties, so a
   block's own transitions (hover lifts), CSS animations (header shrink, counter reveal) and `transform`
   (hide-on-scroll) run unchanged underneath it. It overrides only the properties its keyframe names, only while it
   runs.
2. **Each effect moves only its own properties, as one start keyframe.** The effect table is one JSON literal in
   `animation-observer.js`, between `/* sgs-entrance-effects:start */` and `/* sgs-entrance-effects:end */`, matching
   today's start poses: fade-up/down/left/right opacity 0 plus `translate` 30px on the axis; slide-* `translate` 100px
   with no fade; scale-in 0.9 and scale-out 1.1 on `scale` with a fade; bounce-in `scale` 0.3 with a fade and its own
   overshoot curve; rotate-in `rotate` -10deg with a fade; blur-in `filter: blur(8px)` with a fade and an explicit end
   `blur(0)`; reveal-up `clip-path: inset(100% 0 0 0)` to `inset(0 0 0 0)` with no fade; fade-in opacity only; flip-in
   `transform: perspective(600px) rotateX(30deg)` with a fade (`perspective()` has no standalone property, so flip-in
   alone owns the block's `transform`, during its entrance only). The end keyframe is implicit (the element's own
   value), except blur-in and reveal-up, whose functions do not interpolate to `none`.
3. **Hidden until in view, without CSS.** The observer creates each animation with `fill: 'backwards'`: elements in
   view at load play at once (their own delay plus the existing 100ms-per-index stagger, as the animation's `delay`);
   the rest are created paused at time 0 (which already paints the start pose) by a second observer when they come
   within 200px of the viewport, and play when 15% of them is in view, so elements far down a long page hold no
   animation at all. `beforeprint` finishes every entrance, so nothing prints hidden. When one
   plays the observer adds `.sgs-animated` (the info-box icon rule reads it) and, on finish, cancels the finished
   animation so nothing is held. The static hidden poses, the `transition` rules, the `.sgs-animated { transform: none }`
   end state and the reduced-motion resets are deleted from `extensions.css`: nothing is hidden by CSS, so no-JS and a
   failed script both show content. `.sgs-js` is still added (image-sequence and horizontal-panel read it).
4. **Timing.** Duration from `data-sgs-animation-duration` (the theme token read from the root's computed
   `--wp--custom--duration--<key>`, with today's fallbacks 60/150/300/500/800ms); easing from the token's computed
   `--wp--custom--easing--<key>` (a resolved string, since `animate()` takes no `var()`); delay from
   `data-sgs-animation-delay`, whose options gain 500 and 800ms. Distance from `data-sgs-animation-distance` (15, 30,
   50 or 100; written only when set, so existing static blocks' saved markup stays valid) replaces the effect's default
   travel.
5. **Plays once.** A script animation does not restart when a hidden ancestor (drawer, tab, accordion, dialog) shows
   again, and an element inside a closed container gets its animation only when it first comes near view. The drawer
   waits on `getAnimations({ subtree: true })` before it settles (`src/shared/nav-interactivity/store.js::
   whenAnimationsSettle`); an entrance inside an open drawer is one of those animations for its duration, and the
   function's own end-time timer backstops it.
6. **Reduced motion.** Under `prefers-reduced-motion: reduce` the observer creates no animations.
7. **Header failsafe.** If the header's animation is still paused 3s after the observer starts, it is finished; any
   error inside the observer finishes every animation it created. Editor: an entrance on the header shows a notice
   that it delays the header's first appearance.
8. **One override, named.** An entrance on `sgs/counter` plays on top of its built-in reveal (both run; the entrance
   wins `opacity` and `translate` while it runs, then the reveal shows through).
9. **The framework DB seeder** (`scripts/dbschema/seed-motion-shape-signatures.py::_extract_entrance_rows`) reads the
   effect table between the two markers instead of `extensions.css`. Proof: the 16 entrance rows are identical before
   and after (same property, direction, magnitude band, easing and co-animated opacity).
10. **Browser floor.** `animate()` with an implicit end keyframe and the standalone `translate`/`scale`/`rotate`
    properties: Chrome 104, Safari 14.1, Firefox 72 (all current). Where `animate` is missing the observer skips it:
    content shows, unanimated.
11. **Nothing paints before its entrance.** A `wp_head` script
    (`includes/animation-attributes.php::print_entrance_pending_flag`) adds `sgs-entrance-pending` to `<html>`, and
    `extensions.css` holds `[data-sgs-animation]` at opacity 0 while it is present (motion allowed only). The observer
    lifts it once every in-view entrance holds its start pose (elements within 200px of the viewport get their paused
    pose synchronously first); the flag lifts itself after 3s, so a blocked observer never leaves content hidden, and
    without JavaScript it never exists.

### 4.5 Proof for the rest

- A block with its own hover lift (a card) and a `fade-up` entrance: the entrance plays at its chosen duration and
  the hover lift still animates at its own speed afterwards (negative control: the pre-change build snaps one).
- The header entrance on a sticky header with hide-on-scroll and shrink ON at the same tier: opacity sampled every
  50ms rises over the chosen duration (not a snap), the header pins during and after, hide-on-scroll still slides
  afterwards, and a dropdown opened mid-entrance and after it lands in place.
- The footer reveal on footer rows and footer content blocks on a fixture footer; how `fxFooterStagger`
  (site-footer-row) composes with a child's `sgsAnimation` is traced at build, not assumed.
- Reduced motion: the entrance does not run (positive control: it runs without the emulation).

## 5. Council (2026-09-26)

Code-path census (Sonnet) and adversarial reader (Haiku): both GO WITH FIXES. Applied: the entrance as its own layer on
every block (keyframes on the standalone translate/scale properties; Bean widened it from a header-only fix); distance as presets on a data attribute (no scoped-CSS
path exists); delay steps capped at 800ms; a header-only failsafe; the first-appearance notice; the live check with
hide-on-scroll and shrink on. Declined: effect-keyed distances (one effect per element). Per plan §5 step 2a this
revision went back past the same two reviewers.

Revision 2 (same reviewers, 2026-09-26): both GO WITH FIXES, applied (then superseded in mechanism by revision 3). Census: flip-in's `perspective()` has
no standalone property (kept on `transform`, entrance only); `sgs/counter` runs its own root animation (the chosen
entrance wins); the reduced-motion reset lacked the new properties; the DB seeder's regex would silently read zero
entrance rows; delay was a `setTimeout`, not an animation delay. Adversarial: keyframes replay when a hidden
container shows again (the done class); `animation` must sit inside the no-preference query. Declined: writing
`translate: none` etc. on `.sgs-animated` (a static end-state write is the collision being removed; the paused
`from` pose replaces it).

Revision 3 (main thread at build, 2026-09-26, before any code was written): the header's shrink is a CSS
`animation` on the header root, so a CSS keyframe entrance and the shrink would overwrite each other's `animation`
list, and the revision-2 done rule (`animation: none`) would have switched the shrink off for good. The mechanism moved
to script animations (§4.4); it goes back past the same two reviewers on the delta. Recorded, not changed: the
observer loads in the footer, so an element in view at load (the header) may paint visible before its entrance starts;
the live probe's first samples after first paint decide it (§7). Measured at build: at 375 the header painted visible,
vanished, then faded in. Fixed with a head flag (§4.4 item 11), since a head script cannot animate elements that do not
exist yet but can mark `<html>` before the first paint. Adversarial on revision 3, GO WITH FIXES: paused animations on every below-fold element (fixed: created only
near the viewport), printing paused content hidden (fixed: `beforeprint`). Declined: loading the observer in the head. Census on
revision 3, GO WITH FIXES: every theme and snapshot easing token is a value `animate()` accepts; the observer is not
loaded in the editor; only the DB seeder parses `extensions.css`; the drawer's `whenAnimationsSettle` sees entrance
animations (named in §4.4 item 5). Design gate closed.

## 6. Risks

1. A running `translate`, `scale`, `rotate` or `filter` on the header makes it the containing block for fixed
   descendants while the entrance runs (a mega panel opened mid-entrance would sit wrong for those 800ms). Accepted:
   the live check opens a dropdown mid-entrance and after it.
2. A paused entrance hides an element until it intersects. Nothing is hidden before the script runs, a script error
   finishes every created animation, and the header has a 3s failsafe. Proved by the live check with JavaScript
   disabled.

## 7. Verification

Fixture on sandybrown (new cases in `qa-item-markup-fixture.php`): header `fade-in` extra-slow; a footer row
`fade-up` at 50px with stagger. Probe: sample the header's opacity every 50ms from navigation (starts at 0, reaches 1
by about 800ms, leaves no running animation behind (`getAnimations()` empty), still pinned after scrolling 600px); footer rows' translateY 50 to 0 as
they enter; reduced motion flat; JavaScript off shows the header. 375, 768 and 1440. The first samples after
navigation must never show the header at opacity 1 before the entrance starts (the footer-loaded gate, §5).
