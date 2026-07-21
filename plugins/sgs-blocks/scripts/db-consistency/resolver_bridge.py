"""resolver_bridge.py — reuse the REAL resolver derivation for F6 checks.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §1 (check #1 + #3)
          R-22-1: reuse, do NOT hardcode a copy of the resolver constants.

The live resolver (`db_lookup.attr_for_property`) returns the FIRST match (rowid
order).  For F6 we enumerate ALL candidates — so we can detect ≥2 competing attrs
for the same (block, css_property, writer_path).

Two public functions
--------------------
enumerate_candidates(block_slug, conn)
    → dict keyed by (css_property, writer_path) → list[attr_name]
    All attrs the block declares that are derivable from property_suffixes,
    grouped by writer_path.  The live resolver returns only [0]; F6 keeps all.

lift_producible_attrs(block_slug, conn)
    → set[str]
    Union of all derived attr names (any writer_path) the block declares.
    "The CSS lift can populate any of these attrs for this block."
"""
from __future__ import annotations

import importlib.util
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Import _ATTR_NAME_OVERRIDES and _TYPOGRAPHY_CSS_SCOPE from the real module
# so they can never drift.  FAIL LOUDLY if unavailable.
# ---------------------------------------------------------------------------

# Repointed to converter/db/db_lookup.py (EXECUTION Step 10, 2026-07-04) — the
# canonical implementation moved there in Step 9; the old
# orchestrator/converter_v2/db_lookup.py path is now a re-export shim.
_DB_LOOKUP_PATH = (
    Path(__file__).resolve().parents[1]  # scripts/db-consistency/../ = scripts/
    / "converter"
    / "db"
    / "db_lookup.py"
)

if not _DB_LOOKUP_PATH.exists():
    raise ImportError(
        f"[resolver_bridge] Cannot find db_lookup.py at {_DB_LOOKUP_PATH}.\n"
        "The F6 suite requires the real resolver module to import its constants.\n"
        "Ensure plugins/sgs-blocks/scripts/converter/db/db_lookup.py exists."
    )

_spec = importlib.util.spec_from_file_location("db_lookup_real", str(_DB_LOOKUP_PATH))
_db_lookup_mod: Any = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
try:
    _spec.loader.exec_module(_db_lookup_mod)  # type: ignore[union-attr]
except Exception as exc:
    raise ImportError(
        f"[resolver_bridge] Failed to load db_lookup.py: {exc}\n"
        "Cannot continue — F6 requires the live resolver constants."
    ) from exc

# These must exist; raise loudly if a future refactor removes them.
if not hasattr(_db_lookup_mod, "_ATTR_NAME_OVERRIDES"):
    raise ImportError(
        "[resolver_bridge] db_lookup.py has no _ATTR_NAME_OVERRIDES symbol.\n"
        "The F6 suite imports this constant to mirror the resolver derivation (R-22-1).\n"
        "If the symbol was renamed, update resolver_bridge.py to match."
    )
if not hasattr(_db_lookup_mod, "_TYPOGRAPHY_CSS_SCOPE"):
    raise ImportError(
        "[resolver_bridge] db_lookup.py has no _TYPOGRAPHY_CSS_SCOPE symbol.\n"
        "The F6 suite imports this constant to mirror the resolver derivation (R-22-1).\n"
        "If the symbol was renamed, update resolver_bridge.py to match."
    )

_ATTR_NAME_OVERRIDES: dict[tuple[str, str], str] = _db_lookup_mod._ATTR_NAME_OVERRIDES
_TYPOGRAPHY_CSS_SCOPE: frozenset[str] = _db_lookup_mod._TYPOGRAPHY_CSS_SCOPE


# ---------------------------------------------------------------------------
# Core derivation (mirrors attr_for_property in db_lookup.py:1280-1392)
# ---------------------------------------------------------------------------

def _derive_attr_name(css_property: str, suffix: str) -> str | None:
    """Derive the candidate attr name for a (css_property, suffix) pair.

    Mirrors db_lookup.py:1352-1360 exactly.
    Returns None when suffix is empty (skip sentinel).
    """
    override_key = (css_property, suffix)
    if override_key in _ATTR_NAME_OVERRIDES:
        return _ATTR_NAME_OVERRIDES[override_key]
    if suffix:
        return suffix[0].lower() + suffix[1:]
    return None


def _writer_path(css_property: str) -> str:
    """Return 'typography' or 'wrapper_css' for a css_property.

    Mirrors db_lookup.py:1367-1371 exactly.
    """
    if css_property in _TYPOGRAPHY_CSS_SCOPE:
        return "typography"
    return "wrapper_css"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def enumerate_candidates(
    block_slug: str,
    conn: sqlite3.Connection,
) -> dict[tuple[str, str, "str | None", "str | None", "str | None"], list[str]]:
    """Return all derivable attrs for block, grouped by
    (css_property, writer_path, css_element, css_state, css_tier).

    For each css_property in property_suffixes, walks every suffix row
    (ORDER BY rowid — same priority as live resolver), derives the candidate
    attr name, and keeps those the block actually declares in block_attributes.

    The element/state/tier positions are None for suffix-derived candidates
    (property_suffixes carries no such dimensions — a genuine limitation of that
    table, not a value this function invents) and populated from
    `block_attributes.css_element/css_state/css_tier` for COLUMN-derived candidates
    (2026-07-21 — see the COLUMN-FIRST shadow section below). Widening this key was
    the fix for the 106/112 false "routing determinism" positives that fired once
    css_property was bulk-populated: e.g. sgs/trust-bar's iconColour/labelColour/
    textColour/titleColour all resolve to the SAME literal css_property ('color') but
    are FOUR DIFFERENT elements — under the old 2-tuple key they collapsed into one
    slot and looked like a genuine collision; under this 5-tuple key they are four
    distinct, non-colliding slots, because that is what they actually are.

    Returns
    -------
    dict[(css_property, writer_path, css_element, css_state, css_tier) -> list[attr_name]]
        The live resolver returns only the first element of each list.
        F6 check #1 flags any list with ≥2 entries (ambiguity).
    """
    # Gather all property_suffixes rows (non-None css_property only — None
    # rows are generic suffix templates with no specific CSS property).
    ps_rows = conn.execute(
        "SELECT css_property, suffix "
        "FROM property_suffixes "
        "WHERE css_property IS NOT NULL "
        "ORDER BY css_property, rowid",
    ).fetchall()

    # Gather this block's declared attrs as a set for O(1) membership.
    ba_rows = conn.execute(
        "SELECT attr_name FROM block_attributes WHERE block_slug = ?",
        (block_slug,),
    ).fetchall()
    declared: set[str] = {row[0] for row in ba_rows}

    result: dict[tuple[str, str, "str | None", "str | None", "str | None"], list[str]] = {}

    for css_property, suffix in ps_rows:
        attr_name = _derive_attr_name(css_property, suffix)
        if attr_name is None:
            continue
        if attr_name not in declared:
            continue
        wp = _writer_path(css_property)
        key = (css_property, wp, None, None, None)
        result.setdefault(key, []).append(attr_name)

    # COLUMN-FIRST shadow (declarative, FR-31-5.2/5.3, D281). A block that DECLARES
    # css_property on an attr (block_attributes.css_property) resolves via that attr
    # at runtime (db_lookup column-first-else-suffix), SHADOWING any suffix-derived
    # candidate for the same (css_property, writer_path, element, state, tier). Mirror
    # it here so F6's ambiguity view + the lift surface reflect what actually
    # resolves — else F6 would enumerate a shadowed suffix attr and misreport the
    # producer set. Two COLUMN attrs for one full key stay ≥2 = a REAL ambiguity F6
    # must flag (two attrs identical on EVERY axis genuinely still contend).
    try:
        col_rows = conn.execute(
            "SELECT css_property, attr_name, css_element, css_state, css_tier "
            "FROM block_attributes "
            "WHERE block_slug = ? AND css_property IS NOT NULL",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        col_rows = []  # css_property column absent (pre-seed DB) — nothing declared.
    col_by_key: dict[tuple[str, str, "str | None", "str | None", "str | None"], list[str]] = {}
    for css_property, attr_name, css_element, css_state, css_tier in col_rows:
        if attr_name not in declared:
            continue
        key = (css_property, _writer_path(css_property), css_element, css_state, css_tier)
        col_by_key.setdefault(key, []).append(attr_name)
    for key, attrs in col_by_key.items():
        result[key] = attrs  # column attrs shadow suffix-derived candidates

    return result


def lift_producible_attrs(
    block_slug: str,
    conn: sqlite3.Connection,
) -> set[str]:
    """Return the set of attr names the CSS lift can populate for block_slug.

    This is the union of all derived attr names (any writer_path) that the
    block declares AND that appear in property_suffixes.  Any attr in this
    set can be spuriously populated by generic draft CSS.

    Used by check_variants (#3) to flag discriminator slots that overlap
    with the lift surface.
    """
    candidates = enumerate_candidates(block_slug, conn)
    result: set[str] = set()
    for attrs in candidates.values():
        result.update(attrs)
    return result
