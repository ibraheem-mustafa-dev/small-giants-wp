"""
assign-canonical.py
===================
Backfills `canonical_slot`, `role`, and `derived_selector` for every row in
`block_attributes` in sgs-framework.db.

Algorithm (per Spec 15 §3.3, §5.1, §5.2):

1. Load vocabulary tables from the DB at startup (slots, property_suffixes,
   modifier_suffixes). [Post-D99: slot_synonyms table retired; slots table
   replaces it; role no longer lives on the slot row — role is derived from
   property_suffixes only.]
2. For each block_attributes row, decompose attr_name by stripping known suffixes
   from the right in the prescribed order, leaving a slot base word (stem).
3. Resolve canonical_slot via slots (direct slot_name match then alias search).
4. Resolve role via property_suffixes (the property suffix that was peeled).
5. Derive selector as  .sgs-<block-short-slug>__<canonical_slot>.
6. Apply v1 fingerprint overrides where an explicit selector is declared in
   tools/recogniser/data/fingerprints.json attr_extractors.
7. UPDATE block_attributes; INSERT gap candidates for unresolved rows.
8. Print self-check counts and 5 sample rows.

Spec 22 Phase 0.1 extension (scope-corrected per D84, 2026-05-27):
  - Tier B BEM-element backfill pass added AFTER the existing Tier A flow.
  - Structural guardrail by construction: Tier B iterator's SQL clause is
    literally `WHERE canonical_slot IS NULL AND derived_selector IS NOT NULL`.
    No other input shape is acceptable — the 1,142 triple-NULL behavioural
    rows CANNOT be touched because they don't pass the filter.
  - Default mode for Tier B is `--dry-run` (writes a JSON diff to
    pipeline-state/_snapshots/tier-b-backfill-diff-<UTC-timestamp>.json).
    `--apply` (or `--apply --diff-file <path>`) writes the approved rows.
  - Tier C ships dormant: 0 candidates in current DB state (D84 audit).
    Logic exists in converter_v2/db_lookup.equivalent_block_for() for future-
    proofing per Spec 22 FR-22-2.1, but no rows match Tier C input shape today.
"""

import argparse
import datetime as _dt
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# DB lives outside the repo (in the sgs-wp-engine skill folder). Resolve via
# the user's home so this works on any machine. Override with $SGS_FRAMEWORK_DB.
import os
DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)
# fingerprints.json selector overrides RETIRED 2026-07-03 (P-FINGERPRINT-MIGRATION) —
# folded into sgs-update-v2.py ATTR_CLASSIFICATION_OVERRIDES. FINGERPRINTS_PATH +
# load_fingerprint_overrides removed with the load.

# ---------------------------------------------------------------------------
# Vocabulary loaders
# ---------------------------------------------------------------------------

def load_slot_aliases(conn: sqlite3.Connection) -> dict[str, dict]:
    """
    Returns a mapping:
        lowercase_term -> {
            'canonical_slot': str,
            'role': None,         # post-D99: role no longer lives on the slot row
        }
    Covers both canonical slot names and every alias in their JSON arrays.

    Reads the post-D99 `slots` table (scope='element'); section-scope slots
    are skipped — they describe page sections, not attribute targets.
    """
    cur = conn.cursor()
    cur.execute(
        "SELECT slot_name, aliases FROM slots WHERE scope = 'element'"
    )
    rows = cur.fetchall()

    mapping: dict[str, dict] = {}

    def _add(term: str, info: dict) -> None:
        """Register `term` and its no-hyphen variant in the mapping.

        camelCase attr names lowercase to a hyphen-free form
        (e.g. `splitImage` → `splitimage`), but slot aliases in the DB use
        hyphenated kebab-case (`split-image`). Register both so the camelCase
        decomposition path matches kebab-case aliases. First writer wins so
        canonical-slot names never get clobbered by hyphen-stripped aliases.
        """
        key = term.lower()
        if key not in mapping:
            mapping[key] = info
        nh = key.replace("-", "")
        if nh and nh != key and nh not in mapping:
            mapping[nh] = info

    for slot_name, aliases_json in rows:
        info = {"canonical_slot": slot_name, "role": None}
        # Canonical itself
        _add(slot_name, info)
        # Each alias
        try:
            aliases = json.loads(aliases_json) if aliases_json else []
        except json.JSONDecodeError:
            aliases = []
        for alias in aliases:
            _add(alias, info)
    return mapping


# Legacy alias for any external callers expecting the old name (D99 port).
load_slot_synonyms = load_slot_aliases


def load_property_suffixes(conn: sqlite3.Connection) -> dict[str, dict]:
    """
    Returns a mapping from suffix (original case) -> {role, css_property}.
    Sorted longest-first so longest-match wins during peeling.
    """
    cur = conn.cursor()
    cur.execute("SELECT suffix, role, css_property FROM property_suffixes")
    rows = cur.fetchall()
    return {suffix: {"role": role, "css_property": css_property}
            for suffix, role, css_property in rows}


def load_modifier_suffixes(conn: sqlite3.Connection) -> dict[str, str]:
    """Returns suffix -> kind mapping (original case)."""
    cur = conn.cursor()
    cur.execute("SELECT suffix, kind FROM modifier_suffixes")
    return {suffix: kind for suffix, kind in cur.fetchall()}




# ---------------------------------------------------------------------------
# Decomposition engine
# ---------------------------------------------------------------------------

# Ordered list of modifier groups to peel from the right (rightmost first).
# Each group is tried in the order listed; we peel ONE suffix per group per pass.
MODIFIER_PEEL_ORDER = [
    "unit",       # Unit
    "breakpoint", # Mobile / Tablet / Desktop
    "state",      # Hover / Active / Focus / Disabled
    "variant",    # Primary / Secondary / Tertiary
    "side",       # Top / Right / Bottom / Left
    "corner",     # TL / TR / BL / BR
]


def peel_modifiers(name: str, modifier_map: dict[str, str]) -> tuple[str, list[tuple[str, str]]]:
    """
    Repeatedly peels modifier suffixes from the right of `name` (camelCase).
    Returns (remaining_stem, [(suffix, kind), ...]) in peel order.
    """
    peeled: list[tuple[str, str]] = []
    remaining = name

    # Build a kind-indexed lookup for quick access
    by_kind: dict[str, list[str]] = {}
    for suffix, kind in modifier_map.items():
        by_kind.setdefault(kind, []).append(suffix)
    # Sort each group longest-first so longer suffixes are matched preferentially
    for kind in by_kind:
        by_kind[kind].sort(key=len, reverse=True)

    changed = True
    while changed:
        changed = False
        for kind in MODIFIER_PEEL_ORDER:
            for suffix in by_kind.get(kind, []):
                if remaining.endswith(suffix):
                    # Ensure the character before the suffix is uppercase or
                    # the whole string (camelCase boundary)
                    cut = len(suffix)
                    prefix = remaining[:-cut]
                    if not prefix:
                        # Entire name is the modifier suffix — stop; this is the stem
                        break
                    # Must be a camelCase boundary: last char of prefix is lowercase,
                    # first char of suffix is uppercase (already true by convention).
                    if prefix[-1].islower() or prefix[-1].isdigit():
                        remaining = prefix
                        peeled.append((suffix, kind))
                        changed = True
                        break  # restart outer loop from the beginning
            if changed:
                break

    return remaining, peeled


def peel_property_suffix(
    name: str,
    property_suffixes: dict[str, dict],
) -> tuple[str, Optional[str], Optional[dict]]:
    """
    Peels ONE property suffix from the right using longest-match.
    Returns (remaining_stem, suffix_peeled, suffix_info_dict).
    """
    # Sort by length descending so longest match wins
    sorted_suffixes = sorted(property_suffixes.keys(), key=len, reverse=True)
    name_lower = name.lower()
    for suffix in sorted_suffixes:
        suffix_lower = suffix.lower()
        # Case-insensitive endswith: handles `borderRadius` (stem) vs `BorderRadius` (DB key).
        # JS attribute names are conventionally camelCase, so an internal property word
        # may start lowercase if it is the first token after a peeled modifier.
        if name_lower.endswith(suffix_lower):
            prefix = name[: -len(suffix)]
            if not prefix:
                # Entire name IS the property suffix (no slot stem). Still return
                # the suffix + info so role can be assigned; stem stays empty.
                return "", suffix, property_suffixes[suffix]
            # Require a camelCase boundary: either preceding char is lowercase/digit,
            # or the property word starts with an uppercase letter (camelCase join).
            boundary_ok = (
                prefix[-1].islower()
                or prefix[-1].isdigit()
                or name[len(prefix)].isupper()
            )
            if boundary_ok:
                return prefix, suffix, property_suffixes[suffix]
    return name, None, None


def decompose_attr_name(
    attr_name: str,
    property_suffixes: dict[str, dict],
    modifier_map: dict[str, str],
) -> tuple[str, Optional[str], Optional[dict], list[tuple[str, str]]]:
    """
    Full decomposition per Spec 15 §3.3:
        1. Peel modifiers from right (unit, breakpoint, state, variant, side, corner)
        2. Peel ONE property suffix (longest match)
        3. Remainder is the slot stem

    Returns:
        stem                    - residual slot base word (camelCase)
        property_suffix         - the property suffix peeled (or None)
        property_suffix_info    - {role, css_property} dict (or None)
        modifiers               - list of (suffix, kind) tuples in peel order
    """
    # Step 1 — strip modifiers
    after_modifiers, modifiers = peel_modifiers(attr_name, modifier_map)

    # Step 2 — strip one property suffix
    stem, prop_suffix, prop_info = peel_property_suffix(after_modifiers, property_suffixes)

    return stem, prop_suffix, prop_info, modifiers


# ---------------------------------------------------------------------------
# Slot resolution
# ---------------------------------------------------------------------------

def resolve_canonical_slot(
    stem: str,
    slot_map: dict[str, dict],
) -> tuple[Optional[str], Optional[str]]:
    """
    Looks up `stem` (camelCase) in slot_map (which is keyed by lowercase terms).
    Returns (canonical_slot, role) or (None, None) if not found.
    """
    key = stem.lower()
    if key in slot_map:
        info = slot_map[key]
        return info["canonical_slot"], info["role"]
    return None, None


# ---------------------------------------------------------------------------
# Singularisation + reverse standalone_block lookup (2026-05-24)
# ---------------------------------------------------------------------------
# Used by the array-attr fallback in run() so plural collection-attr names
# (e.g. testimonials, logos, reviews, plans, entries) resolve to the canonical
# of the SINGULAR (testimonial ->review canonical via standalone_block
# reverse-lookup; logo ->logo canonical via direct alias).
#
# Universal — no hardcoded attr names. Driven by slots + blocks tables.


def _singularise(plural: str) -> str:
    """Simple English plural-to-singular conversion sufficient for SGS attr names.

    Rules (applied in order, first-match-wins):
      - "ies" ->"y"  (entries ->entry, stories ->story)
      - "ses" ->"s"  (addresses ->address — preserves 'ss' stems)
      - trailing "s"  (testimonials ->testimonial, logos ->logo)
      - "ss" stems stay  (process ->process — never strip from -ss)

    Returns the input unchanged if no rule applies.
    """
    if not plural:
        return plural
    p = plural
    if p.endswith("ies") and len(p) > 3:
        return p[:-3] + "y"
    if p.endswith("ses") and len(p) > 3:
        return p[:-2]  # addresses ->address
    if p.endswith("s") and not p.endswith("ss"):
        return p[:-1]
    return p


def standalone_block_to_canonical(
    conn: sqlite3.Connection,
    block_slug: str,
) -> tuple[Optional[str], Optional[str]]:
    """Reverse-lookup: find the canonical_slot whose standalone_block equals
    the given block_slug. Returns (canonical_slot, role) or (None, None).

    e.g. 'sgs/testimonial' ->('review', None) via slots row where
    standalone_block='sgs/testimonial' (slot_name='review'). Post-D99 the
    slots table has no role column; role stays None and is filled by the
    property-suffix path or remains NULL for operator review.
    """
    if not block_slug:
        return None, None
    row = conn.execute(
        "SELECT slot_name FROM slots "
        "WHERE standalone_block = ? AND scope = 'element'",
        (block_slug,),
    ).fetchone()
    if row is None:
        return None, None
    return row["slot_name"], None


def resolve_array_canonical(
    stem: str,
    slot_map: dict[str, dict],
    conn: sqlite3.Connection,
) -> tuple[Optional[str], Optional[str]]:
    """Two-tier fallback for array-attr canonical resolution.

    Tier A — singularise stem, look up singular in slot_map (covers
      'logo', 'step', 'review', 'plan', 'entry', 'image', 'icon', etc.).
    Tier B — if Tier A misses, check whether `sgs/<singular>` is a
      registered block. If so, reverse-lookup the canonical_slot whose
      standalone_block points to that block (covers 'testimonial' →
      'review' via standalone_block='sgs/testimonial').

    Returns (canonical_slot, role) or (None, None) if neither tier resolves.
    """
    singular = _singularise(stem)
    if singular == stem:
        return None, None  # nothing to fall back to

    # Tier A
    canonical, role = resolve_canonical_slot(singular, slot_map)
    if canonical is not None:
        return canonical, role

    # Tier B — registered-block reverse lookup
    candidate_slug = f"sgs/{singular}"
    row = conn.execute(
        "SELECT 1 FROM blocks WHERE slug = ? AND status = 'built'",
        (candidate_slug,),
    ).fetchone()
    if row is None:
        return None, None
    return standalone_block_to_canonical(conn, candidate_slug)


# ---------------------------------------------------------------------------
# Selector derivation (§5.2)
# ---------------------------------------------------------------------------

def derive_selector(block_slug: str, canonical_slot: str) -> str:
    """
    Derives the BEM selector: .sgs-<block-short-slug>__<canonical_slot>

    canonical_slot is already lowercase (from slots.slot_name column).
    block_slug strips the 'sgs/' namespace prefix.
    """
    short_slug = block_slug.replace("sgs/", "", 1)
    return f".sgs-{short_slug}__{canonical_slot}"


# ---------------------------------------------------------------------------
# Gap candidate table management
# ---------------------------------------------------------------------------

GAP_CANDIDATES_DDL = """
CREATE TABLE IF NOT EXISTS attribute_gap_candidates (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    block_slug     TEXT    NOT NULL,
    attr_name      TEXT    NOT NULL,
    stem           TEXT,
    proposed_action TEXT,
    created_at     TEXT    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (block_slug, attr_name)
)
"""


def ensure_gap_table(conn: sqlite3.Connection) -> None:
    conn.execute(GAP_CANDIDATES_DDL)
    conn.commit()


def insert_gap_candidate(
    conn: sqlite3.Connection,
    block_slug: str,
    attr_name: str,
    stem: str,
) -> None:
    conn.execute(
        """
        INSERT OR IGNORE INTO attribute_gap_candidates
            (block_slug, attr_name, stem, proposed_action)
        VALUES (?, ?, ?, 'new-canonical-slot-needed')
        """,
        (block_slug, attr_name, stem),
    )


# ---------------------------------------------------------------------------
# Main processing loop
# ---------------------------------------------------------------------------

def run() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Load vocabulary (post-D99: reads `slots` table)
    slot_map = load_slot_aliases(conn)
    property_suffixes = load_property_suffixes(conn)
    modifier_map = load_modifier_suffixes(conn)

    # Fingerprint selector overrides RETIRED 2026-07-03 (P-FINGERPRINT-MIGRATION):
    # the stale tools/recogniser/data/fingerprints.json attr_extractors are folded
    # into sgs-update-v2.py ATTR_CLASSIFICATION_OVERRIDES (the live, reseed-surviving
    # channel that runs as Stage 1 sub-step C, the FINAL derived_selector writer).
    # The formula-derived selector below stands on its own; the override layer
    # corrects the ~60 fingerprint-covered pairs afterwards. No fingerprints load here.

    # Ensure gap candidates table exists
    ensure_gap_table(conn)

    # Fetch un-touched block_attributes rows only (Phase 3 §3.7 + §3.8
    # incremental-safety: never overwrite any of canonical_slot / role /
    # derived_selector values that earlier runs or backfills have already
    # populated. To force re-canonicalisation, clear those columns
    # explicitly via SQL.).
    cur = conn.cursor()
    # 2026-05-30 (P-XS-4-ROLE-REGEX-CAMELCASE + P-XS-4-SLOT-VOCAB-GAPS):
    # Loosened scope from triple-NULL to canonical_slot-NULL only.
    # Rows where role or derived_selector were previously populated by
    # property-suffix peel (e.g. role='image-object' from `Image` suffix) but
    # whose camelCase stem missed the slot map remain backfill candidates as
    # the slot_map grows. The UPDATE still only fills NULL columns —
    # existing role/derived_selector values are preserved by the COALESCE
    # path below.
    cur.execute(
        "SELECT id, block_slug, attr_name, attr_type, role, derived_selector "
        "FROM block_attributes "
        "WHERE canonical_slot IS NULL"
    )
    rows = cur.fetchall()

    total = len(rows)
    resolved_count = 0
    gap_count = 0
    updates: list[tuple[str, str, str, int]] = []  # (canonical_slot, role, derived_selector, id)
    gap_inserts: list[tuple[str, str, str]] = []   # (block_slug, attr_name, stem)

    for row in rows:
        row_id: int = row["id"]
        block_slug: str = row["block_slug"]
        attr_name: str = row["attr_name"]
        attr_type: str = row["attr_type"]
        # Existing role / derived_selector are preserved if populated; the
        # decomposition path only overwrites a column when its current value
        # is NULL.
        existing_role: Optional[str] = row["role"]
        existing_selector: Optional[str] = row["derived_selector"]

        stem, prop_suffix, prop_info, modifiers = decompose_attr_name(
            attr_name, property_suffixes, modifier_map
        )

        # Slot resolution — Tier 0 (full-name pre-peel match, 2026-05-30
        # P-XS-4-SLOT-VOCAB-GAPS). Try the FULL camelCase attr_name as a slot
        # alias BEFORE the post-peel stem. This catches cases where peeling a
        # property suffix collapses the stem to a layout-only slot (e.g.
        # `splitImage` -> stem `split` -> layout-slot `split` which has no
        # standalone_block; the full-name match against `media.splitimage`
        # alias routes correctly to sgs/media instead). Falls through to the
        # post-peel resolver when no direct alias exists.
        canonical_slot, slot_role = resolve_canonical_slot(attr_name, slot_map)

        if canonical_slot is None:
            canonical_slot, slot_role = resolve_canonical_slot(stem, slot_map)

        # Array-attr fallback (2026-05-24): when an array-typed attr's stem
        # doesn't directly match a canonical alias, try singularise + Tier-B
        # registered-block reverse-lookup. Covers plural collection-attr names
        # like 'testimonials', 'logos', 'reviews', 'plans', 'entries' that
        # weren't naturally in slots.aliases. Universal — no hardcoded
        # attr names. Returns None,None when neither tier resolves; row
        # falls through to the existing gap-candidate path.
        if canonical_slot is None and attr_type == "array":
            canonical_slot, slot_role = resolve_array_canonical(
                stem, slot_map, conn,
            )

        # Role: property suffix role takes priority; fall back to slot role
        if prop_info and prop_info.get("role"):
            role = prop_info["role"]
        elif slot_role:
            role = slot_role
        else:
            role = None

        if canonical_slot is not None:
            # Derive selector from formula. (Fingerprint selector overrides moved to
            # ATTR_CLASSIFICATION_OVERRIDES — applied as the final Stage-1 writer.)
            derived_selector = derive_selector(block_slug, canonical_slot)

            # Preserve existing populated values (loosened scope, 2026-05-30).
            final_role = role if existing_role is None else existing_role
            final_selector = (
                derived_selector if existing_selector is None else existing_selector
            )
            updates.append((canonical_slot, final_role, final_selector, row_id))
            resolved_count += 1
        else:
            # Gap candidate — canonical_slot stays NULL in block_attributes.
            # (The fingerprint derived_selector write for slot-less known attrs moved
            # to ATTR_CLASSIFICATION_OVERRIDES, the final Stage-1 writer, so extraction
            # capability is preserved there — P-FINGERPRINT-MIGRATION 2026-07-03.)
            gap_inserts.append((block_slug, attr_name, stem))
            gap_count += 1

    # Batch UPDATE block_attributes
    conn.executemany(
        """
        UPDATE block_attributes
           SET canonical_slot  = ?,
               role            = ?,
               derived_selector = ?
         WHERE id = ?
        """,
        updates,
    )

    # Batch INSERT gap candidates (INSERT OR IGNORE handles idempotency)
    for block_slug, attr_name, stem in gap_inserts:
        insert_gap_candidate(conn, block_slug, attr_name, stem)

    conn.commit()

    # ------------------------------------------------------------------
    # P-PHASE8-13 second-pass role backfill — RETIRED post-D99 (2026-05-29).
    #
    # The retired slot_synonyms table previously carried a `role` column;
    # this pass propagated that role onto block_attributes rows whose
    # attr_name had no property suffix. Post-D99 the replacement `slots`
    # table has no `role` column (role now lives in the separate `roles`
    # table as a vocabulary list, not as a per-slot mapping).
    #
    # The new role-detection path is the --role-detection / --apply-roles
    # CLI mode (see run_role_detection_dry_run / run_role_detection_apply
    # below), which infers content-bearing roles from attr_name regex +
    # JSON-schema hints + description scan. This is now the canonical
    # backfill route for content-bearing attrs with role=NULL.
    # ------------------------------------------------------------------
    print(
        "[backfill] slot-role propagation retired post-D99 "
        "(slots table has no role column; use --role-detection instead)"
    )

    # ------------------------------------------------------------------
    # Role detection — WIRED into the standard flow (2026-06-30).
    # Previously CLI-only (--apply-roles), so the deterministic reseed never
    # ran it (root cause: .claude/reports/2026-06-30-role-derivation-root-cause.md).
    # Fills NULL content roles + UPGRADES the generic 'content' catch-all to a
    # specific content-bearing role (high-confidence name-regex only). DB-driven;
    # never touches a specific non-'content' role (protects scalar-media etc.).
    # ------------------------------------------------------------------
    _rd = apply_role_detection_inline(conn)
    print(
        f"[role-detection] content-bearing roles: filled={_rd['filled']} "
        f"upgraded={_rd['upgraded']}"
    )

    # ------------------------------------------------------------------
    # Self-checks
    # ------------------------------------------------------------------

    cur.execute("SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL")
    populated_count: int = cur.fetchone()[0]

    cur.execute(
        "SELECT COUNT(*) FROM attribute_gap_candidates "
        "WHERE proposed_action = 'new-canonical-slot-needed'"
    )
    gap_candidate_total: int = cur.fetchone()[0]

    # 5 random sample rows
    cur.execute(
        """
        SELECT block_slug, attr_name, canonical_slot, role, derived_selector
          FROM block_attributes
         WHERE canonical_slot IS NOT NULL
         ORDER BY RANDOM()
         LIMIT 5
        """
    )
    samples = cur.fetchall()

    # Blocks where 100 % of attrs failed slot lookup
    cur.execute(
        """
        SELECT block_slug,
               COUNT(*) AS total_attrs,
               SUM(CASE WHEN canonical_slot IS NULL THEN 1 ELSE 0 END) AS nulls
          FROM block_attributes
         GROUP BY block_slug
        HAVING nulls = total_attrs
        """
    )
    fully_failed = cur.fetchall()

    conn.close()

    # ------------------------------------------------------------------
    # Output
    # ------------------------------------------------------------------

    print("=" * 70)
    print("assign-canonical.py — run complete")
    print("=" * 70)
    print(f"Total rows processed          : {total}")
    print(f"canonical_slot populated      : {resolved_count}")
    print(f"Gap candidates (this run)     : {gap_count}")
    print(f"DB canonical_slot non-null    : {populated_count}")
    print(f"Gap candidates in DB total    : {gap_candidate_total}")
    print()

    if gap_candidate_total > 100:
        print(
            "WARNING: gap candidate count exceeds 100. "
            "The slot vocabulary likely has gaps — review attribute_gap_candidates."
        )
    elif gap_candidate_total <= 50:
        print(f"Gap candidate count ({gap_candidate_total}) is healthy (<= 50).")
    else:
        print(f"Gap candidate count ({gap_candidate_total}) is elevated (51-100). "
              "Consider reviewing attribute_gap_candidates.")

    print()
    print("5 sample rows:")
    print("-" * 70)
    for s in samples:
        print(
            f"  block={s['block_slug']!r:30s}  "
            f"attr={s['attr_name']!r:35s}\n"
            f"    stem-resolved canonical_slot={s['canonical_slot']!r:20s}  "
            f"role={s['role']!r:20s}\n"
            f"    derived_selector={s['derived_selector']!r}"
        )
        print()

    if fully_failed:
        print("ANOMALIES — blocks where 100% of attrs failed slot lookup:")
        for row in fully_failed:
            print(f"  {row[0]}  ({row[1]} attrs, {row[2]} nulls)")
    else:
        print("No blocks with 100% slot-lookup failure.")

    print("=" * 70)


# ---------------------------------------------------------------------------
# Spec 22 Phase 0.1 — Tier B BEM-element backfill (scope-corrected per D84)
# ---------------------------------------------------------------------------
# Adds a NEW pass after the existing Tier A flow in run(). Does not modify
# Tier A behaviour. Default mode is dry-run (emits JSON diff); --apply writes
# Bean-approved rows back to block_attributes.canonical_slot.
#
# IRONCLAD RULES (per Spec 22 §FR-22-2.1, §7 Commit 0.1, D84):
#   1. Structural input guardrail by construction: SQL clause is literally
#      `WHERE canonical_slot IS NULL AND derived_selector IS NOT NULL`. The
#      1,142 triple-NULL behavioural rows CANNOT be touched — they don't pass
#      the filter. This is the F-RA-1 mitigation: impossible by input shape,
#      not by regression test.
#   2. Dry-run is the DEFAULT mode. `--apply` is the explicit write opt-in.
#   3. Dry-run output: JSON at pipeline-state/_snapshots/tier-b-backfill-diff-
#      <UTC-timestamp>.json with per-entry schema documented in TIER_B_DIFF_SCHEMA
#      below. Bean reviews the diff before --apply.
#   4. Tier C ships dormant: 0 candidates in current DB state (D84). Logic in
#      converter_v2/db_lookup.equivalent_block_for() handles Tier C for future-
#      proofing but no inputs match today.
#   5. Refactor shares db_lookup.equivalent_block_for() as the single
#      authoritative derivation function (this script is the DB enrichment
#      path; db_lookup is the runtime library).

# Import the shared derivation function. db_lookup.py lives next door in
# the orchestrator/converter_v2 path; add to sys.path so the runtime library
# and this enrichment script share the SAME implementation.
_CONVERTER_V2_DIR = (
    Path(__file__).resolve().parents[1] / "orchestrator" / "converter_v2"
)
if str(_CONVERTER_V2_DIR) not in sys.path:
    sys.path.insert(0, str(_CONVERTER_V2_DIR))

# Imported lazily inside functions to keep module-import lightweight when this
# script is invoked headlessly via subprocess from sgs-update-v2.py.

TIER_B_SNAPSHOT_DIR = (
    Path(__file__).resolve().parents[4] / "pipeline-state" / "_snapshots"
)

# Schema documentation for the dry-run diff JSON. Each entry shape:
#   {
#     "block_slug": str,
#     "attr_name": str,
#     "derived_selector": str,            # current DB value
#     "role": str | None,                 # current DB value
#     "proposed_canonical_slot": str,     # the matched canonical_slot
#     "derivation_source": "tier_b_bem_element",
#     "matched_alias": str,               # the BEM element extracted
#     "source_synonym_row_id": int        # slots.rowid (post-D99)
#   }
# Top-level shape:
#   {
#     "generated_at": ISO-8601 UTC string,
#     "scope_filter": "canonical_slot IS NULL AND derived_selector IS NOT NULL",
#     "tier_b_candidates_seen": int,
#     "tier_b_proposed_updates": int,
#     "tier_b_unresolved": int,           # candidates where BEM didn't match any alias
#     "entries": [<entry>, ...]           # proposed updates only (unresolved logged separately)
#   }

# BEM element extractor — imported from db_lookup so derivation is single-source
# (per /qc-council Rater B 2026-05-27 finding: previous duplicate regex was one
# drift-PR away from divergence between enrichment + walker runtime).
# Lazy import inside Tier B functions (lines below) to avoid circular load.
# Lookup ALIAS: this var preserves the previous public name for callers within
# this file but resolves to db_lookup._BEM_ELEMENT_RE at first use.
_TIER_B_BEM_ELEMENT_RE = None  # populated lazily in _get_bem_regex()


def _get_bem_regex():
    """Return db_lookup._BEM_ELEMENT_RE via lazy sys.path import.

    Avoids module-load circularity + keeps the headless subprocess
    import surface light per the existing pattern at lines 725-729.
    """
    global _TIER_B_BEM_ELEMENT_RE
    if _TIER_B_BEM_ELEMENT_RE is None:
        # The sys.path setup for converter_v2 is done at the top of this file
        # via _CONVERTER_V2_DIR; import is safe here.
        from db_lookup import _BEM_ELEMENT_RE
        _TIER_B_BEM_ELEMENT_RE = _BEM_ELEMENT_RE
    return _TIER_B_BEM_ELEMENT_RE


def _utc_timestamp() -> str:
    """Return UTC ISO-8601 timestamp safe for filenames: 2026-05-27T12-30-00Z."""
    now = _dt.datetime.now(_dt.timezone.utc)
    return now.strftime("%Y-%m-%dT%H-%M-%SZ")


def _load_slot_synonyms_for_tier_b(conn: sqlite3.Connection) -> dict[str, tuple[str, int]]:
    """Return {alias_lowercase: (canonical_slot, slots.rowid)}.

    Used by Tier B BEM-element matching: walk every `slots` row's slot_name +
    aliases (post-D99 — was slot_synonyms.canonical_slot + aliases), map each
    lowercased term back to the row's slot_name + rowid. Only includes
    element-scope rows where standalone_block is populated (Tier B's
    destination is block-equivalent slots, not bare canonical-only slots).
    """
    out: dict[str, tuple[str, int]] = {}
    for rowid, canonical, aliases_json, standalone in conn.execute(
        "SELECT rowid, slot_name, aliases, standalone_block FROM slots "
        "WHERE scope = 'element' "
        "AND standalone_block IS NOT NULL AND standalone_block != ''"
    ).fetchall():
        out[canonical.lower()] = (canonical, rowid)
        if aliases_json:
            try:
                for alias in json.loads(aliases_json):
                    out[alias.lower()] = (canonical, rowid)
            except (ValueError, TypeError):
                pass
    return out


def assert_tier_b_guardrail(conn: sqlite3.Connection) -> None:
    """Read one sample row using the Tier B scope SQL and assert
    derived_selector IS NOT NULL. Fails loud if the iterator scope leaks the
    1,142 triple-NULL rows (per the structural input guardrail rule).
    """
    row = conn.execute(
        "SELECT block_slug, attr_name, derived_selector "
        "FROM block_attributes "
        "WHERE canonical_slot IS NULL AND derived_selector IS NOT NULL "
        "LIMIT 1"
    ).fetchone()
    if row is None:
        # No Tier B candidates — guardrail still holds (empty set passes filter).
        print("[tier-b] guardrail: 0 Tier B candidates in DB; scope filter trivially OK.")
        return
    block_slug, attr_name, derived_selector = row
    if derived_selector is None:
        raise RuntimeError(
            "GUARDRAIL VIOLATION: Tier B SQL clause returned a row with "
            f"derived_selector=NULL ({block_slug}.{attr_name}). The scope "
            "filter 'derived_selector IS NOT NULL' is broken. Halt — do not "
            "process any rows. This is the F-RA-1 failure mode the guardrail "
            "exists to prevent."
        )


def run_tier_b_dry_run(conn: sqlite3.Connection, output_path: Path) -> dict:
    """Iterate Tier B candidates, derive proposed canonical_slot via BEM-element
    extraction, write a JSON diff to `output_path`. Does NOT touch the DB.

    Returns a summary dict {candidates_seen, proposed_updates, unresolved}.
    """
    # Load the alias→(canonical, rowid) map for fast BEM lookup.
    alias_map = _load_slot_synonyms_for_tier_b(conn)

    # Tier B iterator — scope-locked SQL (the ironclad guardrail). NO other
    # input shape is permitted.
    candidates = conn.execute(
        "SELECT id, block_slug, attr_name, derived_selector, role "
        "FROM block_attributes "
        "WHERE canonical_slot IS NULL AND derived_selector IS NOT NULL"
    ).fetchall()

    entries: list[dict] = []
    unresolved: list[dict] = []

    for row_id, block_slug, attr_name, derived_selector, role in candidates:
        # Defensive double-check: refuse to process if derived_selector
        # somehow leaked through as NULL (would be a SQL-engine bug).
        if derived_selector is None:
            raise RuntimeError(
                f"GUARDRAIL VIOLATION mid-iteration: row id={row_id} "
                f"({block_slug}.{attr_name}) has derived_selector=NULL but "
                "passed the WHERE clause. Halt."
            )

        # P-XS-4-TIER-B-FINGERPRINT-CHAIN (2026-05-30): split compound selectors
        # on ',' BEFORE applying the BEM regex so fingerprint-override fallback
        # chains like `.sgs-hero__headline, h1, h2` resolve via the first BEM
        # fragment. Bare-tag fragments are silently skipped.
        element = None
        for fragment in derived_selector.split(","):
            m = _get_bem_regex().search(fragment)
            if m:
                element = m.group(1).lower()
                break
        if not element:
            # No __element segment in selector (e.g. core/* rows where
            # derived_selector is a bare tag like 'audio' or 'figure > a').
            unresolved.append({
                "block_slug": block_slug,
                "attr_name": attr_name,
                "derived_selector": derived_selector,
                "role": role,
                "reason": "no_bem_element_in_selector",
            })
            continue
        match = alias_map.get(element)
        if match is None:
            # BEM element extracted but no alias match in slots.
            unresolved.append({
                "block_slug": block_slug,
                "attr_name": attr_name,
                "derived_selector": derived_selector,
                "role": role,
                "reason": "bem_element_no_alias_match",
                "bem_element": element,
            })
            continue

        canonical_slot, source_rowid = match
        entries.append({
            "block_slug": block_slug,
            "attr_name": attr_name,
            "derived_selector": derived_selector,
            "role": role,
            "proposed_canonical_slot": canonical_slot,
            "derivation_source": "tier_b_bem_element",
            "matched_alias": element,
            "source_synonym_row_id": source_rowid,
        })

    summary = {
        "generated_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "scope_filter": "canonical_slot IS NULL AND derived_selector IS NOT NULL",
        "tier_b_candidates_seen": len(candidates),
        "tier_b_proposed_updates": len(entries),
        "tier_b_unresolved": len(unresolved),
        "entries": entries,
        "unresolved": unresolved,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, ensure_ascii=False)

    return summary


def run_tier_b_apply(conn: sqlite3.Connection, diff_path: Path) -> dict:
    """Apply Tier B canonical_slot updates from a pre-generated dry-run diff
    file. Writes only the rows in `entries` (NOT `unresolved`).

    Returns {applied: int, skipped: int} where skipped accounts for rows
    whose DB state has drifted since the dry-run (canonical_slot now set,
    or row no longer in Tier B scope).
    """
    with open(diff_path, "r", encoding="utf-8") as fh:
        diff = json.load(fh)

    entries = diff.get("entries", [])
    if not entries:
        return {"applied": 0, "skipped": 0}

    applied = 0
    skipped = 0
    cur = conn.cursor()
    for entry in entries:
        block_slug = entry["block_slug"]
        attr_name = entry["attr_name"]
        proposed = entry["proposed_canonical_slot"]
        # Per-entry structural guardrail re-assert (added 2026-05-27 per
        # /qc-council Rater A finding): even though the dry-run iterator filters
        # `derived_selector IS NOT NULL`, the apply path trusts the diff JSON —
        # which a future maintainer or hand-edit could populate with rows that
        # bypass the scope filter. Re-asserting on the entry itself closes the
        # apply-path convention-grade hole flagged by Rater A's MODERATE verdict.
        if entry.get("derived_selector") in (None, ""):
            raise RuntimeError(
                f"Tier B apply guardrail violation: entry {block_slug}.{attr_name} "
                "has empty derived_selector — refusing to write. The script's "
                "structural input filter must hold per-entry, not just per-iterator."
            )
        # Re-check scope at write time — guard against drift since dry-run.
        row = cur.execute(
            "SELECT id, canonical_slot, derived_selector FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
        if row is None:
            skipped += 1
            continue
        row_id, current_canonical, current_ds = row
        if current_canonical is not None or current_ds is None:
            # Drifted out of Tier B scope — skip without writing.
            skipped += 1
            continue
        cur.execute(
            "UPDATE block_attributes SET canonical_slot = ? WHERE id = ?",
            (proposed, row_id),
        )
        applied += 1

    conn.commit()
    return {"applied": applied, "skipped": skipped}


# Tier C dormant warning DELETED 2026-05-27 (D86): Tier C was removed from
# db_lookup.equivalent_block_for() per /qc-council Task 2 Rater B verdict.
# Spec 22 §FR-22-2.1 is now a 2-tier system. Re-add Tier C with empirical
# evidence + tests when P-SGS-UPDATE-ROLE-DETECTION-IMPROVE generates Tier C
# inputs (canonical_slot NULL + derived_selector NULL + role set).


# ---------------------------------------------------------------------------
# Spec 22 Phase 0.1.b — Role detection from block.json
# (P-SGS-UPDATE-ROLE-DETECTION-IMPROVE, /qc-council Rater A 2026-05-27)
# ---------------------------------------------------------------------------
# Problem: 171 DB rows have canonical_slot populated but role IS NULL. Per the
# positive-allowlist role-exclusion in db_lookup.equivalent_block_for(), the
# walker treats role=NULL as styling-safe (returns None) — correct-by-default
# but means content-bearing attrs like sgs/icon.iconSource stay dormant at
# walker level. This pass infers `role` for plausibly content-bearing attrs
# from heuristics over the attr's name / format / description.
#
# IRONCLAD RULES:
#   1. Only proposes role values from _CONTENT_BEARING_ROLES (text-content,
#      image-object, content, link-href, identity). NEVER proposes styling
#      roles (typography/colour/spacing/etc.) — those would defeat the
#      positive-allowlist guard in db_lookup.
#   2. Only touches rows where role IS NULL (additive only).
#   3. Default mode dry-run (writes JSON diff). --apply-roles for explicit
#      write opt-in (separate from --apply for Tier B canonical_slot writes,
#      so the two modes don't conflict).
#   4. Conservative: when no heuristic matches, returns None and the row
#      stays NULL (operator can populate manually via DB edit).

# Content-bearing roles — must match db_lookup._CONTENT_BEARING_ROLES verbatim.
_CONTENT_BEARING_ROLES = frozenset({
    "text-content",
    "image-object",
    "content",
    "link-href",
    "identity",
})

# Tier 1: attr-name regex matching (highest-confidence signal).
# Each entry: (compiled regex, proposed_role, confidence).
#
# Regexes use re.IGNORECASE-equivalent explicit alternations so camelCase variants
# are matched (e.g. `subHeadline`, `productName`, `featuredTag`). Extended
# 2026-05-30 per P-XS-4-ROLE-REGEX-CAMELCASE to cover the camelCase content-attr
# population that the original plain-lowercase regex missed (~100 SGS rows).
_ATTR_NAME_RULES = [
    # identity — icon/glyph/name-like identity attrs
    (re.compile(r"^(icon|iconName|iconSource|glyph|productName|productSlug)$"),
     "identity", "high"),
    # link-href — URL-like attrs
    (re.compile(
        r"^(link|linkTarget|linkUrl|linkHref|url|href|destination|destinationUrl)$"
    ), "link-href", "high"),
    # image-object — image/media URL attrs
    (re.compile(
        r"^(image|imageUrl|imageSrc|src|mediaUrl|backgroundImage|"
        r"splitImage|featuredImage|heroImage|productImage|thumbnailImage|"
        r"sideImage|bgImage|posterImage|coverImage)$"
    ), "image-object", "high"),
    # text-content — copy attrs incl. camelCase sub-variants + tag-style labels
    (re.compile(
        r"^("
        # plain lowercase content stems
        r"content|text|body|description|headline|title|subtitle|caption|"
        r"label|name|heading|"
        # camelCase sub-* variants
        r"subHeadline|subheadline|subTitle|subtitle|subHeading|subheading|"
        # camelCase tag/eyebrow content
        r"trialTag|featuredTag|tagText|tagLabel|badgeText|badgeLabel|"
        r"eyebrowText|kickerText|"
        # camelCase title/heading content
        r"productName|cardTitle|cardHeading|sectionTitle|sectionHeading|"
        r"primaryText|secondaryText|primaryHeadline|secondaryHeadline|"
        # camelCase descriptions
        r"shortDescription|longDescription|productDescription|cardDescription"
        r")$"
    ), "text-content", "high"),
    # content (array-typed collection slots)
    (re.compile(
        r"^(entries|items|cards|testimonials|badges|packSizes|"
        r"products|reviews|features|services|plans|logos|steps|tabs|slides)$"
    ), "content", "high"),
]

# Tier 2: JSON-schema `format` field hints.
_FORMAT_RULES = {
    "uri": "link-href",
    "email": "link-href",
}

# Tier 3: description-keyword scan (lowest confidence — wraps each phrase in
# explicit word-boundary checks to avoid 'the textTransform' false hits).
# Each entry: (substring, proposed_role).
_DESCRIPTION_RULES = [
    ("the icon", "identity"),
    ("the glyph", "identity"),
    ("the url", "link-href"),
    ("the link", "link-href"),
    ("the destination", "link-href"),
    ("the image", "image-object"),
    ("the photo", "image-object"),
    ("the picture", "image-object"),
    ("the text", "text-content"),
    ("the heading", "text-content"),
    ("the title", "text-content"),
    ("the label", "text-content"),
]


def detect_role_from_block_json(
    block_slug: str,
    attr_name: str,
    attr_metadata: dict,
    block_json_path: Optional[Path] = None,
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Infer a content-bearing role for (block_slug, attr_name) from block.json
    metadata + name heuristics.

    Returns (proposed_role, derivation_source, confidence). All three are None
    when no heuristic matches.

    `attr_metadata` is a dict that may contain keys:
        - format       (str)  — JSON-schema format hint
        - description  (str)  — JSON-schema / DB description
        - enum_values  (list/str/None) — if populated, attr is a select (skip)
        - attr_type    (str)  — JSON-schema type (object/array/string/...)

    `block_json_path` reserved for future use (currently unused — DB description
    is the canonical source; block.json descriptions for the SGS framework are
    not currently authored, so reading the file adds no signal).

    IMPORTANT:
        - Returns ONLY values in _CONTENT_BEARING_ROLES OR None. Never returns
          styling roles like 'typography'.
        - When `enum_values` is populated AND attr_type is 'string', strongly
          skews towards NOT-content (selects are styling/structural). The
          function returns None for these unless attr_name matches a high-
          confidence content pattern.
    """
    if not attr_name:
        return (None, None, None)

    description = (attr_metadata.get("description") or "").lower()
    fmt = (attr_metadata.get("format") or "").lower()
    enum_values = attr_metadata.get("enum_values")
    attr_type = (attr_metadata.get("attr_type") or "").lower()

    has_enum = bool(enum_values) and enum_values not in ("", "[]", "null")

    # Tier 1 — attr name regex (highest confidence). Override the enum-guard
    # when name matches with high confidence — names like 'iconSource' carry
    # an enum but are still content-bearing identity attrs.
    for pattern, role, confidence in _ATTR_NAME_RULES:
        if pattern.match(attr_name):
            return (role, f"attr_name_regex:{pattern.pattern}", confidence)

    # Tier 2 — JSON-schema format hint.
    if fmt in _FORMAT_RULES:
        return (_FORMAT_RULES[fmt], f"format:{fmt}", "med")

    # Tier 3 — description keyword scan. Skip when description is empty OR
    # when the attr already looks like an enum (likely styling select).
    if description and not has_enum:
        for substring, role in _DESCRIPTION_RULES:
            if substring in description:
                return (role, f"description_substring:{substring!r}", "low")

    # No heuristic matched — operator must populate manually.
    return (None, None, None)


def run_role_detection_dry_run(conn: sqlite3.Connection, output_path: Path) -> dict:
    """Iterate every block_attributes row where role IS NULL, propose a
    content-bearing role from heuristics, write a JSON diff to `output_path`.
    Does NOT touch the DB.
    """
    candidates = conn.execute(
        "SELECT id, block_slug, attr_name, attr_type, enum_values, description "
        "FROM block_attributes "
        "WHERE role IS NULL"
    ).fetchall()

    entries: list[dict] = []
    by_role_counts: dict[str, int] = {}
    by_confidence_counts: dict[str, int] = {}

    for row in candidates:
        row_id = row["id"]
        block_slug = row["block_slug"]
        attr_name = row["attr_name"]
        attr_metadata = {
            "attr_type": row["attr_type"],
            "enum_values": row["enum_values"],
            "description": row["description"],
            # `format` not currently stored in block_attributes — placeholder
            # for future Stage-4 enrichment (P-SGS-UPDATE-ROLE-DETECTION-IMPROVE
            # mentions format-field heuristics as a follow-up).
            "format": None,
        }

        proposed_role, derivation_source, confidence = detect_role_from_block_json(
            block_slug, attr_name, attr_metadata,
        )
        if proposed_role is None:
            continue

        entries.append({
            "row_id": row_id,
            "block_slug": block_slug,
            "attr_name": attr_name,
            "current_role": None,
            "proposed_role": proposed_role,
            "derivation_source": derivation_source,
            "confidence": confidence,
        })
        by_role_counts[proposed_role] = by_role_counts.get(proposed_role, 0) + 1
        by_confidence_counts[confidence] = by_confidence_counts.get(confidence, 0) + 1

    summary = {
        "generated_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "spec_ref": "Spec 22 §FR-22-2.1 + parking P-SGS-UPDATE-ROLE-DETECTION-IMPROVE",
        "candidates_seen": len(candidates),
        "proposed_role_writes": len(entries),
        "by_role": by_role_counts,
        "by_confidence": by_confidence_counts,
        "entries": entries,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, ensure_ascii=False)

    return summary


def run_role_detection_apply(conn: sqlite3.Connection, diff_path: Path) -> dict:
    """Apply proposed role values from a pre-generated dry-run diff.

    Per-entry guardrails:
      - Skip rows whose role has been populated since the dry-run (drift).
      - Refuse to write any role that is NOT in _CONTENT_BEARING_ROLES.
    """
    with open(diff_path, "r", encoding="utf-8") as fh:
        diff = json.load(fh)

    entries = diff.get("entries", [])
    applied = 0
    skipped_drift = 0
    skipped_unsafe = 0
    cur = conn.cursor()
    for entry in entries:
        proposed = entry.get("proposed_role")
        if proposed not in _CONTENT_BEARING_ROLES:
            # Safety net — should never trigger because the dry-run only emits
            # content-bearing roles, but enforce at write time too.
            skipped_unsafe += 1
            continue
        block_slug = entry["block_slug"]
        attr_name = entry["attr_name"]
        row = cur.execute(
            "SELECT id, role FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
        if row is None:
            skipped_drift += 1
            continue
        row_id, current_role = row
        if current_role is not None:
            skipped_drift += 1
            continue
        cur.execute(
            "UPDATE block_attributes SET role = ? WHERE id = ?",
            (proposed, row_id),
        )
        applied += 1

    conn.commit()
    return {
        "applied": applied,
        "skipped_drift": skipped_drift,
        "skipped_unsafe": skipped_unsafe,
    }


def apply_role_detection_inline(conn: sqlite3.Connection) -> dict:
    """Role detection wired into the standard /sgs-update flow (2026-06-30).

    Root cause (`.claude/reports/2026-06-30-role-derivation-root-cause.md`): the
    role-detection classifier was a CLI-only mode (--apply-roles) that the
    deterministic reseed (`sgs-update-v2.py` runs `assign-canonical.py` with NO
    args) never invoked — so content-bearing roles for url/image/icon/text attrs
    were never auto-derived (7 attrs sat at NULL → content silently dropped on
    clones; 4 carried the generic catch-all 'content' where a specific role is
    correct). And the old apply was NULL-only, so it never CORRECTED a wrong role.

    This is called from run() so the no-arg invocation completes role derivation.
    Two deterministic actions, both DB-driven (R-22-1, no slug literals):
      - FILL: role IS NULL  → any content-bearing proposal (existing behaviour).
      - UPGRADE: role = 'content' (the generic catch-all) → a SPECIFIC
        content-bearing role, ONLY on a high-confidence Tier-1 attr-name regex
        match (proposed != 'content'). Never touches a row whose role is a
        specific non-'content' value (protects 'scalar-media' etc.).
    """
    rows = conn.execute(
        "SELECT id, block_slug, attr_name, attr_type, enum_values, description, role "
        "FROM block_attributes WHERE role IS NULL OR role = 'content'"
    ).fetchall()
    cur = conn.cursor()
    filled = 0
    upgraded = 0
    for row_id, block_slug, attr_name, attr_type, enum_values, description, current in rows:
        proposed, source, confidence = detect_role_from_block_json(
            block_slug, attr_name,
            {
                "attr_type": attr_type,
                "enum_values": enum_values,
                "description": description,
                "format": None,
            },
        )
        if proposed is None or proposed not in _CONTENT_BEARING_ROLES:
            continue
        if current is None:
            cur.execute(
                "UPDATE block_attributes SET role = ? WHERE id = ?", (proposed, row_id)
            )
            filled += 1
        elif current == "content":
            # UPGRADE only: a specific role from a high-confidence name-regex match.
            is_name_regex = isinstance(source, str) and source.startswith("attr_name_regex")
            if proposed != "content" and confidence == "high" and is_name_regex:
                cur.execute(
                    "UPDATE block_attributes SET role = ? WHERE id = ?", (proposed, row_id)
                )
                upgraded += 1
    conn.commit()
    return {"filled": filled, "upgraded": upgraded}


# ---------------------------------------------------------------------------
# Spec 22 Phase 0.1.b — Triple-NULL baseline snapshot
# (P-D85-BASELINE-CONSTANT-DRIFT)
# ---------------------------------------------------------------------------
# Replaces the hardcoded 1142 constant in the triple-NULL sanity check with a
# file-backed snapshot. /sgs-update Stage 4 legitimately drifts the count when
# new blocks are added; --recapture-baseline rewrites the snapshot.

_BASELINE_SNAPSHOT_PATH = TIER_B_SNAPSHOT_DIR / "triple-null-baseline.json"


def _read_baseline_snapshot() -> Optional[dict]:
    """Return the parsed snapshot dict, or None when the file does not exist
    or fails to parse. Callers fall back to a soft warning rather than halting.
    """
    if not _BASELINE_SNAPSHOT_PATH.exists():
        return None
    try:
        with open(_BASELINE_SNAPSHOT_PATH, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def _write_baseline_snapshot(current_count: int) -> Path:
    """Write a fresh snapshot with `current_count` and current UTC timestamp.
    Used by --recapture-baseline. Returns the snapshot path."""
    snapshot = {
        "baseline_captured_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "spec_version": "22-v1.0",
        "spec_ref": "D84",
        "baseline_count": current_count,
        "rationale": (
            "Audit-day capture (auto-written by assign-canonical.py "
            "--recapture-baseline). This count drifts ONLY when /sgs-update "
            "Stage 4 adds new blocks. Re-capture when drift is legitimate."
        ),
    }
    _BASELINE_SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_BASELINE_SNAPSHOT_PATH, "w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, indent=2, ensure_ascii=False)
    return _BASELINE_SNAPSHOT_PATH


def _triple_null_sanity_check(conn: sqlite3.Connection) -> None:
    """Read current triple-NULL count, compare against snapshot, print result."""
    current = conn.execute(
        "SELECT COUNT(*) FROM block_attributes "
        "WHERE canonical_slot IS NULL AND derived_selector IS NULL "
        "AND role IS NULL"
    ).fetchone()[0]
    snapshot = _read_baseline_snapshot()
    if snapshot is None:
        print(
            f"\nTriple-NULL sanity check : {current} rows "
            f"(NO SNAPSHOT — run --recapture-baseline to create "
            f"{_BASELINE_SNAPSHOT_PATH.name})"
        )
        return
    baseline = snapshot.get("baseline_count")
    captured = snapshot.get("baseline_captured_at", "<unknown>")
    if current == baseline:
        print(
            f"\nTriple-NULL sanity check : {current} rows "
            f"(OK — guardrail intact, matches snapshot "
            f"{_BASELINE_SNAPSHOT_PATH.name})"
        )
    else:
        print(
            f"\nTriple-NULL drift: current={current} baseline={baseline}. "
            f"Snapshot {_BASELINE_SNAPSHOT_PATH.name} captured {captured}. "
            "Re-capture if drift is legitimate via --recapture-baseline "
            "(/sgs-update Stage 4 addition is the usual cause)."
        )


def main() -> None:
    """CLI entry point. Preserves the legacy no-args invocation (Tier A only,
    used by sgs-update-v2.py:_run_canonical_assignment per D50). Adds Tier B
    in default dry-run mode, with --apply for the explicit write opt-in.
    """
    parser = argparse.ArgumentParser(
        description=(
            "assign-canonical.py — backfill canonical_slot/role/derived_selector "
            "in block_attributes. Spec 22 Phase 0.1 adds Tier B BEM-element "
            "backfill (dry-run default; --apply to write)."
        ),
    )
    parser.add_argument(
        "--skip-tier-a",
        action="store_true",
        help=(
            "Skip the legacy Tier A backfill pass (the existing decomposition + "
            "`slots` resolution flow). Default: run Tier A then Tier B."
        ),
    )
    parser.add_argument(
        "--skip-tier-b",
        action="store_true",
        help=(
            "Skip the Spec 22 Tier B BEM-element backfill pass. Default: run "
            "Tier B in dry-run mode after Tier A."
        ),
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Apply Tier B proposed updates to the DB. Without --apply, Tier B "
            "runs in dry-run mode (emits diff JSON only; no DB writes). With "
            "--apply and no --diff-file, applies entries from the most recent "
            "diff in pipeline-state/_snapshots/."
        ),
    )
    parser.add_argument(
        "--diff-file",
        type=str,
        default=None,
        help=(
            "Path to a specific Tier B diff JSON to apply. Use with --apply. "
            "Default: most recent diff in pipeline-state/_snapshots/."
        ),
    )
    # Spec 22 Phase 0.1.b — role detection
    parser.add_argument(
        "--role-detection",
        action="store_true",
        help=(
            "Run role-detection dry-run: scan block_attributes rows where "
            "role IS NULL and emit a JSON diff of proposed content-bearing "
            "role values (P-SGS-UPDATE-ROLE-DETECTION-IMPROVE). Default: off."
        ),
    )
    parser.add_argument(
        "--apply-roles",
        action="store_true",
        help=(
            "Apply role-detection proposals from the most recent role-"
            "detection-diff JSON (or --role-diff-file <path>). Separate from "
            "--apply (Tier B) so the two writes don't conflict."
        ),
    )
    parser.add_argument(
        "--role-diff-file",
        type=str,
        default=None,
        help="Path to a specific role-detection diff JSON to apply.",
    )
    # Spec 22 Phase 0.1.b — baseline snapshot
    parser.add_argument(
        "--recapture-baseline",
        action="store_true",
        help=(
            "Recapture the triple-NULL baseline snapshot at "
            "pipeline-state/_snapshots/triple-null-baseline.json from the "
            "current DB count. Run after legitimate /sgs-update Stage 4 "
            "additions to silence sanity-check drift alerts."
        ),
    )
    args = parser.parse_args()

    # Standalone modes (--recapture-baseline / --role-detection / --apply-roles)
    # do NOT run Tier A or Tier B — they are independent maintenance commands.
    standalone_mode = (
        args.recapture_baseline or args.role_detection or args.apply_roles
    )
    if standalone_mode:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            if args.recapture_baseline:
                current = conn.execute(
                    "SELECT COUNT(*) FROM block_attributes "
                    "WHERE canonical_slot IS NULL AND derived_selector IS NULL "
                    "AND role IS NULL"
                ).fetchone()[0]
                path = _write_baseline_snapshot(current)
                print(f"[baseline] Recaptured snapshot: {path}")
                print(f"[baseline] Current triple-NULL count: {current}")

            if args.role_detection:
                timestamp = _utc_timestamp()
                output_path = (
                    TIER_B_SNAPSHOT_DIR
                    / f"role-detection-diff-{timestamp}.json"
                )
                print("=" * 70)
                print("Role detection — DRY-RUN mode (no DB writes)")
                print("=" * 70)
                summary = run_role_detection_dry_run(conn, output_path)
                print(f"Output file              : {output_path}")
                print(f"Candidates seen          : {summary['candidates_seen']}")
                print(f"Proposed role writes     : {summary['proposed_role_writes']}")
                if summary["by_role"]:
                    print("By role:")
                    for role, count in sorted(summary["by_role"].items()):
                        print(f"  {role:15s} : {count}")
                if summary["by_confidence"]:
                    print("By confidence:")
                    for conf, count in sorted(summary["by_confidence"].items()):
                        print(f"  {conf:15s} : {count}")
                print()
                print(
                    "Bean review surface: open the JSON file above. Approve "
                    "specific entries by removing rejected ones, then run "
                    "--apply-roles --role-diff-file <path>. To accept all "
                    "as-is, run --apply-roles with no --role-diff-file "
                    "(most recent diff used)."
                )

            if args.apply_roles:
                if args.role_diff_file:
                    diff_path = Path(args.role_diff_file)
                    if not diff_path.exists():
                        print(
                            f"[roles] --role-diff-file not found: {diff_path}",
                            file=sys.stderr,
                        )
                        sys.exit(2)
                else:
                    candidates = sorted(
                        TIER_B_SNAPSHOT_DIR.glob("role-detection-diff-*.json"),
                        key=lambda p: p.stat().st_mtime,
                        reverse=True,
                    )
                    if not candidates:
                        print(
                            "[roles] --apply-roles requested but no role-"
                            "detection diff found in "
                            f"{TIER_B_SNAPSHOT_DIR}. Run --role-detection first.",
                            file=sys.stderr,
                        )
                        sys.exit(2)
                    diff_path = candidates[0]
                print("=" * 70)
                print("Role detection — APPLY mode")
                print("=" * 70)
                print(f"Diff file: {diff_path}")
                result = run_role_detection_apply(conn, diff_path)
                print(f"Applied        : {result['applied']}")
                print(f"Skipped drift  : {result['skipped_drift']}")
                print(f"Skipped unsafe : {result['skipped_unsafe']}")
        finally:
            conn.close()
        return

    # Legacy Tier A pass (unchanged behaviour).
    if not args.skip_tier_a:
        run()

    # Spec 22 Tier B pass.
    if args.skip_tier_b:
        print("[tier-b] skipped via --skip-tier-b")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        # Structural guardrail check — fails loud if SQL scope leaks.
        assert_tier_b_guardrail(conn)
        # Tier C dormant warning deleted 2026-05-27 (D86) — see comment above.

        if args.apply:
            # Resolve diff file: explicit --diff-file wins, else most recent.
            if args.diff_file:
                diff_path = Path(args.diff_file)
                if not diff_path.exists():
                    print(
                        f"[tier-b] --diff-file not found: {diff_path}",
                        file=sys.stderr,
                    )
                    sys.exit(2)
            else:
                # Find most recent tier-b-backfill-diff-*.json.
                candidates = sorted(
                    TIER_B_SNAPSHOT_DIR.glob("tier-b-backfill-diff-*.json"),
                    key=lambda p: p.stat().st_mtime,
                    reverse=True,
                )
                if not candidates:
                    print(
                        "[tier-b] --apply requested but no diff file found in "
                        f"{TIER_B_SNAPSHOT_DIR}. Run dry-run first.",
                        file=sys.stderr,
                    )
                    sys.exit(2)
                diff_path = candidates[0]

            # Load entries for confirmation summary.
            with open(diff_path, "r", encoding="utf-8") as fh:
                diff = json.load(fh)
            n_entries = len(diff.get("entries", []))
            print("=" * 70)
            print("Tier B — APPLY mode")
            print("=" * 70)
            print(f"Diff file        : {diff_path}")
            print(f"Generated at     : {diff.get('generated_at')}")
            print(f"Proposed updates : {n_entries}")
            print(f"Unresolved (skip): {diff.get('tier_b_unresolved', 0)}")
            print()
            print("Applying entries — drift re-checked per row at write time.")
            result = run_tier_b_apply(conn, diff_path)
            print(f"Applied  : {result['applied']}")
            print(f"Skipped  : {result['skipped']} (drifted out of scope since dry-run)")
        else:
            # Dry-run (default).
            timestamp = _utc_timestamp()
            output_path = TIER_B_SNAPSHOT_DIR / f"tier-b-backfill-diff-{timestamp}.json"
            print("=" * 70)
            print("Tier B — DRY-RUN mode (no DB writes)")
            print("=" * 70)
            summary = run_tier_b_dry_run(conn, output_path)
            print(f"Output file              : {output_path}")
            print(f"Scope filter             : {summary['scope_filter']}")
            print(f"Tier B candidates seen   : {summary['tier_b_candidates_seen']}")
            print(f"Tier B proposed updates  : {summary['tier_b_proposed_updates']}")
            print(f"Tier B unresolved        : {summary['tier_b_unresolved']}")
            print()
            print("Bean review surface: open the JSON file above. Approve "
                  "specific entries by removing rejected ones, then run "
                  "--apply --diff-file <path>. To accept all entries as-is, "
                  "run --apply with no --diff-file (most recent diff used).")

            # Triple-NULL sanity check — proves guardrail worked.
            # Snapshot-backed per P-D85-BASELINE-CONSTANT-DRIFT (2026-05-27):
            # compares current count against pipeline-state/_snapshots/
            # triple-null-baseline.json rather than a hardcoded constant.
            _triple_null_sanity_check(conn)
    finally:
        conn.close()


def _self_test_role_detection() -> int:
    """Synthetic test cases covering the heuristic families. Returns exit code
    (0 = pass, 1 = fail). Called by `--self-test` CLI flag."""
    cases = [
        # (block_slug, attr_name, metadata, expected_role, label)
        ("sgs/icon", "iconSource",
         {"attr_type": "string", "enum_values": '["lucide","wp-icon"]', "description": ""},
         "identity", "iconSource ->identity (Tier 1 name regex)"),
        ("sgs/icon", "iconName",
         {"attr_type": "string", "enum_values": None, "description": ""},
         "identity", "iconName ->identity (Tier 1 name regex)"),
        ("sgs/icon", "linkTarget",
         {"attr_type": "string", "enum_values": '["_self","_blank"]', "description": ""},
         "link-href", "linkTarget ->link-href (Tier 1 name regex)"),
        ("sgs/timeline", "entries",
         {"attr_type": "array", "enum_values": None, "description": ""},
         "content", "entries ->content (Tier 1 array collection regex)"),
        ("sgs/card", "imageUrl",
         {"attr_type": "string", "enum_values": None, "description": "", "format": "uri"},
         "image-object", "imageUrl ->image-object (Tier 1 name regex wins over format)"),
        ("sgs/foo", "destinationUrl",
         {"attr_type": "string", "enum_values": None, "description": "", "format": "uri"},
         "link-href", "destinationUrl ->link-href (Tier 2 format hint)"),
        ("sgs/foo", "headline",
         {"attr_type": "string", "enum_values": None, "description": ""},
         "text-content", "headline ->text-content (Tier 1 name regex)"),
        ("sgs/foo", "someAttr",
         {"attr_type": "string", "enum_values": None,
          "description": "The image displayed at the top of the card."},
         "image-object", "description scan ->image-object (Tier 3)"),
        # Negative tests — must return None
        ("sgs/hero", "textTransform",
         {"attr_type": "string", "enum_values": '["uppercase","lowercase"]', "description": ""},
         None, "textTransform ->None (styling enum, no name match)"),
        ("sgs/hero", "letterSpacing",
         {"attr_type": "string", "enum_values": None, "description": ""},
         None, "letterSpacing ->None (no heuristic match)"),
        ("sgs/media", "positionX",
         {"attr_type": "number", "enum_values": None, "description": ""},
         None, "positionX ->None (styling attr, no heuristic match)"),
    ]
    failures = []
    for block_slug, attr_name, metadata, expected, label in cases:
        actual, source, conf = detect_role_from_block_json(
            block_slug, attr_name, metadata,
        )
        ok = actual == expected
        marker = "PASS" if ok else "FAIL"
        print(f"  [{marker}] {label}")
        print(f"         expected={expected!r}  actual={actual!r}  "
              f"source={source!r}  confidence={conf!r}")
        if not ok:
            failures.append(label)
    print()
    if failures:
        print(f"{len(failures)} test(s) FAILED:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"All {len(cases)} role-detection tests PASSED.")
    return 0


if __name__ == "__main__":
    # Lightweight self-test entry — `--self-test` runs synthetic role-detection
    # tests without touching the DB. Other args fall through to main().
    if len(sys.argv) >= 2 and sys.argv[1] == "--self-test":
        sys.exit(_self_test_role_detection())
    main()
