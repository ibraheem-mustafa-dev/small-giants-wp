"""FR-33-1: the draft's own focus effect (ring only, no framework glow) is written from what its CSS declares.

Run:  cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests/test_focus_effect.py -q
"""
from __future__ import annotations

import copy
import json
import pathlib
import re
import sys

PKG = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PKG))
REPO = PKG.parents[3]

import declared_tokens  # noqa: E402
import patch_merge  # noqa: E402

ENTRY = {"mamas-munches-redesign": "Home.dc.html", "eye-care-ward-end": "Eye Care Birmingham.dc.html",
         "indus-foods": "Indus Foods Website v2.dc.html"}
INDUS_PATCH = {"settings": {"custom": {"focus": {"width": "1px", "ring": "#101010", "ringOnDark": "#101010",
                                                  "offset": "1px", "bloom": "0", "source": "draft",
                                                  "style": "auto", "ringOnly": "1"}}}}


def _snap(client):
    return json.loads((REPO / "sites" / client / "theme-snapshot.json").read_text(encoding="utf-8"))


def _run(client):
    handoff = REPO / "sites" / client / "handoff"
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>",
                               (handoff / ENTRY[client]).read_text(encoding="utf-8"), flags=re.S))
    snap = copy.deepcopy(_snap(client))
    for k in ("near", "far", "bloom", "ringOnly", "style", "offset", "source"):
        snap["settings"]["custom"]["focus"].pop(k, None)
    declared_tokens.apply(snap, handoff, [], css)
    return snap["settings"]["custom"]["focus"]


def test_must_fail_mamas_clones_its_3px_ring_with_no_glow():
    f = _run("mamas-munches-redesign")
    assert (f["width"], f["offset"], f["style"], f["bloom"], f["ringOnly"], f["source"]) == \
        ("3px", "3px", "solid", "0", "1", "draft")
    assert f["ring"] == f["ringOnDark"] != "#fea620"


def test_must_fail_eye_care_clones_its_2px_ring_from_the_accent_token():
    f = _run("eye-care-ward-end")
    assert (f["width"], f["offset"], f["style"], f["bloom"], f["ringOnly"], f["source"]) == \
        ("2px", "2px", "solid", "0", "1", "draft")
    assert f["ring"] == f["ringOnDark"]


def test_indus_draft_declares_no_focus_outline_so_nothing_is_written():
    f = _run("indus-foods")
    assert "ringOnly" not in f and "source" not in f


def test_must_fail_a_declared_focus_shadow_keeps_the_framework_glow(tmp_path):
    (tmp_path / "tokens").mkdir()
    (tmp_path / "tokens" / "colors.css").write_text(":root{--a:#112233}", encoding="utf-8")
    snap = {"settings": {"custom": {"focus": {"width": "2px"}}}}
    declared_tokens.apply(snap, tmp_path, [], ":focus-visible{outline:2px solid var(--a);box-shadow:0 0 8px red}")
    f = snap["settings"]["custom"]["focus"]
    assert f["ring"] == "#112233" and "ringOnly" not in f and "bloom" not in f


def test_the_indus_patch_wins_over_a_declared_focus(tmp_path):
    snap = {"settings": {"custom": {"focus": {"width": "9px", "ring": "#ff0000", "ringOnly": "1"}}}}
    patch = tmp_path / "p.json"
    patch.write_text(json.dumps(INDUS_PATCH), encoding="utf-8")
    patch_merge.apply_patch(snap, patch, [])
    assert snap["settings"]["custom"]["focus"]["width"] == "1px"
    assert snap["settings"]["custom"]["focus"]["style"] == "auto"
