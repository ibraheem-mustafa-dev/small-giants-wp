---
title: One icon block (sgs/icon) + sgs/social-icons rebuilt as its wrapper + a rebuilt Spacing control
project: small-giants-wp
created: 2026-10-08
status: Phase 1 code shipped 51afe6807 (live check pending, F3 open); adversarial council run 2026-10-08 (GO, revisions applied below); Phase A next
---

# One icon block (sgs/icon) + sgs/social-icons rebuilt as its wrapper + a rebuilt Spacing control

## Context
`sgs/social-icons` is a poorly built scoped copy of `sgs/icon`. Bean wants `sgs/icon` to be the one icon block, with social-icons' code deleted and its name reused for a thin wrapper built like `sgs/multi-button`: real `sgs/icon` children, group defaults on the parent, children filled from Site Info (socials and contact: call, email, map). Bean's list also covers the shared Spacing control (`SgsBoxControl`) every block's padding/margin uses. Outcome: one icon block Site Info drives (a blank link hides, a brand colours itself), a Spacing control that looks and behaves like core's with theme-preset defaults, and the Eye Care footer and drawer rebuilt on it. The 2D research (market: icon size + shape padding) is in `~/.claude/memory/research/2026-10-08-icon-shape-padding-controls.md`; Bean chose icon size + shape size.

## Bean's decisions (2026-10-08)
- **D1 Spacing default:** an untouched side's default is a theme spacing PRESET (the one nearest the block's current measurement). The dropdown preselects that preset's name and the value box beside it shows its measurement, untied: typing flips the dropdown to Custom. A client re-scales by reassigning the default to another size or by changing the theme's spacing scale. **Mechanism (council C1):** the preset is declared, never stored: `block.json::supports.sgs.spacingDefaults` names it per attribute and side, the stylesheet paints it as the last fallback, and the control shows it preselected through its existing `inherited` display. The attribute default stays `{"desktop":{}}`, because an object default is written into a block on its first save and would freeze the preset there.
- **D2 Shape list:** square/rectangle (the only shape with a radius control), circle, pill, then custom outlines with no radius: hexagon, diamond, octagon, blob (a fixed list). Custom outlines are an inline SVG behind the glyph (fill = background, stroke = border), painted through CSS classes and custom properties, stroke inset by half its width; gradients apply to box shapes only.
- **D3 Icon-to-edge space:** icon size + shape size (width and height, linked by default; circle and custom outlines use width only), both per device, each a theme preset or any unit; icon centred. The block's Spacing padding/margin are space OUTSIDE the shape.
- **D4 Social row:** `sgs/social-icons` keeps its name; every line of its current code is deleted and it is rebuilt as a thin wrapper of `sgs/icon` children that fills itself from Site Info: the 8 socials plus phone (call), email and address (map).
- **D5 Brand colours (Bean's item 2F):** brand colours are the default for an icon bound to a brand's Site Info key or showing a brand glyph; a colour the client sets wins. A brand colour that fails 3:1 against its ground falls back automatically (white glyph on a brand disc when that pair passes, else the theme colour).

## Coordination
- Session small-giants-wp-79 owns `header.tree.json`, `mobile-menu.tree.json`, google-reviews and google-rating-badge; it was not live on 2026-10-08 21:40. Before Phase C (the drawer) or any eye-care-test deploy, reseed or Solve: `ListAgents`, message any live owner, and leave another session's uncommitted edits in place.
- Deploys: `build-deploy.py` builds at HEAD in isolation, so a peer's uncommitted edits never ship; message live peers before a deploy or reseed.

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
| F17 | Site Info is decided by key, not by the attribute it fills | `class-sgs-site-info-binding.php::is_url_field` (`URL_KEYS = ['email','phone']`): phone bound to text renders `tel:…`; adding address would turn every text address into a link |
| F18 | Editor has no Site Info values | `src/bindings/index.js::getValues` returns '' for every key; `icon/edit.js` has no server render, so it cannot show a bound value or know it is empty |
| F19 | A bound link's edits are thrown away | the `sgs/site-info` source has no `setValues`; `icon/edit.js` link popover still offers the URL field when `metadata.bindings.linkUrl` is set |
| F20 | CSS injection path in the icon's scoped style | `icon/render.php::sgs_icon_css_length` is defined but never called; sizes reach `$scoped_css` behind `wp_strip_all_tags` only, which leaves `;` and `}` |
| F21 | Icon fallback name is the glyph slug | `icon/render.php` `$accessible_label` falls back to `$icon_name` ("message-circle"); emoji to "icon" |
| F22 | WhatsApp digits become a dead link | Site Info stores socials through `esc_url_raw`, so `07700 900123` becomes `http://07700…`; `whatsapp:` is not an allowed protocol |
| F23 | A third WhatsApp glyph exists | `includes/helpers-brand-glyphs.php::sgs_whatsapp_glyph_svg` (whatsapp-cta, choice-flow) beside `social-icons/brand-icons.php` |

## Phase 1: Spacing control (`src/components/SgsBoxControl.js`, 75 bundles inherit it) — code shipped `51afe6807`
Done: header line holds the label and core's small link button; side/corner icon per row; names-only preset select + value box showing the preset's size; typing flips to Custom; Custom from Default stays on Custom (F1); no slider beside presets. `tests/js/sgs-box-control.test.js` (7 cases, negative control proven).
Open: F3 (gap above labels) is fixed only after a live read proves which rule removes it.
**Done when:** on sandybrown at 1440 the icon, container and button Spacing panels show the new layout, a preset pick stores `var(--wp--preset--spacing--x)`, a typed value stores a length, Tablet shows the inherited placeholder, zero console errors; F3 fixed and read back.

## Phase A: sgs/icon becomes the one icon block (everything the Eye Care footer needs, plus the full control set)
Order inside the phase: cheap fixes first, then the shared pieces, then the block.
1. **Cheap fixes:** `SITE_INFO_FIELDS` lists all 8 socials plus phone, email, address (F12); `get_value` decides prefixing and hints by the attribute (`$attr`), never by the key: a link attribute gets the prefixed URL or '' (never the hint), a text attribute gets the plain value (F11, F17); tests for each.
2. **Value normalisers (F22, Support/a11y):** per key, in `Sgs_Site_Info_Binding::prefix_url_for_key`: phone → `tel:` + digits, '' when no digits; email → `mailto:`; WhatsApp → `https://wa.me/<digits>` from a number or a wa.me URL (reuse migration 0003's digit rule); Instagram/TikTok/X → handle or URL; others gain `https://` when missing; address → `maps_cid` URL when set, else `https://www.google.com/maps/search/?api=1&query=` + `rawurlencode` of the address with `<br>` → `, ` and tags stripped. Every output passes `esc_url` with the default protocol allowlist. PHPUnit hostile suite: `javascript:`, `data:`, CRLF, bare number, empty tel, Unicode and `& # ? " <script>` addresses.
3. **Binding helper (C3):** `includes/helpers-site-info-binding.php::sgs_bound_site_info_key( WP_Block $block, string $attr ): ?string` reads `parsed_block.attrs.metadata.bindings[$attr]` (source `sgs/site-info`) and returns the key; render.php tests `Sgs_Site_Info::get( $key )` raw. Tests: visitor, logged-in admin on the front end, REST `context=edit`, each with a planted negative control.
4. **Editor Site Info data (F18, C4):** `Sgs_Site_Info_Binding::publish_editor_data` adds `sgsBlocksData.siteInfo` (for `current_user_can('edit_posts')`): each key's prefixed URL and a filled flag; `getValues` returns them. Values refresh on editor reload; the notice says so.
5. **Shared registries (Cynic C10, F13, F14, F23):** one JSON file per list, read by PHP and imported by webpack: `includes/data/brand-registry.json` (per brand: glyph SVG, colour, Site Info key, auto label) and `includes/data/icon-shapes.json` (Phase D paths). `helpers-brand-glyphs.php` becomes the one PHP reader; whatsapp-cta and choice-flow read it; `social-icons/brand-icons.*` and `$platform_brand_colours` are deleted in Phase B.
6. **Attribute model (`icon/block.json`):**
   - Colour, border and spacing defaults are '' / `{}`; theme roles are the stylesheet's last fallback: `color: var(--sgs-icon-colour, var(--sgs-il-colour, var(--wp--preset--color--primary)))`, background `background`, border `primary`; hover flips (icon → `background`, shape → `primary`, border → hover shape colour). The child prints a custom property only for a value the client set, so the wrapper's group defaults can win (C2).
   - `shape`: `square | circle | pill | hexagon | diamond | octagon | blob` (default `square`); `showBackground` boolean (default `false`): the background on/off switch (Spec-Lawyer); `backgroundShape` and `backgroundPadding` removed.
   - Border through `SgsBorderControl` + `sgsBorderPreview` + `sgs_border_element_decls` (template `responsive-logo`); radius control shown for `square` only; switching shape away from square clears radius.
   - `iconSize` becomes a per-device object (number → `{desktop,tablet,mobile}`); `shapeSize` per device `{width,height}`; unset shape size = icon size + 2 × `var(--wp--preset--spacing--20)`.
   - `iconFill` boolean (fills a stroke glyph with the icon colour; brand glyphs are already filled and ignore it).
   - `colourMode` `inherit | theme | brand` (default `inherit`; resolves to brand per D5 when a brand is detected). Precedence per colour slot: the child's own value, the wrapper's `childIcon*` value, brand (when brand applies), theme fallback. Brand mode: background = brand colour, glyph white (or the D5 fallback), border = brand colour; hover swaps glyph and background.
   - `supports.sgs.elements` attrMap rewritten for the new names; DB reseed (stage 1 + stage 9).
7. **Render safety (F20, a11y):** every length goes through an allowlist (`^\d+(\.\d+)?(px|rem|em|%)$` or `var(--wp--preset--spacing--[a-z0-9-]+)`, clamped) before `$scoped_css`; colours through `sgs_colour_value`; PHPUnit with hostile strings. A linked icon's `<a>` is at least 44 × 44px with the shape centred; focus ring on the `<a>`; `prefers-reduced-motion` zeroes the hover scale; forced-colours keeps the shape visible.
8. **Hide when empty (F10):** a link bound to Site Info that resolves empty renders nothing for visitors. In the editor the icon shows dimmed with a permanent badge "Hidden on your site: WhatsApp is empty in Site Info" and a link to the Site Info page (F10, Support).
9. **Bound link UI (F19):** when `linkUrl` is bound, the link popover shows "Linked to Site Info: Phone" with Unlink instead of the URL field.
10. **Accessible name (F16, F21):** `ariaLabel` override, else the brand registry's label for the bound key ("Call us", "Email us", "Message us on WhatsApp", "Find us on Google Maps"), else a label from the URL scheme; " (opens in new tab)" appended for `_blank`; `tel:`/`mailto:` default to the same tab; an icon-only link with no name gets an editor warning. `ariaLabel` stays a plain attribute (not bound: `get_value` escapes text and would double-escape).
**Done when:** fixture page on sandybrown (new page; never a motion-QA fixture 2103/2109/2113/2603/2740/3037) shows every box shape, border on/off, fill on/off, brand and theme modes, sizes per device, bound filled and blank keys; blank keys absent from the visitor DOM and the logged-in admin front end, badge shown in the editor; hrefs `tel:`, `mailto:`, `https://wa.me/…`, Maps; 44px targets; axe clean; hostile PHPUnit suite green; build + gates green.

## Phase B: `sgs/social-icons` rebuilt as the wrapper, Eye Care footer, patterns, converter
1. Delete every file in `src/blocks/social-icons/`; recreate it: `allowedBlocks: ["sgs/icon"]`; group defaults as `childIcon*` printed as `--sgs-il-*` (multi-button pattern); gap and alignment; `colourMode` group default. Markup: wrapper `role="list"` with an `aria-label` ("Social media and contact"), each child root `role="listitem"` (via `render_block` filter); renders nothing when every child is hidden.
2. Children on insert: a template of bound children built from `sgsBlocksData.siteInfo` in the registry order (phone, email, address, WhatsApp, Facebook, Instagram, X, LinkedIn, YouTube, TikTok, Google). Inspector "Links" checklist: unticking hides a child (kept, re-ticking restores it), ticking adds a missing key at the end, a filled key with no child is flagged; drag in List View reorders.
3. Rewrite to the new attributes: 4 drawer patterns (`drawer-editorial-ghost-list.php`, `drawer-offset-column.php`, `drawer-solid-brand-light.php`, `drawer-split-zone-serif.php`); Eye Care footer `cr-ref-footer-6` (styled to the draft: boxed, 18px glyph, surface-alt/border/text, accent-text hover).
4. Dependants: `class-sgs-blocks.php` (`social-icons-footer` block style re-checked), `sgs-header-ink-helpers.php` (`.sgs-social-icons__item` → child selectors), `site-footer-row/edit.js` slot, `tests/php/BorderElementParityTest.php` + `social-icons--wrapper.json`, `tests/playwright/blocks.spec.ts`, golden manifest, recogniser fingerprints, colour-audit CLI list, `scripts/consistency/*.json` (regenerated), inspector-scan rules 31/33, survey ceilings.
5. Converter (its own step, own tests): `converter/resolvers/array_content.py` turns `core/social-links` into `sgs/social-icons` with bound `sgs/icon` children, matched to Site Info keys by platform (fixed URLs only for platforms Site Info lacks); `block-replacements.json`/`slots.json` checked; the converter's off-enum output check covers `shape` and `colourMode`.
6. Deploy order: on every `TARGETS` site, grep stored content for `sgs/social-icons`, `wp:sgs/icon` blocks with no `backgroundShape` key (they would turn into square-with-background), and `backgroundShape` `none|rounded|outline` plus `backgroundPadding`; rebuild those posts first, deploy, rebuild from the full trees. Read `get_option('sgs_block_defaults')` for `sgs/icon` on each target first.
7. Specs: Spec 36 FR-36-21 (social/contact row = `sgs/social-icons`, a wrapper of bound `sgs/icon` children; bindings stay generic across clients), Spec 02/32/35A/38 mentions, `.claude/rules/colour-emission.md`; `.claude/rules/block-editor-controls.md` gains the Spacing control's contract.
**Done when:** eye-care-test footer shows the bound icons (WhatsApp + Google + the networks Site Info fills), WhatsApp href `https://wa.me/…`, matches the draft at 375/768/1440 (`scripts/parity/draft-live-walk.mjs`), axe clean, 44px targets; whole-tree grep of each removed attribute name in social-icons contexts is 0.

## Phase C: Eye Care nav drawer (with session 79 if live)
The drawer's social row `cr-ref-mobile-menu-12..15` (three icon-only `sgs/button`s: Instagram, Google reviews, WhatsApp) becomes `sgs/social-icons` with bound children, styled to the draft. **Done when:** drawer matches the draft at 375/768 and hides a blank key.

## Phase D: custom outlines (D2)
`includes/data/icon-shapes.json` (hexagon, diamond, octagon, blob; viewBox `0 0 100 100`), inline SVG behind the glyph, `aria-hidden="true" focusable="false"`, fill/stroke through CSS classes, stroke inset by half the border width, `vector-effect: non-scaling-stroke`, `preserveAspectRatio` for width ≠ height; dashed/dotted → `stroke-dasharray`. **Done when:** each outline renders with fill, border on/off and hover in editor and front end at 375/768/1440, focus ring visible on the link.

## Phase E: spacing preset defaults across blocks (D1), detector first (THE-MIGRATION-METHOD)
1. Census `scripts/survey-spacing-defaults.py` (`--survey/--check/--self-test`): every attribute rendered through `SgsBoxControl`, the stylesheet value it falls back to, and the nearest preset: convert to px (1rem = 16px), smallest absolute difference, larger preset on a tie; a difference over 50% is reported. A side stays unset when its current value is `0`, `auto`, `inherit`, a percentage or a layout gutter (container), and mounts without `presets` are listed.
2. `--check` fails a default slug missing from any `sites/*/theme-snapshot.json` spacing scale (sgs-construction, sgs-healthcare, sgs-mosque and sgs-professional have no slug `10`; helping-doctors and indus-foods declare no scale) and a new stylesheet length on a side a Spacing control governs.
3. Settle the shape on sgs/icon first and show Bean in the editor, then apply: `supports.sgs.spacingDefaults` per block, stylesheet fallback `var(--wp--preset--spacing--x)`, control preselects through `inherited`. `sgs/button` keeps its theme button presets (`--wp--custom--button-presets--*--padding`) and is an exemption in the gate.
4. The census reports Eye Care values the snap would move (e.g. 14px → 16px); trees keep measured values where parity needs them.
**Done when:** census `--check` exits 0 on every snapshot; sandybrown spot-check of icon, card and section blocks at 375/768/1440 shows the default preselected and painted.

## Deferred
Nothing in Bean's list is deferred; every item maps to Phases 1, A-E. Bluesky/Threads (Site Info has no keys) is out of scope until Site Info gains them.

## Gates and commits
- Per phase: `npm run build` (PowerShell), `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check`, `check-border-preview-twin.js`, `check-border-width-without-style.py`, `python scripts/check-no-client-names.py --check`, full PHPUnit, inspector-scan, registry parity (JSON read by both PHP and JS: no twin lists).
- Commit per task straight to main with explicit pathspecs; `/sgs-update` reseed from HEAD (stage 1 + stage 9) after messaging live peers.
- Playwright checks batched once per phase, editor and front end at 375/768/1440.
