"""grid — GAP-stub resolver (design §3 / §3.2).

Registered so the dispatch table resolves, but explicitly NOT built this phase —
returns GAP(origin=UNIMPLEMENTED_STUB). Real logic + LANDED proof is its step-3
stage's deliverable (A14). Its metamorphic tests are @pytest.mark.xfail (never
vacuously green). The step-3 stage gate FAILS if this still emits UNIMPLEMENTED_STUB
after the stage claims it built.
"""
from __future__ import annotations

from typing import Any

from converter.models import GAP, GapOrigin


def resolve(decl: Any, ctx: Any) -> GAP:
    return GAP(
        origin=GapOrigin.UNIMPLEMENTED_STUB,
        property=decl.property,
        tier=decl.tier,
        detail="grid resolver not built yet (slice stub)",
    )
