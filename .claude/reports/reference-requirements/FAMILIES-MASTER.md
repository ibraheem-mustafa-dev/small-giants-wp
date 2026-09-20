# Reference requirements — master capability families (W3B-4 merge)

**Inputs:** `families-A.json` (header shell, bar, footer — 25), `families-B.json` (dropdown, mega, trigger and close — 25), `families-C.json` (drawer — 24), plus each group's `.md`. **Output of:** plan unit W3B-4, merge step. **Feeds:** W3B-5 (Bean signs off the family list and the order) and Wave 3C.

**74 source families merged to 50 masters** — 13 covered, 24 partial, 8 gap, 5 conflict. Every source id resolves to exactly one master (splits are named). Reference counts are out of the 13-reference roster: away, buck, butcherbox, dogstudio, fantasy, halcyon, indus-foods, lamalama, lusion, rabbit, resn, studionamma, wearecollins.

**Reading the status column.** *covered* = an existing block attribute expresses every measured value. *partial* = the mechanism exists and named values fall outside it. *gap* = nothing in the tree does this. *conflict* = something IS built and it fights a measured reference — which is not the same as missing, and three of the five are SGS being more accessible than its reference by design.

## Master families

| id | name | needed by | status | evidence | sources |
|---|---|---|---|---|---|
| M-01 | Header pin mode on scroll | 9 of 13 | covered | measured | F-A-01 |
| M-02 | Header shell archetype and width | 9 of 13 | partial | measured | F-A-02 |
| M-03 | Scroll-state restyle (rest paint vs scrolled paint) | 4 of 13 | partial | measured | F-A-06 |
| M-04 | Section-adaptive ink | 5 of 13 | gap | mixed | F-A-05 |
| M-05 | Row track layout and rail alignment (header and footer) | 7 of 13 | covered | measured | F-A-07 |
| M-06 | Stacked header rows (a strip above, below or off the bar) | 3 of 13 | partial | measured | F-A-08 |
| M-07 | Self-changing header message (carousel, random, live clock) | 3 of 13 | gap | thin | F-A-09 |
| M-08 | Detached fixed controls, incl. a trigger that outlives its header | 5 of 13 | gap | measured | F-A-19, F-B-24, F-A-02, F-A-08 |
| M-09 | Header stacking order (z-index) | 9 of 13 | conflict | measured | F-A-21 |
| M-10 | Pointer-tracking label magnet on bar items | 2 of 13 | partial | measured | F-A-14 |
| M-11 | Header and footer entrance animation | 6 of 13 | partial | thin | F-A-20 |
| M-12 | Footer archetype | 11 of 13 | covered | mixed | F-A-22 |
| M-13 | Surface ground: fill, opacity, blur, radius, border, shadow | 13 of 13 | partial | measured | F-A-03, F-A-04, F-B-05, F-C-04, F-C-05, F-A-23 |
| M-14 | Surface scrim (viewport dimmer behind an open surface) | 6 of 13 | gap | measured | F-B-06, F-C-06 |
| M-15 | Background media layer on a surface (image, video, per-link visual) | 7 of 13 | partial | measured | F-A-23, F-C-07 |
| M-16 | Panel geometry: width, horizontal anchor, top offset | 6 of 13 | partial | mixed | F-B-02, F-B-03, F-B-04 |
| M-17 | Drawer anchor archetype and width cap | 13 of 13 | partial | measured | F-C-02, F-C-03 |
| M-18 | Utility and furniture block roster (bar, drawer, footer) | 13 of 13 | partial | measured | F-A-10, F-A-24, F-C-15 |
| M-19 | Per-tier role migration and secondary-block visibility | 10 of 13 | partial | mixed | F-C-23 |
| M-20 | Panel side rail and callout tiles | 3 of 13 | partial | measured | F-B-08 |
| M-21 | Item hover paint (the hovered element itself) | 11 of 13 | partial | mixed | F-A-12, F-B-11, F-C-12 |
| M-22 | Per-item ornament and per-item media slot | 8 of 13 | partial | measured | F-A-16, F-B-12, F-C-08, F-C-07 |
| M-23 | Current-page indicator | 3 of 13 | covered | measured | F-A-17, F-C-13 |
| M-24 | Sibling dim on hover (the hovered item is not what changes) | 2 of 13 | gap | thin | F-A-13, F-C-12 |
| M-25 | Two-copy label roll | 2 of 13 | gap | measured | F-A-12, F-C-12, F-B-21 |
| M-26 | Header chrome persistence while the menu is open | 13 of 13 | covered | measured | F-C-17, F-B-19 |
| M-27 | Close-control model | 13 of 13 | covered | measured | F-B-19, F-C-16 |
| M-28 | Hover-reactive preview rail | 1 of 13 | covered | measured | F-B-09 |
| M-29 | Pointer-following light inside the panel | 1 of 13 | covered | measured | F-B-10 |
| M-30 | Row separators between menu items | 3 of 13 | partial | mixed | F-C-09 |
| M-31 | Panel and drawer entry and exit animation | 13 of 13 | partial | mixed | F-B-15, F-C-21 |
| M-32 | Per-item entry stagger | 6 of 13 | gap | mixed | F-C-22, F-B-15 |
| M-33 | Logo rendering substrate and per-tier swap | 8 of 13 | partial | thin | F-A-25 |
| M-34 | Dismissal routes (every way the menu can be shut) | 13 of 13 | conflict | measured | F-B-16, F-B-25, F-C-18 |
| M-35 | Modality: background scroll lock, focus trap, dialog semantics | 13 of 13 | conflict | measured | F-B-25, F-C-19, F-B-16 |
| M-36 | Trigger element semantics, accessible name and open state | 11 of 13 | conflict | measured | F-B-22 |
| M-37 | Close-control placement relative to the burger | 6 of 13 | partial | measured | F-B-20 |
| M-38 | Trigger-to-close transition motion | 12 of 13 | partial | mixed | F-B-21, F-C-16 |
| M-39 | Menu trigger form and placement in the bar | 13 of 13 | partial | measured | F-A-18, F-B-18 |
| M-40 | Collapse breakpoint: bar nav, trigger and drawer presence per tier | 13 of 13 | covered | measured | F-A-11, F-B-17, F-C-01 |
| M-41 | Panel ownership per bar item | 6 of 13 | covered | measured | F-B-01 |
| M-42 | Panel content shape (columns / cards / minimal / logo grid) | 6 of 13 | covered | measured | F-B-07 |
| M-43 | Panel open trigger mode (hover-intent vs click) | 5 of 13 | partial | mixed | F-B-13 |
| M-44 | Open intent delay and close grace | 3 of 13 | partial | measured | F-B-14 |
| M-45 | Item type scaling mode (bar, drawer, footer) | 13 of 13 | partial | measured | F-A-15, F-C-10 |
| M-46 | Drawer list layout: columns, alignment and row pitch | 12 of 13 | partial | measured | F-C-11 |
| M-47 | Submenu model inside the drawer (single-open vs multi-open) | 5 of 13 | conflict | measured | F-C-14 |
| M-48 | Internal scrolling of the drawer's own content | 4 of 13 | covered | mixed | F-C-20 |
| M-49 | Open-state survival across a viewport change | 10 of 13 | gap | mixed | F-C-24 |
| M-50 | Trigger and close target size | 13 of 13 | covered | measured | F-B-23 |

### What each family needs, in one line

- **M-01 Header pin mode on scroll** — All three are per-tier tri-state objects, so wearecollins' iOS-only-at-375 case and dogstudio's hide/reveal both land. Covered by: `sgs/site-header::headerSticky`, `sgs/site-header::headerHideOnScroll`, `sgs/site-header-row::rowHideOnScroll`
- **M-02 Header shell archetype and width** — Full-bleed, capped-inner and the floating pill are all built. Covered by: `sgs/site-header::headerFloat`, `::headerFloatInset`, `::headerFloatCollapse`, `::maxWidth`
- **M-03 Scroll-state restyle (rest paint vs scrolled paint)** — Transparent-at-rest / solid-once-scrolled is fully covered per tier and per row. Covered by: `sgs/site-header::headerTransparent`, `::headerTransparentDirection`, `::backgroundColourScrolled`, `::textColourScrolled`
- **M-04 Section-adaptive ink** — contrastSafe is an advisory scrim behind the header's OWN text and never reads the section behind it. Covered by: *nothing*
- **M-05 Row track layout and rail alignment (header and footer)** — One mechanism, identical attribute set on both row blocks. Covered by: `sgs/site-header-row::layout`, `::columns`, `::gridTemplateColumns`, `::justifyContent`
- **M-06 Stacked header rows (a strip above, below or off the bar)** — Multiple rows with their own slot, paint and hide-on-scroll are covered (away's two-row wrapper, butcherbox's independently scrolling banner). Covered by: `sgs/site-header (InnerBlocks of sgs/site-header-row)`, `sgs/site-header-row::rowSlot`, `::rowHideOnScroll`, `sgs/notice-banner::stickyPosition`
- **M-07 Self-changing header message (carousel, random, live clock)** — notice-banner holds ONE string with one colour set. Covered by: `sgs/notice-banner::text (one static string only)`
- **M-08 Detached fixed controls, incl. a trigger that outlives its header** — MERGED: group A recorded 'the trigger detaches to fixed once scrolled' as one value of F-A-19 and group B gave the same buck behaviour its own family F-B-24. Covered by: *nothing*
- **M-09 Header stacking order (z-index)** — VERIFIED: site-header/render.php emits 'z-index' => '100' in all three tri-state branches and style.css:25 sets z-index:100. Covered by: `sgs/site-header (z-index hardcoded 100; NO attribute)`
- **M-10 Pointer-tracking label magnet on bar items** — VERIFIED: itemMagnetStrength and itemMagnetRadius are ABSENT while triggerMagnetStrength (default 24) and triggerMagnetRadius (default 120) exist. Covered by: `sgs/nav-bar-menu::itemMagnetEnabled (boolean only)`
- **M-11 Header and footer entrance animation** — VERIFIED: site-header and site-footer both declare supports.sgs.hideExtensions ['fx'], so the generic Spec 38 picker is deliberately hidden on them; only the footer row has a scrubbed reveal. Covered by: `sgs/site-footer-row::fxFooterStagger`
- **M-12 Footer archetype** — All five shapes are rows of blocks, and 'absent' is covered by carrying no footer template part. Covered by: `sgs/site-footer::layout`, `::columns`, `::minHeight`, `::contentWidth`
- **M-13 Surface ground: fill, opacity, blur, radius, border, shadow** — MERGED across header, panel, drawer and footer: one ground vocabulary, per the composite-mirror rule. Covered by: `sgs/site-header::backgroundColour/-Gradient/::backdropBlur/::border*/::shadow`, `sgs/mega-panel::panelBg/::bgBlur/::borderRadius/::border*`, `sgs/nav-drawer::drawerBg/::surfaceOpacity/::surfaceBlur/::borderRadius`, `sgs/site-footer::backgroundColour/-Gradient`
- **M-14 Surface scrim (viewport dimmer behind an open surface)** — MERGED: group B found no scrim element on the panel fork, group C found a hardcoded one on the drawer. Covered by: `(drawer scrim exists but is hardcoded; the panel fork has no scrim at all)`
- **M-15 Background media layer on a surface (image, video, per-link visual)** — Static image layers, per-tier background video and a tinted overlay are covered (studionamma's looping footer video, fantasy's white-panel-over-black-90%, dogstudio's drawer image layer). Covered by: `sgs/site-footer::backgroundImage*/::bgVideo*/::backgroundOverlay*`, `sgs/nav-drawer::backgroundImage/::backgroundSize/::backgroundPosition`
- **M-16 Panel geometry: width, horizontal anchor, top offset** — MERGED (three geometry columns, one panel-positioning mechanism). Covered by: `sgs/mega-panel::maxWidth`, `sgs/nav-bar-menu::submenuMinWidth`, `::submenuAlign`, `::submenuTopOffset`
- **M-17 Drawer anchor archetype and width cap** — MERGED (the cap is only meaningful under a non-full-screen anchor). Covered by: `sgs/nav-drawer::anchor (full-screen|header|trigger|centred)`, `::panelSize`
- **M-18 Utility and furniture block roster (bar, drawer, footer)** — MERGED: the same missing blocks recur in the bar, the drawer and the footer, so it is one build. Covered by: `sgs/cart`, `sgs/button`, `sgs/multi-button`, `sgs/form`
- **M-19 Per-tier role migration and secondary-block visibility** — The MENU's own degrade is covered (one menu renders as a bar above collapsePoint and an accordion below, with a per-item mega opt-out). Covered by: `sgs/nav-bar-menu::featuredItemIds`, `sgs/nav-drawer-menu::megaDrawerFallbackIds`, `::ref`
- **M-20 Panel side rail and callout tiles** — VERIFIED: allowed_formats = ('feature','preview','cta') at mega-aside/render.php:47 — one value each for halcyon's feature card, halcyon's preview pane and indus's Own Brands CTA. Covered by: `sgs/mega-aside::asideFormat (feature|preview|cta)`, `sgs/mega-panel::asideWidth (default 340px)`, `::asideSeparator`
- **M-21 Item hover paint (the hovered element itself)** — MERGED across bar, panel and drawer: buck's 1 -> 0.5 opacity fade appears on the BAR (group A) and in the DRAWER (group C) as the same value, and one attribute covers both. Covered by: `sgs/nav-bar-menu::itemBgHoverTreatment/::itemBgHover/::itemColourHover/::itemFontWeightHover/::itemTextDecorationHover`, `sgs/nav-drawer-menu::item*Hover (14 hover rows)`, `sgs/nav-bar-menu::submenu*Hover`, `sgs/mega-panel::iconBackgroundHover`
- **M-22 Per-item ornament and per-item media slot** — MERGED: the caret on panel-owning items, the icon-host tile, the index number and the leading glyph are one ornament vocabulary and the gaps are identical on the panel and the drawer. Covered by: `sgs/nav-bar-menu::submenuCaret`, `sgs/mega-panel::iconBackground/::iconColour (+hover pair)`, `sgs/nav-drawer-menu::sublinkMarker* (7 attrs)`
- **M-23 Current-page indicator** — MERGED (same mechanism on both menu blocks). Covered by: `sgs/nav-bar-menu::item*Current (6 attrs)`, `sgs/nav-drawer-menu::item*Current (6 attrs)`
- **M-24 Sibling dim on hover (the hovered item is not what changes)** — MERGED: group A found it on wearecollins' footer and group C on wearecollins' drawer, plus resn's per-item canvas dissolve (the hovered item holds its lit-pixel count while the others lose 40-98%). Covered by: *nothing*
- **M-25 Two-copy label roll** — SPLIT OUT of the hover families because it is markup, not paint: the item needs a SECOND label copy and a paired transform (studionamma's bar label rises out as an alternate slides in; lusion's drawer text rolls up to a clone; lusion's trigger label slides out as the new one slides in). Covered by: *nothing*
- **M-26 Header chrome persistence while the menu is open** — All three regimes are expressible: header-live-above = non-modal (show() plus freezeBackground's selective inert); drawer-covers-header = modal full-screen; drawer-below-header = the `header` anchor, whose CSS reads the header's measured bottom at open time. Covered by: `sgs/nav-drawer::modality (modal|non-modal)`, `::anchor`
- **M-27 Close-control model** — MERGED: both groups clustered the same column and both read 'covered'. Covered by: `sgs/nav-drawer::closeStyle (separate-x|text-swap|burger-morph|icon-and-text)`, `::closeIcon`, `::closeLabel`
- **M-28 Hover-reactive preview rail** — asideFormat='preview' is exactly this behaviour: render.php hides the media/label/button children and view.js swaps the heading and text on hover/focus of a sibling link, restoring the authored default when nothing is hovered (VERIFIED: the 'preview' branch exists). Covered by: `sgs/mega-aside::asideFormat = 'preview'`
- **M-29 Pointer-following light inside the panel** — fxEffect is PHP-validated against '' | cursor-field | particles | grid-dots | wave-gradient, and block.json records a pre-existing always-on .sgs-mega-aside cursor spotlight — which is halcyon's behaviour itself. Covered by: `sgs/mega-panel::fxEffect`, `::fxFieldType`, `::fxFieldShape`, `::fxFieldColour`
- **M-30 Row separators between menu items** — A bottom-only rule is reachable through the object-typed itemBorderWidth if the operator zeroes three sides, but the DRAWER has no separator control of its own while the BAR block carries a dedicated itemSeparator quintet (Width/Style/Colour/ColourHover/SweepAngle). Covered by: `sgs/nav-drawer-menu::itemBorderWidth/::itemBorderStyle/::itemBorderColour`
- **M-31 Panel and drawer entry and exit animation** — MERGED: both are 'how the nav surface arrives and leaves', and both are an enum with no duration and no easing. Covered by: `sgs/nav-bar-menu::submenuAnimation (none|fade|slide-down)`, `sgs/nav-drawer::animateFrom (auto|fade)`
- **M-32 Per-item entry stagger** — MERGED: the mega panel HAS staggerOnOpen (mapping to the shared stagger module's data-stagger); the DRAWER has nothing. Covered by: `sgs/mega-panel::staggerOnOpen (panel only)`
- **M-33 Logo rendering substrate and per-tier swap** — A different mark per tier with its own switch point, per-tier max sizes, a home link and a stroke-draw animation (FR-38-15, owned by the block) all land. Covered by: `sgs/responsive-logo::logoId/-Tablet/-Mobile`, `::logoSwitchMode`, `::logoSwitchCustomPx`, `::maxWidth`
- **M-34 Dismissal routes (every way the menu can be shut)** — MERGED across the panel and the drawer, and resolved to CONFLICT (see 'What I changed'). Covered by: `(Escape, outside-click and Tab-off are shipped UNCONDITIONALLY, with no attribute)`
- **M-35 Modality: background scroll lock, focus trap, dialog semantics** — MERGED and resolved to CONFLICT. Covered by: `sgs/nav-drawer::modality (modal|non-modal)`, `::ariaLabel`
- **M-36 Trigger element semantics, accessible name and open state** — VERIFIED: every trigger is emitted as <button type="button" . Covered by: `sgs/nav-bar-menu::triggerLabel`, `::navLabel`, `sgs/nav-drawer::closeLabel`, `::ariaLabel`
- **M-37 Close-control placement relative to the burger** — closeSize (default 44px, mirroring burgerSize) covers indus's 38x38 close against a 44x44 burger. Covered by: `sgs/nav-drawer::closeSize (covers the SIZE difference)`
- **M-38 Trigger-to-close transition motion** — MERGED (group C flagged the same shortfall inside its close-model family). Covered by: `sgs/nav-drawer::closeStyle = 'burger-morph' | 'text-swap'`
- **M-39 Menu trigger form and placement in the bar** — MERGED — and the two groups DISAGREED on status (A partial, B covered); resolved to PARTIAL (see 'What I changed'). Covered by: `sgs/nav-bar-menu::triggerMode (icon|text|icon-and-text)`, `::triggerIcon`, `::triggerLabel`, `::burger* paint row`
- **M-40 Collapse breakpoint: bar nav, trigger and drawer presence per tier** — MERGED: all three groups clustered the same breakpoint from three surfaces and all three read 'covered'. Covered by: `sgs/nav-bar-menu::collapsePoint (number, default 768)`, `::showBurger`
- **M-41 Panel ownership per bar item** — A bar item owns a mega panel only when it is bound to a mega-menu CPT post; unbound childless items render as plain links, which is exactly the panel-less item both drafts show. Covered by: `sgs/nav-bar-menu::ref`, `::submenuCaret`, `sgs/mega-panel::variant`, `::style`
- **M-42 Panel content shape (columns / cards / minimal / logo grid)** — style is validated against exactly the three presets halcyon carries (the block was designed from that draft) and the brands variant renders indus's logo grid. Covered by: `sgs/mega-panel::style (columns|cards|minimal)`, `::variant (general|media-cards|brands)`, `::headings`, `::groupGap`
- **M-43 Panel open trigger mode (hover-intent vs click)** — mega-disclosure.js opens on hover-intent when '(hover:hover) and (pointer:fine)' matches and on tap otherwise, plus keyboard throughout — so the hover-or-focus value (away, halcyon, indus) is the shipped default. Covered by: `(no attribute; the behaviour is a matchMedia gate in mega-disclosure.js)`
- **M-44 Open intent delay and close grace** — BUG CONFIRMED: includes/nav-menu-markup.php builds the MEGA interactivity context with a literal "'closeGrace'  => 170," while the dropdown branch passes "'closeGrace'  => $submenu['close_grace'],"; nav-bar-menu/render.php resolves 'close_grace' from the attribute with a 170 fallback. Covered by: `sgs/nav-bar-menu::submenuCloseGrace (dropdown fork only)`
- **M-45 Item type scaling mode (bar, drawer, footer)** — MERGED: one typography mechanism across three surfaces and the same three gaps on each. Covered by: `sgs/nav-bar-menu::itemFontSize/::itemFontSizeUnit`, `sgs/nav-drawer-menu::itemFontSize/::itemFontSizeUnit/::itemLineHeight`, `sgs/business-info::fontSize`
- **M-46 Drawer list layout: columns, alignment and row pitch** — Column count is per-tier (studionamma's 2-col-at-1440-only, wearecollins' grid) and alignment is left/centre/right. Covered by: `sgs/nav-drawer-menu::listColumns (per-tier)`, `::itemTextAlign`, `::gap`, `::padding`
- **M-47 Submenu model inside the drawer (single-open vs multi-open)** — VERIFIED: the markup builder emits '<details class="sgs-nav-drawer-menu__accordion" name="sgs-nav-drawer-menu-accordion-...">' — a named <details> group is EXCLUSIVE by construction, so opening one row closes its siblings with no attribute to turn it off. Covered by: `sgs/nav-drawer::submenuModel (accordion|drill-down)`
- **M-48 Internal scrolling of the drawer's own content** — Every anchor already caps the panel at the viewport (max-height:calc(100dvh - offset)), and with a bounded max-height the body element scrolls the overflow — which is the capability all four measured references need. Covered by: `sgs/nav-drawer::anchor (via the max-height each anchor emits)`
- **M-49 Open-state survival across a viewport change** — VERIFIED: store.js contains ZERO occurrences of 'resize' — nothing in the drawer path listens for a viewport crossing collapsePoint (the resize listener that does exist is mega-disclosure.js's, for repositioning a panel). Covered by: *nothing*
- **M-50 Trigger and close target size** — Both are CSS length strings defaulting to the project's WCAG floor, so every measured size is a literal value. Covered by: `sgs/nav-bar-menu::burgerSize (default 44px)`, `sgs/nav-drawer::closeSize (default 44px)`
*(Full notes, per-reference `needed_by` lists and provenance: `families-master.json`.)*

## Wave 3C build units

Ordered by reference support and dependency. `independent` means the unit's files are disjoint from every other unit's, so it can be dispatched in parallel. Size is low / medium / high only.

| # | id | unit | families | support | independent | size |
|---|---|---|---|---|---|---|
| 1 | U-1 | De-hardcode the nav surfaces (literals become attributes) | M-44, M-09, M-13, M-21 | up to 13 of 13 | yes | medium |
| 2 | U-2 | Surface scrim on the panel and the drawer | M-14 | up to 6 of 13 | yes | medium |
| 3 | U-3 | Drawer anchor: side edge and container-inset, plus the pitch tier object | M-17, M-46 | up to 13 of 13 | yes | medium |
| 4 | U-4 | Type scaling mode: a formula unit and per-tier line-height | M-45 | up to 13 of 13 | yes | medium |
| 5 | U-5 | Entry and exit animation vocabulary (shape, duration, easing, stagger) | M-31, M-32, M-38 | up to 13 of 13 | **no** | high |
| 6 | U-6 | Item hover parity: opacity, padding shift, sibling dim, label roll, separators | M-21, M-24, M-25, M-30 | up to 11 of 13 | yes | high |
| 7 | U-7 | Per-item ornament and per-item media slot | M-22, M-15 | up to 8 of 13 | yes | medium |
| 8 | U-8 | Panel geometry controls: anchor enum and a mega top offset | M-16, M-20 | up to 6 of 13 | yes | medium |
| 9 | U-9 | Open mode, dismissal and resize policy | M-43, M-34, M-35, M-36, M-47, M-49 | up to 13 of 13 | yes | medium |
| 10 | U-10 | Role migration: move a non-menu header block into the drawer per tier | M-19 | up to 10 of 13 | yes | medium |
| 11 | U-11 | Close-control placement and the magnet companions | M-37, M-10 | up to 6 of 13 | yes | low |
| 12 | U-12 | Missing furniture blocks | M-18 | up to 13 of 13 | yes | high |
| 13 | U-13 | Header scroll intelligence: direction-keyed restyle and section-adaptive ink | M-03, M-04 | up to 5 of 13 | **no** | high |
| 14 | U-14 | Detached controls, the shell-less header and a trigger that outlives it | M-08, M-02, M-06, M-39 | up to 13 of 13 | **no** | high |
| 15 | U-15 | Self-changing header message | M-07 | up to 3 of 13 | yes | medium |
| 16 | U-16 | Header and footer entrance animation | M-11 | up to 6 of 13 | yes | medium |
| 17 | U-17 | Logo substrate (Lottie / live canvas) | M-33 | up to 8 of 13 | yes | high |

**U-1 De-hardcode the nav surfaces (literals become attributes)** — One mechanism: every one of these is a literal in a render.php or style.css that overrides faithfully-transferred CSS, which the project's own rule calls a cheat to remove or gate. Highest reference support in the whole list and the cheapest pass. Its FIRST commit is the submenuCloseGrace mega wiring bug (one line).
Files: `plugins/sgs-blocks/includes/nav-menu-markup.php`, `plugins/sgs-blocks/src/blocks/site-header/render.php`, `plugins/sgs-blocks/src/blocks/site-header/style.css`, `plugins/sgs-blocks/src/blocks/site-header/block.json`, `plugins/sgs-blocks/src/blocks/mega-panel/render.php`, `plugins/sgs-blocks/src/blocks/mega-panel/style.css`, `plugins/sgs-blocks/src/blocks/mega-panel/block.json`

**U-2 Surface scrim on the panel and the drawer** — One attribute set (colour, alpha, blur, click-closes, per tier) on two blocks; the drawer already has the element and needs parameterising, the panel fork needs the element. Design-gate: shared mechanism (rule 7).
Files: `plugins/sgs-blocks/src/blocks/mega-panel/render.php`, `plugins/sgs-blocks/src/blocks/mega-panel/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer/style.css`, `plugins/sgs-blocks/src/blocks/nav-drawer/render.php`, `plugins/sgs-blocks/src/blocks/nav-drawer/block.json`, `plugins/sgs-blocks/src/shared/nav-interactivity/store.js`

**U-3 Drawer anchor: side edge and container-inset, plus the pitch tier object** — Both land in nav-drawer/render.php's per-anchor geometry closure and nav-drawer-menu's layout attributes; the width cap is only meaningful once the side anchor exists.
Files: `plugins/sgs-blocks/src/blocks/nav-drawer/render.php`, `plugins/sgs-blocks/src/blocks/nav-drawer/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`

**U-4 Type scaling mode: a formula unit and per-tier line-height** — One typography emitter serves the bar, the drawer and the footer, so one change covers all three surfaces. Needed by all 13 references and the only family whose absence makes a clone drift at every width BETWEEN the measured tiers.
Files: `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`, `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`

**U-5 Entry and exit animation vocabulary (shape, duration, easing, stagger)** — One vocabulary across the panel, the drawer and the trigger glyph; the stagger is the same per-index delay the mega fork already has and the drawer has not. Serial against U-2 (both touch nav-drawer). Design-gate: shared runtime.
Files: `plugins/sgs-blocks/src/blocks/nav-drawer/style.css`, `plugins/sgs-blocks/src/blocks/nav-drawer/render.php`, `plugins/sgs-blocks/src/blocks/nav-drawer/block.json`, `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css`, `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `plugins/sgs-blocks/src/blocks/mega-panel/block.json`, `plugins/sgs-blocks/src/shared/nav-interactivity/`

**U-6 Item hover parity: opacity, padding shift, sibling dim, label roll, separators** — All four are item-state attributes on the two menu blocks plus mega-panel; sibling dim and the label roll are the only two that need markup or a scoped rule rather than a value. Note M-21 also appears in U-1 for its hardcoded card lift — U-1 removes the literal, U-6 adds the new states.
Files: `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/style.css`, `plugins/sgs-blocks/includes/nav-menu-markup.php`, `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`

**U-7 Per-item ornament and per-item media slot** — The index counter, the leading glyph and the per-link thumbnail are one per-item slot on the markup builder, per tier; the background-media half is already covered and only the per-link case is open.
Files: `plugins/sgs-blocks/includes/nav-menu-markup.php`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`, `plugins/sgs-blocks/src/blocks/mega-group/`, `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`

**U-8 Panel geometry controls: anchor enum and a mega top offset** — Both are mega-panel positioning: the anchor enum (item-left | item-centred | header-wide | capped-centred) and the aside/callout column count land in the same wrap CSS and the same block.json.
Files: `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`, `plugins/sgs-blocks/src/blocks/mega-panel/block.json`, `plugins/sgs-blocks/src/blocks/mega-panel/render.php`, `plugins/sgs-blocks/src/blocks/mega-aside/render.php`

**U-9 Open mode, dismissal and resize policy** — Mostly DECISION-led and then small: one open-mode enum, one close-on-scroll attribute, one accordion-exclusivity boolean, one resize policy. The three conflict families ship no new capability at all — they ship a recorded divergence. Depends on DEC-02, DEC-08 and DEC-09.
Files: `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer/block.json`, `plugins/sgs-blocks/includes/nav-menu-markup.php`, `plugins/sgs-blocks/src/shared/nav-interactivity/store.js`, `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js`

**U-10 Role migration: move a non-menu header block into the drawer per tier** — A per-tier visibility/migration capability on header children, so a CTA, a search control or a store selector can be authored once and appear in either surface. Today the only route is duplicating the block by hand.
Files: `plugins/sgs-blocks/src/blocks/site-header-row/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer/render.php`, `plugins/sgs-blocks/includes/nav-menu-markup.php`

**U-11 Close-control placement and the magnet companions** — Two small attribute additions with the read side already built: a close-placement enum plus an offset pair on nav-drawer, and itemMagnetStrength/itemMagnetRadius mirroring the trigger's pair.
Files: `plugins/sgs-blocks/src/blocks/nav-drawer/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer/render.php`, `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`

**U-12 Missing furniture blocks** — Eight new blocks plus two headerEssential flags. Entirely disjoint from every nav file, so it parallelises against everything; the widest single build gap and ordinary commercial furniture rather than art direction.
Files: `plugins/sgs-blocks/src/blocks/<new: local-time, language-switch, store-selector, back-to-top, wishlist, account-link, theme-toggle, sound-toggle>/`, `plugins/sgs-blocks/src/blocks/product-search/block.json`, `plugins/sgs-blocks/src/blocks/filter-search/block.json`

**U-13 Header scroll intelligence: direction-keyed restyle and section-adaptive ink** — Both need the header to OBSERVE something it does not today (scroll direction; the section passing behind it). One observer serves both. Serial against U-1 (same render.php) and design-gated as a shared mechanism.
Files: `plugins/sgs-blocks/src/blocks/site-header/render.php`, `plugins/sgs-blocks/src/blocks/site-header/block.json`, `plugins/sgs-blocks/src/blocks/site-header/view.js`, `plugins/sgs-blocks/src/blocks/site-header/style.css`

**U-14 Detached controls, the shell-less header and a trigger that outlives it** — One structural change to what a header may contain: a child pinned to a viewport edge with its own z-index and threshold. It decides whether resn is clonable as a header at all, and it absorbs the whole-bar-as-trigger shape. Serial against U-1 and U-13; design-gate.
Files: `plugins/sgs-blocks/src/blocks/site-header/render.php`, `plugins/sgs-blocks/src/blocks/site-header-row/block.json`, `plugins/sgs-blocks/src/blocks/site-header-row/render.php`, `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`

**U-15 Self-changing header message** — A slide collection with per-slide colour pair, a rotation timer, prev/next controls and a random-per-load source on sgs/notice-banner. Disjoint from every nav file.
Files: `plugins/sgs-blocks/src/blocks/notice-banner/block.json`, `plugins/sgs-blocks/src/blocks/notice-banner/render.php`, `plugins/sgs-blocks/src/blocks/notice-banner/view.js`

**U-16 Header and footer entrance animation** — Unhide the fx picker on site-header/site-footer (or give them their own entrance attribute) and add a preloader-gated start. Ordered LAST of the build units because its evidence is thin — every footer motion cell is not_measured. Depends on DEC-05 (re-measure first).
Files: `plugins/sgs-blocks/src/blocks/site-header/block.json`, `plugins/sgs-blocks/src/blocks/site-footer/block.json`, `plugins/sgs-blocks/src/blocks/site-footer-row/block.json`

**U-17 Logo substrate (Lottie / live canvas)** — A new runtime with no Spec 38 tier, needed by two references for a decorative mark. Recommended OUT of Wave 3C pending DEC-13; listed so it is not silently dropped.
Files: `plugins/sgs-blocks/src/blocks/responsive-logo/block.json`, `plugins/sgs-blocks/src/blocks/responsive-logo/render.php`

## Decisions for Bean

Each needs the owner's call rather than engineering. Recommendation given for every one.

**DEC-01 — resn's page-wide WebGL scene and its canvas-drawn menu labels** *(M-08, M-15, M-24, M-31)*
resn's whole header is four independently pinned controls with no <header>, its menu labels are per-item 2D canvases (no DOM text at 375 at all), and its background is a persistent three.js scene. Its own teardown records that no built Spec 38 effect matches and that the scene passes no Tier W test. Cloning canvas labels would DELETE real text, which the framework must not do.
- (a) Trim resn from the 13-reference clone roster and build M-08 for the other four references that need it.
- (b) Keep resn as the 13th clone: build M-08, render the labels as real DOM text, and approximate the scene with a Tier V or an existing fx field; record the divergence.
- (c) Admit a new Tier W page-background scene for it under Spec 38 §1's five-part test.
**Recommendation:** (b). It keeps the roster at 13 and keeps M-08 (needed by five references, not one) on its merits, without a tier admission that would have to be justified for one page. The canvas-label divergence is recorded the same way as the accessibility ones.

**DEC-02 — Accessibility divergences: a faithful clone would be LESS accessible than its reference** *(M-34, M-35, M-36, M-50)*
9 of 13 triggers omit aria-expanded, 2 are unfocusable <div>s, buck's button has no accessible name, wearecollins' aria-controls dangles; 7 references do not close on Escape; 6 let the page scroll behind an open drawer; 6 let Tab leave; 10 of 13 fail the 44px target. SGS emits the accessible pole of every one of these and cannot emit the other.
- (a) Keep SGS's accessible default everywhere; record each divergence at clone time so Bean's eye does not read a correct clone as wrong.
- (b) Add opt-outs so a clone can reproduce the reference exactly.
- (c) Decide per clone.
**Recommendation:** (a), with ONE carve-out: lamalama's close-on-scroll is a design choice, not an a11y defect, so it gets an attribute (in U-9). wearecollins' 'm' hotkey and resn's history-back closer are also not defects but are single-reference and can wait.

**DEC-03 — Which Away storefront is the reference** *(M-13, M-18, M-19, M-42)*
away.json describes the US storefront the headless run received; a headed Chrome is served UK (GBP, /en-gb, the first two nav items swapped, no consent banner). 12 of 55 static cells differ, 7 of them from the 15px classic scrollbar alone. Structure is identical, so no family changes.
- (a) UK.
- (b) US.
**Recommendation:** (a) UK — already decided. Consequence to act on: away's copy cells in the JSON must NOT be cloned verbatim, and away's rows want a UK re-read before Wave 4.

**DEC-04 — butcherbox and rabbit were never captured at 768, and rabbit's dropdown was never opened** *(M-16, M-30, M-31, M-43, M-44, M-48, M-49)*
The emulated pass covered 375 and 1440 only for both references, rabbit's footer was never captured, and rabbit's open dropdown was never reproduced from synthetic pointer events, so its scrim, motion, close grace and item states read as absent-because-unmeasured.
- (a) Re-capture the 768 tier for both plus rabbit's open dropdown and footer before Wave 4; proceed with Wave 3C now on the families that do not depend on them.
- (b) Mark the affected families thin and proceed to Wave 4 as-is.
- (c) Drop the two references.
**Recommendation:** (a). It is a short headed run and it is the difference between 11 of 13 and 13 of 13 on seven families.

**DEC-05 — Footer hover and footer motion were never measured on any reference** *(M-11, M-24)*
Every footer motion cell and most footer item_states cells are not_measured across eight references. M-11 therefore rests on class names (appear-fade-up, grow-appear) and M-24's footer half rests on one measured drawer case.
- (a) A short re-measure pass (drive footer hover, sample one reveal) before U-16 is designed.
- (b) Build U-16 from the class names and accept the risk.
- (c) Defer U-16 to Wave 4.
**Recommendation:** (a). It is the cheapest way to raise two families from thin to measured, and U-16 is last in the order anyway.

**DEC-06 — The z-index attribute's default value** *(M-09)*
Making z-index an attribute is not in question (a hardcoded wrapper default that overrides transferred CSS is a cheat to remove). What needs a call is the DEFAULT: eleven values were measured from 9 to 10000 plus 'auto'. Pre-production, so 'it would change what the canary renders' is not an argument.
- (a) Per-tier attribute, default 100 (today's value preserved).
- (b) Per-tier attribute, default unset, header falls back to style.css.
- (c) Per-tier attribute with a small named scale.
**Recommendation:** (a). It is the only option that cannot regress an existing composed header while making all eleven measured values reachable, and wearecollins needs the per-tier half (999 at 375, 9 above).

**DEC-07 — buck's fill is re-picked on every page LOAD, not per tier** *(M-13, M-15)*
Three colours appeared in one run for the footer and again for the drawer panel. It looks like a responsive value and is not. SGS stores one colour and PHP emits it verbatim, so a clone freezes whichever colour the capture saw. The attribute is right; its SUPPLY is the gap.
- (a) Out of scope: the clone freezes one colour and the divergence is recorded.
- (b) Build a random-palette value supply (a colour LIST plus a per-request pick).
**Recommendation:** (a). One reference, and a per-request random value fights page caching on every SGS site.

**DEC-08 — Multi-open accordions in the drawer** *(M-47)*
A named <details> group is exclusive by construction — opening one row closes its siblings, with no attribute to turn it off. Single-open is right for lamalama, halcyon and indus, but away@768 measured two panels open at once, so the built default actively prevents a measured behaviour.
- (a) Add an accordionExclusive boolean; when false the markup drops the name attribute (a two-line change in the markup builder).
- (b) Declare single-open universal and record away as a deliberate divergence.
**Recommendation:** (a). The cost is two lines, the behaviour is neither an a11y defect nor a cheat, and a 'conflict' status is worth closing rather than carrying into Wave 4.

**DEC-09 — What the drawer does when the viewport crosses the collapse point while open** *(M-49)*
Seven references stay open and reflow, two deliberately close, and both drafts keep an open FLAG while the surface is not rendered. store.js listens for no resize at all, so SGS has one unstated behaviour where the references have three. A drawer left open while its trigger disappears is a trap.
- (a) Close the drawer when the viewport crosses collapsePoint; stay open and reflow otherwise. One rule, no attribute.
- (b) The same rule plus an attribute so the other two behaviours are reachable.
- (c) Leave it unstated.
**Recommendation:** (a). It is the safe behaviour, it matches away and fantasy, and the difference the other seven references would see is invisible unless someone resizes across the breakpoint with the drawer open.

**DEC-10 — For Bean's two drafts, clone the INTENT or the RENDER** *(M-01, M-31, M-32, M-34, M-35)*
halcyon and indus-foods declare sticky (an ancestor overflow-x:hidden stops it), a 340ms panel entry and a 420ms/55ms item stagger (a componentDidUpdate arity bug throws before either runs), and an Escape handler that only clears the desktop state. Source and render disagree on four separate things and both are recorded.
- (a) Clone the INTENT; the render is a bug in the draft's own runtime, not a requirement.
- (b) Clone the RENDER as measured.
- (c) Per row.
**Recommendation:** (a) — as all three source lists already assumed. Worth stating explicitly because it means the panel-entry shape in M-31 is a real requirement, not an artefact.

**DEC-11 — The two drafts' 768 rows are MOBILE, not tablet** *(M-40, M-45, M-46)*
halcyon collapses at 940 and indus-foods at 960, both breakpoint-verified to within 1px. Reading their 768 cells as a tablet tier would invent a tablet layout neither design has.
- (a) Read them as mobile throughout Wave 3C and Wave 4.
- (b) Re-capture both at a real tablet width (e.g. 1000px).
**Recommendation:** (a), and add (b) to the DEC-04 re-capture run if it happens anyway — a 1000px row would give those two drafts a genuine tablet tier for the first time.

**DEC-12 — Re-run /sgs-update before Wave 3C reads the DB for sgs/site-header** *(M-02, M-03, M-13)*
VERIFIED: six attributes exist in site-header/block.json and are rendered, but have no block_attributes row — backdropBlur, headerFloat, headerFloatCollapse, headerFloatInset, shadowScrolled, shadowScrolledColour. Anyone grading header coverage from /sgs-db alone would call the floating pill and the backdrop blur gaps. They are built.
- (a) Re-run /sgs-update before any Wave 3C unit reads the DB for this block.
- (b) Carry the block.json-is-truth caveat in every unit brief.
**Recommendation:** (a). (b) is a prose rule enforced nowhere, and this master list already had to override the DB twice.

**DEC-13 — Lottie and live-canvas logo substrates** *(M-33)*
buck's mark is a Lottie JSON and lamalama's is a live 2D canvas. Neither is an image, svgAnimationSource accepts a media-library .svg only, and inline SVG paste is banned as an XSS risk. Neither has a Spec 38 tier.
- (a) Out of Wave 3C: clone both as stills and record the divergence.
- (b) Admit a Lottie player and a canvas-2D mark (a new runtime plus a new tier admission).
**Recommendation:** (a). Two references, a decorative mark, and a new runtime is a poor trade against the eight missing furniture blocks in U-12.

**DEC-14 — Whole-bar-as-trigger (lamalama)** *(M-39, M-14)*
lamalama's entire header pill IS the menu button, and its opened pill IS the panel. SGS's trigger is always a discrete control inside the row. The panel half is already reachable (the --sgs-mm-panel-width override repositionPanel writes when the header measures as inset from both edges); the trigger half is not.
- (a) Add a triggerMode value meaning 'the row's own surface is the trigger' (U-14).
- (b) Clone lamalama with a discrete trigger and record the divergence.
**Recommendation:** (a). The pill header is already built and matches lamalama's measured box, so the surface-trigger is the one missing piece of an otherwise complete reference — and lamalama's large-hit-area pattern is the accessible one, which makes it worth having generally.

## What I changed from the three source lists and why

**Merged 74 source families into 50 masters.** Twenty-four source families were absorbed into a master that already expressed them. Every merge passes the brief's test — ONE block attribute or mechanism would express both sides. The large ones: the SCRIM (F-B-06 + F-C-06: the drawer's element is hardcoded, the panel has none, and one attribute set of colour/alpha/blur/click-closes serves both); SURFACE GROUND (F-A-03, F-A-04, F-B-05, F-C-04, F-C-05 and F-A-23's fill: one ground vocabulary mirrored across header, panel, drawer and footer, which is the composite-mirror rule); the COLLAPSE BREAKPOINT (F-A-11 + F-B-17 + F-C-01, all collapsePoint/showBurger read from three surfaces); TYPE SCALING (F-A-15 + F-C-10, one typography emitter and the same three gaps); the CLOSE-CONTROL MODEL (F-B-19 + F-C-16, one closeStyle enum); TRIGGER FORM (F-A-18 + F-B-18); DISMISSAL (F-B-16 + F-B-25 + F-C-18) and MODALITY (F-B-25 + F-C-19); ORNAMENT (F-A-16 + F-B-12 + F-C-08); HOVER PAINT (F-A-12 + F-B-11 + F-C-12); CURRENT-PAGE (F-A-17 + F-C-13); ENTRY MOTION (F-B-15 + F-C-21) and STAGGER (F-C-22 + F-B-15's staggerOnOpen).

**Kept apart where the mechanisms genuinely differ.** Panel geometry (M-16: a mega wrap positioned by custom properties) is NOT merged with drawer anchoring (M-17: a four-value anchor enum in a PHP geometry closure) — they share a column heading and nothing else. Header/footer ENTRANCE (M-11: the Spec 38 fx picker, deliberately hidden on both blocks) is NOT merged with panel/drawer entry (M-31: a disclosure animation enum). Trigger SEMANTICS (M-36, what element is emitted) is NOT merged with the dismissal set (M-34) or the background freeze (M-35): three different mechanisms behind one accessibility story.

**Split two source families because the mechanism inside them was not one mechanism.** F-C-12 (drawer item hover) held SELF hover, SIBLING dim and a two-copy text roll. Self hover is an existing attribute family (M-21), sibling dim needs a list-scoped rule nothing in the tree has (M-24), and the roll needs a SECOND label in the markup (M-25). Group A had already separated sibling dim as F-A-13, which is the tell. The same split pulls studionamma's bar label roll out of F-A-12 and lusion's trigger label roll out of F-B-21 into M-25.

**Resolved a status disagreement on the menu trigger: PARTIAL, not covered.** F-A-18 read partial and F-B-18 read covered for the same column. B is right that triggerMode covers the three shapes; A is right that two values are unreachable. Resolved to partial in M-39, with the two values placed where they belong: the DETACHED trigger (buck, resn) moves to M-08, and the residual gaps are triggerMode not being per-tier (VERIFIED: it is a plain string, so fantasy's label dropping at 375 is unreachable) and the whole-bar-as-trigger shape (lamalama).

**Resolved a status disagreement on accessibility: CONFLICT, not gap or partial.** Group C recorded the Escape / scroll-lock / focus-trap divergence as 'partial' and 'gap'; group B recorded the same divergence as 'conflict'. Resolved to CONFLICT on M-34, M-35 and M-36. 'Gap' implies something to build, and here there is nothing to build — the mechanism is shipped, is strictly more accessible than the reference, and must not be loosened. What it needs is a recorded divergence and a rule (DEC-02), which is what 'conflict' means in this register.

**Merged buck's detaching burger chip into the detached-controls family.** Group A recorded 'the trigger detaches to fixed once the page has scrolled' as one of six values of F-A-19; group B gave the identical buck behaviour its own family, F-B-24, needed by one reference. They are one mechanism — pin a header child to a viewport edge with its own z-index and threshold — so they merge into M-08, which then has five references behind it instead of one and five separately, and stops looking like a single-site quirk.

**Corrected a how_checked that was a vacuous query (conclusion unchanged).** F-A-13 recorded its sibling-dim search as "attr_name LIKE '%Sibling%' OR '%Dim%' OR '%Peer%' returned 0 rows". Re-run, it returns FORTY rows: SQLite LIKE is case-insensitive and '%Dim%' matches the 'dIm' inside backgroundImage. None of the forty is a sibling-scoped state, so the gap stands — but the query proved nothing, and the corrected command is recorded in V-14.

**Corrected a citation on the exclusive accordion (conclusion unchanged).** F-C-14 cited nav-drawer/render.php for the '<details name> EXCLUSIVE accordion' wording. Re-run, render.php mentions 'details' twice without that wording; the named-group markup and the comment are in includes/nav-menu-markup.php. The conflict status is upheld on the verified markup ('<details class="sgs-nav-drawer-menu__accordion" name="sgs-nav-drawer-menu-accordion-...">').

**Made the DB-staleness claim exact.** Group A reported that block_attributes lacks rows for headerFloat, headerFloatInset, headerFloatCollapse, backdropBlur, shadowScrolled 'or shadowScrolledColour'. Re-run against 59 DB rows and the full block.json attribute map: it is exactly those SIX and no others. Raised as DEC-12 because the master list had to override the DB twice.

**Accepted three source citations that reproduced exactly.** The hardcoded z-index:100 (render.php plus style.css:25), the submenuCloseGrace literal in the mega fork, and the burger-morph X keyframe at nav-bar-menu/style.css:286-294 all reproduced verbatim. Two more (mega-aside's allowed_formats, mega-panel's allowed_styles) failed my first regex and reproduced on a second read at render.php:47 — a false negative in MY check, not an error in the source.

**Recorded evidence quality per family rather than per cell.** Four families are marked THIN: M-07 (away's announcement timing never measured), M-11 (every footer motion cell is not_measured, so it rests on class names), M-24 (footer hover never driven anywhere), M-33 (buck's Lottie never sampled over time). Twelve are MIXED — typically because butcherbox and rabbit have no 768 capture, or rabbit's dropdown was never opened. The remaining 34 are measured.

## Verification log

33 checks re-run against the code — every family marked *conflict* or *gap* (13 of 13) and the widest-support families. Commands are as run; `sgs-db.py` is `python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "..."` and paths are relative to the repo root. Where the DB and `block.json` disagree for `sgs/site-header`, `block.json` is the ground truth (V-01, DEC-12).

| id | families | command re-run | result | outcome |
|---|---|---|---|---|
| V-01 | M-02, M-03, M-13 | `python -c "json.load(open('plugins/sgs-blocks/src/blocks/site-header/block.json'))['attributes']"  +  python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "SELECT attr_name FROM block_attributes WHERE block_slug='sgs/site-header'"` | CONFIRMED and made exact. 59 DB rows. Six attributes exist in block.json and have NO DB row: backdropBlur, headerFloat, headerFloatCollapse, headerFloatInset, shadowScrolled, shadowScrolledColour. headerSticky, headerHideOnScroll, headerTransparent, headerTransparentDirection, backgroundColourScrolled, textColourScrolled, contrastSafe, headerShrink, maxWidth, contentWidth and borderRadius are all present in block.json. | no status change; DEC-12 raised |
| V-02 | M-09 | `grep -n 'z-index' plugins/sgs-blocks/src/blocks/site-header/render.php plugins/sgs-blocks/src/blocks/site-header/style.css  +  attribute scan for zIndex` | CONFIRMED. render.php emits "'z-index'  => '100'," ; style.css:25 sets "z-index: 100;" ; zero zIndex attributes on the block. DB: the only z-index attribute in the whole schema is sgs/decorative-image::zIndex. | status conflict upheld |
| V-03 | M-44 | `grep -n 'closeGrace' plugins/sgs-blocks/includes/nav-menu-markup.php  +  grep -n 'close_grace' plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php  +  grep -n 'MAX_INTENT_DELAY_MS\|intentDelay' plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js` | BUG CONFIRMED verbatim. nav-menu-markup.php contains BOTH "'closeGrace'  => 170," (mega fork) and "'closeGrace'  => $submenu['close_grace']," (dropdown fork). nav-bar-menu/render.php resolves "'close_grace' => isset($attributes['submenuCloseGrace']) ? max(0,(int)...) : 170". mega-disclosure.js: "const MAX_INTENT_DELAY_MS = 80;" against a markup-declared intentDelay of 300. | status partial upheld; first commit of U-1 |
| V-04 | M-14 | `grep -ni 'scrim\|backdrop' plugins/sgs-blocks/src/blocks/mega-panel/render.php plugins/sgs-blocks/includes/nav-menu-markup.php plugins/sgs-blocks/src/blocks/nav-drawer/style.css  +  python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "SELECT attr_name FROM block_attributes WHERE block_slug='sgs/nav-drawer'"` | CONFIRMED. Zero 'scrim' in mega-panel/render.php and in nav-menu-markup.php. nav-drawer/style.css carries .sgs-nav-drawer__scrim, .sgs-nav-drawer__scrim.is-open and .wp-block-sgs-nav-drawer::backdrop, with rgba(0, 0, 0, 0.55) appearing twice. No scrim/backdrop attribute on nav-drawer or mega-panel. | status gap upheld |
| V-05 | M-13 | `python -c block.json mega-panel attributes.bgBlur  +  grep 'saturate(1.5) blur(24px)\|0 30px 80px -30px' plugins/sgs-blocks/src/blocks/mega-panel/render.php` | CONFIRMED. bgBlur = {"type":"boolean","default":false}; the literal 'saturate(1.5) blur(24px)' is present in render.php; the hardcoded '0 30px 80px -30px' box-shadow is present and unconditional. | status partial upheld |
| V-06 | M-21 | `grep -n 'translateY' plugins/sgs-blocks/src/blocks/mega-panel/style.css` | CONFIRMED. 'transform: translateY( -3px );' is present (halcyon's measured value exactly); indus's -6px is unreachable. The only other translateY is the stagger custom property. | status partial upheld |
| V-07 | M-10, M-39, M-40, M-43, M-44 | `python -c "json.load(open('plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json'))['attributes']"` | CONFIRMED. collapsePoint {number, default 768}; showBurger {boolean, true}; triggerMode {string, default 'icon'} (NOT a tier object); submenuAlign enum [start,center,end]; submenuCloseGrace {number,170}; submenuAnimation {string,'fade'}; submenuCaret {boolean,true}; itemMagnetEnabled {boolean,false} with itemMagnetStrength and itemMagnetRadius BOTH ABSENT while triggerMagnetStrength {number,24} and triggerMagnetRadius {number,120} exist; burgerSize {string,'44px'}; itemFontSize {object,{}}; itemFontSizeUnit {string,''}; featuredItemIds {array}. | M-10, M-39 partial upheld; M-40 covered upheld |
| V-08 | M-17, M-27, M-31 | `grep -n 'allowed_anchors\|allowed_close_styles\|allowed_anims' plugins/sgs-blocks/src/blocks/nav-drawer/render.php  +  block.json attributes` | CONFIRMED. anchors = ('full-screen','header','trigger','centred') — no side-edge anchor. closeStyles = ('separate-x','text-swap','burger-morph','icon-and-text'). anims = ('auto','fade') and animateFrom is an enum of exactly those two. Full 46-attribute roster read; no scrim, stagger, dismissal, placement or resize attribute in it. | M-17 partial, M-31 partial, M-27 covered upheld |
| V-09 | M-47 | `grep -n 'details\|submenuModel' plugins/sgs-blocks/src/blocks/nav-drawer/render.php  +  grep -n '<details' plugins/sgs-blocks/includes/nav-menu-markup.php` | CONFIRMED, CITATION CORRECTED. The markup builder emits '<details class="sgs-nav-drawer-menu__accordion" name="sgs-nav-drawer-menu-accordion-%3$s" ...>' — a named group, exclusive by construction. submenuModel = enum ['accordion','drill-down']. The word EXCLUSIVE appears in includes/nav-menu-markup.php, NOT in nav-drawer/render.php as the source family cited. | status conflict upheld; citation corrected |
| V-10 | M-32 | `walk plugins/sgs-blocks/src/blocks/nav-drawer* for the string 'stagger'  +  attribute scan of both block.json  +  python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "SELECT attr_name FROM block_attributes WHERE block_slug IN ('sgs/nav-drawer','sgs/nav-drawer-menu')"` | CONFIRMED. ZERO files under src/blocks/nav-drawer and src/blocks/nav-drawer-menu contain 'stagger'; no stagger or delay attribute in either block.json or the DB. | status gap upheld |
| V-11 | M-49 | `grep -ni 'resize' plugins/sgs-blocks/src/shared/nav-interactivity/*.js  +  attribute scan of nav-drawer and nav-bar-menu` | CONFIRMED and sharpened. store.js contains ZERO occurrences of 'resize'. The only resize listener in the nav runtime is mega-disclosure.js's document-level scroll+resize handler, which repositions/closes a MEGA PANEL — it never touches the drawer. No resize or persist attribute on either block. | status gap upheld |
| V-12 | M-34, M-35 | `grep -n 'Escape\|lockBodyScroll\|SCROLL_LOCK_ATTR\|freezeBackground' plugins/sgs-blocks/src/shared/nav-interactivity/store.js plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js  +  attribute scan` | CONFIRMED. store.js binds one Escape handler and carries the lockBodyScroll / SCROLL_LOCK_ATTR pair; mega-disclosure.js has four Escape branches plus the outside-click handler and states in its own header comment 'no scroll-lock, no focus trap, no backdrop'. modality (modal\|non-modal) is the only lever and it governs inertness. No escape/dismiss/closeOn*/scrollLock attribute exists. | both resolved to conflict (see changes) |
| V-13 | M-36 | `grep -n 'aria-expanded' plugins/sgs-blocks/includes/nav-menu-markup.php` | CONFIRMED. Four emit sites, all '<button type="button" ... aria-expanded="false" aria-controls="..." data-wp-bind--aria-expanded=...>' — the mega trigger, two subtoggles and the burger. | status conflict upheld |
| V-14 | M-24 | `python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "SELECT block_slug, attr_name FROM block_attributes WHERE attr_name LIKE '%Sibling%' OR attr_name LIKE '%Dim%' OR attr_name LIKE '%Peer%'"` | CONCLUSION CONFIRMED, COMMAND CORRECTED. The source family recorded this query as returning 0 rows; it actually returns 40, because SQLite LIKE is case-insensitive and '%Dim%' matches 'backgrounDIMage' inside backgroundImage*. None of the 40 is a sibling-scoped state (they are dimRatio, featuredImage* and backgroundImage* rows), so the gap stands — but the original command was noise, not a negative control. | status gap upheld; how_checked rewritten |
| V-15 | M-04 | `python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "SELECT block_slug, attr_name FROM block_attributes WHERE css_property='mix-blend-mode'"  +  python -c block.json site-header attributes.contrastSafe` | CONFIRMED. Eight rows, every one backgroundOverlayBlendMode on a container/section block (container, cta-section, hero, multi-button, physics-canvas, site-footer, site-header, trust-bar) — the shared background OVERLAY panel, never the header element. contrastSafe is {"type":"object","default":{}}, a per-tier scrim/shadow advisory. | status gap upheld |
| V-16 | M-13 | `python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "SELECT block_slug, attr_name FROM block_attributes WHERE css_property='backdrop-filter'"  +  block.json site-header::backdropBlur, nav-drawer::surfaceBlur` | CONFIRMED. 0 rows. site-header::backdropBlur = {string, ''} described as 'a CSS length, empty for none', same vocabulary as nav-drawer::surfaceBlur {string, ''} — so a companion saturate() is unreachable on both. | status partial upheld |
| V-17 | M-08 | `python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "SELECT block_slug, attr_name, css_property FROM block_attributes WHERE css_property IN ('position','top','z-index')"` | CONFIRMED. Exactly two rows in the whole schema: sgs/decorative-image::positionY (top) and sgs/decorative-image::zIndex (z-index). Neither is a viewport-pinning mechanism and both are on a decorative block. | status gap upheld |
| V-18 | M-18 | `python C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-db.py sql "SELECT slug FROM blocks WHERE slug LIKE '%clock%' OR '%language%' OR '%back-to-top%' OR '%wishlist%' OR '%account%' OR '%country%' OR '%theme%' OR '%ticker%' OR '%carousel%' OR '%announce%'"  +  SELECT slug FROM blocks` | CONFIRMED. 0 matches in a roster of 209 blocks. The only search-ish blocks are core/search, sgs/filter-search and sgs/product-search. | status partial upheld (the roster gap is real) |
| V-19 | M-18 | `python -c supports.sgs.headerEssential over cart, responsive-logo, product-search, filter-search, form, button, multi-button, business-info, social-icons, audio block.json` | CONFIRMED. true on sgs/cart and sgs/responsive-logo ONLY; the other eight return no headerEssential key at all. | status partial upheld |
| V-20 | M-07 | `python -c "json.load(open('plugins/sgs-blocks/src/blocks/notice-banner/block.json'))['attributes'].keys()"` | CONFIRMED. 46 attributes, all paint and typography plus displayMode / dismissible / dismissBehaviour / stickyPosition / variant / icon. The content attribute is a single text = {"type":"string","default":"","role":"content"}. No slides array, no interval, no random source. | status gap upheld |
| V-21 | M-11 | `python -c supports.sgs.hideExtensions for site-header/site-footer  +  block.json site-footer-row attributes.fxFooterStagger` | CONFIRMED. Both declare hideExtensions ['fx']. fxFooterStagger = {boolean, false} with its own comment calling it footer-row-ONLY and reusing the FR-38-7 scrub runtime unmodified. | status partial upheld |
| V-22 | M-05, M-12 | `python -c block.json site-header-row / site-footer-row attributes and supports.sgs` | CONFIRMED. site-header-row carries layout, columns, gridTemplateColumns, justifyContent, alignItems, gap, rowSlot, rowHideOnScroll, rowTransparent and rowShrink. site-footer-row declares supports.sgs.intrinsicColumns = true. | status covered upheld |
| V-23 | M-45, M-46 | `python -c "json.load(open('plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json'))['attributes']"` | CONFIRMED. itemFontSize {object,{}} but itemFontSizeUnit {string,''} (one scalar unit for all tiers, so a vw value would apply at every tier); itemLineHeight {"type":"number"} — a plain number, not a tier object; listColumns {object,{}} (per-tier, good); gap {"type":"string","default":"8px"} — a scalar; itemTextAlign enum ['','left','center','right','justify']; nav-drawer::drawerAlign enum ['left','center','right'] (three positions, so buck's ~45% is a fourth). | both partial upheld |
| V-24 | M-13 | `python -c block.json nav-drawer attributes drawerBg / drawerBgGradient / surfaceOpacity / surfaceBlur / borderRadius / panelSize / anchor` | CONFIRMED. drawerBg {string,'surface'}, drawerBgGradient {string,''}, surfaceOpacity {number,1}, surfaceBlur {string,''}, borderRadius {object,{desktop:{}}}, panelSize {object,{}}, anchor {object,{}} — lamalama's 0.6 fill + blur(4px) and lusion's 7.5/10px radius step are both literal values. | drawer half covered; the gaps in M-13 are the panel and header halves |
| V-25 | M-22 | `python -c block.json nav-drawer-menu attribute names filtered for icon/marker/index/ornament/counter` | CONFIRMED. Exactly seven matches, all sublinkMarker* (Icon, Colour, ColourHover, ColourCurrent and their three gradient companions) — and the markup builder emits the marker span on SUB-items only. No primary-item icon, index or media attribute. | status partial upheld |
| V-26 | M-20, M-28 | `grep -n 'allowed_formats\|preview' plugins/sgs-blocks/src/blocks/mega-aside/render.php  +  block.json mega-panel::asideWidth` | CONFIRMED. render.php:47 "$allowed_formats = array( 'feature', 'preview', 'cta' );" with a real 'preview' branch at :167 and 'cta' at :164; asideWidth = {string, '340px'} (halcyon's measured rail). | M-28 covered, M-20 partial upheld |
| V-27 | M-16 | `grep -n 'sgs-mm-panel-width\|sgs-mm-panel-top\|sgs-mm-overflow-left' plugins/sgs-blocks/includes/nav-menu-submenu-css.php  +  block.json mega-panel::maxWidth` | CONFIRMED. The __mega-panel-wrap rule reads 'position:absolute;top:var(--sgs-mm-panel-top, 100%);left:var(--sgs-mm-overflow-left, 50%)...'; maxWidth = {object, {"desktop":"1120px"}}. There is no anchor enum and submenuTopOffset (a dropdown attribute) does not reach the mega wrap. | status partial upheld |
| V-28 | M-27, M-38 | `grep -n 'burger-bar' plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` | CONFIRMED. style.css:286-294 — [aria-expanded="true"] .__burger-bar:nth-child(1), :nth-child(2) and :nth-child(3) form the X. No duration, easing or alternative pose. This also confirms group C's citation of the in-place morph, which is why M-27 stays covered while the pose moves to M-38. | M-27 covered, M-38 partial |
| V-29 | M-31 | `grep -n '@keyframes' plugins/sgs-blocks/src/blocks/nav-drawer/style.css` | CONFIRMED. Eleven keyframes covering four shapes: sgs-nav-drawer-in/-out (base fade-drop), -fade-in/-out, -expand-down-in/-out, -corner-scale-in/-out, -modal-scale-in/-out, plus -backdrop-in. animateFrom 'auto' picks by DESKTOP anchor, so a full-screen drawer can only fade-drop or fade. | status partial upheld |
| V-30 | M-18 | `python -c block.json business-info attributes.displayType` | CONFIRMED. enum ['phone','email','address','hours','socials','copyright','description','map','attribution'] — nine values, default 'phone'. | status partial upheld (the roster gaps are the missing blocks, not these) |
| V-31 | M-33 | `python -c block.json responsive-logo attributes` | CONFIRMED. logoId / logoIdTablet / logoIdMobile / logoSwitchMode / logoSwitchCustomPx / maxWidth / maxHeight / width all present; animationStyle = enum ['none','draw-on-load','hover-redraw','scroll-trigger'] (the block's own FR-38-15 draw). No Lottie or canvas source. | status partial upheld |
| V-33 | M-25 | `python -c attribute-name scan of nav-bar-menu, nav-drawer-menu, mega-panel, mega-group block.json for label2/altLabel/secondLabel/roll/clone/hoverLabel  +  grep -niE 'roll\|alt-label\|__label-alt\|data-alt' plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css plugins/sgs-blocks/src/blocks/nav-drawer-menu/style.css` | CONFIRMED. Zero matching attributes across the four menu blocks and zero matching rules in either stylesheet. studionamma's bar label roll and lusion's drawer/trigger roll need markup (a second label plus a paired transform), not a value. | status gap upheld |
| V-32 | M-41, M-42 | `grep -n 'allowed_styles\|allowed_variants' plugins/sgs-blocks/src/blocks/mega-panel/render.php  +  block.json mega-panel` | CONFIRMED via the same render.php read as V-05: style is validated against ('columns','cards','minimal') and variant against ('general','media-cards','brands'); the mega/dropdown fork split is in nav-menu-markup.php (V-03 read the same file). | both covered upheld |

### Statuses corrected

Six entries: **three source statuses changed** (F-B-18 covered to partial inside M-39; F-C-18 gap and F-C-19 partial both to conflict), **two citation/command corrections** that left their verdict intact, and **one merge** that removed a family. No family's substantive verdict was reversed by a correction.

| what | source | correction |
|---|---|---|
| Trigger form status | F-A-18 partial vs F-B-18 covered | resolved to **partial** (M-39); triggerMode is not per-tier, and the detached-trigger values move to M-08 |
| Accessibility divergence status | F-C-18 partial / F-C-19 partial vs F-B-16 conflict | resolved to **conflict** on M-34, M-35, M-36 — there is nothing to build, only a rule to record |
| Sibling-dim `how_checked` | F-A-13 | the cited query returns 40 rows, not 0 (case-insensitive LIKE matching `backgroundImage`); command rewritten, gap upheld |
| Exclusive-accordion citation | F-C-14 | the `<details name>` markup and the EXCLUSIVE comment are in `includes/nav-menu-markup.php`, not `nav-drawer/render.php`; conflict upheld |
| DB-staleness count | F-A-02 / families-A.md | exactly **six** attributes are in `block.json` and absent from `block_attributes`, against 59 DB rows |
| buck's detaching trigger chip | F-B-24 (own family) | merged into M-08; one mechanism, five references, not one |

