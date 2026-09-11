"""test_detect_repeated_siblings_signoff_gate.py -- regression control for the
sign-off gate bypass found in task review (Q2 Tier 1 sibling-repetition
detector, commits `e250ff6d9` + `4e965c2d6`).

CRITICAL finding: `detect-repeated-siblings.py::cmd_fix` and `cmd_check` both
checked `signed_off` with a TRUTHY comparison, not a strict `is True` identity
check. A survey JSON carrying `"signed_off": "false"` (a STRING -- which any
human hand-editing the file would reasonably read as an explicit NO) is
truthy in Python, so it sailed straight through `--fix --apply` with exit 0
and wrote the artefact, and `--check` then reported PASS on that artefact
because it uses the identical flawed truthy check and cannot catch its own
bypass. This defeats R-31-13's sign-off gate (Bean's eye must stay
co-authoritative on which repeating groups get bulk-applied).

This test drives the REAL CLI via subprocess (not the internal functions
directly) so it exercises the exact code path a human or CI runner would --
the reviewer's own proof case, used directly as the regression control.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "detect-repeated-siblings.py"

REPRESENTATIVE_HTML = '<div class="sgs-card-grid__item"><span>x</span></div>'


def _survey(signed_off) -> dict:
    return {
        "source": "fixture.html",
        "threshold": 0.82,
        "min_group_size": 3,
        "groups": [
            {
                "group_id": "g0",
                "size": 4,
                "average_score": 0.95,
                "representative_html": REPRESENTATIVE_HTML,
                "member_html": [],
                "signed_off": signed_off,
            }
        ],
    }


def _run(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
    )


def test_string_false_signed_off_is_refused_by_fix_apply(tmp_path):
    """The reviewer's own bypass proof: `"signed_off": "false"` (a STRING) is
    truthy in Python and must NOT sail through `--fix --apply`. Non-zero
    exit, no `.applied.json` artefact written."""
    survey_path = tmp_path / "survey.json"
    survey_path.write_text(json.dumps(_survey("false")), encoding="utf-8")

    result = _run("--fix", str(survey_path), "--apply")

    assert result.returncode != 0, (
        f"--fix --apply must REFUSE a non-True signed_off value; "
        f"got exit {result.returncode}\nstdout={result.stdout}\nstderr={result.stderr}"
    )
    applied_path = survey_path.with_suffix(survey_path.suffix + ".applied.json")
    assert not applied_path.exists(), (
        "no .applied.json artefact may be written for an unsigned-off group"
    )
    assert "REFUSED" in result.stdout


def test_string_false_signed_off_never_passes_check_even_if_applied_illegitimately(tmp_path):
    """Defence in depth: even if an `.applied.json` artefact referencing group
    g0 existed (e.g. hand-crafted, or written by a hypothetical regression in
    the first gate), `--check` must independently refuse to treat a
    `"signed_off": "false"` (string) survey entry as sign-off-backed. Both
    layers must fail closed on their own -- neither may rely on the other
    having already caught the bad value."""
    survey_path = tmp_path / "survey.json"
    survey_path.write_text(json.dumps(_survey("false")), encoding="utf-8")

    # Hand-craft the applied artefact directly (simulating a bypass of the
    # first gate) to prove `cmd_check` independently refuses it.
    applied_path = survey_path.with_suffix(survey_path.suffix + ".applied.json")
    applied_path.write_text(
        json.dumps(
            {
                "source": str(survey_path),
                "groups": [
                    {
                        "group_id": "g0",
                        "size": 4,
                        "slug": "sgs/info-box",
                        "cpt_archive": False,
                        "markup": "<!-- wp:sgs/info-box {} --><!-- /wp:sgs/info-box -->",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    result = _run("--check", str(applied_path))

    assert result.returncode != 0, (
        f"--check must FAIL an applied artefact whose survey group is not "
        f"strictly signed_off:true; got exit {result.returncode}\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )
    assert "FAIL" in result.stdout
    assert "possible bypass" in result.stdout


def test_boolean_true_signed_off_still_applies_and_passes_check(tmp_path):
    """Positive control -- a genuine `"signed_off": true` (Python bool True)
    must still work end-to-end: `--fix --apply` writes the artefact, and
    `--check` reports PASS. Proves the strict `is True` fix did not also
    reject the legitimate case."""
    survey_path = tmp_path / "survey.json"
    survey_path.write_text(json.dumps(_survey(True)), encoding="utf-8")

    apply_result = _run("--fix", str(survey_path), "--apply")
    assert apply_result.returncode == 0, apply_result.stdout + apply_result.stderr

    applied_path = survey_path.with_suffix(survey_path.suffix + ".applied.json")
    assert applied_path.exists()

    check_result = _run("--check", str(applied_path))
    assert check_result.returncode == 0, check_result.stdout + check_result.stderr
    assert "PASS" in check_result.stdout
