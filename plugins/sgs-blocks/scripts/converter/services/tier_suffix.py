"""tier_suffix — re-append the device-tier breakpoint suffix to a base attr.

Design §3.1: ALWAYS called AFTER attr_resolve (fixed service-call order). The
caller MUST have gapped a non-device tier first (A4) — a non-device tier here is
a programming error, raised loudly rather than coerced.

    Base    -> maxWidth
    Mobile  -> maxWidthMobile
    Tablet  -> maxWidthTablet
    Desktop -> maxWidthDesktop

Whether the suffixed attr actually EXISTS on the block is validated downstream by
services.validate (a non-existent tier attr → gap, never a silent write).

R-31-1 (D249): the Mobile/Tablet/Desktop breakpoint suffix vocabulary is DB-OWNED —
read from ``db_lookup.modifier_suffixes('breakpoint')``, NEVER a hardcoded dict (the
former ``_TIER_SUFFIX`` literal was the live R-31-1 violation, same class as the
grid_area side-suffix regex Bean caught). For a device tier the suffix IS the tier
name (``Mobile`` → ``'Mobile'``).
"""
from __future__ import annotations

import sqlite3

from converter.db.db_lookup import modifier_suffixes

# "Base" is the UNSUFFIXED device tier (SGS desktop) — a structural pipeline convention,
# NOT a row in the DB suffix vocabulary. This single named constant is the permitted
# R-31-1 exception (same class as SKIP_TOP_LEVEL_TAGS): an empty BASE suffix has no DB
# row to source. The Mobile/Tablet/Desktop suffixes themselves come from the DB below.
_BASE_TIER = "Base"


def tier_suffix(base_attr: str, tier: str, conn: sqlite3.Connection) -> str:
    # ``conn`` is retained for call-site signature stability (every resolver passes
    # ctx.conn); the DB suffix vocabulary is sourced via the cached modifier_suffixes.
    if tier == _BASE_TIER:
        return base_attr
    # The breakpoint suffix vocabulary is DB-owned (R-31-1). Validate the tier against
    # the DB set so a non-device tier fails loud rather than appending a bogus suffix.
    if tier not in modifier_suffixes("breakpoint"):
        raise ValueError(
            f"tier_suffix received non-device tier {tier!r}; the caller must route "
            f"non-device-tier breakpoints to gap(NO_DESTINATION) first (design §10 A4)."
        )
    return f"{base_attr}{tier}"
