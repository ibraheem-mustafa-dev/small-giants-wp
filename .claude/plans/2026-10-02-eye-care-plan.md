---
doc_type: plan
plan_id: eye-care
project: small-giants-wp
spec_id: client build (Front F, D1149)
status: BUILD IN PROGRESS (2026-10-08)
---

# Eye Care Birmingham: the one plan

**Written for:** Bean, and any cold session picking up the Eye Care build.

**What this is.** Eye Care is the first client site built end to end on SGS by hand (D1149, Bean 2026-09-24):
- Every gap closes as a general framework setting with an editor control, never an Eye Care hardcode.
- Once finished, the site becomes the cloning pipeline's answer key (Phase 7).


- **Draft:** https://mintcream-lyrebird-224487.hostingersite.com/
  - Source: `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/`. `Eye Care Birmingham.dc.html` is the
    whole storefront; `Frame Card.dc.html` is the product card.
  - The older `design_handoff_ward_end_eye_care_v2/` is the clone pipeline's input, not the build's.
- **Test site:** https://darkcyan-grouse-898606.hostingersite.com
  - Credentials: `.claude/secrets/eye-care-test.env`.
  - Deploy target `eye-care-test`; its running build is recorded in `.claude/LEDGER.md` (blocks `ec51d6cf1` on 2026-10-08).
- **Client context:** `sites/eye-care-ward-end/CLAUDE.md`.

## Status

- Every surface is built and live on `eye-care-test`, each applied from its tree in `sites/eye-care-ward-end/build/`.
- The fix register (`plans/2026-10-02-eye-care-fix-register.md`) is the source of truth for fixes; its Sweep column was
  re-judged on the 2026-10-07 measure-only sweep.
- Route and per-surface work (Spec 47, `specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`) lives in
  `plans/2026-10-04-spec47-full-coverage.md` (Session D).
- Features and controls that change what the site can do live in `plans/2026-10-05-eye-care-functionality-backlog.md`.
- CR6 phase 2 (box longhands) has its own plan, `plans/archive/2026-10-07-cr6-box-longhand-migration.md`.

**Owed:**
- P0-6: rebuild the sandybrown pages 2742, 3405 and 3448 from their trees, then delete the 6 testimonial-slider
  entries in `plugins/sgs-blocks/scripts/oldshape-audit-baseline.json`.
- The canary's `sgs_block_defaults` option pins `transitionDuration` 300 (site data), which contradicts the saved-defaults
  channels in `.claude/rules/block-authoring.md`.
- CR6's live read extends to option-picker, hero, card-grid and product-card (the cr6 plan's "Extend the live script"
  box).

## Decisions (Bean's, still in force)

- **Build and verify:**
  - Build the real site by hand; every gap is a universal setting (D1149, 2026-09-24).
  - No separate test page: a setting is verified on the real page that uses it (2026-09-24).
- **Brand and products:**
  - Accent: taupe, from the snapshot palette; sage and navy are alternatives the client can switch to in Styles
    (2026-09-24).
  - The six shape glyphs are images, not icons (2026-09-24).
  - WooCommerce "coming soon" is off on the test site (2026-09-24).
  - Real frame sizes from jpopticians.com (2026-09-25).
  - Size row by universal band: S up to 52mm, M up to 57mm, then L. Show only the bands a frame comes in, each
    with its measurement (2026-09-28).
  - Colour swatches are each variation's own photo, with a tile as the fallback. Gather real colourway photos for
    one photographed frame (2026-09-28).
- **Prices:**
  - Whole-pound prices drop ".00" on every shop page: cards, product page, lens pop-up, bag ("£139"). Prices with
    pennies keep them. Emails and admin keep ".00". One Customizer switch, "Hide .00…" (2026-10-03, replacing the
    2026-09-25/27 rule that kept pennies on the product page, cart and checkout). WooCommerce's checkout total lines:
    register decision D4.
- **Product page and lenses:**
  - Product-page tabs: one editable starting layout, edited in the Site Editor (2026-09-25).
  - The prescription is the lens configurator's 4th question, per pair. Checkout shows each pair's choice and asks
    nothing again (2026-09-25).
  - A pre-selected default shows on the lens stage only once its question is reached (2026-09-26).
- **Motion:** entrance animations use the draft's exact values, as real controls (2026-09-28).
- **Mega panels:** keep all 40 brands and 12 shapes; the EASIEST tag stays inside its card (2026-09-28).
- **Payments:** a Stripe plugin (with Klarna and wallets) plus PayPal Payments, both in test mode until the owner's
  accounts exist (2026-09-26).
- **Home brand strip:** the draft's logos, not names. Brands with no products stay visible for the client preview
  (`brandHideEmpty: false`); auto-hide stays available for launch.
- **Header:**
  - Conform to the draft's tap sizes where that does no harm (44px is the house rule, now a setting, not a WCAG 2.1
    AA requirement).
  - The phone number's 1160px breakpoint stays (one Additional CSS rule in the snapshot).
  - The scrolled header is a reusable framework setting.
  - The burger has 2 bars.
- **SVG uploads:** SVG is accepted in the media library, sanitised.
- **Accepted differences, with their reasons in the walker configs:**
  - styles with frames in stock only;
  - text-muted #5E584F where the draft's greys are lighter;
  - the Spec 43 Continue model;
  - "No reviews yet" for the draft's made-up stars;
  - "Frame size 55" for "Size M";
  - Close keeps 44px;
  - no hover compared at phone widths.
- **2026-10-02:**
  - Review stars 2px apart: accepted.
  - The drawer stagger is NOT accepted: it is a foundational gap (phone drawer, below).
  - One test order on eye-care-test (test payment method, cancelled after the walk) to review the confirmation
    page.
- **Overtaken, recorded for Bean:** the 2026-09-25 bag plan said "live has a quantity box, keep it". The Eye Care
  header tree now sets `itemShowQty: false`, which matches the draft (no quantity box).


## Walker (the matching tool)

`scripts/parity/draft-live-walk.mjs`; method in `scripts/parity/GAP-CHECKLIST.md`; configs in
`sites/eye-care-ward-end/build/qa/parity/` (one per Eye Care surface); divergence ledger in
`sites/eye-care-ward-end/build/qa/divergences.json`. It compares what paints (computed styles, boxes, words, motion
samples, focus, links), so a draft effect made with a script and ours made with CSS are judged on the result. The
four shopping flows run as scripted tests from `scripts/parity/flows/` (Spec 47 §3.6 and §3.7).

## Surfaces

Each section: what is built, and what is open.

### Header (`sgs_header` 199, `build/header.tree.json`)
- **Built:** the draft's values (middle row, nav spacing, shrinking logo and wordmark, 2-bar burger, the bag pill's
  "0" bubble); the scrolled header as row settings; full-width header rows
  (`includes/sgs-header-rows-align-css.php::sgs_header_rows_align_css`); phone link hidden below 1160px; menu trigger
  icon then "Menu" at desktop and tablet, icon only at 375.
- **Open:**
  - confirm on the walk that the white space under the trust bar is gone (fixed in the tree);
  - the live ticker text is 14px against the draft's 12.5px.

### Mega menus (Sunglasses 165, Brands 176, Lenses 183, Help 186)
- **Built:** all four mapped to the draft (`build/qa/parity/mapping-*.md`); column widths and full-width panels;
  Lenses cards are each one link to /prescription-lenses/; Brands is a card grid with all 40 logos; panels are opaque
  by default.
- **Open:**
  - Sunglasses promo: an unproven report that `sgs/media` in a grid row stretches its figure to the row height. Check
    on the walk.
  - Mega links to the shop's filters: the links check proves where each one goes.
  - The same brand reaches two pages: mega Brands links go to `/shop/?brands=<slug>`, the home brand strip to
    `/brand/<slug>/`.

### Phone drawer (`sgs_drawer` 203, `build/mobile-menu.tree.json`)
- **Built:** Shop links as `sgs/button`s in an `sgs/container` (`<nav aria-label="Shop">`); icon-list links; phone
  box; Instagram, Google, WhatsApp and phone buttons with the draft's SVG logos (`iconSvg`); item stagger 50ms, 500ms,
  18px, including inside groups (`staggerInsideGroups`).
- **Open:** re-walk at `--widths 375 --states drawer-open`.

### Nav menu blocks (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`)
- **Built:** link minimum height and padding (`itemPadding`); the badge's text and box; burger bar thickness and
  burger-to-label gap; `triggerMode` per tier with `triggerIconPosition`; the mega body padding can be overridden.
- **Open (parked in LEDGER):** a nav-drawer-menu badge and a disabled item.

### Bag drawer (`sgs/cart` drawer in the header tree)
- **Built:** head row, scrolling item list and footer (subtotal, free-delivery line and bar, Checkout, note); item rows
  with the brand from the Store API (`includes/cart-item-extensions.php`); every value is a setting; the panel keeps
  its scope class when the nav store moves the `<dialog>` to `<body>`; Eye Care values match the draft, with no
  quantity box.
- **Open:**
  - **Bean decides:** the draft's "Add prescription lenses" link on a frame-only line (the drawer cannot yet tell that
    a product has a configurator).
  - **Bean decides:** retention for uploaded prescriptions, including uploads in bags that were never ordered.
  - The Klarna amount divides the cart total, where the draft divides subtotal plus shipping. The two agree at
    checkout.

### Footer (`sgs_footer` 182, `build/footer.tree.json`)
- **Built:** the active footer carrying the floating WhatsApp button; "© 2026 Eye Care Birmingham…" through
  `sgs/business-info` `copyrightPrefix`; condensed hours; the size guide modal lives once here (anchor `size-guide`,
  every page); both link lists are `sgs/icon-list`; column headings match the header nav's style. Walker config:
  `build/qa/parity/footer.mjs`.
- **Open:**
  - The draft is 425px tall against our 304px (about 104px top padding and 52px at the sides), with a gap between
    the wordmark and the tagline.
  - A full-width hairline on the bottom bar, with Privacy and Terms on the right.
  - `/privacy` and `/terms` return 404 on live (content, below).
  - Link underline, address, hours and social icons: owned by the sessions working on the link-underline helper and the
    icon-unification plan.

### Home (page 208, front page, `build/home.tree.json`)
- **Built:** the brand strip as a logo row in the draft's order; the prescription-strip photo as `sgs/media` with hover
  zoom; equal-height tiles and review arrows; "Why buy" divider lines from the container's `separators`; five parents
  stagger their blocks at 70ms.
- **Open:**
  - re-walk;
  - a real clinic photo (carried);
  - live has no Ken Burns and no translated parallax on the hero, and the draft's hero buttons fade in where ours are
    static.

### Shop (`archive-product` site template, `build/archive-product.tree.json`)
- **Built:** card motion (460ms, 26px, 70ms stagger, cap 7); the brand filter uses `?brands=`; Customizer settings for
  the filter column's gap under the header and the panel heading size.
- **Open:** re-walk with the new checks.

### Product page (`single-product` template 423, `build/single-product.tree.json`)
- **Built:** F1 to F12 live (size bands and "Which size am I?", small-caps pickers, 56px add to bag, stock line,
  "Save £… off RRP" badge, 732px gallery, variation photos as swatches, tab headings, empty related section hides,
  720px size guide pop-up); Details tab with 18 rows; description as plain lists; breadcrumb separator spacing;
  "Add my prescription · from +£59.00" opens the lens configurator.
- **Open:**
  - re-walk;
  - colourway photos (carried; a launch gate);
  - lens height and the Sizing tab's frame diagrams (carried; no data);
  - the reviews-present state;
  - the Klarna and wallets line (Phase 6);
  - the product sections have no scroll reveal on live; add to bag confirms with inline text where the draft shows a
    floating toast; live has one frame size where the draft shows S/M/L for the Gucci.

### Lens configurator (Choice Flow 463 in a fullscreen `sgs/modal`, Spec 43)
- **Built:** four questions (use, thickness, finish, "Your prescription": send later, upload or type it in); the
  add-on price list is the only price authority; one bag line per pair (the £268 path on product 71); uploads are
  private, with a staff download link.
- **Open:** four 2026-09-26 PROPOSED accepts to confirm on Bean's eye check:
  - the '?' glyph fades on hover;
  - its hover colour is #FAF8F5;
  - the 768 prescription cards run the description full width;
  - no clipped "POLARIS" label on the 375 stage thumbnail.

### Lenses (page 168, `/prescription-lenses/`)
- **Built:** the page, with divider lines from `separators` (`/lenses/` is a 404, as intended).
- **Open:** re-walk.

### About (page 187)
- **Built:** the page with the credentials column and `separators`.
- **Open:** re-walk; a real photo of Fatima (carried).

### Help (page 171)
- **Built:** the FAQ accordion (400 weight); "Call the clinic on {phone}…" as one `sgs/business-info` line; Call as an
  outline button to the phone.
- **Open:** re-walk.

### Contact (page 190)
- **Built:** the 2x2 labelled grid; the form on `sgs_form` 285 (a real submission returns the success message).
- **Open:** re-walk.

### Checkout (WooCommerce block checkout, `parts/sgs-checkout-content.html`)
- **Built:** UK only, with three methods (Tracked £3.95, Free over £75, Collect in Birmingham); County hidden for the
  UK; lens rows in the order summary; no second prescription step, by design.
- **Open:**
  - the look against the draft's express, contact, delivery, prescription and payment sections;
  - no payment gateway installed yet (Phase 6).

### Order confirmation
- **Open:** walk it with one test order (Bean 2026-10-02), then cancel the order.

## Carried items

- **Photos:**
  - Real colourway photos for one photographed frame (Gucci 76, Holbrook 81, Wayfarer 90, Round Metal 98). The brand
    shots on the test site must be replaced before launch.
  - Real photos of the clinic (Home) and of Fatima (About).
- **File splits owed:** `plugins/sgs-blocks/src/blocks/buybox/render.php` and
  `plugins/sgs-blocks/assets/js/animation-observer.js`.
- **Data-gated:** lens height and frame diagrams wait for frame-measurements data. `sgs/product-specs` was not needed
  (bindings do it).
- **Phase 6, launch readiness:** payment plugins in test mode, an accessibility audit, a performance audit, the
  full-site check, then Bean's eye.
- **Phase 7, the pipeline answer key:**
  - Record each finished page; clone the draft onto a test page; compare by rendered output.
  - The paused converter changes C1, C3, C4 and C5 resume there as the first cases.
  - C1: classless composite children get a role from their shape.
  - C3: plain `<li>` list items.
  - C4: a `<div>` of buttons stays buttons.
  - C5: route mapping (the draft's `/lenses` and `/sunglasses` routes must map to the real slugs).
  - Clone-run notes: `plans/archive/2026-09-24-eye-care-hand-build-design.md` section 7 and
    `plans/archive/2026-09-24-eye-care-findings-1-8-9-design.md`.

## Work plan

**Order.** Framework first (universal, and every client gains), then each surface's tree settings in build order
(header, phone drawer, nav menus, mega menus, bag, footer, home, shop, product and lens, then the content pages), then
content and data. Each tree change is applied with `scripts/wp-build-page.js` and re-walked. Any deploy that adds a
setting is followed by rebuilding every tree that uses it before measuring.

**Times.** Low estimates.

The work list is `plans/2026-10-02-eye-care-fix-register.md`: every fix, by surface in build order, each with its fix,
type and status. Bean's choices win over the draft where he chose (black link text with a sweep underline, 3px lift on
every button, live icon sizes).

**Build order:**
1. Spec 47 stage 3: Solve on every built surface with full coverage, in the order of Spec 47 §5 stage 3; each
   surface's state is in `plans/2026-10-04-spec47-full-coverage.md`.
2. Every framework repair and new setting in the register (S-fixes first), then one deploy, then rebuild every tree that
   uses a new setting.
3. The tree settings Solve could not write, surface by surface in the register's order, re-walking each surface after
   its trees are applied.
4. Content and data.

### Content and data

Listed in the register (Type "content"): Privacy and Terms pages, the Site Info address line break and copyright text,
menu URLs for the mega parents, the empty product spec rows, lens-height data, size labels without the box symbol,
shipping wording.

### Decisions for Bean

D1 to D9 in the register's "Decisions for you", each with a recommendation. Decided on 2026-10-03: keep the WhatsApp
prefill, keep the contact form's empty-submit messages, keep the checkout's coupon, notes and terms (each switchable),
and hide ".00" on whole-pound prices across the shop pages.
