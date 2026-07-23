"""Per-element (non-root) :hover transform/filter state lift — Spec 31 §3.A
step 4a per-CHILD extension (R-31-9 universal).

The base-domain ``state_value_lift`` / ``attr_for_state_property`` resolves a
:hover transform/filter ONLY on the block's own root/self box (``_BASE_ELEMENTS``).
Five per-child state attrs were therefore stranded and dropped their hover on a
clone: ``sgs/post-grid.scaleHover`` (css_element='card') and ``imageZoomHover``
(css_element='image') on card-grid / gallery / team-member / post-grid.

Guards:
  1. ``per_element_state_attrs`` returns EXACTLY the 5 stranded per-child state
     attrs — no base-domain scaleHover/grayscaleHover leaks in (they are
     css_element root/self and stay with the base resolver).
  2. ``.sgs-post-grid__card:hover{transform:scale(1.04)}`` lifts to
     ``scaleHover:1.04`` on sgs/post-grid (string attr_type — bare numeric).
  3. ``.sgs-card-grid__image:hover{transform:scale(1.1)}`` lifts to
     ``imageZoomHover:True`` on sgs/card-grid (boolean attr_type — presence coerce).
  4. A block with no per-child state attr (sgs/button — its scaleHover is
     root/self) gets ``{}`` — universal no-op, no false emit.
  5. An absent draft element emits no key (honest gap, never a wrong value).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from bs4 import BeautifulSoup  # noqa: E402

from converter.db import db_lookup  # noqa: E402
from converter.resolvers.styling_content import lift_per_element_state  # noqa: E402


def _node(html: str):
    return BeautifulSoup(html, "html.parser")


def test_per_element_state_attrs_transform_filter_subset_is_the_five_stranded():
    """``per_element_state_attrs`` is intentionally property-AGNOSTIC (it also
    returns per-child COLOUR/box-shadow hover attrs, which the caller's parser
    gate skips — those are lift_styling_content's job). The transform/filter
    subset — the attrs THIS mechanism actually routes — must be EXACTLY the 5
    stranded per-child attrs, with post-grid.scaleHover now clean
    (transform/card/hover, NOT the old 'background-color,transform'/NULL smell)."""
    from converter.services.state_value_lift import _STATE_VALUE_PARSERS

    routed = set()
    for slug in ("sgs/post-grid", "sgs/card-grid", "sgs/gallery",
                 "sgs/team-member", "sgs/button", "sgs/info-box"):
        for sa in db_lookup.per_element_state_attrs(slug):
            if sa.css_property in _STATE_VALUE_PARSERS:
                routed.add((slug, sa.attr_name, sa.css_property,
                            sa.css_element, sa.css_state))
    assert routed == {
        ("sgs/post-grid", "scaleHover", "transform", "card", "hover"),
        ("sgs/post-grid", "imageZoomHover", "transform", "image", "hover"),
        ("sgs/card-grid", "imageZoomHover", "transform", "image", "hover"),
        ("sgs/gallery", "imageZoomHover", "transform", "image", "hover"),
        ("sgs/team-member", "imageZoomHover", "transform", "image", "hover"),
    }, routed


def test_post_grid_scale_hover_lands_on_clone():
    """The draft's per-item card :hover scale routes to scaleHover (was dropped)."""
    node = _node(
        '<section class="sgs-post-grid">'
        '<div class="sgs-post-grid__card"><h3>Post</h3></div>'
        "</section>"
    )
    css_rules = {".sgs-post-grid__card:hover": {"transform": "scale(1.04)"}}
    lifted = lift_per_element_state(node, "sgs/post-grid", css_rules)
    assert lifted.get("scaleHover") == 1.04, lifted


def test_card_grid_image_zoom_hover_boolean_coerce():
    node = _node(
        '<section class="sgs-card-grid">'
        '<img class="sgs-card-grid__image" src="x.jpg" alt="x" />'
        "</section>"
    )
    css_rules = {".sgs-card-grid__image:hover": {"transform": "scale(1.1)"}}
    lifted = lift_per_element_state(node, "sgs/card-grid", css_rules)
    assert lifted.get("imageZoomHover") is True, lifted


def test_no_per_child_state_attr_is_a_noop():
    """sgs/button.scaleHover is root/self — NOT a per-child attr — so this pass
    must never touch it (the base state_value_lift owns it)."""
    node = _node('<a class="sgs-button">Go</a>')
    css_rules = {".sgs-button:hover": {"transform": "scale(1.05)"}}
    assert lift_per_element_state(node, "sgs/button", css_rules) == {}


def test_absent_element_emits_no_key():
    node = _node('<section class="sgs-post-grid"><h3>No card here</h3></section>')
    css_rules = {".sgs-post-grid__card:hover": {"transform": "scale(1.04)"}}
    assert lift_per_element_state(node, "sgs/post-grid", css_rules) == {}
