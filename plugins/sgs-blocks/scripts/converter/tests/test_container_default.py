"""test_container_default.py — FR-31-4 sgs/container DEFAULT for slug-None sections.

The #1 unblock (2/9 -> 9/9): a top-level class-section with no registered composite
DEFAULTS to sgs/container + recurse children, instead of returning unrecognised.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_container_default.py -q --import-mode=importlib

Spec 31 §13.2 FR-31-4/4.1 + §12.6 DEFAULT-IS-CONTAINER. Design-gate: 6-persona
adversarial-council 2026-07-01 (all findings fact-checked). Plan: go-squishy-kernighan.md.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.context import ContentConservationError
from converter.recognition import recognise, recognise_section
from converter.services.extraction import build_block_markup, run_container_default
from converter.db import db_lookup

_CONTAINER = db_lookup.container_default_slug()


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# -- recognise_section: the FR-31-4 default -----------------------------------

def test_slug_none_section_defaults_to_container():
    """A top-level sgs-classed section with no registered composite -> sgs/container."""
    rec = recognise_section(_node('<section class="sgs-brand"></section>'))
    assert rec.kind == "named"
    assert rec.slug == _CONTAINER == "sgs/container"
    assert rec.delegates_content == 1


def test_named_section_still_wins_over_default():
    """FR-31-16 regression guard: a registered composite (hero) is UNCHANGED — the
    default never fires for it. The 2 working sections must not become containers."""
    for cls, expect in (("sgs-hero", "sgs/hero"), ("sgs-trust-bar", "sgs/trust-bar")):
        rec = recognise_section(_node(f'<section class="{cls}"></section>'))
        assert rec.slug == expect
        assert rec.slug != _CONTAINER


def test_recognise_section_delegates_verbatim_for_named():
    """recognise_section returns recognise() verbatim for any non-unrecognised kind."""
    node = _node('<section class="sgs-hero sgs-hero--split"></section>')
    assert recognise_section(node) == recognise(node)


def test_ambiguous_tie_stays_unrecognised_not_container():
    """Council MF (Regression): a genuine 2-registered-root TIE must stay a loud RED,
    NOT be silently swallowed into a container (recognition.py:73 ≡ :100 byte-identical
    returns, so recognise_section re-derives candidates)."""
    rec = recognise_section(_node('<section class="sgs-hero sgs-cta-section"></section>'))
    assert rec.kind == "unrecognised"
    assert rec.slug is None


def test_no_root_class_stays_unrecognised():
    """An element-class-only / non-sgs node is not a class-section -> stays unrecognised."""
    assert recognise_section(_node('<section class="sgs-hero__ctas"></section>')).kind != "named" \
        or recognise_section(_node('<section class="sgs-hero__ctas"></section>')).slug != _CONTAINER


def test_zero_class_boundary_root_defaults_to_container():
    """The fix (2026-09-18, 5-investigator adversarial-council root-caused, Bean-
    approved): a BOUNDARY's own root node with ZERO BEM classes at all — a genuine
    classless draft section, e.g. Claude-Design-authored HTML with no sgs- classes
    anywhere — must get the SAME FR-31-4 container-default rescue a BEM-mismatch
    already gets, when the caller identifies it as is_boundary_root=True."""
    rec = recognise_section(_node('<section></section>'), is_boundary_root=True)
    assert rec.kind == "named"
    assert rec.slug == _CONTAINER == "sgs/container"
    assert rec.delegates_content == 1


def test_zero_class_nested_node_stays_unrecognised_negative_control():
    """Negative control for the fix above: the SAME zero-class node WITHOUT
    is_boundary_root (the default, False) must stay unrecognised exactly as
    before — this is what protects a nested classless div three levels inside an
    already-recognised composite from being wrapped in a spurious container."""
    rec_default = recognise_section(_node('<section></section>'))
    assert rec_default.kind == "unrecognised"
    assert rec_default.slug is None

    rec_explicit_false = recognise_section(_node('<section></section>'), is_boundary_root=False)
    assert rec_explicit_false.kind == "unrecognised"
    assert rec_explicit_false.slug is None


def test_recursive_recognise_unchanged_for_slug_none():
    """The recursive recognise() (used on descendants) is UNTOUCHED — a slug-None
    node stays unrecognised there, so a text grandchild is never forced to a container."""
    assert recognise(_node('<div class="sgs-brand"></div>')).kind == "unrecognised"
    assert recognise(_node('<div class="sgs-nonsense"></div>')).kind == "unrecognised"


# -- container recurse-descent (FR-31-4.1) ------------------------------------

def test_descent_through_inner_wrapper_emits_real_block():
    """The __inner unwrap: real content is a grandchild below a slug-None wrapper.
    A flat recurse would gap the __inner; the descent must reach the heading."""
    node = _node(
        '<section class="sgs-brand">'
        '  <div class="sgs-brand__content"><h2 class="sgs-brand__headline">Hello</h2></div>'
        '</section>'
    )
    rec = recognise_section(node)
    markup = build_block_markup(rec, node, css_rules={}, media_map={})
    assert "wp:sgs/container" in markup
    assert "wp:sgs/heading" in markup            # reached the grandchild
    assert "Hello" in markup                     # its content landed


def test_text_leaf_becomes_content_block_not_container():
    """FR-31-4.1 #5: a text-only sgs-classed node is CONTENT, never a container
    wrapping raw text (which fails WP validation)."""
    node = _node(
        '<section class="sgs-footer">'
        '  <div class="sgs-footer__copyright">(c) 2026 Mamas Munches</div>'
        '</section>'
    )
    markup = build_block_markup(recognise_section(node), node, css_rules={}, media_map={})
    assert "wp:sgs/text" in markup
    assert "2026 Mamas Munches" in markup
    # the copyright text must NOT sit as raw text directly inside a container comment
    import re
    assert not re.search(r'wp:sgs/container[^>]*-->\s*\(c\)', markup)


def test_empty_container_raises_conservation_error():
    """STOP-27 / D244: a container that recurses to ZERO content blocks is the
    empty-container bad case -> raise (never a silent empty)."""
    node = _node('<section class="sgs-empty"></section>')  # no child elements at all
    rec = recognise_section(node)
    assert rec.slug == _CONTAINER
    with pytest.raises(ContentConservationError):
        build_block_markup(rec, node, css_rules={}, media_map={})


# -- QC correctness hardening (pre-commit review, 2026-07-01) ------------------

def test_empty_text_leaf_gaps_not_phantom_sgs_text():
    """Finding 3: an empty styling shell must NOT become a phantom empty sgs/text
    ChildBlock (which would falsely satisfy the conservation guard). It gaps."""
    from converter.services.extraction import run_container_default
    from converter.context import ChildBlock, ContentGap
    node = _node(
        '<section class="sgs-brand">'
        '  <div class="sgs-brand__spacer"></div>'          # empty shell -> gap
        '  <h2 class="sgs-brand__headline">Real</h2>'       # real content -> block
        '</section>'
    )
    results = run_container_default(recognise_section(node), node, css_rules={}, media_map={})
    text_blocks = [r for r in results if isinstance(r, ChildBlock) and r.slug == "sgs/text"]
    assert not any("wp:sgs/text" in (r.content or "") and "Real" not in (r.content or "")
                   for r in text_blocks), "empty spacer produced a phantom sgs/text block"
    assert any(isinstance(r, ContentGap) for r in results)  # spacer tracked as gap


def test_anchor_text_leaf_is_text_capable_not_core_button():
    """Finding 2: an <a> text-leaf must emit a text-capable block, never core/button
    carrying no readable content (STOP-23 rung-(a) capability gate)."""
    node = _node('<section class="sgs-promo"><a class="sgs-promo__link" href="/x">Shop now</a></section>')
    markup = build_block_markup(recognise_section(node), node, css_rules={}, media_map={})
    assert "wp:core/button" not in markup
    assert "Shop now" in markup


def test_loose_text_under_container_is_lifted_not_dropped():
    """Finding 1 (Rule 4), tightened by D1112: loose (non-Tag) text directly under a
    container is lifted into a content block — no longer merely tracked as a gap."""
    from converter.services.extraction import run_container_default
    from converter.context import ChildBlock
    node = _node('<section class="sgs-x">Loose copy<div class="sgs-x__b">Real</div></section>')
    results = run_container_default(recognise_section(node), node, css_rules={}, media_map={})
    assert any(isinstance(r, ChildBlock) and "Loose copy" in (r.content or "") for r in results)


def test_icon_plus_bare_text_span_converts_not_conservation_error():
    """D1112: `<span><svg/>Label</span>` (icon + bare text) has NO text-leaf element, so
    its only text is loose. It used to recurse to zero content blocks and raise
    ContentConservationError (Eye Care Birmingham ticker, b32). The text must land."""
    from converter.services.extraction import run_container_default
    from converter.context import ChildBlock
    node = _node(
        '<span style="display:flex"><svg width="15"><path d="M1"></path></svg>'
        '  100% genuine, supplied direct by the brands  </span>'
    )
    results = run_container_default(recognise_section(node), node, css_rules={}, media_map={})
    assert any(
        isinstance(r, ChildBlock) and "100% genuine, supplied direct by the brands" in (r.content or "")
        for r in results
    )


def test_html_comment_is_not_lifted_as_content():
    """A comment is a NavigableString subclass but not content — it must not become a text block."""
    from converter.services.extraction import run_container_default
    from converter.context import ChildBlock
    node = _node('<section class="sgs-x"><!-- todo: remove --><div class="sgs-x__b">Real</div></section>')
    results = run_container_default(recognise_section(node), node, css_rules={}, media_map={})
    assert not any(isinstance(r, ChildBlock) and "todo: remove" in (r.content or "") for r in results)


# -- integration: the real Mama's homepage, all 9 sections --------------------

def _find_top_level_sections(soup: BeautifulSoup) -> list:
    """Return every top-level section-like element in the body.

    PORTED (EXECUTION Step 16, 2026-07-05): faithful copy of the retired
    ``orchestrator.converter_v2.convert_page.find_top_level_sections`` — a
    plain bs4 helper with zero frozen-engine dependency, inlined here as the
    one remaining caller (a test-only page-splitting utility, not production
    logic; ``convert_page.py`` itself had no Stage-4 consumer and died with
    the rest of the frozen package).
    """
    body = soup.find("body") or soup
    candidates: list = []
    for tag_name in ("header", "section", "footer"):
        for el in body.find_all(tag_name):
            classes = el.get("class", []) or []
            sgs_classes = [c for c in classes if c.startswith("sgs-")]
            if not sgs_classes:
                continue
            if "__" in sgs_classes[0]:
                continue
            candidates.append(el)
    cand_ids = {id(c) for c in candidates}
    out: list = []
    for c in candidates:
        if any(id(anc) in cand_ids for anc in c.parents):
            continue
        out.append(c)
    return out


def _extract_inline_css(soup: BeautifulSoup) -> str:
    """Concatenate every <style> block in the document (ported alongside
    ``_find_top_level_sections`` — see its docstring)."""
    return "\n\n".join(tag.get_text() for tag in soup.find_all("style"))


def test_real_homepage_all_nine_sections_emit():
    """STOP-34: the universality gate is the REAL draft, all 9 sections, not a
    synthetic node. Every section must emit non-empty markup (2/9 -> 9/9)."""
    from converter.services.css_parse import parse_css

    draft = (Path(__file__).resolve().parents[5]
             / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html")
    if not draft.exists():
        pytest.skip("Mama's homepage draft not present in this checkout")
    soup = BeautifulSoup(draft.read_text(encoding="utf-8"), "html.parser")
    css_rules = parse_css(_extract_inline_css(soup))
    sections = _find_top_level_sections(soup)
    assert len(sections) == 9
    for sec in sections:
        rec = recognise_section(sec)
        markup = build_block_markup(rec, sec, css_rules=css_rules, media_map={}) or ""
        label = (sec.get("class", []) or ["?"])[0]
        assert "wp:" in markup and markup, f"{label} emitted empty"
