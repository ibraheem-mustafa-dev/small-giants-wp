"""Ratchet baseline (Bean's decision D2): a new gap fails --check, a baselined
gap passes, a fixed gap is reported as removable, an advisory gap never fails."""
from __future__ import annotations

import json

import pytest
from wf_testkit import make_roots

import wf_cli


@pytest.fixture(scope="module")
def roots(tmp_path_factory):
    return make_roots(tmp_path_factory.mktemp("wfb"))


def _run(roots, baseline, *args):
    return wf_cli.main(list(args), roots=roots, baseline_path=baseline, with_dump=False)


def test_ratchet(roots, tmp_path, capsys):
    baseline = tmp_path / "baseline.json"
    assert _run(roots, baseline, "--update-baseline") == 0
    gaps = json.loads(baseline.read_text(encoding="utf-8"))["gaps"]
    assert "sgs/l2-gap::textColour::L2" in gaps
    assert gaps == sorted(gaps)

    # Baselined gaps pass.
    assert _run(roots, baseline, "--check") == 0

    # A new blocking gap (here: one dropped from the baseline) fails.
    data = json.loads(baseline.read_text(encoding="utf-8"))
    data["gaps"].remove("sgs/l2-gap::textColour::L2")
    baseline.write_text(json.dumps(data), encoding="utf-8")
    capsys.readouterr()
    assert _run(roots, baseline, "--check") == 1
    assert "sgs/l2-gap::textColour::L2" in capsys.readouterr().out

    # A new advisory gap never fails.
    data["gaps"].append("sgs/l2-gap::textColour::L2")
    data["gaps"].remove("sgs/l3state-gap::textColourHover::L3-state")
    baseline.write_text(json.dumps(data), encoding="utf-8")
    capsys.readouterr()
    assert _run(roots, baseline, "--check") == 0
    assert "advisory (never blocks): sgs/l3state-gap::textColourHover::L3-state" in capsys.readouterr().out

    # A baselined gap that no longer exists is reported as removable.
    data["gaps"].append("sgs/ok::textColour::L3")
    baseline.write_text(json.dumps(data), encoding="utf-8")
    capsys.readouterr()
    assert _run(roots, baseline, "--check") == 0
    out = capsys.readouterr().out
    assert "fixed" in out and "sgs/ok::textColour::L3" in out


def test_json_report_is_deterministic(roots, tmp_path):
    a, b = tmp_path / "a.json", tmp_path / "b.json"
    baseline = tmp_path / "baseline.json"
    _run(roots, baseline, "--update-baseline")
    _run(roots, baseline, "--json", str(a))
    _run(roots, baseline, "--json", str(b))
    assert a.read_text(encoding="utf-8") == b.read_text(encoding="utf-8")
