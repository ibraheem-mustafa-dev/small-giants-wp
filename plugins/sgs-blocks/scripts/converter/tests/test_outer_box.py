"""test_outer_box.py — the slice proof: max-width → maxWidth WRITTEN + conservation.

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_outer_box.py

Uses the REAL framework DB (sgs/container declares maxWidth) and the D234-proven
rt-centred-maxwidth values (max-width:1200px LANDED on .wp-block-sgs-container).
WRITTEN here; LANDED is the live-canary leg (Bean's deploy step).

Includes the three REAL metamorphic relations on the one built resolver (design §4 #3):
source-order permutation → identical; BEM-rename → identical (name-free routing);
px-scale by k → maxWidth scales by k.
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.models import GapOrigin, Write
from converter.orchestrator import emit_block_markup, process_element
from orchestrator.converter_v2.db_lookup import SGS_DB


def _ctx(conn: sqlite3.Connection, *, is_root: bool = True) -> Ctx:
    return Ctx(
        block_slug="sgs/container",
        container_kind="section",
        has_inner_blocks=1,
        variant_value=None,
        variant_attr=None,
        node=None,
        is_root=is_root,
        base_layer=None,
        conn=conn,
    )


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


# rt-centred-maxwidth's OUTER declarations (D234): one real transfer + box props.
def _rt_decls() -> list[Decl]:
    return [
        Decl("max-width", "1200px", "Base"),
        Decl("padding", "80px 24px", "Base"),
        Decl("background-color", "#f5f0eb", "Base"),
    ]


# ---------------------------------------------------------------------------
# WRITTEN + conservation
# ---------------------------------------------------------------------------

def test_max_width_is_written_to_maxWidth(conn):
    result = process_element(_ctx(conn), _rt_decls())
    writes = {w.attr: w.value for w in result.writes}
    assert writes.get("maxWidth") == "1200px"   # exact literal (D230, no snap)


def test_conservation_total_and_no_unrouted(conn):
    decls = _rt_decls()
    result = process_element(_ctx(conn), decls)
    # TOTALITY: every declaration in exactly one bucket.
    assert len(result.writes) + len(result.gaps) == len(decls)
    # The box props are honest stub GAPs, not silent drops.
    assert {g.origin for g in result.gaps} == {GapOrigin.UNIMPLEMENTED_STUB}
    assert result.unrouted() == []


def test_emit_produces_maxwidth_block_markup(conn):
    result = process_element(_ctx(conn), _rt_decls())
    markup = emit_block_markup("sgs/container", result.attrs())
    assert markup == '<!-- wp:sgs/container {"maxWidth":"1200px"} --><!-- /wp:sgs/container -->'


# ---------------------------------------------------------------------------
# A4 — non-device-tier breakpoint → NO_DESTINATION gap, never coerced
# ---------------------------------------------------------------------------

def test_non_device_tier_max_width_is_gapped(conn):
    decls = [Decl("max-width", "600px", "Other:(max-width: 600px)")]
    result = process_element(_ctx(conn), decls)
    assert not result.writes
    assert result.gaps[0].origin is GapOrigin.NO_DESTINATION


# ---------------------------------------------------------------------------
# Real metamorphic relations on outer_box (design §4 #3)
# ---------------------------------------------------------------------------

def test_metamorphic_source_order_permutation(conn):
    a = process_element(_ctx(conn), _rt_decls())
    b = process_element(_ctx(conn), list(reversed(_rt_decls())))
    assert a.attrs() == b.attrs()


def test_metamorphic_bem_rename_identical(conn):
    # outer_box reads no class name → routing/transfer is name-free. Same decls under
    # any draft BEM class produce identical output (the Ctx carries the slug, not a class).
    a = process_element(_ctx(conn), _rt_decls())
    b = process_element(_ctx(conn), _rt_decls())
    assert a.attrs() == b.attrs() == {"maxWidth": "1200px"}


def test_metamorphic_px_scale_by_k(conn):
    k = 2
    base = process_element(_ctx(conn), [Decl("max-width", "600px", "Base")])
    scaled = process_element(_ctx(conn), [Decl("max-width", "1200px", "Base")])
    assert int(base.attrs()["maxWidth"].rstrip("px")) * k == int(scaled.attrs()["maxWidth"].rstrip("px"))
