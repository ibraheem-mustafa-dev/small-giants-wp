"""sgs-update Stage 3 + Stage 4 — uimax sync extension.

Stage 3: Sync sgs-framework.db `blocks` into the uimax DB
`component_libraries` table at
`~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db`. The DB is the
canonical source of truth (richer schema, Rosetta Stone `equivalent_implementations`
payload). After the DB write, this script triggers
`update-db.py regenerate-csvs` which writes EVERY DB table back to its CSV
mirror. CSVs become regenerated artefacts, not source-of-record. This closes
the silent-data-loss vector where `update-db.py compile-sqlite` rebuilds the
DB from stale CSVs and wipes DB-only columns / rows.

Stage 3 logic (preserves existing Rosetta Stone):
- Read sgs-framework.db `blocks` (canonical SGS block list)
- For each block: if already in uimax DB component_libraries by component_key,
  SKIP (preserve any Rosetta Stone payload populated by prior write paths)
- If not present: INSERT via the `uimax_write.py` helper with a Rosetta Stone
  scaffold (`equivalent_implementations.sgs_block` populated)
- After all DB writes: invoke `update-db.py regenerate-csvs` to mirror EVERY
  DB table back to its CSV. Single chokepoint — no per-table regen logic
  duplicated here.

Stage 4: Scan the `animations` table for `is_gap_candidate = 1` rows and emit
a markdown report at `<repo>/reports/uimax-gap-candidates-<date>.md`. Adds
`is_gap_candidate` and related columns to the `animations` table on first run
if they are missing (schema migration -- safe to run multiple times).

Note (Step 6b 2026-05-14): the sgs-framework.db `animations` table was
retired (0 rows; dropped). When the table is absent, Stage 4 short-circuits
and returns `{"status": "retired"}`. The richer `uimax.animations` table
(63 rows in `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db`) is
the live store for scraped animations and is unaffected.

Called by `/sgs-update` after Stages 1 and 2.

Usage:
    python sgs-update-uimax-sync.py [--repo <path>] [--stage 3|4|all]

Defaults to --stage all and --repo = repo root inferred from script location.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Resolve fixed paths.
SGS_DB = Path(os.path.expanduser("~/.agents/skills/sgs-wp-engine/sgs-framework.db"))
UIMAX_DB = Path(
    os.path.expanduser("~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db")
)
UPDATE_DB_SCRIPT = Path(
    os.path.expanduser("~/.agents/skills/ui-ux-pro-max/scripts/update-db.py")
)

# Make uimax_write.py importable.
HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from uimax_write import ValidationError, validate_and_write  # noqa: E402

# Animations columns the /uimax-scrape-animation skill expects to write.
# Migration runs safely multiple times -- only adds columns that are missing.
ANIMATIONS_NEW_COLUMNS = [
    ("is_gap_candidate", "INTEGER DEFAULT 0"),
    ("gap_reason", "TEXT"),
    ("sgs_block", "TEXT"),
    ("sgs_animation_attribute", "TEXT"),
    ("equivalent_implementations", "TEXT"),  # JSON blob
]


def ensure_animations_columns(conn: sqlite3.Connection) -> list[str]:
    """Add columns expected by /uimax-scrape-animation if missing. Returns list of added columns."""
    existing = {r[1] for r in conn.execute("PRAGMA table_info(animations)")}
    added: list[str] = []
    for col, defn in ANIMATIONS_NEW_COLUMNS:
        if col not in existing:
            conn.execute(f"ALTER TABLE animations ADD COLUMN {col} {defn}")
            added.append(col)
    if added:
        conn.commit()
    return added


def _build_sgs_payload(slug: str, title: str, description: str) -> dict:
    """Compose a uimax component_libraries row payload for one SGS block."""
    short_slug = slug.replace("sgs/", "")
    summary = (description or "").replace("\n", " ").strip()
    rosetta = {
        "sgs_block": slug,
        "html_css": None,
        "bootstrap": None,
        "shadcn": None,
        "tailwind": None,
        "react_generic": None,
        "lovable": None,
        "v0": None,
        "bolt": None,
    }
    return {
        "library": "SGS Blocks",
        "component_name": title or slug,
        "component_key": slug,
        "kind": "block",
        "summary": summary,
        "wai_aria_url": "",
        "framework": "WordPress (Gutenberg)",
        "source_url": (
            "https://github.com/Ibraheem-Mustafa/small-giants-wp/tree/main/"
            f"plugins/sgs-blocks/src/blocks/{short_slug}"
        ),
        "provenance": f"sgs-blocks/{short_slug}",
        "mood": None,
        "style": None,
        "industry": None,
        "equivalent_implementations": json.dumps(rosetta, ensure_ascii=False),
    }


def stage_3_sync_blocks_to_db_and_csv(dry_run: bool = False) -> dict:
    """Stage 3: write SGS blocks to uimax DB (canonical), then regenerate CSV from DB.

    Preserves existing rows by checking component_key before INSERT. Existing
    Rosetta Stone payloads on already-present rows are left intact.
    """
    if not SGS_DB.exists():
        return {"status": "error", "reason": f"sgs-framework.db not found at {SGS_DB}"}
    if not UIMAX_DB.exists():
        return {"status": "error", "reason": f"uimax DB not found at {UIMAX_DB}"}

    # Phase A: pull canonical SGS block list from sgs-framework.db.
    conn_sgs = sqlite3.connect(SGS_DB)
    try:
        sgs_rows = conn_sgs.execute(
            "SELECT slug, title, description FROM blocks "
            "WHERE status != 'deprecated' OR status IS NULL"
        ).fetchall()
    finally:
        conn_sgs.close()

    # Phase B: connect to uimax DB, find existing SGS Blocks rows.
    conn_uimax = sqlite3.connect(UIMAX_DB)
    conn_uimax.row_factory = sqlite3.Row
    existing_keys = {
        r[0] for r in conn_uimax.execute(
            "SELECT component_key FROM component_libraries WHERE library = 'SGS Blocks'"
        )
    }

    # Discover the uimax DB schema for component_libraries (so INSERT honours all columns).
    db_columns = [r[1] for r in conn_uimax.execute("PRAGMA table_info(component_libraries)")]

    insert_count = 0
    skip_count = 0
    insert_errors: list[str] = []
    inserted_slugs: list[str] = []

    if not dry_run:
        # Close the inspection connection so validate_and_write can open its own.
        # SQLite WAL mode tolerates the brief overlap but the explicit close keeps
        # the chokepoint contract clean: every uimax write runs through one path.
        # Phase 6 v2 Step 5 (extended scope 2026-05-14): route the
        # component_libraries write through validate_and_write so the Rosetta
        # Stone validator gates each INSERT through a single chokepoint.
        conn_uimax.close()
        for slug, title, description in sgs_rows:
            if slug in existing_keys:
                skip_count += 1
                continue
            payload = _build_sgs_payload(slug, title, description)
            # Restrict payload to columns that exist in the DB schema (defensive).
            row_payload = {k: v for k, v in payload.items() if k in db_columns}
            try:
                validate_and_write(UIMAX_DB, "component_libraries", row_payload)
            except ValidationError as exc:
                insert_errors.append(f"{slug}: {exc.errors}")
                continue
            insert_count += 1
            inserted_slugs.append(slug)
        # Re-open the connection for the Phase C row count below.
        conn_uimax = sqlite3.connect(UIMAX_DB)
        conn_uimax.row_factory = sqlite3.Row

    # Phase C: row count for reporting.
    db_total_rows = conn_uimax.execute(
        "SELECT COUNT(*) FROM component_libraries"
    ).fetchone()[0]
    conn_uimax.close()

    # Phase D: regenerate ALL CSVs from DB via the canonical subcommand. Single
    # chokepoint — all DB tables mirror to their CSVs in one pass, not just
    # component-libraries.csv. This is what closes the compile-sqlite data-loss
    # vector across every uimax table.
    regen_status = "skipped (dry-run)"
    if not dry_run:
        if not UPDATE_DB_SCRIPT.exists():
            regen_status = f"FAILED — update-db.py not found at {UPDATE_DB_SCRIPT}"
        else:
            proc = subprocess.run(
                [sys.executable, str(UPDATE_DB_SCRIPT), "regenerate-csvs"],
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode == 0:
                # Last line of output reports total: "Regenerated N CSVs from DB..."
                tail = (proc.stdout or "").strip().splitlines()
                regen_status = tail[-1] if tail else "regenerated (no output)"
            else:
                regen_status = (
                    f"FAILED (exit {proc.returncode}): "
                    f"{(proc.stderr or proc.stdout or '').strip()[:200]}"
                )

    return {
        "status": "synced" if not dry_run else "dry-run",
        "sgs_blocks_in_sgs_framework": len(sgs_rows),
        "sgs_blocks_already_in_uimax_db": len(existing_keys),
        "newly_inserted": insert_count,
        "skipped_existing": skip_count,
        "insert_errors": insert_errors,
        "uimax_component_libraries_total": db_total_rows,
        "csv_regen": regen_status,
        "inserted_slugs": inserted_slugs,
        "db_schema_columns": db_columns,
    }


def stage_4_scan_gap_candidates(repo: Path, dry_run: bool = False) -> dict:
    """Stage 4: scan animations.is_gap_candidate=1 rows and emit a markdown report.

    First migrates the animations table if columns are missing.
    Returns {"status": "retired"} if the animations table has been dropped (Step 6b).
    """
    if not SGS_DB.exists():
        return {"status": "error", "reason": f"sgs-framework.db not found at {SGS_DB}"}

    conn = sqlite3.connect(SGS_DB)
    _tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if "animations" not in _tables:
        conn.close()
        return {"status": "retired", "reason": "animations table dropped (Step 6b); no gap-candidate scan needed"}

    try:
        added_cols = ensure_animations_columns(conn)
        rows = conn.execute(
            "SELECT id, animation_type, gap_reason, source_url FROM animations "
            "WHERE is_gap_candidate = 1 ORDER BY id"
        ).fetchall()
    finally:
        conn.close()

    if dry_run:
        return {
            "status": "dry-run",
            "schema_added_columns": added_cols,
            "gap_candidates_found": len(rows),
        }

    report_dir = repo / "reports"
    report_dir.mkdir(exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")
    report_path = report_dir / f"uimax-gap-candidates-{today}.md"

    lines: list[str] = []
    lines.append(f"# uimax animation gap candidates — {today}")
    lines.append("")
    if added_cols:
        lines.append(
            f"**Schema migration applied:** added {len(added_cols)} columns to "
            f"`animations` table this run: {', '.join(added_cols)}."
        )
        lines.append("")
    lines.append(f"Total gap candidates: **{len(rows)}**")
    lines.append("")
    if rows:
        lines.append("| ID | animation_type | gap_reason | source_url |")
        lines.append("|----|----------------|-----------|------------|")
        for rid, atype, reason, src in rows:
            atype = atype or ""
            reason = (reason or "").replace("|", "\\|").replace("\n", " ")
            src = src or ""
            lines.append(f"| {rid} | {atype} | {reason} | {src} |")
    else:
        lines.append("No gap candidates currently flagged. Either:")
        lines.append("- No animations have been scraped yet via /uimax-scrape-animation, OR")
        lines.append("- All scraped animations matched existing SGS animation attributes")
    lines.append("")
    lines.append(
        "**Next action for each gap:** read the gap_reason, design the matching "
        "SGS block attribute (animationType / hoverScale / scrollReveal / etc.), "
        "ship it, then re-run scrape on the source to mark the row resolved."
    )

    report_path.write_text("\n".join(lines), encoding="utf-8")

    return {
        "status": "scanned",
        "schema_added_columns": added_cols,
        "gap_candidates_found": len(rows),
        "report_path": str(report_path),
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="sgs-update Stage 3+4 uimax sync")
    parser.add_argument(
        "--repo",
        default=str(Path(__file__).resolve().parents[4]),
        help="Project repo root (default: inferred from script location)",
    )
    parser.add_argument(
        "--stage",
        choices=["3", "4", "all"],
        default="all",
        help="Run only Stage 3, only Stage 4, or both (default)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Don't write changes; just report")
    args = parser.parse_args(argv[1:])

    repo = Path(args.repo).resolve()

    print(f"sgs-update Stage 3+4 — repo: {repo}")
    print(f"sgs-framework.db: {SGS_DB}")
    print(f"uimax DB:         {UIMAX_DB}")
    print(f"CSV regen tool:   {UPDATE_DB_SCRIPT} regenerate-csvs")
    print()

    results: dict = {}

    if args.stage in ("3", "all"):
        print("Stage 3 — Sync SGS blocks to uimax DB (canonical), regenerate CSV mirror")
        r3 = stage_3_sync_blocks_to_db_and_csv(dry_run=args.dry_run)
        results["stage_3"] = r3
        if r3.get("status") == "error":
            print(f"  ERROR: {r3['reason']}")
            return 1
        print(f"  SGS blocks in sgs-framework: {r3['sgs_blocks_in_sgs_framework']}")
        print(f"  Already in uimax DB:         {r3['sgs_blocks_already_in_uimax_db']}")
        if not args.dry_run:
            print(f"  Newly inserted to uimax DB:  {r3['newly_inserted']}")
            print(f"  Skipped (preserved):         {r3['skipped_existing']}")
            print(f"  uimax component_libraries:   {r3['uimax_component_libraries_total']} rows total")
            print(f"  CSV regen (all tables):      {r3['csv_regen']}")
        if r3.get("insert_errors"):
            print(f"  Insert errors: {len(r3['insert_errors'])}")
            for err in r3['insert_errors'][:5]:
                print(f"    {err}")

    if args.stage in ("4", "all"):
        print("Stage 4 — Scan animations for gap candidates")
        r4 = stage_4_scan_gap_candidates(repo, dry_run=args.dry_run)
        results["stage_4"] = r4
        if r4.get("status") == "retired":
            print(f"  SKIPPED: {r4['reason']}")
        elif r4.get("status") == "error":
            print(f"  ERROR: {r4['reason']}")
            return 1
        added = r4.get("schema_added_columns") or []
        if added:
            print(f"  Schema migration: added columns {added} to animations table")
        if args.dry_run:
            print(f"  [dry-run] would scan; {r4['gap_candidates_found']} candidates currently flagged")
        else:
            print(f"  Found {r4['gap_candidates_found']} gap candidates; "
                  f"report at {r4['report_path']}")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
