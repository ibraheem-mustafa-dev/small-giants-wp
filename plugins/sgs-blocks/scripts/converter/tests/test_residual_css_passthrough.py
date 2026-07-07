"""test_residual_css_passthrough.py — FR-31-5.2 residual → sgsCustomCss.

A non-device-tier @media threshold (∉ {767,768,1023,1024}) SPLITS a device tier
and cannot be represented by the 3-tier Mobile/Tablet/Desktop attr model (D228
"arbitrary visual breakpoint"). Whole-tier folding keeps it OUT of the tier base
values (test_minwidth_cross_device_tier proves the tier side); THIS module proves
the other half — such a band is CAPTURED (never dropped) as a ``ResidualBand`` and
serialised to the owning block's ``sgsCustomCss`` (Additional-CSS) via the
``&selector`` convention consumed by includes/custom-css.php.

DB-free: uses only ``collect_css_decls_for_element`` / ``serialise_residual_bands``
/ ``_residual_selector_for`` (parse_sgs_bem is a pure DB-free parser).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_residual_css_passthrough.py
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.models import ResidualBand
from converter.services.styling_helpers import (
    _residual_selector_for,
    collect_css_decls_for_element,
    serialise_residual_bands,
)


def _node(html: str, cls: str):
    return BeautifulSoup(html, "html.parser").find(class_=cls)


# ---------------------------------------------------------------------------
# Capture: a non-device threshold nested inside Desktop is peeled to the sink.
# ---------------------------------------------------------------------------

_HERO_CONTENT_RULES = {
    ".sgs-hero__content": {"padding": "28px 20px 40px"},              # base (mobile)
    "@media (min-width: 768px) :: .sgs-hero__content": {"padding": "56px 48px"},   # device tier
    "@media (min-width: 1280px) :: .sgs-hero__content": {"padding": "72px 64px"},  # non-device
}


def test_min1280_is_captured_as_residual_not_in_tiers():
    """The base/tier attrs get the 56/48 device value; the 1280 band is peeled to
    the sink (NOT folded into the Desktop base — that is the whole-tier fix)."""
    node = _node('<div class="sgs-hero__content"></div>', "sgs-hero__content")
    sink: list[ResidualBand] = []
    base, bp = collect_css_decls_for_element(node, _HERO_CONTENT_RULES, residual_sink=sink)

    assert base["padding"] == "56px 48px"          # 1024-1279 value, NOT 72/64
    assert bp.get("Mobile", {}).get("padding") == "28px 20px 40px"
    assert "padding" not in bp.get("Tablet", {})   # Tablet inherits base

    assert len(sink) == 1
    band = sink[0]
    assert band.media_cond == "@media (min-width: 1280px)"
    assert band.decls == {"padding": "72px 64px"}
    assert band.selector == ".sgs-hero__content"   # the element's own SGS-BEM class


def test_device_threshold_produces_no_residual():
    """A pure device-tier rule (min-width:768) is fully representable by the tier
    attrs → NOTHING is captured in the residual sink."""
    rules = {
        ".sgs-x__grid": {"gap": "8px"},
        "@media (min-width: 768px) :: .sgs-x__grid": {"gap": "16px"},
    }
    node = _node('<div class="sgs-x__grid"></div>', "sgs-x__grid")
    sink: list[ResidualBand] = []
    collect_css_decls_for_element(node, rules, residual_sink=sink)
    assert sink == []


def test_no_sink_is_backward_compatible():
    """Without a sink the call is behaviour-identical (2-tuple return, no capture)
    — existing callers/tests that omit residual_sink are unaffected."""
    node = _node('<div class="sgs-hero__content"></div>', "sgs-hero__content")
    result = collect_css_decls_for_element(node, _HERO_CONTENT_RULES)
    assert isinstance(result, tuple) and len(result) == 2
    assert result[0]["padding"] == "56px 48px"


# ---------------------------------------------------------------------------
# Selector derivation — the band scopes to the element's own SGS-BEM class.
# ---------------------------------------------------------------------------

def test_selector_is_bem_element_class():
    node = _node('<div class="sgs-hero__content"></div>', "sgs-hero__content")
    assert _residual_selector_for(node) == ".sgs-hero__content"


def test_selector_is_empty_for_block_root():
    """A block-root node (BEM has no __element) yields '' → the band targets the
    wrapper via a bare &selector, no descendant."""
    node = _node('<div class="sgs-hero"></div>', "sgs-hero")
    assert _residual_selector_for(node) == ""


# ---------------------------------------------------------------------------
# Serialise — one @media per condition, &selector convention, idempotency markers.
# ---------------------------------------------------------------------------

def test_serialise_descendant_band():
    css = serialise_residual_bands([
        ResidualBand(selector=".sgs-hero__content", media_cond="@media (min-width: 1280px)",
                     decls={"padding": "72px 64px"}),
    ])
    assert css.startswith("/* SGS-CONVERTER-RESIDUAL:start */")
    assert css.endswith("/* SGS-CONVERTER-RESIDUAL:end */")
    assert "@media (min-width: 1280px){&selector .sgs-hero__content{padding:72px 64px;}}" in css


def test_serialise_root_band_uses_bare_selector():
    css = serialise_residual_bands([
        ResidualBand(selector="", media_cond="@media (min-width: 1280px)",
                     decls={"font-size": "58px"}),
    ])
    assert "@media (min-width: 1280px){&selector{font-size:58px;}}" in css


def test_serialise_groups_multiple_bands_by_media_then_selector():
    """Two bands under the SAME media query collapse into one @media block; distinct
    selectors become distinct rules inside it."""
    css = serialise_residual_bands([
        ResidualBand(selector="", media_cond="@media (min-width: 1280px)",
                     decls={"font-size": "58px"}),
        ResidualBand(selector=".sgs-hero__content", media_cond="@media (min-width: 1280px)",
                     decls={"padding": "72px 64px"}),
    ])
    # Exactly one @media wrapper for the shared condition.
    assert css.count("@media (min-width: 1280px){") == 1
    assert "&selector{font-size:58px;}" in css
    assert "&selector .sgs-hero__content{padding:72px 64px;}" in css


def test_serialise_empty_is_empty_string():
    assert serialise_residual_bands([]) == ""
