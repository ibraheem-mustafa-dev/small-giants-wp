# Walker rows, classified (2026-10-01)

Method: row text plus each block's block.json attributes, the gate3c trees, parity-lamalama.mjs, the plan's G8 note, and a fetch of lamalama.com's CSS. Nothing was run against the live sites.

# Indus (115 rows)

## Foundational gaps
None. Every visible difference below has an existing setting, or an already-set setting that is not taking effect.

## Violations
- I21-I23 `cta` (header "Request Catalogue" sgs/button), hover. Draft lifts -2px on hover and animates transform 0.2s plus box-shadow 0.3s. Live has no lift (transform none) and one flat 0.2s transition. Setting: sgs/button.liftHover = 2 and shadowLiftOnHover = true, both already in indus-header.tree.json, so the setting is not being honoured on this button. That is an implementation bug, not a tree gap. Set sgs/button.transitionDuration to match the 0.2s/0.3s split once the lift fires.
- I29, I30 `scrim` fade. Draft is `opacity 0.3s` with the default ease. Live uses cubic-bezier(.16,.84,.32,1), which is why the 30ms sample reads 0.31 against 0.1. Setting: sgs/nav-bar-menu.scrimFadeEasing = ease. Its block.json text names this exact Indus case. The 30ms timeline row should clear once the easing is set; if it does not, reclassify I30 as blind.
- I52 `about-frame` painted ground. Draft paints none; live paints rgba(255,255,255,0.08). The tree already sets that frame container's backgroundColour to transparent, so the 0.08 comes from another layer. Prime suspect is the sgs/mega-aside "feature" format. No setting found to remove it. It may be invisible if an image covers it, which is why it is a violation and not accepted.
- I55 `sectors-card-1` transition. Draft transitions transform 0.25s plus box-shadow 0.3s, so the cards lift on hover. Live only transitions colours. Setting: sgs/container.shadowLiftOnHover = true on the four card containers in indus-mega-sectors.tree.json (or sgs/mega-panel.panelCardLift). There is no pixel-lift setting on sgs/container.
- I110, I111 `acc-row-1` gap. Draft drawer accordion rows use a 14px gap; live uses 16px, because the drawer reuses the mega panel's 16px row. Setting: sgs/container.gap = {tablet: 14px, mobile: 14px} on the row containers in indus-mega-about.tree.json.
- I101, I102, I114, I115 `drawer-linkedin` position, a 4px y shift and a 6px x shift. These probably follow from the 44px hit box (see I88), so the painted disc would sit 3px inside the box. The measured disc offset could still be up to 9px. Check the disc, not the box. Setting: sgs/social-icons.gap, margin and textAlign. It may turn out to be same paint.

## Jitter
None. No timeline difference falls under 0.2.

## Accepted (blind spot)
- I24, I26-I28, I54, I58, I69, I70 stagger, children and opacity samples at 30ms. Draft values are JS/WAAPI-driven and unreadable.
- I33, I34, I36, I85-I87 keyframes, animation and running-after-action on the live rows. The draft side reads "none" because it is JS-driven.
- I99, I103, I105 social and icon circles. Live paints the disc and brand colour in `::before`, so the walker sees border-radius 0 and no ground on the element itself.

## Accepted (same paint)
- I1 bar media: the logo mark is an sgs/icon SVG in the copy and a CSS shape in the draft.
- I2-I6 `logo`: flex vs block, gap, align-items. The inner flex container lays the mark and text out identically, and no box rows are open. The transition on colours is for properties that never change.
- I7-I10, I12-I14 `nav-home` and `nav-about`: line-height normal vs 18px, text-align, and padding on the item vs on an inner element. Box rows are not open.
- I11, I15 `transition: background` vs `background-color`: naming only.
- I16 caret: identity matrix vs `none`.
- I17-I20 `cta`: text-align and justify-content on a button whose content fills its box, plus gap 7px vs none. Width is not flagged, so the icon spacing is equal.
- I25, I37, I39, I41, I42, I44, I50, I51, I53, I56, I57, I59, I60, I64 "inside bar": the live panels are nested in the bar's DOM and positioned the same.
- I31, I32, I47, I78, I109: line-height 18px vs 19.2px, and border-top-style on a 0px border. Row heights match.
- I35, I112 padding transition: `padding-left ease-out` vs `padding-inline-start` with the equivalent cubic-bezier.
- I38, I40, I49, I63, I74, I75, I82, I100, I104, I106: transitions declared on properties with no reported hover change.
- I43, I45, I46, I48, I61, I62, I97, I113 display and alignment: inline-block vs block, inline-flex vs flex, justify-content, text-align. Each sits in a flex parent or fills its box.
- I65 scrim "missing" at 375 and 768. Both sides show no panel and no scrim at that width, because the mega panels do not exist below the collapse point.
- I66, I67, I68, I107 drawer inventory: "in/f/g/ig" letters vs SVG glyphs, a CSS mark vs the logo image, and chevrons drawn as SVG.
- I71-I73 drawer-close: block vs flex centring of the × in a 38px box.
- I76-I81, I83, I84 `drawer-home`: the gold 0.8px rule sits on the item in live and on a child in the draft. Both draw one gold line at the row bottom. Also line-height 25px, text-align and justify-content on a single label.
- I88, I89 social 38px vs 44px: sgs/social-icons floors the hit box at 44px by design (style.css and render.php) and draws the 38px disc inside it.
- I90-I96, I98 letter typography on the draft's text glyphs: the live icons are SVG glyphs.

## Counts, Indus
| Class | Rows |
|---|---|
| ACCEPT-BLIND | 17 |
| ACCEPT-SAME-PAINT | 85 |
| VIOLATION | 13 |
| FOUNDATIONAL-GAP | 0 |
| JITTER | 0 |
| Total | 115 |

# Lamalama (88 rows)

## Foundational gaps
- L26 `showreel`: the draft has a bottom-centre "THIS IS US" toggle that is hidden at rest and fades in while the menu is open. It is a block pinned to a screen position, shown only in a state. The live copy has nothing and no setting can make it. This is G8 ("pin an authored block to a screen corner"), parked by Bean on 2026-09-27 in `.claude/plans/2026-10-01-header-nav-thread-plan.md` section 7.

## Violations
- L2, L22 logo canvas. Draft draws the pill logo on a `<canvas>`, an animated pixel "L". Live uses `lamalama-logo-still.png`. Setting: sgs/responsive-logo animationStyle, lottieId, lottieLoop, lottieTrigger or svgAnimationSource, which needs an animated asset exported from the draft. It may be same paint if the canvas turns out to be static, which is why it is not accepted. L22 is the same canvas seen inside the draft's pill in the open state.
- L37, L48 drawer rows hover. Draft shows a hover ground (plus a marker on Work). Live shows the marker only on Work and nothing on Careers. Setting: sgs/nav-drawer-menu.itemBgHover = rgba(249,244,235,0.1) is already set, but the walker does not see it paint. This may be itemBorderColourHover = transparent clobbering it, or the 650ms itemMotionDuration. It is a real, visible hover difference (seen at 1920 only).
- L66 `cta-pitchdeck` hover text colour. Draft ends cream rgb(249,244,235). Live ends dark rgb(26,28,28). Setting: sgs/button.colourTextHover = #f9f4eb (the tree has #1a1c1c). Set colourBackgroundHover to the draft's measured hover ground.
- L67, L80 `cta-pitchdeck` and `cta-call` hover effects. Draft has a ground appearing and an inner part scaling. Live has no "inner part scales", and cta-call has no ground. Setting: sgs/button.scaleHover with scaleHoverTarget = "face" is already set at 0.98. Either the draft's scale is larger or the live hover is not firing. Use colourBackgroundHover and scaleHover to match the draft's values.

## Jitter
None.

## Accepted (blind spot)
- 1920 zoom rows, where the draft scales 1.333x: L1, L5-L8, L15, L16, L19, L27, L28, L38, L39, L51, L52, L59, L69, L70, L73. These cover border-radius 5.33 vs 4, burger padding 16/9.33 vs 12/7, font-size 21.33 vs 16, 13.33 vs 10, and line-heights.
- L17, L18, L20, L21, L24, L25: the live grow keyframes, the stagger, and the scrim opacity transition. The draft's JS height and blur tweens read as none, and the walker cannot see them.

## Accepted (same paint)
- L3, L4 logo: block vs inline-block, and an opacity transition with hover opacity 0.
- L9, L81 burger row-gap: bars are spaced through burgerBarGap, and the size is identical.
- L10-L12, L49, L64, L71, L72, L78: centring and display (flex vs inline-flex on a full-width button).
- L13, L82 message box width 435/326 vs 97/73: the text is centred in both, and the walker already accepts `text-inset-x` for it.
- L14, L50, L68 font-family "Sometype" vs "Sometype Mono": the draft's @font-face for "Sometype" loads Sometype-Mono.woff2, the same file, checked in the fetched lamalama.com CSS.
- L23 inventory: the same five ornament marks, drawn as CSS dots in the draft and SVG in live, in a different order.
- L29-L36, L40-L47 drawer item rows: padding on the item vs on an inner element, and border-top-style on a 0px border. Separators are painted in both, on the `li` in the draft and on the anchor in live. A transition declared with no differing end value.
- L30, L41, L53-L58, L83-L88 border widths 0 vs 0.6/0.8px on rows and on cta-pitchdeck. The outline is drawn on another element in the draft, and both screenshots show the outline.
- L60-L63, L65, L74-L77, L79 button padding 0 vs 14/24px: the draft pads an inner element, the live outer one. Box rows are not open. Transition 0.3s vs none carries no end-value difference apart from the hover rows above.

## Counts, Lamalama
| Class | Rows |
|---|---|
| ACCEPT-BLIND | 24 |
| ACCEPT-SAME-PAINT | 56 |
| VIOLATION | 7 |
| FOUNDATIONAL-GAP | 1 |
| JITTER | 0 |
| Total | 88 |

Caveats: the "same paint" calls rest on box rows (width, height, position) being absent, not on pixel comparison. I did not re-measure live pages. One older screenshot I looked at (a previous walk's 375 lamalama open state) showed separators and fonts that the current rows no longer list, so I used it only to confirm that separators are painted on both sides.

# Corrections after the tree rebuild and second walk (2026-10-01, main thread)

The first walk ran before the five changed trees were rebuilt (4456, 4426, 4430, 4461, 4428 were last saved
2026-09-29, before `scrimFadeEasing` and the drawer settings existed). After the rebuild, the second walk read Indus
380 open (112 unique) and lamalama 253 open (89 unique). Reconciled against the classification above:

- **Fixed by the rebuild:** I29 and I30 (scrim easing), I52 (About frame ground), the five drawer-home rule rows, and
  three 30ms panel opacity samples.
- **Reclassified:** I21-I23 (CTA hover lift) are a walker blind spot, not a bug. `button/render.php` paints the lift on
  the independent `translate` property (`translate:0 -Npx`); the walker reads only `transform`.
- **New rows, Indus:** logo hover fades to 0.75 where the draft does not fade (violation: the logo's `opacityHover` in
  `indus-header.tree.json`); About tag 5px lower than the draft, y 180 vs 175 (violation: the tag's top margin in
  `indus-mega-about.tree.json`); About panel inventory order (same paint: DOM order, the aside sits beside the rows);
  bar children at 250ms (blind); About, Sectors and Brands panel opacity at 30ms now read 0.39/0.28/0.28 where the first
  walk read 0.27/0.15/0.27 (jitter: the same sample moves between runs).
- **New rows, lamalama:** message box width 82/62 (same paint, as L13/L82); drawer item and CTA transitions now read the
  tree's 650ms and 350ms quart-out curves against the draft's script-driven motion (blind).

Final counts: Indus 18 blind, 81 same paint, 10 violations, 0 foundational, 3 jitter (112). lamalama 28 blind, 53 same
paint, 7 violations, 1 foundational (G8, parked), 0 jitter (89).
