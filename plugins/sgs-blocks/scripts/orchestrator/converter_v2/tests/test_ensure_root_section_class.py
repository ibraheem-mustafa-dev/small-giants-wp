#!/usr/bin/env python3
"""Smoke test for ensure_root_section_class (2026-05-21).

Verifies that the universal section-wrapper className guarantee step
injects sgs-{section_id} onto every Stage-3 section root block,
regardless of which converter branch produced the markup.

Scenarios covered:
  1. Hero section (sgs/hero block) — className already present (idempotent).
  2. Social-proof section (sgs/container) — className already present (idempotent).
  3. Brand section (sgs/container with layout:grid, className buried in attrs) —
     section class present, idempotent.
  4. Section root with NO className attr — section class injected as new attr.
  5. Section root with a DIFFERENT className — section class prepended, old preserved.
  6. Empty markup — no-op, no exception.
  7. Empty section_id — no-op.
  8. CHROME SKIPPED comment — no first WP block → no-op.
  9. Self-closing block (sgs/trust-bar) — stays self-closing with className injected.
 10. Full convert_section integration: 3-section mockup (hero, social-proof, brand)
     with explicit section_id — all root blocks carry sgs-{section_id}.

Run via:
  cd plugins/sgs-blocks/scripts
  python -m pytest orchestrator/converter_v2/tests/test_ensure_root_section_class.py -v
or directly:
  python orchestrator/converter_v2/tests/test_ensure_root_section_class.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Support both package and direct-script execution.
try:
    from .. import convert  # type: ignore
    from .. import ensure_root_section_class as _pkg_ensure  # type: ignore
    _fn = convert.ensure_root_section_class
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    import convert  # type: ignore[no-redef]
    _fn = convert.ensure_root_section_class
    _pkg_ensure = None  # direct-script; package proxy not available


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _first_block_attrs(markup: str) -> dict:
    """Extract the attrs dict from the first WP block comment in markup.

    Uses brace-depth counting to capture the full JSON object so nested
    structures (e.g. {"items":[{"label":"x"}]}) are not truncated.
    """
    import re
    # Find opening brace after the slug.
    slug_m = re.search(r"<!-- wp:[\w/\-]+\s+(\{)", markup)
    if not slug_m:
        return {}
    start = slug_m.start(1)
    depth = 0
    in_str = False
    escape = False
    for i, ch in enumerate(markup[start:], start=start):
        if escape:
            escape = False
            continue
        if ch == "\\" and in_str:
            escape = True
            continue
        if ch == '"' and not escape:
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(markup[start: i + 1])
                except ValueError:
                    return {}
    return {}


# ---------------------------------------------------------------------------
# Unit tests for ensure_root_section_class
# ---------------------------------------------------------------------------

def test_hero_idempotent():
    """sgs/hero block already carries sgs-hero — no change."""
    markup = (
        '<!-- wp:sgs/hero {"className":"sgs-hero","headline":"Test"} /-->'
    )
    result = _fn(markup, "hero")
    assert result == markup, "Hero markup should not be modified when class already present"
    attrs = _first_block_attrs(result)
    assert attrs.get("className") == "sgs-hero"


def test_container_already_has_class_idempotent():
    """sgs/container with className sgs-social-proof — no change."""
    markup = '<!-- wp:sgs/container {"className":"sgs-social-proof"} -->\n<!-- /wp:sgs/container -->'
    result = _fn(markup, "social-proof")
    assert "sgs-social-proof" in result
    attrs = _first_block_attrs(result)
    assert attrs.get("className") == "sgs-social-proof"


def test_brand_class_buried_in_attrs_idempotent():
    """sgs/container with layout:grid + className:sgs-brand — idempotent."""
    markup = (
        '<!-- wp:sgs/container {"layout":"grid","columns":2,'
        '"className":"sgs-brand","widthMode":"default"} -->\n'
        '<!-- /wp:sgs/container -->'
    )
    result = _fn(markup, "brand")
    attrs = _first_block_attrs(result)
    assert attrs.get("className") == "sgs-brand"
    # Ensure other attrs are untouched
    assert attrs.get("layout") == "grid"
    assert attrs.get("columns") == 2


def test_no_classname_attr_injected():
    """sgs/container with NO className — section class added as new attr."""
    markup = (
        '<!-- wp:sgs/container {"layout":"stack","gap":"16"} -->\n'
        '<p>content</p>\n'
        '<!-- /wp:sgs/container -->'
    )
    result = _fn(markup, "gift-section")
    attrs = _first_block_attrs(result)
    assert attrs.get("className") == "sgs-gift-section", (
        f"Expected className=sgs-gift-section, got {attrs.get('className')!r}"
    )
    # Existing attrs preserved
    assert attrs.get("layout") == "stack"
    assert attrs.get("gap") == "16"


def test_different_classname_prepended():
    """sgs/container with a different className — section class prepended."""
    markup = (
        '<!-- wp:sgs/container {"className":"sgs-ingredients-section__inner",'
        '"widthMode":"default"} -->\n'
        '<!-- /wp:sgs/container -->'
    )
    result = _fn(markup, "ingredients-section")
    attrs = _first_block_attrs(result)
    cls = attrs.get("className", "")
    assert cls.startswith("sgs-ingredients-section "), (
        f"Expected section class prepended, got {cls!r}"
    )
    assert "sgs-ingredients-section__inner" in cls, "Original class must be preserved"


def test_empty_markup_noop():
    """Empty markup — no exception, returns empty string."""
    assert _fn("", "hero") == ""


def test_empty_section_id_noop():
    """Empty section_id — no change to markup."""
    markup = '<!-- wp:sgs/container {"className":"sgs-foo"} /-->'
    assert _fn(markup, "") == markup


def test_chrome_skipped_noop():
    """CHROME SKIPPED comment before any WP block — no-op (no block to patch)."""
    markup = (
        "<!-- sgs-converter: CHROME SKIPPED (<header> sgs-header) -- "
        "belongs in WP template parts, not post content -->"
    )
    result = _fn(markup, "header")
    assert result == markup


def test_self_closing_block_stays_self_closing():
    """Self-closing block gets className injected without breaking syntax."""
    markup = '<!-- wp:sgs/trust-bar {"items":[{"label":"Fast"}]} /-->'
    result = _fn(markup, "trust-bar")
    assert result.endswith("/-->"), f"Must stay self-closing, got: {result[-20:]!r}"
    assert "sgs-trust-bar" in result
    attrs = _first_block_attrs(result)
    assert attrs.get("className") == "sgs-trust-bar"


def test_prepend_does_not_duplicate():
    """Running ensure_root_section_class twice does not duplicate the class."""
    markup = '<!-- wp:sgs/container {"layout":"stack"} -->\n<!-- /wp:sgs/container -->'
    once = _fn(markup, "featured-product")
    twice = _fn(once, "featured-product")
    attrs = _first_block_attrs(twice)
    cls = attrs.get("className", "")
    assert cls.count("sgs-featured-product") == 1, (
        f"Class must not be duplicated: {cls!r}"
    )


# ---------------------------------------------------------------------------
# Integration test: convert_section with explicit section_id
# ---------------------------------------------------------------------------

def test_convert_section_integration_three_sections():
    """Full integration: 3-section mockup with section_id — all roots carry sgs-{section_id}.

    Simulates the Mamas Munches homepage scenario: hero, social-proof, brand.
    Verifies the universal className guarantee without touching the DB or
    the full pipeline stack — uses minimal HTML + CSS fragments.
    """
    try:
        _init_path = Path(__file__).parent.parent
        sys.path.insert(0, str(_init_path.parent.parent))  # .../scripts/
        from orchestrator.converter_v2 import convert_section, reset_pipeline_seed
        reset_pipeline_seed()
    except ImportError:
        print("  SKIP integration test (orchestrator not importable from this path)")
        return

    repo_root = Path(__file__).resolve().parents[6]  # …/small-giants-wp

    # Minimal section HTMLs — just enough for the converter to emit a root block.
    sections = [
        (
            "hero",
            '<section class="sgs-hero">'
            '<h1 class="sgs-hero__headline">Test headline</h1>'
            '</section>',
        ),
        (
            "social-proof",
            '<section class="sgs-social-proof">'
            '<p class="sgs-social-proof__text">Loved by mums</p>'
            '</section>',
        ),
        (
            "brand",
            '<section class="sgs-brand">'
            '<div class="sgs-brand__content"><p>Story</p></div>'
            '</section>',
        ),
    ]

    for sid, html_frag in sections:
        result = convert_section(
            html=html_frag,
            css="",
            media_map={},
            client_slug="",
            repo_root=repo_root,
            section_id=sid,
        )
        bm = result.get("block_markup", "")
        expected_class = f"sgs-{sid}"
        assert expected_class in bm, (
            f"section_id={sid!r}: expected {expected_class!r} in root block "
            f"className, got markup: {bm[:300]!r}"
        )
        print(f"  OK  section_id={sid!r}: {expected_class!r} present in root block")


# ---------------------------------------------------------------------------
# Package-level proxy test
# ---------------------------------------------------------------------------

def test_package_proxy():
    """ensure_root_section_class accessible via converter_v2 package."""
    if _pkg_ensure is None:
        print("  SKIP package proxy test (direct-script mode)")
        return
    markup = '<!-- wp:sgs/container {} /-->'
    result = _pkg_ensure(markup, "gift-section")
    assert "sgs-gift-section" in result


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def _run_all():
    tests = [
        test_hero_idempotent,
        test_container_already_has_class_idempotent,
        test_brand_class_buried_in_attrs_idempotent,
        test_no_classname_attr_injected,
        test_different_classname_prepended,
        test_empty_markup_noop,
        test_empty_section_id_noop,
        test_chrome_skipped_noop,
        test_self_closing_block_stays_self_closing,
        test_prepend_does_not_duplicate,
        test_convert_section_integration_three_sections,
        test_package_proxy,
    ]
    failed = []
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except Exception as exc:  # noqa: BLE001
            print(f"  FAIL  {t.__name__}: {exc}")
            failed.append(t.__name__)
    print()
    if failed:
        print(f"FAILED {len(failed)}/{len(tests)}: {', '.join(failed)}")
        sys.exit(1)
    else:
        print(f"All {len(tests)} tests passed.")


if __name__ == "__main__":
    _run_all()
