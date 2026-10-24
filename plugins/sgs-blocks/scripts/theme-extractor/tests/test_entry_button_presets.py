"""FR-33-1 button presets from a Spec 48A export: the real Mama's Munches drafts.

The fixture is what measure.js read on each of the export's 11 entry drafts. The handoff README states the
answer: "Primary button: ... fill #F9CF6E ... Hover: fill #FFFAF0", "Secondary button: same with fill
#FFFAF0; hover fill #F9CF6E", radius 999px, Karla 700 17-19px; tokens/colors.css agrees (yellow "primary CTA
fill", paper "secondary buttons"). The pack-size tiles (aria-pressed buttons, radius 20px, browser font size)
and the selected recipe chips are choices, never the button style. A re-run merged onto the committed
snapshot keeps every preset key the extractor does not measure (press shadow, hover easings and timing).

Run:  cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests/test_entry_button_presets.py -q
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

PKG = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PKG))
REPO = PKG.parents[3]

import entry_buttons  # noqa: E402
import presets  # noqa: E402
from extract import merge_onto  # noqa: E402

FIXTURE = json.loads((PKG / "tests" / "fixtures" / "mamas-entry-buttons.json").read_text(encoding="utf-8"))
COMMITTED = json.loads((REPO / "sites" / "mamas-munches-redesign" / "theme-snapshot.json").read_text(encoding="utf-8"))
PALETTE_PRIMARY = [{"slug": "primary", "color": "#F9CF6E"}]


def _facts(pages=None) -> dict:
    pages = pages or list(FIXTURE["pages"])
    facts = copy.deepcopy(FIXTURE["pages"][pages[0]])
    return entry_buttons.fold_entry_buttons(facts, [(n, copy.deepcopy(FIXTURE["pages"][n])) for n in pages[1:]], [])


def test_home_alone_never_takes_a_pack_size_tile_for_the_secondary_button():
    got = presets.build_button_presets(_facts(["Home.dc.html"]), [], PALETTE_PRIMARY)
    assert got["primary"]["background"] == "#f9cf6e" and got["primary"]["hover-background"] == "#fffaf0"
    assert got["secondary"]["background"] == "#fffaf0" and got["secondary"]["hover-background"] == "#f9cf6e"
    assert got["secondary"]["border-radius"] == "999px"
    assert got["secondary"]["font-size"] == "17px" and got["secondary"]["font-weight"] == "700"
    assert "min-height" not in got["secondary"]


def test_every_entry_draft_gives_the_readme_primary_and_secondary():
    trace: list = []
    got = presets.build_button_presets(_facts(), trace, PALETTE_PRIMARY)
    primary, secondary = got["primary"], got["secondary"]
    assert (primary["background"], primary["hover-background"]) == ("#f9cf6e", "#fffaf0")
    assert (secondary["background"], secondary["hover-background"]) == ("#fffaf0", "#f9cf6e")
    for entry in (primary, secondary):
        assert entry["border-radius"] == "999px" and entry["font-weight"] == "700"
        assert entry["border-width"] == "2px" and entry["border"] == "#3a2a22"
    # the padding most instances author: the plain primary is 0 30px (the hero's 0 10px 0 28px makes room
    # for its arrow circle), the secondary 0 26px
    assert primary["padding"] == "0px 30px 0px 30px"
    assert secondary["padding"] == "0px 26px 0px 26px"


def test_a_state_holding_control_is_no_call_to_action():
    chip = next(b for b in FIXTURE["pages"]["Home.dc.html"]["buttons"] if b.get("stateControl"))
    assert presets._is_real_button(chip) is False


def test_folding_sums_a_signature_met_on_several_pages():
    home = FIXTURE["pages"]["Home.dc.html"]["buttons"]
    key = next(b["classKey"] for b in home if not b.get("stateControl") and b["rest"]["backgroundColor"] == "rgb(249, 207, 110)")
    total = sum(b["count"] for page in FIXTURE["pages"].values() for b in page["buttons"] if b["classKey"] == key)
    folded = next(b for b in _facts()["buttons"] if b["classKey"] == key)
    assert folded["count"] == total > next(b["count"] for b in home if b["classKey"] == key)
    assert folded["path"] == next(b["path"] for b in home if b["classKey"] == key)  # the entry draft's reading stands


def test_other_entry_drafts_come_from_the_manifest():
    handoff = REPO / "sites" / "mamas-munches-redesign" / "handoff"
    names = [p.name for p in entry_buttons.other_entry_drafts(handoff, "Home.dc.html")]
    assert len(names) == 10 and "Home.dc.html" not in names and names[0] == "Shop.dc.html"


def test_a_merge_keeps_every_committed_preset_key_the_run_did_not_measure():
    trace: list = []
    derived = presets.build_button_presets(_facts(), trace, PALETTE_PRIMARY)
    snap = {"settings": {"custom": {"buttonPresets": copy.deepcopy(derived)}}, "styles": {}}
    merged = merge_onto(snap, copy.deepcopy(COMMITTED), trace)["settings"]["custom"]["buttonPresets"]
    committed = COMMITTED["settings"]["custom"]["buttonPresets"]
    for slot in ("primary", "secondary"):
        for key in ("active-shadow", "active-transform", "hover-easing", "hover-easing-colour",
                    "hover-easing-shadow", "hover-transition"):
            assert merged[slot][key] == committed[slot][key], (slot, key)
        assert merged[slot]["background"] == derived[slot]["background"]  # measured keys take the draft's value
    assert merged["secondary"]["hover-transform"] == "matrix(1, 0, 0, 1, -3, -3)"
    assert merged["outline"] == committed["outline"]


def test_a_hover_that_keeps_the_text_colour_writes_that_colour_over_the_framework_white():
    # Home.dc.html's primary hovers to paper #FFFAF0 and keeps its cocoa text and border; the framework
    # baseline's primary hover text is #ffffff, which a merge kept when the hover reading wrote only the
    # colours that changed (white text on a paper hover).
    trace: list = []
    derived = presets.build_button_presets(_facts(), trace, PALETTE_PRIMARY)
    for slot in ("primary", "secondary"):
        assert derived[slot]["hover-text"] == "#3a2a22", slot
        assert derived[slot]["hover-border"] == "#3a2a22", slot
    snap = {"settings": {"custom": {"buttonPresets": copy.deepcopy(derived)}}, "styles": {}}
    merged = merge_onto(snap, copy.deepcopy(COMMITTED), trace)["settings"]["custom"]["buttonPresets"]
    assert merged["primary"]["hover-text"] == "#3a2a22"
