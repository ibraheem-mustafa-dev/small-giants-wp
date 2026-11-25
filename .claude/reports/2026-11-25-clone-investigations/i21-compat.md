# i21: does the full-shared-package plan lose anything? (hand-built panels, media shadow, switchers, nested sections, three dots)

Read-only. No repo, DB or site change. Two live editor probes on the canary (screenshots in `E:\sgs-tmp\general-cloning\investigate\i21-compat\`: `shot-media-border.png`, `shot-nested-entrance.png`); the 2 empty auto-drafts those probes created (6056, 6057) were deleted again (`cleanup.mjs` there, range limited to those two ids). Paths below are under `plugins/sgs-blocks/` and cited by symbol. PROVEN = read in source or measured live; UNPROVEN says what would settle it.

## Short answers

1. Bean is right in part. Of 23 rows checked (about 30 panels), 7 are the same thing (migrate), 4 are richer or friendlier in a way the shared package lacks (upgrade it first), 10 only share a name (leave alone, rename), and 2 split between (a) and (c). `sgs/media`'s border panel is richer in four concrete ways (corner shortcuts, 9 border styles, greyed-out-with-reason rows, a shape picker). The controls inside it are already the shared ones; the richness is in the shell. PROVEN.
2. `sgs/media`'s shadow already uses the shared `ShadowControl`; what is special is the output. On a masked shape the media emitter prints `filter: drop-shadow()` on the node outside the mask. The shared shadow output cannot do that today, so migrate the control (already done) but not the output until the shared package gains a drop-shadow mode. PROVEN.
3. Typography's element switcher and the motion Target row are two separate implementations of one pattern, not one shared component. A shared switcher fed from `supports.sgs.elements` can serve typography, motion, shadow and border. Recommend it for border and shadow on blocks with two or more such elements, and a plain panel otherwise. This partly overturns Spec 35 A4 (element-first panels), so it needs Bean's yes. PROVEN (counts below).
4. Nested collapsible sections work today: SGS already nests a `PanelBody` in three places. It looks heavy (a box in a box, controls 32 px narrower). A light `SgsInnerSection` is a CSS variant of `PanelBody`, not a new library. The existing check does not stop it. PROVEN for "works" and the measurement; UNPROVEN for "looks right" until the CSS variant is built and screenshotted.
5. Replacing `ToolsPanel` is a codemod plus one shared item component, but 461 of 491 `ToolsPanelItem`s are hidden behind the three dots by default, so their replacement (a collapsed inner section) must come first. No shared per-control reset exists today. PROVEN.

## 1. Hand-built panels against the shared packages

What the shared packages offer (PROVEN, source):
- Layout: `blocks/container/components/LayoutPanel.js::LayoutPanel`: Layout type (Default, Flex, Stack, Grid), Columns per device, Gap, Align items, Flex direction (one value, not per device), Flex wrap (per device only when `enableFlexWrapTier`), Justify content, then Advanced grid (custom column template, row template, auto rows, justify items, align content), opt-in intrinsic columns and column-shape picker. No min height, no plain-English labels.
- Width: `WidthPanel.js::WidthPanel`: outer max-width per device as a free length, content band (normal, wide, full, custom length).
- Border: `components/SgsBorderControl.js::SgsBorderControl`: width per side per device, style (3 icon buttons: solid, dashed, dotted, in `BorderStyleControl.js`), colour with Normal/Hover tabs and gradient, contrast check, token-slug storage (`linked`), radius per device with inheritance cue. The PHP side (`includes/helpers-border-style.php::sgs_border_style_allowed`) already accepts 9 styles (none, solid, dashed, dotted, double, groove, ridge, inset, outset), so only the control is narrower than the output.
- Colour: `components/SgsColourPanel.js::SgsColourPanel`: rows of fill, text and link colours with states and gradients.

Class key: (a) same, migrate. (b) richer, upgrade shared first. (c) different thing with a shared name, leave and rename.

| Block / panel | What it holds | Class | Why, and the extras for (b) |
|---|---|---|---|
| `sgs/media` Border and shape (`components/media/atoms/shape.js`, `panels/component-map.js`, `panels/adopted-fields.js::RadiusField`) | Shape picker, corners, border width, style, colour, padding, surface colour | (b) for corners, width, style, colour; (c) for the shape picker | See section "media border" below |
| `feature-grid` Layout | Layout mode (auto-fit with min item width, or fixed columns) and Columns | (a) | Same as the shared panel's intrinsic columns (`enableIntrinsicColumns`, `minColumnWidth`) and Columns. The block already mounts the shared panel with `showLayout={false}` beside it. Needs an attribute rename (`layoutMode`, `minItemWidth`) |
| `gallery` LayoutSettingsPanel | Display mode (grid, masonry, swipe row, carousel), swipe-row options, columns, items shown | (c) for the mode and swipe options, (a) for Columns | A gallery's display mode is not a container layout. Rename "Display mode". Gallery also mounts the shared panel |
| `post-grid` PostGridLayoutPanel | Layout radio, Columns, Keep empty columns | (c), columns (a) | Layout here chooses how posts are shown, not how children are arranged |
| `trustpilot-reviews` Layout | Variant, Columns, Theme, Card style | (c), columns (a) | A widget style picker. Rename "Widget style" |
| `google-reviews` Inner | Columns only | (a) | One range control wrapped in `ResponsiveOverride` |
| `brand-strip` Layout | Columns, Logo layout (tiles or row), logo max width, resting opacity | Split: Columns (a); rest (c) | Logo layout is leaf-block behaviour; rename "Logos" |
| `choice-flow-question` Layout | Options layout (cards or list) | (c) | How answers are drawn, not container layout. Rename "Answer display" |
| `wishlist-panel` Layout | Heading, link text, rows shown, empty text, layout, columns, row gap | (c), columns and row gap (a) | Mostly content settings under a layout title. Rename "Wishlist display" |
| `trust-bar` Badges | Columns | (a) | Duplicate of the Layout panel the block already mounts, and the block's `showBadgeGrid` canvas override adds a third path. The Columns control is dead where a column template is set (i8, cited in i16). Migrating also fixes that |
| `hero` Alignment & grid, Grid & flex settings | Flex direction, wrap, justify content/items, align content, row template, auto rows; plus Split layout (column ratio preset and custom ratio, stacking order) | (a) for the flex and grid half; (c) for Split layout | The grid half is a copy of the shared Advanced grid. Column ratio and stacking order are hero-only; keep as "Split layout" |
| `site-header-row` Layout, Header row, Alignment & grid | Cluster or Columns, Maximum columns, Distribution (Left, Centre, Right, Spread apart), Gap between elements, plus min height, padding, margin, max width, border | (b) | Extras: plain-English labels (Cluster, Columns, Left/Centre/Right/Spread apart instead of Flex, Grid, flex-start), and Min height per device (`RowMinHeightControl` in the block folder, `ResponsiveLengthControl` inside; the shared panel has none) |
| `site-footer-row` Footer row, Layout, Alignment & grid | Same as header row | (b) | Same extras |
| `site-footer-row` Content band | Content width select (full, normal, wide) | (a) | Shared `WidthPanel` is a superset (adds custom length) |
| `multi-button` Layout | Direction, wrap, justify content per device, plus padding, margin | (b) | Extra: Flex direction per device (`flexDirection` is a tier object in `multi-button/block.json`; container declares it as a plain string). Upgrade shared Flex direction to accept a tier object as well as the string, so saved containers keep rendering |
| `container` GridItemDefaultsPanel | Border, radius, padding, background, shadow, text colour for the children of a grid | (a) after a storage change | Same controls aimed at the children. Border is stored as one shorthand string (`gridItemBorder`), which is why it was hand-built. The style list has Double; the shared control lacks it (see extras below) |
| `brand-strip` Tile | Tile padding, radius, shadow, gap, border width (a single px slider), image effect | (a) for the border | Shared `SgsBorderControl` is richer (per side, per device, style, colour). Needs a scalar-to-box conversion |
| `card-grid` Image Overlay | Overlay opacity %, blend mode | (a), probably | The media overlay atom has opacity, blend mode and hover forms. UNPROVEN that card-grid's overlay paints through the media renderer |
| `icon` Icon (Colours) and `social-icons` Icons (Colours) | Select: Automatic, Brand, Brand logo only, Theme | (c) | A brand-colour behaviour switch, not a colour picker. The option list is copied in both blocks (`icon/inspector.js::COLOUR_MODES`); share the list, rename "Brand colours" |
| `option-picker` Appearance | Colour preset (Soft or Solid) and many pill settings | (c) | A look preset, not a colour control. Rename "Pill look" |
| `modal` Modal Settings | Max width presets (Small 480, Medium 640, Large 800, Full) | (c) | Named dialog sizes plus a custom `dialogWidth`. Rename "Dialog size" |
| `trust-bar` Word badge | Badge border width, corner radius, separator glyph | (c) | A glyph between items is not the separators package (i16) |
| `button` Hover effects (weight on hover) | Font weight on hover | (c) | A typography hover setting living in an effects panel. Move it into Typography when that package takes a trim list; not a layout or border copy |

Tally by row: (a) 7 (feature-grid, google-reviews, trust-bar Badges, footer Content band, container grid-item defaults, brand-strip Tile, card-grid overlay); (b) 4 (media border, header row, footer row, multi-button); (c) 10 (gallery, post-grid, trustpilot, choice-flow-question, wishlist-panel, icon and social-icons colour mode, option-picker, modal, trust-bar word badge, button hover weight); 2 split (brand-strip Layout, hero).

### media border: the extras to move into the shared package first

PROVEN by reading source and by the live panel (`shot-media-border.png`: 15 shape thumbnails drawn on the block's own image, an All corners slider with "Set each corner" and "Round", border width with a link toggle, a greyed Border style with the line "Set a border width first", a Border colour swatch, then Padding).

The controls are the shared ones: `SgsBoxControl`, `GradientCapableColourControl` with Normal and Hover tabs and gradients (`panels/component-map.js::Colour`). What makes it feel better is the shell. Four things to upgrade into `SgsBorderControl` and its panel so every block gains them:
1. Corners shortcut: one All corners slider, a link to four separate corners, and a Round preset (`adopted-fields.js::RadiusField`). Shared radius always shows four fields.
2. Nine border styles in a select (`atoms/shape.js::BORDER_STYLES`), against the shared three icon buttons. The PHP allowlist already covers all nine, so this is a control-only change.
3. Rows that grey out with a plain reason instead of staying live: Style and Colour wait for a width ("Set a border width first"), and rows that cannot apply say why (`atoms/shape.js::disclosure`, `panels/reasons.js`). Shared package needs a `disabledReason` per row.
4. A "Reset this panel" action (`MediaPanels.js`), which is item 5's per-panel reset.

Not border features, so they stay in the media package: the shape picker and mask shapes (they make the border vanish, `atoms/shape.js::emit` prints no border when a mask is set), Padding and surface colour, which sit in the same panel only for tidiness.

Where shared is already richer, so media gains by migrating: border width, style and colour per device (`TierBorderControl`, Bean's ruling of 2026-11-21 overturning the old "no per-device border"; media's `BorderWidth` is still untiered, citing the cancelled ruling of 2026-08-29), contrast check, token-slug storage.

Side finding: Spec 35 says `sgs/media` "is radius-private-only and correctly doesn't mount `SgsBorderControl`". The panel now reuses the same inner controls, so that sentence is stale. UNPROVEN whether anything else cites it.

## 2. `sgs/media`'s shadow on masked shapes

How it draws (PROVEN: `components/media/atoms/shadow.js::emit` and PHP twin `includes/media/atoms/shadow.php::sgs_media_atom_shadow_emit`):
- `shapeHasMask( attrs, slot )` is true when a mask shape is set at any device.
- Then the shadow is not a `box-shadow`. The emitter builds the same composed shadow, converts it with `emit/drop-shadow.js::dropShadow` (PHP: `includes/helpers-shadow-filter.php::sgs_shadow_value_to_drop_shadow`) into one `drop-shadow()` per layer, and prints it as `filter` on the surface node. Hover prints the same filter with the hover colour.
- This works because media has two nodes (`emit/core.js::nodes`): the surface (outer) and `.sgs-media-box__mask`. The mask clips only the inner node, so a filter on the outer node follows the cut-out shape.
- The panel side: `adopted-fields.js::ShadowField` shows theme preset chips, then mounts the shared `ShadowControl`, passing `hide=['spread','inset','raw']` when masked (`atoms/shadow.js::disclosure`) and the note "Shadows follow the shape". Spread and inset do not exist in `drop-shadow()`, so they are hidden.

So the media shadow is not hand-built at the control level: it is the shared control with a preset-chip front. Migrating the panel is already done. Migrating the output onto the shared emitter (`includes/helpers-colour-variants.php::sgs_shadow_decls`, box-shadow only) would be unsafe today. What the shared package needs:
1. An output mode per element, `box` or `drop`, decided by a fact the block supplies ("paints through a mask or clip"). The converter already exists in PHP and JS and is also used by `includes/nav-menu-submenu-css.php` (a submenu that scrolls clips its own box-shadow), so two surfaces need it besides media.
2. The filter must go on a node outside the clipped one; the shared emitter needs a target selector for that.
3. The control hides spread and inset automatically in `drop` mode (the `hide` prop exists).
4. Fix an editor/front-end mismatch found here (PROVEN by running the twin): `dropShadow( composeShadow( 'lifted', '' ) )` returns an empty string, because the JS twin cannot read the theme's preset list, while PHP resolves it with `sgs_shadow_preset_literal`. A preset chosen on a masked shape therefore draws on the front end but not on the editor canvas. Fix: have the editor pass the preset literal (`useShadowPresets` already holds them). UNPROVEN as seen by a user until checked on a masked image with a preset chip.
5. Known limits to state in the control note: `filter: drop-shadow()` chains layers one after another, so a later layer shades the earlier layer's shadow and several-layer shadows look different from `box-shadow` (CSS behaviour, UNPROVEN here); no forced-colours outline fallback (the box path adds one); no automatic lift on hover in the mask path.
6. Extend the parity cases (`tests/shared/shadow-compose-cases.json`, `scripts/tests/test-media-emitter-parity.mjs`) with `drop` cases.

Other blocks that could use `drop` mode: any block with a mask-drawn end shape (`includes/helpers-end-shape.php`). UNPROVEN whether any of them also has a shadow.

## 3. Typography, multi-element blocks and a shared element switcher

What exists (PROVEN):
- Typography: `components/TypographyControls.js::TypographyTargetSwitcher`, private to that file. 2 or 3 targets: segmented buttons; 4 or more: a select labelled "Editing". A trailing bullet marks a target with a value set (`targetHasCustomValues`). The chosen target is local state. Targets are an array each block passes at the mount: 39 files pass `targets=`. Each target can carry its own `show*` props.
- Motion: `blocks/extensions/motion/layers/TargetRow.js` using `components/motion/TargetPicker.js::targetOptions` and `ChoiceAtom` (labelled "Target", same segmented-up-to-3 rule, a dot marks a part that holds a layer). The options come from `supports.sgs.elements` in `block.json`, not from the mount. `ChoiceAtom`'s own header says it copies the split from `TypographyControls.js`.
- So the pattern is the same and the code is two copies, with two data sources.

The data source needed already exists. `supports.sgs.elements` is declared on 103 of the blocks and each element's `attrMap` names the attribute for each property (for example `css:box-shadow`, `css:border-width`, `css:font-*`). Counting elements per block (script over every `block.json`):

| Family | Blocks with one or more elements carrying it | Blocks with two or more |
|---|---|---|
| Shadow (`css:box-shadow`) | 41 | 14 (account 8, timeline 5, form 4, accordion 3, trust-bar 3, gift-order 3, and 8 with 2) |
| Border | 78 | 33 (account 17, buybox 7, form 7, cart 6, google-reviews 6) |
| Typography (`css:font*`) | 43 | 25 (form 23, buybox 22, gift-order 6, mega-panel 6) |

Is typography compatible with the trim list and the shared-package plan? Yes. Each target already takes its own `show*` props, so a trim keyed per element fits (`supports.sgs.trim.typography.<element>`). Two things to settle: the target array should come from `supports.sgs.elements` instead of 39 hand-written mounts, and units must default (i16 section 3).

Can shadow reuse the switcher? Yes, once the switcher is one component (`ElementSwitcher`, extracted from the two copies, options from `supports.sgs.elements`, bullet marker from "does this element hold a value"). A block-level Shadow panel then reads `css:box-shadow`, `css:box-shadow-color` and the hover keys under `states.hover.attrMap` for the chosen element. The same works for border and separators-per-element.

Trade-offs of one Shadow panel with a switcher against a shadow control inside each element's panel:
- Gains: one panel per family instead of up to 8 (shadow) or 17 (border) copies; one pattern across typography, shadow, border and motion; the element list stays generated from the block's own declarations; the single-element blocks (27 for shadow) get a plain panel, no switcher.
- Costs: the person must pick the element, and picks it again in every family panel (the selection is local to each panel); a value on an element that is not selected is hidden unless the bullet marker is good; what a client sees on the canvas (a card with a shadow) is no longer one panel away from its other settings.
- Spec conflict: Spec 35 A4 says one element equals one panel holding that element's content and style clusters. Typography is already property-first, so the spec is already out of step with the code; this change makes it consistent.

Recommendation: build `ElementSwitcher` once; use it for Shadow and Border (and keep Typography on it); show the switcher only when a block has two or more elements carrying that family, a plain panel for one; keep element-first panels for the content settings of an element (text, image, link). Optionally share the chosen element across the family panels through one small store (UNPROVEN: needs a prototype to see if it feels right). Amend A4 in Spec 35 to say so (Bean's call, since it reverses a written rule).

## 4. Nested collapsible sections

- Nested `PanelBody` already exists in SGS (PROVEN): `blocks/extensions/motion/EntrancePanel.js` ("Fine-tune", `initialOpen={ false }`, class `sgs-motion-panel__fine-tune`, no CSS of its own), `components/button-kit/BuiltinButtonPanelBody.js`, `blocks/google-reviews/components/WrittenReviewsPanel.js`. No inner-section component exists in `src/components` (searched for Disclosure, Collapsible, details, InnerSection, Accordion: none that draw a panel).
- Measured live on the canary (container, Entrance panel, "Fine-tune" open, `shot-nested-entrance.png`): outer panel 280 px wide; the inner box starts 16 px in, is 248 px wide, has its own 1 px border and 16 px padding; its first control is 216 px wide (the outer controls are 248). So it works, collapsed by default, but looks like a card inside a card and loses 32 px of a 280 px sidebar.
- WordPress components (Context7 on Gutenberg trunk, PROVEN for what is listed): `PanelBody` is the only collapsible in `@wordpress/components`; `ToolsPanel` has no collapse; `Accordion` is not a public export (the private list names Tabs and Menu). `@wordpress/ui` has a `Collapsible` built on Base UI; whether the WP 7.1 editor loads it for plugins is UNPROVEN (settle by `typeof` check on the canary editor, or by `docs` for WP 7.1).
- `scripts/check-nested-panel-title-rule.py` enforces one thing: the CSS rule that hides a nested `ToolsPanel`'s second heading (`.sgs-nested-tools-panel .components-tools-panel-header > h2`) exists once, in `assets/css/inspector-controls.css`, and in no other stylesheet. It limits neither nesting depth nor collapse. A new inner-section style should live in the same shared file, with a matching self-tested check.
- Recommendation: `SgsInnerSection` = `PanelBody` plus class `sgs-inner-section` (no border, no side padding, small title, a dot when a value is set inside, like `components/media/panels/PanelTitle.js`), `initialOpen={ false }` always. One level deep only; add a detector that fails a `PanelBody` three deep (ShadowControl already has its own tabs inside). Would it look right? UNPROVEN until the CSS variant is built and screenshotted at 375 and 1440; the measured default is usable but heavy.
- Background panel: "Background surface" and "Extra SVG layer" are separate top-level panels today (live list on container: Colour, Background surface, Extra SVG layer, Section ground, Typography, ..., Background last). They fit as inner sections. The Background panel loads in a lazy chunk and registers late (i11 section 4), so fold them in only after that panel is mounted eagerly, or they will arrive after the rest.

## 5. The three dots

- Core `ToolsPanel`: 98 `<ToolsPanel` tags in 71 files (static count; i11's live count was 74 panels in 44 blocks), 491 `<ToolsPanelItem`, of which about 187 set `isShownByDefault` and so about 300 sit behind the three-dots menu until they hold a value (grep). The menu has no hide prop (`ToolsPanel` props per Gutenberg docs: `label`, `resetAll`, `panelId`, `dropdownMenuProps`, `headingLevel`, `hasInnerWrapper`, `shouldRenderPlaceholderItems`). Hiding it with CSS would strand the 300 hidden items and "Reset all".
- SGS already has pieces, none generic (PROVEN, searched `components/` and `shared/`): `ResponsiveOverride` shows "Reset to Tablet" and similar per tier, and "Reset to default" on Desktop only when `desktopReset` is set; `components/media/panels/MediaPanels.js` has the 32 px "Panel options" menu with "Reset this panel"; motion atoms have `CustomisedTag` (reset to preset only). There is no shared "reset this one control" component.
- What replacing takes:
  1. `SgsPanelItem` (children plus `hasValue`, `onDeselect`, `label` props, the same props as `ToolsPanelItem`, so a codemod maps all 491 mechanically): shows the control and, when `hasValue()` is true, a small "Reset" text button next to the label that calls `onDeselect`.
  2. `SgsPanel` as a `PanelBody` with a "Reset all" link only when anything inside has a value.
  3. A rule for the 300 default-hidden items: they go into a collapsed inner section ("More options", section 4), auto-opened when any holds a value (core does the same by showing items that have a value). This is why section 4 comes first.
  4. Retire `sgs-nested-tools-panel` (10 uses) and its CSS and check.
  5. Layout change: `ToolsPanel` lays items in a two-column grid with per-item column spans; `PanelBody` stacks them. Check each panel at 375, 768 and 1440 in the live editor.
  6. Detector first (migration-method): a gate that fails a new `<ToolsPanel`, then the codemod over 71 files, then a census of panels that grew past a screen.
- Order: build `SgsInnerSection`, then `SgsPanelItem`, then codemod. The shared panels used by many blocks go first (`shared/nav-menu-panels/ListLayoutPanel.js`, `components/RowScrollBehaviourControls.js`).
- Time: the two components in about half a day; the codemod about a day; the visual pass is the long part.

## Calls I made

- Treated "~20 hand-built layout, border, colour and width panels" as every Layout, Border, Colour and Width row in `d1-hit-list.md` (23 rows once grouped), plus `button` Hover effects and `trust-bar` Word badge from the same list, so nothing was skipped.
- Counted a block's elements from `supports.sgs.elements.attrMap` keys, which are the block's own declarations; I did not check that every named attribute exists on the block.
- Opened the canary editor twice (writes aborted by the harness; two empty auto-drafts, 6056 and 6057, were deleted again). No other site touched.
- Did not test the live look of a lighter inner section, a drop-shadow on a preset chip in the editor, or `@wordpress/ui` availability; each is marked UNPROVEN with what settles it.
- Placed `button` Hover effects (font weight on hover) under (c) as a typography setting, not a copy of the Typography panel; the detector's own note flagged it only by name.
