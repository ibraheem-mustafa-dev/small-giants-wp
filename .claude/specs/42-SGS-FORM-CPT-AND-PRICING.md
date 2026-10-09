---
doc_type: spec
spec_id: 42
spec_version: 2.3.0
status: active
owner: framework
created: 2026-09-14
last_verified: 2026-10-09
companions:
  - 43-SGS-CHOICE-FLOW.md (owns EVERY pricing/running-total/purchase concern; priced flows are `sgs/choice-flow`)
  - 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md (the secure add-to-cart proxy any priced flow reuses, via Spec 43)
  - 32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no inline `style=` on any new field markup)
---

# Spec 42 - `sgs_form` CPT

## 0. Scope

Forms are reusable saved posts (`sgs_form`), resolved by slug and gated by a durable definition. No money passes through this spec: priced flows are `sgs/choice-flow` (Spec 43), which reuses Spec 27's add-to-cart proxy. The additive-resolver pattern this spec follows is `resolve_modal()` in `plugins/sgs-blocks/includes/class-sgs-block-cpts.php`.

## Rulings (Bean)

- 2026-09-14: form reuse is mandatory for every form ("it's not often you need a unique form, and one of the main purposes of a unified form setup is analytics tracking and testing").
- 2026-09-14: migration is a full rebuild with no deprecation path ("we don't do deprecations and are pre-live").
- 2026-09-26: the mandate is enforced in the editor (FR-42-9).

## 1. Why CPT, and why NOT the reason you'd expect

The obvious argument ("everything else here (header/footer/drawer/mega-menu/modal) is a CPT, so forms should be too") is **rejected as the justification**. It conflates two different mechanisms: header/footer are **copy-at-insert patterns** (`register_block_pattern`), not live references; only the drawer and modal resolve by reference, and both carry inert display content, not validation/routing logic.

**The real justification:** the server has **no durable, authoritative place to look up what a form is.** `plugins/sgs-blocks/src/blocks/form/render.php` stores a form's security config (`requireLogin`, `rateLimit`) in a 24-hour transient for forms that are not linked to a saved post. A page cache can serve the page without running `render.php`, so that transient can be cold; `plugins/sgs-blocks/includes/forms/class-form-rest-submission.php::handle_submit` therefore reads the durable `sgs_form` definition when one exists (FR-42-8) and, for an unlinked legacy form with a cold transient, refuses (FR-42-0). Before that refusal existed, a cached page left a login-gated form anonymously submittable with no error and no log line.

The CPT fixes this properly: the submit handler reads the durable definition directly instead of guessing from a cache.

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
- **A slug rename is blocked** once a form has at least 1 submission (`guard_form_slug_rename` on `wp_insert_post_data`, checked against the submissions table; no second durable store to maintain), because an unguarded rename silently orphans every historical submission's join. A form with zero submissions may still be renamed freely.

## 3. CPT registration

Merge into the SAME shared `register_post_type()` args array in `class-sgs-block-cpts.php`
used by header/footer/drawer/mega-menu (`public: false`, `show_in_rest: true`). **Three
decisions are explicit, not inherited silently:**

- **FR-42-1 -- Capability.** The capability is literally
  `edit_sgs_forms`. Granted to `administrator` and `editor` only (never `author`/
  `contributor` — this CPT's config can gate a form's own auth requirement, so an
  over-broad grant is a real access-control risk, not just tidiness). Grant path: a single
  `add_cap()` call in the plugin's own activation hook (mirroring how every other shared
  capability in this codebase is granted — no filter, no runtime check-and-add). Bean's own
  admin account holds `administrator` and therefore has this capability automatically; no
  separate grant step is needed for the framework owner.
- **FR-42-2 -- `custom-fields` support.** Skip `custom-fields` entirely.
  All form settings (including `requireLogin`, `rateLimit`) live as `sgs/form` root block
  attributes, exactly as they do today — this avoids re-deriving the exact
  `register_meta( ..., 'show_in_rest' => true )` gap this repo has already shipped once
  (2026-06-02, product-card meta).
- **FR-42-3 -- `revisions`.** Revisions stay on (the shared default) as plain editorial history; retention cap 10 via a `wp_revisions_to_keep` filter scoped to `post_type === 'sgs_form'` and `sgs_choice_flow` (Spec 43 FR-43-8), matching this project's existing per-post-type revision-cap pattern.

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

## 5. No pricing in forms

`sgs/form` and its field blocks (including `sgs/form-field-tiles`) never carry a price attribute of any kind. A use case that needs pricing is a `sgs/choice-flow` (Spec 43).

**FR-42-6 -- draft resumption (NOT BUILT; only the step index is kept, so answers are lost on refresh):** draft resumption — client-side,
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

**FR-42-7a -- trashed or missing form.** The referenced
`sgs_form` post trashed/missing while an embed still references its slug degrades to a
clear, named copy state, never a raw PHP error. Two audiences, two messages (a single wp-admin-vocabulary message shown to a public visitor is a dead
end): (i) **public-visitor-facing** — a generic, site-configurable fallback ("This form
isn't available right now — please email/call us instead"), never technical vocabulary;
(ii) **editor-only** (shown only to a logged-in user with `edit_sgs_forms`) — the concrete
next action, e.g. "This form reference is broken — go to Forms → find `<slug>` →
republish, or unlink this block." This is the whole of FR-42-7a's scope: `resolve_form()`
returning null plus these two notices. Cheap, and it is what actually blocks the mandatory
rebuild (FR-42-9/FR-42-11) — not the items in FR-42-7b below.

**FR-42-7b -- delete guard.** A form or choice flow that is still in use cannot be
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

## 7. The fail-open rule

**FR-42-0:** `plugins/sgs-blocks/includes/forms/class-form-rest-submission.php::handle_submit` refuses the submission outright (HTTP 503, "please try again shortly") when its config lookup cannot be resolved; it never defaults `requireLogin` to true or false. Refusing fails loudly and is trivially distinguishable from "the form is fine"; a silent default-true rejects every logged-in submitter on a cache-warm page with nobody noticing why. No implementer discretion is intended: refuse, don't guess.

## 8. Caching + nonce contract

**FR-42-8:** the nonce/config lookup is made genuinely cache-independent
— it reads the durable `sgs_form` CPT definition directly at submit time (via
`resolve_form()`, §2) rather than a render-time transient. This is the same fix FR-42-0
already requires (refuse rather than guess when resolution fails), so no separate
cache-exclusion rule is needed: a form-carrying page may stay fully cacheable, because the
security-relevant read happens at submission time against the durable post, never against
anything the page cache could serve stale.

## 9. Migration — mandatory, full rebuild, no deprecation path

**Owner-directed (Bean, 2026-09-14):** every form goes through the CPT-backed system — there is
no "simple form stays inline" exception. Reasoning given: a genuinely one-off form is rare,
and the whole point of a unified form setup is consistent analytics tracking and A/B testing
across every form on a site, which an opt-out path would fragment.

**FR-42-9:** the mandate is enforced in the editor (owner decision 2026-09-26). Outside a `sgs_form` post, `sgs/form` is an embed (`plugins/sgs-blocks/src/blocks/form/FormEmbedEdit.js`): pick a saved form, create one by name (published and linked in one step), or, for an inline form (older content or clone output), "Save as reusable form" moves its fields into a new saved form and links it. Fields are built only inside the saved form, whose settings show its Form ID as the slug. A linked form renders with `formId` set to the saved form's slug, whatever the definition stores, so submissions and rate limits always key on the slug (§2).

## 10. Known cross-cutting gap -- not resolved here

**FR-42-10 (shared with Spec 43):** the computed route does not yet create a saved `sgs_form` / `sgs_choice_flow` post (R-47-11 limits it to existing targets; Spec 47 section 7); until it does, a cloned form or flow is built into an existing post. Tracked in `.claude/plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md` section 1; the narrowing option (mandate for hand-authored content only) is Bean's policy call.

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

**FR-42-13 -- analytics (deferred).** §9's justification for making CPT-backed
reuse *mandatory* rather than opt-in is "consistent analytics tracking and A/B testing
across every form on a site", and this spec delivers no analytics or A/B requirement. The policy imposes real friction (every form is a two-object edit) in exchange for a stated benefit nothing in this document delivers. **Disclosed and explicitly deferred, same status
as FR-42-12** — a minimal analytics surface (impression/start/submit events keyed to
`form_id` + a `form_schema_version` stamp, so historical submissions aren't silently
compared across incompatible form edits) is real, scoped-but-unbuilt follow-up work, not
invented here. Until it ships, §9's justification is aspirational, not delivered — say so
plainly rather than implying the benefit already exists.

## 13. Requirement index

| FR | Status | One-line |
|---|---|---|
| FR-42-0 | built | Refuse outright when the form config lookup cannot be resolved (never default `requireLogin`) |
| FR-42-1 | built | `sgs_form` capability = `edit_sgs_forms`, admin+editor only, `add_cap()` on activation |
| FR-42-2 | built | `custom-fields` skipped entirely; settings stay root block attributes |
| FR-42-3 | built | `revisions` retention cap = 10, via `wp_revisions_to_keep` |
| FR-42-4 | built | `LinkControl`-based picker, slug-keyed, shared component with Spec 43 |
| FR-42-5 | unverified | Picker shows a type badge, not a bare title |
| FR-42-6 | NOT BUILT | Client-side draft resumption (only the step index is kept; answers are lost on refresh) |
| FR-42-7a | unverified | Trashed/missing-form embed degrade: two audiences, two messages |
| FR-42-7b | built | Delete guard (hook-level) + Gutenberg #33234 race check |
| FR-42-8 | built | Cache/nonce contract: cache-independent lookup at submit time |
| FR-42-9 | built | Mandate enforced in the editor: saved-forms-only embed |
| FR-42-10 | open | The computed route does not yet create a form/flow post (see §10) |
| FR-42-11 | met | CPT/picker/lifecycle proven before the mandatory rebuild runs at scale |
| FR-42-12 | deferred | Presets stay an open brainstorm, not invented here |
| FR-42-13 | deferred | Analytics/A-B testing (the stated reuse-mandate justification) is unbuilt |

Slug-rename policy (§2): renames blocked once a form has at least 1 submission; a data-model rule, not a build item.
