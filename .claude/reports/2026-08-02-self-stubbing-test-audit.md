---
doc_type: report
project: small-giants-wp
created: 2026-08-02
---

# Self-stubbing / wrong-entry-point test audit

## Why

`converter/tests/test_extraction.py::test_mech_b_scalar_media_dual_art_direction_keeps_both`
passes while art-directed image routing is dead in production: it monkeypatches
`db_lookup.scalar_media_attr_for` (the exact gate that always returns `None` on the
real DB) to return a value, and calls `run_mechanism_b` directly rather than the live
entry point `converter.walk.run_universal_content_walk`. This report searches the rest
of the test suite for the same two shapes.

## Headline counts

- **Pattern 1 (self-stubbing):** 4 confirmed instances — all in `test_extraction.py`,
  all stubbing the same function (`db_lookup.scalar_media_attr_for`), all in the
  `test_mech_b_scalar_media_*` family (the originally-flagged test is one of the four).
- **Pattern 2 (wrong entry point):** same 4 instances also qualify — they call
  `run_mechanism_b` directly, not `walk.run_universal_content_walk`. I did not find any
  *additional* Pattern-2-only instance (a test hitting an internal helper where
  production genuinely never reaches it via that helper) outside this family.
- **Candidates rejected as legitimate:** 15 (listed below).
- **Confidence:** high on the 4 confirmed instances (traced production call path and
  confirmed `scalar_media_attr_for` is queried nowhere else before these tests'
  monkeypatch overrides it); the file itself cannot be edited per this task's scope, so
  no attempt was made to run the tests and observe the DB-backed value directly — that
  would require touching `db_lookup.py`, which is off-limits. The claim that the real
  function returns `None` for every block is taken from the task brief as an established
  fact, not independently re-verified here (read-only scope).

## Pattern 1 — SELF-STUBBING

| Test | File:line | What is stubbed | What production actually does | Blast radius | Confidence |
|---|---|---|---|---|---|
| `test_mech_b_scalar_media_column_emits_scalar_lift` | `converter/tests/test_extraction.py:254` | `db_lookup.scalar_media_attr_for` forced to return `"splitImage"` for `elem == "split-image"` | Live DB: `scalar_media_attr_for` returns `None` for every block — the scalar-media routing branch (Branch A of `run_mechanism_b`) never fires; art-directed/split images fall through to a different (or no) path | **High** — client-facing: hero split-image layouts, any composite with a scalar-media column, silently mis-route on real clones | High |
| `test_mech_b_scalar_media_mobile_modifier_appends_Mobile` | `converter/tests/test_extraction.py:294` | Same stub, plus a real DB-shape fixture for `breakpoint_suffix_rules` | Same as above — this is the mobile-suffix variant of the same dead branch | **High** — mobile-specific image routing (`splitImageMobile`) is the exact behaviour the "W3 LANDED proof" comment says was previously broken; a green test here is currently the only signal anyone has that it stayed fixed, and it can't be | High |
| `test_mech_b_scalar_media_dual_art_direction_keeps_both` | `converter/tests/test_extraction.py:334` | Same stub | Same — the originally-flagged defect. Both `splitImage` and `splitImageMobile` must land from dual `<img>` art-direction; this is unreachable live | **High** — the flagship defect this audit exists to find siblings of | High (already proven) |
| `test_mech_b_scalar_media_no_img_emits_content_gap` | `converter/tests/test_extraction.py:368` | Same stub | Same — tests that a missing `<img>` inside a scalar-media column emits a `ContentGap` rather than silently dropping. Since the branch never activates live, this negative-path guarantee is also unproven in production | **Medium-high** — a real client draft with a scalar-media column and no image should surface a loud gap; instead it silently falls through whatever path handles `scalar_media_attr_for() is None` (untested) | High |

All four share the identical tell: `scalar_media_attr_for` appears in the test's own
purpose (verifying scalar-media routing) as the mocked function, and none of the four
calls the live entry point (`walk.run_universal_content_walk`) — they call
`run_mechanism_b` directly. `walk.run_universal_content_walk` does internally call
`ext.run_mechanism_b` (confirmed at `converter/walk.py` ~line 448), but only as one step
inside broader wiring (`consumed_ids` computation, signature routing, conservation
checks) — none of that surrounding wiring is exercised by these four tests, so a
regression in the wiring between the entry point and `run_mechanism_b` would pass all
four silently.

**Note on scope:** I did not modify `test_extraction.py` per the task's exclusion list.
These findings describe siblings of the already-known defect for the main session's
judgement, not a proposed fix.

## Pattern 2 — WRONG ENTRY POINT (standalone, not already counted above)

None found as a *distinct* instance. Every `run_mechanism_a` / `run_mechanism_b` /
`run_mechanism_leaf` direct-call test I checked either (a) is one of the four Pattern-1
tests above, or (b) is a genuine unit test of that mechanism function in isolation with
no self-stubbing of the gate that makes it reachable (e.g.
`test_mechanism_a_lifts_quote`, `test_hero_cta_multi_button_button_recursion`,
`test_named_leaf_*`) — these call `run_mechanism_a`/`run_mechanism_leaf` directly but
don't fake the DB gate that decides whether the mechanism is reached at all, so a
regression in that gate would still show up elsewhere (and unit-testing a sub-function
directly, without disguising its reachability, is normal test design, not the failure
mode this audit targets).

I ran a second search shape (`grep "run_mechanism_a\|run_mechanism_b\|run_mechanism_leaf" -l`
across `converter/tests/`) to confirm no other file calls these mechanisms directly —
only `test_extraction.py` does. `test_walk_registry.py` and `test_field_extractors.py`
both call through `walk.walk_content` / `walk.run_universal_content_walk` or through
the public resolver functions, which are the real production entry points.

## Candidates I judged LEGITIMATE and why

1. **`test_content_attr_resolver.py`** (3 tests, `db_lookup.SGS_DB` monkeypatched to a
   `tmp_path` sqlite file) — the test builds a *real* sqlite DB with real rows and
   points the module constant at it. This is fixture-supply, not stubbing the function
   under test; the resolution logic itself runs unmodified against real data.
2. **`test_image_alt_companion.py`** (5 tests, same `SGS_DB` pointer-swap pattern) —
   same reasoning as above.
3. **`test_destination_contract.py::test_mf4_ambiguous_layer_attr_raises`** —
   stubs `db_lookup.block_attrs` to construct an artificial ambiguity (two suffixes for
   one CSS property), but the test *first* asserts the real DB actually has both
   suffixes (`{"Shadow", "BoxShadow"}`) so the fixture can't silently drift from
   reality, and the function under test (`attr_for_layer_property`'s ambiguity
   detection) is not itself the mocked thing.
4. **`test_destination_contract.py::test_mf4_single_candidate_still_resolves`** —
   same pattern, single-candidate counterpart; legitimate.
5. **`test_root_supports.py::test_write_responsive_attr_same_tier_same_side_different_value_raises`**
   (and siblings via `_fixed_box_family`) — stubs `db_lookup.box_family_for` to a fixed
   map so the merge-collision logic under test can be exercised deterministically;
   the function under test is the merge/collision guard, not `box_family_for` itself.
6. **`test_field_extractors.py::test_scalar_content_delegates_to_extract_field_value`**
   — deliberately monkeypatches `extract_field_value` to a spy wrapper that still calls
   through to the real implementation, specifically to *prove delegation happens*. This
   is the correct way to test "does A call B", not a disguised gate.
7. **`test_variant_detect.py::test_db_coupling_value_comes_from_variant_slots`** —
   changes the DB-shape mock and asserts the *output changes accordingly*, which
   actively proves the value is DB-sourced rather than hardcoded — the opposite of
   hiding a broken gate.
8. **`test_walk_registry.py::test_null_emit_shape_content_attr_is_loud_content_gap`** —
   calls `walk.run_universal_content_walk` (the real production entry point) directly,
   and stubs `content_attr_for_element`/`capabilities_for`/`block_attrs` to construct a
   scenario the docstring admits is "unreachable on the live DB... this plants it" —
   but this is testing a defensive/loud-failure branch for a hypothetical future state,
   not disguising a currently-broken live gate as working.
9. **`test_button_preset_seed.py::test_step5b_snapshot_overwrites_and_fallback`** —
   stubs `db_lookup.variation_attrs_for` to simulate the framework fallback seed; the
   function under test (`button_preset_colour_attrs`) is not the mocked one. Flagged
   only as a maintenance-fragility note (the docstring admits it's "kept in sync by
   hand" with `assembly.py`), not as a self-stubbing defect.
10. **`test_foreign_identity_lift.py::test_consumed_ids_excludes_the_lifted_element_from_the_child_leg`**
    — monkeypatches identity classification to force a `'nested'` treatment the docstring
    admits the real hero DB doesn't currently produce ("the REAL hero seeds these
    'child', so this plants the edge the real DB doesn't currently exercise"). This is
    testing an internal invariant (`consumed_ids` de-duplication) with full disclosure
    of the gap between fixture and live data, not passing off a broken client-facing
    feature as working. Noted as borderline — see below.
11. **`oracle/test_batch_runner.py::test_a_working_live_probe_produces_at_least_one_landed_cell`**
    — stubs only the network-touching `run_live_fixture`, explicitly to isolate wiring
    from live-browser flakiness; the discovery/attribution/verdict wiring under test
    still runs for real.
12–15. **`orchestrator/test_stage_attribute_promotion.py`** (`_UIMAX_DB`/`_SGS_DB`
    pointer-swaps to real sqlite fixtures, 4+ tests) and
    **`ledger/tests/test_coverage_check.py`** (`_RENDER_ORACLE_DIR` pointer-swaps) —
    same real-fixture-database pattern as items 1–2.

## What I could not determine

- Whether the real `db_lookup.scalar_media_attr_for` genuinely returns `None` for every
  block on the live DB — taken as given from the task brief, not independently
  re-queried (would require reading `sgs-framework.db`, which the task permitted only
  read-only and I judged unnecessary to re-litigate a fact already established by the
  main session's own diagnosis).
- Whether `test_foreign_identity_lift.py`'s "plants an edge the real DB doesn't
  currently exercise" scenario (item 10 above) ever becomes reachable — if the hero
  block's identity classification is ever intentionally changed from `'child'` to
  `'nested'`, this test would start covering real behaviour; until then it's an
  intentionally-synthetic edge case, and I could not determine whether that's considered
  acceptable test debt versus something that should be re-scoped.
- I did not exhaustively grep for `unittest.mock.patch`/`Mock()` usage outside the
  `monkeypatch.setattr` pattern beyond the file list already captured by the initial
  grep (`grep -rln "monkeypatch.setattr|unittest.mock|@patch(|mock.patch("`); no
  additional files surfaced beyond the 23 already covered, but a hand-rolled fake
  object (e.g. a stub class instantiated in place of a real dependency, with no
  `monkeypatch`/`patch` call at all) would not have been caught by this search shape.
  I did not run a third search shape for that narrower case given the time budget.
