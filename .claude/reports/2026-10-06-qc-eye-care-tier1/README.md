# QC pass — Eye Care Tier 1 register fixes

Run 2026-10-05/06 against the sandybrown canary. Target: block code `65573118c` +
`c06f71ea6`, then `82f54f351` after this pass found and fixed a defect.

**Verdict: 15 of 17 scenarios pass, confidence 88/100 — partial.** The one in-scope failure
this pass found has been fixed, redeployed and re-verified (`82f54f351`). The two remaining
failures are pre-existing and outside this session's scope; both are proven pre-existing by
diff, not assumed.

Scenarios were deliberately chosen as ones the build session had NOT already run, with an
explicit brief to contradict its verification. One did.

## What this pass found that the build session missed

### 1. `hasOwnImage` was wrong — this session's own defect, now fixed (`82f54f351`)

`'hasOwnImage' => $vid > 0` read `WC_Product_Variation::get_image_id()` in its default
`view` context. Quoted from the installed WooCommerce 11.1.0 on the canary, not from memory:

```php
public function get_image_id( $context = 'view' ) {
    $image_id = $this->get_prop( 'image_id', $context );
    if ( 'view' === $context && ! $image_id ) {
        $image_id = apply_filters( ..., $this->parent_data['image_id'], $this );
    }
    return $image_id;
}
```

A variation with no photo of its own therefore returns the PARENT's image. Measured on
canary product 3990: every variation gives `view = 631`, `edit = 0`, `_thumbnail_id = 0`,
and 631 is the parent featured image. The flag was true for a product where not one
variation has its own photo — precisely the case the colour fallback exists to catch, so on
a qualifying axis every swatch would show the same parent photo instead of distinguishable
colour chips.

Fixed by reading `get_image_id( 'edit' )`, with the cache key moved v7 to v8 because a v7
transient holds the wrong flag.

**Verified after redeploy, including the prediction that the gallery is unaffected:**
`hasOwnImage` is now `false` for all three combos, and the gallery is still 5 items with
identical filenames in identical order. The front end is unchanged: 5 thumbs, no
duplicates, strip not hidden, three distinct pill images.

**Was never visible on the canary:** product 3990's three pills render three distinct
term-meta swatch images, so the variation map did not override them there. **Eye Care was
unaffected:** its variations have genuinely distinct own images (655, 657, 656).

### 2. Unbounded quantity on any product with stock tracking off — PRE-EXISTING

A single guest request added **9,999 units** (£94,990.50) and was accepted, not clamped.
Cause, in code this session never touched: `class-cart-proxy.php` sets
`$stock_qty = PHP_INT_MAX` when stock is unmanaged, which skips the clamp branch entirely,
and `class-cart-limits.php::enforce_add_to_cart_limits` returns early for unmanaged stock
("Unmanaged stock — the per-SKU cap + rate-limit do not apply"). Two independent guards
both opt out, so there is no upper bound at all. Every canary product, and any client
product with stock tracking off, is exposed. Proven pre-existing: the entire session diff
to both files is the 15-line `get_cart()` insertion.

### 3. Active-tab contrast 2.24:1 — PRE-EXISTING

axe-core, serious: `#e68a95` on `#fbf3dc` on `.sgs-tabs__tab--active`, against a 4.5:1
requirement. That rule was not touched this session (the tabs diff contains only `border`
and `font-weight`, zero colour changes) and the failing colour is the canary client's own
primary token.

## Scenario results

| # | Scenario | Verdict | Evidence |
|---|---|---|---|
| S2 | Two variations of the SAME parent (the real "second pair, different size" case) | pass | `[(3991,1),(3993,1)]`, total £31.00 = 9.50 + 21.50 |
| S3 | Reverse order, B then A | pass | `[(1126,1),(3991,1)]`, £14.49 |
| S4 | THREE different products | pass | `[(3991,1),(1126,1),(898,1)]`, £19.48 as predicted |
| S5 | Invalid nonce | pass | 403 `rest_cookie_invalid_nonce` |
| S6 | Out-of-stock variation | pass | 409 `sgs_out_of_stock` |
| S7 | Wrong variation attributes | pass | 400 `sgs_attribute_mismatch`, exact expected vs got |
| S8 | Quantity 9999 | **fail** | 200, 9999 units, £94,990.50 — pre-existing, finding 2 |
| S9 | First add into a brand-new empty session | pass | `[(3991,1)]`, clean JSON — `get_cart()` is safe on an empty cart |
| S10 | ALL brand-strip images hung forever | pass | ready true, anim running, dist 900px, 1 clone |
| S11 | `prefers-reduced-motion: reduce` | pass | ready false, anim none, 0 clones — the bail survived the shared-helper swap |
| S12c | Strip collapsed to zero width at init, then revealed | pass | bailed first (`ready false`, `dist ""`, 0 clones), then ResizeObserver fired (`ready true`, 900px, 1 clone); collapse and reveal again kept clones at 1 |
| S13 | Gallery dedupe against server truth | pass | Dedupe fired on a REAL collision: variation own image 631 equals parent featured 631, so 5 ids not 6, and the DOM filenames match the hand-written expectation exactly |
| S13b | `hasOwnImage` semantics | **fail, now fixed** | finding 1, fixed and re-verified in `82f54f351` |
| S17 | REAL click on a tab (not scripted focus) | pass | selection moved to index 1, heights still all 53.6, exactly 1 visible panel |
| S18 | Tab geometry at 375 / 768 / 1440 | pass | 375: all h 53.6 w 312, border 1.6px, weight 700 vs 600. 768 and 1440: all h 46.4, border 0px (desktop style uses an indicator, so it is unaffected) |
| S19 | Touch targets at 375 | pass | tabs 53.6px, pills 148x152 — all at or above 44px |
| S20 | axe-core, product page | **fail** | 1 serious: contrast 2.24:1 on the active tab — pre-existing, finding 3 |

Items 91 and N11(a)'s primary gate were verified during the build session with their own
negative controls and are recorded in their register rows.

Two earlier attempts at S12 were **vacuous and are recorded as such**: the first applied the
collapse after `measure()` had already run, and the second used `addInitScript` before
`documentElement` existed so the style never applied. Only S12c, which injected the style
into the HTML response so it was parsed before the deferred module ran, actually exercised
the retry branch.

## Certainty

Not applicable in the multi-response sense: this is a single deterministic measurement run
against the live canary, not a multi-model vote, so `certainty_calc` has no sample to score
(N=1). Confidence rests on per-scenario evidence and on each check having a reading that
could have come back red.

## What was deliberately not done

eye-care-test was treated as frozen — reads only, no deploy, no reseed. No page tree and no
`divergences.json` entry was written. `scripts/computed-route/` and `scripts/parity/` were
not touched. No remote shell writes, which is why the stock-managed negative control for
N11(a) could not be run; its register row records the substitute control used instead.

## Recommended next actions

Both are out of this session's scope. Two fix-shape proposals are listed, so per `/qc`'s own
rule they should go through `/qc-council` before any implementer is dispatched.

### 1. Bound the quantity on unmanaged-stock products (finding 2)

- **Hypothesis:** an absolute ceiling for unmanaged stock changes a single guest add of
  `quantity: 9999` from accepted to clamped.
- **Baseline:** `POST /wp-json/sgs/v1/cart/add-item {"id":3991,"quantity":9999,...}` returns
  200 with `items_count: 9999`.
- **Fix shape:** `includes/class-cart-proxy.php::Cart_Proxy::handle` — give the `else`
  branch of the `$stock_qty < PHP_INT_MAX` test a real ceiling instead of
  `$final_qty = $requested_qty`. The number is a commercial choice for Bean, not a
  technical one.
- **Predicted post-fix:** the same request returns 200 with `items_count` equal to the
  ceiling.
- **Validation:** re-run the same request and read `items_count`.
- **Commit gate:** do not commit if `items_count` still exceeds the ceiling, or if a normal
  single add stops returning 200.

### 2. Active-tab contrast (finding 3)

- **Hypothesis:** the active tab fails 4.5:1 because it paints the client's primary token on
  `surface-alt`; an accessible on-surface token fixes it without changing the framework rule.
- **Baseline:** axe-core reports contrast 2.24:1 on `.sgs-tabs__tab--active`.
- **Fix shape:** either a client-token decision in `sites/<client>/theme-snapshot.json`, or a
  framework change to which token `tabs/style.css::.sgs-tabs__tab--active` reads. Confirm
  which layer owns it before editing.
- **Predicted post-fix:** axe-core reports 0 contrast violations on that node.
- **Validation:** `python ~/.claude/hooks/a11y-audit.py test <product URL>`.
- **Commit gate:** do not commit if the node still reports below 4.5:1.
