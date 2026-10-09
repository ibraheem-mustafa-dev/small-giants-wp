---
doc_type: spec
spec_id: 43
spec_version: 1.14.0
status: active
owner: framework
created: 2026-09-14
last_verified: 2026-10-09
companions:
  - 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md (owns ALL pricing security for this spec's purchase path; the secure `/sgs/v1/cart/add-item` proxy is reused as-is, never re-derived)
  - 42-SGS-FORM-CPT-AND-PRICING.md (shares the `LinkControl` picker component and the reference-lifecycle contract, built once, applied to both CPTs)
  - 32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no inline `style=` on any new markup)
---

# Spec 43 — `sgs/choice-flow`

## 0. What this is, in one sentence

A step-by-step wizard block: each step asks one thing, any step can route to a different
next step based on the answer, and the whole thing ends in a recommendation, an
email-capture handoff, or a real WooCommerce purchase — the same mechanism whether it's a
dentist's "which treatment suits you" quiz, an eyewear shop's priced lens builder, or a
cookie shop's flavour-then-pack-size picker.

## Rulings (Bean)

- 2026-09-14: one block family; pricing is an optional per-step capability (not a separate quiz block and configurator).
- 2026-09-14: the same block in `sgs_modal` full-screen mode replaces Mama's Munches' cramped inline pickers with one decision per screen.
- 2026-09-24: eyewear lens prices are one site-wide add-on price list, not WooCommerce variations and not separate lens products.
- 2026-09-25: a flow is built through the `sgs_choice_flow` CPT (`flowId` + `flowIsLinked`); the prescription is asked inside the configurator per pair.
- 2026-09-25: Mama's Munches: four choices, only the pack changes the price; two journeys (full customisation in a popup; pack on the page then "Choose your flavours").
- 2026-09-26: picking selects, a footer Continue advances; the saved flow owns content and look; products link a flow; the guided buybox is product-options-only.
- 2026-09-26: the lens flow must look, animate and work as the Eye Care draft does (draft parity, FR-43-24).
- 2026-09-28: a question can open the chosen option's next step underneath.

## 1. Why one block, not two

A qualification quiz and a priced configurator are the same block with different steps turned on, so there is one block family and pricing is an optional per-step capability (Bean, 2026-09-14). A priced step has one of two sources: a WooCommerce product variation axis, priced by `sgs/buybox`'s `Product_Manifest` (`plugins/sgs-blocks/includes/class-product-manifest.php`) and `sgs_configurator_mode_price()` (`plugins/sgs-blocks/includes/helpers-configurator-pricing.php`), which are server-authoritative, tax-aware and attested per FR-28-16 (Spec 27 Part 2); or the site-wide add-on price list (FR-43-17 to 20). `sgs/option-picker`'s typed free-text mode carries no price authority and is not a pricing source.

## 2. Step types (mixed freely within one flow)

**FR-43-1:** a flow's steps are `sgs/choice-flow-question` (plain question, priced product-option step or priced add-on step) and `sgs/choice-flow-result` (terminal); `sgs/form-step` is the inert step marker and data-capture steps reuse `sgs/form`'s field blocks. A step is any of:

- **Plain question** -- multiple-choice options, no price. The qualification/recommendation use case (dentist/fitness "which service suits you"). Each option MAY carry an optional image and an optional help-text toggle (FR-43-15/FR-43-16).
- **Priced product-option step.** Resolves ONE WooCommerce attribute axis per step, reading `sgs/buybox`'s existing `Product_Manifest` for live combo pricing: one attribute resolved per step (e.g. step 1 = flavour, step 2 = pack size; or step 1 = lens thickness, step 2 = finish/tint). Covers the Mama's Munches use case (replaces a cramped inline pill-picker with a full-screen, one-decision-per-screen sequence). Renders each step's options as the flow's own option buttons, bound to that step's manifest-derived axis, not `sgs/option-picker`'s typed/free-text mode (FR-43-10).
- **Priced add-on step (FR-43-17)** -- a question whose options are the options of one group in the site-wide add-on price list; the chosen option's price is added to the product being bought. Any client can use it: an optician's lens type, thickness and finish; a print shop's finishes; a bakery's add-ons.
- **Plain data-capture step** -- reuses `sgs/form`'s existing field blocks (text, file upload) unchanged. The prescription/eye-test-upload use case; it does **not** affect price, and a flow can freely mix priced and unpriced steps.

**FR-43-15 -- per-option image (universal, not lens-specific).** Each option on a plain-question step MAY carry an optional `image` (a single media attachment: id/url/alt, matching `sgs/media`'s existing image-attribute shape). When set, it renders in the option card's existing 16:9 preview zone instead of a plain colour band. Optional: an option with no image renders as a plain text card.

**FR-43-16 -- per-option help text (universal, not lens-specific).** Each option MAY carry an optional `helpText` string. When set, a small `?` toggle button renders overlaid on the option card (floating, top-right corner; it does not affect the card's own click target or layout flow); toggling it reveals `helpText` in a panel directly beneath that option, dismissed by toggling again. Optional: an option with no `helpText` renders with no `?` button at all, not a disabled one.

**FR-43-17 -- add-on price list.** One site-wide list of add-on groups, each a list of options
`{key, label, price}` (price in the shop's currency, entered the same way product prices are), kept on one settings
page (WooCommerce > Add-on prices, capability `manage_woocommerce`, nonce-checked, every field sanitised). A priced
add-on step names one group (`priceGroup`); its option values are that group's option keys, and the price each
option shows is read from the list at render time, never typed into the block. It reads "+£30.00" (`pricePrefix`
`plus`, the default), "from £59.00" (`from`, a starting price later choices add to; the stage line then shows it
without the "+"), or "included" at no cost; a "no add-ons" option in a priced step reads "£0.00". Changing a price on the settings
page changes every flow and every cart line from the next recalculation (FR-43-18).

**FR-43-18 -- the list is the only price authority.** The browser sends only `{group, key}` pairs with the
add-to-cart request (the `/sgs/v1/cart/add-item` proxy's optional `addons` argument, or the Store API's
`woocommerce_store_api_add_to_cart_data`). The server resolves each pair against the list: an unknown group or key,
or two options from one group, rejects the request. The resolved lines (group, key, label, price) are stored as cart
item data; `woocommerce_before_calculate_totals` sets the line's price to the product's own price plus the sum of
its add-on prices re-read from the list; the lines are copied to the order item's meta and shown in the bag, the
checkout and the order as one line, e.g. "Single vision · Thin 1.67 · Polarised grey". No client-sent price,
total or label is ever used.

**FR-43-19 -- summary panel.** A flow can show a summary beside its questions
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
- an optional help note (`stageNote`, `stageNoteLink` = `{url,text,source}` where `source` is `url` (the typed url),
  `phone`, `email` or `whatsapp` (the last three read live from Site Info and fall back to the typed url), `stageNoteIcon`;
  its text and sub-line colour is `summaryNoteColour`)

A pre-selected default (`isDefault`) counts as an answer from the start (Continue is live and the purchase carries
it), but its row appears only once the shopper has reached its question.

It sits beside the steps on wide containers (`summaryPosition` start or end) and collapses to a "Your box · total"
row on narrow ones. It is the stage of the showcase layout (FR-43-24). Display only; FR-43-18 is the authority.
Code: `plugins/sgs-blocks/includes/choice-flow-summary.php`, `plugins/sgs-blocks/src/blocks/choice-flow/summary.js`.

**FR-43-20 -- what is being bought.** A purchase terminal in a flow with add-on steps adds the page's
current product: on a product page, the variation the shopper has chosen there (colour, size), which the buybox
publishes when it changes; otherwise a product set on the flow. A step's option may end the flow as "no add-ons"
(the draft's "No prescription": the frame alone goes in the bag).

**FR-43-21 -- answers and fields travel with the purchase.** A purchase terminal also sends (a) the answer
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

**FR-43-2a -- editor-time integrity.** On publish/save, the
editor validates every `nextStepMap` entry against the flow's own step tree: a target ID
that doesn't resolve to a live step in the same flow blocks publish with a named error
(never a silent fall-through to "advance in order" — that hides a broken branch from the
client who just built it); a routing cycle with no terminal exit is flagged the same way.
This is a straightforward integrity check against the block's own attribute tree — cheap
to build, and it is the difference between a client seeing a red editor warning and a real
site visitor getting stranded mid-flow with no error at all.

**FR-43-2b -- skipping a priced step cannot under-price.** Every priced step resolves to a real WooCommerce attribute axis (FR-43-10), so a `nextStepMap` path that skips a priced step cannot produce an under-priced purchase: WooCommerce's own variation resolution requires every attribute on the product to be matched to a real, purchasable variation, and the `/sgs/v1/cart/add-item` proxy validates the submitted attribute set against `get_attributes()` server-side (Spec 27). An incomplete or skipped axis fails to resolve to a purchasable variation and the add-to-cart call is rejected, not under-priced.

## 3. Terminal actions (pick one per flow instance, or expose all three as configurable)

**FR-43-3 -- Recommendation result.** A plain result screen: text, optionally driven by the tag-overlap match across prior answers (FR-43-12). No formula or expression engine.

**FR-43-4 -- Email-capture handoff.** Collect an email, send the result to it, optionally add to a mailing list (reuse `sgs/form`'s mechanism: its emails go through `Form_Mailer` over `wp_mail()` and the site's SMTP, and its optional N8N event carries any list automation; do not add a second notification path). **Rate-limiting inherits from `sgs/form`'s `rateLimit` config, applied per flow instance**; an unauthenticated lead-capture terminal needs spam defence. Built as the `email` action of `sgs/choice-flow-result` (email label, submit label, success message, `rateLimit` 1 to 50, default 5) and `POST /sgs/v1/choice-flow/submit` (`plugins/sgs-blocks/includes/forms/class-choice-flow-submit.php`): rest nonce, honeypot (a filled one gets a fake success and nothing is stored), `is_email`, answers on the path (at most 16; label 60, value 200) and tags (at most 20, `sanitize_key`), then `Form_REST_Submission::check_rate_limit()` and `Form_Processor::process()`, which stores the submission, emails the shopper the `email`-action result block's heading (subject) and body, notifies the site owner (Site Info email, else `admin_email`) through `Form_Mailer`, and fires the optional N8N event. The rate limit is read from the saved block, never the request: `flowRef` is the saved flow's slug (the linking block stamps it onto the flow post's root as it renders it) or `page:<postId>:0` for a flow placed directly on a page. Proof: `plugins/sgs-blocks/tests/php/run-choice-flow-submit-standalone.php` (the 5th submission allowed, the 6th refused with 429).

**FR-43-5 -- Real purchase.** Add to cart with a server-computed total by calling Spec 27's existing `/sgs/v1/cart/add-item` proxy directly, exactly the way `sgs/buybox`/`sgs/product-card` already do, passing the fully-resolved variation's attribute set. No proxy change is needed: because every priced step resolves to a real WC variation (FR-43-10), the terminal step's selections ARE a normal `variation[]` attribute payload, identical in shape to what `sgs/buybox` sends. There is no client-sent price, surcharge or delta of any kind; every value flowing through the call is a real, live WooCommerce price. Built: `plugins/sgs-blocks/src/blocks/choice-flow/add-to-bag.js` sends the flow's own resolved variation (`id` = variation ID, taxonomy-keyed `variation[]`) and falls back to the page buybox's variation; a variable product with no resolved variation shows an inline error and sends nothing. A variation the flow resolved is never replaced by a later buybox event (`plugins/sgs-blocks/src/blocks/choice-flow/pricing.js::storeLiveBase`).

## 4. Delivery — inline or full-screen modal

**FR-43-6 -- linked flow.** A flow is saved once as a `sgs_choice_flow` post (Choice Flows admin
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

**FR-43-7 -- Mama's Munches.** One variable product with four choices: Number in Pack creates the
variations (and the price); Flavour, Topping and Dietary are product attributes that do not, so they travel as
answers on the bag line. Two journeys, both a sequential, one-decision-per-screen flow in a full-screen `sgs/modal`:
(A) full customisation: Flavour, Topping, Dietary, then Number in Pack, then add to bag; (B) the pack is picked on the
product page, whose buybox button reads "Choose your flavours" and opens the flow for the other three (FR-43-22).
Neither uses branching.

**FR-43-22 -- the buybox button can open a popup.** `sgs/buybox` `addToCartAction` (`cart` | `modal`) and
`addToCartModalId` (the `sgs/modal`'s anchor): in `modal` mode the button opens that modal through the modal's own
open-anywhere listener (`data-sgs-modal-open`) instead of adding to the cart, keeps the in-stock gate and keeps
announcing the chosen variation, so a flow inside the modal buys it. No modal named falls back to `cart`.

**FR-43-23 -- guided buybox.** `sgs/buybox` `layout: guided` (default `standard`) turns the buy box into a
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
- **Code:** `plugins/sgs-blocks/includes/buybox-guided.php`, `plugins/sgs-blocks/src/blocks/buybox/guided.js`, `plugins/sgs-blocks/src/blocks/buybox/GuidedPanel.js`.

**FR-43-24 -- showcase layout for full-screen flows.** `sgs/choice-flow` `flowLayout:
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
  it takes the route of the flow's "no add-ons" option and shows only when one exists; with `skipAddsToBag` it
  instead adds the bare frame through the shared `plugins/sgs-blocks/src/blocks/choice-flow/add-to-bag.js::addFlowToBag` and closes the pop-up; wide
  containers only), the step's actions right. Footer buttons share one small uppercase style at the theme button preset's height.
- **Body grid:** a sticky "stage" aside (`minmax(300px, .8fr)`; `minmax(250px, .7fr)` under a 1100px container)
  beside the step pane (`minmax(0, 1.55fr)`; `1.6fr` under 1100px).
  - The stage (FR-43-19) fills its column on the stage colour (`stageColour`, default surface-alt): a bordered square
    photo that swaps with the resolved variation, the brand, name and chosen options (which take the slack, so the
    lines sit low), the running lines, a large total in the heading font, and the help note at the bottom edge.
  - An option can carry a photo treatment (`stageEffect`: dim, deepen, soften, brighten) that the stage photo shows
    while it is chosen, named in a small tag on the photo (a lens finish); the option's own card previews it too,
    the product's photo treated the same way over the option's picture.
  - The help note is a bordered card; with a link the whole card is the link, with an optional round icon badge
    (`stageNoteIcon`: WhatsApp, phone, email, chat) and its own icon, border and hover colours.
- **Step pane:** padded 40/44/56. It holds:
  - a position line in the accent ink ("Question 1 of 3": `stepCountLabel`; a question's own `eyebrow` replaces it
    and leaves that question out of the count; a result step shows none)
  - the step title in the heading font (38px from a 600px container, 28px under), wrapping plainly
  - an intro paragraph (the question's `intro` attribute), 56 characters wide unless the question's "Intro width"
    (`introWidth`: 52, 56, 58, 60, 64 or the full column) sets its own
  - the options as large cards: two columns once the flow is 620px wide, one under; a step whose options carry no
    pictures runs three across from 768px as text cards. A picture card has a full-width 16:9 image band, then the
    title with its price aligned right (accent ink), then the description, then its badge as a solid accent tag; a
    text card carries its badge as a soft tag beside the title. The selected card gets a 2px border in the text
    colour on the stage colour. The picture band shows the stage colour; the option's own picture is drawn at
    `optionMediaSize` per device ({desktop, tablet, mobile}, % of the band's width, 100 = fills the band), centred,
    so a smaller one shows the band around it and a larger one is cropped by it (a finish card's frame photo is never
    scaled). The '?' help toggle is a 30px disc that fills dark on hover (`infoToggleColour`,
    `infoToggleBorderColour`); its answer opens as a dark panel under the card. The header's step name takes
    `headerEyebrowColour` (default the muted text colour).
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

**FR-43-26 -- a question can open the chosen option's next step underneath** (Bean, 2026-09-28).
`sgs/choice-flow-question` `showNextStepInline` ("Open the chosen option's next step underneath"). In `continue`
advance mode the step an option leads to (`nextStepId`) shows under the question on the same screen, replacing any
step another option opened; the default option opens its step on arrival. The footer follows the opened step: an
add-to-bag result there shows Add to bag with the running total and hides Continue; Add to bag validates and sends
that step's fields as when it is shown on its own. It fades in over 0.3s (none under reduced motion). In the
showcase layout an opened step holding fields is one bordered panel whose boxes take the panel's colour, and a file
drop zone stands alone. `plugins/sgs-blocks/src/blocks/choice-flow/flow-inline.js::openInlineStep` (every step change goes through
`::showStep`). The Eye Care lens draft's last question is the reference: Send it later, Upload a photo and Type it
in each open their panel under the options.

**FR-43-25 -- architecture: one saved flow, its placements, and the product link** (Bean, 2026-09-26).
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
    (`plugins/sgs-blocks/includes/configurator-term-fields.php`: `_sgs_swatch_image_id`, `_sgs_term_badge`, `_sgs_term_description`),
    set once per term and shown everywhere: buybox pickers, the guided buybox, and flow product-option steps that
    don't override them
  - the default option is the product's own WooCommerce default attributes
  - its peripherals are buybox settings: Back / Next / Add to basket / Buy now wording and styling, and the
    meter's style and colour
  - rich features (custom questions, add-ons, stage, endings) belong to a saved flow in a popup

## 5. CPT -- `sgs_choice_flow`

**FR-43-8 -- the `sgs_choice_flow` CPT mirrors Spec 42's values.** It uses the SAME literal values as Spec 42's `sgs_form` CPT, not a parallel decision: capability = `edit_sgs_forms` (Spec 42 FR-42-1; one capability governs both CPTs); `custom-fields` skipped, settings stay root block attributes (FR-42-2); `revisions` retention cap = 10 (FR-42-3). Same identity model (slug-keyed, `resolve_choice_flow()` mirroring `resolve_form()`/`resolve_modal()`), same disclosed analytics gap (FR-42-13 applies here identically: the mandatory-reuse justification is equally unbuilt for flows).

## 6. Step engine and pricing -- what is new vs reused

**FR-43-9 -- own Interactivity store.** `sgs/form-step` has no step runtime to extend: it is a `render.php` marker div (`.sgs-form-step` + data attributes) queried by its PARENT. The real step engine (`updateStepVisibility`, `saveStepState`/`restoreStepState`, `evaluateCondition`/`applyConditionalLogic`, validation, submit) lives unexported inside `sgs/form`'s own `view.js`, fused to `sgs/form-review`. `sgs/choice-flow` has its OWN small Interactivity-API store (step index, `nextStepMap` resolution, session persistence) and does not extend or share that engine; the duplicated navigation and persistence logic is the accepted cost. Extraction into a shared primitive is revisited only once both blocks exist and the real overlap is observable. `sgs/choice-flow` reuses `sgs/form-step` as an inert STEP MARKER and reuses `sgs/form`'s field blocks unchanged for plain data-capture steps (FR-43-1); only the step-navigation runtime is net-new.

**FR-43-10.** A product-option step names one attribute of the flow's product (`productAttribute`, a `pa_*` taxonomy; the product is the page's own product on a product page, else the root's `flowProductId`). Its mode is read from the product (`WC_Product_Attribute::get_variation()`): an attribute that creates variations is a priced step; one that does not is an unpriced answer (its terms as options, recorded like a plain answer, carried to the bag line by FR-43-21). A priced step calls `sgs/buybox`'s existing manifest + pricing mechanism directly: `Product_Manifest::build()` for the live combo data, `sgs_configurator_mode_price()` / `sgs_configurator_format_minor()` for display. Its options render as the flow's own option buttons (so branching, Back, badges and styling apply unchanged), one per term slug, each labelled "from £X" (the cheapest in-stock combo holding that term) or, when the product has one variation attribute, its exact price; a term with no in-stock combo is disabled. The root seeds the manifest's combos to the browser (`data-flow-combos`, variation ID, price and stock per combo key, left out above 24 KB), which picks the variation once every priced step has a choice; the cart proxy re-validates the variation and its attributes server-side (Spec 27), so the browser's lookup is display only. No manifest building or price computation is re-implemented. Code: `plugins/sgs-blocks/includes/choice-flow-product-attribute-step.php`, `plugins/sgs-blocks/includes/choice-flow-variation-seed.php`, `plugins/sgs-blocks/src/blocks/choice-flow/variation.js`.

**FR-43-10a -- every priced step is WooCommerce-bound.** Every priced step in `sgs/choice-flow` binds to a real WooCommerce attribute/variation via the manifest. Typed/manual pricing is not a supported path and must not ship. The eyewear case therefore needs the add-on price list (FR-43-17) or real variations; creating attributes and variations is a catalogue task, not a block capability.

## 7. Client-facing disambiguation

**FR-43-11.** `sgs/form` and `sgs/choice-flow` need distinct, plain-English inserter
descriptions naming the actual behavioural difference (branches to different questions
vs. collects information in one flexible form) — not just distinct names — so a client
building "which treatment suits you" doesn't reach for the wrong block by guessing from
a name alone.

## 7a. Known cross-cutting gap -- shared with Spec 42, not resolved here

**FR-43-14.** Same gap as Spec 42 FR-42-10: the computed route does not yet create a saved `sgs_choice_flow` (or `sgs_form`) post (R-47-11 limits it to existing targets; Spec 47 section 7); until it does, a cloned flow or form is built into an existing post. One change fixes both CPTs. Tracked in `.claude/plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md` section 1.

## 8. Recommendation matching, and what is deferred

**FR-43-12.** The recommendation result (FR-43-3) matches by tag overlap: each option of `sgs/choice-flow-question` can contribute `tags` when chosen; each `sgs/choice-flow-result` lists `matchTags`; the result whose tags overlap most with the tags accumulated along the path taken is shown, and a result with no tags is the flow's only/default result and always shows (`plugins/sgs-blocks/src/blocks/choice-flow-result/render.php`). No formula or expression engine.

**FR-43-13.** Preset starter flows (a ready-made "which treatment" template, a ready-made lens-builder template) are out of scope, same open-brainstorm status as Spec 42 FR-42-12: do not invent a field-by-field template without the competitor-template research that spec already flagged as incomplete.

## 9. Phasing

| Phase | FRs | Status |
|---|---|---|
| Phase 0 | Spec 42 FR-42-0 (fail-open fix) | built |
| Phase 1 | Spec 42 FR-42-1/2/3, FR-42-4/5, FR-42-7a, FR-42-8 (`sgs_form` CPT; new forms are CPT-backed, existing ones keep working) | built |
| Phase 2 | FR-43-1 (plain question), FR-43-2, FR-43-2a, FR-43-3, FR-43-8, FR-43-9, FR-43-11: a complete qualification quiz touching zero WooCommerce, zero pricing, zero modal and none of `sgs/form`'s engine | built |
| Phase 2b | FR-43-15, FR-43-16 (per-option image and help text) plus the styling pass: max-width/padding, option-card border and state, step progress indicator, Tier-V CSS step transition | built |
| Phase 3 | FR-43-1 priced step types, FR-43-4, FR-43-5, FR-43-10, FR-43-10a, FR-43-17 to FR-43-21 (the add-on source needs only the price list filled in; the variation source needs the product's attributes to exist as real WooCommerce variations) | built |
| Phase 4 | FR-43-6, FR-43-7, FR-43-22 (modal delivery and the Mama's Munches acceptance journeys) | built |
| Follow-ups | FR-43-23 to FR-43-26 (guided buybox, showcase layout, saved-flow architecture, inline next step) | built |
| Phase 5 | Spec 42 FR-42-7b, FR-42-9: a choice flow still embedded on a page or linked from a product cannot be trashed or deleted, by the same guard and reference finder as forms (`Sgs_Cpt_Delete_Guard`, `Sgs_Cpt_References`) | built |
| Parked | FR-43-14 and Spec 42 FR-42-10 (saved-post creation by the computed route); Spec 42 FR-42-13 (analytics) | tracked in `.claude/plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md` |

## 10. Requirement index

| FR | Status | One-line |
|---|---|---|
| FR-43-1 | built | Step types in one flow: plain question, priced product-option step, priced add-on step, plain data-capture |
| FR-43-2 | built | `nextStepMap`: per-step answer-based routing, the one new mechanism |
| FR-43-2a | built | Editor-time validation: dangling target / cycle blocks publish |
| FR-43-2b | built | Skipping a priced step cannot under-price: an incomplete axis fails to resolve to a purchasable variation |
| FR-43-3 | built | Terminal: recommendation result screen |
| FR-43-4 | built | Terminal: email-capture lead-gen handoff (result emailed over `wp_mail()` via `Form_Mailer`) + inherited rate-limit |
| FR-43-5 | built | Terminal: real purchase via Spec 27's `/sgs/v1/cart/add-item` proxy, unmodified |
| FR-43-6 | built | A saved `sgs_choice_flow` post shown by a linked `sgs/choice-flow` (`flowId` + `flowIsLinked`, same picker as Spec 42), inline or inside a full-screen `sgs/modal` |
| FR-43-7 | built | Mama's Munches: one product, only the pack priced; full-customisation popup and pick-on-page-then-popup journeys |
| FR-43-8 | built | `sgs_choice_flow` CPT: same literal capability/cache/revision values as Spec 42 |
| FR-43-9 | built | Own small IAPI store: `sgs/form-step` has no runtime to extend, `sgs/form`'s engine stays block-private |
| FR-43-10 | built | A product-option step reads any attribute of the flow's product: variation attributes price via `Product_Manifest::build()`, the rest are unpriced answers |
| FR-43-10a | built | Every priced step is WooCommerce-bound; typed/manual pricing is not a supported path |
| FR-43-11 | built | Distinct plain-English inserter descriptions vs `sgs/form` |
| FR-43-12 | built | Recommendation matching: tag overlap, no formula engine |
| FR-43-13 | deferred | Preset starter flows, same status as Spec 42 FR-42-12 |
| FR-43-14 | parked | The computed route does not yet create a saved flow post (shared gap with Spec 42 FR-42-10) |
| FR-43-15 | built | Per-option image (universal) |
| FR-43-16 | built | Per-option help-text `?` toggle (universal) |
| FR-43-17 | built | Add-on price list: a second priced-step source (site-wide groups of `{key, label, price}`, one settings page) |
| FR-43-18 | built | The list is the only price authority: `{group, key}` from the browser, resolved and priced server-side, stored on the cart and order line |
| FR-43-19 | built | Summary panel: product image, chosen options, priced rows, total; the showcase stage (display only) |
| FR-43-20 | built | What is bought: the page's chosen variation, or a set product; a "no add-ons" exit |
| FR-43-21 | built | Unpriced answers on the path and fields in the terminal step travel with the purchase; file fields via a session-stamped cart upload |
| FR-43-22 | built | The buybox button can open a popup (`addToCartAction: modal`) so a flow finishes a purchase started on the product page |
| FR-43-23 | built | Guided buybox: one option group at a time on the product page, a meter that doubles as the summary, a finish-choosing guard |
| FR-43-24 | built | Showcase layout (`flowLayout`): full-screen flows use a stage (the finished product, running lines, total) beside large image-led option cards, as in the Eye Care lens draft |
| FR-43-25 | built | Architecture: the saved flow owns content and look; products link to a flow and the buybox wires the popup; the guided buybox stays product-options-only with term-level image, badge and description |
| FR-43-26 | built | A question can open the chosen option's next step underneath, on the same screen, with that step's Add to bag in the footer |
