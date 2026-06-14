"""test_gf_b2_css_scope.py — Regression guard for GF-B.2 cross-section CSS bleed.

Before the fix, `.A .B { color: red }` matched ANY element with class `.B`,
ignoring whether a `.A` ancestor actually exists. This caused CSS declared for
one section (e.g. `.sgs-social-proof .sgs-section-heading__sub`) to bleed into
identically-classed elements in other sections.

The fix generalises the tag-branch ancestor-presence walk to the class branch:
every ancestor token in parts[:-1] must resolve to a real ancestor of the node.

Edge case (R4): a compound single-element selector like `.sgs-hero__cta--primary`
(no whitespace → parts has ONE token) must still match — parts[:-1] is empty,
so no ancestor is required.
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from bs4 import BeautifulSoup  # noqa: E402
from orchestrator.converter_v2 import convert  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_css_sheet(selector: str, prop: str, value: str) -> dict:
    """Build the minimal css_sheet structure used by _collect_css_decls_for_element."""
    return {f"{selector}": {prop: value}}


def _decls(html: str, target_tag: str, selector: str, prop: str, value: str) -> dict:
    """
    Parse html, find target_tag, collect CSS decls via the real function.
    Returns the base_decls dict.
    """
    soup = BeautifulSoup(html, "html.parser")
    node = soup.find(target_tag)
    assert node is not None, f"tag <{target_tag}> not found in: {html}"

    css_rules: dict[str, dict[str, str]] = {selector: {prop: value}}
    base, _media = convert._collect_css_decls_for_element(node, css_rules)
    return base


# ---------------------------------------------------------------------------
# (a) Descendant selector must NOT match without the required ancestor
# ---------------------------------------------------------------------------

def test_descendant_class_selector_requires_ancestor_present():
    """.A .B must NOT match a .B element that has no .A ancestor."""
    html = """
    <div class="sgs-other-section">
      <h2 class="sgs-section-heading__sub">Wrong section heading</h2>
    </div>
    """
    result = _decls(
        html,
        "h2",
        ".sgs-social-proof .sgs-section-heading__sub",
        "text-align",
        "center",
    )
    assert "text-align" not in result, (
        "GF-B.2 regression: .sgs-social-proof .sgs-section-heading__sub matched "
        "an h2 that has NO .sgs-social-proof ancestor. Cross-section bleed is back."
    )


def test_descendant_class_selector_matches_when_ancestor_present():
    """.A .B MUST match a .B element whose ancestor is .A."""
    html = """
    <div class="sgs-social-proof">
      <h2 class="sgs-section-heading__sub">Correct section heading</h2>
    </div>
    """
    result = _decls(
        html,
        "h2",
        ".sgs-social-proof .sgs-section-heading__sub",
        "text-align",
        "center",
    )
    assert result.get("text-align") == "center", (
        f"Expected text-align:center to match inside .sgs-social-proof, got {result!r}"
    )


# ---------------------------------------------------------------------------
# (b) Compound single-element selector (R4 edge case) must still match
# ---------------------------------------------------------------------------

def test_compound_single_token_selector_still_matches():
    """A compound selector with no whitespace (one token) must match — no ancestor required."""
    html = '<a class="sgs-hero__cta--primary">Book now</a>'
    result = _decls(
        html,
        "a",
        ".sgs-hero__cta--primary",
        "font-weight",
        "bold",
    )
    assert result.get("font-weight") == "bold", (
        f"R4 regression: compound single-token selector dropped. Got {result!r}"
    )
