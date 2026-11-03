# Buybox configurator research (2026-11-03)

Scope: a universal "build a box / pick N" extension of `sgs/buybox`. Read-only research. Evidence strength is flagged per row: "doc" means a vendor or platform document was returned by search; "secondhand" means a news, retailer or forum snippet; "not verified" means the search did not surface the page and the row is a design inference, not a finding.

## Gaps in the evidence (read first)

- Web search did not return Baymard's or NN/g's multi-select, chip or "pick up to N" guidance, nor any official Crumbl, Insomnia, Bombas, Stance, Gousto or Biscuiteers builder page. Those rows are secondhand or unverified, and a follow-up browser pass on the live pages is needed before any of them is quoted as a pattern.
- Platform storage facts for WooCommerce Mix and Match, Product Bundles and Composite Products come from WooCommerce's own docs and are solid. Shopify app mechanics come from vendor marketing and are unverified.

## 1. Examples table

| Example | Quantity model | Distribution | Limits | Price display | Evidence |
|---|---|---|---|---|---|
| Insomnia Cookies custom box | Total chosen from a range (six to 24, up to 50 if ordering ahead) | Per-item counts across any mix of Classic, Deluxe, Brookies | Total min and max | Not confirmed | secondhand ([onlyinyourstate](https://www.onlyinyourstate.com/food/arizona/insomnia-cookies-az)) |
| Crumbl box | Fixed boxes (half-dozen, full box, four) | Weekly rotating menu of four to five flavours, one pick per slot | Slot count | Per box | secondhand ([Her Campus](https://www.hercampus.com/school/ucf/the-great-cookie-debate-insomnia-vs-crumbl/)) |
| Gousto recipe box | Recipes per box, two to five, changeable weekly | Each recipe a distinct pick | Min and max recipes | Per portion and box | doc ([Gousto](https://www.gousto.co.uk/food-box/gousto-menu-and-plans)) |
| Bombas, Stance multipacks | Fixed pack sold as a mixed set | Seller chooses the colours | n/a | Per pack | Listings show no per-pair picker; not verified on the brands' own sites |
| Shopify build-a-box apps (Boxsmith, Bundly) | Fixed box size or total range | Per-item counts, "fill the box" | Min and max | Box price applied at checkout | vendor claims ([Boxsmith](https://apps.shopify.com/boxsmith), [Bundly](https://apps.shopify.com/bundly)) |
| Qikify "quantity selector on options" | Stepper per option value | Shopper-set counts | Min and max by total quantity across values | Option price delta | doc ([Qikify](https://help.qikify.com/en/article/quantity-selector-on-options-1shnxmu/)) |
| Mama's Munches (target) | Fixed packs 8, 20, 40 from variations | Equal split across 1 to 3 flavours | Max 3, fourth pick replaces the oldest | Per pack, "£1.19 each", badges | repo brief |

Not covered by search and still open: HelloFresh, M&S "3 for £x", Uniqlo, Gymshark, beauty pick-3 minis, pick-and-mix sweets, coffee builders, plant pots, Ben's Cookies, Biscuiteers.

Observed patterns across the evidence:

- Two quantity families dominate: fixed pack sizes (Crumbl, Bombas) and a total range the shopper fills (Insomnia, Gousto, build-a-box apps).
- Distribution is per-item counts almost everywhere; an equal split across a small number of picks is rare and is what makes the Mama's design distinctive.
- Limits are stated as min and max on the total, and apps recommend putting the limit in the group title ("Choose up to 3", per [shopcircle](https://shopcircle.co/blogs/news/limit-how-many-options-customer-can-select-shopify)).

## 2. Platform models table

| Platform | How choices are stored | Cart line | Stock | Source |
|---|---|---|---|---|
| WooCommerce Mix and Match | Container product with min and max container size, children from chosen products or categories | Child items added normally and grouped under the container; child quantities follow container quantity times each item's own quantity | Per child product | [Configuration](https://woocommerce.com/document/woocommerce-mix-and-match-products/config/), [REST API](https://woocommerce.com/document/woocommerce-mix-and-match-products/rest-api-reference/) (container order item lists `mnm_child_items`; creation needs `mnm_configuration`) |
| WooCommerce Product Bundles | Bundle parent plus bundled items in separate DB tables | Parent line plus child lines, child carries `bundled_by` | Bundle stock derived from bundled items | [Data structures](https://woocommerce.com/document/bundles/bundles-data-structures-storage/) |
| WooCommerce Composite Products | Components with options; parent is a container | Container line plus one child line per component (`composite_children`, `composite_parent`) | Components tracked as standalone products; composite stock not tied to them | [Data structures](https://woocommerce.com/document/composite-products/composite-products-data-structures-storage/) |
| Product Add-Ons | Extra fields saved as line-item meta | One line, choices in meta | Parent only | WooCommerce docs comparison page ([choosing between them](https://woocommerce.com/document/product-bundles-product-recommendations-composite-products-or-product-add-ons/)) |
| Shopify native | Fixed bundles and multipacks only; mix and match needs an app | App-dependent | Derived from components | [Saral roundup](https://www.getsaral.com/academy/product-bundling-apps-for-shopify) (vendor) |
| Shopify apps | Three designs seen: Cart Transform parent with nested component SKUs; each pick as its own line with the box price applied at checkout; one merged line with contents listed | See left | Per component in the first two | Vendor claims, not verified |
| BigCommerce | Not researched; third-party option apps such as [PapaThemes](https://www.bigcommerce.com/apps/apparel-product-options-by-papathemes/) | n/a | n/a | not verified |

Takeaway: every platform splits into "child lines per pick" (stock-accurate, complex cart) or "one line plus meta" (simple, no per-pick stock). The Mama's case is the second family because the pack is one priced variation and flavours are an unpriced answer.

## 3. UX guidance with citations

- Say the limit where the choice is made: a title such as "Choose up to 3" and a clear error when exceeded ([shopcircle](https://shopcircle.co/blogs/news/limit-how-many-options-customer-can-select-shopify), vendor advice).
- Tell people multiple picks are allowed with a hint such as "Select all that apply" ([UK Parliament design system](https://designsystem.parliament.uk/forms/checkboxes/)).
- Show errors when the shopper tries to continue, not while they are still choosing; keep their input; say what went wrong and how to fix it ([NICE, based on GOV.UK](https://design-system.nice.org.uk/components/checkbox/)).
- Do not pre-select options: it raises the chance of a missed or wrong answer ([NICE](https://design-system.nice.org.uk/components/checkbox/)).
- Link error text to the group for screen readers with `aria-describedby` ([Proximus](https://designsystem.proximus.com/pagesDS/21__Forms/Checkboxes/)).
- Exclusive "none" options that change checkbox behaviour confuse people ([article via uxdesign](https://adamsilver.io/blog/why-the-none-of-the-above-checkbox-pattern-worries-me/)); relevant to the replace-oldest rule, which is also a non-conventional behaviour and needs an announced result.
- Mobile swatches: Baymard notes showing only a few swatches pushes users to the product page to see them all ([Baymard 2438](https://baymard.com/guidelines/2438-showing-swatches-on-mobile)); a 11-flavour group should show all options on the product page.
- Not found: NN/g or Baymard guidance on chip limits and replace-versus-refuse. Treat replace-oldest as an untested pattern: announce it in a polite live region ("Mango added, strawberry removed") and keep an undo path.

## 4. Variance dimensions

| Dimension | Values seen or expected |
|---|---|
| Number of choice groups | One (colour picks), several (base, chips, flavours, size) |
| Pick count per group | Single; multi with min and max; "up to N" |
| Group role | Drives price or variation (pack size); unpriced answer (flavour); priced delta (chips) |
| Quantity model | Fixed pack sizes from variations; per-pick counts; free stepper; total range min to max |
| Distribution | Equal split with remainder rule; shopper-set counts per pick; none (picks are just attributes) |
| Overflow rule | Replace oldest; refuse with message; disable remaining options at the limit |
| Per-option extras | Colour swatch, image, badge, one-line description, price delta |
| Stock per pick | None; per attribute term; per child product |
| Pack labelling | Per-unit price, "Most popular", "Best value", savings |
| Subscription | One-off; recurring box with the same picks |
| Persistence | Line-item meta only; child lines; variation |

Remainder rule needed: 20 across 3 flavours is 7, 7, 6. Options: first picks get the extra, or shopper-set counts. State the rule in the summary line ("7 strawberry · 7 mango · 6 vanilla").

## 5. Repo alignment

- `.claude/specs/43-SGS-CHOICE-FLOW.md`: FR-43-7 is "partly built", with the line "no layout shows every choice at once yet (Mama's batch item B8)"; FR-43-23 is the built guided layout (one group at a time, meter as receipt); the guided buybox "never runs a saved flow" and reads the product's own attributes, with term fields `_sgs_swatch_image_id`, `_sgs_term_badge`, `_sgs_term_description` in `plugins/sgs-blocks/includes/configurator-term-fields.php`.
- `plugins/sgs-blocks/src/blocks/buybox/block.json`: `buyboxLayout` enum is `standard` and `guided`; `guidedAnswerAttributes` (boolean, default true) walks non-variation attributes as answer groups; `pickerStyle` has values `""`, `outlined`, `filled` and more.
- Spec 27 headings: Part 1 "Variable-product configurator layer", "Data model" with "Per-variation presentation meta", Phase 1 MVP, Phase 2, Phase R.
- Not re-read in full: the FR-43-7 body and spec 27 sections were only grepped for headings; read them before building.

## 6. Design implications for sgs/buybox

1. Add a third layout value, `all-at-once` (name by what it does), beside `standard` and `guided`; same groups, all visible, one summary and one running total.
2. Quantity comes from the product's pack-size variations (any attribute flagged as the "quantity" axis, with its terms parsed as numbers). Changing pack sizes to 2 or 4 is then a WooCommerce attribute edit, not framework work.
3. Pickable groups: any product attribute flagged "shopper picks several", with min, max and overflow rule (replace oldest, refuse, disable) as per-attribute settings. Default max comes from the setting, never hardcoded to 3.
4. The distribution rule is a setting on the buybox: `equal-split` (with a stated remainder rule), `shopper-counts` (steppers per pick, total must equal the pack size), `none`.
5. Store one cart line with the choices as line-item meta (the pack variation is the priced line; picks and split are meta), matching the Add-Ons family. Child lines per pick (Mix and Match style) is a later option only if per-pick stock is needed; it is the heavier model.
6. Per-option extras reuse the existing term fields (swatch image, badge, description); add a colour-dot value if the term has a colour. Colour dots must not be the only identifier: always show the name.
7. Summary line is generated from the meta ("Your 20: 10 strawberry · 10 mango"), rendered in a polite live region; replace-oldest announces what was removed.
8. Pack tiles show per-unit price and badges from variation meta (spec 27 per-variation presentation meta), not hardcoded copy.
9. Clothing case works unchanged: quantity axis = pack size (3, 5), group "Colour" multi pick; add "Size" as a single pick that drives a variation. Anything combining both needs the rule that single-pick axes form the variation and multi-pick axes become meta.
10. Subscription and per-pick stock are out of scope for the first cut; record them as parked in the plan that adopts this research.
