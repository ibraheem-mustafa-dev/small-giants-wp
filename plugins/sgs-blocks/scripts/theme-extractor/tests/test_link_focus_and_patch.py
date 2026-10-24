"""FR-33-1: the link focus look is written only where the draft declares one; a Fill patch merges last.

Run:  cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests/test_link_focus_and_patch.py -q
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

import pytest

PKG = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PKG))
REPO = PKG.parents[3]

import declared_tokens  # noqa: E402
import patch_merge  # noqa: E402

CLIENTS = ("indus-foods", "mamas-munches-redesign", "eye-care-ward-end")


def _handoff(client):
    return REPO / "sites" / client / "handoff"


def _framework():
    return json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("client", CLIENTS)
def test_must_fail_an_undeclared_link_focus_look_is_not_written(client):
    # the framework baseline carries link :focus-visible; none of the three drafts declares one
    snap = copy.deepcopy(_framework())
    assert ":focus-visible" in snap["styles"]["elements"]["link"]
    declared_tokens.apply(snap, _handoff(client), [])
    assert ":focus-visible" not in snap["styles"]["elements"]["link"]
    assert ":hover" in snap["styles"]["elements"]["link"]


def test_a_declared_link_focus_rule_in_the_draft_css_is_taken():
    snap = copy.deepcopy(_framework())
    css = "a:focus-visible{color:#112233;text-decoration:underline dotted}"
    declared_tokens.apply(snap, _handoff("indus-foods"), [], css)
    look = snap["styles"]["elements"]["link"][":focus-visible"]
    assert look["typography"]["textDecoration"] == "underline"
    assert look["color"]["text"]


def _snap():
    return {"settings": {"custom": {"focus": {"width": "2px", "ring": "x"}, "gutter": {"mobile": "1rem"}}},
            "styles": {"a": [1, 2]}}


def test_must_fail_a_patch_wins_and_creates_missing_paths_and_changes_nothing_else(tmp_path):
    patch = {"settings": {"custom": {"focus": {"width": "3px", "style": "auto"}}}, "styles": {"a": [3], "new": {"k": 1}}}
    f = tmp_path / "p.json"
    f.write_text(json.dumps(patch), encoding="utf-8")
    snap, before = _snap(), _snap()
    paths = patch_merge.apply_patch(snap, f, [])
    assert snap["settings"]["custom"]["focus"] == {"width": "3px", "ring": "x", "style": "auto"}
    assert snap["styles"]["a"] == [3] and snap["styles"]["new"] == {"k": 1}
    assert snap["settings"]["custom"]["gutter"] == before["settings"]["custom"]["gutter"]
    assert sorted(paths) == ["settings.custom.focus.style", "settings.custom.focus.width", "styles.a", "styles.new.k"]


def test_must_fail_a_patch_focus_overrides_the_declared_token_ring(tmp_path):
    snap = copy.deepcopy(_framework())
    declared_tokens.apply(snap, _handoff("eye-care-ward-end"), [])
    assert snap["settings"]["custom"]["focus"]["ring"]
    f = tmp_path / "p.json"
    f.write_text(json.dumps({"settings": {"custom": {"focus": {"ring": "PATCHED", "style": "auto"}}}}), encoding="utf-8")
    patch_merge.apply_patch(snap, f, [])
    assert snap["settings"]["custom"]["focus"]["ring"] == "PATCHED"
    assert snap["settings"]["custom"]["focus"]["style"] == "auto"
