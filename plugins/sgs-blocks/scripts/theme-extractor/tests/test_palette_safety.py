"""Palette safety — UA-chrome / interaction-state selectors never vote, and Pass B overlays the baseline.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests -q

Browser-free: runs against synthetic CSS and the checked-in Mama's facts fixture.
"""
from __future__ import annotations

import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
SCRIPTS = PKG.parent
REPO = SCRIPTS.parents[2]
sys.path.insert(0, str(PKG))
sys.path.insert(0, str(SCRIPTS))

import derive  # noqa: E402
import extract  # noqa: E402
from token_map import parse_base_rules  # noqa: E402

BASELINE = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
BASE_PALETTE = BASELINE["settings"]["color"]["palette"]
DRAFT = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"
FACTS = PKG / "mamas-computed-facts.json"
EXPECTED = PKG / "expected"

# Resting body colours plus three rules that must NOT vote: a scrollbar-thumb hover, a text selection
# and a plain :hover state.
_NON_RESTING_CSS = (
    "body{background:#ffffff;color:#222222}"
    ".rev-rail::-webkit-scrollbar-thumb:hover{background:#BDC1C6}"
    "::selection{background:#ffcc00}"
    ".card:hover{background:#eeeeee}"
    "input::placeholder{color:#999999}"
)

_FACTS_MIN = {
    "root": {"fontSize": "16px"},
    "body": {"backgroundColor": "rgb(255,255,255)", "color": "rgb(34,34,34)", "fontFamily": "Arial"},
    "paragraphs": [{"path": "html>body>p", "inChrome": False, "area": 10000, "textLen": 20,
                    "fontFamily": "Arial", "fontSize": "16px", "lineHeight": "25.6px", "fontWeight": "400"}],
    "headings": {}, "buttons": [],
    "sections": [{"path": "html>body", "area": 100000, "inChrome": False, "hasParagraph": True,
                  "hasHeading": False, "backgroundColor": "rgb(255,255,255)"}],
    "previewShellMarkers": [],
}


def _overlay_snapshot():
    html = f"<html><head><style>{_NON_RESTING_CSS}</style></head><body><p>content here yes</p></body></html>"
    return extract.build_snapshot("synthetic", extract.extract_css(html), _FACTS_MIN, html,
                                  json.loads(json.dumps(BASELINE)), [], REPO)


def test_non_resting_selectors_do_not_vote():
    pal = derive.derive_palette(parse_base_rules(_NON_RESTING_CSS), [])
    assert sorted(e["slug"] for e in pal) == ["surface", "text"]
    by_slug = {e["slug"]: e["color"] for e in pal}
    assert by_slug["surface"] == "#ffffff"
    assert by_slug["text"] == "#222222"
    voted = {e["color"].lower() for e in pal}
    assert not voted & {"#bdc1c6", "#ffcc00", "#eeeeee", "#999999"}


def test_overlay_keeps_every_baseline_slug():
    pal = _overlay_snapshot()["settings"]["color"]["palette"]
    assert len(BASE_PALETTE) == 21
    assert [e["slug"] for e in BASE_PALETTE] == [e["slug"] for e in pal[:21]]
    assert {e["slug"] for e in BASE_PALETTE} <= {e["slug"] for e in pal}


def test_overlay_entries_carry_the_baseline_hex():
    pal = _overlay_snapshot()["settings"]["color"]["palette"]
    base_hex = {e["slug"]: e["color"] for e in BASE_PALETTE}
    overlaid = [e for e in pal if e.get("advisory")]
    assert sorted(e["slug"] for e in overlaid) == ["surface", "text"]
    for e in overlaid:
        assert e["_source"] == "derived"
        assert e["_baseline_color"] == base_hex[e["slug"]]
    untouched = [e for e in pal if not e.get("advisory")]
    assert untouched == [e for e in BASE_PALETTE if e["slug"] not in {"surface", "text"}]


def test_overlay_appends_derived_slug_missing_from_baseline():
    css = "body{background:#ffffff}.card{border-color:#dddddd}"
    html = f"<html><head><style>{css}</style></head><body><p>content here yes</p></body></html>"
    trace: list = []
    snap = extract.build_snapshot("synthetic", extract.extract_css(html), _FACTS_MIN, html,
                                  json.loads(json.dumps(BASELINE)), trace, REPO)
    pal = snap["settings"]["color"]["palette"]
    appended = [e for e in pal if e["slug"] == "border-subtle"]
    assert len(appended) == 1 and "_baseline_color" not in appended[0]
    merge = [t for t in trace if t.get("kind") == "merge"]
    assert len(merge) == 1 and merge[0]["overlaid"] == 1 and merge[0]["appended"] == 1


def test_pass_a_output_for_mamas_unchanged():
    golden = json.loads((EXPECTED / "mamas-munches.snapshot.json").read_text(encoding="utf-8"))
    html = DRAFT.read_text(encoding="utf-8")
    import re
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.DOTALL))
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    got = extract.build_snapshot("mamas-munches", css, facts, html, json.loads(json.dumps(BASELINE)), [], REPO)
    assert got["settings"]["color"]["palette"] == golden["settings"]["color"]["palette"]
    assert got["styles"]["typography"] == golden["styles"]["typography"]
    assert got["styles"]["elements"] == golden["styles"]["elements"]
    assert not any(e.get("advisory") or "_baseline_color" in e for e in got["settings"]["color"]["palette"])
