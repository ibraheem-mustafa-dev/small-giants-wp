# Spec 44 — Classless Repeater Recognition

**doc_type:** spec
**spec_id:** 44
**spec_version:** 2.1.0
**Status:** DESIGNED — not yet built (v2.0.0 reviewed by 6-persona `/adversarial-council`,
2026-09-15, 5 of 6 NO-GO; this revision fixes the load-bearing findings — see §0.1)
**Date:** 2026-09-15

## 0. What changed since v1.0.0 (read this first)

v1.0.0 went through three `/adversarial-council` rounds (D1074) and was reverted —
each round found a fundamental flaw the previous fix introduced, and all three
attempts shared one root cause: they only ever looked at the *rendered HTML* of a
repeated group. v2.0.0 rebuilt the mechanism from six new evidence threads —
documented in `.claude/reports/2026-09-14-classless-recognition-next-design-attempt.md`
and `.claude/decisions.md` D1074/D1078. Read those before touching this spec's
mechanism.

### 0.1 What changed since v2.0.0

A second council pass (6 personas, 2026-09-15) found the evidence discipline was
genuinely sound — a dedicated fact-checking reviewer verified every checkable claim
in v2.0.0 against the real code and found zero fabrications, a real improvement on
v1.0.0's Round 3. But five of six reviewers still returned NO-GO. Fixed in this
revision:

1. **§4.1's flagship worked example (buybox) was mis-described as a field-name
   match.** It isn't one — re-derived and corrected (§4.1, §4.3).
2. **§4.5's route-name signal missed 3 of 9 real routes** on the very draft it was
   built from. Corrected to use the draft's complete `isPage(...)` enumeration
   (§4.5).
3. **§4.5 cited a table (`slot_synonyms`) that was retired months ago.** Repointed
   to the real, live mechanism (§4.5).
4. **Neither the render-time consumer (§4.4) nor the page-context detector (§4.5)
   named where in the real pipeline they run.** Traced against the real code and
   named explicitly (§4.4, §4.5, §8).
5. **FR-44-1's auto-complete trust gate still let a single mechanism complete a
   clone with zero human check, on a brand-new client, ever** — the same shape of
   hole Round 1 of the v1.0.0 review closed on. Tightened (§3).

Two lower-severity findings (no described review workflow; no stated scope
percentage) are addressed as short additions (§7, §2) rather than mechanism
changes — the council itself rated these as real but not load-bearing.

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
clones correctly with zero manual fixes for the content this spec covers (see §2's
measured scope — this is a real slice of the classless problem, not the whole of it).

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
  extension (§11), not built here.
- **Trust policy: auto-complete only on a real correctness signal, with a forced
  first-look on anything genuinely new** (FR-44-1, §3).

**Measured scope, on the real Eye Care Birmingham draft (2,220 lines, 815 inline
styles, 39 `sc-for` blocks over 34 distinct repeated groups) — stated plainly so
nobody assumes this covers more than it does:** roughly 19% of the draft's styled
elements sit inside a repeated group this spec addresses; the remaining ~81% are
one-off sections, explicitly out of scope (bullet 1 above). None of the draft's 815
inline styles are transferred by this spec (bullet 2 above) — that remains fully
manual work today. This spec closes the FIELD-IDENTITY gap for repeated content; it
does not, on its own, get a draft to "zero manual fixes" — the responsiveness work
and styling-transfer work (tracked separately, `.claude/LEDGER.md`) are the other
required pieces.

## 3. FR-44-1 — Auto-complete trust gate

A classless-group match auto-completes the clone ONLY when ALL of the following
hold:

**(a) A real correctness signal exists** — EITHER two independent mechanisms agree
on the same block/destination (structure-first match, §4, and DB-fact elimination,
§5, both land on the same candidate), OR a single mechanism produces a genuine
exact STRUCTURAL match (§3.1) against real source.

**(b) The match is unique across the full candidate roster, not just plausible.**
Stage A's structure matcher runs against every seeded block/route, not a
pre-narrowed shortlist (closes the ordering ambiguity in §4.4/§5 — Stage A always
evaluates the whole roster). If two or more blocks/routes produce an equally clean
match, that is NOT clause (a)'s "exact match" — it's a tie, and it falls to review
like any other unresolved case. `/sgs-update` must run a collision census across
`block_render_repeaters` and reject a seed that introduces a roster-wide duplicate
structural signature without a documented disambiguating signal (§10).

**(c) The specific (block-or-route, match-type) pattern has been seen before, for
THIS client.** The first time any given pattern is used to auto-complete against a
NEW client's draft, it is forced to review once, regardless of match quality — a
one-time human look, not a per-item gate. This directly closes the risk this
spec's own §6 documents happening once already in this session (a live,
human-caught near-miss on the exact same reasoning path this mechanism now
automates). Once a pattern has cleared review once for a client, later occurrences
of the SAME pattern for the SAME client auto-complete normally under (a)/(b).

Anything that fails (a), (b), or (c) falls to operator review, via the real,
existing review surface (§7) — never silently dropped (Rule 4).

### 3.1 What "exact structural match" means (clause a, corrected)

**Not a field-NAME match — a rendered-structure match.** A draft's data model and a
block's real PHP variable names will essentially never share literal field names
(confirmed while re-deriving the worked example below — see §4.1). What has to
match exactly is the STRUCTURE: element role sequence, the presence/absence of a
per-item conditional state (e.g. image-or-text-fallback), the presence of a
click/select action per item, and any per-item highlighted/current-state indicator
— matched between the draft's markup shape (via Thread 1's signal set, §5.2) and
the block's REAL rendered markup shape (derived per §4.3). A "3 of 5 structural
markers match" result is a PARTIAL match and never satisfies clause (a) — every
structural marker present in the block's real rendering must have a corresponding
marker in the draft's group, and vice versa.

## 4. Stage A (PRIMARY) — structure-first matching against real source

### 4.1 The principle, and the corrected worked example

Don't identify a repeated group's fields one at a time. Recognise the whole
subtree's identity first by matching its rendered STRUCTURE (§3.1) against a KNOWN
composite's real, complete implementation — then every child inherits its identity
from its known position in that real implementation.

**Corrected worked example — `sgs/buybox`'s thumbnail gallery.** Re-derived
directly against `gallery-col.php` after the council found the original v2.0.0
description overstated it as a field-name match. The real per-thumbnail loop
(`gallery-col.php`, the `foreach ( $buybox_def_gallery as $buybox_thumb_idx =>
$buybox_thumb )` block) exposes exactly two real data fields per item — `url`,
`alt` — plus two computed-from-index attributes that are NOT fields (`data-index`
is the loop index itself; `aria-label` is a hardcoded
`sprintf(__('Image %d'))` string, not a per-item value). The draft's `thumbs`
group (`Eye Care Birmingham.dc.html`, the `thumbs = views.map(...)` construction)
has a click action (`t.pick`), a label (`t.label`), and an image-or-text-fallback
conditional (`t.hasImg`/`t.img`/`t.noImg`).

**What genuinely matches, stated honestly:** the STRUCTURE — a strip of buttons,
one per item, each with a click-to-select action, each showing either an image or
a text fallback, one item visually marked as current/selected. That structural
shape is real, verified, and matches `gallery-col.php`'s actual rendered markup
(button role, `data-index` action-target, `aria-current`, conditional image vs. the
block's separate no-image state). **What does NOT match, and the spec must stop
claiming it does:** literal field names (`url`/`alt` vs. `img`/`label`) — these
were never going to align, and clause (a) as corrected in §3.1 doesn't require them
to.

### 4.2 New DB table — `block_render_repeaters`

A SIBLING table to `array_item_schema`, not a column on it — decided by a
5-persona `/adversarial-council` run this session, unanimous. Reason:
`array_item_schema`'s existing update routine (`sgs-update-v2.py`, the
array-item-schema seeder block) unconditionally deletes and rebuilds a block's
rows from its `block.json` `items.properties` on every `/sgs-update` run. A
shared-table row for a render-time repeater (which has no `block.json` attribute
to rebuild from) would be silently wiped on the very next refresh. Existing
readers (`db_lookup.py`'s `array_item_field_names`/`array_item_field_schema`,
`converter/resolvers/array_content.py`) also don't filter by source kind, so a
shared table risks those rows being misread as editor-attribute rows they aren't.

```sql
CREATE TABLE block_render_repeaters (
    block_slug   TEXT NOT NULL,
    role         TEXT NOT NULL,   -- STRUCTURAL role per §3.1: 'action-trigger', 'image-or-fallback', 'current-state-indicator', 'label' — not a literal field key
    role_order   INTEGER,
    source_file  TEXT NOT NULL,    -- e.g. 'gallery-col.php'
    source_sha   TEXT NOT NULL,    -- sha256 of the resolved source (via render_emits' own source-resolution path), so a row that no longer matches its source is detectable, not silently stale
    PRIMARY KEY (block_slug, role)
);
```

Note the schema change from v2.0.0: `field_key`/`field_order` (named-field
columns, appropriate for `array_item_schema`'s editor-attribute rows) are replaced
with `role`/`role_order` (structural-role columns, per §3.1's corrected match
definition) — this table was never going to hold literal field names reliably,
since the source is PHP-rendered structure, not a declared schema.

### 4.3 Seeding — source-derived, never a hand-declared block.json key

Two sub-steps, both derived from the block's real PHP source, never a hand-typed
Python dict (R-31-1):

1. **Detection** — does this block even have a render-time repeater? A source-scan
   for a `foreach` over a plain (non-attribute-backed) array in the block's
   `render.php` or a required partial, mirroring the existing `emit_shape` seeder's
   pattern (`sgs-update-v2.py::_populate_emit_shape`, source-derived via
   `converter.services.render_emits` — the proven, shipped precedent for "read the
   block's real PHP, put the fact in the DB, don't scan at convert-time"). Include
   a fail-loud branch, matching `_populate_emit_shape`'s own discipline: a block
   whose PHP structure can't be parsed is flagged, never silently marked
   "no repeater."
2. **Structural-role derivation** — for the detected repeater's rendered output,
   derive its structural roles (§3.1: action-trigger, image-or-fallback,
   current-state-indicator, label) by reapplying Thread 1's already-proven signal
   set (`.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md`)
   to the block's OWN rendered markup instead of a draft's — a `data-*` attribute
   bound to a click target marks an action-trigger, an `aria-current`/similar
   toggled attribute marks a current-state-indicator, a conditional image-vs-text
   render marks image-or-fallback.

**Explicitly rejected:** a new declared `block.json` key (e.g.
`supports.sgs.renderTimeRepeaters`) that a human hand-fills per block. This is the
same shape as the retired `arrayItemFields` mechanism (D248) — "the create/prune/
accessor trio existed; the seeder never did; zero inserts anywhere in the repo" —
tombstoned in this project's own code a few weeks before this spec. Do not
resurrect it.

**Negative control (added per council finding, §10):** a block with an ordinary
non-repeater `foreach` (e.g. a class-list builder) must seed ZERO rows —
required test, not optional.

**Staleness (added per council finding):** `source_sha` (§4.2) lets `/sgs-update`
detect when a block's PHP has changed shape since its rows were seeded. A
mismatch triggers a reseed, not silent staleness — add this check alongside the
existing `block_selectors` prune this project already runs for the equivalent
problem on a different table.

### 4.4 New consumer, and exactly where it runs

`array_content.py::lift_array_content()`'s job is "copy fields into a declared
block attribute." A render-time repeater has no attribute to copy into — routing
it through that function is a category error. A new, separate function owns this
case:

`recognise_render_time_repeater(draft_group, all_seeded_blocks) -> RenderMatchResult`

**Exact call site (named, per the council's finding that this was previously
unspecified):** runs at the SAME orchestrator stage that already admits a
`dom_shape_classifier.py`-flagged boundary — `sgs-clone-orchestrator.py`'s
extraction stage, BEFORE that boundary would otherwise be handed to
`converter.entry.convert_section` (which would fail on classless content, exactly
as proven this session: 13 admitted, 0 completed under the old dom-shape-only
gate). When a boundary matches per FR-44-1, this function's result is used
INSTEAD of calling `convert_section` for that boundary — `recognise_section()`,
`build_block_markup()`, and `converter/walk.py` are never invoked for a
Stage-A-matched boundary, and are therefore genuinely unchanged (§8), because this
is a parallel decision made at the orchestrator layer, not a modification to what
those functions return.

`all_seeded_blocks` (renamed from v2.0.0's `candidate_blocks` per FR-44-1(b) —
Stage A always evaluates the full seeded roster, never a pre-narrowed shortlist).

On a match satisfying FR-44-1 in full, the group is classified as natively-sourced
via a real, cheat-gate-legal emission: the emitted block markup carries
`sourceMode='wc-product'` (buybox's real, already-legitimate mode per
`check_bound_emit.py`'s permitted list — `wc-product`/`sgs-cpt`/`typed`), not a
bare skip. A conservation record is logged with a PER-FIELD disposition, not a
bare count (Rule 4 requires this): each draft field is recorded as
`transferred | natively-sourced-by <block> | skipped: <reason>` — including the
group's own CSS explicitly recorded as `skipped: styling transfer out of scope,
§2` rather than left unmentioned.

### 4.5 Page-context detector (designed together, built as its own pass — §9)

A second, structurally different structure-first mechanism, motivated by the
WooCommerce filter-panel case: some content's identity depends on WHERE it sits
on the page (which real page/template it becomes), not on its own DOM shape.

**The signal — corrected to the draft's COMPLETE route enumeration, not a partial
scan.** v2.0.0 read only literal `this.go('<name>')` calls, which the council
found misses 3 of the Eye Care draft's 9 real routes (`about`, `help`, `contact`
are reached via an indirection, `const nav = page => e => this.go(page)`, called
as `nav('about')` etc. — a plain string-literal scan for `this.go(` never sees
them). The corrected, complete signal is the draft's own **`isPage(...)`
enumeration** (`Eye Care Birmingham.dc.html`: `isHome`, `isShop`, `isProduct`,
`isLenses`, `isAbout`, `isHelp`, `isContact`, `isCheckout`, `isDone` — all nine,
verified directly against the file), read as the primary signal; `this.go(...)`
calls are corroboration only, never the sole source.

This directly answers a real, previously-scoped, unbuilt gap — see
`.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md`, "Not yet
designed": *"the clone-time detector that recognises a draft section as
header/footer/drawer/mega-menu/shop/product-shaped and routes it into the right
CPT/template, instead of the walker's current chrome-skip-and-discard."*

**The full quote matters, and changes what this touches (council finding — v2.0.0
truncated it).** "Instead of the walker's current chrome-skip-and-discard" means
this mechanism DOES touch walker-adjacent behaviour for chrome-shaped
destinations (header/footer/drawer/mega-menu). Specifically:

- For **chrome-shaped destinations** (header/footer/drawer/mega-menu), this
  extends the SAME permitted walker exception that already exists
  (`SKIP_TOP_LEVEL_TAGS`, R-31-3 exception 2) — not a new, fourth exception. Today
  that exception's gate is a fixed tag list and its outcome is always "discard."
  This spec changes the OUTCOME (route to the matched CPT instead of discarding)
  and extends the GATE from a fixed tag list to a DB-driven check against
  `draft_route_destinations` (§4.5.1) — the same exception, a wider eligibility
  condition and a real outcome instead of a no-op.
- For **template destinations that are NOT chrome** (the shop filter panel is the
  motivating case — ordinary page content, not header/footer/nav), this is
  genuinely new: content that would otherwise be walked as ordinary page content
  must instead be excluded from this page's walk entirely, because it does not
  become a block ON this page at all. This is the same KIND of decision as the
  chrome-skip (exclude from this page's walk), applied to a case that isn't a
  chrome tag — which is new ground for R-31-3, and per Rule 7 (design-gate
  sensitive/high-blast-radius walker changes), **this needs Bean's explicit
  sign-off before Pass 2 is built, not a silent assumption that it's covered by
  the existing exception.** Flagging this plainly rather than asserting it's free,
  per the council's finding.

**New DB table — `draft_route_destinations`, scoped per-client (corrected —
v2.0.0's global PK was a real bug):**

```sql
CREATE TABLE draft_route_destinations (
    client_slug   TEXT NOT NULL,      -- e.g. 'eye-care-ward-end'; a NULL/'default' row provides the framework-generic fallback
    route_name    TEXT NOT NULL,      -- e.g. 'shop', 'checkout' -- literal string as read from the draft's isPage(...) enumeration
    destination_kind TEXT NOT NULL CHECK (destination_kind IN ('cpt', 'template')),
    destination   TEXT NOT NULL,      -- CPT slug (sgs_header, sgs_modal...) or theme template path (archive-product.html...), validated at seed time against the real block/template registry
    PRIMARY KEY (client_slug, route_name)
);
```

Per-client route vocabulary (`'lenses'`, `'done'`) is genuinely one draft's
naming, not a framework-wide fact — client-specific data belongs scoped, per
root CLAUDE.md's "never hard-code client... structure into base theme/blocks
plugin." The framework-generic destination KINDS (`sgs_header`,
`archive-product.html`) are the only part that's truly framework-wide; a
`client_slug='default'` row carries those. Seeded and registered the same way
this project's other DB-first tables are — via `dbschema/capture_seed_data.py`'s
`--check` drift gate (repointing away from v2.0.0's citation of the retired
`slot_synonyms` table; the live equivalent name-matching mechanism is
`slots`/`roles` + `db_lookup.py::load_slot_aliases`, and this table follows the
same registration discipline, not that specific retired table).

## 5. Stage B (FALLBACK) — DB-fact elimination

Runs only when Stage A's structure-first matching (§4) doesn't reach a known
shape, and ALWAYS scans the full seeded roster (FR-44-1(b) — no pre-narrowing).

### 5.0 Step 0 — verify before building (added per council finding)

Before Pass 1 code is written, run and record:
1. The real `array_item_schema.role` population rate (measured this session: 25 of
   84 rows, ~30%, across 12 of 206 blocks) — confirm this hasn't drifted, and
   decide whether Stage B needs a seeding push BEFORE it's relied on, rather than
   discovering this mid-build.
2. Re-verify §5.1's "6 of 8 groups narrowed" figure against real fixture data —
   it was conversation-derived, not written to a file, at time of writing (see
   §12). State the actual group list and the denominator (the draft has 34
   distinct repeated groups; "8" needs its filter criterion named).

### 5.1 What this narrows, and what it doesn't

Reportedly narrowed 6 of 8 real content groups in the source draft to exactly one
confident candidate — subject to §5.0's re-verification before this figure is
relied on as settled.

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
no image) which was flagged as having no matching block anywhere in the
framework. Re-checked directly against the real block this session (2026-09-15):
`sgs/brand-strip` already has `name` and `linkUrl` per-item fields, and its
`media` field was deliberately fixed (D1031) to accept `null` as a genuine,
validating empty state specifically so a logo entry can have no image. There is
no framework gap here. The only unmatched field is the "count" text (e.g. "12
frames"), which either gets dropped with an honest skip-reason or gets a small
new attribute added to `sgs/brand-strip` — a minor content decision, not a
missing-block problem.

### 5.4 Why Stage A had to come first

DB-fact elimination is structurally blind to two real categories: (a) render-time
repeaters with no `block.json` attribute at all to project into
`array_item_schema` (12 of 206 blocks have any coverage in that table at all,
confirmed by direct query this session — buybox is one of the other 194); (b)
anything that isn't an SGS block, like WooCommerce's own native filter blocks —
no SGS-scoped table can ever contain that answer regardless of how it's queried,
regardless of sequencing.

## 6. Corrections carried forward from this evidence base (do not re-litigate)

- `thumbs` (draft's PDP thumbnail-selector group) → `sgs/buybox`'s real
  `gallery-col.php` thumbnail strip, matched on rendered STRUCTURE (§3.1, §4.1) —
  NOT "no confident match" as Thread 3/4 originally concluded, and NOT a
  field-name match as v2.0.0 first claimed.
- `items`/`filterGroups` (draft's shop filter panel) → WooCommerce's own native
  Product Filter blocks + `sgs/filter-search` as a companion, NOT
  `sgs/option-picker` (which only shared similar attribute vocabulary) — this
  was a live, human-caught near-miss this session (the DB-check on
  `option-picker`'s attributes "looked like a confirmation" before the real page
  was checked), which is precisely why FR-44-1(c)'s forced-first-review exists.
- The "top brands" framework gap → no gap; `sgs/brand-strip` already covers it.
  See §5.3.
- Full trail: `.claude/decisions.md` D1074, D1078.

## 7. Permanent audit log + the real review surface

Every classless-group decision — Stage A structure match, Stage B elimination
result, auto-completed or fell to review — is written to a durable, append-only,
git-tracked log (`plugins/sgs-blocks/scripts/recogniser/classless-recognition-log.jsonl`,
NOT inside per-run `pipeline-state/<run>/`).

**The review surface is real and already exists — name it, don't invent a new
one.** This pipeline already generates `pipeline-state/<run>/operator-review.html`
per run (`recogniser/simple_html_review_report.py`, wired from
`sgs-clone-orchestrator.py`) — confirmed present across every recent real run.
Items that fall to review under FR-44-1 are added to that same page (candidate
block/destination, the structural signal that almost-but-didn't clear FR-44-1,
and why), not a separate technical log Bean would have to know to look for. At
orchestrator completion, any run producing classless-path conversions or
review-queue items prints a clear end-of-run summary block to stdout AND writes
a small standalone summary file (`pipeline-state/<run>/classless-summary.md`) so
it survives past terminal scrollback and can be surfaced by a later `/handoff` or
session-start hook, not only seen by someone watching the terminal at that exact
moment.

## 8. What this does NOT change

- `recognise()` / `converter/recognition.py` — genuinely unchanged, BECAUSE (not
  merely asserted) Stage A/B's matches are consumed at the orchestrator's
  extraction stage BEFORE a matched boundary would otherwise reach
  `convert_section` (§4.4) — this function's inputs and behaviour are identical
  to today for every boundary that reaches it.
- `build_block_markup()` — unchanged for the same reason; neither Stage A nor
  Stage B calls it for a render-time-repeater match; Stage B's field-lift path
  reuses `array_content.py`'s existing, unmodified extraction helpers.
- The existing `dom_shape`/`sc_var` eligibility gates — unchanged.
- One-off (non-repeated) classless sections, and styling transfer — out of scope
  (§2).
- `converter/walk.py`'s three permitted exceptions — Pass 1 (§4.2-4.4) adds none
  and changes none. Pass 2's chrome-routing (§4.5) extends exception 2's gate
  condition (same exception, wider eligibility, real outcome instead of discard);
  Pass 2's non-chrome page-context routing is flagged explicitly in §4.5 as
  needing Bean's design-gate sign-off before build, not silently asserted safe.

## 9. Build sequencing (designed together, built in two passes)

1. **Pass 1 — structural shapes.** §5.0's verification step, then §4.2-4.4
   (`block_render_repeaters` + source-derived seeding + the recognition
   consumer, now with the corrected worked example) and §5 (DB-fact elimination
   fallback, §5.3's brand-strip correction).
2. **Pass 2 — page-context detector.** §4.5, built against ONE real template case
   (the shop archive → WooCommerce native blocks). Gated on Bean's explicit
   sign-off for the non-chrome walker-exclusion question (§4.5) before this pass
   starts, per Rule 7.

Both passes are designed in this document now so the shared shape (FR-44-1's
trust gate) doesn't get retrofitted later; only the BUILD order is staged, and
Pass 2 does not begin until its one open design-gate question is resolved.

## 10. Test plan

- Unit tests for the Stage A structure matcher: real fixtures for buybox's
  thumbnail gallery (using the CORRECTED structural definition, §4.1) and the
  shop filter panel; a negative control where a group is close-but-partial (per
  §3.1, some but not all structural markers present), asserting it does NOT
  auto-complete; a COLLISION negative control (two seeded blocks/routes sharing
  an identical structural signature), asserting FR-44-1(b) routes it to review,
  not to either candidate.
- Unit tests for `block_render_repeaters` seeding: (a) a render-time row
  SURVIVES a full `/sgs-update` reseed; (b) a block with an ordinary
  non-repeater `foreach` seeds ZERO rows (§4.3's negative control); (c) mutating
  a fixture block's PHP source changes `source_sha` and triggers a reseed
  warning, not silent staleness.
- Unit tests for Stage B: the five real shapes proven last session (ticker,
  brand-tile, reasons-card, filter chip, basket line item), plus a negative
  control (a group with a genuinely ambiguous field no rule can resolve),
  asserting it falls to review, never a guessed slot.
- Unit tests for the page-context detector: the real, COMPLETE route-name list
  from the Eye Care draft's `isPage(...)` enumeration (all nine: `home`, `shop`,
  `product`, `lenses`, `about`, `help`, `contact`, `checkout`, `done`), asserting
  correct CPT/template destinations and correct fallthrough for `home`.
- FR-44-1(c) test: simulate a new client's first occurrence of a previously-seen
  pattern; assert it is forced to review once regardless of match quality, and
  that a second occurrence for the SAME client auto-completes normally.
- Live verification (this project's hard rule): re-run against the real Eye Care
  Birmingham draft, confirm the previously-admitted-but-failed boundaries (the
  actual command + run-id that produced this session's 13-admitted/0-completed
  figure is recorded in `pipeline-state/` under this session's run directories —
  cite the specific run at build time rather than the bare number) now show real
  completions or honest review-queue entries, and confirm the existing BEM-path
  baseline is fully unaffected.
- Confirm the audit log, `operator-review.html` entries, and end-of-run summary
  file (§7) all fire on that real run.

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
  that killed D1074 round 2's v2.0.0)? Not yet resolved under this shape;
  flagged explicitly, not assumed fixed. Note this is a real, open hole in
  clause (a)'s single-mechanism path specifically — a systematic error that
  affects every member of a group identically would still pass an "exact
  structural match" today.
- **Testing against a second, independently-generated draft.** D1074's own
  recommendation. `Frame Card.dc.html` sits in the same directory as this
  session's primary draft and has not yet been checked against this design.
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
| This session's first `/adversarial-council` run (2026-09-15) | The `block_render_repeaters` sibling-table decision, 5/5 unanimous — transcript in this session's conversation, no separate written artefact yet (flagged by the second council pass as a citation gap; if this matters at build time, capture it to a report) |
| This session's second `/adversarial-council` run (2026-09-15) | The v2.0.0 review that produced this v2.1.0 revision — 6 personas, 5 NO-GO, findings listed in §0.1 |
