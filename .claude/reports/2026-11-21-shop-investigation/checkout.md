# Checkout page: findings (2026-11-21 night)

- Mama's: far from passing, and tonight's rebuild did not happen. Propose refused the checkout template (checkout-1), so `local-mediatest-trlab` still serves the 2026-11-19 template; part-look then wrote 211 values onto the page. Beside the draft at 1440 the page is 200px wider with the wrong column split (checkout-5), the labels float inside the fields, the delivery dots sit on top of their words, the chosen delivery tile is not filled, and the pay button is 48px tall where the draft's is 66px.
- Eye Care: far from passing. The rebuild passed (template 465, 21:11), and the order summary now sits beside the form at 1440. Part-look pairs only 42 of 112 parts with the draft, and the parts it misses are the ones Bean would see (checkout-2): the step titles and numbers, the delivery tiles, the pay button, the terms line and the summary's Edit link. The site's "small" type size is 9.5px, so every WooCommerce secondary line, error messages included, prints at 9.5px (checkout-4). The page also has no h1 (checkout-9).
- 19 findings. The worst four: checkout-1 (Mama's cannot be rebuilt), checkout-2 (Eye Care's looks are not read), checkout-3 (no route step builds the checkout's own words and steps on either client; Mama's from-blank page shows the hand-built page's leftovers) and checkout-4 (Eye Care text at 9.5px).

## How to read this

- "Hand-finished" means Mama's mirror `local-mamas` (values read) or Eye Care's hand-built `eye-care-test` (setting NAMES only, read over `ssh hd` with `checkout/parts.php`, per Bean's rule; every Eye Care value below comes from the draft). Note: `local-eye-care` mirrors `eye-care-clone-test`, not `eye-care-test`, so it was not used as the hand-finished reference (its checkout template is an old static imitation built from `sgs/form-field-*` blocks).
- "From blank" means the scratch copies `local-mediatest-trlab` (Mama's, port 8121) and `local-mediatest-trec` (Eye Care, port 8125).
- Build state when checked (22:05): `eye-care-ward-end-template-checkout.log` exit=0 (template `checkout` post 465 modified 21:11:53); `eye-care-ward-end-pl-checkout.log` exit=0 (report `sites/eye-care-ward-end/build/qa/part-look/20261121T215949Z`, 141 values written to post 8); `mamas-munches-redesign-template-checkout.log` exit=1 (template `checkout` post 6000 still modified 2026-11-19 19:37:38); `mamas-munches-redesign-pl-checkout.log` exit=0 (report `sites/mamas-munches-redesign/build/qa/part-look/20261121T214809Z`, 211 values written to post 102).
- Mama's from-blank checkout page is not truly blank. The lab strip step (`E:\sgs-tmp\template-rework\lab\strip-shop.php`) removed only the look settings that `look-attrs.json` lists for `woocommerce/cart`, `woocommerce/checkout` and `sgs/account`. It left the page's hand-built inner blocks, their words, `sgsCheckoutStrings`, and every setting on the inner `sgs/gift-order` and `sgs/commerce-note`, all byte-identical to `local-mamas` (`checkout/attrs-trlab-after.json` against `checkout/attrs-local-mamas.json`). See checkout-3.

## Findings

### checkout-1: Mama's checkout template was not rebuilt tonight: propose refused it, so the page still runs the 2026-11-19 build
- Clients and widths: Mama's, all widths.
- Evidence: `logs/mamas-munches-redesign-template-checkout.log`: `FAIL template-checkout propose 2s - 2 proposal problems: paint conservation: 1 painted element kept-unnamed (no rule) no node reads and no record carries: Root/6#0 background; ... host-unread (no rule, host sgs/text) ... Root/13#0 glyph`, then `exit=1`. Proposal `sites/mamas-munches-redesign/build/skeleton/template-checkout.proposal.json` (21:33): `problems` holds those two lines, `templatePieces.placed` = layout (`core/post-content` at Root/17#0, run [Root/17#0]) and frame (`core/template-part` at Root/7#0, no `run`), and `missingFeatures` holds 61 rows.
  - Root/6#0 is the draft's page wrapper, `<div data-screen-label="Checkout" style="background:#FBF3DC;min-height:100vh">`, whose children are the top bar (Root/7#0) and `<main>` (Root/16#0) (inventory). The skeleton's roots are the header container and the main container, so Root/6#0 is not in the tree. Its background is the body's own (`body{background:#FBF3DC}` in the draft's `<style>`).
  - Root/13#0 is the lock `<svg>` (stroke currentColor) inside "Secure checkout" (Root/12#0) in the checkout's own top bar. The skeleton makes Root/12#0 an `sgs/text` (`{"text":"Secure checkout"}`), which has no icon, so the glyph is unread.
- Cause: proved. (1) `scripts/computed-route/lib/template-piece-frame.mjs::place` drops the page wrapper ("the page wrapper that held both is dropped: it is the page itself", its header comment). Its placed row carries no `run` (tonight's `0049a1680` lists the frame piece among those that "replace no draft element"), so `lib/template-pieces-context.mjs::piecesPaint` leaves the wrapper's background to paint conservation, which reports it. (2) No skeleton rule turns a single label with a leading icon in a page's own top bar into a block that draws the icon. Neither line was present when `0049a1680`'s offline propose ran on the lab's older records ("Mama's checkout loses its one problem (Root/19#0...)"). Tonight's fresh inventory (21:33) records the svg's markup (`svg` field, from `818b734d4`'s `svgMarkupOf`), and paint conservation counts its stroke as a `glyph` look (`lib/skeleton-paint-conservation.mjs`, `'svg' === tag && [ 'stroke', 'fill' ]...`).
- Layer and owner: (1) route piece (this stream: `template-piece-frame.mjs`); (2) route rule (general session: the checkout's own top bar is a header surface).
- Fix: (1) `template-piece-frame.mjs::place` puts the dropped wrapper's key in its placed row's `run` when it drops the wrapper, or records the wrapper's background as covered when it equals the page background the snapshot sets. (2) A rule for "words with a leading glyph" in a header row (an `sgs/text`-with-icon equivalent, or `sgs/icon-list` with one item, or `sgs/label` with icon), as `818b734d4` did for a run of labels (`rules.headerStripBar`).
- Size: (1) S; (2) M.
- Depends on: nothing.
- Verify by: `clone-surface.mjs mamas-munches-redesign --surface template-checkout --site local-mediatest-trlab` ends `every stage ran and passed`; the template's modified time is today's; the "Secure checkout" lock shows at 1440 and 375.
- Same cause elsewhere: Mama's `template-cart` also refused tonight (`logs/mamas-munches-redesign-template-cart.log`: Root/12#0 and 7 state-only elements, a different cause; see basket.md). Any page whose wrapper the frame piece drops while the wrapper paints a background faces (1); Mama's other slim-bar pages are the likely ones (not checked here).

### checkout-2: Eye Care's part-look finds less than half the checkout's parts in the draft, so the visible looks are neither written nor checked, while its report says 585 of 644 match
- Clients and widths: Eye Care, all widths.
- Evidence: report `20261121T215949Z/report.md`: "Parts located: 42 of 112 parts that have settings; look-table rows paired 28 of 80"; 40 parts are "Unpaired (a locator, no draft element)", among them `step`, `step-title`, `step-heading`, `option`, `option-chosen`, `shipping-option`, `shipping-label`, `shipping-secondary`, `shipping-description`, `radio-labels`, `radio-descriptions`, `primary-button`, `place-order-label`, `place-order-text`, `terms`, `login-prompt`, `field-label`, `summary-edit`, `coupon-*`, `notice`, `delivery-card-title`, `delivery-card-description`. 27 more have no locator, among them `step-number`, `create-account-label`, `line-item-brand`/`item-brand`, `summary-fill` and `express-content`. "Verified on the live page" compares 644 pairs (585 match, 59 differ), all on the 42 paired parts. Live (`shots/checkout/ec-clone.json`, `checkout/radio.mjs`): step titles are "Contact information" in Playfair at 20px, where the draft has a Playfair "1" at 22px and "CONTACT" at 13px, 2.6px tracking, uppercase (`shots/checkout/ec-draft.json` headings). The delivery choices are two stacked full-width rows with 9.5px words, where the draft has two 320 by 80px tiles side by side with 16px words. The pay button reads "PLACE ORDER", centred, 52px. The draft's reads "PAY NOW" on the left and "£428" on the right, 56px.
  - What became of the woo-layout piece's 40 recorded missing features (proposal `sites/eye-care-ward-end/build/skeleton/template-checkout.proposal.json` 21:10, `templatePieces.missingFeatures`; every row's `part` is null, so none is tied to a part-look part):
    - The form inputs (Root/754, 755, 784 to 788, 808 to 810): paired as `field-input` and written; the label mode is checkout-7.
    - The aside (Root/815) and the totals lines (Root/831, 838): `summary` and `totals-*` are paired and written; the inner border box is checkout-10.
    - The delivery tiles (Root/771 to 778), the pay button (Root/811), "Sign in" (Root/765), the secure-payment line (Root/814) and "Edit" (Root/818): their parts are all unpaired, so nothing is written or verified.
    - The create-account row (Root/757 to 759): `create-account-label` has no locator; the copy draws no such row anyway (checkout-14).
    - The wallet buttons and the "or pay by card" divider (Root/742 to 749): no gateway on the copy (checkout-15).
    - Layout-only rows (Root/740, 753, 783, 807, 816, 832, 835): the block's own layout.
  - Instance conflicts, so nothing written: `line-item-name` pairs both the brand line ("RAY-BAN", 11px, uppercase, `#77716A`) and the name (14px, `#141414`), so its colour, family, size, weight, spacing and case conflict. `line-item-variant` and `totals-item` conflict the same way.
- Cause: proved (the report's lists). Part-look's `wc` locators (`scripts/computed-route/data/part-locators.json`, `groups.wc.parts`) describe a draft shaped like Mama's: labelled `<fieldset>` steps, radio rows and a submit button. Eye Care's draft draws each step as a `<section>` with an `<h2>` holding a number span, the delivery choice as two `<button onClick>` tiles, and the pay button as a `<button onClick="{{ placeOrder }}">` with no `type=submit` (`Eye Care Birmingham.dc.html` lines 1530 to 1625). The item's brand line has no locator of its own, so it falls into `line-item-name`.
- Layer and owner: part-look (this stream).
- Fix: in `data/part-locators.json` `groups.wc.parts`, locate by role and logic, not tag: a step is a section-level element whose first child is a heading and that holds entry fields or choice controls; a step number is a heading's leading short numeric child; a delivery option is any control whose handler sets the method state the summary's shipping line reads, chosen or not by its painted state (also fixes checkout-6's chosen conflict); the pay button is the form column's last full-width control whose handler is the place-order effect (`lib/shop-parts-logic.mjs::effectOf`); `line-item-brand` is the item's first, uppercase, smaller text line. Then the report counts unpaired parts as "not verified", not as silent omissions.
- Size: L.
- Depends on: nothing (checkout-3 supplies the words the steps and button show).
- Verify by: `part-look.mjs --client eye-care-ward-end --surface checkout --site local-mediatest-trec` (report only) lists `step-title`, `step-number`, `option`, `option-chosen`, `primary-button`, `terms` and `line-item-brand` as paired. After `--write --verify`, the 1440 and 375 pairs show "1 CONTACT", two delivery tiles side by side, and "PAY NOW · £428" split.
- Same cause elsewhere: the account and basket surfaces read with the same `wc` group (basket.md's drawer findings); Mama's checkout pairs 74 of 112 parts and is far better covered.

### checkout-3: No route step builds the checkout's own words and steps: step titles and numbers, the pay button's words, the summary's words, which WooCommerce steps show, and the extra blocks the draft draws
- Clients and widths: both, all widths.
- Evidence: `grep -rln "placeOrderButtonLabel\|contact-information-block\|sgsCheckoutStrings\|showFormStepNumbers" scripts/computed-route/lib scripts/computed-route/*.mjs` finds nothing (only `data/capabilities.json` names them). `grep -rln "commerce-note\|gift-order" scripts/computed-route/lib` finds only `template-piece-gift.mjs`, which places a gift choice after a product page's buy box. No WooCommerce checkout option is written either (`grep -rn "enable_signup_and_login_from_checkout\|checkout_phone_field"` in the route: nothing).
  - Eye Care from blank (`checkout/attrs-trec-after.json`): WooCommerce's default inner blocks with no titles and no `placeOrderButtonLabel`. The live page shows "Contact information", "Shipping address", "Shipping options", "Payment options", "Add a note to your order", "Place Order" and "Order summary". The draft shows "1 Contact", "2 Delivery", "3 Payment", "Pay now £428", "Your bag" with "Edit", the Klarna line and "Secure payment. Prescription details are held under UK GDPR and seen only by me." The hand-built `eye-care-test` (names only, `checkout/parts-eye-care-test-names.json`) puts its checkout content in a template part `sgs-checkout-content`: `woocommerce/checkout` with `showFormStepNumbers`, `sgsCheckoutStrings`, `sgsSummaryEditLinkLabel`, `sgsItemShowBrand`, titles on the contact, shipping-methods, shipping-address and payment blocks, `placeOrderButtonLabel` with a `className` on the actions block, plus `sgs/pay-later-message` and `sgs/commerce-note`. The from-blank page holds none of these.
  - Eye Care's copy has `woocommerce_enable_signup_and_login_from_checkout` = no, so no "Create an account" line shows; the draft draws one for a guest (`coGuest`).
  - Mama's from blank shows the draft's words ("1 · Your details", "Pay", the allergen note, the gift step) only because the strip step left the hand-built page content (see "How to read this"). A truly blank Mama's checkout would show WooCommerce's defaults, as Eye Care's does.
- Cause: proved (the greps above; the template piece `lib/template-piece-woo-layout.mjs::place` places `core/post-content` and leaves the page's Checkout block as it is; part-look writes only look settings).
- Layer and owner: route piece (this stream): a checkout content piece, the counterpart of the account piece.
- Fix: a `woo-content` step for the checkout page, run with the template piece. From the woo-layout piece's own classification of the form column (its `classifyParts` and `headOf` already tell form, summary, express group and divider apart), write onto the page's `woocommerce/checkout`:
  - each step's title from the draft's step heading, and `showFormStepNumbers` when the heading leads with a number;
  - `placeOrderButtonLabel`, and the with-price style when the button shows the total;
  - `sgsCheckoutStrings` (summary title, email label, express divider words) and `sgsSummaryEditLinkLabel`; `sgsItemShowBrand` when the line shows a brand;
  - remove the order-note block when the draft draws no note field;
  - place `sgs/commerce-note` for a plain note line in the form column, `sgs/pay-later-message` for a pay-later line in the summary, and `sgs/gift-order` where the draft's form holds a recipient choice;
  - set the WooCommerce checkout options the draft implies (account creation at checkout when the draft draws "Create an account"). Re-run the lab with a strip that also clears those inner blocks, so the test is really from blank.
- Size: L.
- Depends on: nothing; checkout-2's locators then style what this places.
- Verify by: on a copy whose checkout page holds WooCommerce's default block, the route's run gives Eye Care "1 CONTACT / 2 DELIVERY / 3 PAYMENT", "PAY NOW … £428", "YOUR BAG · Edit", the Klarna line and the secure-payment line, and gives Mama's its four numbered titles, gift step and allergen note.
- Same cause elsewhere: the basket page's words and the account page's tabs (basket.md, account.md); the order confirmation's lines.

### checkout-4: Every WooCommerce secondary line on Eye Care's checkout prints at 9.5px, error messages included
- Clients and widths: Eye Care, all widths.
- Evidence: computed on `/checkout/` at 1440: the shipping option label, price and description, the payment label, the guest notice, the coupon toggle, the address-2 toggle and the terms line are all 9.5px (`checkout/radio.mjs`, inline probe). Validation messages are `rgb(204, 24, 24) | 9.5px` (`shots/checkout/ec-clone.json` `afterSubmit.message`; picture `shots/checkout/ec-clone-375-error.png`). Eye Care's snapshot sets `{"slug":"small","name":"Size 9 5","size":"9.5px"}` (`sites/eye-care-ward-end/theme-snapshot.json`), and the live page prints `--wp--preset--font-size--small: 9.5px`. WooCommerce's `assets/client/blocks/checkout.css` uses `var(--wp--preset--font-size--small,14px)` 36 times. Mama's small preset is 13px, so its messages are 13px.
- Cause: proved. The token step names the site's smallest draft size (9.5px, the "SOON" chip) as the theme's `small` preset, and WooCommerce's checkout takes `small` for every secondary line. The draft's own secondary lines are 12.5 to 14px.
- Layer and owner: theme tokens (the snapshot extraction, general session); part-look softens it once checkout-2 pairs `shipping-label`, `radio-labels`, `terms` and the rest. Error text has no setting at all: block setting gap (plugin round: `woocommerce/checkout`, part "validation message", font size and colour; the framework database has no checkout attribute named like Error or Validation, and Mama's hand-built page needed Custom CSS `.wc-block-components-validation-error{font-size:14px}` for it).
- Fix: the snapshot's `small` preset should be the draft's most used small body size (12.5 to 14px here), never a one-off chip size, or the commerce look should pin WooCommerce's small text to a readable floor. Add an error-message type setting to the commerce look (`selectors.json` row for `.wc-block-components-validation-error`).
- Size: M (a token change touches every Eye Care page using `small`: run render-scope).
- Depends on: nothing.
- Verify by: computed font size of `.wc-block-components-validation-error` and `.wc-block-components-radio-control__label` at least 12.5px on `/checkout/` at 375 and 1440.
- Same cause elsewhere: every Eye Care WooCommerce block (basket drawer, account forms, order confirmation) and any core block using `has-small-font-size`.

### checkout-5: Mama's checkout is 200px wider than the draft and splits its columns 960/360 instead of 643/477
- Clients and widths: Mama's, 1440 (and 768, where the block is also wider).
- Evidence: `shots/checkout/mm-clone.json` at 1440: the block spans 40 to 1400 (1360 wide), the main column is 960 and the summary 360. In the draft the grid is `max-width:1160px;margin:0 auto` with `1.35fr 1fr` and a 40px gap: 643 and 477. The hand-finished mirror measures 140 to 1300, 643 and 477 exactly (`shots/checkout/mm-hand.json`), using the template main's `maxWidth` 1240px with 40px padding and `sgsSidebarWidth` 477px. The from-blank template's main is `contentWidth: full` with no `maxWidth` (`checkout/attrs-trlab-after.json`), and its checkout block has no `sgsSidebarWidth`. Picture `shots/checkout/pair-mm-1440.png`.
- Cause: proved. (1) The 1160px cap and centring are painted on the commerce region (Root/17#0, the grid), the element `core/post-content` stands for (`template-piece-woo-layout.mjs::place`, `draftStandsFor`). `core/post-content` has no width setting, and the cap is in neither the missing-feature list (which lists elements inside the run, not the run's own element) nor the Fill report (`qa/fill/template-checkout/2026-11-19T19-34-40`: only the header's inner gets `maxWidth 1160px`, `cr-ref-template-checkout-1`). (2) Nothing in the route writes `sgsSidebarWidth` (`grep -rn SidebarWidth scripts/computed-route/lib scripts/computed-route/data` outside `capabilities.json`: nothing), although the plugin prints it (`plugins/sgs-blocks/includes/woocommerce/commerce-look/summary.php`, the `sgsSidebarWidth` branch), so WooCommerce's own 65/35 split stays.
- Layer and owner: route piece and part-look (this stream).
- Fix: `template-piece-woo-layout.mjs::place` keeps the region's own box: wrap `core/post-content` in an `sgs/container` carrying the region's max-width and centring, or hand the region's max-width to the main container's `maxWidth`. Part-look (or the piece) writes `sgsSidebarWidth` from the region's summary track, measured at each width where the region is two columns.
- Size: M.
- Depends on: checkout-1 for Mama's (the template must rebuild).
- Verify by: on Mama's at 1440 the checkout block measures 1160 wide, the main column 643 and the summary 477 (±2px).
- Same cause elsewhere: Mama's basket (the same region shape); Eye Care is unaffected because its cap sits on `<main>` (1200px), which the template keeps (block 1096, main 664 and summary 384 against the draft's 648 and 400).

### checkout-6: Delivery choices: Mama's radio dots sit on the words and the chosen tile is not filled; Eye Care's are two stacked full-width rows of tiny type instead of two tiles side by side
- Clients and widths: both, worse at 375 (Mama's "Royal Mail Tracked 48" reads "yal Mail", wrapping onto two lines).
- Evidence: Mama's (`checkout/radio.mjs` on port 8121): the option label has padding `10px 16px 10px 16px`; WooCommerce's radio input is `position:absolute` at 18 to 38px; the label text starts at 18px, so the dot covers the first letters. The chosen and unchosen tiles both have a transparent background and no shadow. Hand-finished mirror (port 8084): padding `13px 16px 13px 50px`, the text at 52px, the chosen tile `rgb(252, 235, 190)` with a `4px 4px 0 0` cocoa shadow. Part-look report `20261121T214809Z`, "Instance conflicts (nothing written)": `option sgsOptionBackground: 1440px "#FCEBBE" vs "#FFFFFF"` and the same for `sgsOptionShadow`. The draft draws the dot as a grid child (`grid-template-columns:auto 1fr auto;gap:12px;padding:10px 16px`), so 16 + 22 + 12 = 50px is where its words start. Eye Care: see checkout-2 (`option`, `shipping-option`, `shipping-label` unpaired) and checkout-4 (9.5px).
- Cause: proved. (1) Part-look copies the draft tile's own `padding-left` (16px) into `sgsOptionPadding`, but WooCommerce draws its dot absolutely inside that padding, while the draft's dot takes its own grid column. (2) The `option` locator matches the chosen and unchosen tiles alike, so their differing fills conflict and neither is written; `option-chosen` never gets the chosen look.
- Layer and owner: part-look (this stream).
- Fix: (1) In `lib/fill-part-look.mjs`, for a choice tile whose draft dot is an in-flow child, write the option's left padding as the offset of the tile's text from the tile's left edge (50px here), not the tile's padding. (2) Split the locator by the tile's state: an element with `aria-pressed="true"`, or painted differently from its siblings in a loop, is `option-chosen`. Write `sgsOptionChosenBackground`, `sgsOptionChosenShadow` and the colour from it, and `option` from the rest.
- Size: M.
- Depends on: checkout-2 for Eye Care.
- Verify by: on Mama's at 375 and 1440, the shipping label's left edge is at least 8px right of the radio's right edge, and the chosen tile is `#FCEBBE` with a 4px 4px shadow.
- Same cause elsewhere: Mama's payment method tiles (same padding, label at 16px over the dot at 16 to 36px); the basket's shipping chooser if shown. Not a route fault: the draft's "Arrives 2–3 days after the bake" lines do not exist in WooCommerce's rates (the hand-finished site shows none either: `radio.mjs` `desc: null` on port 8084), so they are a framework gap (a shipping-rate description) rather than a clone fault.

### checkout-7: Field labels float inside the boxes, and "Country/Region" overlaps "United Kingdom (UK)"
- Clients and widths: both, all widths (Mama's draft puts every label above its field; Eye Care's draft has placeholders and no labels).
- Evidence: `shots/checkout/mm-clone.json` and `ec-clone.json` `fields`: `labelAbove: false, labelInside: true` for every field, and input `padding-top: 0px`. On the hand-finished mirror the labels sit above (`mm-hand.json`: `labelAbove: true`), from `sgsFieldLabelPosition: "above"` (`checkout/attrs-local-mamas.json`), which the from-blank page lacks. The overlap is visible in `pair-mm-1440.png`, `pair-ec-1440.png` and the 375 pairs.
- Cause: proved for the missing mode: `sgsFieldLabelPosition` exists (`plugins/sgs-blocks/includes/woocommerce/commerce-look/fields.php`, the `'above' !== ( $attrs['sgsFieldLabelPosition'] ?? '' )` check; roster enum `above`, `floating`), and no route file writes it (`grep -rn FieldLabelPosition scripts/computed-route/lib`: nothing). Hypothesis for the overlap: part-look writes the draft's input padding (`0 14px` / `0 16px`) into `sgsFieldInputPadding`, leaving no top room for WooCommerce's floated label above a filled value (the country select always holds a value). To prove it, set the padding back to WooCommerce's default on a copy of the page and see the overlap go.
- Layer and owner: part-look (this stream).
- Fix: part-look writes `sgsFieldLabelPosition: above` when the draft's label element sits above its input (Mama's). When the draft has no label and uses a placeholder (Eye Care), it keeps `floating` and does not write a zero top padding into `sgsFieldInputPadding` (or writes it only with `above`).
- Size: S.
- Depends on: nothing.
- Verify by: on Mama's every checkout label's bottom is at or above its input's top; on both, the country select's label and value boxes do not overlap at 375 and 1440.
- Same cause elsewhere: the basket's coupon field and the account forms (lab-findings "WooCommerce's floating labels" rows).

### checkout-8: The pay button: Mama's is 48px tall with "Pay · £13.45"; Eye Care's says "PLACE ORDER" centred
- Clients and widths: both, all widths.
- Evidence: Mama's live button is 48px tall (`mm-clone.json` `placeOrder.look.height`); the draft's is 66px (`height:66px` inline; part-look `located.primary-button` h 66); the hand-finished one is 66px (`sgsButtonMinHeight 66px`). Part-look wrote `sgsButtonPadding {"top":"1px","right":"6px","bottom":"1px","left":"6px"}` (report `build.writes`), which is the browser's default button padding: the draft sizes the button by `height`. WooCommerce prints a "·" separator between label and price; the hand-finished page hid it with Custom CSS. Eye Care: `primary-button`, `place-order-label` and `place-order-text` unpaired (checkout-2); the words come from checkout-3.
- Cause: proved for Mama's height (the written padding equals the user-agent default; no `sgsButtonMinHeight` write, while the located box is 66px).
- Layer and owner: part-look (this stream). The separator is a block setting gap (plugin round: `woocommerce/checkout`, part "place-order separator", a show/hide setting; the framework database has no attribute for it: `sgsItemHideSeparators` is the line items').
- Fix: in `lib/fill-part-look.mjs`, when the draft element declares a `height` or `min-height`, write `sgsButtonMinHeight` from it and never write a padding equal to the user-agent default. Add `sgsPlaceOrderHideSeparator` to the commerce look.
- Size: S (part-look) + S (plugin).
- Depends on: checkout-3 for the button's words.
- Verify by: Mama's pay button computed height 66px at 375 and 1440, reading "Pay £30.45"-style with no dot.
- Same cause elsewhere: any draft button sized by height (the basket's checkout button).

### checkout-9: Eye Care's checkout page has no h1: "Checkout" renders as an h2
- Clients and widths: Eye Care, all widths.
- Evidence: `checkout/heads.mjs` on port 8125: `H2 wp-block-sgs-heading ... :: Checkout`, then WooCommerce's step h2s, and no h1. The draft's heading is `<h1>`. The built template (`checkout/attrs-trec-built.json`) gives `sgs/heading` no `level`, and the block's default is h2. The log says `skip template-checkout apply 0s - a template copy has no post of its own`. Mama's (older build) has `level: h1`, because there the heading sits inside the commerce region and `template-piece-woo-layout.mjs::place` writes `level: h.t.tag`.
- Cause: proved. The heading level is written by the apply stage's chrome rule (`scripts/computed-route/lib/apply-chrome-heading.mjs`), and template copies skip apply, so a heading the skeleton (not a piece) builds in a template copy keeps the default h2.
- Layer and owner: route (general session: apply/chrome rules for template copies) or this stream's template copy path; the decision belongs to whoever owns `lib/template-copies.mjs`.
- Fix: run the heading-level chrome rule on template copies too (it reads only the draft's tag), or have the skeleton write `level` from the draft tag for every `sgs/heading` node.
- Size: S.
- Depends on: nothing.
- Verify by: `/checkout/` on Eye Care has exactly one h1, "Checkout".
- Same cause elsewhere: likely every template copy whose page heading lies outside a piece (Eye Care's cart, order confirmation, 404 and search copies). Not checked here.

### checkout-10: The order summary does not match: Eye Care's reads "ORDER SUMMARY" with a nested box, no brand line and no Klarna line; Mama's is narrower, with the discount box closed and its footer line missing
- Clients and widths: both, 1440 and 375.
- Evidence: Eye Care (`pair-ec-1440.png`, `pair-ec-375.png`): the title is "Order summary" (the draft's is "Your bag" with "Edit"); a second bordered box inside the card (no `sgsSummaryFillBorder`; `summary-fill` has no locator; the hand-built page names `sgsSummaryFillBorder` and `sgsSummaryFillRadius`); the item shows the product's short description, with no brand line (`line-item-brand` has no locator; `sgsItemShowBrand` is not set); no "Klarna: 3 interest-free payments" line (`sgs/pay-later-message` is not placed, checkout-3). The item picture is broken because the basket's fixture product has no image (site data, not a clone fault). Mama's (`pair-mm-1440.png`): the card is 360 wide (checkout-5); the draft's open "Discount code" box with "Apply" is WooCommerce's closed "Add coupons" toggle; "Baked fresh for you · with you in 3–5 days" is missing; an "Add a gift card" row shows that the draft does not draw (the site's gift-card plugin).
- Cause: proved for each item named (the report lists, the saved settings, checkout-3's grep). Hypothesis for the coupon: WooCommerce draws the coupon form as a closed panel and no setting opens it; to prove it, check `woocommerce/checkout-order-summary-coupon-form-block` and the commerce look for an "open by default" setting (none found in the framework database by name).
- Layer and owner: part-look (this stream: `summary-fill` and `line-item-brand` locators); route piece (checkout-3: words, pay-later line, footer note); block setting gap (plugin round: `woocommerce/checkout` coupon panel "open by default", if confirmed missing).
- Fix: as checkout-2 and checkout-3; a footer note in the summary as `sgs/commerce-note` placed in the totals block.
- Size: M.
- Depends on: checkout-2, checkout-3.
- Verify by: pairs at 1440 and 375 show "YOUR BAG · Edit", the brand line, one card border and the Klarna line on Eye Care, and the open discount box and footer line on Mama's.
- Same cause elsewhere: the basket page's summary (basket.md).

### checkout-11: At phone width the order summary sits just above the pay button, where Mama's draft puts a "Show order summary" bar at the top and Eye Care's puts the bag after the pay button
- Clients and widths: both, 375.
- Evidence: `mm-clone.json` 375 `order`: `contact-fields@202 ... payment-method@1470`, then `actions@2032` with the summary fill-wrapper at 2032, before the actions. Eye Care: the fill-wrapper at 1319, above the actions. Mama's draft: the toggle bar at the top (`isM` branch); Eye Care's draft: the bag after "Secure payment…" (`ec-draft-375.png`). The hand-finished mirror is the same as the clone (`mm-hand.json` 375: actions and summary both at 2456), so hand-finishing never solved it either.
- Cause: proved: WooCommerce's checkout moves the summary into `.checkout-order-summary-block-fill-wrapper` before the actions block below its wide breakpoint, and no setting places it elsewhere. The woo-layout piece rightly drops the draft's static toggle (`Checkout/18 is the summary toggle WooCommerce's block draws`).
- Layer and owner: block setting gap (plugin round: `woocommerce/checkout`, part "phone order summary", a placement setting: top of form as a collapsible bar / before the pay button / after the pay button, plus the bar's look, which `sgsBar*` already covers).
- Fix: a commerce-look setting that moves the fill wrapper (CSS `order` within the main column, or a render filter), written by the woo-layout piece from where the draft's phone summary sits.
- Size: M.
- Depends on: nothing.
- Verify by: at 375 Mama's summary bar is the first item above "last bit, promise", and Eye Care's bag follows the pay button.
- Same cause elsewhere: the basket at 375.

### checkout-12: Mama's "Who's it for?" tiles stack at 375, the chosen tile has an extra outline ring, and "for me" loses its handwriting face
- Clients and widths: Mama's, 375 (stacking) and all widths (ring, face).
- Evidence: `plugins/sgs-blocks/src/blocks/gift-order/style.css`: `.sgs-gift-order__tiles { grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)) }`, so two tiles need 384px and the 375 card's inner width is about 279px; `.sgs-gift-order__tile--selected { outline: 2px solid currentcolor; outline-offset: 2px }`, so a ring is drawn around the chosen tile at rest (`pair-mm-1440.png`, `mm-clone-1440-error.png`). The draft keeps two columns at 375 (`grid-template-columns:1fr 1fr`) and marks the chosen tile by fill and shadow only. The draft sets the first line in Caveat at 24px. The framework database has no `sgs/gift-order` attribute for the tile lines' type, the tile's minimum width or the selected outline (query on `block_attributes`: only `giftTile*` box looks). The hand-finished page carried all three in Custom CSS (`sgsCustomCss` rules 1 to 5 on its checkout block, see below). The gift step's legend also sits on the card's border without the gap the draft leaves (hand Custom CSS rule 4).
- Cause: proved (CSS and database query above). The route writes nothing to the checkout's `sgs/gift-order` (checkout-3); the from-blank page's gift settings are the hand-built page's leftovers.
- Layer and owner: block setting gap (plugin round: `sgs/gift-order`, parts tile label and tile text: font family, size, weight, line height; tiles: minimum column width or a fixed column count per width; tile selected: outline on/off); plugin bug for the legend layout inside WooCommerce's checkout; route piece for writing them (checkout-3).
- Fix: add those settings to `sgs/gift-order`; replace the outline ring with the selected look's own settings (keeping a non-colour cue such as the shadow or border width for accessibility); fix the legend layout in the block's CSS.
- Size: M.
- Depends on: checkout-3.
- Verify by: Mama's at 375 shows the two tiles side by side, "for me" in Caveat 24px, and no outline ring on the chosen tile.
- Same cause elsewhere: the product page's gift choice (same block).

### checkout-13: Mama's allergen note loses its dashed box, and the terms line is WooCommerce's sentence, left-aligned and tight under the button
- Clients and widths: Mama's, all widths.
- Evidence: the part-look report lists `notice` as "Unpaired (a locator, no draft element)". Its look-table row covers `.wc-block-components-notice-banner, .sgs-commerce-note` (`selectors.json` `rows.notice`). The hand-finished page draws the dashed box with `sgsNotice*` (`attrs-local-mamas.json`: dashed 2px cocoa, radius 20, padding 14/18), all missing on the from-blank page. Terms: the draft has "By placing your order you agree to our terms." centred at 13px, 12px below the button; the clone has "By proceeding with your purchase you agree to our Terms and Conditions and Privacy Policy", left-aligned, directly under the button (`pair-mm-1440.png`). Part-look "Still differs": `terms.text-align` "no setting of the part holds this look".
- Cause: proved: the `notice` locator does not pair the draft's dashed note (Root/115#0), and no setting holds the terms' alignment. The terms words are content (checkout-3).
- Layer and owner: part-look (notice locator: this stream); block setting gap (plugin round: `woocommerce/checkout`, part terms, `text-align`; and the terms block's words, if the block has no text attribute).
- Fix: the `notice` locator pairs a bordered plain-text box in the form column holding a link (the commerce note); add `sgsTermsTextAlign`.
- Size: S + S.
- Depends on: checkout-3 for the note's placement on a truly blank page.
- Verify by: Mama's allergen note has a 2px dashed border with radius 20 at 375 and 1440; the terms line is centred.
- Same cause elsewhere: Eye Care's "Secure payment…" line (the same terms or note slot).

### checkout-14: Steps and fields the drafts do not draw: a separate "Shipping options" card, "Add a note to your order", a country select, "Use same address for billing", "+ Add apartment", and the phone in the address instead of a mobile in the contact step
- Clients and widths: both, all widths.
- Evidence: `pair-mm-1440.png` and `pair-ec-1440.png`. The drafts: Mama's folds the delivery options into "3 · Delivery" and has no order note (the gift note covers it); Eye Care's puts the delivery tiles first in "2 Delivery", before the address, and has no note, country or billing tick box. Both drafts put a mobile field in the contact step. The hand-finished Mama's page joined the shipping options and note into the Delivery card and turned the country into fixed text with Custom CSS (rules 9 to 12 below).
- Cause: proved: the page keeps WooCommerce's default inner blocks (checkout-3), WooCommerce draws the country select and the billing tick box itself, and its phone field lives in the address form. Moving phone into contact or merging steps has no setting.
- Layer and owner: route piece (checkout-3: removing the order-note block when the draft draws none); block setting gap (plugin round: `woocommerce/checkout`: "shipping options inside the delivery step", "single-country address shows the country as text"). The mobile-in-contact field and the postcode finder ("Find address") are framework gaps (WooCommerce's additional checkout fields API could add a contact phone).
- Fix: as named; the two settings above serve both clients.
- Size: M.
- Depends on: checkout-3.
- Verify by: neither page shows "Add a note to your order" or a separate "Shipping options" card; Mama's shows the shipping choices inside "3 · Delivery".
- Same cause elsewhere: none beyond the checkout.

### checkout-15: No express wallets, no card fields, no Klarna on either copy
- Clients and widths: both.
- Evidence: Eye Care's copy offers only "Cash on delivery" (`ec-clone.json` `payment`), and no express block renders (`express.block: false`). Mama's copy offers "Credit/Debit Cards" with an empty card box and "Popular payment methods". The hand-finished mirror on port 8084 shows the same empty card box (`mm-hand-1440.png`), so the empty box comes from running locally, not from the clone.
- Cause: proved for Eye Care (no gateway configured on the scratch copy; the hand-built site uses Stripe in test mode); hypothesis for Mama's empty box (Stripe's card element does not load on a localhost copy; prove by checking the console on port 8084 and 8121 when the copies are less busy; the attempt timed out at 22:00).
- Layer and owner: site data on the copy (not a clone fault).
- Fix: none for the clone; the lab copies need a test-mode gateway to judge wallet and card looks.
- Size: S (lab setup).
- Depends on: nothing.
- Verify by: with test keys on the copy, the wallet row and card fields render.
- Same cause elsewhere: the product page's express buttons on the copies.

### checkout-16: Mama's slim top bar: "Secure checkout" has no lock and wraps onto two lines at 375; "← Basket" is not underlined
- Clients and widths: Mama's, 375 (wrap) and all (icon, underline).
- Evidence: `pair-mm-375.png` (the draft shows "Secure" with a lock at 375 and "Secure checkout" at 1440, from `secureTxt: m ? 'Secure' : 'Secure checkout'`); `pair-mm-1440.png`.
- Cause: proved for the lock (checkout-1 (2)); the shorter phone wording is a draft state the route does not read (the text is set by the logic per width). Hypothesis for the underline: the `sgs/button` built from the link loses the link's `text-decoration`.
- Layer and owner: route rule (general session: the checkout's top bar).
- Fix: as checkout-1 (2); read per-width words as a width variant.
- Size: M.
- Depends on: checkout-1.
- Verify by: lock icon present; "Secure" on one line at 375.
- Same cause elsewhere: the basket and confirmation slim bars.

### checkout-17: Eye Care's header and footer are broken on the copy, and the page is 1567px wide at 1440
- Clients and widths: Eye Care, all widths.
- Evidence: `ec-clone.json` `doc.scrollWidth` 1567 at 1440 and 604 at 375; the ticker words overlap; no logo; the walk recorded 583 console errors, all 404s for `ec-logo-*.png` uploads (`sites/eye-care-ward-end/build/qa/parity/out/template-checkout/report.json` `errors`).
- Cause: known (lab-findings "Every Eye Care page on the copy ... is wider than the screen"; the header and drawer are the general session's); the logo 404s are missing upload files on the copy (site data).
- Layer and owner: general session (header, drawer); site data (uploads).
- Fix: as owned there; copy the logo uploads onto the scratch copy.
- Size: as owned there.
- Depends on: nothing.
- Verify by: `scrollWidth` equals the viewport at 375 and 1440; no 404 in the console.
- Same cause elsewhere: every Eye Care page on the copy.

### checkout-18: The empty-submit error look: neither draft draws one, and the clone's WooCommerce messages are readable only on Mama's
- Clients and widths: both, 375 and 1440.
- Evidence: Eye Care's draft "Pay now" goes straight to "Thank you — order EC-10482" with no check (`ec-draft-375-aftersubmit.png`; `placeOrder` in the draft's logic sets no error). Mama's draft relies on the browser's own bubble ("Please fill out this field." on the email, from `required`) (`mm-draft.json` `afterSubmit`). The clones show WooCommerce's inline messages for six fields, focus the email field, and keep the field borders their normal colour with red labels: Mama's messages are 13px red (the hand-finished site's are 14px through Custom CSS), Eye Care's are 9.5px (checkout-4). Pictures `mm-clone-1440-error.png`, `ec-clone-375-error.png`. Keyboard focus: Eye Care's field shows `2px solid #9C8B78` inset (the draft declares `outline:2px solid var(--acc,#9C8B78)`, offset 2px); Mama's shows `3px solid #3A2A22` inset (the draft declares 3px `#3A2A22`, offset 3px). Both are visible, with only the offset's side differing.
- Cause: not a fault beyond checkout-4 and the missing error-type setting named there. The drafts give nothing to match.
- Layer and owner: draft (no error state drawn: the Claude Design instructions could ask for one); checkout-4 for the size.
- Fix: none beyond checkout-4.
- Size: none.
- Depends on: checkout-4.
- Verify by: as checkout-4.
- Same cause elsewhere: the account forms.

### checkout-19: The draft's section entrance animations ("rise" on each step, "fade" on the bag) are not reproduced
- Clients and widths: Eye Care (and Mama's draft has none on the checkout).
- Evidence: Fill report `sites/eye-care-ward-end/build/qa/fill/template-checkout/2026-11-21T21-09-17/fill-report.md`, UNMAPPED: K-33 to K-38 (css-animation, load) and TR-045 to TR-047 on `cr-ref-template-checkout-0`, plus J-01 to J-19 script style writes with "no skeleton node holds its element". The animated elements are inside the region the Checkout block stands for.
- Cause: proved (the UNMAPPED rows): WooCommerce's block has no motion setting for its steps.
- Layer and owner: block setting gap (plugin round, low priority: `woocommerce/checkout` entrance motion per step, through `sgsMotion`), or accept it.
- Fix: accept it for now, or add an entrance motion to the commerce look.
- Size: M.
- Depends on: nothing.
- Verify by: Bean's call.
- Same cause elsewhere: the basket.

## The hand-finished pages against the from-blank pages

### Mama's (`local-mamas` post 102 against `local-mediatest-trlab` post 102 after tonight's part-look, `node checkout/compare.mjs checkout/attrs-local-mamas.json checkout/attrs-trlab-after.json`)

159 settings on the hand-finished Checkout block and 217 on the from-blank one: 43 are on the hand-finished block only, 15 are on both with different values, and 101 are on the from-blank block only.

Hand-finished only, with the draft element and why the route did not write it:

| Setting(s) | Hand value | Draft element | Why not written |
|---|---|---|---|
| `sgsFieldLabelPosition` | above | every `<label>` above its input | no route code writes it (checkout-7) |
| `sgsFieldMinHeight` | 54px | inputs `height:54px` | part-look writes `sgsFieldInputHeight` (54px, present on both) instead; the same look |
| `sgsOptionBackground`, `sgsOptionChosenBackground`, `sgsOptionChosenBorderColour`, `sgsOptionChosenShadow`, `sgsOptionChosenShadowColour` | white; `mm-yellow-soft`, cocoa, `4px 4px 0 0` cocoa | delivery buttons, `d.bg` and `d.shadow` per state | instance conflict on `option` (checkout-6) |
| `sgsNoticeBackground`, `sgsNoticeBorder*` (5), `sgsNoticePadding` | `mm-paper`, 2px dashed cocoa, r20, 14/18 | the allergen note Root/115#0 | `notice` unpaired (checkout-13) |
| `sgsBar*` (7) | pink-soft bar, 2px cocoa border (tablet and phone), r20, 0/18 padding, cocoa text | "Show order summary" bar Root/19#0 | `summary-bar` has no locator; the piece drops the static toggle (checkout-11) |
| `sgsItemImageBackground`, `sgsItemImageWidth`, `sgsItemImageHeight` | pink-soft, 56px, 56px | summary thumbnail | `sgsItemThumbSize` 56px is written; the background has no locator pairing (`item-image-img` unpaired) |
| `sgsSidebarWidth` | 477px | the region's `1fr` track | never written by the route (checkout-5) |
| `sgsButtonMinHeight` | 66px | pay button `height:66px` | part-look writes UA padding instead (checkout-8) |
| `sgsCreateAccountLabelFont*` (3) | 16px 700 | "Create an account (optional)" | `create-account-label` has no locator |
| `sgsOptionGroupOutline`, `sgsOptionGap` | none, 12px | the delivery list (`gap:10px`) | `option-group-outline` is a pseudo-element; the gap is not located |
| `sgsCouponLabel*` (5) | 16px 700 cocoa | "Discount code" field | `coupon-label` unpaired (the draft's box has a placeholder, not a label) |
| `sgsSummaryFillBorder` | none | none (one card) | `summary-fill` has no locator |
| `sgsSummaryHeadingTextTransform`, `sgsSummaryHeadingLineHeight` | none, 1.05 | "Your order" | the transform's default is not read as a write; the draft's line-height is `normal`, which no number holds |
| `sgsShippingOptionControlGap` | 12px | the dot's grid gap | `shipping-option-control` has no locator |
| `sgsCustomCss`, `sgsCustomCssId`, `sgsCustomCssNote` | 56 rule blocks on 55 lines | various | see the next table |

Both, with different values: `sgsOptionPadding` (hand 13/16/13/50, blank 10/16/10/16: checkout-6); `sgsSummaryHeadingFontSize` (hand 26, blank 24: the draft's "Your order" is `font-size:24px`, so the route is right); `sgsExpressButtonsGap` (hand 12, blank 8: the draft's wallet grid is `gap:8px`, so the route is right); `sgsColumnGap` (blank adds tablet 28px: the draft's `L.gap` is 28px at tablet, so the route is right); `sgsLoginPromptFontWeight` (hand 700, blank 400: the draft's prompt sentence is 400 and its link 700; the part reads the sentence); `sgsTermsColour` (hand cocoa, blank `mm-muted`), `sgsItemVariantFontSize` (14 against 13) and `sgsItemVariantColour` (cocoa against body): not checked against the draft. Seven more differ only in shape (`{top..}` against `{desktop:{top..}}`, or a plain `56px` against `{desktop:"56px"}`): the five border widths, `sgsItemThumbSize` and `sgsButtonBorderWidth`.

Mama's hand-finished Custom CSS (on the Checkout block, `sgsCustomCssId mmco0002`; site Custom CSS holds only a Trustpilot badge rule, not checkout), by group:

| Rules | What | Status now |
|---|---|---|
| gift tile label and text type; selected `outline:0`; legend float and tiles clear | gift step | missing settings and a plugin bug (checkout-12) |
| thumbnail `object-fit:cover` | summary images | missing setting (no checkout attribute with `object-fit` in the framework database); a plugin default of `cover` would serve every client |
| place-order separator hidden, text gap | pay button | missing setting (checkout-8) |
| shipping fields, shipping option and order notes as one card (borders, padding); shipping option list as a column; its heading hidden | Delivery step | missing setting "shipping options inside the delivery step" (checkout-14) |
| country select as fixed text | address | missing setting "single country as text" (checkout-14) |
| billing select right padding; select arrow at the bottom | address selects with labels above | plugin bug in the `above` label mode for selects (fix in `commerce-look/fields.php`) |
| text field focus border and ring in dark pink | fields | missing setting (no checkout attribute named Focus apart from `sgsFocusRests`); not in the draft (the draft's focus ring is 3px cocoa), so a hand choice, a true one-off |
| guest notice 15px | contact step | missing setting (no row for `.wc-block-checkout__guest-checkout-notice`; `sgsLoginPrompt*` is the "Sign in" prompt) |
| quantity badge size, place and colour | summary items | missing setting (no Quantity or Badge attribute) |
| order note and billing tick box labels 15px 700 | tick boxes | a setting exists now (`sgsCheckboxLabelFont*`, written by part-look on the from-blank page) |
| phone summary margin below 1024px | summary | probably covered by `sgsSummaryMargin` (written on the from-blank page); not checked live |
| express payment card (border, radius, background, padding per width), title inside | wallet row | settings exist now (`sgsExpressContentBorder`, `sgsExpressContentPadding`, `sgsExpressContentMargin`, used by `eye-care-test`); the title's place has none; the draft draws no card here (a hand choice) |
| summary `overflow-x:clip` with margin, titles' margins, totals wrapper borders and padding, totals block dashed top rule | summary card | mostly settings now (`sgsSummaryTitleBoxMargin`, `sgsTotalsWrapperPadding`, `sgsSummaryRowDivider`, `sgsTotalDivider`); the overflow clip works round the card shadow being clipped, a plugin bug |
| coupon form layout, input and Apply button looks; gift card panel shares them | coupon | partly settings now (`sgsCouponControlHeight`, `sgsCouponLabel*`, look-table rows `coupon_input`, `coupon_apply`); the gift card panel outside the coupon settings is a known Task 3 fault |
| shipping "via" line and totals item description 14px cocoa | totals | missing setting (no row for `.wc-block-components-totals-shipping__via`) |
| validation message 14px | errors | missing setting (checkout-4) |

### Eye Care (`eye-care-test`, setting names only, against `local-mediatest-trec` post 8 after tonight's part-look)

The hand-built site keeps its checkout in a template part `sgs-checkout-content` (in the template `checkout`, post 1610 there): `sgs/heading`, `woocommerce/store-notices`, `woocommerce/checkout` with 236 setting names, inner block titles, `placeOrderButtonLabel` and `className` on the actions block, `sgs/pay-later-message`, and `sgs/commerce-note` with its own Custom CSS. Its page 8 holds a bare Checkout block. The from-blank page 8 has 141 settings. 153 names are on the hand-built block only (full list: `node checkout/compare.mjs checkout/ec-hand-names.json checkout/attrs-trec-after.json --names`), in these groups:

- step numbers and titles: `showFormStepNumbers`, `sgsStepNumber*` (9), `sgsStepTitle*` (10), `sgsStepPadding`, `sgsStepHeading*` (4). Not written because `step`, `step-title` and `step-heading` are unpaired and `step-number` has no locator (checkout-2).
- delivery tiles: `sgsOption*` (10), `sgsShipping*` (16), `sgsRadio*` (10), `sgsDelivery*` (5). Not written because those parts are unpaired (checkout-2).
- pay button: `sgsButton*` (7), `sgsPlaceOrderTextWidth`, `sgsPlaceOrderLabelWidth`. Unpaired (checkout-2, checkout-8).
- summary: `sgsSidebarWidth`, `sgsItemShowBrand`, `sgsItemBrand*` (7), `sgsSummaryEdit*` (12) with `sgsSummaryEditLinkLabel`, `sgsSummaryFill*` (2), `sgsSummaryInnerPadding`, `sgsSummaryTitleFlexMargin`, `sgsSummaryTitleBoxMargin`, `sgsSummaryRowsPadding`, `sgsTotals*` (3), `sgsItem*` other than brand (8). No locator or unpaired, or never written (checkout-2, checkout-5, checkout-10).
- words: `sgsCheckoutStrings`, titles, the button label: no route step (checkout-3).
- fields: `sgsFieldLabel*` (3), `sgsFieldInputHeight`, `sgsAddressFormColumnGap`, `sgsCheckboxInputMin*` (2). `field-label` is unpaired (Eye Care's draft has no labels).
- express: `sgsExpressContent*` (3) (no locator), terms `sgsTerms*` (5) (unpaired), coupon `sgsCoupon*` (6) (unpaired), the spacing rows (`sgsActionsMargin`, `sgsAddressWrapperMargin`, `sgsOrderNotesMargin`, `sgsPaymentMethodMargin`, `sgsUseBillingMargin`, `sgsStepSpacedMargin`, `sgsCheckoutRootPadding` and the like; their parts are unpaired), `sgsStripeMatchFields`.
- `sgsCustomCss`, `sgsCustomCssId`, `sgsCustomCssNote` on the Checkout block, and `sgsCustomCss` on its `sgs/commerce-note`: present, values not read (held-out rule), so not classified.

## Pictures and probes

Pictures in `E:\sgs-tmp\template-rework\investigation\shots\checkout\`:
- pairs (draft left, from-blank right): `pair-ec-1440.png`, `pair-ec-375.png`, `pair-mm-1440.png`, `pair-mm-375.png` (and `.partN.png` strips);
- singles: `ec-draft-*`, `mm-draft-*`, `ec-clone-*`, `mm-clone-*`, `mm-hand-*` at 375 and 1440, each with `-focus` and `-error` (clone) or `-aftersubmit` (draft) crops;
- earlier states: `E:\sgs-tmp\template-rework\investigation\checkout\pre-*` (before tonight's rebuild) and `mid-ec-*` (Eye Care after the template rebuild, before part-look).

Probes and data in `E:\sgs-tmp\template-rework\investigation\checkout\`:
- `probe.mjs`: the clone's layout, looks, focus and empty-submit errors with a seeded basket → `*.json` beside the pictures;
- `draftprobe.mjs`: the same reads on the draft (Eye Care opened with `L.go('checkout')` and the part-look init that fills the bag);
- `radio.mjs`: shipping and payment tile padding, dot position, chosen look and type sizes;
- `heads.mjs`: the page's headings;
- `attrs.php` (read-only WP-CLI): the checkout page's and template's blocks and settings, Custom CSS and global styles CSS (`names` argument for the held-out site) → `attrs-local-mamas.json`, `attrs-trlab-after.json`, `attrs-trec-after.json`, `attrs-trec-built.json`, `attrs-local-eye-care-names.json` (the clone mirror, not used as reference);
- `parts.php` (read-only, names only, over `ssh hd` on `eye-care-test`) → `parts-eye-care-test-names.json`, `attrs-eye-care-test-names.json`, `ec-hand-names.json`;
- `compare.mjs`: hand-finished against from-blank settings;
- `mm-inv-head.json`: the committed (HEAD) Mama's template-checkout inventory, for comparison with tonight's.
