"""Ratchet baseline (Bean's decision D2): a new gap fails --check and prints what
it means and what to do, a baselined gap passes, a fixed gap is reported as
removable, an advisory gap never fails and is never baselined, and --accept adds
only named current gaps."""
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


def _gaps(baseline):
    return json.loads(baseline.read_text(encoding="utf-8"))["gaps"]


def _drop(baseline, gap):
    data = json.loads(baseline.read_text(encoding="utf-8"))
    data["gaps"].remove(gap)
    baseline.write_text(json.dumps(data), encoding="utf-8")


def test_ratchet(roots, tmp_path, capsys):
    baseline = tmp_path / "baseline.json"
    assert _run(roots, baseline, "--update-baseline") == 0
    gaps = _gaps(baseline)
    assert "sgs/l2-gap::textColour::L2" in gaps
    assert gaps == sorted(gaps)
    # Advisory links never enter the baseline.
    assert not any(g.endswith(("::L3-state", "::L6-token")) for g in gaps)

    # Baselined gaps pass; advisory gaps are counted, never listed one by one, never fail.
    capsys.readouterr()
    assert _run(roots, baseline, "--check") == 0
    assert "advisory (never blocks, not baselined): L3-state" in capsys.readouterr().out

    # A new blocking gap fails and says what it means, what is missing and what to do.
    _drop(baseline, "sgs/l2-gap::textColour::L2")
    capsys.readouterr()
    assert _run(roots, baseline, "--check") == 1
    out = capsys.readouterr().out
    assert "sgs/l2-gap::textColour::L2" in out
    assert "L2: no editor control" in out
    assert "detail: no inspector control writes it" in out
    assert "--accept <id>" in out and "reason in the commit message" in out

    # A baselined gap that no longer exists is reported as removable.
    data = json.loads(baseline.read_text(encoding="utf-8"))
    data["gaps"] += ["sgs/l2-gap::textColour::L2", "sgs/ok::textColour::L3"]
    baseline.write_text(json.dumps(data), encoding="utf-8")
    capsys.readouterr()
    assert _run(roots, baseline, "--check") == 0
    out = capsys.readouterr().out
    assert "fixed" in out and "sgs/ok::textColour::L3" in out


def test_accept_adds_only_named_current_gaps(roots, tmp_path, capsys):
    baseline = tmp_path / "baseline.json"
    _run(roots, baseline, "--update-baseline")
    _drop(baseline, "sgs/l2-gap::textColour::L2")
    _drop(baseline, "sgs/l3-gap::textColour::L3")
    before = set(_gaps(baseline))

    assert _run(roots, baseline, "--accept", "sgs/l2-gap::textColour::L2") == 0
    assert set(_gaps(baseline)) == before | {"sgs/l2-gap::textColour::L2"}
    assert _run(roots, baseline, "--check") == 1   # the other dropped gap is still new

    # Refused, baseline untouched: an id that is not a current finding, or an advisory one.
    snapshot = baseline.read_text(encoding="utf-8")
    capsys.readouterr()
    assert _run(roots, baseline, "--accept", "sgs/l3-gap::textColour::L3", "sgs/ok::textColour::L2") == 2
    assert "sgs/ok::textColour::L2: not a current finding" in capsys.readouterr().out
    assert _run(roots, baseline, "--accept", "sgs/l3state-gap::textColourHover::L3-state") == 2
    assert baseline.read_text(encoding="utf-8") == snapshot


def test_json_report_is_deterministic(roots, tmp_path):
    a, b = tmp_path / "a.json", tmp_path / "b.json"
    baseline = tmp_path / "baseline.json"
    _run(roots, baseline, "--update-baseline")
    _run(roots, baseline, "--json", str(a))
    _run(roots, baseline, "--json", str(b))
    assert a.read_text(encoding="utf-8") == b.read_text(encoding="utf-8")
