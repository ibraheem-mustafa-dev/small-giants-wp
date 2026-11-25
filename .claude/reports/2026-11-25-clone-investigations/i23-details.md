# i23: details behind the inspector proposal

Read-only. Nothing was saved: the editor runs aborted every non-GET REST call, and the 5 empty auto-drafts they created (ids 6058 to 6062) were deleted by id (a re-scan found none). Scratch, scripts, JSON and screenshots: `E:\sgs-tmp\general-cloning\investigate\i23-details\` (`tp.py`/`tp-final.json` item 1; `markers.mjs`/`markers.json` item 2; `switch.mjs`, `targets.mjs`, `switch.json`, `targets-sgs-*.json` item 6; `shots\`). Live runs use the canary (older build); the files cited are unchanged on `main` for these panels. Static counts are from `main`.

## Short answers

1. Of 98 `ToolsPanel` tags, 30 are reset-only and 68 standard. All 61 media "Panel options" menus are reset-only. PROVEN.
2. Markers sit beside a label only when the mount passes a visible label. Three cases put them above (below). Only media panels draw markers on a panel title. A fresh `sgs/trust-bar` shows 6 markers today (defaults already count), `sgs/container` 0. PROVEN.
3. (a) The question block already has a media-atom Width for option pictures, so "Picture size" duplicates it; the flow root has no equivalent. (b) "Section ground" pairs two palette colours the picker already offers as swatches: keep, move into Colour. (c) "Marker icon" is already in the submenu panel, not Row extras. PROVEN.
4. 22 duplicate "Colour" panels come from two shared components; fixing those two dissolves them into the main Colour panel (Bean's 2026-09-07 rule). Four cases need your call.
5. Yes, one "Button style" panel with a Button 1 / Button 2 switcher, after extracting a shared switcher.
6. Motion lists every declared part whatever the panel or instance: 11 targets on a fresh testimonial (5 drawn), 26 on a fresh product card (5 drawn). Rule: list parts that have settings in that family and are drawn, plus any that already hold a value.

## 1. Three-dots menus

Test (yours): a `ToolsPanel` whose items are all `isShownByDefault` offers only reset in its menu. `tp.py` parsed every `<ToolsPanel>` tag under `plugins/sgs-blocks/src` (98 tags, 71 files) and each `<ToolsPanelItem>` flag; I read by hand the 15 panels whose items sit in SGS helpers (`Item`, `BoxItem`, `ThumbItem`, `Row`, `ScrimControls`, `SurfaceGroundControls`, `StepSettingsPanel.js::item`).

| Class | Panels | Owners |
|---|---|---|
| Reset-only | 30 | 17 |
| Standard (at least one optional item) | 68 | 47 |

Reset-only (30): accordion "Answer slide", "Filter settings"; before-after "Frame styling"; button "Hover effects"; card-grid "Hover Effects"; image-sequence "Responsive frame sources"; label and text "Typography"; mega-panel "Drawer hover effects"; site-header "Layout"; testimonial "Review line"; buybox 8 panels titled "Settings" (`ConfiguratorPanel.js`, `ConfiguratorLookPanel.js`, `inspector-extra.js`); form "Focused field", "Floating label", "Label marks", "Upload zone spacing", "Upload zone icon holder"; nav-drawer-menu "Mega panel padding", "Submenu link padding"; google-reviews (`panel-kit.js::Section`, all `Row` items default, 6 mounts); trustpilot-reviews "Reviews (inline)" (no items at all); shared `RowScrollBehaviourControls` and `SvgPartsControls`. 11 hold one item. Per-panel flags: `tp-final.json` (field `k`).

Look reset-only but are standard: every panel mounting `ScrimControls` or `SurfaceGroundControls` (cart, modal, product-search, gallery "Lightbox backdrop", container "Surface", nav-drawer "Surface", nav-bar-menu "Dropdown backdrop", mega-panel "Panel") and form "Progress steps".

SGS media "Panel options": `src/components/media/panels/MediaPanels.js::MediaPanels` renders it first in every media `PanelBody` that has rows, with one item ("Reset this panel"), so 100% reset-only. Live: 61 menus in 24 blocks (i11 report).

Consequence: the 61 media menus change in one component; the 30 reset-only `ToolsPanel`s need a per-panel edit or one wrapper in `components/primitives`; the 68 keep core's menu. UNPROVEN: core's header offers reset only through the menu, so the wrapper must draw its own header row or use a plain `PanelBody` with a Reset button shown when a value is set.

## 2. Device markers

Cause: `src/components/ResponsiveOverride.js::ResponsiveOverride` renders a header row: label span (only if `label` passed) then dots (`ResponsiveOverride.css`, flex, gap 6px). 360 mounts: 206 pass a label, 154 do not (76 files).

| Case | Result | Cause |
|---|---|---|
| A. Visible label passed | Right of the label, same row | label then dots |
| B. No label passed (154 mounts) | Alone on a line above the control's own label | header holds only dots; `SgsBoxControl` and core `FontSizePicker` draw their own label below |
| C. Label passed but hidden | Alone above the field's own label | `PanelRow.css` clips the override's label in `.sgs-media-panel__row--responsive` (`PanelRow.js::WRAPPED`, 8 field kinds) |

Live (`markers.json`, computed styles): fresh trust-bar has 21 override wrappers (16 label visible, 3 none, 2 clipped); fresh container 28 (23, 3, 2). Screenshots: `i11-editor-ui\shot-1a-...png` (A), `shot-1b-...png` and `shot-1c-...png` (B).

Always on the label row: make `ResponsiveOverride` own the visible label everywhere. (1) B: pass `label` at the 154 mounts (detector-led codemod) and hide the inner label; `SgsLengthControl` already reads `ControlLabelContext`, `SgsBoxControl` needs the same, core `FontSizePicker` cannot hide its header by prop (use an SGS size control or one CSS rule). (2) C: invert `PanelRow.css`. (3) Gate: fail a mount without `label`. A CSS-only dots-at-row-end variant collides with `SgsBoxControl`'s link button and `FontSizePicker`'s toggle and is not beside the label text; not recommended. UNPROVEN: needs a build and screenshots at 375 and 1440.

Panel-title markers: `src/components/media/panels/PanelTitle.js::PanelTitle`, called only by `MediaPanels.js`, so only media panels. Meaning: `row-io.js::panelOwnDevices` returns tablet and mobile when any row in the panel has its own Tablet or Mobile value ("Tablet has its own value in <panel>"). Block defaults count (same `isSet`).

Fresh block under "markers even for defaults" (today's behaviour; `markers.mjs`, all panels open):

| Block | Per-device controls | With markers | Markers |
|---|---|---|---|
| `sgs/trust-bar` | 21 | 3 | 6: Layout Columns (tablet 4, mobile 2), Custom column template (`repeat(4, 1fr)`, `1fr 1fr`), Badges Columns (same attribute as Layout's) |
| `sgs/container` | 28 | 0 | 0: `columns` defaults tablet 2, mobile 1 but shows only under the grid layout, adding 2 then |

Across all blocks 10 of 104 show markers on insert (23 in total; i11 `probe-all.json`). "Every control, always" would be 42 and 56 markers: noise. Judgement: keep the value rule with defaults counted; the wrinkle is a fresh trust-bar looking edited.

## 3. Look controls

(a) Choice flow "Picture size". `OptionCardsPanel.js` writes `optionMediaSize` (percent of picture band, 20 to 200, per device), emitted by `includes/choice-flow-showcase.php::sgs_choice_flow_media_size_css` as `--sgs-choice-flow-media-size` on the option `<img>` (showcase layout only). The question block already mounts `MediaElementPanel` for slot `option` with atoms `object-fit`, `sizing`, `shape` (`optionWidth`, `optionMaxWidth`, `optionShape`); the `sizing` Width (`components/media/atoms/sizing.js`) is a per-device width on the picture's box. One picture is sized twice and the two multiply. The flow root declares only `headerLogo`, so no atom equivalent exists there. Recommend: remove the question's "Picture size" after a WP-CLI sweep copying `optionMediaSize` into `optionWidth` (FP-14, no legacy fallback); keep the root control as the flow-wide default until flow-level item-slot defaults exist. UNPROVEN: pixel equivalence (the atom's range, cropping above 100%); compare widths at 375, 768, 1440 first.

(b) Container "Section ground". A closed panel with one toggle (`ground` = `section`) adds `sgs-container--ground-section`; `container/style.css` then sets, at zero specificity, background `--wp--preset--color--section` and text `--wp--preset--color--section-text`, so any explicit colour wins. Spec 32 FR-32-14: `section` defaults to the `surface-alt` value, `section-text` to `text`; every snapshot carries both. So yes, it is the site's section background, paired with its text colour. The picker offers them: the canary editor palette (35 swatches) includes `section` and `section-text` (`switch.json`). The toggle adds the one-click pairing and zero specificity. Recommend: keep, and move it into Colour beside Background colour (`SgsColourPanel` rows take an `after` node). Removing it loses the paired text colour and changes any container saved with `ground: "section"`; none in the repo, live pages not queried (UNPROVEN).

(c) Nav-drawer-menu "Marker icon". Not in Row extras: `shared/nav-menu-panels/SubmenuItemsPanel.js` ("Submenu: Items") holds it (`sublinkMarkerIcon`) plus four help paragraphs. Moving it to Row extras would put a submenu control into a top-level-row panel. Row extras holds: Ornament (Leading ornament, Ornament icon, icon on hover and Remove, size, Space after, reveal, Reserve space at rest, Play frame sequence, Time per frame); Expander (icon, turn when open, size, Gap from label, opacity at rest and hover, turn time and curve, circle size, border, shadow and glow, "Same circle round trailing icons"); Item image (Off or Featured image, Image shows, width, height, corner radius). Recommend: keep Marker icon in the submenu panel and fold "Submenu link padding" into it.

## 4. Repeated titles: dissolve

Main finding: `components/button-kit/BuiltinButtonPanelBody.js` and `components/carousel-dots/CarouselDotsPanelBody.js` each mount their own `SgsColourPanel`. Button kit: account 5, buybox 2, choice-flow 6, container 1, gallery 1, product-card 2, product-search 1, testimonial-slider 1 = 19; carousel dots: container, gallery, testimonial-slider = 3; total 22. `SgsColourPanel.js`'s docblock records Bean's rule (2026-09-07): every fill, text and link colour lives in the one shared Colour panel (border, overlay and shadow colours excepted). Kit rows already carry a `heading`. Fix in two files: export the rows as helpers and let each block pass them to its main `SgsColourPanel`. Cost: panels grow (account 60 to 70 rows, choice-flow 16 to 28, product-card 24 to 28).

| Block | Duplicate | Holds | Belongs in |
|---|---|---|---|
| account, buybox, choice-flow, container, gallery, product-card, product-search, testimonial-slider | Colour (22 in all) | Background and Text per button; Dot and Dot border per carousel | Main "Colour", headed pairs |
| buybox | (extra) "Add to cart button" vs kit "Add to Cart button" | show price, cart icon, hover lift | Kit panel (titles differ only by case) |
| choice-flow | Layout x2 (Settings) | Outer max-width and Padding; the one-control flow layout select | One "Layout": move the select into the first |
| gallery | Layout (Settings) and Layout (Styles) | Layout type, Columns, Items shown; Gap, padding, margin, widths, wrapper border | Needs your call (below) |
| heading | Effects | Box shadow only | "Border" (no Shadow panel) |
| text | Effects | Box shadow only | "Background", nearest; judgement |
| button | Effects | Keyboard focus style plus preview (`focus-style.js`) | "Keyboard focus" (`extensions/focus-rests.js`); universal, needs a slot; cross-tab |
| hero | Hover | `transitionDuration`, `transitionEasing` | Motion "Hover" timing; flagged |
| nav-bar-menu, nav-drawer-menu | Effects | Magnetic hover pull and strength | Existing "Item effects" |
| responsive-logo | Media x2 | Light and dark logo slots | Flagged |
| message-preview | Boxes | Settings: Group name, Add a box. Styles: height, width, radius, border | Settings pair into "Layout and saved note" |
| option-picker | Label | Settings: text, Show label. Styles: typography | Settings pair into "Options" |
| trust-bar | Badges | Styles Columns, same attribute as Layout's | Delete the copy |

Where dissolving is wrong or open:
- responsive-logo: two different slots, each needing its own media panels; dissolving needs a multi-slot panel mode that does not exist. The built answer is `MediaElementPanel`'s `label` prop (before-after and testimonial use it), a title change you rejected. Leave it or accept a slot label here.
- hero Hover: the motion Hover panel's state timing also drives colour transitions, but hero's pair drives colour hover when no hover layer exists. Check that first, then sweep the attributes; unchecked, hover timing on existing heroes could change.
- gallery Layout: either Gap and box controls go to Settings, or Settings' three controls go to Styles; Styles has no Spacing or Border panel. A tab-placement call.
- text box shadow and button focus style have no clean home (button needs a new slot).

## 5. Product card button looks

`product-card/edit.js` mounts `<BuiltinButtonPanel prefix="cta">` and `prefix="cta2"` (`block.json` `supports.sgs.builtinButtons`). Each renders `BuiltinButtonPanelBody.js`: a colour panel, then one `PanelBody` holding style (preset, seeded by `ctaPresetSeed`), width, size, minimum height, alignment, padding, border, shadow, hover lift and a nested Typography panel. Prefix is already a parameter. Button 2 exists when `cta2Text` is non-empty (`render.php`); Button 1 follows `showCta` in bound mode.

`layers/TargetRow.js` cannot host them (it lists `supports.sgs.elements` with motion dots). `TypographyTargetSwitcher` (private in `TypographyControls.js`) fits the shape (`targets: [{ key, label, prefix }]`, segmented up to 3, select beyond) but renders typography fields only. Recommend one "Button style" panel (Styles) with a Button 1 / Button 2 switcher: (1) dissolve the colour panels (item 4); (2) give `BuiltinButtonPanelBody` a `bare` mode and a host with the switcher; (3) extract the switcher half of `TypographyTargetSwitcher` into the shared switcher, listing Button 2 only when `cta2Text` is set. Keep the Settings "Buttons" panel. UNPROVEN: nested Typography panel state across a switch (key it on the prefix).

## 6. Element switcher

Live lists on fresh instances (`switch.json`, `targets-sgs-*.json`):

| Block | Declared parts | Motion Target (Hover, Entrance, Effects: same list) | Typography "Editing" |
|---|---|---|---|
| `sgs/testimonial` | 12 | 11: Whole block plus Quote text, Reviewer name, Name and date line, Reviewer role, Organisation name, Avatar image, Organisation logo, Work media, Rating, Summary phrase | 2: Quote text, Reviewer name |
| `sgs/product-card` | 34 | 26, including "Description colour" and "Price note colour" | 8: Title, Description, Tag, Price, Price note, Pill, Brand overlay, No-photo label |

Facts (PROVEN, `components/motion/TargetPicker.js::targetOptions`): motion lists `supports.sgs.elements` minus `motion:false`, minus wrappers (unless holding a layer), minus parts whose `availableWhen` kind is off screen, identically in all three panels. The typography list is hand-written per block (`targets` in each `edit.js`), not derived from `elements`: testimonial lists 2 of 7 text-cluster parts. "Description colour" and "Price note colour" are alias parts (no settings) resolving to the same element as "Description" and "Price note", so one element is listed twice.

No target on these blocks has an empty panel (9 to 10 hover states, 20 entrance effects, 8 to 17 effects), so "no options in that panel" does not hold for motion here; the faults are aliases and undrawn parts. Drawn check (a part's `block.json` selector matched inside the block in the canvas): testimonial 5 of 12 drawn, 5 listed targets undrawn (Name and date line, Organisation logo, Work media, Rating, Summary phrase); product card 5 of 34 drawn, 21 listed targets undrawn (Image, Price, RRP, Tag, Rating, Brand overlay, Saving badge, Wishlist heart and more). Selecting an undrawn target does nothing on the canvas.

Rule (recommended over list-all-and-mark): list a part in a family's switcher when (1) it has at least one setting in that family and (2) it is drawn in this instance; (3) a part already holding a stored value stays listed, marked "not shown here" (the exception `targetOptions` already makes for `held` and `notInMode`). Reason: on a product card 21 of 26 motion targets would be greyed noise.

Deciding data:
- Settings in the family (static): `supports.sgs.elements[part].attrMap` by CSS property (`css:box-shadow*` Shadow, `css:border-*` Border, `css:font-*`, line-height, letter-spacing Typography), on 757 of 899 declared parts; `clusters` on 898. Motion has no attribute map: use `motion !== false`, not a wrapper, and drop alias parts (no `attrMap`, empty `clusters`, same selector as another part).
- Drawn: declared data covers part: `availableWhen` (24 parts), `absentIn` and `absentWhy` (157 parts), `supports.sgs.motionDelegate`. Attribute-driven absence (price off, no rating, no secondary button) has none. Use the canvas test I ran: the part's selector (`motionSelector`, else `selector`, else `sgs-<slug>__<part>`, as `canvas/resolve-target.js` does) matches inside the selected block. UNPROVEN: server-rendered blocks that paint late may need a re-check, and the numbers are typed-mode fresh instances.

## Calls I made

- Classified `ToolsPanel` panels from source (helper-wrapped ones by hand); one-default-item panels count as reset-only. No live pass over every `ToolsPanel`.
- Read "markers even for default values" as today's rule (block.json tablet or mobile defaults count as own); gave the "always" ceiling for contrast.
- Put each duplicate colour pair into the shared Colour panel on the strength of Bean's 2026-09-07 rule; named the nearest panel and marked judgement where no clean home exists.
- Used the canary's older build for live lists; chose `sgs/testimonial` and `sgs/product-card` for item 6.
- Deleted only my 5 empty auto-drafts (ids 6058 to 6062), by id, after checking each.
