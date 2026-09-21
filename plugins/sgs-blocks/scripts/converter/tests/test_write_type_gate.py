"""test_write_type_gate.py -- a Write whose value is the wrong JSON kind for its attr never reaches the block.

Two independent fixes for one defect (the Eye Care ticker emitted ``"bgKenBurns":"none"``: a raw CSS
animation string written to a BOOLEAN toggle, which PHP reads as true):

  SOURCE  a boolean feature flag must not own a raw CSS property unless a value parser turns the draft
          declaration into on/off (attr-classification-overrides.json; bgKenBurns had no parser).
  GUARD   ``validate.write_type_violation`` + ``dispatch_spine._reject_ill_typed_writes`` reject any Write
          whose value kind does not fit the attr's declared type, as a tracked GAP, not a crash.

Each has its own test and its own negative control, so neither can hide behind the other: the GUARD tests
plant a resolver that returns a bad Write (the source fix cannot help them), the SOURCE tests run through the
real dispatch with the guard's hook unreachable for them (the value never becomes a Write at all).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_write_type_gate.py -q -p no:cacheprovider
"""
from __future__ import annotations

import sqlite3

import pytest

from converter import dispatch_spine
from converter.context import Ctx, Decl
from converter.db import db_lookup
from converter.entry import convert_section
from converter.models import GAP, GapOrigin, Write
from converter.resolvers import REGISTRY
from converter.services import content_gap_collector as gap_collector
from converter.services.state_value_lift import _STATE_VALUE_PARSERS
from converter.services.validate import write_type_violation

SLUG = "sgs/trust-bar"


@pytest.fixture(autouse=True)
def _clean_gaps():
    gap_collector.clear()
    yield
    gap_collector.clear()


@pytest.fixture()
def ctx():
    conn = db_lookup.get_connection()
    try:
        yield Ctx(block_slug=SLUG, container_kind="section", delegates_content=0, variant_value=None,
                  variant_attr=None, node=None, is_root=True, base_layer="OUTER", conn=conn)
    finally:
        conn.close()


# ---- GUARD: write_type_violation ---------------------------------------------------------------------

@pytest.mark.parametrize("attr, value", [
    ("bgKenBurns", "none"),                 # string -> boolean (the incident)
    ("autoScroll", "true"),                 # string -> boolean
    ("autoScrollDuration", "30s"),          # px/unit string -> number (the CG-4 shape)
    ("padding", "11px 0"),                  # string -> object
    ("items", "not a list"),                # string -> array
    ("autoScrollSpeed", 5),                 # number -> string
    ("autoScroll", 1),                      # number -> boolean
])
def test_a_wrong_kind_value_is_a_violation_with_the_declared_type_in_the_reason(ctx, attr, value):
    reason = write_type_violation(ctx, attr, value)
    assert reason is not None and repr(attr) in reason and "declares" in reason


@pytest.mark.parametrize("attr, value", [
    ("bgKenBurns", True), ("autoScroll", False), ("autoScrollDuration", 30), ("autoScrollDuration", 2.5),
    ("padding", {"desktop": {"top": "1px"}}), ("items", [{"label": "x"}]), ("autoScrollSpeed", "fast"),
    ("gap", {"desktop": "6px"}),
])
def test_a_right_kind_value_passes(ctx, attr, value):
    assert write_type_violation(ctx, attr, value) is None


def test_an_undeclared_attr_and_a_none_value_are_left_to_validate(ctx):
    assert write_type_violation(ctx, "noSuchAttr", "x") is None
    assert write_type_violation(ctx, "bgKenBurns", None) is None


def test_bool_is_not_accepted_where_a_number_is_declared(ctx):
    assert write_type_violation(ctx, "autoScrollDuration", True) is not None   # isinstance(True, int)


def _writes(res):
    """The element's Writes minus the synthetic align:"full" the finalise pass adds on max-width absence."""
    return [w for w in res.writes if w.property != "__align_finalise__"]


def _decl(prop="animation", value="x 1s infinite", tier="Base"):
    return Decl(property=prop, value=value, tier=tier)


def test_the_dispatch_turns_an_ill_typed_write_into_a_gap_and_records_it(ctx, monkeypatch):
    monkeypatch.setitem(REGISTRY, "outer_box", lambda d, c: Write(attr="bgKenBurns", value="none", property=d.property, tier=d.tier))
    monkeypatch.setattr(dispatch_spine, "resolver_id", lambda *a, **k: "outer_box")
    res = dispatch_spine.process_element(ctx, [_decl()])
    assert _writes(res) == [] and len(res.gaps) == 1 and res.gaps[0].origin is GapOrigin.NO_DESTINATION
    assert "type gate" in res.gaps[0].detail and "'bgKenBurns'" in res.gaps[0].detail
    rows = [g for g in gap_collector.flush() if g["where"] == "write_type_gate"]
    assert len(rows) == 1 and rows[0]["block_slug"] == SLUG


def test_a_list_keeps_its_well_typed_writes_and_drops_only_the_bad_one(ctx, monkeypatch):
    good = Write(attr="autoScrollDuration", value=30, property="animation", tier="Base")
    bad = Write(attr="autoScroll", value="yes", property="animation", tier="Base")
    monkeypatch.setitem(REGISTRY, "outer_box", lambda d, c: [good, bad])
    monkeypatch.setattr(dispatch_spine, "resolver_id", lambda *a, **k: "outer_box")
    res = dispatch_spine.process_element(ctx, [_decl()])
    assert _writes(res) == [good] and res.gaps == []          # the declaration still counts as routed (TOTALITY)
    rows = [g for g in gap_collector.flush() if g["where"] == "write_type_gate"]
    assert len(rows) == 1 and "'autoScroll'" in rows[0]["detail"]   # ...and the dropped write is reported, not silent


def _type_gate_rows():
    return [g for g in gap_collector.flush() if g["where"] == "write_type_gate"]


def test_every_ill_typed_write_in_a_list_is_reported_not_only_the_first(ctx):
    bad = [Write(attr="autoScroll", value="yes", property="animation", tier="Base"),
           Write(attr="autoScrollDuration", value="fast", property="animation", tier="Base"),
           Write(attr="autoScrollBelow", value="soon", property="animation", tier="Base")]
    out = dispatch_spine._reject_ill_typed_writes(ctx, _decl(), list(bad))
    assert isinstance(out, GAP), "no well-typed write survives, so the declaration yields one GAP (TOTALITY)"
    rows = _type_gate_rows()
    assert len(rows) == 3
    for attr in ("'autoScroll'", "'autoScrollDuration'", "'autoScrollBelow'"):
        assert sum(attr in r["detail"] for r in rows) == 1


def test_two_bad_writes_beside_a_good_one_keep_the_good_one_and_report_both(ctx):
    good = Write(attr="autoScrollDuration", value=30, property="animation", tier="Base")
    bad_a = Write(attr="autoScroll", value="yes", property="animation", tier="Base")
    bad_b = Write(attr="autoScrollBelow", value="soon", property="animation", tier="Base")
    out = dispatch_spine._reject_ill_typed_writes(ctx, _decl(), [bad_a, good, bad_b])
    assert out == [good] and len(_type_gate_rows()) == 2


def test_a_repeated_identical_bad_write_is_one_row_not_spam(ctx):
    twice = [Write(attr="autoScroll", value="yes", property="animation", tier="Base") for _ in range(3)]
    dispatch_spine._reject_ill_typed_writes(ctx, _decl(), twice)
    assert len(_type_gate_rows()) == 1
    # the same attr with a DIFFERENT bad value is a different non-transfer and is reported separately
    gap_collector.clear()
    dispatch_spine._reject_ill_typed_writes(ctx, _decl(), [
        Write(attr="autoScroll", value="yes", property="animation", tier="Base"),
        Write(attr="autoScroll", value="no", property="animation", tier="Base"),
    ])
    assert len(_type_gate_rows()) == 2


def test_a_list_of_only_bad_writes_becomes_one_gap_not_a_leak(ctx, monkeypatch):
    monkeypatch.setitem(REGISTRY, "outer_box", lambda d, c: [Write(attr="autoScroll", value="a", property="animation", tier="Base")])
    monkeypatch.setattr(dispatch_spine, "resolver_id", lambda *a, **k: "outer_box")
    res = dispatch_spine.process_element(ctx, [_decl()])
    assert _writes(res) == [] and len(res.gaps) == 1 and res.decl_results == 1


def test_NEGATIVE_CONTROL_with_the_guard_removed_the_bad_write_reaches_the_block(ctx, monkeypatch):
    """Break just the guard: the same planted resolver now emits ``bgKenBurns:"none"`` again."""
    monkeypatch.setattr(dispatch_spine, "write_type_violation", lambda *a, **k: None)
    monkeypatch.setitem(REGISTRY, "outer_box", lambda d, c: Write(attr="bgKenBurns", value="none", property=d.property, tier=d.tier))
    monkeypatch.setattr(dispatch_spine, "resolver_id", lambda *a, **k: "outer_box")
    res = dispatch_spine.process_element(ctx, [_decl()])
    assert [(w.attr, w.value) for w in _writes(res)] == [("bgKenBurns", "none")]


def test_a_gap_a_none_and_a_real_write_pass_through_the_hook_untouched(ctx):
    gap = GAP(origin=GapOrigin.NO_DESTINATION, property="x", tier="Base", detail="d", f4_ref=None)
    assert dispatch_spine._reject_ill_typed_writes(ctx, _decl(), gap) is gap
    assert dispatch_spine._reject_ill_typed_writes(ctx, _decl(), None) is None
    ok = Write(attr="bgKenBurns", value=True, property="animation", tier="Base")
    assert dispatch_spine._reject_ill_typed_writes(ctx, _decl(), ok) is ok


def test_a_scalar_written_to_a_tier_object_attr_is_stopped_before_the_destination_fold(monkeypatch):
    """The destination fold's own shape-mismatch guard is downstream of the type gate now: a scalar for an
    object attr becomes a gap at dispatch instead of raising DESTINATION SHAPE MISMATCH later."""
    conn = db_lookup.get_connection()
    try:
        c = Ctx(block_slug="sgs/container", container_kind="section", delegates_content=1, variant_value=None,
                variant_attr=None, node=None, is_root=True, base_layer=None, conn=conn)
        monkeypatch.setitem(REGISTRY, "outer_box", lambda d, x: Write("padding", "20px", d.property, d.tier))
        monkeypatch.setattr(dispatch_spine, "resolver_id", lambda *a, **k: "outer_box")
        res = dispatch_spine.process_element(c, [_decl("padding", "20px")])
    finally:
        conn.close()
    assert _writes(res) == [] and len(res.gaps) == 1 and "'padding'" in res.gaps[0].detail


# ---- SOURCE: a boolean flag owns a raw CSS property only when a value parser exists -------------------

def _ungated_boolean_css_owners(conn: sqlite3.Connection) -> list[tuple[str, str, str]]:
    """Boolean css-gate attrs whose css_property has NO value parser: the raw declaration would be written
    into the boolean as-is. The parsers are state_value_lift's (transform -> scale, filter -> grayscale)."""
    rows = conn.execute(
        "SELECT block_slug, attr_name, css_property FROM block_attributes "
        "WHERE attr_type = 'boolean' AND role = 'css-gate' AND css_property IS NOT NULL AND css_property != ''"
    ).fetchall()
    return [r for r in rows if r[2] not in _STATE_VALUE_PARSERS]


def test_the_live_db_has_no_css_gate_boolean_without_a_value_parser():
    conn = sqlite3.connect(f"file:{db_lookup.SGS_DB}?mode=ro", uri=True)
    try:
        assert _ungated_boolean_css_owners(conn) == []
        owners = conn.execute(
            "SELECT block_slug FROM block_attributes WHERE attr_name = 'bgKenBurns' AND css_property IS NOT NULL"
        ).fetchall()
        assert owners == []                                      # no bgKenBurns owns the animation property
        assert conn.execute("SELECT count(*) FROM block_attributes WHERE attr_name = 'bgKenBurns'").fetchone()[0] >= 6
    finally:
        conn.close()


def test_NEGATIVE_CONTROL_the_detector_fires_on_the_pre_fix_shape():
    """The pre-fix rows (role css-gate, css_property animation) planted in a throwaway DB are caught."""
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT)")
    conn.executemany("INSERT INTO block_attributes VALUES (?,?,?,?,?)", [
        ("sgs/x", "bgKenBurns", "boolean", "css-gate", "animation"),      # the defect
        ("sgs/y", "imageZoomHover", "boolean", "css-gate", "transform"),  # legitimate: has a parser
    ])
    assert _ungated_boolean_css_owners(conn) == [("sgs/x", "bgKenBurns", "animation")]


def test_a_generic_animation_on_a_composite_never_reaches_bgKenBurns_end_to_end():
    """End to end through the real converter. Both fixes make this pass (the source no longer routes the
    property, the guard would stop the write): it is the outcome check; the tests above discriminate."""
    html = '<section class="sgs-trust-bar"><div class="sgs-trust-bar__track"><span class="sgs-trust-bar__item"><span class="sgs-trust-bar__label">A</span></span><span class="sgs-trust-bar__item"><span class="sgs-trust-bar__label">B</span></span></div></section>'
    css = "@keyframes pulse{from{opacity:.5}to{opacity:1}}.sgs-trust-bar__track{animation:pulse 2s ease infinite}"
    res = convert_section(html=html, css=css, media_map={}, boundary_id="b1", section_id="s1")
    assert "bgKenBurns" not in res["block_markup"]
