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


def _bs4_to_dom_dict(el: "Tag") -> dict:
    """Normalise a BeautifulSoup Tag to the duck-typed dict shape
    dom_shape_classifier.py (Q1 Tier 2) expects: tag/classes/attrs keys."""
    classes = el.get("class") or []
    if isinstance(classes, str):
        classes = classes.split()
    return {"tag": el.name, "classes": list(classes), "attrs": dict(el.attrs)}


def dom_shape_hint_for_gap_candidate(node: Tag) -> dict | None:
    """Tier 2 (2026-09-14, BEM-recognition brainstorm doc Q1): for a section
    whose BEM recognition already failed (fallback_strategy ==
    'gap-candidate'), try a structural guess from the section's OWN shape --
    never asserted as ground truth, only ever an advisory hint the caller
    attaches to the boundary for leftover-bucket-router.py to enrich a gap
    entry with (never a new bucket, never a block assignment).

    Two structural signals checked, in priority order:
      1. The section's OWN direct children as a repeated-sibling group (the
         "N near-identical <div>/<article> nodes under one parent" case --
         the parent here IS this unrecognised section).
      2. Failing that, the section's first direct child's heading position
         (a bare <h1>/<h2> as the very first thing inside an unrecognised
         section is a hero/section-header candidate).

    The section's OWN root is passed with is_top_level=True (constraint 3 --
    a boundary built by this voter is, by construction, already a
    top-level section in the walker's sense; R-31-3 exception #2
    (SKIP_TOP_LEVEL_TAGS) already fully covers a bare landmark AT THIS
    granularity, so classify_landmark_tag correctly never fires from here).

    Soft-fails to None on any error -- an optional enrichment must never
    break Stage 1 boundary building.
    """
    try:
        _scripts_root = Path(__file__).resolve().parent.parent
        if str(_scripts_root) not in sys.path:
            sys.path.insert(0, str(_scripts_root))
        from recogniser import dom_shape_classifier as dsc

        children = node.find_all(True, recursive=False)
        siblings = (
            [_bs4_to_dom_dict(c) for c in children] if len(children) >= 2 else None
        )
        hint = dsc.classify_element(
            _bs4_to_dom_dict(node),
            collect_class_signature(node),
            is_top_level=True,
            siblings=siblings,
        )
        if hint is None and children:
            # BUG FIX (qc-council, 2026-09-14): this MUST be the first
            # child's own real class_signature, not []. An empty list makes
            # _any_class_already_canonical() trivially False regardless of
            # what the child actually carries -- confirmed empirically to
            # let classify_heading() fire on an element carrying a genuine
            # authored sgs-hero__headline class, violating constraint 1
            # (never override an authored identity, even partially).
            hint = dsc.classify_element(
                _bs4_to_dom_dict(children[0]),
                collect_class_signature(children[0]),
                is_first_child=True,
                is_top_level=False,
            )
        return hint.to_dict() if hint is not None else None
    except Exception:  # noqa: BLE001 -- optional enrichment, never fatal
        return None


def detect_source_builder(soup: "BeautifulSoup") -> str | None:
    """Document-level site-builder signal, computed ONCE per page.

    2026-09-14 (research-buddies): the professional way to detect Webflow is
    at the document level, not via class-name regex -- every real
    fingerprinting tool (Wappalyzer's actual source) checks `data-wf-site`/
    `data-wf-page` on <html> or the generator meta tag, confirmed present on
    every real Webflow export found (2014-2024). Advisory only -- a
    per-class certainty in stage1_boundary_hook.py::classify_w_prefixed
    always outranks this (handles a mixed Webflow-base + Tailwind-embed
    page correctly). Full research:
    C:/Users/Bean/.claude/memory/research/
    2026-09-14-webflow-vs-tailwind-class-detection.md

    Returns "webflow" | "tailwind" | None.
    """
    html_tag = soup.find("html")
    if html_tag is not None and (
        html_tag.has_attr("data-wf-site")
        or html_tag.has_attr("data-wf-page")
        or html_tag.has_attr("data-wf-domain")
    ):
        return "webflow"
    generator = soup.find("meta", attrs={"name": "generator"})
    if generator and "webflow" in (generator.get("content") or "").lower():
        return "webflow"
    for script in soup.find_all("script", src=True):
        if "tailwindcss.com" in script["src"]:
            return "tailwind"
    return None


def build_boundary(node: Tag, selector: str, used_ids: set[str], idx: int,
                   run_dir: Path | None = None,
                   source_builder: str | None = None) -> dict:
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

    boundary = {
        "boundary_id": f"b{idx}",
        "selector": selector,
        "section_id": section_id,
        "semantic_role_hint": semantic_role_hint,
        "convention_per_section": convention,
        "fallback_strategy": fallback,
        "class_signature": class_signature,
        "candidate_block_slug": slug,
        "candidate_confidence": confidence,
        # Tier 1 (2026-09-14, BEM-recognition brainstorm doc Q1): shadcn/
        # Radix's real identity signal is a data-slot attribute, not a class
        # name. Threaded through to stage1_boundary_hook.py::enrich_boundary
        # -> lingua_franca.convert_class_signature's data_slot param. None
        # for every other source -- harmless, `_try_data_slot()` no-ops on it.
        "data_slot": node.get("data-slot"),
        # Research-buddies (2026-09-14): page-level document signal, computed
        # once in vote() and passed straight through -- only ever consulted
        # by stage1_boundary_hook.py::classify_w_prefixed for the w-/h-
        # residue (a class matching neither the Webflow nor Tailwind closed
        # vocabulary).
        "source_builder": source_builder,
    }

    # Universal-pipeline upgrade, Piece 1 (2026-09-14, research-buddies
    # grounded): Claude Design `.dc.html` drafts carry ZERO classes -- the
    # only identity signal for wrapped content is the nearest `<sc-for>`/
    # `<sc-if>` ANCESTOR's binding variable name (these are tag names, not
    # attributes -- see sc_var_classifier.py's module docstring). Attached
    # unconditionally (cheap, no-op for every non-Claude-Design source) so
    # leftover-bucket-router.py can enrich a gap entry with it later; the
    # actual Hint is only ever computed below, gap-candidate-gated, same as
    # Tier 2's dom_shape_hint.
    _sc_wrapper = None
    try:
        _scripts_root = Path(__file__).resolve().parent.parent
        if str(_scripts_root) not in sys.path:
            sys.path.insert(0, str(_scripts_root))
        from recogniser import sc_var_classifier as _scv
        _sc_wrapper = _scv.nearest_sc_wrapper(node)
    except Exception:
        _sc_wrapper = None
    if _sc_wrapper is not None:
        boundary["sc_var_kind"] = _sc_wrapper["kind"]
        boundary["sc_var_name"] = _sc_wrapper["var_name"]
        if "hint_count" in _sc_wrapper:
            boundary["sc_var_hint_count"] = _sc_wrapper["hint_count"]

    # Tier 2 (2026-09-14, BEM-recognition brainstorm doc Q1): only attempted
    # for sections BEM recognition already failed on -- never for a
    # confidently-matched section. Advisory only; leftover-bucket-router.py
    # attaches it to the matching gap entry, never a block assignment.
    if fallback == "gap-candidate":
        dom_shape_hint = dom_shape_hint_for_gap_candidate(node)
        if dom_shape_hint is not None:
            boundary["dom_shape_hint"] = dom_shape_hint

    # Piece 1's Tier A (deterministic, no model call) -- `sc-if` is
    # deliberately excluded (research-buddies finding: it names a boolean
    # state flag, not a collection, so it is not a block-identity signal at
    # all). Fingerprint computed here (cheap) even on a Tier A hit, so a
    # later per-draft Haiku batch pass can key its committed cache the same
    # way whether or not Tier A already resolved this boundary.
    if fallback == "gap-candidate" and boundary.get("sc_var_kind") == "for":
        try:
            _scripts_root = Path(__file__).resolve().parent.parent
            if str(_scripts_root) not in sys.path:
                sys.path.insert(0, str(_scripts_root))
            from recogniser import sc_var_classifier as _scv
            children = node.find_all(True, recursive=False)
            child_tag_skeleton = [c.name for c in children]
            text_snippet = node.get_text(" ", strip=True)
            boundary["sc_var_fingerprint"] = _scv.content_fingerprint(
                var_name=boundary["sc_var_name"],
                wrapped_tag=node.name,
                child_tag_skeleton=child_tag_skeleton,
                text_snippet=text_snippet,
                sibling_var_names=[],
            )
            # qc-check finding (2026-09-14, direct repro before calling
            # Piece 1 done): passing only the section's OWN top-level
            # class_signature repeats qc-council's Tier 2 finding 1 -- a
            # stray authored SGS-BEM class on a DESCENDANT (not the section
            # root itself) must still suppress the hint, same as constraint
            # 1 requires for dom_shape_hint. Whole-subtree scan, not just
            # the section's own classes.
            subtree_class_signature = list(class_signature)
            for descendant in node.find_all(True):
                subtree_class_signature.extend(collect_class_signature(descendant))
            sc_var_hint = _scv.classify_sc_var_deterministic(
                boundary["sc_var_name"],
                boundary.get("sc_var_hint_count"),
                subtree_class_signature,
            )
            if sc_var_hint is not None:
                boundary["sc_var_hint"] = sc_var_hint.to_dict()
        except Exception:
            pass

    return boundary


def find_section_node(soup: BeautifulSoup, selector: str) -> Tag | None:
    """Resolve a CSS selector (e.g. 'section.sgs-hero') to a single node."""
    matches = soup.select(selector)
    return matches[0] if matches else None


def auto_detect_sections(soup: BeautifulSoup) -> list[tuple[Tag, str]]:
    """Walk the page top-down, return (node, selector) for every top-level
    landmark section.

    Universal recursive-descent, not a fixed-depth landmark lookup: any node
    whose tag is a LEAF_SECTION_TAG (`section`/`header`/`footer`/`aside`/
    `nav`) is emitted as a boundary and NOT recursed into further (its own
    children become that section's content, walked by later pipeline
    stages). Every other node -- whether a semantic landmark CONTAINER
    (`main`/`article`, which exists purely to wrap inner sections rather
    than be one), OR an INERT non-semantic wrapper (a `<div>`/`<span>` with
    no BEM class, no semantic tag, no registered block match -- e.g. a bare
    CSS grid wrapper the draft author added for layout only) -- is treated
    as a transparent pass-through and recursed into at ANY depth, not just
    one level.

    This is a deliberate, documented extension of the existing "transparent
    container" concept (previously hardcoded to {"main", "article"} and
    capped at one level of recursion) to be name-free and depth-unlimited,
    per CLAUDE.md Rule 3 (universal, no carve-outs): a section nested inside
    an inert wrapper div must be found exactly as if it were a direct child
    of body, regardless of how many inert layers separate them. An inert
    wrapper is never itself emitted as a section/gap-candidate -- it carries
    no naming signal to vote on, so surfacing it would just create a
    permanently-unresolvable gap-candidate boundary. It is invisible by
    design; only its section-like descendants become boundaries.

    Matches the canonical SGS mockup shape -- body > header + main + footer
    where main wraps the content sections (hero, trust-bar, featured-product,
    brand, ingredients-section, gift-section, social-proof) -- AND the
    product-page shape where main wraps a plain `<div class="product-page">`
    that itself wraps `<section class="product-gallery">` /
    `<section class="product-info">`.
    """
    out: list[tuple[Tag, str]] = []
    body = soup.body or soup

    # SECTION_TAGS includes "main" (it is a valid single-section shape when
    # a mockup has no inner <section> children at all -- see the fallback
    # branch below). But "main"/"article" are LANDMARK CONTAINERS whose
    # normal role is to wrap other sections, so they must never stop
    # recursion the way a leaf section tag does. Split the two concerns.
    landmark_container_tags = {"main", "article"}
    leaf_section_tags = tuple(t for t in SECTION_TAGS if t not in landmark_container_tags)

    def emit_section(node: Tag) -> None:
        classes = collect_class_signature(node)
        selector = f"{node.name}.{classes[0]}" if classes else node.name
        out.append((node, selector))

    def walk(container: Tag) -> None:
        found_any = False
        for child in container.find_all(recursive=False):
            if not isinstance(child, Tag):
                continue
            if child.name in leaf_section_tags:
                emit_section(child)
                found_any = True
            else:
                # Not a leaf section-tag: recurse through it (semantic
                # landmark container OR inert non-semantic wrapper -- both
                # get the same transparent treatment, at unlimited depth).
                before = len(out)
                walk(child)
                if len(out) > before:
                    found_any = True
        if not found_any and container.name in landmark_container_tags:
            # A landmark container with no section-like descendants at all
            # (not even nested) is itself the section -- preserves the
            # pre-existing fallback for a main/article with no inner
            # structure whatsoever.
            emit_section(container)

    walk(body)

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
    source_builder = detect_source_builder(soup)

    used_ids: set[str] = set()
    boundaries: list[dict] = []

    if auto_section:
        for idx, (node, selector) in enumerate(auto_detect_sections(soup), start=1):
            boundaries.append(build_boundary(
                node, selector, used_ids, idx, run_dir=run_dir,
                source_builder=source_builder,
            ))
    else:
        if not section_selector:
            sys.exit("ERROR: --section required unless --auto-section set")
        node = find_section_node(soup, section_selector)
        if node is None:
            sys.exit(f"ERROR: selector {section_selector!r} matched zero nodes in {mockup_path}")
        boundaries.append(build_boundary(
            node, section_selector, used_ids, 1, run_dir=run_dir,
            source_builder=source_builder,
        ))

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
            # Research-buddies (2026-09-14): page-level document signal --
            # surfaced here for observability even though it's only ever
            # consulted per-class for the w-/h- residue, never overriding a
            # per-class certainty. Makes a mixed-builder page visible in the
            # artefact rather than silently averaged away.
            "source_builder": source_builder,
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
