# i8-editor: the trust bar's editor faults, proven in the real block editor, plus a 104-block panel census

Read-only. Nothing was saved to the site. Every editor run aborted all REST writes except block-renderer reads (the only writes it tried were the user preference write, a post autosave and, for two blocks, a commerce-look CSS write and a WooCommerce checkout write, all aborted). The 17 empty auto-drafts that opening "new page" created (ids 6029 to 6045) were deleted through the REST API afterwards and a re-scan of ids 6000 to 6070 found none left.

Scratch and scripts: `E:\sgs-tmp\general-cloning\investigate\i8-editor\` (census.mjs, analyse.py, summary.py, t2-*.mjs, the JSON outputs and screenshots).

## 0. Read this first: the canary runs an older trust-bar build than the repo

Proven in the browser (t2-front.mjs, `buildCheck`): the canary's `build/blocks/trust-bar/index.js` has the old Overflow help text ("...the editor canvas always shows every badge") and lacks the string "Ticker scrolls them only" that commit 00eac2c01 (2026-11-24) added. A fresh trust bar on the canary reads `overflowMode` as `wrap`, not the repo's `ticker`. So everything below about the editor is what the canary build shows. Two earlier claims that depend on the new code (the canvas previewing the running ticker over every layout choice) cannot appear on the canary and stay UNPROVEN on screen. If Bean looked at another site, that site's build may differ. Deploying the repo HEAD to the canary (or running the census on a mirror that has it) is the first step to settle that.

## 1. Short answers

| # | Bean's observation | Verdict | Root cause | Where |
|---|---|---|---|---|
| 1 | Layout panel broken for most layouts | PROVEN in part. Two of four layout types differ between canvas and front end; Columns is dead; 4 of 11 controls mean nothing on a one-row strip | see 2.1 | shared `LayoutPanel` plus a block default |
| 2 | Overflow panel completely empty | PROVEN | `edit.js` hides its only control whenever the bar carries a stored marquee that is not tablet-or-mobile-limited | block |
| 3 | "Label colour" does not exist | PROVEN: it exists only for two of four styles | `labelColour` paints a part that icon styles never print | block |
| 4 | Label fill colour works only on the homepage star | PROVEN | root-only `fill` rule loses to a path's own `fill` | block CSS |
| 5 | Custom SVG shows as the tick in the editor | PROVEN | editor icon components never read `iconSvg` | block |
| 6 | Separator colour dead; text-only is not text-only | PROVEN | separator is tied to text-only and hidden in grid (the default) | block |
| 7 | Shape divider panel | Canvas: PROVEN absent on trust bar, hero, site footer. Flip and invert: PROVEN dead everywhere. Colour: works (front end and container canvas); looks dead only where nothing renders. Top divider "at the bottom": PROVEN geometry | see 2.7 | shared |
| 8 | Own padding and margin panel | PROVEN identical to 22 other hand-built panels | no shared component | pattern |
| 9 | Background panel last and open, then moves under Colour | PROVEN | lazy-loaded media panel | shared |

## 2. Trust bar, point by point

### 2.1 Layout panel

Method: inserted a trust bar in the unsaved canvas and changed each attribute (t2-layout.mjs), then rendered the same attributes through the block-renderer endpoint and measured the HTML plus its CSS on the live front end at 1440 and 375 (t2-render.mjs). The panel itself (screenshot `layout.png`) shows Layout type Default / Flex / Stack / Grid, Columns, Gap, Align items, then "Advanced grid layout": Custom column template (prefilled `repeat(4, 1fr)`), Row template, Auto rows, Justify items, Align content. Census: 11 controls in grid mode.

| Control | Canvas | Front end | Verdict |
|---|---|---|---|
| Layout type "Grid" | 4-column grid | same | works |
| "Flex" | flex row, wrap | same | works |
| "Default" (empty value) | still a 4-column grid | `display:block`, badges run inline | MISMATCH, canvas wrong |
| "Stack" | still a grid (flex-direction set but ignored) | flex column | MISMATCH, canvas wrong |
| Columns (3, 2) with the template left as is | no change | no change | DEAD |
| Columns after clearing the template | 3 columns | 3 columns (1 on mobile) | works |
| Custom column template | works | works | works |
| Row template, Auto rows | work | work | work, little use on a one-row strip |
| Gap, Align items, Justify items | work | work | work |
| Align content | works only when the grid is taller than its rows | same | no visible effect on a strip |
| Flex direction, Flex wrap, Justify content, Gap (flex) | work | work | work |

Root causes:
- Columns dead: `block.json::attributes.gridTemplateColumns.default` is filled for all three tiers (`repeat(4, 1fr)`, `repeat(4, 1fr)`, `1fr 1fr`), and `includes/class-sgs-container-wrapper.php::SGS_Container_Wrapper::render` lets a non-empty template beat the column count. Proven on both sides. Reach: only the trust bar (I scanned every `block.json`: it is the one block with a non-empty default template).
- Default and Stack wrong in the canvas: `src/blocks/trust-bar/edit.js` computes `showBadgeGrid = isIconStyle && 'flex' !== layout`, so every layout except flex paints as a grid. Block-specific code.
- A second Columns control (Styles, "Badges" panel) writes the same `columns` attribute as the Layout panel's Columns: a duplicate, trust-bar only.

Which cause is shared, which is the block's: the panel is the shared `src/blocks/container/components/LayoutPanel.js`; the two faults above are the block's (default value and canvas preview). The panel shape reaches the Layout type control in 8 blocks (container, trust-bar and the "Container / Wrapper" panel of accordion, card-grid, google-reviews, pricing-table, tabs, trustpilot-reviews) and the Gap-with-split control in 16. The full advanced-grid set (custom template, auto rows, justify items) appears in trust-bar, post-grid, site-footer-row (container has its own variant).

Bean's proposal: a lean panel for the trust bar. The set that is compatible and non-duplicating: Layout type limited to Grid and Flex (Default and Stack are wrong or redundant here), Columns per device (grid only, and it must write the template or clear it so it cannot go dead), Gap, Vertical alignment, Justify content (flex only). Five controls instead of eleven. Drop: custom column template as raw CSS, Row template, Auto rows, Justify items, Align content, Flex direction (a column is "Stack"), Flex wrap (Overflow already decides wrap, ticker or hide), and the duplicate Columns in the Badges panel.

Trimming mechanism: none exists (VERIFIED). `LayoutPanel` takes four opt-in props (`showLayout`, `enableIntrinsicColumns`, `enableColumnShapePicker`, `enableFlexWrapTier`) and none hides an individual control. `supports.sgs.enabledExtensions` is declared in 91 blocks, but `isExtensionEnabled` (`src/blocks/extensions/hide-extensions.js`) is called only by child-sizing, float-position, time-text and the block-link extension. The slugs `layout` (2 blocks), `width` (4), `shapeDividers` (3), `background` (6) gate nothing; `BackgroundPanel.js` no longer reads it, and the docblock in `LayoutPanel.js` that says it does is stale. So a lean panel needs either a new `show`-style prop list on `LayoutPanel` or a small trust-bar-owned panel.

UNPROVEN: the ticker preview hiding every layout choice on a current build (see section 0). What settles it: deploy HEAD, insert a trust bar, read `data-sgs-marquee` on the canvas root.

### 2.2 Overflow panel empty

PROVEN. `src/blocks/trust-bar/edit.js` renders the Overflow panel as `{ ! storedMarqueeAlways && ( <ToggleGroupControl .../> ) }`. `storedMarqueeAlways` is true for any stored marquee layer whose `belowBreakpoint` is not `mobile` or `tablet`. Browser test (t2-misc.mjs), body of the Overflow panel when opened:

| Trust bar state | Overflow panel content |
|---|---|
| no stored layer | 1 control (Wrap / Hide extras on the canary) |
| marquee `belowBreakpoint: always` | 0 children (empty) |
| marquee with no `belowBreakpoint` (the footer shape) | 0 children (empty) |
| marquee `belowBreakpoint: overflow` | 0 children (empty) |
| marquee `belowBreakpoint: tablet` | 1 control |

The clone writes `always` or no breakpoint (i3 report, section 8), so a cloned trust bar always gets the empty panel. Block-specific; no other block has this condition (the census found 12 empty panels in 9 other blocks, each with its own cause). Fix shape: render an explanatory note instead of nothing, or drop the panel when empty.

### 2.3 "Label colour"

The record calls it `labelColour` (`setting_placements`: part `sgs-trust-bar__badge-label`, property `color`; `block_attributes`: default `text`, control `DesignTokenPicker`, `css_element` badge-label). It has a control, labelled "Label colour" in the Colour panel, but only for two styles. Browser, Colour panel rows per style:

| Style | Colour panel rows |
|---|---|
| icon-circle | Background colour, Root text colour, Icon circle background, Icon colour |
| icon-bare | Background colour, Root text colour, Icon colour |
| text-only | Background colour, Root text colour, Badge fill, Badge border colour, Separator colour, Title colour, Label colour |
| image-badge | Background colour, Root text colour, Title colour, Label colour |

The icon styles print the text as `.sgs-trust-bar__label`, not `__badge-label`, so `labelColour` paints nothing there; their label colour is `textColour`, shown as "Root text colour" (`block.json` element note says so). Mama's footer trust bar (icon-bare) writes both `labelColour: mm-cocoa` and `textColour: mm-cocoa`: the first is dead. That is why Bean found no setting by the name. Fix shape: relabel "Root text colour" as "Label colour" for icon styles, or make the label colour rule select both classes.

### 2.4 "Label fill colour" (item fill)

PROVEN again on the live homepage (t2-front.mjs): `.sgs-trust-bar__circle--filled svg { fill: var(--sgs-trust-badge-icon-fill, currentColor) }` paints the `<svg>` root. With the variable set to red:

| Shape inside the svg | Shape's computed fill |
|---|---|
| no `fill` attribute (the homepage star) | red |
| `fill="currentColor"` | the icon colour, not red |
| `fill="none" stroke="currentColor"` | none |
| `fill="#123456"` | `#123456` |

The clone's SVGs carry `fill` on every path, so the control reaches only fill-less shapes. It also needs the item's "Filled icon" toggle on first. Block CSS; same risk anywhere raw SVG meets a root-only rule (not checked in `sgs/icon`, `sgs/button`, `sgs/cart`: UNPROVEN).

### 2.5 Custom SVG shows as the tick

PROVEN (t2-sd.mjs). Items with `iconSvg` and no `icon` render in the canvas with the path `M20 6 9 17l-5-5` (the default tick); with both set, the library icon (truck) shows, which matches the PHP. Cause: `edit.js::EditorIconCircle` and `edit-panels.js::EditorIconBare` pass `source="lucide"` and never read `item.iconSvg`. Trust bar only.

### 2.6 Separator colour, and the styles

Styles (select options, `edit.js::BADGE_STYLE_OPTIONS`): Icon in circle (default), Icon bare, "Text only (pill badge)", Image badge. What the canvas renders (screenshots `canvas-style-*.png`): icon-circle is round icons with labels; icon-bare is icons inline with labels; text-only is pills, with a heading placeholder on the left ("Trusted certifications & memberships", an editor placeholder; on the front end the title prints only when non-empty, UNPROVEN what the clone writes); image-badge is the heading plus plain label cells.

What each style ignores (from `block.json::supports.sgs.variants` and the census panel lists): only icon-circle reads the circle size, radius, border and shadow; icon-circle and icon-bare read icon colour and line thickness; only text-only reads the Word badge settings (fill, border colour, border width, radius, separator glyph and colour); image-badge reads the badge image settings; `labelColour` and `titleColour` apply to text-only and image-badge; `textColour` is the label colour of the icon styles.

Separator proven dead by default: `sgs_trust_bar_separator_glyph` (`includes/helpers-trust-bar-item.php`) returns empty unless the style is text-only; `style.css` hides `.sgs-container--grid > .sgs-trust-bar__separator`; the canvas omits it too (`edit.js::separatorGlyph` requires `'grid' !== layout`). Front-end renders: text-only on the default grid gives separators `display:none` (colour red but invisible); text-only on flex gives visible separators in the chosen red; icon-circle, icon-bare and image-badge print none. So Bean's design point holds: the separator belongs to the bar, not to one style, and it must not depend on layout. The pill style stays unrestored: plain words are text-only plus transparent fill, 0 border and 0 radius.

### 2.7 Shape dividers (shared panel)

Method: canvas of `sgs/trust-bar` and `sgs/container` with the same attributes (t2-sd.mjs), then the live front end (t2-front.mjs, t2-render.mjs).

| Claim | Evidence | Verdict |
|---|---|---|
| Does not render in the canvas | trust bar: zero `.sgs-shape-divider` elements for every combination; container: renders | PROVEN. Only `blocks/container/edit.js` mounts `ShapeDividerPreview`. The panel is mounted by container, hero, site-footer, trust-bar, so hero, site-footer and trust-bar show a panel that draws nothing |
| Flip vertical does nothing | path gets `transform="scaleY(-1)"`; screen matrix `d` stays +1 and the painted mass stays at 31 to 119 px, in the container canvas and on the front end. A probe with `scale(1,-1)` gives `d = -1` | PROVEN dead. Cause: `includes/shape-dividers.php::sgs_render_shape_divider` and `ShapeDividerPreview.js` write CSS-function syntax into an SVG `transform` attribute, which SVG ignores. Reaches all four blocks plus the container canvas. Flip horizontally uses the same syntax, so it is dead too (canvas `a` unchanged) |
| Top divider shows at the bottom | every shape path ends `L1200,120 L0,120 Z`, so the filled mass hugs the lower edge of its 120 px box (measured 31 to 119). The top divider uses the same path unflipped. On a 44 px strip the visible part is the bottom 13 px | PROVEN geometry; the Invert toggle that would fix it is the dead one |
| Colour controls do nothing | UI colour choice writes `shapeDividerTopColour: accent`; in the container canvas the path turns that colour and a hand-set red shows red; on the front end red (top) and blue (bottom) both render | Colour WORKS. It looks dead on the trust bar because nothing renders there, and nowhere paints a unified default (`surface`) when unset |

### 2.8 Own padding-and-margin panel

Census (panels holding exactly the Padding plus Margin control pair, 8 controls or fewer): "Spacing" in 15 blocks (audio, breadcrumbs, business-info, button, collapsible-text, icon, icon-list, info-box, product-search, responsive-logo, separator, social-icons, star-rating, table-of-contents, team-member), "Padding & margin" in 5 (accordion, hero, physics-canvas, site-footer, trust-bar), plus "Strip spacing", "Responsive spacing", "Wrapper" and "Width & spacing" in one block each: 23 hand-written panels with the same six controls. The core Dimensions panel (from `supports.spacing`) appears in 7 blocks: card-grid, feature-grid, post-grid, pricing-table, product-card, tabs, testimonial-slider. No shared component builds the hand-written ones (each is `ResponsiveOverride` plus `SgsBoxControl` in its own `edit.js`). So the trust bar's panel really does what the 15 "Spacing" panels do, only titled differently. Which one Bean calls standard is his call: the likeliest is "Spacing" (15 blocks) or core Dimensions (7). UNPROVEN which; what settles it is asking him.

### 2.9 Background panel position

PROVEN (census, both runs). On first select the Styles tab lists Background last (trust-bar: last; container 14th of 14; hero 17th of 17) and open; after switching to Settings and back it sits second, under Colour. Cause: `components/MediaElementPanel.js` lazy-loads its body (`lazy(...)` inside `<Suspense fallback={ null }>`), so its inspector fill registers after every other panel on first render. In one census pass the panel was absent for the first second and then appeared; in the other it was last: timing varies, the late arrival does not. The same behaviour moves the media panels of the Settings tab to the top on revisit in 8 blocks (before-after, decorative-image, image-sequence, media, nav-drawer, responsive-logo, team-member, testimonial). Two other components lazy-load the same way (`BuiltinButtonPanel`, `CarouselDotsPanel`) but did not reorder in the census.

## 3. Other outliers

### 3.1 `sgs/button` "Hover effects", one control, cannot close

It is a core `ToolsPanel`, not a `PanelBody`: `src/blocks/button/edit.js` mounts `<ToolsPanel label="Hover effects">` with one `ToolsPanelItem` ("Weight on hover", `fontWeightHover`). Its own comment says the colours moved to the top-level colour panel and this was "the one hover behaviour with no colour of its own": a leftover. A `ToolsPanel` has no collapse arrow, and its item is `isShownByDefault`, so it is always open. DB: `fontWeightHover` has `css_element` wrapper, property `font-weight`, state hover, and sits beside `fontWeight` (the Typography panel). So it belongs in the button's Typography panel. Same shape elsewhere: 74 core `ToolsPanel`s in 44 blocks have no collapse arrow; 31 of them in 25 blocks hold exactly one control (list in section 5).

### 3.2 "Site colour" above the shadow control

Proven by screenshot (`shadow2.png`). It is the first button of the colour row inside the shared shadow control's "Build your own" section (`src/components/shadow-control/ColourOpacity.js`), shown once a shadow style is chosen, above the "Shadow colour" picker. It sets the shadow colour token to `site`, meaning "follow the one site-wide shadow colour" (`--wp--custom--shadow-colour`, theme.json `settings.custom.shadowColour`, default the text colour), so a rebrand recolours every shadow at once; picking any other colour makes that layer its own. It is the primary-styled (dark) default state, which is why it dominates. It appears wherever the shared control is mounted: 51 panels in 32 blocks in the census, including all three of button, trust-bar and container.

## 4. Task 4: the "nearest related panel" rule

The existing Spec 35 placement rule already has this shape (tier 1: the element's panel; tier 2: the property family; control that styles nothing: pinned Settings panel). Bean's rule is that rule applied to single-control panels, so no new rule is needed, but it has three gaps, found by running it on the three blocks' single-control panels (census plus `block_attributes`):

| Panel (block) | Attribute (DB `css_element`) | Rule's answer | Clear? |
|---|---|---|---|
| Hover effects (button) | `fontWeightHover` (wrapper, font-weight, hover) | Typography panel: holds `fontWeight` | Clear |
| Badges, in Styles (trust-bar) | `columns` | Layout panel, which already holds the same attribute | Clear (delete the duplicate) |
| Icon (trust-bar) | `iconStrokeWidth` (icon-badge) | Appearance panel (other icon-badge controls) | Clear |
| Background surface, Extra SVG layer (trust-bar, container) | `surfaceTone`, `bgSvgContent`: no element | the Background panel (same feature) | Clear only by feature, not by the rule |
| Shadow (all three) | `shadow` (wrapper, box-shadow) | wrapper is in 5 panels (Colour, Section, Padding & margin, Layout, Border) | AMBIGUOUS by element; clear by family: the Border panel (box decoration), as free-delivery-bar's "Card border and shadow" already does |
| Overflow (trust-bar) | `overflowMode`: no element, no CSS property | styles nothing: pinned Settings "Style" panel | Clear |
| Section ground (container) | `ground` (no element) | Settings panel | Clear |
| Content band (container) | `contentWidth` (content-band, max-width) | Layout panel, which holds Outer max-width | Clear but needs a judgement: same property, other element |
| Hover as one card (container) | `hoverAsCard`: behaviour | the Hover motion panel | Ambiguous: behaviour attribute, hover family |
| Block Link, Keyboard focus, Icon (button), Size in row, Position | `sgsBlockLink`, `sgsFocusRests`: behaviour; `sgsChildSizing`, `sgsPosition`: wrapper, layout | no element or too many | Ambiguous |

Where it is clear: whenever an attribute has a twin (hover, tier, duplicate) or a named element with exactly one panel. Where it is ambiguous: (1) the root element `wrapper` is the whole block, so "same element" matches five panels on the trust bar; (2) behaviour attributes have no element and no CSS property, so rule 1 and rule 2 both return nothing; (3) a shared extension panel (shadow, focus, size in row) has no home of its own and, being shared, cannot move per block without moving for all.

A better rule (same order, with two additions): (a) twin first: strip the suffix (`Hover`, `Tablet`, `Colour`, a trailing unit) and go beside the attribute that holds the stem; (b) element plus property family together, not element alone (wrapper plus box decoration is one panel, wrapper plus size another); (c) `block_attributes.role` for the rest: all `behaviour` roles (`sgsFocusRests`, `sgsBlockLink`, `hoverAsCard`, `overflowMode`) go to one panel named for what it does, Behaviour; (d) otherwise the pinned Settings panel. Rule (c) alone clears 85 "Keyboard focus" panels, 6 "Block Link" and several others, and it is deterministic from the DB. The Bean ruling (shared feature panels keep their own colour controls) is kept: none of the rows above is a colour control.

## 5. Census summary (all 104 `sgs/*` blocks, canary build, saved as `census-all.json`; summary in `summary.txt`)

How it works and how to rerun: `node census.mjs ALL` (or block names) logs in, opens a new page, inserts each block, selects it, reads every panel on both tabs on first select, again after 1 second, after switching away and back, then opens each panel to list its controls and tests whether it closes. About 9 seconds a block by its own clock (the full run took roughly 20 minutes wall time). `python analyse.py census-all.json` and `python summary.py` turn the JSON into the lists below (about 11 KB of text, so a rerun costs few tokens). It does not need a deploy but does read whatever build the target runs (section 0).

Scanned: 104 blocks, all inserted, none crashed. 82 have Settings and Styles tabs; 20 have a single flat inspector (choice-flow-question, choice-flow-result, diagram-dimension, form-field-address, -checkbox, -consent, -date, -email, -file, -hidden, -number, -phone, -radio, -select, -text, -textarea, -tiles, form-review, form-step, pay-later-message); gallery and info-box carry extra unnamed tabs. 1,423 panels in total.

| Fault shape | Panels | Blocks | Names |
|---|---|---|---|
| Single-control panel (PanelBody) | 323 | 85 | Of these, "Keyboard focus" 85 and "Size in row" 73 are universal extension panels; 162 more in 63 blocks. Worst: buybox 13, choice-flow 8, container 7, trust-bar 6, account 5, card-grid 5, hero 5, icon 5 |
| Single-control core ToolsPanel | 31 | 25 | accordion, before-after, brand-strip, business-info, button, form, gallery, heading, icon, info-box, label, media, modal, nav-bar-menu, nav-drawer-menu, post-grid, pricing-table, product-card, quote, site-header, star-rating, tabs, team-member, testimonial, text |
| Core ToolsPanel in total (no collapse arrow) | 74 | 44 | (always open) |
| Empty PanelBody (opens to nothing or only a note) | 12 | 9 | buybox "Gallery images"; commerce-note "Colours" (truly empty); nav-bar-menu "Disabled items"; nav-drawer "Background surface" (truly empty), "Content"; nav-drawer-menu "Trailing icon", "Disabled items", "Ornament"; notice-banner "Messages"; notice-message "Message"; order-items "Item pictures" (truly empty); product-faq "Structured data (SEO)" |
| ToolsPanel showing no item (items sit behind its menu; UNPROVEN whether the menu offers any) | 17 | 16 | account, card-grid, counter, free-delivery-bar, google-rating-badge, info-box, nav-bar-menu, nav-drawer, order-items, process-steps, quote, site-header, testimonial, timeline, wishlist-link, wishlist-panel |
| Trust bar Overflow shape: panel whose body depends on a condition and can be empty | 1 confirmed | 1 | trust-bar (the 12 empties above have other causes) |
| Duplicate panel title inside one tab | 46 panels sharing a title | 15 | account Colour x6; buybox Colour x3; choice-flow Colour x7 and Layout x2; container Colour x3; gallery Colour x3; product-card Colour x3; product-search Colour x2; testimonial-slider Colour x3; button, heading, nav-bar-menu, nav-drawer-menu, text Effects x2; hero Hover x2; responsive-logo Media x2 |
| Panel order changes after switching tabs | 15 | 15 | Styles tab, Background moves to second place: container, hero, multi-button, physics-canvas, site-footer, site-header, trust-bar. Settings tab, media panels jump to the top: before-after, decorative-image, image-sequence, media, nav-drawer, responsive-logo, team-member, testimonial |
| Order changes while idle (no tab switch) | 2 | 2 | before-after (media panels appear late) and trust-bar (Styles tab: Background appeared between the first and second read) |
| Three or more panels open on first select, Styles tab | | 30 | (distribution 0 open: 23 blocks, 1: 28, 2: 23, 3: 14, 4: 9, 5: 3, 6: 1, 7: 3); Settings tab: 10 blocks with three or more |
| Same panel title on both tabs | 4 | 4 | gallery "Layout"; message-preview "Boxes"; option-picker "Label"; trust-bar "Badges" |
| Hand-written Padding plus Margin panel | 23 | 22 | see 2.8; core Dimensions in 7 more |
| Shared Shape Dividers panel | 4 | 4 | container, hero, site-footer, trust-bar; canvas draws it only in container |
| Panels holding the shared shadow control ("Site colour") | 51 | 32 | all shadow panels incl. "Shadow" 18, "Shadow on hover" 2, "Item shadow", "Card hover shadow" and the button and card panels inside account and buybox |
| PanelBody that cannot be closed | 0 | 0 | only ToolsPanels lack a toggle |

## 6. Calls I made

- Used the canary (login worked); no mirror needed. It is the build under test, which lags the repo (section 0).
- Opened panels by clicking them to read controls, then closed those I opened. This is read-only state only (nothing saved).
- Aborted every non-GET REST call in the editor except block-renderer (a read), so nothing could save.
- Treated "layout type" as the thing Bean calls "grid types": Default, Flex, Stack, Grid.
- Counted "single-control panel" as one top-level control wrapper (or bare control) detected by my reader; a toggle group counts as one. Where my reader mis-labels a control (range sliders show their value as label), counts are unaffected.
- Did not restore a text-only style; did not edit any repo, DB or site file.
- Deleted only my own auto-drafts (6029 to 6045; status auto-draft, empty content, title "Auto Draft", checked before each delete).

## 7. Open items

- Deploy HEAD to the canary and re-run `node census.mjs sgs/trust-bar` to confirm 2.1(a) and the new Overflow wording.
- Bean to say which spacing panel is "standard" (2.8) and whether the separator should become a block-level setting independent of style and layout (2.6).
- The 17 ToolsPanels showing no item need one look at their menus.
