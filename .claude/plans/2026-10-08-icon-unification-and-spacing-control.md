---
title: One icon block (sgs/icon) + sgs/social-icons rebuilt as its wrapper + a rebuilt Spacing control
project: small-giants-wp
created: 2026-10-08
status: approved 2026-10-08; councils next, then Phase 1
---

# One icon block (sgs/icon) + sgs/social-icons rebuilt as its wrapper + a rebuilt Spacing control

## Context
`sgs/social-icons` is a poorly built scoped copy of `sgs/icon`; Bean wants `sgs/icon` to be the one icon block and social-icons deleted (pre-production, nothing to protect). Its job (a row of links filled from Site Info) moves to a thin wrapper built like `sgs/multi-button`: real `sgs/icon` children, group defaults on the parent, children filled from Site Info (socials and contact: call, email, map). Bean's list also covers the shared Spacing control (`SgsBoxControl`) that every block's padding/margin uses. Outcome: one icon block Site Info can drive (hiding a blank link, colouring a brand automatically), a Spacing control that looks and behaves like core's with theme-preset defaults, and the Eye Care footer and drawer rebuilt on it.

On approval: copy this plan to `.claude/plans/2026-10-08-icon-unification-and-spacing-control.md` (the repo copy `/handoff` maintains) and persist the 2D research to `~/.claude/memory/research/2026-10-08-icon-shape-padding-controls.md` + an INDEX line (research-check's gate; plan mode blocked it). The research favoured icon size + shape padding; Bean chose icon size + shape size (decision below) and the file records both.

## Bean's decisions (2026-10-08)
- **D1 Spacing default:** an untouched side's default is a theme spacing PRESET (the one nearest the block's current measurement), stored as the block's default. The dropdown preselects that preset's name and the input beside it shows its measurement, untied: typing flips the dropdown to Custom. A client re-scales by reassigning the default to another size or by changing the measurements in the theme's spacing scale.
- **D2 Shape list:** Square/rectangle (the only shape with a radius control, for slight rounding), Circle, Pill, then custom outlines (hexagon, diamond, octagon, blob…), which have no radius. My call on Bean's "you're the expert": custom outlines draw as an inline SVG shape behind the glyph (fill = background colour, stroke = border), because a CSS border on a `clip-path` shape is cut off at the corners; the box shapes keep CSS background + border.
- **D3 Icon-to-edge space:** icon size + shape size (width and height, linked by default; Circle forces one size), both per device and both accepting a theme preset or any unit. Icon is centred. The block's Spacing padding/margin mean space OUTSIDE the shape.
- **D4 Social row:** `sgs/social-icons` keeps its name, but every line of its current code is deleted and it is rebuilt as a thin wrapper of `sgs/icon` children (multi-button pattern) that fills itself from Site Info: the 8 socials plus phone (call), email and address (map).

## Coordination (before any write)
- Session small-giants-wp-79 owns `header.tree.json`, `mobile-menu.tree.json` (uncommitted edits now), google-reviews and google-rating-badge. SendMessage it before touching the drawer tree and before any eye-care-test deploy, reseed or Solve.
- `SgsBoxControl.js` was last changed by CR6 (P2-h/P2-j, done); CR6's open rows (P2-l/m/n) don't touch it. `git status --porcelain -- plugins/sgs-blocks/src/components/` must be clean before editing.

## Framework faults (evidence rows)
| # | Fault | Evidence |
|---|---|---|
| F1 | "Custom…" does nothing from Default | `SgsBoxControl.js::presetRow` onChange writes `knownPreset ? knownPreset.size : ''`; from Default it writes `''`, and `selectValue` derives from the stored value only (no `pickedCustom` state, unlike `SpacingControl.js`) |
| F2 | Link button is a 36px black square beside the row | `SgsBoxControl.js::linkButton`: core `Button`, no `size`, `isPressed={isLinked}`; core `spacing-sizes-control/linked-button.jsx` is `size="small"`, `iconSize={24}`, unpressed, in the header `HStack` beside the label (Gutenberg trunk, read 2026-10-08) |
| F3 | No gap above control labels | all rows and `SgsBoxControl`'s `BaseControl` pass `__nextHasNoMarginBottom`; no SGS rule restores the gap (only `.sgs-device-toggle .components-base-control__label` in `assets/css/device-toggle.css`) |
| F4 | Wide presets dropdown with measurements; slider squeezed in | `presetRow`: `SelectControl` 140px, labels `"${name} (${size})"`; Custom adds `UnitControl` 90px + `RangeControl` |
| F5 | Unlinked sides labelled by text; linked state has no icon | `SIDE_LABELS`; core draws `sidesTop/Right/Bottom/Left/sidesAll` from `@wordpress/icons` (installed, 11.8.0) |
| F6 | Untouched sides show "Default" with nothing behind it | padding/margin default `{"desktop":{}}`; real values hardcoded in stylesheets (e.g. `button/style.css` `14px 24px`, `icon/style.css` `--sgs-icon-shape-padding` 12px) |
| F7 | sgs/icon: shape `none` is the background switch; `outline` is a shape that kills the fill with a fixed 2px border | `icon/block.json::backgroundShape` enum none/circle/pill/square/rounded/outline; `style.css` `--bg-outline` `border:2px solid`; no border attributes, no `SgsBorderControl` |
| F8 | sgs/icon: two controls fight over icon-to-edge space | `backgroundPadding` TextControl → `--sgs-icon-shape-padding` vs the Spacing `padding` |
| F9 | sgs/icon: no glyph fill option | no fill attribute; Lucide glyphs are stroke-only |
| F10 | Blank Site Info link leaves a dead icon | `icon/render.php` renders unlinked when `linkUrl` is ''; binding returns '' to visitors (`class-sgs-site-info-binding.php::get_value`) |
| F11 | Admin hint mangled into an href | `get_value` returns `hint_for_key()` HTML in operator context; on `linkUrl` it passes `esc_url` |
| F12 | Editor binding picker lists 4 of 8 socials | `src/bindings/index.js::SITE_INFO_FIELDS` |
| F13 | No WhatsApp/Google/TikTok/X glyphs for sgs/icon | absent from `includes/lucide-icons.php`; only in `social-icons/brand-icons.php` + `.js` |
| F14 | Brand colours only inside social-icons | `social-icons/render.php::$platform_brand_colours` + `edit.js` mirror; `whatsapp-cta/style.css` hardcodes its green |
| F15 | sgs/icon colour defaults are not theme roles | `backgroundColour` default `surface-alt`; no border colour; hover shape '' |
| F16 | Accessible name not bindable | `class-sgs-block-bindings-support.php::SUPPORTED_ATTRIBUTES` `sgs/icon` = linkUrl, linkTarget |

## Phase 1: Spacing control (one component; ~124 mounts in 60 files inherit it)
1. Header: legend label + core-style small link button on the label's line (F2). The extra "Link sides" button under unlinked rows goes.
2. Row: side icon on the left (`sidesAll` linked; per side unlinked; the text label stays as the accessible name only) (F5) → thin preset select, names only (F4) → value input + unit dropdown, always visible, showing the preset's measurement. Picking a preset fills the input; typing flips the select to Custom via local `pickedCustom` state (F1).
3. No slider in the preset layout; the plain branch (no presets) keeps it.
4. F3: one rule in the shared inspector stylesheet giving stacked SGS controls a top gap.
5. Unit test (`tests/js/`) for preset→input sync and the Custom flip, with a planted negative control; `inherited-box.test.js` stays green.

## Phase 1b: preset defaults (D1), many blocks: detector first (THE-MIGRATION-METHOD)
1. Census script `scripts/survey-spacing-defaults.py` (`--survey/--check/--self-test`): for every block attribute rendered through `SgsBoxControl`, find the stylesheet value it currently falls back to and the nearest preset in `theme/sgs-theme/theme.json` spacing scale; emit JSON. Unrecognised items stop for Bean.
2. Settle the shape on one block (sgs/icon) and show Bean in the editor; then apply: block.json default per side = `var(--wp--preset--spacing--{slug})` (the control's existing storage form) and the stylesheet hard value removed. Blocks whose untouched side must stay empty (container: core's layout gutter; anything whose absence means "full width") stay unset; the census marks them.
3. Gate: `--check` fails a new stylesheet length on a side a Spacing control governs. `sgs/button` reads padding from the theme's button presets (`--wp--custom--button-presets--*--padding`): the council decides whether that stays the source or becomes the preset default.

## Phase 2: sgs/icon becomes the one icon block
Shared parts only: `SgsBorderControl` (`.claude/rules/block-editor-controls.md`), `SgsColourPanel` rows, `src/utils/border-preview.js::sgsBorderPreview`, `sgs_border_element_decls` (template `responsive-logo`), `SgsLengthControl` (presets) for sizes.
1. Shape (D2/F7): enum square (default), circle, pill, hexagon, diamond, octagon, blob…; no `none`/`outline`. Background on/off = background colour set or not. Radius only for square, via `SgsBorderControl`'s radius pair. Custom outlines: shared SVG path library `includes/icon-shapes.php` + `src/utils/icon-shapes.js` (twin, parity test).
2. Border (B1): `borderWidth` (box, default 0), `borderStyle` (solid), `borderColour` (`primary`) + hover/gradient siblings; box shapes paint CSS border, custom outlines paint SVG stroke from the same attributes.
3. Size (D3/F8): `shapeSize` per device `{width,height}` (linked; circle/custom outlines use one value), presets or any unit; unset = auto (icon size + a preset gap, set in Phase 1b's census). `backgroundPadding` is removed; Spacing padding/margin wrap the shape.
4. Glyph fill (F9): `iconFill` boolean fills the glyph with the icon colour.
5. Defaults (F15/C): icon `primary`, background `background`, border `primary`; hover flips icon→`background`, background→`primary`; border width 0.
6. Brand glyphs (F13): `brand-icons.php`/`.js` move to `includes/brand-icons.php` + `src/utils/brand-icons.js`, exposed in `IconPicker` as a Brands set.
7. Brand colours (F14/F): shared map `includes/helpers-brand.php` + JS twin; `colourMode` theme|brand. In brand mode the brand comes from the bound Site Info key or the chosen brand glyph; a colour the client sets wins. `whatsapp-cta` reads the shared map.
8. Hide when empty (F10/F11): a `linkUrl` bound to Site Info that resolves empty renders nothing for visitors; in the editor the icon shows dimmed with a "Set X in Site Info" notice; the hint never reaches the href.
9. Accessible name (F16): auto label from the bound key ("Call us", "Email us", "Message us on WhatsApp"); `ariaLabel` overrides. F12: `SITE_INFO_FIELDS` lists every social plus phone, email, address.

## Phase 3: rebuild `sgs/social-icons` from scratch as the wrapper
0. Delete every file in `src/blocks/social-icons/` (block.json, edit.js, render.php, style.css, brand-icons after the Phase 2 move); the slug stays, nothing of the old code survives.
1. Wrapper (multi-button pattern): `allowedBlocks: ["sgs/icon"]`, group defaults as `childIcon*` attributes printed as `--sgs-il-*` custom properties that icon/style.css reads (a child's own value wins), gap and alignment, `colourMode` group default. Inspector "Links" checklist (socials, call, email, map) adds/removes bound children; on insert it creates one child per Site Info key, each hide-when-empty, so a blank key never shows and filling it later makes it appear.
2. Address → map link: `prefix_url_for_key` gains an address → Google Maps search URL rule (with test).
3. Rewrite to the new attributes (the old ones such as `source`, `icons[]`, `iconStyle`, `iconGlyphColour*` stop existing): 4 drawer patterns (`drawer-editorial-ghost-list.php`, `drawer-offset-column.php`, `drawer-solid-brand-light.php`, `drawer-split-zone-serif.php`); Eye Care footer `cr-ref-footer-6` (styled to the draft: boxed, 18px glyph, surface-alt/border/text, accent-text hover); Eye Care drawer `cr-ref-mobile-menu-12..15` (three icon-only buttons become the wrapper with Instagram, Google, WhatsApp), via session 79.
4. Dependants: the slug survives, so name-only hits stay; everything that reads the OLD attributes or classes changes: `class-sgs-blocks.php` (`social-icons-footer` block style re-checked against the new markup), `sgs-header-ink-helpers.php` (`.sgs-social-icons__item` selectors → the child icon selectors), `site-footer-row/edit.js` slot (unchanged slug, check its template attrs), converter (`converter/resolvers/array_content.py` + tests: `core/social-links` now emits icon children, not `icons[]`; `block-replacements.json`/`slots.json` checked), `tests/php/BorderElementParityTest.php` + `social-icons--wrapper.json` fixture, `tests/playwright/blocks.spec.ts`, golden manifest, recogniser fingerprints, colour-audit CLI attribute list, `scripts/consistency/*.json` (regenerated), inspector-scan rules 31/33, survey ceilings. Closing check: a whole-tree grep for each removed attribute name (`iconGlyphColour`, `iconBackground`, `iconBorderColour`, `iconStyle`, `circleGlyphSize`, `showLabels`, `icons`) inside social-icons contexts ends at 0.
5. Specs: Spec 36 FR-36-21 rewritten (social/contact row = `sgs/social-icons`, a wrapper of bound `sgs/icon` children), Spec 02/32/35A/38 mentions, `.claude/rules/colour-emission.md`, and the controls rule file gains the Spacing control's contract.
6. Deploy order (oldshape audit, memory `attribute-change-blast-radius`): grep each target's stored content for `sgs/social-icons`, `backgroundShape` none/outline and `backgroundPadding`; rebuild those posts first, then deploy, then rebuild from the full trees.

## Councils, gates, commits
- `/adversarial-council` on D1-D4 + Phases 1b-3 before building; `/qc-council` on the F1-F5 fix shapes.
- Gates: `npm run build` (PowerShell), `audit-inline-styling.js --check`, `check-border-preview-twin.js`, `check-border-width-without-style.py`, `check-no-client-names.py --check`, full PHPUnit, inspector-scan, the new census `--check`.
- Commit per phase straight to main with explicit pathspecs; `/sgs-update` reseed from HEAD (stage 1 + stage 9) after messaging peers.

## Verification (batched, one pass per phase)
- Editor and frontend at 375/768/1440 on sandybrown: Spacing control on icon, container, button (link toggle, preset pick fills input, typed value flips to Custom, unit switch, inherited placeholder on Tablet/Mobile, stored shape unchanged); a fixture page of icons in every shape, border on/off, fill on/off, brand mode, sizes per device.
- Bound blank key: no `.sgs-icon` in the visitor DOM, editor notice shown; filled key: href prefix correct (`https://`, `tel:`, `mailto:`, WhatsApp, Maps).
- Hover flip computed colours on a linked icon; axe on footer and drawer; 44px targets.
- Eye Care footer and drawer against the draft (`scripts/parity/draft-live-walk.mjs`) after 79 agrees the deploy slot.
