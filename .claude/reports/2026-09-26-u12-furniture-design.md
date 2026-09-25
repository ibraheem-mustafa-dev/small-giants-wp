# U-12 design: header and footer furniture (Wave 3C lane C)

Status: design (no Bean sign-off needed for U-12; the dark palette and wishlist shapes were researched and approved by Bean on 2026-09-25). Governing: `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` §4 (U-12 row, parallel dispatch rules), §5; family M-18 in `.claude/reports/reference-requirements/families-master.json`.

Bean's rulings (2026-09-25): back-to-top and account are `sgs/button` link sources; sound is an `sgs/audio` style; languages are hand-set and use PHP `intl` for names and tags; the automatic dark palette follows the minimum-change rule; the wishlist is two-tier with a saved-items panel under the basket and Save for later; inside menus, account and wishlist are ordinary menu links.

Every new block follows `plugins/sgs-blocks/CLAUDE.md` (Block Customisation Standard) and the Builder contract in the lane C plan. Every stream ships a standalone PHP test with a negative control.

## Exit cells (M-18; values read from each `<ref>.json::rows[].cells`)

| Ref | Surface / tier | Cell (column: value) | Expressed by |
|---|---|---|---|
| buck | footer / all | secondary_blocks: 5 live clocks "LA→ 10:49 AM", NY, SYD, AMS, LDN | five `sgs/local-time` blocks: `hourCycle: h12`, `showSeconds: false`, `label: "LA"`, `separator: "→"` |
| studionamma | bar / 768, 1440 | "PARIS, FRANCE" + "19:48:38" | `sgs/local-time` `hourCycle: h23`, `showSeconds: true`, `label: "PARIS, FRANCE"` (rotating cities: U-15) |
| dogstudio | footer / all | "Language: English Español" | `sgs/language-switch` `display: inline`, `prefixLabel: "Language:"`, `labelStyle: autonym` |
| lamalama | footer / 375, 768 | "NL / EN", hidden "Switch to Nederlands" | `display: inline`, `labelStyle: code`, `separator: "/"`; accessible name per item |
| studionamma | footer / all | "Site en Français" | `display: single-link`, `labelStyle: custom` |
| away | footer / all | country button "United States", 16×12 flag, `aria-expanded` | `sgs/store-selector` |
| away | header-shell / 1440, drawer | "Select store / Store, London" | `sgs/store-selector` `triggerPrefix: "Select store"` (drawer copy via U-10 hide-by-tier) |
| lusion | footer / 375, 768, 1440 | up button 45 / 52.5 / 54 px, radius 100% | `sgs/button` `linkSource: top`, icon only, per-tier `minHeight` and width, `borderRadius` 50% |
| away | bar / all | wishlist 24×24 icon | `sgs/wishlist-link` |
| away | bar / 1440 | "Log in" account link 48×57 | `sgs/button` `linkSource: account`, icon, `labelCollapse` |
| butcherbox | bar / 1440 | "Sign In" white pill 135×44 | `sgs/button` `linkSource: account` |
| studionamma | bar / 768, 1440; 375 | "DARK MODE" text button, `aria-pressed`, label roll; 26×26 icon at 375 | `sgs/theme-toggle` `toggleStyle: switch`, `labelRoll`, `iconOnly` per tier |
| lusion | bar / 1440 | sound button 44.8 px, soundwave | `sgs/audio` `playerStyle: toggle` |
| resn | trigger / 768, 1440 | "Audio" 24×16 | `sgs/audio` `playerStyle: toggle`, `toggleLabel: "Audio"` |

## §A `sgs/local-time` (new block)

| Attribute | Type | Default | Control |
|---|---|---|---|
| `timeZone` | string (IANA) | "" (= site zone `wp_timezone_string()`) | ComboboxControl from `Intl.supportedValuesOf('timeZone')` |
| `label` | string | "" | TextControl |
| `labelPosition` | enum `before` / `after` / `above` | `before` | ToggleGroupControl |
| `separator` | string | "" | TextControl (e.g. "→", ",") |
| `hourCycle` | enum `h12` / `h23` | `h23` | ToggleGroupControl |
| `showSeconds` | boolean | false | ToggleControl |
| `showPeriod` | boolean | true | ToggleControl (AM/PM, h12 only) |
| `labelColour`, `timeColour` (+ `Hover`, `Gradient` companions per SgsColourPanel rows) | string | "" | SgsColourPanel |
| typography per element (`label`, `time`) | per TypographyControls | | TypographyControls |
| `gap` | object tier | {} | ResponsiveControl |

Markup: `<span class="sgs-local-time"><span class="sgs-local-time__label">…</span><span class="sgs-local-time__sep" aria-hidden="true">…</span><time class="sgs-local-time__time" datetime="{ISO 8601 with offset}" data-zone="{zone}" data-cycle="h23" data-seconds="0">19:48</time></span>`. Server renders the current time in the zone (`DateTimeImmutable`, `DateTimeZone`), so no-JS and cached pages show a time; the view module corrects it on load, then ticks at the next second or minute edge with `Intl.DateTimeFormat(locale, {timeZone, hourCycle, …})`, pausing while `document.hidden`. Tabular numerals (`font-variant-numeric: tabular-nums`) stop the width jiggling. No `aria-live`, no `role="timer"`. Invalid zone → site zone. Test: London and Hong Kong across a DST date; h12 vs h23; negative control: an invalid zone must fall back to `wp_timezone()`, not UTC.

## §B `sgs/language-switch` (new block)

| Attribute | Type | Default | Control |
|---|---|---|---|
| `display` | enum `inline` / `single-link` / `disclosure` | `inline` | ToggleGroupControl |
| `prefixLabel` | string | "" | TextControl |
| `labelStyle` | enum `autonym` / `code` / `custom` | `autonym` | ToggleGroupControl |
| `separator` | string | "/" | TextControl (inline only) |
| `languages` | array of {code, url, customLabel} | [] | repeater in the inspector (add, remove, reorder) |
| colour rows `linkColour`, `linkColourHover`, `currentColour`, `separatorColour`, panel `panelBackground` | string | "" | SgsColourPanel |
| typography, `gap` (tier), panel padding (tier) | | | TypographyControls, ResponsiveControl |

Each item renders `<a href lang="{bcp47}" hreflang="{bcp47}">`; the tag is `Locale::canonicalize($code)` with `_` → `-`; the autonym is `Locale::getDisplayLanguage($code, $code)` with the first letter upper-cased (`mb_convert_case`); code style prints the upper-cased primary subtag; if `class_exists('Locale')` is false: `customLabel`, else the upper-cased code. The item matching `get_locale()` (primary subtag) gets `aria-current="true"` and is not a link in `single-link` mode (that mode prints only the first non-current item). `disclosure`: a `<button aria-expanded aria-controls>` showing the current language, a list below, Escape closes and returns focus, outside click closes. Test: `es` → "Español", `en_GB` → `hreflang="en-GB"`; negative control: with `Locale` unavailable (the test runs the helper with an injected flag) the typed label is used, never an empty string.

## §C `sgs/store-selector` (new block)

| Attribute | Type | Default | Control |
|---|---|---|---|
| `triggerPrefix` | string | "" | TextControl (away: "Select store") |
| `stores` | array of {label, url, flagId} | [] | repeater with MediaUpload per flag |
| `flagSize` | object tier {w,h} | {} (16×12) | ResponsiveControl |
| `panelAlign` | enum `start` / `end` | `start` | ToggleGroupControl |
| colour rows (trigger text, hover, panel background, item text, hover), border via SgsBorderControl | | | |
| typography, `gap`, panel padding (tiers) | | | |

Markup: `<div class="sgs-store-selector"><button class="sgs-store-selector__trigger" aria-expanded="false" aria-controls="…">[prefix] <img …flag alt=""> Current</button><ul class="sgs-store-selector__list" hidden>…<a href aria-current>…</a></ul></div>`. Current store: the item whose URL host equals the request host and whose path is the longest prefix of the request path; otherwise the first. Escape closes and returns focus; outside click closes. No-JS: the list is a `<details>`-style fallback (the button toggles `hidden`; without JS the list renders visible). Test: matcher (exact, prefix, none); negative control: a broken matcher must no longer pick a later matching item.

## §D Automatic dark palette + `sgs/theme-toggle`

### D.1 Where the colours come from

`plugins/sgs-blocks/scripts/derive-dark-palette.py::derive( snapshot: dict ) -> dict` runs inside `push-theme-snapshot.py::prepare_deploy_snapshot`, the one function both the snapshot push and `build-deploy.py` use to produce a client's `theme.json`. So every deploy carries the dark colours, and nothing ships them separately.

Configuration lives in the snapshot's top-level `_sgsDark` key (underscore keys are internal, like `_sgsExtractor`; stripped before deploy):
```json
"_sgsDark": { "enabled": true, "palette": { "primary": "#f4a3b5" }, "roles": { "cookie-brown": "brand" } }
```
Output: `settings.custom.dark = { "<slug>": "#rrggbb", … }` for every palette slug. WordPress prints it as `--wp--custom--dark--<slug>`.

### D.2 Roles (any slug, not a fixed list)

Each slug gets a role from `_sgsDark.roles`, else from its name:
- `surface`: `surface*`, `*-bg`, `background*`, `base*`, and `footer-bg`. Mapped onto a dark band: the base `surface` sits at OKLCH L 0.18; other surfaces sit at L 0.21 to 0.27 in their original lightness order. The hue is kept and chroma capped at 0.03, so a tinted cream becomes a tinted near-black.
- `text`: `text*` and `*-text`. `text-inverse` is paired with the brand fill it sits on (primary), not with a surface.
- `border`: `border*`.
- `locked`: `whatsapp`, plus anything listed in `roles` as locked. Never changed, only checked.
- `brand`: everything else (`primary`, `accent`, `success`, `error`, `info`, `*-light`, `*-dark`, client names like `cookie-brown`).

### D.3 The minimum-change rule (Bean, 2026-09-25)

Every non-surface colour is first tested unchanged against its paired dark surface (the base `surface`; text also against `surface-alt` when present). If it passes, it is kept byte-identical. Otherwise its OKLCH lightness moves the shortest distance that passes, usually lighter, with hue and chroma kept (chroma reduced only if the colour leaves sRGB). Targets:
- text: 4.5:1;
- border and brand: 3:1 (non-text UI, WCAG 1.4.11);
- a brand colour used as a button fill: its own paired text (`text-inverse` or the auto-contrast text) must still reach 4.5:1 on it, else that text colour is solved instead.

Hand-set `_sgsDark.palette` values win and are checked the same way. OKLab conversion uses the standard Björn Ottosson matrices inline (no new dependency), and the WCAG 2.1 relative luminance matches `scripts/nav-qa/palette-contrast-sweep.mjs`. Any failing pair makes the script exit non-zero, naming the pair and ratio, and the deploy stops.

Tests (`plugins/sgs-blocks/scripts/tests/test_derive_dark_palette.py`), run on the real Mama's Munches snapshot:
- an already-passing light colour comes out byte-identical;
- a mid-tone brand colour comes out lightened and passing;
- a locked colour is unchanged;
- every surface has L ≤ 0.27;
- negative control: forcing a near-white text on a light surface (by a `roles` override that makes a light slug a surface) must make the gate fail.

### D.4 Page side

- `theme/sgs-theme/assets/css/dark-mode.css`: generated rules map every palette slug to its dark value under `:root[data-theme="dark"]` and `:root[data-theme="auto"][data-prefers-dark="true"]`. Because slugs vary per client, the stylesheet cannot list them. Instead `functions.php` prints the mapping as an inline stylesheet built from `wp_get_global_settings( array( 'custom', 'dark' ) )` (`--wp--preset--color--<slug>: var(--wp--custom--dark--<slug>)` per slug), attached to the `sgs-dark-mode` handle. The existing image-dimming and shadow rules in `dark-mode.css` stay; its hard-coded teal and orange values go.
- Enqueue: in the head whenever `custom.dark` is non-empty (replaces the unset `sgs_dark_mode_enabled` option). A client with `_sgsDark.enabled` gets dark for visitors whose OS is dark, even without a toggle (KJC-3).
- `dark-mode.js`:
  - reads `prefers-color-scheme` live;
  - supports `light`, `dark` and `auto` (`data-theme="auto"` plus `data-prefers-dark`);
  - a toggle click flips between light and dark from the currently shown state;
  - sets `aria-pressed` and `aria-checked` on every `.sgs-dark-mode-toggle` and `[data-sgs-theme-choice]`;
  - fires `sgs-theme-change`.

  The anti-flash head script (`functions.php::dark_mode_inline_script`) stays and reads the same key.
- Dark logo: `sgs/responsive-logo::darkLogoId` (U-17 builder, the same block).

### D.5 `sgs/theme-toggle` (new block)

| Attribute | Type | Default | Control |
|---|---|---|---|
| `toggleStyle` | enum `switch` / `segmented` | `switch` | ToggleGroupControl |
| `label` | string | "Dark mode" | TextControl |
| `labelRoll` | enum per `includes/helpers-item-effects.php::sgs_label_roll_value` | "" (off) | SelectControl |
| `iconOnly` | object tier (boolean per tier) | {} | BooleanResponsiveControl |
| `iconLight`, `iconDark` | icon names via IconPicker | `sun`, `moon` | IconPicker |
| colour rows (text, hover, pressed, icon), border, radius, padding (tier), typography | | | the standard components |

`switch`: `<button type="button" class="sgs-theme-toggle sgs-dark-mode-toggle" aria-pressed="false">` with the visible label (visually hidden, but still the accessible name, when icon-only at a tier), the roll markup from `sgs_label_roll_markup`. `segmented`: `<div role="radiogroup" aria-label="Colour scheme">` with three `<button role="radio" aria-checked data-sgs-theme-choice="light|dark|auto">`. The block's `render.php` adds nothing when the site has no dark palette, except a comment for editors; the editor shows a notice "Dark colours are off for this site" with the fix. Test: markup for both styles; negative control: an off-enum style falls back to `switch`.

## §E Wishlist (two-tier)

- **Store**: `src/shared/wishlist-store/index.js`, module id `@sgs/wishlist-store`, Interactivity namespace `sgs/wishlist` (unchanged, so product-card's directives keep working). `src/blocks/product-card/wishlist.js` becomes a re-export and `product-card/view.js` imports the shared module. State: `ids` (guest: localStorage `sgs-wishlist`; logged in: `GET /sgs/v1/wishlist`), `count`, `isLoggedIn` (from `data-wp-context` on the block root: `is_user_logged_in()` is safe here because LiteSpeed bypasses the cache for logged-in users). On the first logged-in load with a non-empty browser list: `POST /sgs/v1/wishlist/merge`, then clear the browser key. Toggling while logged in calls `POST /wishlist/toggle`. Cross-tab sync and the `sgs-wishlist-change` event are kept.
- **REST** `includes/class-sgs-wishlist-rest.php` (namespace `SGS\Blocks`, modelled on `includes/class-stock-notify.php`):
  - routes `GET /sgs/v1/wishlist`, `POST /sgs/v1/wishlist/toggle` {productId}, `POST /sgs/v1/wishlist/merge` {ids[]};
  - `permission_callback`: `is_user_logged_in()`; the REST nonce is enforced by core cookie auth (`X-WP-Nonce`);
  - `args` with `validate_callback` and `sanitize_callback` (`absint`); only `publish` products whose type is purchasable;
  - user meta `_sgs_wishlist` = [{id, addedTs}], at most 200 (oldest dropped with a 409 when full on toggle-add);
  - merge unions and keeps the earliest `addedTs`, and is idempotent;
  - `wp_privacy_personal_data_exporters` and `_erasers` registered for `_sgs_wishlist`.
- **`sgs/wishlist-link`** (new block): `<a class="sgs-wishlist-link" href="{wishlistUrl or the page holding sgs/wishlist-panel}" aria-label="Wishlist, {n} items">` with an icon (IconPicker, default `heart`) and a count badge rendered as 0 and hidden by the server (the `sgs/cart` pattern); the store fills it. Attributes: `wishlistUrl` (string, ""), `icon`, `showCount` (true), `showLabel` (tier boolean), `label` ("Wishlist"), colour rows (icon, hover, badge background, badge text), `iconSize` (tier).
- **`sgs/wishlist-panel`** (new block): a heading (`heading`, "Saved for later"), the rows and an empty state (`emptyText`, `emptyLinkLabel`, shop URL from `wc_get_page_permalink('shop')`).
  - Products come from `GET /wc/store/v1/products?include=…&per_page=100`.
  - Each row shows image, name link, price, stock, **Move to basket** (Store API add item via `src/blocks/cart/store-api.js`, then remove from the wishlist), and **Remove**.
  - Out of stock shows **Notify me**, posting to the existing stock-notify route with its consent step.
  - Loading and errors are announced once through one polite status region.
  - Attributes: `columns` (tier), `showPrice`, `showStock`, colour and typography rows, `gap` (tier).
- **Cart page**: `theme/sgs-theme/templates/cart.html` gets `sgs/wishlist-panel` after the `sgs-cart-content` template part, inside the same capped container. It renders nothing when the list is empty unless `showWhenEmpty` is on (default off on the cart page).
- **Save for later (KJC-1, option A)**:
  - an enhancer in `src/blocks/wishlist-panel/view.js` watches `tr.wc-block-cart-items__row` rows with a MutationObserver;
  - it matches each row's `a.wc-block-components-product-name[href]` to the Store API cart item with the same `permalink` (`GET /wc/store/v1/cart`), falling back to no button when there is no exact match;
  - it inserts a `<button class="sgs-save-for-later">Save for later</button>` after the row's `.wc-block-cart-item__remove-link`;
  - clicking adds to the wishlist, then removes the line with the Store API `remove-item` (item `key`), and the Cart block refreshes through `wc/store/cart` data (dispatch `invalidateResolutionForStore` on `wc/store/cart` if `wp.data` is present, else reload the cart block);
  - the same button renders in the `sgs/cart` flyout lines (our own markup).
  - Selectors verified on sandybrown's WooCommerce 11.1.0 `assets/client/blocks/cart.js`.
- Tests: merge union and idempotence, the 200 cap, an unpublished id rejected, a logged-out `permission_callback` refused; negative control: with the `is_user_logged_in` check removed the refusal test goes red. A JS unit test for the permalink matcher (exact match only).

## §F `sgs/button` link sources

`src/blocks/button/render.php`'s inline `switch ( $link_source )` moves to `includes/helpers-link-source.php::sgs_resolve_link_source( string $source, string $typed_url ): array` returning `['url' => …, 'attrs' => [...]]`. `phone`, `email` and `whatsapp` stay byte-identical (a before/after render test proves it).

New sources:
- `top`: `href="#top"`, attr `data-sgs-link-source="top"`. `src/blocks/button/view.js`, a small module enqueued only when a top button renders, scrolls smoothly (instant under reduced motion) and focuses `#wp--skip-link--target`, else `main`, else `h1`, adding `tabindex="-1"` if needed. No-JS: `#top` jumps to the top of the page.
- `account`: `wc_get_page_permalink( 'myaccount' )` when WooCommerce is active, else `wp_login_url()`. The label is static.

`block.json::linkSource` enum and the PHP allow-list gain `top` and `account`; `edit.js` gains the two options, and hides the URL field for both. Test: each source's URL; negative control: an unknown source falls back to the typed URL, and removing the allow-list turns the test red.

## §G `sgs/audio` `playerStyle: toggle`

- `playerStyle` enum and allow-list gain `toggle`.
- New attributes:
  - `toggleLabel` (string, "Sound");
  - `toggleShowLabel` (boolean, default false = hidden visually, still the accessible name) with `toggleShowLabelTablet` and `toggleShowLabelMobile` (null = inherit), the flat per-tier shape `BooleanResponsiveControl` consumes (the before-after `videoAutoplay` precedent);
  - `toggleIcon` enum `bars` / `speaker` (default `bars`).
- Markup: the native `<audio>` stays (so no JS still gives a player, with native controls kept for accessibility). The view module hides it and adds `<button class="sgs-audio__toggle" aria-pressed="false">` with the label, and the icon.
- The `bars` icon is four spans animated from the existing `AnalyserNode` loop while playing; it is static under reduced motion or when paused.
- Pressing plays or pauses this track (the first play is the user gesture, so autoplay policy is met) and writes localStorage `sgs-sound` = `on` / `off`. `off` sets `muted = true` on every other `<audio>` and `<video>` on the page and dispatches `sgs-sound-change`; other blocks can listen.
- On load: `sgs-sound` = `on` does NOT autoplay (browser policy); the button shows "off" until pressed.
- Test: the render with `toggle` has the button hook and `aria-pressed="false"`; negative control: an off-enum style falls back to `minimal`.

## §H Main-thread edits

- `src/blocks/product-search/block.json::supports.sgs.headerEssential: true`. `filter-search` is NOT flagged: it filters shop facets and is used in `templates/archive-product.html`, not a header control.
- Loader `require` lines next to `plugins/sgs-blocks/sgs-blocks.php`'s require of `includes/class-stock-notify.php`; the `webpack.config.js` entry `shared/wishlist-store/index`.

## Risks

1. The Save-for-later enhancer depends on WooCommerce's cart markup. Mitigation: exact-match only, no button on a miss, and the flyout keeps it.
2. Slug-name role guessing can misfile a client colour. Mitigation: `_sgsDark.roles` overrides, and the contrast gate fails closed.
3. Dark mode on without a toggle surprises a client. Mitigation: it is opt-in per client (`_sgsDark.enabled`).
4. Moving the wishlist store could break the product-card heart. Mitigation: the namespace is unchanged, and the Step 12 live check covers hearts and the count in sync across tabs.
