---
title: "Eye Care: the functionality and feature backlog pulled out of the fix register"
project: small-giants-wp
created: 2026-10-05
status: Tier 1 built except CR6; Tier 2 shop-journey group built (2026-10-06, see the group marker below); the rest of Tier 2 and Tiers 3-4 not started
governs: what to build next, after the register-proven repairs track closed
references:
  - .claude/plans/2026-10-02-eye-care-fix-register.md
  - .claude/plans/2026-10-05-eye-care-register-proven-repairs.md
---

# Eye Care: the functionality and feature backlog

**Written for:** Bean, and whoever picks this up next session.

**What this is.** The fix register holds every Eye Care fix, about 200 rows, and most of them are
*values* — a spacing, a colour, a font weight — which belong to the page trees and to Solve. This
document pulls out only the rows that change what the site can **do**: a feature that does not exist, a
control that exists but paints nothing, or a behaviour that is broken. Nothing here is a new decision;
every item is already decided in the register, and the register stays the source of truth. If an item
below disagrees with its register row, the register wins.

**What was deliberately excluded:** page-tree values (sizes, spacing, colours, weights), content
(product data, copy, missing pages), pure styling, the Spec 47 measuring route and its calibration
findings (another session owns those). Also excluded:
everything already built — S1, S5, S11, S12, 15, 38, 68, 76, 87, N3/17B, N11(b), N17b, N25, N46, and
the framework half of N45.

**How to read the tiers.** Tier 1 stops a shopper finishing a task. Tier 2 is a feature that does not
exist. Tier 3 is a control that exists and does nothing — these are cheap and they remove the
"why doesn't this setting work" questions. Tier 4 is small setting additions. Within a tier, the order
is the order I would build in.

---

## Validated before dispatch (`/qc-council`, 2026-10-05)

Three Tier 1 proposals went through an empirical pre-dispatch gate. **One was falsified as written**,
and building it as stated would have produced invalid CSS across ~160 call sites. Each row below gives
the predicted outcome, the baseline, the validation command and the commit gate. Do not re-derive these.

### N11(a) — VALIDATED. The mechanism is proven and the fix is one line.

The register's wording ("the route builds the bag without loading the saved one") is crude but right,
and an early grep wrongly cleared it because `class-cart-proxy.php` does call `wc_load_cart()`. That
call only CONSTRUCTS `WC_Cart` and the session; it does not read the saved items. Verified against the
**installed WooCommerce 11.1.0** on the canary, not trunk (the canary has since been upgraded to 11.1.2, so no 11.1.0 install remains on either site):

- `class-wc-cart.php:663-665` — the saved items load lazily: `if ( ! did_action( 'woocommerce_load_cart_from_session' ) ) { $this->session->get_cart_from_session(); }`
- `class-wc-cart.php:132` — `add_action( 'woocommerce_add_to_cart', array( $this, 'calculate_totals' ), 20, 0 )`
- `add_to_cart()` reads `$this->cart_contents` directly and never triggers that load

So: the new line is written into an unloaded cart; `woocommerce_add_to_cart` fires; `calculate_totals()`
calls `is_empty()` → `get_cart()`, the FIRST such call, which runs `get_cart_from_session()`; that
calls `set_cart_contents()` from the saved session and **replaces the in-memory contents, discarding the
new line**; `set_session` at priority 1000 then saves the old-only bag. It fits every facet: the first
add survives (saved bag empty, the `! empty()` guard skips the replacement), the second is dropped, the
success flag is still `true` because `add_to_cart()` returned a key, and WooCommerce's own route is
immune because `CartController::load_cart()` calls `get_cart()` BEFORE adding.

- **Fix shape:** load the saved bag before adding — call `WC()->cart->get_cart()` in
  `includes/class-cart-proxy.php` before `WC()->cart->add_to_cart()`, mirroring `CartController::load_cart()`.
- **Baseline (run it first, as a guest in a private window):** add product A, read `/wp-json/wc/store/v1/cart`, add a different product B, read again. Expect `[A]` both times.
- **Predicted post-fix:** the second read returns `[A, B]`.
- **Negative control that must come back negative:** a **stock-managed** product B should NOT show the
  bug even before the fix, because `add_to_cart()` calls `get_cart_item_quantities()` → `get_cart()`
  (`class-wc-cart.php:883`), which loads the saved bag first. If a stock-managed B is also dropped, this
  mechanism is refuted — stop and re-diagnose.
- **Commit gate:** do not commit unless the bag holds both products after two sequential adds, AND a
  third add of a product at the global cap still returns 429 (proving the other rate limit survives).

> **MEASURED 2026-10-06 on BOTH sites, and it does NOT reproduce on either. The condition it was diagnosed
> under no longer exists anywhere, so it cannot now be settled by measurement.**
> Two sequential adds through the PROXY itself (`POST /wp-json/sgs/v1/cart/add-item`, all four calls 200) as a
> GUEST in a fresh browser context, using NON-stock-managed variations - the condition this row says should
> expose the bug, since its own negative control notes a stock-managed B would be immune. Both bags held both
> lines: eye-care-test `["EA4033", "Chelsea"]`, canary `["QA Photo Swap Target", "Classic Lactation Cookies"]`.
> Two sites, two independent datasets, same result.
> **The catch:** this row's mechanism was derived against the installed **WooCommerce 11.1.0**, and Bean
> upgraded the canary on 2026-10-06, so BOTH sites now run **11.1.2** (confirmed by `wp plugin get woocommerce`
> on each). There is no longer an 11.1.0 install to reproduce the original analysis on. A non-reproduction on
> 11.1.2 is evidence about 11.1.2 only; it does not prove the 11.1.0 mechanism wrong.
> **Disposition - needs Bean, and it is small.** The user-visible defect is absent on every site we run, so
> there is nothing to fix here today. The one-line fix shape stays on record because it would still matter for
> a client pinned to 11.1.0 or earlier. It is deliberately NOT built: with the behaviour working on both sites
> the cause can no longer be proven, and this project does not commit a cause-specific fix for an unproven
> cause (`~/.claude/rules/prove-the-cause-before-fix.md`).
> Two earlier attempts of mine were VACUOUS and are recorded so they are not repeated: the first used a
> simple product as B, which adds through WooCommerce's own classic form and never touches the proxy; the
> second produced no cart POST at all. Only an add that POSTs to `/sgs/v1/cart/add-item` tests this row.

### 52 — VALIDATED mechanism, TWO causes, and a cause-agnostic fix

The register names one cause; the code holds two, and both are live:

1. `brand-strip/view.js::init()` waits on every image with `Promise.all(pending)` and **no timeout**,
   resolving only on `load`/`error`. The logos are lazy: `includes/helpers-media.php:29` sets
   `'loading' => 'lazy'` and passes it to `wp_get_attachment_image()` at line 37. Below the fold, nothing
   fetches, so `measure()` never runs.
2. `view.js::measure()` returns early when `setWidth === 0` with **no retry**, so a single zero reading
   (a collapsed or hidden ancestor) stops the strip permanently.

Cause 1 alone predicts "starts late, once scrolled into view", not "never". So **measure before fixing**:

- **Baseline:** load the canary page carrying the strip WITHOUT scrolling, read whether the animation is
  running and whether `measure()` ran; then scroll the strip into view and read again. Two readings
  separate "never" from "late" and tell you which cause is live.
- **Predicted post-fix:** the strip animates without the viewer having to scroll to it.
- **Fix shape (cause-agnostic, so it is safe even if the baseline is ambiguous):** give the image wait a
  timeout fallback, and make `measure()` retry instead of bailing permanently at zero width (a
  `ResizeObserver` or a bounded retry). Permitted without a single proven cause because it helps
  whichever of the two is live (`~/.claude/rules/prove-the-cause-before-fix.md`).
- **Commit gate:** do not commit unless the strip animates on first paint with the strip off-screen, AND
  still animates when the images are warm in cache (the path where `img.complete` is already true).

### CR6 — **FALSIFIED as written. Do not build the fix in the backlog's words.**

The diagnosis is confirmed (`helpers-box.php::sgs_box_object_shorthand` lines 184-187 fill unset sides
with `0`). **The fix shape was wrong**, and the blast radius is measured: **182 call sites across 57
files**.

- **157 call sites** interpolate the value after the property name — `"padding:" . $v`. A longhand
  return would emit `padding:padding-top:12px`, invalid CSS the browser drops entirely. The helper has
  **no test coverage at all**.
- **6 sites plus `includes/helpers-container.php::sgs_serialise_box_sides`** store it in a CSS custom
  property read as `padding: var(--x)`, where a longhand cannot work at any price (the accordion-item
  pair, `nav-menu-submenu-css.php`, `multi-button`, `trust-bar`, `--sgs-gi-padding`).
- **A JS consumer encodes the zero-fill deliberately**: `scripts/computed-route/lib/resolve.mjs::seedSides`,
  with a test named **"MUST FAIL TO ZERO"** asserting the current behaviour. ⛔ **That directory is
  another session's owned, frozen territory — so CR6 has a cross-session dependency and cannot be
  built without coordinating with the Spec 47 route work.**
- **Four sibling helpers share the identical defect** and would be left inconsistent:
  `sgs_corner_object_shorthand`, `helpers-container.php::sgs_serialise_box_corners`, and the two media
  atoms in `includes/media/atoms/` (one with a JS twin, `sidesToShorthand()`).
- **A precedent exists, so this is reuse not invention:** `includes/class-sgs-container-wrapper.php`
  ~2711-2736 and ~2856-2928 already emit per-side longhands for set sides only, and
  `includes/helpers-responsive.php::sgs_responsive_side_order()` gives the canonical side order.
- **One behavioural decision is owed before any block migrates:** today a mobile tier setting one side
  resets the others, so it wipes a tablet tier's values. Longhands would let them inherit. That is
  arguably better, but it is a silent change for any block relying on the reset.

**Validated shape:** a NEW sibling function returning a declaration list (or an array keyed by
property), with the old function retained for the `var()` consumers until they get per-side variables, so
the 157 sites migrate deliberately rather than all at once.

**Commit gate:** do not commit until the new function has a standalone test with a negative control, the
old function is byte-identical, and `scripts/computed-route/` has been coordinated with its owning
session.

**Re-tiering:** CR6 is no longer "build this first". Its cross-session dependency puts it behind the
Spec 47 route work. Build N11(a), 75/82/158, 91 and 52 first.

## Found by the QC pass, 2026-10-06 (not yet built)

Full pass with evidence: `.claude/reports/2026-10-06-qc-eye-care-tier1/README.md`.
15 of 17 adversarial scenarios passed. One failure was this session's own defect and is fixed
(`82f54f351`). These two are **pre-existing**, proven so by diff, and are new items:

| Ref | What a user (or an abuser) hits | What to build | Tier |
|---|---|---|---|
| **Q1** | **A single guest request can put 9,999 units in the basket** (GBP 94,990.50, measured live). There is no upper bound at all on a product with stock tracking off, which is every canary product and any client product not tracking stock | `class-cart-proxy.php::Cart_Proxy::handle` sets `$stock_qty = PHP_INT_MAX` for unmanaged stock, which skips the clamp branch, and `class-cart-limits.php::enforce_add_to_cart_limits` returns early for unmanaged stock. Two guards both opt out. **Researched 2026-10-06, full finding in `~/.claude/memory/research/2026-10-06-woocommerce-maximum-quantity-cap.md`:** WooCommerce core has NO maximum-quantity setting — only `_sold_individually` (forces 1) and stock as an implicit ceiling. The root cause is in core, not in SGS: verified in the INSTALLED 11.1.0, `abstract-wc-product.php:2143` has `get_max_purchase_quantity()` return **-1, meaning unlimited**, whenever stock is unmanaged or backorders are allowed, so every stock-off product in WooCommerce is uncapped and SGS inherited it. The canonical hook is `woocommerce_quantity_input_max`, which the widget, the classic cart and the Store API's `QuantityLimits` all derive from; `woocommerce_add_to_cart_validation` does fire on the Store API path (`StoreApi/Utilities/CartController.php:335`) but **not** inside `WC_Cart::add_to_cart()`, so our own proxy must clamp for itself. ⚠️ `woocommerce_store_api_cart_item_quantity_validation` is 11.2-only and **absent on 11.1.0** — do not design around it. Build shape: filter `woocommerce_quantity_input_max` as the single source of truth, have the proxy and cart-limits read `get_max_purchase_quantity()` instead of their own stock maths, and treat core's `-1` as ‘apply the fallback cap’. Setting home: core offers none, the paid Min/Max extension is ~GBP 38/year PER SITE (poor for a framework shipped to many clients, and reviews report mini-cart and wishlist breakage), so a field on Product data → Inventory where the owner already looks, plus a store-wide fallback. **Suggested default 10 per line — judgement, not sourced; Bean's call.** Also reconsider `floor(stock * 0.3)` when building: it makes the cap move as stock moves. And note quantity caps are a stock/order-sanity control, NOT a fraud control. **Decided 2026-10-06 (Bean), on the research: no custom maximum for items with no limit.** WooCommerce's own position is that an unmanaged-stock product is unlimited (`-1`), which is a deliberate statement that the shop can always supply more, and SGS will not override it with an invented commercial cap. So the per-product field and the store-wide fallback are NOT being built. **Residual, recorded not actioned:** a single guest request can therefore still create a 9,999-unit line (GBP 94,990.50 measured live). That is an order-sanity and typo exposure rather than a stock one, and the cheap version if it is ever wanted is a high sanity ceiling in `class-cart-proxy.php` (a few hundred, not a commercial limit) that only stops a fat finger or a bot, leaving genuine bulk orders alone. The separate rate limit on that route is unaffected and still fires | closed — decided, not building |
| **Q2** | The selected product tab fails contrast at **2.24:1** (`#e68a95` on `#fbf3dc`, needs 4.5:1), flagged serious by axe-core | `tabs/style.css::.sgs-tabs__tab--active` paints the client's primary token on `surface-alt`. **Decided 2026-10-06 (Bean): matching the draft wins, so no framework change is owed.** The framework rule already paints the client's own palette, which is what draft parity requires; the 2.24:1 figure is the CANARY client's pink-on-cream, not Eye Care's. If a later draft-parity pass shows the selected tab does not match the draft, that is a client token value in `sites/<client>/theme-snapshot.json`, not a block change. Recorded as an accepted contrast gap rather than an open build | closed — accepted, no build |

Both are fix-shape proposals, so per `/qc`'s own rule they go through `/qc-council` before any
implementer is dispatched.

## Tier 1 — a shopper cannot finish the job (build these first)

> **Built and verified on the sandybrown canary, 2026-10-05** (`65573118c`, plus `c06f71ea6` for the
> tabs correction): **N11(a)**, **52**, **75/82/158** and **91**. Each one's register row carries the
> commit hash, what was measured and what was not. **CR6 remains deliberately unbuilt** - see its
> falsified entry above; it needs `scripts/computed-route/lib/resolve.mjs`, which another session owns.
>
> Three findings from building them that change what the rows above say:
>
> - **52's cause was neither of the two the gate listed.** The strip's logos are outside the viewport
>   **horizontally** - one set is 2784px wide inside a 1440px `overflow: hidden` strip - so a lazy
>   image there is never fetched and no amount of scrolling reveals it. That is why the symptom is
>   never rather than late. The zero-width cause was measured and is NOT live (`setWidth` was 2784).
>   The cited line was wrong too: the strip uses `sgs_render_media()`, not `sgs_responsive_image()`.
> - **N11(a)'s stock-managed negative control cannot be run on the canary at all.** Every canary
>   product has `stock = NULL`, and `class-cart-limits.php::enforce_add_to_cart_limits` returns early
>   for unmanaged stock, so no canary product can ever reach the global cap and the commit gate's 429
>   is unreachable there. Rate limiting was proven intact by a different route instead - see the
>   register row. A cheaper, read-only control replaced it: A then A again survives (that path already
>   called `get_cart()`), while A then a different B did not.
> - **Compensating a changed border width with padding does not work**, which cost a second deploy.
>   Browsers snap a border to whole device pixels while padding keeps its full value, so the two never
>   cancel. Keep the border width constant and change only its colour, as the draft does.


| Ref | What a user hits | What to build | Prove first? |
|---|---|---|---|
| **N11(a)** | **A second, different product never reaches the bag.** Says "added", then the line is dropped when the bag already holds something. This is the single worst item in the register | The register's leading theory: the shop's add-to-bag route builds the bag without loading the saved one. Load the saved bag before adding | **Yes.** Symptom is proven live, the mechanism is not. Test on the canary: add A, add B, read the bag |
| **75, 82, 158** | **Product gallery thumbnails and colour-swatch photos do not show, although the photos are set up.** Your data is right and the framework ignores it | Three parts: (1) the gallery reads the variation's photo **plus** WooCommerce's own product gallery, without duplicates — today it reads an SGS-only field and never WooCommerce's; (2) turn on swatch photos; (3) any variation with its own photo shows it. Today a photo equal to the main image is skipped, which is why Ivory stays flat | No — proven live |
| **91** | A product with stock tracking off shows no availability at all in the Details tab | Fall back to "In stock" / "Out of stock" when stock is not tracked | No |
| **52** | The brand logo strip never starts scrolling | Thought to be waiting on off-screen images before starting | **Yes.** Read the live page first |
| **CR6** | **Setting one side of a padding or margin box silently zeroes the other three**, wiping the block's own default. The About WhatsApp button lost its 24px sides when only the top was set | `includes/helpers-box.php::sgs_box_object_shorthand` prints `0` for every unset side. It reaches **every block that uses the helper**, so this is the widest-blast-radius bug in the register | No — proven live. Note the route worked *around* it (Solve now writes the other sides), so the framework bug itself is still there |

**Why CR6 is in Tier 1 despite looking like a styling bug:** it is not a value being wrong, it is a
control destroying three values the operator never touched. Every client hits it, on any block, the
first time they set one side of a box.

---

## Tier 2 — features that do not exist yet

Each is already decided in the register. Grouped so one sitting can close a theme.

### The shop and bag journey

> **The five recommended items are BUILT and deployed to the canary (2026-10-06):** 18 (`c8c2c4162`, closing 93),
> 20+23 (`e4735072d` + `e7a1ebfa7`), 59/61 (`5a9e28ee5`), S10 (`80b9deaa4`) and S9 (`2b4122c77`). Each register
> row carries its hash, the readings taken at 375/768/1440 with their negative controls, and what was explicitly
> NOT measured. **Nothing in this group is open any more (2026-10-06):** both S10 defects are fixed (`6cb273a18`
> for the heart and the swatches, which the same cause hid; `e62f45952` for the tab stop, where Bean approved
> rebuilding the stretched-link pattern so the block's own visible link owns the surface), the
> `Product_Manifest` "divergence" turned out to be two different 48-variation products with near-identical names
> and the photo swap is verified on a realistic fixture, and 20+23 is verified on eye-care-test with the client's
> wording, a real order and a foreign-row negative control. **S8, 17, 65B and 64 below are untouched** and are
> what remains of Tier 2. Two register rows were also wrong to call their
> work new: S10's stretched link already existed as the `blockLink` extension and S9's brand-logo lookup already
> existed in `brand-strip`, so both became reuse plus adaptation.

| Ref | The feature | Notes |
|---|---|---|
| **18** | **"Added to bag" toast.** One shared toast: polite screen-reader announcement, a "View bag" action, closes after 5s, pauses on hover or focus, respects reduced motion. Errors use the same toast in error colours and stay until closed. Replaces the red inline notice and the "Added to your basket." strip | Check first whether `sgs/notice-banner` can be the shell. Also closes **93** |
| **20 + 23** | **One server-built bag line summary**, used by the bag, cart, checkout and emails alike. Frame only: "Frame only · Size: M · Colour: Gold". With lenses: two lines. Drops "Your prescription", "What they're for", "Options:", the lens thickness number and the lens width shown as the size | The framework builds it from labels; the **wording lives in Eye Care's lens pop-up layout file**, so no optician words end up in framework code. Also: "Add my prescription" hides once that frame has lenses |
| **59, 61** | **Card colour swatches become real buttons.** Today they cannot be focused or clicked. A swatch changes only its own card's photo, and clicking the card then opens the product with that colour already chosen | Baymard-standard behaviour, and an accessibility fix as much as a feature |
| **S10** (N26, N2A) | **One shared "stretched link" piece.** The main link covers the whole card or logo row, while buttons inside it (wishlist, swatches) sit above and keep working | Used by product cards and the header logo. This is the piece 59/61 needs to not fight the card link |
| **S9** (N10, N27-brand, N33A) | **Brand logos instead of typed brand names.** One shared lookup prints the brand logo with the brand name as its text alternative, on product cards, the product page top and bag lines, falling back to the name when a brand has no logo | All 40 brands already have a logo saved. Pairs with **D8**: the logo above the product name, linking to the brand page |
| **S8** (N9, N34) | **One switch hides ".00"** on whole-pound prices across the product page, cards, bag, lens pop-up and the shop's price text. Emails and admin keep pennies | Checkout total lines keep pennies per D4 |
| **17** | The bag count pop becomes **off / on change / on load and change** (today just on/off), and takes the draft's shape | Check it plays at 0 |
| **65B** | **The shop goes to a single column below 400px.** Today its "narrow layout: grid" floors each column at 50%, so it can never reach one column | Also fixes 65A and 65C as a side effect |
| **64** | **Pin the filter drawer's top bar**, like the bottom one already is | |

### The lens pop-up

| Ref | The feature |
|---|---|
| **N37** | **"Advance on pick, keep Continue" mode.** Picking an option moves to the next step (except the last); Back then Continue returns without re-picking; each step change is announced to screen readers |
| **N38** | **"Skip adds to bag".** "Skip the lenses" adds the frame straight to the bag using the existing add-to-bag function, instead of opening an extra step |

### Menus, header and drawer

| Ref | The feature |
|---|---|
| **N5.5** | **Mega menu items you can click through to their page.** The ordinary dropdown already renders a link plus a separate open button; mega items render a button only. Give mega items with a page the same link-plus-button pattern, the button discreet and still 44px. Then add the page links to Sunglasses, Lenses and Help (Brands stays button-only) |
| **N5** | **New mega panel setting: "width limit applies to panel / content".** Content mode paints the ground edge to edge and centres the content at 1440. Today the panel stops at 1440 and sits left-aligned at wide screens |
| **N4** | **Top bar becomes a moving strip when its items no longer fit.** Below 768 the bar scrolls on a 30s loop; at 768 and above, items that do not fit are dropped. The scroll settings already exist; the repair is that turning scrolling on currently switches dropping off at every width. **Needs a visible pause button** — moving content over 5 seconds requires one (WCAG 2.2.2) — and pauses on hover and keyboard focus |
| **14** | **New drawer setting: "stagger items inside groups".** CSS only, replays on every open. Draft movement: rise 18px, 0.5s ease |
| **N7** | Swap the drawer's three hand-styled social buttons for the same `sgs/social-icons` block the footer uses, with a **new "fill the row" option** to keep the full-width buttons |

### Motion on Home

| Ref | The feature |
|---|---|
| **53** | **Hero "drift" mode.** The photo moves at a set share of the scroll speed (draft 0.18), replacing the current fixed-background parallax where the photo stands still. **Off under reduced motion** |
| **51** | **Hero "zoom out once on load" mode**, with duration and start size — a one-off 3s zoom from 108% to 100%. Two parts: the existing ken-burns effect **paints nothing at all** on the standard hero (a repair), and it is a 20s loop where the draft wants a single pass (the new mode) |

### Footer and site furniture

| Ref | The feature |
|---|---|
| **39-43** | **Social icons: a brand-colour variant that colours only the glyph** — Google in its four colours, Instagram in its gradient (needs a new glyph), WhatsApp green — with the box staying white with a light border. Hover gives a border and a 1px ring in the network's colour, no scale-up. Plus a **new "networks" setting** for order. Boxes stay 44px, not the draft's 40px, to keep the touch-target rule |
| **37** | **New `sgs/business-info` setting: address link — none / Google Business profile / directions.** The Google Business link is already in Site Info |
| **N13** | **The floating WhatsApp button steps aside** while the footer's bottom strip is on screen, so it stops covering the bottom-right links. Extend its existing "hide near another WhatsApp button" watcher with a generic opt-in on the footer row |
| **135** | The contact form's narrow-width stretch becomes **switchable**, so the Send button can be full width on a phone |
| **N24** | **The Google logo on each review card becomes a link** to that review, falling back to the listing — Google's display rules require each review to show its source with a link back. Today the per-card logo is `<img alt="" aria-hidden="true">`, correctly decorative; once it is a link it needs a real accessible name, so this is an accessibility change as well as a functional one. `showReviewLink` (a separate "Read the full review" text link, default off) does not cover it | `sgs/google-reviews` is **no longer owned by a separate track** (2026-10-05) — it is available to build. Its colours and sizes still follow Google's own interface, which is an accepted difference and never a gap |
| **S2** | **One text-link underline mechanism.** An underline sweeps in left to right on hover and retracts right to left, in the link's own colour. The repair: the theme's existing underline-slide utility currently retracts the wrong way and breaks on links that wrap, and the plugin carries an unused duplicate to delete. Then the header menu's existing "sweep" setting is switched on, and mega links get a "link" button style using the same sweep | Covers 2, 6, 7, 32, 33, 44, 131 |

### Checkout and confirmation

This is the least-started area and the one with a real unknown in it. Note the scope: Eye Care gets its
own checkout template. Nothing here changes the checkout every other SGS client gets.

| Ref | The feature | Notes |
|---|---|---|
| **154 + 149 + 150** | **Build the draft's checkout as Eye Care's own checkout template.** One job, not three. It becomes the checkout template for **this site only** and must not become the template every SGS site gets. That covers the draft's look (numbered small uppercase step headings, white fields, a flat summary card, a 1200px column, delivery cards), the "Pay now" label with the price on the right, and Eye Care's secure-payment note | **Open question to answer first: can `wp-build-page.js` build a template or template part?** If it cannot, this needs another route — WordPress does save a Site Editor edit of a part per site. **Scope separately, do not fold in:** the draft's prescription step and express-pay row need the planned plugin work |
| **156** | **Build the confirmation screen**: tick icon, "Thank you", short message, "Back to the shop", centred. The order table is deliberately left out; the email carries the details | Wording per client |
| **157** | The confirmation grid **collapses to one column when the shipping box is empty**, instead of leaving the billing box alone in the right half | Small |
| **155** | **Hide WooCommerce's collapsed top summary on phones**, so the order summary appears once, below the form | Needs the selector proving first |
| **148** | Checkout sections fade up on scroll, from tokens | Small |

### A new block

| Ref | The feature |
|---|---|
| **D1** | **A general "measured diagram" block**: a drawing uploaded as media, labels bound to product measurements, a table and a note, following the size picker. Decided on 2026-10-03. The interim table and note go in first with existing blocks (**N36S**), so this block is not blocking anything — build it when the rest is calmer |

---

## Tier 3 — controls that exist and paint nothing

These are the cheap wins. Each one is a setting a client can already see and change, which does
nothing — so each is a support question waiting to happen.

| Ref | The dead control | Where |
|---|---|---|
| **CR12** | **The dark-mode toggle renders nothing for any current client.** `theme-toggle/render.php` returns early with no derived dark palette, and no `sites/*/theme-snapshot.json` has one. So the whole feature is inert | Decide whether to derive a dark palette per client or hide the toggle until one exists |
| **CR2** | **A header's scrolled background and text colours show no change.** `site-header/render.php` only switches the scroll script on for transparent, shrink, hide, a scrolled shadow or section ink — never for these two colours. Calibration also saw no change with shrink on, so a second cause remains | Prove the second cause |
| **CR1, CR9** | **Per-device settings that skip one width.** Header-row and footer-row per-device gap and content width reach 375 and 1440 but not 768 — identically on both blocks, so likely shared code. Same pattern: `gallery` gap and content width, `mega-aside` aside gap (768 missed), `notice-banner` padding and margin (1440 missed), `form-field-tiles` grid columns (375 missed) | One likely shared cause; worth one investigation covering all of them |
| **71** | The product block does not pass text styling through to the colour and size options, so swatch names cannot be sized or weighted | A control-plumbing job |
| **CR10** | `sgs/media`'s `aspectRatio` has no `css_property` in the framework DB, so it can never be resolved or written | Small, DB-side |

---

## Tier 4 — small setting additions

Worth doing in one sitting together, since each is a single control plus a reader.

| Ref | The setting |
|---|---|
| **67** | Tabs gain a panel padding setting (Eye Care sets 0) |
| **73** | A new entrance setting for the gallery photo on the product block (fade in on load) |
| **94** | The gallery photo joins the shared hover zoom |
| **77** | A selected-tile border width setting (Eye Care wants 2px against 1px) |
| **49** | A "collapsed icon size" setting on the floating WhatsApp button, so the icon stays 28px or larger once it collapses to a circle |
| **19** | A bar fill duration setting on the free-delivery bar |
| **117, 123, 69, 81, N29** | The size pop-up: a **padding setting**, a header bar built as a container in the pop-up's own layout file (title, divider, sticky), a **screen-edge gap token** (32px above phone, 16px on a phone), and a square transparent close button |
| **9** | The Ferrari brand tile reads its name twice to screen readers — clear either its title or its image's text alternative |
| **152** | Confirm coupon, order note and terms can each be switched off without code (order notes is a checkout block setting, coupons a WooCommerce setting, terms an inner block in the shared part). A verification task, not a build |

---

## Checked and needing no build

| Ref | The question | The answer, from the code |
|---|---|---|
| **D7** | Can the Google rating badge be placed on its own, without the review cards and without being a sticky/floating feature? | **Yes, and it needs no framework work — it is a tree value.** `sgs/google-reviews` has two separate variants. `variant: "badge"` is **in flow**: `style.css` gives it `display: inline-flex` with no positioning, and `render.php`'s badge branch renders stars, score, count and the Google attribution then **skips the review-cards list entirely**. `variant: "floating-badge"` is the sticky one, and only it adds `position: fixed; bottom: 2rem; right: 2rem; z-index: 999`. So: set the block's `variant` to `badge` in `sites/eye-care-ward-end/build/header.tree.json`. Nothing to build |

## What I would do first, and why

If you want one sitting: **Tier 1 in order.** N11(a) and 75/82/158 are the two items where a shopper
is actually blocked or misled, and CR6 is the one bug every future client will hit on every block. All
three are independent, so they can run in parallel.

If you want the biggest felt improvement for Eye Care specifically: **18, 20+23, 59/61, S10 and S9 as
one "shop journey" sitting.** Those five together are what makes the shop feel finished rather than
functional, and S10 is a dependency of 59/61, so they belong in the same pass.

Three items need an answer before they can be built, and none of them needs you: N11(a)'s mechanism
(test on the canary), 52's cause (read the live page), and the checkout item's template question (check
whether `wp-build-page.js` can build a template or template part).

## Effort

Tier 1 is about 2 hours in total if the three investigations land where expected. Tier 2 is the real
body of work: the shop-journey group is a session on its own, checkout another, and the rest splits
into half-sessions by theme. Tier 3 is about an hour once CR1/CR9's shared cause is found. Tier 4 is
one sitting of roughly an hour for the lot.
