"""FR-33-1 motion tokens: every easing a draft's tokens/*.css declares reaches settings.custom.easing, the
client's own spring takes the spring slot, and the hover movement timing found in the draft's transitions is written to
settings.custom.hover (a token reference where a token holds the value, the exact value otherwise).
The fixtures are the declarations of the real Indus and Mama's token files.

Run:  cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests/test_motion_tokens.py -q
"""
from __future__ import annotations

import pathlib
import sys

PKG = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PKG))

import motion_tokens  # noqa: E402
import token_files  # noqa: E402
from extract import merge_onto  # noqa: E402

BASELINE_EASING = {
    "default": "cubic-bezier(0.25, 0.1, 0.25, 1)", "ease-out": "ease-out", "emphasised": "cubic-bezier(0.2, 0.7, 0.2, 1)",
    "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)", "linear": "linear",
}
INDUS = (":root{--ease-out:cubic-bezier(.16,.84,.32,1);--ease-button:cubic-bezier(.2,.8,.2,1);"
         "--ease-spring:cubic-bezier(.34,1.56,.64,1);--ease-in-out:cubic-bezier(.65,0,.35,1);}")
MAMAS = (":root{--mm-ease-spring: cubic-bezier(.3,1.6,.5,1); --mm-ease-spring-soft: cubic-bezier(.3,1.4,.5,1);\n"
         "--mm-ease-drawer: cubic-bezier(.2,.8,.2,1); --mm-ease-reveal: cubic-bezier(.2,.7,.2,1);}")


def _tokens(tmp_path: pathlib.Path, css: str) -> dict:
    (tmp_path / "tokens").mkdir()
    (tmp_path / "tokens" / "spacing.css").write_text(css, encoding="utf-8")
    return token_files.read_token_files(tmp_path)


def _snap() -> dict:
    return {"settings": {"custom": {"easing": dict(BASELINE_EASING)}}}


def test_every_indus_easing_reaches_the_snapshot_by_value(tmp_path):
    snap = motion_tokens.apply_easings(_snap(), _tokens(tmp_path, INDUS), "", [])
    easing = snap["settings"]["custom"]["easing"]
    assert easing["button"] == "cubic-bezier(0.2, 0.8, 0.2, 1)"
    assert easing["in-out"] == "cubic-bezier(0.65, 0, 0.35, 1)"
    assert easing["spring"] == "cubic-bezier(0.34, 1.56, 0.64, 1)"
    assert easing["ease-out"] == "ease-out"
    assert easing["emphasised"] == "cubic-bezier(0.2, 0.7, 0.2, 1)"


def test_a_clients_own_spring_takes_the_spring_slot_and_the_rest_are_named_curves(tmp_path):
    html = "transition:transform .2s var(--mm-ease-spring);transition:transform .4s var(--mm-ease-spring-soft)"
    snap = motion_tokens.apply_easings(_snap(), _tokens(tmp_path, MAMAS), html, [])
    easing = snap["settings"]["custom"]["easing"]
    assert easing["spring"] == "cubic-bezier(0.3, 1.6, 0.5, 1)"
    assert easing["spring-soft"] == "cubic-bezier(0.3, 1.4, 0.5, 1)"
    assert easing["drawer"] == "cubic-bezier(0.2, 0.8, 0.2, 1)"
    assert easing["emphasised"] == "cubic-bezier(0.2, 0.7, 0.2, 1)"
    assert "reveal" not in easing


def test_the_spring_is_the_overshooting_curve_used_most_whatever_it_is_called(tmp_path):
    css = ":root{--a: cubic-bezier(.3,1.4,.5,1); --b: cubic-bezier(.3,1.6,.5,1);}"
    html = "transition:transform .2s cubic-bezier(.3,1.6,.5,1);transition:transform .2s cubic-bezier(.3, 1.6, .5, 1)"
    snap = motion_tokens.apply_easings(_snap(), _tokens(tmp_path, css), html, [])
    assert snap["settings"]["custom"]["easing"]["spring"] == "cubic-bezier(0.3, 1.6, 0.5, 1)"


def test_a_value_that_is_not_a_curve_is_not_an_easing(tmp_path):
    css = ":root{--ease-label: 12px; --ease-note: #fff;}"
    snap = motion_tokens.apply_easings(_snap(), _tokens(tmp_path, css), "", [])
    assert snap["settings"]["custom"]["easing"] == BASELINE_EASING


def test_a_clashing_name_with_another_curve_is_kept_apart(tmp_path):
    css = ":root{--ease-default: cubic-bezier(.1,.2,.3,.4);}"
    snap = motion_tokens.apply_easings(_snap(), _tokens(tmp_path, css), "", [])
    easing = snap["settings"]["custom"]["easing"]
    assert easing["default"] == BASELINE_EASING["default"]
    assert easing["draft-default"] == "cubic-bezier(0.1, 0.2, 0.3, 0.4)"


def test_the_curves_survive_a_merge_onto_a_snapshot_with_its_own_easing_object(tmp_path):
    existing = {"settings": {"custom": {"easing": {**BASELINE_EASING, "hand-made": "linear"}}}}
    merged = merge_onto({"settings": {"custom": {"easing": dict(BASELINE_EASING)}}}, existing, [])
    snap = motion_tokens.apply_easings(merged, _tokens(tmp_path, INDUS), "", [])
    easing = snap["settings"]["custom"]["easing"]
    assert easing["button"] and easing["hand-made"] == "linear"


def test_movement_timing_is_the_most_used_transform_transition(tmp_path):
    tokens = _tokens(tmp_path, INDUS)
    html = ("transition:transform .35s var(--ease-spring),box-shadow .25s;transition:transform .35s var(--ease-spring);"
            "transition:transform .25s cubic-bezier(.2,.8,.2,1);transition:color .2s;transition:all .2s;"
            "transition:background .2s,border-color .2s")
    trace: list = []
    proposal = motion_tokens.propose_movement_timing(html, tokens, trace)
    assert (proposal["duration_ms"], proposal["easing"]) == (350, "cubic-bezier(0.34, 1.56, 0.64, 1)")
    assert proposal["uses"] == 2 and proposal["of"] == 3
    assert any(r.get("what") == "hover-movement-timing" and r["kind"] == "proposal" for r in trace)


def test_a_movement_transition_with_no_easing_is_ease():
    proposal = motion_tokens.movement_timing("transition:transform .25s,background .25s;transition:transform .25s", None)
    assert (proposal["duration_ms"], proposal["easing"], proposal["uses"]) == (250, "ease", 2)


def test_a_draft_with_no_movement_transition_proposes_nothing():
    assert motion_tokens.movement_timing("transition:color .2s;transition:all .3s", None) is None


THEME = {"settings": {"custom": {"duration": {"quick": "150ms", "fast": "250ms", "medium": "300ms"},
                                 "easing": {"default": "cubic-bezier(0.4, 0, 0.2, 1)", "ease": "ease",
                                            "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)"},
                                 "hover": {"duration": "var(--wp--custom--duration--fast)",
                                           "easing": "var(--wp--custom--easing--emphasised)"}}}}


def _hover(snap: dict) -> dict:
    return snap["settings"]["custom"]["hover"]


def test_the_movement_timing_is_written_as_an_exact_duration_and_the_spring_token(tmp_path):
    html = "transition:transform .35s var(--ease-spring);transition:transform .35s var(--ease-spring)"
    tokens = _tokens(tmp_path, INDUS)
    snap = motion_tokens.apply_easings(_snap(), tokens, html, [])
    trace: list = []
    proposal = motion_tokens.propose_movement_timing(html, tokens, trace)
    motion_tokens.apply_movement_timing(snap, proposal, THEME, trace)
    assert _hover(snap) == {"duration": "350ms", "easing": "var(--wp--custom--easing--spring)"}
    assert [r["what"] for r in trace if r["kind"] == "motion"] == ["settings.custom.hover.duration",
                                                                  "settings.custom.hover.easing"]


def test_a_clients_own_spring_is_referenced_through_its_slot(tmp_path):
    html = "transition:transform .2s var(--mm-ease-spring)"
    tokens = _tokens(tmp_path, MAMAS)
    snap = motion_tokens.apply_easings(_snap(), tokens, html, [])
    motion_tokens.apply_movement_timing(snap, motion_tokens.movement_timing(html, tokens), THEME, [])
    assert snap["settings"]["custom"]["easing"]["spring"] == "cubic-bezier(0.3, 1.6, 0.5, 1)"
    assert _hover(snap) == {"duration": "200ms", "easing": "var(--wp--custom--easing--spring)"}


def test_a_duration_and_keyword_the_theme_holds_are_references():
    snap: dict = {"settings": {"custom": {}}}
    proposal = motion_tokens.movement_timing("transition:transform .25s;transition:transform 250ms ease", None)
    motion_tokens.apply_movement_timing(snap, proposal, THEME, [])
    assert _hover(snap) == {"duration": "var(--wp--custom--duration--fast)", "easing": "var(--wp--custom--easing--ease)"}


def test_the_snapshots_own_duration_scale_wins_over_the_themes():
    snap = {"settings": {"custom": {"duration": {"fast": "200ms"}}}}
    proposal = motion_tokens.movement_timing("transition:transform .25s ease", None)
    motion_tokens.apply_movement_timing(snap, proposal, THEME, [])
    assert _hover(snap)["duration"] == "250ms"


def test_a_curve_no_token_holds_is_written_exactly():
    snap: dict = {}
    proposal = motion_tokens.movement_timing("transition:transform .3s cubic-bezier(.1,.9,.3,1)", None)
    motion_tokens.apply_movement_timing(snap, proposal, THEME, [])
    assert _hover(snap) == {"duration": "var(--wp--custom--duration--medium)", "easing": "cubic-bezier(0.1, 0.9, 0.3, 1)"}


def test_negative_control_a_draft_with_no_movement_transition_leaves_the_hover_timing_alone():
    snap = {"settings": {"custom": {"hover": {"duration": "400ms", "easing": "linear"}}}}
    trace: list = []
    proposal = motion_tokens.propose_movement_timing("transition:color .2s;transition:all .3s", None, trace)
    motion_tokens.apply_movement_timing(snap, proposal, THEME, trace)
    assert _hover(snap) == {"duration": "400ms", "easing": "linear"} and trace == []
