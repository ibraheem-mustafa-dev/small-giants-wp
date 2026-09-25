# Choice-flow Phase 3/4 build contract (2026-09-25)

The single source for the parallel build agents finishing Spec 43 Phases 3 and 4. It is absorbed into
`.claude/specs/43-SGS-CHOICE-FLOW.md` and then deleted when the build ships.

All paths below are under `plugins/sgs-blocks/`.

## 1. Product-option step (FR-43-10/10a; any attribute of the flow's product)
- **The product:**
  - on a product page (`is_singular('product')`), the page's product
  - otherwise the root block's `flowProductId`
  - resolved in the same way as `choice-flow/render.php` does today
- **`choice-flow-question` attributes:**
  - `productAttribute` (string, default `''`): a `pa_*` taxonomy. An empty value means the step is not a
    product-option step. It can't be combined with `priceGroup`; if both are set, `productAttribute` wins, and the
    editor clears `priceGroup` when `productAttribute` is chosen.
  - per option (inside the existing `options[]` items):
    - `isDefault` (bool)
    - `badge` (string, up to 20 characters)
    - `description` (string, up to 140 characters)
- **Mode:** decided on the server from the product's own attribute, using
  `$product->get_attributes()[ $taxonomy ]->get_variation()`.
  - **`variation` mode** (the attribute creates variations):
    - Options, prices and stock come from `SGS\Blocks\Product_Manifest::build( $product_id )`, which returns
      `axes[]` and `combos{ "pa_a:x|pa_b:y": {variationId, priceMinor, inStock, ...} }`.
    - Each option's price label, formatted with `sgs_configurator_format_minor()`:
      - if this is the only variation attribute in the flow, the exact price
      - otherwise "from £X", the minimum in-stock `priceMinor` among combos containing this term
    - An option with no in-stock combo is rendered `disabled`, with `aria-disabled="true"`.
  - **`answer` mode** (the attribute doesn't create variations):
    - The options are `wc_get_product_terms( $product_id, $taxonomy, ['fields' => 'all'] )`, with no price.
    - The choice is recorded exactly like a plain question's answer: the same code path in `view.js`
      (`recordPlainAnswer`). It therefore reaches the bag line as an FR-43-21 answer row, labelled with the step's
      question and valued with the term name.
- **Editor-generated options:** in the editor, a product-option step's options are generated from the product, not
  typed. The option list is read-only, apart from the per-option `isDefault`, `badge`, `description`, `nextStepId`
  and `tags` fields, which are keyed by term slug in `options[]` (`value` = term slug).
- **Option markup** (the same button as plain options, so routing, branching, Back and styling are unchanged):
  `<button class="sgs-choice-flow-question__option-button" data-product-attribute="pa_x" data-term="slug"
  data-attribute-mode="variation|answer" [data-price-label="from £6.00"] [disabled]>`, plus all the existing
  `data-*` attributes the plain options already carry (`data-next-step-id`, `data-tags`, ...).
- **The step wrapper** carries `data-product-attribute` and `data-attribute-mode`.

## 2. Root combo seed
- `includes/choice-flow-variation-seed.php` defines `sgs_choice_flow_variation_seed_attr( array $parsed_inner_blocks,
  int $product_id ): string`.
  - It returns `' data-flow-combos="…"'`, the escaped JSON of `{ key: {v: variationId, p: priceMinor, s: 0|1} }`,
    only when at least one descendant `sgs/choice-flow-question` has a `productAttribute` in variation mode.
  - Otherwise it returns `''`.
  - If the JSON is over 24,576 bytes it also returns `''`. The client then shows "Choose all options to see the
    price" until the add-to-bag response.
- The key format is identical to `Product_Manifest` combos: axes sorted as the manifest sorts them, `tax:slug`
  joined by `|`.
- The root `render.php` calls it. That call is main-thread wiring; agents do not edit the root `render.php`.

## 3. Client variation resolution (`choice-flow/variation.js`)
- **Exports:**
  - `initVariation( flowEl )`: reads `data-flow-combos` and the product ID
  - `recordVariationChoice( flowEl, taxonomy, slug )`
  - `clearVariationChoicesAfter( flowEl, stepIndex )`
  - `getResolvedVariation( flowEl )`, which returns
    `{ productId, variationId, attributes: {pa_x: slug}, priceMinor } | null`
- **When every variation-mode attribute in the flow has a choice:**
  - it finds the combo
  - it writes the pricing base in the shape `pricing.js`'s `handleVariationChange` writes
  - it dispatches `sgs-flow-variation-change` on `flowEl` (bubbling) with
    `{ flowEl, productId, variationId, attributes, priceMinor }`
- **Precedence:** attributes the flow's variation steps choose override the same keys from a page buybox's
  `sgs-variation-change` event.
- **`add-to-bag.js`** uses `getResolvedVariation()` first, falling back to the buybox base. It sends
  `{ id: variationId, quantity: 1, variation: [{attribute: 'pa_x', value: slug}], addons, fields }`. The proxy
  accepts taxonomy-keyed attributes.
  - If the product is variable and no variation resolves, it shows an inline error in the result step and makes
    no request.

## 4. Email-capture ending (FR-43-4)
- **`choice-flow-result` attributes:**
  - `action` enum becomes `["recommend","add-to-bag","email"]`
  - `rateLimit` (integer, default 5, minimum 1, maximum 50) has an inspector control
  - `emailLabel`, `submitLabel`, `successMessage` (strings, with defaults in UK English)
- **An `email` result renders:**
  - the heading and body
  - an email input (label, `autocomplete="email"`, required)
  - a visually hidden honeypot input named `sgs_hp`
  - a submit button
  - an `aria-live="polite"` status region
- **Route:** `POST /sgs/v1/choice-flow/submit` (`includes/forms/class-choice-flow-submit.php`).
  - Permission is `SGS\Blocks\Forms\Form_REST_API::verify_form_nonce` (`wp_rest`).
  - Args: `flowRef` (the linked flow's slug, or `page:<postId>:<blockIndex>` for an inline flow), `email`,
    `answers[{label,value}]` (at most 16; label up to 60, value up to 200), `tags[]` (at most 20, `sanitize_key`)
    and `sgs_hp`.
  - **The rate limit is read on the server only:**
    - a linked flow: the `sgs_choice_flow` post via `Sgs_Block_CPTs::resolve_choice_flow()`, then `parse_blocks`,
      then the email result block's `rateLimit`
    - an inline flow: `parse_blocks` of that published post's content
    - it is never taken from the request
  - Then `Form_REST_Submission::check_rate_limit( 'choice-flow-' . $flow_key, $max )`, which returns 429 on excess.
  - Then `Form_Processor::process( 'choice-flow-' . $flow_key, $fields, [], true )`, which stores the submission and
    fires the N8N webhook. No `wp_mail()`.
  - Responses:
    - 200 `{ success: true }`
    - 400 for an invalid email or a filled honeypot (the honeypot answer is a 200-shaped fake success, with nothing
      stored)
    - 404 for an unknown `flowRef`
- **Client:** `choice-flow/email.js`, which exports `initEmailResults( flowEl )`. It sends the answers on the path
  taken (reusing `collectFlowFields` / the recorded answers) and the tags.

## 5. Root polish (chrome)
- **`choice-flow` attributes:**
  - `progressColour` (a colour slug or hex, via the project's standard colour control, emitted as a CSS custom
    property through a class or the project's existing no-inline-style mechanism; read how other blocks do it)
  - `showHeader` (bool, default false)
  - `headerLogo {id,url,alt}`
  - `closeLabel` (default "Close")
  - `stickyFooter` (bool, default false)
- **Header:** the logo, an eyebrow reading "Step N of M", and a labelled `<button>` "Close ×".
  - Close closes the enclosing `sgs/modal` using that modal's existing close mechanism. Read
    `src/blocks/modal/view.js` first. If the flow isn't inside a modal, the Close button is not rendered.
- **Sticky footer:** the existing Back button plus the terminal's primary action, `position: sticky; bottom: 0`
  inside the flow.
- **Option polish (Wave 2, question block):**
  - `isDefault` pre-selects that option on load and records it as the answer, without auto-advancing
  - `badge` renders a pill on the card
  - `description` renders one line under the label

## 5a. Buybox button opens a flow (Mama's journey B)
- **`sgs/buybox` attributes:**
  - `addToCartAction` (enum `["cart","modal"]`, default `"cart"`)
  - `addToCartModalId` (string: the `sgs/modal` anchor or ID the button opens)
- The inspector gets a "Button action" control; the existing `addToCartLabel` supplies the wording
  (e.g. "Choose your flavours").
- **In `modal` mode:**
  - The button still requires a purchasable, in-stock selection. It stays disabled with the existing
    sold-out and unavailable states.
  - Instead of adding to the cart, it opens the modal through the modal's existing open mechanism.
    Read `src/blocks/modal/view.js` and `render.php`, and never invent a second one.
  - The buybox keeps firing `sgs-variation-change`, so a flow inside the modal buys the variation chosen
    on the page (already built: `pricing.js` / `add-to-bag.js` fall back to the page buybox when the
    flow has no variation-mode steps).

## 5b. The two Mama's journeys (sandybrown, product 3990)
- **A. Full customisation:** a saved flow with four product-option steps (Flavour, Topping, Dietary,
  then Number in Pack), ending in add to bag. It sits in a fullscreen `sgs/modal`, opened from a
  "Build your box" trigger on a canary page, with `flowProductId` 3990.
- **B. Choose on the page:** a saved flow with three answer-mode steps (Flavour, Topping, Dietary),
  ending in add to bag.
  - It sits in a fullscreen `sgs/modal` on product 3990's page.
  - The page's buybox is in `modal` mode, with the label "Choose your flavours".
  - The pack is chosen on the page.

## 6. Rules every agent follows
- **Edit only your own files.** No git, no `npm run build`, no deploy, no `git stash` / `checkout` / `reset`.
- **No inline `style="…"` from any render.php** (Spec 32). Every customisable property has an inspector control.
  UK English. WCAG 2.1 AA, 44px targets, visible focus.
- **Size caps:** PHP files ≤ 300 lines, JS ≤ 250. Never add logic to `choice-flow/view.js`, `choice-flow/edit.js`,
  `choice-flow/pricing.js` or `choice-flow-question/edit.js`. The main thread adds one-line imports and calls to
  those.
- **In render.php, no top-level `function` declarations.** Put helpers in a separate file with a `function_exists`
  guard.
- **Security:** a nonce on every route, capability checks where relevant, sanitise all input, escape all output.
- **Report:** the files changed, the exported symbols, and the one-line wiring the main thread must add (the exact
  import and call site). Run `php -l` on your PHP files and `node --check` where applicable.
