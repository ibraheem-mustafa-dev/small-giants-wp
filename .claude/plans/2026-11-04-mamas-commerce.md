# Mama's commerce: Basket, Checkout and Account framework build (G1 to G8)

Approved by Bean 2026-11-04. Spec 27 Part 3 holds the requirements (FR-30-18, FR-30-20 to FR-30-26).

## Context

Mama's Basket, Checkout and Account pages carry their content fixes (checkout visible on phones, minimal checkout header, button contrast, basket H1) on local-mamas and mamas-test. What still differs from the drafts (`sites/mamas-munches-redesign/handoff/{Basket,Checkout,Account,SignIn,Confirmation}.dc.html`, data in `handoff/store.js`) needs framework work: G1 to G7 in `sites/mamas-munches-redesign/build/qa/vision-audit/2026-11-03-b6-commerce-investigation.md`, plus G8 found while planning. Every piece is universal (a restaurant, a wedding planner and a law firm), off by default, and leaves every other site's markup, scripts, Store API responses and emails unchanged. Build to Specs 32 and 35: use or upgrade the shared helper/control/emitter; never write per-instance CSS, breakpoints, helpers or specificity workarounds. The adversarial council (spec lawyer, regression red-team, shop-owner realist) ran on the first draft; its findings are folded in below.

## Facts established (2026-11-04, each with its source)

- **Stale local checkout.** Local `main` is 20+ commits behind `origin/main`; `SGS_Breakpoints::media()`, `sgs_emit_tier_decls()` and `src/utils/breakpoints.js` exist there only. Builders work in fresh worktrees of `origin/main`.
- **Mirror state** (`wp eval-file` on `/var/www/local-mamas`): WooCommerce 11.2.1; active plugins `sgs-blocks`, `woocommerce` only (no packing-slip tool); one zone "UK" [GB] with one `flat_rate` at £0, no `free_shipping`; account registration off, guest checkout on, checkout sign-up off.
- **Draft delivery and gift data** (`handoff/store.js`): Royal Mail Tracked 48 £3.95, free at a £35 subtotal or when the basket holds only taster/gift-card items; Tracked 24 £5.45, never free. Gift state `{ on, to, message, hide: true }`, shared by the basket's "This is a gift" and the checkout's "2 · Who's it for?" tiles; the checkout shows "We'll leave the prices off the packing slip"; the step-3 title becomes "Her address & delivery"; placed orders carry `gift` and ship to the recipient's name.
- **Status lines.** Spec 27 FR-30-18 and FR-30-17 "not built"; FR-30-4 "built" (token CSS in `theme/sgs-theme/assets/css/woocommerce.css`); contrast fix on `origin/main` (c3a4ea670). No block exists for G2 to G8.
- **Named extensions on WooCommerce blocks exist** (`extension-roster.json`: `chipGap`, `cardMinWidth`, `sameTerm`; pattern `product-filter-chips-gap.{js,php}`). The roster's `_meta.rule_modes.named` says no DB rows are seeded for named extensions; `includes/extension-attrs-rest-register.php` mirrors client-added attributes server-side.
- **Track A holds pieces G1 reuses, uncommitted** (locked worktree `feature/a-form-shop`): `includes/product-filter-look.php::sgs_inject_scoped_block_css()` and `includes/forms/field-own-style.php` (the form's `field*` vocabulary outside `sgs/form`).
- **Uid hashes.** `account/render.php` hashes `wp_json_encode( $attributes )`; block.json defaults are in `$attributes`, so a new attribute with a `default` changes Eye Care's account class.
- **Store API.** Hard constraint (Spec 27 Part 3): no SGS code posts to `/wc/store/v1/*` write endpoints; cart writes go through `/sgs/v1/cart/*` (`includes/class-cart-proxy.php`). Registered endpoint data adds a key to every cart response.
- **Free-delivery logic.** Resolver closure in `cart/render.php` (`$sgs_cart_resolve_free_shipping_min_amount`); `free-delivery.js::updateFreeDeliveryProgress( el, cart, cfg )`.
- **Live count.** No binding source exposes the count; inline formats live in `src/blocks/extensions/inline-formats/` with a `render_block` conditional enqueue (`includes/helpers-inline-formats.php`).
- **Checkout-block precedent.** `assets/js/gift-card-checkout.js` (Slot/Fill) is the only SGS code inside WooCommerce's checkout. Additional checkout fields (8.9+) have no tile or radio type and no basket placement.
- **Dead control.** `sgs/form-field-address` `enableLookup` prints a "Find Address" button with no provider (`form-field-address/render.php`).
- **Postcode providers (researched 2026-11-04).** getAddress.io ceased operation on 4 Feb 2026. Ideal Postcodes: official free plugin `uk-address-postcode-validation` v4.5.3 (23 Oct 2026; block checkout; postcode lookup and autocomplete), 200 lookups £9 to 32,100 for £900 (4.5p to 2.8p), typing free, credits 12 months, no monthly fee. Swiftcomplete: 3p, £10 minimum, plugin with block checkout. Loqate: 7.3p (£50) to 4.2p (£1,000); official plugin retired, reported broken on block checkout.
- **Regression surface.** Indus has no cart/checkout/account blocks. Eye Care uses `sgs/account`, stock cart/checkout pages and `sgs/cart` in its live header drawer (135 settings, `sites/eye-care-ward-end/build/header.tree.json`). Theme parts `sgs-cart-content.html` / `sgs-checkout-content.html` hold the stock blocks.

## New requirements (written into Spec 27 Part 3 before any lane starts, each with its Done-when)

| FR | What | Gap |
|---|---|---|
| FR-30-18 (rewritten) | Shop look settings on WooCommerce's Cart and Checkout blocks and `sgs/account` | G1 |
| FR-30-20 | Free-delivery progress block | G2 |
| FR-30-21 | Gift order: basket switch, checkout step, order record | G3, G4 |
| FR-30-22 | Commerce note block inside cart and checkout | G1 rows |
| FR-30-23 | Postcode lookup: none for now; the dead `form-field-address` lookup button removed | G5 |
| FR-30-24 | Basket count inline format | G6 |
| FR-30-25 | Account signed-out card and sign-in tabs | G7 |
| FR-30-26 | Free delivery replaces the paid rate it covers | G8 |

(FR-30-19 is the existing Shop wording settings page.)

Every Done-when names: the page and widths (375/768/1440), the properties compared with the draft's computed values (box geometry within 1px, colours exact, type size/weight exact), axe 0, the negative control, and the command that proves it. Spec 48 FR-48-56/87 (the cloning route writes these settings) is updated in the same commit.

## Design

### Shared rules for every lane
- **New attributes carry no `default` key** (absent until set), so `$attributes`, uid hashes and WooCommerce's saved markup stay unchanged; PHP treats absent as "WooCommerce's own look". Enum fallbacks live in PHP. Checked by an assertion that `md5( wp_json_encode( $attributes ) )` is unchanged for Eye Care's saved `sgs/account` and cart attributes.
- **Nothing loads unless used.** Every new script, style, Store API registration and REST route is gated on the block or format being present on the page (`has_block` over the post and its template parts), never on `is_cart()` / `is_checkout()`.
- **Copy lives in attributes.** Every customer-facing string is a block attribute; email and admin labels are generic translatable strings ("Gift order", "Recipient", "Gift note"); no client copy in PHP.
- Accessibility: 44px targets, visible focus, 4.5:1 text; tiles are a radio group, the switch a checkbox with a label, tabs follow the ARIA tabs pattern.
- File limits (PHP 500, JS 400 lines, one class per file); UK English.

### G1 (FR-30-18): look settings on WooCommerce's Cart and Checkout blocks
- **Host:** a named extension on `woocommerce/cart` and `woocommerce/checkout`, following `chipGap`/`filterLook`. Chosen over a wrapper block: the settings sit on the block the client selects, templates are unchanged, and the route is proven on WooCommerce blocks. FR-30-18's text and Done-when are rewritten to this decision with that reason.
- **Groups** (existing vocabularies only): fields (the form's `field*` set via `field-own-style.php`, plus `sgsFieldLabelPosition` above/floating; absent = WooCommerce's floating label); cards for line items, summary/totals, checkout steps, option cards (shipping/payment, with a chosen state), notice panels and the commerce note (background, `SgsBorderControl`, per-device corner radius, `ShadowControl`, per-device padding); `TypographyControls` prefixes for step titles, line-item name and price, summary heading, total row, terms; line items (hide the header row, thumbnail size, stepper radius); the mobile "Show order summary" bar.
- **One writer:** `includes/woocommerce/commerce-look/` (split by group to stay under 500 lines) builds rules from `sgs_fill_decls`, `sgs_border_element_decls`, `sgs_shadow_decls`, `sgs_typography_css_rule`, `sgs_emit_responsive_css`, `sgs_emit_tier_decls`, through `sgs_inject_scoped_block_css()`. Every rule starts with the block's scope class, which exists only when a setting is set.
- **Selectors:** the WooCommerce selector table in that folder is canonical (third-party markup, like `product-filter-look.php`); each row has a `wc_version` field and the basket, user and viewport state it needs. `sgs-update-v2.py::_seed_extension_attr_rows` is extended to seed named-extension attribute rows (with their element and property) so the cloning route finds them (FP-1, FP-8).
- **Editor canvas:** WooCommerce's canvases are React, so the canvas fetches the PHP output from `sgs/v1/commerce-look/css` (nonce, `edit_posts`, attributes validated against the roster, 300 ms debounce, last good CSS kept on failure).
- **Drift probe:** a `site-check` probe asserts each selector matches in its stated state on mamas-test. It warns, never blocks a deploy, and names the row and the WooCommerce version.

### G2 (FR-30-20): free-delivery progress block (`sgs/free-delivery-bar`)
- Server-rendered block, usable anywhere. Attributes reuse `sgs/cart`'s `freeDelivery*` names; the amount is `wc_price` formatted; card chrome is block-private through the shared controls (Spec 02 composite rule, content kind); `role="progressbar"` with `aria-valuenow`, a polite live region for the message, reduced motion = no fill animation; reserved height so filling shifts nothing.
- The resolver moves to `includes/helpers-free-delivery.php::sgs_free_delivery_threshold( $override )`; `sgs/cart` calls it exactly as today (same condition, same query count). When nothing resolves, the editor shows a notice ("No free-delivery threshold found in WooCommerce shipping settings") and the front end prints nothing.
- Live updates from `src/shared/cart-live/`: one page-wide instance (`window` singleton) that reads the Store API, WooCommerce's add/remove events and the `wc/store/cart` data store where present.
- **Separate, later commit:** `sgs/cart/view.js` moves onto `cart-live` only after a frozen behaviour contract passes on Eye Care's mirror header drawer: rendered HTML with a seeded cart byte-identical, and the same Store API request count on open, add, quantity change and remove (Playwright network count).

### G3 + G4 (FR-30-21): gift order
- **One stored value** in the WooCommerce session, `{ on, to, message }`. **Writes** go through a new proxy route `POST /sgs/v1/cart/gift` in `class-cart-proxy.php` (nonce, sanitisation, rate limit; `on` false clears `to` and `message`). **Reads** come from Store API endpoint data on namespace `sgs_gift`, registered only when a page holds the gift block. Limits are attributes (Mama's 40 and 200 characters, from the draft) under a filterable server cap (`sgs_gift_limits`: 100 and 500 characters); over the cap the route returns 400 with a message the block shows.
- **Two placements, one component module** registered with `registerCheckoutBlock`: the basket switch inside the cart items area and the checkout step "2 · Who's it for?" (two stacking tiles at 375, then recipient name and note, then a gift-only line under it such as "Pop her address in below", which replaces the retitle WooCommerce's static step title cannot do). A step-0 spike proves both parents accept the block and where the checkout step lands.
- **Order:** the session value becomes HPOS-safe order meta; a "Gift order" box at the top of the admin order screen, a gift badge in the orders list, and the recipient and note in the new-order email to the shop; the buyer's email and order-received page say "Sent as a gift to {name}" and never repeat the note in a subject line. Shipping name and address are the recipient's (WooCommerce's shipping fields; the gift name pre-fills the shipping first name). Privacy export and erasure include the meta. The session clears after the order; a sign-in during checkout keeps it (tested).
- **Packing slip (Bean, 2026-11-04):** nothing is printed into the box; the shop hand-writes the note, and WooCommerce prints no slip, so the draft's "prices off the packing slip" line stays true as written (it is the block's own attribute text). The admin "Gift order" box shows the note large and in full so it is easy to copy by hand.
- Express pay (later) bypasses this step; FR-30-0(c) records that express buttons wait for the gift flow.

### FR-30-22: commerce note (`sgs/commerce-note`)
- Same registration machinery, cart and checkout parents: a line of text with an optional link. Covers the allergen panel, "Baked fresh..." line and "Keep shopping" link. Its look comes from G1's notice-panel group (Lane D); until then it renders with WooCommerce's text style.

### G5 (FR-30-23): postcode lookup: none for now (Bean, 2026-11-04)
- Decision: no lookup. Customers type their address in WooCommerce's own fields. Research recorded in FR-30-23: full house-level lookup needs Royal Mail PAF data (licensed; every service and self-hosted tool such as paf-monorepo needs it); open data (postcodes.io, MIT, ONS open data) checks a postcode and returns its town but lists no houses; OpenStreetMap UK house numbers are patchy; paid options Ideal Postcodes (4.5p to 2.8p, block-checkout plugin), Swiftcomplete (3p), Loqate (4.2p to 7.3p); getAddress.io closed 4 Feb 2026. The draft's "Find address" button goes in Mama's divergence ledger.
- **The dead control is removed** (a control that does nothing is a defect): survey every site's saved content for `sgs/form-field-address` with `enableLookup` true (canary, mirrors, test sites); remove the inspector toggle and the lookup widget from `form-field-address/render.php`; if any saved block has it on, migrate it by WP-CLI batch (FP-14, no fallback); the attribute leaves `block.json` with `/sgs-update` reseeding it. Runs in Lane C1 (no Track A file overlap).

### G6 (FR-30-24): basket count inline format
- "Basket count" in `inline-formats/` wraps text in `<span class="sgs-basket-count">`; the view module loads only on pages with the class. The span is empty until filled (never a flashing "0"); on cart and checkout, which WooCommerce sends uncacheable, the server prints the count. Not announced (it is part of the heading). Mama's cart pill uses it.

### G7 (FR-30-25): account signed-out card and sign-in tabs
- `sgs/account` gains `signedOutView` (absent = the login form, `card`): heading, copy, sign-in and create-account labels and links; an empty sign-in link means the same page with `?sgs-login=1`, which shows the form. Card chrome through `SgsColourPanel`, `SgsBorderControl`, corner radius, `ShadowControl`, padding, painted by the existing `sgs_account_scoped_css` path; buttons use the site presets. The create-account button and tab hide when WooCommerce registration is off.
- `authLayout` gains `tabs`: Sign in and Create account as ARIA tabs; `?mode=register` opens the second.
- Account fields (the FR-30-18 account half): `field*` settings on `sgs/account` through `field-own-style.php`, painting log-in, register, address and account-details inputs.
- Mama's content: registration on (guest checkout stays on and first; checkout's create-account box unticked), a SignIn page built from `SignIn.dc.html` with `scripts/wp-build-page.js` holding `sgs/account` (form view, tabs), the account card's sign-in link set to it.

### G8 (FR-30-26): free delivery replaces the paid rate it covers
- WooCommerce shows a paid rate and a free-shipping rate side by side. A per-zone setting on the free-shipping method ("Hide these rates when free shipping applies", absent = WooCommerce's behaviour) through `woocommerce_package_rates`. Mama's zone from `store.js`: Tracked 48 £3.95 (shipping classes make taster/gift-card-only baskets £0), Tracked 24 £5.45, free shipping at £35 hiding the paid Tracked 48.

### Smaller items
- Checkout step titles via WooCommerce's `title` attributes: "1 · Your details", "3 · Delivery", "4 · Payment"; the gift step "2 · Who's it for?".
- "Show order summary" at 375: WooCommerce's own toggle, painted by G1's summary-bar group.
- The 10px cart and account offset: measured first (draft vs live boxes at 375/768/1440 on local-mamas), the writing rule proven from the CSSOM, fixed with an existing setting or in the shared rule. No fix before the cause is proven.
- Confirmation (template 219) measured against `Confirmation.dc.html`; existing settings fixed; any framework gap added to this plan before closing.

### Deferred (each with its home)
- Express pay buttons: no gateway yet; Spec 27 FR-30-0(c), waiting on the gift flow.
- SignIn's "Email me about new flavours" opt-in: no mailing provider; Spec 27 Part 3 Open questions (unticked, PECR).

## Build

0. **First, main thread (about 30 min):**
   - Message Track A (`feature/a-form-shop`) for its landing time and the `sgs_inject_scoped_block_css` / `field-own-style.php` contract. If it has not landed when Lanes A to C finish, ask Bean whether to wait or build on main's helpers.
   - Message the Eye Care (small-giants-wp-7d) and Indus (small-giants-wp-51) sessions with the queue; no merge, reseed or deploy without their acknowledgement.
   - Spikes on local-mamas: a class added to `woocommerce/cart`'s root survives the React mount, and its scoped style prints once with two cart blocks on a page; `registerCheckoutBlock` accepts the cart-items and checkout-fields parents, and where the checkout step lands.
   - Write FR-30-18 and FR-30-20 to FR-30-26 into Spec 27 (and FR-48-56/87) and commit the repo plan.
   - Record the Eye Care baseline: rendered HTML of my-account, cart, checkout and the header drawer with a seeded cart; `/wc/store/v1/cart` JSON; enqueued assets and transferred JS/CSS per page; a captured new-order and customer email.
1. **Lanes** (one Sonnet `wp-sgs-developer` each, own worktree of `origin/main`, local-mamas only; full `npm run build` before each commit; every `block.json` change reported; values stored in their declared type; processes stopped by PID; no other worktree or `E:/sgs-tmp/sgs-deploy-wt-*` touched; TMP/TEMP=E:\sgs-tmp; every brief carries "Build to Specs 32 and 35: use or upgrade the shared helper/control/emitter; never write per-instance CSS, breakpoints, helpers or specificity workarounds" and the shared rules above; each lane runs its own build, fast and full gate tiers, and its FR's Done-when before reporting):
   - A: G2 + `cart-live` + G6; the `sgs/cart` move is its own final commit behind the behaviour contract.
   - B: G3/G4 gift order (proxy route, endpoint data, component, order record, admin gift box) + FR-30-22 commerce note.
   - C1: G7 card + tabs, and the dead `enableLookup` removal (G5). C2 (after Track A): account fields.
   - D (after Track A): G1 extension, seeder change, REST canvas route, selector table, drift probe.
   - G8 runs inside Lane B (it shares the order-flow files).
   - Shared files (`extension-roster.json`, the block registry, `slots.json`): each lane appends; the main thread resolves on integration. No lane touches `sgs/buybox` or `sgs/product-card`.
2. **Main-thread QC per lane:** read the full diff; grep it for literal breakpoints, duplicated helpers, doubled-class selectors, inline `style=` and client copy; rerun the Eye Care baseline (HTML, uid hashes, Store API JSON, assets, emails) and require no change; open in the editor every Eye Care, canary and Mama's page or part with a cart, checkout or account block (zero recovery prompts).
3. **Integrate** serially onto `origin/main` from a clean worktree, explicit pathspecs, `git branch --show-current` in the commit command, peers told before each merge.

## Apply and verify

1. Reseed from a clean worktree of `origin/main`; `npm run build`; `python scripts/run-gates.py --tier fast` and `--tier full` from `plugins/sgs-blocks`.
2. Peers' acknowledgement, then `build-deploy.py --target sandybrown,mamas-test` (its rollback restores the previous build if verification fails). The canary gets the generic checks (editor loads, a test order through the FR-30-0 gateway, no-settings negative control); the Mama's checks run on local-mamas and mamas-test.
3. On local-mamas: shipping zone, registration, settings and content from the drafts' computed values; one throwaway guest cart; one test gift order on the mirror (gift meta, admin box, both emails captured by the mirror's mail block, order-received page, privacy export).
4. `plugins/sgs-blocks/scripts/audit-post-content-blocks.py` 0 HIGH; `bash scripts/local-wp/push-to-remote.sh local-mamas mamas-test --dry-run`, then the real push.
5. `node scripts/computed-route/site-check.mjs` on mamas-test (woocommerce check green, drift probe green); computed styles and boxes at 375/768/1440 against each draft per the FR Done-whens; axe 0 per surface; screenshot pairs for Bean.
6. `/qc`, then `/handoff` (Spec 27 Status lines, Spec 02 roster, the fix catalogue `sites/mamas-munches-redesign/build/qa/fix-catalogue.md`, the divergence ledger, LEDGER).

## Decisions (Bean, 2026-11-04)
1. Postcode lookup: none for now; the dead address-field button is removed; research kept in FR-30-23 for a later client.
2. Packing slip: nothing to build; the note is hand-written from the admin gift box.

## Time (smallest plausible)
Step 0 about 30 min; Lanes A, B, C1 in parallel about 20 to 30 min each; C2 and D about 30 min after Track A lands; QC, integration, gates, deploy, mirror push and verification about 60 min.
