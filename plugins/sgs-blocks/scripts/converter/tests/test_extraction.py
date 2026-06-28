"""test_extraction.py — Stage-3 extraction + emit-glue correctness.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_extraction.py -q --import-mode=importlib

Design ref: .claude/plans/2026-06-26-stage3-child-shape-fork-design.md §1/§7.
"""
from __future__ import annotations

import pathlib

import pytest
from bs4 import BeautifulSoup

from converter.context import ScalarLift, ContentGap
from converter.recognition import recognise
from converter.services.extraction import extract_content, build_block_markup, run_mechanism_a
from converter.services.draft_oracle import read_draft_field

# ---------------------------------------------------------------------------
# Fixture paths (resolved relative to this file so tests pass from any cwd)
# ---------------------------------------------------------------------------

_FIXTURES = pathlib.Path(__file__).parent / "fixtures" / "recognition"
_TESTIMONIAL = str(_FIXTURES / "testimonial.html")
_CANARY = str(_FIXTURES / "testimonial-canary.html")
_HERO_SPLIT = str(_FIXTURES / "hero-split.html")


def _node(html: str):
    """Parse a minimal HTML snippet and return the first real element."""
    return BeautifulSoup(html, "html.parser").find(True)


def _node_from_file(path: str):
    """Parse a fixture file and return its first real element."""
    with open(path, encoding="utf-8") as fh:
        return BeautifulSoup(fh.read(), "html.parser").find(True)


# ---------------------------------------------------------------------------
# test_mechanism_a_lifts_quote
# ---------------------------------------------------------------------------


def test_mechanism_a_lifts_quote():
    """Mechanism A must lift the quote text as a ScalarLift(attr='quote', ...)."""
    node = _node_from_file(_TESTIMONIAL)
    rec = recognise(node)
    results = extract_content(rec, node)
    scalar_lifts = [r for r in results if isinstance(r, ScalarLift)]
    assert any(r.attr == "quote" for r in scalar_lifts), (
        f"No ScalarLift with attr='quote' in results: {results}"
    )
    quote_lift = next(r for r in scalar_lifts if r.attr == "quote")
    assert quote_lift.value, "quote ScalarLift has empty value"


# ---------------------------------------------------------------------------
# test_build_block_markup_carries_quote
# ---------------------------------------------------------------------------


def test_build_block_markup_carries_quote():
    """build_block_markup on the canary fixture must carry ORACLE_CANARY_QZX
    in the emitted markup, proving the lifted content reaches the WP block string."""
    node = _node_from_file(_CANARY)
    rec = recognise(node)
    markup = build_block_markup(rec, node)
    assert "ORACLE_CANARY_QZX" in markup, (
        f"Canary string missing from markup:\n{markup}"
    )
    assert "sgs/testimonial" in markup, (
        f"Block slug missing from markup:\n{markup}"
    )


# ---------------------------------------------------------------------------
# test_oracle_is_independent
# ---------------------------------------------------------------------------


def test_oracle_is_independent():
    """read_draft_field must return the canary string by reading the fixture
    directly — independently of the engine (STOP-3 non-circular oracle)."""
    result = read_draft_field(_CANARY, ".sgs-testimonial__quote")
    assert result == "ORACLE_CANARY_QZX", (
        f"Oracle returned {result!r} — expected 'ORACLE_CANARY_QZX'"
    )


# ---------------------------------------------------------------------------
# test_conservation_holds
# ---------------------------------------------------------------------------


def test_conservation_holds():
    """extract_content must not raise and must return at least one result
    (conservation: no silent empty on a real fixture)."""
    node = _node_from_file(_TESTIMONIAL)
    rec = recognise(node)
    results = extract_content(rec, node)
    assert len(results) > 0, "extract_content returned empty list — silent drop"


# ---------------------------------------------------------------------------
# test_third_case_loud_gap
# ---------------------------------------------------------------------------


def test_hero_child_block_emits_content_attr():
    """build_block_markup on hero-split must emit the heading text as a typed
    content attr, not as bare inner HTML — sgs/heading is dynamic and reads
    its text from the 'content' attr; bare innerHTML renders blank."""
    node = _node_from_file(_HERO_SPLIT)
    rec = recognise(node)
    markup = build_block_markup(rec, node)
    assert "wp:sgs/heading" in markup, (
        f"sgs/heading child block missing from markup:\n{markup}"
    )
    assert '"content":"Hi"' in markup, (
        f"Heading text 'Hi' not found in content attr in markup:\n{markup}"
    )


def test_third_case_loud_gap():
    """A has_inner_blocks=0 block without scalar-content-lift must produce
    exactly one loud ContentGap (third case — never a silent empty)."""
    node = _node('<div class="sgs-trust-bar"></div>')
    rec = recognise(node)
    # Verify our assumption: named, no inner blocks
    assert rec.kind == "named"
    assert rec.has_inner_blocks == 0

    results = extract_content(rec, node)
    assert len(results) == 1, (
        f"Expected exactly 1 ContentGap, got {len(results)}: {results}"
    )
    assert isinstance(results[0], ContentGap), (
        f"Expected ContentGap, got {type(results[0])}: {results[0]}"
    )


# ---------------------------------------------------------------------------
# test_media_lifts_as_object_shape
# ---------------------------------------------------------------------------


def test_media_lifts_as_object_shape(monkeypatch):
    """When an attr has role=image-object + attr_type=object, run_mechanism_a
    must produce a ScalarLift whose value is the object dict shape
    {"url": ..., "id": 0, "alt": ...} — not a bare src string.

    Monkeypatches the DB accessors `lift_scalar_content` actually calls
    (`block_attrs` + `capabilities_for`) to avoid depending on the DB seed in the
    test environment. (A3 fix, 2026-06-28: the prior version patched
    `content_attrs_with_selector` — a function `run_mechanism_a` no longer calls
    after the W2 modularisation — so the monkeypatch was dead and the test was
    false-green. `lift_scalar_content` reads `block_attrs(slug)` +
    `capabilities_for(slug)`.)
    """
    import orchestrator.converter_v2.db_lookup as db_lookup_mod

    # Patch the two accessors the modularised lift_scalar_content actually reads.
    monkeypatch.setattr(
        db_lookup_mod,
        "capabilities_for",
        lambda slug: {"scalar-content-lift"},
    )
    monkeypatch.setattr(
        db_lookup_mod,
        "block_attrs",
        lambda slug: {
            "avatarMedia": {
                "role": "image-object",
                "attr_type": "object",
                "derived_selector": ".sgs-testimonial__avatar",
            }
        },
    )

    html_snippet = (
        '<div class="sgs-testimonial">'
        '<img class="sgs-testimonial__avatar" src="/cdn/jane.jpg" alt="Jane">'
        "</div>"
    )
    section_root = _node(html_snippet)

    # Build a minimal Recognition stub for the Mechanism A entry.
    from converter.context import Recognition
    rec = Recognition(
        kind="named",
        slug="sgs/testimonial",
        container_kind="content",
        has_inner_blocks=0,
    )

    results = run_mechanism_a(rec, section_root)

    scalar_lifts = [r for r in results if isinstance(r, ScalarLift)]
    assert scalar_lifts, f"Expected at least one ScalarLift, got: {results}"

    avatar_lift = next((r for r in scalar_lifts if r.attr == "avatarMedia"), None)
    assert avatar_lift is not None, (
        f"No ScalarLift with attr='avatarMedia' in results: {results}"
    )
    expected = {"url": "/cdn/jane.jpg", "id": 0, "alt": "Jane"}
    assert avatar_lift.value == expected, (
        f"ScalarLift.value is {avatar_lift.value!r} — expected {expected!r}"
    )
