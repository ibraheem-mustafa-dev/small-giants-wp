#!/usr/bin/env python3
"""D99 DB unification migration — 4 fixes in one atomic pass.

Fix 1: CREATE `slots` table, migrate slot_synonyms (89 rows, scope='element')
        + legacy_role_lookup (16 rows, scope='section'), then DROP old tables.
Fix 2: CREATE `roles` table, seed from _ROLE_CLASSIFICATION_MAP (20 rows).
        Closes link-href bug: no slot_synonyms row had role='link-href', so
        _content_bearing_roles() returned 4 instead of 5.
Fix 3: Switch html_tag_to_core_block seeding from INSERT OR IGNORE →
        INSERT OR REPLACE so seed-dict updates propagate on module re-load.
Fix 4: ALTER property_suffixes ADD COLUMN kind_override TEXT; UPDATE 17 rows
        from _KIND_BY_SUFFIX dict.

Applies to BOTH DBs:
  - ~/.claude/skills/sgs-wp-engine/sgs-framework.db
  - ~/.agents/skills/sgs-wp-engine/sgs-framework.db

Safety: DROPs are only executed if row-count verification passes on each DB.
Idempotent: safe to re-run.

Usage:
    python plugins/sgs-blocks/scripts/migrations/2026-05-29-d99-db-unification.py
    python plugins/sgs-blocks/scripts/migrations/2026-05-29-d99-db-unification.py --dry-run
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Seed data (mirrors db_lookup.py constants — kept in sync by D99 rule)
# ---------------------------------------------------------------------------

_ROLE_CLASSIFICATION_MAP: dict[str, str] = {
    # Content-bearing roles
    "text-content":         "content-bearing",
    "image-object":         "content-bearing",
    "content":              "content-bearing",
    "link-href":            "content-bearing",   # the missing role that caused the bug
    "identity":             "content-bearing",
    # Styling / behaviour roles
    "typography":           "styling-behaviour",
    "color":                "styling-behaviour",
    "colour-gradient":      "styling-behaviour",
    "colour-text":          "styling-behaviour",
    "spacing-token":        "styling-behaviour",
    "number-css-px":        "styling-behaviour",
    "number-css-percent":   "styling-behaviour",
    "layout":               "styling-behaviour",
    "motion":               "styling-behaviour",
    "visual":               "styling-behaviour",
    "behaviour":            "styling-behaviour",
    "boolean-visibility":   "styling-behaviour",
    "select-from-enum":     "styling-behaviour",
    "enum-class-probe":     "styling-behaviour",
    "query-descriptor":     "styling-behaviour",
}

_KIND_BY_SUFFIX: dict[str, str] = {
    "LineHeight":     "number_unitless",
    "LetterSpacing":  "number_px_or_em",
    "FontFamily":     "string",
    "FontWeight":     "string",
    "TextTransform":  "string",
    "TextAlign":      "string",
    "TextDecoration": "string",
    "ObjectFit":      "string",
    "ObjectPosition": "string",
    "BorderStyle":    "string",
    "BoxShadow":      "string",
    "Easing":         "string",
    "Columns":        "string",
    "AspectRatio":    "string",
    "Style":          "string",
    "Variant":        "string",
    "Alignment":      "string",
}

EXPECTED_ELEMENT_ROWS = 89
EXPECTED_SECTION_ROWS = 16
EXPECTED_TOTAL_SLOTS  = EXPECTED_ELEMENT_ROWS + EXPECTED_SECTION_ROWS  # 105
EXPECTED_ROLES        = 20
EXPECTED_KIND_OVERRIDES = 17


# ---------------------------------------------------------------------------
# Migration helpers
# ---------------------------------------------------------------------------

def _get_table_names(conn: sqlite3.Connection) -> set[str]:
    return {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}


def migrate_fix1_slots(conn: sqlite3.Connection, dry_run: bool) -> dict:
    """Create `slots` table and migrate data from slot_synonyms + legacy_role_lookup.

    PRIMARY KEY is (slot_name, scope) composite — required because the same name
    can legitimately exist at both scopes. Example: slot_synonyms has 'header' as
    an element-scope identity slot (BEM __header element); legacy_role_lookup has
    'header' as a section-scope class (.header section root). Both are valid and
    must coexist.
    """
    results: dict = {}
    tables = _get_table_names(conn)

    # Step 1: Create slots table (idempotent)
    # Composite PK (slot_name, scope) avoids name collisions across scopes.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS slots (
          slot_name        TEXT NOT NULL,
          scope            TEXT NOT NULL CHECK (scope IN ('section','element')),
          aliases          TEXT,
          standalone_block TEXT,
          notes            TEXT,
          created_at       TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (slot_name, scope)
        )
    """)

    # Step 2: Migrate from slot_synonyms (scope='element')
    if "slot_synonyms" in tables:
        rows = conn.execute(
            "SELECT canonical_slot, aliases, description, standalone_block FROM slot_synonyms"
        ).fetchall()
        element_inserted = 0
        for canonical_slot, aliases, description, standalone_block in rows:
            # INSERT OR IGNORE — idempotent on re-runs (composite PK: slot_name + scope)
            cur = conn.execute(
                "INSERT OR IGNORE INTO slots "
                "(slot_name, scope, aliases, standalone_block, notes) "
                "VALUES (?, 'element', ?, ?, ?)",
                (canonical_slot, aliases or "[]", standalone_block, description),
            )
            element_inserted += cur.rowcount
        results["element_inserted"] = element_inserted
        results["element_existing"] = len(rows)
    else:
        results["element_inserted"] = 0
        results["element_existing"] = 0

    # Step 3: Migrate from legacy_role_lookup (scope='section')
    if "legacy_role_lookup" in tables:
        lrl_rows = conn.execute(
            "SELECT kebab_role, sgs_slug, notes FROM legacy_role_lookup"
        ).fetchall()
        section_inserted = 0
        for kebab_role, sgs_slug, notes in lrl_rows:
            cur = conn.execute(
                "INSERT OR IGNORE INTO slots "
                "(slot_name, scope, aliases, standalone_block, notes) "
                "VALUES (?, 'section', '[]', ?, ?)",
                (kebab_role, sgs_slug, notes),
            )
            section_inserted += cur.rowcount
        results["section_inserted"] = section_inserted
        results["section_existing"] = len(lrl_rows)
    else:
        results["section_inserted"] = 0
        results["section_existing"] = 0

    # Step 4: Verify counts
    element_count = conn.execute(
        "SELECT COUNT(*) FROM slots WHERE scope='element'"
    ).fetchone()[0]
    section_count = conn.execute(
        "SELECT COUNT(*) FROM slots WHERE scope='section'"
    ).fetchone()[0]
    total_count = element_count + section_count

    results["element_count_after"] = element_count
    results["section_count_after"] = section_count
    results["total_count_after"]   = total_count
    results["verification_passed"]  = (
        element_count == EXPECTED_ELEMENT_ROWS and
        section_count == EXPECTED_SECTION_ROWS
    )

    # Step 5: DROP old tables — only if verification passed AND not dry-run
    results["dropped_slot_synonyms"]    = False
    results["dropped_legacy_role_lookup"] = False

    if not dry_run and results["verification_passed"]:
        if "slot_synonyms" in tables:
            conn.execute("DROP TABLE IF EXISTS slot_synonyms")
            results["dropped_slot_synonyms"] = True
        if "legacy_role_lookup" in tables:
            conn.execute("DROP TABLE IF EXISTS legacy_role_lookup")
            results["dropped_legacy_role_lookup"] = True
    elif not results["verification_passed"]:
        results["skip_reason"] = (
            f"VERIFICATION FAILED — expected element={EXPECTED_ELEMENT_ROWS} "
            f"section={EXPECTED_SECTION_ROWS}, got element={element_count} "
            f"section={section_count}. Old tables NOT dropped."
        )

    return results


def migrate_fix2_roles(conn: sqlite3.Connection, dry_run: bool) -> dict:
    """Create `roles` table and seed from _ROLE_CLASSIFICATION_MAP."""
    # Create roles table (idempotent)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS roles (
          role_name      TEXT PRIMARY KEY,
          classification TEXT NOT NULL CHECK (classification IN
                         ('content-bearing','styling-behaviour','unclassified')),
          description    TEXT,
          created_at     TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # INSERT OR REPLACE so updates to the seed dict propagate on re-run (R-31-1)
    upserted = 0
    for role_name, classification in _ROLE_CLASSIFICATION_MAP.items():
        conn.execute(
            "INSERT OR REPLACE INTO roles (role_name, classification) VALUES (?, ?)",
            (role_name, classification),
        )
        upserted += 1

    count = conn.execute("SELECT COUNT(*) FROM roles").fetchone()[0]
    cb_count = conn.execute(
        "SELECT COUNT(*) FROM roles WHERE classification='content-bearing'"
    ).fetchone()[0]
    sb_count = conn.execute(
        "SELECT COUNT(*) FROM roles WHERE classification='styling-behaviour'"
    ).fetchone()[0]

    # Verify link-href is present
    link_href_row = conn.execute(
        "SELECT classification FROM roles WHERE role_name='link-href'"
    ).fetchone()

    return {
        "upserted":            upserted,
        "total_count_after":   count,
        "content_bearing_count": cb_count,
        "styling_behaviour_count": sb_count,
        "link_href_present":   link_href_row is not None,
        "link_href_classification": link_href_row[0] if link_href_row else None,
        "verification_passed": count == EXPECTED_ROLES and link_href_row is not None,
    }


def migrate_fix3_html_tag_to_core_block(conn: sqlite3.Connection, dry_run: bool) -> dict:
    """This fix is in db_lookup.py code only — switches INSERT OR IGNORE to INSERT OR REPLACE.
    No DB DDL needed here; the schema change is in the Python module.
    This function documents the change and verifies the table exists."""
    tables = _get_table_names(conn)
    exists = "html_tag_to_core_block" in tables
    row_count = 0
    if exists:
        row_count = conn.execute("SELECT COUNT(*) FROM html_tag_to_core_block").fetchone()[0]
    return {
        "table_exists": exists,
        "row_count":    row_count,
        "note":         "INSERT OR IGNORE → INSERT OR REPLACE change is in db_lookup.py line 169",
    }


def migrate_fix4_kind_override(conn: sqlite3.Connection, dry_run: bool) -> dict:
    """Add kind_override column to property_suffixes; seed 17 rows."""
    # Step 1: Add column (idempotent via PRAGMA check)
    cols = {row[1] for row in conn.execute("PRAGMA table_info(property_suffixes)")}
    column_added = False
    if "kind_override" not in cols:
        conn.execute("ALTER TABLE property_suffixes ADD COLUMN kind_override TEXT")
        column_added = True

    # Step 2: UPDATE rows where kind_override IS NULL (idempotent — leaves manual overrides)
    updated = 0
    not_found = []
    for suffix, kind in _KIND_BY_SUFFIX.items():
        row = conn.execute(
            "SELECT suffix FROM property_suffixes WHERE suffix=?", (suffix,)
        ).fetchone()
        if row:
            cur = conn.execute(
                "UPDATE property_suffixes SET kind_override=? WHERE suffix=? AND kind_override IS NULL",
                (kind, suffix),
            )
            updated += cur.rowcount
        else:
            not_found.append(suffix)

    populated = conn.execute(
        "SELECT COUNT(*) FROM property_suffixes WHERE kind_override IS NOT NULL"
    ).fetchone()[0]

    return {
        "column_added":   column_added,
        "updated":        updated,
        "not_found":      not_found,
        "populated_after": populated,
        "verification_passed": (
            populated == EXPECTED_KIND_OVERRIDES and len(not_found) == 0
        ),
    }


# ---------------------------------------------------------------------------
# Per-DB driver
# ---------------------------------------------------------------------------

def run_migration(db_path: Path, dry_run: bool) -> dict:
    """Run all 4 fixes against a single DB. Returns per-fix results.

    SQLite DDL (CREATE TABLE, ALTER TABLE, DROP TABLE) is NOT rolled back by
    sqlite3.Connection.rollback() in autocommit mode — DDL takes effect
    immediately. To make dry-run truly non-destructive we use a SAVEPOINT,
    which wraps DDL in the current transaction and can be rolled back.
    """
    if not db_path.exists():
        return {"error": f"DB not found: {db_path}"}

    conn = sqlite3.connect(str(db_path), isolation_level=None)  # manual transaction
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("BEGIN")  # explicit transaction — wraps ALL DDL + DML
        fix1 = migrate_fix1_slots(conn, dry_run)
        fix2 = migrate_fix2_roles(conn, dry_run)
        fix3 = migrate_fix3_html_tag_to_core_block(conn, dry_run)
        fix4 = migrate_fix4_kind_override(conn, dry_run)

        if not dry_run:
            conn.execute("COMMIT")
        else:
            conn.execute("ROLLBACK")  # wraps DDL — undoes CREATE TABLE etc.

        return {"fix1": fix1, "fix2": fix2, "fix3": fix3, "fix4": fix4}
    except Exception as exc:
        try:
            conn.execute("ROLLBACK")
        except Exception:
            pass
        return {"error": str(exc)}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Report printer
# ---------------------------------------------------------------------------

def print_report(db_label: str, results: dict) -> bool:
    """Print structured report. Returns True if all verifications passed."""
    print(f"\n{'='*70}")
    print(f"DB: {db_label}")
    print("="*70)

    if "error" in results:
        print(f"  ERROR: {results['error']}")
        return False

    all_passed = True

    # Fix 1
    f1 = results.get("fix1", {})
    print(f"\n[Fix 1 — slots table unification]")
    print(f"  element rows inserted:  {f1.get('element_inserted', 0)}")
    print(f"  section rows inserted:  {f1.get('section_inserted', 0)}")
    print(f"  slots WHERE scope='element': {f1.get('element_count_after', '?')}")
    print(f"  slots WHERE scope='section': {f1.get('section_count_after', '?')}")
    print(f"  total slots:                 {f1.get('total_count_after', '?')} (expected 105)")
    v1 = f1.get("verification_passed", False)
    print(f"  VERIFICATION: {'PASS' if v1 else 'FAIL'}")
    if not v1:
        print(f"  {f1.get('skip_reason', '')}")
        all_passed = False
    print(f"  slot_synonyms dropped:       {f1.get('dropped_slot_synonyms', False)}")
    print(f"  legacy_role_lookup dropped:  {f1.get('dropped_legacy_role_lookup', False)}")

    # Fix 2
    f2 = results.get("fix2", {})
    print(f"\n[Fix 2 — roles table]")
    print(f"  rows upserted:               {f2.get('upserted', 0)}")
    print(f"  total roles:                 {f2.get('total_count_after', '?')} (expected 20)")
    print(f"  content-bearing:             {f2.get('content_bearing_count', '?')} (expected 5)")
    print(f"  styling-behaviour:           {f2.get('styling_behaviour_count', '?')} (expected 15)")
    print(f"  link-href present:           {f2.get('link_href_present', False)}")
    print(f"  link-href classification:    {f2.get('link_href_classification', 'MISSING')}")
    v2 = f2.get("verification_passed", False)
    print(f"  VERIFICATION: {'PASS' if v2 else 'FAIL'}")
    if not v2:
        all_passed = False

    # Fix 3
    f3 = results.get("fix3", {})
    print(f"\n[Fix 3 — html_tag_to_core_block INSERT OR REPLACE]")
    print(f"  {f3.get('note', '')}")
    print(f"  html_tag_to_core_block rows: {f3.get('row_count', '?')}")

    # Fix 4
    f4 = results.get("fix4", {})
    print(f"\n[Fix 4 — property_suffixes.kind_override]")
    print(f"  column added (was absent):   {f4.get('column_added', False)}")
    print(f"  rows updated this run:       {f4.get('updated', 0)}")
    print(f"  not found in DB:             {f4.get('not_found', [])}")
    print(f"  kind_override populated:     {f4.get('populated_after', '?')} (expected 17)")
    v4 = f4.get("verification_passed", False)
    print(f"  VERIFICATION: {'PASS' if v4 else 'FAIL'}")
    if not v4:
        all_passed = False

    print(f"\n{'PASS' if all_passed else 'FAIL'} — {db_label}")
    return all_passed


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="D99 DB unification migration")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run migration and print report without committing")
    args = parser.parse_args()

    dbs = {
        "~/.claude (primary)":  Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
        "~/.agents (mirror)":   Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    }

    if args.dry_run:
        print("DRY-RUN MODE — no changes will be committed.")

    all_passed = True
    for label, db_path in dbs.items():
        results = run_migration(db_path, args.dry_run)
        passed = print_report(label, results)
        if not passed:
            all_passed = False

    print(f"\n{'='*70}")
    print(f"OVERALL: {'PASS' if all_passed else 'FAIL'}")
    if not all_passed:
        print("One or more verifications failed. See above for details.")
        sys.exit(1)
    if args.dry_run:
        print("Dry-run complete. Re-run without --dry-run to commit.")


if __name__ == "__main__":
    main()
