"""dc-import resolution (D1106 follow-up, Bean-approved 2026-09-18).

A Claude Design draft that reuses a card/component across multiple sections
factors it out into its own `<name>.dc.html` file and references it via
`<dc-import name="X" prop="{{ expr }}">`. Before this fix the walker saw an
unknown, empty tag — every section using it cloned with nothing inside it.

Guards:
  1. The headline case: a real-shaped component (image/text card, single `p`
     prop) resolves, the caller's own `style=` merges onto the spliced root,
     and re-running with the SAME bound name is a rename no-op.
  2. Prop renaming: a caller binding the component's declared prop to a
     DIFFERENT outer expression renames every `{{ prop... }}` reference
     inside the spliced markup.
  3. A draft with zero `<dc-import>` tags is untouched (no parse cost, exact
     string return) — this must never regress an ordinary draft.
  4. An unresolvable import (missing component file) is left AS-IS and never
     raises — Rule 4, loud-but-non-fatal.
  5. A self-importing component is caught by the cycle guard, not an infinite
     recursion.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from converter.services.dc_import_resolver import resolve_dc_imports  # noqa: E402

_CARD_COMPONENT = """<!DOCTYPE html>
<html><head></head><body>
<x-dc>
<div style="position:relative;background:#fff">
  <span>{{ p.name }}</span>
  <span style="color:{{ p.hex }}">{{ p.price }}</span>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props="{&quot;$preview&quot;:{&quot;width&quot;:280},&quot;p&quot;:{&quot;editor&quot;:null}}"></script>
</body></html>
"""

_SELF_IMPORT_COMPONENT = """<!DOCTYPE html>
<html><head></head><body>
<x-dc>
<div><dc-import name="Self Import" p="{{ p }}"></dc-import></div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props="{&quot;p&quot;:{}}"></script>
</body></html>
"""


def _write_component(tmp_path: Path, filename: str, content: str) -> None:
    (tmp_path / filename).write_text(content, encoding="utf-8")


def test_headline_case_resolves_and_merges_call_site_style(tmp_path):
    _write_component(tmp_path, "Card.dc.html", _CARD_COMPONENT)
    draft = (
        '<div style="display:flex">'
        '<dc-import name="Card" p="{{ p }}" style="width:100%"></dc-import>'
        "</div>"
    )
    resolved, count = resolve_dc_imports(draft, tmp_path)
    assert count == 1
    assert "<dc-import" not in resolved
    assert "{{ p.name }}" in resolved
    assert "{{ p.hex }}" in resolved
    # Call-site style merged onto the spliced root, call-site LAST (cascade wins).
    assert 'style="position:relative;background:#fff;width:100%"' in resolved


def test_prop_renamed_when_caller_binds_a_different_expression(tmp_path):
    _write_component(tmp_path, "Card.dc.html", _CARD_COMPONENT)
    draft = '<dc-import name="Card" p="{{ item }}"></dc-import>'
    resolved, count = resolve_dc_imports(draft, tmp_path)
    assert count == 1
    assert "{{ item.name }}" in resolved
    assert "{{ item.hex }}" in resolved
    assert "{{ p.name }}" not in resolved


def test_no_dc_import_is_a_true_no_op(tmp_path):
    draft = "<div><p>Ordinary markup, no imports here.</p></div>"
    resolved, count = resolve_dc_imports(draft, tmp_path)
    assert count == 0
    assert resolved == draft


def test_unresolvable_import_is_left_as_is_not_fatal(tmp_path):
    draft = '<dc-import name="Nonexistent" p="{{ p }}"></dc-import>'
    resolved, count = resolve_dc_imports(draft, tmp_path)
    assert count == 0
    assert "<dc-import" in resolved
    assert 'name="Nonexistent"' in resolved


def test_self_import_cycle_is_caught_not_infinite(tmp_path):
    _write_component(tmp_path, "Self Import.dc.html", _SELF_IMPORT_COMPONENT)
    draft = '<dc-import name="Self Import" p="{{ p }}"></dc-import>'
    # Must return promptly (no infinite recursion) and leave the innermost
    # cyclic reference unresolved rather than raising.
    resolved, count = resolve_dc_imports(draft, tmp_path)
    assert count >= 1
    assert "<dc-import" in resolved  # the cyclic inner reference survives
