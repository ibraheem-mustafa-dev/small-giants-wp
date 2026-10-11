# Handoff: Mama's Munches ecommerce redesign

## Overview
Redesign of Mama's Munches, a made-to-order lactation-cookie shop ("Zookies") for breastfeeding mums and gift-givers. Eleven pages (including sign-in and My account) plus a shared header (with nav drawer and basket drawer), footer and product card. The target is the existing WooCommerce site on the `sgs-theme` + `sgs-blocks` framework (repo `ibraheem-mustafa-dev/small-giants-wp`, `sites/mamas-munches`), so this is a restyle-and-extend job, not a rebuild. "Block mapping" below says which SGS block to restyle, extend or build new.

## About the design files
The files in this bundle are **design references created in HTML**: prototypes showing intended look and behaviour, not production code to copy. Recreate them in the target codebase (WordPress block theme + SGS blocks + WooCommerce) using its established patterns. `store.js` is a prototype-only stand-in for the catalogue, basket, orders and customer account (localStorage); WooCommerce and WooCommerce My Account replace it.
To view a draft, serve this folder over HTTP (the runtime re-fetches its own file, so `file://` fails) and open any `.dc.html`. Keep `support.js`, `store.js` and `assets/` beside them. `READING-DC-FILES.md` explains the file format.

## Fidelity
**High-fidelity** for every page: final colours, type, spacing, motion and copy. Recreate pixel-accurately using the values in `tokens/` and in each draft.

## Routes
A multi-file prototype: every page is its own file, linked with plain `<a href>`. No hash router.

| Route | File | Params |
|---|---|---|
| Home | `Home.dc.html` | anchors `#build`, `#gifts`, `#story`, `#reviews` |
| Shop | `Shop.dc.html` | `?filter=zookies\|gifts\|subscribe\|trial\|bundles\|vegan` |
| Product | `Product.dc.html` | `?id=zookies\|trial\|giftbox\|care40\|giftcard` (unknown → Zookies), `?sub=1` preselects Subscribe and highlights Subscribe & save in the header, `?flavour=<id>`; anchors `#reviews`, `#subscribe`. Tab title is the product name |
| Gifts | `Gifts.dc.html` | `?occasion=shower\|born\|far\|forty`; anchor `#results` |
| Basket | `Basket.dc.html` | |
| Checkout | `Checkout.dc.html` | |
| Confirmation | `Confirmation.dc.html` | reached from Checkout submit |
| Contact | `Contact.dc.html` | |
| Help | `Help.dc.html` | anchors `#delivery`, `#allergens`, `#legal` (scrolled to 400ms after load) |
| Sign in / register | `SignIn.dc.html` | `?mode=register\|forgot`, `?next=checkout` (return to Checkout after signing in) |
| My account | `Account.dc.html` | `?tab=orders\|subs\|addresses\|details`, `?order=MM-####` |

## Breakpoints and layout
Each draft computes `bp` from `window.innerWidth` on resize: **m** < 768px, **t** 768–1023px, **d** ≥ 1024px. Per-breakpoint values live in each page's `L` object, written `v(mobile, tablet, desktop)` in `renderVals()`; read them there. Content max-width 1240px (Checkout 1160px, Help and Confirmation hero 900px), gutters 20 / 32 / 40px. Home sections pad 64 / 80 / 112px vertically.

## Global elements

### Header (`SiteHeader.dc.html`)
Mounted on every page except Checkout, `position:sticky; top:-32px`, so the 32px announcement strip scrolls away and the bar stays.
- **Announcement strip:** #F9CF6E, 13px/700, dashed cocoa rules above and below. Text: "✦ Baked fresh when you order · With you in 3–5 days · Free UK delivery over £35" on desktop; tablet drops the middle item; mobile reads "✦ Baked to order · Free delivery over £35".
- **Mobile/tablet bar (64px):** menu button (three bars), centred horizontal logo (48px mobile, 56px tablet), then an account icon (person, 48px) and the basket icon with a pink count badge (hidden at 0).
- **Desktop bar (84px):** logo 60px; centred nav **Shop, Gifts, Subscribe & save, Help, Contact** (16px/700 pills, hover and active fill #F9D5D3); account icon (48px circle, hover #F9D5D3); basket pill (paper, 2px outline, 3px shadow, count chip).
- **Account link:** signed out → `SignIn.dc.html` (label "Sign in or create an account"); signed in → `Account.dc.html` ("My account"). Active (#F9D5D3) on both account pages.
- **Active item:** the page passes `current` (`shop`, `gifts`, `sub`, `help`, `contact`, `account`). Product passes `sub` when the URL has `?sub=1`, else `shop` for Zookies and `gifts` for the rest. Desktop: pink pill + `aria-current="page"`; drawer: the matching link turns #A8404F.
- **Nav drawer (left, `min(88vw, 400px)`):** "Who are you shopping for?" with two outlined image tiles (For me → Shop; For a new mum → Gifts; hover lifts -3px with a 5px hard shadow). Links in Young Serif 22px with a 32px outlined → circle or a chip (Shop all, Zookies, Taster Trio "3 for £5", Gifts, Subscribe & save "10% off", Help & FAQs, Contact); hover slides the label 8px right and turns it #A8404F (.25s spring). Then the **account block**: signed out, two pills, **Sign in** (yellow) and **Create account** (paper); signed in, one pill with a pink person circle, "Hello, <first>" and **My account →**. Then Caveat "say hello" with three outlined tiles (78px tall, 3px shadow): WhatsApp (green circle → Contact), Email (yellow circle, `mailto:`), Instagram (gradient circle); hover lifts with a 5px shadow and a pink fill, press pushes in. Last, a dashed Trustpilot card: Young Serif "4.3", ★★★★★ and "8 reviews on Trustpilot ↗" (hover fills paper and lifts). **Entrance:** each time the drawer opens, every `[data-dstagger]` item fades in and slides 18px from the left (420ms, cubic-bezier(.2,.8,.2,1), 80ms + 35ms per item, capped at 10), skipped under reduced motion.
- **Basket drawer (right, 440px; full width on mobile):** opens from the basket button or whenever a page calls `MM.openBasket()` after adding. Free-delivery bar toward £35, line items (76px thumb, qty stepper 44px, Remove), "This is a gift" toggle that reveals a Caveat 22px message box (200 characters, counter), Taster Trio upsell when no trial is in the basket, subtotal, "Checkout securely" (pink) and "View full basket". Empty state: round logo, "Your basket is empty", "Add a Taster Trio · £5", "Browse the shop".
- Both drawers share a cocoa 45% scrim; × button, scrim click and Escape close them; the body is scroll-locked while one is open.

### Footer (`SiteFooter.dc.html`)
Mounted on every page except Checkout.
1. **Instagram strip** on cream: Caveat "fresh out the oven…", H2 "@mamasmunches", "Follow along" button; six outlined photo tiles (rotated, straighten on hover), 6 columns desktop, 3 tablet, horizontal scroll at 44% width on mobile.
2. **Tagline marquee** on #F9CF6E between 2px cocoa rules: "boost your milk, bite by bite ✦ baked when you order ✦ handmade in Birmingham ✦ one-handed snacking ✦", Young Serif 32px (24px mobile), 32s linear loop. Pauses while the band is hovered or while keyboard focus (`:focus-visible`) is anywhere in the footer; stops under reduced motion.
3. **Pink band (#F5C2C8):** "Hungry? Of course you are." (80 / 56 / 40px) with a pink "Build your box →" button, round logo rotated -8deg (spins to 6deg on hover).
4. **Link columns** with Caveat 24px headings: *shop* (All Zookies, Build your box, Subscribe & save, Gifts, Taster Trio), *help* (FAQs, Delivery, Allergens, Contact), *say hello* (`Zainab@mamasmunches.com`, Instagram gradient button, WhatsApp green button → Contact).
5. **Bottom row:** "© 2026 Mama’s Munches · Registered food business", Privacy · Terms (both → `Help.dc.html#legal`), "Website by Small Giants Studio".

### Product card (`ProductCard.dc.html`)
Paper card, 2px outline, radius 24px, slight per-product rotation; hover straightens, lifts (-4px, -6px) and adds an 8px shadow. Square image (photo cover, or the round logo at 66% on pink for the gift card), yellow badge top-left, Young Serif name, short description (`md` only), price + unit, full-width button. Simple products add to the basket ("Added ✓" for 1.6s, opens the drawer); Zookies and the gift card link to Product. Size `sm` is used on mobile.

## Pages

**Home.** Pink hero, 2 columns from tablet: Caveat time-of-day greeting with a twinkling ✦; H1 "Made for the mum [pill photo] who needs it most" (82 / 54 / 46px) with a yellow highlighter under "most"; lead; "Build your box →" and "Send a gift" buttons; "★★★★★ 4.3 on Trustpilot" and "New? Taster Trio, 3 for £5 →". Right: three rotated polaroids, a floating "Baked to order" sticker and a "baked with love" ribbon. Trust bar beneath (4 items: Baked fresh when you order, Handmade in Birmingham, Registered food business, Free UK delivery over £35): a static 4-column row on desktop, a marquee below 1024px that pauses on hover/touch. Then "Who are we baking for today?" (two path cards), **Build your Zookie** (`#build`), gifts for new mums (`#gifts`: 4 tiles, mobile carousel with dots and arrows, gift-note sample and gift-card card), Zainab’s recipe card (oats, brewer’s yeast, flaxseed, fenugreek) with the "nourishing food, not medicine" note, story polaroid (`#story`), review slider (`#reviews`, 6 Trustpilot reviews, arrows, dots, drag, 6s autoplay), FAQ (4 questions, one open).

**Build your Zookie** (Home and Product): base (Classic oat, Vegan oat), chips (Milk, White, Dark, No chips), flavours (11; up to 3; picking a fourth drops the oldest; at least one stays), pack (8 £9.50 · 20 £21.50 "Most popular" · 40 £38 "Best value"). A line states the split ("Your 20: 10 strawberry · 10 mango"). Home shows a live cookie illustration (base colour, chip and flavour dots) that wobbles on every change, with a Caveat summary. Purchase type: "Subscribe & save 10%" (discounted price, one-off struck through; frequency Every 2 / Every 4 weeks) or "One-off box". CTA "Subscribe · £x" / "Add to basket · £x", then "In your basket ✓". Home defaults: oat, milk, strawberry + mango, 20, subscribe, 4 weeks. Product defaults: oat, milk, strawberry, 20, one-off.

**Shop.** Pink band: Caveat "fresh from Zainab’s kitchen", H1 "The shop", lead, Sort select (Featured, Price low–high, high–low), filter chips with counts (All, Zookies, Gifts, Subscribe, Taster, Bundles, Vegan). Grid of product cards: 2 columns mobile, 3 tablet and desktop. Banners: Build your own box, Subscribe & save 10% (perk chips), "Find a gift by moment or budget".

**Product.** Breadcrumb; gallery (square main image, 8px shadow, badge, ribbon; thumbnails 64 / 76 / 88px; sticky from tablet). Buy box by product kind: *Zookies* builder + purchase type; *gift card* amount £15 / £25 / £40 (no gift toggle); *simple* "What’s inside" list + qty stepper. "Send it as a gift" toggle with a note (200 characters) on non-card products. Add button, assurance row (Baked fresh when you order; With you in 3–5 days; Free UK delivery over £35), accordion (Ingredients & allergens, Delivery, Keeping them fresh, A gentle note), 3 reviews, "You might also like" (2 on mobile, 3 otherwise). On mobile a sticky bottom bar (price, summary, Add to basket) slides up when the main button leaves the viewport.

**Gifts.** Pink hero with the finder card: "What’s the moment?" (Baby shower, Just had a baby, Sending love from afar, The first 40 days; default Just had a baby) and "Budget" (Any, Under £20, £20 and up), CTA "Show N gifts ↓". Art: rotated polaroid and a taped note ("Dear Aisha, …"). `#results`: "Gifts for “just had a baby”", product cards 2 / 3 / 4 columns, empty state with "Show every budget". "How gifting works" (3 steps). "Write her a note": To / Your message / From fields with a live lined-paper preview (local only, not saved). Gift-card band "Give it now, she bakes it later" with £15 · £25 · £40 chips.

**Basket.** Caveat "nearly there", H1 "Your basket" with count chip. Free-delivery bar ("Add £x more for free UK delivery" / "Free UK delivery unlocked ✦"), line cards (thumb, name, variant, stepper, Remove, line total), "This is a gift" toggle + note, Taster Trio upsell. Summary (sticky on desktop): subtotal, delivery (Tracked 48 rule), total, "Checkout securely →", Apple Pay / Google Pay, "Keep shopping". Empty: "Nothing in here yet" with Build your box and Taster Trio. The prototype seeds two demo lines once per browser.

**Checkout.** Open to guests. Own minimal header on #F5C2C8 ("← Basket", logo, lock + "Secure checkout"); no site footer. Express pay (Apple Pay, Google Pay, PayPal) then "or pay by card". Fieldsets: **1 · Your details**: guests see "Checking out as a guest. Have an account? Sign in" (→ `SignIn.dc.html?next=checkout`), email (required), mobile (optional) and a dashed box with an unticked **"Create an account (optional)"** checkbox ("See your bake dates and manage subscriptions online."); ticking it reveals First name + Choose a password (8+). If the basket holds a subscription, a line under the checkbox says an account lets her skip, pause or cancel it herself. Signed-in shoppers see "Signed in as …" with a My account link, and their email and default address are prefilled. **2 · Who’s it for?** (for me / it’s a gift ♥; gift reveals "Her name" (saved as `gift.to`), "Your note" in Caveat and "We’ll leave the prices off the packing slip"; the gift goes to the delivery address in step 3); **3 · Delivery** (retitled "3 · Her address & delivery" for gifts: postcode + Find address, address lines, town; Royal Mail Tracked 48 / 24 cards); **4 · Payment** (card, expiry, CVC). Allergen note, "Pay £x", terms line. Summary aside (sticky) on tablet/desktop with discount code; on mobile a "Show order summary ▾" toggle at the top.

**Confirmation.** Pink hero: ✓ badge that pops in, Caveat "thank you, lovely", H1 "Your order’s in. Zainab’s warming the oven.", order number, then a paper pill "✦ Baking on **Mon 13 Oct** · with you from Wed 15 Oct" (from the order’s bake date). Four-step timeline (Order placed; Baking: "Zainab bakes it fresh on <date>"; Posted; With you). "What’s coming" list with total paid; beside it the gift note in a taped card (opening "Dear <her name>," in Caveat 30px when given), or a "Send her a Taster Trio" prompt when there is no note. Then an account card: "Follow this order in your account" → `Account.dc.html?order=…` for signed-in or newly registered shoppers (eyebrow "your account is ready" after registering), or a dashed "Create an account to see bake dates and past orders" card for guests. Instagram and "Back to the kitchen" cards.

**Contact.** Pink hero "Say hello to Zainab" with the round logo. Channel cards: WhatsApp ("Number to be added"), Instagram, Email. Form on pink: topic chips (My order, A gift, Allergens, Baby shower or event, Something else), name, email, then "Order number" for My order or "How many cookies" + "Date needed" for events, message, "Send message →"; success state "Thank you! Zainab will be in touch soon." with "Send another". Quick-answer links to Help.

**Help.** Pink hero with search (filters questions and answers) and category chips (All, Ordering & delivery, Ingredients & allergens, Breastfeeding, Gifting, Subscriptions). 12 FAQs as an accordion with a category label; "No answers for that yet. Ask Zainab" when empty. `#delivery` table (Tracked 48 £3.95, free over £35; Tracked 24 £5.45; Taster Trio & gift cards included), `#allergens` panel, `#legal` placeholders, "still stuck? Message Zainab".

**Sign in / register (`SignIn.dc.html`).** Pink hero whose eyebrow and H1 follow the mode ("welcome back, mama" / Sign in; "nice to meet you" / Create an account; "happens to us all" / Reset your password). Left: pink form card (radius 32px, 8px shadow) with two tab pills, **Sign in** and **Create account**. Sign in: Email, Password, "Sign in →", "Forgotten your password?". Create account: First name, Last name, Email, Choose a password (8+), optional marketing checkbox, "Create account →". **Forgotten password flow:** enter email → "Send reset link" → ✉ "Check your inbox" (the link lasts one hour; "Didn’t get it? Try again") → "Choose a new password" (new + type it again) → ✓ "Password updated" → Sign in. Validation messages appear under each field in 14px/700 #A8404F with `role="alert"`: "Enter an email address like name@example.com", "Enter your password", "Enter your first name", "Passwords need at least 8 characters", "The two passwords don’t match". Visiting while signed in shows "You’re signed in as …" with Go to my account / Sign out. Right: "why have an account?" with three ✓ rows (every order and bake date; subscriptions on your terms; saved addresses) and a dashed note that no account is needed to order. Success goes to My account, or back to Checkout with `?next=checkout`.

**My account (`Account.dc.html`).** Pink hero: Caveat "your account", H1 "Hello, <first name>", and "Your next subscription bake is <date>" when one is active. Below, a 260px sticky side nav on desktop (a horizontal chip row on mobile/tablet) with **Orders, Subscriptions, Addresses, Account details** (count chips) and Sign out; content on the right. Signed out, the page shows "Sign in to see your orders" with Sign in / Create an account.
- **Orders:** one paper card per order: order number (Young Serif 22px), status chip (Baking soon #F9CF6E · Posted #FCEBBE · Delivered #FFFAF0), "Placed <date> · N items", "Baking/Baked <bake date>", up to three 48px thumbs, total, "View order →". Empty: "No orders yet".
- **Order detail:** "← All orders"; "Order MM-####" + chip; a yellow-soft bake card with a tilted calendar tile (day name, date, month) and "Baking on / Baked on <date>" plus the delivery method and arrival; the four-step timeline with completed steps filled #F9CF6E; items, delivery, total and "Order this again" (adds the lines and opens the basket drawer); "Delivered to" address; the gift note when there was one; "Something not right? Message Zainab →".
- **Subscriptions:** one card per subscription: thumb, name, status chip (Active / Paused / Cancelled), variant, "£x a box · 10% off", a dashed panel with "Next bake <date> · with you from <date>". Controls: How often (Every 2 / Every 4 weeks pills), **Skip next delivery** (moves the next bake on by one interval; shows "You’ve skipped the <date> bake." with Undo), **Pause / Resume** (Resume restarts from the next Monday bake), **Cancel subscription** (inline confirm: "You’ll lose 10% off and your guaranteed slot in every bake. Pausing keeps both." Keep it / Yes, cancel). Cancelled cards turn dashed on cream with "Restart subscription". Empty: a yellow card linking to Subscribe & save.
- **Addresses:** two-column cards; the default has a "Default delivery" chip and a 6px shadow; Edit, Make default, Remove (removing the default promotes the next). "+ Add an address" opens a pink form (Full name, Address line 1, line 2, Town, Postcode; all but line 2 required).
- **Account details:** First name, Last name, Email, Mobile, marketing checkbox, "Save changes" ("Saved ✓" for 2.4s); Change password (current + new, 8+; "Password updated ✓").

## Signature components (exact values)
- **Primary button:** height 60–66px, radius 999px, 2px solid #3A2A22, fill #F9CF6E, Karla 700 17–19px, shadow 4px 4px 0 #3A2A22. Hover: fill #FFFAF0, translate(-3px,-3px), shadow 7px 7px 0. Active: translate(3px,3px), shadow 0. Transition transform .2s cubic-bezier(.3,1.6,.5,1), box-shadow .2s, background .2s. The hero variant ends in a 40px cocoa circle with a yellow →.
- **Secondary button:** same with fill #FFFAF0; hover fill #F9CF6E.
- **Option pill:** min-height 44–48px, radius 999px, 2px outline, 15–16px/700. Selected: fill #F9CF6E, shadow 3px 3px 0, translate(-2px,-2px). Hover translate(-2px,-2px). Flavour pills carry a 22px colour dot with ✓ when selected.
- **Pack-size card:** 3-up grid, min-height 82–84px, radius 20px; Young Serif 26px count, 13–14px/700 price, 12px per cookie; tag chip #EE8088, 11px/700, at top -12px.
- **Purchase-type card:** radius 20px, selected #FFFAF0 + 4px shadow, unselected rgba(255,250,240,.45).
- **Card:** 2px outline, radius 24–28px; hover translate(-4px,-4px) + 8px shadow, rotated cards straighten.
- **Accordion row:** radius 20–22px; open fill #FCEBBE + 4px shadow; + icon rotates 45deg (.3s spring).
- **Polaroid:** #FFFAF0, padding 8px 8px 34px, 2px outline, radius 8px, rotated (-9 / 8 / -1.5deg), Caveat caption 21–24px; hover straightens and lifts 10–12px over .45s.
- **Handwritten eyebrow:** Caveat 28px, #8E3444 (on yellow #7A5A12), often rotate(-2deg).
- **Inputs:** height 52–54px, 2px outline, radius 14px, 16px text, fill #FFFFFF (checkout) or #FFFAF0.
- **Focus:** `:focus-visible { outline: 3px solid #3A2A22; outline-offset: 3px }` in every page helmet.

## Interactions and animation
Every effect is inventoried in `animations.json` (195 records). In short:
- **Web Animations (10 call sites):** nav drawer contents stagger in on open (see Header); scroll reveal on `[data-reveal]` (Home: opacity 0→1, translate 32px→0, 800ms, 90ms stagger capped at 4; Shop, Product, Gifts, Contact: 28px, 750ms; easing cubic-bezier(.2,.7,.2,1), IntersectionObserver ~0.1); hero ✦ twinkle (2.4s loop); sticker float (3.2s loop); builder cookie wobble on each option change (520ms spring); Confirmation ✓ pop (800ms).
- **CSS transitions (138):** hover lifts and fills, drawer slides (transform .32s cubic-bezier(.2,.8,.2,1)), scrim fade (.25s), progress bars (width .4–.5s), accordion and carousel-dot changes, Product sticky bar (.3s).
- **Pseudo rules (149 style-* attributes):** hover and active states; 31 of them include instant (non-transitioned) properties.
- **Marquees:** trust bar (24s, below 1024px, pauses on hover/touch) and footer tagline (32s, pauses on hover and keyboard focus).
- **JS scroll and text:** Home carousels support mouse drag with snap, arrows, dots and review autoplay every 6s, held while the track is hovered or touched or focus is inside the reviews section, and resumed on release; Help scrolls to hash targets; My account scrolls to the top when an order opens; Product sets the tab title.
- **Reduced motion:** reveals, twinkle, float, the nav drawer stagger, the cookie wobble, the Confirmation pop, review autoplay and both marquees are switched off. CSS transitions are left to the WordPress theme’s global reduced-motion rule.

## State
Inventoried in `surfaces.json` (58 surfaces, 58 toggling sc-ifs, 94 sc-ifs in total). Prototype state to replace with WooCommerce/session:
- `mm_cart_v2`: `[{ key, id, name, variant, price, qty, img }]`; the key encodes the configuration (`zookies-20-oat-milk-strawberry+mango-sub4`).
- `mm_gift_v2`: `{ on, message, to, from, hide, wrap }`. The UI writes `on`, `message` and `to` (her name, at checkout).
- `mm_order_v2` (last order): `{ no: 'MM-####', placed, status, bake: { date, dow, day, mon, orderBy, arrive, iso }, items, gift, total, delivery, method, email, address, account }`.
- `mm_account_v1`: `{ signedIn, first, last, email, phone, marketing, addresses: [{ id, name, line1, line2, town, postcode, def }], subs: [{ id, name, variant, price, freq, nextIso, skippedIso, status: active|paused|cancelled, img }] }`. First sign-in without a stored account seeds a demo account (Aisha Khan, two addresses, one subscription).
- `mm_orders_v1`: orders placed while signed in (newest first), plus two seeded demo orders. Subscription lines in a signed-in order become subscriptions with `nextIso` one interval after the bake.
- SignIn: `mode` (`signin|register|forgot|sent|reset|done`), field values, `err`. Account: `tab`, `orderNo`, `confirm`, `editing`, `form`, `det`, `saved`, `pwSaved`.
- Builder: `base`, `chip`, `flav[≤3]`, `size`, `sub`, `freq`; Product also `qty`, `amount`, `giftOn`, `msg`, `img`, `acc`, `barOn`.
- Gifts: `occ`, `budget`, `to`, `note`, `from`. Help: `q`, `cat`, `open`. Contact: `topic`, `sent`. Checkout: `gift`, `method`, `sumOpen`, `email`, `makeAcct`, `first`, `addr`. Header: `nav`, `basket`. Footer: `tagHover`, `tagFocus`.

WooCommerce mapping: pack × base × chips as variations; flavours as a product add-on field stored as order-item meta (not variations); subscriptions through WooCommerce Subscriptions; gift cards through a gift-card plugin; gift note and recipient name as order-item meta plus a packing-slip rule that hides prices. Accounts: WooCommerce My Account (orders, addresses, account details, lost-password flow) with WooCommerce Subscriptions’ skip / pause / change frequency / cancel actions; checkout keeps guest checkout on with an optional create-account checkbox. The bake date should be order meta so My account and the confirmation can show it.

## Business details
- Prices: Zookies 8 £9.50 (£1.19 each), 20 £21.50 (£1.08), 40 £38 (£0.95); Taster Trio £5 postage included; New Baby Gift Box £15; 40-Day Care Bundle £42 (6 weekly deliveries); Baby Shower Gift Card £15 / £25 / £40.
- Subscribe & save: 10% off every box, every 2 or 4 weeks, free delivery on 20 and 40 packs, a guaranteed slot in every bake, skip / swap / cancel online.
- Delivery: Royal Mail Tracked 48 £3.95, free when the subtotal is £35+ or the basket is only Taster Trio / gift cards; Tracked 24 £5.45. Promise: baked to order, with you in 3–5 days.
- Bake schedule (`MM.bakes`): next Monday, order by Sunday 8pm. Stored on the order and shown on Confirmation and in My account.
- Allergens: oats (gluten), eggs, milk, fenugreek (legume; may cross-react with peanut/soy); kitchen handles tree nuts; vegan base has no eggs or dairy.
- Reviews: Trustpilot 4.3 from 8 reviews; the six review texts in `store.js` are real customer content.
- Contact: `Zainab@mamasmunches.com`, Instagram `@mamasmunches`, WhatsApp number to be supplied.

## Design tokens
`tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css` (brand palette, type, spacing, radii, shadows, motion). Apply them to `theme.json` first. Key values: cocoa #3A2A22 (text, outlines, shadows), cream #FBF3DC, paper #FFFAF0, pink #EE8088, pink-dark #A8404F, pink band #F5C2C8, pink soft #F9D5D3, yellow #F9CF6E, yellow soft #FCEBBE, body #4E3C31, muted #5E4A3D / #6B5646, script #8E3444 / #7A5A12. Fonts: Young Serif 400, Karla 400–700, Caveat 500–700 from Google Fonts. The theme caps at two font files per site, so either self-host a Latin one-weight Caveat subset or fall back to Young Serif italic.

## Assets
`assets/logo-horizontal.png`, `assets/logo-round.png` (client logos) and six product photos (`photo-bags-pink.jpg`, `photo-bun-case.jpg`, `photo-gift-heart.jpg`, `photo-hero-mug.jpg`, `photo-pair-love.jpg`, `photo-tray-love.jpg`), all the shop’s own. Icons are inline stroke SVGs in the drafts (basket, account/person, Instagram, WhatsApp, email, lock, search, trust-bar icons) plus glyphs ✦ ♥ ✓ → ★. No font files are bundled. In production, the Instagram strip should come from a feed plugin (e.g. Smash Balloon) and reviews from the Trustpilot sync.

## Block mapping (SGS)
Restyle = block exists, new tokens only · Extend = needs a variant or attribute · New = nothing covers it.
- Announcement strip: sgs/notice-banner (Restyle). Header: sgs/site-header + nav-bar-menu (Restyle). Nav drawer tiles: sgs/nav-drawer-menu (Extend). Basket drawer: sgs/cart (Extend: progress bar, gift note). Footer: sgs/site-footer + rows, social-icons (Extend: Instagram feed, marquee reusing trust-bar autoScroll).
- Home: hero (Extend: polaroid stack, greeting script); trust-bar (Restyle: autoScroll, autoScrollBelow 1024, pause on hover); path cards card-grid (Restyle); **builder + live cookie (New)** on option-picker + buybox; gifts carousel card-grid with drag (Extend: dots/arrows); recipe card info-box (Restyle); story media + text (Restyle); review slider testimonial-slider / trustpilot-reviews (Restyle); FAQ accordion (Restyle).
- Shop: archive-product, sgs-archive-toolbar, product-card, filter-search (Restyle). Gifts finder: choice-flow (Extend); gift-note preview (New). Help: accordion + filter-search (Extend). Contact: form + form-field-tiles, whatsapp-cta (Restyle; conditional fields may need a form rule).
- Product: buybox gallery, option-picker (Restyle); **multi-flavour add-on (New)**; **subscribe row (New, plugin)**; **gift note (New)**; assurance icon-list (Restyle); accordion (Restyle); **sticky mobile bar (New)**; **gift-card amounts (New, plugin)**.
- Basket: cart template (Restyle). Checkout: checkout template (Extend: recipient name on the gift fork; optional create-account checkbox; express pay from Stripe/PayPal). Confirmation: order-confirmation part (Extend: bake date, account card).
- Header account icon and the drawer’s account block: sgs/site-header + nav-drawer-menu (Extend). Drawer socials: social-icons with a labelled-tile variant (Extend); Trustpilot card: trustpilot-reviews summary (Restyle); drawer stagger: nav-drawer entrance option (Extend). Sign in / register / lost password: WooCommerce my-account form templates (Restyle). My account: WooCommerce My Account endpoints for orders, view-order, edit-address, edit-account (Restyle), and WooCommerce Subscriptions’ subscription endpoints (Extend for skip and the inline cancel confirm).
- Admin: variations for pack × base × chips; subscriptions, gift cards, Royal Mail rates + free-over-£35, Trustpilot sync URL, Instagram feed; turn off WooCommerce Coming Soon before launch.

Build order: 1 tokens, fonts, outline/shadow primitives; 2 header, footer, trust bar, product card; 3 Home sections; 4 PDP flavour add-on, subscribe row, gift note; 5 basket/checkout gift flow; 6 Gifts finder, Help search, Contact.

## Open items
Client to supply: WhatsApp number, allergen list per flavour, storage times, privacy and terms text, delivery prices/timings confirmation. Plugins: WooCommerce Subscriptions, gift cards, Stripe, Royal Mail shipping, Instagram feed, Trustpilot.

**Inert in the draft, by decision. What each becomes:**
- Express pay (Apple Pay / Google Pay on Basket and Checkout, PayPal on Checkout): Apple Pay and Google Pay through the card processor; PayPal through the existing PayPal integration.
- Find address: UK postcode lookup.
- Discount code Apply: the shop’s WooCommerce discount codes.
- WhatsApp channel card (and the WhatsApp links that point to Contact): a `wa.me` link to the business number.

**Decisions applied on 2026-10-11:** cookie wobble skipped under reduced motion; transitions left to the theme’s global reduced-motion rule; review autoplay off under reduced motion and paused while hovered, touched or focused; footer tagline pauses on hover and keyboard focus; unused `@keyframes` copies left in place; recipient name and note saved (the gift goes to the delivery address); Subscribe & save and Help active states; bake date on Confirmation; product name as the Product tab title; customer accounts added.

**Still open** (`surfaces.json` → `unresolved`): sign-in and password reset are simulated in the prototype; real authentication and reset tokens come from WooCommerce.

Runtime-trap scan (CLAUDE.md): no hits in any draft.

## Files
- Pages: `Home`, `Shop`, `Product`, `Gifts`, `Basket`, `Checkout`, `Confirmation`, `Contact`, `Help`, `SignIn`, `Account` (`.dc.html`)
- Mounted by the pages: `SiteHeader`, `SiteFooter`, `ProductCard` (`.dc.html`)
- Scripts: `support.js` (runtime), `store.js` (prototype data, loaded in every page helmet and SiteHeader)
- `assets/`, `tokens/`, `animations.json`, `surfaces.json`, `READING-DC-FILES.md`, `handoff-schema/`, `MANIFEST.md`
