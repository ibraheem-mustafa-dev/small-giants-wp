# Mega panels: Sunglasses and Help, draft to block settings

Trees: `sites/eye-care-ward-end/build/mega-sunglasses.tree.json`, `mega-help.tree.json`. Every attribute was checked against its `block.json` (name, type, enum) with a script; 0 unknown, 0 wrong-typed.

## Structural decisions (why the trees changed shape)

1. **Group headings.** `mega-panel/render.php` hard-codes a monospace 11px / 500 / .14em / muted "eyebrow" on any *direct child* `sgs/heading` of a `sgs/mega-group` (selector `.sgs-mega-group > .sgs-heading`, higher specificity than the heading's own rules). No attribute overrides it. Fix: each group holds one `sgs/container` (div, stack) and the heading sits inside it, so the eyebrow rule no longer matches and the heading's own typography controls paint.
2. **Link rows.** `mega-panel` `columns` style hard-codes `.sgs-mega-group .sgs-icon-list__item{display:flex;gap:13px;padding:11px 12px;border-radius:13px}` (0,4,0). `sgs/icon-list` `itemPaddingBlock` (0,3,0) loses, and the 12px inline padding has no control. Fix: link rows are `sgs/button` (`inheritStyle: custom`, no border/background) inside a `sgs/container`; buttons never match the icon-list rule.
3. **Promo card.** `sgs/media` cannot overlay its caption (caption is a `figcaption` below the image; no overlay-text option). Rebuilt as `mega-group[url]` (renders the whole group as one `<a>`) > `sgs/container` with background image + `overlayGradient` + bottom-aligned heading and text.
4. `sgs/mega-panel` `allowedBlocks` (general) is `mega-group`/`mega-aside` only; the old tree had `sgs/media` directly in the panel. The promo is now inside a `mega-group`.

## Sunglasses panel ("megaSun")

Paths: `P` = `[0] sgs/mega-panel`; `G1/G2/G3` = its three `sgs/mega-group` children; `C` = the group's `sgs/container`.

| Element | Draft value | What I set | Status |
|---|---|---|---|
| Panel background | #fff | P `panelBg=surface-alt` (#FFFFFF in snapshot) | SET |
| Panel radius | square | P `borderRadius=0px` (default 20px) | SET |
| Panel border | border-bottom 1px #E6E1DA | P `borderWidth={top:0px,right:0px,bottom:1px,left:0px}`, `borderStyle=solid`, `borderColour=border` (#E6E1DA) | SET |
| Panel shadow | 0 24px 48px rgba(20,20,20,.12) | P `shadow="0px 24px 48px"`, `shadowColour="text 12%"` (text = #141414 = 20,20,20; renders as color-mix 12%) | SET |
| Inner max-width | 1440px | P `maxWidth.desktop=1440px` | SET |
| Inner padding | 36px 52px 40px | P `panelPadding.desktop={top:36px,right:52px,bottom:40px,left:52px}` | SET |
| Column gap | 44px | P `groupGap.desktop=44px` (also the default) | DEFAULT (set explicitly) |
| Column widths | 1.1fr / 1fr / 1.2fr | none | GAP (see below) |
| Heading font, size, spacing, case, colour, weight | body font, 11.5px, .2em, uppercase, #77716A, regular | G1/G2 C > `sgs/heading`: `fontFamily=body`, `fontSize.desktop=11.5`, `letterSpacing.desktop=0.2` + `letterSpacingUnit=em`, `textTransform=uppercase`, `textColour=text-label` (#77716A), `fontWeight=400`, `lineHeight.desktop=1.5` unitless | RESTRUCTURED (heading moved into a container to escape the panel eyebrow rule) |
| Heading margin-bottom | 16px | same heading `margin.desktop={top:0px,bottom:16px}` | RESTRUCTURED |
| "By style" grid | 2 columns, gap 4px 20px | G1 C > `sgs/container`: `layout=grid`, `columns.desktop=2`, `gridTemplateColumns.desktop=repeat(2,minmax(0,1fr))`, `gap.desktop="4px 20px"` | SET |
| "Shop by" list | flex column, gap 4px | G2 C > `sgs/container`: `layout=stack`, `flexDirection=column`, `gap.desktop=4px` | SET |
| Link font size | 14.5px | each `sgs/button`: `fontSize.desktop=14.5`, `fontSizeUnit=px` | RESTRUCTURED (icon-list to button) |
| Link padding | 6px 0 | `padding.desktop={top:6px,right:0px,bottom:6px,left:0px}`, `minHeight.desktop=0` (button default is 48px), `lineHeight.desktop=1.5` unitless (14.5 x 1.5 + 12 = 33.75px pitch) | RESTRUCTURED |
| Link text-transform / letter-spacing | none / 0 | `textTransform=none`, `letterSpacing.desktop=0` (`letterSpacingUnit=px`) | RESTRUCTURED |
| Link weight, colour, decoration, alignment | inherit (400), body #141414, none | `fontWeight=400`, `colourText=text`, `contentAlign.desktop=flex-start`; underline is off by default (`.sgs-button{text-decoration:none}`) | RESTRUCTURED |
| Link URLs / labels | (as before) | unchanged, 12 styles + 6 shop-by | kept |
| Promo link card | `<a>` around the card | G3 `mega-group` `url=/prescription-lenses/` (renders `<a>`) | RESTRUCTURED |
| Promo aspect ratio | 16/10 | G3 C `boxAspectRatio="16 / 10"` | RESTRUCTURED |
| Promo background / border | #F3F0EB, 1px #E6E1DA | G3 C `backgroundColour=surface-stage` (#F3F0EB), `borderStyle=solid`, `borderWidth` 1px all sides, `borderColour=border` | RESTRUCTURED |
| Promo image | cover, position center 25% | G3 C `backgroundImage={id:160,...}`, `backgroundSize=cover`, `backgroundPosition="center 25%"` | RESTRUCTURED |
| Promo overlay | linear-gradient(180deg,rgba(20,20,20,0) 40%,rgba(20,20,20,.8) 100%) | G3 C `overlayGradient` = same string; `backgroundOverlayOpacity.desktop=100` (default 30 would fade it) | RESTRUCTURED |
| Promo text position | bottom-left, 22px padding | G3 C `layout=flex`, `flexDirection=column`, `justifyContent=flex-end`, `padding` 22px all sides, `gap=0px` | RESTRUCTURED |
| Promo title | Playfair Display 500 22px #FAF8F5 | `sgs/heading` h3: `fontFamily='Playfair Display',serif`, `fontSize.desktop=22`, `fontWeight=500`, `textColour=text-inverse` (#FAF8F5), margin 0 | RESTRUCTURED |
| Promo subtitle | 13.5px #EDE7DC, margin-top 4px | `sgs/text`: `fontSize.desktop=13.5`, `textColour=#EDE7DC` (no palette slug), `margin.desktop.top=4px` | RESTRUCTURED |

## Help panel ("megaHelp")

| Element | Draft value | What I set | Status |
|---|---|---|---|
| Panel box (bg, radius, border, shadow, max-width, padding) | as above | identical panel attributes to Sunglasses | SET |
| Column gap | 36px | P `groupGap.desktop=36px` | SET |
| Columns | auto-fit minmax(200px,1fr) | panel groups are `flex:1 1 200px` (equal widths, wrap) | DEFAULT |
| Headings ("Buying here", "Prescriptions", "Talk to me") | as Sunglasses but margin-bottom 14px | same heading attributes, `margin.desktop.bottom=14px` | RESTRUCTURED |
| Link rows | 14.5px, padding 6px 0, gap 4px | same button and `stack` container settings as Sunglasses | RESTRUCTURED |
| "Buying here" list | Delivery & returns, Size guide, FAQ | the old tree lacked "Size guide"; added `url=#size-guide` (same anchor as `mobile-menu.tree.json`) | SET (draft difference) |
| Talk to me: Contact | plain text link | button, url `/contact/` | RESTRUCTURED |
| Talk to me: phone | plain link, number, no icon | button `label="0121 729 8233"`, `url=tel:01217298233`, `linkSource=phone` (resolves from Site Info, falls back to the typed url); no icon; `sgs/business-info` removed | RESTRUCTURED |
| Talk to me: WhatsApp | "WhatsApp me", #1B7F43, wa.me/4479605978 | button `url=https://wa.me/4479605978`, `linkTarget=_blank`, `rel=noopener`, `colourText=success` (#1B7F43) | RESTRUCTURED |
| Social icons row | not in draft | `sgs/social-icons` removed | RESTRUCTURED |

## GAPs

1. **Column proportions 1.1fr / 1fr / 1.2fr (Sunglasses).** `sgs/mega-panel` forces `.sgs-mega-group{flex:1 1 200px}` and `sgs/mega-group` has no attributes (`url`, `opensInNewTab`, `rel` only). Searched: `mega-panel/block.json` (all attributes, grepped `flex`, `width`, `column`, `grid`), `mega-panel/render.php` (`$style_col . $rel_group`), `mega-group/block.json`, `mega-group/render.php`. Effect: three equal columns (about 416px each at 1440 instead of 416 / 378 / 454). Fix needs a new mega-panel control (per-group flex-grow) or a `gridTemplateColumns` option on the panel content row.

## Verify in the browser (uncertain)

1. **Promo image.** `backgroundImage.url` is the hero.jpg URL only to satisfy the has-image gate. The container renders through `sgs_responsive_image(id, url)`, which should use attachment 160 (the id the old tree used). Confirm the promo shows attachment 160, not hero.jpg. If not, put 160's real URL in `backgroundImage.url`.
2. **Promo bottom alignment.** Text should sit bottom-left. It relies on `layout=flex` + `flexDirection=column` + `justifyContent=flex-end` inside a `boxAspectRatio` box. If the container's inner band does not stretch to the card height, the text will sit at the top.
3. **Promo overlay opacity.** Check the gradient paints at full strength (`backgroundOverlayOpacity=100`).
4. **Button row size.** Check computed link height about 33.75px, no 48px minimum, no 24px side padding, no border or fill, and that `letterSpacing=0` is emitted (0 may be treated as unset, which would leave inherited letter-spacing).
5. **`sgs/button` inline-flex width.** Confirm each link sits on its own row in the flex-column list and that the two-column "By style" grid cells are equal width.
6. **Heading escape.** Confirm the headings compute Outfit, 11.5px, .2em, #77716A, weight 400 (not the monospace eyebrow), and margin-bottom 16px / 14px.
7. **Panel width.** `maxWidth=1440px` caps the panel box itself. Above 1440px viewport the white panel will stop at 1440 instead of running full width; the draft's full-width panel with a 1440 inner needs the nav-bar-menu placement work, or a separate outer-vs-inner control.
8. **Shadow.** `shadow="0px 24px 48px"` + `shadowColour="text 12%"` should compute to `0 24px 48px color-mix(in srgb, #141414 12%, transparent)`.
9. **Mobile drawer.** The drawer copy of a panel is styled around `icon-list` rows and `sgs/container` link rows (`drawerLink*` attributes). These trees now use buttons in containers, so check the drawer (below 1060px) has not regressed, or whether the drawer reads `mobile-menu.tree.json` only.
10. **Panel-forced item padding.** Live measured about 37px row pitch, which suggests the 11px/12px item padding was not applying before; not reproduced from code. Not relevant to the new button rows, but explains why the old numbers looked odd.
11. **Whole-card link.** The `mega-group` becomes an `<a>` only if the rendered content contains no other `<a>`/`<button>`; the promo contains none.
