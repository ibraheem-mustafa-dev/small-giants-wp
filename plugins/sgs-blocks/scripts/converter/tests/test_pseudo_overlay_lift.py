"""Unit B1 — ::before/::after pseudo-element CSS lift (Spec 31 §12.2.1 M3-S7).

Guards:
  1. rt-pseudo-before (sgs/info-box, no overlay attr family) stays an HONEST
     GAP: every pseudo declaration is captured (never silently dropped) and
     recorded via content_gap_collector — never inlined.
  2. A container-KIND block that DOES declare the overlay family
     (sgs/container) LIFTS a linear-gradient ::before onto
     overlayGradient/overlayGradientAngle/overlayGradientFrom/
     overlayGradientTo.
  3. A solid-colour ::before lifts onto backgroundOverlayColour (+ opacity
     when the colour is rgba()).
  4. The selector-stripper isolates pseudo-elements from state pseudo-classes
     and plain selectors (mirrors test_state_strip_selector_shapes).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402

from converter.db import db_lookup  # noqa: E402
from converter.services import content_gap_collector  # noqa: E402
from converter.services.pseudo_overlay import (  # noqa: E402
    _strip_pseudo_element_from_selector,
    collect_pseudo_decls_for_element,
    parse_overlay_background,
    resolve_pseudo_overlay,
)
from converter.services.css_pass import _build_css_attrs  # noqa: E402
from converter.context import Recognition  # noqa: E402


def _gapped_props(gaps: list[dict]) -> set[str]:
    """Extract the css-property name from each recorded content-gap's detail
    string (format: "unmapped pseudo-element css: {prop}={val!r}")."""
    out = set()
    for g in gaps:
        detail = g["detail"]
        marker = "unmapped pseudo-element css: "
        if marker in detail:
            out.add(detail.split(marker, 1)[1].split("=", 1)[0])
    return out


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

_INFO_BOX_HTML = (
    '<section class="sgs-info-box">'
    '<div class="sgs-info-box__inner">'
    '<h2 class="sgs-info-box__heading">Why Our Framework Wins</h2>'
    "</div></section>"
)

_INFO_BOX_RULES = {
    ".sgs-info-box": {"position": "relative", "padding": "56px 32px", "background": "#1a1a2e"},
    ".sgs-info-box::before": {
        "content": '""',
        "position": "absolute",
        "inset": "0",
        "background": "linear-gradient(135deg, rgba(90, 40, 160, 0.55) 0%, rgba(20, 100, 200, 0.35) 100%)",
        "z-index": "0",
        "pointer-events": "none",
    },
}


def _info_box_section():
    return BeautifulSoup(_INFO_BOX_HTML, "html.parser").find("section")


# ---------------------------------------------------------------------------
# 1. Selector-stripper shapes
# ---------------------------------------------------------------------------


def test_pseudo_strip_selector_shapes():
    assert _strip_pseudo_element_from_selector(".sgs-info-box::before", "before") == ".sgs-info-box"
    assert (
        _strip_pseudo_element_from_selector(".sgs-info-box::before, .other", "before")
        == ".sgs-info-box"
    )
    # A state pseudo-CLASS (single colon) must NOT be mistaken for a pseudo-ELEMENT.
    assert _strip_pseudo_element_from_selector(".x:hover", "before") is None
    assert _strip_pseudo_element_from_selector(".plain", "before") is None
    # ::after is independent of ::before.
    assert _strip_pseudo_element_from_selector(".x::after", "before") is None
    assert _strip_pseudo_element_from_selector(".x::after", "after") == ".x"


def test_collector_isolates_pseudo_from_base():
    """The M3-S7 fixture's own regression: pseudo decls must never leak into
    the resting base, and must never be silently absent from EITHER stream."""
    section = _info_box_section()
    from converter.services.styling_helpers import collect_css_decls_for_element

    base, _bp = collect_css_decls_for_element(section, _INFO_BOX_RULES)
    pseudo = collect_pseudo_decls_for_element(section, _INFO_BOX_RULES)

    assert "content" not in base, "pseudo decl leaked into the resting base bucket"
    assert base.get("padding") == "56px 32px"  # resting base still collected normally
    assert pseudo["before"]["content"] == '""'
    assert pseudo["before"]["position"] == "absolute"
    assert pseudo["before"]["z-index"] == "0"
    assert pseudo["before"]["pointer-events"] == "none"
    assert "linear-gradient" in pseudo["before"]["background"]


# ---------------------------------------------------------------------------
# 2. Background-value parser
# ---------------------------------------------------------------------------


def test_parse_gradient_maps_to_one_verbatim_string():
    """D643 — ONE `overlayGradient` string holding the complete CSS value.

    The pre-D636 shape (`overlayGradient` boolean + `overlayGradientAngle`/
    `From`/`To`) is GONE from every block.json, so emitting it wrote four attrs
    WordPress silently discards. The whole point of asserting the value
    VERBATIM is that no information is left behind: the mid-stops and the stop
    POSITIONS below both survive, where the old first-and-last decomposition
    threw them away.
    """
    src = (
        "linear-gradient(135deg, rgba(90, 40, 160, 0.55) 0%, "
        "rgba(20, 100, 200, 0.35) 100%)"
    )
    assert parse_overlay_background(src) == {"overlayGradient": src}
    for dead in (
        "overlayGradientAngle",
        "overlayGradientFrom",
        "overlayGradientTo",
    ):
        assert dead not in parse_overlay_background(src)


def test_parse_gradient_preserves_mid_stops_the_old_shape_discarded():
    """A 3-stop gradient kept only its first and last colour under the old
    decomposition. Holding the string keeps every stop — a real fidelity gain,
    asserted so a future "simplification" back to from/to fails loudly."""
    src = "linear-gradient(90deg, #000 0%, #f00 50%, #fff 100%)"
    assert parse_overlay_background(src) == {"overlayGradient": src}


def test_parse_gradient_no_angle_is_carried_verbatim():
    """No explicit angle → nothing is fabricated; the string is what the draft
    wrote, and CSS's own `to bottom` default applies at render time."""
    assert parse_overlay_background("linear-gradient(#000, #fff)") == {
        "overlayGradient": "linear-gradient(#000, #fff)"
    }


def test_parse_radial_and_conic_are_now_cloneable():
    """D643 capability gain. The 4-scalar shape could only express an angle
    plus two stops, so radial/conic drafts fell to the honest-gap path and
    could not be cloned at all. One string has no such limit."""
    for src in (
        "radial-gradient(circle, #000, #fff)",
        "conic-gradient(from 45deg, #000, #fff)",
        "repeating-linear-gradient(45deg, #000 0%, #fff 10%)",
    ):
        assert parse_overlay_background(src) == {"overlayGradient": src}


def test_parse_solid_colour():
    out = parse_overlay_background("#1a1a2e")
    assert out == {"backgroundOverlayColour": "#1a1a2e"}


def test_parse_solid_rgba_keeps_alpha_in_the_colour_not_a_separate_attr():
    """D581 (2026-08-11) RETIRED `backgroundOverlayOpacity` — the colour's own
    alpha is the single dimming mechanism now, so the alpha must ride inside the
    rgba() value and NO separate opacity attr may be written.

    This test previously asserted `out["backgroundOverlayOpacity"] == 40`. That
    attribute is declared by ZERO blocks since `1ccbdbe1`, so the write was
    silently discarded by WordPress (D338) while still looking like a transfer.
    Asserting its ABSENCE is what stops it being reintroduced as a "derived
    convenience" value.
    """
    out = parse_overlay_background("rgba(0, 0, 0, 0.4)")
    assert out["backgroundOverlayColour"] == "rgba(0, 0, 0, 0.4)"
    assert "backgroundOverlayOpacity" not in out
    # The alpha is not lost — it is carried verbatim inside the colour above.
    assert "0.4" in out["backgroundOverlayColour"]


def test_parse_unmappable_returns_none():
    assert parse_overlay_background("url(bg.png)") is None
    assert parse_overlay_background("none") is None
    assert parse_overlay_background("") is None
    # A single-stop "gradient" paints NOTHING. D643 clones the gradient string
    # verbatim instead of decomposing it, and the decomposition is what used to
    # reject this — so `_linear_gradient_renders_something()` now carries that
    # guarantee explicitly. Without it a malformed draft gradient would clone
    # into an invisible overlay: a silent half-write, not a faithful transfer.
    assert parse_overlay_background("linear-gradient(#000)") is None
    # NOTE: `radial-gradient(circle, #000, #fff)` used to be asserted here as
    # unmappable. It is now CLONEABLE (see the radial/conic test above) — the
    # limitation was the storage shape, never the mechanism.


# ---------------------------------------------------------------------------
# 3. resolve_pseudo_overlay — DB-gated lift vs. honest gap
# ---------------------------------------------------------------------------


def test_resolve_lifts_onto_container_overlay_family():
    """sgs/container declares the overlay family — a gradient ::before lifts."""
    content_gap_collector.clear()
    pseudo_decls = {
        "before": {
            "background": "linear-gradient(135deg, #5a28a0 0%, #1464c8 100%)",
            "content": '""',
            "z-index": "0",
        }
    }
    attrs = resolve_pseudo_overlay("sgs/container", pseudo_decls, ".sgs-info-box")
    assert attrs["overlayGradient"] == (
        "linear-gradient(135deg, #5a28a0 0%, #1464c8 100%)"
    )

    # The NON-mappable pseudo props (content, z-index) still got an honest
    # gap recorded on sgs/container — mapping `background` doesn't excuse the rest.
    gapped_props = _gapped_props(content_gap_collector.flush())
    assert "content" in gapped_props
    assert "z-index" in gapped_props
    assert "background" not in gapped_props, "mapped property must NOT also gap"


def test_resolve_solid_colour_onto_container():
    pseudo_decls = {"before": {"background": "rgba(10, 10, 10, 0.6)"}}
    attrs = resolve_pseudo_overlay("sgs/container", pseudo_decls, ".sgs-info-box")
    assert attrs["backgroundOverlayColour"] == "rgba(10, 10, 10, 0.6)"
    # D581: no separate opacity attr — the 0.6 alpha rides in the colour.
    assert "backgroundOverlayOpacity" not in attrs


def test_resolve_honest_gap_when_block_has_no_overlay_family():
    """The rt-pseudo-before fixture's premise: sgs/info-box has NO overlay attr
    family at all → every pseudo decl (including background) is an honest gap,
    never silently dropped, never lifted onto a non-existent attr."""
    content_gap_collector.clear()
    pseudo_decls = {
        "before": {
            "background": "linear-gradient(135deg, rgba(90,40,160,0.55) 0%, rgba(20,100,200,0.35) 100%)",
            "content": '""',
            "position": "absolute",
            "inset": "0",
            "z-index": "0",
            "pointer-events": "none",
        }
    }
    attrs = resolve_pseudo_overlay("sgs/info-box", pseudo_decls, ".sgs-info-box")
    assert attrs == {}, "sgs/info-box has no overlay attrs — nothing should be lifted"

    gaps = content_gap_collector.flush()
    gapped_props = _gapped_props(gaps)
    # Every pseudo property (including background) must be gapped — none silently dropped.
    assert gapped_props == {
        "background", "content", "position", "inset", "z-index", "pointer-events",
    }
    # No inline-style cheat text anywhere in the recorded detail strings.
    for g in gaps:
        assert 'style="' not in g["detail"]


# ---------------------------------------------------------------------------
# 4. Integration — through _build_css_attrs (the real converter dispatch)
# ---------------------------------------------------------------------------


def _container_recognition() -> Recognition:
    return Recognition(
        kind="named",
        slug="sgs/container",
        container_kind="content",
        delegates_content=0,
    )


def _info_box_recognition() -> Recognition:
    return Recognition(
        kind="named",
        slug="sgs/info-box",
        container_kind="content",
        delegates_content=0,
    )


@pytest.mark.skipif(
    not db_lookup.SGS_DB.exists(), reason="requires the live sgs-framework.db"
)
def test_build_css_attrs_lifts_gradient_overlay_for_container():
    section = _info_box_section()
    merged = _build_css_attrs(_container_recognition(), section, _INFO_BOX_RULES, is_root=True)
    assert merged.get("overlayGradient") == (
        "linear-gradient(135deg, rgba(90, 40, 160, 0.55) 0%, "
        "rgba(20, 100, 200, 0.35) 100%)"
    )
    # No inline style carrying the overlay — attrs only (R-22-6).
    assert "style" not in merged or "gradient" not in str(merged.get("style", ""))


@pytest.mark.skipif(
    not db_lookup.SGS_DB.exists(), reason="requires the live sgs-framework.db"
)
def test_build_css_attrs_gaps_pseudo_for_info_box():
    """The rt-pseudo-before regression, exercised through the real dispatch
    (_build_css_attrs) rather than resolve_pseudo_overlay directly — proves
    the wiring in css_pass.py actually fires on the live call path."""
    content_gap_collector.clear()
    section = _info_box_section()
    merged = _build_css_attrs(_info_box_recognition(), section, _INFO_BOX_RULES, is_root=True)
    # sgs/info-box has no overlay attrs — nothing overlay-shaped in merged.
    assert "overlayGradient" not in merged
    assert "backgroundOverlayColour" not in merged

    gapped_props = _gapped_props(content_gap_collector.flush())
    assert "background" in gapped_props
    assert "content" in gapped_props


# ---------------------------------------------------------------------------
# Edge cases from the B1 /qc-council pass (keyword directions, bad angles,
# non-colour stops) — each must fail SAFE (map correctly, or None → honest gap),
# never crash and never write a non-colour value into an overlay attr.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "value",
    [
        # Every one of these is carried through VERBATIM (D643). The old
        # expectations here were angle/from/to decompositions — keyword
        # directions converted to degrees, stop positions stripped, mid-stops
        # discarded. None of that happens now, and none of it needs to: the
        # renderer receives the draft's own CSS unchanged.
        "linear-gradient(to right, #5a28a0, #1464c8)",
        "linear-gradient(to bottom right, #000, #fff)",
        "linear-gradient(-45deg, #000, #fff)",
        "linear-gradient(135deg, rgba(0,0,0,.5) 0%, rgba(255,255,255,.2) 100%)",
        "linear-gradient(45deg, #000 25% 50%, #fff)",
        "linear-gradient(#000, #fff)",
    ],
)
def test_parse_gradient_edge_cases_map_verbatim(value):
    assert parse_overlay_background(value) == {"overlayGradient": value}


@pytest.mark.parametrize(
    "value",
    [
        "linear-gradient(. deg, #000, #fff)",   # lone-dot angle — must NOT crash
        "linear-gradient(.. deg, #000, #fff)",  # double-dot angle — must NOT crash
        "linear-gradient(to right, 50%, #fff)",  # first "stop" not a colour
        "linear-gradient(90deg, #000)",          # single stop
        "url(bg.png)",                            # image
        "none",
        "",
    ],
)
def test_parse_gradient_unmappable_returns_none(value):
    # None → the caller records an honest content gap, never a garbage
    # overlay attr (Spec 31 §3.A step 8).
    assert parse_overlay_background(value) is None
