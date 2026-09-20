"""Tests for orchestrator/script_bindings_stage.py: the per-run map handed to the converter (plan step A1, D1132).

Run from plugins/sgs-blocks/scripts:
    python -m pytest tests/test_script_bindings_stage.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import pathlib
import shutil
import sys

import pytest

_SCRIPTS = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_SCRIPTS / "orchestrator"))

import script_bindings_stage as stage  # noqa: E402

REPO = _SCRIPTS.parents[2]
EYE_CARE = REPO / "sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html"
MAMAS = REPO / "sites/mamas-munches/mockups/homepage/index.html"

needs_node = pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")


def test_a_static_bem_draft_is_inert_no_map_and_no_file(tmp_path: pathlib.Path) -> None:
    """Mama's Munches: nothing bound in any style value, so the run is byte-identical to one without this stage."""
    html = MAMAS.read_text(encoding="utf-8") if MAMAS.exists() else '<section class="sgs-hero" style="padding:20px"><h1>Hi</h1></section>'
    logged: list[str] = []
    assert stage.build_run_map(html, tmp_path, log=logged.append) == {}
    assert list(tmp_path.iterdir()) == [] and logged == []


@needs_node
@pytest.mark.skipif(not EYE_CARE.exists(), reason="the Eye Care draft is not in this checkout")
def test_the_real_draft_yields_the_map_a_file_and_a_summary(tmp_path: pathlib.Path) -> None:
    logged: list[str] = []
    run_map = stage.build_run_map(EYE_CARE.read_text(encoding="utf-8"), tmp_path, log=logged.append)
    assert len(run_map) == 75
    assert run_map["secPad"]["mobile"] == "56px 20px" and run_map["secPad"]["desktop"] == "104px 52px"
    record = json.loads((tmp_path / "script-bindings.json").read_text(encoding="utf-8"))
    assert set(record["resolved"]) == set(run_map)
    assert {(x["draft"], x["snapped"]) for x in record["snaps"]} == {(760, 768), (700, 768)}     # nothing moves silently
    assert len(record["unresolved"]) == 65 and record["problems"] == []
    assert any("resolved 75 name(s)" in line for line in logged)


@needs_node
def test_a_draft_the_evaluator_cannot_read_gives_an_empty_map_and_says_why(tmp_path: pathlib.Path) -> None:
    html = '<div style="padding: {{ pad }}"></div><script type="text/x-dc">class C { renderVals(){ return { pad: "1px" }; } }</script>'
    logged: list[str] = []
    assert stage.build_run_map(html, tmp_path, log=logged.append) == {}
    assert any("PROBLEM" in line and "dropped and gapped as before" in line for line in logged)


def test_a_time_budget_failure_is_retried_once(monkeypatch: pytest.MonkeyPatch, tmp_path: pathlib.Path) -> None:
    import script_bindings as sb
    calls: list[int] = []
    good = {"tier_widths": {}, "flags": {}, "snaps": [], "problems": [], "unresolved": [],
            "resolved": {"a": {"mobile": "1px", "tablet": "1px", "desktop": "1px", "intra_tier": {}}}}
    bad = {"tier_widths": {}, "flags": None, "snaps": [], "resolved": {}, "unresolved": [{"name": "a", "reason": "x"}],
           "problems": ["evaluator failed: overall deadline exceeded"]}

    def fake(*_a, **_k):
        calls.append(1)
        return bad if len(calls) == 1 else good

    monkeypatch.setattr(sb, "resolve_tier_bindings", fake)
    assert stage.build_run_map("<x/>", tmp_path, log=lambda _m: None) == {"a": {"mobile": "1px", "tablet": "1px", "desktop": "1px", "intra_tier": {}}}
    assert len(calls) == 2


def test_a_problem_that_is_not_a_time_budget_is_not_retried(monkeypatch: pytest.MonkeyPatch, tmp_path: pathlib.Path) -> None:
    import script_bindings as sb
    calls: list[int] = []
    bad = {"tier_widths": {}, "flags": None, "snaps": [], "resolved": {}, "unresolved": [{"name": "a", "reason": "x"}],
           "problems": ["no declaration of a width flag"]}
    monkeypatch.setattr(sb, "resolve_tier_bindings", lambda *_a, **_k: (calls.append(1), bad)[1])
    assert stage.build_run_map("<x/>", tmp_path, log=lambda _m: None) == {}
    assert len(calls) == 1


_INCLUSIVE = ("""<div style="padding: {{ pad }}">x</div><script type="text/x-dc">
class A { render() { const effW = S.w; const mob = effW <= 767; return { pad: mob ? '24px' : '64px' }; } }
</script>""")


@needs_node
def test_a_draft_already_written_to_our_edge_is_not_moved_and_reports_no_invented_gap() -> None:
    """`effW <= 767` is exactly our mobile edge. Snapping it to 768 gave tablet the mobile value at a 768 sample
    and, at the converter's 800 sample, a phantom in-tier breakpoint. Checked at both sample sets."""
    from script_bindings import resolve_tier_bindings
    for widths in (None, {"mobile": 375, "tablet": 800, "desktop": 1440}):
        entry = resolve_tier_bindings(_INCLUSIVE, tier_widths=widths, snap=True)["resolved"]["pad"]
        assert (entry["mobile"], entry["tablet"], entry["desktop"]) == ("24px", "64px", "64px"), widths
        assert entry["intra_tier"] == {}, widths


def test_an_unavailable_converter_tier_lookup_is_said_out_loud(monkeypatch) -> None:
    monkeypatch.setattr(stage, "_converter_tiers", lambda: (None, None))
    logged: list[str] = []
    stage.build_run_map('<p>no bindings</p>', pathlib.Path("."), log=logged.append)
    assert any("tier sample widths are unavailable" in line for line in logged)
