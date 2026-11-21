# Account page (signed out and signed in): findings

- Distance: Mama's signed-out card is close (one stray guest line); Mama's and Eye Care's signed-in views are far from passing at 375 and 1440 (WooCommerce's eight-item menu with icons, plain order rows, an order page with no items or totals on Mama's and plain WooCommerce on Eye Care, a broken addresses grid, a one-column details form, and a page band that never greets the customer). Eye Care's signed-out page shows only the sign-in form after a surface rebuild.
- Worst: the signed-in order page on Mama's shows only "#5998", its date and status: no items, no totals, no address (account-1); and the addresses view on both clients drops its first card into the second column with 58px titles spilling out of 225px cards (account-2).
- 20 findings: 4 plugin bugs (account-1's plugin half, account-2, 3, 18), 9 route or part-look gaps this stream owns, 5 block-setting gaps for the plugin round, 1 calibration, 1 outside this page (Eye Care's header). Fresh-build status is in "Fresh build" at the end.

Reading rules used: Mama's hand-finished mirror `local-mamas` read with values; Eye Care's hand-built `local-eye-care` read for block and setting NAMES only (Bean's held-out rule). All Eye Care values below come from the draft.

### account-1: Mama's order page shows only the order number, date and status: no items, no totals, no address
- Clients and widths: Mama's, every width (Eye Care shows WooCommerce's plain order page instead, because its signed-in parts are never read: account-5).
- Evidence: `shots\account\pair-mm-in-order-1440.png` (right: "#5998 / Placed 15 January 2026 / PROCESSING" and nothing else). Live DOM on `/my-account/view-order/5998/`: only `.sgs-account__od`, `__od-head`, `__od-placed`, `__od-status`; no `.woocommerce-order-details`. Saved block: `orderDetailLook: true`, no `orderDetailProgress`, `orderDetailItems`, `orderDetailBoxes`.
- Cause: proved (code). `includes/account/class-account-extras.php` swaps WooCommerce's `myaccount/view-order.php` for the block's own page whenever `orderDetailLook` is on; `helpers-account-order-detail.php::sgs_account_order_detail_html` then prints the steps, items and boxes only when their own switches are on, and all three default off. Part-look writes `orderDetailLook` (data/part-look-modes.json rule `whenFound: od-placed`) and has no rule for the other three, and no locator finds the draft's step cards, item rows or address/total boxes (data/part-locators.json group `accountIn` has `od-back`, `od-placed`, `chip`, `od-row`, `od-text` only).
- Layer and owner: two. Plugin bug (this stream: an order page that shows no order is broken whatever the route writes); part-look rule and locator gap (this stream).
- Fix: (a) plugin: `sgs_account_order_detail_html` prints WooCommerce's own order table (`woocommerce_order_details_table`) when neither `orderDetailItems` nor `orderDetailBoxes` is on, so the look switch alone never hides the order. (b) part-look: locators `od-steps` (a row of three or more repeated cards or bars in the detail view, each with words and no amount), `od-item` (a repeated row in the detail view with an image and an amount), `od-box` (a box in the detail view holding address lines, or the subtotal and total rows), each `view: "detail"`; then rules in `data/part-look-modes.json` `sgs/account`: `orderDetailProgress` whenFound `od-steps`, `orderDetailItems` whenFound `od-item`, `orderDetailBoxes` whenFound `od-box`. The step words (`orderStepPlaced` ... `orderStepDelivered`, their notes) and box titles (`orderDetailAddressTitle`, `orderDetailItemsHeading`, `orderDetailBackLabel`, `orderDetailTitle`, `orderDetailPlacedText`, `orderDetailShippingLabel`, `orderDetailShippingFreeText`, `orderDetailOrderAgain` and its label, `orderDetailHelpText`/`Label`) are read from the same located parts' words (see account-9).
- Size: M (plugin S, locators and rules M).
- Depends on: account-5 for Eye Care.
- Verify by: `clone-in.mjs` on Mama's: the order page holds `.sgs-account__od-steps`, `.sgs-account__od-items`, `.sgs-account__od-boxes` and the total; with only `orderDetailLook` saved the page still lists the items (plugin test).
- Same cause elsewhere: any site whose saved account block has `orderDetailLook` on alone (render-scope on local-mamas, local-indus, local-eye-care before shipping the plugin half).

### account-2: The addresses view drops the first card into the second column; cards are 225px wide with 58px titles spilling out
- Clients and widths: both clients, 1440 (and 768 wherever the block is at least 640px wide).
- Evidence: `shots\account\pair-mm-in-addr-1440.png`, `pair-ec-in-addr-1440.png`. Probe `account\addr-probe.mjs` on Mama's: grid `468px 468px`, billing card at x 872 (second column) and shipping card at x 380 one row lower, each 225px wide (`float:left/right; width:48%`), title `font-size: 58px` in a 225px card (scrollWidth 241 and 275). `account\addr-probe2.mjs`: the grid's `::before` computes to `content:" "; display:table`.
- Cause: proved (computed styles and the stylesheet order). `style.css` `.sgs-account .col2-set::before,::after { content: none }` has the same specificity as WooCommerce's `.woocommerce .col2-set::before { content:" "; display:table }`, which loads later and wins, so the clearfix pseudo-element takes the grid's first cell; WooCommerce's `.woocommerce .col2-set .col-1 { float:left; width:48% }` (0,3,0) also beats `.sgs-account .woocommerce-Address` (0,2,0), which sets no width. The 58px title is the theme's h2 size: the address title's type settings have no part in the framework database (account-12), so part-look cannot write the draft's 12px uppercase label.
- Layer and owner: plugin bug (this stream: `plugins/sgs-blocks/src/blocks/account/style.css`).
- Fix: raise the two rules above WooCommerce's: `.sgs-account .woocommerce-Addresses.col2-set::before, ::after` and `.sgs-account #customer_login.col2-set::before, ::after` with `content: none` (an id or doubled class beats WooCommerce's), and `.sgs-account .woocommerce-Addresses .woocommerce-Address { float: none; width: auto; }`.
- Size: S.
- Depends on: nothing.
- Verify by: `addr-probe.mjs` on both copies: the two cards in row 1, columns 1 and 2, each 468px. The same fix closes account-3. Render-scope on the three mirrors (a fix: lands for every site).
- Same cause elsewhere: account-3 (the same pseudo-element in the sign-in pair); any WooCommerce `.col2-set` the block lays out as flex or grid.

### account-3: Eye Care's sign-in and register cards stack where the draft sets them side by side
- Clients and widths: Eye Care, 1440 (the draft stacks them below its desktop width, so 375 is right to stack).
- Evidence: draft at 1440 (`shots\account\ec-draft-out-1440.png`): two 497px forms side by side at x 223 and 721. Clone block width 996px. In-page test on the sign-in pair (`account\login-pseudo2.mjs`, nothing saved): two 480px cards in a 996px row wrap onto two rows with WooCommerce's clearfix pseudo-elements present (x 492/468, y 393/678) and sit side by side without them (x 225/735, same y). `login-pseudo.mjs` shows the pseudo-element is live on `#customer_login` on this build (`content:" "; display:table`).
- Cause: proved (in-page test): the same lost override as account-2; the `::before` and `::after` are flex items that push the pair past 996px. The draft's cards also share one frame with no gap (one 1px border between them), which the block's `authPairGap`, `authPairBorderWidth`, `authPairCellBorderWidth` settings can draw; part-look does not read them yet (no locator for the pair, account-12).
- Layer and owner: plugin bug (this stream), then part-look locators (this stream).
- Fix: account-2's CSS fix; then a part-look locator `authPair` (the element holding exactly the two forms) and `authPairCell` (each form's card) in group `account`, so `authPairGap: 0`, the shared border and each card's padding are written.
- Size: S.
- Depends on: account-2 (same edit), account-4 (the register card only shows when registration is on).
- Verify by: `out-probe.mjs http://localhost:8125 1440`: two `#customer_login` children with the same y.
- Same cause elsewhere: every site with `authLayout` side-by-side (the default).

### account-4: After a surface rebuild Eye Care's signed-out page shows the sign-in form alone; the register form never shows its password field
- Clients and widths: Eye Care (register card missing); both clients (password field).
- Evidence: Eye Care copy now: `woocommerce_enable_myaccount_registration = no` (`account\read-account.php` on `local-mediatest-trec`), and `out-probe.mjs` finds no `#customer_login`, only the sign-in form. Both copies: `woocommerce_registration_generate_password = yes`; both drafts draw a password field in the register form (Eye Care "Password" with "8 characters or more", Mama's `SignIn.dc.html` "Choose a password", `autocomplete="new-password"`). The route writes `registerPasswordHint` on Eye Care, which `includes/account/helpers-account-register.php::sgs_account_register_markup` prints only beside WooCommerce's `#reg_password`, which WooCommerce omits while it generates passwords.
- Cause: proved (code and options). `lib/site-build-account-registration.mjs::runAccountRegistration` turns registration on, but only `site-build.mjs` runs it; `clone-surface.mjs --surface my-account` does not, so a copy whose option was reset stays off. No step reads the register form's new-password field into `woocommerce_registration_generate_password`.
- Layer and owner: route (this stream: the site build's account step).
- Fix: in `lib/site-build-account-registration.mjs`, also plan `woocommerce_registration_generate_password = no` when the drawn register form holds a `new-password` field (only ever `no`, like the registration switch); and run the account step from the my-account surface run (or have the main session's chain call `site-build.mjs --account-registration --apply` after the account surface).
- Size: S.
- Depends on: nothing.
- Verify by: `out-probe.mjs` on the Eye Care copy: `#customer_login` with two children and an `input#reg_password` followed by the hint.
- Same cause elsewhere: every client whose draft registers with a chosen password.

### account-5: Part-look reads none of Eye Care's signed-in parts (0 of 98)
- Clients and widths: Eye Care, all widths.
- Evidence: `part-look.mjs --client eye-care-ward-end --surface my-account-in --out investigation\account\pl-ec-in`: "the client's page map names no sign-in page, so the draft cannot be signed in and nothing is read"; parts paired 0/98. Probe `account\ec-probe-fns.mjs`: after `L.go('signin')` the existing `signInInPage` signs in (returns null), `menuInPage` counts 5 tabs and opens tab 1, but `openItemInPage` returns false.
- Cause: proved (both runs). (a) `part-look.mjs` calls `lib/part-look-signed-in.mjs::readSignedInParts` only with a sign-in FILE (`pagesOf` reads it from the page map); a one-file draft whose pages are its own state has none, and `readSignedInParts` never runs the `route`/`init` steps `sites/<client>/build/part-look.json` names. (b) Eye Care's order rows are whole-row `<button>`s: `openItemInPage` wants a card that contains a control, and the `orderCards` anchor in `data/part-locators.json` matches only `div|li|article|section` with a control inside, so even signed in no order card or order page would be read.
- Layer and owner: part-look (this stream).
- Fix: (a) `readSignedInParts` takes the surface's config: with no sign-in file, open the main file, run `L.go(<signin route>)` (from `part-look.json` `surfaces["my-account"].route`, or a `my-account-in` entry), sign in with `signInInPage`, and read the views the draft's own `afterAuth` lands on. (b) `openItemInPage` and the `orderCards` anchor also accept a repeated control that itself holds an amount (tag `button`/`a`, `self` as its own control).
- Size: M.
- Depends on: nothing.
- Verify by: the same `part-look.mjs` report: Eye Care reads 5 tabs and the item page at each width and pairs at least the parts Mama's pairs (26).
- Same cause elsewhere: any one-file draft (Eye Care's other signed-in reads; Indus if it grows an account).

### account-6: The menu is WooCommerce's eight items with icons, as rows, where the drafts draw four or five tabs with counts
- Clients and widths: both, all widths.
- Evidence: live menu on both copies (`shots\account\mm-clone-in-cur.json`, `ec-clone-in-cur.json`): Dashboard, Orders, Saved items, Downloads, Addresses, (Payment methods), Account details, Sign out, each with an icon. Drafts: Mama's Orders 2 / Subscriptions 1 / Addresses 2 / Account details tick; Eye Care Orders 3 / Subscriptions 2 / Addresses / Wishlist / Account details, no icons. Mama's hand-finished block sets `hiddenEndpoints ["dashboard","saved-items","downloads","payment-methods"]`, `menuOrder ["orders","edit-address","edit-account"]`, `showMenuIcons false`, `menuOrdersCount`, `menuAddressesCount`, `menuAccountTick` true, `navLayout {desktop: sidebar, tablet: tabs, mobile: tabs}`, `navWidth {desktop: 260px}`; the from-blank block sets none of them. Eye Care's hand-built page uses none of them either (names only).
- Cause: proved (code). `lib/template-piece-account-read.mjs::signedInWords` stops at the menu ("the tab names are a loop over draft data ... left to the block"), and `data/part-look-modes.json` has no rule for the menu. Yet part-look's signed-in reader already opens every tab and reads its view.
- Layer and owner: part-look modes (this stream).
- Fix: in the signed-in read, classify each draft tab by what its view holds, never by its words: order cards → `orders`; address cards → `edit-address`; a form with given-name and new-password fields → `edit-account`; a list of product cards with a heart → `saved-items`; anything else (subscriptions) → no endpoint (a note: the site has no subscriptions endpoint). Write `menuOrder` in the draft's order, `hiddenEndpoints` = every endpoint the site serves that no tab maps to (the dashboard, downloads, payment methods), the tab labels into `strings.orders`, `strings.addresses`, `strings.accountDetails`, `strings.savedItems`, `menuOrdersCount`/`menuAddressesCount` when that tab carries a number, `menuAccountTick` when the details tab carries a glyph, and `showMenuIcons: false` when no tab carries an icon.
- Size: M.
- Depends on: account-5 (for Eye Care).
- Verify by: `clone-in.mjs`: Mama's menu reads Orders, Addresses, Account details, Sign out, with counts; Eye Care's Orders, Addresses, Wishlist (saved items), Account details, Sign out, no icons.
- Same cause elsewhere: nothing else.

### account-7: The menu items are plain rows; the drafts draw bordered pills (Mama's) or a left rule with a dark current line (Eye Care)
- Clients and widths: both, all widths.
- Evidence: Mama's draft menu item: 2px cocoa border, 999px corners, cream fill, the current one yellow with a 4px hard shadow; clone item: `border 0`, `background transparent` (current: cream). Part-look's own report (`account\pl-mm-in\report.json` `noSetting`): `menuLink` background, border width/style/colour, shadow and `menuItem` border have no setting. `menuActiveBackgroundColour` and `menuActiveTextColour` are located (the current tab is found at every width) but marked "a state setting (current) the route does not read". Mama's hand-finished sets `menuActiveBackgroundColour mm-yellow`, `menuActiveTextColour` and draws the pill border and shadow in Custom CSS. Eye Care's draft: sidebar with a 1px left rule and the current item marked by a 2px inset line; tabs below desktop with a 2px bottom line.
- Cause: proved (database and code). The database lists no border, fill or shadow setting for `menuItem`/`menuLink` (only padding, radius, min-height, gap, text colour); `lib/fill-part-look.mjs::buildLook` marks every row with a `css_state` not-written, including `current`, although the `menuActive` locator already finds the current element.
- Layer and owner: block setting gap (plugin round: `sgs/account`, part `menuItem`: `menuItemBorderWidth`, `menuItemBorderStyle`, `menuItemBorderColour`, `menuItemBackgroundColour`, `menuItemShadow`, and the current item's `menuActiveBorderColour`, `menuActiveShadow`); part-look (this stream: read `current` rows from the `menuActive` part's own located element, as the hover reader does for `hover`).
- Fix: the five plus two settings on the block (with the element's attrMap so the database names the part); in `buildLook`, pair a row with `css_state: current` to the reads of the locator that carries `ariaCurrent: true` for that element. Eye Care's left rule and inset line map to `menuSidebarBorderWidth` and `menuActiveIndicatorStyle: line` with `menuActiveIndicatorColour` (exist; the indicator rows are `current` state rows, so the same reader change writes them).
- Size: M (plugin) + S (part-look).
- Depends on: account-5 for Eye Care.
- Verify by: `clone-in.mjs` JSON `item` and `active` values equal the draft's at 375 and 1440.
- Same cause elsewhere: any `current` state row of any block part-look reads (the cart and checkout steps' current state).

### account-8: Order rows are joined hairline rows with every word underlined; the draft draws separate bordered, rounded cards with a "View order" button
- Clients and widths: both, all widths.
- Evidence: `pair-mm-in-orders-1440.png`: rows touch, no corners, order number, date, product name, status and total underlined, a chevron where the draft has "View order →"; the date reads "19 November 2026" against "Placed Sat 7 Nov · 1 items". Clone row: `border 0, radius 0`. Part-look `noSetting`: `ordersRows` border width, style and radius, `ordersPill`/`order-status` border width, style, colour and radius. Mama's hand-finished: `ordersRowTextDecoration`, `ordersRowViewLabel "View order"`, `ordersRowViewIcon "arrow-right"`, `ordersDateFormat`, `ordersRowItemCount`, and Custom CSS for the card border, corners, gap, hover lift and the bordered pill. Eye Care's draft: joined rows in one 1px frame, no underline.
- Cause: proved (database and code). `helpers-account-look-css.php::sgs_account_orders_look_css` paints only fill, hover fill, padding and the list's hairline colour (`ordersRowBorderColour` paints the gap background); no row border width, radius, gap or shadow, and no pill border exists. The underline is the theme's link underline on the row's links; `ordersRowTextDecoration` exists but its row has no part in the database (account-12), so part-look cannot write `none`. `ordersRowViewLabel`, `ordersRowViewIcon`, `ordersDateFormat`, `ordersRowItemCount` are content settings nothing writes.
- Layer and owner: block setting gap (plugin round: `sgs/account` part `ordersRows`: `ordersRowGap`, `ordersRowBorderWidth`, `ordersRowBorderStyle`, `ordersRowRadius`, `ordersRowShadow`, `ordersRowHoverLift`; part `ordersPill`: `ordersPillBorderWidth`, `ordersPillBorderStyle`, `ordersPillBorderColour`, `ordersPillRadius`); database (give `ordersRowTextDecoration` its part, account-12); part-look words (account-9).
- Fix: as above; the view button is the block's built-in button kit candidate (`ordersRowView` as a declared builtin button) so its look is written like the other kit buttons.
- Size: M.
- Depends on: account-12.
- Verify by: `clone-in.mjs` `order` values (border 2px, radius 24px on Mama's) and no underline on `.sgs-account__order a`.
- Same cause elsewhere: nothing else.

### account-9: Words of the signed-in views stay WooCommerce's ("Orders", "#5998", "Save changes"); the drafts' words are never read
- Clients and widths: both.
- Evidence: Mama's hand-finished words the from-blank block lacks: `ordersTabHeading "Your orders"`, `orderDetailTitle "Order {order}"`, `orderDetailBackLabel "← All orders"`, `orderDetailPlacedText "{date}"`, `orderStepPlaced/Processing/Dispatched`, `orderDetailAddressTitle "Delivered to"`, `orderDetailItemsHeading "What you ordered"`, `orderDetailShippingLabel "Delivery"`, `orderDetailShippingFreeText "Free"`, `orderDetailOrderAgainLabel "Order this again"`, `orderDetailHelpText "Something not right?"`, `orderDetailHelpLabel`, `ordersRowViewLabel`, `addressEditLabel "Edit"`, `addressAddLabel "Add"`, `accountMobileLabel "Mobile (optional)"`, `accountMarketingOptInLabel`, `strings.passwordChange "Change password"`, `strings.currentPasswordLabel`, `strings.newPasswordLabel`, `strings.updatePassword`, `giftNoteHeading "Gift note"`. Each is a draft word on a part part-look already locates or could (`od-back`, `heading`, `chip`, `od-row`, the details form's labels and buttons).
- Cause: proved (code). `signedInWords` reads only the details and addresses panel headings and the sign-out words from the draft SOURCE, and says the other panels have "no structural tell"; part-look's signed-in reader has that tell (it opens each tab and the item page) but writes looks and modes only.
- Layer and owner: part-look (this stream): a words pass over the signed-in reads, the content-setting twin of `evaluateModes`.
- Fix: a `words` map in `data/part-look-modes.json` `sgs/account` (`part` → content setting, with `{order}`/`{date}` tokens put back where the draft's words hold the located order number or date), run by `lib/part-look-modes.mjs` after the modes; a word holding a live value (a name, a count) is a note, never written.
- Size: M.
- Depends on: account-1, account-5.
- Verify by: the from-blank saved block holds the listed words; `clone-in.mjs` order page reads "Order 5998", "← All orders".
- Same cause elsewhere: the order confirmation's account card words (order piece) are read separately and fine.

### account-10: The page band never greets the signed-in customer; Eye Care's even says "Sign in or create an account" when signed in
- Clients and widths: both, every signed-in view, all widths.
- Evidence: `pair-ec-in-orders-1440.png` (signed in: "YOUR ACCOUNT / Sign in or create an account / You don't need an account..."); `pair-mm-in-orders-1440.png` ("my account / My account" against "your account / Hello, Aisha / Your next subscription bake is Mon 23 Nov."). Drafts: Mama's `Account.dc.html` `hello: a ? 'Hello, ' + first : 'My account'`, eyebrow `a ? 'your account' : 'my account'`; Eye Care's signed-in page is a different branch (`isAccount`): "My account / Hello, Aisha / Signed in as <email>". Mama's hand-finished heading carries exactly this fix: `metadata.bindings.content = { source: "sgs/customer", args: { key: "first_name", format: "Hello, %s" } }` over the typed "My account" (its eyebrow is the static "your account"); the from-blank heading has no binding.
- Cause: proved (code). The band is built from the signed-out state only: `data/template-pieces.json` `pages.account` sets no `dataBranches`, and no route code writes the `sgs/customer` binding (`includes/class-customer-binding.php`: `first_name` with `format "Hello, %s"`, falling back to the typed words when signed out) or `sgsConditionLoggedIn` (grep of `scripts/computed-route/lib`: only `template-piece-order.mjs` writes conditions).
- Layer and owner: route piece (this stream: the account piece, the twin of the order piece's binding and Show-to writes).
- Fix: set `dataBranches: true` on `pages.account`; in `lib/template-piece-account.mjs`, for each band text whose words differ between the signed-out and signed-in branches: bind it to `sgs/customer` `first_name` with the draft's sentence as `format` when the signed-in words contain the draft account's first name, else build both versions with `sgsConditionLoggedIn` `logged-out` / `logged-in`. Eye Care's "Signed in as <email>" has no `{email}` binding key: add `email` to `Customer_Binding::KEYS` (plugin, S) or use the block's own `headerAccountMeta` with `{email}`. Mama's "next subscription bake" line has no live source: a note (Bean's order-facts choice).
- Size: M.
- Depends on: nothing.
- Verify by: signed-in `clone-in.mjs` headings: Mama's "Hello, Sam", Eye Care's "Hello, Sam" and "Signed in as rc-customer@example.com"; signed out unchanged.
- Same cause elsewhere: any draft page whose words change with sign-in (header account label is the general session's).

### account-11: The details view is one long column with a display-name field and a pink theme button; the drafts draw a two-column card form (Mama's: two cards) with the site's yellow pill button
- Clients and widths: both, 1440 (one column at 375 is right).
- Evidence: `pair-mm-in-details-1440.png`. Mama's hand-finished sets `accountDetailsCards true`, `accountFormColumns "2"`, `accountDisplayFromNames true`, `accountMobileLabel`, and draws the save buttons (yellow pill, 2px border, hard shadow) in Custom CSS. Part-look `noSetting` on `accountSave`: background, colour, border, radius, shadow, padding; `accountForm` and `accountSection` type.
- Cause: proved (code and database). No mode rule reads the details form's columns, its two cards or the missing display-name field (`data/part-look-modes.json` writes only `accountShowMobile` and `accountShowMarketingOptIn`); `accountSave` is not a declared built-in button (block.json `supports.sgs.builtinButtons` lists signed-out, empty-state, login and register only).
- Layer and owner: part-look modes (this stream); block setting gap (plugin round: declare `accountSave`, the address save button and the lost-password button as built-in buttons so the kit's preset and look reach them).
- Fix: rules `accountFormColumns "2"` when two fields of the details form share a row, `accountDetailsCards` when the password fields sit in a second card, `accountDisplayFromNames` when the draft has no display-name field; builtinButtons entries `accountSave`, `addressSave`, `resetPassword`.
- Size: M.
- Depends on: account-5 for Eye Care.
- Verify by: `clone-in.mjs` edit-account: two-column grid, no `#account_display_name`, button background `#F9CF6E` on Mama's.
- Same cause elsewhere: nothing else.

### account-12: About 98 look settings of `sgs/account` have no part in the framework database, so part-look can never write them (the plan's "479 of 944" overstates it)
- Clients and widths: both.
- Evidence: database read (`block_attributes`, `sgs/account`): 1,066 settings, 603 with a part, 463 without; of those 132 are unit companions and about 233 are content, mode and behaviour settings that need no part; 98 are look settings with no part: the type families (font size, family, weight, line height, letter spacing, transform, decoration) of `addressTitle`, `addressText`, `addressEditLink`, `accountSection`, `authHeading`, `loginLink`, `loginRememberText`, `lostPasswordRow`, `privacyText`, `resetNoticeText` and `menu`, plus `headerAccountTitle`, `ordersRowTextDecoration`, `authPairBorderWidth`, `authPairCellBorderWidth`, `authPairCellRadius`, `resetFormBorderWidth`, `resetFormRadius`, `resetNoticeBorderWidth`, `accountFieldsetBorderWidth`, `privacyLink`.
- Cause: proved (block.json). Each family is painted by `sgs_typography_css_rule( $attributes, '<prefix>', <selector> )` in `includes/account/helpers-account-look-css.php`, but the matching `supports.sgs.elements` entry's `attrMap` lists only colour and box properties (for example `addressTitle`: colour, margin, padding), so the seeder gives the type rows no `css_property` or `css_element`.
- Layer and owner: block setting metadata (plugin round: `sgs/account` block.json elements' `attrMap`), then `/sgs-update`.
- Fix: add the type properties of each family to its element's `attrMap` (and elements for `authPair`, `authPairCell`, `resetForm`, `accountFieldset` with their border rows), reseed. A detector: every attribute painted through `sgs_typography_css_rule` with a prefix must have its family in an element's attrMap (migration-method; more than 3 files across blocks likely share this).
- Size: S (metadata) + the reseed.
- Depends on: nothing.
- Verify by: the same database query: look settings without a part 0 (unit companions and content excluded).
- Same cause elsewhere: hypothesis: other blocks painting families through `sgs_typography_css_rule` with prefixes not in their attrMap (prove with the detector).

### account-13: Mama's signed-out card shows "No account? You can check out as a guest.", which the draft does not draw
- Clients and widths: Mama's (and Eye Care, under the sign-in form), all widths.
- Evidence: `lab\shots\r5\pair-account-1440.part0.png`; Eye Care `out-probe.mjs`: `.sgs-account__guest-line`. Mama's hand-finished sets `showGuestLine false` (also `showQuickCards false`, `showLatestOrder false` for the dashboard it hides).
- Cause: proved (code). `render.php` prints the guest line unless `showGuestLine` is set false; the account piece writes only what the draft draws, never "absent" switches.
- Layer and owner: route piece (this stream: `lib/template-piece-account.mjs`).
- Fix: write `showGuestLine: false` when the account region holds no text outside the card and the forms; `showQuickCards`/`showLatestOrder` false when the dashboard endpoint is hidden (account-6) or the draft's first view is the orders list.
- Size: S.
- Depends on: nothing.
- Verify by: no `.sgs-account__guest-line` on either copy signed out.
- Same cause elsewhere: nothing else.

### account-14: Mama's addresses view is WooCommerce's billing and shipping pair; the draft draws saved address cards with Edit, Remove, Make default and an "Add an address" card
- Clients and widths: Mama's (Eye Care's draft draws delivery and billing cards with Edit and Add, closer to the block's own editor too).
- Evidence: `pair-mm-in-addr-1440.png`. Mama's hand-finished sets `addressEditor true`, `addressEditLabel`, `addressAddLabel`, `addressCardShadow "6px 6px 0 0"`; part-look reports a conflict on `addressCardShadow` (the default card has the shadow, the other does not).
- Cause: proved (code): no rule writes `addressEditor`; `buildLook` drops a property whose instances differ.
- Layer and owner: part-look modes (this stream).
- Fix: rule `addressEditor: true` when an address card holds two or more controls (edit and remove) or an add card is drawn; for the shadow, prefer the instance marked default (a known instance policy, `loc.instances`) or leave it as a reported conflict.
- Size: S.
- Depends on: account-2.
- Verify by: `clone-in.mjs` edit-address holds `.sgs-account__addr` cards and an add control.
- Same cause elsewhere: nothing else.

### account-15: WooCommerce's blue "Confirm your email address to check for past orders" notice shows on the orders view
- Clients and widths: both, all widths (Mama's shows it pink).
- Evidence: `pair-ec-in-orders-1440.png`, `pair-mm-in-orders-1440.png`. Mama's hand-finished restyles the banner in Custom CSS ("the account's info notice (WooCommerce's banner, no settings of its own)").
- Cause: hypothesis: WooCommerce shows it to a customer whose email is not confirmed (the seeded customer); prove by confirming the seeded customer's email on a scratch copy and reloading.
- Layer and owner: site data on the copy (the notice), and a block setting gap for its look (plugin round: `sgs/account` part `notice`: fill, border, radius, padding, type).
- Fix: none for the copy; the look settings in the plugin round.
- Size: S.
- Depends on: nothing.
- Verify by: the notice absent for a confirmed customer.
- Same cause elsewhere: the checkout's notices.

### account-16: Eye Care's pages are wider than the phone screen at 375 (604px) and 1440 (1567px)
- Clients and widths: Eye Care, every page tested (account, home).
- Evidence: `account\overflow3.mjs http://localhost:8125 /my-account/ 375`: scrollWidth 604 with the header, 375 with the header removed in the page.
- Cause: proved (in-page removal): the header, not the account block.
- Layer and owner: route rule (general: the header).
- Fix: the general session's header work.
- Size: n/a here.
- Depends on: nothing.
- Verify by: scrollWidth equals the viewport width.
- Same cause elsewhere: every Eye Care page.

### account-17: The sign-in forms differ in small parts: a narrow auto-width button, required asterisks, "Keep me signed in" and "Forgotten your password?" on two lines, and "Choose a password" lost
- Clients and widths: Eye Care (sign-in form beside the register form) and Mama's (`SignIn.dc.html` forms behind the card's buttons), all widths.
- Evidence: Eye Care draft: "SIGN IN" fills its form (409px of 409px) and "CREATE ACCOUNT" is a 1px outlined box of the same width; fresh clone: "Sign in" 119px wide, labels "Email *", "Password *", the remember tick and the lost-password link stacked (`account\out-probe.mjs`, `shots\account\pair-ec-out-1440.png`). The fresh rebuild's button is taupe with 8px corners because the chain's look pass (part-look) has not run on this build yet. Account piece notes on both fresh proposals: "the sign-in password field's label has no setting of the block", "the create-account password field's label ("Choose a password") has no setting", "...placeholder ("At least 8 characters") has no setting".
- Cause: proved (database and code). `loginButtonWidthType` and `registerButtonWidthType` paint `width` (database), a property `lib/fill-part-look.mjs` reports as unsupported, so `full` is never written; the block has no setting that hides WooCommerce's required marks or puts the remember row and the lost-password link on one row; `includes/account/class-account-strings.php::supported` has no key for the password labels or the register password placeholder.
- Layer and owner: part-look (this stream: read a button's width against its form's content width and write `<prefix>WidthType: full`); block setting gap (plugin round: `sgs/account` `hideRequiredMarks`, `loginRowInline`, strings keys `passwordLabel`, `registerPasswordLabel`, `registerPasswordPlaceholder`).
- Fix: as above.
- Size: S (part-look) + S (plugin).
- Depends on: account-4 (the register form and its password field).
- Verify by: `out-probe.mjs` on Eye Care: both buttons as wide as their forms, no `*` in labels, the remember row and the link on one line.
- Same cause elsewhere: the lost-password and reset forms.

### account-18: Mama's sign-in form fills half its card at 1440 (298px of 620px)
- Clients and widths: Mama's (tabs layout), 768 and 1440; 375 is right.
- Evidence: `shots\account\pair-mm-login-1440.png`; `account\tabs-cols.mjs` at 1440: the open panel `u-column1 col-1` is `float:left; width:297.6px` inside a 620px card, the hidden panel `float:right`; at 375 both are `float:none`, 315px. `login-fields.mjs`: form 298px, inputs 298px.
- Cause: proved (computed styles). In tabs layout `style.css` resets nothing on the two columns: the full-width rule is scoped `:where(.sgs-account:not([data-auth-layout="tabs"]))`, so WooCommerce's `.woocommerce .col2-set .col-1 { float:left; width:48% }` (its 769px-and-up sheet) holds.
- Layer and owner: plugin bug (this stream: `plugins/sgs-blocks/src/blocks/account/style.css`).
- Fix: `.sgs-account[data-auth-layout="tabs"] #customer_login > .u-column1, .sgs-account[data-auth-layout="tabs"] #customer_login > .u-column2 { float: none; width: auto; }`, in the same edit as account-2.
- Size: S.
- Depends on: nothing.
- Verify by: `tabs-cols.mjs` at 1440: the open panel as wide as the tabs row.
- Same cause elsewhere: every site with `authLayout: tabs` (render-scope on the three mirrors).

### account-19: Mama's sign-in page loses its band words and its "why have an account?" card and guest note
- Clients and widths: Mama's, all widths.
- Evidence: `shots\account\pair-mm-login-1440.png`: draft `SignIn.dc.html` "welcome back, mama / Sign in", the form card, a "why have an account?" card with three ticked reasons and a dashed "You don't need an account to order... Go to the shop →" note; clone `/my-account/?sgs-login=1`: "my account / My account", the form alone. Mama's hand-finished site gives the sign-in draft its own page `/sign-in/` (page 628 on `local-mamas`: band "welcome back, mama / Sign in", an `sgs/account` in form view, the reasons card and the guest note) and points the card's buttons at it (`signedOutSignInUrl /sign-in/`, `signedOutRegisterUrl /sign-in/?mode=register`).
- Cause: proved (proposal notes and code). The page map folds `SignIn.dc.html` into the account row, so the route reads only its forms' words (`lib/template-piece-account.mjs::place`, "the forms the buttons lead to") and never builds its other sections; the account page's band is built from `Account.dc.html` alone.
- Layer and owner: route (a page-map choice, the general session's intake; the piece is this stream's). Bean's choice between two shapes.
- Fix: recommended: the sign-in draft becomes its own page row (as the hand-finished site has it), built like any page with its `sgs/account` in form view; the account piece then writes the card's two addresses to that page (its existing "a link to another page" branch). Alternative: keep one page and build the sign-in draft's band and side sections onto the account page shown only on the sign-in view (`sgsConditionUrlParam` `sgs-login`), which also needs the card view's band hidden there.
- Size: M.
- Depends on: nothing.
- Verify by: the pair of `SignIn.dc.html` against the sign-in address at 375 and 1440 shows the band, the reasons card and the note.
- Same cause elsewhere: any draft whose sign-in page is its own file.

### account-20: Mama's account surface run fails at apply on two hover looks (button hover fill and hover shadow) the database has not calibrated
- Clients and widths: Mama's (the run's exit 1); Eye Care's apply passed with 0 ops.
- Evidence: fresh `logs\mamas-munches-redesign-my-account.log`: "failed: my-account apply: 2 ops, 2 no-setting, 2 unresolved ... a no-setting row names a setting the block has"; `sites\mamas-munches-redesign\build\qa\apply\no-setting-review.json`: Root/23#0 (the card's buttons) hover `background-color` "uncalibrated: sgs/account ordersRowBackgroundHover, loginButtonColourBackgroundHover, signedOutSignInColourBackgroundHover, signedOutRegisterColourBackgroundHover, emptyStateColourBackgroundHover, registerButtonColourBackgroundHover (hover) not calibrated", and hover `box-shadow` the same for the `...ShadowHover` rows; plus hover `transition-duration` and timing "no hover transition setting". The plan's names `loginButtonBackgroundHover` and `signedOutButtonShadowHover` are out of date: the button kit renamed them (`loginButtonColourBackgroundHover`, `signedOutSignInShadowHover`, ...).
- Cause: proved (the review file): Fill's apply places the draft card buttons' hover on the account block, and the paint cache holds no hover calibration for the block's hover rows, so it cannot tell which row paints it.
- Layer and owner: calibration (the main session: `calibrate.mjs` for `sgs/account` with hover states on the copy); the transition timing is a block setting gap (plugin round: the button kit's `<prefix>TransitionDuration` and `TransitionEasing`).
- Fix: calibrate `sgs/account`'s kit buttons' hover rows; the part-look kit already writes these hovers from the draft, so alternatively the apply could leave a node's parts part-look owns (a hypothesis to test: whether the apply's two ops then duplicate part-look's writes).
- Size: S (a calibration run).
- Depends on: nothing.
- Verify by: `clone-surface.mjs mamas-munches-redesign --surface my-account` ends with the apply passing.
- Same cause elsewhere: any shop block whose built-in buttons have a drawn hover.

## Hand-finished compared with from-blank

Mama's: `local-mamas` page 103 against `local-mediatest-trlab` page 103, the `sgs/account` block (read with `account\read-account.php`). Eye Care: `local-eye-care` page 9 and its `page-my-account` template, names only.

Eye Care's hand-built account is not a reference: its `sgs/account` holds only `className`, on the page and in its `page-my-account` template, and no site-wide Custom CSS mentions the account (`account\css-count.php`). Every Eye Care account value therefore comes from the draft, and the from-blank page already holds more account settings than the hand-built one. The band blocks around it use the same setting names on both sides apart from `sgs/hero.flexDirection` and `sgs/heading.textWrap` (hand-built only): band blocks, the general session's Fill.

Mama's: the hand-finished block holds 214 settings and 19,154 characters of Custom CSS; the from-blank block held 180 before the fresh rebuild (its fresh numbers are in "Fresh build"). Settings the hand-finished page uses that the from-blank page lacks, grouped by why the route did not write them:

| Group | Settings (hand-finished value) | Draft element | Why not written | Finding |
|---|---|---|---|---|
| Band greeting | `sgs/heading` binding `sgs/customer` `first_name`, format "Hello, %s" | "Hello, Aisha" | The account piece writes no binding or Show-to rule | account-10 |
| Menu shape | `hiddenEndpoints` [dashboard, saved-items, downloads, payment-methods], `menuOrder` [orders, edit-address, edit-account], `showMenuIcons` false, `menuOrdersCount`, `menuAddressesCount`, `menuAccountTick` true, `navLayout` sidebar/tabs/tabs, `navWidth` 260px | the nav "My account" and its four pill tabs with counts | No menu rule; the account piece leaves the menu to the block | account-6 |
| Menu current look | `menuActiveBackgroundColour` mm-yellow, `menuActiveTextColour` mm-cocoa | the current tab | Part-look skips every `current` state row | account-7 |
| Order page modes and words | `orderDetailProgress`, `orderDetailItems`, `orderDetailBoxes` true; `orderDetailTitle`, `orderDetailBackLabel`, `orderDetailPlacedText`, `orderStep*` and notes, `orderDetailAddressTitle`, `orderDetailItemsHeading`, `orderDetailShippingLabel`, `orderDetailShippingFreeText`, `orderDetailOrderAgain` with label and `When`, `orderDetailHelpText`, `orderDetailHelpLabel`, `orderDetailHelpUrlSource` post:148, `orderCompletedStep`, `trackColour`, `trackDoneColour`, `giftNote`, `giftNoteHeading` | the order page: step cards, "What you ordered", "Delivered to", "Order this again", "Something not right? Message Zainab" | No locators or rules for steps, items and boxes; no words pass | account-1, account-9 |
| Orders list | `ordersRowViewLabel`, `ordersRowViewIcon` arrow-right, `viewOrderLabel`, `ordersRowItemCount` and its two wordings, `ordersDateFormat`, `ordersTabHeading` "Your orders", `ordersRowTextDecoration`, `ordersSummaryFontSize`/`Weight`, `ordersPillTextTransform`/`LetterSpacing`, `ordersPillProcessingBackground`/`Text` | the order cards | Words pass missing; `ordersRowTextDecoration` has no database part | account-8, account-9, account-12 |
| Order data words | `ordersNumberPrefix` "MM-", `orderStatusLabels` {processing: Baking soon, completed: Posted} | the draft's sample order numbers and status names | The draft's sample data: Bean's choice whether a clone takes them, not a fault | open choice |
| Addresses | `addressEditor` true, `addressEditLabel` "Edit", `addressAddLabel` "Add", `addressCardShadow` and colour, `addressTitle` type family | the address cards and the add card | No `addressEditor` rule; shadow instances conflict; title type has no database part | account-14, account-12 |
| Details | `accountDetailsCards`, `accountFormColumns` "2", `accountDisplayFromNames`, `accountMobileLabel`, `accountMarketingOptInLabel`, `accountFieldsetBorderWidth`/`Padding`/`Margin`, `strings.passwordChange`, `currentPasswordLabel`, `newPasswordLabel`, `updatePassword` | the two detail cards | No rules for the form's columns and cards; words pass missing | account-11, account-9 |
| Signed-out card and forms | `signedOutSignInUrl` /sign-in/, `signedOutRegisterUrl` /sign-in/?mode=register, `signedOutButtonGap`, `signedOutButtonMinHeight`, `signedOutButtonShadowHover`, `showGuestLine` false, `showQuickCards` false, `showLatestOrder` false, `labelPosition` above, `labelFontSize`, `fieldMinHeight`, `fieldPlaceholderColour`, `resetForm*` | the card's two buttons; the sign-in page's forms | The URLs are rightly unwritten: the hand-finished site has its own `/sign-in/` page, the from-blank page map folds the sign-in page into the account row, so the block's own form view serves both buttons. `showGuestLine` and the dashboard switches: account-13. Button gap, height and hover shadow are look reads the chain's part-look pass writes | account-13 |

The from-blank block holds 76 settings the hand-finished one does not (the forms' tab layout and labels read from the sign-in draft's tabs, the register switches, the page-header type and `loginButton*` looks); none contradicts the draft.

Mama's hand-finished Custom CSS (19,154 characters, about 110 rules), by whether a setting now carries it:

| Look | Rules | A setting exists? |
|---|---|---|
| Menu item pill border and hard shadow; the current item's border and shadow | 3 | No: account-7's `menuItem` border, fill and shadow settings |
| Sign-out link as a pill | 1 | No: a `menuLogout` part (border, radius, fill, shadow, type) |
| Count badge (round dark badge) | 1 | No: `menuCount` fill, size and radius (only its type and colour exist) |
| Orders as separate cards: gap, border, corners, hover lift and shadow, grid placement of number, status, date, summary and actions, thumbnail border and corners, the view button and its hover | 14 | No: account-8's `ordersRows` settings, `orderThumbs` border and radius, the view button as a declared built-in button, and a card layout value for the row's grid |
| Status pill border and corners (list and order page) | 3 | No: `ordersPill` and `chip` border width, style, colour, radius |
| Save, address-save and reset buttons (yellow pill, border, shadow) | 4 | No: account-11's built-in buttons |
| Lost-password form rows forced full width | 1 | No, and it is a plugin bug: WooCommerce's `form-row-first/last` floats inside the block's form; reset them in `style.css` with account-2's fix |
| Address card layout: edit link under the lines, bold first line | 7 | No: `addressEditPosition` (top, bottom) and `addressFirstLineWeight` |
| Order page: two-column grid, head grid, steps as cards with icons, done and current looks, step notes, items card, boxes, totals rows, help row as a dashed card, order-again card and link | about 40 | Partly: `trackColour`, `trackDoneColour`, `progressStep*` type exist. Missing: step card border, radius, fill, done fill, current shadow; an icon per step (the four `background-image` data URLs are a true one-off unless the block takes an icon per step); items and box border, radius, fill, padding; the help row's card look; the order-again link as a built-in button; the page's two-column layout |
| Gift note card: tilted, taped, handwriting font | 6 | No for the card's fill, border, radius, padding and font (`giftNote*` look settings); the tilt and the tape are a true one-off |
| Account details as one bordered card, password section in two columns, opt-in row, white fields | 12 | Partly: `accountDetailsCards` and `accountFieldset*` exist; missing: the edit card's radius and padding and the password section's columns; `fieldBackground` exists but paints every form, where the hand-finished page whitened only these fields |
| WooCommerce notice banners (the info notice and its "Confirm email address" link) | 7 | No: a `notice` part on the block (account-15) |

Every "No" row is a plugin round item on `sgs/account`; together they are the looks the 19,154 characters stand in for.

## Fresh build (today's main, rebuilt 21:23 to 21:45)

- Eye Care `my-account`: built and applied (apply 0 ops); the walk was still running when this file was written. Fresh block holds 7 settings (the account piece's words only); `woocommerce_enable_myaccount_registration` stays `no`, so the page shows the sign-in form alone (account-4 confirmed). Signed in: WooCommerce's seven menu items with icons, a table of orders, WooCommerce's plain order page, the broken addresses grid, and the band reading "Sign in or create an account" (account-2, 6, 8, 10 confirmed; `shots\account\ec-fresh-in-*`).
- Mama's `my-account`: built; the run fails at apply (account-20) and at `gate-chain` (the known worktree fault: it reads `build/trees/page/my-account.json`, the general session's). Fresh block holds 18 settings, every one matching the draft (signed-out card words, the forms' tabs and words). Signed in: eight menu items, WooCommerce's plain order page (part-look has not yet written `orderDetailLook`; once it does, the page empties as in account-1, which is what the earlier build on the same code showed), the addresses grid fault (account-2) on the fresh page.
- Not yet run when this file was written: the chain's part-look passes (`*-pl-my-account.log`, `*-pl-my-account-in.log`; Mama's was on the product surface, Eye Care's had not started). Every look finding (account-7, 8, 11, 12, 17) is proved from the code, the database and part-look's own draft-only reports (`account\pl-mm-in\report.json`, `account\pl-ec-in\report.json`), which the write pass does not change. Re-check after the passes: `node account\clone-in.mjs <origin> <prefix> <order path> 375,1440 after` and `node account\out-probe.mjs <origin> 1440` on each copy, and Eye Care's `pl-my-account-in` log should still say "names no sign-in page" (account-5).

## Pictures and probes

Pictures (`E:\sgs-tmp\template-rework\investigation\shots\account\`):
- Drafts, signed in, each view at 375 and 1440: `ec-draft-in-{orders,subs,addr,wish,details,order}-{375,1440}.png`, `mm-draft-in-{orders,subs,addr,details,order}-{375,1440}.png`; signed out: `ec-draft-out-*`, `mm-draft-out-*`, `mm-signin-draft-out-*`.
- Pairs (draft left, clone right): `pair-ec-out-{375,1440}.png` (fresh), `pair-mm-out-*`, `pair-mm-login-*` (fresh), `pair-{ec,mm}-in-{orders,order,addr,details}-{375,1440}.png` (the copies before the fresh rebuild; the fresh signed-in pictures are `ec-fresh-in-*` and `mm-fresh-in-*`).
- Clone signed-in views with their DOM summaries: `{ec,mm}-clone-in-*.png` and `*-cur.json`, `{ec,mm}-fresh-in-*.png` and `*-fresh.json`, `pre-mm-clone-in-*`.

Probes and reads (`E:\sgs-tmp\template-rework\investigation\account\`), all read-only:
- `draft-in.mjs` (draft signed-in views), `draft-out.mjs` (draft signed-out pages), `clone-in.mjs` (clone signed-in views, menu, item and order-row styles), `out-probe.mjs` (signed-out layout, buttons, extra lines), `addr-probe.mjs` and `addr-probe2.mjs` (address grid and the winning WooCommerce rules), `login-pseudo.mjs` and `login-pseudo2.mjs` (the clearfix pseudo-element and the in-page side-by-side test), `tabs-cols.mjs` and `login-fields.mjs` (tabs layout column widths), `ec-probe-fns.mjs` (part-look's signed-in functions on Eye Care's draft), `overflow*.mjs` (page width), `read-account.php`, `read-template.php`, `read-page.php`, `css-count.php` (WP-CLI reads; Eye Care's with `SGS_NAMES_ONLY=1`).
- Saved reads: `local-mamas-account.json`, `local-mediatest-trlab-account.json` (before), `fresh-trlab-account.json`, `local-mediatest-trec-account.json` (before), `fresh-trec-account.json`, `local-eye-care-account-names.json`, `local-eye-care-tpl-names.json`, `mamas-hand-customcss.css`.
- Part-look draft-only reports: `pl-ec-in\report.json`, `pl-mm-in\report.json` (`part-look.mjs --surface my-account-in --out ...`, no site).
