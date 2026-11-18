# Mama's Custom CSS by the missing setting it stands in for

All 542 rules (69,289 characters of rule text; 72,791 characters including comments and whitespace between rules) are placed in exactly one of six classes and 90 groups. Source data: `classified.json` and `custom-css.json` in this folder; scripts `classify.py`, `groups.py`, `make-reports.py`.

## How the rules were classified

- **470 rules by family** (a selector or property pattern, or the record's whole purpose as the post's own `sgsCustomCssNote` states it, applied to every matching rule; `classify.py::WC_SHARED`, `RECORD_DEFAULT`, the account index map `ACCT`).
- **72 rules by reading** (an explicit per-rule decision after reading it: an override of a family default, or a rule in a record with mixed purposes; `classify.py::RULE_OVERRIDES` and the account index overrides).
- **0 rules unplaced.** I read every rule (all 542, in the 74 attributes) before writing the families, so "by family" means one rule applied the same way to every copy, not an unread rule.
- **Class A claims were re-checked against `sgs-framework.db` on every run** (`classify.py::A_CHECKS`: the block, `css_element` and `css_property`, or the attribute name, must exist; the media tilt checks `motion_fields` for `HoverStateValues.restRotate` and `motion_targets` for `sgs/media`). All 11 A groups passed. Two A groups carry a "verify" caution because the post's own note says the opposite (the product card button shadow, the container sticky pin).
- **Classes B, C, D, F are my reading of the evidence**: the post notes, the findings files, and for D the named `file::selector` was opened and read (`plugins/sgs-blocks/src/blocks/hero/style.css`, `option-picker/style.css`, `gift-order/style.css`, `business-info/style.css`, `plugins/sgs-blocks/assets/css/gift-card.css`, `theme/sgs-theme/assets/css/woocommerce.css`). The boundary between B and C follows the user's rule: B when the thing styled is a WooCommerce or core block (or markup SGS only wraps), C when it is an SGS block or SGS plugin markup.
- **Shares use characters of rule text** (69,289). A rule's characters are its selector plus braces plus declarations; the 1,636 characters of comments and the whitespace between rules are outside every share.

## The six classes

| Class | Groups | Rules | Distinct rule texts | Characters | Share of characters |
|---|---|---|---|---|---|
| A. A setting exists today (route or hand-work miss) | 11 | 58 | 26 | 6,890 | 9.9% |
| B. A WooCommerce or core block that SGS wraps lacks the setting | 29 | 130 | 92 | 19,600 | 28.3% |
| C. An SGS block lacks the setting | 31 | 315 | 236 | 38,239 | 55.2% |
| D. The rule fights a default the theme or a block stylesheet hard-codes | 7 | 14 | 10 | 1,169 | 1.7% |
| E. A real one-off look for this client (stays Custom CSS) | 4 | 14 | 14 | 2,468 | 3.6% |
| F. A workaround for a block bug | 8 | 11 | 9 | 923 | 1.3% |
| **Total** | 90 | 542 | 387 | 69,289 | 100.0% |

## Ranked: the settings and template defaults that would remove the most Custom CSS

Classes B, C, D and F, ranked by characters removed. Class A rows are listed after this table because they need no framework work, only the existing setting. Class E stays. Cumulative percentage is of ALL rule characters (69,289); the classes B to F together are 59,931 characters (86.5%).

| Rank | Group (class) | What would remove it | Rules | Chars | Cumulative | Another client needs it? |
|---|---|---|---|---|---|---|
| 1 | `C.account-order-detail` sgs/account order page layout (step tracker cards, items card, text boxes, two-column grid) (C) | a new setting | 63 | 8,575 | 12.4% | Yes |
| 2 | `C.testimonial-slider-look` sgs/testimonial-slider arrows, dots, card layout and heading font (C) | a new setting | 59 | 6,732 | 22.1% | Yes: every review carousel |
| 3 | `C.container-scroll-nav` sgs/container sideways row arrows, dots and hidden scrollbar look (C) | a new setting | 42 | 5,389 | 29.9% | Yes: any carousel of cards |
| 4 | `C.gift-card-form` SGS gift-card purchase form look (amount tiles, fields, button) (C) | a new setting | 18 | 2,900 | 34.1% | Yes: any shop selling gift cards |
| 5 | `B.core-search-look` Core search field: fill, shadow, inner padding, focus ring, button (B) | a new setting | 21 | 2,037 | 37.0% | Yes: every site with a search page |
| 6 | `C.account-orders-row` sgs/account order row as a card (border, radius, layout, thumbnails, count, hover lift) (C) | a new setting | 18 | 1,838 | 39.6% | Yes |
| 7 | `B.coupon-apply` Coupon Apply button fill, border, radius and type (B) | a new setting | 6 | 1,768 | 42.2% | Yes |
| 8 | `B.wc-confirm-email-form` Order confirmation confirm-your-email form: field, label, button, spacing (B) | a new setting | 7 | 1,682 | 44.6% | Yes |
| 9 | `C.account-order-buttons` sgs/account order buttons (View order, Order again) and help link (C) | a new setting | 7 | 1,567 | 46.9% | Yes |
| 10 | `B.notice-banner-look` Notice banner fill, border, radius, layout and link style (outside the cart and checkout blocks) (B) | a new setting | 8 | 1,557 | 49.1% | Yes: every shop shows these notices |
| 11 | `B.wc-order-blocks-cards` Order confirmation WooCommerce blocks drawn as cards (B) | a new setting | 7 | 1,490 | 51.3% | Yes |
| 12 | `C.cart-drawer` sgs/cart (basket drawer) remove link, stepper, free-delivery text, empty-state centring, gift box, close button (C) | a new setting | 13 | 1,320 | 53.2% | Yes: every shop drawer |
| 13 | `C.product-card-badge` sgs/product-card picture badge (fill, radius, padding, outline) (C) | a new setting | 10 | 1,310 | 55.1% | Yes |
| 14 | `B.checkout-express-card` Checkout wallet (express payment) row as a bordered card (B) | a new setting | 7 | 1,204 | 56.8% | Yes |
| 15 | `B.core-read-more` Core Read more link: arrow icon, focus ring, wrap (B) | a new setting | 5 | 1,009 | 58.3% | Yes |
| 16 | `B.product-grid-columns` Product list columns and gap per device (WooCommerce product template) (B) | a new setting | 12 | 978 | 59.7% | Yes: every shop |
| 17 | `C.account-menu-look` sgs/account menu: item border, fill, shadow, logout link, count badge shape (C) | a new setting | 4 | 976 | 61.1% | Yes: any account area |
| 18 | `C.account-edit-card` sgs/account Account details cards (radius, padding per device, password section grid, tick row) (C) | a new setting | 11 | 941 | 62.5% | Yes |
| 19 | `B.field-focus` Field focus border and ring colour on WooCommerce text inputs (B) | a new setting | 3 | 910 | 63.8% | Yes: contrast fixes are per brand |
| 20 | `C.account-form-buttons` sgs/account form buttons (Save changes, Update password, Save address, Reset) (C) | a new setting | 4 | 906 | 65.1% | Yes |
| 21 | `B.checkout-country-line` Checkout country shown as plain text when only one country is sold to (B) | a new setting | 4 | 771 | 66.2% | Yes: any single-country shop |
| 22 | `C.accordion-labels` sgs/accordion count line, category label and search placeholder type (C) | a new setting | 7 | 769 | 67.3% | Yes: any FAQ with a filter |
| 23 | `B.wc-order-status` Order confirmation status block: margins, headings and link colour (B) | a new setting | 4 | 719 | 68.3% | Yes |
| 24 | `B.coupon-row` Coupon and gift-card apply row layout (input beside button) (B) | a new setting | 4 | 632 | 69.2% | Yes: any shop with coupons |
| 25 | `C.order-items` sgs/order-items row padding, totals rule and total value font (C) | a new setting | 5 | 628 | 70.2% | Yes |
| 26 | `D.opacity` Plugin text opacity .72 and .85 (washed grey text) (D) | a blanked default | 5 | 597 | 71.0% | Yes: grey text fails contrast on any brand |
| 27 | `C.container-card-link` sgs/container whole-card link to a dynamic URL (C) | a new setting | 6 | 570 | 71.8% | Yes: any card linking to a per-record URL |
| 28 | `B.checkout-merged-card` Checkout steps joined into one card (Delivery, shipping option, order note) (B) | a new setting | 4 | 544 | 72.6% | Yes: a common checkout layout |
| 29 | `C.buybox-pick-preview` sgs/buybox pick picture panel, box size and caption (C) | a new setting | 4 | 536 | 73.4% | Plausible: any product configurator with a preview |
| 30 | `B.product-filter-chip-hover` Product filter chips hover lift (B) | a new setting | 4 | 500 | 74.1% | Yes: any filtered shop |
| 31 | `B.summary-divider` Summary totals divider colour and width (B) | a new setting | 2 | 438 | 74.7% | Yes |
| 32 | `B.summary-shipping-line` Summary shipping-method line type (B) | a new setting | 2 | 416 | 75.3% | Yes |
| 33 | `C.account-address-card` sgs/account address card layout (Edit beside the title, bold first line) (C) | a new setting | 5 | 416 | 76.0% | Yes |
| 34 | `C.buybox-pick-layout` sgs/buybox pick layout row and column placement (C) | a new setting | 6 | 388 | 76.5% | Plausible |
| 35 | `B.wrapper-spacing` WooCommerce wrapper outer margin and padding (cart, empty cart, product collection, checkout fill) (B) | a new setting | 5 | 383 | 77.1% | Yes: the gap above the footer must match the other pages on every site |
| 36 | `B.core-query-title` Core search and term title: per-device alignment and long-word wrap (B) | a new setting | 6 | 383 | 77.6% | Yes |
| 37 | `C.container-blocklink-underline` sgs/container underline sweep for text inside a block link (C) | a new setting | 3 | 365 | 78.1% | Yes |
| 38 | `D.woocommerce-clip` WooCommerce wrapper overflow clip crops card shadows (D) | a blanked default | 4 | 334 | 78.6% | Yes: every hard-shadow card design is cut off |
| 39 | `C.icon-current-page` sgs/icon current-page state (C) | a new setting | 2 | 316 | 79.1% | Yes: account and cart icons in any header |
| 40 | `B.cart-item-columns` Cart line-item grid columns per device (picture, text, price) (B) | a new setting | 2 | 314 | 79.5% | Yes: every shop client restyles the basket card on phone |
| 41 | `B.cart-qty-type` Cart quantity stepper number and button type and colour (B) | a new setting | 2 | 290 | 80.0% | Yes: any shop with a styled basket |
| 42 | `C.buybox-hide-parts` sgs/buybox: hide the per-unit line, the pick Undo row and the colour square (C) | a new setting | 6 | 282 | 80.4% | Yes |
| 43 | `B.cart-layout-breakpoint` Cart and checkout two-column breakpoint (B) | a new setting | 2 | 257 | 80.7% | Yes: the breakpoint is a design choice on every site |
| 44 | `B.checkout-qty-badge` Checkout summary item quantity badge size, type and position (B) | a new setting | 2 | 244 | 81.1% | Yes |
| 45 | `C.button-no-hover-fill` sgs/button: a "no hover fill" option that keeps the underline sweep (C) | a new setting | 4 | 236 | 81.4% | Yes: text-link buttons |
| 46 | `B.summary-description` Summary row description line size and colour (B) | a new setting | 2 | 224 | 81.7% | Yes |
| 47 | `F.select-arrow` Select arrow off-centre after the field settings (F) | a new setting | 2 | 224 | 82.1% | Yes |
| 48 | `C.decorative-image-hover-z` sgs/decorative-image raise on hover (z-index) (C) | a new setting | 4 | 220 | 82.4% | Yes: overlapping cards |
| 49 | `C.gift-order-tile-type` sgs/gift-order tile line type (C) | a new setting | 2 | 197 | 82.7% | Plausible: gift choice tiles |
| 50 | `B.summary-heading-box` Cart summary heading margin, padding and alignment (B) | a new setting | 2 | 190 | 82.9% | Yes |
| 51 | `B.wc-forms-in-account` WooCommerce forms inside the account block (lost password rows) (B) | a new setting | 1 | 179 | 83.2% | Yes |
| 52 | `F.cart-narrow-items` Cart line-item padding and border lose to WooCommerce narrow-basket rules (F) | a new setting | 1 | 175 | 83.5% | Yes |
| 53 | `C.buybox-pick-badge-size` sgs/buybox pick tile badge size (C) | a new setting | 2 | 174 | 83.7% | Yes, small |
| 54 | `B.checkout-misc-type` Checkout guest line and validation error text size (B) | a new setting | 2 | 161 | 83.9% | Yes |
| 55 | `B.place-order` Place-order button label separator and gap (B) | a new setting | 2 | 157 | 84.2% | Yes |
| 56 | `C.business-info-wrap` sgs/business-info long email wrap (C) | a new setting | 2 | 152 | 84.4% | Plausible |
| 57 | `F.empty-totals` Empty WooCommerce totals wrappers keep the padding a setting prints (F) | a new setting | 2 | 150 | 84.6% | Yes |
| 58 | `C.buybox-thumb-selected` sgs/buybox selected thumbnail lift and shadow (C) | a new setting | 1 | 148 | 84.8% | Yes |
| 59 | `C.container-hide-when-empty` sgs/container hide when its content has no form, link or heading (C) | a new setting | 2 | 130 | 85.0% | Yes |
| 60 | `F.shipping-gap` Delivery option gap does nothing because WooCommerce makes the box display:block (F) | a new setting | 1 | 116 | 85.2% | Yes |
| 61 | `B.catalog-sorting` Shop sort dropdown height, padding and shadow (B) | a new setting | 1 | 85 | 85.3% | Yes |
| 62 | `F.gift-legend` Gift-order title is a legend on a fieldset border (F) | a new setting | 1 | 81 | 85.4% | Yes |
| 63 | `B.checkout-summary-thumb` Checkout summary thumbnail fit (B) | a new setting | 1 | 78 | 85.5% | Yes: product photos of any ratio |
| 64 | `F.cart-drawer-header-shrink` Basket drawer header shrinks in the empty state (F) | a new setting | 1 | 76 | 85.6% | Yes |
| 65 | `C.decorative-image-shape` sgs/decorative-image notched label shape (C) | a new setting | 1 | 74 | 85.7% | Plausible: price tags, ribbons |
| 66 | `C.buybox-spacing` sgs/buybox spacing between stacked parts and in the pick layout (C) | a new setting | 2 | 70 | 85.8% | Yes |
| 67 | `C.account-misc` sgs/account small spacing (marketing tick margins) (C) | a new setting | 1 | 64 | 85.9% | Yes, small |
| 68 | `D.gift-order-margin` Gift-order tiles bottom margin (D) | a blanked default | 1 | 60 | 86.0% | Yes |
| 69 | `D.business-info-underline` Footer credit link underline thickness (D) | a blanked default | 1 | 58 | 86.1% | Low |
| 70 | `F.media-height-loses` sgs/media saved height loses to .woocommerce img { height: auto } (F) | a new setting | 2 | 54 | 86.2% | Yes: any media block on a WooCommerce page |
| 71 | `D.gift-order-outline` Gift-order selected tile second outline (D) | a blanked default | 1 | 52 | 86.3% | Yes: draws a second border on any site |
| 72 | `C.heading-fluid` sgs/heading sub-375px fluid size (C) | a new setting | 1 | 50 | 86.3% | Low |
| 73 | `F.account-clear-divs` sgs/account prints WooCommerce .clear spacer divs that take grid rows (F) | a new setting | 1 | 47 | 86.4% | Yes |
| 74 | `D.hero-wide-cap` Standard hero caps its content at the wide size (D) | a blanked default | 1 | 41 | 86.5% | Yes: full-bleed rule lines |
| 75 | `D.hero-overflow` Hero clips overflow at its own edge (D) | a blanked default | 1 | 27 | 86.5% | Yes: any shadow that leaves the hero box |

### Class A: the setting exists, use it (route or hand-work misses)

| Group | Rules | Chars | Setting |
|---|---|---|---|
| `A.product-card-cta-shadow` Product card button hard shadow | 20 | 2,100 | Probably None: sgs/product-card showCtaShadow turns the button shadow on (the site token supplies 4px and 7px). The note in the post says no setting exists; verify showCtaShadow renders the site shadow before calling this a miss |
| `A.wc-coupon-field` Coupon toggle, label and text input look | 6 | 2,020 | None. sgsCouponLabel* (the panel toggle), sgsFieldLabel* and sgsField* (border, radius, fill, colour, font, min height, padding) already style the coupon label and input; the shared Custom CSS block repeats them |
| `A.wc-summary` Cart and checkout summary card: spacing, padding, background and radius | 13 | 1,347 | None. Use woocommerce/cart and woocommerce/checkout: sgsSummaryBackground, sgsSummaryBorderRadius, sgsSummaryPadding, sgsSummaryInnerPadding, sgsSummaryRowsPadding, sgsSummaryTitleTextMargin, sgsSummaryTitleBoxMargin, sgsSummaryTitleFlexMargin, sgsTotalsWrapperPadding, sgsTotalsItemPadding, sgsCouponPadding |
| `A.account-address-text` Account address card text and Edit link type | 3 | 294 | None. sgs/account addressTextFontSize, addressTextLineHeight, addressEditLinkFontSize, addressEditLinkFontWeight, addressEditLinkTextDecoration, addressTitleMargin |
| `A.cart-drawer-empty` Basket drawer empty state text and link | 2 | 234 | None. sgs/cart emptyMessageFontSize, emptyMessageColour, emptyCtaFontWeight, emptyCtaPadding |
| `A.wc-checkbox-label` Checkout tick-box label size and weight | 1 | 201 | None. sgsCheckboxLabelFontSize and sgsCheckboxLabelFontWeight |
| `A.buybox-add-to-cart` Buy box add-to-basket button size and shadow | 1 | 162 | None. sgs/buybox addToCartMinHeight, addToCartPadding, addToCartFontSize, addToCartShadow, addToCartShadowColour |
| `A.container-position-pin` Container position and sticky pin | 5 | 143 | None. sgs/container wrapper position (css_element wrapper, css_property position) and pinBelowHeader + pinGap (sticks below the sticky header). The gallery rule needs pinGap to equal 108px minus the header height; verify on the canary before relying on it |
| `A.account-fields-bg-gap` Account details: white fields and form gap | 2 | 140 | None. sgs/account fieldInput background (css_element fieldInput background-color) and accountForm gap (css_element accountForm gap) |
| `A.media-rest-rotate` Media tilt (rest rotation) | 4 | 136 | None. sgs Motion hover panel field restRotate (motion_fields.HoverStateValues.restRotate; motion_targets has 3 rows for sgs/media); the account hero label already uses it (r2h-account Account 15) |
| `A.account-menu-indicator` Account menu: remove the active-item arrow | 1 | 113 | None. sgs/account menuActiveIndicatorStyle |

### Class E: stays Custom CSS

| Group | Rules | Chars |
|---|---|---|
| `E.gift-note-decoration` Gift note tape strip, tilt and handwriting | 7 | 1,052 |
| `E.twinkle` Home star twinkle loop (Loop A-02) | 3 | 716 |
| `E.cookie-preview` Zookie preview: round tinted cookie box, gradient and bump | 3 | 657 |
| `E.pill-centre` Form topic pill vertical centring (owner one-off) | 1 | 43 |

## A. A setting exists today (route or hand-work miss)

11 groups, 58 rules, 6,890 characters (9.9%).

### `A.product-card-cta-shadow` Product card button hard shadow

- Rules: 20 (2 distinct texts). Characters: 2,100 (3.0% of all).
- Pages: archive-product (194), gifts (150), product-search-results (217), single-product (202), single-product-baby-shower-gift-card (346), taxonomy-product_attribute (218).
- Setting that exists: Probably None: sgs/product-card showCtaShadow turns the button shadow on (the site token supplies 4px and 7px). The note in the post says no setting exists; verify showCtaShadow renders the site shadow before calling this a miss
- Evidence: DB: sgs/product-card attribute showCtaShadow ("Show the button's shadow (at rest and on hover)")
- Another client: n/a.
- Methods: 20 by reading.

  Example (post 150, rule 2):
  ```css
  &selector .sgs-product-card__cta--primary:hover,&selector .sgs-product-card__cta--primary:focus-visible{box-shadow:7px 7px 0 0 #3A2A22;}
  ```

  Example (post 150, rule 1):
  ```css
  &selector .sgs-product-card__cta--primary{box-shadow:4px 4px 0 0 #3A2A22;}
  ```

### `A.wc-coupon-field` Coupon toggle, label and text input look

- Rules: 6 (3 distinct texts). Characters: 2,020 (2.9% of all).
- Pages: cart (101), checkout (102).
- Setting that exists: None. sgsCouponLabel* (the panel toggle), sgsFieldLabel* and sgsField* (border, radius, fill, colour, font, min height, padding) already style the coupon label and input; the shared Custom CSS block repeats them
- Evidence: DB: woocommerce/cart css_element coupon-label (selectors.json::rows.coupon_label = .wc-block-components-panel__button), field-label, field-input (selectors.json::rows.field_text includes the cart)
- Another client: n/a.
- Methods: 6 by family.

  Example (post 101, rule 21):
  ```css
  &selector .wc-block-components-totals-coupon .wc-block-components-text-input.wc-block-components-totals-coupon__input input[type]{box-sizing:border-box;width:100%;height:48px;min-height:48px;margin:0;padding:0 14px;font-family:var(--wp--preset--font-family--body);font-size:16px;font-weight:400;line-height:1.2;color:var(--wp--preset--color--mm-cocoa);background:var(--wp--preset--color--mm-paper);border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:14px;box-shadow:none}
  ```

  Example (post 101, rule 17):
  ```css
  &selector .wc-block-components-panel__button{font-family:var(--wp--preset--font-family--body);font-size:16px;font-weight:700;line-height:1.4;color:var(--wp--preset--color--mm-cocoa);min-height:44px;padding:10px 0;margin:0;background:transparent;text-transform:none;letter-spacing:0}
  ```

### `A.wc-summary` Cart and checkout summary card: spacing, padding, background and radius

- Rules: 13 (7 distinct texts). Characters: 1,347 (1.9% of all).
- Pages: cart (101), checkout (102).
- Setting that exists: None. Use woocommerce/cart and woocommerce/checkout: sgsSummaryBackground, sgsSummaryBorderRadius, sgsSummaryPadding, sgsSummaryInnerPadding, sgsSummaryRowsPadding, sgsSummaryTitleTextMargin, sgsSummaryTitleBoxMargin, sgsSummaryTitleFlexMargin, sgsTotalsWrapperPadding, sgsTotalsItemPadding, sgsCouponPadding
- Evidence: DB: woocommerce/cart and woocommerce/checkout block_attributes, css_element summary, summary-inner, summary-rows, summary-title-text, summary-title-box, summary-title-flex, totals-wrapper, totals-item, coupon-panel
- Another client: n/a (already a setting; every shop client benefits).
- Methods: 13 by family.

  Example (post 101, rule 28):
  ```css
  &selector .wc-block-components-checkout-order-summary__content,&selector .wc-block-components-checkout-order-summary__content-container{padding-left:0;padding-right:0}
  ```

  Example (post 101, rule 3):
  ```css
  &selector .wc-block-cart__sidebar .wp-block-woocommerce-cart-order-summary-block{background:transparent;border-radius:0;padding:0;margin-bottom:0;border-bottom:0;}
  ```

### `A.account-address-text` Account address card text and Edit link type

- Rules: 3 (3 distinct texts). Characters: 294 (0.4% of all).
- Pages: my-account (103).
- Setting that exists: None. sgs/account addressTextFontSize, addressTextLineHeight, addressEditLinkFontSize, addressEditLinkFontWeight, addressEditLinkTextDecoration, addressTitleMargin
- Evidence: DB: sgs/account attributes addressText*, addressEditLink*, addressTitle (css_element addressTitle margin)
- Another client: n/a.
- Methods: 3 by reading.

  Example (post 103, rule 20):
  ```css
  .sgs-account__addr > header > a.sgs-account__addr-edit{flex:none;margin:0;padding:4px 0;font-size:15px;font-weight:700;text-decoration:underline;color:var(--wp--preset--color--mm-cocoa);}
  ```

  Example (post 103, rule 17):
  ```css
  .sgs-account__addr-read{order:1;font-size:15px;line-height:1.5;}
  ```

### `A.cart-drawer-empty` Basket drawer empty state text and link

- Rules: 2 (2 distinct texts). Characters: 234 (0.3% of all).
- Pages: header (178).
- Setting that exists: None. sgs/cart emptyMessageFontSize, emptyMessageColour, emptyCtaFontWeight, emptyCtaPadding
- Evidence: DB: sgs/cart css_element panel-empty-message, emptyMessage, panel-empty-cta, emptyCta
- Another client: n/a.
- Methods: 2 by reading.

  Example (post 178, rule 4):
  ```css
  &selector .sgs-cart__panel-empty-body { max-width: 300px; margin-inline: auto; font-size: 16px; line-height: 1.5; color: var(--wp--preset--color--mm-muted-2); }
  ```

  Example (post 178, rule 5):
  ```css
  &selector .sgs-cart__panel-empty-link { font-weight: 700; padding: 10px; }
  ```

### `A.wc-checkbox-label` Checkout tick-box label size and weight

- Rules: 1 (1 distinct texts). Characters: 201 (0.3% of all).
- Pages: checkout (102).
- Setting that exists: None. sgsCheckboxLabelFontSize and sgsCheckboxLabelFontWeight
- Evidence: DB: woocommerce/checkout css_element checkbox-label
- Another client: n/a.
- Methods: 1 by family.

  Example (post 102, rule 23):
  ```css
  &selector .wc-block-checkout__order-notes .wc-block-components-checkbox__label,&selector .wc-block-checkout__use-address-for-billing .wc-block-components-checkbox__label{font-size:15px;font-weight:700}
  ```

### `A.buybox-add-to-cart` Buy box add-to-basket button size and shadow

- Rules: 1 (1 distinct texts). Characters: 162 (0.2% of all).
- Pages: single-product (202).
- Setting that exists: None. sgs/buybox addToCartMinHeight, addToCartPadding, addToCartFontSize, addToCartShadow, addToCartShadowColour
- Evidence: DB: sgs/buybox css_element add-to-cart
- Another client: n/a.
- Methods: 1 by reading.

  Example (post 202, rule 6):
  ```css
  & .sgs-buybox__bar .buybox__add-to-cart { min-height: 52px; padding: 0 22px; font-size: 16px; box-shadow: 3px 3px 0 var(--wp--preset--color--mm-cocoa, #3A2A22); }
  ```

### `A.container-position-pin` Container position and sticky pin

- Rules: 5 (3 distinct texts). Characters: 143 (0.2% of all).
- Pages: order-confirmation (219), single-product-baby-shower-gift-card (346).
- Setting that exists: None. sgs/container wrapper position (css_element wrapper, css_property position) and pinBelowHeader + pinGap (sticks below the sticky header). The gallery rule needs pinGap to equal 108px minus the header height; verify on the canary before relying on it
- Evidence: DB: sgs/container css_element wrapper position; attributes pinBelowHeader, pinGap
- Another client: n/a.
- Methods: 1 by family, 4 by reading.

  Example (post 346, rule 0, inside `@media (min-width: 768px)`):
  ```css
  & { position: sticky; top: 108px; }
  ```

  Example (post 219, rule 0):
  ```css
  &selector { position: relative; }
  ```

### `A.account-fields-bg-gap` Account details: white fields and form gap

- Rules: 2 (2 distinct texts). Characters: 140 (0.2% of all).
- Pages: my-account (103).
- Setting that exists: None. sgs/account fieldInput background (css_element fieldInput background-color) and accountForm gap (css_element accountForm gap)
- Evidence: DB: sgs/account css_element fieldInput, accountForm
- Another client: n/a.
- Methods: 2 by reading.

  Example (post 103, rule 120):
  ```css
  form.woocommerce-EditAccountForm input.input-text{background:var(--wp--preset--color--mm-white);}
  ```

  Example (post 103, rule 109):
  ```css
  form.woocommerce-EditAccountForm{gap:18px;}
  ```

### `A.media-rest-rotate` Media tilt (rest rotation)

- Rules: 4 (1 distinct texts). Characters: 136 (0.2% of all).
- Pages: cart (101), product-search-results (217), search (216), taxonomy-product_attribute (218).
- Setting that exists: None. sgs Motion hover panel field restRotate (motion_fields.HoverStateValues.restRotate; motion_targets has 3 rows for sgs/media); the account hero label already uses it (r2h-account Account 15)
- Evidence: DB: motion_fields def_name HoverStateValues field restRotate; motion_targets block_slug sgs/media
- Another client: n/a.
- Methods: 4 by family.

  Example (post 101, rule 0):
  ```css
  &selector{transform:rotate(-8deg)}
  ```

### `A.account-menu-indicator` Account menu: remove the active-item arrow

- Rules: 1 (1 distinct texts). Characters: 113 (0.2% of all).
- Pages: my-account (103).
- Setting that exists: None. sgs/account menuActiveIndicatorStyle
- Evidence: DB: sgs/account attribute menuActiveIndicatorStyle
- Another client: n/a.
- Methods: 1 by reading.

  Example (post 103, rule 2):
  ```css
  nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link.is-active > a::after{content:none;}
  ```

## B. A WooCommerce or core block that SGS wraps lacks the setting

29 groups, 130 rules, 19,600 characters (28.3%).

### `B.core-search-look` Core search field: fill, shadow, inner padding, focus ring, button

- Rules: 21 (7 distinct texts). Characters: 2,037 (2.9% of all).
- Pages: 404 (213), product-search-results (217), search (216).
- Missing or needed: core/search: wrapper fill, shadow, padding, input type, placeholder colour, focus ring, button radius and border (DB: core/search has 10 attributes, none of these)
- Evidence: the post's own `sgsCustomCssNote` (ids `plain-search-216`, `plain-search-217`, `plain-search-404`) and the findings lines in `debt-lines.md`.
- Another client: Yes: every site with a search page.
- Methods: 21 by family.

  Example (post 213, rule 2):
  ```css
  &selector .wp-block-search__inside-wrapper{box-sizing:border-box;min-height:62px;background:#FFFAF0;box-shadow:4px 4px 0 0 #3A2A22;padding:4px}
  ```

  Example (post 213, rule 5):
  ```css
  &selector .wp-block-search__input:focus-visible,&selector .wp-block-search__button:focus-visible{outline:3px solid #3A2A22;outline-offset:2px}
  ```

### `B.coupon-apply` Coupon Apply button fill, border, radius and type

- Rules: 6 (3 distinct texts). Characters: 1,768 (2.6% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: woocommerce/cart and checkout: fill, border, radius, font and colour for css_element coupon-apply (it holds height only)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 6 by family.

  Example (post 101, rule 23):
  ```css
  &selector .wc-block-components-totals-coupon__button,&selector .sgs-gift-card-panel__apply{box-sizing:border-box;flex:0 0 auto;width:auto;min-width:0;height:48px;min-height:48px;margin:0;padding:0 18px;font-family:var(--wp--preset--font-family--body);font-size:16px;font-weight:700;line-height:1;color:var(--wp--preset--color--mm-cocoa);background:var(--wp--preset--color--mm-yellow);border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:14px;box-shadow:none;opacity:1;text-transform:none}
  ```

  Example (post 101, rule 24):
  ```css
  &selector .wc-block-components-totals-coupon__button .wc-block-components-button__text,&selector .sgs-gift-card-panel__apply .wc-block-components-button__text{font-size:16px;font-weight:700;line-height:1;color:var(--wp--preset--color--mm-cocoa)}
  ```

### `B.wc-confirm-email-form` Order confirmation confirm-your-email form: field, label, button, spacing

- Rules: 7 (7 distinct texts). Characters: 1,682 (2.4% of all).
- Pages: order-confirmation (219).
- Missing or needed: woocommerce/order-confirmation-status (its form): field look, label type, button look, spacing (needs the same controls as the checkout fields and the site button)
- Evidence: the post's own `sgsCustomCssNote` (ids `orderconfirmationstatusform`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 7 by family.

  Example (post 219, rule 4):
  ```css
  &selector form input:not([type="hidden"]):not([type="submit"]) { box-sizing: border-box; width: 100%; max-width: 420px; min-height: 54px; padding: 0 16px; border: 2px solid var(--wp--preset--color--mm-cocoa); border-radius: 14px; background: var(--wp--preset--color--mm-paper); color: var(--wp--preset--color--mm-cocoa); font-size: 16px; }
  ```

  Example (post 219, rule 9):
  ```css
  &selector form button:hover, &selector form input[type="submit"]:hover { background: var(--wp--preset--color--surface-alt); color: var(--wp--preset--color--mm-cocoa); transform: translate(-3px, -3px); box-shadow: 7px 7px 0 var(--wp--preset--color--mm-cocoa); }
  ```

### `B.notice-banner-look` Notice banner fill, border, radius, layout and link style (outside the cart and checkout blocks)

- Rules: 8 (8 distinct texts). Characters: 1,557 (2.2% of all).
- Pages: my-account (103).
- Missing or needed: A site-wide notice look (theme default or a setting) for WooCommerce's info notice: yellow fill, dashed border, radius, padding, link beside the text, link opacity 1. woocommerce/cart and checkout carry sgsNotice* for css_element notice; sgs/account and every other page have none, and theme/sgs-theme/assets/css/woocommerce-notices.css::.wc-block-components-notice-banner fixes the default look
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes: every shop shows these notices.
- Methods: 8 by family.

  Example (post 103, rule 106):
  ```css
  .wc-block-components-notice-banner .wc-block-components-notice-banner__content .wc-forward,.wc-block-components-notice-banner .wc-block-components-notice-banner__content .wc-forward:hover,.wc-block-components-notice-banner .wc-block-components-notice-banner__content .wc-forward:focus,.wc-block-components-notice-banner .wc-block-components-notice-banner__content .wc-forward:visited{opacity:1;color:var(--wp--preset--color--mm-cocoa);text-decoration:underline;}
  ```

  Example (post 103, rule 121):
  ```css
  .wc-block-components-notice-banner.is-info{background:var(--wp--preset--color--mm-yellow-soft);border:2px dashed var(--wp--preset--color--mm-cocoa);border-radius:24px;padding:16px 24px;gap:12px;font-size:15px;line-height:1.4;margin:0 0 16px;color:var(--wp--preset--color--mm-cocoa);}
  ```

### `B.wc-order-blocks-cards` Order confirmation WooCommerce blocks drawn as cards

- Rules: 7 (7 distinct texts). Characters: 1,490 (2.2% of all).
- Pages: order-confirmation (219).
- Missing or needed: woocommerce/order-confirmation-summary, -shipping, -billing, -downloads, -additional-fields: card fill, border, radius, padding, heading type
- Evidence: the post's own `sgsCustomCssNote` (ids `orderconfirmationdetailcards`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 7 by family.

  Example (post 219, rule 1):
  ```css
  &selector [class*="order-confirmation"] h2, &selector [class*="order-confirmation"] h3 { margin: 0 0 12px; font-family: var(--wp--preset--font-family--heading); font-weight: 400; font-size: 22px; line-height: 1.2; }
  ```

  Example (post 219, rule 2):
  ```css
  &selector .wp-block-woocommerce-order-confirmation-shipping-address, &selector .wp-block-woocommerce-order-confirmation-billing-address { padding: 0; border: 0; font-style: normal; line-height: 1.55; }
  ```

### `B.checkout-express-card` Checkout wallet (express payment) row as a bordered card

- Rules: 7 (7 distinct texts). Characters: 1,204 (1.7% of all).
- Pages: checkout (102).
- Missing or needed: woocommerce/checkout: fill, radius and padding per device for css_element express-content (it holds border, margin, padding) and the title placement inside the card
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 7 by family.

  Example (post 102, rule 30):
  ```css
  &selector .wc-block-components-express-payment--checkout .wc-block-components-express-payment__title{transform:none;margin:0 0 14px;font-family:var(--wp--preset--font-family--heading);font-size:22px;font-weight:400;letter-spacing:-.33px;line-height:1.2;color:var(--wp--preset--color--mm-cocoa)}
  ```

  Example (post 102, rule 29):
  ```css
  &selector .wc-block-components-express-payment--checkout .wc-block-components-express-payment__title-container::before,&selector .wc-block-components-express-payment--checkout .wc-block-components-express-payment__title-container::after{display:none}
  ```

### `B.core-read-more` Core Read more link: arrow icon, focus ring, wrap

- Rules: 5 (5 distinct texts). Characters: 1,009 (1.5% of all).
- Pages: search (216).
- Missing or needed: core/read-more: icon (a setting for the trailing arrow), focus ring colour, long-word wrap
- Evidence: the post's own `sgsCustomCssNote` (ids `plain-result-card`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 5 by family.

  Example (post 216, rule 3):
  ```css
  &selector .wp-block-read-more:focus-visible,&selector .wp-block-post-title a:focus-visible{outline:3px solid #3A2A22;outline-offset:3px}
  ```

  Example (post 216, rule 0):
  ```css
  &selector .wp-block-read-more{display:inline-flex;align-items:center;gap:6px;color:#3A2A22;font-weight:700;text-decoration:none}
  ```

### `B.product-grid-columns` Product list columns and gap per device (WooCommerce product template)

- Rules: 12 (4 distinct texts). Characters: 978 (1.4% of all).
- Pages: archive-product (194), gifts (150), product-search-results (217), taxonomy-product_attribute (218).
- Missing or needed: woocommerce/product-collection (or the SGS container around it): columns and gap per device tier; WooCommerce's own list fits as many as the width allows
- Evidence: the post's own `sgsCustomCssNote` (ids `gift-grid-tiers`, `plain-grid-217`, `plain-grid-218`, `shop-grid-tiers`) and the findings lines in `debt-lines.md`.
- Another client: Yes: every shop.
- Methods: 12 by family.

  Example (post 150, rule 0):
  ```css
  &selector .wc-block-product-template{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
  ```

  Example (post 150, rule 1, inside `@media (min-width:768px)`):
  ```css
  &selector .wc-block-product-template{grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;}
  ```

### `B.field-focus` Field focus border and ring colour on WooCommerce text inputs

- Rules: 3 (2 distinct texts). Characters: 910 (1.3% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: woocommerce/cart and checkout: focus border colour and focus ring colour for css_element field-input (the brand pink fails 3:1 on white, so the site needs a darker one)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes: contrast fixes are per brand.
- Methods: 3 by family.

  Example (post 102, rule 19):
  ```css
  &selector :is(.wc-block-components-text-input input,.wc-blocks-components-select__select,.wc-block-components-textarea):focus{border-width:2px;border-color:var(--wp--preset--color--mm-pink-dark);--sgs-focus-ring:var(--wp--preset--color--mm-pink-dark);--sgs-focus-near:transparent;--sgs-focus-far:transparent}
  ```

  Example (post 101, rule 22):
  ```css
  &selector .wc-block-components-totals-coupon .wc-block-components-text-input.wc-block-components-totals-coupon__input input[type]:focus{border-color:var(--wp--preset--color--mm-pink-dark);--sgs-focus-ring:var(--wp--preset--color--mm-pink-dark);--sgs-focus-near:transparent;--sgs-focus-far:transparent}
  ```

### `B.checkout-country-line` Checkout country shown as plain text when only one country is sold to

- Rules: 4 (4 distinct texts). Characters: 771 (1.1% of all).
- Pages: checkout (102).
- Missing or needed: woocommerce/checkout: render a single-country select as fixed text (hide arrow, border, fill) or hide it
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any single-country shop.
- Methods: 4 by family.

  Example (post 102, rule 13):
  ```css
  &selector .wc-block-checkout__shipping-fields .wc-block-components-address-form__country .wc-blocks-components-select__select{appearance:none;border:0;background:transparent;padding:0;height:auto;min-height:0;font-size:16px;font-weight:700;pointer-events:none}
  ```

  Example (post 102, rule 16):
  ```css
  &selector .wc-block-checkout__shipping-fields .wc-block-components-address-form__country .wc-blocks-components-select__label{position:static;transform:none;padding:0;background:transparent;font-size:15px;font-weight:700}
  ```

### `B.wc-order-status` Order confirmation status block: margins, headings and link colour

- Rules: 4 (4 distinct texts). Characters: 719 (1.0% of all).
- Pages: order-confirmation (219).
- Missing or needed: woocommerce/order-confirmation-status: heading and text spacing and type, link colour (the block has no settings)
- Evidence: the post's own `sgsCustomCssNote` (ids `orderconfirmationstatusform`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 4 by reading.

  Example (post 219, rule 5):
  ```css
  &selector [class*="order-confirmation-status"] a, &selector [class*="order-confirmation-status"] a:visited, &selector [class*="order-confirmation-status"] a:hover, &selector [class*="order-confirmation-status"] a:focus-visible { color: var(--wp--preset--color--mm-cocoa); text-decoration: underline; text-underline-offset: 3px; }
  ```

  Example (post 219, rule 2):
  ```css
  &selector .wc-block-order-confirmation-status h1, &selector .wc-block-order-confirmation-status h2 { margin: 0 0 6px; font-family: var(--wp--preset--font-family--heading); font-weight: 400; font-size: clamp(28px, 4vw, 36px); line-height: 1.1; }
  ```

### `B.coupon-row` Coupon and gift-card apply row layout (input beside button)

- Rules: 4 (2 distinct texts). Characters: 632 (0.9% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: woocommerce/cart and checkout: layout of the coupon form (inline input and button, alignment, gap)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any shop with coupons.
- Methods: 4 by family.

  Example (post 101, rule 19):
  ```css
  &selector .wc-block-components-totals-coupon__input,&selector .sgs-gift-card-panel__field{flex:1 1 auto;min-width:0;margin:0;padding:0;height:auto;min-height:0}
  ```

  Example (post 101, rule 18):
  ```css
  &selector .wc-block-components-totals-coupon__form,&selector .sgs-gift-card-panel__form{display:flex;flex-wrap:nowrap;align-items:flex-end;gap:8px;margin:0}
  ```

### `B.checkout-merged-card` Checkout steps joined into one card (Delivery, shipping option, order note)

- Rules: 4 (4 distinct texts). Characters: 544 (0.8% of all).
- Pages: checkout (102).
- Missing or needed: woocommerce/checkout: per-step "join to the card above" (square the touching corners, drop the shared border and padding) and hide a step heading
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes: a common checkout layout.
- Methods: 4 by family.

  Example (post 102, rule 8):
  ```css
  &selector .wc-block-checkout__shipping-fields{margin-bottom:0;padding-bottom:8px;border-bottom-width:0;border-bottom-left-radius:0;border-bottom-right-radius:0}
  ```

  Example (post 102, rule 9):
  ```css
  &selector .wc-block-checkout__shipping-option{margin-bottom:0;padding-top:16px;padding-bottom:8px;border-top-width:0;border-bottom-width:0;border-radius:0}
  ```

### `B.product-filter-chip-hover` Product filter chips hover lift

- Rules: 4 (2 distinct texts). Characters: 500 (0.7% of all).
- Pages: gifts (150).
- Missing or needed: woocommerce/product-filter-taxonomy and product-filter-attribute (SGS extension product-filter-look.js): a hover look for unselected chips
- Evidence: the post's own `sgsCustomCssNote` (ids `chiplift`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any filtered shop.
- Methods: 4 by family.

  Example (post 150, rule 0):
  ```css
  &selector .wc-block-product-filter-chips__item { transition: transform .2s cubic-bezier(.3, 1.6, .5, 1), box-shadow .2s, background .2s; }
  ```

  Example (post 150, rule 1):
  ```css
  &selector .wc-block-product-filter-chips__item[aria-checked="false"]:hover { transform: translate(-2px, -2px); }
  ```

### `B.summary-divider` Summary totals divider colour and width

- Rules: 2 (1 distinct texts). Characters: 438 (0.6% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: woocommerce/cart and checkout: border colour and width on css_element summary-row and total-row (they hold border-top-style only)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 101, rule 16):
  ```css
  &selector .wp-block-woocommerce-cart-order-summary-totals-block,&selector .wp-block-woocommerce-checkout-order-summary-totals-block{border-top:2px dashed var(--wp--preset--color--mm-rule);padding-top:8px;margin-top:4px}
  ```

### `B.summary-shipping-line` Summary shipping-method line type

- Rules: 2 (1 distinct texts). Characters: 416 (0.6% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: woocommerce/cart and checkout: font, size, colour for the shipping "via" line in the summary
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 101, rule 27):
  ```css
  &selector .wc-block-components-totals-shipping__via{font-family:var(--wp--preset--font-family--body);font-size:14px;font-weight:400;line-height:1.4;color:var(--wp--preset--color--mm-cocoa);opacity:1;margin:0}
  ```

### `B.wrapper-spacing` WooCommerce wrapper outer margin and padding (cart, empty cart, product collection, checkout fill)

- Rules: 5 (4 distinct texts). Characters: 383 (0.6% of all).
- Pages: cart (101), checkout (102), product-search-results (217), taxonomy-product_attribute (218).
- Missing or needed: A margin-bottom and padding control on the WooCommerce wrapper blocks (woocommerce/cart, empty-cart, product-collection, checkout order-summary fill) so the gap above the footer is a setting; or a theme default that blanks WooCommerce's 48px, 30px and 24px bottom margins
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`, `plain-grid-217`, `plain-grid-218`) and the findings lines in `debt-lines.md`.
- Another client: Yes: the gap above the footer must match the other pages on every site.
- Methods: 3 by family, 2 by reading.

  Example (post 101, rule 32):
  ```css
  &selector .wc-block-cart.wc-block-cart,&selector .wc-block-cart.wc-block-cart .wc-block-cart__sidebar{margin-bottom:0}
  ```

  Example (post 102, rule 24, inside `@media (max-width:1023.98px)`):
  ```css
  &selector .checkout-order-summary-block-fill-wrapper{margin-bottom:24px}
  ```

### `B.core-query-title` Core search and term title: per-device alignment and long-word wrap

- Rules: 6 (3 distinct texts). Characters: 383 (0.6% of all).
- Pages: product-search-results (217), search (216), taxonomy-product_attribute (218).
- Missing or needed: core/query-title and core/term-description: per-device text-align and overflow-wrap
- Evidence: the post's own `sgsCustomCssNote` (ids `plain-title-216`, `plain-title-217`, `plain-title-218`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 6 by family.

  Example (post 217, rule 1, inside `@media (max-width: 767.98px)`):
  ```css
  &selector .wp-block-query-title,&selector .wp-block-term-description{text-align:left}
  ```

  Example (post 216, rule 0):
  ```css
  &selector .wp-block-query-title{overflow-wrap:anywhere}
  ```

### `B.cart-item-columns` Cart line-item grid columns per device (picture, text, price)

- Rules: 2 (2 distinct texts). Characters: 314 (0.5% of all).
- Pages: cart (101).
- Missing or needed: woocommerce/cart: line-item column template and column gap per device (css_element line-item has no grid-template-columns)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`) and the findings lines in `debt-lines.md`.
- Another client: Yes: every shop client restyles the basket card on phone.
- Methods: 2 by family.

  Example (post 101, rule 4, inside `@media (max-width:919.98px)`):
  ```css
  &selector table.wc-block-cart-items.wc-block-cart-items.wc-block-cart-items .wc-block-cart-items__row{column-gap:16px;grid-template-columns:72px minmax(0,1fr) auto;}
  ```

  Example (post 101, rule 5, inside `@media (min-width:768px) and (max-width:919.98px)`):
  ```css
  &selector table.wc-block-cart-items.wc-block-cart-items.wc-block-cart-items .wc-block-cart-items__row{grid-template-columns:96px minmax(0,1fr) auto;}
  ```

### `B.cart-qty-type` Cart quantity stepper number and button type and colour

- Rules: 2 (2 distinct texts). Characters: 290 (0.4% of all).
- Pages: cart (101).
- Missing or needed: woocommerce/cart: stepper number font size and weight, stepper button size and colour (css_element item-stepper holds only height, margin, padding; line-item-stepper holds fill and border)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any shop with a styled basket.
- Methods: 2 by family.

  Example (post 101, rule 2):
  ```css
  &selector .wc-block-components-quantity-selector .wc-block-components-quantity-selector__button{opacity:1;font-size:20px;color:var(--wp--preset--color--mm-cocoa);}
  ```

  Example (post 101, rule 1):
  ```css
  &selector .wc-block-components-quantity-selector .wc-block-components-quantity-selector__input{font-size:16px;font-weight:700;}
  ```

### `B.cart-layout-breakpoint` Cart and checkout two-column breakpoint

- Rules: 2 (2 distinct texts). Characters: 257 (0.4% of all).
- Pages: cart (101).
- Missing or needed: woocommerce/cart and checkout: the width at which the sidebar drops under the items (WooCommerce switches at 920px; the draft stays one column to 1024px)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`) and the findings lines in `debt-lines.md`.
- Another client: Yes: the breakpoint is a design choice on every site.
- Methods: 2 by family.

  Example (post 101, rule 7, inside `@media (min-width:920px) and (max-width:1023.98px)`):
  ```css
  &selector .wc-block-components-sidebar-layout .wc-block-components-main,&selector .wc-block-components-sidebar-layout .wc-block-components-sidebar{width:100%;max-width:none;flex:0 0 auto;}
  ```

  Example (post 101, rule 6, inside `@media (min-width:920px) and (max-width:1023.98px)`):
  ```css
  &selector .wc-block-components-sidebar-layout{flex-direction:column;}
  ```

### `B.checkout-qty-badge` Checkout summary item quantity badge size, type and position

- Rules: 2 (2 distinct texts). Characters: 244 (0.4% of all).
- Pages: checkout (102).
- Missing or needed: woocommerce/checkout: size, font and offset for css_element summary item quantity badge
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 102, rule 21):
  ```css
  &selector .wc-block-components-order-summary-item__quantity{min-width:24px;height:24px;font-size:14px;font-weight:700;top:-8px;right:-8px}
  ```

  Example (post 102, rule 22):
  ```css
  &selector .wc-block-components-order-summary-item__quantity span{color:var(--wp--preset--color--mm-paper)}
  ```

### `B.summary-description` Summary row description line size and colour

- Rules: 2 (1 distinct texts). Characters: 224 (0.3% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: woocommerce/cart and checkout: size and colour for totals-item__description
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 101, rule 31):
  ```css
  &selector .wc-block-components-totals-item__description{font-size:14px;color:var(--wp--preset--color--mm-cocoa)}
  ```

### `B.summary-heading-box` Cart summary heading margin, padding and alignment

- Rules: 2 (1 distinct texts). Characters: 190 (0.3% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: woocommerce/cart: margin, padding and text-align on css_element summary-heading (it holds type and colour only; the margin settings exist for the checkout title only)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 101, rule 11):
  ```css
  &selector .wc-block-cart__totals-title{display:block;padding:0;margin:0 0 12px;text-align:left}
  ```

### `B.wc-forms-in-account` WooCommerce forms inside the account block (lost password rows)

- Rules: 1 (1 distinct texts). Characters: 179 (0.3% of all).
- Pages: my-account (103).
- Missing or needed: sgs/account: layout of the WooCommerce lost-password and reset rows (float, width)
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by reading.

  Example (post 103, rule 12):
  ```css
  .woocommerce-ResetPassword .form-row,.woocommerce-ResetPassword .form-row-first,.woocommerce-ResetPassword .form-row-wide,.sgs-account__lost-form .form-row{float:none;width:100%;}
  ```

### `B.checkout-misc-type` Checkout guest line and validation error text size

- Rules: 2 (2 distinct texts). Characters: 161 (0.2% of all).
- Pages: checkout (102).
- Missing or needed: woocommerce/checkout: font size for the guest-checkout line and for field validation messages
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 102, rule 55):
  ```css
  .wc-block-components-validation-error,.wc-block-components-validation-error p{font-size:14px;}
  ```

  Example (post 102, rule 20):
  ```css
  &selector .wc-block-checkout__guest-checkout-notice{font-size:15px}
  ```

### `B.place-order` Place-order button label separator and gap

- Rules: 2 (2 distinct texts). Characters: 157 (0.2% of all).
- Pages: checkout (102).
- Missing or needed: woocommerce/checkout: hide the middle dot between label and price; gap between them
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 102, rule 6):
  ```css
  &selector .wc-block-components-checkout-place-order-button__separator{display:none}
  ```

  Example (post 102, rule 7):
  ```css
  &selector .wc-block-components-checkout-place-order-button__text{gap:.3em}
  ```

### `B.catalog-sorting` Shop sort dropdown height, padding and shadow

- Rules: 1 (1 distinct texts). Characters: 85 (0.1% of all).
- Pages: archive-product (194).
- Missing or needed: woocommerce/catalog-sorting: height, padding, shadow, fill, border (SGS wraps it; css_element has no settings)
- Evidence: the post's own `sgsCustomCssNote` (ids `shop-sort-look`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by family.

  Example (post 194, rule 0):
  ```css
  &selector select.orderby{height:50px;padding-left:18px;box-shadow:3px 3px 0 #3A2A22;}
  ```

### `B.checkout-summary-thumb` Checkout summary thumbnail fit

- Rules: 1 (1 distinct texts). Characters: 78 (0.1% of all).
- Pages: checkout (102).
- Missing or needed: woocommerce/checkout: object-fit for the order-summary item picture (the post: "no checkout setting drives object-fit")
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes: product photos of any ratio.
- Methods: 1 by family.

  Example (post 102, rule 5):
  ```css
  &selector .wc-block-components-order-summary-item__image img{object-fit:cover}
  ```

## C. An SGS block lacks the setting

31 groups, 315 rules, 38,239 characters (55.2%).

### `C.account-order-detail` sgs/account order page layout (step tracker cards, items card, text boxes, two-column grid)

- Rules: 63 (63 distinct texts). Characters: 8,575 (12.4% of all).
- Pages: my-account (103).
- Missing or needed: sgs/account: order page layout (grid placement), step cards (fill, border, radius, icon, note type), items card and total box (border, radius, rules), text boxes, items heading type
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 63 by family.

  Example (post 103, rule 59):
  ```css
  .sgs-account__od-step:nth-child(4) .sgs-account__od-step-bar{background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='%233A2A22'%20stroke='%233A2A22'%20stroke-width='2.4'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M12%2020s-7-4.4-7-10a4%204%200%200%201%207-2.5A4%204%200%200%201%2019%2010c0%205.6-7%2010-7%2010z'/%3E%3C/svg%3E");}
  ```

  Example (post 103, rule 57):
  ```css
  .sgs-account__od-step:nth-child(2) .sgs-account__od-step-bar{background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='%233A2A22'%20stroke='%233A2A22'%20stroke-width='2.4'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M12%203l2.2%206.8L21%2012l-6.8%202.2L12%2021l-2.2-6.8L3%2012l6.8-2.2z'/%3E%3C/svg%3E");}
  ```

### `C.testimonial-slider-look` sgs/testimonial-slider arrows, dots, card layout and heading font

- Rules: 59 (26 distinct texts). Characters: 6,732 (9.7% of all).
- Pages: home (154), single-product (202), single-product-baby-shower-gift-card (346).
- Missing or needed: sgs/testimonial-slider: arrow size, border, fill, shadow and placement; dot shape and active width; equal-height cards with a pinned foot; summary font; opening quote mark; footer layout (name left, date and platform right)
- Evidence: the post's own `sgsCustomCssNote` (ids `homereviewslider`, `productreviewslider`) and the findings lines in `debt-lines.md`.
- Another client: Yes: every review carousel.
- Methods: 59 by family.

  Example (post 154, rule 3):
  ```css
  & .sgs-testimonial--review-card .sgs-testimonial__rating::after { content: "“"; position: absolute; top: 28px; right: 26px; font-family: var(--wp--preset--font-family--heading, 'Young Serif', Georgia, serif); font-size: 48px; line-height: 0.6; color: var(--wp--preset--color--mm-sparkle, #E86A75); pointer-events: none; }
  ```

  Example (post 154, rule 16):
  ```css
  & .sgs-testimonial-slider__dot::before, & .sgs-testimonial-slider__dot:hover::before { width: 12px; height: 12px; box-sizing: border-box; border-radius: 999px; border: 2px solid var(--mm-rv-cocoa); background: transparent; transform: none; transition: width 0.3s, background-color 0.3s; }
  ```

### `C.container-scroll-nav` sgs/container sideways row arrows, dots and hidden scrollbar look

- Rules: 42 (16 distinct texts). Characters: 5,389 (7.8% of all).
- Pages: home (154), single-product (202), single-product-baby-shower-gift-card (346).
- Missing or needed: sgs/container: arrow size, border, fill, shadow and hover; dot shape and active width; nav layout (dots left, arrows right); hide scrollbar (scrollArrows, scrollDots and scrollDrag exist but have no look settings)
- Evidence: the post's own `sgsCustomCssNote` (ids `homegiftrow`, `productrelatedrow`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any carousel of cards.
- Methods: 42 by family.

  Example (post 154, rule 9):
  ```css
  & .sgs-container__dot::before, & .sgs-container__dot:hover::before { width: 12px; height: 12px; box-sizing: border-box; border-radius: 999px; border: 2px solid var(--wp--preset--color--mm-cocoa, #3A2A22); background: transparent; transform: none; transition: width 0.3s, background-color 0.3s; }
  ```

  Example (post 154, rule 4):
  ```css
  & .sgs-container__arrow { width: 52px; height: 52px; border: 2px solid var(--wp--preset--color--mm-cocoa, #3A2A22); background: var(--wp--preset--color--mm-paper, #FFFAF0); color: var(--wp--preset--color--mm-cocoa, #3A2A22); box-shadow: 3px 3px 0 var(--wp--preset--color--mm-cocoa, #3A2A22); }
  ```

### `C.gift-card-form` SGS gift-card purchase form look (amount tiles, fields, button)

- Rules: 18 (18 distinct texts). Characters: 2,900 (4.2% of all).
- Pages: single-product-baby-shower-gift-card (346).
- Missing or needed: The SGS gift-card form (plugin PHP printed inside woocommerce/add-to-cart-form, plugins/sgs-blocks/assets/css/gift-card.css) has no settings: amount box fill, border, radius, padding per device; tile look; field look; button look
- Evidence: the post's own `sgsCustomCssNote` (ids `giftcardformlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any shop selling gift cards.
- Methods: 18 by family.

  Example (post 346, rule 8):
  ```css
  &selector .sgs-gift-card-form__submit { width: 100%; height: 64px; border: 2px solid var(--wp--preset--color--mm-cocoa); border-radius: 999px; background: var(--wp--preset--color--mm-yellow); color: var(--wp--preset--color--mm-cocoa); font-size: 18px; font-weight: 700; box-shadow: 4px 4px 0 var(--wp--preset--color--mm-cocoa); cursor: pointer; transition: transform .2s cubic-bezier(.3, 1.6, .5, 1), box-shadow .2s, background .2s; }
  ```

  Example (post 346, rule 3):
  ```css
  &selector .sgs-gift-card-form__amount-label { width: 100%; min-height: 72px; box-sizing: border-box; background: var(--wp--preset--color--mm-paper); border-color: var(--wp--preset--color--mm-cocoa); border-radius: 20px; font-family: var(--wp--preset--font-family--heading); font-size: 26px; font-weight: 400; transition: transform .2s, box-shadow .2s, background .2s; }
  ```

### `C.account-orders-row` sgs/account order row as a card (border, radius, layout, thumbnails, count, hover lift)

- Rules: 18 (18 distinct texts). Characters: 1,838 (2.7% of all).
- Pages: my-account (103).
- Missing or needed: sgs/account: order row card border, radius, hover lift, grid layout (number, status, date, thumbnails, total, button), list gap, status pill border and radius
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 18 by family.

  Example (post 103, rule 27):
  ```css
  .sgs-account__order{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;column-gap:10px;row-gap:6px;align-items:center;border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:24px;transition:transform .25s,box-shadow .25s;}
  ```

  Example (post 103, rule 36):
  ```css
  .sgs-account__order-summary .sgs-account__order-thumbs img{box-sizing:border-box;width:48px;height:48px;border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:12px;object-fit:cover;background:var(--wp--preset--color--mm-pink-soft);}
  ```

### `C.account-order-buttons` sgs/account order buttons (View order, Order again) and help link

- Rules: 7 (7 distinct texts). Characters: 1,567 (2.3% of all).
- Pages: my-account (103).
- Missing or needed: sgs/account: fill, border, radius, shadow, hover and active look for the View order and Order this again buttons; help link type and underline
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 7 by family.

  Example (post 103, rule 98):
  ```css
  .sgs-account__od-again .sgs-account__od-again-link{display:flex;align-items:center;justify-content:center;box-sizing:border-box;height:52px;border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:999px;background:var(--wp--preset--color--mm-yellow);color:var(--wp--preset--color--mm-cocoa);font-size:16px;font-weight:700;text-decoration:none;box-shadow:4px 4px 0 0 var(--wp--preset--color--mm-cocoa);transition:transform .2s cubic-bezier(.3,1.6,.5,1),box-shadow .2s,background .2s;}
  ```

  Example (post 103, rule 38):
  ```css
  .sgs-account__order-view{box-sizing:border-box;height:48px;padding:0 20px;border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:999px;background:var(--wp--preset--color--mm-yellow);font-size:15px;font-weight:700;line-height:1;box-shadow:4px 4px 0 0 var(--wp--preset--color--mm-cocoa);transition:transform .2s cubic-bezier(.3,1.6,.5,1),box-shadow .2s,background .2s;}
  ```

### `C.cart-drawer` sgs/cart (basket drawer) remove link, stepper, free-delivery text, empty-state centring, gift box, close button

- Rules: 13 (13 distinct texts). Characters: 1,320 (1.9% of all).
- Pages: header (178).
- Missing or needed: sgs/cart: Remove link size and underline, stepper number width and height, free-delivery message line height, empty-state vertical centring, gift tick box card look (border, radius, fields, note font), close target and icon size
- Evidence: the post's own `sgsCustomCssNote` (ids `hdrbasket1`) and the findings lines in `debt-lines.md`.
- Another client: Yes: every shop drawer.
- Methods: 13 by family.

  Example (post 178, rule 9):
  ```css
  &selector .sgs-cart__panel-gift-to, &selector .sgs-cart__panel-gift-message { border: 1px solid #D9C7A6; border-radius: 12px; padding: 12px; background: var(--wp--preset--color--mm-white); }
  ```

  Example (post 178, rule 6):
  ```css
  &selector .sgs-cart__panel-gift { margin: 0 20px 16px; padding: 10px 16px; border: 1.5px dashed #E3AFAF; border-radius: 18px; background: var(--wp--preset--color--mm-paper); }
  ```

### `C.product-card-badge` sgs/product-card picture badge (fill, radius, padding, outline)

- Rules: 10 (1 distinct texts). Characters: 1,310 (1.9% of all).
- Pages: archive-product (194), gifts (150), product-search-results (217), single-product (202), single-product-baby-shower-gift-card (346), taxonomy-product_attribute (218).
- Missing or needed: sgs/product-card: look settings for the featured picture badge (.sgs-product-card__tag--featured); tag* settings drive the in-body trial tag only
- Evidence: the post's own `sgsCustomCssNote` (ids `gifts-card-look`, `plain-card-look`, `product-card-look`, `shop-card-look`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 10 by family.

  Example (post 150, rule 0):
  ```css
  &selector .sgs-product-card__tag{border:2px solid #3A2A22;border-radius:999px;background:#F9CF6E;padding:4px 10px;box-shadow:none;}
  ```

### `C.account-menu-look` sgs/account menu: item border, fill, shadow, logout link, count badge shape

- Rules: 4 (4 distinct texts). Characters: 976 (1.4% of all).
- Pages: my-account (103).
- Missing or needed: sgs/account: menu item border, fill and shadow; logout link look; count badge fill, size and radius (menuLink and menuItem hold colour, radius, gap, padding only)
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any account area.
- Methods: 4 by family.

  Example (post 103, rule 0):
  ```css
  nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link:not(.is-active):not(.woocommerce-MyAccount-navigation-link--customer-logout) > a{background:var(--wp--preset--color--mm-paper);border:2px solid var(--wp--preset--color--mm-cocoa);justify-content:space-between;font-weight:700;}
  ```

  Example (post 103, rule 1):
  ```css
  nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link.is-active > a{border:2px solid var(--wp--preset--color--mm-cocoa);box-shadow:3px 3px 0 0 var(--wp--preset--color--mm-cocoa);justify-content:space-between;}
  ```

### `C.account-edit-card` sgs/account Account details cards (radius, padding per device, password section grid, tick row)

- Rules: 11 (11 distinct texts). Characters: 941 (1.4% of all).
- Pages: my-account (103).
- Missing or needed: sgs/account: card radius and padding per device (cardBox holds fill and border only), two-column password section, legend type, marketing tick row layout
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 11 by family.

  Example (post 103, rule 111):
  ```css
  .sgs-account__edit-card--password fieldset > legend{grid-column:1 / -1;float:left;width:100%;padding:0;margin:0;font-family:var(--wp--preset--font-family--heading);font-size:22px;line-height:1.4;}
  ```

  Example (post 103, rule 110):
  ```css
  .sgs-account__edit-card--password fieldset{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
  ```

### `C.account-form-buttons` sgs/account form buttons (Save changes, Update password, Save address, Reset)

- Rules: 4 (4 distinct texts). Characters: 906 (1.3% of all).
- Pages: my-account (103).
- Missing or needed: sgs/account: a look setting (fill, border, radius, shadow, min height, padding) for the WooCommerce form buttons; loginButton* exists for the sign-in button only
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 4 by family.

  Example (post 103, rule 11):
  ```css
  form.woocommerce-ResetPassword button[type="submit"],.sgs-account__lost-form button[type="submit"]{background:var(--wp--preset--color--mm-yellow);color:var(--wp--preset--color--mm-cocoa);border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:999px;box-shadow:3px 3px 0 0 var(--wp--preset--color--mm-cocoa);font-weight:700;min-height:48px;padding:0 24px;}
  ```

  Example (post 103, rule 8):
  ```css
  form.woocommerce-EditAccountForm button[type="submit"],.sgs-account__wc form button[name="save_address"]{background:var(--wp--preset--color--mm-yellow);color:var(--wp--preset--color--mm-cocoa);border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:999px;box-shadow:4px 4px 0 0 var(--wp--preset--color--mm-cocoa);font-weight:700;}
  ```

### `C.accordion-labels` sgs/accordion count line, category label and search placeholder type

- Rules: 7 (7 distinct texts). Characters: 769 (1.1% of all).
- Pages: contact (148), help (152).
- Missing or needed: sgs/accordion: count line size, font and spacing (only filterCountColour exists); category label type and colour (accordion-filter.css fixes 0.75em of the heading font); search placeholder colour; hide the count line while the filter is on
- Evidence: the post's own `sgsCustomCssNote` (ids `helpcountlabels`, `nofilterbar`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any FAQ with a filter.
- Methods: 6 by family, 1 by reading.

  Example (post 152, rule 1):
  ```css
  & .sgs-accordion-item__eyebrow { font-family: var(--wp--preset--font-family--body, Karla, system-ui, sans-serif); font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #8E3444; }
  ```

  Example (post 152, rule 0):
  ```css
  & .sgs-accordion__count { margin: 28px 0 4px; font-family: var(--wp--preset--font-family--body, Karla, system-ui, sans-serif); font-size: 15px; font-weight: 700; line-height: 1.2; }
  ```

### `C.order-items` sgs/order-items row padding, totals rule and total value font

- Rules: 5 (5 distinct texts). Characters: 628 (0.9% of all).
- Pages: order-confirmation (219).
- Missing or needed: sgs/order-items: row padding, totals block rule and padding, total row alignment, total value font (rowBorder*, totalsFontSize and totalColour exist; these do not)
- Evidence: the post's own `sgsCustomCssNote` (ids `orderitemslist`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 5 by family.

  Example (post 219, rule 0):
  ```css
  &selector .sgs-order-items__name, &selector .sgs-order-items__meta, &selector .sgs-order-items__price, &selector .sgs-order-items__label, &selector .sgs-order-items__value { line-height: normal; }
  ```

  Example (post 219, rule 4):
  ```css
  &selector .sgs-order-items__totals-row--total .sgs-order-items__value { font-family: var(--wp--preset--font-family--young-serif); font-size: 26px; font-weight: 400; }
  ```

### `C.container-card-link` sgs/container whole-card link to a dynamic URL

- Rules: 6 (6 distinct texts). Characters: 570 (0.8% of all).
- Pages: order-confirmation (219).
- Missing or needed: sgs/container: make a contained button's link cover the whole card (the card link setting holds a fixed URL only)
- Evidence: the post's own `sgsCustomCssNote` (ids `orderaccountcardlink`, `ordertastercardlink`, `orderviewcardlink`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any card linking to a per-record URL.
- Methods: 6 by family.

  Example (post 219, rule 1):
  ```css
  &selector .oc-view-order-link .sgs-button__label::after { content: ""; position: absolute; z-index: 2; inset: -22px; border-radius: 26px; }
  ```

  Example (post 219, rule 1):
  ```css
  &selector .oc-account-cta .sgs-button__label::after { content: ""; position: absolute; z-index: 2; inset: -22px; border-radius: 26px; }
  ```

### `C.buybox-pick-preview` sgs/buybox pick picture panel, box size and caption

- Rules: 4 (4 distinct texts). Characters: 536 (0.8% of all).
- Pages: home (154).
- Missing or needed: sgs/buybox: preview panel fill, border, radius and padding; preview box size per device; caption type
- Evidence: the post's own `sgsCustomCssNote` (ids `homebuilderswatch`) and the findings lines in `debt-lines.md`.
- Another client: Plausible: any product configurator with a preview.
- Methods: 4 by reading.

  Example (post 154, rule 2):
  ```css
  & .sgs-buybox-pick__preview { --zk-ink: #3A2A22; position: relative; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 28px 20px 20px; background: #FFFAF0; border: 2px solid var(--zk-ink); border-radius: 28px; overflow: hidden; }
  ```

  Example (post 154, rule 8):
  ```css
  & .sgs-buybox-pick__caption { margin: 0; font-size: 16px; font-weight: 700; color: var(--zk-ink); }
  ```

### `C.account-address-card` sgs/account address card layout (Edit beside the title, bold first line)

- Rules: 5 (5 distinct texts). Characters: 416 (0.6% of all).
- Pages: my-account (103).
- Missing or needed: sgs/account: place the Edit link beside the title; bold first line of the address
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 5 by family.

  Example (post 103, rule 15):
  ```css
  .sgs-account__addr > header.woocommerce-Address-title{order:0;display:flex;flex-direction:row;justify-content:space-between;align-items:baseline;gap:12px;margin:0 0 6px;}
  ```

  Example (post 103, rule 19):
  ```css
  .sgs-account__addr-read:not(:has(br))::first-line{font-size:15px;font-weight:400;}
  ```

### `C.buybox-pick-layout` sgs/buybox pick layout row and column placement

- Rules: 6 (6 distinct texts). Characters: 388 (0.6% of all).
- Pages: home (154).
- Missing or needed: sgs/buybox: placement of the pick groups and side column at tablet and up (rows and columns), now the fixed grid in plugins/sgs-blocks/src/blocks/buybox/configurator.css::.sgs-buybox-pick
- Evidence: the post's own `sgsCustomCssNote` (ids `homebuilderswatch`) and the findings lines in `debt-lines.md`.
- Another client: Plausible.
- Methods: 6 by reading.

  Example (post 154, rule 10):
  ```css
  & .sgs-buybox-pick__side form.cart, & .sgs-buybox-pick__side .sgs-buybox__form { margin-top: 18px; }
  ```

  Example (post 154, rule 14, inside `@media (min-width: 768px)`):
  ```css
  & .sgs-buybox-pick__side { grid-column: 2; grid-row: 1 / span 2; }
  ```

### `C.container-blocklink-underline` sgs/container underline sweep for text inside a block link

- Rules: 3 (3 distinct texts). Characters: 365 (0.5% of all).
- Pages: home (154).
- Missing or needed: sgs/container: the link-underline setting does not reach text inside a block link; needs a hover underline option for block links
- Evidence: the post's own `sgsCustomCssNote` (ids `tpscorehover`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 3 by family.

  Example (post 154, rule 0):
  ```css
  & .cr-ref-home-161b { padding-bottom: 3px; background-image: linear-gradient(currentColor, currentColor); background-repeat: no-repeat; background-position: 0 100%; background-size: 0 2px; transition: background-size 0.25s ease-out; }
  ```

  Example (post 154, rule 1):
  ```css
  &:hover .cr-ref-home-161b, &:focus-within .cr-ref-home-161b { background-size: 100% 2px; }
  ```

### `C.icon-current-page` sgs/icon current-page state

- Rules: 2 (1 distinct texts). Characters: 316 (0.5% of all).
- Pages: header (178).
- Missing or needed: sgs/icon: a current-page resting look (sgs/nav-bar-menu has itemBgCurrent)
- Evidence: the post's own `sgsCustomCssNote` (ids `hdracct1`, `hdracct2`) and the findings lines in `debt-lines.md`.
- Another client: Yes: account and cart icons in any header.
- Methods: 2 by family.

  Example (post 178, rule 0):
  ```css
  body.woocommerce-account &selector .sgs-icon__shape, body.page-id-628 &selector .sgs-icon__shape { background-color: var(--wp--preset--color--mm-pink-soft); }
  ```

### `C.buybox-hide-parts` sgs/buybox: hide the per-unit line, the pick Undo row and the colour square

- Rules: 6 (3 distinct texts). Characters: 282 (0.4% of all).
- Pages: home (154), single-product (202).
- Missing or needed: sgs/buybox and sgs/option-picker: on/off settings for the per-unit price line, the pick group Undo row (also in the plan's framework debt) and the colour swatch square per group
- Evidence: the post's own `sgsCustomCssNote` (ids `homebuilderswatch`, `productbuyboxlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 6 by reading.

  Example (post 154, rule 0):
  ```css
  & .sgs-option-picker__swatch { display: none; }
  ```

  Example (post 154, rule 9):
  ```css
  & .sgs-buybox-pick__per-unit { display: none; }
  ```

### `C.button-no-hover-fill` sgs/button: a "no hover fill" option that keeps the underline sweep

- Rules: 4 (1 distinct texts). Characters: 236 (0.3% of all).
- Pages: home (154), single-product (202), single-product-baby-shower-gift-card (346).
- Missing or needed: sgs/button: an option to switch off the button style's own hover fill so the link underline sweep runs (the sweep runs only when no hover fill is set)
- Evidence: the post's own `sgsCustomCssNote` (ids `herolinkhover`, `productreviewslinehover`) and the findings lines in `debt-lines.md`.
- Another client: Yes: text-link buttons.
- Methods: 4 by family.

  Example (post 154, rule 0):
  ```css
  &:hover, &:focus-visible { background-color: transparent; }
  ```

### `C.decorative-image-hover-z` sgs/decorative-image raise on hover (z-index)

- Rules: 4 (1 distinct texts). Characters: 220 (0.3% of all).
- Pages: gifts (150), home (154).
- Missing or needed: sgs/decorative-image: hover z-index (zIndex exists for rest only)
- Evidence: the post's own `sgsCustomCssNote` (ids `herocardtop`, `polaroidtop`) and the findings lines in `debt-lines.md`.
- Another client: Yes: overlapping cards.
- Methods: 4 by family.

  Example (post 150, rule 0):
  ```css
  &selector:hover, &selector:focus-within { z-index: 6; }
  ```

### `C.gift-order-tile-type` sgs/gift-order tile line type

- Rules: 2 (2 distinct texts). Characters: 197 (0.3% of all).
- Pages: checkout (102).
- Missing or needed: sgs/gift-order: font, size and weight for the tile first and second line (giftLabel* styles the step label; the note says its own Custom CSS cannot print inside WooCommerce's checkout)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Plausible: gift choice tiles.
- Methods: 2 by family.

  Example (post 102, rule 0):
  ```css
  &selector .sgs-gift-order__tile-label{font-family:var(--wp--preset--font-family--caveat),cursive;font-size:24px;font-weight:600;line-height:1.2}
  ```

  Example (post 102, rule 1):
  ```css
  &selector .sgs-gift-order__tile-text{font-weight:700}
  ```

### `C.buybox-pick-badge-size` sgs/buybox pick tile badge size

- Rules: 2 (1 distinct texts). Characters: 174 (0.3% of all).
- Pages: home (154), single-product (202).
- Missing or needed: sgs/buybox: font size of the pack tile term badge (pickBadgeBackgroundColour and TextColour exist; size does not)
- Evidence: the post's own `sgsCustomCssNote` (ids `homebuilderswatch`, `productbuyboxlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes, small.
- Methods: 2 by reading.

  Example (post 154, rule 1):
  ```css
  & .sgs-option-picker__term-badge, & .sgs-buybox-pick__option-badge { font-size: 11px; }
  ```

### `C.business-info-wrap` sgs/business-info long email wrap

- Rules: 2 (2 distinct texts). Characters: 152 (0.2% of all).
- Pages: contact (148).
- Missing or needed: sgs/business-info: break-anywhere option for a long address that is wider than its card
- Evidence: the post's own `sgsCustomCssNote` (ids `emailwrap`) and the findings lines in `debt-lines.md`.
- Another client: Plausible.
- Methods: 2 by family.

  Example (post 148, rule 0):
  ```css
  &selector { min-width: 0; max-width: 100%; overflow-wrap: anywhere; word-break: break-all; }
  ```

  Example (post 148, rule 1):
  ```css
  &selector a { min-width: 0; max-width: calc(100% + 1.2em); }
  ```

### `C.buybox-thumb-selected` sgs/buybox selected thumbnail lift and shadow

- Rules: 1 (1 distinct texts). Characters: 148 (0.2% of all).
- Pages: single-product (202).
- Missing or needed: sgs/buybox: selected thumbnail offset and shadow (only thumbSelectedScale exists)
- Evidence: the post's own `sgsCustomCssNote` (ids `productbuyboxlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by reading.

  Example (post 202, rule 3):
  ```css
  & .product-card__thumb[aria-current="true"] { transform: translate(-2px, -2px); box-shadow: 3px 3px 0 var(--wp--preset--color--mm-cocoa, #3A2A22); }
  ```

### `C.container-hide-when-empty` sgs/container hide when its content has no form, link or heading

- Rules: 2 (2 distinct texts). Characters: 130 (0.2% of all).
- Pages: order-confirmation (219).
- Missing or needed: sgs/container conditional visibility: a "hide when empty of X" condition (sgsCondition* has no content test)
- Evidence: the post's own `sgsCustomCssNote` (ids `orderaddressesempty`, `orderconfirmationstatusform`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by family, 1 by reading.

  Example (post 219, rule 0):
  ```css
  &selector .sgs-container__inner > .sgs-container:not(:has(h2)) { display: none; }
  ```

  Example (post 219, rule 0):
  ```css
  &:not(:has(form)):not(:has(a)) { display: none; }
  ```

### `C.decorative-image-shape` sgs/decorative-image notched label shape

- Rules: 1 (1 distinct texts). Characters: 74 (0.1% of all).
- Pages: home (154).
- Missing or needed: sgs/decorative-image layerShape list: a notched arrow label (clip-path polygon)
- Evidence: the post's own `sgsCustomCssNote` (ids `tagnotch`) and the findings lines in `debt-lines.md`.
- Another client: Plausible: price tags, ribbons.
- Methods: 1 by family.

  Example (post 154, rule 0):
  ```css
  &selector { clip-path: polygon(0 0, 100% 0, 88% 50%, 100% 100%, 0 100%); }
  ```

### `C.buybox-spacing` sgs/buybox spacing between stacked parts and in the pick layout

- Rules: 2 (2 distinct texts). Characters: 70 (0.1% of all).
- Pages: single-product (202).
- Missing or needed: sgs/buybox: gap between the buy box's stacked parts (--sgs-buybox-gap is a fixed token) and spacing inside the pick layout
- Evidence: the post's own `sgsCustomCssNote` (ids `productbuyboxlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by reading.

  Example (post 202, rule 1):
  ```css
  & .sgs-buybox__extras--before { gap: 0; }
  ```

  Example (post 202, rule 0):
  ```css
  & { --sgs-buybox-gap: 22px; }
  ```

### `C.account-misc` sgs/account small spacing (marketing tick margins)

- Rules: 1 (1 distinct texts). Characters: 64 (0.1% of all).
- Pages: sign-in (628).
- Missing or needed: sgs/account: marketing opt-in row margin
- Evidence: the post's own `sgsCustomCssNote` (ids `signin-r2`) and the findings lines in `debt-lines.md`.
- Another client: Yes, small.
- Methods: 1 by family.

  Example (post 628, rule 0):
  ```css
  &selector .sgs-account__marketing-opt-in { margin-block: -6px; }
  ```

### `C.heading-fluid` sgs/heading sub-375px fluid size

- Rules: 1 (1 distinct texts). Characters: 50 (0.1% of all).
- Pages: footer (176).
- Missing or needed: sgs/heading: font size in vw or a below-375px tier
- Evidence: the post's own `sgsCustomCssNote` (ids `footerhandlefit`) and the findings lines in `debt-lines.md`.
- Another client: Low.
- Methods: 1 by family.

  Example (post 176, rule 0, inside `@media (max-width: 374px)`):
  ```css
  &selector.wp-block-sgs-heading { font-size: 9vw; }
  ```

## D. The rule fights a default the theme or a block stylesheet hard-codes

7 groups, 14 rules, 1,169 characters (1.7%).

### `D.opacity` Plugin text opacity .72 and .85 (washed grey text)

- Rules: 5 (3 distinct texts). Characters: 597 (0.9% of all).
- Pages: cart (101), checkout (102), home (154), single-product (202), single-product-baby-shower-gift-card (346).
- Missing or needed: Blank the default: plugins/sgs-blocks/src/blocks/option-picker/style.css::.sgs-option-picker__sub-label and ::.sgs-option-picker__term-description (opacity: 0.72); plugins/sgs-blocks/assets/css/gift-card.css::.sgs-gift-card-form__help, ::.sgs-gift-card-form__terms and ::.sgs-gift-card-panel__terms (opacity: 0.85)
- Evidence: r2g-gap "light grey text"
- Another client: Yes: grey text fails contrast on any brand.
- Methods: 2 by family, 3 by reading.

  Example (post 101, rule 26):
  ```css
  &selector .sgs-gift-card-panel__terms{font-family:var(--wp--preset--font-family--body);font-size:13px;line-height:1.5;color:var(--wp--preset--color--mm-cocoa);opacity:1;margin:8px 0 0}
  ```

  Example (post 154, rule 17):
  ```css
  & .sgs-option-picker__sub-label,& .sgs-option-picker__term-description{opacity:1}
  ```

### `D.woocommerce-clip` WooCommerce wrapper overflow clip crops card shadows

- Rules: 4 (2 distinct texts). Characters: 334 (0.5% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: Blank the default: theme/sgs-theme/assets/css/woocommerce.css::.wp-block-woocommerce-cart (overflow-x: hidden) and ::.wp-block-woocommerce-checkout (overflow-x: clip) and the checkout fields block rule; use overflow-clip-margin instead
- Evidence: r2b-basket-checkout Checkout 12; woocommerce.css lines for .wp-block-woocommerce-cart / -checkout / -checkout-fields-block
- Another client: Yes: every hard-shadow card design is cut off.
- Methods: 4 by family.

  Example (post 101, rule 10):
  ```css
  &selector .wp-block-woocommerce-checkout-fields-block{overflow-x:clip;overflow-clip-margin:12px}
  ```

  Example (post 101, rule 9):
  ```css
  &selector{overflow-x:clip;overflow-y:visible;overflow-clip-margin:12px}
  ```

### `D.gift-order-margin` Gift-order tiles bottom margin

- Rules: 1 (1 distinct texts). Characters: 60 (0.1% of all).
- Pages: checkout (102).
- Missing or needed: Blank the default: plugins/sgs-blocks/src/blocks/gift-order/style.css::.sgs-gift-order__tiles (margin-bottom: 16px adds to the step padding)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by family.

  Example (post 102, rule 4):
  ```css
  &selector .sgs-gift-order__tiles{clear:both;margin-bottom:0}
  ```

### `D.business-info-underline` Footer credit link underline thickness

- Rules: 1 (1 distinct texts). Characters: 58 (0.1% of all).
- Pages: footer (176).
- Missing or needed: Blank the default: plugins/sgs-blocks/src/blocks/business-info/style.css::.sgs-business-attribution .sgs-business-info__link::after (height: 1px) should follow linkUnderlineThickness
- Evidence: the post's own `sgsCustomCssNote` (ids `attrunderline`) and the findings lines in `debt-lines.md`.
- Another client: Low.
- Methods: 1 by family.

  Example (post 176, rule 0):
  ```css
  &selector .sgs-business-info__link::after { height: 2px; }
  ```

### `D.gift-order-outline` Gift-order selected tile second outline

- Rules: 1 (1 distinct texts). Characters: 52 (0.1% of all).
- Pages: checkout (102).
- Missing or needed: Blank the default: plugins/sgs-blocks/src/blocks/gift-order/style.css::.sgs-gift-order__tile--selected (outline: 2px solid currentcolor; outline-offset: 2px)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes: draws a second border on any site.
- Methods: 1 by family.

  Example (post 102, rule 2):
  ```css
  &selector .sgs-gift-order__tile--selected{outline:0}
  ```

### `D.hero-wide-cap` Standard hero caps its content at the wide size

- Rules: 1 (1 distinct texts). Characters: 41 (0.1% of all).
- Pages: home (154).
- Missing or needed: Blank the default: plugins/sgs-blocks/src/blocks/hero/style.css::.sgs-hero--standard .sgs-hero__content (max-width: var(--wp--style--global--wide-size)); the contentWidth wrapper already caps
- Evidence: the post's own `sgsCustomCssNote` (ids `herofull`) and the findings lines in `debt-lines.md`.
- Another client: Yes: full-bleed rule lines.
- Methods: 1 by family.

  Example (post 154, rule 0):
  ```css
  & .sgs-hero__content { max-width: none; }
  ```

### `D.hero-overflow` Hero clips overflow at its own edge

- Rules: 1 (1 distinct texts). Characters: 27 (0.0% of all).
- Pages: cart (222).
- Missing or needed: Blank the default or add a setting: plugins/sgs-blocks/src/blocks/hero/style.css::.sgs-hero (overflow: hidden) crops an 8px hard shadow of the card below
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0222`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any shadow that leaves the hero box.
- Methods: 1 by family.

  Example (post 222, rule 0):
  ```css
  &selector{overflow:visible}
  ```

## E. A real one-off look for this client (stays Custom CSS)

4 groups, 14 rules, 2,468 characters (3.6%).

### `E.gift-note-decoration` Gift note tape strip, tilt and handwriting

- Rules: 7 (7 distinct texts). Characters: 1,052 (1.5% of all).
- Pages: my-account (103), order-confirmation (219).
- Why it stays: Stay Custom CSS (the taped, tilted note in the handwriting font)
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`, `ordergiftnotetape`) and the findings lines in `debt-lines.md`.
- Another client: No.
- Methods: 6 by family, 1 by reading.

  Example (post 103, rule 80):
  ```css
  .sgs-account__gift-note{order:5;position:relative;margin:18px 0 0;background:var(--wp--preset--color--mm-paper);border:2px solid var(--wp--preset--color--mm-cocoa);border-radius:6px;padding:28px 22px 20px;transform:rotate(1.5deg);box-shadow:6px 6px 0 0 var(--wp--preset--color--mm-cocoa);}
  ```

  Example (post 219, rule 1):
  ```css
  &selector::before { content: ""; position: absolute; top: -12px; left: 50%; width: 90px; height: 24px; background: rgba(249, 207, 110, 0.85); transform: translateX(-50%) rotate(-3deg); }
  ```

### `E.twinkle` Home star twinkle loop (Loop A-02)

- Rules: 3 (3 distinct texts). Characters: 716 (1.0% of all).
- Pages: home (154).
- Why it stays: Stay Custom CSS (a hand-drawn spin and scale loop with its own origin)
- Evidence: the post's own `sgsCustomCssNote` (ids `loopa02`) and the findings lines in `debt-lines.md`.
- Another client: No.
- Methods: 3 by family.

  Example (post 154, rule 0, inside `@media (prefers-reduced-motion: no-preference)`):
  ```css
  & { animation: sgs-loop-a-02 2.4s linear infinite; }
  ```

  Example (post 154, rule 2):
  ```css
  & { transform-origin: 50% 46.3%; }
  ```

### `E.cookie-preview` Zookie preview: round tinted cookie box, gradient and bump

- Rules: 3 (3 distinct texts). Characters: 657 (0.9% of all).
- Pages: home (154).
- Why it stays: Stay Custom CSS (the cookie drawn as a tinted ball with an offset shadow)
- Evidence: the post's own `sgsCustomCssNote` (ids `homebuilderswatch`) and the findings lines in `debt-lines.md`.
- Another client: No.
- Methods: 3 by reading.

  Example (post 154, rule 3):
  ```css
  & .sgs-buybox-pick__preview-box { --zk-body: var(--sgs-pick-axis-base, #D39B5A); width: 180px; height: 180px; aspect-ratio: auto; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--zk-body) 55%, white), var(--zk-body) 62%, color-mix(in srgb, var(--zk-body) 86%, var(--zk-ink))); border: 2px solid var(--zk-ink); box-shadow: inset -10px -12px 0 rgba(58, 42, 34, .12), 6px 6px 0 var(--zk-ink); overflow: visible; }
  ```

  Example (post 154, rule 7):
  ```css
  @keyframes zk-bump { 0%, 100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.08) rotate(-8deg); } }
  ```

### `E.pill-centre` Form topic pill vertical centring (owner one-off)

- Rules: 1 (1 distinct texts). Characters: 43 (0.1% of all).
- Pages: form-send (157).
- Why it stays: Stay Custom CSS (the post note calls it the owner's one-off choice)
- Evidence: the post's own `sgsCustomCssNote` (ids `pillctr`) and the findings lines in `debt-lines.md`.
- Another client: No.
- Methods: 1 by family.

  Example (post 157, rule 0):
  ```css
  .sgs-form-tile { justify-content: center; }
  ```

## F. A workaround for a block bug

8 groups, 11 rules, 923 characters (1.3%).

### `F.select-arrow` Select arrow off-centre after the field settings

- Rules: 2 (2 distinct texts). Characters: 224 (0.3% of all).
- Pages: checkout (102).
- Missing or needed: Fix the output: the field height and padding settings leave the WooCommerce select arrow off-centre and the text under it; r2b-basket-checkout Checkout 17
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 102, rule 18):
  ```css
  &selector .wc-blocks-components-select__container .wc-blocks-components-select__expand{top:auto;bottom:15px;transform:none}
  ```

  Example (post 102, rule 17):
  ```css
  &selector .wc-block-checkout__billing-fields .wc-blocks-components-select__select{padding-right:44px}
  ```

### `F.cart-narrow-items` Cart line-item padding and border lose to WooCommerce narrow-basket rules

- Rules: 1 (1 distinct texts). Characters: 175 (0.3% of all).
- Pages: cart (101).
- Missing or needed: Fix the output: sgsItemPadding and sgsItemBorder* (DB: woocommerce/cart css_element line-item) are saved but WooCommerce's is-medium, is-small, is-mobile and under-920px rules out-rank them; print the settings with the weight the field settings use (selector repeated three times)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by family.

  Example (post 101, rule 0):
  ```css
  &selector table.wc-block-cart-items.wc-block-cart-items.wc-block-cart-items .wc-block-cart-items__row{padding:14px;border-bottom:2px solid var(--wp--preset--color--mm-cocoa);}
  ```

### `F.empty-totals` Empty WooCommerce totals wrappers keep the padding a setting prints

- Rules: 2 (1 distinct texts). Characters: 150 (0.2% of all).
- Pages: cart (101), checkout (102).
- Missing or needed: Fix the output: do not print sgsTotalsWrapperPadding on an empty wrapper (inferred from the rule; not separately proved)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmbk0001`, `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 2 by family.

  Example (post 101, rule 15):
  ```css
  &selector .wc-block-components-totals-wrapper:empty{display:none;padding:0}
  ```

### `F.shipping-gap` Delivery option gap does nothing because WooCommerce makes the box display:block

- Rules: 1 (1 distinct texts). Characters: 116 (0.2% of all).
- Pages: checkout (102).
- Missing or needed: Fix the output: print display:flex;flex-direction:column with sgsShippingOptionControlGap (selectors.json::shipping_option_control); r2b-basket-checkout Checkout 13
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by family.

  Example (post 102, rule 10):
  ```css
  &selector .wc-block-checkout__shipping-option .wc-block-components-radio-control{display:flex;flex-direction:column}
  ```

### `F.gift-legend` Gift-order title is a legend on a fieldset border

- Rules: 1 (1 distinct texts). Characters: 81 (0.1% of all).
- Pages: checkout (102).
- Missing or needed: Fix the block: render the title so the browser does not draw it on the fieldset border (r2b-basket-checkout Checkout 15)
- Evidence: the post's own `sgsCustomCssNote` (ids `mmco0002`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by family.

  Example (post 102, rule 3):
  ```css
  &selector .sgs-gift-order__title{float:left;width:100%;margin:0 0 14px;padding:0}
  ```

### `F.cart-drawer-header-shrink` Basket drawer header shrinks in the empty state

- Rules: 1 (1 distinct texts). Characters: 76 (0.1% of all).
- Pages: header (178).
- Missing or needed: Fix the block: flex-shrink: 0 on .sgs-cart__panel-header (inferred; no findings line)
- Evidence: the post's own `sgsCustomCssNote` (ids `hdrbasket1`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by reading.

  Example (post 178, rule 15):
  ```css
  &selector .sgs-cart__panel-inner .sgs-cart__panel-header { flex-shrink: 0; }
  ```

### `F.media-height-loses` sgs/media saved height loses to .woocommerce img { height: auto }

- Rules: 2 (1 distinct texts). Characters: 54 (0.1% of all).
- Pages: drawer-menu (180).
- Missing or needed: Fix the output: make the media height setting out-rank WooCommerce's image rule (same trap as sgs/order-items thumbnail Height; r2c-drawer-confirmation)
- Evidence: the post's own `sgsCustomCssNote` (ids `drwcard1`, `drwcard2`) and the findings lines in `debt-lines.md`.
- Another client: Yes: any media block on a WooCommerce page.
- Methods: 2 by family.

  Example (post 180, rule 0):
  ```css
  &selector { height: 84px; }
  ```

### `F.account-clear-divs` sgs/account prints WooCommerce .clear spacer divs that take grid rows

- Rules: 1 (1 distinct texts). Characters: 47 (0.1% of all).
- Pages: my-account (103).
- Missing or needed: Fix the block: do not print (or hide) the .clear divs inside the Account details cards (r2h-account Account 14: "a stray .clear div took an empty grid row")
- Evidence: the post's own `sgsCustomCssNote` (ids `acctlook`) and the findings lines in `debt-lines.md`.
- Another client: Yes.
- Methods: 1 by reading.

  Example (post 103, rule 108):
  ```css
  .sgs-account__edit-card > .clear{display:none;}
  ```

## Rules that could not be placed

None. Every one of the 542 rules sits in a group above. Rules whose class is a judgement call, listed so they can be challenged:

- `A.product-card-cta-shadow` (20 rules): the post note says no button-shadow setting exists, the DB has `showCtaShadow`; whether it renders the 4px and 7px hard shadow was not run.
- `A.container-position-pin` (the gallery sticky rule): `pinBelowHeader` and `pinGap` exist but were not run against a 768px page.
- `A.media-rest-rotate` (4 rules): `restRotate` exists in the motion data and `sgs/media` has motion targets; the note says "no rotation setting", which probably means nobody looked in the Motion panel.
- `F.empty-totals`, `F.cart-drawer-header-shrink`: the cause is inferred from the rule, not proved by a findings line.
- `E.gift-note-decoration` and `E.cookie-preview`: one-off by my reading; the account page note says "no block setting styles the note", so another client with a gift note may want it.

## What the numbers say

The five largest removable groups are `C.account-order-detail` (8,575 chars); `C.testimonial-slider-look` (6,732 chars); `C.container-scroll-nav` (5,389 chars); `C.gift-card-form` (2,900 chars); `B.core-search-look` (2,037 chars), together 37.0% of the Custom CSS. The shared WooCommerce summary block (basket and checkout) is the clearest duplication: it appears in both posts, and its Class A rules (3,367 characters) already have settings.
