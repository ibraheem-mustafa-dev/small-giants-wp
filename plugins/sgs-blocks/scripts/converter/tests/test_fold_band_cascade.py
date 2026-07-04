"""test_fold_band_cascade.py — EXECUTION Step 7 (FR-31-2.8.4, the 2e2 ONE cascade).

The band-fold now routes a folded band's FULL declaration stream through the
SAME process_element dispatch as the root (destination-parametric). The two
retired reduced paths (max-width-only fallback; hand-rolled prop→layer ladder
with the GAP-3 silent early-return) are deleted; these tests lock:

1. a band's padding / background / text-align TRANSFER (they silently dropped
   before — the Step-7 requirement);
2. max-width still lands on contentWidth (unregressed);
3. GAP-3 props (display/grid-template-*) come back as RECORDED EXCLUDED gaps,
   never silent;
4. a BEM-less band folds identically (no special case).
"""
from __future__ import annotations

import pytest
from bs4 import BeautifulSoup

from converter.models import GapOrigin
from converter.services.fold_helpers import fold_band_css
from converter.db import db_lookup


def _band(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def _css(sel: str, decls: dict, media: dict | None = None) -> dict:
    rules = {sel: dict(decls)}
    if media:
        for cond, d in media.items():
            rules[f"{sel} @@ {cond}"] = dict(d)
    return rules


OWNER = None  # resolved from the DB in setup (no slug literal)


@pytest.fixture(scope="module")
def owner():
    slug = db_lookup.container_default_slug()
    assert slug, "DB absent — container_default_slug unavailable"
    return slug


def test_band_max_width_still_lands_content_width(owner):
    band = _band('<div class="sgs-thing__inner"><p>x</p></div>')
    css = {".sgs-thing__inner": {"max-width": "1100px", "margin": "0 auto"}}
    attrs: dict = {}
    fold_band_css(band, owner, attrs, css)
    assert attrs.get("contentWidth") == "1100px", attrs


def test_band_padding_background_textalign_transfer(owner):
    # THE Step-7 requirement: these silently dropped under the retired paths
    # (padding fell through the ladder or the max-width-only fallback;
    # text-align only folded via the element-token router).
    band = _band('<div class="sgs-thing__inner"><p>x</p></div>')
    css = {".sgs-thing__inner": {
        "max-width": "960px", "margin": "0 auto",
        "padding-top": "40px",
        "background-color": "#fff7f0",
        "text-align": "center",
    }}
    attrs: dict = {}
    gaps = fold_band_css(band, owner, attrs, css)
    # text-align → the owner's WP-native textAlign (FR-31-5.1a), when declared.
    typ = db_lookup.block_supports_for(owner).get("typography") or {}
    if typ.get("textAlign"):
        assert attrs.get("textAlign") == "center", attrs
    # STRENGTHENED (EXECUTION Step 12, 2026-07-04): padding-top now TRANSFERS to
    # the owner's real 'contentBandPaddingTop' attr (migrations/
    # 2026-07-04-property-suffixes-content-band-padding.py seeded the
    # 'BandPaddingTop' property_suffixes row that closes the naming-divergence
    # gap this test used to merely tolerate as NO_DESTINATION — see
    # test_css_resolvers.py::test_content_band_padding_transfers_to_content_band_padding_attr
    # for the resolver-level proof). background-color still runs the FULL
    # cascade — transferred when the owner declares a destination, else an
    # HONEST recorded gap (Step-7 Rule-4 accounting; background-color has no
    # CONTENT/GRID/OUTER attr on sgs/container today, so it stays a
    # NO_DESTINATION gap, never a silent drop).
    assert attrs.get("contentBandPaddingTop") == "40px", (attrs, gaps)

    def _accounted(prop: str) -> bool:
        in_attrs = any(v == "#fff7f0" for v in attrs.values())
        in_gaps = any(g.property == prop for g in gaps)
        return in_attrs or in_gaps
    assert _accounted("background-color"), (attrs, gaps)


def test_gap3_props_are_recorded_excluded_never_silent(owner):
    band = _band('<div class="sgs-thing__inner"><p>x</p></div>')
    css = {".sgs-thing__inner": {
        "display": "grid",
        "grid-template-columns": "repeat(4, 1fr)",
        "max-width": "1100px", "margin": "0 auto",
    }}
    attrs: dict = {}
    gaps = fold_band_css(band, owner, attrs, css)
    excluded = {g.property for g in gaps if g.origin is GapOrigin.EXCLUDED}
    assert {"display", "grid-template-columns"} <= excluded, gaps
    # The grid props must NOT have been lifted cross-node (GAP-3).
    assert "gridTemplateColumns" not in attrs, attrs
    # The width still folds alongside (the full stream ran).
    assert attrs.get("contentWidth") == "1100px", attrs


def test_bemless_band_folds_identically(owner):
    # The retired lift_content_band_max_width special case is gone — a band
    # with NO sgs- class folds through the same cascade (CSS-signature only).
    band = _band('<div class="inner-shell"><p>x</p></div>')
    css = {".inner-shell": {"max-width": "720px", "margin": "0 auto"}}
    attrs: dict = {}
    fold_band_css(band, owner, attrs, css)
    assert attrs.get("contentWidth") == "720px", attrs
