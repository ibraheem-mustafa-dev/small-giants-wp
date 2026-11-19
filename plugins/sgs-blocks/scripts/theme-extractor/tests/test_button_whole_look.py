"""A button preset's whole look, the draft's own preset names and the gap rows for every look not written.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_button_whole_look.py -q

(a) synthetic facts: shadows, the pressed look, the hover timing and their negative controls; (b) a button component's
named versions become presets under their names, and the page's other buttons are gaps; (c) the gap rows for looks
the classless inference does not write; (d) live runs of measure.js on a press fixture and on a component fixture
(skipped without node/Playwright).
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
BLOCKS = PKG.parent.parent
REPO = BLOCKS.parent.parent
sys.path.insert(0, str(PKG))

import button_components  # noqa: E402
import palette_refs  # noqa: E402
import presets  # noqa: E402

FIXTURES = HERE / "fixtures"
INK = "rgb(34, 34, 34)"


def _rest(bg="rgb(255, 204, 0)", shadow="none", transition=None) -> dict:
    rest = {"backgroundColor": bg, "color": INK, "borderTopColor": INK, "borderTopWidth": "2px",
            "borderTopLeftRadius": "999px", "paddingTop": "0px", "paddingRight": "30px", "paddingBottom": "0px",
            "paddingLeft": "30px", "fontSize": "17px", "fontWeight": "700", "minHeight": "auto",
            "transform": "none", "boxShadow": shadow}
    prop, dur, ease, delay = transition or ("all", "0s", "ease", "0s")
    rest.update(transitionProperty=prop, transitionDuration=dur, transitionTimingFunction=ease, transitionDelay=delay)
    return rest


def _state(bg, transform="none", shadow="none") -> dict:
    return {"backgroundColor": bg, "color": INK, "borderTopColor": INK, "transform": transform, "boxShadow": shadow}


LIFT = "matrix(1, 0, 0, 1, -3, -3)"
SINK = "matrix(1, 0, 0, 1, 3, 3)"
SHADOW_4 = f"{INK} 4px 4px 0px 0px"
SHADOW_7 = f"{INK} 7px 7px 0px 0px"
SHADOW_0 = f"{INK} 0px 0px 0px 0px"
SPRING_TRANSITION = ("transform, box-shadow, background", "0.2s, 0.2s, 0.2s",
                     "cubic-bezier(0.3, 1.6, 0.5, 1), ease, ease", "0s, 0s, 0s")


def _pressing_button(states=True, quirk=False) -> dict:
    """A classless primary-to-be: 4px shadow, lifts 3px with a 7px shadow on hover, sinks 3px with no shadow when
    pressed. ``quirk``: the hover rule outranks the pressed rule while both match, so only ``:active`` alone shows it."""
    b = {"classKey": "sig:yellow", "classes": [], "ancestorClasses": [], "idx": 0, "path": "main>a", "count": 3,
         "textLen": 11, "w": 180, "h": 60,
         "rest": _rest(shadow=SHADOW_4, transition=SPRING_TRANSITION),
         "hover": _state("rgb(255, 255, 255)", LIFT, SHADOW_7)}
    if states:
        hover = _state("rgb(255, 255, 255)", LIFT, SHADOW_7)
        b["states"] = {"rest": _state("rgb(255, 204, 0)", "none", SHADOW_4), "hover": hover,
                       "active": _state("rgb(255, 204, 0)", SINK, SHADOW_0),
                       "pressed": dict(hover) if quirk else _state("rgb(255, 255, 255)", SINK, SHADOW_0)}
    return b


def _flat_button() -> dict:
    """No shadow, no transition, no pressed look: the negative control."""
    flat = _state("rgb(238, 238, 238)")
    return {"classKey": "sig:flat", "classes": [], "ancestorClasses": [], "idx": 1, "path": "main>a", "count": 5,
            "textLen": 12, "w": 180, "h": 48, "rest": _rest("rgb(51, 51, 51)"), "hover": flat,
            "states": {"rest": _state("rgb(51, 51, 51)"), "hover": flat, "active": _state("rgb(51, 51, 51)"),
                       "pressed": dict(flat)}}


# ── (a) the whole look ──────────────────────────────────────────────────────────────────────────────────────────


def test_whole_look_writes_shadows_press_and_timing():
    got = presets.build_button_presets({"buttons": [_pressing_button()]}, [])["primary"]
    assert got["shadow"] == "4px 4px 0 #222222"
    assert got["hover-shadow"] == "7px 7px 0 #222222"
    assert got["active-transform"] == SINK
    assert got["active-shadow"] == "0 0 0 #222222"
    assert got["hover-transition"] == "0.2s"
    assert got["hover-easing"] == "cubic-bezier(.3,1.6,.5,1)"
    assert got["hover-easing-colour"] == "ease" and got["hover-easing-shadow"] == "ease"


def test_pressed_rule_outranked_by_hover_is_read_from_active_alone():
    got = presets.build_button_presets({"buttons": [_pressing_button(quirk=True)]}, [])["primary"]
    assert got["active-transform"] == SINK and got["active-shadow"] == "0 0 0 #222222"


def test_flat_button_writes_no_shadow_press_or_timing_keys():
    trace: list = []
    got = presets.build_button_presets({"buttons": [_flat_button()]}, trace)["primary"]
    for key in ("shadow", "hover-shadow", "active-transform", "active-shadow", "hover-transition",
                "hover-easing", "hover-easing-colour", "hover-easing-shadow"):
        assert key not in got
    assert not [t for t in trace if t["kind"] == "gap"]


def test_unread_pressed_state_is_a_gap_row():
    b = _pressing_button()
    b["states"] = None
    trace: list = []
    got = presets.build_button_presets({"buttons": [b]}, trace)["primary"]
    assert "active-transform" not in got and "active-shadow" not in got
    gap = next(t for t in trace if t["kind"] == "gap")
    assert gap["what"] == "buttonPresets.primary" and gap["count"] == 3 and "could not be forced" in gap["reason"]


def test_second_duration_delay_and_snapping_part_are_gap_rows():
    b = _pressing_button()
    b["rest"].update(transitionProperty="transform, box-shadow", transitionDuration="0.2s, 0.35s",
                     transitionTimingFunction="ease-out", transitionDelay="0s, 0.1s")
    trace: list = []
    got = presets.build_button_presets({"buttons": [b]}, trace)["primary"]
    assert got["hover-transition"] == "0.2s" and got["hover-easing"] == "ease-out"
    assert got["hover-easing-shadow"] == "ease-out" and "hover-easing-colour" not in got
    reasons = " | ".join(t["reason"] for t in trace if t["kind"] == "gap")
    assert "the shadow transition lasts 0.35s" in reasons
    assert "waits 0.1s" in reasons
    assert "the colour change snaps" in reasons


def test_shadow_text_and_easing_text_forms():
    assert presets.shadow_text("rgb(58, 42, 34) 4px 4px 0px 0px") == "4px 4px 0 #3a2a22"
    assert presets.shadow_text("rgba(0, 0, 0, 0.25) 0px 6px 20px 0px, rgb(0, 0, 0) 0px 0px 0px 2px inset") == \
        "0 6px 20px rgba(0, 0, 0, 0.25), inset 0 0 0 2px #000000"
    assert presets.shadow_text("none") is None
    assert presets._easing_text("cubic-bezier(0.34, 1.56, 0.64, 1)") == "cubic-bezier(.34,1.56,.64,1)"
    assert presets._easing_text("ease-in-out") == "ease-in-out"


def test_shadow_colour_references_the_text_slug():
    snap = {"settings": {"color": {"palette": [{"slug": "text", "color": "#222222"}]},
                         "custom": {"buttonPresets": {"primary": {"shadow": "4px 4px 0 #222222",
                                                                  "active-shadow": "0 0 0 #123456"}}}}}
    palette_refs.tokenise_button_presets(snap, [], {"primary": {"shadow": 1, "active-shadow": 1}})
    got = snap["settings"]["custom"]["buttonPresets"]["primary"]
    assert got["shadow"] == "4px 4px 0 var(--wp--preset--color--text)"
    assert got["active-shadow"] == "0 0 0 #123456"                     # no slot holds it: stays as measured


# ── (b) the draft's own names ───────────────────────────────────────────────────────────────────────────────────


def _component(version, bg, mounts, size="md") -> dict:
    b = _pressing_button()
    b["rest"]["backgroundColor"] = bg
    return {"component": "Button", "version": version, "size": size, "form": "button", "mounts": mounts,
            "sizes": {size: mounts}, "painted": True, "tag": "button", "rest": b["rest"], "hover": b["states"]["hover"],
            "states": b["states"], "w": 180, "h": 60, "textLen": 13}


def test_component_versions_are_presets_under_their_own_names():
    page_primary = _pressing_button()
    page_primary["rest"]["fontSize"] = "18px"                          # the page's large add-to-basket button
    facts = {"buttons": [page_primary],
             "componentButtons": [_component("primary", "rgb(255, 204, 0)", 3),
                                  _component("secondary", "rgb(255, 255, 255)", 1),
                                  _component("quiet", "rgb(238, 238, 238)", 0)]}
    trace: list = []
    got = presets.build_button_presets(facts, trace)
    assert set(got) == {"primary", "secondary", "quiet"}
    assert got["primary"]["font-size"] == "17px" and got["primary"]["background"] == "#ffcc00"
    assert got["quiet"]["background"] == "#eeeeee" and got["quiet"]["active-transform"] == SINK
    rows = {t["slot"]: t for t in trace if t["kind"] == "preset"}
    assert rows["buttonPresets.primary"]["variant_from"] == "component version"
    gaps = [t for t in trace if t["kind"] == "gap"]
    assert not any(t["what"] == "buttonPresets.quiet" and "no framework slot" in t["reason"] for t in gaps)
    assert any(t["what"] == "buttonPresets" and "drawn where it stands" in t["reason"] and t["count"] == 3
               for t in gaps)


def test_component_that_draws_no_button_is_a_gap_and_page_inference_stands():
    facts = {"buttons": [_pressing_button()],
             "componentButtons": [{"component": "Button", "version": "primary", "mounts": 2, "painted": False}]}
    trace: list = []
    got = presets.build_button_presets(facts, trace)
    assert got["primary"]["background"] == "#ffcc00"                   # the page's own button, as before
    assert any(t["kind"] == "gap" and "drew no button" in t["reason"] for t in trace)


def test_probes_follow_the_component_definition_and_its_mounts():
    probes = {p["meta"]["version"]: p for p in button_components.probes(FIXTURES / "button-component")}
    assert set(probes) == {"primary", "secondary", "quiet"}          # Field draws no button
    assert probes["primary"]["meta"]["sizes"] == {"lg": 1, "md": 2} and probes["primary"]["attrs"]["size"] == "md"
    assert probes["primary"]["meta"]["form"] == "button" and "href" not in probes["primary"]["attrs"]
    assert probes["secondary"]["meta"]["form"] == "link" and probes["secondary"]["attrs"]["href"] == "#"
    assert probes["quiet"]["meta"]["mounts"] == 0 and probes["quiet"]["attrs"]["size"] == "md"   # the default size
    assert all(p["component"] == "Button" for p in probes.values())


def test_a_draft_without_a_component_has_no_probes():
    assert button_components.probes(FIXTURES / "pre48a-optician") == []


# ── (c) no silent drops ─────────────────────────────────────────────────────────────────────────────────────────


def test_every_unwritten_look_is_a_gap_row():
    chip = dict(_pressing_button(), classKey="sig:chip|state", stateControl=True, count=12)
    text_link = dict(_flat_button(), classKey="sig:text", rest=dict(_rest("rgba(0, 0, 0, 0)"), borderTopWidth="0px"),
                     count=4)
    fourth = dict(_pressing_button(), classKey="sig:pink", count=1)
    fourth["rest"] = dict(fourth["rest"], backgroundColor="rgb(249, 213, 211)")
    second = dict(_pressing_button(), classKey="sig:paper", count=2)
    second["rest"] = dict(second["rest"], backgroundColor="rgb(255, 250, 240)")
    facts = {"buttons": [_pressing_button(), second, fourth, chip, text_link]}
    trace: list = []
    got = presets.build_button_presets(facts, trace)
    assert set(got) == {"primary", "secondary"}
    gaps = {t["look"].split(",")[0]: t for t in trace if t["kind"] == "gap" and t["what"] == "buttonPresets"}
    assert "#f9d5d3 fill" in gaps and gaps["#f9d5d3 fill"]["count"] == 1
    assert "no framework slot is left" in gaps["#f9d5d3 fill"]["reason"]
    assert "holds a state" in gaps["#ffcc00 fill"]["reason"] and gaps["#ffcc00 fill"]["count"] == 12   # the chip
    assert "transparent fill" in gaps and "no slot fits" in gaps["transparent fill"]["reason"]          # text link


# ── (d) live measure.js ─────────────────────────────────────────────────────────────────────────────────────────


def _run_measure(draft: pathlib.Path, components: list | None = None) -> dict:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not on PATH")
    if not (BLOCKS / "node_modules" / "playwright").is_dir():
        pytest.skip("Playwright is not installed under plugins/sgs-blocks/node_modules")
    cmd = [node, str(PKG / "measure.js"), "--draft", str(draft)]
    if components:
        cmd += ["--components", json.dumps(components)]
    proc = subprocess.run(cmd, cwd=str(BLOCKS), capture_output=True, text=True, encoding="utf-8", timeout=180)
    if proc.returncode != 0 and "Executable doesn't exist" in proc.stderr:
        pytest.skip("Playwright's Chromium browser is not installed")
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def test_live_measure_reads_the_pressed_look_and_timing():
    facts = _run_measure(FIXTURES / "button-press.html")
    trace: list = []
    got = presets.build_button_presets(facts, trace)
    assert got["primary"]["shadow"] == "4px 4px 0 #222222" and got["primary"]["hover-shadow"] == "7px 7px 0 #222222"
    assert got["primary"]["active-transform"] == SINK and got["primary"]["active-shadow"] == "0 0 0 #222222"
    assert got["primary"]["hover-transition"] == "0.2s"
    assert got["primary"]["hover-easing"] == "cubic-bezier(.3,1.6,.5,1)"
    assert any(t["kind"] == "gap" and "the shadow transition lasts 0.25s" in t["reason"] for t in trace)
    assert got["secondary"]["active-transform"] == SINK                 # pressed rule outranked by hover: still read
    for key in ("shadow", "active-transform", "active-shadow", "hover-transition"):
        assert key not in got["outline"]                                # the flat button: no shadow, press or timing


def test_live_component_versions_are_measured_from_the_component(tmp_path):
    support = REPO / "sites" / "mamas-munches-redesign" / "handoff" / "support.js"
    if not support.is_file():
        pytest.skip("no Claude Design runtime (support.js) in the repo to mount the component with")
    folder = tmp_path / "handoff"
    shutil.copytree(FIXTURES / "button-component", folder)
    shutil.copy(support, folder / "support.js")
    probes = button_components.probes(folder)
    facts = _run_measure(folder / "Page.dc.html", probes)
    trace: list = []
    got = presets.build_button_presets(facts, trace)
    assert set(got) == {"primary", "secondary", "quiet"}
    assert got["primary"]["font-size"] == "17px"                        # md, as most primary mounts are
    assert got["primary"]["background"] == "#ffcc00" and got["primary"]["hover-background"] == "#ffffff"
    assert got["primary"]["active-transform"] == SINK and got["secondary"]["active-transform"] == SINK
    assert "shadow" not in got["quiet"] and "active-transform" not in got["quiet"]
    assert not any(t["kind"] == "gap" and t["what"] == "buttonPresets.quiet" for t in trace)   # a name beyond the three is a preset, not a gap
