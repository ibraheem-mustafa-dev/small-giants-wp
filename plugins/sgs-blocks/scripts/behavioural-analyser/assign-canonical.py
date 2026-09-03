"""
assign-canonical.py
===================
Backfills `canonical_slot`, `role`, and `derived_selector` for every row in
`block_attributes` in sgs-framework.db.

Algorithm (per Spec 31, §5.1, §5.2):

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
    Full decomposition per Spec 31:
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
# Stale-suffix-derived-role healing (2026-08-01)
# ---------------------------------------------------------------------------
# Root cause: a populated `block_attributes.role` was preserved FOREVER by the
# main loop (`final_role = role if existing_role is None else existing_role`),
# so a correction to `property_suffixes` (e.g. a suffix that was seeded with
# the wrong role) could never retouch a row that had already derived its role
# from that suffix — the fix would apply only to attrs not yet processed.
# This is a universal problem, not specific to any one suffix, so the healing
# rule below is UNIVERSAL and RULE-SHAPED: it never names a block, attribute,
# or suffix. It re-derives `role` from the CURRENT `property_suffixes` table
# only for rows whose existing role has NOT already been "graduated" past the
# raw suffix-peel layer — i.e. rows still sitting on whatever the peel
# produced, with no later, more-specific classification layered on top.
#
# A role counts as graduated (and is therefore left untouched) when EITHER:
#   1. It already belongs to the DB's 'content-bearing' classification
#      (`roles.classification`) — the role-detection pass
#      (`apply_role_detection_inline`) and hand-authored overrides both only
#      ever assign content-bearing roles, so a content-bearing role already
#      reflects a deliberate upgrade past the generic suffix peel, not a
#      leftover default; or
#   2. The (block_slug, attr_name) pair is a key in
#      `attr-classification-overrides.json` (the reseed-durable override
#      truth file `sgs-update-v2.py` applies as the FINAL Stage-1 writer) —
#      any field on that row may have been hand-curated, so it is out of
#      scope for an automatic peel-driven rewrite regardless of which column
#      the curation targeted.
#
# Verified empirically (2026-08-01) against all 846 sgs/* block_attributes
# rows with a populated role: this guard changes role for exactly the rows
# whose current role is a stale, non-graduated suffix-peel artefact, and
# leaves all "graduated" rows (content-bearing OR override-covered) bit-for-
# bit unchanged — see the run log referenced from the D-log entry for this
# fix. Both graduation signals are DB/file-driven; neither test ever spells
# out a block slug, attribute name, or suffix (R-31-9).

_OVERRIDES_JSON_PATH = Path(__file__).resolve().parent.parent / "attr-classification-overrides.json"

# TIER 3.7 (2026-08-05, Bean) reads this file directly for the optional 3rd array
# element roles.json entries may carry (`{"excludes_attr_types": [...]}`) — see
# `_load_role_type_exclusions()` below. Same file db_lookup.py's `_migrate_roles_table()`
# syncs into the `roles` DB table; that loader only ever reads val[0]/val[1] (classification,
# description) by INDEX, not tuple-unpack, so a 3rd element is invisible to it and safe to add
# without touching db_lookup.py (verified: `_load_roles_seed()` does
# `out[name] = (val[0], val[1] if len(val) > 1 else "")`).
_ROLES_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "roles.json"


def load_override_keys(path: Path = _OVERRIDES_JSON_PATH) -> frozenset[tuple[str, str]]:
    """Return the set of (block_slug, attr_name) pairs curated in the
    reseed-durable override truth file.

    Only the KEYS are needed here (not the field values) — membership alone
    means "this row may have been hand-curated on any column", so the role
    healer must leave it alone regardless of which field the curation
    actually touched.

    Fails soft (empty set) on a missing/malformed file. This is intentional
    for THIS guard only: `sgs-update-v2.py`'s own loader already fails loud
    on a missing/malformed override file for the load-bearing write path
    (Stage 1C), so by the time this healer runs as part of the same reseed
    the file is already known-good — a soft fallback here only matters for
    standalone/test invocations of assign-canonical.py, where treating "no
    override file found" as "no known overrides" (rather than halting) is
    the correct behaviour for a read-only guard.
    """
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        entries = data.get("entries")
        if not isinstance(entries, list):
            return frozenset()
        return frozenset(
            (entry["slug"], entry["attr"])
            for entry in entries
            if isinstance(entry, dict) and entry.get("slug") and entry.get("attr")
        )
    except (OSError, ValueError, KeyError):
        return frozenset()


def load_content_bearing_roles(conn: sqlite3.Connection) -> frozenset[str]:
    """Return role_names classified 'content-bearing' in the `roles` table.

    Mirrors converter/db/db_lookup.py's `_content_bearing_roles()` — DB-driven,
    never a hardcoded role list (R-31-1).
    """
    try:
        rows = conn.execute(
            "SELECT role_name FROM roles WHERE classification = 'content-bearing'"
        ).fetchall()
    except sqlite3.OperationalError:
        return frozenset()
    return frozenset(r[0] for r in rows)


def resolve_role_with_healing(
    existing_role: Optional[str],
    computed_role: Optional[str],
    prop_info: Optional[dict],
    block_slug: str,
    attr_name: str,
    content_bearing_roles: frozenset[str],
    override_keys: frozenset[tuple[str, str]],
) -> Optional[str]:
    """Decide the role to WRITE for a row, healing a stale suffix-derived role
    where safe and otherwise preserving whatever is already populated.

    Order of precedence:
      1. No existing role -> use the freshly computed role (first-fill, the
         original behaviour, unaffected by this change).
      2. Existing role populated, but NOT "graduated" (see module docstring
         above) AND the current property-suffix peel disagrees with it ->
         HEAL: re-derive from the (possibly just-corrected) suffix table.
      3. Anything else -> PRESERVE the existing role untouched (original
         incremental-safety behaviour).
    """
    if existing_role is None:
        return computed_role

    is_graduated = (
        existing_role in content_bearing_roles
        or (block_slug, attr_name) in override_keys
    )
    if is_graduated:
        return existing_role

    if prop_info and prop_info.get("role") and prop_info["role"] != existing_role:
        return prop_info["role"]

    return existing_role


def refresh_stale_suffix_roles(
    conn: sqlite3.Connection,
    property_suffixes: dict[str, dict],
    modifier_map: dict[str, str],
) -> dict:
    """Heal stale suffix-derived roles on rows the main backfill loop never
    revisits (`canonical_slot` already populated, so they never match its
    `WHERE canonical_slot IS NULL` scope).

    Covers TWO shapes of the same problem, both invisible to the main loop for
    the same reason (`canonical_slot` already set):
      1. HEAL — `role` is populated but stale against the CURRENT
         `property_suffixes` table (the original 2026-08-01 case).
      2. REVIVE — `role` is NULL (2026-08-05, D497 follow-up). Proven root
         cause: a row whose `canonical_slot` survived a role-clearing
         operation (e.g. clearing hand overrides for reseed) was invisible to
         BOTH this healer's old `role IS NOT NULL` scope AND the main loop's
         `canonical_slot IS NULL` scope, so it reached
         `apply_role_detection_inline()` still NULL. That function's own
         name-regex/structural tiers rarely match a bare CSS-family suffix
         (e.g. `Size`, `Colour`), so the row fell through to TIER 3 (the
         generic `styling` backstop, `role IS NULL AND css_property IS NOT
         NULL`), which claims ANY still-NULL row with a css_property before a
         suffix-derived family role (`typography`/`color`/`visual`/`layout`)
         ever gets a chance to re-assert itself. Measured 2026-08-05: clearing
         172 override-adjacent rows and reseeding degraded 53 to `styling` and
         left 18 NULL. Revive runs the SAME suffix peel this healer already
         does for case 1, just without requiring a pre-existing role — the
         `resolve_role_with_healing(existing_role=None, ...)` branch already
         handles that correctly (first-fill: "no existing role -> use the
         freshly computed role"), so no new decision logic is needed, only a
         wider `WHERE`.

    Ordering this runs BEFORE `apply_role_detection_inline()` is what makes
    REVIVE work: by the time TIER 3's styling backstop runs, a row this pass
    could resolve is no longer NULL, so TIER 3 never sees it. A row this pass
    canNOT resolve (no property-suffix match — e.g. a genuine content attr
    like an image/alt companion) is left NULL exactly as before, so TIER 0A /
    the structural tier / the name regex / TIER 3 downstream all still get
    their normal first look at it. TIER 3.6's boolean sweep runs LAST and
    re-reads the DB by `roles.classification` rather than by write source, so
    it still catches a boolean this pass might mis-fill with a content-bearing
    suffix role (none exist in `property_suffixes` today, but the sweep is the
    backstop either way).

    Only the `role` column is written here — `canonical_slot` and
    `derived_selector` are left completely untouched for every row this pass
    considers, so this cannot regress slot/selector resolution for any
    attribute; it is scoped purely to (re)deriving role from the CURRENT
    `property_suffixes` table via `resolve_role_with_healing`'s graduation
    guard (content-bearing roles and curated overrides are never touched).

    Universal (R-31-9): iterates every row `canonical_slot` already covers, no
    block/attr/suffix name appears in this function.
    """
    content_bearing_roles = load_content_bearing_roles(conn)
    override_keys = load_override_keys()

    cur = conn.cursor()
    cur.execute(
        "SELECT id, block_slug, attr_name, role "
        "FROM block_attributes "
        "WHERE canonical_slot IS NOT NULL"
    )
    rows = cur.fetchall()

    healed = 0
    revived = 0
    role_updates: list[tuple[str, int]] = []
    for row in rows:
        row_id: int = row["id"]
        block_slug: str = row["block_slug"]
        attr_name: str = row["attr_name"]
        existing_role: Optional[str] = row["role"]

        stem, prop_suffix, prop_info, modifiers = decompose_attr_name(
            attr_name, property_suffixes, modifier_map
        )
        computed_role = prop_info["role"] if prop_info and prop_info.get("role") else None

        final_role = resolve_role_with_healing(
            existing_role,
            computed_role,
            prop_info,
            block_slug,
            attr_name,
            content_bearing_roles,
            override_keys,
        )
        if final_role != existing_role:
            role_updates.append((final_role, row_id))
            if existing_role is None:
                revived += 1
            else:
                healed += 1

    if role_updates:
        conn.executemany(
            "UPDATE block_attributes SET role = ? WHERE id = ?", role_updates
        )
        conn.commit()

    return {"considered": len(rows), "healed": healed, "revived": revived}


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
    # Role-only updates for rows where canonical_slot did NOT resolve but role
    # is independently derivable (2026-08-04, see the root-cause report at
    # .claude/reports/2026-08-04-attribute-seeding-root-cause.md §2). Writing
    # `role` was illegally coupled to `canonical_slot` resolving: root-scoped
    # block-level colour props (e.g. borderColourHover) have no element word
    # left after the peel, so canonical_slot correctly stays NULL — but a
    # correctly-computed role must not be thrown away with it. This list is
    # written via its own UPDATE that touches ONLY the role column, so
    # canonical_slot/derived_selector are never disturbed for these rows.
    role_only_updates: list[tuple[str, int]] = []  # (role, id)

    # Loaded once for the stale-suffix-role healing guard (see the docstring
    # block above `refresh_stale_suffix_roles`) — reused for both this loop's
    # existing-role rows and the post-loop `refresh_stale_suffix_roles` pass.
    content_bearing_roles = load_content_bearing_roles(conn)
    override_keys = load_override_keys()

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

        # Role resolution is independent of whether canonical_slot resolves
        # (2026-08-04 decoupling — see role_only_updates comment above).
        # Preserve existing populated values (loosened scope, 2026-05-30),
        # EXCEPT heal a stale suffix-derived role per `resolve_role_with_healing`
        # (2026-08-01) — see the module docstring above `refresh_stale_suffix_roles`
        # for the universal, rule-shaped graduation guard this applies.
        final_role = resolve_role_with_healing(
            existing_role,
            role,
            prop_info,
            block_slug,
            attr_name,
            content_bearing_roles,
            override_keys,
        )

        if canonical_slot is not None:
            # Derive selector from formula. (Fingerprint selector overrides moved to
            # ATTR_CLASSIFICATION_OVERRIDES — applied as the final Stage-1 writer.)
            derived_selector = derive_selector(block_slug, canonical_slot)
            final_selector = (
                derived_selector if existing_selector is None else existing_selector
            )
            updates.append((canonical_slot, final_role, final_selector, row_id))
            resolved_count += 1
        else:
            # canonical_slot stays NULL in block_attributes.
            # (The fingerprint derived_selector write for slot-less known attrs moved
            # to ATTR_CLASSIFICATION_OVERRIDES, the final Stage-1 writer, so extraction
            # capability is preserved there — P-FINGERPRINT-MIGRATION 2026-07-03.)
            gap_count += 1

            # role is written independently, even though canonical_slot did
            # not resolve — a root-scoped block-level colour prop (e.g.
            # borderColourHover) has no element word to resolve a slot from,
            # but its role ('color') is still correctly computed above and
            # must not be discarded (2026-08-04 root-cause report §2).
            if final_role is not None and final_role != existing_role:
                role_only_updates.append((final_role, row_id))

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

    # Batch UPDATE role-only rows (canonical_slot/derived_selector untouched —
    # 2026-08-04 decoupling, see role_only_updates comment above).
    if role_only_updates:
        conn.executemany(
            "UPDATE block_attributes SET role = ? WHERE id = ?",
            role_only_updates,
        )

    conn.commit()

    # ------------------------------------------------------------------
    # Stale-suffix-role healing — rows the loop above never revisits
    # (2026-08-01). The loop above only fetches `WHERE canonical_slot IS
    # NULL`, so any row whose canonical_slot was resolved on an EARLIER run
    # never re-enters it — a `property_suffixes` correction could never heal
    # such a row without this pass. See `refresh_stale_suffix_roles` docstring
    # for the universal, rule-shaped graduation guard (content-bearing roles
    # and curated overrides are never touched by this pass).
    # ------------------------------------------------------------------
    _healing = refresh_stale_suffix_roles(conn, property_suffixes, modifier_map)
    print(
        f"[role-healing] rows considered={_healing['considered']} "
        f"healed={_healing['healed']} revived={_healing['revived']}"
    )

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
    # Every tier's count is printed, not just the content ones: a tier that claims rows
    # silently is indistinguishable from a tier that did not run (the exact shape of the
    # 2026-06-30 root cause, where role derivation never fired and nothing said so).
    print(
        f"[role-detection] content-bearing roles: filled={_rd['filled']} "
        f"upgraded={_rd['upgraded']} structural={_rd['structural_filled']} | "
        f"technical={_rd['technical_filled']} styling={_rd['styling_filled']} "
        f"styling-wrapper={_rd['wrapper_styling_filled']} "
        f"styling-upgraded={_rd['styling_upgraded']} "
        f"icon-family-corrected={_rd['icon_family_corrected']} "
        f"fx-styling-corrected={_rd['fx_styling_corrected']} "
        f"native-wp-seeded={_rd['native_wp_seeded']} "
        f"boolean-visibility-seeded={_rd['boolean_visibility_seeded']} "
        f"unit-inherited={_rd['unit_inherited']} "
        f"breakpoint-inherited={_rd['breakpoint_inherited']} "
        f"enum={_rd['enum_filled']} "
        f"link-content={_rd['link_filled']} "
        f"boolean-swept={_rd['boolean_swept']} | "
        f"companion-image={_rd['companion_image_filled']} "
        f"companion-alt={_rd['companion_alt_filled']} "
        f"companion-link={_rd['companion_link_filled']} "
        f"companion-conflicts={_rd['companion_conflicts']}"
    )
    if _rd.get("companion_error"):
        print(
            f"[role-detection] !! companion tier DEGRADED: {_rd['companion_error']}",
            file=sys.stderr,
        )

    # ------------------------------------------------------------------
    # Self-checks
    # ------------------------------------------------------------------

    cur.execute("SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL")
    populated_count: int = cur.fetchone()[0]

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
    print(f"role-only populated (no slot) : {len(role_only_updates)}")
    print(f"Gap candidates (this run)     : {gap_count}")
    print(f"DB canonical_slot non-null    : {populated_count}")
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

# Import the shared derivation function. db_lookup.py's canonical implementation
# lives at converter/db/db_lookup.py (moved there EXECUTION Step 9, Phase 3,
# 2026-07-04 — orchestrator/converter_v2/db_lookup.py is now a re-export shim).
# Add to sys.path so the runtime library and this enrichment script share the
# SAME implementation. Renamed from _CONVERTER_V2_DIR -> _DB_LOOKUP_DIR
# (2026-07-05) — the old name was a holdover from when db_lookup.py lived
# inside orchestrator/converter_v2/; it has pointed at converter/db since
# Step 9 and the frozen converter_v2 tree no longer exists (Step 16).
_DB_LOOKUP_DIR = (
    Path(__file__).resolve().parents[1] / "converter" / "db"
)
if str(_DB_LOOKUP_DIR) not in sys.path:
    sys.path.insert(0, str(_DB_LOOKUP_DIR))

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
        # The sys.path setup for converter/db (Step 10, 2026-07-04 — was
        # converter_v2 before Step 9) is done at the top of this file via
        # _DB_LOOKUP_DIR; import is safe here.
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
    # ⛔ REGRESSION + REVERT, 2026-08-05. `dashiconName`/`wpIconName` were briefly added here
    # (and `sgs/icon.iconName`'s override deleted so this rule would claim it) on the belief
    # — taken from `roles.json`'s own description — that `icon-lucide`/`icon-dashicon`/
    # `icon-wp-icon` have "NO consumer in the converter". THAT DESCRIPTION IS WRONG. The
    # consumer is `resolve_icon_kind()` (converter/services/field_extractors.py:100-142) plus
    # the ICON arm in `converter/services/extraction.py:1100-1141`, which dispatches on
    # `role.startswith("icon-")` — shipped at D263 (2026-07-03) and live-verified on page 8.
    # Routing these attrs to `identity` removed them from that dispatch and broke 3 tests
    # (`test_icon_leaf_lifts_lucide_slug`, `..._dashicon_by_kind`, `..._wp_icon_by_kind`).
    #
    # Proven by experiment, not inferred: restoring the three `icon-*` roles in the DB turned
    # 3 failed / 3 passed back into 6 passed with no other change.
    #
    # ⚠ THE BUILD DID NOT CATCH THIS. `npm run build`'s prebuild pytest step runs only
    # `scripts/oracle/tests/`; `scripts/converter/tests/` is outside it, so a converter
    # regression ships green. That gap is the real lesson here.
    (re.compile(r"^(icon|iconName|iconSource|glyph|productName|productSlug)$"),
     "identity", "high"),
    # link-href — URL-like attrs
    # `ctaUrl`/`cta2Url` added 2026-08-05 (D497 root-cause). The `Url` property suffix
    # resolves to the GENERIC `content` role because it cannot distinguish a hyperlink URL
    # from a media-asset URL (`imageUrl`, `videoUrl`). `ctaUrl` carried a hand override to
    # force `link-href`; its identical sibling `cta2Url` did NOT, and sat on the wrong
    # generic role — live proof the override was a one-off patch over a mechanism gap
    # rather than a real "code X means Y" case. Both verified unique DB-wide.
    (re.compile(
        r"^(link|linkTarget|linkUrl|linkHref|url|href|destination|destinationUrl|"
        r"ctaUrl|cta2Url)$"
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
        # 2026-08-05 (D497 root-cause): three real copy attrs that each needed a hand
        # override purely because they were absent here. `role` is sgs/team-member's
        # JOB TITLE text (the collision with the DB's own `role` COLUMN is a human
        # legibility trap, not a mechanism one — nothing branches on the literal attr
        # name). `attribution` is sgs/quote's byline. `quote` is sgs/testimonial's body
        # copy, which was sitting on the generic `content` catch-all rather than the
        # specific role. All three verified unique DB-wide (one block each).
        r"role|attribution|quote|"
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


def _structural_role_map() -> tuple[dict, str | None, set, set, dict, dict]:
    """Structural content-role proposals, computed ONCE per reseed.

    Track A / Spec 35 (2026-08-04). Returns
    ({(block_slug, attr_name): role}, error, {(block_slug, attr_name) vetoed by D1},
     {(block_slug, attr_name) proven wrapper-painted by D4}, {styling_upgrades},
     {icon_family_corrections}).

    This is the FR-31-2.1a replacement for name-guessing. Roles come from what the
    block's own source actually DOES with a value -- which escaping function receives it
    in render.php, which control edit.js binds it to, whether its default is i18n-wrapped
    -- never from its spelling. Full rationale, measured per-detector precision and the
    enumerated blind spots live in
    `plugins/sgs-blocks/scripts/content-role-detect/fingerprint_content_roles.py`.

    Computed once because the detectors shell out to a PHP tokenizer and two Python
    passes over the whole block tree; calling that per attribute would be pathological.

    On failure this returns an EMPTY map and a non-None error string. The caller MUST
    surface that error -- it must never look like "the structural tier ran and found
    nothing", because a silently-degraded tier that falls back to the name regex would
    read exactly like a working one. That is the self-repairing-mechanism trap: anything
    that quietly heals also quietly hides.
    """
    detect_dir = Path(__file__).resolve().parent.parent / "content-role-detect"
    module_path = detect_dir / "fingerprint_content_roles.py"
    if not module_path.is_file():
        return {}, f"fingerprint module missing at {module_path}", set(), set(), {}, {}

    try:
        import importlib.util

        spec = importlib.util.spec_from_file_location("sgs_fingerprint", module_path)
        if spec is None or spec.loader is None:
            return {}, f"could not load a module spec from {module_path}", set(), set(), {}, {}
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        result = mod.compute()
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller, never swallowed
        return {}, f"{type(exc).__name__}: {exc}", set(), set(), {}, {}

    # Two maps, deliberately kept apart.
    #
    # `assignments` are POSITIVE content verdicts -- D1/D3 saw the value reach visible
    # output. `vetoed` is the opposite evidence of equal quality: D1 walked EVERY usage
    # site and found none content-bearing (verdicts are all NOT-content / value-fragment).
    # A veto is a measurement, not an absence, so it earns the 'technical' role rather
    # than a bare NULL -- see that role's entry in data/roles.json.
    #
    # Rows NO detector reached are in neither map and stay NULL. "Unreached" and "proven
    # technical" are different facts; collapsing them would rebuild the very ambiguity
    # these roles were added to remove.
    # Content verdicts FIRST, then D6/D7's specific-role verdicts. `dict(a, **b)` order
    # matters: `assignments` is written last so a content verdict can never be overwritten
    # by a styling/technical one. The two sets are disjoint today by construction
    # (specific_roles is drawn from D4's leftovers, which excludes anything assigned), so
    # this ordering decides nothing right now — it is here so the RULE is right if that
    # ever stops being true.
    _specific = {
        (s["block_slug"], s["attr_name"]): s["role"]
        for s in result.get("specific_roles", [])
    }
    _content = {(a["block_slug"], a["attr_name"]): a["role"] for a in result["assignments"]}
    return (
        {**_specific, **_content},
        None,
        # D1 vetoes UNION D4's proven referenced-not-output rows. Both are
        # positive evidence that the value is machine-facing, reached by
        # different routes:
        #   D1 veto  -- walked every escaping call, none content-bearing.
        #   D4       -- the block demonstrably READS it, it never reaches an
        #               escaping call, it paints no CSS, and its consumer lives
        #               in a subsystem proven to emit no CSS at all.
        # D4's 'needs-review' bucket is deliberately NOT included: it is reported
        # for a human, and folding it in here would be the "leftovers are
        # technical" inference this role was specifically built to avoid.
        #
        # D4's 'wrapper-rendered-styling' bucket is excluded HERE for a different
        # reason and is NOT unreached -- it is returned separately below, because
        # those rows are proven STYLING, not technical. Filing them technical
        # would be a wrong classification, not merely a weak one.
        {(v["block_slug"], v["attr_name"]) for v in result.get("vetoed", [])}
        | {(t["block_slug"], t["attr_name"]) for t in result.get("technical_refs", [])},
        # D4 WRAPPER-PAINTED (2026-08-06, Bean's ruling: NULL is only for a row
        # that is UNREACHED or UNSEEDABLE -- these are neither).
        #
        # Evidence, of the same positive class as a D1 veto and reached by a
        # third route: the attribute's ONLY consumer anywhere in the plugin is
        # `includes/class-sgs-container-wrapper.php`, which is a CSS-rendering
        # engine end to end -- everything it reads off the attributes bag, it
        # reads in order to paint a declaration. So a wrapper-only read is
        # styling BY CONSTRUCTION. That is a measurement of what the value does,
        # not an inference from its spelling.
        #
        # These rows carry NO css_property and never will: the emission scanner
        # reads each block's own render.php/style.css and never the shared
        # wrapper, and `sgs/container` -- the block every composite mirrors
        # (R-31-9) -- deliberately declines to map the decorative families
        # (overlayGradient*/shapeDivider*/bgSvg*) in its `decorative` element.
        # So TIER 3's `css_property IS NOT NULL` gate can never reach them, and
        # leaving them NULL made 33 settled rows read as open work on every run.
        {(w["block_slug"], w["attr_name"]) for w in result.get("wrapper_styling", [])},
        # GENERIC-STYLING UPGRADES (2026-08-06, Bean). Rows already holding the generic
        # `styling` backstop whose paint site proves a SPECIFIC role. Kept separate from
        # every map above because these OVERWRITE an existing role rather than filling a
        # NULL — the only pass in this file that does, and deliberately narrow for it.
        {(u["block_slug"], u["attr_name"]): u["role"]
         for u in result.get("styling_upgrades", [])},
        # ICON-SOURCE-FAMILY CORRECTIONS (2026-08-06, D503). Rows holding a WRONG role
        # within a resolved icon-source family (e.g. sgs/separator's contentIconWpIcon/
        # contentIconDashicon/contentIconEmoji), keyed to the CORRECT icon-<kind> role.
        # A second overwrite pass, deliberately separate from styling_upgrades above --
        # that one is gated on the row currently holding the generic `styling` backstop;
        # this one is gated on the row currently holding ANY non-icon-* role, which is a
        # different guard for a different defect class (see TIER 3.16).
        {(i["block_slug"], i["attr_name"]): i["role"]
         for i in result.get("icon_family_corrections", [])},
    )


def _companion_role_pairs() -> tuple[list[dict], str | None]:
    """Load Detector 5's (block_slug, image_attr, alt_attr) pairs (D497, 2026-08-05).

    Mirrors `_structural_role_map()`'s load-by-path shape deliberately: Detector 5
    (`content-role-detect/detector5_image_alt_companion.py`) is the SAME evidence
    class as the structural detectors it sits beside -- a measured fact about which
    attribute's VALUE physically reaches the ``src=``/``alt=`` slot of the same
    rendered ``<img>`` emission, not a guess from either attribute's name. See the
    detector module's own docstring for the full method; this function only loads it
    and calls its ``run_all()`` (every block, not a single one) -- never
    ``KNOWN_PAIRS``, which is the detector's own self-grading scoreboard against the
    six pairs D497 named, not an input to derive from.

    Returns ``([], error)`` on any failure -- import error, parse error, whatever --
    so the caller can degrade exactly like the structural tier: report loudly and
    keep the reseed alive rather than crash it.
    """
    detect_dir = Path(__file__).resolve().parent.parent / "content-role-detect"
    module_path = detect_dir / "detector5_image_alt_companion.py"
    if not module_path.is_file():
        return [], f"detector5 module missing at {module_path}"

    try:
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "sgs_detector5_companion", module_path
        )
        if spec is None or spec.loader is None:
            return [], f"could not load a module spec from {module_path}"
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        pairs = mod.run_all()
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller, never swallowed
        return [], f"{type(exc).__name__}: {exc}"

    return pairs, None


def _apply_companion_pairs(conn: sqlite3.Connection, pairs: list[dict]) -> dict:
    """Write Detector 5's derived pairs to `block_attributes` (D497, 2026-08-05).

    Factored out from `apply_companion_role_tier()` so the self-test can drive this
    write logic directly against planted rows without invoking Detector 5 or touching
    a real block tree at all.

    Per derived ``(block_slug, image_attr, alt_attr)`` triple, writes up to three
    facts, each with its own overwrite discipline:

      1. ``role='image-object'`` on the image attr row  -- FILL-NULL ONLY. An image
         attr that already carries ``role='image-object'`` (e.g. the name regex
         already got there first) is AGREEMENT, not conflict, and is left alone. Any
         OTHER pre-existing role is also left alone -- every tier in this file obeys
         "never overwrite an existing role"; this one is not an exception.
      2. ``role='image-alt'`` on the alt attr row        -- same FILL-NULL discipline.
      3. ``alt_companion_attr=<image_attr>`` on the alt attr row -- a DIFFERENT rule.
         This column has a single writer (this tier), so it is set whenever the pair
         is derived and the column is currently NULL. If it already holds a
         DIFFERING value, that is a genuine conflict: the existing value wins and the
         conflict is reported to stderr, never silently overwritten.
    """
    cur = conn.cursor()
    cols = [r[1] for r in conn.execute("PRAGMA table_info(block_attributes)").fetchall()]
    has_companion_col = "alt_companion_attr" in cols

    image_filled = 0
    alt_filled = 0
    companion_filled = 0
    companion_conflicts = 0

    for pair in pairs:
        block_slug = pair["block_slug"]
        image_attr = pair["image_attr"]
        alt_attr = pair["alt_attr"]

        image_row = conn.execute(
            "SELECT id, role FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, image_attr),
        ).fetchone()
        if image_row is not None:
            image_id, image_role = image_row
            if image_role is None:
                cur.execute(
                    "UPDATE block_attributes SET role = 'image-object' WHERE id = ?",
                    (image_id,),
                )
                image_filled += 1
            # else: role already set (whether 'image-object' -- agreement -- or
            # something else entirely) -- fill-NULL discipline, never overwritten.

        alt_row = conn.execute(
            "SELECT id, role"
            + (", alt_companion_attr" if has_companion_col else "")
            + " FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, alt_attr),
        ).fetchone()
        if alt_row is None:
            continue
        alt_id, alt_role = alt_row[0], alt_row[1]
        existing_companion = alt_row[2] if has_companion_col and len(alt_row) > 2 else None

        if alt_role is None:
            cur.execute(
                "UPDATE block_attributes SET role = 'image-alt' WHERE id = ?", (alt_id,)
            )
            alt_filled += 1
        # else: role already set -- fill-NULL discipline, never overwritten (this is
        # the row a stripped guard would break: see `_self_test_companion_tier`).

        if has_companion_col:
            if existing_companion is None:
                cur.execute(
                    "UPDATE block_attributes SET alt_companion_attr = ? WHERE id = ?",
                    (image_attr, alt_id),
                )
                companion_filled += 1
            elif existing_companion != image_attr:
                companion_conflicts += 1
                print(
                    f"!! COMPANION CONFLICT: {block_slug}.{alt_attr}.alt_companion_attr "
                    f"already = {existing_companion!r}, Detector 5 derived "
                    f"{image_attr!r} for this pair -- keeping the existing value, "
                    "NOT overwriting.",
                    file=sys.stderr,
                )
            # else: existing_companion == image_attr -- agreement, no-op.

    conn.commit()
    return {
        "image_filled": image_filled,
        "alt_filled": alt_filled,
        "companion_filled": companion_filled,
        "companion_conflicts": companion_conflicts,
    }


def apply_companion_role_tier(conn: sqlite3.Connection) -> dict:
    """TIER 0A -- IMAGE<->ALT COMPANION, from Detector 5 (D497, 2026-08-05).

    Sits WITH the structural tier, ABOVE the name regex, and runs literally FIRST in
    `apply_role_detection_inline()` -- before that function's `rows` snapshot is
    taken. That ordering is load-bearing, not cosmetic: the name-regex loop below
    decides whether to fill a role by trusting the value it already read into that
    snapshot, not a fresh DB read, so any tier writing roles ahead of the name regex
    must land its writes BEFORE the snapshot query runs, or the snapshot would still
    show NULL and the name regex would go on to guess (and possibly clobber) a row
    this tier already settled.

    WHY THIS EVIDENCE CLASS OUTRANKS A NAME GUESS: Detector 5 does not read either
    attribute's NAME. It reads which attribute's VALUE physically arrives at the
    ``src=``/``alt=`` slot of the SAME rendered ``<img>`` emission in the block's own
    render.php -- the identical "measured fact about what the block DOES" argument
    the structural tier already makes for outranking `_ATTR_NAME_RULES`.

    Degrades exactly like the structural tier on any detector failure (import error,
    parse error, missing module): prints a loud DEGRADED warning to stderr and
    returns zero counts with `companion_error` set -- never raises, so a reseed still
    completes on a bad day, but the run is visibly degraded rather than silently one.
    """
    pairs, error = _companion_role_pairs()
    if error:
        print(
            "\n!! COMPANION ROLE TIER DID NOT RUN -- image<->alt pairs will not be "
            "derived this reseed.\n"
            f"   reason: {error}\n"
            "   The known pairs stay on their hand-declared entries in\n"
            "   attr-classification-overrides.json (D497) until this tier runs clean\n"
            "   again. Reported rather than raised so the reseed still completes, but\n"
            "   this is a DEGRADED run -- do not read a clean exit as a clean result.\n",
            file=sys.stderr,
        )
        return {
            "image_filled": 0,
            "alt_filled": 0,
            "companion_filled": 0,
            "companion_conflicts": 0,
            "companion_error": error,
        }

    result = _apply_companion_pairs(conn, pairs)
    result["companion_error"] = None
    return result


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

    TIER 0A (companion) runs FIRST, before the `rows` snapshot below is even taken --
    see `apply_companion_role_tier()`'s docstring for why that ordering is load-bearing.
    """
    # TIER 0A -- IMAGE<->ALT COMPANION (D497, 2026-08-05). Must run before the `rows`
    # snapshot immediately below, or a row it fills would still show role=NULL in that
    # snapshot and the name-regex loop would go on to guess (or clobber) it.
    _companion = apply_companion_role_tier(conn)

    rows = conn.execute(
        "SELECT id, block_slug, attr_name, attr_type, enum_values, description, role "
        "FROM block_attributes WHERE role IS NULL OR role = 'content'"
    ).fetchall()
    cur = conn.cursor()
    _ac_cols = [r[1] for r in conn.execute("PRAGMA table_info(block_attributes)").fetchall()]
    has_css_element_col = "css_element" in _ac_cols
    filled = 0
    upgraded = 0
    structural_filled = 0

    # TIER 0B -- STRUCTURAL, ordered ABOVE the name regex (Track A, 2026-08-04).
    # A measured fact about what the block DOES with a value always beats a guess from
    # how the value is spelled. This demotes _ATTR_NAME_RULES to a fallback, which is the
    # first step toward deleting it (FR-31-2.1a).
    (structural, structural_error, d1_vetoed, d4_wrapper_painted,
     styling_upgrades, icon_family_corrections) = _structural_role_map()
    if structural_error:
        print(
            "\n!! STRUCTURAL ROLE TIER DID NOT RUN -- falling back to the name regex.\n"
            f"   reason: {structural_error}\n"
            "   Roles for content attrs whose NAME is not in _ATTR_NAME_RULES will be\n"
            "   left NULL, and their text will be silently dropped from clones. This is\n"
            "   reported rather than raised so a reseed still completes, but it is a\n"
            "   DEGRADED run -- do not read a clean exit as a clean result.\n",
            file=sys.stderr,
        )

    for row_id, block_slug, attr_name, attr_type, enum_values, description, current in rows:
        structural_role = structural.get((block_slug, attr_name))
        if structural_role is not None and current is None:
            cur.execute(
                "UPDATE block_attributes SET role = ? WHERE id = ?",
                (structural_role, row_id),
            )
            structural_filled += 1
            continue

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
    # TIER 2.5 -- TECHNICAL, from a Detector-1 VETO (2026-08-05, Bean). Runs BEFORE the
    # styling backstop and AFTER every content tier, so a content verdict wins over it and
    # a css_property wins over it (a row with both a veto and a css_property is styling --
    # the veto only says "not content", and css_property says positively what it IS).
    #
    # A veto is EVIDENCE, not an absence: D1 walked every usage site of the attribute in
    # render.php and the shared includes/ tree and found none content-bearing -- the value
    # feeds a form `name=`, an element id, an `aria-describedby`, a link `rel`, a taxonomy
    # key. That is a measurement of what the value does. Leaving it NULL threw away a fact
    # we had already established, and made 17 settled rows read identically to rows nobody
    # had looked at.
    #
    # DELIBERATELY NARROW: rows no detector reached are NOT given this role. They stay
    # NULL. "Unreached" and "proven technical" are different facts, and a role that
    # conflated them would rebuild the ambiguity this role exists to remove -- the same
    # reason `styling` is gated on css_property rather than on "not obviously content".
    # TIER 2.4 -- STYLING, from a Detector-4 WRAPPER-ONLY verdict (2026-08-06, Bean).
    #
    # Bean's ruling, which this tier implements: a NULL role means the row is UNREACHED
    # or UNSEEDABLE. It must not mean "reached, understood, and filed nowhere". These 33
    # rows are reached by D4 and understood -- their sole consumer is the shared
    # container wrapper, a CSS-rendering engine -- so they are seeded like every other
    # non-content attribute.
    #
    # ORDERED BEFORE TIER 2.5 ON PURPOSE. A D1 veto says only "not content"; a
    # wrapper-only read says positively what the value IS. That is exactly the precedence
    # TIER 3 already encodes for css_property ("a row with both a veto and a css_property
    # is styling"), and this tier is the same evidence class reaching the same conclusion
    # by a different route. Measured 2026-08-06: the two sets are disjoint (0 of 33
    # overlap d1_vetoed or technical_refs), so no row is decided by this ordering today
    # -- the order is here so the RULE is right, not because a row currently needs it.
    #
    # WHY NOT AN attrMap INSTEAD: an attrMap entry would give these a css_property and let
    # TIER 3 claim them. It would also route decorative attrs into the CSS layer that
    # `sgs/container` -- the reference block every composite mirrors -- deliberately keeps
    # them out of (its `decorative` element, "clusters": [], with a written note). Mapping
    # them would reverse a standing architectural decision to close a reporting nuisance.
    # Verified 2026-08-06: container itself still shows its own rows in this bucket, so
    # the opt-out demonstrably does not discharge a row on its own.
    #
    # NARROW BY CONSTRUCTION: `role IS NULL AND css_property IS NULL` plus membership of
    # D4's wrapper bucket, which D4 only awards when `find_reference()` resolves the
    # attribute's single consumer to the wrapper file. A row with any other consumer is
    # not in the set and is untouched here.
    #
    # Factored into `_apply_wrapper_styling_tier()` (rather than inlined like the older
    # sibling tiers) so the self-test drives the REAL function -- the re-implementing
    # self-tests elsewhere in this file cannot detect production/test drift.
    wrapper_styling_filled = _apply_wrapper_styling_tier(conn, d4_wrapper_painted)

    technical_filled = 0
    if d1_vetoed:
        for row_id, block_slug, attr_name in conn.execute(
            "SELECT id, block_slug, attr_name FROM block_attributes "
            "WHERE role IS NULL AND css_property IS NULL"
        ).fetchall():
            if (block_slug, attr_name) in d1_vetoed:
                cur.execute(
                    "UPDATE block_attributes SET role = 'technical' WHERE id = ?", (row_id,)
                )
                technical_filled += 1

    # TIER 3 -- GENERIC STYLING BACKSTOP (2026-08-05, Bean). Deliberately a SEPARATE pass
    # AFTER the loop above, not another branch inside it: that makes "never pre-empts a
    # content verdict" structural rather than a promise about branch ordering. Every row
    # it touches has already been offered to the structural tier and the name regex and
    # been declined by both.
    #
    # THE PROBLEM IT CLOSES: a row with css_property SET and role NULL is not unknown --
    # an emission-derived mechanism already proved it paints CSS. But it reads exactly
    # like a row nobody has looked at, so sessions re-investigate it. Measured 2026-08-05:
    # 109 such rows on sgs/%.
    #
    # SAFETY -- stated precisely, because the first draft of this comment overclaimed.
    # It asserted "it cannot touch a content attr, because a content attr has no
    # css_property". That is NOT structurally guaranteed; it happens to be true today.
    # What is actually established:
    #   (a) STRUCTURAL: this pass runs last and only where role IS NULL, so every
    #       content-bearing verdict from the structural tier or the name regex above has
    #       already been written and is untouchable here.
    #   (b) STRUCTURAL: the content-role fingerprint's eligible pool excludes
    #       `css_property IS NOT NULL` rows, so the two mechanisms partition the space
    #       and never compete for the same row.
    #   (c) EMPIRICAL, not structural: the rows this pass claims were enumerated on
    #       2026-08-05. Of the 109, the 35 that also match every other content-pool
    #       criterion (string-typed, no enum, no box_family, is_responsive=0) were read
    #       individually and are all unambiguous styling -- justify-content, align-items,
    #       border-color, gap, grid-template-columns, flex-direction, flex-wrap, width,
    #       background-color, plus image-sequence's two fx:start/fx:end motion rows.
    #       Zero content attrs among them.
    # RESIDUAL RISK, named rather than hidden: a genuinely content-bearing attr that ALSO
    # carries a css_property and that no earlier mechanism reached would be mis-filed
    # 'styling' here. None exists today (c). If one ever does, the fix is to reach it in
    # the structural tier, not to loosen this gate -- and the self-test below plants
    # exactly that shape so the day it appears, the gate says so.
    styling_filled = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes "
        "WHERE role IS NULL AND css_property IS NOT NULL"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'styling' WHERE id = ?", (row_id,)
        )
        styling_filled += 1

    # TIER 3.15 -- GENERIC-STYLING UPGRADE (2026-08-06, Bean). Runs immediately after
    # TIER 3 so it re-examines what that backstop just assigned, as well as rows the
    # backstop assigned on an earlier reseed.
    #
    # THE ONLY PASS IN THIS FILE THAT OVERWRITES AN EXISTING ROLE, and narrow to match:
    # the WHERE clause pins `role = 'styling'` exactly, so it can never touch a content
    # verdict, a specific styling family, or a NULL. `styling` is documented as the
    # fallback ("no more specific styling family was established"), and the vocabulary
    # already sanctions replacing it -- `enum-mode`'s entry records that a generic role is
    # overwritten the moment a specific family becomes resolvable. This is that, driven by
    # a measured paint site instead of a suffix.
    #
    # MEASURED 2026-08-06: 83 rows on the backstop, 3 upgraded (button.colourBorder +
    # .colourBorderHover + mega-panel.accent, all -> `color` via sgs_colour_value()).
    # The 27 other border-color rows already carried `color`, so the same CSS property was
    # being filed two ways depending on which mechanism reached it first.
    #
    # NEGATIVE CONTROL, and it is a REAL row not a fixture: gridItemBorder on
    # container/cta-section/hero also carries css_property='border-color' and is
    # indistinguishable from the upgraded rows in a GROUP BY -- but its value is a border
    # SHORTHAND emitted raw, so `color` would be WRONG. It must survive unchanged; the
    # self-test asserts that.
    styling_upgraded = 0
    if styling_upgrades:
        for (u_slug, u_attr), u_role in styling_upgrades.items():
            cur.execute(
                "UPDATE block_attributes SET role = ? "
                "WHERE block_slug = ? AND attr_name = ? AND role = 'styling'",
                (u_role, u_slug, u_attr),
            )
            styling_upgraded += cur.rowcount

    # TIER 3.16 -- ICON-SOURCE-FAMILY CORRECTION (2026-08-06, D503). Runs immediately
    # after TIER 3.15 -- both are overwrite passes, so keeping them adjacent means the
    # only two places in this file that touch an already-assigned role sit together.
    #
    # THE BUG (measured, real, not speculative): the four `icon-<kind>` roles are a
    # ROUTING KEY, not decoration -- the converter's icon arm
    # (converter/services/extraction.py ~1110-1121) builds `{role: attr_name}` for every
    # role starting `icon-` and does `.get("icon-" + kind)`. A family member filed under
    # any OTHER role is invisible to that lookup, so a draft's dashicon/wp-icon/emoji
    # choice never routes for that block. `sgs/icon` (the reference block) holds all four
    # correctly; `sgs/separator` does not -- contentIconWpIcon/contentIconDashicon sat on
    # `enum-class-probe` and contentIconEmoji on `text-content`, so icon cloning is broken
    # for sgs/separator today. `icon_family_corrections` comes from D6's
    # icon-source-family mechanism (`fingerprint_content_roles._icon_family_corrections`),
    # which is proven against ground truth FIRST: it reproduces all four of sgs/icon's own
    # stored roles exactly (D6 self-test case 9) before it is ever trusted to overwrite
    # anything, and is scoped to attr_type='string' so it cannot repeat the array-typed
    # false positive measured on sgs/icon-list.items during this build (see that module's
    # `all_sgs_rows()` docstring for the full root-cause).
    #
    # THE GUARD, and it is the whole safety argument for this tier, same shape as TIER
    # 3.15's `role = 'styling'` pin but for a different defect class: TIER 3.15 can gate on
    # an exact CURRENT role because every upgrade candidate starts from the one generic
    # backstop. This tier cannot -- the wrong roles it repairs are various
    # (`enum-class-probe`, `text-content`) -- so its guard is instead "the stored role is
    # NOT ALREADY an icon-* role". Within a RESOLVED icon-source family, the icon-<kind>
    # role for a value slot is the ONLY correct answer -- it IS the routing key the
    # converter dispatches on -- so any non-icon-* role on a family member is wrong by
    # construction. Refusing to touch a row that already holds SOME icon-* role prevents
    # both churn (re-writing icon-lucide with icon-lucide) and any cross-family clobber
    # (a row correctly resolved to one kind being overwritten by a stale verdict for
    # another). The guard is in the SQL itself, not only in Python -- the SQL is the
    # enforceable half.
    #
    # contentIconEmoji currently holds `text-content`, a CONTENT role -- normally
    # untouchable (content tiers run first and are final, per every self-test in this
    # file). Overwriting it is correct HERE, and only here, because the replacement
    # (`icon-emoji`) is ALSO content-bearing and strictly MORE SPECIFIC -- a
    # specific-over-generic upgrade, exactly the precedent `enum-mode`'s own roles.json
    # entry sanctions for a generic role the moment a specific family becomes resolvable.
    # This is not an oversight; the `role NOT LIKE 'icon-%'` guard is what makes it safe --
    # `text-content` is not an icon-* role, so it is eligible, and the replacement is
    # provably the more correct, more specific answer for a value D6 has proven feeds an
    # icon-kind branch.
    #
    # EXPECTED POPULATION (declared before running, then measured): exactly 3 rows --
    # sgs/separator.contentIconWpIcon -> icon-wp-icon, .contentIconDashicon ->
    # icon-dashicon, .contentIconEmoji -> icon-emoji. sgs/icon's four rows are UNCHANGED
    # (they already hold the right roles and are the live regression control).
    # `role IS NULL OR role NOT LIKE 'icon-%'`, not a bare `role NOT LIKE 'icon-%'`.
    # SQLite three-valued logic: `NULL LIKE 'icon-%'` evaluates to NULL, and `NOT NULL` is
    # ALSO NULL, which a WHERE clause treats as false -- so the bare form would silently
    # exclude a NULL row from a guard whose stated rule is "not already an icon-* role"
    # (NULL is not an icon-* role, so it must be eligible). Measured population is
    # unaffected either way (none of the 3 corrected rows are NULL), but the guard must
    # match its OWN documented rule, not an SQL text that quietly narrows it.
    icon_family_corrected = 0
    if icon_family_corrections:
        for (f_slug, f_attr), f_role in icon_family_corrections.items():
            cur.execute(
                "UPDATE block_attributes SET role = ? "
                "WHERE block_slug = ? AND attr_name = ? AND (role IS NULL OR role NOT LIKE 'icon-%')",
                (f_role, f_slug, f_attr),
            )
            icon_family_corrected += cur.rowcount

    # TIER 3.17 -- FX-NAMESPACE STYLING CORRECTION (2026-08-13, D607). Runs immediately
    # after TIER 3.16 -- a third overwrite pass, adjacent to the other two for the same
    # reason TIER 3.16 gives for sitting next to TIER 3.15 ("both are overwrite passes,
    # so keeping them adjacent means the only places in this file that touch an
    # already-assigned role sit together").
    #
    # THE BUG (measured, real, not speculative): TIER 3's generic-styling backstop
    # (`role IS NULL AND css_property IS NOT NULL -> 'styling'`, above) treats ANY
    # non-null `css_property` as CSS paint -- including the `fx:*` pseudo-namespace
    # `seed-motion-fx-registry.py` writes for pure motion/interaction-behaviour attrs
    # (`fx:momentum`, `fx:loop`, `fx:start`, `fx:end`, `fx:scrub`, `fx:pin`, `fx:hold`,
    # `fx:stagger`, `fx:duration`, `fx:ease`, `fx:effect`, `fx:trigger` -- the full
    # namespace that script's own attr->fx: map declares). An `fx:*` value is
    # DELIBERATELY not a real CSS property -- that script's own docstring: "sibling of
    # the existing anim:* ... css_layer='OUTER'|NULL and css_element='wrapper'|
    # 'behaviour'|'animation'" -- it is a structural marker for pure JS behaviour, never
    # painted CSS. TIER 3 has no way to tell that apart from a genuine CSS property name,
    # so every `fx:*` row lands on the generic `styling` backstop, wrong.
    #
    # FOUND BY: 2026-08-13, Bean challenged D604's hand-patch of dragMomentum/
    # loopCarousel (5 blocks, by attribute NAME) as possibly a systemic classifier gap
    # rather than a genuine judgement call. A `/qc-council` structural re-check --
    # grouping by the `fx:*` marker instead of by name -- found 3 MORE rows with the
    # IDENTICAL bug the name-based pass had missed (`sgs/image-sequence`'s
    # `fxStart`/`fxEnd`/`fxScrub`), proving the point empirically. This tier closes the
    # whole class instead of the instances a name search happens to find, and
    # self-corrects any FUTURE block that adds an `fx:*` attribute without needing a
    # fresh override entry.
    #
    # THE GUARD, same shape as TIER 3.15's `role = 'styling'` pin: only touches a row
    # CURRENTLY holding the generic styling backstop AND carrying an `fx:*` marker. Can
    # never touch a NULL, a content verdict, or a specific non-fx styling family.
    #
    # WHY 'behaviour' AND NOT A NEW ROLE: 'behaviour' is this file's own established role
    # for pure JS-interaction / configuration attrs with zero visual output -- the exact
    # precedent the 2026-08-02 Rating/Speed suffix-role fix set (reclassifying
    # maxRating/minRating/showRating to 'behaviour' for the identical reason:
    # configuration, not content, not paint). D604/D607 already applied 'behaviour' by
    # hand to every `fx:*` row found in that session; this tier makes that verdict
    # self-applying on every future reseed rather than requiring a fresh
    # attr-classification-overrides.json entry per attribute.
    #
    # EXPECTED POPULATION at the time this tier was written: 0 -- D604/D607 already hand-
    # corrected every `fx:*` row that existed in the DB (verified:
    # `SELECT COUNT(*) FROM block_attributes WHERE css_property LIKE 'fx:%' AND
    # role='styling'` returned 0 before this tier was added). A non-zero count on a later
    # reseed means a NEW `fx:*` attribute landed on a block and hit the backstop before
    # this tier could correct it -- exactly the case this tier exists to catch
    # automatically, not a bug in the tier itself.
    fx_styling_corrected = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes "
        "WHERE role = 'styling' AND css_property LIKE 'fx:%'"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'behaviour' WHERE id = ?", (row_id,)
        )
        fx_styling_corrected += 1

    # TIER 3.18 -- NATIVE-WP SOURCE SEED (2026-08-13, Bean, DB role remediation part 2).
    # NOT an overwrite pass like 3.15/3.16/3.17 -- a fresh SEED for rows this classifier
    # was never going to reach any other way, closer in shape to TIER 3's own backstop.
    #
    # THE PROBLEM IT CLOSES: `source = 'native_wp'` rows (WP core-block reference data --
    # core/image, core/latest-posts, core/media-text, core/cover, ~70 other core blocks --
    # seeded by the dbschema/ WP-reference-archive tooling, never by the SGS block-scanning
    # side) sit outside the content/styling taxonomy this file's other tiers all reason
    # about: they aren't a converter-routing signal, so no content tier, no css_property
    # backstop, and no name-regex ever assigns them a role. MEASURED 2026-08-13: every
    # `source='native_wp'` row with `role IS NULL` also has `css_property IS NULL` (0
    # exceptions) -- confirming this population is invisible to every css_property-keyed
    # tier by construction, not by an accident this tier happens to dodge.
    #
    # WHY THIS MATTERS: `role IS NULL` is supposed to mean exactly one thing -- "no
    # seeding mechanism reached this row" (TIER 3.5's own docstring makes the identical
    # argument for the enum backstop). Without this tier, a genuinely-out-of-taxonomy
    # `native_wp` row is indistinguishable in a `role IS NULL` count from an `sgs/*` row
    # nobody has classified yet -- exactly what inflated the "469 rows remain" estimate
    # this session re-verified as 479, of which 225 (47%) turned out to be this shape.
    #
    # THE GUARD: keyed on `source`, the column this DB uses to partition WP-native
    # reference rows from SGS's own block catalogue everywhere else
    # (`feature-parity-exceptions.json`, `sgs-update-v2.py`, `dbschema/`) -- never a name
    # or block-slug guess. `role IS NULL` in the WHERE clause makes this idempotent and
    # incapable of overwriting any role a future mechanism assigns a native_wp row.
    #
    # WHY 'core' AND NOT AN EXISTING ROLE: every existing role belongs to one of two
    # `roles.classification` buckets, `content-bearing` or `styling-behaviour` -- both
    # describe how an SGS-cloned attribute is CONSUMED by the converter. A native_wp
    # reference-data row is consumed by neither; it is comparison data for
    # `audit-feature-parity.py`, not a cloning-pipeline input. `core` is registered in the
    # `roles` table (migration `2026-08-13-register-core-role.py`) under the schema's own
    # third, previously-unused `classification` bucket, `unclassified` (see
    # `dbschema/schema.sql`'s CHECK constraint) -- the schema already anticipated a role
    # that isn't content-bearing or styling-behaviour; this is the first role to use it.
    #
    # EXPECTED POPULATION at the time this tier was written: 225 (measured live,
    # 2026-08-13, before this tier existed). A non-zero count on a later reseed means a
    # new WP-core attribute landed in the reference tables -- exactly the case this tier
    # exists to catch automatically.
    native_wp_seeded = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes WHERE role IS NULL AND source = 'native_wp'"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'core' WHERE id = ?", (row_id,)
        )
        native_wp_seeded += 1

    # TIER 3.19 -- GENERIC BOOLEAN BACKSTOP (2026-08-13, Bean, DB role remediation part
    # 2). Same shape as TIER 3's own "generic styling backstop" above, for the ONE type
    # where "no CSS signal" is a structural certainty rather than empirical luck: a
    # boolean attribute has exactly two states, so it can never itself BE a CSS value
    # (that is a string/number's job) -- if it also carries no css_property, every
    # mechanism this file has for finding a more specific role has already been offered
    # the row and declined. `boolean-visibility` already exists for precisely this shape
    # (roles.json: "a plain editor-only toggle... no consumer... a draft's HTML/CSS
    # carries no signal a boolean toggle could be lifted from"), and TIER 3.6 already
    # reclassifies a boolean OFF a wrongly-assigned CONTENT role onto it -- this tier
    # closes the other half of the same gap: a boolean that was simply never assigned
    # anything at all.
    #
    # INVESTIGATED, NOT ASSUMED: dispatched a parallel investigation agent
    # (2026-08-13) to sample 20 of the then-117 `role IS NULL AND attr_type='boolean'
    # AND css_property IS NULL` rows and read each one's actual render.php/edit.js
    # consumption site. Two rows that looked like they might secretly gate real CSS
    # (`sgs/text.dropCap` -- a conditional `::first-letter` block; `sgs/separator.
    # gradientEnabled` -- a conditional `border-image:linear-gradient()`) both turned
    # out to be the SAME "toggle gates a whole conditional declaration" shape as any
    # visibility toggle, not a value-carrying attribute -- structurally identical to the
    # `overlayGradient` precedent already filed under `boolean-visibility` (see that
    # role's own `excludes_reason` in roles.json). No exception was found in the sample.
    #
    # THE GUARD: `role IS NULL AND attr_type = 'boolean' AND css_property IS NULL`.
    # Idempotent and can never overwrite an existing role, a content verdict, or a row a
    # more specific mechanism (TIER 3.7's css-gate route, an fx:* registry entry, a
    # hand override) has already claimed -- those all set a non-NULL role or a non-NULL
    # css_property before this tier runs, and this tier's WHERE clause requires both to
    # still be NULL/empty. ORDERED LAST among the boolean-touching tiers (after 3.6/3.7,
    # and after any override-layer application in the reseed pipeline's Stage 1
    # sub-step C, which runs AFTER assign-canonical.py entirely) so a row a human
    # deliberately classified differently (e.g. `bgKenBurns` -> 'css-gate', `autoplay`
    # -> 'behaviour', per this session's investigation) is never silently reclaimed here
    # UNLESS an override hasn't been written for it yet -- exactly the same backstop
    # relationship TIER 3's generic styling backstop has with TIER 3.15's upgrades.
    #
    # EXPECTED POPULATION at the time this tier was written: ~117 (measured live,
    # 2026-08-13, on the subset of NULL booleans NOT already claimed by a same-session
    # override for a more specific shape). A non-zero count on a later reseed means a
    # new boolean attribute landed with no CSS signal -- exactly the case this tier
    # exists to catch automatically.
    boolean_visibility_seeded = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes "
        "WHERE role IS NULL AND attr_type = 'boolean' AND css_property IS NULL"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'boolean-visibility' WHERE id = ?",
            (row_id,),
        )
        boolean_visibility_seeded += 1

    # TIER 3.20 -- FX-NAMESPACE CSS_ELEMENT SENTINEL (2026-08-28, css_element NULL fix
    # investigation, /qc-council-validated proposal). Sibling to TIER 3.17 immediately
    # above -- same `fx:*` marker family, same 'behaviour' target value, but a
    # DIFFERENT column: TIER 3.17 corrects `role`, this tier corrects `css_element`.
    #
    # THE BUG: `css_element IS NULL` is supposed to mean exactly one of two things
    # (Bean's governing instruction, 2026-08-28 investigation): (1) genuinely
    # unresolved -- a real CSS declaration exists but no classifier mechanism found a
    # single owning element, or (2) not applicable -- the row is not real CSS at all,
    # so "which element does it paint" is a category error. Every `fx:*` row is shape
    # (2): `seed-motion-fx-registry.py`'s own docstring calls the `fx:*` namespace "a
    # structural marker for pure JS behaviour, never painted CSS" -- identical framing
    # to TIER 3.17's own docstring above. Without an explicit sentinel, both shapes
    # collapse into the same `css_element IS NULL` count, exactly the conflation TIER
    # 3.18's docstring warns about for the `role` column ("a genuinely-out-of-taxonomy
    # row is indistinguishable in a `role IS NULL` count from a row nobody has
    # classified yet").
    #
    # WHY 'behaviour' AND NOT A NEW VALUE: mirrors the ALREADY-established
    # `role='behaviour'` convention TIER 3.17 applies to this exact row family, rather
    # than inventing a second vocabulary word for the same concept (Bean's instruction:
    # "NULL must mean one thing only" -- the corollary is "don't multiply sentinels").
    # Every `fx:*` row TIER 3.17 corrects to `role='behaviour'` gets the matching
    # `css_element='behaviour'` here; the two columns describe the same underlying fact
    # (pure JS configuration, zero visual output) from two different angles.
    #
    # SAFETY, VERIFIED NOT ASSUMED: `converter/db/db_lookup.py`'s root-domain resolver
    # (`_base_domain_attrs_for_css_property`, ~lines 1696-1783 + twin queries at
    # 1840/3710/3720) treats `(css_element IS NULL OR css_element IN ('', 'root',
    # 'self'))` as an ACTIVE routing condition -- so flipping `css_element` away from
    # NULL is not automatically safe everywhere in this codebase. Checked before writing
    # this tier, not inferred from the TIER 3.17 precedent: a fresh grep of the entire
    # `converter/` tree for the literal string `"fx:"` returns ZERO hits (2026-08-28).
    # `fx:*` rows are never routed through that resolver at all, so this tier cannot
    # collide with it. If a future change ever starts feeding `fx:*` properties through
    # that resolver, this safety check must be re-run before trusting this tier further.
    #
    # THE GUARD: `css_property LIKE 'fx:%' AND css_element IS NULL`. Idempotent (a row
    # already carrying a css_element is never touched) and keyed on the SAME `fx:*`
    # marker TIER 3.17 uses, never a name or block-slug guess (R-31-1/R-31-2) -- so the
    # next `fx:*` attribute anyone adds is covered automatically, not just the rows this
    # session happened to find.
    #
    # EXPECTED POPULATION at the time this tier was written: ~20 (Bucket A of the
    # 2026-08-28 investigation -- `sgs/buybox.dragMomentum/dragToScroll/loopCarousel`,
    # `sgs/gallery`/`sgs/google-reviews`/`sgs/post-grid`/`sgs/trustpilot-reviews` [same
    # 3 each], `sgs/testimonial-slider.dragToScroll`, `sgs/image-sequence.fxStart/
    # fxEnd/fxScrub/fxPin`, `sgs/before-after.fxDraggable`). A non-zero count on a
    # later reseed means a new `fx:*` attribute landed and hit the `css_element IS
    # NULL` state before this tier could correct it -- exactly the case this tier
    # exists to catch automatically, not a bug in the tier itself.
    fx_css_element_seeded = 0
    # SCHEMA GUARD (2026-08-28): this function also runs against databases that predate
    # the `css_element` column -- the converter test fixtures build a minimal
    # block_attributes without it. Unguarded, the query below raises
    # `sqlite3.OperationalError: no such column: css_element` and aborts the ENTIRE
    # role-detection pass, not just this tier (caught by gate:full, which the fast
    # prebuild tier never runs). Probe mirrors the `alt_companion_attr` check at ~:1805.
    if has_css_element_col:
        for (row_id,) in conn.execute(
            "SELECT id FROM block_attributes "
            "WHERE css_property LIKE 'fx:%' AND css_element IS NULL"
        ).fetchall():
            cur.execute(
                "UPDATE block_attributes SET css_element = 'behaviour' WHERE id = ?",
                (row_id,),
            )
            fx_css_element_seeded += 1

    # TIER 3.20b -- ONE-ROW ROLE CORRECTION: sgs/before-after.fxDraggable (2026-08-28,
    # same investigation as TIER 3.20 immediately above). NOT a generic rule -- every
    # other `fx:*` row in Bucket A already carries `role='behaviour'` (confirmed live,
    # 2026-08-28); this ONE row was left on the pre-D604/D607 `role='boolean-visibility'`
    # value, so its `role` and `css_element` columns would otherwise disagree with each
    # other and with every sibling `fx:*` row on the same block. Fixed by exact
    # (block_slug, attr_name) match, not a name/suffix pattern -- deliberately narrower
    # than TIER 3.17's `css_property LIKE 'fx:%'` guard, because this is a known,
    # named, one-off inconsistency to close, not a class of defect to prevent
    # recurring. If a future `fx:*` attribute lands with the wrong role, TIER 3.17
    # already catches that class generically; this step exists only to reconcile the
    # one row TIER 3.17 could not retroactively touch (it only ever upgrades FROM
    # `role='styling'`, never from `role='boolean-visibility'`).
    before_after_fx_draggable_role_fixed = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes "
        "WHERE block_slug = 'sgs/before-after' AND attr_name = 'fxDraggable' "
        "AND role = 'boolean-visibility'"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'behaviour' WHERE id = ?", (row_id,)
        )
        before_after_fx_draggable_role_fixed += 1

    # TIER 3.4 -- UNIT INHERITANCE (2026-08-05, Bean). A `<base>Unit` attr carries the
    # CSS unit for `<base>`; it is the same styling fact, split across two columns
    # because CSS needs the number and the unit separately. So its ROLE is its base's
    # role, by construction -- exactly the argument the device-tier inheritance rule
    # makes for `<base>Tablet` (extract-signatures.py, 2026-08-05).
    #
    # ROLE ONLY, NEVER css_property. Bean ruled 2026-07-21 that unit attrs never enter
    # css_property at all (extract-signatures.py's `unit_attrs_excluded`) -- a unit is
    # not itself a declaration, and writing one would feed the emission layer a mapping
    # that paints nothing. The established rows agree: widthUnit=layout,
    # contentFontSizeUnit=typography, maxWidthUnit=layout, all with css_property NULL.
    #
    # GATED ON THE BASE BEING STYLING-BEHAVIOUR, not merely non-NULL. A base that is
    # itself unclassified proves nothing about its unit sibling, and a CONTENT-bearing
    # base must never hand a content role to a unit attr -- that would walk a bare
    # 'px' into the content lift. Same shape as the tier rule's "base must carry a real
    # css_property" guard: two unknowns never make a classification.
    #
    # RUNS BEFORE THE ENUM BACKSTOP BELOW -- STATED, not left to line order. A unit attr
    # that also declares an enum (e.g. a px/% select) inherits the base's SPECIFIC family
    # role rather than the generic 'enum-mode'; both exclude it from the content
    # lift, so this ordering picks the more informative of two safe answers.
    #
    # The unit suffix comes from `modifier_suffixes` (kind='unit'), never a 'Unit'
    # literal -- R-31-1.
    unit_suffixes = sorted(
        (sfx for sfx, kind in load_modifier_suffixes(conn).items() if kind == "unit"),
        key=len,
        reverse=True,
    )
    styling_behaviour_roles = {
        r[0] for r in conn.execute(
            "SELECT role_name FROM roles WHERE classification = 'styling-behaviour'"
        ).fetchall()
    }
    unit_inherited = 0
    if unit_suffixes and styling_behaviour_roles:
        for row_id, block_slug, attr_name in conn.execute(
            "SELECT id, block_slug, attr_name FROM block_attributes WHERE role IS NULL"
        ).fetchall():
            base = None
            for sfx in unit_suffixes:
                if attr_name.endswith(sfx) and len(attr_name) > len(sfx):
                    base = attr_name[: -len(sfx)]
                    break
            if not base:
                continue
            base_row = conn.execute(
                "SELECT role FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
                (block_slug, base),
            ).fetchone()
            if not base_row or base_row[0] not in styling_behaviour_roles:
                continue
            cur.execute(
                "UPDATE block_attributes SET role = ? WHERE id = ?", (base_row[0], row_id)
            )
            unit_inherited += 1

    # TIER 3.41 -- BREAKPOINT/DEVICE-TIER INHERITANCE (2026-08-13, Bean, DB role
    # remediation part 2). A `<base>Tablet`/`<base>Mobile` attr is the SAME semantic
    # value as `<base>`, at a different device tier -- not a derived fact split across
    # two columns the way a Unit sibling is, but the identical fact, repeated. This
    # tier's own docstring reference at TIER 3.4 above name-drops "the device-tier
    # inheritance rule (extract-signatures.py, 2026-08-05)" as already existing --
    # investigated 2026-08-13 and confirmed that mechanism seeds attribute SHAPE
    # (object-typed, matching the base) at extraction time, not `role`; nothing wires
    # role inheritance for the breakpoint axis into this file until now.
    #
    # DELIBERATELY A SEPARATE TIER FROM 3.4, NOT A SHARED LOOP -- the two axes need
    # OPPOSITE base-role guards. TIER 3.4 above states its own reason for excluding a
    # CONTENT-bearing base: "that would walk a bare 'px' into the content lift" -- true
    # for a Unit sibling, which is never itself content. It is FALSE for a breakpoint
    # sibling: `sgs/testimonial.avatarMediaMobile` is a per-device IMAGE, exactly as
    # content-bearing as its base `avatarMedia` (role='image-object', classification
    # content-bearing) -- refusing to inherit a content-bearing base here would leave
    # every art-directed device-tier image sibling permanently NULL, which is the
    # actual gap this tier closes (measured live 2026-08-13: `sgs/testimonial.
    # avatarMediaMobile`/`avatarMediaTablet`, `sgs/media.svgContentMobile`/`Tablet`).
    # So this tier's guard is simply "the base has SOME role, any role" -- not filtered
    # by classification -- because a device-tier sibling always inherits its base's
    # exact category, content or styling, by construction.
    #
    # The breakpoint suffix comes from `modifier_suffixes` (kind='breakpoint': Tablet,
    # Mobile, Desktop), never a hardcoded literal -- R-31-1. 'Desktop' is included for
    # completeness but never matches in practice (the desktop tier IS the unsuffixed
    # base attr in this framework's own naming convention).
    #
    # RUNS AFTER TIER 3.4, so a row that is BOTH a unit AND a breakpoint sibling (e.g.
    # a hypothetical `paddingMobileUnit`) resolves via the more specific unit rule
    # first; this tier's own `role IS NULL` guard then finds nothing left to do for it.
    #
    # EXPECTED POPULATION at the time this tier was written: 4 (measured live,
    # 2026-08-13) -- `sgs/testimonial.avatarMediaMobile`/`avatarMediaTablet` (base
    # already role='image-object') and `sgs/media.svgContentMobile`/`svgContentTablet`
    # (base already role='svg'). `sgs/hero.splitSvgMobile`/`splitSvgTablet` are NOT
    # claimed -- their base `splitSvg` is itself role IS NULL, so there is nothing to
    # inherit; that is TIER 3.41 working correctly, not a gap in it (the base needs its
    # own classification first, a separate one-off judgement call).
    breakpoint_suffixes = sorted(
        (sfx for sfx, kind in load_modifier_suffixes(conn).items() if kind == "breakpoint"),
        key=len,
        reverse=True,
    )
    breakpoint_inherited = 0
    if breakpoint_suffixes:
        for row_id, block_slug, attr_name in conn.execute(
            "SELECT id, block_slug, attr_name FROM block_attributes WHERE role IS NULL"
        ).fetchall():
            base = None
            for sfx in breakpoint_suffixes:
                if attr_name.endswith(sfx) and len(attr_name) > len(sfx):
                    base = attr_name[: -len(sfx)]
                    break
            if not base:
                continue
            base_row = conn.execute(
                "SELECT role FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
                (block_slug, base),
            ).fetchone()
            if not base_row or base_row[0] is None:
                continue
            cur.execute(
                "UPDATE block_attributes SET role = ? WHERE id = ?", (base_row[0], row_id)
            )
            breakpoint_inherited += 1

    # TIER 3.45 -- LINK-FRAGMENT (2026-08-06, Task A5). A row whose output_signature
    # carries a `link_template` is one the block assembles a URL AROUND: the operator
    # supplies only the variable part. That template is positive, structural evidence
    # written from render.php by extract-signatures._detect_link_template -- not an
    # inference from the attribute's name -- and it is exactly the `link-content` role's
    # contract ("a CONCATENATED FRAGMENT of a URL, not a whole href").
    #
    # WHY THIS TIER HAD TO EXIST. The role, its extractor
    # (services/field_extractors.extract_link_fragment) and its reader
    # (db_lookup.link_template_for) were all built and threaded on 2026-08-06 (d5766eff,
    # 580f7885) -- and the whole chain was INERT, because nothing ever assigned the role.
    # Measured before this tier: `link-content` on ZERO rows, and no row anywhere carried
    # a link_template, because /sgs-update only ever runs extract-signatures with
    # --task-b-only (sgs-update-v2.py:1178), which is the inspector_control_type branch.
    # A built, tested, unreachable mechanism reads exactly like a missing one.
    #
    # ORDERED BEFORE TIER 3.5. Both whatsapp-cta rows would otherwise be eligible for the
    # enum backstop's shape of generic fill; a specific CONTENT role must win over a
    # generic mode key, which is the same precedence TIER 3 already encodes.
    #
    # THE GATE IS THE EXTRACTOR'S OWN CONTRACT, restated here rather than assumed:
    # extract_link_fragment fails closed unless the template holds EXACTLY ONE {value}
    # placeholder (field_extractors.py:263). Seeding a role the extractor would then
    # refuse is how a row acquires a role that does nothing, so this tier applies the
    # identical test before assigning -- the seeder and the consumer agree by construction.
    link_filled = 0
    for row_id, sig_json in conn.execute(
        "SELECT id, output_signature FROM block_attributes "
        "WHERE role IS NULL AND output_signature LIKE '%link_template%'"
    ).fetchall():
        if not link_template_is_seedable(sig_json):
            continue
        cur.execute(
            "UPDATE block_attributes SET role = 'link-content' WHERE id = ?", (row_id,)
        )
        link_filled += 1

    # TIER 3.5 -- ENUM BACKSTOP (2026-08-05, Bean). A row that declares `enum` in its
    # block.json is a SELECT: the author picks one of a fixed list. That is a positive,
    # structural fact seeded by /sgs-update Stage 1 straight from block.json
    # (sgs-update-v2.py:895) -- not an inference from the attribute's name -- and it is
    # the same shape of evidence `styling` takes from css_property.
    #
    # WHY THIS TIER EXISTS AT ALL (Bean's ruling, 2026-08-05): `role IS NULL` must mean
    # exactly ONE thing -- "no seeding mechanism reached this row". A row left NULL merely
    # because no role happened to fit is indistinguishable from a row nobody examined, and
    # that is the signal STEP 0 was built to create. Same argument the `technical` tier
    # makes for staying narrow.
    #
    # ROLE = 'enum-mode', NOT 'select-from-enum'. The first draft of this tier used
    # select-from-enum and was WRONG: that role's contract is "a string CSS VALUE chosen
    # from a fixed enum", and two live consumers rely on that promise -- _kind_for()
    # (db_lookup.py:1964-1965) resolves it to CSS kind 'string', and the BEM-modifier probe
    # (db_lookup.py:4889-4896) may WRITE a draft's modifier into it. Most enum attrs are
    # not CSS values at all (sgs/card-grid.source = manual|query|wc-product,
    # sgs/container.tagName, sgs/audio.audioSource), so filing them there feeds both
    # consumers a falsehood. `enum-mode` is in neither consumer group. See its roles.json
    # entry for the full contract.
    #
    # IT DOES NOT FORECLOSE A BETTER ANSWER. `enum-mode` is not "graduated" in
    # resolve_role_with_healing() (only content-bearing roles and hand-override rows are),
    # so the moment property_suffixes can resolve one of these attrs to a specific family
    # the healer OVERWRITES this role -- e.g. sgs/container.backgroundRepeat carries
    # enum-mode today and should become `visual` + css_property='background-repeat' once a
    # suffix reaches it. Generic now, specific later, automatically.
    #
    # SAFETY -- stated precisely rather than overclaimed. An enum row CAN be
    # content-bearing: sgs/* today has one 'link-href' and one 'identity' row carrying an
    # enum. That is exactly why this pass runs LAST and only where `role IS NULL` -- both
    # of those rows already carry their content role from an earlier tier and are
    # untouchable here. The residual risk is a genuinely content-bearing enum attr that
    # NO earlier tier reaches; the fix then is to reach it in the structural tier, not to
    # loosen this gate. The self-test plants that shape.
    #
    # NOT tag-identity: `tag_identity_attrs` (db_lookup.py:1107) gates on
    # role='tag-identity' set through the override channel, and its own docstring rejects
    # bare enum-contains as over-broad (naming quote.attributionTag). Overrides are
    # applied AFTER this pass (sgs-update-v2.py Stage 1C), so promoting any of these rows
    # to tag-identity later remains available and is not blocked by this fill.
    enum_filled = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes "
        "WHERE role IS NULL AND enum_values IS NOT NULL AND enum_values NOT IN ('', '[]', 'null')"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'enum-mode' WHERE id = ?", (row_id,)
        )
        enum_filled += 1

    # TIER 3.6 -- BOOLEAN CONTENT-ROLE SWEEP (2026-08-05, Bean). A BOOLEAN attribute can
    # never be content. `boolean-visibility`'s own roles.json entry makes the argument:
    # "A draft's HTML/CSS carries no signal a boolean toggle could be lifted from, so the
    # absence of a resolver is expected, not a gap."
    #
    # THE LIVE DEFECT THIS REPAIRS. Neither the property-suffix peel nor the Tier-1 name
    # regex gates on `attr_type` -- both map a NAME to a role. So `showTitle` (boolean)
    # peels the `Title` suffix to `text-content`, which is CONTENT-BEARING, which means the
    # cloning content walk will try to lift a draft's title TEXT into a boolean attribute.
    # Measured 2026-08-05: 10 such rows live -- post-grid.showTitle/showDate/showImage,
    # trustpilot-reviews.showSubtitle/showDate/showSchema, google-reviews.showDate,
    # business-info.linkPhone/linkEmail, accordion.faqSchema. Found by root-causing why
    # 5 `behaviour` overrides existed: they were DEFENDING against exactly this
    # (sgs/container.bgSvgTextShadow is a boolean whose name peels to role='color',
    # css_property='box-shadow'), not declaring debt.
    #
    # WHY A SWEEP AND NOT A GUARD AT EACH WRITER -- one fix, chosen deliberately. Guarding
    # every site that can write a role (the main run() loop, the healer, the name-regex
    # fill/upgrade, each tier) means N edits where missing ONE leaves the bug live, and it
    # would still need a separate one-off pass to repair the 10 rows already wrong. This
    # single choke point repairs AND prevents, and catches any future writer by
    # construction. Two overlapping fixes would be unfalsifiable -- you could never tell
    # which one was load-bearing -- so this is deliberately the only one.
    #
    # It runs LAST so it can never pre-empt a legitimate tier, and it RECLASSIFIES rather
    # than NULLing: NULL means "no mechanism reached this row" (D497), and these rows WERE
    # reached -- by a mechanism that was wrong about them. `boolean-visibility` is
    # classification='styling-behaviour', so the row leaves the content walk immediately.
    #
    # DB-FIRST (R-31-1): content-bearing-ness is read from the `roles` table's own
    # classification column, never a hardcoded role list that would drift from it.
    boolean_swept = _sweep_boolean_content_roles(conn)

    # TIER 3.7 -- ROLE/ATTR_TYPE COMPATIBILITY SWEEP (2026-08-05, Bean). GENERALISES
    # TIER 3.6: that tier closed ONE instance of this defect class (a boolean carrying a
    # CONTENT-BEARING role); Bean found a second instance of the SAME class (a boolean
    # carrying role='select-from-enum', whose own contract promises "a string CSS VALUE
    # chosen from a fixed enum" -- a boolean is not a string CSS value). Rather than add a
    # second hand-picked instance, this tier makes the check a PROPERTY OF THE ROLE: any
    # role may declare, in its own roles.json entry, which attr_types its documented
    # contract cannot honour (`excludes_attr_types`) -- so the next instance of this class
    # closes by DATA, not by a third bespoke sweep.
    #
    # WHY A ROLES.JSON FIELD, NOT A DB COLUMN (R-31-1 read the correct way here): roles.json
    # is ALREADY the two-way-synced truth source for the `roles` table
    # (db_lookup.py:_migrate_roles_table, INSERT OR REPLACE + delete-not-in). Adding a 3rd
    # array element to a role's entry needs NO schema change and NO reseed to take effect in
    # THIS script, because `_load_roles_seed()` (db_lookup.py:127-144) reads `val[0]`/`val[1]`
    # by INDEX, not by tuple-unpack arity -- a 3rd element is structurally invisible to it.
    # (`roles` table itself gains no new column here; that is a separate, later change if the
    # DB ever needs to query this compatibility fact directly.)
    #
    # 17 boolean rows measured non-compliant 2026-08-05 across 5 roles (select-from-enum x9,
    # colour-gradient x4, enum-class-probe x3, number-css-px x1; tag-identity x0 live but
    # excluded pre-emptively from its own contract text). PER-ROLE JUSTIFICATION lives in
    # each role's roles.json entry (`excludes_reason`), not duplicated here.
    #
    # TWO TARGETS, chosen by evidence already ON the row, never by block/attr name:
    #   - attr_type='boolean' AND css_property IS NOT NULL -> 'css-gate'. Proven live only
    #     for select-from-enum's imageZoomHover/grayscaleHover (css_property='transform'/
    #     'filter', legitimately set for INPUT-side routing per the card-grid/style.css
    #     preset-stylesheet audit this session -- see the 'css-gate' roles.json entry for the
    #     full contract). Reclassifying these to 'boolean-visibility' instead would be FALSE:
    #     that role's own contract says no CSS signal exists for it, and here one genuinely
    #     does. TIER 3.7 never touches css_property -- role only.
    #   - attr_type='boolean' AND css_property IS NULL -> 'boolean-visibility' (the same
    #     target TIER 3.6 already uses for the sibling defect class) -- a plain editor toggle
    #     with no CSS signal, which is exactly what that role's contract promises.
    #   - Any OTHER excluded (role, attr_type) pairing -- e.g. a future entry excluding
    #     'string' or 'number' -- has no proven safe universal target and is left UNTOUCHED,
    #     only reported via the returned count. Guessing a target here would risk exactly
    #     the failure mode Bean warned against: "a wrong exclusion silently destroys a
    #     correct classification."
    type_swept = _sweep_incompatible_role_types(conn)

    conn.commit()
    return {
        "filled": filled,
        "upgraded": upgraded,
        "structural_filled": structural_filled,
        "technical_filled": technical_filled,
        "styling_filled": styling_filled,
        # TIER 2.4 -- rows given 'styling' because their only consumer is the shared
        # container wrapper. Printed separately from styling_filled so a reseed can tell
        # the two evidence routes apart (css_property vs wrapper-only read).
        "wrapper_styling_filled": wrapper_styling_filled,
        # TIER 3.15 -- rows upgraded OFF the generic backstop onto a specific role. A
        # non-zero count on a steady-state reseed means a new row landed on `styling` that
        # a specific mechanism can now resolve — worth reading, not ignoring.
        "styling_upgraded": styling_upgraded,
        # TIER 3.16 -- rows corrected onto the right icon-<kind> routing-key role within a
        # resolved icon-source family. Expected steady-state count is 3 (sgs/separator's
        # contentIconWpIcon/contentIconDashicon/contentIconEmoji); non-zero on a later
        # reseed means a NEW icon-source-family block landed with mis-roled siblings.
        "icon_family_corrected": icon_family_corrected,
        # TIER 3.17 -- rows corrected off the generic 'styling' backstop onto 'behaviour'
        # because their css_property carries the fx:* pseudo-namespace marker. Expected
        # steady-state count is 0 (D604/D607 hand-corrected every existing instance);
        # non-zero on a later reseed means a NEW fx:* attribute landed and needs a look.
        "fx_styling_corrected": fx_styling_corrected,
        # TIER 3.18 -- fresh seed for `source='native_wp'` rows onto the new 'core' role.
        # Expected steady-state count is 0 once the live DB has been seeded once (this
        # tier's own WHERE clause is `role IS NULL`, so it is idempotent); non-zero on a
        # later reseed means a new WP-core reference attribute needs the same seed.
        "native_wp_seeded": native_wp_seeded,
        # TIER 3.19 -- generic backstop for a boolean with no CSS signal at all. Expected
        # steady-state count is 0 once the live DB has been seeded once (idempotent);
        # non-zero on a later reseed means a new boolean attribute needs the same seed.
        "boolean_visibility_seeded": boolean_visibility_seeded,
        # TIER 3.20 -- css_element sentinel for the fx:* namespace, sibling to TIER
        # 3.17's role sentinel. Expected steady-state count is 0 once the live DB has
        # been seeded once (idempotent, WHERE clause is `css_element IS NULL`);
        # non-zero on a later reseed means a new fx:* attribute needs the same seed.
        "fx_css_element_seeded": fx_css_element_seeded,
        # TIER 3.20b -- one-row role reconciliation for sgs/before-after.fxDraggable
        # (see TIER 3.20b docstring above for why this is narrower than TIER 3.17/3.20
        # on purpose). Expected steady-state count is 0 once applied once; non-zero on
        # a later reseed would mean the row regressed to 'boolean-visibility' again.
        "before_after_fx_draggable_role_fixed": before_after_fx_draggable_role_fixed,
        "unit_inherited": unit_inherited,
        # TIER 3.41 -- device-tier (Tablet/Mobile) sibling inherits its base's role
        # verbatim, content or styling. Non-zero on a later reseed means a new
        # per-device attribute pair landed with the base already classified.
        "breakpoint_inherited": breakpoint_inherited,
        "enum_filled": enum_filled,
        "link_filled": link_filled,
        # TIER 3.6 -- boolean attrs whose role was content-bearing, reclassified to
        # 'boolean-visibility'. A NON-ZERO count here on a steady-state reseed means a
        # writer upstream is still mapping a NAME to a content role without checking
        # attr_type -- worth investigating, not ignoring.
        "boolean_swept": boolean_swept,
        # TIER 3.7 -- rows reclassified because their attr_type violates their role's
        # OWN documented contract (roles.json excludes_attr_types). Split by target so a
        # steady-state reseed can tell the two remediation shapes apart; 'unhandled' is
        # non-zero only if a future roles.json exclusion names a (role, attr_type) pairing
        # this tier has no proven safe target for -- those rows are reported, never guessed.
        "type_sweep_to_css_gate": type_swept["to_css_gate"],
        "type_sweep_to_boolean_visibility": type_swept["to_boolean_visibility"],
        "type_sweep_unhandled": type_swept["unhandled"],
        # TIER 0A -- image<->alt companion (D497). image_filled/alt_filled are role
        # fills; companion_filled is the alt_companion_attr column fill; conflicts is
        # a DIFFERING pre-existing alt_companion_attr value (reported, never clobbered).
        "companion_image_filled": _companion["image_filled"],
        "companion_alt_filled": _companion["alt_filled"],
        "companion_link_filled": _companion["companion_filled"],
        "companion_conflicts": _companion["companion_conflicts"],
        # Present and non-None when Detector 5 itself failed to run (import/parse
        # error) -- same degrade contract as structural_error below.
        "companion_error": _companion["companion_error"],
        # Present and TRUE when the structural tier failed. Callers/logs must show this:
        # a degraded run that silently reverts to name-guessing is indistinguishable from
        # a healthy one unless the failure is carried out with the counts.
        "structural_error": structural_error,
    }


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


def _apply_wrapper_styling_tier(conn, d4_wrapper_painted: set) -> int:
    """TIER 2.4's write logic. Assign 'styling' to every still-unclassified row whose
    ONLY consumer is the shared container wrapper (Detector 4's wrapper bucket).

    Returns the number of rows claimed. Takes the verdict set as a PARAMETER rather than
    recomputing it, so the self-test can plant a known set and drive this exact function.

    The two guards in the WHERE clause are the whole contract:
      * `role IS NULL`         -- every content tier ran first and is final.
      * `css_property IS NULL` -- a row the emission layer already classified belongs to
                                  TIER 3; two writers for one fact is the defect this
                                  file's `eligible_pool` partition exists to prevent.
    """
    cur = conn.cursor()
    filled = 0
    if not d4_wrapper_painted:
        return 0
    for row_id, block_slug, attr_name in conn.execute(
        "SELECT id, block_slug, attr_name FROM block_attributes "
        "WHERE role IS NULL AND css_property IS NULL"
    ).fetchall():
        if (block_slug, attr_name) in d4_wrapper_painted:
            cur.execute(
                "UPDATE block_attributes SET role = 'styling' WHERE id = ?", (row_id,)
            )
            filled += 1
    conn.commit()
    return filled


def _self_test_styling_upgrade() -> int:
    """Prove the TIER 3.15 generic-styling upgrade can FAIL, on a throwaway in-memory DB.

    Pins the one property that makes this pass safe: it is an UPGRADE OFF `styling` and
    nothing else. The tempting loosening — "apply the verdict wherever it matches" — would
    let a measured paint site overwrite a CONTENT verdict, which no evidence here licenses.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, css_property TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, css_property) "
        "VALUES (?,?,?,?,?)",
        [
            (1, "sgs/button", "colourBorder", "styling", "border-color"),   # upgrade
            (2, "sgs/container", "gridItemBorder", "styling", "border-color"),  # SHORTHAND
            (3, "sgs/x", "someText", "text-content", None),                 # content untouchable
            (4, "sgs/x", "alreadySpecific", "typography", "font-size"),     # specific untouchable
            (5, "sgs/x", "stillNull", None, None),                          # NULL is not this pass's
        ],
    )
    conn.commit()
    # gridItemBorder is deliberately ABSENT from the verdict map — D7 declines it because
    # its value is a shorthand, not a colour. The other three are present to prove the
    # `role = 'styling'` guard is what protects them, not their absence from the map.
    upgrades = {
        ("sgs/button", "colourBorder"): "color",
        ("sgs/x", "someText"): "color",
        ("sgs/x", "alreadySpecific"): "color",
        ("sgs/x", "stillNull"): "color",
    }

    cur = conn.cursor()
    upgraded = 0
    for (s, a), r in upgrades.items():
        cur.execute(
            "UPDATE block_attributes SET role = ? "
            "WHERE block_slug = ? AND attr_name = ? AND role = 'styling'",
            (r, s, a),
        )
        upgraded += cur.rowcount
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if upgraded == 0:
        failures.append("claimed ZERO rows against a planted upgrade — cannot fail, proves nothing")
    if got.get("colourBorder") != "color":
        failures.append(f"colourBorder -> {got.get('colourBorder')!r}, expected 'color'")
    if got.get("gridItemBorder") != "styling":
        failures.append(
            f"gridItemBorder -> {got.get('gridItemBorder')!r}: the border SHORTHAND was "
            "upgraded. Its value is `1px solid #ccc`, not a colour — filing it `color` "
            "hands attr_is_colour_role() a shorthand and calls it a colour."
        )
    if got.get("someText") != "text-content":
        failures.append(
            f"someText -> {got.get('someText')!r}: a CONTENT verdict was overwritten. This "
            "pass upgrades off `styling` only; nothing here licenses touching content."
        )
    if got.get("alreadySpecific") != "typography":
        failures.append(
            f"alreadySpecific -> {got.get('alreadySpecific')!r}: an already-specific family "
            "was overwritten — the pass must only replace the generic backstop."
        )
    if got.get("stillNull") is not None:
        failures.append(
            f"stillNull -> {got.get('stillNull')!r}: a NULL row was claimed. NULL belongs to "
            "the filling tiers; this pass only upgrades."
        )
    conn.close()
    if failures:
        print(f"STYLING-UPGRADE SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"STYLING-UPGRADE SELF-TEST PASSED -- {upgraded} row(s) upgraded, 6 checks green.")
    return 0


def _self_test_icon_family_correction(*, break_guard: bool = False) -> int:
    """Prove the TIER 3.16 icon-source-family correction can FAIL, on a throwaway
    in-memory DB.

    Drives the REAL SQL the tier runs (verbatim, not a re-implementation), so
    production/test drift is caught -- the pattern this file's docstrings repeatedly
    warn is otherwise undetectable.

    Cases planted, mirroring the three the task requires:
      1. a family member holding a WRONG role                 -> corrected
      2. a family member ALREADY holding the right icon-* role -> untouched (proves the
         `role NOT LIKE 'icon-%'` guard, not merely the correction map's own filtering --
         this row is planted in the correction map too, so only the SQL guard can save it)
      3. a NON-family row (not in the correction map at all)   -> untouched

    `break_guard=True` REMOVES the guard and re-runs the same plant, to prove the rule can
    fail: with no guard, case 2's already-specific icon-* role is clobbered by whatever
    verdict the map carries for it. This is the mechanism this task's HARD REQUIREMENT 4
    calls for -- the guard must be shown able to fail, not merely asserted safe.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role) VALUES (?,?,?,?)",
        [
            (1, "sgs/separator", "contentIconWpIcon", "enum-class-probe"),  # wrong -> fix
            (2, "sgs/icon", "wpIconName", "icon-wp-icon"),                  # already right
            (3, "sgs/x", "unrelatedAttr", "styling"),                       # non-family
        ],
    )
    conn.commit()
    # Only the WRONG-role row and the already-correct row appear in the correction map.
    # `sgs/x.unrelatedAttr` is deliberately ABSENT -- unlike TIER 3.15's styling-upgrade
    # guard, the `role NOT LIKE 'icon-%'` SQL guard protects against a STALE/cross-family
    # verdict on an already-correct icon-* row; it does NOT and cannot protect against a
    # non-family row, because non-family exclusion happens upstream, in Python, inside
    # `_icon_family_corrections()` (only a row D6's icon-source-family mechanism actually
    # resolves ever enters the map at all — proven separately: the icon-list.items false
    # positive measured during this build never reaches the map because it is
    # attr_type='array', filtered out by `all_sgs_rows()` before D6 ever sees it). So the
    # correct proof for the non-family case is that the row is simply never a key in this
    # loop, and its role survives untouched — proving the loop claims ONLY its own map.
    corrections = {
        ("sgs/separator", "contentIconWpIcon"): "icon-wp-icon",
        ("sgs/icon", "wpIconName"): "icon-dashicon",  # deliberately WRONG verdict for case 2
    }

    # break_guard=True drops the `role NOT LIKE 'icon-%'` clause ENTIRELY -- not just the
    # `role IS NULL OR` widening -- because that clause alone would still (correctly)
    # exclude wpIconName, since 'icon-wp-icon' LIKE 'icon-%' is true regardless of the
    # NULL handling either side of it. Only removing the WHOLE guard reproduces the
    # unguarded write this self-test exists to prove is dangerous.
    guard_sql = (
        "" if break_guard
        else "AND (role IS NULL OR role NOT LIKE 'icon-%')"
    )
    cur = conn.cursor()
    corrected = 0
    for (f_slug, f_attr), f_role in corrections.items():
        cur.execute(
            "UPDATE block_attributes SET role = ? "
            f"WHERE block_slug = ? AND attr_name = ? {guard_sql}",
            (f_role, f_slug, f_attr),
        )
        corrected += cur.rowcount
    conn.commit()

    got = {
        (s, a): r for s, a, r in
        conn.execute("SELECT block_slug, attr_name, role FROM block_attributes").fetchall()
    }
    conn.close()

    # Base checks -- true regardless of which guard variant ran: the wrong-role row must
    # be corrected, and the non-family row (never a key in `corrections`) must be
    # untouched. Neither of these depends on the guard, so both are asserted either way.
    failures = []
    if corrected == 0:
        failures.append("claimed ZERO rows against a planted correction — cannot fail, proves nothing")
    if got.get(("sgs/separator", "contentIconWpIcon")) != "icon-wp-icon":
        failures.append(
            f"contentIconWpIcon -> {got.get(('sgs/separator', 'contentIconWpIcon'))!r}, "
            "expected 'icon-wp-icon'"
        )
    if got.get(("sgs/x", "unrelatedAttr")) != "styling":
        failures.append(
            f"unrelatedAttr -> {got.get(('sgs/x', 'unrelatedAttr'))!r}: a NON-family row "
            "was claimed. This pass must only correct rows a resolved icon-source family "
            "actually names."
        )

    # The one check that FLIPS between the two runs: whether the already-correct icon-*
    # row (wpIconName) survived. Guarded -> it must survive. Guard removed -> it MUST be
    # clobbered by the deliberately wrong planted verdict, because that clobbering IS the
    # failure this probe exists to demonstrate.
    wp_icon_survived = got.get(("sgs/icon", "wpIconName")) == "icon-wp-icon"

    label = "ICON-FAMILY-CORRECTION GUARD-BROKEN" if break_guard else "ICON-FAMILY-CORRECTION"

    if break_guard:
        if wp_icon_survived:
            print(f"{label} SELF-TEST: guard removal did NOT reproduce the failure mode "
                  "(wpIconName survived even with no guard) -- treat as a self-test bug, "
                  "not proof the guard is load-bearing.")
            return 1
        if failures:
            # The base checks broke too -- something other than the intended guard
            # removal went wrong; this is not the clean demonstration the probe wants.
            print(f"{label} SELF-TEST: unexpected additional failures alongside the "
                  "intended breakage:")
            for f in failures:
                print(f"  - {f}")
            return 1
        print(f"{label} SELF-TEST CONFIRMED THE FAILURE (as expected with no guard): "
              f"wpIconName -> {got.get(('sgs/icon', 'wpIconName'))!r}, clobbered from "
              "'icon-wp-icon' because the `role NOT LIKE 'icon-%'` guard was removed.")
        return 0

    if not wp_icon_survived:
        failures.append(
            f"wpIconName -> {got.get(('sgs/icon', 'wpIconName'))!r}: an already-correct "
            "icon-* role was overwritten. The `role NOT LIKE 'icon-%'` guard exists "
            "precisely to protect a row like this from a stale or cross-family verdict."
        )
    if failures:
        print(f"{label} SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"{label} SELF-TEST PASSED -- {corrected} row(s) corrected, 4 checks green.")
    return 0


def _self_test_wrapper_styling_tier() -> int:
    """Prove the TIER 2.4 wrapper-styling pass can FAIL, on a throwaway in-memory DB.

    Drives the REAL `_apply_wrapper_styling_tier()`, so production/test drift is caught.

    The tempting loosening this pins against is the mirror of TIER 2.5's: "anything the
    wrapper is near is styling". The rule is narrower than that -- D4 awards the bucket
    only when the attribute's SINGLE resolved consumer is the wrapper file -- and a row
    no detector reached must still come out NULL.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, css_property TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, css_property) "
        "VALUES (?,?,?,?,?)",
        [
            (1, "sgs/plant", "overlayGradientFrom", None, None),   # wrapper-only -> styling
            (2, "sgs/plant", "unreachedKey", None, None),          # NOT in set -> stays NULL
            (3, "sgs/plant", "wrapperButMapped", None, "gap"),     # css_property -> TIER 3's
            (4, "sgs/plant", "wrapperButContent", "text-content", None),  # content wins
        ],
    )
    conn.commit()
    planted = {
        ("sgs/plant", "overlayGradientFrom"),
        ("sgs/plant", "wrapperButMapped"),
        ("sgs/plant", "wrapperButContent"),
    }

    filled = _apply_wrapper_styling_tier(conn, planted)

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if filled == 0:
        failures.append(
            "claimed ZERO rows against a planted wrapper set -- cannot fail, proves nothing"
        )
    if got.get("overlayGradientFrom") != "styling":
        failures.append(
            f"overlayGradientFrom -> {got.get('overlayGradientFrom')!r}, expected 'styling'"
        )
    if got.get("unreachedKey") is not None:
        failures.append(
            f"unreachedKey -> {got.get('unreachedKey')!r}: a row NO detector reached was "
            "claimed. Bean's rule is that NULL means unreached or unseedable -- widening "
            "this tier to leftovers would destroy exactly that distinction."
        )
    if got.get("wrapperButMapped") is not None:
        failures.append(
            f"wrapperButMapped -> {got.get('wrapperButMapped')!r}: a row carrying a "
            "css_property was claimed here. That row is TIER 3's; two writers for one "
            "fact is the partition defect this gate exists to avoid."
        )
    if got.get("wrapperButContent") != "text-content":
        failures.append(
            f"wrapperButContent -> {got.get('wrapperButContent')!r}: an existing content "
            "role was overwritten. Content tiers run first and are final."
        )
    # An empty verdict set must be a NO-OP, never a sweep. A degraded detector returning
    # nothing must not read as "no rows qualified" -- it must change nothing at all.
    conn.execute("UPDATE block_attributes SET role = NULL WHERE id = 1")
    conn.commit()
    if _apply_wrapper_styling_tier(conn, set()) != 0:
        failures.append("an EMPTY verdict set claimed rows -- a degraded detector must be a no-op")

    conn.close()
    if failures:
        print(f"WRAPPER-STYLING SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"WRAPPER-STYLING SELF-TEST PASSED -- {filled} rows claimed, 6 checks green.")
    return 0


def _self_test_technical_veto() -> int:
    """Prove the TIER 2.5 technical-from-veto pass can FAIL, on a throwaway in-memory DB.

    The role's whole justification is that it is assigned from EVIDENCE (a D1 veto) and
    never from absence. These checks pin exactly that, because the tempting loosening --
    "anything left over is technical" -- would silently relabel every unreached row and
    destroy the distinction the role was added to create.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, css_property TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, css_property) "
        "VALUES (?,?,?,?,?)",
        [
            (1, "sgs/plant", "vetoedKey", None, None),        # vetoed -> technical
            (2, "sgs/plant", "unreachedKey", None, None),      # NOT vetoed -> stays NULL
            (3, "sgs/plant", "vetoedButStyled", None, "gap"),  # css_property wins
            (4, "sgs/plant", "vetoedButContent", "text-content", None),  # content wins
        ],
    )
    conn.commit()
    d1_vetoed = {("sgs/plant", "vetoedKey"), ("sgs/plant", "vetoedButStyled"),
                 ("sgs/plant", "vetoedButContent")}

    cur = conn.cursor()
    filled = 0
    for row_id, slug, attr in conn.execute(
        "SELECT id, block_slug, attr_name FROM block_attributes "
        "WHERE role IS NULL AND css_property IS NULL"
    ).fetchall():
        if (slug, attr) in d1_vetoed:
            cur.execute("UPDATE block_attributes SET role = 'technical' WHERE id = ?", (row_id,))
            filled += 1
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if filled == 0:
        failures.append("claimed ZERO rows against a planted veto set -- cannot fail, proves nothing")
    if got.get("vetoedKey") != "technical":
        failures.append(f"vetoedKey -> {got.get('vetoedKey')!r}, expected 'technical'")
    if got.get("unreachedKey") is not None:
        failures.append(
            f"unreachedKey -> {got.get('unreachedKey')!r}: a row NO detector reached was "
            "claimed. 'Unreached' is not 'proven technical' -- collapsing them rebuilds "
            "the ambiguity this role removes."
        )
    if got.get("vetoedButStyled") is not None:
        failures.append(
            f"vetoedButStyled -> {got.get('vetoedButStyled')!r}: a row with a css_property "
            "was claimed as technical. A veto says only 'not content'; css_property says "
            "positively what it IS, and must win."
        )
    if got.get("vetoedButContent") != "text-content":
        failures.append(
            f"vetoedButContent -> {got.get('vetoedButContent')!r}: an existing content role "
            "was overwritten. Content tiers run first and are final."
        )
    conn.close()
    if failures:
        print(f"TECHNICAL-VETO SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"TECHNICAL-VETO SELF-TEST PASSED -- {filled} rows claimed, 5 checks green.")
    return 0


def _self_test_styling_backstop() -> int:
    """Prove the TIER 3 generic-styling backstop can FAIL, on a throwaway in-memory DB.

    Three planted rows, each one a way the backstop could be wrong:
      1. a styling row it MUST claim   (css_property set, role NULL)
      2. a content row it MUST NOT claim (role already set by an earlier tier)
      3. the NAMED RESIDUAL RISK from the pass's own comment -- a content-bearing attr
         that ALSO carries a css_property and that no earlier tier reached. Today none
         exists; this asserts the CURRENT behaviour (it gets claimed) so that if the
         situation ever arises the failure is visible and dated, rather than silent.
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, css_property TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, css_property) "
        "VALUES (?,?,?,?,?)",
        [
            (1, "sgs/plant", "plantedStyling", None, "justify-content"),
            (2, "sgs/plant", "plantedContent", "text-content", None),
            (3, "sgs/plant", "plantedContentWithCss", None, "color"),
            (4, "sgs/plant", "plantedUnreached", None, None),
            # Row 5 exists because a NEGATIVE CONTROL caught this fixture passing a
            # defect it was written to catch (2026-08-05). Deleting the `role IS NULL`
            # guard from the query left the test GREEN: the only row with a role
            # (plantedContent) had css_property=NULL, so `css_property IS NOT NULL`
            # excluded it anyway and the missing guard was undetectable. Proving a
            # guard needs a row that ONLY that guard protects -- role set AND
            # css_property set.
            (5, "sgs/plant", "plantedStyledContent", "text-content", "color"),
        ],
    )
    conn.commit()

    cur = conn.cursor()
    claimed = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes WHERE role IS NULL AND css_property IS NOT NULL"
    ).fetchall():
        cur.execute("UPDATE block_attributes SET role = 'styling' WHERE id = ?", (row_id,))
        claimed += 1
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if claimed == 0:
        failures.append("backstop claimed ZERO rows against a planted set -- it cannot "
                        "fail, so it proves nothing")
    if got.get("plantedStyling") != "styling":
        failures.append(f"plantedStyling -> {got.get('plantedStyling')!r}, expected 'styling'")
    if got.get("plantedStyledContent") != "text-content":
        failures.append(
            f"plantedStyledContent -> {got.get('plantedStyledContent')!r}: the backstop "
            "overwrote an EXISTING role on a row that also has a css_property. This is "
            "the row that proves the `role IS NULL` guard -- without it the guard's "
            "removal is undetectable."
        )
    if got.get("plantedContent") != "text-content":
        failures.append(
            f"plantedContent -> {got.get('plantedContent')!r}: the backstop OVERWROTE a "
            "role an earlier tier had already assigned. It must only fill NULLs."
        )
    if got.get("plantedUnreached") is not None:
        failures.append(
            f"plantedUnreached -> {got.get('plantedUnreached')!r}: a row with NO "
            "css_property was claimed. css_property IS the evidence of styling; without "
            "it the backstop is guessing."
        )
    if got.get("plantedContentWithCss") != "styling":
        failures.append(
            "plantedContentWithCss changed behaviour: the documented residual risk is "
            "that such a row IS claimed as styling. If this now differs, update the "
            "pass's comment -- do not silently accept a new verdict."
        )
    conn.close()

    if failures:
        print(f"STYLING-BACKSTOP SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"STYLING-BACKSTOP SELF-TEST PASSED -- {claimed} rows claimed, 5 checks green.")
    return 0


def _self_test_fx_styling_correction() -> int:
    """Prove TIER 3.17 (fx:* namespace styling correction) claims exactly the rows it
    should and never the rows its guard protects, on a throwaway in-memory DB.

    Five planted rows, each a distinct way the tier could be wrong:
      1. a row it MUST claim -- role='styling' AND an fx:* marker
      2. a row it MUST NOT claim -- role='styling' but a REAL css_property (not fx:*);
         proves the `css_property LIKE 'fx:%'` half of the guard
      3. a row it MUST NOT claim -- role IS NULL with an fx:* marker (this tier only
         corrects rows the backstop has ALREADY claimed; a NULL row is TIER 3's job,
         not this one's -- in the real pipeline TIER 3 runs first, so a fresh fx:* row
         is 'styling' by the time this tier sees it, but this fixture tests TIER 3.17's
         OWN SQL in isolation, so the NULL case must be planted directly)
      4. a row it MUST NOT claim -- a CONTENT role with an fx:* marker (must never
         overwrite a content verdict, same non-negotiable as TIER 3.15's own guard)
      5. a row already 'behaviour' with an fx:* marker -- idempotence: re-running the
         tier on an already-correct row must be a no-op, not an error
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, css_property TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, css_property) "
        "VALUES (?,?,?,?,?)",
        [
            (1, "sgs/plant", "plantedFxStyling", "styling", "fx:momentum"),
            (2, "sgs/plant", "plantedRealStyling", "styling", "border-color"),
            (3, "sgs/plant", "plantedFxUnclaimed", None, "fx:loop"),
            (4, "sgs/plant", "plantedFxContent", "text-content", "fx:loop"),
            (5, "sgs/plant", "plantedFxAlreadyCorrect", "behaviour", "fx:scrub"),
        ],
    )
    conn.commit()

    cur = conn.cursor()
    corrected = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes WHERE role = 'styling' AND css_property LIKE 'fx:%'"
    ).fetchall():
        cur.execute("UPDATE block_attributes SET role = 'behaviour' WHERE id = ?", (row_id,))
        corrected += 1
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if corrected == 0:
        failures.append("tier corrected ZERO rows against a planted set -- it cannot "
                        "fail, so it proves nothing")
    if got.get("plantedFxStyling") != "behaviour":
        failures.append(
            f"plantedFxStyling -> {got.get('plantedFxStyling')!r}, expected 'behaviour'"
        )
    if got.get("plantedRealStyling") != "styling":
        failures.append(
            f"plantedRealStyling -> {got.get('plantedRealStyling')!r}: a REAL css "
            "property was reclassified. The `LIKE 'fx:%'` guard must only match the "
            "fx:* pseudo-namespace, never a genuine CSS property name."
        )
    if got.get("plantedFxUnclaimed") is not None:
        failures.append(
            f"plantedFxUnclaimed -> {got.get('plantedFxUnclaimed')!r}: a row TIER 3 "
            "hasn't yet claimed (role IS NULL) was touched. This tier corrects the "
            "backstop's OUTPUT, it does not do the backstop's job."
        )
    if got.get("plantedFxContent") != "text-content":
        failures.append(
            f"plantedFxContent -> {got.get('plantedFxContent')!r}: the tier OVERWROTE "
            "a content role. It must only touch rows currently holding 'styling'."
        )
    if got.get("plantedFxAlreadyCorrect") != "behaviour":
        failures.append(
            f"plantedFxAlreadyCorrect -> {got.get('plantedFxAlreadyCorrect')!r}: an "
            "already-correct row changed on re-run. This tier must be idempotent."
        )
    conn.close()

    if failures:
        print(f"FX-STYLING-CORRECTION SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"FX-STYLING-CORRECTION SELF-TEST PASSED -- {corrected} row(s) corrected, 5 checks green.")
    return 0


def _self_test_native_wp_seed() -> int:
    """Prove TIER 3.18 (native-wp source seed) claims exactly the rows it should and
    never the rows its guard protects, on a throwaway in-memory DB.

    Four planted rows, each a distinct way the tier could be wrong:
      1. a row it MUST claim -- role IS NULL AND source='native_wp'
      2. a row it MUST NOT claim -- role IS NULL but source='sgs'; proves the tier never
         reaches into the population the rest of this file's tiers are responsible for
      3. a row it MUST NOT claim -- source='native_wp' but role is ALREADY SET (e.g. a
         future mechanism assigned it something specific); must never overwrite
      4. a row already 'core' with source='native_wp' -- idempotence: re-running the tier
         on an already-seeded row must be a no-op, not an error
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, source TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, source) "
        "VALUES (?,?,?,?,?)",
        [
            (1, "core/plant", "plantedNativeWpUnclaimed", None, "native_wp"),
            (2, "sgs/plant", "plantedSgsUnclaimed", None, "sgs"),
            (3, "core/plant", "plantedNativeWpAlreadyRoled", "technical", "native_wp"),
            (4, "core/plant", "plantedNativeWpAlreadyCorrect", "core", "native_wp"),
        ],
    )
    conn.commit()

    cur = conn.cursor()
    seeded = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes WHERE role IS NULL AND source = 'native_wp'"
    ).fetchall():
        cur.execute("UPDATE block_attributes SET role = 'core' WHERE id = ?", (row_id,))
        seeded += 1
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if seeded == 0:
        failures.append("tier seeded ZERO rows against a planted set -- it cannot "
                        "fail, so it proves nothing")
    if got.get("plantedNativeWpUnclaimed") != "core":
        failures.append(
            f"plantedNativeWpUnclaimed -> {got.get('plantedNativeWpUnclaimed')!r}, "
            "expected 'core'"
        )
    if got.get("plantedSgsUnclaimed") is not None:
        failures.append(
            f"plantedSgsUnclaimed -> {got.get('plantedSgsUnclaimed')!r}: an sgs-sourced "
            "row was touched. This tier must only seed source='native_wp' rows."
        )
    if got.get("plantedNativeWpAlreadyRoled") != "technical":
        failures.append(
            f"plantedNativeWpAlreadyRoled -> {got.get('plantedNativeWpAlreadyRoled')!r}: "
            "the tier OVERWROTE an already-assigned role. It must only touch role IS NULL."
        )
    if got.get("plantedNativeWpAlreadyCorrect") != "core":
        failures.append(
            f"plantedNativeWpAlreadyCorrect -> "
            f"{got.get('plantedNativeWpAlreadyCorrect')!r}: an already-seeded row "
            "changed on re-run. This tier must be idempotent."
        )
    conn.close()

    if failures:
        print(f"NATIVE-WP-SEED SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"NATIVE-WP-SEED SELF-TEST PASSED -- {seeded} row(s) seeded, 4 checks green.")
    return 0


def _self_test_boolean_visibility_backstop() -> int:
    """Prove TIER 3.19 (generic boolean backstop) claims exactly the rows it should and
    never the rows its guard protects, on a throwaway in-memory DB.

    Five planted rows, each a distinct way the tier could be wrong:
      1. a row it MUST claim -- role IS NULL, attr_type='boolean', css_property IS NULL
      2. a row it MUST NOT claim -- role IS NULL, attr_type='boolean', but css_property
         IS SET (a css-gate/fx-registry candidate already routed elsewhere -- this tier
         is the LAST-resort backstop, never a pre-empt)
      3. a row it MUST NOT claim -- role IS NULL but attr_type='string' (wrong shape;
         proves the `attr_type = 'boolean'` half of the guard)
      4. a row it MUST NOT claim -- attr_type='boolean', css_property IS NULL, but role
         is ALREADY SET (e.g. an override already classified it 'behaviour'); must never
         overwrite
      5. a row already 'boolean-visibility' with the matching shape -- idempotence:
         re-running the tier on an already-seeded row must be a no-op, not an error
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, attr_type TEXT, css_property TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, attr_type, "
        "css_property) VALUES (?,?,?,?,?,?)",
        [
            (1, "sgs/plant", "plantedBooleanUnclaimed", None, "boolean", None),
            (2, "sgs/plant", "plantedBooleanCssGated", None, "boolean", "fx:draggable"),
            (3, "sgs/plant", "plantedStringUnclaimed", None, "string", None),
            (4, "sgs/plant", "plantedBooleanAlreadyRoled", "behaviour", "boolean", None),
            (5, "sgs/plant", "plantedBooleanAlreadyCorrect", "boolean-visibility",
             "boolean", None),
        ],
    )
    conn.commit()

    cur = conn.cursor()
    seeded = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes "
        "WHERE role IS NULL AND attr_type = 'boolean' AND css_property IS NULL"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'boolean-visibility' WHERE id = ?",
            (row_id,),
        )
        seeded += 1
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if seeded == 0:
        failures.append("tier seeded ZERO rows against a planted set -- it cannot "
                        "fail, so it proves nothing")
    if got.get("plantedBooleanUnclaimed") != "boolean-visibility":
        failures.append(
            f"plantedBooleanUnclaimed -> {got.get('plantedBooleanUnclaimed')!r}, "
            "expected 'boolean-visibility'"
        )
    if got.get("plantedBooleanCssGated") is not None:
        failures.append(
            f"plantedBooleanCssGated -> {got.get('plantedBooleanCssGated')!r}: a "
            "boolean with a REAL css_property signal was claimed. This tier is a "
            "LAST-resort backstop, never a pre-empt of a more specific mechanism."
        )
    if got.get("plantedStringUnclaimed") is not None:
        failures.append(
            f"plantedStringUnclaimed -> {got.get('plantedStringUnclaimed')!r}: a "
            "non-boolean row was touched. The `attr_type = 'boolean'` guard must hold."
        )
    if got.get("plantedBooleanAlreadyRoled") != "behaviour":
        failures.append(
            f"plantedBooleanAlreadyRoled -> {got.get('plantedBooleanAlreadyRoled')!r}: "
            "the tier OVERWROTE an already-assigned role. It must only touch role IS NULL."
        )
    if got.get("plantedBooleanAlreadyCorrect") != "boolean-visibility":
        failures.append(
            f"plantedBooleanAlreadyCorrect -> "
            f"{got.get('plantedBooleanAlreadyCorrect')!r}: an already-seeded row "
            "changed on re-run. This tier must be idempotent."
        )
    conn.close()

    if failures:
        print(f"BOOLEAN-VISIBILITY-BACKSTOP SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"BOOLEAN-VISIBILITY-BACKSTOP SELF-TEST PASSED -- {seeded} row(s) seeded, "
          f"5 checks green.")
    return 0


def _self_test_unit_inheritance() -> int:
    """Prove the TIER 3.4 unit-inheritance pass can FAIL, on a throwaway in-memory DB.

    Planted rows, each one a way the pass could be wrong:
      1. a unit attr whose base is styling-behaviour  -> MUST inherit the base's role
      2. a unit attr whose base is CONTENT-bearing    -> MUST NOT inherit (a content role
         on a bare 'px' would walk it into the content lift)
      3. a unit attr whose base is itself unclassified -> MUST NOT inherit (two unknowns)
      4. a unit attr with NO base attr at all          -> MUST NOT inherit
      5. a unit attr that ALREADY has a role           -> MUST NOT be overwritten
      6. a non-unit attr                               -> MUST be untouched
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, css_property TEXT, enum_values TEXT)"
    )
    conn.execute("CREATE TABLE roles (role_name TEXT, classification TEXT)")
    conn.execute("CREATE TABLE modifier_suffixes (suffix TEXT, kind TEXT)")
    conn.executemany(
        "INSERT INTO roles (role_name, classification) VALUES (?,?)",
        [("layout", "styling-behaviour"), ("typography", "styling-behaviour"),
         ("text-content", "content-bearing")],
    )
    conn.execute("INSERT INTO modifier_suffixes (suffix, kind) VALUES ('Unit', 'unit')")
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, css_property, "
        "enum_values) VALUES (?,?,?,?,?,?)",
        [
            (1, "sgs/plant", "width", "layout", "width", None),
            (2, "sgs/plant", "widthUnit", None, None, None),
            (3, "sgs/plant", "caption", "text-content", None, None),
            (4, "sgs/plant", "captionUnit", None, None, None),
            (5, "sgs/plant", "mystery", None, None, None),
            (6, "sgs/plant", "mysteryUnit", None, None, None),
            (7, "sgs/plant", "orphanUnit", None, None, None),
            (8, "sgs/plant", "thicknessUnit", "typography", None, None),
            (9, "sgs/plant", "thickness", "layout", "border-width", None),
            (10, "sgs/plant", "plainAttr", None, None, None),
        ],
    )
    conn.commit()

    cur = conn.cursor()
    unit_suffixes = sorted(
        (s for s, k in conn.execute("SELECT suffix, kind FROM modifier_suffixes").fetchall()
         if k == "unit"),
        key=len, reverse=True,
    )
    sb_roles = {r[0] for r in conn.execute(
        "SELECT role_name FROM roles WHERE classification = 'styling-behaviour'"
    ).fetchall()}
    claimed = 0
    for row_id, block_slug, attr_name in conn.execute(
        "SELECT id, block_slug, attr_name FROM block_attributes WHERE role IS NULL"
    ).fetchall():
        base = None
        for sfx in unit_suffixes:
            if attr_name.endswith(sfx) and len(attr_name) > len(sfx):
                base = attr_name[: -len(sfx)]
                break
        if not base:
            continue
        base_row = conn.execute(
            "SELECT role FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, base),
        ).fetchone()
        if not base_row or base_row[0] not in sb_roles:
            continue
        cur.execute("UPDATE block_attributes SET role = ? WHERE id = ?", (base_row[0], row_id))
        claimed += 1
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if claimed == 0:
        failures.append("unit inheritance claimed ZERO rows against a planted set -- it "
                        "cannot fire, so it proves nothing")
    if got.get("widthUnit") != "layout":
        failures.append(f"widthUnit -> {got.get('widthUnit')!r}, expected 'layout' "
                        "inherited from its base")
    if got.get("captionUnit") is not None:
        failures.append(
            f"captionUnit -> {got.get('captionUnit')!r}: inherited a CONTENT-bearing role. "
            "A unit value is never content -- this would walk a bare unit into the lift."
        )
    if got.get("mysteryUnit") is not None:
        failures.append(f"mysteryUnit -> {got.get('mysteryUnit')!r}: inherited from an "
                        "UNCLASSIFIED base. Two unknowns are not a classification.")
    if got.get("orphanUnit") is not None:
        failures.append(f"orphanUnit -> {got.get('orphanUnit')!r}: claimed with no base "
                        "attr present at all.")
    if got.get("thicknessUnit") != "typography":
        failures.append(
            f"thicknessUnit -> {got.get('thicknessUnit')!r}: an EXISTING role was "
            "overwritten. This row proves the `role IS NULL` guard -- its base carries a "
            "different styling role, so without the guard the value would change."
        )
    if got.get("plainAttr") is not None:
        failures.append(f"plainAttr -> {got.get('plainAttr')!r}: a non-unit attr was claimed.")
    conn.close()

    if failures:
        print(f"UNIT-INHERITANCE SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"UNIT-INHERITANCE SELF-TEST PASSED -- {claimed} rows claimed, 6 checks green.")
    return 0


def _self_test_breakpoint_inheritance() -> int:
    """Prove the TIER 3.41 breakpoint-inheritance pass can FAIL, on a throwaway
    in-memory DB.

    Planted rows, each one a way the pass could be wrong:
      1. a Mobile sibling whose base is STYLING-BEHAVIOUR -> MUST inherit
      2. a Tablet sibling whose base is CONTENT-BEARING    -> MUST inherit too (the
         opposite guard from TIER 3.4's unit inheritance -- a device-tier sibling is
         the SAME content at a different tier, not a bare unit)
      3. a Mobile sibling whose base is itself unclassified -> MUST NOT inherit
         (nothing to inherit)
      4. a Mobile sibling with NO base attr at all          -> MUST NOT inherit
      5. a Mobile sibling that ALREADY has a role           -> MUST NOT be overwritten
      6. a non-breakpoint attr                              -> MUST be untouched
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT)"
    )
    conn.execute("CREATE TABLE modifier_suffixes (suffix TEXT, kind TEXT)")
    conn.executemany(
        "INSERT INTO modifier_suffixes (suffix, kind) VALUES (?,?)",
        [("Mobile", "breakpoint"), ("Tablet", "breakpoint"), ("Desktop", "breakpoint")],
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role) VALUES (?,?,?,?)",
        [
            (1, "sgs/plant", "gap", "layout"),
            (2, "sgs/plant", "gapMobile", None),
            (3, "sgs/plant", "avatarMedia", "image-object"),
            (4, "sgs/plant", "avatarMediaTablet", None),
            (5, "sgs/plant", "mystery", None),
            (6, "sgs/plant", "mysteryMobile", None),
            (7, "sgs/plant", "orphanMobile", None),
            (8, "sgs/plant", "thicknessMobile", "typography"),
            (9, "sgs/plant", "thickness", "layout"),
            (10, "sgs/plant", "plainAttr", None),
        ],
    )
    conn.commit()

    cur = conn.cursor()
    bp_suffixes = sorted(
        (s for s, k in conn.execute("SELECT suffix, kind FROM modifier_suffixes").fetchall()
         if k == "breakpoint"),
        key=len, reverse=True,
    )
    claimed = 0
    for row_id, block_slug, attr_name in conn.execute(
        "SELECT id, block_slug, attr_name FROM block_attributes WHERE role IS NULL"
    ).fetchall():
        base = None
        for sfx in bp_suffixes:
            if attr_name.endswith(sfx) and len(attr_name) > len(sfx):
                base = attr_name[: -len(sfx)]
                break
        if not base:
            continue
        base_row = conn.execute(
            "SELECT role FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, base),
        ).fetchone()
        if not base_row or base_row[0] is None:
            continue
        cur.execute("UPDATE block_attributes SET role = ? WHERE id = ?", (base_row[0], row_id))
        claimed += 1
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if claimed == 0:
        failures.append("breakpoint inheritance claimed ZERO rows against a planted set "
                        "-- it cannot fire, so it proves nothing")
    if got.get("gapMobile") != "layout":
        failures.append(f"gapMobile -> {got.get('gapMobile')!r}, expected 'layout' "
                        "inherited from its base")
    if got.get("avatarMediaTablet") != "image-object":
        failures.append(
            f"avatarMediaTablet -> {got.get('avatarMediaTablet')!r}: did NOT inherit a "
            "CONTENT-bearing base role. Unlike TIER 3.4's unit inheritance, a "
            "breakpoint sibling IS the same content at a different tier and MUST "
            "inherit a content-bearing base."
        )
    if got.get("mysteryMobile") is not None:
        failures.append(f"mysteryMobile -> {got.get('mysteryMobile')!r}: inherited from "
                        "an UNCLASSIFIED base. Two unknowns are not a classification.")
    if got.get("orphanMobile") is not None:
        failures.append(f"orphanMobile -> {got.get('orphanMobile')!r}: claimed with no "
                        "base attr present at all.")
    if got.get("thicknessMobile") != "typography":
        failures.append(
            f"thicknessMobile -> {got.get('thicknessMobile')!r}: an EXISTING role was "
            "overwritten. This row proves the `role IS NULL` guard."
        )
    if got.get("plainAttr") is not None:
        failures.append(f"plainAttr -> {got.get('plainAttr')!r}: a non-breakpoint attr "
                        "was claimed.")
    conn.close()

    if failures:
        print(f"BREAKPOINT-INHERITANCE SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"BREAKPOINT-INHERITANCE SELF-TEST PASSED -- {claimed} rows claimed, 6 checks green.")
    return 0


def link_template_is_seedable(sig_json: "str | None") -> bool:
    """TIER 3.45's gate: may this output_signature earn role `link-content`?

    THE RULE IS THE CONSUMER'S OWN CONTRACT, not a second opinion about it.
    ``services/field_extractors.extract_link_fragment`` fails closed unless the
    template holds EXACTLY ONE ``{value}`` placeholder (field_extractors.py:263).
    Seeding a role the extractor would then refuse produces a row that carries a
    role and does nothing -- the precise failure Task A5 existed to repair -- so
    the seeder applies the identical test and the two agree by construction.

    Module-level and shared with the tier itself so the self-test drives the REAL
    gate rather than a paraphrase of it (this file's own standard, D499).
    """
    if not sig_json:
        return False
    try:
        signature = json.loads(sig_json)
    except (ValueError, TypeError):
        return False
    if not isinstance(signature, dict):
        return False
    template = signature.get("link_template")
    return isinstance(template, str) and template.count("{value}") == 1


def _self_test_link_fragment_tier() -> int:
    """Prove TIER 3.45 can FAIL. Drives the real gate (link_template_is_seedable).

    Planted shapes, each a real failure mode rather than a variation on the happy path:
      1. one {value}                  -> seedable   (the sgs/whatsapp-cta shape)
      2. ZERO {value}                 -> refused    (nothing to recover)
      3. TWO {value}                  -> refused    (extract_link_fragment's own gate:
                                                     the split is ambiguous)
      4. no link_template key at all   -> refused
      5. malformed JSON                -> refused, not raised (a crash here would abort
                                          the whole reseed)
      6. link_template present but NULL -> refused
    Returns 0 on pass, 1 on fail.
    """
    cases = [
        ('{"link_template":"https://wa.me/{value}"}', True, "single placeholder"),
        ('{"link_template":"https://wa.me/"}', False, "zero placeholders"),
        ('{"link_template":"https://x/{value}/{value}"}', False, "two placeholders"),
        ('{"type":"php-render"}', False, "no link_template key"),
        ("{not json", False, "malformed JSON must not raise"),
        ('{"link_template":null}', False, "null template"),
        (None, False, "no signature at all"),
    ]
    failures = []
    for sig, want, why in cases:
        got = link_template_is_seedable(sig)
        if got is not want:
            failures.append(f"{why}: got {got}, expected {want} (sig={sig!r})")

    if failures:
        print(f"SELF-TEST FAILED (link-fragment tier) — {len(failures)} of {len(cases)}")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"SELF-TEST PASSED (link-fragment tier) — {len(cases)} checks green.")
    return 0


def _self_test_enum_backstop() -> int:
    """Prove the TIER 3.5 enum backstop can FAIL, on a throwaway in-memory DB.

    Planted rows:
      1. an enum row with role NULL      -> MUST be claimed as 'enum-mode'
      2. an enum row that already has a CONTENT role -> MUST NOT be overwritten (the
         real sgs/* rows of this shape are the link-href and identity enum attrs)
      3. a row with NO enum              -> MUST NOT be claimed
      4. an empty-list / 'null' enum     -> MUST NOT be claimed (seeded as a literal by
         a block.json declaring `"enum": []`; it names no choices, so it is no evidence)
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, enum_values TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, enum_values) "
        "VALUES (?,?,?,?,?)",
        [
            (1, "sgs/plant", "plantedEnum", None, '["a", "b"]'),
            (2, "sgs/plant", "plantedContentEnum", "link-href", '["a", "b"]'),
            (3, "sgs/plant", "plantedNoEnum", None, None),
            (4, "sgs/plant", "plantedEmptyEnum", None, "[]"),
        ],
    )
    conn.commit()

    cur = conn.cursor()
    claimed = 0
    for (row_id,) in conn.execute(
        "SELECT id FROM block_attributes "
        "WHERE role IS NULL AND enum_values IS NOT NULL "
        "AND enum_values NOT IN ('', '[]', 'null')"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'enum-mode' WHERE id = ?", (row_id,)
        )
        claimed += 1
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if claimed == 0:
        failures.append("enum backstop claimed ZERO rows against a planted set -- it "
                        "cannot fire, so it proves nothing")
    if got.get("plantedEnum") != "enum-mode":
        failures.append(f"plantedEnum -> {got.get('plantedEnum')!r}, expected 'enum-mode'. "
                        "NOTE: 'select-from-enum' is the WRONG answer here and this check "
                        "exists to say so -- that role promises the value IS a CSS value and "
                        "is wired into _kind_for() + the BEM-modifier probe.")
    if got.get("plantedContentEnum") != "link-href":
        failures.append(
            f"plantedContentEnum -> {got.get('plantedContentEnum')!r}: the backstop "
            "OVERWROTE a content role on an enum row. This is the row that proves the "
            "`role IS NULL` guard -- content-bearing enum attrs exist on sgs/* today."
        )
    if got.get("plantedNoEnum") is not None:
        failures.append(f"plantedNoEnum -> {got.get('plantedNoEnum')!r}: a row with no "
                        "enum was claimed. The enum IS the evidence.")
    if got.get("plantedEmptyEnum") is not None:
        failures.append(f"plantedEmptyEnum -> {got.get('plantedEmptyEnum')!r}: an EMPTY "
                        "enum was treated as evidence. It names no choices.")
    conn.close()

    if failures:
        print(f"ENUM-BACKSTOP SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"ENUM-BACKSTOP SELF-TEST PASSED -- {claimed} rows claimed, 4 checks green.")
    return 0


def _self_test_companion_tier() -> int:
    """Prove the TIER 0A image<->alt companion pass can FAIL, on a throwaway
    in-memory DB. Drives `_apply_companion_pairs()` directly with a synthetic pairs
    list -- Detector 5 itself is never invoked, so this proves the WRITE discipline
    (fill-NULL roles, single-writer companion column, conflict reporting), not the
    detector's own parsing (that is Detector 5's own `--self-test`, 6/6 green).

    Six planted rows, four fixture SHAPES, each one a way this tier could be wrong:
      1. a pair that MUST be claimed (both rows NULL) -- proves the tier can act.
      2. an alt row that ALREADY has a role -- MUST NOT be overwritten. Its companion
         image attr also already carries a DIFFERENT role ('link-href') -- proves the
         image-side `role IS NULL` guard too, in the same fixture. This is the row
         that ONLY the `if image_role is None` / `if alt_role is None` guards
         protect: strip either guard and this row's role flips, exactly the negative
         control shape `_self_test_styling_backstop`'s row 5 comment describes --
         without a row whose PRE-EXISTING role differs from what this tier would
         write, removing the guard is undetectable (a row that was already going to
         end up NULL either way proves nothing).
      3. a row with no derived pair referencing it -- MUST NOT be touched at all.
      4. a companion-column CONFLICT: an alt row whose `alt_companion_attr` already
         names a DIFFERENT image attr than the one this pair derives, with role
         itself still NULL. The role fill still applies (it is an independent fact,
         governed only by the role-NULL guard proven in fixture 2) but the
         alt_companion_attr value MUST NOT be overwritten, and MUST be counted as a
         conflict.
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, role TEXT, alt_companion_attr TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, role, alt_companion_attr) "
        "VALUES (?,?,?,?,?)",
        [
            # 1. MUST be claimed: both sides NULL.
            (1, "sgs/plant", "imageUrl", None, None),
            (2, "sgs/plant", "imageAlt", None, None),
            # 2. MUST NOT be overwritten on EITHER side -- both already carry a role
            #    that differs from what this tier would write. This is the row that
            #    ONLY the `role IS NULL` guards protect.
            (3, "sgs/plant2", "weirdUrl", "link-href", None),
            (4, "sgs/plant2", "weirdAlt", "text-content", None),
            # 3. No derived pair references this row -- MUST NOT be touched.
            (5, "sgs/plant3", "unrelatedAttr", None, None),
            # 4. Companion-column CONFLICT: alt_companion_attr already names a
            #    DIFFERENT image attr than the one this pair would derive.
            (6, "sgs/plant4", "logoAlt", None, "someOtherImageAttr"),
        ],
    )
    conn.commit()

    pairs = [
        {"block_slug": "sgs/plant", "image_attr": "imageUrl", "alt_attr": "imageAlt",
         "evidence_shape": "test"},
        {"block_slug": "sgs/plant2", "image_attr": "weirdUrl", "alt_attr": "weirdAlt",
         "evidence_shape": "test"},
        {"block_slug": "sgs/plant4", "image_attr": "logoUrl", "alt_attr": "logoAlt",
         "evidence_shape": "test"},
    ]
    result = _apply_companion_pairs(conn, pairs)

    got_role = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    got_companion = dict(
        conn.execute("SELECT attr_name, alt_companion_attr FROM block_attributes").fetchall()
    )
    failures = []

    if result["image_filled"] == 0 or result["alt_filled"] == 0:
        failures.append(
            f"tier claimed ZERO rows against a planted pair (image_filled="
            f"{result['image_filled']}, alt_filled={result['alt_filled']}) -- it "
            "cannot fail, so it proves nothing"
        )
    if got_role.get("imageUrl") != "image-object":
        failures.append(f"imageUrl -> {got_role.get('imageUrl')!r}, expected 'image-object'")
    if got_role.get("imageAlt") != "image-alt":
        failures.append(f"imageAlt -> {got_role.get('imageAlt')!r}, expected 'image-alt'")
    if got_companion.get("imageAlt") != "imageUrl":
        failures.append(
            f"imageAlt.alt_companion_attr -> {got_companion.get('imageAlt')!r}, "
            "expected 'imageUrl'"
        )

    if got_role.get("weirdUrl") != "link-href":
        failures.append(
            f"weirdUrl -> {got_role.get('weirdUrl')!r}: the tier overwrote an EXISTING "
            "role on the IMAGE side of a pair. This is the row that proves the "
            "image-side `role IS NULL` guard -- without it, its removal is undetectable."
        )
    if got_role.get("weirdAlt") != "text-content":
        failures.append(
            f"weirdAlt -> {got_role.get('weirdAlt')!r}: the tier overwrote an EXISTING "
            "role on the ALT side of a pair. This is the row that proves the "
            "alt-side `role IS NULL` guard -- without it, its removal is undetectable."
        )
    # Even though the role was left alone, the companion column is a SEPARATE fact
    # with its own single-writer rule -- it must still be filled since it was NULL.
    if got_companion.get("weirdAlt") != "weirdUrl":
        failures.append(
            f"weirdAlt.alt_companion_attr -> {got_companion.get('weirdAlt')!r}, "
            "expected 'weirdUrl' -- the companion column is a different fact from "
            "role and must be filled independently of whether role was overwritable"
        )

    if got_role.get("unrelatedAttr") is not None:
        failures.append(
            f"unrelatedAttr -> {got_role.get('unrelatedAttr')!r}: a row with NO "
            "derived pair referencing it was touched."
        )

    if got_role.get("logoAlt") != "image-alt":
        failures.append(
            f"logoAlt -> {got_role.get('logoAlt')!r}, expected 'image-alt' -- role "
            "was NULL going in, so the fill-NULL rule still applies here even though "
            "the companion COLUMN (a separate fact, tested below) is in conflict"
        )
    if got_companion.get("logoAlt") != "someOtherImageAttr":
        failures.append(
            f"logoAlt.alt_companion_attr -> {got_companion.get('logoAlt')!r}: a "
            "DIFFERING pre-existing alt_companion_attr value was overwritten instead "
            "of being left alone and reported as a conflict."
        )
    if result["companion_conflicts"] != 1:
        failures.append(
            f"companion_conflicts -> {result['companion_conflicts']}, expected 1 "
            "(the logoAlt/someOtherImageAttr vs logoUrl mismatch)"
        )

    conn.close()

    if failures:
        print(f"COMPANION-TIER SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        f"COMPANION-TIER SELF-TEST PASSED -- image_filled={result['image_filled']} "
        f"alt_filled={result['alt_filled']} companion_filled={result['companion_filled']} "
        f"conflicts={result['companion_conflicts']}, 10 checks green."
    )
    return 0


def _sweep_boolean_content_roles(conn: sqlite3.Connection) -> int:
    """TIER 3.6's write logic. Reclassify every BOOLEAN attr carrying a content-bearing
    role to 'boolean-visibility'. Returns the number of rows swept.

    Factored out (rather than inlined like the older sibling tiers) so the self-test drives
    THIS function instead of re-implementing its query. The re-implementing style the other
    self-tests in this file use cannot detect production/test drift: the fixture keeps
    passing while the real query changes underneath it. The companion tier established the
    better pattern in this same module; this follows it.

    Content-bearing-ness comes from the `roles` table's own classification column (R-31-1),
    never a hardcoded role list that could drift from it.
    """
    cur = conn.cursor()
    swept = 0
    for row_id, slug, attr, bad_role in conn.execute(
        "SELECT ba.id, ba.block_slug, ba.attr_name, ba.role "
        "FROM block_attributes ba JOIN roles r ON r.role_name = ba.role "
        "WHERE ba.attr_type = 'boolean' AND r.classification = 'content-bearing'"
    ).fetchall():
        cur.execute(
            "UPDATE block_attributes SET role = 'boolean-visibility' WHERE id = ?", (row_id,)
        )
        print(
            f"  [boolean-sweep] {slug}.{attr}: role {bad_role!r} -> 'boolean-visibility' "
            "(a boolean cannot be content)"
        )
        swept += 1
    return swept


def _self_test_boolean_sweep() -> int:
    """Prove the TIER 3.6 boolean content-role sweep can FAIL, on a throwaway in-memory DB.

    Planted rows, each one a way the sweep could be wrong:
      1. boolean + content-bearing role  -> MUST be swept to 'boolean-visibility'
      2. boolean + STYLING role          -> MUST NOT be touched (only content is impossible
         on a boolean; a boolean legitimately carries styling/behaviour roles, and several
         real ones carry an `anim:`/`fx:` css_property)
      3. STRING + content-bearing role   -> MUST NOT be touched. This is the row that only
         the `attr_type = 'boolean'` guard protects: drop that guard and the sweep would
         wipe every genuine content role in the database.
      4. boolean + NULL role             -> MUST stay NULL. The sweep RECLASSIFIES a wrong
         role; it never claims an unreached row (NULL means "no mechanism reached this",
         D497) .
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, attr_type TEXT, role TEXT)"
    )
    conn.execute("CREATE TABLE roles (role_name TEXT, classification TEXT)")
    conn.executemany(
        "INSERT INTO roles (role_name, classification) VALUES (?,?)",
        [("text-content", "content-bearing"), ("image-object", "content-bearing"),
         ("styling", "styling-behaviour"), ("boolean-visibility", "styling-behaviour")],
    )
    conn.executemany(
        "INSERT INTO block_attributes (id, block_slug, attr_name, attr_type, role) "
        "VALUES (?,?,?,?,?)",
        [
            (1, "sgs/plant", "showTitle", "boolean", "text-content"),
            (2, "sgs/plant", "showImage", "boolean", "image-object"),
            (3, "sgs/plant", "bgParallax", "boolean", "styling"),
            (4, "sgs/plant", "headline", "string", "text-content"),
            (5, "sgs/plant", "untouched", "boolean", None),
        ],
    )
    conn.commit()

    # Drives the PRODUCTION function, not a copy of its query — so this fixture cannot
    # pass while the real sweep drifts underneath it.
    swept = _sweep_boolean_content_roles(conn)
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if swept == 0:
        failures.append("sweep claimed ZERO rows against a planted set -- it cannot fire, "
                        "so it proves nothing")
    for name in ("showTitle", "showImage"):
        if got.get(name) != "boolean-visibility":
            failures.append(
                f"{name} -> {got.get(name)!r}: a BOOLEAN carrying a content-bearing role "
                "was not swept. That row is liftable by the content walk."
            )
    if got.get("bgParallax") != "styling":
        failures.append(f"bgParallax -> {got.get('bgParallax')!r}: a boolean with a "
                        "STYLING role was swept. Only content roles are impossible here.")
    if got.get("headline") != "text-content":
        failures.append(
            f"headline -> {got.get('headline')!r}: a STRING content role was swept. This is "
            "the row that proves the attr_type guard -- without it this sweep would wipe "
            "every genuine content role in the DB."
        )
    if got.get("untouched") is not None:
        failures.append(f"untouched -> {got.get('untouched')!r}: an unreached (NULL) row "
                        "was claimed. The sweep reclassifies; it never claims NULL.")
    conn.close()

    if failures:
        print(f"BOOLEAN-SWEEP SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"BOOLEAN-SWEEP SELF-TEST PASSED -- {swept} rows swept, 5 checks green.")
    return 0


def _load_role_type_exclusions(path: Path = _ROLES_JSON_PATH) -> dict[str, frozenset[str]]:
    """Load ``{role_name: frozenset(excluded_attr_type, ...)}`` from roles.json's optional
    3rd array element -- ``{"excludes_attr_types": [...], "excludes_reason": "..."}``.

    A role with no 3rd element, or whose 3rd element carries no `excludes_attr_types` key, is
    PERMISSIVE by construction (absent from the returned dict) -- exactly the "leave it
    permissive" instruction for a role whose contract is ambiguous about a given attr_type.
    This function only ever NARROWS what TIER 3.7 touches; it can never invent a restriction
    the data file does not state.

    Soft-fails to ``{}`` on a missing/unreadable file, matching db_lookup.py's
    `_load_roles_seed()` soft-fail contract -- a degraded run should skip TIER 3.7 rather than
    crash the whole assignment pass over a walked-away data file.
    """
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    out: dict[str, frozenset[str]] = {}
    for name, val in raw.items():
        if name.startswith("__") or not isinstance(val, list) or len(val) < 3:
            continue
        extra = val[2]
        if not isinstance(extra, dict):
            continue
        excluded = extra.get("excludes_attr_types")
        if excluded:
            out[name] = frozenset(excluded)
    return out


def _sweep_incompatible_role_types(conn: sqlite3.Connection) -> dict:
    """TIER 3.7's write logic. Reclassify a row whose `attr_type` violates its role's own
    documented value-shape contract (roles.json `excludes_attr_types`, loaded fresh from the
    file every call -- never cached -- so an edit to roles.json takes effect without a code
    change, same contract `_sweep_boolean_content_roles` gets from the `roles` table).

    Two proven-safe reclassification targets, chosen by evidence ALREADY ON the row
    (attr_type + css_property), never by block/attr name (R-31-9):
      - attr_type='boolean' AND css_property IS NOT NULL -> 'css-gate' (a real CSS input
        signal exists; 'boolean-visibility' would misdocument it as absent).
      - attr_type='boolean' AND css_property IS NULL     -> 'boolean-visibility' (no CSS
        signal; matches TIER 3.6's own target for the sibling defect class).
      - Anything else excluded (non-boolean attr_type, or a future exclusion this tier has no
        target for) is left UNTOUCHED and only counted under 'unhandled' -- guessing a target
        without evidence would risk destroying a correct classification.

    Returns {"to_css_gate": int, "to_boolean_visibility": int, "unhandled": int}.
    """
    exclusions = _load_role_type_exclusions()
    cur = conn.cursor()
    to_css_gate = 0
    to_boolean_visibility = 0
    unhandled = 0
    for role, bad_types in exclusions.items():
        placeholders = ",".join("?" for _ in bad_types)
        for row_id, slug, attr, attr_type, css_property in conn.execute(
            "SELECT id, block_slug, attr_name, attr_type, css_property "
            f"FROM block_attributes WHERE role = ? AND attr_type IN ({placeholders})",
            (role, *bad_types),
        ).fetchall():
            if attr_type == "boolean" and css_property is not None:
                new_role = "css-gate"
                to_css_gate += 1
            elif attr_type == "boolean":
                new_role = "boolean-visibility"
                to_boolean_visibility += 1
            else:
                unhandled += 1
                print(
                    f"  [type-sweep] {slug}.{attr}: role {role!r} excludes attr_type "
                    f"{attr_type!r} but TIER 3.7 has no proven safe target for a non-boolean "
                    "mismatch -- left UNTOUCHED, reported only."
                )
                continue
            cur.execute("UPDATE block_attributes SET role = ? WHERE id = ?", (new_role, row_id))
            print(
                f"  [type-sweep] {slug}.{attr}: role {role!r} incompatible with attr_type "
                f"{attr_type!r} -> {new_role!r}"
                + (" (css_property preserved, input-routing signal)" if new_role == "css-gate" else "")
            )
    return {
        "to_css_gate": to_css_gate,
        "to_boolean_visibility": to_boolean_visibility,
        "unhandled": unhandled,
    }


def _self_test_type_sweep() -> int:
    """Prove the TIER 3.7 role/attr_type compatibility sweep can FAIL, on a throwaway
    in-memory DB. Drives `_sweep_incompatible_role_types()` directly -- not a re-implemented
    copy of its query -- following the pattern `_sweep_boolean_content_roles`/
    `_self_test_boolean_sweep` established (production/test drift only shows up when the
    self-test calls the real function).

    Loads the REAL roles.json exclusions (this tier's actual production data source), so this
    test also catches an accidental exclusion edit breaking a live row -- it is not a fixture
    isolated from the data file.

    Planted rows, each one a way the sweep could be wrong:
      1. select-from-enum + boolean + css_property SET   -> MUST become 'css-gate' (the
         imageZoomHover/grayscaleHover shape: a real input-routing signal exists).
      2. select-from-enum + boolean + css_property NULL  -> MUST become 'boolean-visibility'
         (the evergreenMode shape: no CSS signal at all).
      3. colour-gradient + boolean + css_property NULL   -> MUST become 'boolean-visibility'
         (the overlayGradient shape).
      4. select-from-enum + STRING                       -> MUST NOT be touched. This is the
         row ONLY the compatibility judgement protects -- select-from-enum's contract legitimately
         admits a string CSS value; the exclusion names 'boolean' only, never 'string'.
      5. select-from-enum + NUMBER                        -> MUST NOT be touched. A second
         legitimate pairing (numeric CSS enum, e.g. font-weight steps) proven live today
         (19 real rows) -- proves the exclusion is narrow, not "boolean is bad" dressed up.
      6. behaviour + boolean                              -> MUST NOT be touched. 'behaviour'
         carries NO excludes_attr_types entry in roles.json (Bean ruled it a legitimate
         boolean pairing) -- this is the row that proves TIER 3.7 does not invent restrictions
         roles.json never stated.
      7. layout + boolean                                 -> MUST NOT be touched. Same proof
         as #6 for a second legitimate-boolean role.
    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes "
        "(id, block_slug, attr_name, attr_type, role, css_property) VALUES (?,?,?,?,?,?)",
        [
            (1, "sgs/card-grid", "imageZoomHover", "boolean", "select-from-enum", "transform"),
            (2, "sgs/countdown-timer", "evergreenMode", "boolean", "select-from-enum", None),
            (3, "sgs/container", "overlayGradient", "boolean", "colour-gradient", None),
            (4, "sgs/heading", "fontStyle", "string", "select-from-enum", None),
            (5, "sgs/heading", "fontWeight", "number", "select-from-enum", None),
            (6, "sgs/product-card", "ctaStyle", "boolean", "behaviour", None),
            (7, "sgs/hero", "stackOnMobile", "boolean", "layout", None),
        ],
    )
    conn.commit()

    # Drives the PRODUCTION function against the REAL roles.json -- not a copy of its query
    # or a fixture of its exclusion data.
    result = _sweep_incompatible_role_types(conn)
    conn.commit()

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if got.get("imageZoomHover") != "css-gate":
        failures.append(
            f"imageZoomHover -> {got.get('imageZoomHover')!r}: a boolean with a css_property "
            "(real input-routing signal) was not routed to 'css-gate'."
        )
    if got.get("evergreenMode") != "boolean-visibility":
        failures.append(
            f"evergreenMode -> {got.get('evergreenMode')!r}: a boolean with NO css_property "
            "was not routed to 'boolean-visibility'."
        )
    if got.get("overlayGradient") != "boolean-visibility":
        failures.append(
            f"overlayGradient -> {got.get('overlayGradient')!r}: a colour-gradient boolean "
            "with no css_property was not routed to 'boolean-visibility'."
        )
    if got.get("fontStyle") != "select-from-enum":
        failures.append(
            f"fontStyle -> {got.get('fontStyle')!r}: a STRING carrying select-from-enum was "
            "touched. select-from-enum's contract legitimately admits a string CSS value -- "
            "only 'boolean' is excluded."
        )
    if got.get("fontWeight") != "select-from-enum":
        failures.append(
            f"fontWeight -> {got.get('fontWeight')!r}: a NUMBER carrying select-from-enum was "
            "touched. This is the row that proves the exclusion is narrow, not a blanket "
            "'select-from-enum is broken' sweep -- 19 real number rows depend on this."
        )
    if got.get("ctaStyle") != "behaviour":
        failures.append(
            f"ctaStyle -> {got.get('ctaStyle')!r}: a legitimate boolean+'behaviour' pairing "
            "was touched. 'behaviour' carries no excludes_attr_types in roles.json -- this "
            "row proves the sweep invents no restriction the data file doesn't state."
        )
    if got.get("stackOnMobile") != "layout":
        failures.append(
            f"stackOnMobile -> {got.get('stackOnMobile')!r}: a legitimate boolean+'layout' "
            "pairing was touched."
        )
    if result["to_css_gate"] != 1:
        failures.append(f"to_css_gate={result['to_css_gate']}, expected 1")
    if result["to_boolean_visibility"] != 2:
        failures.append(f"to_boolean_visibility={result['to_boolean_visibility']}, expected 2")
    conn.close()

    if failures:
        print(f"TYPE-SWEEP SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "TYPE-SWEEP SELF-TEST PASSED -- "
        f"to_css_gate={result['to_css_gate']} "
        f"to_boolean_visibility={result['to_boolean_visibility']} "
        f"unhandled={result['unhandled']}, 9 checks green."
    )
    return 0


def _self_test_suffix_role_revive() -> int:
    """Prove the `refresh_stale_suffix_roles` REVIVE path (D497 follow-up, 2026-08-05)
    can FAIL, on a throwaway in-memory DB. Drives the PRODUCTION function directly --
    not a re-implementation of its query -- following the pattern
    `_sweep_boolean_content_roles`/`_self_test_boolean_sweep` established, because the
    older re-implementing self-tests in this file cannot catch production/test drift.

    THE DEFECT THIS GUARDS: a row whose `canonical_slot` survives a role-clearing
    operation (e.g. clearing a hand override for reseed) is invisible to the main
    `run()` loop (`WHERE canonical_slot IS NULL`) AND, before this fix, invisible to
    this healer too (`WHERE role IS NOT NULL`). It reaches
    `apply_role_detection_inline()` still NULL, and TIER 3 (the generic `styling`
    backstop) claims ANY still-NULL row with a `css_property` before a suffix-derived
    family role ever gets a chance. Measured live: 53 rows degraded to `styling`, 18
    left NULL, across 172 cleared override-adjacent rows.

    Five planted rows, each one a way the fix could be wrong:
      1. role=NULL, canonical_slot SET, suffix resolves to a SPECIFIC family role
         -> MUST be revived to that role (the exact degrading shape above).
      2. role=NULL, canonical_slot SET, attr name has NO property-suffix match
         -> MUST stay NULL. Proves revive does not overreach into rows a LATER
         tier (TIER 0A / structural / name-regex / TIER 3) is meant to resolve --
         if this negative control breaks, revive has started guessing.
      3. role already POPULATED and content-bearing (graduated)
         -> MUST be preserved untouched, regardless of what the suffix peel would
         compute. Proves revive cannot regress the pre-existing HEAL/PRESERVE
         behaviour for rows that already carry a role.
      4. role already POPULATED, stale, non-graduated, suffix disagrees
         -> MUST be healed to the current suffix role (the ORIGINAL 2026-08-01
         behaviour). Proves the widened WHERE clause did not break the existing
         HEAL path for already-populated rows.
      5. canonical_slot IS NULL (main-loop territory)
         -> MUST NOT be considered at all by this pass, role stays exactly as
         planted. Proves the pass still respects the `canonical_slot IS NOT NULL`
         boundary that keeps it from colliding with `run()`'s own loop.

    Returns 0 on pass, 1 on fail.
    """
    import sqlite3 as _sq
    conn = _sq.connect(":memory:")
    conn.row_factory = _sq.Row
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, block_slug TEXT, "
        "attr_name TEXT, attr_type TEXT, role TEXT, canonical_slot TEXT)"
    )
    conn.execute("CREATE TABLE roles (role_name TEXT, classification TEXT)")
    conn.executemany(
        "INSERT INTO roles (role_name, classification) VALUES (?,?)",
        [("text-content", "content-bearing"), ("typography", "styling-behaviour"),
         ("color", "styling-behaviour"), ("styling", "styling-behaviour")],
    )
    conn.executemany(
        "INSERT INTO block_attributes "
        "(id, block_slug, attr_name, attr_type, role, canonical_slot) VALUES (?,?,?,?,?,?)",
        [
            # 1. the degrading shape: NULL role, canonical_slot survives, suffix
            #    resolves to a specific family role -- must be REVIVED, not left for
            #    TIER 3's generic 'styling' backstop.
            (1, "sgs/plant", "ratingSize", "number", None, "rating"),
            # 2. NULL role, canonical_slot survives, no suffix match -- must stay
            #    NULL for a later tier to resolve.
            (2, "sgs/plant", "logoAlt", "string", None, "logo"),
            # 3. already-populated content-bearing role -- must be preserved
            #    untouched even though its own suffix ("Size") would compute
            #    'typography' if this guard were missing.
            (3, "sgs/plant", "ratingTextSize", "string", "text-content", "rating"),
            # 4. already-populated, stale, non-graduated role -- original HEAL
            #    behaviour must still fire.
            (4, "sgs/plant", "borderColour", "string", "typography", "border"),
            # 5. canonical_slot NULL -- outside this pass's scope entirely.
            (5, "sgs/plant", "unprocessedRatingSize", "number", None, None),
        ],
    )
    conn.commit()

    property_suffixes = {
        "Size": {"role": "typography", "css_property": "font-size"},
        "Colour": {"role": "color", "css_property": "color"},
    }
    modifier_map: dict[str, str] = {}

    # Drives the PRODUCTION function, not a copy of its query.
    result = refresh_stale_suffix_roles(conn, property_suffixes, modifier_map)

    got = dict(conn.execute("SELECT attr_name, role FROM block_attributes").fetchall())
    failures = []
    if result.get("revived", 0) == 0:
        failures.append("revived count is ZERO against a planted revivable row -- the "
                        "REVIVE path cannot fire, so it proves nothing")
    if got.get("ratingSize") != "typography":
        failures.append(
            f"ratingSize -> {got.get('ratingSize')!r}, expected 'typography': a "
            "suffix-derived family role on a NULL-role row with a surviving "
            "canonical_slot was not revived. This is the exact shape TIER 3 would "
            "otherwise degrade to the generic 'styling' backstop."
        )
    if got.get("logoAlt") is not None:
        failures.append(
            f"logoAlt -> {got.get('logoAlt')!r}, expected None: revive claimed a row "
            "with no property-suffix match. That row belongs to a LATER tier "
            "(TIER 0A / structural / name-regex / TIER 3) -- revive has overreached."
        )
    if got.get("ratingTextSize") != "text-content":
        failures.append(
            f"ratingTextSize -> {got.get('ratingTextSize')!r}, expected 'text-content': "
            "a graduated content-bearing role was overwritten by the suffix peel."
        )
    if got.get("borderColour") != "color":
        failures.append(
            f"borderColour -> {got.get('borderColour')!r}, expected 'color': the "
            "original 2026-08-01 HEAL behaviour (stale, non-graduated role healed "
            "against the current suffix table) regressed."
        )
    if got.get("unprocessedRatingSize") is not None:
        failures.append(
            f"unprocessedRatingSize -> {got.get('unprocessedRatingSize')!r}, expected "
            "None: a row with canonical_slot IS NULL was considered by this pass -- "
            "it collides with run()'s own loop scope."
        )
    conn.close()

    if failures:
        print(f"SUFFIX-ROLE-REVIVE SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        f"SUFFIX-ROLE-REVIVE SELF-TEST PASSED -- considered={result['considered']} "
        f"healed={result['healed']} revived={result['revived']}, 5 checks green."
    )
    return 0


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
        sys.exit(_self_test_role_detection() or _self_test_styling_backstop()
                 or _self_test_technical_veto() or _self_test_unit_inheritance()
                 or _self_test_breakpoint_inheritance()
                 or _self_test_enum_backstop() or _self_test_companion_tier()
                 or _self_test_boolean_sweep() or _self_test_suffix_role_revive()
                 or _self_test_type_sweep() or _self_test_wrapper_styling_tier()
                 or _self_test_link_fragment_tier()
                 or _self_test_styling_upgrade()
                 or _self_test_icon_family_correction()
                 or _self_test_fx_styling_correction()
                 or _self_test_native_wp_seed()
                 or _self_test_boolean_visibility_backstop())
    main()
