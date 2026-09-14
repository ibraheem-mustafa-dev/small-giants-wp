---
doc_type: spec
spec_id: 42
spec_version: 1.0.0
status: active
owner: framework
date: 2026-09-14
companions:
  - 31-UNIVERSAL-CLONING-PIPELINE.md (block-deprecation policy D270; the additive-resolver
    pattern this spec follows is `resolve_modal()` in class-sgs-block-cpts.php)
  - 32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no inline `style=` on any new field/tile markup)
derived_from:
  - .claude/prompts/2026-09-14-modal-cpt-form-frame-card-checkout-upgrade.md Task 3
  - The 2026-09-14 /research-council run (1 deep-dive researcher + 4-reviewer council +
    Council Head synthesis) — full findings folded in below; the Council Head's own report
    is not separately filed, this spec IS its write-up
  - The 2026-09-14 owner decision: form-reuse is MANDATORY for every form (not opt-in) —
    "it's not often you need a unique form, and one of the main purposes of a unified form
    setup is analytics tracking and testing"
  - The 2026-09-14 owner decision: migration is a full mandatory rebuild, no deprecation
    path — "we don't do deprecations and are pre-live" (consistent with D270)
---

# Spec 42 — `sgs_form` CPT + generic tile pricing + running total

## 0. What this replaces

Today `sgs/form` is a block instance: a client drops it onto a page and builds the whole
form inline, once, on that one page. There is no way to build a form once and use it on
several pages, no way to price an option-tile, and no live running total. This spec makes
every form a **CPT-backed, referenced-by-slug** definition — mandatory, not optional — and
adds a generic per-tile pricing mechanism with a client-side running total, backed by a
server that never trusts the client's arithmetic.

## 1. Why CPT, and why NOT the reason you'd expect

The obvious argument — "everything else here (header/footer/drawer/mega-menu/modal) is a
CPT, so forms should be too" — is **rejected as the justification**. It conflates two
different mechanisms already in this codebase: header/footer are **copy-at-insert patterns**
(`register_block_pattern`), not live references; only the drawer and modal resolve by
reference, and both carry inert display content, not validation/pricing/routing logic.
Pattern-matching onto that precedent would be building the wrong thing for the wrong reason.

**The real justification, found by reading this repo's own executing code, not by analogy:**
the server currently has **no durable, authoritative place to look up what a form is.**
`src/blocks/form/render.php` writes the form's security config (`requireLogin`, `rateLimit`)
into a 24-hour transient at page-render time; `class-form-rest-api.php`'s submit handler
reads that same transient at submit time and **fails OPEN to `requireLogin = false`** if it's
missing. On a site running the LiteSpeed page cache (this project's canary does), a
cached page never re-executes `render.php`, so the transient silently expires and a
login-gated form becomes anonymously submittable with no error, no log line, nothing.

This is a live defect **independent of everything else in this spec** — see §12, shipped
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
  unguarded rename silently orphans every historical submission's join. Pick one before
  build; do not leave it emergent.

## 3. CPT registration

Merge into the SAME shared `register_post_type()` args array in `class-sgs-block-cpts.php`
used by header/footer/drawer/mega-menu (`public: false`, `show_in_rest: true`) — this
inherits the sitemap/registration-safety fix that JetFormBuilder (the closest competitor
analogue, itself CPT-backed) still has an [open, unresolved bug](https://github.com/Crocoblock/jetformbuilder/issues/522)
for. **Three decisions must be made explicitly, not inherited silently:**

- **FR-42-1 — Capability.** A NEW named capability (e.g. `edit_sgs_forms`), NOT the inherited
  `edit_theme_options`. The shared CPTs are all administrator-shaped (header/footer/drawer
  are theme-level chrome); a form is the one CPT here a client's Shop Manager or Editor role
  plausibly needs to own. Name the capability and its grant path in the same commit that
  registers the CPT.
- **FR-42-2 — `custom-fields` support.** The shared `supports` array is currently
  `['title','editor','revisions']` with no `custom-fields`. This repo has already shipped
  this exact gap once (2026-06-02, product-card meta, recorded in
  `plugins/sgs-blocks/CLAUDE.md`) — any `register_meta( ..., 'show_in_rest' => true )` on
  `sgs_form` silently no-ops without it. Declare it explicitly for `sgs_form`, or store all
  form settings as `sgs/form` root block attributes instead and state that choice plainly —
  don't let it default silently either way.
- **FR-42-3 — `revisions`.** Stays ON (it's already the shared default), but it is now
  **load-bearing**, not just inherited — see §7 (revision-pinning). Set a retention policy
  in the same FR (e.g. cap at N revisions, or time-box) — WPForms' own "Form Revisions"
  feature is direct proof this class of feature bloats unbounded by default if left
  undecided.

## 4. The picker — WordPress's own `LinkControl`, not a bespoke REST widget

Do **not** build a custom `ComboboxControl` + a new REST endpoint for "pick a form by ID".
WordPress core already ships exactly this interaction — `wp.blockEditor.LinkControl`
(the same component behind the Navigation and Button blocks' "Add link"), filterable to one
post type via `suggestionsQuery={ type: 'post', subtype: 'sgs_form' }`, resolving through the
standard `__experimentalFetchLinkSuggestions` REST search. This requires only
`show_in_rest: true` on the CPT (§3 already sets this) — zero new REST surface, and every
SGS editor-user has already met this exact control elsewhere in the editor.

**FR-42-4:** the form-embed block/attribute stores the resolved slug (not a raw post ID —
see §2) via `LinkControl`, filtered to `sgs_form`.

**FR-42-5 (client-clarity fix, User Advocate finding):** the picker must show more than a
bare title in its suggestion list — at minimum a "Form" type badge, ideally a short
field-count/step-count summary — because two similarly-named draft forms are otherwise
indistinguishable in the list, and picking the wrong one on a priced configurator is a
money-facing mistake, not a cosmetic one.

## 5. Pricing model — one signed delta, not two modes

The originally proposed two-mode design ("flat-add" / "base-replace") is **replaced**. Every
number in the real worked example (a lens configurator: base 59/129 + thickness delta
0/30/60/100 + finish delta 0/40/70) is already expressible as a signed delta from a group
baseline — "base-replace" was never a distinct concept, it's a delta-from-baseline where the
baseline happens to be the visible sticker price.

**FR-42-6:** every option-tile (`sgs/form-field-tiles` tile item) gains one new field:
`priceDelta` (signed integer, **minor currency units** — pence/cents, never a float; default
`0`). The form-step or form gains one wrapper attribute: `basePrice` (integer minor units,
default `0`).

**FR-42-7:** running total = `basePrice` + sum of every currently-selected tile's
`priceDelta` across every group in the form. No `pricingMode` enum, no branch logic.

**FR-42-8 — explicitly out of scope for this spec:** percentage-of-base pricing (present in
WooCommerce's own first-party Product Add-Ons, deferred to a named follow-up, not silently
dropped) and formula/expression pricing (opens a client-authored-expression sandboxing
question this spec does not answer — do not build a "formula" field of any kind under this
spec).

## 6. The running total is a display artefact with NO authority, anywhere

This is the single most important security requirement in this spec. Per OWASP's Business
Logic Security Cheat Sheet, the rule is stronger than "the server recalculates and compares":
**the server never accepts a price, subtotal, or total from the client at all — only tile
identifiers and quantities.**

**FR-42-9:** the submission payload contains selected tile IDs + quantities only. No `total`
field of any kind is ever read from the client, by the submit handler or by any downstream
consumer (webhook, N8N notification, invoice generator). The server independently computes
the charged total from `basePrice` + the resolved `priceDelta` values it reads from the
form definition itself (§7 — the pinned revision, not `publish`).

**FR-42-10:** validate that every submitted tile ID actually belongs to the referenced
form+revision before pricing it. Recomputing an arithmetically-correct total from a
substituted/tampered tile ID is a separate, documented attack class
([product-ID-mismatch IDOR](https://dev.to/wansu379/price-manipulation-via-product-id-mismatch-in-checkout-api-idor-2c4n)) —
"the sum is right" is not the same claim as "the inputs to the sum were legitimate".

## 7. Revision-pinning — closes the price-versioning race

Bundling pricing with a CPT that revises creates a race that exists in **neither** feature
alone: a form's prices can legitimately change between when a user is shown a quote and when
they submit it. Without pinning, a submission validated against "whatever the form says
right now" either rejects a submission the user was legitimately quoted, or silently charges
a different total than what was displayed.

**FR-42-11:** every submission stores the `sgs_form` **revision ID** it was rendered from.
Server-side recalculation (§6) reads **that revision**, never the live `publish` state. This
is what makes `revisions` (FR-42-3) load-bearing rather than just inherited — the retention
policy set there must keep enough history for this to resolve on a submission made near the
edge of the retention window.

## 8. Concurrency — the fromBag / edit-existing-submission case

The submissions table has `created_at` and nothing else — no `updated_at`, no version, no
lock. "Edit an existing submission" (the real-world case: a customer edits their bag's
lens-configurator line before checkout) is currently unimplementable without a schema
change, and the nearest competitor precedent (Gravity Forms' Save & Continue) **concedes it
does not solve** the exact collision this would hit — an admin editing a partial entry
silently loses those edits if the visitor resumes the same draft meanwhile.

**FR-42-12:** add `updated_at` and a `version` (integer, incrementing) column to the
submissions table. State the conflict policy explicitly in the implementation ticket —
either last-write-wins with a surfaced warning, or optimistic-lock rejection — do not leave
it to whichever code path happens to run last.

**FR-42-13 — these are two separate features, do not conflate them:**
- **Draft resumption** — client-side, anonymous, ephemeral, same-browser-only
  (`sessionStorage`/`localStorage` keyed to the form slug — matches how the nearest
  competitor precedent, JetFormBuilder's own Save Form Progress addon, does exactly this via
  Local Storage). Solves "I refreshed and lost my answers", nothing more.
- **Edit an existing submission** — server-side, authenticated, capability-checked,
  audit-logged, governed by FR-42-12's conflict policy. Solves "the customer wants to change
  their bag line before checkout."

"Full-form-state session persistence" as originally proposed only delivers the first. Ship
both, as two distinct, separately-testable FRs.

## 9. Reference lifecycle — the orphan/delete/race contract

WordPress's own closest structural analogue to this proposal — Synced Patterns (`wp_block`,
a definition-as-post referenced by ID, resolved at render time) — has an open, multi-year bug
log of exactly this class of failure, not registration bugs:
[reusable-block content deleted if the page saves before the reference finishes loading](https://github.com/WordPress/gutenberg/issues/33234)
(a load-order race with no recovery),
[trashing the definition renders an orphaned error card everywhere it's embedded](https://github.com/WordPress/gutenberg/issues/14127),
and [a self-referencing block crashes the editor](https://github.com/WordPress/gutenberg/issues/21117).

**FR-42-14:** before ship, explicitly test and document behaviour for: (a) the referenced
`sgs_form` post trashed while embed points still reference its slug — embed points must
degrade to a clear, non-crashing state, never a raw PHP error; (b) a delete-guard — refuse
(or warn hard) when trashing a form that has live embed points, rather than allowing a silent
orphan; (c) the save-race shape from Gutenberg #33234 reproduced against this mechanism and
confirmed NOT to reproduce (or fixed if it does) before this ships.

## 10. Accessibility

**FR-42-15:** the running-total element is present in the DOM from page load (even empty),
wired `aria-live="polite" aria-atomic="true"` from the start — a live region injected after
load is not reliably announced by assistive tech. Updates are **debounced**, not fired on
every raw keystroke/tile-toggle — an un-debounced live region is screen-reader spam, not an
accessible one.

**FR-42-16:** step-transition focus management (moving focus to the new step's heading/first
field on `nextStep()`/`prevStep()`/`goToStep()`) is a SEPARATE requirement from FR-42-15 — a
different WCAG criterion (2.4.3 Focus Order, alongside 4.1.3) — do not fold it into the total's
live-region work as if fixing one fixes both.

## 11. Caching + nonce contract

**FR-42-17:** any page carrying an `sgs/form`-embed (a form reference, not just an inline
legacy instance) is excluded from full-page cache, OR the nonce/config lookup is made
genuinely cache-independent (reads the durable CPT definition directly rather than a
render-time transient — which §1's fix already requires). State which approach is taken in
the implementation ticket; do not leave both partially built.

## 12. Ship immediately, standalone — the fail-open bug (§1)

**FR-42-0 (highest priority, no dependency on the rest of this spec):** fix
`class-form-rest-api.php`'s submit handler so `requireLogin` resolution **fails closed**
(defaults to `true`, or refuses the submission outright) when its config lookup is missing,
rather than failing open to `false`. This is a live security defect on the canary today,
independent of whether the CPT/pricing work ever ships. Fix it this session if capacity
allows, regardless of this spec's own sequencing (§14).

## 13. Migration — mandatory, full rebuild, no deprecation path

**Owner-directed (2026-09-14), overriding the council's own "keep it additive" recommendation:**
every form goes through the CPT-backed system — there is no "simple form stays inline"
exception. Reasoning given: a genuinely one-off form is rare, and the whole point of a
unified form setup is consistent analytics tracking and A/B testing across every form on a
site, which an opt-out path would fragment.

**FR-42-18:** existing `sgs/form` instances are rebuilt through the new CPT-backed system in
one pass — this project runs no block-deprecation machinery (D270: no `deprecated.js`, ever)
and the framework is pre-production with no live client content to protect, so a rebuild
rather than a migration shim is the correct and cheap path. Do NOT build a
`deprecated.js`/back-compat scalar-reader for the old inline shape — re-author existing
instances directly against the new CPT-backed block.

## 14. Sequencing

**FR-42-19:** the CPT (§2–4, §9–11) ships first, alone, and is verified stable (reference
lifecycle contract proven, picker working) before pricing (§5–8) lands on top of it. A bug in
the CPT alone costs a broken contact form; a bug in CPT+pricing together costs a wrong
charge. Do not build both in one PR.

## 15. Explicitly still open — do not silently invent

**FR-42-20:** preset starter patterns (Contact / Booking / Multi-step configurator) remain an
**open brainstorm item**, not a settled requirement of this spec. Per the original brief:
research real competitor preset field-lists and UX-best-practice sources before proposing a
concrete set — this research pass did not find a field-by-field breakdown for any single
competitor's template (a genuine, named research gap, not a shortcut taken). A follow-up
session must complete that research before any preset ships.

**FR-42-21:** if the "multi-step configurator" preset does ship eventually, it needs a stated
step-count ceiling or a collapse-to-fewer-steps variant — 2026 abandonment data (Formstack)
shows multi-step completion dropping sharply past ~4 steps; shipping an unbounded default as
a blessed starting pattern is a liability, not a convenience.

## 16. Requirement index (FR-42-0 through FR-42-21)

| FR | One-line | Priority |
|---|---|---|
| FR-42-0 | Fix fail-open `requireLogin` transient bug | Ship now, standalone |
| FR-42-1 | Named `sgs_form` capability, not `edit_theme_options` | Blocking |
| FR-42-2 | `custom-fields` support decision | Blocking |
| FR-42-3 | `revisions` retention policy | Blocking |
| FR-42-4 | `LinkControl`-based picker, slug-keyed | Blocking |
| FR-42-5 | Picker shows type/summary, not bare title | Should-fix |
| FR-42-6 | `priceDelta` per tile + `basePrice` wrapper | Blocking |
| FR-42-7 | Running total = basePrice + sum(selected deltas) | Blocking |
| FR-42-8 | Percentage/formula pricing explicitly OUT of scope | Blocking (as a boundary) |
| FR-42-9 | Client submits IDs+quantities only, never a total | Blocking — security |
| FR-42-10 | Validate tile ID belongs to form+revision | Blocking — security |
| FR-42-11 | Submission pins form revision ID | Blocking — security/legal |
| FR-42-12 | `updated_at`+`version`+conflict policy | Blocking |
| FR-42-13 | Split draft-resumption from edit-submission | Blocking |
| FR-42-14 | Orphan/delete-guard/save-race contract | Blocking |
| FR-42-15 | `aria-live` total, present from load, debounced | Blocking — a11y |
| FR-42-16 | Step-transition focus management (separate FR) | Blocking — a11y |
| FR-42-17 | Cache/nonce contract for form-carrying pages | Blocking |
| FR-42-18 | Mandatory full rebuild, no deprecation shim | Decision recorded |
| FR-42-19 | CPT ships first, alone; pricing second | Sequencing |
| FR-42-20 | Presets stay an open brainstorm, not invented here | Explicitly deferred |
| FR-42-21 | Step-count ceiling on any future configurator preset | Deferred, named |
