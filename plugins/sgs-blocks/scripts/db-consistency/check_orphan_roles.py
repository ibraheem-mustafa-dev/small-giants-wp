"""check_orphan_roles.py — Check #6: role referential integrity.

Spec ref: F6 deferred follow-up (D237)

Every block_attributes.role value (non-NULL, non-empty) MUST exist as a
roles.role_name row.  An orphan role means an attr is classified against a role
the roles table doesn't know about — the converter's role-based inference then
falls through to a default, mis-routing the attr.

Today: empty (rating was registered via a dated migration before this check shipped).
"""
from __future__ import annotations

import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, orphan_role_key


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #6 against the live DB connection.

    Returns
    -------
    list[Violation]  — empty when every used role is registered (expected today).
    """
    violations: list[Violation] = []

    orphans = conn.execute(
        "SELECT DISTINCT role FROM block_attributes "
        "WHERE role IS NOT NULL AND role != '' "
        "AND role NOT IN (SELECT role_name FROM roles) "
        "ORDER BY role"
    ).fetchall()

    for (role,) in orphans:
        # Find which blocks use this orphan role (for a helpful message).
        users = conn.execute(
            "SELECT DISTINCT block_slug FROM block_attributes "
            "WHERE role = ? ORDER BY block_slug LIMIT 5",
            (role,),
        ).fetchall()
        user_list = ", ".join(u[0] for u in users)
        more = " (and others)" if len(users) == 5 else ""

        violations.append(Violation(
            check="orphan_roles",
            block=user_list or "(unknown)",
            detail=(
                f"role '{role}' is used by block attributes ({user_list}{more}) "
                "but has no matching row in the roles table."
            ),
            fix=(
                f"role '{role}' is used by attrs but missing from the roles table — "
                "add it via a dated migration (see migrations/2026-06-21-register-rating-role.py "
                "for the pattern), then it's registered."
            ),
            key=orphan_role_key(role),
        ))

    return violations
