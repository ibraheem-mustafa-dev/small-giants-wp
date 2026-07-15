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


def _load_db_lookup():
    """Lazy-load db_lookup helpers; soft-fail to (None, None) if unavailable.

    Returns (legacy_role_lookup_for, is_class_section_block).

    Repointed to converter/db/db_lookup.py (EXECUTION Step 10, 2026-07-04) —
    the canonical implementation moved there in Step 9; the old
    orchestrator/converter_v2/db_lookup.py path is now a re-export shim.
    """
    import importlib.util as _ilu
    here = Path(__file__).resolve()
    for ancestor in here.parents:
        candidate = ancestor / "converter" / "db" / "db_lookup.py"
        if candidate.exists():
            spec = _ilu.spec_from_file_location("db_lookup", candidate)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return (
                    getattr(mod, "legacy_role_lookup_for", None),
                    getattr(mod, "is_class_section_block", None),
                )
            except Exception:
                return (None, None)
    return (None, None)


_legacy_role_lookup_for, _is_class_section_block = _load_db_lookup()


def _load_trace():
    """Lazy-load orchestrator.trace.Trace; soft-fail to a no-op if unavailable."""
    import importlib.util as _ilu
    from pathlib import Path as _Path
    here = _Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "orchestrator" / "trace.py"
        if candidate.exists():
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
        candidate2 = parent / "trace.py"
        if candidate2.exists() and parent.name == "orchestrator":
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate2)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
    return None

_Trace = _load_trace()

try:
    from bs4 import BeautifulSoup, Tag
except ImportError:
    sys.exit("beautifulsoup4 required: pip install beautifulsoup4")


# Spec 12 section 8 / Spec 31 lookup — legacy/non-conforming kebab roles -> SGS slug.
# Bean-controlled drafts produced after 2026-05-10 should NOT need this lookup
# (they use the SGS-prefixed BEM convention). Used for live-scrape fallback +
# pre-rule mockups via the --legacy flag.
#
# D99 2026-05-29: the 16 section-scope entries now live in the unified `slots`
# table (scope='section') in sgs-framework.db. The retired `legacy_role_lookup`
# table has been dropped. db_lookup.legacy_role_lookup_for() queries
# `slots WHERE scope='section'` and the API is unchanged.
#
# At runtime the voter calls _legacy_role_lookup_for() (loaded from
# db_lookup.legacy_role_lookup_for via lazy import). If the DB is unavailable
# the function soft-fails to None and the section is flagged as a gap-candidate.
#
# LEGACY_ROLE_LOOKUP is retained as an empty dict so that any downstream code
# that references it by name (e.g. detect_convention, existing tests) still
# imports cleanly without AttributeError. It is NOT consulted at runtime —
# all resolution now goes through _legacy_role_lookup_for().
LEGACY_ROLE_LOOKUP: dict[str, str] = {}

# Retired SGS blocks that now live as theme patterns. Maps the SGS-BEM
# slug-root (e.g. "heritage-strip" from class "sgs-heritage-strip") to the
# pattern bare slug registered in theme/sgs-theme/patterns/*.php. Surfaced
# via confidence-matrix Tier 2 pattern match, which emits block_name
# "pattern:<slug>" so the orchestrator routes to the pattern's PHP file.
#
# Distinct from LEGACY_ROLE_LOOKUP (above): that lookup is for pre-SGS-BEM
# kebab-semantic classes encountered under --legacy mode. This dict fires
# on canonical SGS-BEM mockups where a block was retired post-Spec-13.
#
# Heritage-strip remap removed 2026-05-21 — retired blocks should be
# hard-deleted across all surfaces (files, refs, DB rows). The 8 Indus Foods
# files that previously referenced heritage-strip were migrated to brand in
# Wave 3d. This dict is retained as an empty placeholder; future "no permanent
# remap" is the rule. See feedback_universal_extraction_no_per_block_legacy.md
# + decisions.md.
#
# TODO: Once Wave 3d Indus migration is verified clean, the consultation branch
# below (if slug_root in RETIRED_BLOCK_REMAP / if cls in RETIRED_BLOCK_REMAP)
# can be physically removed in a follow-up commit.
RETIRED_BLOCK_REMAP: dict[str, str] = {}

# Invariant: a slug-root can be in LEGACY_ROLE_LOOKUP or RETIRED_BLOCK_REMAP but
# never both. Both dicts are now empty, so this invariant trivially holds.
# Retained as a guard against future non-empty additions to either dict.
assert not (LEGACY_ROLE_LOOKUP.keys() & RETIRED_BLOCK_REMAP.keys()), (
    "LEGACY_ROLE_LOOKUP and RETIRED_BLOCK_REMAP must have disjoint keys; "
    f"collision: {LEGACY_ROLE_LOOKUP.keys() & RETIRED_BLOCK_REMAP.keys()}"
)


def _registered_block_slug_roots() -> set[str]:
    """Read sgs-framework.db for currently-registered block slugs, returned as
    bare slug roots (e.g. 'hero' from 'sgs/hero'). Cached at module load.

    Soft-fail to empty set if DB is missing/unreadable — the assertion below
    is a guardrail against re-registering a retired slug, not a hard runtime
    dependency. The voter still functions if the DB read fails.
    """
    import sqlite3 as _sql
    from pathlib import Path as _P
    # Canonical DB path (same as orchestrator.converter_v2.db_lookup.SGS_DB):
    # ~/.claude/skills/sgs-wp-engine/sgs-framework.db. The block registry
    # (blocks table) lives there, not in the plugin-local converter DB.
    db_path = _P.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
    if not db_path.exists():
        return set()
    try:
        conn = _sql.connect(f"file:{db_path}?mode=ro", uri=True)
        rows = conn.execute("SELECT slug FROM blocks").fetchall()
        conn.close()
    except Exception:
        return set()
    return {r[0][len("sgs/"):] for r in rows if r[0] and r[0].startswith("sgs/")}


# P-VOTER-IMPORT-ASSERT-UX (closed 2026-05-17):
# The original import-time assert was moved to a deferred function so that a
# collision produces a clear RuntimeError with actionable guidance instead of a
# bare AssertionError that crashes the pipeline at import with no operator context.
# The check still fires exactly once per process (guarded by _RETIRED_COLLISION_CHECKED).
# DB-missing path now emits a visible warning to stderr instead of silently skipping.
_REGISTERED = _registered_block_slug_roots()
_RETIRED_COLLISION_CHECKED: bool = False


def _assert_no_retired_block_collision() -> None:
    """Check that no RETIRED_BLOCK_REMAP key collides with a registered block slug.

    Called once per process from vote_block_slug() on first invocation.
    Raises RuntimeError (not AssertionError) so the pipeline surfaces a clear
    operator message with actionable resolution steps.

    Closes parking entry P-VOTER-IMPORT-ASSERT-UX (2026-05-17).
    """
    global _RETIRED_COLLISION_CHECKED
    if _RETIRED_COLLISION_CHECKED:
        return
    _RETIRED_COLLISION_CHECKED = True

    registered = _REGISTERED
    if not registered:
        # DB was missing or unreadable at module load — warn, don't crash.
        # The guard is a safety net, not a hard runtime requirement.
        import sys as _sys
        _sys.stderr.write(
            "[voter] WARN: sgs-framework.db missing or unreadable; "
            "retired-block collision check skipped.\n"
        )
        return

    collision = RETIRED_BLOCK_REMAP.keys() & registered
    if collision:
        from pathlib import Path as _P
        remap_location = _P(__file__).resolve()
        raise RuntimeError(
            f"RETIRED_BLOCK_REMAP collision with registered block(s): "
            f"{sorted(collision)}. "
            f"To resolve: either remove the colliding entry from RETIRED_BLOCK_REMAP "
            f"(in {remap_location}) OR rename the registered block in sgs-framework.db. "
            f"Re-registering a retired slug means the remap would silently shadow it."
        )

# Tags treated as candidate top-level sections during auto-detection.
SECTION_TAGS = ("section", "header", "footer", "main", "aside", "nav")


def _is_known_legacy_role(cls: str) -> bool:
    """Return True if cls is a recognised legacy kebab role (DB lookup)."""
    if _legacy_role_lookup_for is not None:
        return _legacy_role_lookup_for(cls) is not None
    return False


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
    non_sgs = [c for c in class_signature if not c.startswith("sgs-")]
    has_kebab_role = any(
        _is_known_legacy_role(c) or "-" in c
        for c in non_sgs
    )
    if has_sgs and has_kebab_role:
        # Only flag mixed if the non-prefixed class is a recognised role,
        # not just any kebab-case utility class.
        if any(_is_known_legacy_role(c) for c in non_sgs):
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
    # P-VOTER-IMPORT-ASSERT-UX (closed 2026-05-17): deferred collision check
    # fires on the first call instead of at import time, giving a clear
    # RuntimeError with actionable guidance rather than a bare AssertionError.
    _assert_no_retired_block_collision()

    # SGS-prefixed BEM. Two passes: retired-block remap takes precedence over
    # the literal-slug match, scanned across ALL sgs- classes so a wrapper-
    # utility class listed first (e.g. ["sgs-section", "sgs-heritage-strip"])
    # doesn't shadow a retired-block class listed later.
    sgs_bem_classes = [
        cls for cls in class_signature
        if cls.startswith("sgs-") and "--" not in cls and "__" not in cls
    ]
    for cls in sgs_bem_classes:
        slug_root = cls[len("sgs-"):]
        if slug_root in RETIRED_BLOCK_REMAP:
            return (RETIRED_BLOCK_REMAP[slug_root], 0.95, "retired-block-remap")
    if sgs_bem_classes:
        slug_root = sgs_bem_classes[0][len("sgs-"):]
        proposed_slug = f"sgs/{slug_root}"
        # Class-section equivalent: only blocks with tier='class-section' may be
        # returned by literal-slug match at section scope (per Spec 22 §FR-22-3
        # exception 3 + D1 explicit is_section_root flag). Everything else
        # falls through to gap-candidate routing → Stage 2 FR-22-4 container
        # default routes to sgs/container.
        if _is_class_section_block is not None and _is_class_section_block(proposed_slug):
            return (proposed_slug, 1.0, "class-section-block-equivalent")
        return ("", 0.0, "gap-candidate-class-section")

    # Legacy kebab-semantic: DB-driven lookup (migrated from hardcoded dict 2026-05-21).
    for cls in class_signature:
        if _legacy_role_lookup_for is not None:
            db_slug = _legacy_role_lookup_for(cls)
            if db_slug is not None:
                return (db_slug, 0.85, "spec-12-lookup")
        if cls in RETIRED_BLOCK_REMAP:
            # RETIRED_BLOCK_REMAP is now empty (see comment above the dict).
            # This branch is a no-op but retained until Wave 3d Indus migration
            # is verified clean and the branch can be removed in a follow-up commit.
            return (RETIRED_BLOCK_REMAP[cls], 0.85, "retired-block-remap-legacy")

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


def build_boundary(node: Tag, selector: str, used_ids: set[str], idx: int,
                   run_dir: Path | None = None) -> dict:
    """Build a single boundary dict for one section node."""
    class_signature = collect_class_signature(node)
    convention = detect_convention(class_signature)
    slug, confidence, fallback = vote_block_slug(class_signature, convention)
    semantic_role_hint = slug.split("/")[-1] if slug else (class_signature[0] if class_signature else "unknown")
    section_id = derive_section_id(node, class_signature, used_ids)

    # Trace: Stage 1 convention vote decision.
    tr = (_Trace.for_run(run_dir) if _Trace else None)
    if tr:
        try:
            tr.event(
                stage="stage_1_convention_vote",
                boundary_id=f"b{idx}",
                selector=selector,
                class_signature=class_signature,
                convention=convention,
                candidate_block_slug=slug,
                candidate_confidence=confidence,
                fallback_strategy=fallback,
            )
        except Exception:
            pass

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
    """Walk the page top-down, return (node, selector) for every top-level
    landmark section.

    Treats `<main>` (and any other landmark whose role is to contain inner
    sections rather than be the section itself) as a transparent container:
    the inner `<section>` children get promoted to top-level boundaries.
    This matches the canonical SGS mockup shape -- body > header + main + footer
    where main wraps the content sections (hero, trust-bar, featured-product,
    brand, ingredients-section, gift-section, social-proof).
    """
    out: list[tuple[Tag, str]] = []
    body = soup.body or soup

    # Tags that are landmark CONTAINERS rather than themselves leaf sections.
    # When we hit one, we walk into it for child sections rather than
    # treating it as a single section.
    transparent_containers = {"main", "article"}

    def emit_section(node: Tag) -> None:
        classes = collect_class_signature(node)
        selector = f"{node.name}.{classes[0]}" if classes else node.name
        out.append((node, selector))

    for child in body.find_all(recursive=False):
        if not isinstance(child, Tag):
            continue
        if child.name in transparent_containers:
            # Promote inner section-tag children to top-level boundaries.
            inner_sections = [
                c for c in child.find_all(recursive=False)
                if isinstance(c, Tag) and c.name in SECTION_TAGS
            ]
            if inner_sections:
                for inner in inner_sections:
                    emit_section(inner)
            else:
                # No inner sections -- treat the container itself as a section.
                emit_section(child)
        elif child.name in SECTION_TAGS:
            emit_section(child)

    # Fallback: if body had no direct landmark children, walk deeper.
    if not out and body:
        for child in body.find_all(SECTION_TAGS, recursive=True):
            emit_section(child)
    return out


def vote(mockup_path: Path, section_selector: str | None, auto_section: bool,
         run_dir: Path | None = None) -> dict:
    """Top-level voting entry point. Returns orchestrator-compatible JSON dict."""
    html = mockup_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    used_ids: set[str] = set()
    boundaries: list[dict] = []

    if auto_section:
        for idx, (node, selector) in enumerate(auto_detect_sections(soup), start=1):
            boundaries.append(build_boundary(node, selector, used_ids, idx, run_dir=run_dir))
    else:
        if not section_selector:
            sys.exit("ERROR: --section required unless --auto-section set")
        node = find_section_node(soup, section_selector)
        if node is None:
            sys.exit(f"ERROR: selector {section_selector!r} matched zero nodes in {mockup_path}")
        boundaries.append(build_boundary(node, section_selector, used_ids, 1, run_dir=run_dir))

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

    # Derive run_dir from the --out path so trace events land in the same
    # pipeline-state/<run_id>/ folder that the orchestrator owns.
    run_dir: Path | None = args.out.parent if args.out else None
    result = vote(args.mockup, args.section, args.auto_section, run_dir=run_dir)
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
