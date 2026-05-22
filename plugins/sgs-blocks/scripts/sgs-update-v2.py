"""
sgs-update-v2.py — 9-stage holistic refresh of the SGS framework knowledge base.

Phase 4 of the architecture programme. Co-exists with the legacy 3-script setup
(update-db.py + generate-block-reference.py + sgs-update-uimax-sync.py) until
all 9 stages pass the Phase 4 gate, at which point the slash command entrypoint
swaps to this script.

Stages (per .claude/plans/phase-4-sgs-update-rebuild.md):
  1. sgs_codebase_scan      — walk src/blocks/*/block.json into sgs-framework.db
  2. core_gutenberg_cache_refresh — pull from 10 canonical upstream sources (Decision 30)
  3. wpcli_handbook_refresh — refresh wp-cli/handbook docs
  4. style_variation_sync   — walk sites/*/theme-snapshot.json (no-op pre-Phase-5a)
  5. slot_synonym_auto_seed — heuristic slot → block mapping
  6. block_replacement_mapping — verify blocks.replaces validity
  7. spec_doc_regen         — regenerate .claude/specs/02-SGS-BLOCKS-REFERENCE.md
  8. uimax_mirror           — mirror sgs-blocks → uimax CSV
  9. drift_gate             — warn on MAJOR.MINOR WP version mismatch

Usage:
    python sgs-update-v2.py [--stage N] [--refresh-upstream] [--dry-run] [--wp-version X.Y]

    --stage N          Run only stage N (1-9). Omit to run all stages.
    --refresh-upstream Stage 2 live network scrape (default reads cached .db files)
    --dry-run          Compute row counts without writing to DB or files
    --wp-version X.Y   WP version tag for Stage 2 (default: 7.0)
"""

import argparse
import hashlib
import json
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Windows / UTF-8 output fix — must be before any print()
sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SGS_DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
# REPO_ROOT — resolve relative to this script: plugins/sgs-blocks/scripts/sgs-update-v2.py
# Walk up: scripts/ → sgs-blocks/ → plugins/ → repo root
REPO_ROOT = Path(__file__).resolve().parents[3]

WP_VERSION_DEFAULT = "7.0"

# Files excluded from indexed_files scan
EXCLUDED_DIRS = {"node_modules", "build", "vendor", ".git", "__pycache__"}

# Parent-child block relationships (mirrors populate-db.py PARENT_CHILD)
PARENT_CHILD = {
    "accordion": ["accordion-item"],
    "tabs": ["tab"],
    "form": [
        "form-field-text", "form-field-email", "form-field-phone",
        "form-field-textarea", "form-field-select", "form-field-checkbox",
        "form-field-radio", "form-field-date", "form-field-number",
        "form-field-file", "form-field-hidden", "form-field-consent",
        "form-field-address", "form-field-tiles", "form-step", "form-review",
    ],
    "container": None,
}


# ---------------------------------------------------------------------------
# DB utilities
# ---------------------------------------------------------------------------

def open_db() -> sqlite3.Connection:
    """Open sgs-framework.db with WAL mode + Row factory."""
    if not SGS_DB.exists():
        print(f"FATAL: sgs-framework.db not found at {SGS_DB}", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(str(SGS_DB))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def ensure_schema_metadata(conn: sqlite3.Connection) -> None:
    """CREATE TABLE IF NOT EXISTS schema_metadata — Phase 4 addition."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_metadata (
            key   TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    conn.commit()


def upsert_metadata(conn: sqlite3.Connection, key: str, value: str) -> None:
    """INSERT OR REPLACE a schema_metadata key/value pair."""
    conn.execute(
        "INSERT OR REPLACE INTO schema_metadata (key, value) VALUES (?, ?)",
        (key, value),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _file_hash(path: Path) -> str:
    """Return SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _parent_for_block(block_dir_name: str) -> str | None:
    """Return parent slug for a block dir name, or None."""
    for parent, children in PARENT_CHILD.items():
        if children and block_dir_name in children:
            return f"sgs/{parent}"
    return None


# ---------------------------------------------------------------------------
# Stage 1 — SGS codebase scan
# PORTED FROM: ~/.agents/skills/sgs-wp-engine/scripts/update-db.py
#              (check_blocks + full-population logic via populate-db.py)
# Key difference: uses INSERT OR IGNORE throughout (not INSERT OR REPLACE)
# so idempotency is guaranteed — a second run produces zero new rows.
# ---------------------------------------------------------------------------

def stage_1_sgs_codebase_scan(conn: sqlite3.Connection, dry_run: bool = False) -> dict:
    """Walk src/blocks/*/block.json → INSERT OR IGNORE into blocks + block_attributes.

    Updates indexed_files mtime + content_hash.
    Updates schema_metadata.indexed_blocks_count after scan.

    Idempotent: second run produces zero new rows (INSERT OR IGNORE throughout).
    PORTED FROM: ~/.agents/skills/sgs-wp-engine/scripts/update-db.py + populate-db.py
    """
    blocks_dir = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
    if not blocks_dir.exists():
        return {"error": f"blocks dir not found: {blocks_dir}"}

    scanned = 0
    new_blocks = 0
    new_attrs = 0
    new_supports = 0
    indexed_inserted = 0
    indexed_updated = 0
    indexed_skipped = 0

    c = conn.cursor()

    for block_dir in sorted(blocks_dir.iterdir()):
        if not block_dir.is_dir() or block_dir.name in EXCLUDED_DIRS:
            continue

        block_json_path = block_dir / "block.json"
        if not block_json_path.exists():
            continue

        # --- Parse block.json ---
        try:
            with open(block_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            print(f"  WARNING: failed to parse {block_json_path}: {exc}")
            continue

        slug = data.get("name", f"sgs/{block_dir.name}")
        title = data.get("title", block_dir.name)
        category = data.get("category", "sgs-blocks")
        description = data.get("description", "")
        has_render = (block_dir / "render.php").exists()
        has_view = any(
            (block_dir / fn).exists()
            for fn in ("view.js", "view.ts", "view.jsx", "view.tsx")
        )
        block_type = "dynamic" if has_render else "static"
        parent = _parent_for_block(block_dir.name)

        if dry_run:
            # In dry-run: count what EXISTS vs what WOULD be inserted
            existing = c.execute(
                "SELECT slug FROM blocks WHERE slug = ? AND source = 'sgs'", (slug,)
            ).fetchone()
            if existing is None:
                new_blocks += 1
            scanned += 1
            # Count attributes that WOULD be new
            attrs = data.get("attributes", {})
            for attr_name, attr_def in attrs.items():
                if not isinstance(attr_def, dict):
                    continue
                ex_attr = c.execute(
                    "SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ? AND source = 'sgs'",
                    (slug, attr_name),
                ).fetchone()
                if ex_attr is None:
                    new_attrs += 1
            continue

        # --- INSERT OR IGNORE block ---
        result = c.execute(
            """
            INSERT OR IGNORE INTO blocks
                (slug, title, category, type, status, description,
                 has_view_script, has_render_php, parent_block, source, updated_at)
            VALUES (?, ?, ?, ?, 'built', ?, ?, ?, ?, 'sgs', ?)
            """,
            (
                slug, title, category, block_type, description,
                1 if has_view else 0, 1 if has_render else 0,
                parent, datetime.now(timezone.utc).isoformat(),
            ),
        )
        new_blocks += result.rowcount
        scanned += 1

        # --- INSERT OR IGNORE attributes ---
        attrs = data.get("attributes", {})
        for attr_name, attr_def in attrs.items():
            if not isinstance(attr_def, dict):
                continue
            attr_type = attr_def.get("type", "string")
            default = attr_def.get("default")
            enum_vals = attr_def.get("enum")
            is_responsive = (
                1 if f"{attr_name}Tablet" in attrs or f"{attr_name}Mobile" in attrs else 0
            )
            result = c.execute(
                """
                INSERT OR IGNORE INTO block_attributes
                    (block_slug, attr_name, attr_type, default_value, enum_values,
                     description, is_responsive, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'sgs')
                """,
                (
                    slug, attr_name, attr_type,
                    json.dumps(default) if default is not None else None,
                    json.dumps(enum_vals) if enum_vals else None,
                    attr_def.get("description", ""),
                    is_responsive,
                ),
            )
            new_attrs += result.rowcount

        # --- INSERT OR IGNORE supports ---
        supports = data.get("supports", {})
        for support_name, support_val in supports.items():
            result = c.execute(
                """
                INSERT OR IGNORE INTO block_supports
                    (block_slug, support_name, support_value, source)
                VALUES (?, ?, ?, 'sgs')
                """,
                (slug, support_name, json.dumps(support_val)),
            )
            new_supports += result.rowcount

        # --- Update indexed_files for this block.json ---
        try:
            stat = block_json_path.stat()
            mtime_ms = int(stat.st_mtime * 1000)
            content_hash = _file_hash(block_json_path)
            rel_path = str(block_json_path.relative_to(REPO_ROOT)).replace("\\", "/")

            existing_row = c.execute(
                "SELECT content_hash FROM indexed_files WHERE file_path = ?",
                (rel_path,),
            ).fetchone()

            if existing_row is None:
                c.execute(
                    """
                    INSERT INTO indexed_files
                        (file_path, source, mtime_ms, content_hash, last_indexed)
                    VALUES (?, 'sgs', ?, ?, CURRENT_TIMESTAMP)
                    """,
                    (rel_path, mtime_ms, content_hash),
                )
                indexed_inserted += 1
            elif existing_row[0] != content_hash:
                c.execute(
                    """
                    UPDATE indexed_files
                    SET mtime_ms = ?, content_hash = ?, last_indexed = CURRENT_TIMESTAMP
                    WHERE file_path = ?
                    """,
                    (mtime_ms, content_hash, rel_path),
                )
                indexed_updated += 1
            else:
                indexed_skipped += 1

        except Exception as exc:
            print(f"  WARNING: indexed_files update failed for {block_json_path}: {exc}")

    if not dry_run:
        conn.commit()

        # Update schema_metadata.indexed_blocks_count
        count_row = c.execute(
            "SELECT COUNT(*) FROM blocks WHERE source = 'sgs'"
        ).fetchone()
        total_sgs_blocks = count_row[0]
        upsert_metadata(conn, "indexed_blocks_count", str(total_sgs_blocks))

        summary = (
            f"Stage 1: {scanned} blocks scanned, "
            f"{new_blocks} new block rows, {new_attrs} new attr rows, "
            f"{new_supports} new support rows inserted. "
            f"indexed_files: {indexed_inserted} inserted, {indexed_updated} updated, "
            f"{indexed_skipped} unchanged."
        )
        if new_blocks == 0 and new_attrs == 0 and new_supports == 0:
            summary = (
                f"Stage 1: {scanned} blocks scanned, 0 new rows inserted (DB current). "
                f"indexed_files: {indexed_inserted} inserted, {indexed_updated} updated, "
                f"{indexed_skipped} unchanged."
            )
        print(summary)
    else:
        print(
            f"Stage 1 [dry-run]: {scanned} blocks scanned. "
            f"Would insert: {new_blocks} new block rows, {new_attrs} new attr rows."
        )

    return {
        "scanned": scanned,
        "new_blocks": new_blocks,
        "new_attrs": new_attrs,
        "new_supports": new_supports,
        "indexed_inserted": indexed_inserted,
        "indexed_updated": indexed_updated,
        "indexed_skipped": indexed_skipped,
        "dry_run": dry_run,
    }


# ---------------------------------------------------------------------------
# Stage 2 — Core/Gutenberg cache refresh (STUB — Step 4.4)
# ---------------------------------------------------------------------------

def stage_2_core_gutenberg_cache_refresh(
    conn: sqlite3.Connection,
    refresh_upstream: bool = False,
    wp_version: str = WP_VERSION_DEFAULT,
    dry_run: bool = False,
) -> dict:
    """STUB — implemented in Step 4.4.

    Two modes:
    Mode A (default, no --refresh-upstream): read cached ~/.wp-blockmarkup-mcp/blocks.db
    + ~/.wp-devdocs-mcp/hooks.db.
    Mode B (--refresh-upstream): scrape 10 canonical sources (Decision 30).
    """
    print("[stage 2] STUB — implemented in Step 4.4")
    return {"rows_inserted": 0, "stub": True}


# ---------------------------------------------------------------------------
# Stage 3 — WP-CLI handbook refresh (STUB — Step 4.5)
# ---------------------------------------------------------------------------

def stage_3_wpcli_handbook_refresh(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """STUB — implemented in Step 4.5."""
    print("[stage 3] STUB — implemented in Step 4.5")
    return {"rows_inserted": 0, "stub": True}


# ---------------------------------------------------------------------------
# Stage 4 — Style variation sync (STUB — Step 4.6)
# No-op pre-Phase-5a. Observational only — logs token gaps, no DB writes.
# ---------------------------------------------------------------------------

def stage_4_style_variation_sync(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """STUB — implemented in Step 4.6.

    # TODO: activate writes after Phase 5a ships.
    Pre-Phase-5a: walks sites/*/theme-snapshot.json (may not exist),
    logs token gaps to reports/phase4-variation-token-gaps.txt, no DB writes.
    """
    print("[stage 4] STUB — implemented in Step 4.6 (no-op pre-Phase-5a)")
    return {"rows_inserted": 0, "stub": True}


# ---------------------------------------------------------------------------
# Stage 5 — Slot synonym auto-seed (STUB — Step 4.5)
# ---------------------------------------------------------------------------

def stage_5_slot_synonym_auto_seed(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """STUB — implemented in Step 4.5.

    Heuristic: for each slot_synonyms row where standalone_block IS NULL,
    check if a SGS block with matching name pattern exists. Log proposals
    to reports/phase4-slot-synonym-proposals.txt for manual review.
    """
    print("[stage 5] STUB — implemented in Step 4.5")
    return {"rows_inserted": 0, "stub": True}


# ---------------------------------------------------------------------------
# Stage 6 — Block replacement mapping (STUB — Step 4.5)
# ---------------------------------------------------------------------------

def stage_6_block_replacement_mapping(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """STUB — implemented in Step 4.5.

    Walks blocks.replaces column; verifies each mapping still valid against
    current blocks WHERE source='native_wp'. Logs stale mappings to
    reports/phase4-stale-replacements.txt. No automated deletions.
    """
    print("[stage 6] STUB — implemented in Step 4.5")
    return {"rows_inserted": 0, "stub": True}


# ---------------------------------------------------------------------------
# Stage 7 — Spec doc regeneration
# PORTED FROM: plugins/sgs-blocks/scripts/generate-block-reference.py
# Strategy: delegates to existing script via subprocess.run() — the script
# uses its own DB connection path resolution and has complex rendering logic.
# Stage 7: delegates to existing generate-block-reference.py until full port.
# ---------------------------------------------------------------------------

def stage_7_spec_doc_regen(dry_run: bool = False) -> dict:
    """Regenerate .claude/specs/02-SGS-BLOCKS-REFERENCE.md from DB.

    PORTED FROM: plugins/sgs-blocks/scripts/generate-block-reference.py
    Delegates to existing script via subprocess — avoids duplicating the DB
    path resolution and Markdown rendering logic. Idempotent by design
    (file is always overwritten from DB state).
    """
    script = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts" / "generate-block-reference.py"
    if not script.exists():
        return {"error": f"generate-block-reference.py not found at {script}"}

    output_path = REPO_ROOT / ".claude" / "specs" / "02-SGS-BLOCKS-REFERENCE.md"

    if dry_run:
        # Read DB directly to get block count for dry-run report
        if SGS_DB.exists():
            try:
                _conn = sqlite3.connect(str(SGS_DB))
                total = _conn.execute(
                    "SELECT COUNT(*) FROM blocks"
                ).fetchone()[0]
                sgs_count = _conn.execute(
                    "SELECT COUNT(*) FROM blocks WHERE source = 'sgs'"
                ).fetchone()[0]
                _conn.close()
                print(
                    f"Stage 7 [dry-run]: would regenerate spec from {total} total block rows "
                    f"({sgs_count} sgs + {total - sgs_count} other sources)"
                )
                return {"dry_run": True, "total_blocks": total, "sgs_blocks": sgs_count}
            except Exception as exc:
                print(f"Stage 7 [dry-run]: DB read error — {exc}")
                return {"dry_run": True, "error": str(exc)}
        print("Stage 7 [dry-run]: would regenerate spec (DB not found for count)")
        return {"dry_run": True}

    result = subprocess.run(
        [sys.executable, str(script), "--db", str(SGS_DB), "--output", str(output_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        error_msg = (result.stderr or result.stdout or "").strip()[:400]
        print(f"Stage 7 ERROR: generate-block-reference.py failed — {error_msg}")
        return {"error": error_msg, "exit_code": result.returncode}

    output_line = (result.stdout or "").strip()
    print(f"Stage 7: {output_line}")

    # Validate: output file must exist
    if not output_path.exists():
        return {"error": "spec file not written despite exit 0"}

    # Extract block count from output line e.g. "Wrote: ... (67 blocks, ...)"
    blocks_count = None
    import re
    m = re.search(r"\((\d+) blocks", output_line)
    if m:
        blocks_count = int(m.group(1))

    return {
        "output": str(output_path),
        "blocks": blocks_count,
        "exit_code": result.returncode,
    }


# ---------------------------------------------------------------------------
# Stage 8 — uimax mirror
# PORTED FROM: plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py
# Strategy: delegates to existing script via subprocess.run() — the script
# imports uimax_write.py (a sibling module) and has complex validation logic.
# Stage 8: delegates to existing sgs-update-uimax-sync.py until full port.
# ---------------------------------------------------------------------------

def stage_8_uimax_mirror(dry_run: bool = False) -> dict:
    """Mirror sgs-blocks → ~/.agents/skills/ui-ux-pro-max/data/component-libraries.csv.

    PORTED FROM: plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py
    Delegates to existing script via subprocess — avoids reimporting uimax_write.py
    (a sibling module with its own validation chokepoint). Only Stage 3 of that
    script (the DB→CSV sync) is invoked; Stage 4 (animation gap scan) is retired
    (sgs-framework.db animations table dropped at Step 6b 2026-05-14).
    Stage 8: delegates to existing sgs-update-uimax-sync.py until full port.
    """
    script = (
        REPO_ROOT
        / "plugins"
        / "sgs-blocks"
        / "scripts"
        / "uimax-tools"
        / "sgs-update-uimax-sync.py"
    )
    if not script.exists():
        return {"error": f"sgs-update-uimax-sync.py not found at {script}"}

    cmd = [sys.executable, str(script), "--repo", str(REPO_ROOT), "--stage", "3"]
    if dry_run:
        cmd.append("--dry-run")

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=str(REPO_ROOT),
    )

    output = (result.stdout or "").strip()
    if result.returncode != 0:
        error_msg = (result.stderr or output or "").strip()[:400]
        print(f"Stage 8 ERROR: sgs-update-uimax-sync.py failed — {error_msg}")
        return {"error": error_msg, "exit_code": result.returncode}

    # Print the subprocess output so it appears in the parent's stream
    if output:
        for line in output.splitlines():
            print(f"  {line}")

    # Parse key metric from output: "Newly inserted to uimax DB: N"
    newly_inserted = None
    skipped = None
    import re
    m_new = re.search(r"Newly inserted to uimax DB:\s*(\d+)", output)
    m_skip = re.search(r"Skipped \(preserved\):\s*(\d+)", output)
    m_dry = re.search(r"SGS blocks in sgs-framework:\s*(\d+)", output)
    if m_new:
        newly_inserted = int(m_new.group(1))
    if m_skip:
        skipped = int(m_skip.group(1))

    status = "dry-run" if dry_run else "synced"
    return {
        "status": status,
        "newly_inserted": newly_inserted,
        "skipped_existing": skipped,
        "exit_code": result.returncode,
    }


# ---------------------------------------------------------------------------
# Stage 9 — Drift gate (STUB — Step 4.6)
# ---------------------------------------------------------------------------

def stage_9_drift_gate(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """STUB — implemented in Step 4.6.

    Reads schema_metadata.wp_version_indexed; fetches live site WP version
    via SSH `wp eval 'echo get_bloginfo("version");'`; compares MAJOR.MINOR only.
    Emits warning on MAJOR.MINOR mismatch, passes silently on match.

    # TODO: wire into deploy hook at .claude/hooks/ as a future integration point.
    """
    print("[stage 9] STUB — implemented in Step 4.6")
    return {"matches": True, "stub": True}


# ---------------------------------------------------------------------------
# Main dispatcher
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="SGS framework knowledge base — 9-stage holistic refresh",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--stage",
        type=int,
        choices=range(1, 10),
        metavar="N",
        help="Run a single stage only (1-9). Omit to run all stages.",
    )
    parser.add_argument(
        "--refresh-upstream",
        action="store_true",
        help="Stage 2 live network scrape (default reads cached .db files)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute row counts without writing to DB or files",
    )
    parser.add_argument(
        "--wp-version",
        default=WP_VERSION_DEFAULT,
        help=f"WP version tag for Stage 2 (default: {WP_VERSION_DEFAULT})",
    )
    args = parser.parse_args()

    print(f"sgs-update-v2.py — repo: {REPO_ROOT}")
    print(f"sgs-framework.db: {SGS_DB}")
    if args.dry_run:
        print("[DRY RUN — no DB or file writes]")
    print()

    conn = open_db()
    ensure_schema_metadata(conn)

    stages_to_run = [args.stage] if args.stage else list(range(1, 10))

    results: dict[int, dict] = {}
    for stage_num in stages_to_run:
        print(f"\n{'=' * 50}")
        print(f"=== Stage {stage_num} ===")
        print(f"{'=' * 50}")

        if stage_num == 1:
            results[1] = stage_1_sgs_codebase_scan(conn, dry_run=args.dry_run)
        elif stage_num == 2:
            results[2] = stage_2_core_gutenberg_cache_refresh(
                conn,
                refresh_upstream=args.refresh_upstream,
                wp_version=args.wp_version,
                dry_run=args.dry_run,
            )
        elif stage_num == 3:
            results[3] = stage_3_wpcli_handbook_refresh(conn, dry_run=args.dry_run)
        elif stage_num == 4:
            results[4] = stage_4_style_variation_sync(conn, dry_run=args.dry_run)
        elif stage_num == 5:
            results[5] = stage_5_slot_synonym_auto_seed(conn, dry_run=args.dry_run)
        elif stage_num == 6:
            results[6] = stage_6_block_replacement_mapping(conn, dry_run=args.dry_run)
        elif stage_num == 7:
            results[7] = stage_7_spec_doc_regen(dry_run=args.dry_run)
        elif stage_num == 8:
            results[8] = stage_8_uimax_mirror(dry_run=args.dry_run)
        elif stage_num == 9:
            results[9] = stage_9_drift_gate(conn, dry_run=args.dry_run)

    conn.close()

    # Summary
    print(f"\n{'=' * 50}")
    print("=== Summary ===")
    print(f"{'=' * 50}")
    for stage_num, result in results.items():
        status = result.get("error", "ok")
        if result.get("stub"):
            status = "STUB"
        elif result.get("dry_run"):
            status = "dry-run"
        elif result.get("error"):
            status = f"ERROR: {result['error'][:80]}"
        print(f"  Stage {stage_num}: {status} — {result}")

    print()


if __name__ == "__main__":
    main()
