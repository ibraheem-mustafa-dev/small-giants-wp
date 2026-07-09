"""Spec 15 Phase 5a.1 self-test for leftover-bucket-router.py.

Feeds the router 4 synthetic mockup chunks (one per FR8 gap_level):
  attribute     -- declared slot, no extracted value
  functionality -- animation reference unmapped to a class
  convention    -- class name not in vocab (fallback_strategy = gap-candidate)
  structural    -- whole section unrouted (confidence < 0.5)

Asserts each chunk returns the correct gap_level + severity stamp on every
surfaced item. Also asserts gap_level_totals aggregates correctly.

Run: python test_leftover_bucket_router.py
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "leftover_bucket_router", HERE / "leftover-bucket-router.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def chunk_convention() -> dict:
    """Class name with no slug/role mapping -> convention gap."""
    return {
        "boundary": {
            "boundaries": [
                {
                    "section_id": "s1",
                    "selector": ".hero-copy",
                    "class_signature": ["hero-copy"],
                    "fallback_strategy": "gap-candidate",
                }
            ]
        }
    }


def chunk_structural_unrouted() -> dict:
    """Whole section confidence < threshold -> structural gap."""
    return {
        "match": {
            "matches": [
                {"section_id": "s2", "block_name": "sgs/unknown", "confidence": 0.2}
            ]
        }
    }


def chunk_attribute() -> dict:
    """Declared slot, no extracted value -> attribute gap."""
    return {
        "slot_list": {
            "slot_lists": {
                "b3": {"section_id": "s3", "slots": [{"slot_name": "headline"}]}
            }
        },
        "extract": {"extracted_attributes": {}},
    }


def chunk_functionality() -> dict:
    """Animation reference in leftover CSS -> functionality gap."""
    return {
        "extract": {
            "extracted_attributes": {"headline": "hi"},
            "coverage": {"leftover_css": ["transition: opacity 0.3s ease;"]},
            "block_markup": "",
        }
    }


def check(label: str, result: dict, expected_level: str, expected_bucket: str) -> None:
    bucket_items = result["leftover_buckets"][expected_bucket]
    assert bucket_items, f"{label}: bucket {expected_bucket} empty (full result: {result})"
    for item in bucket_items:
        assert item.get("gap_level") == expected_level, (
            f"{label}: expected gap_level={expected_level}, got {item.get('gap_level')} on {item}"
        )
        assert item.get("severity") in ("low", "medium", "high"), (
            f"{label}: severity missing or invalid on {item}"
        )
    assert result["gap_level_totals"].get(expected_level, 0) >= len(bucket_items), (
        f"{label}: gap_level_totals[{expected_level}] under-counted"
    )
    print(f"  PASS  {label}: gap_level={expected_level}, {len(bucket_items)} item(s)")


def _write_run(tmp: Path, boundary_id: str, declarations: dict) -> str:
    """Write a one-rule expected-rules-<bid>.jsonl into tmp and return the
    run_dir path (str). The rule is section-scoped so it counts as signal.
    """
    safe = boundary_id
    (tmp / f"expected-rules-{safe}.jsonl").write_text(
        json.dumps({
            "selector": ".sgs-x", "declarations": declarations,
            "source_media_condition": None, "selector_scope": "section",
        }) + "\n",
        encoding="utf-8",
    )
    return str(tmp)


def check_variant_layout_not_excluded() -> None:
    """Finding 1: a `layout` slot (structure-derived -> `display`) must NOT be
    silently excluded even when the draft never declared `display`. The draft
    here declares only `color` (NO display) — the old naive check would have
    resolved layout->display, found display absent, and dropped it.
    """
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        run_dir = _write_run(tmp, "bL", {"color": "#111"})
        result = mod.route(
            boundary=None, match=None,
            slot_list={"slot_lists": {"bL": {
                "section_id": "sL", "block_name": "sgs/container",
                "slots": [{"slot_name": "layout"}],
            }}},
            extract={
                "extracted_attributes": {},
                "extract_result_path": str(Path(run_dir) / "extract-result.json"),
                "per_section_results": [],
            },
        )
        slots = [i["slot"] for i in result["leftover_buckets"]["extraction_failed"]]
        assert "layout" in slots, (
            f"Finding 1 REGRESSION: `layout` silently excluded — {slots}"
        )
    print("  PASS  finding-1: `layout` variant/structural slot KEPT (not silent-dropped)")


def check_border_radius_shorthand_kept_and_absent_excluded() -> None:
    """Finding 2: a slot resolving to a border-radius CORNER longhand whose
    ONLY draft signal is the `border-radius` SHORTHAND must be KEPT (genuine
    gap). Conversely a genuinely-absent optional (`shadow` -> box-shadow, not
    declared) must still be EXCLUDED — proving the discriminator still fires.
    """
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        run_dir = _write_run(tmp, "bR", {"border-radius": "8px"})
        result = mod.route(
            boundary=None, match=None,
            slot_list={"slot_lists": {"bR": {
                "section_id": "sR", "block_name": "sgs/container",
                "slots": [
                    {"slot_name": "imageBorderTopLeftRadius"},  # -> border-top-left-radius
                    {"slot_name": "shadow"},                    # -> box-shadow (absent)
                ],
            }}},
            extract={
                "extracted_attributes": {},
                "extract_result_path": str(Path(run_dir) / "extract-result.json"),
                "per_section_results": [],
            },
        )
        slots = [i["slot"] for i in result["leftover_buckets"]["extraction_failed"]]
        assert "imageBorderTopLeftRadius" in slots, (
            f"Finding 2 REGRESSION: border-radius corner longhand silently "
            f"excluded despite shorthand declared — {slots}"
        )
        assert "shadow" not in slots, (
            f"Finding 2: absent optional `shadow` (box-shadow not declared) "
            f"should be EXCLUDED but was kept — {slots}"
        )
    print("  PASS  finding-2: border-radius shorthand->longhand KEPT; absent box-shadow EXCLUDED")


def main() -> int:
    cases = [
        ("convention",    chunk_convention(),         "convention",    "unrecognised_class"),
        ("structural",    chunk_structural_unrouted(),"structural",    "unrecognised_section"),
        ("attribute",     chunk_attribute(),          "attribute",     "extraction_failed"),
        ("functionality", chunk_functionality(),      "functionality", "animation_unclassified"),
    ]
    print("Spec 15 Phase 5a.1 — leftover-bucket-router gap_level routing")
    for label, chunk, level, bucket in cases:
        result = mod.route(
            boundary=chunk.get("boundary"),
            match=chunk.get("match"),
            slot_list=chunk.get("slot_list"),
            extract=chunk.get("extract"),
        )
        check(label, result, level, bucket)

    # Aggregation check: combine all 4 chunks; gap_level_totals must hit 1 per level.
    combined = mod.route(
        boundary=chunk_convention().get("boundary"),
        match=chunk_structural_unrouted().get("match"),
        slot_list=chunk_attribute().get("slot_list"),
        extract={
            "extracted_attributes": {},
            "coverage": {"leftover_css": ["transition: opacity 0.3s ease;"]},
            "block_markup": "",
        },
    )
    totals = combined["gap_level_totals"]
    for level in ("attribute", "functionality", "convention", "structural"):
        assert totals[level] >= 1, f"combined: gap_level_totals missing {level} (got {totals})"
    print(f"  PASS  aggregation: gap_level_totals = {totals}")

    # 2026-07-09 silent-drop guards (Findings 1 & 2).
    check_variant_layout_not_excluded()
    check_border_radius_shorthand_kept_and_absent_excluded()

    print("\nROUTER-5A.1: PASS (4 gap levels routed + aggregation + silent-drop guards)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
