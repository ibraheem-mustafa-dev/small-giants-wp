#!/usr/bin/env python3
"""Tests for per-section-convention-voter.py DB-backed legacy role lookup.

Covers:
  - legacy_role_lookup_for('hero') returns 'sgs/hero' from DB
  - legacy_role_lookup_for('unknown-role') returns None
  - Voter resolves a legacy class via DB call (not the hardcoded dict)
  - RETIRED_BLOCK_REMAP being empty doesn't break the voter
  - _assert_no_retired_block_collision() still works with empty dict
  - All 17 seeded entries match the previous dict contents (regression)
  - detect_convention correctly identifies kebab-semantic via DB lookup

Run:
    python test_voter_db_legacy.py
    pytest test_voter_db_legacy.py -v
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
REPO_ROOT = HERE.parents[4]

# Load voter module
_voter_spec = importlib.util.spec_from_file_location(
    "voter", HERE / "per-section-convention-voter.py"
)
voter = importlib.util.module_from_spec(_voter_spec)
_voter_spec.loader.exec_module(voter)

# Load db_lookup module directly for unit-testing legacy_role_lookup_for
# HERE = plugins/sgs-blocks/scripts/recogniser
# HERE.parent = plugins/sgs-blocks/scripts
_db_spec = importlib.util.spec_from_file_location(
    "db_lookup",
    HERE.parent / "orchestrator" / "converter_v2" / "db_lookup.py",
)
db_lookup = importlib.util.module_from_spec(_db_spec)
_db_spec.loader.exec_module(db_lookup)

# ---------------------------------------------------------------------------
# Expected entries — the 17 rows from the migration (regression guard)
# ---------------------------------------------------------------------------
EXPECTED_ENTRIES: list[tuple[str, str]] = [
    ("hero",                   "sgs/hero"),
    ("trust-bar",              "sgs/trust-bar"),
    ("trust-badges",           "sgs/trust-bar"),
    ("featured-product",       "sgs/featured-product"),
    ("brand-story",            "sgs/info-box"),
    ("ingredients",            "sgs/feature-grid"),
    ("ingredients-section",    "sgs/feature-grid"),
    ("gift-section",           "sgs/feature-grid"),
    ("social-proof",           "sgs/testimonial"),
    ("site-header",            "sgs/header"),
    ("site-footer",            "sgs/footer"),
    ("header",                 "sgs/header"),
    ("footer",                 "sgs/footer"),
    ("cta",                    "sgs/cta-section"),
    ("cta-section",            "sgs/cta-section"),
    ("testimonial",            "sgs/testimonial"),
    ("testimonial-slider",     "sgs/testimonial-slider"),
]


# ---------------------------------------------------------------------------
# pytest-style tests (also runnable standalone)
# ---------------------------------------------------------------------------

def test_legacy_role_lookup_for_hero():
    """legacy_role_lookup_for('hero') returns 'sgs/hero' from DB."""
    result = db_lookup.legacy_role_lookup_for("hero")
    assert result == "sgs/hero", f"Expected 'sgs/hero', got {result!r}"


def test_legacy_role_lookup_for_unknown():
    """legacy_role_lookup_for('unknown-role') returns None."""
    result = db_lookup.legacy_role_lookup_for("unknown-role")
    assert result is None, f"Expected None, got {result!r}"


def test_voter_resolves_legacy_class_via_db():
    """Voter resolves a legacy kebab class via DB (not hardcoded dict)."""
    # Force cache clear so we're reading from DB, not a stale module cache.
    db_lookup._LEGACY_ROLE_CACHE = None

    slug, confidence, fallback = voter.vote_block_slug(["hero"], "kebab-semantic")
    assert slug == "sgs/hero", f"Expected 'sgs/hero', got {slug!r}"
    assert abs(confidence - 0.85) < 1e-9, f"Expected confidence ~0.85, got {confidence}"
    assert fallback == "spec-12-lookup"


def test_voter_resolves_trust_bar_via_db():
    """Voter resolves 'trust-bar' (hyphenated legacy role) via DB."""
    db_lookup._LEGACY_ROLE_CACHE = None
    slug, confidence, fallback = voter.vote_block_slug(["trust-bar"], "kebab-semantic")
    assert slug == "sgs/trust-bar", f"Expected 'sgs/trust-bar', got {slug!r}"
    assert abs(confidence - 0.85) < 1e-9, f"Expected confidence ~0.85, got {confidence}"
    assert fallback == "spec-12-lookup"


def test_empty_retired_block_remap_doesnt_break_voter():
    """RETIRED_BLOCK_REMAP being empty does not break vote_block_slug."""
    assert voter.RETIRED_BLOCK_REMAP == {}, (
        f"RETIRED_BLOCK_REMAP should be empty, got {voter.RETIRED_BLOCK_REMAP}"
    )
    # SGS-BEM path still works cleanly with empty remap
    slug, _, fallback = voter.vote_block_slug(["sgs-hero"], "sgs-prefixed-bem")
    assert slug == "sgs/hero"
    assert fallback == "literal-slug-match"


def test_empty_retired_block_remap_gap_candidate():
    """heritage-strip now resolves via literal-slug-match (remap empty, no interception)."""
    # heritage-strip was the only RETIRED_BLOCK_REMAP entry; removed 2026-05-21.
    # With the empty dict, SGS-BEM resolution falls through to literal-slug-match.
    # The orchestrator handles the unbuilt slug downstream.
    _, _, fallback = voter.vote_block_slug(
        ["sgs-heritage-strip"], "sgs-prefixed-bem"
    )
    assert fallback in ("literal-slug-match", "gap-candidate"), (
        f"Unexpected fallback: {fallback!r}"
    )


def test_assert_no_retired_block_collision_with_empty_dict():
    """_assert_no_retired_block_collision() runs cleanly when RETIRED_BLOCK_REMAP is empty."""
    voter._RETIRED_COLLISION_CHECKED = False  # reset so it runs again
    try:
        voter._assert_no_retired_block_collision()
    except RuntimeError as e:
        raise AssertionError(f"Unexpected RuntimeError: {e}") from e
    # If we get here the check passed — no collision with empty dict.


def test_regression_all_17_entries():
    """All 17 legacy entries from the old hardcoded dict are present in the DB."""
    db_lookup._LEGACY_ROLE_CACHE = None  # force fresh DB read
    failures: list[str] = []
    for kebab, expected_slug in EXPECTED_ENTRIES:
        got = db_lookup.legacy_role_lookup_for(kebab)
        if got != expected_slug:
            failures.append(f"  {kebab!r}: expected {expected_slug!r}, got {got!r}")
    assert not failures, "Regression failures in legacy_role_lookup DB:\n" + "\n".join(failures)


def test_legacy_role_lookup_dict_is_empty():
    """LEGACY_ROLE_LOOKUP dict is now empty (migration complete)."""
    assert voter.LEGACY_ROLE_LOOKUP == {}, (
        f"Expected empty dict, got {len(voter.LEGACY_ROLE_LOOKUP)} entries"
    )


def test_detect_convention_kebab_semantic_via_db():
    """detect_convention identifies 'hero' as kebab-semantic via DB lookup."""
    db_lookup._LEGACY_ROLE_CACHE = None
    convention = voter.detect_convention(["hero"])
    assert convention == "kebab-semantic", f"Expected 'kebab-semantic', got {convention!r}"


def test_detect_convention_sgs_bem_unaffected():
    """detect_convention still correctly identifies SGS-BEM classes."""
    convention = voter.detect_convention(["sgs-hero"])
    assert convention == "sgs-prefixed-bem", f"Expected 'sgs-prefixed-bem', got {convention!r}"


# ---------------------------------------------------------------------------
# Standalone runner (mirrors the style of existing voter tests)
# ---------------------------------------------------------------------------

def main() -> int:
    tests = [
        test_legacy_role_lookup_for_hero,
        test_legacy_role_lookup_for_unknown,
        test_voter_resolves_legacy_class_via_db,
        test_voter_resolves_trust_bar_via_db,
        test_empty_retired_block_remap_doesnt_break_voter,
        test_empty_retired_block_remap_gap_candidate,
        test_assert_no_retired_block_collision_with_empty_dict,
        test_regression_all_17_entries,
        test_legacy_role_lookup_dict_is_empty,
        test_detect_convention_kebab_semantic_via_db,
        test_detect_convention_sgs_bem_unaffected,
    ]

    failures: list[str] = []
    for fn in tests:
        try:
            fn()
            print(f"  OK  {fn.__name__}")
        except AssertionError as e:
            print(f"  FAIL {fn.__name__}: {e}")
            failures.append(fn.__name__)
        except Exception as e:
            print(f"  ERROR {fn.__name__}: {type(e).__name__}: {e}")
            failures.append(fn.__name__)

    print()
    if failures:
        print(f"FAILED ({len(failures)}): {failures}")
        return 1
    print(f"PASSED ({len(tests)} tests)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
