"""test_in_f_direct_text_child.py — Regression tests for IN-F fix (2026-06-13).

Problem: a <p> node whose BEM slot resolves to a has_inner_blocks container-mirror
composite (e.g. sgs/notice-banner) produced an empty block because:
  1. composition_role='leaf' set is_leaf=True → _atomic_attrs_for lifted text into
     attrs["text"].
  2. is_leaf=True → children-recursion gate skipped → children_markup stays [].
  3. render.php echoes $content (InnerBlock), ignores the scalar "text" attr (R-22-14).
  Result: notice-banner rendered empty (Rule 4 / no-skipping violation).

Fix (IN-F): after all child-processing, when slug is not None + children_markup empty +
block_accepts_inner_blocks + _is_container_mirror_block + non-empty direct rich text →
emit one sgs/text child; remove the incorrectly-lifted scalar "text" attr.

Test cases:
  A. Positive — disclaimer <p> → notice-banner containing sgs/text child.
  B. Negative (no double-render) — a container-mirror composite whose draft node has
     element children produces those children; no spurious sgs/text is appended.
  C. Negative (empty composite) — a has_inner_blocks container-mirror with no text
     and no element children emits a self-closing block (no sgs/text injected).
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from bs4 import BeautifulSoup  # noqa: E402
from orchestrator.converter_v2 import convert, db_lookup as db  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _walk(html: str, css_rules: dict | None = None) -> str | None:
    node = BeautifulSoup(html, "html.parser").find(True)
    return convert.walk(node, css_rules or {}, [], is_top_level=False)


def _find_mirror_slug_with_inner_blocks() -> str:
    """Return sgs/notice-banner — confirmed has_inner_blocks=1 + is container-mirror."""
    slug = "sgs/notice-banner"
    assert db.block_accepts_inner_blocks(slug), (
        f"DB sanity: {slug} must have has_inner_blocks=1 for IN-F tests to be meaningful"
    )
    assert convert._is_container_mirror_block(slug), (
        f"DB sanity: {slug} must be a container-mirror block"
    )
    return slug


# ---------------------------------------------------------------------------
# Test A — positive case: direct rich-text → sgs/text child emitted
# ---------------------------------------------------------------------------

def test_direct_text_produces_sgs_text_child():
    """A <p> that resolves to a has_inner_blocks container-mirror block must
    emit an open/close notice-banner wrapping a sgs/text child.

    Pre-fix: emitted <!-- wp:sgs/notice-banner {"text":"..."} /--> (self-close
    with ignored scalar attr, empty banner on frontend).
    Post-fix: emitted <!-- wp:sgs/notice-banner --> … <!-- /wp:sgs/notice-banner -->
    with sgs/text child carrying the message text.
    """
    _find_mirror_slug_with_inner_blocks()  # DB sanity guard

    html = (
        '<p class="sgs-ingredients-section__disclaimer">'
        "We make nourishing food. We don&#39;t make medical claims."
        "</p>"
    )
    result = _walk(html)
    assert result is not None, "walk() returned None — block not emitted at all"

    assert "<!-- wp:sgs/notice-banner" in result, (
        f"expected notice-banner open tag, got:\n{result}"
    )
    assert "<!-- /wp:sgs/notice-banner -->" in result, (
        f"expected notice-banner close tag (not self-closing), got:\n{result}"
    )
    assert "<!-- wp:sgs/text" in result, (
        f"expected sgs/text child inside notice-banner, got:\n{result}"
    )
    assert "nourishing food" in result, (
        f"expected disclaimer text in sgs/text child, got:\n{result}"
    )
    # The scalar "text" attr must NOT appear on the notice-banner itself
    # (render.php ignores it; putting it there causes confusion and bloat).
    import json as _json
    import re as _re
    # Extract the outer block's attr JSON from the opening comment
    m = _re.match(r"<!-- wp:sgs/notice-banner(\s+\{.*?\})?\s*-->", result)
    if m and m.group(1):
        outer_attrs = _json.loads(m.group(1).strip())
        assert "text" not in outer_attrs, (
            f"scalar 'text' attr must be removed from notice-banner attrs after IN-F fix, "
            f"got outer_attrs={outer_attrs!r}"
        )


def test_direct_text_with_inline_richtext():
    """Inline rich-text tags (<strong>, <em>) inside the direct text must survive."""
    html = (
        '<p class="sgs-ingredients-section__disclaimer">'
        "We make <strong>nourishing</strong> food for <em>busy mums</em>."
        "</p>"
    )
    result = _walk(html)
    assert result is not None
    assert "<strong>nourishing</strong>" in result, (
        f"<strong> must survive in sgs/text content, got:\n{result}"
    )
    assert "<em>busy mums</em>" in result, (
        f"<em> must survive in sgs/text content, got:\n{result}"
    )


# ---------------------------------------------------------------------------
# Test B — negative: no double-render when element children exist
# ---------------------------------------------------------------------------

def test_no_spurious_text_child_when_element_children_present():
    """A container-mirror composite whose draft node has element children must
    produce those children WITHOUT an extra sgs/text appended.

    Uses sgs/hero which is also a container-mirror block. The <h1> child resolves
    to sgs/heading. IN-F must NOT inject an additional sgs/text child just because
    the hero node itself has some whitespace-only NavigableString nodes.
    """
    slug = "sgs/hero"
    if not convert._is_container_mirror_block(slug):
        import pytest
        pytest.skip(f"{slug} is not a container-mirror block in this DB state")

    html = (
        '<section class="sgs-hero">'
        "<h1>Made for the mum who needs it most</h1>"
        "</section>"
    )
    result = _walk(html)
    assert result is not None

    # Count sgs/text occurrences — must be 0 or reflect only real text children
    import re as _re
    sgs_text_count = len(_re.findall(r"<!-- wp:sgs/text", result))
    # The <h1> resolves to sgs/heading, NOT sgs/text.
    # The hero node has no direct non-whitespace text — IN-F must not inject one.
    assert sgs_text_count == 0, (
        f"IN-F must not inject a spurious sgs/text when children exist; "
        f"found {sgs_text_count} sgs/text blocks in:\n{result}"
    )
    assert "sgs/heading" in result or "wp:core/heading" in result, (
        f"expected <h1> to become heading block, got:\n{result}"
    )


# ---------------------------------------------------------------------------
# Test C — negative: genuinely empty composite emits no sgs/text
# ---------------------------------------------------------------------------

def test_empty_composite_no_text_child_injected():
    """A has_inner_blocks container-mirror block with no element children AND
    no direct text content must emit self-closing (no sgs/text injected).

    This confirms the `if _direct_text:` guard is correct — whitespace-only nodes
    don't trigger the text child.
    """
    _find_mirror_slug_with_inner_blocks()

    # A notice-banner with only whitespace — no real content
    html = '<div class="sgs-notice-banner">   </div>'
    result = _walk(html)
    assert result is not None, "walk() returned None"

    # Should be self-closing (no children) — no sgs/text injected
    assert "<!-- wp:sgs/text" not in result, (
        f"IN-F must not inject sgs/text for whitespace-only content, got:\n{result}"
    )
    # The block must still be emitted (not silently dropped)
    assert "sgs/notice-banner" in result, (
        f"notice-banner must still be emitted even when empty, got:\n{result}"
    )
