"""Classless button capture + slot inference (Spec 33 upgrade for Claude Design drafts).

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_presets_classless.py -q

(a) synthetic facts -> slots and hover keys; (b) Mama's regression: class-bearing behaviour is
unchanged; (c) a live run of measure.js on a tiny classless fixture (skipped without node/Playwright).
"""
from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
SCRIPTS = PKG.parent
BLOCKS = SCRIPTS.parent
sys.path.insert(0, str(PKG))

import presets  # noqa: E402

FIXTURES = HERE / "fixtures"


def _rest(bg: str, colour: str, border: str = "rgb(0, 0, 0)", width: str = "0px") -> dict:
    return {"backgroundColor": bg, "color": colour, "borderTopColor": border, "borderTopWidth": width,
            "borderTopLeftRadius": "2px", "paddingTop": "14px", "paddingRight": "28px",
            "paddingBottom": "14px", "paddingLeft": "28px", "fontSize": "14px", "fontWeight": "600",
            "minHeight": "auto", "transform": "none"}


def _button(idx: int, sig: str, rest: dict, hover: dict, count: int, text_len: int = 12,
            w: int = 160, h: int = 44) -> dict:
    return {"classKey": "sig:" + sig, "classes": [], "ancestorClasses": [], "idx": idx,
            "path": "html>body>a", "rest": rest, "hover": hover, "count": count,
            "textLen": text_len, "w": w, "h": h}


def _synthetic_facts() -> dict:
    dark = _rest("rgb(20, 20, 20)", "rgb(250, 248, 245)")
    outline = _rest("rgba(0, 0, 0, 0)", "rgb(20, 20, 20)", "rgb(20, 20, 20)", "1px")
    # The outline button is listed FIRST but has fewer occurrences: order must not decide primary.
    return {"buttons": [
        _button(0, "outline", outline, {"backgroundColor": "rgba(0, 0, 0, 0)", "color": "rgb(20, 20, 20)",
                                        "borderTopColor": "rgb(20, 20, 20)", "transform": "none"}, 2),
        _button(1, "dark", dark, {"backgroundColor": "rgb(111, 97, 82)", "color": "rgb(250, 248, 245)",
                                  "borderTopColor": "rgb(0, 0, 0)", "transform": "none"}, 10),
    ]}


def test_classless_buttons_fill_primary_and_outline_with_hover_keys():
    trace: list = []
    got = presets.build_button_presets(_synthetic_facts(), trace)
    assert set(got) == {"primary", "outline"}
    primary = got["primary"]
    assert primary["background"] == "#141414" and primary["text"] == "#faf8f5"
    assert primary["border-radius"] == "2px" and primary["font-weight"] == "600"
    assert primary["padding"] == "14px 28px 14px 28px"
    assert "min-height" not in primary                      # "auto" is unset, never emitted
    assert primary["hover-background"] == "#6f6152" and "hover-text" not in primary
    outline = got["outline"]
    assert outline["background"] == "transparent" and outline["border"] == "#141414"
    assert outline["border-width"] == "1px"
    assert not any(k.startswith("hover-") for k in outline)  # hover identical to rest: no diff keys
    reasons = [t["reason"] for t in trace]
    assert len(trace) == 2 and all("inferred from an unclassed style signature" in r for r in reasons)


def test_second_opaque_signature_becomes_secondary_and_transparent_borderless_is_ignored():
    facts = _synthetic_facts()
    facts["buttons"].append(_button(2, "sage", _rest("rgb(138, 154, 134)", "rgb(20, 20, 20)"), {}, 4))
    facts["buttons"].append(_button(3, "plain", _rest("rgba(0, 0, 0, 0)", "rgb(20, 20, 20)"), {}, 30))
    got = presets.build_button_presets(facts, [])
    assert got["primary"]["background"] == "#141414"        # 10 occurrences beat 4
    assert got["secondary"]["background"] == "#8a9a86"
    assert set(got) == {"primary", "secondary", "outline"}  # the borderless transparent one is no slot


def test_class_bearing_slot_is_never_overwritten_by_a_classless_one():
    facts = _synthetic_facts()
    facts["buttons"].insert(0, {
        "classKey": "sgs-button sgs-button--primary||", "classes": ["sgs-button", "sgs-button--primary"],
        "ancestorClasses": [], "idx": 9, "path": "html>body>a",
        "rest": _rest("rgb(230, 138, 149)", "rgb(58, 46, 38)"), "hover": {}, "count": 1,
        "textLen": 9, "w": 160, "h": 44})
    got = presets.build_button_presets(facts, [])
    assert got["primary"]["background"] == "#e68a95"
    assert "secondary" not in got                           # the dark classless one is the 1st opaque


def _swatch(count: int, **over) -> dict:
    kw = {"text_len": 0, "w": 17, "h": 17, **over}
    rest = _rest("rgb(198, 164, 105)", "rgb(0, 0, 0)", "rgb(216, 210, 200)", "1px")
    rest["borderTopLeftRadius"] = "50%"
    return _button(50, "swatch", rest, {}, count, **kw)


@pytest.mark.parametrize("over", [
    {"text_len": 0},                                            # no label
    {"text_len": 1, "w": 120, "h": 44},                         # one glyph
    {"text_len": 5, "w": 40, "h": 40},                          # small square icon button
    {"text_len": 5, "w": 60, "h": 60},                          # circle by 50%
    {"text_len": 5, "w": 200, "h": 120},                        # a card link, not a button
])
def test_icon_swatch_and_card_controls_never_win_primary(over):
    facts = _synthetic_facts()
    facts["buttons"].append(_swatch(25, **over))                # 25 occurrences beat the real 10
    got = presets.build_button_presets(facts, [])
    assert got["primary"]["background"] == "#141414" and "secondary" not in got


def test_a_circle_by_pixel_radius_is_excluded_but_a_wide_pill_is_kept():
    circle = _swatch(25, text_len=5, w=60, h=58)
    circle["rest"]["borderTopLeftRadius"] = "40px"
    pill = _swatch(1, text_len=8, w=180, h=48)
    pill["rest"]["borderTopLeftRadius"] = "999px"
    pill["classKey"] = "sig:pill"
    assert not presets._is_real_button(circle) and presets._is_real_button(pill)


def test_ranking_is_count_then_text_length_then_signature_and_ignores_input_order():
    a = _button(1, "b-sig", _rest("rgb(20, 20, 20)", "rgb(255, 255, 255)"), {}, 3, text_len=10)
    b = _button(2, "a-sig", _rest("rgb(30, 30, 30)", "rgb(255, 255, 255)"), {}, 3, text_len=10)
    c = _button(3, "c-sig", _rest("rgb(40, 40, 40)", "rgb(255, 255, 255)"), {}, 3, text_len=20)
    for order in ([a, b, c], [c, b, a], [b, a, c]):
        got = presets.build_button_presets({"buttons": order}, [])
        assert got["primary"]["background"] == "#282828"        # longer label first
        assert got["secondary"]["background"] == "#1e1e1e"      # then signature "a-sig" < "b-sig"


def test_palette_primary_breaks_a_tie_and_brand_colours_are_not_variants():
    green = _button(1, "green", _rest("rgb(37, 211, 102)", "rgb(11, 43, 23)"), {}, 1, text_len=22)
    dark = _button(2, "dark", _rest("rgb(20, 20, 20)", "rgb(250, 248, 245)"), {}, 1, text_len=20)
    light = _button(3, "light", _rest("rgb(250, 248, 245)", "rgb(20, 20, 20)"), {}, 1, text_len=15)
    palette = [{"slug": "primary", "color": "#141414"}, {"slug": "whatsapp", "color": "#25D366"}]
    got = presets.build_button_presets({"buttons": [green, dark, light]}, [], palette)
    assert got["primary"]["background"] == "#141414"            # palette primary beats the longer label
    assert got["secondary"]["background"] == "#faf8f5"          # the WhatsApp green is skipped
    without = presets.build_button_presets({"buttons": [green, dark, light]}, [])
    assert without["primary"]["background"] == "#25d366"        # no palette: plain ranking


def test_mamas_class_bearing_presets_unchanged():
    facts = json.loads((PKG / "mamas-computed-facts.json").read_text(encoding="utf-8"))
    golden = json.loads((PKG / "expected" / "mamas-munches.snapshot.json").read_text(encoding="utf-8"))
    golden_presets = golden["settings"]["custom"]["buttonPresets"]
    pinned = json.loads((FIXTURES / "mamas-derived-button-presets.json").read_text(encoding="utf-8"))
    got = presets.build_button_presets(facts, [])
    assert got == pinned                                    # pinned BEFORE the classless change
    assert list(got) == ["primary", "secondary", "outline"]
    for slot, entry in got.items():                         # ...and still agrees with the golden
        for key, value in entry.items():
            assert golden_presets[slot][key] == value


def _run_measure(draft: pathlib.Path) -> dict:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not on PATH")
    if not (BLOCKS / "node_modules" / "playwright").is_dir():
        pytest.skip("Playwright is not installed under plugins/sgs-blocks/node_modules")
    proc = subprocess.run([node, str(PKG / "measure.js"), "--draft", str(draft)], cwd=str(BLOCKS),
                          capture_output=True, text=True, encoding="utf-8", timeout=120)
    if proc.returncode != 0 and "Executable doesn't exist" in proc.stderr:
        pytest.skip("Playwright's Chromium browser is not installed")
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def test_live_measure_captures_classless_buttons_and_custom_props():
    facts = _run_measure(FIXTURES / "classless-buttons.html")
    buttons = facts["buttons"]
    assert len(buttons) == 2                                # dark <a> (x2, deduped) + <button>; no text link
    dark = next(b for b in buttons if b["rest"]["backgroundColor"] == "rgb(20, 20, 20)")
    assert dark["classes"] == [] and dark["ancestorClasses"] == []
    assert dark["classKey"].startswith("sig:rgb(20, 20, 20)|rgb(250, 248, 245)|")
    assert dark["count"] == 2 and dark["path"].endswith("a")
    assert dark["hover"]["backgroundColor"] == "rgb(111, 97, 82)"
    assert all(set(b) >= {"classKey", "classes", "ancestorClasses", "idx", "path", "rest", "hover", "count"}
               for b in buttons)
    outline = next(b for b in buttons if b is not dark)
    assert outline["path"].endswith("button") and outline["count"] == 1
    assert outline["rest"]["borderTopWidth"] == "1px"
    props = [(p["name"], p["value"]) for p in facts["customProps"]]
    assert props == [("--acc", "#9C8B78"), ("--ink", "#6F6152")]   # sorted; the repeat is deduped
    assert all(p["path"] for p in facts["customProps"])
    # End to end: the live facts produce the inferred slots.
    got = presets.build_button_presets(facts, [])
    assert got["primary"]["background"] == "#141414" and got["outline"]["border-width"] == "1px"
    assert got["primary"]["hover-background"] == "#6f6152"


def test_live_runtime_generated_classes_are_not_meaningful_and_hover_is_settled():
    facts = _run_measure(FIXTURES / "generated-class-buttons.html")
    by_key = {b["classKey"]: b for b in facts["buttons"]}
    sig = next(b for k, b in by_key.items() if k.startswith("sig:rgb(20, 20, 20)|rgb(250, 248, 245)|"))
    assert sig["classes"] == [] and sig["ancestorClasses"] == []   # scp3 / sc-host / scp1 all ignored
    assert sig["count"] == 2 and sig["textLen"] == 11 and sig["w"] > 0 and sig["h"] > 0
    assert sig["hover"]["backgroundColor"] == "rgb(42, 42, 42)"     # the settled #2A2A2A, not mid-transition
    real = by_key["btn-real||"]                                      # a real class: key + fields unchanged
    assert real["classes"] == ["btn-real"] and real["ancestorClasses"] == []
    assert real["count"] == 1 and len(facts["buttons"]) == 2
