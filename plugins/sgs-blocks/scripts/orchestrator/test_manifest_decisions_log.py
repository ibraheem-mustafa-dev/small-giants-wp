"""Tests for manifest_decisions_log.py (Spec 31 FR-31-31 write-back to Spec 44's log).

Every test writes to a pytest temp path. None of them appends to the live
`recogniser/classless-recognition-log.jsonl` (the live file is only READ, to compare its
schema). Each behaviour has a negative control: a case in the same test showing the check
can fail (a different key is appended; a mutilated row is detected as missing keys).

Run: python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_manifest_decisions_log.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import manifest_decisions_log as mdl  # noqa: E402

LIVE_LOG = mdl.LOG_PATH


def _report(root: str = "sgs-trust-bar", status: str = "applied", **over):
    row = {
        "root_class": root,
        "block": "sgs/trust-bar",
        "confidence": "high",
        "status": status,
        "reason": "declared root found once; block is class-section",
        "target": "root",
        "items": 4,
        "fields": ["label"],
    }
    row.update(over)
    return row


def _read(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _missing(row: dict, required: set[str]) -> set[str]:
    return required - set(row)


def _first_live_row() -> dict:
    with LIVE_LOG.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                return json.loads(line)
    raise AssertionError("live log has no rows to compare the schema against")


def test_rows_have_full_schema_and_manifest_source(tmp_path):
    log = tmp_path / "log.jsonl"
    n = mdl.append_manifest_decisions([_report()], "eye-care-ward-end", "run-1", log)
    assert n == 1
    (row,) = _read(log)
    assert row["source"] == "manifest"
    assert row["kind"] == "decision"
    assert row["client_slug"] == "eye-care-ward-end"
    assert row["run_id"] == "run-1"
    assert row["boundary_id"] == "sgs-trust-bar"
    assert row["block"] == "sgs/trust-bar"
    assert row["outcome"] == "applied"
    assert row["match_type"] == "manifest"
    assert row["match_quality"] == "high"
    assert row["reasons"] == ["declared root found once; block is class-section"]
    assert row["fields"] == ["label"]
    assert row["ts"].endswith("+00:00")
    # Negative control: the schema check must be able to fail.
    broken = dict(row)
    del broken["clause_a"]
    assert _missing(broken, set(row)) == {"clause_a"}


def test_row_keys_are_a_superset_of_a_real_live_row(tmp_path):
    live = _first_live_row()
    log = tmp_path / "log.jsonl"
    mdl.append_manifest_decisions([_report()], "c", "r", log)
    (row,) = _read(log)
    assert not _missing(row, set(live)), f"schema drift vs live Spec 44 row: {_missing(row, set(live))}"
    # Negative control: a row that dropped a live key is caught.
    drifted = {k: v for k, v in row.items() if k != "signal"}
    assert _missing(drifted, set(live)) == {"signal"}


def test_idempotent_per_client_run_boundary_outcome(tmp_path):
    log = tmp_path / "log.jsonl"
    assert mdl.append_manifest_decisions([_report()], "c", "r", log) == 1
    assert mdl.append_manifest_decisions([_report()], "c", "r", log) == 0
    assert len(_read(log)) == 1
    # A duplicate inside a single call is also collapsed.
    assert mdl.append_manifest_decisions([_report("a"), _report("a")], "c", "r2", log) == 1
    # Negative controls: each part of the key, when different, DOES append.
    assert mdl.append_manifest_decisions([_report()], "c", "r-other", log) == 1      # run_id
    assert mdl.append_manifest_decisions([_report("other")], "c", "r", log) == 1     # boundary_id
    assert mdl.append_manifest_decisions([_report(status="rejected")], "c", "r", log) == 1  # outcome


def test_two_clients_do_not_collide(tmp_path):
    log = tmp_path / "log.jsonl"
    assert mdl.append_manifest_decisions([_report()], "client-a", "same-run", log) == 1
    assert mdl.append_manifest_decisions([_report()], "client-b", "same-run", log) == 1
    rows = _read(log)
    assert {r["client_slug"] for r in rows} == {"client-a", "client-b"}
    # Negative control: the same client again is skipped.
    assert mdl.append_manifest_decisions([_report()], "client-a", "same-run", log) == 0


def test_garbled_and_unterminated_existing_content_does_not_crash(tmp_path, capsys):
    log = tmp_path / "log.jsonl"
    good = {"source": "spec44", "kind": "decision", "client_slug": "x"}
    log.write_bytes((json.dumps(good) + "\n" + "{this is not json\n" + '{"half": "writ').encode("utf-8"))
    n = mdl.append_manifest_decisions([_report()], "c", "r", log)
    assert n == 1
    lines = log.read_text(encoding="utf-8").splitlines()
    # The unterminated fragment stays on its own line; the new row is a whole line.
    assert json.loads(lines[-1])["source"] == "manifest"
    assert json.loads(lines[0]) == good
    assert "unparseable" in capsys.readouterr().err
    # Negative control: a clean log emits no warning.
    clean = tmp_path / "clean.jsonl"
    mdl.append_manifest_decisions([_report()], "c", "r", clean)
    assert capsys.readouterr().err == ""


def test_unreadable_log_is_treated_as_empty_with_one_warning(tmp_path, capsys):
    log = tmp_path / "log.jsonl"
    log.write_bytes(b"\xff\xfe\x00 not utf-8 \xc3\x28\n")
    n = mdl.append_manifest_decisions([_report()], "c", "r", log)
    assert n == 1
    err = capsys.readouterr().err.strip().splitlines()
    assert len(err) == 1 and "treating it as empty" in err[0]
    # Negative control: a valid log does not trigger the unreadable path.
    ok = tmp_path / "ok.jsonl"
    mdl.append_manifest_decisions([_report()], "c", "r", ok)
    assert capsys.readouterr().err == ""


def test_rejected_row_keeps_its_reason(tmp_path):
    log = tmp_path / "log.jsonl"
    reason = "block 'sgs/nope' is not in the database"
    mdl.append_manifest_decisions(
        [_report("sgs-nope", status="rejected", block="sgs/nope", confidence="low", reason=reason,
                 items=0, fields=[])],
        "c", "r", log)
    (row,) = _read(log)
    assert row["outcome"] == "rejected"
    assert row["reasons"] == [reason]
    assert row["match_quality"] == "low"
    # Negative control: an applied row with the same reason text is a different outcome,
    # not swallowed by the rejected row's idempotence key.
    assert mdl.append_manifest_decisions([_report("sgs-nope", status="applied")], "c", "r", log) == 1


def test_appends_never_rewrite_existing_rows(tmp_path):
    log = tmp_path / "log.jsonl"
    mdl.append_manifest_decisions([_report("a")], "c", "r", log)
    before = log.read_bytes()
    mdl.append_manifest_decisions([_report("b")], "c", "r", log)
    after = log.read_bytes()
    assert after.startswith(before) and len(after) > len(before)


def test_invalid_input_fails_loud_and_writes_nothing(tmp_path):
    log = tmp_path / "log.jsonl"
    with pytest.raises(ValueError):
        mdl.append_manifest_decisions([_report(status="maybe")], "c", "r", log)
    with pytest.raises(ValueError):
        mdl.append_manifest_decisions([_report(root="")], "c", "r", log)
    with pytest.raises(ValueError):
        mdl.append_manifest_decisions([_report()], "", "r", log)
    assert not log.exists()
    # Negative control: valid input does write.
    assert mdl.append_manifest_decisions([_report()], "c", "r", log) == 1
    # Empty input is a no-op, not an error.
    assert mdl.append_manifest_decisions([], "c", "r", tmp_path / "none.jsonl") == 0


def test_default_path_is_spec44s_log():
    import classless_trust_gate as gate  # on sys.path via manifest_decisions_log
    assert mdl.LOG_PATH == gate.LOG_PATH
    assert mdl.LOG_PATH.name == "classless-recognition-log.jsonl"
