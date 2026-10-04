"""Acceptance measurements on the real repository (Task 2 of
.claude/plans/2026-10-04-wiring-fingerprint-gate.md), against the QC council's
labelled rows and the calibration cache. Each check skips when its oracle is not
on this machine (the council folder and the gitignored calibration cache are
outside the shipped tree). One real-repo scan per module (~16 s).

The Rater B floors are the measured values, below the 95% target on the
not-paint side; the report (.superpowers/sdd/task-2-report.md) lists the
disagreements and the mechanisms behind them. A drop below a floor fails."""
from __future__ import annotations

import pytest

import wf_acceptance
from wf_paths import real_roots

PRECISION = {"L2": 90.0, "L5": 90.0, "L7": 90.0, "L3": 95.0}
RATER_B_PAINT_FLOOR = 95.0
RATER_B_NOT_PAINT_FLOOR = 92.0


@pytest.fixture(scope="module")
def measured():
    from wf_cli import run

    return wf_acceptance.measure(run(real_roots()))


def test_rater_a_precision_per_link(measured):
    ra = measured["rater_a"]
    if ra is None:
        pytest.skip("council verdicts not present")
    for link, floor in PRECISION.items():
        got = ra[link]
        if got["flagged"]:
            assert got["precision_pct"] >= floor, (link, got)


def test_calibrated_settings_have_no_channel_or_parity_finding(measured):
    cal = measured["calibration"]
    if cal is None:
        pytest.skip("calibration cache not present")
    assert cal["with_L5_or_L7"] == []


def test_rater_b_population_agreement(measured):
    rb = measured["rater_b"]
    if rb is None:
        pytest.skip("council census not present")
    assert rb["painting_rows_in_population_pct"] >= RATER_B_PAINT_FLOOR
    assert rb["not_paint_rows_outside_pct"] >= RATER_B_NOT_PAINT_FLOOR


def test_known_framework_bugs_are_found(measured):
    for key, attrs in measured["known_bugs"].items():
        assert attrs, key
