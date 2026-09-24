# U-5 design: how the drawer and menu panels arrive and leave

Wave 3C, lane A. Families M-31 (panel and drawer entry and exit animation) and M-32 (per-item entry
stagger). Bean column: `eye`. U-16 (header and footer entrance, M-11) is NOT paired in this pass: its
design gate waits on plan step 0d (the headed footer capture), which has not run. U-16 reuses the
easing and duration vocabulary built here, so the pair still shares one motion vocabulary.

## 1. The problem

Every animated nav surface in the framework has a hardcoded shape, duration and curve, and the
eleven references that animate their menus cannot be cloned:

- **Drawer** (`nav-drawer/style.css`, `render.php::$sgs_nd_allowed_anims`). `animateFrom` has two
  values (`auto`, `fade`). `auto` picks one of four keyframe shapes from the DESKTOP anchor. Open is
  0.25s ease-out, close 0.2s ease-in, both literals. No slide from an edge, no clip wipe, no curtain,
  no "none", no duration, no easing.
- **Dropdown panels** (`nav-bar-menu::submenuAnimation`, `none|fade|slide-down`, PHP-validated). Open
  only: 0.18s / 0.26s literals. No exit: the panel is `display:none` the instant `aria-expanded`
  flips (`nav-menu-submenu-css.php`, the `__submenu-wrap` rule).
- **Mega panels.** No entry attribute at all. `nav-menu-markup.php` adds the `--{animation}` class to
  the DROPDOWN wrap only; the mega interactivity context carries `isOpen`, `megaId`, `intentDelay`,
  `closeGrace`, `openOn`. The panel shows and hides by `display` with no transition.
- **Stagger.** Only `mega-panel::staggerOnOpen` (a boolean). Its timings (460ms, 28ms step, the
  curve) are literals in `src/shared/effects/stagger.js`, run by a MutationObserver in
  `mega-panel/view.js`. The drawer has nothing: zero files under `src/blocks/nav-drawer*` contain
  "stagger".
- **Scrim fade** stays at the 0.2s U-2 left "until U-5's motion vocabulary"
  (`includes/helpers-scrim.php`, the `transition:opacity .2s ease` rule).
- **Easing** already has one attribute-driven resolver, but it is private to the burger:
  `nav-bar-menu/render.php::sgs_nav_bar_menu_resolve_burger_morph_easing_css` plus its JS twin in
  `BurgerPanel.js`.

## 2. Exit-cell table

Values read from `<ref>.json::rows[surface,tier].cells.motion` (butcherbox from `cells.mechanics`).
"Open / close" are durations; the attribute column is what expresses the cell after U-5.

| Ref | Surface, tier | Measured | Expressed by |
|---|---|---|---|
| away | drawer 375, 768 | slides in from the left, `transform 0.3s ease-out`, close about 299ms | `entryAnimation`=`slide-start`, `entryDuration` 300, `exitDuration` 300, `entryEasing` `ease-out-css` |
| away | dropdown, mega 1440 | opacity 0 to 0.95 in about 166ms after a 196ms delay; close fade 190ms after 225ms | `submenuAnimation` `fade`, `submenuAnimationDuration` 166, `submenuExitDuration` 190; delays are U-1's `submenuIntentDelay` and `submenuCloseGrace` (built) |
| butcherbox | drawer 375 | panel slides from the start edge over 0.15s `cubic-bezier(0.4, 0, 0.2, 1)` | `slide-start`, 150, `entryEasing` `standard` |
| buck | drawer 375, 768, 1440 | translateY 900px to 0 with opacity 0 to 1, settles about 496ms; close about 248ms | `slide-up`, `entryFade` on, 500 / 250 |
| dogstudio | drawer 375, 768, 1440 | a #131419 curtain sweeps across left to right and away while the list fades in; fully opaque by about 1.8s (upper bound, WebGL page); close about 0.8 to 1.2s | `curtain`, `curtainColour` #131419, 1800 / 1000, `entryEasing` `quart-out` |
| fantasy | drawer all tiers | aside fades 0.5s power1; items fade and rise from -2rem, stagger 0.05s; close 0.35s | `fade`, 500 / 350, `custom` curve; `itemStagger` 50, `itemStaggerDistance` -32 |
| halcyon | mega 1440 (all 8 variants) | source intent: panel 340ms opacity + translateY(-8px) + scale(.99); children 460ms, delay min(i x 28, 320), `cubic-bezier(.16,.84,.32,1)`; exit none (DEC-10: the intent is the requirement) | `submenuAnimation` `fade-lift`, 340, `submenuExitDuration` 0, `drafts` curve; `submenuItemStagger` 28, `submenuItemStaggerMax` 320, `submenuItemStaggerDuration` 460 |
| halcyon | drawer 375, 768 | stagger 55ms (source) | `itemStagger` 55, `itemStaggerMax` 320 |
| indus-foods | dropdown, mega 1440 | the same as halcyon with a 26ms step | the same, `submenuItemStagger` 26 |
| indus-foods | drawer 375, 768 | stagger 55ms (source) | `itemStagger` 55, `itemStaggerMax` 320 |
| lamalama | drawer all tiers | pill height grows `expo.out` 0.45s; children 0.05s stagger; scrim 0.35s power4.out; close the same | `wipe-down` (a clip reveal, see section 3.2), 450 / 450, `ease-out` (the expo-out token); `itemStagger` 50; `scrimFadeDuration` 350 |
| lusion | drawer 375 | cards: transform + opacity 0.5s `cubic-bezier(0.4,0,0.1,1)`, 20ms per card; closed pose translateY(5.5em) rotate(3.5deg); close delays reversed; scrim 0.4s, 0.4s delay when closing | `fade`, 500, custom curve; `itemStagger` 20, `itemStaggerDistance` 88, `itemStaggerOnClose` on; `scrimFadeDuration` 400 |
| studionamma | drawer 375, 1440 | skewed clip-path wipe top to bottom, about 2.0s ease-in-out; links rise about 168px (375) / 387px (1440), staggered | `wipe-down-skew`, 2000 / 2000, `ease-in-out`; `itemStagger` 100, `itemStaggerDistance` 168 |
| wearecollins | drawer all tiers | clip-path reveal from the bar strip to the full viewport, about 300ms; close about 285ms; no stagger (measured) | `reveal-from-bar`, 300 / 285; `itemStagger` 0 |

Named residue:
- The dogstudio durations are upper bounds (its WebGL page slowed each sample to 0.4 to 1s).
  The live check compares the shape and the order, not the milliseconds.
- lusion's end pose was never reached in the headless capture, so its stagger is expressed but not
  measured. Its closed-pose rotate (links 3.5deg, other cards -3.5deg) and its 0.4s scrim delay on
  close are recorded divergences: one reference, half-covered by any single rotate value, so no
  attribute is built for them.
- fantasy moves its links from -2rem and its `.js-fade-up` items from +2rem. One `itemStaggerDistance`
  covers the links; the second direction is a recorded divergence.
- studionamma's link distance differs by tier (168px at 375, 387px at 1440). `itemStaggerDistance`
  is a tier object for this reason (section 3.1).

## 3. The design

### 3.1 One motion vocabulary, two owners

The same four ideas on both surfaces: shape, duration (open and close separately, because five
references close faster than they open), easing, and item stagger.

**Drawer: `sgs/nav-drawer`**

| Attribute | Type, default | Notes |
|---|---|---|
| `entryAnimation` | tier object `{}`; values `auto`, `none`, `fade`, `slide-start`, `slide-end`, `slide-up`, `slide-down`, `wipe-down`, `wipe-down-skew`, `reveal-from-bar`, `curtain`, `scale` | Replaces `animateFrom`. It is a tier object because the drawer's anchor is per tier, so the natural shape is per tier. `auto` keeps today's per-anchor pick: `header`→expand-down, `trigger`→corner-scale, `centred`→modal-scale, `full-screen`→the -8px nudge |
| `entryDuration` | number 250 (0 to 3000 ms) | Today's literal |
| `exitDuration` | number 200 | Today's literal |
| `entryEasing` / `entryEasingCustom` | string `ease-out-css` / `""` | Shared easing enum (3.3) |
| `entryFade` | boolean true | Movement shapes also fade. Off for away's pure slide |
| `curtainColour` | colour `""` (falls back to the drawer's own fill) | `SgsColourPanel`; read only by `curtain` |
| `itemStagger` | number 0 ms (0 means off) | The step per item |
| `itemStaggerDistance` | tier object `{}`, px, default 16 | Negative means the item falls from above (fantasy) |
| `itemStaggerDuration` | number 0 (0 means use `entryDuration`) | |
| `itemStaggerMax` | number 0 ms (0 means no cap) | The cap on the total delay; 320 only for the drafts' `min(i x step, 320)`. A 320 default would clip fantasy and lamalama at item 7 and studionamma at item 4 |
| `itemStaggerOnClose` | boolean false | Reverse order on close (lusion) |
| `scrimFadeDuration` | number 0 (0 means match the surface) | Replaces U-2's literal 0.2s for the drawer scrim |

**Dropdown and mega panels: `sgs/nav-bar-menu`.** This follows the U-2 precedent: the scrim went on
nav-bar-menu because it owns every dropdown and mega panel.

| Attribute | Type, default | Notes |
|---|---|---|
| `submenuAnimation` | existing; gains `fade-lift` and `grow`, and NOW REACHES THE MEGA FORK | `fade` stays the default (FR-41-1) |
| `submenuAnimationDuration` | number 180 | |
| `submenuExitDuration` | number 150 (0 means instant) | New: panels get an exit at all |
| `submenuAnimationEasing` / `...Custom` | `ease-out-css` / `""` | Shared easing enum |
| `submenuItemStagger` | number 0 | |
| `submenuItemStaggerDuration` | number 0 (0 means use the panel duration) | |
| `submenuItemStaggerMax` | number 0 (0 means no cap) | |
| `submenuItemStaggerDistance` | number 8 px | |

The bar's scrim (U-2, `helpers-scrim.php`) fades with `submenuAnimationDuration` on open and
`submenuExitDuration` on close, the same curve as the panel (away: "overlay follows the panel"). No
new attribute.

The drawer's close uses `entryEasing` too; today's close is a hardcoded `ease-in`, and lamalama
closes with the same expo-out it opens with.

`mega-panel::staggerOnOpen` is deleted. The bar's stagger values now drive every panel. Stored `true`
values migrate to `submenuItemStagger` 28 on the owning bar through the existing migration tooling, so
there are not two sources for the same thing. A bar with one staggered mega panel becomes
all-staggered; that is expected pre-production, and the live check reads it as intended.

The count is 20 attributes (`itemStaggerRotate` dropped, see the lusion residue).

### 3.2 How it renders (no JS timing, no inline styles)

- **Drawer.** It keeps the `[open]` / `.is-closing` keyframe lifecycle that `store.js` already runs;
  close logic changes in two ways (council): it ignores `animationend` events carrying
  `e.pseudoElement` (the curtain's `::before` would otherwise close the dialog when the sweep ends),
  and it resolves on `Promise.allSettled(drawer.getAnimations({ subtree: true }).map(a => a.finished))`
  with its fail-safe timer set to the longest `delay + duration`, so a reversed item stagger is not
  truncated. The existing 50ms timer and the reduced-motion short-circuit stay, so a 0 duration,
  `none` or reduced motion never hangs. Each shape is one static keyframe pair in `style.css`, and the per-tier
  shape class is emitted in the drawer's scoped tier media queries, like `closeStyle` today. Duration
  and easing reach the keyframes as custom-property VALUES on the scoped rule
  (`--sgs-nd-enter-dur`, `--sgs-nd-exit-dur`, `--sgs-nd-ease`). The base rule applies
  `sgs-nav-drawer-in` / `-out` to every drawer and the shape classes only swap `animation-name`, so
  `none` needs its own `animation: none` rule.
  - `reveal-from-bar` clips from `var(--sgs-drawer-opener-row-bottom)`, which `store.js` already
    measures.
  - `curtain` is a `::before` layer that sweeps across while the content fades in.
  - `wipe-down` uses `clip-path: inset(... round <radius>)`, so a rounded card or pill keeps its
    corners while it grows. This expresses lamalama's height growth without animating `height:auto`,
    which `interpolate-size` supports only in Chromium.
- **Panels.** Pure CSS entry and exit through `@starting-style` plus `transition-behavior:
  allow-discrete` on `display`. Entry is Baseline 2024 (Chrome 117, Safari 17.5, Firefox 129). In a
  browser without exit support the close is instant, exactly today's behaviour, and it is never a
  hidden or stuck panel. The exit rule also sets `pointer-events: none`, transitions `visibility`
  to hidden (out of the Tab order and the accessibility tree at the flip) and drops to
  `z-index: 99`. Without these, the closing panel keeps pointer hits, sits over the panel that is
  opening, and a diagonal move from trigger A to trigger B can re-open A through the close grace.
  The live check tests the A-to-B hover. The existing close grace (U-1) already delays the `aria-expanded` flip. The
  mega fork gets the same `--{animation}` class as the dropdown fork in `nav-menu-markup.php`, so one
  set of rules serves both forks.
- **Stagger: CSS only, replacing the JS module.** An "item" is a direct child only, never a
  descendant: `.sgs-nav-drawer-menu > li` in the drawer (so nested accordion lists do not restart the
  count), and the panel content's direct children in a mega panel. The drawer's logo and CTA, which
  sit beside the menu in the drawer body, take the fixed delay `max` (or the last item's delay when
  there is no cap). This is a cross-block contract: nav-drawer-menu's own stylesheet owns the item
  rules, keyed on custom properties the drawer sets (`--sgs-nd-stagger-step`, `-max`, `-dist`,
  `-dur`). Static `:nth-child(1..20)` rules set `--sgs-i`. When `itemStaggerOnClose` is on,
  `:nth-last-child` rules set `--sgs-ri` for the close; otherwise the close reuses the forward index.
  Each delay is `min(var(--sgs-i) * step, max)`. The native function is used through
  `@supports (transition-delay: calc(sibling-index() * 1ms))`; `sibling-index()` alone is not a valid
  condition. Items past 20 take the capped delay, which the 320ms cap already
  implies. The mega panel's `initStagger` path in `view.js` is removed. `shared/effects/stagger.js` is
  deleted if nothing else imports it (today only `mega-panel/view.js` does). This keeps "no JS never
  hides content": with CSS alone the items already sit at their end pose.
- **Focus during a long entry.** `focusFirstIn` runs on open, while a slow wipe (studionamma's 2s)
  still clips the first link, so its focus ring would be invisible. When `entryDuration` is over
  500ms, focus moves when the entry animation finishes, through the same fail-safe pattern. Escape
  still closes mid-entry (the `runClose` guard checks only `.is-closing`).
- **Reduced motion.** Every shape, the panel transitions and the stagger live only under
  `prefers-reduced-motion: no-preference`. Under `reduce`, surfaces appear and disappear instantly,
  as today.

### 3.3 One shared easing resolver

The burger's resolver moves out of `nav-bar-menu/render.php` into `includes/helpers-motion-easing.php`
as `sgs_motion_easing_css( $value, $custom )`, with a JS twin in `src/components/motion-easing.js`
that both inspectors import. It keeps the burger's validated `cubic-bezier()` check and gains
`ease-out-css` (the CSS keyword, today's drawer and dropdown curve), `ease-in-out`, `standard`
(0.4, 0, 0.2, 1) and `drafts` (.16, .84, .32, 1). The burger, drawer, panels and (later) U-16 all read
this one helper, so they share one list.

### 3.4 Editor surface

- **Drawer.** A "Motion" panel: the shape through `ResponsiveControl` under the global device toggle,
  durations as `RangeControl`, easing as `SelectControl` plus a custom text field,
  `ToggleControl`s, and `curtainColour` through `SgsColourPanel`. A stagger sub-group appears when the
  step is above 0.
- **Nav-bar-menu.** A "Dropdown and panel motion" panel with the same components.
- PHP allow-lists are mirrored from the JSON enums in the same commit. Run `inspector-scan` on both
  blocks.

## 4. Risks

1. **Renaming `animateFrom` to a tier object.** None of the nine theme drawer patterns stores
   `animateFrom`, and no header pattern stores `submenuAnimation` or `staggerOnOpen` (census). The
   rename touches the tooling and fixtures: `check-editor-render-parity.js`, `attr-role-map.json`,
   `setting-types.json`, `setting-reclassification.json`, `scripts/hover-guard/test-fixtures/**`
   (frozen copies of both `style.css` files) and
   `scripts/migrations/2026-09-14-nav-menu-split-classify-sentinels.php`. The sandybrown drawer posts
   are surveyed and migrated with `migrate-tier-object.py`, the U-11 precedent.
2. **Removing the JS stagger.** It is a behaviour change on any mega panel with `staggerOnOpen` on.
   The migration maps it to the bar value, and the live check measures a staggered mega panel.
3. **`@starting-style` exit on `display`.** This is the newest part. The fallback is today's
   behaviour, never worse.
4. **Hot files and the length rule.** `nav-menu-markup.php`, `nav-menu-submenu-css.php`,
   `nav-drawer/render.php` and `store.js` are over the length limit. Commits carry
   `[gates-ok:pre-existing file length]` (plan section 1e). New logic goes in the new helper file
   rather than growing them.
5. **Size.** 20 new attributes across two blocks. Build order inside the unit: the easing helper,
   then the drawer shape, durations and easing (M-31, 9 references), then the panels' exit and the
   mega fork, then stagger (M-32, 6 references, last).

## 5. Verification (per plan section 5, step 7; heavy checks batched per Bean)

- **PHP standalone tests.** The easing resolver, the shape allow-list, the tier class emission and the
  stagger custom properties, each with a negative control pinned to the pre-change commit
  (`<sha>~1`).
- **Live on `/qa-scrim/`.** Measure one exit cell per family:
  - away's `slide-start` 300ms: sample `getAnimations()[0].effect.getTiming()` and the transform at
    t=0 and at the end.
  - halcyon's mega `fade-lift` 340ms plus the 28ms stagger: read the computed `transition-delay` on
    items 1 to 3 and item 15 (capped).
  - Reduced-motion emulation: no animations, with a positive control proving they fire without it.
- **Batched for Bean's later pass:** axe, the editor round-trip, and Bean's eye on the shapes.

## 6. Council (2026-09-24)

There were two reviewers on different models. The code-path census (Sonnet) confirmed every section 1
claim. It corrected the migration list and found that `none` needs its own `animation: none` rule.
The adversarial reader (Fable) returned GO WITH FIXES. Its points:

- what counts as an item for the drawer stagger;
- no stagger cap by default;
- close-lifecycle truncation, from the curtain pseudo-element and the reversed stagger;
- the panel exit's pointer, visibility and z-index rules;
- the bar scrim following the panel timing;
- the `@supports` syntax;
- deferring focus for long entries;
- the table gaps (fantasy's second direction, the drafts' 375 drawer rows);
- dropping `itemStaggerRotate`.

All of these are applied above. Nothing was rejected.
