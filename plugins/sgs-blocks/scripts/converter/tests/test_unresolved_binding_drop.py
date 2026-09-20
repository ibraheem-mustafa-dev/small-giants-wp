"""test_unresolved_binding_drop.py -- a style value that is an unresolved template
binding (``{{ secPad }}``) is never lifted into a block attribute.

Claude Design drafts carry ``padding: {{ secPad }}`` / ``font-size: {{ h2 }}`` in
inline styles; their runtime resolves the value, the static HTML the converter
reads does not. Read verbatim it became junk: a box shorthand split across four
sides (``{"top": "{{", "right": "secPad", ...}``), a raw ``{{ x }}`` string as a
length, or a token snap to a preset that does not exist. The choke point is
``collect_css_decls_for_element`` (the ONE reader of a node's inline ``style``);
the drop + gap record lives in ``converter/services/template_binding.py``.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_unresolved_binding_drop.py -q -p no:cacheprovider
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.entry import convert_section
from converter.services import content_gap_collector as gap_collector
from converter.services import styling_helpers, template_binding
from converter.services.styling_helpers import collect_css_decls_for_element


def _node(html: str, tag: str):
    return BeautifulSoup(html, "html.parser").find(tag)


def _binding_gaps() -> list[dict]:
    return [g for g in gap_collector.flush() if g.get("reason") == template_binding.GAP_REASON]


def _convert(html: str) -> dict:
    return convert_section(html=html, css="", media_map={})


# ---------------------------------------------------------------------------
# (a) a declaration with a binding is dropped and a gap recorded
# ---------------------------------------------------------------------------

def test_binding_declaration_is_dropped_and_recorded_as_gap() -> None:
    gap_collector.clear()
    node = _node('<h2 style="font-size: {{ h2 }};margin:0">Hi</h2>', "h2")
    base, _bp = collect_css_decls_for_element(node, {})

    assert "font-size" not in base
    assert base["margin"] == "0"

    gaps = _binding_gaps()
    assert len(gaps) == 1
    gap = gaps[0]
    assert gap["kind"] == "dropped"
    assert gap["property"] == "font-size"
    assert gap["value"] == "{{ h2 }}"
    assert gap["reason"] == "unresolved template binding"
    assert "h2" in gap["element"]
    assert "{{ h2 }}" in gap["detail"]


def test_repeated_reads_record_one_gap_not_one_per_reader() -> None:
    """The CSS pass, root-supports lift, arrangement and fold all re-read the same
    node; the gap ledger must list the declaration once."""
    gap_collector.clear()
    node = _node('<div style="gap: {{ opticianGap }}"></div>', "div")
    for _ in range(4):
        collect_css_decls_for_element(node, {})
    assert len(_binding_gaps()) == 1


def test_closing_delimiter_alone_is_also_unresolved() -> None:
    gap_collector.clear()
    node = _node('<div style="padding: 4px }}"></div>', "div")
    base, _bp = collect_css_decls_for_element(node, {})
    assert "padding" not in base
    assert len(_binding_gaps()) == 1


def test_binding_from_a_stylesheet_rule_is_dropped_too() -> None:
    gap_collector.clear()
    node = BeautifulSoup('<div class="a"></div>', "html.parser").find("div")
    rules = {
        ".a": {"padding": "{{ secPad }}", "color": "red"},
        "@media (max-width: 767px) :: .a": {"gap": "{{ g }}"},
    }
    base, bp = collect_css_decls_for_element(node, rules)
    assert base == {"color": "red"}
    assert bp == {}
    assert {g["property"] for g in _binding_gaps()} == {"padding", "gap"}


# ---------------------------------------------------------------------------
# (b) a normal declaration is unchanged
# ---------------------------------------------------------------------------

def test_normal_declarations_are_unchanged_and_record_no_gap() -> None:
    gap_collector.clear()
    node = _node(
        '<h2 style="font-size: 46px;padding: 8px 16px;'
        'font-family:\'Playfair Display\',serif;width: calc(100% - 4px)">Hi</h2>',
        "h2",
    )
    base, bp = collect_css_decls_for_element(node, {})
    assert base == {
        "font-size": "46px",
        "padding": "8px 16px",
        "font-family": "'Playfair Display',serif",
        "width": "calc(100% - 4px)",
    }
    assert bp == {}
    assert gap_collector.flush() == []


def test_drop_helper_returns_the_same_mapping_when_nothing_is_dropped() -> None:
    decls = {"color": "red"}
    assert template_binding.drop_unresolved_bindings(decls, _node("<p></p>", "p")) is decls


# ---------------------------------------------------------------------------
# (c) a four-sided shorthand containing a binding is dropped whole
# ---------------------------------------------------------------------------

def test_shorthand_with_binding_is_dropped_whole_no_partial_sides() -> None:
    html = (
        '<section style="padding: {{ secPad }};background:#fff">'
        '<p style="font-size:18px">Body</p></section>'
    )
    r = _convert(html)
    assert r["status"] == "complete"
    markup = r["block_markup"]
    # No fragment of the split binding reaches any attribute.
    assert "{{" not in markup and "}}" not in markup
    assert "secPad" not in markup
    assert '"padding"' not in markup
    assert '"top"' not in markup
    # The rest of the section still converts.
    assert '"backgroundColour":"#fff"' in markup

    gaps = [g for g in r["content_gaps"] if g.get("reason") == template_binding.GAP_REASON]
    assert [(g["property"], g["value"]) for g in gaps] == [("padding", "{{ secPad }}")]


def test_multi_value_shorthand_with_binding_is_dropped_whole() -> None:
    r = _convert('<section style="padding: {{ a }} 24px {{ b }} 8px;background:#fff"><p>x</p></section>')
    assert "{{" not in r["block_markup"] and "24px" not in r["block_markup"]
    assert "secPad" not in r["block_markup"]


# ---------------------------------------------------------------------------
# (d) a token-snappable value is dropped, not turned into a preset reference
# ---------------------------------------------------------------------------

def test_token_snappable_binding_does_not_become_a_preset_reference() -> None:
    html = (
        '<section style="background:#fff"><h2 style="font-size: {{ h2 }};margin:0">Hello</h2>'
        '<div style="display:grid;grid-template-columns: {{ twoColWide }};gap: {{ g }}">'
        "<p>a</p><p>b</p></div></section>"
    )
    r = _convert(html)
    markup = r["block_markup"]
    # (a bare "}}" is legitimate JSON closing two nested objects, so match names)
    assert "{{" not in markup
    assert "twoColWide" not in markup and "h2 }}" not in markup
    assert "wp--preset--font-size--h2" not in markup
    assert '"fontSize"' not in markup.split("wp:sgs/heading", 1)[1].split("-->", 1)[0]
    gaps = {g["property"]: g["value"] for g in r["content_gaps"] if g.get("reason") == template_binding.GAP_REASON}
    assert gaps == {
        "font-size": "{{ h2 }}",
        "grid-template-columns": "{{ twoColWide }}",
        "gap": "{{ g }}",
    }


def test_content_bindings_in_text_are_not_touched() -> None:
    """Only STYLE declarations are filtered; a ``{{ x.y }}`` in text content is a
    different problem and must pass through exactly as before."""
    r = _convert('<section style="background:#fff"><p>Hello {{ user.name }}</p></section>')
    assert "{{ user.name }}" in r["block_markup"]
    assert [g for g in r["content_gaps"] if g.get("reason") == template_binding.GAP_REASON] == []


# ---------------------------------------------------------------------------
# Negative control: with the guard removed the junk comes back
# ---------------------------------------------------------------------------

def test_negative_control_guard_removed_reproduces_the_junk(monkeypatch) -> None:
    """Prove the tests above are not vacuous: neutralise the predicate and the
    binding text reaches the emitted markup again."""
    monkeypatch.setattr(template_binding, "has_unresolved_binding", lambda _v: False)
    monkeypatch.setattr(styling_helpers, "drop_unresolved_bindings", lambda decls, _n: decls)
    r = _convert(
        '<section style="background:#fff"><h2 style="font-size: {{ h2 }};margin:0">Hello</h2>'
        '<div style="display:grid;grid-template-columns: {{ twoColWide }}"><p>a</p><p>b</p></div></section>'
    )
    assert "{{" in r["block_markup"] or "wp--preset--font-size--h2" in r["block_markup"]
    assert [g for g in r["content_gaps"] if g.get("reason") == template_binding.GAP_REASON] == []
