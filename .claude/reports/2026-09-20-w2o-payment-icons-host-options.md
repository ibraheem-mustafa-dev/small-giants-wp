# W2-o payment-logo SVG set: host findings and options (2026-09-20)

## Verdict

WooCommerce already renders an accepted-payment-methods row on the cart page (`theme/sgs-theme/parts/sgs-cart-content.html` embeds `woocommerce/cart-accepted-payment-methods-block`), and the checkout part embeds `woocommerce/checkout-payment-block` for the payment step. That row is a cart-page surface only. SGS has no payment-mark block, pattern or spec requirement, and no footer or header host for a payment-logo set. Nothing was built. Under the brief this stops at options.

## Evidence that no host exists

| Check | Command or file | Result |
|---|---|---|
| Spec 37 (header/footer builder) | Grep `payment\|accepted\|card logo\|Visa\|Mastercard\|PayPal` in `.claude/specs/37-HEADER-FOOTER-BUILDER.md` | 2 hits, both the word "accepted" in unrelated senses (B3 clones, `get_active_id()` draft/pending). Zero payment content. |
| Spec 36 | same Grep over `specs/36*` | 0 hits |
| Theme templates and parts | `grep -rn -iE 'visa\|mastercard\|klarna\|apple pay\|payment' theme/sgs-theme/` | Hits in 2 files only, both WooCommerce block embeds. `parts/sgs-cart-content.html` embeds `woocommerce/cart-express-payment-block` and `woocommerce/cart-accepted-payment-methods-block` (the accepted-methods row, inside the cart totals block). `parts/sgs-checkout-content.html` embeds `woocommerce/checkout-express-payment-block` and `woocommerce/checkout-payment-block` (the payment step). `templates/cart.html` and `templates/checkout.html` are the only templates that use these parts. |
| Footer starter patterns | Same grep over `theme/sgs-theme/patterns` | 0 hits. The 7 `patterns/footer-*.php` carry no payment row, and neither does `framework-footer-default.php`. So the only accepted-methods row is WooCommerce's, on the cart page. There is no SGS host in the footer or header. |
| Plugin blocks | same Grep over `plugins/sgs-blocks/src` | Only `choice-flow` (its own "payment" question wording), not marks. |
| Framework DB | `sgs-db.py sql "SELECT slug FROM blocks WHERE slug LIKE '%pay%'"` | No results |
| Plan row | `.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` W2-o | "No payment-brand SVGs in the repo". No consumer named. |
| Inventory | `.claude/reports/2026-07-28-spec36-37-remaining-work-inventory.md` A2 | "teardown gap 4, narrowed; new, unspecced; trust-bar covers generic already". The only hint at a host, and it is a hint, not a requirement. |
| LEDGER | `.claude/LEDGER.md` | Lists "payment icons" as not done. No design. |

The teardown gap 4 source text was not found in `.claude/` outside those two lines.

## What the code actually has (corrects the "brand-icon registry" assumption)

There is no separate brand-icon registry. `sgs/social-icons` maps each platform to a Lucide icon name (`render.php::$platform_icons`, e.g. `facebook => facebook`, `google => star` with the comment "Lucide ships no Google brand mark") and colours it from a hex map. Lucide has no payment marks; the nearest are `credit-card`, `wallet`, `banknote`.

The shared icon system is:

| Layer | File | Role |
|---|---|---|
| Frontend map | `plugins/sgs-blocks/includes/lucide-icons.php::sgs_get_lucide_icon` (auto-generated), plus `wp-icons.php` | Server-side SVG source |
| Generator | `plugins/sgs-blocks/scripts/generate-icons.js` | Reads `node_modules/lucide-static`, writes the PHP map and preview JSON |
| Editor preview | `src/components/IconPicker/icon-data.js` (Lucide, emoji, WP-icon JSON fetched on demand) via `window.sgsBlocksData.iconAssets` in `includes/class-sgs-blocks.php` | Picker tabs |
| Consumers | `IconPicker` is imported by 18 blocks, including `nav-bar-menu`, `nav-drawer`, `trust-bar`, `icon`, `icon-list`, `social-icons` | One picker feeds all |
| Source switch | `src/blocks/icon/render.php` `switch ( $icon_source )`: lucide, wp-icon, dashicon, emoji | Per-block source dispatch |

## Sourcing check (fetched, not drawn)

Simple Icons 16.31.0, licence CC0-1.0 (`npm view simple-icons license`). Fetched from `cdn.jsdelivr.net/npm/simple-icons@16.31.0/icons/<slug>.svg`:

| Available (16 of 19) | Absent from Simple Icons (3 of 19) |
|---|---|
| visa, mastercard, americanexpress, discover, paypal, applepay, googlepay, klarna, stripe, dinersclub, jcb, bitcoin, samsungpay, alipay, wechat, shopify (each HTTP 200) | maestro, amazonpay, unionpay (HTTP 404) |

Caveat that matters more than the licence: CC0 covers the icon data only. The brands' own guidelines still apply. Apple Pay, Google Pay, Visa and Mastercard publish artwork rules that require their official, unmodified marks. A monochrome silhouette recoloured to a theme token is a modified mark. Simple Icons also ships wordmark-style glyphs, not the recognisable rounded "card plate" logos shoppers expect in a footer row.

## Three options

| # | Option | Touches | Effort | Risk |
|---|---|---|---|---|
| C | Build nothing. Document that clients upload their processors' official artwork into the `trust-bar` image-badge variant, which already works. | Docs only | 5m | No framework-side payment row out of the box; but it is the only option that satisfies each brand's own artwork rules. |
| B | Ship the marks as plain files plus one pattern: `assets/payment-icons/*.svg` in the plugin and a footer pattern "payment row" that lists them through `sgs/trust-bar` image-badge (already takes an image per badge). No JS, no shared code. | New folder, one `patterns/*.php` file | About 30m | Fixed colour (an `<img>` cannot take a theme token). Pattern must build URLs with `plugins_url()`. Same trademark caveat. |
| A | Add a fifth icon source, "payment", to the shared icon system: `assets/icons/payment/*.svg` + a LICENCE/attribution file, generator emits a `payment-icons.php` map and JSON preview, IconPicker gets a tab, `sgs/icon` gets a `payment` case. `icon-list` and `trust-bar` inherit it through the picker. No new block. | Shared `IconPicker.js` (used by the off-limits `nav-bar-menu` and `nav-drawer`), `generate-icons.js`, `class-sgs-blocks.php`, `icon/render.php`, `icon/block.json` enum | About 1h once unblocked | Shared-mechanism change: needs the Rule 7 design-gate and Bean's approval. Trademark exposure as above. 16 of 19 marks only. |

## Recommendation

Option C now, Option A later if a real client build asks for a payment row. The ranking in the table is C, then B, then A.

What WooCommerce's own block changes: it already renders the accepted-methods row on the cart page, and the checkout page has WooCommerce's own payment step. A static SGS mark set would duplicate that for cart and checkout, so those two surfaces are not an unmet need. The only unmet need is a "we accept" row outside the cart (footer, header or product pages), and that is a per-client choice of which processors are shown.

Reasons for C: no spec, pattern or client asks for a footer row today; `trust-bar` image-badge already serves that row with the client's own official artwork; a curated monochrome set is the wrong artwork for the two marks shoppers look for most (Apple Pay, Google Pay require official artwork); and Option A alters the shared picker while other tracks are editing the consumers of that picker. If Bean wants a set regardless, choose Option B (no shared code touched) and treat the brand-guideline caveat as an accepted risk. Option A ranks last because it changes shared code to solve a need that WooCommerce covers on the cart page and `trust-bar` covers elsewhere.

## Side finding

`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` crashes with `sqlite3.OperationalError: no such column: grade` (`cmd_stats`, `blocks.grade`). Unrelated to this task; not touched.
