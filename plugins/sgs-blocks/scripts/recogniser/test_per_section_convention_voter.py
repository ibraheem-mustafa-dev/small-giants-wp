"""Self-test for per-section-convention-voter.py — covers vote_block_slug.

Focus areas:
  - SGS-BEM literal-slug match (canonical Spec 13 path)
  - RETIRED_BLOCK_REMAP routing across both branches (P-PHASE8-NEW-1)
  - Iteration-order safety: retired-block remap fires even when a wrapper
    utility class is listed before the retired class in the signature
  - LEGACY_ROLE_LOOKUP under --legacy mode (kebab-semantic)
  - Disjoint-keys invariant between LEGACY_ROLE_LOOKUP and RETIRED_BLOCK_REMAP

Run: python test_per_section_convention_voter.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "voter", HERE / "per-section-convention-voter.py"
)
voter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(voter)


CASES: list[tuple[str, list[str], tuple[str, float, str]]] = [
    # name, class_signature, expected (slug, confidence, fallback_strategy)
    ("sgs-bem live block",
     ["sgs-hero"],
     ("sgs/hero", 1.0, "literal-slug-match")),

    ("sgs-bem retired block (P-PHASE8-NEW-1)",
     ["sgs-heritage-strip"],
     ("brand", 0.95, "retired-block-remap")),

    ("legacy kebab role",
     ["hero"],
     ("sgs/hero", 0.85, "spec-12-lookup")),

    ("legacy kebab role for retired block (--legacy mode)",
     ["heritage-strip"],
     ("brand", 0.85, "retired-block-remap-legacy")),

    ("unknown class signature",
     ["random-section"],
     ("", 0.0, "gap-candidate")),

    ("iteration-order: wrapper utility before retired class",
     ["sgs-section", "sgs-heritage-strip"],
     ("brand", 0.95, "retired-block-remap")),

    ("iteration-order: wrapper utility before live block",
     ["sgs-section", "sgs-hero"],
     ("sgs/section", 1.0, "literal-slug-match")),

    ("BEM modifier and element classes ignored",
     ["sgs-hero--split", "sgs-hero__image", "sgs-hero"],
     ("sgs/hero", 1.0, "literal-slug-match")),

    ("empty signature",
     [],
     ("", 0.0, "gap-candidate")),
]


def main() -> int:
    failures: list[str] = []

    for name, sig, expected in CASES:
        got = voter.vote_block_slug(sig, "sgs-prefixed-bem")
        status = "OK" if got == expected else "FAIL"
        line = f"  {status} {name}: {sig} -> {got}"
        if got != expected:
            line += f"  (expected {expected})"
            failures.append(name)
        print(line)

    print()
    keys_overlap = (
        voter.LEGACY_ROLE_LOOKUP.keys() & voter.RETIRED_BLOCK_REMAP.keys()
    )
    if keys_overlap:
        failures.append(f"disjoint-keys invariant: {keys_overlap}")
        print(f"  FAIL disjoint-keys: {keys_overlap}")
    else:
        print("  OK disjoint-keys: LEGACY_ROLE_LOOKUP and RETIRED_BLOCK_REMAP have no overlap")

    print()
    if failures:
        print(f"FAILED ({len(failures)}): {failures}")
        return 1
    print(f"PASSED ({len(CASES) + 1} assertions)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
