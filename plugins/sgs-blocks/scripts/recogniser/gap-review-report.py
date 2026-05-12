#!/usr/bin/env python3
"""gap-review-report.py -- Spec 15 Phase 5a.5 operator-review surface.

Generates a markdown report at
    pipeline-state/sgs-clone/<run_id>/gap-review.md
listing every gap candidate surfaced by this clone run, sorted by
severity (high -> medium -> low) and grouped by gap_level so an
operator can scan the worst breakage first.

Inputs:
  --router-out   Path to the leftover-bucket-router (5a.1) JSON output.
                 Provides convention / structural / attribute /
                 functionality buckets enriched with gap_level + severity.
  --run-id       Run identifier (also used to scope the pipeline-state
                 directory).
  --out-dir      Root pipeline-state dir (default: ./pipeline-state).

Output columns per row:
  gap_level        attribute | functionality | convention | structural
  severity         high | medium | low
  selector         the offending DOM selector (or bucket-specific key)
  proposed_action  short string describing what an operator should do
  decided_at       blank by default -- operator fills in when triaged

UK English in the report itself + code comments.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


_SEVERITY_RANK = {"high": 0, "medium": 1, "low": 2}

# Per-bucket descriptions of what the operator should do when triaging
# items in that bucket. Drives the proposed_action column.
_PROPOSED_ACTION_BY_BUCKET: dict[str, str] = {
    "unrecognised_class":            "Add to naming-conventions or lingua-franca map (5c)",
    "unrecognised_section":          "Atomic-block scaffold candidate (5b.8) or new SGS block",
    "extraction_failed":             "Extend slot extractor or declare slot omission",
    "animation_unclassified":        "Route via /uimax-scrape-animation + register SGS animation",
    "structural_mismatch_or_orphan": "Re-check block fingerprint or scaffold an atomic block",
}

# Pretty-name per bucket for the report grouping.
_BUCKET_LABEL: dict[str, str] = {
    "unrecognised_class":            "Unrecognised class (convention)",
    "unrecognised_section":          "Unrecognised section (structural)",
    "extraction_failed":             "Extraction failed (attribute)",
    "animation_unclassified":        "Animation unclassified (functionality)",
    "structural_mismatch_or_orphan": "Structural mismatch / orphan",
}


def _flatten_items(router_payload: dict) -> list[dict]:
    """Pull every bucket item into one flat list tagged with its bucket."""
    flat: list[dict] = []
    buckets = router_payload.get("leftover_buckets") or {}
    for bucket_name, items in buckets.items():
        for item in items:
            enriched = dict(item)
            enriched["_bucket"] = bucket_name
            enriched.setdefault("gap_level", "unknown")
            enriched.setdefault("severity", "low")
            flat.append(enriched)
    return flat


def _row_key(item: dict) -> tuple[int, str, str]:
    """Sort key: severity rank, then gap_level, then selector for determinism."""
    sev_rank = _SEVERITY_RANK.get(item.get("severity", "low"), 99)
    selector = item.get("selector") or item.get("section_id") or item.get("class") or ""
    return (sev_rank, item.get("gap_level", ""), str(selector))


def _selector_field(item: dict) -> str:
    """Best-effort selector field for the markdown column."""
    for key in ("selector", "class", "section_id", "boundary_id", "block_name", "source"):
        value = item.get(key)
        if value:
            return f"`{value}`"
    return "_(no selector)_"


def render_markdown(router_payload: dict, run_id: str) -> str:
    """Emit the operator-review markdown report."""
    flat = _flatten_items(router_payload)
    flat.sort(key=_row_key)

    gap_level_totals = router_payload.get("gap_level_totals") or {}
    bucket_totals = router_payload.get("totals") or {}

    lines: list[str] = []
    lines.append(f"# Gap review -- clone run `{run_id}`")
    lines.append("")
    lines.append("Sorted by severity (high -> medium -> low). Tick `decided_at` when triaged.")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append("| Gap level | Count |")
    lines.append("|---|---:|")
    for level in ("attribute", "functionality", "convention", "structural"):
        lines.append(f"| {level} | {gap_level_totals.get(level, 0)} |")
    # Use the router's authoritative total_count when present -- gap_level_totals
    # is built per-item and would double-count if a single item belonged to two
    # gap levels.
    total = router_payload.get("total_count")
    if total is None:
        total = len(flat)
    lines.append(f"| **Total** | **{total}** |")
    lines.append("")
    lines.append("## All gaps")
    lines.append("")
    lines.append("| gap_level | severity | selector | proposed_action | decided_at |")
    lines.append("|---|---|---|---|---|")
    for item in flat:
        bucket = item["_bucket"]
        action = _PROPOSED_ACTION_BY_BUCKET.get(bucket, "Review manually")
        lines.append(
            f"| {item.get('gap_level','')} | {item.get('severity','')} | "
            f"{_selector_field(item)} | {action} | |"
        )
    lines.append("")

    # Per-bucket breakdown sections so the operator can drill into a single bucket.
    lines.append("## By bucket")
    lines.append("")
    for bucket_name, label in _BUCKET_LABEL.items():
        count = bucket_totals.get(bucket_name, 0)
        if count == 0:
            continue
        items = [i for i in flat if i["_bucket"] == bucket_name]
        items.sort(key=_row_key)
        lines.append(f"### {label} ({count})")
        lines.append("")
        for item in items:
            lines.append(f"- {_selector_field(item)} -- severity **{item.get('severity','low')}**")
        lines.append("")
    return "\n".join(lines)


def write_report(router_payload: dict, run_id: str, out_dir: Path) -> Path:
    """Render + write the report. Returns the written path."""
    target = out_dir / "sgs-clone" / run_id / "gap-review.md"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render_markdown(router_payload, run_id), encoding="utf-8")
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--router-out", type=Path, required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--out-dir", type=Path, default=Path("pipeline-state"))
    args = parser.parse_args(argv)

    if not args.router_out.exists():
        sys.exit(f"ERROR: router output not found at {args.router_out}")

    payload = json.loads(args.router_out.read_text(encoding="utf-8"))
    target = write_report(payload, args.run_id, args.out_dir)
    print(f"[gap-review] wrote {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
