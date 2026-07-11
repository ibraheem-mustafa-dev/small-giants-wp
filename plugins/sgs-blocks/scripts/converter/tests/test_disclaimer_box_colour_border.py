"""test_disclaimer_box_colour_border.py — D307 regression (Fix 6 code-review).

The Mama's ingredients "disclaimer" <p class="...__disclaimer"> clones to an
sgs/text block. Its draft CSS is:

    background: white;
    border: 1px solid var(--border);
    border-radius: 10px;

Before D307 the OUTER-layer attr resolution missed sgs/text's own
backgroundColour/borderColour/borderStyle/borderWidth attrs (a first-letter
camelCase mismatch in the suffix name-build), so the background + border silently
DROPPED. The code review then caught a second defect: even once routed, a draft
``var(--border)`` emitted the RAW capture ``"border"`` as an unvalidated slug —
an undefined ``var(--wp--preset--color--border)`` that falls to currentColor
(the D306 bug class).

This test pins BOTH:
  1. background/border-colour/-style/-width all land on sgs/text's own attrs.
  2. borderColour is a VALID theme palette token (border-subtle), never "border".
  3. borderWidth is the merged object {top,right,bottom,left} render.php's
     is_array() guard requires (a bare "1px" string would be dropped).

Uses the REAL Mama's draft :root → theme-snapshot snap (draft --border:#E8D5C0
→ palette slug border-subtle), configured the same way the live pipeline does
(converter.entry.convert_section → configure_colour_resolution_from_run).
"""
from __future__ import annotations

import json
import re

import pytest
from bs4 import BeautifulSoup

from converter.recognition import recognise_section
from converter.services import extraction as ext_mod
from converter.services import styling_helpers as sh
from converter.db import db_lookup

# Real Mama's data: draft :root --border:#E8D5C0 snaps to theme slug border-subtle.
_DRAFT_MAP = {"border": "#e8d5c0", "surface-cream": "#fbf3dc", "text-muted": "#6b5c50"}
_PALETTE_MAP = {"#e8d5c0": "border-subtle", "#fbf3dc": "surface-cream", "#6b5c50": "text-muted"}

_DISCLAIMER_CSS = {
    ".sgs-ingredients-section": {"background": "var(--surface-cream)", "padding": "64px 20px"},
    ".sgs-ingredients-section__inner": {
        "max-width": "960px", "margin": "0 auto", "text-align": "center",
    },
    ".sgs-ingredients-section__disclaimer": {
        "font-size": "14px", "color": "var(--text-muted)", "font-style": "italic",
        "max-width": "620px", "margin": "0 auto", "padding": "16px 20px",
        "background": "white", "border-radius": "10px",
        "border": "1px solid var(--border)", "line-height": "1.55",
    },
}

_SECTION_HTML = (
    '<section class="sgs-ingredients-section">'
    '  <div class="sgs-ingredients-section__inner">'
    '    <h2 class="sgs-ingredients-section__heading">Proper ingredients</h2>'
    '    <p class="sgs-ingredients-section__disclaimer">We make nourishing food.'
    ' We do not make medical claims.</p>'
    '  </div>'
    '</section>'
)


@pytest.fixture(autouse=True)
def _resolution():
    """Configure colour resolution exactly as the live pipeline does, then clear."""
    sh.reset_colour_resolution()
    sh.configure_colour_resolution(_DRAFT_MAP, _PALETTE_MAP)
    yield
    sh.reset_colour_resolution()


def _disclaimer_attrs() -> dict:
    node = BeautifulSoup(_SECTION_HTML, "html.parser").find(True)
    rec = recognise_section(node)
    markup = ext_mod.build_block_markup(rec, node, media_map={}, css_rules=_DISCLAIMER_CSS)
    for m in re.finditer(r"<!--\s*wp:(\S+)\s*(\{.*?\})?\s*/?-->", markup, re.S):
        if m.group(1) == "sgs/text" and m.group(2):
            return json.loads(m.group(2))
    raise AssertionError(f"no sgs/text block with attrs in emitted markup:\n{markup}")


def test_disclaimer_background_lands_as_valid_hex():
    attrs = _disclaimer_attrs()
    # background:white → the named-colour hex (never dropped, never raw 'white').
    assert attrs.get("backgroundColour") == "#ffffff"


def test_disclaimer_border_colour_is_valid_palette_token_not_raw_border():
    attrs = _disclaimer_attrs()
    border_colour = attrs.get("borderColour")
    # THE blocker: must be the validated palette slug, NEVER the raw 'border'.
    assert border_colour == "border-subtle"
    assert border_colour != "border"


def test_disclaimer_border_style_lands():
    attrs = _disclaimer_attrs()
    assert attrs.get("borderStyle") == "solid"


def test_disclaimer_border_width_is_merged_object():
    attrs = _disclaimer_attrs()
    # render.php's is_array() guard requires the 4-side object; a bare "1px"
    # string would be silently dropped → border renders 0.
    assert attrs.get("borderWidth") == {
        "top": "1px", "right": "1px", "bottom": "1px", "left": "1px",
    }


def test_sgs_text_borderwidth_box_family_is_seeded():
    """The object merge only fires when borderWidth's box_family == 'borderWidth'."""
    assert db_lookup.box_family_for("sgs/text", "borderWidth") == "borderWidth"
