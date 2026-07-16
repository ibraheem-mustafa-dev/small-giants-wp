"""
Spec 19 Stage 9 — Drift Validator
====================================
Validates that every canonical value stored on `block_attributes` decomposes
into known vocabulary (slots.slot_name [scope='element'], property_suffixes.role,
modifier_suffixes.suffix). Surfaces violations where the data layer has
drifted away from the canonical vocabulary.

A violation is one of:
  - canonical_slot is set but is not in slot_synonyms.canonical_slot
  - role is set but is not in property_suffixes.role
  - derived_selector is set but does not start with `.sgs-` or
    `.wp-block-sgs-` (both forms are valid — `.sgs-` is the BEM root,
    `.wp-block-sgs-` is the WordPress-generated wrapper class)
  - attr_name has a trailing CamelCase modifier token (e.g. Foozle) that is
    NOT a known modifier_suffix (Mobile, Tablet, Desktop, Hover, etc.)

Reads only — never writes. Idempotent.

Usage:
    python validate.py                # report only; always exit 0
    python validate.py --strict       # exit 1 if any violations found

Output:
    Stdout — line per violation with block_slug.attr_name and reason.
    Final line is one of:
      "DRIFT-VALIDATOR: PASS (0 violations across N attrs)"
      "DRIFT-VALIDATOR: FAIL (V violations across N attrs)"

UK English in all comments and output.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)


import json
import re

# Trailing CamelCase token after the stem — e.g. `headingMobile` → `Mobile`.
_TRAILING_MODIFIER_RE = re.compile(r'([A-Z][a-z]+)$')

# Role taxonomy source — role-templates.json defines the dispatch table.
# Anything outside this set in block_attributes.role is drift.
_ROLE_TEMPLATES_PATH = (
    Path(__file__).resolve().parents[4]
    / 'tools' / 'recogniser-v2' / 'data' / 'role-templates.json'
)


def load_role_taxonomy() -> set[str]:
    if not _ROLE_TEMPLATES_PATH.exists():
        return set()
    rt = json.loads(_ROLE_TEMPLATES_PATH.read_text(encoding='utf-8'))
    roles = rt.get('roles')
    if isinstance(roles, dict):
        return set(roles.keys())
    if isinstance(roles, list):
        return set(roles)
    return set()


def load_vocabulary(conn: sqlite3.Connection) -> tuple[set[str], set[str], set[str], set[str], dict[str, set[str]]]:
    # Post-D99: slot_synonyms dropped; reads slots table (scope='element') instead.
    # slot_name replaces canonical_slot; notes replaces description.
    slot_set = {r[0] for r in conn.execute("SELECT slot_name FROM slots WHERE scope = 'element'")}
    role_set = load_role_taxonomy()
    property_suffix_set = {r[0] for r in conn.execute("SELECT suffix FROM property_suffixes")}
    modifier_suffix_set = {r[0] for r in conn.execute("SELECT suffix FROM modifier_suffixes")}
    # slot_name -> {slot_name, aliases...} so the modifier check can
    # accept alias forms (e.g. `subHeadline` is accepted as `subheading`).
    alias_map: dict[str, set[str]] = {}
    for canon, aliases_json in conn.execute("SELECT slot_name, aliases FROM slots WHERE scope = 'element'"):
        aliases: set[str] = {canon}
        if aliases_json:
            try:
                aliases |= set(json.loads(aliases_json))
            except (json.JSONDecodeError, TypeError):
                pass
        alias_map[canon] = aliases
    return slot_set, role_set, property_suffix_set, modifier_suffix_set, alias_map


def _peel_longest_suffix(name: str, suffix_set: set[str]) -> str | None:
    """Return the longest suffix from *suffix_set* that *name* ends with.

    property_suffixes contains compound tokens like `FontSize` (not `Size`),
    so the peel must match greedily by longest-suffix wins, not single
    CamelCase token.
    """
    matches = [s for s in suffix_set if name.endswith(s) and len(name) > len(s)]
    if not matches:
        return None
    return max(matches, key=len)


def detect_unknown_modifier(
    attr_name: str,
    canonical_slot: str | None,
    property_suffix_set: set[str],
    modifier_suffix_set: set[str],
    alias_map: dict[str, set[str]],
) -> str | None:
    """Spec 19 Stage 9 modifier check.

    Only fires when canonical_slot is set (strongest signal that the attr was
    successfully decomposed by Stage 4). For un-canonicalised attrs, gap
    detection is the right surface, not drift.

    Decomposition order (matches assign-canonical.py): peel longest known
    modifier_suffix → then peel longest known property_suffix → then check
    the remaining trailing CamelCase token. If a CamelCase token still
    trails after the peels AND it's in neither vocab, flag it as drift.

    Honours slots.aliases — the remaining stem after peels is accepted if
    it matches the slot_name OR any of its aliases (e.g. `subHeadline`
    accepts as alias of `subheading`).
    """
    if canonical_slot is None:
        return None
    # `options` is the catch-all behaviour-flag bucket — decomposition
    # isn't semantically meaningful (showSchema / showAuthor / paymentEnabled
    # legitimately don't peel into recognisable suffix structure). Skip
    # modifier-drift check for options-slotted attrs.
    if canonical_slot == "options":
        return None
    remaining = attr_name
    mod = _peel_longest_suffix(remaining, modifier_suffix_set)
    if mod:
        remaining = remaining[: -len(mod)]
    prop = _peel_longest_suffix(remaining, property_suffix_set)
    if prop:
        remaining = remaining[: -len(prop)]
    m = _TRAILING_MODIFIER_RE.search(remaining)
    if not m:
        return None
    token = m.group(1)
    if token in property_suffix_set or token in modifier_suffix_set:
        return None
    # Only flag the trailing token as drift IF removing it leaves the
    # canonical_slot (or one of its aliases) standing. Otherwise the attr
    # is a compound noun like `phoneNumber` / `iconLabel` where the
    # trailing token is part of the stem, not a missing suffix.
    accepted_forms = alias_map.get(canonical_slot, {canonical_slot})
    accepted_lower = {a.lower() for a in accepted_forms}
    # First: check if remaining (with trailing token still attached) is
    # an alias — this handles cases like `subHeadline` accepted as
    # `subheading`.
    if remaining in accepted_forms or remaining.lower() in accepted_lower:
        return None
    # Second: check if stripping the trailing token reveals the slot —
    # signalling a suspected unknown suffix on a known slot stem.
    stem_without_trailing = remaining[: m.start()]
    if stem_without_trailing and stem_without_trailing[0].isupper():
        stem_without_trailing = stem_without_trailing[0].lower() + stem_without_trailing[1:]
    if stem_without_trailing in accepted_forms or stem_without_trailing.lower() in accepted_lower:
        return token
    # Compound noun (remaining stem is unrelated to the slot) — not drift.
    return None


def validate(conn: sqlite3.Connection) -> list[tuple[str, str, str]]:
    slot_set, role_set, prop_set, mod_set, alias_map = load_vocabulary(conn)
    violations: list[tuple[str, str, str]] = []

    rows = conn.execute(
        """
        SELECT block_slug, attr_name, canonical_slot, role, derived_selector
        FROM block_attributes
        """
    ).fetchall()

    for block_slug, attr_name, canonical_slot, role, derived_selector in rows:
        if canonical_slot is not None and canonical_slot not in slot_set:
            violations.append((block_slug, attr_name, f"unknown canonical_slot '{canonical_slot}'"))
        if role is not None and role_set and role not in role_set:
            violations.append((block_slug, attr_name, f"unknown role '{role}'"))
        if derived_selector is not None and not (
            derived_selector.startswith(".sgs-")
            or derived_selector.startswith(".wp-block-sgs-")
        ):
            violations.append((block_slug, attr_name, f"derived_selector '{derived_selector}' does not start with .sgs- or .wp-block-sgs-"))
        unknown_modifier = detect_unknown_modifier(
            attr_name, canonical_slot, prop_set, mod_set, alias_map
        )
        if unknown_modifier is not None:
            violations.append((block_slug, attr_name, f"unknown modifier '{unknown_modifier}'"))

    return violations


def main() -> int:
    parser = argparse.ArgumentParser(description="Spec 19 Stage 9 drift validator")
    parser.add_argument("--strict", action="store_true", help="Exit 1 if any violations found")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"ERROR: DB not found at {DB_PATH}")
        return 2

    conn = sqlite3.connect(str(DB_PATH))
    try:
        violations = validate(conn)
        total = conn.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0]
    finally:
        conn.close()

    for block_slug, attr_name, reason in violations:
        print(f"  VIOLATION  {block_slug}.{attr_name}  —  {reason}")

    if violations:
        print(f"\nDRIFT-VALIDATOR: FAIL ({len(violations)} violations across {total} attrs)")
        return 1 if args.strict else 0
    print(f"\nDRIFT-VALIDATOR: PASS (0 violations across {total} attrs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
