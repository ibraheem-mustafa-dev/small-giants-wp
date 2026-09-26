---
doc_type: spec
spec_id: 42
spec_version: 2.2.0
status: active
owner: framework
date: 2026-09-14
companions:
  - 43-SGS-CHOICE-FLOW.md (owns EVERY pricing/running-total/purchase concern this spec
    used to carry — §5 below explains the split and why it's a real simplification, not
    a scope cut)
  - 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md (the secure add-to-cart proxy any priced flow
    now reuses, via Spec 43 — never re-derived here)
  - 31-UNIVERSAL-CLONING-PIPELINE.md (block-deprecation policy D270; the additive-resolver
    pattern this spec follows is `resolve_modal()` in class-sgs-block-cpts.php)
  - 32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no inline `style=` on any new field markup)
derived_from:
  - .claude/prompts/2026-09-14-modal-cpt-form-frame-card-checkout-upgrade.md Task 3
  - The 2026-09-14 /research-council run (1 deep-dive researcher + 4-reviewer council +
    Council Head synthesis) — v1.0.0's full findings
  - The 2026-09-14 /adversarial-council run (6-persona pre-mortem) on v1.0.0 — found real
    blocking gaps (no stable tile ID, a money-type mismatch against the live schema, a
    payload contract promising "quantities" no block supports, revision-pinning resting
    on a WordPress mechanism this repo's own tooling already treats as unreliable)
  - The 2026-09-14 owner correction that produced Spec 43: the eyewear lens flow is
    `sgs/option-picker`'s tile-pricing mechanism inside a step wizard, not a form-pricing
    feature — which means EVERY pricing-related finding from both councils belongs to
    Spec 43, not here. v2.0.0 is that reconciliation, not a new design pass.
  - The 2026-09-14 owner decision: form-reuse is MANDATORY for every form (not opt-in) —
    "it's not often you need a unique form, and one of the main purposes of a unified form
    setup is analytics tracking and testing"
  - The 2026-09-14 owner decision: migration is a full mandatory rebuild, no deprecation
    path — "we don't do deprecations and are pre-live" (consistent with D270)
  - The 2026-09-14 combined `/adversarial-council` run (6 personas) on Spec 42+43 together —
    v2.1.0 closes the convergent MUST-FIX findings: three "decide here" items that were
    never actually decided (FR-42-1/2/3), a fail-open fix left as an unpicked either/or
    (FR-42-0), a defensive-engineering project mis-scoped as a single blocking item
    (FR-42-7), a mandatory rebuild with no rollback/count/narrowed-scope story (FR-42-9),
    and the analytics/A-B-testing claim used to justify "mandatory" while zero analytics
    requirements exist anywhere (Competitor persona, FR-42-13). Two personas (the Cynic,
    verifying code directly; the Ship-PM, independently verifying the same files)
    additionally found that Spec 43's reuse claims about this project's own blocks don't
    hold — see Spec 43 v1.2.0 for the corresponding fixes there.
---

# Spec 42 — `sgs_form` CPT (v2.0.0 — pricing moved out to Spec 43)

## 0. What changed since v1.0.0, and why this is a real simplification

v1.0.0 tried to do two jobs at once: make forms reusable, and add a generic pricing
mechanism to option-tiles. The adversarial council found the pricing half was built on
sand — `sgs/form-field-tiles` has no stable option ID, the live submissions table stores
money as `decimal(10,2)` while the spec mandated integer minor units, the payload
contract promised "quantities" no field actually supports, and pinning a price to a
WordPress *revision* is unsound (revisions don't reliably capture postmeta, and this
project's own deploy tooling explicitly excludes revisions from its data-integrity gate).

**None of that needs fixing here, because none of it belongs here.** The owner corrected
the underlying premise: the real-world case that motivated pricing (the eyewear lens
flow) isn't a form-pricing feature — it's `sgs/option-picker`'s existing, already-secure
tile mechanism, used inside a step wizard. That's Spec 43 (`sgs/choice-flow`), and it
reuses Spec 27's *already-shipped* secure add-to-cart proxy rather than inventing a
parallel pricing-security system. **This spec is now purely about making a form
definition reusable and correctly gated — no money ever passes through it.**

## 1. Why CPT, and why NOT the reason you'd expect

The obvious argument — "everything else here (header/footer/drawer/mega-menu/modal) is a
CPT, so forms should be too" — is **rejected as the justification**. It conflates two
different mechanisms already in this codebase: header/footer are **copy-at-insert patterns**
(`register_block_pattern`), not live references; only the drawer and modal resolve by
reference, and both carry inert display content, not validation/routing logic.
Pattern-matching onto that precedent would be building the wrong thing for the wrong reason.

**The real justification, found by reading this repo's own executing code, not by analogy:**
the server currently has **no durable, authoritative place to look up what a form is.**
`src/blocks/form/render.php` writes the form's security config (`requireLogin`, `rateLimit`)
into a 24-hour transient at page-render time. **Corrected by the adversarial council
(two independent reviewers, both citing the exact symbol):** the submit handler that reads
that transient and **fails OPEN to `requireLogin = false`** when it's missing lives in
`plugins/sgs-blocks/includes/forms/class-form-rest-submission.php::handle_submit`
(lines ~59-61) — **not** `class-form-rest-api.php` as v1.0.0 incorrectly cited. Verify with
`grep -n "sgs_form_config_" plugins/sgs-blocks/includes/forms/class-form-rest-submission.php`.
On a site running the LiteSpeed page cache (this project's canary does), a cached page
never re-executes `render.php`, so the transient silently expires and a login-gated form
becomes anonymously submittable with no error, no log line, nothing.

This is a live defect **independent of everything else in this spec** — see §7, shipped
first, standalone, regardless of the rest of this spec's timeline.

The CPT fixes this properly: the submit handler stops guessing from a cache and reads the
durable definition directly.

## 2. Identity — `form_id` stays the string slug

The existing `{prefix}sgs_form_submissions` table stores `form_id varchar(100)`. The CPT's
`post_name` (its slug) **is** that string — the post ID is an internal handle only and
**never** enters the submissions table. This means:

- Zero migration for the submissions table or its `form_id` index.
- The existing block attribute `formId` continues to work unchanged.
- Resolution mirrors the existing `resolve_modal()` precedent exactly:
  `resolve_form( string $slug ): ?WP_Post` — `get_page_by_path( $slug, OBJECT, 'sgs_form' )`,
  validate `post_status === 'publish'`, fail closed (render nothing / a clear editor notice)
  if unresolved.
- **A slug rename must be blocked, or redirected via a stored previous-slug map** — an
  unguarded rename silently orphans every historical submission's join. **Decided
  (v2.1.0):** block the rename outright once a form has ≥1 submission (a single
  `wp_insert_post_data` filter check against the submissions table — no second durable
  store to maintain). A form with zero submissions may still be renamed freely.

## 3. CPT registration

Merge into the SAME shared `register_post_type()` args array in `class-sgs-block-cpts.php`
used by header/footer/drawer/mega-menu (`public: false`, `show_in_rest: true`). **Three
decisions must be made explicitly, not inherited silently:**

- **FR-42-1 — Capability. DECIDED (v2.1.0), no longer "e.g."**: the capability is literally
  `edit_sgs_forms`. Granted to `administrator` and `editor` only (never `author`/
  `contributor` — this CPT's config can gate a form's own auth requirement, so an
  over-broad grant is a real access-control risk, not just tidiness). Grant path: a single
  `add_cap()` call in the plugin's own activation hook (mirroring how every other shared
  capability in this codebase is granted — no filter, no runtime check-and-add). Bean's own
  admin account holds `administrator` and therefore has this capability automatically; no
  separate grant step is needed for the framework owner.
- **FR-42-2 — `custom-fields` support. DECIDED (v2.1.0):** skip `custom-fields` entirely.
  All form settings (including `requireLogin`, `rateLimit`) live as `sgs/form` root block
  attributes, exactly as they do today — this avoids re-deriving the exact
  `register_meta( ..., 'show_in_rest' => true )` gap this repo has already shipped once
  (2026-06-02, product-card meta).
- **FR-42-3 — `revisions`.** Stays ON (the shared default). No longer load-bearing for
  pricing (that requirement moved to Spec 43) — it's a plain editorial history feature now.
  **Retention cap DECIDED (v2.1.0): 10 revisions**, via a `wp_revisions_to_keep` filter
  scoped to `post_type === 'sgs_form'` (and `sgs_choice_flow` — see Spec 43 FR-43-8),
  matching this project's existing per-post-type revision-cap pattern.

## 4. The picker — WordPress's own `LinkControl`, not a bespoke REST widget

Do **not** build a custom `ComboboxControl` + a new REST endpoint for "pick a form by
slug". WordPress core already ships exactly this interaction — `wp.blockEditor.LinkControl`
(the same component behind the Navigation and Button blocks' "Add link"), filterable to one
post type via `suggestionsQuery={ type: 'post', subtype: 'sgs_form' }`, resolving through the
standard `__experimentalFetchLinkSuggestions` REST search. This requires only
`show_in_rest: true` on the CPT (§3) — zero new REST surface. **Spec 43's "Linked flow" picker
(`sgs/choice-flow` `flowId` + `flowIsLinked`, FR-43-6) uses this exact same mechanism, filtered to
`sgs_choice_flow` — one picker component, two post-type filters, never two implementations.**

**FR-42-4:** the form-embed block/attribute stores the resolved slug (not a raw post ID —
see §2) via `LinkControl`, filtered to `sgs_form`.

**FR-42-5 (client-clarity fix):** the picker must show more than a bare title in its
suggestion list — at minimum a "Form" type badge — because two similarly-named draft forms
are otherwise indistinguishable in the list.

## 5. Pricing — moved to Spec 43 in full

Every pricing-related requirement from v1.0.0 (tile pricing, running total, the
client-submits-no-authority rule, tile-ID validation, revision-pinning, currency units) is
**retired from this spec and superseded by Spec 43**, which routes any real charge through
Spec 27's already-shipped, already-secure add-to-cart proxy rather than a new mechanism.
`sgs/form` and its field blocks (including `sgs/form-field-tiles`) **never carry a price
attribute of any kind** — if a use case needs pricing, it is a `sgs/choice-flow`, not a
`sgs/form`, full stop. This also retires v1.0.0's FR-42-12/13 "edit an existing
submission" thread in its purchase-flavoured form (that's a bag-line edit, which only
exists on the purchase path) — see Spec 43 for the concurrency/conflict-policy
requirements that actually apply there.

**FR-42-6 (was FR-42-13's non-purchase half, kept here):** draft resumption — client-side,
anonymous, ephemeral, same-browser-only persistence of in-progress answers
(`sessionStorage`/`localStorage` keyed to the form slug) — stays a plain `sgs/form`
requirement, since a long enquiry form losing its answers on an accidental refresh is a
real, generic problem with no pricing involved.

## 6. Reference lifecycle — the orphan/delete/race contract

WordPress's own closest structural analogue to this proposal — Synced Patterns (`wp_block`,
a definition-as-post referenced by ID, resolved at render time) — has an open, multi-year bug
log of exactly this class of failure, not registration bugs:
[reusable-block content deleted if the page saves before the reference finishes loading](https://github.com/WordPress/gutenberg/issues/33234)
(a load-order race with no recovery),
[trashing the definition renders an orphaned error card everywhere it's embedded](https://github.com/WordPress/gutenberg/issues/14127),
and [a self-referencing block crashes the editor](https://github.com/WordPress/gutenberg/issues/21117).

**FR-42-7a (Blocking — split from the old FR-42-7, Ship-PM MUST-FIX).** The referenced
`sgs_form` post trashed/missing while an embed still references its slug degrades to a
clear, named copy state, never a raw PHP error. Two audiences, two messages (Support
Realist finding — a single wp-admin-vocabulary message shown to a public visitor is a dead
end): (i) **public-visitor-facing** — a generic, site-configurable fallback ("This form
isn't available right now — please email/call us instead"), never technical vocabulary;
(ii) **editor-only** (shown only to a logged-in user with `edit_sgs_forms`) — the concrete
next action, e.g. "This form reference is broken — go to Forms → find `<slug>` →
republish, or unlink this block." This is the whole of FR-42-7a's scope: `resolve_form()`
returning null plus these two notices. Cheap, and it is what actually blocks the mandatory
rebuild (FR-42-9/FR-42-11) — not the items in FR-42-7b below.

**FR-42-7b. SHIPPED (2026-09-26).** A form or choice flow that is still in use cannot be
trashed or deleted: refuse, never warn (a non-coder client clicks through a warning without
registering it). "In use" means embedded by slug in any post whose status is publish, future,
draft, pending or private (the definition post itself excluded), or, for a flow, linked from a
product's `_sgs_choice_flow` meta. One finder, `Sgs_Cpt_References::all_references()`, feeds both
this guard and the "Used by" list column. `Sgs_Cpt_Delete_Guard` enforces it on
`pre_trash_post` / `pre_delete_post`, so the admin list, the block editor, REST and WP-CLI are
all covered, and each surface names the pages or products: REST returns 409 `sgs_in_use`
(the block editor shows it as an error notice), the admin list shows a "Still in use" page,
WP-CLI prints a warning. The Gutenberg #33234 race was checked first and does not apply:
the embed reads the saved post once for its slug and never edits or saves it (live check: with a
linked embed loaded, the editor's unsaved-records list is empty).

**Spec 43's `sgs_choice_flow` needs the identical contract — build/test it once, apply to
both CPTs, do not re-derive it.**

## 7. Ship immediately, standalone — the fail-open bug (§1)

**FR-42-0 (highest priority, no dependency on the rest of this spec). DECIDED (v2.1.0):**
fix `plugins/sgs-blocks/includes/forms/class-form-rest-submission.php::handle_submit`'s
`requireLogin` resolution to **refuse the submission outright** (HTTP 503 / "please try
again shortly") when its config lookup cannot be resolved — never silently default
`requireLogin` to `true` or `false` and proceed. Refusing rather than defaulting-true was
chosen because a silent default-true has its own failure mode (every legitimate logged-in
submitter on a cache-warm page gets rejected as if logged out, with nobody noticing why);
refusing outright fails loudly and is trivially distinguishable from "the form is fine." No
implementer discretion is intended here — refuse, don't guess. This is a live security
defect on the canary today, independent of whether the CPT work ever ships.

## 8. Caching + nonce contract

**FR-42-8. DECIDED (v2.1.0):** the nonce/config lookup is made genuinely cache-independent
— it reads the durable `sgs_form` CPT definition directly at submit time (via
`resolve_form()`, §2) rather than a render-time transient. This is the same fix FR-42-0
already requires (refuse rather than guess when resolution fails), so no separate
cache-exclusion rule is needed: a form-carrying page may stay fully cacheable, because the
security-relevant read happens at submission time against the durable post, never against
anything the page cache could serve stale.

## 9. Migration — mandatory, full rebuild, no deprecation path

**Owner-directed (2026-09-14):** every form goes through the CPT-backed system — there is
no "simple form stays inline" exception. Reasoning given: a genuinely one-off form is rare,
and the whole point of a unified form setup is consistent analytics tracking and A/B testing
across every form on a site, which an opt-out path would fragment.

**FR-42-9. DONE (2026-09-26).** The count ran first, on every site: sandybrown held six inline
`sgs/form` instances, all on QA fixture pages (2118, 2159, 2164, 2893) that stay as they are
and keep rendering; indus-test held none; eye-care-test's one real form (Contact) was already
a saved form linked from page 190. No rebuild run and no ledger tool were needed.

The mandate is enforced in the editor instead, so it cannot leak again (owner decision
2026-09-26). Outside a `sgs_form` post, `sgs/form` is an embed (`form/FormEmbedEdit.js`): pick a
saved form, create one by name (published and linked in one step), or, for an inline form
(older content or clone output), "Save as reusable form" moves its fields into a new saved
form and links it. Fields are built only inside the saved form, whose settings show its Form
ID as the slug. A linked form renders with `formId` set to the saved form's slug, whatever the
definition stores, so submissions and rate limits always key on the slug (§2).

## 10. Known cross-cutting gap — not resolved here, disclosed honestly

**FR-42-10 (shared with Spec 43, needs a build-time decision, not a guess):** the cloning
pipeline's `sgs-clone-orchestrator.py --deploy-target` is hard-validated to `page:<id>` /
`post:<id>` only — it has **no way to create a new `sgs_form` (or `sgs_choice_flow`) post**
as part of a clone run. This means a cloned draft containing a form/flow will, today,
still emit it inline into the target page, breaching the "every form is CPT-backed"
mandate for anything built via `/sgs-clone` rather than hand-authored in the editor. This is
not solved by this spec — it needs its own scoped follow-up (either the orchestrator gains
a create-CPT step, or the mandate is explicitly narrowed to hand-authored content only,
which is itself a policy call for the owner, not an agent).

## 11. Sequencing

**FR-42-11:** the reference-lifecycle contract (§6) and the picker (§4) are proven stable
before the mandatory rebuild (§9) runs at scale — a bug in the CPT alone costs a broken
contact form; running the mandatory rebuild across every existing form on top of an
unproven reference mechanism multiplies that cost by however many forms exist.

## 12. Explicitly still open — do not silently invent

**FR-42-12:** preset starter patterns (Contact / Booking) remain an **open brainstorm
item**, not a settled requirement of this spec. This research pass did not find a
field-by-field breakdown for any single competitor's template (a genuine, named research
gap) — a follow-up session must complete that research before any preset ships.

**FR-42-13 (added v2.1.0, Competitor MUST-FIX).** §9's justification for making CPT-backed
reuse *mandatory* rather than opt-in is "consistent analytics tracking and A/B testing
across every form on a site" — and this spec, as it stood through v2.0.0, contained zero
analytics or A/B requirements. That is a real gap: the policy imposes real friction (every
form is now a two-object edit, per FR-42-9's own honest cost) in exchange for a stated
benefit nothing in this document delivers. **Disclosed and explicitly deferred, same status
as FR-42-12** — a minimal analytics surface (impression/start/submit events keyed to
`form_id` + a `form_schema_version` stamp, so historical submissions aren't silently
compared across incompatible form edits) is real, scoped-but-unbuilt follow-up work, not
invented here. Until it ships, §9's justification is aspirational, not delivered — say so
plainly rather than implying the benefit already exists.

## 13. Requirement index (FR-42-0 through FR-42-13, v2.2.0)

| FR | One-line | Priority |
|---|---|---|
| FR-42-0 | Fix fail-open `requireLogin` bug — refuse outright on unresolved config, decided | Ship now, standalone |
| FR-42-1 | `sgs_form` capability = `edit_sgs_forms`, admin+editor only, `add_cap()` on activation — decided | Blocking |
| FR-42-2 | `custom-fields` skipped entirely; settings stay root block attributes — decided | Blocking |
| FR-42-3 | `revisions` retention cap = 10, via `wp_revisions_to_keep` — decided | Blocking |
| FR-42-4 | `LinkControl`-based picker, slug-keyed, shared component with Spec 43 | Blocking |
| FR-42-5 | Picker shows type badge, not bare title | Should-fix |
| FR-42-6 | Client-side draft resumption (non-pricing) | Should-fix |
| FR-42-7a | Trashed/missing-form embed degrade — two audiences, two messages | Blocking |
| FR-42-7b | Delete-guard (hook-level) + Gutenberg #33234 race check | Shipped 2026-09-26 |
| FR-42-8 | Cache/nonce contract — cache-independent lookup at submit time — decided | Blocking |
| FR-42-9 | Count-first rebuild (nothing to convert) + saved-forms-only editor | Done 2026-09-26 |
| FR-42-10 | Cloning pipeline can't create a form/flow CPT — disclosed, unresolved | Known gap |
| FR-42-11 | CPT/picker/lifecycle proven (FR-42-7a's test artefact) before the mandatory rebuild runs at scale | Met (Phase 1 QA, 2026-09-15) |
| FR-42-12 | Presets stay an open brainstorm, not invented here | Explicitly deferred |
| FR-42-13 | Analytics/A-B testing (the stated reuse-mandate justification) is unbuilt — disclosed | Explicitly deferred |

Slug-rename policy (§2): renames blocked once a form has ≥1 submission — decided, no FR
number needed (a data-model rule, not a build item).
