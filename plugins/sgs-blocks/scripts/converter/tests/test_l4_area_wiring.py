"""test_l4_area_wiring.py — L4 GRID-PER-AREA extraction wiring (D290).

The L4 per-area CSS extraction (route_area_css_to_block_attrs) was UNWIRED (MF-5)
until D290 wired it as assembly step 3d. These tests lock two things a pre-commit
council flagged:

1. ``attr_for_area_property`` (the L4 per-area resolver) must NEVER fall through to
   a BAND-mirror alias (``contentBandPadding*`` — the L2 container-band family). When
   a composite registers the band alias but not the direct per-area attr (cta-section
   has ``contentBandPaddingTop`` but no ``contentPaddingTop``), returning the band attr
   routes a nested ``__content`` column's padding onto the OUTER band (mis-attribution
   regression). The resolver returns None instead (caller gap-tracks).
2. A composite that DOES register the direct per-area attr (hero: ``contentPaddingTop``)
   still resolves correctly to its own element.

DB-dependent — skipped when the SGS DB is absent (CI without the DB).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_l4_area_wiring.py
"""
from __future__ import annotations

import pytest

from converter.db import db_lookup

pytestmark = pytest.mark.skipif(
    not db_lookup.SGS_DB.exists(), reason="SGS DB absent — per-area resolver needs it"
)


def test_area_resolver_skips_band_alias_for_cta_section():
    """cta-section registers contentBandPaddingTop (L2 band) but NOT contentPaddingTop
    (L4 per-area). The L4 resolver must return None, NOT the band alias — else the
    inner __content column's padding lands on the outer container band."""
    for prop in ("padding-top", "padding-left", "padding-bottom", "padding-right"):
        got = db_lookup.attr_for_area_property("sgs/cta-section", "content", prop)
        assert got is None, (
            f"cta-section content {prop} resolved to {got!r} — a band-mirror alias "
            f"(contentBandPadding*) must NOT be returned by the L4 per-area resolver."
        )


def test_area_resolver_binds_direct_per_area_attr_for_hero():
    """hero registers contentPaddingTop (its own grid-area column) — the resolver binds
    it directly, unaffected by the band-alias skip."""
    assert db_lookup.attr_for_area_property("sgs/hero", "content", "padding-top") == "contentPaddingTop"
    assert db_lookup.attr_for_area_property("sgs/hero", "content", "padding-left") == "contentPaddingLeft"


def test_area_resolver_non_band_secondary_suffix_still_resolves():
    """The band-skip must not break legitimate non-band suffixes: hero media
    background-color resolves via the Background suffix (not a band alias)."""
    got = db_lookup.attr_for_area_property("sgs/hero", "media", "background-color")
    assert got is not None and "Band" not in got, (
        f"hero media background-color resolved to {got!r} — a non-band per-area "
        f"attr was expected (the band-skip over-filtered)."
    )
