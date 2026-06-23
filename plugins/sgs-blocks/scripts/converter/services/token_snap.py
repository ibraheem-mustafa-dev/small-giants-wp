"""token_snap — snap a value to a design token when within tolerance (design §3.1).

Slice scope: max-width / maxWidth is an EXACT literal (D230) — NO token snap; the
draft's `1200px` stays `1200px`. Colour (ΔE≤1) and spacing (≤1px) token snapping is
a step-3 concern owned by the resolvers for those properties; the tie-break order
is pinned there. For the slice this is an identity passthrough.
"""
from __future__ import annotations

import sqlite3

# Properties that are EXACT literals and must never be token-snapped (D230).
_LITERAL_PROPERTIES = frozenset({"max-width", "width", "min-width", "height"})


def token_snap(css_property: str, value: str, conn: sqlite3.Connection) -> str:
    if css_property in _LITERAL_PROPERTIES:
        return value
    # Step-3: colour/spacing token snapping. Identity until those resolvers land.
    return value
