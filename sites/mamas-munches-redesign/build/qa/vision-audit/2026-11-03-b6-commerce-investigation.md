# B6 commerce investigation: Basket, Checkout, Account (draft vs local-mamas)

Read-only. Live = http://localhost:8084 with two lines in the basket (variation 275 of Zookies, and product 284); drafts served from `sites/mamas-munches-redesign/handoff` and read through the browser. Pairs (375/768/1440, full page, draft and live): `E:/sgs-tmp/b6/pairs/{cart,checkout,account}-{375,768,1440}-{draft,live}.png`. Totals differ from the draft because the basket contents differ (data, not styling). The test basket lived only in throwaway guest browser sessions (no stored cart), so nothing is left to empty. SignIn.dc.html is the destination of the account card's "Sign in" button and Confirmation.dc.html pairs with the `order-confirmation` template (219): both are outside this page set and were not measured.

## Where each page comes from (proven)

- Pages 101 and 102 use page templates `cart` and `checkout` (`_wp_page_template`), which resolve to the stored wp_template posts 222 and 223 (modified 2026-10-28), not the theme files `theme/sgs-theme/templates/cart.html` and `checkout.html` (those hold `sgs-cart-content` and `sgs-checkout-content` parts the mirror does not use). Page 103 has no page template and uses the `page` template (215: header, `sgs/container main` around `post-content`, footer). Pages 101 and 102 post_content is only the stock `woocommerce/cart` and `woocommerce/checkout` blocks; page 103's content is the cloned hero plus an `sgs/container` holding `sgs/account` (`cr-ref-my-account-5`).
- Template 222 (cart) = header part, `sgs/container main` (padding 40/32/20, contentWidth full, `cr-ref-template-cart-0`), `sgs/hero` with `sgs/text` "nearly there" and an `sgs/container` (cart-3, the 68px heading box) that holds only a static `sgs/text` "2" pill, then `post-content`, then the footer part. Template 223 (checkout) = header part, a 2-column grid main, `post-content` (with `sgsCustomCss` hiding it under 768px), a static `sgs/container` "Show order summary ▾" with `sgs/text` "£30.45", then the footer part. No `wp_template_part` posts exist on the mirror beyond the theme's.

## BASKET (/cart/, page 101, template 222)

| Element | Widths | Draft | Live | Proven cause (location) | Fix | Sev |
|---|---|---|---|---|---|---|
| H1 "Your basket" | all | 68/54/44px Young Serif at x=100 (1440), 44px at 375 | absent; script "nearly there" at x=13 and a full-width pill (border 2px, radius 999px) holding "2" | template 222 container `cr-ref-template-cart-3` has no heading text, only the pill child; the "2" is static text, not the live count | content edit: restore "Your basket" in cart-3 and make the count live (G6 if no live-count value exists for a text block) | high |
| Page width | 1440 | content 100 to 1340 (1240) | cart block spans x=13 to 1417 (hero 100 to 1340); items 13 to 1005, summary 1053 to 1413 | template 222 container-0 `contentWidth:full` with only 40px padding; `post-content` has no max-width wrapper (N6) | content edit: wrap `post-content` in a 1240px container | high |
| Free-delivery card | all | 720x79, border 2px, radius 22px, 16/700, pink bar | absent | no cart-page block; `sgs/cart` holds the logic (`src/blocks/cart/free-delivery.js`, threshold and bar attributes) but only inside its mini-cart panel | framework gap G2 | high |
| Line items | all | card per line, radius 22px, border 2px, thumb ~100px, name 22px serif, price 16/700, pill stepper, text "Remove" | table with PRODUCT/TOTAL headers; name 11px/500 rgb(168,64,79); square stepper, bin icon | stock `woocommerce/cart-line-items-block`; `theme/sgs-theme/assets/css/woocommerce.css` styles only totals, button, empty cart, inputs; `theme-snapshot.json` styles.blocks holds only core/* keys | gap G1 (FR-30-18, Spec 27 status "not built") | high |
| Summary card | all | `mm-pink-soft` #F9D5D3, border 2px, radius 28px, 8px shadow, "Summary" 26px serif, dashed rule, total 30px serif | "Cart totals" 11px label on a cream card, coupons accordion, gift-card code field, "Flat rate FREE", "Estimated total" 20px | stock `cart-order-summary` blocks; `woocommerce.css::.wp-block-woocommerce-cart-order-summary-block` | G1 | high |
| Summary position | 1440 | x=853 to 1333 (480) | x=1053 to 1413 (360) | the width fault above plus WooCommerce's stock sidebar width | content edit width fix, then G1 | high |
| Checkout button | all | yellow pill 400x56, 17/700 dark text, shadow | "Proceed to Checkout" 360x52, radius 20px, cream text on yellow | see Contrast finding | theme CSS fix, then G1 for pill shape and shadow | high |
| Gift flag and note | all | dashed panel 720x84 | absent | no block, no Store API extension | G3 | medium |
| Express pay, "Baked fresh..." line, "Keep shopping" | all | Apple/Google pills, 14px line, underlined link | absent | no gateway express block; no markup inside the cart block | line and link belong to G1; express once gateways exist | low |
| Mobile | 375, 768 | summary stacks under items; button 335 to 400 wide | summary stacks, all stock 11px text | as above | as above | high |

## CHECKOUT (/checkout/, page 102, template 223)

| Element | Widths | Draft | Live | Proven cause | Fix | Sev |
|---|---|---|---|---|---|---|
| Whole form | 375 | form cards from y=458 | form absent: only the "Show order summary £30.45" bar, then the Instagram strip and footer (pair `checkout-375-live.png`) | template 223 `post-content` carries `sgsCustomCss: "@media (max-width: 767px) { & { display: none; } }"` (id `wgate1`, note "Width gate a width variant is shown at 375px"), hiding the checkout at 0 to 767px; the cloner read the draft's duplicated mobile summary as a width variant | content edit: delete that custom CSS (checkout unusable on phones until then) | critical |
| Hardcoded summary bar | all | collapsed bar at 375 only | static "Show order summary ▾ / £30.45" shown at every width (at 1440 it floats at x=816 to 1320) | template 223 static `sgs/container` + `sgs/text` (draft copy, not live) | content edit: delete; WooCommerce's own collapsible summary already serves mobile | high |
| Page chrome | all | pink band minimal header "← Basket", centred logo, "Secure checkout"; no footer, strip, marquee or CTA | full site header, top bar, Instagram strip, marquee, CTA band, footer | template 223 uses `template-part header` and `footer`; the Instagram strip, marquee and CTA come from those parts; no checkout header part exists in the theme or DB | content edit: build a checkout header part from `sgs/container`, `sgs/text`, `sgs/responsive-logo`; drop the footer part. No framework gap | high |
| Title | all | script "last bit, promise" 28px; H1 "Checkout" 56/48/40px at x=140 | none | template 223 has no heading | content edit: `sgs/text` + `sgs/heading` h1 above `post-content` | high |
| Columns | 1440 | form 140 to 783 (643), order card 849 to 1274 on the right | one column; summary below the form | the template grid puts `post-content` in column 1, but the totals live inside the checkout block, so there is no second column to fill | content edit: drop the grid and let the block use its own two-column layout, then style via G1 | high |
| Numbered section cards | all | 4 cards, 2px border, radius 26px, #FFFAF0, legend 24px serif | h2s "Contact information", "Shipping address", "Shipping options", "Payment options", no card | stock `checkout-*` blocks; no card styling anywhere | titles: content edit; card chrome: G1 | high |
| Inputs | all | 587x52, border 2px #3A2A22, radius 14px, label above 15/700 | 689 wide, 50 tall, 1px border, radius 4px, floating label 16px | `woocommerce.css::.wc-block-components-text-input input` fixed values, no setting | G1 | high |
| Recipient toggle | all | two 289x76 tiles, 4px shadow | absent | no block | G4 | medium |
| "Find address" | all | 122x54 yellow button beside Postcode | absent | no provider, no block | G5 | medium |
| Delivery option cards | all | radius 18px cards, chosen yellow-soft with 4px shadow | one row "Flat rate FREE", 2px black border | stock radio-control; one flat-rate zone (data) | zone: data; card look: G1 | medium |
| Create-account and allergen dashed panels | all | 2px dashed panels | absent | none | G1 | medium |
| Order summary card | all | pink card at right, thumbnails with qty badges, 30px total | stock summary inside the form column, 11px items | stock `checkout-totals` | G1 | high |
| Pay button | all | "Pay £30.45" yellow pill 643x66, 19/700 dark, shadow | "Place Order" 689x50, radius 20px, cream on yellow | see Contrast finding | theme CSS fix | high |
| Terms line | all | 14px centred, "terms" link | 11px stock text | stock terms block | G1 | low |

## ACCOUNT (/my-account/, page 103, signed out)

| Element | Widths | Draft | Live | Proven cause | Fix | Sev |
|---|---|---|---|---|---|---|
| Hero offset and height | 1440 | title x=100, y=209, 368x96; hero 217 tall | title x=70, y=161, box 1301x68; hero 127 tall | `sgs/hero` `cr-ref-my-account-1` has `contentWidth 1320.52px` and no stored padding (gap 12px only) | content edit: hero padding 64px top and bottom, content width 1240 | medium |
| Title level | all | span, 68/54/44px | h2; the page also has h2 "Login" | `cr-ref-my-account-3` (`sgs/heading`) has no level set | content edit: level h1 | low |
| Signed-out card | all | pink card 640x207 at x=100, border 2px, radius 32px, 8px shadow, "Sign in to see your orders" 40/36/30px, copy, "Sign in →" yellow pill, "Create an account" cream pill | stock WooCommerce login: h2 "Login" 58px, cream card 480x347 centred, 1px border, radius 10px, fields, pink "Log in", "Lost your password?" | `plugins/sgs-blocks/src/blocks/account/render.php` prints the WooCommerce login template when signed out; `authLayout` only switches side-by-side or stacked login and register; no attribute for a prompt card. `woocommerce_enable_myaccount_registration` is `no`, so no register card prints | gap G7 | high |
| Fields | all | none (draft sends the visitor to SignIn) | `.sgs-account form input.input-text` fixed 1px/6px | `account/style.css`; FR-30-18 "not built" | G1 | medium |

## Contrast finding (cream on yellow, 1.34:1)

Both buttons compute colour rgb(251, 243, 220) (`#FBF3DC`, the `surface` token) on rgb(249, 207, 110) (`#F9CF6E`, the `primary` token), 1.34:1.

Proven writer, from the CSSOM at 1440 on /cart/ and /checkout/: `theme/sgs-theme/assets/css/woocommerce.css`, the rule `.wp-block-woocommerce-proceed-to-checkout-block .wc-block-components-button, ... .wp-element-button` (under the comment "Proceed to checkout button — primary brand") sets `background-color: var(--wp--preset--color--primary); color: var(--wp--preset--color--surface, #fff); border-color: var(--wp--preset--color--primary); border-radius: var(--wp--custom--border-radius--medium, 8px)`. The place-order rule (`.wc-block-components-checkout-place-order-button.wc-block-components-button, .wp-block-woocommerce-checkout-actions-block ...`) sets the same pair. Both beat the global-styles rule `:root :where(.wp-element-button)` (colour `text`, background `accent`) because `:where` has zero specificity. The theme pairs `primary` with `surface`, which only works for a client whose primary is dark; Mama's primary is yellow. The 20px radius is the same rule reading `--wp--custom--border-radius--medium`.

Fix: in `woocommerce.css` change the colour in both rules to `var(--wp--preset--color--primary-text)` (this site `#3A2A22`, about 10:1 on the yellow). The hover state uses `primary-dark`, which on this site is `#FFFAF0`, so hover text must change to a token that contrasts with it (use `text`). This is a theme file, so it needs `build-deploy.py --theme-only`; the snapshot cannot fix it because the colour is written by the theme stylesheet, not by a token. Grep `woocommerce.css` for other `primary` backgrounds paired with `surface` text in the same change.

## Ranked fix list

### Content edits (mirror template and page posts; reach mamas-test through the clone push)
1. Template 223: delete the `sgsCustomCss` that hides `post-content` under 768px (checkout missing on phones).
2. Template 223: delete the static "Show order summary / £30.45" container.
3. Template 223: drop the grid so the block uses its own two columns; add script line and h1 "Checkout"; build a minimal checkout header part ("← Basket", logo, "Secure checkout") and remove the footer part.
4. Template 222: restore "Your basket" heading text in cart-3; wrap `post-content` in a 1240px container; make the count live (or G6).
5. Page 103 hero: padding 64px, content width 1240, heading level h1.
6. Checkout block titles "1 · Your details", "2 · Who's it for?", "3 · Delivery", "4 · Payment" as block titles.

### Theme snapshot and theme CSS
7. Contrast: `woocommerce.css` button text to `primary-text` in both rules (theme deploy; high).
8. Pill radius and 4px shadow: `theme-snapshot.json` styles.elements.button currently has radius 8px and padding 16/36, while the WooCommerce rules read `--wp--custom--border-radius--medium` (20px), so the two disagree; set the token to 999px and add the shadow, pushed with `push-theme-snapshot.py`.
9. The snapshot palette already holds the draft colours (`mm-cocoa`, `mm-pink-soft`, `mm-paper`, `mm-yellow`); cards need a consumer (G1), not new colours.

### Framework gaps (each checked against `ls plugins/sgs-blocks/src/blocks`, block.json descriptions and Spec 27 Status lines)
- G1 (FR-30-18, Spec 27 status "not built"): an SGS host for the WooCommerce Cart and Checkout blocks carrying card, border, radius, shadow, input, step-title and totals-card settings, painting the `.wc-block-*` line items, summary card, inputs, radio cards. Biggest lever: covers about 20 table rows.
- G2: cart-page free-delivery progress block, reusing `sgs/cart`'s `free-delivery.js` and threshold attributes.
- G3: cart "This is a gift" flag and note (Store API extension data into order meta).
- G4: checkout recipient toggle, via the WooCommerce additional checkout fields API.
- G5: postcode lookup "Find address" (needs a lookup provider decision first).
- G6: a live basket count usable in a text block (only if none exists; none found in `sgs/text`).
- G7: `sgs/account` signed-out prompt card (heading, copy, two button links, card chrome).
- Later: express pay buttons (no gateway installed).

## Top 10 fixes

1. Remove the 767px hide on template 223's `post-content` (checkout unusable on phones).
2. Contrast: `woocommerce.css` button text to `primary-text` for both buttons.
3. Remove the static summary bar from template 223.
4. Checkout chrome: minimal header part, no footer or extra sections.
5. Cart width (1240 container) and checkout two-column layout.
6. Restore the "Your basket" H1 and live count on template 222; add the checkout H1 and kicker.
7. G1: Cart/Checkout styling host (cards, inputs, summary, line items).
8. G7: signed-out account card.
9. G2: basket free-delivery progress block.
10. Account hero padding and h1; then G3 and G4.
