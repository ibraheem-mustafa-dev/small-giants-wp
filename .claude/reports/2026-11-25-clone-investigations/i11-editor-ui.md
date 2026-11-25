# i11: block editor UI faults (blue shapes, three dots, open panels, spacing, shared previews, trim switch, build)

Read-only. Nothing was saved: every editor run aborted all non-GET REST calls, and the 7 empty auto-drafts the runs created (ids 6046 to 6052) were deleted afterwards (a re-scan of 6046 to 6062 found none). Scratch, scripts, JSON and screenshots: `E:\sgs-tmp\general-cloning\investigate\i11-editor-ui\` (probe.mjs and probe-all.json are a fresh 104-block pass; shots.mjs made the `shot-*.png` files).

Build caveat: live counts come from the canary, 179 commits behind `main`. Since that build the files this report rests on (`MediaElementPanel.js`, `SgsColourPanel.js`, `ResponsiveOverride.js`, `components/media/panels/`, `container/components/`) changed only by one formatting autofix (`ce1a9b318`), so live panel behaviour is the same on `main`. Static counts are from `main`.

## Short answers

1. The shapes are the per-device "has its own value" markers (diamond = Tablet, circle = Mobile) from one shared component, beside the label when the mount passes one and alone above the control when not (154 of 360 mounts). PROVEN.
2. The large three dots is the media panels' "Panel options" menu: 61 menus in 24 blocks. Core `ToolsPanel` has a smaller header menu in 74 panels, 44 blocks. PROVEN.
3. 129 panels past the first slot of their tab open on first select, in 58 blocks; three shared sources cover 76, 53 are per-block flags. PROVEN.
4. The lazy load is for bundle size (`448694c61`); a closed shell alone does not keep the place, an eagerly mounted slot does. Cause PROVEN, fix UNPROVEN.
5. A shared spacing panel exists (`ResponsiveBoxControls`) but only `sgs/gallery` mounts it; the hand-built panels are the same controls under other titles; WordPress Dimensions differs. PROVEN.
6. Shape-divider canvas preview exists only in `sgs/container`; padding and margin front-end output is hand-written in 39 `render.php` files. Other rows UNPROVEN.
7. Yes, the mechanism exists (`panelContent.background`). PROVEN in code, look UNPROVEN.
8. If three shared panels read `enabledExtensions`, 21 blocks lose a panel; a separate `trim` list is a true no-op. PROVEN.
9. No site and no mirror runs `main`. PROVEN (one mirror UNPROVEN).

## 1. Blue shapes beside or above labels

Cause: `src/components/ResponsiveOverride.js::ResponsiveOverride` prints a header row holding the control's label (when the caller passes `label`) and a dots span. `ResponsiveOverride.css` draws each dot 8 px, `#3858e9`, white ring: `--tablet` is a square rotated 45 degrees (diamond), `--mobile` has `border-radius:50%` (circle). A dot shows when that device holds its own value (`isOwn`, any non-empty value). It has an accessible name ("Tablet has its own value for X") but no visible text or tooltip, so a sighted owner sees an unexplained shape. `components/media/panels/PanelTitle.js` draws the same dots in a closed media panel's title.

Why "above": a mount with no `label` leaves the header holding only the dots, so they sit on a line of their own above the label the inner control draws. The omission is deliberate in two places: padding and margin (`ResponsiveBoxControls.js` comment: `SgsBoxControl` paints its own label, a second would double it) and `components/TypographyControls.js::TypographyControls` Font size (`FontSizePicker` brings its own "FONT SIZE" header).

Screenshots, tablet and mobile values set in the unsaved editor:
- `shot-1a-trustbar-custom-column-template.png`: diamond and circle beside "Custom column template". `sgs/trust-bar`'s `block.json` ships tablet and mobile values for it as defaults, so a fresh bar shows both.
- `shot-1b-heading-typography.png`: both alone above "FONT SIZE" on `sgs/heading`.
- `shot-1c-navbarmenu-listlayout-margin.png`: both above "MARGIN" in `sgs/nav-bar-menu` "List layout" (`src/shared/nav-menu-panels/ListLayoutPanel.js`, also mounted by `sgs/nav-drawer-menu`).

Shared or per block: shared component; the label-less mounts are per mount. A fresh insert already shows dots in 10 blocks (their `block.json` has tablet or mobile defaults, which count as "own"): feature-grid, gallery, measured-diagram, multi-button, physics-canvas, post-grid, product-search, site-footer-row, trust-bar, trustpilot-reviews. Any block shows them once a clone or client sets a tablet or mobile value. Label-less mounts: 140 in 53 blocks (every block with a hand-built Padding and Margin pair in section 5, plus heading, accordion, account, choice-flow-question, form-field-checkbox, google-reviews, nav-drawer, nav-drawer-menu, store-selector and others; the full list is the scan in `s3.py`'s sibling run, 53 names) and 14 in shared files (TypographyControls, so all 61 blocks that mount it, ListLayoutPanel, LinkExtrasItems, ResponsiveBoxControls, ColumnShapePicker, RowScrollBehaviourControls, BuiltinButtonPanelBody).

Fix everywhere, one place: change `ResponsiveOverride.js` and its CSS so a label-less header takes no line of its own: set the dots at the top end of `.sgs-responsive-override` (made `position:relative`), on the inner control's label row, and give each dot a native `title` ("Tablet has its own value"). UNPROVEN: a `SgsBoxControl` label row already ends in its link/unlink button (`shot-1c`), so the dots must sit left of it; settle with a build and screenshots at 375 and 1440. Open: a tier value equal to the block's shipped default still counts as "own" (trust-bar), so a fresh bar looks edited; hiding those needs the attribute default passed in.

## 2. Large three dots

Component: `src/components/media/panels/MediaPanels.js::MediaPanels` renders, as first child of every media `PanelBody`, `<div className="sgs-media-panel__menu"><DropdownMenu icon={ moreVertical } label="Panel options" toggleProps={ { size: 'compact' } }>` with one item, "Reset this panel" (device-aware wording). No CSS styles the wrapper, so it is a 32 x 32 px button on its own row above the first control (measured; `shot-2a-container-background-kebab.png`, menu in `shot-2c-media-menu.png`). Spec 49 §9.1 asks for it ("PanelBody has no header slot"); it is the only `DropdownMenu` in `src/`.

Count (live, every panel opened): 61 menus in 24 blocks: before-after 4, brand-strip 3, buybox 5, card-grid 2, container 1, decorative-image 5, gallery 2, hero 1, image-sequence 2, measured-diagram 1, media 7, multi-button 1, nav-drawer 2, option-picker 2, physics-canvas 1, post-grid 2, product-card 5, responsive-logo 2, site-footer 1, site-header 1, team-member 3, testimonial 3, timeline 2, trust-bar 1. It shows even when the panel holds no value.

Second candidate: core `ToolsPanel` draws a 24 px kebab in its title row (`shot-2b-toolspanel-menu.png`; menu: optional controls, per-item RESET, "Reset all"): 74 panels in 44 blocks. Core behaviour.

Fix: show a small tertiary "Reset" button on the panel's first row only when the panel holds a value, instead of a permanent 32 px kebab; tiered rows already have "Reset to Tablet" from `ResponsiveOverride`. One file covers all 24 blocks. UNPROVEN which menu Bean means (the media one fits "large", "above a control", "a reset option"): ask, or fix the SGS one and leave core's.

## 3. Panels open by default

How the open state is set:
1. `PanelBody` defaults to open. Of 742 `<PanelBody>` tags in `src/`: 591 say `initialOpen={ false }`, 106 omit it (so they open), 38 say true, 7 use an expression (bracket-matching scan, `s3.py`).
2. `src/components/SgsColourPanel.js::SgsColourPanel` hard-codes `initialOpen` on "Colour": 93 mounts in 89 blocks (every `PanelBody` titled Colour is this one).
3. `src/components/media/panels/panel-model.js::PANELS` and `BACKGROUND_PANEL` set `open:true` for Media, Size and crop and Background; `MediaPanels.js` passes `panel.open` to `initialOpen`.

Count (census on first select, `PanelBody` only, any slot after the first in its tab): 129 in 58 blocks. By source: Colour 50 (mechanism 2); Size and crop 11, Media 8, Background 7 (container, hero, multi-button, nav-drawer, physics-canvas, site-footer, site-header) = 26 (mechanism 3); 53 per-block (google-reviews 8, card-grid 4, process-steps 4, wishlist-panel 3, trustpilot-reviews 3, and single panels elsewhere). Colour is the first Styles panel in 48 blocks, where Bean's rule lets it stay open. The 40 non-first `ToolsPanel`s have no collapse arrow, so no flag closes them. The 20 flat-inspector blocks have none open past the first.

Single places: `SgsColourPanel.js` (50), `panel-model.js` (26), and 151 `PanelBody` tags across many block files, so build the detector first (migration-method: a check that fails on any `PanelBody` without an explicit `initialOpen`), then a codemod to `initialOpen={ false }`. "Except the first panel of its tab" cannot be a static flag, because first position is decided by slot order at runtime. Safest shape: close everything by flag, open the first panel of each tab by an explicit per-block `initialOpen` generated from `census-all.json` (it lists every tab's first panel), and make the census a gate that fails when a non-first panel is open. Item 4's fix comes first, or Background's position stays random. Spec 49 §9.1 ("Media and Size and crop open by default") needs its sentence replaced.

## 4. Why `MediaElementPanel` lazy-loads, why it opens

Commit `448694c61` (2026-11-10, "perf(media)"): the adopted panels (`build/media-panels.js`, 57 KB) load as one shared chunk so 33 block bundles stop carrying about 80 KB each; built JS went 22.6 MB to 21.3 MB, the hero editor bundle 408 KB to 367 KB, and the deploy package returned under its 45 MB ceiling. It opens by default because `PANELS` and `BACKGROUND_PANEL` say `open:true` (Spec 49 §9.1).

Why the order changes: `MediaPanels` itself renders `<InspectorControls group=...>`, and it sits inside `<Suspense fallback={ null }>`. Its fills mount only when the chunk resolves, so on first select they register after every other panel (PROVEN: i8 census, and Background is last on first select and second after a tab switch in the fresh scan).

Would a closed-shell fallback fix it? Not alone: a fallback fills the body, but the fill still mounts late. What keeps the place is rendering `<InspectorControls group=...>` eagerly in `MediaElementPanel` (it already knows the slot) with `Suspense` inside it, so the fill registers at first render and only the body arrives later. For the Background slot the shell is exact (one closed panel titled "Background", `BACKGROUND_PANEL`). For element slots the panel list depends on atom disclosure rules inside the chunk, so a shell needs a small static id-and-title list and may flash a panel that then disappears. The bundle saving is untouched. UNPROVEN: build it in a worktree and run the census on trust-bar, hero and container; expected, Background in JSX order on first select.

## 5. Spacing: is there a shared panel

Yes, barely used. `src/components/ResponsiveBoxControls.js` is a shared "Spacing & width" `PanelBody` (padding, margin, max-width, content-width, `initialOpen` prop defaulting to false). Only `sgs/gallery` mounts it; `site-header-row` and `site-footer-row` keep local copies of the same controls.

Variants (scan of every `SgsBoxControl` and `ResponsiveBoxControl` labelled Padding or Margin; `boxctl.json`):
- A. Hand-built pair: `ResponsiveOverride` (reads and writes the `{desktop,tablet,mobile}` object in `attributes.padding` / `attributes.margin`) around `SgsBoxControl` with `units={ BOX_UNITS }` and `presets`. 39 blocks (list in `boxctl.json`): the 23 census blocks (audio, breadcrumbs, business-info, button, collapsible-text, icon, icon-list, info-box, product-search, responsive-logo, separator, social-icons, star-rating, table-of-contents, team-member, accordion, hero, physics-canvas, site-footer, trust-bar, brand-strip, countdown-timer, product-faq) plus container, counter, form, heading, multi-button, notice-banner, option-picker, process-steps, quote, site-footer-row, site-header, site-header-row, testimonial, text, timeline, whatsapp-cta. The census count of 23 counted only panels holding exactly the six controls; the rest sit inside larger panels. Titles: "Spacing" (15), "Padding & margin" (5), four others.
- A2. Padding only: choice-flow, form-field-textarea, google-rating-badge, message-preview-line, theme-toggle.
- B. `ResponsiveBoxControl` (singular: same `SgsBoxControl` inside `ResponsiveControl`, not `ResponsiveOverride`, so no dots and another inherited display): label (both), buybox, cart, filter-search (margin), form-review, mega-aside (padding), card-grid card styles, commerce-look extension panels.
- C. Shared `ResponsiveBoxControls`: gallery.
- D. Shared nav panel `ListLayoutPanel` (a `ToolsPanel`: Item gap, Padding, Margin, Link padding): nav-bar-menu, nav-drawer-menu.
- E. WordPress Dimensions (`supports.spacing` with `__experimentalSkipSerialization`): card-grid, feature-grid, post-grid, pricing-table, tabs, testimonial-slider (padding and margin), product-card (margin), form-step (padding).

Diff: A to D are the same controls: four sides, linked or unlinked, preset select plus value and unit per side, units px, rem, em, %, vw (`BOX_UNITS`, copied as `LENGTH_UNITS` in `ResponsiveBoxControls` and `GRID_ITEM_BOX_UNITS` in `GridItemDefaultsPanel`; identical values), per device, writing the same `padding` / `margin` object. They differ in title; C adds Max width and Content width; B shows no dots; container passes `defaults` (section padding); `tabs` and google-reviews opt into paired Vertical / Horizontal rows through `supports.sgs.spacingAxes`. E differs in kind: core's spacing-scale control, no per-device values, no dots, writes `style.spacing.*`.

Front end: 39 `render.php` files read `$attributes['padding']` themselves; 26 blocks route through `SGS_Container_Wrapper` (12 overlap), so 27 of the 39 emit their own box CSS.

Fix shape: one shared panel component (title prop, default "Spacing") built on the `ResponsiveBoxControls` pattern with max-width and content-width off by default, then a detector-led codemod of the 39 blocks. Whether the 8 core-Dimensions blocks join is Bean's call: they would gain per-device values and lose core's scale control.

## 6. Shared panels whose canvas preview or front end is per block

| Shared panel | Blocks | Editor preview | Front end | Gap |
|---|---|---|---|---|
| Shape dividers (`ShapeDividersPanel`) | container, hero, site-footer, trust-bar | `components/ShapeDividerPreview.js`, imported only by `container/edit.js` | shared (`SGS_Container_Wrapper` calls `sgs_render_shape_divider`) | PROVEN: hero, site-footer, trust-bar draw nothing in the canvas (i8 proved trust-bar by DOM) |
| Background (media slot) | container, hero, multi-button, nav-drawer, physics-canvas, site-footer, site-header, trust-bar | `backgroundMediaPreview`, used by all 8 | shared media renderer (`SGS_Media_Element`, `class-sgs-background-media.php`; nav-drawer prints through it) | none found (static) |
| Layout and Width (`LayoutPanel`, `WidthPanel`) | 12 "layout" kind blocks, 5 "content" kind, gallery, container, trust-bar, hero, site-header, site-footer, physics-canvas | shared mirror `containerWrapperPreview` / `wrapperPreview` | shared (`SGS_Container_Wrapper`) | UNPROVEN: google-reviews, post-grid, product-card, tab, trustpilot-reviews import no shared canvas mirror. i8 also proved trust-bar's own `showBadgeGrid` overrides it |
| Spacing | 39+ | `resolveBoxTierPreview` in 3 blocks; others their own | per-block `render.php` in 27 non-wrapper blocks | front end PROVEN; canvas UNPROVEN |
| Shadow (`ShadowControl`) | 40 | swatch preview only; canvas `boxShadow` per block | per block | UNPROVEN: 11 blocks show no canvas shadow signal (account, brand-strip, buybox, gallery, gift-order, google-rating-badge, info-box, nav-bar-menu, nav-drawer-menu, option-picker, physics-canvas) |
| Separators (`SeparatorsPanel`) | 5 | `separatorsFlowPreview` inside the wrapper mirror | shared | UNPROVEN: gallery, nav-bar-menu, nav-drawer-menu, site-header-row show no signal |
| Typography | 61 | `typography-preview.js` | per block | UNPROVEN: free-delivery-bar, google-rating-badge, order-items show no signal |

"Signal" means the block's source never references the shared preview helper, not that the canvas is wrong. Settle each UNPROVEN row by changing the control in the editor and reading the canvas computed style (the i8 census method).

## 7. Background surface and Extra SVG layer inside Background

Both are plain `PanelBody`s rendered by `src/blocks/container/components/BackgroundMediaPanel.js` as separate `InspectorControls group="styles"` children beside the media panel: "Background surface" (`SurfaceSection`: surface tone, plus a `ToolsPanel` "Surface" for blur, saturate, opacity) in 8 blocks (container, hero, multi-button, nav-drawer, physics-canvas, site-footer, site-header, trust-bar) and "Extra SVG layer" (`SvgLayerSection`, 5 attributes) in 7 (the same minus nav-drawer, which has no `bgSvgContent`). In nav-drawer the census found "Background surface" empty: it has `surfaceBlur` but no tone, and its `ToolsPanel` shows no item.

They can fold in. `MediaPanels.js` already accepts `panelContent.background`, rendered inside the Background `PanelBody` before the pinned note and motion line. Change: `BackgroundMediaPanel` passes the two sections as `panelContent={ { background: ... } }`; each becomes a small closed-by-default subsection instead of a `PanelBody`; its own `InspectorControls` fill goes; nav-drawer shows the surface section only when it has content. It also helps item 4, because the two sibling fills stop depending on lazy order. Risks: a `PanelBody` inside a `PanelBody` double-borders, so a shared subsection component is needed; the extra SVG layer loses its own title in the panel list. UNPROVEN visually: build, then screenshot container and nav-drawer.

## 8. `enabledExtensions` as the trim switch

Facts: 91 of 104 blocks declare it, 89 with only `childSizing`. Slugs: childSizing 89, blockLink 7, background 6, width 4, shapeDividers 3, timeText 3, floatPosition 2, layout 2, gridItems 1, hoverSpillScale 1. Readers today: child-sizing, float-position, time-text and block-link (editor and PHP), and `SGS_Container_Wrapper::has_extension` for hoverSpillScale. `SGS_Container_Wrapper::resolve_kind` deliberately does not narrow by the list; `check-wrapper-capability-preconditions.js` only requires `layout` beside `gridItems`. The shared panels do not read it (`BackgroundPanel` no longer does; the `LayoutPanel.js` docblock that says it does is stale).

If Layout, Width and Shape dividers read the list as an allowlist (show only when the slug is listed), panels lost:
- Layout: 13 (the 12 "layout"-kind blocks plus gallery; only container and trust-bar list `layout`).
- Width: 19 (physics-canvas, site-footer, the 12 layout-kind blocks, and the 5 "content"-kind blocks accordion-item, form-step, multi-button, product-card, tab; only container, hero, site-header, trust-bar list `width`).
- Shape dividers: 1 (site-footer). Background, if it also read the list: 2 (multi-button, nav-drawer).
- Union: 21 blocks lose at least one panel. The front end is unaffected (PHP does not narrow), so stored values keep painting while their controls vanish.

Safe shape: do not reuse `enabledExtensions`, an opt-in list where reading it hides everything unlisted. Add a separate `supports.sgs.trim` list read by one helper, `isTrimmed( name, slug )`, true only when the list names the slug; no list means nothing trimmed. Turning it on is then a no-op for all 104 blocks until one declares `trim`. Add a build check that every `trim` slug is one a panel understands, and fix the stale `LayoutPanel.js` docblock in the same commit.

## 9. Where does current `main` run

None. Deploy markers (`ssh hd "cat ~/.sgs-deploy-marker-<target>.json"`) against `main` (9113bc0e4):
- sandybrown: `ca6abcbeb`, 2026-11-22 16:04 UTC, 179 commits behind (27 touch `plugins/sgs-blocks/src` or `includes`; 90 touch the plugin or theme at all). It lacks `00eac2c01` (trust-bar ticker, 2026-11-24) and `dba68836d` (scrim fade).
- indus-test: `ca6abcbeb`. mamas-test: `ed5effd01` (171 behind). eye-care-clone-test: `cf6ca94e5` (169 behind). eye-care-test: `cf6ca94e5`.
- Local mirrors: WSL Ubuntu is running and ports 8081 to 8084 answer 200. Read through `\\wsl.localhost`, local-eye-care, local-indus and local-mamas have `build/blocks/trust-bar/index.js` dated 2026-11-22 12:17 without the string "Ticker scrolls them only": older than the canary and `main`. local-sandybrown was unreadable (permission denied, the mode-700 case the mirror README describes), so its build is UNPROVEN, probably also 2026-11-22.
- The main checkout has no `plugins/sgs-blocks/build`; the newest deploy-cache build is `e1238236e` (2026-11-22). A current build exists only in worktree `E:\sgs-tmp\wt-cart-before` (at `9113bc0e4`), which no site serves. To run `main`: build in PowerShell (`npm run build`), then `build-deploy.py --target sandybrown`, or sync a mirror with `sync-build.sh`. I did neither.

## Calls I made

- Read "large three dots above a control" as the media panels' own menu first, and listed core's `ToolsPanel` menu as the second candidate.
- Read "first panel of its tab" as the first slot in the tab as the census saw it on first select.
- Reproduced the heading and nav-bar-menu dots by setting tablet and mobile values in the unsaved editor; a fresh block shows none.
- Used the canary (only site with a working login for the census) and wrapped child blocks in their required parent to insert them, as the i8 census did.
- Deleted auto-drafts 6046 to 6052 only after the status auto-draft, title "Auto Draft" and empty-content test; ids 6046 and 6048 were not in my own record (likely a parallel session's) but met the same test.
- Static counts come from a bracket-matching scan of `src/**/*.js`, not a JSX parse.
- Did not edit the repo, the framework DB or any site.
