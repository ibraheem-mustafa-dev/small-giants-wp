"""Self-test for classless_trust_gate.py — Spec 44 FR-44-1, §7, §9, §10.

FIXTURE DISCIPLINE, inherited from Tasks 1-3. The Stage A results driving the gate are
REAL: a temp DB seeded by Task 1's own seeder from the real `sgs/buybox` /
`sgs/product-card` PHP, matched by Task 2's real recogniser. Nothing fabricates a
`RenderMatchResult`, so a clause-(a) verdict here is a verdict about real seeded rows.
The audit log is always a TEMP path — the git-tracked
`recogniser/classless-recognition-log.jsonl` is never written by a test run, which
`test_the_real_log_was_not_written` enforces rather than claims.

THE TWO CONTROLS THIS SUITE EXISTS FOR:

1. **§10's FR-44-1(b) test.** A new client's first occurrence of an
   already-seen-elsewhere pattern is forced to review REGARDLESS of match quality; a
   second occurrence for the SAME client then auto-completes under clause (a) alone.

2. **D1074's negative control.** A Spec-45 `"tier4-domshape"` row can NEVER satisfy
   (b), however many times it repeats for that client — and the byte-identical row
   under `source: "spec44"` CAN. Without the second half, the first would pass equally
   against a filter that rejects everything.

3. **Front C Task 1's real-human-approval control.** A `KIND_DECISION` row — including
   the run's own automatically-written "forced to review once" row — must NEVER satisfy
   (b) on its own, however many times it repeats. Only a `KIND_APPROVAL` row, written by
   `record_human_approval()` (the `--approve` CLI's only caller), opens the gate. This is
   the fix for the exact hole the 2026-09-17 `/adversarial-council` converged on: before
   it, the pipeline's own log write satisfied "forced human review".
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import array_schema_eliminator as stage_b  # noqa: E402
import classless_trust_gate as mod  # noqa: E402
import render_repeater_recogniser as stage_a  # noqa: E402
import render_repeater_seeder as seeder  # noqa: E402
import simple_html_review_report as review  # noqa: E402

LIVE_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
BUYBOX = "sgs/buybox"
CLIENT = "eye-care-ward-end"
OTHER_CLIENT = "mamas-munches"

# gallery-col.php's real seeded per-item sequence (Task 2 measured it; asserted below
# rather than trusted, so a reseed that changes shape fails here loudly).
THUMB_STRIP_ROLES = (seeder.ROLE_ACTION, seeder.ROLE_CURRENT, seeder.ROLE_LABEL)

_TEMP: list[str] = []


def _tmp(suffix: str) -> Path:
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    _TEMP.append(path)
    return Path(path)


def _fixture_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_tmp(".db")))
    live = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    try:
        for table in ("blocks", "block_attributes", "block_composition",
                      "array_item_schema", "roles"):
            ddl = live.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)
            ).fetchone()[0]
            conn.execute(ddl)
            rows = live.execute(f"SELECT * FROM {table}").fetchall()
            if rows:
                conn.executemany(
                    f"INSERT INTO {table} VALUES ({','.join('?' * len(rows[0]))})", rows)
    finally:
        live.close()
    seeder.seed_render_repeaters(conn, slugs=[BUYBOX, "sgs/product-card"])
    return conn


def _exact_stage_a(conn: sqlite3.Connection) -> stage_a.RenderMatchResult:
    """A REAL clause-(a)-satisfying result: buybox's own seeded thumbnail sequence,
    narrowed to one survivor by the capability only buybox declares."""
    group = stage_a.DraftGroup(
        roles=THUMB_STRIP_ROLES,
        parent=stage_a.ParentContext(required_capabilities=frozenset({"add-to-cart"})),
    )
    return stage_a.recognise_render_time_repeater(group, CLIENT, conn=conn)


def _partial_stage_a(conn: sqlite3.Connection) -> stage_a.RenderMatchResult:
    """The real §4.1 worked example — narrowed to one candidate, leaf still PARTIAL."""
    group = stage_a.DraftGroup(
        roles=(seeder.ROLE_ACTION, seeder.ROLE_LABEL, seeder.ROLE_IMAGE),
        parent=stage_a.ParentContext(required_capabilities=frozenset({"add-to-cart"})),
    )
    return stage_a.recognise_render_time_repeater(group, CLIENT, conn=conn)


def _row(client: str, block: str, source: str | None,
         match_type: str = mod.MATCH_TYPE_RENDER_REPEATER,
         kind: str = mod.KIND_APPROVAL, approved: bool = True) -> dict:
    """Defaults to an APPROVAL-shaped row (Task 1) — the shape that satisfies (b) — so
    most fixtures don't need to spell it out. Pass `kind=mod.KIND_DECISION` explicitly
    to build the automatic-write shape that must NEVER satisfy (b) on its own."""
    row = {"client_slug": client, "block": block, "match_type": match_type, "kind": kind}
    if kind == mod.KIND_APPROVAL:
        row["approved"] = approved
        row["approver"] = "test-fixture"
    else:
        row["outcome"] = mod.OUTCOME_REVIEW
    if source is not None:
        row["source"] = source
    return row


# ---------------------------------------------------------------- ground truth

def test_the_fixture_stage_a_results_are_real() -> None:
    conn = _fixture_db()
    try:
        seq = stage_a.candidate_role_sequences(conn, BUYBOX)["gallery-col.php"]
        assert seq == THUMB_STRIP_ROLES, seq
        exact = _exact_stage_a(conn)
        partial = _partial_stage_a(conn)
    finally:
        conn.close()
    assert exact.matched and exact.block_slug == BUYBOX, exact
    assert exact.match_quality == stage_a.EXACT, exact.match_quality
    assert partial.match_quality == stage_a.PARTIAL, partial.match_quality
    print(f"  PASS  fixtures are real: gallery-col.php seeds {seq}; EXACT and PARTIAL "
          "Stage A results both produced by the real recogniser")


# ---------------------------------------------------------------- §7 audit log

def test_a_missing_log_is_an_empty_log_not_an_error() -> None:
    assert mod.read_log(Path(tempfile.gettempdir()) / "sgs44-does-not-exist.jsonl") == ()
    print("  PASS  §7: a log that does not exist yet reads as empty, never raises")


def test_a_half_written_line_does_not_hide_the_rows_above_it() -> None:
    p = _tmp(".jsonl")
    p.write_text(
        json.dumps(_row(CLIENT, BUYBOX, mod.SOURCE_SPEC44)) + "\n"
        + '{"client_slug": "truncated"\n'
        + json.dumps(_row(OTHER_CLIENT, BUYBOX, mod.SOURCE_SPEC44)) + "\n",
        encoding="utf-8")
    rows = mod.read_log(p)
    assert len(rows) == 2, rows
    print("  PASS  §7: an interrupted run's half-written line is skipped; the rows "
          "above it still read")


def test_append_is_append_only() -> None:
    p = _tmp(".jsonl")
    first = mod.ClasslessDecision(client_slug=CLIENT, boundary_id="b1", block=BUYBOX,
                                  match_type=mod.MATCH_TYPE_RENDER_REPEATER)
    mod.append_decision(first, p)
    mod.append_decision(first, p)
    rows = mod.read_log(p)
    assert len(rows) == 2, rows
    assert all(r["source"] == mod.SOURCE_SPEC44 for r in rows), rows
    print("  PASS  §7: rows append, never rewrite; every written row states "
          f"source='{mod.SOURCE_SPEC44}' explicitly")


def test_a_row_with_no_source_key_reads_as_spec44() -> None:
    """v2.3.1's forward-compatibility default — the log is brand new, so this can
    only ever be exercised by a fixture, which is exactly why it has one."""
    assert mod.row_source(_row(CLIENT, BUYBOX, None)) == mod.SOURCE_SPEC44
    assert mod.pattern_precedent([_row(CLIENT, BUYBOX, None)], CLIENT, BUYBOX,
                                 mod.MATCH_TYPE_RENDER_REPEATER) is True
    print("  PASS  v2.3.1: a row with no `source` key is treated as spec44")


# ------------------------------------------- D1074 negative control (the big one)

def test_a_tier4_row_can_never_satisfy_clause_b() -> None:
    """Spec 45 §10.3's Tier 4 writes to THIS log from a <=0.5 classifier that is
    always review-pending. Twenty of its rows for one client must still leave that
    client's first-look gate closed — and the byte-identical row under `spec44` must
    open it, or this assertion would pass against a filter that rejects everything."""
    tier4 = [_row(CLIENT, BUYBOX, mod.SOURCE_TIER4) for _ in range(20)]
    assert mod.pattern_precedent(tier4, CLIENT, BUYBOX,
                                 mod.MATCH_TYPE_RENDER_REPEATER) is False
    same_but_spec44 = [dict(r, source=mod.SOURCE_SPEC44) for r in tier4]
    assert mod.pattern_precedent(same_but_spec44, CLIENT, BUYBOX,
                                 mod.MATCH_TYPE_RENDER_REPEATER) is True
    print("  PASS  D1074 negative control: 20x tier4-domshape rows leave (b) CLOSED; "
          "the same 20 rows under source='spec44' open it")


def test_a_tier4_row_cannot_auto_complete_a_real_exact_match() -> None:
    """The same control at the GATE, not just the filter — a Tier-4 row must not turn
    a genuinely EXACT Stage A match into an auto-completion."""
    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
    finally:
        conn.close()
    decision = mod.evaluate(exact, None, CLIENT,
                            [_row(CLIENT, BUYBOX, mod.SOURCE_TIER4)] * 5,
                            auto_complete_enabled=True, boundary_id="b1")
    assert decision.clause_a is True, decision.reasons
    assert decision.clause_b is False, decision.reasons
    assert decision.outcome == mod.OUTCOME_REVIEW, decision.outcome
    assert decision.block_markup == "", decision.block_markup
    print("  PASS  D1074 negative control at the gate: clause (a) TRUE, clause (b) "
          "still closed by 5 tier4 rows, nothing emitted")


def test_static_leaf_never_changes_clause_a_or_the_outcome() -> None:
    """Front C Task 4's core control. A real EXACT match's `_clause_a()`/`evaluate()`
    result must be BYTE-IDENTICAL whether `static_leaf` is None, an EXACT corroboration,
    or even a fabricated NONE/mismatched one — proving the trust gate genuinely never
    reads it, not merely that no test happens to exercise a case where it would matter.
    """
    import dataclasses

    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
    finally:
        conn.close()
    assert exact.static_leaf is None, "fixture builds no static_roles — sanity check"

    fabricated_good = stage_a.LeafMatch(
        block_slug=BUYBOX, source_file="gallery-col.php",
        candidate_roles=(seeder.ROLE_IMAGE,), window=(0, 1), quality=stage_a.EXACT,
        unmatched_draft_roles=(), unmatched_candidate_roles=(),
        merged_shape_hypothesis=False)
    fabricated_bad = dataclasses.replace(
        fabricated_good, quality=stage_a.NONE,
        unmatched_draft_roles=(seeder.ROLE_IMAGE,), unmatched_candidate_roles=())

    baseline = mod.evaluate(exact, None, CLIENT, [], True, boundary_id="b")
    with_good = mod.evaluate(dataclasses.replace(exact, static_leaf=fabricated_good),
                             None, CLIENT, [], True, boundary_id="b")
    with_bad = mod.evaluate(dataclasses.replace(exact, static_leaf=fabricated_bad),
                            None, CLIENT, [], True, boundary_id="b")

    assert baseline.clause_a == with_good.clause_a == with_bad.clause_a, (
        baseline.clause_a, with_good.clause_a, with_bad.clause_a)
    assert baseline.outcome == with_good.outcome == with_bad.outcome
    assert baseline.reasons == with_good.reasons == with_bad.reasons, (
        "reasons must be identical too — static_leaf only ever reaches the SIGNAL string")
    # The one thing that DOES differ — the informational signal text.
    assert "static-shape corroboration" not in baseline.signal
    assert "static-shape corroboration (gallery-col.php): exact" in with_good.signal
    assert "static-shape corroboration (gallery-col.php): none" in with_bad.signal
    print("  PASS  Task 4: static_leaf changes ONLY the signal text — clause_a, outcome "
          "and reasons are byte-identical with None / a real EXACT / a fabricated NONE")


# ---------------------------------------------------------------- FR-44-1(a)

def test_clause_a_needs_exact_sole_survivor_and_no_hypothesis() -> None:
    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
        partial = _partial_stage_a(conn)
        # No capability supplied -> the documented buybox/product-card collision.
        ambiguous = stage_a.recognise_render_time_repeater(
            stage_a.DraftGroup(roles=THUMB_STRIP_ROLES), CLIENT, conn=conn)
    finally:
        conn.close()
    ok, why = mod._clause_a(exact)
    assert ok is True and why == [], why
    ok_p, why_p = mod._clause_a(partial)
    assert ok_p is False and any("partial" in w for w in why_p), why_p
    assert ambiguous.matched is False, ambiguous.block_slug
    print(f"  PASS  FR-44-1(a): EXACT+sole survivor clears; PARTIAL does not "
          f"({why_p[0]}); un-narrowed is not a match at all")


def test_diversity_floor_refuses_a_single_role_repeated_sequence() -> None:
    """Front C Task 2 — Ship-PM's council finding. A three-line paragraph (heading +
    subheading + body, each reading as `label`) presents the identical SEQUENCE shape
    as a real per-item repeater whose every item happens to share one role. Built as a
    synthetic RenderMatchResult (not a real DB match — there is no requirement a real
    block ever produces this shape; the point is that `_clause_a` must refuse it on
    structure alone, independent of which block it claims to be) rather than reused
    from a real DB fixture."""
    narrowing = stage_a.NarrowingResult(
        roster=("sgs/fake-labels-block",), survivors=("sgs/fake-labels-block",),
        excluded=(), repetition_conclusive=True, capability_conclusive=True)
    leaf = stage_a.LeafMatch(
        block_slug="sgs/fake-labels-block", source_file="fake.php",
        candidate_roles=(seeder.ROLE_LABEL, seeder.ROLE_LABEL, seeder.ROLE_LABEL),
        window=(0, 3), quality=stage_a.EXACT,
        unmatched_draft_roles=(), unmatched_candidate_roles=(),
        merged_shape_hypothesis=False)
    thin = stage_a.RenderMatchResult(
        matched=True, block_slug="sgs/fake-labels-block", match_quality=stage_a.EXACT,
        client_slug=CLIENT, narrowing=narrowing, leaf=leaf)
    ok, why = mod._clause_a(thin)
    assert ok is False and any("distinct role kind" in w for w in why), why

    # Positive control on the SAME machinery: real buybox thumbnails (3 distinct
    # kinds) must still clear the floor — proves the check discriminates, not blocks.
    rich_leaf = stage_a.LeafMatch(
        block_slug=BUYBOX, source_file="gallery-col.php",
        candidate_roles=THUMB_STRIP_ROLES, window=(0, 3), quality=stage_a.EXACT,
        unmatched_draft_roles=(), unmatched_candidate_roles=(),
        merged_shape_hypothesis=False)
    rich = stage_a.RenderMatchResult(
        matched=True, block_slug=BUYBOX, match_quality=stage_a.EXACT,
        client_slug=CLIENT,
        narrowing=stage_a.NarrowingResult(
            roster=(BUYBOX,), survivors=(BUYBOX,), excluded=(),
            repetition_conclusive=True, capability_conclusive=True),
        leaf=rich_leaf)
    ok_rich, why_rich = mod._clause_a(rich)
    assert ok_rich is True and why_rich == [], why_rich
    print("  PASS  Task 2: a 3x-label single-kind sequence is refused as insufficient "
          "diversity; the real 3-distinct-kind buybox thumbnail sequence still clears")


def test_a_merged_shape_hypothesis_never_clears_clause_a() -> None:
    """Task 2's disclosed limit: where one source_file holds two repeaters, an EXACT
    match on a WINDOW is a hypothesis about the per-item shape, not a genuine exact
    structural match. The gate must refuse it — proven on the real sgs/product-card,
    whose render.php really does hold two repeaters."""
    conn = _fixture_db()
    try:
        seqs = stage_a.candidate_role_sequences(conn, "sgs/product-card")
        merged = seqs["render.php"]
        assert len(merged) > len(THUMB_STRIP_ROLES), merged
        windowed = stage_a.recognise_render_time_repeater(
            stage_a.DraftGroup(
                roles=THUMB_STRIP_ROLES,
                parent=stage_a.ParentContext(
                    required_capabilities=frozenset({"cta-url"})),
            ), CLIENT, conn=conn)
    finally:
        conn.close()
    assert windowed.matched is True and windowed.block_slug == "sgs/product-card"
    assert windowed.leaf.merged_shape_hypothesis is True, windowed.leaf
    assert windowed.match_quality == stage_a.EXACT, windowed.match_quality
    ok, why = mod._clause_a(windowed)
    assert ok is False and any("hypothesis" in w for w in why), why
    print(f"  PASS  FR-44-1(a): an EXACT match on a sub-file window of {merged} is "
          "refused as a merged-shape hypothesis, not auto-completed")


# ------------------------------------------------- §10's FR-44-1(b) requirement

def test_first_occurrence_for_a_new_client_is_forced_to_review() -> None:
    """§10, first half: 'assert it is forced to review once regardless of match
    quality'. The pattern is already established for ANOTHER client, and the match is
    a genuine EXACT one — it still must not auto-complete."""
    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
    finally:
        conn.close()
    precedent = [_row(OTHER_CLIENT, BUYBOX, mod.SOURCE_SPEC44)]
    decision = mod.evaluate(exact, None, CLIENT, precedent,
                            auto_complete_enabled=True, boundary_id="b1")
    assert decision.clause_a is True, decision.reasons
    assert decision.clause_b is False, decision.reasons
    assert decision.outcome == mod.OUTCOME_REVIEW, decision.outcome
    assert any("first occurrence" in r for r in decision.reasons), decision.reasons
    print("  PASS  FR-44-1(b): a pattern cleared for another client does NOT carry "
          "over — a new client's first occurrence is forced to review despite EXACT")


def test_a_decision_row_alone_never_opens_the_gate_no_matter_how_many_runs() -> None:
    """Front C Task 1's core control. Before the approval split, appending the run's
    OWN forced-to-review row was enough to auto-complete the very next run — the
    pipeline's log write satisfying the gate that exists to force a HUMAN look. This
    replays THREE runs, each appending its own decision row, and asserts every single
    one still falls to review: a decision row is never proof anyone looked, however
    many times it repeats."""
    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
    finally:
        conn.close()
    log = _tmp(".jsonl")
    outcomes = []
    for i in range(3):
        d = mod.evaluate(exact, None, CLIENT, mod.read_precedent(log),
                         auto_complete_enabled=True, boundary_id=f"b{i}")
        mod.append_decision(d, log)
        outcomes.append(d.outcome)
    assert outcomes == [mod.OUTCOME_REVIEW] * 3, outcomes
    print("  PASS  Task 1: 3 runs, each appending its own decision row, ALL fall to "
          "review — no decision row ever satisfies (b) on its own")


def test_second_occurrence_for_the_same_client_auto_completes_under_a_alone() -> None:
    """§10, second half, as amended by Front C Task 1: what actually opens the gate
    between runs is a HUMAN's `record_human_approval()` call, not the pipeline's own
    review-row write. The first run's decision row is appended and asserted to still
    NOT satisfy (b) on its own; only after the explicit approval does the next run
    auto-complete under (a) alone."""
    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
    finally:
        conn.close()
    log = _tmp(".jsonl")
    first = mod.evaluate(exact, None, CLIENT, mod.read_precedent(log),
                         auto_complete_enabled=True, boundary_id="b1")
    mod.append_decision(first, log)
    assert first.outcome == mod.OUTCOME_REVIEW, first.outcome

    still_unapproved = mod.evaluate(exact, None, CLIENT, mod.read_precedent(log),
                                    auto_complete_enabled=True, boundary_id="b1b")
    assert still_unapproved.outcome == mod.OUTCOME_REVIEW, still_unapproved.reasons

    mod.record_human_approval(CLIENT, BUYBOX, mod.MATCH_TYPE_RENDER_REPEATER,
                              approver="bean", path=log)

    second = mod.evaluate(exact, None, CLIENT, mod.read_precedent(log),
                          auto_complete_enabled=True, boundary_id="b2")
    assert second.clause_a is True and second.clause_b is True, second.reasons
    assert second.outcome == mod.OUTCOME_AUTO, second.reasons
    assert second.block_markup == "<!-- wp:sgs/buybox /-->", second.block_markup
    print("  PASS  FR-44-1(b): the run's own review row does NOT open the gate; the "
          f"SECOND occurrence auto-completes only after record_human_approval() -> "
          f"{second.block_markup}")


def test_record_human_approval_requires_a_named_approver() -> None:
    log = _tmp(".jsonl")
    for bad in ("", "   "):
        try:
            mod.record_human_approval(CLIENT, BUYBOX, mod.MATCH_TYPE_RENDER_REPEATER,
                                      approver=bad, path=log)
            raise AssertionError(f"expected ValueError for approver={bad!r}")
        except ValueError:
            pass
    row = mod.record_human_approval(CLIENT, BUYBOX, mod.MATCH_TYPE_RENDER_REPEATER,
                                    approver="bean", path=log)
    assert row["kind"] == mod.KIND_APPROVAL and row["approver"] == "bean", row
    assert row["approved"] is True, row
    print("  PASS  Task 1: an unattributed approval is refused (ValueError); a real "
          "one records kind=approval, approved=True, approver='bean'")


def test_a_run_cannot_satisfy_its_own_first_look_gate() -> None:
    """The snapshot rule. §7's literal wording, against a log the run is appending to,
    would let boundary 2 of the SAME run find boundary 1's forced-review row and
    auto-complete — the 'one-time human look' having happened to nobody. Precedent is
    therefore read ONCE per run; this asserts that snapshot is what the gate sees.

    Extended for Task 1: a FRESH read after only a decision-row write (no approval)
    must STILL be review — proven separately and exhaustively by
    `test_a_decision_row_alone_never_opens_the_gate_no_matter_how_many_runs`. Here the
    fresh-read control is the human approval itself, which is the only thing that
    should ever change the outcome of an identical re-evaluation."""
    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
    finally:
        conn.close()
    log = _tmp(".jsonl")
    snapshot = mod.read_precedent(log)          # taken once, at run start
    first = mod.evaluate(exact, None, CLIENT, snapshot, True, boundary_id="b1")
    mod.append_decision(first, log)
    second = mod.evaluate(exact, None, CLIENT, snapshot, True, boundary_id="b2")
    assert first.outcome == mod.OUTCOME_REVIEW
    assert second.outcome == mod.OUTCOME_REVIEW, second.reasons
    # A fresh read after only the decision row (no approval) is STILL review.
    fresh_unapproved = mod.evaluate(exact, None, CLIENT, mod.read_precedent(log), True,
                                    boundary_id="b3")
    assert fresh_unapproved.outcome == mod.OUTCOME_REVIEW, fresh_unapproved.reasons
    # And the real control: only a human approval opens the gate on the next read.
    mod.record_human_approval(CLIENT, BUYBOX, mod.MATCH_TYPE_RENDER_REPEATER,
                              approver="bean", path=log)
    fourth = mod.evaluate(exact, None, CLIENT, mod.read_precedent(log), True,
                          boundary_id="b4")
    assert fourth.outcome == mod.OUTCOME_AUTO, fourth.reasons
    print("  PASS  snapshot rule: a row written THIS run cannot open THIS run's gate; "
          "a fresh read after a decision-row-only write still doesn't; only "
          "record_human_approval() opens it")


# ---------------------------------------------------------------- §9 rollout

def test_auto_complete_is_off_unless_the_flag_is_set() -> None:
    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
    finally:
        conn.close()
    precedent = [_row(CLIENT, BUYBOX, mod.SOURCE_SPEC44)]
    off = mod.evaluate(exact, None, CLIENT, precedent, auto_complete_enabled=False)
    on = mod.evaluate(exact, None, CLIENT, precedent, auto_complete_enabled=True)
    assert off.outcome == mod.OUTCOME_REVIEW, off.outcome
    assert off.clause_a is True and off.clause_b is True, off.reasons
    assert any("auto-complete is off" in r for r in off.reasons), off.reasons
    assert on.outcome == mod.OUTCOME_AUTO, on.reasons
    print("  PASS  §9: both clauses can be TRUE and the outcome is still review while "
          "--classless-auto-complete is off; the flag is the only difference")


def test_emitted_markup_invents_nothing() -> None:
    """§4.4's correction: buybox declares no `sourceMode` at all, and inventing one
    would be the undeclared-attribute trap. The repeater needs no attribute."""
    markup = mod.emit_block_markup(BUYBOX)
    assert markup == "<!-- wp:sgs/buybox /-->", markup
    assert "sourceMode" not in markup
    con = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    has_source_mode = con.execute(
        "SELECT COUNT(*) FROM block_attributes WHERE block_slug=? AND attr_name='sourceMode'",
        (BUYBOX,)).fetchone()[0]
    con.close()
    assert has_source_mode == 0, "buybox now declares sourceMode — re-read §4.4"
    print("  PASS  §4.4: bare block comment, no attributes invented (verified live: "
          "sgs/buybox declares 0 sourceMode attributes)")


# ---------------------------------------------------------------- Stage B policy

def test_stage_b_never_auto_completes() -> None:
    """The scope call, asserted. Stage B resolves field IDENTITY; no value-extraction
    path exists, so emitting the block would emit it EMPTY. Even with a precedent row
    and the flag on, the outcome is review, and the reason says why."""
    result = stage_b.SchemaMatchResult(
        ran=True, matched=True, block_slug="sgs/brand-strip", array_attr="logos",
        match_quality=stage_a.EXACT, client_slug=CLIENT,
        elimination=stage_b.EliminationResult((), ("sgs/brand-strip.logos",), ()),
        fields=(stage_b.FieldResolution("name", stage_b.TRANSFERRED,
                                        field_key="name", matched_by="direct-key"),),
    )
    precedent = [_row(CLIENT, "sgs/brand-strip", mod.SOURCE_SPEC44,
                      mod.MATCH_TYPE_ARRAY_SCHEMA)]
    decision = mod.evaluate(None, result, CLIENT, precedent, auto_complete_enabled=True)
    assert decision.stage == mod.STAGE_B
    assert decision.clause_b is True, decision.reasons
    assert decision.outcome == mod.OUTCOME_REVIEW, decision.outcome
    assert decision.block_markup == ""
    assert any("emitting this block would emit it empty" in r for r in decision.reasons)
    assert decision.fields, "the per-field conservation record must reach review"
    print("  PASS  scope: a Stage B match with clause (b) satisfied and the flag ON "
          "still routes to review, carrying its per-field record")


def test_no_match_is_its_own_outcome_not_a_review_item() -> None:
    """§8: the existing dom_shape / sc_var gates are unchanged. A boundary Spec 44
    cannot place must therefore NOT be diverted into review — it stays on its
    existing path, and the orchestrator branch keys on this outcome."""
    decision = mod.evaluate(None, None, CLIENT, [], auto_complete_enabled=True)
    assert decision.outcome == mod.OUTCOME_NO_MATCH, decision.outcome
    assert decision.needs_review is False
    assert decision.block is None
    print("  PASS  §8: no match is 'no-match', never a review item — the boundary "
          "keeps the path it already had")


# ---------------------------------------------------------------- §7 surfaces

def test_summary_file_and_stdout_both_fire() -> None:
    run_dir = Path(tempfile.mkdtemp())
    conn = _fixture_db()
    try:
        exact = _exact_stage_a(conn)
    finally:
        conn.close()
    review_decision = mod.evaluate(exact, None, CLIENT, [], False, boundary_id="b1")
    auto_decision = mod.evaluate(
        exact, None, CLIENT, [_row(CLIENT, BUYBOX, mod.SOURCE_SPEC44)], True,
        boundary_id="b2")
    out = mod.write_classless_summary(run_dir, [review_decision, auto_decision])
    text = out.read_text(encoding="utf-8")
    assert out.name == "classless-summary.md", out
    assert "Auto-completed: **1**" in text, text
    assert "Fell to review: **1**" in text, text
    assert "b1" in text and "b2" in text
    lines = mod.summary_lines([review_decision, auto_decision])
    assert any("auto-completed: 1" in line for line in lines), lines
    assert any("REVIEW b1" in line for line in lines), lines
    print(f"  PASS  §7: {out.name} written with both outcomes, and the stdout block "
          "carries the same counts")


def test_review_page_gains_a_classless_section_only_when_there_is_one() -> None:
    """Extends the REAL review surface, and the negative control proves a pre-Spec-44
    caller renders a byte-identical page."""
    conn = _fixture_db()
    try:
        partial = _partial_stage_a(conn)
    finally:
        conn.close()
    decision = mod.evaluate(partial, None, CLIENT, [], False, boundary_id="b9")
    payload = {"decisions": mod.decisions_to_json([decision])}
    empty = {"boundaries": []}
    with_section = review.render_review("run-x", empty, {}, {}, {}, {}, payload)
    without = review.render_review("run-x", empty, {}, {}, {}, {})
    assert "Classless recognition" in with_section
    assert "sgs/buybox" in with_section
    assert "FR-44-1" in with_section
    assert "Classless recognition" not in without
    assert without == review.render_review("run-x", empty, {}, {}, {}, {}, None)
    assert without == review.render_review("run-x", empty, {}, {}, {}, {},
                                           {"decisions": []})
    print("  PASS  §7: the classless queue renders on the EXISTING operator-review "
          "page; absent/empty decisions render the pre-Spec-44 page unchanged")


def test_review_page_escapes_operator_prose() -> None:
    """The reasons column is prose, unlike every other cell on that page."""
    payload = {"decisions": [{"boundary_id": "b<1>", "stage": "A", "block": "sgs/x",
                              "match_quality": "partial", "outcome": "review",
                              "signal": "<script>alert(1)</script>", "reasons": ["a & b"]}]}
    html = review.classless_rows(payload)
    assert "<script>" not in html, html
    assert "&lt;script&gt;" in html
    assert "a &amp; b" in html
    print("  PASS  §7: the review section escapes its own prose cells")


def test_the_real_log_was_not_written() -> None:
    # Every write in this suite passed an explicit temp path; this proves it.
    rows = mod.read_log()
    assert all(mod.row_source(r) in (mod.SOURCE_SPEC44, mod.SOURCE_TIER4) for r in rows)
    assert not any(r.get("boundary_id", "").startswith("b") and r.get("run_id") == ""
                   for r in rows), "a test decision reached the git-tracked log"
    print(f"  PASS  the git-tracked log holds {len(rows)} row(s); no test decision "
          "reached it")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("Spec 44 FR-44-1 / §7 / §9 — classless trust gate, audit log, review surface")
    test_the_fixture_stage_a_results_are_real()
    test_a_missing_log_is_an_empty_log_not_an_error()
    test_a_half_written_line_does_not_hide_the_rows_above_it()
    test_append_is_append_only()
    test_a_row_with_no_source_key_reads_as_spec44()
    test_a_tier4_row_can_never_satisfy_clause_b()
    test_a_tier4_row_cannot_auto_complete_a_real_exact_match()
    test_static_leaf_never_changes_clause_a_or_the_outcome()
    test_clause_a_needs_exact_sole_survivor_and_no_hypothesis()
    test_diversity_floor_refuses_a_single_role_repeated_sequence()
    test_a_merged_shape_hypothesis_never_clears_clause_a()
    test_first_occurrence_for_a_new_client_is_forced_to_review()
    test_a_decision_row_alone_never_opens_the_gate_no_matter_how_many_runs()
    test_second_occurrence_for_the_same_client_auto_completes_under_a_alone()
    test_record_human_approval_requires_a_named_approver()
    test_a_run_cannot_satisfy_its_own_first_look_gate()
    test_auto_complete_is_off_unless_the_flag_is_set()
    test_emitted_markup_invents_nothing()
    test_stage_b_never_auto_completes()
    test_no_match_is_its_own_outcome_not_a_review_item()
    test_summary_file_and_stdout_both_fire()
    test_review_page_gains_a_classless_section_only_when_there_is_one()
    test_review_page_escapes_operator_prose()
    test_the_real_log_was_not_written()
    for path in _TEMP:
        try:
            os.unlink(path)
        except OSError:
            pass
    print("\nCLASSLESS TRUST GATE: PASS (FR-44-1(a) exact+sole+no-hypothesis, "
          "FR-44-1(b) forced first look + same-client second occurrence, tier4 "
          "negative control both ways, run-snapshot rule, §9 flags default off, "
          "Stage B never auto-completes, §7 log + review page + summary all fire)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
