---
doc_type: spec
spec_id: 43
spec_version: 1.9.0
status: active
owner: framework
date: 2026-09-14
companions:
  - 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md (owns ALL pricing security for this spec's
    purchase path — the existing secure `/sgs/v1/cart/add-item` proxy is reused as-is,
    never re-derived; see §3 correction below)
  - 42-SGS-FORM-CPT-AND-PRICING.md (v2.0.0 — retired its own pricing sections in favour of
    this spec; shares the `LinkControl` picker component and the reference-lifecycle
    contract, built once, applied to both CPTs)
  - 32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no inline `style=` on any new markup)
derived_from:
  - .claude/prompts/2026-09-14-modal-cpt-form-frame-card-checkout-upgrade.md Task 3
  - A same-day /research-council run on the initial "quiz funnel vs configurator" framing —
    superseded in full by the owner's direct correction below; kept in
    `.claude/memory/research/2026-09-14-sgs-choice-flow-architecture.md` for the record,
    not cited as authority here
  - The owner's direct correction (2026-09-14) rejecting a two-block-family split: the
    real Ward End Eye Care lens flow uses `sgs/option-picker`'s tile-pricing mechanism
    *inside a step-by-step wizard*, not WooCommerce's flat "product add-ons" shape — one
    block family, pricing as an optional per-step capability, not a second product
  - The owner's follow-on requirement: the same block, in full-screen-modal mode via
    `sgs_modal` (built same session), also replaces Mama's Munches' cramped inline
    flavour/pack-size pickers with a sequential one-decision-per-screen flow
  - The 2026-09-14 reconciliation against Spec 42's adversarial-council findings (v1.1.0):
    confirmed `sgs/option-picker`'s live WC-bound mode already has stable option identity;
    its typed/manual mode does not, and the eyewear worked example uses that typed mode —
    FR-43-10a closed the gap at the right layer instead of Spec 42's original wrong one
  - **The 2026-09-14 combined `/adversarial-council` run (6 personas) on Spec 42+43 together,
    corrected by the owner mid-revision (v1.2.0):** the council (independently, the Cynic and
    Ship-PM verifying the same code) found that `sgs/option-picker` has NO pricing mechanism
    at all — FR-43-10a's "reuse verbatim" premise doesn't hold, and the typed/manual `key`
    identity gap it tried to close was a real problem with no real fix target. **The owner's
    correction: `sgs/buybox` + `sgs/product-card` already have a full, live, server-authoritative
    per-variation pricing engine** (`Product_Manifest` / `class-product-manifest.php` +
    `sgs_configurator_mode_price()` / `includes/helpers-configurator-pricing.php`) — the exact
    mechanism Mama's Munches' flavour/pack-size picker already runs on. v1.2.0 replaces the
    typed-tile pricing route entirely: every priced step in a `sgs/choice-flow` resolves ONE
    WooCommerce attribute axis of a single variable product via this existing manifest, exactly
    as `sgs/buybox` does today — never `option-picker`'s free-text typed mode. This collapses
    FR-43-1's "priced tile step" and "WC variation-picker step" into ONE step type, and resolves
    the Cynic/Competitor/Abuse-Red-Team convergent finding that the eyewear worked example had
    no real server-side price authority — it now has the same one Mama's Munches already ships.
  - **2026-09-15 (v1.3.0), post Phase 2 build — decomposed the REAL Ward End Eye Care lens-
    configurator source** (`sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care
    Birmingham.dc.html`, lines ~1300-1545), not a generic external reference. This is the
    client's own already-agreed design (`sites/eye-care-ward-end/CLAUDE.md`'s "lens-selection
    flow — the standout" section, sourced from her named competitor, JP Opticians). Confirms
    two things structurally: (1) the "step indicator replaces the header" pattern the owner
    asked about is delivered entirely by `sgs_modal` chrome (a slim bar: icon + dynamic step
    label + Close button) — it needs NO change to `sgs/site-header` or a dedicated page
    template, settling that open question in favour of the already-planned Phase 4 mechanism;
    (2) every option in the real flow carries an IMAGE (icon or product-photo preview) and a
    floating `?` HELP-TEXT toggle revealing extra explanatory copy — neither exists on
    `sgs/choice-flow-question` today, and neither is lens/pricing-specific: a plain
    qualification quiz benefits from both identically. FR-43-15/FR-43-16 below add them to the
    plain-question step type now, universal to any `sgs/choice-flow`, not deferred to Phase 3.
  - **2026-09-25 (v1.4.0), owner decision 2026-09-24 (`plans/2026-09-24-eye-care-hand-build-design.md` section 5):**
    eyewear lens prices are ONE site-wide add-on price list, not WooCommerce variations. Variations were rejected
    (every frame would need one variation per colour x size x use x thickness x finish); separate lens products
    were rejected (two bag lines per pair). v1.4.0 adds "add-on price list" as a second priced-step source beside
    "product variation" (FR-43-17 to FR-43-20); the variation source stays for flows that resolve a product's own
    axes (Mama's Munches).
  - **2026-09-25 (v1.5.0), owner direction (Bean, 2026-09-25: the lens configurator is built through the flow
    CPT):** FR-43-6 reference mechanism settled as `flowId` + `flowIsLinked` on `sgs/choice-flow` itself (the
    `sgs/form` `formId` precedent, and the attribute the Choice Flows usage column already counted), not a
    separate `flowRef` on the modal: one linked-block mechanism serves inline and modal delivery alike.
  - **2026-09-25 (v1.6.0), owner decision (Bean, 2026-09-25: the prescription is asked in the configurator, per pair,
    as Glasses Direct does):** FR-43-21 adds answers and fields carried to the bag line, so a flow can end in
    "upload a photo" or "type the numbers" without a checkout form.
  - **2026-09-25 (v1.7.0), owner direction (Bean, 2026-09-25: Mama's four choices, only the pack changes the price;
    two journeys, full customisation in a popup or pack on the page then "Choose your flavours"):** a product-option
    step reads ANY attribute of the flow's product (FR-43-10); an attribute that creates variations resolves the
    variation and its price, one that does not is an unpriced answer on the bag line (FR-43-21). FR-43-4 (email
    ending), FR-43-5 and FR-43-7 built; FR-43-22 adds the buybox button that opens a popup.
  - **2026-09-26 (v1.8.0), owner review of the live journeys (Bean, 2026-09-26):**
    - Picking an option selects it; a footer Continue advances. The Continue button is muted with aria-disabled
      until a choice is made. `advanceMode: tap` keeps tap-to-advance.
    - The final step's Add to basket and Buy now sit in the footer opposite Back.
    - Progress counts finished steps (v1.9.0: or the question on screen, `progressCounts`).
    - A summary stage shows the finished product.
    - The showcase layout (FR-43-24) is modelled on the Eye Care lens draft.
    - Options get term images, badges and descriptions; titles are bold; the round or text Close is set by
      `closeStyle`.
    - The architecture (FR-43-25): the saved flow owns content and look; products link a flow; the guided buybox
      (FR-43-23) stays product-options-only.
  - **2026-09-26 (v1.9.0), draft parity for the showcase layout (Bean, 2026-09-26: the lens flow must look, animate
    and work as the Eye Care draft does):** FR-43-24 now states the full frame, stage, card and motion detail it was
    built to; progress can count the question on screen (`progressCounts`); a pre-selected default is listed on the
    stage only once its question is reached (Bean: "not chosen yet", as in the draft); option prices read "+£30.00"
    or "from £59.00" (FR-43-17); a result can carry the running total on its button.
---

# Spec 43 — `sgs/choice-flow`

## 0. What this is, in one sentence

A step-by-step wizard block: each step asks one thing, any step can route to a different
next step based on the answer, and the whole thing ends in a recommendation, an
email-capture handoff, or a real WooCommerce purchase — the same mechanism whether it's a
dentist's "which treatment suits you" quiz, an eyewear shop's priced lens builder, or a
cookie shop's flavour-then-pack-size picker.

## 1. Why one block, not two (the corrected premise)

An earlier pass this session proposed splitting this into two separate systems — a
lead-gen "quiz" block and Spec 27's existing WooCommerce configurator, bridged by a link.
That was wrong, and wrong for a checkable reason: the owner confirmed the Ward End Eye
Care lens flow's thickness/finish options are **not** WooCommerce product variations
(they're never selectable on the product page) and are **not** WooCommerce's flat
"product add-ons" shape either (add-ons have no real per-option pricing *engine*, just a
fixed fee). What they actually are is `sgs/option-picker`'s existing tile-with-price
mechanism, used *inside a multi-step wizard* instead of inline on a product page — a
genuinely new USE of an existing PRIMITIVE, not a new pricing system.

Once pricing is understood as an optional per-step capability rather than a defining
product boundary, the qualification-quiz case and the priced-configurator case are the
same block with different steps turned on. Building them as two separate engines would
have repeated this project's own documented failure pattern (WooCommerce itself ships
four overlapping "assemble an order" plugins and had to publish a disambiguation doc
just to explain which one to use — not a model to copy for a solo-maintained framework).

**v1.2.0 correction (owner-directed, post-`/adversarial-council`):** the eyewear
thickness/finish surcharges are **real WooCommerce attribute axes on a single variable
product, priced via real variations** — structurally identical to Mama's Munches'
flavour × pack-size picker, just presented as sequential steps instead of inline pickers.
This is not a new pricing capability to build: it is `sgs/buybox`'s existing
`Product_Manifest` (`includes/class-product-manifest.php`) + configurator pricing
helpers (`includes/helpers-configurator-pricing.php`, `sgs_configurator_mode_price()`)
— already shipped, already server-authoritative, already tax-aware, already attested
per FR-28-16 — used inside a step wizard instead of on one page. A priced step therefore
resolves ONE attribute axis of the manifest per step; the terminal price is simply the
live price of the fully-resolved variation combination, read the same way `sgs/buybox`
reads it today. This retires the earlier idea of a second, typed/free-text tile-pricing
route through `sgs/option-picker` — see FR-43-10/FR-43-10a below.

## 2. Step types (mixed freely within one flow)

**FR-43-1:** a `sgs/choice-flow-step` (or a repurposed `sgs/form-step`, decide at build
time based on which shares more cleanly — see §6) can be any of:

- **Plain question** — multiple-choice options, no price. The qualification/recommendation
  use case (dentist/fitness "which service suits you"). Each option MAY carry an optional
  image and an optional help-text toggle — see FR-43-15/FR-43-16 below.
- **Priced WooCommerce-variation step (v1.2.0: merges the old "priced tile" and
  "WC variation-picker" step types into one — they were always the same mechanism).**
  Resolves ONE WooCommerce attribute axis per step, reading `sgs/buybox`'s existing
  `Product_Manifest` for live combo pricing — one attribute resolved per step (e.g. step
  1 = flavour, step 2 = pack size; or step 1 = lens thickness, step 2 = finish/tint).
  Covers BOTH the Mama's Munches use case (replaces a cramped inline pill-picker with a
  full-screen, one-decision-per-screen sequence) AND the eyewear lens-surcharge use case
  (thickness/finish modelled as real WC attribute terms on one variable product — see §6
  FR-43-10). Renders each step's options via `sgs/option-picker`'s tile UI, bound to that
  step's manifest-derived axis, not its typed/free-text mode.
- **Priced add-on step (v1.4.0, FR-43-17)** — a question whose options are the options of one group in the
  site-wide add-on price list; the chosen option's price is added to the product being bought. Any client can use
  it: an optician's lens type, thickness and finish; a print shop's finishes; a bakery's add-ons.
- **Plain data-capture step** — reuses `sgs/form`'s existing field blocks (text, file
  upload) unchanged. The prescription/eye-test-upload use case — explicitly does **not**
  affect price; a flow can freely mix priced and unpriced steps.

**FR-43-15 (added v1.3.0, 2026-09-15 — universal, not lens-specific).** Each option on a
plain-question step MAY carry an optional `image` (a single media attachment — id/url/alt,
matching `sgs/media`'s existing image-attribute shape, not a new convention). When set, it
renders in the option card's existing 16:9 preview zone (already reserved space for the
option's icon/visual — see the option-card layout FR-43-1 describes) instead of a plain
colour band. Grounded in the real Ward End Eye Care lens flow, where every option shows
either a themed icon or a live product-image preview — but the capability itself has no
pricing/lens dependency: a plain "which service suits you" quiz benefits from a photo per
option exactly as much. Optional — an option with no image keeps rendering as before
(a plain text card), so this is additive to every flow already built.

**FR-43-16 (added v1.3.0, 2026-09-15 — universal, not lens-specific).** Each option MAY
carry an optional `helpText` string. When set, a small `?` toggle button renders overlaid on
the option card (floating, top-right corner — does not affect the card's own click target
or layout flow); toggling it reveals `helpText` in a panel directly beneath that option,
dismissed by toggling again. Grounded in the real lens flow, where every option's `?` reveals
a short explanation for choices a client may not understand from the label alone (e.g. what
"varifocal" means) — again, universal: a qualification quiz's options benefit from the same
mechanism whenever a choice needs more context than fits in a label. Optional — an option
with no `helpText` renders with no `?` button at all, not a disabled one.

**FR-43-17 — add-on price list (v1.4.0).** One site-wide list of add-on groups, each a list of options
`{key, label, price}` (price in the shop's currency, entered the same way product prices are), kept on one settings
page (WooCommerce > Add-on prices, capability `manage_woocommerce`, nonce-checked, every field sanitised). A priced
add-on step names one group (`priceGroup`); its option values are that group's option keys, and the price each
option shows is read from the list at render time, never typed into the block. It reads "+£30.00" (`pricePrefix`
`plus`, the default), "from £59.00" (`from`, a starting price later choices add to; the stage line then shows it
without the "+"), or "included" at no cost; a "no add-ons" option in a priced step reads "£0.00". Changing a price on the settings
page changes every flow and every cart line from the next recalculation (FR-43-18).

**FR-43-18 — the list is the only price authority (v1.4.0).** The browser sends only `{group, key}` pairs with the
add-to-cart request (the `/sgs/v1/cart/add-item` proxy's optional `addons` argument, or the Store API's
`woocommerce_store_api_add_to_cart_data`). The server resolves each pair against the list: an unknown group or key,
or two options from one group, rejects the request. The resolved lines (group, key, label, price) are stored as cart
item data; `woocommerce_before_calculate_totals` sets the line's price to the product's own price plus the sum of
its add-on prices re-read from the list; the lines are copied to the order item's meta and shown in the bag, the
checkout and the order as one line, e.g. "Single vision · Thin 1.67 · Polarised grey". No client-sent price,
total or label is ever used.

**FR-43-19 — summary panel (v1.4.0; v1.8.0 summary).** A flow can show a summary beside its questions
(`showPricePanel`). It holds:
- the product's image, swapped for the resolved variation's image
- the product's brand (WooCommerce `product_brand`), its name, and its chosen options joined by " · " (the page
  buybox's variation, named from the product's own attribute terms, plus the flow's product-option answers; a value
  starting with a digit carries its attribute's label, e.g. "Black · Frame size 56")
- the base row (label `summaryBaseLabel`, default "Base price")
- one row per chosen priced option, in question order (the option's `summaryText` or label, and its price;
  "included" for 0)
- one muted row per other unpriced answer (the question's `summaryLabel` or step label, and the option's
  `summaryText` or label, e.g. "Prescription · Sending it later")
- a placeholder row until the first priced choice (`summaryPendingLabel`, `summaryPendingText`: "Lenses · not
  chosen yet")
- the total
- an optional help note (`stageNote`, `stageNoteLink`, `stageNoteIcon`)

A pre-selected default (`isDefault`) counts as an answer from the start (Continue is live and the purchase carries
it), but its row appears only once the shopper has reached its question.

It sits beside the steps on wide containers (`summaryPosition` start or end) and collapses to a "Your box · total"
row on narrow ones. It is the stage of the showcase layout (FR-43-24). Display only; FR-43-18 is the authority.
Code: `includes/choice-flow-summary.php`, `choice-flow/summary.js`.

**FR-43-20 — what is being bought (v1.4.0).** A purchase terminal in a flow with add-on steps adds the page's
current product: on a product page, the variation the shopper has chosen there (colour, size), which the buybox
publishes when it changes; otherwise a product set on the flow. A step's option may end the flow as "no add-ons"
(the draft's "No prescription": the frame alone goes in the bag).

**FR-43-21 — answers and fields travel with the purchase (v1.6.0).** A purchase terminal also sends (a) the answer
to every unpriced question on the path actually taken (label = the step's label, value = the chosen option's
label; priced answers already travel as FR-43-18 pairs) and (b) every text, number or file field placed in the
terminal's own step (a result step may hold form fields beside the result, so an option can route to "a result
that asks for a photo" with no extra navigation). Required fields are checked in the browser before the request.
The server sanitises every entry (at most 16; a label up to 60 characters, a value up to 200), stores them on the
cart line, shows each as its own row on the line (bag, cart, checkout) and copies them to the order line. A file
field uploads through a cart-scoped endpoint (`POST /sgs/v1/cart/upload`: the rest nonce, the forms rate limit,
the private uploader) that stamps the file with the shopper's cart session; the server accepts a file ID only
when that stamp matches the adding session, shows it as "Photo uploaded", and gives staff a download link on the
order screen and in the new-order email (capability and nonce checked). Generic: engraving text, a photo for a
custom print, a prescription.

**FR-43-2 — branching.** Any step gains a `nextStepMap` attribute: answer value → target
step ID. This is the one genuinely new mechanism this spec introduces (per-step routing,
distinct from `sgs/form`'s existing per-FIELD `conditionalField`/`conditionalOperator`/
`conditionalValue` show/hide logic, which stays exactly as-is and serves a different
purpose). Default (no map, or answer not matched) is "advance to the next step in order" —
so a flow with zero branching behaves identically to a plain linear wizard.

**FR-43-2a (adversarial-council MUST-FIX, editor-time integrity).** On publish/save, the
editor validates every `nextStepMap` entry against the flow's own step tree: a target ID
that doesn't resolve to a live step in the same flow blocks publish with a named error
(never a silent fall-through to "advance in order" — that hides a broken branch from the
client who just built it); a routing cycle with no terminal exit is flagged the same way.
This is a straightforward integrity check against the block's own attribute tree — cheap
to build, and it is the difference between a client seeing a red editor warning and a real
site visitor getting stranded mid-flow with no error at all (Support Realist finding).

**FR-43-2b (adversarial-council note — largely closed by FR-43-10's correction).** Because
every priced step now resolves to a real WooCommerce attribute axis (FR-43-10), a
`nextStepMap` path that skips a priced step cannot produce an under-priced purchase the way
a client-summed "answer deltas" model could have: WooCommerce's own variation resolution
requires every attribute on the product to be matched to a real, purchasable variation, and
the existing `/sgs/v1/cart/add-item` proxy already validates the submitted attribute set
against `get_attributes()` server-side (per Spec 27) — an incomplete or skipped axis simply
fails to resolve to a purchasable variation and the add-to-cart call is rejected, not
under-priced. No new abuse-mitigation FR is needed for this path as a result of the
FR-43-10 correction.

## 3. Terminal actions (pick one per flow instance, or expose all three as configurable)

**FR-43-3 — Recommendation result.** A plain result screen — text, optionally driven by a
simple scoring/matching rule across prior answers (e.g. "most answers pointed to X" —
the exact matching-rule shape is a build-time decision, not specified further here; keep
it simple, a weighted-tag match is enough for v1, no formula/expression engine — deferred
in full at FR-43-12 below, corrected citation (v1.2.0): the earlier text cited a
now-nonexistent "Spec 42 FR-42-8" boundary — FR-42-8 is Spec 42's cache/nonce contract and
has nothing to do with pricing or scoring; there is no live Spec 42 FR to point at here).

**FR-43-4 — Email-capture handoff.** Collect an email, send the result to it, optionally
add to a mailing list (reuse whatever list/webhook mechanism `sgs/form` already has —
this project's forms notify via N8N webhooks, never `wp_mail()`; do not add a second
notification path). **Rate-limiting inherits
from `sgs/form`'s existing `rateLimit` config, applied per-flow-instance** (Competitor +
Cynic MISSING finding — a quiz-style lead-capture terminal with no spam defence is an open
relay for lead-list poisoning and N8N webhook cost amplification); this is validated
against FR-42-8's now-cache-independent config lookup, not the vulnerable transient path.
Built (v1.7.0) as the `email` action of `sgs/choice-flow-result` (email label, submit label, success message,
`rateLimit` 1 to 50, default 5) and `POST /sgs/v1/choice-flow/submit`
(`includes/forms/class-choice-flow-submit.php`): rest nonce, honeypot (a filled one gets a fake success and nothing
is stored), `is_email`, answers on the path (at most 16; label 60, value 200) and tags (at most 20, `sanitize_key`),
then `Form_REST_Submission::check_rate_limit()` and `Form_Processor::process()`, which stores the submission and
fires the N8N webhook. The rate limit is read from the saved block, never the request: `flowRef` is the saved flow's
slug (the linking block stamps it onto the flow post's root as it renders it) or `page:<postId>:0` for a flow placed
directly on a page. Proof: `tests/php/run-choice-flow-submit-standalone.php` (the 5th submission allowed, the 6th
refused with 429).

**FR-43-5 — Real purchase (corrected, v1.2.0).** Add to cart with a server-computed total
— by calling Spec 27's **existing, already-shipped, already-secure**
`/sgs/v1/cart/add-item` proxy directly, exactly the way `sgs/buybox`/`sgs/product-card`
already do, passing the fully-resolved variation's attribute set the same way `sgs/buybox`
does today. **No proxy change is needed and none should be built** — because every priced
step resolves to a real WC variation (FR-43-10), the terminal step's selections ARE a
normal `variation[]` attribute payload, identical in shape to what `sgs/buybox` already
sends. There is no surcharge/delta field to add, because there is no value flowing through
this call that isn't already a real, live WooCommerce price. Do **not** rebuild Spec 42
v1.0.0's retired pricing-security apparatus (bespoke tile-ID validation, revision-pinning,
a new minor-unit currency contract, or a new server-side surcharge-resolution mechanism) —
that whole mechanism existed only because v1.0.0 (and this spec's own v1.1.0) assumed a NEW
pricing system with no security precedent. It isn't needed: this reuses a precedent that
already prices against live WooCommerce data, never a WordPress revision and never a
client-submitted delta of any kind. Built (v1.7.0): `choice-flow/add-to-bag.js` sends the flow's own resolved
variation (`id` = variation ID, taxonomy-keyed `variation[]`) and falls back to the page buybox's variation; a
variable product with no resolved variation shows an inline error and sends nothing. A variation the flow resolved
is never replaced by a later buybox event (`pricing.js::storeLiveBase`).

## 4. Delivery — inline or full-screen modal

**FR-43-6 (v1.5.0).** A flow is saved once as a `sgs_choice_flow` post (Choice Flows admin
screen) and shown wherever it is needed by a `sgs/choice-flow` block linked to it: the block's
"Linked flow" picker (`LinkPopoverField` filtered to `sgs_choice_flow`, the same picker as Spec 42
FR-42-4's "Linked Form") writes the post's slug into `flowId` and sets `flowIsLinked`, and
render.php draws that post's own `sgs/choice-flow` (steps, pricing, styling) in its place. A link
whose post is gone renders a fallback message (plus an editor notice for `edit_sgs_forms`
holders), the same two-audience degrade as FR-42-7a; the flow post's own block never carries
`flowIsLinked`, which is what stops a flow rendering itself. Delivery is either inline (the linked
block placed on a page) or full-screen (the linked block inside a `sgs/modal`, `size: fullscreen`,
opened by any link to the modal's anchor or by its own trigger). The Choice Flows list's
"Embedded on N pages" column counts `flowId` references.

**FR-43-7 (Mama's Munches, v1.7.0).** One variable product with four choices: Number in Pack creates the
variations (and the price); Flavour, Topping and Dietary are product attributes that do not, so they travel as
answers on the bag line. Two journeys, both a sequential, one-decision-per-screen flow in a full-screen `sgs/modal`:
(A) full customisation: Flavour, Topping, Dietary, then Number in Pack, then add to bag; (B) the pack is picked on the
product page, whose buybox button reads "Choose your flavours" and opens the flow for the other three (FR-43-22).
Neither uses branching.

**FR-43-22 (v1.7.0) — the buybox button can open a popup.** `sgs/buybox` `addToCartAction` (`cart` | `modal`) and
`addToCartModalId` (the `sgs/modal`'s anchor): in `modal` mode the button opens that modal through the modal's own
open-anywhere listener (`data-sgs-modal-open`) instead of adding to the cart, keeps the in-stock gate and keeps
announcing the chosen variation, so a flow inside the modal buys it. No modal named falls back to `cart`.

**FR-43-23 (v1.8.0) — guided buybox.** `sgs/buybox` `layout: guided` (default `standard`) turns the buy box into a
short flow on the page itself. Design direction: *the meter is the receipt*: calm and token-driven (every colour,
font and radius comes from the client's theme), and the one memorable detail is a segmented progress meter whose
finished segments carry the chosen value ("Chocolate · Chip · Vegan · 20") and jump back to that group when pressed.
- **Groups:** every variation-forming attribute from `Product_Manifest::build()` axes, plus (setting
  `guidedAnswerAttributes`, default on) the product's other visible attributes, in the product's own attribute
  order. Answer groups never enter variation resolution; their choices travel as answer rows (the cart proxy's
  `fields`, shown on the bag line as FR-43-21 rows).
- **Layout (top to bottom):** the live price (unchanged); the meter (one segment per group; on narrow containers,
  dots plus "2 of 4 · Topping"); the active group (bold group title, the group's options as the existing pickers
  with term swatch images); a nav row with Back (left, hidden on the first group) and Next (right, muted with
  `aria-disabled` until the group has a choice); the Add to basket button stays where it is.
- **Behaviour:**
  - Picking an option moves to the next group after a short beat (setting `guidedAutoAdvance`, default on;
    instant under reduced motion).
  - A default choice counts as made, and the flow opens on the first group without one.
  - The active-group region keeps a stable minimum height, so nothing jumps.
  - Add to basket or Buy now pressed with groups unfinished shows "Finish choosing: Topping, Dietary"
    (`aria-live`), then moves to and focuses the first unfinished group. It never adds a partial choice.
- **Code:** new files only (`buybox/render.php` and `product-card/view.js` are over the size cap):
  `includes/buybox-guided.php`, `buybox/guided.js`, `buybox/GuidedPanel.js`.

**FR-43-24 (v1.8.0, detail v1.9.0) — showcase layout for full-screen flows.** `sgs/choice-flow` `flowLayout:
compact | showcase`, set on the saved flow (FR-43-25). `compact` is the single column for a flow inline on a page.
`showcase` is for a flow shown full screen and spends the screen the way the Eye Care draft's lens flow does (the
draft's `lensOpen` dialog); it ignores the compact box (`maxWidth`, `padding`) and fills its full-screen modal edge
to edge (the modal's own padding drops, and a full-screen modal fades in rather than scales).
- **Frame:** a full-height column on the page background (surface). At the top, a header bar on the raised
  background (surface-alt) with a bottom border: the logo (`headerLogo`, `headerLogoHeight`), the step name in
  small spaced capitals, and Close (`closeStyle`); from the second question the step name reads "<Brand> <Product> —
  <Step name>". A 3px progress line runs full width beneath it (`progressColour`; `progressCounts`: `finished`
  counts answered questions, `current` the one on screen, so question 1 of 4 fills a quarter). In the middle, the
  body grid, the only part that scrolls. At the bottom, the footer bar on the raised background with a top border:
  Back left, the optional skip link on the first question ("Frame only? Skip the lenses": `skipPrompt`, `skipLabel`;
  it takes the route of the flow's "no add-ons" option and shows only when one exists; wide containers only), the
  step's actions right. Footer buttons share one small uppercase style at the theme button preset's height.
- **Body grid:** a sticky "stage" aside (`minmax(300px, .8fr)`; `minmax(250px, .7fr)` under a 1100px container)
  beside the step pane (`minmax(0, 1.55fr)`; `1.6fr` under 1100px).
  - The stage (FR-43-19) fills its column on the stage colour (`stageColour`, default surface-alt): a bordered square
    photo that swaps with the resolved variation, the brand, name and chosen options (which take the slack, so the
    lines sit low), the running lines, a large total in the heading font, and the help note at the bottom edge.
  - An option can carry a photo treatment (`stageEffect`: dim, deepen, soften, brighten) that the stage photo shows
    while it is chosen, named in a small tag on the photo (a lens finish).
  - The help note is a bordered card; with a link the whole card is the link, with an optional round icon badge
    (`stageNoteIcon`: WhatsApp, phone, email, chat) and its own icon, border and hover colours.
- **Step pane:** padded 40/44/56. It holds:
  - a position line in the accent ink ("Question 1 of 3": `stepCountLabel`; a question's own `eyebrow` replaces it
    and leaves that question out of the count; a result step shows none)
  - the step title in the heading font (38px from a 600px container, 28px under), wrapping plainly
  - an intro paragraph (the question's `intro` attribute, at most 56 characters wide)
  - the options as large cards: two columns once the flow is 620px wide, one under; a step whose options carry no
    pictures runs three across from 768px as text cards. A picture card has a full-width 16:9 image band, then the
    title with its price aligned right (accent ink), then the description, then its badge as a solid accent tag; a
    text card carries its badge as a soft tag beside the title. The selected card gets a 2px border in the text
    colour on the stage colour. The '?' help toggle is a 30px disc that fills dark on hover; its answer opens as a
    dark panel under the card.
  - A result step reads as a quiet confirmation panel; a result can put the running total on its purchase button
    (`buttonShowsTotal`: "Add to bag £418.00"), and a lone purchase button takes the primary style.
- **Narrow containers (under 600px):** the stage collapses to a slim row above the steps (a 72px thumbnail, the
  brand, name and options, and the total); the running lines move to the final step's summary and the help note to
  the end of the step pane.
- **Opening:** the flow takes focus when its dialog opens (not Close, which would show a focus ring unprompted), and
  the total pops.
- **Motion** (the draft's values, all off under reduced motion): the progress fill eases over 0.5s
  (cubic-bezier(.2,.7,.2,1)); a step rises 18px in over 0.4s; the total pops (scale .6 to 1.15 to 1) over 0.35s when
  it changes; the stage photo's treatment eases over 0.6s; option cards move border and lift over 0.25s and shadow
  over 0.3s; Close and Back over 0.25s; the '?' over 0.2s; a help panel fades in over 0.25s.
- Every colour, font, radius and spacing comes from the client's theme tokens or a setting above, so any client's
  flow gets the same structure.

**FR-43-25 (v1.8.0) — architecture: one saved flow, its placements, and the product link** (Bean, 2026-09-26).
- **The saved flow (`sgs_choice_flow`) is the single source.** It holds questions, options, images, pricing sources,
  endings, behaviour and the whole look, including its layout (compact or showcase), header, footer, progress bar
  and summary. A linking block (FR-43-6) shows it exactly as saved; placements carry no overrides. To show a flow
  differently, save a second flow.
- **A product links to a flow.** Every purchasable product (simple or variable) gets a "Customisation flow" picker
  on its edit screen (product meta `_sgs_choice_flow`, a flow slug). With a flow linked, the product page's buybox
  wires itself:
  - the Add to Cart button becomes the flow's opener (FR-43-22, labelled from the buybox)
  - the buybox renders the full-screen `sgs/modal` holding the linked flow
  - no per-product template or hand-placed popup is needed
  - a simple product's flow has no variation steps; it adds answers, fields and add-ons to that product
  - the Choice Flows list shows "Used by N products" beside "Embedded on N pages"
- **The guided buybox (FR-43-23) is separate.** It never runs a saved flow: its groups are always the product's own
  attributes. It gets the essentials from WooCommerce itself:
  - each option's image, badge and one-line description are attribute-term fields beside the existing swatch fields
    (`includes/configurator-term-fields.php`: `_sgs_swatch_image_id`, `_sgs_term_badge`, `_sgs_term_description`),
    set once per term and shown everywhere: buybox pickers, the guided buybox, and flow product-option steps that
    don't override them
  - the default option is the product's own WooCommerce default attributes
  - its peripherals are buybox settings: Back / Next / Add to basket / Buy now wording and styling, and the
    meter's style and colour
  - rich features (custom questions, add-ons, stage, endings) belong to a saved flow in a popup

## 5. CPT — `sgs_choice_flow`

**FR-43-8 (values committed, v1.2.0 — was "same requirement to decide", now "same decided
values").** Mirrors Spec 42's `sgs_form` CPT decisions exactly, using the SAME literal
values, not a parallel decision: capability = `edit_sgs_forms` (Spec 42 FR-42-1 — one
capability governs both CPTs, not two separate ones, since both are framework-level
"who can build a reusable flow" questions); `custom-fields` skipped, settings stay root
block attributes (FR-42-2); `revisions` retention cap = 10 (FR-42-3). Same identity model
(slug-keyed, `resolve_choice_flow()` mirroring `resolve_form()`/`resolve_modal()`), same
disclosed analytics gap (FR-42-13 applies here identically — the mandatory-reuse
justification is equally unbuilt for flows).

## 6. Step engine + pricing — what's genuinely new vs. genuinely reused (v1.2.0 retitled — see FR-43-9's correction below; this is no longer "one shared engine, three consumers")

**FR-43-9 (rewritten, adversarial-council MUST-FIX — Cynic and Ship-PM independently
verified the same code fact).** `sgs/form-step` has no step runtime to extend — it is a
render.php marker div (`.sgs-form-step` + data attrs) queried by its PARENT. The real step
engine (878 lines: `updateStepVisibility`, `saveStepState`/`restoreStepState`,
`evaluateCondition`/`applyConditionalLogic`, validation, submit) lives unexported inside
`sgs/form`'s own `view.js`, fused to `sgs/form-review`. **Decided (v1.2.0), not deferred to
build time:** `sgs/choice-flow` gets its OWN, small Interactivity-API store (step index,
`nextStepMap` resolution, session persistence) — it does NOT attempt to extend or share
`sgs/form/view.js`'s engine in v1. Accept the resulting ~150-200 lines of duplicated
navigation/persistence logic as the v1 cost. Revisit extraction into a genuinely shared
primitive only once both `sgs/form` and `sgs/choice-flow` exist and the real overlap is
observable, not asserted in advance. `sgs/choice-flow` continues to reuse `sgs/form-step`
as an inert STEP MARKER (it already is one) and reuses `sgs/form`'s field blocks unchanged
for plain data-capture steps (FR-43-1) — those are genuine, already-built reuse; only the
step-navigation runtime itself is net-new. **Spec 27's configurator is dropped from the
"consumers" count** — nothing in either spec commits it to adopting step semantics, and
counting a third, uncommitted consumer to justify an abstraction is how a two-consumer
sharing decision gets over-engineered for a consumer that never arrives.

**FR-43-10 (rewritten, v1.2.0; v1.7.0 any attribute).** A product-option step names one attribute of the flow's
product (`productAttribute`, a `pa_*` taxonomy; the product is the page's own product on a product page, else the
root's `flowProductId`). Its mode is read from the product (`WC_Product_Attribute::get_variation()`): an attribute
that creates variations is a priced step; one that does not is an unpriced answer (its terms as options, recorded
like a plain answer, carried to the bag line by FR-43-21). A priced step calls `sgs/buybox`'s existing manifest +
pricing mechanism directly — `Product_Manifest::build()` for the live combo data, `sgs_configurator_mode_price()` /
`sgs_configurator_format_minor()` for display. Its options render as the flow's own option buttons (so branching,
Back, badges and styling apply unchanged), one per term slug, each labelled "from £X" (the cheapest in-stock combo
holding that term) or, when the product has one variation attribute, its exact price; a term with no in-stock combo
is disabled. The root seeds the manifest's combos to the browser (`data-flow-combos`, variation ID, price and stock
per combo key, left out above 24 KB), which picks the variation once every priced step has a choice; the cart proxy
re-validates the variation and its attributes server-side (Spec 27), so the browser's lookup is display only. No
manifest building or price computation is re-implemented. Code: `includes/choice-flow-product-attribute-step.php`,
`includes/choice-flow-variation-seed.php`, `choice-flow/variation.js`.

**FR-43-10a (rewritten, v1.2.0 — supersedes the v1.1.0 typed/manual fallback entirely).**
The v1.1.0 text proposed a fallback for `sgs/option-picker`'s typed/manual mode
(`optionItems: {key, label}`, free-text `key`, no server price authority) via a
server-generated `optionId`. **That fallback is withdrawn.** Checked directly against the
code (`plugins/sgs-blocks/includes/helpers-configurator-pricing.php`,
`includes/class-product-manifest.php`): `sgs/option-picker` itself has no pricing
mechanism of its own to fall back to — the price authority was always `sgs/buybox`'s
manifest, not option-picker. **Requirement (replacing the old (a)/(b) either-or): every
priced step in `sgs/choice-flow` MUST bind to a real WooCommerce attribute/variation via
the manifest (option-picker's WC-bound mode, inheriting its stable term slugs for free).
Typed/manual pricing is not a supported path for `sgs/choice-flow` and must not ship.**
This means the eyewear lens flow requires lens thickness and finish/tint to exist as real
WooCommerce attribute terms with real per-variation pricing on the underlying product —
a catalogue-setup task (creating the attributes and variations in WooCommerce), not a new
block-engine capability. State this precondition to whoever builds the first real
`sgs/choice-flow` purchase instance; it is cheap (WooCommerce's own attribute/variation UI)
but it is a real prerequisite step, not something the block conjures from a typed price map.

## 7. Client-facing disambiguation

**FR-43-11.** `sgs/form` and `sgs/choice-flow` need distinct, plain-English inserter
descriptions naming the actual behavioural difference (branches to different questions
vs. collects information in one flexible form) — not just distinct names — so a client
building "which treatment suits you" doesn't reach for the wrong block by guessing from
a name alone.

## 7a. Known cross-cutting gap — shared with Spec 42, not resolved here

**FR-43-14.** Same disclosed gap as Spec 42 FR-42-10: `sgs-clone-orchestrator.py`'s
`--deploy-target` cannot create a new `sgs_choice_flow` post — a cloned draft containing
a flow will still emit inline content, breaching the CPT-backed mandate for anything
built via `/sgs-clone`. One follow-up fixes both CPTs; do not solve it twice.

## 8. Explicitly deferred, not invented

**FR-43-12.** The exact matching/scoring rule behind FR-43-3's recommendation result
(weighted tags vs. simple last-answer-wins vs. something else) is a build-time design
call, not specified further here — keep it simple for v1.

**FR-43-13.** Preset starter flows (a ready-made "which treatment" template, a ready-made
lens-builder template) are explicitly out of scope for this spec, same open-brainstorm
status as Spec 42 FR-42-12 (corrected citation, v1.2.0 — was mis-cited as a nonexistent
"FR-42-20"; Spec 42's index stops at FR-42-13) — do not invent a field-by-field template
without the competitor-template research that spec already flagged as incomplete.

## 9. Phasing (added v1.2.0, Ship-PM MUST-FIX — the single biggest missing thing in the
original document: 14 FRs presented as a flat list with no MVP line)

**Phase 0 — this week, ~1hr, zero dependency on the rest of either spec.** Spec 42
FR-42-0 (fail-open fix) only. Deploy, verify on the canary.

**Phase 1 — `sgs_form` CPT, no mandatory rebuild yet.** Spec 42 FR-42-1/2/3 (decided
values above), FR-42-4/5, FR-42-7a, FR-42-8. New forms are CPT-backed; existing ones keep
working unchanged.

**Phase 2 — `sgs/choice-flow`, plain-question step + recommendation terminal only.**
FR-43-1 (plain-question step type only), FR-43-2/FR-43-2a, FR-43-3, FR-43-8, FR-43-11, its
own IAPI store (FR-43-9). **This alone ships a complete, sellable feature — a "which
service suits you" qualification quiz — touching zero WooCommerce, zero pricing, zero
modal, and zero of `sgs/form`'s existing engine.** It is the natural first slice and was
not named as one anywhere in v1.1.0. **SHIPPED 2026-09-15 (D1082) — full evidence
`decisions.md` D1082.**

**Phase 2b — visual + per-option richness pass (added v1.3.0, 2026-09-15).** FR-43-15
(per-option image), FR-43-16 (per-option help-text toggle), plus a plain styling pass on
`sgs/choice-flow`/`sgs/choice-flow-question`/`sgs/choice-flow-result` (max-width/padding —
Phase 2 shipped with zero box attrs — button/option-card border+state treatment, a step
progress indicator, and a Tier-V CSS step transition). Grounded against the real Ward End
Eye Care lens-configurator source, not a generic reference. Still zero WooCommerce/pricing/
modal — those stay Phase 3/4.

**Phase 3 — priced steps + real purchase.** FR-43-1's priced step types, FR-43-17 to FR-43-20 (add-on price
list: built first, for the Eye Care lens configurator), FR-43-10/FR-43-10a (variation source), FR-43-5, FR-43-4's
rate-limit note. The variation source still requires the product's attributes to exist as real WooCommerce
variations; the add-on source requires only the price list to be filled in. **Add-on source SHIPPED 2026-09-25**
(FR-43-17 to FR-43-20, plus FR-43-21 answers and fields) as the Eye Care lens configurator, proven end to end on
eye-care-test. **Variation source, purchase and email ending SHIPPED 2026-09-26** (FR-43-10/10a as product-option
steps over any attribute, FR-43-5, FR-43-4), proven live on sandybrown.

**Phase 4 — modal delivery + Mama's Munches acceptance criterion.** FR-43-6 SHIPPED 2026-09-25 (linked flow, inline
or in a fullscreen `sgs/modal`); FR-43-7 and FR-43-22 SHIPPED 2026-09-26 (Mama's journeys on sandybrown
product 3990).

**v1.8.0 follow-up (FR-43-23 to 25 and the Continue model): SHIPPED 2026-09-26**, live on sandybrown and
eye-care-test. Closing QA at 1440 and 375: Mama's journeys A, B and C reach the cart with every answer row
(including a re-tapped default), the guided finish-choosing guard, Continue muted then active with its hint, Add to
basket and Buy now, an editor round trip for every new setting, and the Eye Care £268 path. Plan:
`plans/archive/2026-09-26-choice-flow-ux-and-guided-buybox.md`.

**v1.9.0 showcase parity: SHIPPED 2026-09-26**, live on eye-care-test: the Eye Care lens flow matches the draft at
1440, 768 and 375 in screenshots and computed motion, with the accepted differences recorded in
`plans/2026-09-24-eye-care-hand-build-design.md` ("Lens-flow parity").

**Phase 5: SHIPPED 2026-09-26** (Spec 42 FR-42-7b, FR-42-9). A choice flow still embedded on a
page or linked from a product can't be trashed or deleted, by the same guard and the same
reference finder as forms (`Sgs_Cpt_Delete_Guard`, `Sgs_Cpt_References`). Parked in
`plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`: FR-42-10/FR-43-14 (clone-orchestrator
CPT-creation gap) and FR-42-13 (analytics).

## 10. Requirement index (v1.8.0)

| FR | One-line |
|---|---|
| FR-43-1 | Three step types in one flow (v1.2.0: merged the old "priced tile" + "WC variation-picker" into one) — plain question, priced WC-variation, plain data-capture |
| FR-43-2 | `nextStepMap` — per-step answer-based routing, the one new mechanism |
| FR-43-2a | Editor-time validation: dangling target / cycle blocks publish — decided |
| FR-43-2b | Skip-a-priced-step abuse path — resolved as a side effect of FR-43-10's correction, no new FR needed |
| FR-43-3 | Terminal: recommendation result screen |
| FR-43-4 | Terminal: email-capture lead-gen handoff (N8N webhook, not `wp_mail()`) + inherited rate-limit |
| FR-43-5 | Terminal: real purchase via Spec 27's `/sgs/v1/cart/add-item` proxy, unmodified — corrected citation, no bespoke security apparatus |
| FR-43-6 | A saved `sgs_choice_flow` post shown by a linked `sgs/choice-flow` (`flowId` + `flowIsLinked`, same picker as Spec 42), inline or inside a full-screen `sgs/modal` |
| FR-43-7 | Mama's Munches: one product, only the pack priced; full-customisation popup and pick-on-page-then-popup journeys |
| FR-43-8 | `sgs_choice_flow` CPT — same literal capability/cache/revision values as Spec 42, not a parallel decision |
| FR-43-9 | Own small IAPI store, decided now — `sgs/form-step` has no runtime to extend, `sgs/form/view.js`'s engine stays block-private in v1 |
| FR-43-10 | A product-option step reads any attribute of the flow's product: variation attributes price via `Product_Manifest::build()`, the rest are unpriced answers |
| FR-43-10a | Typed/manual pricing withdrawn as a path; WC-binding is the only supported route |
| FR-43-11 | Distinct plain-English inserter descriptions vs `sgs/form` |
| FR-43-12 | Recommendation-matching rule: build-time call, keep simple |
| FR-43-13 | Preset templates: explicitly deferred, same status as Spec 42 FR-42-12 |
| FR-43-14 | Cloning pipeline can't create a flow CPT — shared gap with Spec 42, fix once |
| FR-43-15 | Per-option image (universal, not lens-specific) — grounded in the real lens-flow source |
| FR-43-16 | Per-option help-text `?` toggle (universal, not lens-specific) — grounded in the real lens-flow source |
| FR-43-17 | Add-on price list: a second priced-step source (site-wide groups of `{key, label, price}`, one settings page) |
| FR-43-18 | The list is the only price authority: `{group, key}` from the browser, resolved and priced server-side, stored on the cart and order line |
| FR-43-19 | Summary panel: product image, chosen options, priced rows, total; the showcase stage (display only) |
| FR-43-20 | What is bought: the page's chosen variation, or a set product; a "no add-ons" exit |
| FR-43-21 | Unpriced answers on the path and fields in the terminal step travel with the purchase; file fields via a session-stamped cart upload |
| FR-43-25 | Architecture: the saved flow owns content and look; products link to a flow and the buybox wires the popup; the guided buybox stays product-options-only with term-level image, badge and description |
| FR-43-24 | Showcase layout (`flowLayout`): full-screen flows use a stage (the finished product, running lines, total) beside large image-led option cards, as in the Eye Care lens draft |
| FR-43-23 | Guided buybox: one option group at a time on the product page, a meter that doubles as the summary, a finish-choosing guard |
| FR-43-22 | The buybox button can open a popup (`addToCartAction: modal`) so a flow finishes a purchase started on the product page |
