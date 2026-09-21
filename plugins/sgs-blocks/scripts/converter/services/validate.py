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


# The declared block_attributes.attr_type families a WP schema can actually enforce, keyed by the
# JSON kind of the value about to be written. WP validates an attribute against its block.json
# `type` at render: a value of the wrong kind is discarded (a px-string in a number attr — the CG-4
# bug) or, worse, accepted and read by PHP truthiness (the string "none" in a boolean attr is
# `!empty()` and switched a Ken Burns animation ON). Bool is tested before int because
# ``isinstance(True, int)``. ``string|boolean`` is the union type some blocks declare.
_ACCEPTED_ATTR_TYPES_BY_KIND: "tuple[tuple[type | tuple[type, ...], tuple[str, ...]], ...]" = (
    (bool, ("boolean", "string|boolean")),
    ((int, float), ("number", "integer")),
    (str, ("string", "string|boolean", "rich-text")),
    (dict, ("object",)),
    (list, ("array",)),
)
_CHECKED_ATTR_TYPES: tuple[str, ...] = (
    "boolean", "number", "integer", "string", "string|boolean", "rich-text", "object", "array",
)


def write_type_violation(ctx: Any, attr: str, value: Any) -> "str | None":
    """Reason string when ``value`` is the wrong JSON kind for ``attr``'s declared type, else None.

    Spec 31 §3.A step 5/7 (serialise by ``block_attributes.attr_type``; validate before emit). This is
    the TYPE half of the emit gate: ``validate()`` above checks that the attr exists and that an
    enum-constrained attr receives a member, but it receives the RAW CSS string a resolver is about to
    convert, so it cannot see the value that is actually written. This runs on the final ``Write``.

    Type-family membership is decided INSIDE the SQL WHERE clause (the ``attr_is_number`` /
    ``attr_is_boolean`` discipline), so no block-slug-derived local is compared to a literal in Python
    (gates/no_slug_literal.py). An attr the block does not declare, or one whose declared type is not
    one of the enforceable families (``_CHECKED_ATTR_TYPES``), returns None: that is ``validate()``'s
    call, not this gate's. ``None`` values are skipped (an absent write is not a type error).
    """
    if value is None:
        return None
    accepted: "tuple[str, ...] | None" = None
    for kinds, types in _ACCEPTED_ATTR_TYPES_BY_KIND:
        if isinstance(value, kinds):
            accepted = types
            break
    if accepted is None:
        return None
    checked_marks = ",".join("?" for _ in _CHECKED_ATTR_TYPES)
    declared = ctx.conn.execute(
        "SELECT attr_type FROM block_attributes "
        f"WHERE block_slug=? AND attr_name=? AND attr_type IN ({checked_marks})",
        (ctx.block_slug, attr, *_CHECKED_ATTR_TYPES),
    ).fetchone()
    if declared is None:
        return None
    accepted_marks = ",".join("?" for _ in accepted)
    fits = ctx.conn.execute(
        "SELECT 1 FROM block_attributes "
        f"WHERE block_slug=? AND attr_name=? AND attr_type IN ({accepted_marks})",
        (ctx.block_slug, attr, *accepted),
    ).fetchone()
    if fits is not None:
        return None
    return (
        f"{type(value).__name__} value {value!r} written to {attr!r}, which the block declares as "
        f"{declared[0]!r} — WP discards or misreads a wrong-kind value at render"
    )


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
