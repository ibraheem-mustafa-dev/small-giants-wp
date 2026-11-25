# i16: shared panels as full packages (separators, survey, trim, order)

Read-only. Nothing in the repo, the DB or any site changed. Scratch: `E:\sgs-tmp\general-cloning\investigate\i16-shared\` (`mounts.py`, `mounts.json`, `mounts.txt`: a mount census of every shared component, JSX mounts counted after stripping comments). Counts are static (source reading), so "mounts" means a JSX tag in a block's folder, not a live editor. Findings reused from earlier runs are tagged (i3, i8, i11, i12).

## Short answers

1. One separators package can replace all three "panels" and lose nothing any block uses. The two shared panel files and container's inline copy are thin `PanelBody` shells around the one control `SgsSeparatorControl`; they differ only in title, gating and which options they pass. PROVEN.
2. Separators is already the nearest thing to a full package: one control, one stored shape, one PHP engine, one editor hook per drawing path, and a gate that fails a block with no canvas preview. Two gaps remain: the options a block offers are written twice (block.json and hard-coded PHP, and no check compares them), and the browser fallback script loads from only 3 blocks. PROVEN, with one UNPROVEN consequence.
3. Among the other packages, only motion and the media/background panel are shared end to end (panel, canvas, front end). Everything else is shared at the control and PHP-helper level, but each block wires its own panel shell, its own canvas call and its own emitter call. The only hook-shaped canvas package is separators (`useSeparatorsCanvas`).
4. A trim list is feasible everywhere. Several packages already take an ad hoc opt-out (props, in different shapes). Four have a control whose value feeds another's output, so hiding it needs a default: Layout, Border, Background/media and the Typography units.
5. Order: pilot on separators (it proves the trim mechanism in one place), then spacing (about 50 hand-built panels), colour (about 30 blocks), the border/typography/shadow shells, the layout canvas, carousels, shape dividers.

## 1. Separators

### What each offers (all PROVEN from source)

| | `blocks/container/components/SeparatorsPanel.js::SeparatorsPanel` | `shared/nav-menu-panels/SeparatorsPanel.js` (default export) | `components/SgsSeparatorControl.js` | `blocks/container/edit.js` inline |
|---|---|---|---|---|
| What it is | `PanelBody` "Separators" around the control | `PanelBody` with a title prop around the control | The control itself | `PanelBody` plus the control |
| Gate | Shows only when the block declares `separators` and `layout` is grid, flex or stack | None | None | Layout is grid, flex or stack |
| Options passed | None, so both axes, no edges, no hover | `axes`, `edges`, `sweep` from the caller; `hover` always on | Receives `axes`, `edges`, `hover`, `sweep`, `label` | None (same as the container panel) |
| Attribute written | `separators` | the caller's (`separators`, `submenuSeparators`) | whichever `onChange` writes | `separators` |
| Mounted by | gallery, site-header-row, and `ContainerWrapperControls` kinds `layout` and `content` (card-grid, feature-grid, multi-button, post-grid, site-footer-row) | nav-bar-menu x2, nav-drawer-menu x2 | brand-strip, business-info, cart, container, icon-list, pricing-table (inside their own panels) | container only |

The control offers, per axis (between rows, between columns, linkable): per-device thickness (`ResponsiveLengthControl`), one colour with Normal and Hover tabs, line style (solid, dashed, dotted, none), plus `edges` (outer lines), hover treatment (none, swap, sweep) and sweep angle. Element painted: the gap between items. Two drawing paths in `includes/helpers-separators-css.php`: `flow` (native gap decorations, or the measured overlay in `src/shared/separators/`) and `line` (a pseudo-element on every item but the first). The stored shape is identical for all 15 declaring blocks (`includes/helpers-separators.php` header; `src/utils/separators.js`).

Container's inline panel is an exact duplicate of its own `SeparatorsPanel` (same gate, same props). Container passes no caps because its caps are the defaults.

### What renders them

- Front end: one engine, `sgs_separators_css()`, called from 9 sites (container wrapper via `includes/helpers-container-separators.php`, gallery, post-grid, brand-strip, business-info, icon-list, pricing-table, cart, `includes/nav-menu-separators.php`). Each caller writes its own list descriptor (selector, path, gap) and its own caps array in PHP.
- Editor canvas: `useSeparatorsCanvas` (flow path) in card-grid, feature-grid, gallery, multi-button, post-grid, site-footer-row, site-header-row, plus container through `useSeparatorOverlay` and `containerWrapperPreview`. `separatorsLineCss` (line path) in cart, icon-list, pricing-table. `ServerSideRender` in brand-strip, business-info, nav-bar-menu, nav-drawer-menu. `scripts/check-separators-through-helper.py --check` fails a block with none of these (cart is exempt by name).

### Can one package replace all of them?

Yes. Nothing is lost: the control is the superset and every shell is a subset of it. What one package must add to be complete:
- One `SeparatorsPanel` taking the attribute name and a `bare` mode (four blocks put the control inside a larger panel: business-info, cart, icon-list, pricing-table).
- Axes, edges, hover and sweep read from `block.json::supports.sgs.separators.<attr>` instead of hand-passed props. Today the same caps sit in block.json AND in PHP (`sgs_container_separators_caps`, `sgs_nav_menu_separators_caps`, brand-strip `render.php`, `helpers-cart-panel-css.php`, others), and no gate compares them. I checked all 15 block.json entries against the editor mounts and they agree; that is luck, not a rule. PROVEN.
- One canvas hook covering both paths (`flow` and `line`); today they are two APIs.
- The browser fallback loaded by the package. `initSeparators` is called only by `container/view.js`, `brand-strip/view.js` and `nav-drawer-menu/view.js`. The 7 other blocks on the flow path (gallery, post-grid, card-grid, feature-grid, multi-button, site-header-row, site-footer-row) have no view script that calls it. In Firefox and Safari (no native gap decorations) their lines then draw only if the page also carries one of those three blocks. UNPROVEN as a live fault; settle by loading a gallery-only page in Firefox.

What no variant offers, so a block needing it is not served: colour per device, a gradient line colour, a line shorter than the gap, a glyph. None of the 15 blocks uses these.

### Hand-built separator copies

PROVEN by `block.json` attribute scan plus source reads; whether each draws a between-item line is UNPROVEN where marked.

Own panel, shared control (no shell reuse): brand-strip `separators`; container `separators`; business-info `separators`; cart `separators`; icon-list `separators`; pricing-table `featureSeparators`.

Own attributes, no shared control:
- Glyph between items (a character, not a line): breadcrumbs `separator`, `separatorColour`, `separatorColourGradient`, `separatorColourHover`, `separatorColourHoverGradient`; language-switch `separator`, `separatorColour`; local-time `separator`; counter `separator` (boolean); trust-bar `textBadgeSeparator`, `textBadgeSeparatorColour`; buybox `addToCartPriceSeparator`.
- Single rules: google-reviews `headerDividerWidth`, `headerDividerColour`; account `headerAccountRule` (boolean); buybox `stockLineHairline`, `stockLineHairlineMargin`; mega-panel `asideSeparator` (`{style,width,colour}`).
- Probable between-item lines drawn outside the helper (UNPROVEN): choice-flow `summaryDividerColour` (summary rows), mega-panel `drawerLinkDivider` and `drawerLinkDividerGradient` (each drawer row), account's `:last-child` reset in `account/style.css` (the gate's single baseline entry). The gate catches only four CSS shapes, so these may use others.
- Not separators: before-after `dividerColour*` and `dividerWidth` (a drag handle); card-grid `selectionRule` (a query rule).

Glyph separators are a different feature (a character between items). Folding them in would add an option rather than replace anything; recommend leaving them out.

## 2. Shared package survey

Key. Panel: S = one shared panel component; C = shared control, each block builds the panel shell; N = per block. Canvas: H = shared hook; U = shared helper that each block wires in `edit.js`; SSR = the block draws its canvas from `render.php`. Front end: W = `SGS_Container_Wrapper::render` (26 blocks call it: accordion, accordion-item, card-grid, container, feature-grid, form, form-field-tiles, form-step, gallery, google-reviews, hero, info-box, multi-button, physics-canvas, post-grid, pricing-table, product-card, site-footer, site-footer-row, site-header, site-header-row, tab, tabs, testimonial-slider, trust-bar, trustpilot-reviews); P = shared PHP helper that each `render.php` calls.

| Package | Panel | Canvas | Front end | Blocks mounting / hand-built instead |
|---|---|---|---|---|
| Separators | S (two shells) plus C | H (flow), U (line), SSR in 4 | P, 9 call sites | 15 / none (glyph and rule copies above) |
| Spacing (padding, margin) | C: `SgsBoxControl` 61 blocks, 131 mounts; shared panel `ResponsiveBoxControls` mounted by gallery only | U: `utils/spacing-preview.js` named in 68 of 70 non-SSR mounting blocks (not in form-field-consent, form-review) | W for 26 blocks; P (`sgs_box_*`) elsewhere; 39 `render.php` read `$attributes['padding']` themselves, 27 of them outside the wrapper (i11) | 70 / 39 hand-built pairs, 5 padding-only, 8 `ResponsiveBoxControl` panels, 8 core Dimensions blocks (i11) |
| Layout (`LayoutPanel`) | S: direct in container, gallery, trust-bar; via `ContainerWrapperControls` in 17 more | U: `containerWrapperPreview` named in 8 blocks; container keeps its own mirror (file header: "keep the three in step"). 14 wrapper blocks do not name it (card-grid, container, feature-grid, form-field-tiles, form-step, gallery, info-box, physics-canvas, post-grid, pricing-table, site-footer, site-header-row, tab, trust-bar); some use their own mirror, UNPROVEN per block | W (26) | 20 / own grid-columns attribute in 7 non-wrapper blocks (account, buybox, choice-flow, form-review, gift-order, icon-list, wishlist-panel; UNPROVEN as root layout) |
| Width (`WidthPanel`) | S: direct in 6 (container, hero, physics-canvas, site-footer, site-header, trust-bar) plus `ContainerWrapperControls` 17 | inside `containerWrapperPreview` | W | 23 / own `max-width` attribute in 22 non-wrapper blocks (text, heading, quote and others; UNPROVEN as the same purpose) |
| Background and media | S: `MediaElementPanel` 25 blocks, `BackgroundPanel` 8; Background surface and Extra SVG layer are separate `PanelBody`s (i11) | U: `backgroundMediaPreview` in all 8 background blocks | shared renderer (`SGS_Background_Media`) | 25 / none found |
| Shadow | C: `ShadowControl` 40 blocks, 66 mounts; each block's own `PanelBody` | U: `composeShadow` or `boxShadow` named in 32 of 40; 8 name neither: 6 are SSR, card-grid and team-member UNPROVEN | P: `sgs_shadow_decls` about 21 blocks; wrapper for its blocks | 40 / 7 blocks hold shadow attributes with no `ShadowControl` (choice-flow, decorative-image, media, product-search, site-footer, social-icons, testimonial-slider; some through the media panel or button kit, UNPROVEN) |
| Border | C: `SgsBorderControl` 73 blocks, 103 mounts | U: `sgsBorderPreview` 40 blocks, `wrapperBorderPreview` 6; 11 non-SSR blocks name neither (audio, counter, feature-grid, form-step, physics-canvas, pricing-table, process-steps, product-faq, site-footer, star-rating, theme-toggle), UNPROVEN | P: `sgs_border_element_decls` about 66 blocks | 73 / filter-search, mega-aside, separator; container's grid-item border builder (i3) |
| Typography | C: `TypographyControls` 61 blocks, 92 mounts | U: `typographyPreviewStyle` in every non-SSR mounting block but mega-panel | P: `sgs_typography_css_rule` about 59 blocks | 61 / textarea (`counterFontSize`, `inputLineHeight`), multi-button (`childBtn*`) |
| Shape dividers | S (top and bottom halves duplicated inside the file) | `ShapeDividerPreview` in container only; hero, site-footer and trust-bar draw nothing (i8, i11) | W: `sgs_render_shape_divider` | 4 / none; Flip and Invert dead everywhere (i8) |
| Motion and effects | S: three panels through `supports.sgs.motion` | shared (`extensions/motion/canvas/`) | shared (`includes/motion/`) | 80 / none found |
| Button kit | S: `BuiltinButtonPanel` | shared: `button-kit/button-kit-style.js` | P | 8 declare `supports.sgs.builtinButtons` / 9 blocks hold their own button colour or type attributes by name census: cart (`emptyCta*`), form-review (`editButton*`), form, multi-button (`childBtn*`), nav-drawer (`chromeButton*`), pricing-table (`cta*`), wishlist-panel, card-grid and post-grid (`pageButton*`); UNPROVEN as the same purpose |
| Dots and arrows | S: `CarouselDotsPanel` | none shared | 6 separate view scripts (container via `shared/scroll-row-controls`, gallery 467 lines, google-reviews 385, post-grid `view-carousel.js`, testimonial-slider 631, trustpilot-reviews 195); the scroll-row file says it "mirrors" testimonial-slider and gallery | 3 / google-reviews (25 carousel attributes incl. arrow and dot colours), trustpilot-reviews (5), post-grid (6) |
| Scroll row | S: `ScrollSidewaysPanel`, `OverflowControl`, `PinEdgeControl` (container only); `RowScrollBehaviourControls` in 2 | none shared | W (`container-scroll-row-css.php`) | 1 / `scrollSideways` is declared by container alone; `ScrollbarStyleControl` is shared across 7 |
| Colour (`SgsColourPanel`) | S, rows supplied by each block | U: `colourVar` and the paint helpers; 7 blocks name none (accordion, audio, language-switch, media, mega-aside, multi-button, physics-canvas), UNPROVEN | P (`sgs_colour_value`, colour-variant helpers) | 84 blocks, 89 mounts / 11 blocks mount it more than once, 21 hold raw colour pickers outside it (i3) |
| Nav menu panels (6) | S, in two blocks | SSR | P (`nav-menu-*.php`) | 2 / none |
| Form field panels | `FormFieldAdvancedPanel` in 9 of 14 form-field blocks, `FieldLabelLayoutPanel` in 2 | shared (`form-field-preview.js`) | P | partial; address, date, file, hidden, tiles lack the advanced panel (UNPROVEN whether they need it) |

Gaps by block worth naming: trust-bar (Layout panel plus its own `showBadgeGrid` canvas override, i8; no shape divider canvas); hero and site-footer (no shape divider canvas); gallery (the only spacing-panel mount; layout canvas not through the wrapper helper); container (own canvas mirror, inline separators and layout, own grid-item colour and border).

## 3. Trim compatibility

Mechanism today: `supports.sgs` already carries per-panel declarations (`separators` 15 blocks, `boxFamilies` 77, `spacingDefaults` 21, `colourExemptions` 20, `builtinButtons` 8, `mediaElements` 29), so `supports.sgs.trim` fits the pattern. `enabledExtensions` must not be reused (i11 section 8: 21 blocks would lose a panel). No block declares `hideExtensions` today.

Rule for a safe trim: hiding a control hides the control only; the front end keeps honouring any stored value (so no site's render changes), and the trimmed attribute's default must be the neutral one. A build gate should check that every trim slug exists in the package's own control list and that the attribute's `block.json` default is neutral.

| Package | Opt-outs today | Cross-feeds | Change to take a trim list | Size |
|---|---|---|---|---|
| Separators | `axes`, `edges`, `hover`, `sweep` props (and block.json caps) | `sweep` needs `hover`; linked axes copy values to every offered axis (`patchSeparatorAxis`); hiding Style is safe, PHP defaults to solid | read caps from block.json; add `separators.style` and `separators.hoverTreatment` slugs | S |
| Spacing | none yet (new package); `spacingAxes` and `defaults` already declared | padding, margin, max-width and content width are independent | build it with the list from the start | S |
| Layout | `showLayout`, `enableIntrinsicColumns`, `enableColumnShapePicker`, `enableFlexWrapTier` | Layout type decides which controls show; a non-empty template beats Columns in `SGS_Container_Wrapper::render` (i8: trust-bar Columns dead); hiding a layout value must still show it when stored | about 12 guards in a 633-line panel; fold the four props into slugs; fix the template-over-columns precedence or require an empty default | M |
| Width | `showContentBand` | max-width and content-width independent | 3 guards | S |
| Background and media | `atomIds`, `blockOwns`, `kinds`, `panelContent` | disclosure rules: Focal needs an Aspect ratio or Height (`reasons.js`); Pinned needs no transform motion (`pinned-blockers.js`); Autoplay locks mute | map slugs to `atomIds`; dependency closure so hiding Aspect ratio also removes or defaults Focal; fix the lazy chunk's panel order first (i11 section 4) | M to L |
| Shadow | `hide` (`spread`, `inset`, `raw`), `liftPrefix`, `hoverOnly` | the lift attribute feeds the hover shadow | add `lift` and `hover` slugs | S |
| Border | `showColour`, `showRadiusResponsive`, radius opt-in | `sgs_border_box_decls` prints nothing without a width and paints solid when no style is stored: Style is safely trimmable, Width is not (it would also kill Colour and Style) | slugs for style and radius; refuse a `width` trim | S |
| Typography | 22 `show*` props | a unit attribute feeds its size and line height; `showResponsive` removes tier values | slugs map to the existing props; units must default | S |
| Shape dividers | none | shape decides whether colour, size, flip and invert show | split the top and bottom halves (one component used twice), then slugs `top` and `bottom` | S |
| Motion | `supports.sgs.elements` (panels per part), `fx` list (effects per block), `motionDelegate` | none found | already trimmed by data | none |
| Button kit | `groups` per declared button | groups feed one look set | already trimmed; add to the common gate | none |
| Dots kit | none | dots colour needs the carousel or `scrollDots` on, or the panel is dead (i3) | `showWhen` from the PHP gate, then slugs | S |
| Colour | rows are supplied by the block | none | a block omits a row; the work is making kits feed rows into the one panel (i3) | M (kit side) |
| Scroll row | none | `scrollSideways` gates every other row control | slugs per control | S |

Common piece, built once: an `isTrimmed( name, slug )` helper beside `hide-extensions.js`, the `check-trim` gate, and an empty `trim` on every block until one opts in (a true no-op, per i11 section 8). About one working day, shared by every package.

## 4. Recommended order

Ranked by hand-built copies cleared. "Copies" are blocks that build the panel shell, wire the canvas or call the emitter by hand.

1. Pilot, separators (small): clears 4 in-panel copies and 2 shells, and proves the whole package shape: one panel with a bare mode, caps read from block.json in the editor and in PHP (plus a gate comparing them), one canvas hook for both paths, and the fallback script loaded by the package. Build the trim helper and gate here.
2. Spacing (about 50 copies, the largest true duplicate: the same six controls recomposed in 39 blocks, plus 27 `render.php` emitters). The canvas helper is already near-universal (68 of 70), so the package is the panel plus one emitter call.
3. Colour panel (about 30 blocks: 11 with several mounts, 21 with pickers outside). Kits feed rows into the one panel; no new control.
4. Border, typography and shadow shells (i3 counted 183 single-composite panels in 82 blocks: 53 border, 49 typography, 19 shadow). One panel component each, taking an element and a prefix, with the trim list. Low risk because the controls are already shared; the hand-coded part is the shell and the per-block canvas call.
5. Layout and width canvas: make `containerWrapperPreview` a hook like `useSeparatorsCanvas` and retire container's own mirror (14 wrapper blocks).
6. Carousels (arrows and dots): 3 blocks hold their own controls and 6 view scripts exist. Most code per block, fewest blocks.
7. Shape dividers: split the duplicated halves, add a canvas to hero, site-footer and trust-bar, fix Flip and Invert (i8 proved them dead).
8. Leave motion, media/background and the button kit as they are (already full packages); fold Background surface and Extra SVG layer into the background panel (i11 section 7).

## Calls I made

- Counted a "mount" as a JSX tag in a block's folder after stripping comments (the comment-inclusive first pass wrongly counted container as a `ContainerWrapperControls` mounter; container only mentions it in comments).
- Treated `ServerSideRender` blocks as having a shared canvas (the server draws it) when listing canvas gaps.
- Read "hand-built" as: the block builds the panel shell, wires the canvas or calls the emitter by hand, even where the control inside is shared.
- Did not open the live editor or a browser; every canvas and runtime claim is source-level, and each UNPROVEN item names what would settle it.
- Did not treat glyph separators as part of the lines package.
