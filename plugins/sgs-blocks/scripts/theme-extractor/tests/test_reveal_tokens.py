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


# A marked reveal as a one-file-per-page draft records it: the standalone `translate` property, an attribute selector.
def _marked(distance: str, duration, stagger=None, dc: str = "Shop", **extra) -> dict:
    return _record('root.querySelectorAll("[data-reveal]") observed by IntersectionObserver', [
        {"property": "opacity", "from": 0, "to": 1},
        {"property": "translate", "from": f"0 {distance}", "to": "0 0"}], duration, stagger,
        element={"selector": 'root.querySelectorAll("[data-reveal]") observed by IntersectionObserver', "dc": dc},
        easing="cubic-bezier(.2,.7,.2,1)", **extra)


def test_the_standalone_translate_scale_and_rotate_properties_are_start_values():
    start, why = reveal_tokens.start_values([
        {"property": "opacity", "from": 0}, {"property": "translate", "from": "0 32px"},
        {"property": "scale", "from": ".96"}, {"property": "rotate", "from": "-4deg"}])
    assert why is None and start == {"opacity": 0, "translateY": "32px", "scale": 0.96, "rotate": "-4deg"}
    assert reveal_tokens.start_values([{"property": "opacity", "from": 0}, {"property": "translate", "from": "-12px"}])[0] == {
        "opacity": 0, "translateX": "-12px"}
    assert reveal_tokens.start_values([{"property": "opacity", "from": 0}, {"property": "scale", "from": "1.1 .9"}])[0] == {
        "opacity": 0, "scaleX": 1.1, "scaleY": 0.9}


def test_a_start_value_no_entrance_holds_is_refused_with_its_reason():
    for prop, word in (({"property": "translate", "from": "0 10px 40px"}, "translate"),
                       ({"property": "rotate", "from": "x 30deg"}, "rotate"),
                       ({"property": "clip-path", "from": "inset(10%)"}, "clip-path")):
        start, why = reveal_tokens.start_values([{"property": "opacity", "from": 0}, prop])
        assert start is None and word in why
    assert "does not fade in" in reveal_tokens.start_values([{"property": "translate", "from": "0 10px"}])[1]


def test_a_marked_reveal_writes_the_tokens_and_no_structural_rule():
    trace: list = []
    snap = reveal_tokens.apply_reveal({"settings": {"custom": {"entrance": {"reveal": {"item": {"kept": True}}}}}},
                                      [_marked("28px", 750)], trace)
    entrance = snap["settings"]["custom"]["entrance"]
    assert (entrance["distance"], entrance["duration"], entrance["easing"]) == ("28px", "750ms", "cubic-bezier(0.2, 0.7, 0.2, 1)")
    # No rule can select marked elements by structure, so none is written and an existing reveal is left alone.
    assert entrance["reveal"] == {"item": {"kept": True}}
    marked = [row for row in trace if row["what"] == "the marked reveal"]
    assert len(marked) == 1 and "[data-reveal]" in marked[0]["reason"] and marked[0]["value"]["from"] == {"opacity": 0, "translateY": "28px"}


def test_a_structural_rule_outranks_the_marked_reveal_for_the_tokens():
    entrance = _apply([_marked("28px", 750), ITEM])["settings"]["custom"]["entrance"]
    assert entrance["distance"] == "40px" and set(entrance["reveal"]) == {"item"}


def test_the_values_most_pages_share_win_and_the_page_that_differs_is_a_named_variant():
    trace: list = []
    home = _marked("32px", 800, {"ms": 90, "cap_ms": 360, "basis": "index among marked siblings"}, dc="Home", id="A-04")
    records = [home, _marked("28px", 750, id="A-05"), _marked("28px", 750, dc="Gifts", id="A-07")]
    entrance = reveal_tokens.apply_reveal({}, records, trace)["settings"]["custom"]["entrance"]
    assert (entrance["distance"], entrance["duration"]) == ("28px", "750ms") and "staggerStep" not in entrance
    variants = [row for row in trace if row["kind"] == "gap"]
    assert len(variants) == 1 and "A-04 (Home)" in variants[0]["what"] and "variant" in variants[0]["reason"]
    # Negative control: pages that agree leave no variant row.
    agree: list = []
    reveal_tokens.apply_reveal({}, records[1:], agree)
    assert not [row for row in agree if row["kind"] == "gap"]


def test_every_refused_scroll_reveal_record_is_a_gap_row_naming_the_record_and_the_reason():
    trace: list = []
    no_role = _record("every .card in the page", [{"property": "opacity", "from": 0, "to": 1}], 500, id="A-09")
    reveal_tokens.apply_reveal({}, [{**CLIP, "id": "A-08"}, {**LINE, "id": "A-06"}, {**ITEM, "status": "dead-code", "id": "A-05"},
                                    no_role, {**HEADING, "duration_ms": "fast", "id": "A-03"}, {**ITEM, "group": "hover"}], trace)
    reasons = {row["what"].split()[-1]: row["reason"] for row in trace if row["kind"] == "gap"}
    assert set(reasons) == {"A-08", "A-06", "A-05", "A-09", "A-03"}  # the hover record is no scroll-reveal record
    assert "clip-path" in reasons["A-08"] and "scaleX(0)" in reasons["A-06"] and "dead code" in reasons["A-05"]
    assert "selects neither" in reasons["A-09"] and "duration" in reasons["A-03"]


def test_the_real_handoffs_one_file_per_page_draft_gives_its_reveal_and_names_home_as_a_variant():
    trace: list = []
    records = reveal_tokens.read_records(REPO / "sites" / "mamas-munches-redesign" / "handoff")
    entrance = reveal_tokens.apply_reveal({}, records, trace)["settings"]["custom"]["entrance"]
    assert (entrance["distance"], entrance["duration"], entrance["easing"]) == ("28px", "750ms", "cubic-bezier(0.2, 0.7, 0.2, 1)")
    assert "reveal" not in entrance
    assert [row["what"] for row in trace if row["kind"] == "gap"] == ["scroll-reveal record A-04 (Home)"]
