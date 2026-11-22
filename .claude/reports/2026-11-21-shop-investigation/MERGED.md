# Shop page types: one fix list (2026-11-21 night)

Built from the six findings files (`shop.md`, `basket.md`, `account.md`, `checkout.md`, `confirmation.md`, `product.md`) and all six verdicts (`verify-*.md`). A verdict always overrides its finding: wrong items are dropped, corrections applied, "partly checked" items marked. The main session's settled facts of tonight override the files (Bean's three rulings; RW-18, RW-26, RW-27 and its split order, RW-28 agreed with the general session; plugin round 6 item 6 dropped).

Terms used: "the route" is the cloning route (`scripts/computed-route`); "part-look" is the route's step that reads the draft's part looks onto shop blocks; "render-scope" is `scripts/render-scope/render-scope.py`, which lists the pages a plugin or theme change can alter; "the copies" are the from-blank scratch copies `local-mediatest-trec` (Eye Care) and `local-mediatest-trlab` (Mama's). Paths are relative to the repo unless absolute. Code was checked against main `c7014d6af` for what landed since the verdicts (RW-0c, RW-0d strip command, RW-1, RW-7, RW-9; none of them closes a finding below).

## 1. Summary

- **68 fixes** (F-1 to F-68; F-68 sits beside F-28 in the order) covering all 99 findings: each is closed by a fix, a setup item, a decision or a gap, or dropped as wrong or already fixed. Plus 17 setup and lab items (S-1 to S-17, S-1 already cleared), 8 decisions for Bean, 7 gaps for the report and 10 checks that look green while comparing nothing (each mapped to a fix).
- **By owner:** this stream 40 (several with a plugin half on this stream's own blocks); general session 13; shared between this stream and the general session or plugin 4 (F-5, F-29, F-31, F-49); theme 3 (F-28, F-68, F-35); plugin round 7 groups (F-37, F-61 to F-66: about 120 settings); plugin shared code 1 (F-22).
- **By size:** S 28, M 34, L 6.
- **First wave (settled tonight):** F-28 (a closed filter drawer takes no space) and F-68 (drawer rules from the breakpoint option), because the general session's RW-27 route half (F-29, its wave 2, about 2026-11-23) must land after F-28 and its threshold write waits for F-68, and MIC's phone filter is cloned on 2026-11-28.
- **Render-scope needed (a fix that changes what existing sites render, so its pages are listed before each site's next deploy):** F-18, F-22, F-28, F-68, F-34 (product order), F-36, F-38 (plugin half), F-45, F-55, F-60, F-27 (on re-extract), F-66 (the gift tile ring), F-62 (only if a site has `panelCloseSize` saved); F-1's apply half changes every client's templates at their next rebuild. Every other fix changes route output only or adds an opt-in setting that is off by default.
- **Before any fix can be judged:** the setup items S-2 to S-5 (a real strip of both copies, Mama's intake re-run, a fresh Eye Care header, calibration runs; the lab build, S-1, is cleared). Tonight four pages still show older builds because propose refused them.
- **The five fixes that unblock the most pages:**
  1. **F-1** template copies get the apply stage's rules: every route-built template on both clients (shop, basket, checkout, account, confirmation, product: 12 pages) gets its `<h1>`, and the other chrome rules reach templates.
  2. **F-14** part-look reads a one-file draft by its route: Eye Care's shop cards, basket drawer (on every page), signed-in account and checkout summary anchors all start being read.
  3. **F-18** the basket drawer's panel never paints near-black: Eye Care's drawer is unreadable on every page today.
  4. **F-2** gate-chain reads template copies' trees: the shop and product runs on both clients stop failing, so those four pages get gated.
  5. **F-30** a site-build step writes the theme's shop options: every toolbar, filter, drawer look and word on both shop pages (56 options, none written today).

## 2. Fix list

Order: rebuild and run enablers first, then the part-look foundations, then each page type, then the plugin round groups. Within a group, dependencies first, then the number of pages unblocked.

Verification status in each block: "verified" (the verdict confirmed or corrected it, correction applied), "partly checked" (the verdict checked the cited files but did not re-run the live measurements). Every page now has its verdict, so no item is unverified; a few sub-claims are marked "hypothesis" or "not re-checked" where the verdict left them so.

### Group A: run and rebuild enablers

#### F-1: Template copies get the apply stage's rules, so every route-built template has its h1
- Closes: basket-12 (verified, corrected), checkout-9 (verified), product-7 (verified, corrected).
- Pages and clients: template copies whose page heading the skeleton (not a piece) builds: Mama's basket, Eye Care's checkout, both product pages; likely the shop, account, confirmation, 404 and search copies (not each checked).
- Cause: proved. `lib/apply-chrome-heading.mjs::headingLevel` (since `5d7bceaf7`) writes `level` in the apply stage; `site-run.mjs` skips apply for a template copy ("skip ... apply 0s - a template copy has no post of its own"), and every other apply rule (logo, hover, icons, ground, item-card hover, arrow hover, state) is skipped on templates too. A heading a piece builds escapes (`template-piece-woo-layout.mjs::place` writes `level: h.t.tag`). The product verdict says "both basket pages render an h1": re-read live at 23:45, Mama's `/cart/` has 0 `<h1>` (its "Your basket" is `<h2 ... cr-ref-template-cart-3>`); Eye Care's `/cart/` h1 is WooCommerce's post title. So basket-12 stands.
- Change: (a) this stream, now: `placeTitle` writes `level: h1` (it already requires the element to be the page's h1), which fixes both product pages; (b) general session: run the apply families on a template copy's tree before build (in `site-run.mjs`'s stage plan), not a new heading rule.
- Layer and owner: (a) this stream; (b) general session (in its plan's "found by the day's runs" list, no RW id yet).
- Size: M ((a) S).
- Render-scope: route output only, but (b) changes every client's templates at their next rebuild: list them then.
- Depends on: nothing.
- Verify: a test that a template copy's tree passes through `headingLevel` (fails first on today's `site-run.mjs`); live: exactly one `<h1>` on `/cart/`, `/checkout/`, `/shop/`, `/my-account/` and a product page on both copies.

#### F-2: gate-chain reads the tree a template copy or worktree run actually writes
- Closes: shop-15 (verified), product-8 (verified: a duplicate of shop-15; it is also why Eye Care's fresh product run exits 1), the my-account gate-chain failure in account.md "Fresh build" (verified as the known worktree fault).
- Pages and clients: shop and product on both clients; Mama's my-account run.
- Cause: proved for the template half: `gate-chain.mjs::buildContext` reads `path.join(buildDir, s.tree)`; `surfaces.json` names `trees/product/product.json` and `trees/shop/shop.json` for `copy.from: whole`, but the copy is written at `trees/template/<slug>.json`. The page half (`trees/page/my-account.json` never written by a page run in a clean worktree) is the general session's known item.
- Change: `gate-chain.mjs::buildContext` reads the copy's own tree when `s.copy` is set, and `surfaces.json` whole-copy rows name `trees/template/<slug>.json`; the page-run half as the general session plans it.
- Layer and owner: general session.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: product and shop rebuild logs end `ok ... gate-chain` and `exit=0` on both copies.

#### F-3: A template whose draft record matched but has no intake skeleton stops the run instead of passing as a stock copy
- Closes: confirmation-1 fix (b) (verified, corrected: the silent pass is `finaliserVerdict`, not `buildManifest`).
- Pages and clients: any surface; tonight Mama's order confirmation.
- Cause: proved. `lib/clone-surface.mjs::finaliserVerdict` returns ok ("no skeleton of its own (a copy reads no draft)") for any surface without `intakeSurface`; `lib/manifest-build.mjs::buildManifest` already lists the gap as `noIntake`, and `manifest.mjs` only prints it.
- Change: `clone-surface.mjs` stops on a manifest `noIntake` row, and `finaliserVerdict` passes a copy only when the surface truly has no draft record.
- Layer and owner: general session (`lib/clone-surface.mjs`, `lib/manifest-build.mjs`).
- Size: S.
- Render-scope: no.
- Depends on: nothing (S-3 is the data half).
- Verify: a failing-first test: a fill copy whose record matches with no intake skeleton fails finalise; a surface with no draft record still copies.

#### F-4: The shop's commerce region reports its run, so Eye Care's shop passes propose
- Closes: shop-1 (verified, corrected).
- Pages and clients: Eye Care shop (any shop draft with a state that moves the listing).
- Cause: proved that the refusal is 18 state copies (inventory `revealed`, state `fgOpen.size:true`, shown only at 1440). The mechanism is proved by the verdict: `lib/skeleton-paint-conservation.mjs::conservationRows` starts `listRow` with `const row = shownIn ? null : rows.get(e.key)`, and `skeleton.mjs` passes only the rail's run to `piecesPass`, so the commerce region has none. That the region's run clears the 18 is a hypothesis until the offline propose shows it.
- Change: the commerce region reports `{ id: 'commerce-region', block: 'woocommerce/product-collection', at, run: [region key] }` as `lib/skeleton-filter-rail.mjs::railRun` does, passed to `piecesPass` as `paint.runs`. Call made: the narrower run fix, not the alternative (a state copy inherits its base row's record), because that alternative touches every surface.
- Layer and owner: this stream (the run hand-over in `skeleton.mjs` / template pieces); the commerce region rule itself is the general session's: tell it.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: offline `skeleton.mjs propose` on a copy of Eye Care's shop data with the run (MUST FAIL without it); then `clone-surface.mjs eye-care-ward-end --surface shop` passes propose with the 18 under `templatePieces.missingFeatures`.

#### F-5: Mama's category chips yield to WooCommerce's category filter (RW-28)
- Closes: shop-5 (verified, corrected), shop-2 chips half (verified, corrected: Root/23 are the chips, Root/24#0..6 the count badges).
- Pages and clients: Mama's shop (any shop draft with category chips above its listing).
- Cause: proved. `rules.optionSetFilter` keeps a narrowing chip row as `sgs/option-picker` and hands its wiring to a site build that nothing carries out on a shop template; clicking Gifts changes nothing.
- Change: as agreed, on a shop template `rules.optionSetFilter` yields the row to `woocommerce/product-filter-taxonomy` (`product_cat`, `displayStyle: woocommerce/product-filter-chips`) built from `rules.filterRail.groups.category`. `local-mamas` template 194 proves the target block works.
- Layer and owner: general session builds the yield (RW-28); this stream builds the piece it yields to (in `lib/skeleton-filter-rail.mjs`).
- Size: S (general) + S (this stream).
- Render-scope: no.
- Depends on: nothing.
- Verify: RW-28's test (shop template yields; Gifts and Help keep the picker); live on Mama's copy: choosing Gifts lists the three gift products and marks Gifts; at 375 one row scrolling sideways; the row's accessible name is the category filter.

#### F-6: The route reads and writes the shop filter blocks' existing look settings (chips and sort)
- Closes: shop-2 chip looks, shop-5 look half, shop-10 chip half (verified, corrected: `customChip*`, `sgsChipBorderWidth`, `sgsChipMinHeight`, `sgsChipFontWeight`, `style.border.radius` exist), shop-11 (verified WRONG as a missing-setting claim; what survives is "no route reader").
- Pages and clients: both shops.
- Cause: proved. `includes/product-filter-look.php` registers `sgsChipCountPill*`, `sgsChipSelected*`, `sgsChipAllLabel`, `sgsChipSingle`, `customChip*` on `woocommerce/product-filter-chips` and `sgsSortBackground`, `sgsSortBorderColour`, `sgsSortBorderWidth`, `sgsSortBorderRadius`, `sgsSortFontWeight` on `woocommerce/catalog-sorting`; they live only in `data/capabilities.json`, not in the framework database's `block_attributes`, so part-look has no row to pair and writes none.
- Change: part-look gains a `shop` part group for the chips (chip, chosen chip, count badge, All) and the sort select, reading their settings from `data/capabilities.json` (or the framework database once these rows are seeded: the better long-term home; flag to the setting-record session).
- Layer and owner: this stream (part-look); the seeding of these rows into the database is a plugin-metadata item for the setting-record session.
- Size: M.
- Render-scope: no.
- Depends on: F-5, F-14 (Eye Care's shop is a one-file draft).
- Verify: part-look's shop report lists chip, chosen chip, badge and select as paired; live at 375 and 1440 on both copies: Mama's yellow chosen chip with its 3px shadow, 46px tall, count badges; Eye Care's 1px #E6E1DA square select.

#### F-7: Mama's shop arrow in a filled circle becomes a block that draws it (RW-13)
- Closes: shop-2 Root/38 half (verified: "→" in a 34px circle).
- Pages and clients: Mama's shop (and Gifts, Help).
- Cause: proved. `rules.drawsChildren` hosts it in `sgs/text`, which cannot draw the circle (`host-unread`).
- Change: as planned in RW-13: `sgs/button` with `iconBackground`.
- Layer and owner: general session (RW-13).
- Size: S (inside RW-13).
- Render-scope: no.
- Depends on: nothing. Mama's shop propose passes only with F-5 and F-7.
- Verify: Mama's shop propose has no Root/38 row.

#### F-8: The basket's layout piece claims the draft's empty-basket branch
- Closes: basket-2 empty-branch half (verified).
- Pages and clients: Mama's basket (any basket or checkout draft that draws its own empty state).
- Cause: proved. `lib/template-piece-woo-layout.mjs::place` stands for the filled grid `Root/22` only; the empty branch (`sc-if {{ empty }}`, Root/14#0 to Root/19#0 / `Root/20#0` for the Taster Trio button) is no piece's missing feature, so paint conservation counts it as lost. WooCommerce's `woocommerce/empty-cart-block` draws that branch live.
- Change: the piece adds the commerce region's other data branch to its run, so the branch's paint becomes the empty-cart block's missing features.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: nothing (Mama's basket propose passes only with F-9 too).
- Verify: Mama's template-cart inventory proposes with no state-only rows for Root/14 to Root/20 (MUST FAIL without the claim).

#### F-9: A text bound to the basket count is built as the live "Basket count" chip beside its heading
- Closes: basket-5 (verified), basket-2 chip half (verified).
- Pages and clients: Mama's basket (any draft count bound to the basket).
- Cause: proved. The "Basket count" format exists (`src/blocks/extensions/inline-formats/index.js`, filled by `src/shared/cart-live/basket-count.js`); the route writes the draft's rendered "2" into the heading and keeps the chip inside it, where its paint has no reader (Root/12#0).
- Change: where a draft text is bound to the store's cart count, build the chip as its own `sgs/text` holding `<span class="sgs-basket-count">`, beside the heading in a row container, and Fill reads the chip's look onto it (as `local-mamas` has it).
- Layer and owner: this stream (template piece); if done as a heading split inside the skeleton, the general session: confirm with it before building.
- Size: M.
- Render-scope: no.
- Depends on: nothing.
- Verify: propose reports no Root/12#0 row; live: yellow chip with the live count (1, then 2 after adding one) at 375 and 1440.

#### F-10: The checkout frame piece records the page wrapper it drops
- Closes: checkout-1 half (1) (verified; cite `109aa6d53`, the frame piece "replaces no draft element").
- Pages and clients: Mama's checkout (any page whose dropped wrapper paints a background; Mama's other slim-bar pages likely).
- Cause: proved. `lib/template-piece-frame.mjs::place` takes `tree[0].innerBlocks` and drops the `#FBF3DC` wrapper Root/6#0 with no `run`, so its background is left to paint conservation.
- Change: `place` puts the dropped wrapper's key in its row's `run`, or records the background as covered when it equals the page background the snapshot sets. Call made: the `run` route, matching every other piece since `109aa6d53`.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: nothing (Mama's checkout propose passes only with F-11 too).
- Verify: failing-first test on Mama's checkout inventory: no `kept-unnamed` row for Root/6#0.

#### F-11: A label with a leading glyph in a header row draws its icon; per-width words are read
- Closes: checkout-1 half (2) (verified), checkout-16 (partly checked: the lock is checkout-1 half (2); the per-width words and the underline are unverified).
- Pages and clients: Mama's checkout top bar (and the basket and confirmation slim bars).
- Cause: proved for the lock: Root/12#0 "Secure checkout" becomes `sgs/text`, which has no icon, so the lock `<svg>` (Root/13#0) is `host-unread`. The phone wording "Secure" is a logic value per width (`secureTxt: m ? 'Secure' : 'Secure checkout'`) the route does not read. The missing underline on "← Basket": hypothesis (the `sgs/button` built from the link loses `text-decoration`).
- Change: a rule for words with a leading glyph in a header row, in the manner of `rules.headerStripBar` (`818b734d4`); per-width words written as a width variant.
- Layer and owner: general session.
- Size: M.
- Render-scope: no.
- Depends on: nothing.
- Verify: Mama's checkout propose passes; live: lock shown; "Secure" on one line at 375.

#### F-12: A confirmation sentence chosen by an order fact becomes one block per branch with its own Show-to rule
- Closes: confirmation-2 (verified).
- Pages and clients: Mama's confirmation (account eyebrow "your account is ready" / "all in one place"); Eye Care's confirmation (collection or delivery note; new or existing account note).
- Cause: proved. `includes/conditional-visibility.php` offers only `order-owner`, `order-guest`, `order-has-gift`, `order-no-gift`, `order-viewable`, `order-not-viewable`; none tests "account made with this order" or collection against delivery. `lib/template-piece-order-read.mjs::readOrder` raises Mama's choice as a problem.
- Change: plugin: Show-to rules `order-account-created` and `order-collect` / `order-delivery` (the account-created test must be proved on a real checkout-made account first). Route: in `readOrder`, a value choosing between two fixed phrases by one order field with a rule becomes two sibling blocks, each with its phrase and rule.
- Layer and owner: plugin (this stream: order blocks' conditions) and this stream (the reader).
- Size: M.
- Render-scope: no (new rules, used only where written).
- Depends on: S-3 to see it on Mama's copy; F-13 for Eye Care's half.
- Verify: Mama's propose has no problems; a guest order with "create account" shows "your account is ready", an existing customer's "all in one place"; an Eye Care collection order shows the WhatsApp sentence.

#### F-13: In a one-file draft, state written only by the order action is read as the order
- Closes: confirmation-3 option B, confirmation-5, confirmation-2 Eye Care half (verified; the verdict merges these three into one reader change).
- Pages and clients: Eye Care's confirmation, both states.
- Cause: proved. The heading is the literal "Thank you — order EC-10482."; the only other place that string appears is `placeOrder`'s `const order = {id:'EC-10482', …}`, stored via `placed`. `lib/skeleton-data-branches.mjs` forces only branches whose test reads no state, so `doneHasAccount` (reads `S.lastOrder`) is never read: the note and "View my orders" are missing from the inventory.
- Change: (a) in `readOrder`, a fixed literal equal to the sample value of the reference field of the record the order action creates is that field, bound to `number` with the surrounding words as `format`; (b) on a template with `dataBranches`, a branch whose test reads state set only by the order action is forced, and `lastOrder.signedIn || created` maps to `order-owner`.
- Layer and owner: this stream (`lib/template-piece-order-read.mjs`, `lib/skeleton-data-branches.mjs`).
- Size: M.
- Render-scope: no.
- Depends on: decision D-3 (B is the recommendation).
- Verify: failing-first tests on both reads; propose passes; order 455 for `rc-customer` shows "Thank you — order 455.", the note and "View my orders"; a guest order shows neither.

### Group B: part-look foundations

#### F-14: Part-look reads a one-file draft by its route, and refuses a template surface it cannot open
- Closes: shop-6 part 4 (verified), account-5 half (a) (verified), basket-3 `linksTo` half (verified, corrected: the draft's `pages` map holds `{account: ...}` but no checkout), the `wc` group's `summary` and `checkoutLink` anchors for Eye Care (basket-3 "same cause elsewhere").
- Pages and clients: Eye Care's shop cards, basket drawer (every page), signed-in account, checkout summary.
- Cause: proved. `sites/eye-care-ward-end/build/part-look.json` has no `shop` entry and `part-look.mjs::pagesOf` gives no shop role, so the draft opens on `home`; `lib/part-look-signed-in.mjs::readSignedInParts` runs only with a sign-in FILE and never the `route`/`init` steps; `lib/fill-part-look-page.mjs`'s `linksTo` accepts only an `<a href>` to the checkout's file, but Eye Care's Checkout is `<button onClick="{{ goCheckout }}">`.
- Change: (a) `part-look.json` gains `"shop": { "route": "shop" }` for Eye Care; `part-look.mjs` refuses a template surface of a one-file draft with no route; (b) `readSignedInParts` opens the main file, runs `L.go(<signin route>)`, signs in with `signInInPage` and reads the views `afterAuth` lands on; (c) `linksTo` also accepts a control whose handler routes to that role's page (found the way `lib/part-look-controls.mjs` finds the flow opener).
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: nothing.
- Verify: part-look reports on Eye Care: shop reads the shop page ("reading ... shop"); `my-account-in` reads 5 tabs and the item page and pairs at least Mama's 26 parts; the drawer's `panel` anchor is the dialog.

#### F-15: Part-look's stated-size rule reads `height`, viewport-capped widths and grid tracks
- Closes: basket-6 `sgsSidebarWidth` and `sgsButtonMinHeight` (verified), basket-10 `checkoutMinHeight` and `panelMaxWidth` (verified), checkout-5 cause (2) (verified, corrected: `sgsSidebarWidth` is evaluated but `not-written`, `undeclared`, because the draft's summary is a `1fr` track), checkout-8 height (verified: the draft declares `height:66px`).
- Pages and clients: Mama's basket and drawer, both checkouts, any part-look surface with a button drawn by `height`.
- Cause: proved. `lib/fill-part-look.mjs::statedSize` reads only a declared `min-height` for a min-height setting and a px `max-width` for a max-width setting; a grid ratio (`1.5fr 1fr`, `1.35fr 1fr`) is never read. Mama's pay button got the browser's default padding (1px 6px) instead.
- Change: `statedSize` takes a declared `height` for a min-height setting, a declared px `width` for a max-width setting whose own max-width is a viewport cap, and a two-track grid's side column (measured at each width where it is two columns) for `sgsSidebarWidth`; never write a padding equal to the user-agent default.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: unit tests for each read (MUST FAIL first); compare against `local-mamas`: `checkoutMinHeight` 56px, `panelMaxWidth` 440px (100% mobile), `sgsButtonMinHeight` 62px (basket) and 66px (checkout), `sgsSidebarWidth` 477px on the checkout at 1440.

#### F-16: Part-look writes a part's current-state look from the element the current locator finds
- Closes: account-7 part-look half (verified, corrected: Eye Care's indicator rows are not current-state rows; `menuActiveIndicatorStyle` is a mode with no part, so the Eye Care half moves to F-39's modes).
- Pages and clients: Mama's account menu; any block's `current` state row (cart and checkout steps).
- Cause: proved. `lib/fill-part-look.mjs::buildLook` marks every row with a `css_state` not-written, including `current`, although the `menuActive` locator finds the current element at every width.
- Change: pair a `css_state: current` row with the reads of the locator carrying `ariaCurrent: true` for that element, as the hover reader does for `hover`.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: F-14 for Eye Care.
- Verify: test (MUST FAIL first); Mama's account menu's current tab yellow with cocoa text after part-look.

#### F-17: Part-look's verify and compare say when they compared nothing
- Closes: checkout-2's "585 of 644" (verified: none of the 40 unpaired parts is compared), the basket verdict's new item (unchecked: `part-look-compare` reports a non-px size as "the draft shows no element").
- Pages and clients: every part-look surface.
- Cause: proved for the verify count (the report's lists). The compare's wrong reason is unchecked.
- Change: `lib/part-look-verify.mjs` counts unpaired and unlocated parts as "not verified" and the report leads with them; the compare reports the real reason for a non-px size.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: Eye Care checkout's report shows "70 parts not verified" beside the 585; a planted non-px size gives its own reason.

### Group C: basket drawer and basket page

#### F-18: The basket drawer's panel never paints near-black when the site has no `base` colour
- Closes: basket-1 plugin half (verified, corrected: the wrong file and size).
- Pages and clients: Eye Care, every page (the drawer opens site-wide); any site whose palette lacks `base` (none of Mama's, Indus's or Eye Care's snapshots has it).
- Cause: proved. `src/blocks/cart/block.json` defaults `panelBg` to `"base"`; the `::after` layer is printed in `src/blocks/cart/render-scoped-css.php` (the `$has_panel` branch) as `var(--wp--preset--color--base, currentColor)`, and the `currentColor` fallback comes from `includes/helpers-tokens.php::sgs_colour_value`, which every block uses.
- Change: in the cart's `$has_panel` branch, an unset or unresolvable `panelBg` resolves to the page's own background (the snapshot's `styles.color.background`, or `Canvas` with `CanvasText`). Call made: fix it in the cart branch, not in `sgs_colour_value`, which would change every block on every site.
- Layer and owner: plugin bug (this stream's block).
- Size: M.
- Render-scope: yes: every page of every site without a saved `panelBg` (the drawer is site-wide); Mama's and Indus's hand-set `panelBg` keep their look.
- Depends on: nothing (F-20 is the route half).
- Verify: on `local-mediatest-trec` with no `panelBg` saved, the `::after` background differs from the text colour and the words read at 4.5:1 or more at 375 and 1440.

#### F-19: Part-look locates Eye Care's drawer from the dialog, and reads the drawer's count, subtotal, brand and empty state
- Closes: basket-3 locator half (verified), basket-10 locator and empty-read items (verified).
- Pages and clients: the drawer on every page, both clients (Eye Care's is read wrong today; Mama's misses 16 parts).
- Cause: proved. `data/part-locators.json` `groups.drawer.anchors.drawer` falls back to the `smallest` overlay holding priced lines, which is the scroll list inside the dialog, so `panel-heading` is "Ray-Ban" at 12px, `freeDeliveryTrack` the thumbnail; 16 parts have no locator (empty state, count, subtotal row, item brand eyebrow); the header surface reads the draft only with a filled basket.
- Change: the drawer anchor takes the dialog first (`role="dialog"` or `aria-modal`, else the largest fixed box in overlay scope holding the lines); locators for the count, subtotal row, item brand and empty state (`emptyMessage`, `emptyCta`, `panelEmpty`); a second read with the basket emptied (`part-look.json` init).
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: F-14.
- Verify: `part-look.mjs --client eye-care-ward-end --surface header --site local-mediatest-trec --compare`: `panel-heading` "Bag" 22px, `freeDeliveryTrack` 412x2, `panelFrame` 460 wide, `panelBg` read, no unpaired `panelFooter`, `panel-checkout`, `panelClose`; Mama's empty-state rows equal `local-mamas`.

#### F-20: Part-look decides the drawer's modes and words from the draft
- Closes: basket-4 (verified), basket-9 route half (verified), basket-1 route half (`panelBg` never read for Eye Care).
- Pages and clients: the drawer on every page, both clients.
- Cause: proved. `data/part-look-modes.json` has no `sgs/cart` rules; the shop-parts record (`sites/<client>/build/shop-parts.json`) writes only the empty message and button, the add-options switch and label, the remove label and Mama's `checkoutLabel`, and its `drawer-count`, `drawer-quantity` and `drawer-view-basket` rows carry `write: null`.
- Change: `sgs/cart` rules over the drawer's located parts: `panelShowCount`, `itemShowQty` or `itemQtyStyle: stepper`, `itemShowSaveForLater` and `panelShowViewCart` false when absent, `itemRemoveStyle: text` and `itemRemovePlacement`, `panelActionsLayout: stacked`, `freeDeliveryPlacement: footer`, `panelGiftShow`, `freeDeliveryHideWhenEmpty`, the gift box's placement (needs F-62's setting); words by position (`panelHeading`, `panelTaxNote`, `panelInstalmentsNote`, free-delivery messages).
- Layer and owner: this stream (part-look modes); the words rows in `lib/shop-parts.mjs`: owner to confirm (hypothesis: the general session, as it runs inside Fill).
- Size: M.
- Render-scope: no.
- Depends on: F-19, F-62 (gift placement setting).
- Verify: on `local-mediatest-trec` after part-look `header --write`: "Bag (1)", no quantity box, no Save for later, no View cart, underlined Remove, the bar under the subtotal, one full-width Checkout and the Klarna line; Mama's from a stripped header reproduces the hand-finished values (basket-4's list).

#### F-21: Mama's basket page: the remaining part-look reads
- Closes: basket-6 remainder (verified: `sgsItemGap` 0px against 16px; `sgsItemVariantColour` mm-muted against mm-cocoa; `sgsSummaryHeadingLineHeight`, `sgsItemCellPadding`).
- Pages and clients: Mama's basket.
- Cause: hypothesis for `sgsItemGap`: part-look reads the item row's own gap where the setting is the gap between cards (prove from `pl-mm-cart-compare/report.json` `located.line-item` and the draft list's `gap:16px`). The variant colour, line height and cell padding: not yet traced.
- Change: pair `sgsItemGap` with the list's gap; trace the other three on the compare report. The coupon and gift card rows the draft does not draw follow decision D-6.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: F-8, F-9 (a fresh build), D-6.
- Verify: the compare against `local-mamas` shows those rows equal; the 1440 pair beside the draft.

#### F-22: A moved dialog stops picking up its ancestors' bare Custom CSS rules
- Closes: basket-11 (verified, corrected: the Eye Care symptom is on the 2026-10-28 header; `d3a112314` now writes the root row's padding to the trigger, so reproduce on a fresh header first: latent shared-code bug).
- Pages and clients: any drawer or mega panel whose ancestors carry a bare `&{...}` Custom CSS rule.
- Cause: proved in code: `src/shared/nav-interactivity/custom-css-scope.js::carryCustomCssScope` copies every ancestor's `sgs-c-*` class onto the dialog before it moves to `<body>`, so a rule for the ancestor itself also matches the dialog.
- Change: carry ancestor scopes as a `data-` marker and compile each scope's descendant rules for that marker too.
- Layer and owner: plugin, shared code; tell the general session (the mega panel uses the same carry).
- Size: M.
- Render-scope: yes: every page with a drawer or mega panel on every site.
- Depends on: S-5 (reproduce on a fresh header first).
- Verify: open the drawer on a fresh Eye Care header: dialog padding 0; the trigger's wrapper keeps its 11px and 14px.

### Group D: checkout

#### F-23: Part-look locates checkout parts by role and logic, not tag
- Closes: checkout-2 (verified; `line-item-name` conflict is 10 against 11px, not 14), checkout-6 cause (2) (verified: chosen and unchosen tiles conflict), checkout-10 locator half (partly checked: `summary-fill`, `line-item-brand`), checkout-13 notice half (verified).
- Pages and clients: both checkouts; Eye Care far worse (42 of 112 parts paired; Mama's 74).
- Cause: proved. `data/part-locators.json` `groups.wc.parts` expects labelled `<fieldset>` steps, radio rows and a submit button; Eye Care draws steps as `<section>` with an `<h2>` holding a number span, delivery as two `<button onClick>` tiles, the pay button as `<button onClick="{{ placeOrder }}">`; the item brand has no locator; the `option` locator matches chosen and unchosen tiles alike; `notice` does not pair Mama's dashed allergen note (Root/115#0).
- Change: a step is a section-level element whose first child is a heading and that holds fields or choices; a step number is a heading's leading short numeric child; a delivery option is a control whose handler sets the method state the summary's shipping line reads, `option-chosen` by `aria-pressed` or a painted difference within the loop; the pay button is the form column's last full-width control whose handler is the place-order effect (`lib/shop-parts-logic.mjs::effectOf`); `line-item-brand` is the item's first, uppercase, smaller line; `summary-fill`; `notice` pairs a bordered plain-text box in the form column.
- Layer and owner: this stream.
- Size: L.
- Render-scope: no.
- Depends on: F-14 (Eye Care's summary anchors), F-17.
- Verify: Eye Care's report lists `step-title`, `step-number`, `option`, `option-chosen`, `primary-button`, `terms`, `line-item-brand` paired; after `--write --verify`, pairs at 375 and 1440 show "1 CONTACT", two tiles side by side, "PAY NOW · £428" split; Mama's chosen tile `#FCEBBE` with a 4px 4px shadow; the allergen note dashed 2px, radius 20.

#### F-24: A checkout content step writes the checkout's own words, steps and extra blocks
- Closes: checkout-3 (verified, corrected), checkout-8 separator half (verified, corrected: no plugin item; `woocommerce/checkout-actions-block` has `priceSeparator`), checkout-10 words half (partly checked), checkout-14 order-note half (partly checked), checkout-12 route half (verified), checkout-13 terms words (verified: the terms block has a `text` attribute).
- Pages and clients: both checkouts.
- Cause: proved: no route file writes `placeOrderButtonLabel`, `sgsCheckoutStrings`, `showFormStepNumbers`, the step titles or the WooCommerce checkout options; `template-piece-woo-layout.mjs::place` leaves the page's Checkout block as it is. Mama's copy shows the draft's words only because the lab strip left the hand-built inner blocks (S-6).
- Change: a content step run with the template piece (the `lib/template-piece-account.mjs` pattern), writing onto the inner blocks where they live: each step's title and `showFormStepNumbers`; `placeOrderButtonLabel` and `priceSeparator` (empty removes the dot); `sgsCheckoutStrings`, `sgsSummaryEditLinkLabel`, `sgsItemShowBrand`; the terms block's `text`; remove the order-note block when the draft draws no note; place `sgs/commerce-note`, `sgs/pay-later-message` and `sgs/gift-order` (with its settings) where the draft draws them; set `woocommerce_enable_signup_and_login_from_checkout` when the draft draws "Create an account". Reuse `data/part-look-modes.json`'s `from.text` with `label:true` and `hasAmount` for the button words (whether it can write inner blocks is unchecked).
- Layer and owner: this stream.
- Size: M (the verdict judged L too large: much of the machinery exists).
- Render-scope: no.
- Depends on: S-6 (a truly blank checkout page to prove it on).
- Verify: on a copy whose checkout page holds WooCommerce's default block, Eye Care shows "1 CONTACT / 2 DELIVERY / 3 PAYMENT", "PAY NOW … £428", "YOUR BAG · Edit", the Klarna and secure-payment lines, no order note; Mama's its four numbered titles, gift step and allergen note; the pay button has no dot.

#### F-25: Part-look writes WooCommerce's field geometry from the draft's layout, not its padding
- Closes: checkout-6 cause (1) (verified), checkout-7 (verified; the overlap cause is a hypothesis).
- Pages and clients: both checkouts (Mama's dots on the words; labels inside the boxes on both); the basket's coupon field and account forms.
- Cause: proved: part-look copies the draft tile's own `padding-left` (16px) into `sgsOptionPadding`, but WooCommerce draws its radio absolutely inside that padding (the draft's dot is a grid column: text at 50px); `sgsFieldLabelPosition` (`commerce-look/fields.php`, enum `above`, `floating`) has no `css_element` and no writer. Hypothesis: the zero top padding written into `sgsFieldInputPadding` makes the floated label overlap a filled select (prove by restoring WooCommerce's padding on a copy).
- Change: for a choice tile whose dot is an in-flow child, the option's left padding is the text's offset from the tile edge; write `sgsFieldLabelPosition: above` when the draft's label sits above its input, and keep `floating` with no zero top padding when the draft uses placeholders.
- Layer and owner: this stream (`lib/fill-part-look.mjs`).
- Size: S.
- Render-scope: no.
- Depends on: F-23 for Eye Care's tiles.
- Verify: Mama's shipping label starts at least 8px right of the radio at 375 and 1440; every Mama's label sits above its field; on both the country select's label and value do not overlap.

#### F-26: The woo-layout piece keeps the commerce region's own width and centring
- Closes: checkout-5 cause (1) (verified).
- Pages and clients: Mama's checkout (and Mama's basket, the same region shape); Eye Care unaffected (its cap is on `<main>`).
- Cause: proved. The 1160px cap and centring are painted on the region Root/17#0, which `core/post-content` stands for and cannot hold; the cap is in neither the missing features nor the Fill report.
- Change: `lib/template-piece-woo-layout.mjs::place` wraps `core/post-content` in an `sgs/container` carrying the region's max-width and centring, or hands it to the main container's `maxWidth`.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: F-10, F-11 (Mama's checkout must rebuild).
- Verify: Mama's checkout at 1440: block 1160 wide, main column 643, summary 477 (±2px, with F-15).

#### F-27: The theme's `small` type size is never a one-off chip size
- Closes: checkout-4 (verified, corrected: layer, site and size), checkout-18 (partly checked; nothing beyond checkout-4's size and the error-type setting).
- Pages and clients: Eye Care, every WooCommerce secondary line (checkout, drawer, account forms, confirmation) and any core block using `has-small-font-size`; only Eye Care's clone sites (`eye-care-clone-test` and its lab copies; `eye-care-test` has its own snapshot; Mama's small is 13px).
- Cause: proved. `plugins/sgs-blocks/scripts/theme-extractor/token_families.py::pick_font_scale` picks "the smallest token in use below body" as `small`: the draft's 9.5px "SOON" chip; WooCommerce's checkout uses `var(--wp--preset--font-size--small,14px)` 36 times.
- Change: `pick_font_scale` takes the draft's most used small body size (12.5 to 14px here), never a one-off size. Call made: the extractor rule, not a floor in the commerce look (a floor would change every site's checkout). The error-text type setting is in F-61.
- Layer and owner: general session (the token extractor, its RW-17 area).
- Size: M.
- Render-scope: yes, on re-extract: every client's snapshot can change; list each client's changed `small` value and its pages before re-extracting.
- Depends on: nothing.
- Verify: extractor test (MUST FAIL first) on Eye Care's draft; `.wc-block-components-validation-error` and `.wc-block-components-radio-control__label` at least 12.5px at 375 and 1440.

### Group E: shop

**First wave (settled with the main session):** F-28 and F-68 are this stream's first-wave theme fixes. Reason: MIC's phone filter is cloned on 2026-11-28, and the general session's RW-27 route half (F-29) lands in its wave 2 (about 2026-11-23) only after F-28, while RW-27's threshold write waits for F-68.

#### F-28: A closed filter drawer takes no space, whatever layout class its container prints (FIRST WAVE)
- Closes: shop-7 (verified).
- Pages and clients: every site's shop page (theme CSS); seen on eye-care-clone-test at 375; masked on `local-mediatest-trec` only by the hide flags F-29 removes.
- Cause: proved (CDP matched rules). The closed `dialog#sgs-shop-filters` computes `display:flex`, `position:sticky`, `translate: 0 100%`, 1,791px tall at 375: `.sgs-container--stack { display:flex }` (author CSS) beats the browser's `dialog:not([open]) { display:none }`, and the theme's `translate` only moves it out of sight.
- Change: in `theme/sgs-theme/assets/css/woocommerce.css`, `dialog.sgs-shop-filters:not([open]) { display: none; }` below the drawer breakpoint, specific enough to beat any container layout class.
- Layer and owner: theme (this stream).
- Size: S.
- Render-scope: yes: every site's shop and product-archive pages; list them.
- Depends on: nothing.
- Blocks: F-29's route half. Without F-28, the route half (no hide flags on the rail) exposes the ~1,790px blank band at 375 on every route-built shop.
- Verify: at 375 on a site whose rail container is `layout: stack`, the first card sits under the toolbar and the panel has no box until opened; open still shows the full drawer.

#### F-68: The theme prints its filter drawer rules from the breakpoint option (FIRST WAVE)
- Closes: shop-3's drawer-breakpoint correction (verified), shop-4 theme half (verified).
- Pages and clients: every site's shop page (theme CSS).
- Cause: proved. `sgs_shop_filter_drawer_breakpoint` feeds only the script (`inc/shop-filters-settings.php::localise_shop_filter_settings`, `BREAKPOINT` in `sgs-shop-filters.js`); about 8 media rules in `woocommerce.css` are fixed at 781.98px/782px (bottom sheet, toggle display, one-column layout, sticky trigger), so writing 1060 leaves 782 to 1059 broken.
- Change: the theme prints those rules from the option (rules generated in PHP from the saved value; the default 782 renders exactly as today).
- Layer and owner: theme (this stream).
- Size: M.
- Render-scope: yes: every site's shop pages; with the option unset nothing should change, which the render-scope run must show.
- Depends on: nothing.
- Blocks: F-29's threshold write and F-30's writing of `sgs_shop_filter_drawer_breakpoint`.
- Verify: with the option at 1060 on a copy: at 900 the Filter button opens a full-screen panel, at 1080 the sidebar shows; with it unset, the 781/782 behaviour is unchanged.

#### F-29: The width gate never hides a rail the rail rule marks (RW-27, split in two)
- Closes: shop-4 Fill half (verified, corrected: at 782 to 1023 neither rail nor toggle shows; only 1024 to 1059 shows the sidebar).
- Pages and clients: Eye Care's shop, and MIC's phone filter (cloned 2026-11-28); any draft whose rail becomes a drawer below some width.
- Cause: proved. `lib/fill-width-gate.mjs` step 4 snaps 1060 to the 1024 tier and writes hide flags on the rail; its `!important` hide beats the open drawer's `display:flex`.
- Change, as the general session splits it: (a) route half, its wave 2 (about 2026-11-23): the width gate writes no hide flags on a rail node the rail rule marks, and the rail's `pinEdge` goes to desktop only; (b) threshold half: the rail's node carries `ownAlternativeBelow: { setting: 'sgs_shop_filter_drawer_breakpoint', scope: 'theme-mod' }` (this stream writes it in `lib/skeleton-filter-rail.mjs`), and the gate hands the threshold to F-30's step.
- Layer and owner: general session (the gate) and this stream (the marker).
- Size: S.
- Render-scope: no.
- Depends on: (a) lands AFTER F-28 (explicit: otherwise the blank band shows at 375); (b) waits for F-68 and F-30.
- Verify: RW-27's tests; live at 375 and 900 the Filter button opens the panel; at 1080 the sidebar shows; at 375 closed, no blank band.

#### F-30: A site-build step writes the theme's shop options the draft decides
- Closes: shop-3 (verified, corrected), shop-8 words half (verified).
- Pages and clients: both shop pages, every width.
- Cause: proved. Only `lib/site-build-catalogue-toggle.mjs` writes theme options (the five boolean-toggle ones); the other 51 `sgs_shop_*` settings keep their defaults (count words, sort labels and order, prices "£139.00", panel style and heading, drawer words and place, chosen-filter bar, sticky trigger, gaps, list type).
- Change: `lib/site-build-shop-options.mjs` with `data/shop-options.json` (option, draft evidence, how the value is read), run by `site-build.mjs` after the shop's propose, writing each option the draft decides and reporting each it cannot (values for both drafts in `shop.md`'s table). Include the singular count wording (`sgs_shop_count_label_single`; the drawer's "Show %d frames" has no singular in the draft: report it). Correct the sorting piece's notes ("Biggest saving" and "Brand A–Z" are the theme's `sgs_biggest_saving` and `sgs_brand_az` orders).
- Layer and owner: this stream.
- Size: M.
- Render-scope: no (writes only on the client's own run).
- Depends on: S-2 (theme mods cleared on the copies first, so the proof is real); the `sgs_shop_filter_drawer_breakpoint` write waits for F-68.
- Verify: on each rebuilt copy `get_theme_mods()` holds the table's values; at 375 and 1440 the toolbar, count words, sort labels, prices, panel, drawer words and chosen filters match the draft.

#### F-31: Eye Care's results count is kept and placed (RW-26 plus the count piece)
- Closes: shop-8 (verified).
- Pages and clients: Eye Care's shop (any draft whose count sits beside its sort select).
- Cause: proved. `rules.formControl` takes the count `<span>` (Root/252, sibling of the select, a loop's length) as the select's label and removes it, so the results-count piece finds no node.
- Change: RW-26 (a field's label is only an element the control is labelled by); `lib/template-piece-shop-sort.mjs` places `woocommerce/product-results-count` where the count stood if another rule removed its node.
- Layer and owner: general session (RW-26) and this stream (the piece).
- Size: S.
- Render-scope: no.
- Depends on: F-30 for the words.
- Verify: RW-26's test; "16 frames" left of the sort at 1440 and in the toolbar at 375.

#### F-32: The filter rail builds each group the way the draft draws it
- Closes: shop-9 (verified).
- Pages and clients: Eye Care's shop (any shop draft with a filter rail).
- Cause: proved. `lib/skeleton-filter-rail.mjs::filterRail` sets `showCounts` for every group from the rule's fixed attributes and never writes `sgs-filter-segmented`, `sgs-filter-count` or `sgs/filter-search`.
- Change: per group, by structure: `sgs-filter-segmented` for one-choice segments with "all" first (or the chips block's `sgsChipSingle` + `sgsChipAllLabel`); `sgs-filter-count` when the heading shows a number; `showCounts` only when options show numbers; `sgs/filter-search` before a list when the group shows a text input.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: failing-first test on Eye Care's rail; live at 1440 and in the drawer: the All / Women / Men switch, plain chips, "Search brands", heading counts 40 and 12.

#### F-33: Part-look decides the product card's switches and reads its parts
- Closes: shop-6 parts 2 and 3 (verified, corrected: part-look reads 1440, 768 and 375; colour-named `packSizes` exist only on Eye Care) and its 375 blank band.
- Pages and clients: both shops; every product card (home best sellers, related products, Mama's Gifts).
- Cause: proved. `data/part-look-modes.json` card rules decide only showPickers, showLadder, showDescription, showShadow, showCta true and ctaText; `data/part-locators.json` group `productcard` has no part for brand, rating, ratingStars, rrp, savingBadge, wishlist, swatch, swatchMore, attributeTag, noImageLabel, and reads Eye Care's brand overlay as `tag`. The blank band at 375 is the fixed 220px media box with no `imageRatio`. Hypothesis to prove on the rebuilt card: the 2026-11-20 build's `variantStyle: trial` with colour-named `packSizes` is Fill reading colour dots as pack-size pills.
- Change: modes `showCta false whenAbsent cta`, `showSwatches false whenAbsent swatch`, showRating, showBrandOverlay, showSavingBadge, showWishlist, showAttributeTag when found, `priceFromLowest`, `imageRatio` from the photo's aspect, `showDescriptionTier`; locators for brand, wishlist, savingBadge, rating, ratingStars, rrp, swatch, attributeTag by structure.
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: F-4, F-5, F-7 (fresh shop builds), F-14, S-5 (card calibration).
- Verify: rebuilt cards show Eye Care's brand, heart, badge, stars, struck RRP and dots with no pickers or button; Mama's badges, "from £9.50", notes and no dots; no blank band at 375; part-look's shop verify compares the new parts at 375 and 1440.

#### F-34: The catalogue writes every product fact the draft holds
- Closes: shop-6 part 5 (verified), shop-12 (verified), product-1 catalogue half (verified, corrected), product-19 catalogue half (verified).
- Pages and clients: both clients' shop and product pages.
- Cause: proved. No badge or price-note meta (`badgeMetaKey`, `priceNoteMetaKey`); every Eye Care `menu_order` 0 (title order); the copy's SKU is "sgs-draft-9", not the draft's code; size terms hold only `_sgs_variesby_value`. Eye Care's `blurb` is a logic function, not a record field, and `lib/catalogue-records.mjs::descriptionField` picks record keys only, so reading it is more than one line.
- Change: `lib/site-build-catalogue-php.mjs` writes `menu_order` as the draft list's index, each product's badge and price note as meta (part-look sets the two meta keys), the draft's code as the SKU, each size's measurement where `pickerSubLabelMetaKey` reads it, and the description from the draft's description value (`descriptionField` taught to follow a logic function to the record field it returns).
- Layer and owner: this stream (catalogue).
- Size: M.
- Render-scope: yes for `menu_order`: it changes product order on each client's next catalogue run; list each client's shop listing pages.
- Depends on: nothing.
- Verify: `/shop/` lists the draft's order (`?orderby=price` still sorts by price); Mama's cards show "Build your own" and "£1.19 a cookie"; Eye Care's product description is its blurb.

#### F-35: The theme's fixed shop looks become per-property values
- Closes: shop-10 (verified, corrected: the chip half moves to F-6).
- Pages and clients: every client shop but the one each look was measured on.
- Cause: proved. `woocommerce.css` hard-codes the Filter toggle (`body.sgs-shop-toggle-outlined`: 44px, 0 16px, 1px border, 12.5px; "filled" a black pill), the chosen pills (34px, radius 999, 12.5px), the thin price slider (6px track, 14px handle); the drawer's Clear and Show buttons have only `sgs_shop_drawer_caps`; single-value options lack a phone value (`sgs_shop_card_min_width`) and size-only options lack the rest (`sgs_shop_filter_heading_size` family and weight; swatch size).
- Change: the Filter button becomes the draft's own `sgs/button` classed `sgs-shop-filters__toggle`, adopted by `assets/js/sgs-shop-filters.js::ensureParts` (hypothesis that the kit's markup works as the trigger: prove on a copy); chosen pills, slider, swatch and drawer buttons become custom properties written by F-30's step.
- Layer and owner: theme (plugin-round-sized).
- Size: L.
- Render-scope: no if the named looks keep printing their current values by default (new properties fall back to today's numbers).
- Depends on: F-30.
- Verify: Eye Care's and Mama's values both render through the same settings on two copies.

### Group F: account

#### F-36: The account block's layout rules beat WooCommerce's floats and clearfix
- Closes: account-2 (verified, corrected), account-3 (verified), account-18 (verified), the lost-password rows in account.md's Custom CSS table.
- Pages and clients: both clients' addresses view, sign-in pair and tabs layout; every site with `sgs/account`.
- Cause: proved. `.sgs-account .col2-set::before,::after{content:none}` ties with WooCommerce's `.woocommerce .col2-set::before`, which loads later and wins, so the clearfix takes the grid's first cell; `.sgs-account .woocommerce-Address{float:none;width:auto}` (exists) loses to `.woocommerce .col2-set .col-1` (0,3,0); in tabs layout the full-width rule is scoped `:where(:not([data-auth-layout="tabs"]))`, so `.col-1 {float:left;width:48%}` holds (298px of 620px). The verdict notes the finding's proposed selector only ties and still loses.
- Change: one edit to `plugins/sgs-blocks/src/blocks/account/style.css` with specificity above WooCommerce's (an id or a doubled class): `content:none` on `.woocommerce-Addresses.col2-set` and `#customer_login.col2-set` pseudo-elements; `float:none;width:auto` on the addresses, the two `#customer_login` columns in tabs layout, and the lost-password form's `form-row-first/last`.
- Layer and owner: plugin bug (this stream's block).
- Size: S.
- Render-scope: yes: every account page on every site (`local-mamas`, `local-indus`, `local-eye-care` mirrors, plus the live shop).
- Depends on: nothing.
- Verify: `addr-probe.mjs` on both copies: both cards in row 1, 468px each; `tabs-cols.mjs` at 1440: the open panel as wide as the tabs row; `out-probe.mjs` (once registration is on, F-42): two `#customer_login` children with the same y.

#### F-37: The account block's type and border settings get their parts in the framework database
- Closes: account-12 (verified, corrected), and through it the title of account-2, the underline of account-8, the frame of account-3.
- Pages and clients: both clients' account pages.
- Cause: partly proved. 1,066 settings, 603 with a part, 463 without, 132 unit companions; 97 look settings with no part (90 type, 7 border or radius) plus about 47 painted spacing and size settings (`authPairGap`, `resetFormPadding`, `accountFieldsetPadding`, `navWidth`): about 144 in all. Why the seeder misses them is a hypothesis: `addressTitle` declares `prefix` and `clusters`, which `extract-signatures.py::_load_element_manifest_reverse`'s prefix convention should map without `attrMap`, yet `orderDetailText` has no `attrMap` and its font-size row has a part. Prove by tracing one family through the seeder.
- Change: after the cause is proved, either fix the seeder's prefix mapping or add the families to each element's `attrMap` (plus elements for `authPair`, `authPairCell`, `resetForm`, `accountFieldset`); then reseed. Build the detector first (migration method): every attribute painted through `sgs_typography_css_rule` with a prefix has a part.
- Layer and owner: plugin metadata or the seeder (plugin round); the reseed is announced to the setting-record session.
- Size: M (cause unproved; reseed).
- Render-scope: no (metadata only).
- Depends on: nothing.
- Verify: the database query returns 0 look settings without a part (unit companions and content excluded); the detector's self-test.

#### F-38: The order page shows its order: part-look switches on its parts, and the look switch alone never hides it
- Closes: account-1 (verified, corrected).
- Pages and clients: Mama's order page (Eye Care after F-14); any site with `orderDetailLook` on alone.
- Cause: proved. Part-look writes `orderDetailLook` (`whenFound: od-placed`) and none of `orderDetailProgress`, `orderDetailItems`, `orderDetailBoxes`; `helpers-account-order-detail.php::sgs_account_order_detail_html` then prints heading, date and status only. The `od-row` and `od-text` locators already find lines inside the draft's boxes at all three widths; only the steps and item locators are missing.
- Change: (a) route (the root cause): locators `od-steps` and `od-item` (`view: "detail"`), rules `orderDetailProgress` whenFound `od-steps`, `orderDetailItems` whenFound `od-item`, `orderDetailBoxes` keyed on `od-row`/`od-text`; (b) plugin hardening: print WooCommerce's order table when neither items nor boxes is on. Call made: (b) is in, because a page that shows no order is broken today (Bean's "a fix applies everywhere" rule).
- Layer and owner: this stream (route and plugin).
- Size: M.
- Render-scope: yes for (b): every site whose saved account block has `orderDetailLook` on alone; list its order pages.
- Depends on: F-14 for Eye Care.
- Verify: Mama's order page holds `.sgs-account__od-steps`, `__od-items`, `__od-boxes` and the total; a plugin test with only `orderDetailLook` still lists the items.

#### F-39: Part-look decides the signed-in account's menu, form and card modes
- Closes: account-5 half (b) (verified), account-6 (verified), account-7 Eye Care half (re-homed: `menuActiveIndicatorStyle` mode and `menuSidebarBorderWidth`), account-11 (verified, corrected: `loginButtonScope: all-forms` already carries the look to every form button; the gap is a rule writing it), account-13 (verified), account-14 (verified), account-17 width half (verified, corrected: `width` is read by `fill-part-look.mjs`, but the draft states none).
- Pages and clients: both clients' signed-in views and forms.
- Cause: proved. `openItemInPage` and the `orderCards` anchor want a card containing a control (Eye Care's rows are whole-row `<button>`s); `data/part-look-modes.json` `sgs/account` has 5 mode rules (none for the menu, the details form's columns and cards, `addressEditor`, `showGuestLine`, `loginButtonScope`); a button filling its form is never read as `full`.
- Change: `orderCards` and `openItemInPage` accept a repeated control that holds an amount; menu by what each tab's view holds (`menuOrder`, `hiddenEndpoints`, labels into `strings.*`, `menuOrdersCount`, `menuAddressesCount`, `menuAccountTick`, `showMenuIcons: false`, `navLayout`); `accountFormColumns "2"`, `accountDetailsCards`, `accountDisplayFromNames`; `loginButtonScope: all-forms` when the form buttons share the sign-in look; `addressEditor` when a card holds two or more controls or an add card is drawn (shadow conflict: prefer the default instance); `showGuestLine`, `showQuickCards`, `showLatestOrder` false when absent; `<prefix>WidthType: full` when a button's width equals its form's content width; Eye Care's `menuActiveIndicatorStyle: line`.
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: F-14, F-36 (addresses), F-42 (the register form).
- Verify: `clone-in.mjs`: Mama's menu Orders, Addresses, Account details, Sign out with counts; Eye Care's five tabs, no icons; two-column details form with no display-name field; no guest line; `addressEditor` cards; buttons as wide as their forms.

#### F-40: Part-look writes the signed-in views' words
- Closes: account-9 (verified), account-1's words.
- Pages and clients: both clients' signed-in views and order page.
- Cause: proved. `lib/template-piece-account-read.mjs::signedInWords` reads only two panel headings and the sign-out words; part-look's signed-in reader opens each tab and the item page but writes looks and modes only.
- Change: a `words` map in `data/part-look-modes.json` `sgs/account` (part to content setting, `{order}`/`{date}` tokens where the draft's words hold the located number or date), run by `lib/part-look-modes.mjs` after the modes; a word holding a live value is a note.
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: F-38, F-39.
- Verify: the saved block holds account-9's word list; the order page reads "Order 5998", "← All orders".

#### F-41: The account band greets the signed-in customer
- Closes: account-10 (verified).
- Pages and clients: both clients, every signed-in view.
- Cause: proved. `data/template-pieces.json` `pages.account` sets no `dataBranches`; no route code writes the `sgs/customer` binding or `sgsConditionLoggedIn`.
- Change: `dataBranches: true` on `pages.account`; in `lib/template-piece-account.mjs`, a band text whose words differ by sign-in binds to `sgs/customer` `first_name` with the draft's sentence as `format`, else both versions with `sgsConditionLoggedIn`; add `email` to `Customer_Binding::KEYS` for Eye Care's "Signed in as" line (or use `headerAccountMeta` with `{email}`). Mama's "next subscription bake" line is a note (D-2, D-4).
- Layer and owner: this stream (route and a one-line plugin key).
- Size: M.
- Render-scope: no.
- Depends on: nothing.
- Verify: signed-in headings: "Hello, Sam" on both; Eye Care's "Signed in as rc-customer@example.com"; signed out unchanged.

#### F-42: The account surface run turns on registration with a chosen password
- Closes: account-4 (verified, corrected: owner).
- Pages and clients: both clients' signed-out page (Eye Care's register card missing today).
- Cause: proved. `lib/site-build-account-registration.mjs::runAccountRegistration` is run only by `site-build.mjs`, not by `clone-surface.mjs --surface my-account`; no step reads the drawn `new-password` field into `woocommerce_registration_generate_password`.
- Change: plan `woocommerce_registration_generate_password = no` when the drawn register form holds a `new-password` field; run the account step from the my-account surface run.
- Layer and owner: general session (`lib/site-build-account-registration.mjs`, `clone-surface.mjs`).
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: `out-probe.mjs` on the Eye Care copy: `#customer_login` with two children and `input#reg_password` followed by the hint.

### Group G: order confirmation

#### F-43: The confirmation shows an order-access card to a visitor who may not see the order
- Closes: confirmation-4 (verified).
- Pages and clients: every route-built confirmation (Mama's; Eye Care once F-13 lands).
- Cause: proved. `data/template-pieces.json` `templates.order-confirmation` names only `order-number` and `order-items`; nothing places `woocommerce/order-confirmation-status`; `lib/template-piece-order.mjs::placeValues` and `ruleOrderCards` give `order-viewable` only to bound blocks and all-order containers.
- Change: a required piece `order-access` placing the status block in a container with `order-not-viewable` at the top of the main, and `order-viewable` on every top-level section of the draft's confirmation content; fixed framework words for the not-viewable heading when the draft draws no such state (gap G-5). The status block's look settings are in F-64.
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: S-3 (Mama's surface rebuilt).
- Verify: `investigation\confirmation\probe.mjs` with `mm-states.json`: guest past grace and wrong key show only the status card; the owner with the right key sees no status card.

#### F-44: Part-look reads the order lines card on the confirmation
- Closes: confirmation-7 route half (verified).
- Pages and clients: Mama's confirmation (Eye Care's draws no lines).
- Cause: proved. `data/part-locators.json` has no surface for `sgs/order-items`; the route's saved block holds only five switches and a label where the hand-finished one holds 20 look settings, all existing.
- Change: a `confirmation` surface in `part-locators.json` for `sgs/order-items`' parts (thumbnail, name, meta, price, totals, total, row). Hypothesis to prove: `thumbHeight` loses to WooCommerce's `.woocommerce img{height:auto}`.
- Layer and owner: this stream (the missing block settings are in F-64).
- Size: M.
- Render-scope: no.
- Depends on: S-3, F-64 for the four missing settings.
- Verify: part-look's confirmation verify compares font, size, colour, thumbnail box and totals rule with the draft at 375 and 1440.

#### F-45: A bound text that is empty renders nothing, and so does its holder
- Closes: confirmation-6 halves (b) and (c) (verified).
- Pages and clients: Mama's confirmation (empty bake pill and step line); every site for (c).
- Cause: proved. `Order_Binding::get_value` returns '' for an unanswered fact; `ruleOrderCards` rules a container only when every child is order-bound, so the pill keeps its icon disc; `src/blocks/heading/render.php` prints its tag on empty content (`sgs/text` stops).
- Change: (b) a container whose only words come from bound blocks hides when they are empty (a Show-to rule `order-fact-present` or a container option); (c) `sgs/heading` stops on empty content like `sgs/text`.
- Layer and owner: plugin (this stream: order blocks; (c) is a shared block).
- Size: S.
- Render-scope: yes for (c): every page on every site holding an empty `sgs/heading`; list them.
- Depends on: D-2 decides whether facts get a setting.
- Verify: with no fact set, the pill and the step line disappear; a test that an empty heading prints nothing.

#### F-46: The editor previews order bindings with their own sample words
- Closes: confirmation-10 (verified).
- Pages and clients: the editor, every client.
- Cause: proved. `src/bindings/order.js::getValues` returns '1234' for every bound attribute; `getFieldsList` has no `fact:` keys.
- Change: `getValues` returns `format` with `%s` replaced by `FIELDS[key].sample` (a `fact:` key shows its name in brackets); `getFieldsList` adds the post's `fact:` keys.
- Layer and owner: plugin bug (this stream).
- Size: S.
- Render-scope: no (editor only).
- Depends on: nothing.
- Verify: the confirmation template in the editor shows "Order 1234. We've emailed…" and "Dear Aisha,".

#### F-47: Words the draft joins to a built-in order value are kept
- Closes: confirmation-11 (verified, latent).
- Pages and clients: none in today's drafts.
- Cause: proved. `lib/template-piece-order.mjs::placeValues` uses `h.logicFormat` only for facts.
- Change: use `logicFormat` for any text value; keep bare `%s` for `attr:href`.
- Layer and owner: this stream.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: failing-first test: `'Order #' + o.no` gives format "Order #%s".

#### F-48: A round box holding one glyph becomes `sgs/icon`, its emoji kept as an emoji
- Closes: confirmation-8 (verified, corrected: two causes).
- Pages and clients: Mama's confirmation; every page with icon discs (Mama's home and product steps).
- Cause: proved for the block choice: the ✓ badge, ✦ pill and ✓ ✦ → step discs are `sgs/text` with radius and `customWidth` plus residual height CSS; the kitchen ← disc is an `sgs/heading`; the "With you" disc is already `sgs/icon` but with "♥" written into `brandName` (shows a star). Why the disc rule picks text: hypothesis (prove from the proposal row of Confirmation/24's span). The hero's 900px column is residual Custom CSS.
- Change: a fixed-size round box holding one glyph becomes `sgs/icon` with `shape: circle`, `iconSource: emoji`, `emojiChar`; an emoji is never written into `brandName`; the hero's centred column becomes a container `maxWidth`.
- Layer and owner: general session.
- Size: M.
- Render-scope: no.
- Depends on: S-3.
- Verify: each disc's computed width equals its height (40, 56, 110px); "With you" shows ♥; no `sgsCustomCss` on the template.

#### F-49: A card drawn as one link is one link, including a link bound to the order
- Closes: confirmation-9 (verified, corrected: four cards are partial links; the kitchen card has none).
- Pages and clients: Mama's confirmation; any card whose address is bound.
- Cause: partly proved. `sgsBlockLink` is a fixed address and cannot take the `sgs/order` `view_url` binding, so the view-order link sits on the inner button. For the Taster, account and kitchen cards: hypothesis (the card rule refuses a card that turns its trailing words into a button; prove from their proposal rows).
- Change: plugin: `sgsBlockLink` accepts a `metadata.bindings` source (the order piece then binds `view_url` on the card); route rule: an `<a>` card gets a whole-card link with its trailing words kept as text.
- Layer and owner: plugin (`sgs/container`) and general session (the card rule).
- Size: M.
- Render-scope: no (opt-in binding).
- Depends on: S-3.
- Verify: clicking anywhere on each card follows its link; each card is one tab stop with a visible focus ring.

### Group H: product page (verified; Eye Care judged on the fresh 22:44 rebuild)

#### F-50: The buy box owns the product's information column and the two-column layout
- Closes: product-2 (verified, corrected: cause (b) wrong), product-18 for this page (verified on the fresh build).
- Pages and clients: both product pages, 1440 and 768 (two columns), 375 (order).
- Cause: proved. (a) `lib/template-piece-buybox.mjs::place` replaces only the controls' run and leaves title, rating and description above it, so the buy box's own gallery-beside-controls layout renders inside the info column (Mama's buy box 602px at x 100); `local-mamas` post 202 puts them inside `sgs/buybox` (`extrasBeforeCount` 4, `extrasBeforeCartCount` 1, `galleryColumnRatio` 1.05, `stackBelow` mobile). (b) Eye Care (fresh build: the draft's gallery plus the buy box's own, £139 and £109.00): `holeReads(L,'curImgSrc',…)` does follow the alias; the main picture is missing from the inventory because Root/342 drew its `sc-if {{ cur.hasImg }}` placeholder branch, so `placeGallery` matched the colour tiles inside the buy box's run, removed no node and still reported itself placed ("(nodes )").
- Change: `place` takes the h1's column as the buy box (nodes before the controls as inner blocks counted by `extrasBeforeCount`, the gift tick by `extrasBeforeCartCount`), replaces the grid that held gallery and info, and writes `galleryColumnRatio`, `galleryColumnGap` per width and `stackBelow`; the inventory reads the picture's hidden `hasImg` branch; `placeGallery` refuses a region inside the buy box's run and reports "not placed" when it removes no node.
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: nothing (S-1 is cleared).
- Verify: 1440 pairs show gallery left, info right on both; 375 gallery first; Eye Care has one gallery and one price, no green WhatsApp circle.

#### F-51: Product pieces bind every per-product word
- Closes: product-1 (verified, corrected), product-16 (verified; merged into product-1).
- Pages and clients: both product pages, every product but the draft's.
- Cause: proved. `data/template-pieces.json` `single-product` has six pieces; every product shows the draft product's breadcrumb, eyebrow and rating, and on Eye Care its brand, code, price, RRP, saving, description and "More from Ray-Ban". The binding sources already exist (`includes/product-field-values.php`, `class-product-bindings.php`: `price`, `title`, `stock_status`, `short_description`, `brand`, `sku`, `meta._sgs_rrp`); no source exists for the product rating or the long description. Mama's price note (Root/108) has no node of its own.
- Change: pieces for the breadcrumb (`sgs/breadcrumbs` with `productPageCrumbs`, separator, gap, colours, underline from the draft), the buy box's price row (`showPriceRow`, `rrpMetaKey _sgs_rrp`, `rrpShowPrice`, `rrpSavingPrefix`, `rrpSavingFormat`), the stock line (`showStockStatus`, `stockInStockLabel`, `stockLinePosition`, `stockLineHairline`), the brand (`brand`), the code (`sku`, with F-34's SKU write), the description (`core/post-content` in the description tab, with F-34); rating and long description need binding sources (F-65); a hole with no source is a missing-features row, never fixed words.
- Layer and owner: this stream (the two binding sources: plugin, F-65).
- Size: L.
- Render-scope: no.
- Depends on: F-50, F-34, F-65 (rating, long description).
- Verify: on Taster Trio and Carrera 1055/S every product-fed text matches that product's record; "Home / Shop / Taster Trio".

#### F-52: Part-look decides the buy box's modes from the draft
- Closes: product-3 (verified), product-13 modes (verified), product-15 (verified, corrected), product-19 modes (verified), product-5 sticker text (verified), Eye Care's `gallerySavingBadge` and its position (the fresh build shows it top-left; the draft's is top-right).
- Pages and clients: both product pages (Mama's home buy box later).
- Cause: proved. `data/part-look-modes.json` `sgs/buybox` has three rules; `lib/shop-parts.mjs` writes only text, so `buybox-option-picker` and `buybox-sticky-bar` carry `write: null`; no route file writes `buyboxLayout`, `groupStyles`, `pickGroupHeadings`, `pickGroupNumbers`, `showPriceRow`, `summaryText`, `stickyBar`, `pickerShowSelectedValue`, `pickerSubLabelMetaKey`, `pickerLabelLink*`, `showStockStatus`, `rrpMetaKey`, `gallerySavingBadge`. product-15's cause (corrected): `lib/fill-builtin-button.mjs::contentAlignWrite` treats `normal`/`center` as the block's own and writes nothing, but this button's default with a price is `space-between` (`buybox/style.css`).
- Change: rules for `buyboxLayout: configurator`, `pickGroupNumbers`, `pickGroupHeadings` (and the hint with `{picked}`/`{max}`), `groupStyles`, `showLadder` and `showPriceRow` false when absent, `summaryText`, `stickyBar.<tier> = after-button`, Eye Care's picker, stock, RRP and saving-badge modes (with `gallerySavingBadgePosition`), `galleryStickerText` and rotation; `contentAlignWrite` writes `center` when the draft centres and the block's default with a price is `space-between`; map `unmatched:buybox:N · <words>` rows in `data/shop-part-vocab.json`. Call made: Eye Care's colour tiles use `pickerSwatchStyle: tile` with the term's `_sgs_swatch_color` until real colourway photos exist (every Aviator variation uses image 676; the draft calls its shots stand-ins).
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: F-50, F-53.
- Verify: Mama's pairs show four numbered groups, flavour pills "up to 3", no ladder, no price row, the sticky bar at 375, "Add to basket · £21.50" centred; Eye Care's colour tiles with the chosen colour named, S/M/L with measurements, "Which size am I?", the stock line, RRP strike, saving pill and the gallery badge top right.

#### F-53: Part-look locates the buy box's parts
- Closes: product-4 (verified, corrected), product-5 locator half (verified), product-13 locator half (verified as a hypothesis), product-19 locator half (verified).
- Pages and clients: both product pages.
- Cause: proved: 7 of 48 parts located, 38 with no locator (picker box, tiles, options, badges, summary, price row, RRP, stock, saving badge), 53 hand-set-only settings; `gallery-sticker` (`tag:[span], pick:first`) takes the "Build your own" badge. Corrected: `galleryFrame` does find an element (the sticker is located from it), so why the `main*` frame settings are not written is unproven. The sticky-bar locator finds nothing: hypothesis (the bar is a separate component read only among the page's elements).
- Change: locators for picker-box, pick-tile / pick-option / picker-option (chosen and not), pick-badge, pick-summary, price-row, rrp-pill, rrp-price, stock, stock-in-stock, savingBadge; a fixed-text gallery overlay is the sticker, a hole-fed one the product badge; read the sticky bar's component elements; trace why `main*` is not written before changing `main-photo-frame`.
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: F-50.
- Verify: `part-look.mjs --surface product --compare --site local-mamas`: the 53 hand-set-only rows reduced to instance conflicts and true gaps; the pink card and framed photo at 1440.

#### F-54: Related products are product cards fed by the catalogue
- Closes: product-10 (verified, corrected).
- Pages and clients: both product pages (any draft section listing other products).
- Cause: proved: `single-product` has no related-products piece, so the cards are generic containers with dead buttons (50, 50 and 24px tall); Eye Care's static cards' pictures 404. Corrected: `sgs/container` has a background media slot (`supports.sgs.mediaElements`: image, video, svg), so the missing picture is the media writer not using it (a general-session Fill item, moot once the piece places product cards).
- Change: a `related` piece: a list fed from other product records becomes `woocommerce/product-collection` (`sgsSameTermAs` from the draft's filter) with `sgs/product-card`; a fixed list becomes `sgs/product-card` with `productId` each; card looks from F-33. Tell the general session about the unused container media slot.
- Layer and owner: this stream.
- Size: M.
- Render-scope: no.
- Depends on: F-33, F-50.
- Verify: the cards show photos and prices, "Add to basket" adds the product, Carrera's page shows "More from Carrera".

#### F-55: The option picker's chosen text is readable on a light fill
- Closes: product-14 (verified, corrected: 1.48:1).
- Pages and clients: Mama's product page; every site whose primary colour is light (shop card pickers too).
- Cause: proved. `src/blocks/option-picker/style.css` fills the chosen pill with `--sgs-op-sel-bg` (falling back to primary) and white text: 1.48:1 on Mama's yellow rgb(249,207,110).
- Change: the picker prints its chosen text colour from a contrast pick against the resolved fill when nothing sets it (as `configurator.php::sgs_buybox_configurator_badge_css` does with `sgs_colour_hex_for_contrast`); part-look writes `pickerPillSelectedTextColour` (F-53).
- Layer and owner: plugin bug (this stream).
- Size: S.
- Render-scope: yes: every page with an option picker on every site with a light primary.
- Depends on: nothing.
- Verify: chosen pill contrast at least 4.5:1 at 375 and 1440.

#### F-56: A rating link keeps its in-page address and its stars come first
- Closes: product-9 (verified for Mama's; Eye Care not checked).
- Pages and clients: both product pages (any link to an in-page anchor).
- Cause: proved up to the writer: `rule pillButton` absorbs the stars as the label's glyph and drops `href="#reviews"` though `lib/draft-link.mjs::resolveDraftLink` resolves it. Which line does it: hypothesis.
- Change: keep a fragment `href` as the button's `url` when its target exists on the page; keep inline children in order.
- Layer and owner: general session.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: clicking the rating scrolls to the reviews; the stars come first.

#### F-57: An icon list writes its column count and its glyph markers
- Closes: product-11 route half (verified; Eye Care's checklist has the same cause).
- Pages and clients: Mama's product trust strip, Eye Care's advice checklist (any icon list with glyph markers or a track list).
- Cause: proved: `listColumns` is saved as "1fr 1fr 1fr" and cast to int (1 column); the absorbed glyphs get no `iconSource` and `markerType` stays `none`. New, unchecked: other count settings the database maps to `grid-template-columns` may get the same string write (`thumbsPerRow`, `pickTileColumns`, post-grid `columns`, form-review `listColumns`, footer and wishlist `columns`).
- Change: Fill writes a count setting mapped to `grid-template-columns` as the track count (all of them, after checking the list above), and the glyph as `items[i].iconSource: emoji` with `markerType: icon`, `iconBoxSize`, `iconBackgroundColour`. The icon box border is in F-66.
- Layer and owner: general session.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: three columns with round icons at 1440.

#### F-58: An accordion's header takes the draft's font
- Closes: product-12 (verified, corrected: no plugin gap; the fault is Fill alone).
- Pages and clients: Mama's product page; every accordion the route builds.
- Cause: proved: Karla 16px measured; the Fill report's "reach-only: fontFamily is calibrated on another element ... and only reaches header" and "shape: headerPadding holds one value for every side". Both readings are wrong about the block: `sgs/accordion` has `itemTitleFontFamily`, `itemTitleFontSize`, line height and letter spacing (since `8a95271bc`, 2026-11-19), and `headerPadding` is a per-device four-side box.
- Change: Fill writes the header font to the `itemTitle*` settings and reads `headerPadding`'s shape as a four-side box; `headerFontWeightOpen` equal to `headerFontWeight` when the draft does not change it.
- Layer and owner: general session.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: computed header Young Serif 18px 400 in both states.

#### F-59: A split hero never takes a small icon as its picture, and picture addresses are the site's own
- Closes: product-18 general half (verified on the fresh build: a green circle with a broken image).
- Pages and clients: Eye Care's product page (any region with a background-image gallery and a small icon).
- Cause: proved from the tree attributes that the hero took the advice card's 38px WhatsApp icon (attachment 71) as its split picture; which rule picks it, and the foreign `mintcream-lyrebird` host (attachment `guid` instead of `wp_get_attachment_url()`): hypotheses.
- Change: the split-hero media pick refuses a picture smaller than the column it would fill or one inside a link or card; media writes use `wp_get_attachment_url()`.
- Layer and owner: general session.
- Size: S.
- Render-scope: no.
- Depends on: nothing (F-50 removes this hero from the product page anyway).
- Verify: no green circle; attachment URLs on the copy name `localhost:8125`.

### Group I: plugin round groups (each item's checks in section 5)

#### F-60: Shop block bugs that render wrong today (Task 3 and friends)
- Closes: basket-7 item-card columns (verified), basket-14 plugin-bug rows (verified: settings that lose to WooCommerce's `is-medium`/`is-small`/under-920px rules, `sgsSummaryWrapsButton` inner card, `.wc-block-components-totals-wrapper:empty` keeps its padding), basket-6 inner card (verified, known Task 3), basket-15 "Add my prescription" on every line (verified, corrected: `item-row-template.js` shows it on any line with a permalink and also hides it when the line is configured), checkout's above-label select bug (`commerce-look/fields.php`, from Mama's Custom CSS table), the summary card shadow clipped (`overflow-x:clip` work-round), checkout-12 legend on the border (verified).
- Pages and clients: every site's basket and checkout pages; drawers with add-options.
- Cause: proved per row (the verdicts confirm each).
- Change: the item-card rule gives the price column `auto` and the text `minmax(0,1fr)` at every width; settings win over WooCommerce's narrow rules; the summary card unwrapped; an empty totals wrapper hidden; add-options only on a product linked to a choice flow; select padding and arrow in `above` mode; the gift step's legend laid out in `src/blocks/gift-order/style.css`. Hypothesis to prove before fixing: the drawer's head band squashes with ten lines at 375 (`flex-shrink: 0`).
- Layer and owner: plugin bugs (this stream's blocks).
- Size: M.
- Render-scope: yes: every basket, checkout and drawer page on every site; render-check on the live shop's basket and checkout before its deploy.
- Depends on: nothing.
- Verify: Mama's basket from blank with no Custom CSS: price inside the card at 375; flat summary; no empty-wrapper gap; on Eye Care "Add my prescription" only on frames.

#### F-61: New commerce-look settings on `woocommerce/cart` and `woocommerce/checkout`
- Closes: basket-7 (summary title shown below the wide layout; stepper number type and button size, colour, strength), basket-14 missing-setting rows (stacking width; shipping "via" line; totals item description), checkout-4 error-message type (verified: no error-text setting anywhere), checkout-11 phone summary placement (verified), checkout-13 `sgsTermsTextAlign` (verified), checkout-14 "shipping options inside the delivery step" and "single country as text" (partly checked), checkout-19 step entrance motion (verified: no WooCommerce motion targets; Bean's "no gaps" ruling settles it as a setting, low priority), checkout-6 shipping-rate description (the draft's "Arrives 2–3 days after the bake"), Mama's checkout table (thumbnail `object-fit`, quantity badge size, place and colour, guest notice type), checkout-10 coupon panel open by default (hypothesis: check the coupon form block first), checkout-14's mobile-in-contact field and postcode finder (framework gaps, larger).
- Pages and clients: basket and checkout, both clients.
- Cause: proved per setting by the verdicts' four checks, except where marked.
- Change: each as a `selectors.json` row or setting on its part, off by default, so part-look can pair it.
- Layer and owner: plugin round (`woocommerce/cart`, `woocommerce/checkout` commerce look).
- Size: L.
- Render-scope: no (opt-in).
- Depends on: nothing; part-look pairs them after (F-23).
- Verify: each setting's render test; Mama's checkout and basket from blank with no Custom CSS match the draft at 375 and 1440.

#### F-62: New `sgs/cart` drawer settings
- Closes: basket-13 (verified: 16 rules, 1,645 bytes), basket-9 (verified: gift box placement `footer`/`after-items`), basket-10 plugin items (verified: `panelCloseSize` declared on the button but painted on the SVG; `itemQtyFontWeight` paired with the stepper, not the number), basket-15 upsell row (verified), basket-15 pick-line format (hypothesis: site data plus the plugin's format).
- Pages and clients: the drawer, both clients.
- Cause: proved per rule.
- Change: about 20 settings on declared parts: Remove's size, line height, padding, decoration; stepper number width; free-delivery line height; empty state placement, body text, link; gift box, label, help, fields and message font; `panelCloseSize` moved to the icon plus a close tap-size setting; `itemQtyFontWeight` paired with `.sgs-cart__item-qty-input`; gift placement `after-items` (its slot must survive the view script's row rebuild); an upsell row (product, words, Add button). Prove `itemQtyHeight` already covers the 44px steps by removing that rule on a scratch copy.
- Layer and owner: plugin round (`sgs/cart`).
- Size: L.
- Render-scope: no for new settings; yes for moving `panelCloseSize` to the icon if any site has it saved (check saved values first).
- Depends on: nothing.
- Verify: Mama's drawer from blank with no Custom CSS matches `shots/basket/mm-drawer-draft-*.png` at 375 and 1440; × 28px inside a 48px button.

#### F-63: New `sgs/account` settings
- Closes: account-7 (verified: `menuItem` border width, style, colour, fill, shadow; `menuActiveBorderColour`, `menuActiveShadow`), account-8 (verified: `ordersRows` gap, border, radius, shadow, hover lift; `ordersPill` border and radius; the view button as a built-in button), account-15 look half (verified as hypothesis for the cause; a `notice` part), account-17 (verified: `hideRequiredMarks`, `loginRowInline`, strings keys `passwordLabel`, `registerPasswordLabel`, `registerPasswordPlaceholder`), account-20 transition half (button kit `<prefix>TransitionDuration`, `TransitionEasing`), and account.md's Custom CSS table (verified count 134 rules): `menuLogout` part, `menuCount` fill, size, radius, `orderThumbs` border and radius, a row grid layout value, `addressEditPosition`, `addressFirstLineWeight`, order-page step card looks and an icon per step, items and box looks, help row card, order-again as a built-in button, two-column order layout, `giftNote*` card looks, edit card radius and padding, password section columns, `fieldBackground` scoped per form.
- Pages and clients: both clients' account pages.
- Cause: proved per row (database and motion checked).
- Change: each setting on a declared part (`attrMap`), off by default.
- Layer and owner: plugin round (`sgs/account`).
- Size: L.
- Render-scope: no (opt-in).
- Depends on: F-37 (so new type rows get parts the same way).
- Verify: Mama's account from blank with no Custom CSS matches the draft at 375 and 1440.

#### F-64: New order-block settings
- Closes: confirmation-7 plugin half (verified: `sgs/order-items` totals border-top width, style, colour, padding-top; total font family and size; row padding and vertical alignment), confirmation-4 plugin half (verified: the status block's heading, field, label, button and link looks, about 1.5 KB of Custom CSS on Mama's), the known gap "a bound value loses its bold".
- Pages and clients: confirmations, both clients.
- Cause: proved (missing from `block.json`'s 52 attributes).
- Change: settings on declared parts; the status block's form through the button kit and field tokens (or an SGS wrapper block).
- Layer and owner: plugin round (order blocks).
- Size: M.
- Render-scope: no.
- Depends on: nothing.
- Verify: Mama's confirmation from blank with no Custom CSS matches the draft.

#### F-65: New buy box and product card settings
- Closes: product-5 plugin half (verified: no per-product badge setting; the buy box takes no bindings), product-1's two missing binding sources (verified: the product rating and the long description), product-15 price separator and the Mama's product Custom CSS table (not re-checked by the verdict): a per-product badge overlay reading `_sgs_card_badge` (`galleryBadgeSource`, position, look), binding sources `rating` and `description`, `addToCartPriceSeparator`, stack gap, extras gap, a per-unit line toggle, chosen thumbnail offset and shadow, a per-group "no swatch", `pickBadgeFontSize`, sticky bar button look, undo row toggle, sub-label colour, product card `tagBorderWidth`/`tagBorderColour`.
- Pages and clients: both product pages; product cards.
- Cause: proved for the badge and the binding sources; the table rows are stated per row and not re-checked.
- Change: each on a declared part, off by default.
- Layer and owner: plugin round (`sgs/buybox`, `sgs/product-card`).
- Size: M.
- Render-scope: no.
- Depends on: nothing.
- Verify: Mama's product page from blank with no Custom CSS matches the draft.

#### F-66: New settings on three other blocks
- Closes: shop-11 remainder (verified: `woocommerce/catalog-sorting` height, padding, shadow, font family, hover and focus; the results count's look beyond colour and size), checkout-12 (verified: `sgs/gift-order` tile label and text font family, size, weight, line height; minimum column width or a column count per width; the chosen tile's outline replaced by its own look with a non-colour cue kept), product-11 plugin half (verified: `sgs/icon-list` `iconBoxBorderWidth`, `iconBoxBorderColour`). Dropped: product-12's `sgs/accordion` items (the settings exist).
- Pages and clients: shops, Mama's checkout and product page.
- Cause: proved for the verified rows.
- Change: each on a declared part, off by default (the gift tile ring: a fix of a look nobody chose, so it changes render: list Mama's checkout and product pages).
- Layer and owner: plugin round.
- Size: M.
- Render-scope: only for the gift tile outline.
- Depends on: F-6 (the sort select's reader).
- Verify: per setting; Mama's gift tiles side by side at 375 with "for me" in Caveat 24px and no ring.

#### F-67: The site-check faults (RW-18)
- Closes: the main session's settled RW-18; shop-7's "11 pairs inside .sgs-shop-filters visible live" (verified as the shop-7 cause, a live defect fixed by F-28).
- Pages and clients: every site-check walk.
- Cause: proved (general plan): `lib/site-check-openers.mjs::walkAbsent` skips a run with no pairs, so a refused run passes; `lib/site-check-nav.mjs::markDrawerInPage` takes the basket drawer (its dialog carries `data-sgs-nav-drawer`) as the nav drawer; a mega post renders twice, so its `cr-ref` class matches two elements; the shop walk opens no filter drawer below the breakpoint.
- Change: as RW-18 states.
- Layer and owner: general session.
- Size: S.
- Render-scope: no.
- Depends on: nothing.
- Verify: RW-18's unit tests on built walk records.

## 3. Setup and lab faults (about the copies, not the code)

Do S-1 to S-5 before rebuilding anything; S-6 before proving F-24.

- **S-1 The lab's plugin build was a day old: cleared.** Calibration refused (`exit=3`) because the lab's build was from 2026-11-20 (product-17, verified). The verdict reports it cleared: lab rebuilt 22:28, accordion calibration r3 `exit=0`, Eye Care's product template 479 rebuilt 22:44 and part-look saved 23:35 (the run's `exit=1` is only F-2's gate-chain crash). Keep the rule: after moving the lab to a new main, `npm run build` before any calibration.
- **S-2 Neither copy was truly stripped.** Mama's header post 178 holds the hand-finished `sgs/cart` (165 of 166 settings byte-identical to `local-mamas`), so its drawer findings show the hand-finished drawer; Mama's theme mods (`sgs_shop_hide_zero_decimals`, `sgs_shop_sort_menu`, `sgs_shop_sort_arrow`) came from the mirror. Fix: run `scripts/local-wp/scratch-mirror.sh strip <copy>` (on main since `99650a2c1`/`c2f980e44`: headers, footers, drawers, theme mods, global styles, templates, menus, fonts, business details) on both copies, then rebuild the foundation.
- **S-3 Mama's intake and one `surfaces.json` row are stale.** `build/intake/intake.json` was last committed by `7b0290ad1` (2026-11-16), before `22a7e34ff` (2026-11-19) taught intake to read a result record as a page: no S-32 skeleton. The confirmation row is an October entry (`1888f67b1`, restored by `0ea1a6cb2`) `copy: {from: "page", unplayed}` never re-applied. Fix: re-run intake on today's main and commit it, `manifest.mjs mamas-munches-redesign --only template-order-confirmation --apply`, then `clone-surface.mjs` on the surface. It will then stop at propose on confirmation-2 until F-12 lands.
- **S-4 Eye Care's copy has a 2026-10-28 header.** Post 137 on `local-mediatest-trec` (holding the drawer's `sgs/cart`) was last saved 2026-10-28 07:09, so the drawer readings in basket-1, 4, 11 and 15 come from an old header (the causes are today's code). Fix: rebuild the header on today's main (the general session's header run) before re-checking the drawer.
- **S-5 Calibration runs owed on the copies.** `sgs/product-card` on both copies (its cache was measured 2026-11-15, before `4459ecb81` fixed presence flips the fixture holds: shop-6 part 1, verified); `sgs/account` hover rows of the kit buttons on Mama's (account-20, verified, corrected: only `loginButtonBackgroundHover` was renamed; alternatively the apply leaves parts part-look owns, a hypothesis). Note: the setting record (its Task 4) replaces calibration as the route's source; until it lands, these runs are what the copies need.
- **S-6 Mama's checkout page kept the hand-built inner blocks.** The lab's `strip-shop.php` removed only the look settings `look-attrs.json` lists; the page's inner blocks, words, `sgsCheckoutStrings`, `sgs/gift-order` and `sgs/commerce-note` settings are byte-identical to `local-mamas`. The new strip keeps pages, so it does not clear them either. Fix: reset the checkout page (and the basket and account pages) to WooCommerce's default block before proving F-24.
- **S-7 Five pages still show older builds** because propose refused tonight: Eye Care shop (2026-11-20), Mama's shop (2026-11-19; part-look rewrote template 6024 at 21:44 after the shop findings), Mama's basket (2026-11-19), Mama's checkout (2026-11-19). Eye Care's confirmation serves the stock page. (Eye Care's product page is now fresh: S-1.) Re-judge each after its enablers (F-4 to F-11, S-3).
- **S-8 Mama's `menu_order` 1 to 5** on its copy was hand-set on the mirror, so it proves nothing about the route (shop-12).
- **S-9 Eye Care's copy has registration off** (`woocommerce_enable_myaccount_registration = no` after the rebuild): F-42 fixes the route; the copy needs the step run. Cause of the step finding no register form, fixed `e9b7cc5c5`: the inventory never recorded `autocomplete`, and the step now also reads the sign-in draft an account row folds in. Eye Care's copy reads `no` until its account and checkout slices run.
- **S-10 No payment gateway on the copies.** Eye Care offers only Cash on delivery; Mama's card box is empty (hypothesis: Stripe's card element does not load on a localhost copy; the same on `local-mamas` port 8084). Fix: test-mode gateway keys on both copies to judge wallets and card fields (checkout-15, partly checked). Done 2026-11-22: both copies hold Payment Plugins for Stripe in test mode with the card on (Eye Care's keys from `.claude/secrets/ai-agent-credentials-and-info/.env.stripe`).
- **S-11 Picture files are missing on Eye Care's copy:** the logo uploads (583 console 404s for `ec-logo-*.png`, checkout-17), `uploads/2026/10/whatsapp-white.svg` and the stock photo (product verdict): copy the files.
- **S-12 The basket's fixture product on Eye Care has no image** (broken picture in `/cart/` and the checkout summary). Cause: Eye Care's copy holds 46 October attachments whose files are absent (no source in the handoff or the mirror); the shop catalogue step replaces a product picture with no file, and the basket seed uses a real product. Only the two calibration fixture products keep a broken picture; Home, About, Contact and the single-product template still name missing pictures.
- **S-13 Eye Care's products have no reviews** (`_wc_average_rating` 0): see D-5.
- **S-14 The seeded customer's email is unconfirmed** (hypothesis behind WooCommerce's "Confirm your email address" notice, account-15): confirm it on a scratch copy and reload.
- **S-15 Account's Eye Care "hand-built" reads used the wrong site.** account.md compared `local-eye-care`, which mirrors `eye-care-clone-test`, not `eye-care-test` (`.claude/dev-setup.md`; checkout.md noticed this). Its claim "Eye Care's hand-built account is not a reference: `sgs/account` holds only `className`" is about the clone target. Re-read `eye-care-test` (names only) before relying on it; no fix above depends on it.
- **S-16 Part-look had not run** on the account surfaces when account.md was written, and Mama's shop template was rewritten by part-look after shop.md: re-check account-7, 8, 11, 12, 17 and the Mama's shop readings after the passes (`node account\clone-in.mjs ...`, `out-probe.mjs`).
- **S-17 Draft side note for the general session's Claude Design instructions:** neither draft draws an error state for an empty checkout submit (checkout-18), and Eye Care's draft writes its order number as fixed words (confirmation-3, unless D-3 picks B).

## 4. For the general session (one message)

Already agreed tonight: RW-18 (F-67), RW-26 (F-31), RW-27 (F-29), RW-28 (F-5; this stream builds the chips' looks reader F-6), plugin round 6 item 6 dropped.

RW-27's order, stated explicitly: its route half (no hide flags on the marked rail; `pinEdge` desktop only, your wave 2, about 2026-11-23) lands AFTER this stream's F-28 (the closed `dialog#sgs-shop-filters` hidden whatever layout class the container prints), or the ~1,790px blank band shows at 375. Its threshold write waits for this stream's F-68 (the drawer rules printed from `sgs_shop_filter_drawer_breakpoint`) and F-30 (the option written). F-28 and F-68 are in this stream's first wave because MIC's phone filter is cloned on 2026-11-28.

New for the general session:
- **F-1** template copies skip the apply stage, so `headingLevel` and every chrome rule never reach templates: no `<h1>` on Mama's basket, Eye Care's checkout, both product pages (basket-12, checkout-9, product-7). Run the apply families on a template copy's tree; this stream fixes the product title itself in `placeTitle`.
- **F-2** gate-chain reads `trees/<surface>/<surface>.json` for `copy.from: whole` (shop, product) while the copy is at `trees/template/<slug>.json`; plus the known `trees/page/my-account.json` worktree case (shop-15, product-8).
- **F-3** `lib/clone-surface.mjs::finaliserVerdict` passes any surface without `intakeSurface`; stop on the manifest's `noIntake` (confirmation-1).
- **F-4** (tell only) Eye Care's shop needs the commerce region to report a run; this stream wires the run, the region rule is yours (shop-1).
- **F-7** Mama's shop Root/38 arrow in a circle: RW-13 (shop-2).
- **F-11** "Secure checkout" lock (a label with a leading glyph in a header row) and per-width words "Secure" (checkout-1 half 2, checkout-16; the "← Basket" underline is a hypothesis).
- **F-9** (confirm ownership) if the basket count chip is done as a heading split in the skeleton, it is yours (basket-5).
- **F-20** (confirm ownership) who owns `lib/shop-parts.mjs`'s word rows (basket-4).
- **F-22** (tell only) `carryCustomCssScope` copies ancestors' scopes onto a moved dialog; the mega panel uses the same carry (basket-11).
- **F-27** the token extractor picks a 9.5px chip size as `small` (`token_families.py::pick_font_scale`), so every WooCommerce secondary line on Eye Care is 9.5px (checkout-4, checkout-18); your RW-17 area.
- **F-42** the account registration step runs only from `site-build.mjs`, and nothing sets `woocommerce_registration_generate_password = no` for a drawn password field (account-4).
- **F-48** icon discs built as `sgs/text`/`sgs/heading`, an emoji written into `sgs/icon` `brandName`, the hero's 900px column as residual CSS (confirmation-8).
- **F-49** the card rule leaves four of five `<a>` cards partial links (confirmation-9; the bound view-order link needs the plugin half).
- **F-56** the rating link loses `#reviews` and moves its stars (product-9).
- **F-57** `listColumns` written as a track list (cast to 1 column), glyph markers dropped (product-11; check the other count settings mapped to `grid-template-columns`).
- **F-58** accordion header: Fill refuses the font as reach-only and misreads `headerPadding`'s shape, though `itemTitleFont*` and a four-side `headerPadding` exist (product-12).
- **F-59** split hero takes a 38px icon as its picture; media URLs from another site's host (product-18).
- **F-54** (tell only) Fill leaves `sgs/container`'s background media slot unused for a draft `background-image` (product-10).
- **S-4** Eye Care's copy header is from 2026-10-28; S-17 the two draft-instruction notes.

## 5. Plugin round items

"4 checks" means the claim survived all four checks the verifier protocol requires before a missing setting is accepted (framework database by property and part, the motion system, the theme's Customizer settings, the hand-built site's setting names). Items whose verdict confirmed or corrected the gap passed; "not checked" items have no verdict (product) or were only partly checked.

| Block | Part | Setting or change | Finding | 4 checks | Fix |
|---|---|---|---|---|---|
| `sgs/cart` | panel | default background never `currentColor` (bug) | basket-1 | passed | F-18 |
| `sgs/cart` | close | `panelCloseSize` on the icon; new close tap size | basket-10, 13 | passed | F-62 |
| `sgs/cart` | stepper number | `itemQtyFontWeight` paired with the number; number width | basket-10, 13 | passed | F-62 |
| `sgs/cart` | remove | font size, line height, padding, text decoration | basket-13 | passed | F-62 |
| `sgs/cart` | free delivery text | line height | basket-13 | passed | F-62 |
| `sgs/cart` | empty state | vertical placement; body text size, width, line height, colour; link weight and padding | basket-13 | passed | F-62 |
| `sgs/cart` | gift box | placement `footer`/`after-items`; box, label, help, fields, message font | basket-9, 13 | passed | F-62 |
| `sgs/cart` | upsell | an upsell row (product, words, Add button) | basket-15 | passed | F-62 |
| `sgs/cart` | item row | add-options only on flow-linked products (bug) | basket-15 | passed | F-60 |
| `woocommerce/cart` | item card | price column `auto` at every width (bug); settings that lose to WooCommerce's narrow rules (bug); inner summary card (bug); empty totals wrapper (bug) | basket-7, 14, 6 | passed | F-60 |
| `woocommerce/cart` | summary title | shown below the wide layout | basket-7, 14 | passed | F-61 |
| `woocommerce/cart` | stepper | number type; button size, colour, strength | basket-7, 14 | passed | F-61 |
| `woocommerce/cart` | layout | stacking width | basket-14 | passed | F-61 |
| `woocommerce/cart`, `woocommerce/checkout` | totals | shipping "via" line and totals item description | basket-14, checkout table | passed | F-61 |
| `woocommerce/checkout` | validation message | font size and colour | checkout-4 | passed | F-61 |
| `woocommerce/checkout` | phone order summary | placement (top bar, before or after pay) | checkout-11 | passed | F-61 |
| `woocommerce/checkout` | terms | `sgsTermsTextAlign` | checkout-13 | passed | F-61 |
| `woocommerce/checkout` | delivery step | shipping options inside the delivery step; single country as text | checkout-14 | not checked (partly checked) | F-61 |
| `woocommerce/checkout` | steps | entrance motion per step (low priority) | checkout-19 | passed (motion checked) | F-61 |
| `woocommerce/checkout` | shipping option | rate description line | checkout-6 | not checked | F-61 |
| `woocommerce/checkout` | summary items | thumbnail `object-fit`; quantity badge size, place, colour | checkout table | not checked | F-61 |
| `woocommerce/checkout` | contact step | guest notice type | checkout table | not checked | F-61 |
| `woocommerce/checkout` | coupon | open by default (hypothesis) | checkout-10 | not checked | F-61 |
| `woocommerce/checkout` | fields | select padding and arrow with labels above (bug) | checkout table | not checked | F-60 |
| `woocommerce/checkout` | contact | mobile field in contact; postcode finder (framework gaps) | checkout-14 | not checked | F-61 |
| `woocommerce/catalog-sorting` | select | height, padding, shadow, font family, hover, focus | shop-11 | passed (the five `sgsSort*` exist) | F-66 |
| `woocommerce/product-results-count` | count | look beyond colour and size | shop-11 | not checked | F-66 |
| theme shop filters | toggle, chosen pills, price slider, drawer buttons, swatch, panel title, phone card minimum | per-property values instead of named looks | shop-10 | passed (chip half removed) | F-35 |
| theme shop filters | drawer CSS | closed dialog hidden (bug, first wave) | shop-7 | passed | F-28 |
| theme shop filters | drawer CSS | rules printed from `sgs_shop_filter_drawer_breakpoint` (first wave) | shop-3, 4 | passed | F-68 |
| `sgs/account` | layout CSS | clearfix and column floats (bugs) | account-2, 3, 18 | passed | F-36 |
| `sgs/account` | metadata | about 144 settings without a part | account-12 | passed (cause unproved) | F-37 |
| `sgs/account` | order page | print WooCommerce's table when no part switch is on (bug) | account-1 | passed | F-38 |
| `sgs/account` | menu item, current item | border width, style, colour; fill; shadow; current border and shadow | account-7 | passed | F-63 |
| `sgs/account` | order rows, status pill | gap, border, radius, shadow, hover lift; pill border, radius; view button as built-in | account-8 | passed | F-63 |
| `sgs/account` | notice | fill, border, radius, padding, type | account-15 | passed | F-63 |
| `sgs/account` | forms | `hideRequiredMarks`, `loginRowInline`, strings `passwordLabel`, `registerPasswordLabel`, `registerPasswordPlaceholder` | account-17 | passed | F-63 |
| `sgs/account` (button kit) | buttons | `<prefix>TransitionDuration`, `TransitionEasing` | account-20 | passed | F-63 |
| `sgs/account` | Custom CSS table rows (logout pill, count badge, thumbnails, address card layout, order-page cards and step icons, help row, order again, gift note, details card) | as listed in F-63 | account.md table | passed (134 rules recounted) | F-63 |
| `sgs/customer` binding | keys | `email` | account-10 | passed | F-41 |
| conditional visibility | order rules | `order-account-created`, `order-collect`, `order-delivery`; hide when bound text is empty | confirmation-2, 6 | passed | F-12, F-45 |
| `sgs/heading` | render | stop on empty content (bug) | confirmation-6 | passed | F-45 |
| order bindings (editor) | preview | sample words, `fact:` keys (bug) | confirmation-10 | passed | F-46 |
| `sgs/order-items` | totals, total, row | totals border-top and padding; total font family and size; row padding and alignment | confirmation-7 | passed | F-64 |
| `woocommerce/order-confirmation-status` | form | heading, field, label, button, link looks | confirmation-4 | passed | F-64 |
| `sgs/container` | block link | `sgsBlockLink` takes a binding | confirmation-9 | passed | F-49 |
| `sgs/gift-order` | tiles | tile label and text type; column minimum or count per width; chosen outline replaced; legend layout (bug) | checkout-12 | passed | F-66, F-60 |
| `sgs/option-picker` | chosen pill | contrast-picked text colour (bug) | product-14 | passed | F-55 |
| `sgs/buybox` | gallery | product badge overlay from `_sgs_card_badge` | product-5 | passed | F-65 |
| product bindings | sources | `rating`, long `description` | product-1 | passed | F-65 |
| `sgs/buybox` | add to cart | `addToCartPriceSeparator` | product-15 | not checked (the verdict re-homed the alignment cause, not the separator) | F-65 |
| `sgs/buybox` | Mama's Custom CSS rows | stack gap, extras gap, per-unit toggle, chosen thumbnail offset and shadow, per-group no swatch, `pickBadgeFontSize`, sticky bar button, undo toggle, sub-label colour | product table | not checked | F-65 |
| `sgs/product-card` | tag | `tagBorderWidth`, `tagBorderColour` | product table | not checked | F-65 |
| `sgs/icon-list` | icon box | border width and colour | product-11 | passed | F-66 |
| shared nav interactivity | moved dialog | ancestor scopes carried as a marker (bug) | basket-11 | passed (latent) | F-22 |

Dropped as wrong or not needed by the verdicts: shop-11's "no sort setting exists" (the five `sgsSort*` exist), shop-10's "chip border and radius have none", the option picker's count badge (plugin round 6 item 6), checkout-8's "place-order separator" setting (`priceSeparator` exists), checkout-13's terms words setting (`text` exists), account-11's "declare the save buttons as built-in buttons" (`loginButtonScope: all-forms` already covers them), product-12's `sgs/accordion` header font and per-side padding (`itemTitleFont*` and a four-side `headerPadding` exist).

## 6. Decisions for Bean

**Bean's answers (2026-11-22), each checked against the code:**
- D-1 A, own page. Mama's live shop already sends a signed-out visitor from `/my-account/` to `/sign-in/` (302, `includes/account/class-account-redirect.php`, driven by `signedOutSignInUrl`), so the route copies that: a page row for `SignIn.dc.html` and the card's two addresses.
- D-2 B, fixed sample words (Bean: the draft invented a system the business does not have). F-45 keeps only the heading's empty stop.
- D-3 B, bind the literal equal to the id the draft's order action creates (F-13).
- D-4 A, omit and record a missing feature.
- D-5: already built. `includes/product-card-live-fill.php` reads the live rating and review count; at 0 reviews with `noReviewsText` empty the card shows no rating row. The route writes `showRating` and never `noReviewsText`.
- D-6: nothing to build. The coupon field takes the field look (`selectors.json::field_text`), Apply takes the primary button preset (`woocommerce.css`), and the toggles and shipping line already use the body font and colour at the `small` token (measured on trec's basket). Eye Care's 9.5px is F-27's token value.
- D-7 A, take the words.
- D-8: the buy box gets a twin of the drawer's `panelInstalmentsNote`/`panelInstalmentsCount` (plan Task 7); Bean ruled out gateway buttons in that spot.
- F-49 (Bean, 2026-11-22): a card the draft draws as one link is one link; cards follow the draft. The line "card is not a link; the button is the link (Bean, 2026-10-13)" in `scripts/computed-route/data/skeleton-decisions.json` `rules.cardAction` and in Indus's `approved-decisions.json` is not Bean's ruling. The general session owns `rules.cardAction` and builds the fix with F-49's route half.

**D-1 Mama's sign-in page: its own page, or folded into the account page (account-19).** Today the page map folds `SignIn.dc.html` into the account row, so the band "welcome back, mama / Sign in", the "why have an account?" card and the guest note are never built.
- A (recommended): the sign-in draft becomes its own page, built like any page, and the account card's two buttons link to it. Matches the hand-finished site (`/sign-in/`, page 628) and needs no new mechanism. M.
- B: one page; the sign-in sections are built onto the account page and shown only on the sign-in view (`sgsConditionUrlParam` `sgs-login`). Keeps one address but adds conditional sections and hides the card view's band there.

**D-2 Order facts only code can supply today, such as Mama's bake date and arrival day (confirmation-6).** The route binds them to `fact:` keys no site answers, so the pill and a step line render empty.
- A (recommended): a site setting per fact the route binds (plain text, or a simple day rule), written by the route from the draft's sample shape; the filter stays as an advanced hook; with F-45 an unset fact hides cleanly. Keeps the "clients never touch code" rule. M.
- B: the route writes the draft's sample words as fixed text, as the hand-finished page did. Quick, but every order shows the same words.
- C: drop the fact lines when no setting exists (F-45 alone). Nothing wrong shows, but the draft's line is lost.

**D-3 Eye Care's order number written as fixed words in its draft (confirmation-3).**
- A: re-export the draft so the heading reads the order's id, under the Claude Design instructions. Correct at source, but waits on a new export and leaves any other single-file draft with the same habit refused.
- B (recommended): the reader binds a literal that equals, character for character, the reference field of the record the draft's order action creates (here `placeOrder`'s `id`); a literal matching no record stays refused (F-13). Works for any single-file draft, does not wait, and is evidence from structure, not a guess. S plus F-13.

**D-4 "Subscribe & save 10%" and subscriptions (product-6, verified: no subscription code anywhere).** No SGS code draws a subscription; Mama's draft draws it on the product buy box, in its header menu and as an account tab.
- A (recommended for the 28 Nov clone date): accept the omission (as the live shop did), record it as a missing feature, and tell the Claude Design instructions not to draw subscriptions unless the client sells them.
- B: scope a subscriptions integration (a WooCommerce subscriptions plugin plus a buy box "purchase type" group and an account tab). L, and it adds a paid dependency.

**D-5 Product cards' stars when a product has no reviews (shop-13).** The draft's "4.9 (41)" are sample figures; the copy has no reviews.
- A (recommended): hide the rating until a product has reviews (the draft's look returns by itself once reviews exist). If the card has no such switch, that is one small plugin setting.
- B: show empty stars with `noReviewsText` (for example "No reviews yet"). Honest, but every new shop opens with a row of "No reviews yet".

**D-6 WooCommerce parts the draft does not draw on a page it does draw (basket-6, checkout-10).** The coupon and gift card toggles, the shipping line and "Add a gift card" print at WooCommerce's small default. Bean's ruling covers whole pages a draft does not draw, not parts.
- A (recommended): each takes the look of its nearest drawn sibling (the toggles take the summary row label's type; the coupon field and Apply take the draft's nearest field and button). Matches what the hand-finished page did by hand.
- B: WooCommerce's default, as for undrawn pages. Consistent with the page ruling, but the rows look out of place.
- C: hide them. Cleanest look, but removes coupons and gift cards from the shop.

**D-7 Sample order data words in Mama's draft (account.md table).** `ordersNumberPrefix` "MM-" and status names "Baking soon" / "Posted" appear in the draft's sample orders.
- A (recommended): take them (they are the client's own words for their statuses and numbers); the route writes them.
- B: treat them as sample data and keep WooCommerce's numbers and status names.

**D-8 The product page's "Or 3 payments of £46.33 with Klarna · Apple Pay · Google Pay · PayPal" line (product.md; the verdict saw it absent on the fresh Eye Care page, as the missing-features row predicts).** No buy box setting draws it.
- A (recommended): the real express buttons and pay-later message of the site's gateway stand for it (Stripe's express buttons, `sgs/pay-later-message`), and the static line is built (`d263cb57d`: the buy box's instalments note), so no missing feature is reported for it.
- B: a static line setting on the buy box. Looks like the draft, but can promise payment options the site does not offer.

## 7. Gaps for the report (left at WooCommerce's or the framework's default)

- **G-1 Eye Care's basket page `/cart/`:** the draft draws only the bag drawer, so the page keeps WooCommerce's default (Bean's ruling; basket-8). It stays reachable from WooCommerce's "View basket" notice; F-20 hides the drawer's "View cart" because the draft draws none.
- **G-2 The empty-submit error state of both checkouts:** neither draft draws one (checkout-18); WooCommerce's inline messages stay, readable once F-27 lands.
- **G-3 Account endpoints neither draft draws (Downloads, Payment methods, Dashboard):** F-39 hides a menu tab only when every tab of the draft's menu is told (both drafts draw an untold Subscriptions tab, so the route hides none today); WooCommerce shows Downloads whatever the catalogue holds. A new off-by-default `sgs/account` setting (shop pages plan Task 19) hides Downloads with no downloadable product and Payment methods with no saved-card gateway, and the route turns it on for clones; any other WooCommerce endpoint keeps its default.
- **G-4 The lost-password and reset forms:** neither draft draws them as their own views; they take the sign-in form's look through `loginButtonScope` (F-39) and the layout fix (F-36).
- **G-5 The confirmation's "may not see this order" state:** neither draft draws it; F-43 uses fixed framework words.
- **G-6 A shop pager or Load more:** neither draft draws one (Eye Care lists 16, Mama's 5); the theme's defaults show every product.
- **G-7 The basket drawer's empty state on Eye Care, and Mama's subscriptions views:** Eye Care's empty bag is read only once F-19's second read runs; Mama's Subscriptions tab has no WooCommerce endpoint (D-4).

## 8. Checks that look green while comparing nothing

Each becomes a fix.

| Check | What it compares today | Fix |
|---|---|---|
| `lib/clone-surface.mjs::finaliserVerdict` passes a surface with no intake ("a copy reads no draft") | nothing: Mama's confirmation "every stage ran and passed" on WooCommerce's stock page | F-3 |
| Part-look verify on Eye Care's checkout: "585 of 644 match" | only the 42 paired parts; none of the 40 unpaired or 27 unlocated parts | F-17 |
| Part-look's "Unpaired (a locator, no draft element)" list | reported as a silent omission, not as unverified | F-17 |
| Part-look's compare reports a non-px size as "the draft shows no element" (unchecked) | hides the real reason a size is not written | F-17 |
| A drawer locator's `smallest` fallback | pairs the item list instead of the dialog, so a verify would compare the clone against the wrong element and pass | F-19 |
| `placeGallery` reports itself "placed (nodes )" | removed no node, yet the run counts the piece as placed | F-50 |
| `site-run.mjs` "skip ... apply: a template copy has no post of its own", then "every stage ran and passed" | the apply rules (heading levels and chrome) never ran on any template | F-1 |
| `lib/site-check-openers.mjs::walkAbsent` skips a run with no pairs | a refused run passes the walk (RW-18) | F-67 |
| `lib/site-check-nav.mjs::markDrawerInPage` | takes the basket drawer as the nav drawer (RW-18) | F-67 |
| The "from blank" proofs on Mama's copy | the drawer, checkout words, gift step and shop theme mods are the hand-finished site's leftovers, so a pass proves nothing about the route | S-2, S-6 |

## Product verdict

`verify-product.md` landed at 23:40 (11 confirmed, 8 corrected, 0 wrong; checked on `4e6d8e6ad`, Eye Care on the fresh 22:44 rebuild) and is applied above: product-1 (binding sources exist; rating and long description have none; `blurb` is a logic function) in F-51, F-34, F-65; product-2 cause (b) replaced (the hidden `hasImg` branch) in F-50; product-4 (`galleryFrame` does resolve; `main*` unwritten for an unproven reason) in F-53; product-7 (this stream's `placeTitle` fix added) in F-1; product-10 (the container has a media slot) in F-54; product-12 (no plugin gap) in F-58 and F-66; product-14 (1.48:1, render-scope) in F-55; product-15 (`fill-builtin-button.mjs::contentAlignWrite`) in F-52; product-17 cleared in S-1. One verdict claim did not hold when re-read: "both basket pages render an h1" (Mama's `/cart/` has none at 23:45), so basket-12 stands in F-1.

## Settled after the first draft

The main session relayed (2026-11-21 late): the general session splits RW-27; its route half lands in its wave 2 (about 2026-11-23) only after F-28, and its threshold write waits for F-68. F-28 (shop-7) and F-68 (breakpoint rules) are therefore this stream's first wave, for MIC's phone filter (cloned 2026-11-28). Applied in F-28, F-68, F-29, F-30 and section 4.

## Calls made while merging

- Merged by cause across pages and clients, following every merge the verdicts named; findings with two causes were split across fixes (shop-6 into F-33, F-34, F-14 and S-5; checkout-1 into F-10 and F-11; confirmation-8 into one fix with both causes; account-7 into F-16, F-39 and F-63).
- Dropped: shop-11 as a missing-setting claim (wrong); basket-15's white BAG text (fixed by `3f7e7ed2d`); basket-8 as work (Bean's ruling); checkout-8's separator setting, checkout-13's terms words setting and account-11's built-in buttons (settings exist); plugin round 6 item 6.
- F-4: the commerce region's own run, not "a state copy inherits its base row's record" (narrower, touches no other surface).
- F-10: the frame piece records the dropped wrapper in its `run`, matching `109aa6d53`'s pattern.
- F-18: the drawer colour fix goes in the cart's `$has_panel` branch, not in `sgs_colour_value`.
- F-27: fix the extractor's `small` pick, not a floor in the commerce look.
- F-38: the plugin hardening is included as a fix (an order page that shows no order is broken today), with render-scope.
- F-52: Eye Care colour tiles use swatch colours until real colourway photos exist.
- F-24 sized M, not L (the verdict found reusable machinery).
- Plugin "4 checks" marked passed wherever a verdict confirmed or corrected a missing-setting claim, because the verifier protocol required all four checks before accepting one.
- Ownership: account-4 moved to the general session (verdict); `lib/shop-parts.mjs` words and the basket chip's heading split flagged "owner to confirm".
- F-1 split: this stream's `placeTitle` h1 fix for the product page (the product verdict's narrower fix) plus the general session's apply-on-templates for headings the skeleton builds.
- F-28 split from the breakpoint-rules change (now F-68), because the two block different halves of RW-27; F-68 numbered out of sequence to keep every other id stable.
- Re-read Mama's `/cart/` live (read-only `curl`) to settle the product verdict's h1 claim.
- account.md's Eye Care reference site flagged as the wrong mirror (S-15), from `.claude/dev-setup.md`.

## 9. Second opinion (2026-11-22): what is already built, and what shrank

Three reviewers audited every fix against main (`acfa39ade`); independent verifiers checked each finding. The plan's tasks carry the result; this is the record.

- Built or not this stream's: F-5's and F-31's route halves (`913dadb49`, `518e4054e`); F-67 is the general session's RW-18; F-47 dropped (latent, no draft hits it); F-46 parked (editor only); F-45(b) not needed under D-2.
- Route work only, every setting exists: F-39 (all 16 `sgs/account` settings), F-50 (`extrasBeforeCount`, `galleryColumnRatio`, `galleryColumnGap`, `stackBelow`), F-52, F-54 (`sgsSameTermAs`), F-33 (all 11 card settings). F-33 also needs a mode rule writing `cardContentSource: product` (default `typed`): without it the per-product badge, price note and button F-34 writes never render (`includes/product-card-per-product.php` reads `_sgs_card_badge`, `_sgs_card_price_note`, `_sgs_card_cta_label`, `_sgs_card_cta_action`). The `ctaBehaviour` gap note in `data/part-look-modes.json` is wrong for label and action.
- Shrunk: F-2 is one `copyFile(buildDir, slug)` call in `gate-chain.mjs::buildContext`; F-14(a) is one `shop` entry; F-23 lacks only step-number, line-item-brand, summary-fill and a section-with-h2 step; F-48 only non-emoji glyph discs (`skeleton-rules.mjs::EMOJI` covers emoji); F-49's plugin half is an `order-view` link source; F-55 reuses `sgs_wcag_text_colour_for_bg`; F-30 writes theme mods like `lib/site-build-catalogue-toggle.mjs`, not `site-build-options.mjs` (which writes options and refuses non-Fill sources); F-35 only what the drafts differ on.
- Settings that exist (do not rebuild): F-61 `sgsItemStepper*`, `sgsNotice*`, `sgsDeliveryDescription*`, `sgsCouponLabel*`, `sgsTerms*`; F-62 `.sgs-cart__panel-empty--rich`, `emptyMessage*`, `emptyCta*`, `freeDeliveryPlacement`, `itemQtyFontWeight`/`Height`/`Radius`, `panelCloseSize`; F-63 `ordersRowBorderColour`, `ordersRowBackgroundHover`, `ordersRowView*`, `ordersPill*`, `addressCard*`, `menuActiveIndicator*`, `menuCount*`, `menuItemRadius`/`Padding`, `resetNotice*`; F-65 `galleryStickerText` and the per-product card reader; F-66 `giftTile*`, `iconBoxSize`, `iconBackgroundColour`.
- Corrected: F-6's settings live in `src/blocks/extensions/extension-roster.json` and `includes/product-filter-look.php`, not `capabilities.json`; the database has no `block_attributes` rows for `product-filter-*` or `catalog-sorting`, so part-look cannot pair them until they are seeded. F-58 stays (the 2026-11-21 Fill still says "reach-only"; only `itemTitleFontFamily` is routed). F-22 stays latent until the fresh header shows it. F-26 also depends on F-10 and F-11. F-27's owner is unconfirmed (the general plan's RW-17 does not name `pick_font_scale`). F-12: `order-owner`/`order-guest` cannot tell a new account from an existing one.
- Setup: `build-foundation.mjs` (`lib/foundation-plan.mjs`) already runs intake, tokens, plugin build, sync, media, site-build, manifest, paint calibration and the header, footer and drawer clones after `scratch-mirror.sh strip` (S-2 to S-5, S-11); registration is `site-build.mjs --account-registration --apply` (S-9). Only S-6 has no script. The foundation takes 143 to 198 minutes a site and has never run live. Wallets need https and a verified domain (Stripe), so the copies test the card field only (S-10). S-7, S-8, S-13, S-15, S-16 and S-17 need no action.
- Orchestration: the plugin round starts at once in four lanes and one reseed (the lanes need its settings); fixes start by their own dependencies, not by wave; at most two heavy jobs at once across sessions (the PC stopped at 23:31 on 2026-11-20 with more); helper worktrees need the gitignored intake files; only one worktree syncs to the copies; render-scope runs once against `bcc47e0a6`; Bean sees each slice as it passes.

**Built 2026-11-22.** The shop pages plan's Tasks 3 to 16 are built on `main` and proved offline, and reseed A is published; each task's commits, results and deferred items are in `.claude/plans/2026-11-21-shop-pages-fix.md`. F-37's traced cause (`extract-signatures.py` drops attributes it marks ambiguous typography) and the items the slices left are Task 19 there; F-48's remnants, F-49's route half, F-27, F-11, F-42 and F-7 stay the general session's.
