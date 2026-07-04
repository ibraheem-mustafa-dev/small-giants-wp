"""check_overrides_drift.py — Check #4: override-dict drift.

Spec ref: F6 deferred follow-up (D237)

The FROZEN converter had TWO hand-maintained constants that had to mirror
each other or the lift and the resolver would disagree on attr ownership:
  - _SUFFIX_ATTR_OVERRIDES in scripts/orchestrator/converter_v2/convert.py
  - _ATTR_NAME_OVERRIDES   in scripts/orchestrator/converter_v2/db_lookup.py

RETIRED (EXECUTION Step 16, 2026-07-05): converter_v2/convert.py is deleted.
Verified by grep across converter/ (the new engine) that the drift-class this
check existed to catch no longer has two parties to drift — the new engine's
CSS-lift resolvers (converter/resolvers/*.py, converter/dispatch_table.py)
call db_lookup.attr_for_property() directly, which reads the SINGLE
_ATTR_NAME_OVERRIDES constant in converter/db/db_lookup.py. There is no
second, independently-maintained override dict anywhere under converter/ to
compare it against — the architecture consolidated to one source of truth
(R-22-1), which is exactly what this check was trying to enforce. Rather
than raise ImportError every run once convert.py is gone (the previous
fail-loud shape), this check now returns zero violations with a comment —
kept as a historical record + tripwire shape in case a second override dict
is ever (re)introduced.
"""
from __future__ import annotations

import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #4. RETIRED — see module docstring. Always returns []."""
    del conn  # not needed — retired check, no live comparison to perform.
    return []
