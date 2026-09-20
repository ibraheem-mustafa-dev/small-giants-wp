"""Tests for orchestrator/script_bindings.py: a draft script's width-only render values per device tier.

Run from plugins/sgs-blocks/scripts:
    python -m pytest tests/test_script_bindings.py -q -p no:cacheprovider

Three layers: synthetic drafts (each behaviour in isolation, including the refusals), the real Eye Care
Birmingham draft (expected per-tier values), and a cross-check against what draft-responsive-probe.js
MEASURED by rendering that draft at 375 / 768 / 1440 (skipped when the generated probe.json is absent).
"""
from __future__ import annotations

import copy
import json
import pathlib
import shutil
import sys

import pytest

_SCRIPTS = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_SCRIPTS / "orchestrator"))

import script_bindings as sb  # noqa: E402

REPO = _SCRIPTS.parents[2]
EYE_CARE = REPO / "sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html"
PROBE = REPO / "pipeline-state/_manifest/probe.json"

needs_node = pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")


def draft(template: str, body: str, flags: str = "const mob = effW < 600, narrow = effW < 900, wide = effW >= 1200;") -> str:
    """A minimal draft: a template with style bindings and a script whose render function returns ``body``."""
    return (
        "<html><body>%s"
        '<script type="text/x-dc">\n'
        "class C { renderVals(){\n"
        "  const S = this.state;\n"
        "  const effW = S.w;\n"
        "  %s\n"
        "  return { %s };\n"
        "} }\n"
        "</script></body></html>"
    ) % (template, flags, body)


# ---- synthetic drafts --------------------------------------------------------------------------------

@needs_node
def test_thresholds_come_from_the_script_not_from_the_code() -> None:
    """mob is effW < 800 here, so the tablet sample (768) is mobile. A hardcoded 760 would say otherwise."""
    html = draft('<div style="padding: {{ pad }}"></div>', "pad: mob ? '10px' : narrow ? '20px' : '30px'",
                 "const mob = effW < 800, narrow = effW < 1100, wide = effW >= 1300;")
    r = sb.resolve_tier_bindings(html)
    assert r["flags"] == {"mob": "effW < 800", "narrow": "effW < 1100", "wide": "effW >= 1300"}
    e = r["resolved"]["pad"]
    assert (e["mobile"], e["tablet"], e["desktop"]) == ("10px", "10px", "30px")
    assert e["uniform"] is False


@needs_node
def test_nested_ternary_and_three_way_split() -> None:
    body = "cols: mob ? 'repeat(2,1fr)' : narrow ? 'repeat(3,1fr)' : wide ? 'repeat(4,1fr)' : 'repeat(5,1fr)'"
    r = sb.resolve_tier_bindings(draft('<div style="grid-template-columns: {{ cols }}"></div>', body))
    e = r["resolved"]["cols"]
    assert (e["mobile"], e["tablet"], e["desktop"]) == ("repeat(2,1fr)", "repeat(3,1fr)", "repeat(4,1fr)")
    # The 4th state (900-1199) has no tier of its own: the sweep must say so rather than hide it.
    assert [run["value"] for run in e["intra_tier"]["desktop"]] == ["repeat(5,1fr)", "repeat(4,1fr)"]


@needs_node
def test_a_breakpoint_inside_a_device_tier_is_reported() -> None:
    """mob is effW < 760 but the SGS mobile tier runs to 767: 760-767 is a sliver the tiers cannot express."""
    r = sb.resolve_tier_bindings(draft('<p style="font-size: {{ fs }}"></p>', "fs: mob ? '15px' : '18px'",
                                       "const mob = effW < 760, narrow = effW < 1024, wide = effW >= 1280;"))
    runs = r["resolved"]["fs"]["intra_tier"]["mobile"]
    assert [(x["from"], x["to"], x["value"]) for x in runs] == [(320, 759, "15px"), (760, 767, "18px")]


@needs_node
def test_all_tiers_equal_reports_uniform_and_a_plain_value() -> None:
    body = "ink: '#141414', same: mob ? '8px' : '8px', frame: false ? 1 : 2"
    r = sb.resolve_tier_bindings(draft('<b style="color: {{ ink }}; gap: {{ same }}; order: {{ frame }}"></b>', body))
    for name, plain in (("ink", "#141414"), ("same", "8px"), ("frame", 2)):
        e = r["resolved"][name]
        assert e["uniform"] is True
        assert sb.attribute_value(e) == plain
    varying = sb.resolve_tier_bindings(draft('<b style="gap: {{ g }}"></b>', "g: mob ? '8px' : '16px'"))
    assert sb.attribute_value(varying["resolved"]["g"]) == {"desktop": "16px", "tablet": "16px", "mobile": "8px"}


@needs_node
def test_state_props_data_and_this_are_unresolved_never_guessed() -> None:
    body = ("open: S.open ? 'a' : 'b', accent: P.accent, row: C.ROWS.length + 'px', me: this.thing, "
            "late: mob ? 'a' : narrow ? 'b' : wide ? 'c' : S.x, ok: mob ? '1px' : '2px'")
    tpl = '<i style="a: {{ open }}; b: {{ accent }}; c: {{ row }}; d: {{ me }}; e: {{ late }}; f: {{ ok }}"></i>'
    r = sb.resolve_tier_bindings(draft(tpl, body))
    reasons = {u["name"]: u["reason"] for u in r["unresolved"]}
    assert set(reasons) == {"open", "accent", "row", "me", "late"}
    assert "state S.open" in reasons["open"]
    assert "`P`" in reasons["accent"]
    assert "`C`" in reasons["row"]
    assert "`this`" in reasons["me"]
    assert "state S.x" in reasons["late"]            # only reached between 900 and 1199: the sweep finds it
    assert "ok" in r["resolved"]


@needs_node
def test_flag_line_missing_resolves_nothing_and_says_why() -> None:
    html = draft('<div style="padding: {{ pad }}"></div>', "pad: mob ? '1px' : '2px'", flags="const unrelated = 1;")
    r = sb.resolve_tier_bindings(html)
    assert r["resolved"] == {}
    assert r["problems"] and "width flag" in r["problems"][0]
    assert [u["name"] for u in r["unresolved"]] == ["pad"]


def test_a_draft_with_no_style_binding_is_inert_and_reports_no_problem() -> None:
    """A static or BEM draft (Mama's Munches): nothing referenced, nothing resolved, nothing to complain about."""
    r = sb.resolve_tier_bindings('<section class="sgs-hero" style="padding:20px"><h1>Hi</h1></section>')
    assert r == {"tier_widths": sb.TIER_WIDTHS, "flags": None, "resolved": {}, "unresolved": [], "problems": []}


@needs_node
def test_no_script_at_all_resolves_nothing() -> None:
    r = sb.resolve_tier_bindings('<div style="padding: {{ pad }}"></div>')
    assert r["resolved"] == {} and r["problems"]


@needs_node
def test_only_style_values_are_bindings_and_embedded_ones_are_marked() -> None:
    tpl = ('<a href="{{ go }}" onClick="{{ go }}" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,{{ card }}),1fr));'
           'gap: {{ gap }};background: {{ s.tile }}"></a>')
    r = sb.resolve_tier_bindings(draft(tpl, "go: 1, card: mob ? '150px' : '250px', gap: '4px'"))
    assert set(r["resolved"]) == {"card", "gap"}                 # href / onClick are not style values
    assert r["resolved"]["card"]["uses"][0]["embedded"] is True
    assert r["resolved"]["gap"]["uses"][0]["embedded"] is False
    assert [u["name"] for u in r["unresolved"]] == ["s.tile"]    # a loop item's field, not a render value


@needs_node
def test_comments_and_shorthand_and_strings_with_brackets_do_not_break_the_scan() -> None:
    body = ("// a comment with an unbalanced ( bracket\n"
            "  weird: mob ? 'a,b;c)' : \"d}e\", // trailing ( comment\n"
            "  /* block , comment */ mob,\n"
            "  shape() { return 1; },\n"
            "  after: '9px'")
    r = sb.resolve_tier_bindings(draft('<i style="content: {{ weird }}; order: {{ mob }}; gap: {{ after }}"></i>', body))
    assert r["resolved"]["weird"]["mobile"] == "a,b;c)"
    assert r["resolved"]["weird"]["desktop"] == "d}e"
    assert r["resolved"]["mob"]["mobile"] is True and r["resolved"]["mob"]["desktop"] is False
    assert r["resolved"]["after"]["uniform"] is True


@needs_node
@pytest.mark.parametrize("expr", [
    "this.constructor.constructor('return process')()",
    "(function(){ while(true){} })()",
    "(() => { for(;;){} })()",
    "`${1}`",
    "globalThis.process",
    "(f => f(f))(f => f(f))",
    "'x'.repeat(2 ** 40)",
])
def test_hostile_expressions_are_refused_or_contained_and_never_resolve(expr: str) -> None:
    r = sb.resolve_tier_bindings(draft('<i style="gap: {{ bad }}"></i>', "bad: %s" % expr))
    assert "bad" not in r["resolved"]
    assert [u["name"] for u in r["unresolved"]] == ["bad"]


def test_css_length_helpers() -> None:
    assert sb.css_to_px("clamp(42px, 4.4vw, 72px)", 1440) == pytest.approx(63.36)
    assert sb.css_to_px("clamp(42px, 4.4vw, 72px)", 768) == 42
    assert sb.css_to_px("min(84vh, 820px)", 1440) is None            # vh is unknown here: refuse, do not guess
    assert sb.count_tracks("minmax(0,1.1fr) minmax(0,1fr)") == 2
    assert sb.count_tracks("repeat(4,minmax(0,1fr))") == 4
    assert sb.count_tracks("repeat(auto-fill,minmax(150px,1fr))") is None


# ---- the real draft ----------------------------------------------------------------------------------

@pytest.fixture(scope="module")
def eye_care() -> tuple[str, dict]:
    html = EYE_CARE.read_text(encoding="utf-8")
    return html, sb.resolve_tier_bindings(html)


@needs_node
def test_real_draft_flags_are_read_from_its_script(eye_care: tuple[str, dict]) -> None:
    assert eye_care[1]["flags"] == {"mob": "effW < 760", "narrow": "effW < 1024", "wide": "effW >= 1280"}


@needs_node
@pytest.mark.parametrize("name, mobile, tablet, desktop", [
    ("secPad", "56px 20px", "104px 52px", "104px 52px"),
    ("panelPad", "36px 24px", "68px 60px", "68px 60px"),
    ("twoColWide", "minmax(0,1fr)", "minmax(0,1fr)", "minmax(0,1.1fr) minmax(0,1fr)"),
    ("fourCols", "minmax(0,1fr)", "repeat(2,minmax(0,1fr))", "repeat(4,minmax(0,1fr))"),
    ("gridGap", "10px", "18px", "18px"),
    ("heroTitle", "40px", "clamp(42px, 4.4vw, 72px)", "clamp(42px, 4.4vw, 72px)"),
    ("prodCols", "repeat(2,minmax(0,1fr))", "repeat(2,minmax(0,1fr))", "repeat(4,minmax(0,1fr))"),
    ("shapeCols", "repeat(2,minmax(0,1fr))", "repeat(3,minmax(0,1fr))", "repeat(6,minmax(0,1fr))"),
    ("opticianGap", "32px", "32px", "64px"),
])
def test_real_draft_expected_per_tier_values(eye_care: tuple[str, dict], name: str, mobile: str, tablet: str, desktop: str) -> None:
    e = eye_care[1]["resolved"][name]
    assert (e["mobile"], e["tablet"], e["desktop"]) == (mobile, tablet, desktop)


@needs_node
def test_real_draft_state_driven_values_stay_unresolved(eye_care: tuple[str, dict]) -> None:
    reasons = {u["name"]: u["reason"] for u in eye_care[1]["unresolved"]}
    for name in ("railStyle", "navPad", "delBg", "ulSun"):        # read S.filtersOpen / S.scrolled / S.co / S.mega
        assert "reads state S." in reasons[name], name
    assert "acc" in reasons and "acc" not in eye_care[1]["resolved"]   # reads the accent props
    assert "cardMin" in eye_care[1]["resolved"]                       # embedded inside min(100%, {{ cardMin }})


@needs_node
def test_real_draft_draft_breakpoints_that_no_device_tier_can_hold_are_reported(eye_care: tuple[str, dict]) -> None:
    resolved = eye_care[1]["resolved"]
    assert [r["from"] for r in resolved["prodCols"]["intra_tier"]["desktop"]] == [1024, 1280]    # 3 columns, then 4
    assert [r["from"] for r in resolved["secPad"]["intra_tier"]["mobile"]] == [320, 760]         # 760-767 is not mobile in the draft


# ---- ground truth: what the probe measured by rendering the real draft -------------------------------

# Copied from pipeline-state/_manifest/probe.json (gitignored, generated) so the expectation survives its absence.
MEASURED = {
    ("section", "why buy from me", "padding-top"): (56, 104, 104),
    ("section", "why buy from me", "padding-left"): (20, 52, 52),
    ("h1", "the same designer shades", "font-size"): (40, 42, 63),
    ("div", "photo of the clinic", "gap"): (32, 32, 64),
}


@needs_node
def test_evaluator_agrees_with_the_values_measured_on_the_rendered_draft(eye_care: tuple[str, dict]) -> None:
    resolved = eye_care[1]["resolved"]
    sec = [sb.css_to_px(t, 375) for t in resolved["secPad"]["mobile"].split()]
    assert (sec[0], sec[1]) == (MEASURED[("section", "why buy from me", "padding-top")][0], MEASURED[("section", "why buy from me", "padding-left")][0])
    desktop = [sb.css_to_px(t, 1440) for t in resolved["secPad"]["desktop"].split()]
    assert (desktop[0], desktop[1]) == (104, 52)
    hero = [round(sb.css_to_px(resolved["heroTitle"][t], sb.TIER_WIDTHS[t]) or 0) for t in sb.TIER_ORDER]
    assert tuple(hero) == MEASURED[("h1", "the same designer shades", "font-size")]
    gaps = tuple(int(sb.css_to_px(resolved["opticianGap"][t], 0) or 0) for t in sb.TIER_ORDER)
    assert gaps == MEASURED[("div", "photo of the clinic", "gap")]


@pytest.fixture(scope="module")
def probe() -> dict:
    if not PROBE.exists():
        pytest.skip("pipeline-state/_manifest/probe.json is generated and gitignored; run draft-responsive-probe.js to create it")
    return json.loads(PROBE.read_text(encoding="utf-8"))


@needs_node
def test_crosscheck_against_the_live_probe_has_no_mismatch_and_real_matches(eye_care: tuple[str, dict], probe: dict) -> None:
    rows = sb.crosscheck_probe(eye_care[0], probe, eye_care[1])
    assert [r for r in rows if r["status"] == "MISMATCH"] == []
    matched = {(r["binding"], r["property"]) for r in rows if r["status"] == "match"}
    for want in (("secPad", "padding"), ("panelPad", "padding"), ("twoColWide", "grid-template-columns"),
                 ("heroTitle", "font-size"), ("opticianGap", "gap"), ("heroPad", "padding"), ("h2", "font-size")):
        assert want in matched, want
    # The exact element the brief names: padding-top 104px at 768 and 1440, 56px at 375.
    why_buy = next(r for r in rows if r["binding"] == "secPad" and r["status"] == "match" and "why buy from me" in (r["probe_key"] or ""))
    top = {c["tier"]: (c["evaluator"], c["probe"]) for c in why_buy["comparisons"] if c["probe_property"] == "padding-top"}
    assert top == {"mobile": (56.0, 56.0), "tablet": (104.0, 104.0), "desktop": (104.0, 104.0)}


@needs_node
def test_crosscheck_negative_control_a_wrong_value_is_reported_as_mismatch(eye_care: tuple[str, dict], probe: dict) -> None:
    """The check can fail: corrupt one evaluated value and the same probe must flag it."""
    broken = copy.deepcopy(eye_care[1])
    broken["resolved"]["secPad"]["desktop"] = "99px 52px"
    rows = sb.crosscheck_probe(eye_care[0], probe, broken)
    assert any(r["status"] == "MISMATCH" and r["binding"] == "secPad" for r in rows)
