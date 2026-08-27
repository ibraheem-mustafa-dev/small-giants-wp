"""test_grid_template_areas_content_order.py — grid-template-areas order swap
→ splitContentOrder (hero mobile/desktop media-content stacking).

Root cause (proven, not inferred): `dispatch_table.py`'s `_GRID_LAYOUT_PROPS`
routes `grid-template-areas` to the `grid` resolver unconditionally (a
PRE-LAYER GRID concern, same idiom as `grid-template-columns`), but
`resolvers/grid.py::resolve` had NO branch for the property — it fell through
to the final catch-all and was gapped as `UNIMPLEMENTED_STUB` (grid.py, prior
to this fix). The real draft (`sites/mamas-munches/mockups/homepage/
index.html:250-284`) declares exactly this pattern on `.sgs-hero`:

    .sgs-hero { grid-template-areas: "media" "content"; }         /* mobile */
    @media (min-width: 768px) {
      .sgs-hero { grid-template-areas: "content media"; }         /* desktop */
    }

`sgs/hero` already declares `splitContentOrder` (tier-object, default
`{"mobile": "media-first"}`) for exactly this — the fix routes the area-order
SWAP into that attr rather than dropping it.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_grid_template_areas_content_order.py
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.db.db_lookup import SGS_DB, content_order_attr_for
from converter.models import GAP, Write
from converter.resolvers import grid


def _ctx(conn, *, slug="sgs/hero", kind="section", hib=1, root=False, layer=None):
    return Ctx(slug, kind, hib, None, None, None, root, layer, conn)


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


# ---------------------------------------------------------------------------
# Premise — if this fails, sgs/hero's schema has changed shape and the proofs
# below are vacuous; re-point rather than delete.
# ---------------------------------------------------------------------------

def test_premise_hero_resolves_to_split_content_order(conn):
    assert content_order_attr_for("sgs/hero") == "splitContentOrder"


# ---------------------------------------------------------------------------
# The real draft's mobile declaration: media above content -> media-first.
# ---------------------------------------------------------------------------

def test_mobile_media_above_content_emits_media_first(conn):
    out = grid.resolve(
        Decl("grid-template-areas", '"media" "content"', "Mobile"), _ctx(conn)
    )
    assert isinstance(out, Write), f"expected a Write, got a GAP: {out}"
    assert out.attr == "splitContentOrder"
    assert out.value == {"mobile": "media-first"}


# ---------------------------------------------------------------------------
# The real draft's desktop declaration: content beside media -> the literal
# enum member 'content-first', NEVER '' — '' means INHERIT on this attr
# (render.php desktop only special-cases 'media-first'; any other string,
# including 'content-first', falls through to the same natural-DOM-order CSS
# as '' does today — so this is not a behaviour change on desktop, only a
# correctness fix that stops being "right by accident").
# ---------------------------------------------------------------------------

def test_desktop_content_beside_media_emits_explicit_content_first(conn):
    out = grid.resolve(
        Decl("grid-template-areas", '"content media"', "Base"), _ctx(conn)
    )
    assert isinstance(out, Write), f"expected a Write, got a GAP: {out}"
    assert out.attr == "splitContentOrder"
    assert out.value == {"desktop": "content-first"}


# ---------------------------------------------------------------------------
# CRITICAL regression proof: content above media at the MOBILE tier.
#
# render.php:542 only flips to content-first when
# `'content-first' === $split_order_mobile` — '' is never equal to that
# string, so a blank/empty write here would silently leave mobile stacked
# media-first (the block's default), inverting the exact stacking order this
# feature exists to clone. Before the emitted-value fix this test asserted
# `{"mobile": ""}` (the bug) and PASSED for the wrong reason; it now asserts
# the literal enum member and is the direct proof the resolver derives it.
# ---------------------------------------------------------------------------

def test_mobile_content_above_media_emits_content_first_not_blank(conn):
    out = grid.resolve(
        Decl("grid-template-areas", '"content" "media"', "Mobile"), _ctx(conn)
    )
    assert isinstance(out, Write), f"expected a Write, got a GAP: {out}"
    assert out.attr == "splitContentOrder"
    assert out.value == {"mobile": "content-first"}, (
        f"got {out.value!r} — '' would silently mean INHERIT on mobile, "
        "never 'content-first' (render.php:542 only matches the literal "
        "string), so a blank write here leaves mobile stacked media-first"
    )


# ---------------------------------------------------------------------------
# TABLET tier — the inherit-vs-explicit distinction matters here too:
# render.php:532 treats a blank tablet override as "inherit the resolved
# desktop order" (`if ( $split_order_tablet )` is falsy on ''), so an explicit
# tablet value must never be written as ''. Covers both members at this tier.
# ---------------------------------------------------------------------------

def test_tablet_content_beside_media_emits_explicit_content_first(conn):
    out = grid.resolve(
        Decl("grid-template-areas", '"content media"', "Tablet"), _ctx(conn)
    )
    assert isinstance(out, Write), f"expected a Write, got a GAP: {out}"
    assert out.attr == "splitContentOrder"
    assert out.value == {"tablet": "content-first"}


def test_tablet_media_beside_content_emits_media_first(conn):
    out = grid.resolve(
        Decl("grid-template-areas", '"media content"', "Tablet"), _ctx(conn)
    )
    assert isinstance(out, Write), f"expected a Write, got a GAP: {out}"
    assert out.attr == "splitContentOrder"
    assert out.value == {"tablet": "media-first"}


# ---------------------------------------------------------------------------
# Negative control — a block with no media/content area vocabulary at all
# (e.g. sgs/container) must gap, never guess a destination.
# ---------------------------------------------------------------------------

def test_block_without_media_content_areas_gaps_honestly(conn):
    out = grid.resolve(
        Decl("grid-template-areas", '"media" "content"', "Mobile"),
        _ctx(conn, slug="sgs/container"),
    )
    assert isinstance(out, GAP), f"expected a GAP for a non-split block, got {out}"
