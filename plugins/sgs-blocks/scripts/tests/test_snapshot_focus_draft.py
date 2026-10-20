"""
Tests for the draft-sourced focus marker in snapshot_focus_tokens.py (owner decision 2026-10-20: a draft's focus
styling wins over the 3:1 contrast rule). MUST FAIL cases: an unmarked sub-3:1 ring fails; a marked one passes and is
recorded; a marked object still fails a missing key and an inner/ink pair under 9:1; the fixer never recalibrates it.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_snapshot_focus_draft.py -q
"""
from __future__ import annotations

import copy
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_DIR))
import snapshot_focus_tokens as ft  # noqa: E402

# A pale yellow accent on a pale ground: the accent itself is far under 3:1.
PALE = "#f5d050"


def snapshot(focus: dict | None) -> dict:
    palette = [{"slug": s, "color": c} for s, c in (
        ("surface", "#fbf3dc"), ("surface-alt", "#fbf3dc"), ("section", "#fff9f0"), ("footer-bg", "#0f172a"),
        ("text", "#1a1a1a"), ("accent", PALE), ("accent-light", "#fef3c7"), ("primary", "#1f7a7a"))]
    custom: dict = {"gutter": {"mobile": "1rem"}}
    if focus is not None:
        custom = {"focus": focus, **custom}
    return {"version": 3, "settings": {"color": {"palette": palette}, "custom": custom}}


def full_focus(**over: str) -> dict:
    base = {k: ft.var("accent") for k in ft.FOCUS_KEYS}
    base.update(width="2px", inner=ft.var("surface"), ink=ft.var("text"), ringOnDark="#e2d45b")
    base.update(over)
    return base


def test_unmarked_pale_ring_fails_on_3_to_1():
    problems = ft.check_snapshot(snapshot(full_focus()))
    assert any(p.startswith("ring ") and "under 3.0:1" in p for p in problems)


def test_marked_pale_ring_passes_and_is_recorded():
    snap = snapshot(full_focus(source="draft"))
    assert ft.check_snapshot(snap) == []
    assert ft.draft_sourced(snap)
    notes = ft.draft_ring_notes(snap)
    assert any(n.startswith("ring ") and "under 3.0:1, not failed" in n for n in notes)


def test_marker_must_be_exactly_draft():
    for value in ("Draft", "derived", ""):
        assert any("under 3.0:1" in p for p in ft.check_snapshot(snapshot(full_focus(source=value))))
    assert ft.draft_ring_notes(snapshot(full_focus())) == []


def test_marked_object_still_fails_a_missing_key():
    focus = full_focus(source="draft")
    del focus["far"]
    assert "missing key far" in ft.check_snapshot(snapshot(focus))


def test_marked_object_still_fails_inner_ink_under_9_to_1():
    focus = full_focus(source="draft", ink=ft.var("surface"))
    assert any("inner/ink" in p for p in ft.check_snapshot(snapshot(focus)))


def test_marked_ring_on_dark_is_not_failed_either():
    focus = full_focus(source="draft", ringOnDark=ft.var("footer-bg"))
    assert ft.check_snapshot(snapshot(focus)) == []


def test_recalibrate_never_moves_a_draft_ring():
    snap = snapshot(full_focus(source="draft", ring="#e2d45b"))
    out, _ = ft.derive_focus(snap, recalibrate=True)
    assert out["ring"] == "#e2d45b"
    unmarked = copy.deepcopy(snap)
    del unmarked["settings"]["custom"]["focus"]["source"]
    assert ft.derive_focus(unmarked, recalibrate=True)[0]["ring"] != "#e2d45b"


def test_optional_shape_keys_survive_the_fixer_and_are_not_required():
    snap = snapshot(full_focus(source="draft", offset="0px", bloom="0"))
    out, _ = ft.derive_focus(snap)
    assert (out["offset"], out["bloom"], out["source"]) == ("0px", "0", "draft")
    assert ft.missing_focus_keys(snapshot(full_focus())) == []
    assert ft.check_snapshot(snapshot(full_focus(source="draft"))) == []
