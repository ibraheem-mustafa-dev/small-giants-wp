"""validate — gate a (attr, value) write before it is emitted (design §3.1).

Three checks (design §2 named enforcement point + §10 A15):
  1. KIND-legality — a content-KIND block must not receive a GRID-layer attr
     (the gridItem* prefix marks the GRID layer). A content-KIND block rejecting a
     grid resolver is the A15 assertion.
  2. attr-existence — the block must actually declare the attr (else → gap).
  3. enum membership — if the attr is enum-constrained, value must be a member.

Returns True iff the write is legal. A False return means the caller gaps it
(NO_DESTINATION) — never a silent write.

enum_values column format: JSON array string, e.g. '["cover", "contain", "auto"]'.
All enum_values rows in block_attributes use this format (verified by inspection).
The parser uses ``json.loads`` to decode; falls back to the old comma-split on
malformed JSON so no existing passing behaviour regresses.
"""
from __future__ import annotations

import json
from typing import Any


def _parse_enum_values(raw: str) -> set[str]:
    """Parse an enum_values string into a set of allowed string values.

    Handles the canonical JSON-array format ('["cover", "contain", "auto"]') that
    ALL block_attributes enum_values rows use. Falls back to a comma-split for any
    legacy plain-comma row so no existing passing test regresses.
    """
    raw = raw.strip()
    if raw.startswith("["):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return {str(v) for v in parsed if v is not None}
        except json.JSONDecodeError:
            pass
    # Fallback: plain comma-separated list (no known rows use this, but kept defensive).
    return {v.strip() for v in raw.split(",") if v.strip()}


def attr_is_number(ctx: Any, attr: str) -> bool:
    """True iff the block declares ``attr`` with a numeric ``attr_type``.

    Spec 31 §3.A.5 (serialise by ``block_attributes.attr_type``): a px-string
    written into a number/integer attr is DISCARDED by WP's schema validation at
    render time (the CG-4 maxWidth bug) — every resolver writing a length value
    must branch on this. ONE shared implementation (R-31-9); ``'integer'`` is
    included per the Step-12 widening (order/z-index attrs on some blocks).
    """
    row = ctx.conn.execute(
        "SELECT 1 FROM block_attributes "
        "WHERE block_slug=? AND attr_name=? AND attr_type IN ('number', 'integer')",
        (ctx.block_slug, attr),
    ).fetchone()
    return row is not None


def validate(ctx: Any, attr: str, value: str) -> bool:
    # 1. KIND-legality (A15): content-KIND blocks have no grid layer.
    if ctx.container_kind == "content" and attr.startswith("gridItem"):
        return False

    # 2. attr-existence on the block.
    row = ctx.conn.execute(
        "SELECT 1 FROM block_attributes WHERE block_slug=? AND attr_name=?",
        (ctx.block_slug, attr),
    ).fetchone()
    if row is None:
        return False

    # 3. enum membership (if the attr enumerates allowed values).
    enum_row = ctx.conn.execute(
        "SELECT enum_values FROM block_attributes "
        "WHERE block_slug=? AND attr_name=?",
        (ctx.block_slug, attr),
    ).fetchone()
    if enum_row and enum_row[0]:
        allowed = _parse_enum_values(str(enum_row[0]))
        if allowed and value not in allowed:
            return False

    return True
