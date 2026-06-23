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
"""
from __future__ import annotations

import sqlite3

_TIER_SUFFIX = {"Base": "", "Mobile": "Mobile", "Tablet": "Tablet", "Desktop": "Desktop"}


def tier_suffix(base_attr: str, tier: str, conn: sqlite3.Connection) -> str:
    suffix = _TIER_SUFFIX.get(tier)
    if suffix is None:
        raise ValueError(
            f"tier_suffix received non-device tier {tier!r}; the caller must route "
            f"non-device-tier breakpoints to gap(NO_DESTINATION) first (design §10 A4)."
        )
    return f"{base_attr}{suffix}"
