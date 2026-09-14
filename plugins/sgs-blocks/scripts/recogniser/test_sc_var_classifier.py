"""Self-test for sc_var_classifier.py (universal-pipeline upgrade, Piece 1).

Run: python test_sc_var_classifier.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("scv", HERE / "sc_var_classifier.py")
scv = importlib.util.module_from_spec(SPEC)
sys.modules.setdefault("sc_var_classifier", scv)
SPEC.loader.exec_module(scv)

from bs4 import BeautifulSoup


def test_singularise() -> None:
    assert scv._singularise("reasons") == "reason"
    assert scv._singularise("categories") == "category"
    assert scv._singularise("featured") == "featured"
    assert scv._singularise("glass") == "glass"  # must not strip a bare -ss word
    print("  PASS  _singularise")


def test_nearest_sc_wrapper_finds_ancestor_not_self() -> None:
    """sc-for/sc-if are TAG NAMES wrapping content, not attributes on the
    target element -- this is the core correction from the original
    'mirrors data-slot' framing. Must walk UP the tree."""
    html = (
        '<section><sc-for list="{{ reasons }}" as="r" hint-placeholder-count="4">'
        "<div><h3>{{ r.title }}</h3></div></sc-for></section>"
    )
    soup = BeautifulSoup(html, "html.parser")
    target = soup.find("h3")
    result = scv.nearest_sc_wrapper(target)
    assert result is not None
    assert result["kind"] == "for"
    assert result["var_name"] == "reasons"
    assert result["hint_count"] == 4
    print(f"  PASS  nearest_sc_wrapper (ancestor walk): {result}")


def test_nearest_sc_wrapper_none_when_no_ancestor() -> None:
    html = "<section><div><h3>Plain title</h3></div></section>"
    soup = BeautifulSoup(html, "html.parser")
    result = scv.nearest_sc_wrapper(soup.find("h3"))
    assert result is None
    print("  PASS  nearest_sc_wrapper returns None with no sc-for/sc-if ancestor")


def test_sc_if_boolean_state_flag_not_misread_as_collection() -> None:
    """Research-buddies finding: sc-if names a state flag, not a collection
    -- var_name still extracted (kind='if'), but callers must gate on
    kind=='for' before treating it as block-identity signal (verified in the
    build_boundary wiring, not here -- this asserts the raw extraction is
    correct so that gate has something real to check)."""
    html = '<div><sc-if value="{{ menuOpen }}"><nav>x</nav></sc-if></div>'
    soup = BeautifulSoup(html, "html.parser")
    result = scv.nearest_sc_wrapper(soup.find("nav"))
    assert result["kind"] == "if"
    assert result["var_name"] == "menuOpen"
    assert "hint_count" not in result  # sc-if never carries hint-placeholder-count
    print(f"  PASS  sc-if extracted as kind='if', excluded from block-identity by callers: {result}")


def test_dotted_path_uses_last_segment() -> None:
    """`s.hasImg` (a per-iteration item property inside an outer sc-for) ->
    `hasImg`, matching Claude Design's own dotted-path grammar."""
    html = '<div><sc-if value="{{ s.hasImg }}"><span>img</span></sc-if></div>'
    soup = BeautifulSoup(html, "html.parser")
    result = scv.nearest_sc_wrapper(soup.find("span"))
    assert result["var_name"] == "hasImg", f"got {result}"
    print(f"  PASS  dotted-path last-segment extraction: {result}")


def test_deterministic_classifier_never_fires_on_canonical_class() -> None:
    """Hard constraint 1 (mirrored from dom_shape_classifier.py): an already-
    canonical SGS-BEM class on the element blocks Tier A entirely."""
    hint = scv.classify_sc_var_deterministic(
        "reasons", 4, ["sgs-hero__headline", "text-center"]
    )
    assert hint is None, f"authored identity overridden by sc_var guess: {hint}"
    print("  PASS  deterministic classifier gated off by canonical class (constraint 1)")


def test_deterministic_classifier_count_fallback() -> None:
    """No slots.aliases hit expected for a bespoke compound name -- but
    hint-placeholder-count >= 2 still yields a capped-confidence card-grid
    hint (Tier A's cardinality signal, free and DB-independent)."""
    hint = scv.classify_sc_var_deterministic("megaTopBrands", 10, [])
    assert hint is not None
    assert hint.block == "sgs/card-grid"
    assert hint.confidence <= scv.TIER2_MAX_CONFIDENCE
    print(f"  PASS  count-fallback hint (bespoke name, no alias hit): {hint}")


def test_deterministic_classifier_none_below_threshold() -> None:
    """A single-item (or absent) count must not fire a repeated-content
    guess -- a count of 1 is not a grid."""
    hint = scv.classify_sc_var_deterministic("someSingleThing", 1, [])
    assert hint is None, f"got {hint}"
    print("  PASS  count of 1 does not fire a card-grid hint")


def test_content_fingerprint_stable_and_sensitive() -> None:
    a = scv.content_fingerprint("reasons", "div", ["h3", "p"], "Fast turnaround", [])
    b = scv.content_fingerprint("reasons", "div", ["h3", "p"], "Fast turnaround", [])
    c = scv.content_fingerprint("reasons", "div", ["h3", "p", "img"], "Fast turnaround", [])
    assert a == b, "identical inputs must fingerprint identically (cache reproducibility)"
    assert a != c, "a real markup change must produce a different fingerprint"
    print(f"  PASS  content_fingerprint stable+sensitive: {a} != {c}")


def test_cache_roundtrip(tmp_path: Path | None = None) -> None:
    import tempfile

    cache_path = Path(tempfile.mkdtemp()) / "sc-var-hints.json"
    scv.write_cache_entries(
        cache_path,
        {"abc123": {"block": "info-box", "confidence": 0.45, "evidence": "test"}},
        model_id="claude-haiku-4-5-20251001",
    )
    cache = scv.load_cache(cache_path)
    hint = scv.hint_from_cache(cache, "abc123", class_signature=[])
    assert hint is not None and hint.block == "info-box", f"got {hint}"
    miss = scv.hint_from_cache(cache, "not-in-cache", class_signature=[])
    assert miss is None
    print("  PASS  cache roundtrip (write -> load -> hint) + miss returns None")


def test_cache_schema_version_mismatch_discarded() -> None:
    import json
    import tempfile

    cache_path = Path(tempfile.mkdtemp()) / "sc-var-hints.json"
    cache_path.write_text(
        json.dumps({"schema_version": 999, "entries": {"x": {"block": "hero"}}}),
        encoding="utf-8",
    )
    cache = scv.load_cache(cache_path)
    assert cache["entries"] == {}, "a stale schema version must never be silently trusted"
    print("  PASS  stale cache schema_version discarded, not silently trusted")


def test_negative_control_unresolved_names_empty_when_no_boundaries() -> None:
    """Negative control: an empty boundary list must yield an empty
    unresolved list, never a spurious entry."""
    out = scv.unresolved_sc_for_names([], {"schema_version": 1, "entries": {}})
    assert out == [], f"got {out}"
    print("  PASS  negative control: no boundaries -> no unresolved names")


def main() -> int:
    print("sc_var_classifier.py self-test")
    test_singularise()
    test_nearest_sc_wrapper_finds_ancestor_not_self()
    test_nearest_sc_wrapper_none_when_no_ancestor()
    test_sc_if_boolean_state_flag_not_misread_as_collection()
    test_dotted_path_uses_last_segment()
    test_deterministic_classifier_never_fires_on_canonical_class()
    test_deterministic_classifier_count_fallback()
    test_deterministic_classifier_none_below_threshold()
    test_content_fingerprint_stable_and_sensitive()
    test_cache_roundtrip()
    test_cache_schema_version_mismatch_discarded()
    test_negative_control_unresolved_names_empty_when_no_boundaries()
    print("\nSC-VAR-CLASSIFIER: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
