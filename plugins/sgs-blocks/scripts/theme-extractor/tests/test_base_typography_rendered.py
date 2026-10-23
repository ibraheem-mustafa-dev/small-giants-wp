"""FR-33-3 base typography: a rendered ``line-height: normal`` is a value, a missing root size refuses.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_base_typography_rendered.py -q
"""
from __future__ import annotations

import pathlib
import sys

import pytest

PKG = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PKG))

import typography  # noqa: E402

P = {"fontSize": "17px", "lineHeight": "normal", "fontWeight": "400", "textLen": 200, "area": 1,
     "textSample": "Body copy"}
H = {"h2": {"fontSize": "32px", "lineHeight": "38.4px", "letterSpacing": "normal"}}


def test_a_rendered_line_height_normal_is_emitted_as_normal_from_the_render():
    trace: list = []
    out = typography.base_typography({"root": {"fontSize": "16px"}, "paragraphs": [P]}, trace)
    assert out["lineHeight"] == "normal"
    assert out["fontSize"] == "17px"
    assert any(r.get("what") == "styles.typography.lineHeight" and r.get("_source") == "rendered" for r in trace)


@pytest.mark.parametrize("fn", [typography.base_typography, typography.heading_base, typography.heading_sizes])
def test_a_missing_root_font_size_refuses_instead_of_assuming_16px(fn):
    facts = {"paragraphs": [dict(P, lineHeight="27px")], "headings": H}
    with pytest.raises(typography.DeclaredValueMissing, match="root"):
        fn(facts, [])


def test_a_measured_root_size_resolves_rem():
    out = typography.heading_sizes({"root": {"fontSize": "20px"}, "headings": {"h2": {"fontSize": "2rem"}}}, [])
    assert out == {"h2": "40px"}
