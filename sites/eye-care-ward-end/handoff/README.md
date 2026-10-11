# Handoff: Ward End Eye Care — designer eyewear shop

## Overview

A storefront for Ward End Eye Care, trading on the site as **Eye Care Birmingham**: an independent optician's clinic at 644 Washwood Heath Rd, Birmingham B8 2HQ, run by optometrist Fatima Nawaz (BSc (Hons) Optometry, MCOptom). It sells designer sunglasses below RRP, glazes prescription lenses in-house, offers local collection with free fitting, and uses WhatsApp as the main support channel.

The commercial position drives the design. The shop competes with discount marketplaces (cheap but untrusted) and national chains (trusted but impersonal). Every trust signal is load-bearing: the named optician, real Google reviews, RRP beside the price, warranty, returns. Don't drop them for visual tidiness.

## About the design files

The files in this folder are **design references built in HTML**: prototypes of the intended look and behaviour, not production code. The task is to **recreate them in the target codebase**: the SGS WordPress framework in `ibraheem-mustafa-dev/small-giants-wp` (sgs-theme + sgs-blocks on WooCommerce), using its blocks, templates, template parts and theme.json tokens. Don't port the HTML.

Don't carry across:
- inline styles (map them onto `tokens/` and theme.json);
- the `page` state string standing in for routing;
- the in-memory catalogue, filters, bag and checkout;
- the demo account data and the prototype-only reset link (see "Accounts").

`READING-DC-FILES.md` explains how to read and run the `.dc.html` drafts. `animations.json` and `surfaces.json` inventory every effect and every interactive state, with template ids you can match to the rendered DOM.

## Fidelity

**High fidelity.** Colours, type, spacing, copy and interaction detail are final and should be matched closely. All visible text is signed-off content, not lorem. Imagery is the one unfinished area (Unsplash placeholders and "Photo to come" tiles).

## Routes

The prototype has no URL router: `go(page)` sets `state.page` and scrolls to the top. Production routes come from the manifest block at the top of `Eye Care Birmingham.dc.html` (`<script type="application/json" data-sgs-manifest>`).

| state.page | Page | Route | WordPress |
|---|---|---|---|
| home | Home | `/` | static front page `home` |
| shop | Shop | `/sunglasses` | product archive; filters and sort serialise to query params |
| product | Product | `/frames/{product-slug}` | single product |
| lenses | Lenses | `/lenses` | page `prescription-lenses` |
| about | About | `/about` | page |
| help | Help (FAQs, delivery, returns) | `/help` | page |
| contact | Contact | `/contact` | page |
| checkout | Checkout | `/checkout` | WooCommerce checkout |
| done | Order confirmed | `/order/{id}` | `order-received` |
| signin | Sign in / register, forgotten password | `/my-account` (signed out), `/my-account/lost-password` | WooCommerce My account, signed-out view |
| account | My account | `/my-account/{endpoint}`: `orders`, `view-order/{id}`, `subscriptions`, `edit-address`, `wishlist`, `edit-account` | WooCommerce My account endpoints (+ WooCommerce Subscriptions, custom wishlist endpoint) |

Overlays are not routes: mega menu, mobile menu, bag drawer, filter drawer, size guide modal, lens configurator modal, toast.

## Breakpoints

Measured on the storefront's own container width (`state.w`, via ResizeObserver and a polling fallback), not the viewport.

- **mobile** < 768 · **tablet** 768–1023 · **desktop** ≥ 1024 (layout flags `mobile`, `tablet`, `desktop`; `belowDesktop` = mobile or tablet).
- **620**: lens option cards go from two columns to one.
- **1060**: below it the header nav collapses to a Menu button and the shop filter rail becomes a full-screen drawer. The SGS shop filters hard-code 782; move that to 1060.
- **1100**: lens configurator aside padding and column ratio step down.
- **1160**: the clinic phone number shows in the header.
- **1280**: product grids go from three to four columns.

## Layout and chrome

- **Trust ticker** (`sgs-trust-ticker`): black bar, 12.5px text, four claims with taupe line icons. At ≥ 768 it shows as many claims as fit on one line and drops the rest (never wraps). Below 768 it becomes a 30s marquee that pauses on hover.
- **Header** (`sgs-header`): sticky, `rgba(250,248,245,.9)` with 16px backdrop blur and a hairline bottom border. Three columns: nav left (Sunglasses, Brands, Lenses, "Glasses SOON"), logo mark + "EYE CARE / BIRMINGHAM" wordmark centred, then phone (≥ 1160), About Eye Care, Help, the account icon (person line icon, 44px round hit area, `#EFEAE2` on hover, a small taupe dot when signed in) and a pill Bag button with a taupe count badge on the right. Below 768 the account icon stays, the Bag word becomes a bag line icon with the count overlapping the pill's corner, and the header gap drops to 8px so all three fit at 375px. After 40px of scroll it shrinks: padding 20px 28px → 10px 24px, logo 48×22 → 40×18, wordmark 18px → 15px, all .35s.
- **Mega menu** (`sgs-mega-menu`, desktop only): white panel under the header, fades in .2s. Panels: Sunglasses (by style, shop by, image), Brands (top brands with counts + A–Z of all 40), Lenses (four lens promos), Help. Opens on hover or keyboard focus after 150ms (leaving the link first cancels; instant when moving between panels). On touch devices (`hover: none`) the first tap opens the panel instead of following the link. Brands toggles on click everywhere. Closes on Escape, a click outside the header, the pointer leaving the header, entering About / the phone link / "Glasses", picking an item, or navigating.
- **Mobile menu** (`sgs-mobile-menu`, < 1060): full-screen paper overlay. Large Playfair links stagger in (rise .5s, delays .05–.36s), then About, Delivery/returns/FAQs, Size guide, Contact, phone card and Instagram / Google / WhatsApp buttons. The page behind doesn't scroll while it is open.
- **Footer** (`sgs-footer`): wordmark, one-line description, three icon buttons (Instagram, Google, WhatsApp; each gets its brand-colour border on hover). Columns: Shop (Sunglasses, All brands, Prescription lenses, "Glasses — arriving soon"), Help (Delivery & returns, FAQs, Size guide, Contact), Visit or call (About, phone, address linking to Maps, Mon–Sat 9.30–17.30). Bottom bar: "© 2026 Eye Care Birmingham · GOC-registered · All brand names are trademarks of their owners", Privacy, Terms.
- **WhatsApp button** (`sgs-whatsapp-fab`): fixed bottom right, #25D366 pill, 52px tall, "Ask me anything" (icon only below 768), lifts 3px on hover.

## Screens

- **Home**: full-height hero (min(84vh, 820px); 82vh on mobile) with photo, dark scrim, kicker, H1 "The same designer shades…", intro and two buttons. The copy rises in with staggered delays, the photo settles from scale 1.08 (3s) and moves with a scroll parallax. Then the brand marquee (64s loop, pauses on hover), best sellers (eight Frame Cards), "Why buy here" (four numbered reasons), shop by shape (six tiles), Google reviews panel, about strip and the optician section.
- **Shop**: kicker + title (brand or shape name when one is filtered), result count, sort select, active filter chips, sticky 270px filter rail with ten collapsible groups (Gender, Size, Colour, Price, Brand with search, Style, Material, Frame type, Hinge, Nose pads) and a polarised toggle, then the product grid. Below 1060 the rail opens as a full-screen drawer that behaves like the mobile menu: fades in (.3s), × top right, page scroll locked, sticky footer with "Clear" and "Show N frames". No results shows "Nothing matches all of that." with Clear filters.
- **Product**: breadcrumb; gallery (main image + four thumbnails, faked with CSS filters on one photo); buy box (brand, name, code, rating, price with RRP and saving, "Or 3 payments of … with Klarna" line, colour tiles, S/M/L sizes with measurements, size guide link, stock line, "Add my prescription" and "Add to bag as they are", WhatsApp advice card, three assurances); tabs (Description / Details / Sizing with the measurement diagram); four-question accordion; reviews **or** the Google "no reviews yet" strip when the product has none (the launch default); "More from {brand}"; similar shapes.
- **Lenses**: explains the lens options and prices and opens the lens configurator.
- **About**: Fatima Nawaz, qualifications, how the clinic works, WhatsApp and shop buttons.
- **Help**: delivery / collection / returns cells, eight FAQs (one open at a time, first open by default), "Still not answered?" band.
- **Contact**: WhatsApp button, phone, email, clinic address, hours, contact form, sketch map (replace with an embedded Google map) and Google / Instagram cards.
- **Checkout**: express pay row (Apple Pay, G Pay, PayPal, Klarna), 1 Contact (with an unticked "Create an account" checkbox for guests that reveals a password field, and "Already have an account? Sign in", which returns to checkout; signed-in customers see "Signed in as …" and get their email, mobile and delivery address prefilled), 2 Delivery (post it to me, with address fields, or collect in Birmingham), 3 Prescription (only when the bag has lenses: upload / type it in / send later), then Payment (step 3 or 4), and the order summary.
- **Order confirmed**: tick, "Thank you — order EC-10482." (hard-coded), copy that differs for collection and delivery, Back to the shop. If the customer is signed in or just created an account, a line pointing to My account and a "View my orders" button.
- **Sign in / register**: kicker, H1 "Sign in or create an account", a line saying checkout works as a guest, then two hairline-grid cells: Sign in (email, password, Keep me signed in, Forgotten your password?, ink Sign in button) and New here? (first name, email, password of 8+, outline Create account button). Stacked below 1024. A taupe-soft notice bar appears above them after a password reset or when arriving from checkout.
- **Forgotten password**: one 480px column per step. Reset your password (email, Send reset link) → Check your email (address echoed, one-hour expiry, junk-folder hint, Back to sign in) → Choose a new password (twice; "Those two don't match." in `#A33A2B`) → back to sign in with "Password changed". The prototype reaches step 3 through a link marked "Prototype only"; production reaches it from the emailed link.
- **My account**: kicker, H1 "Hello, {first}", "Signed in as {email}". A 220px side nav at ≥ 1024 (hairline left rule, 2px ink inset line on the active item) or a horizontal scrolling tab row below (2px underline, scrollbar hidden): Orders, Subscriptions, Addresses, Wishlist (with counts), Account details, Sign out. Tab content fades in.
  - **Orders**: hairline-grid rows (number and date, items, status pill, total, chevron); pill taupe-soft while in progress, green `#E9F4EC` / `#1B7F43` when delivered or collected. Empty state "No orders yet." with Shop sunglasses.
  - **Order detail**: All orders back link, number, date and method, status pill, a progress bar of steps (Order placed → Prescription checked → Lenses being made → Posted → Delivered; collection orders end Ready to collect → Collected; frame-only orders skip the lens steps; below 768 the steps stack vertically with a short bar beside each label), items as in the checkout summary, address / payment / totals cells, and a WhatsApp card quoting the order number.
  - **Subscriptions**: one card per subscription: name, status pill, description, price and frequency; next delivery date; How often select (every 1, 2, 3 or 6 months); Skip next delivery (moves the date on, with an Undo), Pause / Resume, and a quiet Cancel subscription link that opens an inline confirmation (Yes, cancel it / Keep it). Cancelled cards show the last delivery and Start it again.
  - **Addresses**: delivery and billing cards; Edit / Add swaps the card for an inline form (first, last, address, line 2, town, postcode; Save address / Cancel). Billing reads "Same as delivery address" until one is saved.
  - **Wishlist**: the hearted frames as Frame Cards (two-up on mobile, three-up above), count, and an empty state with Shop sunglasses.
  - **Account details**: name, email, mobile ("For WhatsApp updates on your orders"), then Change password (current, new, again; blank keeps it), Save changes, and a green "Saved."

### Overlays

- **Bag drawer** (`sgs-bag-drawer`): 460px panel slides in from the right (.4s) over a 45% ink backdrop. Items show frame-only or the lens summary, with "Add lenses" and Remove; free-delivery progress bar to £75; subtotal, Klarna line and Checkout.
- **Lens configurator** (`sgs-lens-configurator`): full-screen modal. Aside with the frame preview (tinted by the chosen finish), running price lines and the total. Steps: 1 What they're for (Distance / Reading / Varifocal / No prescription; "No prescription" adds the frame and closes), 2 How thin, 3 Finish, 4 Your prescription (Send it later is the default, Upload a photo, Type it in with six SPH/CYL/AXIS fields). Each option has a "?" help panel. Progress bar across the top.
- **Size guide** (`sgs-size-guide`): centred modal that zooms in, explaining the numbers on the arm, with a WhatsApp card.
- **Toast** (`sgs-toast`): bottom-centre ink pill, "Added to bag" or "Added with prescription lenses", with View bag; disappears after 3.3s.

## Forms

- **Contact**: name (required), email (required, type=email), phone (optional), topic select (What can I help with? / Choosing a frame / Prescription lenses / An order I've placed / Booking an eye test / Something else), message. Only the browser's required and email checks run; submit shows "Thanks — I'll come back to you shortly." and sends nothing.
- **Checkout**: email, mobile, then first name, last name, address, town, postcode (delivery only), prescription mode, card number, MM/YY, CVC. No validation or payment in the prototype.
- **Lens prescription**: file input (image/*, .pdf) with no handler, or six typed fields with no validation.
- **Sign in**: email (required, type=email), password (required). **Register**: first name, email, password (required, minLength 8). **Forgotten password**: email; then new password twice (minLength 8, must match). **Addresses**: first, last, address, town, postcode required; line 2 optional. **Account details**: first name and email required. **Checkout**: optional Create an account checkbox and password (minLength 8). All use the browser's checks only; nothing is sent.

## State (prototype)

`page`, `w`, `scrolled`, `menuOpen`, `mega`, `bagOpen`, `bag` (`{pid, size, lens}`), `toast`/`toastKey`, `curId`, `curImg`, `curSwatch`, `curSize`, `pdpTab`, `acc`, `f` (filters and sort), `filtersOpen`, `fgOpen`, `favs`, `modal`, `lens` (`open, step, use, thick, finish, rxMode, rx, help, fromBag`), `co` (`method, rxMode, account, email`), `faqOpen`, `contactSent`, and for accounts `user`, `auth` (`view, email, note, mismatch, returnTo`), `acct` (`tab, orderId, editAddr, saved`), `addr`, `subs`, `subConfirm`, `placed`, `lastOrder`. `surfaces.json` gives the `setState` call that reaches every state.

## Animations and interactions

All motion is CSS keyframes, CSS transitions and a setTimeout-stepped JS reveal. There are no Web Animations calls. The full inventory is `animations.json`: 213 records, reconciled against 0 `.animate(` sites, 97 transition declarations, 91 `style-hover` rules, 90 `animation:` declarations and 17 JS style writers. `surfaces.json` has 52 surfaces covering 11 routes and 80 toggling `sc-if`s.

- Easing everywhere: `cubic-bezier(.2,.7,.2,1)`. Hovers are .2–.35s.
- Buttons lift 2–3px and darken; cards lift 4px with a soft shadow and the photo zooms to 1.06 (.9s); option tiles lift 3px.
- Scroll reveal (21 `data-reveal` elements on Home, Shop, Product and Lenses): fade and rise 26px over 460ms with ease-out cubic, 70ms stagger between siblings (capped at 7), once only. Content only shows without the tween when the browser has no IntersectionObserver or the visitor prefers reduced motion; there is no timer.
- Page intros use the `rise` keyframe (18px, .5–1s, staggered delays); overlays use `fade`; the bag uses `slideL`; the size guide and gallery use `zoomIn`; counters use `pop`.
- Hero parallax: the image wrapper moves at 0.18 × scrollY.
- Reduced motion follows the visitor's browser setting only; there is no on-site switch. An `@media (prefers-reduced-motion: reduce)` rule cuts CSS animation and transition durations to .01ms, and the JS reads the same query: the scroll reveal shows content at once, the hero parallax stays still, and the review arrows jump instead of smooth-scrolling.
- Page scroll is locked (`overflow:hidden` on `<html>`) while the mobile menu, filter drawer, bag, size guide or lens configurator is open.

## Business details

- Phone 0121 729 8233 · email hello@eyecarebirmingham.co.uk · Mon–Sat 9.30–17.30, collections by arrangement.
- WhatsApp `https://wa.me/4479605978` (shown as "07960 5978"). Instagram @eyecare.birmingham. Google Business profile `https://share.google/9YZzTiRj2gvW1Xrpr`; 13 verbatim Google reviews.
- Delivery £3.95 tracked, free over £75; collection in Birmingham always free. Frames dispatch in one working day; prescription lenses take 7–10 working days.
- Returns: 30 days for unworn frames; prescription lenses refundable only if the clinic got them wrong. Free adjustments for life. Two-year manufacturer warranty.
- Lens prices: single vision (distance or reading) £59, varifocal £129; thin +£30, extra thin +£60, ultra thin +£100; tinted to match and clear included, polarised +£40, light-reactive +£70. Klarna shown as the price divided by three.
- Catalogue in the prototype: 16 frames, 40 brands (12 flagged as top brands), 12 colours, 12 styles.

## Design tokens

`tokens/colors.css`, `tokens/typography.css` and `tokens/spacing.css` hold the brand palette, type and spacing. In short:
- Ink `#141414`, paper `#FAF8F5`, white, surface `#F3F0EB`, hairline `#E6E1DA`, text greys `#4A453E` / `#5E584F` / `#6B655E` / `#77716A` / `#8B8478` / `#A39C90`.
- One accent, taupe: `#9C8B78`, ink `#6F6152`, soft `#EFEAE2`. The earlier sage and navy options were removed; the accent is a single token set, not a palette switcher.
- WhatsApp `#25D366` / hover `#1EBE5A` / ink `#0B2B17`; in-stock green `#1B7F43`.
- Playfair Display 500/600/700 for headings (never below 500), Outfit 300–600 for everything else, Roboto 400/500 inside the Google panels only.
- Square by default; pills and circles only for controls; rounded corners only in the Google panel. Hairline grids: cells on `#E6E1DA` with a 1px gap.
- Buttons 52px tall, 13px uppercase, .1em tracking; no hit target below 44px.

## Judgement calls worth keeping

- **The Google reviews panel is deliberately off-brand.** Roboto, Google's colours, Google's card shape. Borrowed credibility is the point; don't restyle it.
- **The zero-review product state is the normal state.** A new shop has no product reviews. Build that path first.
- **Two background colours at most** per view.

## Building it in SGS

`WP Build Gap Map.dc.html` grades 110 visible elements and behaviours against the repo at main as of 24 Sep 2026 (works today, configure, theme fix, block extension, new block/module, outside the code), with the existing block each maps to and the chosen fix. Open it in a browser and filter by level or area. Build in this order:

1. **Client style variation.** Replace `sites/eye-care-ward-end/theme-snapshot-*` (DM Serif Display / DM Sans, navy/gold) with Playfair Display / Outfit / Roboto (all in `theme/sgs-theme/assets/fonts`), the ink–paper–taupe palette on the framework's existing slugs, and square 52px button presets.
2. **WooCommerce data model.** Brands taxonomy (40 brands), Colour as a Colour / Image attribute (WC 10.9+; test on the installed version), shape, material, lens, frame type, hinge and nose-pad attributes, per-variation measurements, RRP as its own meta, Local Pickup, flat rate £3.95, free shipping over £75.
3. **Cross-cutting extensions.** Open an `sgs_modal` from any link (size guide, lens configurator); an InnerBlocks slot in `sgs/buybox` (second CTA, WhatsApp card, assurances, Klarna line); a `card` variant on `sgs/whatsapp-cta`; a "current product has reviews" visibility condition.
4. **Templates.** New eyewear PDP content part (Description / Details / Sizing; remove the food client's tabs and the Trustpilot block), shop archive with ten collapsible filter groups and the drawer breakpoint moved from 782 to 1060, checkout composition.
5. **Accounts.** Style WooCommerce My account to match: sign-in / register and lost-password templates, the orders list with status pills and the view-order progress steps (map the steps to order statuses, including a custom "Lenses being made"), WooCommerce Subscriptions for skip / pause / change frequency / cancel, edit-address and edit-account. Add the header account link and the optional create-account checkbox (WooCommerce "Allow customers to create an account during checkout", guest checkout left on). The Gap Map predates accounts and does not grade them.
6. **New builds.** Lens configurator module (choice flow in a full-screen modal, live price aside, price-ladder settings, cart item data via `woocommerce_store_api_add_to_cart_data`), prescription checkout inner block (the additional-checkout-fields API has no file type), `sgs/frame-measurements`, `sgs/product-specs`, wishlist.

## Assets

- `assets/ec-logo.png`: the Eye Care mark (header and lens configurator; the footer uses the text wordmark only).
- `assets/whatsapp-green.svg`, `whatsapp-ink.svg`, `whatsapp-white.svg`, `whatsapp-deep.svg`: one per background.
- `assets/instagram.svg`, `assets/google-g.svg`.
- Line icons are inline SVG paths in the templates; the mobile menu's Instagram and Google icons are inline SVGs too.
- Fonts load from Google Fonts (URL in `tokens/typography.css`).
- Photography: Unsplash placeholders referenced by URL, not licensed for production.

## Open items

Business and content:
1. Real product photography and a clinic interior shot.
2. Confirm the WhatsApp number: `wa.me/4479605978` is one digit short of a full UK mobile, and the contact page shows "07960 5978".
3. Replace the "Placeholder review" entries in the product reviews (all three are placeholders) with real reviews, or keep the zero-review strip until real ones exist.
4. Write the ninth FAQ, on free adjustments and re-fitting for life (eight exist).
5. Confirm every RRP shown is accurate and defensible.
6. Place the returns reassurance under Add to bag and the prescription-lens returns exception (drafted, not placed).
7. Wire the stock line to real stock (faked from product id).
8. Wishlist persistence per account (the view is designed under My account → Wishlist).
9. Live Google reviews via the API, or a managed cache of the current thirteen.
10. Subscriptions: confirm what is sold on subscription. The cards use placeholders (lens care kit £12, anti-fog wipes £9.50) and the shop has no way to start one yet.
11. Account emails (password reset, account created) are not designed; use WooCommerce's templates styled to the brand.

Decided in this revision (the draft and its manifest now agree): reduced motion follows the browser setting only; reveals rise 26px; no reveal timer; the filter drawer behaves like the mobile menu with page scroll locked; the mega menu follows the spec (delay, touch click, Escape, outside click). Removed from the draft: the `[data-rm]` rule, the `slideUp` keyframe, the preview-frame code, the `hashchange` listener, the no-op header padding transition and `image-slot.js`.

Dead code, don't port: `colourTiles[].filterHint` / `cur.colsKeys` (read, never set).

## Files

- `Eye Care Birmingham.dc.html`: the full storefront, with the implementation manifest at the top.
- `Frame Card.dc.html`: the product card, mounted with `<dc-import>` in five places.
- `WP Build Gap Map.dc.html`: the build report described above.
- `support.js`: the runtime the drafts load. The drafts load no other script.
- `assets/`, `tokens/`, `animations.json`, `surfaces.json`, `READING-DC-FILES.md`, `handoff-schema/`, `MANIFEST.md`.

Open `Eye Care Birmingham.dc.html` over HTTP (not `file://`) to interact with it.
