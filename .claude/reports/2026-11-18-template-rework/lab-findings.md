# Lab findings: Mama's shop surfaces cloned from blank (2026-11-19)

The first from-blank run of the special surfaces for template-rework Tasks 4 and 7 (`.claude/plans/2026-11-18-template-rework.md`). Written for the session that continues the work: what was run, what each picture shows, each fault with its proof and its owner.

## What was run

On `local-mediatest-trlab` (http://localhost:8121, a scratch copy of `local-mamas`), from the worktree `E:\sgs-tmp\wt-tr-lab` at `main` `8c752132e`:

1. The strip step (`E:\sgs-tmp\template-rework\lab\strip-shop.php`) removed 10 hand-built template copies, 397 hand-set look settings (Cart block 104, Checkout block 154, account block 139) and 33,982 characters of Custom CSS from the three pages.
2. `node scripts/computed-route/clone-surface.mjs mamas-munches-redesign --surface <key> --site local-mediatest-trlab --jobs 1 --allow-unpicked` for `template-cart`, `template-checkout` and `my-account` (with `SGS_SECRETS_ROOT` set to the shared checkout). The account run also rebuilt the `page` copy and the copies derived from it (`404`, `search`, `product-search-results`, `taxonomy-product_attribute`, and the `order-confirmation` shell).
3. `node scripts/computed-route/part-look.mjs --client mamas-munches-redesign --surface <cart|checkout|my-account> --site local-mediatest-trlab --write` (93, 156 and 58 values).
4. Pictures with `E:\sgs-tmp\template-rework\lab\shots.mjs` (basket filled by the render check's seed, `scripts/render-check/seed.php`): `E:\sgs-tmp\template-rework\lab\shots\pair-*.png`, draft on the left and clone on the right; for 404 and search the hand-finished copy (`local-mediatest-partlook`, port 8120) is on the left. Logs: `E:\sgs-tmp\template-rework\lab\logs\`.

The header, footer and site tokens on the copy are the hand-finished ones: they belong to the general cloning plan and are no part of this test. The shop listing, the product page and the order confirmation were run later the same day, once their builders were on main (their sections are below). Not run yet: the signed-in account views, and the checkout again with its template fixes.

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

The signed-in views were not photographed (the seed makes the customer `rc-customer`; the draft's signed-in state needs its own read).

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
