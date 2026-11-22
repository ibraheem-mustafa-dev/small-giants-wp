# Browser pass for script-built parts

The offline check cannot see a part the block's front-end JavaScript builds, or a value a script writes, so those record entries carry `"unproved": "script-built-part"` or `"unproved": "script-set-token"`. This folder settles them in a real Chromium on a local scratch WordPress site.

## Files

| File | Job |
|---|---|
| `prove_script_parts.py` | The driver: reads the record entries, builds a plain page and a changed page per setting value (from `../instances.py`, so the test value is the one the check used), runs the browser, judges, writes `verdicts.json` and `summary.json` |
| `measure.cjs` | Playwright: opens each page, puts the part on screen, reads `getComputedStyle` at 1440, 768 and 375, in parallel tabs |
| `wp_fixtures.php` | Run once on the scratch site: a branded simple product (20) and a variable product (one variation, 10), both purchasable; the simple one links a published choice flow, so its basket line offers "Add options" |
| `wp_pages.php` | Creates or updates the pages from a `{slug: block markup}` file |
| `wp_content_fixtures.php` | Run once on the scratch site (`--setup-content`): four posts with images (the post grid's pagination needs more than one page), a shopper account `sr_shopper` holding two saved products (the wishlist's signed-in parts), the wishlist's features switched on, and the opening hours the business-info block prints |
| `apply_verdicts.py` | Applies `verdicts/<block>.json` to the committed records without re-running the offline proof (`check.py::apply_browser_verdicts` on each record's entries, then `check.py::schema_errors`): a proved entry loses `unproved` and takes the verdict's kind, a removed one goes, a re-filed one moves; `stamp` is untouched; stale verdicts are refused |
| `wp_nav_fixtures.php` | Run once on the scratch site: the menu's stand-in posts from `../fixtures/menu-post.json` (the menu, its mega panel, a page) at the ids the fixture's placeholders name; it refuses an id another post type holds |

## Run

```
wsl -d Ubuntu -u root -- bash /mnt/<drive>/<worktree>/scripts/local-wp/scratch-mirror.sh create local-mamas local-mediatest-<name> <port>
scripts/local-wp/sync-build.sh local-mediatest-<name>                   # a built plugins/sgs-blocks/build first
python prove_script_parts.py --site local-mediatest-<name> --url http://localhost:<port> --out DIR --setup     # products
python prove_script_parts.py --site local-mediatest-<name> --url http://localhost:<port> --out DIR --setup-nav # the menu's posts
python prove_script_parts.py --site local-mediatest-<name> --url http://localhost:<port> --out DIR --setup-content # posts, shopper, hours
node measure.cjs sessions http://localhost:<port> DIR <simple-id> <variable-id> <variation-id>                  # two baskets
node measure.cjs login http://localhost:<port> DIR sr_shopper sr-shopper-scratch                                 # the signed-in shopper (wishlist-member.json)
python prove_script_parts.py --site local-mediatest-<name> --url http://localhost:<port> --out DIR/run --tune   # or --tabs N
python prove_script_parts.py ... --records-dir <records> --tabs N --write-verdicts <build commit>              # writes verdicts/<block>.json
python prove_script_parts.py ... --block <block>[,<block>] [--setting <setting>[,..]]                           # a trial run of some blocks or settings (never with --write-verdicts)
python apply_verdicts.py                                                                                         # the verdicts into the committed records
```

Playwright comes from an existing install: set `NODE_PATH` to a `node_modules` that holds it (nothing is linked or installed). The driver refuses any site whose name does not start `local-mediatest`.

## How a part gets on screen

- **sgs/cart** (`src/blocks/cart/view.js`, `panel-render.js`, `free-delivery.js`, `item-row-template.js`): the page holds one flyout cart. A saved browser session carries a real WooCommerce basket (made with the add-to-cart link), the visitor clicks the trigger, `panel-render.js` reads the Store API and draws the rows and the free-delivery bar. Two baskets: `progress` (under the free-shipping minimum, so the bar says how much is left) and `complete` (over it, so the bar shows the unlocked state, which has its own rule `.sgs-cart__free-delivery--complete .sgs-cart__free-delivery-text`); the bar's settings are read under both. The rows draw a stepper, the text Remove link, Save for later and Add options only when the block's panel is set to show them (`render.php` data attributes), so both pages of every pair carry those switches (`CART_SWITCHES`), never overriding a switch the pair itself sets.
- **sgs/nav-bar-menu** (`src/shared/nav-interactivity/mega-disclosure.js`): the page holds the menu inside the fixture's header and row (as the offline check draws it, `../proof.py::parent_shell`). The visitor points at the first item of the bar that opens a panel (clicking when pointing does not open it), and the script sizes the hover bridge under it (`--sgs-mm-bridge-h`, the panel's top less the item's bottom). Below the collapse point the bar is folded into the burger and nothing is opened, so an entry is read closed there on both pages alike. A state other than hover or focus (`open`) is the one the page was put in.
- **sgs/form** (`src/blocks/form/view.js`, `review-cards.js`): a two-step form; the visitor fills the first step and presses Next (`actions.nextStep`), `populateReview` draws one card per earlier step with `.sgs-form-review__term` and `__detail` rows.

- **Every other block** (`BLOCKS` in `prove_script_parts.py`): the page is built from the block's fixture (`../fixtures.json`: attributes, inner blocks, parents) with the stand-ins swapped for real ones (`{{image}}` an attachment the site holds, `{{product}}` a published product); `measure.cjs` loads it, waits, and reads. `BLOCK_PARTNERS`, `PARTNERS` and `PART_PARTNERS` name what a part waits on besides the setting under test (each line cites the code that draws the part), applied to both pages of a pair; a partner the pair itself sets is kept. A block with no entry in `BLOCKS` raises, and `measure.cjs` throws for a job whose block it has no steps for. Steps beyond loading: the gift-order block ticks the basket's gift switch on the site's own Cart page (`GIFT_CART_PAGE`, with the block's attributes swapped in), the drawer menu presses a key so its effects load (`view.js::whenFirstNeeded`), the choice flow taps an answer to complete a stepper item, the wishlist reads a guest (localStorage ids) and, for the alerts and share bar, a signed-in shopper.
- A part only one of the two pages draws (a player style, a label) counts as differing from its absence. A part named by a class no element wears alone (`PART_ALIASES`) is read on the element that wears the modifier; a part written without the instance id a render folds in (`sgs-<block>-1a2b3c4d-work` is `sgs-<block>-work`) is found by either name; `ROOT` is the block's wrapper. A state written as a class on an ancestor (`STATE_ANCESTORS`) is read inside that ancestor. Hover, focus and active are held with the DevTools protocol and read after the transitions on the property have ended.
- The scan of every element of the block (for a part that shows no difference) reads each element by its whole class list; when the entry's own part is among them the entry is `proved`, otherwise it is `refiled` to the first class of each element that differs.

Each part is read on every element carrying its class inside the block (`main .sgs-cart` or `main .sgs-form`, so the theme's own header cart is never read). A state (hover, focus) is held with the DevTools protocol (`CSS.forcePseudoState`), which a pointer or a non-focusable `dt`/`dd` could not give.

## Verdicts

- `proved`: the property differs between the plain and the changed page at some width the entry allows. `kind` is `value` when the changed value carries the test value (a hex as `rgb(...)`, a number with its unit, a keyword), else `switched-on`.
- `removed`: the part is on screen in both, the property is identical at every allowed width under the first and a second, different test value (`alt_value`), and the scan of every other element in the block finds no difference.
- `refiled`: the scan finds the property differing on another element; `refiled_to` names its classes.
- `unproven`: the part is on no element, or the page could not be opened; `reason` says which.

## Negative controls

`controls/` holds two record files whose entries a correct pass must NOT prove: a setting paired with the wrong part (`freeDeliveryTrackColour` on the bar's text, `reviewTermFontFamily` on the review detail: expected `refiled` to the track and the term), a setting that changes no colour (`itemGap` on `color`: expected `removed`), a part no element carries (expected `unproven`), and one real hover entry (expected `proved`). Run `python prove_script_parts.py --out DIR --records-dir controls --block cart,form --tabs 6` (the controls hold those two blocks only).
