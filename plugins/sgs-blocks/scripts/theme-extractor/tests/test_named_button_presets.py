"""A draft's button version beyond primary, secondary and outline is a preset the renderers read (Spec 32 FR-32-2).

The extractor writes it under the draft's own name without a "no framework slot" gap, and turns on the per-site switch
``settings.custom.namedButtonPresets`` (the renderers read a name beyond the three only on a site that carries the switch).
The switch is written only when the snapshot's ``buttonPresets`` holds a name that is not primary, secondary, outline or one of the
reserved keys (``default``, ``link``, ``custom``), and it survives a merge onto the client's existing snapshot.
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parent.parent.parent.parent
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(HERE))

import extract  # noqa: E402
import presets  # noqa: E402
from merge import merge_onto  # noqa: E402
from test_button_whole_look import _component  # noqa: E402

DRAFT_DIR = REPO / "sites/eye-care-ward-end/handoff"
DRAFT = DRAFT_DIR / "Eye Care Birmingham.dc.html"
FACTS = HERE / "fixtures" / "eye-care-computed-facts.json"
SWITCH = "namedButtonPresets"


@pytest.fixture(autouse=True)
def _no_font_network(monkeypatch):
    monkeypatch.setattr(extract, "_self_host_google_font", lambda *a, **k: None)


def _snapshot(versions: list, trace: list | None = None) -> dict:
    html = DRAFT.read_text(encoding="utf-8")
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    facts["componentButtons"] = [_component(v, "rgb(255, 204, 0)", 2) for v in versions]
    baseline = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
    return extract.build_snapshot("optician-client", extract.extract_css(html), facts, html, baseline,
                                  [] if trace is None else trace, REPO, draft_dir=DRAFT_DIR)


def test_a_name_beyond_the_three_is_written_without_a_gap_and_turns_the_switch_on():
    trace: list = []
    custom = _snapshot(["primary", "gold"], trace)["settings"]["custom"]
    assert "gold" in custom["buttonPresets"]
    assert custom[SWITCH] is True
    assert not [t for t in trace if t["kind"] == "gap" and t["what"] == "buttonPresets.gold"], "no framework slot gap"


def test_only_the_three_framework_names_leave_the_switch_off():
    custom = _snapshot(["primary", "secondary", "outline"])["settings"]["custom"]
    assert SWITCH not in custom, "a site whose presets are the three names renders as before"


def test_reserved_keys_are_not_names():
    assert presets.named_presets({"primary": {}, "default": {}, "link": {}, "custom": {}}) == []
    assert presets.named_presets({"primary": {}, "gold": {}, "default": {}}) == ["gold"]
    assert presets.named_presets(None) == []


def test_the_switch_survives_a_merge_onto_the_clients_snapshot():
    snap = {"settings": {"custom": {SWITCH: True, "buttonPresets": {"primary": {}, "gold": {}}}}, "styles": {}}
    existing = {"settings": {"custom": {SWITCH: False, "buttonPresets": {"primary": {}}}}, "styles": {}}
    out = merge_onto(copy.deepcopy(snap), existing, [], baseline={"settings": {"custom": {}}})
    assert out["settings"]["custom"][SWITCH] is True, "a derived switch wins over the client's old false"
    kept = merge_onto({"settings": {"custom": {"buttonPresets": {"primary": {}}}}, "styles": {}},
                      {"settings": {"custom": {SWITCH: True, "buttonPresets": {"primary": {}, "gold": {}}}}, "styles": {}}, [],
                      baseline={"settings": {"custom": {}}})
    assert kept["settings"]["custom"][SWITCH] is True, "a run that derived no switch keeps the client's"
