#!/usr/bin/env python3
"""essence_match_detector.py — P2.iii block-variation system.

Spec 16 §FR6 extension: when the cv2 matcher finds a DOM node whose BEM
class does NOT resolve to a registered block (confidence < 1.0) but whose
slot fingerprint closely matches a registered block (confidence 0.70–0.90),
route to `register_block_variation()` instead of scaffolding a new block.

Examples:
  sgs-featured-product-card → sgs/product-card + {"variantStyle":"featured"}
  sgs-trial-product-card    → sgs/product-card + {"variantStyle":"trial"}
  sgs-hero--dark            → sgs/hero         + {"backgroundStyle":"dark"}

Architecture (pure functions, no DB side-effects):

  score_block_similarity(candidate_slug, registered_slug, extracted_attrs)
      Computes a 0.0–1.0 structural confidence score for the hypothesis
      "candidate is a variation of registered".

  detect_essence_match(bem_parse, extracted_attrs, theme_json)
      Entry point — tries all registered blocks, returns the best match
      if it falls in the 0.70–0.90 confidence band.

  EssenceMatchResult (dataclass)
      Structured output: parent_slug, variation_slug, variation_attrs,
      overrides, confidence, reasoning.

UK English in all comments + output.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Lazy-load db_lookup (same resolve strategy as convert.py)
# ---------------------------------------------------------------------------
def _load_db():
    """Return the db_lookup module, locating it relative to this file.

    Repointed to converter/db/db_lookup.py (EXECUTION Step 10, 2026-07-04) —
    the canonical implementation moved there in Step 9; the old
    orchestrator/converter_v2/db_lookup.py path is now a re-export shim.
    """
    import importlib.util
    from pathlib import Path
    here = Path(__file__).resolve().parent  # scripts/orchestrator/
    # converter/db canonical implementation (Step 9, 2026-07-04)
    db_path = here.parent / "converter" / "db" / "db_lookup.py"
    if not db_path.exists():
        # Try same directory (test harness may flatten the tree)
        db_path = here / "db_lookup.py"
    if not db_path.exists():
        raise ImportError(f"db_lookup.py not found near {here}")
    spec = importlib.util.spec_from_file_location("db_lookup", db_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


try:
    _db = _load_db()
except ImportError:
    _db = None  # Tests may inject a mock


# ---------------------------------------------------------------------------
# Confidence thresholds
# ---------------------------------------------------------------------------
ESSENCE_MATCH_LOW: float = 0.70   # minimum for essence-match tier
ESSENCE_MATCH_HIGH: float = 0.90  # above this → treat as full match (FR1)

# Weights used in the score formula (must sum to 1.0 for readability)
_W_SLOT_OVERLAP: float = 0.55   # fraction of candidate's attr names that the
                                  # registered block's schema also declares
_W_MODIFIER_SIGNAL: float = 0.20  # BEM modifier strongly signals a variant
_W_BLOCK_FRAGMENT: float = 0.25   # longest common block-name fragment ratio


# ---------------------------------------------------------------------------
# EssenceMatchResult
# ---------------------------------------------------------------------------
@dataclass
class EssenceMatchResult:
    """Result of an essence-match detection pass.

    Attributes:
        parent_slug       The registered block to emit (e.g. 'sgs/product-card').
        variation_slug    The variation name (e.g. 'featured') — used as
                          `register_block_variation()` name + as a variation
                          attr value (e.g. {'variantStyle': 'featured'}).
        variation_attrs   Pre-filled attribute overrides that make this node a
                          named variation of parent_slug.
        overrides         Extracted attrs that DIFFER from the variation defaults
                          (i.e. per-instance customisations).
        confidence        Score in [0.70, 0.90].
        reasoning         Human-readable list of signals that drove the score.
        tier              Always 'essence_match' for this result type.
    """
    parent_slug: str
    variation_slug: str
    variation_attrs: dict[str, Any] = field(default_factory=dict)
    overrides: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    reasoning: list[str] = field(default_factory=list)
    tier: str = "essence_match"

    def as_dict(self) -> dict:
        return {
            "tier": self.tier,
            "parent_slug": self.parent_slug,
            "variation_slug": self.variation_slug,
            "variation_attrs": self.variation_attrs,
            "overrides": self.overrides,
            "confidence": round(self.confidence, 4),
            "reasoning": self.reasoning,
        }


# ---------------------------------------------------------------------------
# Core scoring logic
# ---------------------------------------------------------------------------

def _longest_common_fragment_ratio(a: str, b: str) -> float:
    """Return the length of the longest common word-fragment / total words in b.

    Compares only the block-name portion (after 'sgs/'), ignoring the namespace
    prefix so 'sgs' itself never counts as a shared token.

    For 'sgs/featured-product-card' vs 'sgs/product-card':
        block names = 'featured-product-card' vs 'product-card'
        common words = {'product', 'card'} → 2 out of 2 in b → 1.0.
    For 'sgs/trial-hero' vs 'sgs/hero':
        common = {'hero'} → 1 out of 1 in b → 1.0.
    For 'sgs/info-box' vs 'sgs/product-card':
        b tokens = {'product', 'card'} — no overlap → 0.0.
    """
    # Strip namespace prefix; fall back to full string if no '/'
    block_a = a.split("/", 1)[-1] if "/" in a else a
    block_b = b.split("/", 1)[-1] if "/" in b else b
    parts_a = set(t for t in block_a.split("-") if t)
    parts_b = set(t for t in block_b.split("-") if t)
    common = parts_a & parts_b
    if not parts_b:
        return 0.0
    return len(common) / len(parts_b)


def _infer_modifier(candidate_slug: str, registered_slug: str) -> str | None:
    """Derive a variation modifier name from the candidate slug.

    If candidate_slug = 'sgs/featured-product-card' and registered_slug =
    'sgs/product-card', the modifier is 'featured'.

    Strategy: strip the registered block's name tokens from the candidate's
    tokens. Whatever remains (non-empty, hyphen-joined) is the modifier.
    """
    # Work on the block-name portion only (after 'sgs/')
    cand = candidate_slug.split("/", 1)[-1]   # 'featured-product-card'
    reg  = registered_slug.split("/", 1)[-1]  # 'product-card'
    reg_tokens = set(reg.split("-"))
    cand_tokens = cand.split("-")
    leftover = [t for t in cand_tokens if t not in reg_tokens]
    return "-".join(leftover) if leftover else None


def _slot_overlap_score(candidate_name: str, registered_slug: str,
                        extracted_attrs: dict,
                        db_mod=None) -> float:
    """Fraction of extracted attr names that are declared on registered_slug.

    A high overlap means the extracted slot fingerprint matches the registered
    block's schema — strong structural evidence they are the same essence.
    """
    if db_mod is None:
        db_mod = _db
    if db_mod is None:
        return 0.0
    try:
        schema = db_mod.block_attrs(registered_slug)
    except Exception:  # noqa: BLE001
        return 0.0
    if not schema:
        return 0.0
    extracted_keys = {k for k in extracted_attrs if not k.startswith("_")}
    if not extracted_keys:
        return 0.0
    matched = extracted_keys & set(schema.keys())
    return len(matched) / len(extracted_keys)


def score_block_similarity(
    candidate_slug: str,
    registered_slug: str,
    extracted_attrs: dict,
    db_mod=None,
) -> tuple[float, list[str]]:
    """Compute a confidence score for the hypothesis 'candidate ≈ registered'.

    Returns:
        (score 0.0–1.0, list of reasoning strings)

    The candidate is a block slug that was NOT found in the registered
    catalogue. The registered block IS registered. We ask: could the candidate
    be a variation of the registered block?

    The score is a weighted sum of three signals:
      1. slot_overlap     — extracted attrs vs registered schema
      2. modifier_signal  — candidate has a BEM modifier not in registered name
      3. block_fragment   — longest common token fragment ratio

    Score is clamped to [0, 1.0].
    """
    reasoning: list[str] = []

    # Signal 1: slot overlap
    slot_score = _slot_overlap_score(
        candidate_slug, registered_slug, extracted_attrs, db_mod=db_mod
    )
    reasoning.append(
        f"slot_overlap={slot_score:.2f} (attrs matched vs {registered_slug} schema)"
    )

    # Signal 2: BEM modifier signal
    modifier = _infer_modifier(candidate_slug, registered_slug)
    modifier_score = 0.8 if modifier else 0.0
    if modifier:
        reasoning.append(f"modifier_signal=0.80 (leftover token: '{modifier}')")
    else:
        reasoning.append("modifier_signal=0.00 (no leftover token)")

    # Signal 3: block-name fragment overlap
    frag_score = _longest_common_fragment_ratio(candidate_slug, registered_slug)
    reasoning.append(
        f"block_fragment={frag_score:.2f} "
        f"('{candidate_slug}' vs '{registered_slug}')"
    )

    total = (
        _W_SLOT_OVERLAP * slot_score
        + _W_MODIFIER_SIGNAL * modifier_score
        + _W_BLOCK_FRAGMENT * frag_score
    )
    total = max(0.0, min(1.0, total))
    reasoning.append(f"weighted_total={total:.4f}")
    return total, reasoning


# ---------------------------------------------------------------------------
# detect_essence_match — entry point for walk()
# ---------------------------------------------------------------------------

def detect_essence_match(
    candidate_slug: str,
    extracted_attrs: dict,
    db_mod=None,
) -> EssenceMatchResult | None:
    """Try all registered blocks as potential parents for candidate_slug.

    Returns:
        EssenceMatchResult when the best candidate scores in [0.70, 0.90).
        None when no match in band (< 0.70 → new-block scaffold territory;
        ≥ 0.90 → should have been caught by FR1 / block_exists).

    The caller (walk()) is responsible for the ≥ 0.90 case — it means
    block_exists() should have returned True. If it didn't, that's a DB
    state issue, not a detector issue.

    Universal: works for any block slug, any client. No Mama-specific logic.
    """
    if db_mod is None:
        db_mod = _db
    if db_mod is None:
        return None

    try:
        registered = db_mod.registered_block_slugs()
    except Exception:  # noqa: BLE001
        return None

    if not registered:
        return None

    # Already registered → FR1 handles it; don't enter the essence-match tier.
    if candidate_slug in registered:
        return None

    best_score: float = -1.0
    best_slug: str | None = None
    best_reasoning: list[str] = []

    for reg_slug in sorted(registered):  # sorted for deterministic ordering
        score, reasoning = score_block_similarity(
            candidate_slug, reg_slug, extracted_attrs, db_mod=db_mod
        )
        if score > best_score:
            best_score = score
            best_slug = reg_slug
            best_reasoning = reasoning

    if best_slug is None or not (ESSENCE_MATCH_LOW <= best_score < ESSENCE_MATCH_HIGH):
        return None

    # Derive modifier + variation attrs
    modifier = _infer_modifier(candidate_slug, best_slug)
    variation_slug = modifier or "default"

    # Build variation_attrs: what makes this a named variation.
    # Strategy: if the registered block has a 'variantStyle' attr in its schema,
    # use that. Otherwise fall back to a generic 'variationSlug' hint that the
    # PHP registration can consume.
    variation_attrs: dict[str, Any] = {}
    try:
        schema = db_mod.block_attrs(best_slug)
        if "variantStyle" in schema and modifier:
            variation_attrs["variantStyle"] = modifier
        elif modifier:
            variation_attrs["variationSlug"] = modifier
    except Exception:  # noqa: BLE001
        if modifier:
            variation_attrs["variationSlug"] = modifier

    # Overrides: extracted attrs that differ from the variation's defaults
    overrides = {
        k: v for k, v in extracted_attrs.items()
        if variation_attrs.get(k) != v and not k.startswith("_")
    }

    return EssenceMatchResult(
        parent_slug=best_slug,
        variation_slug=variation_slug,
        variation_attrs=variation_attrs,
        overrides=overrides,
        confidence=best_score,
        reasoning=best_reasoning,
    )


# ---------------------------------------------------------------------------
# collect_variation_registrations — used by the PHP generator
# ---------------------------------------------------------------------------

def collect_variation_registrations(
    run_results: list[dict],
    db_mod=None,
) -> list[dict]:
    """Aggregate unique variations from a pipeline run's essence-match events.

    run_results: list of dicts with keys:
        parent_slug, variation_slug, variation_attrs

    Returns a deduplicated list of variation registration descriptors:
        [{
            "parent_slug":     "sgs/product-card",
            "variation_slug":  "featured",
            "variation_attrs": {"variantStyle": "featured"},
            "title":           "Featured",
            "description":     "Auto-detected variation from /sgs-clone run",
        }, ...]

    Callers can pass this list to generate_variation_php() to produce
    PHP files in includes/variations/.
    """
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for entry in run_results:
        key = (entry.get("parent_slug", ""), entry.get("variation_slug", ""))
        if key in seen:
            continue
        seen.add(key)
        slug = entry.get("variation_slug", "default")
        out.append({
            "parent_slug":     entry.get("parent_slug", ""),
            "variation_slug":  slug,
            "variation_attrs": entry.get("variation_attrs", {}),
            "title":           slug.replace("-", " ").title(),
            "description":     "Auto-detected variation from /sgs-clone run",
        })
    return out


# ---------------------------------------------------------------------------
# generate_variation_php — emit PHP for includes/variations/
# ---------------------------------------------------------------------------

def generate_variation_php(variation: dict) -> str:
    """Generate a PHP snippet registering a block variation via JS.

    The variation is registered on `enqueue_block_editor_assets` via a small
    inline JS call — no compiled JS required, compatible with the current
    build pipeline.

    Returns a PHP string suitable for writing to
    `plugins/sgs-blocks/includes/variations/<slug>.php`.
    """
    parent = variation["parent_slug"]           # e.g. 'sgs/product-card'
    var_slug = variation["variation_slug"]       # e.g. 'featured'
    attrs = variation.get("variation_attrs", {})
    title = variation.get("title", var_slug.replace("-", " ").title())
    description = variation.get("description", "")

    # Serialise variation_attrs as JS object literal
    import json as _json
    attrs_js = _json.dumps(attrs)

    # Sanitise slug for use as a PHP identifier
    php_safe_slug = var_slug.replace("-", "_")
    parent_safe = parent.replace("/", "_").replace("-", "_")

    return f"""<?php
/**
 * Block variation: {parent} / {var_slug}
 *
 * Auto-generated by essence_match_detector.generate_variation_php().
 * DO NOT edit by hand — re-run /sgs-clone to regenerate.
 *
 * @package SGS\\Blocks
 */

namespace SGS\\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register the '{var_slug}' variation of {parent}.
 */
function sgs_register_variation_{parent_safe}_{php_safe_slug}(): void {{
\twp_add_inline_script(
\t\t'wp-blocks',
\t\t\"wp.blocks.registerBlockVariation(
\t\t\t'{parent}',
\t\t\t{{
\t\t\t\tname:        '{var_slug}',
\t\t\t\ttitle:       '{title}',
\t\t\t\tdescription: '{description}',
\t\t\t\tattributes:   {attrs_js},
\t\t\t\tscope:       ['inserter', 'transform'],
\t\t\t\tisDefault:   false,
\t\t\t}}
\t\t);\",
\t\t'after'
\t);
}}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\\\sgs_register_variation_{parent_safe}_{php_safe_slug}' );
"""


# ---------------------------------------------------------------------------
# CLI surface (for standalone use + testing)
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    import argparse
    import json as _json

    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_score = sub.add_parser("score", help="Score a candidate slug vs a registered slug")
    p_score.add_argument("--candidate", required=True)
    p_score.add_argument("--registered", required=True)
    p_score.add_argument("--attrs", default="{}", help="JSON dict of extracted attrs")

    p_detect = sub.add_parser("detect", help="Run essence-match detection")
    p_detect.add_argument("--candidate", required=True)
    p_detect.add_argument("--attrs", default="{}", help="JSON dict of extracted attrs")

    p_php = sub.add_parser("php", help="Generate PHP for a variation")
    p_php.add_argument("--parent", required=True)
    p_php.add_argument("--slug", required=True)
    p_php.add_argument("--attrs", default="{}", help="JSON dict of variation attrs")
    p_php.add_argument("--title", default="")

    args = parser.parse_args(argv)

    if args.cmd == "score":
        attrs = _json.loads(args.attrs)
        score, reasoning = score_block_similarity(args.candidate, args.registered, attrs)
        print(_json.dumps({"score": round(score, 4), "reasoning": reasoning}, indent=2))

    elif args.cmd == "detect":
        attrs = _json.loads(args.attrs)
        result = detect_essence_match(args.candidate, attrs)
        if result:
            print(_json.dumps(result.as_dict(), indent=2))
        else:
            print(_json.dumps({"result": None, "reason": "no essence match found"}, indent=2))

    elif args.cmd == "php":
        variation = {
            "parent_slug":    args.parent,
            "variation_slug": args.slug,
            "variation_attrs": _json.loads(args.attrs),
            "title":          args.title or args.slug.replace("-", " ").title(),
        }
        print(generate_variation_php(variation))

    return 0


if __name__ == "__main__":
    sys.exit(main())
