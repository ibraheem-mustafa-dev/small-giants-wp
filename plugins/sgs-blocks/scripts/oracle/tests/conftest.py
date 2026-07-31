"""conftest.py — skip the whole oracle test session cleanly when the SGS
framework DB is absent.

WHY THIS EXISTS (Motion Wave D Step 11, 2026-07-31)
----------------------------------------------------------------------------
`python -m pytest scripts/oracle/tests/ -q` is wired into `prebuild`
(package.json), so it runs on EVERY `npm run build`. Several of these tests
exercise the real recognition path (oracle/batch_runner.py ->
converter/recognition.py -> converter/db/db_lookup.py) against fixture HTML,
which calls DB-backed lookups such as ``atomic_tag_map()`` and
``registered_block_slugs()``.

Unlike the top-level gate scripts (db-consistency/run.py, cheat-gate/run.py,
excluded-gate/run.py, ledger/coverage_check.py, audit-feature-parity.py —
all hardened the same session to skip cleanly when the DB is absent),
``converter/db/db_lookup.py`` is a ~5000-line module with roughly a hundred
individual ``sqlite3.connect(SGS_DB)`` call sites reached from many different
entry points across the whole converter/recognition/orchestrator tree. It is
also the single highest-blast-radius file in this project (see its own
module docstring + the project's edit-time SGS evidence reminder) — patching
every call site individually to degrade gracefully is out of proportion to
what this build-chain fix needs, and each such patch is itself a change to
converter/recognition semantics that deserves its own scrutiny, not a
drive-by edit bundled into a build-tooling fix.

The DB is DELIBERATELY UNVERSIONED (see .claude/dev-setup.md
"sgs-framework.db") — on a clean clone it is simply absent. Rather than
chase every downstream `sqlite3.OperationalError: unable to open database
file` traceback individually, this conftest applies the SAME "skip cleanly
when absent" contract at the one place that actually gates `npm run build`:
the pytest session boundary. Verified empirically 2026-07-31 with a faked
empty HOME: without this conftest, 10 of 245 collected tests failed with
raw ``sqlite3.OperationalError`` tracebacks (not clean skips), which failed
`npm run build`'s `prebuild` chain outright.

A DB that IS present is unaffected — this only skips when the DB genuinely
does not exist. A present-but-drifted DB (e.g. a required table missing)
still surfaces as a normal test failure, naming the missing table in the
pytest output, exactly as before.
"""
from __future__ import annotations

from pathlib import Path

import pytest

_SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    if _SGS_DB.exists():
        return
    skip_marker = pytest.mark.skip(
        reason=(
            f"SGS framework DB not found: {_SGS_DB} — skipping (this suite "
            "exercises the DB-backed recognition path; the DB is deliberately "
            "unversioned, see .claude/dev-setup.md \"sgs-framework.db\")."
        )
    )
    for item in items:
        item.add_marker(skip_marker)
