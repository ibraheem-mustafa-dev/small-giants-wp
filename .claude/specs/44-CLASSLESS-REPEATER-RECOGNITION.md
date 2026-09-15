# Spec 44 — Classless Repeater Recognition

**doc_type:** spec
**spec_id:** 44
**spec_version:** 2.3.0
**Status:** DESIGNED — Pass-1 mechanism (Stage A + Stage B, within-page repeated
content only) is internally consistent after three council rounds and one
scope correction; NOT yet re-verified by a council pass since v2.2.0 → v2.3.0,
and not yet built. Page routing/per-client template design (formerly this
spec's "Pass 2") is OUT OF SCOPE as of this revision — see §0.3, §4.5.
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

### 0.2 What changed since v2.1.0 — the actual root cause

A lighter three-reviewer follow-up on v2.1.0 found the fix attempt introduced a
real error (a `sourceMode` claim that doesn't exist on the real block — corrected
in §4.4) and, more importantly, exposed a design flaw underneath both earlier
revisions: **Stage A compared a repeated item's shape against the ENTIRE block
roster, with nothing narrowing the field first.** Two real blocks
(`sgs/buybox`, `sgs/product-card`) render deliberately identical thumbnail-strip
markup — checked leaf-shape-only, they're indistinguishable no matter how the
matching vocabulary grows.

The fix is not a bigger vocabulary or a collision-rejection gate (both v2.1.0
attempts). It's sequencing: **narrow candidates by the item's PARENT context —
which page it's on, and whether it's a singleton or one of many repeated
siblings — before ever comparing leaf shape** (§4.1, §4.3). `sgs/buybox` is
always a singleton; `sgs/product-card` is always one of many grid siblings.
That separates them before the thumbnail strip is ever examined, using a
detector this pipeline already has (`repeated_sibling_detector.py`) plus the
parent element's own declared composite shape (`block_attributes`). Captured as
a standing rule:
`C:/Users/Bean/.claude/memory/learning/2026-09-15-narrow-by-parent-context-before-leaf-structural-match.md`.

This also resolves two smaller v2.1.0 gaps as a side effect, not a separate
patch: clause (a)'s "two independent mechanisms" reachability problem, and
clause (c)'s missing client parameter — both restated cleanly in the corrected
§3.

### 0.3 What changed since v2.2.0 — page routing moved out of scope entirely

Bean corrected a scope assumption carried since v2.0.0: page-level routing
(§4.5, formerly planned as this spec's "Pass 2") isn't a second pass of THIS
mechanism at all. Each draft route (`shop`, `product`, `home`, ...) is cloned as
its own separate run against its own destination — there is never a single walk
where some content converts normally and other content needs routing away
mid-page, so the walker-exception design-gate question §4.5 used to raise never
actually arises under how this pipeline runs. That question, and the
page-routing mechanism itself, move to a separate, already-planned "template/CPT
side of the cloning pipeline" (Bean's phrasing) — not built or design-gated
here. §4.5 is now a scoped placeholder pointing at that track, not part of this
spec's build. Stage A's parent-narrowing (§3.1, §4.3) no longer depends on it —
repointed to signals that stay within this spec's own scope (repetition context
+ the parent's own declared composite shape).

A second correction surfaced in the same exchange, recorded for the future
track rather than designed here: cloning a template-destination page (e.g.
`product`) isn't "convert one draft into one WP page" — it's extracting that
draft's design and writing it into the site's own shared theme template file,
so every instance of that page type inherits it. Confirmed this session: no
part of the current pipeline writes to `theme/sgs-theme/templates/` today.
Genuinely new capability, not an extension of what exists — flagged for the
template/CPT track, not this spec.

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
- **Styling transfer is out of scope.** This spec is a content-field-identity
  mechanism for repeated groups within a single page clone. It says nothing
  about how a classless child's CSS gets transferred to the matched block
  attribute.
- **Page-level routing is out of scope** (moved out in this revision — §0.3,
  §4.5). Which real page/template a whole draft route becomes, and how a
  draft's design gets written into a site's own theme template, belongs to a
  separate, already-planned template/CPT track, not this spec.
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

A classless-group match auto-completes the clone only when both hold:

**(a) A genuine, parent-narrowed exact structural match** (§3.1). Stage A never
compares a leaf item's shape against the full block roster — it first narrows to
the small set of candidates consistent with the item's PARENT context (§4.1,
§4.3), then checks for an exact structural match within that narrowed set. A
partial match, or a match against more than one surviving candidate, is not
"exact" and falls to review like any unresolved case.

**(b) The specific (block-or-route, match-type) pattern has been seen before, for
THIS client.** The first time a given pattern is used to auto-complete against a
NEW client's draft, it is forced to review once — a one-time human look, not a
per-item gate — recorded per `client_slug` in the audit log (§7). This closes the
risk §6 already documents happening once this session: a live, human-caught
near-miss on the exact reasoning path this mechanism now automates. Once a
pattern has cleared review for a client, later occurrences for the SAME client
auto-complete under (a) alone.

*(v2.1.0 carried a third clause — "two independent mechanisms agree" — as an
alternative to (a). Dropped here: Stage B only runs when Stage A finds nothing,
so the two mechanisms could never actually agree; keeping unreachable prose in a
trust gate is worse than removing it.)*

Anything that fails (a) or (b) falls to operator review, via the real, existing
review surface (§7) — never silently dropped (Rule 4).

### 3.1 What "exact structural match" means, and why parent-narrowing comes first

**Narrow by parent context before comparing the leaf item's own shape.** Two
blocks can be deliberately built to render identical leaf markup — confirmed
this session: `sgs/buybox` and `sgs/product-card` share a byte-identical
thumbnail-strip pattern by design. No amount of leaf-shape detail tells them
apart, because the difference was never IN the leaf. It's in the parent:
`sgs/buybox` is always a singleton within its clone; `sgs/product-card` is
always one of many repeated siblings in a grid. Stage A checks this first,
using two signals that stay within this spec's own scope (page-level routing —
§4.5 — is a separate, deferred mechanism and is NOT a dependency here):
(i) `converter/services/repeated_sibling_detector.py`'s existing
singleton-vs-repeated check, and (ii) the group's own PARENT element's declared
composite shape (does the parent carry a PDP-style attribute set — price,
add-to-cart, configurator — or a compact-card attribute set — checked against
`block_attributes`, the same table Stage B already reads). Both run before Stage
A ever looks at a thumbnail's shape. This routinely narrows the field to one
candidate before leaf matching starts, which is what makes leaf matching safe to
trust at all.

**The leaf check itself is a rendered-structure match, not a field-NAME match.**
A draft's data model and a block's real PHP variable names essentially never
share literal names (confirmed while deriving the worked example, §4.1). What
must match exactly is structure: the element-role sequence, the presence or
absence of a per-item conditional state (e.g. image-or-text-fallback), a
click/select action per item, and any current-state indicator — matched between
the draft's markup shape (Thread 1's signal set, §5.2) and the parent-narrowed
candidate's real rendered markup shape (§4.3). Every structural marker present in
one must have a corresponding marker in the other; a partial match never
satisfies (a).

## 4. Stage A (PRIMARY) — structure-first matching against real source

### 4.1 The principle, and the corrected worked example

Don't identify a repeated group's fields one at a time, and don't match a leaf
item's shape against the whole roster. Narrow by parent context first (§3.1),
then recognise the narrowed candidate's whole subtree by matching its rendered
STRUCTURE against its real, complete implementation — every child then inherits
its identity from its known position in that implementation.

**Worked example — `sgs/buybox`'s thumbnail gallery — re-derived twice against
the real file, corrected both times.** The per-thumbnail loop
(`gallery-col.php`, `foreach ( $buybox_def_gallery as $buybox_thumb_idx =>
$buybox_thumb )`) exposes four real per-item fields — `url`, `alt`, `w`, `h` —
plus two computed, non-field attributes: `data-index` (the loop index) and
`aria-label` (a hardcoded `sprintf(__('Image %d'))` string). The image itself is
UNCONDITIONAL inside this loop — there is no per-item image-or-fallback branch
here; the block's no-image SVG state belongs to the separate main-image element
above the strip, not to any individual thumbnail. The draft's `thumbs` group
(`Eye Care Birmingham.dc.html`, `thumbs = views.map(...)`) has a click action
(`t.pick`), a label (`t.label`), and an image-or-text-fallback conditional
(`t.hasImg`/`t.img`/`t.noImg`).

**Read leaf-only, against the whole roster, this collides with
`sgs/product-card`**, which renders an identical thumbnail loop by deliberate
design (documented in `gallery-col.php`'s own comment) — the flaw both earlier
revisions of this spec missed. **Parent-narrowed, the collision never happens:**
`sgs/buybox` is a singleton on a single-product page; `sgs/product-card` is
always one of many repeated grid siblings (`repeated_sibling_detector.py`) on a
shop/archive page (§4.5). Narrowed to the single-product page's singleton
content, `sgs/buybox` is the only surviving candidate — `sgs/product-card` never
enters the comparison.

**What this means for auto-completion, stated honestly rather than declared a
win:** with the collision resolved, the leaf check still finds the match is
partial, not exact — the draft's image-or-fallback conditional
(`t.hasImg`/`t.noImg`) has no counterpart in the block's own thumbnail loop
(genuinely unconditional there). Per §3.1, a partial match doesn't satisfy clause
(a) even against a single surviving candidate. So this specific group does NOT
auto-complete under this spec — it's correctly identified as `sgs/buybox` with
high confidence (only one candidate survives narrowing, and the structure that
DOES match is exact), but it routes to review rather than completing silently,
which is the right outcome for a group whose leaf shape doesn't fully align, not
a shortfall in the mechanism.

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
    role_order   INTEGER NOT NULL,  -- position within the loop; disambiguates a role that occurs more than once per item (e.g. two labels)
    source_file  TEXT NOT NULL,    -- e.g. 'gallery-col.php'
    source_sha   TEXT NOT NULL,    -- sha256 of the resolved source (via render_emits' own source-resolution path), so a row that no longer matches its source is detectable, not silently stale
    PRIMARY KEY (block_slug, role, role_order)
);
```

Schema change from v2.0.0: `field_key`/`field_order` (named-field columns,
appropriate for `array_item_schema`'s editor-attribute rows) become
`role`/`role_order` (structural-role columns, per §3.1) — this table was never
going to hold literal field names reliably, since its source is PHP-rendered
structure, not a declared schema. `role_order` sits in the primary key, not just
as a sort column, so a repeater with two occurrences of the same role (e.g. a
name AND a count both reading as `label`) stays representable — this was a real
gap in the first version of this table, caught by re-checking against
`sgs/brand-strip`'s own two-label shape (§5.3).

### 4.3 Matching order: narrow the parent, then seed and check the leaf

**Step 0 — narrow candidates by parent context, before any leaf-level work.**
For a repeated group, compute two facts per §3.1, both already available within
this clone (no dependency on the deferred page-routing mechanism, §4.5):
(i) whether the group's own parent element is a singleton or itself one of many
repeated siblings (`converter/services/repeated_sibling_detector.py`, unchanged,
reused as-is); (ii) the parent element's own composite shape, checked against
`block_attributes` (does it carry a PDP-style attribute set, a compact-card set,
or something else). Together these narrow the candidate block list from the
full roster to the small set consistent with that context — routinely one
block. Only this narrowed set is checked against §3.1's leaf-structure rule; a
block outside it is never considered, regardless of how similar its leaf shape
looks.

**Steps 1-2 — seeding the narrowed candidates' real structural shape**, both
derived from the block's real PHP source, never a hand-typed Python dict
(R-31-1):

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

`recognise_render_time_repeater(draft_group, client_slug) -> RenderMatchResult`

Takes `client_slug`, not a candidate list — §4.3 Step 0 does the narrowing
internally (page context + singleton-vs-repeated), so the caller never has to
assemble or pass a shortlist. `client_slug` is what makes FR-44-1(b)'s
per-client first-look check possible: the function queries the audit log (§7)
for prior occurrences of this (block, pattern) pair for this specific client
before deciding whether a match can auto-complete.

**Exact call site:** runs at the SAME orchestrator stage that already admits a
`dom_shape_classifier.py`-flagged boundary — `sgs-clone-orchestrator.py`'s
extraction stage, BEFORE that boundary would otherwise be handed to
`converter.entry.convert_section` (which would fail on classless content, exactly
as proven this session: 13 admitted, 0 completed under the old dom-shape-only
gate). When a boundary matches, this function's result is used INSTEAD of calling
`convert_section` for that boundary — `recognise_section()`, `build_block_markup()`,
and `converter/walk.py` are never invoked for a Stage-A-matched boundary, and are
therefore genuinely unchanged (§8), because this is a parallel decision at the
orchestrator layer, not a modification to what those functions return.

**What gets emitted — corrected.** A prior revision of this spec claimed the
markup should carry `sourceMode='wc-product'`, describing it as buybox's real
mode. Checked directly against `buybox/block.json`: false — buybox has no
`sourceMode` attribute at all, and inventing one would be an undeclared attribute
(the same trap named elsewhere in this project's own rules). The correct
emission is simpler: the recognised composite (e.g. `sgs/buybox`) is emitted
NORMALLY, with whatever real attributes it already takes — the render-time
repeater itself needs no attribute, because the block already renders it from
live data with no block-side input. Nothing new is invented for this slot; it's
just correctly left unwritten. A conservation record is logged with a PER-FIELD
disposition, not a bare count (Rule 4 requires this): each draft field is
recorded as `transferred | natively-sourced-by <block> (no attribute needed) |
skipped: <reason>` — including the group's own CSS explicitly recorded as
`skipped: styling transfer out of scope, §2` rather than left unmentioned.

### 4.5 Page-routing and per-client template design — OUT OF SCOPE for this spec (moved here 2026-09-15)

Earlier drafts of this spec (v2.0.0–v2.1.0) designed a page-context detector as
"Pass 2" of Spec 44, motivated by the WooCommerce filter-panel case. Bean
corrected this: it doesn't belong here.

**Why it's a different mechanism, not a second pass of this one.** Spec 44's
Stage A/B (§4, §5) exist to resolve AMBIGUITY WITHIN a single page clone —
which candidate block a repeated, classless group maps to. Page routing has no
such ambiguity to resolve: each draft route (`shop`, `product`, `home`, ...) is
its own separate clone run against its own destination, decided once, up front
— never a case where the walker is midway through one page and has to choose
whether to keep walking or hand off elsewhere. The walker-exception question
this spec used to raise (does routing chrome/page content away from the current
walk need a broadened or new R-31-3 exception?) doesn't arise under that model,
so it needs no design-gate decision here.

**What the real mechanism actually is, corrected from an earlier
misunderstanding this session:** cloning a page-level route like `product`
isn't "convert this one draft into one WP page." It's extracting that draft's
DESIGN — layout, colours, spacing, block choices — and writing it into the
SITE'S OWN theme template file (e.g. `theme/sgs-theme/templates/single-product.html`),
which every instance of that page type then inherits. Clone one product draft,
every product on the site is designed. Confirmed this session: no part of the
current pipeline writes to `theme/sgs-theme/templates/` today — every clone run
targets one page (`--deploy-target page:<id>`). This is genuinely new
capability, not an extension of what exists.

**Status:** tracked for the upcoming, separately-scoped "template/CPT side of
the cloning pipeline" (Bean's own framing — a named, imminent piece of work,
not a someday item). The route-name-reading signal that WAS designed here
(§4.5's original content: the draft's complete `isPage(...)` enumeration is the
reliable way to read a draft's own page names, corrected from an earlier
partial `this.go(...)` scan that missed 3 of 9 real routes) is real, verified
evidence worth carrying forward into that track's design — not discarded, just
relocated. So is the real, previously-scoped gap it was meant to close: see
`.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md`, "Not yet
designed" — the detector that recognises a draft section as
header/footer/drawer/mega-menu/shop/product-shaped and routes it to its real
destination.

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
  was checked), which is precisely why FR-44-1(b)'s forced-first-review exists.
- The "top brands" framework gap → no gap; `sgs/brand-strip` already covers it.
  See §5.3.
- Full trail: `.claude/decisions.md` D1074, D1078.

## 7. Permanent audit log + the real review surface

Every classless-group decision — Stage A structure match, Stage B elimination
result, auto-completed or fell to review — is written to a durable, append-only,
git-tracked log (`plugins/sgs-blocks/scripts/recogniser/classless-recognition-log.jsonl`,
NOT inside per-run `pipeline-state/<run>/`), one line per decision, each carrying
`client_slug`, the matched block/pattern, and the outcome. This log is also the
named store FR-44-1(b) reads: before auto-completing, `recognise_render_time_repeater`
scans it for a prior row with the same `client_slug` and the same (block,
match-type) pattern — a small, linear scan, since it's scoped per client, not a
new index or table.

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
- The three permitted walker exceptions (R-31-3; exception 2, the chrome-skip,
  lives in `converter/entry.py::_convert_section_body`, not `converter/walk.py`
  — corrected citation) — this spec adds none and changes none. Page routing,
  which would have touched exception 2, is out of scope (§0.3, §4.5).

## 9. Build sequencing

One pass. §5.0's verification step, then §4.2-4.4 (`block_render_repeaters` +
source-derived seeding + the recognition consumer, using the corrected worked
example) and §5 (DB-fact elimination fallback, §5.3's brand-strip correction).

Page routing (formerly a planned "Pass 2") is OUT OF SCOPE — see §4.5. It
belongs to the separate, upcoming template/CPT pipeline track, not this spec.

**Rollout, ships default-off.** Pass 1 lands behind a new flag,
`--classless-match`, off by default — mirroring this project's existing
opt-in flags for comparable mechanisms (`--dom-shape-min-confidence`,
`--sc-var-min-confidence`). Auto-completion (FR-44-1) stays off behind a second
flag, `--classless-auto-complete`, until at least one real client draft has run
review-only and the review queue has been checked by hand. Turning either flag
off is the rollback path if a real run misbehaves — no code revert needed.

## 10. Test plan

- Unit tests for parent-narrowing (§4.3 Step 0): assert `sgs/buybox` and
  `sgs/product-card` — a real, documented pair sharing an identical thumbnail
  structure — are correctly separated by page + repetition context BEFORE leaf
  matching runs, and that a group's leaf shape is only ever checked against the
  narrowed candidate(s), never the full roster.
- Unit tests for the Stage A structure matcher: the real buybox thumbnail
  gallery fixture (using the corrected worked example, §4.1 — this fixture
  should assert the group does NOT auto-complete, since its leaf match is
  partial); a negative control where a group is close-but-partial (per §3.1)
  even after narrowing, asserting it does NOT auto-complete. (The shop filter
  panel is no longer a Stage A fixture — it belongs to the deferred page-routing
  mechanism, §4.5, not a within-page repeated group.)
- Unit tests for `block_render_repeaters` seeding: (a) a render-time row
  SURVIVES a full `/sgs-update` reseed; (b) a block with an ordinary
  non-repeater `foreach` seeds ZERO rows (§4.3's negative control); (c) mutating
  a fixture block's PHP source changes `source_sha` and triggers a reseed
  warning, not silent staleness.
- Unit tests for Stage B: the five real shapes proven last session (ticker,
  brand-tile, reasons-card, filter chip, basket line item), plus a negative
  control (a group with a genuinely ambiguous field no rule can resolve),
  asserting it falls to review, never a guessed slot.
- FR-44-1(b) test: simulate a new client's first occurrence of a previously-seen
  pattern; assert it is forced to review once regardless of match quality, and
  that a second occurrence for the SAME client auto-completes under clause (a)
  alone.
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
| This session's third `/adversarial-council` run (2026-09-15) | The v2.1.0 lighter follow-up — 3 personas, still NO-GO, findings listed in §0.2 (the parent-narrowing fix and the corrected `sourceMode` claim) |
| `C:/Users/Bean/.claude/memory/learning/2026-09-15-narrow-by-parent-context-before-leaf-structural-match.md` | The standing rule captured from §0.2's fix, for future recognition-mechanism design work |
