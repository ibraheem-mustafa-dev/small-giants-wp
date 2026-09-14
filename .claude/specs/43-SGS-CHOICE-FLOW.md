---
doc_type: spec
spec_id: 43
spec_version: 1.1.0
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
    FR-43-10a closes the gap at the right layer instead of Spec 42's original wrong one
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

## 2. Step types (mixed freely within one flow)

**FR-43-1:** a `sgs/choice-flow-step` (or a repurposed `sgs/form-step`, decide at build
time based on which shares more cleanly — see §6) can be any of:

- **Plain question** — multiple-choice options, no price. The qualification/recommendation
  use case (dentist/fitness "which service suits you").
- **Priced tile step** — reuses `sgs/option-picker`'s existing tile rendering + pricing
  mechanism verbatim. The eyewear lens-surcharge use case.
- **WooCommerce variation-picker step** — reuses Spec 27's live product/variation data,
  one attribute resolved per step (e.g. step 1 = flavour, step 2 = pack size). The Mama's
  Munches use case: replaces a cramped inline pill-picker with a full-screen,
  one-decision-per-screen sequence.
- **Plain data-capture step** — reuses `sgs/form`'s existing field blocks (text, file
  upload) unchanged. The prescription/eye-test-upload use case — explicitly does **not**
  affect price; a flow can freely mix priced and unpriced steps.

**FR-43-2 — branching.** Any step gains a `nextStepMap` attribute: answer value → target
step ID. This is the one genuinely new mechanism this spec introduces (per-step routing,
distinct from `sgs/form`'s existing per-FIELD `conditionalField`/`conditionalOperator`/
`conditionalValue` show/hide logic, which stays exactly as-is and serves a different
purpose). Default (no map, or answer not matched) is "advance to the next step in order" —
so a flow with zero branching behaves identically to a plain linear wizard.

## 3. Terminal actions (pick one per flow instance, or expose all three as configurable)

**FR-43-3 — Recommendation result.** A plain result screen — text, optionally driven by a
simple scoring/matching rule across prior answers (e.g. "most answers pointed to X" —
the exact matching-rule shape is a build-time decision, not specified further here; keep
it simple, a weighted-tag match is enough for v1, no formula/expression engine — same
boundary Spec 42 FR-42-8 already drew for pricing).

**FR-43-4 — Email-capture handoff.** Collect an email, send the result to it, optionally
add to a mailing list (reuse whatever list/webhook mechanism `sgs/form` already has —
this project's forms notify via N8N webhooks, never `wp_mail()`, per the root CLAUDE.md's
naming/architecture rules; do not add a second notification path).

**FR-43-5 — Real purchase (corrected, v1.1.0).** Add to cart with a server-computed total
— by calling Spec 27's **existing, already-shipped, already-secure**
`/sgs/v1/cart/add-item` proxy directly, exactly the way `sgs/buybox`/`sgs/product-card`
already do. Do **not** rebuild Spec 42 v1.0.0's retired pricing-security apparatus
(bespoke tile-ID validation, revision-pinning, a new minor-unit currency contract) —
that whole mechanism existed only because v1.0.0 assumed a NEW pricing system with no
security precedent. This one has a precedent, and reusing it is strictly less work, not
a compromise. The security property this buys for free: the server never trusts a
client-submitted total (Spec 27's proxy already enforces this), and it prices against
live WooCommerce data, never a WordPress revision (side-stepping the exact "a revision
doesn't reliably capture the data" defect the adversarial council found in v1.0.0).

## 4. Delivery — inline or full-screen modal

**FR-43-6.** A `sgs/choice-flow` instance is openable two ways: embedded inline on a page
like any other block, or opened full-screen via the `sgs_modal` mechanism shipped this
same session (Task 1) — a "Customise" / "Choose options" trigger button (on a product
card, a CTA, anywhere) references the flow the same way a modal trigger references a
`sgs_modal` post: a `flowRef` attribute resolved via `LinkControl` filtered to the
`sgs_choice_flow` post type (same picker mechanism as Spec 42 FR-42-4 — do not build a
third bespoke picker).

**FR-43-7 (Mama's Munches case, explicit acceptance criterion).** A variable product with
many flavour/pack-size combinations gets a `sgs/choice-flow` with one WooCommerce
variation-picker step per attribute (flavour, then pack size), opened full-screen via
`sgs_modal` from a "Choose options" button, replacing the inline pill-picker UI. This is
a **sequential, one-decision-per-screen** presentation — confirmed by the owner, not a
single screen with all pickers together — even though nothing about flavour/pack-size
selection is conditionally dependent between steps. The step engine does not require
branching to be *used* for this case, only *available*.

## 5. CPT — `sgs_choice_flow`

**FR-43-8.** Mirrors Spec 42's `sgs_form` CPT decision exactly, for the same reason: the
owner's ruling that every reusable flow is mandatory CPT-backed, no opt-out, for
consistent analytics/testing across a site (Spec 42 §13). Same identity model (slug-keyed,
`resolve_choice_flow()` mirroring `resolve_form()`/`resolve_modal()`), same capability
decision requirement (a named capability, not inherited `edit_theme_options` — Spec 42
FR-42-1), same `custom-fields`/`revisions` decisions made explicitly rather than
inherited (Spec 42 FR-42-2/FR-42-3).

## 6. Shared engine — build once, reuse three times

**FR-43-9.** The step container/navigation/progress-bar/session-persistence mechanism is
**not** a new engine. Extend `sgs/form-step`'s existing shape (or extract its step-runtime
into a shared primitive both `sgs/form` and `sgs/choice-flow` consume — decide whichever
is the smaller diff at build time) with FR-43-2's `nextStepMap` addition. Do not build a
third parallel multi-step system. This project's own binding rule (R-31-9, "universal
mechanisms, no per-block hyperfocus") and `THE-MIGRATION-METHOD.md`'s "settle the target
shape first" both apply directly — the target shape is: one step engine, three consumers
(`sgs/form`, `sgs/choice-flow`, and Spec 27's configurator where relevant), each adding
only what's genuinely different about its own terminal behaviour.

**FR-43-10.** Priced tile steps call `sgs/option-picker`'s existing render/pricing code
directly — do not re-implement tile-with-price rendering a second time. WooCommerce
variation-picker steps call Spec 27's existing product-bindings layer directly — do not
re-implement variation resolution a second time.

**FR-43-10a (adversarial-council correction, reconciling with Spec 42's own finding).**
Checked directly against the code: `sgs/option-picker`'s **live WooCommerce-bound mode**
already resolves against a real, stable, server-side `term_id` — the tile-ID gap Spec 42
v1.0.0 had in `sgs/form-field-tiles` does **not** carry over to that mode. But its
**typed/manual mode** (`optionItems: {key, label}`) has the exact same problem: `key` is
a free-text string, editable, not guaranteed unique or immutable. The real eyewear-lens
worked example (`{std:0, thin:+30, xthin:+60, ultra:+100}`) is exactly this typed shape —
these price deltas aren't tied to real WooCommerce attribute terms today. **Requirement:**
a priced tile step in `sgs/choice-flow` must either (a) bind to a real WooCommerce
attribute/variation (inheriting the live mode's stable `term_id` for free), or (b) if
typed/manual, gain a server-generated immutable `optionId` at creation time, never derived
from `key`/`label`. Do not ship a priced typed tile without one or the other — this is
the single highest-value fix carried forward from Spec 42's adversarial council, now
applied at the correct layer.

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
status as Spec 42 FR-42-20 — do not invent a field-by-field template without the
competitor-template research that spec already flagged as incomplete.

## 9. Requirement index

| FR | One-line |
|---|---|
| FR-43-1 | Four mixed step types in one flow: plain question, priced tile, WC variation-picker, plain data-capture |
| FR-43-2 | `nextStepMap` — per-step answer-based routing, the one new mechanism |
| FR-43-3 | Terminal: recommendation result screen |
| FR-43-4 | Terminal: email-capture lead-gen handoff (N8N webhook, not `wp_mail()`) |
| FR-43-5 | Terminal: real purchase — Spec 42's full security rule set applies verbatim |
| FR-43-6 | Delivery: inline or full-screen via `sgs_modal`, `flowRef` + `LinkControl`, same picker as Spec 42 |
| FR-43-7 | Mama's Munches acceptance criterion: sequential WC variation steps via modal |
| FR-43-8 | `sgs_choice_flow` CPT — mirrors Spec 42's `sgs_form` CPT decisions exactly |
| FR-43-9 | One shared step engine (extend `sgs/form-step`), never a third parallel system |
| FR-43-10 | Priced/variation steps call existing `option-picker`/Spec-27 code directly, never reimplemented |
| FR-43-10a | Typed priced tiles need a real immutable `optionId`, not the free-text `key` |
| FR-43-11 | Distinct plain-English inserter descriptions vs `sgs/form` |
| FR-43-12 | Recommendation-matching rule: build-time call, keep simple |
| FR-43-13 | Preset templates: explicitly deferred, same status as Spec 42 FR-42-20 |
| FR-43-14 | Cloning pipeline can't create a flow CPT — shared gap with Spec 42, fix once |
