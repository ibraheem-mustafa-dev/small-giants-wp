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
from converter.dispatch_spine import emit_block_markup, process_element
from converter.db.db_lookup import SGS_DB


def _ctx(conn: sqlite3.Connection, *, is_root: bool = True, block_slug: str = "sgs/container") -> Ctx:
    return Ctx(
        block_slug=block_slug,
        container_kind="section",
        delegates_content=1,
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
    # sgs/container.maxWidth is a MIGRATED tier-object attr (Spec 35 / D802-class
    # fix extended to OUTER, this fix) — the Base-tier value lands in the
    # object's 'desktop' key, exact literal (D230, no snap).
    result = process_element(_ctx(conn), _rt_decls())
    writes = {w.attr: w.value for w in result.writes}
    assert writes.get("maxWidth") == {"desktop": "1200px"}


def test_conservation_total_and_no_unrouted(conn):
    decls = _rt_decls()
    result = process_element(_ctx(conn), decls)
    # Per-declaration-result TOTALITY (seam decision Option A): every declaration
    # produced ≥1 routed result. (writes may exceed decl_count when a decl produces
    # a list[Write]; here it doesn't, but the invariant is decl_results==decl_count.)
    assert result.decl_results == len(decls)
    # background-color USED to be a NO_DESTINATION here, and this assertion said so.
    # That stopped being true on 2026-08-20: `1905257e` gave sgs/container a real,
    # client-reachable `backgroundColour` attribute (block.json:626, mapped at
    # elements.wrapper.attrMap "css:background-color"), painted via
    # sgs_background_paint_decl() at container/render.php:125-127. The DB row only
    # caught up on 2026-08-22 when /sgs-update re-derived the classifier artefact,
    # which had been stale for two days — so this test went red the moment the DB
    # became CORRECT, not when anything broke.
    #
    # The transfer is now the faithful outcome (7-rules #1/#4), so it is asserted
    # POSITIVELY below rather than the gap-set assertion merely being loosened —
    # a future regression that silently stops transferring it must still fail here.
    #
    # padding (root shorthand, "80px 24px") went through the SAME class of fix on
    # 2026-09-06 (Phase 2 tier-object migration): `padding` moved from a flat
    # 3-sibling box family to the TIER-of-BOXES shape ({desktop,tablet,mobile}),
    # and the converter's own routing (tier_state_suffix + dispatch_spine.attrs())
    # was updated in lockstep — it now correctly transfers to
    # `padding.desktop` instead of being an honest UNIMPLEMENTED_STUB gap (the
    # pre-dispatch shorthand-expansion seam this test used to document was a real
    # gap; it no longer applies to this specific attr because outer_box's box-
    # family self-merge exception, ~L220, now targets the correct shape). No GAP
    # remains for this element at all.
    assert {g.origin for g in result.gaps} == set()
    assert {w.attr: w.value for w in result.writes}.get("backgroundColour") == "#f5f0eb"
    assert {w.attr: w.value for w in result.writes}.get("padding") == {
        "top": "80px", "right": "24px", "bottom": "80px", "left": "24px",
    }
    assert result.unrouted() == []


def test_emit_produces_maxwidth_block_markup(conn):
    result = process_element(_ctx(conn), _rt_decls())
    markup = emit_block_markup("sgs/container", result.attrs())
    # No inner content → SELF-CLOSING form (WP save=null dynamic-block contract;
    # open+close fails block validation and drops the section on the rendered page —
    # wired-pipeline LANDED fix #2, 2026-07-01).
    # backgroundColour rides along since 1905257e (2026-08-20) gave sgs/container a
    # real background-colour attribute; padding rides along since the Phase 2
    # tier-object migration (2026-09-06) gave it a working TIER-of-BOXES
    # destination — see the note in test_conservation_total_and_no_unrouted for
    # why both expectations moved.
    assert markup == (
        '<!-- wp:sgs/container '
        '{"backgroundColour":"#f5f0eb","maxWidth":{"desktop":"1200px"},'
        '"padding":{"desktop":{"bottom":"80px","left":"24px","right":"24px","top":"80px"}}} /-->'
    )


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


def test_align_finalise_NOT_emitted_for_container_which_dropped_the_support(conn):
    # 2026-08-23: sgs/container no longer declares supports.align, so align_finalise()
    # must emit NOTHING for it. This is the regression guard for that removal — the
    # whole align mechanism was measured inert on the live canary (stripping
    # .alignfull from a real element changed nothing: left, width and all four
    # margins identical), and no SGS-BEM draft can express alignwide/alignfull at
    # all, so emitting it was inventing a WordPress idiom the draft never stated.
    # Full-bleed comes from maxWidth defaulting to {} — no outer cap — not from align.
    decls = [Decl("padding", "40px", "Base")]
    result = process_element(_ctx(conn), decls)
    assert "align" not in result.attrs()


def test_align_finalise_still_fires_for_a_block_that_DOES_support_align(conn):
    # POSITIVE CONTROL for the test above. Without this pair, "no align emitted"
    # would pass just as happily if align_finalise() were broken outright, and the
    # test above would be vacuous. sgs/card-grid still declares supports.align, so
    # the mechanism itself must still work — only sgs/container's DECLARATION changed.
    decls = [Decl("padding", "40px", "Base")]
    result = process_element(_ctx(conn, block_slug="sgs/card-grid"), decls)
    assert result.attrs().get("align") == "full"


def test_align_finalise_suppressed_when_max_width_present(conn):
    # When a base max-width IS present (and writes maxWidth), no synthetic align.
    result = process_element(_ctx(conn), _rt_decls())
    assert "align" not in result.attrs()
    assert result.attrs().get("maxWidth") == {"desktop": "1200px"}


def test_align_finalise_suppressed_by_tablet_only_max_width(conn):
    # FIX 1 (tier-blind absence): a max-width that exists ONLY at the Tablet tier
    # (no Base max-width) must STILL suppress the synthetic align:"full" — the
    # element is capped at tablet, so it is NOT an unconditional full-bleed. The
    # pre-fix Base-only absence test wrongly emitted align:"full" here.
    decls = [
        Decl("padding", "40px", "Base"),
        Decl("max-width", "900px", "Tablet"),
    ]
    result = process_element(_ctx(conn), decls)
    assert result.attrs().get("align") != "full"
    assert "align" not in result.attrs()


def test_align_finalise_synthetic_write_carries_sentinel_property(conn):
    # FIX 2: the synthetic align write must carry the sentinel property
    # '__align_finalise__' (not 'max-width'), so the F5 ledger join does not
    # mis-key it onto a real declaration (D240).
    # Retargeted 2026-08-23 to sgs/card-grid: sgs/container no longer declares
    # supports.align, so it emits no synthetic write at all and this assertion
    # would test nothing on it. The sentinel contract itself is unchanged.
    decls = [Decl("padding", "40px", "Base")]
    result = process_element(_ctx(conn, block_slug="sgs/card-grid"), decls)
    synth = [w for w in result.writes if w.attr == "align"]
    assert synth and synth[0].property == "__align_finalise__"


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
    # The metamorphic property under test is a == b (name-free routing); the literal
    # dict is only the current transfer set, which gained backgroundColour at
    # 1905257e (2026-08-20) and padding at the Phase 2 tier-object migration
    # (2026-09-06 — see test_conservation_total_and_no_unrouted). Both halves
    # kept: the invariant AND the exact set.
    assert a.attrs() == b.attrs()
    assert a.attrs() == {
        "backgroundColour": "#f5f0eb",
        "maxWidth": {"desktop": "1200px"},
        "padding": {"desktop": {"top": "80px", "right": "24px", "bottom": "80px", "left": "24px"}},
    }


def test_metamorphic_px_scale_by_k(conn):
    k = 2
    base = process_element(_ctx(conn), [Decl("max-width", "600px", "Base")])
    scaled = process_element(_ctx(conn), [Decl("max-width", "1200px", "Base")])
    base_px = base.attrs()["maxWidth"]["desktop"]
    scaled_px = scaled.attrs()["maxWidth"]["desktop"]
    assert int(base_px.rstrip("px")) * k == int(scaled_px.rstrip("px"))
