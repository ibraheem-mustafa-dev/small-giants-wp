# Plan — Spec 45 Classless Field Resolver (standalone build)

**doc_type:** plan
**Date:** 2026-09-16
**Governing spec:** `.claude/specs/45-CLASSLESS-FIELD-RESOLUTION.md` (v1.6.0)
**Depends on (not built):** `.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (DESIGNED only)

## 1. Goal (plain English)

Spec 45 answers: once we know a classless (no-CSS-class) group of content is
really an `sgs/card-grid`, which JS field in each card becomes the title,
which becomes the badge? Today nothing does this mapping for classless
drafts — only the CSS-classed path has it (`array_content.py`).

**Done looks like:** a new, fully unit-tested resolver module that takes a
draft field + a known parent block slug and returns either a placement
(which attribute it becomes) or an honest, named gap — never a silent guess.
It does **not** yet run on a live clone, because its real input (a resolved
block identity) comes from Spec 44, which isn't built. That wiring is
deliberately deferred (Bean's decision, 2026-09-16) — see §6.

## 2. Scope boundary

**In scope this pass:** Tiers 1–4 of Spec 45, built as pure, fixture-driven
functions per the spec's own build order (§8): Tier 1 → Tier 2 → Tier 3 →
Tier 4, each its own commit. Every fixture in Spec 45 §11.

**Out of scope this pass:**
- Wiring the resolver into a live pipeline run (needs Spec 44's group-identity
  resolver + its `classless-recognition-log.jsonl` / `operator-review.html` /
  `classless-summary.md` surfaces — none exist yet).
- Building Spec 44 itself.
- The `--classless-field-resolve` CLI flag and orchestrator wiring (§8) — flag
  the module as import-only until Spec 44 lands; add the flag when there's a
  real call site.

## 3. Grounding done this session (don't re-derive)

- Real file paths confirmed: `recogniser/sc_var_classifier.py` (pattern to
  mirror), `recogniser/dom_shape_classifier.py` (Tier 4 target), `converter/
  db/db_lookup.py` (`_content_bearing_roles()`, `nested_attr_named()`,
  `_variant_modifier_tiebreak()` all exist as cited), `converter/resolvers/
  array_content.py` (Tier 1's sibling mechanism), `converter/services/
  extraction.py` (Tier 3's `_try_route_generic_child_once` reference chain).
- `array_item_schema` schema: `(block_slug, array_attr, field_key,
  field_order, role)`, PK on the first three.
- `roles` schema: `(role_name PK, classification CHECK IN
  ('content-bearing','styling-behaviour','unclassified'), description,
  created_at)`.
- Confirmed Spec 44 has no code yet (`grep -rli classless` across
  `plugins/sgs-blocks/scripts` finds no group-identity resolver, no
  `--classless-match` flag, no recognition-log writer).

## 4. Work units

```
UNIT: T1-roles-seed
PURPOSE: Add url-href / icon-slug / state-modifier-boolean to `roles` as
         content-bearing (Spec 45 §4.1.0 point 2). Zero change to any live
         extraction path or array_item_schema row.
FILES: plugins/sgs-blocks/scripts/sgs-update-v2.py (seeder) — locate roles
       seeding block; sgs-framework.db (roles table, 3 new rows)
INPUTS: none
OUTPUTS: unblocks Tier 1 Step 2 (role-based fallback) fixtures
TOOLING: /sgs-update, sqlite3
ON-CRITICAL-PATH: no (Tier 1 Step 1 direct-match doesn't need it)
TEST: query roles post-seed; confirm all three rows present with
      classification='content-bearing'

UNIT: T1-resolver-core
PURPOSE: New module implementing §4.0 pre-filter + §4.1.0 Step A (array-field
         identification) + Tier 1 Step 1/2 (direct-key match, role fallback)
FILES: plugins/sgs-blocks/scripts/recogniser/classless_field_resolver.py (new)
       plugins/sgs-blocks/scripts/recogniser/test_classless_field_resolver.py (new)
INPUTS: parent_slug (str), draft field dict — fixture-supplied, not
        pipeline-supplied yet
OUTPUTS: placement decision | named gap, per field
TOOLING: sqlite3 (via db_lookup.py's _content_bearing_roles()), ast module
         (function-value pre-filter)
ON-CRITICAL-PATH: yes
TEST:
  Happy: sgs/card-grid.items literal 'items' key, field 'title' direct-matches
         array_item_schema row -> placed.
  Edge: field value is an arrow function -> excluded by §4.0, never reaches
        Tier 1 at all (fixture: name looks like a verb, value is a string ->
        must NOT exclude).
  Fail: field key doesn't match any array_attr, value is a nested object ->
        falls through to Tier 3 candidacy (not built yet this unit — assert
        it returns the correct "needs Tier 3" signal, not a crash).
  Integration: role-based fallback fires only after T1-roles-seed lands
         (skip/xfail marker until then).

UNIT: T2-resolver
PURPOSE: Tier 2 — parent's own scalar attribute, content-bearing-role
         restricted, ambiguity-safe (2+ candidates = gap, never first-by-row)
FILES: same module, additive functions + tests
INPUTS: parent_slug, field
OUTPUTS: placement | ambiguous gap | not-content-bearing (excluded)
TOOLING: db_lookup.py::_content_bearing_roles()
ON-CRITICAL-PATH: yes
TEST: per Spec 45 §11 Tier 2 fixtures (single match / 2+ match ambiguous /
      styling-role-only field must not match)

UNIT: T3-resolver
PURPOSE: Tier 3 — nested child-block matching (Step 0 canonical_slot-widened
         own-attribute check, bounded candidate set with orphan + InnerBlocks
         verification gates, raw-hit-count scoring w/ floor+margin, recursion
         w/ depth cap + visited-set)
FILES: same module, additive functions + tests
INPUTS: parent_slug, nested field (object or array-of-objects)
OUTPUTS: placement | ambiguous gap | empty-candidate gap
TOOLING: db_lookup.py (block_composition, accepts_allowed_blocks), a
         one-time per-block InnerBlocks-in-edit.js check (§9.2 gate 2)
ON-CRITICAL-PATH: yes
TEST: per Spec 45 §11 Tier 3 fixtures — own-attribute placement, styling-role
      exclusion, empty-candidate gap, misnamed sgs/card-grid.items case,
      brand-logo negative control, floor-of-2 gap, tie-gap, depth-cap fixture

UNIT: T4-classifier-fix
PURPOSE: dom_shape_classifier.py plumbing fix (§10.1) — _child_count /
         _has_heading_or_paragraph_sibling precomputed keys; nav removed from
         _LANDMARK_TAG_BLOCK; existing self-test repointed onto
         header/footer fixtures (not nav)
FILES: plugins/sgs-blocks/scripts/recogniser/dom_shape_classifier.py
       plugins/sgs-blocks/scripts/recogniser/test_dom_shape_classifier.py
INPUTS: real bs4 DOM elements (via _bs4_to_dom_dict's 3 real call sites)
OUTPUTS: fixed classify_button_shaped / classify_landmark_tag
TOOLING: bs4
ON-CRITICAL-PATH: yes
TEST: per Spec 45 §11 Tier 4 fixtures — cta ambiguity resolved after fix,
      bare <nav> gaps (not silently routed), existing landmark tests
      re-pointed and still pass

UNIT: T4-resolver-wire
PURPOSE: Tier 4 — feed resolved slug into T1-3 as parent; isolated review-gate
         (own operator-review row when no Spec-44 entry exists; `source`
         discriminator on every log row — deferred until Spec 44's log exists,
         built as a no-op-safe interface for now)
FILES: same module, additive functions + tests
INPUTS: dom_shape_classifier.py's bare guess
OUTPUTS: placement fed through T1-3, always review-pending
TOOLING: n/a
ON-CRITICAL-PATH: yes
TEST: hero/card-grid guesses resolve; cta gaps before T4-classifier-fix lands,
      resolves after
```

### Dependencies

- `T1-roles-seed` **informs** `T1-resolver-core` (soft — Step 1 works without
  it; Step 2 fixtures are gated/skipped until it lands).
- `T1-resolver-core` **blocks** `T2-resolver`, `T3-resolver` (§9.3 explicitly
  reuses Tier 1/2's matchers).
- `T2-resolver` **blocks** `T3-resolver` (Step 0 reuses Tier 2's
  content-bearing-role check).
- `T3-resolver` **blocks** `T4-resolver-wire` (§10.2 feeds into Tier 3).
- `T4-classifier-fix` **blocks** `T4-resolver-wire` (named precondition, §10.1).
- `T1-roles-seed` is independent of everything except its own Step-2 fixtures
  — can run any time before those fixtures are asserted.

**Critical path:** T1-roles-seed (parallel) → T1-resolver-core → T2-resolver
→ T3-resolver → T4-classifier-fix (parallel with T3) → T4-resolver-wire.

## 5. Gates

```
GATE 1: Tier 1 done
AFTER: T1-roles-seed, T1-resolver-core
PASS CRITERIA: all §11 Tier 1 + §4.0 + §4.1.0 fixtures green, including the
               negative controls (block outside 13-block coverage -> zero
               matches, not a crash)
TYPE: auto-gate (pytest)
DECISION POINT: none — proceed to Tier 2 automatically once green

GATE 2: Tier 2 done
AFTER: T2-resolver
PASS CRITERIA: §11 Tier 2 fixtures green (ambiguity gap proven, styling-role
               exclusion proven)
TYPE: auto-gate

GATE 3: Tier 3 done (review-gate — this is the load-bearing scoring rule)
AFTER: T3-resolver
PASS CRITERIA: §11 Tier 3 fixtures green including the brand-logo negative
               control and the misnamed-items case; §9.2's two verification
               gates (orphan filter, InnerBlocks cross-check) proven against
               the LIVE DB, not a fixture DB copy
DECISION POINT: show Bean the brand-logo negative-control result before
                calling Tier 3 "trusted" — this is the exact rule that broke
                three times already (v1.3.0/v1.4.0/first v1.5.0 draft)
TYPE: review-gate

GATE 4: Tier 4 done
AFTER: T4-classifier-fix, T4-resolver-wire
PASS CRITERIA: §11 Tier 4 fixtures green
TYPE: auto-gate
```

## 6. What happens after all four tiers pass

Park a follow-up: wiring this resolver into a live pipeline run requires
Spec 44's group-identity resolver + its three write surfaces. That's a
separate, larger piece of work — log it to `.claude/parking.md` under the
cloning-pipeline bucket once Tier 4 ships, don't build it opportunistically
mid-way through this pass.

## 7. Smallest first action

Add the 3 missing roles to `roles` (T1-roles-seed) — a single SQL insert via
`/sgs-update`'s seeder, ~5 min, zero dependencies. Then start
`T1-resolver-core`'s pre-filter + Step A (the part that doesn't need the
roles fix at all).

## 8. Commit plan

One commit per UNIT that lands a working, tested increment — matches R-31-5
(phases never ship as single commits) and Spec 45 §8's own per-tier commit
recommendation. Roles seed can ride in the same commit as T1-resolver-core
if it lands same-session, or its own commit if it lands first.
