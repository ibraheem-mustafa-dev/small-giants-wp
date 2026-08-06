"""test_nowidth_media_residual.py — no-width @media conditions (P-RESPONSIVE-ROUTER-ROBUSTNESS).

A media query carrying NO width constraint (``@media print``,
``prefers-color-scheme``, ``orientation``, ``prefers-reduced-motion``) was
swallowed twice in ``styling_helpers``:

1. ``_media_condition_applies_at`` looped the min/max-width regexes and tested
   ``all(...)`` over them. With no width tokens both iterators are EMPTY, so
   ``all([])`` is vacuously True — the condition read as "applies at EVERY
   width" and its declarations folded into the screen base for all three device
   tiers.
2. The F-ii residual-capture guard built a ``thresholds`` list from the same
   width regex and tested ``any(t not in device_thresholds ...)``. With
   ``thresholds == []``, ``any([])`` is False — so the whole residual block
   (including the ``ResidualBand`` append) was skipped and the condition never
   reached ``bound_residual_media_conds``, which already handles the no-width
   case by returning the condition verbatim.

Correct contract: a no-width condition does NOT participate in the width
cascade at all. It is captured as a residual and passed through verbatim, which
is how its declarations avoid being dropped.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_nowidth_media_residual.py
"""
from __future__ import annotations

import pytest
from bs4 import BeautifulSoup

from converter.services.styling_helpers import (
    _media_condition_applies_at,
    collect_css_decls_for_element,
)

_WIDTHS = [375, 767, 768, 1023, 1024, 99999]

_NO_WIDTH_CONDS = [
    "@media print",
    "@media (prefers-color-scheme: dark)",
    "@media (orientation: landscape)",
    "@media (prefers-reduced-motion: reduce)",
]


def _node(html: str, cls: str):
    return BeautifulSoup(html, "html.parser").find(class_=cls)


@pytest.mark.parametrize("cond", _NO_WIDTH_CONDS)
@pytest.mark.parametrize("width", _WIDTHS)
def test_no_width_condition_never_applies_in_the_width_cascade(cond: str, width: int):
    """A condition with no width constraint must not participate in the cascade.

    This is the built-in negative control: before the fix ``all([])`` returned
    True at every one of these widths, so all six assertions failed.
    """
    assert _media_condition_applies_at(cond, width) is False


def test_no_width_media_is_captured_as_a_verbatim_residual():
    """``@media print`` declarations land in the residual sink verbatim, and do
    NOT contaminate the screen base output."""
    rules = {
        ".sgs-x": {"color": "#111"},
        "@media print :: .sgs-x": {"color": "#000"},
    }
    node = _node('<div class="sgs-x"></div>', "sgs-x")
    sink: list = []
    base, bp = collect_css_decls_for_element(node, rules, residual_sink=sink)

    assert len(sink) == 1
    assert sink[0].media_cond == "@media print"
    assert sink[0].decls == {"color": "#000"}

    # The print colour must NOT have folded into the screen cascade.
    assert base.get("color") == "#111"
    assert "#000" not in {base.get("color")} | {
        d.get("color") for d in bp.values()
    }
