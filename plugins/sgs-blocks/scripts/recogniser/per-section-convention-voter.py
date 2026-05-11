#!/usr/bin/env python3
"""per-section-convention-voter.py -- Stage 1 of /sgs-clone pipeline.

Determines the naming convention used by each section of a mockup, derives
the class signature, and proposes a candidate SGS block slug per section.

For Spec-13-conforming drafts (SGS-prefixed BEM, e.g. `.sgs-hero`) this is
deterministic: strip `sgs-` -> block slug, confidence 1.0.

For non-conforming sections it falls back to the Spec 12 section 8 lookup
table (kebab-role -> SGS block slug). Sections with no recognised role are
flagged `gap-candidate` and routed to the leftover-bucket in Stage 9.

CLI:
  Single-section (current orchestrator default):
    python per-section-convention-voter.py \\
      --mockup sites/mamas-munches/mockups/homepage/index.html \\
      --section "section.sgs-hero" \\
      --out pipeline-state/<run_id>/voter.json

  Multi-section (Phase 8 forward):
    python per-section-convention-voter.py \\
      --mockup sites/mamas-munches/mockups/homepage/index.html \\
      --auto-section \\
      --out pipeline-state/<run_id>/voter.json

Output JSON shape (compatible with orchestrator stage_1_boundary output):
  {
    "boundaries": [
      {
        "boundary_id": "b1",
        "selector": "section.sgs-hero",
        "semantic_role_hint": "hero",
        "convention_per_section": "sgs-prefixed-bem",
        "fallback_strategy": "literal-slug-match",
        "class_signature": ["sgs-hero", ...],
        "candidate_block_slug": "sgs/hero",
        "candidate_confidence": 1.0,
        "section_id": "hero"
      },
      ...
    ],
    "convention_summary": {
      "primary": "sgs-prefixed-bem",
      "secondary": [],
      "mixed_sections_count": 0,
      "gap_candidate_count": 0
    }
  }
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

try:
    from bs4 import BeautifulSoup, Tag
except ImportError:
    sys.exit("beautifulsoup4 required: pip install beautifulsoup4")


# Spec 12 section 8 lookup table -- legacy/non-conforming kebab roles -> SGS slug.
# Bean-controlled drafts produced after 2026-05-10 should NOT need this table
# (they use the SGS-prefixed BEM convention). Kept for live-scrape fallback +
# pre-rule mockups via the --legacy flag.
LEGACY_ROLE_LOOKUP: dict[str, str] = {
    "hero": "sgs/hero",
    "trust-bar": "sgs/trust-bar",
    "trust-badges": "sgs/trust-bar",
    "featured-product": "sgs/featured-product",
    "brand-story": "sgs/info-box",
    "ingredients": "sgs/feature-grid",
    "ingredients-section": "sgs/feature-grid",
    "gift-section": "sgs/feature-grid",
    "social-proof": "sgs/testimonial",
    "site-header": "sgs/header",
    "site-footer": "sgs/footer",
    "header": "sgs/header",
    "footer": "sgs/footer",
    "heritage-strip": "sgs/heritage-strip",
    "cta": "sgs/cta-section",
    "cta-section": "sgs/cta-section",
    "testimonial": "sgs/testimonial",
    "testimonial-slider": "sgs/testimonial-slider",
}

# Tags treated as candidate top-level sections during auto-detection.
SECTION_TAGS = ("section", "header", "footer", "main", "aside", "nav")


def detect_convention(class_signature: list[str]) -> str:
    """Classify the naming convention of a section's class signature.

    Returns one of:
      sgs-prefixed-bem  -- one or more classes start with `sgs-` (Spec 13)
      kebab-semantic    -- kebab-case role names without the prefix (legacy)
      mixed             -- contains both conventions on the same section
      unknown           -- no recognisable convention
    """
    if not class_signature:
        return "unknown"
    has_sgs = any(c.startswith("sgs-") for c in class_signature)
    has_kebab_role = any(
        c in LEGACY_ROLE_LOOKUP or "-" in c
        for c in class_signature
        if not c.startswith("sgs-")
    )
    if has_sgs and has_kebab_role:
        # Only flag mixed if the non-prefixed class is a recognised role,
        # not just any kebab-case utility class.
        if any(c in LEGACY_ROLE_LOOKUP for c in class_signature if not c.startswith("sgs-")):
            return "mixed"
        return "sgs-prefixed-bem"
    if has_sgs:
        return "sgs-prefixed-bem"
    if has_kebab_role:
        return "kebab-semantic"
    return "unknown"


def vote_block_slug(class_signature: list[str], convention: str) -> tuple[str, float, str]:
    """Vote on the candidate SGS block slug for a section.

    Returns (slug, confidence, fallback_strategy).
    """
    # SGS-prefixed BEM: literal strip of the prefix wins.
    for cls in class_signature:
        if cls.startswith("sgs-") and "--" not in cls and "__" not in cls:
            slug_root = cls[len("sgs-"):]
            return (f"sgs/{slug_root}", 1.0, "literal-slug-match")

    # Legacy kebab-semantic: lookup table.
    for cls in class_signature:
        if cls in LEGACY_ROLE_LOOKUP:
            return (LEGACY_ROLE_LOOKUP[cls], 0.85, "spec-12-lookup")

    # No match -- gap candidate.
    return ("", 0.0, "gap-candidate")


def derive_section_id(node: Tag, class_signature: list[str], used_ids: set[str]) -> str:
    """Stable section id: explicit id attribute > first sgs- class > first class."""
    node_id = node.get("id")
    if node_id:
        candidate = str(node_id).strip()
    else:
        candidate = ""
        for cls in class_signature:
            if cls.startswith("sgs-") and "--" not in cls and "__" not in cls:
                candidate = cls[len("sgs-"):]
                break
        if not candidate and class_signature:
            candidate = class_signature[0]
        if not candidate:
            candidate = f"section-{len(used_ids) + 1}"

    base = candidate
    suffix = 2
    while candidate in used_ids:
        candidate = f"{base}-{suffix}"
        suffix += 1
    used_ids.add(candidate)
    return candidate


def collect_class_signature(node: Tag) -> list[str]:
    """Top-level class list for the section node (the section's own classes)."""
    classes = node.get("class") or []
    if isinstance(classes, str):
        classes = classes.split()
    return [c for c in classes if c]


def build_boundary(node: Tag, selector: str, used_ids: set[str], idx: int) -> dict:
    """Build a single boundary dict for one section node."""
    class_signature = collect_class_signature(node)
    convention = detect_convention(class_signature)
    slug, confidence, fallback = vote_block_slug(class_signature, convention)
    semantic_role_hint = slug.split("/")[-1] if slug else (class_signature[0] if class_signature else "unknown")
    section_id = derive_section_id(node, class_signature, used_ids)

    return {
        "boundary_id": f"b{idx}",
        "selector": selector,
        "section_id": section_id,
        "semantic_role_hint": semantic_role_hint,
        "convention_per_section": convention,
        "fallback_strategy": fallback,
        "class_signature": class_signature,
        "candidate_block_slug": slug,
        "candidate_confidence": confidence,
    }


def find_section_node(soup: BeautifulSoup, selector: str) -> Tag | None:
    """Resolve a CSS selector (e.g. 'section.sgs-hero') to a single node."""
    matches = soup.select(selector)
    return matches[0] if matches else None


def auto_detect_sections(soup: BeautifulSoup) -> list[tuple[Tag, str]]:
    """Walk the page top-down, return (node, selector) for each top-level section."""
    out: list[tuple[Tag, str]] = []
    body = soup.body or soup
    for child in body.find_all(recursive=False):
        if not isinstance(child, Tag):
            continue
        if child.name in SECTION_TAGS:
            classes = collect_class_signature(child)
            if classes:
                selector = f"{child.name}.{classes[0]}"
            else:
                selector = child.name
            out.append((child, selector))
    # If body had no direct section children, walk one level deeper -- common
    # when the mockup wraps everything in <div class="page">.
    if not out and body:
        for child in body.find_all(SECTION_TAGS, recursive=True):
            classes = collect_class_signature(child)
            if classes:
                selector = f"{child.name}.{classes[0]}"
            else:
                selector = child.name
            out.append((child, selector))
    return out


def vote(mockup_path: Path, section_selector: str | None, auto_section: bool) -> dict:
    """Top-level voting entry point. Returns orchestrator-compatible JSON dict."""
    html = mockup_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    used_ids: set[str] = set()
    boundaries: list[dict] = []

    if auto_section:
        for idx, (node, selector) in enumerate(auto_detect_sections(soup), start=1):
            boundaries.append(build_boundary(node, selector, used_ids, idx))
    else:
        if not section_selector:
            sys.exit("ERROR: --section required unless --auto-section set")
        node = find_section_node(soup, section_selector)
        if node is None:
            sys.exit(f"ERROR: selector {section_selector!r} matched zero nodes in {mockup_path}")
        boundaries.append(build_boundary(node, section_selector, used_ids, 1))

    convention_counter = Counter(b["convention_per_section"] for b in boundaries)
    most_common = convention_counter.most_common()
    primary = most_common[0][0] if most_common else "unknown"
    secondary = [c for c, _ in most_common[1:]]

    return {
        "boundaries": boundaries,
        "convention_summary": {
            "primary": primary,
            "secondary": secondary,
            "mixed_sections_count": convention_counter.get("mixed", 0),
            "gap_candidate_count": sum(1 for b in boundaries if b["fallback_strategy"] == "gap-candidate"),
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--mockup", type=Path, required=True, help="Path to mockup HTML file")
    parser.add_argument("--section", type=str, default=None, help="CSS selector for a single section")
    parser.add_argument("--auto-section", action="store_true", help="Auto-detect all top-level sections")
    parser.add_argument("--out", type=Path, default=None, help="Write JSON here (default: stdout)")
    args = parser.parse_args(argv)

    if not args.mockup.exists():
        sys.exit(f"ERROR: mockup not found at {args.mockup}")

    result = vote(args.mockup, args.section, args.auto_section)
    payload = json.dumps(result, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        print(f"[voter] wrote {args.out}")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
