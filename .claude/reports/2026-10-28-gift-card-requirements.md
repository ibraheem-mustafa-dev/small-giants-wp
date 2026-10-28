# Gift card feature: requirements research (2026-10-28)

Scope: what SGS must build to offer a native gift card (client case: a UK baby-food bakery's "Baby Shower Gift Card", one product, amount picker £15 / £25 / £40, sold as a printed card in an envelope, redeemed later). Research only; no code was changed. Anything I could not verify is marked **UNVERIFIED**. This is not legal or tax advice; the VAT and cancellation points need an accountant or solicitor sign-off.

## 1. What the SGS preflight check enforces

- Source: `plugins/sgs-blocks/includes/class-product-preflight.php::Product_Preflight::on_transition_post_status` and `::evaluate`.
- Trigger: any `product` post moving into `publish` whose WooCommerce type is `variable`. Simple products and every other post type are skipped (`evaluate` returns ready for non-variable products).
- On failure it immediately reverts the post to `draft` via `wp_update_post`, stores the issues in `_sgs_preflight_issues` post meta and shows an admin notice (`maybe_show_blocked_publish_notice`). A weekly cron (`run_health_cron`, up to 50 random published variable products) re-runs the same checks.
- Blocking checks in `evaluate`: WooCommerce version below minimum (`Sgs_Configurator_Compat::is_supported`), any variation priced at £0 or less, any variation with no image and no parent fallback image, lean manifest at or over 24,576 bytes, no variesBy mapping, and (only once published) an invalid ProductGroup JSON-LD.
- The variesBy check (Check 6, code `no_variesby`): it walks `$product->get_variation_attributes()`, resolves each slug with `get_term_by( 'slug', $slug, $taxonomy )`, and reads term meta `_sgs_variesby_value` through `Configurator_Meta::sanitize_variesby`. It passes if at least one term on any axis carries a non-empty mapping. It fails only when `$raw_attrs` is non-empty and no term maps.
- The allowed values are the closed enum `Configurator_Meta::VARIESBY_ENUM` in `plugins/sgs-blocks/includes/class-configurator-meta.php`: `color`, `size`, `material`, `pattern`, `suggestedAge`, `suggestedGender`. Anything else is dropped to `''` by `sanitize_variesby` (SEC-8).
- Auto-mapping: `plugins/sgs-blocks/includes/class-product-provisioning.php::map_axis_to_variesby` maps attribute names `size`, `colour`/`color`, `material`, `pattern`, `age`, `gender`/`sex` and nothing else. An axis called "Amount" or "Value" maps to `''`.
- Important precision: the enum is the schema.org / Google **structured-data** `variesBy` list for `ProductGroup` JSON-LD (`plugins/sgs-blocks/includes/class-product-schema.php`), not Google Merchant Center's feed rules. Google's structured-data page lists exactly these six values (see 2.1). The preflight message says "valid for Google Merchant", which overstates what the check proves.
- Side observations from the code, not tested live: a per-product (non-taxonomy) custom attribute never resolves through `get_term_by`, so a gift card using a local "Amount" attribute fails the check by construction; and the check is a hard blocker with no per-product opt-out, so a gift card cannot be a standard variable product in SGS today.
- No gift card code exists in `plugins/sgs-blocks/includes` (a grep for gift card / voucher finds only an unrelated mention in `class-sgs-container-wrapper.php`).

## 2. Google Merchant Center and Google structured data

### 2.1 Findings

- Gift cards are a permitted product type in Shopping ads. Google's "Unsupported Shopping content" policy has an "Open-loop gift cards" section: "Gift cards with an expiration date and that can only be redeemed at specified companies are allowed", and "Pre-paid gift cards branded by a credit card issuer are not allowed" (Mastercard, Visa, American Express). Source: https://support.google.com/merchants/answer/6150006?hl=en (fetched 2026-10-28). A closed-loop single-shop card like the client's is the allowed case.
- Wrinkle in that wording: the allowed case is described as a card "with an expiration date". Whether a non-expiring closed-loop card is accepted is **UNVERIFIED**; the safe reading is that an expiry date should exist and be shown. This interacts with decision D3 below.
- Anecdotal only: a Shopify community thread reports merchants whose business is mostly gift cards getting repeated rejections, with gift cards tolerated mainly as a supplement to a main range (https://community.shopify.com/t/google-merchant-center-wholesale-currency-unsupported-shopping-content/385263/2). Not official policy. The client sells baby food too, so this is low risk.
- A 2020 notice says Buy on Google stopped allowing gift cards from 30 September 2020 (https://pss.support.google.com/merchants/answer/10072788). Buy on Google is a different programme; treat as background only.
- `item_group_id`: groups variants; required for free listings and for Shopping ads variants in the UK, US, DE, FR, JP, BR. 1 to 50 characters, alphanumeric, underscores, dashes. Each variant keeps its own unique `id`. The page does not mention gift cards. Source: https://support.google.com/merchants/answer/6324507?hl=en (fetched 2026-10-28).
- Variant axes in the feed: Google's page does not require size or colour. It introduces `variant_option` (name:value pairs, up to 30 repeats) used with `item_group_title` and `item_group_id`, with examples such as `finish:natural` and `memory:32GB`. Every variant in a group must have the same set of names and a unique value combination. It says to still submit standard attributes (colour, size, material and so on) in addition when they apply. The page does not say whether arbitrary axes such as an amount are accepted; the examples suggest custom names are tolerated. Sources: https://support.google.com/merchants/answer/6324507?hl=en, https://support.google.com/merchants/answer/17085214?hl=en, https://support.google.com/merchants/answer/17085146?hl=en. A third-party article (https://limelightmarketing.com/blogs/google-shopping-feed-attributes-required-optional/) says these conversational attributes are optional in 2026; it is not Google documentation. A WooCommerce feature request says Google for WooCommerce did not support `variant_option` natively (undated): https://woocommerce.com/feature-request/variant_option-in-google-for-woocommerce/.
- Structured data on the page: Google's product-variants page lists exactly six `variesBy` values (color, size, suggestedAge, suggestedGender, material, pattern, as full schema.org URLs) and does not mention `additionalProperty` or gift cards. Source: https://developers.google.com/search/docs/appearance/structured-data/product-variants (fetched 2026-10-28).

### 2.2 Answer to "is amount an acceptable variant axis for gift cards?"

- Feed side: probably yes via `variant_option` (for example `amount:25`), because custom names appear in Google's examples and nothing excludes gift cards; not explicitly confirmed. **UNVERIFIED** for gift cards specifically. A cheaper, certain route is to submit each amount as its own product (own `id`, own title "Baby Shower Gift Card £25", no `item_group_id`), which needs no variant axis at all.
- Structured data side: no. `variesBy` has no amount value. Google's page offers no gift-card exception. The SGS ProductGroup emitter would have to be bypassed for gift cards (emit plain `Product` with an `AggregateOffer`, or one `Offer` per amount).
- Recommendation: do not model the gift card as a Woo variable product that has to satisfy `no_variesby`. Use a dedicated gift card product type (R1 below) that SGS exempts from the variable-product preflight and emits as `Product` with multiple `Offer`s (or a custom-amount `Offer` with a `PriceSpecification` range). **UNVERIFIED**: I did not find Google guidance on gift card structured data; test with the Rich Results Test before shipping.

## 3. UK legal and consumer requirements

### 3.1 Sources and confidence

- Expiry: no UK statute sets a minimum or maximum gift voucher life. A secondary source (Sprintlaw, published 20 July 2025) says 12 to 24 months is commonly seen as fair, an unstated expiry implies a reasonable period, and expiry terms must be clear before purchase or risk being treated as unfair under the Consumer Rights Act 2015 fairness and transparency rules: https://www.sprintlaw.co.uk/articles/understanding-gift-voucher-expiry-laws-in-the-uk-what-businesses-need-to-know. It also cites the Unfair Terms in Consumer Contracts Regulations 1999 and the Unfair Trading Regulations; those have been superseded (the 1999 regulations by the Consumer Rights Act 2015; the 2008 trading regulations by the Digital Markets, Competition and Consumers Act 2024 unfair commercial practices provisions, in force 6 April 2025, https://cms.law/en/gbr/legal-updates/the-dmcc-act-consumer-elements-come-into-force-from-6-april-2025). The source is a law-firm marketing article, not primary law. Ireland, by contrast, mandates a 5-year minimum (Consumer Protection (Gift Vouchers) Act 2019); that does not apply to UK sales.
- Terms display: expiry, balance, non-refundable and replacement-if-lost rules must be shown before purchase and on the card or its email. Basis: the transparency and fairness points above plus DMCCA misleading-omission rules. Treat as best practice with legal backing, not a prescriptive statute.
- Cancellation (14-day right under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013): **UNVERIFIED** for vouchers. My searches did not find a source stating how the 14-day right applies to a gift voucher sold at a distance. Two relevant points are established: the regulations contain an exception for goods "made to the consumer's specification or clearly personalised" (https://www.legislation.gov.uk/uksi/2013/3134/part/3, reg 28; summaries at https://sprintlaw.co.uk/articles/personalised-gifts-terms-uk/), and choosing from a standard range is not personalisation. A standard £25 printed card with no name or message on it is therefore very likely NOT within that exception; a card with a printed personal message (recipient name, baby's due date) could be. Action for the owner: confirm with Citizens Advice / Trading Standards or a solicitor before writing the refund terms. Default assumption for the build: refundable within 14 days of purchase if the card has not been redeemed or dispatched-and-personalised, which is the conservative reading.
- The redemption purchase (the baby food ordered with the card) has its own rules: perishable-goods exceptions to cancellation may apply to that order, independent of the card sale. **UNVERIFIED** in detail.
- Dispatch/delivery for the physical card: standard distance-selling delivery rules apply to the card as goods (default 30 days, risk passes on delivery). Not researched further.
- Data protection: if the sender names a recipient and enters a recipient email or address, SGS stores third-party personal data. This needs a privacy-policy line and a retention rule. General UK GDPR principle; not researched against a specific source.
- Money laundering: UK money-service rules do not apply to closed-loop, low-value cards at this scale. **UNVERIFIED**; flagged only because the cards are bearer instruments.

### 3.2 VAT (HMRC)

- Source: HMRC VAT information sheet 09/18 (published 30 November 2018, no later update shown), https://www.gov.uk/guidance/find-out-about-changes-to-vat-legislation-on-face-value-vouchers-vat-information-sheet-0918. The legislation is in Schedule 17 of the Finance Act 2019 (https://www.legislation.gov.uk/ukpga/2019/1/schedule/17/2019-02-12), which implements Council Directive (EU) 2016/1065 for vouchers issued from 1 January 2019. I could not load the current VAT Notice 700/57 itself (the URL I tried returned 404), so the sheet above is the primary source used.
- Single-purpose voucher (SPV): the place of supply and the VAT liability of the underlying goods are known at issue (one VAT rate). VAT is due when the voucher is issued and on each paid transfer; redemption is disregarded. Consequence: VAT is due at sale even if the card is never redeemed.
- Multi-purpose voucher (MPV): anything that is not an SPV. Issue and transfers are disregarded; VAT is due when the voucher is redeemed against the actual goods, on the amount charged for the most recent transfer (or face value if unknown). Unredeemed MPVs never attract VAT.
- The sheet states "a single-purpose voucher will be defined as one where the place of supply of the underlying goods or services is known" and also needs a single VAT liability. Its worked examples include a £50 garden-centre voucher redeemable for standard-rated or zero-rated goods being multi-purpose.
- Application to the bakery (inference, not HMRC guidance on this case): if the card can buy a mix of zero-rated food and any standard-rated item, it is an MPV and VAT is accounted for at redemption. If the card is redeemable only for zero-rated goods, it is arguably an SPV at zero rate and nothing changes at sale. The printed card and envelope themselves are not the supply being paid for; treat the card as a voucher, not a standard-rated stationery sale. **UNVERIFIED**: confirm with the client's accountant, including whether a delivery charge on redemption changes the answer.
- Build consequence: the system must (a) sell the card with no VAT line at sale if MPV (tax class "not taxable" or zero-rated product with no VAT on the invoice), (b) show the redemption as a payment method, not a discount, so that VAT is calculated on the full goods value at redemption (a coupon would reduce the VAT base, which is wrong for an MPV). This is a decisive technical point against coupon-based redemption; see 4.2. Make the VAT status a store setting (MPV / SPV) because it is the client's accounting decision.

## 4. WooCommerce mechanics for a native build

### 4.1 Product representation

- Option A: a custom product type (extends `WC_Product`, registered via `product_type_selector` and `woocommerce_product_class`). Pros: SGS controls the data model, can exempt it from `Product_Preflight` (which only targets `variable`), and avoids fake variation attributes. Cons: more admin UI work; third-party plugins (feeds, analytics) may not recognise the type (**UNVERIFIED** for Google for WooCommerce).
- Option B: a simple virtual/physical product plus a custom-amount input (price set from the chosen amount via a cart item data filter). Pros: simple product type is understood everywhere. Cons: the fixed amounts (£15/£25/£40) need price integrity checks so a browser cannot post an arbitrary price; the product page needs an amount-picker block.
- Option C: variable product with an "Amount" attribute. Blocked today by the preflight (section 1) and not representable in Google structured data (2.2). Not recommended.
- Recommendation: A, with product-level settings for fixed amounts and optional custom range (min/max/step), physical vs digital delivery, and expiry.

### 4.2 Redemption at cart and checkout

- Coupons API (a code backed by a hidden `shop_coupon`): simplest, works on classic and block checkout because the Store API reuses coupon logic. Drawbacks: it is a discount, so VAT is calculated on the reduced base; it cannot distinguish payment from discount in reporting; coupon restrictions (usage limits, product exclusions) are easy to misconfigure; partial balances require mutating the coupon amount after each order. Several plugins still do it (Beltoft redeems via the standard coupon field: https://cdn.jsdelivr.net/wp/beltoft-gift-cards/trunk/README.md; YITH since 3.0 can use the standard coupon field: https://yithemes.com/themes/plugins/yith-woocommerce-gift-cards/).
- Fee mechanism: a negative fee on `woocommerce_cart_calculate_fees`. That hook fires for both classic and block checkout, and the block checkout recalculates through the Store API (source: a fee plugin's readme, https://wordpress.org/plugins/payment-method-checkout-fee-for-woocommerce/, and the WooCommerce developer blog, https://developer.woocommerce.com/2022/05/20/hiding-shipping-and-payment-options-in-the-cart-and-checkout-blocks/). A negative fee is capped by the plugin vendor in that case, not by WooCommerce itself. Taxes on negative fees are taxable fees in WooCommerce by default, so a fee must be created non-taxable and VAT computed first. **UNVERIFIED** against WooCommerce source; needs a prototype.
- Payment-method style (gift card applied as payment, remaining total goes to the real gateway): the model Gifty adopted in its 2.0.0 release (https://github.com/giftyhq/plugin-woocommerce) and PW Gift Cards uses ("the balance is applied after tax", https://wordpress.org/plugins/pw-woocommerce-gift-cards/). This is the correct accounting shape for an MPV (tax computed on full goods value, card consumed as tender).
- Recommendation: store the applied card in session/cart data, subtract it as a post-tax adjustment of the amount payable (a custom total adjustment or non-taxable negative fee applied after taxes), and write a redemption ledger row at order payment. Use a real prototype on block checkout to settle which WooCommerce API does the post-tax subtraction cleanly.

### 4.3 Cart and Checkout blocks integration

- Server side: `ExtendSchema` / `woocommerce_store_api_register_endpoint_data` add namespaced data to `wc/store/cart` and `wc/store/checkout` responses; the data appears under `extensions` (https://developer.woocommerce.com/docs/apis/store-api/extending-store-api/extend-store-api-add-custom-fields/).
- Client side: block extensibility via the checkout/cart block slot-fills and the filter registry (https://developer.woocommerce.com/docs/block-development/extensibility-in-blocks/). A "redeem a gift card" input belongs in a slot inside the Cart and Checkout order summary; the apply and remove actions need a custom REST route or a Store API update callback (`wc/store/v1/cart/extensions` with `registerUpdateCallback`; the exact current names are **UNVERIFIED** here, check the docs when building).
- Product page: SGS already renders product UIs with its own blocks (`sgs/buybox`, `product-card`); an `sgs/gift-card-picker` block is the right place for the amount buttons, recipient/message fields and the physical-card option. Per the SGS rules the block needs inspector controls for every customisable property and no inline styles.
- Known risk from reviews: PW Gift Cards claims block support but two 2025 reviews (August and November) say it does not work with the Blocks checkout; this shows block support must be proved live, not assumed.

### 4.4 Codes, balances, delivery and admin

- Code generation: a random code from a cryptographically secure source (`random_bytes`), at least 80 bits of entropy (for example 16 characters of Crockford base32, grouped as XXXX-XXXX-XXXX-XXXX), no sequential or order-derived values. Store only a keyed hash (HMAC) of the code for lookup plus the last four characters for display; keep the plain code only long enough to email or print it. That means the physical-card printing step needs the plain code at fulfilment time (see D1).
- Balance storage: a custom table (not post meta) such as `{prefix}sgs_gift_cards` (id, code_hash, code_last4, initial_amount_minor, balance_minor, currency, status, expires_at, purchaser_order_id, recipient_name/email, created_at) and an append-only `{prefix}sgs_gift_card_ledger` (card_id, delta_minor, order_id, type issue/redeem/refund/adjust/expire, actor, created_at). Minor units (pence) in integers. Use `$wpdb->prepare()` throughout and a transaction (`SELECT ... FOR UPDATE`) when redeeming so two simultaneous checkouts cannot spend the same balance.
- Redemption timing: reserve the balance when the order is created (pending), consume when paid, release on cancel/failure/timeout, and restore on refund. Without reservations a card can be double-spent between cart and payment.
- Email delivery: through `wp_mail()` / `Sgs_Mailer` per SGS rules. For a digital card, email the code to the recipient on a chosen date (a scheduled action); for a physical card, no code email to the recipient, but the purchaser receives a confirmation, and the code is printed by the shop.
- Admin: list table of issued cards (search by last four, order, recipient, status), manual issue, adjust, disable, expiry change, CSV export, ledger per card, and a liability report (sum of live balances), which also feeds the accountant's VAT view.
- Security: rate-limit the redeem endpoint per IP and per session (for example 5 failed attempts in 15 minutes triggers a lockout with exponential backoff), return the same message for invalid, expired and unknown codes to avoid enumeration, compare hashes with `hash_equals`, nonce and capability checks on every REST route (SGS rule), log failed attempts, and never include the code in URLs, logs or analytics. Source for the 80-bit guideline is general practice; I did not cite a standard.

## 5. How the leading plugins model it

| Plugin | Physical vs digital | Partial balance | Expiry | Block checkout | Redemption model | Notes |
|---|---|---|---|---|---|---|
| WooCommerce Gift Cards (official, v2.9.1) | Digital only; "does not issue physical cards" | Value applied, unused amount carries over | Per card, counted from delivery date, varies by product | Cart and Checkout blocks listed as compatible | Code field at cart/checkout, balance on account | Issued/used/expired reports; CSV import/export cannot sync or update existing codes; £61 per year; requires WooCommerce 11.1+. Source: https://woocommerce.com/products/gift-cards/ (fetched 2026-10-28) |
| PW WooCommerce Gift Cards (free, v2.54) | Free: digital by email; Pro imports existing physical card numbers | Not explicit; new balance shown at cart/checkout | Pro only | Listed as supported; two 2025 reviews say it fails | Balance applied after tax; guests can redeem | Pro adds liability view, adjustments, REST API. Source: https://wordpress.org/plugins/pw-woocommerce-gift-cards/ |
| YITH Gift Cards | Both: printed and shipped, emailed, PDF | Yes, premium option to pay when balance does not cover the total | Global months or per-product date | Not mentioned on the page | Separate form, or the standard coupon field since 3.0 | Bulk creation, CSV, balance editing, sender notices, min cart and category exclusions. Source: https://yithemes.com/themes/plugins/yith-woocommerce-gift-cards/ |
| Smart Coupons (WooCommerce) | Store-credit coupons | Yes, via coupon balance | Coupon expiry | **UNVERIFIED** | Coupon | Not researched beyond YITH's note that it can convert Smart Coupons store credit into gift cards |
| Gifty / Beltoft (third parties) | Digital | Yes | Varies | **UNVERIFIED** | Gifty applies cards as payment (since 2.0.0); Beltoft via coupon field | https://github.com/giftyhq/plugin-woocommerce, https://cdn.jsdelivr.net/wp/beltoft-gift-cards/trunk/README.md |

### Copy

- A dedicated card record with its own balance and an append-only history (official extension: transaction log; YITH: redeemed amount, order and remaining balance shown per card).
- Expiry counted from delivery or purchase and shown on the card (official extension, YITH).
- Admin search by code, sender and recipient, plus liability reporting (official, PW Pro).
- Gift-card-only orders auto-complete (YITH); a physical card order must NOT auto-complete because it needs dispatch.
- Scheduled delivery of the recipient email (official).

### Avoid

- Selling variable products with an "amount" attribute (blocked by preflight and unsupported by Google structured data).
- Coupon-only redemption for an MPV (wrong VAT base, section 3.2).
- Claiming block checkout support without a live test (PW reviews).
- Import/export that cannot update existing cards (official extension limitation reviewers flagged).
- Annual licence lock-in is irrelevant to a native build, but the official plugin being digital-only is exactly why the client's physical card needs custom fulfilment.
- Lost-card handling is undocumented in all sources I read; define it explicitly in terms (D4).

## 6. Proposed minimal SGS requirements

1. **Gift card product type.** A dedicated type with fixed amounts and an optional min/max/step custom amount. Why: avoids the variesBy preflight block and a fake variation attribute, and fixes the price server-side.
2. **Preflight exemption and schema.** `Product_Preflight` skips the gift card type; `Product_Schema` emits `Product` with one `Offer` per amount (not `ProductGroup`). Why: the six-value enum has no amount axis and Google gives no gift-card exception.
3. **Feed handling.** The product feed (`class-product-feed*.php`) emits each amount as its own product with its own `id`, or a `variant_option` group (`amount:25`) behind a setting, and always carries an expiry mention in the description. Why: closed-loop cards with an expiry are the explicitly allowed Shopping case; per-amount products need no unverified axis.
4. **Card ledger tables.** `sgs_gift_cards` and `sgs_gift_card_ledger` as in 4.4, integer pence, row lock on redemption. Why: auditable balances and safe partial redemption.
5. **Code generation and storage.** At least 80 bits of random entropy, HMAC hash for lookup, last four stored, plain code retained only until issued. Why: brute-force resistance and breach safety.
6. **Redemption as tender, not discount.** Applied after tax; shown as a line on cart, checkout, order and email; works on the Cart and Checkout blocks via Store API extension data plus slot-fill UI. Why: correct MPV VAT base and works on the only checkout SGS targets.
7. **Reservation and restore.** Balance reserved at order creation, consumed on payment, released on cancel or failure, restored on refund. Why: no double-spend.
8. **Redemption security.** Rate limiting, uniform error messages, `hash_equals`, nonce and capability checks. Why: SGS non-negotiables and bearer-instrument risk.
9. **Purchase-time fields.** Recipient name, optional message, sender name, delivery method (post physical card / email), and for email a chosen send date. Why: matches the client's "printed card in an envelope" and the digital alternative.
10. **Physical fulfilment path.** Order stays processing until the shop marks the card posted; admin prints a card sheet with the plain code (or the shop writes it by hand). Why: no plugin in the review set handles this natively.
11. **Expiry and terms.** Store-level expiry setting (months, or none), shown on the product page, the checkout, the confirmation email and the card; terms page snippet covering expiry, non-refundable-after-use, lost cards and the 14-day cancellation position. Why: Google's allowed-case wording and the UK transparency requirement.
12. **VAT mode setting.** MPV (default) or SPV, switching the sale's VAT treatment; redemption always computes VAT on the full goods value. Why: the client's accountant decides; code must not hard-wire it.
13. **Admin.** List, search, view ledger, issue manually, adjust balance with a reason, disable, change expiry, export CSV, liability total. Why: the shop needs to answer "where did the £25 go" without a developer.
14. **Emails.** Purchaser confirmation, recipient delivery (digital), "card redeemed / balance remaining" notice, and expiry reminder (optional), all through `Sgs_Mailer`. Why: SGS email rule.
15. **Account and checkout UX.** Balance lookup for a code (rate limited) and "apply gift card" on Cart and Checkout; logged-in users can save cards to an account (optional). Why: partial balances only help if the customer can see what is left.
16. **Tests and gates.** PHPUnit for ledger maths and concurrency, a live block-checkout check at 375/768/1440, `audit-inline-styling.js --check`, and a Rich Results Test pass for the product page. Why: green builds do not prove checkout works (SGS verification rule).

## 7. Open decisions for the owner

- **D1. Physical card fulfilment.**
  - Options: (a) a code is printed by the shop onto the card when the order arrives (needs a print sheet from admin and a manual step); (b) the card is pre-printed with pre-generated codes in a stock book, the shop picks the next card and scans/enters the code to link it to the order; (c) no physical card, email PDF only.
  - Recommendation: (b) for volume, (a) while volume is small. Needs the code stored retrievably until printed, which weakens "hash only" storage until the card ships. Decide who prints and when.
- **D2. Partial redemption.**
  - Options: (a) allow partial use, balance remains; (b) single-use, any remainder is forfeited; (c) partial allowed, but only when the order is at least the card value.
  - Recommendation: (a). Single-use forfeiture invites complaints and, under the MPV rules, the unused value is never a VAT event anyway, so there is no tax gain from forfeiting. The client's line "She redeems it once baby arrives" suggests one order, but partial use is a safer default.
- **D3. Expiry policy.**
  - Options: (a) 12 months; (b) 24 months; (c) no expiry.
  - Recommendation: 24 months from purchase, shown everywhere. It fits Google's "with an expiration date" wording, sits at the upper end of the commonly cited fair range, and suits a baby shower where the baby may arrive months later. No expiry is legal in the UK but risks the Google acceptance wording (UNVERIFIED) and leaves permanent liability.
- **D4. Refunds and lost cards.**
  - Options: (a) refund within 14 days if unused (conservative reading of the distance-selling rules); (b) no refunds at all; (c) refund only for unused, un-personalised cards.
  - Recommendation: (c), subject to a solicitor or Citizens Advice check of how the 14-day right applies to vouchers (UNVERIFIED). Lost physical cards: replace once, only with proof of purchase, and disable the old code.
- **D5. VAT treatment.**
  - Options: (a) treat as multi-purpose (VAT at redemption); (b) treat as single-purpose zero-rated if redeemable only on zero-rated food.
  - Recommendation: ask the client's accountant first; build the setting so either works (R12). Expect (a) unless the shop sells anything standard-rated.
- **D6. Amounts.**
  - Options: (a) fixed £15 / £25 / £40; (b) fixed plus a custom amount within a range (for example £10 to £100); (c) only custom.
  - Recommendation: (a) plus (b) behind a toggle, default off, matching the design as given.
- **D7. Digital option.**
  - Options: (a) physical only (the design); (b) physical plus an emailed version for last-minute gifts.
  - Recommendation: (a) at launch, designing the data model so (b) is a later switch (R9 already carries the delivery method).
- **D8. Combination rules.**
  - Options: allow gift card plus coupon code on the same order; allow a gift card to pay for another gift card; allow it for delivery charges.
  - Recommendation: allow coupon plus card, forbid buying a gift card with a gift card (avoids laundering and VAT oddities), allow delivery charges.
- **D9. Google Merchant listing.**
  - Options: list the gift card in the feed (free listings and Shopping ads); keep it out of the feed and sell it only on-site.
  - Recommendation: list it as a separate product per amount, and check the first Merchant Center review before adding any variant markup.

## 8. Items I could not verify

- Whether Google accepts a non-expiring closed-loop gift card (the policy only states the expiring case is allowed).
- Whether `variant_option` with an amount axis is accepted for a gift card; no gift-card statement in Google's pages.
- Gift card structured-data guidance from Google (none found).
- How the 14-day cancellation right applies to gift vouchers sold online; no primary source found.
- The current text of HMRC VAT Notice 700/57 (the sheet 09/18 from 30 November 2018 was used instead; the notice URL I tried returned 404).
- WooCommerce Store API specifics for post-tax subtraction, update-callback names and negative-fee tax behaviour (needs a prototype and a read of the current developer docs).
- Whether Google for WooCommerce and other feed tools recognise a custom product type.
- Block checkout support status of Smart Coupons, Gifty and Beltoft.
- Anything about the live behaviour of the plugins; I read listings and docs, not the code.

## Sources

- https://support.google.com/merchants/answer/6150006?hl=en
- https://support.google.com/merchants/answer/6324507?hl=en
- https://support.google.com/merchants/answer/17085214?hl=en
- https://support.google.com/merchants/answer/17085146?hl=en
- https://developers.google.com/search/docs/appearance/structured-data/product-variants
- https://pss.support.google.com/merchants/answer/10072788
- https://community.shopify.com/t/google-merchant-center-wholesale-currency-unsupported-shopping-content/385263/2
- https://limelightmarketing.com/blogs/google-shopping-feed-attributes-required-optional/
- https://woocommerce.com/feature-request/variant_option-in-google-for-woocommerce/
- https://www.gov.uk/guidance/find-out-about-changes-to-vat-legislation-on-face-value-vouchers-vat-information-sheet-0918
- https://www.legislation.gov.uk/ukpga/2019/1/schedule/17/2019-02-12
- https://www.legislation.gov.uk/uksi/2013/3134/part/3
- https://www.sprintlaw.co.uk/articles/understanding-gift-voucher-expiry-laws-in-the-uk-what-businesses-need-to-know
- https://sprintlaw.co.uk/articles/personalised-gifts-terms-uk/
- https://cms.law/en/gbr/legal-updates/the-dmcc-act-consumer-elements-come-into-force-from-6-april-2025
- https://woocommerce.com/products/gift-cards/
- https://wordpress.org/plugins/pw-woocommerce-gift-cards/
- https://yithemes.com/themes/plugins/yith-woocommerce-gift-cards/
- https://github.com/giftyhq/plugin-woocommerce
- https://cdn.jsdelivr.net/wp/beltoft-gift-cards/trunk/README.md
- https://developer.woocommerce.com/docs/apis/store-api/extending-store-api/extend-store-api-add-custom-fields/
- https://developer.woocommerce.com/docs/block-development/extensibility-in-blocks/
- https://developer.woocommerce.com/2022/05/20/hiding-shipping-and-payment-options-in-the-cart-and-checkout-blocks/
- https://wordpress.org/plugins/payment-method-checkout-fee-for-woocommerce/
