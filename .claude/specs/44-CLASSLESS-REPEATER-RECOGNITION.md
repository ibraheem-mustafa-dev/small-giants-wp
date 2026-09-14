# Spec 44 — Classless Repeater Recognition

**doc_type:** spec
**spec_id:** 44
**spec_version:** 2.0.0
**Status:** REVISED after adversarial council (v1.0.0 NO-GO, six independent
reviewers) — not yet built
**Date:** 2026-09-14

## 0. Revision note (read first)

v1.0.0 was run through a six-persona adversarial council immediately after being
approved. Verdict: NO-GO. Every persona independently found real, load-bearing
defects; several converged on the same ones from different angles. Full findings:
`.claude/reports/2026-09-14-spec-44-adversarial-council-round-1.md`. This version
(v2.0.0) rewrites every MUST-FIX section. The most serious finding, found
independently by two reviewers: v1.0.0's own account of this session's earlier
class-injection regression (D1071) was subtly wrong, in a way that let v1.0.0's
own mechanism re-import the exact defect D1071 actually found. That is fixed
structurally here (§4.3b), not just re-worded.

## 1. Problem (plain English) — unchanged from v1.0.0

Claude Design — the AI tool used to draft new sites before they're cloned into
WordPress — never writes CSS classes. Everything is inline `style="..."`. The
`/sgs-clone` pipeline's recognition step (`converter/recognition.py::recognise()`)
reads ONLY CSS class names (`R-31-2`) or, for a handful of atomic tags (h1, button,
img), the bare HTML tag. A repeated group of classless content — a ticker of trust
badges, a row of brand logos, a grid of "why choose us" cards, a strip of filter
chips, a list of basket line items — is therefore invisible to the converter today.

**Goal:** teach the pipeline to reliably recognise a repeated, classless group's
children — durably, from a real structural signature — so a genuinely unedited
Claude Design export clones correctly with zero manual fixes.

## 2. Scope

Unchanged from v1.0.0: **repeated groups only**, **deterministic DB-driven rules
only** (no AI in the critical path), **content only for v1 — styling explicitly
deferred** (NEW in v2.0.0, see §4.3a and §8; the Ship-PM and Cynic personas both
independently found v1.0.0 silently dropped 100% of visual styling while reporting
`status: complete`).

**Trust policy, REVISED.** v1.0.0 said "auto-complete, no human gate," triggered
by a single confidence number. Four of six reviewers found this unsafe, and two
quoted `dom_shape_classifier.py`'s own non-negotiable constraint 2 ("never adopt
[a Hint] as the chosen block") being silently overridden with no stated floor.
**v2.0.0 requires TWO independent signals to both clear named floors before
auto-complete fires** (§4.2b) — not one low-confidence number. This is still
Bean's original "auto-complete + permanent log, no per-item human click" decision
— the fix adds a real correctness check underneath it, it doesn't reintroduce a
human gate.

## 3. Why Approach A (a new, separate path) — REVISED citation

Chosen: a wholly separate recognition + assembly path that only ever runs for
content Stage 1 already flagged as "repeated, classless" — `recognise()` and
`build_block_markup()` stay completely untouched.

**v1.0.0 mis-cited why the rejected alternative (class injection) was dangerous.**
The real cause, per `decisions.md` D1071 (verified directly against the decision
text for this revision, not re-paraphrased): *"Tier A's count-fallback names
`'card-grid'` — the REPEATED GROUP's shape, not this individual item's own
identity. Injecting it forced the converter to treat one small/atomic leaf element
as a whole composite block expecting real child content."* The defect was
**applying a group-level label to an individual item**, not injection as a
technique.

**Why this matters for THIS spec, not just historical accuracy:** v1.0.0's own
mechanism took a group-level hint (`dom_shape_hint.block == "card-grid"`) and
tried to derive a PER-ITEM `block_slug` from it with no stated method — silently
re-importing the same group/item conflation. **v2.0.0 removes this defect
structurally, not by caution:** the classless path never derives a separate
per-item block identity at all. The GROUP is the recognised block (e.g.
`sgs/card-grid`); each item becomes ONE ENTRY in that block's own `items[]`
content attribute, not a separately-recognised block in its own right. See §4.3b.

Rejected (unchanged from v1.0.0): extending `recognise()` with a 5th branch
(bigger blast radius on the one function every block depends on); injecting
synthesised classes onto a copy of the child HTML (the corrected D1071 lesson
above still argues against this, for the right reason this time — it re-creates
exactly the group/item conflation, just via a class string instead of a direct
attr write).

## 4. The mechanism

### 4.0 Prerequisite fixes to already-shipped code (small, explicitly in-scope)

Two reviewers independently found v1.0.0's design depends on fields/values that
don't exist in the real, already-shipped `dom_shape_classifier.py`. Both fixes are
small, additive, and — because they touch a shared recognition module — are
themselves covered by this same design-gate approval (Rule 7), not smuggled in
separately:

1. **`Hint.source` must be genuinely per-classifier.** Today (`dom_shape_classifier.py`
   line ~82) every classifier — `classify_heading`, `classify_button_shaped`,
   `classify_landmark_tag`, `classify_repeated_siblings` — returns the same
   constant `source="dom_shape"`. v1.0.0's wiring (§4.4) assumed this field could
   distinguish a repeated-siblings hint from a heading/button/landmark hint; it
   cannot, as written. **Fix:** each classifier sets its own value —
   `"dom_shape:repeated_siblings"`, `"dom_shape:heading"`, `"dom_shape:button"`,
   `"dom_shape:landmark"`. Purely additive (four string literals), no behaviour
   change to confidence/evidence/gating. Update `dom_shape_classifier.py`'s own
   module docstring to record that an auto-completing consumer (this spec) now
   exists and depends on this field being genuinely discriminating.
2. **`classify_repeated_siblings`'s block guess must be a real DB slug.** Today it
   returns the bare literal `"card-grid"` (not `"sgs/card-grid"`) — an R-31-1
   violation already flagged as open debt in D1066's "still open" list, and the
   SAME class of bug already fixed once this session in `sc_var_classifier.py`
   (commit `c184011f8`: bare `"card-grid"` → DB-verified `"sgs/card-grid"`). Mirror
   that exact fix here: query `blocks` for the real slug (verified this session:
   `sgs/card-grid` exists, `status='built'`, `source='sgs'`) rather than hand-typing
   the prefix.

### 4.1 New DB table — `classless_slot_rules`, PROPERLY DB-first (revised)

v1.0.0 named this table "DB-first" but seeded it from prose in the spec document
itself, with no migration mechanism — a reviewer found this is functionally a
hardcoded dict, just relocated, and that the one gate that could catch it
(`check_hardcoded_dicts.py`) doesn't scan the directory this table's consumer
module would live in. **v2.0.0 fixes both:**

```sql
CREATE TABLE classless_slot_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    match_type      TEXT NOT NULL CHECK (match_type IN ('tag', 'content_pattern', 'text_leaf_longest')),
    match_value     TEXT NOT NULL,
    canonical_slot  TEXT NOT NULL,
    priority        INTEGER NOT NULL,                       -- NEW: no default — every row must state its rank explicitly
    source_draft    TEXT NOT NULL,                           -- NEW: which real draft motivated this row — no speculative rows
    added_date      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    UNIQUE(match_type, match_value)                          -- NEW: refuses silent duplicate rules
);
```

**No `content_role` column** (an earlier draft of this revision added one with a
made-up value, `'media'`, that doesn't exist in the real schema — caught and
corrected before shipping, not guessed). The real fix, verified live against
`block_attributes.role`'s actual distinct values (checked this session): content
attrs use FOUR real role values depending on type — `text-content` (153 rows,
confirmed on `sgs/trust-bar`'s single real `title` attr vs. its 15 styling
siblings), `content` (76 rows), `image-object` (74 rows, the real value for
image attrs — NOT a generic "media" label), and `link-href` (32 rows). §4.3a's
attribute filter is `WHERE canonical_slot = ? AND role IN ('text-content',
'content', 'image-object', 'link-href')` — a fixed, DB-verified allowlist
excluding every styling role (`color`, `typography`, `layout`, `behaviour`,
`colour-gradient`, `visual`, `motion`), not a per-rule column needing its own
guessed value.

**Real seed mechanism (not prose):** `plugins/sgs-blocks/scripts/data/classless-slot-rules.json`
(git-tracked), migrated into the DB at module load by a new
`db_lookup._migrate_classless_slot_rules()`, registered in `dbschema/capture_seed_data.py`
with a canary row — the exact same pattern `property_suffixes`/`roles`/`slots`
already use (FR-31-2.2). The markdown table below documents that seed file's
initial content; it is never itself the source of truth.

**`match_type` change from v1.0.0:** `position: 'first'/'last'` (declared but never
used) is dropped — a reviewer found it contradicted the only seed row that used
`position` (`longest_text`, a cross-sibling text-length comparison, not a
positional concept). Renamed to its own type, `text_leaf_longest`, with its
algorithm stated explicitly in §4.2a rather than left implicit.

**`match_type='tag'` no longer accepts a comma-list.** v1.0.0's `h1,h2,h3,h4` row
smuggled a mini-language into a single-value column (a reviewer flagged this as
"the first special case, already in the seed data"). Split into four rows.

Seed rows (`source_draft='eye-care-ward-end'` for all — this is the only real
Claude Design export in the repo; a reviewer confirmed this and the honest
framing, per §8, is "calibrated on n=1, not yet proven universal"):

| match_type | match_value | canonical_slot | priority | notes |
|---|---|---|---|---|
| tag | `svg` | `icon` | 30 | first `<svg>` in the item, direct child only. `icon`'s content attrs mostly carry `role='content'`/`text-content` in the real DB (no dedicated icon-media role exists) — verify the specific attr per target block at build time |
| tag | `img` | `image` | 30 | maps to attrs with `role='image-object'` (DB-verified) |
| tag | `a` | `link` | 20 | maps to attrs with `role='link-href'` (DB-verified) |
| tag | `button` | `action` | 40 | **NEW — closes a real found gap**: a "Remove"/"×" control must never be eligible for the text_leaf_longest fallback (§7's new negative control) |
| content_pattern | `^[£$€]\s?\d` | `price` | 25 | matched against `.get_text(strip=True)` of the child's OWN direct text nodes only (not descendant subtree) — case-sensitive, no normalisation beyond whitespace-strip |
| tag | `h1` | `heading` | 15 | |
| tag | `h2` | `heading` | 15 | |
| tag | `h3` | `heading` | 15 | |
| tag | `h4` | `heading` | 15 | |
| text_leaf_longest | (n/a) | `text` | 5 | lowest priority; see §4.2a for its two-phase algorithm and its text-leaf-only constraint |

Priorities are non-tied by construction (15/20/25/30/40 across the seed set), and
`price` (25) explicitly outranks `heading` (15) for the h1-contains-a-price
collision a reviewer named as a concrete real risk.

### 4.2a `classless_slot_mapper.py` — algorithm, fully specified (revised)

`classify_group_children(representative_item, group_members) -> SlotMapResult`

Two-phase, addressing the Spec-Lawyer's "undefined denominator/enumeration"
finding and the Cynic's "1.0 confidence on the worst output" finding directly:

**Phase 1 — per-child rule matching.** Enumerate DIRECT element children only
(BeautifulSoup `Tag` children; `NavigableString`/whitespace-only/`<script>` nodes
are excluded from both the child set AND the coverage denominator — named
explicitly here per the Spec-Lawyer's finding). For each child, try
`tag`/`content_pattern` rules in priority order; first match wins (ties are
impossible — priorities are unique per §4.1). A child matched by more than one
rule takes the higher-priority rule only.

**Phase 2 — `text_leaf_longest` fallback, with the fixed constraint.** Applied
ONLY to children still unmatched after Phase 1, AND only to children with NO
element children of their own (a genuine text leaf) — **this is the Cynic's fix**:
a wrapper `<div>` containing an unmapped icon+heading+body must never win
`text_leaf_longest` by virtue of containing all the text; it must itself be
`unmapped`. Among the remaining eligible unmatched leaves, the one with the most
`.get_text(strip=True)` characters gets `canonical_slot='text'`.

**One-level descent for unmapped wrapper containers (the Cynic's fix, item 2).**
If, after Phase 1+2, exactly one child remains unmapped AND that child itself has
element children (i.e. it's a wrapper, not a leaf), re-run Phase 1+2 on ITS direct
children instead, folding the results into the same `SlotMapResult` (their
`ChildRef`s point at the grandchild elements, not the wrapper). This does not
violate the "flat, 1-2 levels" scoping (§2) — it's exactly the 1-2 levels stated,
made real instead of assumed. Do not descend further than this one level; a
child still unmapped after this pass is genuinely `unmapped_children`.

```python
@dataclass
class SlotMapResult:
    slots: dict[str, ChildRef]
    unmapped_children: list[ChildRef]
    coverage: float          # RENAMED from `confidence` — mapped/total among the counted (element, non-empty) children only
    distinct_slots: int      # NEW — count of distinct canonical_slot values actually populated
```

`coverage` alone is explicitly NOT sufficient to trust a mapping (this is the
central finding of five of six reviewers) — see §4.2b for how it combines with a
second signal before anything auto-completes.

Same hard constraint as `dom_shape_classifier.py` constraint 1 (unchanged): never
fires if the item already carries any canonical SGS-BEM class.

### 4.2b Auto-complete gate — TWO independent signals, both required (NEW section)

This is the direct fix for the finding four of six reviewers converged on. v1.0.0
gated auto-complete on one number (`dom_shape_hint.confidence`, capped at 0.5 by
design, explicitly documented in `dom_shape_classifier.py` as "never ground
truth"). v2.0.0 requires BOTH of the following, named explicitly (no floor left
unstated, per the Spec-Lawyer's finding):

1. **Group-level signal** — `dom_shape_hint.confidence >= --dom-shape-min-confidence`
   (existing flag, existing meaning: "is this genuinely a repeated group at all").
2. **Item-level signal, NEW** — for the representative item's `SlotMapResult`:
   `distinct_slots >= 2` AND `coverage >= 0.6`, AND (the actual correctness check,
   not just completeness) — **cross-check against EVERY member of `group_members`,
   not just the representative one**: re-run Phase 1+2 against each sibling and
   require the SAME set of `canonical_slot` keys to be produced (allowing
   `unmapped_children` to vary in count, but not the identified slot SET) for at
   least 80% of the group. A group where members disagree on which slot is which
   (the exact "one card's price got read as its title" scenario a reviewer built)
   fails this check and the boundary reports `status: "low-consistency"`
   (§4.4), never auto-completing.

Both thresholds (`0.6` coverage, `2` distinct slots, `80%` cross-member agreement)
are named here as the STARTING floor for the n=1-draft calibration this spec is
built against (§8) — expected to be tuned once a second real draft exists, per
the Ship-PM's finding that "durable, universal" cannot be claimed from one draft.

### 4.3a `converter/services/classless_assembly.py` — content-role filtered, content-only (revised)

`assemble_classless_group_markup(group_block_slug, item_slot_maps, group_members) -> dict`
— **note the renamed function and changed signature**: it now takes the WHOLE
group (§4.3b), not one item, and returns the SAME 9+-key result dict shape
`converter/entry.py::convert_section` returns (`block_markup`, `variation_css`,
`extracted_attributes`, `attribute_gap_candidates`, `token_resolutions`,
`essence_matches`, `content_gaps`, `status`, `failure_reason`) — a reviewer found
v1.0.0's bare `-> str` signature silently dropped 8 of those 9 fields, breaking
Stage 9 reporting for every classless-path boundary.

**M1 fix (the canonical_slot-is-one-to-many defect, found independently by two
reviewers via a live DB query — `canonical_slot='heading'` on `sgs/trust-bar`
maps to 16 attrs, 15 of them styling; `sgs/card-grid`'s content attr is
`items[]`, `emit_shape='nested'`, and never appears as a `canonical_slot` match
target at all under v1.0.0's algorithm):** attribute selection is now
`WHERE canonical_slot = ? AND role IN ('text-content', 'content', 'image-object',
'link-href')` — the DB-verified content-role allowlist from §4.1 (re-verified
directly against real rows during this revision, not assumed) — never
`canonical_slot` alone. This is the single change that makes the mechanism
actually write to content attrs instead of styling attrs.

**Styling — explicitly, honestly, out of scope for v1 (NEW, closing the biggest
single finding: two reviewers independently found v1.0.0 silently produced
unstyled output and called it `status: complete`).** This assembler does NOT call
`_build_css_attrs` and does NOT read the item's inline `style=` attributes. A
classless-path completion emits real content with the block's own THEME DEFAULT
styling only (whatever `sgs/card-grid`'s own base render.php/style.css already
provides for an item with no style overrides) — it does not attempt to transfer
the draft's specific inline styling. **This is stated in the emitted result's own
`content_gaps` list** (reusing the existing field, not inventing a new one) as a
`kind: "styling-not-transferred"` entry per boundary, so Stage 9 reporting and the
audit log both see it honestly rather than it vanishing. Full inline-style
transfer for the classless path is tracked as Spec 44b (§8) — a separate,
smaller follow-up once this content-only slice is proven.

### 4.3b Group-level assembly — items[] array, not per-item blocks (NEW section, the D1071 fix)

This directly implements §3's structural fix. The recognised block is the GROUP
(`dom_shape_hint.block`, now a real DB slug per §4.0 fix 2 — e.g. `sgs/card-grid`).
There is no separate "what block is this individual item" question, because an
item is never independently recognised as its own block — it is one entry in the
group block's own array-shaped content attribute.

Mechanism: for the group's `block_slug`, find its `emit_shape='nested'` content
attribute (verify at build time via `block_attributes WHERE block_slug=? AND
emit_shape='nested'` — for `sgs/card-grid` this is `items`, confirmed live this
session). For EACH member of `group_members` (not just the representative one —
this is what actually produces N array entries, closing the Ship-PM's "nothing
covers members 2..N" finding), run `classify_group_children`, and write one
`items[]` entry per member using that item's own `SlotMapResult.slots`, keyed to
whatever field names the block's items-array sub-schema declares for each
`content_role`/`canonical_slot` pairing (this sub-schema lookup is the one
genuinely new open item for this spec, flagged honestly rather than guessed —
verify against `block_attributes`' nested-attr documentation, or the block's own
`block.json` `items` schema, at build time).

### 4.4 Wiring point (revised field reference)

`sgs-clone-orchestrator.py::stage_4_5_6_7_8_extract` — when a boundary was
admitted via `admitted_via_dom_shape_gate=True` AND its
`dom_shape_hint.source == "dom_shape:repeated_siblings"` (the real, per-classifier
field from §4.0 fix 1 — NOT `dom_shape_hint.block`, which is a group-level label
and must never be used as a routing key per §3's corrected lesson), route to
§4.2b's two-signal gate. If BOTH signals clear: call the new
`assemble_classless_group_markup` (§4.3b) instead of `converter.entry.convert_section`.
If the group-level signal clears but the item-level cross-member check fails:
report `status: "low-consistency"` (a new, distinct status from `failed` —
Stage 9 should surface this differently, since it means "we found a real
repeated group but couldn't agree on its shape," not "we found nothing"). This
remains a branch at the orchestrator/extraction layer, outside
`converter/walk.py` entirely (R-31-3 unaffected — verified independently by two
reviewers as genuinely compliant, the one part of v1.0.0's rule-compliance
argument that held).

**Setup/teardown parity (NEW — a reviewer found `convert_section` binds five
things — colour-resolution context, token-resolution context, the content-gap
collector, and two trace functions — that a bare replacement call would silently
skip):** `assemble_classless_group_markup` must call the SAME
`configure_colour_resolution_from_run` / `configure_token_resolution_from_run` /
`_gap_collector.clear()` / trace-binding sequence `convert_section` does. Factor
this into a shared context-manager helper both functions call, rather than
duplicating the five-call sequence — a duplicate WILL rot silently the next time
`convert_section` gains a sixth binding.

### 4.5 Permanent audit log — revised location, revised schema

**Location moved** (a reviewer found the v1.0.0 location — inside the plugin
source tree, git-tracked, mutated every run — fights this project's own
dirty-tree deploy gate and the "never `--allow-dirty`" rule). New location,
matching the existing `reports/visual-diff/manual-skips.log` precedent (STOP-67):
`reports/classless-recognition/log.jsonl`.

**Schema, revised to cover the actual dangerous failure mode.** v1.0.0's schema
could only ever report `unmapped_children` (an HONEST failure) — structurally
blind to a CONFIDENT WRONG mapping, which four of six reviewers named as the real
risk. New schema:

```json
{"ts": "...", "run_id": "...", "client": "...", "boundary_id": "...",
 "rule_set_version": "2026-09-14",
 "block_guessed": "sgs/card-grid", "group_confidence": 0.42,
 "item_coverage": 0.83, "distinct_slots": 4, "cross_member_agreement": 1.0,
 "slots_mapped_representative": {"icon": "svg:0", "heading": "h3:0", "price": "span:2"},
 "unmapped_children": ["div.badge-count"],
 "status": "complete", "styling_transferred": false}
```

`rule_set_version` (dedup/staleness — a reviewer found no way to tell "already
fixed by a later rule change" from "still open" across a growing log) and
`cross_member_agreement` (the actual correctness signal from §4.2b, not just
coverage) are the two fields v1.0.0 lacked.

**Traceability into the live block (NEW — a reviewer found no way to go from "a
wrong card on the live site" back to a log line without re-running the whole
clone):** `assemble_classless_group_markup` stamps an HTML comment,
`<!-- sgs:classless-origin boundary_id=<id> rule_set_version=<v> -->`, adjacent to
the emitted block markup. This is inert (WordPress ignores unknown comments) and
makes "wrong card on live site" → "log line" a single grep by `boundary_id`,
rather than a forensic reconstruction.

**End-of-run alert, extended.** Fires on EITHER `unmapped_children` non-empty OR
`cross_member_agreement < 1.0` (the case the old alert was silent on) OR any
`status: "low-consistency"` boundary. Additionally, per the Support Realist's
finding that a stdout-only alert dies with the terminal session, **also appends
one line to `.claude/parking.md`'s OPEN bucket** when any of the above fire on a
real (non-test) run — this project's own always-read-every-session channel,
rather than a second, unread log format.

## 5. What this does NOT change — unchanged from v1.0.0

- `recognise()` / `converter/recognition.py` — byte-for-byte unchanged.
- `build_block_markup()` — unchanged; the classless path never calls it.
- The existing `dom_shape`/`sc_var` eligibility gates — unchanged in their own
  logic; §4.0 adds two small, additive fields to `dom_shape_classifier.py`
  (covered under this same design-gate, not a separate silent change).
- One-off (non-repeated) classless sections — explicitly out of scope (§2, §8).

## 6. Binding-rule compliance (NEW section — the Rule-Compliance Auditor's core finding)

v1.0.0 argued R-31-2 compliance by re-scoping the rule's own wording ("true of
the function it currently governs" vs. the rule's actual text, "the only
recognition signal" — a property of the whole pipeline). The auditor correctly
called this "compliance theatre" — the rule needs amending at its source, not
argued around.

**This spec proposes amending Spec 31 §13.1 and CLAUDE.md's binding-rules list
with a new R-31-24:**

> **R-31-24 | DOM-shape recognition is a bounded, narrow SECOND signal — never a
> general alternative to R-31-2.** Permitted ONLY for: (a) a boundary carrying
> ZERO canonical SGS-BEM classes at all (any canonical class present, however
> partial, disqualifies it — `dom_shape_classifier._any_class_already_canonical`),
> (b) a genuinely repeated sibling group (never a one-off section), (c) routed
> exclusively through the Spec 44 mechanism (never inlined ad hoc elsewhere). Any
> classed node, however imperfectly classed, remains governed by R-31-2 alone.

This amendment ships in the SAME commit as `dom_shape_classifier.py`'s docstring
update (§4.0 fix 1) — the module's own "never adopt it as ground truth" constraint
2 is updated in that commit to record the bounded exception this rule creates,
with today's date and this spec's number, per this project's own discipline that
a constraint marked non-negotiable does not get silently softened.

Also newly addressed (both found as gaps by the auditor, absent from v1.0.0
entirely): **R-31-13** (Bean's visual sign-off is co-authoritative, numbers alone
never close) — §7's closing criteria now name this explicitly. **R-31-12** (QC
gates are structural — `/qc-council` via `pipeline-stage-gate.py`) — this build,
touching the converter/orchestrator, is itself the kind of change that gate is
built for; the implementation plan (next step after this spec) must route through
it.

## 7. Test plan (revised, with closing criteria named — a reviewer found v1.0.0's
closing check was an internal metric, which R-31-11 specifically excludes)

- Unit tests for `classless_slot_mapper.py`: the five proven real shapes from this
  session (ticker item, brand-tile, "why choose us" card, filter chip, basket
  line item), PLUS three NEW required negative/edge controls a reviewer built
  concretely and by name: (1) a genuinely ambiguous child → `unmapped_children`;
  (2) an item with ONE extra unmapped wrapper `<div>` around real content → the
  one-level-descent path (§4.2a) must recover the real mapping, NOT collapse to
  `{"text": <the whole wrapper>}` at coverage 1.0 (the Cynic's exact scenario);
  (3) a basket line-item whose "Remove"/"×" control must resolve to `action`
  (§4.1's new button rule), never to `text`/`title` even when it's the item's
  longest unclaimed string (the Silent-Wrongness persona's exact scenario).
- Unit tests for the §4.2b two-signal gate: a group where members disagree on
  slot assignment must produce `status: "low-consistency"`, never auto-complete.
- Unit tests for `classless_assembly.py`: assert the emitted markup round-trips
  through `check_attr_schema_conformance.py`, AND assert every `items[]` entry's
  fields land in genuine content attrs (never a styling attr — the M1 fix,
  §4.3a), AND assert the `content_gaps` entry for untransferred styling is
  present.
- Live verification against the real Eye Care Birmingham draft, with the closing
  criterion R-31-11-compliant (NOT an internal `status: complete` check alone):
  Stage 11.6 computed-parity comparison of the classless-converted boundaries
  against the draft's own rendered content (text/structure only, given styling
  is explicitly deferred — §4.3a), PLUS Bean's own visual sign-off per R-31-13
  before this spec is considered proven, not just built.
- Confirm the existing 414-attribute/17-complete-block BEM baseline is exactly
  unchanged (nothing in this spec touches the BEM path).
- Confirm the audit log (new location, new schema), the traceability comment, and
  the `parking.md` append all fire on that real run.

## 8. Explicitly deferred (tracked, not built here)

- **Spec 44b — inline-style transfer for the classless path.** Once this
  content-only slice is proven against a real draft, extend
  `classless_assembly.py` to read each item's inline `style=` and lift it into
  the block's styling attrs, closing §4.3a's stated gap.
- One-off classless sections (heading-only, button-only, landmark-only hints).
- An AI fallback (Tier-B-style) for children no deterministic rule can label —
  depends on the still-open Anthropic API-key decision.
- Calibrating `classless_slot_rules` against a SECOND real Claude Design draft
  (the Ship-PM's finding: this spec is proven against n=1 and should not be
  called universal until it runs clean against an independently-produced draft).
- A rotation/archival policy for `reports/classless-recognition/log.jsonl` once
  it's grown large enough to matter (the Support Realist's + Cynic's finding) —
  revisit using the same auto-sweep pattern `decisions-sweep-auto.py` already
  implements for `decisions.md`, once real growth data exists.
