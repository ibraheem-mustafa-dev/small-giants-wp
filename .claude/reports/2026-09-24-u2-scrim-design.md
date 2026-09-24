---
doc_type: design-gate
unit: U-2 (Wave 3C)
family: M-14 (surface scrim)
status: COUNCIL DONE (GO WITH FIXES x2, fixes applied below), awaiting Bean
date: 2026-09-24
---

# U-2 design: the scrim behind an open drawer or panel

## The problem in plain English

A scrim is the see-through dark layer that dims the page behind an open menu. Six of the
thirteen reference sites use one. SGS has two gaps:

1. **The drawer's scrim cannot be changed.** `nav-drawer/style.css` hardcodes
   `rgba(0, 0, 0, 0.55)` twice (`.wp-block-sgs-nav-drawer::backdrop` and
   `.sgs-nav-drawer__scrim`). No colour, strength, blur or per-device setting exists.
2. **Dropdown and mega panels have no scrim at all.** Zero `scrim` in
   `mega-panel/render.php`, `includes/nav-menu-markup.php` and `nav-bar-menu/render.php`.

Baseline (read this session, `git grep -n -i scrim -- src includes`): the only scrim paint in the
nav system is the two hardcoded rules above. The DB has no `scrim*` attribute on any block
(`sgs-db.py sql "SELECT block_slug, attr_name FROM block_attributes WHERE attr_name LIKE 'scrim%'"`
returns nothing).

## Exit cells (from `<ref>.json::rows[].cells.ground.value.scrim` and `mechanics`)

| Ref | Surface | Tier | Measured | Expressed by |
|---|---|---|---|---|
| away | drawer | 375 | `#000000` @0, full viewport, closes on click | drawer `scrimOpacity.mobile = 0` |
| away | drawer | 768 | `#000000` @0.5, full viewport, closes on click | drawer `scrimColour #000000`, `scrimOpacity.tablet = 0.5` |
| away | dropdown + mega | 1440 | `#000000` @0.1, full width from the panel top, fades with the panel | bar `scrimColour #000000`, `scrimOpacity.desktop = 0.1` (see coverage note) |
| butcherbox | drawer | 375 | `rgb(18,18,18)` @0 | drawer `scrimOpacity.mobile = 0` |
| butcherbox | dropdown | 1440 | `rgb(18,18,18)` at "reduced opacity", from the header bottom | bar `scrimColour #121212`; **the opacity number was never captured** (leftover 1) |
| halcyon | mega | 1440 | `#0a0a0c` a=0.28, `blur(2px)`, full viewport, z 150 under a z 200 header, click closes | bar `scrimColour #0a0a0c`, `scrimOpacity.desktop 0.28`, `scrimBlur.desktop 2px` |
| halcyon | drawer | 375, 768 | scrim opacity 0 (the overlay itself is opaque) | drawer `scrimOpacity 0` at both tiers |
| indus-foods | dropdown + mega | 1440 | `#141923` a=0.25, `blur(2px)`, full viewport, z 150 under a z 200 header, click closes | bar `scrimColour #141923`, `scrimOpacity.desktop 0.25`, `scrimBlur.desktop 2px` |
| indus-foods | drawer | 375, 768 | scrim opacity 0 | drawer `scrimOpacity 0` |
| lamalama | drawer | 375, 768, 1440 | `#000000` @0.4, `blur(16px)`, full viewport, pointer-events none (the click falls through to the page and a window listener closes) | drawer `scrimColour #000000`, `scrimOpacity 0.4`, `scrimBlur 16px`; click-through is leftover 2 |
| lusion | drawer | 375, 768 | opaque `#0016ec` over the full viewport | the full-screen drawer's own fill (`drawerBg #0016ec`), not the scrim; the card inset is U-3 (M-46) |
| lusion | drawer | 1440 | `linear-gradient(270deg, rgba(11,11,18,.5), rgba(11,11,18,0))` over the right half, opacity 0.2 | drawer `scrimColourGradient: linear-gradient(270deg, rgba(11,11,18,.5) 0%, rgba(11,11,18,0) 50%)`, `scrimOpacity.desktop 0.2` |

**Coverage note.** away's panel scrim is recorded as starting at the panel top and
butcherbox's at the header bottom; halcyon's and indus-foods' cover the whole viewport under
the header (z 150 under z 200). In every case the header is opaque or near-opaque (halcyon
`#fcfbf8` at 0.86, indus-foods `#ffffff`) and paints above the scrim, so a full-viewport scrim
one layer under the header dims exactly the page area outside the header in all four. It would
differ only under a transparent header while a panel is open; no reference has that.

## The design

**One scrim element, one set of attributes, two owners.**

### Attributes (identical names and shapes on both owners)

| Attribute | Type | Default | Meaning |
|---|---|---|---|
| `scrimColour` | string | drawer `#000000`, bar `''` | Tint colour: token slug or hex, through `SgsColourPanel` |
| `scrimColourGradient` | string | `''` | Gradient sibling; non-empty wins over `scrimColour` (the existing `*Gradient` convention) |
| `scrimOpacity` | object (tier) | drawer `{desktop:0.55}`, bar `{}` | How strong the tint is, 0 to 1, per device |
| `scrimBlur` | object (tier) | `{}` | Blur of the page behind, a CSS length, per device |

- **Why opacity and blur are per device but colour is not.** Two references change the
  strength by device (away, lusion); none changes the colour except lusion, whose phone and
  tablet "scrim" is really the full-screen drawer's own blue fill. The container's
  background overlay already settled the same way ("colour rarely varies by device; weight
  does", `container/components/BackgroundPanel.js`). Blur is per device because blurring the
  whole viewport is the most expensive paint on a phone, so a site may want it on desktop only.
- **Owners.** `sgs/nav-drawer` (its drawer) and `sgs/nav-bar-menu` (every dropdown and mega
  panel that bar opens). The plan's lock list named `mega-panel` as the panel owner; that is
  wrong on the evidence: away, butcherbox and indus-foods dim the page for plain dropdowns too,
  which are not `mega-panel` blocks, and no reference varies the scrim per panel. One owner per
  bar covers both kinds of panel.
- **No `scrimClickCloses` attribute.** 6 of 6 references close on a click outside, and both
  engines already do (`store.js` backdrop click; `mega-disclosure.js::onOutsideClick`). An
  attribute that turns it off would add an accessibility opt-out DEC-02 forbids.
- **Names checked free**: no `scrim*` attribute exists on any block (query above).

### Rendering (one path for both owners)

The scrim is a plain `<div aria-hidden="true">` carrying the block's `$uid` class:

```
.{uid}-scrim            { position:fixed; inset:0; z-index: <header z> - 1;
                          backdrop-filter: blur(var(--scrim-blur)); opacity:0;
                          pointer-events:none; transition: opacity .2s ease; }
.{uid}-scrim::before    { content:""; position:absolute; inset:0;
                          background: <colour or gradient>; opacity: var(--scrim-opacity); }
.{uid}-scrim.is-open    { opacity:1; pointer-events:auto; }
```

- **Why the tint lives on `::before`.** If strength were the element's own `opacity`, the blur
  would fade with it: lamalama's 16px blur at 40% tint would render as a 40%-strength blur.
  Tint on `::before`, blur on the element, keeps both exact, and it works for a gradient
  (lusion), which `color-mix()` alpha could not. The element's own opacity is then only the
  open/close fade.
- **Per-device values** are custom-property VALUES set in the block's scoped `<style>` under the
  768/1024 tier media queries through `includes/helpers-responsive.php::sgs_emit_responsive_css`
  (the continuous-value emitter; `sgs_emit_tier_rules` is the on/off one), no inline style
  (Spec 32).
- **Strength is 0 to 1**, matching the nav family's `surfaceOpacity` (U-1). The modal block's
  `overlayOpacity` is 0 to 100; the nav scale wins inside the nav blocks, and the modal is not
  touched.
- **Reparented to `<body>` on first open**, the same idiom as the drawer
  (`store.js::reparentToBody`) and the mega panel (`mega-disclosure.js::reparentPanelIfNeeded`):
  a `position:fixed` child of a header with `backdrop-filter` or a transform is positioned
  against the header, not the viewport, and would also paint inside the header's own stacking
  context and dim the header's background.
- **This fixes a live double-dim bug** (council finding, confirmed by reading
  `store.js`): the open action adds `.is-open` to the scrim div outside its `useModal` branch,
  so a partial-width MODAL drawer today paints the native `::backdrop` AND the div, each 0.55
  black, about 0.80 combined.
- **The drawer stops painting through `::backdrop`.** `::backdrop` becomes `transparent`; the
  drawer's scrim div paints instead, in modal and non-modal modes alike. A modal `<dialog>` in
  the top layer with a transparent backdrop still shows the page layer, where the div sits, so
  one element serves both modes and the two hardcoded rules go. The backdrop-click close in
  `store.js` is unchanged (it hit-tests the dialog, not the div).
- **When the element is emitted.** Drawer: when any tier resolves to a visible scrim (opacity
  above 0 or a blur), which with the default is always. The current "partial-width anchor only"
  gate goes: a full-screen drawer with `surfaceOpacity` below 1 shows the page behind it, so the
  scrim matters there too. Bar: only when `scrimOpacity` or `scrimBlur` is set at some tier, so
  a site that never touches it ships nothing.
- **Open state.** Drawer: `store.js` already toggles `.is-open` on the element `resolveScrim()`
  finds. Bar: nothing today maps a `megaId` to its bar (`state.openMegaId` is one global
  value; `megaId` is a menu item id or a generated submenu id). U-2 builds the mapping: on open,
  the disclosure root (which stays inside its bar; only the panel is ever reparented) resolves
  `root.closest('.wp-block-sgs-nav-bar-menu')` and that bar's scrim by `data-sgs-bar-scrim`,
  recorded in a module map keyed by `megaId`. `.is-open` is added on open and removed whenever
  `openMegaId` clears or moves to another bar, in lock-step with `syncOutsideClickWatcher()`.
  Two bars can exist (header rows only: `nav-bar-menu/block.json::ancestor` is
  `sgs/site-header-row`), so the map, not a single global scrim, is required.
- **Forced colours**: the scrim is hidden (`display:none`). Dimming means nothing there, and a
  forced system background could turn it opaque. Dismissal still works: the document-level
  outside click and the dialog's backdrop click do not depend on the div.
- **Reduced motion**: the fade shortens to 0.01ms, as today.
- **Keyboard route unchanged** (plan §5 step 7 for U-2): Escape and the × still close; the
  scrim adds a pointer route only. It is `aria-hidden`, never focusable, and plays no part in
  focus management, which stays on the panel and its trigger.
- **WCAG 1.4.13**: the scrim is not hover content; it appears when a panel opens (by hover
  intent, click or keyboard) and goes when it closes, so it adds no new dismiss rule.

### Editor

A "Backdrop" panel in each owner's inspector: `SgsColourPanel` (colour + gradient, `linked`
wired) and `ResponsiveControl` rows for strength (0 to 1 slider) and blur (length), under the
global device toggle. The canvas does not preview the scrim; a closed menu has none, the same
as the modal block's `::backdrop` (precedent: `modal/edit.js`).

### Converter

`css_property` rows for the DB so a draft's scrim routes: `scrimColour` background-color,
`scrimOpacity` opacity (tier), `scrimBlur` backdrop-filter (tier), `css_element` `scrim`.
Proven by the reseed query in plan §5 step 8.

## Files

`nav-drawer/{block.json,render.php,style.css,edit.js}`, `nav-bar-menu/{block.json,render.php,style.css,edit.js}`,
a shared emitter `includes/helpers-scrim.php` (one function both owners call, so the rules
cannot drift), `src/shared/nav-interactivity/mega-disclosure.js` (bar scrim open state and
reparent), `src/shared/nav-interactivity/store.js` (only if the always-emit change needs it),
tests in `tests/php/` and `scripts/tests/`, and `scripts/nav-qa/sweep-drawer-variants.mjs`
(it asserts the live `::backdrop` today and must read the div instead). Two blocks, so no detector is needed (the rule
triggers at more than three).

## Spec change

Spec 36's drawer-variants paragraph says "NO scrim element, 8/8 references have none". That was
true of the eight drawer-variant references; M-14's six references show partial drawers and
panels with one. Amend to: the drawer and the bar each carry the scrim attribute set; default
drawer tint black at 0.55, default bar none.

## Leftovers (named, not silent)

1. **butcherbox dropdown opacity**: the capture recorded "reduced opacity" with no number. The
   colour is covered; the number is measured at its Wave 4 clone.
2. **lamalama click-through**: its scrim lets the dismissing click land on the page underneath
   (`pointer-events:none`). SGS absorbs that click so a dismiss never follows a link by
   accident. Proposed as a recorded divergence (Bean to accept).
3. **Scrim fade timing** (lamalama 0.35s, away fades with its panel): motion vocabulary is
   U-5's (M-31, M-32); the scrim keeps 0.2s until then.
4. **`sgs/cart`'s drawer** hardcodes the same `rgba(0,0,0,0.55)` on its `::backdrop`. It is not a
   nav block and not in M-14; `helpers-scrim.php` is built so cart can adopt it later with no
   new design.
5. **DEC-02 and `sgs/modal::closeOnOverlay`**: the modal already ships a toggle that turns off
   click-to-dismiss. DEC-02 was decided for the Wave 3C nav references, so the modal is out of
   its scope; recorded here so it is not mistaken for precedent.

## Risks

- `backdrop-filter` on a full-viewport fixed layer costs paint on low-end phones; per-device
  blur lets a site switch it off on mobile, and the default is no blur.
- Removing the drawer's `::backdrop` paint changes every existing partial drawer's look only if
  the div fails to render; the live check covers modal and non-modal.
- Hover-open panels: the scrim appears under the pointer's path to the page. Leaving the panel
  already starts the close grace, so the scrim cannot trap the pointer. The live check hovers in
  and out with a real pointer.

## Verification (the command that proves it)

1. PHP standalone tests for `helpers-scrim.php`: per-tier rules, gradient wins over colour,
   unset bar emits nothing, drawer default emits black 0.55; each with a negative control
   against the current code.
2. Live on eye-care-test, one headed window: open the drawer (modal and non-modal, partial
   anchor) and a bar dropdown and a mega panel at 1440, 768 and 375; read `getComputedStyle`
   of the scrim and its `::before` (colour, opacity, `backdrop-filter`) against the exit-cell
   values; click the scrim and confirm it closes; Escape still closes; `axe-run.mjs` with the
   surface open; forced-colours emulation shows no scrim.

## Council record (2026-09-24)

- Code-path census (Sonnet): GO WITH FIXES. Confirmed the drawer engine, freeze, backdrop-click
  hit-test, `--sgs-header-z` on `:root`, and one shared `sgs/mega` store for dropdowns and mega
  panels. Found the double-dim bug, the missing megaId-to-bar mapping, the wrong helper citation,
  the modal precedent, the cart duplicate and the live QA sweep. All applied above.
- Adversarial read (Haiku): GO WITH FIXES. Every exit-cell value matches the raw JSON; the
  `::before` tint/blur split holds; lusion's argument holds; no bar has two panels with different
  scrims. Coverage-note wording and the focus/1.4.13 lines applied above.

## Addendum A (2026-09-24, after Bean's sign-off): one shared scrim for every block that dims the viewport

**Bean's ruling:** build the scrim as a shared helper any relevant block adopts: the nav drawer,
modals and pop-ups, and the cart drawer, not only the two nav blocks.

### Census (`git grep -l -i "::backdrop\|showModal\|<dialog" -- src includes`)

| Block | Today | Adopts |
|---|---|---|
| `sgs/nav-drawer` | `::backdrop` + `__scrim` div, both hardcoded `rgba(0,0,0,.55)` | yes |
| `sgs/nav-bar-menu` | none | yes (default off) |
| `sgs/cart` (drawer panel) | `.sgs-cart__panel--drawer::backdrop` hardcoded `rgba(0,0,0,.55)` | yes |
| `sgs/modal` (the pop-up block) | `overlayColour`, `overlayColourGradient`, `overlayOpacity` (0 to 100), `overlayColourHover(Gradient)` on `::backdrop` | yes, migrated to the shared names |
| `sgs/product-search` | overlay `::backdrop` `rgba(0,0,0,.5)`; cmdk `::backdrop` `rgba(0,0,0,.55)` + `blur(6px)` | yes, each current value kept as the default |
| `sgs/gallery` (lightbox) | the full-viewport dialog's own background, `color-mix(primary-dark 90%)` | yes |

Six blocks: past the three-block line, so the detector comes first (THE-MIGRATION-METHOD).

### What changes in the mechanism

1. **Adoption is declared, not guessed**: `supports.sgs.scrim` in `block.json` plus the four
   attributes declared explicitly (never runtime-injected: an injected attribute is invisible to
   the schema census and the converter DB). Each adopter's own defaults live in its `block.json`,
   so today's look is each block's default (drawer and cart 0.55 black; product-search 0.5, and
   0.55 with 6px blur for cmdk; gallery primary-dark at 0.9).
2. **Open state through CSS `:has()`, not per-block JavaScript.** The helper takes an
   `$open_selector` naming what "open" means for that block and writes
   `:root:has(<open_selector>) .{uid}-scrim { opacity:1; pointer-events:auto }`:
   dialogs `.{uid}[open]`; the bar `.{uid} [data-sgs-mega-trigger][aria-expanded="true"]`.
   This replaces the megaId-to-bar map the census asked for (the trigger always stays inside
   its bar, even when its panel is reparented), and drops the drawer's `.is-open` toggling in
   `store.js` so there is one open mechanism, not two.
3. **One small shared script** reparents every `[data-sgs-scrim]` to `<body>` once, enqueued by
   the helper only when a scrim renders. The drawer's own reparent keeps working (idempotent).
4. **Dialogs**: `::backdrop` becomes transparent; the dialog's click-outside handling is
   unchanged (it hit-tests the backdrop, not the div). The scrim div sits under the top layer,
   so it never receives the pointer there. Gallery's dialog background becomes transparent and
   the scrim paints instead.
5. **Editor**: one shared inspector component, `ScrimControls` (colour + gradient through
   `SgsColourPanel`, strength and blur through `ResponsiveControl`), dropped into each adopter's
   inspector.

### Detector: `plugins/sgs-blocks/scripts/scrim/check-scrim.py`

`--survey` lists every viewport dimmer (a `::backdrop` or `__scrim`/lightbox-dialog background
in a block `style.css`) and whether its block declares `supports.sgs.scrim`; `--check` fails on a
hardcoded dimmer paint in any block, and on an adopter missing an attribute or the helper call;
`--self-test` carries a negative control per rule; registered in `gates.json`. `--fix` writes the
`supports` flag and the four attribute declarations; the render and editor wiring is per block.

### Modal migration

`overlayColour` becomes `scrimColour`, `overlayColourGradient` becomes `scrimColourGradient`, and
`overlayOpacity` (0 to 100) becomes `scrimOpacity.desktop` (0 to 1). There is no content to
migrate before production. `closeOnOverlay` stays (leftover 5). **The hover pair
(`overlayColourHover`, `overlayColourHoverGradient`) is removed (Bean, 2026-09-24)**: the
scrim div cannot be hovered under a top-layer dialog, and the "hover" state covers the whole
viewport outside the dialog whenever the pointer is off the dialog, so it acts as a second
resting colour. Removed with the migration.

### Addendum A: council re-check (code-path census, 2026-09-24) and the changes it caused

- **Printed at `wp_footer`, not moved by a script.** The helper queues the scrim's HTML and prints
  it at `wp_footer` as a direct child of `<body>` (block themes render the whole template before
  `wp_head`, so every block has queued its scrim by then). No transformed or filtered ancestor can
  capture it, and there is no reparent script at all. The scrim's CSS still travels in the block's
  own scoped `<style>` through the collector. The drawer's `reparentToBody()` stays harmless
  (idempotent).
- **Open selectors per adopter.** Dialogs opened with `showModal()` use `.{uid}:modal`, never
  `[open]`: product-search server-renders a literal `open` for its no-JS fallback, and `:modal`
  matches only a real modal open. The non-modal drawer uses `.{uid}[open]`. The bar uses
  `.{uid} [data-sgs-mega-trigger][aria-expanded="true"]` (the trigger's root never reparents).
- **`$uid` on the dialog.** cart (`helpers-cart-panel.php::sgs_cart_panel_wrapper_html`), modal
  (`.sgs-modal__dialog`) and gallery (`.sgs-gallery__lightbox`) gain the block's `$uid` class on
  the dialog element itself; product-search and the drawer already carry it.
- **cart shares `store('sgs/nav')` with the drawer**, so dropping the `.is-open` toggle in
  `store.js` changes both; the cart's non-modal path (if any) keeps the scrim click-to-close.
- **Exit timing.** Drawer and cart remove `[open]` after their exit animation; modal and gallery
  call `dialog.close()` at once. The scrim fades out over 0.2s in every case, so on modal and
  gallery it outlasts the dialog by 0.2s, as their `::backdrop` fade does today. Accepted.
- **Click-to-close is unchanged per block**: drawer and cart always; modal per its existing
  `closeOnOverlay`; gallery and product-search keep their current routes (Escape and the close
  control). U-2 adds no new close behaviour to those two.
- **Modal rename is block-scoped**: only `sgs/modal`'s own `block.json`, `render.php`, `edit.js`,
  `style.css` and its `sgs/modal::*` rows in the cached classification maps. `overlayColour` on
  hero, gallery, media, pricing-table and the media overlay atom is a different attribute and is
  not touched.
