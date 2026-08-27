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
    # sgs/container.contentWidth is a MIGRATED tier-object attr (Spec 35 /
    # D802-class fix extended to CONTENT, this fix) — the Base value lands in
    # the object's 'desktop' key.
    band = _band('<div class="sgs-thing__inner"><p>x</p></div>')
    css = {".sgs-thing__inner": {"max-width": "1100px", "margin": "0 auto"}}
    attrs: dict = {}
    fold_band_css(band, owner, attrs, css)
    assert attrs.get("contentWidth") == {"desktop": "1100px"}, attrs


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
    # STRENGTHENED (EXECUTION Step 12, 2026-07-04), then RESHAPED by the
    # box-object interface contract (`.claude/plans/2026-07-09-box-object-
    # interface-contract.md` §3/§4, 2026-07-09): padding-top TRANSFERS to the
    # owner's merged 'contentBandPadding' OBJECT attr (block.json no longer
    # declares the flat 'contentBandPaddingTop' — see test_css_resolvers.py::
    # test_content_band_padding_transfers_to_content_band_padding_attr for the
    # resolver-level proof). background-color still runs the FULL cascade —
    # transferred when the owner declares a destination, else an HONEST
    # recorded gap (Step-7 Rule-4 accounting; background-color has no
    # CONTENT/GRID/OUTER attr on sgs/container today, so it stays a
    # NO_DESTINATION gap, never a silent drop).
    assert attrs.get("contentBandPadding") == {"top": "40px"}, (attrs, gaps)

    def _accounted(prop: str) -> bool:
        in_attrs = any(v == "#fff7f0" for v in attrs.values())
        in_gaps = any(g.property == prop for g in gaps)
        return in_attrs or in_gaps
    assert _accounted("background-color"), (attrs, gaps)


def test_gap3_props_fold_through_the_arrangement_channel(owner):
    """Spec 31 §2.4: arrangement CSS lands on the direct parent of the items,
    "folded up from a sole arrangement inner". GAP-3 keeps display/grid-template-*
    out of the RAW cross-node lift; it does not licence dropping them. Before
    2026-08-01 nothing re-homed them, so a band declaring `display:grid` folded
    its gap/contentWidth onto an owner that still rendered `display:block` —
    every folded arrangement property inert.
    """
    band = _band('<div class="sgs-thing__inner"><p>x</p></div>')
    css = {".sgs-thing__inner": {
        "display": "grid",
        "grid-template-columns": "repeat(4, 1fr)",
        "max-width": "1100px", "margin": "0 auto",
    }}
    attrs: dict = {}
    gaps = fold_band_css(band, owner, attrs, css)
    # display -> the layout TRIGGER attr (the §2.3 channel, validated enum).
    assert attrs.get("layout") == "grid", attrs
    # grid tracks -> the grid resolver's attrs, incl. the repeat(N) column count.
    # sgs/container.gridTemplateColumns/.columns/.contentWidth are all MIGRATED
    # tier-object attrs (Spec 35 / D802-class fix extended to GRID+CONTENT).
    assert attrs.get("gridTemplateColumns") == {"desktop": "repeat(4, 1fr)"}, attrs
    assert attrs.get("columns") == {"desktop": 4}, attrs
    # Neither is now an unexplained EXCLUDED drop...
    excluded = {g.property for g in gaps if g.origin is GapOrigin.EXCLUDED}
    assert not ({"display", "grid-template-columns"} & excluded), gaps
    # ...and the width still folds alongside — pinning the arrangement pass to
    # the GRID layer is what stops it stealing the band's CONTENT destinations.
    assert attrs.get("contentWidth") == {"desktop": "1100px"}, attrs


def test_gap3_props_stay_excluded_when_the_owner_has_no_destination(owner):
    """The EXCLUDED channel must still fire — and must still be reachable — when
    the owning block declares no arrangement attrs at all. A gate that can no
    longer fail reads green forever, so this is the negative leg of the pair
    above: a non-container owner writes NOTHING (no dead attrs) and reports the
    held declarations honestly.
    """
    band = _band('<div class="sgs-thing__inner"><p>x</p></div>')
    css = {".sgs-thing__inner": {"display": "flex", "gap": "16px"}}
    attrs: dict = {}
    # A content-KIND leaf that declares neither `layout` nor `gridTemplateColumns`.
    gaps = fold_band_css(band, "sgs/quote", attrs, css)
    assert "layout" not in attrs, attrs
    excluded = {g.property for g in gaps if g.origin is GapOrigin.EXCLUDED}
    assert "display" in excluded, gaps


def test_bemless_band_folds_identically(owner):
    # The retired lift_content_band_max_width special case is gone — a band
    # with NO sgs- class folds through the same cascade (CSS-signature only).
    band = _band('<div class="inner-shell"><p>x</p></div>')
    css = {".inner-shell": {"max-width": "720px", "margin": "0 auto"}}
    attrs: dict = {}
    fold_band_css(band, owner, attrs, css)
    assert attrs.get("contentWidth") == {"desktop": "720px"}, attrs
