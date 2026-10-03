---
doc_type: plan
plan_id: eye-care
project: small-giants-wp
spec_id: client build (Front F, D1149)
status: BUILD IN PROGRESS (2026-10-03)
---

# Eye Care Birmingham: the one plan

**Written for:** Bean, and any cold session picking up the Eye Care build.

**What this is.** Eye Care is the first client site built end to end on SGS by hand (D1149, Bean 2026-09-24):
- Every gap closes as a general framework setting with an editor control, never an Eye Care hardcode.
- Once finished, the site becomes the cloning pipeline's answer key (Phase 7).

This doc replaces six plans (now in `plans/archive/`):
- `2026-09-24-eye-care-hand-build-design.md`
- `2026-09-24-eye-care-findings-1-8-9-design.md`
- `2026-09-25-eye-care-product-page.md`
- `2026-09-25-eye-care-bag-checkout-prescription.md`
- `2026-09-28-eye-care-product-page-parity.md`
- `2026-10-01-eye-care-cloud-handover.md`

Every "built" line below was checked against the code or the live site on 2026-10-02 (three checkers, five
re-run by hand). The process for this review was `plans/archive/2026-10-01-eye-care-review-phase-plan.md` (done).

- **Draft:** https://mintcream-lyrebird-224487.hostingersite.com/
  - Source: `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/`. `Eye Care Birmingham.dc.html` is the
    whole storefront; `Frame Card.dc.html` is the product card.
  - The older `design_handoff_ward_end_eye_care_v2/` is the clone pipeline's input, not the build's.
- **Test site:** https://darkcyan-grouse-898606.hostingersite.com
  - Credentials: `.claude/secrets/eye-care-test.env`.
  - Deploy target `eye-care-test`, running 4ba8be0f1 (the same plugin build as `main` on 2026-10-03).
- **Client context:** `sites/eye-care-ward-end/CLAUDE.md`.

## Status

- Every surface is built and live, the footer included (`sgs_footer` 182), each applied from its tree in
  `sites/eye-care-ward-end/build/` with no invalid blocks. Step 0 is done: all 17 trees rebuilt on 2026-10-03, so the
  live header now has its 18px wordmark shrinking to 15px.
- The footer's layout values were written by Spec 47's Solve (2026-10-03, 47 setting writes; register 25-29 marked
  "Solve closed"). It still uses the banned `core/list` (register 30) and its framework items stay open.
- Every surface was re-walked on 2026-10-02 ("Review results").
- The walker was upgraded on 2026-10-02 before the walk (below, "Walker"), so the next walk measures more than any
  earlier one.
- Bean reviewed every surface and the register on 2026-10-03; all nine register decisions (D1-D9) are settled.
- The build is driven by the register (`plans/2026-10-02-eye-care-fix-register.md`) in the order of "Work plan" below.
  Spec 47 stage 3 (Solve on every other surface, `specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` §5) writes the surfaces'
  layout values first, and its Hardcode and Missing-setting rows feed the register's framework items.

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

## Walker (the matching tool), upgraded 2026-10-02

- **What it is.** `scripts/parity/draft-live-walk.mjs`, method in `scripts/parity/GAP-CHECKLIST.md`, configs in
  `sites/eye-care-ward-end/build/qa/parity/`.
- **How it compares.** It compares what paints (computed styles, boxes, words, motion samples), so a draft effect
  made with a script and ours made with CSS are judged on the result.
- **Added 2026-10-02 (sections 13-15):**
  - underlines, text shadow, rest-state transforms, outlines, left/right border colours and icon colours;
  - a keyboard focus pass;
  - a links check (dead `#` links, broken targets, the draft's real tel/WhatsApp/social links, and a per-config
    `links` table of where each label must go);
  - load entrances sampled by paint;
  - a reveal sweep before full-page shots.
- **Configs:** every Eye Care surface has a filled config (header scrolled state, toast and count pop, hero motion,
  product states, shop filter states, image hovers, reveal sections), 2026-10-02.
- **Added 2026-10-03 (section 16):** ref tracing (`refPrefix`: each row names its layout node and element) and the
  divergence ledger (`sites/eye-care-ward-end/build/qa/divergences.json`). Benchmark 5 of 5, 0 noise rows.
- **Next upgrades:** Spec 47 FR-47-6 items 1-5 (overlays drawn as pseudo-elements, 1920 in every run, states on every
  interactive element, link coverage, line counts during transitions) and FR-47-7 (shopping flows as scripted tests). Bean's review found the misses that motivate each (register "Walker
  improvements").

## Surfaces

Each section: what is built (checked), what is open, and a Review heading that the walk and classification fill.

### Header (`sgs_header` 199, `build/header.tree.json`)
- **Built:**
  - the draft's values: middle row 20/28px at 1440 wide, nav links 24px apart, logo 48px shrinking to 40px, wordmark
    18px shrinking to 15px, 2-bar burger, the bag pill's "0" bubble;
  - the scrolled header as row settings (padding when shrunk, speed, curve);
  - the logo group never wraps;
  - phone link hidden below 1160px;
  - menu trigger icon then "Menu" at desktop and tablet, icon only at 375.
- **Fixed 2026-10-02 (acc2a3b6d, live on eye-care-test and the canary):** the header row had collapsed to 56px
  wide at every width, the logo, nav and phone stacked over each other. The header outer is a column flex
  container; a row with a width cap carries centring auto margins, which cancel the stretch, and its
  `container-type: inline-size` leaves it no content width. Rows are now full width at zero specificity
  (`includes/sgs-header-rows-align-css.php::sgs_header_rows_align_css`). Any client with a capped header row had it.
- **Open:** confirm on the walk that the white space under the trust bar is gone (fixed in the tree).
- **Found while writing the configs (classified in step 7):** the live ticker text is 14px against 12.5px.
- **Review:** see "Review results" below.

### Mega menus (Sunglasses 165, Brands 176, Lenses 183, Help 186)
- **Built:**
  - all four mapped to the draft (`build/qa/parity/mapping-*.md`);
  - the £ sign fixed;
  - column widths and full-width panels;
  - Lenses cards are each one link to /prescription-lenses/;
  - Brands is a card grid with all 40 logos (Ferrari: attachment 625);
  - panels are opaque by default.
- **Open:**
  - Sunglasses promo: an unproven report that `sgs/media` in a grid row stretches its figure to the row height.
    Check on the walk.
  - Mega links to the shop's filters: the new links check proves where each one goes.
  - The same brand reaches two pages: mega Brands links go to `/shop/?brands=<slug>`, the home brand strip to
    `/brand/<slug>/` (both confirmed on live 2026-10-02).
- **Review:** see "Review results" below.

### Phone drawer (`sgs_drawer` 203, `build/mobile-menu.tree.json`)
- **Built:**
  - Shop links (Sunglasses, Brands, Prescription lenses, Glasses with "SOON") as `sgs/button`s in an `sgs/container`
    (`<nav aria-label="Shop">`);
  - icon-list links;
  - phone box;
  - Instagram, Google, WhatsApp and phone buttons with the draft's SVG logos (`iconSvg`);
  - item stagger 50ms, 500ms, 18px.
- **Open, foundational gap: nested stagger.**
  - The drawer staggers only `sgs/nav-drawer-menu` top-level items. Every other body child arrives at
    `--sgs-nd-last-i` (0 here), so the four Shop links arrive together. The draft staggers each:
    .05/.1/.15/.2s, then .3s and .36s.
  - Fix: a CSS-only `sgs/nav-drawer` setting, "Stagger items inside groups" (default off).
  - Each body group's children get `--sgs-i` = the group's offset + `sibling-index() - 1`, with the existing
    nth-child ladder as the fallback. Siblings after a group start after its last item, through the existing
    `--sgs-nd-last-i` `:has()` ladder.
  - The in-animation fill becomes `backwards`, so a link still fading in is never an invisible focus target.
  - Files: `nav-drawer/block.json` and its inspector, `includes/helpers-nav-drawer-motion.php`, the stagger section
    of `nav-drawer-menu/style.css`, and `tests/php/run-u5-motion-standalone.php`. Then the tree toggle, rebuild, and
    re-walk the header at `--widths 375 --states drawer-open`.
  - Research: `~/.claude/memory/research/2026-10-02-nested-drawer-stagger.md`.
- **Review:** see "Review results" below.

### Nav menu blocks (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`)
- **Built:**
  - link minimum height and link padding (`itemPadding`);
  - the badge's text and box;
  - burger bar thickness and the burger-to-label gap;
  - `triggerMode` per tier with `triggerIconPosition`;
  - the mega body padding can be overridden.
- **Open (parked in LEDGER):** a nav-drawer-menu badge and a disabled item.
- **Review:** see "Review results" below.

### Bag drawer (`sgs/cart` drawer in the header tree)
- **Built:**
  - Three bands: the head row, a scrolling item list, and a footer with the subtotal, the free-delivery line and
    bar, Checkout, then a note.
  - Item rows: square image; the brand (Store API `items[].extensions.sgs.brand`, `includes/cart-item-brand.php`)
    with the line price; the name; the details; Remove as a text link.
  - Every value is a setting: 168 `sgs/cart` attributes in all.
  - The panel keeps its scope class when the nav store moves the `<dialog>` to `<body>`.
  - Eye Care values:
    - 460px cream panel, "Bag (0)" in Playfair 22px;
    - "Nothing in here yet." above "SHOP SUNGLASSES";
    - free delivery at £75 with a 2px bar;
    - 54px Checkout and the Klarna note;
    - the 400ms slide-in and a 45% backdrop;
    - no quantity box, as the draft.
- **Open:**
  - **Bean decides:** the draft's "Add prescription lenses" link on a frame-only line (the drawer cannot yet tell
    that a product has a configurator).
  - **Bean decides:** retention for uploaded prescriptions, including uploads in bags that were never ordered.
  - The Klarna amount divides the cart total, where the draft divides subtotal plus shipping. The two agree at
    checkout.
- **Review:** see "Review results" below.

### Footer (`sgs_footer` 182, `build/footer.tree.json`)
- **Built:**
  - the active footer, carrying the floating WhatsApp button;
  - "© 2026 Eye Care Birmingham…" through `sgs/business-info` `copyrightPrefix`;
  - condensed hours;
  - the size guide modal lives once here (anchor `size-guide`, every page).
- **Open, improving it to match the draft:**
  - Replace `core/list` (banned) with SGS blocks.
  - The draft is 425px tall against our 304px: about 104px top padding and 52px at the sides.
  - Column headings in small grey Outfit capitals.
  - Links about 31px apart.
  - A gap between the wordmark and the tagline.
  - "About Eye Care" with no underline (the draft has none; ours is underlined).
  - The address on two lines and the hours on one grey line.
  - Social boxes 40px with a grey border and brand-coloured icons, in the order Instagram, Google, WhatsApp
    (`sgs/social-icons` fixes the order when its source is Site Info: a small setting).
  - A full-width hairline on the bottom bar, with Privacy and Terms on the right.
- **Walker config:** `build/qa/parity/footer.mjs` (new 2026-10-02, 32 pairs).
- **Found by the config's first run:**
  - `/privacy` and `/terms` return 404 on live;
  - the draft's address links to Google Maps, where live's is plain text;
  - the Google social link's label differs from the draft's ("Read our reviews on Google" against "Google
    Business profile").
- **Review:** see "Review results" below.

### Home (page 208, front page, `build/home.tree.json`)
- **Built:**
  - four parity rounds (3,003 open rows down to 586 at the last cloud walk);
  - the brand strip as a logo row in the draft's order;
  - the prescription-strip photo as `sgs/media` with hover zoom;
  - equal-height tiles and review arrows;
  - "Why buy" divider lines from the container's `separators`;
  - five parents stagger their blocks at 70ms.
- **Open:**
  - re-walk;
  - a real clinic photo (carried).
- **Found while writing the configs:**
  - live has no Ken Burns and no translated parallax on the hero;
  - the draft's hero buttons fade in, ours are static;
  - "Message me on WhatsApp" adds a `?text=` prefill the draft does not have (also about, contact, lens).
- **Review:** see "Review results" below.

### Shop (`archive-product` site template, `build/archive-product.tree.json`)
- **Built:**
  - the walker exited 0 on 2026-09-28;
  - the motion batch is deployed: cards at 460ms, 26px, 70ms stagger, cap 7;
  - the brand filter uses `?brands=`;
  - Customizer settings for the filter column's gap under the header and the panel heading size.
- **Open:** re-walk with the new checks.
- **Review:** see "Review results" below.

### Product page (`single-product` template 423, `build/single-product.tree.json`)
- **Built:**
  - F1 to F12, all live:
    - size bands and "Which size am I?" at the right of the Size label;
    - picker labels in small capitals with the chosen value;
    - add to bag in capitals, 56px;
    - the stock line under a hairline;
    - the "Save £… off RRP" badge on the photo;
    - a 732px gallery;
    - the price line height;
    - variation photos as swatches;
    - tab headings;
    - an empty related section hides;
    - the size guide pop-up 720px.
  - Details tab: 18 rows.
  - Description as plain lists.
  - Breadcrumb separator spacing.
  - "Add my prescription · from +£59.00" opens the lens configurator.
- **Open:**
  - re-walk;
  - colourway photos (carried; a launch gate);
  - lens height and the Sizing tab's frame diagrams (carried; no data);
  - the reviews-present state;
  - the Klarna and wallets line (Phase 6).
- **Found while writing the configs:**
  - the product sections have no scroll reveal on live;
  - add to bag confirms with inline text where the draft shows a floating toast;
  - live has one frame size where the draft shows S/M/L for the Gucci.
- **Review:** see "Review results" below.

### Lens configurator (Choice Flow 463 in a fullscreen `sgs/modal`, Spec 43)
- **Built:**
  - Four questions (use, thickness, finish, "Your prescription": send later, upload or type it in).
  - The add-on price list is the only price authority.
  - One bag line per pair (the £268 path on product 71).
  - Uploads are private, with a staff download link.
  - Walker exit 0 on 2026-09-28.
- **Open:** four 2026-09-26 PROPOSED accepts to confirm on Bean's eye check:
  - the '?' glyph fades on hover;
  - its hover colour is #FAF8F5;
  - the 768 prescription cards run the description full width;
  - no clipped "POLARIS" label on the 375 stage thumbnail.
- **Review:** see "Review results" below.

### Lenses (page 168, `/prescription-lenses/`)
- **Built:** the page, with divider lines from `separators` (`/lenses/` is a 404, as intended).
- **Open:** re-walk.
- **Review:** see "Review results" below.

### About (page 187)
- **Built:** the page with the credentials column and `separators`.
- **Open:**
  - re-walk;
  - a real photo of Fatima (carried).
- **Review:** see "Review results" below.

### Help (page 171)
- **Built:**
  - the FAQ accordion (400 weight);
  - "Call the clinic on {phone}…" as one `sgs/business-info` line;
  - Call as an outline button to the phone.
- **Open:** re-walk.
- **Review:** see "Review results" below.

### Contact (page 190)
- **Built:**
  - the 2x2 labelled grid;
  - the form on `sgs_form` 285 (a real submission returns the success message).
- **Open:** re-walk.
- **Review:** see "Review results" below.

### Checkout (WooCommerce block checkout, `parts/sgs-checkout-content.html`)
- **Built:**
  - UK only, with three methods: Tracked £3.95, Free over £75, Collect in Birmingham;
  - County hidden for the UK;
  - lens rows in the order summary;
  - no second prescription step, by design.
- **Open:**
  - the look against the draft's express, contact, delivery, prescription and payment sections;
  - no payment gateway installed yet (Phase 6).
- **Review:** see "Review results" below.

### Order confirmation
- **Open:** walk it with one test order (Bean 2026-10-02), then cancel the order.
- **Review:** see "Review results" below.

## Carried items (not this review's work; the work plan schedules them)

- **Photos:**
  - Real colourway photos for one photographed frame (Gucci 76, Holbrook 81, Wayfarer 90, Round Metal 98). The brand
    shots on the test site must be replaced before launch.
  - Real photos of the clinic (Home) and of Fatima (About).
- **File splits owed:** `plugins/sgs-blocks/src/blocks/buybox/render.php` (1,430 lines) and
  `plugins/sgs-blocks/assets/js/animation-observer.js` (602 lines).
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

## Review results (walked 2026-10-02 with the upgraded walker)

- **The walks.** Every surface was walked at 375, 768 and 1440 (the header as three runs: megas, drawer, resting
  and scrolled). The confirmation page was walked on a test order (652, cancelled after the walk). 1920 shots are in
  `build/qa/parity/out-1920/`.
- **The reports.** `build/qa/parity/out/<surface>/report.md` (gitignored). No surface logged a live console error.
- **The classification.** Open rows were de-duplicated (14,400 raw rows, 3,263 unique), then classified by six Sonnet
  agents.
- **The QC (QA Gate 2).**
  - Every foundational gap was checked against the code.
  - Five random same-paint accepts were re-judged: four held, and one moved to violation (the bag Close "×" stroke
    is visibly thinner on live).
  - Three classifier calls were corrected:
    - The Help accordion's 140 rows are a repair, not a missing control. The block declares `fontSize`, `padding`
      and `gap`, but `accordion/style.css` hardcodes the header's size, padding and gap, and `render.php` never
      emits them.
    - The product gallery zoom is an opt-in of the shared hover-effects image zoom, not a new control.
    - The Brands mega tiles show a 32px logo *and* the name and frame count in the draft
      (`build/qa/parity/mapping-mega-brands-lenses.md`). Live hides the name and count, so the fix keeps the logos.
- **Bean's eye check (step 6):** the 4-width sheets (59 pages) were sent on 2026-10-02. Bean's own list (2026-10-03,
  about 60 new points) is merged into the register.

| Surface | Report | Open rows | Unique | Accepted (decided / blind / same paint) | Violations | Foundational | Jitter |
|---|---|---|---|---|---|---|---|
| Header: megas | `out/header-megas` | 284 | 275 | 102 (0/1/101) | 171 | 2 | 0 |
| Header: phone drawer | `out/header-drawer` | 59 | 59 | 48 (4/1/43) | 5 | 6 | 0 |
| Header: resting and scrolled | `out/header-resting` | 58 | 53 | 37 (0/0/37) | 11 | 5 | 0 |
| Footer | `out/footer` | 782 | 372 | 153 (21/0/132) | 197 | 22 | 0 |
| Bag drawer | `out/bag` | 469 | 147 | 107 (12/5/90) | 24 | 16 | 0 |
| Home | `out/home` | 869 | 192 | 164 (22/3/139) | 17 | 11 | 0 |
| Shop | `out/shop` | 308 | 100 | 81 (6/18/57) | 19 | 0 | 0 |
| Product | `out/product` | 5,466 | 735 | 206 (118/4/84) | 401 | 128 | 0 |
| Lens pop-up | `out/lens` | 132 | 21 | 6 (0/1/5) | 15 | 0 | 0 |
| Lenses | `out/lenses` | 303 | 101 | 26 (0/5/21) | 75 | 0 | 0 |
| About | `out/about` | 523 | 136 | 59 (0/0/59) | 74 | 3 | 0 |
| Help | `out/help` | 1,178 | 298 | 56 (0/6/50) | 90 | 140 | 12 |
| Contact | `out/contact` | 2,010 | 291 | 87 (5/47/35) | 165 | 35 | 4 |
| Checkout | `out/checkout` | 1,903 | 449 | 57 (22/20/15) | 54 | 338 | 0 |
| Confirmation | `out/confirmation` | 98 | 34 | 4 (0/0/4) | 30 | 0 | 0 |

Each row's classes sum to its unique count. Most violations are "moved" knock-on rows filed under the one cause that
shifts the layout, so the cause lists below are short.

## Work plan

**Order.** Framework first (universal, and every client gains), then each surface's tree settings in build order
(header, phone drawer, nav menus, mega menus, bag, footer, home, shop, product and lens, then the content pages),
then content and data. Each tree change is applied with `scripts/wp-build-page.js` and re-walked. Any deploy that
adds a setting is followed by rebuilding every tree that uses it before measuring.

**Times.** Low estimates.

### 1-2. The items: `plans/2026-10-02-eye-care-fix-register.md`

The register is the work list. It holds every fix, by surface in build order, each with its fix, type and status.
- **How it was made:**
  - **Version 1 (2026-10-02):** the walker's classified causes, re-verified against code, trees and screenshots.
  - **Version 2 (2026-10-03):** merges Bean's review of version 1 (about 60 new points and a ruling on every item). Each
    cause was re-traced by six investigators, three of them testing live, then QC-councilled (structure, rules,
    coverage).
- **What changed in version 2:**
  - Twelve site-wide fixes (S1 to S12) replace many per-item fixes: button hover, link hover, phone hover, WhatsApp,
    accordion, page padding, reviews, pennies, brand logos, stretched links, custom gaps, focus underline.
  - Bean's choices win over the draft where he chose (black link text with a sweep underline, 3px lift on every
    button, live icon sizes).
  - New proven bugs:
    - the add-to-bag route drops a second product, and a 30s cooldown blocks a second pair;
    - the gallery ignores WooCommerce's own product gallery;
    - the shop filters leave empty groups behind after a filter is cleared;
    - the hero's vertical position writes to the wrong axis;
    - the phone drawer body overflows by its title-row height.
  - Step 0: the live header is older than `header.tree.json`, so every tree is rebuilt before any item is judged.

**Build order:**
1. Step 0: rebuild every tree from its current file. Done 2026-10-03.
2. Spec 47 stage 3: Solve on every built surface (the footer is done).
3. Every framework repair and new setting in the register (S-fixes first), then one deploy, then rebuild every tree that
   uses a new setting.
4. The tree settings Solve could not write, surface by surface in the register's order, re-walking each surface after
   its trees are applied.
5. Content and data.

### 3. Content and data

Listed in the register (Type "content"): Privacy and Terms pages, the Site Info address line break and copyright text,
menu URLs for the mega parents, the empty product spec rows, lens-height data, size labels without the box symbol,
shipping wording.

### 4. Decisions for Bean

D1 to D9 in the register's "Decisions for you", each with a recommendation. Decided on 2026-10-03: keep the
WhatsApp prefill, keep the contact form's empty-submit messages, keep the checkout's coupon, notes and terms (each
switchable), and hide ".00" on whole-pound prices across the shop pages (this replaces the 2026-09-25/27 rule that
the product page, cart and checkout always show pennies).

### 5. Carried (unchanged)

See "Carried items" above.
