# Spec 45 — Classless Field Resolution

**doc_type:** spec
**spec_id:** 45
**spec_version:** 1.6.0
**Status:** CODE-COMPLETE — all four tiers built + qc'd (D1087), through THREE `/qc-council`
empirical-validation rounds plus one Bean-directed data-grounding pass
(§0.4). Round 1 found real defects in both Tier 3 and Tier 4, fixed
(v1.3.0). Round 2 verified Tier 4's fixes correct but found Tier 3's round-1
fix did not actually work — redesigned, not re-patched (v1.4.0: new
array-field-identification step, bounded candidate set, raw-hit scoring).
Round 3 found the raw-hit scoring rule STILL carried the same bias in a new
form (a value-shape wildcard let attribute-rich candidates win by volume) —
both round-3 validators independently converged on the same fix, applied in
v1.5.0 (§0.3): scoring now counts EXACT field-name matches only;
role/value-shape matching still exists but only for placing fields after a
candidate is already chosen, never for choosing between candidates. Also
fixed in v1.5.0: a proposed DB remedy that would have caused a real
regression (collapsing two semantically opposite roles), a routing bug that
sent plain scalar fields to the wrong tier, and a naming collision between
two same-named "Step 0"s. **v1.6.0 (this revision)** closes four real gaps
Bean found by direct DB inspection — a nonexistent `container_kind` filter
never actually proposed but pre-empted, orphaned `block_composition` rows
for deleted blocks, two blocks whose `accepts_allowed_blocks` value is
simply wrong (no InnerBlocks mechanism exists on them at all), a Step 0
check too narrow to use the DB's own richer per-slot signal, and the
classed path's proven `sgs/container` fallback not yet reused for Tier 3's
unrestricted-parent case. Per this project's own qc-council iteration-cap
discipline (two reconvenings before escalating), a further automated
validation round should not run without checking in first — see the end of
this session's conversation for that checkpoint. NOT yet built.
**Date:** 2026-09-16

## 0.4 What changed since v1.5.0 — Bean's direct-DB-inspection findings

Bean, working from real product knowledge of the block library rather than
council process, independently found four real defects in Tier 3 by
querying `blocks`, `block_composition`, and `block_attributes` directly.
Every claim below was re-verified against the live DB and the real block
source files before being accepted — none were taken on Bean's word alone,
per this project's standing fact-check mandate.

1. **`block_composition` carries orphaned rows for deleted blocks.**
   `sgs/adaptive-nav` and `sgs/mobile-nav` have no row in `blocks` at all
   (both fully removed) and no source directory — yet `block_composition`
   still carries rows for them, plus 5 more orphans (`sgs/content-collection`,
   `sgs/divider`, `sgs/mega-menu`, `sgs/mobile-nav-toggle`, `sgs/nav-menu`).
   Nothing in the schema or the `/sgs-update` seeder removes a
   `block_composition` row when its block is deleted; `blocks.is_stale`
   exists but is 0 for all 209 rows, so it is not being used as that
   cleanup signal today. §9.2 is fixed to require every candidate to
   resolve to a real, current `blocks` row before it can enter the
   candidate set.
2. **`accepts_allowed_blocks` is factually wrong for two real, current
   blocks.** `sgs/product-card` and `sgs/team-member` both have a non-empty
   `accepts_allowed_blocks` list, but both blocks' OWN code states plainly
   that they have no InnerBlocks slot at all — product-card's `block.json`
   description: "Typed mode = built-in elements authored directly from
   block attributes (no InnerBlocks)"; team-member's `save.js`: "pure typed
   leaf, no InnerBlocks." Both compose their entire content through
   `block_attributes.canonical_slot`/`role`, not through child blocks. This
   is not stale data (the blocks are real and current) — the column itself
   was seeded wrong for these two rows. Spot-checked the other 18
   real-allow-list blocks: all 18 genuinely render `<InnerBlocks>` in their
   own `edit.js`. §9.2 is fixed to cross-check `accepts_allowed_blocks`
   against real InnerBlocks usage before trusting it, rather than taking
   the column at face value.
3. **Step 0 (§9.1) was narrower than the DB's own signal.** It checked only
   a single exact `attr_name` match. `block_attributes.canonical_slot`
   already groups multiple attributes under one named slot per element
   (verified on `sgs/product-card`: the `button` slot alone carries
   `ctaText`/`ctaUrl`/`ctaBorderStyle`/etc; `sgs/team-member`'s `image` slot
   carries `photo`/`photoTablet`/`photoMobile`) — a stronger, already-DB-
   grounded signal for "does this parent already have a place for content
   shaped like X" than a single-name check. §9.1 is widened to scan the
   parent's full canonical_slot set, not just one attribute name.
4. **The classed path's proven `sgs/container` fallback was never reused
   for Tier 3's unrestricted-parent case.** Confirmed live in
   `converter/db/db_lookup.py` and `converter/services/extraction.py`: the
   BEM-classed walker already has a real, working fallback — an
   unresolved child under a permissive parent (`accepts_allowed_blocks IS
   NULL`, 196 of 216 rows) recurses as a default `sgs/container` rather
   than gapping. Tier 3 v1.5.0 had no equivalent — an unrestricted parent
   with no un-matched array attribute of its own hit the "empty candidate
   set → gap" branch (§9.2) even though the classed path would never gap
   there. §9.2 now names this fallback explicitly as a fifth candidate-set
   source, reusing the classed mechanism rather than inventing a new one.

(Bean's suggestion of a `container_kind`-based filter for narrowing Tier
3's candidate search was checked and found unsound before being adopted —
5 of the 20 real-allow-list blocks have `container_kind = NULL`, so
filtering on it would have wrongly excluded them. No such filter was ever
in the spec, and none was added.)

## 0.3 What changed since v1.4.0 — round 3 qc-council findings

Two validators independently re-traced the v1.4.0 raw-count scoring rule
against the same real blocks and the same brand-logo negative control round
2 used. Verdict: the array-field-identification step (§4.1.0) and the
bounded candidate set (§9.2) are sound and were NOT redesigned again — both
validators confirmed them correct. But §9.3's scoring rule reproduced the
exact same false positive as round 2, in a new form: it counted a
value-shape/role match (e.g. "any plain string matches any `text-content`-role
field") toward candidate selection, and that check is a wildcard — a
candidate merely declaring a generic content-bearing role scores a hit for
every plain-string field regardless of relevance, so attribute-rich
candidates still won by volume (traced: the wrong candidate scored 4 raw
hits against the correct candidate's 3, reproduced independently by both
validators). The bias had moved from the percentage's denominator (v1.3.0)
to the raw count's numerator (v1.4.0's first draft) — same defect, different
location.

**Fixed in this revision, not re-patched a third time in the same shape:**

1. **§9.3's `hits()` now counts EXACT field-name matches only.** Role/
   value-shape matching (§4.1.0 point 3's Step 2) is removed from selection
   entirely — it still exists, but only to place remaining fields AFTER a
   candidate has already been chosen by exact-name evidence. This closes the
   wildcard: a candidate can no longer score a hit merely by declaring a
   generic content-bearing role.
2. **A counting-domain rule added** — `hits()` is computed over one
   representative unit (a single object's fields, or an array's first item),
   never summed across every array item, closing a round-3-found ambiguity
   where an array candidate could accumulate hits per-repetition and win on
   volume alone.
3. **The DB role-vocabulary remedy was WRONG and is corrected.** The
   originally-proposed fix (rename `array_item_schema`'s divergent role
   spellings to match `roles.role_name`) would have collapsed
   `state-modifier-boolean` into `presence-boolean` — two roles the real
   extractor code (`field_extractors.py`) treats as semantically opposite.
   Applied as proposed, every pack-size pill in a real clone would have
   rendered as "selected." The correct fix — add the three missing role names
   to `roles` as `content-bearing`, rather than renaming anything in
   `array_item_schema` — requires zero change to any live extraction path.
4. **§4.1.0's no-match routing was unconditional; now shape-gated.** A field
   that isn't a known array attribute by name AND isn't nested-object-shaped
   was being routed to Tier 3 regardless — contradicting Tier 3's own
   condition (§9), which only ever accepts nested values. Now explicit: a
   non-matching scalar field falls through to Tier 2 as ordinary content,
   never to Tier 3.
5. **The "two Step 0s" naming collision resolved.** §4.1.0's step is renamed
   "Step A"; §9.1 keeps "Step 0" (no longer ambiguous). A one-sentence
   normative execution order is now stated in §4.1.0 itself.

Full validator transcripts: this session's conversation history (2026-09-15,
round 3, two independent `/qc-council` validators). No separate report file
yet.

## 0.2 What changed since v1.3.0 — round 2 qc-council findings and the Tier 3 redesign

Two validators independently re-traced the v1.3.0 fixes. Tier 4: **verified
correct** on the load-bearing check (the CTA plumbing fix genuinely has live
DOM access at all three real call sites), with two small landing gaps closed
in this revision (§10.1's self-test repoint, §10.3's now-real Spec 44 §7
amendment — see `.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md` §7,
edited alongside this revision).

Tier 3: **the v1.3.0 fix did not work.** Hand-traced against the same 14 real
`array_item_schema` groups the round-1 disproof used: the "corrected
denominator" changed the pass/fail outcome on **zero of 14** — `sgs/card-grid.items`
is still 33.3%, because none of that block's item field keys collide with its
own attribute names (the exclusion clause had nothing to exclude). Worse, a
constructed negative control (a brand-logo object scored against the wrong
candidate) moved from a correctly-rejected 50% to an incorrectly-accepted
75-100%, because excluding a candidate's own styling-attribute names from the
denominator systematically rewards attribute-RICH candidates — the opposite
of a correctness signal. Separately, the validator proved a deeper bug: the
`items` field itself was structurally unreachable by EITHER tier as worded —
Tier 1 requires the field to sit "inside" an array attribute (never the array
field itself), and Tier 3's own-attribute check requires `attr_type='object'`
while every real `array_item_schema` array attribute is `attr_type='array'` —
zero overlap, confirmed by direct query. v1.3.0's reassurance that
`sgs/card-grid.items` was "already handled upstream" was therefore false.

**Redesigned, not re-patched, in this revision:**

1. **New §4.1.0** — an explicit step that was missing from both prior
   revisions: recognising which draft field IS a known array attribute, by
   exact key-name match only. This closes the structural hole the validator
   found. When no exact match exists, the field is NOT assumed to be a
   generic child block guess — it becomes a candidate in Tier 3's own scoring
   (§9.3), on equal footing with real allow-listed children, since both are
   the same shape of ambiguity (content whose identity must be inferred).
2. **§9.2 rewritten** as one bounded-candidate-set rule (the parent's own
   un-matched array attributes UNION its real allow-list) rather than a
   three-way branch on `accepts_allowed_blocks` alone — closing the false
   "already handled upstream" reassurance properly instead of restating it.
3. **§9.3's scoring rule replaced entirely** — a raw content-hit count with a
   fixed evidence floor (≥2 hits) and a strict margin (no tie), never a
   percentage. A ratio's denominator can always be gamed by how "eligible"
   fields are defined; a raw count with a floor and a margin cannot be
   inflated by a candidate's own attribute richness. This is a genuinely
   different mechanism, not a reworded version of the same one.
4. **A real DB data-quality gap named as a build prerequisite** (§4.1.0 point
   2): `array_item_schema.role` and `roles.role_name` use non-overlapping
   spellings for the same concepts (`url-href` vs `link-href`, `icon-slug` vs
   `icon`, `state-modifier-boolean` vs `presence-boolean`). This silently
   breaks role-based matching for both Tier 1 and Tier 3 today. Flagged as a
   required `/sgs-update` seeder fix (align the data at the source, per
   R-31-1), not a spec-side workaround.

Full validator transcripts for both rounds: this session's conversation
history (2026-09-15, two `/qc-council` runs). No separate report file yet —
flagged here so a future pass can extract one if these findings need
re-citing outside this conversation.

## 0.1 What changed since v1.2.0 — the qc-council findings and fixes

Two validators independently hand-traced Tier 3 and Tier 4 against real DB
rows and real code (not hypothetical input). Both tiers had genuine,
code-confirmed defects:

**Tier 3 (§9):**

1. **The `>50%` match score divided by the wrong denominator.** v1.2.0 scored
   content-matches against EVERY field the draft wrote, including
   styling-named fields (`level`, `variant`, `align`) that could never match.
   Tested against the framework's own 14 real `array_item_schema` groups:
   13 of 14 failed the bar, including `sgs/card-grid.items` — this spec's own
   worked example (33%). Fixed in §9.3: the denominator is now only fields
   that survive §4.0's pre-filter AND aren't already claimed by one of the
   candidate's own non-content-bearing attributes.
2. **The content-bearing role set was cited wrong.** v1.2.0 said "5 roles";
   the live `roles` table has 17 rows classified `content-bearing`. Corrected
   in §4.2 and §9.3.
3. **§9.1's own-attribute check had no role filter**, so a name match could
   write drafted content into a styling attribute (`gap`, `columns`, etc.) —
   explicitly out of scope per §2. Fixed: Step 0 now only matches
   content-bearing-role object attrs.
4. **The gap-on-unrestricted-parent rule (§9.2) is kept, but now justified
   correctly, not by assertion.** The validator found 25 blocks with
   `accepts_allowed_blocks = None` that genuinely take children — including
   `sgs/card-grid`. But Tier 3's own condition already excludes any field
   Tier 1 already resolved via `array_item_schema` — and `sgs/card-grid.items`
   IS one of Tier 1's 14 covered pairs. So the real remaining gap is narrower
   than it first looked: a field on an unrestricted parent that ISN'T that
   parent's own known array attribute. §9.2 now says this explicitly, rather
   than implying broad coverage.

**Tier 4 (§10):**

1. **The CTA disambiguation fix was not buildable as described.**
   `classify_button_shaped(element)` receives one flattened element with its
   children already discarded — no sibling/count data reaches it anywhere in
   the real call chain. Fixed in §10.1: the signals are now computed once, at
   the point the real DOM element is still available
   (`_bs4_to_dom_dict`), and baked into the element dict — no signature
   widening, no `siblings` forwarding needed.
2. **The header/footer fix only handled 2 of 3 real keys** — a bare `<nav>`
   would have silently remapped to `sgs/site-header-row`. Fixed: `nav` is
   removed from the remap entirely (3 real nav-block candidates, no signal to
   choose between them — gaps rather than guesses, same discipline as
   everywhere else in this spec).
3. **The review-gate reuse claim was actually unsafe.** §7's mechanism only
   has a trigger for "a group Spec 44 already created a review entry for" —
   Tier 4 items have none. Worse: writing into the SAME
   `classless-recognition-log.jsonl` that FR-44-1(b) reads for its per-client
   promotion memory risked either silently breaking Tier 4's "never
   auto-completes" promise, or letting a low-confidence Tier-4 guess satisfy
   Spec 44's own trust gate for an unrelated real group. Fixed in §10.3: Tier
   4 creates its own review entry when no Spec-44 entry exists, and every
   Tier-4 log row carries an explicit `source` discriminator that FR-44-1(b)'s
   scan must filter out — the two systems can no longer read each other's
   rows.

Full validator transcripts: this session's conversation history
(2026-09-15 `/qc-council` run). No separate report file — flagged here so a
future pass can write one if these findings need re-citing.

## 0. What changed since v1.0.0 (read this first)

v1.0.0 went through a 5-persona `/adversarial-council` round (Cynic,
Spec-Lawyer, Ship-PM, a dedicated Fact-Auditor, Support Realist) explicitly
briefed to ground every finding in a real code/DB check, not a plausible
assumption — after a standing concern that recent councils on this project had
produced findings based on unverified priors. Every load-bearing MUST-FIX below
was independently re-run against the live database and source after the
council returned, before being accepted. Real numbers:
`.claude/reports/2026-09-15-spec45-field-mapping-verification.md`.

**What was genuinely wrong, confirmed:**

1. **Tier 3's worked example was impossible.** §4.3 (v1.0.0) said
   `nested_attr_named()` could match "a tier-object box attribute". Verified:
   all 237 box-family attributes have `emit_shape = NULL`; the function only
   ever matches `emit_shape = 'nested'`. It structurally cannot return what the
   example described. Fixed by removing Tier 3 from this build pass entirely
   (§9) rather than patching a false example.
2. **§4.3 inverted its own §3's priority order.** v1.0.0 said the nested-attr
   pre-empt "runs first, unconditionally". The real code
   (`extraction.py:1234-1238`) runs it fourth, and skips it entirely when G1
   already matched. §3 below states the verified order; the inconsistent §4.3
   is removed with Tier 3.
3. **Tier 4 was not "reused as-is."** v1.0.0 claimed `dom_shape_classifier.py`
   resolves fields. Verified: it has exactly four classifiers, each returning a
   bare block-name guess (`hero`/`cta`/`header`/`footer`/`card-grid`), zero
   field-resolution logic, and it operates on DOM elements — it cannot be
   applied to a JS-object field at all. Tier 4 is deferred (§9), not built as a
   free-reuse tier.
4. **The ~60% match-rate figure was measured against the wrong denominator.**
   It was computed against ALL 1958 canonical_slot-bearing attributes (84
   distinct slots), a third of which are styling/behaviour slots this spec
   puts out of scope. The genuinely content-bearing subset is 217 rows (11 of
   the 1958) — see §4.2 and the verification report.
5. **Three file citations were wrong.** `sc_var_classifier.py` and
   `dom_shape_classifier.py` were cited at `converter/services/`; both actually
   live in `recogniser/`. Corrected throughout.
6. **No named gap destination, no rollout flag, no test plan, no answer to the
   Spec-44-trust-gate interaction question.** All four added below (§6, §7,
   §8).

**What survived verification and stayed:** §3's description of the real
BEM-classed priority chain was checked line-for-line against
`extraction.py::_try_route_generic_child_once` and found accurate — this is
the part of v1.0.0 that was genuinely root-caused, not assumed, and it is
unchanged in this revision.

## 1. Relationship to Spec 44 (unchanged from v1.0.0, one correction)

This spec is separate from, and depends on the output of, Spec 44
(`.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md`). It is not a v3 of that
spec. The two solve different problems:

| | Spec 44 | Spec 45 (this doc) |
|---|---|---|
| **Question answered** | Given a repeated, classless group, WHICH SGS block does it become? (group/block IDENTITY) | Given a classless item whose parent block identity is already known, WHICH of that block's own attributes/array-fields does EACH field become? (FIELD mapping) |
| **Input** | A draft's `<sc-for>` group + its page/parent context | A resolved parent block slug (from Spec 44) + the field to place |
| **Scope boundary it owns** | Repeated groups + their known-composite parents ONLY (Spec 44 §2 — corrected from v1.0.0's "repeated groups only", which dropped the "known-composite parents" clause) | Repeated-group scalar/array fields where the parent identity is already resolved (Tiers 1-2, §4). Nested-child and one-off content are deferred, not built here (§9) |

**Why two specs, not one.** Spec 44's scope was hardened through multiple
council rounds; folding field-mapping into it would re-litigate settled
boundaries for no benefit. Spec 45 treats Spec 44's resolved block slug as an
input, the same way a downstream spec can depend on an upstream one without
merging into it.

## 2. Problem (plain English)

Spec 44 answers "is this repeated card-grid actually `sgs/card-grid`?" — it
does not answer "which JS field in each card object becomes the card's title,
which becomes the badge?" Today, once a classless group/element's block
identity is known, nothing in the pipeline maps its individual fields to that
block's real attributes. `array_content.py::lift_array_content()` does this
job for BEM-classed repeaters (matching draft CSS classes against
`array_item_schema`); a classless draft has no CSS classes for it to match
against.

## 3. Grounding — the real classed-path mechanism this mirrors

Verified this session by direct read of `extraction.py::_try_route_generic_child_once`
(lines 1179-1273), cross-checked a second time during the council's
Fact-Auditor and Ship-PM passes, and a third time independently after the
council returned. All three reads agree on this order:

1. Extract BEM `__element` token from the child's class list.
2. **G1** `db_lookup.py::child_block_for_parent_token(rec.slug, element)` —
   parent-scoped, primary. If it hits, `via_parent_token = True`.
3. **G-resolve** `db_lookup.py::resolve_slug_from_bem(csgs)` — global alias
   fallback, only tried if G1 missed.
4. **G-atomic** `converter/recognition.py::recognise(child)` bare-tag fallback
   (`<p>`→`sgs/text`, `<h2>`→`sgs/heading`), only tried if still missing.
5. **Nested-attr pre-empt** — `db_lookup.py::nested_attr_named(rec.slug,
   element)`, gated `if (not via_parent_token and element)`. **A G1 hit is
   never second-guessed: this step is skipped entirely when G1 matched.** Only
   lifts when the matched attribute is `attr_type == "string"`.
6. **G3 validation** — cross-check the resolved `child_slug` against
   `accepts_allowed_blocks(rec.slug)`'s allow-list. `None` = permissive,
   logged at debug level (not a gap). Not-in-list = loud `ContentGap` naming
   both the rejected slug and the full allow-list. Match = emit a real
   `ChildBlock`.

A separate, related mechanism: the `array_item_schema` table
(`{block_slug, array_attr, field_key, field_order, role}`), each array-item
FIELD carrying its own declared role, consumed by
`converter/resolvers/array_content.py::lift_array_content()`.

Spec 45's two in-scope tiers (§4) are these same two real mechanisms,
re-pointed at a classless field/value instead of a BEM `__element` token —
Tier 1 mirrors the `array_item_schema` mechanism, Tier 2 mirrors a
narrower, exact-match form of the nested-attr / G3-validation discipline
(never the looser canonical_slot cross-family match `nested_attr_named`
itself was built to avoid — see §4.2).

## 4. FR-45-1 — The classless-field resolver, in-scope tiers only

One new module (mirrors the existing advisory-classifier pattern of
`plugins/sgs-blocks/scripts/recogniser/sc_var_classifier.py` — path corrected
from v1.0.0 — capped-low confidence, routed through the named gap-candidate/
operator-review flow (§6), never writing into an authoritative DB table
directly, never silently guessing).

**Scope correction from v1.0.0: this build pass covers Tiers 1 and 2 only.**
Tier 3 (nested child-block matching) and Tier 4 (one-off content) are
deferred — see §9 for why, and what has to be true before either is designed.

### 4.0 Hard pre-filter (runs before any tier)

A field is excluded from content consideration when its **JS value's own
syntax is a function/arrow-function literal** in the draft's source (an AST or
precise syntactic check on the parsed object literal — **not** a check against
the field's NAME). The originally-cited examples (`go`/`toggle`/`remove`/
`pick`/`addLens`) are illustrative field names seen in practice, not a
matching pattern — matching by name would be a hardcoded verb list, which
R-31-1 forbids and which the underlying evidence
(`.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md`,
Finding 1c) explicitly says is the WRONG signal: the finding is "distinguishable
by type alone (function vs string), before even reading the name."

### 4.1 Tier 1 — repeated array-item field

**Condition:** parent block identity is resolved (from Spec 44) AND the field
sits inside a repeated array attribute on that block (e.g.
`sgs/card-grid.items`) — see §4.1.0 for how "sits inside" is actually
established; v1.3.0 left this unstated, and a `/qc-council` trace proved the
gap is real (the array field ITSELF was never resolvable by either Tier 1 or
Tier 3 as worded).

**Real, measured applicability — stated honestly, not implied.** As of
2026-09-15: `array_item_schema` covers **13 of 209 blocks**, 14
`(block_slug, array_attr)` pairs, 88 rows, of which **25 carry a non-NULL
`role`**. Tier 1 can only ever fire on those 13 blocks; for the other 196 this
tier produces no match and the field falls to a gap (§6), which is correct
behaviour, not a defect.

### 4.1.0 Step A (new, v1.4.0) — identifying the array field itself

⚠ **Renamed from "Step 0" in this revision** — round-3 `/qc-council` flagged
that this section and §9.1 both used "Step 0" for two different mechanisms,
risking ordering confusion. This step now runs under its own name, and the
normative order is: **§4.0's pre-filter → this step (§4.1.0 Step A) → THEN,
per the resulting shape, one of Tier 1's per-item logic / §9.1's own-attribute
check / Tier 2 / Tier 3 / Tier 4**, never the reverse. This step always runs
first among the tiers because every other tier's condition (§4.1, §4.2, §9)
is stated in terms of what this step did or didn't already match.

Before any per-item field matching, the resolver must first recognise WHICH
draft field, if any, corresponds to the parent's own declared `array_attr`.
This step was missing entirely in v1.2.0/v1.3.0 — Tier 1's condition assumed
it as a precondition without anyone owning it, and a `/qc-council` trace
proved the consequence directly: `sgs/card-grid`'s own `items` array attr is
`attr_type='array'`, so it can never satisfy §9.1's `attr_type='object'`
check either — the array field itself fell into a genuine hole between the
two tiers.

**Resolution:** exact key-name match only, never a content-shape guess at
this step (that would risk mismatching the whole array against the wrong
attribute before any of its items are even examined). Does the draft field's
own key equal a declared `array_attr` value in `array_item_schema` for the
resolved parent? **Match →** the field is recognised as that array attribute;
proceed to iterate its items via §4.1's existing per-item logic (now labelled
Step 1 below), each item keyed to this same `(block_slug, array_attr)` pair.
**No match, AND the field's value is a nested object or an array of nested
objects →** it becomes a candidate Tier 3 evaluates alongside genuine
child-block candidates (§9.3's widened candidate set), since a
misnamed-but-real array attribute and a genuine nested child block are the
same shape of ambiguity (a structure whose identity must be inferred from
content, not name) and should be scored by the same mechanism. **No match,
AND the field's value is a plain scalar →** this step does not apply at all;
the field proceeds to Tier 2 (§4.2) as an ordinary scalar attribute, exactly
as if no array-attribute existed on this block. ⚠ **Corrected in this
revision (round-3 `/qc-council` finding):** an earlier draft of this step
routed every non-matched field to Tier 3 unconditionally, including plain
scalars — contradicting Tier 3's own condition (§9), which only ever accepts
a nested value. The shape check above is the fix; it was always implied by
§9's condition, now stated here explicitly so the two sections cannot be
read as contradicting each other.

**Resolution once an array attribute is identified, in order (was §4.1's
"Resolution, in order", unchanged in substance):**

1. **Direct key match** — the draft's JS field key against `field_key` for
   that exact `(block_slug, array_attr)` pair.
   ⚠ **Uncertain yield, flagged rather than assumed.** Spec 44 §3.1 states as
   settled, evidence-backed fact that "a draft's data model and a block's real
   PHP variable names essentially never share literal names." Whether that
   finding (about classless ELEMENT identity vs BEM tokens) also holds for
   plain-English array-item FIELD keys (e.g. draft `title`/`body`/`text` vs
   `array_item_schema.field_key`) is a genuinely different, unmeasured
   question — do not assume either a high or low hit rate. **Prerequisite for
   build:** run direct-key matching against the real Eye Care draft's
   `sc-for` groups whose resolved parent is one of the 13 covered blocks, and
   record the real hit rate before treating this as the primary path.
2. **Role-based fallback** — only when a role-populated row exists on that
   pair (25 of 88 today) and the field's value passes a defined value-shape
   check for that role (`url-href` → matches a URL-shaped string;
   `image-object` → matches a media-reference shape; `text-content` → matches
   a plain string with no other signal). **This value-shape check does not
   exist as code anywhere in this pipeline today** — checked directly:
   Spec 44 §5.2 cites "content-value-shape detectors (relative-date,
   FAQ-question-mark, SVG icon-path)" as if reusable; a full-tree grep for
   any of the three found zero real implementation. Tier 1's role-based
   fallback therefore needs a small, new, explicitly-scoped value-shape
   classifier (three checks: URL-shaped string, media-reference shape,
   default-to-text) — this is new code, not reuse, and is named as such here
   rather than implied free.
   ⚠ **Role-vocabulary gap found this session — corrected in this revision
   after a round-3 `/qc-council` check found the original remedy was WRONG
   and would have caused a live regression.** `array_item_schema.role` uses
   three values (`url-href`, `icon-slug`, `state-modifier-boolean`) that do
   not exist in the `roles` table's `content-bearing` classification. The
   ORIGINAL proposed fix — rename these to `roles`'s nearest-sounding
   existing names (`link-href`, `icon`, `presence-boolean`) — is **rejected**:
   verified against `field_extractors.py`, these are NOT misspellings of
   those names. `url-href` and `link-href` are already a documented, working
   ALIAS pair (`field_extractors.py:22`) — no fix needed there at all. `icon`
   and `icon-slug` are two distinct, already-working dispatch keys. Most
   importantly, `state-modifier-boolean` and `presence-boolean` are
   **semantically opposite, not equivalent** — the code's own comment states
   `presence-boolean` returns `True` whenever the field is matched at all
   (existence IS the signal), while `state-modifier-boolean` (the sole real
   row: `sgs/product-card.packSizes.selected`) means the element always
   exists and the boolean depends on which ONE sibling carries the marker.
   Collapsing them would make every pack-size pill in a real clone render as
   "selected" — a genuine correctness regression, not a cosmetic rename.

   **The correct fix: `roles` is missing three rows, not that
   `array_item_schema` holds three typos.** Add `url-href`, `icon-slug`, and
   `state-modifier-boolean` to the `roles` table with
   `classification='content-bearing'` — each already has a real, working
   extractor in `field_extractors.py`; this closes §4.1.0 point 3's 17-role
   test for all three with **zero** change to any live extraction path,
   `array_item_schema`'s already-seeded rows, or `_FLAT_SELF_ROLES`/
   `DANGER_ROLES`. Tracked here as a build prerequisite for Tier 1's
   role-based fallback (used only for PLACEMENT after a candidate is already
   selected, per §9.3 — this gap no longer affects Tier 3's selection logic
   at all, only Tier 1's own per-item field placement).
3. **What counts as "a content-bearing match" (ambiguity closed, v1.4.0):** a
   hit under Step 1 (direct key match) always counts, regardless of the
   matched row's `role` — Step 1's own definition already treats an exact key
   match as sufficient evidence on its own merits. A hit under Step 2 counts
   only when the row's `role` is genuinely content-bearing per the (now
   aligned, per the fix above) 17-role set in §4.2 — `identity` IS one of
   those 17 and counts; a `NULL` role does NOT count and is treated as
   non-content-bearing for this purpose.

**Reuses, does not fork:** the same `array_item_schema` table and the same
per-field role tagging `array_content.py::lift_array_content()` already reads
for the BEM-classed path — this tier is a second reader of that table, not a
new one.

### 4.2 Tier 2 — parent's own scalar attribute

**Condition:** parent block identity is resolved AND the field is not inside a
repeated array attribute.

**Resolution:** match the field against the parent block's own
`canonical_slot`-tagged attributes on `block_attributes`, **restricted to
attributes whose `role` is genuinely content-bearing** — the live set read
from `db_lookup.py::_content_bearing_roles()` (D99: `SELECT role_name FROM
roles WHERE classification='content-bearing'`). ⚠ **Corrected in v1.3.0:**
earlier revisions of this spec cited a "5-role set" — live query returns
**17 roles** (`content`, `icon-dashicon`, `icon-emoji`, `icon-lucide`,
`icon-wp-icon`, `identity`, `image-alt`, `image-object`, `link-href`,
`link-content`, `rating`, `svg`, `text-content`, `css-modifier`,
`numeric-content`, `icon`, `presence-boolean`). This function's own docstring
warns "never hardcode the set" for exactly this reason — always call it live
rather than citing a cached list. This scoping corrects v1.0.0's original
figure, which counted matches against the FULL 1958-row/84-slot
canonical_slot pool (including styling roles like `typography`, `layout`,
`colour`, `motion` — explicitly out of this spec's scope per §2). Full
breakdown: `.claude/reports/2026-09-15-spec45-field-mapping-verification.md`
§2 (that report's own 5-role figure is now superseded by this correction —
re-run the query rather than trusting either cached number).

**Why not the looser cross-family match.** `nested_attr_named()`'s own
docstring documents the D279 regression it exists to prevent: resolving a
cross-family element via a canonical_slot/alias identity match "hijacked
`sgs-accordion__heading`... into a scalar lift, silently dropping the child
heading BLOCK the golden fixture expects." Tier 2 therefore matches on
**exact attribute-name-to-field-key equivalence first**; a canonical_slot
match is only used as a same-block, same-family fallback (never
cross-family, and Tier 2 never resolves a field belonging to a DIFFERENT
block than the one already identified) — mirroring the discipline that
regression guard established, not the looser mechanism it replaced.

**Ambiguity is never silently guessed.** Within one resolved block, 293 of 813
`(block, canonical_slot)` pairs carry more than one candidate attribute (36%
measured). When Tier 2 finds 2+ equally-valid candidate attributes for a
field, it does NOT pick the first by row order — it reports the field as
unresolved (§6), the same discipline `db_lookup.py::_variant_modifier_tiebreak`
already applies ("returns None — no change — when zero or 2+ candidates
match... an unresolved ambiguity is never guessed at").

**Prerequisite for build:** the corrected 217-row content-bearing match rate,
measured per-block (not pooled) against the real Eye Care draft, must be
written to a report before this tier is relied on for auto-placement — not
re-derived from the v1.0.0 conversation figure.

## 5. Non-negotiable discipline

Unmatched = a loud, reported gap, never a silent drop, never a guess. Matches
the discipline already enforced by `sc_var_classifier.py`,
`dom_shape_classifier.py`, `sc_var_responsive_correlator.py`, and
`sc_var_responsive_bridge.py`.

## 6. Where a gap actually goes (named, not asserted)

v1.0.0 said gaps are "routed through the same gap-candidate/operator-review
flow every sibling classifier already uses" without naming a destination —
flagged by the council as unenforceable. The real destination depends on
which code path this resolver runs on, which is itself determined by Spec 44:

Spec 44 §4.4 establishes that a Stage-A-matched classless boundary is handled
**INSTEAD of** `converter/entry.py::convert_section()` — so
`content_gap_collector.py`'s `clear()`/`flush()` binding (scoped to
`convert_section()` calls) is **not** active on this code path. Spec 45's
resolver therefore writes directly into Spec 44's own existing surfaces,
rather than assuming the generic gap collector applies:

- **`classless-recognition-log.jsonl`** (Spec 44 §7) — one line per field
  placement decision, carrying `client_slug`, the field, the resolved
  attribute (or `null`), and the tier that resolved it (or `unresolved`).
- **`pipeline-state/<run>/operator-review.html`** (Spec 44 §7,
  `recogniser/simple_html_review_report.py`) — an unresolved field is added to
  the SAME per-boundary review entry Spec 44 already creates for that group,
  as an additional "field mapping" row, not a separate page.
- **`pipeline-state/<run>/classless-summary.md`** (Spec 44 §7) — the end-of-run
  summary gains a field-resolution count alongside Spec 44's own group-match
  count.

## 7. Interaction with Spec 44's trust gate (the previously-open question, now answered)

**A group whose identity only cleared Spec 44's Stage A/B with a "falls to
review" outcome (not auto-complete, per Spec 44's FR-44-1) still gets field
resolution run against it — but that resolution is capped at review-pending,
never silently promoted to a completed clone.** Concretely: Tier 1/2's output
for such a group is attached to the SAME `operator-review.html` entry Spec 44
already created for the group's identity, as a proposed field mapping the
human reviewer sees alongside the identity decision — not applied to the live
clone output until that review clears. This mirrors FR-44-1's own logic rather
than inventing a second, looser gate: a decision that wasn't trusted enough to
auto-complete at the group level doesn't get trusted enough to auto-complete
at the field level either.

**Who does the review.** This does not have to be Bean personally. The forced
first-look exists because no code has yet checked a genuinely new pattern
against REAL, LIVE content for a NEW client — that is a live-data question, not
a code-quality one. The reviewer for this check is Claude, via a live
Playwright DOM comparison against the real deployed page (same discipline as
R-31-11), the first time a given (block, pattern) combination is used for a
client. Escalation to Bean is reserved for genuine judgment calls the live page
can't resolve on its own (e.g. whether a resolved field reads right for that
client's brand voice) — not for routine structural verification.

## 8. Rollout

**Design is complete for all four tiers in this document (Bean's explicit
direction) — build sequencing below is about SHIP order, not design scope.**
Every tier ships default-off behind `--classless-field-resolve`, mirroring
this project's existing opt-in flags for comparable mechanisms
(`--dom-shape-min-confidence`, `--sc-var-min-confidence`, Spec 44's
`--classless-match`). Turning the flag off is the rollback path for all four
tiers at once — no code revert needed.

**Recommended build order within the one flag (R-31-5 — phases never ship as
single commits): Tier 1 → Tier 2 → Tier 3 → Tier 4, each its own commit,
because each later tier's real-code dependencies are named in this spec but
Tier 3/4 additionally depend on Tier 1/2 already existing as callable
functions (§9.3 explicitly reuses Tier 1/2's matchers; §10.2 explicitly feeds
into Tiers 1-3).** This is a sequencing choice for implementation order, not a
scope cut — all four tiers are equally in-spec and the flag covers all four
together; Bean can override the order if a different priority makes more
sense once building starts.

**Definition of done, per tier:**

- **Tier 1:** the direct-key-match hit rate, measured against the real Eye
  Care draft's `sc-for` groups whose parent resolves to one of the 13 covered
  blocks, recorded in a report (not assumed beforehand).
- **Tier 2:** the content-bearing match rate (§4.2, scoped to the 217-row
  subset, per-block not pooled) recorded in a report before the tier is
  trusted for auto-placement.
- **Tier 3:** the raw-count-with-floor-and-margin scoring rule (§9.3) is built
  and self-tested — including the 14-group re-measurement and the brand-logo
  negative control (§0.2) — BEFORE Tier 3 is wired into the live pipeline; the
  `/sgs-update` role-vocabulary alignment fix (§4.1.0 point 2) lands first,
  since Tier 3 reuses Tier 1's role-based matching; the depth-cap/visited-set
  guard (§9.4) has a fixture proving it fires on a deliberately deep/cyclic
  test input; the real bounded-candidate-set coverage (allow-listed blocks
  UNION each parent's own array attributes, §9.2) is stated in the shipped
  report, not implied as universal.
- **Tier 4:** the named `dom_shape_classifier.py` slug-disambiguation fix
  (§10.1) lands and is self-tested FIRST — Tier 4 does not ship on the two
  already-unambiguous guesses alone if the fix is in scope for the same pass.
- **All tiers:** pass their fixture tests (§11) including every required
  negative control. A live run against the real Eye Care draft with the flag
  on produces either real field placements or honest review-queue entries for
  every field inside a Tier-1-through-4-eligible group — confirmed via the
  named surfaces in §6, not terminal scrollback.

## 9. Tier 3 — nested child-block matching within a resolved parent

**Condition:** parent block identity is resolved AND a field's value is a
nested object, or an array of nested objects, that Tier 1 did not already
recognise by exact key-name match against a known `array_item_schema` array
attribute (§4.1.0 Step A).

**Widened in v1.4.0:** when §4.1.0's Step A finds no exact-name match, the
field is not assumed to be a genuine child block — it is scored by Tier 3
(§9.3) against BOTH the parent's own un-matched `array_item_schema` array
attribute(s) (if any) AND the real allow-listed child-block candidates
together, as one candidate set. A misnamed-but-real array attribute and a
genuine nested child block are the same shape of ambiguity — content whose
identity must be inferred, not read off a name — so they are scored by the
same mechanism rather than two different ones with different rules.

None of v1.0.0's cited reuse anchors survived verification (§0): `nested_attr_named`
cannot match a box/tier attribute and only fires on string-typed content-bearing
attrs; the classed path's own G3 permissive branch is a `debug`-level log, not
a gap; the classed path's acyclicity guarantee comes from walking a finite DOM
tree, which doesn't transfer to a JS object graph. So Tier 3 below is
new-designed, built only from mechanisms independently confirmed this session
to actually exist and do what's claimed — nothing carried over unverified.

### 9.1 Step 0 — is this actually the parent's own object-typed attribute?

Before treating a nested value as a possible child block, check whether it's
really the parent's own attribute. `nested_attr_named()` cannot answer this for
an object-typed value (§0), so this is a new, narrow check: does the resolved
parent have an attribute whose `attr_name` equals the field key, whose
`attr_type` is `object`, **AND whose `role` is one of the 17 content-bearing
roles (§4.2)** — never a box/tier/styling attribute. Exact-name match only,
same discipline as `nested_attr_named`'s own D279-driven rule — never a
canonical_slot/alias match, which is exactly the cross-family hijack risk that
guard exists to prevent.

**Widened in v1.6.0 — scan the parent's full `canonical_slot` grouping, not
one attribute name.** `block_attributes.canonical_slot` already groups
several attributes under one named element slot (verified on
`sgs/product-card`: the `button` slot alone carries `ctaText`/`ctaUrl`/
`ctaBorderStyle`/`ctaFontWeight`/etc; `sgs/team-member`'s `image` slot
carries `photo`/`photoTablet`/`photoMobile`). This is a real, DB-seeded
signal for "does this parent already have a named place for content shaped
like X" — stronger than checking a single `attr_name`. The check is
therefore: does the field key exactly match either (a) a single attribute's
`attr_name` (the original check, kept), OR (b) a `canonical_slot` value
shared by one or more content-bearing attributes on this parent (the
widened check)? Either match routes to the same "place as the parent's own
attribute" outcome (§9.1's placement, below) — a canonical_slot match places
the field against every attribute sharing that slot whose `role` is
content-bearing, same discipline as (a). This is still an exact-name check
against DB-seeded values, not a fuzzy match — it widens WHAT counts as a
name to check against, not HOW the check is performed.

⚠ **Corrected in v1.3.0 — the role filter is mandatory, not optional.**
Verified live: 681 object-typed attrs exist across the DB; only 61 carry a
content-bearing role, and every object attr on a real test block
(`sgs/accordion`) is `layout`/`visual`/`typography` (`gap`, `columns`,
`padding`, `borderRadius`, etc.). Without this filter, a draft field literally
named `gap` or `columns` carrying real content would silently write into a
styling attribute — exactly the out-of-scope write §2 rules out.

⚠ **Collision tiebreak.** `(block_slug, attr_name)` is not uniquely
constrained on its own — the DB's real unique index also includes `source`
(`sgs`/`sgs-fx`/`native_wp`), so the same attribute name could in principle
exist twice under different sources. Zero such collisions exist today
(verified), but the rule is stated for when one does: **2+ exact-name matches
= gap, never a silent pick of either row.**

**Match → place directly as the parent's own attribute value**, conserved the
same way §4's Tiers place a scalar. **No match → proceed to 9.2.**

### 9.2 Step 1 — build the bounded candidate set, or gap when it's empty

**Rewritten in v1.4.0** — v1.3.0 stated this as a three-way branch on
`accepts_allowed_blocks` alone and asserted (incorrectly — `/qc-council`
proved it false) that the parent's own array attribute case was "already
handled upstream." **Widened again 2026-09-17 (Front C Task 5)** to add a
fourth source. The real rule is one bounded candidate set, built from FOUR
sources together, never a roster-wide search:

**Candidate set = (the parent's own `array_item_schema` array attribute(s)
that §4.1.0 Step A did NOT already match by exact name) UNION (the parent's
real, verified `accepts_allowed_blocks` allow-list, if non-empty) UNION (the
parent's own `block_render_composition` children, Spec 31 §13.9 — render-time
`render_block()` composition, invisible to `accepts_allowed_blocks` because
that column only ever records EDITOR-stored InnerBlocks) UNION (the
`sgs/container` fallback, only when the first three are all empty AND the
parent is genuinely unrestricted).**

**Built** (`_composed_children()` + `build_candidate_set()`,
`classless_field_resolver.py`) — proven, not just wired: `sgs/buybox` has zero
array attributes and a genuinely NULL `accepts_allowed_blocks`, so before this
fix its candidate set was empty and it would have fallen back to a bare
`sgs/container` guess. It composes `sgs/option-picker` at render time; the
real candidate set is now non-empty and the fallback is correctly suppressed
(`test_tier3_composed_block_suppresses_the_container_fallback`) — and a real
draft field shaped like option-picker's own content (`label` + `optionItems`,
clearing the >=2 raw-hit floor) resolves all the way through to
`sgs/option-picker` (`test_tier3_composed_block_actually_resolves_a_real_field`).
A composed-child candidate carries `kind="composed-block"` (distinct from
`"block"`, the InnerBlocks case) so the review trail can always tell the two
sources apart.

⚠ **A second, separate Spec-31-owned fact — static/singleton structural
content — GAINED a Tier 4 consumer (Front C Task 4, 2026-09-17).**
`block_render_singletons` (Spec 31 §13.10) records content that renders
exactly once, outside both a `foreach` and a `render_block()` call.
`resolve_tier4()` (§10 below) now accepts an optional `static_roles` parameter
— the draft element's own non-repeated structural markers — compared against
the classifier-guessed slug's singleton rows and attached as
`Tier4Resolution.static_corroboration`. **Deliberately informational only**:
`confidence` and `review_pending` (§10.3, below) are untouched by it — see Spec
31 §13.10 for the full mechanism and its real measured result (0 of 39 real
groups on the Eye Care Birmingham draft currently carry this signal — an
honest null result for that specific draft, proven-working against real and
synthetic positive controls). Tier 3's own consumer status for THIS table is
unchanged by this — read the composition paragraph above for that distinction.

- If `accepts_allowed_blocks` is a genuine non-empty list (20 of 216
  `block_composition` rows today — e.g. `sgs/accordion → [sgs/accordion-item]`,
  `sgs/cta-section → [sgs/heading, sgs/text, sgs/multi-button]`), those slugs
  join the candidate set — **subject to the two v1.6.0 verification gates
  below.**
- If the resolved parent has one or more of its own `array_item_schema` array
  attributes that §4.1.0 did NOT already claim by name, EACH joins the
  candidate set as its own candidate (scored the same way as a real child
  block — see §9.3).
- **The candidate set is only ever these named, bounded sources — never the
  209-block roster, regardless of `accepts_allowed_blocks`'s value.**
  Scoring against the parent's own already-known array attribute is not a
  roster-wide search (it's confirming a candidate whose existence is already
  established on this exact block); scoring against a declared allow-list or
  the `sgs/container` fallback isn't either. Nothing outside these sources is
  ever considered — this is what keeps the "never guess, never search
  everything" discipline intact even though `accepts_allowed_blocks` alone no
  longer gates the whole step.
- **Empty candidate set (all sources empty) → immediate gap.** This is the
  only case that gaps at this step now; it is a real, correctly-scoped
  outcome (the field is genuinely neither a known array attribute, a
  declared child, nor eligible for the container fallback), not a blanket
  refusal to search.

⚠ **v1.6.0 verification gate 1 — a candidate slug must resolve to a real,
current `blocks` row.** Verified live: `block_composition` carries 7 orphaned
rows referencing blocks that no longer exist in `blocks` at all (`sgs/adaptive-nav`,
`sgs/content-collection`, `sgs/divider`, `sgs/mega-menu`, `sgs/mobile-nav`,
`sgs/mobile-nav-toggle`, `sgs/nav-menu`) — deleted blocks whose composition
row was never cleaned up (`blocks.is_stale` exists but is 0 for every row
today, so it cannot be relied on as this signal). Any candidate slug pulled
from `accepts_allowed_blocks` that does not resolve to a live `blocks` row
is dropped from the candidate set before scoring, never scored as if real.

⚠ **v1.6.0 verification gate 2 — `accepts_allowed_blocks` must be
cross-checked against real InnerBlocks usage, not trusted at face value.**
Verified live: `sgs/product-card` and `sgs/team-member` both carry a
non-empty `accepts_allowed_blocks` list, yet both blocks' own source states
plainly they have no InnerBlocks slot at all (product-card's `block.json`
description: "no InnerBlocks"; team-member's `save.js`: "pure typed leaf, no
InnerBlocks") — both compose their entire content through
`block_attributes.canonical_slot`/`role` instead (§9.1's widened check).
This is not stale data — both blocks are real and current — the column was
seeded wrong for these two rows specifically. The other 18 real-allow-list
blocks were spot-checked and all 18 genuinely render `<InnerBlocks>` in
their own `edit.js`. **Before any block's `accepts_allowed_blocks` list is
trusted as a Tier 3 candidate source, confirm that block's own `edit.js`
actually renders `InnerBlocks`** (a one-time, DB-cacheable check per block,
not a per-field runtime cost) — a parent that fails this check contributes
NOTHING from `accepts_allowed_blocks` to the candidate set (its content, if
any, is reached entirely through §9.1's canonical_slot check instead, never
through Tier 3's child-block matching).

- **`sgs/container` fallback (new in v1.6.0).** Reuses, rather than
  reinvents, a mechanism already proven in the classed (BEM) path — confirmed
  live in `converter/db/db_lookup.py` and `converter/services/extraction.py`,
  where an unresolved child under a permissive parent
  (`accepts_allowed_blocks IS NULL`, 196 of 216 `block_composition` rows
  today) recurses as a default `sgs/container` rather than gapping. Tier 3
  adopts the same rule: when the candidate set from the first two sources is
  empty AND the resolved parent's `accepts_allowed_blocks` is genuinely
  `NULL` (unrestricted, not an empty list — an empty list still means "no
  children, gap") AND the nested field passed §4.0's function-value
  pre-filter, `sgs/container` joins the candidate set as a single fallback
  candidate. It is not scored against other candidates by §9.3 (there being
  none once the first two sources are empty) — it is placed directly, and
  the recursion in §9.4 treats it as the new parent exactly as the classed
  path already does for its own default-container case.

Proceed to 9.3 with whatever candidate set was built (possibly one candidate,
possibly several, possibly the union of multiple sources).

### 9.3 Step 2 — score each candidate by RAW content-hit count, never a percentage

**Rewritten in v1.4.0 — the v1.3.0 percentage-with-denominator-exclusion rule
was `/qc-council`-tested and found to change the outcome on ZERO of the 14
real test groups (still 33% on `sgs/card-grid.items`), and to actively create
a NEW false positive: a hand-traced negative control (a brand-logo object
scored against the wrong candidate, `sgs/card-grid`) moved from a correctly-
rejected 50% under the old rule to an incorrectly-accepted 75-100% under the
"fixed" one, because excluding a candidate's own styling fields from the
denominator systematically rewards attribute-RICH candidates regardless of
whether they're the right one. The percentage approach is abandoned, not
patched again.**

⚠ **Round 3 `/qc-council` finding, fixed below — the first draft of this rule
STILL had the bias, in a new form.** Two independent validators reproduced the
exact same brand-logo false positive against this rule as written (a wrong
candidate scoring 4 raw hits against a correct candidate's 3). Root cause: the
rule counted BOTH an exact key-name match AND a looser value-shape match
(e.g. "any plain string matches any `text-content`-role field") toward
candidate SELECTION. The value-shape check is a wildcard — a candidate that
merely declares a generic `text-content` row scores a hit for every plain
string field in the draft, regardless of relevance, so an attribute-rich
candidate still wins by volume. The bias moved from the percentage's
denominator (v1.3.0) to the raw count's numerator (v1.4.0 draft) — same
defect, different location. **Fixed: value-shape/role matching is no longer
part of selection at all.**

For each candidate in §9.2's bounded set, compute `hits(candidate)`:

**`hits(candidate)` = the count of the nested value's fields (post §4.0's
function-value pre-filter) whose key EXACTLY matches one of the candidate's
own field names — never a role-based or value-shape match.** Concretely:
`array_item_schema.field_key` for an array-attribute candidate (§4.1.0 Step
1 only — Step 2's role fallback does NOT contribute to `hits()`), or
`block_attributes.attr_name` for a block candidate, restricted to
content-bearing attributes (§4.2) but matched by exact name, not by
`canonical_slot`/role. A field is never removed from consideration just
because the candidate happens to declare a same-named styling attribute —
that was v1.3.0's defect; this rule doesn't shrink a denominator at all, so
there is nothing for a candidate to game by declaring more attributes.

**The looser role/value-shape match (§4.1.0 Step 2, Tier 2's canonical_slot
fallback) still exists — but only AFTER a candidate is selected, to place the
REMAINING fields that didn't match by exact name.** It plays no part in
choosing WHICH candidate wins. This is the one targeted change both round-3
validators converged on independently; verified by both against the
brand-logo control with role-matching excluded from scoring: the correct
candidate (`sgs/brand-strip`, 2 exact hits) beats the wrong one
(`sgs/card-grid`, 0 exact hits) cleanly.

**Selection rule:** the candidate with the highest `hits()` is selected ONLY
when (a) `hits(candidate) >= 2` (an absolute evidence floor — a single
coincidental field-name match is never enough on its own, regardless of how
small the nested object is; §11's test plan names the two real
`array_item_schema` pairs this floor permanently excludes — `sgs/cta-section.stats`
at 1 possible field, and any sole-candidate case scoring exactly 1 — stated
as an accepted "gap rather than guess" trade-off, not an oversight), AND (b)
no other candidate in the set ties that same highest count. Zero candidates
clearing the floor, or a tie among 2+ at the top count, is reported as an
ambiguous/unresolvable gap naming every candidate considered and their raw
hit counts — never resolved by row order, list position, or normalising away
the tie.

**Counting-domain rule (closes a round-3 ambiguity):** `hits()` is computed
over ONE representative unit — the nested value's own field list if it's a
single object, or the FIRST item's field list if it's an array of
similarly-shaped objects (§9.5's homogeneity premise) — never summed across
every array item. This keeps array-attribute candidates and block candidates
on the same numeric scale; an array candidate is never credited once per
repeated item.

**Why exact-match-only raw counts, not a ratio or a role-aware count:** a
ratio's denominator can always be manipulated by how "eligible" fields are
defined (v1.3.0's failure). A role-aware count can always be inflated by a
candidate declaring a generic content-bearing role that matches many plain
strings (this section's own round-3 failure). An exact-name-only raw count
with a fixed floor and a strict margin has neither weakness — a hit requires
the SAME literal field name to exist on both sides, which a candidate cannot
manufacture by being attribute-rich, and margin-over-every-other-candidate is
a directly comparable,
ungameable signal.

**Before this tier is trusted for auto-placement:** re-run the same 14-group
measurement AND the brand-logo negative control with this raw-count rule and
record the real pass/reject rates in a report — do not assume this design is
correct without that measurement, exactly as the previous two revisions were
assumed correct and weren't.

### 9.4 Step 3 — recurse, with an explicit depth cap and a visited-set

Once a single candidate slug is resolved, recurse the WHOLE resolver (all four
tiers, this candidate as the new parent, the nested object's own fields as the
new fields to place) — genuinely the same resolver, not a copy.

**Explicit safety bound, absent from v1.0.0 and confirmed necessary this
session:** a hard `max_depth` (default 25 — generous for any real Claude
Design draft's nesting, confirmed this session that real drafts nest at most
5-15 levels for a tier-object attribute) and a visited-set keyed on
`id(value)` of the nested JS value. Exceeding either emits a `ContentGap`
naming the depth/cycle reached — never an unhandled `RecursionError` that
kills the whole clone run, and never a silent truncation. JSON itself cannot
encode a true cycle, so the visited-set is a defensive bound against any
future non-JSON-sourced input, not a response to an observed real failure.

### 9.5 Step 4 — array-of-objects children (repeated child blocks)

When the nested value is an array of objects rather than a single object, each
array item is scored and resolved independently via 9.2-9.4 against the SAME
bounded candidate set — this is deliberately narrower than Spec 44's own job.
Spec 44 resolves a repeated group's identity with NO parent narrowing it yet,
searching effectively the whole roster; Tier 3 only ever resolves which ONE of
an ALREADY-KNOWN parent's declared allowed children (plus its own un-matched
array attributes, §9.2) each repeated item is. The ambiguity space is the
bounded candidate set (typically 1-3 candidates, per the real DB data in
§9.2), not the 209-block roster — this stays within Spec 45's own
field-mapping scope and is not a re-implementation of Spec 44's group-identity
job.

## 10. Tier 4 — one-off (non-repeated) content

**Condition:** the element is not part of any group Spec 44 resolved, and has
no other known parent block context — a genuine one-off classless element (a
lone hero, a single unrepeated CTA).

v1.0.0 claimed this tier "reuses `dom_shape_classifier.py`, unchanged." Verified
false (§0): that module has zero field-resolution logic — it returns at most
one bare block-NAME guess (`hero`/`cta`/`header`/`footer`/`card-grid`) from
four classifiers, each capped at confidence ≤ 0.5. The genuine, buildable design
is narrower and different: **Tier 4 is not a separate field-resolution engine.
It is Tiers 1-3 (§4, §9), fed a parent identity from `dom_shape_classifier.py`
instead of from Spec 44.** Once that substitution is made, everything
downstream is identical — no second matching engine to build or maintain.

### 10.1 Step 0 — resolve the classifier's bare name to a real, verified slug

Checked live this session: `classify_heading`/`classify_repeated_siblings`
map unambiguously (`"hero"` → exactly one block, `sgs/hero`; `"card-grid"` →
exactly one, `sgs/card-grid`). `classify_button_shaped`/`classify_landmark_tag`
do NOT — `"cta"` matches both `sgs/cta-section` and `sgs/whatsapp-cta`;
`"header"`/`"footer"` each match both a `sgs/site-header(-row)` /
`sgs/site-footer(-row)` pair. This is the exact unlanded prerequisite Spec 44
§11 already names ("a DB-verified `sgs/card-grid` slug... still needed").

**Named fix, in scope for this tier's build (not a vague TODO), corrected in
v1.3.0 after a `/qc-council` trace found the original wording unbuildable:**

⚠ **v1.2.0 said `classify_button_shaped`'s "already-available structural
signals (element count, presence of a heading/paragraph sibling)" — verified
false.** `classify_button_shaped(element)` receives ONE flattened
`{tag, classes, attrs}` dict; its children are discarded before it ever sees
the element (`_bs4_to_dom_dict`), and the orchestrator (`classify_element`)
never forwards sibling context to it at either real call site. Those signals
are not available today, at all.

**Corrected fix — compute the signals once, where the real DOM element still
exists, and bake them into the dict (no signature widening, no sibling
forwarding needed anywhere):** `_bs4_to_dom_dict(el)` gains two additional
precomputed keys, read directly off the REAL bs4 element at the one point
where its true parent/sibling/child context is still available:
`element["_child_count"] = len(el.find_all(True, recursive=False))` and
`element["_has_heading_or_paragraph_sibling"] = any(sib.name in
("h1","h2","h3","h4","p") for sib in el.find_next_siblings())`.
`classify_button_shaped` then reads these two keys directly (no new argument)
— a single floating action element (`sgs/whatsapp-cta`) has `_child_count`
near 0 and no heading/paragraph sibling; `sgs/cta-section`'s composite shape
has both. This closes the plumbing gap the validator found without touching
any function signature or call site beyond the one dict-construction point.
✅ **`/qc-council` round 2 verified this fix is real, not a no-op** — traced
all three real call sites of `_bs4_to_dom_dict` and confirmed the input is a
live, attached bs4 Tag with intact tree navigation at every one (proven by
the surrounding code performing its own `.find_all`/ancestor calls one line
away). ⚠ Landing note the same validation found: `classify_button_shaped`
must read the two new keys via `.get("_child_count", 0)` /
`.get("_has_heading_or_paragraph_sibling", False)`, not direct key access —
the module's own shipped self-test constructs bare
`{"tag": "button", "classes": []}` dicts by hand with neither key present,
and direct access would `KeyError` on that existing test.

⚠ **v1.2.0's `classify_landmark_tag` fix only addressed 2 of the constant's 3
real keys — corrected.** `_LANDMARK_TAG_BLOCK` maps THREE tags today:
`nav → "header"`, `header → "header"`, `footer → "footer"`. The proposed
row-level remap (`header`/`footer` → `sgs/site-header-row`/
`sgs/site-footer-row`) is real and buildable as a constant edit — but applying
it to `nav` too would silently route a bare `<nav>` into a header-row block
when the real candidates are `sgs/nav-bar-menu`/`sgs/nav-drawer`/
`sgs/nav-drawer-menu` (three, with no signal in this function to choose
between them). **`nav` is removed from `_LANDMARK_TAG_BLOCK` entirely** — a
bare `<nav>` produces no Tier 4 guess and falls through as unresolved, same
discipline as every other genuine ambiguity in this spec, rather than a
guess dressed as a fix.

⚠ **Landing gap found by `/qc-council` round 2, must land in the SAME
commit:** the module's own shipped self-test (`test_dom_shape_classifier.py`)
currently tests `classify_landmark_tag` ONLY via `{"tag": "nav"}` fixtures —
`test_non_top_level_landmark_fires` and `test_top_level_landmark_does_not_fire`.
Removing `nav` from the constant makes the first of these FAIL, and turns the
second into a vacuous pass against a now-dead code path (asserting `None` for
an input the function was never going to match anyway) — exactly this
project's own captured failure mode
(`feedback_a_check_with_no_positive_control_passes_against_a_dead_feature`).
Both tests must be re-pointed onto `{"tag": "footer"}` (or `header`) in the
same commit as the constant edit, so `classify_landmark_tag` keeps a real
positive control on the two keys that remain.

This fix is a precondition of Tier 4, not a nice-to-have — until it lands,
Tier 4 is limited to the two already-unambiguous guesses (`hero`,
`card-grid`).

### 10.2 Step 1 — feed the resolved slug into Tiers 1-3 as the parent

Once a real slug is in hand, Tier 4 does nothing further of its own — the
guessed slug becomes the `parent_slug` input to §4's Tier 1/2 and §9's Tier 3,
run exactly as if Spec 44 had produced this identity. No new matching logic.

### 10.3 Step 2 — confidence ceiling, always review-pending, on its OWN isolated gate

`dom_shape_classifier.py`'s confidence is capped ≤ 0.5 by its own design —
lower than anything Spec 44's FR-44-1 trust gate would treat as auto-complete
eligible. Tier 4 therefore NEVER auto-completes, regardless of how clean the
downstream Tier 1-3 field matches are.

⚠ **v1.2.0's "no new review mechanism — same plumbing" claim was checked and
found unsafe (`/qc-council`, v1.3.0).** §7's mechanism, as written, only
triggers for "a group whose identity only cleared Spec 44's Stage A/B with a
falls-to-review outcome" and attaches to "the SAME per-boundary review entry
Spec 44 already creates for that group." A Tier-4 item, by definition (§10
opening condition — no Spec 44 match at all), has no such entry to attach to.
Worse: both tiers were going to write into the SAME
`classless-recognition-log.jsonl`, which is also the exact store FR-44-1(b)
reads for its per-client promotion memory ("once a pattern has cleared review
for a client, later occurrences for the SAME client auto-complete under (a)
alone" — Spec 44 §3/§7). Sharing that log unmodified would have let a Tier-4
row either silently break Tier 4's own "never auto-completes" promise (a
second Tier-4 placement for the same client reading a prior Tier-4 row as
prior approval), or worse, let a ≤0.5-confidence Tier-4 guess satisfy Spec
44's OWN first-look gate for an unrelated, genuinely new real group.

**Fixed — the two systems are now structurally isolated, not just logically
distinct:**

1. **Tier 4 creates its own review entry** when no Spec-44 entry exists for
   the boundary (rather than assuming one to append to) — a new
   `operator-review.html` row, clearly labelled "Tier 4 (dom-shape-derived) —
   always pending, never auto-completable," carrying the classifier's
   confidence score alongside the proposed field mapping.
2. **Every log row in `classless-recognition-log.jsonl` carries an explicit
   `source` field** — `"spec44"` or `"tier4-domshape"`. FR-44-1(b)'s
   per-client promotion scan (Spec 44 §7) is required to filter to
   `source == "spec44"` only. This is a small, additive change to that scan's
   query, not a new mechanism — but it is a REQUIRED change, named here as a
   cross-spec dependency this build must land alongside Tier 4, not an
   optional hardening.

⚠ **Two gaps found by `/qc-council` round 2, both now closed:**

- **Enforceability.** v1.3.0 only wrote this requirement into Spec 45's own
  test plan — a Spec-44-first implementer building from Spec 44 alone would
  never read it and would ship the unfiltered scan exactly as Spec 44 §7
  currently describes it, with no `source` awareness at all. **Spec 44 §7
  itself must be amended in the same commit that ships Tier 4** — add one
  sentence there naming the `source` field and the required filter, not just
  a pointer from Spec 45. This spec cannot land Tier 4 without that companion
  edit; track it as a hard prerequisite, not a nice-to-have.
- **Legacy rows.** Every row Spec 44 writes before this filter lands carries
  NO `source` key at all (the log is append-only and pre-dates this field).
  A filter written as `row["source"] == "spec44"` would either `KeyError` on
  those rows or, if written defensively, silently exclude them from
  FR-44-1(b)'s promotion memory — resetting every existing client's
  first-look state as a side effect of an unrelated Tier 4 ship. **Stated
  explicitly: a row with no `source` key is treated as `source == "spec44"`**
  (the only value that preserves existing promotion memory correctly) — this
  one-line default must be part of the same Spec 44 §7 amendment above.

With this isolation, "same plumbing, different trigger condition" is now
actually true — a Tier-4 row can influence neither Spec 44's trust gate nor
its own future auto-completion, in either direction.

## 11. Test plan

- **Tier 1 fixtures:** the real Eye Care draft's groups resolving to each of
  the 13 covered blocks; a negative control where a draft field key matches
  NOTHING in `array_item_schema` for that pair (must report a gap, never
  guess); a negative control asserting a block NOT in the 13-block coverage
  set produces zero Tier-1 matches (not a crash, not a silent skip that looks
  like success).
- **Tier 2 fixtures:** a field matching exactly one content-bearing attribute
  on its resolved parent (must place); a field matching 2+ candidates on the
  same block (must report ambiguous, never first-by-rowid); a field matching
  only a styling-role attribute (`typography`/`layout`/etc.) — must NOT match,
  proving the content-bearing scoping is real, not decorative.
- **Function-value pre-filter fixtures:** a field whose value is an arrow
  function (must exclude); a field whose NAME looks like a verb but whose
  VALUE is a plain string (must NOT exclude — proves the check is type-based,
  not name-based, per §4.0).
- **§4.1.0 fixtures (new, v1.4.0):** a draft field key exactly matching a
  known `array_attr` (e.g. literal `items` on a resolved `sgs/card-grid`) —
  must be recognised and route each array item through Tier 1's per-item
  logic; the SAME shape with a differently-named field key (e.g. `cards`
  instead of `items`) — must NOT match by name, and must instead appear as a
  candidate in Tier 3's scoring (§9.3), never silently gapped at this step.
- **Tier 3 fixtures:** a nested field matching the parent's own declared
  content-bearing object-typed attribute (§9.1 — must place there, never
  treated as a child block); a nested field matching a STYLING-role object
  attribute name (e.g. `gap`) — must NOT place there (proves §9.1's role
  filter is real); a nested field where BOTH sources of §9.2's candidate set
  are empty (no allow-list, no un-matched array attribute) — must gap
  immediately; **the `sgs/card-grid.items` case specifically, using a
  MISNAMED draft field (not literal `items`)** — confirm it is scored by
  Tier 3's raw-count rule against card-grid's own array attribute as a
  candidate and resolves correctly when the content genuinely matches (this
  replaces the FALSE v1.3.0 fixture claiming Tier 1 handles this case
  upstream — it doesn't, unless the field is literally named `items`); a
  real allow-listed parent (e.g. `sgs/accordion`) with a nested value scoring
  ≥2 raw hits against exactly one candidate with no other candidate tying
  (must resolve); **the exact brand-logo negative control that broke the
  round-1 fix** (a `{name, logo, url, alt, count, variant}`-shaped item
  scored against `sgs/card-grid` as a wrong candidate) — must NOT resolve
  above the correct candidate when a genuinely better-matching real candidate
  exists, and must gap or defer to the correct candidate rather than
  accepting card-grid on the strength of its own attribute richness; a
  candidate scoring exactly 1 raw hit (must gap — the floor is ≥2, not
  "more than zero"); two candidates tying at the same highest raw count
  (must report ambiguous, naming both counts, never resolved by list order);
  a deliberately deep/self-referential test input (must emit a `ContentGap`
  at the depth cap or on visited-set detection, never an unhandled
  `RecursionError`).
- **Role-vocabulary alignment fixture (new, v1.4.0):** a draft field matching
  an `array_item_schema` row whose `role` is `url-href` (or `icon-slug` /
  `state-modifier-boolean`) — must count as a content-bearing match once the
  named `/sgs-update` seeder fix (§4.1.0 point 2) lands; a fixture asserting
  the fix actually changed the seeded value (not just added a code-side
  alias) — read the row back from the DB post-reseed and confirm the stored
  `role` literally equals the `roles.role_name` spelling.
- **Tier 4 fixtures:** each of the two unambiguous classifier guesses (`hero`,
  `card-grid`) resolving to their real slug and feeding correctly into Tier
  1/2; a `cta` guess BEFORE the §10.1 plumbing fix lands (must gap); the same
  guess AFTER `_child_count`/`_has_heading_or_paragraph_sibling` are wired
  into `_bs4_to_dom_dict` (must resolve `sgs/cta-section` vs
  `sgs/whatsapp-cta` correctly on two constructed fixtures, one shaped like
  each); a bare `<nav>` guess (must gap — confirms `nav`'s removal from
  `_LANDMARK_TAG_BLOCK` landed, never silently routed to a header-row block);
  confirm every Tier-4-sourced placement is written review-pending even when
  the downstream Tier 1-3 match is a clean, unambiguous hit; confirm a
  Tier-4 log row carries `source: "tier4-domshape"` and that FR-44-1(b)'s
  per-client promotion scan (Spec 44 §7) skips it — construct a fixture
  client with only Tier-4 rows and assert a genuine new Spec-44 group for
  that client still gets its own forced first-look, not a false pass from
  the Tier-4 rows.
- **FR-45 review-gate test:** a group whose Spec 44 identity match fell to
  review; assert Tier 1/2/3's field placements attach to the same review
  entry and are never applied to live clone output before that review
  clears. Separately: a Tier-4 boundary with NO Spec-44 entry at all; assert
  Tier 4 creates its own new review row rather than erroring on a missing
  entry to append to.
- **Live verification:** re-run against the real Eye Care Birmingham draft with
  `--classless-field-resolve` on; confirm real placements or honest
  review-queue entries via the named surfaces (§6) for every tier; confirm
  the existing BEM-path baseline is unaffected.

## 12. Evidence index

| Source | What |
|---|---|
| `.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md` | The dependency this spec consumes |
| `.claude/reports/2026-09-15-spec45-field-mapping-verification.md` | This session's full DB/code re-verification — the source for every number in §0/§3/§4/§9/§10 |
| `.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md` | Layer 1c (function-value = action) finding, §4.0 |
| This session's 5-persona `/adversarial-council` run (2026-09-15) | The v1.0.0 review — every finding independently re-verified before acceptance, before Tier 3/4 were designed in v1.2.0 |
| This session's `/qc-council` round 1 on Tier 3/Tier 4 (2026-09-15) | Two independent validators hand-traced §9/§10 against real DB rows and code; found the denominator defect (§9.3), the role-count error (§4.2), the unbuildable CTA plumbing claim and the unsafe shared review-gate (§10) — fixed in v1.3.0 |
| This session's `/qc-council` round 2 on the v1.3.0 fixes (2026-09-15) | Verified Tier 4's fixes correct (2 small landing gaps closed in v1.4.0); proved Tier 3's round-1 "fix" changed zero of 14 real outcomes and created a new false positive, and found the `items`-field structural hole — drove the v1.4.0 redesign (§0.2, §4.1.0, §9.2, §9.3). Both rounds' transcripts in this session's conversation, no separate report file yet |
| `.claude/decisions.md` D1074 | Three-round council failure trail for Spec 44's sibling mechanism — the precedent §9's design draws its safety discipline from (finite allow-list scoping, no roster-wide guessing, explicit ambiguity reporting) |
