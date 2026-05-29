"""
sgs-update-v2.py — 10-stage holistic refresh of the SGS framework knowledge base.

Phase 4 of the architecture programme. Co-exists with the legacy 3-script setup
(update-db.py + generate-block-reference.py + sgs-update-uimax-sync.py) until
all 10 stages pass the Phase 4 gate, at which point the slash command entrypoint
swaps to this script.

Stages (per .claude/plans/phase-4-sgs-update-rebuild.md):
  1. sgs_codebase_scan      — walk src/blocks/*/block.json into sgs-framework.db
                              (INSERT new rows + UPDATE drifted rows when block.json changes)
  2. core_gutenberg_cache_refresh — pull from 10 canonical upstream sources (Decision 30)
  3. wpcli_handbook_refresh — refresh wp-cli/handbook docs [RETIRED — merged into Stage 2]
  4. style_variation_sync   — walk sites/*/theme-snapshot.json (no-op pre-Phase-5a)
  5. slot_synonym_auto_seed — heuristic slot → block mapping
  6. block_replacement_mapping — verify blocks.replaces validity
  7. spec_doc_regen         — regenerate .claude/specs/02-SGS-BLOCKS-REFERENCE.md
  8. uimax_mirror           — mirror sgs-blocks → uimax CSV
  9. drift_gate             — warn on MAJOR.MINOR WP version mismatch
 10. prune_orphans          — delete orphan rows across three categories:
                              (a) BLOCK-LEVEL: block_slug absent from `blocks` table
                                  (block retired/renamed — deletes stale attrs/supports/caps)
                              (b) STALE-SUPPORTS: block exists but support_name removed from
                                  block.json (default: DELETE; opt-in conservative: mark is_stale=1)
                              (c) ATTR-LEVEL: block exists but attr_name removed from block.json
                                  (ghost rows Stage 1 never removes — always deleted regardless
                                  of prune_mode; block_attributes has no is_stale column)
                              Operates on both .agents + .claude DBs.

Usage:
    python sgs-update-v2.py [--stage N] [--dry-run] [--wp-version X.Y] [--prune-mode MODE]

    --stage N               Run only stage N (1-10; stage 3 is retired). Omit to run all.
    --dry-run               Compute row counts without writing to DB or files
    --wp-version X.Y        WP version tag for Stage 2 (default: 7.0)
    --prune-mode MODE       Stage 10 only: 'aggressive' (default) DELETEs stale support rows.
                            'conservative' sets is_stale=1 instead (opt-in cautious mode).
                            Attr-level orphans are always deleted regardless of prune_mode
                            (block_attributes has no is_stale column).
"""

import argparse
import base64
import hashlib
import json
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

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

# Re-used SQL literals (kept as constants so they stay in sync across call sites)
_SELECT_BLOCK_EXISTS_NATIVE_WP = "SELECT 1 FROM blocks WHERE slug=? AND source='native_wp'"
_SELECT_DOC_EXISTS_NATIVE_WP = "SELECT 1 FROM docs WHERE slug=? AND source='native_wp'"
_SELECT_BLOCK_ATTR_EXISTS_NATIVE_WP = "SELECT 1 FROM block_attributes WHERE block_slug=? AND attr_name=? AND source='native_wp'"
_SELECT_BLOCK_SUPPORT_EXISTS_NATIVE_WP = "SELECT 1 FROM block_supports WHERE block_slug=? AND support_name=? AND source='native_wp'"
_SELECT_TOKEN_DEFAULT_VALUE = "SELECT default_value FROM design_tokens WHERE slug = ?"

# Re-used string literals
_UTC_TIMESTAMP_FMT = "%Y-%m-%d %H:%M:%S UTC"
_REPORT_NONE_MARKER = "_(none)_"

# Keys in settings.custom that are routing config, not design tokens.
# Excluded from design_tokens writes.

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
# Key difference: uses INSERT OR IGNORE for new rows + UPDATE for drifted rows.
# Second run produces zero new rows AND updates any row whose block.json changed.
# ---------------------------------------------------------------------------

# Fields in `blocks` that are derived directly from block.json and must stay
# in sync when block.json is edited.  `source` and `status` are intentionally
# excluded — they are operator-managed metadata, not block.json fields.
_BLOCKS_TRACKED_FIELDS = (
    "title", "category", "type", "description",
    "has_view_script", "has_render_php", "parent_block",
)

# Fields in `block_attributes` that are derived from block.json attribute defs.
_ATTRS_TRACKED_FIELDS = (
    "attr_type", "default_value", "enum_values", "description", "is_responsive",
)


def _index_sgs_block_files(
    blocks_dir: Path,
    c: sqlite3.Cursor,
    dry_run: bool,
) -> dict:
    """Walk blocks_dir/*/block.json, INSERT-or-UPDATE blocks/attrs/supports rows.

    INSERT logic:    INSERT OR IGNORE — only fires for genuinely new rows.
    UPDATE logic:    for each existing row, compare every tracked field; if any
                     have drifted (block.json edited since last run), UPDATE the
                     row and increment the updated_* counter.

    Also updates indexed_files mtime + content_hash per block.json processed.

    Returns counters dict: scanned, new_blocks, new_attrs, new_supports,
    updated_blocks, updated_attrs, updated_supports,
    indexed_inserted, indexed_updated, indexed_skipped.

    The caller (`stage_1_sgs_codebase_scan`) owns `conn.commit()` after this
    helper returns — keeping the commit responsibility at one frame up keeps
    helper signatures lean.
    """
    scanned = 0
    new_blocks = 0
    new_attrs = 0
    new_supports = 0
    updated_blocks = 0
    updated_attrs = 0
    updated_supports = 0
    indexed_inserted = 0
    indexed_updated = 0
    indexed_skipped = 0

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
        attrs = data.get("attributes", {})
        supports = data.get("supports", {})

        if dry_run:
            # In dry-run: count what EXISTS vs what WOULD be inserted / updated
            existing = c.execute(
                "SELECT title, category, type, description, has_view_script, "
                "has_render_php, parent_block FROM blocks WHERE slug = ? AND source = 'sgs'",
                (slug,),
            ).fetchone()
            if existing is None:
                new_blocks += 1
            else:
                scraped_vals = (
                    title, category, block_type, description,
                    1 if has_view else 0, 1 if has_render else 0, parent,
                )
                if tuple(existing) != scraped_vals:
                    updated_blocks += 1
            scanned += 1

            for attr_name, attr_def in attrs.items():
                if not isinstance(attr_def, dict):
                    continue
                ex_attr = c.execute(
                    "SELECT attr_type, default_value, enum_values, description, "
                    "is_responsive FROM block_attributes "
                    "WHERE block_slug = ? AND attr_name = ? AND source = 'sgs'",
                    (slug, attr_name),
                ).fetchone()
                attr_type = attr_def.get("type", "string")
                default = attr_def.get("default")
                enum_vals = attr_def.get("enum")
                is_responsive = (
                    1 if f"{attr_name}Tablet" in attrs or f"{attr_name}Mobile" in attrs else 0
                )
                scraped_attr = (
                    attr_type,
                    json.dumps(default) if default is not None else None,
                    json.dumps(enum_vals) if enum_vals else None,
                    attr_def.get("description", ""),
                    is_responsive,
                )
                if ex_attr is None:
                    new_attrs += 1
                elif tuple(ex_attr) != scraped_attr:
                    updated_attrs += 1
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
        if result.rowcount:
            new_blocks += 1
        else:
            # Row exists — check for drift and UPDATE if any tracked field changed
            existing = c.execute(
                "SELECT title, category, type, description, has_view_script, "
                "has_render_php, parent_block FROM blocks WHERE slug = ? AND source = 'sgs'",
                (slug,),
            ).fetchone()
            if existing is not None:
                scraped_vals = (
                    title, category, block_type, description,
                    1 if has_view else 0, 1 if has_render else 0, parent,
                )
                if tuple(existing) != scraped_vals:
                    c.execute(
                        """
                        UPDATE blocks
                        SET title = ?, category = ?, type = ?, description = ?,
                            has_view_script = ?, has_render_php = ?, parent_block = ?,
                            updated_at = ?
                        WHERE slug = ? AND source = 'sgs'
                        """,
                        (
                            title, category, block_type, description,
                            1 if has_view else 0, 1 if has_render else 0, parent,
                            datetime.now(timezone.utc).isoformat(),
                            slug,
                        ),
                    )
                    updated_blocks += 1
        scanned += 1

        # --- INSERT OR IGNORE attributes; UPDATE on drift ---
        for attr_name, attr_def in attrs.items():
            if not isinstance(attr_def, dict):
                continue
            attr_type = attr_def.get("type", "string")
            default = attr_def.get("default")
            enum_vals = attr_def.get("enum")
            is_responsive = (
                1 if f"{attr_name}Tablet" in attrs or f"{attr_name}Mobile" in attrs else 0
            )
            default_json = json.dumps(default) if default is not None else None
            enum_json = json.dumps(enum_vals) if enum_vals else None
            attr_desc = attr_def.get("description", "")

            result = c.execute(
                """
                INSERT OR IGNORE INTO block_attributes
                    (block_slug, attr_name, attr_type, default_value, enum_values,
                     description, is_responsive, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'sgs')
                """,
                (slug, attr_name, attr_type, default_json, enum_json, attr_desc, is_responsive),
            )
            if result.rowcount:
                new_attrs += 1
            else:
                # Check for drift on tracked fields
                existing_attr = c.execute(
                    "SELECT attr_type, default_value, enum_values, description, "
                    "is_responsive FROM block_attributes "
                    "WHERE block_slug = ? AND attr_name = ? AND source = 'sgs'",
                    (slug, attr_name),
                ).fetchone()
                if existing_attr is not None:
                    scraped_attr = (attr_type, default_json, enum_json, attr_desc, is_responsive)
                    if tuple(existing_attr) != scraped_attr:
                        c.execute(
                            """
                            UPDATE block_attributes
                            SET attr_type = ?, default_value = ?, enum_values = ?,
                                description = ?, is_responsive = ?
                            WHERE block_slug = ? AND attr_name = ? AND source = 'sgs'
                            """,
                            (
                                attr_type, default_json, enum_json, attr_desc,
                                is_responsive, slug, attr_name,
                            ),
                        )
                        updated_attrs += 1

        # --- INSERT OR IGNORE supports; UPDATE support_value on drift ---
        for support_name, support_val in supports.items():
            support_json = json.dumps(support_val)
            result = c.execute(
                """
                INSERT OR IGNORE INTO block_supports
                    (block_slug, support_name, support_value, source)
                VALUES (?, ?, ?, 'sgs')
                """,
                (slug, support_name, support_json),
            )
            if result.rowcount:
                new_supports += 1
            else:
                existing_sup = c.execute(
                    "SELECT support_value FROM block_supports "
                    "WHERE block_slug = ? AND support_name = ? AND source = 'sgs'",
                    (slug, support_name),
                ).fetchone()
                if existing_sup is not None and existing_sup[0] != support_json:
                    c.execute(
                        """
                        UPDATE block_supports
                        SET support_value = ?, is_stale = 0
                        WHERE block_slug = ? AND support_name = ? AND source = 'sgs'
                        """,
                        (support_json, slug, support_name),
                    )
                    updated_supports += 1

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

    return {
        "scanned": scanned,
        "new_blocks": new_blocks,
        "new_attrs": new_attrs,
        "new_supports": new_supports,
        "updated_blocks": updated_blocks,
        "updated_attrs": updated_attrs,
        "updated_supports": updated_supports,
        "indexed_inserted": indexed_inserted,
        "indexed_updated": indexed_updated,
        "indexed_skipped": indexed_skipped,
    }


def _run_canonical_assignment(conn: sqlite3.Connection) -> None:
    """Run assign-canonical.py as a subprocess (Stage 1 tail step).

    Releases the write lock briefly so the subprocess can open its own connection.
    Prints a one-line summary; swallows all errors as warnings.
    """
    try:
        ac_script = REPO_ROOT / "plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py"
        if not ac_script.exists():
            return
        conn.commit()
        result = subprocess.run(
            ["python", str(ac_script)],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode == 0:
            tail = [
                ln for ln in (result.stdout or "").splitlines()
                if "resolved" in ln.lower() or "gaps" in ln.lower()
            ]
            print(f"Stage 1 tail (canonical assignment): {tail[-1] if tail else 'completed'}")
        else:
            print(
                f"Stage 1 tail (canonical assignment): WARN exit={result.returncode}; "
                f"stderr={result.stderr[:200]}"
            )
    except Exception as exc:  # noqa: BLE001
        print(f"Stage 1 tail (canonical assignment): WARN {exc}")


def stage_1_sgs_codebase_scan(conn: sqlite3.Connection, dry_run: bool = False) -> dict:
    """Walk src/blocks/*/block.json → INSERT-or-UPDATE blocks + block_attributes.

    New rows:     INSERT OR IGNORE fires when the slug/attr_name is absent.
    Drifted rows: if any tracked field has changed since last run, the row is
                  UPDATEd so description, title, category, attr types etc. stay
                  current with block.json.

    Updates indexed_files mtime + content_hash.
    Updates schema_metadata.indexed_blocks_count after scan.

    PORTED FROM: ~/.agents/skills/sgs-wp-engine/scripts/update-db.py + populate-db.py
    """
    blocks_dir = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
    if not blocks_dir.exists():
        return {"error": f"blocks dir not found: {blocks_dir}"}

    c = conn.cursor()
    counts = _index_sgs_block_files(blocks_dir, c, dry_run)
    scanned = counts["scanned"]
    new_blocks = counts["new_blocks"]
    new_attrs = counts["new_attrs"]
    new_supports = counts["new_supports"]
    updated_blocks = counts["updated_blocks"]
    updated_attrs = counts["updated_attrs"]
    updated_supports = counts["updated_supports"]
    indexed_inserted = counts["indexed_inserted"]
    indexed_updated = counts["indexed_updated"]
    indexed_skipped = counts["indexed_skipped"]

    if not dry_run:
        conn.commit()
        _run_canonical_assignment(conn)

        # Update schema_metadata.indexed_blocks_count
        count_row = c.execute(
            "SELECT COUNT(*) FROM blocks WHERE source = 'sgs'"
        ).fetchone()
        total_sgs_blocks = count_row[0]
        upsert_metadata(conn, "indexed_blocks_count", str(total_sgs_blocks))

        no_changes = (
            new_blocks == 0 and new_attrs == 0 and new_supports == 0
            and updated_blocks == 0 and updated_attrs == 0 and updated_supports == 0
        )
        if no_changes:
            summary = (
                f"Stage 1: {scanned} blocks scanned, 0 new or drifted rows (DB current). "
                f"indexed_files: {indexed_inserted} inserted, {indexed_updated} updated, "
                f"{indexed_skipped} unchanged."
            )
        else:
            summary = (
                f"Stage 1: {scanned} blocks scanned. "
                f"Inserted: {new_blocks} block rows, {new_attrs} attr rows, {new_supports} support rows. "
                f"Updated (drift): {updated_blocks} block rows, {updated_attrs} attr rows, "
                f"{updated_supports} support rows. "
                f"indexed_files: {indexed_inserted} inserted, {indexed_updated} updated, "
                f"{indexed_skipped} unchanged."
            )
        print(summary)
    else:
        print(
            f"Stage 1 [dry-run]: {scanned} blocks scanned. "
            f"Would insert: {new_blocks} block rows, {new_attrs} attr rows. "
            f"Would update (drift): {updated_blocks} block rows, {updated_attrs} attr rows."
        )

    return {
        "scanned": scanned,
        "new_blocks": new_blocks,
        "new_attrs": new_attrs,
        "new_supports": new_supports,
        "updated_blocks": updated_blocks,
        "updated_attrs": updated_attrs,
        "updated_supports": updated_supports,
        "indexed_inserted": indexed_inserted,
        "indexed_updated": indexed_updated,
        "indexed_skipped": indexed_skipped,
        "dry_run": dry_run,
    }


# ---------------------------------------------------------------------------
# Stage 2 — Core/Gutenberg cache refresh
# Decision 30 — 10 canonical upstream sources.
#
# Architecture-staging Phase 1 close-out (decisions.md D56) retired the Mode A
# (cached-source-DB read) path along with the standalone source DB files. Stage
# 2 now ALWAYS live-scrapes the 10 canonical sources every invocation; the
# `--refresh-upstream` CLI flag was removed (the default IS the refresh).
#
# Sources:
#   1. WordPress/gutenberg block-library block.json files (GitHub API)
#   2. WordPress/wordpress-develop PHP hook files (GitHub API)
#   3. wp-cli/handbook markdown files (GitHub API) — replaces retired Stage 3
#   4. developer.wordpress.org/reference/since/<version>/ (urllib + html.parser)
#   5. make.wordpress.org/core/<version>-field-guide (urllib)
#   6-10. developer.wordpress.org/{news,block-editor,themes,plugins,rest-api} (urllib)
#
# Architecture decisions:
#   - urllib.request for most sources; Source 4 uses a Playwright Node fallback when
#     the JS-rendered page yields <100 items via urllib. HARD MIN ≥100.
#   - GitHub API: User-Agent: sgs-update-v2/1.0 required. Authorization header
#     added if GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN env var is set.
#     403 + X-RateLimit-Remaining: 0 → FAIL.
#   - INSERT OR IGNORE on all data tables. INSERT OR REPLACE on schema_metadata only.
#   - Network failure per source: caught, logged to sources_failed, continue.
#   - Second run must produce 0 new rows (idempotency proof).
# ---------------------------------------------------------------------------

import html as _html_module
import html.parser as _html_parser
import os
import re
import urllib.error
import urllib.request


def _github_api_get(url: str, github_token: str | None = None) -> dict | list | None:
    """Fetch a GitHub API URL and return parsed JSON.

    Returns None on any failure. Raises GithubRateLimitError on rate limit.
    """
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "sgs-update-v2/1.0")
    req.add_header("Accept", "application/vnd.github.v3+json")
    if github_token:
        req.add_header("Authorization", f"token {github_token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw)
    except urllib.error.HTTPError as exc:
        if exc.code == 403:
            remaining = exc.headers.get("X-RateLimit-Remaining", "?")
            reset_ts = exc.headers.get("X-RateLimit-Reset", "?")
            raise _GithubRateLimitError(
                f"GitHub rate limit exhausted (X-RateLimit-Remaining: {remaining}, "
                f"reset at Unix time {reset_ts}). "
                f"Set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN env var (5000/hr) or wait."
            )
        raise


class _GithubRateLimitError(Exception):
    """Raised when GitHub API responds with 403 rate-limit exhausted."""


def _http_fetch(url: str) -> str:
    """Fetch a URL via urllib and return response body as UTF-8 string."""
    req = urllib.request.Request(url)
    req.add_header(
        "User-Agent",
        "Mozilla/5.0 (compatible; sgs-update-v2/1.0; +https://smallgiants.studio)",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        charset = "utf-8"
        ct = resp.headers.get_content_charset()
        if ct:
            charset = ct
        return resp.read().decode(charset, errors="replace")


class _LinkTextParser(_html_parser.HTMLParser):
    """Minimal HTML parser — extracts all visible <a> link texts + hrefs."""

    def __init__(self):
        super().__init__()
        self.links: list[tuple[str, str]] = []  # (href, text)
        self._current_href: str | None = None
        self._current_text: list[str] = []
        self._in_a = False

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._in_a = True
            self._current_text = []
            attrs_dict = dict(attrs)
            self._current_href = attrs_dict.get("href", "")

    def handle_endtag(self, tag):
        if tag == "a" and self._in_a:
            text = "".join(self._current_text).strip()
            href = self._current_href or ""
            if text and href:
                self.links.append((href, text))
            self._in_a = False
            self._current_href = None
            self._current_text = []

    def handle_data(self, data):
        if self._in_a:
            self._current_text.append(data)


class _TitleTextParser(_html_parser.HTMLParser):
    """Extract all <h1>-<h3> text + first <p> per section."""

    def __init__(self):
        super().__init__()
        self.sections: list[str] = []
        self._in_heading = False
        self._buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("h1", "h2", "h3"):
            self._in_heading = True
            self._buf = []

    def handle_endtag(self, tag):
        if tag in ("h1", "h2", "h3") and self._in_heading:
            text = "".join(self._buf).strip()
            if text:
                self.sections.append(text)
            self._in_heading = False
            self._buf = []

    def handle_data(self, data):
        if self._in_heading:
            self._buf.append(data)


def _parse_since_page(html_body: str) -> list[str]:
    """Extract API-reference identifiers from the WP developer reference/since page.

    The page lists functions/classes/hooks added in a given WP version.
    Entries appear as <a href="/reference/functions/...">function_name</a> etc.
    Returns a deduplicated list of identifier strings.
    """
    parser = _LinkTextParser()
    parser.feed(html_body)
    identifiers: set[str] = set()
    for href, text in parser.links:
        # Only include links to reference/* sections
        if "/reference/" in href and text.strip():
            clean = text.strip()
            # Skip nav / pagination links
            if clean and len(clean) > 2 and not clean.startswith("«") and not clean.startswith("»"):
                identifiers.add(clean)
    return sorted(identifiers)


def _parse_handbook_sections(html_body: str) -> list[str]:
    """Extract section titles from a WordPress handbook page."""
    parser = _TitleTextParser()
    parser.feed(html_body)
    return parser.sections


def _fetch_with_playwright(url: str, timeout: int = 60) -> str:
    """Fallback HTML fetch for JS-rendered pages via a headless Node/Playwright script.

    Only invoked when the urllib fetch returns fewer items than the hard minimum.
    Returns the rendered HTML as a string, or raises on failure.
    """
    script = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts" / "playwright-fetch.js"
    if not script.exists():
        raise FileNotFoundError(f"playwright-fetch.js not found at {script}")
    result = subprocess.run(
        ["node", str(script), url],
        capture_output=True,
        text=True,
        timeout=timeout,
        encoding="utf-8",
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Playwright Node script exit {result.returncode}: {result.stderr[:300]}"
        )
    return result.stdout



def _insert_or_count(
    cursor: sqlite3.Cursor,
    new_rows: dict,
    counter_key: str,
    dry_run: bool,
    insert_sql: str,
    insert_params: tuple,
    exists_sql: str,
    exists_params: tuple,
) -> int:
    """Generic INSERT OR IGNORE / dry-run SELECT 1 helper used by Sources 1-4.

    - Live: executes ``insert_sql``, increments ``new_rows[counter_key]`` by rowcount,
      returns that rowcount.
    - Dry-run: executes ``exists_sql``; if no row exists, increments
      ``new_rows[counter_key]`` by 1 and returns 1, else returns 0.
    """
    if not dry_run:
        res = cursor.execute(insert_sql, insert_params)
        delta = res.rowcount
    else:
        ex = cursor.execute(exists_sql, exists_params).fetchone()
        delta = 1 if ex is None else 0
    new_rows[counter_key] += delta
    return delta


def _insert_block_attrs_and_supports(
    c: sqlite3.Cursor,
    slug: str,
    block_data: dict,
    new_rows: dict,
    dry_run: bool,
) -> tuple[int, int]:
    """Insert block attributes and supports rows for one block.

    Returns (attrs_delta, supports_delta).
    Only called when not dry_run (caller must guard).
    """
    a_delta = 0
    for attr_name, attr_def in block_data.get("attributes", {}).items():
        if not isinstance(attr_def, dict):
            continue
        a_delta += _insert_or_count(
            c, new_rows, "block_attributes", dry_run,
            insert_sql="""
                INSERT OR IGNORE INTO block_attributes
                    (block_slug, attr_name, attr_type, default_value, source)
                VALUES (?, ?, ?, ?, 'native_wp')
                """,
            insert_params=(
                slug, attr_name,
                attr_def.get("type", "string"),
                json.dumps(attr_def.get("default")) if "default" in attr_def else None,
            ),
            exists_sql=_SELECT_BLOCK_ATTR_EXISTS_NATIVE_WP,
            exists_params=(slug, attr_name),
        )

    s_delta = 0
    for support_name, support_val in block_data.get("supports", {}).items():
        s_delta += _insert_or_count(
            c, new_rows, "block_supports", dry_run,
            insert_sql="""
                INSERT OR IGNORE INTO block_supports
                    (block_slug, support_name, support_value, source)
                VALUES (?, ?, ?, 'native_wp')
                """,
            insert_params=(slug, support_name, json.dumps(support_val)),
            exists_sql=_SELECT_BLOCK_SUPPORT_EXISTS_NATIVE_WP,
            exists_params=(slug, support_name),
        )

    return (a_delta, s_delta)


def _process_gutenberg_block_dir(
    c: sqlite3.Cursor,
    github_token,
    entry: dict,
    ref_tag: str,
    new_rows: dict,
    dry_run: bool,
) -> tuple:
    """Fetch + parse one block.json from gutenberg, INSERT OR IGNORE rows.

    Mutates new_rows by reference.
    Returns (blocks_delta, attrs_delta, supports_delta).
    Returns (0, 0, 0) silently on fetch/parse errors.
    """
    block_name = entry["name"]
    block_json_url = (
        f"https://api.github.com/repos/WordPress/gutenberg/contents/"
        f"packages/block-library/src/{block_name}/block.json?ref={ref_tag}"
    )
    try:
        file_data = _github_api_get(block_json_url, github_token)
        if not isinstance(file_data, dict):
            return (0, 0, 0)
        content_b64 = file_data.get("content", "")
        if not content_b64:
            return (0, 0, 0)
        decoded = base64.b64decode(content_b64.replace("\n", "")).decode("utf-8", errors="replace")
        block_data = json.loads(decoded)
    except json.JSONDecodeError:
        return (0, 0, 0)
    except Exception:
        return (0, 0, 0)

    slug = block_data.get("name", f"core/{block_name}")
    title = block_data.get("title", block_name)
    description = block_data.get("description", "")
    category = block_data.get("category", "")
    block_type = "dynamic" if "$schema" in block_data else "static"

    b_delta = _insert_or_count(
        c, new_rows, "blocks", dry_run,
        insert_sql="""
            INSERT OR IGNORE INTO blocks
                (slug, title, description, category, type, source)
            VALUES (?, ?, ?, ?, ?, 'native_wp')
            """,
        insert_params=(slug, title, description, category, block_type),
        exists_sql=_SELECT_BLOCK_EXISTS_NATIVE_WP,
        exists_params=(slug,),
    )

    a_delta = 0
    s_delta = 0
    if not dry_run:
        a_delta, s_delta = _insert_block_attrs_and_supports(
            c, slug, block_data, new_rows, dry_run
        )

    return (b_delta, a_delta, s_delta)


def _scrape_source_1_gutenberg(
    c: sqlite3.Cursor,
    conn: sqlite3.Connection,
    github_token,
    wp_version: str,
    new_rows: dict,
    dry_run: bool,
) -> int:
    """Source 1: WordPress/gutenberg packages/block-library/src/ block.json files.

    Mutates new_rows by reference.
    Returns the number of block directories found (items count for items_per_source).
    Raises on fatal error -- caller catches.
    """
    print(f"\n[Source 1] WordPress/gutenberg packages/block-library/src/ at v{wp_version}.0 ...")
    ref_tag = f"v{wp_version}.0"
    dir_url = (
        f"https://api.github.com/repos/WordPress/gutenberg/contents/"
        f"packages/block-library/src?ref={ref_tag}"
    )
    entries = _github_api_get(dir_url, github_token)
    if not isinstance(entries, list):
        raise ValueError(f"Expected list from GitHub API, got: {type(entries)}")

    block_dirs = [e for e in entries if e.get("type") == "dir"]
    print(f"  Found {len(block_dirs)} block directories.")

    s1_blocks = 0
    s1_attrs = 0
    s1_supports = 0

    for entry in block_dirs:
        b, a, s = _process_gutenberg_block_dir(c, github_token, entry, ref_tag, new_rows, dry_run)
        s1_blocks += b
        s1_attrs += a
        s1_supports += s

    if not dry_run:
        conn.commit()

    print(
        f"  Source 1 done: {len(block_dirs)} dirs, {s1_blocks} new block rows, "
        f"{s1_attrs} new attr rows, {s1_supports} new support rows."
    )
    return len(block_dirs)


def _scrape_source_2_hooks(
    c: sqlite3.Cursor,
    conn: sqlite3.Connection,
    github_token,
    wp_version: str,
    new_rows: dict,
    dry_run: bool,
) -> int:
    """Source 2: WordPress/wordpress-develop PHP hook files.

    Mutates new_rows by reference.
    Returns total hook extraction count (s2_extracted) for items_per_source.
    Success/fail verdict is the caller's responsibility (check returned count > 0).
    Raises on fatal error -- caller catches.
    """

    print(f"\n[Source 2] WordPress/wordpress-develop PHP hook files at v{wp_version}.0 ...")
    hook_files = [
        "src/wp-includes/post.php",
        "src/wp-includes/default-filters.php",
        "src/wp-includes/theme.php",
        "src/wp-includes/template.php",
        "src/wp-includes/formatting.php",
    ]
    ref_tag = f"{wp_version}.0"  # wordpress-develop uses plain X.Y.Z tags
    hook_re = re.compile(
        r"""(?:do_action|apply_filters)\s*\(\s*['\"]([a-zA-Z0-9_\-]+)[\'\"]""",
        re.MULTILINE,
    )

    s2_extracted = 0  # Total regex matches (real scraper-health signal).
    s2_inserted = 0   # INSERT OR IGNORE rowcount sum (diagnostic only).

    for file_path in hook_files:
        file_url = (
            f"https://api.github.com/repos/WordPress/wordpress-develop/contents/"
            f"{file_path}?ref={ref_tag}"
        )
        try:
            file_data = _github_api_get(file_url, github_token)
            if not isinstance(file_data, dict):
                continue
            content_b64 = file_data.get("content", "")
            if not content_b64:
                continue
            decoded = base64.b64decode(content_b64.replace("\n", "")).decode("utf-8", errors="replace")
        except Exception as file_exc:
            print(f"    WARNING: {file_path} fetch failed: {file_exc}")
            continue

        hook_names = set(hook_re.findall(decoded))
        # Determine hook_type from context (crude: apply_filters -> filter, do_action -> action)
        action_re = re.compile(r"""do_action\s*\(\s*['\"]([a-zA-Z0-9_\-]+)[\'\"]""", re.MULTILINE)
        actions = set(action_re.findall(decoded))

        s2_extracted += len(hook_names)
        for hook_name in hook_names:
            hook_type = "action" if hook_name in actions else "filter"
            s2_inserted += _insert_or_count(
                c, new_rows, "hooks", dry_run,
                insert_sql="""
                    INSERT OR IGNORE INTO hooks
                        (name, hook_type, plugin_slug, file_path, source, type)
                    VALUES (?, ?, NULL, ?, 'native_wp', ?)
                    """,
                insert_params=(hook_name, hook_type, file_path, hook_type),
                exists_sql="SELECT 1 FROM hooks WHERE name=? AND source='native_wp'",
                exists_params=(hook_name,),
            )

        print(f"    {file_path}: {len(hook_names)} hook references found.")

    if not dry_run:
        conn.commit()

    print(f"  Source 2 done: {s2_extracted} hooks extracted, {s2_inserted} new rows inserted.")
    return s2_extracted


def _scrape_source_3_wpcli(
    c: sqlite3.Cursor,
    conn: sqlite3.Connection,
    github_token,
    new_rows: dict,
    dry_run: bool,
) -> int:
    """Source 3: wp-cli/handbook markdown commands/.

    Mutates new_rows by reference.
    Returns the number of markdown files found (items count for items_per_source).
    Raises on fatal error -- caller catches.
    """
    print("\n[Source 3] wp-cli/handbook markdown commands/ ...")
    dir_url = "https://api.github.com/repos/wp-cli/handbook/contents/commands"
    entries = _github_api_get(dir_url, github_token)
    if not isinstance(entries, list):
        raise ValueError(f"Expected list from GitHub API, got: {type(entries)}")

    md_files = [e for e in entries if e.get("name", "").endswith(".md")]
    print(f"  Found {len(md_files)} markdown files.")

    s3_docs = 0
    for entry in md_files:
        slug_raw = entry["name"].replace(".md", "")
        slug = f"wpcli-{slug_raw}"
        title = slug_raw.replace("-", " ").title()
        download_url = entry.get("download_url", "")

        content_text = ""
        if download_url:
            try:
                content_text = _http_fetch(download_url)
                # Trim to first 4000 chars to keep DB lean
                if len(content_text) > 4000:
                    content_text = content_text[:4000] + "\n...[truncated]"
            except Exception:
                content_text = f"# {title}\n\nContent fetch failed."

        s3_docs += _insert_or_count(
            c, new_rows, "docs", dry_run,
            insert_sql="""
                INSERT OR IGNORE INTO docs
                    (source, slug, title, doc_type, category, content)
                VALUES ('native_wp', ?, ?, 'cli-command', 'wpcli', ?)
                """,
            insert_params=(slug, title, content_text),
            exists_sql=_SELECT_DOC_EXISTS_NATIVE_WP,
            exists_params=(slug,),
        )

    if not dry_run:
        conn.commit()

    print(f"  Source 3 done: {len(md_files)} files, {s3_docs} new doc rows.")
    return len(md_files)


def _scrape_source_4_since(
    c: sqlite3.Cursor,
    conn: sqlite3.Connection,
    wp_version: str,
    new_rows: dict,
    dry_run: bool,
) -> tuple:
    """Source 4: developer.wordpress.org/reference/since/<version>.0/.

    SCRAPER-HEALTH FLOOR: if <30 items found, raises ValueError so coordinator
    records the source as failed with an explicit count message.
    The minimum was originally 100 (calibrated for typical releases) but
    WP 7.0 genuinely has only 41 new public API identifiers -- a smaller
    release. Floor lowered to 30 so the gate still catches a broken
    scraper (returns 0 due to selector drift or rate limit) without
    false-positiving on small-release pages. Verified empirically
    2026-05-22: both urllib and Playwright return 41 items for WP 7.0,
    which is the real count, not a parsing failure.

    Mutates new_rows by reference.
    Returns (items_count, used_playwright_bool).
    Raises ValueError on scraper-health failure; other exceptions propagate for
    the coordinator's URLError / generic except handlers.
    """
    MINIMUM_SOURCE_4_ITEMS = 30

    print(f"\n[Source 4] developer.wordpress.org/reference/since/{wp_version}.0/ ...")
    since_url = f"https://developer.wordpress.org/reference/since/{wp_version}.0/"
    html_body = _http_fetch(since_url)
    identifiers = _parse_since_page(html_body)
    count = len(identifiers)
    used_playwright = False
    print(f"  Found {count} API identifiers.")

    if count < MINIMUM_SOURCE_4_ITEMS:
        # Fallback: the page is JS-rendered -- try the Playwright Node script
        print(
            f"  urllib returned only {count} items (< {MINIMUM_SOURCE_4_ITEMS}). "
            f"Page may be JS-rendered. Trying Playwright fallback..."
        )
        try:
            playwright_html = _fetch_with_playwright(since_url)
            fallback_identifiers = _parse_since_page(playwright_html)
            fallback_count = len(fallback_identifiers)
            print(f"  Playwright fallback: {fallback_count} identifiers found.")
            if fallback_count >= MINIMUM_SOURCE_4_ITEMS:
                identifiers = fallback_identifiers
                count = fallback_count
                used_playwright = True
        except Exception as pw_exc:
            print(f"  Playwright fallback FAILED: {pw_exc}")

    if count < MINIMUM_SOURCE_4_ITEMS:
        # Both urllib and Playwright (if available) yielded < floor -- hard fail
        msg = (
            f"Stage 2 Source 4 FAILED: only {count} API identifiers found from "
            f"{since_url}. Hard minimum is {MINIMUM_SOURCE_4_ITEMS}. "
            f"Both urllib and Playwright fallback exhausted. "
            f"Verify the page loads {MINIMUM_SOURCE_4_ITEMS}+ items manually."
        )
        print(f"  {msg}")
        raise ValueError(msg)

    s4_docs = 0
    for identifier in identifiers:
        slug = f"wp-since-{wp_version}-{re.sub(r'[^a-z0-9_-]', '-', identifier.lower())}"
        if not dry_run:
            res = c.execute(
                """
                INSERT OR IGNORE INTO docs
                    (source, slug, title, doc_type, category)
                VALUES ('native_wp', ?, ?, 'api-reference', ?)
                """,
                (slug, identifier, f"WP {wp_version} new API"),
            )
            new_rows["docs"] += res.rowcount
            s4_docs += res.rowcount
        else:
            ex = c.execute(
                _SELECT_DOC_EXISTS_NATIVE_WP, (slug,)
            ).fetchone()
            if ex is None:
                new_rows["docs"] += 1
                s4_docs += 1

    if not dry_run:
        conn.commit()

    print(f"  Source 4 done: {count} identifiers, {s4_docs} new doc rows.")
    return count, used_playwright


def _insert_dev_blog_articles(
    c: sqlite3.Cursor,
    conn: sqlite3.Connection,
    article_links: list[tuple[str, str]],
    slug_prefix: str,
    doc_type: str,
    new_rows: dict[str, int],
    dry_run: bool,
) -> int:
    """Insert dev-blog news articles into docs. Returns the count of new rows."""
    s_docs = 0
    for i, (href, text) in enumerate(article_links):
        slug = f"{slug_prefix}-{i + 1}"
        s_docs += _insert_or_count(
            c, new_rows, "docs", dry_run,
            insert_sql="""
                INSERT OR IGNORE INTO docs
                    (source, slug, title, doc_type, category, content)
                VALUES ('native_wp', ?, ?, ?, 'dev-blog', ?)
                """,
            insert_params=(slug, text.strip(), doc_type, href),
            exists_sql=_SELECT_DOC_EXISTS_NATIVE_WP,
            exists_params=(slug,),
        )
    if not dry_run:
        conn.commit()
    return s_docs


def _insert_handbook_doc(
    c: sqlite3.Cursor,
    conn: sqlite3.Connection,
    slug: str,
    doc_title: str,
    doc_type: str,
    content: str,
    new_rows: dict[str, int],
    dry_run: bool,
) -> int:
    """INSERT OR IGNORE one handbook doc row. Returns number of new rows (0 or 1).

    Commits conn when not dry_run (matching original per-source commit semantics).
    """
    return _insert_or_count(
        c, new_rows, "docs", dry_run,
        insert_sql="""
            INSERT OR IGNORE INTO docs
                (source, slug, title, doc_type, category, content)
            VALUES ('native_wp', ?, ?, ?, ?, ?)
            """,
        insert_params=(slug, doc_title, doc_type, doc_type, content),
        exists_sql=_SELECT_DOC_EXISTS_NATIVE_WP,
        exists_params=(slug,),
    )


def _scrape_handbook_sources_5_to_10(
    c: sqlite3.Cursor,
    conn: sqlite3.Connection,
    wp_version: str,
    new_rows: dict[str, int],
    dry_run: bool,
    sources_succeeded: list[str],
    sources_failed: list[str],
    items_per_source: dict[str, int],
) -> None:
    """Scrape Sources 5-10 (the shared make.wp.org + developer.wp.org loop).

    Each source iteration is independently try/caught — one failure never
    stops the rest. Sources 5-10:
      5. make.wordpress.org/core/<version>-field-guide
      6. developer.wordpress.org/news (dev-blog branch — different inner logic)
      7-10. developer.wordpress.org/{block-editor, themes, plugins, rest-api}

    Mutates new_rows/sources_succeeded/sources_failed/items_per_source by reference.
    Per-source conn.commit() on success (when not dry_run).
    """
    _handbook_sources = [
        (
            "make-core-field-guide",
            # WP 7.0 field guide published at: https://make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/
            # Pattern for future versions: https://make.wordpress.org/core/<YYYY>/<MM>/<DD>/wordpress-<major>-<minor>-field-guide/
            # The legacy slug https://make.wordpress.org/core/<version>-field-guide/ returns 404 for WP 7.0+.
            "https://make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/",
            "release-notes",
            f"WP {wp_version} Field Guide",
            f"wp-{wp_version}-field-guide",
        ),
        (
            "devdocs-news",
            "https://developer.wordpress.org/news/",
            "dev-blog",
            "WordPress Developer News",
            "wp-dev-news",
        ),
        (
            "devdocs-block-editor",
            "https://developer.wordpress.org/block-editor/",
            "block-editor-reference",
            "Block Editor Handbook",
            "wp-block-editor",
        ),
        (
            "devdocs-themes",
            "https://developer.wordpress.org/themes/",
            "theme-handbook",
            "Theme Handbook",
            "wp-theme-handbook",
        ),
        (
            "devdocs-plugins",
            "https://developer.wordpress.org/plugins/",
            "plugin-handbook",
            "Plugin Handbook",
            "wp-plugin-handbook",
        ),
        (
            "devdocs-rest-api",
            "https://developer.wordpress.org/rest-api/",
            "rest-api-handbook",
            "REST API Handbook",
            "wp-rest-api-handbook",
        ),
    ]

    for src_idx, (src_name, src_url, doc_type, doc_title, slug_prefix) in enumerate(_handbook_sources, start=5):
        try:
            print(f"\n[Source {src_idx}] {src_url} ...")
            html_body = _http_fetch(src_url)
            sections = _parse_handbook_sections(html_body)
            # Also parse top-level page links for news (latest 5 posts)
            if doc_type == "dev-blog":
                parser = _LinkTextParser()
                parser.feed(html_body)
                article_links = [
                    (href, text) for href, text in parser.links
                    if "/news/" in href and text.strip() and len(text) > 10
                ][:5]
                s_docs = _insert_dev_blog_articles(
                    c, conn, article_links, slug_prefix, doc_type, new_rows, dry_run,
                )
                items_per_source[src_name] = len(article_links)
                print(f"  {src_name}: {len(article_links)} articles, {s_docs} new rows.")
            else:
                # Top-level handbook: insert as one summary doc with sections as content
                content = "\n".join(f"## {s}" for s in sections[:50]) if sections else ""
                s_docs = _insert_handbook_doc(
                    c, conn, slug_prefix, doc_title, doc_type, content, new_rows, dry_run,
                )
                if not dry_run:
                    conn.commit()
                items_per_source[src_name] = len(sections)
                print(f"  {src_name}: {len(sections)} sections found, {s_docs} new row.")

            sources_succeeded.append(src_name)

        except urllib.error.URLError as exc:
            print(f"  {src_name} FAILED: network error — {exc}")
            sources_failed.append(f"{src_name}: URLError: {exc}")
        except Exception as exc:
            print(f"  {src_name} FAILED: {type(exc).__name__}: {exc}")
            sources_failed.append(f"{src_name}: {exc}")


def _mode_b_refresh_upstream(
    conn: sqlite3.Connection,
    dry_run: bool,
    wp_version: str,
) -> dict:
    """Mode B — live network scrape of 10 canonical sources (Decision 30).

    Sources:
      1. WordPress/gutenberg packages/block-library/src/ at v<wp_version>.0 tag
      2. WordPress/wordpress-develop PHP hook files at v<wp_version>.0 tag
      3. wp-cli/handbook markdown commands/
      4. developer.wordpress.org/reference/since/<wp_version>.0/ (scraper-health floor ≥30 -- recalibrated 2026-05-22 from 100 after WP 7.0 verified to genuinely have 41 items)
      5. make.wordpress.org/core/<wp_version>-field-guide
      6. developer.wordpress.org/news
      7. developer.wordpress.org/block-editor
      8. developer.wordpress.org/themes
      9. developer.wordpress.org/plugins
      10. developer.wordpress.org/rest-api

    All inserts are INSERT OR IGNORE — idempotent.
    Network failures per source are caught and logged to sources_failed.

    Orchestration: each _scrape_source_N helper mutates new_rows by reference,
    commits per-source when not dry_run, and raises on fatal error so this
    coordinator can record the failure without stopping subsequent sources.
    """
    github_token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN")
    if github_token:
        print("Stage 2 [Mode B]: GitHub PAT found — using authenticated GitHub API (5000 req/hr).")
    else:
        print("Stage 2 [Mode B]: No GitHub PAT — using unauthenticated GitHub API (60 req/hr). Set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN.")

    c = conn.cursor()
    sources_succeeded: list = []
    sources_failed: list = []
    new_rows: dict = {
        "blocks": 0, "block_attributes": 0, "block_supports": 0,
        "hooks": 0, "docs": 0,
    }
    items_per_source: dict = {}

    # --- Source 1: WordPress/gutenberg block-library block.json files ---
    source_1_name = "gutenberg-block-library"
    try:
        items_per_source[source_1_name] = _scrape_source_1_gutenberg(
            c, conn, github_token, wp_version, new_rows, dry_run
        )
        sources_succeeded.append(source_1_name)
    except _GithubRateLimitError as exc:
        print(f"  Source 1 FAILED: {exc}")
        sources_failed.append(f"{source_1_name}: {exc}")
    except Exception as exc:
        print(f"  Source 1 FAILED: {type(exc).__name__}: {exc}")
        sources_failed.append(f"{source_1_name}: {exc}")

    # --- Source 2: WordPress/wordpress-develop PHP hook files ---
    source_2_name = "wordpress-develop-hooks"
    try:
        s2_extracted = _scrape_source_2_hooks(
            c, conn, github_token, wp_version, new_rows, dry_run
        )
        items_per_source[source_2_name] = s2_extracted
        # Gate success on EXTRACTION count (scraper-health signal), not insertion
        # count. Hooks already in sgs-framework.db from Mode A's cached merge will
        # INSERT OR IGNORE to rowcount=0 -- that's not a failure, that's
        # idempotency. The real silent gap is the scraper extracting zero hooks
        # (PAT bad, regex broken, files moved, etc.). Refined 2026-05-22 from
        # the earlier council fix that mistakenly gated on insert count.
        if s2_extracted > 0:
            sources_succeeded.append(source_2_name)
        else:
            sources_failed.append(
                f"{source_2_name}: scraper extracted 0 hooks from the 5-file subset "
                f"(all file fetches failed, OR regex matched no do_action/apply_filters)"
            )
    except _GithubRateLimitError as exc:
        print(f"  Source 2 FAILED: {exc}")
        sources_failed.append(f"{source_2_name}: {exc}")
    except Exception as exc:
        print(f"  Source 2 FAILED: {type(exc).__name__}: {exc}")
        sources_failed.append(f"{source_2_name}: {exc}")

    # --- Source 3: wp-cli/handbook markdown files ---
    source_3_name = "wpcli-handbook"
    try:
        items_per_source[source_3_name] = _scrape_source_3_wpcli(
            c, conn, github_token, new_rows, dry_run
        )
        sources_succeeded.append(source_3_name)
    except _GithubRateLimitError as exc:
        print(f"  Source 3 FAILED: {exc}")
        sources_failed.append(f"{source_3_name}: {exc}")
    except Exception as exc:
        print(f"  Source 3 FAILED: {type(exc).__name__}: {exc}")
        sources_failed.append(f"{source_3_name}: {exc}")

    # --- Source 4: developer.wordpress.org/reference/since/<version>.0/ ---
    source_4_name = "devdocs-since"
    try:
        count, _used_pw = _scrape_source_4_since(
            c, conn, wp_version, new_rows, dry_run
        )
        items_per_source[source_4_name] = count
        sources_succeeded.append(source_4_name)
    except urllib.error.URLError as exc:
        print(f"  Source 4 FAILED: network error — {exc}")
        sources_failed.append(f"{source_4_name}: URLError: {exc}")
    except Exception as exc:
        print(f"  Source 4 FAILED: {type(exc).__name__}: {exc}")
        sources_failed.append(f"{source_4_name}: {exc}")

    # --- Sources 5-10: developer.wordpress.org handbook pages + make.wordpress.org ---
    _scrape_handbook_sources_5_to_10(
        c, conn, wp_version, new_rows, dry_run,
        sources_succeeded, sources_failed, items_per_source,
    )

    # --- Final metadata update ---
    now_ts = datetime.now(timezone.utc).isoformat()
    if not dry_run:
        upsert_metadata(conn, "wp_version_indexed", wp_version)
        upsert_metadata(conn, "last_full_refresh_ts", now_ts)
        print(
            f"\nStage 2 [Mode B]: complete. "
            f"Sources succeeded: {len(sources_succeeded)}, "
            f"failed: {len(sources_failed)}. "
            f"New rows: {new_rows}. wp_version_indexed={wp_version}"
        )
    else:
        print(
            f"\nStage 2 [Mode B, dry-run]: complete. "
            f"Sources succeeded (dry): {len(sources_succeeded)}, "
            f"failed: {len(sources_failed)}. "
            f"Would insert: {new_rows}."
        )

    return {
        "status": "refreshed",
        "sources_succeeded": sources_succeeded,
        "sources_failed": sources_failed,
        "new_rows": new_rows,
        "items_per_source": items_per_source,
        "wp_version_indexed": wp_version,
        "last_full_refresh_ts": now_ts if not dry_run else None,
        "dry_run": dry_run,
    }

def stage_2_core_gutenberg_cache_refresh(
    conn: sqlite3.Connection,
    wp_version: str = WP_VERSION_DEFAULT,
    dry_run: bool = False,
) -> dict:
    """Stage 2 — live-scrape 10 canonical upstream sources (Decision 30).

    Architecture-staging Phase 1 close-out (decisions.md D56) retired the
    Mode A / Mode B distinction along with the standalone source DB caches.
    Every `/sgs-update` invocation now hits the canonical sources directly:

      1. WordPress/gutenberg block-library `block.json` files (GitHub API)
      2. WordPress/wordpress-develop PHP hook files (GitHub API)
      3. wp-cli/handbook commands/ markdown (GitHub API)
      4. developer.wordpress.org/reference/since/{wp_version}.0/ (+ Playwright fallback)
      5. make.wordpress.org/core/{wp_version}-field-guide
      6-10. developer.wordpress.org subpaths (news / block-editor / themes / plugins / rest-api)

    All inserts are INSERT OR IGNORE (idempotent). After all sources: updates
    schema_metadata wp_version_indexed + last_full_refresh_ts.

    With GITHUB_PERSONAL_ACCESS_TOKEN set, the GitHub-API sources have a
    5,000 req/hr limit — effectively unlimited for normal usage.
    """
    ensure_schema_metadata(conn)
    return _mode_b_refresh_upstream(conn, dry_run=dry_run, wp_version=wp_version)


# ---------------------------------------------------------------------------
# Stage 3 — RETIRED (architecture-staging Phase 1 close-out, decisions.md D56)
#
# WP-CLI handbook content is now refreshed by Stage 2 Source 3 directly.
# The orchestrator prints a tombstone line and skips this stage number.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Stage 4 — Style variation sync (Phase 5a activated)
# Walks sites/*/theme-snapshot.json → INSERT OR IGNORE into design_tokens.
# Idempotent. Reports per-client insert / skip / filter counts.
# ---------------------------------------------------------------------------

def _extract_custom_leaf_keys(node: dict, prefix: str = "") -> list[tuple[str, str]]:
    """Recursively flatten settings.custom into (key, value) leaf pairs.

    Nesting separator is hyphen — e.g. ``{'spacing': {'40': '1.5rem'}}``
    becomes ``[('spacing-40', '1.5rem')]``.
    """
    results: list[tuple[str, str]] = []
    for k, v in node.items():
        full_key = f"{prefix}-{k}" if prefix else k
        if isinstance(v, dict):
            results.extend(_extract_custom_leaf_keys(v, full_key))
        else:
            results.append((full_key, str(v)))
    return results


# ---------------------------------------------------------------------------
# Stage 4 helpers (promoted from inner defs for cognitive-complexity reduction)
# ---------------------------------------------------------------------------

def _extract_colour_tokens(settings: dict, client_slug: str) -> list[dict]:
    """Extract colour tokens from settings.color.palette."""
    result: list[dict] = []
    for item in settings.get("color", {}).get("palette", []):
        slug = item.get("slug", "")
        colour = item.get("color", "")
        name = item.get("name", slug)
        # Skip forward-reference colours (value is another slug, not a hex/rgb)
        if not slug or not colour or colour.startswith("var(") or not colour.startswith("#"):
            continue
        result.append({
            "slug": f"color-{slug}",
            "token_type": "colour",  # matches DB CHECK('colour', 'font', 'spacing', 'size', 'shadow')
            "default_value": colour,
            "css_var": f"var(--wp--preset--color--{slug})",
            "description": f"{name} (from {client_slug})",
        })
    return result


def _extract_font_size_tokens(settings: dict, client_slug: str) -> list[dict]:
    """Extract font-size tokens from settings.typography.fontSizes."""
    result: list[dict] = []
    for item in settings.get("typography", {}).get("fontSizes", []):
        slug = item.get("slug", "")
        size = item.get("size", "")
        name = item.get("name", slug)
        # Skip invalid / placeholder entries (e.g. slug="px", size="px")
        if not slug or not size or size == slug or "px" == slug:
            continue
        result.append({
            "slug": f"font-size-{slug}",
            "token_type": "size",
            "default_value": str(size),
            "css_var": f"var(--wp--preset--font-size--{slug})",
            "description": f"{name} (from {client_slug})",
        })
    return result


def _extract_font_family_tokens(settings: dict, client_slug: str) -> list[dict]:
    """Extract font-family tokens from settings.typography.fontFamilies."""
    result: list[dict] = []
    for item in settings.get("typography", {}).get("fontFamilies", []):
        slug = item.get("slug", "")
        family = item.get("fontFamily", "")
        name = item.get("name", slug)
        if not slug or not family:
            continue
        result.append({
            "slug": f"font-family-{slug}",
            "token_type": "font",  # matches DB CHECK('colour', 'font', 'spacing', 'size', 'shadow')
            "default_value": family,
            "css_var": f"var(--wp--preset--font-family--{slug})",
            "description": f"{name} (from {client_slug})",
        })
    return result


def _extract_spacing_tokens(settings: dict, client_slug: str) -> list[dict]:
    """Extract spacing tokens from settings.spacing.spacingSizes."""
    result: list[dict] = []
    for item in settings.get("spacing", {}).get("spacingSizes", []):
        slug = item.get("slug", "")
        size = item.get("size", "")
        name = item.get("name", slug)
        if not slug or not size or size == slug or slug == "px":
            continue
        result.append({
            "slug": f"spacing-{slug}",
            "token_type": "spacing",  # matches DB CHECK constraint
            "default_value": str(size),
            "css_var": f"var(--wp--preset--spacing--{slug})",
            "description": f"{name} (from {client_slug})",
        })
    return result


def _extract_shadow_tokens(settings: dict, client_slug: str) -> list[dict]:
    """Extract shadow tokens from settings.shadow.presets."""
    result: list[dict] = []
    for item in settings.get("shadow", {}).get("presets", []):
        slug = item.get("slug", "")
        shadow = item.get("shadow", "")
        name = item.get("name", slug)
        if not slug or not shadow:
            continue
        result.append({
            "slug": f"shadow-{slug}",
            "token_type": "shadow",
            "default_value": shadow,
            "css_var": f"var(--wp--preset--shadow--{slug})",
            "description": f"{name} (from {client_slug})",
        })
    return result


def _build_token_candidates(snapshot: dict, client_slug: str) -> list[dict]:
    """Extract design_token candidate rows from a parsed theme-snapshot.json.

    Pure — no DB writes.
    token_type values match DB CHECK constraint: 'colour'|'font'|'spacing'|'size'|'shadow'.
    """
    settings = snapshot.get("settings", {})
    return (
        _extract_colour_tokens(settings, client_slug)
        + _extract_font_size_tokens(settings, client_slug)
        + _extract_font_family_tokens(settings, client_slug)
        + _extract_spacing_tokens(settings, client_slug)
        + _extract_shadow_tokens(settings, client_slug)
    )


def _resolve_token_conflict(
    cursor: sqlite3.Cursor,
    tok: dict,
    client_slug: str,
) -> tuple[str | None, tuple | None]:
    """If slug exists with a different value, return (prefixed_slug, existing_prefixed_row).

    Returns (None, None) if no conflict (no existing row or matching value).
    existing_prefixed_row is the `cursor.fetchone()` tuple (truthy) when the
    prefixed row already exists in design_tokens, else None. Callers should
    check `is not None`, not unpack the tuple.
    """
    slug = tok["slug"]
    existing = cursor.execute(
        _SELECT_TOKEN_DEFAULT_VALUE,
        (slug,),
    ).fetchone()
    if existing is None or existing[0] == tok["default_value"]:
        return (None, None)
    prefixed_slug = f"{client_slug}-{slug}"
    existing_prefixed = cursor.execute(
        "SELECT 1 FROM design_tokens WHERE slug = ?",
        (prefixed_slug,),
    ).fetchone()
    return (prefixed_slug, existing_prefixed)


def _do_insert_token(cursor: sqlite3.Cursor, slug: str, tok: dict, dry_run: bool) -> bool:
    """INSERT OR IGNORE into design_tokens with the standard column set.

    Returns True when a row was (or would be) inserted, False on duplicate.
    In dry-run mode does a defensive SELECT 1 to determine the would-be outcome.
    """
    if dry_run:
        exists = cursor.execute(
            "SELECT 1 FROM design_tokens WHERE slug = ?", (slug,)
        ).fetchone()
        return exists is None
    res = cursor.execute(
        """
        INSERT OR IGNORE INTO design_tokens
            (slug, token_type, default_value, css_var, description)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            slug,
            tok["token_type"],
            tok["default_value"],
            tok["css_var"],
            tok["description"],
        ),
    )
    return res.rowcount > 0


def _write_token_row(
    cursor: sqlite3.Cursor,
    tok: dict,
    dry_run: bool,
) -> tuple[str, str | None]:
    """Single-token upsert into design_tokens.

    Returns (verb, conflict_slug) where:
      verb ∈ {'inserted', 'skipped', 'conflict-inserted', 'conflict-skipped'}
      conflict_slug is the prefixed slug when a conflict was detected, else None.

    'conflict-inserted'  → conflict found AND the prefixed row was newly written
    'conflict-skipped'   → conflict found but the prefixed row already exists (idempotent)

    Conflict rule: slug exists with a DIFFERENT value → prefix with client slug
    to avoid silently overwriting the framework default.
    client slug is passed via tok['_client_slug'] private key (injected by caller).
    """
    slug = tok["slug"]

    # Check for existing row first (needed for the no-conflict path)
    existing = cursor.execute(
        _SELECT_TOKEN_DEFAULT_VALUE,
        (slug,),
    ).fetchone()

    if existing is not None and existing[0] == tok["default_value"]:
        # Exact match — idempotent skip
        return ("skipped", None)

    if existing is not None:
        # Different value — conflict path
        client_slug = tok["_client_slug"]
        prefixed_slug, existing_prefixed = _resolve_token_conflict(cursor, tok, client_slug)
        if existing_prefixed is not None:
            # Prefixed row already written on a previous run — conflict but no new insert
            return ("conflict-skipped", prefixed_slug)
        # Return value intentionally ignored: _resolve_token_conflict already
        # verified the prefixed row does NOT exist (existing_prefixed is None
        # above), so this insert is always a new write under normal conditions.
        # A race-condition duplicate would still emit ("conflict-inserted",…),
        # which matches the original behaviour pre-refactor.
        _do_insert_token(cursor, prefixed_slug, tok, dry_run)
        return ("conflict-inserted", prefixed_slug)

    # New row — insert
    inserted = _do_insert_token(cursor, slug, tok, dry_run)
    if inserted:
        return ("inserted", None)
    return ("skipped", None)


def _process_client_snapshot(
    conn: sqlite3.Connection,
    client_dir: "Path",
    dry_run: bool,
) -> tuple[dict, list[str]]:
    """Read + parse a client's theme-snapshot.json, write tokens, return counters + report lines.

    Returns:
        (counters_dict, conflict_lines) where counters_dict has keys:
            client_inserted, client_skipped, client_conflicts
        and conflict_lines is the list of conflict bullet strings for the report.

    Calls conn.commit() at the end if not dry_run (preserves original per-client commit semantics).
    """
    client_slug = client_dir.name
    snapshot_path = client_dir / "theme-snapshot.json"

    # Missing snapshot — caller has already appended the section header
    if not snapshot_path.exists():
        return (
            {"client_inserted": 0, "client_skipped": 0, "client_conflicts": 0, "_missing": True},
            [],
        )

    try:
        with open(snapshot_path, encoding="utf-8") as fh:
            snapshot = json.load(fh)
    except (json.JSONDecodeError, OSError) as exc:
        return (
            {"client_inserted": 0, "client_skipped": 0, "client_conflicts": 0, "_error": str(exc)},
            [],
        )

    candidates = _build_token_candidates(snapshot, client_slug)

    client_inserted = 0
    client_skipped = 0
    client_conflicts = 0
    conflict_lines: list[str] = []

    c = conn.cursor()
    for tok in candidates:
        # Inject private _client_slug so _write_token_row can build the prefixed slug
        tok["_client_slug"] = client_slug
        verb, conflict_slug = _write_token_row(c, tok, dry_run)
        if verb == "inserted":
            client_inserted += 1
        elif verb == "skipped":
            client_skipped += 1
        elif verb in ("conflict-inserted", "conflict-skipped"):
            client_conflicts += 1
            # Recover the existing framework value for the report line
            existing_val = c.execute(
                _SELECT_TOKEN_DEFAULT_VALUE,
                (tok["slug"],),
            ).fetchone()
            existing_display = existing_val[0] if existing_val else "?"
            conflict_lines.append(
                f"- CONFLICT: {tok['slug']} (framework={existing_display!r}, client={tok['default_value']!r}) "
                f"→ inserted as {conflict_slug}"
            )
            if verb == "conflict-inserted":
                # New prefixed row — also counts as inserted
                client_inserted += 1
            # conflict-skipped: prefixed row already exists — no inserted increment

    if not dry_run:
        conn.commit()

    return (
        {"client_inserted": client_inserted, "client_skipped": client_skipped, "client_conflicts": client_conflicts},
        conflict_lines,
    )


def _write_stage4_report(
    report_path: "Path",
    header_lines: list[str],
    per_client_lines: list[str],
    summary_line: str,
    dry_run: bool,
) -> None:
    """Assemble and write the Stage 4 plain-text audit report.

    Writes only in non-dry-run mode (matches the original behaviour). The
    report directory is still created so a follow-up actual run finds it ready.
    """
    all_lines = header_lines + [summary_line, ""] + per_client_lines
    report_path.parent.mkdir(parents=True, exist_ok=True)
    if not dry_run:
        report_path.write_text("\n".join(all_lines), encoding="utf-8")


def stage_4_style_variation_sync(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """Walk sites/*/theme-snapshot.json → INSERT OR IGNORE into design_tokens.

    Phase 5a is shipped (commit 43a93df9). Writes are now active.

    For each client snapshot, harvests:
      - settings.color.palette  → token_type='colour'
      - settings.typography.fontSizes → token_type='size'
      - settings.spacing.spacingSizes → token_type='spacing'
      - settings.shadow.presets → token_type='shadow'
      - settings.typography.fontFamilies → token_type='font'

    Routing config keys (settings.custom.sgs-headerPattern, sgs-footerPattern,
    buttonPresets, maxWidth, etc.) are excluded — these are structural config,
    not design tokens.

    Slug collision handling: if a slug already exists with a DIFFERENT value,
    prepend the client slug to avoid silently overwriting the framework default.
    Conflicts are logged to the report.

    Idempotency: second run produces 0 inserts (INSERT OR IGNORE throughout).

    Report written to reports/phase4-variation-token-gaps.txt (overwritten each run).

    Returns:
        snapshots_found:   number of theme-snapshot.json files scanned
        snapshots_missing: client dirs with no snapshot file
        tokens_inserted:   new rows added to design_tokens (0 on second run)
        tokens_skipped:    rows already present (idempotent skips)
        tokens_filtered:   non-token keys excluded from write
        conflicts:         slugs that existed with a different value (prefixed)
        report_path:       absolute path to the written report
        dry_run:           forwarded flag
    """
    sites_root = REPO_ROOT / "sites"
    report_path = REPO_ROOT / "reports" / "phase4-variation-token-gaps.txt"

    snapshots_found = 0
    snapshots_missing = 0
    total_inserted = 0
    total_skipped = 0
    total_filtered = 0
    total_conflicts = 0
    ts = datetime.now(timezone.utc).strftime(_UTC_TIMESTAMP_FMT)

    header_lines: list[str] = [
        f"# Stage 4 Style Variation Sync — {ts}",
        "",
        "Phase 5a shipped. DB writes active.",
        "",
    ]
    per_client_lines: list[str] = ["## Per-client results", ""]

    if not sites_root.exists():
        per_client_lines.append("_(sites/ directory not found — no snapshots to scan)_")
        per_client_lines.append("")
    else:
        for client_dir in sorted(d for d in sites_root.iterdir() if d.is_dir()):
            client_slug = client_dir.name
            snapshot_path = client_dir / "theme-snapshot.json"
            per_client_lines.append(f"### {client_slug}")
            per_client_lines.append("")

            if not snapshot_path.exists():
                snapshots_missing += 1
                per_client_lines.append("_(theme-snapshot.json not found)_")
                per_client_lines.append("")
                continue

            snapshots_found += 1
            counters, conflict_lines = _process_client_snapshot(conn, client_dir, dry_run)

            if "_error" in counters:
                per_client_lines.append(f"_(error reading snapshot: {counters['_error']})_")
                per_client_lines.append("")
                continue

            client_inserted = counters["client_inserted"]
            client_skipped = counters["client_skipped"]
            client_conflicts = counters["client_conflicts"]
            total_inserted += client_inserted
            total_skipped += client_skipped
            total_conflicts += client_conflicts

            per_client_lines.append(
                f"Inserted: {client_inserted} | Skipped: {client_skipped} | "
                f"Conflicts: {client_conflicts}"
            )
            if conflict_lines:
                per_client_lines.append("")
                per_client_lines.extend(conflict_lines)
            per_client_lines.append("")

    # Metadata update
    if not dry_run:
        upsert_metadata(conn, "last_variation_sync_ts", datetime.now(timezone.utc).isoformat())

    summary_line = (
        f"Snapshots found: {snapshots_found} | Missing: {snapshots_missing} | "
        f"Inserted: {total_inserted} | Skipped: {total_skipped} | "
        f"Conflicts: {total_conflicts}"
    )

    _write_stage4_report(report_path, header_lines, per_client_lines, summary_line, dry_run)

    mode = "dry-run" if dry_run else "actual"
    print(
        f"Stage 4 [{mode}]: {snapshots_found} snapshots, {snapshots_missing} missing. "
        f"Inserted: {total_inserted}, skipped: {total_skipped}, conflicts: {total_conflicts}. "
        f"Report: {report_path}"
    )

    return {
        "snapshots_found": snapshots_found,
        "snapshots_missing": snapshots_missing,
        "tokens_inserted": total_inserted,
        "tokens_skipped": total_skipped,
        "tokens_filtered": total_filtered,
        "conflicts": total_conflicts,
        "report_path": str(report_path),
        "dry_run": dry_run,
    }


# ---------------------------------------------------------------------------
# Stage 5 — Slot synonym auto-seed (Step 4.5)
#
# D99 2026-05-29: queries `slots WHERE scope='element'` (was slot_synonyms).
# slot_synonyms was retired in D99; all 89 element-scope rows migrated to the
# unified `slots` table.
#
# For every element-scope slot row where standalone_block IS NULL or empty,
# runs a heuristic name-match against the sgs blocks table to propose an
# SGS block mapping.
#
# Heuristic confidence levels:
#   high   — exact slug match (e.g. 'hero' -> 'sgs/hero') → auto-UPDATE
#   medium — single prefix/contains match with ≥4 char overlap → LOG only
#   low    — no match OR multiple ambiguous matches → LOG only
#
# High-confidence matches are applied via UPDATE (not INSERT — rows exist).
# Medium/low proposals are written to the report file for manual review.
#
# Report file: reports/phase4-slot-synonym-proposals.txt (overwritten each run).
# Report is always written (even in dry-run — it is observational).
# ---------------------------------------------------------------------------

import re as _re


def _camel_to_kebab(name: str) -> str:
    """Convert camelCase to kebab-case (e.g. buttonSecondary -> button-secondary)."""
    # Insert hyphen before uppercase letters that follow lowercase letters/digits
    s1 = _re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", name)
    return s1.lower()


def _match_slot_to_block(cursor, normalised: str) -> tuple:
    """Run the 3-tier slot→block match. Pure query — no writes, no side effects.

    Returns:
        (confidence, matched_slug, candidate_slugs)
        confidence ∈ {'high', 'medium-prefix', 'medium-contains',
                      'low-ambiguous-prefix', 'low-ambiguous-contains',
                      'low-none', 'low-no-normalised'}
        matched_slug: slug for 'high' / 'medium-*' tiers, None otherwise
        candidate_slugs: list for 'low-ambiguous-*' (multiple matches), empty for the rest
    """
    if not normalised:
        return ("low-no-normalised", None, [])

    # Tier 1: exact slug match
    exact = cursor.execute(
        "SELECT slug FROM blocks WHERE source='sgs' AND slug = ?",
        (f"sgs/{normalised}",),
    ).fetchone()
    if exact:
        return ("high", exact[0], [])

    # Tier 2: prefix match
    prefix_results = cursor.execute(
        "SELECT slug FROM blocks WHERE source='sgs' AND slug LIKE ?",
        (f"sgs/{normalised}%",),
    ).fetchall()
    if len(prefix_results) == 1 and len(normalised) >= 4:
        return ("medium-prefix", prefix_results[0][0], [])
    if len(prefix_results) > 1:
        # Return full list — coordinator slices for display (consistency with contains branch).
        return ("low-ambiguous-prefix", None, [r[0] for r in prefix_results])

    # Tier 3: contains match
    contains_results = cursor.execute(
        "SELECT slug FROM blocks WHERE source='sgs' AND slug LIKE ?",
        (f"%{normalised}%",),
    ).fetchall()
    if len(contains_results) == 1 and len(normalised) >= 4:
        return ("medium-contains", contains_results[0][0], [])
    if len(contains_results) > 1:
        return ("low-ambiguous-contains", None, [r[0] for r in contains_results])

    return ("low-none", None, [])


def _apply_high_confidence_match(cursor, row_id: int, slug: str, dry_run: bool) -> None:
    """Isolate the single UPDATE write for a high-confidence match.

    D99 2026-05-29: queries `slots WHERE scope='element'` (was slot_synonyms).
    """
    if not dry_run:
        cursor.execute(
            "UPDATE slots SET standalone_block=? WHERE rowid=? AND scope='element'",
            (slug, row_id),
        )


def _build_synonym_report(
    high_lines: list,
    medium_lines: list,
    low_lines: list,
    counts: dict,
    ts: str,
) -> str:
    """Assemble the markdown report.

    `counts` keys: unmapped_count, auto_inserted, manual_review, no_match.
    """
    lines: list = [
        f"# Slot Synonym Auto-Seed Proposals — {ts}",
        "",
        "## Summary",
        f"Unmapped rows: {counts['unmapped_count']} | "
        f"Auto-inserted (high confidence): {counts['auto_inserted']} | "
        f"Manual review (medium confidence): {counts['manual_review']} | "
        f"No match (low confidence): {counts['no_match']}",
        "",
    ]

    if high_lines:
        lines += ["## High confidence (auto-updated)", ""] + high_lines + [""]
    else:
        lines += ["## High confidence (auto-updated)", "", _REPORT_NONE_MARKER, ""]

    if medium_lines:
        lines += ["## Medium confidence (manual review required)", ""] + medium_lines + [""]
    else:
        lines += ["## Medium confidence (manual review required)", "", _REPORT_NONE_MARKER, ""]

    if low_lines:
        lines += ["## Low confidence (no clear match)", ""] + low_lines + [""]
    else:
        lines += ["## Low confidence (no clear match)", "", _REPORT_NONE_MARKER, ""]

    return "\n".join(lines)


def stage_5_slot_synonym_auto_seed(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """Heuristic auto-seed of slot_synonyms.standalone_block for unmapped rows.

    Queries slot_synonyms WHERE standalone_block IS NULL OR standalone_block = ''.
    For each unmapped slot, runs a 3-tier heuristic against blocks WHERE source='sgs':
      1. Exact slug match:      sgs/<normalised-name>
      2. Prefix match:          slug LIKE 'sgs/<normalised-name>%'  (single result only)
      3. Contains match:        slug LIKE '%<normalised-name>%'       (single result only)

    High-confidence (exact) → UPDATE slot_synonyms SET standalone_block=slug.
    Medium-confidence (single prefix) → log to report, no write.
    Low (contains or multiple/none) → log to report, no write.

    Returns: {"unmapped_count", "auto_inserted", "manual_review", "no_match",
              "report_path", "dry_run"}
    """
    c = conn.cursor()
    report_path = REPO_ROOT / "reports" / "phase4-slot-synonym-proposals.txt"

    # Fetch all unmapped element-scope slots (using rowid for reliable UPDATE targeting).
    # D99 2026-05-29: queries `slots WHERE scope='element'` (was slot_synonyms).
    rows = c.execute(
        """
        SELECT rowid, slot_name
        FROM slots
        WHERE scope='element' AND (standalone_block IS NULL OR standalone_block = '')
        """
    ).fetchall()

    unmapped_count = len(rows)
    auto_inserted = 0
    manual_review = 0
    no_match = 0

    high_lines: list = []
    medium_lines: list = []
    low_lines: list = []

    for row_id, canonical_slot in rows:
        normalised = _camel_to_kebab(canonical_slot).strip("_- ")
        confidence, matched_slug, candidates = _match_slot_to_block(c, normalised)

        if confidence == "high":
            high_lines.append(f"- slot='{canonical_slot}' → {matched_slug} (exact match)")
            _apply_high_confidence_match(c, row_id, matched_slug, dry_run)
            auto_inserted += 1

        elif confidence == "medium-prefix":
            medium_lines.append(
                f"- slot='{canonical_slot}' → {matched_slug} "
                f"(prefix match — review before accepting)"
            )
            manual_review += 1

        elif confidence == "medium-contains":
            medium_lines.append(
                f"- slot='{canonical_slot}' → {matched_slug} "
                f"(contains match — review before accepting)"
            )
            manual_review += 1

        elif confidence == "low-ambiguous-prefix":
            # Display up to 5 candidates — preserves original behaviour (the helper now
            # returns the full list so the helper's API is uniform across both ambiguous tiers).
            low_lines.append(
                f"- slot='{canonical_slot}' (multiple prefix matches: {', '.join(candidates[:5])})"
            )
            no_match += 1

        elif confidence == "low-ambiguous-contains":
            low_lines.append(
                f"- slot='{canonical_slot}' "
                f"(ambiguous — {len(candidates)} contains matches, no auto-seed)"
            )
            no_match += 1

        elif confidence == "low-no-normalised":
            low_lines.append(f"- slot='{canonical_slot}' (could not normalise name)")
            no_match += 1

        else:  # low-none
            low_lines.append(f"- slot='{canonical_slot}' (no SGS block matches)")
            no_match += 1

    if not dry_run:
        conn.commit()

    # --- Write report (always — observational, fine in dry-run) ---
    ts = datetime.now(timezone.utc).strftime(_UTC_TIMESTAMP_FMT)
    counts = {
        "unmapped_count": unmapped_count,
        "auto_inserted": auto_inserted,
        "manual_review": manual_review,
        "no_match": no_match,
    }
    report_content = _build_synonym_report(high_lines, medium_lines, low_lines, counts, ts)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report_content, encoding="utf-8")

    mode = "dry-run" if dry_run else "actual"
    print(
        f"Stage 5 [{mode}]: {unmapped_count} unmapped slots. "
        f"Auto-updated: {auto_inserted}, manual review: {manual_review}, "
        f"no match: {no_match}. "
        f"Report: {report_path}"
    )

    return {
        "unmapped_count": unmapped_count,
        "auto_inserted": auto_inserted,
        "manual_review": manual_review,
        "no_match": no_match,
        "report_path": str(report_path),
        "dry_run": dry_run,
    }


# ---------------------------------------------------------------------------
# Stage 6 — Block replacement mapping (Step 4.5)
#
# Walks blocks WHERE source='sgs' AND replaces IS NOT NULL.
# For each `replaces` value (single slug or comma-separated list),
# verifies each target slug exists in blocks WHERE source='native_wp'.
#
# Valid mappings:  all targets resolve → logged to valid list.
# Stale mappings: at least one target missing → logged to stale list.
#
# Stale mappings are written to reports/phase4-stale-replacements.txt.
# NO automated deletions — operator reviews and acts manually.
# Report is always written (even in dry-run — observational).
#
# Idempotent: read-only against the blocks table.
# ---------------------------------------------------------------------------

def _build_stale_report_line(sgs_slug: str, replaces_raw: str, missing_targets: list[str]) -> str:
    """Format one stale-mapping bullet line for the report.

    Handles singular/plural wording based on len(missing_targets).
    """
    if len(missing_targets) == 1:
        return (
            f"- {sgs_slug} replaces '{replaces_raw}' "
            f"— '{missing_targets[0]}' not found in native_wp blocks"
        )
    missing_str = ", ".join(f"'{m}'" for m in missing_targets)
    return (
        f"- {sgs_slug} replaces '{replaces_raw}' "
        f"— targets not found: {missing_str}"
    )


def _write_stale_report(
    report_path: Path,
    checked: int,
    valid: int,
    stale: int,
    stale_lines: list[str],
) -> None:
    """Assemble and write the stale-replacements report to disk."""
    ts = datetime.now(timezone.utc).strftime(_UTC_TIMESTAMP_FMT)
    lines: list[str] = [
        f"# Stale Block Replacement Mappings — {ts}",
        "",
        f"Checked: {checked} | Valid: {valid} | Stale: {stale}",
        "",
    ]

    if stale_lines:
        lines += ["## Stale mappings (manual review required)", ""] + stale_lines + [""]
    else:
        lines += [
            "## Stale mappings (manual review required)", "",
            "_(none — all mappings resolve to existing native_wp blocks)_",
            "",
        ]

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")


def stage_6_block_replacement_mapping(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """Validate blocks.replaces mappings against the current native_wp block roster.

    Reads blocks WHERE source='sgs' AND replaces IS NOT NULL AND replaces != ''.
    For each target in the replaces field (comma-separated if multiple), checks
    SELECT 1 FROM blocks WHERE slug=target AND source='native_wp'.

    Stale mappings (unresolved targets) are logged to:
      reports/phase4-stale-replacements.txt

    No automated writes to the blocks table. Operator reviews stale list manually.
    Returns: {"checked": int, "valid": int, "stale": int, "report_path": str, "dry_run": bool}
    """
    c = conn.cursor()
    report_path = REPO_ROOT / "reports" / "phase4-stale-replacements.txt"

    rows = c.execute(
        """
        SELECT slug, replaces
        FROM blocks
        WHERE source='sgs' AND replaces IS NOT NULL AND replaces != ''
        """
    ).fetchall()

    checked = 0
    valid = 0
    stale = 0
    stale_lines: list[str] = []

    for sgs_slug, replaces_raw in rows:
        targets = [t.strip() for t in replaces_raw.split(",") if t.strip()]
        if not targets:
            continue

        checked += 1
        missing_targets: list[str] = []
        for target_slug in targets:
            exists = c.execute(_SELECT_BLOCK_EXISTS_NATIVE_WP, (target_slug,)).fetchone()
            if exists is None:
                missing_targets.append(target_slug)

        if missing_targets:
            stale += 1
            stale_lines.append(_build_stale_report_line(sgs_slug, replaces_raw, missing_targets))
        else:
            valid += 1

    _write_stale_report(report_path, checked, valid, stale, stale_lines)

    mode = "dry-run" if dry_run else "actual"
    print(
        f"Stage 6 [{mode}]: {checked} blocks checked. "
        f"Valid: {valid}, Stale: {stale}. "
        f"Report: {report_path}"
    )

    return {
        "checked": checked,
        "valid": valid,
        "stale": stale,
        "report_path": str(report_path),
        "dry_run": dry_run,
    }


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

def _extract_major_minor(version_str: str) -> str | None:
    """Extract MAJOR.MINOR from a version string such as '7.0.1' → '7.0'.

    Returns None if the string cannot be parsed.
    """
    import re as _re
    m = _re.match(r"(\d+\.\d+)", version_str.strip())
    return m.group(1) if m else None


def stage_9_drift_gate(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """Compare live site WP MAJOR.MINOR against schema_metadata.wp_version_indexed.

    1. Reads schema_metadata.wp_version_indexed (set by Stage 2).
       Returns skipped status if the row is absent — run Stage 2 first.
    2. Dry-run: skips the SSH call and returns immediately.
    3. Fetches live WP version via:
         ssh -p 65002 u945238940@141.136.39.73
             "cd domains/sandybrown-nightingale-600381.hostingersite.com/public_html
              && wp eval 'echo get_bloginfo(\"version\");'"
       15-second timeout. SSH failure is non-fatal — returns skipped status.
    4. Compares MAJOR.MINOR only. Same version → silent pass.
       Mismatch → prints warning and returns drift_detected status.

    # TODO: wire into .claude/hooks/deploy hook as a future integration point.
    # When the deploy pre-hook is built, call:
    #   python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 9
    # and gate the deploy on the returned status being 'ok' or 'skipped'.
    """
    c = conn.cursor()

    # Step 1 — Read wp_version_indexed from schema_metadata
    row = c.execute(
        "SELECT value FROM schema_metadata WHERE key = ?",
        ("wp_version_indexed",),
    ).fetchone()

    if row is None or not row[0]:
        msg = "wp_version_indexed not set; run Stage 2 first"
        print(f"Stage 9 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}

    db_indexed_raw: str = row[0]
    db_major_minor = _extract_major_minor(db_indexed_raw)
    if db_major_minor is None:
        msg = f"wp_version_indexed value '{db_indexed_raw}' is not a parseable version"
        print(f"Stage 9 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}

    # Step 2 — Dry-run: skip SSH call
    if dry_run:
        msg = "dry-run mode"
        print(f"Stage 9 [dry-run]: skipping SSH version check ({msg})")
        return {"status": "skipped", "reason": msg, "db_indexed": db_indexed_raw}

    # Step 3 — Fetch live WP version via SSH (sandybrown dev site)
    ssh_cmd = [
        "ssh",
        "-p", "65002",
        "-o", "ConnectTimeout=15",
        "-o", "BatchMode=yes",
        "-o", "StrictHostKeyChecking=no",
        "u945238940@141.136.39.73",
        (
            "cd domains/sandybrown-nightingale-600381.hostingersite.com/public_html"
            " && wp eval 'echo get_bloginfo(\"version\");'"
        ),
    ]

    try:
        result = subprocess.run(
            ssh_cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=15,
        )
        raw_output = (result.stdout or "").strip()
        if result.returncode != 0 or not raw_output:
            stderr_snippet = (result.stderr or "").strip()[:200]
            msg = f"SSH command failed (exit {result.returncode}): {stderr_snippet or '(no stderr)'}"
            print(f"Stage 9 [skipped]: {msg}")
            return {"status": "skipped", "reason": msg}
    except subprocess.TimeoutExpired:
        msg = "SSH timed out after 15 s — drift check skipped"
        print(f"Stage 9 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}
    except OSError as exc:
        msg = f"SSH unavailable — drift check skipped ({exc})"
        print(f"Stage 9 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}

    # Step 4 — Parse and compare
    site_version_raw = raw_output
    site_major_minor = _extract_major_minor(site_version_raw)

    if site_major_minor is None:
        msg = f"Could not parse WP version from SSH output: {site_version_raw!r}"
        print(f"Stage 9 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}

    if site_major_minor == db_major_minor:
        # Silent pass — versions agree at MAJOR.MINOR level
        print(
            f"Stage 9 [ok]: site WP {site_version_raw} matches "
            f"DB indexed version {db_indexed_raw} (MAJOR.MINOR: {db_major_minor})"
        )
        return {
            "status": "ok",
            "site_version": site_version_raw,
            "db_indexed": db_indexed_raw,
        }

    # MAJOR.MINOR mismatch — emit warning
    warning = (
        f"DRIFT DETECTED: Site is WP {site_version_raw} "
        f"(MAJOR.MINOR {site_major_minor}) but DB indexed for WP {db_indexed_raw} "
        f"(MAJOR.MINOR {db_major_minor}). "
        "Run /sgs-update (Stage 2 live-scrapes upstream) before deploying knowledge-dependent features."
    )
    print(f"\n⚠  Stage 9 [drift_detected]: {warning}\n")
    return {
        "status": "drift_detected",
        "site_version": site_version_raw,
        "db_indexed": db_indexed_raw,
        "warning": warning,
    }


# ---------------------------------------------------------------------------
# Stage 10 — Prune orphans
#
# Cleans rows in block_supports / block_capabilities / block_attributes whose
# block_slug no longer exists in the `blocks` table (i.e. the block was retired
# or renamed since those rows were written).
#
# For block_supports rows whose block_slug DOES still exist in `blocks` but
# whose support_name is no longer present in the current block.json file, the
# default behaviour is to mark them `is_stale = 1` rather than delete.  The
# operator can pass `--prune-mode aggressive` to DELETE those rows instead.
#
# Operates on BOTH DBs (.agents + .claude) to keep them in sync, mirroring
# the dual-path pattern used by seed-slot-synonyms.py.
# ---------------------------------------------------------------------------

# Second DB path (.claude) — the .agents DB is the canonical primary and is
# opened by `open_db()` / the `conn` argument.  Stage 10 also writes to this
# secondary path so both stores stay in sync.
_CLAUDE_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Prune mode constants
# 'aggressive'   — DELETE stale support rows (default; source of truth is block.json).
# 'conservative' — set is_stale=1 instead of deleting (opt-in cautious mode).
# Legacy alias kept so any external callers using 'mark-stale' still work.
_PRUNE_MODE_AGGRESSIVE   = "aggressive"
_PRUNE_MODE_CONSERVATIVE = "conservative"
_PRUNE_MODE_MARK_STALE   = "conservative"  # legacy alias


def _open_claude_db() -> sqlite3.Connection | None:
    """Open the .claude DB if it exists and is a distinct file from .agents; return None otherwise.

    The two DB paths are typically hard-linked to the same inode on this machine.
    When they share an inode, opening both connections concurrently would create
    a second write-lock on the same file, which is unnecessary and risks busy
    errors.  In that case we return None (the primary conn already covers both paths).
    """
    if not _CLAUDE_DB.exists():
        print(f"  WARNING: .claude DB not found at {_CLAUDE_DB} — skipping secondary DB writes.")
        return None
    # Check whether the two paths point to the same physical file (hard link)
    try:
        agents_inode = SGS_DB.stat().st_ino
        claude_inode = _CLAUDE_DB.stat().st_ino
        if agents_inode == claude_inode:
            # Same inode — primary conn already covers .claude; no second connection needed
            return None
    except OSError:
        pass
    conn = sqlite3.connect(str(_CLAUDE_DB))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _ensure_blocks_is_stale_column(conn: sqlite3.Connection) -> None:
    """Add is_stale column to blocks table if absent (idempotent DDL)."""
    cols = {row[1] for row in conn.execute("PRAGMA table_info(blocks)").fetchall()}
    if "is_stale" not in cols:
        conn.execute("ALTER TABLE blocks ADD COLUMN is_stale INTEGER DEFAULT 0")
        conn.commit()


def _prune_orphans_on_conn(
    conn: sqlite3.Connection,
    db_label: str,
    live_slugs: frozenset[str],
    live_supports: dict[str, frozenset[str]],
    live_attrs: dict[str, frozenset[str]],
    prune_mode: str,
    dry_run: bool,
) -> dict:
    """Run the prune logic against a single open DB connection.

    Parameters
    ----------
    conn          : open DB connection to operate on
    db_label      : short label for log output ('.agents' or '.claude')
    live_slugs    : set of block slugs currently in src/blocks/*/block.json
    live_supports : mapping slug -> frozenset of support_names from block.json
    live_attrs    : mapping slug -> frozenset of attr_names from block.json
    prune_mode    : _PRUNE_MODE_AGGRESSIVE (default) or _PRUNE_MODE_CONSERVATIVE
    dry_run       : if True, count affected rows without writing

    Four categories of stale rows are handled:

    (a) BLOCK-LEVEL ORPHANS — block_slug absent from `blocks` table (block retired/renamed).
        All child rows (block_supports, block_capabilities, block_attributes) are always deleted.

    (b) STALE SUPPORTS — block exists but support_name removed from block.json.
        aggressive   → DELETE the row.
        conservative → set is_stale=1 (leaves the row for manual inspection).

    (c) ATTR-LEVEL ORPHANS — block exists but attr_name removed from block.json.
        Always deleted regardless of prune_mode (block_attributes has no is_stale column).
        Conservative mode logs a warning but still deletes (no-op alternative would silently
        accumulate ghost rows that Stage 1 can never clean up).

    (d) RETIRED BLOCKS IN blocks TABLE — sgs/* slug in blocks table but no corresponding
        block.json exists in src/blocks/<basename>/.  Core blocks (non-sgs/* prefix) are
        skipped — they are managed by Stage 2.
        aggressive   → DELETE the row from blocks.
        conservative → set is_stale=1 on the blocks row (column added if absent).

    Returns counters dict.
    """
    c = conn.cursor()

    # ---- (d) Retired blocks in `blocks` table (sgs/* slug, no block.json on disk) ----
    # Must run BEFORE (a) so child-row orphan queries still find the parent slugs to act on.
    _ensure_blocks_is_stale_column(conn)

    retired_block_slugs: list[str] = []
    for (slug,) in c.execute(
        "SELECT slug FROM blocks WHERE source = 'sgs' AND slug LIKE 'sgs/%'"
    ).fetchall():
        if slug not in live_slugs:
            retired_block_slugs.append(slug)

    if not dry_run and retired_block_slugs:
        if prune_mode == _PRUNE_MODE_AGGRESSIVE:
            c.executemany(
                "DELETE FROM blocks WHERE slug = ?",
                [(s,) for s in retired_block_slugs],
            )
        else:
            # conservative: mark is_stale=1 — leaves rows for manual inspection
            c.executemany(
                "UPDATE blocks SET is_stale = 1 WHERE slug = ?",
                [(s,) for s in retired_block_slugs],
            )
        conn.commit()

    stale_d_verb = "deleted" if prune_mode == _PRUNE_MODE_AGGRESSIVE else "marked_stale"
    print(
        f"  [{db_label}] orphan_blocks_{stale_d_verb}={len(retired_block_slugs)}"
        + (f" {retired_block_slugs}" if retired_block_slugs else "")
        + (" [DRY-RUN — no writes]" if dry_run else "")
    )

    # ---- (a) Block-level orphan rows (block_slug absent from `blocks`) ----

    orphan_supports_q = """
        SELECT id FROM block_supports
        WHERE source = 'sgs'
          AND block_slug NOT IN (SELECT slug FROM blocks WHERE source = 'sgs')
    """
    orphan_caps_q = """
        SELECT id FROM block_capabilities
        WHERE block_slug NOT IN (SELECT slug FROM blocks WHERE source = 'sgs')
    """
    orphan_attrs_block_level_q = """
        SELECT id FROM block_attributes
        WHERE source = 'sgs'
          AND block_slug NOT IN (SELECT slug FROM blocks WHERE source = 'sgs')
    """

    orphan_support_ids      = [r[0] for r in c.execute(orphan_supports_q).fetchall()]
    orphan_cap_ids          = [r[0] for r in c.execute(orphan_caps_q).fetchall()]
    orphan_attr_ids         = [r[0] for r in c.execute(orphan_attrs_block_level_q).fetchall()]

    if not dry_run:
        if orphan_support_ids:
            c.executemany(
                "DELETE FROM block_supports WHERE id = ?",
                [(rid,) for rid in orphan_support_ids],
            )
        if orphan_cap_ids:
            c.executemany(
                "DELETE FROM block_capabilities WHERE id = ?",
                [(rid,) for rid in orphan_cap_ids],
            )
        if orphan_attr_ids:
            c.executemany(
                "DELETE FROM block_attributes WHERE id = ?",
                [(rid,) for rid in orphan_attr_ids],
            )

    # ---- (b) Stale supports (slug exists in blocks but support_name removed from block.json) ----
    # Only applies to SGS-source rows; native_wp rows are managed by Stage 2.
    # Also catches:
    #   - pre-existing is_stale=1 rows whose support is still absent from block.json
    #   - rows where the block is in the `blocks` table but no block.json exists on disk
    #     (retired blocks that weren't pruned from the blocks table — their supports are stale)

    stale_support_ids: list[int] = []
    extant_q = """
        SELECT bs.id, bs.block_slug, bs.support_name
        FROM block_supports bs
        WHERE bs.source = 'sgs'
          AND bs.block_slug IN (SELECT slug FROM blocks WHERE source = 'sgs')
    """
    for row in c.execute(extant_q).fetchall():
        row_id, b_slug, s_name = row[0], row[1], row[2]
        if b_slug not in live_supports:
            # Block is in DB but has no block.json on disk — all its supports are stale
            stale_support_ids.append(row_id)
        elif s_name not in live_supports[b_slug]:
            # Block exists and has block.json but this specific support was removed
            stale_support_ids.append(row_id)

    if not dry_run and stale_support_ids:
        if prune_mode == _PRUNE_MODE_AGGRESSIVE:
            c.executemany(
                "DELETE FROM block_supports WHERE id = ?",
                [(rid,) for rid in stale_support_ids],
            )
        else:
            # conservative: mark is_stale=1 — leaves rows for manual inspection
            c.executemany(
                "UPDATE block_supports SET is_stale = 1 WHERE id = ?",
                [(rid,) for rid in stale_support_ids],
            )

    # ---- (c) Attr-level orphans (block exists but attr_name removed from block.json) ----
    # block_attributes has no is_stale column, so conservative mode is a no-op here.
    # These ghost rows are always deleted — Stage 1 only INSERTs/UPDATEs, never removes.

    ghost_attr_ids: list[int] = []
    extant_attrs_q = """
        SELECT ba.id, ba.block_slug, ba.attr_name
        FROM block_attributes ba
        WHERE ba.source = 'sgs'
          AND ba.block_slug IN (SELECT slug FROM blocks WHERE source = 'sgs')
    """
    for row in c.execute(extant_attrs_q).fetchall():
        row_id, b_slug, a_name = row[0], row[1], row[2]
        if b_slug not in live_attrs:
            # Block is in DB but has no block.json on disk — all its attrs are ghost rows
            ghost_attr_ids.append(row_id)
        elif a_name not in live_attrs[b_slug]:
            # Block exists and has block.json but this specific attr was removed
            ghost_attr_ids.append(row_id)

    if prune_mode == _PRUNE_MODE_CONSERVATIVE and ghost_attr_ids:
        print(
            f"  [{db_label}] NOTE: conservative prune_mode requested but "
            f"{len(ghost_attr_ids)} attr-level ghost row(s) will still be deleted "
            f"(block_attributes has no is_stale column — no alternative)."
        )

    if not dry_run and ghost_attr_ids:
        c.executemany(
            "DELETE FROM block_attributes WHERE id = ?",
            [(rid,) for rid in ghost_attr_ids],
        )

    if not dry_run:
        conn.commit()

    stale_verb = "deleted" if prune_mode == _PRUNE_MODE_AGGRESSIVE else "marked_stale"
    label_prefix = f"  [{db_label}]"
    print(
        f"{label_prefix} orphan_block_supports_deleted={len(orphan_support_ids)}, "
        f"orphan_capabilities_deleted={len(orphan_cap_ids)}, "
        f"orphan_attributes_deleted={len(orphan_attr_ids)}, "
        f"stale_supports_{stale_verb}={len(stale_support_ids)}, "
        f"orphan_attributes_deleted_attr_level={len(ghost_attr_ids)}"
        + (" [DRY-RUN — no writes]" if dry_run else "")
    )

    return {
        "db": db_label,
        "orphan_block_supports_deleted": len(orphan_support_ids),
        "orphan_capabilities_deleted": len(orphan_cap_ids),
        "orphan_attributes_deleted": len(orphan_attr_ids),
        f"stale_supports_{stale_verb}": len(stale_support_ids),
        "stale_supports_actioned": len(stale_support_ids),
        "orphan_attributes_deleted_attr_level": len(ghost_attr_ids),
        f"orphan_blocks_{stale_d_verb}": len(retired_block_slugs),
        "orphan_blocks_actioned": len(retired_block_slugs),
        "prune_mode": prune_mode,
    }


def stage_10_prune_orphans(
    conn: sqlite3.Connection,
    dry_run: bool = False,
    prune_mode: str = _PRUNE_MODE_AGGRESSIVE,
) -> dict:
    """Delete orphan rows and clean up stale support/attr rows across both DBs.

    Four categories are handled (see _prune_orphans_on_conn docstring for detail):

    (a) BLOCK-LEVEL ORPHANS — block_slug absent from `blocks` table.  All child rows in
        block_supports, block_capabilities, and block_attributes are always deleted.

    (b) STALE SUPPORTS — block exists but support_name removed from block.json.
        Default (aggressive) deletes them.  Pass --prune-mode conservative to mark
        is_stale=1 instead (opt-in cautious mode).

    (c) ATTR-LEVEL ORPHANS — block exists but attr_name removed from block.json.
        Always deleted.  Stage 1 only INSERTs/UPDATEs attrs; it never removes them.
        block_attributes has no is_stale column so conservative mode is a no-op here.

    (d) RETIRED BLOCKS IN blocks TABLE — sgs/* slug in blocks table but no corresponding
        block.json on disk.  Default (aggressive) DELETEs the blocks row; conservative marks
        is_stale=1.  Non-sgs/* slugs (core/*, etc.) are skipped — they have a different
        lifecycle managed by Stage 2.

    Parameters
    ----------
    conn       : primary DB connection (.agents)
    dry_run    : if True, count affected rows without writing any changes
    prune_mode : 'aggressive' (default) — DELETE stale supports + retired blocks.
                 'conservative'         — set is_stale=1 instead.

    Both DBs (.agents + .claude) are processed.  Counts from each are reported
    separately, then aggregated in the returned dict.  Result key ``orphan_blocks_deleted``
    always present (0 when nothing was deleted).
    """
    blocks_dir = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
    if not blocks_dir.exists():
        msg = f"blocks dir not found: {blocks_dir}"
        print(f"Stage 10 [error]: {msg}")
        return {"error": msg}

    # Build live_slugs, live_supports, and live_attrs from current block.json files
    live_slugs: set[str] = set()
    live_supports: dict[str, frozenset[str]] = {}
    live_attrs: dict[str, frozenset[str]] = {}

    for block_dir in sorted(blocks_dir.iterdir()):
        if not block_dir.is_dir() or block_dir.name in EXCLUDED_DIRS:
            continue
        block_json_path = block_dir / "block.json"
        if not block_json_path.exists():
            continue
        try:
            with open(block_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        slug = data.get("name", f"sgs/{block_dir.name}")
        live_slugs.add(slug)
        live_supports[slug] = frozenset(data.get("supports", {}).keys())
        live_attrs[slug] = frozenset(data.get("attributes", {}).keys())

    frozen_slugs = frozenset(live_slugs)

    # Detect whether the two DB paths share the same inode (hard-linked)
    same_inode = False
    try:
        same_inode = SGS_DB.stat().st_ino == _CLAUDE_DB.stat().st_ino
    except OSError:
        pass

    db_scope_note = "(single hard-linked DB)" if same_inode else "(both DBs)"

    print(
        f"\nStage 10 [prune-orphans]: {len(frozen_slugs)} live block slugs found. "
        f"prune_mode={prune_mode} {db_scope_note}"
        + (" [DRY-RUN]" if dry_run else "")
    )

    # --- Primary DB (.agents) ---
    agents_counts = _prune_orphans_on_conn(
        conn, ".agents", frozen_slugs, live_supports, live_attrs, prune_mode, dry_run
    )

    # --- Secondary DB (.claude) — only when it is a distinct physical file ---
    claude_conn = _open_claude_db()
    claude_counts: dict = {}
    if claude_conn is not None:
        claude_counts = _prune_orphans_on_conn(
            claude_conn, ".claude", frozen_slugs, live_supports, live_attrs, prune_mode, dry_run
        )
        claude_conn.close()
    elif not same_inode:
        print("  [.claude] skipped — DB not found.")

    # Aggregate totals (when same inode, .agents counts cover both paths)
    total_orphan_supports = (
        agents_counts.get("orphan_block_supports_deleted", 0)
        + claude_counts.get("orphan_block_supports_deleted", 0)
    )
    total_orphan_caps = (
        agents_counts.get("orphan_capabilities_deleted", 0)
        + claude_counts.get("orphan_capabilities_deleted", 0)
    )
    total_orphan_attrs = (
        agents_counts.get("orphan_attributes_deleted", 0)
        + claude_counts.get("orphan_attributes_deleted", 0)
    )
    total_stale_supports = (
        agents_counts.get("stale_supports_actioned", 0)
        + claude_counts.get("stale_supports_actioned", 0)
    )
    total_ghost_attrs = (
        agents_counts.get("orphan_attributes_deleted_attr_level", 0)
        + claude_counts.get("orphan_attributes_deleted_attr_level", 0)
    )
    total_orphan_blocks = (
        agents_counts.get("orphan_blocks_actioned", 0)
        + claude_counts.get("orphan_blocks_actioned", 0)
    )

    stale_verb = "deleted" if prune_mode == _PRUNE_MODE_AGGRESSIVE else "marked_stale"
    summary = (
        f"Stage 10: orphan_block_supports_deleted={total_orphan_supports}, "
        f"orphan_capabilities_deleted={total_orphan_caps}, "
        f"orphan_attributes_deleted={total_orphan_attrs}, "
        f"stale_supports_{stale_verb}={total_stale_supports}, "
        f"orphan_attributes_deleted_attr_level={total_ghost_attrs}, "
        f"orphan_blocks_{stale_verb}={total_orphan_blocks} {db_scope_note}."
    )
    print(summary)

    return {
        "orphan_block_supports_deleted": total_orphan_supports,
        "orphan_capabilities_deleted": total_orphan_caps,
        "orphan_attributes_deleted": total_orphan_attrs,
        f"stale_supports_{stale_verb}": total_stale_supports,
        "orphan_attributes_deleted_attr_level": total_ghost_attrs,
        f"orphan_blocks_{stale_verb}": total_orphan_blocks,
        "orphan_blocks_deleted": total_orphan_blocks,
        "prune_mode": prune_mode,
        "agents": agents_counts,
        "claude": claude_counts,
        "dry_run": dry_run,
    }


# ---------------------------------------------------------------------------
# Main dispatcher
# ---------------------------------------------------------------------------

def _build_stage_dispatch(conn: sqlite3.Connection, args: argparse.Namespace) -> dict[int, Callable[[], dict]]:
    """Build {stage_num: lambda} mapping; each lambda runs the right stage function.

    Stage 3 is retired — its lambda prints the tombstone line and returns
    {"status": "retired", "dry_run": args.dry_run}.
    Stage 10 is the prune-orphans stage (controlled by --prune-mode).
    """
    prune_mode = getattr(args, "prune_mode", _PRUNE_MODE_AGGRESSIVE)
    return {
        1: lambda: stage_1_sgs_codebase_scan(conn, dry_run=args.dry_run),
        2: lambda: stage_2_core_gutenberg_cache_refresh(
            conn, wp_version=args.wp_version, dry_run=args.dry_run
        ),
        3: lambda: (
            print(
                "Stage 3 retired (architecture-staging Phase 1 close-out, decisions.md D56). "
                "WP-CLI handbook refresh now lives in Stage 2 Source 3. Skipping."
            )
            or {"status": "retired", "dry_run": args.dry_run}
        ),
        4: lambda: stage_4_style_variation_sync(conn, dry_run=args.dry_run),
        5: lambda: stage_5_slot_synonym_auto_seed(conn, dry_run=args.dry_run),
        6: lambda: stage_6_block_replacement_mapping(conn, dry_run=args.dry_run),
        7: lambda: stage_7_spec_doc_regen(dry_run=args.dry_run),
        8: lambda: stage_8_uimax_mirror(dry_run=args.dry_run),
        9: lambda: stage_9_drift_gate(conn, dry_run=args.dry_run),
        10: lambda: stage_10_prune_orphans(conn, dry_run=args.dry_run, prune_mode=prune_mode),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SGS framework knowledge base — 10-stage holistic refresh",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--stage",
        type=int,
        choices=range(1, 11),
        metavar="N",
        help="Run a single stage only (1-10). Omit to run all stages.",
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
    parser.add_argument(
        "--prune-mode",
        dest="prune_mode",
        choices=[_PRUNE_MODE_AGGRESSIVE, _PRUNE_MODE_CONSERVATIVE],
        default=_PRUNE_MODE_AGGRESSIVE,
        help=(
            "Stage 10 prune behaviour for stale support rows "
            "(block_slug exists in blocks but support_name removed from block.json). "
            "'aggressive' (default) DELETEs them — source of truth is block.json. "
            "'conservative' sets is_stale=1 instead (opt-in cautious mode). "
            "Attr-level ghost rows (block exists but attr removed) are always deleted "
            "regardless of this setting — block_attributes has no is_stale column."
        ),
    )
    args = parser.parse_args()

    print(f"sgs-update-v2.py — repo: {REPO_ROOT}")
    print(f"sgs-framework.db: {SGS_DB}")
    if args.dry_run:
        print("[DRY RUN — no DB or file writes]")
    print()

    conn = open_db()
    ensure_schema_metadata(conn)

    stages_to_run = [args.stage] if args.stage else list(range(1, 11))
    dispatch = _build_stage_dispatch(conn, args)

    results: dict[int, dict] = {}
    for stage_num in stages_to_run:
        print(f"\n{'=' * 50}\n=== Stage {stage_num} ===\n{'=' * 50}")
        if stage_num not in dispatch:
            print(f"Unknown stage: {stage_num}. Valid: 1-10.")
            continue
        results[stage_num] = dispatch[stage_num]()

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
