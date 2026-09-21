---
doc_type: design-report
unit: U-1 commit 4 (surface ground vocabulary)
status: COUNCIL DONE (GO WITH CHANGES, applied below)
---

# U-1 commit 4: one surface-ground mechanism

Bean chose "wrapper" (2026-09-21): blur, saturate and opacity as a shared capability, not a nav-only patch.

## Facts (read from the code, not assumed)

- `SGS_Container_Wrapper` is called by about 50 blocks, including `sgs/container`, `sgs/site-header`,
  `sgs/site-footer` and `sgs/site-header-row`. It emits no `backdrop-filter` and no fill translucency today.
- `sgs/mega-panel`, `sgs/nav-drawer` and `sgs/modal` do NOT render through the wrapper (block-private roots;
  the DB's `wraps_block` column says otherwise), so a wrapper-only change would not reach two of the three
  surfaces this unit is about.
- The wrapper reads only attributes a block declares. It does not know the block's fill colour, so it cannot
  apply translucency to a fill it cannot see.
- `includes/class-sgs-container-wrapper.php` is 3,888 lines, already over the project limit (disclosed in the
  commit, not split, per Bean's ruling).
- `backdrop-filter` on an element makes it the containing block for `position:fixed` descendants. The header
  already carries `backdropBlur`, so this is an accepted property of a blurred surface.

## Design

1. **One helper file, `includes/helpers-surface-ground.php`**, two functions:
   - `sgs_surface_backdrop_decls( $blur, $saturate )`: returns `backdrop-filter:saturate(N%) blur(L);` plus the
     `-webkit-` twin, or `''`. `$blur` goes through `sgs_css_length_value`; `$saturate` is a whole number 0 to 500.
     Empty blur and empty saturate emit nothing.
   - `sgs_surface_fill_alpha( $fill_css, $opacity )`: returns `color-mix(in srgb, <fill> N%, transparent)`, or the
     fill unchanged when opacity is empty or 1. The CALLER passes the fill it resolved (a header, panel or drawer
     knows its own), which is why opacity is a helper and not a wrapper read.
2. **Wrapper adoption.** `SGS_Container_Wrapper::render()` reads `surfaceBlur` and `surfaceSaturate` from the block's
   attributes and adds `sgs_surface_backdrop_decls()` to its outer declarations. A block that does not declare
   the attributes emits nothing, so every other wrapper block is byte-identical. This replaces the header's own
   `backdrop-filter` emission (`includes/sgs-header-float-css.php`), leaving ONE writer of `backdrop-filter` per
   wrapper block.
3. **Names.** `surfaceBlur` (length), `surfaceSaturate` (number, percent), `surfaceOpacity` (number 0 to 1).
   - `sgs/site-header`: `backdropBlur` is renamed to `surfaceBlur`; gains `surfaceSaturate` and `surfaceOpacity`
     (header render passes its resolved fill to the helper) and, built last, `surfaceFadeEdge`.
   - `sgs/mega-panel`: `bgBlur` (boolean) replaced by the three; `borderRadius` becomes the tier object; gains
     `shadow` and `shadowColour` emitted block-privately through the existing `sgs_shadow_value_composed()`; the
     hardcoded literals in `mega-panel/render.php` become block.json defaults.
   - `sgs/nav-drawer`: keeps `surfaceBlur` and `surfaceOpacity`, both now emitted through the helper; gains
     `surfaceSaturate`, `shadow` and `shadowColour` (same helper, block-private).
   - `sgs/container`, `sgs/site-footer`, `sgs/site-header-row`: no change in this commit. They adopt by declaring
     `surfaceBlur` and `surfaceSaturate` in block.json (wrapper emits; opacity needs each block to pass its fill).
4. **Editor.** One shared component `SurfaceGroundControls` (blur, saturate, opacity) replaces the three bespoke
   blocks of controls; canvas previews in `site-header/float-preview.js`, `mega-panel/edit.js` and
   `nav-drawer/edit.js` read the new names.
5. **Migration (no deprecations pre-production).** Rename list is grep-driven and known (15 files, see the U-1
   design). Panel radius string to tier object with the fallthrough check; the converter routing row for
   `sgs/mega-panel::borderRadius` and the framework DB reseed land after this commit. Stored `backdropBlur` in
   sandybrown's `sgs_header` posts is updated by a `wp` search before deploy.
6. **Order inside the commit** (each its own sub-commit, largest support first): helper plus wrapper plus header
   rename; mega-panel; drawer; `surfaceFadeEdge` (fantasy only) last.

## Tests

`tests/php/run-surface-ground-standalone.php`: helper outputs, bounds, empty inputs, injection attempts; wrapper
standalone runner: a block declaring `surfaceBlur` emits `backdrop-filter`, one that does not emits none
(negative control), invalid value emits nothing. Live: fixture with a blurred header measured in headed Chrome.

## Risks for the council

- Wrapper edit is in a 3,888-line, 50-caller file: any change must be byte-identical for blocks that do not
  declare the attributes.
- Opacity is not universal across wrapper blocks (needs the caller's fill). Container, footer and header-row get
  blur and saturate now and opacity only when they pass a fill; state this rather than hide it.
- `backdrop-filter` and `position:fixed` descendants inside a blurred wrapper.
- Rename hits stored content, the converter DB row and the consistency rosters.

## Council changes (opus adversarial reader + haiku verifier): all applied

Blockers:
- **B1 blur validator.** `sgs_css_length_value` must-accepts `16px 12px`, which is invalid inside `blur()`. The header's
  `sgs_header_float_single_length` exists for that reason. It moves into `includes/helpers-css-safety.php` as
  `sgs_css_single_length_value()` (the wrapper must not require a header-only file) and is used for blur on every
  surface, the drawer included.
- **B2 no new blur by default.** `mega-panel::bgBlur` is false today; the new `surfaceBlur` / `surfaceSaturate`
  defaults stay EMPTY on every block. The `saturate(150%) blur(24px)` pair is a pattern value, not a default.
  `surfaceSaturate` is a whole-number percent (`150`, never `1.5%`); an empty value emits nothing (`saturate(100%)`
  is inert but still creates a containing block).
- **B3 one `box-shadow` writer on the mega panel.** The existing unconditional two-layer literal in
  `mega-panel/render.php` is REPLACED by the `shadow` attribute, not joined by it. `sgs_shadow_value_composed`
  treats a multi-layer literal as a preset, so `shadowColour` is inert for it: stated in the control help.
- **B4 fill translucency.** `sgs_surface_fill_alpha()` returns '' unless the fill is a plain colour (not a
  gradient/image, not empty). Gradient fills are out of scope for opacity.
Fixes: **F5** live check with a dropdown, a mega panel and a non-modal drawer open on a blurred header BEFORE any
further block adopts blur. **F6** an orphan token's `, currentColor` tail becomes `, transparent` inside the mix.
**F7** `0` is a legal value for opacity and saturate: null/'' comparisons, never `empty()`. **F8** wrapper
`$base_outer_decls` entries carry no trailing `;`; the helper returns an array of declarations; the move lowers the
header's blur rule from `.uid.sgs-site-header` to the wrapper's `.uid` (no other writer remains, so no contest).
**F9** rename list re-derived (16 files, 5 roster JSON regenerate, two hits belong to the retired `mobile-nav`
block and must not be touched, the dated `site-header-pill-2026-09-20.md` record is not rewritten; Spec 37 is
edited). **F10** over-length files edited and disclosed: `mega-panel/render.php`, `nav-drawer/render.php`,
`site-header/render.php`, `site-header/edit.js`, `mega-panel/edit.js`, `nav-drawer/edit.js`,
`class-sgs-container-wrapper.php`. The wrapper has 34 callers (not 50).

Sub-commit order: **4a** helper, validator move, wrapper, header rename plus saturate and opacity; **4b** mega-panel;
**4c** drawer; **4d** `surfaceFadeEdge` (fantasy only).

## Bean's ruling on the shared background panel (2026-09-21): add step 4e

Bean: the controls belong in the shared background panel as a feature extension for every block that mounts it; the
"dead control" objection does not apply when each block declares and renders the attributes. Accepted. The
objection that DOES hold: the mega panel and drawer do not mount that panel, and its controls are a plain
`PanelBody` while `SurfaceGroundControls` returns `ToolsPanelItem`s.

**4e (after 4b, 4c, 4d):** mount `SurfaceGroundControls` inside `container/components/BackgroundPanel.js`, shown only
when the block declares `surfaceBlur`; add `surfaceBlur` and `surfaceSaturate` (and `surfaceOpacity` only where the
block passes its own fill to `sgs_surface_fill_alpha`) to every wrapper block that mounts the panel (container,
header, footer, hero, cta-section, trust-bar, physics-canvas; `multi-button` only if it renders through the
wrapper: check first). More than three blocks, so it ships as a survey, fix and check script (precedent:
`scripts/fanout-overlay-sibling-attrs.py`), each block gets its canvas preview (CHECK A parity gate), and the
council's F5 live check (dropdown, mega panel, non-modal drawer open inside a blurred header) runs before the
fan-out is deployed.
