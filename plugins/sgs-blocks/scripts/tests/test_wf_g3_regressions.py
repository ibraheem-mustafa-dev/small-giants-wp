"""Regression tests for wiring-fingerprint (wf_resolve, wf_css, wf_php, wf_editor) and behavioural-analyser/php_preprocess.py.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_wf_g3_regressions.py -q
"""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT / "wiring-fingerprint"))
sys.path.insert(0, str(_ROOT / "behavioural-analyser"))

import php_preprocess as pp  # noqa: E402
from wf_css import CssIndex, css_rules  # noqa: E402
from wf_editor import EditorModel  # noqa: E402
from wf_php import FUNC_RE  # noqa: E402
from wf_resolve import Resolver  # noqa: E402


def test_data_consumed_reads_the_channel_data_field():
    css = CssIndex()
    css.data_attrs.add("data-foo")
    css.rules.append(("a.css", "[data-foo]", "color:red"))
    ch = SimpleNamespace(
        query=False, kinds=lambda: set(), forwards=set(), classes=set(), cps=set(),
        decl=False, gate_decl=False, data={"data-foo"}, fx_data=set(),
    )
    r = Resolver.__new__(Resolver)
    r.css = css
    r.js = None
    sig = Resolver.signals(r, ch, False)
    assert sig["data_consumed"] is True
    assert sig["fx_data_consumed"] is False


def test_css_escaped_quote_in_string():
    rules = css_rules('.a{content:"\\""}.b{color:red}')
    assert [s for s, _ in rules] == [".a", ".b"]


def test_css_apostrophe_in_unquoted_url():
    rules = css_rules(".a{background:url(it's.png)}.b{color:red}")
    assert [s for s, _ in rules] == [".a", ".b"]


def test_css_quoted_url_still_parses():
    rules = css_rules(".a{background:url('a;b.png')}.b{color:red}")
    assert [s for s, _ in rules] == [".a", ".b"]


def test_func_re_keeps_params_after_parenthesised_default():
    m = FUNC_RE.search("function f($a = array(), $b) {}")
    assert m.group(2).count("$") == 2


def test_composite_transition_props_handles_animation():
    out = pp.composite_transition_props(["'animation: x ', $attributes['dur'], 'ms;'"], {})
    assert out == {"dur": {"animation-duration"}}


def test_inline_array_variables_nested_calls_not_duplicated():
    src = "$m = array('a'=>1); f(g($m), $m);"
    out = pp.inline_array_variables(src, {"f", "g"})
    assert out.count("array('a'=>1)") <= 3
    assert "  array" not in out and out.count("f(") == 1 and out.count(");") == 2


def test_editor_block_walk_is_breadth_first():
    # edit.js -> a -> b -> c, and edit.js -> c directly: c must be expanded at depth 1 so
    # d (depth 4 via the long path) is reached through c.
    facts = {
        "blocks": {"x": {"edit": "e.js", "files": ["e.js", "a.js", "b.js", "c.js", "d.js"]}},
        "files": {
            "e.js": {"canvasCalls": [{"fn": "C"}, {"fn": "A"}]},
            "a.js": {"canvasCalls": [{"fn": "B"}]},
            "b.js": {"canvasCalls": [{"fn": "C"}]},
            "c.js": {"canvasCalls": [{"fn": "D"}]},
            "d.js": {"canvasReads": {"attr": {"whole": True, "tiers": []}}},
        },
        "exports": {"a.js": ["A"], "b.js": ["B"], "c.js": ["C"], "d.js": ["D"]},
    }
    be = EditorModel(facts, ".").block("x", {"attributes": {"attr": {}}}, [])
    assert "attr" in be.canvas
