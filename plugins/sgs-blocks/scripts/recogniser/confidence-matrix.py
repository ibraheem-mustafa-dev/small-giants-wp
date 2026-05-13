#!/usr/bin/env python3
"""confidence-matrix.py -- Stage 2 of /sgs-clone pipeline.

Ranks candidate SGS block slugs for each section by combining the voter's
candidate with disambiguation signals (class overlap, DOM-shape, registered-
block existence). Provides an importable `score_candidates()` function the
orchestrator calls directly.

For SGS-prefixed BEM sections (Spec 13 conformant) the voter has already
picked the literal slug at confidence 1.0 -- this module verifies the slug
points at a registered SGS block (`block.json` exists), and emits the single
candidate. For non-conforming sections it ranks via Spec 12 section 8
lookup table + tie-breakers.

Importable API:
    from confidence_matrix import score_candidates
    candidates = score_candidates(boundary_dict, registered_blocks)
    # returns: list of {block_name, confidence, tie_breaker}

CLI (debug / smoke):
    python confidence-matrix.py --voter-out voter.json --out matrix.json
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[4]
SGS_BLOCKS_SRC = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"

# Heuristic tie-breakers when multiple candidates are equally plausible.
# Higher score wins. Ordered to favour composite/parent blocks over child
# blocks when both could match (e.g. featured-product over product-card).
COMPOSITE_PRIORITY = {
    "sgs/hero": 10,
    "sgs/featured-product": 9,
    "sgs/cta-section": 8,
    "sgs/feature-grid": 7,
    "sgs/testimonial-slider": 7,
    "sgs/heritage-strip": 6,
    "sgs/trust-bar": 6,
    "sgs/header": 5,
    "sgs/footer": 5,
    "sgs/info-box": 4,
    "sgs/testimonial": 4,
    "sgs/product-card": 3,
}


def discover_registered_blocks(blocks_dir: Path = SGS_BLOCKS_SRC) -> set[str]:
    """Return the set of registered SGS block slugs by reading block.json files."""
    registered: set[str] = set()
    if not blocks_dir.exists():
        return registered
    for block_json in blocks_dir.glob("*/block.json"):
        try:
            data = json.loads(block_json.read_text(encoding="utf-8"))
            name = data.get("name")
            if isinstance(name, str) and name:
                registered.add(name)
        except (json.JSONDecodeError, OSError):
            continue
    return registered


def score_candidates(boundary: dict, registered_blocks: set[str] | None = None) -> list[dict]:
    """Rank candidate block slugs for a single boundary.

    Args:
      boundary: a single dict from per-section-convention-voter.py output
      registered_blocks: optional pre-loaded set of slugs; auto-discovered if None

    Returns:
      Ordered list of candidate dicts (highest-confidence first):
        [{block_name, confidence, tie_breaker, registered}, ...]
    """
    if registered_blocks is None:
        registered_blocks = discover_registered_blocks()

    candidate_slug = boundary.get("candidate_block_slug", "")
    voter_confidence = float(boundary.get("candidate_confidence", 0.0))
    fallback = boundary.get("fallback_strategy", "")
    class_signature = boundary.get("class_signature", [])

    candidates: list[dict] = []

    # Primary candidate from voter.
    # HARD GATE (Phase 5g.1, 2026-05-13): if the slug is not a registered SGS
    # block we DROP the candidate entirely. Previously we kept it at confidence
    # 0.75, which let the orchestrator emit `<!-- wp:sgs/<unregistered> /-->`
    # block-comments that WP silently dropped (Mama's homepage 2026-05-13 lost
    # 6 of 9 sections this way). Dropping forces the section into the
    # bucket-c-classifier + atomic-block-scaffold autonomy path at stage 9.
    if candidate_slug and candidate_slug in registered_blocks:
        candidates.append({
            "block_name": candidate_slug,
            "confidence": voter_confidence,
            "tie_breaker": fallback,
            "registered": True,
        })

    # Secondary candidates: scan the class signature for additional SGS slugs
    # (useful when a section wraps a known composite block, e.g. a hero pattern
    # that contains sgs-trust-bar inside it).
    for cls in class_signature:
        if not cls.startswith("sgs-") or "--" in cls or "__" in cls:
            continue
        slug = f"sgs/{cls[len('sgs-'):]}"
        if slug == candidate_slug:
            continue
        if slug in registered_blocks:
            candidates.append({
                "block_name": slug,
                "confidence": 0.5,
                "tie_breaker": "secondary-class-match",
                "registered": True,
            })

    # If nothing surfaced, emit the deferred-fallback candidate.
    if not candidates:
        candidates.append({
            "block_name": "core/group",
            "confidence": 0.0,
            "tie_breaker": "deferred-no-match",
            "registered": False,
        })

    # Sort: confidence desc, then composite priority desc.
    candidates.sort(
        key=lambda c: (
            -c["confidence"],
            -COMPOSITE_PRIORITY.get(c["block_name"], 0),
        )
    )
    return candidates


def build_matrix(voter_output: dict, registered_blocks: set[str] | None = None) -> dict:
    """Run score_candidates against every boundary in the voter output."""
    if registered_blocks is None:
        registered_blocks = discover_registered_blocks()

    matches: list[dict] = []
    for boundary in voter_output.get("boundaries", []):
        ranked = score_candidates(boundary, registered_blocks)
        top = ranked[0]
        matches.append({
            "boundary_id": boundary["boundary_id"],
            "section_id": boundary.get("section_id"),
            "block_name": top["block_name"],
            "confidence": top["confidence"],
            "alternatives": ranked[1:],
            "ranked_candidates": ranked,
        })

    return {"matches": matches}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--voter-out", type=Path, required=True, help="Path to voter JSON output")
    parser.add_argument("--out", type=Path, default=None, help="Write matrix JSON here (default stdout)")
    args = parser.parse_args(argv)

    if not args.voter_out.exists():
        sys.exit(f"ERROR: voter output not found at {args.voter_out}")
    voter_output = json.loads(args.voter_out.read_text(encoding="utf-8"))

    matrix = build_matrix(voter_output)
    payload = json.dumps(matrix, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        print(f"[matrix] wrote {args.out}")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
