#!/usr/bin/env python3
"""leftover-bucket-router.py -- Stage 9 leftover routing.

Routes anything the orchestrator could not absorb into one of five buckets
per Spec 12 section 6 plus the 2026-05-08 4-model peer review (5th bucket
"structural mismatch / orphan" was added then).

Buckets:
  unrecognised_class            -- class names with no slug / role mapping
  unrecognised_section          -- low-confidence match candidates (< 0.5)
  extraction_failed             -- declared block.json attrs with no value
  animation_unclassified        -- animations referenced but not classified
  structural_mismatch_or_orphan -- DOM shape disagrees with chosen block

Inputs (file paths or piped JSON):
  --boundary    Stage 1 voter output (boundaries + class signatures)
  --match       Stage 2 confidence-matrix output (matches + alternatives)
  --slot-list   Stage 3 slot list (block.json attribute scaffolds)
  --extract     Stage 4-8 extract result (extracted_attrs, coverage, markup)

Output JSON shape (compatible with orchestrator stage_9_report):
  {
    "leftover_buckets": {
      "unrecognised_class":            [{"selector": "...", "class": "...", "section_id": "..."}],
      "unrecognised_section":          [{"section_id": "...", "confidence": 0.4}],
      "extraction_failed":             [{"section_id": "...", "slot": "...", "reason": "..."}],
      "animation_unclassified":        [{"selector": "...", "animation": "..."}],
      "structural_mismatch_or_orphan": [{"section_id": "...", "reason": "..."}]
    },
    "totals": {<bucket_name>: <count>, ...},
    "total_count": <int>
  }
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Confidence below this counts as an unrecognised section.
UNRECOGNISED_CONFIDENCE_THRESHOLD = 0.5

EMPTY_BUCKETS_TEMPLATE: dict[str, list] = {
    "unrecognised_class": [],
    "unrecognised_section": [],
    "extraction_failed": [],
    "animation_unclassified": [],
    "structural_mismatch_or_orphan": [],
}

# Regex hints used to spot animation references in extracted attributes /
# leftover CSS rules. Cheap heuristic -- a missing match here is acceptable
# (it just means the animation passes through silently rather than being
# flagged for operator review).
ANIMATION_HINT_PATTERNS = (
    re.compile(r"animation:", re.IGNORECASE),
    re.compile(r"@keyframes", re.IGNORECASE),
    re.compile(r"data-animate", re.IGNORECASE),
    re.compile(r"transition:", re.IGNORECASE),
)


def _empty_buckets() -> dict[str, list]:
    """Return a fresh empty-buckets dict (deep copy of the template)."""
    return {name: [] for name in EMPTY_BUCKETS_TEMPLATE}


def route_unrecognised_class(boundaries: list[dict], buckets: dict[str, list]) -> None:
    """A boundary whose voter could not assign any slug is routed here."""
    for b in boundaries:
        if b.get("fallback_strategy") == "gap-candidate":
            for cls in b.get("class_signature", []):
                buckets["unrecognised_class"].append({
                    "section_id": b.get("section_id"),
                    "selector": b.get("selector"),
                    "class": cls,
                })


def route_unrecognised_section(matches: list[dict], buckets: dict[str, list]) -> None:
    """Sections whose top candidate scored below the threshold."""
    for m in matches:
        confidence = float(m.get("confidence", 0.0))
        if confidence < UNRECOGNISED_CONFIDENCE_THRESHOLD:
            buckets["unrecognised_section"].append({
                "section_id": m.get("section_id"),
                "boundary_id": m.get("boundary_id"),
                "block_name": m.get("block_name"),
                "confidence": confidence,
            })


def route_extraction_failed(slot_lists: dict, extract: dict, buckets: dict[str, list]) -> None:
    """For each section, surface declared slots that came back empty."""
    extracted_attrs = extract.get("extracted_attributes") or {}
    for boundary_id, scaffold in (slot_lists or {}).items():
        section_id = scaffold.get("section_id", boundary_id)
        for slot in scaffold.get("slots", []):
            name = slot["slot_name"]
            if name not in extracted_attrs:
                buckets["extraction_failed"].append({
                    "section_id": section_id,
                    "boundary_id": boundary_id,
                    "slot": name,
                    "reason": "no value extracted",
                })


def route_animation_unclassified(extract: dict, buckets: dict[str, list]) -> None:
    """Look for animation-shaped artefacts in extract output that lack a class."""
    markup = extract.get("block_markup") or ""
    coverage = extract.get("coverage") or {}
    leftover_css = coverage.get("leftover_css") or []
    for rule in leftover_css:
        rule_text = json.dumps(rule) if not isinstance(rule, str) else rule
        if any(pat.search(rule_text) for pat in ANIMATION_HINT_PATTERNS):
            buckets["animation_unclassified"].append({
                "source": "leftover_css",
                "rule": rule_text[:200],
            })
    if any(pat.search(markup) for pat in ANIMATION_HINT_PATTERNS):
        buckets["animation_unclassified"].append({
            "source": "block_markup",
            "hint": "animation/transition reference present in serialised markup",
        })


def route_structural_mismatch(matches: list[dict], extract: dict, buckets: dict[str, list]) -> None:
    """Flag sections where DOM-shape disagrees with the matched block.

    Minimum signal for v1: chosen block is sgs/* but extract coverage is 0,
    OR chosen block is core/group (deferred fallback) with non-trivial DOM.
    """
    coverage = extract.get("coverage") or {}
    extracted_count = len(extract.get("extracted_attributes") or {})
    for m in matches:
        block = m.get("block_name", "")
        section_id = m.get("section_id")
        if block.startswith("sgs/") and extracted_count == 0:
            buckets["structural_mismatch_or_orphan"].append({
                "section_id": section_id,
                "block_name": block,
                "reason": "block chosen but extractor returned zero attributes",
            })
        if block == "core/group" and float(m.get("confidence", 0.0)) == 0.0:
            buckets["structural_mismatch_or_orphan"].append({
                "section_id": section_id,
                "block_name": block,
                "reason": "deferred fallback; no SGS block matched",
            })


def route(
    boundary: dict | None,
    match: dict | None,
    slot_list: dict | None,
    extract: dict | None,
) -> dict:
    """Top-level routing entry point. Returns full buckets + totals dict."""
    buckets = _empty_buckets()
    boundaries = (boundary or {}).get("boundaries", [])
    matches = (match or {}).get("matches", [])
    slot_lists = (slot_list or {}).get("slot_lists", {})
    extract_dict = extract or {}

    route_unrecognised_class(boundaries, buckets)
    route_unrecognised_section(matches, buckets)
    route_extraction_failed(slot_lists, extract_dict, buckets)
    route_animation_unclassified(extract_dict, buckets)
    route_structural_mismatch(matches, extract_dict, buckets)

    totals = {name: len(items) for name, items in buckets.items()}
    return {
        "leftover_buckets": buckets,
        "totals": totals,
        "total_count": sum(totals.values()),
    }


def _load_json(path: Path | None) -> dict | None:
    if path is None:
        return None
    if not path.exists():
        sys.exit(f"ERROR: input file not found at {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--boundary", type=Path, default=None)
    parser.add_argument("--match", type=Path, default=None)
    parser.add_argument("--slot-list", type=Path, default=None)
    parser.add_argument("--extract", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args(argv)

    result = route(
        boundary=_load_json(args.boundary),
        match=_load_json(args.match),
        slot_list=_load_json(args.slot_list),
        extract=_load_json(args.extract),
    )

    payload = json.dumps(result, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        print(f"[router] wrote {args.out}")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
