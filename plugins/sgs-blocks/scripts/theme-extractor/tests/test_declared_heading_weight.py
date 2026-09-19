"""Heading font weight from measurement on the declared-design path (Spec 33).

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_declared_heading_weight.py -q
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(PKG.parent))

import extract  # noqa: E402
import heading_weight  # noqa: E402
from schema_validate import validate_theme_json  # noqa: E402

DRAFT_DIR = REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care"
DRAFT = DRAFT_DIR / "Eye Care Birmingham.dc.html"
FACTS = HERE / "fixtures" / "eye-care-computed-facts.json"
MAMAS = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"
WHAT = "styles.elements.heading.typography.fontWeight"


@pytest.fixture(autouse=True)
def _no_font_network(monkeypatch):
    monkeypatch.setattr(extract, "_self_host_google_font", lambda *a, **k: None)


def _baseline() -> dict:
    return json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))


def _eye_care(facts: dict | None = None, trace: list | None = None) -> dict:
    html = DRAFT.read_text(encoding="utf-8")
    facts = facts if facts is not None else json.loads(FACTS.read_text(encoding="utf-8"))
    return extract.build_snapshot("eye-care", extract.extract_css(html), facts, html, _baseline(),
                                  [] if trace is None else trace, REPO, draft_dir=DRAFT_DIR)


def _facts_with(weights: dict) -> dict:
    """The Eye Care facts with the heading weights replaced (a level mapped to None is unmeasured)."""
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    template = copy.deepcopy(next(iter(facts["headings"].values())))
    facts["headings"] = {}
    for tag, weight in weights.items():
        if weight is not None:
            facts["headings"][tag] = {**copy.deepcopy(template), "fontWeight": weight, "inChrome": False}
    return facts


def _weight(snap: dict, tag: str):
    return snap["styles"]["elements"].get(tag, {}).get("typography", {}).get("fontWeight")


def test_eye_care_headings_take_the_measured_500_not_the_baseline_700():
    snap = _eye_care()
    assert _weight(snap, "heading") == "500"
    assert _baseline()["styles"]["elements"]["heading"]["typography"]["fontWeight"] == "700"
    assert validate_theme_json(snap)[0]


def test_unmeasured_levels_keep_the_baseline_weight_and_are_untouched():
    snap, base = _eye_care(), _baseline()["styles"]["elements"]
    assert _weight(snap, "h5") == base["h5"]["typography"]["fontWeight"] == "700"   # not in the draft
    assert snap["styles"]["elements"]["h6"]["typography"] == base["h6"]["typography"]
    assert _weight(snap, "h1") is None   # h1 measured 500 == heading value, no baseline weight: inherits


def test_mixed_weights_give_the_common_weight_and_the_odd_level_its_own():
    snap = _eye_care(_facts_with({"h1": "500", "h2": "500", "h3": "600"}))
    assert _weight(snap, "heading") == "500"
    assert _weight(snap, "h3") == "600"
    assert _weight(snap, "h1") is None and _weight(snap, "h2") is None


def test_a_measured_level_whose_baseline_carries_a_weight_gets_its_own_measured_weight():
    snap = _eye_care(_facts_with({"h1": "500", "h5": "500"}))
    assert _weight(snap, "heading") == "500" and _weight(snap, "h5") == "500"   # baseline h5 was 700


def test_a_level_with_no_measurement_keeps_the_baseline_even_when_others_differ():
    snap = _eye_care(_facts_with({"h1": "300", "h2": "300", "h5": None}))
    assert _weight(snap, "heading") == "300"
    assert _weight(snap, "h5") == "700"


def test_chrome_only_levels_and_no_measurement_at_all_write_nothing():
    facts = _facts_with({"h1": "300"})
    facts["headings"]["h1"]["inChrome"] = True
    snap = _eye_care(facts)
    assert _weight(snap, "heading") == "700"   # baseline survives; chrome never speaks for the site
    assert _weight(_eye_care(_facts_with({})), "heading") == "700"


def test_ties_go_to_the_lower_weight():
    assert heading_weight.dominant_weight({"h1": "600", "h2": "400"}) == "400"
    assert heading_weight.dominant_weight({"h1": "600", "h2": "400", "h3": "600"}) == "600"


@pytest.mark.parametrize("raw,expected", [("500", "500"), (500, "500"), ("bold", "700"), ("normal", "400"),
                                         ("550", None), ("1000", None), ("0", None), ("", None),
                                         (None, None), ("bolder", None), (True, None), (450.5, None)])
def test_only_numeric_css_weights_are_ever_written(raw, expected):
    assert heading_weight.normalise_weight(raw) == expected


def test_an_unusable_weight_is_never_written():
    snap = _eye_care(_facts_with({"h1": "bolder", "h2": "1000"}))
    assert _weight(snap, "heading") == "700"   # nothing usable measured: baseline kept


def test_the_trace_row_carries_the_measured_values_per_level():
    trace: list = []
    _eye_care(_facts_with({"h1": "500", "h2": "500", "h3": "600"}), trace)
    row = next(t for t in trace if t.get("what") == WHAT)
    assert row["kind"] == "declared" and row["value"] == "500"
    assert row["measured"] == "h1=500,h2=500,h3=600" and row["own_weight_levels"] == "h3"


def test_two_runs_are_byte_identical():
    dump = lambda s: json.dumps(s, indent=2, ensure_ascii=False)  # noqa: E731
    assert dump(_eye_care()) == dump(_eye_care())


# ---- drafts that do not take the declared path are unchanged -----------------------------------------

def _mamas(draft_dir, trace: list | None = None) -> dict:
    html = MAMAS.read_text(encoding="utf-8")
    facts = json.loads((PKG / "mamas-computed-facts.json").read_text(encoding="utf-8"))
    return extract.build_snapshot("mamas-munches", extract.extract_css(html), facts, html, _baseline(),
                                  [] if trace is None else trace, REPO, draft_dir=draft_dir)


def test_static_draft_writes_no_weight_it_did_not_have():
    golden = json.loads((PKG / "expected" / "mamas-munches.snapshot.json").read_text(encoding="utf-8"))
    for draft_dir in (None, MAMAS.parent):
        trace: list = []
        snap = _mamas(draft_dir, trace)
        assert snap["styles"]["elements"] == golden["styles"]["elements"]
        assert not [t for t in trace if t.get("what") == WHAT]
        base = _baseline()["styles"]["elements"]
        for tag, el in snap["styles"]["elements"].items():
            if "fontWeight" in el.get("typography", {}):
                assert el["typography"]["fontWeight"] == base[tag]["typography"]["fontWeight"]
    assert json.dumps(_mamas(None)) == json.dumps(_mamas(MAMAS.parent))
