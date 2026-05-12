"""Spec 15 Phase 5a.5 self-test for gap-review-report.py.

Generates the markdown report from a synthetic router payload (covering
all 4 gap levels + 3 severity bands) and asserts:
  - Every required column present in the table header
  - Rows sorted by severity (high -> medium -> low)
  - Summary table accurate
  - Per-bucket sections appear when items present
  - Empty buckets do NOT appear

Run: python test_gap_review_report.py
"""
from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "gap_review_report", HERE / "gap-review-report.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def sample_payload() -> dict:
    """A router payload with one item per bucket spanning severities."""
    return {
        "leftover_buckets": {
            "unrecognised_class": [
                {"section_id": "s1", "selector": ".hero-copy", "class": "hero-copy",
                 "gap_level": "convention", "severity": "low"},
            ],
            "unrecognised_section": [
                {"section_id": "s2", "block_name": "sgs/?", "confidence": 0.2,
                 "gap_level": "structural", "severity": "high"},
            ],
            "extraction_failed": [
                {"section_id": "s3", "slot": "headline", "reason": "no value",
                 "gap_level": "attribute", "severity": "medium"},
            ],
            "animation_unclassified": [
                {"source": "leftover_css", "rule": "transition: opacity 0.3s;",
                 "gap_level": "functionality", "severity": "low"},
            ],
            "structural_mismatch_or_orphan": [],   # empty -- must NOT appear
        },
        "totals": {
            "unrecognised_class": 1, "unrecognised_section": 1,
            "extraction_failed": 1, "animation_unclassified": 1,
            "structural_mismatch_or_orphan": 0,
        },
        "gap_level_totals": {
            "attribute": 1, "functionality": 1,
            "convention": 1, "structural": 1,
        },
        "total_count": 4,
    }


def test_render_columns_present() -> None:
    md = mod.render_markdown(sample_payload(), run_id="test-5a5")
    for col in ("gap_level", "severity", "selector", "proposed_action", "decided_at"):
        assert f"| {col} " in md or col in md.split("|")[0:200], (
            f"missing column header: {col}"
        )
    print("  PASS  columns: gap_level + severity + selector + proposed_action + decided_at all present")


def test_severity_sort_order() -> None:
    md = mod.render_markdown(sample_payload(), run_id="test-5a5")
    # Find positions of severity labels in the All-gaps table.
    high_pos = md.find("| high |")
    medium_pos = md.find("| medium |")
    low_pos = md.find("| low |")
    assert 0 <= high_pos < medium_pos < low_pos, (
        f"severity sort wrong: high={high_pos}, medium={medium_pos}, low={low_pos}"
    )
    print("  PASS  sort-order: high precedes medium precedes low in the rendered table")


def test_summary_counts() -> None:
    md = mod.render_markdown(sample_payload(), run_id="test-5a5")
    # Summary table must show 1 per gap level + total 4
    for level in ("attribute", "functionality", "convention", "structural"):
        assert f"| {level} | 1 |" in md, f"summary missing {level} row"
    assert "**Total** | **4**" in md, "summary total wrong"
    print("  PASS  summary: 4 levels x 1 row each + total=4")


def test_empty_bucket_omitted() -> None:
    md = mod.render_markdown(sample_payload(), run_id="test-5a5")
    # structural_mismatch_or_orphan had zero items -- the per-bucket section
    # must NOT be rendered for empty buckets.
    assert "Structural mismatch / orphan" not in md, (
        "empty bucket must NOT render a per-bucket section"
    )
    print("  PASS  empty-bucket-omitted: structural_mismatch_or_orphan absent (0 items)")


def test_writes_to_pipeline_state_dir() -> None:
    """Writer creates pipeline-state/sgs-clone/<run_id>/gap-review.md."""
    with tempfile.TemporaryDirectory() as tmp:
        out = mod.write_report(sample_payload(), run_id="t-5a5", out_dir=Path(tmp))
        rel = out.relative_to(tmp)
        assert rel == Path("sgs-clone/t-5a5/gap-review.md"), (
            f"output path wrong: {rel}"
        )
        assert out.exists() and out.stat().st_size > 0, "output file empty"
    print("  PASS  pipeline-state-dir: sgs-clone/<run_id>/gap-review.md written")


def main() -> int:
    print("Spec 15 Phase 5a.5 -- gap-review-report markdown contract")
    test_render_columns_present()
    test_severity_sort_order()
    test_summary_counts()
    test_empty_bucket_omitted()
    test_writes_to_pipeline_state_dir()
    print("\nREPORT-5A.5: PASS (columns + sort + summary + empty-omit + path contract)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
