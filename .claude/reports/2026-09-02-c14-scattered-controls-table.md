⛔ **WITHDRAWN 2026-09-02 — do not act on this report.** `/qc-council` found the detector that
produced it (`scattered-element-controls.js`, since DELETED) flagged every `wrapper`-element
finding as scatter when Spec 35's own schema (`isWrapper: true`) explicitly says a wrapper's
controls SHOULD split across separate property-family panels (TIER 2, D537) — that's the correct
design, not a violation. The vast majority of the 613 rows below (every "wrapper" element row) are
false positives from this conflation. Non-wrapper element rows (content/cta/tag/icon-badge/pill/
label/etc.) were never re-verified against the correct resolver either. **Use
`scripts/placement-reach.py`'s CONTESTED output instead** — 9 real, spec-conformant candidates
across 5 blocks (`nav-drawer`, `before-after`, `container`, `cta-section`, `hero`), shared in chat
2026-09-02 and reproducible via `python scripts/placement-reach.py`. Kept below for git-blame only.

---

# C14 scattered-element controls — full population, every block

**613 individual attribute rows, 68 findings, 48 blocks** (31 HIGH, 28 WARN, 9 INFO).
Source: `scripts/scattered-element-controls.js --survey --json`, run fresh 2026-09-02.
INFO rows are your own sanctioned colour-panel exception — listed, not action items.

## Rendering-source summary (answers "shared helper / universal extension / atom file / local?")

| Source | Mentions across the 613 rows |
|---|---|
| `SgsBorderControl` (shared helper) | 225 |
| `SgsColourPanel` (shared helper) | 152 |
| **Local JSX — block-owned, no shared component** | **98** |
| `SgsLengthControl` (shared helper) | 60 |
| `ResponsiveBoxControl` (shared helper) | 52 |
| `ResponsiveOverride` (shared helper) | 45 |
| `TypographyControls` (shared helper) | 16 |
| `ResponsiveControl` (shared helper) | 14 |
| Container-wrapper-family panel (`LayoutPanel`/`WidthPanel`/`BackgroundPanel`/`ShapeDividersPanel`) | 9 |
| `SpacingControl` / `ColumnShapePicker` / `ShadowControl` / `RowQuickInsertAppender` / `GradientOverlayControl` (shared helpers) | 26 |

**Zero rows trace to a universal block extension (`src/blocks/extensions/**`) or a media atom/injector
(`src/components/media/**`).** Every scattered control is either one of the named shared helper
components above, or literal JSX owned by the block itself — nothing here comes from the
animation/visibility/fx extension layer or the media-element atom system.

**What "scattered" means per row:** the attribute's control is real and rendered somewhere (verified
by resolving it against the block's own edit.js AND the census's own per-panel component-mount
table, `opaqueComponents` — not guessed) — the violation is that OTHER controls for the SAME element
sit in a DIFFERENT panel, so a client editing one thing about (say) hero's wrapper has to hunt across
Colour + Settings›Border + Styles›Min height to find the rest.

---

## sgs/accordion-item

### "wrapper" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/before-after

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `boxShadowColour` | Colour | SgsColourPanel (shared) |
| `height` | Settings > Frame size | ResponsiveOverride, SgsLengthControl |
| `maxWidth` | Settings > Frame size | ResponsiveOverride, SgsLengthControl |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

### "divider-line" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `dividerColour` | Colour | SgsColourPanel (shared) |
| `dividerWidth` | Settings > Divider | local JSX (block-owned, no shared component detected) |

---

## sgs/brand-strip

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `backgroundColour` | Colour | SgsColourPanel (shared) |
| `backgroundColourGradient` | Colour | SgsColourPanel (shared) |
| `backgroundColourHover` | Colour | SgsColourPanel (shared) |
| `backgroundColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourGradient` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `textColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `maxHeight` | Settings > Layout | ResponsiveControl |
| `fadeWidth` | Settings > Marquee | local JSX (block-owned, no shared component detected) |

### "tile" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `tileBackgroundColour` | Colour | SgsColourPanel (shared) |
| `tileBorderColour` | Colour | SgsColourPanel (shared) |
| `tileBorderColourGradient` | Colour | SgsColourPanel (shared) |
| `tileShadowColour` | Colour | SgsColourPanel (shared) |
| `tilePadding` | Styles > Tile > Tile padding | local JSX (block-owned, no shared component detected) |
| `tileRadius` | Styles > Tile > Tile corner radius | local JSX (block-owned, no shared component detected) |
| `logoGap` | Styles > Tile > Gap between logos | local JSX (block-owned, no shared component detected) |
| `tileBorderWidth` | Styles > Tile > Tile border width | local JSX (block-owned, no shared component detected) |

---

## sgs/button

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `colourText` | Colour | SgsColourPanel (shared) |
| `colourTextHover` | Colour | SgsColourPanel (shared) |
| `colourBackground` | Colour | SgsColourPanel (shared) |
| `colourBackgroundGradient` | Colour | SgsColourPanel (shared) |
| `colourBackgroundHover` | Colour | SgsColourPanel (shared) |
| `colourBackgroundHoverGradient` | Colour | SgsColourPanel (shared) |
| `boxShadowColour` | Colour | SgsColourPanel (shared) |
| `boxShadowHoverColour` | Colour | SgsColourPanel (shared) |
| `customWidth` | Styles > Layout | ResponsiveOverride, SgsLengthControl |
| `minHeight` | Styles > Layout | ResponsiveOverride, SgsLengthControl |
| `lineHeight` | Styles > Typography | ResponsiveOverride, SgsLengthControl, TypographyControls |
| `textTransform` | Styles > Typography | ResponsiveOverride, SgsLengthControl, TypographyControls |
| `textDecoration` | Styles > Typography | ResponsiveOverride, SgsLengthControl, TypographyControls |
| `letterSpacing` | Styles > Typography | ResponsiveOverride, SgsLengthControl, TypographyControls |
| `borderWidth` | Styles > Border | SgsBorderControl |
| `borderStyle` | Styles > Border | SgsBorderControl |
| `borderColour` | Styles > Border | SgsBorderControl |
| `borderColourGradient` | Styles > Border | SgsBorderControl |
| `borderColourHover` | Styles > Border | SgsBorderControl |
| `borderColourHoverGradient` | Styles > Border | SgsBorderControl |
| `borderRadius` | Styles > Border | SgsBorderControl |
| `borderRadiusTablet` | Styles > Border | SgsBorderControl |
| `borderRadiusMobile` | Styles > Border | SgsBorderControl |

---

## sgs/card-grid

### "item" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `cardBackground` | Colour | SgsColourPanel (shared) |
| `cardBackgroundGradient` | Colour | SgsColourPanel (shared) |
| `backgroundColourHover` | Colour | SgsColourPanel (shared) |
| `backgroundColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `cardBorderColour` | Colour | SgsColourPanel (shared) |
| `cardBorderColourGradient` | Colour | SgsColourPanel (shared) |
| `borderColourHover` | Colour | SgsColourPanel (shared) |
| `borderColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `cardShadowColour` | Colour | SgsColourPanel (shared) |
| `shadowHoverColour` | Colour | SgsColourPanel (shared) |
| `cardBorderWidth` | Settings > Card Styling (resting state) | ResponsiveBoxControl, SgsLengthControl, ShadowControl |
| `cardRadius` | Settings > Card Styling (resting state) | ResponsiveBoxControl, SgsLengthControl, ShadowControl |

---

## sgs/collapsible-text

### "body" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `collapsedLines` | Settings > Collapsible Text Settings | local JSX (block-owned, no shared component detected) |

---

## sgs/container

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `backgroundColour` | Styles > Colour | local JSX (block-owned, no shared component detected) |
| `textColour` | Styles > Colour | local JSX (block-owned, no shared component detected) |
| `textColourGradient` | Styles > Colour | local JSX (block-owned, no shared component detected) |
| `textColourHover` | Styles > Colour | local JSX (block-owned, no shared component detected) |
| `textColourHoverGradient` | Styles > Colour | local JSX (block-owned, no shared component detected) |
| `minHeight` | Settings > Layout | LayoutPanel, ResponsiveOverride, WidthPanel |
| `textAlign` | Settings > Layout | LayoutPanel, ResponsiveOverride, WidthPanel |
| `padding` | Settings > Padding & margin | ResponsiveBoxControl |
| `paddingTablet` | Settings > Padding & margin | ResponsiveBoxControl |
| `paddingMobile` | Settings > Padding & margin | ResponsiveBoxControl |
| `margin` | Settings > Padding & margin | ResponsiveBoxControl |
| `marginTablet` | Settings > Padding & margin | ResponsiveBoxControl |
| `marginMobile` | Settings > Padding & margin | ResponsiveBoxControl |
| `borderWidth` | Settings > Wrapper border | SgsBorderControl |
| `borderStyle` | Settings > Wrapper border | SgsBorderControl |
| `borderColour` | Settings > Wrapper border | SgsBorderControl |
| `borderColourGradient` | Settings > Wrapper border | SgsBorderControl |
| `borderRadius` | Settings > Wrapper border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Wrapper border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Wrapper border | SgsBorderControl |

---

## sgs/cta-section

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourGradient` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `textColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `shadowColour` | Colour | SgsColourPanel (shared) |
| `borderColourHover` | Colour | SgsColourPanel (shared) |
| `minHeight` | Styles > Section (outer) | ResponsiveOverride, WidthPanel |

---

## sgs/decorative-image

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `width` | Styles > Size | local JSX (block-owned, no shared component detected) |
| `maxWidthPercent` | Styles > Size | local JSX (block-owned, no shared component detected) |
| `opacity` | Styles > Transform | local JSX (block-owned, no shared component detected) |
| `zIndex` | Styles > Transform | local JSX (block-owned, no shared component detected) |
| `parallaxStrength` | Styles > Effects | local JSX (block-owned, no shared component detected) |
| `overflow` | Styles > Effects | local JSX (block-owned, no shared component detected) |
| `pathDrawOnScroll` | Styles > SVG Path Draw | local JSX (block-owned, no shared component detected) |
| `pathDrawDurationMs` | Styles > SVG Path Draw | local JSX (block-owned, no shared component detected) |
| `pathDrawEasing` | Styles > SVG Path Draw | local JSX (block-owned, no shared component detected) |
| `width` | Styles > Responsive Overrides > Responsive overrides > Width (px) | ResponsiveOverride |

---

## sgs/feature-grid

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `alignItems` | Settings > Alignment | local JSX (block-owned, no shared component detected) |
| `justifyItems` | Settings > Alignment | local JSX (block-owned, no shared component detected) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/form

### "focus-ring" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `formFocusRingColour` | Colour | SgsColourPanel (shared) |
| `formFocusRingWidth` | Settings > Focus State | local JSX (block-owned, no shared component detected) |
| `formFocusRingOpacity` | Settings > Focus State | local JSX (block-owned, no shared component detected) |
| `formFocusRingOffset` | Settings > Focus State | local JSX (block-owned, no shared component detected) |

---

## sgs/form-field-tiles

### "wrapper" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/form-step

### "wrapper" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/gallery

### "wrapper" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `columns` | Settings > Layout | ResponsiveOverride |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/heading

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourGradient` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `textColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `textTransform` | Settings > Typography | SgsLengthControl, TypographyControls |
| `textDecoration` | Settings > Typography | SgsLengthControl, TypographyControls |
| `letterSpacing` | Settings > Typography | SgsLengthControl, TypographyControls |
| `textAlign` | Settings > Layout | local JSX (block-owned, no shared component detected) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/hero

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `backgroundColour` | Colour | SgsColourPanel (shared) |
| `backgroundColourHover` | Colour | SgsColourPanel (shared) |
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |
| `minHeight` | Styles > Container / Entire Block > Alignment & split layout > Min height | ResponsiveOverride |

### "content" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textAlignDesktop` | Styles > Container / Entire Block > Alignment & split layout > Content text align | ResponsiveControl |
| `textAlignTablet` | Styles > Container / Entire Block > Alignment & split layout > Content text align | ResponsiveControl |
| `textAlignMobile` | Styles > Container / Entire Block > Alignment & split layout > Content text align | ResponsiveControl |
| `contentPadding` | Styles > Container / Entire Block > Alignment & split layout > Content area | GradientOverlayControl, ResponsiveBoxControl |

---

## sgs/icon

### "wrapper" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `iconColour` | Colour | SgsColourPanel (shared) |
| `iconColourGradient` | Colour | SgsColourPanel (shared) |
| `iconColourHover` | Colour | SgsColourPanel (shared) |
| `iconColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `backgroundColour` | Colour | SgsColourPanel (shared) |
| `shapeColourHover` | Colour | SgsColourPanel (shared) |
| `scaleHover` | Settings > Hover effects | local JSX (block-owned, no shared component detected) |

---

## sgs/icon-list

### "wrapper" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `gap` | Settings > Appearance | local JSX (block-owned, no shared component detected) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/info-box

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `borderColourHover` | Colour | SgsColourPanel (shared) |
| `borderColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `shadowHoverColour` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Styles > Border | SgsBorderControl |
| `borderStyle` | Styles > Border | SgsBorderControl |
| `borderColour` | Styles > Border | SgsBorderControl |
| `borderColourGradient` | Styles > Border | SgsBorderControl |
| `borderRadius` | Styles > Border | SgsBorderControl |
| `borderRadiusTablet` | Styles > Border | SgsBorderControl |
| `borderRadiusMobile` | Styles > Border | SgsBorderControl |
| `maxWidth` | Settings > Width | SgsLengthControl |

---

## sgs/label

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourGradient` | Colour | SgsColourPanel (shared) |
| `fontWeight` | Settings > Typography > Typography > Font weight | local JSX (block-owned, no shared component detected) |
| `textTransform` | Settings > Typography > Typography > Text transform | local JSX (block-owned, no shared component detected) |
| `lineHeight` | Settings > Typography > Typography > Line height | SgsLengthControl |
| `letterSpacing` | Settings > Typography > Typography > Letter spacing | SgsLengthControl |
| `textDecoration` | Settings > Typography > Typography > Text decoration | local JSX (block-owned, no shared component detected) |
| `fontStyle` | Settings > Typography > Typography > Font style | local JSX (block-owned, no shared component detected) |
| `textAlign` | Settings > Typography > Typography > Text align | local JSX (block-owned, no shared component detected) |
| `borderRadius` | Settings > Box | ResponsiveBoxControl, SgsLengthControl |
| `padding` | Settings > Box | ResponsiveBoxControl, SgsLengthControl |

---

## sgs/mega-aside

### "wrapper" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `asideBg` | Colour | SgsColourPanel (shared) |
| `asideBorderColour` | Colour | SgsColourPanel (shared) |
| `asideBorderColourGradient` | Colour | SgsColourPanel (shared) |
| `asidePadding` | Settings > Aside | ResponsiveBoxControl, SgsLengthControl |
| `asideRadius` | Settings > Aside | ResponsiveBoxControl, SgsLengthControl |
| `asideBorderWidth` | Settings > Aside | ResponsiveBoxControl, SgsLengthControl |

---

## sgs/mega-panel

### "wrapper" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `panelBg` | Colour | SgsColourPanel (shared) |
| `borderColour` | Colour | SgsColourPanel (shared) |
| `borderColourGradient` | Colour | SgsColourPanel (shared) |
| `maxWidth` | Settings > Panel | ResponsiveBoxControl, ResponsiveControl, SgsLengthControl |
| `panelPadding` | Settings > Panel | ResponsiveBoxControl, ResponsiveControl, SgsLengthControl |
| `groupGap` | Settings > Panel | ResponsiveBoxControl, ResponsiveControl, SgsLengthControl |
| `borderRadius` | Settings > Panel | ResponsiveBoxControl, ResponsiveControl, SgsLengthControl |

### "aside" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `accentBackgroundImage` | Colour | SgsColourPanel (shared) |
| `asideWidth` | Settings > Aside | SgsLengthControl |

---

## sgs/modal

### "backdrop" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `overlayColour` | Colour | SgsColourPanel (shared) |
| `overlayOpacity` | Settings > Overlay | local JSX (block-owned, no shared component detected) |

---

## sgs/multi-button

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `padding` | Settings > Padding & margin | ResponsiveBoxControl |
| `paddingTablet` | Settings > Padding & margin | ResponsiveBoxControl |
| `paddingMobile` | Settings > Padding & margin | ResponsiveBoxControl |
| `flexDirection` | Settings > Layout | ResponsiveOverride, SpacingControl |
| `gap` | Settings > Layout | ResponsiveOverride, SpacingControl |
| `flexWrap` | Settings > Layout | ResponsiveOverride, SpacingControl |
| `justifyContent` | Settings > Alignment | ResponsiveOverride |
| `alignItems` | Settings > Alignment | ResponsiveOverride |

---

## sgs/nav-drawer

### "dialog" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `anchor` | Settings > Drawer | ResponsiveControl, SgsLengthControl |
| `surfaceOpacity` | Styles > Drawer container | ResponsiveBoxControl, ResponsiveControl, SgsLengthControl |

### "wrapper" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `backgroundSize` | Styles > Drawer background image | local JSX (block-owned, no shared component detected) |
| `backgroundPosition` | Styles > Drawer background image | local JSX (block-owned, no shared component detected) |
| `backgroundRepeat` | Styles > Drawer background image | local JSX (block-owned, no shared component detected) |

---

## sgs/nav-menu

### "bar" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `featuredItemIds` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `gap` | Styles > Bar > Item gap | SgsLengthControl |

### "item" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `itemColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `itemColourHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `itemBg` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `itemBgHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `itemRadius` | Styles > Items | SgsLengthControl, TypographyControls |
| `itemRadiusHover` | Styles > Items | SgsLengthControl, TypographyControls |

### "underline" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `underlineColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `underlineColourHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `underlineThickness` | Styles > Underline | SgsLengthControl |
| `underlineOffset` | Styles > Underline | SgsLengthControl |

### "featured" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `featuredColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `featuredColourHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `featuredBg` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `featuredBgHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `featuredRadius` | Styles > Featured | SgsLengthControl |
| `featuredRadiusHover` | Styles > Featured | SgsLengthControl |
| `featuredFontWeight` | Styles > Featured | SgsLengthControl |
| `featuredFontWeightHover` | Styles > Featured | SgsLengthControl |

### "burger" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `burgerColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `burgerBg` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `burgerHoverColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `burgerSize` | Styles > Burger | SgsLengthControl |

---

## sgs/notice-banner

### "wrapper" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `maxWidth` | Settings > Wrapper | ResponsiveBoxControl, SgsLengthControl |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/option-picker

### "label" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `labelColour` | Colour | SgsColourPanel (shared) |
| `labelMarginBottom` | Styles > Label | TypographyControls |

### "wrapper" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `width` | Styles > Width / spacing | ResponsiveBoxControl, SgsLengthControl |
| `maxWidth` | Styles > Width / spacing | ResponsiveBoxControl, SgsLengthControl |
| `borderWidth` | Styles > Border | SgsBorderControl |
| `borderStyle` | Styles > Border | SgsBorderControl |
| `borderColour` | Styles > Border | SgsBorderControl |
| `borderColourGradient` | Styles > Border | SgsBorderControl |
| `borderRadius` | Styles > Border | SgsBorderControl |
| `borderRadiusTablet` | Styles > Border | SgsBorderControl |
| `borderRadiusMobile` | Styles > Border | SgsBorderControl |

### "pill" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `pillBgColour` | Colour | SgsColourPanel (shared) |
| `pillSelectedBgColour` | Colour | SgsColourPanel (shared) |
| `pillTextColour` | Colour | SgsColourPanel (shared) |
| `pillSelectedTextColour` | Colour | SgsColourPanel (shared) |
| `pillBorderColour` | Colour | SgsColourPanel (shared) |
| `pillBorderColourGradient` | Colour | SgsColourPanel (shared) |
| `pillSelectedBorderColour` | Colour | SgsColourPanel (shared) |
| `pillSelectedBorderColourGradient` | Colour | SgsColourPanel (shared) |
| `pillBorderRadius` | Styles > Appearance | ResponsiveBoxControl, SgsLengthControl, TypographyControls |
| `pillSelectedBorderRadius` | Styles > Selection appearance > Selection appearance > Selected pill border radius | SgsLengthControl |

---

## sgs/physics-canvas

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `borderWidth` | Styles > Border | SgsBorderControl |
| `borderStyle` | Styles > Border | SgsBorderControl |
| `borderColour` | Styles > Border | SgsBorderControl |
| `borderColourGradient` | Styles > Border | SgsBorderControl |
| `borderRadius` | Styles > Border | SgsBorderControl |
| `borderRadiusTablet` | Styles > Border | SgsBorderControl |
| `borderRadiusMobile` | Styles > Border | SgsBorderControl |
| `minHeight` | Settings > Section (outer) | ResponsiveOverride, WidthPanel |
| `padding` | Settings > Padding & margin | ResponsiveBoxControl |
| `paddingTablet` | Settings > Padding & margin | ResponsiveBoxControl |
| `paddingMobile` | Settings > Padding & margin | ResponsiveBoxControl |
| `margin` | Settings > Padding & margin | ResponsiveBoxControl |
| `marginTablet` | Settings > Padding & margin | ResponsiveBoxControl |
| `marginMobile` | Settings > Padding & margin | ResponsiveBoxControl |

---

## sgs/post-grid

### "card" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `cardBgColour` | Colour | SgsColourPanel (shared) |
| `backgroundColourHover` | Colour | SgsColourPanel (shared) |
| `borderColourHover` | Colour | SgsColourPanel (shared) |
| `shadowColour` | Colour | SgsColourPanel (shared) |
| `shadowHoverColour` | Colour | SgsColourPanel (shared) |
| `scaleHover` | Settings > Hover Effects > Hover scale | local JSX (block-owned, no shared component detected) |

---

## sgs/process-steps

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `backgroundColour` | Colour | SgsColourPanel (shared) |
| `backgroundColourHover` | Colour | SgsColourPanel (shared) |
| `transitionDuration` | Settings > Hover States | local JSX (block-owned, no shared component detected) |
| `transitionEasing` | Settings > Hover States | local JSX (block-owned, no shared component detected) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderColourHover` | Settings > Border | SgsBorderControl |
| `borderColourHoverGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/product-card

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `textColourGradient` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `textColourHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `textColourHoverGradient` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `backgroundColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `backgroundColourGradient` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `backgroundColourHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `backgroundColourHoverGradient` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `borderWidth` | Settings > Card border | SgsBorderControl |
| `borderStyle` | Settings > Card border | SgsBorderControl |
| `borderColour` | Settings > Card border | SgsBorderControl |
| `borderColourGradient` | Settings > Card border | SgsBorderControl |
| `borderRadius` | Settings > Card border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Card border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Card border | SgsBorderControl |
| `cardMaxWidth` | Styles > Card layout | local JSX (block-owned, no shared component detected) |

### "tag" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `tagBackgroundColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `tagTextColour` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `tagFullWidth` | Styles > Card style | SgsLengthControl, TypographyControls |

### "cta" element — WARN

⚠ **`ctaColourBackground`/`ctaColourText`/`ctaColourBorder`/`ctaColourBackgroundHover`/
`ctaColourTextHover`/`ctaColourBorderHover` each appear TWICE below** — once from the unnamed
root-level colour writes, once from "Styles > CTA Button Style". Confirmed via the census's own
`opaqueComponents` table: NEITHER location resolves to a shared component for these 6 names, both
are `local JSX` in `product-card/edit.js` itself. This needs a live look before assuming it's a
genuine duplicate-write bug (`check-duplicate-controls.js` territory) rather than the detector
counting one physical control from two textual angles.

| Attribute | Current panel | Rendering source |
|---|---|---|
| `ctaColourBackground` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `ctaColourBackgroundHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `ctaColourText` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `ctaColourTextHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `ctaColourBorder` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `ctaColourBorderGradient` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `ctaColourBorderHover` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `ctaColourBorderHoverGradient` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `ctaColourBackground` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaColourText` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaColourBorder` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaColourBackgroundHover` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaColourTextHover` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaColourBorderHover` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaBorderStyle` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaBorderWidth` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaBorderRadius` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaFontWeight` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaWidthType` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaFontSize` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |
| `ctaPadding` | Styles > CTA Button Style | local JSX (block-owned, no shared component detected) |

---

## sgs/product-faq

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `maxWidth` | Settings > Wrapper | ResponsiveBoxControl, SgsLengthControl |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/product-faq-item

### "wrapper" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/quote

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `backgroundColour` | Colour | SgsColourPanel (shared) |
| `backgroundColourGradient` | Colour | SgsColourPanel (shared) |
| `backgroundColourHover` | Colour | SgsColourPanel (shared) |
| `backgroundColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `boxShadowColour` | Colour | SgsColourPanel (shared) |
| `boxShadowHoverColour` | Colour | SgsColourPanel (shared) |
| `maxWidth` | Settings > Wrapper > Wrapper > Outer max-width | ResponsiveOverride, SgsLengthControl |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderColourHover` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

### "attribution" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `attributionColour` | Colour | SgsColourPanel (shared) |
| `attributionMarginTop` | Settings > Attribution > Margin-top (gap above attribution) | ResponsiveOverride, SgsLengthControl |

---

## sgs/separator

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `colour` | Colour | SgsColourPanel (shared) |
| `lineStyle` | Settings > Line > Line style | local JSX (block-owned, no shared component detected) |
| `thickness` | Settings > Line > Thickness | ResponsiveOverride, SgsLengthControl |
| `opacity` | Settings > Line > Opacity (%) | local JSX (block-owned, no shared component detected) |
| `lineGradient` | Settings > Line > Gradient line | local JSX (block-owned, no shared component detected) |
| `width` | Settings > Size & alignment | ResponsiveOverride, SgsLengthControl |

---

## sgs/site-footer

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `backgroundColour` | Colour | SgsColourPanel (shared) |
| `backgroundColourGradient` | Colour | SgsColourPanel (shared) |
| `backgroundColourHover` | Colour | SgsColourPanel (shared) |
| `backgroundColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Styles > Border | SgsBorderControl |
| `borderStyle` | Styles > Border | SgsBorderControl |
| `borderColour` | Styles > Border | SgsBorderControl |
| `borderColourGradient` | Styles > Border | SgsBorderControl |
| `borderRadius` | Styles > Border | SgsBorderControl |
| `borderRadiusTablet` | Styles > Border | SgsBorderControl |
| `borderRadiusMobile` | Styles > Border | SgsBorderControl |
| `minHeight` | Settings > Footer width | ResponsiveOverride, WidthPanel |
| `padding` | Settings > Padding & margin | ResponsiveBoxControl |
| `paddingTablet` | Settings > Padding & margin | ResponsiveBoxControl |
| `paddingMobile` | Settings > Padding & margin | ResponsiveBoxControl |
| `margin` | Settings > Padding & margin | ResponsiveBoxControl |
| `marginTablet` | Settings > Padding & margin | ResponsiveBoxControl |
| `marginMobile` | Settings > Padding & margin | ResponsiveBoxControl |

---

## sgs/site-footer-row

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `gridTemplateColumns` | Settings > Footer row | ColumnShapePicker, ResponsiveOverride, SpacingControl |
| `justifyContent` | Settings > Footer row | ColumnShapePicker, ResponsiveOverride, SpacingControl |
| `gap` | Settings > Footer row | ColumnShapePicker, ResponsiveOverride, SpacingControl |
| `alignItems` | Settings > Alignment & grid | ResponsiveOverride |
| `flexDirection` | Settings > Alignment & grid | ResponsiveOverride |
| `justifyItems` | Settings > Alignment & grid | ResponsiveOverride |
| `alignContent` | Settings > Alignment & grid | ResponsiveOverride |
| `gridTemplateColumns` | Settings > Alignment & grid | ResponsiveOverride |
| `gridTemplateRows` | Settings > Alignment & grid | ResponsiveOverride |
| `gridAutoRows` | Settings > Alignment & grid | ResponsiveOverride |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/site-header

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `padding` | (unnamed / root) | local JSX (block-owned, no shared component detected) |
| `backgroundColour` | Colour | SgsColourPanel (shared) |
| `backgroundColourGradient` | Colour | SgsColourPanel (shared) |
| `backgroundColourScrolled` | Colour | SgsColourPanel (shared) |
| `backgroundColourScrolledGradient` | Colour | SgsColourPanel (shared) |
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourScrolled` | Colour | SgsColourPanel (shared) |
| `shadow` | Styles > Shadow | local JSX (block-owned, no shared component detected) |
| `borderWidth` | Styles > Border | SgsBorderControl |
| `borderStyle` | Styles > Border | SgsBorderControl |
| `borderColour` | Styles > Border | SgsBorderControl |
| `borderColourGradient` | Styles > Border | SgsBorderControl |
| `borderRadius` | Styles > Border | SgsBorderControl |
| `borderRadiusTablet` | Styles > Border | SgsBorderControl |
| `borderRadiusMobile` | Styles > Border | SgsBorderControl |
| `minHeight` | Settings > Header width | ResponsiveOverride, WidthPanel |
| `padding` | Settings > Advanced layout > Padding & margin | ResponsiveBoxControl |
| `paddingTablet` | Settings > Advanced layout > Padding & margin | ResponsiveBoxControl |
| `paddingMobile` | Settings > Advanced layout > Padding & margin | ResponsiveBoxControl |
| `margin` | Settings > Advanced layout > Padding & margin | ResponsiveBoxControl |
| `marginTablet` | Settings > Advanced layout > Padding & margin | ResponsiveBoxControl |
| `marginMobile` | Settings > Advanced layout > Padding & margin | ResponsiveBoxControl |

---

## sgs/site-header-row

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `gridTemplateColumns` | (unnamed / root) | RowQuickInsertAppender |
| `gridTemplateRows` | (unnamed / root) | RowQuickInsertAppender |
| `textColour` | Colour | SgsColourPanel (shared) |
| `justifyContent` | Settings > Header row | ResponsiveOverride, SpacingControl |
| `gap` | Settings > Header row | ResponsiveOverride, SpacingControl |
| `alignItems` | Settings > Alignment & grid | ColumnShapePicker, ResponsiveOverride |
| `flexDirection` | Settings > Alignment & grid | ColumnShapePicker, ResponsiveOverride |
| `justifyItems` | Settings > Alignment & grid | ColumnShapePicker, ResponsiveOverride |
| `alignContent` | Settings > Alignment & grid | ColumnShapePicker, ResponsiveOverride |
| `gridAutoRows` | Settings > Alignment & grid | ColumnShapePicker, ResponsiveOverride |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/tab

### "wrapper" element — INFO

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/tabs

### "tab" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `tabBgColour` | Colour | SgsColourPanel (shared) |
| `tabHoverBgColour` | Colour | SgsColourPanel (shared) |
| `tabActiveBgColour` | Colour | SgsColourPanel (shared) |
| `tabTextColour` | Colour | SgsColourPanel (shared) |
| `tabActiveTextColour` | Colour | SgsColourPanel (shared) |
| `tabIndicatorColour` | Colour | SgsColourPanel (shared) |
| `tabIndicatorColourGradient` | Colour | SgsColourPanel (shared) |
| `tabActiveIndicatorColour` | Colour | SgsColourPanel (shared) |
| `tabActiveIndicatorColourGradient` | Colour | SgsColourPanel (shared) |
| `transitionDuration` | Settings > Animation | local JSX (block-owned, no shared component detected) |

---

## sgs/team-member

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `cardShadowColour` | Colour | SgsColourPanel (shared) |
| `shadowHoverColour` | Colour | SgsColourPanel (shared) |
| `maxWidth` | Settings > Width | SgsLengthControl |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/testimonial

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `borderColourHover` | Colour | SgsColourPanel (shared) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |
| `maxWidth` | Styles > Width & spacing | ResponsiveBoxControl, SgsLengthControl |

### "quote-text" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `quoteColour` | Colour | SgsColourPanel (shared) |
| `quoteColourGradient` | Colour | SgsColourPanel (shared) |
| `quoteColourHover` | Colour | SgsColourPanel (shared) |
| `quoteMarginBottom` | Styles > Typography > Typography > Quote spacing below | local JSX (block-owned, no shared component detected) |

### "summary" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `summaryColour` | Colour | SgsColourPanel (shared) |
| `summaryFontSize` | Styles > Typography > Typography > Summary font size | local JSX (block-owned, no shared component detected) |

### "rating" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `ratingColour` | Colour | SgsColourPanel (shared) |
| `ratingSize` | Styles > Rating appearance | local JSX (block-owned, no shared component detected) |

---

## sgs/testimonial-slider

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `borderColourHover` | Colour | SgsColourPanel (shared) |
| `transitionDuration` | Settings > Slider Settings > Transition duration (ms) | local JSX (block-owned, no shared component detected) |
| `transitionEasing` | Settings > Slider Settings > Transition easing | local JSX (block-owned, no shared component detected) |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---

## sgs/text

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourGradient` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `textColourHoverGradient` | Colour | SgsColourPanel (shared) |
| `lineHeight` | Settings > Typography | ResponsiveControl, TypographyControls |
| `textDecoration` | Settings > Typography | ResponsiveControl, TypographyControls |
| `textTransform` | Settings > Typography | ResponsiveControl, TypographyControls |
| `fontFamily` | Settings > Typography | ResponsiveControl, TypographyControls |
| `textAlign` | Settings > Layout | SgsLengthControl |
| `maxWidth` | Settings > Layout | SgsLengthControl |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderColourHover` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

### "first-letter" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `firstLetterColour` | Colour | SgsColourPanel (shared) |
| `firstLetterColourHover` | Colour | SgsColourPanel (shared) |
| `firstLetterFontSize` | Settings > Drop cap | SgsLengthControl |
| `firstLetterFontWeight` | Settings > Drop cap | SgsLengthControl |

---

## sgs/trust-bar

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `backgroundColour` | Colour | SgsColourPanel (shared) |
| `backgroundColourHover` | Colour | SgsColourPanel (shared) |
| `textColour` | Colour | SgsColourPanel (shared) |
| `textColourHover` | Colour | SgsColourPanel (shared) |
| `minHeight` | Styles > Section (outer) | ResponsiveOverride, WidthPanel |
| `padding` | Styles > Padding & margin | ResponsiveBoxControl |
| `paddingTablet` | Styles > Padding & margin | ResponsiveBoxControl |
| `paddingMobile` | Styles > Padding & margin | ResponsiveBoxControl |
| `margin` | Styles > Padding & margin | ResponsiveBoxControl |
| `marginTablet` | Styles > Padding & margin | ResponsiveBoxControl |
| `marginMobile` | Styles > Padding & margin | ResponsiveBoxControl |

### "icon-badge" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `iconCircleShadowColour` | Colour | SgsColourPanel (shared) |
| `iconColour` | Colour | SgsColourPanel (shared) |
| `iconColourGradient` | Colour | SgsColourPanel (shared) |
| `iconCircleSize` | Styles > Appearance | SgsLengthControl, ShadowControl |
| `iconCircleBorderRadius` | Styles > Appearance | SgsLengthControl, ShadowControl |

### "badge-img" element — WARN

| Attribute | Current panel | Rendering source |
|---|---|---|
| `badgeImageShadowColour` | Colour | SgsColourPanel (shared) |
| `badgeImageSize` | Styles > Appearance | SgsLengthControl, ShadowControl |
| `badgeImageObjectFit` | Styles > Appearance | SgsLengthControl, ShadowControl |
| `badgeImageBorderRadius` | Styles > Appearance | SgsLengthControl, ShadowControl |

---

## sgs/trustpilot-reviews

### "wrapper" element — HIGH

| Attribute | Current panel | Rendering source |
|---|---|---|
| `textColour` | Colour | SgsColourPanel (shared) |
| `columns` | Settings > Layout | ResponsiveOverride |
| `borderWidth` | Settings > Border | SgsBorderControl |
| `borderStyle` | Settings > Border | SgsBorderControl |
| `borderColour` | Settings > Border | SgsBorderControl |
| `borderColourGradient` | Settings > Border | SgsBorderControl |
| `borderRadius` | Settings > Border | SgsBorderControl |
| `borderRadiusTablet` | Settings > Border | SgsBorderControl |
| `borderRadiusMobile` | Settings > Border | SgsBorderControl |

---
