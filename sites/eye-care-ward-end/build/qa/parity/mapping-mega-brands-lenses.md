# Mega panels: Brands and Lenses mapping (draft lines 100-164)

Trees: `build/mega-brands.tree.json`, `build/mega-lenses.tree.json`. Checked every attribute against each block's `block.json` (name, type, enum) with a script: no unknown, wrong-typed or off-enum values. Nothing deployed or run against a live site.

## Root causes found in code (why the old tree could not paint the draft)

1. `sgs/mega-panel/render.php` (group-heading EYEBROW rule) hard-codes a monospace 11px 500 .14em uppercase `--sgs-mm-muted` style with `margin:0 0 16px` on any `sgs/heading` that is a DIRECT child of `sgs/mega-group` in the `columns` style. Specificity beats the heading's own attributes, so no heading attribute can override it. Fix: the headings sit inside an `sgs/container` inside the group (the rule only matches `.sgs-mega-group > .wp-block-sgs-heading`).
2. `sgs/mega-panel` columns style paints `.sgs-mega-group .sgs-icon-list__item` (padding 11px 12px, radius 13px, flex) and the icon chip. `sgs/icon-list` has no grid/columns control. Fix: All-brands list is an `sgs/container` grid of `sgs/button` links.
3. A link inside `sgs/text` / `sgs/heading` keeps the browser/theme underline: `textDecoration` is set on the paragraph, not the anchor (`helpers-typography.php::sgs_typography_css_rule`; `sgs_link_colour_css` only sets colour). Fix: brand names are `sgs/button` with `inheritStyle=custom` (no preset seed) and `textDecoration=none`.
4. `sgs/mega-group` `block.json` has `parent: ["sgs/mega-panel"]`, so a group cannot sit inside a container.

## Panel box (both trees, `sgs/mega-panel` attributes)

| Element | Draft | Set | Status |
|---|---|---|---|
| Background | #fff | `panelBg=surface-alt` (#FFFFFF in snapshot) | SET (already there) |
| Corners | square | `borderRadius="0"` (default 20px) | SET |
| Shadow | 0 24px 48px rgba(20,20,20,.12) | `shadow="0 24px 48px 0"`, `shadowColour="#141414 12%"` (renders `color-mix(in srgb,#141414 12%,transparent)`, same as rgba(20,20,20,.12)); default was preset `floating` | SET |
| Border | bottom 1px #E6E1DA only | `borderStyle=solid`, `borderWidth={0,0,1px,0}`, `borderColour=border` (#E6E1DA) | SET |
| Inner max-width | 1440px | `maxWidth.desktop="1440px"` (was 1120px) | SET |
| Padding | 36px 52px 40px | `panelPadding.desktop={top 36px,right 52px,bottom 40px,left 52px}` | SET |
| Full width, placement | full width | root is `width:100%` (`style.css`); horizontal anchoring belongs to `sgs/nav-bar-menu` | NOT MINE |
| Fade-in, max-height 74vh + scroll | animation .2s, max-height:74vh, overflow:auto | no panel attribute searched: `grep -n "max-height\|overflow\|animation" render.php style.css` in mega-panel finds only aside/media caps | GAP (minor, behavioural) |

## Brands panel

Structure: `mega-panel > mega-group > container(stack) > [heading, container(hairline holder) > sgs/card-grid (12 static items), heading, grid(auto-fill)]`.

| Element | Draft | Set (path -> attr) | Status |
|---|---|---|---|
| "Most asked for" heading | 11.5px, .2em, uppercase, #77716A, regular, body font, mb 18px | `group/container/heading[0]`: `fontFamily=body`, `fontSize.desktop=11.5`, `fontWeight=400`, `letterSpacing.desktop=0.2` (em), `textTransform=uppercase`, `textColour=text-label`, `margin.desktop.bottom=18px`, top 0 | RESTRUCTURED (moved off direct child of group so the hard-coded mono eyebrow no longer applies) |
| "All 40 brands" heading | same, mb 14px | `heading[1]`: same attrs, `margin.bottom=14px` | RESTRUCTURED |
| Top grid (hairline) | 5 cols, gap 1px, bg #E6E1DA, border 1px #E6E1DA, mb 30px | `sgs/card-grid`: `columns={desktop 5, tablet 3, mobile 2}`, `gap.desktop=1px`. `sgs/card-grid` block.json declares no `backgroundColour` and no margin attribute (only grid `borderWidth`/`borderColour`), so the hairline lives on a holder `sgs/container` around it: `backgroundColour=border`, `borderStyle=solid`, `borderWidth` 1px all, `borderColour=border`, `margin.desktop.bottom=30px`, `textAlign=center` | RESTRUCTURED |
| Tile box | bg #fff, padding 20px 14px, centred column, gap 6px | card-grid: `variant=card`, `cardBackground=surface-alt`, `cardShadow=none`, `cardRadius="0"`, `cardPadding.desktop` 20px 14px (paints `.sgs-card-grid__body`). Each whole tile is one `<a class="sgs-card-grid__item">` (fixes the small click target). Centring: card-grid has no text-align control (its `style.typography.textAlign` path is not declared in block.json), so the holder container `textAlign=center` is inherited by title and subtitle. Title-to-subtitle gap 6px: NO control (`.sgs-card-grid__title` margin-bottom is `var(--wp--preset--spacing--10)` = 0.25rem = 4px in the theme) | SET / GAP (gap is 4px, not 6px) |
| Tile hover | bg #F7F4EF, .25s | `backgroundColourHover="#F7F4EF"` (hex, no slug), `effectHover=none`, `shadowLiftOnHover=false`. Transition uses the card-grid `transitionDuration` default 300ms (attribute exists; left default, draft .25s) | SET |
| Tile order and content | Ray-Ban, Gucci, Oakley, Prada, Versace, D&G, Balenciaga, Michael Kors, Polaroid, Police, Carrera, Ferrari Scuderia | `items[]` in draft order: `title`=brand, `subtitle`="48 frames" etc. (draft counts 48, 44, 17, 12, 11, 9, 7, 18, 12, 10, 9, 6), `link`=/shop/?brands=... . No media: `aspectRatio="auto"` collapses the always-rendered empty `.sgs-card-grid__image-wrap` (style.css gives it `aspect-ratio: var(--sgs-card-grid-aspect)`), `imageFallback=false`. `headingLevel=p` for the title. `sgs/brand-strip` still unsuitable (no counts) | RESTRUCTURED |
| Brand name | Playfair 500 14px, .2em, uppercase, #141414, no underline | `titleFontFamily="'Playfair Display',serif"`, `titleFontWeight=500`, `titleFontSize.desktop=14` (px), `titleLetterSpacing.desktop=0.2` (`titleLetterSpacingUnit=em`), `titleTextTransform=uppercase`, `titleColour=text`. No underline: `a.sgs-card-grid__item{text-decoration:none}` in style.css | SET |
| Count line | 11.5px #77716A, no transform, no letter-spacing | `subtitleFontSize.desktop=11.5` (px), `subtitleColour=text-label`, `subtitleTextTransform=none`, `subtitleLetterSpacing.desktop=0` | SET |
| All-brands grid | repeat(auto-fill,minmax(150px,1fr)), gap 2px 20px | `grid[1]`: `layout=grid`, `gridTemplateColumns.desktop=repeat(auto-fill,minmax(150px,1fr))` (tablet 3, mobile 2 cols), `gap.desktop="2px 20px"` (same two-value form as `single-product.tree.json`) | RESTRUCTURED (was `sgs/icon-list`, no grid control) |
| All-brands link | 14px, padding 5px 0, #4A453E, hover #141414 | 40 x `sgs/button` (`custom`): `fontSize.desktop=14`, `colourText=text-soft` (#4A453E), `colourTextHover=text`, `textDecoration=none`, `padding` 5px 0, `contentAlign.desktop=flex-start`. Order and URLs kept from the old icon-list; "ChloÃ©" mojibake corrected to "Chloé" | RESTRUCTURED |
| Brand logos | draft shows a 32px logo image when `C.LOGOS[name]` exists (11 base64 images embedded in the draft) | not set: name text used for all tiles | GAP (asset content; would need media uploads into the tiles, no image block attempted) |

## Lenses panel

Structure: `mega-panel > 4 x mega-group(url) > container(card) > [label, heading, text]`.

| Element | Draft | Set (path -> attr) | Status |
|---|---|---|---|
| Whole card is a link | `<a>` | `mega-group` `url=/prescription-lenses/` (renders the group as `<a>`, `.sgs-mega-group--link` resets underline/colour) | SET (kept) |
| Hairline grid | gap 1px, bg #E6E1DA, border 1px #E6E1DA, `auto-fit minmax(min(100%,230px),1fr)` | `groupGap.desktop="0"` and each card carries its own 1px `border` in `border` colour: top/bottom/left on every card, right on the last only (a 1px line between cards, identical at desktop). Groups share the row via flex-basis 200px. `mega-group` cannot be nested in a container (`parent` constraint) so the grid container route was not available | RESTRUCTURED |
| Card | bg #fff, padding 26px 24px, flex column gap 8px | card `sgs/container`: `layout=stack`, `gap=8px`, `backgroundColour=surface-alt`, `padding` 26px 24px, `minHeight.desktop=100%` (fills the stretched group so unequal text does not leave short cards) | SET |
| Card hover | bg #F7F4EF | `backgroundColourHover="#F7F4EF"` | SET |
| Kicker | 11.5px, .18em, uppercase, #77716A | `sgs/label`: `fontSize.desktop=11.5`, `letterSpacing=0.18` em, `textTransform=uppercase`, `textColour=text-label`, `fontWeight=400` (label default is 600) | SET |
| Price | Playfair 500 26px #141414 | `sgs/heading` (h3): `fontFamily=heading`, `fontWeight=500`, `fontSize.desktop=26`, `letterSpacing.desktop=0`, `textTransform=none`, `textColour=text`, margin 0. Sits inside the card container so the panel's mono eyebrow rule (direct-child only) no longer restyles it | RESTRUCTURED |
| Description | 14px #5E584F, text-wrap pretty | `sgs/text`: `fontSize.desktop=14px`, `textColour=text-muted` (#5E584F), `textWrap=pretty`, margin 0 | SET |
| Copy | kickers, prices, descriptions | unchanged and match draft `megaLensItems` (the mojibake fix on the £ signs already in the working tree is kept) | DEFAULT |

## Uncertain (not verified in a browser)

1. `minHeight.desktop="100%"` on the lens card relies on the stretched flex child of `.sgs-mega-group` counting as definite height. If a card renders shorter than its neighbours, drop it and give all four descriptions equal length, or set a fixed `minHeight`.
2. Tile hover transition uses the card-grid default 300ms (draft .25s); card-grid `.sgs-card-grid__item` transitions background-color, so the hover should fade.
3. Card-grid specifics not verified in a browser: the empty image wrap collapsing with `aspectRatio="auto"` (`aspect-ratio:auto` on an empty div), text-align inheriting from the holder container into the flex-column card body, and the 1fr (not minmax(0,1fr)) column tracks in `.sgs-card-grid` letting a long name widen a column.
4. `sgs/button` `inheritStyle=custom` still carries the base `.sgs-button` rules (inline-flex, `line-height:1.2`, focus outline); the base `:hover` sets `text-decoration:none` and hover colour from `colourTextHover`. Confirm no hover lift/shadow appears.
5. `gap="2px 20px"` two-value form is used elsewhere in the site's trees but I did not read `sgs_css_length_value` to the end; if it is rejected the list gets no gap.
6. `maxWidth=1440px` caps the white panel itself at 1440px (draft: full-width white with 1440px inner). At 1440px viewport they match; on wider screens the panel would not span the header unless nav-bar-menu (other owner) widens it.
7. `panelPadding`, `borderWidth` "0" strings: `sgs_css_length_value("0")` should give `0px`; not confirmed by render.
8. Palette matches used: text-label #77716A, text-soft #4A453E, text-muted #5E584F, border #E6E1DA, surface-alt #FFFFFF, text #141414. #F7F4EF has no slug, used as hex.
9. "View all" footer: mega-panel `viewAllPlacement=auto` may append a "View all" link the draft does not show; left untouched (nav-bar-menu territory).
