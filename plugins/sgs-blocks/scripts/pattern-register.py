"""
Pattern registration orchestrator — Step 6 of /sgs-clone pipeline. 2026-05-06.

Takes an HTML file + classification metadata and registers a new SGS WordPress pattern:
  1. Computes a deterministic fingerprint (via pattern-fingerprint.py)
  2. SQL dedup check against sgs-framework.db
  3. Classifies the pattern (via pattern-classify.py when available)
  4. Operator confirmation (skipped with --auto or --dry-run)
  5. Writes pattern.php + pattern.meta.json to disk
  6. INSERTs into `patterns` and `block_compositions` tables
  7. Calls /sgs-update to refresh the DB scan

Usage:
    python pattern-register.py <html-file> --slug <slug> --source <idea|draft|URL> [options]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Ensure stdout handles Unicode on Windows without encoding crashes.
# ---------------------------------------------------------------------------
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Absolute paths — no relative path assumptions.
# ---------------------------------------------------------------------------
_SCRIPTS_DIR = Path(__file__).resolve().parent
_PATTERNS_DIR = _SCRIPTS_DIR.parent / "patterns"
_DB_PATH = Path(r"C:\Users\Bean\.claude\skills\sgs-wp-engine\sgs-framework.db")
_SGS_UPDATE_PATH = Path(r"C:\Users\Bean\.claude\skills\sgs-wp-engine\scripts\sgs-update.py")

# ---------------------------------------------------------------------------
# DB migration — columns added in Step 1 of the pipeline.
# Applied idempotently so the script is safe to run on an un-migrated DB.
# ---------------------------------------------------------------------------
_MIGRATION_SQL: list[str] = [
    "ALTER TABLE patterns ADD COLUMN content_shape   TEXT",
    "ALTER TABLE patterns ADD COLUMN mood            TEXT",
    "ALTER TABLE patterns ADD COLUMN style           TEXT",
    "ALTER TABLE patterns ADD COLUMN fingerprint     TEXT",
    "ALTER TABLE patterns ADD COLUMN source          TEXT",
    "ALTER TABLE patterns ADD COLUMN block_composition TEXT",
    "ALTER TABLE patterns ADD COLUMN parent_pattern_id INTEGER",
    "ALTER TABLE patterns ADD COLUMN perceptual_hash TEXT",
]


def _apply_migrations(con: sqlite3.Connection) -> None:
    """Add extended columns to the patterns table if they do not yet exist."""
    cur = con.cursor()
    cur.execute("PRAGMA table_info(patterns)")
    existing_cols = {row[1] for row in cur.fetchall()}

    for stmt in _MIGRATION_SQL:
        # Extract the column name from "ALTER TABLE patterns ADD COLUMN <name> <type>"
        col_name = stmt.split("ADD COLUMN")[1].strip().split()[0]
        if col_name not in existing_cols:
            try:
                cur.execute(stmt)
            except sqlite3.OperationalError as exc:
                # Column already exists — benign race; ignore.
                if "duplicate column" not in str(exc).lower():
                    raise
    con.commit()


# ---------------------------------------------------------------------------
# DB connection helper with retry for locked databases.
# ---------------------------------------------------------------------------

def _connect_db(db_path: Path, retries: int = 1) -> sqlite3.Connection:
    """
    Open an SQLite connection. Retries once after 2 s if the DB is locked.
    Raises SystemExit(1) on persistent failure.
    """
    for attempt in range(retries + 1):
        try:
            con = sqlite3.connect(str(db_path), timeout=5)
            _apply_migrations(con)
            return con
        except sqlite3.OperationalError as exc:
            if attempt < retries:
                sys.stderr.write(
                    f"[warn] DB locked ({exc}). Retrying in 2 s...\n"
                )
                time.sleep(2)
            else:
                sys.stderr.write(f"[error] Cannot open DB at {db_path}: {exc}\n")
                sys.exit(1)
    # Unreachable — satisfies mypy
    raise RuntimeError("unreachable")


# ---------------------------------------------------------------------------
# Dynamic import of sibling scripts
# ---------------------------------------------------------------------------

def _import_sibling(name: str) -> Any | None:
    """
    Attempt to import *name*.py from the same directory as this script.
    Returns the module on success, None if the file does not exist.

    Module-level side effects in siblings (e.g. sys.stdout.reconfigure)
    may raise AttributeError when stdout is redirected during testing.
    That is caught and treated as a graceful unavailability.
    """
    sibling_path = _SCRIPTS_DIR / f"{name}.py"
    if not sibling_path.exists():
        return None
    spec = importlib.util.spec_from_file_location(name, sibling_path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)  # type: ignore[union-attr]
    except AttributeError:
        # Sibling called sys.stdout/stderr.reconfigure() while stdout is
        # redirected to a StringIO (e.g. during validate_capture).
        # Fall back to the stub implementation.
        return None
    return module


# Cache siblings at module-load time so they are imported before any
# stdout redirect (validate_capture uses contextlib.redirect_stdout).
_FP_MODULE: Any | None = _import_sibling("pattern-fingerprint")
_CLS_MODULE: Any | None = _import_sibling("pattern-classify")


# ---------------------------------------------------------------------------
# Fingerprint step (Step 1)
# ---------------------------------------------------------------------------

def _compute_fingerprint(html: str, css_vars: dict[str, str]) -> dict:
    """
    Delegate to pattern_fingerprint.compute_fingerprint when available.
    Falls back to a minimal sha256 hash so the script is still usable
    when pattern-fingerprint.py is absent (should not happen in normal flow).
    """
    fp_module = _FP_MODULE
    if fp_module is not None and hasattr(fp_module, "compute_fingerprint"):
        return fp_module.compute_fingerprint(html, css_vars=css_vars, block_json_path=None)

    # Fallback — should never be needed in production but guards against
    # a missing sibling during early pipeline development.
    import hashlib
    fp = hashlib.sha256(html.encode("utf-8")).hexdigest()
    sys.stderr.write(
        "[warn] pattern-fingerprint.py not found — using plain html hash as fallback.\n"
    )
    return {
        "fingerprint": fp,
        "perceptual_hash": None,
        "unmapped_css_rules": [],
        "normalised_html_preview": html[:200],
    }


# ---------------------------------------------------------------------------
# Classify step (Step 3)
# ---------------------------------------------------------------------------

_DEFAULT_CLASSIFICATION: dict = {
    "category": "sgs-content",
    "industry": "general",
    "mood": "neutral",
    "style": "minimal",
    "content_shape": "unknown",
    "block_composition": [],
    "confidence": 0.0,
    "source": "stub",
}


def _classify_pattern(html: str, css_vars: dict[str, str], auto: bool) -> dict:
    """
    Delegate to pattern_classify.classify_pattern when the sibling exists.
    Falls back to a stub classification so the pipeline does not block.
    """
    cls_module = _CLS_MODULE
    if cls_module is not None and hasattr(cls_module, "classify_pattern"):
        return cls_module.classify_pattern(html, css_vars=css_vars, auto=auto)

    sys.stderr.write(
        "[warn] pattern-classify.py not found — using stub classification.\n"
        "       Run Step 5 (pattern-classify.py) first for accurate metadata.\n"
    )
    return dict(_DEFAULT_CLASSIFICATION)


# ---------------------------------------------------------------------------
# Operator confirmation (Step 4)
# ---------------------------------------------------------------------------

def _print_summary_table(slug: str, fp: str, classification: dict, source: str) -> None:
    """Print a one-screen summary of what will be registered."""
    composition_preview = json.dumps(classification.get("block_composition", []))
    if len(composition_preview) > 60:
        composition_preview = composition_preview[:57] + "..."

    rows = [
        ("slug",              slug),
        ("fingerprint",       fp[:12] + "..."),
        ("category",          classification.get("category", "—")),
        ("industry",          classification.get("industry", "—")),
        ("mood",              classification.get("mood", "—")),
        ("style",             classification.get("style", "—")),
        ("content_shape",     classification.get("content_shape", "—")),
        ("block_composition", composition_preview),
        ("source",            source),
        ("confidence",        str(classification.get("confidence", "n/a"))),
    ]
    width_key = max(len(r[0]) for r in rows) + 2
    print("\n--- Pattern Registration Summary ---")
    for key, val in rows:
        print(f"  {key:<{width_key}}{val}")
    print("------------------------------------\n")


def _interactive_confirm(slug: str, fp: str, classification: dict, source: str) -> dict | None:
    """
    Show the summary table and prompt the operator.
    Returns the (possibly edited) classification dict, or None to skip.
    """
    _print_summary_table(slug, fp, classification, source)

    while True:
        choice = input("Confirm registration? [Y / edit / skip]: ").strip().lower()

        if choice in ("y", "yes", ""):
            return classification

        if choice == "skip":
            print("[info] Skipped by operator.")
            return None

        if choice == "edit":
            editable_fields = [
                "category", "industry", "mood", "style", "content_shape"
            ]
            print(
                "Enter new value for each field "
                "(press Enter to keep the current value):"
            )
            for field in editable_fields:
                current = classification.get(field, "")
                new_val = input(f"  {field} [{current}]: ").strip()
                if new_val:
                    classification[field] = new_val
            _print_summary_table(slug, fp, classification, source)
            # Loop back to Y/edit/skip
        else:
            print("  Please enter Y, edit, or skip.")


# ---------------------------------------------------------------------------
# Pattern file writing (Step 5)
# ---------------------------------------------------------------------------

def _build_pattern_php(slug: str, classification: dict, client: str | None) -> str:
    """Return the contents of pattern.php using the minimal SGS template."""
    title = classification.get("title") or slug.replace("-", " ").title()
    category = classification.get("category", "sgs-content")
    today = date.today().isoformat()

    # Build the Categories line — include client namespace when supplied.
    categories_parts = [category]
    if client:
        categories_parts.append(f"sgs/{client}")
    categories_line = ", ".join(categories_parts)

    return (
        f"<?php\n"
        f"/**\n"
        f" * Title: {title}\n"
        f" * Slug: sgs/{slug}\n"
        f" * Categories: {categories_line}\n"
        f" * Block Types: core/group\n"
        f" * Description: Auto-generated from /sgs-clone on {today}\n"
        f" */\n"
        f"?>\n"
        f"<!-- wp:html -->\n"
        f"<!-- TODO: real block markup written by Step 12 of cloning pipeline -->\n"
        f"<!-- /wp:html -->\n"
    )


def _write_pattern_files(
    slug: str,
    html: str,
    classification: dict,
    fp_result: dict,
    source: str,
    client: str | None,
    dry_run: bool,
) -> Path:
    """
    Write pattern.php and pattern.meta.json into patterns/<slug>/.
    Returns the target directory path.
    """
    target_dir = _PATTERNS_DIR / slug

    php_content = _build_pattern_php(slug, classification, client)
    meta_content = json.dumps(
        {
            "slug": slug,
            "source": source,
            "fingerprint": fp_result["fingerprint"],
            "perceptual_hash": fp_result.get("perceptual_hash"),
            "classification": classification,
            "registered_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z",
            "client": client,
            "pipeline_step": "pattern-register.py (Step 6)",
        },
        indent=2,
        ensure_ascii=False,
    )

    if dry_run:
        print(f"[dry-run] Would create directory: {target_dir}")
        print(f"[dry-run] Would write: {target_dir / 'pattern.php'}")
        print(f"[dry-run] Would write: {target_dir / 'pattern.meta.json'}")
    else:
        target_dir.mkdir(parents=True, exist_ok=True)
        (target_dir / "pattern.php").write_text(php_content, encoding="utf-8")
        (target_dir / "pattern.meta.json").write_text(meta_content, encoding="utf-8")
        print(f"[ok] Pattern files written to {target_dir}")

    return target_dir


# ---------------------------------------------------------------------------
# SQL INSERT (Step 6)
# ---------------------------------------------------------------------------

def _insert_pattern(
    con: sqlite3.Connection,
    slug: str,
    classification: dict,
    fp_result: dict,
    source: str,
    target_dir: Path,
    dry_run: bool,
) -> None:
    """INSERT a row into `patterns`. Skips the execute in dry-run mode."""
    title = classification.get("title") or slug.replace("-", " ").title()
    category = classification.get("category", "sgs-content")
    description = classification.get("description", f"Auto-registered pattern: {slug}")
    blocks_used = json.dumps(classification.get("block_composition", []))
    file_path = str(target_dir / "pattern.php")
    industry = classification.get("industry", "general")
    content_shape = classification.get("content_shape")
    mood = classification.get("mood")
    style = classification.get("style")
    fingerprint = fp_result["fingerprint"]
    perceptual_hash = fp_result.get("perceptual_hash")
    block_composition_json = json.dumps(classification.get("block_composition", []))

    insert_sql = (
        "INSERT INTO patterns "
        "(slug, title, category, description, blocks_used, file_path, "
        " industry, is_auto_generated, created_at, content_shape, mood, "
        " style, fingerprint, source, block_composition, perceptual_hash) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), ?, ?, ?, ?, ?, ?, ?)"
    )
    params = (
        slug, title, category, description, blocks_used, file_path,
        industry, content_shape, mood, style, fingerprint, source,
        block_composition_json, perceptual_hash,
    )

    if dry_run:
        # Print the statement with substituted values so it is human-readable.
        preview = insert_sql
        for p in params:
            preview = preview.replace("?", repr(p), 1)
        print(f"\n[dry-run] SQL INSERT:\n  {preview}\n")
    else:
        cur = con.cursor()
        cur.execute(insert_sql, params)
        con.commit()
        print(f"[ok] Inserted pattern '{slug}' into DB.")


def _insert_block_compositions(
    con: sqlite3.Connection,
    slug: str,
    classification: dict,
    dry_run: bool,
) -> None:
    """
    UPDATE `patterns.block_composition` JSON column for the given pattern.

    Migration note (2026-05-24): the previous `block_compositions` table was
    merged into `patterns.block_composition` (JSON object). This function now
    composes a JSON payload and UPDATEs the pattern row in-place rather than
    INSERTing into the dropped table.

    Schema of the JSON payload:
      { "name": str, "block_slugs": [...], "frequency": int, "industry": str,
        "page_type": str, "description": str, "migrated_from": str,
        "migrated_at": str }
    """
    raw = classification.get("block_composition", [])
    if not raw:
        return

    # Normalise: accept either a list of slug strings or a list of dicts.
    compositions: list[dict] = []
    for item in raw:
        if isinstance(item, str):
            compositions.append({"block_slugs": item, "composition_name": item})
        elif isinstance(item, dict):
            compositions.append(item)

    if not compositions:
        return

    # When multiple compositions classify under one pattern, fold them all
    # into a single JSON payload on patterns.block_composition (a JSON array
    # of composition objects, OR a single object if there's exactly one).
    payloads = []
    for comp in compositions:
        block_slugs = comp.get("block_slugs", "")
        if isinstance(block_slugs, str):
            try:
                block_slugs = json.loads(block_slugs)
            except (ValueError, TypeError):
                block_slugs = [block_slugs] if block_slugs else []
        payload = {
            "name": comp.get("composition_name", slug),
            "block_slugs": block_slugs,
            "frequency": comp.get("frequency", 1),
            "industry": comp.get("industry", classification.get("industry", "general")),
            "page_type": comp.get("page_type", ""),
            "description": comp.get("description", ""),
            "migrated_from": "block_compositions",
            "migrated_at": "2026-05-24",
        }
        payloads.append(payload)

    composition_json = json.dumps(
        payloads[0] if len(payloads) == 1 else payloads,
        ensure_ascii=False,
    )

    if dry_run:
        print(f"[dry-run] patterns.block_composition UPDATE for '{slug}':\n  {composition_json[:200]}{'...' if len(composition_json) > 200 else ''}\n")
    else:
        cur = con.cursor()
        cur.execute(
            "UPDATE patterns SET block_composition = ? WHERE slug = ?",
            (composition_json, slug),
        )
        if cur.rowcount == 0:
            print(f"[warn] pattern '{slug}' not found in patterns table — composition not stored")
        con.commit()
        print(f"[ok] patterns.block_composition updated for '{slug}'")


# ---------------------------------------------------------------------------
# /sgs-update call (Step 6 tail)
# ---------------------------------------------------------------------------

def _call_sgs_update(dry_run: bool) -> None:
    """Invoke sgs-update.py to refresh the DB scan. Non-fatal on failure."""
    if dry_run:
        print(f"[dry-run] Would call: python {_SGS_UPDATE_PATH}")
        return

    if not _SGS_UPDATE_PATH.exists():
        sys.stderr.write(
            f"[warn] sgs-update.py not found at {_SGS_UPDATE_PATH}. "
            "Skipping DB refresh — run it manually.\n"
        )
        return

    try:
        result = subprocess.run(
            [sys.executable, str(_SGS_UPDATE_PATH)],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            print("[ok] /sgs-update completed successfully.")
        else:
            sys.stderr.write(
                f"[warn] /sgs-update exited {result.returncode}.\n"
                f"  stdout: {result.stdout[:400]}\n"
                f"  stderr: {result.stderr[:400]}\n"
                "  Continuing — pattern is registered; run /sgs-update manually.\n"
            )
    except (subprocess.TimeoutExpired, OSError) as exc:
        sys.stderr.write(
            f"[warn] /sgs-update call failed: {exc}. "
            "Run it manually to refresh the DB scan.\n"
        )


# ---------------------------------------------------------------------------
# Unmapped CSS rules warning (Step 1 tail)
# ---------------------------------------------------------------------------

def _handle_unmapped_css(
    slug: str,
    unmapped: list[dict],
    dry_run: bool,
) -> None:
    """
    Print a warning table to stderr and save a JSON report for unmapped CSS.
    Does not halt the pipeline — unmapped rules are warnings, not errors.
    """
    if not unmapped:
        return

    sys.stderr.write(
        f"[warn] {len(unmapped)} unmapped CSS rule(s) detected "
        "(no destination block attribute). See below:\n"
    )
    sys.stderr.write(
        f"  {'Property':<35}  {'Value':<30}  Reason\n"
    )
    sys.stderr.write("  " + "-" * 80 + "\n")
    for rule in unmapped:
        sys.stderr.write(
            f"  {rule.get('property',''):<35}  "
            f"{rule.get('value',''):<30}  "
            f"{rule.get('reason','')}\n"
        )

    report_path = Path(f"{slug}-unmapped-css.json")
    report_content = json.dumps(unmapped, indent=2, ensure_ascii=False)

    if dry_run:
        sys.stderr.write(
            f"[dry-run] Would save unmapped CSS report to: {report_path.resolve()}\n"
        )
    else:
        report_path.write_text(report_content, encoding="utf-8")
        sys.stderr.write(f"[warn] Full unmapped CSS report saved to: {report_path.resolve()}\n")


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pattern-register.py",
        description=(
            "Register a new SGS WordPress pattern from an HTML file. "
            "Step 6 of the /sgs-clone pipeline."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python pattern-register.py hero.html --slug mamas-hero --source idea\n"
            "  python pattern-register.py hero.html --slug mamas-hero "
            "--source https://example.com --client mamas-munches --auto\n"
            "  python pattern-register.py hero.html --slug mamas-hero "
            "--source draft --dry-run --auto\n"
        ),
    )
    parser.add_argument(
        "html_file",
        help="Path to the HTML file containing the pattern to register.",
    )
    parser.add_argument(
        "--slug",
        required=True,
        help="Kebab-case pattern slug, e.g. mamas-hero.",
    )
    parser.add_argument(
        "--source",
        required=True,
        help=(
            "Provenance of the pattern. One of: 'idea', 'draft', "
            "or a URL string (e.g. https://example.com)."
        ),
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        default=False,
        help="Skip LLM classification confirmation prompt.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help=(
            "Run all steps but skip SQL INSERTs and file writes. "
            "Prints intended actions instead."
        ),
    )
    parser.add_argument(
        "--client",
        default=None,
        help=(
            "Optional client slug. Adds a 'sgs/<client>' category tag to "
            "the pattern.php header (e.g. --client mamas-munches)."
        ),
    )
    parser.add_argument(
        "--css-file",
        dest="css_file",
        default=None,
        help=(
            "Optional CSS file path. CSS custom-property declarations are "
            "extracted and included in the fingerprint."
        ),
    )
    return parser


def _validate_slug(slug: str) -> None:
    """Exit with a clear error if the slug is not valid kebab-case."""
    if not re.match(r"^[a-z][a-z0-9-]*$", slug):
        sys.stderr.write(
            f"[error] --slug must be lowercase kebab-case (e.g. 'mamas-hero'). "
            f"Got: '{slug}'\n"
        )
        sys.exit(1)


def _validate_source(source: str) -> None:
    """Exit with a clear error if source is not 'idea', 'draft', or a URL."""
    if source in ("idea", "draft"):
        return
    if re.match(r"^https?://", source):
        return
    sys.stderr.write(
        f"[error] --source must be 'idea', 'draft', or a URL (https://...). "
        f"Got: '{source}'\n"
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def run(args: argparse.Namespace) -> None:
    """Execute the full 6-step registration flow."""

    # --- Validate inputs ---
    _validate_slug(args.slug)
    _validate_source(args.source)

    html_path = Path(args.html_file)
    if not html_path.exists():
        sys.stderr.write(f"[error] HTML file not found: {html_path.resolve()}\n")
        sys.exit(1)

    html = html_path.read_text(encoding="utf-8")

    # --- Load optional CSS vars ---
    css_vars: dict[str, str] = {}
    if args.css_file:
        css_path = Path(args.css_file)
        if not css_path.exists():
            sys.stderr.write(f"[error] CSS file not found: {css_path.resolve()}\n")
            sys.exit(1)
        if _FP_MODULE is not None and hasattr(_FP_MODULE, "parse_css_vars"):
            css_vars = _FP_MODULE.parse_css_vars(css_path.read_text(encoding="utf-8"))
        else:
            sys.stderr.write("[warn] Cannot parse CSS vars — pattern-fingerprint.py not available.\n")

    # -----------------------------------------------------------------------
    # Step 1 — Compute fingerprint
    # -----------------------------------------------------------------------
    print(f"[step 1/6] Computing fingerprint for '{args.slug}'...")
    fp_result = _compute_fingerprint(html, css_vars)
    fingerprint = fp_result["fingerprint"]
    print(f"           Fingerprint: {fingerprint[:12]}...")

    _handle_unmapped_css(args.slug, fp_result.get("unmapped_css_rules", []), args.dry_run)

    # -----------------------------------------------------------------------
    # Step 2 — SQL dedup check
    # -----------------------------------------------------------------------
    print("[step 2/6] Checking for duplicate fingerprint in DB...")
    con = _connect_db(_DB_PATH)

    cur = con.cursor()
    cur.execute(
        "SELECT slug FROM patterns WHERE fingerprint = ?",
        (fingerprint,),
    )
    existing_by_fp = cur.fetchone()
    if existing_by_fp:
        print(
            f"[ok] Duplicate detected — pattern already registered as "
            f"slug='{existing_by_fp[0]}'. "
            "No action needed."
        )
        con.close()
        sys.exit(0)

    # Check slug collision (different content — slug must be renamed).
    cur.execute("SELECT slug FROM patterns WHERE slug = ?", (args.slug,))
    existing_by_slug = cur.fetchone()
    if existing_by_slug:
        sys.stderr.write(
            f"[error] Slug '{args.slug}' already exists in the DB with a different fingerprint.\n"
            "        Choose a different --slug (e.g. --slug {args.slug}-v2).\n"
        )
        con.close()
        sys.exit(1)

    print("           No duplicate found — proceeding.")

    # -----------------------------------------------------------------------
    # Step 3 — Classify
    # -----------------------------------------------------------------------
    print("[step 3/6] Classifying pattern...")
    classification = _classify_pattern(html, css_vars, args.auto)
    print(
        f"           Category: {classification.get('category')}  "
        f"| Industry: {classification.get('industry')}  "
        f"| Confidence: {classification.get('confidence', 'n/a')}"
    )

    # -----------------------------------------------------------------------
    # Step 4 — Operator confirmation
    # -----------------------------------------------------------------------
    print("[step 4/6] Operator confirmation...")
    if args.auto or args.dry_run:
        print("           Skipped (--auto or --dry-run).")
    else:
        classification = _interactive_confirm(
            args.slug, fingerprint, classification, args.source
        )
        if classification is None:
            con.close()
            sys.exit(0)

    # -----------------------------------------------------------------------
    # Step 5 — Write pattern files
    # -----------------------------------------------------------------------
    print("[step 5/6] Writing pattern files...")
    target_dir = _write_pattern_files(
        slug=args.slug,
        html=html,
        classification=classification,
        fp_result=fp_result,
        source=args.source,
        client=args.client,
        dry_run=args.dry_run,
    )

    # -----------------------------------------------------------------------
    # Step 6 — SQL INSERT + /sgs-update
    # -----------------------------------------------------------------------
    print("[step 6/6] Inserting into DB and refreshing SGS knowledge base...")
    _insert_pattern(con, args.slug, classification, fp_result, args.source, target_dir, args.dry_run)
    _insert_block_compositions(con, args.slug, classification, args.dry_run)
    con.close()

    _call_sgs_update(args.dry_run)

    print(f"\n[done] Pattern '{args.slug}' registered successfully.")
    if args.dry_run:
        print("       (dry-run mode — no files written, no SQL executed)")


# ---------------------------------------------------------------------------
# validate_capture — smoke test
# ---------------------------------------------------------------------------

_FIXTURE_HTML = """
<!DOCTYPE html>
<html lang="en">
<body>
  <section class="sgs-hero css-a1b2c3" data-variant="split">
    <div class="sgs-hero__inner">
      <h1 class="sgs-hero__headline">Fixture Headline</h1>
      <p class="sgs-hero__subheadline">Supporting copy goes here.</p>
      <a href="#cta" class="sgs-btn sgs-btn--primary">Call to Action</a>
    </div>
  </section>
</body>
</html>
""".strip()


def validate_capture() -> None:
    """
    Smoke test: run the full pipeline against a fixture HTML with --dry-run --auto.
    Asserts no SQL INSERTs or file writes occur.
    Asserts the SQL INSERT statement is printed to stdout.
    Raises AssertionError on any failure.
    """
    import io
    from contextlib import redirect_stdout, redirect_stderr

    # Build args as if called with --dry-run --auto
    parser = _build_arg_parser()
    # Write fixture HTML to a temp file
    import tempfile
    with tempfile.NamedTemporaryFile(
        suffix=".html",
        mode="w",
        encoding="utf-8",
        delete=False,
    ) as fh:
        fh.write(_FIXTURE_HTML)
        tmp_path = fh.name

    try:
        args = parser.parse_args([
            tmp_path,
            "--slug", "fixture-hero",
            "--source", "idea",
            "--auto",
            "--dry-run",
        ])

        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                run(args)
        except SystemExit as exc:
            if exc.code not in (0, None):
                raise AssertionError(
                    f"validate_capture: unexpected SystemExit({exc.code})\n"
                    f"stdout: {stdout_capture.getvalue()}\n"
                    f"stderr: {stderr_capture.getvalue()}"
                )

        out = stdout_capture.getvalue()
        err = stderr_capture.getvalue()

        # Assert no real files written
        fixture_pattern_dir = _PATTERNS_DIR / "fixture-hero"
        assert not fixture_pattern_dir.exists(), (
            f"validate_capture: dry-run wrote files to {fixture_pattern_dir}!"
        )

        # Assert the dry-run SQL statement was printed
        assert "dry-run" in out.lower() or "dry-run" in err.lower(), (
            f"validate_capture: expected dry-run output but got:\n{out}\n{err}"
        )

        # Assert the INSERT SQL appears in output
        assert "INSERT INTO patterns" in out, (
            f"validate_capture: expected 'INSERT INTO patterns' in stdout.\nGot:\n{out}"
        )

        print("[validate_capture] PASSED — dry-run produces SQL, no side effects.")
        print(f"  stdout preview:\n{out[:600]}")

    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = _build_arg_parser()

    if len(sys.argv) == 2 and sys.argv[1] == "--smoke-test":
        validate_capture()
        sys.exit(0)

    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
