# Motion effects audit: every fx effect, parallax, tilt, ripple, scroll-progress and hover zoom (12 Oct 2026)

Read-only design pass behind Spec 38A's Effects panel (`.claude/specs/38A-SGS-MOTION-MODEL.md` §5.4) and plan Phase 0 of `.claude/plans/2026-10-12-clone-coverage-foundation.md`. Companion to `.claude/reports/2026-10-12-motion-system-research.md`. VERIFIED = code read, DB queried or draft read; SUSPECTED = inferred. Block counts from `src/blocks/extensions/generated-fx-qualifying-blocks.json` and `block_attributes`.

## Defects found in today's code (VERIFIED)
1. Magnet: `MAX_PULL_PX = 8` and `PULL_FACTOR = 0.15` (`src/shared/effects/magnet.js`) are only the nav-bar-menu label default. The fx magnet (`fx-magnet.js::readOptions`) already has axis (x/y/both), radius 20-400px (default 120, `DEFAULT_RADIUS`) and strength 2-80px (default 24, `DEFAULT_STRENGTH`). Hard-coded: `factor: 0.35` and the return `--sgs-magnet-transition: transform 180ms ease-out` (`assets/css/fx-magnet.css`).
2. horizontal-panel ignores two of its own controls: `fx-horizontal-panel.js::initHorizontalPanel` hard-codes `scrub: true` and `ease: 'none'` and never reads `data-sgs-fx-hold`, while `includes/fx-attributes.php::sgs_fx_effect_param_scope` scopes `fxHold`/`fxScrub` to it, `fx-presets.json` writes both and `fx.js` shows "Scrub smoothing" and "How long it stays stuck". The client gets two controls that do nothing.
3. tilt-3d writes `el.style.transform` (`assets/js/tilt-3d.js`), against Spec 32's no-inline-style rule; SUSPECTED it overwrites the hover scale and lift on the same root; its reduced-motion check runs once at load.
4. Parallax has two disagreeing paths: CSS (`assets/css/extensions.css`, `@keyframes sgs-parallax-element`, `animation-timeline: scroll(root)`, whole-page progress) vs the JS fallback (`assets/js/parallax.js::updateParallax`, element-in-viewport progress). Same setting, different motion by browser.
5. `assets/js/scroll-progress.js` is enqueued on every page (`includes/class-sgs-blocks.php`) and writes `--sgs-scroll-progress`, `--sgs-scroll-y`, `--sgs-scroll-direction`, which no CSS in plugins/, theme/ or sites/ reads.
6. Every fx effect attaches to the block root only (`fx-attributes.php::sgs_fx_root_offset`, `sgs_inject_fx_attributes`); the only sub-element hooks are pin-scrub children (`data-sgs-fx-child-preset`) and the horizontal-panel track (`:scope > [data-sgs-fx-track]`), while 97 blocks declare `supports.sgs.elements`.

## Summary table
| Effect | Tier | Blocks | Hard-coded values | Key proposed controls | Stays block-level? | Gap |
|---|---|---|---|---|---|---|
| scrub | G | 33 | from `{opacity:0,y:40}`, end `top 40%`, non-scroll duration 0.6 | from/to property list, start/end, smoothing, ease | No (any part) | any property other than opacity/y |
| pin-scrub | G | 4 | `CHILD_PRESETS` (5), child stagger 0.15, `HOLD_FRACTIONS` 0/0.15/0.33/0.5 | per-child from/to, stagger, hold slider, pin top offset | pin yes, children per part | free per-child keyframes |
| horizontal-panel | G | 4 | `scrub:true`, `ease:'none'`, desktop only from 768px | smoothing, ease, breakpoint, pin length per panel, progress output, active-panel state, below-breakpoint mode | yes (pin) | progress bar, counter, active-card styling, mobile snap fallback |
| split-reveal | G | 17 | from `opacity:0, y:'0.6em'`, stagger 0.03, duration 0.6, `power2.out` | from props, stagger order, unit, mask | text part | blur/rotate, stagger from centre or random |
| scramble | G | 17 | GSAP default characters, `tweenLength:false`, duration 1.2, ease none | character set, speed, reveal delay | text part | none major |
| flip | G | not in picker | duration 0.5, `power2.out` | duration, ease (tokens) | paired | none |
| draggable | G | 4 | `DRAG_THRESHOLD = 4` | momentum, resistance | track | none |
| draw | G | 7 | `drawSVG 0%->100%`, `power2.inOut`, duration 1 | from/to %, direction | SVG part | reverse or partial draw |
| morph | G | 34 | duration 0.8, `rootMargin -15%` | duration, ease | SVG part | none |
| motion-path | G | 34 | `alignOrigin [0.5,0.5]`, start 0, end 1 | progress range, origin | SVG part | partial path range |
| image-sequence | G | 1 | `CHUNK_SIZE 12`, preload `600px 0px` | start/end, pin | block | none |
| scroll-smoother | H | site | `STRENGTH_LERP` table | strength | site | none |
| page-transitions | V | site | fade 220ms, slide 260ms (`class-sgs-motion-registry.php::TRANSITION_STYLES`) | style, duration token | site | none |
| cursor-field | V | 8 | rest point 50vw/40vh, falloff 70%, layer opacity 0.9, radius 40-1200 | type, colour, radius, shape, trail, blend, image, edge, hover radius, wash, ring | per part (surface) | image reveal (Indus peek) |
| carousel-loop | V | 9 | `EPSILON 1` | block-owned toggle | track | it is not a marquee |
| surface-treatment | W | 15 | per-shader constants | 7 controls exist | image part | none |
| magnet | V | 34 | `factor 0.35`, return 180ms ease-out | engage mode, pull model, max pull x and y, radius, return duration and ease, moving part | per part | over-element-only mode, per-axis limits |
| wave-gradient | W | 8 | none notable | 7 controls exist | surface | none |
| particles | V | 34 | `MAX_PARTICLES 150`, per-preset life/speed/gravity/drag | life, speed, gravity, spawn rate (caps stay as performance limits) | surface | none urgent |
| grid-dots | V | 8 | `MAX_DOTS 1200`, `CELL_LOCK 0.42` | 8 controls exist | surface | none |
| generative-background | W | 8 | `IMAGE_WIDTH/HEIGHT 320` | about 30 controls exist | surface | none |
| lottie | H | block-owned | none | file, trigger, loop | element | none |
| parallax (extension) | V | 74 | one strength 0-100; ±0.5px × strength; y only | speed ratio −1..1, range basis (page / in view), axis, clamp, target part | no, must target parts | image inside its frame, x axis, page-based ratio |
| tilt-3d (hover) | V | 8 | `MAX_TILT_DEG 6`, `perspective(800px)`, 100ms ease-out, unanimated reset | max angle, perspective on self or parent, glare, reset duration and ease, axis lock | per part | glare layer, spring reset |
| ripple (click) | V | 74 | 4px seed dot, ease-out, scale maths, fires on click | colour, duration, easing, size factor, peak opacity, trigger (pointerdown/click) | per part | pointerdown origin |
| scroll-progress | V | global | n/a | remove, or rebuild as a progress indicator effect | site | Indus header progress bar |
| hover zoom / scale | V | 8 | scale allow-list 1.02/1.05/1.1 (`includes/hover-effects/classes.php::build_hover_classes`) | scale, duration, easing (custom curve exists) | image part already | hover rotate and translate x (Mama's) |

## Real cases from the drafts (VERIFIED)
- Indus ingredient-card peek (`Indus Foods Website v2.dc.html` ~line 692, `bindMotion`): per card (`data-peek`) a `data-peek-layer` holding an image-slot photo at z-index 0 plus a white wash (gradient .5 to .3), clipped by `clip-path: circle(var(--pr) at var(--mx) var(--my))` in element-local px; radius 0 to 90px on hover over `.4s cubic-bezier(.16,.84,.32,1)`; a separate 180px ring (3px white border, drop shadow) following the pointer with a .4s lag and scaling 0 to 1; a white text-shadow halo on the content (styling, not this effect); `dragenter`/`drop` opening the layer to 150% is Claude Design's image-slot editing behaviour and is excluded. Verdict: cursor-field's painter seam (Spec 38 `FR-38-25`, `--sgs-cursor-field-layer`, optional `--sgs-cursor-field-mask`, element-local `VAR_LOCAL_X/Y`, z-index 0 under content) can host it as a sixth field type `image-reveal` with `fxFieldImage` (media ID), `fxFieldEdge` (0 = hard circle), `fxFieldRadiusHover` (needs `@property --sgs-cursor-field-radius { syntax: '<length>' }` to transition; SUSPECTED, measure), `fxFieldWash` (colour and opacity) and an optional ring (size, width, colour, shadow, lag via the trail value). Conflict: the ring wants `::after`, which `.sgs-has-click-ripple::after` already uses; paint the ring as a second `::before` background layer or a declared slot.
- Indus `[data-mag]` magnet: pull = (pointer position within the element − 0.5) × 10px on x and × 8px on y, engaged only while over the element; return `translate .25s cubic-bezier(.16,.84,.32,1)`; bundled with a sheen sweep on entry (60%-wide gradient, `skewX(-18deg)`, 750ms) and a pointerdown ripple (diameter max(w,h) × 2.2, `rgba(255,255,255,.35)`, 650ms). SGS's proximity model (distance-to-rect, factor 0.35, minimum radius 20) cannot express over-element-only engagement or different x and y limits; the return ease is locked at 180ms ease-out.
- Indus `[data-tilt]`: maximum about 11.3° (`hypot × 16deg`) via the CSS `rotate` property with an axis vector; perspective 1100px on the parent grid; a glare layer (radial-gradient at `--gx/--gy`, white .42 fading to transparent at 55%); reset `cubic-bezier(.34,1.56,.64,1)` over 600ms (exactly the theme's `--wp--custom--easing--spring` token); combined with hover `scale(1.04) translateY(-6px)`.
- Indus Heritage horizontal track (`updatePins`): pin length = items × 70vh + 40vh, linear, no smoothing; a progress bar (`data-pin-bar` scaleX); a "01 / 05" counter (`data-pin-count`); cards scale by distance from the viewport centre (opacity 1 to 0.55, scale 1 to 0.94); the active card's year changes fill colour; on mobile a native scroll-snap swipe instead of the pin.
- Logo marquees: Indus `startMarquee` 45 px/s, hover slows to 0.15× speed, 5% edge fade, gap 14px; Mama's `mmMarquee` 24s, pauses on hover and on touch; Eye Care 64s, pause on hover, a 30s ticker on mobile only. SGS host: `sgs/brand-strip` (`scrolling`, `scrollSpeed`, `scrollDuration` 2-300s, `scrollDirection`, `fadeEdges`, `fadeWidth`, `pauseOnHover`, `logoGap`); `sgs/trust-bar` has a parallel `autoScroll*` implementation (40/25/15s, `autoScrollBelow`). Gaps: speed in px/s, a hover rate 0-1 instead of a pause boolean, pause on touch, a mobile-only switch on brand-strip. Two marquee codebases warrant one shared marquee primitive (SUSPECTED worth extracting).
- Mama's cards rest at varied angles (`rotate({{ t.rot }})`) and straighten on hover to `rotate(0) translate(-4px,-6px)` with `cubic-bezier(.3,1.4,.5,1)` and a hard offset shadow; the polaroid frame rests at `rotate(-2.5deg)` and straightens on hover. SGS has no resting rotate or hover rotate, and no hover translate on x (only icon-specific rotate attributes). The spring curve is covered by the hover panel's "Custom curve…" option (`hover-effects/constants.js::EASING_OPTIONS`). This is a hover-state transform gap, not a new effect.
- Parallax: Indus hero `scrollY × -0.06`, Eye Care hero `scrollY × 0.18`: speed ratios relative to page scroll. Separate block-owned systems also exist: `bgParallax` (7 blocks), `splitMediaParallax`, `parallaxStrength` (decorative-image); retire all into one parallax effect (SUSPECTED migration scope).

## Per-effect proposed control sets
- scrub: a property list, one row per property (from, to, unit, per device: opacity, x, y, scale, rotate, blur, clip-path inset, colour, background position); start and end with free text beside the presets; smoothing in seconds; the shared easing picker. Intensity: Subtle 16px travel and short range; Standard 40px; Bold 80px plus scale 0.95 and a long range.
- pin-scrub: each child gets the scrub property list instead of a fixed preset; a stagger step; hold as a slider 0-0.6; a pin top offset (today only automatic header clearance via `resolveStart`).
- horizontal-panel: the runtime reads `fxScrub`, `fxEase`, `fxHold`; a breakpoint picker; pin length "per panel" in vh; a progress custom property (`--sgs-fx-progress`) any part can read; an active-panel class or data attribute; a below-breakpoint mode (static / snap row); proximity focus (scale and opacity by distance from centre) as a parameter.
- split-reveal: the property list for the from-state, a stagger order (start / end / centre / random), the existing unit and mask controls.
- scramble: character set (upper / lower / digits / custom), reveal delay, speed.
- flip: duration and ease as tokens. draggable: momentum, resistance. image-sequence: start/end, pin.
- draw: from/to percentages (reverse and partial draws). motion-path: progress range and origin. morph: duration, ease.
- scroll-smoother and page-transitions: durations point at the `--wp--custom--duration--*` tokens; both stay on the site settings page.
- cursor-field: the five existing types plus `image-reveal` with image, edge, hover radius, wash and ring controls.
- magnet: engage mode (proximity / over-element), pull model (distance factor / normalised position), max pull x and max pull y (px, per device), radius, return duration and ease (tokens), moving part (root or a declared part). Intensity: Subtle 4px, Standard 10px, Bold 24px with radius 160.
- tilt (moves into the Hover panel as an effect type that writes `--sgs-tilt-x/y` only, so CSS owns the transform): max angle (deg, per device), perspective (px) on self or parent, glare toggle with colour, opacity and size, reset duration and ease (spring token), axis lock. Intensity: 4°, 8°, 12°.
- ripple: easing picker, peak opacity, size factor, trigger (pointerdown / click).
- particles: life, speed, gravity, spawn rate under Fine-tune; caps stay as performance limits.
- parallax: one effect in the Effects panel: speed ratio (−1 to 1), range basis (page / while in view), axis, clamp (px), target part (most often an image inside its frame).
- hover zoom / scale: free scale (presets write values), duration, easing; add hover rotate and translate x/y to the Hover panel.
- marquee (brand-strip, trust-bar): speed in px/s, hover rate 0-1, pause on touch, a below-breakpoint switch; one shared marquee primitive.

## New effects needed
1. None for the peek: it is the `image-reveal` cursor-field type.
2. Sheen sweep (hover, Tier V, CSS only): a diagonal light band crosses the element on pointer entry; band width, angle, colour and opacity, duration, ease. Evidence: Indus `shine()`; nothing in SGS matches sheen, shine or glare.
3. Scroll progress indicator (Tier V; CSS `scroll()`/`view()` per the D3 driver rule): sources page, section or pin; outputs bar scale and counter text. Evidence: Indus `_progEl`, `data-pin-bar`, `data-pin-count`. Replaces the dead `scroll-progress.js`.
4. Ambient float (loop, Tier V): Indus `floatIt` (translateY −12px, 2.8-5s, alternate ease-in-out, random phase). Check against the Entrance panel's loop options before building (SUSPECTED gap).
5. Proximity focus within a track: scale and opacity by distance from the viewport centre plus an active-item state; may be a horizontal-panel parameter rather than an effect. Evidence: `updatePins`.

## Cross-effect rules (the shared control kit)
1. One easing picker everywhere: theme tokens (default / ease-out / ease-in / spring / linear) plus "Custom curve…" (the hover panel model, `hover-effects/constants.js`), replacing `FX_EASE_OPTIONS`; Tier G converts a cubic-bezier to a GSAP ease in `@sgs/motion-provider`.
2. Every duration, distance and angle carries a per-device value (no fx attribute is responsive today: `is_responsive = 0` for `fxEase`, `fxScrub`) and points at a token where one exists.
3. Intensity is a preset that writes values (as `fx-presets.json` does): Subtle / Standard / Bold change travel, angle, radius and range only, never trigger or target; add presets to magnet, tilt, parallax, cursor-field and ripple; rename "Dramatic" to "Bold".
4. Targeting: an effect takes a `target` naming a declared part. Block-level only: pin-scrub (pin), horizontal-panel, image-sequence, draggable, carousel-loop, the site-level effects. Surface painters (cursor-field, wave, generative, grid-dots, particles) target a surface part. Everything else can target any part.
5. Scripts write custom-property values only; CSS owns the transform (tilt-3d and the parallax fallback write `el.style.transform` today). This is the precondition for hover, entrance and effect transforms composing on one element.
6. A gate: every parameter a preset writes or a control shows must be read by the runtime (horizontal-panel's `fxHold`/`fxScrub` show the gap); extend `check-fx-list-drift.py` to grep each runtime file for each scoped `data-sgs-fx-*` name.
7. One pseudo-element owner per element: today `::before` belongs to cursor-field and `::after` to ripple; a ring, glare or sheen needs a declared slot.

## Key files
`plugins/sgs-blocks/includes/fx-attributes.php`, `src/blocks/extensions/fx.js`, `src/blocks/extensions/fx-presets.json`, `src/shared/effects/gsap/fx-horizontal-panel.js`, `fx-scrub.js`, `fx-pin-scrub.js`, `src/shared/effects/fx-magnet.js`, `magnet.js`, `cursor-field.js`, `includes/fx-cursor-field.php`, `assets/css/fx-cursor-field.css`, `assets/js/tilt-3d.js`, `ripple.js`, `parallax.js`, `scroll-progress.js`, `assets/css/extensions.css`; drafts `sites/indus-foods/handoff/Indus Foods Website v2.dc.html`, `sites/mamas-munches-redesign/handoff/Home.dc.html`, `sites/eye-care-ward-end/handoff/Eye Care Birmingham.dc.html`.
