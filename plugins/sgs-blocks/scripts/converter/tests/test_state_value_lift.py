"""2026-07-22 — coupled UN-EXCLUDE + HOVER-LIFT for transform/filter/top/left
(Spec 31 §3.A steps 2, 4a, 8; R-31-1; R-31-9).

Guards:
  1. `.sgs-button:hover{transform:scale(1.05)}` lifts to `scaleHover:1.05` on
     sgs/button (direct css_property='transform' + css_state='hover' lookup —
     no un-suffixed base `scale` attr exists, so this exercises the NEW
     `attr_for_state_property` channel, not the old base+Hover-suffix-append
     convention).
  2. `.sgs-card-grid:hover{filter:grayscale(1)}` lifts to
     `grayscaleHover:true` (boolean coercion) on sgs/card-grid.
  3. `sgs-decorative-image` `top`/`left` (NOT state-scoped — a resting
     declaration) lift to `positionY`/`positionX` now that they are
     un-excluded — proves the excluded_properties removal alone was
     sufficient for these two (already-declared attrs, no new seeding).
  4. An anisotropic `scale(1.05, 1.2)` — unequal x/y — is an HONEST GAP
     (this single-number attr cannot represent it), never a wrong value.
  5. `resolve_state_property` returns None (fall-through, not a GAP) for a
     block/property/state combination with no direct-state row — the
     existing base+Hover-suffix-append convention (backgroundColourHover
     etc.) must still work unchanged.
"""
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402

from converter.db import db_lookup  # noqa: E402
from converter.recognition import recognise  # noqa: E402
from converter.services.extraction import build_block_markup  # noqa: E402
from converter.models import GAP, GapOrigin, Write  # noqa: E402
from converter.services.state_value_lift import (  # noqa: E402
    parse_filter_grayscale,
    parse_transform_scale,
    resolve_state_property,
)


# ---------------------------------------------------------------------------
# 1. sgs/button hover scale — the headline case (no base `scale` attr exists).
# ---------------------------------------------------------------------------

_BUTTON_HTML = '<a class="sgs-button" href="/shop">Shop Now</a>'
_BUTTON_RULES = {
    ".sgs-button": {"color": "#ffffff"},
    ".sgs-button:hover": {"transform": "scale(1.05)"},
}


def test_button_hover_scale_lifts_via_direct_state_lookup():
    node = BeautifulSoup(_BUTTON_HTML, "html.parser").find("a")
    rec = recognise(node)
    assert rec.slug == "sgs/button"
    markup = build_block_markup(rec, node, css_rules=_BUTTON_RULES)
    assert '"scaleHover":1.05' in markup, markup
    # Never emitted as the raw CSS function-call string.
    assert "scale(1.05)" not in markup, markup


# ---------------------------------------------------------------------------
# 2. sgs/card-grid hover grayscale — boolean coercion.
# ---------------------------------------------------------------------------

_CARD_GRID_HTML = (
    '<section class="sgs-card-grid">'
    '<div class="sgs-card-grid__inner">'
    '<div class="sgs-card-grid__item"><h3>Card</h3></div>'
    "</div></section>"
)
_CARD_GRID_RULES = {
    ".sgs-card-grid": {"padding": "40px"},
    ".sgs-card-grid:hover": {"filter": "grayscale(1)"},
}


def test_card_grid_hover_grayscale_lifts_as_boolean():
    """RENAMED IN INTENT 2026-08-29 (Bean-ruled). This used to assert that a draft's
    ROOT `:hover{filter:grayscale(1)}` lifted to `grayscaleHover:true`. That lift was a
    MIS-ROUTE, and asserting it made this test guard a defect:

      draft  `.sgs-card-grid:hover{filter:grayscale(1)}`  = colour at rest, GREY on hover
      attr   `grayscaleHover:true` renders (style.css:274,280)
             `.sgs-has-grayscale .__image        {filter:grayscale(100%)}`  GREY at rest
             `.sgs-has-grayscale .__item:hover .__image {filter:grayscale(0%)}`  COLOUR on hover

    Five divergences, not one: wrong element (`__image`, not the root), INVERTED state
    direction, wrong trigger (`__item:hover`, not the root), wrong amount (always 100%,
    any 0-1 lost), and no reduced-motion arm. The old assertion passed because
    `grayscaleHover` had no derived-layer entry at all, so a fallback swallowed the
    declaration; once card-grid declared `states.hover.attrMap {"css:filter":
    "grayscaleHover"}` on its `image` element -- which is TRUE -- the root lookup
    correctly stopped matching and the fallback stopped firing.

    THE DECIDING FACT is the control, not the CSS: the only grayscale control in the
    plugin (`extensions/hover-effects.js:382`) is labelled "Grayscale to colour" and its
    own help text reads "Desaturates images at rest; restores colour on hover." One
    direction. Nothing in the framework offers the draft's direction, so there is no
    honest destination for this declaration to land in. A draft asking for the inverse
    effect must NOT be silently written into an attribute that produces the opposite.

    So this now asserts the ABSENCE of the mis-route. It is a regression guard: if
    `grayscaleHover` ever reappears here, a fallback has started swallowing root-scoped
    filter declarations again.

    NOT YET ASSERTED, deliberately: that the dropped declaration is REPORTED. It is not --
    `resolve_state_property` returns None (fall-through, never a GAP), which is a live
    Rule 4 gap of its own. Tighten this to a gap assertion when that lands; do not weaken
    it back to the old expectation."""
    node = BeautifulSoup(_CARD_GRID_HTML, "html.parser").find("section")
    rec = recognise(node)
    assert rec.slug == "sgs/card-grid"
    markup = build_block_markup(rec, node, css_rules=_CARD_GRID_RULES)
    assert '"grayscaleHover"' not in markup, (
        "A root-scoped filter was written into grayscaleHover, which renders the INVERSE "
        "effect on a child element. Mis-route regression: " + markup
    )
    # Positive control — the fixture's non-filter declaration still transfers, so a
    # passing test above cannot be an artefact of nothing being lifted at all.
    assert '"padding"' in markup, (
        "Nothing lifted from this fixture at all, so the grayscale assertion is vacuous: "
        + markup
    )


# ---------------------------------------------------------------------------
# 3. sgs/decorative-image top/left — resting (no :hover), already-declared
#    attrs — proves the excluded_properties removal ALONE is sufficient here.
# ---------------------------------------------------------------------------

_DECORATIVE_IMAGE_HTML = '<img class="sgs-decorative-image" src="/blob.png" alt="">'
# Bare unitless numbers (matching render.php's own 0-100 percentage-position
# convention, e.g. `$position_x = $attributes['positionX'] ?? 50` — no unit
# companion attr exists for positionX/positionY, so a "20%" value would gap
# on the pre-existing, unrelated missing-Unit-companion branch; unitless is
# the correct wire shape and keeps this fixture scoped to what this session's
# work actually changes — the un-exclude alone).
_DECORATIVE_IMAGE_RULES = {
    ".sgs-decorative-image": {"top": "20", "left": "65"},
}


def test_decorative_image_top_left_lift_after_unexclude():
    """positionX/positionY are now tier objects (block.json: type object,
    default {"desktop": N}) — the converter lifts top/left onto the desktop
    tier, not a flat value."""
    node = BeautifulSoup(_DECORATIVE_IMAGE_HTML, "html.parser").find("img")
    rec = recognise(node)
    assert rec.slug == "sgs/decorative-image"
    markup = build_block_markup(rec, node, css_rules=_DECORATIVE_IMAGE_RULES)
    assert '"positionY":{"desktop":"20"}' in markup, markup
    assert '"positionX":{"desktop":"65"}' in markup, markup


# ---------------------------------------------------------------------------
# 4. Anisotropic scale — honest gap, never a wrong value.
# ---------------------------------------------------------------------------

def test_anisotropic_scale_parses_to_none():
    assert parse_transform_scale("scale(1.05, 1.2)") is None


def test_uniform_scale_parses():
    assert parse_transform_scale("scale(1.05)") == 1.05
    assert parse_transform_scale("scale(1.05, 1.05)") == 1.05


def test_grayscale_percent_normalises_to_0_1():
    assert parse_filter_grayscale("grayscale(100%)") == 1.0
    assert parse_filter_grayscale("grayscale(1)") == 1.0
    assert parse_filter_grayscale("grayscale(0.5)") == 0.5


def test_no_scale_token_parses_to_none():
    assert parse_transform_scale("translateY(10px)") is None
    assert parse_filter_grayscale("blur(4px)") is None


# ---------------------------------------------------------------------------
# 5. attr_for_state_property returns None for an unmatched combination — the
#    ordinary base+Hover-suffix-append convention must be unaffected.
# ---------------------------------------------------------------------------

def test_attr_for_state_property_none_for_unmatched_combo():
    assert db_lookup.attr_for_state_property("sgs/button", "transform", "Hover") == "scaleHover"
    # sgs/button.colourTextHover ALREADY carries css_property='color' +
    # css_state='hover' (a pre-existing direct-state row, independent of this
    # session's work) — a genuinely unmatched (block, property) combination
    # is the correct negative case instead.
    assert db_lookup.attr_for_state_property("sgs/button", "text-decoration", "Hover") is None
    assert db_lookup.attr_for_state_property("sgs/nonexistent-block", "transform", "Hover") is None


def test_card_grid_scale_vs_image_zoom_hover_disambiguated_by_css_element():
    """sgs/card-grid.scaleHover (root/card scale) and .imageZoomHover (inner
    image zoom) BOTH declare css_property='transform' + css_state='hover' —
    without a css_element disambiguator these collide (F6 Check #1/#8 caught
    this live, 2026-07-22: db-consistency/run.py raised AmbiguousLayerAttrError
    candidates for card-grid/gallery/team-member). imageZoomHover carries
    css_element='image' (a per-item inner-element scope, OUTSIDE the root/
    self domain attr_for_state_property resolves for), so the root-scoped
    lookup returns ONLY scaleHover — no ambiguity, no silent mis-pick."""
    assert db_lookup.attr_for_state_property("sgs/card-grid", "transform", "Hover") == "scaleHover"
    assert db_lookup.attr_for_state_property("sgs/gallery", "transform", "Hover") == "scaleHover"
    assert db_lookup.attr_for_state_property("sgs/team-member", "transform", "Hover") == "scaleHover"


def test_text_decoration_hover_still_uses_suffix_append_convention():
    """sgs/button's textDecorationHover has css_property=NULL AND css_state=NULL
    (unlike colourTextHover, which already has direct css_property+css_state
    rows pre-dating this session) — the direct-state lookup must NOT match it;
    it relies on the pre-existing base (`textDecoration`, css_property=
    'text-decoration', css_state=NULL) + Hover-suffix-append convention
    instead (proven by test_hover_state_lift.py's announcement-bar case)."""
    assert db_lookup.attr_for_state_property("sgs/button", "text-decoration", "Hover") is None


# ---------------------------------------------------------------------------
# Edge cases from the B3 /qc-council pass — each must fail SAFE: parse the real
# CSS shape, or return None (honest gap). Never a wrong/invalid value.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "value,expected",
    [
        ("scale(1.05)", 1.05),
        ("scale(1.05, 1.05)", 1.05),          # equal x/y -> one value
        ("scale(.5)", 0.5),                    # LEADING-DOT: valid CSS, must not drop
        ("scale(2.)", 2.0),                    # trailing-dot form
        ("translateX(10px) scale(1.05)", 1.05),  # scale inside a transform LIST
        ("scale(1.05) !important", 1.05),       # !important stripped before parse
    ],
)
def test_parse_transform_scale_valid_shapes(value, expected):
    assert parse_transform_scale(value) == pytest.approx(expected)


@pytest.mark.parametrize(
    "value",
    [
        "rescale(1)",          # substring: must NOT match scale(
        "scaleX(1.2)",         # axis-specific: not a uniform scale
        "scale3d(1.1, 1.1, 1)",
        "scale(1.05, 1.2)",    # anisotropic -> cannot represent, honest gap
        "translateY(10px)",    # no scale token at all
        "none",
        "var(--x)",
        "",
    ],
)
def test_parse_transform_scale_unmappable_returns_none(value):
    assert parse_transform_scale(value) is None


@pytest.mark.parametrize(
    "value,expected",
    [
        ("grayscale(1)", 1.0),
        ("grayscale(0)", 0.0),
        ("grayscale(100%)", 1.0),
        ("grayscale(50%)", 0.5),
        ("blur(4px) grayscale(1)", 1.0),   # grayscale inside a filter LIST
        ("grayscale(.5)", 0.5),            # leading dot
    ],
)
def test_parse_filter_grayscale_valid_shapes(value, expected):
    assert parse_filter_grayscale(value) == pytest.approx(expected)


@pytest.mark.parametrize(
    "value",
    [
        "grayscale(1.5)",   # out of range -> gap, never truthy-coerce to true
        "grayscale(150%)",  # out of range
        "grayscale()",      # no arg
        "blur(4px)",        # no grayscale token
        "",
    ],
)
def test_parse_filter_grayscale_unmappable_returns_none(value):
    assert parse_filter_grayscale(value) is None


def test_module_is_inert_for_properties_it_does_not_own(monkeypatch):
    """ORDERING REGRESSION GUARD (2026-07-22 council follow-up).

    ~70 existing `*Hover` companions (backgroundColourHover, textColourHover,
    shadowHover, ...) DO carry css_property + css_state='hover' in the live DB.
    This module is scoped to transform/filter ONLY and must be INERT for every
    other property — returning None so the ordinary attr_resolve +
    tier_state_suffix chain handles it unchanged.

    Critically this must hold even at a NON-device-tier breakpoint: if the A4
    gate were ordered before the property gate, a non-device-tier hover
    `background-color` would GAP here instead of being captured as a
    ResidualBand -> sgsCustomCss (Spec 31 §13.4 FR-31-5.2 — "never snapped,
    never dropped"). That would silently destroy the D289/D303 passthrough.
    """
    class _D:
        def __init__(self, prop, tier, is_device_tier):
            self.property = prop
            self.value = "#ff0000"
            self.tier = tier
            self.state = "hover"
            self.is_device_tier = is_device_tier

    class _Ctx:
        block_slug = "sgs/button"

    # Device-tier hover on an unowned property -> fall through (None)
    assert resolve_state_property(_D("background-color", "Base", True), _Ctx()) is None
    # NON-device-tier hover on an unowned property -> STILL fall through (None),
    # never a GAP. This is the assertion that fails if the gates are reordered.
    assert resolve_state_property(_D("background-color", "Other:600", False), _Ctx()) is None
    assert resolve_state_property(_D("box-shadow", "Other:600", False), _Ctx()) is None


# ---------------------------------------------------------------------------
# 5. A FRACTIONAL amount on a BOOLEAN destination gaps instead of writing.
#
# The live Rule 4 silent drop this closes: `_coerce_for_attr_type` returns
# `parsed > 0` for a boolean attr, so `filter: grayscale(0.4)` became `True`
# and RENDERED AS 100%. It was emitted as a Write, so no gap row was produced —
# the draft's 40% silently became 100% and the gap ledger stayed clean while the
# clone was wrong.
#
# sgs/info-box is the right target: its `grayscaleHover` is boolean AND
# root-scoped (css_element IS NULL), so the direct-state lookup reaches it.
# card-grid's routes to its `image` element, which is why test 2 above asserts
# the ABSENCE of a root-scoped lift there.
# ---------------------------------------------------------------------------

_INFO_BOX_HTML = (
    '<div class="sgs-info-box">'
    '<h3 class="sgs-info-box__title">Title</h3>'
    '<p class="sgs-info-box__text">Body copy.</p>'
    "</div>"
)


def _info_box_markup(filter_value: str) -> str:
    node = BeautifulSoup(_INFO_BOX_HTML, "html.parser").find("div")
    rec = recognise(node)
    assert rec.slug == "sgs/info-box", rec.slug
    return build_block_markup(
        rec,
        node,
        css_rules={
            ".sgs-info-box": {"padding": "24px"},
            ".sgs-info-box:hover": {"filter": filter_value},
        },
    )


def test_exact_grayscale_still_lifts_as_boolean():
    """POSITIVE CONTROL. grayscale(1) is exactly representable in a boolean and
    MUST still write. Without this, the fractional assertion below could pass
    simply because the whole lift path had stopped working."""
    markup = _info_box_markup("grayscale(1)")
    assert '"grayscaleHover":true' in markup, markup


def test_fractional_grayscale_gaps_rather_than_rendering_as_100_percent():
    """A boolean can only say on or off. 0.4 is neither, so it must be REPORTED,
    not silently promoted to 100% (Spec 31: an un-representable value emits an
    honest NO_DESTINATION gap, never a silent drop)."""
    markup = _info_box_markup("grayscale(0.4)")

    assert '"grayscaleHover"' not in markup, (
        "A fractional grayscale was written into a boolean attr. It renders as "
        "100%, silently changing the draft's 40%. Expected an honest gap.\n" + markup
    )

    # POSITIVE CONTROL on the same fixture: the sibling padding must still have
    # transferred. Without this the assertion above would also pass if nothing
    # lifted from this fixture at all.
    assert '"padding"' in markup, (
        "Nothing lifted from this fixture, so the grayscale assertion is vacuous:\n"
        + markup
    )

def test_fractional_grayscale_returns_a_tracked_gap_not_a_silent_fallthrough():
    """The drop must be TRACKED, which is the whole point of the change.

    Asserted at the resolver, which is the layer that actually owns building
    the GAP object — gap_writer's own docstring says the slice's ledger IS
    the record. A test asserting against something this layer doesn't own
    would be brittle by construction.

    Returning None instead of a GAP would be the silent drop: None means "not
    mine, fall through", and the ordinary chain would carry it to a
    ResidualBand/sgsCustomCss passthrough with nothing recording the loss.
    """

    class _D:
        property = "filter"
        tier = "Base"
        state = "hover"
        is_device_tier = True

        def __init__(self, value):
            self.value = value

    class _Ctx:
        block_slug = "sgs/info-box"
        container_kind = "content"  # sgs/info-box is a content-KIND composite.

        def __init__(self):
            # validate() does a real attr-existence lookup, so this needs the
            # real DB rather than a stub — the point is to prove the resolver
            # behaves against the live schema, not against a mock of it.
            self.conn = sqlite3.connect(db_lookup.SGS_DB)

    exact = resolve_state_property(_D("grayscale(1)"), _Ctx())
    assert isinstance(exact, Write), (
        f"POSITIVE CONTROL FAILED: an exactly-representable value must still "
        f"write, got {exact!r}"
    )
    assert exact.value is True, exact

    fractional = resolve_state_property(_D("grayscale(0.4)"), _Ctx())
    assert isinstance(fractional, GAP), (
        f"A fractional value on a boolean attr must be a TRACKED gap, not "
        f"{'a silent fall-through (None)' if fractional is None else 'a write'}: "
        f"{fractional!r}"
    )
    assert fractional.origin is GapOrigin.NO_DESTINATION, fractional
    assert "0.4" in fractional.detail, fractional.detail
