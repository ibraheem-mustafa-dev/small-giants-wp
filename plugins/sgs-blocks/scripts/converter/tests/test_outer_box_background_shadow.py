"""test_outer_box_background_shadow.py — background-* and box-shadow OUTER transfers.

GROUND-TRUTH: spec=31 §3.A source=db
  attr_for_layer_property('sgs/container', 'OUTER', 'background-size') = 'backgroundSize'
  attr_for_layer_property('sgs/container', 'OUTER', 'background-position') = 'backgroundPosition'
  attr_for_layer_property('sgs/container', 'OUTER', 'background-repeat') = 'backgroundRepeat'
  attr_for_layer_property('sgs/container', 'OUTER', 'background-attachment') = 'backgroundAttachment'
  attr_for_layer_property('sgs/container', 'OUTER', 'box-shadow') = 'shadow'
    (role=color Shadow row wins over role=visual BoxShadow row by rowid ordering)
  design_tokens shadow presets (token_type='size', slug LIKE 'shadow-%'):
    shadow-sm  default_value='0 1px 3px rgba(0,0,0,0.08)'   → slug 'sm'
    shadow-md  default_value='0 4px 12px rgba(0,0,0,0.1)'   → slug 'md'
    shadow-lg  default_value='0 8px 30px rgba(0,0,0,0.12)'  → slug 'lg'
    shadow-glow default_value='0 0 20px rgba(248,122,31,0.3)' → slug 'glow'
  backgroundSize enum_values='["cover", "contain", "auto"]'; is_responsive=0
  backgroundAttachment enum_values='["scroll", "fixed"]'; is_responsive=0
  shadow enum_values=NULL (no enum constraint); is_responsive=0
  No tier-suffixed variants (backgroundSizeMobile etc.) exist — Tablet/Mobile → honest gap.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_outer_box_background_shadow.py --import-mode=importlib
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.models import GapOrigin, Write
from converter.orchestrator import process_element
from converter.db.db_lookup import SGS_DB


def _ctx(conn: sqlite3.Connection) -> Ctx:
    return Ctx(
        block_slug="sgs/container",
        container_kind="section",
        delegates_content=1,
        variant_value=None,
        variant_attr=None,
        node=None,
        is_root=True,
        base_layer="OUTER",   # pre-set to skip layer_detect (these are known OUTER decls)
        conn=conn,
    )


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


# ---------------------------------------------------------------------------
# background-size → backgroundSize (string, enum-constrained to cover/contain/auto)
# ---------------------------------------------------------------------------

def test_background_size_cover_writes_to_backgroundSize(conn):
    """background-size:'cover' → Write(attr='backgroundSize', value='cover')."""
    result = process_element(_ctx(conn), [Decl("background-size", "cover", "Base")])
    attrs = result.attrs()
    assert attrs.get("backgroundSize") == "cover"


def test_background_size_contain_writes_to_backgroundSize(conn):
    result = process_element(_ctx(conn), [Decl("background-size", "contain", "Base")])
    assert result.attrs().get("backgroundSize") == "contain"


def test_background_size_auto_writes_to_backgroundSize(conn):
    result = process_element(_ctx(conn), [Decl("background-size", "auto", "Base")])
    assert result.attrs().get("backgroundSize") == "auto"


def test_background_size_non_enum_value_gaps_no_destination(conn):
    """'320px 320px' is not in the backgroundSize enum → honest NO_DESTINATION gap.

    This is the value that appears in the ledger's rt-background-url fixture for
    .sgs-cta-section--bg. The gap is correct — the block declares no attr for
    arbitrary length values; the operator would use 'cover' or 'contain' in the
    block editor.
    """
    result = process_element(_ctx(conn), [Decl("background-size", "320px 320px", "Base")])
    assert result.attrs().get("backgroundSize") is None
    assert any(g.origin is GapOrigin.NO_DESTINATION for g in result.gaps)


def test_background_size_tablet_tier_gaps_no_destination(conn):
    """backgroundSizeMobile/Tablet don't exist on sgs/container → honest gap.

    is_responsive=0 for backgroundSize; no tier-suffixed attr rows exist in the DB.
    validate() returns False for 'backgroundSizeTablet' → NO_DESTINATION.
    """
    result = process_element(_ctx(conn), [Decl("background-size", "cover", "Tablet")])
    assert result.attrs().get("backgroundSizeTablet") is None
    assert any(g.origin is GapOrigin.NO_DESTINATION for g in result.gaps)


def test_background_size_conservation_no_unrouted(conn):
    """background-size always produces a routed result (Write or tracked gap), never UNROUTED."""
    result = process_element(_ctx(conn), [Decl("background-size", "cover", "Base")])
    assert result.decl_results == result.decl_count
    assert result.unrouted() == []


# ---------------------------------------------------------------------------
# background-position → backgroundPosition
# ---------------------------------------------------------------------------

def test_background_position_writes_to_backgroundPosition(conn):
    """background-position:'center center' → Write(attr='backgroundPosition', value='center center').

    backgroundPosition has no enum_values constraint (NULL) — any string value passes validate.
    """
    result = process_element(_ctx(conn), [Decl("background-position", "center center", "Base")])
    assert result.attrs().get("backgroundPosition") == "center center"


def test_background_position_top_left(conn):
    result = process_element(_ctx(conn), [Decl("background-position", "top left", "Base")])
    assert result.attrs().get("backgroundPosition") == "top left"


# ---------------------------------------------------------------------------
# background-repeat → backgroundRepeat
# ---------------------------------------------------------------------------

def test_background_repeat_no_repeat_writes(conn):
    """background-repeat:'no-repeat' is in the enum → Write."""
    result = process_element(_ctx(conn), [Decl("background-repeat", "no-repeat", "Base")])
    assert result.attrs().get("backgroundRepeat") == "no-repeat"


def test_background_repeat_repeat_x_writes(conn):
    result = process_element(_ctx(conn), [Decl("background-repeat", "repeat-x", "Base")])
    assert result.attrs().get("backgroundRepeat") == "repeat-x"


def test_background_repeat_invalid_value_gaps(conn):
    """'round' is not in the backgroundRepeat enum → honest NO_DESTINATION gap."""
    result = process_element(_ctx(conn), [Decl("background-repeat", "round", "Base")])
    assert result.attrs().get("backgroundRepeat") is None
    assert any(g.origin is GapOrigin.NO_DESTINATION for g in result.gaps)


# ---------------------------------------------------------------------------
# background-attachment → backgroundAttachment
# ---------------------------------------------------------------------------

def test_background_attachment_fixed_writes(conn):
    """background-attachment:'fixed' is in the enum → Write."""
    result = process_element(_ctx(conn), [Decl("background-attachment", "fixed", "Base")])
    assert result.attrs().get("backgroundAttachment") == "fixed"


def test_background_attachment_scroll_writes(conn):
    result = process_element(_ctx(conn), [Decl("background-attachment", "scroll", "Base")])
    assert result.attrs().get("backgroundAttachment") == "scroll"


def test_background_attachment_invalid_value_gaps(conn):
    """'local' is not in the backgroundAttachment enum → honest NO_DESTINATION gap."""
    result = process_element(_ctx(conn), [Decl("background-attachment", "local", "Base")])
    assert result.attrs().get("backgroundAttachment") is None
    assert any(g.origin is GapOrigin.NO_DESTINATION for g in result.gaps)


# ---------------------------------------------------------------------------
# box-shadow → shadow (token-snapped to preset slug)
# ---------------------------------------------------------------------------

def test_box_shadow_md_preset_writes_slug_md(conn):
    """'0 4px 12px rgba(0,0,0,0.1)' matches shadow-md preset → Write(attr='shadow', value='md').

    GROUND-TRUTH: design_tokens slug='shadow-md' default_value='0 4px 12px rgba(0,0,0,0.1)'
    token_type='size'. Strip 'shadow-' prefix → slug 'md'.
    """
    result = process_element(
        _ctx(conn),
        [Decl("box-shadow", "0 4px 12px rgba(0,0,0,0.1)", "Base")],
    )
    attrs = result.attrs()
    assert attrs.get("shadow") == "md", (
        f"Expected shadow='md' for box-shadow matching shadow-md preset; got {attrs}"
    )


def test_box_shadow_sm_preset_writes_slug_sm(conn):
    """'0 1px 3px rgba(0,0,0,0.08)' matches shadow-sm preset → slug 'sm'."""
    result = process_element(
        _ctx(conn),
        [Decl("box-shadow", "0 1px 3px rgba(0,0,0,0.08)", "Base")],
    )
    assert result.attrs().get("shadow") == "sm"


def test_box_shadow_lg_preset_writes_slug_lg(conn):
    """'0 8px 30px rgba(0,0,0,0.12)' matches shadow-lg preset → slug 'lg'."""
    result = process_element(
        _ctx(conn),
        [Decl("box-shadow", "0 8px 30px rgba(0,0,0,0.12)", "Base")],
    )
    assert result.attrs().get("shadow") == "lg"


def test_box_shadow_glow_preset_writes_slug_glow(conn):
    """'0 0 20px rgba(248,122,31,0.3)' matches shadow-glow preset → slug 'glow'."""
    result = process_element(
        _ctx(conn),
        [Decl("box-shadow", "0 0 20px rgba(248,122,31,0.3)", "Base")],
    )
    assert result.attrs().get("shadow") == "glow"


def test_box_shadow_whitespace_normalised_matches_preset(conn):
    """Extra whitespace in the draft value normalises to match the preset.

    The draft may store '0  4px  12px rgba(0,0,0,0.1)' (extra spaces);
    _normalise_shadow collapses these before comparing against the DB default_value.
    """
    result = process_element(
        _ctx(conn),
        [Decl("box-shadow", "0  4px  12px  rgba(0,0,0,0.1)", "Base")],
    )
    assert result.attrs().get("shadow") == "md"


def test_box_shadow_no_preset_match_gaps_no_destination(conn):
    """A raw CSS box-shadow with no matching preset → honest NO_DESTINATION gap.

    The shadow attr expects a slug (the wrapper renders
    box-shadow:var(--wp--preset--shadow--{slug})); a raw value would render nothing.
    An honest gap is the correct outcome — never a raw-value Write.
    """
    result = process_element(
        _ctx(conn),
        [Decl("box-shadow", "0 2px 8px rgba(0,0,0,0.5)", "Base")],
    )
    # No shadow Write emitted.
    assert result.attrs().get("shadow") is None
    # Exactly one gap, origin=NO_DESTINATION, with a helpful detail message.
    shadow_gaps = [g for g in result.gaps if g.property == "box-shadow"]
    assert len(shadow_gaps) == 1
    assert shadow_gaps[0].origin is GapOrigin.NO_DESTINATION
    assert "preset" in shadow_gaps[0].detail.lower()


def test_box_shadow_no_preset_match_never_emits_raw_value(conn):
    """Guard: the shadow attr NEVER receives a raw CSS box-shadow string.

    The wrapper renders box-shadow:var(--wp--preset--shadow--{slug}) — a raw value
    would produce an invalid var() reference and render nothing. This test proves the
    no-cheats invariant: a raw value that doesn't match a preset always gaps, never writes.
    """
    raw = "inset 0 0 10px #000"
    result = process_element(_ctx(conn), [Decl("box-shadow", raw, "Base")])
    shadow_write = result.attrs().get("shadow")
    assert shadow_write is None, (
        f"outer_box must NEVER emit a raw CSS value to the shadow attr (got {shadow_write!r}); "
        f"only preset slugs ('sm'/'md'/'lg'/'glow') are valid"
    )


def test_box_shadow_conservation_no_unrouted(conn):
    """box-shadow always produces a routed result (Write or tracked gap), never UNROUTED."""
    result = process_element(
        _ctx(conn),
        [Decl("box-shadow", "0 4px 12px rgba(0,0,0,0.1)", "Base")],
    )
    assert result.decl_results == result.decl_count
    assert result.unrouted() == []


def test_box_shadow_tablet_tier_gaps_no_destination(conn):
    """shadowTablet does not exist on sgs/container → honest NO_DESTINATION gap.

    shadow is_responsive=0; no 'shadowTablet' attr row exists. Even a preset-matching
    value must gap for a non-base tier (validate fails on tier_suffix('shadow','Tablet')).
    """
    result = process_element(
        _ctx(conn),
        [Decl("box-shadow", "0 4px 12px rgba(0,0,0,0.1)", "Tablet")],
    )
    assert result.attrs().get("shadowTablet") is None
    assert any(g.origin is GapOrigin.NO_DESTINATION for g in result.gaps)


# ---------------------------------------------------------------------------
# Multi-property conservation: background-* + box-shadow together
# ---------------------------------------------------------------------------

def test_multi_background_shadow_conservation(conn):
    """Multiple background-* + box-shadow in one element: all routed, none UNROUTED."""
    decls = [
        Decl("background-size", "cover", "Base"),
        Decl("background-position", "center", "Base"),
        Decl("background-repeat", "no-repeat", "Base"),
        Decl("background-attachment", "fixed", "Base"),
        Decl("box-shadow", "0 4px 12px rgba(0,0,0,0.1)", "Base"),
    ]
    result = process_element(_ctx(conn), decls)
    assert result.decl_results == len(decls)
    assert result.unrouted() == []
    attrs = result.attrs()
    assert attrs.get("backgroundSize") == "cover"
    assert attrs.get("backgroundPosition") == "center"
    assert attrs.get("backgroundRepeat") == "no-repeat"
    assert attrs.get("backgroundAttachment") == "fixed"
    assert attrs.get("shadow") == "md"
