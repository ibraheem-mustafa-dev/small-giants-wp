#!/usr/bin/env python3
"""leftover-bucket-router.py -- Stage 9 leftover routing.

Routes anything the orchestrator could not absorb into one of five buckets
per Spec 12 section 6 plus the 2026-05-08 4-model peer review (5th bucket
"structural mismatch / orphan" was added then).

Buckets:
  unrecognised_class            -- class names with no slug / role mapping
  unrecognised_section          -- low-confidence match candidates (< 0.7)
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
# Spec 15 §7 Stage 2 hard gate: block-type match confidence ≥ 0.7 required.
# Boundaries with top-candidate confidence < 0.7 are routed to the autonomy chain
# (bucket-c-classifier + atomic-block-scaffold) instead of passing through to
# Stage 3+ pipeline. This is a named constant to enable single-point changes.
STAGE_2_CONFIDENCE_THRESHOLD = 0.7

EMPTY_BUCKETS_TEMPLATE: dict[str, list] = {
    "unrecognised_class": [],
    "unrecognised_section": [],
    "extraction_failed": [],
    "animation_unclassified": [],
    "structural_mismatch_or_orphan": [],
    # Added 2026-05-16 — converter_v2 path classification per binding rule #1
    # (leftover-buckets must give accurate info, not lump structural-success
    # together with structural-failure).
    "chrome_skipped":                [],  # header/footer/nav — intentional skip
    "cv2_handled_no_top_level_match": [],  # Stage 2 no-match, cv2 emitted typed sgs/* blocks
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
    "unrecognised_class":               "convention",
    "unrecognised_section":             "structural",
    "extraction_failed":                "attribute",
    "animation_unclassified":           "functionality",
    "structural_mismatch_or_orphan":    "structural",
    "chrome_skipped":                   "structural",  # informational; not a real gap
    "cv2_handled_no_top_level_match":   "structural",
}

# Severity floor per bucket. Per-item logic may upgrade (never downgrade)
# based on confidence delta, recurrence, or operator-tag. Severity drives
# operator-review ordering at 5a.5.
BUCKET_SEVERITY_FLOOR: dict[str, str] = {
    "unrecognised_class":               "low",      # often cosmetic / decorative class
    "unrecognised_section":             "high",     # whole section unrouted
    "extraction_failed":                "medium",   # declared slot, missing value
    "animation_unclassified":           "low",      # behaviour passes silently if dropped
    "structural_mismatch_or_orphan":    "high",     # block chose but DOM disagrees
    "chrome_skipped":                   "info",     # intentional skip, not a gap
    "cv2_handled_no_top_level_match":   "low",      # cv2 emitted typed blocks; gap is "no top-level block exists"
}


# Buckets that are TYPE classifications rather than gravity assessments.
# Their floor severity is taken as the literal severity — no confidence-
# based escalation. Without this opt-out, a cv2_handled item (confidence
# always 0.0 because Stage 2 didn't match — that's the very condition
# making it cv2_handled) would escalate from 'low' to 'medium', misleading
# the operator into thinking the section is a genuine problem.
#
# Inclusion criterion for future buckets: add a bucket here ONLY if the
# bucket is reached BECAUSE confidence is low (the low confidence is what
# defines membership), not because it represents an accuracy signal.
# Examples of buckets that SHOULD NOT be in this set: unrecognised_class
# (low confidence IS the signal), structural_mismatch_or_orphan (DOM-vs-
# block disagreement, escalation by low confidence is correct).
_NO_CONFIDENCE_ESCALATION: set[str] = {
    "chrome_skipped",
    "cv2_handled_no_top_level_match",
}


def _enrich_item(item: dict, bucket: str, confidence: float | None = None) -> dict:
    """Stamp gap_level + severity on a bucket item.

    Severity escalates from the bucket floor when confidence < 0.25 (the
    'rough guess' threshold), EXCEPT for type-classification buckets
    listed in _NO_CONFIDENCE_ESCALATION. Returns the same dict for
    chained use.
    """
    item["gap_level"] = BUCKET_TO_GAP_LEVEL[bucket]
    severity = BUCKET_SEVERITY_FLOOR[bucket]
    if (
        confidence is not None
        and confidence < 0.25
        and severity == "low"
        and bucket not in _NO_CONFIDENCE_ESCALATION
    ):
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


_CHROME_SKIPPED_MARKER = re.compile(r"<!--\s*sgs-converter:\s*CHROME SKIPPED")
# Match emitted block slugs (sgs/X or core/X) other than sgs/container which
# is the cv2 fall-through wrapper — its presence alone does not constitute a
# typed-block emission. We require at least one OTHER block in the markup
# before classifying as cv2-handled.
_EMITTED_BLOCK_SLUG = re.compile(r"<!--\s+wp:((?:sgs|core)/[\w-]+)\b")


def _per_section_results(extract: dict) -> list[dict]:
    """Return the per_section_results list from the extract dict, defensive
    against legacy shapes where the key may be absent."""
    return extract.get("per_section_results") or []


def _section_emitted_typed_blocks(markup: str) -> list[str]:
    """Parse block_markup and return the list of emitted sgs/* block slugs
    other than sgs/container (which is the cv2 fall-through wrapper). A
    section qualifies as cv2-handled when this list is non-empty."""
    slugs = []
    for m in _EMITTED_BLOCK_SLUG.finditer(markup or ""):
        slug = m.group(1)
        if slug != "sgs/container":
            slugs.append(slug)
    return slugs


def route_unrecognised_section(
    matches: list[dict],
    extract: dict,
    buckets: dict[str, list],
) -> None:
    """Sections whose top candidate scored below the threshold.

    Differentiation (added 2026-05-16 per Bean's binding-rule #1 directive
    that leftover-buckets must give accurate info):
      - If per_section_result block_markup is a chrome-skip marker
        (header/footer/nav) → bucket = 'chrome_skipped' (info severity).
      - If per_section_result block_markup contains at least one typed
        sgs/* or core/* block other than sgs/container → bucket =
        'cv2_handled_no_top_level_match' (low severity). The section IS
        structurally handled; the gap is "no top-level block exists for
        this section signature".
      - Otherwise → bucket = 'unrecognised_section' (high severity).
        Genuine gap — operator needs to author a new block / pattern.
    """
    psr_by_bid = {r.get("boundary_id"): r for r in _per_section_results(extract)}

    for m in matches:
        confidence = float(m.get("confidence", 0.0))
        if confidence >= STAGE_2_CONFIDENCE_THRESHOLD:
            continue
        bid = m.get("boundary_id")
        psr = psr_by_bid.get(bid) or {}
        markup = psr.get("block_markup") or ""

        if _CHROME_SKIPPED_MARKER.search(markup):
            bucket = "chrome_skipped"
        elif _section_emitted_typed_blocks(markup):
            bucket = "cv2_handled_no_top_level_match"
        else:
            bucket = "unrecognised_section"

        item = {
            "section_id": m.get("section_id"),
            "boundary_id": bid,
            "block_name": m.get("block_name"),
            "confidence": confidence,
        }
        if bucket == "cv2_handled_no_top_level_match":
            # Surface what cv2 emitted so the operator can decide whether to
            # author a top-level block or leave as composition.
            item["emitted_blocks"] = _section_emitted_typed_blocks(markup)
        buckets[bucket].append(_enrich_item(item, bucket, confidence=confidence))


# Attribute roles that represent CONTENT slots the mockup should provide a value
# for. Roles outside this set (boolean toggles, numeric defaults, behaviour
# switches like 'select-from-enum-with-default') would inflate the cv2 coverage
# bucket with noise — the mockup intentionally doesn't set them. Filtering here
# keeps the cv2_emitted_dynamic signal meaningful per Sonnet architecture-lens
# QC panel finding 2026-05-16.
_CONTENT_BEARING_ROLES = frozenset({
    "text-content",
    "content",
    "select-from-enum",
})


def _db_attrs_for_block(block_slug: str) -> list[str]:
    """Return the list of CONTENT-BEARING attr_names declared in block_attributes
    for a slug. Filters by role so the cv2 coverage signal stays meaningful.

    Returns [] when the DB / block is unknown — caller treats that as 'no
    coverage check possible' rather than 'no attrs to check'.
    Cached per-process via the module-level _DB_ATTRS_CACHE for speed.
    """
    if block_slug in _DB_ATTRS_CACHE:
        return _DB_ATTRS_CACHE[block_slug]
    try:
        import sqlite3
        import os
        db_path = os.path.expanduser("~/.claude/skills/sgs-wp-engine/sgs-framework.db")
        if not os.path.exists(db_path):
            _DB_ATTRS_CACHE[block_slug] = []
            return []
        conn = sqlite3.connect(db_path)
        # NULL role rows are kept (legacy data; can't classify yet) — only
        # explicit non-content roles are filtered out. This avoids silently
        # dropping coverage signal during the role-population migration.
        placeholders = ",".join("?" * len(_CONTENT_BEARING_ROLES))
        rows = conn.execute(
            f"SELECT attr_name FROM block_attributes "
            f"WHERE block_slug = ? "
            f"AND (role IS NULL OR role IN ({placeholders})) "
            f"ORDER BY attr_name",
            (block_slug, *_CONTENT_BEARING_ROLES),
        ).fetchall()
        conn.close()
        out = [r[0] for r in rows]
    except Exception:  # noqa: BLE001 — DB read is best-effort
        out = []
    _DB_ATTRS_CACHE[block_slug] = out
    return out


_DB_ATTRS_CACHE: dict[str, list[str]] = {}

# ---------------------------------------------------------------------------
# extraction_failed noise-reduction helpers (2026-07-09)
#
# Problem: route_extraction_failed's XS-8 filter only exempted auto-derived
# slots with a non-empty default. Every OTHER declared-but-empty slot
# (db-sourced attrs, or auto-derived attrs whose legitimate "unset" default
# is falsy — e.g. paddingTopTablet default='', shadow default=None) still
# got flagged "no value extracted" even when the draft never carried a CSS
# declaration for that property at all. On the 2026-07-09 mamas-munches
# homepage run this produced 614 extraction_failed entries, ALL reason
# "no value extracted" — noise drowning genuine gaps.
#
# Fix: a declared-but-empty slot is a GENUINE gap only when the draft's own
# CSS (per-section expected-rules-<boundary>.jsonl, written by
# orchestrator/expected_rules.py from the mockup's <style> blocks — the
# same ground truth Spec 20's computed-parity tooling uses) actually
# contains a declaration for the CSS property that slot maps to. When the
# slot maps to a resolvable CSS property AND that property is absent from
# the section's own declarations, there was never a source signal for it —
# it's an ABSENT OPTIONAL attr, not a failure, and is excluded.
#
# The slot_name -> css_property mapping is DB-first (R-31-1): it reuses the
# existing `property_suffixes` table (already the canonical suffix->property
# map used throughout converter/db/db_lookup.py) via a longest-suffix match,
# after stripping the established Tablet/Mobile device-tier suffix. Slot
# names that don't resolve to a CSS property (content/text/media slots like
# "headline", "ctaPrimaryText", "backgroundImage") are NOT covered by this
# check and keep the prior behaviour unchanged — no regression risk there.
# Missing expected-rules file / DB miss -> soft-fail to prior behaviour
# (keep the slot flagged) so a genuine gap is never silently dropped.
# ---------------------------------------------------------------------------

_RESPONSIVE_TIER_SUFFIXES: tuple[str, ...] = ("Tablet", "Mobile")

# Structure-derived selector properties whose presence/absence in the draft
# CSS is NOT a reliable per-attr extraction signal (Finding 1, 2026-07-09).
# `display` is THE layout-mode selector: an SGS layout/variant attr stores a
# variant token (grid / flex / carousel) that the block's render.php
# translates into `display`, so "was `display:` declared?" is unrelated to
# "was the layout variant extracted?" — and `display` is frequently implicit,
# giving a false has_signal=False that would silently drop a genuine `layout`
# gap across every composite. A slot resolving to one of these is treated as
# UNRESOLVABLE (return None -> caller KEEPs). This is a CSS-property-semantic
# guard (a fixed CSS vocabulary), NOT a per-block attr-name list (R-31-1);
# the sibling guard for block-declared variant selectors is DB-driven via
# blocks.variant_attr (see _block_variant_attr).
_NON_SIGNAL_PROPERTIES: frozenset[str] = frozenset({"display"})

_PROPERTY_SUFFIX_MAP_CACHE: list[tuple[str, str, str | None]] | None = None

_VARIANT_ATTR_CACHE: dict[str, str | None] = {}


def _block_variant_attr(block_slug: str) -> str | None:
    """Return the block's variant-selector attr name from blocks.variant_attr
    (FR-22-20), or None. DB-driven membership (R-31-1) so the variant selector
    (e.g. hero.variant, product-card.variantStyle, trust-bar.badgeStyle) is
    never signal-checked as if it carried a single CSS property. Cached
    per-process; soft-fails to None on any DB error.
    """
    if not block_slug:
        return None
    if block_slug in _VARIANT_ATTR_CACHE:
        return _VARIANT_ATTR_CACHE[block_slug]
    result: str | None = None
    try:
        import sqlite3
        import os
        db_path = os.path.expanduser("~/.claude/skills/sgs-wp-engine/sgs-framework.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            row = conn.execute(
                "SELECT variant_attr FROM blocks WHERE slug = ?", (block_slug,)
            ).fetchone()
            conn.close()
            if row and row[0]:
                result = row[0]
    except Exception:  # noqa: BLE001 — DB read is best-effort
        result = None
    _VARIANT_ATTR_CACHE[block_slug] = result
    return result


def _load_property_suffix_map() -> list[tuple[str, str, str | None]]:
    """Return (suffix, css_property, role) triples from property_suffixes,
    longest suffix first, so a greedy match picks the most specific suffix
    (e.g. 'PaddingTop' before the shorter 'Padding'). Cached per-process.
    role is carried so the resolver can reject accidental tail collisions on
    the short positional suffixes (Top/Right/Bottom/Left, role='position').
    """
    global _PROPERTY_SUFFIX_MAP_CACHE
    if _PROPERTY_SUFFIX_MAP_CACHE is not None:
        return _PROPERTY_SUFFIX_MAP_CACHE
    triples: list[tuple[str, str, str | None]] = []
    try:
        import sqlite3
        import os
        db_path = os.path.expanduser("~/.claude/skills/sgs-wp-engine/sgs-framework.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            rows = conn.execute(
                "SELECT suffix, css_property, role FROM property_suffixes "
                "WHERE suffix IS NOT NULL AND suffix != '' "
                "AND css_property IS NOT NULL AND css_property != ''"
            ).fetchall()
            conn.close()
            triples = [(s, p, r) for s, p, r in rows]
    except Exception:  # noqa: BLE001 — DB read is best-effort
        triples = []
    triples.sort(key=lambda t: len(t[0]), reverse=True)
    _PROPERTY_SUFFIX_MAP_CACHE = triples
    return triples


def _resolve_css_property(slot_name: str) -> str | None:
    """Best-effort slot_name -> css_property via property_suffixes suffix
    match. Returns None for slot names that don't resolve (content/text/
    media slots) — callers must treat None as 'can't determine', not
    'benign'.

    Matching is camelCase-word-boundary-aware, NOT a plain case-insensitive
    substring endswith: property_suffixes stores suffixes as UpperCamelCase
    segments (e.g. "PaddingTop", "Order"), and a naive case-insensitive
    endswith collides on accidental tail substrings (e.g. "gridItemBorder"
    ends with the letters "order", which wrongly matched the unrelated
    "Order" -> "order" (flex/grid order) suffix instead of correctly not
    matching "Border" at all — caught + fixed 2026-07-09). Capitalising only
    the slot name's own leading character (attrs are lowerCamelCase; suffix
    rows are UpperCamelCase) and then comparing case-SENSITIVELY preserves
    real word boundaries, since every internal word in both the attr name
    and the suffix rows already starts with a capital letter.
    """
    base = slot_name
    for tier in _RESPONSIVE_TIER_SUFFIXES:
        if base.endswith(tier) and len(base) > len(tier):
            base = base[: -len(tier)]
            break
    if not base:
        return None
    base_capitalised = base[0].upper() + base[1:]
    for suffix, css_property, role in _load_property_suffix_map():
        if not base_capitalised.endswith(suffix):
            continue
        # Positional-suffix collision guard (2026-07-09). The short suffixes
        # Top/Right/Bottom/Left (role='position' -> inset longhands) have NO
        # legitimate bare SGS attr — they only ever match as an ACCIDENTAL
        # tail of a compound attr whose real family is elsewhere (e.g.
        # `imageBorderWidthTop` is a border-width, but the DB stores the DB
        # suffix side-first as `BorderTopWidth`, so nothing longer matches and
        # `Top`->`top` wins — a WRONG resolution that, if trusted, would
        # silently drop a genuine border-width gap). Trust a positional match
        # ONLY when the whole base IS the positional word; otherwise skip it
        # (fall through -> None -> caller KEEPs). Data-driven off the DB role
        # column, not an attr-name list (R-31-1).
        if role == "position" and base_capitalised != suffix:
            continue
        return css_property
    return None


def _property_families(css_property: str) -> list[str]:
    """Return the CSS SHORTHAND property names that, when declared in the
    draft, satisfy the source-signal check for this (longhand) property.

    parse_css records literal declared property names WITHOUT expanding
    shorthands (Finding 2, 2026-07-09): a section authoring ``padding:24px``,
    ``border:1px solid #ccc``, ``border-radius:8px``, ``gap:24px``,
    ``inset:0`` or ``flex:1 1 auto`` stores only that shorthand token, so a
    slot resolving to a longhand (``padding-top``, ``border-top-width``,
    ``border-top-left-radius``, ``row-gap``, ``top``, ``flex-grow``) would be
    judged absent and wrongly excluded unless the shorthand family is
    consulted. Returns [] when the property has no recognised shorthand — the
    caller then relies on the direct property match only.

    ANY returned family present in the declared set counts as signal (the
    caller ORs them) — the conservative KEEP direction.
    """
    fams: list[str] = []
    # Box spacing longhands -> their bare shorthand.
    if css_property.startswith("padding-"):
        fams.append("padding")
    if css_property.startswith("margin-"):
        fams.append("margin")
    # Gap longhands (row-gap / column-gap) -> gap.
    if css_property in ("row-gap", "column-gap"):
        fams.append("gap")
    # Inset longhands (top/right/bottom/left) -> inset.
    if css_property in ("top", "right", "bottom", "left"):
        fams.append("inset")
    # Flex item longhands -> flex.
    if css_property in ("flex-grow", "flex-shrink", "flex-basis"):
        fams.append("flex")
    # Border-radius corner longhands -> border-radius.
    #   e.g. border-top-left-radius -> border-radius.
    if css_property.startswith("border-") and css_property.endswith("-radius") \
            and css_property != "border-radius":
        fams.append("border-radius")
    # Border side-width longhands -> border-width AND the bare `border`
    #   shorthand. NB the DB stores these side-first (border-top-width), so
    #   the earlier startswith("border-width-") test never fired — this is
    #   the corrected match.
    if css_property.startswith("border-") and css_property.endswith("-width") \
            and css_property != "border-width":
        fams.append("border-width")
        fams.append("border")
    # Bare border sub-properties -> the `border` shorthand catch-all.
    if css_property in ("border-width", "border-color", "border-style"):
        fams.append("border")
    # Background longhands -> background shorthand.
    if css_property.startswith("background-"):
        fams.append("background")
    # Font longhands -> font shorthand.
    if css_property.startswith("font-"):
        fams.append("font")
    return fams


_EXPECTED_RULE_PROPS_CACHE: dict[tuple[str, str], set[str] | None] = {}


def _boundary_declared_properties(run_dir: str, boundary_id: str) -> set[str] | None:
    """Return the set of CSS property names the DRAFT actually declared that
    reach this boundary's subtree, read from expected-rules-<boundary>.jsonl.

    Counts BOTH ``section``-scoped (.sgs-classed) rows AND ``page_wide`` bare-
    tag rows (e.g. ``h2{font-size}``, ``p{color}``, ``a{color}``). A page-wide
    bare-tag rule IS a legitimate source signal for an element inside the
    section (it cascades onto it), so a font-size/colour slot backed only by
    a page-wide rule must NOT be judged "absent" — that would silently drop a
    genuine gap on ``--draft-mode`` / ``--legacy`` runs whose CSS leans on
    bare-tag selectors (Finding 3, 2026-07-09). Unioning every scope is the
    conservative direction: more properties count as "declared" -> fewer
    exclusions -> we KEEP on any signal.

    Returns None when the file can't be read (missing run_dir, missing file,
    or bad JSON) so callers soft-fail to the prior (conservative) behaviour
    instead of silently excluding.
    """
    key = (run_dir, boundary_id)
    if key in _EXPECTED_RULE_PROPS_CACHE:
        return _EXPECTED_RULE_PROPS_CACHE[key]
    props: set[str] | None = None
    try:
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", boundary_id or "unknown")
        path = Path(run_dir) / f"expected-rules-{safe}.jsonl"
        if path.exists():
            props = set()
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                # All scopes count — section (.sgs-scoped) AND page_wide
                # (bare-tag rules cascade onto section elements).
                props.update((row.get("declarations") or {}).keys())
    except Exception:  # noqa: BLE001 — best-effort, soft-fail to None
        props = None
    _EXPECTED_RULE_PROPS_CACHE[key] = props
    return props


def _has_draft_source_signal(
    slot_name: str,
    run_dir: str | None,
    boundary_id: str,
    block_slug: str | None = None,
) -> bool | None:
    """True/False when we can determine whether the draft's own CSS declared
    the property this slot maps to; None when we can't determine (unresolved
    slot name, structural/variant selector, missing run_dir/file) — caller
    must treat None as "keep flagged" (can't prove benign).
    """
    if not run_dir:
        return None
    # Guard 1 (Finding 1) — the block's DECLARED variant-selector attr
    # (blocks.variant_attr) is never signal-checked: its extraction is
    # structure/variant-derived, not keyed on a single CSS property.
    if block_slug and slot_name == _block_variant_attr(block_slug):
        return None
    css_property = _resolve_css_property(slot_name)
    if css_property is None:
        return None
    # Guard 2 (Finding 1) — structure-derived layout-mode selector property
    # (e.g. `layout` -> `display`): CSS presence is not a reliable extraction
    # signal, so treat as unresolvable (KEEP).
    if css_property in _NON_SIGNAL_PROPERTIES:
        return None
    declared = _boundary_declared_properties(run_dir, boundary_id)
    if declared is None:
        return None
    if css_property in declared:
        return True
    for family in _property_families(css_property):
        if family in declared:
            return True
    return False


# ---------------------------------------------------------------------------
# P-PHASE8-14 helpers — leaf-block + complex-subtree guard
# ---------------------------------------------------------------------------

_DB_LEAF_CACHE: dict[str, bool] = {}


def _db_block_is_leaf(block_slug: str) -> bool:
    """Return True when the block is a LEAF (delegates_content=0, i.e. it does
    NOT compose child InnerBlocks).

    REPOINTED (EXECUTION Step 16, 2026-07-05): previously read the cached
    ``block_composition.has_inner_blocks`` column, dropped by migration
    2026-07-05-drop-has-inner-blocks-column.py. Now derives the fact FRESH
    from the block's own save.js/render.php source via
    converter.services.has_inner.derive_delegates_content — no DB dependency
    at all for this fact any more (Spec 31 §12.7). Soft-fails to False
    (non-leaf) on any derivation error so we never emit false positives for
    unknown blocks.

    R-22-1 compliant — source-derived, no per-block slug literals.
    """
    if block_slug in _DB_LEAF_CACHE:
        return _DB_LEAF_CACHE[block_slug]
    result = False
    try:
        import sys
        from pathlib import Path
        _scripts_root = Path(__file__).resolve().parent.parent
        if str(_scripts_root) not in sys.path:
            sys.path.insert(0, str(_scripts_root))
        from converter.services.has_inner import derive_delegates_content
        result = derive_delegates_content(block_slug) == 0
    except Exception:  # noqa: BLE001 — derivation is best-effort
        pass
    _DB_LEAF_CACHE[block_slug] = result
    return result


# P-PHASE8-14 thresholds — tunable without schema changes.
# A section whose emitted markup contains more than this many WP block-open
# comments is treated as "complex subtree" for the leaf-block guard.
# A leaf block cannot legally accept InnerBlocks, so > 1 block in the
# markup means the converter nested children inside a self-closing block
# (structural collapse).  Threshold of 1 catches any nesting at all without
# false positives from single-block sections.
_LEAF_GUARD_MIN_WP_BLOCK_OPENS: int = 1


def _count_wp_block_opens(markup: str) -> int:
    """Count the number of ``<!-- wp:`` block-open comments in markup.

    Used as a proxy for subtree complexity: a section whose converter output
    contains N block-open comments had at least N source child elements that
    the walker tried to represent. For a leaf block (no InnerBlocks), any
    value > 1 means children were collapsed into a block that can't accept
    them — the structural-mismatch signal P-PHASE8-14 targets.
    """
    return len(_WP_BLOCK_OPEN.findall(markup or ""))


def route_leaf_block_with_complex_subtree(
    matches: list[dict],
    extract: dict,
    buckets: dict[str, list],
) -> None:
    """P-PHASE8-14 (2026-06-07) — flag sections where a LEAF block was chosen
    at high confidence but the source subtree is too complex to fit.

    When Stage 2 matches a registered leaf block (has_inner_blocks=0 in
    block_composition) at confidence >= STAGE_2_CONFIDENCE_THRESHOLD AND the
    emitted markup contains > _LEAF_GUARD_MIN_WP_BLOCK_OPENS block-open
    comments (meaning the converter tried to nest multiple elements inside a
    block that has no InnerBlocks slot), emit structural_mismatch_or_orphan
    with source="section_collapsed_into_leaf_block" and severity "high".

    This is a DIAGNOSTIC-ONLY bucket emission — it does NOT change routing
    or conversion output. The converter already ran; this surfaces the gap
    for operator review.

    Skips:
      - Chrome-skipped sections (header/footer/nav — intentional skips).
      - Sections where the DB confirms the block is NOT a leaf (safe).
      - Sections with confidence below the threshold (already in
        unrecognised_section; no need to double-bucket).
      - DB miss / table-absent — soft-fail to no-emit (no false positives).
    """
    bucket = "structural_mismatch_or_orphan"
    psr_by_bid = {r.get("boundary_id"): r for r in _per_section_results(extract)}

    for m in matches:
        confidence = float(m.get("confidence", 0.0))
        if confidence < STAGE_2_CONFIDENCE_THRESHOLD:
            continue  # already handled by route_unrecognised_section

        block_slug = m.get("block_name") or ""
        if not block_slug.startswith("sgs/"):
            continue  # only check SGS blocks (non-SGS may have different composition model)

        if not _db_block_is_leaf(block_slug):
            continue  # composite/unknown — not the target scenario

        bid = m.get("boundary_id")
        psr = psr_by_bid.get(bid) or {}
        markup = psr.get("block_markup") or ""

        if _CHROME_SKIPPED_MARKER.search(markup):
            continue  # intentional chrome skip — not a mismatch

        block_opens = _count_wp_block_opens(markup)
        if block_opens <= _LEAF_GUARD_MIN_WP_BLOCK_OPENS:
            continue  # subtree is simple enough — no structural mismatch

        buckets[bucket].append(_enrich_item({
            "section_id": m.get("section_id"),
            "boundary_id": bid,
            "block_name": block_slug,
            "confidence": confidence,
            "emitted_block_opens": block_opens,
            "leaf_guard_threshold": _LEAF_GUARD_MIN_WP_BLOCK_OPENS,
            "reason": (
                f"{block_slug} is a leaf block (no InnerBlocks) but the emitted "
                f"markup contains {block_opens} block-open(s) — the section's "
                f"subtree was collapsed into a block that cannot accept children."
            ),
            "source": "section_collapsed_into_leaf_block",
        }, bucket))


def route_extraction_failed(slot_lists: dict, extract: dict, buckets: dict[str, list]) -> None:
    """For each section, surface declared slots that came back empty.

    The extract['extracted_attributes'] dict may use either bare slot names
    (e.g. ``"headline"``) OR section-prefixed names (e.g. ``"hero.headline"``
    or ``"hero.hero.headline"`` from the multi-section aggregation).
    We check both forms so converter_v2 and legacy paths are treated equally.

    Two sources of declared slots:
      1. Stage 3 slot_lists (the classic path — only populated when Stage 2
         matched a registered block at confidence >= threshold).
      2. cv2-emitted typed blocks parsed from per_section_results.block_markup
         (added 2026-05-16). For sections that Stage 2 dropped to sgs/container
         (confidence 0.0) but cv2 still emitted typed sgs/* blocks, look up each emitted
         block's full attr list in block_attributes and check which slots
         the converter actually populated. This gives attribute-level
         coverage signal for cv2-handled sections where Stage 3 declared
         zero slots. Per binding rule #1 (Bean 2026-05-15) — leftover-buckets
         must give accurate info, not silently miss coverage for cv2 output.

    Chrome-skipped sections (status "chrome-skipped" in per_section_results —
    header/footer/nav, intentionally never converted) are excluded entirely:
    they emit zero markup and zero extraction is attempted, so their declared
    slots being "empty" is not a failure of anything (2026-07-09 fix).

    Source-signal discriminator (2026-07-09 fix, gap-router accuracy):
    a declared-but-empty slot is only a GENUINE extraction failure when the
    draft's own mockup CSS for that section actually declared a value for
    the CSS property the slot maps to (checked via _has_draft_source_signal
    against expected-rules-<boundary>.jsonl). When the slot resolves to a
    CSS property and that property was never declared in the draft's CSS for
    this section, there was no source signal to extract — it's excluded as
    an ABSENT OPTIONAL attr, not routed to extraction_failed. Slot names that
    don't resolve to a CSS property (content/media slots) are unaffected —
    prior behaviour (subject to the XS-8 filter below) is preserved for them.
    """
    bucket = "extraction_failed"
    extracted_attrs = extract.get("extracted_attributes") or {}
    run_dir = None
    extract_result_path = extract.get("extract_result_path")
    if extract_result_path:
        run_dir = str(Path(extract_result_path).parent)
    chrome_skipped_boundaries = {
        psr.get("boundary_id")
        for psr in _per_section_results(extract)
        if psr.get("status") == "chrome-skipped"
    }

    def _is_filled(name: str, section_id: str, boundary_id: str) -> bool:
        return (
            name in extracted_attrs
            or f"{section_id}.{name}" in extracted_attrs
            or f"{boundary_id}.{name}" in extracted_attrs
        )

    # Source 1 — Stage 3 declared slots (classic matched-block path).
    #
    # XS-8 noise filter (2026-05-30 — diagnostic register):
    # Skip auto-derived slots that have a non-empty default. These represent
    # block_attributes columns that legitimately use their default when no
    # mockup CSS rule provides an explicit value — they are NOT real gaps.
    # Without this filter every section gets ~69 noise entries (69 sgs/container
    # auto-derived slots × N sections), drowning out real defects. Real signals
    # preserved: (a) explicitly-declared slots (canonical_source != "auto-derived"),
    # (b) auto-derived slots without a meaningful default (None or empty string).
    for boundary_id, scaffold in (slot_lists or {}).items():
        if boundary_id in chrome_skipped_boundaries:
            continue  # chrome-skipped — never attempted, not a failure
        section_id = scaffold.get("section_id", boundary_id)
        block_slug = scaffold.get("block_name")
        for slot in scaffold.get("slots", []):
            name = slot["slot_name"]
            if _is_filled(name, section_id, boundary_id):
                continue
            # XS-8 noise filter
            is_auto_derived = (
                slot.get("attribute_role") == "auto-derived"
                or slot.get("canonical_source") == "auto-derived"
            )
            has_meaningful_default = slot.get("default") not in (None, "", [])
            if is_auto_derived and has_meaningful_default:
                continue
            # Source-signal discriminator — resolves to True/False when the
            # slot maps to a real style CSS property AND we could read the
            # draft's own declarations; None (can't determine: unresolved
            # name, variant/structural selector, or unreadable file) falls
            # through to the prior conservative behaviour (keep flagged).
            has_signal = _has_draft_source_signal(name, run_dir, boundary_id, block_slug)
            if has_signal is False:
                continue  # ABSENT optional — no source signal in the draft
            reason = (
                "declared in draft CSS but not extracted"
                if has_signal is True
                else "no value extracted"
            )
            buckets[bucket].append(_enrich_item({
                "section_id": section_id,
                "boundary_id": boundary_id,
                "slot": name,
                "reason": reason,
                "source": "stage_3_slot_list",
            }, bucket))

    # Source 2 — cv2-emitted typed blocks (dynamic slot-list per emission).
    # Skip sections that already appeared in Stage 3 slot_lists with slots
    # declared (those got their coverage check via Source 1).
    s3_boundaries_with_slots = {
        bid for bid, scaf in (slot_lists or {}).items()
        if (scaf.get("slots") or [])
    }
    for psr in _per_section_results(extract):
        bid = psr.get("boundary_id") or ""
        section_id = psr.get("section_id") or bid
        if bid in s3_boundaries_with_slots:
            continue  # already checked via Source 1
        markup = psr.get("block_markup") or ""
        for emitted_slug in _section_emitted_typed_blocks(markup):
            db_attrs = _db_attrs_for_block(emitted_slug)
            if not db_attrs:
                continue  # block not in DB → no coverage check possible
            for attr_name in db_attrs:
                if not _is_filled(attr_name, section_id, bid):
                    buckets[bucket].append(_enrich_item({
                        "section_id": section_id,
                        "boundary_id": bid,
                        "slot": attr_name,
                        "reason": "no value extracted",
                        "source": "cv2_emitted_dynamic",
                        "emitted_block": emitted_slug,
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


_BEM_BLOCK_FROM_CLASS = re.compile(r"^sgs-([a-z](?:[a-z0-9]|-(?!-))*)")
# Block boundary detection — opens (<!-- wp:slug) and closes (<!-- /wp:slug -->).
# Used for depth-aware traversal so the wrong-block-type plausibility check
# inspects only the section-ROOT emission, not nested descendants.
_WP_BLOCK_OPEN = re.compile(r"<!--\s+wp:((?:sgs|core)/[\w-]+)\b")
_WP_BLOCK_CLOSE = re.compile(r"<!--\s+/wp:(?:sgs|core)/[\w-]+\s+-->")
_WP_BLOCK_SELFCLOSE_AT_OPEN = re.compile(r"/-->")


def _section_root_block_slug(markup: str) -> str | None:
    """Return the slug of the FIRST emitted WP block at depth 0 (the section
    root). Skips chrome-skip comments. Returns None if no depth-0 block found.

    Depth tracking: each non-self-closing open increments depth on enter, each
    matching close decrements. Self-closing blocks (`/-->`) don't change depth.
    We're not building an AST — we just need the first depth-0 open.
    """
    depth = 0
    i = 0
    n = len(markup)
    while i < n:
        # Locate next event: open OR close
        m_open = _WP_BLOCK_OPEN.search(markup, i)
        m_close = _WP_BLOCK_CLOSE.search(markup, i)
        # Pick the earliest event
        next_open_pos = m_open.start() if m_open else n + 1
        next_close_pos = m_close.start() if m_close else n + 1
        if next_open_pos >= n and next_close_pos >= n:
            return None  # nothing more
        if next_open_pos < next_close_pos:
            # Open at this position
            if depth == 0:
                return m_open.group(1)
            # Determine if this open is self-closing
            # Look for /--> before the next newline or -->
            tail_end = markup.find("-->", m_open.end())
            if tail_end == -1:
                return None
            tail_segment = markup[m_open.end(): tail_end]
            if not _WP_BLOCK_SELFCLOSE_AT_OPEN.search(tail_segment + "-->"):
                depth += 1
            i = tail_end + 3
        else:
            # Close at this position
            depth = max(0, depth - 1)
            i = m_close.end()
    return None


def _section_first_typed_block(markup: str) -> str | None:
    """Return the section-root emitted block slug ONLY if it's a typed sgs/*
    block (not sgs/container). Used by the wrong-block-type plausibility
    check — depth-0 only, no false positives from nested descendants.

    Known limitation (depth-0 only): a section whose ROOT is sgs/container
    (correct per R4) but whose nested descendants contain a wrongly-typed
    block (e.g. sgs/team-member emitted three levels deep inside a
    sgs/hero subtree) will not be caught here. The depth-0 restriction is
    the correct first-pass heuristic — recursing into descendants would
    add false positives from legitimate nesting. Recursive-scan with
    parent-block awareness is the Phase 9 extension path; see P-PHASE8-14
    (section-collapses-into-leaf-block guard) for the adjacent gap.
    """
    root_slug = _section_root_block_slug(markup)
    if root_slug and root_slug.startswith("sgs/") and root_slug != "sgs/container":
        return root_slug
    return None


def _bem_block_name_from_signature(class_signature: list) -> str | None:
    """Extract the bare BEM block name from a class_signature.

    e.g. ['sgs-featured-product'] -> 'featured-product'
         ['sgs-product-card--trial', 'sgs-pill'] -> 'product-card' (first sgs- class wins)
    Returns None when no sgs-<name> class is present.
    """
    for cls in (class_signature or []):
        m = _BEM_BLOCK_FROM_CLASS.match(cls)
        if m:
            return m.group(1)
    return None


def _slug_tail(slug: str) -> str:
    """sgs/product-card -> product-card"""
    return slug.rsplit("/", 1)[-1] if "/" in slug else slug


def route_wrong_block_type(matches: list[dict], boundaries: list[dict], extract: dict, buckets: dict[str, list]) -> None:
    """P-PHASE8-12 (2026-05-16) — flag cv2-handled sections whose first
    typed emission disagrees with the section's BEM root-block-name.

    Heuristic: when cv2 emits a typed sgs/<X> block (not sgs/container) AT
    THE SECTION ROOT, the section's class_signature SHOULD carry a matching
    `sgs-<X>` class. If the names differ AND ranked_candidates didn't rank
    sgs/<X> at the top, the converter likely picked the wrong block-type
    (e.g. matched on an inner descendant's class instead of the section
    wrapper). Surface as structural so the operator can investigate.

    This sits ALONGSIDE structural_mismatch_or_orphan rather than inside it,
    because chrome_skipped + cv2_handled sections were excluded from that
    bucket to avoid double-bucketing. The wrong-block-type check is a
    targeted plausibility guard rail on cv2 emissions specifically.
    """
    bucket = "structural_mismatch_or_orphan"
    psr_by_bid = {r.get("boundary_id"): r for r in _per_section_results(extract)}
    boundaries_by_id = {b.get("boundary_id"): b for b in (boundaries or [])}

    for m in matches:
        bid = m.get("boundary_id")
        psr = psr_by_bid.get(bid) or {}
        markup = psr.get("block_markup") or ""
        # Only check cv2-handled sections (those that emitted typed blocks
        # but did NOT have a top-level Stage 2 match).
        if not _section_emitted_typed_blocks(markup):
            continue
        if float(m.get("confidence", 0.0)) >= STAGE_2_CONFIDENCE_THRESHOLD:
            continue
        if _CHROME_SKIPPED_MARKER.search(markup):
            continue

        first_typed = _section_first_typed_block(markup)
        if not first_typed:
            continue  # cv2 only emitted sgs/container — R4 fall-through, fine

        boundary = boundaries_by_id.get(bid) or {}
        section_bem = _bem_block_name_from_signature(boundary.get("class_signature") or [])
        if section_bem is None:
            continue  # can't compare — no BEM name to check against

        first_typed_tail = _slug_tail(first_typed)
        if first_typed_tail == section_bem:
            continue  # cv2 emitted the matching block — fine

        # Plausibility: was the emitted block in the ranked_candidates list?
        ranked = m.get("ranked_candidates") or []
        ranked_slugs = {c.get("block_name") for c in ranked}
        if first_typed in ranked_slugs:
            continue  # cv2 chose a real candidate the voter saw — accept

        buckets[bucket].append(_enrich_item({
            "section_id": m.get("section_id"),
            "boundary_id": bid,
            "block_name": first_typed,
            "section_bem_block": section_bem,
            "reason": (
                f"cv2 emitted {first_typed} at section root, but section's "
                f"BEM root-class implies sgs/{section_bem}. Possible wrong-"
                f"block-type."
            ),
            "source": "cv2_plausibility_check",
        }, bucket))


def route_structural_mismatch(matches: list[dict], extract: dict, buckets: dict[str, list]) -> None:
    """Flag sections where DOM-shape disagrees with the matched block.

    Minimum signal for v1: chosen block is sgs/* but extract coverage is 0,
    OR confidence == 0.0 (deferred fallback; sgs/container emitted) with non-trivial DOM.

    Skips sections that route_unrecognised_section already classified as
    chrome_skipped or cv2_handled_no_top_level_match (per binding rule #1
    2026-05-16) — those have a clearer classification and should not also
    appear here as structural mismatch. The wrong-block-type plausibility
    check in route_wrong_block_type covers cv2-handled sections separately.
    """
    bucket = "structural_mismatch_or_orphan"
    extracted_count = len(extract.get("extracted_attributes") or {})
    psr_by_bid = {r.get("boundary_id"): r for r in _per_section_results(extract)}
    for m in matches:
        block = m.get("block_name", "")
        section_id = m.get("section_id")
        bid = m.get("boundary_id")
        # Skip if already classified as chrome-skipped or cv2-handled
        psr = psr_by_bid.get(bid) or {}
        markup = psr.get("block_markup") or ""
        if _CHROME_SKIPPED_MARKER.search(markup):
            continue
        if _section_emitted_typed_blocks(markup):
            continue

        if block.startswith("sgs/") and extracted_count == 0:
            buckets[bucket].append(_enrich_item({
                "section_id": section_id,
                "block_name": block,
                "reason": "block chosen but extractor returned zero attributes",
            }, bucket))
        # Q1A fix 2026-05-23: sentinel is confidence == 0.0, not block name.
        # The fallback block is now sgs/container (per Decision 3); testing
        # for core/group would silently miss all unmatched sections post-Q1A.
        if float(m.get("confidence", 0.0)) == 0.0:
            buckets[bucket].append(_enrich_item({
                "section_id": section_id,
                "block_name": block,
                "reason": "deferred fallback (confidence 0.0); no SGS block matched",
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
    route_unrecognised_section(matches, extract_dict, buckets)
    route_extraction_failed(slot_lists, extract_dict, buckets)
    route_animation_unclassified(extract_dict, buckets)
    route_structural_mismatch(matches, extract_dict, buckets)
    route_wrong_block_type(matches, boundaries, extract_dict, buckets)
    route_leaf_block_with_complex_subtree(matches, extract_dict, buckets)  # P-PHASE8-14

    totals = {name: len(items) for name, items in buckets.items()}
    gap_level_totals = {"attribute": 0, "functionality": 0, "convention": 0, "structural": 0}
    # P-PHASE8-11 (2026-05-16) — severity dashboard alongside gap_level_totals.
    # Operator question "how many BLOCKING gaps?" used to require manual
    # filtering because high/low/info collapsed into one structural count.
    severity_totals = {"info": 0, "low": 0, "medium": 0, "high": 0}
    for items in buckets.values():
        for item in items:
            level = item.get("gap_level")
            if level in gap_level_totals:
                gap_level_totals[level] += 1
            sev = item.get("severity")
            if sev in severity_totals:
                severity_totals[sev] += 1
    return {
        "leftover_buckets": buckets,
        "totals": totals,
        "gap_level_totals": gap_level_totals,
        "severity_totals": severity_totals,
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
