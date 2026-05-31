"""test_g1_leaf_lift.py — Unit tests for the G1 leaf-text-lift + the
_atomic_attrs_for graceful-fallback key-bug fix (2026-05-31).

Background: the universal BEM walker never ran FR-22-2 content-routing for
leaf blocks, so BEM-resolved sgs/text / sgs/label emitted their text as inner
markup the leaf's render.php ignores -> empty render. G1 lifts leaf text into
the content attr via _atomic_attrs_for. The graceful fallback inside
_atomic_attrs_for was ALSO silently broken: it checked info.get("type") but
block_attrs() returns the type under key "attr_type", so the fallback always
returned {} and never fired for slugs without an explicit handler (e.g.
sgs/label). These tests pin both the fix and the regression-free behaviour of
the explicit handlers.

Mirrors the path setup + import pattern of test_qc_council_fixes.py.
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from bs4 import BeautifulSoup  # noqa: E402
from orchestrator.converter_v2 import convert  # noqa: E402


def _node(html: str, tag: str):
    return BeautifulSoup(html, "html.parser").find(tag)


def test_fallback_lifts_label_text():
    """The graceful fallback must lift sgs/label's text into the `text` attr.

    Regression guard for the type/attr_type key bug: on the pre-fix code this
    returned {} (info.get("type") was None), so sgs/label rendered empty. The
    fix (info.get("attr_type")) makes the fallback fire. sgs/label has no
    explicit handler in _atomic_attrs_for, so it exercises the fallback path.
    """
    node = _node('<span class="sgs-label">Handmade in Birmingham</span>', "span")
    attrs = convert._atomic_attrs_for(node, "sgs/label")
    assert attrs.get("text") == "Handmade in Birmingham", (
        f"expected text lifted into the attr, got {attrs!r} "
        "(if empty, the type/attr_type fallback key bug has regressed)"
    )


def test_fallback_preserves_inline_richtext():
    """Inline rich-text tags must survive the lift (uses _rich_text_content)."""
    node = _node('<span class="sgs-label">Free <strong>UK</strong> delivery</span>', "span")
    attrs = convert._atomic_attrs_for(node, "sgs/label")
    text = attrs.get("text", "")
    assert "Free" in text and "<strong>UK</strong>" in text, (
        f"expected inline <strong> preserved in lifted text, got {text!r}"
    )


def test_explicit_text_handler_unchanged():
    """sgs/text explicit handler still lifts its text (regression guard)."""
    node = _node("<p>Baked fresh every week.</p>", "p")
    attrs = convert._atomic_attrs_for(node, "sgs/text")
    assert attrs.get("text") == "Baked fresh every week.", f"got {attrs!r}"


def test_fallback_empty_when_no_content_attr():
    """A slug with no content-role string attr yields {} (no spurious attr)."""
    # sgs/divider has no content attr; _atomic_attrs_for returns {} for hr.
    node = _node("<hr>", "hr")
    attrs = convert._atomic_attrs_for(node, "sgs/divider")
    assert attrs == {}, f"expected empty attrs, got {attrs!r}"
