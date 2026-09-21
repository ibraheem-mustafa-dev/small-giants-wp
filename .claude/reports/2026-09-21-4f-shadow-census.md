# 4f shadow control: multi-layer integration census (2026-09-21, read-only)

All paths under `plugins/sgs-blocks/` unless stated. Counts are from the command beside each.

## 1. JS surface

- **25 `<ShadowControl` mounts in 22 files**: `grep -rn "<ShadowControl" src --include=*.js | wc -l` (25), `grep -rln` (22). Component is 522 lines (`src/components/ShadowControl.js::ShadowControl`); already over the 250-line JS limit.
- **Resting only** (base+colour): `blocks/mega-panel/edit.js`, `blocks/container/components/GridItemDefaultsPanel.js` (prop-wired, no attrNames), `shared/nav-menu-panels/DropdownStylePanel.js` (`shadowAttrKeys('submenuShadow')`), `blocks/site-header/edit.js` (second mount, `shadowScrolled`), `blocks/trust-bar/edit.js` x2 (iconCircle, badgeImage) plus the main one, `components/media/atoms/shadow.control.js`.
- **Resting + hover colour only**: `blocks/container/edit.js`, `blocks/hero/edit.js`, `blocks/physics-canvas/edit.js`, `blocks/site-header/edit.js`, `blocks/trust-bar/edit.js` (main).
- **Resting + hover shape + hover colour** (`{hover:true,hoverColour:true}`): `blocks/button`, `heading`, `text`, `quote`, `before-after`, `card-grid`, `team-member`, `post-grid`, `brand-strip`, `cta-section` (all `edit.js`).
- **Hover only**: `blocks/info-box/edit.js` (`shadowAttrKeys('shadowHover')`), `blocks/testimonial/edit.js`, `blocks/gallery/edit.js`.
- **Internals that break for multi-layer**: `ShadowControl.js::parseShadow` accepts only ONE longhand `[inset] Xpx Ypx BLURpx SPREADpx`; anything else returns null and the builder silently resets to defaults, so the next edit overwrites a stored multi-layer/unitless value. `buildShadow` emits the same single layer. Presets come from `useSettings('shadow.presets')` and seed the builder.
- **No other shadow editor UI.** `grep -rlE "resolveShadow|boxShadow|--shadow" src/utils src/components` gives 4 files: `ShadowControl.js`, `components/colour-variants/fillRow.js`, `components/media/atoms/shadow.js`, `utils/tokens.js`.
- **JS previews**: `utils/tokens.js::resolveShadowPreview` (raw or `var(--wp--preset--shadow--x)`, no colour) and `::resolveShadowPreviewComposed` (appends `colourVar(colour)`, default `rgba(0,0,0,0.1)`). Callers (`grep -rn "resolveShadowPreview" src`): button, container (x2), cta-section, hero, mega-panel, post-grid, team-member, trust-bar (x3). A third, deliberately mirrored copy exists: `components/media/atoms/shadow.js::resolveShadow` + `isRawShape`, byte-parity-tested with `includes/media/atoms/shadow.php::sgs_media_atom_shadow_resolve` (`scripts/tests/test-media-atom-parity.mjs`).

## 2. PHP surface

- `grep -rc "sgs_shadow_value|sgs_shadow_value_composed|sgs_shadow_value_to_drop_shadow|sgs_shadow_decls|sgs_shadow_attr_map" --include=*.php`: 92 hits, 27 files. Definitions: `includes/helpers-tokens.php::sgs_shadow_value`, `::sgs_shadow_value_composed`, `::sgs_shadow_value_to_drop_shadow`; `includes/helpers-colour-variants.php::sgs_shadow_attr_map`, `::sgs_shadow_decls`.
- **Blocks and includes calling them**: `includes/class-sgs-container-wrapper.php` (13), and render.php of trust-bar (6), brand-strip (6), cta-section (4), text, team-member, quote, heading, before-after, card-grid (3 each), testimonial, post-grid, button, site-header (2 each), info-box, mega-panel (1). Also `includes/nav-menu-submenu-css.php`, `includes/sgs-header-float-css.php`, `includes/media/atoms/shadow.php`, `includes/variations/sgs-card-grid-variations.php`.
- **Other `box-shadow` writers** (`grep -rlE "box-shadow" includes src/blocks/*/render.php`: 30 files): hand-built strings in `includes/hover-effects.php` (`sgsHoverShadow`, enum subtle/raised/floating/glow, one JS twin), `includes/helpers-button-style.php`, `includes/nav-menu-submenu-link-css.php`, six `includes/variations/*` files, `src/blocks/tabs/render.php`, `src/blocks/media/render.php`, `src/blocks/mega-panel/render.php` (also a literal `::after` inset box-shadow).
- **`filter: drop-shadow`** (`grep -rn "drop-shadow" includes src`): only ONE attribute-driven site, `includes/nav-menu-submenu-css.php` (via `sgs_shadow_value_to_drop_shadow`, submenu panel). It strips the 4th length by regex on a single layer and cannot express inset or spread. Multi-layer needs a chained `drop-shadow(a) drop-shadow(b)` splitter; inset layers must be dropped or refused. Hard-coded literals with no attribute: `src/blocks/media/style.css` (1), `src/blocks/product-card/style.css` (3).
- Every consumer takes a scalar string; `sgs_shadow_decls` returns `box-shadow:` decls per state (normal/hover).

## 3. Stored shapes

- `python sgs-db.py sql "... css_property LIKE '%shadow%'"`: 28 `box-shadow` attrs, 15 `box-shadow-color` attrs, plus 30 `fxTreatmentShadow` (`fx:treatment-shadow`, a separate treatment system; out of scope but same word).
- block.json (`python` walk of `src/blocks/*/block.json`, 86 shadow-named attrs incl. `bgSvgTextShadow` booleans): all `type:string`, no enum. Defaults: `''` or null, except `sgs/mega-panel::shadow` = `floating` and `sgs/trust-bar::iconCircleShadow` = `subtle`. Colour sibling is `<base>Colour`, hover colour `<base>ColourHover`, hover shape `<base>Hover`. Irregular: `info-box`/`testimonial` `shadowHoverColour`, `gallery` no colour sibling, `container::gridItemShadow` object-guarded (`class-sgs-container-wrapper.php` `is_array` guard).
- Stored values: SHAPE-only `"0px 4px 12px 0px"` / `"inset ..."`, or a bare preset slug. Theme content: `grep -rlE "[Ss]hadow" theme/sgs-theme/{patterns,templates,parts}` gives only `templates/home.html` and `templates/archive.html`, both `className:"has-shadow-sm"`, zero shadow attribute values. So no stored-content migration burden in the theme.
- **Converter**: `scripts/converter/resolvers/outer_box.py::_shadow_token_snap` compares the draft `box-shadow` (whitespace-normalised) to `design_tokens` rows (`shadow-glow/subtle/raised/floating`). Exact match writes the slug; anything else, including EVERY multi-layer and every custom shadow, returns `gap_writer(... NO_DESTINATION)`. It never splits layers, never keeps the raw string, never extracts a colour. Two call sites in that file (root and tier-object path). `resolvers/grid.py` routes `gridItemShadow` scalar the same way. `resolvers/preset_absence.py` uses draft `box-shadow` only as a signal.

## 4. theme.json

`theme/sgs-theme/theme.json::settings.shadow`: `defaultPresets:false`, 4 presets (subtle, raised, floating, glow), each a SINGLE layer with an rgba colour, no spread. No `settings.custom` shadow tokens. WP emits `--wp--preset--shadow--{slug}`. Editor lists them via `useSettings('shadow.presets')` (handles flat or origin-keyed). `design_tokens` DB carries the same 4 under `shadow-*` slugs; the two rosters must stay in step.

## 5. Gates and tests

- `scripts/check-control-helper-parity.py` (`shadow_mount_maps`, `shadow_rule_conformance`, checks [7]): asserts the helper rules reproduce every mount's map. Breaks if attrNames shape changes.
- `scripts/check-dead-controls.js` (`shadow: ['BoxShadow','BoxShadowColour','BoxShadowColourHover']` roster): breaks if new attributes are not counted.
- `scripts/inspector-scan/rules/07-preset-only-shadow.js` (advisory, label heuristic) and its baseline.
- `scripts/tests/test-media-atom-parity.mjs` (PHP/JS byte parity).
- `scripts/converter/tests/test_outer_box_background_shadow.py`, `scripts/converter/tests/test_destination_contract.py`.
- `scripts/colour-codemod/migrate-shadow-mounts.js`: refuses non-plain bindings; a new attr shape needs it re-read.
- `scripts/audit-inline-styling.js --check`, `scripts/check-undeclared-attrs.py`, `scripts/consistency/*` registries (`setting-registry.json`, `attr-role-map.json`).
- `tests/php/TrustBarRenderTest.php` (golden CSS strings containing shadow). No `tests/php/*shadow*` file exists (`find . -iname "*shadow*"`).

## 6. Sanitisation

- Path: `sgs_shadow_value` then `sgs_normalise_css_functional_colours` then `sgs_css_value_has_breakout` then `esc_attr`.
- `sgs_css_value_has_breakout` rejects only `; { } < > " ' \` \\ url( expression( @`. Commas, parentheses, `%`, `/` pass, so a multi-layer list survives.
- `sgs_normalise_css_functional_colours` regex `(?:rgba?|hsla?)\([^()]*\)` converts rgb/hsl (each layer) to hex8. It does NOT touch `oklch`, `color-mix`, `lab`, or any nested-paren colour: they pass through verbatim. That is safe in scoped `<style>`, but breaks if any path ever inlines through `safecss`.
- `sgs_shadow_value_composed` only treats a shape as raw if it matches `^(inset\s+)?-?[\d.]+px` or starts with `inset`. A draft-style `0 2px 4px rgba()` fails that, falls to `sgs_shadow_value`, and passes through whole with the colour attribute ignored (works, but surprising). The composer appends ONE colour to the END of the string, which is wrong for multiple layers (only the last layer would get it).
- `sgs_shadow_value_to_drop_shadow` regex is anchored to one layer.
- JS previews use `/^inset|^-?\d/` (no `0 ` rule; PHP `sgs_shadow_value` has one): a preview/render parity drift already exists.

## 7. Forced-colors

None for shadows. `grep -rlE "forced-colors" src includes assets theme/sgs-theme/assets`: 5 files (business-info, cart, nav-bar-menu, etc.), none mention `box-shadow`. Shadows vanish under forced-colors; any elevation that carries meaning (card edge, panel separation) has no border fallback.

## Risks

1. Parser regression: `parseShadow` resets non-matching stored values; a multi-layer value would be destroyed on first edit unless the parser is rewritten first.
2. Colour composition assumes one colour appended to the string; per-layer colour breaks it in PHP, both JS previews, and the media atom copy (3 twins).
3. `drop-shadow` cannot express spread/inset (nav submenu); needs a layer transform or a documented restriction.
4. 25 mounts and 3 attrNames shapes: any new sibling attribute per state multiplies dead-control risk (D338 silent discard).
5. Converter still gaps every non-preset shadow; a multi-layer editor without a converter path leaves clones at gap.
6. `oklch`/`color-mix` layer colours are not normalised.
7. `hover-effects.php` `sgsHoverShadow` is a parallel slug-only system that must not diverge from presets.
8. Preset roster lives in two places (theme.json and `design_tokens`).
9. Gate roster names (`BoxShadow*`) and helper-parity gate hard-code today's shape.

## Backwards-compatible data model (recommended)

Keep every existing attribute name, type `string`, and meaning. Add NO per-layer attributes.

1. **Shape string may hold N comma-separated layers**, each `[inset] X Y BLUR SPREAD` (colour-free, as today). A single layer is byte-identical to today, so every stored value stays valid. Splitting is top-level-comma only.
2. **Per-layer colour without extra attributes**: the existing `<base>Colour` attribute holds either a single colour (applies to all layers, today's behaviour) OR a comma-separated list parallel to the layers. PHP/JS split it at top-level commas (respecting parentheses), pad with the last colour, and compose `layer_i + ' ' + colour_i`. One colour string still means "all layers", so old content renders unchanged. Layer alpha lives inside each colour (hex8, rgba, or token slug resolved via `sgs_colour_value`).
3. **Elevation preset** = a bare slug (as today). Add new slugs (e.g. `elevation-1..5`) to `theme.json::settings.shadow.presets` and `design_tokens`; presets may be multi-layer since they are self-contained values. Picking one in the control seeds the layer list by splitting the preset value (editable, "a starting point").
4. **One shared parser/composer** (PHP `sgs_shadow_layers()`, JS twin in `utils/tokens.js`) replacing the three copies, with `sgs_shadow_value_to_drop_shadow` mapping per layer (skip inset, drop spread, chain).
5. Hover keeps the same sibling pattern (`<base>Hover`, `<base>ColourHover`); no new attributes.
6. Rejected alternative: JSON-array-in-string. It breaks the raw-string detection in `sgs_shadow_value`, `resolveShadowPreview` and the media atom, and needs a full migration; the comma list needs none.

Order of work: parser + composer helpers and their negative controls, then ShadowControl rewrite (split file under 250 lines), then previews and media atom, then drop-shadow, then converter multi-layer split, then gates and forced-colors border fallback.

## Summary

1. 25 ShadowControl mounts across 22 files, 3 attrNames shapes (resting, resting+hover, hover-only); no other shadow editor UI.
2. 92 PHP helper hits in 27 files; one attribute-driven `drop-shadow` site (nav submenu) needs chained layers; other `box-shadow` writers include `hover-effects.php` and 6 variation files.
3. All shadow attrs are plain strings; theme content has zero stored shadow values; converter gaps every non-preset shadow.
4. Sanitiser passes commas and rgb/hsl (hex-normalised) but not oklch or color-mix normalisation; colour is appended once at the end, so per-layer colour needs a new composer.
5. No forced-colors handling for shadows; gates to update: helper-parity, dead-controls, inspector-scan rule 07, media-atom parity, converter tests.
6. Recommended model: comma-separated layers in the existing shape string, comma-separated colours in the existing colour attribute, new multi-layer slugs in theme.json; zero new attributes, zero migration.
