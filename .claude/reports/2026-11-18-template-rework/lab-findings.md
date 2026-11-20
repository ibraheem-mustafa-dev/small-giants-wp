# Lab findings: Mama's shop surfaces cloned from blank (2026-11-19)

The first from-blank run of the special surfaces for template-rework Tasks 4 and 7 (`.claude/plans/2026-11-18-template-rework.md`). Written for the session that continues the work: what was run, what each picture shows, each fault with its proof and its owner.

## What was run

On `local-mediatest-trlab` (http://localhost:8121, a scratch copy of `local-mamas`), from the worktree `E:\sgs-tmp\wt-tr-lab` at `main` `8c752132e`:

1. The strip step (`E:\sgs-tmp\template-rework\lab\strip-shop.php`) removed 10 hand-built template copies, 397 hand-set look settings (Cart block 104, Checkout block 154, account block 139) and 33,982 characters of Custom CSS from the three pages.
2. `node scripts/computed-route/clone-surface.mjs mamas-munches-redesign --surface <key> --site local-mediatest-trlab --jobs 1 --allow-unpicked` for `template-cart`, `template-checkout` and `my-account` (with `SGS_SECRETS_ROOT` set to the shared checkout). The account run also rebuilt the `page` copy and the copies derived from it (`404`, `search`, `product-search-results`, `taxonomy-product_attribute`, and the `order-confirmation` shell).
3. `node scripts/computed-route/part-look.mjs --client mamas-munches-redesign --surface <cart|checkout|my-account> --site local-mediatest-trlab --write` (93, 156 and 58 values).
4. Pictures with `E:\sgs-tmp\template-rework\lab\shots.mjs` (basket filled by the render check's seed, `scripts/render-check/seed.php`): `E:\sgs-tmp\template-rework\lab\shots\pair-*.png`, draft on the left and clone on the right; for 404 and search the hand-finished copy (`local-mediatest-partlook`, port 8120) is on the left. Logs: `E:\sgs-tmp\template-rework\lab\logs\`.

The header, footer and site tokens on the copy are the hand-finished ones: they belong to the general cloning plan and are no part of this test. The shop listing, the product page and the order confirmation were run later the same day, once their builders were on main (their sections are below). Run later that day: the signed-in account views and the checkout again with its template fixes (the sections below).

Times on a loaded machine: basket template 6 minutes to Fill and 5 to build and walk; checkout 6 minutes in all; the account page with six template copies 12 minutes.

## What the run needed that a fresh worktree lacks

- `SGS_SECRETS_ROOT` pointing at the checkout that holds `.claude/secrets` (without it `site-run.mjs` stops before any stage).
- `playwright` resolvable from `plugins/sgs-blocks` (`scripts/wp-build-page.js` loads it from there): copied from `scripts/computed-route/node_modules`.
- The calibration cache and the gitignored intake files, copied in.
- A page run's last stage fails: `gate-chain.mjs` reads `sites/<client>/build/trees/page/<surface>.json`, which a page run in a clean worktree never writes (`my-account`: ENOENT; every earlier stage passed). The general session's file.

## Basket (`pair-basket-1440-route-only.png`, `pair-basket-1440-plus-hide-header.png`)

Right from blank: the page shell and heading, the free-delivery bar, the summary card's fill, border and shadow, the checkout button, the gift box, the item card's border, corners and picture size.

| Fault | Proof | Owner |
|---|---|---|
| The line item is crushed to 138px, one letter a line | The item-card look makes the row a grid (`.is-large .wc-block-cart-items__row { display: grid }`, printed by the plugin's own look rules); inside WooCommerce's table a grid row is one anonymous cell in the first column, whose width the visible header row (PRODUCT, TOTAL) sets. Setting only `sgsItemHideHeader: true` made the row 840px (`probe-cart-row2.mjs`, before and after). The hand-finished page sets it; the route did not, because the draft draws no header for a locator to find | Route: part-look writes a visibility switch off when the draft draws no such part (in build). Plugin (Task 3): the item-card look must not depend on the header being hidden |
| Summary title in capitals, where the draft and the hand-set page have none | The draft's `text-transform` is the CSS initial value, so nothing is written, and WooCommerce's own default shows | Route: part-look's verify pass reads the live page and writes what still differs (in build) |
| Summary column narrower; button outside the card; unit price under the name; rules between lines; coupon label | `sgsSidebarWidth`, `sgsSummaryWrapsButton`, `sgsItemHideUnitPrice`, `sgsItemHideSeparators`, `sgsCouponLabel*` are hand-set and have no locator yet | Route: part-look locators (in build); `sgsSummaryWrapsButton` is also a known fault (Task 3) |
| "Add coupons" and "Add a gift card" rows the draft does not draw; "Estimated total" and "Shipping" where the draft says "Total" and "Delivery" | WooCommerce's own rows and words; no look setting holds them | Open: a setting to hide or reword them, or accept |
| The count beside the heading is plain text, not a chip | Spec 48 FR-48-99: a live basket count inside a heading is a framework build not made yet | Framework gap, already recorded |
| No Apple Pay or Google Pay buttons | The copy has no express payment gateway | Not a clone fault |

## Checkout (`pair-checkout-1440-route-only.png`)

Right from blank: the step cards, fields, the gift choice tiles, the delivery options, the order card's look, the pay button.

| Fault | Proof | Owner |
|---|---|---|
| The order summary drops below the form | The template's `main` carries the draft's two-column grid (`gridTemplateColumns` desktop `minmax(0, 1.35fr) minmax(0, 1fr)`), and the Checkout block, which draws both columns itself, sits in its first column: 643px wide, so WooCommerce uses its stacked layout (`is-medium`); on the hand-finished copy the same container is a 1240px block and the block is `is-large` (`probe-chain.mjs` on both copies) | Route: helper `woo-shell` (in build) |
| A static "Show order summary ▾ £30.45" is built beside the block | The skeleton keeps the draft's phone-only summary toggle as two fixed texts (`template-checkout.skeleton.json`, `Root/19` to `Root/21`) | Route: `woo-shell` |
| The draft's eyebrow and "Checkout" heading are missing, and the page shows the full site header and footer where the draft has its own slim bar and no footer | The heading sits inside the form the region replaces; the template copy always frames with the shared header and footer parts (`lib/template-copies.mjs::framed`) | Route: `woo-shell` |
| The delivery option labels and the country label overlap their controls | Not diagnosed | Open |

## Account, signed out (`pair-account-1440-route-only.png`)

Right from blank: the page band and heading; the working account block is placed.

| Fault | Proof | Owner |
|---|---|---|
| WooCommerce's sign-in and register forms show where the draft has a "Sign in to see your orders" card with two buttons | The account block's signed-out card and its words are settings of the block; the route places the block (`lib/skeleton-commerce-region.mjs`) and writes none of them. Part-look writes looks, not modes or words | Route: not started. The same shape as the basket drawer's parts in `shop-parts.json` (a part's literal words written to the block's settings) |

The signed-in views (orders, an order's detail, addresses, details, saved items) are not cloned or photographed, and they are where most of the account hand work sat: the hand-finished block held 139 hand-set settings and about 19,000 characters of Custom CSS, and part-look, reading only the signed-out draft, matches 28 of about 105. Counting the account among the surfaces built from blank means the signed-out page only. The signed-in views were read later that evening by part-look's `my-account-in` surface (the "Reruns after the walk fix" section).

## 404 and search (`pair-404-1440-hand-vs-blank.png`, `pair-search-1440-hand-vs-blank.png`)

Mama's draft draws neither page. From blank the route gives the theme's own content inside the site's page shell: it works and it is plain. The hand-finished versions added a pink band, a styled search field and buttons by hand. Bean ruled on 2026-11-19: every draft draws its own 404 page, and its own search results page only when the site has search; the route already builds a template from the surface that plays it (Spec 48 FR-48-56), so the plain version is only the fallback for a draft made before the ruling.

## Basket after part-look's second round (`pair-basket-1440-route-round2.png`)

`part-look.mjs --surface cart --site local-mediatest-trlab --write --verify --seed <seed-out.json>` (main `85364c7fc`): 104 values, the table header and unit price switched off because the draft draws neither, and 2 more settings written after the live read. Right now: the line item full width, the summary title in the draft's case, the checkout button inside the card. Still different: the summary narrower with a paler inner panel (`sgsSummaryWrapsButton` paints the card on the side column: Task 3), WooCommerce's coupon and gift-card rows and its "Shipping" and "Estimated total" words, the count chip, a bin icon for "Remove", a smaller stepper. The verify report's "Still differs" table for the cart has 40 rows (`E:\sgs-tmp\template-rework\part-look\round2\`).

## Shop listing (`pair-shop-1440-route-only.png`)

Built from blank with inventory, propose, Fill (258 settings) and build passing; WooCommerce's sorting stands at the draft's sort control with the draft's "Sort" label, and "Showing all 5 results" at the draft's count. The first run failed Fill's skeleton lint because the sorting builder gave a toolbar container style values (fixed: the pieces replace in place, and the pass now reports any placed node that fails the lint).

| Fault | Proof | Owner |
|---|---|---|
| The pink band's layout: the title thrown right, the band about twice the draft's height | Picture; not diagnosed | Route (`sgs/hero` Fill, the general session) |
| The product cards show each product's option pickers and a "View product" button, with none of the draft's card look (border, shadow, badges, "Add to basket") | Picture; `sgs/product-card` is placed by `commerceRegion` and read at the draft's first card; not diagnosed | Route: not started |
| The walk stage fails: "the live page has no element for the surface's root (gen-shop-0)" | The new absent-root check (Task 10) on a template surface whose live root carries another class | Route (the general session's walker) |

## Product page (`pair-product-1440-route-only.png`)

Built from blank on the first run (main `760cc1f11`): one working `sgs/buybox` with its gallery, pack, base and chip choices and add to basket; the title and description bound to the product.

| Fault | Proof | Owner |
|---|---|---|
| Every word underlined | The built tree carries `textDecoration: "underline"` on the `main` container, its only child and the breadcrumb `nav`, whose first children are the draft's two underlined breadcrumb links: a wrapper takes its text look from its first descendant text | Route (Fill): reported to the general session, which has taken it |
| The buy box has none of the draft's look, and the page's two columns are lost | The buy box is drawn as four sibling elements, so the node has no `draftRef`; its parts carry no values and no part names in the framework database | Route: part-look over `sgs/buybox` (not started) |
| No flavours choice | Not diagnosed (the flavours are the product's pick group, which the buy box draws when configured) | Open |
| The gift tick was dropped | Fixed after this run: `lib/template-piece-gift.mjs` places `sgs/gift-order` after the buy box (not yet rerun live) | Done offline |
| The related products have no pictures | Not diagnosed | Open |

A second product run did not happen: one attempt exited before any stage with no message, and the next failed "no intake surface" because the lab worktree's intake record had been rewritten by the order confirmation's intake run limited to one surface (`intake.mjs --surfaces S-32`). Copy `sites/mamas-munches-redesign/build/intake/` into the lab worktree again from the shared checkout before the next product or shop run there.

## Order confirmation (`pair-confirmation-1440-route-only.png`, `pair-confirmation-375-route-only.png`)

Built from blank for the seeded order 5998, viewed by its signed-in owner: `intake.mjs mamas-munches-redesign --surfaces S-32`, `manifest.mjs … --only template-order-confirmation --apply`, then `site-run.mjs … --only template-order-confirmation` without `--strict` (inventory 78 elements with the two data branches, 70 nodes proposed, Fill 558 settings, build passing). The closest of the eight: the hero reads "Order 5998. We've emailed…", the item, its options and "Paid £13.00" are the order's own through `sgs/order-items`, "Follow this order in your account" shows for the owner with its look read from the forced branch, and the Taster Trio card shows because the order is no gift. Page height 2,792 against the draft's 2,867 at 1440.

| Fault | Proof | Owner |
|---|---|---|
| The bake date, the arrival date and the step line that repeats the bake date are the draft's sample words; the account eyebrow cannot change with how the account was made | The four proposal problems: no key of the order binding holds them. With `--strict` (as `clone-surface.mjs` always runs) they stop the surface at propose, so the page is not built | Bean's choice: a way for a site to supply its own order facts to the binding, or such a value left out of the clone |
| The tick badge and the step icons have lost their round shape | Picture; not diagnosed | Route (icon discs, the general session) |
| The order number is not bold | A bound value is plain text | Framework gap, recorded |

Not checked live yet: a gift order (the note card and "Dear <name>,"), a guest (the "Create an account" card) and a wrong order key (nothing shown).

## Phone width (375), all eight surfaces (2026-11-19 evening)

Every pair now exists at 375 beside its 1440 pair: `E:\sgs-tmp\template-rework\lab\shots\pair-<surface>-375-*.png` (draft or hand-finished copy on the left, the from-blank clone on the right; `.partN.png` files are the same picture cut into 1800px strips for reading). The basket was retaken in its current state (after part-look's second round, `pair-basket-375-route-round2.png`); the shop, product, 404 and search were taken now; the checkout pair is the shell rerun (`pair-checkout-375-round2.png`); the account and order confirmation pairs are from the first run. Most 1440 faults repeat at 375; the rows below are the ones that are new at phone width or worse there.

| Surface | Fault at 375 | Proof | Owner |
|---|---|---|---|
| Basket | The line price runs past the card's right edge (`£9.50` clipped) | Picture; the item card is a grid whose price column does not shrink | Plugin (Task 3, the item-card look) |
| Basket | The summary card has no "Summary" title at phone width, and the gap under the card is about 70px larger | Picture | Route: part-look's verify pass at 375 (it reads 1440 only) |
| Checkout | WooCommerce's floating labels sit inside the fields where the draft puts the label above; "Country/Region" overlaps "United Kingdom (UK)" | Picture | Plugin or part-look: the field-label mode is not a setting part-look writes (open) |
| Checkout | The delivery and payment radio dots overlap their labels ("Royal Mail" reads "yal Mail"), prices sit top right, no "Arrives…" line, the chosen option is not filled | Picture | Route: part-look locators for the shipping-option tile (the 1440 overlap fault, worse at 375) |
| Checkout | "Who's it for?" tiles stack full width where the draft puts the two side by side; "for me" loses the script face | Picture | Route: the gift-choice tiles' layout and type are not read at 375 |
| Checkout | The draft's phone "Show order summary" bar at the top is gone (the summary sits after the payment step), the slim header's "Secure checkout" wraps and is underlined where the draft has a lock and one word | Picture | Route (`woo-shell` builder: the toggle was rightly dropped as a static fake, nothing replaces it; the header link look) |
| Checkout | The allergen note loses its dashed box and its line spacing breaks; the terms line is WooCommerce's bold sentence | Picture | Route: part-look has no locator for the note or terms |
| Checkout | Postcode lookup ("Find address") and the mobile field are missing | The draft draws an address finder WooCommerce does not have | Framework gap (not a clone fault) |
| Account (signed out) | Same as 1440 (WooCommerce's forms), and a 180px empty gap under the register card | Old run: the card builder landed after it | Route: rerun (Task 5) |
| Order confirmation | Close at 375 as at 1440; the tick and step icons are ovals, not circles; the "With you" step shows a star where the draft has a heart; the line picture has no frame | Picture | Route (icon discs and icon choice, the general session) |
| Shop | The filter chips wrap onto two rows (the draft scrolls one row sideways); a stray "Choose an option" label sits under the sort; the cards show option pickers, descriptions and the value ladder, so the page is 6,223px against the draft's 4,063 | Picture; the card faults are the 1440 ones (part-look round three is not yet written on this copy) | Route: Task 5 rerun for the cards; the chip row and the stray label are open |
| Product | The title block comes before the gallery (the draft puts the gallery first at phone width); the draft's sticky "£21.50 · Add to basket" bar is missing | Picture | Route: the buy box's phone order and sticky bar are not read (open) |
| Product | The reviews stay three columns at 375, one word a line, where the draft shows one card and a peek of the next | Picture | Route (Fill's responsive columns for the reviews section, the general session) |
| 404 and search | The theme's fallback search field and button run edge to edge with no side gutter | Picture | Route: the page shell's fallback content gets no side padding; ruled to be replaced by the draft's own 404 and search |

## Reruns after the walk fix (2026-11-19, 19:53 to 21:05)

On `local-mediatest-trlab` from `E:\sgs-tmp\wt-tr-lab` at `main` plus the walk fix (now `53303b6d8` on main): `clone-surface.mjs` for `template-checkout`, `my-account`, `product` and `shop`, each followed by `part-look.mjs --write --verify` (the account also with `--surface my-account-in --login`). Logs `E:\sgs-tmp\template-rework\lab\logs\21-*.log` to `28-*.log`; pictures `E:\sgs-tmp\template-rework\lab\shots\r5\pair-*.png` (375 and 1440; `pair-in-*` are the signed-in views).

The walk now reaches every template surface: the checkout ends "every stage ran and passed" (946 open walker rows, which is a measure of distance from the draft, not a pass), and the product and shop walks pass where they failed before. Their last stage, `gate-chain`, still fails because it reads `build/trees/<kind>/<surface>.json`, which a run in a worktree never writes (the general session's file, already listed above). The account's apply stage refuses two hover settings (`ordersRowBackgroundHover`, `loginButtonBackgroundHover`, `signedOutButtonShadowHover`) because the framework database has no calibration for them: a calibration gap, not a route fault.

| Surface | Now right | Still differs | Owner |
|---|---|---|---|
| Account, signed out | The draft's "Sign in to see your orders" card with both buttons, its fill, border and shadow; page height close to the draft | A "No account? You can check out as a guest." line the draft does not draw; the buttons slightly smaller | Route: account piece (the guest line is a block word with no hide setting read) |
| Account, signed in | Address cards' fill, border, corners and padding; the current tab is a dark pill at 375 | The menu shows WooCommerce's eight items as rows (the draft has four pill tabs with counts); order cards have no border or corners; order number and links underlined; no "Hello, <name>" header; the order page shows only its heading and status | Route: part-look (menu items and order card border have no setting; the order page's mode switches have no rule yet) |
| Product | No underline anywhere (the general session's fix); the gift tick placed after the buy box; the add button yellow with the price; the ingredients card styled | The two columns are lost: gallery and buy box sit in one narrow column; no pink step card, no flavours, no subscribe or one-off choice; the value ladder table shows; the logo did not paint in the 1440 picture although the page holds it (not diagnosed) | Route: buy box layout and parts (part-look product round); flavours open |
| Shop | The product cards: border, corners, three per row, yellow full-width buttons, picture on top | The pink band is broken worse at 1440 (title thrown right, band about 600px tall); card buttons say "View product" (the draft says three things); no badges; filter chips small | Route: `sgs/hero` Fill (the general session); product card words (one value per block) |

## Order confirmation states (2026-11-19, 21:20)

On `local-mediatest-trlab`, with two lab orders made by `E:\sgs-tmp\template-rework\lab\confirm-orders.php` (gift order 6058 owned by `rc-customer`, gift to "Amira" with a message; guest order 6059) and read by `E:\sgs-tmp\template-rework\lab\confirm-states.mjs` (pictures and `states.json` in `E:\sgs-tmp\template-rework\lab\shots\states\`, 375 and 1440).

| State | Expected (checklist) | Seen |
|---|---|---|
| Gift order, signed-in owner | "Dear Amira," and the message, no Taster Trio upsell, "View order" | All as expected; the order number and the Zookies line show |
| Guest order | "Create an account", no "View order", the upsell (no gift) | All as expected |
| Wrong key, visitor | Order paragraph hidden, `sgs/order-items` prints nothing, no sample words | All hidden; no draft sample words (MM-1042, the draft's gift name) anywhere |
| Wrong key, the order's owner signed in | As the visitor | The order lines are hidden, but the "Follow this order in your account · View order" card shows, and the "What's coming" card stays as an empty box |

Two faults, both this stream's (`lib/template-piece-order.mjs`): the card that wraps `sgs/order-items` takes no Show-to rule, so with nothing to print it is an empty box (it should take the `viewable` rule, `order-viewable`, like a bound block outside every branch); and the account branch's rule `order-owner` does not also require the order to be viewable, so the owner sees the view-order card under a wrong key (no leak: the link opens the owner's own order, but the page is inconsistent). The static bake and arrival dates show in every state (Bean's open choice on order facts with no live source).

Status of the two faults: the items card now takes the viewable rule when it holds only the order lines and their title (`e5b0c8057`, not yet rebuilt on the lab copy). The owner's view-order card is fixed (2026-11-20): `plugins/sgs-blocks/includes/conditional-visibility.php::viewer_owns_current_order` reads the order through `Order_Binding::viewable_order()` and is false when that is null. `render-scope.py` named the file shared, so the render check ran on Mama's mirror (`E:\sgs-tmp\render-check\runs\20261120-094852-local-mamas`: all 36 states reached and the same); Indus and Eye Care hold no saved post using `order-owner`. On `local-mediatest-trlab` with that build, `confirm-states.mjs` (pictures `E:\sgs-tmp\template-rework\lab\shots\states-t4\`) shows no "View order" for the owner with a wrong key and still shows it for the owner with the right key. The guest order 6059 no longer shows its confirmation: WooCommerce shows a guest's confirmation for 10 minutes after ordering (`woocommerce_order_email_verification_grace_period`) and the order was 13 hours old, so that is the clock, not the fix.

## Forms, modals and flows on scratch copies (2026-11-19 night)

Task 10's lab run on `local-mediatest-forms-mamas` and `local-mediatest-forms-eyecare` (both dropped after), from `E:\sgs-tmp\wt-tr-forms-lab` at main. Pictures, probes and logs: `E:\sgs-tmp\template-rework\forms-lab\` (`mamas\`, `eyecare\`).

Mama's passes what Task 10 asks: the contact form's order-number field shows only for "My order", "Baby shower or event" shows the cookie count and date, a submission shows "message received" and "Thank you! Zainab will be in touch soon." (row stored, mail blocked on the copy), Build your Zookie renders `data-flow-product-id="257"` (Zookies), no product carries `_sgs_choice_flow`, and `site-check --only modals` passes.

| Fault | Proof | Owner |
|---|---|---|
| Eye Care's footer fails to build: the shared size-guide frame is pushed beside `sgs/site-footer` at the top level ("the tree must be exactly one sgs/site-footer block, but it has 2"), and the frame has no `modalRef`; so the help page's size-guide link is dead | Build log; with the frame nested in the footer and `modalRef` 118 set by hand, the footer and help links open the dialog and close on Escape | This stream: `lib/skeleton-openers.mjs::surfaceFrames` |
| The lens flow renders twice on a linked product: the route's own frame (no opener) and the buy box's own auto-wired frame | `.sgs-choice-flow` count 2 | This stream: the route must not place a frame for a flow the product link already wires |
| A linked product's buy box has one button, "Add to Cart", which opens the flow; the ordinary add to basket is gone | `eyecare\linked-buybox-1440.png`, `-375.png` | Bean's ruling (2026-11-19): keep both. Spec 43 FR-43-25's off-by-default buybox setting, then the route sets it when the draft draws both |
| The product page's "Which size am I?" link and "Add my prescription from +£59" are lost inside the buy box | Proposal; `sgs/buybox` has no setting for either | This stream: `lib/template-piece-buybox.mjs`; the buybox block |
| `site-check`'s flow check never opens the modal around a flow, so every product-linked flow fails it | "step 1 shows no option button" | `lib/site-check-parts.mjs::flowItem` (general session) |
| A link to an anchor no page-map row names (`#modal-missing`) is not flagged | Planted on Eye Care | `lib/site-check-openers.mjs::deadOpeners` (this stream) |
| A choice flow's tree is never written to `trees/sgs_choice_flow/<slug>.json` by the site run, so `site-build` adopts the post without its `flowProductId` | Worked only after copying Fill's tree by hand | `site-run.mjs`, `lib/site-build-map.mjs::treeFor` (general session) |
| Mama's gifts flow's post 159 does not exist on the mirror and has no page-map row | Build log | Route data (general session) |
| The nav drawer's and mega menu's size-guide items open nothing | Expected: the menu build does not read `opens` | Not built (Task 10) |

## Eye Care from blank (2026-11-20)

The same from-blank pass on Eye Care's draft, on `local-mediatest-trec` (http://localhost:8125, a scratch copy of `local-eye-care`, the mirror of `eye-care-clone-test`), from `E:\sgs-tmp\wt-tr-lab` at `main` `ad8c67b25`. The strip step removed 9 template copies (cart, checkout, order-confirmation, single-product, archive-product, taxonomy-product_attribute, product-search-results, 404, search); the basket, checkout and account pages held no hand-set look settings and no Custom CSS. Seeded with `scripts/render-check/seed.php` (customer `rc-customer`, order 455; the basket product is the calibration fixture, so its pictures are blank). Logs `E:\sgs-tmp\template-rework\lab\logs\ec-*.log`; pictures `E:\sgs-tmp\template-rework\lab\shots\ec\pair-<surface>-<375|1440>.png` (the draft on the left is the walk's own full-page draft picture, because the lab picture script does not open the draft's `#@state/page=` address).

What the run needed first: `manifest.mjs --apply` (Eye Care's `surfaces.json` was from 2026-11-02; it now drops `template-cart`, ruled); a theme snapshot re-extracted in the worktree (the committed `sites/eye-care-ward-end/theme-snapshot.json` was stale against the handoff's `tokens/spacing.css`, so `calibrate.mjs` refused it; the general session refreshed it on `main` in `69e6bcddf`); default paint measured on the copy for 10 blocks (`cache/eye-care-clone-test/` copied from `E:\sgs-tmp\wt-general-t`, then `calibrate.mjs` for `sgs/container`, `heading`, `text`, `button`, `icon`, `label`, `media`, `multi-button`, `account`, `product-card`); and `chmod 755` on the copy's `wp-content/plugins/sgs-blocks` (the mirror's folder is 700, which Windows cannot read through `\\wsl.localhost`).

| Surface | Built from blank | Now right | Still differs | Owner |
|---|---|---|---|---|
| Checkout | Every stage passed (`clone-surface.mjs`, the commerce region found: the re-proposal the restored refusal needed), then part-look wrote 114 values | Page heading, the Checkout block's fields, the delivery and payment tiles' borders, the order card's border, the pay button | The order summary drops under the form (below); no step numbers or small-capital step titles ("1 CONTACT"); WooCommerce's floating labels where the draft puts the label above, and "Country/Region" overlaps "United Kingdom (UK)"; the delivery choices are stacked full-width rows with tiny type where the draft draws two tiles side by side; no mobile field, no "Create an account" line; express wallets and card fields missing (the copy has no such gateways, not a clone fault) | Summary: plugin (Task 3). Labels, tiles, step titles: part-look locators (open, as on Mama's) |
| Product | Every stage passed except `gate-chain` (the worktree fault below) | One working `sgs/buybox` with its size choice and Add to Cart; the draft's title, rating, price and stock line | The two columns are lost: gallery, then the title block, then the buy box in one column; the buy box repeats the price and draws an empty white gallery; no colour swatches; at 375 the thumbnails stack in a column and the size choices wrap 2 + 1 | Route: buy box layout and parts (part-look product round, as on Mama's) |
| Shop | Every stage passed except `gate-chain` | The filter rail (gender, size, colour swatches, price, brand), WooCommerce's sorting, three cards a row at 1440 | Cards show size pickers and "View product" where the draft shows brand, rating, colour dots and a saving badge; the rail has a grey background; no "16 frames" count; at 375 two filter buttons (the draft's own beside the shop's working pill) | Route: product card (as on Mama's); the count and the doubled filter are open |
| Account, signed out | Built; the walk failed (below) | The page band and its words; the account block placed | The band paints near-black behind dark text (unreadable); only WooCommerce's sign-in form shows where the draft draws two cards, "Sign in" and "New here?" with a register form; a "No account? You can check out as a guest." line the draft does not draw | Route: the account piece (registration on the account page is WooCommerce's `woocommerce_enable_myaccount_registration` setting, which nothing writes); the band colour not diagnosed |
| Account, signed in | Not cloned | | part-look's `my-account-in` located 0 of 94 parts in Eye Care's draft (67 have no locator) | Route: part-look signed-in locators for Eye Care's draft (open) |
| Order confirmation | Refused at propose, rightly | | Eye Care's draft writes the order number as fixed words ("Thank you — order EC-10482.") and binds no order number anywhere, so the route cannot bind it without guessing and refuses the surface | The draft (Claude Design instructions: the general session) |

Faults found with their proof:

- **The checkout's order summary drops under the form.** `sgsColumnGap` (48px, written by part-look from the draft) prints `column-gap` on WooCommerce's sidebar layout (`plugins/sgs-blocks/includes/woocommerce/commerce-look/summary.php::sgs_commerce_look_layout_css`), but WooCommerce sizes the two columns as 65% and 35% of the block (712px and 384px of 1,096px measured at 1440, `E:\sgs-tmp\template-rework\lab\ec\chain.mjs`), so the gap makes the row wrap and the summary moves to y 1272 under the form. The gap setting needs the columns to give up its width (or `sgsSidebarWidth` beside it). Owner: this stream's Task 3 (a fault in an existing setting); changing how an existing setting renders needs its own render check, Mama's live shop first.
- **The account walk finds no root.** The live account page carries markers named `cr-ref-template-page-my-account-*` (an older surface name) while the walk looks for `cr-ref-my-account-0`. Not diagnosed. Owner: open (the surface naming of the account page, route).
- **`gate-chain` fails every page run in a worktree** (product, shop, account): it reads `build/trees/<kind>/<surface>.json`, which a worktree run never writes. Already recorded; the general session's.
- **Every Eye Care page on the copy and on the untouched mirror is wider than the screen** (1,567px at 1440 and 604px at 375, `E:\sgs-tmp\template-rework\lab\ec\overflow.mjs`): a WooCommerce product grid sits off-screen to the right (the bag drawer's empty-basket suggestions). The header on the mirror also shows its ticker words overlapping and no logo. Both are the mirror's own, not this pass's; owner: the general session (header and drawer).
- **The flow-link step links no Eye Care frame from the committed page map**: its product row predates the page map's `opens` field (read 2026-11-19 morning), so `lib/site-build-flow-scope.mjs` sees no buy box opener. Intake must be run again (with `--record`: the replay recording predates the 2026-11-09 token change) before Eye Care's next site build.

## Keep-both buy box on Eye Care (2026-11-20)

The keep-both setting (Spec 43 FR-43-25, `sgs/buybox` `keepAddToCartWithFlow`) on `local-mediatest-trec` with the landing build: the route's product run (`site-run.mjs --only product --stages inventory,propose,fill,build`) set the setting on the single-product template's buy box, and the flow-link step linked Eye Care's 16 frames to the lens flow once intake had been run again (above). On Ray-Ban Aviator Classic (`E:\sgs-tmp\template-rework\lab\ec\keepboth.mjs`, pictures `E:\sgs-tmp\template-rework\lab\shots\ec\keepboth-*.png`): Add to Cart and the opener sit together in `sgs-buybox__cart-actions--with-flow` at 375 and 1440 (stacked, because the buy box column is 309px wide), one choice flow renders, and the opener opens it. Mama's renders unchanged (the render check in "Order confirmation states").

| Fault | Proof | Owner |
|---|---|---|
| The opener reads as words, not a button | Computed look: border 0px, background the page colour. Eye Care's snapshot's secondary preset is `border-width` 0px on `#FAF8F5`, and the opener takes the secondary preset (`buybox-linked-flow.php::sgs_buybox_flow_opener_html`). The draft draws the opener as the solid button and Add to Cart as the outlined one | This stream: a setting for the opener's preset, written by the route from the draft's control (Spec 43 FR-43-25, not built) |
| The opener says "Choose your options" and Add to Cart says "Add to Cart" where the draft says "Add my prescription" and "Add to bag as they are" | The opener's words are the flow's `openerLabel`, which nothing writes from the draft; the buy box's `addToCartLabel` is not written for Eye Care | This stream: the buy box piece |
| The buy box's own Add to Cart rules also land on the opener | The opener keeps the class `buybox__add-to-cart` (`buybox-linked-flow.php::sgs_buybox_flow_opener_html`), so the Add to Cart colour, type, height, shadow and press settings apply to it too | This stream: the opener-look task (a class of its own with its own preset setting) |
| On a simple product the secondary hover and base button rules do not reach the opener | The opener sits outside `.sgs-buybox` there (`::sgs_buybox_simple_keep_flow_html`), and those rules are scoped to the buy box | This stream: the same task |
| A buy box whose click handlers live in an imported component file is not read | `lib/template-piece-buybox-flow.mjs::controlRole` reads handlers from the draft's own logic only; the module header says so | This stream: not built (no draft needs it yet) |

A medium code review of the keep-both code (2026-11-20) found nine faults and fixed seven, each with a failing-first test: a sticky bar's add button counted as the buy box's own and a decline gave no reason (`f009d0c1e`); a simple product followed other precedence than the variable path, an out-of-stock or unbuyable simple product showed an opener, and the core fallback markup was written three times (`bacee34c9`); the editor preview showed the opener under other conditions than `render.php` (`a742478b2`). The three rows above are the two deferred to the opener-look task and the imported-component limit. No render check was run for these three commits: with the setting off the output is byte for byte what it was (`plugins/sgs-blocks/tests/fixtures/buybox/snapshots/keep-flow-off-*.html`, pinned by `BuyboxKeepFlowTest::test_off_renders_exactly_as_before_for_a_simple_and_a_variable_product`), so only the off-by-default keep path changed.
