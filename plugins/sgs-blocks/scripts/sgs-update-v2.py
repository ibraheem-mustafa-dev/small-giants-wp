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

# Re-used SQL literals (kept as constants so they stay in sync across call sites)
_SELECT_BLOCK_EXISTS_NATIVE_WP = "SELECT 1 FROM blocks WHERE slug=? AND source='native_wp'"
_SELECT_DOC_EXISTS_NATIVE_WP = "SELECT 1 FROM docs WHERE slug=? AND source='native_wp'"

# Re-used string literals
_UTC_TIMESTAMP_FMT = "%Y-%m-%d %H:%M:%S UTC"
_REPORT_NONE_MARKER = "_(none)_"

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

        # Stage 1 tail (2026-05-24) — run canonical-slot assignment so new
        # block_attributes rows from this scan get canonical_slot + role +
        # derived_selector populated immediately. Without this wire-in,
        # assign-canonical.py was a standalone script that nobody invoked,
        # leaving NULL canonical_slot on many array attrs and blocking the
        # walker's universal extraction. See Spec 16 §12.6 Stage 4 spec intent.
        try:
            import subprocess as _subprocess
            from pathlib import Path as _Path
            _repo_root = _Path(__file__).resolve().parents[3]
            _ac_script = _repo_root / "plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py"
            if _ac_script.exists():
                # assign-canonical.py opens its own DB connection — release ours
                # briefly so SQLite's write lock isn't held during the subprocess.
                conn.commit()
                result = _subprocess.run(
                    ["python", str(_ac_script)],
                    capture_output=True, text=True, timeout=60,
                )
                if result.returncode == 0:
                    # Extract the summary line (the script prints a final "Total resolved: N, Total gaps: M")
                    tail = [ln for ln in (result.stdout or "").splitlines() if "resolved" in ln.lower() or "gaps" in ln.lower()]
                    print(f"Stage 1 tail (canonical assignment): {tail[-1] if tail else 'completed'}")
                else:
                    print(f"Stage 1 tail (canonical assignment): WARN exit={result.returncode}; stderr={result.stderr[:200]}")
        except Exception as _exc:  # noqa: BLE001
            print(f"Stage 1 tail (canonical assignment): WARN {_exc}")

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
# Stage 2 — Core/Gutenberg cache refresh
# Decision 30 — 10 canonical upstream sources.
#
# Mode A (default): reads cached ~/.wp-blockmarkup-mcp/blocks.db
#   + ~/.wp-devdocs-mcp/hooks.db. Checks schema_metadata.last_full_refresh_ts;
#   if <7 days old, skips entirely. Idempotent: INSERT OR IGNORE throughout.
#
# Mode B (--refresh-upstream): live network scrape of 10 sources:
#   1. WordPress/gutenberg block-library block.json files (GitHub API)
#   2. WordPress/wordpress-develop PHP hook files (GitHub API)
#   3. wp-cli/handbook markdown files (GitHub API)
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


def _mode_a_read_cached(
    conn: sqlite3.Connection,
    dry_run: bool,
    wp_version: str,
) -> dict:
    """Mode A — read cached source DBs and INSERT OR IGNORE into sgs-framework.db.

    Source DBs (~/.wp-blockmarkup-mcp/blocks.db + ~/.wp-devdocs-mcp/hooks.db) were
    retired on 2026-05-24 (architecture-staging Phase 1) — the canonical data lives
    in sgs-framework.db now. When the source files are absent, Mode A is a no-op
    that returns a `cached_current` / `cache_missing` status. Use Mode B
    (--refresh-upstream) to live-fetch updates from GitHub.

    Checks schema_metadata.last_full_refresh_ts first. If <7 days old, skips.
    If stale or never set AND source DBs exist, reads them; otherwise no-ops.
    """
    blocks_db_path = Path.home() / ".wp-blockmarkup-mcp" / "blocks.db"
    hooks_db_path = Path.home() / ".wp-devdocs-mcp" / "hooks.db"

    THRESHOLD_DAYS = 7

    # --- Check freshness ---
    c = conn.cursor()
    c.execute(
        "SELECT value FROM schema_metadata WHERE key = 'last_full_refresh_ts'"
    )
    row = c.fetchone()
    last_ts_str: str | None = row[0] if row else None

    if last_ts_str:
        try:
            last_ts = datetime.fromisoformat(last_ts_str)
            # Ensure timezone-aware comparison
            if last_ts.tzinfo is None:
                last_ts = last_ts.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            age_days = (now - last_ts).total_seconds() / 86400
            if age_days < THRESHOLD_DAYS:
                msg = (
                    f"Stage 2: cached data current ({age_days:.1f} days old, "
                    f"threshold {THRESHOLD_DAYS} days). Skipping. "
                    f"Run with --refresh-upstream to force re-scrape."
                )
                print(msg)
                return {
                    "status": "cached_current",
                    "age_days": round(age_days, 1),
                    "last_full_refresh_ts": last_ts_str,
                    "wp_version_indexed": wp_version,
                }
        except ValueError:
            pass  # Malformed timestamp — fall through to re-read

    # --- Read cached blocks.db ---
    new_rows: dict[str, int] = {
        "blocks": 0,
        "block_attributes": 0,
        "block_supports": 0,
        "hooks": 0,
        "docs": 0,
        "hooks_dropped_check_constraint": 0,
    }

    if not blocks_db_path.exists():
        print(
            "Stage 2 [Mode A] no-op: source cache absent (retired 2026-05-24). "
            "sgs-framework.db is the canonical store now. "
            "Run with --refresh-upstream to live-fetch from GitHub."
        )
    else:
        if dry_run:
            src = sqlite3.connect(str(blocks_db_path))
            src.row_factory = sqlite3.Row
            sc = src.cursor()

            # Count what WOULD be new blocks
            sc.execute("SELECT block_name FROM blocks")
            for b in sc.fetchall():
                ex = c.execute(
                    _SELECT_BLOCK_EXISTS_NATIVE_WP,
                    (b["block_name"],),
                ).fetchone()
                if ex is None:
                    new_rows["blocks"] += 1

            sc.execute(
                "SELECT b.block_name, a.name FROM attributes a JOIN blocks b ON a.block_id=b.id"
            )
            for a in sc.fetchall():
                ex = c.execute(
                    "SELECT 1 FROM block_attributes WHERE block_slug=? AND attr_name=? AND source='native_wp'",
                    (a["block_name"], a["name"]),
                ).fetchone()
                if ex is None:
                    new_rows["block_attributes"] += 1

            sc.execute(
                "SELECT b.block_name, s.feature FROM supports s JOIN blocks b ON s.block_id=b.id"
            )
            for s in sc.fetchall():
                ex = c.execute(
                    "SELECT 1 FROM block_supports WHERE block_slug=? AND support_name=? AND source='native_wp'",
                    (s["block_name"], s["feature"]),
                ).fetchone()
                if ex is None:
                    new_rows["block_supports"] += 1
            src.close()
        else:
            src = sqlite3.connect(str(blocks_db_path))
            src.row_factory = sqlite3.Row
            sc = src.cursor()

            # INSERT OR IGNORE blocks
            sc.execute(
                "SELECT block_name, title, description, category, block_type FROM blocks"
            )
            for b in sc.fetchall():
                res = c.execute(
                    """
                    INSERT OR IGNORE INTO blocks
                        (slug, title, description, category, type, source)
                    VALUES (?, ?, ?, ?, ?, 'native_wp')
                    """,
                    (b["block_name"], b["title"], b["description"],
                     b["category"], b["block_type"]),
                )
                new_rows["blocks"] += res.rowcount

            # INSERT OR IGNORE block_attributes
            sc.execute(
                "SELECT b.block_name, a.name, a.type, a.default_val, a.selector "
                "FROM attributes a JOIN blocks b ON a.block_id = b.id"
            )
            for a in sc.fetchall():
                res = c.execute(
                    """
                    INSERT OR IGNORE INTO block_attributes
                        (block_slug, attr_name, attr_type, default_value, derived_selector, source)
                    VALUES (?, ?, ?, ?, ?, 'native_wp')
                    """,
                    (a["block_name"], a["name"], a["type"],
                     a["default_val"], a["selector"]),
                )
                new_rows["block_attributes"] += res.rowcount

            # INSERT OR IGNORE block_supports
            sc.execute(
                "SELECT b.block_name, s.feature, s.config "
                "FROM supports s JOIN blocks b ON s.block_id = b.id"
            )
            for s in sc.fetchall():
                res = c.execute(
                    """
                    INSERT OR IGNORE INTO block_supports
                        (block_slug, support_name, support_value, source)
                    VALUES (?, ?, ?, 'native_wp')
                    """,
                    (s["block_name"], s["feature"], s["config"]),
                )
                new_rows["block_supports"] += res.rowcount

            conn.commit()
            src.close()

    # --- Read cached hooks.db ---
    SOURCE_MAP = {
        1: "native_wp", 2: "native_wp", 3: "native_wp",
        4: "native_wp", 5: "native_wp", 6: "native_wp",
        7: "native_wp", 8: "third_party",
    }

    if not hooks_db_path.exists():
        print(
            "Stage 2 [Mode A] no-op (hooks): source cache absent (retired 2026-05-24). "
            "Run with --refresh-upstream to live-fetch from GitHub."
        )
    else:
        src = sqlite3.connect(str(hooks_db_path))
        src.row_factory = sqlite3.Row
        sc = src.cursor()

        # The target hooks table has CHECK(hook_type IN ('action', 'filter')).
        # Cached hooks.db includes JS hook types ('js_action', 'js_filter') which
        # fail this constraint — INSERT OR IGNORE silently drops them. Both
        # dry-run and actual paths must filter on this set so the prediction
        # matches reality.
        ALLOWED_HOOK_TYPES = {"action", "filter"}

        if dry_run:
            # Target hooks table has TWO independent UNIQUE constraints:
            #   1. (name, source) — separate UNIQUE INDEX idx_hooks_name_source
            #   2. (name, hook_type) — inline table-level UNIQUE
            # INSERT OR IGNORE silently drops on EITHER violation. Dedupe by
            # the union: a row inserts only if both (name, source) and
            # (name, hook_type) are unique against the target AND we haven't
            # already queued an insert of the same name+hook_type combo.
            seen_hooks: set[tuple[str, str]] = set()
            sc.execute("SELECT name, type, source_id FROM hooks")
            for h in sc.fetchall():
                hook_type = h["type"] or ""
                if hook_type not in ALLOWED_HOOK_TYPES:
                    new_rows["hooks_dropped_check_constraint"] += 1
                    continue
                source_label = SOURCE_MAP.get(h["source_id"], "native_wp")
                # Within-source dedup on (name, hook_type) — first occurrence wins
                # (matches the more restrictive of the two UNIQUE constraints).
                key = (h["name"], hook_type)
                if key in seen_hooks:
                    continue
                seen_hooks.add(key)
                # Check BOTH UNIQUE constraints against target
                ex = c.execute(
                    "SELECT 1 FROM hooks WHERE (name=? AND source=?) OR (name=? AND hook_type=?)",
                    (h["name"], source_label, h["name"], hook_type),
                ).fetchone()
                if ex is None:
                    new_rows["hooks"] += 1

            seen_docs: set[tuple[str, str]] = set()
            sc.execute("SELECT slug, source_id FROM docs")
            for d in sc.fetchall():
                source_label = SOURCE_MAP.get(d["source_id"], "native_wp")
                key = (d["slug"], source_label)
                if key in seen_docs:
                    continue
                seen_docs.add(key)
                ex = c.execute(
                    "SELECT 1 FROM docs WHERE slug=? AND source=?",
                    (d["slug"], source_label),
                ).fetchone()
                if ex is None:
                    new_rows["docs"] += 1
        else:
            # INSERT OR IGNORE hooks — pre-filter to track dropped count
            sc.execute(
                "SELECT name, type, source_id, params, file_path, docblock FROM hooks"
            )
            for h in sc.fetchall():
                hook_type = h["type"] or ""
                if hook_type not in ALLOWED_HOOK_TYPES:
                    new_rows["hooks_dropped_check_constraint"] += 1
                    continue
                source_label = SOURCE_MAP.get(h["source_id"], "native_wp")
                res = c.execute(
                    """
                    INSERT OR IGNORE INTO hooks
                        (name, hook_type, plugin_slug, parameters, file_path, source, docblock, type)
                    VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
                    """,
                    (h["name"], hook_type, h["params"],
                     h["file_path"], source_label, h["docblock"], hook_type),
                )
                new_rows["hooks"] += res.rowcount

            # INSERT OR IGNORE docs
            sc.execute(
                "SELECT file_path, slug, title, doc_type, category, content, source_id FROM docs"
            )
            for d in sc.fetchall():
                source_label = SOURCE_MAP.get(d["source_id"], "native_wp")
                res = c.execute(
                    """
                    INSERT OR IGNORE INTO docs
                        (source, file_path, slug, title, doc_type, category, content)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (source_label, d["file_path"], d["slug"],
                     d["title"], d["doc_type"], d["category"], d["content"]),
                )
                new_rows["docs"] += res.rowcount

            conn.commit()
        src.close()

    now_ts = datetime.now(timezone.utc).isoformat()

    # Insert counts only (excluding the diagnostic dropped-by-CHECK counter)
    insert_counts = {k: v for k, v in new_rows.items() if k != "hooks_dropped_check_constraint"}
    dropped = new_rows["hooks_dropped_check_constraint"]

    if not dry_run:
        upsert_metadata(conn, "last_full_refresh_ts", now_ts)
        upsert_metadata(conn, "wp_version_indexed", wp_version)
        total_new = sum(insert_counts.values())
        dropped_note = f" Dropped {dropped} JS hooks (hook_type CHECK constraint)." if dropped else ""
        if total_new == 0:
            print(
                f"Stage 2 [Mode A]: 0 new rows inserted — DB current "
                f"(all cached rows already present).{dropped_note} wp_version_indexed={wp_version}"
            )
        else:
            print(
                f"Stage 2 [Mode A]: inserted from cache — {insert_counts}.{dropped_note} "
                f"last_full_refresh_ts set. wp_version_indexed={wp_version}"
            )
    else:
        dropped_note = f" Dropped {dropped} JS hooks (hook_type CHECK constraint)." if dropped else ""
        print(
            f"Stage 2 [Mode A, dry-run]: would insert — {insert_counts}.{dropped_note} "
            f"last_full_refresh_ts + wp_version_indexed would be set to {wp_version}."
        )

    return {
        "status": "cached_read",
        "wp_version_indexed": wp_version,
        "new_rows": new_rows,
        "last_full_refresh_ts": now_ts if not dry_run else None,
        "dry_run": dry_run,
    }


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
      4. developer.wordpress.org/reference/since/<wp_version>.0/ (scraper-health floor ≥30 — recalibrated 2026-05-22 from 100 after WP 7.0 verified to genuinely have 41 items)
      5. make.wordpress.org/core/<wp_version>-field-guide
      6. developer.wordpress.org/news
      7. developer.wordpress.org/block-editor
      8. developer.wordpress.org/themes
      9. developer.wordpress.org/plugins
      10. developer.wordpress.org/rest-api

    All inserts are INSERT OR IGNORE — idempotent.
    Network failures per source are caught and logged to sources_failed.
    """
    github_token: str | None = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN")
    if github_token:
        print("Stage 2 [Mode B]: GitHub PAT found — using authenticated GitHub API (5000 req/hr).")
    else:
        print("Stage 2 [Mode B]: No GitHub PAT — using unauthenticated GitHub API (60 req/hr). Set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN.")

    c = conn.cursor()
    sources_succeeded: list[str] = []
    sources_failed: list[str] = []
    new_rows: dict[str, int] = {
        "blocks": 0, "block_attributes": 0, "block_supports": 0,
        "hooks": 0, "docs": 0,
    }
    items_per_source: dict[str, int] = {}

    # --- Source 1: WordPress/gutenberg block-library block.json files ---
    source_1_name = "gutenberg-block-library"
    try:
        print(f"\n[Source 1] WordPress/gutenberg packages/block-library/src/ at v{wp_version}.0 ...")
        # List directories in packages/block-library/src/
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
            block_name = entry["name"]
            block_json_url = (
                f"https://api.github.com/repos/WordPress/gutenberg/contents/"
                f"packages/block-library/src/{block_name}/block.json?ref={ref_tag}"
            )
            try:
                file_data = _github_api_get(block_json_url, github_token)
                if not isinstance(file_data, dict):
                    continue
                # GitHub returns file content as base64
                import base64
                content_b64 = file_data.get("content", "")
                if not content_b64:
                    continue
                decoded = base64.b64decode(content_b64.replace("\n", "")).decode("utf-8", errors="replace")
                block_data = json.loads(decoded)
            except json.JSONDecodeError:
                continue
            except Exception:
                continue

            slug = block_data.get("name", f"core/{block_name}")
            title = block_data.get("title", block_name)
            description = block_data.get("description", "")
            category = block_data.get("category", "")
            block_type = "dynamic" if "$schema" in block_data else "static"

            if not dry_run:
                res = c.execute(
                    """
                    INSERT OR IGNORE INTO blocks
                        (slug, title, description, category, type, source)
                    VALUES (?, ?, ?, ?, ?, 'native_wp')
                    """,
                    (slug, title, description, category, block_type),
                )
                new_rows["blocks"] += res.rowcount
                s1_blocks += res.rowcount

                # Attributes
                for attr_name, attr_def in block_data.get("attributes", {}).items():
                    if not isinstance(attr_def, dict):
                        continue
                    res = c.execute(
                        """
                        INSERT OR IGNORE INTO block_attributes
                            (block_slug, attr_name, attr_type, default_value, source)
                        VALUES (?, ?, ?, ?, 'native_wp')
                        """,
                        (
                            slug, attr_name,
                            attr_def.get("type", "string"),
                            json.dumps(attr_def.get("default")) if "default" in attr_def else None,
                        ),
                    )
                    new_rows["block_attributes"] += res.rowcount
                    s1_attrs += res.rowcount

                # Supports
                for support_name, support_val in block_data.get("supports", {}).items():
                    res = c.execute(
                        """
                        INSERT OR IGNORE INTO block_supports
                            (block_slug, support_name, support_value, source)
                        VALUES (?, ?, ?, 'native_wp')
                        """,
                        (slug, support_name, json.dumps(support_val)),
                    )
                    new_rows["block_supports"] += res.rowcount
                    s1_supports += res.rowcount
            else:
                # dry-run: count what would be new
                ex = c.execute(
                    _SELECT_BLOCK_EXISTS_NATIVE_WP, (slug,)
                ).fetchone()
                if ex is None:
                    new_rows["blocks"] += 1
                    s1_blocks += 1

        if not dry_run:
            conn.commit()

        items_per_source[source_1_name] = len(block_dirs)
        print(f"  Source 1 done: {len(block_dirs)} dirs, {s1_blocks} new block rows, "
              f"{s1_attrs} new attr rows, {s1_supports} new support rows.")
        sources_succeeded.append(source_1_name)

    except _GithubRateLimitError as exc:
        msg = f"Source 1 FAILED: {exc}"
        print(f"  {msg}")
        sources_failed.append(f"{source_1_name}: {exc}")
    except Exception as exc:
        msg = f"Source 1 FAILED: {type(exc).__name__}: {exc}"
        print(f"  {msg}")
        sources_failed.append(f"{source_1_name}: {exc}")

    # --- Source 2: WordPress/wordpress-develop PHP hook files ---
    source_2_name = "wordpress-develop-hooks"
    try:
        print(f"\n[Source 2] WordPress/wordpress-develop PHP hook files at v{wp_version}.0 ...")
        # Target a representative subset of hook-dense files (full repo is unbounded)
        hook_files = [
            "src/wp-includes/post.php",
            "src/wp-includes/default-filters.php",
            "src/wp-includes/theme.php",
            "src/wp-includes/template.php",
            "src/wp-includes/formatting.php",
        ]
        ref_tag = f"{wp_version}.0"  # wordpress-develop uses plain X.Y.Z tags
        hook_re = re.compile(
            r"""(?:do_action|apply_filters)\s*\(\s*['"]([a-zA-Z0-9_\-]+)['"]""",
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
                import base64
                content_b64 = file_data.get("content", "")
                if not content_b64:
                    continue
                decoded = base64.b64decode(content_b64.replace("\n", "")).decode("utf-8", errors="replace")
            except Exception as file_exc:
                print(f"    WARNING: {file_path} fetch failed: {file_exc}")
                continue

            hook_names = set(hook_re.findall(decoded))
            # Determine hook_type from context (crude: apply_filters → filter, do_action → action)
            action_re = re.compile(r"""do_action\s*\(\s*['"]([a-zA-Z0-9_\-]+)['"]""", re.MULTILINE)
            actions = set(action_re.findall(decoded))

            s2_extracted += len(hook_names)

            for hook_name in hook_names:
                hook_type = "action" if hook_name in actions else "filter"
                if not dry_run:
                    res = c.execute(
                        """
                        INSERT OR IGNORE INTO hooks
                            (name, hook_type, plugin_slug, file_path, source, type)
                        VALUES (?, ?, NULL, ?, 'native_wp', ?)
                        """,
                        (hook_name, hook_type, file_path, hook_type),
                    )
                    new_rows["hooks"] += res.rowcount
                    s2_inserted += res.rowcount
                else:
                    ex = c.execute(
                        "SELECT 1 FROM hooks WHERE name=? AND source='native_wp'", (hook_name,)
                    ).fetchone()
                    if ex is None:
                        new_rows["hooks"] += 1
                        s2_inserted += 1

            print(f"    {file_path}: {len(hook_names)} hook references found.")

        if not dry_run:
            conn.commit()

        items_per_source[source_2_name] = s2_extracted
        print(f"  Source 2 done: {s2_extracted} hooks extracted, {s2_inserted} new rows inserted.")
        # Gate success on EXTRACTION count (scraper-health signal), not insertion
        # count. Hooks already in sgs-framework.db from Mode A's cached merge will
        # INSERT OR IGNORE to rowcount=0 — that's not a failure, that's
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

            if not dry_run:
                res = c.execute(
                    """
                    INSERT OR IGNORE INTO docs
                        (source, slug, title, doc_type, category, content)
                    VALUES ('native_wp', ?, ?, 'cli-command', 'wpcli', ?)
                    """,
                    (slug, title, content_text),
                )
                new_rows["docs"] += res.rowcount
                s3_docs += res.rowcount
            else:
                ex = c.execute(
                    _SELECT_DOC_EXISTS_NATIVE_WP, (slug,)
                ).fetchone()
                if ex is None:
                    new_rows["docs"] += 1
                    s3_docs += 1

        if not dry_run:
            conn.commit()

        items_per_source[source_3_name] = len(md_files)
        print(f"  Source 3 done: {len(md_files)} files, {s3_docs} new doc rows.")
        sources_succeeded.append(source_3_name)

    except _GithubRateLimitError as exc:
        print(f"  Source 3 FAILED: {exc}")
        sources_failed.append(f"{source_3_name}: {exc}")
    except Exception as exc:
        print(f"  Source 3 FAILED: {type(exc).__name__}: {exc}")
        sources_failed.append(f"{source_3_name}: {exc}")

    # --- Source 4: developer.wordpress.org/reference/since/<version>.0/ ---
    # SCRAPER-HEALTH FLOOR: if <30 items found, FAIL with explicit count.
    # The minimum was originally 100 (calibrated for typical releases) but
    # WP 7.0 genuinely has only 41 new public API identifiers — a smaller
    # release. Floor lowered to 30 so the gate still catches a broken
    # scraper (returns 0 due to selector drift or rate limit) without
    # false-positiving on small-release pages. Verified empirically
    # 2026-05-22: both urllib and Playwright return 41 items for WP 7.0,
    # which is the real count, not a parsing failure.
    source_4_name = "devdocs-since"
    MINIMUM_SOURCE_4_ITEMS = 30
    try:
        print(f"\n[Source 4] developer.wordpress.org/reference/since/{wp_version}.0/ ...")
        since_url = f"https://developer.wordpress.org/reference/since/{wp_version}.0/"
        html_body = _http_fetch(since_url)
        identifiers = _parse_since_page(html_body)
        count = len(identifiers)
        print(f"  Found {count} API identifiers.")

        if count < MINIMUM_SOURCE_4_ITEMS:
            # Fallback: the page is JS-rendered — try the Playwright Node script
            print(
                f"  urllib returned only {count} items (< {MINIMUM_SOURCE_4_ITEMS}). "
                f"Page may be JS-rendered. Trying Playwright fallback..."
            )
            playwright_html: str | None = None
            try:
                playwright_html = _fetch_with_playwright(since_url)
                fallback_identifiers = _parse_since_page(playwright_html)
                fallback_count = len(fallback_identifiers)
                print(f"  Playwright fallback: {fallback_count} identifiers found.")
                if fallback_count >= MINIMUM_SOURCE_4_ITEMS:
                    identifiers = fallback_identifiers
                    count = fallback_count
            except Exception as pw_exc:
                print(f"  Playwright fallback FAILED: {pw_exc}")

        if count < MINIMUM_SOURCE_4_ITEMS:
            # Both urllib and Playwright (if available) yielded < 100 — hard fail
            msg = (
                f"Stage 2 Source 4 FAILED: only {count} API identifiers found from "
                f"{since_url}. Hard minimum is {MINIMUM_SOURCE_4_ITEMS}. "
                f"Both urllib and Playwright fallback exhausted. "
                f"Verify the page loads {MINIMUM_SOURCE_4_ITEMS}+ items manually."
            )
            print(f"  {msg}")
            sources_failed.append(f"{source_4_name}: {msg}")
        else:
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

            items_per_source[source_4_name] = count
            print(f"  Source 4 done: {count} identifiers, {s4_docs} new doc rows.")
            sources_succeeded.append(source_4_name)

    except urllib.error.URLError as exc:
        print(f"  Source 4 FAILED: network error — {exc}")
        sources_failed.append(f"{source_4_name}: URLError: {exc}")
    except Exception as exc:
        print(f"  Source 4 FAILED: {type(exc).__name__}: {exc}")
        sources_failed.append(f"{source_4_name}: {exc}")

    # --- Sources 5-10: developer.wordpress.org handbook pages + make.wordpress.org ---
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
                # Use article links as the docs
                s_docs = 0
                for i, (href, text) in enumerate(article_links):
                    slug = f"{slug_prefix}-{i+1}"
                    if not dry_run:
                        res = c.execute(
                            """
                            INSERT OR IGNORE INTO docs
                                (source, slug, title, doc_type, category, content)
                            VALUES ('native_wp', ?, ?, ?, 'dev-blog', ?)
                            """,
                            (slug, text.strip(), doc_type, href),
                        )
                        new_rows["docs"] += res.rowcount
                        s_docs += res.rowcount
                    else:
                        ex = c.execute(
                            _SELECT_DOC_EXISTS_NATIVE_WP, (slug,)
                        ).fetchone()
                        if ex is None:
                            new_rows["docs"] += 1
                            s_docs += 1
                if not dry_run:
                    conn.commit()
                items_per_source[src_name] = len(article_links)
                print(f"  {src_name}: {len(article_links)} articles, {s_docs} new rows.")
            else:
                # Top-level handbook: insert as one summary doc with sections as content
                content = "\n".join(f"## {s}" for s in sections[:50]) if sections else ""
                slug = slug_prefix
                s_docs = 0
                if not dry_run:
                    res = c.execute(
                        """
                        INSERT OR IGNORE INTO docs
                            (source, slug, title, doc_type, category, content)
                        VALUES ('native_wp', ?, ?, ?, ?, ?)
                        """,
                        (slug, doc_title, doc_type, doc_type, content),
                    )
                    new_rows["docs"] += res.rowcount
                    s_docs += res.rowcount
                    conn.commit()
                else:
                    ex = c.execute(
                        _SELECT_DOC_EXISTS_NATIVE_WP, (slug,)
                    ).fetchone()
                    if ex is None:
                        new_rows["docs"] += 1
                        s_docs += 1
                items_per_source[src_name] = len(sections)
                print(f"  {src_name}: {len(sections)} sections found, {s_docs} new row.")

            sources_succeeded.append(src_name)

        except urllib.error.URLError as exc:
            print(f"  {src_name} FAILED: network error — {exc}")
            sources_failed.append(f"{src_name}: URLError: {exc}")
        except Exception as exc:
            print(f"  {src_name} FAILED: {type(exc).__name__}: {exc}")
            sources_failed.append(f"{src_name}: {exc}")

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
    refresh_upstream: bool = False,
    wp_version: str = WP_VERSION_DEFAULT,
    dry_run: bool = False,
) -> dict:
    """Core/Gutenberg cache refresh — two modes (Decision 30).

    Mode A (default, no --refresh-upstream):
      Reads cached source DBs if present and INSERT OR IGNOREs into sgs-framework.db.
      Source DBs were retired 2026-05-24 (architecture-staging Phase 1); when absent
      Mode A is a no-op with an informative status message. Use Mode B for live
      updates. Checks schema_metadata.last_full_refresh_ts — if <7 days old, skips.

    Mode B (--refresh-upstream):
      Live network scrape of 10 canonical sources from Decision 30.
      All inserts are INSERT OR IGNORE (idempotent).
      Source 4 scraper-health floor: <30 items = FAIL with explicit count.
      After all sources: updates schema_metadata wp_version_indexed + last_full_refresh_ts.

    Idempotent: second run (either mode) produces 0 new rows.
    """
    ensure_schema_metadata(conn)

    if refresh_upstream:
        return _mode_b_refresh_upstream(conn, dry_run=dry_run, wp_version=wp_version)
    else:
        return _mode_a_read_cached(conn, dry_run=dry_run, wp_version=wp_version)


# ---------------------------------------------------------------------------
# Stage 3 — WP-CLI handbook refresh (Step 4.5)
#
# Reads existing docs rows from cached ~/.wp-devdocs-mcp/hooks.db (source_id=6,
# wp-cli-handbook) where slug LIKE 'commands--%' (the command reference subset)
# and INSERT OR IGNORE them into sgs-framework.db docs with
# doc_type='cli-command', source='native_wp'.
#
# The live re-fetch path (Mode B Source 3 in Stage 2) handles upstream scraping.
# Stage 3 is the cache-read path: refresh from the already-indexed cache only.
#
# Cross-check: after run, if total cli-command rows < 12, emit a WARNING
# (not a failure — the threshold is a soft signal, not a gate).
#
# Idempotent: second run inserts 0 rows (INSERT OR IGNORE throughout).
# ---------------------------------------------------------------------------

# Minimum expected WP-CLI command rows after a successful Stage 3 run
_WPCLI_MIN_EXPECTED = 12


def stage_3_wpcli_handbook_refresh(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """Refresh docs table with WP-CLI command reference content from the cached
    ~/.wp-devdocs-mcp/hooks.db (source_id=6, wp-cli-handbook).

    Two-step strategy:
      1. INSERT OR IGNORE — adds any command slugs not yet in sgs-framework.db.
      2. UPDATE doc_type — ensures all commands-- rows carry doc_type='cli-command'.
         Stage 2 Mode A imports hooks.db docs verbatim with their original doc_types
         (e.g. 'reference'); this step corrects that for the WP-CLI command subset.
         Both steps are idempotent: a second run produces no effective changes.

    Returns: {"new_rows": int, "reclassified": int, "total_cli_commands": int, "dry_run": bool}
    """
    hooks_db_path = Path.home() / ".wp-devdocs-mcp" / "hooks.db"
    c = conn.cursor()

    if not hooks_db_path.exists():
        print(
            "Stage 3 no-op: hooks.db source cache absent (retired 2026-05-24). "
            "sgs-framework.db is the canonical docs store. "
            "Run with --refresh-upstream to live-fetch WP-CLI handbook updates."
        )
        total_cli = c.execute(
            "SELECT COUNT(*) FROM docs WHERE doc_type='cli-command' AND source='native_wp'"
        ).fetchone()[0]
        return {"new_rows": 0, "reclassified": 0, "total_cli_commands": total_cli,
                "dry_run": dry_run, "status": "source_cache_retired"}

    # Open the cached hooks.db
    src = sqlite3.connect(str(hooks_db_path))
    src.row_factory = sqlite3.Row
    sc = src.cursor()

    # Fetch all WP-CLI command entries (slug LIKE 'commands--%', source_id=6)
    sc.execute(
        "SELECT slug, title, doc_type, category, content, description "
        "FROM docs WHERE source_id=6 AND slug LIKE 'commands--%'"
    )
    cached_rows = sc.fetchall()
    src.close()

    new_rows = 0
    reclassified = 0

    for row in cached_rows:
        slug = row["slug"]
        title = row["title"] or slug.replace("commands--", "wp ").replace("-", " ")
        category = row["category"] or "wpcli"
        # Merge description into content if both present
        content_parts = []
        if row["description"]:
            content_parts.append(row["description"])
        if row["content"]:
            content_parts.append(row["content"])
        content = "\n\n".join(content_parts) if content_parts else ""
        # Trim to keep DB lean
        if len(content) > 4000:
            content = content[:4000] + "\n...[truncated]"

        if dry_run:
            # Step 1 dry-run: would this be a new insert?
            ex = c.execute(
                "SELECT doc_type FROM docs WHERE slug=? AND source='native_wp'",
                (slug,),
            ).fetchone()
            if ex is None:
                new_rows += 1
            elif ex[0] != "cli-command":
                # Step 2 dry-run: would this be reclassified?
                reclassified += 1
        else:
            # Step 1: INSERT OR IGNORE — adds rows not yet in DB
            res = c.execute(
                """
                INSERT OR IGNORE INTO docs
                    (source, slug, title, doc_type, category, content)
                VALUES ('native_wp', ?, ?, 'cli-command', ?, ?)
                """,
                (slug, title, category, content),
            )
            new_rows += res.rowcount

            # Step 2: UPDATE doc_type for rows that were already present but
            # imported with the wrong doc_type (e.g. 'reference' from Stage 2).
            if res.rowcount == 0:
                res2 = c.execute(
                    """
                    UPDATE docs SET doc_type='cli-command'
                    WHERE slug=? AND source='native_wp' AND doc_type != 'cli-command'
                    """,
                    (slug,),
                )
                reclassified += res2.rowcount

    if not dry_run:
        conn.commit()

    # Cross-check: total cli-command rows after run
    total_cli = c.execute(
        "SELECT COUNT(*) FROM docs WHERE doc_type='cli-command' AND source='native_wp'"
    ).fetchone()[0]

    if dry_run:
        print(
            f"Stage 3 [dry-run]: {len(cached_rows)} candidates from hooks.db. "
            f"Would insert {new_rows} new rows, reclassify {reclassified} existing rows. "
            f"Current total cli-command rows: {total_cli}."
        )
    else:
        print(
            f"Stage 3: {len(cached_rows)} candidates from hooks.db. "
            f"Inserted: {new_rows} new rows, reclassified: {reclassified} existing rows. "
            f"Total cli-command rows in DB: {total_cli}."
        )

    if total_cli < _WPCLI_MIN_EXPECTED and not dry_run:
        print(
            f"Stage 3 WARNING: only {total_cli} CLI commands indexed after run; "
            f"expected >={_WPCLI_MIN_EXPECTED}. "
            f"Consider running --refresh-upstream to re-scrape from GitHub."
        )

    return {
        "new_rows": new_rows,
        "reclassified": reclassified,
        "total_cli_commands": total_cli,
        "dry_run": dry_run,
    }


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


def stage_4_style_variation_sync(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """Walk sites/*/theme-snapshot.json → INSERT OR IGNORE into design_tokens.

    Phase 5a is shipped (commit 43a93df9). Writes are now active.

    For each client snapshot, harvests:
      - settings.color.palette  → token_type='color'
      - settings.typography.fontSizes → token_type='size'
      - settings.spacing.spacingSizes → token_type='spacing'
      - settings.shadow.presets → token_type='shadow'
      - settings.typography.fontFamilies → token_type='font-family'

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
    c = conn.cursor()

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

    # Keys in settings.custom that are routing config, not design tokens.
    # Excluded from design_tokens writes.
    _CUSTOM_KEY_BLACKLIST = {"sgs", "buttonPresets", "maxWidth"}

    def _build_token_candidates(snapshot: dict, client_slug: str) -> list[dict]:
        """Extract design_token candidate rows from a parsed theme-snapshot.json."""
        candidates: list[dict] = []
        settings = snapshot.get("settings", {})

        # --- colour palette ---
        # token_type must match DB CHECK constraint: 'colour', 'font', 'spacing', 'size', 'shadow'
        for item in settings.get("color", {}).get("palette", []):
            slug = item.get("slug", "")
            colour = item.get("color", "")
            name = item.get("name", slug)
            # Skip forward-reference colours (value is another slug, not a hex/rgb)
            if not slug or not colour or colour.startswith("var(") or not colour.startswith("#"):
                continue
            candidates.append({
                "slug": f"color-{slug}",
                "token_type": "colour",  # matches DB CHECK('colour', 'font', 'spacing', 'size', 'shadow')
                "default_value": colour,
                "css_var": f"var(--wp--preset--color--{slug})",
                "description": f"{name} (from {client_slug})",
            })

        # --- font sizes ---
        for item in settings.get("typography", {}).get("fontSizes", []):
            slug = item.get("slug", "")
            size = item.get("size", "")
            name = item.get("name", slug)
            # Skip invalid / placeholder entries (e.g. slug="px", size="px")
            if not slug or not size or size == slug or "px" == slug:
                continue
            candidates.append({
                "slug": f"font-size-{slug}",
                "token_type": "size",
                "default_value": str(size),
                "css_var": f"var(--wp--preset--font-size--{slug})",
                "description": f"{name} (from {client_slug})",
            })

        # --- font families ---
        # token_type 'font' matches DB CHECK constraint
        for item in settings.get("typography", {}).get("fontFamilies", []):
            slug = item.get("slug", "")
            family = item.get("fontFamily", "")
            name = item.get("name", slug)
            if not slug or not family:
                continue
            candidates.append({
                "slug": f"font-family-{slug}",
                "token_type": "font",  # matches DB CHECK('colour', 'font', 'spacing', 'size', 'shadow')
                "default_value": family,
                "css_var": f"var(--wp--preset--font-family--{slug})",
                "description": f"{name} (from {client_slug})",
            })

        # --- spacing sizes ---
        for item in settings.get("spacing", {}).get("spacingSizes", []):
            slug = item.get("slug", "")
            size = item.get("size", "")
            name = item.get("name", slug)
            if not slug or not size or size == slug or slug == "px":
                continue
            candidates.append({
                "slug": f"spacing-{slug}",
                "token_type": "spacing",  # matches DB CHECK constraint
                "default_value": str(size),
                "css_var": f"var(--wp--preset--spacing--{slug})",
                "description": f"{name} (from {client_slug})",
            })

        # --- shadow presets ---
        for item in settings.get("shadow", {}).get("presets", []):
            slug = item.get("slug", "")
            shadow = item.get("shadow", "")
            name = item.get("name", slug)
            if not slug or not shadow:
                continue
            candidates.append({
                "slug": f"shadow-{slug}",
                "token_type": "shadow",
                "default_value": shadow,
                "css_var": f"var(--wp--preset--shadow--{slug})",
                "description": f"{name} (from {client_slug})",
            })

        return candidates

    if not sites_root.exists():
        per_client_lines.append("_(sites/ directory not found — no snapshots to scan)_")
        per_client_lines.append("")
    else:
        client_dirs = sorted(d for d in sites_root.iterdir() if d.is_dir())

        for client_dir in client_dirs:
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

            try:
                with open(snapshot_path, encoding="utf-8") as fh:
                    snapshot = json.load(fh)
            except (json.JSONDecodeError, OSError) as exc:
                per_client_lines.append(f"_(error reading snapshot: {exc})_")
                per_client_lines.append("")
                continue

            candidates = _build_token_candidates(snapshot, client_slug)

            client_inserted = 0
            client_skipped = 0
            client_conflicts = 0
            conflict_lines: list[str] = []

            for tok in candidates:
                slug = tok["slug"]
                # Check for existing row
                existing = c.execute(
                    "SELECT default_value FROM design_tokens WHERE slug = ?",
                    (slug,),
                ).fetchone()

                if existing is not None:
                    if existing[0] == tok["default_value"]:
                        # Exact match — idempotent skip
                        client_skipped += 1
                        total_skipped += 1
                    else:
                        # Different value — prefix slug with client to avoid collision
                        prefixed_slug = f"{client_slug}-{slug}"
                        existing_prefixed = c.execute(
                            "SELECT 1 FROM design_tokens WHERE slug = ?",
                            (prefixed_slug,),
                        ).fetchone()
                        conflict_lines.append(
                            f"- CONFLICT: {slug} (framework={existing[0]!r}, client={tok['default_value']!r}) "
                            f"→ inserted as {prefixed_slug}"
                        )
                        client_conflicts += 1
                        total_conflicts += 1
                        if not dry_run and existing_prefixed is None:
                            c.execute(
                                """
                                INSERT OR IGNORE INTO design_tokens
                                    (slug, token_type, default_value, css_var, description)
                                VALUES (?, ?, ?, ?, ?)
                                """,
                                (
                                    prefixed_slug,
                                    tok["token_type"],
                                    tok["default_value"],
                                    tok["css_var"],
                                    tok["description"],
                                ),
                            )
                            client_inserted += 1
                            total_inserted += 1
                        elif dry_run and existing_prefixed is None:
                            client_inserted += 1
                            total_inserted += 1
                else:
                    # New row — insert
                    if not dry_run:
                        res = c.execute(
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
                        if res.rowcount > 0:
                            client_inserted += 1
                            total_inserted += 1
                        else:
                            client_skipped += 1
                            total_skipped += 1
                    else:
                        # dry-run: count as would-insert
                        client_inserted += 1
                        total_inserted += 1

            if not dry_run:
                conn.commit()

            # Also count filtered (custom keys not emitted as candidates)
            # We can't easily count these post-hoc — so we report 0 filtered
            # (filtering happens inside _build_token_candidates implicitly).

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

    # Assemble report
    summary_line = (
        f"Snapshots found: {snapshots_found} | Missing: {snapshots_missing} | "
        f"Inserted: {total_inserted} | Skipped: {total_skipped} | "
        f"Conflicts: {total_conflicts}"
    )
    all_lines = header_lines + [summary_line, ""] + per_client_lines

    report_path.parent.mkdir(parents=True, exist_ok=True)
    if not dry_run:
        report_path.write_text("\n".join(all_lines), encoding="utf-8")

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
# For every slot_synonyms row where standalone_block IS NULL or empty, runs
# a heuristic name-match against the sgs blocks table to propose an
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
        return ("low-ambiguous-prefix", None, [r[0] for r in prefix_results[:5]])

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
    """Isolate the single UPDATE write for a high-confidence match."""
    if not dry_run:
        cursor.execute(
            "UPDATE slot_synonyms SET standalone_block=? WHERE rowid=?",
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

    # Fetch all unmapped slot_synonyms (using rowid for reliable UPDATE targeting)
    rows = c.execute(
        """
        SELECT rowid, canonical_slot
        FROM slot_synonyms
        WHERE standalone_block IS NULL OR standalone_block = ''
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
            low_lines.append(
                f"- slot='{canonical_slot}' (multiple prefix matches: {', '.join(candidates)})"
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

    # Fetch all SGS blocks with a replaces mapping
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
        # Parse: single slug or comma-separated list
        targets = [t.strip() for t in replaces_raw.split(",") if t.strip()]
        if not targets:
            continue

        checked += 1
        missing_targets: list[str] = []

        for target_slug in targets:
            exists = c.execute(
                _SELECT_BLOCK_EXISTS_NATIVE_WP,
                (target_slug,),
            ).fetchone()
            if exists is None:
                missing_targets.append(target_slug)

        if missing_targets:
            stale += 1
            if len(missing_targets) == 1:
                stale_lines.append(
                    f"- {sgs_slug} replaces '{replaces_raw}' "
                    f"— '{missing_targets[0]}' not found in native_wp blocks"
                )
            else:
                missing_str = ", ".join(f"'{m}'" for m in missing_targets)
                stale_lines.append(
                    f"- {sgs_slug} replaces '{replaces_raw}' "
                    f"— targets not found: {missing_str}"
                )
        else:
            valid += 1

    # --- Write stale report (always — observational) ---
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
        "Run /sgs-update --refresh-upstream before deploying knowledge-dependent features."
    )
    print(f"\n⚠  Stage 9 [drift_detected]: {warning}\n")
    return {
        "status": "drift_detected",
        "site_version": site_version_raw,
        "db_indexed": db_indexed_raw,
        "warning": warning,
    }


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
