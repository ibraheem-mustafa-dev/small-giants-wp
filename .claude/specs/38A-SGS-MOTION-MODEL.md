---
doc_type: spec
spec_id: 38A
spec_version: "1.1"
title: "SGS motion model: three motion panels per element, stored values, token-backed presets, stagger and runtime"
project: small-giants-wp
status: approved design, not built
authors: Bean + Claude
session_date: 2026-10-12
last_verified: 2026-10-12
parent_spec: Spec 38 (`.claude/specs/38-SGS-MOTION-SYSTEM.md`, the tier doctrine and effect roster)
status_history:
  - "2026-10-12: v1.0, design approved by Bean (decisions D1 to D7 of the research report), not built"
  - "2026-10-12: v1.1, §5.4 per-effect control sets from the effects audit, FR-38A-34 to 52, nav motion and looping media brought into scope, §17 cross-spec items resolved, not built"
references:
  - .claude/reports/2026-10-12-motion-system-research.md
  - .claude/reports/2026-10-12-motion-effects-audit.md
  - .claude/reports/2026-09-24-u5-motion-design.md
  - .claude/plans/2026-10-12-clone-coverage-foundation.md
  - .claude/specs/38-SGS-MOTION-SYSTEM.md
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md
  - .claude/specs/48-CLONING-SYSTEM.md
  - .claude/rules/framework-principles.md
absorbs: null
absorbed_by: null
lock_reason: null
---

# Spec 38A: the SGS motion model

> **One-liner:** every compatible SGS block gets three motion panels (Hover, Entrance and reveal, Effects) that store real values per element, per device and per motion type, with presets that stamp token-backed values, a container helper that writes stagger delays, and a mostly CSS runtime.

Spec 38 keeps the tier doctrine (V, G, H, W), the effect roster, the `fx_effects` registry and the `data-sgs-fx-*` grammar. This spec owns how motion is modelled, stored, edited, emitted and played: entrance presets, the hover suite, stagger, effect parameters and the per-block reveal systems. The evidence and the owner's decisions are in `.claude/reports/2026-10-12-motion-system-research.md` (revision 3, section 1); the build sits under Phase 0, step 0.3 of `.claude/plans/2026-10-12-clone-coverage-foundation.md`.

## 0. Plain English

Problem: motion in SGS today is spread over about six reveal and stagger systems and seven hover systems with three incompatible data shapes. Presets hide the real numbers, motion applies to a whole block only, nothing varies by device, and the browser works out stagger delays at run time. Effect: a client cannot fine-tune a fade, the cloning tool cannot write what a draft actually does, and two systems can fight over the same element. Solution: one model. Each element of a block (the whole block, its image, its title and so on) can carry one hover effect, one entrance and one special effect at the same time. Each is set in its own panel. Picking an effect such as "Fade up" copies real values onto the element (distance, duration, delay, easing), and each value points at a named site setting ("token") where one fits, so retuning the site's "fast" retunes every hover. A simple layer shows effect, trigger and intensity; a Fine-tune layer shows every value. Stagger is a helper on containers that writes a delay onto each child once; the page never computes delays. Most motion needs no JavaScript.

## 1. Who this is for

| Who | What they get |
|---|---|
| Client editing a site | Three clear panels, a picture of each effect, Subtle / Standard / Bold, and Replay |
| Bean as QC | One place per motion type, values that match the draft, no hidden presets |
| Cloning tool (Spec 48) | One JSON Schema to write against, per element, for all three panels |
| Framework developers | One support key, one renderer, one runtime per motion type, DB rows for every field |

## 2. Goals and non-goals

Goals: one motion support on every compatible block; values stored per element, per motion type, per device; presets that stamp token-pointing copies (D2); explicit stored delays everywhere (no browser-computed stagger); a CSS-first runtime; every value an effect hard-codes today exposed as a Fine-tune control (§5.4); every motion field described in the framework DB so the clone coverage test (plan Phase 1) can see it; a migration of every old motion attribute with no legacy fallback.

In scope as well (owner, 2026-10-12: the model covers every motion SGS ships): block-private state-change motion such as the cart count pop and the burger icon morph (FR-38A-53); the nav drawer's and submenus' open and close motion and their item staggers, which move onto the Entrance and reveal panel model and the container stagger helper (FR-38A-51), and looping media animations (Ken Burns, background and logo SVG animation, Lottie), which become Effects-panel effects with their own control sets (FR-38A-52).

Non-goals:

- Colour and shadow hover VALUES. They are compliant per-element styling states set through the shared colour and shadow controls. The Hover panel owns only their transition timing.
- Site-level motion (`scroll-smoother`, `page-transitions`): stays on the SGS Motion settings page (Spec 38 §3.5).
- `carousel-loop`: stays a block-private carousel control (Spec 38 FR-38-26).
- Core blocks' own motion (`core/cover` `hasParallax`).
- Rewriting Spec 38's tier doctrine. New effects (FR-38A-34 to FR-38A-37) join the `fx_effects` roster through the normal seeding path.

## 3. Hard constraints

| Constraint | Source | Non-negotiable |
|---|---|---|
| No inline `style` on any SGS element; per-instance values are scoped custom properties in the shared collector | Spec 32 FR-32-4, FR-32-4a | Y |
| Framework facts in `sgs-framework.db`, no hand-written lists | R-31-1 | Y |
| A migrated attribute has no server-side legacy fallback | R-31-14 | Y |
| Element-first targeting from `supports.sgs.elements` | Spec 35 A4 | Y |
| Every customisable value has an inspector control | root `CLAUDE.md` | Y |
| GSAP only for Tier G, conditionally loaded | Spec 38 §1, §4.4 | Y |
| WCAG 2.1 AA, reduced motion honoured, 44px targets | root `CLAUDE.md` | Y |
| Under 50 KB JS and 100 KB CSS per page | root `CLAUDE.md` | Y |
| No `transition: all` | D-decisions (research Appendix D) | Y |

## 4. The model

1. **Three motion types.** Hover, Entrance and reveal, Effects. An element may carry one of each at once.
2. **Targets are declared parts.** Each block's targets are its root plus the parts it declares in `supports.sgs.elements` (BEM `sgs-<block>__<element>`), read from the framework DB. A typed selector is never offered to clients.
3. **Custom selector for the cloning tool only (D6).** A cloned draft may need a target no declared part names. Only the cloning tool may write a custom target, only with a review row that records the draft node and why no declared part fits, and the selector is always scoped inside the block root.
4. **Values underneath.** Each motion type on each element stores property values per state or keyframe (from and to, or a keyframe list), timing (duration, delay, easing) and type-specific values (distance, scale, angle, effect parameters).
5. **Presets on top (D2).** An effect type (Lift, Fade up, Magnet Standard) is a DB-seeded preset that stamps a full copy of its values onto the element. Each stamped value points at a motion token where one fits. Editing a preset later never reaches existing blocks; changing a token retunes every value that points at it.
6. **Per device.** Every value may be overridden for Tablet and Mobile (the 768 and 1024 tiers); Desktop is the base.
7. **Explicit delays.** Every element stores its own delay. A container helper writes delays to children; query loops get server-written per-item delays. Nothing computes a delay in the browser.

## 5. The three panels

Each panel sits in the Styles tab on every block that declares the motion support. A Target row at the top of each panel lists the block root and its declared parts; a dot marks targets that already carry a value of that panel's type. The panels are element-first panels (Spec 35 A4): one panel per motion type whose Target row is derived from `supports.sgs.elements`, so every declared part is reachable from each panel without a motion control in each element panel; hover colour and shadow states stay inline in their element panels.

```
Hover            Target [ Whole block v ]   (only devices that can hover; also keyboard focus)
  Effect         [ Lift v ]  (live thumbnail beside each choice)
  Driven by      ( This element ) ( Whole block hovered )
  Intensity      ( Subtle ) ( Standard ) ( Bold )
  > Fine-tune    distance, scale, rotation, image zoom, grayscale, border accent, tilt angle and
                 perspective, duration, easing (picker + custom curve), per-device values,
                 timing of this element's colour and shadow hover changes
                 (colour and shadow VALUES are set in the colour and shadow controls)

Entrance and reveal   Target [ Title v ]
  Effect         [ Fade up v ]
  Trigger        ( Page load ) ( Scroll into view )
  Intensity      ( Subtle ) ( Standard ) ( Bold )
  [ Replay ]     Note: visitors who ask for reduced motion see no movement.
  > Fine-tune    from and to values (opacity, distance, scale, blur, clip), extra keyframes,
                 duration, delay, easing (picker + custom curve), start line, per-device values
                 On a container: Stagger helper
                   Apply entrance to children   [ on ]
                   Step between children        [ 80 ms ]
                   Order   ( Row first ) ( Column first ) ( From centre ) ( Reverse )
                   Restart each visual row      [ on ]
                   Maximum total delay          [ 600 ms ]
                   [ Write delays ]  (re-runs by itself when children are added, moved,
                                      removed or duplicated)

Effects          Target [ Image v ]
  Effect         [ Magnet v ]  (only effects valid for this block and target are listed)
  Trigger        (offered triggers come from the effect's own registry row)
  Intensity      ( Subtle ) ( Standard ) ( Bold )
  > Fine-tune    the effect's own controls (§5.3), per-device values
```

Every Fine-tune field that differs from the stamped preset shows a "Customised" tag and its own Reset, which restores the stamped value. Changing Effect or Intensity re-stamps the values and clears the Customised tags after a confirmation that names how many customised fields will be replaced.

### 5.1 Hover

Effects offered come from the hover rows of the preset table (§6.4): none, lift, scale, rotate and translate (FR-38A-42), tilt (FR-38A-41), sheen (FR-38A-35), image zoom, grayscale to colour, indent, border accent, and hover-triggered `fx_effects` rows whose registry row allows the Hover panel (for example `magnet`, FR-38A-40). "Whole block hovered" makes the root's `:hover` and `:focus-within` drive this element.

### 5.2 Entrance and reveal

Effects offered come from the entrance rows of the preset table: fades, slides, scale-in, blur-in, reveal-up and any preset seeded later. Triggers: Page load, Scroll into view, and Panel opens on a part that a disclosure opens (the nav drawer panel, submenu and mega panels and their items, FR-38A-51), where the entrance also stores close values. A text element may also take `split-reveal` here when its registry row allows the Entrance panel; it stays Tier G.

### 5.3 Effects

The Effects panel lists `fx_effects` rows whose `scope`, `requires` and `in_picker` fit the block and target (element-scoped effects only on parts that can hold them, for example SVG parts for `draw`). Tier G, H and W effects keep their tier, their conditional loading and the `data-sgs-fx-*` runtime grammar (Spec 38 §11); this model only changes where their values are stored and how they are edited.

**The shared control kit.** Every effect's Fine-tune layer is built from one kit, so no effect ships a bespoke panel:

- **Target** (the panel's Target row): root or a declared part; the effect's registry row limits which.
- **Trigger** from the effect's `triggers` list, shown only when there is more than one.
- **Intensity** Subtle / Standard / Bold: each level is a preset row (§6.4) that stamps every parameter; the parameters point at tokens where one fits (durations, easings, distances, palette slugs for colours).
- **Number with unit** (`UnitControl` or `RangeControl` with input and reset) for strengths, radii, speeds, densities, distances and angles; each with the min, max and step its schema entry declares.
- **Duration and delay** in ms, pointing at duration tokens by default.
- **Easing picker**: the named curves of `plugins/sgs-blocks/includes/helpers-motion-easing.php::sgs_motion_easing_css` (editor `plugins/sgs-blocks/src/components/MotionEasingControl.js`) plus the easing tokens, and a Custom option that edits a `cubic-bezier()` with four numeric fields and a curve preview, or accepts a `linear()` spring string.
- **Colour** through the shared colour control, stored as a palette slug.
- **Choice** (`ToggleGroupControl` up to five options, `SelectControl` beyond) for enumerated parameters such as direction or split unit.
- **Asset** (media picker) for asset-gated effects (Spec 38 §7).
- **Per-device values**: every kit control has the device switcher; Tablet and Mobile store only overrides.
- **Customised tag and Reset** on every kit control.

### 5.4 Per-effect control sets

Source: the per-effect audit `.claude/reports/2026-10-12-motion-effects-audit.md` (code read, DB queried, drafts read). Every `fx_effects` row (22, `SELECT effect FROM fx_effects`), every non-fx motion surface and every new effect has one row. Each row's controls are built from the §5.3 kit; every value listed under "hard-coded today" becomes a stored parameter with that value as its Standard default unless the line says otherwise. Intensity changes travel, angle, radius and range only, never trigger or target (FR-38A-46); "hidden" means the effect has no travel, angle, radius or range to scale, so the Intensity row is not shown. The three numbers are the seeded `motion_presets` values (Subtle / Standard / Bold).

**Targeting levels.** *Block*: the effect attaches to the block root only (pins, tracks, site-level). *Surface*: a part that paints a background (root or a declared background or media part). *Part*: any declared part the registry row allows (`supports.sgs.elements`).

| Effect | Panel | Tier | Target | Intensity (Subtle / Standard / Bold) |
|---|---|---|---|---|
| `scrub` | Effects | G | Part | travel 16 / 40 / 80px; Bold adds scale 0.95 and a long range |
| `pin-scrub` | Effects | G | Block (pin), Part (children) | child travel 16 / 40 / 80px |
| `horizontal-panel` | Effects | G | Block | hidden |
| `split-reveal` | Entrance and reveal | G | Part (text) | travel 0.3em / 0.6em / 1em |
| `scramble` | Effects | G | Part (text) | duration 0.8 / 1.2 / 1.8s |
| `flip` | Effects | G | Paired | hidden |
| `draggable` | Effects | G | Block (track) | hidden |
| `draw` | Effects | G | Part (SVG) | duration 0.6 / 1 / 1.6s |
| `morph` | Effects | G | Part (SVG) | duration 0.5 / 0.8 / 1.2s |
| `motion-path` | Effects | G | Part (SVG) | progress range 0.5 / 1 / 1 with Bold on a longer scroll range |
| `image-sequence` | Effects | G | Block | hidden |
| `scroll-smoother` | Site settings page | H | Site | hidden |
| `page-transitions` | Site settings page | V | Site | hidden |
| `cursor-field` | Effects | V | Surface | radius 160 / 280 / 480px |
| `carousel-loop` | Block-owned | V | Block (track) | hidden |
| `surface-treatment` | Effects | W | Part (image) | hidden (its 7 controls are looks) |
| `magnet` | Hover | V | Part | max pull 4 / 10 / 24px; Bold radius 160px |
| `wave-gradient` | Effects | W | Surface | hidden (its 7 controls are looks) |
| `particles` | Effects | V | Surface | speed 0.5 / 1 / 1.6x |
| `grid-dots` | Effects | V | Surface | hidden (its 8 controls are looks) |
| `generative-background` | Effects | W | Surface | hidden (its controls are looks) |
| `lottie` | Effects | H | Part | hidden |
| `parallax` | Effects | V | Part | speed ratio 0.05 / 0.1 / 0.2 |
| `tilt` | Hover | V | Part | max angle 4 / 8 / 12deg |
| `ripple` | Effects | V | Part | size factor 1.6 / 2.2 / 2.8 |
| hover scale and image zoom | Hover | V | Part | scale 1.02 / 1.05 / 1.1 |
| hover rotate and translate | Hover | V | Part | translate 2 / 6 / 12px; rotate 1 / 3 / 6deg |
| `sheen` (new) | Hover | V | Part | band opacity 0.2 / 0.35 / 0.5 |
| `scroll-progress` (new) | Effects | V | Part | hidden |
| `ambient-float` (new) | Effects | V | Part | travel 6 / 12 / 20px |
| `marquee` (new, shared) | Effects | V | Block (track) | hidden (speed is the control) |
| `ken-burns` | Effects | V | Surface | zoom 104 / 108 / 115% |
| `svg-loop` | Effects | V | Part (SVG) or background SVG layer | amplitude 0.5 / 1 / 1.6x |
| nav panel open and item stagger | Entrance and reveal | V | Part (panel, items) | item travel 8 / 16 / 32px |

**Per-effect lines** (hard-coded today, then the Fine-tune controls):

- **scrub.** Today: from `{opacity:0, y:40}`, end `top 40%`, non-scroll duration 0.6 (`fx-scrub.js`); only opacity and y can move. Controls: a property list, one row per property (from, to, unit, per device) over opacity, x, y, scale, rotate, blur, clip-path inset, colour and background position; start and end with free text beside the presets; smoothing (s); the shared easing picker.
- **pin-scrub.** Today: `CHILD_PRESETS` (five fixed child animations), child stagger 0.15, `HOLD_FRACTIONS` 0 / 0.15 / 0.33 / 0.5, pin top offset only automatic header clearance (`resolveStart`). Controls: per child the scrub property list; a stagger step; hold as a slider 0 to 0.6; a pin top offset (px, per device, default the header clearance).
- **horizontal-panel.** Today: `scrub: true` and `ease: 'none'` hard-coded, `data-sgs-fx-hold` never read (defect, FR-38A-50), desktop only from 768px. Controls: smoothing, ease, hold (all read by the runtime), breakpoint, pin length per panel (vh), progress output, active-panel state, below-breakpoint mode (static or snap row), proximity focus (FR-38A-38, FR-38A-39).
- **split-reveal.** Today: from `opacity:0, y:'0.6em'`, stagger 0.03, duration 0.6, `power2.out`. Controls: the from-state property list (adds blur and rotate), stagger step, stagger order (start, end, centre, random with a stored seed), the existing unit (chars, words, lines) and mask controls, duration, easing.
- **scramble.** Today: GSAP's default character set, `tweenLength: false`, duration 1.2, ease none. Controls: character set (upper, lower, digits, custom string), speed (duration), reveal delay, easing.
- **flip.** Today: duration 0.5, `power2.out`. Controls: duration and easing, both token-pointing.
- **draggable.** Today: `DRAG_THRESHOLD = 4`. Controls: momentum (on, off), resistance (0 to 1), drag threshold (px).
- **draw.** Today: `drawSVG 0% -> 100%`, `power2.inOut`, duration 1. Controls: from and to percentages (reverse and partial draws), direction, duration, easing, trigger (load, hover, scroll: the logo draw of FR-38A-52 uses these).
- **morph.** Today: duration 0.8, `rootMargin -15%`. Controls: duration, easing, start line.
- **motion-path.** Today: `alignOrigin [0.5, 0.5]`, start 0, end 1. Controls: progress range (start and end, 0 to 1), origin x and y, easing.
- **image-sequence.** Today: `CHUNK_SIZE 12`, preload margin `600px 0px`. Controls: start and end lines, pin (on, off); the chunk size and preload margin stay performance limits, not controls.
- **scroll-smoother.** Today: the `STRENGTH_LERP` table. Controls on the site settings page: strength; stays site-level.
- **page-transitions.** Today: fade 220ms, slide 260ms (`plugins/sgs-blocks/includes/class-sgs-motion-registry.php::TRANSITION_STYLES`). Controls on the site settings page: style and a duration that points at a `--wp--custom--duration--*` token.
- **cursor-field.** Today: rest point 50vw / 40vh, falloff 70%, layer opacity 0.9, radius 40 to 1200px. Controls: field type (the five shipped types plus `image-reveal`, FR-38A-34), colour, radius, shape, trail, blend, rest point x and y, falloff (%), layer opacity; for `image-reveal`: image, edge, hover radius, wash and ring.
- **carousel-loop.** Today: `EPSILON 1`. Stays a block-owned toggle (Spec 38 FR-38-26); it is not a marquee.
- **surface-treatment.** Today: per-shader constants. Controls: the 7 existing controls, moved into the kit unchanged.
- **magnet.** Today: `factor: 0.35` (`fx-magnet.js`), return `transform 180ms ease-out` (`fx-magnet.css`), radius 20 to 400px default 120, strength 2 to 80px default 24, axis x / y / both; the nav-bar-menu label magnet's `MAX_PULL_PX = 8` and `PULL_FACTOR = 0.15` (`src/shared/effects/magnet.js`) become its stamped values. Controls (FR-38A-40): engage mode, pull model, max pull x and y, radius, return duration and easing, moving part.
- **wave-gradient.** Today: no notable literal. Controls: the 7 existing controls in the kit.
- **particles.** Today: `MAX_PARTICLES 150`, per-preset life, speed, gravity and drag. Controls: life, speed, gravity, drag, spawn rate; `MAX_PARTICLES` stays a performance cap.
- **grid-dots.** Today: `MAX_DOTS 1200`, `CELL_LOCK 0.42`. Controls: the 8 existing controls; both literals stay performance limits.
- **generative-background.** Today: `IMAGE_WIDTH` and `IMAGE_HEIGHT` 320. Controls: the existing controls (about 30) in the kit; the render size stays a performance limit.
- **lottie.** Today: none hard-coded. Controls: file (asset), trigger (load, visible, hover, scroll), loop, speed; also hosts the background and logo Lottie layers (FR-38A-52).
- **parallax.** Today: one strength 0 to 100, ±0.5px × strength, y only, two disagreeing runtimes (FR-38A-50). Controls (FR-38A-43): speed ratio −1 to 1, range basis, axis, clamp, target part.
- **tilt.** Today: `MAX_TILT_DEG 6`, `perspective(800px)`, 100ms ease-out, unanimated reset (`tilt-3d.js`, `.sgs-has-tilt-3d`). Controls (FR-38A-41): max angle, perspective and where it sits, glare, reset duration and easing, axis lock.
- **ripple.** Today: 4px seed dot, ease-out, scale maths in `ripple.js`, fires on click. Controls (FR-38A-45): colour, duration, easing, size factor, peak opacity, trigger.
- **hover scale and image zoom.** Today: scale allow-list 1.02 / 1.05 / 1.1 (`includes/hover-effects/classes.php::build_hover_classes`). Controls: free scale (the presets write values), duration, easing (the custom curve already exists in `plugins/sgs-blocks/src/blocks/extensions/hover-effects/constants.js::EASING_OPTIONS`).
- **hover rotate and translate.** Today: none (only icon-specific rotate attributes). Controls (FR-38A-42): rest rotate, hover rotate, hover translate x and y, duration, easing.
- **sheen** (new, FR-38A-35). Controls: band width (%), angle (deg), colour, opacity, duration, easing.
- **scroll-progress** (new, FR-38A-36). Controls: source (page, section, pin), output (bar scale on x or y, counter text), counter format.
- **ambient-float** (new, FR-38A-37). Controls: travel (px, axis), period (s), easing, phase offset (stored per element).
- **marquee** (new shared primitive, FR-38A-44). Controls: speed (px/s), direction, hover rate (0 to 1), pause on touch, edge fade (on, width %), below-breakpoint switch.
- **ken-burns** (FR-38A-52). Today: `bgKenBurnsMode` loop or zoom-out-once, `bgZoomStart` 108, `bgAnimationDuration` 20s, `splitMediaAnimationDuration` 20s. Controls: mode, zoom start and end (%), pan direction, duration, easing.
- **svg-loop** (FR-38A-52). Today: `bgSvgAnimation` and `svgAnimation` (pulse, float, wave), speed words slow / medium / fast. Controls: motion (pulse, wave; float stamps `ambient-float`), duration (ms, token-pointing), amplitude.
- **nav panel open and item stagger** (FR-38A-51). Today: the drawer's and submenus' U-5 attributes (`.claude/reports/2026-09-24-u5-motion-design.md`) and the mega panel's `src/shared/effects/stagger.js` literals (460ms, 28ms step). Controls: the Entrance panel's from and to values with the Panel opens trigger and close values (duration, easing), plus the container stagger helper on the panel.

## 6. Data model and storage schema

### 6.1 One support key, one attribute

A block opts in with `supports.sgs.motion` (`true`, or an object listing the allowed motion types). The support registers one object attribute, `sgsMotion`, through one editor `blocks.registerBlockType` filter and one PHP `register_block_type_args` filter; no `block.json` declares motion attributes. The attribute is unsourced (it lives in the block comment) and is never written into saved markup.

### 6.2 Shape

```
sgsMotion = {
  "v": 1,
  "elements": {
    "<target>": {                       // "root", a declared part key, or "custom:<n>"
      "selector": "<scoped selector>",  // custom targets only, written by the cloning tool
      "hover":    { "preset", "intensity", "source": "self|root", "values", "devices", "customised" },
      "entrance": { "preset", "intensity", "trigger": "load|scroll|open", "values", "devices", "customised" },
      "effect":   { "preset", "effect": "<fx_effects.effect>", "intensity", "trigger", "values", "devices", "customised" }
    }
  },
  "stagger": { "apply", "step", "order", "perRow", "cap" }   // container helper's last settings only
}
```

- `values` holds the property values: for an entrance `from`, `to` and optional `keyframes`, plus `duration`, `delay`, `easing`, `start`; for a hover the changed properties plus `duration` and `easing`; for an effect its parameters.
- A value is a literal (number with unit, string) or a token reference `"token:<family>.<key>"` (for example `"token:duration.fast"`), which the renderer resolves to `var(--wp--custom--<family>--<key>)`.
- `devices.tablet` and `devices.mobile` hold overrides only.
- `customised` lists the value paths the client or the cloning tool changed after the stamp.
- `stagger` is read only by the editor helper to re-run itself; the renderer never reads it.

### 6.3 One JSON Schema

`plugins/sgs-blocks/schemas/motion.schema.json` defines the shape, every value's type, unit, range and enum, and which properties each motion type may write. The cloning tool validates against it before writing; the inspector builds the kit controls from it; the PHP renderer drops any key or value the schema does not allow. A schema check runs in the build gate.

### 6.4 Framework DB

- **Fields.** `sgs-update-v2.py` seeds one `block_attributes` row per motion field per target per compatible block, with `css_property` (the property or custom property it drives), `css_state` (rest, hover, from, in-view), `css_tier` (device tier) and `css_element` (the target part), from the schema and `supports.sgs.elements`. The calibration, cloner and coverage test read these rows.
- **Presets.** A `motion_presets` table (slug, motion type, effect slug for Effects rows, intensity, label, values with token references, thumbnail key) seeded through `plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py` from one source file. The inspector and the cloner read the same rows.
- **`animation_tokens` is retired.** Its 8 keyframe rows are reconciled into `motion_presets` (only `fade-up` is in use), pointing at theme tokens instead of literal durations and easings, and the table is dropped.
- **`fx_effects`** stays the effect registry and gains an `owned_properties` column (the CSS properties an effect writes) and a `panels` column (which of Hover, Entrance and reveal, Effects may offer it).
- **Tokens** are read from `theme.json`, never copied into the DB.

### 6.5 Emission

The renderer (one `render_block` filter for the support) emits, through the shared collector (Spec 32 FR-32-11): scoped custom properties per target per device (`.{uid} .sgs-card__media{ --sgs-mh-scale: 1.04; }` inside the device media queries), and data attributes on the target element via `WP_HTML_Tag_Processor` (`data-sgs-mh`, `data-sgs-me`, `data-sgs-fx*`). A shared stylesheet holds every generic motion rule. No `style` attribute, no `<style>` in the body, nothing in saved markup.

## 7. Tokens

- **Names kept (D1).** `settings.custom.duration` (instant, fast, medium, slow, extra-slow), `easing` (default, ease-out, ease-in, spring, linear), `transition` (fast, medium, slow) and `entrance` (distance, duration, easing), read as `--wp--custom--<family>--<key>`.
- **Extended only.** A new `distance` family (`xs`, `sm`, `md`, `lg`, `xl`) for hover lifts and entrance travel, and extra springs in `easing` (`spring-gentle`, `spring-bouncy`) written as `linear()` curves.
- **Framework defaults (D4).** One set from the shared core of the Indus, Mama's and Eye Care drafts: hover presets point at `duration.fast` (200 to 250ms), card presets at `duration.medium` (300 to 350ms), reveal presets at `entrance.duration` (600 to 900ms), lifts at `distance.xs` and `distance.sm` (2 to 4px), and the default motion curve is `easing.ease-out` as a fast-start, gentle-settle curve. The exact values are set by build phase M1 (§16).
- **Per client.** Each cloned client's exact values come from its own draft into `sites/<client>/theme-snapshot.json` under the same keys (Spec 48 §11 extractor, `push-theme-snapshot.py`).

## 8. Stagger and orchestration

- **Every element stores its own delay.** A delay is an ordinary entrance value, per device.
- **Container helper.** Lives in the container's Entrance and reveal panel. It optionally stamps the container's chosen entrance onto each child (or onto each declared repeated item part), then writes each child's delay: position by Order (row first, column first, from centre, reverse) times Step, restarting at each visual row when the column count per device is above 1, capped at Maximum total delay (D7). Column count per device comes from the container's stored grid columns (found by DB role); a single-column stack accumulates up to the cap.
- **Re-run.** The helper re-runs when a child is inserted, moved, removed or duplicated, and on Write delays. It skips any child delay listed in that child's `customised`.
- **Query loops.** `sgs/post-grid` writes each item's delay from its own loop index (`plugins/sgs-blocks/src/blocks/post-grid/render-interior.php` (its `_card_index`)). Core `post-template` and the WooCommerce `product-template` get a `render_block` filter that emits one positional scoped rule per item (FR-32-4a) from the loop item entrance's stored step, row restart and cap. The index restarts per page (enhanced pagination and load-more re-render on the server).
- **Time-based reveals only.** Scroll-linked effects take no stagger; a staggered scrub is Tier G (Spec 38 FR-38-7).
- **Rejected.** `sibling-index()`, stylesheet `nth-child` ladders that derive a delay from position, and any runtime delay computation.

## 9. Runtime per motion type

| Motion | Mechanism | Tier | JS |
|---|---|---|---|
| Hover and focus | CSS transitions on the target; per-element `transition-property` lists only the changed properties; `@property` registers custom properties that are themselves animated (tilt angles, filter amounts); `source: root` uses the root's `:hover` and `:focus-within`; all inside `@media (hover: hover) and (pointer: fine)`, with `:focus-visible` parity | V | 0 |
| Page-load entrance | `@starting-style` plus `transition-behavior: allow-discrete` with the stored from-values | V | 0 |
| Scroll-into-view reveal | One small IntersectionObserver module sets `data-sgs-in`; CSS transitions play the reveal; the hidden start state applies only under the `sgs-motion-ready` class the module adds, so no JS hides nothing | V | about 1 kB |
| Multi-keyframe entrance | The existing WAAPI code (`assets/js/animation-observer.js`), reading keyframes and the stored delay, with every delay computation removed | V | shipped |
| Scroll-linked single-property effect | One plain-JS driver on every browser writes a registered `--sgs-scroll-progress` (0 to 1); CSS reads it (D3, the FR-38-35 precedent) | V | small, shared |
| Looping effects (ambient float, Ken Burns, SVG loop, marquee) | CSS animations reading the element's scoped custom properties, with the WCAG 2.2.2 pause control on any loop over five seconds; the marquee's hover rate and pause on touch use one shared module | V | small, shared |
| Pointer-driven effects (magnet, tilt, cursor field, sheen origin, ripple) | One rAF-throttled pointer writer per effect that writes custom properties only; CSS owns every transform and paint (FR-38A-47) | V | per effect, conditionally loaded |
| Tier G, H, W effects | Unchanged: Spec 38 runtime, conditional loading, `data-sgs-fx-*` grammar, now emitted from the `effect` object | G/H/W | per Spec 38 §4.4 |

The LCP rule: a page-load entrance on an element in the page's first top-level section, or on an image with `fetchpriority="high"`, renders with its from-opacity at 1 (movement only) unless the entrance sets `allowLcpFade`, which the panel labels with a warning.

## 10. Composition rules

- **Property ownership.** An entrance owns `opacity` and the composite `transform`, plus `filter` (blur-in) or `clip-path` (reveal) when its preset uses them. A hover owns the individual `translate`, `scale` and `rotate`, plus `filter` when the entrance does not use it, plus the transition timing of the element's colour and shadow hover properties. An effect owns its `fx_effects.owned_properties`.
- **No shared property.** The schema and the inspector reject a hover or effect value that writes a property the same element's entrance owns, and the inspector shows why.
- **Never held.** An entrance ends at the element's own resting styles; no end state is held, so it never becomes a containing block and hover is free once it ends.
- **Own timing.** Each owner writes its property list and a matching per-property timing list as custom properties; the shared stylesheet concatenates the owners' lists, so each property carries its own owner's duration, delay and easing.
- **Scroll effects win.** An effect whose registry row owns transform or opacity across a scroll range suppresses the element's entrance at render time (Spec 38 §4.3).

## 11. Editor

- **Final state plus Replay (D5).** The canvas shows every element at its final state. Replay plays that target's entrance once in the canvas; hover previews by hovering the canvas.
- **Live thumbnails.** Each preset choice shows a small looping CSS thumbnail; under reduced motion it is static.
- **Assets in the iframe.** The shared motion stylesheet and the reveal module load inside the iframe canvas (`enqueue_block_assets`).
- **Reduced motion in the editor.** Replay and thumbnails respect `prefers-reduced-motion`; Replay then shows a one-line notice.
- **Effects.** Per-effect canvas stories stay as Spec 38 §9.
- **Performance budget.** On a 200-block page, typing latency and memory with the motion support must stay within 10% of the same page before the change (FR-38A-29).

## 12. Reduced motion and accessibility

- Under `prefers-reduced-motion: reduce`: entrances show their final state with no movement and every stored delay is zeroed; hover effects that move do not apply, while colour and shadow state changes apply instantly; effects follow their `fx_effects.reduced_motion` value (simplify or suppress). The reveal module and the scroll driver listen for a mid-session change.
- Anything a hover reveals stays visible by default on devices that cannot hover (degrade to more content).
- Hover effects also apply on `:focus-visible` (and `:focus-within` for root-driven targets), so keyboard users get the same feedback.
- A looping effect longer than five seconds gives a pause control (WCAG 2.2.2).
- No content is hidden without JavaScript.

## 13. Migration

### 13.1 What exists today (the migration input)

- **Entrance:** `sgsAnimation`, `sgsAnimationDelay`, `sgsAnimationDistance`, `sgsAnimationDuration`, `sgsAnimationEasing`, `sgsAnimationStart`, `sgsAnimationTrigger` (start line, default 6% above the bottom edge), played by `assets/js/animation-observer.js` with WAAPI `fill: 'backwards'`; the effect list is `src/blocks/extensions/animation.js::ANIMATION_LABELS`; attributes are baked into saved markup by `animation.js` (`blocks.getSaveContent.extraProps`) and injected for dynamic blocks by `includes/animation-attributes.php`; the `sgs-entrance-pending` flag (`plugins/sgs-blocks/includes/animation-attributes.php::print_entrance_pending_flag`) hides elements until the observer runs.
- **Stagger:** `sgsAnimationStagger`, `sgsAnimationStaggerChildren`, `sgsAnimationStaggerMax`, serialised by `includes/animation-stagger.php` and computed in the browser by `assets/js/animation-entrance-timing.js::staggerOffset` (cap 7, automatic 100ms spacing); `supports.sgs.animationItems`.
- **Hover:** `sgsHoverDuration`, `sgsHoverDurationMs`, `sgsHoverEasing`, `sgsHoverEasingCustom`, `bgHoverZoom*`, `sgsHoverZoom*`, `sgsHoverImageZoom`, `shadowLiftOnHover`, `sgsHoverShadow`, `sgsHoverShadowCustom`, `scaleHover`, `sgsHoverScale*`, `effectHover`, `sgsHoverLift`, `sgsHoverIndent`, `sgsHoverOpacity`, `sgsHoverGrayscale`, `sgsHoverBorderAccent`, `sgsHoverTilt3D` (limits fixed in `assets/css/extensions.css` `.sgs-has-tilt-3d`).
- **Parallax:** `sgsParallax`, `sgsParallaxStrength`, `bgParallax`, `splitMediaParallax`, `parallaxStrength` (CSS scroll timelines behind `@supports` in `extensions.css`).
- **Effects:** every `fx*` attribute (`SELECT DISTINCT attr_name FROM block_attributes WHERE attr_name LIKE 'fx%'`), registered by `src/blocks/extensions/fx.js`.
- **Per-block reveals:** `staggerDelay` (`sgs/card-grid`, `sgs/gallery`, `sgs/testimonial`), `sgsStaggerDelay`, `revealOnScroll`, `revealStagger`, `revealTrigger` (`sgs/timeline`), `photoEntrance` (`sgs/buybox`), `fxFooterStagger` (`sgs/site-footer-row`), `captionReveal` (`sgs/gallery`, a hover reveal).
- **Nav motion:** `sgs/nav-drawer` `entryAnimation`, `entryDuration`, `exitDuration`, `entryEasing`, `entryEasingCustom`, `entryFade`, `curtainColour`, `itemStagger`, `itemStaggerAxis`, `itemStaggerDistance`, `itemStaggerDuration`, `itemStaggerMax`, `itemStaggerOnClose`, `itemStaggerReveal`, `staggerInsideGroups`; `sgs/nav-bar-menu` `submenuAnimation`, `submenuAnimationDuration`, `submenuExitDuration`, `submenuAnimationEasing`, `submenuAnimationEasingCustom`, `submenuItemStagger`, `submenuItemStaggerDistance`, `submenuItemStaggerDuration`, `submenuItemStaggerMax`, `submenuItemStaggerScope`; the mega panel stagger literals in `src/shared/effects/stagger.js` (design and earlier hard-coded values: `.claude/reports/2026-09-24-u5-motion-design.md`). `scrimFadeDuration` stays a block setting (it times the scrim, not page motion).
- **Looping media:** `bgKenBurns`, `bgKenBurnsMode`, `bgZoomStart`, `bgAnimationDuration`, `bgSvgAnimation`, `bgSvgAnimationSpeed`, `bgLottie`, `bgLottieLoop` (`sgs/container`, `sgs/hero`, `sgs/trust-bar`, `sgs/site-header`, `sgs/site-footer`, `sgs/multi-button`, `sgs/physics-canvas`), `splitMediaKenBurns` and `splitMediaAnimationDuration` (`sgs/hero`), `svgAnimation` and `svgAnimationSpeed` (`sgs/media`), `lottieId`, `lottieLoop`, `lottieSpeed`, `lottieTrigger` (`sgs/responsive-logo`, `sgs/media`), and `animationStyle`, `animationSubstrate`, `svgAnimationSource` (`sgs/responsive-logo`). The background SVG's content and styling (`bgSvgContent`, `bgSvgOpacity`, `bgSvgPosition`, `bgSvgMinHeight`, `bgSvgTextShadow`) stay block settings.
- **Marquees:** `sgs/brand-strip` `scrolling`, `scrollSpeed`, `scrollDuration`, `scrollDirection`, `fadeEdges`, `fadeWidth`, `pauseOnHover`; `sgs/trust-bar` `autoScroll`, `autoScrollBelow`, `autoScrollDuration`, `autoScrollSpeed`, `autoScrollPauseOnHover`, `autoScrollPauseButton`. `logoGap` stays a layout setting.
- **Global script:** `assets/js/scroll-progress.js`, enqueued on every page by `includes/class-sgs-blocks.php` and read by nothing.

### 13.2 Method

1. **Detector first** (migration-method skill): `plugins/sgs-blocks/scripts/migrate-motion/` with `--survey`, `--fix`, `--check` and `--self-test`. The survey lists every old attribute in code (from the DB) and in stored content on each target site, with counts and the target element and panel for each.
2. **Mapping** each old value onto `sgsMotion` per the destination column the survey prints: entrance values to `entrance`, stagger to explicit per-child delays (computed once from today's formula and stored), hover attributes to `hover` (the shadow and colour values stay in their controls; `shadowLiftOnHover` and `sgsHoverShadow` become the lift effect; `shadowHoverColour` vs `shadowColourHover` naming is tidied in the same sweep), every parallax attribute to the one `parallax` effect (FR-38A-43), `fx*` to `effect`, nav motion to the panel and item parts' `entrance` with the Panel opens trigger and stored per-item delays (FR-38A-51), looping media to `ken-burns`, `svg-loop`, `ambient-float`, `lottie` or `draw` effects (FR-38A-52), and marquee attributes to the `marquee` effect (FR-38A-44).
3. **WP-CLI sweep** `wp sgs motion-migrate --dry-run|--apply` over posts, pages, templates, template parts and synced patterns on every target site.
4. **Removal**: the old attributes, extension registrations, `animation-stagger.php`, `animation-entrance-timing.js`, the save-time extraProps injection, the hover extension, the parallax scroll-timeline rules and `parallax.js`, `tilt-3d.js`, `scroll-progress.js`, `src/shared/effects/stagger.js` and the second marquee implementation are deleted. No legacy fallback (R-31-14), no `deprecated.js`.

## 14. How the cloning route uses it

- **FR-48-47** writes each draft element's entrance into `entrance`: from and to values, extra keyframes, duration, the draft's actual delay per element and device, easing and trigger. It no longer chooses a stagger setting; the helper is only a convenience.
- **FR-48-77** writes recognised hover effects into `hover` and recognised special effects into `effect` with their parameters.
- Each written value snaps to a token reference when it equals that client's token value; otherwise it is a literal.
- Repeated template items get server-written delays, so the tool writes the loop's step, not per-item values.
- An effect no preset or parameter expresses raises a named Spec 38 gap; a custom selector is written only under §4 item 3.
- Every write validates against `motion.schema.json`.

## 15. Functional requirements

- **FR-38A-1 One motion support.** `supports.sgs.motion` registers one `sgsMotion` object attribute through one JS filter and one PHP filter. *Done when:* `git grep -n '"sgsMotion"' -- '*/block.json'` finds nothing, a block declaring the support exposes `sgsMotion` in `wp.blocks.getBlockType()` and in `WP_Block_Type_Registry`, and a block without it exposes neither. Status: not built.
- **FR-38A-2 Shared JSON Schema.** `motion.schema.json` is read by the cloning tool, the inspector and the renderer. *Done when:* a planted unknown key and an out-of-range value are rejected by the cloning tool's validator and dropped by the renderer (both negative controls fail visibly), and the build gate fails when the schema file is malformed. Status: not built.
- **FR-38A-3 DB rows for every motion field.** *Done when:* after a reseed, every schema field on every compatible block and target has a `block_attributes` row with `css_property`, `css_state`, `css_tier` and `css_element`, and a check script exits 1 when a planted schema field has no row. Status: not built.
- **FR-38A-4 Element targeting.** The Target row lists the root and the block's declared parts from the DB. *Done when:* on `sgs/info-box` the Target list equals its declared parts plus root, and a value set on the media part paints only `.sgs-card__media` on the frontend (computed-style check at 375/768/1440). Status: not built.
- **FR-38A-5 Cloning-only custom selector (D6).** *Done when:* the inspector offers no selector field; a cloning write with a custom target and no review row is refused; an accepted one emits rules prefixed by the block's scoped root. Status: not built.
- **FR-38A-6 Presets stamp token-pointing copies (D2).** Presets live in `motion_presets`; `animation_tokens` is dropped. *Done when:* picking a preset stores every value (token references where a token fits); changing `duration.fast` in a snapshot changes the computed hover duration on the live page; editing a preset row leaves an existing block's stored values unchanged; `SELECT name FROM sqlite_master WHERE name='animation_tokens'` returns nothing. Status: not built.
- **FR-38A-7 Hover panel.** *Done when:* every compatible block shows the panel with the §5 simple layer and Fine-tune, "Whole block hovered" drives a child from the root's `:hover` and `:focus-within`, and the panel owns the transition timing of the element's colour and shadow hover changes (a changed hover duration changes the computed `transition-duration` of the colour transition). Status: not built.
- **FR-38A-8 Entrance and reveal panel.** *Done when:* every compatible block shows the panel with Effect, Trigger, Intensity, Replay and Fine-tune, and a Fade up set on one part plays on that part only on the live page. Status: not built.
- **FR-38A-9 Effects panel.** Lists `fx_effects` rows filtered by scope, requirements, picker membership and the `panels` column. *Done when:* the list for each of three blocks equals the DB query result for it, and a site-scoped row never appears. Status: not built.
- **FR-38A-10 Layered UX.** *Done when:* each changed Fine-tune field shows "Customised" and a Reset that restores the stamped value, Intensity re-stamps values mapped to tokens, and re-stamping over customised fields asks first, naming the count. Status: not built.
- **FR-38A-11 Shared effect control kit.** Every effect's Fine-tune is built from the §5.3 kit, with the per-effect sets of §5.4. *Done when:* a check script (`plugins/sgs-blocks/scripts/check-motion-control-sets.py --check`) exits 0 when every `fx_effects` row and every effect slug in `motion_presets` has a §5.4 table row, every control a §5.4 line lists has a `motion.schema.json` entry, and every non-hidden Intensity row has three `motion_presets` rows with the §5.4 values, and its `--self-test` exits 1 on a planted `fx_effects` row with no §5.4 row; an inspector scan finds no effect panel built outside the kit; and every listed control round-trips (set, save, reload, frontend value). Status: not built.
- **FR-38A-12 Easing picker with a custom curve.** *Done when:* the picker offers the `sgs_motion_easing_css` curves and the easing tokens, a custom `cubic-bezier()` and a `linear()` string each save and reach the computed `transition-timing-function`, and an invalid custom curve is refused with a message. Status: not built.
- **FR-38A-13 Per-device values.** *Done when:* a Mobile override of an entrance distance computes to that value at 375 and the base value at 1440, with no `style` attribute. Status: not built.
- **FR-38A-14 Tokens kept and extended (D1).** The snapshot side is Spec 32 FR-32-21. *Done when:* `theme.json` keeps every existing key, adds `distance` and the two springs, and `git grep -c "wp--custom--duration--\|wp--custom--easing--"` shows no consumer broken (the build and a live check of three consumers pass). Status: not built.
- **FR-38A-15 Framework default values and client values (D4).** *Done when:* framework defaults fall inside the §7 bands, a report records the three drafts' measured values they came from, and a cloned client's snapshot carries its own draft's values under the same keys. Status: not built.
- **FR-38A-16 Emission through the collector.** *Done when:* `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 on a page using all three panels, no motion value appears in saved `post_content`, and the values appear only as scoped custom properties and data attributes. Status: not built.
- **FR-38A-17 Hover runtime.** *Done when:* a lifted card's computed `transition-property` lists only the changed properties (never `all`); on an emulated touch device (`hover: none`) no hover transform applies after a tap; `:focus-visible` gives the same transform. Status: not built.
- **FR-38A-18 Page-load entrance in CSS and the LCP rule.** *Done when:* a load entrance plays with JavaScript blocked; the first-section heading with a fade has computed opacity 1 at first paint unless `allowLcpFade` is set. Status: not built.
- **FR-38A-19 Reveal module.** *Done when:* a below-the-fold element starts hidden only after `sgs-motion-ready` is set, plays when it enters view, is fully visible with JavaScript blocked, and the module is under 1.5 kB minified. Status: not built.
- **FR-38A-20 Multi-keyframe entrances on WAAPI.** *Done when:* a three-keyframe entrance plays through `animate()` with the stored delay, and `git grep -n staggerOffset` finds nothing. Status: not built.
- **FR-38A-21 Scroll-linked driver (D3).** *Done when:* a single-property scroll effect produces the same `--sgs-scroll-progress` values in Chromium and stable Firefox at three scroll positions, and `extensions.css` holds no `animation-timeline` rule for parallax. Status: not built.
- **FR-38A-22 Tier G, H, W effects from the effect object.** *Done when:* each effect's `data-sgs-fx-*` markup is emitted from `sgsMotion` values, a page with zero Tier G effects still ships zero GSAP bytes (Spec 38 FR-38-3), and no flat `fx*` attribute remains registered. Status: not built.
- **FR-38A-23 Composition rules.** *Done when:* an element with Fade up and Lift shows both (entrance on `transform`, hover on `translate`) with no computed held transform after the entrance; a hover filter on a blur-in element is refused by the schema and the inspector; a scroll-owning effect suppresses the entrance at render time. Status: not built.
- **FR-38A-24 Container stagger helper.** *Done when:* a 3-column grid of six children with step 80ms, row first and row restart stores Desktop delays of 0, 80, 160, 0, 80, 160ms; the cap clips a long single-column stack; Reverse and From centre store the expected sequences in unit tests. Status: not built.
- **FR-38A-25 Helper re-run and drift gate.** *Done when:* inserting, moving, removing or duplicating a child rewrites delays (a duplicate does not keep its source's delay), customised delays are skipped, and a drift gate exits 1 on a planted out-of-order delay. Status: not built.
- **FR-38A-26 Server-written loop delays.** *Done when:* `sgs/post-grid`, a core `post-template` and a WooCommerce `product-template` each emit one scoped rule per item with the expected delay per device, restarting on page 2, with no `style` attribute and no `nth-child` rule derived from a formula in the stylesheet. Status: not built.
- **FR-38A-27 Reduced motion.** *Done when:* with `reduce` emulated, no element moves, every computed `transition-delay` and animation delay on motion targets is 0s, colour hover still changes, each effect matches its `fx_effects.reduced_motion` value, and a mid-session switch takes effect without reload. Status: not built.
- **FR-38A-28 Editor final state, Replay and thumbnails (D5).** *Done when:* every element is visible and selectable in the canvas, Replay plays the selected target's entrance once, thumbnails loop and are static under reduced motion, and the shared motion assets load inside the iframe. Status: not built.
- **FR-38A-29 Editor performance acceptance.** *Done when:* on a 200-block page the p95 keystroke latency and the JS heap after one minute of typing are each within 10% of the same page measured before the change, by a repeatable script committed with its baseline. Status: not built.
- **FR-38A-30 Accessibility.** *Done when:* hover-revealed content is visible by default under `hover: none`, keyboard focus reproduces every hover effect, a looping effect over five seconds has a working pause control, and an axe run on the fixture page reports no new violations. Status: not built.
- **FR-38A-31 Migration detector.** *Done when:* `migrate-motion --self-test` passes with a planted old attribute that `--check` reports, and `--survey` lists every §13.1 attribute with its destination. Status: not built.
- **FR-38A-32 Sweep and removal.** *Done when:* `wp sgs motion-migrate --apply` leaves `--check` at 0 on every target site, the §13.2 step 4 files and registrations are gone, a migrated fixture page renders the same motion as before (live check), and no legacy branch exists (`git grep` for the old attribute names in `plugins/` returns only the detector and its fixtures). Status: not built.
- **FR-38A-33 Cloning writes all three panels.** *Done when:* cloning the Indus draft writes per-element `entrance` values with the draft's own delays, `hover` values from its hover styles and `effect` values from FR-48-77 recognisers, every write passes the schema, and a draft value equal to a client token is stored as a token reference. Status: not built.
- **FR-38A-34 Cursor-field `image-reveal` field type.** A sixth field type on Spec 38 FR-38-25's painter seam (`--sgs-cursor-field-layer`, optional `--sgs-cursor-field-mask`, element-local coordinates, z-index 0 under content): an image layer clipped by `clip-path: circle(var(--sgs-cursor-field-radius) at <pointer x> <pointer y>)` with parameters image (media ID), edge (0 = hard circle, else a feathered mask width), hover radius (a rest radius and a hover radius, transitioned through `@property --sgs-cursor-field-radius { syntax: '<length>' }`), wash (colour and opacity, a gradient over the image) and an optional ring (size, width, colour, shadow, lag through the trail value) painted in a declared pseudo-element slot (FR-38A-49), never the ripple's `::after`. *Done when:* the Indus ingredient-card peek (`Indus Foods Website v2.dc.html`, `[data-peek]`) is rebuilt on a fixture card: radius 0 at rest growing to 90px on hover over 0.4s `cubic-bezier(.16,.84,.32,1)`, the white wash running 0.5 to 0.3 opacity, a 180px ring with a 3px white border and a drop shadow that follows the pointer with a 0.4s lag and scales 0 to 1, each read from computed styles at three pointer positions; the radius transition is measured to animate (a negative control without the `@property` registration shows it jumping); and the card's ripple still paints on click. Status: not built.
- **FR-38A-35 Sheen sweep (new Hover effect, Tier V, CSS only).** On pointer entry (and `:focus-visible`) a diagonal light band crosses the element once: band width, angle, colour, opacity, duration and easing, painted in a declared pseudo-element slot. *Done when:* the Indus `[data-mag]` buttons' `shine()` sheen (a 60%-wide gradient band at `skewX(-18deg)` crossing in 750ms) is matched on a fixture button, sampled at 0, 375 and 750ms against the draft in the harness's sample mode; the sheen does not play under reduced motion; and no `style` attribute is written. Status: not built.
- **FR-38A-36 Scroll progress indicator (new effect, Tier V), replacing `scroll-progress.js`.** Source page, section or pin (the pin source reads horizontal-panel's progress output, FR-38A-38); output a bar scale on x or y, or counter text in a stated format; driven by the shared scroll driver of FR-38A-21 and loaded only on pages that use it. *Done when:* a header bar rebuilt from the Indus `_progEl` progress bar computes `scaleX` equal to page progress within 0.01 at 0%, 50% and 100% scroll in Chromium and stable Firefox; `assets/js/scroll-progress.js` is deleted and `git grep -n "scroll-progress.js" -- plugins` finds no enqueue; a page without the effect loads no scroll-progress code. Status: not built.
- **FR-38A-37 Ambient float (new effect, Tier V).** The Entrance and reveal panel has no loop option (`src/blocks/extensions/animation.js::ANIMATION_LABELS` lists one-shot entrances only), so the float is an Effects-panel loop: travel (px, axis), period (s), easing and a phase offset stored per element (written once by the editor when the effect is applied, never randomised at run time). *Done when:* Indus's `floatIt` elements (translateY −12px, periods 2.8 to 5s, alternate, ease-in-out, varied phase) are matched on a fixture with stored phases, sampled at three times; the loop has a working pause control (WCAG 2.2.2); it does not move under reduced motion; and `bgSvgAnimation` `float` migrates to this effect (FR-38A-52). Status: not built.
- **FR-38A-38 Horizontal-panel parameters.** The runtime reads smoothing (`fxScrub`), ease (`fxEase`) and hold (`fxHold`), and gains: pin length per panel (vh, plus a fixed tail in vh), a progress output (`--sgs-fx-progress`, 0 to 1, readable by any part), an active-panel state (a data attribute on the panel nearest the viewport centre, so a part can style it), and a below-breakpoint mode (static stack or a native scroll-snap row) with a breakpoint picker. *Done when:* the Indus Heritage track (`updatePins`) is matched on `sgs/timeline` horizontal: five panels pin for 5 × 70vh + 40vh = 390vh, linear with no smoothing; a bar part reading `--sgs-fx-progress` scales 0 to 1; a counter reads "01 / 05" to "05 / 05" (FR-38A-36's counter output); the active panel's year changes fill colour through the active state; at 375 the track is a scroll-snap row with no pin; and changing `fxScrub` or `fxHold` changes the measured scroll mapping (the negative control for FR-38A-50). Status: not built.
- **FR-38A-39 Proximity focus (a horizontal-panel parameter).** Each panel's scale and opacity follow its distance from the viewport centre between a focus value (centre) and an edge value, written as custom properties that CSS applies. *Done when:* on the FR-38A-38 fixture, the centred panel computes scale 1 and opacity 1 and a panel one panel-width off centre computes scale 0.94 and opacity 0.55 within 0.01, matching the Indus `updatePins` values; with the parameter off, every panel stays at scale 1 and opacity 1. Status: not built.
- **FR-38A-40 Magnet engage mode, pull model and per-axis limits.** Engage mode (proximity within a radius, or over the element only), pull model (distance factor, or normalised position: (pointer position within the element − 0.5) × a per-axis span), max pull x and max pull y (px, per device), radius, return duration and easing (token-pointing; replaces the fixed 180ms ease-out), moving part (root or a declared part). *Done when:* a fixture button with the Indus `[data-mag]` values (over-element engagement, normalised pull with spans 10px on x and 8px on y, return 0.25s `cubic-bezier(.16,.84,.32,1)`) computes translate (5px, 0) with the pointer at the right edge's midpoint and (5px, 4px) at the bottom-right corner, does not move with the pointer 1px outside the element, and returns to 0 over 250ms; a proximity-mode fixture still pulls from outside within its radius. Status: not built.
- **FR-38A-41 Tilt in the Hover panel, custom properties only.** Tilt becomes a Hover effect type whose pointer writer sets `--sgs-tilt-x` and `--sgs-tilt-y` only; CSS composes the rotation. Parameters: max angle (deg, per device), perspective (px) on the element itself or on its parent (written as the parent's `perspective` property), axis lock, glare (on, off, colour, opacity, size, painted in a declared slot), reset duration and easing (default the spring token). Tilt and hover rotate on one element are refused, as both own `rotate` (§10). *Done when:* a fixture grid with the Indus `[data-tilt]` values (maximum about 11.3° from `hypot × 16deg`, perspective 1100px on the parent grid, glare as a radial gradient of white at 0.42 fading to transparent at 55%, reset 600ms on `--wp--custom--easing--spring`, combined with hover `scale(1.04)` and a 6px lift) computes a rotation of 11.3° ±0.2 at a corner, the parent's computed `perspective` is 1100px, the glare layer's gradient matches, the hover scale and lift are still present while tilted, the reset is measured to take 600ms, and the element never carries a `style` attribute. Status: not built.
- **FR-38A-42 Hover rotate and translate x and y.** The Hover panel gains rest rotate (a per-element styling value, so each card in a set can rest at its own angle), hover rotate, and hover translate x and y, on the individual `rotate` and `translate` properties. *Done when:* Mama's cards (`Home.dc.html`, resting at their own `rotate({{ t.rot }})` angles and straightening on hover to `rotate(0) translate(-4px,-6px)` with `cubic-bezier(.3,1.4,.5,1)`) and the polaroid frame (resting at −2.5deg) are matched on a fixture: each card computes its own rest angle, then 0deg with translate (−4px, −6px) on hover and on `:focus-visible`, with that easing; under reduced motion the rest angle stays and the hover movement does not apply. Status: not built.
- **FR-38A-43 One parallax effect.** One `parallax` effect in the Effects panel: speed ratio (−1 to 1), range basis (page scroll, or while the element is in view), axis (x or y), clamp (px), target part (most often an image inside its frame), driven by the FR-38A-21 scroll driver and applied by CSS. It retires `sgsParallax`, `sgsParallaxStrength`, `bgParallax`, `splitMediaParallax` and `parallaxStrength`. *Done when:* with page basis, the Indus hero target (ratio −0.06) computes translateY −30px and the Eye Care hero target (ratio 0.18) computes 90px at scrollY 500, identically in Chromium and stable Firefox; an image part moves inside its frame without the frame moving; a clamp caps the travel; and after FR-38A-32 none of the five retired attributes is registered. Status: not built.
- **FR-38A-44 Shared marquee primitive.** One marquee runtime and one control set serve `sgs/brand-strip` and `sgs/trust-bar`: speed in px/s, direction, hover rate (0 = stop, 1 = no change), pause on touch, edge fade (on, width %), and a below-breakpoint switch (marquee only below a chosen breakpoint, static above); both blocks' attributes migrate to it and the second implementation is deleted. *Done when:* fixtures of the three drafts' marquees each measure within 2% of the draft: Indus 45px/s slowing to 0.15× on hover with a 5% edge fade; Mama's full loop in 24s pausing on hover and on touch; Eye Care's 64s loop pausing on hover on desktop and its 30s ticker running only on mobile; each has a pause control (WCAG 2.2.2); and `git grep` finds one marquee runtime under `plugins/sgs-blocks/`. Status: not built.
- **FR-38A-45 Ripple controls.** Ripple gains colour (palette slug), duration, easing (the shared picker), size factor (diameter as a multiple of the element's larger side), peak opacity and trigger (pointerdown or click, origin at the pointer). *Done when:* the Indus `[data-mag]` pointerdown ripple (diameter max(w, h) × 2.2, white at 0.35 opacity, 650ms) is matched on a fixture button, sampled at 0, 325 and 650ms; a click-trigger fixture fires only on click; under reduced motion no ripple plays. Status: not built.
- **FR-38A-46 Cross-effect kit rules.** Four rules every effect follows (audit cross-effect rules 1 to 4): one easing picker everywhere (theme easing tokens plus Custom curve), replacing `FX_EASE_OPTIONS`, with Tier G converting a `cubic-bezier()` to a GSAP ease in `@sgs/motion-provider`; every duration, distance and angle carries per-device values and points at a token where one exists; Intensity is a preset that stamps values and changes travel, angle, radius and range only, never trigger or target, with presets added to magnet, tilt, parallax, cursor-field and ripple and "Dramatic" renamed "Bold"; every effect takes a target at the §5.4 level (block, surface or part). *Done when:* `git grep -n FX_EASE_OPTIONS -- plugins` finds nothing; a custom curve on a Tier G scrub reaches its GSAP tween's ease; every duration, distance and angle field in `motion.schema.json` declares device overrides and the FR-38A-3 rows carry `css_tier`; no `motion_presets` Intensity row differs from its siblings in trigger or target (a check script with a planted negative control); no preset label reads "Dramatic"; and the Target row for each effect offers exactly the §5.4 level. Status: not built.
- **FR-38A-47 Scripts write custom properties only.** No motion script writes `element.style.transform`, `translate`, `rotate`, `scale`, `opacity` or `filter`; pointer and scroll writers set scoped custom properties and the shared stylesheet composes each transform channel from every owner (hover, effect) so contributions add instead of overwriting. *Done when:* a gate (`git grep` over `plugins/sgs-blocks/assets/js` and `src/shared/effects` for `.style.transform`, `.style.translate`, `.style.rotate`, `.style.scale`, `.style.opacity`, `.style.filter`, with GSAP Tier G tweens on their own scope exempt by file) exits 0, and exits 1 on a planted write; an element with tilt, a hover lift and parallax computes all three contributions at once. Status: not built.
- **FR-38A-48 Every scoped parameter is read by its runtime.** `plugins/sgs-blocks/scripts/check-fx-list-drift.py` is extended: for each effect, every `data-sgs-fx-*` name that `includes/fx-attributes.php::sgs_fx_effect_param_scope` scopes to it, every parameter a preset writes and every control the inspector shows must be read by that effect's runtime file. *Done when:* the check exits 1 on today's tree (horizontal-panel's `fxHold` and `fxScrub`), exits 0 once FR-38A-38 lands, and its self-test exits 1 on a planted scoped parameter no runtime reads. Status: not built.
- **FR-38A-49 Declared pseudo-element slots.** Each element's `::before` and `::after` have one declared owner each (today `::before` is cursor-field's and `::after` is ripple's); ring, glare and sheen layers take a declared slot (an extra background layer on the owning pseudo-element, or an injected layer element when both are taken), recorded in the effect's `fx_effects` row. The schema and the inspector refuse two effects on one element that need the same slot, and say why. *Done when:* a check script lists every effect's slot from the DB and exits 1 on a planted second owner of one slot; a card with cursor-field `image-reveal` with ring, ripple and sheen paints all three at once on the live page. Status: not built.
- **FR-38A-50 Today's motion defects fixed.** Four defects from the audit, each with a regression check: horizontal-panel ignores `fxScrub` and `fxHold` (`fx-horizontal-panel.js::initHorizontalPanel` hard-codes `scrub: true` and `ease: 'none'`); tilt-3d writes `el.style.transform` (`assets/js/tilt-3d.js`) and checks reduced motion once at load; parallax runs two disagreeing paths (the `extensions.css` `animation-timeline: scroll(root)` rule over whole-page progress, and `assets/js/parallax.js::updateParallax` over element-in-viewport progress); `assets/js/scroll-progress.js` loads on every page and is read by nothing. *Done when:* FR-38A-48's check passes for horizontal-panel; FR-38A-47's gate passes and a tilted element never carries a `style` attribute; a mid-session reduced-motion switch stops the tilt without reload; one parallax setting computes the same translate in Chromium and stable Firefox at three scroll positions; and `scroll-progress.js` is deleted. Status: not built.
- **FR-38A-51 Nav drawer and submenu motion on the Entrance panel model.** The drawer panel, submenu panels and mega panels, and their items, take their open and close motion from the Entrance and reveal panel with the Panel opens trigger (from and to values, open and close durations, easing, the curtain and wipe shapes as presets), and item staggers come from the container stagger helper writing stored per-item delays; the U-5 attributes (§13.1) migrate, and `src/shared/effects/stagger.js` and every runtime stagger computation are deleted. *Done when:* on the Indus header the drawer at 375 stores item delays on a 55ms step capped at 320ms and the mega panels a 26ms step capped at 320ms (the U-5 measured values, `.claude/reports/2026-09-24-u5-motion-design.md`), the live open sequence's measured per-item delays match the stored values, the close plays its own stored duration, `git grep -n "stagger.js" -- plugins/sgs-blocks/src` finds nothing, and under reduced motion every panel opens with no movement and zero delays. Status: not built.
- **FR-38A-52 Looping media effects.** Ken Burns (`ken-burns`: mode loop or zoom-out-once, zoom start and end, pan direction, duration, easing), background and media SVG animation (`svg-loop`: pulse or wave, duration, amplitude; float stamps `ambient-float`), Lottie (`lottie`: file, trigger, loop, speed) and the logo's SVG draw (`draw` with load, hover or scroll triggers) become Effects-panel effects on the background, media or logo part, replacing the §13.1 looping-media attributes. *Done when:* `migrate-motion --survey` maps every looping-media attribute in §13.1 to one of these effects; a fixture with each effect plays its stored values (a Ken Burns zoom-out-once from 108% over 20s, an SVG pulse, a Lottie on scroll, a logo draw on load); every loop longer than five seconds has a working pause control; under reduced motion none moves; and after FR-38A-32 none of the replaced attributes is registered. Status: not built.
- **FR-38A-53 State-change motion on block-private elements.** Motion a block plays when its own state changes (the cart count pop `sgs/cart` `countPopAnimation`, the burger icon morph (`--sgs-nbm-burger-morph-duration` and `-easing`, set in `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php`), accordion and disclosure icon turns) uses the same value model: a `state` trigger on a declared part, from/to values, duration, delay and the shared easing picker with tokens, set in the block's own panel through the shared control kit (FR-38A-46), with reduced motion honoured (FR-38A-27). Done when: the cart count pop and the burger morph are stored as `sgsMotion` values on their parts, their hard-coded durations and curves are gone from the block code, changing the easing token restyles both, and a planted block-private animation with a literal duration in its stylesheet fails the shared-kit check. Status: not built.

## 16. Phasing

Build phases under plan step 0.3, each closing with its FRs' done-whens:

- **M1 Foundations:** schema, support registration, tokens, `motion_presets`, `fx_effects` columns, DB rows (FR-38A-1 to 3, 6, 14, 15).
- **M2 Renderer and runtime:** emission, hover, load entrance, reveal module, WAAPI, scroll driver, composition, custom-property-only scripts, pseudo-element slots, reduced motion (FR-38A-16 to 21, 23, 27, 47, 49).
- **M3 Inspector:** the three panels, layered UX, kit and its cross-effect rules, easing picker, per-device, editor (FR-38A-4, 7 to 13, 28 to 30, 46).
- **M4 Stagger:** helper, re-run, loops, nav panels (FR-38A-24 to 26, 51).
- **M5 Effects fold-in:** Tier G, H, W from the effect object (FR-38A-22), FR-38A-5, the per-effect parameters and new effects (FR-38A-34 to 45), the runtime-reads gate (FR-38A-48), today's defects (FR-38A-50) and looping media (FR-38A-52).
- **M6 Migration:** detector, sweep, removal (FR-38A-31, 32).
- **M7 Cloning:** with plan Phases 2 and 4 (FR-38A-33).

## 17. Open items

| Item | Owner | Closes when |
|---|---|---|
| Exact framework default token values | Build phase M1 | `theme.json` holds values inside the §7 bands with the measuring report committed |
| The block counts marked "see DB" in the research | Build phase M6 (detector survey) | The survey prints them |
