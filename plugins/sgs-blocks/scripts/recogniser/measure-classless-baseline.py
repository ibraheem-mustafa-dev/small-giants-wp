"""Front C Task 3 — re-measure Spec 44's safety baseline against the real Eye Care
Birmingham draft, now that `block_render_repeaters` holds real seeded data (D1089) and
FR-44-1 carries the Task 1 (real human approval) + Task 2 (match-diversity floor) fixes.

WHY THIS EXISTS. D1088's "35 no-matches, 0 diversions" figure was measured against an
EMPTY `block_render_repeaters` table (the seeder wasn't wired into `/sgs-update` yet) —
void by construction, not a real safety result. `.claude/LEDGER.md`'s Front C section and
`.claude/archive/decisions.md` D1088 both flag it as needing re-measurement once the table holds
real data. This script is that re-measurement, kept as a real script (not a throwaway
one-off) so it can be re-run again whenever the seeded roster or the draft changes.

METHOD, and why it is NOT a full `sgs-clone-orchestrator.py` dry-run. D1088 explicitly
declined a full orchestrator run against this draft for disclosed reasons that still hold
today: it scaffolds real block files into `src/blocks/`, writes to a shared uimax DB, and
this client's `theme-snapshot.json` is CURRENTLY DELETED on this worktree by another
concurrent session (visible in `git status` at the time this was written) — running the
full pipeline would either fail on that precondition or, worse, silently regenerate it and
collide with whatever that other session is mid-way through. None of that risk is needed
to answer this question: `classless_draft_adapter.py` (built same session as the trust
gate) already derives real `DraftGroup`/`DraftItemGroup` input straight from the real
draft HTML, and `classless_trust_gate.recognise_classless_group()` is the exact same
Stage A -> Stage B -> FR-44-1 pipeline the orchestrator would call — this script calls it
directly, over every real `<sc-for>` in the draft, with a REAL (initially empty) audit-log
precedent snapshot and writes REAL rows to the git-tracked `classless-recognition-log.jsonl`
exactly as a real run would. Nothing here is simulated; the only thing skipped is the
part of the orchestrator that would touch shared, currently-contended state.

GROUP COUNT, stated rather than assumed. D1088's Unit 3 measured "35 `sc-for` expressions"
in the real draft (a correction to the spec's own earlier "34" claim) — this script counts
them the same way (`soup.find_all("sc-for")`), so its own printed count is the thing to
compare against "35", not a re-typed constant.

FRONT C TASK 4's EMPIRICAL REVIEW (added, not a separate script — Bean's own steer: "do
the review first, update the specs based on the results"). `build_stage_a_group()` now
also derives each group's `static_roles` for real (Task 4), so re-running this script
automatically exercises the new singleton-corroboration path for every real group on this
draft with zero extra wiring. This run's OWN printed static-corroboration count is the
real answer to "does the richer fingerprint ever fire on real data" — not a guess, not a
second hypothetical run, because the shipped design never lets it affect the OUTCOME
(proven by `test_static_leaf_never_changes_clause_a_or_the_outcome`) — so there is only
ever one real number to measure, not a before/after pair.

UK English throughout.
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from bs4 import BeautifulSoup  # noqa: E402

import classless_draft_adapter as adapter  # noqa: E402
import classless_trust_gate as gate  # noqa: E402
import render_repeater_recogniser as stage_a  # noqa: E402

REPO = HERE.resolve().parents[3]
DRAFT = (REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care"
         / "Eye Care Birmingham.dc.html")
CLIENT_SLUG = "eye-care-ward-end"
REPORT = (REPO / ".claude" / "reports"
          / "2026-09-17-front-c-task3-baseline-remeasure.md")


def _load_draft() -> BeautifulSoup:
    if not DRAFT.exists():
        raise SystemExit(f"real draft missing at {DRAFT} — cannot measure against a "
                          "fixture; that would repeat D1088's own void-measurement bug")
    return BeautifulSoup(DRAFT.read_text(encoding="utf-8"), "html.parser")


def _label(sc_for) -> str:
    listed = (sc_for.get("list") or "").strip()
    return listed or "(no list= attribute)"


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    soup = _load_draft()
    sc_fors = soup.find_all("sc-for")
    print(f"[measure] real draft: {DRAFT}")
    print(f"[measure] {len(sc_fors)} <sc-for> expressions found "
          "(D1088 measured 35 — compare against this number, don't assume it)")

    run_id = f"front-c-task3-{uuid.uuid4().hex[:8]}"
    precedent = gate.read_precedent()  # the real log's snapshot, taken once
    print(f"[measure] precedent snapshot: {len(precedent)} row(s) in the real audit log "
          f"before this run (run_id={run_id})")

    conn = stage_a.open_db()
    decisions: list[gate.ClasslessDecision] = []
    try:
        for i, sc_for in enumerate(sc_fors):
            element = sc_for.parent or sc_for
            item = adapter.representative_item(element)
            label = _label(sc_for)
            boundary_id = f"eye-care-scfor-{i:02d}"
            if item is None:
                decisions.append(gate.ClasslessDecision(
                    client_slug=CLIENT_SLUG, boundary_id=boundary_id, run_id=run_id,
                    stage=gate.STAGE_NONE, outcome=gate.OUTCOME_NO_MATCH,
                    signal=f"{label}: no representative item found"))
                continue
            sa_group = adapter.build_stage_a_group(element, item, label=label)
            sb_group = adapter.build_stage_b_group(item, label=label)
            decision = gate.recognise_classless_group(
                sa_group, sb_group, CLIENT_SLUG, precedent,
                auto_complete_enabled=True, boundary_id=boundary_id, run_id=run_id,
                conn=conn)
            gate.append_decision(decision)
            decisions.append(decision)
    finally:
        conn.close()

    for line in gate.summary_lines(decisions):
        print(line)

    corroborated = [d for d in decisions if "static-shape corroboration" in d.signal]
    print(f"[measure] Front C Task 4: {len(corroborated)}/{len(decisions)} decisions "
          "carry a real static-shape corroboration signal")
    for d in corroborated:
        print(f"[measure]   {d.boundary_id} -> {d.block}: {d.signal}")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    written = gate.write_classless_summary(REPORT.parent, decisions)
    # write_classless_summary always names its file classless-summary.md; rename to
    # this task's own dated report path so it doesn't collide with a real pipeline run.
    # Path.replace() returns the DESTINATION path — reassign, don't keep using the old
    # (now-nonexistent) `written` path, or a later .open("a") silently recreates it empty.
    out = written.replace(REPORT)
    # write_classless_summary's own title is generic ("reports", the dir name it was
    # given) — replace just the first line with a real title naming this run.
    body = out.read_text(encoding="utf-8")
    body = body.replace(
        "# Classless recognition — reports",
        "# Classless recognition — Front C Task 3+4 re-measurement "
        "(Eye Care Birmingham draft)", 1)
    out.write_text(body, encoding="utf-8")
    if corroborated:
        with out.open("a", encoding="utf-8") as fh:
            fh.write("\n## Front C Task 4 — static-shape corroboration (informational only)\n\n")
            fh.write(f"{len(corroborated)} of {len(decisions)} decisions carried a real "
                     "singleton-content corroboration signal:\n\n")
            for d in corroborated:
                fh.write(f"- `{d.boundary_id}` -> `{d.block}`: {d.signal}\n")
    else:
        with out.open("a", encoding="utf-8") as fh:
            fh.write("\n## Front C Task 4 — static-shape corroboration (informational only)\n\n")
            fh.write("0 of the real groups on this draft carried a static-shape "
                     "corroboration signal this run — every matched group's boundary "
                     "either has no static content of its own (the thumbs group, "
                     "confirmed by `test_derive_static_draft_roles_on_the_real_thumbs_"
                     "boundary_is_empty`) or matched no candidate at all.\n")
    print(f"[measure] report written to {REPORT}")
    print(f"[measure] {len(decisions)} real decision rows appended to "
          f"{gate.LOG_PATH} (kind={gate.KIND_DECISION} — Task 1: these alone can NEVER "
          "auto-complete a future run; only an explicit --approve does)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
