# Browser pass for script-built parts

The offline check cannot see a part the block's front-end JavaScript builds, so its record entries carry `"unproved": "script-built-part"`. This folder settles them in a real Chromium on a local scratch WordPress site.

## Files

| File | Job |
|---|---|
| `prove_script_parts.py` | The driver: reads the record entries, builds a plain page and a changed page per setting value (from `../instances.py`, so the test value is the one the check used), runs the browser, judges, writes `verdicts.json` and `summary.json` |
| `measure.cjs` | Playwright: opens each page, puts the part on screen, reads `getComputedStyle` at 1440, 768 and 375, in parallel tabs |
| `wp_fixtures.php` | Run once on the scratch site: a branded simple product (20) and a variable product (one variation, 10), both purchasable |
| `wp_pages.php` | Creates or updates the pages from a `{slug: block markup}` file |

## Run

```
wsl -d Ubuntu -u root -- bash /mnt/<drive>/<worktree>/scripts/local-wp/scratch-mirror.sh create local-mamas local-mediatest-<name> <port>
scripts/local-wp/sync-build.sh local-mediatest-<name>                   # a built plugins/sgs-blocks/build first
python prove_script_parts.py --site local-mediatest-<name> --url http://localhost:<port> --out DIR --setup     # products
node measure.cjs sessions http://localhost:<port> DIR <simple-id> <variable-id> <variation-id>                  # two baskets
python prove_script_parts.py --site local-mediatest-<name> --url http://localhost:<port> --out DIR/run --tune   # or --tabs N
```

Playwright comes from an existing install: set `NODE_PATH` to a `node_modules` that holds it (nothing is linked or installed). The driver refuses any site whose name does not start `local-mediatest`.

## How a part gets on screen

- **sgs/cart** (`src/blocks/cart/view.js`, `panel-render.js`, `free-delivery.js`, `item-row-template.js`): the page holds one flyout cart. A saved browser session carries a real WooCommerce basket (made with the add-to-cart link), the visitor clicks the trigger, `panel-render.js` reads the Store API and draws the rows and the free-delivery bar. Two baskets: `progress` (under the free-shipping minimum, so the bar says how much is left) and `complete` (over it, so the bar shows the unlocked state, which has its own rule `.sgs-cart__free-delivery--complete .sgs-cart__free-delivery-text`); the bar's settings are read under both. The rows draw a stepper, the text Remove link, Save for later and Add options only when the block's panel is set to show them (`render.php` data attributes), so both pages of every pair carry those switches (`CART_SWITCHES`), never overriding a switch the pair itself sets.
- **sgs/form** (`src/blocks/form/view.js`, `review-cards.js`): a two-step form; the visitor fills the first step and presses Next (`actions.nextStep`), `populateReview` draws one card per earlier step with `.sgs-form-review__term` and `__detail` rows.

Each part is read on every element carrying its class inside the block (`main .sgs-cart` or `main .sgs-form`, so the theme's own header cart is never read). A state (hover, focus) is held with the DevTools protocol (`CSS.forcePseudoState`), which a pointer or a non-focusable `dt`/`dd` could not give.

## Verdicts

- `proved`: the property differs between the plain and the changed page at some width the entry allows. `kind` is `value` when the changed value carries the test value (a hex as `rgb(...)`, a number with its unit, a keyword), else `switched-on`.
- `removed`: the part is on screen in both, the property is identical at every allowed width under the first and a second, different test value (`alt_value`), and the scan of every other element in the block finds no difference.
- `refiled`: the scan finds the property differing on another element; `refiled_to` names its classes.
- `unproven`: the part is on no element, or the page could not be opened; `reason` says which.

## Negative controls

`controls/` holds two record files whose entries a correct pass must NOT prove: a setting paired with the wrong part (`freeDeliveryTrackColour` on the bar's text, `reviewTermFontFamily` on the review detail: expected `refiled` to the track and the term), a setting that changes no colour (`itemGap` on `color`: expected `removed`), a part no element carries (expected `unproven`), and one real hover entry (expected `proved`). Run `python prove_script_parts.py --out DIR --records-dir controls --tabs 6`.
