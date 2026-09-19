# Handoff: Ward End Eye Care — designer eyewear shop

## Overview
A full ecommerce storefront for Ward End Eye Care, an independent optician's clinic at 644 Washwood Heath Rd, Birmingham B8 2HQ, run by Fatima Nawaz. It sells designer sunglasses and prescription frames below RRP, with prescription lenses glazed in-house, local collection, and WhatsApp as the primary support channel.

The commercial position matters for implementation decisions: the site competes against discount marketplaces (which win on price but lose on trust) and national chains (which win on trust but lose on personality). Every trust signal — named optician, real Google reviews, RRP comparison, warranty, returns — is load-bearing. Do not drop them for visual tidiness.

## About the design files
The files in this bundle are **design references created in HTML** — working prototypes showing intended look and behaviour, not production code to copy.

The task is to **recreate these designs in the target codebase's existing environment** (React, Next.js, Vue, Shopify theme, whatever is in place), using its established component patterns, routing, state management and styling conventions. If no environment exists yet, choose an appropriate stack — for a storefront of this kind, Next.js with a headless commerce backend or a custom Shopify theme are both reasonable — and implement there.

Notes on the prototype's own construction, so you know what to ignore:
- It is a single-file HTML prototype. All styling is inline. Do NOT reproduce inline styles in production; map the values below onto the codebase's token system.
- Routing is a `view` string in component state, not URLs. Production needs real routes (see Routes below).
- Product data, filters, bag and checkout are all in-memory. Production needs real catalogue, cart and payment integration.
- Product photography is placeholder stock imagery from Unsplash. Real photography is pending; every placeholder is marked in the prototype's `alt` text and with a visible "Photo to come" label on tiles that have none.

## Fidelity
**High fidelity.** Colours, typography, spacing, copy and interaction detail are final and intended to be matched closely. Copy is signed off — treat all visible text as final content, not lorem. The one deliberately unfinished area is imagery.

## Routes / views
The prototype switches on a `view` state value. Suggested production routes:

| Prototype view | Route | Purpose |
|---|---|---|
| `home` | `/` | Hero, category tiles, featured frames, Google reviews, about strip |
| `shop` | `/sunglasses` (+ filter query params) | Filtered product grid |
| `product` | `/frames/[slug]` | Product detail |
| `lens` | `/frames/[slug]/lenses` | Prescription lens configurator (modal in prototype) |
| `about` | `/about` | Fatima, the clinic, how the pricing works |
| `contact` | `/contact` | Form, address, map, opening hours |
| `help` | `/help` | FAQs, delivery and returns, size guide |
| `bag` | `/bag` | Basket |
| `checkout` | `/checkout` | Delivery/collection, prescription capture, payment |
| `done` | `/order/[id]` | Confirmation |

## Screens

### 1. Global chrome

**Trust ticker** — full-width black bar, pinned above the header, `background:#141414`, `color:#FAF8F5`, `font-size:12.5px`, `letter-spacing:.04em`, `padding:11px 0`. Four claims, each with a 16px stroked icon:
1. 100% genuine, supplied direct by the brands
2. Free UK delivery over £75, or collect in Birmingham
3. Prescription lenses glazed here in 7–10 days
4. 30 days to return, free adjustments for life

Responsive behaviour: the bar shows as many claims as fit — four at desktop, dropping to three then two on narrow viewports, as a centred marquee-free row. Do not let claims wrap to two lines.

**Header** — sticky, `background:#FAF8F5`, bottom border `1px solid #E6E1DA`, adds a subtle shadow once scrolled past 40px. Contents: menu button (mobile), wordmark "EYE CARE / BIRMINGHAM" in Playfair Display 500 with `letter-spacing:.26em`, primary nav, phone number `0121 729 8233`, search, wishlist heart, bag with count badge.

Primary nav items, each opening a mega-menu on hover/focus at desktop and an accordion in the mobile drawer: **Sunglasses**, **Brands**, **Lenses**, **Help**, plus **About Eye Care**. Mega-menu panel: white, full-width, `border-bottom:1px solid #E6E1DA`, columns of links at `font-size:14.5px`, plus one image panel. Active nav item gets a `2px` `#141414` underline.

**Footer** — `background:#FAF8F5`, top border `1px solid #E6E1DA`. Address, phone, opening hours, link columns, and three 40×40 social tiles (white, `1px solid #E6E1DA`): Instagram in its brand gradient (#FFC107 → #F44336 → #C13584 → #5851DB), the four-colour Google G, WhatsApp in #25D366. Hover replaces the border with the mark's own brand colour plus a 1px ring — no colour inversion.

**Floating WhatsApp button** — fixed, `right:22px; bottom:22px`, `background:#25D366`, `color:#0B2B17`, pill, label "Ask me anything" (label hidden below 760px, icon only). Links to `https://wa.me/4479605978`.

### 2. Home

- **Hero** — full-bleed photograph, `height` responsive, dark overlay gradient (`linear-gradient(100deg,rgba(18,18,18,.86) 0%,rgba(18,18,18,.74) 30%,rgba(18,18,18,.4) 58%,rgba(18,18,18,.04) 82%,transparent 100%)`; on mobile a flat vertical `rgba(20,20,20,.44)` → `rgba(20,20,20,.5)`). Eyebrow "40 DESIGNER BRANDS · BIRMINGHAM", headline in Playfair Display 500 at `clamp(42px,4.4vw,72px)` (40px mobile), subhead 18px, two CTAs. Image has a slow parallax on scroll and a `kenburns` settle on load; both must respect `prefers-reduced-motion`.
- **Shape tiles** — horizontal row of shape categories (Pilot, Wayfarer, Round, Cat-eye, Square, Oversized) each with a line-drawn glasses glyph, photo where available, and a "Photo to come" state on `#2B2721` where not.
- **Featured frames** — product card grid (see Frame Card below).
- **Google reviews** — see section 4.
- **About strip** — two-column: clinic photograph left, copy right on `#FAF8F5` with `panelPad` (68px 60px desktop / 36px 24px mobile), 1px `#E6E1DA` gaps forming a hairline grid.
- **Four reasons panel** — numbered 01–04 with headings and body copy: below-RRP pricing shown explicitly; lenses glazed in-house; message the optician directly; collect in Birmingham or tracked delivery.

### 3. Shop

- **Layout** — `270px` filter rail + `minmax(0,1fr)` grid at desktop; below 1024px the rail becomes a full-screen drawer triggered by a "Filters" button, with a sticky footer holding "Clear all" and "Show N frames".
- **Ten filter groups**, each collapsible, each showing a count: Gender, Size, Colour, Price, Brand, Style, Material, Frame type, Hinge, Nose pads. Colour swatches are 24px circles with a check on select. Price is a min/max range.
- **Sort control** top right: Featured, Price low to high, Price high to low, Biggest saving, Newest.
- **Grid** — `repeat(auto-fill,minmax(250px,1fr))` desktop, `minmax(150px,1fr)` mobile, `gap` 2px on a `#E6E1DA` background so cards read as a hairline grid.
- Empty state when filters exclude everything, with a "Clear all filters" action.

### 4. Google reviews slider (home)

Deliberately styled as Google's own UI, not the site's — this is a borrowed-credibility component and looking native to Google is the point. Font: **Roboto**, not Outfit.

- Container: `background:#fff`, `border:1px solid #DADCE0`, `border-radius:12px`, padding `28px 26px` (20px 16px mobile).
- Header row: 30px four-colour Google G; label "Google Reviews" `13px #5F6368`; rating **4.7** at `32px #202124 weight 500`; a five-star row where a `#FBBC04` layer is clipped to 94% width over a `#DADCE0` base (this is how the partial star is drawn); "15 reviews" at `13.5px #5F6368`. Two pill buttons: "See all reviews" (`background:#1A73E8`, white, `border-radius:20px`, `min-height:40px`) and "Write a review" (white, `1px solid #DADCE0`, `color:#1A73E8`).
- Rail: horizontal flex, `gap:16px`, `overflow-x:auto`, `scroll-snap-type:x mandatory`, cards `flex:0 0 auto` at `340px` (270px mobile) with `scroll-snap-align:start`. Native touch scrolling plus two 40px circular arrow buttons (`1px solid #DADCE0`, `color:#1A73E8`) that scroll by roughly two cards. Custom 8px scrollbar: track `#F1F3F4`, thumb `#DADCE0`.
- Card: `background:#fff`, `1px solid #E8EAED`, `border-radius:8px`, `padding:20px`, `gap:12px`. 40px circular avatar with the reviewer's initial on an assigned Google-palette colour; name `14px #202124 weight 500`; reviewer meta (`Local Guide · 11 reviews · 8 photos`) `12.5px #70757A`; 17px Google G top right; five `#FBBC04` stars plus relative date; body `14.5px/1.6 #3C4043`, clamped to `max-height:186px` with a "Read the full review" link on entries that overflow.
- Caption under the rail: "Scroll for more — 13 of the 15 reviews left a comment."

**Content**: all thirteen review texts are real, taken verbatim from the live Google Business Profile, with real names, dates and reviewer metadata. Do not paraphrase, shorten or reorder them without checking the profile. In production, pull these from the Google Places API (Place Details `reviews`) if the volume justifies it; note that the API returns a maximum of five reviews, so a cached/managed list is likely necessary to keep all thirteen.

### 5. Product detail

- **Gallery** — large image with four view thumbnails (Front, Angle, Side, Detail), zoom on hover at desktop, swipe at mobile. Saving badge overlaid top-left.
- **Buy column** — brand wordmark, product name in Playfair Display, model code, star rating with review count, price block (current price at 34px, RRP struck through, "Save £X" in the accent ink), colour swatch row, size selector (S/M/L reading as `58▫14 135` triplets), stock line, Add to bag, Add prescription lenses, wishlist, WhatsApp advice card.
- **Stock line** — directly under the colour row: an 8px dot plus text. In stock → `#1B7F43`, "In stock — dispatched next working day". Ordered in → `#8A6A1F`, "Ordered in from the brand — 3–5 working days".
- **Tabbed detail block** — three tabs, `min-height:52px`, uppercase `12.5px`, `letter-spacing:.14em`, active tab `#141414` with a `2px` bottom border, inactive `#8B8478`:
  1. **Description** — paragraph plus four bullets (shape/material/colour, lens type and UV400, boxing and two-year manufacturer's warranty, prescription availability).
  2. **Details** — seventeen spec cells in an `auto-fit minmax(170px,1fr)` hairline grid: Brand, Model, Shape, Frame type, Material, Colour, Lens category, Polarised, Hinge, Nose pads, Lens width, Bridge, Temple, Lens height, Gender, Availability, Warranty.
  3. **Sizing** — measurement diagrams plus the measurement key (below).
- **Measurement diagrams** — two hand-built SVG line drawings, front and side, stroke `#141414` at `3.4`, dimension lines `#9C8B78` at `1.4`, guide lines `#D5CCBD` `1px` dashed `4 4`. Labels are **HTML overlays positioned absolutely over the SVG**, not `<text>` nodes, so they scale independently of the drawing and stay legible. Values are wired live to the selected size: front view carries lens width, bridge and lens height; side view carries temple length including the ear bend. Changing size updates all four numbers.
- **Measurement key** — four rows (Lens width, Bridge, Temple, Lens height), each with the value in Playfair Display 20px and a plain-English explanation, followed by the "numbers inside the arm" paragraph.
- **Reviews section, gated**: with reviews, a full breakdown (average, star histogram, individual reviews). With zero reviews, the whole section is replaced by a single Google-styled strip: "No reviews on this frame yet — it's new to the shop. / The clinic is rated 4.7 from 15 Google reviews. Buy this pair and you can be the first to review it." plus a link to the profile. A new shop launches with no product reviews, so the zero state is the common case — build it first.
- **Two recommendation rails**: "More from [brand]" and "Similar shapes". Both are horizontal card rails.

### 6. Lens configurator

Modal, three steps: lens type (single vision / varifocal / non-prescription tint), prescription capture, summary. Prescription capture offers three modes — send it later via WhatsApp (preferred, and pre-selected), upload a photo, type the values. Running total updates in the sticky footer. Copy stresses that nothing is cut until the prescription is checked, and that a pre-cut order can still be refunded.

### 7. Bag, checkout, confirmation

Standard flow. Checkout collects delivery-or-collection choice, contact details (email plus mobile "so I can WhatsApp you updates"), prescription if the bag contains lenses, then payment. Step count adapts (4 steps with lenses, 3 without). Confirmation copy differs for collection versus delivery.

### 8. Help / FAQs

Accordion of nine FAQs covering authenticity, pricing, prescriptions in sunglasses, prescription requirements, lens turnaround, sizing, prescription returns, collection and fitting, and adjustments. Plus delivery and returns detail, and the size guide.

### 9. Size guide modal

Openable from anywhere (product page, filters, FAQs). Shows the `55 ▫ 18 137` example as a three-column grid with the numbers and their labels in matching columns (they must align — the numbers row and label row share `grid-template-columns:repeat(3,minmax(0,1fr))`), definitions of each measurement with ranges, an S/M/L mapping by lens width, and a WhatsApp card.

## Frame Card component

Shared by every grid and rail. Structure top to bottom:
- Image area, `aspect-ratio` square, `background:#F3F0EB`, brand wordmark overlaid top-left in Playfair Display `12.5px`, `letter-spacing:.26em`, uppercase; saving badge top-right; wishlist heart on hover.
- Name, model code.
- Star rating plus review count, or a "No reviews yet" line.
- Price row: current price and struck RRP on the left, colour swatches on the right of the same line. Four swatches maximum, then a `+N` pill.
- Card padding `18px` desktop / `14px` mobile.

## Interactions & behaviour

- **Reveal on scroll** — elements marked `data-reveal` fade and rise 18px via IntersectionObserver, once only, `animation:rise .9s`.
- **Hero parallax** — transform driven by scroll position, disabled under reduced motion.
- **Mega-menus** — open on hover after a short delay at desktop, on click at touch sizes, close on Escape and on outside click.
- **Filter drawer** — slides up from the bottom at mobile (`slideUp`), full-height, body scroll locked while open.
- **Toasts** — "Added to bag" confirmation, `animation:toast 3s`, bottom centre.
- **Wishlist hearts** — currently visual only in the prototype. Production needs real persistence (account or local storage) and a wishlist view; this is a known gap, not an intentional omission.
- **Reduced motion** — both a `@media (prefers-reduced-motion:reduce)` block and a `data-rm="1"` attribute hook kill all animation and transition. Keep both mechanisms.
- **Responsive** — the prototype is fully fluid, driven by measured container width with breakpoints at 700 (lens layout stacks), 760 (mobile), 1024 (narrow / filter drawer) and 1280 (wide). There is no separate mobile build and no device-frame toggle. Hit targets are never below 44px.

## State

Prototype state, for mapping onto real stores:
- `view`, plus per-view params — replace with routing.
- `f` — filter object: gender, sizes, colours, price min/max, brands, shapes, materials, frame types, hinges, nose pads, sort. Should serialise to query params.
- `bag` — line items with frame, colour, size, lens configuration and price.
- `lens` — in-progress lens configuration.
- `co` — checkout fields including delivery method and prescription mode.
- UI flags: `mega`, `filtersOpen`, `sizeGuide`, `curImg`, `curSwatch`, `curSize`, `pdpTab`, `toast`, `scrolled`.

## Design tokens

**Colour**
| Token | Value | Use |
|---|---|---|
| Page background | `#FAF8F5` | Body, header, footer |
| Surface | `#FFFFFF` | Cards, panels, inputs |
| Ink | `#141414` | Primary text, buttons, ticker background |
| Ink on dark | `#FAF8F5` | Text on `#141414` |
| Body text | `#5E584F` | Paragraphs |
| Muted text | `#77716A` | Spec labels |
| Faint text | `#8B8478` | Captions, inactive tabs |
| Hairline | `#E6E1DA` | All borders and grid gaps |
| Soft fill | `#EFEAE2` | Accent tint (taupe) |
| Image placeholder | `#F3F0EB` | Empty image areas |
| Dark placeholder | `#2B2721` | "Photo to come" tiles |
| Accent (taupe, default) | `#9C8B78` | Focus rings, selection |
| Accent ink (taupe) | `#6F6152` | Eyebrows, link hover, savings |
| In stock | `#1B7F43` | Stock dot and text |
| Ordered in | `#8A6A1F` | Stock dot and text |
| WhatsApp | `#25D366` on `#0B2B17` text; tint `#E9F9EF` with `#B7E5C7` border | WhatsApp CTAs |
| Google blue | `#1A73E8` | Review panel buttons and links |
| Google star | `#FBBC04` | Filled stars |
| Google grey star | `#DADCE0` | Unfilled star base |
| Google borders | `#DADCE0`, `#E8EAED` | Review panel and cards |
| Google text | `#202124`, `#3C4043`, `#5F6368`, `#70757A` | Review panel type |

Two alternative accent palettes exist as a theme prop and should be carried across as a token set, not hard-coded: sage `{acc:#8A9A86, ink:#55654F, soft:#E8ECE6}`, navy `{acc:#7C8AA0, ink:#4C5A70, soft:#E6EAEF}`.

**Typography**
- Display: **Playfair Display**, weights 500 / 600 / 700. Headings, prices, wordmark, measurement values. Always 500 or heavier — lighter didone weights broke up at small sizes, which is why this family replaced Bodoni Moda.
- Body / UI: **Outfit**, weights 300–600.
- Google review panel only: **Roboto**, 400 / 500.
- Scale: h1 48px desktop / 34px mobile; h2 46 / 32; hero `clamp(42px,4.4vw,72px)` / 40; body 16–16.5px; small 14.5px; caption 12.5–13.5px; label 11–12px uppercase with `letter-spacing:.14em`–`.26em`.

**Spacing**
- Section padding: `104px 52px` desktop / `56px 20px` mobile.
- Page padding: `48px 52px 90px` / `28px 20px 60px`.
- Panel padding: `68px 60px` / `36px 24px`.
- Max content width: `1440px`, centred.
- Grid gaps: `2px` for hairline grids (on an `#E6E1DA` ground), `16px` for card rails, `10–14px` for control clusters.

**Other**
- Border radius: `0` almost everywhere — the design is deliberately square. Exceptions: pills and circular controls (`50%` / `20px`), and the Google review panel (`12px` container, `8px` cards).
- Shadows: only two — header on scroll, and modals at `0 30px 70px rgba(0,0,0,.18)`.
- Minimum interactive height: `44px`, buttons usually `52px`.
- Transitions: `.2s`–`.25s` on colour and background; `.3s` fades for tab and panel changes.

## Assets

- **Fonts** — Playfair Display, Outfit, Roboto, all from Google Fonts.
- **Photography** — all placeholder, from Unsplash, referenced by URL. Eight catalogue images plus a hero and a clinic interior shot. Four are reasonable stand-ins for the products they sit on (cat-eye, square, wayfarer, round metal); the rest are marked placeholders. **Real product photography, brand logo files and a photograph of the clinic interior are outstanding and must be supplied before launch.**
- **Icons** — all inline SVG, drawn in the prototype. Brand marks (Instagram, Google, WhatsApp) use their official colours.
- **No icon font, no image sprites, no third-party UI library.**

## Outstanding items

1. Real product photography and brand wordmark files.
2. Wishlist persistence and a wishlist view.
3. Live Google reviews via API, or a managed cache of the thirteen current ones.
4. Confirmation that every RRP shown is accurate and defensible.
5. Returns copy under Add to bag, and the prescription-lens returns exception in plain English (drafted, not yet placed).
6. Real stock data behind the stock line.

## Files in this bundle

- `Eye Care Birmingham.dc.html` — the full storefront prototype (all views, all logic).
- `Frame Card.dc.html` — the shared product card component.
- `image-slot.js` — small helper used by the prototype for drop-in image placeholders. Not needed in production.

Open `Eye Care Birmingham.dc.html` in a browser to interact with the full prototype.
