#!/usr/bin/env python3
"""Seed sgs-framework.db `block_compositions` from theme pattern files.

Walks theme/sgs-theme/patterns/*.php, extracts the `Slug:` + `Title:` +
`Description:` headers and every <!-- wp:sgs/<block> --> marker, then INSERTs
one row per pattern into block_compositions.

Idempotent semantics:
- Existing rows (matched by `auto_pattern_slug`) are LEFT ALONE. Any manual
  edits to composition_name / block_slugs / industry / page_type / description
  are preserved on re-run.
- New patterns produce a fresh INSERT.
- Removed patterns leave orphan rows; they are NOT auto-deleted (deletion is a
  separate maintenance concern).

This means the row count is monotonically non-decreasing across runs once the
table is populated -- "re-run preserves count" per the README contract.

Run with `--refresh-existing` to UPDATE existing rows with freshly-scanned
block_slugs / description (useful when pattern files drift and you want the DB
to catch up).
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

# parents: [0]=uimax-tools, [1]=scripts, [2]=sgs-blocks, [3]=plugins, [4]=repo root
REPO_ROOT = Path(__file__).resolve().parents[4]
PATTERNS_DIR = REPO_ROOT / "theme" / "sgs-theme" / "patterns"
DB_PATH = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

SLUG_HEADER_RE = re.compile(r"^\s*\*\s*Slug:\s*(\S+)", re.MULTILINE)
TITLE_HEADER_RE = re.compile(r"^\s*\*\s*Title:\s*(.+)", re.MULTILINE)
DESCRIPTION_HEADER_RE = re.compile(r"^\s*\*\s*Description:\s*(.+)", re.MULTILINE)
BLOCK_MARKER_RE = re.compile(r"<!--\s*wp:([a-z][a-z0-9-]*/[a-z][a-z0-9-]*)")


def normalise_slug(raw: str) -> str:
    """Normalise pattern slug to `sgs/<name>` form.

    Pattern PHP files use either `sgs/foo` or `sgs-theme/foo` in their Slug
    header. The DB stores the `sgs/<name>` form.
    """
    raw = raw.strip()
    if raw.startswith("sgs-theme/"):
        return "sgs/" + raw[len("sgs-theme/"):]
    return raw


def extract_pattern_info(php_file: Path) -> dict | None:
    """Read a pattern PHP file and return the composition payload.

    Returns None if the file is missing both Slug and Title headers (so we
    can skip incomplete fixtures cleanly).
    """
    text = php_file.read_text(encoding="utf-8", errors="replace")

    slug_match = SLUG_HEADER_RE.search(text)
    title_match = TITLE_HEADER_RE.search(text)
    if not slug_match or not title_match:
        return None

    slug = normalise_slug(slug_match.group(1))
    title = title_match.group(1).strip()
    description = ""
    desc_match = DESCRIPTION_HEADER_RE.search(text)
    if desc_match:
        description = desc_match.group(1).strip()

    # Track unique sgs-namespaced block openers in document order.
    block_slugs: list[str] = []
    seen: set[str] = set()
    for match in BLOCK_MARKER_RE.finditer(text):
        block_slug = match.group(1)
        if block_slug in seen:
            continue
        if block_slug.startswith("sgs/"):
            seen.add(block_slug)
            block_slugs.append(block_slug)

    return {
        "auto_pattern_slug": slug,
        "composition_name": title,
        "description": description,
        "block_slugs": block_slugs,
        "source_file": php_file.name,
    }


def upsert(
    conn: sqlite3.Connection,
    info: dict,
    refresh_existing: bool,
    dry_run: bool,
) -> str:
    """Insert if absent, optionally refresh content if present.

    Returns 'inserted' / 'updated' / 'unchanged' / 'skipped-existing'.
    """
    cur = conn.execute(
        "SELECT id, block_slugs, composition_name, description "
        "FROM block_compositions WHERE auto_pattern_slug = ?",
        (info["auto_pattern_slug"],),
    )
    existing = cur.fetchone()
    new_block_slugs_json = json.dumps(info["block_slugs"])

    if existing is None:
        if dry_run:
            return "inserted"
        conn.execute(
            "INSERT INTO block_compositions "
            "(composition_name, block_slugs, description, auto_pattern_slug) "
            "VALUES (?, ?, ?, ?)",
            (
                info["composition_name"],
                new_block_slugs_json,
                info["description"],
                info["auto_pattern_slug"],
            ),
        )
        return "inserted"

    if not refresh_existing:
        return "skipped-existing"

    row_id, db_slugs, db_name, db_desc = existing
    if (
        db_slugs == new_block_slugs_json
        and db_name == info["composition_name"]
        and (db_desc or "") == info["description"]
    ):
        return "unchanged"

    if dry_run:
        return "updated"
    conn.execute(
        "UPDATE block_compositions "
        "SET block_slugs = ?, composition_name = ?, description = ? "
        "WHERE id = ?",
        (new_block_slugs_json, info["composition_name"], info["description"], row_id),
    )
    return "updated"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Seed block_compositions from theme patterns.")
    parser.add_argument(
        "--refresh-existing",
        action="store_true",
        help="Update existing rows with freshly-scanned block_slugs and description.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change without writing to the DB.",
    )
    args = parser.parse_args(argv[1:])

    if not PATTERNS_DIR.exists():
        print(f"ERROR: patterns directory not found: {PATTERNS_DIR}", file=sys.stderr)
        return 1
    if not DB_PATH.exists():
        print(f"ERROR: sgs-framework.db not found: {DB_PATH}", file=sys.stderr)
        return 1

    php_files = sorted(PATTERNS_DIR.glob("*.php"))
    if not php_files:
        print(f"No pattern files found in {PATTERNS_DIR}")
        return 0

    conn = sqlite3.connect(DB_PATH)
    counters = {"inserted": 0, "updated": 0, "unchanged": 0, "skipped-existing": 0, "skipped-no-header": 0}
    skipped_files: list[str] = []

    try:
        for php in php_files:
            info = extract_pattern_info(php)
            if info is None:
                counters["skipped-no-header"] += 1
                skipped_files.append(php.name)
                continue
            result = upsert(conn, info, args.refresh_existing, args.dry_run)
            counters[result] += 1
        if not args.dry_run:
            conn.commit()
    finally:
        conn.close()

    mode = []
    if args.dry_run:
        mode.append("DRY RUN")
    if args.refresh_existing:
        mode.append("REFRESH MODE")
    mode_str = f" ({', '.join(mode)})" if mode else ""

    print(f"block_compositions seed complete{mode_str}:")
    print(f"  scanned          : {len(php_files)} pattern files")
    print(f"  inserted         : {counters['inserted']}")
    print(f"  updated          : {counters['updated']}")
    print(f"  unchanged        : {counters['unchanged']}")
    print(f"  skipped-existing : {counters['skipped-existing']}  (refresh-existing flag not set)")
    print(f"  skipped-no-header: {counters['skipped-no-header']}")
    if skipped_files:
        sample = ", ".join(skipped_files[:10])
        more = f" (+{len(skipped_files) - 10} more)" if len(skipped_files) > 10 else ""
        print(f"  no-header files  : {sample}{more}")

    conn = sqlite3.connect(DB_PATH)
    total = conn.execute("SELECT COUNT(*) FROM block_compositions").fetchone()[0]
    conn.close()
    print(f"  total rows now   : {total}")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
