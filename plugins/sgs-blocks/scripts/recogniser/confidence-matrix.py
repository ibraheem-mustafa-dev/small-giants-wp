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

Second-tier check (2026-05-14): if a candidate slug is not a registered block,
the matcher now checks whether a PATTERN exists for it (theme/sgs-theme/
patterns/*.php). Pattern matches are returned at confidence 0.95 so blocks
always win when both exist for the same slug.

Scaffold handling (2026-05-14): scaffolded blocks (version=0.1.0-scaffold) are
now DISCOVERED and scored at confidence 0.5 rather than being fully invisible.
This gives the autonomy chain a graceful fallback instead of re-creating blocks
that already exist as scaffolds.

Importable API:
    from confidence_matrix import score_candidates
    candidates = score_candidates(boundary_dict, registered_blocks)
    # returns: list of {block_name, confidence, tie_breaker, kind, ...}

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


def _load_trace():
    """Lazy-load orchestrator.trace.Trace; soft-fail to a no-op if unavailable."""
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "orchestrator" / "trace.py"
        if candidate.exists():
            spec = importlib.util.spec_from_file_location("orchestrator_trace", candidate)
            mod = importlib.util.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
        candidate2 = parent / "trace.py"
        if candidate2.exists() and parent.name == "orchestrator":
            spec = importlib.util.spec_from_file_location("orchestrator_trace", candidate2)
            mod = importlib.util.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
    return None

_Trace = _load_trace()

REPO = Path(__file__).resolve().parents[4]
SGS_BLOCKS_SRC = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"
SGS_PATTERNS_DIR = REPO / "theme" / "sgs-theme" / "patterns"

# Spec 15 §7 Stage 2 Hard Gate: block-type match confidence ≥ 0.7 required
# to pass Stage 2 (confidence-matrix scoring) and proceed to Stage 3+.
# Boundaries with top candidate confidence < 0.7 are routed to the autonomy
# chain (bucket-c-classifier + atomic-block-scaffold) instead.
# Named as a constant so any future threshold changes happen in one location.
STAGE_2_CONFIDENCE_THRESHOLD = 0.7

# Heuristic tie-breakers when multiple candidates are equally plausible.
# Higher score wins. Ordered to favour composite/parent blocks over child
# blocks when both could match (e.g. featured-product over product-card).
COMPOSITE_PRIORITY = {
    "sgs/hero": 10,
    "sgs/cta-section": 8,
    "sgs/feature-grid": 7,
    "sgs/testimonial-slider": 7,
    "sgs/trust-bar": 6,
    "sgs/info-box": 4,
    "sgs/testimonial": 4,
    "sgs/product-card": 3,
}
# Removed 2026-05-14: sgs/featured-product, sgs/header, sgs/footer (stub blocks
# deleted after PR #18). Re-add when proper composite blocks are authored for
# these slots, or when the deterministic block generator (next-session work)
# clones them from existing template-library blocks.


def discover_registered_blocks(blocks_dir: Path = SGS_BLOCKS_SRC,
                               include_scaffolds: bool = False) -> set[str]:
    """Return the set of routable SGS block slugs by reading block.json files.

    Phase 5h.1: by default, blocks whose `version` is `0.1.0-scaffold` (the
    marker stamped by atomic-block-scaffold during stage 9b autonomy promotion)
    are EXCLUDED. The hard-gate at score_candidates() then treats them like
    unregistered, which forces stage 4 down the composer path so real atomic
    content lands instead of the scaffold's empty render.php stub. Once a
    scaffold-grade block is polished to version >= 1.0 it becomes routable
    automatically. Pass include_scaffolds=True to get every promoted slug
    (used by autonomy-chain duplicate detection, not by routing).
    """
    registered: set[str] = set()
    if not blocks_dir.exists():
        return registered
    for block_json in blocks_dir.glob("*/block.json"):
        try:
            data = json.loads(block_json.read_text(encoding="utf-8"))
            name = data.get("name")
            if not isinstance(name, str) or not name:
                continue
            version = str(data.get("version", ""))
            if not include_scaffolds and version == "0.1.0-scaffold":
                continue
            registered.add(name)
        except (json.JSONDecodeError, OSError):
            continue
    return registered


def discover_scaffold_blocks(blocks_dir: Path = SGS_BLOCKS_SRC) -> set[str]:
    """Return block slugs that are currently at scaffold version (0.1.0-scaffold).

    These blocks exist in the codebase but are not yet promoted to v1.0+.
    score_candidates() uses this set to give scaffold blocks a graceful
    confidence penalty (0.5) rather than treating them as entirely absent --
    which previously caused the autonomy chain to re-create blocks that already
    existed as scaffolds (2026-05-14 fix, Q1.3 of diagnostic synthesis).

    This is intentionally a SEPARATE function from discover_registered_blocks()
    so callers that only care about routable production blocks are unaffected.
    """
    scaffolds: set[str] = set()
    if not blocks_dir.exists():
        return scaffolds
    for block_json in blocks_dir.glob("*/block.json"):
        try:
            data = json.loads(block_json.read_text(encoding="utf-8"))
            name = data.get("name")
            if not isinstance(name, str) or not name:
                continue
            version = str(data.get("version", ""))
            if version == "0.1.0-scaffold":
                scaffolds.add(name)
        except (json.JSONDecodeError, OSError):
            continue
    return scaffolds


def discover_registered_patterns(patterns_dir: Path = SGS_PATTERNS_DIR) -> set[str]:
    """Return pattern slugs by reading *.php filenames in the patterns directory.

    Pattern slugs are plain filenames without the .php extension and without a
    namespace prefix -- e.g. `featured-product.php` yields `featured-product`.
    This mirrors the way WordPress registers patterns from theme/sgs-theme/
    patterns/ (filename-based, no sgs/ prefix).

    The caller that wants to match a candidate slug of the form `sgs/<name>`
    should strip the `sgs/` prefix before comparing against this set.

    Added 2026-05-14 (Q1.2 of diagnostic synthesis) to support the pattern-
    level matching tier in score_candidates().
    """
    patterns: set[str] = set()
    if not patterns_dir.exists():
        return patterns
    for php_file in patterns_dir.glob("*.php"):
        patterns.add(php_file.stem)
    return patterns


def score_candidates(
    boundary: dict,
    registered_blocks: set[str] | None = None,
    registered_patterns: set[str] | None = None,
    scaffold_blocks: set[str] | None = None,
    run_dir: "Path | None" = None,
) -> list[dict]:
    """Rank candidate block/pattern slugs for a single boundary.

    Args:
      boundary: a single dict from per-section-convention-voter.py output
      registered_blocks: optional pre-loaded set of block slugs; auto-discovered
        if None (production blocks only, scaffold-version excluded)
      registered_patterns: optional pre-loaded set of pattern slugs (no sgs/
        prefix); auto-discovered from theme/sgs-theme/patterns/ if None
      scaffold_blocks: optional pre-loaded set of scaffold-version block slugs;
        auto-discovered if None

    Returns:
      Ordered list of candidate dicts (highest-confidence first):
        [{block_name, confidence, tie_breaker, registered, kind, ...}, ...]

      kind values:
        "block"   -- maps to a registered (v1.0+) SGS block, OR a scaffold-
                     version block (scaffold=True, confidence 0.5)
        "pattern" -- maps to a registered theme pattern (block_name prefixed
                     with "pattern:" so the orchestrator can route it)
    """
    if registered_blocks is None:
        registered_blocks = discover_registered_blocks()
    if registered_patterns is None:
        registered_patterns = discover_registered_patterns()
    if scaffold_blocks is None:
        scaffold_blocks = discover_scaffold_blocks()

    candidate_slug = boundary.get("candidate_block_slug", "")
    voter_confidence = float(boundary.get("candidate_confidence", 0.0))
    fallback = boundary.get("fallback_strategy", "")
    class_signature = boundary.get("class_signature", [])

    # Derive a bare slug (without sgs/ prefix) for pattern lookup.
    bare_slug = candidate_slug[len("sgs/"):] if candidate_slug.startswith("sgs/") else candidate_slug

    candidates: list[dict] = []

    # -----------------------------------------------------------------------
    # Tier 1 -- registered production block (confidence == voter confidence,
    # typically 1.0 for SGS-BEM literal matches).
    #
    # HARD GATE (Phase 5g.1, 2026-05-13): if the slug is not a registered SGS
    # block we DROP the candidate entirely. Previously we kept it at confidence
    # 0.75, which let the orchestrator emit `<!-- wp:sgs/<unregistered> /-->`
    # block-comments that WP silently dropped (Mama's homepage 2026-05-13 lost
    # 6 of 9 sections this way). Dropping forces the section into the
    # bucket-c-classifier + atomic-block-scaffold autonomy path at stage 9.
    # -----------------------------------------------------------------------
    if candidate_slug and candidate_slug in registered_blocks:
        candidates.append({
            "block_name": candidate_slug,
            "confidence": voter_confidence,
            "tie_breaker": fallback,
            "registered": True,
            "kind": "block",
        })

    # -----------------------------------------------------------------------
    # Tier 2 -- registered pattern match (confidence 0.95).
    #
    # Added 2026-05-14 (Q1.2): the captured rule feedback_classes_map_to_
    # patterns_not_blocks states that mockup-section classes map to PATTERNS
    # (composite containers -- header, footer, hero composites, etc.), not
    # single blocks. If the voter nominates a slug that has no registered
    # block, but a pattern exists for the bare name, surface it here.
    # Patterns are slightly below blocks (0.95 vs 1.0) so blocks always win
    # when both exist for the same slug.
    # -----------------------------------------------------------------------
    if candidate_slug and candidate_slug not in registered_blocks and bare_slug in registered_patterns:
        candidates.append({
            "block_name": f"pattern:{bare_slug}",
            "confidence": 0.95,
            "tie_breaker": "literal-pattern-match",
            "registered": True,
            "kind": "pattern",
        })

    # -----------------------------------------------------------------------
    # Tier 3 -- scaffold-version block (confidence 0.5).
    #
    # Added 2026-05-14 (Q1.3): scaffolds are now discovered rather than being
    # completely invisible. A scaffold match is only emitted when neither a
    # production block nor a pattern was found for this slug -- the lower
    # confidence still guides the orchestrator towards real implementations
    # while preventing the autonomy chain from re-creating existing scaffolds.
    # -----------------------------------------------------------------------
    if (
        candidate_slug
        and candidate_slug not in registered_blocks
        and bare_slug not in registered_patterns
        and candidate_slug in scaffold_blocks
    ):
        candidates.append({
            "block_name": candidate_slug,
            "confidence": 0.5,
            "tie_breaker": "scaffold-version-match",
            "registered": True,
            "kind": "block",
            "scaffold": True,
        })

    # -----------------------------------------------------------------------
    # Secondary candidates from class signature (existing behaviour, preserved).
    # Scans for additional sgs- classes that map to registered production blocks.
    # Useful when a section wraps a known composite block (e.g. a hero pattern
    # that contains sgs-trust-bar inside it).
    # -----------------------------------------------------------------------
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
                "kind": "block",
            })

    # If nothing surfaced, emit the deferred-fallback candidate.
    if not candidates:
        candidates.append({
            "block_name": "core/group",
            "confidence": 0.0,
            "tie_breaker": "deferred-no-match",
            "registered": False,
            "kind": "block",
        })

    # Sort: confidence desc, then composite priority desc.
    candidates.sort(
        key=lambda c: (
            -c["confidence"],
            -COMPOSITE_PRIORITY.get(c["block_name"], 0),
        )
    )

    # Trace: Stage 2 confidence matrix scoring result for this boundary.
    tr = (_Trace.for_run(run_dir) if _Trace else None)
    if tr:
        try:
            tr.event(
                stage="stage_2_confidence_matrix",
                boundary_id=boundary.get("boundary_id"),
                section_id=boundary.get("section_id"),
                voter_candidate_slug=candidate_slug,
                voter_confidence=voter_confidence,
                top_pick=candidates[0]["block_name"] if candidates else None,
                top_confidence=candidates[0]["confidence"] if candidates else 0.0,
                top_tie_breaker=candidates[0]["tie_breaker"] if candidates else None,
                candidates_count=len(candidates),
                considered=candidates,
            )
        except Exception:
            pass

    return candidates


def build_matrix(voter_output: dict, registered_blocks: set[str] | None = None,
                 run_dir: "Path | None" = None) -> dict:
    """Run score_candidates against every boundary in the voter output."""
    if registered_blocks is None:
        registered_blocks = discover_registered_blocks()

    # Pre-load patterns and scaffolds once for the whole matrix pass.
    registered_patterns = discover_registered_patterns()
    scaffold_blocks = discover_scaffold_blocks()

    matches: list[dict] = []
    for boundary in voter_output.get("boundaries", []):
        ranked = score_candidates(
            boundary,
            registered_blocks=registered_blocks,
            registered_patterns=registered_patterns,
            scaffold_blocks=scaffold_blocks,
            run_dir=run_dir,
        )
        top = ranked[0]
        # Trace: Stage 2 matrix emit — top pick per boundary (call-site 5).
        tr = (_Trace.for_run(run_dir) if _Trace else None)
        if tr:
            try:
                tr.event(
                    stage="stage_2_matrix_emit",
                    boundary_id=boundary["boundary_id"],
                    section_id=boundary.get("section_id"),
                    block_name=top["block_name"],
                    confidence=top["confidence"],
                    alternatives_count=len(ranked[1:]),
                )
            except Exception:
                pass
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
    import sys as _sys
    _argv = _sys.argv[1:]

    # -----------------------------------------------------------------------
    # Standalone verification block (2026-05-14).
    # Runs when the file is executed directly; skipped on import.
    # -----------------------------------------------------------------------
    if not _argv or _argv == ["--verify"]:
        print("=== confidence-matrix.py verification ===\n")

        blocks = discover_registered_blocks()
        print(f"1. discover_registered_blocks()  -> {len(blocks)} production blocks")

        scaffolds = discover_scaffold_blocks()
        print(f"2. discover_scaffold_blocks()    -> {len(scaffolds)} scaffold blocks")
        sample_scaffolds = sorted(scaffolds)[:5]
        print(f"   first 5: {sample_scaffolds}")

        patterns = discover_registered_patterns()
        print(f"3. discover_registered_patterns() -> {len(patterns)} patterns")
        sample_patterns = sorted(patterns)[:5]
        print(f"   first 5: {sample_patterns}")

        # Fake boundary: .sgs-featured-product (block + pattern both deleted
        # 2026-05-14 — expected output: deferred-no-match, confidence 0.0)
        boundary_pattern = {
            "boundary_id": "test-1",
            "candidate_block_slug": "sgs/featured-product",
            "candidate_confidence": 1.0,
            "fallback_strategy": "literal-slug-match",
            "class_signature": ["sgs-featured-product"],
        }
        result_pattern = score_candidates(boundary_pattern)
        print("\n4. score_candidates({'selector': 'section.sgs-featured-product'}):")
        for c in result_pattern:
            print(f"   {c}")

        # Fake boundary: .sgs-hero (block match expected -- hero is a real block)
        boundary_hero = {
            "boundary_id": "test-2",
            "candidate_block_slug": "sgs/hero",
            "candidate_confidence": 1.0,
            "fallback_strategy": "literal-slug-match",
            "class_signature": ["sgs-hero"],
        }
        result_hero = score_candidates(boundary_hero)
        print("\n5. score_candidates({'selector': 'section.sgs-hero'}):")
        for c in result_hero:
            print(f"   {c}")

        print("\n=== done ===")
    else:
        _sys.exit(main())
