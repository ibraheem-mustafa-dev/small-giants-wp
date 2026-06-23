"""validate — gate a (attr, value) write before it is emitted (design §3.1).

Three checks (design §2 named enforcement point + §10 A15):
  1. KIND-legality — a content-KIND block must not receive a GRID-layer attr
     (the gridItem* prefix marks the GRID layer). A content-KIND block rejecting a
     grid resolver is the A15 assertion.
  2. attr-existence — the block must actually declare the attr (else → gap).
  3. enum membership — if the attr is enum-constrained, value must be a member.

Returns True iff the write is legal. A False return means the caller gaps it
(NO_DESTINATION) — never a silent write.
"""
from __future__ import annotations

from typing import Any


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
        allowed = {v.strip() for v in str(enum_row[0]).split(",") if v.strip()}
        if allowed and value not in allowed:
            return False

    return True
