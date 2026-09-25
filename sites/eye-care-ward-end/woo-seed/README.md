# Eye Care Birmingham — WooCommerce seed

Repeatable WooCommerce shop-data seed for Ward End Eye Care, built from the Claude Design
draft so the same script can seed the client's real site later (point it at a different
draft/target and re-run).

## What it seeds

- Store currency: GBP
- **Product brands** (`product_brand` core WooCommerce taxonomy) — 40 terms from the draft's `BRANDS` list
- **Global attributes** (all type `select` — see "Colour/Image swatch test" below):
  - `pa_colour` — 12 terms, each carrying its hex value on `_sgs_swatch_color` term meta
    (this key is already registered by the framework's `Configurator_Meta` class, so any
    future SGS swatch-rendering block can read it with no new meta key)
  - `pa_shape`, `pa_material`, `pa_frame-type`, `pa_hinge`, `pa_nose-pad`
- **16 variable products**, one per draft `PRODUCTS` entry, SKU = the draft's `code` field
  slugified (e.g. `RB3025 · 001/58` → `RB3025-001-58`). One variation per colour × size.
- **`pa_frame-size`** — a second variation attribute, added so a product with more than one
  real-world size (from `sizes-jpopticians.json`) offers a genuine Size choice rather than
  one frame per colour only. Each product's sizes come from `sizes-jpopticians.json` when
  that product's `code` was `found` there; otherwise it falls back to a single size built
  from data.json's own eye/bridge/temple fields. Term name is the lens width ("55"); term
  slug is `<eye>-<bridge>-<temple>` (e.g. `55-14-135`) so two frames sharing a lens width but
  differing bridge/temple get distinct terms; each term carries `_sgs_size_measure`
  ("55□14 135") and `_sgs_variesby_value` = `size` (the preflight gate's variesBy check).
  Variations are now keyed on (colour, size); a product's default attributes are its first
  colour plus its default size (middle of 3, first of 2, the only one of 1).
- Product-level meta: `_sgs_rrp` (int, £), `_sgs_frame_eye`, `_sgs_frame_bridge`,
  `_sgs_frame_temple` (mm) — now the product's *default* size (see above), with the same
  three keys also written per-variation with that variation's own size. See "Meta keys"
  below for why these existed as product-level meta in the first place.
- **UK shipping zone**: Flat rate £3.95, Free shipping over £75, Local Pickup.

## Running it

```bash
# 1. Re-extract from the draft (only needed if the draft's static data changed)
python extract_data.py                       # writes data.json, prints + checks counts

# 2. Upload seed.php + data.json to the target server, then:
wp eval-file seed.php data.json
```

Every run is safe to repeat — see "Idempotency proof" below. To seed the **client's real
site** later: copy `extract_data.py`'s output (or point it at the client's own draft file),
upload `seed.php` + that `data.json`, and run the same `wp eval-file` command against the
real site. Nothing in `seed.php` is test-site-specific.

## Files

| File | What |
|---|---|
| `extract_data.py` | Parses the draft's `<script data-dc-script>` JS literals (`PRODUCTS`, `BRANDS`, `COLS`, `STYLE_LIST`, `MATERIALS`, `FTYPES`, `HINGES`, `NOSES`, `SHAPES`, `IMG`) into `data.json`. Uses a small hand-rolled JS-literal parser (unquoted keys, single-quoted strings, trailing commas) — not hand-typed data, and not `eval()`. Cross-checks every product's brand/shape/colour/material/frame-type/hinge/nose reference resolves against the reference lists, and fails if PRODUCTS isn't exactly 16. |
| `data.json` | Extracted output (regenerate with the command above; do not hand-edit). |
| `seed.php` | The idempotent seed itself. Run via `wp eval-file seed.php <path-to-data.json>`. |

## Colour/Image swatch test — what actually happened

The plan wanted a Colour attribute with an image/colour swatch type. Tested safely before
touching real data:

1. `wc_get_attribute_types()` on this WooCommerce 11.1.1 install returns **only `select`** —
   no `image`/`color` swatch type is registered natively (that's a paid-plugin feature here,
   not core).
2. Forced a throwaway attribute to `type: 'image'` anyway (`wc_create_attribute()` doesn't
   validate the type against the registered list), attached it to a throwaway product,
   published it, then checked:
   - Front-end product page: `HTTP 200`, no "critical error" text.
   - Admin edit-product screen (cookie login, real page load): `HTTP 200`, no critical
     error, the attribute panel rendered.
   - **No critical error reproduced** on this WC version — unlike the WC 11.0.1 report.
   However, since no swatch type is registered, forcing `image` gives **no swatch UI
   benefit** (WooCommerce just treats it as an unstyled select internally) — it would only
   have been a cosmetic label with no admin controls to use it.
3. Throwaway attribute/term/product all deleted immediately after the test (`wc_delete_attribute()`,
   `wp_delete_term()`, `wp_delete_post( …, true )`) — verified via `wp post list` showing zero
   products before the real seed ran.
4. **Decision: `pa_colour` uses the normal `select` type**, with the hex value stored on
   `_sgs_swatch_color` term meta (already registered by `Configurator_Meta`) so a future SGS
   swatch-rendering control can style it without a schema change.

## Meta keys

Grepped `plugins/sgs-blocks` and `theme/sgs-theme` first, per the task instructions. Found
one existing meta registry — `plugins/sgs-blocks/includes/class-configurator-meta.php`
(`Configurator_Meta`) — which already owns:
- `_sgs_swatch_color` / `_sgs_swatch_image_id` (attribute term meta) — **reused** for the
  colour swatches above.
- `_sgs_base_price_pence` / `_sgs_base_price_attested` / `_sgs_decoy_enabled` etc. — these are
  a **different feature** (Spec 28 value-ladder decoy pricing, in pence, with legal
  attestation/audit trail), not a general RRP/compare-at-price field. Reusing it for RRP
  would have been wrong — it drives a specific "vs buying singly" claim mechanism with its
  own validation rules, not a plain "was £X" display.
- No existing key for frame measurements (eye/bridge/temple).

**Used the task's fallback names, as instructed**: `_sgs_rrp`, `_sgs_frame_eye`,
`_sgs_frame_bridge`, `_sgs_frame_temple` — all plain **product-level** postmeta (not
variation meta). The draft gives eye/bridge/temple and rrp once per PRODUCT, identical
across every colour of that product — there is no per-colour measurement or RRP in the
source data, so variation-level meta would just duplicate the same value 2–6 times per
product for no benefit.

## Idempotency proof

Ran the seed **three times** against the clean test site:

| Run | products created | products updated | variations created | variations updated | attr terms created | attr terms updated | brands created | brands updated |
|---|---|---|---|---|---|---|---|---|
| 1 (fresh) | 16 | 0 | 49 | 0 | 78 | 0 | 0* | 0* |
| 2 | 0 | 16 | 0 | 49 | 0 | 38 | 0 | 40 |
| 3 | 0 | 16 | 0 | 49 | 0 | 38 | 0 | 40 |

\* Run 1's brand counter had a reporting bug (brands were being tallied into the generic
`attr_terms_*` counters, which is why run 1 shows `attr_terms_created: 78` = 40 brands + 12
colours + 12 shapes + 5 materials + 3 frame types + 2 hinges + 4 nose pads). Fixed before
run 2 by giving brands their own `brands_created`/`brands_updated` stats keys — a reporting
fix only, the underlying `get_term_by()`-before-`wp_insert_term()` idempotency logic was
correct from run 1 (confirmed: brand term count stayed at 40 across all three runs).

Object counts held flat across runs 2→3 (the only genuine repeat, since run 1 was the
initial create): 16 products, 49 variations, 40 brand terms, 12 colour terms, 3 shipping
methods — proven via `wp post list --format=count` / `wp term list --format=count` /
`WC_Shipping_Zone::get_shipping_methods()` after each run, not just the script's own log.

**One real bug the repeat runs caught**: run 1's shipping section picked `pickup_location`
(the block-checkout Pickup Location method) because it exists as a registered
`WC_Shipping_Method` class on WC 11.1.1 — but that class only declares
`supports: ['settings', 'local-pickup']`, **not** `'shipping-zones'`, so
`WC_Shipping_Zone::add_shipping_method()` silently no-ops (returns instance id `0`, method
never appears in the zone). `woocommerce_feature_local_pickup_enabled` is also off on this
install. Fixed the detection to check `in_array('shipping-zones', $method->supports)` rather
than "does the class exist", which correctly falls back to the legacy `local_pickup` method
— confirmed added on run 2 and present-and-not-duplicated on run 3.

## Verification performed

- `wp post list --post_type=product --format=count` → 16
- `wp post list --post_type=product_variation --format=count` → 49
- `wp term list product_brand --format=count` → 40; `pa_colour` → 12 (each with a hex
  `_sgs_swatch_color` value)
- `curl -L https://darkcyan-grouse-898606.hostingersite.com/shop/` → HTTP 200
- `curl -L https://darkcyan-grouse-898606.hostingersite.com/product/gucci-oversized-cat-eye/`
  → HTTP 200, no "critical error", variations form present
- Product-level meta spot-checked on product 132 (Michael Kors Chelsea): `_sgs_rrp=139`,
  `_sgs_frame_eye=56`, `_sgs_frame_bridge=16`, `_sgs_frame_temple=135`
- Variation meta spot-checked: `attribute_pa_colour=gold`, `_regular_price=109`,
  `_sku=MK5004-1017R1-gold`

## Backup

Pre-seed database export taken via a **direct `mysqldump`** (not `wp db export` — that
WP-CLI command shells out via PHP's `proc_open`, and this host disables `exec`/`shell_exec`/
`popen` in `php.ini`, so `wp db export` fails silently with no output and exit code 255; a
plain shell `mysqldump` works fine since it isn't going through PHP):

```
/home/u945238940/eye-care-test-pre-woo-seed-20260924-1.sql   (2.4 MB)
```

## Not done / skipped

- **Product images**: only 4 of 16 draft products carry a fetchable image reference
  (`img` field pointing into the draft's `IMG` map — products 2, 3, 5, 6). The other 12 have
  `img: null` in the draft itself (not a fetch failure — the draft simply doesn't name an
  image for them). Those 4 were sideloaded into the media library and set as the featured
  image; the other 12 are left with no featured image and are listed in the seed script's
  own "Images SKIPPED" report each run. Re-running is safe — sideload is keyed on the
  source URL via a `_sgs_seed_source_url` attachment meta, so it won't re-download or
  duplicate on a second run.
- **Product tags, cross-sells, reviews, stock quantities**: not in the draft's `PRODUCTS`
  data, so not seeded — out of scope for this task.
- **`gender`/`pol` (polarised)/`rating`/`revs`/`lensCat` fields** in the draft's `PRODUCTS`
  data were not mapped to any WooCommerce field or meta key — they weren't named in the
  task's scope (attributes: shape/material/frame-type/hinge/nose only). Flagging them here
  so a future pass knows they exist in the source data if the client wants them as
  attributes or meta later.
