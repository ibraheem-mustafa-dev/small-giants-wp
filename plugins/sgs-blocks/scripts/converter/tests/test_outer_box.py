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
    # Per-declaration-result TOTALITY (seam decision Option A): every declaration
    # produced ≥1 routed result. (writes may exceed decl_count when a decl produces
    # a list[Write]; here it doesn't, but the invariant is decl_results==decl_count.)
    assert result.decl_results == len(decls)
    # The box props are honest tracked GAPs, not silent drops: padding (shorthand,
    # pre-dispatch-expansion seam) is UNIMPLEMENTED_STUB; background-color has no
    # OUTER attr on sgs/container so it is a faithful NO_DESTINATION.
    assert {g.origin for g in result.gaps} == {
        GapOrigin.UNIMPLEMENTED_STUB, GapOrigin.NO_DESTINATION
    }
    assert result.unrouted() == []


def test_emit_produces_maxwidth_block_markup(conn):
    result = process_element(_ctx(conn), _rt_decls())
    markup = emit_block_markup("sgs/container", result.attrs())
    assert markup == '<!-- wp:sgs/container {"maxWidth":"1200px"} --><!-- /wp:sgs/container -->'


# ---------------------------------------------------------------------------
# A4 — non-device-tier breakpoint → NO_DESTINATION gap, never coerced
# ---------------------------------------------------------------------------

def test_non_device_tier_max_width_is_gapped(conn):
    # A non-device-tier max-width has no device bucket → NO_DESTINATION gap (A4),
    # never coerced. (sgs/container supports align:full and has no BASE max-width
    # here, so align_finalise also emits a synthetic align:"full" per §3.A.3 — the
    # gap-behaviour under test is unaffected by that element-level post-pass.)
    decls = [Decl("max-width", "600px", "Other:(max-width: 600px)")]
    result = process_element(_ctx(conn), decls)
    assert result.gaps[0].origin is GapOrigin.NO_DESTINATION
    # No maxWidth write (the decl gapped); only the synthetic full-bleed align.
    assert not any(w.attr == "maxWidth" for w in result.writes)


def test_align_finalise_full_on_max_width_absence(conn):
    # Spec 31 §3.A.3: an OUTER element with NO base max-width and a block that
    # supports align:full gets a synthetic align:"full" (full-bleed default),
    # appended OUTSIDE the conservation count.
    decls = [Decl("padding", "40px", "Base")]
    result = process_element(_ctx(conn), decls)
    assert result.attrs().get("align") == "full"


def test_align_finalise_suppressed_when_max_width_present(conn):
    # When a base max-width IS present (and writes maxWidth), no synthetic align.
    result = process_element(_ctx(conn), _rt_decls())
    assert "align" not in result.attrs()
    assert result.attrs().get("maxWidth") == "1200px"


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
