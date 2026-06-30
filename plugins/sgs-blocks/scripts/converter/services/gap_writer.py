"""gap_writer — record a tracked GAP (design §3.1, FR-31-21 step 6).

Builds the GAP result the resolver returns. A GAP is a TRACKED non-transfer with a
reason (origin) — the opposite of a silent drop. The orchestrator collects every GAP
into the conservation ledger; persistence to the attribute_gap_candidates DB table is
a step-3 concern (the slice's ledger IS the record).

(Returns the GAP rather than the design's literal `-> None` so the resolver can do
`return gap_writer(...)` in one line; the orchestrator still owns collection.)
"""
from __future__ import annotations

from typing import Any

from converter.models import GAP, GapOrigin


def gap_writer(
    ctx: Any,
    decl: Any,
    origin: GapOrigin,
    detail: str,
    f4_ref: str | None = None,
) -> GAP:
    return GAP(
        origin=origin,
        property=decl.property,
        tier=decl.tier,
        detail=detail,
        f4_ref=f4_ref,
    )
