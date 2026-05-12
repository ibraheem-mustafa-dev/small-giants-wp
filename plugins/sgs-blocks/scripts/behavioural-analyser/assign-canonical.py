"""
assign-canonical.py
===================
Backfills `canonical_slot`, `role`, and `derived_selector` for every row in
`block_attributes` in sgs-framework.db.

Algorithm (per Spec 15 §3.3, §5.1, §5.2):

1. Load vocabulary tables from the DB at startup (slot_synonyms, property_suffixes,
   modifier_suffixes).
2. For each block_attributes row, decompose attr_name by stripping known suffixes
   from the right in the prescribed order, leaving a slot base word (stem).
3. Resolve canonical_slot via slot_synonyms (direct PK match then alias search).
4. Resolve role via property_suffixes (the property suffix that was peeled).
5. Derive selector as  .sgs-<block-short-slug>__<canonical_slot>.
6. Apply v1 fingerprint overrides where an explicit selector is declared in
   tools/recogniser/data/fingerprints.json attr_extractors.
7. UPDATE block_attributes; INSERT gap candidates for unresolved rows.
8. Print self-check counts and 5 sample rows.
"""

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
# fingerprints.json lives in the repo; resolve relative to this file.
FINGERPRINTS_PATH = (
    Path(__file__).resolve().parents[4] / "tools/recogniser/data/fingerprints.json"
)

# ---------------------------------------------------------------------------
# Vocabulary loaders
# ---------------------------------------------------------------------------

def load_slot_synonyms(conn: sqlite3.Connection) -> dict[str, dict]:
    """
    Returns a mapping:
        lowercase_term -> {
            'canonical_slot': str,
            'role': str | None,
        }
    Covers both canonical slugs and every alias in their JSON arrays.
    """
    cur = conn.cursor()
    cur.execute("SELECT canonical_slot, aliases, role FROM slot_synonyms")
    rows = cur.fetchall()

    mapping: dict[str, dict] = {}
    for canonical_slot, aliases_json, role in rows:
        info = {"canonical_slot": canonical_slot, "role": role}
        # Canonical itself
        mapping[canonical_slot.lower()] = info
        # Each alias
        try:
            aliases = json.loads(aliases_json) if aliases_json else []
        except json.JSONDecodeError:
            aliases = []
        for alias in aliases:
            mapping[alias.lower()] = info
    return mapping


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


def load_fingerprint_overrides(fingerprints: dict) -> dict[str, dict[str, str]]:
    """
    Builds:
        override_map[block_slug][attr_name] = selector_string

    Only populates entries where an attr_extractor has an explicit selector.
    """
    override_map: dict[str, dict[str, str]] = {}
    for block_slug, entry in fingerprints.items():
        if not block_slug.startswith("sgs/"):
            continue
        extractors = entry.get("attr_extractors", [])
        if not extractors:
            continue
        for ext in extractors:
            attr = ext.get("attr")
            selector = ext.get("selector")
            if attr and selector:
                override_map.setdefault(block_slug, {})[attr] = selector
    return override_map


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
# Selector derivation (§5.2)
# ---------------------------------------------------------------------------

def derive_selector(block_slug: str, canonical_slot: str) -> str:
    """
    Derives the BEM selector: .sgs-<block-short-slug>__<canonical_slot>

    canonical_slot is already lowercase (from slot_synonyms canonical_slot column).
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

    # Load vocabulary
    slot_map = load_slot_synonyms(conn)
    property_suffixes = load_property_suffixes(conn)
    modifier_map = load_modifier_suffixes(conn)

    # Load fingerprint overrides
    with open(FINGERPRINTS_PATH, "r", encoding="utf-8") as fh:
        fingerprints_raw = json.load(fh)
    fp_overrides = load_fingerprint_overrides(fingerprints_raw)

    # Ensure gap candidates table exists
    ensure_gap_table(conn)

    # Fetch un-touched block_attributes rows only (Phase 3 §3.7 + §3.8
    # incremental-safety: never overwrite any of canonical_slot / role /
    # derived_selector values that earlier runs or backfills have already
    # populated. To force re-canonicalisation, clear those columns
    # explicitly via SQL.).
    cur = conn.cursor()
    cur.execute(
        "SELECT id, block_slug, attr_name FROM block_attributes "
        "WHERE canonical_slot IS NULL "
        "AND role IS NULL "
        "AND derived_selector IS NULL"
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

        stem, prop_suffix, prop_info, modifiers = decompose_attr_name(
            attr_name, property_suffixes, modifier_map
        )

        # Slot resolution
        canonical_slot, slot_role = resolve_canonical_slot(stem, slot_map)

        # Role: property suffix role takes priority; fall back to slot role
        if prop_info and prop_info.get("role"):
            role = prop_info["role"]
        elif slot_role:
            role = slot_role
        else:
            role = None

        if canonical_slot is not None:
            # Derive selector from formula
            derived_selector = derive_selector(block_slug, canonical_slot)

            # v1 fingerprint override — use explicit selector if present
            # for this (block_slug, attr_name) pair.
            # The formula selector is replaced; the fingerprint selector is
            # used as-is (may be a fallback chain like '.sgs-hero__headline, h1, h2').
            fp_block = fp_overrides.get(block_slug, {})
            if attr_name in fp_block:
                derived_selector = fp_block[attr_name]

            updates.append((canonical_slot, role, derived_selector, row_id))
            resolved_count += 1
        else:
            # Gap candidate — canonical_slot stays NULL in block_attributes.
            # However, if the fingerprint has an explicit selector for this attr,
            # write derived_selector from the fingerprint even without a canonical_slot.
            # This preserves extraction capability for known attrs pending slot vocab growth.
            fp_block = fp_overrides.get(block_slug, {})
            fp_selector: Optional[str] = fp_block.get(attr_name)

            if fp_selector:
                # Partial update: only derived_selector (canonical_slot and role stay NULL)
                conn.execute(
                    """
                    UPDATE block_attributes
                       SET derived_selector = ?
                     WHERE id = ?
                    """,
                    (fp_selector, row_id),
                )

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


if __name__ == "__main__":
    run()
