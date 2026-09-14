# Spec 44 — Classless Repeater Recognition

**doc_type:** spec
**spec_id:** 44
**spec_version:** 3.0.0
**Status:** REVISED after TWO adversarial council rounds (v1.0.0 NO-GO six
reviewers; v2.0.0 NO-GO four reviewers) — not yet built
**Date:** 2026-09-14

## 0. Revision note (read first — this version is smaller, not bigger)

v1.0.0 proposed a from-scratch recognition + assembly engine. Six independent
reviewers found real defects. v2.0.0 fixed those defects but, in doing so,
independently reinvented (worse, and incompletely) an existing mechanism this
revision only discovered during v2.0.0's own second-round review: `array_content.py`
already lifts a repeated group's individual fields (icon, title, link, etc.) using
a tag-shape match that requires **no CSS class at all** for most of its tiers —
it just never gets a chance to run on a classless group today, because the
function that DETECTS a repeated group in the first place (`_find_item_nodes`)
still requires a shared BEM class token to find the group.

**v3.0.0's entire design is therefore much smaller: bridge dom_shape's classless
group detection (already built, proven live this session — 13 real groups found)
to the EXISTING per-field lift machinery in `array_content.py` (already built,
already tested, already handling the classless-tag-shape case for BEM-detected
groups) — instead of building a second, parallel lift engine.** This isn't a
smaller ambition, it's a more accurate diagnosis: most of what v1.0.0/v2.0.0
tried to build already exists.

## 1. Problem (plain English) — unchanged

Claude Design drafts carry zero CSS classes. `/sgs-clone`'s recognition is
class/tag driven. A repeated group of classless content (ticker badges, brand
tiles, "why choose us" cards, filter chips, basket line items) is invisible to
the converter today — `dom_shape_classifier.py` (built this session) correctly
guesses "this is probably a repeated group" from sibling shape alone, but
nothing downstream can turn that guess into real, individually-labelled content.

**Goal:** unchanged — a genuinely unedited Claude Design export clones correctly
with zero manual fixes, durably, for repeated groups.

## 2. What already exists (verified this session, not assumed)

- `dom_shape_classifier.py::classify_repeated_siblings` — detects a repeated
  sibling group structurally, no classes needed. Ships a confidence-capped
  `Hint`. **Already proven live**: 13 real groups found against the Eye Care
  Birmingham draft.
- `converter/resolvers/array_content.py::lift_array_content(node, slug, media_map)`
  — the REAL, shipped array/repeater lift mechanism (Spec 31 FR-31-2.5/FR-31-2.5a,
  landed D258). Two parts:
  1. `_find_item_nodes(node)` — finds the repeated group by requiring ≥2
     direct-sibling elements sharing a BEM element token. **This is the ONLY
     part that's classless-blind** — verified by direct read: `tok = _bem_token(kid)`
     and a `None` token is skipped entirely from grouping.
  2. `_lift_item(item_node, schema, media_map)` via `_match_child(...)` — a
     6-tier match ladder (L1 exact canonical-slot → L1b BEM-segment →
     L2 role-fallback → **L1c flat-item self-extraction** →
     **L1d leaf-item text self-extraction** → **L3 tag-shape identity**).
     **The last three tiers (L1c/L1d/L3) already require NO BEM class at all**
     — verified by direct read of `_match_child`: L3 matches a child's bare
     TAG identity (`<svg>`, `<img>`, `<a>`) against the field's own declared
     identity via `db_lookup.atomic_tag_map()`; L1d matches a plain-text leaf
     item's own text; L1c self-extracts from a single-element flat item. This
     is precisely the tag/leaf-text matching v1.0.0 and v2.0.0 each tried to
     rebuild from scratch.
  3. `array_item_schema` (DB table, real rows verified: `sgs/card-grid`'s
     `items` array has real fields `title`/`subtitle`/`badge`/`media`/`link`/
     `linkTarget` with real `role` values, `field_order` 0-11) — the item
     SIGNATURE FR-31-2.5a already scores candidate groups against, rejecting a
     non-matching group rather than blindly accepting it. **This is the exact
     "does this group's shape actually match a real block" identity-validation
     check that v1.0.0/v2.0.0 both lacked** — it already exists, already ships,
     already enforces "reject below threshold, pick best signature match, never
     blindly accept" (FR-31-2.5a bindings 1-3).

## 3. The mechanism — bridge, don't rebuild

### 3.1 New function — `converter/resolvers/array_content.py::_find_classless_item_candidates`

A NEW, small, additive function alongside `_find_item_nodes` (same file — this
IS the file that owns array-item detection; adding a classless detection path
here is the correct home, not a new module). Signature:

```python
def _find_classless_item_candidates(
    node: Tag, dom_shape_group: list[Tag]
) -> list[Tag]:
```

Takes the SAME sibling group `dom_shape_classifier.classify_repeated_siblings`
already detected (its underlying group members — the classifier's `Hint` only
returns a summary; the group MEMBERS themselves are available from
`repeated_sibling_detector.detect_repeater_groups`, which `classify_repeated_siblings`
already calls). Returns those elements as item-node candidates directly — no
new detection logic, this function's only job is handing dom_shape's
already-detected group into the shape `_lift_item`/FR-31-2.5a already expect
(a `list[Tag]`, the same shape `_find_item_nodes` returns as `best`).

### 3.2 Wiring — `lift_array_content`, one new branch

`lift_array_content(node, slug, media_map)` currently calls `_find_item_nodes(node)`
to get `(items, below_threshold)`. New logic: when `_find_item_nodes` returns
EMPTY (no BEM-token group found) AND the caller supplies a dom_shape-detected
classless group for this boundary (threaded through from the orchestrator — see
§3.4), call `_find_classless_item_candidates` instead, producing the same
`items: list[Tag]` shape. **Everything downstream is completely unchanged** —
`_item_field_schema(slug, array_attr)`, the FR-31-2.5a signature-scoring, and
`_lift_item`'s L1c/L1d/L3 tiers all run exactly as they do for a BEM-detected
group, because they already don't require BEM tokens for those tiers.

**Identity validation is inherited, not invented.** FR-31-2.5a's existing
binding (§13.3, Spec 31) — "a candidate repeating group is the array only when
its items' children match the expected field roles above a threshold" — applies
unchanged to a classless-sourced candidate group. If a classless group's shape
doesn't score well against ANY registered block's `array_item_schema`, it is
rejected by the SAME mechanism that already rejects a badly-shaped BEM group —
not by a new, separately-invented confidence number. This directly closes the
identity-validation gap both prior council rounds found (v1.0.0: no identity
check at all; v2.0.0: a two-signal gate that validated internal consistency but
never validated the group's identity against a real block schema).

### 3.3 Which real registered block, if not `dom_shape_hint.block`?

`dom_shape_classifier.classify_repeated_siblings`'s own guess (`"card-grid"`,
soon `"sgs/card-grid"` per §4 fix 1) is used ONLY as the FIRST CANDIDATE to try
— never adopted directly as ground truth (this is the actual fix for the
D1071-shaped conflation both prior versions mishandled; see §5 for the
corrected citation). `lift_array_content` is tried against `dom_shape_hint.block`
first; if FR-31-2.5a's own signature-scoring rejects it (below threshold), the
mechanism tries every OTHER registered block whose `array_item_schema` has at
least one populated content-bearing field (a small, bounded candidate set —
verified this session: 5 blocks carry real `array_item_schema` rows), picking
the best-scoring one per FR-31-2.5a binding 2, or reporting `status: "unrecognised"`
(the existing, honest, already-wired failure mode) if nothing scores above
threshold. **A group-level guess is now a candidate to verify, never an
identity to assume** — closing the conflation structurally, the same way §4.3b
of v2.0.0 intended, but by reusing FR-31-2.5a instead of inventing a parallel,
weaker version of it.

### 3.4 Orchestrator wiring — unchanged shape from v2.0.0, smaller payload

`sgs-clone-orchestrator.py::stage_4_5_6_7_8_extract` — when a boundary was
admitted via `admitted_via_dom_shape_gate=True` and its
`dom_shape_hint.source == "dom_shape:repeated_siblings"` (§4 fix 2 — the
per-classifier field, same fix v2.0.0 specified), call the existing
`converter.entry.convert_section` path UNCHANGED, but thread the dom_shape
group's member elements through to `lift_array_content` via §3.2's new branch,
rather than routing to a wholly separate assembly function. **This is smaller
than both prior versions' §4.4**: no new result-dict shape to match (the
existing `convert_section`/`build_block_markup` path already returns the full,
correct 9-key shape, because it's the SAME path, just with one new item-detection
branch inside it), no separate setup/teardown parity concern (there's only one
call path now, not two).

### 3.5 Styling — same honest deferral as v2.0.0, now genuinely smaller in
scope

`array_content.py`'s lift is content-only by design (it feeds into
`build_block_markup`'s existing content pass; CSS/styling for a recognised
block still comes from `build_block_markup`'s separate `_build_css_attrs`
call, which a classless-sourced group gets for FREE once it's routed through
the same `build_block_markup` path — this was the single biggest gap in
v1.0.0/v2.0.0's separate-engine designs, and it disappears entirely by
bridging into the existing path instead of building a parallel one). The
draft's specific inline `style=` values are still not transferred (same
honest gap as v2.0.0 §4.3a) — but the block's OWN normal styling machinery
(spacing, colour, layout attrs) now applies exactly as it does for any other
recognised block, which v1.0.0/v2.0.0 never had.

## 4. Prerequisite fixes to already-shipped code (unchanged from v2.0.0,
independently re-verified this round)

1. **`Hint.source` per-classifier** (`dom_shape_classifier.py`) — confirmed
   still needed; unchanged from v2.0.0 §4.0 fix 1.
2. **`classify_repeated_siblings`'s bare `"card-grid"` → DB-verified
   `"sgs/card-grid"`** — unchanged from v2.0.0 §4.0 fix 2. Round-2 council
   flagged this makes `Hint.block` inconsistent with sibling Tier 0/1
   producers (`lingua_franca.py`, `sc_var_haiku_batch.py`) that still emit bare
   slugs — noted honestly as a real, currently-unresolved inconsistency across
   the wider hint ecosystem, out of THIS spec's scope to fix universally, but
   flagged for a future cross-cutting cleanup (not silently ignored).
3. Both fixes still ship in the same commit as the docstring update (§6).

## 5. The corrected D1071 account (fixed properly this time)

D1071's own final word (its step 4, headed "Root-caused properly", quoted here
verbatim, in full, not the superseded step-2 intermediate diagnosis both prior
versions of this spec mistakenly cited): *"the injection itself was the ONLY
problem. The 17 real 'complete' results were `sgs/button` — the converter's OWN
internal atomic-tag recognition, working correctly once merely LET THROUGH the
eligibility gate, needing no injected identity at all. Removed the injection
entirely (kept the eligibility gate, source-agnostic) and reverted the Stage
2/Stage 4 `sc_var_count` exclusion. Re-ran: back to 414 attrs / 17 complete,
this time without the regression risk."*

**The real, final lesson: eligibility alone (no identity injected, no identity
assumed) was always safe; the converter's OWN existing recognition machinery
handled it correctly once simply let through.** This spec's §3.2-3.3 design is
now a direct structural echo of that lesson, not a contradiction of it:
classless content is let through to the EXISTING lift machinery (never an
injected/assumed identity), and that existing machinery's own FR-31-2.5a
signature check does the validating — the same shape as "the converter's own
atomic-tag recognition handled it correctly," just for repeated groups instead
of atomic tags.

## 6. Binding-rule amendment — corrected number

Previous draft proposed "R-31-24," which collides with an existing `FR-31-24`
(content-role vocabulary, Spec 31 §13.7.1) — a real numbering error, caught in
round 2. Spec 31's actual `R-31-N` series runs R-31-1 through R-31-15 (verified
directly against CLAUDE.md's binding-rules list and Spec 31 §13.1's
machine-readable `binding_rules:` front-matter). **Corrected number: R-31-16.**

> **R-31-16 | DOM-shape recognition is a bounded, narrow SECOND signal for
> repeated-group detection only — never a general alternative to R-31-2.**
> Permitted ONLY for: (a) a boundary carrying ZERO canonical SGS-BEM classes at
> all, (b) a genuinely repeated sibling group (never a one-off section), (c) an
> item shape that clears FR-31-2.5a's existing signature-match threshold
> against a real block's `array_item_schema` — never adopted as ground truth
> from the group-level shape guess alone. Any classed node, however imperfectly
> classed, remains governed by R-31-2 alone.

Ships in the same commit as: `dom_shape_classifier.py`'s constraint-2 docstring
update (recording this bounded exception, dated, against this spec number),
CLAUDE.md's binding-rules list, and Spec 31 §13.1's `binding_rules:`
front-matter list (the machine-readable one — updating only the prose and
missing the front-matter was the exact gap round 2 found in "the amendment
isn't real until the machine-readable list matches too").

## 7. Test plan

- `_find_classless_item_candidates`: fixtures for the five proven real shapes
  (ticker, brand-tile, "why choose us" card, filter chip, basket line item),
  asserting each produces the same `list[Tag]` shape `_find_item_nodes` would.
- `lift_array_content`'s new branch: assert a classless group correctly lifts
  via L1c/L1d/L3 (already-tested tiers — add classless-sourced test cases
  alongside the EXISTING `array_content.py` test suite, not a new parallel
  suite), including the negative control both prior rounds required: a
  classless group whose shape doesn't clear FR-31-2.5a's threshold against ANY
  registered block → `status: "unrecognised"`, never a guessed identity.
- The basket line-item "Remove"/"×" control — verify it does NOT get
  misidentified as a title/text field under the existing L1d leaf-text tier
  (walk this concretely against `_match_child`'s real tier order at build
  time; if L1d's leaf-text tier is too permissive for an action button, this
  is a real finding to fix in the EXISTING shared function, benefiting every
  caller, not just the classless path).
- Live verification against the real Eye Care Birmingham draft: confirm the
  414-attribute/17-complete-block BEM baseline is UNCHANGED (this bridge adds
  a detection branch, doesn't touch the BEM path), and confirm at least the
  proven-shape groups (ticker/brand-tile/cards/chips/basket-items) now lift
  real content AND real styling (not content-only — §3.5's structural fix).
- Stage 11.6 computed-parity + Bean's visual sign-off (R-31-13, cropped-pair
  artefact) before this spec is considered proven, not just built — unchanged
  requirement from v2.0.0.

## 8. Phased delivery (per round-2 Ship-PM recommendation, adapted to the
smaller v3.0.0 scope)

**Phase 1** — the two `dom_shape_classifier.py` prerequisite fixes (§4) + the
R-31-16 amendment (§6, all four files in one commit). Standalone value
regardless of the rest of this spec; discharges existing D1066 debt either way.

**Phase 2** — `_find_classless_item_candidates` + the `lift_array_content`
branch (§3.1-3.2) + full test suite (§7), run behind the EXISTING
`--dom-shape-min-confidence` flag (still opt-in, still off by default) — no new
flag needed, unlike v2.0.0's proposed separate auto-complete switch, because
there's no separate trust decision left to make: FR-31-2.5a's existing
threshold IS the trust gate, already proven in production for the BEM path.

**Phase 3** — live verification + Stage 11.6 + Bean sign-off against the real
draft, closing the spec.

## 9. Explicitly deferred

- One-off (non-repeated) classless sections.
- An AI fallback for groups FR-31-2.5a rejects against every candidate schema.
- Calibrating against a second real Claude Design draft (this spec is still
  proven against n=1 for the classless-specific bridging logic, though the
  machinery it bridges into — `array_content.py` — is already proven across
  many real BEM drafts).
- The wider `Hint.block` bare-vs-namespaced-slug inconsistency across
  `lingua_franca.py`/`sc_var_haiku_batch.py`/`dom_shape_classifier.py` (§4
  item 2) — a real, separate cleanup, out of this spec's scope.
