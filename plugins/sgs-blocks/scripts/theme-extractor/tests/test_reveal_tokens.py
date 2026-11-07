"""Tests for reveal_tokens: the scroll-reveal records become settings.custom.entrance (FR-38A-61)."""
from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import reveal_tokens  # noqa: E402

REPO = pathlib.Path(__file__).resolve().parents[5]
DETAIL = "IntersectionObserver threshold 0.12, rootMargin 0px 0px -4% 0px; each target animates once."


def _record(selector: str, props: list, duration, stagger=None, **extra) -> dict:
    base = {"id": "A-01", "group": "scroll-reveal", "mechanism": "waapi", "status": "active",
            "element": {"selector": selector}, "trigger": {"type": "scroll-into-view", "detail": DETAIL},
            "properties": props, "duration_ms": duration, "stagger": stagger,
            "easing": "cubic-bezier(.16,.84,.32,1)"}
    return {**base, **extra}


ITEM = _record("children of qualifying div containers", [
    {"property": "opacity", "from": 0, "to": 1},
    {"property": "transform", "from": "translateY(40px) scale(.96)", "to": "none"}], 800,
    {"ms": 80, "cap_ms": 560, "basis": "child index within its container, modulo 8"})
HEADING = _record("main section -> querySelectorAll('h2, h2 + p')", [
    {"property": "opacity", "from": 0, "to": 1},
    {"property": "transform", "from": "translateY(22px)", "to": "none"},
    {"property": "filter", "from": "blur(6px)", "to": "blur(0)"}], 850)
CLIP = _record("parentElement of every image-slot", [
    {"property": "opacity", "from": 0, "to": 1},
    {"property": "clip-path", "from": "inset(10%)", "to": "inset(0)"}], 1000)
LINE = _record("[data-draw]", [{"property": "transform", "from": "scaleX(0)", "to": "scaleX(1)"}], 1400)


def _apply(records: list, snap: dict | None = None) -> dict:
    return reveal_tokens.apply_reveal(snap if snap is not None else {}, records, [])


def test_the_item_and_heading_records_write_tokens_and_rules():
    entrance = _apply([HEADING, CLIP, LINE, ITEM])["settings"]["custom"]["entrance"]
    assert entrance["duration"] == "800ms" and entrance["distance"] == "40px" and entrance["scale"] == 0.96
    assert (entrance["start"], entrance["staggerStep"], entrance["staggerCap"], entrance["staggerEvery"]) == (4, 80, 560, 8)
    assert entrance["easing"] == "cubic-bezier(0.16, 0.84, 0.32, 1)"
    assert entrance["reveal"]["item"] == {"from": {"opacity": 0, "translateY": "40px", "scale": 0.96},
                                          "duration": 800, "easing": "cubic-bezier(0.16, 0.84, 0.32, 1)"}
    assert entrance["reveal"]["heading"]["from"] == {"opacity": 0, "translateY": "22px", "blur": "6px"}
    assert entrance["reveal"]["heading"]["duration"] == 850


def test_clip_reveals_and_line_draws_are_not_rules():
    assert set(reveal_tokens.reveal_rules([CLIP, LINE])) == set()


def test_a_draft_with_no_reveal_record_writes_nothing_and_keeps_an_existing_reveal():
    snap = {"settings": {"custom": {"entrance": {"duration": "900ms", "reveal": {"item": {}}}}}}
    before = json.dumps(snap, sort_keys=True)
    assert json.dumps(_apply([CLIP, LINE, {**ITEM, "group": "hover"}], snap), sort_keys=True) == before
    assert _apply([]) == {}


def test_a_dead_code_record_is_ignored():
    assert reveal_tokens.reveal_rules([{**ITEM, "status": "dead-code"}]) == {}


def test_a_heading_only_draft_takes_its_tokens_from_the_heading_and_has_no_item_rule():
    entrance = _apply([HEADING])["settings"]["custom"]["entrance"]
    assert "item" not in entrance["reveal"] and entrance["distance"] == "22px" and "staggerStep" not in entrance


def test_only_the_reveal_keys_change_in_an_existing_entrance():
    snap = {"settings": {"custom": {"entrance": {"distance": "28px", "other": "kept"}}}}
    entrance = _apply([ITEM], snap)["settings"]["custom"]["entrance"]
    assert entrance["other"] == "kept" and entrance["distance"] == "40px"


def test_the_indus_handoff_gives_the_agreed_values():
    records = reveal_tokens.read_records(REPO / "sites" / "indus-foods" / "handoff")
    entrance = _apply(records)["settings"]["custom"]["entrance"]
    assert (entrance["duration"], entrance["distance"], entrance["scale"], entrance["start"]) == ("800ms", "40px", 0.96, 4)
    assert (entrance["staggerStep"], entrance["staggerCap"], entrance["staggerEvery"]) == (80, 560, 8)
    assert entrance["reveal"]["heading"]["duration"] == 850 and entrance["reveal"]["heading"]["from"]["blur"] == "6px"
