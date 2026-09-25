---
doc_type: spec
spec_id: 43
spec_version: 1.6.0
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
option shows is read from the list at render time, never typed into the block. Changing a price on the settings
page changes every flow and every cart line from the next recalculation (FR-43-18).

**FR-43-18 — the list is the only price authority (v1.4.0).** The browser sends only `{group, key}` pairs with the
add-to-cart request (the `/sgs/v1/cart/add-item` proxy's optional `addons` argument, or the Store API's
`woocommerce_store_api_add_to_cart_data`). The server resolves each pair against the list: an unknown group or key,
or two options from one group, rejects the request. The resolved lines (group, key, label, price) are stored as cart
item data; `woocommerce_before_calculate_totals` sets the line's price to the product's own price plus the sum of
its add-on prices re-read from the list; the lines are copied to the order item's meta and shown in the bag, the
checkout and the order as one line, e.g. "Single vision · Thin 1.67 · Polarised grey". No client-sent price,
total or label is ever used.

**FR-43-19 — live price panel (v1.4.0).** A flow with priced add-on steps can show a running total beside its
questions: the product's current price, then one row per chosen add-on (its label and price, "included" for 0),
then the total. Display only; FR-43-18 is the authority.

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
client-submitted delta of any kind.

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

**FR-43-7 (Mama's Munches case — demoted to post-v1, Ship-PM MUST-FIX).** A variable
product with many flavour/pack-size combinations gets a `sgs/choice-flow` with one priced
WooCommerce-variation step per attribute (flavour, then pack size — the same step type as
FR-43-1's merged priced step, now used with zero branching), opened full-screen via
`sgs_modal`, replacing the inline pill-picker UI. This is a **sequential,
one-decision-per-screen** presentation — confirmed by the owner, not a single screen with
all pickers together. **Scope correction:** this is explicitly a UX/presentation preference,
not a capability gap — the spec's own text already says "nothing about flavour/pack-size
selection is conditionally dependent between steps," meaning it exercises none of
`sgs/choice-flow`'s defining mechanism (FR-43-2 branching) and depends on the WC-variation
step type, `sgs_modal` delivery, AND the priced-step mechanism all existing first. It is
**not** part of the v1 acceptance criteria (see §10 Phasing) — if the current inline
pill-picker is genuinely too cramped, that is a CSS fix available this week, independent of
this spec's timeline.

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

**FR-43-10 (rewritten, v1.2.0).** A priced step calls `sgs/buybox`'s existing manifest +
pricing mechanism directly — `Product_Manifest::build_manifest()` (or its equivalent public
entry point) for the live combo data, `sgs_configurator_mode_price()` /
`sgs_configurator_format_minor()` for display — and renders its options via
`sgs/option-picker`'s tile UI **bound to that manifest data** (the option-picker's existing
WC-bound mode, which already resolves against a real, stable, server-side `term_id` — see
FR-43-10a). Do not re-implement manifest building, price computation, or tile rendering a
second time; do not re-implement variation resolution a second time. A `sgs/choice-flow`
priced step is, mechanically, one axis of a `sgs/buybox` instance split across screens —
the same manifest, the same pricing helpers, the same option-picker binding mode, reused
verbatim, not rebuilt.

**FR-43-10a (rewritten, v1.2.0 — supersedes the v1.1.0 typed/manual fallback entirely).**
The v1.1.0 text proposed a fallback for `sgs/option-picker`'s typed/manual mode
(`optionItems: {key, label}`, free-text `key`, no server price authority) via a
server-generated `optionId`. **That fallback is withdrawn.** Checked directly against the
code (`plugins/sgs-blocks/includes/helpers-configurator-pricing.php`,
`includes/class-product-manifest.php`): `sgs/option-picker` itself has no pricing
mechanism of its own to fall back to — the price authority was always `sgs/buybox`'s
manifest, not option-picker. **Requirement (replacing the old (a)/(b) either-or): every
priced step in `sgs/choice-flow` MUST bind to a real WooCommerce attribute/variation via
the manifest (option-picker's WC-bound mode, inheriting its stable `term_id` for free).
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
variations; the add-on source requires only the price list to be filled in.

**Phase 4 — modal delivery + Mama's Munches acceptance criterion.** FR-43-6, FR-43-7
(explicitly not part of v1 — see FR-43-7's own text).

**Phase 5 — everything else, independently deferrable, no fixed order.** Spec 42 FR-42-9
(mandatory rebuild, only after Phase 1 proves stable and the instance count is known),
FR-42-7b, FR-42-10/FR-43-14 (clone-orchestrator CPT-creation gap), FR-42-13 (analytics).

## 10. Requirement index (v1.4.0)

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
| FR-43-7 | Mama's Munches: demoted to Phase 4, explicitly not a v1 acceptance criterion |
| FR-43-8 | `sgs_choice_flow` CPT — same literal capability/cache/revision values as Spec 42, not a parallel decision |
| FR-43-9 | Own small IAPI store, decided now — `sgs/form-step` has no runtime to extend, `sgs/form/view.js`'s engine stays block-private in v1 |
| FR-43-10 | Priced steps bind to real WC variations via `sgs/buybox`'s existing manifest — corrected, no new pricing system |
| FR-43-10a | Typed/manual pricing withdrawn as a path; WC-binding is the only supported route |
| FR-43-11 | Distinct plain-English inserter descriptions vs `sgs/form` |
| FR-43-12 | Recommendation-matching rule: build-time call, keep simple |
| FR-43-13 | Preset templates: explicitly deferred, same status as Spec 42 FR-42-12 |
| FR-43-14 | Cloning pipeline can't create a flow CPT — shared gap with Spec 42, fix once |
| FR-43-15 | Per-option image (universal, not lens-specific) — grounded in the real lens-flow source |
| FR-43-16 | Per-option help-text `?` toggle (universal, not lens-specific) — grounded in the real lens-flow source |
| FR-43-17 | Add-on price list: a second priced-step source (site-wide groups of `{key, label, price}`, one settings page) |
| FR-43-18 | The list is the only price authority: `{group, key}` from the browser, resolved and priced server-side, stored on the cart and order line |
| FR-43-19 | Live price panel beside the questions (display only) |
| FR-43-20 | What is bought: the page's chosen variation, or a set product; a "no add-ons" exit |
| FR-43-21 | Unpriced answers on the path and fields in the terminal step travel with the purchase; file fields via a session-stamped cart upload |
