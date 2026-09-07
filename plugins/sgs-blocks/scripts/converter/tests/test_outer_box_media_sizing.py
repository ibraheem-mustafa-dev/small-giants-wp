"""test_outer_box_media_sizing.py — the `mediaSizing` companion-write proof.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_outer_box_media_sizing.py

Defect: a draft `height:440px` on sgs/media stores faithfully to
`height:{"desktop":"440px"}`, but PHP (`includes/media/atoms/box-shape.php`
`sgs_media_atom_box_shape_resolve_sizing_mode()`) only emits the
`--sgs-media-height` custom property when the block's `mediaSizing` switch
resolves to `'height'` — and nothing in the converter ever wrote that switch,
so the stored height was INERT (mode fell through to the `'auto'` default,
letting the source image's intrinsic 73px height win — the eleven-fold
upscale to 1500px on the canary).

Fix: `outer_box._with_media_sizing_companion()` appends a
`{switch_attr: 'height'}` Write alongside the real height write, whenever the
`height` declaration routes to a block that declares the switch attr
(derived by naming convention from `base_attr`, gated on `block_attrs` — see
`_media_sizing_switch_attr()`'s docstring).

Positive: sgs/media (unprefixed — switch is `mediaSizing`).
Negative control: sgs/before-after ALSO has a tier-object `height` attr
(same `db_lookup.tier_object_base` branch fires) but declares NO sizing
switch at all — proves the companion is gated on the block's real schema,
not fired unconditionally for every block routing through this branch.
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.dispatch_spine import process_element
from converter.db.db_lookup import SGS_DB


def _ctx(conn: sqlite3.Connection, block_slug: str, *, container_kind: str = "content") -> Ctx:
    return Ctx(
        block_slug=block_slug,
        container_kind=container_kind,
        delegates_content=0,
        variant_value=None,
        variant_attr=None,
        node=None,
        is_root=True,
        base_layer="OUTER",
        conn=conn,
    )


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


def _height_decl(value: str = "440px") -> list[Decl]:
    return [Decl("height", value, "Base")]


# ---------------------------------------------------------------------------
# POSITIVE — sgs/media: height write is inert without the companion switch.
# ---------------------------------------------------------------------------

def test_sgs_media_height_gets_media_sizing_companion(conn):
    result = process_element(_ctx(conn, "sgs/media"), _height_decl())
    writes = {w.attr: w.value for w in result.writes}
    assert writes.get("height") == {"desktop": "440px"}
    # The defect this fixes: without this key, box-shape.php's mode gate
    # falls through to 'auto' and the height write above renders nothing.
    assert writes.get("mediaSizing") == "height"


def test_sgs_media_height_companion_is_one_decl_result(conn):
    # Conservation: ONE declaration, TWO writes — the seam contract is
    # per-declaration-result totality (dispatch_spine.py's decl_results),
    # not per-write, so this must still count as 1 result, not 2.
    decls = _height_decl()
    result = process_element(_ctx(conn, "sgs/media"), decls)
    assert result.decl_results == len(decls)
    assert {g.origin for g in result.gaps} == set()


def test_sgs_media_height_tablet_still_gets_companion(conn):
    # mediaSizing is a flat (non-tiered) switch — a Tablet-only height decl
    # must still flip it, or a tablet-only art-directed height would remain
    # inert exactly like the original defect.
    result = process_element(_ctx(conn, "sgs/media"), [Decl("height", "300px", "Tablet")])
    writes = {w.attr: w.value for w in result.writes}
    assert writes.get("height") == {"tablet": "300px"}
    assert writes.get("mediaSizing") == "height"


# ---------------------------------------------------------------------------
# NEGATIVE CONTROL — sgs/before-after: same tier-object `height` branch
# fires (proven live via db_lookup.tier_object_base), but the block
# declares NO sizing-mode switch at all. The companion write must NOT
# appear — proves the gate is real (block_attrs-checked), not a no-op that
# would pass vacuously if the companion fired for every block.
# ---------------------------------------------------------------------------

def test_before_after_height_gets_no_media_sizing_companion(conn):
    result = process_element(_ctx(conn, "sgs/before-after"), _height_decl())
    writes = {w.attr: w.value for w in result.writes}
    # The real height transfer still happens (this block's own tier-object
    # destination is unaffected by this fix)...
    assert writes.get("height") == {"desktop": "440px"}
    # ...but nothing named a sizing-mode switch was invented for it.
    assert "mediaSizing" not in writes
    assert not any(k.endswith("MediaSizing") for k in writes)


# ---------------------------------------------------------------------------
# sgs/hero — the PREFIXED derivation case (splitMediaHeight ->
# splitMediaMediaSizing), proving the convention isn't sgs/media-specific.
#
# NOT exercised through process_element(): splitMediaHeight is a nested
# split-media ELEMENT attr, not reachable from a bare root-level OUTER
# `height` declaration the way sgs/media's own `height` is (verified live:
# db_lookup.attr_for_layer_property('sgs/hero','OUTER','height') is None —
# the real dispatch for that element needs its own per-element Ctx/selector
# scoping this test harness does not attempt to reconstruct). The prefix
# arithmetic itself is exercised directly against the real DB instead —
# this is the same derivation `_with_media_sizing_companion()` calls, just
# invoked without the full per-element routing scaffolding around it.
# ---------------------------------------------------------------------------

def test_derive_prefixed_switch_attr_for_hero_split_media():
    from converter.resolvers.outer_box import _media_sizing_switch_attr

    assert _media_sizing_switch_attr("sgs/hero", "splitMediaHeight") == "splitMediaMediaSizing"


def test_derive_unprefixed_switch_attr_for_media():
    from converter.resolvers.outer_box import _media_sizing_switch_attr

    assert _media_sizing_switch_attr("sgs/media", "height") == "mediaSizing"


def test_derive_switch_attr_returns_none_when_block_has_no_switch():
    from converter.resolvers.outer_box import _media_sizing_switch_attr

    # Real block, real tier-object height attr, genuinely no switch declared.
    assert _media_sizing_switch_attr("sgs/before-after", "height") is None


def test_derive_switch_attr_returns_none_for_non_height_shaped_base_attr():
    from converter.resolvers.outer_box import _media_sizing_switch_attr

    # base_attr doesn't end in 'Height' at all -> no convention match, no
    # candidate ever looked up.
    assert _media_sizing_switch_attr("sgs/container", "maxWidth") is None
