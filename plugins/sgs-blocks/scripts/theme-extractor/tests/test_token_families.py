"""Spec 32 FR-32-29: tokens are defaults, presets are the picker scale (token_families.py).

Run:  cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests/test_token_families.py -q
"""
from __future__ import annotations

import json
import pathlib
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import token_families as tf  # noqa: E402
import token_files  # noqa: E402
import snapshot_token_roster as roster  # noqa: E402

REPO = HERE.parents[3]
BASELINE = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
CLIENTS = sorted(p.parent.parent.name for p in (REPO / "sites").glob("*/handoff/tokens"))


def draft(tmp_path, spacing_css: str, typography_css: str = "", html: str = "") -> pathlib.Path:
    folder = tmp_path / "tokens"
    folder.mkdir()
    (folder / "spacing.css").write_text(spacing_css, encoding="utf-8")
    (folder / "typography.css").write_text(typography_css or ":root{--x-unused:1}", encoding="utf-8")
    (tmp_path / "Home.dc.html").write_text(html, encoding="utf-8")
    return tmp_path


def run(tmp_path, spacing_css, typography_css="", html="", snap=None, movement=None):
    d = draft(tmp_path, spacing_css, typography_css, html)
    snap = snap if snap is not None else {"settings": {"custom": {}}}
    tokens = token_files.read_token_files(d)
    tf.apply(snap, tokens, d, BASELINE, movement, [])
    return snap, tokens, d


def sizes(snap, key="spacing"):
    rows = snap["settings"]["spacing"]["spacingSizes"] if key == "spacing" else snap["settings"]["typography"]["fontSizes"]
    return {e["slug"]: e for e in rows}


GAPS = ":root{--gap-1:8px;--gap-2:10px;--gap-3:14px;--gap-4:18px;--gap-5:22px;--gap-6:28px;--gap-7:40px;--gap-8:64px;--gap-9:80px}"


def test_the_spacing_scale_spans_the_drafts_range_and_carries_token_names(tmp_path):
    html = "".join("<div style='gap:%dpx'></div>" % v for v in (8, 10, 14, 18, 22, 28, 40, 64) for _ in range(3))
    snap, _, _ = run(tmp_path, GAPS, html=html)
    got = sizes(snap)
    values = [got[s]["size"] for s in ("10", "20", "30", "40", "50", "60", "70", "80")]
    assert values[0] == "8px" and values[-1] == "80px"
    assert values == sorted(values, key=lambda v: int(v[:-2])) and len(set(values)) == 8
    assert got["10"]["name"] == "Gap 1" and snap["settings"]["custom"]["presetTokens"]["spacing"]["10"] == "gap-1"
    assert len(got) == 8


def test_seven_font_size_tokens_leave_no_framework_value_in_the_six_slots(tmp_path):
    typo = ":root{--fs-body:19px;--fs-mono:12px;--fs-eyebrow:13px;--fs-nav:17px;--fs-card:22px;--fs-h2:clamp(28px,3.4vw,40px);--fs-h1:clamp(36px,5vw,62px)}" + chr(10) + "body{font-size:var(--fs-body)}"
    snap, _, _ = run(tmp_path, ":root{--gap-1:8px}", typo)
    carried = snap["settings"]["custom"]["presetTokens"]["fontSizes"]
    assert set(carried) == {"small", "regular", "large", "x-large", "xx-large", "hero"}
    assert carried["hero"] == "fs-h1" and carried["regular"] == "fs-body" and None in carried.values()
    got = sizes(snap, "fontSizes")
    values = [float(got[s_]["size"][:-2]) for s_ in ("small", "regular", "large", "x-large") if got[s_]["size"].endswith("px")]
    assert values == sorted(values) and len(set(values)) == len(values)  # no slot smaller than the one before it


def test_the_default_timing_is_the_most_used_across_every_element(tmp_path):
    import motion_tokens
    html = "<a style='transition:opacity .4s ease-out'></a><b style='transition:color .4s ease-out'></b><i style='transition:transform .2s ease'></i>"
    assert motion_tokens.overall_timing(html, None)["duration_ms"] == 400


def test_negative_control_a_ninth_scale_token_never_makes_a_ninth_preset(tmp_path):
    """MUST FAIL if the picker list grows past 8: the slider would turn into a dropdown."""
    snap, _, _ = run(tmp_path, GAPS)
    assert len(snap["settings"]["spacing"]["spacingSizes"]) <= 8
    assert not roster.problems(snap, {"spacing": ["10", "20", "30", "40", "50", "60", "70", "80"], "fontSizes": []})


def test_two_tokens_with_one_value_are_one_scale_step(tmp_path):
    """MUST FAIL on a build that keeps both: one value on two slots reads as two different sizes in the picker."""
    snap, _, _ = run(tmp_path, ":root{--gap-a:12px;--gap-b:12px;--gap-c:20px}")
    values = [e["size"] for e in snap["settings"]["spacing"]["spacingSizes"]]
    assert values.count("12px") == 1
    carried = snap["settings"]["custom"]["presetTokens"]["spacing"]
    assert len(set(carried.values())) == len(carried)


def test_negative_control_without_the_one_per_value_rule_the_value_repeats(tmp_path, monkeypatch):
    monkeypatch.setattr(tf, "_one_per_value", lambda rows, usage, prefer: rows)
    snap, _, _ = run(tmp_path, ":root{--gap-a:12px;--gap-b:12px;--gap-c:20px}")
    assert [e["size"] for e in snap["settings"]["spacing"]["spacingSizes"]].count("12px") == 2


def test_an_alias_is_no_scale_step_and_no_token(tmp_path):
    """MUST FAIL if an alias is read as a token: `--gap-alias: var(--gap-2)` would take a slot of its own."""
    snap, tokens, _ = run(tmp_path, ":root{--gap-1:8px;--gap-2:16px;--gap-alias:var(--gap-2)}")
    assert "gap-alias" not in json.dumps(snap["settings"]["custom"]["presetTokens"])
    assert "gap-alias" not in {r["token"] for rows in tf.read(tokens)["families"].values() for r in rows}


def test_a_per_width_heading_set_offers_only_its_widest_token_to_the_scale(tmp_path):
    typo = ":root{--mm-h1-m:46px;--mm-h1-t:54px;--mm-h1-d:82px;--mm-size-16:16px;--mm-text-body-size:var(--mm-size-16)}"
    snap, _, _ = run(tmp_path, ":root{--mm-gap:8px}", typo)
    carried = snap["settings"]["custom"]["presetTokens"]["fontSizes"]
    assert "mm-h1-m" not in carried.values() and "mm-h1-t" not in carried.values()
    assert carried["regular"] == "mm-size-16"


def test_the_body_size_token_the_body_rule_uses_is_pinned_to_regular(tmp_path):
    typo = ":root{--fs-body:19px;--fs-nav:17px;--fs-card:22px}\nbody{font-size:var(--fs-body)}"
    snap, _, _ = run(tmp_path, ":root{--gap-1:8px}", typo)
    assert snap["settings"]["custom"]["presetTokens"]["fontSizes"]["regular"] == "fs-body"
    assert sizes(snap, "fontSizes")["regular"]["size"] == "19px"


def test_a_slot_no_token_reaches_keeps_its_framework_value(tmp_path):
    snap, _, _ = run(tmp_path, ":root{--gap-1:8px;--gap-2:16px}")
    got = sizes(snap)
    assert set(got) >= {"10", "20", "30", "40", "50", "60", "70", "80"}
    carried = snap["settings"]["custom"]["presetTokens"]["spacing"]
    for slot in set(got) - set(carried):
        assert got[slot]["size"] == next(e["size"] for e in BASELINE["settings"]["spacing"]["spacingSizes"] if e["slug"] == slot)


def test_radius_defaults_take_the_pill_the_button_radius_and_the_extremes(tmp_path):
    css = ":root{--radius-tag:3px;--radius-tile:12px;--radius-card:22px;--radius-pill:999px}"
    snap = {"settings": {"custom": {"buttonPresets": {"primary": {"border-radius": "12px"}}}}}
    snap, _, _ = run(tmp_path, css, snap=snap)
    assert snap["settings"]["custom"]["borderRadius"] == {**snap["settings"]["custom"]["borderRadius"], "small": "3px", "medium": "12px", "large": "22px", "pill": "999px"}


def test_the_button_transition_is_the_default_duration_and_easing(tmp_path):
    css = ":root{--dur-card:.3s;--dur-press:.2s;--ease-spring:cubic-bezier(.3,1.6,.5,1)}"
    snap, tokens, d = run(tmp_path, css, movement={"duration_ms": 200, "easing": "cubic-bezier(0.3, 1.6, 0.5, 1)"})
    custom = snap["settings"]["custom"]
    assert custom["duration"]["fast"] == ".2s" and custom["easing"]["default"] == "cubic-bezier(.3,1.6,.5,1)"
    where = tf.accounting(snap, tokens, d)
    assert where["dur-press"]["where"] == "default" and where["dur-card"]["where"] == "literal"


def test_a_draft_with_no_token_file_is_untouched():
    snap = {"settings": {"custom": {}}}
    tf.apply(snap, None, ".", BASELINE, None, [])
    assert snap == {"settings": {"custom": {}}}


@pytest.mark.parametrize("client", CLIENTS)
def test_every_draft_token_is_a_default_a_preset_or_a_literal_exactly_once(client):
    handoff = REPO / "sites" / client / "handoff"
    snap = json.loads((REPO / "sites" / client / "theme-snapshot.json").read_text(encoding="utf-8"))
    tokens = token_files.read_token_files(handoff)
    where = tf.accounting(snap, tokens, handoff)
    parsed = tf.read(tokens)
    expected = {r["token"] for rows in parsed["families"].values() for r in rows} | set(parsed["skipped"])
    assert set(where) == expected and expected
    assert all(w["where"] in ("default", "preset", "literal") for w in where.values())
    carried = [t for m in snap["settings"]["custom"]["presetTokens"].values() for t in m.values() if t]
    assert len(carried) == len(set(carried))
    assert not roster.problems(snap) and all(t in where for t in carried if t)
    assert snap["settings"]["custom"]["defaultTokens"] == sorted(t for t, w in where.items() if w["where"] == "default")


def test_the_font_scale_ascends_strictly_with_hero_the_largest_heading_and_a_literal_filling_a_gap(tmp_path):
    """Seven tokens, only two of them above the body size besides hero: the third middle slot takes the draft's most used literal size."""
    typo = (":root{--fs-body:19px;--fs-mono:12px;--fs-nav:17px;--fs-card:22px;--fs-h2:clamp(28px,3.4vw,40px);--fs-h1:clamp(36px,5vw,62px)}"
            + chr(10) + "body{font-size:var(--fs-body)}")
    html = "<p style='font-size:20px'></p>" * 3 + "<p style='font-size:12px'></p>"
    snap, _, _ = run(tmp_path, ":root{--x-unused:1px}", typo, html=html)
    got = sizes(snap, "fontSizes")
    order = ["small", "regular", "large", "x-large", "xx-large", "hero"]
    assert [got[s]["size"] for s in order] == ["12px", "19px", "20px", "22px", "clamp(28px,3.4vw,40px)", "clamp(36px,5vw,62px)"]
    carried = snap["settings"]["custom"]["presetTokens"]["fontSizes"]
    assert carried["large"] is None and carried["hero"] == "fs-h1" and carried["regular"] == "fs-body"
    assert not roster.problems(snap, {"fontSizes": order, "spacing": []})


def test_negative_control_a_slot_smaller_than_the_one_before_it_fails_the_gate(tmp_path):
    typo = ":root{--fs-body:19px;--fs-mono:12px}" + chr(10) + "body{font-size:var(--fs-body)}"
    snap, _, _ = run(tmp_path, ":root{--gap-1:8px}", typo)
    snap["settings"]["typography"]["fontSizes"][2]["size"] = "10px"
    assert any("not larger than the slot before it" in p for p in roster.problems(snap, {"fontSizes": ["small", "regular", "large"], "spacing": []}))
