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


def test_area_resolver_routes_per_area_padding_to_object_for_hero():
    """Post-D295 (no-inline box-object rollout) hero migrated its per-area padding
    flat→OBJECT (``contentPadding``, box_family-seeded), so the FLAT per-area
    resolver returns None for a padding side — the box-object path
    (``fold_helpers.route_area_css_to_block_attrs``, assembly step 3d — the ONLY
    live grid-per-area path; the former per-declaration ``grid_area.py`` resolver
    was dead code, deleted D642) routes the side into the ``contentPadding``
    object instead (folded by the orchestrator accumulator; see
    ``test_route_area_css_folds_per_area_padding_to_object_for_hero`` below for the
    live-path assertion). A NON-box per-area attr (background, tested below) still
    resolves flat.

    ⚑ De-xfailed 2026-09-07 (D996). It carried ``xfail(strict=True)`` citing D554
    ruling C ("the converter STAYS FLAT until the Spec 39 rework"), written to
    fail loud the moment the converter began emitting tier objects. That moment
    is now: ``fold_helpers.route_area_css_to_block_attrs`` emits the TIER-of-BOXES
    envelope, completing for the L4 per-area path what ``c829647c8`` had already
    shipped for the resolver spine. D554-C is superseded for
    padding/margin/borderRadius.

    Its final assertion was also factually wrong and is corrected here: it
    required ``box_family_for('sgs/hero', 'contentPaddingTablet')`` to be
    non-None, but the D295 box-object migration PRUNED the flat tier siblings —
    that attribute does not exist and must not come back. Asserting its ABSENCE
    is the real regression guard, since a reintroduced flat sibling is exactly
    what would silently re-split the tier object."""
    assert db_lookup.attr_for_area_property("sgs/hero", "content", "padding-top") is None
    assert db_lookup.attr_for_area_property("sgs/hero", "content", "padding-left") is None
    # the per-area padding OBJECT family IS declared (box_family seeded, D295).
    assert db_lookup.box_family_for("sgs/hero", "contentPadding") is not None
    # ...and it is TIER-shaped ({desktop,tablet,mobile} of boxes), which is what
    # makes the suffixed siblings unnecessary AND wrong to reintroduce.
    assert db_lookup.box_family_is_tier_shaped("sgs/hero", "contentPadding") is True
    # The pruned flat siblings must STAY pruned.
    assert db_lookup.box_family_for("sgs/hero", "contentPaddingTablet") is None
    assert db_lookup.box_family_for("sgs/hero", "contentPaddingMobile") is None


def test_area_resolver_non_band_secondary_suffix_still_resolves():
    """The band-skip must not break legitimate non-band suffixes: hero media
    background-color resolves via the Background suffix (not a band alias)."""
    got = db_lookup.attr_for_area_property("sgs/hero", "media", "background-color")
    assert got is not None and "Band" not in got, (
        f"hero media background-color resolved to {got!r} — a non-band per-area "
        f"attr was expected (the band-skip over-filtered)."
    )


def test_route_area_css_folds_per_area_padding_to_object_for_hero():
    """The LIVE L4 path (assembly step 3d → fold_helpers.route_area_css_to_block_attrs)
    routes a hero ``__content`` wrapper's padding into the ``contentPadding`` OBJECT attr
    (D295 box-object migration, FR-31-22), NOT the retired flat ``contentPadding{Side}``
    attrs that ``attr_for_area_property`` can no longer resolve. Locks the fold_helpers
    box-object routing verified LANDED on page 8 (72/64 @1440, 28/20/40 @375)."""
    from bs4 import BeautifulSoup
    from converter.services.fold_helpers import route_area_css_to_block_attrs

    node = BeautifulSoup('<div class="sgs-hero__content"></div>', "html.parser").find(True)
    # ⚑ The fixture now carries THREE tiers (2026-09-07, D996). It previously
    # supplied only a base rule, which meant it could not detect the very defect
    # it is here to guard: the tablet/mobile writes were being dropped SILENTLY
    # (no gap, no trace) because they targeted the pruned contentPaddingTablet /
    # contentPaddingMobile siblings. A single-tier fixture passes either way.
    # max-width:1023 applies at the Tablet (800) and Mobile (375) samples;
    # max-width:767 applies at Mobile only and overrides it there.
    css_rules = {
        ".sgs-hero__content": {"padding": "72px 64px"},
        "max-width: 1023 :: .sgs-hero__content": {"padding": "48px 32px"},
        "max-width: 767 :: .sgs-hero__content": {"padding": "28px 20px 40px 20px"},
    }
    parent_attrs: dict = {}
    route_area_css_to_block_attrs(node, "content", "sgs/hero", parent_attrs, css_rules)

    # All three tiers fold into ONE contentPadding TIER-of-BOXES object, each
    # tier holding its own {top,right,bottom,left} box.
    assert parent_attrs.get("contentPadding") == {
        "desktop": {"top": "72px", "right": "64px", "bottom": "72px", "left": "64px"},
        "tablet": {"top": "48px", "right": "32px", "bottom": "48px", "left": "32px"},
        "mobile": {"top": "28px", "right": "20px", "bottom": "40px", "left": "20px"},
    }
    # No flat per-side contentPadding{Side} attr, and no resurrected tier-suffixed
    # sibling — the single object holds every tier and every side.
    assert not any(
        k.startswith("contentPadding") and k != "contentPadding"
        for k in parent_attrs
    )
