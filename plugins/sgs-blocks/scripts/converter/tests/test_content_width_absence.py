"""test_content_width_absence.py — CONTENT-WIDTH layer absence rule (Spec 31 §13.6 / FR-31-21).

The defect (Eye Care clone, 2026-09-23): a draft section declared
`padding: 104px 52px` and NO max-width on its content, so the content spans the
section. The converter wrote no `contentWidth`, so `sgs/container`'s block.json
default `{"desktop": "normal"}` resolved to the theme content-size (1200px) on
the `.sgs-container__inner` band — every heading started 60px right of the draft.

Rule (project CLAUDE.md: "a property's ABSENCE -> full width, overriding the theme
default"): when the draft puts no max-width on the content band, a block whose
content-width attr DEFAULTS to a cap gets the explicit no-cap token. A draft
max-width still wins; a block whose default imposes no cap is left untouched.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_content_width_absence.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup

from converter.recognition import recognise_section
from converter.services.extraction import build_block_markup


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def _block_attrs(markup: str, slug: str) -> list[dict]:
    """Attrs of every `<!-- wp:<slug> {...} -->` opener in emission order."""
    name = slug.split("/", 1)[1]
    out: list[dict] = []
    for m in re.finditer(r"<!-- wp:sgs/" + re.escape(name) + r"(?: (\{.*?\}))? /?-->", markup):
        out.append(json.loads(m.group(1)) if m.group(1) else {})
    return out


def _root_attrs(markup: str) -> dict:
    root = markup.split("-->", 1)[0]
    m = re.search(r"\{.*\}", root, re.S)
    return json.loads(m.group(0)) if m else {}


def test_root_container_without_band_cap_gets_full_content_width():
    """The Eye Care shape: padding on the section, no max-width anywhere."""
    node = _node(
        '<section class="sgs-reasons">'
        '  <h2 class="sgs-reasons__heading">Four reasons</h2>'
        '  <p class="sgs-reasons__lede">Why people choose us.</p>'
        '</section>'
    )
    css_rules = {".sgs-reasons": {"padding": "104px 52px"}}
    rec = recognise_section(node)
    attrs = _root_attrs(build_block_markup(rec, node, media_map={}, css_rules=css_rules))
    assert rec.slug == "sgs/container"
    assert attrs.get("contentWidth") == {"desktop": "full"}


def test_nested_container_without_band_cap_gets_full_content_width():
    """At ANY depth: a slug-None wrapper that becomes its own nested sgs/container."""
    node = _node(
        '<section class="sgs-shapes">'
        '  <div class="sgs-shapes__head">'
        '    <h2 class="sgs-shapes__heading">Start with a shape</h2>'
        '    <p class="sgs-shapes__lede">Pick one.</p>'
        '  </div>'
        '  <div class="sgs-shapes__body">'
        '    <p class="sgs-shapes__text">Body copy.</p>'
        '    <p class="sgs-shapes__text">More copy.</p>'
        '  </div>'
        '</section>'
    )
    css_rules = {".sgs-shapes": {"padding": "104px 52px"}}
    rec = recognise_section(node)
    markup = build_block_markup(rec, node, media_map={}, css_rules=css_rules)
    containers = _block_attrs(markup, "sgs/container")
    assert len(containers) >= 2, markup
    for c in containers:
        assert c.get("contentWidth") == {"desktop": "full"}, (c, markup)


def test_draft_band_max_width_still_wins():
    """Negative control: a draft content-band max-width keeps its value."""
    node = _node(
        '<section class="sgs-capped">'
        '  <div class="sgs-capped__inner">'
        '    <h2 class="sgs-capped__heading">Capped</h2>'
        '  </div>'
        '</section>'
    )
    css_rules = {
        ".sgs-capped": {"padding": "104px 52px"},
        ".sgs-capped__inner": {"max-width": "900px", "margin": "0 auto"},
    }
    rec = recognise_section(node)
    attrs = _root_attrs(build_block_markup(rec, node, media_map={}, css_rules=css_rules))
    assert rec.slug == "sgs/container"
    assert attrs.get("contentWidth") == {"desktop": "900px"}


def test_block_whose_default_imposes_no_cap_is_untouched():
    """Negative control: sgs/trust-bar's contentWidth default is `{}` (no cap), so
    absence already renders full — nothing is written."""
    node = _node(
        '<section class="sgs-trust-bar">'
        '  <div class="sgs-trust-bar__badge">Handmade</div>'
        '</section>'
    )
    rec = recognise_section(node)
    attrs = _root_attrs(build_block_markup(rec, node, media_map={}, css_rules={}))
    assert rec.slug == "sgs/trust-bar"
    assert "contentWidth" not in attrs


def test_non_container_leaf_is_untouched():
    """Negative control: a block with no content-width layer gets no contentWidth."""
    node = _node(
        '<section class="sgs-plain">'
        '  <h2 class="sgs-plain__heading">Plain heading</h2>'
        '  <p class="sgs-plain__text">Copy.</p>'
        '</section>'
    )
    rec = recognise_section(node)
    markup = build_block_markup(rec, node, media_map={}, css_rules={})
    leaves = _block_attrs(markup, "sgs/heading") + _block_attrs(markup, "sgs/text")
    assert len(leaves) == 2, markup
    for leaf in leaves:
        assert "contentWidth" not in leaf, (leaf, markup)
