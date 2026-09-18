"""Spec 44 completion register item 3 — generalisation check: run the real Stage A ->
Stage B -> FR-44-1 trust-gate pipeline against a SECOND draft (Frame Card,
`sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Frame Card.dc.html`) that it has
never been run against before. Every prior measurement (D1088, D1094, Front C Task 3/4)
used ONLY the Eye Care Birmingham draft — a single-draft result proves nothing about
whether the design generalises. This is that second data point.

WHY THIS IS A SEPARATE SCRIPT, NOT A PARAMETERISED `measure-classless-baseline.py`.
Frame Card sits in the SAME client directory (`sites/eye-care-ward-end/`) as Eye Care
Birmingham, which already has real rows in the git-tracked audit log
(`classless-recognition-log.jsonl`) under `client_slug="eye-care-ward-end"`. Running this
measurement under that identical client slug would let Frame Card's groups see Eye Care
Birmingham's precedent rows and risk a real FR-44-1(b) same-client second-occurrence
auto-complete trip that has nothing to do with THIS draft — contaminating the precedent
history a separate, still-pending live-flagged pipeline run depends on being clean.
Belt and braces: this script uses BOTH (1) a dedicated throwaway audit-log file, never the
real `classless-recognition-log.jsonl`, and (2) a distinct `CLIENT_SLUG` that never
collides with the real `"eye-care-ward-end"` slug used by Eye Care Birmingham's own real
rows. Retrofitting both isolation knobs onto the maintained baseline script was possible
(`append_decision`/`read_precedent` both already accept a `path=` override) but would have
meant either changing that script's own defaults (risking its own correctness for the
Eye Care Birmingham re-measurement it exists to serve) or trusting every future caller to
remember to pass the override — a silent-contamination footgun not worth the avoided
duplication. This script is read-structure-identical to `measure-classless-baseline.py`
(same Stage A -> Stage B -> trust-gate call sequence) but owns its own isolated constants
end to end, so there is no default path anywhere in it that could reach the real log.

METHOD is otherwise identical to `measure-classless-baseline.py`'s own documented method:
`classless_draft_adapter.py` derives real `DraftGroup`/`DraftItemGroup` input straight from
the real draft HTML; `classless_trust_gate.recognise_classless_group()` is the exact
Stage A -> Stage B -> FR-44-1 pipeline a real orchestrator run would call. Nothing here is
simulated.

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
         / "Frame Card.dc.html")

# ISOLATION MEASURE 1 — a dedicated throwaway audit-log file, never the real
# classless-recognition-log.jsonl (which already holds real Eye Care Birmingham rows).
ISOLATED_LOG_PATH = (REPO / ".claude" / "reports"
                      / "2026-09-18-spec44-frame-card-test-log.jsonl")

# ISOLATION MEASURE 2 — a client slug distinct from the real "eye-care-ward-end" used by
# Eye Care Birmingham's own real audit-log rows, even though a separate log file alone
# already prevents cross-contamination. Belt and braces per the task brief.
CLIENT_SLUG = "eye-care-ward-end-frame-card-test"

REPORT = (REPO / ".claude" / "reports"
          / "2026-09-18-spec44-frame-card-second-draft-measurement.md")

# The real log, read ONLY to prove — before and after this run — that it was never touched.
REAL_LOG_PATH = gate.LOG_PATH


def _load_draft() -> BeautifulSoup:
    if not DRAFT.exists():
        raise SystemExit(f"real draft missing at {DRAFT} — cannot measure against a "
                          "fixture; that would repeat D1088's own void-measurement bug")
    return BeautifulSoup(DRAFT.read_text(encoding="utf-8"), "html.parser")


def _label(sc_for) -> str:
    listed = (sc_for.get("list") or "").strip()
    return listed or "(no list= attribute)"


def _real_log_fingerprint() -> tuple[bool, float | None, int]:
    """(exists, mtime, line-count) — the pre/post proof the real log was untouched."""
    if not REAL_LOG_PATH.exists():
        return False, None, 0
    text = REAL_LOG_PATH.read_text(encoding="utf-8")
    return True, REAL_LOG_PATH.stat().st_mtime, len(
        [ln for ln in text.splitlines() if ln.strip()])


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    before = _real_log_fingerprint()
    print(f"[measure] real audit log BEFORE this run: exists={before[0]} "
          f"mtime={before[1]} lines={before[2]} (path={REAL_LOG_PATH})")
    print(f"[measure] isolated test log for THIS run: {ISOLATED_LOG_PATH}")
    print(f"[measure] isolated client slug for THIS run: {CLIENT_SLUG} "
          "(never 'eye-care-ward-end')")

    soup = _load_draft()
    sc_fors = soup.find_all("sc-for")
    print(f"[measure] real draft: {DRAFT}")
    print(f"[measure] {len(sc_fors)} <sc-for> expressions found "
          "(a prior grep found 2 — compare against this number, don't assume it)")

    run_id = f"frame-card-second-draft-{uuid.uuid4().hex[:8]}"
    # Isolated log starts empty for THIS test client slug — a genuinely first run against
    # this draft, with no cross-client and no cross-run precedent to muddy the comparison
    # against D1094's Eye Care Birmingham baseline.
    precedent = gate.read_precedent(path=ISOLATED_LOG_PATH)
    print(f"[measure] isolated precedent snapshot: {len(precedent)} row(s) before this "
          f"run (run_id={run_id})")

    conn = stage_a.open_db()
    decisions: list[gate.ClasslessDecision] = []
    try:
        for i, sc_for in enumerate(sc_fors):
            element = sc_for.parent or sc_for
            item = adapter.representative_item(element)
            label = _label(sc_for)
            boundary_id = f"frame-card-scfor-{i:02d}"
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
            gate.append_decision(decision, path=ISOLATED_LOG_PATH)
            decisions.append(decision)
    finally:
        conn.close()

    for line in gate.summary_lines(decisions):
        print(line)

    corroborated = [d for d in decisions if "static-shape corroboration" in d.signal]
    print(f"[measure] static-shape corroboration: {len(corroborated)}/{len(decisions)} "
          "decisions carry a real corroboration signal")
    for d in corroborated:
        print(f"[measure]   {d.boundary_id} -> {d.block}: {d.signal}")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    written = gate.write_classless_summary(REPORT.parent, decisions)
    # write_classless_summary always names its file classless-summary.md; rename to this
    # task's own dated report path so it doesn't collide with any other run's summary.
    out = written.replace(REPORT)
    body = out.read_text(encoding="utf-8")
    body = body.replace(
        "# Classless recognition — reports",
        "# Classless recognition — Spec 44 item 3: Frame Card second-draft "
        "generalisation measurement", 1)
    out.write_text(body, encoding="utf-8")

    after = _real_log_fingerprint()
    untouched = before == after
    print(f"[measure] real audit log AFTER this run: exists={after[0]} "
          f"mtime={after[1]} lines={after[2]}")
    print(f"[measure] real audit log UNTOUCHED: {untouched}")
    if not untouched:
        # Fail loud — this is the one outcome the whole isolation design exists to prevent.
        raise SystemExit(
            "SAFETY VIOLATION: the real classless-recognition-log.jsonl changed during "
            "this run. Isolation failed — investigate before trusting any figure above.")

    with out.open("a", encoding="utf-8") as fh:
        fh.write("\n## Isolation verification\n\n")
        fh.write(f"- Real audit log (`{REAL_LOG_PATH.name}`) BEFORE: "
                  f"mtime={before[1]}, {before[2]} line(s)\n")
        fh.write(f"- Real audit log AFTER: mtime={after[1]}, {after[2]} line(s)\n")
        fh.write(f"- **Untouched: {untouched}**\n")
        fh.write(f"- This run's rows were written to the isolated test log instead: "
                  f"`{ISOLATED_LOG_PATH}`\n")
        fh.write(f"- Isolated client slug used: `{CLIENT_SLUG}` "
                  "(never the real `eye-care-ward-end`)\n")

    print(f"[measure] report written to {REPORT}")
    print(f"[measure] {len(decisions)} real decision rows appended to the ISOLATED log "
          f"{ISOLATED_LOG_PATH} — the real log was never opened for writing")
    return 0


if __name__ == "__main__":
    sys.exit(main())
