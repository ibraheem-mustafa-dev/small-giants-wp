# Buybox configurator: a universal "Pick a set" mode for `sgs/buybox` (Mama's batch item B8)

Status: design, council-revised 2026-11-03. Replaces the earlier "third choice-flow layout" plan. Research: `.claude/plans/2026-11-03-buybox-configurator-research.md`. Home spec: Spec 27, new group FR-27-PS (Pick-a-set); Spec 43 FR-43-7 is re-pointed to it.

## In plain English

- A shopper builds a set on the product page itself: picks a pack size, then up to three flavours, and sees a live picture, one summary and one price.
- Everything shows at once. There is no step-by-step flow and no popup.
- Nothing is Zookie-specific. The pack sizes come from the product's own pack attribute, so changing 8/20/40 to 2/4 is a product edit. A clothing shop picks colours for a 5-pack of vests the same way.
- It is a mode. While "Buy box type" is not "Pick a set", none of its controls show and every existing buy box is byte-identical. Turning it on reveals its controls and hides the ones that no longer apply.
- Quizzes with branching stay in `sgs/choice-flow`. This is for "choose these things, add to bag".

## Decisions (Bean, 2026-11-03)

- Flags are set on the product's Attributes tab and stored on the product only (no global option, no override layer). Distribution is one of those flags per group ("Share the pack between these": Don't / Equally / Shopper sets counts), so the product is the only authority; the block has no distribution setting.
- The draft's live preview is built, generic. The draft pre-selects one flavour and will not let the last pick of a required group be cleared; both are built.
- "Shopper sets counts" is the last phase, after Mama's works end to end.
- Subscribe & save stays parked (needs WooCommerce Subscriptions). "Edit picks from the basket" is parked, named.
- Per-pick stock is parked: a flavour can be oversold by design, and the admin panel says so in plain words.

## 1. Data model

- **Roles come from WooCommerce.** A variation attribute is a priced picker (`Product_Manifest::build()` axes); a non-variation attribute is an answer group. Mama's real attributes: `pa_pack-size`, `pa_base`, `pa_chip` are variation attributes (24 variations); Flavour is a new non-variation attribute.
- **Flags live in product meta `_sgs_attribute_flags` only**: `{attrKey: {multi, least, most, overflow, startWith, share}}` with `overflow` one of `refuse` or `replace` and `share` one of `none`, `equal` or `counts`. Written by the panel under each attribute row (`woocommerce_admin_process_product_object`, the product nonce, `current_user_can( 'edit_product', $id )`, every enum and integer sanitised, most clamped to 2 to 12, least to 1..most). Product meta travels with duplicate, import and export.
- **Attribute key:** the taxonomy name for a global attribute (`pa_flavour`); `sanitize_title( name )` for a local one. Option slugs for a local attribute are `sanitize_title` of the option text. Local attributes are supported: `includes/buybox-guided.php::sgs_buybox_guided_groups` only walks taxonomy attributes today and gains a local branch.
- **One group resolver**, `Configurator_Groups::for_product()` (new, `includes/configurator-picks/class-configurator-groups.php`), returns the groups (key, label, role priced or answer, terms with slug, label, colour, image, badge, description, flags). Render and server validation both call it, so visibility and the two-term minimum are the same rules in both.
- **Pack marker is the existing `_sgs_pack_size_axis`** (`includes/class-configurator-meta.php`). No new pack flag, and no auto-detect: an empty marker means the product has no pack.
- **Pack number:** a new term field `_sgs_pack_units` (integer, `absint`, UI in the term screen beside `includes/configurator-term-badge-fields.php`) wins; otherwise the term name must contain exactly one run of digits ("Pack of 8", "8", "40 cookies"). Zero or several runs is unparseable. Unparseable pack terms hide distribution and the per-unit line, and the panel shows a red error naming the term.
- **Existing term fields reused:** `_sgs_swatch_color` (hex, `includes/configurator-term-fields.php`, read through `sanitize_hex_color`), `_sgs_swatch_image_id`, `_sgs_term_badge` (`includes/configurator-term-badge-fields.php`), `_sgs_term_description` (`includes/choice-flow-term-details.php`).
- **Group order is the product's attribute drag order**; the panel says so.
- **Two multi groups with one pack:** the group marked "Share the pack between these" is the split group; any other multi group is a plain list.

## 2. The Attributes panel (owner wording)

- On a variation attribute: one plain line, "This attribute makes variations, so shoppers pick exactly one. To allow several, untick 'Used for variations'.", plus the pack-size toggle (the existing marker).
- On a non-variation attribute: "Shopper can pick more than one", "At least", "No more than", "If they pick one too many: Tell them / Swap out the oldest pick", "Start with" (the pre-selected option), "Share the pack between these". Words like taxonomy, overflow, refuse or replace never appear.
- A live read-back under the pack attribute: "Pack sizes found: 8, 20, 40", or a red "Could not read a number from 'Big box'".
- A note: "Each flavour is not counted in stock, so a flavour can be oversold."

## 3. Distribution and summary

- The group's `share` flag (Attributes tab, "Share the pack between these"): Don't (default) / Equally / Shopper sets counts. It takes effect only when a pack axis exists and all its terms parse; otherwise the group is a plain list.
- Equally: `floor(N/k)` each, the first `N mod k` picks in the order chosen get one extra (20 over 3 is 7, 7, 6). `most` is clamped to the pack size at render and at validation, so a pack of 2 never has three picks. Zero picks shows the "choose" prompt and no split.
- Summary text, setting "Summary text (use {pack} and {split})", default `Your {pack}: {split}`. Tokens: `{pack}`, `{pack_label}`, `{variation}`, `{split}`, `{picks}`, `{count}`. One pick under Equally reads `All {pack} {picks}`. Unknown tokens are removed. Built in a pure module `src/blocks/buybox/configurator-summary.js` with `textContent` only.

## 4. Layout and styling

- Block setting renamed in the UI: "Buy box type: Standard / Step by step / Pick a set". The `buyboxLayout` enum gains `configurator` (UI "Pick a set"), reseeded into `block_attributes`.
- Every group renders at once. Per-group picker look maps onto the existing `pickerStyle` enum, no duplicate: pills use `filled`, `outlined` or `ghost`; tiles use `tile` (image or colour, name, description, badge); swatches are pills with a colour dot from `_sgs_swatch_color`. A `groupStyles` setting keys the choice by attribute key.
- A box around the picker group (`pickerBox` element controls), a pack tile sub-line and badge (term fields), and a `showPriceRow` switch. The other B9 buybox extras (gallery gaps, thumbnail size, main-photo clusters) move to a separate follow-up plan.
- **Live preview** beside the pickers: a base image (block setting, with a CSS gradient fallback) with each picked option's colour or term image layered on at positions from fixed scatter tables, matching the draft's `Home.dc.html` logic (`cookieBg`, a `role="img"` box, dots from a position list, 12 square points for the base-level option and 7 round points cycled across picks). Generic: chips on a vest image, shade dots on a minis tray. `role="img"` with a caption from the template (`{pack} × {variation} {picks}`); the caption is the accessible name. Reduced motion removes the placement transition.
- **buyboxProductId** (integer, default 0 = the queried product) is applied once, right after context resolution in `render.php`, so the manifest, sticky bar, `extras.php`, `gallery-col.php`, the JSON-LD and the pack axis meta all use it. The buy box never prints Product JSON-LD and `configurator-head.php` collects only `sgs/product-card` products, so a pinned buy box adds none (tested). Access: the product must be published (or `read_post` for the viewer) and not password-protected; otherwise nothing renders for visitors, and the editor notice never shows a title or price the user cannot read. The editor preview (`edit.js`, `canvas-mock.js`) honours it. The pattern always passes it explicitly; a query loop is never pinned.

## 5. Behaviour

- **Variation rules reused (Spec 27 FR-27-C1/C2):** combination, availability and out-of-stock handling come from the standard picker. An unavailable tile is disabled with its reason as text. Price reads "from £X" until every variation axis is chosen. Add is disabled with a linked reason until every variation axis is chosen and every multi group has met its least.
- **Pre-select:** "Start with" selects that option on load. In a group with least 1, the last remaining pick cannot be cleared (the draft's behaviour); the tile announces "Keep at least 1".
- **Overflow:** refuse shows the limit message in the live region. Swap replaces the oldest pick, announces "Mango added, Strawberry removed" and offers Undo. `applyPick( order, slug, most, overflow )` is pure and returns `{order, removed}`; the order survives replacement.
- **Undo** is per instance (two buy boxes on a page do not share it), clears on `pageshow` when persisted, and returns focus to the option it restored.
- **No-JS:** degrade to more content. The groups render as real checkbox and radio inputs in a form that posts to the standard add-to-cart URL, and the server rules in section 6 still apply; the preview and live summary simply do not run. (Decided: the form is the fallback, not a message.)
- **Phone:** the existing buy box sticky bar shows price, the one-line summary and Add in this mode; `sticky-bar.js` leaves the variant line to `configurator-view.js`. The summary and the live region are separate from the existing availability region, which Interactivity owns.
- **Add gate:** the Add button stays pressable and carries `aria-disabled` until the picks are valid; pressing it while invalid shows the group's message and links it with `aria-describedby` (a bound `disabled` would be overwritten by the product-card store).
- **Styling settings (live check 2026-11-03):** `pickHideGallery` drops the photo column; the preview box (fill, border colour, width, radius, per-device inner spacing), the summary (its own typography set and colour), the pick-several pills (radius, per-device inner spacing, gap), the priced tiles (per-device inner spacing, gap) and the selected-option fill and border (one pair of custom properties read by every group, pick-several and option-picker) are block settings; the draft's values are set on the clone, never defaults in the framework. The pack tiles show the term description once (the option picker already prints it, so no sub-label key is forwarded) with the badge on the tile's top edge. Group terms follow the product attribute's own option order (`sgs_picks_order_terms`). The Pick a set stylesheet ships in `style-index.css` through `style.css`'s `@import`; an `index.js` import reaches the editor only.
- **Picks reach the server** as `data-extra-picks` on the buy box root, read by `product-card/view.js` into the cart proxy's `picks` argument.

## 6. Price

- The line price is the variation price through `sgs_configurator_mode_price()` and `sgs_configurator_format_minor()` (both exist in `includes/helpers-configurator-pricing.php`). Picks never change it.
- Per-unit: integer pence divided by a positive integer pack, rounded half up, output exactly "£1.19 each"; hidden when the pack is missing or unparseable.

## 7. Cart and validation (in the add-to-cart path, so every route is covered)

- **Where it runs:** `woocommerce_add_cart_item_data` only (priority 12, after `Flow_Fields_Cart::add_cart_item_data` at 11), in `Configurator_Picks::add_cart_item_data`. `woocommerce_add_to_cart_validation` fires after the item data is built and passes it no item data, so the picks are invisible there. This covers the cart proxy, the Store API add-item route and re-orders.
- **Refusals:** a configurator product (any multi flag) added with no valid picks when least is above 0; picks sent for a product or attribute without flags; an attribute that is not a non-variation attribute of the product; a slug that is not one of its options; fewer than least or more than most; duplicates; under Equally or counts, a total that is not the pack. Error text names the group by its own label and never echoes a submitted slug.
- **`picks` REST arg** on the cart proxy route: `type: object`, at most 8 groups, each an array of at most 12 `{slug: string matching [a-z0-9_-]{1,64}, count: integer 0..999}`, with a `validate_callback`. Today `fields` has only `items: object`, so this is a new schema.
- **Source of truth:** when picks are present, every client `fields` row whose label equals a pick group's label is dropped and only the server-built row is stored. Row value is `wp_strip_all_tags` of the labels. The combined list is re-checked against `SGS_FLOW_FIELDS_MAX`, `SGS_FLOW_FIELDS_VALUE_MAX` (the split row for 12 picks must fit 200 characters, else labels are shortened by the same helper).
- **Separate lines:** the same variation with different picks is a different cart line (the picks are in the cart item data, so the cart item hash differs). Tested; the proxy's already-in-cart cooldown (first adds only) still applies per hash.
- **Cart load:** `woocommerce_get_cart_item_from_session` re-validates configurator rows. If the flags or terms changed since the add, the line is flagged with a clear message ("Your flavours need choosing again") and checkout is blocked until removed.
- **Escaping:** the summary uses `textContent`; swatch colour goes through `sanitize_hex_color`; `Flow_Fields_Cart::admin_email_note` and `admin_file_links` output is checked for `esc_html` and fixed if not.
- **Stock per pick** is out of scope (parked).

## 8. Accessibility

- Each multi group is `role="group"` with `aria-labelledby` on a heading carrying the limit ("Flavour, choose up to 3"); options are `role="checkbox"` with `aria-checked`, as in `src/blocks/choice-flow-question/render.php`. Single-pick groups use radio semantics.
- One polite live region per box. Errors show when Add is pressed, linked by `aria-describedby`, input kept. 44px targets, visible focus, full keyboard (Space toggles, arrows within a radio group), colour dots always with the name as text, no animation under `prefers-reduced-motion`.
- Limits reuse `src/blocks/choice-flow/flow-multi.js::parseLimits`, `canAddAnswer`, `meetsLeast` by import.

## 9. Inspector, checklist and preflight

- Hiding follows the pattern `GuidedPanel.js` uses for the guided layout. In Pick a set the guided-only controls are hidden and the standard picker-style control is replaced by `groupStyles`; each hidden control has an `absentWhy`.
- Setup checklist at the top of the panel in this mode: "Pack size found: yes (8, 20, 40)", "Pick-several groups: Flavour", and missing pieces each with a link to the product. A `Product_Preflight` check (`includes/class-product-preflight.php`, FR-27-PREFLIGHT) flags a product with a multi flag whose group has fewer than two options, an unparseable pack term, or `most` above the smallest pack.
- Labels: "Buy box type", "Summary text (use {pack} and {split})". Distribution lives on the product's Attributes tab, not in the block.

## 10. Relationship to other blocks

- `sgs/choice-flow` keeps branching, quizzes, add-on price lists and its own `answersMin` / `answersMax` (FR-43-27). Importing `parseLimits` must leave the lens flow unchanged (proven in commit 0).
- Flow 161 is unlinked from Home and Product and set to draft once both pass on the mirror; it stays as a fixture.
- `sgs/product-card`: no.

## 11. Worked examples

- **Mama's Zookie:** `pa_pack-size` (pack axis), `pa_base` and `pa_chip` (variation, single), Flavour (non-variation, multi, 1 to 3, swap, start with Vanilla), Equally. "Your 20: 7 Strawberry · 7 Mango · 6 Vanilla".
- **Vest 5-pack:** pack axis (3, 5), Size (variation), Colour (non-variation, multi, 1 to 5, tell them), Shopper sets counts. Add enables at 5 picked.
- **Beauty minis:** no pack axis, Shade (multi, 3 to 3, tell them), Don't share. Add disabled until three are picked.
- **Honest limit on genericity:** renaming terms or changing `_sgs_pack_units` from 8/20/40 to 2/4 is a pure edit. Adding a new pack size is a new variation, which WooCommerce still needs (FR-27-R2); the block never hardcodes the sizes.

## 12. Mama's data (mirror only)

- Create Flavour as `pa_flavour`'s equivalent non-variation attribute on the product with 11 options and `_sgs_swatch_color`: Vanilla #F6E7B8, Chocolate #5A3522, Strawberry #E8505B, Mango #F5A623, Banana #F4D35E, Coffee #8A5A3B, Mint #8FD1A8, Caramel #C98A3A, Coconut #FFFFFF (dot gets a 1px border), Pistachio #9DBF6B, Honey #E8B230.
- Flags: Flavour multi, 1 to 3, swap, start with Vanilla. Pack tile sub-lines and badges in `_sgs_term_description` and `_sgs_term_badge` on the three pack terms; `_sgs_pack_units` 8, 20, 40.
- Applied by a script in `sites/mamas-munches-redesign/build/`, then `push-to-remote.sh`.

## 13. Build plan

- **Phase 0, harness (3 commits):** (1) a buybox render snapshot harness with fixtures standard, guided, bound, unbound, plus Eye Care's and Indus's real buy boxes exported read-only from their local mirrors; (2) guided byte-identical snapshot; (3) the lens flow unchanged after the `parseLimits` import. This is the byte-identical proof for every later phase.
- **Phase 1, spike (3 commits):** `buyboxProductId` applied once in `render.php`, access checks and JSON-LD rule, editor preview. Proof: a Home-hosted buy box adds the right variation to the cart.
- **Phase 2, data and server (4+ commits):** product-meta flags and the panel; `_sgs_pack_units`; `Sgs_Configurator_Groups`; `validate`, the `picks` schema and cart hooks, cart-load re-validation; Preflight check.
- **Phase 3, render, behaviour, styles, preview (4+ commits):** the `configurator` layout and `groupStyles`; `configurator-picks.js` and `configurator-summary.js`; the view module (live region, undo, pre-select, no-JS form); the preview; sticky bar; styles with tokens only.
- **Phase 4, inspector and checklist (3 commits):** conditional panel and labels, setup checklist, `pickerBox`, `showPriceRow`, pack tile sub-line and badge.
- **Phase 5, Shopper sets counts (3 commits):** steppers, total rule, summary, validation.
- **Tests, red before green:** PHP `ConfiguratorPicksTest` (fourth pick rejected, unknown slug, variation attribute, product without flags, least unmet on the Store API route, total not equal pack, tampered client row replaced, error text with a hostile slug is escaped, same variation with different picks gives two lines, cart-load re-validation); Jest for `applyPick` (order survives, returns removed), summary (7·7·6, single-pick, unknown token, more picks than pack), per-unit pence (£1.19 each, zero pack hidden). Negative controls: Phase 0 snapshots stay byte-identical; a lens flow unchanged; a product without flags refuses picks.
- **Spec:** confirm FR-27-PS1 to PS5 in Spec 27 (flags and panel, distribution and summary, layout and preview, cart and validation, accessibility); add roster and status-table rows and Status lines; re-point FR-43-7's paragraph and its summary-table row; the `buyboxLayout` enum change is reseeded with `/sgs-update` (`block_attributes`). Then both gate tiers via `build-deploy.py`, `audit-inline-styling.js --check`, `check-md-wrap.py`.
- **Done when, on the Mama's mirror:** compare computed `background-color`, `border`, `border-radius`, `font-size`, `padding`, `gap` of the pack tiles, flavour tiles, preview box, summary and Add button against the draft at 375, 768 and 1440 (FP-11); axe clean on Home and Product at default, three flavours picked, an error shown, and 375 with the sticky bar; the Store API cart line carries Pack size, Base and Chip as variation attributes plus a "Flavour" row, with different picks giving two lines; an order email and the admin order screen read with the row shown; a 375 check that the sticky bar covers neither the live region nor the keyboard; keyboard-only completion; the no-JS form adds; the Phase 0 snapshots stay byte-identical; pack terms edited to 2 and 4 change the page with no code. Bean's eye co-signs (FP-13).

## Parked (named)

- Per-pick stock and child-line bundles, Subscribe & save, "Edit picks from the basket", a free "6 to 24, any mix" total-range stepper.

## Open questions for Bean

- None open. If the Flavour mirror data should be seeded for the vest and minis examples on a scratch product, that is a Phase 3 proof step, not a decision.
