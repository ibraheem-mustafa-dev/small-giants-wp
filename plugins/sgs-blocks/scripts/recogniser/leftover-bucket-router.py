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
      # Each item carries gap_level + severity per Spec 15 FR8.
      "unrecognised_class":            [{"selector": "...", "class": "...", "section_id": "...", "gap_level": "convention", "severity": "low"}],
      "unrecognised_section":          [{"section_id": "...", "confidence": 0.4, "gap_level": "structural", "severity": "high"}],
      "extraction_failed":             [{"section_id": "...", "slot": "...", "reason": "...", "gap_level": "attribute", "severity": "medium"}],
      "animation_unclassified":        [{"selector": "...", "animation": "...", "gap_level": "functionality", "severity": "low"}],
      "structural_mismatch_or_orphan": [{"section_id": "...", "reason": "...", "gap_level": "structural", "severity": "high"}]
    },
    "totals": {<bucket_name>: <count>, ...},
    "gap_level_totals": {"attribute": N, "functionality": N, "convention": N, "structural": N},
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

# Spec 15 Phase 5a.1 — bucket → gap_level mapping.
#
# Each bucket routes to ONE of four FR8 gap levels. The level determines
# which uimax table the gap-detection writer downstream emits to:
#   attribute     -> uimax.attribute_gap_candidates
#   functionality -> uimax.functionality_gap_candidates
#   convention    -> attribute_gap_candidates (with convention=true sidecar)
#   structural    -> functionality_gap_candidates (with structural=true sidecar)
#
# Convention vs attribute: an `unrecognised_class` is a naming-convention
# miss (lingua-franca path), not a missing block.json attribute. Routing
# it to convention keeps the attribute-gap surface focused on real holes
# in the block-attribute design surface.
BUCKET_TO_GAP_LEVEL: dict[str, str] = {
    "unrecognised_class":            "convention",
    "unrecognised_section":          "structural",
    "extraction_failed":             "attribute",
    "animation_unclassified":        "functionality",
    "structural_mismatch_or_orphan": "structural",
}

# Severity floor per bucket. Per-item logic may upgrade (never downgrade)
# based on confidence delta, recurrence, or operator-tag. Severity drives
# operator-review ordering at 5a.5.
BUCKET_SEVERITY_FLOOR: dict[str, str] = {
    "unrecognised_class":            "low",      # often cosmetic / decorative class
    "unrecognised_section":          "high",     # whole section unrouted
    "extraction_failed":             "medium",   # declared slot, missing value
    "animation_unclassified":        "low",      # behaviour passes silently if dropped
    "structural_mismatch_or_orphan": "high",     # block chose but DOM disagrees
}


def _enrich_item(item: dict, bucket: str, confidence: float | None = None) -> dict:
    """Stamp gap_level + severity on a bucket item.

    Severity escalates from the bucket floor when confidence < 0.25 (the
    'rough guess' threshold). Returns the same dict for chained use.
    """
    item["gap_level"] = BUCKET_TO_GAP_LEVEL[bucket]
    severity = BUCKET_SEVERITY_FLOOR[bucket]
    if confidence is not None and confidence < 0.25 and severity == "low":
        severity = "medium"
    item["severity"] = severity
    return item

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
    bucket = "unrecognised_class"
    for b in boundaries:
        if b.get("fallback_strategy") == "gap-candidate":
            for cls in b.get("class_signature", []):
                buckets[bucket].append(_enrich_item({
                    "section_id": b.get("section_id"),
                    "selector": b.get("selector"),
                    "class": cls,
                }, bucket))


def route_unrecognised_section(matches: list[dict], buckets: dict[str, list]) -> None:
    """Sections whose top candidate scored below the threshold."""
    bucket = "unrecognised_section"
    for m in matches:
        confidence = float(m.get("confidence", 0.0))
        if confidence < UNRECOGNISED_CONFIDENCE_THRESHOLD:
            buckets[bucket].append(_enrich_item({
                "section_id": m.get("section_id"),
                "boundary_id": m.get("boundary_id"),
                "block_name": m.get("block_name"),
                "confidence": confidence,
            }, bucket, confidence=confidence))


def route_extraction_failed(slot_lists: dict, extract: dict, buckets: dict[str, list]) -> None:
    """For each section, surface declared slots that came back empty.

    The extract['extracted_attributes'] dict may use either bare slot names
    (e.g. ``"headline"``) OR section-prefixed names (e.g. ``"hero.headline"``
    or ``"hero.hero.headline"`` from the multi-section aggregation).
    We check both forms so converter_v2 and legacy paths are treated equally.
    """
    bucket = "extraction_failed"
    extracted_attrs = extract.get("extracted_attributes") or {}
    for boundary_id, scaffold in (slot_lists or {}).items():
        section_id = scaffold.get("section_id", boundary_id)
        for slot in scaffold.get("slots", []):
            name = slot["slot_name"]
            # Check all plausible key forms: bare, section_id-prefixed, boundary-prefixed
            found = (
                name in extracted_attrs
                or f"{section_id}.{name}" in extracted_attrs
                or f"{boundary_id}.{name}" in extracted_attrs
            )
            if not found:
                buckets[bucket].append(_enrich_item({
                    "section_id": section_id,
                    "boundary_id": boundary_id,
                    "slot": name,
                    "reason": "no value extracted",
                }, bucket))


def route_animation_unclassified(extract: dict, buckets: dict[str, list]) -> None:
    """Look for animation-shaped artefacts in extract output that lack a class."""
    bucket = "animation_unclassified"
    markup = extract.get("block_markup") or ""
    coverage = extract.get("coverage") or {}
    leftover_css = coverage.get("leftover_css") or []
    for rule in leftover_css:
        rule_text = json.dumps(rule) if not isinstance(rule, str) else rule
        if any(pat.search(rule_text) for pat in ANIMATION_HINT_PATTERNS):
            buckets[bucket].append(_enrich_item({
                "source": "leftover_css",
                "rule": rule_text[:200],
            }, bucket))
    if any(pat.search(markup) for pat in ANIMATION_HINT_PATTERNS):
        buckets[bucket].append(_enrich_item({
            "source": "block_markup",
            "hint": "animation/transition reference present in serialised markup",
        }, bucket))


def route_structural_mismatch(matches: list[dict], extract: dict, buckets: dict[str, list]) -> None:
    """Flag sections where DOM-shape disagrees with the matched block.

    Minimum signal for v1: chosen block is sgs/* but extract coverage is 0,
    OR chosen block is core/group (deferred fallback) with non-trivial DOM.
    """
    bucket = "structural_mismatch_or_orphan"
    extracted_count = len(extract.get("extracted_attributes") or {})
    for m in matches:
        block = m.get("block_name", "")
        section_id = m.get("section_id")
        if block.startswith("sgs/") and extracted_count == 0:
            buckets[bucket].append(_enrich_item({
                "section_id": section_id,
                "block_name": block,
                "reason": "block chosen but extractor returned zero attributes",
            }, bucket))
        if block == "core/group" and float(m.get("confidence", 0.0)) == 0.0:
            buckets[bucket].append(_enrich_item({
                "section_id": section_id,
                "block_name": block,
                "reason": "deferred fallback; no SGS block matched",
            }, bucket))


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
    gap_level_totals = {"attribute": 0, "functionality": 0, "convention": 0, "structural": 0}
    for items in buckets.values():
        for item in items:
            level = item.get("gap_level")
            if level in gap_level_totals:
                gap_level_totals[level] += 1
    return {
        "leftover_buckets": buckets,
        "totals": totals,
        "gap_level_totals": gap_level_totals,
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
