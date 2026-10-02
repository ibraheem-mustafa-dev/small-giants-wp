# Eye Care: fix register

**Written for:** Bean. Every difference between the Eye Care draft and the live test site that still needs fixing, one line each.

**Where it comes from.** The 2026-10-02 walk of every surface; the classification of its 3,263 unique differences;
then a verification pass that checked each item against the code, the framework database, the layout trees and the
screenshots. The plan this belongs to is `plans/2026-10-02-eye-care-plan.md`.

**Status column:**
- *verified*: real, and the fix is confirmed.
- *fix corrected* / *cause corrected*: real, and the first diagnosis was wrong; the line shows the corrected one.
- *new*: found by the verification pass.
- *not yet verified*: real, but needs a live check when it is built.

**Type column:**
- *tree setting*: change a value in the page's layout file.
- *framework repair*: an existing control that does not work.
- *framework new control*: a missing control that any client would need.
- *content*: a page or data entry.
- *Bean decision*: yours to call.

Not listed: differences already covered by your decisions (pennies on prices, "No reviews yet", the lens pop-up's
Continue button, real frame sizes, review stars 2px apart, no quantity box in the bag) and differences that paint the
same to a visitor.

## Header

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 1 | Top bar sentences are larger than the draft's (14px vs 12.5px) | sgs/trust-bar.labelFontSize = {"desktop":12.5}, labelFontSizeUnit = "px", header.tree.json (not set today; style.css falls back to clamp 13-14px) | tree setting | verified |
| 2 | Hovering "About Eye Care" stays black; draft turns it taupe | same fix as item 6: sgs/nav-bar-menu.itemColourHover = "accent-text" on the second (after-split) nav-bar-menu node, header.tree.json | tree setting | verified |
| 3 | Something in the draft header fades in over half a second; live is static | Find the element first (the walker's entrance check could not name it: watch the draft header load), then set the Animation panel on that block in header.tree.json | tree setting | not yet verified |
| 4 | Phone and Bag fade to 80% on hover on live; draft does not fade (bag ground is slightly lighter on live) | framework: hover opacity 0.8 is hardcoded with no control; build an opacityHover (0 to 1) attribute on sgs/cart and sgs/business-info, or drop the rule. Timing part (0.15s vs 0.25s) is NOT-REAL | framework new control | verified |
| 5 | Top bar icons are bigger than the draft's (20px vs 15px) | sgs/trust-bar.iconBareSize = 15, header.tree.json (default 20) | tree setting | new: found in the check |

## Mega menus

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 6 | Hovering or opening a top menu word keeps it black; the draft turns it warm taupe | sgs/nav-bar-menu.itemColourHover = "accent-text" on both nav-bar-menu nodes (currently "text"), header.tree.json | tree setting | verified |
| 7 | Links inside the Sunglasses and Help panels stay black on hover; draft turns them taupe | sgs/button.colourTextHover = "accent-text" on each mega link button (unset in these trees; brands tree sets "text"), mega-sunglasses.tree.json, mega-help.tree.json | tree setting | verified |
| 8 | Panel text starts 52px too far right (Sunglasses, Brands, Help); columns, brand tiles and list all shift | True cause: the panel's own 52px padding is correct and applied once (probe: .sgs-mega-panel padding-left 52px, first mega-group left 52px); each top container inside a mega-group is an sgs/container with default contentWidth "normal", so it also gets class has-global-padding and pays a second 52px (probe: container padding-left 52px, heading left 104px). Lenses is unaffected because its containers carry explicit padding. Fix: sgs/container.contentWidth = {"desktop":"full"} on the first container inside every mega-group in mega-sunglasses, mega-brands and mega-help trees (the 2 groups' stack containers; not the promo aside, which has its own padding) | tree setting | verified (cause corrected) |
| 9 | Brand tiles show only the logo; the draft shows the 32px logo with the brand name and frame count under it | Keep each tile's logo (`items[].media`) and set `items[].title` = brand name and `items[].subtitle` = the frame count ("48 frames"), with the title styling already in the tree; `titleColourHover` = "accent-text", mega-brands.tree.json (draft: `build/qa/parity/mapping-mega-brands-lenses.md`, logo row) | tree setting | verified (fix corrected) |
| 10 | "Most asked for" and "All 40 brands" headings sit in a shorter line box (12px vs 17px) | sgs/heading.lineHeight = {"desktop":1.5} and lineHeightUnit = "unitless" on both brands headings, mega-brands.tree.json (not set today) | tree setting | verified |
| 11 | Brand name list rows are much taller and bolder than the draft; the panel is about 140px taller | sgs/button.minHeight = {"desktop":0}, fontWeight = "400", lineHeight = {"desktop":1.5}, lineHeightUnit = "unitless" on each list button, mega-brands.tree.json | tree setting | verified |
| 12 | Lens cards are about 15px shorter; text lines are tighter | sgs/label.lineHeight = 1.5 (unit stays "em", so 1.5em); sgs/heading (price) lineHeight = {"desktop":1.5}, lineHeightUnit "unitless", mega-lenses.tree.json | tree setting | verified |

## Phone drawer

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 13 | Drawer title hugs the left screen edge and the close button sits against the right edge; draft has 24px each side | sgs/nav-drawer.chromeRowPadding = {"desktop":{"top":"20px","right":"24px","bottom":"0px","left":"24px"}} in mobile-menu.tree.json (currently left/right "0px") | tree setting | verified |
| 14 | Items inside the Shop group all appear at once; draft staggers each link in | framework: nested stagger (known; main session design, CSS-only "stagger items inside groups" on sgs/nav-drawer). Confirmed no existing control reaches them: stagger rules target only `.sgs-nav-drawer__body > :not(.wp-block-sgs-nav-drawer-menu)` and `.sgs-nav-drawer-menu__item` | framework new control | verified |
| 15 | Phone drawer: bottom block (phone, social buttons) sits 64px lower than the draft and the social row is pushed off the bottom of the screen | framework repair: .sgs-nav-drawer__body has min-height:100% but sits below the 64px chrome row, so the body is 812px tall starting at y=64. Make the drawer a column flex container and give the body flex:1 1 auto (or min-height: calc(100% - chrome height)) | framework repair | new: found in the check |

## Bag drawer

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 16 | Drawer fades in as it slides; draft only slides | framework: setting to drop the opacity step in cart/style.css::@keyframes sgs-cart-drawer-in | framework new control | verified |
| 17 | Bag count pop uses a different size and timing | framework: duration and scale settings for countPopAnimation | framework new control | verified |
| 18 | "Added to bag / View bag" toast missing | framework: add-to-bag toast option | framework new control | verified |
| 19 | Free-delivery text is bolder and bar fills faster | framework: freeDeliveryTextFontWeight and a fill-duration setting | framework new control | verified |
| 20 | Line details read as two labelled lines, draft one line | framework: option for a joined detail line without labels | framework new control | verified |
| 21 | Top announcement text is bigger and bolder | The element is sgs/trust-bar (not the cart): labelFontSize = {"desktop":12.5}, labelFontSizeUnit = "px", labelFontWeight = "400". header.tree.json | tree setting | verified (fix corrected) |
| 22 | Close not reached by Tab | Needs a live keyboard run; a still cannot show it | none | not yet verified |
| 23 | Draft shows "Add my prescription" link on a frame-only line | Bean decision, then framework: drawer link for products with a configurator | Bean decision | verified |
| 24 | Product thumbnail has a padded frame in the draft | framework: itemThumbPadding setting; itemThumbBg exists for the colour | framework new control | verified |

## Footer

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 25 | Footer sits tight to the edges and has less space above the columns | Put the 52px sides on the columns row, not the whole footer: sgs/site-footer-row[columns].padding = {desktop:{top:104px,left:52px,right:52px}} (tablet same; mobile top 58px, sides 58px). Leave sgs/site-footer.padding sides at 0 and give the bottom row padding left/right 24px. footer.tree.json | tree setting | verified (fix corrected) |
| 26 | "EYE CARE" wordmark box is taller in the draft | sgs/heading.lineHeight = {"desktop":1.5} with lineHeightUnit = "em" (a bare 1.5 is the wrong shape; the attribute is an object). footer.tree.json | tree setting | verified (fix corrected) |
| 27 | Draft has more room between wordmark, BIRMINGHAM and tagline | sgs/text.margin = {desktop:{top:"4px"}} on BIRMINGHAM, {top:"18px"} on the tagline, {top:"20px"} on the social row. Not container.gap: the draft gaps differ (4, 18, 20). footer.tree.json | tree setting | verified (fix corrected) |
| 28 | Tagline wraps wider than the draft | sgs/text.maxWidth = 32, maxWidthUnit = "ch" (the draft is 32ch; 294px is only its measured result). Check the block does not auto-centre the box. footer.tree.json | tree setting | verified (fix corrected) |
| 29 | Column headings are bold serif; draft is light sans | sgs/heading.fontFamily = "body", fontWeight = "400", lineHeight = {"desktop":1.5} on Shop, Help and Visit or call. footer.tree.json | tree setting | verified (fix corrected) |
| 30 | Link lists: spacing and bullets differ; core/list is banned | sgs/icon-list: markerType = "none", itemFontSize = {"desktop":14}, itemLineHeight = 1.5 (number). gap is a spacing-preset slug (digits only) and no 10px preset exists (10 = 4px, 20 = 8px): add a client spacing slug "15" = 0.625rem in sites/eye-care-ward-end/theme-snapshot.json and set gap = "15". footer.tree.json | tree setting | verified (fix corrected) |
| 31 | "Glasses - arriving soon" is black, draft is grey | icon-list items carry no colour of their own. Keep the three links in the icon-list and put "Glasses - arriving soon" in a following sgs/text with textColour = "text-label" and a 10px top margin. Or framework: per-item textColour in icon-list items. footer.tree.json | tree setting | verified (fix corrected) |
| 32 | Link hover colour and underline differ | Links are painted by the theme link rule, so the span colour does not reach them. Draft is a global a{color:inherit;text-decoration:none} with hover #6F6152. Fix in theme-snapshot.json: styles.elements.link colour inherit, textDecoration none, hover = accent-text (#6F6152), applied site-wide. icon-list textColourHover then not needed. Confirm after apply. | Bean decision (site-wide link style) | verified (cause corrected) |
| 33 | "About Eye Care" underlined on live | Same cause as item 32: sgs/text.textDecoration = none does not remove the link's own underline. Cleared by item 32's snapshot change. | tree setting (snapshot) | verified (cause corrected) |
| 34 | Phone hover colour | sgs/business-info.textColourHover = accent-text, footer.tree.json | tree setting | verified |
| 35 | Phone hover fades to 0.8 opacity | framework: add a setting to switch off the hover fade in business-info/style.css::.sgs-business-info__link:hover | framework new control | verified |
| 36 | Address: one line with comma, not two lines | The block prints Site Info address as stored. Store it with a line break (Appearance > SGS Site Info). No block change. | content | verified (cause corrected) |
| 37 | Address is not a link to Google Maps | framework: add an address-link option to business-info (address case) | framework new control | verified |
| 38 | Hours are bold and split across the row | sgs/business-info hours: fontWeight = "400", hoursLayout = "condensed", hoursCondensedInline = true. footer.tree.json | tree setting | verified |
| 39 | Social boxes: ground, border and glyph colour | In colourMode = brand the block overrides ground, border and glyph with the network colour, so iconBackground and iconBorderColour are ignored (this is why live shows a coloured border). Same for per-item colour. Fix: framework: a brand mode that colours the glyph only (with multi-colour logos), plus iconBackground white and iconBorderColour border in the tree. | framework new control | verified (cause corrected) |
| 40 | Gap between social boxes 4px, draft 10px | gap is a spacing-preset slug; "10" = 0.25rem = 4px. Use the client slug "15" (as item 30): gap = "15". footer.tree.json | tree setting | verified (cause corrected) |
| 41 | Social order Instagram, Google, WhatsApp | framework: social-icons source site-info needs an order control; order is fixed in social-icons/render.php::$site_info_networks (whatsapp before google) | framework new control | verified |
| 42 | Social hover: network-colour border and ring, no scale | framework: per-network hover colour (border and ring) and an option to switch off the 1.1 scale | framework new control | verified |
| 43 | Instagram glyph is a gradient in the draft | framework: per-network gradient glyph | framework new control | verified |
| 44 | Privacy and Terms are underlined and dark | Same as items 32 and 33 (global link style). For grey: link inherits from a sgs/text textColour = "text-label" once item 32 is applied. footer.tree.json | tree setting (snapshot) | verified (cause corrected) |
| 45 | /privacy and /terms return 404 | Create Privacy and Terms pages | content | verified |
| 46 | Bottom row: copyright and Privacy/Terms placement and inset | sgs/site-footer-row[bottom]: padding left/right = 24px, justifyContent = space-between (in tree), copyright inside a sgs/container with a max width. footer.tree.json | tree setting | verified |
| 47 | Moved text, cleared by other causes | none; re-run the walker after the rebuild | none | verified |
| 48 | Footer: draft footer starts with a faint top line and more air above; live has a blank white band under the page | Check page-to-footer spacing in the footer tree | tree setting | new: found in the check |

## Floating WhatsApp button

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 49 | The floating "Ask me anything" WhatsApp button has a larger icon and a bigger, bolder label than the draft (seen at 1440 and 375 on every page) | sgs/whatsapp-cta (floating, in footer.tree.json): iconSize, labelFontSize and labelFontWeight to the draft values (read them from the draft first) | tree setting | new: found in the check |

## Home

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 50 | Hero "Shop sunglasses" button does not lift on hover; the draft lifts it 3px | sgs/button.liftHover = 3 on the Shop sunglasses button, home.tree.json | tree setting | verified |
| 51 | Hero photo has no slow zoom-out on load; the draft eases it in | framework: make bgKenBurns paint on the standard hero variant, hero/style.css::.sgs-hero--ken-burns.sgs-container--has-bg-image::before | framework repair | verified |
| 52 | Brand logo strip never starts scrolling | framework: brand-strip/view.js::init must not wait for off-screen lazy images | framework repair | verified |
| 53 | Hero photo stays still when scrolling; the draft photo drifts slower than the page | framework: add a "drift" parallax mode (translate at a strength factor, draft 0.18) to hero bg, hero/style.css::.sgs-hero--parallax | framework new control | verified |
| 54 | WhatsApp button text shifts to near-black on hover/focus; draft stays dark green | none for the text; the colour belongs to the icon (see item 55) | framework new control | verified (cause corrected) |
| 55 | WhatsApp icon is near-black; the draft's is dark green (subtle) | framework: add iconColour / iconColourHover to sgs/whatsapp-cta, or have the icon follow labelColour (whatsapp-cta/render.php, scoped rule on .sgs-whatsapp-cta__icon) | framework new control | verified |
| 56 | Reviews header gaps between "15 reviews", See all and Write a review differ by 6-7px | none yet; "no setting" is wrong, headerGap, aggregateStarSize and seeAllPadding exist | Bean decision | not yet verified |
| 57 | "Message me on WhatsApp" opens a prefilled message; the draft opens a bare chat | sgs/whatsapp-cta.message = "" on the optician button, home.tree.json (or keep the prefill) | Bean decision | verified |
| 58 | Hero buttons appear instantly; the draft fades them up after the text | sgs/multi-button: sgsAnimation = fade-up, sgsAnimationDistance = 18, sgsAnimationDuration = 900, sgsAnimationEasing = ease, sgsAnimationDelay = 560 (not 420), home.tree.json | tree setting | verified (fix corrected) |
| 59 | Colour dots on product cards cannot be tabbed to or clicked; draft dots are buttons that switch the card's colour | framework: optional interactive swatches on sgs/product-card that change the card image and take focus, product-card-builtin-render.php::sgs_product_card_swatches_markup | framework new control | verified |
| 60 | Draft "Add your prescription" (hero) and "How lenses work here" also lift 3px on hover; no row open | sgs/button.liftHover = 3 on both, home.tree.json | tree setting | new: found in the check |

## Shop

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 61 | Card colour dots cannot be tabbed to or clicked | same as item 59 | framework new control | verified |
| 62 | Size chips read "Small (4)"; the draft says "Small" | woocommerce/product-filter-attribute (attributeId 10) showCounts = false, archive-product.tree.json | tree setting | verified |
| 63 | The "Measured across one lens" note under Size is missing | add an sgs/text (12.5-13px, muted) after the Size filter in archive-product.tree.json | content | verified |
| 64 | Filter drawer's "Filter / close" header is not pinned when scrolled at 375/768 | framework repair: keep the header fixed when a field is focused and the sheet scrolls, theme/sgs-theme/assets/css/woocommerce.css (dialog#sgs-shop-filters:modal); cause not reproduced | framework repair | verified (cause corrected) |
| 65 | On narrow cards the "Polarised" tag drops under the name; the draft keeps it beside a two-line name | framework: lower or remove the `@container sgs-card-body (max-width: 200px)` wrap rule in product-card/style.css | framework repair | verified |
| 66 | Shop filter drawer: draft shows "up to £340" beside the Price heading; ours shows nothing | framework or tree: show the current price ceiling in the Price group header | Bean decision | new: found in the check |

## Product page

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 67 | Description and Details text sits inset from the tab line and is smaller than the draft, so lines wrap differently | The 24px inset is hardcoded on the tab panel, so a wrapper container with padding 0 cannot cancel it. Framework: add a panel padding attribute to sgs/tabs (tabs/style.css::.sgs-tabs__panel `padding:24px`; tabs/render.php), then set it to 0 in single-product.tree.json. Text size: core/post-content `style.typography.fontSize "16px"` is fluid-scaled by core (snapshot typography.fluid 375 to 1200px), giving 14.95px at 768 and 14px at 375, while the draft holds 16.5px. Use a non-fluid size preset (add a `fluid:false` 16.5px entry to theme-snapshot.json fontSizes and set it on core/post-content). | framework new control + tree setting | verified (fix corrected) |
| 68 | Colour swatches are 8px taller and show flat colour with a gap above the image | Cause is option-picker/style.css: the final tile rule `.sgs-option-picker--tile .sgs-option-picker__pill { min-height:44px; padding-top:6px }` pads every tile, even those with a photo or colour block. Framework repair: scope that padding to tiles with no swatch media. Setting pickerSwatchStyle to "outlined" would turn the tiles into plain pills, which is wrong. The tree already has pickerSwatchStyle "tile". | framework repair | verified (cause corrected) |
| 69 | Size-guide pop-up has bigger inner margins and a different heading and close position | The modal's own width control exists and is already set (footer.tree.json sgs/modal dialogWidth "720"). Box width is equal at 1440; it differs only at 768 (704 vs 720, 16px). The visible gap is the hardcoded dialog padding `3rem 2rem 2rem` and absolute close button in modal/style.css, with no padding control and no header row with a divider. Framework: add padding (and optional header bar) to sgs/modal. | framework new control | verified (cause corrected) |
| 70 | Accordion rows are shorter, answers lack bottom space, open header is white, text is smaller on mobile | accordion.padding and .fontSize do nothing for the header: accordion/style.css::.sgs-accordion-item__header hardcodes padding 16px 20px, gap 12px, font-size 1rem, background-color surface, and the 600px media query hardcodes 14px 16px / 0.9rem. render.php emits none. headerBackgroundOpen is declared (block.json, edit.js) but no render.php or CSS reads it. Framework repair first: make the header and content read padding, gap, fontSize, header ground (default transparent) and open ground. Then set accordion.padding, fontSize and headerBackground in single-product.tree.json. Flush content padding (0 0 16px) also needs a 20px bottom option. | framework repair | verified (fix corrected) |
| 71 | Swatch names are bigger, bolder and darker, and the chosen colour name is larger | Framework new control: sgs/buybox forwards no pill typography (no pillFontSize, pillFontWeight, pillLetterSpacing, pillTextColour reach option-picker, which has them). Forward them, and size the selected value (buybox/style.css::.sgs-buybox__picker-selected-value) from the label size. | framework new control | verified |
| 72 | Tabs, reviews and similar-shapes sections fade up on scroll in the draft only | sgs/container.sgsAnimation = "fade-up", sgsAnimationDistance = "26" on the three section containers, single-product.tree.json. The attribute is added to every sgs/* block by the animation extension (precedent: about.tree.json). | tree setting | verified |
| 73 | Main product photo fades and scales in on load in the draft only | The class named sgs/gallery.sgsAnimation, but the product photo is drawn by sgs/buybox (gallery-col.php or the core product-image-gallery), not sgs/gallery. sgsAnimation on sgs/buybox exists but would animate the whole buybox including the price column. Framework new control: a gallery-photo entrance on the buybox. | framework new control | verified (fix corrected) |
| 74 | WhatsApp card is shorter than the draft's, with larger text | cardTitleFontSize and cardSublineFontSize do exist on sgs/whatsapp-cta. Set subline 13px, but the 5px height gap is padding (375px inset 15 vs 18): also set sgs/whatsapp-cta.padding in single-product.tree.json. | tree setting | verified (fix corrected) |
| 75 | Draft shows four gallery thumbnails under the photo; live shows none | Content: add gallery images to the product so the strip draws. Do not copy the draft's "colourway shots are stand-ins" note or the "Angle" tap, which are mock-up text. | content | verified |
| 76 | Draft colour swatches lift 2px on hover; live shows none | option-picker/style.css already lifts a tile 2px on :hover and :focus-within. The probe likely read a different element, and no hover screenshot exists. Re-probe the hover on the pill element before acting. | none until re-probed | not yet verified |
| 77 | Chosen colour swatch frame is 2px live, 1px in the draft | Framework new control: option-picker selected tile border width is hardcoded `border-width:2px` (no width attribute). Size button M is a filled black pill, so the 1px difference is invisible there; only the colour tile shows it. Low priority. | framework new control | verified |
| 78 | WhatsApp card text is dark green in the draft, near-black and brown live | cardTitleColour and cardSublineColour exist, but the palette has no slug for #12301E or #2F5C3F. Add two slugs to sites/eye-care-ward-end/theme-snapshot.json palette, then set cardTitleColour, cardSublineColour (and cardTitleFontWeight "400", row 174) in single-product.tree.json. | tree setting + snapshot token | verified (fix corrected) |
| 79 | WhatsApp card grows and lifts on hover live; draft is static | Controls exist (the class said none): hover extension is enabled on sgs/whatsapp-cta with defaults scale 1.02, lift 1, soft shadow. Set sgsHoverScalePreset, sgsHoverLift = 0 and sgsHoverShadow to their off values in single-product.tree.json (confirm the off slug in includes/hover-effects/resolve.php). | tree setting | verified (fix corrected) |
| 80 | RRP and struck prices are near-black live, grey in the draft | Framework new control: no attribute for the struck RRP colour on sgs/buybox (buybox/style.css::.buybox__rrp-price s) or the card price on sgs/product-card. | framework new control | verified |
| 81 | Size-guide Close has a grey square ground and rounded corners; draft is plain | closeStyle is already "glyph" in footer.tree.json (the class's "square" is not a valid value; enum is icon/glyph). The grey ground (rgb 240) is the browser's default button fill showing through, because modal/style.css::.sgs-modal__close--glyph only removes the ::after disc. Framework repair: give the glyph close `background:transparent; border-radius:0`. | framework repair | verified (cause corrected) |
| 82 | Colour swatches are flat colour blocks; draft shows each variation's photo | sgs/buybox.pickerVariationSwatch = true in single-product.tree.json. Only helps where the variations have their own photos. | tree setting | verified |
| 83 | "Add my prescription" label sits 6px further from the left edge | sgs/button.padding = {"desktop":{"left":"22px","right":"22px"}} on the Add my prescription button, single-product.tree.json. | tree setting | verified |
| 84 | Size M cannot be reached with Tab live | Needs the live DOM. Option-picker renders radio inputs, which are normally Tab-reachable, so the probe may be at fault. | none until live DOM checked | not yet verified |
| 85 | "Or 3 payments of 96.33 with Klarna..." line under the buttons is missing | Bean decision: no block or plugin draws it, and the bindings cannot divide the price by 3. Static text would claim a payment method the shop may not have. | Bean decision | verified |
| 86 | Live shows a "4.7, 15 reviews" card beside "No reviews on this frame yet" | Remove the sgs/google-reviews child from the none-yet container in single-product.tree.json. | tree setting | verified |
| 87 | Current breadcrumb "Gucci" is bold live, regular in the draft | Framework repair: breadcrumbs/style.css::.sgs-breadcrumbs__item--current hardcodes font-weight 600, overriding the block's fontWeight 400. Make it inherit fontWeight. | framework repair | verified |
| 88 | Stock line is bold live, regular in the draft | Framework new control: buybox/style.css::.sgs-buybox .buybox__stock hardcodes font-weight 600; no stock weight attribute exists. | framework new control | verified |
| 89 | Price on the "Add to bag" button is bold live, regular in the draft | The 700 is the button's price span, not the headline price (priceFontWeight "500" is set and works). buybox/style.css::.buybox__cart-price hardcodes font-weight 700, so addToCartFontWeight "400" never reaches it. Framework repair: let it inherit the button weight. | framework repair | verified (cause corrected) |
| 90 | "from +59" note on the dark button is cream live, taupe in the draft | Framework new control: sgs/button has `note` text but no note colour attribute. | framework new control | verified |
| 91 | Details tab shows no "In stock" in the Availability cell | Tree is right. includes/class-product-bindings.php::stock_status returns WooCommerce get_availability(), which is empty for in-stock items with no managed stock. Framework repair: fall back to "In stock" / "Out of stock". | framework repair | verified (cause corrected) |
| 92 | Draft Sizing tab shows a frame diagram with measurement labels; live is a list | Framework new control: a labelled dimension diagram block (none exists; searched block.json files for hotspot, callout, diagram, annotation, measurement). | framework new control | verified |
| 93 | Add-to-bag confirmation is a dark pill in the draft; live shows a red basket notice | Framework new control: an add-to-cart toast. notice-banner offers only inline, bar and announcement modes and is not triggered by add-to-cart; no toast in src or includes. | framework new control | verified |
| 94 | Photo does not zoom and brighten on hover live | Framework new control: opt sgs/buybox into the shared hover extension (supports.sgs.enabledExtensions + hoverDefaults imageZoom) and put the gallery photo on the shared image-zoom hooks (.sgs-has-img-zoom, .sgs-media-box / .sgs-media-el, assets/css/extensions.css). The shared zoom is a scale only; the draft's brightness(1.14) saturate(0.7) on hover is extra. | framework new control | verified |
| 95 | Details tab is a 4-column grid live, a plain 2-column list in the draft; several spec rows are empty | Tree: Details grid gridTemplateColumns.desktop = "repeat(2,minmax(0,1fr))" in single-product.tree.json; empty rows (Style, Frame type, Material, Hinge, Nose pads) are product content. | tree setting + content | new: found in the check |

## Lens pop-up

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 96 | Keyboard focus ring on cards, Back and Add to bag is black live, taupe in the draft | Framework repair: choice-flow/style.css focus rules (.sgs-choice-flow__add-to-basket:focus-visible, __continue, choice-flow-question __option-button:focus-visible) use the primary preset (near-black). Use --wp--custom--focus-ring--color-primary, which the client snapshot already sets to the taupe accent. No attribute is needed. | framework repair | verified |
| 97 | The "?" help toggle fills black with cream text when focused; draft stays white | Framework repair: remove :focus-visible from choice-flow-question/style.css `.sgs-choice-flow--layout-showcase .sgs-info-toggle:hover, ...:focus-visible` dark fill (the draft darkens on hover only). | framework repair | verified |
| 98 | Add to bag in the pop-up has rounded corners live, square in the draft | No sgs/button exists in lens-configurator.tree.json. The radius comes from choice-flow/style.css `border-radius: var(--wp--custom--button-presets--primary--border-radius, 8px)`. Set the client's primary button-preset radius to 0 (class-button-preset-setting.php / customiser), or add a radius control to sgs/choice-flow like backBorderRadius. | tree setting (site token) or framework new control | verified (fix corrected) |

## Lenses page

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 99 | Page heading lines are slightly tighter/looser: draft 1.02, ours 1.0 desktop and 1.2 on mobile | sgs/heading (H1) lineHeight = {desktop:1.02, tablet:1.02, mobile:1.02}, lineHeightUnit = "unitless", lenses.tree.json | tree setting | verified |
| 100 | Lens price cards are 4px shorter than the draft | the price text in each of the 4 cards: sgs/text.margin = {desktop:{top:"4px"}} (label to price 10px = 6px gap + 4), lenses.tree.json. Not a description line-height | tree setting | verified (fix corrected) |
| 101 | Gap between the two section headings and their lists is 16px too big | sgs/heading.margin = {desktop:{bottom:"0px"}} on both H2s, lenses.tree.json | tree setting | verified |
| 102 | "How it goes" step numbers are large and bold; draft numbers are small, medium weight; lines wrap differently | sgs/process-steps: numberFontSize = {desktop:15.5}, numberFontWeight = "500", numberGap = "16px", stepGap = "15px", lenses.tree.json | tree setting | verified (fix corrected) |
| 103 | "Choose a frame" button text is bolder than the draft | sgs/button.fontWeight = "400", lenses.tree.json | tree setting | verified |

## About

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 104 | "Shop the range" button lifts 3px on hover; draft only changes its ground | `button.shadowLiftOnHover=false` is wrong: it only controls the shadow, and 3px is the `translateY` lift. True cause: `theme-snapshot.json` buttonPresets.outline `hover-transform` (-3px), read by `button/style.css::.sgs-button--outline`. Draft home outline buttons DO lift, so changing the preset breaks home. Needs a per-button "no hover transform" control: framework new control in `button/render.php` | framework new control (or Bean decision) | verified (fix corrected) |
| 105 | Heading, credentials line and intro sit closer together than the draft; page below sits higher | eyebrow `sgs/text.margin.desktop.bottom=10px` and credentials `sgs/text.margin.desktop.bottom=28px` are right. Name `sgs/heading.margin.desktop.bottom` must be 20px, not 12px: heading default is 8px (`heading/style.css`), draft is 20px (so 8 to 12 gives 61, not 69). about.tree.json | tree setting | verified (fix corrected) |
| 106 | Credential card titles are cramped, cards come out shorter | `sgs/heading.lineHeight={desktop:1.5}`, `lineHeightUnit=unitless` is right, but also set `margin.desktop.bottom=6px` on the four card headings (default 8px; draft text sits 6px under the title). about.tree.json | tree setting | verified (fix corrected) |
| 107 | Text column is too narrow and credential column too wide, so text wraps differently | main `sgs/container.gridTemplateColumns.desktop="1.1fr 1fr"`. about.tree.json | tree setting | verified |
| 108 | Message-me button lifts, grows and gains a shadow on hover; draft only changes colour | Not a gap: whatsapp-cta has the universal Hover panel. Set `sgs/whatsapp-cta.sgsHoverLift=0`, `sgsHoverScalePreset=""`, `sgsHoverShadow=""` (block defaults are lift 1, scale 1.02, shadow soft). about.tree.json | tree setting | verified (fix corrected) |
| 109 | About WhatsApp icon size differs | `sgs/whatsapp-cta.iconSize="19px"` (draft icon is 19px on about, 21px on contact). The earlier "14px" would shrink it | tree setting | new: found in the check |

## Help

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 110 | Open question row has a white band the draft does not have | `headerBackground` and `headerBackgroundHover` = transparent is not enough: the visible white is the open state. Add `sgs/accordion.headerBackgroundOpen="transparent"`. The cream rest and hover rows (row 92) are the same colour as the page, so invisible. help.tree.json | tree setting | verified (fix corrected) |
| 111 | FAQ answers wrap narrower or wider than the draft | each answer `sgs/text.maxWidth=720` (number, `maxWidthUnit` defaults to px), not the string "720px". help.tree.json | tree setting | verified (fix corrected) |
| 112 | "Call the clinic" line is a different grey and taller | phone `sgs/business-info.textColour=text-muted`, `lineHeight={desktop:1.5}`, `linkMinHeight={desktop:0}` (both are objects). help.tree.json | tree setting | verified |
| 113 | "Call" button lifts 3px on hover; draft only changes ground | Only Call lifts. "Contact me" is inheritStyle custom and does not. Cause is the outline preset `hover-transform` in `theme-snapshot.json`, not `shadowLiftOnHover`. Same remedy as item 104 | framework new control (or Bean decision) | verified (fix corrected) |
| 114 | Pop-up WhatsApp sentence is not a link | No change. The tree already has an `sgs/whatsapp-cta` card with that title and subline; the draft's link is that whole green card, and the walker's text match is what failed. The card is below the fold in the shot | none | verified (cause corrected) |
| 115 | Pop-up lead sentence is a lighter grey than the draft | lead `sgs/text.textColour=text-soft`. size-guide.tree.json | tree setting | verified |
| 116 | Size numbers 55 / 18 / 137 smaller on phone | the three `sgs/text.fontSize.mobile=32`. size-guide.tree.json | tree setting | verified |
| 117 | Pop-up is wider than the draft at tablet, so every line breaks differently | `sgs/modal.dialogWidth` is a single string, not per-tier: 704 would break desktop and phone. True cause: `modal/style.css::.sgs-modal__dialog--large` uses `max-width:calc(100vw - 2rem)`; the draft keeps 32px each side above mobile. Framework: use `calc(100vw - 4rem)` above the phone breakpoint, 2rem on mobile | framework repair | verified (fix corrected) |
| 118 | Keyboard focus never lands on Size guide, Contact me, Call | Needs a real Tab sweep on the live page; the cause is a walker artefact or a real order issue and not visible in a screenshot | none | not yet verified |
| 119 | Page title line spacing is looser on a phone | h1 `sgs/heading.lineHeight={mobile:1.02}`, `lineHeightUnit=unitless`. help.tree.json | tree setting | verified |
| 120 | On a phone the Questions heading and its two links stay side by side; draft stacks them | `container.flexDirection` is a plain string (not per-tier), so "column at mobile" would stack on desktop too. True cause: the draft links are wider (18px gap, padded block) so they wrap under the heading. It follows from fixing H12; no separate setting | tree setting (via H12) | verified (cause corrected) |
| 121 | "Size guide / Contact me" links are plain underlines; draft shows a line 3px below the word with a gap between | No gap. Replace the single text with two `sgs/button` (inheritStyle custom, no ground, `borderWidth.bottom=1px`, bottom padding 3px, minHeight 0, uppercase 13px, letterSpacing 0.08em); the pair already sits in a flex row with gap. Size guide button uses url "#size-guide". help.tree.json | tree setting | verified (fix corrected) |
| 122 | FAQ questions are wrong size, padding and icon; every row below shifts | framework repair first: `accordion/style.css::.sgs-accordion-item__header` and `accordion-item/render.php` must emit `fontSize`/`gap`. Then new controls for header padding and icon size (none exist). Draft is 17px, 20px 20px, 20px gap. Open icon is a large X on live, small in draft | framework repair + framework new control | verified |
| 123 | Pop-up has no header band: draft has a title row with a divider and a plain close; live puts the title in the body and boxes the close button | Framework new control: modal header band (title, divider, sticky close) | framework new control | new: found in the check |

## Contact

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 124 | Heading is 63px on three lines; draft is 48px on two | h1 `sgs/heading.fontSize={desktop:48,mobile:34}`, `lineHeight={desktop:1.02}`, `lineHeightUnit=unitless`; also `margin.desktop.bottom=20px` (heading default 8px) and `textWrap="pretty"` (draft has it). contact.tree.json | tree setting | verified |
| 125 | Gaps under the eyebrow and intro are tighter than the draft | eyebrow `sgs/text.margin.desktop.bottom=10px`; intro `margin.desktop.bottom=28px`. contact.tree.json | tree setting | verified |
| 126 | Left column too narrow; map column too thin | main `gridTemplateColumns.desktop="1.1fr 1fr"`; Map + links container `layout=stack` so the map fills (flex row shrinks the iframe to 300px). contact.tree.json | tree setting | verified |
| 127 | WhatsApp button smaller than the draft | `sgs/whatsapp-cta.minHeight="56px"` (string), `padding={desktop:{left:"26px",right:"26px"}}`, `labelFontSize={desktop:15}` (object, not "15px"), `labelFontWeight="500"`, `iconSize="21px"`. Label colour and hover colour differences are imperceptible, skip. contact.tree.json | tree setting | verified (fix corrected) |
| 128 | Details are always two columns; draft goes 2 / 3 / 1 | details `gridTemplateColumns={desktop:"repeat(2,minmax(0,1fr))",tablet:"repeat(3,minmax(0,1fr))",mobile:"1fr"}`, gap 24px. contact.tree.json | tree setting | verified |
| 129 | Label sits closer to its value than in the draft | each detail cell `sgs/container.gap={desktop:"14px"}` (row 53: 24 draft, 16 live, +8) | tree setting | verified |
| 130 | Hours show as a bold spaced row, draft a plain one-line row | hours `sgs/business-info.hoursCondensedInline=true` (`hoursLayout` already condensed) | tree setting | verified |
| 131 | Phone and email links go near-black on hover; draft goes brown | `sgs/business-info.textColourHover="accent-text"` (slug for #6F6152; prefer the slug to a raw hex) | tree setting | verified |
| 132 | Draft map has a frame, address strip and Directions link; live map is bare | Border: did not confirm business-info `borderWidth` reaches the map wrapper. Strip and link are part of the draft's sketch placeholder (its own caption says to swap it for a real map) | Bean decision | not yet verified |
| 133 | Form heading and subtext sit higher than the draft | form heading `sgs/heading.lineHeight={desktop:1.5}`, `lineHeightUnit=unitless` (30 x 1.5 = 45, +15) | tree setting | verified |
| 134 | Social cards are compact; draft cards share the row evenly | Card row `layout=grid`, `gridTemplateColumns={desktop:"1fr 1fr"}` is right. The 12.5px "label" is the draft's sketch caption, not the labels (both are 11.5px); drop that part. contact.tree.json | tree setting | verified (fix corrected) |
| 135 | Send button is full width on a phone; draft is auto width | `submitPadding` will not change it. Cause is `form/style.css` `@container sgs-form (max-width:400px) { .sgs-form__button {width:100%} }`. Framework: make that stretch switchable | framework new control | verified (fix corrected) |
| 136 | Phone intro wraps one word earlier | Cause: the draft intro has `text-wrap:pretty`. Set `sgs/text.textWrap="pretty"` on the intro (and other draft paragraphs that carry it). contact.tree.json | tree setting | verified (cause corrected) |
| 137 | On a phone the map block is a fixed narrow width | same fix as item 126 (`layout=stack`). Residual: iframe height is fixed at 400 in `business-info/render.php` (draft is a 4:3 box) | tree setting | verified |
| 138 | WhatsApp button grows and gets a shadow on hover; draft lifts 2px | Not a gap: `sgs/whatsapp-cta.sgsHoverLift=2`, `sgsHoverScalePreset=""`, `sgsHoverShadow=""`. contact.tree.json | tree setting | verified (fix corrected) |
| 139 | Phone and email links fade on hover; no way to stop it | framework: add a hover-fade control to business-info (hardcoded `.sgs-business-info__link:hover{opacity:.8}` in `business-info/style.css`) | framework new control | verified |
| 140 | Address joins with commas; draft stacks it on two lines | framework: stacked-lines option for `displayType=address` | framework new control | verified |
| 141 | Map has no address strip or Directions link | framework new control, but the draft's strip is sketch chrome; decide whether wanted | Bean decision | verified |
| 142 | Form fields are shorter, tighter and white-ground compared with draft | framework: field height, padding and ground controls on `sgs/form`. `.sgs-form-field__input` hardcodes padding 0.75rem 1rem and min-height 44px | framework new control | verified |
| 143 | Contact form boxes show no placeholder text ("Your name", "Email" ...); draft does | Framework repair: `form/style.css` makes placeholders transparent on floating-label fields, and with an empty label no label exists to float, so the field is blank and unlabelled. Show the placeholder when there is no visible label | framework repair | new: found in the check |
| 144 | Send message button sits at the right edge; draft keeps it on the left | Framework: `.sgs-form__actions` hardcodes `justify-content:flex-end`; add an alignment control | framework new control | new: found in the check |
| 145 | Contact form rows are misaligned and over-spaced: Phone is half width but the topic select drops lower; draft rows align on a tight 10px gap | Framework: form field row gap and alignment (partly C19) | framework new control | new: found in the check |

## About, Help and Contact

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 146 | On about, help and contact the content starts about 56px lower than the draft | The claimed 56px is wrong. Draft `pagePad` is 48px top / 90px bottom (tablet and desktop), 28px top / 60px bottom (mobile). Set the main/first section padding to those, per tier, in about.tree.json, help.tree.json, contact.tree.json | tree setting | new: found in the check |

## Checkout

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 147 | Page title is much bigger than the draft (63px against 48px) | Cause: the client snapshot sets the h1 to 63.36px, so the part's post-title inherits it. Fix: give the part's core/post-title a size from a token (e.g. a `page-title` size preset added to sites/eye-care-ward-end/theme-snapshot.json at 48px, `fontSize` slug on the post-title). Not a literal 48px in the part. Fits universal: yes, if via a token | tree setting (snapshot token plus one attribute in the shared part) | verified (cause corrected) |
| 148 | Draft sections fade up on load; live sections just appear | framework new control: a checkout entrance option. WC inner blocks cannot take sgsAnimation; add a token-driven (duration, distance) entrance rule in woocommerce.css for `.wc-block-components-checkout-step`. Fits universal: yes. Low priority, not visible in stills | framework new control | verified |
| 149 | Pay button says "Place Order"; draft says "PAY NOW" with the price at the right | checkout-actions-block placeOrderButtonLabel = "Pay now" confirmed. The "no price setting" claim is wrong: add className `is-style-with-price` to the same block (price follows priceSeparator). Right-aligning the price needs CSS in woocommerce.css from tokens. Label wording is client copy: keep it out of the shared part (per-client override), or use WC filter. Universal: the attribute yes; "Pay now" text per client | tree setting plus framework repair (CSS) | verified (fix corrected) |
| 150 | Draft has a "Secure payment, held under UK GDPR" note under the button; live has none | A core/paragraph is allowed inside checkout-fields-block (WC allows core/paragraph), so the mechanism is right, but the copy is client-specific and must not go in the shared theme part. Needs a per-client place for it | Bean decision (where client checkout copy lives) | verified (fix corrected) |
| 151 | Delivery shows "Free UK delivery / Collect in Birmingham" rows; draft shows "Post it to me / Royal Mail Tracked 48. Free over £75" and "I'll fit them in person" cards, placed above the address | Titles and descriptions are WooCommerce shipping-zone data (rename the method; description lives in the pickup location / rate settings), set by WP-CLI per client. Card look and the draft's order (delivery before address) is skin/order work, see item 154. Universal: yes (data, not code) | content | verified |
| 152 | Live shows a coupon box, an order note box and a terms line the draft lacks | Wrong control. Set on the outer block: woocommerce/checkout `showOrderNotes` = false and `showPolicyLinks` as Bean decides (terms line is legal; the terms block text is editable). Coupon: turn off WC "Enable coupons" (store setting) rather than deleting the block from the shared part. Fits universal: yes, because it is per-store settings | tree setting (attribute on woocommerce/checkout in the part; per-client store option for coupons) plus Bean decision on terms | verified (fix corrected) |
| 153 | Live has Country, "+ Add flat, suite", optional Phone, "same address for billing", and a "checking out as a guest" line; draft has only email, mobile, name, address, town, postcode | Attributes named were put on the wrong block. Set on woocommerce/checkout: showApartmentField = false; showPhoneField = true with requirePhoneField = true (draft's Mobile). Country hides only when WC sells to one country (store setting). Mobile label wording and "same address for billing" and the guest line: no attribute found in block.json or the compiled JS. Not verified: whether a WC field filter can relabel; treat as Bean decision | tree setting (checkout block attrs) plus content (WC country setting) | verified (cause corrected) |
| 154 | Checkout looks like default WooCommerce: sentence-case Playfair step headings, 808px column, plain summary box; draft has numbered small uppercase Outfit headings, 648px column, flat summary card | Cause partly wrong: "no theme stylesheet skins it" is false; woocommerce.css section 5 already styles the checkout (headings, button, inputs). Existing control: woocommerce/checkout `showFormStepNumbers` = true gives numbered steps. Remaining: extend woocommerce.css::section 5 from tokens (step-heading font, size, case, tracking, colour; summary card; total font) so every client gets branding by tokens. Column width comes from the template's `contentWidth` container in templates/checkout.html plus the alignwide checkout block, not only CSS. Fits universal: yes, if tokens, not Eye Care values | framework repair (woocommerce.css) plus tree setting (showFormStepNumbers) | verified (cause corrected) |
| 155 | Live checkout at 375 shows the order summary collapsed at the top as "Order summary £418.00" and again expanded at the bottom; draft has one summary below the form | WC's own mobile layout (two summaries). Fix in the shared skin: hide one per breakpoint, or Bean accepts WC behaviour | framework repair or Bean decision | new: found in the check |

## Confirmation

| # | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 156 | Draft: tick circle, "Thank you - order EC-10482", short email/WhatsApp message and "Back to the shop" button, centred; live: "Order received", full order details table and billing address | No setting on WC order-confirmation blocks (order-confirmation-status has only align and className). Build in the framework part parts/sgs-order-confirmation-content.html: an sgs/icon tick, a heading, and an sgs/button (attrs label, url exist in block.json) with link /shop. The thank-you wording is client copy so keep it per client; the structure (centred, tick, button) fits universal. The draft also omits the order table the live shows: Bean decision whether to keep order details | framework repair (part) plus content plus Bean decision | verified |
| 157 | On confirmation the Billing address box sits alone in the right half of the page with an empty left half | The sgs/container grid in parts/sgs-order-confirmation-content.html is two columns but the Shipping wrapper is empty (no shipping address), so billing lands in column 2. Make the grid collapse to one column when a wrapper is empty (framework repair) | framework repair | new: found in the check |

## Content and decisions not tied to one screen

| # | What | Type |
|---|---|---|
| 158 | Gallery photos for the photographed frames (one image each today, so no thumbnail strip); real colourway photos before launch | content |
| 159 | Real photos of the clinic (Home) and of Fatima (About) | content |
| 160 | WhatsApp links carry a pre-filled message the draft does not have: keep it (recommended) or match the draft | Bean decision |
| 161 | Mega Brands link to `/shop/?brands=<slug>`, the home brand strip to `/brand/<slug>/`: pick one destination (recommended: the filtered shop) | Bean decision |
| 162 | The contact form shows error messages on an empty submit; the draft has none: keep ours (recommended, as for the bag and checkout) | Bean decision |

**Total: 162 items.**

## Checked and dropped (not real)

Listed so a second list can be compared against this one: each was proposed, then found to paint the same as the draft.

- About: WhatsApp label turns near-black on hover; draft shows dark green
- Checkout: A text input is clipped on its left edge
- Footer: Google Business link missing
- Bag drawer: "Ask me anything" button not found
- Bag drawer: Drawer ground white vs cream
- Mega menus: Underline under the open menu word snaps instead of fading over a quarter second
- Mega menus: Mega panel fades open on live but the draft has none
- Mega menus: Card hover background has no fade (draft 0.25s)
- Phone drawer: Drawer arrives with a slight slide plus fade; draft is a plain fade
- Phone drawer: The "More" links box is 19px tall vs 23px
- Header: Phone number link is 5px narrower than the draft
- Header: Bag pill hover text stays dark where the draft turns it light
- Header: Help panel does not open in the scrolled state on live
- Home: Brand names rest at full strength; draft rests at 75%
- Home: Style-tile photo zooms slower in the draft on hover (1s against 0.3s)
- Shop: "Clear all" shows an underline; the draft shows a line under it
- Product page: Accordion answer has no 0.3s fade in live
- Product page: WhatsApp text has no link live
- Product page: "Which size am I?" is underlined live, plain in the draft
- Lens pop-up: "Skip the lenses" is underlined live, plain in the draft
