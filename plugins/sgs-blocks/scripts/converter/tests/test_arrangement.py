"""test_arrangement.py — Spec 31 §2.3/§2.4/§2.5 arrangement layer + grid-item descent.

Covers the WS-A §2 layer-extraction build:
  * arrangement.carries_arrangement (§2.3 CSS-signature detection)
  * arrangement.lift_uniform_grid_item_css (§2.5 per-property uniform gridItem* fold)
  * the §2.4 recursive fold in extraction._descend_container_children — the brand
    `__content` regression (a slug-None wrapper grid item must become its OWN
    sgs/container, NOT be flattened up into the section grid — the D254 bug) + the
    sole-pass-through fold (an `__inner` band folds its children up).

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_arrangement.py -q --import-mode=importlib
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.context import ScalarLift
from converter.recognition import recognise_section
from converter.services import arrangement
from converter.services.extraction import build_block_markup
from converter.db import db_lookup

_CONTAINER = db_lookup.container_default_slug()
_CONTAINER_OPEN = "<!-- wp:sgs/container"


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# -- carries_arrangement (§2.3) -----------------------------------------------

def test_carries_arrangement_display_grid():
    assert arrangement.carries_arrangement(_node('<div style="display:grid"></div>'), {}) is True


def test_carries_arrangement_display_flex():
    assert arrangement.carries_arrangement(_node('<div style="display:flex"></div>'), {}) is True


def test_carries_arrangement_grid_template_columns():
    node = _node('<div style="grid-template-columns:1fr 1fr"></div>')
    assert arrangement.carries_arrangement(node, {}) is True


def test_carries_arrangement_false_for_plain_content_box():
    node = _node('<div style="padding:20px;color:red;max-width:800px"></div>')
    assert arrangement.carries_arrangement(node, {}) is False


# -- layout_attrs (§2.3 ARRANGEMENT -> layoutType trigger) ---------------------

def test_layout_attrs_grid():
    node = _node('<div style="display:grid;grid-template-columns:1fr 1fr"></div>')
    assert arrangement.layout_attrs(node, {}) == {"layout": "grid"}


def test_layout_attrs_flex_with_direction():
    node = _node('<div style="display:flex;flex-direction:column"></div>')
    assert arrangement.layout_attrs(node, {}) == {"layout": "flex", "flexDirection": "column"}


def test_layout_attrs_grid_template_only_is_grid():
    node = _node('<div style="grid-template-columns:1fr 1fr 1fr"></div>')
    assert arrangement.layout_attrs(node, {}) == {"layout": "grid"}


def test_layout_attrs_empty_for_plain_box():
    assert arrangement.layout_attrs(_node('<div style="padding:10px"></div>'), {}) == {}


def test_layout_grid_lands_on_a_nested_container_so_it_is_not_inert():
    """Regression for the nested-grid stacking bug (gift/ingredients pattern): a grid
    wrapper that is a SIBLING of a heading recurses to its OWN sgs/container AND emits
    layout:'grid' — without the layout attr the wrapper renders display:block and
    gridTemplateColumns is inert (the items stack)."""
    html = (
        '<section class="sgs-x">'
        '<h2 class="sgs-x__heading">Heading</h2>'
        '<div class="sgs-x__cards" style="display:grid;grid-template-columns:1fr 1fr">'
        '<div class="sgs-info-box"><h4>A</h4></div>'
        '<div class="sgs-info-box"><h4>B</h4></div></div></section>'
    )
    sec = _node(html)
    markup = build_block_markup(recognise_section(sec), sec, media_map={},
                                css_rules={}, is_root=True)
    assert '"layout":"grid"' in markup  # the nested __cards container renders as a grid


def test_carries_arrangement_via_css_rules_signature_not_class_name():
    """Detected by CSS signature from css_rules, never the class name (R-31-2 / D85)."""
    node = _node('<section class="sgs-brand"></section>')
    css = {".sgs-brand": {"display": "grid", "grid-template-columns": "1fr 1fr", "gap": "32px"}}
    assert arrangement.carries_arrangement(node, css) is True
    # same node, no arranging CSS -> not the arrangement layer (proves it's the
    # signature, not the sgs-brand class name, that decides).
    assert arrangement.carries_arrangement(node, {}) is False


# -- lift_uniform_grid_item_css (§2.5) ----------------------------------------

def test_uniform_fold_noop_under_two_items():
    assert arrangement.lift_uniform_grid_item_css(
        [_node('<div style="padding:10px"></div>')], {}, _CONTAINER) == []


def test_uniform_fold_skips_property_that_differs():
    """A property that differs on even one item is NOT folded (stays on the child)."""
    items = [_node('<div style="padding:10px"></div>'), _node('<div style="padding:20px"></div>')]
    lifts = arrangement.lift_uniform_grid_item_css(items, {}, _CONTAINER)
    # padding is the only declared prop and it differs -> zero lifts.
    assert lifts == []


def test_uniform_fold_lifts_identical_property_value():
    """A property identical across every item folds to a gridItem* ScalarLift."""
    items = [_node('<div style="padding:10px"></div>'), _node('<div style="padding:10px"></div>')]
    lifts = arrangement.lift_uniform_grid_item_css(items, {}, _CONTAINER)
    # Every lift is a ScalarLift carrying the uniform value; the destination attr is
    # DB-resolved (attr_for_layer_property GRID) — no hardcoded property list.
    assert all(isinstance(x, ScalarLift) for x in lifts)
    assert all(x.value == "10px" for x in lifts)


# -- §2.4 fold: brand __content becomes its OWN container (the D254 regression) --

_BRAND_HTML = """<section class="sgs-brand">
  <div class="sgs-brand__content">
    <h2 class="sgs-brand__headline">A story</h2>
    <a class="sgs-brand__cta sgs-button sgs-button--ghost" href="/about/">Read</a>
  </div>
  <img class="sgs-brand__image" src="x.jpg" alt="a mum">
</section>"""


def test_brand_content_wrapper_is_own_container_not_flattened():
    """§2.4: the slug-None `__content` wrapper (sibling of `__image`) becomes its OWN
    sgs/container carrying heading+button — NOT flattened up (the D254 blind-descend
    bug that made the 2-col grid see 4 children). Two container opens: outer + __content.
    """
    brand = _node(_BRAND_HTML)
    markup = build_block_markup(recognise_section(brand), brand, media_map={}, css_rules={}, is_root=True)
    # outer container + the nested __content container = exactly 2 container opens.
    assert markup.count(_CONTAINER_OPEN) == 2
    # __image lands as its own media grid item (recognised sgs/media atomic).
    assert "wp:sgs/media" in markup
    # the heading + button are present (recursed inside the nested __content container).
    assert "wp:sgs/heading" in markup
    assert "wp:sgs/button" in markup
    # structural: the nested container opens BEFORE the heading (heading is inside it),
    # and the media open is OUTSIDE the nested container (a sibling grid item).
    second_container = markup.index(_CONTAINER_OPEN, markup.index(_CONTAINER_OPEN) + 1)
    assert second_container < markup.index("wp:sgs/heading")


# -- §2.4 sole pass-through fold: an `__inner` band folds its children up --------

_BAND_HTML = """<section class="sgs-ingredients-section">
  <div class="sgs-ingredients-section__inner">
    <h2>Ingredients</h2>
    <p class="sgs-section-heading__intro">Intro text</p>
  </div>
</section>"""


def test_sole_passthrough_inner_folds_children_up():
    """§2.4: a section with a SINGLE slug-None pass-through `__inner` folds — its
    children become the section container's children (NOT wrapped in a second nested
    container). Exactly ONE container open; the heading is a direct child.
    """
    sec = _node(_BAND_HTML)
    markup = build_block_markup(recognise_section(sec), sec, media_map={}, css_rules={}, is_root=True)
    assert markup.count(_CONTAINER_OPEN) == 1  # __inner folded, no nested container
    assert "wp:sgs/heading" in markup


# -- §2.5 heading-beside-grid: a heading sibling of a nested grid is CONTENT ----

_GIFT_HTML = """<section class="sgs-gift-section">
  <h2 class="sgs-gift-section__heading">A gift</h2>
  <div class="sgs-gift-section__cards" style="display:grid;grid-template-columns:1fr 1fr">
    <div class="sgs-info-box"><h4>One</h4></div>
    <div class="sgs-info-box"><h4>Two</h4></div>
  </div>
</section>"""


def test_heading_beside_grid_is_content_not_swept_into_grid():
    """§2.5 line 139 (Rater-2 invariant lock): a heading that is a SIBLING of a nested
    grid (`__cards`) is CONTENT of the OUTER container, emitted as its own block — never
    swept into the grid. The grid is a separate nested own-container.
    """
    sec = _node(_GIFT_HTML)
    markup = build_block_markup(recognise_section(sec), sec, media_map={}, css_rules={}, is_root=True)
    # heading present as its own block at the outer level.
    assert "wp:sgs/heading" in markup
    # the __cards grid is its OWN nested container (outer + __cards = 2 container opens),
    # and the heading opens BEFORE the nested grid container (it's a sibling, not inside).
    assert markup.count(_CONTAINER_OPEN) >= 2
    assert markup.index("wp:sgs/heading") < markup.index(_CONTAINER_OPEN, markup.index(_CONTAINER_OPEN) + 1)


# -- Finding-1 regression: uniform gridItem* fold uses setdefault (CSS pass wins) --

def test_uniform_grid_item_fold_does_not_overwrite_css_pass_value():
    """QC council Finding 1: a gridItem* value already set by the CSS pass (css_attrs)
    must NOT be overwritten by the uniform grid-item fold ScalarLift — mirror the frozen
    `_lift_uniform_grid_item_css` setdefault contract (CSS pass / earlier path wins).
    Content lifts still overwrite (they never target gridItem*).

    Uses `gridItemShadow` (still a flat SCALAR gridItem* attr after the A1 box-object
    migration, 2026-07-26 — gridItemPadding/gridItemBorderRadius became object attrs;
    box-shadow/background-color/color stayed scalar) so this setdefault-precedence
    assertion stays valid regardless of the box-family fork in
    `arrangement.lift_uniform_grid_item_css` / `resolvers/grid.py`.
    """
    from converter.context import Recognition, ScalarLift as _SL
    import converter.services.extraction as _ext

    # A recognised container whose CSS pass sets gridItemShadow='99px'; a fold ScalarLift
    # then tries to set gridItemShadow='10px'. setdefault => the CSS-pass '99px' wins.
    rec = Recognition(kind="named", slug=_CONTAINER, container_kind="", delegates_content=1)
    node = _node('<section class="sgs-x"></section>')

    _orig_css = _ext._build_css_attrs
    _orig_extract = _ext.extract_content
    try:
        _ext._build_css_attrs = lambda *a, **k: {"gridItemShadow": "99px"}
        _ext.extract_content = lambda *a, **k: [_SL(attr="gridItemShadow", value="10px"),
                                                _SL(attr="quote", value="hi")]
        markup = _ext.build_block_markup(rec, node, media_map={}, css_rules={}, is_root=True)
    finally:
        _ext._build_css_attrs = _orig_css
        _ext.extract_content = _orig_extract

    assert '"gridItemShadow":"99px"' in markup   # CSS pass won (setdefault)
    assert '"gridItemShadow":"10px"' not in markup
    assert '"quote":"hi"' in markup               # content lift still applied


# -- Bug (d): an out-of-enum `layout` value gaps instead of silently coercing ----
#
# `layout_attrs` derives its value from CSS SIGNATURE alone (display:grid/flex) — it
# has no idea what enum the RESOLVED block declares for that attr name. sgs/gallery
# reuses the `layout` attr name for a display-MODE enum
# (["grid", "masonry", "carousel"], seeded live in the DB — verified via sgs-db.py
# 2026-08-27) that does not include "flex". Without a validate() gate, a gallery
# section whose OWN CSS is display:flex would have "layout":"flex" written straight
# through — WP's schema validation then coerces the out-of-enum value to the enum's
# first member ("grid") at render time, SILENTLY (the exact testimonial-slider
# collapse-to-width-0 shape the brief names). sgs/hero is the positive control: its
# `layout` enum is the wrapper-mirror shape (["", "flex", "stack", "grid"], seeded
# this task from its own block.json `enum` declaration), so the SAME CSS signature
# on sgs/hero must still write "layout":"flex" — the gate must not become a
# blanket-reject.


def test_layout_attr_out_of_enum_value_gaps_not_coerced():
    """sgs/gallery's `layout` enum (["grid","masonry","carousel"]) does not contain
    "flex" — a display:flex signature must GAP (assembly.py step 3b's validate()
    call), never write the invalid value for WP to silently coerce."""
    from converter.context import Recognition
    import converter.services.extraction as _ext

    rec = Recognition(kind="named", slug="sgs/gallery", container_kind="layout",
                       delegates_content=1)
    node = _node('<section style="display:flex"></section>')

    _orig_css = _ext._build_css_attrs
    _orig_extract = _ext.extract_content
    try:
        _ext._build_css_attrs = lambda *a, **k: {}
        _ext.extract_content = lambda *a, **k: []
        markup = _ext.build_block_markup(rec, node, media_map={}, css_rules={}, is_root=True)
    finally:
        _ext._build_css_attrs = _orig_css
        _ext.extract_content = _orig_extract

    assert '"layout"' not in markup           # gapped — never written
    assert '"layout":"flex"' not in markup     # never the invalid value
    assert '"layout":"grid"' not in markup     # never silently coerced either


def test_layout_attr_valid_enum_value_still_writes_positive_control():
    """Positive control: sgs/hero's `layout` enum DOES contain "flex" — the SAME
    display:flex signature must still write "layout":"flex" through the validate()
    gate (proves the gate isn't a blanket-reject that would break every container-
    mirroring composite)."""
    from converter.context import Recognition
    import converter.services.extraction as _ext

    rec = Recognition(kind="named", slug="sgs/hero", container_kind="section",
                       delegates_content=1)
    node = _node('<section style="display:flex"></section>')

    _orig_css = _ext._build_css_attrs
    _orig_extract = _ext.extract_content
    try:
        _ext._build_css_attrs = lambda *a, **k: {}
        _ext.extract_content = lambda *a, **k: []
        markup = _ext.build_block_markup(rec, node, media_map={}, css_rules={}, is_root=True)
    finally:
        _ext._build_css_attrs = _orig_css
        _ext.extract_content = _orig_extract

    assert '"layout":"flex"' in markup


def test_uniform_grid_item_fold_skips_box_family_attrs():
    """A1 migration (2026-07-26): `lift_uniform_grid_item_css` must SKIP any property
    whose destination attr is box-family-gated (gridItemPadding/gridItemBorderRadius
    are now {side}/{corner} object attrs) rather than emit a flat ScalarLift that
    would collide with the object shape at the extraction.py merge. Uses a fake DB
    lookup so the test doesn't depend on the live sgs-framework.db seed state.
    """
    class _FakeDb:
        @staticmethod
        def attr_for_layer_property(_slug, _layer, prop):
            return {"padding": "gridItemPadding", "box-shadow": "gridItemShadow"}.get(prop)

        @staticmethod
        def box_family_for(_slug, attr):
            return "gridItemPadding" if attr == "gridItemPadding" else None

    node_html = '<div class="i" style="padding:10px;box-shadow:0 0 1px #000;"></div>'
    items = [_node(node_html), _node(node_html)]

    _orig_db = arrangement.db_lookup
    try:
        arrangement.db_lookup = _FakeDb
        lifts = arrangement.lift_uniform_grid_item_css(items, css_rules={}, container_slug=_CONTAINER)
    finally:
        arrangement.db_lookup = _orig_db

    attrs = {lift.attr for lift in lifts}
    assert "gridItemPadding" not in attrs   # box-family-gated — skipped, not a flat ScalarLift
    assert "gridItemShadow" in attrs        # still-scalar prop — folds as before
