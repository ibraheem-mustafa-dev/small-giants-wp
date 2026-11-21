# Order confirmation: investigation (2026-11-21 night)

- Mama's: far from passing. Tonight's rebuild never read the draft: `clone-surface.mjs` built the confirmation as a copy of the page shell around the theme's own WooCommerce content and reported "every stage ran and passed", so every order now shows WooCommerce's stock "Order received" table (pairs `shots\confirmation\pair-mm-*`). The route's last real build of this page (2026-11-19/20, still in `lab\shots\states-t4\`) was close; once rebuilt it will still stop at propose on the account eyebrow (confirmation-2).
- Eye Care: far from passing. The rebuild refused at propose, as expected (the draft writes the order number as fixed words), so the copy serves the theme's stock page; even after that is fixed, the signed-in "View my orders" button and its note would be missing (confirmation-5).
- Worst problem: Mama's confirmation silently falls back to the stock page because its intake record predates the rule that reads the confirmation as a page. 11 findings (two of them are header and footer faults owned elsewhere, listed last).

Pictures are under `E:\sgs-tmp\template-rework\investigation\shots\confirmation\`; `pair-*.png` puts the draft on the left and the copy on the right.

### confirmation-1: Mama's confirmation is WooCommerce's stock "Order received" page in every state
- Clients and widths: Mama's, 375 and 1440, every order state.
- Evidence: log `logs\mamas-munches-redesign-template-order-confirmation.log`: "finalise - no skeleton of its own (a copy reads no draft)", "copy order-confirmation", then "every stage ran and passed", exit 0. The built tree `sites\mamas-munches-redesign\build\trees\template\order-confirmation.json` (21:41, 1,028 bytes) is header, a `main` container, the template part `sgs-order-confirmation-content` and footer. Live: `pair-mm-owner-1440.png`, `pair-mm-gift-owner-*.png`, `pair-mm-guest-*.png`; probe `shots\confirmation\mm\probe.json` (owner 5998: "Order received", the WooCommerce table; page 2,345px against the draft's 2,867).
- Cause: proved. `sites/mamas-munches-redesign/build/surfaces.json` (main and lab alike) holds `template-order-confirmation` as `copy: { from: "page", unplayed: "template:order-confirmation" }` with no `draftIndex` or `intakeSurface`. The manifest dry run (`node scripts/computed-route/manifest.mjs mamas-munches-redesign --site local-mediatest-trlab --only template-order-confirmation`, no `--apply`) matches the handoff record S-32 ("result", Confirmation.dc.html) and then says "no-intake-surface template-order-confirmation: no intake skeleton has the id S-32". Mama's `build/intake/intake.json` was last written by `7b0290ad1` (2026-11-16), before `22a7e34ff` (2026-11-19 17:28), the change that makes intake read a result record with its own page key as a page (`lib/intake-skeletons.mjs::surfaceRoots`); its skeletons have no confirmation entry. With no record matched to a skeleton, `lib/manifest-build.mjs::buildManifest` turns the row into a page-shell copy. The good 2026-11-19 build came from a one-off `intake.mjs --surfaces S-32` in the lab, later overwritten when the intake was copied back from the shared checkout.
- Layer and owner: site data on the copy (a stale intake record), plus a route rule gap (general session: intake and manifest). Nothing stops a template with a matched draft record from quietly becoming a stock copy.
- Fix: (a) re-run intake for Mama's on today's main and commit it, then run `manifest.mjs mamas-munches-redesign --only template-order-confirmation --apply` and `clone-surface.mjs` on the surface. (b) Make a matched draft record with no intake skeleton a failure, not a copy: in `lib/manifest-build.mjs::buildManifest`, a `fill` copy whose row matches a record (`matchRecord(...).record`) but has no intake skeleton should be a `noIntake` refusal that `clone-surface.mjs` stops on. Today the copy path runs only when no record matches, and an earlier entry left as a copy is kept.
- Size: S for (a), mostly run time; S for (b).
- Depends on: nothing for (a). After (a), the build stops at propose on confirmation-2 unless that lands first.
- Verify by: the log shows inventory, propose and Fill for the surface, not "a copy reads no draft". The owner page 5998 shows "Order 5998." in the pink hero and the "What's coming" card with the Zookies line at 375 and 1440.
- Same cause elsewhere: any client whose intake predates `22a7e34ff`. Indus has no confirmation draft; Eye Care's intake has `page-done`.

### confirmation-2: Words the draft picks by an order fact cannot be cloned, so Mama's build is refused and Eye Care's would show the wrong sentence
- Clients and widths: Mama's (the account eyebrow, "your account is ready" or "all in one place"); Eye Care (the note, which differs for collection and delivery, and the account note, which differs for a new or an existing account). All widths.
- Evidence: an offline read with today's reader on Mama's draft (`investigation\confirmation\order-read.mjs`) leaves one problem: "the value {{ acctEyebrow }} (Confirmation/57) chooses fixed words by the order's createAccount: no binding key or Show-to rule holds that choice". Eye Care's draft: `doneNote: S.co.method === 'collect' ? 'I'll WhatsApp you…' : 'Confirmation is on its way…'` and `doneAccountNote: S.lastOrder.created ? 'Your account is set up…' : 'It is saved in My account…'`. Eye Care's skeleton (`build/skeleton/template-order-confirmation.skeleton.json`) keeps the delivery sentence as fixed words (Root/846), and the reader raises no problem for it (`order-read2.mjs eye-care-ward-end "Eye Care Birmingham"`: no holes), so a collection order would read "Frames post within one working day".
- Cause: proved. `plugins/sgs-blocks/includes/conditional-visibility.php` offers the order Show-to rules `order-owner`, `order-guest`, `order-has-gift`, `order-no-gift`, `order-viewable` and `order-not-viewable`. None is true only when the account was made at checkout, and none tests collection against delivery. In `lib/template-piece-order-read.mjs::readOrder`, a choice the logic makes by an order field is a problem row (Mama's). Eye Care's choice reads `this.state` (`S.co`, `S.lastOrder`), which the reader does not count as the order, so the static words pass unflagged.
- Layer and owner: block setting gap (plugin round: Show-to rules on every SGS block, `sgsConditionLoggedIn`). Route piece (this stream: `lib/template-piece-order-read.mjs`, which must split each choice into one block per branch). Eye Care's half also depends on confirmation-5's state reading.
- Fix: add Show-to rules `order-account-created` (the customer's account was made with this order: the user's registration time is within a few minutes of the order's creation, or WooCommerce's `_wc_order_attribution_*`/checkout-created flag where present; the cause must be checked against a real checkout-made account) and `order-collect` / `order-delivery` (the order's shipping lines hold only a local pickup method). In the reader, a value choosing between two fixed phrases by one order field with a rule becomes two sibling blocks, each with its phrase and rule.
- Size: M.
- Depends on: nothing; Eye Care's part also needs confirmation-5.
- Verify by: Mama's propose has no problems; a guest order made with "create account" shows "your account is ready", an existing customer's shows "all in one place"; on Eye Care a collection order shows the WhatsApp sentence.
- Same cause elsewhere: any confirmation draft whose copy changes with how the order was placed.

### confirmation-3: Eye Care's confirmation is refused because its draft writes the order number as fixed words, so the copy shows WooCommerce's stock page
- Clients and widths: Eye Care, 375 and 1440, both states.
- Evidence: `logs\eye-care-ward-end-template-order-confirmation.log`: propose FAIL, 'the draft writes the order reference "EC-10482" as fixed words in <h1> Eye Care Birmingham/845 ("Thank you — order EC-10482.")', and 'the working piece "order-number" is missing'; exit 1. Pairs `shots\confirmation\ec\pair-ec-default-*.png` and `pair-ec-with-account-*.png` (draft: centred tick disc, heading, note, two buttons; copy: "Order received" with the stock table and addresses; 1,299px against 1,057 at 1440). The hand-built site's page binds its heading (it uses `sgs/heading` with `metadata`), so it took "EC-10482" as the order number.
- Cause: proved. In the draft the heading is the literal `Thank you — order EC-10482.`, and the only other place that string appears is `placeOrder`'s `const order = {id:'EC-10482', …}`, the record that action stores in `placed`.
- Layer and owner: draft defect (the general session's Claude Design instructions), with a route alternative in this stream.
- Fix: two options. (A) Re-export the draft with the heading reading the order's id, under the general session's Claude Design instruction; this waits on a new export. (B) Recommended, because it does not wait on a draft and works for any single-file draft that hardcodes its own sample order: in `lib/template-piece-order-read.mjs::readOrder`, a fixed literal in the confirmation that equals, character for character, the sample value of the reference field of the record the order action creates (here `order.id`, set in `placeOrder` and pushed to `placed`) is that field, bound to `number` with the surrounding words as `format`. A literal equal to no order record's field stays a problem. This is evidence from structure, not a guess.
- Size: S for (B) with its failing-first test; (A) is a draft round.
- Depends on: nothing.
- Verify by: propose passes; order 455 viewed by `rc-customer` shows "Thank you — order 455." centred, with the note and "Back to the shop", at 375 and 1440.
- Same cause elsewhere: none known.

### confirmation-4: A visitor who may not see the order (a guest after 10 minutes, a wrong key, the owner signed out) gets the full thank-you page with no order and no way to see it
- Clients and widths: Mama's, both widths (the route's build of 2026-11-19/20; tonight's stock copy shows WooCommerce's own form instead). Eye Care's route build would do the same.
- Evidence: `E:\sgs-tmp\template-rework\lab\shots\states-t4\guest-1440.png` (guest order 6059, 13 hours old): the hero "Your order's in. Zainab's warming the oven.", the bake pill, the four steps, an empty "What's coming" box and the footer cards, but no order number, no lines, no form and no message. WooCommerce's stock page for the same order (`shots\confirmation\mm\mm-guest-6059-1440.png`) shows "confirm the email address linked to the order below" with an email field. The hand-finished Mama's page (`local-mamas` template 219) handles it with `woocommerce/order-confirmation-status` in a card, a second heading "Let's find your order." and text on `sgsConditionLoggedIn: order-not-viewable`, with the hero script line, title, reference, pill, steps and two-column cards all on `order-viewable`.
- Cause: proved. `scripts/computed-route/data/template-pieces.json` `templates.order-confirmation` names only `order-number` and `order-items`, so nothing places the status block, the one block that holds WooCommerce's email-check form and its "Log in here" link. In `lib/template-piece-order.mjs`, `placeValues` and `ruleOrderCards` give `order-viewable` only to bound blocks and to containers holding nothing but order blocks, so the static hero, pill and steps stay visible.
- Layer and owner: route piece (this stream: the pieces map and `lib/template-piece-order.mjs`), plus a block setting gap (plugin round: the look of the status block's form).
- Fix: add a required piece `order-access` (kind `order`, `find: "order-access"`). It places `woocommerce/order-confirmation-status` in a container with `order-not-viewable` at the top of the confirmation's main, and gives `order-viewable` to every top-level section of the draft's confirmation content (the page reads as a thank-you only to someone who may see the order). The not-viewable heading words are a fixed framework default when the draft draws no such state. Plugin round: the status block needs SGS look settings for its heading, field, label, button and link (today Mama's carries about 1.5 KB of Custom CSS on `oc-status` for this), or an SGS wrapper block that renders the same form through the button kit and field tokens.
- Size: M.
- Depends on: confirmation-1 (to see it on Mama's copy).
- Verify by: `investigation\confirmation\probe.mjs` with `mm-states.json`: the guest past grace and the wrong-key states show only the status card (field and button for the guest, "Log in here" for a member's order) and no hero or steps; the owner with the right key sees no status card.
- Same cause elsewhere: every route-built confirmation (Eye Care once confirmation-3 is fixed).

### confirmation-5: Eye Care's signed-in "View my orders" button and "It is saved in My account" note are never read, so they would be missing even after confirmation-3
- Clients and widths: Eye Care, the `with-account` state, both widths.
- Evidence: `sites\eye-care-ward-end\build\skeleton\template-order-confirmation.inventory.json` holds 6 elements (Root/843 to 846, 849, 850); the account note (`sc-if doneHasAccount`, Root/847 and 848) and the second button (Root/851 and 852) are absent. The draft pair `ec\pair-ec-with-account-1440.png` shows both. The hand-built site uses `sgsConditionLoggedIn` on that note and on that button.
- Cause: proved. `lib/skeleton-data-branches.mjs` forces only branches whose test "reads no state, no props and no method of the component". Eye Care's `doneHasAccount` is `!!(S.lastOrder && (S.lastOrder.created || S.lastOrder.signedIn))`, which reads `this.state`. The surface's `states` entry `with-account: null` in `surfaces.json` carries no state keys, so no other read reaches it either.
- Layer and owner: route piece (this stream: `lib/skeleton-data-branches.mjs`, the template's data branch reader).
- Fix: on a template that sets `dataBranches`, also force a branch whose test reads state written only by the order action (here `lastOrder`, set solely in `placeOrder`, which then navigates to `done`): that state is the order's own data in a one-file draft. Then the order branch reader (`readOrder` branches) maps `lastOrder.signedIn || created` to `order-owner`. A state set by any ordinary click stays as today.
- Size: M.
- Depends on: confirmation-3 (the surface must pass propose); the wording choice inside the note is confirmation-2.
- Verify by: the inventory holds Root/847, 848, 851 and 852; the clone shows "View my orders" and the note for `rc-customer`, and neither for a guest order.
- Same cause elsewhere: any one-file draft whose confirmation reads the order from component state.

### confirmation-6: Facts the site must supply (Mama's bake date and arrival day) render as an empty pill and a step card with no words, and only code can supply them
- Clients and widths: Mama's, both widths, every viewable order.
- Evidence: today's reader (`order-read.mjs`) binds `fact:bake_arrive`, `fact:bake_date` and, in the steps loop, `fact:bake_date` with format "Zainab bakes it fresh on %s". No site answers the `sgs_order_fact` filter, so each binding is empty. `lib/template-piece-order.mjs::ruleOrderCards` rules a container only when every child is order-bound, and the pill also holds its ✦ icon disc, so the pill stays as a bordered pill with only the icon. Likewise the "Baking" step keeps its icon and title with no line under it. `plugins/sgs-blocks/src/blocks/heading/render.php` prints its tag even when `content` is empty (`sgs/text` stops on empty text: `render.php` "Soft-fail: nothing to render if text is empty"), so a bound heading would leave an empty heading. The hand-finished page replaced the pill's words with fixed ones ("Baked fresh for your order · with you in 3 to 5 days") and has no dates.
- Cause: proved in code (`Order_Binding::get_value` returns '' for an unanswered fact; `ruleOrderCards`' `onlyOrder` test). The live render cannot be seen because the surface is not built (confirmation-1).
- Layer and owner: plugin (this stream: order blocks) and route piece (this stream).
- Fix: (a) A fact must be settable without code (the non-negotiable that clients never touch code): add a site setting for each fact the route binds, written by the route as the draft's sample shape (for example a "bake day" rule or plain text). The filter stays as an advanced hook. This is Bean's choice; the other option is the route writing the draft's sample words as fixed text, as the hand-finished page did. (b) A container whose only words come from bound blocks takes a "hide when its bound text is empty" behaviour: a Show-to rule `order-fact-present` or a container option. (c) `sgs/heading/render.php` stops on empty content like `sgs/text`.
- Size: M (a), S (b), S (c).
- Depends on: confirmation-1 to see it live; Bean's choice on (a).
- Verify by: with no fact set, the pill and the step line disappear entirely; with the setting filled, the pill reads "Baking on <day> · with you from <day>".
- Same cause elsewhere: any draft date or estimate no WooCommerce field holds.

### confirmation-7: The order lines card has none of the draft's look: thumbnail frame, type sizes, dashed rule and serif total
- Clients and widths: Mama's, both widths (route build of 2026-11-19/20).
- Evidence: the route's saved `sgs/order-items` (`investigation\confirmation\mamas-tpl-before.html`, the template as built 2026-11-19 18:12) holds only `showSubtotal`, `showDelivery`, `showDiscount`, `showGiftCard` and `totalLabel`. The hand-finished `local-mamas` block holds 20 look settings, all present in the block: `itemNameFontSize` 15, `itemNameFontWeight` 700, `itemNameColour` mm-cocoa, `itemMetaFontSize` 13, `itemMetaColour` mm-muted, `itemPriceFontSize` 16, `itemPriceFontWeight` 700, `itemPriceColour` mm-cocoa, `totalsFontSize` 16, `totalsFontWeight` 700, `totalsColour` and `totalColour` mm-cocoa, `rowGap` 12px, `thumbWidth` and `thumbHeight` 56px, `thumbFit` cover, `thumbRadius` 12px, `thumbBorderWidth` 2px, `thumbBorderStyle` solid and `thumbBorderColour` mm-cocoa. These come from the draft's line row (Confirmation.dc.html "What's coming" loop: 56px tile, 12px radius, 2px #3A2A22 border; name 700 15px; variant 13px #5E4A3D; price `<b>`) and its Paid row. The route's own note says "the look of its rows … is not read from the draft, so the block shows its own until a look is set".
- Cause: proved. `scripts/computed-route/data/part-locators.json` has no surface for `sgs/order-items` (its surfaces are cart, checkout, my-account, my-account-in, header, product and shop), so part-look never writes this block. Settings still missing in the block: the totals' top rule (dashed 2px, colour, padding-top), the total value's font family and size, and the row padding and vertical alignment. These are what the hand-finished `oc-items-list` Custom CSS carries. The same note says the `thumbHeight` setting loses to WooCommerce's `.woocommerce img { height: auto }` on this page: hypothesis, to be proved by setting `thumbHeight` on a copy and reading the image's computed height.
- Layer and owner: part-look (this stream: a `confirmation` surface in `part-locators.json` for `sgs/order-items`'s parts), plus a block setting gap (plugin round: `sgs/order-items`, part `totals`: `totalsBorderTop` width, style and colour, `totalsPaddingTop`; part `total`: `totalFontFamily`, `totalFontSize`; part `row`: `rowPadding`, `rowAlignItems`).
- Fix: add the locators and the missing settings, and raise the thumbnail rule's specificity if the hypothesis holds.
- Size: M.
- Depends on: confirmation-1.
- Verify by: part-look's verify on the confirmation compares each part's computed font, size, colour, thumbnail box and totals rule with the draft at 375 and 1440.
- Same cause elsewhere: Eye Care's draft draws no order lines on its confirmation (the reader's note), so Mama's only.

### confirmation-8: Round icon discs come out as ovals, one step has the wrong icon, and the hero badge and discs carry leftover Custom CSS
- Clients and widths: Mama's, both widths (known; confirmed on the route build of 2026-11-19/20, not rebuilt tonight).
- Evidence: `lab\shots\states-t4\guest-1440.png`: the ✓ badge and the step icons are wide pills, and "With you" shows a star where the draft has ♥. The route build makes each disc an `sgs/text` with `borderRadius`, `borderWidth` and `customWidth`, with Custom CSS "Residual (no setting holds it): font-weight, height" (40px) and "height" (56px). The hero is an `sgs/hero` with Custom CSS `.sgs-hero__content { max-width: 900px }` ("Residual: max-width"). The hand-finished page uses `sgs/icon` with `shape` circle, `shapeSize`, `iconSource` emoji, `emojiChar`, `showBackground`, `backgroundColour`, `borderWidth`, `borderStyle` and `borderColour` (the ✓ badge also `boxShadow` and `boxShadowColour`), and plain `sgs/container`s with `maxWidth` 900px for the hero, so no Custom CSS is needed.
- Cause: proved for the block choice (saved attributes). Why the disc rule picks `sgs/text` over `sgs/icon` is not traced here: hypothesis, the disc rule takes a glyph in a bordered square as text; prove by reading the proposal row for Confirmation/24's span.
- Layer and owner: route rule (general session: icon discs, icon choice, hero content width).
- Fix: a fixed-size round box holding one glyph becomes `sgs/icon` with `shape: circle` and the glyph as `emojiChar` (♥ kept as an emoji, not mapped to a named icon). The hero's centred 900px column becomes a container `maxWidth` or the hero's own content width.
- Size: M.
- Depends on: confirmation-1.
- Verify by: each disc's computed width equals its height (40, 56 and 110px); "With you" shows ♥; no Custom CSS on the template (`grep sgsCustomCss`).
- Same cause elsewhere: every page with icon discs (Mama's home and product steps).

### confirmation-9: The draft's whole-card links are only partly links: the view-order, taster and create-account cards link only from their small arrow text
- Clients and widths: Mama's, both widths (route build of 2026-11-19/20).
- Evidence: in the draft, all five cards are `<a>` wrapping the whole card. The route build gives `sgsBlockLink` to the Instagram and "Back to the kitchen" cards only. The Taster Trio, view-order and create-account cards hold an `sgs/button` ("Send one →", "View order →", "Create an account →") and no block link. The hand-finished page stretches each button's link over its card with Custom CSS (`oc-taster`, `oc-view-order`, `oc-account`), noting for view-order that "the card's own link setting cannot hold" an address bound to the order.
- Cause: partly proved. View-order: `sgsBlockLink` is a fixed address and cannot take the `sgs/order` `view_url` binding, so the route put the binding on the inner button (`lib/template-piece-order.mjs::placeValues` note "only that block links to the order"). Taster and account cards: hypothesis. The card-link rule may refuse a card that also turns its trailing words into a button; prove by reading those cards' proposal rows.
- Layer and owner: block setting gap (plugin round: `sgs/container` block link takes a binding, or a button setting "link covers its card"); route rule (general session) for the two fixed-address cards.
- Fix: let `sgsBlockLink` accept a `metadata.bindings` source (then the order piece binds `view_url` on the card), and make the card rule give a whole-card link to an `<a>` card whose trailing words stay text.
- Size: M.
- Depends on: confirmation-1.
- Verify by: clicking anywhere on each card follows its link; each card is one tab stop with a visible focus ring.
- Same cause elsewhere: any card-shaped link whose address is bound.

### confirmation-10: In the editor, every order-bound text shows only "1234", and the site-supplied facts cannot be picked
- Clients and widths: the editor, every client.
- Evidence: `plugins/sgs-blocks/src/bindings/order.js::getValues` returns '1234' for every bound attribute, ignoring the binding's `key` and `format`. So Mama's "Order %s. We've emailed your receipt…" line, "Dear %s," and the gift note all read "1234" in the editor, and the sample values in `FIELDS` are never used. `getFieldsList` lists only the 15 built-in keys, with no `fact:` entries.
- Cause: proved (code).
- Layer and owner: plugin bug (this stream: order blocks).
- Fix: `getValues` returns `format` with `%s` replaced by `FIELDS[key].sample` (a `fact:` key shows its name in brackets, `{fact:x}` tokens likewise). `getFieldsList` adds each `fact:` key found in the post's bindings, or a free-text field.
- Size: S.
- Depends on: nothing.
- Verify by: opening the confirmation template in the editor shows "Order 1234. We've emailed…" and "Dear Aisha,".
- Same cause elsewhere: none.

### confirmation-11: Words the draft's logic joins to a built-in order value are dropped (for example "Order #" + number)
- Clients and widths: none in today's drafts (latent).
- Evidence: `lib/template-piece-order.mjs::placeValues` puts the logic's joined words (`h.logicFormat`) into the format only when the value is a fact: `text.replace( hole, () => ( h.fact && h.logicFormat ? h.logicFormat : '%s' ) )`. A built-in key gets bare `%s`, so `{{ ref }}` with `ref: 'Order #' + o.no` would render just the number. Today's drafts hit it only on Mama's `orderHref` ('Account.dc.html?order=%s'), where dropping the words is right because the bound link replaces the whole address.
- Cause: proved (code).
- Layer and owner: route piece (this stream).
- Fix: use `logicFormat` for any text value, keeping bare `%s` for `attr:href`.
- Size: S.
- Depends on: nothing.
- Verify by: a failing-first test with a draft value `'Order #' + o.no` producing format "Order #%s".
- Same cause elsewhere: none.

### Faults seen on this page that belong to other streams (not counted above)
- Eye Care, every page: the page is wider than the screen (1,567px at 1440 and 604px at 375, from the header's top strip); the header's "BAG" label is invisible at 375; the draft's green "Ask me anything" WhatsApp button renders as an empty black pill (`ec\pair-ec-default-1440.png`, bottom right); the footer shows two grey arrow buttons where the draft has social icons. General session (header, footer).

## Settings comparison with the hand-finished pages

Mama's (`local-mamas` template 219, values read) against the from-blank copy. Tonight the copy holds none of these, because it is the stock page (confirmation-1); the "route build" column is what the route wrote on 2026-11-19 (`mamas-tpl-before.html`).

| Hand-finished setting (value) | Draft element | Route build | Why, and finding |
|---|---|---|---|
| `sgs/icon` `shape` circle, `shapeSize`, `emojiChar`, `iconSource` emoji, border and fill (badge, pill icon, step icons) | the ✓ badge, ✦ pill span, step icon spans | `sgs/text` with radius and `customWidth`, plus Custom CSS for height | disc rule picks text (confirmation-8) |
| hero `maxWidth` 900px on a container | hero inner div `max-width:900px` | `sgs/hero` with Custom CSS max-width | confirmation-8 |
| `sgsConditionLoggedIn` `order-viewable` on hero script, title, pill, steps, two-column row; `order-not-viewable` heading and text; `woocommerce/order-confirmation-status` | none (no not-viewable state drawn) | only the bound reference line had `order-viewable` | confirmation-4 |
| `sgs/order-items` 20 look settings (listed in confirmation-7) | "What's coming" loop and Paid row | none | no part-look surface (confirmation-7) |
| `metadata` binding `number` with format | `Order <b>{{ no }}</b>.` paragraph | same binding (bold lost: a bound value is plain text) | matches; bold is a known framework gap |
| `gift_to` "Dear %s,", `gift_message`, `view_url` bindings | gift note, account card link | same | matches |
| pill words fixed "Baked fresh for your order · with you in 3 to 5 days" | `Baking on <b>{{ bakeDate }}</b> · with you from {{ arrive }}` | today: `fact:` bindings, empty | confirmation-6 |
| `sgsBlockLink` on the Instagram and kitchen cards | `<a>` cards | same | matches |
| `sgsMotion` scroll entrances on hero items, cards | not in the draft (the draft has only the badge pop and hover lifts) | badge motion and hover lifts | Bean's additions, not a clone fault |
| `sgs/button` `builtInHoverLift`, `icon` arrow | "Send one →" and other arrow words | button with words only | arrow as text works; not a fault |

Custom CSS rules on Mama's hand-finished confirmation:

| Block | What it carries | Setting now? |
|---|---|---|
| `oc-status` | the status block's verify form look; hides the card when no form or link | missing (confirmation-4: status block look settings) |
| `oc-items-list` | row padding and alignment, dashed totals rule, serif total, thumbnail height | partly missing (confirmation-7) |
| `oc-taster`, `oc-account` | stretch the button link over the card | exists: `sgsBlockLink` (confirmation-9, route rule) |
| `oc-view-order` | stretch the bound view-order link over the card | missing: a block link that takes a binding (confirmation-9) |
| `oc-gift-note` | yellow tape strip across the top | exists: `sgs/decorative-image` layer (the route already uses it) |
| `oc-details`, `oc-addresses` | dress WooCommerce's summary and address blocks, hide an empty column | true one-off: these blocks are Bean's addition, the draft draws none |

Eye Care (`eye-care-test` read for block and setting NAMES only, per Bean's rule; values from the draft). The hand-built page uses: a `main` container with `contentWidth`, `maxWidth` and `padding` (draft: max-width 720px, `pagePad`, text centred); a content container with `layout`, `alignItems`, `textAlign` and `gap`; `sgs/icon` with `iconSource`, `iconName`, `iconSize`, `shape`, `showBackground`, `shapeSize`, `backgroundColour`, `iconColour`, `iconAlign`, `ariaLabel` and `sgsMotion` (draft: 64px circle, `var(--acc,#9C8B78)`, white ✓ 26px, `pop .6s`); `sgs/heading` with a binding in `metadata` plus font, size, line height, margin and `sgsMotion` (draft: Playfair Display 500, `{{ h1 }}`, 1.05, margin 24px 0 12px, `rise .6s`); two `sgs/text`, the second with `sgsConditionLoggedIn` (draft: #5E584F 16.5px and 15px, `rise .7s`/`.75s`); and two `sgs/button`s with colour, minimum height, padding, size, letter spacing, uppercase and radius, the second outlined with hover colours and `sgsConditionLoggedIn` (draft: 50px, 13px, .1em, padding 0 26px, #141414 on #FAF8F5; the outline 1px #141414 filling on hover). The from-blank copy has none of them: the surface is refused (confirmation-3), and the branch-held text and button would still be missing (confirmation-5). The hand-built page carries 0 bytes of Custom CSS (`wp_get_custom_css()`; no per-block CSS listed).

## Pictures and probes made
- `E:\sgs-tmp\template-rework\investigation\shots\confirmation\pair-mm-{owner,gift-owner,guest}-{375,1440}.png` (+ `.partN`): Mama's draft state beside the rebuilt copy (orders 5998, 6058, 6059).
- `...\shots\confirmation\draft\draft-*.png`, `draft-heights.json`: Mama's draft in guest, owner and gift-owner states (`investigation\confirmation\draft-shots.mjs`).
- `...\shots\confirmation\mm\*.png`, `probe.json`: Mama's copy in five states, including wrong key as visitor and as owner (`investigation\confirmation\probe.mjs`, `mm-states.json`).
- `...\shots\confirmation\ec\pair-ec-{default,with-account}-{375,1440}.png`: Eye Care's draft `done` page beside the copy (lab `shots.mjs`, with-account forced by `L.setState({lastOrder:{signedIn:true}})`).
- `...\shots\confirmation\pre\ec-*.png`: Eye Care's copy before the rebuild (same stock page).
- `investigation\confirmation\order-read.mjs`, `order-read2.mjs`: today's order reader run offline on each draft.
- `investigation\confirmation\keys.php`, `tpl.php`, `tplslug.php`, `names.php`, `names-file.py`, `mamas-extract.py`: read-only WP-CLI and parsing; outputs `mamas-handfinished.html`, `mamas-handfinished-names.txt`, `mamas-tpl-before.html`, `route-nov19-names.txt`, `eyecare-test-names.txt`. (Two dumps of Eye Care template values made before Bean's names-only rule arrived were deleted; no value from them is used here.)
