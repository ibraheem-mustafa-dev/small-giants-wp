#!/usr/bin/env python3
"""
sgs-clone orchestrator (minimal v1).

Drives the 9-stage Draft-to-SGS pipeline against an HTML+CSS mockup folder.
Wraps the existing recogniser-v2 extractor + recogniser scripts + writes
JSON artefacts at pipeline-state/<run_id>/stage-N.json.

This is the v1 thin orchestrator that ships M7 + M8 of the cloning-skill build
session. Hero-only by default; multi-section + tail stages (+DEPLOY +PARITY
+REGISTER) follow in subsequent sessions.

Usage:
  python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \\
    --mockup sites/mamas-munches/mockups/homepage/index.html \\
    --section "section.hero" \\
    --block sgs/hero \\
    --client mamas-munches \\
    --page homepage \\
    --media-map sites/mamas-munches/research/sandybrown-media-map.json
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[3]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_run_id(client: str, page: str) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M%S")
    return f"{client}-{page}-{ts}"


def write_artefact(run_dir: Path, stage_n: int, stage_name: str, status: str, output: dict, started_at: str, errors: list, warnings: list) -> Path:
    artefact = {
        "stage": stage_name,
        "stage_number": stage_n,
        "status": status,
        "run_id": run_dir.name,
        "started_at": started_at,
        "completed_at": now_iso(),
        "output": output,
        "warnings": warnings,
        "errors": errors,
    }
    path = run_dir / f"stage-{stage_n}.json"
    path.write_text(json.dumps(artefact, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def stage_1_boundary(mockup_path: Path, section_selector: str, run_dir: Path) -> dict:
    """BOUNDARY — minimal v1: trust the user-provided --section selector."""
    started = now_iso()
    output = {
        "boundaries": [
            {
                "boundary_id": "b1",
                "selector": section_selector,
                "semantic_role_hint": section_selector.split(".")[-1] if "." in section_selector else section_selector,
                "convention_per_section": "custom-bem-ish",
                "fallback_strategy": "class-match",
            }
        ],
        "convention_summary": {"primary": "custom-bem-ish", "secondary": [], "mixed_sections_count": 0},
    }
    write_artefact(run_dir, 1, "boundary", "complete", output, started, [], [])
    return output


def stage_2_match(boundary_output: dict, target_block: str, run_dir: Path) -> dict:
    started = now_iso()
    output = {
        "matches": [
            {
                "boundary_id": "b1",
                "block_name": target_block,
                "confidence": 0.95,
                "alternatives": [],
                "ranked_candidates": [
                    {"block_name": target_block, "confidence": 0.95, "tie_breaker": "user-supplied"}
                ],
            }
        ]
    }
    write_artefact(run_dir, 2, "match", "complete", output, started, [], [])
    return output


def stage_3_slot_list(target_block: str, run_dir: Path) -> dict:
    started = now_iso()
    block_slug = target_block.split("/")[-1]
    block_json_path = REPO / "plugins" / "sgs-blocks" / "src" / "blocks" / block_slug / "block.json"
    warnings = []
    slots = []
    if block_json_path.exists():
        block_json = json.loads(block_json_path.read_text(encoding="utf-8"))
        for attr_name, attr_def in (block_json.get("attributes") or {}).items():
            default_val = attr_def.get("default") if isinstance(attr_def, dict) else None
            slots.append({
                "slot_name": attr_name,
                "attribute_role": "auto-derived",
                "default": default_val,
                "search_scope": "self",
            })
    else:
        warnings.append(f"block.json not found at {block_json_path}")

    output = {"slot_lists": {"b1": {"block_name": target_block, "slots": slots}}, "version_drift_warnings": warnings}
    write_artefact(run_dir, 3, "slot-list", "complete" if not warnings else "warning", output, started, [], warnings)
    return output


def stage_4_5_6_7_8_extract(args, run_dir: Path) -> dict:
    """EXTRACT through SERIALISE via existing tools/recogniser-v2/extract.py."""
    started = now_iso()
    extract_out = run_dir / "extract-result.json"
    cmd = [
        sys.executable,
        str(REPO / "tools" / "recogniser-v2" / "extract.py"),
        "--mockup", str(args.mockup),
        "--section", args.section,
        "--block", args.block,
        "--out", str(extract_out),
    ]
    if args.media_map:
        cmd.extend(["--media-map", str(args.media_map)])
    if args.viewport:
        cmd.extend(["--viewport", str(args.viewport)])
    if args.no_playwright:
        cmd.append("--no-playwright")

    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    errors = []
    warnings = []
    if proc.returncode != 0:
        errors.append(f"extract.py exited {proc.returncode}")
        errors.append(proc.stderr[:1000] if proc.stderr else "no stderr")
    extracted = {}
    if extract_out.exists():
        try:
            extracted = json.loads(extract_out.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            warnings.append(f"extract-result.json malformed: {e}")

    output = {
        "extract_result_path": str(extract_out),
        "extracted_attributes": extracted.get("attributes") or {},
        "block_markup": extracted.get("markup") or "",
        "coverage": extracted.get("coverage") or {},
        "stdout_tail": (proc.stdout or "")[-2000:],
    }
    status = "complete" if not errors else "failed"
    write_artefact(run_dir, 4, "extract-harvest-classify-compose-serialise", status, output, started, errors, warnings)
    return output


def stage_9_report(boundary: dict, match: dict, slot_list: dict, extract: dict, run_dir: Path) -> dict:
    started = now_iso()
    coverage = extract.get("coverage") or {}
    extracted_attrs = extract.get("extracted_attributes") or {}
    slots = (slot_list.get("slot_lists") or {}).get("b1", {}).get("slots") or []
    open_slots = [s["slot_name"] for s in slots if s["slot_name"] not in extracted_attrs]
    coverage_percent = round((len(extracted_attrs) / max(len(slots), 1)) * 100, 1)

    leftover_buckets = {
        "unrecognised_class": [],
        "unrecognised_section": [],
        "extraction_failed": [{"slot": name, "reason": "no value extracted"} for name in open_slots],
        "animation_unclassified": [],
        "structural_mismatch_or_orphan": [],
    }

    review_html_path = run_dir / "operator-review.html"
    review_html_path.write_text(_render_review_html(run_dir.name, boundary, match, coverage_percent, extracted_attrs, open_slots, leftover_buckets), encoding="utf-8")

    output = {
        "coverage": {"b1": {"attrs_extracted": len(extracted_attrs), "attrs_total": len(slots), "coverage_percent": coverage_percent, "open_slots": open_slots}},
        "leftover_buckets": leftover_buckets,
        "operator_review_html_path": str(review_html_path),
    }
    write_artefact(run_dir, 9, "report", "complete", output, started, [], [])
    return output


def _render_review_html(run_id: str, boundary: dict, match: dict, coverage_percent: float, extracted_attrs: dict, open_slots: list, leftover_buckets: dict) -> str:
    open_rows = "".join(f"<li>{s}</li>" for s in open_slots) or "<li>None</li>"
    extracted_rows = "".join(f"<tr><td>{k}</td><td><code>{json.dumps(v, ensure_ascii=False)[:200]}</code></td></tr>" for k, v in extracted_attrs.items())
    bucket_rows = "".join(f"<li><strong>{name}:</strong> {len(items)} entries</li>" for name, items in leftover_buckets.items())
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Operator Review {run_id}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }}
    table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; }}
    th, td {{ text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }}
    code {{ font-size: 0.85em; background: #f3f3f3; padding: 0 0.3em; }}
    .stat {{ background: #f8f8f8; padding: 1rem; border-radius: 6px; margin: 1rem 0; }}
    .pass {{ color: #2E7D4F; font-weight: 600; }}
    .warn {{ color: #C56A7A; font-weight: 600; }}
  </style>
</head>
<body>
  <h1>Operator Review</h1>
  <p><strong>Run id:</strong> <code>{run_id}</code></p>
  <p><strong>Boundary:</strong> {boundary.get('boundaries', [{}])[0].get('selector', 'n/a')}</p>
  <p><strong>Block matched:</strong> {match.get('matches', [{}])[0].get('block_name', 'n/a')} (confidence {match.get('matches', [{}])[0].get('confidence', 0)})</p>
  <div class="stat">
    <p><strong>Coverage:</strong> <span class="{'pass' if coverage_percent >= 80 else 'warn'}">{coverage_percent}%</span></p>
    <p><strong>Extracted:</strong> {len(extracted_attrs)} attrs</p>
    <p><strong>Open slots:</strong> {len(open_slots)}</p>
  </div>
  <h2>Extracted attributes</h2>
  <table><thead><tr><th>Attribute</th><th>Value</th></tr></thead><tbody>{extracted_rows}</tbody></table>
  <h2>Open slots (TODO)</h2>
  <ul>{open_rows}</ul>
  <h2>Leftover buckets</h2>
  <ul>{bucket_rows}</ul>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser(description="sgs-clone orchestrator (minimal v1)")
    parser.add_argument("--mockup", type=Path, required=True)
    parser.add_argument("--section", type=str, required=True)
    parser.add_argument("--block", type=str, required=True)
    parser.add_argument("--client", type=str, required=True)
    parser.add_argument("--page", type=str, required=True)
    parser.add_argument("--media-map", type=Path, default=None)
    parser.add_argument("--viewport", type=int, default=1440)
    parser.add_argument("--no-playwright", action="store_true")
    args = parser.parse_args()

    run_id = make_run_id(args.client, args.page)
    run_dir = REPO / "pipeline-state" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    print(f"[orchestrator] run_id={run_id}")
    print(f"[orchestrator] run_dir={run_dir}")

    boundary = stage_1_boundary(args.mockup, args.section, run_dir)
    print(f"[stage-1] boundary detected: {boundary['boundaries'][0]['selector']}")

    match = stage_2_match(boundary, args.block, run_dir)
    print(f"[stage-2] matched block: {match['matches'][0]['block_name']} confidence={match['matches'][0]['confidence']}")

    slot_list = stage_3_slot_list(args.block, run_dir)
    slot_count = len((slot_list.get('slot_lists') or {}).get('b1', {}).get('slots') or [])
    print(f"[stage-3] slot list generated: {slot_count} slots from block.json")

    extract_out = stage_4_5_6_7_8_extract(args, run_dir)
    extracted_count = len(extract_out.get('extracted_attributes') or {})
    print(f"[stage-4-8] extract+harvest+classify+compose+serialise: {extracted_count} attrs extracted")

    report = stage_9_report(boundary, match, slot_list, extract_out, run_dir)
    print(f"[stage-9] coverage: {report['coverage']['b1']['coverage_percent']}% extracted, {len(report['coverage']['b1']['open_slots'])} open slots")
    print(f"[stage-9] operator-review: {report['operator_review_html_path']}")
    print(f"[orchestrator] DONE. Artefacts in {run_dir}")


if __name__ == "__main__":
    main()
