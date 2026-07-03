"""test_band_fold.py — §2.4 / FR-31-5.3 interior band-CSS fold (universal).

Regression locks for the L2 band-fold fix (2026-07-03):

Root cause proven on the real Mama's draft (STOP-43): a COMPOSITE (trust-bar) routes
its content through run_mechanism_array / run_mechanism_a — NEITHER the root CSS pass
(is_root=OUTER, sees only the root) NOR the content mechanisms fold its sole pass-through
`__inner` band, so the band's CSS (contentWidth / gap / text-align) silently DROPPED. The
default-container path (_descend_container_children) folded only `max-width`.

Fix: ONE fold mechanism (route_interior_css_to_parent_slot, the FR-31-5.3 router) applied
in BOTH the default-container fold AND a new build_block_markup step-3c for composites,
with a shared _sole_passthrough_child detector (R-31-9). max-width -> contentWidth (with
co-declared var() resolution), gap, padding, and INHERITABLE text-align -> the block's
WP-native textAlign support (cascades, child-overrideable).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_band_fold.py -q --import-mode=importlib
"""
from __future__ import annotations

import re
import json

from bs4 import BeautifulSoup

from converter.recognition import recognise_section
from converter.services.extraction import build_block_markup


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def _root_attrs(markup: str) -> dict:
    """Parse the JSON attrs of the FIRST (root) block comment."""
    root = markup.split("-->", 1)[0]
    m = re.search(r"\{.*\}", root, re.S)
    return json.loads(m.group(0)) if m else {}


# --- composite band-fold (the live trust-bar drop) ---------------------------

def test_composite_sole_passthrough_folds_content_width_and_resolves_var():
    """A composite (trust-bar) whose sole `__inner` carries a content-band max-width
    folds it to contentWidth — RESOLVING the co-declared var() to the literal. The
    composite content mechanisms (array/scalar) never folded this before -> drop."""
    node = _node(
        '<section class="sgs-trust-bar">'
        '  <div class="sgs-trust-bar__inner">'
        '    <div class="sgs-trust-bar__badge">Handmade</div>'
        '  </div>'
        '</section>'
    )
    css_rules = {
        ".sgs-trust-bar__inner": {
            "display": "grid",
            "grid-template-columns": "1fr 1fr",
            "gap": "16px 12px",
            "max-width": "var(--content-width)",
            "--content-width": "1100px",
            "margin": "0 auto",
        },
    }
    rec = recognise_section(node)
    attrs = _root_attrs(build_block_markup(rec, node, media_map={}, css_rules=css_rules))
    assert rec.slug == "sgs/trust-bar"
    # contentWidth folds AND resolves var() -> literal (not 'var(--content-width)').
    assert attrs.get("contentWidth") == "1100px"
    # gap (L3 arrangement) folds too; grid-template is EXCLUDED (GAP-3) — not on root.
    assert attrs.get("gap") == "16px 12px"
    assert "gridTemplateColumns" not in attrs


# --- default-container full-band fold + inheritable text-align ----------------

def test_default_container_folds_text_align_to_native_textalign():
    """A default sgs/container section whose `__inner` centres its content folds the
    inheritable text-align onto the container's WP-native textAlign support (cascades,
    child-overrideable) — was silently dropped (max-width-only fold)."""
    node = _node(
        '<section class="sgs-ingredients-section">'
        '  <div class="sgs-ingredients-section__inner">'
        '    <h2 class="sgs-ingredients-section__heading">Ingredients</h2>'
        '  </div>'
        '</section>'
    )
    css_rules = {
        ".sgs-ingredients-section__inner": {
            "max-width": "var(--content-width)",
            "--content-width": "960px",
            "margin": "0 auto",
            "text-align": "center",
        },
    }
    rec = recognise_section(node)
    attrs = _root_attrs(build_block_markup(rec, node, media_map={}, css_rules=css_rules))
    assert rec.slug == "sgs/container"
    assert attrs.get("contentWidth") == "960px"
    assert attrs.get("textAlign") == "center"


def test_composite_bem_less_inner_folds_via_css_signature_fallback():
    """R-31-9 parity: a COMPOSITE whose sole pass-through inner has a NON-BEM class
    (no __element token) still folds its content-band max-width — via the CSS-signature
    fallback (lift_content_band_max_width), mirroring the default-container path. Without
    the fallback, route_interior_css_to_parent_slot would early-return on the None token
    and the band would drop (the composite-vs-default asymmetry, closed 2026-07-03)."""
    node = _node(
        '<section class="sgs-trust-bar">'
        '  <div class="wrapper">'
        '    <div class="sgs-trust-bar__badge">Handmade</div>'
        '  </div>'
        '</section>'
    )
    css_rules = {
        ".wrapper": {"max-width": "1000px", "margin": "0 auto"},
    }
    rec = recognise_section(node)
    attrs = _root_attrs(build_block_markup(rec, node, media_map={}, css_rules=css_rules))
    assert rec.slug == "sgs/trust-bar"
    assert attrs.get("contentWidth") == "1000px"


def test_default_container_content_width_unregressed():
    """Regression lock for switching the default fold to route_interior_css_to_parent_slot:
    a plain content-band max-width (no grid, no text-align) still lands contentWidth."""
    node = _node(
        '<section class="sgs-featured-product">'
        '  <div class="sgs-featured-product__inner">'
        '    <h2 class="sgs-featured-product__heading">Featured</h2>'
        '  </div>'
        '</section>'
    )
    css_rules = {
        ".sgs-featured-product__inner": {
            "max-width": "var(--content-width)",
            "--content-width": "1040px",
            "margin": "0 auto",
        },
    }
    rec = recognise_section(node)
    attrs = _root_attrs(build_block_markup(rec, node, media_map={}, css_rules=css_rules))
    assert rec.slug == "sgs/container"
    assert attrs.get("contentWidth") == "1040px"
    # margin:0 auto has no container attr destination -> NOT mis-lifted as a margin attr.
    assert "margin" not in attrs
