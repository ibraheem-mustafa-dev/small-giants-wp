#!/usr/bin/env python3
"""simple_html_review_report.py -- Stage 9 operator-review HTML render.

Renders the operator-review HTML page from the orchestrator's run state.
Replaces the inline `_render_review_html` function in sgs-clone-orchestrator.py
so the rendering logic can be evolved without touching the orchestrator.

Inputs (file paths -- all required):
  --boundary    Stage 1 voter output JSON
  --match       Stage 2 confidence-matrix output JSON
  --slot-list   Stage 3 slot list JSON
  --extract     Stage 4-8 extract result JSON
  --buckets     Stage 9 leftover-bucket-router output JSON
  --run-id      Run identifier (used in page title + heading)
  --out         Path to write the HTML file

Alternatively, --run-dir can be passed; the script reads:
  <run_dir>/stage-1.json, stage-2.json, stage-3.json, stage-4.json,
  <run_dir>/leftover-buckets.json
and writes <run_dir>/operator-review.html.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def _coverage_for_section(boundary_id: str, slot_list: dict, extract: dict) -> tuple[int, int, float, list[str]]:
    """Return (attrs_extracted, attrs_total, coverage_percent, open_slots) for one section."""
    extracted_attrs = extract.get("extracted_attributes") or {}
    scaffold = (slot_list.get("slot_lists") or {}).get(boundary_id, {})
    slots = scaffold.get("slots", [])
    total = len(slots)
    open_slots = [s["slot_name"] for s in slots if s["slot_name"] not in extracted_attrs]
    extracted = total - len(open_slots) if total else 0
    pct = round((extracted / total * 100), 1) if total else 0.0
    return extracted, total, pct, open_slots


def _render(
    run_id: str,
    boundary: dict,
    match: dict,
    slot_list: dict,
    extract: dict,
    buckets: dict,
) -> str:
    """Render the full operator-review HTML page."""
    extracted_attrs = extract.get("extracted_attributes") or {}
    leftover_buckets = buckets.get("leftover_buckets") or {}
    bucket_totals = buckets.get("totals") or {}

    boundaries = boundary.get("boundaries", []) if boundary else []
    matches = match.get("matches", []) if match else []
    match_by_boundary = {m["boundary_id"]: m for m in matches}

    section_rows: list[str] = []
    for b in boundaries:
        bid = b["boundary_id"]
        m = match_by_boundary.get(bid, {})
        extracted, total, pct, open_slots = _coverage_for_section(bid, slot_list or {}, extract or {})
        verdict_class = "pass" if pct >= 80 else ("warn" if pct >= 50 else "fail")
        section_rows.append(
            f"<tr>"
            f"<td><code>{bid}</code></td>"
            f"<td>{b.get('section_id', '')}</td>"
            f"<td><code>{m.get('block_name', '?')}</code></td>"
            f"<td>{m.get('confidence', 0):.2f}</td>"
            f"<td class=\"{verdict_class}\">{pct}%</td>"
            f"<td>{extracted}/{total}</td>"
            f"<td>{len(open_slots)}</td>"
            f"</tr>"
        )

    extracted_table_rows = "".join(
        f"<tr><td><code>{k}</code></td>"
        f"<td><code>{json.dumps(v, ensure_ascii=False)[:200]}</code></td></tr>"
        for k, v in extracted_attrs.items()
    ) or "<tr><td colspan='2'><em>No attributes extracted.</em></td></tr>"

    bucket_summary_rows = "".join(
        f"<tr><td>{name}</td><td>{count}</td></tr>"
        for name, count in bucket_totals.items()
    ) or "<tr><td colspan='2'><em>No leftover entries.</em></td></tr>"

    bucket_detail_blocks: list[str] = []
    for bucket_name, items in leftover_buckets.items():
        if not items:
            continue
        rows = "".join(
            f"<li><code>{json.dumps(item, ensure_ascii=False)[:300]}</code></li>"
            for item in items
        )
        bucket_detail_blocks.append(
            f"<details><summary><strong>{bucket_name}</strong> ({len(items)})</summary>"
            f"<ul>{rows}</ul></details>"
        )
    bucket_details_html = "\n".join(bucket_detail_blocks) or "<p><em>No leftover entries.</em></p>"

    total_extracted = len(extracted_attrs)
    total_slots = sum(
        len((slot_list or {}).get("slot_lists", {}).get(b["boundary_id"], {}).get("slots", []))
        for b in boundaries
    )
    overall_pct = round((total_extracted / total_slots * 100), 1) if total_slots else 0.0

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Operator Review {run_id}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; color: #1e1e1e; }}
    h1 {{ margin-bottom: 0.25rem; }}
    table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }}
    th, td {{ text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; vertical-align: top; }}
    th {{ background: #f5f7f7; }}
    code {{ font-size: 0.85em; background: #f3f3f3; padding: 0 0.3em; }}
    .stat {{ background: #f8f8f8; padding: 1rem; border-radius: 6px; margin: 1rem 0; }}
    .pass {{ color: #2E7D4F; font-weight: 600; }}
    .warn {{ color: #C56A7A; font-weight: 600; }}
    .fail {{ color: #B11226; font-weight: 600; }}
    details {{ margin: 0.5rem 0; }}
    summary {{ cursor: pointer; padding: 0.25rem 0; }}
    ul {{ margin: 0.5rem 0 0.5rem 1.5rem; }}
  </style>
</head>
<body>
  <h1>SGS Clone Operator Review</h1>
  <p><strong>Run id:</strong> <code>{run_id}</code></p>
  <div class="stat">
    <p><strong>Sections processed:</strong> {len(boundaries)}</p>
    <p><strong>Overall coverage:</strong> <span class="{'pass' if overall_pct >= 80 else 'warn'}">{overall_pct}%</span> ({total_extracted}/{total_slots} slots filled)</p>
    <p><strong>Leftover entries:</strong> {buckets.get('total_count', 0)} across {sum(1 for v in bucket_totals.values() if v > 0)} buckets</p>
  </div>

  <h2>Per-section verdicts</h2>
  <table>
    <thead><tr><th>Boundary</th><th>Section</th><th>Block</th><th>Confidence</th><th>Coverage</th><th>Filled/Total</th><th>Open</th></tr></thead>
    <tbody>{''.join(section_rows) or '<tr><td colspan="7"><em>No boundaries.</em></td></tr>'}</tbody>
  </table>

  <h2>Extracted attributes</h2>
  <table>
    <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
    <tbody>{extracted_table_rows}</tbody>
  </table>

  <h2>Leftover bucket summary</h2>
  <table>
    <thead><tr><th>Bucket</th><th>Count</th></tr></thead>
    <tbody>{bucket_summary_rows}</tbody>
  </table>

  <h2>Leftover bucket detail</h2>
  {bucket_details_html}
</body>
</html>"""


def render_review(
    run_id: str,
    boundary: dict,
    match: dict,
    slot_list: dict,
    extract: dict,
    buckets: dict,
) -> str:
    """Importable rendering entry point used by the orchestrator."""
    return _render(run_id, boundary, match, slot_list, extract, buckets)


def _load_json(path: Path) -> dict:
    if not path.exists():
        sys.exit(f"ERROR: input not found at {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--boundary", type=Path, default=None)
    parser.add_argument("--match", type=Path, default=None)
    parser.add_argument("--slot-list", type=Path, default=None)
    parser.add_argument("--extract", type=Path, default=None)
    parser.add_argument("--buckets", type=Path, default=None)
    parser.add_argument("--run-id", type=str, default=None)
    parser.add_argument("--run-dir", type=Path, default=None, help="Pull inputs from a pipeline-state run dir")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(argv)

    if args.run_dir:
        rd = args.run_dir
        run_id = args.run_id or rd.name
        boundary = _load_json(rd / "stage-1.json").get("output", {})
        match = _load_json(rd / "stage-2.json").get("output", {})
        slot_list = _load_json(rd / "stage-3.json").get("output", {})
        extract = _load_json(rd / "stage-4.json").get("output", {})
        buckets_path = rd / "leftover-buckets.json"
        buckets = _load_json(buckets_path) if buckets_path.exists() else {"leftover_buckets": {}, "totals": {}, "total_count": 0}
    else:
        if not (args.boundary and args.match and args.slot_list and args.extract and args.buckets and args.run_id):
            sys.exit("ERROR: either --run-dir or all of --boundary --match --slot-list --extract --buckets --run-id are required")
        run_id = args.run_id
        boundary = _load_json(args.boundary)
        match = _load_json(args.match)
        slot_list = _load_json(args.slot_list)
        extract = _load_json(args.extract)
        buckets = _load_json(args.buckets)

    html = _render(run_id, boundary, match, slot_list, extract, buckets)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(html, encoding="utf-8")
    print(f"[review] wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
