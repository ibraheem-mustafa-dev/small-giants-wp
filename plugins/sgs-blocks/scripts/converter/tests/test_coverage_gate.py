"""test_coverage_gate.py — wires the recognition coverage --check into the test suite.

The coverage gate (coverage_report.py --check) exits 1 on an UNRECOGNISED section that
isn't an intentional-bogus baseline. It can't run as a bare commit-hook script (the
frozen `orchestrator` is a namespace package that only resolves under `-m` / pytest), so
it is wired here — it runs on every `pytest` / prebuild (STOP-6: a gate must be wired to
something that RUNS). Run from plugins/sgs-blocks/scripts.
"""
from __future__ import annotations

from pathlib import Path

from converter.coverage_report import main as coverage_main

_FIXTURES = Path(__file__).resolve().parent / "fixtures" / "recognition"


def test_clean_fixtures_pass():
    # The committed fixtures: a hero that recognises + an intentional-bogus baseline.
    assert coverage_main(["--check", str(_FIXTURES)]) == 0


def test_planted_unrecognised_fails(tmp_path):
    # A NON-baseline section that resolves to no block must fail the gate (exit 1).
    (tmp_path / "realgap.html").write_text(
        '<section class="sgs-doesnotexist"></section>', encoding="utf-8"
    )
    assert coverage_main(["--check", str(tmp_path)]) == 1


def test_baseline_bogus_does_not_fail(tmp_path):
    # An intentional-bogus fixture (name flags it) is allowed to be UNRECOGNISED.
    (tmp_path / "rt-bogus-section.html").write_text(
        '<section class="sgs-doesnotexist"></section>', encoding="utf-8"
    )
    assert coverage_main(["--check", str(tmp_path)]) == 0
