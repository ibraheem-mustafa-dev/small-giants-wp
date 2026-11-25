# i3-container report: sgs/container editor panels and library-wide inspector shapes

Method: static source reading, the existing checks run once each, and my own panel census (`E:\sgs-tmp\general-cloning\investigate\i3-container\panels.cjs`, output `panels.json`). I did not open the live block editor, so "which panels render" is PROVEN from source and UNPROVEN in the live DOM. Census counts treat conditional panels as present, so read them as upper bounds with named examples.

## Environment finding first
`plugins/sgs-blocks/node_modules` is empty in this checkout (folder dated 23 Nov). Run as-is, `inspector-scan/run.js` fails closed: 104 parse errors, rule 01 reports 23 findings and rule 24 reports 1,252. That is the scanner doing its job, not a real backlog. I ran every Node check with `NODE_PATH` pointing at another project's `@babel` 7.29 (read-only). With that, the scan has 0 parse errors and every gate-mode rule returns 0. `npm ci` is needed before gates mean anything in this checkout.

## 1. What sgs/container shows (PROVEN from source)
Order is DOM order inside each tab.

Styles tab
1. Section ground: ONE toggle (`ground`).
2. Colour (own `SgsColourPanel`): 3 rows, Background (normal/hover), Text (normal/hover), Heading (normal).
3. Typography: one `TypographyControls` composite.
4. Background (shared media panel: image, video, SVG).
5. Background surface: tone toggle plus a nested "Surface" ToolsPanel (blur, saturate, opacity).
6. Extra SVG layer: 5 controls.
7. Colour (second panel, from the arrow button kit), Scroll row arrows (about 11 controls), Colour (third panel, from the dots kit), Scroll row dots (5 controls).
8. From universal extensions: Size in row, Hover, Entrance and reveal, Effects.

Settings tab
1. Layout: the biggest panel. HTML tag, landmark label, then `LayoutPanel` (about 14 controls), `WidthPanel` (3), `ScrollSidewaysPanel` (5), overflow, pin edge (5), min height, order, aspect ratio. Roughly 35 controls, no ToolsPanel.
2. Separators (grid/flex/stack only): one composite.
3. Padding & margin: two `SgsBoxControl`.
4. Content band: help text plus ONE width control.
5. Grid item defaults (grid only): 8 controls including 3 colour pickers, its own border builder and its own shadow.
6. Wrapper border: one `SgsBorderControl`.
7. Hover as one card: ONE toggle.
8. Shadow: one `ShadowControl`.
9. Shape Dividers: 10 controls, two colour pickers.
10. From extensions: Block Link, Visibility conditions, Keyboard focus (ONE toggle), Advanced.

Breaches of Spec 35, each PROVEN:
- **Single-control panels (spec gap, see Q2):** Section ground, Hover as one card, Keyboard focus (toggles); Separators, Content band, Shadow, Wrapper border, Typography (one composite each). The Content band panel opens with "Styles the inner content band" but holds only the width; the band's padding sits in "Padding & margin" (`block.json::supports.sgs.elements.content-band.attrMap` maps `css:padding` to `padding`).
- **More than one colour panel:** three panels titled "Colour" in the Styles tab. `components/SgsColourPanel.js::SgsColourPanel` hardcodes `PanelBody title="Colour"`, and `components/button-kit/BuiltinButtonPanelBody.js` and `components/carousel-dots/CarouselDotsPanelBody.js` each mount their own instance. Spec 35 PART O §1 field 9e says one mount per block.
- **Colour controls outside the colour panel:** Grid item defaults holds a background `DesignTokenPicker`, a border `DesignTokenPicker` and a text `GradientCapableColourControl`. The spec says every fill/text colour lives in the one panel, with only border, overlay and shadow colour exempt. Its border is hand-built (`GridItemDefaultsPanel.js`: `SgsLengthControl` + `SelectControl` + `DesignTokenPicker`, not `SgsBorderControl`), against the §14 composed-border shape. Shape divider colours (2) are an ambiguous case; the spec does not name them.
- **Block-specific duplicate of a standard panel:** `container/edit.js` does not use `ContainerWrapperControls`. It rebuilds Layout, Shadow and Separators inline. `container/components/SeparatorsPanel.js` (the shared version) exists and `gallery/edit.js` mounts it, but container inlines a `PanelBody` + `SgsSeparatorControl`. Grid item defaults repeats padding, background, border, shadow and text colour for children; defensible because the `grid-item` element exists in the manifest, but it should reuse the standard controls.
- **Wrong order and scatter:** the wrapper element's controls sit in about 8 panels (Section ground, Colour, Typography, Padding & margin, Wrapper border, Shadow, Hover as one card, Layout). Appearance splits across tabs: Colour, Typography and Background in Styles; border, spacing, shadow and shape dividers in Settings. Rule 41 skips `isWrapper` elements by design (its header: property-family territory), and nothing checks the property-family tier.
- **Dense panel without disclosure (A5):** Layout (about 35 controls) and Shape Dividers (10) have no ToolsPanel. Rule 03 reports Layout as "~7" because it counts control-named tags in `edit.js` only and treats `LayoutPanel` as one tag.
- **Controls with no effect (conditional):** the 4 kit panels (arrows, dots, two Colour) are mounted unconditionally in `edit.js`. `includes/class-sgs-container-wrapper.php` calls `sgs_carousel_controls_css` only inside `if ( $sgs_scroll_row_on && $uid )`, which needs `scrollSideways` on at some tier (arrows and dots also need `scrollArrows` and `scrollDots`). On an ordinary container about 17 controls do nothing.
- **Dead attributes:** none proven. Of 161 attributes, the only ones with no literal reader are `templateLock` (read in `edit.js` by InnerBlocks) and the typography set, which `sgs_typography_css_rule( $attributes, '', ... )` reads by prefix. Border attributes are read through `sgs_border_element_decls`.
- **Duplicate controls writing one attribute:** none proven. Writers found twice: `gridItemBorder` (width, style and colour of one shorthand, by design), `flexWrap` (two branches in `LayoutPanel`), `separators` (the unmounted copy in `SeparatorsPanel.js`). Semantic overlap between Section ground and the background/text colour rows is by design (the code comment says the row wins).
- **Editor vs front end:** none proven. `check-editor-render-parity.js --json` shows 0 net-new and no container entries.

## 2. Why the existing enforcement did not catch each shape
| Shape | Verdict | Evidence |
|---|---|---|
| Single-control panel | Rule missing from Spec 35 | Nothing sets a minimum. A4/A5 only cap the top (rule 03, advisory). "A control that styles nothing takes one Settings panel" arguably licenses Keyboard focus. |
| More than one colour panel | Rule written, never built; the written check is too narrow | Field 9e gives only a shell one-liner over `blocks/*/edit.js`. I ran it: 78 blocks with 1 mount and 1 with 2 (`pricing-table`), so the spec's "single count of 1" is false today. It cannot see the kits, which mount from `src/components/`. No script in `plugins/sgs-blocks/scripts` counts mounts. |
| Fill/text colour outside the colour panel | Built, too narrow | Rule 31 (advisory) checks state count and gradient; rule 24 bans raw picker imports. Neither asks "is this colour in `SgsColourPanel`?". 21 blocks have such pickers. |
| Block inlines a shared panel | Not built | `check-shared-panel-schema.js` only checks that mounted shared panels write declared attributes. |
| Wrapper-element scatter, tab split | Built, too narrow, advisory | Rule 41 axis A skips `isWrapper` and flags 18 scattered elements elsewhere. Rule 46 only catches a fill crossing tabs. Spec A3 says the tab bar lands later; A8 and CO-28 leave panel order open. |
| Dense panel | Built, advisory, undercounts | Rule 03 gave 27 flags; it does not descend into shared components. |
| Kit panels offered where the render is gated | Built for the unconditional case only | Rules 21/34 and `kit_wiring.py` check the render calls the printer, not that its gate matches the panel's visibility. They found only `site-header-row` and `site-footer-row` (`hidePromotedPlaceholder`). |
| Dead attribute | Built, advisory | `check-dead-controls.js` CHECK 4 lists 857 "fully dead" attributes but is blind to kit-generated ones: 805 are `_generated`, 42 more are kit-credited by `kit_wiring.py`. 10 remain (Q3.4). |
| Editor/front-end mismatch | Built, narrow | CHECK A only asks whether `edit.js` mentions the attribute outside the inspector, not whether the preview applies it. 21 accepted in 9 blocks. |

Where checks run: `inspector-scan-run` sits in the `full` tier, which runs only inside `build-deploy.py` (`step_gate_full`). `.githooks/sgs-gates.sh` is `exit 0`, so no commit-time inspector check exists (its README says so). Only gate-mode rules fail anything; rules 03, 21, 31, 34, 41 and 43 to 45 are advisory.

## 3. Library-wide detector shapes (from `panels.json`; 104 blocks)
1. **Single-control panel.** A `PanelBody`/`ToolsPanel` whose subtree holds exactly one control leaf (resolving panel-producing components). Today: 93 single-primitive panels in 41 blocks (for example accordion "FAQ structured data", audio "Player style", brand-strip "Logo size", account "Wording"), plus 183 single-composite panels in 82 blocks (53 `SgsBorderControl`, 49 `TypographyControls`, 19 `ShadowControl`, 8 `SgsSeparatorControl`). The composite ones are often legitimate element panels; flag only when the title names no element. Keyboard focus adds one more to every `sgs/*` block that does not hide `focusRests`.
2. **Multiple colour panels.** More than one `SgsColourPanel` mount reachable from a block's `edit.js`, kits included. 11 blocks: account (6), choice-flow (7), gift-order (4), buybox (3), container (3), gallery (3), product-card (3), testimonial-slider (3), nav-drawer-menu (2), pricing-table (2), product-search (2). Also colour pickers (`DesignTokenPicker`, `GradientCapableColourControl`) outside `SgsColourPanel` and outside a border/shadow/overlay composite: 21 blocks (16 also mount the panel), for example accordion, card-grid, container, google-reviews, modal, pricing-table, testimonial, text.
3. **Block-specific duplicate of a standard panel.** Two readings. (a) Same title twice in one block: 7 blocks (account "Text style" x5, choice-flow "Text style" x6 and "Layout" x2, nav-bar-menu and nav-drawer-menu "Separators" x2, product-card "Price" and "Text style", buybox, trust-bar). (b) A block-owned `PanelBody` around a control a shared panel component already wraps: `SgsSeparatorControl` inline in 8 panels against 2 mounts of `SeparatorsPanel`; container's inline Layout, Shadow and Separators. Reading (b) needs a signature comparison (imported controls plus attributes written) that I did not build.
4. **Dead attribute.** Declared in `block.json`, not `_generated`, no control and no literal reader, after removing kit-credited names. 10 candidates in 5 blocks: buybox `previewBorderColour`, hero `splitBorderColourGradient`, image-sequence `thumbnailAlt` and `thumbnailDecorative`, media (`maxHeight`, `captionTag`, `linkOpensNewTab`, `linkRel`, `linkUrlSource`), team-member `photoRatio`. UNPROVEN as dead: media and team-member may be read through the media system's prefix reads. Settle by rendering each on a fixture post. Container: 0.
5. **Editor/front-end mismatch.** Existing CHECK A: 21 accepted findings in 9 blocks (buybox 4, card-grid 4, notice-banner 3, theme-toggle 3, button 2, wishlist-panel 2, three others 1 each). A stronger shape: for every attribute with a `css_property` in `block_attributes`, require a reference in the preview corpus (`edit.js` plus block components plus `utils/*preview*.js` plus `editor.css`) outside an inspector fill. Not run library-wide.
6. **Shared panel on a block whose render ignores or gates its settings.** The block mounts shared panel P, and the emitter for P's attributes is either not called or called under a predicate (`$sgs_scroll_row_on`) that the panel's visibility does not mirror. Hard cases today: 2 (`site-header-row`, `site-footer-row`). Conditional case: container's four kit panels. The 44 blocks that mount a shared wrapper or media panel: the 33 wrapper ones all reach `SGS_Container_Wrapper`; the 11 without it mount only `MediaElementPanel` or their own separators panel, which have their own renderers. No hard case there.
7. **Extra shape, tab placement.** `SgsBorderControl` sits in 43 Settings panels against 74 Styles panels; 51 blocks have a Styles-tab colour panel and visual composites (border, shadow, spacing, typography) in Settings.

## 4. Shared component vs per block
Fix once in shared code (fixes many blocks)
- Kits push colour rows into the block's one `SgsColourPanel` (a Slot/Fill, or a `kitColourRows()` merge): fixes 8 kit blocks and removes the extra "Colour" panels.
- Kit panels take a `showWhen` declaration in `supports.sgs.builtinButtons` and `carouselDots` mirroring the PHP gate: fixes container's four conditional panels.
- Fold "Keyboard focus" into an existing universal panel (Advanced or Visibility): one file, about 100 blocks.
- Inspector-scan: make rule 03 descend into shared components; add single-control, multi-colour-panel and colour-outside-panel rules (advisory first, gate once the shared fixes land). Replace the spec's 9e shell line with the rule.
- A shared panel wrapper for Border, Shadow and Spacing could set the tab (blocked on Bean's A3/CO-28 decision).

Per block
- Container: merge Section ground into Background, fold Hover as one card into Layout, Content band into Layout or Padding, Wrapper border and Shadow into one panel; wrap Layout and Shape Dividers in ToolsPanel; replace Grid item defaults' colour pickers and border builder with colour-panel rows and `SgsBorderControl`; mount the shared `SeparatorsPanel`.
- The 21 blocks with colour pickers outside the panel, the 7 repeated titles, the 10 dead-attribute candidates, the 2 hard dead controls.

## Spec gaps to settle with Bean before building rules
1. Is a panel with one control a breach? Spec 35 is silent.
2. Where does shadow colour live? Spec 35 A3 says it stays in its composite; field 9b and PART B say it moves to the colour row; `scripts/dedupe-shadow-colour-rows.py` suggests the second.
3. Shape-divider and grid-item colours: fill colours (colour panel) or element colours (stay with the element)?
4. Tab placement (A3 interim) and panel order (A8, CO-28) remain open.

## Calls I made
- Borrowed `@babel/parser` and `@babel/traverse` 7.29 from `C:\Users\Bean\Projects\booking-system\node_modules` through `NODE_PATH`, read-only, because the checkout's `node_modules` is empty.
- Treated conditional panels as present in the census (upper bounds).
- Wrote only under `E:\sgs-tmp\general-cloning\investigate\i3-container\` (`panels.cjs`, `panels.json`, `scan.json`, `scan2.json`, `deadctl.txt`, `erp.json`, `kit.json`). Nothing in the repo or DB changed.
- Did not run the live editor, route sweeps or builds.
