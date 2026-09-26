# FR-30-14 / FR-30-15 design: the customer account area and saved-item alerts

Status: design, awaiting Bean's sign-off (FR-30-14 requires it before the build). Governing: `.claude/specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md` FR-30-14, FR-30-15, FR-30-8 (reference-price rules), FR-30-9 (noindex). Builds on `.claude/reports/2026-09-26-u12-furniture-design.md` §E (the two-tier wishlist).

## 1. Where things stand (evidence)

Baseline captured on sandybrown (WooCommerce 11.1.0, account page = post 16, content `[woocommerce_my_account]` in a `core/shortcode` block, rendered by `page.html`):

- The account page is unstyled. The menu is a bare list of brand-pink links (low contrast on cream), the content starts at the left screen edge (0 px) while the page title sits in the 80 px gutter, and the logged-out log-in box stretches to 1,000 px. The Orders tab at 375 px stacks six links above two info notices.
- Registration on the account page is off on sandybrown (`woocommerce_enable_myaccount_registration = no`), so the logged-out state shows log-in only; the design must handle both.
- WooCommerce 11.1 markup (read from `templates/myaccount/*.php` on the server): `nav.woocommerce-MyAccount-navigation[aria-label="Account pages"] > ul > li.woocommerce-MyAccount-navigation-link--{endpoint}(.is-active)`, `div.woocommerce-MyAccount-content`; hooks `woocommerce_before_account_navigation`, `woocommerce_account_navigation`, `woocommerce_account_content`, `woocommerce_account_dashboard`; menu items from `wc_get_account_menu_items()` via `woocommerce_account_menu_items`.
- The wishlist rows hard-code their labels in JavaScript ("Move to basket", "Remove", "Notify me", "Out of stock"), so an editor cannot change them today.
- **Notify me stores emails but nothing ever sends.** `includes/class-stock-notify.php` writes `{email, ts}` to `_sgs_stock_notify`; no code reads that list when stock returns (grep: the only readers are the admin meta box). FR-30-15 therefore also builds the sender.
- `includes/class-sgs-wishlist-rest.php` is 478 lines (over the 300-line PHP limit); it is split as part of this work.

## 2. Research (sources in §9)

- Account menus: 96% of sites fail to expose all key paths from the account menu; 52% of test users navigate from the dashboard, so it must work as a hub. Best in class (Nordstrom) keeps one persistent menu with every path; failures truncate the menu to about three links (Baymard 2025).
- Order history: show status plainly; keep tracking on the site (Baymard). Guest checkout stays the default; forced account creation costs conversions (Baymard checkout research). M&S offers a guest order-tracking form (order number + email).
- Saved items: 21% of shoppers rely on save features; saving must not require an account (Baymard). The market pattern is a card grid: image, name, price (price-drop shown), stock, per-row move to bag; guests see "sign in to keep your list on every device", never a hard gate.
- Under the basket: Amazon and ASOS keep saved items in the basket journey, below the line items and totals, with Move to basket and Delete per row and a count.
- Alerts: back-in-stock is the highest-converting automation (6.46% signup to purchase); cap at one message per trigger. A pure alert for an item the shopper asked about is a service message under PECR; adding recommendations turns it into marketing.
- Pricing law: CMA209 (the DMCC Act price-transparency guidance) treats a "was £X" as a reference-price claim that must reflect a genuine prior selling price. A comparison with the price when the shopper saved the item is personal history, so it must be labelled as that, never as "was".
- Share by link: private by default; an on/off switch; "new link" revokes the old one; the public view carries product data only (no name, email or address).

## 3. Direction: "calm service desk"

Account pages are for tasks, not browsing. The layout is quiet, card-based and built only from the client's tokens (surface, surface-alt, border, text, accent), so it takes on each client's character without any client value in the framework. The one memorable move: the dashboard answers "where's my order?" first, with a status card and a four-step progress line (Placed, Processing, Dispatched, Delivered, drawn from the WooCommerce order status), before anything else.

## 4. The three surfaces

### 4a. My Account: a new block, `sgs/account`

The account page stays WooCommerce's classic shortcode output (Spec 30 non-goal: no block-based account), but it is rendered by a new dynamic block that wraps it and carries every control. Page content becomes `<!-- wp:sgs/account /-->`; the block's `render.php` calls `WC_Shortcode_My_Account::output()` inside its own scoped wrapper.

Logged in:
- **Desktop (≥ 1024 px, container width):** a left menu column (240 px, sticky) with an icon per item and the active item marked by an accent bar plus bold text (never colour alone); the content column beside it.
- **Tablet and mobile:** the menu becomes a single horizontally scrolling row of pill tabs above the content (the Lane A "Scroll sideways" row pattern), the active pill filled. Every item stays one tap away; nothing hides behind a "menu" button (Baymard: never truncate).
- **Dashboard** (replaces WooCommerce's two-sentence paragraph, through the `woocommerce_account_dashboard` template swap, only inside this block):
  1. greeting: "Hello, {first name}" (editable text with a `{name}` token);
  2. latest order card: number, date, total, item thumbnails (up to 4), status with the four-step progress line, "View order" and (when the order has a tracking link from a shipment-tracking plugin) "Track";
  3. a card grid of every other menu item with a one-line description each (Orders "See and reorder past orders", Saved items "{n} saved", Addresses, Account details, Downloads when present), built from the live menu so plugin endpoints appear too.
- **Orders table:** WooCommerce's own `shop_table_responsive` table, styled; at mobile each order becomes a card (WooCommerce's `data-title` labels), status shown as a chip.
- **Addresses / Account details:** the core forms, styled to the site's form tokens, two address cards side by side on desktop.
- **Saved items tab:** a new `saved-items` endpoint (see 4b) in the menu, placed after Orders.

Logged out:
- Log in and Register side by side on desktop, stacked on mobile (log in first), each in a surface-alt card capped at 480 px; when registration is off, one centred log-in card.
- Optional third card: **Track an order** (WooCommerce's own `[woocommerce_order_tracking]` form, order number + email), off by default.
- Under the log-in card, a line for guests: "No account? You can check out as a guest." (editable, toggle).

Controls (inspector): menu layout per tier (`sidebar` / `tabs`), menu icons on/off, the icon per core item (IconPicker), items to hide (e.g. Downloads for shops that sell nothing downloadable), dashboard greeting, show latest order, show quick cards, card descriptions (text per item), logged-out layout (`side-by-side` / `stacked`), order tracking card on/off with its heading, guest line; colours (menu text, hover, active text, active indicator, card background, card border, heading, status chip), typography (menu, headings, card titles), gap and content width per tier.

New installs: `woocommerce_create_pages` is filtered so WooCommerce creates the account page with `<!-- wp:sgs/account /-->` instead of the bare shortcode; an existing site's page converts in the editor with one click (a `core/shortcode` → `sgs/account` block transform).

### 4b. Saved items page (and the account tab)

One block, `sgs/wishlist-panel`, gains a `layout` setting and everything below; the page, the account tab and the basket all use it.

- **Saved items page** (`layout: grid`): heading with the count ("Saved items (6)"), a sort menu (Recently saved, Price low to high, Price high to low, In stock first), then a card grid (4 / 3 / 2 columns by tier): image, name, price with the price-drop line (4d), stock status, date saved ("Saved 12 Sept"), the primary action (Move to basket; Choose options for products with options; Notify me when out of stock) and a quiet Remove. Guests see a slim banner above the grid: "Sign in to keep your saved items on every device and get price alerts" with a Sign in link. Logged-in shoppers see the alerts opt-in and the share control (4d, 4e) in a bar above the grid. Empty state: a line of text and a "Start shopping" button, editable.
- **Where it lives:** a new WooCommerce page setting "Saved items page" (WooCommerce, Settings, Advanced, Page setup, beside Cart and Checkout), created automatically with the block by the same `woocommerce_create_pages` filter. `sgs/wishlist-link` (the header heart) defaults to that page when its own URL field is empty.
- **Account tab:** the `saved-items` endpoint renders the same block (same attributes as the page's block, read from the Saved items page) inside the account layout, so a logged-in shopper keeps the account menu around it.

### 4c. Saved items under the basket (`layout: strip`)

- Full width below the basket and its totals (never beside the totals, so it never competes with checkout).
- Heading "Saved for later (6)", then a horizontally scrolling row of compact cards (image, name, price, one action), showing up to 4 (editable `maxItems`), and a "View all saved items" link to the Saved items page when there are more.
- Hidden when the list is empty (unchanged); Save for later on basket rows stays as built.
- `theme/sgs-theme/templates/cart.html` sets `{"layout":"strip","maxItems":4}` on its panel.

### 4d. Alerts (FR-30-15)

- **Price at save:** each saved item records the price when it was saved (`savedPrice` in minor units, with the currency), in `_sgs_wishlist` for accounts and a parallel `sgs-wishlist-prices` browser key for guests (fetched from the Store API when the heart is pressed). A merge into an account records the server's current price, never a price sent by the browser.
- **The row:** when the current price is lower than the saved price, the row shows "Price drop: now £8.50 (£10.00 when you saved it)". It is never worded "was £X" and never shows a percentage, because it is the shopper's own history, not a trader reference price (CMA209); the FR-30-8 reference-price badge stays a separate, operator-entered thing. The wording is editable with `{now}` and `{saved}` tokens.
- **Opt-in (logged-in shoppers):** two unticked checkboxes in the saved-items bar: "Email me when a saved item drops in price" and "Email me when a saved item is back in stock", each with the privacy-policy link, stored per shopper with the time of consent. Guests are invited to sign in instead. Pure service messages: the payload carries only the shopper's own items, no recommendations.
- **Client toggles:** price-drop alerts, back-in-stock alerts and sharing are site-wide switches shown in the Saved items panel's inspector ("applies to the whole site"), stored as registered site settings through the block editor's own site-entity save (the core Site Title block's mechanism), so the scheduled job can read them.
- **Sending:** an Action Scheduler job (bundled with WooCommerce) runs twice a day over opted-in shoppers, compares each saved item's current price and stock with the last values it alerted on, and sends at most **one** N8N webhook event per shopper per run (`sgs_wishlist_alert`, listing every changed item). Each item then stores the new baseline, so the same drop or restock never alerts twice. Price drops count only below the lowest price already alerted.
- **The existing Notify me list:** a product (or variation) moving to in stock queues one async `sgs_back_in_stock` webhook event with that product's subscriber emails, then clears the list (each request is answered once). Never `wp_mail()`.

### 4e. Share by link

- Logged-in shoppers only (a guest list lives in one browser). A "Share my list" switch in the saved-items bar; on first use it creates a random 32-character token; the panel shows the link with a Copy button and a "Make a new link" action that replaces the token (the old link stops working).
- The link is the Saved items page with `?sgs-list={token}`. That view is read-only (heading "A saved list", rows with Add to my saved items and Move to basket, no Remove, no dates, no name or email), noindexed, and served by a rate-limited public route that returns only published, visible products.

## 5. Build plan (files)

- New block `src/blocks/account/` (block.json, edit.js split into inspector panels, render.php, style.css, editor.css, index.js, save.js, transforms.js).
- `includes/account/`: `class-account-endpoints.php` (saved-items endpoint, menu filter, hidden items, titles, rewrite flush on version change), `account-dashboard.php` (the dashboard template), `class-account-pages.php` (`woocommerce_create_pages`, the Saved items page setting).
- `includes/wishlist/`: the REST class split into `class-wishlist-store.php` (read/write/prices), `class-wishlist-rest.php` (routes), `class-wishlist-alerts-rest.php` (opt-in, share), `class-wishlist-share.php` (public route), `class-wishlist-alerts-scan.php` (Action Scheduler job), `class-stock-notify-dispatch.php`, and a shared `class-sgs-webhook.php`.
- `src/blocks/wishlist-panel/`: `layout`, sort, labels as attributes, price-drop line, alerts bar, share bar, guest banner, strip layout; `src/shared/wishlist-store/` gains saved prices.
- `theme/sgs-theme/templates/cart.html` (strip layout); `includes/class-noindex-store-pages.php` (shared-list view); `scripts/wc-pages-responsive-audit.js` gains the account and saved-items pages (logged out and logged in).
- Tests: PHP (endpoint, menu hiding, dashboard swap, price-drop detection and one-alert-per-change, dispatch clears the list, share token revoke and public output with no personal data, alert toggles respected) each with a negative control; JS (sort, price-drop line).

## 6. Done when

All three surfaces built with every value an editor control; live at 375, 768 and 1440 with axe 0 on sandybrown (logged out, logged in: dashboard, orders, addresses, account details, saved items; Saved items page as guest and logged in; cart with saved items); a price change on a saved product shows on the row and, for an opted-in shopper, sends one webhook event, and a second scan sends none; the stock-notify list is sent once and cleared on restock; opt-ins and client toggles work from the editor.

## 7. WooCommerce core overlap (checked 2026-09-26)

- **WooCommerce 11.2** (`11.2.0-beta.1`, 2026-09-21; stable expected early October; sandybrown runs 11.1.0, 11.1.2 is current stable):
  - **Back-in-stock notifications** (`src/Internal/StockNotifications/`) register unconditionally (`includes/class-woocommerce.php` at tag `11.2.0-beta.1`); shopper sign-ups are off until the merchant enables `woocommerce_customer_stock_notifications_allow_signups`. It has double opt-in, an admin list, WooCommerce emails (sent by WordPress mail, not N8N) and a `stock-notifications` account tab. In 11.1 it is an alpha behind the `WOOCOMMERCE_BIS_ALPHA_ENABLED` constant. Its PHP classes are marked `@internal`.
  - **Shopper lists: Wishlist and Save for later** (`src/Internal/ShopperLists/`, blocks `woocommerce/wishlist` and `woocommerce/add-to-wishlist-button`, Store API `ShopperListItems`): `is_experimental: true`, `enabled_by_default: false` (`FeaturesController.php` at the same tag). Logged-in only (`permission_callback: is_user_logged_in`), stored in user meta, saves the variation too, account endpoint `wishlist`. No guest lists, no saved price, no alerts, no sharing.
- Consequence for this design:
  - The SGS wishlist stays the product: it does what core's experimental lists cannot (guests, merge at log-in, price drops, sharing). Watch item: when core's lists leave experimental, compare again and decide whether the logged-in tier should sit on them.
  - Back-in-stock: build the small N8N sender for the existing Notify me list now (works on 11.1, follows the N8N rule, about 80 lines), or wait for 11.2 and switch Notify me to core's system (maintained, double opt-in, but WordPress mail and an internal PHP API). Decision 4 below.
- Implementation details confirmed from the scan: WooCommerce's responsive tables label mobile cells from `data-title` (style that, never hard-code labels); the log-in and register columns (`#customer_login.u-columns.col2-set`) exist only when registration is on; a custom endpoint's rewrite rule is self-healed (check `rewrite_rules` for the endpoint and flush only when it is missing), not flushed once on activation; menu icons go on `.woocommerce-MyAccount-navigation-link--{endpoint}::before` (the labels are escaped text, so no markup can be added to them).

## 8. Decisions for Bean (recommendations in bold)

1. The price-drop wording: **"Price drop: now £X (£Y when you saved it)"** vs "was £Y" (legal risk under CMA209) vs a bare "Price dropped" chip with no old price (safe but less useful).
2. One opt-in covering both alerts vs **two separate checkboxes** (the spec says each alert is its own opt-in; two ticks is clearer consent).
3. Mobile account menu: **scrolling pill tabs** vs a dropdown select (one tap less discoverable) vs an accordion.
4. Back-in-stock sending: **build the N8N sender for the existing Notify me list now** vs wait for WooCommerce 11.2 and move Notify me onto core's system.

## 9. Sources

- Baymard, accounts and self-service 2025: https://baymard.com/blog/current-state-accounts-selfservice
- Baymard, checkout flow: https://baymard.com/blog/checkout-flow-ux-optimization
- M&S guest order tracking: https://www.marksandspencer.com/orders-and-returns/guest-order/order-tracking-form
- Amazon Save for later analysis: https://medium.com/@femon020531/feature-analysis-shopping-cart-save-for-later-functionality-d3ec22b12da9
- ASOS saved items: https://www.asos.com/basket/pgeSavedList.aspx
- Klaviyo back-in-stock: https://help.klaviyo.com/hc/en-us/articles/115003872251 ; https://www.groovecommerce.com/ecommerce-blog/klaviyo-back-in-stock/
- CMA209 price transparency: https://assets.publishing.service.gov.uk/media/691b10065a253e2c40d705d9/Price_transparency_-_CMA209_.pdf
- ICO PECR electronic mail marketing: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/
- Wishlist sharing permissions: https://savetowishlist.com/wishlist-sharing-and-permissions/
- WooCommerce account templates (trunk): https://github.com/woocommerce/woocommerce/tree/trunk/plugins/woocommerce/templates/myaccount
- WooCommerce `CustomerAccount` block (header link only): https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/src/Blocks/BlockTypes/CustomerAccount.php
- Core stock notifications: https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/src/Internal/StockNotifications/StockSyncController.php
- Core shopper lists (11.2.0-beta.1): https://github.com/woocommerce/woocommerce/tree/11.2.0-beta.1/plugins/woocommerce/src/Internal/ShopperLists
- YITH Wishlist (price at save, token share URL): https://github.com/yithemes/yith-woocommerce-wishlist
- Self-healing endpoint rewrite flush: https://github.com/vapvarun/wb-gamification (audit/journeys/release/15-member-surfaces.md)
