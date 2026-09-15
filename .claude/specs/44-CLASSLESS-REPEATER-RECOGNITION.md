# Spec 44 — Classless Repeater Recognition

**doc_type:** spec
**spec_id:** 44
**spec_version:** 2.0.0
**Status:** DESIGNED — not yet built (rework; supersedes v1.0.0, reverted at D1074)
**Date:** 2026-09-15

## 0. What changed since v1.0.0 (read this first)

v1.0.0 went through three `/adversarial-council` rounds (D1074) and was reverted —
each round found a fundamental flaw the previous fix introduced, and all three
attempts shared one root cause: they only ever looked at the *rendered HTML* of a
repeated group. This rework (v2.0.0) is built from six new evidence threads gathered
directly from a real draft's JS, the framework's own real block source, and live
corrections from Bean against real running pages — documented in full at
`.claude/reports/2026-09-14-classless-recognition-next-design-attempt.md` and
`.claude/decisions.md` D1074/D1078. Read those before touching this spec's mechanism.

Headline change: **recognise the whole repeated subtree's real identity first, by
matching it against a known composite block's actual source code or a page's own
declared route name — not by guessing one field at a time.** DB-fact elimination
(the mechanism v1.0.0 tried to reinvent, badly, per D1074 round 2) is kept, but
demoted to a fallback for groups that don't match a known shape.

## 1. Problem (plain English)

Claude Design — the AI tool used to draft new sites before they're cloned into
WordPress — never writes CSS classes. Everything is inline `style="..."`. The
`/sgs-clone` pipeline's recognition step (`converter/recognition.py::recognise()`)
reads ONLY CSS class names (`R-31-2`, currently locked) or, for a handful of atomic
tags (h1, button, img), the bare HTML tag. A repeated group of classless content —
a ticker of trust badges, a row of brand logos, a grid of "why choose us" cards, a
strip of filter chips, a list of basket line items — is therefore invisible to the
converter today. `dom_shape_classifier.py` can flag "this is probably a card-grid"
and get it past the hard-halt gate, but that alone isn't enough to extract real
content: the converter needs to know which child is the title, the icon, the price.

**Goal:** teach the pipeline to reliably recognise a repeated, classless group's
identity and its children's field roles — durably, from real structural evidence,
not a one-off patch for this draft — so a genuinely unedited Claude Design export
clones correctly with zero manual fixes.

## 2. Scope

- **Repeated groups + their known-composite parents ONLY.** A classless ONE-OFF
  section (a lone hero, a single unrepeated CTA) remains explicitly out of scope —
  no sibling group and no known-composite match to check a guess against. Track
  separately.
- **Styling transfer is out of scope.** This spec is a content-field-identity and
  page-routing mechanism. It says nothing about how a classless child's CSS gets
  transferred to the matched block attribute.
- **Deterministic, DB-driven matching FIRST.** No AI call in the critical path. A
  Tier-B-style AI fallback for cases nothing here can resolve is a future
  extension (§9), not built here.
- **Trust policy: auto-complete only on a real correctness signal, never on
  completeness alone** (FR-44-1). This directly answers D1074 round 1's NO-GO
  ("the trust gate measured completeness, not correctness").

## 3. FR-44-1 — Auto-complete trust gate

A classless-group match auto-completes the clone ONLY when EITHER:

(a) **Two independent mechanisms agree** on the same block/destination — e.g. the
structure-first match (§4) and the DB-fact elimination fallback (§5) both land on
the same candidate; OR

(b) **A single mechanism produces a genuine exact match** — every field in the
group maps one-to-one against real block/page source with nothing left ambiguous
(not a similarity score, not "3 of 5 fields look right") — matched against real
source code or a real declared route name, never against a DB-schema row alone
(a DB row is a partial projection of a block, not ground truth; see §4.2).

Anything that satisfies neither clause — including a genuine tie between two
plausible candidates — falls to operator review, logged with the same permanent
audit trail as v1.0.0 specified (§7). No group is ever silently dropped (Rule 4).

This clause exists because the two real cases proven this session (buybox's
thumbnail gallery, the WooCommerce filter panel) each had only ONE mechanism
reaching them — clause (b) is what lets those auto-complete without reopening
D1074 round 1's "completeness ≠ correctness" hole; a partial or scored match still
always falls to review.

## 4. Stage A (PRIMARY) — structure-first matching against real source

### 4.1 The principle

Don't identify a repeated group's fields one at a time. Recognise the whole
subtree's identity first by matching it against a KNOWN composite's real,
complete implementation — then every child inherits its identity from its known
position in that real implementation. Proven twice this session on real evidence:
`sgs/buybox`'s thumbnail gallery (matched field-for-field against
`gallery-col.php`) and the WooCommerce shop filter panel (matched via
`sgs/filter-search`'s own declared relationship to `woocommerce/product-filter-attribute`).
Both are cases DB-fact elimination alone structurally could not reach — see §5.4.

### 4.2 New DB table — `block_render_repeaters`

A SIBLING table to `array_item_schema`, not a column on it — decided by a 5-persona
`/adversarial-council` run this session, unanimous. Reason: `array_item_schema`'s
existing update routine (`sgs-update-v2.py`, the array-item-schema seeder block)
unconditionally deletes and rebuilds a block's rows from its `block.json`
`items.properties` on every `/sgs-update` run. A shared-table row for a render-time
repeater (which has no `block.json` attribute to rebuild from) would be silently
wiped on the very next refresh. Existing readers (`db_lookup.py`'s
`array_item_field_names`/`array_item_field_schema`, `array_content.py`) also don't
filter by source kind, so a shared table risks those rows being misread as
editor-attribute rows they aren't.

```sql
CREATE TABLE block_render_repeaters (
    block_slug   TEXT NOT NULL,
    field_key    TEXT NOT NULL,
    field_order  INTEGER,
    role         TEXT,             -- same canonical vocabulary as array_item_schema.role
    source_file  TEXT NOT NULL,    -- e.g. 'gallery-col.php' — the real PHP file the fact was derived from
    PRIMARY KEY (block_slug, field_key)
);
```

No `array_attr` column — a render-time repeater has no block attribute to name,
and forcing one in gives the column two incompatible meanings depending on the
row (the exact "tagged union in a table without one" failure the council flagged).

### 4.3 Seeding — source-derived, never a hand-declared block.json key

Two sub-steps, both derived from the block's real PHP source, never a hand-typed
Python dict (R-31-1):

1. **Detection** — does this block even have a render-time repeater? A source-scan
   for a `foreach` over a plain (non-attribute-backed) array in the block's
   `render.php` or a required partial, mirroring the existing `emit_shape` seeder's
   pattern (`sgs-update-v2.py::_populate_emit_shape`, source-derived via
   `converter.services.render_emits` — the proven, shipped precedent for "read the
   block's real PHP, put the fact in the DB, don't scan at convert-time").
2. **Field-role derivation** — reuse Thread 1's already-proven signal set
   (`.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md`),
   applied to the block's OWN rendered markup instead of a draft's: a
   `data-index`-shaped attribute marks an action/position field, an
   `aria-label="..."` pattern marks a label, an `<img src=... alt=...>` with a
   fallback state marks an image field. This is the same signal set already
   validated on the draft side — reapplied to the block's own source, not a new
   invention.

**Explicitly rejected:** a new declared `block.json` key (e.g.
`supports.sgs.renderTimeRepeaters`) that a human hand-fills per block. This is the
same shape as the retired `arrayItemFields` mechanism (D248) — "the create/prune/
accessor trio existed; the seeder never did; zero inserts anywhere in the repo" —
tombstoned in this project's own code a few weeks before this spec. Do not
resurrect it.

### 4.4 New consumer — recognition, not extraction

`array_content.py::lift_array_content()`'s job is "copy fields into a declared
block attribute." A render-time repeater has no attribute to copy into — routing
it through that function is a category error (found independently by two council
reviewers). A new, separate function owns this case:

`recognise_render_time_repeater(draft_group, candidate_blocks) -> RenderMatchResult`

Given a classless repeated group from a draft, checks whether its shape (child
tag pattern + derived field roles, matched using Thread 1's signal set on the
draft side against `block_render_repeaters.role` on the block side) matches a
known render-time repeater. On an exact match (FR-44-1 clause b), classifies the
group as natively-sourced: no attribute is written, and a conservation record is
logged stating why (e.g. "N items recognised as buybox's live WooCommerce
gallery, 0 unaccounted, no attribute write needed") — satisfying Rule 4 (NO
SKIPPING) with an honest reason instead of a silent drop.

### 4.5 Page-context detector (designed together, built as its own pass — §9)

A second, structurally different structure-first mechanism, motivated by the
WooCommerce filter-panel case: some content's identity depends on WHERE it sits
on the page (which real page/template it becomes), not on its own DOM shape.

**The signal: the draft's own declared route names — zero inference needed.**
Every Claude Design draft checked this session (and, per Bean, every other draft
he's produced) already names its pages explicitly in its own router state: an
initial `page:'home'`-style state property, plus a `this.go('<name>', ...)` call
at every navigation (e.g. `'shop'`, `'product'`, `'checkout'`, `'lenses'`,
`'done'`). This is read directly off the draft's source — no operator flag, no
DOM-shape inference, no dependency on an existing deployed page.

This also directly answers a real, previously-scoped, unbuilt gap — see
`.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md`, "Not yet
designed": *"the clone-time detector that recognises a draft section as
header/footer/drawer/mega-menu/shop/product-shaped and routes it into the right
CPT/template."* This mechanism is that detector, not new scope.

**New DB table — `draft_route_destinations`:**

```sql
CREATE TABLE draft_route_destinations (
    route_name    TEXT NOT NULL,     -- e.g. 'shop', 'checkout', 'lenses' — literal string as read from the draft
    destination_kind TEXT NOT NULL CHECK (destination_kind IN ('cpt', 'template')),
    destination   TEXT NOT NULL,     -- CPT slug (sgs_header, sgs_modal...) or theme template path (archive-product.html...)
    PRIMARY KEY (route_name)
);
```

Seeded/extended the same way `slot_synonyms` already handles name variation across
sources — a route name is matched by synonym, not exact-string-only, since
different drafts may use `'store'` vs `'shop'`. `'home'` and any unmatched route
name fall through unchanged to the existing universal (blank-canvas) pipeline —
nothing about today's handling of ordinary landing-page content changes.

**Own third table, not a third `source_kind` value anywhere** — a page-context
fact has no `block_slug`, no `array_attr`, no `field_key`; it cannot share a
primary key with either `array_item_schema` or `block_render_repeaters`. This was
the council's own forward-looking finding when reviewing §4.2's fork.

## 5. Stage B (FALLBACK) — DB-fact elimination

Runs only when Stage A's structure-first matching (§4) doesn't reach a known
shape. Unchanged from the strongest result found last session: for a candidate
repeated group, check simple DB facts (does it have a price-shaped field? an
image field? per `array_item_schema`/`block_attributes`) to eliminate non-matching
blocks from the candidate list.

### 5.1 What this narrows, and what it doesn't

Reportedly narrowed 6 of 8 real content groups in the source draft to exactly one
confident candidate — re-verify this figure against real fixture data at build
time, per §8 (it was conversation-derived, not written to a file, at time of
writing).

### 5.2 Field-level resolution once narrowed

Once narrowed to one (or a short list of) candidate(s), resolve remaining
field-level ambiguity in priority order: (1) function-vs-string / `onClick`-bound
fields = action (Thread 1, strongest, two-layer-confirmed); (2) a shared named
formatter (e.g. `this.gbp(...)` → price); (3) JS field names as English words, as
a corroborating check only; (4) content-value-shape detectors (relative-date,
FAQ-question-mark, SVG icon-path); (5) HTML tag shape for long-form vs short-form
content, weakest tie-breaker only. Explicitly NOT a signal: HTML tag shape for
"which field is the title" — proven unreliable even within one draft (Thread 1
Finding 2a).

### 5.3 Framework-gap finding — CORRECTED this session

Last session's evidence found a "top brands" content group (name + count + link,
no image) with, it was claimed, no matching block anywhere in the framework. This
was WRONG, caught the same way the buybox/WooCommerce corrections were caught —
checking the real block instead of trusting the DB projection. `sgs/brand-strip`
already has `name` and `linkUrl` per-item fields, and its `media` field was
deliberately fixed (D1031) to accept `null` as a genuine, validating empty state
specifically so a logo entry can have no image. There is no framework gap here.
The only unmatched field is the "count" text (e.g. "12 frames"), which either
gets dropped with an honest skip-reason or gets a small new attribute added to
`sgs/brand-strip` — a minor content decision, not a missing-block problem.

### 5.4 Why Stage A had to come first

DB-fact elimination is structurally blind to two real categories: (a) render-time
repeaters with no `block.json` attribute at all to project into
`array_item_schema` (12 of 206 blocks have any coverage in that table at all,
confirmed by direct query this session — buybox is one of the other 194); (b)
anything that isn't an SGS block, like WooCommerce's own native filter blocks —
no SGS-scoped table can ever contain that answer regardless of how it's queried.

## 6. Corrections carried forward from this evidence base (do not re-litigate)

- `thumbs` (draft's PDP thumbnail-selector group) → `sgs/buybox`'s real
  `gallery-col.php` thumbnail strip, NOT "no confident match" as Thread 3/4
  originally concluded. See §5.4(a).
- `items`/`filterGroups` (draft's shop filter panel) → WooCommerce's own native
  Product Filter blocks + `sgs/filter-search` as a companion, NOT
  `sgs/option-picker` (which only shared similar attribute vocabulary). See
  §5.4(b) and §4.5.
- The "top brands" framework gap → no gap; `sgs/brand-strip` already covers it.
  See §5.3.
- Full trail: `.claude/decisions.md` D1074, D1078.

## 7. Permanent audit log (unchanged from v1.0.0)

Every classless-group decision — Stage A structure match, Stage B elimination
result, auto-completed or fell to review — is written to a durable, append-only,
git-tracked log (`plugins/sgs-blocks/scripts/recogniser/classless-recognition-log.jsonl`,
NOT inside per-run `pipeline-state/<run>/`). At orchestrator completion, any run
producing classless-path conversions or review-queue items prints a clear
end-of-run summary block to stdout, the same discipline v1.0.0 specified.

## 8. What this does NOT change

- `recognise()` / `converter/recognition.py` — byte-for-byte unchanged. R-31-2's
  scope is exactly what it was.
- `build_block_markup()` — unchanged; neither Stage A nor Stage B calls it for a
  render-time-repeater match; Stage B's field-lift path reuses
  `array_content.py`'s existing, unmodified extraction helpers.
- The existing `dom_shape`/`sc_var` eligibility gates — unchanged.
- One-off (non-repeated) classless sections, and styling transfer — out of scope
  (§2).

## 9. Build sequencing (designed together, built in two passes)

1. **Pass 1 — structural shapes.** §4.2-4.4 (`block_render_repeaters` +
   source-derived seeding + the recognition consumer) and §5 (DB-fact
   elimination fallback, §5.3's brand-strip correction). Two verified real cases
   already exist (buybox, and the DB-elimination 6/8 result once re-verified).
2. **Pass 2 — page-context detector.** §4.5, built against ONE real template case
   (the shop archive → WooCommerce native blocks) rather than in the abstract,
   per this project's own "build the detector against real evidence" discipline.

Both passes are designed in this document now so the shared shape (a "known
composite" — structural or page-context — feeding into the same FR-44-1 trust
gate) doesn't get retrofitted later; only the BUILD order is staged.

## 10. Test plan

- Unit tests for the Stage A structure matcher: real fixtures (not
  synthetic-canonical) for buybox's thumbnail gallery and the shop filter panel,
  asserting exact-match classification; a negative control where a group is
  close-but-not-exact, asserting it does NOT auto-complete (FR-44-1 clause b).
- Unit tests for `block_render_repeaters` seeding: assert a render-time row
  SURVIVES a full `/sgs-update` reseed (the exact failure mode that ruled out the
  one-table option) — a negative control this project doesn't yet have anywhere
  in `converter/tests/` or `db-consistency/tests/`.
- Unit tests for Stage B: the five real shapes proven last session (ticker,
  brand-tile, reasons-card, filter chip, basket line item), plus a negative
  control (a group with a genuinely ambiguous field no rule can resolve),
  asserting it falls to review, never a guessed slot.
- Unit tests for the page-context detector: the real route-name list from the
  Eye Care draft (`home`, `shop`, `product`, `checkout`, `lenses`, `done`),
  asserting correct CPT/template destinations and correct fallthrough for `home`.
- Live verification (this project's hard rule): re-run against the real Eye Care
  Birmingham draft, confirm the previously-admitted-but-failed boundaries (13
  admitted, 0 completed) now show real completions or honest review-queue
  entries, and confirm the existing BEM-path baseline is fully unaffected.
- Confirm the audit log + end-of-run alert fire on that real run.

## 11. Explicitly deferred (tracked, not built here)

- **One-off classless sections** — no sibling group and no known-composite match
  to check a guess against. Revisit once the repeated-group case is proven
  across more real drafts.
- **An AI fallback (Tier-B-style)** for cases nothing here resolves — depends on
  the still-open Anthropic API-key decision; only worth building once real
  logged review-queue data shows deterministic rules genuinely aren't enough.
- **Per-group vs per-member consistency checking for Stage B** — does a
  genuinely group-level elimination still need a separate per-member check for a
  mistake that repeats identically across every group member (the failure mode
  that killed D1074 round 2's v2.0.0)? Not re-examined against this new shape;
  flag explicitly rather than assume fixed.
- **Whether `array_item_schema.role`'s ~30% population rate (25 of 84 rows,
  measured this session) is broad enough to rely on for Stage B**, or needs a
  seeding push first.
- **Tier A (`sc_var_classifier.py`) integration** — once its alias bug is fixed,
  does it become a third signal layered into Stage B, or is it superseded?
  Measure, don't assume additive.
- **The two undone `dom_shape_classifier.py` prerequisite fixes** from D1074
  (per-classifier `Hint.source`, a DB-verified `sgs/card-grid` slug) — confirm
  still needed under this shape before building.

## 12. Evidence index

| Source | What |
|---|---|
| `.claude/decisions.md` D1074 | Full 3-round council failure trail for v1.0.0 |
| `.claude/decisions.md` D1078 | The buybox/WooCommerce live corrections |
| `.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md` | Thread 1 (JS/HTML signal evidence) |
| `.claude/reports/2026-09-14-classless-recognition-next-design-attempt.md` | Full six-thread synthesis this spec is built from |
| `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` | The pre-existing CPT/template routing gap §4.5 closes |
| This session's `/adversarial-council` run (2026-09-15) | The `block_render_repeaters` sibling-table decision, 5/5 unanimous |
