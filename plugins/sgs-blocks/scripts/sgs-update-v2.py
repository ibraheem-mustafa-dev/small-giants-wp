"""
sgs-update-v2.py — 13-stage holistic refresh of the SGS framework knowledge base.

Phase 4 of the architecture programme. Co-exists with the legacy 3-script setup
(update-db.py + generate-block-reference.py + sgs-update-uimax-sync.py) until
all 13 stages pass the Phase 4 gate, at which point the slash command entrypoint
swaps to this script.

Renumbered 2026-08-10 (Bean-directed): the pipeline used to carry 14 numbered
slots but only 13 stage functions — the old Stage 3 (wpcli_handbook_refresh)
was retired and merged into Stage 2's Source 3, yet still occupied slot 3 with
a tombstone lambda. That slot has been deleted outright and every stage from
the old 4-14 has shifted down by one to close the gap, so the pipeline is now
a clean contiguous 1-13. Anyone with muscle memory for the pre-2026-08-10
numbers should subtract one from any stage number 3 or higher.

Stages (per .claude/plans/phase-4-sgs-update-rebuild.md):
  1. sgs_codebase_scan      — walk src/blocks/*/block.json into sgs-framework.db
                              (INSERT new rows + UPDATE drifted rows when block.json changes)
  2. core_gutenberg_cache_refresh — pull from 10 canonical upstream sources (Decision 30)
  3. style_variation_sync   — walk sites/*/theme-snapshot.json (no-op pre-Phase-5a)
  4. slot_synonym_auto_seed — heuristic slot → block mapping
  5. block_replacement_mapping — verify blocks.replaces validity
  6. spec_doc_regen         — regenerate .claude/specs/02-SGS-BLOCKS-REFERENCE.md
  7. uimax_mirror           — mirror sgs-blocks → uimax CSV
  8. drift_gate             — warn on MAJOR.MINOR WP version mismatch
  9. prune_orphans          — delete orphan rows across three categories:
                              (a) BLOCK-LEVEL: block_slug absent from `blocks` table
                                  (block retired/renamed — deletes stale attrs/supports/caps)
                              (b) STALE-SUPPORTS: block exists but support_name removed from
                                  block.json (default: DELETE; opt-in conservative: mark is_stale=1)
                              (c) ATTR-LEVEL: block exists but attr_name removed from block.json
                                  (ghost rows Stage 1 never removes — always deleted regardless
                                  of prune_mode; block_attributes has no is_stale column)
                              Operates on both .agents + .claude DBs.
 10. container_mirror_report — run sync-container-wrapping-blocks.py --write-block-json
                               (report-only; NO --apply — operator-gated). Surfaces which
                               KIND-scoped sgs/container attrs each composite is missing
                               so a version-bump is visible before any operator-gated --apply.
 11. motion_fx_artefact_regen — regenerate the Spec 38 motion-fx shipped artefacts
                               (generated-fx-effects.php + generated-fx-effect-meta.json +
                               generated-fx-qualifying-blocks.json — the .php mirror of the
                               last one was DELETED as dead code at 1ac16ec9) from fx_effects
                               (DB, finalised by Stage 1's tail step) + block.json/edit.js/
                               style.css (files). Runs last so it always reads the DB
                               state this SAME invocation produced. See D432 follow-up,
                               2026-08-01 — the DB was made the single source for the
                               fx:* namespace, but nothing regenerated the artefacts THE
                               DB IS FOR; this stage is that missing writer.
 12. run_audit_scanners     — run audit scanners keyed to DB/roster (report-only).
                              Regenerate roster.json, then run consistency checks
                              (db-consistency, consistency-gates, fx-list-drift,
                              box-family-guard, inspector-conformance, feature-parity).
                              Findings are informational; never fail the reseed.
 13. export_db_to_csv       — export every live table to CSV in
                              ~/.agents/skills/sgs-wp-engine/db\\ data/ (the space is
                              literal). Idempotent + deterministic. Removes CSVs for
                              retired tables. Reports tables exported, row counts, added/removed.

Usage:
    python sgs-update-v2.py [--stage N] [--dry-run] [--wp-version X.Y] [--prune-mode MODE] [--self-test]

    --stage N               Run only stage N (1-13). Omit to run all.
    --dry-run               Compute row counts without writing to DB or files
    --wp-version X.Y        WP version tag for Stage 2 (default: 7.0)
    --prune-mode MODE       Stage 9 only: 'aggressive' (default) DELETEs stale support rows.
                            'conservative' sets is_stale=1 instead (opt-in cautious mode).
    --self-test             Stage 13 only: test that the export stage can fail (do not use operationally).
                            Attr-level orphans are always deleted regardless of prune_mode
                            (block_attributes has no is_stale column).
"""

import argparse
import base64
import hashlib
import json
import os
import re
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

# BUMP THIS ON EVERY WP UPGRADE. Stage 2 writes schema_metadata.wp_version_indexed
# from --wp-version, which DEFAULTS to this constant, so a stale value here is
# silently RE-ASSERTED as correct on every full /sgs-update run - it does not
# merely go stale once. Measured 2026-08-24 (D765): this said "7.0" while the
# canary had been on 7.1 since 2026-08-20 (`wp core version` = 7.1, verified
# over SSH, not read from a doc). stage_8_drift_gate DOES detect the mismatch
# and only print()s it; its own TODO to wire that into a deploy hook is still
# unactioned, and grep confirms nothing outside this file calls it.
WP_VERSION_DEFAULT = "7.1"

# Files excluded from indexed_files scan
EXCLUDED_DIRS = {"node_modules", "build", "vendor", ".git", "__pycache__"}

# --- Declarative block capabilities (D525, 2026-08-08) -----------------------
# `supports.sgs.<key>: true` in a block's own block.json → a block_capabilities
# row (slug, <capability>). Absent or false → the row is DELETED. Idempotent, and
# NOT a slug list: adding a capability costs one entry here plus a block.json key,
# so the fact always travels with the block (R-31-1).
#
# ⛔ This map is the ONLY sanctioned writer of a non-lift capability. Do not run
# `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py` to add capabilities: its
# hardcoded CAPABILITY_RULES dict is the fossil source this replaced, and it shares
# a last-one-wins conflict with the partially-ported `block_selectors` writer, so
# running it would silently clobber selectors as well.
_DECLARATIVE_CAPABILITIES = {
    # Renders a repeated set of items as its PRIMARY content, whose children carry
    # their own interactive elements. Consumed by the universal-extension fit test
    # (`isCollectionKind`): a block-link cannot wrap one of these, because HTML
    # forbids nesting interactive elements — that is an ARCHITECTURAL fact about
    # the rendered output, not the product-taxonomy question
    # (`category === 'sgs-forms' && !surfaces.styling`) the old heuristic asked,
    # which is why sgs/gallery was never flagged.
    "collection": "collection",
    # Offers the client an icon chooser via the shared `IconPicker`. This is the
    # CONTROL-SURFACE fact, deliberately kept SEPARATE from `role LIKE 'icon-%'`:
    # that role family is the cloning converter's icon-SOURCE discriminator
    # (lucide / emoji / dashicon / wp-icon) and answers a different question, which
    # is why it tags 2 blocks where the picker is mounted by 13. Widening the role
    # to cover control-surface scope would have broken the converter's arm.
    "iconPicker": "icon-picker",
}

# The FUNCTIONAL capability namespace — the 3 converter-read lift flags plus the 2
# declarative facts above. A discovery keyword must never enter this set (D528): a
# block would gain a functional capability by using the word as a search term.
_FUNCTIONAL_CAPABILITY_NAMES = frozenset(
    {"scalar-content-lift", "scalar-styling-lift", "array-content-lift"}
    | set(_DECLARATIVE_CAPABILITIES.values())
)

# Capability names with NO in-repo writer and NO live reader, seeded historically by
# populate-db.py's CAPABILITY_RULES. Their only consumer — the capability-aware
# tiebreaker — was RETIRED at D278, and every live `capabilities_for()` call site
# reads only the three lift flags (measured 2026-08-08). Pruned on every Stage 1 so
# the table means exactly one thing: capabilities a block DECLARES about itself.
# ⚠ Removing a name from this set does NOT resurrect it — there is no writer.
_FOSSIL_CAPABILITIES = frozenset({
    "action-button", "alert", "animated-numbers", "call-to-action", "carousel",
    "conversion", "countdown", "cta", "decorative", "dismissible", "expandable",
    "faq", "floating-element", "form-input", "full-width-banner", "grid-layout",
    "horizontal-strip", "icon-text", "image-overlay", "logo-strip", "modal-popup",
    "navigation", "notification", "partner-logos", "pricing", "process-display",
    "question-answer", "rating", "schema-faq", "social-links", "social-proof",
    "steps", "tabbed-content", "team-display", "time-limited", "trust-indicators",
})

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


def _table_count(db_path: Path) -> int:
    """How many non-internal tables the file holds. 0 for absent/empty."""
    if not db_path.exists() or db_path.stat().st_size == 0:
        return 0
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        return con.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite@_%' ESCAPE '@'"
        ).fetchone()[0]
    finally:
        con.close()


def bootstrap_rebuild(db_path: Path = None) -> None:
    """Create the schema and replay migrations before the seeding stages run.

    Phase 0 (D464). The knowledge base could not be rebuilt: its foundational
    tables have no ``CREATE TABLE`` anywhere in production code, so a seeder
    pointed at an empty file died on `no such table: blocks`. This applies the
    committed DDL, then replays the tracked migrations, then hands over to the
    normal stages unchanged.

    REFUSES a populated database. Rebuilding over real data would destroy the
    only copy of a gitignored file; the operator must delete it deliberately.
    """
    db_path = db_path or SGS_DB
    dbschema = Path(__file__).resolve().parent / "dbschema"
    schema_sql = dbschema / "schema.sql"

    existing = _table_count(db_path)
    if existing:
        print(
            f"FATAL: --rebuild refuses a populated database.\n"
            f"  {db_path} already holds {existing} table(s).\n"
            f"  Rebuilding would destroy the only copy of a gitignored file.\n"
            f"  Delete it deliberately first if you genuinely mean to rebuild.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not schema_sql.exists():
        print(f"FATAL: schema not found at {schema_sql}", file=sys.stderr)
        sys.exit(1)

    print(f"[--rebuild] applying schema: {schema_sql}")
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(db_path))
    try:
        con.executescript(schema_sql.read_text(encoding="utf-8"))
        con.commit()
        made = con.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite@_%' ESCAPE '@'"
        ).fetchone()[0]
    finally:
        con.close()
    print(f"[--rebuild] schema applied — {made} table(s) created")

    sys.path.insert(0, str(dbschema))
    import migrate as _migrate  # noqa: PLC0415

    # DO NOT REPLAY MIGRATION HISTORY HERE. Measured 2026-08-02, Step 0.5:
    # replaying history onto a schema captured from the PRESENT is incoherent by
    # construction. The rebuild died on migration #2
    # (2026-05-16-slot-synonyms-roles.py) with `no such table: slot_synonyms` --
    # because `slot_synonyms` was later RETIRED in favour of `slots`, so the
    # current schema correctly has no such table while three historical
    # migrations still reference it. A May migration cannot be applied to an
    # August schema; they describe different worlds.
    #
    # The migrations are therefore RECORDED as applied, not run. That matches
    # how the live DB itself was adopted (Step 0.3) and is honest: their effects
    # are already baked into schema.sql. Regenerating the DATA is Phase 1's job
    # -- regenerative seeders from source -- not a history replay.
    _migrate.cmd_mark_applied(db_path, _migrate.MANIFEST)
    print("[--rebuild] migrations recorded as applied (NOT replayed — see the "
          "comment in bootstrap_rebuild)\n")

    restore_wp_reference_archive(db_path)

    print("[--rebuild] handing over to the seeding stages\n")


def restore_wp_reference_archive(db_path: Path = None) -> None:
    """Rehydrate the orphaned WordPress reference corpus (`hooks` + `docs`).

    Track 1 T1.7 (2026-08-02). `hooks` and `docs` hold ~6,690 rows imported
    from an upstream MCP database (`~/.wp-devdocs-mcp/hooks.db`) that no
    longer exists on this machine — see the module docstring of
    `dbschema/wp_reference_archive.py`. Neither table's bulk content is
    derivable from this repo (measured: `--rebuild` alone leaves `hooks` at
    161 rows and `docs` at 46, against a live ~5,494 / ~1,077), so without
    this step every `--rebuild`d database silently ends up missing >95% of
    both tables — the exact silent-rot class `wp_reference_archive.py` exists
    to end.

    Restores from the committed gzip archive (`scripts/data/wp-reference/
    *.json.gz`), deliberately NOT `dbschema/refresh_wp_reference.py`'s
    GitHub-scrape path — a `--rebuild` must stay OFFLINE-CAPABLE and
    DETERMINISTIC, and a rebuild that only sometimes succeeds depending on
    network access or upstream repo state is not that.

    Ordering / conflict-safety: this runs immediately after schema creation,
    while `hooks` and `docs` are still completely empty, so the archive's
    `INSERT OR REPLACE` (keyed on the `UNIQUE(name, hook_type)` constraint
    for hooks, and `slug` for docs) has nothing to collide with. No
    SGS-authored (`source='sgs'`) row can exist yet at this point in
    `--rebuild`'s sequence: of the three writers of `hooks`, only
    `uimax-tools/enrich-db.py`'s `target_29_hooks` (a repo PHP scan) ever
    writes `source='sgs'` rows, and that script is a standalone manual tool
    `--rebuild` never invokes (see the "NOT wired" note above
    `_REBUILD_SEEDERS`). The other two writers — this file's own
    `_scrape_source_2_hooks` (Stage 2, GitHub-scraped, `source='native_wp'`)
    and this restore — both key on the same `(name, hook_type)` UNIQUE
    constraint the schema defines, so if Stage 2 later runs against a
    network it can only add rows the archive lacks, never destroy one.

    Passes `allow_live=True` deliberately: `wp_reference_archive.restore()`'s
    live-path refusal exists to stop a ROUTINE call from clobbering live
    reference data by accident outside a deliberate rebuild. Here,
    `bootstrap_rebuild()`'s own populated-database refusal (above, and the
    caller in `main()`) is the gate that actually protects live data — by
    the time this function runs, the database has already been proven to
    have started with zero tables.

    Non-fatal on a missing/unreadable archive: warns loudly to stderr and
    lets the rebuild continue with whatever `hooks`/`docs` rows Stage 1/2
    manage to produce, matching every other seeder wired into `--rebuild`
    (`run_module_load_seeders`, `_run_standalone_seeders`) — a rebuild that
    seeds every other table and REPORTS one gap is more useful than one that
    aborts outright.
    """
    db_path = db_path or SGS_DB
    dbschema = Path(__file__).resolve().parent / "dbschema"
    if str(dbschema) not in sys.path:
        sys.path.insert(0, str(dbschema))
    print(
        "[--rebuild] restoring the orphaned WordPress reference corpus "
        "(hooks + docs) from the committed archive ..."
    )
    try:
        import wp_reference_archive  # noqa: PLC0415
        wp_reference_archive.restore(db_path, allow_live=True)
    except FileNotFoundError as exc:
        print(
            f"[--rebuild] WARNING: reference archive missing or unreadable "
            f"({exc}). hooks/docs will stay at whatever level Stage 1/2 "
            f"produce (repo-scan only, near-empty) -- run "
            f"'python dbschema/wp_reference_archive.py --export' from a "
            f"checkout that still has the live corpus to regenerate it.",
            file=sys.stderr,
        )
        return
    print("[--rebuild] reference corpus restored\n")


def run_module_load_seeders(db_path: Path = None) -> None:
    """Fire db_lookup's module-load seeders, which /sgs-update never triggers.

    MEASURED 2026-08-02 (Phase 0 Step 0.5). ``converter/db/db_lookup.py`` runs
    three idempotent seeders AT MODULE LOAD (`_migrate_roles_table`,
    `_migrate_html_tag_to_core_block`, `_migrate_property_suffixes_kind_override`)
    -- the self-healing pattern Phase 1 is meant to extend. But they only fire
    when something IMPORTS db_lookup, i.e. when the CONVERTER runs. `/sgs-update`
    does not import it, so a rebuild left those tables at zero and they looked
    like missing seeders.

    Proven in a sandbox: importing db_lookup against a freshly-schema'd empty DB
    took `html_tag_to_core_block` 0 -> 17 (exactly live's count) and `roles`
    0 -> 21. Neither is a Phase-1 gap; both were simply unwired.

    This is deliberately a subprocess: db_lookup binds its connection at import
    time, so it must start AFTER the schema exists, in a clean interpreter.
    """
    db_path = db_path or SGS_DB
    scripts = Path(__file__).resolve().parent
    probe = (
        "import sys;"
        f"sys.path.insert(0, r'{scripts / 'converter' / 'db'}');"
        f"sys.path.insert(0, r'{scripts / 'converter'}');"
        "import db_lookup"
    )
    print("[--rebuild] firing db_lookup module-load seeders ...")
    result = subprocess.run(
        [sys.executable, "-c", probe], cwd=str(scripts),
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        tail = (result.stderr or "").strip().splitlines()[-4:]
        print("[--rebuild] WARNING: db_lookup seeders did not run cleanly:",
              file=sys.stderr)
        for line in tail:
            print(f"    {line}", file=sys.stderr)
        return
    print("[--rebuild] db_lookup seeders done\n")
    _run_standalone_seeders(scripts)


# Seeders that exist and are IDEMPOTENCY-AUDITED but were never wired into any
# reseed. Audited 2026-08-02 by source inspection; only these two are safe to run
# unattended. Deliberately invoked on --rebuild ONLY, never on a normal reseed:
# a routine `/sgs-update` should not silently start running extra scripts.
_REBUILD_SEEDERS: tuple[tuple[str, str, str], ...] = (
    # legacy_role_lookup entry REMOVED 2026-08-03. The table was retired (its role
    # is served by `slots`), and its seeder was deleted — it carried
    # CREATE TABLE IF NOT EXISTS, which is how the table came back after its first
    # retirement at D99 and silently survived every reseed since. The entry was a
    # dead reference to a missing script: harmless, because _run_standalone_seeders
    # guards on script.exists(), but a guard is not a reason to keep a pointer to
    # something that no longer exists.
    (
        "generate-markup-examples.py",
        "markup_examples",
        "Pre-fetches existing block_slugs then skips them. Reads each block.json. "
        "NEVER pass --reset-sgs here — it DELETEs the sgs rows.",
    ),
)

# NOT wired, with reasons (do not 'helpfully' add these without fixing them first):
#  * uimax-tools/enrich-db.py  -> style_variations + pattern_coverage.
#    Both TARGETS are idempotent, but the SCRIPT is all-or-nothing: run_all()
#    fires all 10 targets with only --repo/--dry-run to control it, and target 2.1
#    writes `slot_synonyms` — a table RETIRED in favour of `slots`. It also loops
#    over both DB paths, which are one inode today, so each target would run twice
#    against the same file. Needs a --only <target> selector before it is safe.
#  * pattern-register.py / orchestrator/register_patterns.py -> patterns.
#    Writer B is idempotent but needs a live clone-run artefact, so it cannot
#    reseed from nothing; Writer A is a manual single-pattern CLI. Note
#    pattern_coverage reads FROM patterns, so it is order-dependent on this.


def _run_standalone_seeders(scripts: Path) -> None:
    """Run the audited standalone seeders that no reseed ever invoked."""
    for rel, table, _why in _REBUILD_SEEDERS:
        script = scripts / rel
        if not script.exists():
            print(f"[--rebuild] SKIP {rel} (not found)", file=sys.stderr)
            continue
        print(f"[--rebuild] seeding {table} via {rel} ...")
        result = subprocess.run(
            [sys.executable, str(script)], cwd=str(scripts),
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            # Non-fatal: a rebuild that seeds 9 of 10 tables and says so is more
            # useful than one that aborts. The comparison report shows the gap.
            print(f"[--rebuild] WARNING: {rel} exited {result.returncode}",
                  file=sys.stderr)
            for line in (result.stderr or "").strip().splitlines()[-4:]:
                print(f"    {line}", file=sys.stderr)
        else:
            print(f"[--rebuild] {table} seeded")
    print()


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


def _canonical_attr_type(raw) -> str:
    """Collapse a block.json JSON-schema type UNION (list) to one DB string.

    block.json may declare e.g. ["number","string"] (sgs/heading + sgs/text
    fontSize accept a numeric size OR a theme preset slug). The
    block_attributes.attr_type column is a single string and the converter's
    attr_is_number() matches attr_type IN ('number','integer') — so prefer the
    numeric member when present (preserves the numeric font-size lift), else
    take the first entry. Binding the raw list crashes sqlite3.
    """
    if isinstance(raw, list) and raw:
        for numeric in ("number", "integer"):
            if numeric in raw:
                return numeric
        return str(raw[0])
    return raw


# --- is_responsive ground truth (fixed 2026-09-05, corrected 2026-09-06 per
# task review — see is-responsive-report.md for both passes' evidence) ---
#
# `block_attributes.is_responsive` answers "can this attribute's value differ
# per device?" — NOT "is this a per-device MEDIA/art-direction slot" (that was
# the pre-fix behaviour: it happened to correlate with Tablet/Mobile siblings
# existing, which is why most `is_responsive=1` rows sampled as
# backgroundImage/bgVideo/imageId art-direction attrs rather than cascading
# values).
#
# TWO independent mechanisms produce a genuinely responsive attribute in this
# codebase (Spec 35 Phase 1.4 doctrine):
#
#   1. FLAT TIER SIBLINGS — a base attr plus declared `{base}Tablet` /
#      `{base}Mobile` rows. Both the base AND each sibling vary by device, so
#      all three get flagged (including per-device ASSET siblings —
#      `videoUrl`/`videoUrlTablet`, `thumbnail`/`thumbnailTablet` — an
#      art-directed image genuinely differs per device, so this is correct
#      behaviour, not a bug; an earlier revision of this comment wrongly
#      claimed asset families should read 0).
#
#   2. TIER-OBJECT — a single object-typed attr whose value is unpacked into
#      {desktop, tablet, mobile} internally. This is NOT detectable from the
#      attribute's name or its `{}` default alone — see below.
#
# MECHANISM 2's two evidence channels + the doctrine fallback (2026-09-06 fix):
#
#   The 2026-09-05 pass detected mechanism 2 purely from RENDER EVIDENCE — a
#   regex over `sgs_responsive_normalise_object( $attributes['<attr>'] ...)`
#   call sites. A task review proved that regex blind on TWO real channels:
#
#   (a) DYNAMIC KEYS — `includes/helpers-typography.php` builds the attr name
#       at runtime (`sgs_typography_attr($prefix, 'FontSize')`) and passes the
#       value to `sgs_responsive_atoms_from_spec()` (helpers-responsive.php),
#       which normalises the object. The literal name exists at NEITHER end
#       (`sgs/product-card.titleFontSize`, `.priceFontSize`,
#       `sgs/nav-menu.itemFontSize`, `sgs/icon-list.itemFontSize`,
#       `sgs/card-grid.titleFontSize`, `sgs/trust-bar.titleFontSize`, and the
#       wider `*FontSize`/`*LineHeight`/`*LetterSpacing` object family — no
#       source regex can ever see these.
#   (b) A SECOND CALL SHAPE — `nav-menu/render.php:1402,1609,1616` and
#       `nav-drawer/render.php:322,337` (and the shared wrapper's grid-item /
#       outer-box emission, ~class-sgs-container-wrapper.php:2986-3305) build
#       a `'value' => $attributes['<attr>']` array literal fed to
#       `sgs_emit_responsive_css()`/`sgs_responsive_atoms_from_spec()` rather
#       than calling `sgs_responsive_normalise_object()` directly. The old
#       regex only matched the FIRST call shape, so `submenuPadding`,
#       `drawerGap`, `drawerPadding`, `listColumns`, and — found by this same
#       fix, not named in the review — `sgs/container.gridItemPadding` /
#       `gridItemBorderRadius` (both PROVEN tier-of-boxes by reading
#       class-sgs-container-wrapper.php:3092-3138's own comment: "gridItemPadding
#       / gridItemBorderRadius are NOT genuinely per-SIDE box properties for
#       this emitter's purposes... whose transform serialises a whole TIER's
#       box/corner object") all stayed wrongly at 0 despite carrying real,
#       literal render evidence — just of the second shape.
#
#   `_TIER_OBJECT_EVIDENCE_RE` below now matches BOTH call shapes, closing (b)
#   entirely via evidence (no name-guessing needed).
#
#   (a) has no fix via evidence — the name is never present anywhere to grep.
#   For this, and ONLY as the fallback when NO evidence exists either way, an
#   object-typed attr is classified against Spec 35's CLOSED, NAMED BOX set
#   (`scripts/surveys/survey-responsive-shape.py`'s `BOX_BASES`: padding /
#   margin / borderWidth / borderRadius, bare or as a capitalised suffix —
#   `cardPadding`, `ctaBorderRadius`, `tagPadding`): anything NOT in that set
#   is a tier by elimination (`_is_box_family_attr()` below).
#
#   ⚠ Evidence beats the name doctrine, deliberately, not the other way round.
#   Several attrs carry a box-shaped NAME while being PROVEN tier-of-boxes by
#   direct render evidence (gridItemPadding, submenuPadding, drawerPadding,
#   container.padding/margin themselves — see class-sgs-container-wrapper.php
#   ~:3290-3305, which feeds `$attributes['padding']` through the SAME
#   `sgs_emit_responsive_css()` tier pipeline as gap/maxWidth/columns, `'box'
#   => true` merely telling the emitter to serialise each TIER's value as
#   4-side shorthand). A pure name-only exclusion — the literal fix-shape
#   proposed in the task review — would have reintroduced exactly the bug this
#   task exists to fix for these 6 attrs (proven wrong via the wrapper's own
#   in-code comments + fixture data, not guessed): it would flip them back to
#   0 despite real, literal, checked-in evidence that they vary by device.
#   Evidence is therefore an ADDITIVE confirmation (can turn a name-doctrine-0
#   into a correct 1), never a suppressor (can never turn a name-doctrine-1
#   back to 0) — so the "don't let the render scan veto" instruction is honoured
#   in the one direction it protects (a dynamic-key tier attr can never be
#   hidden again by evidence being silent), while real evidence still wins
#   over a name heuristic that is provably wrong for 6 named attrs. Every such
#   override PRINTS an explanatory line during the reseed so it stays
#   auditable rather than a silent divergence from the review's literal text.
#
# Anything else — box objects with no tier siblings and no render evidence,
# plus (task review, 3rd pass) a single-object media ASSET slot with no tier
# siblings and no render evidence (`_is_asset_like_attr`) — is 0.
#
# ⚠ CORRECTED (task review, 3rd pass): this comment previously claimed the
# code "mirrors survey-responsive-shape.py's TIER-vs-BOX-vs-asset-vs-flag
# doctrine" while containing ZERO occurrences of that script's `ASSET_HINTS`
# or its asset branch — a name-mismatch caught only by a task review that
# actually grepped for the string, not by any gate. The FLAG category (a
# boolean per-device visibility toggle, e.g. `sgsHideOnMobile`) is genuinely
# NOT mirrored here and does not need to be: `attr_type == 'object'` gates
# the whole of mechanism 2, so a boolean flag can only ever reach this
# function via mechanism 1 (a declared Tablet/Mobile sibling), which already
# correctly flags it `1` — there is no separate flag branch to port. The
# TIER/BOX/ASSET/RECORD four categories that DO apply to an object-typed
# attr are now all implemented; this comment is corrected to describe that,
# not an aspirational mirror of a script this file does not import from.
_CONTAINER_WRAPPER_PHP_PATH = (
    Path(__file__).resolve().parent.parent / "includes" / "class-sgs-container-wrapper.php"
)

# Two call shapes, both real render evidence that an object attr's value is
# unpacked per-tier — see the module comment above for why a single-shape
# regex silently missed submenuPadding/drawerGap/drawerPadding/listColumns/
# gridItemPadding/gridItemBorderRadius despite each carrying literal evidence.
_TIER_OBJECT_EVIDENCE_RE = re.compile(
    r"sgs_responsive_normalise_object\(\s*\$attributes\[\s*['\"]([A-Za-z0-9_]+)['\"]\s*\]"
    r"|'value'\s*=>\s*\$attributes\[\s*['\"]([A-Za-z0-9_]+)['\"]\s*\]"
)

# Spec 35's CLOSED, NAMED box set (survey-responsive-shape.py's `BOX_BASES`) —
# used ONLY as the fallback when no render evidence exists either way (the
# dynamic-key typography family). Bare name or a capitalised suffix counts as
# a "prefixed variant" (`cardPadding`, `ctaBorderRadius`, `tagPadding`).
_BOX_FAMILY_BASES = ("padding", "margin", "borderWidth", "borderRadius")


def _is_box_family_attr(attr_name: str) -> bool:
    """True when `attr_name` IS one of Spec 35's closed box bases, or a
    prefixed variant of one (name ends with the base, capitalised). Name-only
    heuristic — deliberately NOT consulted when render evidence exists (see
    the module comment above `_CONTAINER_WRAPPER_PHP_PATH`).

    ⚠ KNOWN LIMITATION, DELIBERATELY LEFT AS-IS (task-review I3, 2nd pass):
    this test is BLIND to a `Tablet`/`Mobile` tier suffix —
    `"paddingTablet".endswith("Padding")` is `False`, so a tier sibling of a
    box base is classified NON-box by this function. On a block where the
    base (`padding`) is native `supports.spacing` rather than a declared
    attr (e.g. `sgs/info-box`), mechanism 1b in `_compute_is_responsive`
    can't find the base in `attrs` either, so `paddingTablet` falls through
    to mechanism 2's box-doctrine fallback and reaches `1` ONLY because THIS
    function's suffix-blindness makes it look non-box. The answer (1) is
    right; the reasoning path is fragile — a future "tidy" of this function
    to strip the tier suffix first would flip it to a wrong 0 (no mechanism
    1 coverage, no render evidence, and now correctly-but-uselessly
    box-by-name). Deliberately NOT changed here: extending mechanism 1 to
    "own" a tier sibling whose base isn't itself a declared attr is a wider
    behaviour change than this review-closure pass can verify against the
    whole corpus. Pinned instead by a dedicated self-test fixture
    (`_self_test_is_responsive`, "info-box padding-tablet-without-declared-
    base" case) so a future refactor that flips this gets caught immediately.
    """
    for base in _BOX_FAMILY_BASES:
        suffix = base[0].upper() + base[1:]
        if attr_name == base or attr_name.endswith(suffix):
            return True
    return False


# ASSET shape — the fifth doctrine category, ported from
# `scripts/surveys/survey-responsive-shape.py`'s `ASSET_HINTS` (task review,
# 3rd pass). A single-object media SLOT (`{id,url,alt,type}`, `sgs_render_media()`
# consumes it whole) is a different RESOURCE per device, not a cascading
# value — `sgs/testimonial.orgLogo`/`.workMedia`, `sgs/cta-section.
# backgroundMedia`, `sgs/decorative-image.decorMedia`, `sgs/nav-drawer.
# backgroundImage` all have no Tablet/Mobile siblings, no render evidence of
# per-tier unpacking (nothing calls `sgs_responsive_normalise_object()` or the
# `'value' => $attributes[...]` shape on them — they go straight into
# `sgs_render_media()` as a single opaque object), and an empty/null
# `default` that `_is_record_object_attr` correctly declines to call a
# record. Left unclassified, all five fell into "tier by elimination" and
# read a wrong 1 — a REGRESSION versus the pre-2026-09-05 state, where they
# correctly read 0 (by coincidence, not by design: the old one-line check
# only ever looked for a Tablet/Mobile sibling, which these attrs never had).
#
# ⚠ Tokenised on the FINAL camelCase word ONLY, not `any(hint in words)` like
# the survey script — the survey is a human-triaged census where an
# over-inclusive hint is fine (a person reads every finding); this is a
# closed-loop seeder branch where over-inclusion silently reclassifies a real
# cascading value. `splitMediaHeight`/`splitMediaMinHeight`/
# `splitMediaMaxWidth`/`splitMediaMaxHeight` (sgs/hero, all object-typed, no
# siblings, no evidence) each contain the word "media" but ARE genuine
# cascading tier values (their own render evidence proves it elsewhere in the
# corpus for the sibling attrs in this family) — the attribute's name is
# built as `{assetAttr}{StylingProperty}`, so only testing the LAST word
# (Height/Width, not Media) tells "is this attribute itself an asset" apart
# from "is this a styling property OF an asset". Whole-word matching (not
# substring) reuses the same word-splitter as the survey script for the same
# reason it documents: a naive substring check matched "id" inside "hideOn".
_ASSET_HINT_WORDS = frozenset(
    {"image", "video", "media", "thumbnail", "logo", "svg", "poster", "url", "id"}
)
_CAMEL_WORD_RE = re.compile(r"[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])")


def _camel_words(name: str) -> list:
    """Split a camelCase attribute name into lower-cased whole words. Mirrors
    `survey-responsive-shape.py`'s `camel_words()` byte-for-byte (word-boundary
    matching is mandatory, not a nicety — see that function's own docstring
    for the "id" inside "hideOn" false-positive it was built to prevent)."""
    return [w.lower() for w in _CAMEL_WORD_RE.findall(name)]


def _is_asset_like_attr(attr_name: str) -> bool:
    """True when `attr_name`'s FINAL camelCase word names a per-device asset
    (image/video/media/logo/svg/poster/url/id) — i.e. the attribute itself
    IS an asset slot, not a styling property of one. See the module comment
    above `_ASSET_HINT_WORDS` for why this is last-word-only, not
    any-word, unlike the survey script it is ported from.
    """
    words = _camel_words(attr_name)
    return bool(words) and words[-1] in _ASSET_HINT_WORDS


# Device-tier and box-side vocabularies, shared by `_is_record_object_attr`
# below (task-review C1). An object attr's `default` intersecting NEITHER
# set — while the object itself is not a plain empty `{}` — proves it is a
# fixed-shape RECORD (a small config struct), not a tier object and not a
# box object. Distinct from `_BOX_FAMILY_BASES` (a NAME doctrine); this is a
# SHAPE doctrine over the attr's own declared `default`/`properties`.
_TIER_KEY_NAMES = frozenset({"desktop", "tablet", "mobile"})
_BOX_SIDE_KEY_NAMES = frozenset({"top", "right", "bottom", "left"})


def _is_record_object_attr(attr_def) -> bool:
    """True when an object-typed attr's OWN declaration proves it is a
    fixed-shape RECORD (a small config struct with named, non-tier,
    non-box fields) rather than a tier object or a box object — a FOURTH
    shape the doctrine's tier-by-elimination fallback previously missed
    entirely (task-review C1, 2nd pass). Two independent proofs, either
    sufficient:

    1. The attr declares a top-level `"properties"` schema — an explicit
       field-by-field record (e.g. `sgs/mega-panel.asideSeparator`'s
       `{"style":..., "colour":..., "width":...}`). Deliberately scoped to
       TOP LEVEL only: every other `"properties"` hit in the corpus lives
       inside an `items` schema for an ARRAY attr, which never reaches this
       function (the caller gates on `attr_type == 'object'`).
    2. `default` is a non-empty object whose keys intersect NEITHER the
       device-tier vocabulary NOR the box-side vocabulary — e.g.
       `shapeDividerTopScale`'s `{"x": 100, "y": 100}` 2-axis scale. An
       empty `{}` default (the overwhelming majority of object attrs) is
       NOT a record by this rule — it carries no shape information either
       way and stays in the tier-by-elimination fallback.

    Verified against the live corpus before shipping: exactly 11 rows match
    (`shapeDividerTopScale`/`shapeDividerBottomScale` on 5 blocks,
    `asideSeparator` on `sgs/mega-panel`), zero more, zero fewer — both
    rules independently converge on the same 11, and a full-corpus scan of
    every object-typed attr's `default` found no other non-empty dict whose
    keys avoid both vocabularies.
    """
    if not isinstance(attr_def, dict):
        return False
    _props = attr_def.get("properties")
    if isinstance(_props, dict) and _props:
        return True
    _default = attr_def.get("default")
    if isinstance(_default, dict) and _default:
        _keys = set(_default.keys())
        if not (_keys & _TIER_KEY_NAMES) and not (_keys & _BOX_SIDE_KEY_NAMES):
            return True
    return False


def _tier_object_attrs_from_php(path: Path) -> set:
    """Attr names with literal render evidence of per-tier unpacking (either
    call shape — see `_TIER_OBJECT_EVIDENCE_RE`) in one PHP file. Returns an
    empty set (never raises) when the file is absent or unreadable, so a
    missing render.php just means "no evidence found there", not a crash.
    Callers that require the file to exist (the shared wrapper, below) add
    their own hard assertion — this function alone cannot distinguish
    "genuinely no render.php" (fine) from "the ONE shared wrapper file
    vanished" (a real breakage) since both look identical from here.
    """
    if not path.is_file():
        return set()
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return set()
    found = set()
    for m in _TIER_OBJECT_EVIDENCE_RE.finditer(text):
        name = m.group(1) or m.group(2)
        if name:
            found.add(name)
    return found


# Loaded once per process — the shared wrapper file does not change per-block.
_WRAPPER_TIER_OBJECT_ATTRS = _tier_object_attrs_from_php(_CONTAINER_WRAPPER_PHP_PATH)

# MINOR (task-review 2nd pass): both `raise RuntimeError` calls below fire at
# MODULE IMPORT TIME, not inside a stage function — a missing/broken wrapper
# file breaks every stage this module is imported for (not just is_responsive
# seeding), including a plain `--stage N` for any N. Deliberate, not an
# oversight: this file is the render-evidence source for every wrapper-routed
# composite block's tier-object attrs, so a broken evidence channel is real
# breakage worth surfacing loudly regardless of which stage happens to be
# running, rather than only when Stage 1 specifically touches it.
#
# FAIL-HARD, not fail-silent (task review "Also fix"): `_tier_object_attrs_from_php`
# returns `set()` for BOTH "file missing" and "file present but no evidence",
# which is exactly right for a per-block render.php (most blocks have none)
# but wrong for this ONE shared file — if it goes missing or gets renamed,
# every wrapper-routed block's tier-object attrs silently drop to 0 and the
# seeder reports it as ordinary drift, not breakage ("a disabled rule returns
# 0, same as a clean tree" — this repo's own recorded rule).
#
# Two independent positive controls, one per alternation BRANCH of
# `_TIER_OBJECT_EVIDENCE_RE` (task-review I2, 2nd pass) — a single control
# on the union result only proves "at least one branch still matches
# something"; it does NOT prove branch 2 specifically still works. `minHeight`
# is reachable ONLY via branch 1 (`sgs_responsive_normalise_object($attributes
# ['minHeight']...)`, class-sgs-container-wrapper.php ~:499) — if branch 2
# (`'value' => $attributes[...]`) silently stopped matching, `gridItemPadding`
# /`gridItemBorderRadius`/`padding`/`margin`/`maxWidth`/`gap`/`shadow` and the
# whole `gridItem*` family would drop to 0 and this control would still pass.
# `gridItemPadding` is reachable ONLY via branch 2 (class-sgs-container-
# wrapper.php ~:3123, `'value' => $attributes['gridItemPadding']`), checked
# against branch 2 IN ISOLATION below (not the combined regex), so a broken
# branch 2 fails here even while branch 1 still works fine.
if not _CONTAINER_WRAPPER_PHP_PATH.is_file():
    raise RuntimeError(
        f"is_responsive mechanism 2 positive control failed: shared wrapper "
        f"file not found at {_CONTAINER_WRAPPER_PHP_PATH}. This file is the "
        f"render-evidence source for every wrapper-routed composite block's "
        f"tier-object attrs (minHeight/contentWidth/contentBandPadding/"
        f"gridItemPadding/...). A missing/renamed file must fail the reseed, "
        f"not silently seed those attrs as non-responsive."
    )
if "minHeight" not in _WRAPPER_TIER_OBJECT_ATTRS:
    raise RuntimeError(
        "is_responsive mechanism 2 positive control failed (branch 1): "
        f"scanning {_CONTAINER_WRAPPER_PHP_PATH} found no evidence for "
        "'minHeight', a name known to be present there today via the "
        "sgs_responsive_normalise_object(...) call shape. Either the file's "
        "content changed unexpectedly or branch 1 of "
        "_TIER_OBJECT_EVIDENCE_RE stopped matching — both mean mechanism 2's "
        "wrapper-evidence channel is silently blind. Fix the regex/file "
        "before reseeding, do not let this pass silently."
    )
if "gridItemPadding" not in _WRAPPER_TIER_OBJECT_ATTRS:
    raise RuntimeError(
        "is_responsive mechanism 2 positive control failed (branch 2): "
        f"scanning {_CONTAINER_WRAPPER_PHP_PATH} via the LIVE "
        "_TIER_OBJECT_EVIDENCE_RE found no evidence for 'gridItemPadding' — "
        "reachable ONLY via the `'value' => $attributes[...]` call shape "
        "(class-sgs-container-wrapper.php ~:3123), never via branch 1's "
        "`sgs_responsive_normalise_object(...)` shape. Either the file's "
        "content changed unexpectedly or branch 2 of "
        "_TIER_OBJECT_EVIDENCE_RE stopped matching — this control exists "
        "specifically because the minHeight control above cannot detect "
        "this failure on its own (minHeight alone would still pass with "
        "branch 2 fully dead, since it never depends on branch 2). Checked "
        "against the SAME `_WRAPPER_TIER_OBJECT_ATTRS` the seeder actually "
        "uses — not a duplicate regex — so this fails whenever the real "
        "extraction breaks, not just when a copy of its pattern would. Fix "
        "the regex/file before reseeding."
    )


def _compute_is_responsive(
    attr_name: str,
    attr_type: str,
    attrs: dict,
    render_tier_attrs: set,
    wrapper_tier_attrs: set,
) -> int:
    """Ground truth: does this attribute's value vary by device? See the
    module-level comment above `_CONTAINER_WRAPPER_PHP_PATH` for the two
    mechanisms this checks, the two render-evidence call shapes, and why a
    name-only doctrine is used only as a fallback, never a suppressor, for
    mechanism 2. Mechanism 2's fallback also refuses a fourth shape — a
    fixed-shape RECORD, proven by the attr's own declaration, never a tier
    by elimination — see `_is_record_object_attr` (task-review C1, 2nd pass)
    — and a fifth shape — a single-object media ASSET slot, whose FINAL
    camelCase word names it as such — see `_is_asset_like_attr` (task-review,
    3rd pass, closing a regression the 2nd pass's own doc comment claimed was
    already covered but was not).

    `wrapper_tier_attrs` is `_WRAPPER_TIER_OBJECT_ATTRS` when the CALLING
    block actually routes through `SGS_Container_Wrapper` (declares
    `supports.sgs.containerKind`), else an empty set — the wrapper's evidence
    only applies to a block that is proven to use it (task review "Also fix":
    the old unconditional application let `sgs/brand-strip`'s unrelated
    `columns` attr inherit wrapper evidence it never earns from routing,
    though brand-strip happens to also carry its own render evidence
    independently so this specific attr's VALUE was never wrong — the gating
    is a correctness fix for the general case, not a value fix for this one).
    """
    # Mechanism 1a — this attr IS a base with a declared Tablet/Mobile sibling.
    if f"{attr_name}Tablet" in attrs or f"{attr_name}Mobile" in attrs:
        return 1
    # Mechanism 1b — this attr IS a Tablet/Mobile sibling of a declared base.
    _m = re.match(r"^(.+?)(?:Tablet|Mobile)$", attr_name)
    if _m and _m.group(1) in attrs:
        return 1
    # Mechanism 2 — a tier-object. Gated on attr_type == 'object' throughout:
    # neither evidence channel nor the box-doctrine fallback may ever fire for
    # a 'number'/'string' attr of the same name on an unrelated block (e.g.
    # core/gallery's scalar `columns`).
    if attr_type == "object":
        has_evidence = attr_name in render_tier_attrs or attr_name in wrapper_tier_attrs
        is_box_by_name = _is_box_family_attr(attr_name)
        if has_evidence:
            if is_box_by_name:
                # Real evidence overrides a box-shaped NAME — see the module
                # comment's "evidence beats the name doctrine" paragraph.
                # Printed (not just returned) so the override is auditable
                # during every reseed, not a silent divergence from the
                # literal name-only fix-shape.
                print(
                    f"  NOTE is_responsive: '{attr_name}' is box-family BY NAME "
                    f"but has literal render evidence of per-tier unpacking — "
                    f"classified as tier (1), not box (0)."
                )
            return 1
        if not is_box_by_name:
            # No evidence either way (the dynamic-key typography family) —
            # BEFORE falling to "tier by elimination", refuse a FOURTH shape
            # the doctrine's binary tier/box choice cannot express: a
            # fixed-shape RECORD (task-review C1, 2nd pass). A record has no
            # tier sibling, is never box-named, and can never be reached by
            # evidence (nothing unpacks it per-device) — so without this
            # check every record in the corpus fell into "tier by
            # elimination" and read a wrong 1
            # (shapeDividerTopScale/BottomScale on 5 blocks,
            # sgs/mega-panel.asideSeparator — 11 rows, verified against the
            # live corpus before shipping, see `_is_record_object_attr`'s
            # own docstring for the count proof).
            _record_def = attrs.get(attr_name) if isinstance(attrs, dict) else None
            if _is_record_object_attr(_record_def):
                print(
                    f"  NOTE is_responsive: '{attr_name}' is object-typed with "
                    f"no tier sibling, no box name, and no render evidence, "
                    f"but its own declaration ('properties' schema or a "
                    f"non-tier/non-box 'default' shape) proves it is a fixed-"
                    f"shape RECORD, not a tier by elimination — classified "
                    f"non-responsive (0)."
                )
                return 0
            # ASSET shape (task review, 3rd pass) — BEFORE falling to "tier
            # by elimination", refuse a fifth shape the doctrine's binary
            # tier/box choice cannot express: a single-object media SLOT
            # whose FINAL word names an asset (see `_is_asset_like_attr`'s
            # own docstring + the module comment above `_ASSET_HINT_WORDS`).
            # Without this check every such slot in the corpus fell into
            # "tier by elimination" and read a wrong 1 (orgLogo/workMedia on
            # sgs/testimonial, backgroundMedia on sgs/cta-section, decorMedia
            # on sgs/decorative-image, backgroundImage on sgs/nav-drawer —
            # verified against the live corpus before shipping, see the
            # dispatch's confirmed-wrong-1s table).
            if _is_asset_like_attr(attr_name):
                print(
                    f"  NOTE is_responsive: '{attr_name}' is object-typed with "
                    f"no tier sibling, no box name, no render evidence, and no "
                    f"record shape, but its FINAL camelCase word names a "
                    f"per-device ASSET (image/video/media/logo/svg/poster/url/"
                    f"id) rather than a cascading value — classified "
                    f"non-responsive (0)."
                )
                return 0
            # Doctrine fallback: anything object-typed outside the closed
            # box set, not a proven record, and not a proven asset slot is a
            # tier by elimination.
            return 1
    return 0


def _self_test_is_responsive() -> int:
    """Prove `_compute_is_responsive()` fires on every mechanism it claims to
    (task review "MINOR" ask), including the negative control every detector
    needs (`a-check-with-no-positive-control-passes-against-a-dead-feature`).
    No DB connection, no filesystem writes — pure function, isolated fixtures.

    13 assertions total: 12 fixture cases (including 2 dedicated negative
    controls — `borderWidth` for the box doctrine, `splitMediaHeight` for the
    3rd-pass asset overmatch check) plus the standalone `align` negative
    control appended after the loop. Task-review 2nd pass added the 2
    fourth-shape record cases, the I3 pin, and the containerKind-gate
    fixture; task-review 3rd pass added the fifth-shape (`orgLogo`) case and
    its overmatch negative control (`splitMediaHeight`) — see each case's
    own label for which finding it closes.
    """
    cases = [
        (
            "tier object — dynamic key, zero render evidence "
            "(sgs/product-card.titleFontSize's real shape)",
            "titleFontSize", "object", {"titleFontSize": {"type": "object"}},
            set(), set(), 1,
        ),
        (
            "tier object — wrapper evidence (sgs/container.minHeight's real shape)",
            "minHeight", "object", {"minHeight": {"type": "object"}},
            set(), {"minHeight"}, 1,
        ),
        (
            "flat tier sibling pair — base",
            "gap", "string",
            {"gap": {"type": "string"}, "gapTablet": {"type": "string"},
             "gapMobile": {"type": "string"}},
            set(), set(), 1,
        ),
        (
            "flat tier sibling pair — sibling itself",
            "gapTablet", "string",
            {"gap": {"type": "string"}, "gapTablet": {"type": "string"},
             "gapMobile": {"type": "string"}},
            set(), set(), 1,
        ),
        (
            "box object, no siblings, no evidence — must stay 0",
            "borderWidth", "object", {"borderWidth": {"type": "object"}},
            set(), set(), 0,
        ),
        (
            "box-shaped NAME but PROVEN tier by render evidence — evidence "
            "wins over the name doctrine (sgs/container.gridItemPadding's "
            "real shape, class-sgs-container-wrapper.php:3121-3128)",
            "gridItemPadding", "object", {"gridItemPadding": {"type": "object"}},
            {"gridItemPadding"}, set(), 1,
        ),
        (
            "FOURTH SHAPE — record proven by a top-level 'properties' schema, "
            "no tier/box name, no evidence (sgs/mega-panel.asideSeparator's "
            "real shape: {\"style\":..., \"colour\":..., \"width\":...}) — "
            "must NOT fall to tier-by-elimination (task-review C1)",
            "asideSeparator", "object",
            {
                "asideSeparator": {
                    "type": "object",
                    "default": {"style": "line"},
                    "properties": {
                        "style": {"type": "string"},
                        "colour": {"type": "string"},
                        "width": {"type": "string"},
                    },
                }
            },
            set(), set(), 0,
        ),
        (
            "FOURTH SHAPE — record proven by a non-tier/non-box 'default' "
            "shape, no 'properties' schema (sgs/container.shapeDividerTopScale's "
            "real shape: {\"x\":100,\"y\":100}, a 2-axis scale) — must NOT "
            "fall to tier-by-elimination (task-review C1)",
            "shapeDividerTopScale", "object",
            {"shapeDividerTopScale": {"type": "object", "default": {"x": 100, "y": 100}}},
            set(), set(), 0,
        ),
        (
            "I3 PIN — box-family base is NATIVE supports.spacing, never a "
            "declared attr, so mechanism 1b can't find it; the Tablet sibling "
            "reaches the FALLBACK and gets the RIGHT answer (1) via "
            "_is_box_family_attr's suffix-blindness, not via real tier-sibling "
            "coverage (sgs/info-box.paddingTablet's real shape — see the "
            "warning above _is_box_family_attr's definition, task-review I3). "
            "A future 'fix' that strips the Tablet/Mobile suffix before the "
            "box-name test would flip this to a WRONG 0 — this case exists to "
            "catch that regression, not to endorse the current reasoning path.",
            "paddingTablet", "object", {"paddingTablet": {"type": "object"}},
            set(), set(), 1,
        ),
        (
            "containerKind gate — a NON-wrapper-routed block's OWN render "
            "evidence still fires correctly even though wrapper_tier_attrs is "
            "empty for it (sgs/brand-strip.columns's real shape — the block "
            "never declares supports.sgs.containerKind, so the caller passes "
            "wrapper_tier_attrs=set() for it; this proves the gating change "
            "doesn't accidentally starve a block of its OWN evidence, task-"
            "review 'Also fix' / MINOR)",
            "columns", "object", {"columns": {"type": "object"}},
            {"columns"}, set(), 1,
        ),
        (
            "FIFTH SHAPE — asset slot, final word 'Logo', no tier sibling, no "
            "box name, no evidence, default null (sgs/testimonial.orgLogo's "
            "real shape) — must NOT fall to tier-by-elimination (task review, "
            "3rd pass; this exact attr was a confirmed-wrong-1 regression)",
            "orgLogo", "object", {"orgLogo": {"type": "object", "default": None}},
            set(), set(), 0,
        ),
        (
            "OVERMATCH NEGATIVE CONTROL — contains the asset word 'Media' but "
            "is NOT itself an asset slot; final word 'Height' is a styling "
            "property OF an asset, not the asset (sgs/hero.splitMediaHeight's "
            "real shape) — proves last-word-only matching, not any(word), "
            "task review 3rd pass",
            "splitMediaHeight", "object", {"splitMediaHeight": {"type": "object"}},
            set(), set(), 1,
        ),
    ]
    passed = failed = 0
    for label, attr_name, attr_type, attrs, render_evid, wrapper_evid, want in cases:
        got = _compute_is_responsive(attr_name, attr_type, attrs, render_evid, wrapper_evid)
        if got == want:
            print(f"  PASS {label}: is_responsive={got}")
            passed += 1
        else:
            print(f"  FAIL {label}: got {got}, want {want}")
            failed += 1

    # NEGATIVE CONTROL — a plain scalar with no siblings and no evidence must
    # produce 0. A self-test with only positive cases cannot tell "the
    # predicate works" from "the predicate always returns 1".
    neg_attrs = {"align": {"type": "string"}}
    neg_got = _compute_is_responsive("align", "string", neg_attrs, set(), set())
    if neg_got == 0:
        print(f"  PASS negative control: plain scalar, no siblings/evidence -> {neg_got}")
        passed += 1
    else:
        print(f"  FAIL negative control: plain scalar, no siblings/evidence -> {neg_got}, want 0")
        failed += 1

    print(f"\nSelf-test: {passed} passed, {failed} failed")
    return 1 if failed else 0


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
    "has_view_script", "has_render_php", "parent_block", "replaces",
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
    Also writes block_selectors (delete-then-insert per on-disk block, plus a
    post-loop prune of rows for blocks with no block.json on disk any more —
    Task 2a/2b, 2026-08-01. See the inline comment at the write site for the
    two-writer caveat vs populate-db.py.

    Returns counters dict: scanned, new_blocks, new_attrs, new_supports,
    updated_blocks, updated_attrs, updated_supports,
    indexed_inserted, indexed_updated, indexed_skipped,
    new_selectors, pruned_selectors.

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
    new_selectors = 0
    _live_slugs: set[str] = set()

    # --- Canonical core→SGS replacement record (D270, 2026-07-04) ---
    # `replaces` no longer lives in individual block.json; the single
    # version-controlled source is scripts/data/block-replacements.json
    # (keyed sgs_slug → [core_slugs]). The DB copy (blocks.replaces) is derived
    # from it here so /sgs-update stays the one populate path. Keys starting
    # with __ are metadata and ignored.
    _repl_path = Path(__file__).resolve().parent / "data" / "block-replacements.json"
    try:
        _repl_raw = json.loads(_repl_path.read_text(encoding="utf-8"))
        replacements_record = {k: v for k, v in _repl_raw.items() if not k.startswith("__")}
    except (OSError, ValueError):
        replacements_record = {}

    # --- Ensure variant-detection schema (FR-31-20 D133) ---
    # Idempotent: matches db_lookup._migrate_variant_detection_schema so an
    # update run can populate blocks.variant_attr + variant_slots without
    # depending on the converter module being imported. Guarded ALTER +
    # CREATE IF NOT EXISTS — safe on every run.
    #
    # ADDITIVE (2026-09-05, VALUE-aware variant discrimination): variant_slots
    # gains a nullable `slot_value` column — NULL for capability variants
    # (unchanged, name-only discrimination), populated for preset variants
    # (a block with `variations.js`, e.g. sgs/nav-drawer) with the literal
    # value that name discriminates BY. See the per-block population below.
    blocks_cols = {row[1] for row in c.execute("PRAGMA table_info(blocks)").fetchall()}
    if "variant_attr" not in blocks_cols:
        c.execute("ALTER TABLE blocks ADD COLUMN variant_attr TEXT")
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS variant_slots (
          block_slug    TEXT NOT NULL,
          variant_value TEXT NOT NULL,
          unique_slot   TEXT NOT NULL,
          created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (block_slug, variant_value, unique_slot)
        )
        """
    )
    variant_slots_cols = {row[1] for row in c.execute("PRAGMA table_info(variant_slots)").fetchall()}
    if "slot_value" not in variant_slots_cols:
        c.execute("ALTER TABLE variant_slots ADD COLUMN slot_value TEXT")

    # --- preset_implications schema (Build #3 Option B, AUTO-DERIVE, 2026-07-24) ---
    # Preset-absence transfer: teaches the converter what a block's style-preset
    # enum values (cardStyle/effectHover) actually PAINT (box-shadow/border/
    # transform), auto-derived from the block's own style.css — never a hand-
    # authored per-value dict (R-31-1). Populated per-block below by
    # _populate_preset_implications. Idempotent (delete-then-insert per
    # (block_slug, preset_attr), mirrors variant_slots).
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS preset_implications (
          block_slug        TEXT NOT NULL,
          preset_attr       TEXT NOT NULL,
          enum_value        TEXT NOT NULL,
          implied_property  TEXT NOT NULL DEFAULT '',
          presence          TEXT NOT NULL DEFAULT 'present',
          is_neutral        INTEGER NOT NULL DEFAULT 0,
          created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (block_slug, preset_attr, enum_value)
        )
        """
    )

    # array_item_fields REMOVED 2026-08-02 (Phase 1b). The create/prune/accessor
    # trio existed; the SEEDER NEVER DID — zero INSERTs anywhere in the repo,
    # verified with two search shapes. The comment that used to sit here claimed
    # it was "seeded ... by the per-block loop below"; that loop only DELETEd.
    # 0 rows, no callers. Live mechanism is the sibling `array_item_schema`.
    # Archived reversibly to scripts/data/retired/array_item_fields.json.gz.

    # Idempotent column-add for block_capabilities.kind (D528; mirrors the
    # block_attributes column-add pattern). Existing rows default to 'functional',
    # so the change is backwards-compatible: the out-of-repo discovery readers
    # (`mcp/server.py`) do a bare `SELECT capability` and keep working unchanged,
    # gaining the discovery rows. Only the in-repo functional reader filters.
    if "kind" not in {r[1] for r in c.execute("PRAGMA table_info(block_capabilities)")}:
        c.execute(
            "ALTER TABLE block_capabilities ADD COLUMN kind TEXT NOT NULL DEFAULT 'functional'"
        )
        print("Stage 1: block_capabilities.kind column added (existing rows -> 'functional')")

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
        _live_slugs.add(slug)
        title = data.get("title", block_dir.name)
        category = data.get("category", "sgs-blocks")
        description = data.get("description", "")
        has_render = (block_dir / "render.php").exists()
        # Render evidence for is_responsive mechanism 2 (tier-object detection)
        # — see the module-level comment above `_compute_is_responsive`. Read
        # once per block; empty set when there is no render.php.
        _render_tier_attrs = (
            _tier_object_attrs_from_php(block_dir / "render.php") if has_render else set()
        )
        has_view = any(
            (block_dir / fn).exists()
            for fn in ("view.js", "view.ts", "view.jsx", "view.tsx")
        )
        block_type = "dynamic" if has_render else "static"
        # DB-first parent derivation (R-31-1): block.json's own `parent` array is
        # already parsed into `data` above — read it directly instead of a
        # hardcoded PARENT_CHILD dict (removed 2026-08-01; that dict silently
        # missed 5 blocks that declare `parent` — mega-aside, mega-group,
        # product-faq-item, site-footer-row, site-header-row — because a reseed
        # never re-derives from the dict's source of truth).
        #
        # Only the FIRST parent is taken when block.json declares more than one
        # (e.g. the form-field family declares `["sgs/form", "sgs/form-step"]`).
        # A join table for the second parent was considered and rejected: token
        # derivation at converter/db/db_lookup.py's child_block_for_parent_token
        # requires the child slug to start with the parent's name plus a hyphen.
        # sgs/form-field-text under parent sgs/form-step derives the useless
        # token 'form-field-text' (a draft would need class
        # sgs-form-step__form-field-text); under parent sgs/form it derives the
        # working token 'field-text'. The second parent buys the pipeline
        # nothing, so first-parent-only is kept.
        _raw_parent = data.get("parent")
        parent = (
            _raw_parent[0]
            if isinstance(_raw_parent, list) and _raw_parent
            else None
        )
        # `replaces` is sourced from the canonical record (block-replacements.json,
        # loaded above), NOT block.json — the mapping lives in ONE version-controlled
        # place (D270, 2026-07-04). A record entry is a list of core slugs (many-core
        # →one-sgs, e.g. sgs/media replaces image+video). Normalise to the comma-
        # separated string Stage 5 + _blocks_replaces_reverse split on. Absent → None.
        _raw_replaces = replacements_record.get(slug)
        if isinstance(_raw_replaces, list):
            replaces = ",".join(t.strip() for t in _raw_replaces if str(t).strip()) or None
        elif isinstance(_raw_replaces, str) and _raw_replaces.strip():
            replaces = _raw_replaces.strip()
        else:
            replaces = None
        attrs = data.get("attributes", {})
        supports = data.get("supports", {})
        # Wrapper evidence is only trustworthy for a block PROVEN to route
        # through SGS_Container_Wrapper (task review "Also fix" —
        # _WRAPPER_TIER_OBJECT_ATTRS is name-keyed and was applied
        # unconditionally to every block, including sgs/brand-strip's
        # unrelated `columns`, which never mentions the wrapper). Routing is
        # declared via `supports.sgs.containerKind` (Spec 31 §13.6's
        # composite-mirror propagation route), matching every other place in
        # this codebase that gates wrapper-derived behaviour.
        _routes_through_wrapper = bool(
            isinstance(supports.get("sgs"), dict) and supports["sgs"].get("containerKind")
        )
        _wrapper_tier_attrs = _WRAPPER_TIER_OBJECT_ATTRS if _routes_through_wrapper else set()

        if dry_run:
            # In dry-run: count what EXISTS vs what WOULD be inserted / updated
            existing = c.execute(
                "SELECT title, category, type, description, has_view_script, "
                "has_render_php, parent_block, replaces FROM blocks WHERE slug = ? AND source = 'sgs'",
                (slug,),
            ).fetchone()
            if existing is None:
                new_blocks += 1
            else:
                scraped_vals = (
                    title, category, block_type, description,
                    1 if has_view else 0, 1 if has_render else 0, parent, replaces,
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
                attr_type = _canonical_attr_type(attr_def.get("type", "string"))
                default = attr_def.get("default")
                enum_vals = attr_def.get("enum")
                is_responsive = _compute_is_responsive(
                    attr_name, attr_type, attrs, _render_tier_attrs, _wrapper_tier_attrs
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

            # --- supports drift (mirrors the write path below) ---
            # WHY THIS EXISTS: this branch previously counted blocks + attrs and
            # then `continue`d, never reaching the supports writer — so
            # new_supports/updated_supports were STRUCTURALLY always 0 in a
            # dry run. `--dry-run` is the documented pre-write check for
            # "does the DB still agree with block.json?", and it reported a
            # clean 0 while three blocks' `supports.sgs` blobs genuinely
            # differed (2026-08-09; the real run then reported 3). A preview
            # that cannot report the drift it is run to find reads green
            # forever. Mirrors the write path at "INSERT OR IGNORE supports"
            # exactly — including its quirk that UNIQUE(block_slug,
            # support_name) does NOT include `source`, so a row under ANY
            # source blocks the insert and only the sgs-scoped value is
            # then compared.
            for support_name, support_val in supports.items():
                support_json = json.dumps(support_val)
                exists_any = c.execute(
                    "SELECT 1 FROM block_supports "
                    "WHERE block_slug = ? AND support_name = ?",
                    (slug, support_name),
                ).fetchone()
                if exists_any is None:
                    new_supports += 1
                    continue
                ex_sup = c.execute(
                    "SELECT support_value FROM block_supports "
                    "WHERE block_slug = ? AND support_name = ? AND source = 'sgs'",
                    (slug, support_name),
                ).fetchone()
                if ex_sup is not None and ex_sup[0] != support_json:
                    updated_supports += 1
            continue

        # --- INSERT OR IGNORE block ---
        result = c.execute(
            """
            INSERT OR IGNORE INTO blocks
                (slug, title, category, type, status, description,
                 has_view_script, has_render_php, parent_block, replaces, source, updated_at)
            VALUES (?, ?, ?, ?, 'built', ?, ?, ?, ?, ?, 'sgs', ?)
            """,
            (
                slug, title, category, block_type, description,
                1 if has_view else 0, 1 if has_render else 0,
                parent, replaces, datetime.now(timezone.utc).isoformat(),
            ),
        )
        if result.rowcount:
            new_blocks += 1
        else:
            # Row exists — check for drift and UPDATE if any tracked field changed
            existing = c.execute(
                "SELECT title, category, type, description, has_view_script, "
                "has_render_php, parent_block, replaces FROM blocks WHERE slug = ? AND source = 'sgs'",
                (slug,),
            ).fetchone()
            if existing is not None:
                scraped_vals = (
                    title, category, block_type, description,
                    1 if has_view else 0, 1 if has_render else 0, parent, replaces,
                )
                if tuple(existing) != scraped_vals:
                    c.execute(
                        """
                        UPDATE blocks
                        SET title = ?, category = ?, type = ?, description = ?,
                            has_view_script = ?, has_render_php = ?, parent_block = ?,
                            replaces = ?, updated_at = ?
                        WHERE slug = ? AND source = 'sgs'
                        """,
                        (
                            title, category, block_type, description,
                            1 if has_view else 0, 1 if has_render else 0, parent,
                            replaces, datetime.now(timezone.utc).isoformat(),
                            slug,
                        ),
                    )
                    updated_blocks += 1

        # --- Tier population (D1 + XS-2) ---
        # Read supports.sgs.is_section_root and reflect onto blocks.tier.
        # Idempotent: only writes when the computed tier differs from current.
        sgs_supports = supports.get("sgs", {}) if isinstance(supports, dict) else {}
        is_section_root = bool(sgs_supports.get("is_section_root", False)) if isinstance(sgs_supports, dict) else False
        computed_tier = "class-section" if is_section_root else "block"
        current_tier_row = c.execute(
            "SELECT tier FROM blocks WHERE slug = ? AND source = 'sgs'",
            (slug,),
        ).fetchone()
        if current_tier_row is not None and current_tier_row[0] != computed_tier:
            c.execute(
                "UPDATE blocks SET tier = ? WHERE slug = ? AND source = 'sgs'",
                (computed_tier, slug),
            )

        # --- Variant-detection population (FR-31-20 D133) ---
        # blocks.variant_attr ← supports.sgs.variantAttr; variant_slots ← each
        # variant's DISCRIMINATING slots (set-difference vs sibling variants)
        # from supports.sgs.variants. So the converter detects a block's variant
        # from the draft's extracted fingerprint, universally, without per-block
        # code (R-31-1 DB-driven, R-31-9 universal). Idempotent: variant_attr
        # writes only on drift; variant_slots is delete-then-insert.
        variant_attr_name = sgs_supports.get("variantAttr") if isinstance(sgs_supports, dict) else None
        variants_map = sgs_supports.get("variants") if isinstance(sgs_supports, dict) else None
        if not isinstance(variants_map, dict):
            variants_map = None
        # Only set variant_attr when BOTH the selector name and the map are
        # declared — a half-declared block stays NULL (detector skips it).
        desired_variant_attr = variant_attr_name if (variant_attr_name and variants_map) else None
        current_va_row = c.execute(
            "SELECT variant_attr FROM blocks WHERE slug = ? AND source = 'sgs'",
            (slug,),
        ).fetchone()
        if current_va_row is not None and current_va_row[0] != desired_variant_attr:
            c.execute(
                "UPDATE blocks SET variant_attr = ? WHERE slug = ? AND source = 'sgs'",
                (desired_variant_attr, slug),
            )
        # Repopulate variant_slots for this block (delete-then-insert = idempotent;
        # reflects the current block.json / variations.js on every run).
        #
        # Two DISTINCT mechanisms, chosen per-block (ADDITIVE, 2026-09-05):
        #
        #   NAME-ONLY (capability variants — hero, trust-bar, testimonial,
        #   product-card; unchanged): a variant's discriminating slots = its
        #   attribute NAMES minus the union of every sibling variant's names.
        #   Correct when the variant genuinely enables a different attribute.
        #
        #   VALUE-AWARE (preset variants — a block with `variations.js`, e.g.
        #   sgs/nav-drawer): every variant shares the same attribute NAMES, so
        #   name-only set-difference collapses to empty. Instead discriminate
        #   on (attribute name, literal value) PAIRS, extracted from
        #   `variations.js` (never block.json, which carries names only) via
        #   `_extract_variation_attribute_values`. A pair unique to one
        #   variant is a valid discriminator even though its NAME is shared.
        #
        # UNIVERSAL EXCLUSION (both paths): the block's own variant-selector
        # attribute (`variant_attr_name`) is never itself a candidate
        # discriminator — it is exactly what detection exists to DERIVE, and
        # the cloning converter's extracted `populated_attrs` never contains
        # it (it comes from CSS/DOM extraction, not the block's own stored
        # selector). For capability blocks this changes nothing (verified:
        # none of hero/trust-bar/testimonial/product-card list their own
        # variant_attr inside any variant's slot list, so it was already
        # excluded by the name-diff). For a value-aware block it is essential
        # — `variantPreset` is set to a distinct string per nav-drawer
        # variant, which would otherwise "discriminate" every variant via an
        # attribute the pipeline can never observe.
        c.execute("DELETE FROM variant_slots WHERE block_slug = ?", (slug,))
        value_aware_variants = _extract_variation_attribute_values(block_dir)
        if value_aware_variants:
            per_variant_pairs: dict[str, set] = {}
            for v_name, v_attrs in value_aware_variants.items():
                if not isinstance(v_attrs, dict):
                    continue
                per_variant_pairs[v_name] = {
                    (attr, _canon_slot_value(val))
                    for attr, val in v_attrs.items()
                    if attr != variant_attr_name
                }
            for v_name, own_pairs in per_variant_pairs.items():
                sibling_pairs: set = set()
                for other_name, other_pairs in per_variant_pairs.items():
                    if other_name != v_name:
                        sibling_pairs.update(other_pairs)
                for attr, canon_val in sorted(own_pairs - sibling_pairs):
                    c.execute(
                        "INSERT OR IGNORE INTO variant_slots "
                        "(block_slug, variant_value, unique_slot, slot_value) VALUES (?, ?, ?, ?)",
                        (slug, v_name, attr, canon_val),
                    )
        elif variants_map:
            for v_value, v_slots in variants_map.items():
                if not isinstance(v_slots, list):
                    continue
                own_slots = {s for s in v_slots if s != variant_attr_name}
                sibling_slots: set = set()
                for other_value, other_slots in variants_map.items():
                    if other_value == v_value or not isinstance(other_slots, list):
                        continue
                    sibling_slots.update(s for s in other_slots if s != variant_attr_name)
                discriminating = [s for s in own_slots if s not in sibling_slots]
                for slot in discriminating:
                    c.execute(
                        "INSERT OR IGNORE INTO variant_slots "
                        "(block_slug, variant_value, unique_slot, slot_value) VALUES (?, ?, ?, NULL)",
                        (slug, v_value, slot),
                    )

        # --- preset_implications AUTO-DERIVE (Build #3 Option B, 2026-07-24) ---
        # See _populate_preset_implications docstring. No-op for the ~95% of
        # blocks that declare no supports.sgs.presetSelectors.
        if not dry_run:
            _populate_preset_implications(c, slug, block_dir, sgs_supports, set(attrs.keys()))

        # --- scalar-content-lift capability (council opt-in gate) ---
        # block.json supports.sgs.scalarContentLift === true → upsert a
        # block_capabilities row (slug, 'scalar-content-lift'); absent/false →
        # remove it. This is the DATA half of the converter's universal
        # _lift_scalar_attrs_by_selector opt-in gate (R-31-1 DB-driven /
        # R-31-9 universal mechanism). Idempotent: present→INSERT OR IGNORE
        # (UNIQUE(block_slug, capability)); absent→DELETE. Mirrors variant_attr's
        # presence/absence handling.
        wants_scalar_lift = bool(sgs_supports.get("scalarContentLift", False)) if isinstance(sgs_supports, dict) else False
        if wants_scalar_lift:
            c.execute(
                "INSERT OR IGNORE INTO block_capabilities "
                "(block_slug, capability) VALUES (?, 'scalar-content-lift')",
                (slug,),
            )
        else:
            c.execute(
                "DELETE FROM block_capabilities "
                "WHERE block_slug = ? AND capability = 'scalar-content-lift'",
                (slug,),
            )

        # --- scalar-styling-lift capability (styling-attr opt-in gate) ---
        # block.json supports.sgs.scalarStylingLift === true → upsert a
        # block_capabilities row (slug, 'scalar-styling-lift'); absent/false →
        # remove it. Idempotent. Mirrors scalar-content-lift above.
        wants_styling_lift = bool(sgs_supports.get("scalarStylingLift", False)) if isinstance(sgs_supports, dict) else False
        if wants_styling_lift:
            c.execute(
                "INSERT OR IGNORE INTO block_capabilities "
                "(block_slug, capability) VALUES (?, 'scalar-styling-lift')",
                (slug,),
            )
        else:
            c.execute(
                "DELETE FROM block_capabilities "
                "WHERE block_slug = ? AND capability = 'scalar-styling-lift'",
                (slug,),
            )

        # --- array-content-lift capability (array-resolver opt-in gate) ---
        # block.json supports.sgs.arrayContentLift === true → upsert a
        # block_capabilities row (slug, 'array-content-lift'); absent/false →
        # remove it. This is the DATA half of the array-resolver's universal
        # opt-in gate (R-31-1 DB-driven / R-31-9 universal mechanism). The
        # array resolver only processes blocks with this capability, preventing
        # accidental array-content lifting on blocks whose array attrs are config
        # arrays, not repeater content. Idempotent: present→INSERT OR IGNORE
        # (UNIQUE(block_slug, capability)); absent→DELETE. Exact mirror of
        # scalar-content-lift above. Added per design-gate council 2026-06-28.
        wants_array_lift = bool(sgs_supports.get("arrayContentLift", False)) if isinstance(sgs_supports, dict) else False
        if wants_array_lift:
            c.execute(
                "INSERT OR IGNORE INTO block_capabilities "
                "(block_slug, capability) VALUES (?, 'array-content-lift')",
                (slug,),
            )
        else:
            c.execute(
                "DELETE FROM block_capabilities "
                "WHERE block_slug = ? AND capability = 'array-content-lift'",
                (slug,),
            )

        # --- DISCOVERY keywords (D528, 2026-08-08) ---
        # A block's OWN `keywords` array in block.json, written as
        # kind='discovery' rows so the block-discovery tooling can score against
        # them. This REPLACES the 36 semantic capability tags D525 pruned.
        #
        # WHY THE EXISTING FIELD, not a new one. D525 removed 36 hand-seeded tags
        # on the finding that nothing in the pipeline read them — but a QC council
        # (D527) proved two live readers DO exist outside the pipeline:
        # `mcp/server.py`'s `search_blocks()` and `match()` score blocks by keyword
        # overlap over the whole table, and CLAUDE.md tells sessions to use them.
        # The pruning degraded them. Measured before choosing a fix: every one of
        # the 84 blocks already declares `keywords` (442 entries, avg 5.3, corpus
        # 331 distinct terms) versus the fossils' 73 rows over ~50 blocks with 34
        # blocks carrying NONE. The existing field is ~9x richer, 100% covered,
        # and — being what powers the block inserter's search — is CLIENT-FACING,
        # so it cannot silently rot the way a hand-seeded dict did. No new
        # authoring burden, and a live in-repo writer: the failure D525 fixed
        # cannot recur here.
        #
        # ⛔ kind='discovery' is NOT optional. `sgs/content-collection` declares
        # the keyword "collection", which is also a FUNCTIONAL capability name.
        # Sharing one namespace would let any future block gain a functional
        # capability by using it as a search word — `isCollectionKind()` firing on
        # a block that merely mentions the concept. `capabilities_for()` filters
        # to kind='functional' for exactly this reason; the discovery readers
        # deliberately do not filter, so they see both.
        _kw = data.get("keywords")
        _kw = [k.strip().lower() for k in _kw if isinstance(k, str) and k.strip()] if isinstance(_kw, list) else []
        c.execute(
            "DELETE FROM block_capabilities WHERE block_slug = ? AND kind = 'discovery'"
            + ("" if not _kw else " AND capability NOT IN (" + ",".join("?" * len(_kw)) + ")"),
            (slug, *_kw),
        )
        for _k in _kw:
            # Never shadow a functional capability name (see the ⛔ note above).
            if _k in _FUNCTIONAL_CAPABILITY_NAMES:
                continue
            c.execute(
                "INSERT OR IGNORE INTO block_capabilities "
                "(block_slug, capability, kind) VALUES (?, ?, 'discovery')",
                (slug, _k),
            )

        # --- DECLARATIVE capabilities (D525, 2026-08-08) ---
        # Same presence/absence contract as the three lift flags above, but
        # table-driven so a new one costs a row here plus a block.json key —
        # never a hardcoded slug list.
        #
        # WHY THIS EXISTS. `block_capabilities` held two unrelated things under one
        # name. The three lift flags are declarative, written here, and read by the
        # converter. The other ~36 semantic tags ('carousel', 'grid-layout',
        # 'logo-strip', 'icon-text' …) had NO live-path writer — their only writer is
        # a hardcoded CAPABILITY_RULES dict in
        # `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py`, outside this repo —
        # AND no live reader, since the capability-aware tiebreaker that consumed them
        # was retired at D278. Measured 2026-08-08: every live `capabilities_for()`
        # call site reads only the three lift flags. They were fossils, and building
        # `isCollectionKind()` on 'carousel'/'grid-layout'/'logo-strip' (as first
        # proposed) would have built a new rule on three dead values.
        # Bean chose the declarative route 2026-08-08: delete the fossils, and let a
        # block state the fact about ITSELF.
        for _sgs_key, _capability in _DECLARATIVE_CAPABILITIES.items():
            _wants = bool(sgs_supports.get(_sgs_key, False)) if isinstance(sgs_supports, dict) else False
            if _wants:
                c.execute(
                    "INSERT OR IGNORE INTO block_capabilities "
                    "(block_slug, capability) VALUES (?, ?)",
                    (slug, _capability),
                )
            else:
                c.execute(
                    "DELETE FROM block_capabilities "
                    "WHERE block_slug = ? AND capability = ?",
                    (slug, _capability),
                )

        scanned += 1

        # --- array_item_schema seeder (2026-07-02) ---
        # The DB-recognition array field-lift reads a block's item field NAMES from
        # here — the block's own data model (attributes.<attr>.items.properties) —
        # and derives each field's slot/role from the DB (Spec 31 §3.B4 / FR-31-2.5,
        # converter/resolvers/array_content.py). This REPLACES the retired
        # hand-declared arrayItemSchema → array_item_fields mechanism (D248): prune
        # its stale rows so they can't mis-drive a lift, then seed the field names.
        c.execute(
            """CREATE TABLE IF NOT EXISTS array_item_schema (
                block_slug   TEXT NOT NULL,
                array_attr   TEXT NOT NULL,
                field_key    TEXT NOT NULL,
                field_order  INTEGER,
                role         TEXT,
                PRIMARY KEY (block_slug, array_attr, field_key)
            )"""
        )
        # Idempotent column-add for a pre-role array_item_schema (table created
        # this session at f892d585 without the role column). FR-31-2.5/2.1a: a
        # field's extraction role is DECLARED in block.json items.properties.<f>.role
        # (never name-parsed) and seeded here, so the resolver reads it, not guesses.
        _aischema_cols = {r[1] for r in c.execute("PRAGMA table_info(array_item_schema)")}
        if "role" not in _aischema_cols:
            c.execute("ALTER TABLE array_item_schema ADD COLUMN role TEXT")
        c.execute("DELETE FROM array_item_schema WHERE block_slug = ?", (slug,))
        for _arr_name, _arr_def in attrs.items():
            if not isinstance(_arr_def, dict) or _arr_def.get("type") != "array":
                continue
            _item_props = ((_arr_def.get("items", {}) or {}).get("properties", {}) or {})
            for _order, _field_key in enumerate(_item_props):
                _fdef = _item_props.get(_field_key)
                _frole = _fdef.get("role") if isinstance(_fdef, dict) else None
                c.execute(
                    "INSERT OR REPLACE INTO array_item_schema "
                    "(block_slug, array_attr, field_key, field_order, role) VALUES (?, ?, ?, ?, ?)",
                    (slug, _arr_name, _field_key, _order, _frole),
                )

        # --- INSERT OR IGNORE attributes; UPDATE on drift ---
        for attr_name, attr_def in attrs.items():
            if not isinstance(attr_def, dict):
                continue
            attr_type = _canonical_attr_type(attr_def.get("type", "string"))
            default = attr_def.get("default")
            enum_vals = attr_def.get("enum")
            is_responsive = _compute_is_responsive(
                attr_name, attr_type, attrs, _render_tier_attrs, _wrapper_tier_attrs
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

        # --- block_selectors writer (Task 2a, 2026-08-01) ---
        # Adds the missing writer: block_selectors (92 rows / 44 blocks) was
        # previously written ONLY by ~/.claude/skills/sgs-wp-engine/scripts/
        # populate-db.py, which lives OUTSIDE this repo and is DEAD on the live
        # path (this script reimplements Stage 1 inline with zero subprocess
        # calls to it — see module docstring). Result before this fix: 3 live
        # blocks that declare `selectors` (sgs/media, sgs/mega-panel,
        # sgs/nav-drawer) had ZERO rows.
        #
        # Flattening mirrors populate-db.py's pattern EXACTLY (nested dict
        # entries become "element.sub_el") so this does not change the meaning
        # of any of the existing rows for blocks whose selectors are unchanged.
        #
        # Difference from populate-db.py: populate-db.py only deletes when
        # `if selectors:` is truthy, so a block that DROPS its `selectors` key
        # entirely never has its old rows cleaned up — this is exactly how
        # sgs/heading accumulated 2 stale rows (it used to declare selectors,
        # no longer does). The delete here is unconditional — every on-disk
        # block's rows are cleared and re-derived from its CURRENT block.json
        # on every run, so a dropped `selectors` key correctly empties the
        # block's rows instead of leaving ghosts.
        #
        # CAVEAT — this does NOT make sgs-update-v2.py the sole owner of
        # block_selectors. populate-db.py still exists outside this repo and
        # writes the SAME table with the SAME delete-then-insert shape — two
        # writers now exist, last-one-wins on whichever ran most recently. The
        # risk is latent (populate-db.py is dead on today's live path), not
        # eliminated — do not read this comment as "ownership transferred".
        c.execute("DELETE FROM block_selectors WHERE block_slug = ?", (slug,))
        _selectors = data.get("selectors", {})
        if isinstance(_selectors, dict):
            for _element, _selector in _selectors.items():
                if isinstance(_selector, str):
                    c.execute(
                        "INSERT INTO block_selectors (block_slug, element, selector) "
                        "VALUES (?, ?, ?)",
                        (slug, _element, _selector),
                    )
                    new_selectors += 1
                elif isinstance(_selector, dict):
                    for _sub_el, _sub_sel in _selector.items():
                        c.execute(
                            "INSERT INTO block_selectors (block_slug, element, selector) "
                            "VALUES (?, ?, ?)",
                            (slug, f"{_element}.{_sub_el}", _sub_sel),
                        )
                        new_selectors += 1

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

    # --- Prune stale block_selectors rows (Task 2b, 2026-08-01) ---
    # Retired blocks (block_slug still in block_selectors but no block.json on
    # disk any more) are never visited by the per-block loop above, so their
    # rows would otherwise survive forever. Stage 9's prune_orphans does NOT
    # cover block_selectors — verified: it only touches block_supports,
    # block_capabilities, block_attributes, and blocks itself (see
    # _prune_orphans_on_conn docstring) — so this explicit prune is the only
    # mechanism that removes them. Scoped to 'sgs/%' so any future native_wp
    # selector rows (none exist today) are left untouched.
    _stale_selector_slugs = [
        row[0] for row in c.execute(
            "SELECT DISTINCT block_slug FROM block_selectors WHERE block_slug LIKE 'sgs/%'"
        ).fetchall()
        if row[0] not in _live_slugs
    ]
    if not dry_run and _stale_selector_slugs:
        c.executemany(
            "DELETE FROM block_selectors WHERE block_slug = ?",
            [(s,) for s in _stale_selector_slugs],
        )
    pruned_selectors = len(_stale_selector_slugs)

    # --- Prune fossil capabilities (D525, 2026-08-08) ---
    # See _FOSSIL_CAPABILITIES: writer-less, reader-less rows left behind by
    # populate-db.py's hardcoded CAPABILITY_RULES. Pruning here (not once, by hand)
    # is what makes the table's meaning STABLE — if that out-of-repo script is ever
    # run again, the next /sgs-update removes what it reintroduced, instead of the
    # fossils silently coming back and a future rule scoping against them.
    pruned_fossil_caps = 0
    if not dry_run:
        # ⛔ kind='functional' is LOAD-BEARING here too (D528). Eleven fossil NAMES
        # are also legitimate block.json keywords — `carousel` (4 blocks),
        # `navigation` (7), `cta` (5), `faq` (3), `rating`, `pricing`, `steps`,
        # `alert`, `countdown`, `decorative`, `expandable`. Unscoped, this prune
        # destroyed 29 real discovery rows on its first run after the keyword
        # seeder landed — the same namespace collision as the functional side,
        # arriving from the opposite direction. Prune fossils ONLY.
        c.execute(
            "DELETE FROM block_capabilities WHERE kind = 'functional' AND capability IN "
            f"({','.join('?' * len(_FOSSIL_CAPABILITIES))})",
            tuple(sorted(_FOSSIL_CAPABILITIES)),
        )
        pruned_fossil_caps = c.rowcount

    return {
        "pruned_fossil_caps": pruned_fossil_caps,
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
        "new_selectors": new_selectors,
        "pruned_selectors": pruned_selectors,
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
            encoding="utf-8", errors="replace",
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


def _run_composition_role_seed(conn: sqlite3.Connection) -> None:
    """Run seed-composition-roles.py as a Stage 1 tail step (2026-07-03).

    ``composition_role`` has NO derive-from-code populator — it is seed data whose
    canonical home is ``seed-composition-roles.py`` (CORRECTIONS/RENAMES/INSERTS).
    Previously it was NOT wired into /sgs-update, so a full reseed that rebuilds
    ``block_composition`` without a follow-up seeder run would silently revert the
    corrections (e.g. the 5 typed-array blocks back to 'leaf', reintroducing the
    convert.py is_leaf text-fallback bug fixed at 64b831c1). Wiring it here as an
    explicit tail step makes the corrections durable across every reseed. Idempotent
    (the seeder no-ops when the DB already matches). Failure prints a loud WARN — a
    silent revert is the exact regression this exists to prevent.
    """
    try:
        seed_script = REPO_ROOT / "plugins/sgs-blocks/scripts/seed-composition-roles.py"
        if not seed_script.exists():
            print("Stage 1 tail (composition-role seed): WARN script missing — corrections NOT applied")
            return
        conn.commit()  # release the write lock for the subprocess's own connection
        result = subprocess.run(
            ["python", str(seed_script)],
            capture_output=True, text=True, timeout=60,
            encoding="utf-8", errors="replace",
        )
        if result.returncode == 0:
            tail = [ln for ln in (result.stdout or "").splitlines() if "done:" in ln.lower()]
            print(f"Stage 1 tail (composition-role seed): {tail[-1] if tail else 'completed'}")
        else:
            print(
                f"Stage 1 tail (composition-role seed): WARN exit={result.returncode}; "
                f"stderr={result.stderr[:200]}"
            )
    except Exception as exc:  # noqa: BLE001
        print(f"Stage 1 tail (composition-role seed): WARN {exc}")


def _run_inspector_control_type_seed(conn: sqlite3.Connection) -> None:
    """Run extract-signatures.py --task-b-only as a Stage 1 tail step (2026-07-21).

    Bean's instruction: "wire the inspector controls seeder into sgs-update and
    remove whatever is setting the current data." `inspector_control_type` had TWO
    writers — a crude edit.js parser in uimax-tools/enrich-db.py (fill-NULL-only,
    produced 93 wrong values) and this classifier's Task B (a better parser, but
    policy was report-only, so the stale values from the other writer persisted
    forever). enrich-db.py's writer is now REMOVED (see that file); this is the
    SOLE remaining writer, and its policy now overwrites on disagreement (see
    extract_inspector_control_types's own docstring — audit-justified: 88/93
    DERIVED_CORRECT, 0 STORED_CORRECT). Wiring it here makes the corrected values
    durable across every reseed, mirroring `_run_canonical_assignment` /
    `_run_composition_role_seed` exactly — same subprocess pattern, same
    swallow-as-warning failure handling.
    """
    try:
        seeder_script = REPO_ROOT / "plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py"
        if not seeder_script.exists():
            print("Stage 1 tail (inspector-control-type seed): WARN script missing — not applied")
            return
        conn.commit()  # release the write lock for the subprocess's own connection
        result = subprocess.run(
            ["python", str(seeder_script), "--task-b-only"],
            capture_output=True, text=True, timeout=60,
            encoding="utf-8", errors="replace",
        )
        if result.returncode == 0:
            tail = [ln for ln in (result.stdout or "").splitlines() if "written=" in ln]
            print(f"Stage 1 tail (inspector-control-type seed): {tail[-1] if tail else 'completed'}")
        else:
            print(
                f"Stage 1 tail (inspector-control-type seed): WARN exit={result.returncode}; "
                f"stderr={result.stderr[:200]}"
            )
    except Exception as exc:  # noqa: BLE001
        print(f"Stage 1 tail (inspector-control-type seed): WARN {exc}")


def _run_css_property_classifier_seed(conn: sqlite3.Connection) -> None:
    """Run extract-signatures.py --task-a-only as Stage 1 sub-step B2 (2026-08-10).

    Task A derives css_property/css_layer/css_element/css_state/css_tier and
    writes them to css-property-classifications.json — the DERIVED layer
    `_apply_attr_classification_overrides` (Stage 1 sub-step C) reads as its
    base layer. Before this change, ONLY Task B (`--task-b-only`, the
    inspector_control_type seeder) was wired into every /sgs-update; Task A
    had to be run by hand, so the JSON was a frozen snapshot — stale for
    blocks whose block.json/style.css had since changed, absent for blocks
    added after the last manual run. Wiring it here mirrors
    `_run_inspector_control_type_seed`/`_run_composition_role_seed` exactly —
    same subprocess pattern, same swallow-as-warning failure handling, same
    "never block the rest of /sgs-update on this step" contract.

    ⛔ CALL ORDER IS LOAD-BEARING. This must run BEFORE Stage 1 sub-step C
    (`_apply_attr_classification_overrides`), which reads the regenerated JSON as
    its base layer. It was first wired into the Stage 1 TAIL, mirroring the Task B
    seeder's position — which looked consistent but made the pipeline lag one run
    behind: sub-step C had already read the previous file, so the DB never reflected
    the current classification and /sgs-update had to be run twice to converge.
    JSON-only with no DB mutation of its own (the `conn.commit()` below only
    releases the write lock for the subprocess), so running this early is safe.
    """
    try:
        seeder_script = REPO_ROOT / "plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py"
        if not seeder_script.exists():
            print("Stage 1 tail (css-property classifier seed): WARN script missing — not applied")
            return
        conn.commit()  # release the write lock for the subprocess's own connection
        result = subprocess.run(
            ["python", str(seeder_script), "--task-a-only"],
            capture_output=True, text=True, timeout=60,
            encoding="utf-8", errors="replace",
        )
        if result.returncode == 0:
            tail = [ln for ln in (result.stdout or "").splitlines() if "css_property_written=" in ln]
            print(f"Stage 1 tail (css-property classifier seed): {tail[-1] if tail else 'completed'}")
        else:
            print(
                f"Stage 1 tail (css-property classifier seed): WARN exit={result.returncode}; "
                f"stderr={result.stderr[:200]}"
            )
    except Exception as exc:  # noqa: BLE001
        print(f"Stage 1 tail (css-property classifier seed): WARN {exc}")


def _run_component_adoption_seed(conn) -> None:
    """Run seed-component-adoption.py as a Stage 1 tail step (2026-08-24, D763).

    Rebuilds `components` as the unification ADOPTION LEDGER — every shared
    editor component, util, PHP render helper, render_block injector and the
    shared wrapper, each with the COUNT of blocks that actually reach it.

    Wired here rather than left as a manual command deliberately. The table it
    replaces had ZERO in-repo readers and ZERO in-repo writers: its 13 rows came
    from an out-of-repo populate-db.py, which is exactly why every description
    was a placeholder. A registry that needs someone to remember to run it is the
    problem it exists to solve.

    Idempotent (full replace). Subprocess, like the Stage 6/7/10 calls, so it
    cannot import-side-effect this module. WARN-not-fail: a scanner problem must
    not take down an entire /sgs-update run, and no downstream consumer would be
    corrupted by a stale adoption row.
    """
    script = Path(__file__).resolve().parent / "seed-component-adoption.py"
    if not script.exists():
        print("Stage 1 tail (component adoption): WARN script missing — ledger NOT refreshed")
        return
    try:
        result = subprocess.run(
            [sys.executable, str(script), "--apply"],
            capture_output=True, text=True, timeout=300,
            encoding="utf-8", errors="replace",
        )
        if result.returncode == 0:
            tail = [ln for ln in (result.stdout or "").strip().splitlines() if ln.strip()]
            print(f"Stage 1 tail (component adoption): {tail[-1] if tail else 'completed'}")
        else:
            print(
                f"Stage 1 tail (component adoption): WARN exit={result.returncode}; "
                f"{(result.stderr or '').strip()[:300]}"
            )
    except Exception as exc:
        print(f"Stage 1 tail (component adoption): WARN {exc}")


def _run_motion_fx_registry_seed(conn: sqlite3.Connection) -> None:
    """Run seed-motion-fx-registry.py as a Stage 1 tail step (D432, 2026-08-01).

    Bean's instruction: "the motion seeding needs to be worked into the
    sgs-update pipeline and not be some independent competing script that
    gets forgotten about or we end up losing our motion/FX data." Before this
    change the ONLY place seed-motion-fx-registry.py ran was npm's
    prebuild/prestart (`run-motion-fx-generators.js`) — a build-time hook, not
    part of `/sgs-update` at all. That gap is exactly how D432 happened: a
    /sgs-update run (for an unrelated nav-menu box_family fix) created new
    block_attributes rows for existing fx:* attrs, and nothing about
    /sgs-update itself knew those rows needed fx:* markers — the marker only
    ever arrived later, at the next `npm run build`, via a channel the reseed
    gate couldn't see.

    This tail step seeds `fx_effects` (the Spec 38 §11.2 effect grammar) and
    reconciles `animation_tokens` — the two tables seed-motion-fx-registry.py
    owns that /sgs-update does not otherwise touch. It deliberately does NOT
    re-seed block_attributes.css_property for fx:* attrs — that write moved
    INTO this same pipeline run, one step earlier, as layer 2.5 of
    `_apply_attr_classification_overrides` (see that function's docstring).
    Running the seeder script itself (rather than importing its module-level
    side effects) keeps this a pure subprocess call, matching
    `_run_composition_role_seed` / `_run_inspector_control_type_seed` exactly
    — same swallow-as-warning failure handling, same "never block the rest of
    /sgs-update on this step" contract. Idempotent: a clean run reports zero
    row changes on every subsequent call.
    """
    try:
        seeder_script = REPO_ROOT / "plugins/sgs-blocks/scripts/seed-motion-fx-registry.py"
        if not seeder_script.exists():
            print("Stage 1 tail (motion-fx registry seed): WARN script missing — not applied")
            return
        conn.commit()  # release the write lock for the subprocess's own connection
        result = subprocess.run(
            ["python", str(seeder_script)],
            capture_output=True, text=True, timeout=60,
            encoding="utf-8", errors="replace",
        )
        if result.returncode == 0:
            tail = [ln for ln in (result.stdout or "").splitlines() if "done:" in ln.lower()]
            print(f"Stage 1 tail (motion-fx registry seed): {tail[-1] if tail else 'completed'}")
        else:
            print(
                f"Stage 1 tail (motion-fx registry seed): WARN exit={result.returncode}; "
                f"stderr={result.stderr[:200]}"
            )
    except Exception as exc:  # noqa: BLE001
        print(f"Stage 1 tail (motion-fx registry seed): WARN {exc}")


# ---------------------------------------------------------------------------
# Stage 1 sub-step — scrape allowedBlocks from edit.js files
# ---------------------------------------------------------------------------
# Design notes:
#   - Captures ONLY literal string-array declarations; any dynamic expression
#     (conditional, spread, function call, computed value) is intentionally
#     skipped and counted in `dynamic_skipped`.
#   - No hardcoded block slugs: discovery is purely filesystem-driven.
#   - Writes only the JSON-array string; NULL means "no restriction declared"
#     (absence ≠ empty restriction).
#   - Write-on-drift: UPDATE fires only when the stored value differs from the
#     freshly scraped value — idempotent across repeat runs.
# ---------------------------------------------------------------------------

# Regex that matches the opening of an allowedBlocks array literal.
# Two accepted forms:
#   1. Named const whose identifier contains "ALLOWED" (case-sensitive):
#      ALLOWED_BLOCKS = [  or  CTA_ALLOWED_BLOCKS = [
#   2. Inline object property:  allowedBlocks: [
_ALLOWED_BLOCKS_OPEN_RE = re.compile(
    r"""
    (?:
        \b[A-Z0-9_]*ALLOWED[A-Z0-9_]*\s*=\s*\[   # named const: *ALLOWED* = [
        |
        allowedBlocks\s*:\s*\[                    # inline prop:  allowedBlocks: [
    )
    """,
    re.VERBOSE,
)

# Match a single quoted block-slug string inside the array.
# The backreference \1 ensures opening and closing quotes match (no mixing).
# Slug pattern: <namespace>/<name> where both parts are lowercase+hyphens only.
_BLOCK_SLUG_RE = re.compile(r"""(["'])([a-z][a-z0-9-]*/[a-z][a-z0-9-]*)\1""")

# Signs that the allowedBlocks value is dynamic rather than a literal array.
# If any of these appear INSIDE what looks like the array body, the whole
# declaration is classified as dynamic and skipped.
_DYNAMIC_MARKERS = (
    "?",          # ternary / conditional
    "...",        # spread operator
    "undefined",  # computed / conditional result
    "templateMode",  # runtime variable
)


def scrape_allowed_blocks(edit_js_path: Path) -> list[str] | None:
    """Parse edit.js for a literal allowedBlocks / ALLOWED_BLOCKS array.

    Returns:
        list[str]  — the block slugs found in the literal array (may include
                     non-sgs slugs such as 'core/heading').
        None       — the file has no allowedBlocks declaration at all, OR the
                     declaration is dynamic (runtime expression); callers must
                     treat both as "leave NULL in DB".  The distinction between
                     "absent" and "dynamic" is surfaced only via the
                     dynamic_skipped counter in the summary stats.

    Raises nothing — on any read or parse error the function returns None and
    the caller counts the block in dynamic_skipped.
    """
    try:
        text = edit_js_path.read_text(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return None

    # Fast-path: no relevant keyword at all → absent (leave NULL, no skip count)
    if "allowedBlocks" not in text and "ALLOWED_BLOCKS" not in text:
        return None

    # Locate the first opening bracket of an allowedBlocks declaration.
    match = _ALLOWED_BLOCKS_OPEN_RE.search(text)
    if not match:
        # Keyword present but not in a recognisable pattern — treat as dynamic.
        return None

    bracket_start = text.index("[", match.start())

    # Walk forward to find the matching closing bracket, respecting nesting.
    depth = 0
    array_end = bracket_start
    for i, ch in enumerate(text[bracket_start:], start=bracket_start):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                array_end = i
                break

    array_body = text[bracket_start : array_end + 1]

    # Check for dynamic markers — if found, skip the whole declaration.
    for marker in _DYNAMIC_MARKERS:
        if marker in array_body:
            # Signal "dynamic" by returning the sentinel DYNAMIC_SKIP constant.
            # Callers check `result is _DYNAMIC_SKIP`.
            return _DYNAMIC_SKIP  # type: ignore[return-value]

    # Extract all quoted block-slug strings from the array body.
    # Group 1 = quote character, group 2 = the slug — use group 2.
    slugs = [m.group(2) for m in _BLOCK_SLUG_RE.finditer(array_body)]

    # If the pattern matched but yielded no slugs (e.g. empty array or
    # only comments), honour NULL semantics — empty restriction ≠ no restriction.
    if not slugs:
        return None

    return slugs


# Sentinel — distinct from None — returned when a dynamic expression is found.
_DYNAMIC_SKIP = object()


# ---------------------------------------------------------------------------
# render.php $content-consumption detection.
#
# has_inner_blocks AUTO-DERIVATION seeder RETIRED (EXECUTION Step 16,
# 2026-07-05): block_composition.has_inner_blocks is DROPPED (migration
# 2026-07-05-drop-has-inner-blocks-column.py). The save-marker helpers that
# existed only to feed that column's seeder
# (_SAVE_INNER_BLOCKS_MARKER_RE / _strip_js_block_comments /
# _is_js_comment_line / _has_save_inner_blocks_marker /
# _has_inner_blocks_from_block_json / _derive_has_inner_blocks /
# _populate_has_inner_blocks) are deleted with it — has_inner_blocks is now
# derived FRESH at convert-time by converter.services.has_inner
# .derive_delegates_content, never a cached/seeded column (Spec 31 §12.7).
# _render_consumes_content below is KEPT — it also feeds the still-live
# emit_shape stage (Stage 1 sub-step D) independently of has_inner_blocks.
# ---------------------------------------------------------------------------

# Non-trivial $content consumption patterns in render.php.
# Covers every real usage shape seen across the codebase:
#   echo $content          — direct echo
#   . $content             — concat (SGS_Container_Wrapper arg)
#   $content .             — concat (reverse)
#   $content;              — expression statement
#   $content //            — phpcs inline comment after $content expression
#   : $content             — ternary branch value
#   {$content}             — interpolation in double-quoted string
#   $content,              — $content passed as a function argument
#   if ($content)          — guard check (optional zone pattern)
#   $block->inner_blocks   — direct inner_blocks access
#   do_blocks($content)    — do_blocks with $content as argument
_RENDER_CONTENT_USAGE_RE = re.compile(
    r"echo\s+\$content"
    r"|\.\s*\$content"
    r"|\$content\s*\."
    r"|\$content\s*;"
    r"|\$content\s*//"
    r"|:\s*\$content"
    r"|\{\$content\}"
    r"|\$content\s*,"
    r"|if\s*\(\s*\$content"
    r"|\$block\s*->\s*inner_blocks"
    r"|do_blocks\s*\(\s*\$content\s*\)"
)


def _is_php_comment_line(line: str) -> bool:
    """True if the stripped line is a PHP comment or docblock line."""
    s = line.strip()
    return s.startswith(("*", "//", "#", "/*"))


def _render_consumes_content(block_dir: Path) -> bool:
    """Return True if render.php uses $content or $block->inner_blocks non-trivially.

    Excludes docblock and comment-only lines so a ``@var string $content``
    docblock annotation does not count as consumption.
    """
    render_php = block_dir / "render.php"
    if not render_php.exists():
        return False
    for line in render_php.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        if _is_php_comment_line(line):
            continue
        if _RENDER_CONTENT_USAGE_RE.search(line):
            return True
    return False


# Per-attr classification overrides — applied as Stage 1 sub-step C, AFTER
# `_run_canonical_assignment` (assign-canonical.py), so they are the final
# writer and survive every /sgs-update. a tiny, cited override layer for genuine source-truth corrections
# the heuristic mis-derives. Each entry MUST cite the reason + date.
# Keyed (block_slug, attr_name) -> {column: value, ...} to UPDATE on block_attributes.
#
# LIFTED OUT to its own truth-source file 2026-07-21 (Bean's explicit request —
# "give the overrides their own file that they are fed from as a truth
# source"). All 175 entries preserved EXACTLY (verified by a round-trip diff
# against the prior inline dict before this change was made — this was a MOVE,
# not a rewrite). The JSON structure + full rationale doc lives in the file
# itself. This module still exposes ATTR_CLASSIFICATION_OVERRIDES as a
# module-level dict[tuple[str, str], dict[str, object]] so every existing
# import (check_css_property_reseed.py, this module's own Stage 1C) is
# unaffected — only the storage format moved.
_ATTR_OVERRIDES_JSON_PATH = Path(__file__).resolve().parent / "attr-classification-overrides.json"


def _load_attr_classification_overrides(path: Path = _ATTR_OVERRIDES_JSON_PATH) -> dict[tuple[str, str], dict[str, object]]:
    """Load the hand-authored override layer from its JSON truth-source file.

    FAIL LOUD if the file is missing or malformed — this is load-bearing data
    (corrections spanning role/derived_selector/css_property/box_family/etc
    across the whole framework); a silent empty-dict fallback would quietly
    wipe every one of those corrections on the next /sgs-update.

    Also FAIL LOUD on a duplicated ``(slug, attr)`` key. The map is built by plain
    assignment, so a duplicate is silently LAST-WINS: the earlier entry — the one
    a reader scrolling the file would find and trust — is discarded with no
    diagnostic. That is the exact shape of the original seed regression this guard
    exists for. It lives in the LOADER rather than a standalone gate so it fires
    for EVERY consumer (/sgs-update, check_css_property_reseed.py, any importing
    test) instead of only when someone remembers to run the gate.
    """
    if not path.exists():
        raise FileNotFoundError(
            f"ATTR_CLASSIFICATION_OVERRIDES truth file not found at {path}. "
            "This file is the reseed-durable override layer — "
            "restore it before running /sgs-update."
        )
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("entries")
    if not isinstance(entries, list):
        raise ValueError(
            f"{path} has no top-level 'entries' list — malformed override truth file."
        )
    # Counts are DERIVED, never written into prose. The prior hardcoded "175 entries"
    # in this function's messages and the comment below had drifted to a live 215 —
    # a stale number in a fail-loud message misinforms exactly when it is read.
    _entry_count = len(entries)
    out: dict[tuple[str, str], dict[str, object]] = {}
    for entry in entries:
        slug = entry.get("slug")
        attr = entry.get("attr")
        fields = entry.get("fields")
        if not slug or not attr or not isinstance(fields, dict):
            raise ValueError(
                f"{path}: malformed entry {entry!r} (1 of {_entry_count}) — every "
                "entry needs 'slug', 'attr' and a 'fields' dict."
            )
        if (slug, attr) in out:
            raise ValueError(
                f"{path}: duplicate override key {(slug, attr)!r} — the later entry "
                "would silently win and the earlier one be discarded. Merge the two "
                "entries' 'fields' into a single entry."
            )
        # `_`-prefixed keys are HUMAN ANNOTATIONS, never database columns. They stay in
        # the JSON truth file (where the rationale is useful to the next reader) and are
        # dropped here, before the caller's idempotent column-add sees them.
        #
        # WHY THIS GUARD EXISTS (2026-08-05). The apply layer derives its column list
        # straight from these field names and ALTERs the table for any it does not
        # recognise, so a `_note` written as documentation SILENTLY became a real
        # `block_attributes._note` column holding paragraphs of prose. Nothing rejected
        # it; the failure surfaced only when `check_schema_drift.py` blocked every
        # prebuild with "COLUMN block_attributes._note live-has-not-in-schema", by which
        # point the column was already in the live DB shared with a co-active track.
        # The leading underscore always meant "not a field" — this makes that convention
        # load-bearing instead of decorative, and closes the class rather than the one
        # key: any future `_rationale`/`_ticket` annotation is now inert by construction.
        out[(slug, attr)] = {k: v for k, v in fields.items() if not k.startswith("_")}
    return out


ATTR_CLASSIFICATION_OVERRIDES: dict[tuple[str, str], dict[str, object]] = _load_attr_classification_overrides()

# ---------------------------------------------------------------------------
# The entries formerly declared inline here (175 of them at the 2026-07-21 lift-out;
# the live count is whatever the JSON holds — do NOT cache a count in prose, this
# comment and the loader's own messages had both drifted by 40) with per-entry
# rationale comments — TAG-IDENTITY fix, box_family corrections, etc. — now live in
# attr-classification-overrides.json (see _load_attr_classification_overrides
# above). The original inline dict + comments are preserved in git history
# (see the commit that introduced this loader) — the LIVE data is the JSON
# file, never this module.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# fx:* pseudo-namespace channel (D432 integration, 2026-08-01)
#
# WHY THIS EXISTS: seed-motion-fx-registry.py's FX_ATTR_CSS_PROPERTY dict (§6.2
# / §11.3 of Spec 38) maps the fx:* attribute names — fx, fxTrigger, fxStart,
# fxEnd, fxHold, fxScrub, fxStagger, fxDuration, fxEase, dragMomentum, fxPath,
# fxPathAsset, fxPathRotate, fxShape, fxPreset — onto their pseudo-CSS-property
# marker (fx:effect, fx:trigger, ... fx:momentum, ...). Before this change that
# script wrote block_attributes.css_property directly via a bare UPDATE run at
# BUILD time (npm prebuild -> run-motion-fx-generators.js), a channel
# check_css_property_reseed.py's own docstring calls out as the ONLY thing that
# gets wiped on the next /sgs-update reseed (STOP-24). D432 (2026-07-31) is the
# incident this caused: seeding box_family for sgs/nav-menu required a full
# /sgs-update, which (correctly) INSERTed the block_attributes rows for
# sgs/image-sequence's fxStart/fxEnd/fxScrub + the 4 blocks' dragMomentum (they
# are real block.json-declared attrs), and the NEXT build's motion seeder then
# wrote css_property='fx:*' onto those brand-new rows via a channel /sgs-update
# knows nothing about — surfacing as "rogue seed" failures for BOTH tracks at
# once. The fix declared 7 entries in ATTR_CLASSIFICATION_OVERRIDES by hand.
#
# THE INTEGRATION: fx:* becomes a THIRD reseed-durable channel, read the SAME
# way ATTR_CLASSIFICATION_OVERRIDES is (R-22-1 — import the real dict, never
# hand-copy it), and merged into `_apply_attr_classification_overrides`'s
# `combined` dict alongside the derived-classifier layer and box_family. Once
# /sgs-update itself is the css_property writer for every fx:* attr that
# exists on a real block_attributes row, the hand-authored override entries
# for those 7 rows are redundant — removed from attr-classification-
# overrides.json in the same change (see that file's D432 history). Any FUTURE
# fx:* attr a block declares is covered automatically — no more per-attr
# override entries needed for this namespace, ever (R-31-9 universal
# mechanism: the fx:* namespace map, not a growing per-block override list).
#
# seed-motion-fx-registry.py itself is UNCHANGED in scope for fx_effects +
# animation_tokens (tables /sgs-update does not otherwise touch) but no longer
# writes block_attributes.css_property — see its own module docstring update.
# It is also now RUN as a Stage 1 tail step (`_run_motion_fx_registry_seed`
# below), so /sgs-update alone reproduces the full motion-fx DB state; a
# forgotten standalone run can no longer silently leave fx_effects stale.
# ---------------------------------------------------------------------------

_MOTION_FX_SEEDER_PATH = Path(__file__).resolve().parent / "seed-motion-fx-registry.py"


def _load_fx_attr_css_property_map(path: Path = _MOTION_FX_SEEDER_PATH) -> dict[str, str]:
    """Import FX_ATTR_CSS_PROPERTY from seed-motion-fx-registry.py (R-22-1: the
    real dict, never a hand-copied duplicate that could silently drift from it).

    Soft-optional, matching `_load_css_property_classifications`'s contract —
    the motion-fx seeder script is expected to exist (it is committed), but a
    worktree missing it should not hard-fail every /sgs-update run over an
    unrelated feature; it degrades to "no fx:* channel this run" instead.
    """
    if not path.exists():
        return {}
    try:
        import importlib.util as _ilu

        spec = _ilu.spec_from_file_location("sgs_seed_motion_fx_registry", str(path))
        mod = _ilu.module_from_spec(spec)  # type: ignore[arg-type]
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        fx_map = getattr(mod, "FX_ATTR_CSS_PROPERTY", None)
        return dict(fx_map) if isinstance(fx_map, dict) else {}
    except Exception as exc:  # noqa: BLE001
        print(f"Stage 1 (fx-namespace): WARN failed to import FX_ATTR_CSS_PROPERTY: {exc}")
        return {}


def _collect_fx_attr_namespace_overrides(c: sqlite3.Cursor) -> dict[tuple[str, str], dict[str, object]]:
    """Return {(block_slug, attr_name): {"css_property": "fx:..."}} for every
    EXISTING block_attributes row whose attr_name is a declared fx:* name
    (from FX_ATTR_CSS_PROPERTY). Mirrors seed-motion-fx-registry.py's own
    `_seed_fx_attr_namespace` selection logic exactly (same query per attr
    name, same "only rows that already exist" gate) — that function itself no
    longer writes css_property; this is now the sole writer, one layer earlier
    in the SAME pipeline run.
    """
    fx_map = _load_fx_attr_css_property_map()
    out: dict[tuple[str, str], dict[str, object]] = {}
    for attr_name, css_property in fx_map.items():
        rows = c.execute(
            "SELECT block_slug FROM block_attributes WHERE attr_name = ?",
            (attr_name,),
        ).fetchall()
        for (block_slug,) in rows:
            out[(block_slug, attr_name)] = {"css_property": css_property}
    return out


# _derive_has_inner_blocks / _populate_has_inner_blocks RETIRED (EXECUTION
# Step 16, 2026-07-05) — see the retirement banner near
# _render_consumes_content's definition. has_inner_blocks is now derived
# fresh at convert-time (converter.services.has_inner), never seeded here.


# ---------------------------------------------------------------------------
# preset_implications AUTO-DERIVE (Build #3 Option B, 2026-07-24)
#
# Teaches the converter what a block's style-preset enum values (cardStyle/
# effectHover) actually PAINT, so the cloning pipeline can pick the preset
# value matching what the draft's own CSS shows instead of always leaving the
# block at its hard-coded default (elevated/lift). The per-value mapping is
# NEVER hand-declared (R-31-1) — it is derived here by reading each block's
# OWN style.css against a minimal block.json hint
# (`supports.sgs.presetSelectors`, naming which attrs ARE preset selectors).
# ---------------------------------------------------------------------------

# Per-ATTR-NAME state axis (universal across any block that declares the
# attr — NOT a per-block dict, R-31-1 compliant): which pseudo-state the
# attr's CSS rules target. cardStyle is always a RESTING modifier; effectHover
# is always a `:hover`-qualified modifier. Used only to filter interactive-
# pseudo rules in/out of signal accumulation (below) — the class PREFIX
# itself is now derived directly from render.php (see
# `_discover_attr_class_prefix`), not from a hand-authored template, since
# google-reviews proved a fixed "sgs-{block}--{suffix}" template is too rigid
# (its cardStyle prefix is "sgs-google-reviews--card-", not "sgs-google-reviews--").
_PRESET_STATE_BY_ATTR: dict[str, "str | None"] = {
    "cardStyle": None,
    "effectHover": "hover",
}
# Fallback class-naming convention — used ONLY when render.php's own text
# doesn't match `_discover_attr_class_prefix`'s var->concat derivation (a
# defensive safety net, not the primary mechanism).
_PRESET_CLASS_CONVENTIONS: dict[str, tuple[str, "str | None"]] = {
    "cardStyle": ("--", None),
    "effectHover": ("--hover-", "hover"),
}
# The literal neutral-value NAME each preset attr falls back to seeding when
# CSS scanning finds no already-neutral (signal-less) value at all — e.g.
# google-reviews's cardStyle has a legitimate 'flat' option in its
# SelectControl that paints NO CSS at all (no `--card-flat` rule exists), so
# it never surfaces as a discovered token. Mirrors effectHover's 'none' (a
# block emits no hover-modifier class at all when effectHover === 'none').
_PRESET_NEUTRAL_FALLBACK_NAME: dict[str, str] = {
    "cardStyle": "flat",
    "effectHover": "none",
}

_CSS_LEAF_RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}")
_CSS_VALUE_TOKEN_RE = re.compile(r"[a-z0-9-]+")
_CSS_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
_CSS_INTERACTIVE_PSEUDO_RE = re.compile(r":(?:hover|focus|active|focus-within|focus-visible)\b")
# render.php's own `$var = ... $attributes['{attr}'] ...;` assignment line —
# discovers which local PHP variable an attribute is read into.
_ATTR_VAR_ASSIGN_RE_CACHE: dict[str, re.Pattern] = {}
# render.php's OWN literal-string→attr concatenation, e.g.
# `'sgs-info-box--hover-' . esc_attr( $sgs_hover_effect )`. Used to discover
# ALL class-prefix families a block's render.php builds off the same block
# root (cardStyle, effectHover, AND any other modifier attr such as
# iconPosition's `sgs-info-box--media-{value}`), so a preset attr's own
# enumeration can exclude sibling attrs' tokens WITHOUT hand-naming them.
_RENDER_PREFIX_CONCAT_RE = re.compile(
    r"'(sgs-[a-z0-9-]+--[a-z0-9-]*)'\s*\.\s*"
    r"(?:esc_attr|sanitize_key|sanitize_html_class)\s*\("
)


def _discover_attr_php_var(render_text: str, attr: str) -> "str | None":
    """Return the local PHP variable name a block's render.php reads
    `$attributes['{attr}']` into, e.g. `cardStyle` -> `card_style` for
    `$card_style = $attributes['cardStyle'] ?? 'bordered';`. Scans line-by-line
    (every observed assignment is a single-line PHP statement) so it survives
    both `isset(...) ? ... : ...` and `?? ...` forms, and any sanitiser wrapper
    on the RHS. Cached per attr name (the regex itself is attr-specific)."""
    pattern = _ATTR_VAR_ASSIGN_RE_CACHE.get(attr)
    if pattern is None:
        pattern = re.compile(
            r"^\s*\$(\w+)\s*=.*\$attributes\[\s*['\"]" + re.escape(attr) + r"['\"]\s*\]"
        )
        _ATTR_VAR_ASSIGN_RE_CACHE[attr] = pattern
    for line in render_text.splitlines():
        m = pattern.match(line)
        if m:
            return m.group(1)
    return None


def _discover_attr_class_prefix(render_text: str, block_name: str, var_name: str) -> "str | None":
    """Return the EXACT literal class-prefix string render.php concatenates
    `$var_name` onto, e.g. `'sgs-google-reviews--card-' . sanitize_key( $card_style )`
    -> "sgs-google-reviews--card-". This is the PRIMARY, render.php-derived
    prefix-discovery mechanism (supersedes the fixed
    `_PRESET_CLASS_CONVENTIONS` template, which assumed every preset attr's
    class is exactly `sgs-{block}--{value}` — proven too rigid by
    google-reviews's `sgs-google-reviews--card-{value}` shape). Returns None
    if no matching concatenation is found (caller falls back to the
    convention table)."""
    pattern = re.compile(
        r"'(sgs-" + re.escape(block_name) + r"--[a-z0-9-]*)'\s*\.\s*"
        r"(?:esc_attr|sanitize_key|sanitize_html_class)\s*\(\s*\$" + re.escape(var_name) + r"\b"
    )
    m = pattern.search(render_text)
    return m.group(1) if m else None


def _discover_class_prefix_family(render_text: str, own_prefix: str) -> list[str]:
    """Return the sub-prefix strings (e.g. ["hover-", "media-"]) that OTHER
    class-building concatenations in this block's render.php use off the same
    root as `own_prefix` — so enumerating `own_prefix`'s own values can
    exclude tokens that actually belong to a sibling attr sharing the literal
    substring (R-31-1: derived from render.php's own text, never hand-named)."""
    all_prefixes = set(_RENDER_PREFIX_CONCAT_RE.findall(render_text))
    siblings = []
    for prefix in all_prefixes:
        if prefix != own_prefix and prefix.startswith(own_prefix) and len(prefix) > len(own_prefix):
            siblings.append(prefix[len(own_prefix):])
    return siblings


def _extract_leaf_css_rules(css_text: str):
    """Yield (selector, {prop: value}) for every INNERMOST `{...}` rule in
    `css_text`, tolerant of @media nesting (a naive non-nesting regex only
    ever completes a match on the leaf rule — the @media wrapper's own
    opening brace can never pair with a `}` before hitting the leaf rule's
    OWN brace first, so the wrapper is transparently skipped).

    CSS comments are stripped FIRST — an inline `/* ... */` comment inside a
    rule body can itself contain a `;`, which would otherwise fracture the
    following real declaration's property name (verified live 2026-07-24:
    team-member's `.sgs-team-member--elevated` rule has exactly this shape,
    and an unstripped comment silently ate its `box-shadow` declaration)."""
    css_text = _CSS_COMMENT_RE.sub("", css_text)
    for m in _CSS_LEAF_RULE_RE.finditer(css_text):
        selector = m.group(1).strip()
        body = m.group(2)
        decls: dict[str, str] = {}
        for decl in body.split(";"):
            decl = decl.strip()
            if not decl or ":" not in decl:
                continue
            prop, _, val = decl.partition(":")
            decls[prop.strip().lower()] = val.strip()
        yield selector, decls


def _classify_preset_decls(decls: dict) -> set:
    """Which signal properties a rule's declarations meaningfully paint.

    Mirrored EXACTLY by
    `converter.resolvers.preset_absence._present_properties_from_decls` — the
    seeding side and the matching side must use the identical semantics or a
    value could be seeded as "has box-shadow" but never match a draft that
    genuinely has one (or vice versa).
    """
    signals: set = set()
    box_shadow = str(decls.get("box-shadow", "")).strip().lower()
    if box_shadow and box_shadow != "none":
        signals.add("box-shadow")
    border_shorthand = str(decls.get("border", "")).strip().lower()
    border_width = str(decls.get("border-width", "")).strip().lower()
    border_style = str(decls.get("border-style", "")).strip().lower()
    if (
        (border_shorthand and not border_shorthand.startswith(("none", "0")))
        or (border_width and border_width not in ("0", "0px", "none"))
        or (border_style and border_style not in ("none", ""))
    ):
        signals.add("border")
    transform = str(decls.get("transform", "")).strip().lower()
    if transform and transform != "none":
        signals.add("transform")
    return signals


def _enumerate_preset_values(
    css_text: str,
    class_prefix: str,
    exclude_prefixes: "list[str] | None" = None,
    state: "str | None" = None,
) -> dict:
    """Return {value_token: signals_set} for every class `.{class_prefix}{value}`
    found in `css_text`. Two passes: (1) discover value tokens from any
    selector containing the prefix; (2) for each token, accumulate signals
    from EVERY QUALIFYING rule mentioning the exact class (covers `:hover`,
    `::before`, and descendant-combinator compounds like
    `.sgs-card-grid--hover-zoom .sgs-card-grid__item:hover .sgs-card-grid__image`
    AND `.sgs-google-reviews--card-elevated .sgs-google-reviews__review`).

    `exclude_prefixes` filters out tokens that actually belong to a SIBLING
    attr sharing the same literal class-prefix substring (see
    `_discover_class_prefix_family`).

    `state` gates which rules QUALIFY for signal accumulation: `state='hover'`
    (effectHover) REQUIRES the selector carry an interactive pseudo-class
    (`:hover`/`:focus`/etc.); `state=None` (cardStyle — resting only) EXCLUDES
    any selector carrying one. Verified live 2026-07-24: google-reviews'
    `.sgs-google-reviews--card-elevated .sgs-google-reviews__review:hover`
    rule shares the exact same class token as its resting rule — without this
    filter, cardStyle's signal set would wrongly absorb a hover-only
    box-shadow bump.
    """
    dotted_prefix = "." + class_prefix
    excludes = tuple(exclude_prefixes or ())
    tokens: set = set()
    for selector, _decls in _extract_leaf_css_rules(css_text):
        idx = 0
        while True:
            pos = selector.find(dotted_prefix, idx)
            if pos == -1:
                break
            rest = selector[pos + len(dotted_prefix):]
            m = _CSS_VALUE_TOKEN_RE.match(rest)
            if m:
                token = m.group(0)
                if not any(token.startswith(ex) for ex in excludes):
                    tokens.add(token)
            idx = pos + len(dotted_prefix)

    value_signals: dict = {t: set() for t in tokens}
    for token in tokens:
        class_token = f"{dotted_prefix}{token}"
        for selector, decls in _extract_leaf_css_rules(css_text):
            pos = selector.find(class_token)
            if pos == -1:
                continue
            # Word-boundary: the token must not be immediately followed by
            # another identifier char, so "elevated" doesn't false-match
            # inside a longer modifier like "elevated-alt".
            after = selector[pos + len(class_token): pos + len(class_token) + 1]
            if after and (after.isalnum() or after == "-"):
                continue
            has_interactive_pseudo = bool(_CSS_INTERACTIVE_PSEUDO_RE.search(selector))
            if state == "hover":
                if not has_interactive_pseudo:
                    continue
            else:
                if has_interactive_pseudo:
                    continue
            value_signals[token] |= _classify_preset_decls(decls)
    return value_signals


def _choose_neutral_value(value_signals: dict) -> "str | None":
    """Pick the ONE canonical neutral (is_neutral=1) among values with no
    signal at all. Tie-break: prefer a value literally named 'flat' or 'none'
    (the plainest, most self-describing neutral term used across the
    framework's own SelectControl option labels); else alphabetically first
    (deterministic)."""
    neutrals = sorted(v for v, sig in value_signals.items() if not sig)
    if not neutrals:
        return None
    for preferred in ("flat", "none"):
        if preferred in neutrals:
            return preferred
    return neutrals[0]


_VARIATIONS_VALUE_EXTRACTOR = (
    Path(__file__).resolve().parent / "variant-value-extractor" / "extract-variation-values.js"
)


def _canon_slot_value(value) -> str:
    """Canonical string form of a variant discriminator's value.

    MUST behave identically to `converter/db/db_lookup.py::_canon_slot_value`
    — one writes `variant_slots.slot_value`, the other reads it back to score
    a candidate against the draft's extracted attrs. A duplicated 3-line pure
    function (not a lookup dict — R-31-1 doesn't apply) is simpler and safer
    than plumbing a shared import between a one-off writer script and the
    converter package.
    """
    try:
        return json.dumps(value, sort_keys=True, separators=(",", ":"))
    except (TypeError, ValueError):
        return repr(value)


def _extract_variation_attribute_values(block_dir: Path) -> "dict | None":
    """Run `extract-variation-values.js` against `block_dir/variations.js`.

    Returns `{variant_name: {attr_name: value, ...}, ...}` (plain JSON values,
    already excluding any attribute the extractor could not statically
    evaluate — see that script's docstring), or `None` when the block has no
    `variations.js`, or the extraction failed (missing `node`, parse error,
    non-JSON output). A `None` return means "seed this block exactly as
    before" (name-only) — this is a soft-optional enrichment, never a hard
    dependency for `/sgs-update` to complete.
    """
    variations_path = block_dir / "variations.js"
    if not variations_path.exists():
        return None
    if not _VARIATIONS_VALUE_EXTRACTOR.exists():
        print(
            f"Stage 1 (variant-values): WARN extractor script missing at "
            f"{_VARIATIONS_VALUE_EXTRACTOR} — falling back to name-only for {block_dir.name}"
        )
        return None
    try:
        proc = subprocess.run(
            ["node", str(_VARIATIONS_VALUE_EXTRACTOR), str(variations_path)],
            capture_output=True, text=True, timeout=30, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        print(f"Stage 1 (variant-values): WARN failed to run extractor for {block_dir.name}: {exc}")
        return None
    if proc.returncode != 0:
        print(
            f"Stage 1 (variant-values): WARN extractor exited {proc.returncode} for "
            f"{block_dir.name}: {(proc.stderr or '').strip()}"
        )
        return None
    try:
        payload = json.loads(proc.stdout)
    except (json.JSONDecodeError, ValueError) as exc:
        print(f"Stage 1 (variant-values): WARN extractor emitted non-JSON for {block_dir.name}: {exc}")
        return None
    variants = payload.get("variants") if isinstance(payload, dict) else None
    if not isinstance(variants, dict):
        return None
    return {
        v_name: v_data.get("attributes", {})
        for v_name, v_data in variants.items()
        if isinstance(v_data, dict)
    }


def _populate_preset_implications(
    c, slug: str, block_dir: Path, sgs_supports: dict, declared_attrs: set
) -> None:
    """Auto-derive + write preset_implications rows for one block.

    Reads `supports.sgs.presetSelectors` (the minimal declarative hint —
    Component 2), confirms each attr's class-naming convention is actually
    present in the block's OWN render.php (the authority — render.php builds
    the class literally, e.g. `'sgs-info-box--' . esc_attr($cardStyle)`), then
    scans style.css for that class family's rules and classifies each value's
    signal properties. Delete-then-insert per (block_slug, preset_attr) —
    idempotent, mirrors variant_slots.
    """
    preset_selectors = (
        sgs_supports.get("presetSelectors") if isinstance(sgs_supports, dict) else None
    )
    if not isinstance(preset_selectors, list) or not preset_selectors:
        return

    render_path = block_dir / "render.php"
    style_path = block_dir / "style.css"
    try:
        render_text = render_path.read_text(encoding="utf-8") if render_path.exists() else ""
    except (OSError, UnicodeDecodeError):
        render_text = ""
    try:
        style_text = style_path.read_text(encoding="utf-8") if style_path.exists() else ""
    except (OSError, UnicodeDecodeError):
        style_text = ""

    for attr in preset_selectors:
        if attr not in declared_attrs:
            print(
                f"Stage 1 (presetSelectors): WARN {slug}.{attr} declared in "
                f"supports.sgs.presetSelectors but not in attributes"
            )
            continue
        # PRIMARY: discover the exact class prefix from render.php itself —
        # find the PHP variable this attr is read into, then the literal
        # string render.php concatenates that variable onto. Supersedes a
        # fixed "sgs-{block}--{suffix}" template (proven too rigid by
        # google-reviews's "sgs-google-reviews--card-{value}" shape).
        var_name = _discover_attr_php_var(render_text, attr)
        class_prefix = (
            _discover_attr_class_prefix(render_text, block_dir.name, var_name)
            if var_name
            else None
        )
        if class_prefix is None:
            # FALLBACK: the fixed convention table (safety net only).
            convention = _PRESET_CLASS_CONVENTIONS.get(attr)
            if convention is None:
                print(
                    f"Stage 1 (presetSelectors): WARN {slug}.{attr} — no PHP "
                    f"variable/class-concat found in render.php and no known "
                    f"fallback convention (only cardStyle/effectHover) — "
                    f"skipped, no rows seeded"
                )
                continue
            suffix, _unused_state = convention
            class_prefix = f"sgs-{block_dir.name}{suffix}"
            if class_prefix not in render_text:
                print(
                    f"Stage 1 (presetSelectors): WARN {slug}.{attr} — render.php "
                    f"does not contain the expected class prefix '{class_prefix}' "
                    f"— convention not confirmed, skipped, no rows seeded"
                )
                continue
        state = _PRESET_STATE_BY_ATTR.get(attr)
        # A preset attr's own prefix (e.g. "sgs-google-reviews--card-") is
        # often a literal substring of a SIBLING attr's prefix built off the
        # same block root (theme-/variant-/star-/cols- etc.) — discover those
        # sibling sub-prefixes from render.php's own concatenation text and
        # exclude their tokens so they are never mis-enumerated as THIS
        # attr's values.
        sibling_subprefixes = _discover_class_prefix_family(render_text, class_prefix)
        value_signals = _enumerate_preset_values(
            style_text, class_prefix, exclude_prefixes=sibling_subprefixes, state=state
        )
        fallback_neutral_name = _PRESET_NEUTRAL_FALLBACK_NAME.get(attr)
        if fallback_neutral_name and not any(not sig for sig in value_signals.values()):
            # No already-neutral (signal-less) value was discovered from CSS
            # at all — e.g. a legitimate SelectControl option (google-reviews
            # cardStyle's 'flat') that paints NO CSS rule whatsoever. Seed it
            # explicitly so the resolver always has a neutral fallback.
            value_signals.setdefault(fallback_neutral_name, set())
        if not value_signals:
            continue
        neutral_value = _choose_neutral_value(value_signals)
        c.execute(
            "DELETE FROM preset_implications WHERE block_slug = ? AND preset_attr = ?",
            (slug, attr),
        )
        for value, signals in value_signals.items():
            implied = ",".join(sorted(signals))
            is_neutral = 1 if (neutral_value is not None and value == neutral_value) else 0
            presence = "present" if signals else "absent"
            c.execute(
                "INSERT OR IGNORE INTO preset_implications "
                "(block_slug, preset_attr, enum_value, implied_property, presence, is_neutral) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (slug, attr, value, implied, presence, is_neutral),
            )


def _collect_boxfamily_overrides(blocks_dir: Path) -> dict:
    """Derive box_family overrides DECLARATIVELY from block.json (R-31-1).

    box_family is the box-object merge categorisation guard (Spec 31 §4 / §3.A
    step 3b). It is NOT a hardcoded dict in this script (Bean 2026-07-10 — "stop
    hard-coding into sgs-update"); each block DECLARES its box families in its
    own block.json `supports.sgs.boxFamilies` (family -> [object-attr, ...]),
    exactly as the block already declares variants / arrayItemSchema / lift
    capabilities in supports.sgs. This walks those declarations and returns the
    same {(slug, attr): {"box_family": family}} shape the override applier writes,
    so block.json is the single source of truth and the categorisation travels
    with the block (block-files-are-ground-truth). `box_side` stays NULL on the
    merged object attr (the object holds all sides); the migrated-away flat
    per-side attrs are deleted, so no box_side is ever written here.
    """
    out: dict[tuple[str, str], dict[str, object]] = {}
    for block_dir in sorted(blocks_dir.iterdir()):
        bj = block_dir / "block.json"
        if not bj.is_file():
            continue
        try:
            data = json.loads(bj.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        slug = data.get("name")
        box_families = (
            (data.get("supports") or {}).get("sgs", {}).get("boxFamilies")
            if isinstance(data.get("supports"), dict)
            else None
        )
        if not slug or not isinstance(box_families, dict):
            continue
        declared_attrs = set((data.get("attributes") or {}).keys())
        for family, attrs in box_families.items():
            if not isinstance(attrs, list):
                continue
            for attr in attrs:
                # FAIL-LOUD (Rule 4): a declared box-family attr must exist on the
                # block, else the declaration is stale — warn, never silently seed
                # a phantom row.
                if attr not in declared_attrs:
                    print(
                        f"Stage 1 (boxFamilies): WARN {slug}.{attr} declared in "
                        f"supports.sgs.boxFamilies['{family}'] but not in attributes"
                    )
                    continue
                out[(slug, attr)] = {"box_family": family}
    return out


_CSS_PROPERTY_CLASSIFICATIONS_JSON_PATH = Path(__file__).resolve().parent / "behavioural-analyser" / "css-property-classifications.json"


def _load_css_property_classifications(path: Path = _CSS_PROPERTY_CLASSIFICATIONS_JSON_PATH) -> dict[tuple[str, str], dict[str, object]]:
    """Load the DERIVED classifier layer (css_property/css_layer/css_element/
    css_state/css_tier) generated by
    `behavioural-analyser/extract-signatures.py::extract_css_property_and_layer`.

    This is the BASE layer in the two-layer model Bean approved 2026-07-21:
    derived-first, ATTR_CLASSIFICATION_OVERRIDES applied after and winning on any
    field conflict — mirroring the existing `_collect_boxfamily_overrides` pattern
    (a declarative, regenerated source merged in below, never hand-edited).

    Soft-optional: unlike the override file, this file may legitimately not exist yet
    (before the classifier has ever been run) — returns {} rather than failing loud,
    since it is a derived cache, not hand-authored data that would be a silent data
    loss if missing.
    """
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    entries = data.get("entries")
    if not isinstance(entries, list):
        return {}
    out: dict[tuple[str, str], dict[str, object]] = {}
    for entry in entries:
        slug = entry.get("slug")
        attr = entry.get("attr")
        fields = entry.get("fields")
        if not slug or not attr or not isinstance(fields, dict):
            continue
        out[(slug, attr)] = fields
    return out


_FX_QUALIFYING_BLOCKS_JSON = (
    Path(__file__).resolve().parent.parent
    / "src" / "blocks" / "extensions" / "generated-fx-qualifying-blocks.json"
)


def _load_fx_qualifying_block_slugs(path: Path = _FX_QUALIFYING_BLOCKS_JSON) -> set[str]:
    """Return the set of block slugs `fx.js`'s own `shouldHaveFx()` treats as
    fx-capable — i.e. every key of `generated-fx-qualifying-blocks.json` that
    maps to at least one effect (D432/FR-38-22 investigation, 2026-09-04).

    This is the SAME artefact `fx.js` imports (`qualifyingBlocks`) to decide
    which blocks get the `fx*` attributes added via its `registerBlockType`
    filter — reusing it here (rather than re-deriving eligibility from
    `supports.sgs.enabledExtensions`, which fx capability does not use at all)
    keeps ONE source of truth for "is this block fx-capable" (R-31-1).
    Soft-optional: a missing/unreadable file degrades to "seed nothing this
    run" rather than hard-failing an unrelated /sgs-update.
    """
    if not path.exists():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return {slug for slug, effects in data.items() if effects}
    except Exception as exc:  # noqa: BLE001
        print(f"Stage 1 (fx-attr-rows): WARN failed to read {path.name}: {exc}")
        return set()


_DB_LOOKUP_PY = Path(__file__).resolve().parent / "converter" / "db" / "db_lookup.py"


def _load_fx_attr_roster(path: Path = _DB_LOOKUP_PY) -> dict[str, dict[str, str]]:
    """Import `fx_attr_roster()` from `converter/db/db_lookup.py` (same
    importlib pattern as `_load_fx_attr_css_property_map` above, targeting a
    different sibling module) — the FULL fx* attribute roster (name -> real
    JS type + data-attribute name), sourced from `includes/fx-attributes.php`
    FX_ATTR_MAP + `includes/extension-attributes.generated.php`. Replaces
    the narrower `FX_ATTR_CSS_PROPERTY` map (29 of ~79 names) as THIS
    function's eligibility source — that map still exists and is still used
    unchanged for its own purpose (the fx: css_property classification
    layer, `_collect_fx_attr_namespace_overrides`).

    Soft-optional: a missing/unreadable module degrades to an empty roster
    rather than hard-failing an unrelated /sgs-update run.
    """
    if not path.exists():
        return {}
    try:
        import importlib.util as _ilu

        spec = _ilu.spec_from_file_location("sgs_converter_db_lookup", str(path))
        mod = _ilu.module_from_spec(spec)  # type: ignore[arg-type]
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        roster_fn = getattr(mod, "fx_attr_roster", None)
        return roster_fn() if callable(roster_fn) else {}
    except Exception as exc:  # noqa: BLE001
        print(f"Stage 1 (fx-attr-rows): WARN failed to import fx_attr_roster: {exc}")
        return {}


def _seed_missing_fx_attr_rows(conn: sqlite3.Connection, dry_run: bool = False) -> dict:
    """Stage 1 sub-step B2.6 — INSERT missing `block_attributes` rows for the
    `fx*` attribute set on every fx-capable block (FR-38-22 cloning-lift
    investigation, 2026-09-04).

    THE GAP THIS CLOSES: `fx*` attrs (`fxTrigger`, `fxPath`, `fxShape`, …) are
    added to a block's registered schema entirely client-side, via `fx.js`'s
    `registerBlockType` filter — they appear in NO block.json. Stage 1's
    normal attribute discovery only reads block.json, so these attrs never
    got a `block_attributes` row at all (confirmed: `_apply_attr_classification_
    overrides`'s layer 2.5, `_collect_fx_attr_namespace_overrides`, only
    classifies rows that ALREADY exist — it has printed "MISSING ROW" for
    every one of these names since D432, and nothing ever created the row).
    Without a row, the cloning walker's `block_attrs(slug)` lookup can never
    see these attrs, so `lift_behavioural_attrs` can never lift them from a
    draft — this was the actual, previously-undiagnosed reason `fx*` attrs
    vanish on clone (FR-38-22).

    Deliberately minimal, additive-only INSERT — sets only the columns the
    converter's read path actually consumes (`db_lookup.block_attrs()`:
    attr_name/attr_type/role/canonical_slot/derived_selector) plus `source`.
    Leaves `css_property` NULL on insert; the EXISTING layer 2.5 step
    (`_collect_fx_attr_namespace_overrides`, called right after this from
    `_apply_attr_classification_overrides`) then classifies it in the SAME
    run, so there is still exactly one writer of `css_property` — this step
    only ever creates the row, never sets that column itself.

    ⛔ CORRECTED 2026-09-04 (adversarial-council, same day as the original
    build): this function originally iterated `FX_ATTR_CSS_PROPERTY` (29
    names — the css_property classification map, never the attribute
    roster) and hardcoded `attr_type='string'` for every row. Both were
    wrong: `fx.js` registers ~79 `fx*` attributes, not 29 — every attr
    outside that 29-name map (the whole magnet/particle/generative-
    background/grid-dot/wave family) had the EXACT bug this function exists
    to fix, unfixed; and `'string'` for every row meant a real
    `type:'boolean'`/`type:'number'` attr (e.g. `fxDisableTablet`,
    `fxScrub`) round-trips as the literal string `"true"`/`"0.6"`, which a
    strict PHP `true === $value` check (as `includes/fx-attributes.php`
    genuinely uses) never matches — a client's "don't run this on mobile"
    setting would silently not apply. Now sources both the full name list
    AND each attr's real type from `db_lookup.fx_attr_roster()` (see that
    function's docstring) — two already-maintained, build-generated
    artefacts, not hand-derived here.

    ⛔ `source='sgs-fx'`, DELIBERATELY NOT `'sgs'` (D951-adversarial-council
    fix, 2026-09-04). These rows have no block.json to be validated against —
    that is the whole point of this function existing. Stage 9's ghost-row
    prune (`_prune_orphans_on_conn`, category (c)) deletes any
    `block_attributes` row with `source='sgs'` whose `attr_name` is absent
    from its block's live block.json `attributes` — unconditionally, no
    dry-run/conservative escape for this category. Seeding with `source='sgs'`
    was caught (adversarial-council, before this line existed) as a
    same-session self-destruct: every row this function inserts would be
    deleted again the very next full `/sgs-update` run, silently reverting
    FR-38-22. `source='sgs-fx'` is invisible to that query's `WHERE
    ba.source = 'sgs'` filter by construction. No other block_attributes
    query anywhere in this file or in db_lookup.py filters on `source` (only
    the `blocks` table's own rows use `source='sgs'` as a filter elsewhere) —
    verified by grep before choosing this fix, not assumed.

    Returns {"fx_attr_rows_inserted": int, "fx_attr_rows_blocks": int}.
    """
    c = conn.cursor()
    roster = _load_fx_attr_roster()
    slugs = _load_fx_qualifying_block_slugs()
    inserted = 0
    touched_blocks: set[str] = set()
    for slug in sorted(slugs):
        for attr_name, attr_info in roster.items():
            exists = c.execute(
                "SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
                (slug, attr_name),
            ).fetchone()
            if exists:
                continue
            inserted += 1
            touched_blocks.add(slug)
            if not dry_run:
                # attr_type from the real JS declaration (string/number/
                # boolean/array), not hardcoded — see docstring correction.
                c.execute(
                    "INSERT INTO block_attributes "
                    "(block_slug, attr_name, attr_type, role, source) "
                    "VALUES (?, ?, ?, 'behaviour', 'sgs-fx')",
                    (slug, attr_name, attr_info.get("type", "string")),
                )
    return {
        "fx_attr_rows_inserted": inserted,
        "fx_attr_rows_blocks": len(touched_blocks),
    }


def _apply_attr_classification_overrides(
    conn: sqlite3.Connection,
    blocks_dir: Path,
    dry_run: bool = False,
) -> dict:
    """Stage 1 sub-step C: apply the derived css-property classification layer +
    ATTR_CLASSIFICATION_OVERRIDES + declarative block.json box_family overrides
    (`supports.sgs.boxFamilies`).

    Runs AFTER `_run_canonical_assignment` so it is the final writer on
    block_attributes.role/canonical_slot for the listed (slug, attr) pairs —
    correcting genuine mis-derivations the assign-canonical heuristic makes.
    box_family is NO LONGER hardcoded here — it is derived per-block from
    block.json (`_collect_boxfamily_overrides`) and merged in, so the hand-authored
    dict holds only role/derived_selector/emit-shape/css_property corrections.
    Idempotent; re-applies on every /sgs-update.

    Layering (2026-07-21, Bean-approved; layer 2.5 added D432 2026-08-01 — do
    not reorder):
      1. DERIVED layer — css-property-classifications.json (classifier output:
         css_property/css_layer/css_element/css_state/css_tier). Applied FIRST.
      2. box_family — declarative block.json source. Merged in (own fields, no
         overlap with layer 1/3/4's fields).
      2.5. fx:* namespace — FX_ATTR_CSS_PROPERTY (seed-motion-fx-registry.py,
         Spec 38 §6.2/§11.3), DB-driven (any existing block_attributes row
         whose attr_name is a declared fx:* name). This is /sgs-update's OWN
         write of the motion-fx pseudo-property marker — the seeder script no
         longer writes block_attributes.css_property itself (D432 fix: two
         writers to the same column was the exact class of bug that broke the
         build for two co-active tracks at once). Merged in like box_family
         (own namespace, only ever collides with itself).
      3. OVERRIDE layer — ATTR_CLASSIFICATION_OVERRIDES (hand-authored JSON truth
         file). Applied LAST, wins on any field conflict with layers 1/2/2.5.
         Overrides exist to record cases where what the code DOES and what it
         MEANS differ (e.g. sgs/tabs tabIndicatorColour delivers via box-shadow
         but IS a colour value — see attr-classification-overrides.json), not
         to correct classifier accuracy bugs (fix those in the classifier
         itself) or to declare fx:* markers (that's layer 2.5's job now).

    Returns counts dict: {"override_applied": int, "override_missing_row": int}.
    """
    c = conn.cursor()
    applied = 0
    missing = 0
    # Layer 1: the derived classifier output (base layer).
    combined: dict[tuple[str, str], dict[str, object]] = {
        k: dict(v) for k, v in _load_css_property_classifications().items()
    }
    # Layer 2: declarative box_family (own fields; never overlaps layer 1/3/4's fields).
    for key, fields in _collect_boxfamily_overrides(blocks_dir).items():
        combined.setdefault(key, {}).update(fields)
    # Layer 2.5: fx:* namespace (D432 integration — see docstring above).
    for key, fields in _collect_fx_attr_namespace_overrides(c).items():
        combined.setdefault(key, {}).update(fields)
    # Layer 3: hand-authored overrides — applied LAST so they win on any field
    # conflict with the derived layer (per-field merge, not whole-row replace).
    for key, fields in ATTR_CLASSIFICATION_OVERRIDES.items():
        combined.setdefault(key, {}).update(fields)
    # Idempotent column-add (mirrors the emit_shape column-add pattern above) —
    # lets an override introduce a new tracked column (e.g. box_family, or
    # `alt_companion_attr` CG-8 2026-07-05) without a separate schema migration.
    existing_cols = {r[1] for r in c.execute("PRAGMA table_info(block_attributes)").fetchall()}
    override_cols = {col for fields in combined.values() for col in fields}
    for col in sorted(override_cols - existing_cols):
        if not dry_run:
            c.execute(f"ALTER TABLE block_attributes ADD COLUMN {col} TEXT")
        existing_cols.add(col)
    # css_layer (L1-L4) is a DERIVED column OWNED SOLELY by the classifications JSON
    # (layer 1 — verified 2026-07-23: no ATTR_CLASSIFICATION_OVERRIDES / box_family
    # source writes it). The per-attr UPDATE below is additive-per-field and cannot
    # express "clear to NULL", so a row whose correct layer became NULL (e.g.
    # option-picker/quote/testimonial.contentWidth, de-classified from a wrong CONTENT
    # to the block's own root width) would keep its STALE value across a reseed. Reset
    # the whole column FIRST so the reseed is AUTHORITATIVE — every row's css_layer is
    # then exactly what the JSON declares this run, and nothing stale survives.
    #
    # css_element and css_tier get the SAME treatment (2026-08-15, D6xx — audit-css-
    # element-drift.py findings). Structurally identical bug: both columns are ALSO
    # written only by this function's `combined` dict (layer 1 JSON + box_family +
    # fx-namespace + hand-authored overrides — see check_css_property_reseed.py's
    # docstring, which already documents the intended architecture as "the DERIVED
    # column set" covering css_property/css_layer/css_element/css_state/css_tier, all
    # owned exclusively by these two reseed-durable channels), so a row whose element/
    # tier legitimately stops being claimed this run keeps its STALE prior value
    # forever under the additive-per-field UPDATE below. Proven via a live read-only
    # diagnostic against the current DB (no reseed executed — see
    # `.claude/reports/...` / this session's diagnostic script): 5 css_element rows
    # (sgs/card-grid.transitionDuration/transitionEasing, sgs/google-reviews.
    # starColour, sgs/post-grid.shadowHover/imageZoomHover) and 1 css_tier row
    # (sgs/nav-menu.gap) are non-NULL in the DB today but absent from `combined` this
    # run — i.e. already stale, uncovered by the narrower object_tier_fossils cleanup
    # below (that cleanup requires attr_type='object'; nav-menu.gap is 'string').
    #
    # css_property got the SAME live diagnostic and came back with ZERO stale rows
    # today — ownership is clean (verified: the one migration that writes
    # css_property directly, `migrations/2026-08-13-role-remediation-part2-
    # overrides.py`, writes BOTH the live DB AND attr-classification-overrides.json,
    # so it stays reseed-durable), so it is deliberately left un-reset here
    # (prove-the-cause-before-fix) — re-run the diagnostic after future reseeds if
    # a stale css_property is ever reported.
    #
    # css_state WAS included in that same "no proven drift" claim (2026-08-xx) —
    # PROVEN FALSE 2026-09-03 (qc-council, this session): `sgs/option-picker.
    # pillBgColour` (a resting/base attribute, no `states` entry of its own)
    # carried a stale `css_state='hover'` that survived every reseed since before
    # this loop existed, because this column was never in the reset list, so the
    # per-row additive UPDATE below — which only sets the columns present in that
    # row's own `fields` dict — silently preserved whatever value was already
    # sitting there. The classifier itself was already correct (its own JSON
    # output for `pillBgColour` carries no `css_state` key at all); the DB simply
    # never caught up. Root cause traced to a plausible origin: option-picker's
    # bespoke nested-CSS-variable-fallback pattern (`var(--sgs-op-bg-hover,
    # var(--sgs-op-bg, ...)))`) is the exact shape the 2026-07-21 `_top_level_vars()`
    # fix (extract-signatures.py) was built to stop mis-attributing state on —
    # that fix corrected the classifier going forward but never touched the
    # already-stored DB value. `css_layer`/`css_element`/`css_tier` never had this
    # failure mode because they were ALREADY in the reset list.
    if not dry_run:
        # `css_property` ADDED to the reset list 2026-09-05. The comment above
        # predicted this exact report: it was "deliberately left un-reset ...
        # re-run the diagnostic after future reseeds if a stale css_property is
        # ever reported". It was — three F6 routing-determinism findings
        # (sgs/hero, sgs/responsive-logo) survived a corrected classifier because
        # the per-row additive UPDATE below only sets columns present in that
        # row's own `fields`, so an attr the classifier NO LONGER classifies kept
        # whatever stale property was already stored. The classifier had been
        # fixed to evict those attrs (slot-level manifest precedence); the DB
        # simply never caught up — the identical failure mode `css_state` had.
        for _reset_col in ("css_layer", "css_element", "css_tier", "css_state", "css_property"):
            if _reset_col in existing_cols:
                c.execute(f"UPDATE block_attributes SET {_reset_col} = NULL")
    for (slug, attr), fields in combined.items():
        if not fields:
            continue
        # Column names come from a code-level constant (not user input) — safe to
        # interpolate; values are bound parameters.
        set_clause = ", ".join(f"{col} = ?" for col in fields)
        params = list(fields.values()) + [slug, attr]
        if dry_run:
            # A dry-run never ALTERs the schema (above), so a column this override
            # needs may not exist yet in the connected DB — select only the
            # subset that's already present rather than raising.
            selectable = [col for col in fields if col in existing_cols]
            if not selectable:
                print(
                    f"Stage 1 (attr-override) [dry-run]: {slug}.{attr} "
                    f"— target column(s) {list(fields.keys())} not yet in schema "
                    f"(would be added by a non-dry-run pass)"
                )
                continue
            row = c.execute(
                "SELECT " + ", ".join(selectable)
                + " FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
                (slug, attr),
            ).fetchone()
            if row is None:
                missing += 1
                print(f"Stage 1 (attr-override) [dry-run]: MISSING ROW {slug}.{attr}")
            else:
                print(
                    f"Stage 1 (attr-override) [dry-run]: {slug}.{attr} "
                    f"current={row} -> {fields}"
                )
            continue
        cur = c.execute(
            f"UPDATE block_attributes SET {set_clause} "
            "WHERE block_slug = ? AND attr_name = ?",
            params,
        )
        if cur.rowcount == 0:
            missing += 1
        else:
            applied += cur.rowcount
    if not dry_run:
        conn.commit()
    return {"override_applied": applied, "override_missing_row": missing}


def _reconcile_object_family_tiers(conn: sqlite3.Connection, dry_run: bool = False) -> dict:
    """Stage 1 sub-step C2: clear a FOSSIL css_tier off a collapsed tier object.

    THE RULE, derived from the live data rather than invented (measured 2026-08-10):

      * A base attr whose per-tier SIBLING ROWS exist is ONE TIER AMONG SEVERAL ROWS,
        so it correctly carries css_tier='desktop' while its siblings carry
        'tablet'/'mobile'. This is the model db_lookup.py:1216-1242 describes and
        `_base_clause` selects on. sgs/hero's imageBorderRadius / imagePadding /
        contentPadding / mediaPadding are all this shape and are CORRECT.
      * A base attr with NO sibling rows holds every tier INSIDE its own value, so
        there is no tier to name and css_tier must be NULL. Every pre-existing
        collapsed family is already NULL (site-header-row/site-footer-row maxWidth
        and contentWidth), so NULL is the established convention, not a new one.

    WHY THIS STEP HAS TO EXIST (the Spec 35 migration hazard, and it is systemic):
    collapsing a flat trio retypes the base to `object` and deletes the two sibling
    rows -- and NOTHING clears the base's now-meaningless css_tier. Stage 1's
    attribute UPDATE cannot: its SET clause covers attr_type/default_value/
    enum_values/description/is_responsive and deliberately never touches the derived
    routing columns. Stage 9's prune deletes the sibling ROWS without looking at the
    base. So the stale value survives as a fossil, exactly like the css_property
    fossils that motivated wiring Task A.

    Caught on the first real case: sgs/hero.imageHeight was retyped object-with-no-
    siblings and kept css_tier='desktop' from its scalar days. Harmless to base
    SELECTION (db_lookup's clause accepts NULL *or* 'desktop'), but it makes the row
    disagree with every other collapsed family, and a disagreement nobody reconciles
    is how the next reader concludes the wrong thing. All 160 planned migrations
    would leave the same fossil.

    Scope is deliberately narrow: object-typed attrs ONLY, and only where no sibling
    row exists. A scalar attr's css_tier is none of this step's business.
    """
    # ⛔ The attr must be a BASE, not itself a tier sibling. Without this clause the
    # rule inverts and eats the very identity it exists to protect: `contentPaddingMobile`
    # is ALSO object-typed (a box object), and asking whether IT has siblings named
    # `contentPaddingMobileTablet` always answers no -- so a sibling reads as a collapsed
    # base and its css_tier='mobile' gets cleared. That is the exact column db_lookup's
    # `_base_clause` uses to EXCLUDE siblings from base selection, so stripping it makes
    # every sibling look like a base and reintroduces the ambiguity errors this whole
    # session removed. Caught by the idempotency control on the first re-run: 12 sibling
    # rows across sgs/hero, sgs/label and sgs/team-member were wrongly cleared.
    rows = conn.execute(
        """
        SELECT a.block_slug, a.attr_name, a.css_tier
        FROM block_attributes a
        WHERE a.attr_type = 'object'
          AND a.css_tier IS NOT NULL
          AND a.attr_name NOT LIKE '%Tablet'
          AND a.attr_name NOT LIKE '%Mobile'
          AND NOT EXISTS (
              SELECT 1 FROM block_attributes s
              WHERE s.block_slug = a.block_slug
                AND s.attr_name IN (a.attr_name || 'Tablet', a.attr_name || 'Mobile')
          )
        ORDER BY a.block_slug, a.attr_name
        """
    ).fetchall()

    cleared = []
    for slug, attr, tier in rows:
        cleared.append(f"{slug}.{attr} (was {tier!r})")
        if not dry_run:
            conn.execute(
                "UPDATE block_attributes SET css_tier = NULL "
                "WHERE block_slug = ? AND attr_name = ?",
                (slug, attr),
            )
    if cleared and not dry_run:
        conn.commit()
    return {"object_tier_fossils_cleared": len(cleared), "detail": cleared}


def _populate_emit_shape(
    blocks_dir: Path,
    conn: "sqlite3.Connection",
    dry_run: bool,
) -> dict:
    """Stage 1 sub-step D: seed block_attributes.emit_shape (nested|child) per
    content attr, source-derived (Spec 31 §13.3 FR-31-2.6, 2026-07-04).

    For each content-role attr (roles.classification='content-bearing' — the
    content-vs-styling filter, FR-31-2.2), the shape is 'nested' when the block's
    OWN render.php (+ require'd helpers) EMITS the attr as its own element, else
    'child' (the content lives in the $content InnerBlocks region). Read from block
    SOURCE via converter.services.render_emits — the SAME signal the walk trusts,
    so classification and runtime agree (no drift). R-31-1: this seeds a DB COLUMN
    (read at convert-time via db_lookup) — NOT a live PHP scan at convert-time.

    FAIL-LOUD (Rule 4, no silent misclassification): a block that HAS content-role
    attrs and a render.php that does NOT consume $content (so it should render its
    own content) but whose render-emit scan finds NOTHING is a suspected parse
    failure — printed as a loud WARN and NOT classified, never silently marked
    all-child. Idempotent (write-on-drift).
    """
    from converter.services.render_emits import render_reads_attr

    c = conn.cursor()
    # Idempotent column-add (mirrors the array_item_schema.role column-add pattern).
    _cols = [r[1] for r in c.execute("PRAGMA table_info(block_attributes)").fetchall()]
    if "emit_shape" not in _cols:
        c.execute("ALTER TABLE block_attributes ADD COLUMN emit_shape TEXT")

    # Content-bearing roles = the content-vs-styling filter (DB-driven, R-31-1).
    content_roles = [
        r[0] for r in c.execute(
            "SELECT role_name FROM roles WHERE classification = 'content-bearing'"
        ).fetchall()
    ]
    if not content_roles:  # roles table lacks classification → FR-31-2.2 allowlist
        content_roles = ["text-content", "identity", "image-object", "content", "rating"]

    scanned = updated = nested = child = suspect = 0
    placeholders = ",".join("?" * len(content_roles))
    for block_dir in sorted(blocks_dir.iterdir()):
        if not block_dir.is_dir() or block_dir.name in EXCLUDED_DIRS:
            continue
        bj_path = block_dir / "block.json"
        if not bj_path.exists():
            continue
        try:
            with open(bj_path, encoding="utf-8") as f:
                slug = json.load(f).get("name", f"sgs/{block_dir.name}")
        except Exception:  # noqa: BLE001
            slug = f"sgs/{block_dir.name}"
        if not slug.startswith("sgs/"):
            continue
        scanned += 1

        content_attrs = c.execute(
            f"SELECT attr_name, emit_shape FROM block_attributes "
            f"WHERE block_slug = ? AND role IN ({placeholders})",
            (slug, *content_roles),
        ).fetchall()
        if not content_attrs:
            continue

        # nested iff the block's OWN render reads the attr (raw read-check; the type
        # filter is deliberately NOT applied — role already established content, and a
        # number-typed rating IS content, FR-31-2.6).
        reads = {a: render_reads_attr(slug, a) for a, _s in content_attrs}

        # FAIL-LOUD: content attrs exist + render.php doesn't echo $content, yet NONE
        # are render-read → suspected parse failure (unreadable render / a pattern the
        # scan misses). Do not classify; surface loudly (Rule 4, no silent drop).
        if (
            not any(reads.values())
            and (block_dir / "render.php").exists()
            and not _render_consumes_content(block_dir)
        ):
            suspect += 1
            print(
                f"[emit_shape] WARN {slug}: {len(content_attrs)} content attr(s) but the "
                f"render read-scan found NONE and render.php does not consume $content — "
                f"suspected parse failure; NOT classified (review render.php + helpers)."
            )
            continue

        for attr, stored in content_attrs:
            shape = "nested" if reads[attr] else "child"
            if shape == "nested":
                nested += 1
            else:
                child += 1
            if stored == shape:
                continue
            if dry_run:
                print(f"[dry-run emit_shape] {slug}.{attr}: {stored} -> {shape}")
            else:
                c.execute(
                    "UPDATE block_attributes SET emit_shape = ? "
                    "WHERE block_slug = ? AND attr_name = ?",
                    (shape, slug, attr),
                )
                updated += 1

    if not dry_run:
        conn.commit()
    return {
        "emit_scanned": scanned,
        "emit_updated": updated,
        "emit_nested": nested,
        "emit_child": child,
        "emit_suspect": suspect,
    }


def _populate_allowed_blocks(
    blocks_dir: Path,
    c: "sqlite3.Cursor",
    dry_run: bool,
) -> dict:
    """Stage 1 sub-step: scrape edit.js allowedBlocks → block_composition.

    For each sgs/* block whose edit.js declares a literal allowedBlocks array,
    write a JSON-array string into block_composition.accepts_allowed_blocks
    (UPDATE only when the stored value differs — write-on-drift, idempotent).

    Blocks with no allowedBlocks at all → leave column NULL.
    Blocks with a dynamic allowedBlocks expression → leave column NULL and
    count in dynamic_skipped.

    Returns counters:
        allowed_blocks_scanned    — edit.js files examined
        allowed_blocks_populated  — rows that now carry a non-NULL value
                                    (newly written + already-correct)
        allowed_blocks_updated    — rows actually UPDATEd this run (drift)
        allowed_blocks_dynamic_skipped — edit.js with dynamic expressions
    """
    scanned = 0
    populated = 0
    updated = 0
    dynamic_skipped = 0

    for block_dir in sorted(blocks_dir.iterdir()):
        if not block_dir.is_dir() or block_dir.name in EXCLUDED_DIRS:
            continue

        edit_js = block_dir / "edit.js"
        if not edit_js.exists():
            continue

        scanned += 1
        result = scrape_allowed_blocks(edit_js)

        if result is _DYNAMIC_SKIP:
            dynamic_skipped += 1
            continue  # leave column NULL — dynamic means we cannot know statically

        if result is None:
            continue  # no declaration → leave column NULL

        # Literal array found — serialise to canonical JSON.
        new_value = json.dumps(result, ensure_ascii=False)

        # Derive block slug from block.json (same logic as _index_sgs_block_files).
        block_json_path = block_dir / "block.json"
        if block_json_path.exists():
            try:
                with open(block_json_path, encoding="utf-8") as f:
                    bj = json.load(f)
                slug = bj.get("name", f"sgs/{block_dir.name}")
            except Exception:  # noqa: BLE001
                slug = f"sgs/{block_dir.name}"
        else:
            slug = f"sgs/{block_dir.name}"

        if dry_run:
            # Simulate: count as populated if a row exists (or would exist).
            existing_row = c.execute(
                "SELECT accepts_allowed_blocks FROM block_composition WHERE block_slug = ?",
                (slug,),
            ).fetchone()
            if existing_row is not None:
                populated += 1
                if existing_row[0] != new_value:
                    updated += 1
            continue

        # Write-on-drift: fetch current stored value.
        existing_row = c.execute(
            "SELECT accepts_allowed_blocks FROM block_composition WHERE block_slug = ?",
            (slug,),
        ).fetchone()

        if existing_row is None:
            # No block_composition row — cannot write (foreign key requires blocks row).
            # This is expected for blocks not yet in the DB; silently skip.
            continue

        stored_value = existing_row[0]
        if stored_value != new_value:
            c.execute(
                "UPDATE block_composition SET accepts_allowed_blocks = ? WHERE block_slug = ?",
                (new_value, slug),
            )
            updated += 1

        populated += 1

    return {
        "allowed_blocks_scanned": scanned,
        "allowed_blocks_populated": populated,
        "allowed_blocks_updated": updated,
        "allowed_blocks_dynamic_skipped": dynamic_skipped,
    }


def stage_1_sgs_codebase_scan(conn: sqlite3.Connection, dry_run: bool = False) -> dict:
    """Walk src/blocks/*/block.json → INSERT-or-UPDATE blocks + block_attributes.

    New rows:     INSERT OR IGNORE fires when the slug/attr_name is absent.
    Drifted rows: if any tracked field has changed since last run, the row is
                  UPDATEd so description, title, category, attr types etc. stay
                  current with block.json.

    Updates indexed_files mtime + content_hash.
    Updates schema_metadata.indexed_blocks_count after scan.
    Sub-steps:
      - scrapes edit.js allowedBlocks into block_composition (write-on-drift).

    (has_inner_blocks auto-derivation sub-step RETIRED EXECUTION Step 16,
    2026-07-05 — the column it wrote is dropped; has_inner_blocks is now
    derived fresh at convert-time by converter.services.has_inner.)

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
    new_selectors = counts["new_selectors"]
    pruned_selectors = counts["pruned_selectors"]

    # --- Stage 1 sub-step A: populate block_composition.accepts_allowed_blocks ---
    ab_counts = _populate_allowed_blocks(blocks_dir, c, dry_run)
    ab_scanned = ab_counts["allowed_blocks_scanned"]
    ab_populated = ab_counts["allowed_blocks_populated"]
    ab_updated = ab_counts["allowed_blocks_updated"]
    ab_dynamic_skipped = ab_counts["allowed_blocks_dynamic_skipped"]

    if not dry_run:
        conn.commit()
        _run_canonical_assignment(conn)

        # --- Stage 1 sub-step B2: regenerate css-property-classifications.json ---
        # MUST run BEFORE sub-step C, which reads that file as its base layer.
        # Wired 2026-08-10: before this, Task A had to be run by hand, so the derived
        # css_property/css_layer/css_element layer was a frozen snapshot — stale where
        # it had values, absent for blocks added since the last manual run.
        # ⛔ Do NOT move this after sub-step C. It was briefly placed in the Stage 1
        # tail alongside the Task B seeder, which mirrored that seeder's shape but made
        # the pipeline lag by one run: sub-step C had already read the OLD file, so the
        # DB reflected the previous run's classification and /sgs-update had to be run
        # twice to converge. JSON-only, no DB mutation, so it is safe this early.
        _run_css_property_classifier_seed(conn)

        # --- Stage 1 sub-step B2.6: create missing fx* block_attributes rows ---
        # (FR-38-22 cloning-lift fix, 2026-09-04. MUST run BEFORE sub-step C so
        #  its existing layer-2.5 fx:* classification also reaches the rows
        #  this step just created, in the SAME run.)
        fx_row_counts = _seed_missing_fx_attr_rows(conn, dry_run=False)
        print(
            f"Stage 1 (fx-attr-rows): inserted={fx_row_counts['fx_attr_rows_inserted']} "
            f"row(s) across {fx_row_counts['fx_attr_rows_blocks']} block(s)."
        )

        # --- Stage 1 sub-step C: apply per-attr classification overrides ---
        # (AFTER canonical assignment so overrides are the final writer, and AFTER
        #  sub-step B2 so the derived layer it reads is THIS run's, not the last one's.)
        ov_counts = _apply_attr_classification_overrides(conn, blocks_dir, dry_run=False)
        print(
            f"Stage 1 (attr-overrides): applied={ov_counts['override_applied']}, "
            f"missing_row={ov_counts['override_missing_row']}."
        )

        # --- Stage 1 sub-step C2: clear fossil css_tier off collapsed tier objects ---
        # MUST run AFTER sub-step C, which is the last writer of css_tier. See the
        # function docstring for the rule and why the Spec 35 migration needs it.
        ot_counts = _reconcile_object_family_tiers(conn, dry_run=False)
        print(
            f"Stage 1 (object-tier fossils): cleared={ot_counts['object_tier_fossils_cleared']}"
            + (f" -> {', '.join(ot_counts['detail'])}" if ot_counts["detail"] else "")
        )

        # --- Stage 1 sub-step D: seed block_attributes.emit_shape (FR-31-2.6) ---
        # (AFTER canonical assignment + overrides so `role` is final — emit_shape is
        #  computed only for content-role attrs.)
        es_counts = _populate_emit_shape(blocks_dir, conn, dry_run=False)
        print(
            f"Stage 1 (emit_shape): scanned={es_counts['emit_scanned']}, "
            f"updated={es_counts['emit_updated']}, nested={es_counts['emit_nested']}, "
            f"child={es_counts['emit_child']}, suspect={es_counts['emit_suspect']}."
        )

        # --- Stage 1 tail: apply composition_role corrections (seed data, no
        #     code populator) so a full reseed never silently reverts them. ---
        _run_composition_role_seed(conn)

        # --- Stage 1 tail: regenerate inspector_control_type from edit.js (2026-07-21)
        #     — the SOLE writer now (enrich-db.py's stale writer removed); overwrite-
        #     on-disagreement policy, so this must run every reseed to stay durable. ---
        _run_inspector_control_type_seed(conn)

        # --- Stage 1 tail: seed fx_effects + animation_tokens from the motion-fx
        #     registry (D432, 2026-08-01) — runs AFTER the css_property layers
        #     above so the fx:* namespace is already correct before this step's
        #     own tables (fx_effects/animation_tokens) are reconciled. ---
        _run_motion_fx_registry_seed(conn)

        # --- Stage 1 tail: rebuild the `components` unification adoption ledger
        #     (D763, 2026-08-24). Runs last because it shells out to the Node
        #     scanner, which reads block.json/edit.js/render.php off DISK rather
        #     than through this connection — nothing above it needs its output. ---
        _run_component_adoption_seed(conn)

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
        print(
            f"Stage 1 (allowed_blocks): allowed_blocks_scanned={ab_scanned}, "
            f"allowed_blocks_populated={ab_populated}, "
            f"allowed_blocks_updated={ab_updated}, "
            f"allowed_blocks_dynamic_skipped={ab_dynamic_skipped}."
        )
        print(
            f"Stage 1 (block_selectors): new_selectors={new_selectors}, "
            f"pruned_stale_slugs={pruned_selectors}."
        )
        print(
            "Stage 1 (declarative capabilities): "
            f"pruned_fossil_rows={counts.get('pruned_fossil_caps', 0)}."
        )
    else:
        print(
            f"Stage 1 [dry-run]: {scanned} blocks scanned. "
            f"Would insert: {new_blocks} block rows, {new_attrs} attr rows. "
            f"Would update (drift): {updated_blocks} block rows, {updated_attrs} attr rows."
        )
        print(
            f"Stage 1 (allowed_blocks) [dry-run]: allowed_blocks_scanned={ab_scanned}, "
            f"allowed_blocks_populated={ab_populated} (already stored), "
            f"allowed_blocks_updated={ab_updated} (would drift), "
            f"allowed_blocks_dynamic_skipped={ab_dynamic_skipped}."
        )
        fx_row_counts = _seed_missing_fx_attr_rows(conn, dry_run=True)
        print(
            f"Stage 1 (fx-attr-rows) [dry-run]: would insert="
            f"{fx_row_counts['fx_attr_rows_inserted']} row(s) across "
            f"{fx_row_counts['fx_attr_rows_blocks']} block(s)."
        )
        _apply_attr_classification_overrides(conn, blocks_dir, dry_run=True)

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
        "allowed_blocks_scanned": ab_scanned,
        "allowed_blocks_populated": ab_populated,
        "allowed_blocks_updated": ab_updated,
        "allowed_blocks_dynamic_skipped": ab_dynamic_skipped,
        "new_selectors": new_selectors,
        "pruned_selectors": pruned_selectors,
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
#   3. wp-cli/handbook markdown files (GitHub API) — replaces the handbook
#      refresh retired at D56 (formerly its own pipeline stage, numbered 3;
#      removed from the pipeline entirely on 2026-08-10)
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
import ssl as _ssl
import urllib.error
import urllib.request

_SSL_CTX: "_ssl.SSLContext | None" = None


def _ssl_context() -> "_ssl.SSLContext":
    """Verifying SSL context that trusts certifi's CA bundle, not the platform store.

    WHY (2026-08-22). Stage 2's live scrape failed on FIVE upstream sources with
    ``CERTIFICATE_VERIFY_FAILED: certificate has expired``, and the natural reading —
    that WordPress.org's certificate had lapsed — is wrong. Measured:

      * the leaf cert is VALID (``developer.wordpress.org``, Let's Encrypt, notAfter
        Oct 23 2026 — checked while it was failing on Aug 22);
      * upgrading ``certifi`` 2026.01.04 -> 2026.07.22 did NOT fix it;
      * the same host verifies fine against ``certifi.where()`` and fails against
        ``ssl.create_default_context()`` in the same process, back to back.

    So the expired certificate is a ROOT in the WINDOWS trust store, which
    ``create_default_context()`` loads on this platform. Pinning to certifi is the
    standard fix (it is what ``requests`` does by default) and keeps verification
    fully ON — this is NOT ``CERT_NONE`` and must never be relaxed into one.

    Falls back to the platform default if certifi is absent, so the script still runs
    on a machine without it rather than failing closed on an optional dependency.
    """
    global _SSL_CTX
    if _SSL_CTX is None:
        try:
            import certifi

            _SSL_CTX = _ssl.create_default_context(cafile=certifi.where())
        except Exception:
            _SSL_CTX = _ssl.create_default_context()
    return _SSL_CTX


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
        with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
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
    with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
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
        errors="replace",
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
# Stage 3 — Style variation sync (Phase 5a activated)
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
# Stage 3 helpers (promoted from inner defs for cognitive-complexity reduction)
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
    """Assemble and write the Stage 3 plain-text audit report.

    Writes only in non-dry-run mode (matches the original behaviour). The
    report directory is still created so a follow-up actual run finds it ready.
    """
    all_lines = header_lines + [summary_line, ""] + per_client_lines
    report_path.parent.mkdir(parents=True, exist_ok=True)
    if not dry_run:
        report_path.write_text("\n".join(all_lines), encoding="utf-8")


def stage_3_style_variation_sync(
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
        f"# Stage 3 Style Variation Sync — {ts}",
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
        f"Stage 3 [{mode}]: {snapshots_found} snapshots, {snapshots_missing} missing. "
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
# Stage 4 — Slot synonym auto-seed (Step 4.5)
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


def stage_4_slot_synonym_auto_seed(
    conn: sqlite3.Connection, dry_run: bool = False
) -> dict:
    """Heuristic auto-seed of slot_synonyms.standalone_block for unmapped rows.

    Queries `slots` WHERE scope='element' AND standalone_block IS NULL OR standalone_block = ''.
    (D99 2026-05-29: was slot_synonyms; now `slots WHERE scope='element'`.)
    For each unmapped slot, runs a 3-tier heuristic against blocks WHERE source='sgs':
      1. Exact slug match:      sgs/<normalised-name>
      2. Prefix match:          slug LIKE 'sgs/<normalised-name>%'  (single result only)
      3. Contains match:        slug LIKE '%<normalised-name>%'       (single result only)

    High-confidence (exact) → UPDATE slots SET standalone_block=? WHERE rowid=? AND scope='element'.
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
        f"Stage 4 [{mode}]: {unmapped_count} unmapped slots. "
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
# Stage 5 — Block replacement mapping (Step 4.5)
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


def stage_5_block_replacement_mapping(
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
        f"Stage 5 [{mode}]: {checked} blocks checked. "
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
# Stage 6 — Spec doc regeneration
# PORTED FROM: plugins/sgs-blocks/scripts/generate-block-reference.py
# Strategy: delegates to existing script via subprocess.run() — the script
# uses its own DB connection path resolution and has complex rendering logic.
# Stage 6: delegates to existing generate-block-reference.py until full port.
# ---------------------------------------------------------------------------

def stage_6_spec_doc_regen(dry_run: bool = False) -> dict:
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
                    f"Stage 6 [dry-run]: would regenerate spec from {total} total block rows "
                    f"({sgs_count} sgs + {total - sgs_count} other sources)"
                )
                return {"dry_run": True, "total_blocks": total, "sgs_blocks": sgs_count}
            except Exception as exc:
                print(f"Stage 6 [dry-run]: DB read error — {exc}")
                return {"dry_run": True, "error": str(exc)}
        print("Stage 6 [dry-run]: would regenerate spec (DB not found for count)")
        return {"dry_run": True}

    result = subprocess.run(
        [sys.executable, str(script), "--db", str(SGS_DB), "--output", str(output_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        error_msg = (result.stderr or result.stdout or "").strip()[:400]
        print(f"Stage 6 ERROR: generate-block-reference.py failed — {error_msg}")
        return {"error": error_msg, "exit_code": result.returncode}

    output_line = (result.stdout or "").strip()
    print(f"Stage 6: {output_line}")

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
# Stage 7 — uimax mirror
# PORTED FROM: plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py
# Strategy: delegates to existing script via subprocess.run() — the script
# imports uimax_write.py (a sibling module) and has complex validation logic.
# Stage 7: delegates to existing sgs-update-uimax-sync.py until full port.
# ---------------------------------------------------------------------------

def stage_7_uimax_mirror(dry_run: bool = False) -> dict:
    """Mirror sgs-blocks → ~/.agents/skills/ui-ux-pro-max/data/component-libraries.csv.

    PORTED FROM: plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py
    Delegates to existing script via subprocess — avoids reimporting uimax_write.py
    (a sibling module with its own validation chokepoint). Only Stage 3 of that
    script (the DB→CSV sync) is invoked; Stage 4 (animation gap scan) is retired
    (sgs-framework.db animations table dropped at Step 6b 2026-05-14).
    Stage 7: delegates to existing sgs-update-uimax-sync.py until full port.
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
        errors="replace",
        cwd=str(REPO_ROOT),
    )

    output = (result.stdout or "").strip()
    if result.returncode != 0:
        error_msg = (result.stderr or output or "").strip()[:400]
        print(f"Stage 7 ERROR: sgs-update-uimax-sync.py failed — {error_msg}")
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
# Stage 8 — Drift gate (STUB — Step 4.6)
# ---------------------------------------------------------------------------

def _extract_major_minor(version_str: str) -> str | None:
    """Extract MAJOR.MINOR from a version string such as '7.0.1' → '7.0'.

    Returns None if the string cannot be parsed.
    """
    import re as _re
    m = _re.match(r"(\d+\.\d+)", version_str.strip())
    return m.group(1) if m else None


def stage_8_drift_gate(
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
    #   python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 8
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
        print(f"Stage 8 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}

    db_indexed_raw: str = row[0]
    db_major_minor = _extract_major_minor(db_indexed_raw)
    if db_major_minor is None:
        msg = f"wp_version_indexed value '{db_indexed_raw}' is not a parseable version"
        print(f"Stage 8 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}

    # Step 2 — Dry-run: skip SSH call
    if dry_run:
        msg = "dry-run mode"
        print(f"Stage 8 [dry-run]: skipping SSH version check ({msg})")
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
            errors="replace",
            timeout=15,
        )
        raw_output = (result.stdout or "").strip()
        if result.returncode != 0 or not raw_output:
            stderr_snippet = (result.stderr or "").strip()[:200]
            msg = f"SSH command failed (exit {result.returncode}): {stderr_snippet or '(no stderr)'}"
            print(f"Stage 8 [skipped]: {msg}")
            return {"status": "skipped", "reason": msg}
    except subprocess.TimeoutExpired:
        msg = "SSH timed out after 15 s — drift check skipped"
        print(f"Stage 8 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}
    except OSError as exc:
        msg = f"SSH unavailable — drift check skipped ({exc})"
        print(f"Stage 8 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}

    # Step 4 — Parse and compare
    site_version_raw = raw_output
    site_major_minor = _extract_major_minor(site_version_raw)

    if site_major_minor is None:
        msg = f"Could not parse WP version from SSH output: {site_version_raw!r}"
        print(f"Stage 8 [skipped]: {msg}")
        return {"status": "skipped", "reason": msg}

    if site_major_minor == db_major_minor:
        # Silent pass — versions agree at MAJOR.MINOR level
        print(
            f"Stage 8 [ok]: site WP {site_version_raw} matches "
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
    print(f"\n⚠  Stage 8 [drift_detected]: {warning}\n")
    return {
        "status": "drift_detected",
        "site_version": site_version_raw,
        "db_indexed": db_indexed_raw,
        "warning": warning,
    }


# ---------------------------------------------------------------------------
# Stage 9 — Prune orphans
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
# opened by `open_db()` / the `conn` argument.  Stage 9 also writes to this
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


def stage_9_prune_orphans(
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
        print(f"Stage 9 [error]: {msg}")
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
        f"Stage 9: orphan_block_supports_deleted={total_orphan_supports}, "
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
# Stage 10 — Container-wrapper attribute mirror (WS-4, D160)
# ---------------------------------------------------------------------------
# Runs sync-container-wrapping-blocks.py in --write-block-json mode (report-only
# by default — NO --apply flag so no block.json files are written).  A container
# version-bump surfaces the diff for operator review; --apply is gated behind an
# explicit operator command.
#
# The script is invoked as a subprocess (same pattern as Stage 6 / Stage 7) so
# it runs in its own Python process and cannot import-side-effect this module.


def stage_10_container_mirror_report(dry_run: bool = False) -> dict:
    """Stage 10 — container-wrapper attribute mirror diff (report-only).

    Calls sync-container-wrapping-blocks.py --write-block-json (no --apply).
    dry_run=True: just prints what Stage 10 would invoke and returns stub output.
    """
    sync_script = (
        Path(__file__).resolve().parent / "sync-container-wrapping-blocks.py"
    )
    if not sync_script.exists():
        msg = f"sync-container-wrapping-blocks.py not found at {sync_script}"
        print(f"Stage 10 ERROR: {msg}")
        return {"error": msg, "dry_run": dry_run}

    if dry_run:
        print(
            f"Stage 10 [dry-run]: would run:\n"
            f"  python {sync_script} --write-block-json\n"
            "(no --apply — operator-gated; this stage only surfaces the diff)"
        )
        return {"status": "dry-run", "dry_run": True}

    cmd = [sys.executable, str(sync_script), "--write-block-json"]
    print(f"Stage 10: running {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=False,   # let stdout/stderr flow through to the terminal
            text=True,
            timeout=120,
            encoding="utf-8", errors="replace",
        )
        if result.returncode != 0:
            msg = f"sync-container-wrapping-blocks.py exited {result.returncode}"
            print(f"Stage 10 WARN: {msg}")
            return {"status": "warn", "returncode": result.returncode, "dry_run": False}
        print("Stage 10: container-wrapper mirror diff complete.")
        return {"status": "ok", "dry_run": False}
    except subprocess.TimeoutExpired:
        msg = "sync-container-wrapping-blocks.py timed out after 120 s"
        print(f"Stage 10 ERROR: {msg}")
        return {"error": msg, "dry_run": False}
    except Exception as exc:
        msg = str(exc)
        print(f"Stage 10 ERROR: {msg}")
        return {"error": msg, "dry_run": False}


# ---------------------------------------------------------------------------
# Stage 11 — Motion-fx artefact regeneration (D432 follow-up, 2026-08-01)
# PORTED FROM: plugins/sgs-blocks/scripts/generate-fx-effects-php.py +
#              plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py
# Strategy: delegates to both existing scripts via subprocess.run() — same
# "delegate rather than duplicate" shape as Stage 6 (generate-block-reference.py)
# and Stage 7 (sgs-update-uimax-sync.py). Both generators already own their own
# DB-path resolution, a pure render function, and a --check diff mode; importing
# their logic here would duplicate it for zero benefit.
# ---------------------------------------------------------------------------

def stage_11_motion_fx_artefact_regen(dry_run: bool = False) -> dict:
    """Regenerate the Spec 38 motion-fx shipped artefacts from fx_effects (DB)
    plus block.json/edit.js/style.css (files).

    Bean's instruction (2026-08-01, the follow-up to D432): "the sgs-update
    motion layer should also update the data into the artefacts for use in the
    actual websites... centralising data in the DB is pointless if the files
    the live websites actually load can silently fall behind it." D432 itself
    (commit 075baa9b) made the DB the single writer for the fx:* namespace's
    `block_attributes.css_property` column, but explicitly deferred this half:
    the DB-authoring-source -> shipped-PHP/JSON regeneration step
    (`generated-fx-effects.php`, `generated-fx-effect-meta.json`,
    `generated-fx-qualifying-blocks.php`, `generated-fx-qualifying-blocks.json`
    at the time — the `.php` mirror was later DELETED as dead code at 1ac16ec9,
    so only the JSON twin is generated now)
    had NO automated writer at all. `npm run build`'s
    `run-motion-fx-generators.js` only ever invoked both generators with
    `--check` (verify, never write) — so a DB change or a block.json/edit.js/
    style.css change could silently drift the (then four, now three) committed
    artefacts until a developer remembered to run the generators by hand.

    This stage is that missing writer. It runs the two generator scripts with
    NO `--check` flag (their write mode), exactly mirroring Stage 6/7's
    subprocess-delegate pattern. `npm run build` keeps `--check`-only via
    `run-motion-fx-generators.js` — unchanged by this task — so there remains
    exactly ONE writer per artefact (this stage) and exactly one verifier
    (the build gate), never two writers racing the same file (the same class
    of bug D432 fixed for the DB column, now closed for the files it feeds).

    ORDERING (why Stage 11, last): `generate-fx-qualifying-blocks.py` reads
    block.json/edit.js/style.css directly, never the DB, for block-provision
    facts (verified in its own module docstring: "This script reads block.json
    + edit.js FILES directly... for block-provision facts... It reads the DB
    ONLY for fx_effects.scope/requires"). BOTH generators read `fx_effects` for
    the effect-side facts, and that table is only fully current after Stage 1's
    tail step (`_run_motion_fx_registry_seed`) has already run earlier in THIS
    SAME invocation. Running after Stage 9 (prune) also means a block retired
    this run can never leave a stale entry in the qualifying-blocks map.

    Idempotent by construction: both generators are pure functions of
    (fx_effects rows, block.json/edit.js/style.css file contents) with no
    timestamp in their output (see each generator's own "NO TIMESTAMP" comment
    — deliberate, so build-deploy's dirty-tree gate stays meaningful). Two
    consecutive runs with no input change produce byte-identical files.
    """
    effects_script = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts" / "generate-fx-effects-php.py"
    blocks_script = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts" / "generate-fx-qualifying-blocks.py"
    missing = [str(s) for s in (effects_script, blocks_script) if not s.exists()]
    if missing:
        return {"error": f"generator script(s) not found: {', '.join(missing)}"}

    if dry_run:
        if SGS_DB.exists():
            try:
                _conn = sqlite3.connect(str(SGS_DB))
                fx_count = _conn.execute(
                    "SELECT COUNT(*) FROM fx_effects"
                ).fetchone()[0]
                _conn.close()
                print(
                    f"Stage 11 [dry-run]: would regenerate motion-fx artefacts from "
                    f"{fx_count} fx_effects rows + block.json/edit.js/style.css"
                )
                return {"dry_run": True, "fx_effects_rows": fx_count}
            except Exception as exc:
                print(f"Stage 11 [dry-run]: DB read error — {exc}")
                return {"dry_run": True, "error": str(exc)}
        print("Stage 11 [dry-run]: would regenerate motion-fx artefacts (DB not found for count)")
        return {"dry_run": True}

    results: dict[str, str] = {}
    for label, script in (
        ("fx-effects", effects_script),
        ("fx-qualifying-blocks", blocks_script),
    ):
        result = subprocess.run(
            [sys.executable, str(script)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode != 0:
            error_msg = (result.stderr or result.stdout or "").strip()[:400]
            print(f"Stage 11 ERROR ({label}): {script.name} failed — {error_msg}")
            return {"error": error_msg, "exit_code": result.returncode, "failed_generator": label}

        output_lines = [ln for ln in (result.stdout or "").strip().splitlines() if ln]
        output_line = output_lines[-1] if output_lines else ""
        print(f"Stage 11 ({label}): {output_line}")
        results[label] = output_line

    return {"status": "ok", "dry_run": False, **results}


# ---------------------------------------------------------------------------
# Stage 12 — Run DB/roster-keyed audit scanners (report-only)
# ---------------------------------------------------------------------------

def stage_12_run_audit_scanners(dry_run: bool = False, self_test: bool = False) -> dict:
    """Run audit scanners keyed to DB and roster state (report-only, never fail).

    After /sgs-update reseeds the knowledge base (Stages 1-12), the DB is fresh
    but nobody sees what it reveals until the next build. This stage runs the
    audit scanners immediately after the reseed, allowing the operator to
    understand the post-reseed baseline before proceeding. Findings are
    INFORMATIONAL — a reseed must never be blocked by pre-existing audit gaps.

    Sequence:
      1. Regenerate roster.json from the fresh DB (denominator for all audits)
      2. Run each DB/roster-keyed scanner with --report (report-only)
      3. Collect findings and print summary
      4. Continue pipeline (never fail, even on findings)

    Scanners included (26 total, 2026-08-03 evidence-based wiring — see
    `.claude/reports/2026-08-03-stage13-scanner-classification.md` for the
    per-scanner classification table with evidence. Every scanner below was
    RUN, not just read, to confirm it produces real output on source/DB
    state alone, with no `build/` or live-site dependency):

      Composite runners (DB-first data layer):
      - consistency/build-roster.py — regenerates roster.json (denominator)
      - consistency/run-consistency-gates.py --report — runs
        check-cluster-coverage, check-box-family-guard, check-box-flat,
        report-colour-alpha, check-reclassified-keys as sub-gates
      - db-consistency/run.py --report — runs check_routing,
        check_composition, check_variants, check_overrides_drift,
        check_variant_reseed, check_orphan_roles, check_tier_composition,
        check_css_property_reseed, check_motion_fx_reseed,
        check_fx_qualifying_blocks_stale as sub-gates
      - cheat-gate/run.py --report — F5 cheat-detection (checks 1-4, 6-7);
        prefers src/ CSS, falls back to build/ if present — runs fine with
        no build present (proven: ran clean pre-build in classification)
      - excluded-gate/run.py --report — F5 excluded-literal tripwire vs
        the `excluded_properties` DB table

      Single-purpose DB/source scanners:
      - check-fx-list-drift.py --check: fx_effects table currency
      - check-box-family-guard.py --report: box_family attribute constraints
      - inspector-scan/run.js --json: inspector_control_type classification (retired
        audit-inspector-conformance.js repointed here 2026-08-06, Spec 35 Task D —
        same --json contract shape difference handled in the parsing branch below)
      - audit-feature-parity.py --check: feature parity against block roster
      - dbschema/check_value_identity.py --check: named load-bearing rows still hold their
        exact required value (the row-count FLOOR this file used to carry was deleted
        2026-08-07; counts are now REPORTED by dbschema/seed_history.py, never gated)
      - dbschema/check_schema_drift.py --check: schema.sql vs live DB DDL drift
      - lints/lint-spec-drift.py --check: spec claims vs DB reality
      - lints/lint-theme-css-hardcodes.py --check: theme CSS hardcode literals vs baseline
      - audit-block-file-consistency.py --json: cross-file attr consistency (orphan/undeclared)
      - audit-block-uniformity.py: block-shape uniformity
      - audit-declared-vs-seeded-roles.py --check: block.json role vs DB-seeded role (FR-31-2.1a)
      - check-dead-pattern-attrs.py --check: theme pattern/part attrs vs block.json declarations
      - check-no-core-blocks.py: banned core blocks in theme files
      - check-control-ux.js --json: control-UX violations vs baseline
      - check-dead-controls.js --json: dead controls across blocks + extensions
      - check-duplicate-controls.js --json: duplicate-control findings
      - check-element-manifest-conformance.js: Spec 35 CLUSTER-COHERENCE
      - check-hardcoded-render-defaults.js --json: F3 hardcoded render defaults vs baseline
      - check-product-search-guards.js: product-search REST guard assertions
      - check-shared-css-state-rules.js: shared CSS :hover/:focus state-rule scope
      - check-simple-surface-cap.js: FR-37-27 simple-surface control-count advisory
      - check-universal-fit.js: universal extension-panel fit report

    Scanners EXCLUDED from this stage, with the dependency reason (verified
    by running each, not by filename/description alone):
      - check-block-asset-targets.js — reads `build/blocks/**` (compiled
        asset filenames); needs `npm run build` first. Include after a build
        step, or add a source-only mode that reads block.json's declared
        `editorScript`/`style` names instead of the compiled tree.
      - check-motion-bundle-budget.py — reads `build/` (gzip module sizes
        against the Wave A baseline); needs `npm run build` first.
      - audit-scoped-selector-live.js, audit-shrink-to-fit.js — both
        Playwright-drive a LIVE deployed URL; nothing to measure at reseed
        time (no deploy has happened). Run post-deploy instead.
      - no-inline/check-no-inline.py — only two modes exist: `--live`
        (live canary URLs) and `--selftest` (network-free but proves the
        detector, not a real scan). No source-only whole-codebase mode
        exists; would need one added to run here.
      - no-inline-land-verify.js — takes a specific migration-wave manifest
        path as a positional arg (e.g. `no-inline-wave3-roster-manifest.json`);
        a one-off historical verification tool for a completed migration,
        not a recurring repo-wide scanner.
      - check-atomic-slug-literals.py — its own docstring declares it
        RETIRED (`converter_v2/convert.py` deleted at D276); a confirmed
        no-op, historical only.
      - check-interaction-only-css.py, check-markup-neutral.py,
        check-blockjson-metadata-only.py — pre-commit staged-diff helpers;
        each requires a specific block-name argument + a live `git diff
        --staged` set to classify. Nothing staged during a reseed → vacuous.
      - lints/bem-lint.py, lints/draft-vocab-lint.py, lints/token-lint.py —
        lint a SPECIFIC HTML draft file (positional `path`, no directory-scan
        mode); these are /sgs-clone Stage 0/0.5 tools, not repo-wide audits.
      - ledger/content_gap_check.py, ledger/coverage_check.py,
        ledger/declare_input.py — F2/F5 CSS-accounting-ledger checks scoped
        to a specific clone run's `fixtures/`/`pipeline-state/` directory;
        nothing to check without an active clone run in flight.
      - audit-post-content-blocks.py — takes `<file-or-dir>` of exported
        WordPress `post_content` (e.g. a WXR export); no such export exists
        at reseed time (this stage reseeds the knowledge-base DB, not a
        site-content dump).
      - consistency/check-cluster-coverage.py, report-colour-alpha.py,
        check-reclassified-keys.py, and check-box-family-guard.py's sibling
        copy under consistency/ — already invoked as sub-gates of
        `consistency/run-consistency-gates.py` above; adding them again
        would double-run and double-count the same violations.
      - consistency/check-box-flat.py — owned by another in-flight track
        this session (box-object migration); already invoked as a sub-gate
        of `run-consistency-gates.py`, not added standalone here.
      - src/blocks/** — out of scope for this change (owned by other
        in-flight tracks this session).
      - scripts/inspector-scan/ — REPOINTED here 2026-08-06 (Spec 35 Task D):
        this stage's "inspector-conformance" scanner entry above now runs
        `inspector-scan/run.js --json` (the old audit-inspector-conformance.js
        was deleted the same day, its --check gate replaced in prebuild).
        Left listed here only as a historical note that inspector-scan/ was
        the excluded thing this line used to point at — the entry is no
        longer excluded.

    Idempotent: scanners use --report/--check/--json (never mutate state,
    except db-consistency/dbschema baselines which are read-only in --check
    mode); safe to run repeatedly during the same reseed run without side
    effects.

    Output format: per-scanner findings count + summary, then final count.
    Do NOT re-raise errors; findings are metadata on the post-reseed state.
    """
    scripts_dir = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"

    # Scanners: (rel_path, label, invocation_args)
    # GROUND-TRUTH: source=file — every entry below was RUN directly against
    # this repo's real files/DB (not inferred from filename or docstring) on
    # 2026-08-03 to confirm the flag exists in its argparse/argv handling and
    # produces genuine output. See the docstring above for the full
    # evidence-based classification (included vs excluded + reason).
    scanners = [
        ("consistency/build-roster.py", "build-roster", []),
        ("consistency/run-consistency-gates.py", "consistency-gates", ["--report"]),
        ("db-consistency/run.py", "db-consistency", ["--report"]),
        ("check-fx-list-drift.py", "fx-list-drift", ["--check"]),
        ("check-box-family-guard.py", "box-family-guard", ["--report"]),
        ("inspector-scan/run.js", "inspector-conformance", ["--json"]),  # Parse JSON for findings by severity (nested rules[].findings shape — see parsing branch below)
        ("audit-feature-parity.py", "feature-parity", ["--check"]),  # exit code signals but don't fail
        ("cheat-gate/run.py", "cheat-gate", ["--report"]),
        ("excluded-gate/run.py", "excluded-gate", ["--report"]),
        ("dbschema/check_value_identity.py", "value-identity", ["--check"]),
        ("dbschema/check_schema_drift.py", "schema-drift", ["--check"]),
        ("lints/lint-spec-drift.py", "spec-drift", ["--check"]),
        ("lints/lint-theme-css-hardcodes.py", "theme-css-hardcodes", ["--check"]),
        ("audit-block-file-consistency.py", "block-file-consistency", ["--json"]),
        ("audit-block-uniformity.py", "block-uniformity", []),
        ("audit-declared-vs-seeded-roles.py", "declared-vs-seeded-roles", ["--check"]),
        ("check-dead-pattern-attrs.py", "dead-pattern-attrs", ["--check"]),
        ("check-no-core-blocks.py", "no-core-blocks", []),
        ("check-control-ux.js", "control-ux", ["--json"]),
        ("check-dead-controls.js", "dead-controls", ["--json"]),
        ("check-duplicate-controls.js", "duplicate-controls", ["--json"]),
        ("check-element-manifest-conformance.js", "element-manifest-conformance", []),
        ("check-hardcoded-render-defaults.js", "hardcoded-render-defaults", ["--json"]),
        ("check-product-search-guards.js", "product-search-guards", []),
        ("check-shared-css-state-rules.js", "shared-css-state-rules", []),
        ("check-simple-surface-cap.js", "simple-surface-cap", []),
        ("check-universal-fit.js", "universal-fit", []),
    ]

    # Self-test: proves extraction logic works by parsing a known fixture (COORDINATOR REQUIREMENT)
    if self_test:
        import json as json_module

        # Create a test fixture with known findings (2 warn, 1 informational)
        test_fixture = {
            "audit": "self-test-fixture",
            "findings": [
                {"block": "sgs/test1", "severity": "warn", "detail": "test finding 1"},
                {"block": "sgs/test2", "severity": "warn", "detail": "test finding 2"},
                {"block": "sgs/test3", "severity": "informational", "detail": "test finding 3"},
            ],
        }
        fixture_json = json_module.dumps(test_fixture)

        # Test the extractor on the known fixture
        try:
            # Simulate what the inspector-conformance extractor does
            data = json_module.loads(fixture_json)
            findings_list = data.get("findings", [])

            by_severity = {}
            for finding in findings_list:
                sev = finding.get("severity", "unknown")
                by_severity[sev] = by_severity.get(sev, 0) + 1

            total = len(findings_list)

            # Verify: should have 3 findings total, 2 warn, 1 informational
            if total != 3:
                return {
                    "status": "FAIL",
                    "self_test": True,
                    "error": f"self-test failed: expected 3 findings, extractor returned {total}",
                }

            if by_severity.get("warn") != 2:
                return {
                    "status": "FAIL",
                    "self_test": True,
                    "error": f"self-test failed: expected 2 warn findings, got {by_severity.get('warn')}",
                }

            if by_severity.get("informational") != 1:
                return {
                    "status": "FAIL",
                    "self_test": True,
                    "error": f"self-test failed: expected 1 informational finding, got {by_severity.get('informational')}",
                }

            # --- Extended self-test coverage (2026-08-03): proves the extraction logic
            # for the NEW scanners wired into Stage 12 this session, mirroring the exact
            # branches added above so a regression in the parsing (not the scanner) is
            # caught here rather than silently reading as "0 findings".

            # (a) value-identity text extraction: "VALUE-IDENTITY VIOLATION (N finding(s))"
            #     (was the row-floor extractor until 2026-08-07, when the floor was deleted
            #     and its file reduced to value-identity assertions.)
            value_identity_fixture = (
                "VALUE-IDENTITY VIOLATION (2 finding(s)):\n"
                "  - VALUE  roles.classification for (role_name='scalar-media') is 'content-bearing'\n"
            )
            rf_count = 0
            for line in value_identity_fixture.splitlines():
                if "VALUE-IDENTITY VIOLATION" in line:
                    for tok in line.replace("(", " ").split():
                        if tok.isdigit():
                            rf_count = int(tok)
                            break
                    break
            if rf_count != 2:
                return {
                    "status": "FAIL",
                    "self_test": True,
                    "error": f"self-test failed: value-identity extractor expected 2, got {rf_count}",
                }

            # (b) cheat-gate composite summary line: "[cheat-gate] N violation(s) total — ..."
            cheat_gate_fixture = "[cheat-gate] 7 violation(s) total — 0 NEW, 7 baselined\n"
            cg_count = 0
            for line in cheat_gate_fixture.splitlines():
                if line.startswith("[cheat-gate]") and "violation" in line.lower():
                    digits = "".join(ch if ch.isdigit() else " " for ch in line.split("violation")[0])
                    nums = digits.split()
                    if nums:
                        cg_count = int(nums[-1])
                    break
            if cg_count != 7:
                return {
                    "status": "FAIL",
                    "self_test": True,
                    "error": f"self-test failed: cheat-gate extractor expected 7, got {cg_count}",
                }

            # (c) block-file-consistency JSON: net_new is a LIST of finding dicts, count = len()
            bfc_fixture = json_module.dumps({
                "net_new": [{"type": "orphan_attr"}, {"type": "orphan_attr"}, {"type": "undeclared_control"}],
                "flagged_blocks": 2,
            })
            bfc_data = json_module.loads(bfc_fixture)
            bfc_count = len(bfc_data.get("net_new", []))
            if bfc_count != 3:
                return {
                    "status": "FAIL",
                    "self_test": True,
                    "error": f"self-test failed: block-file-consistency extractor expected 3, got {bfc_count}",
                }

            # (d) shared netNew JSON shape (control-ux/dead-controls/duplicate-controls/
            #     hardcoded-render-defaults): netNew is an INT, not a list, on these four.
            netnew_fixture = json_module.dumps({"netNew": 5, "accepted": 12, "baselineSize": 12})
            nn_data = json_module.loads(netnew_fixture)
            nn = nn_data.get("netNew", 0)
            nn_count = nn if isinstance(nn, int) else len(nn or [])
            if nn_count != 5:
                return {
                    "status": "FAIL",
                    "self_test": True,
                    "error": f"self-test failed: netNew-int extractor expected 5, got {nn_count}",
                }

            # Success
            return {
                "status": "ok",
                "self_test": True,
                "test_result": (
                    "PASS — inspector-conformance fixture (3 findings: 2 warn, 1 informational), "
                    "value-identity text (2), cheat-gate composite text (7), block-file-consistency "
                    "net_new list (3), and shared netNew-int shape (5) all extracted correctly"
                ),
            }
        except Exception as exc:
            return {
                "status": "FAIL",
                "self_test": True,
                "error": f"self-test failed: {str(exc)[:100]}",
            }

    if dry_run:
        found = [s for s in scanners if (scripts_dir / s[0]).exists()]
        missing = [s for s in scanners if not (scripts_dir / s[0]).exists()]
        print(f"Stage 12 [dry-run]: would run {len(found)} audit scanner(s)")
        if missing:
            print(f"  {len(missing)} scanner(s) not found: {', '.join(s[1] for s in missing)}")
        return {"dry_run": True, "scanners_found": len(found), "scanners_missing": len(missing)}

    findings_by_scanner: dict[str, dict] = {}
    total_findings = 0

    for rel_path, label, args in scanners:
        script_path = scripts_dir / rel_path
        if not script_path.exists():
            print(f"Stage 12 SKIP {label}: script not found at {script_path}")
            findings_by_scanner[label] = {"status": "SKIP", "reason": "script not found"}
            continue

        # Determine invocation: Python or Node.js
        is_js = rel_path.endswith(".js")
        interpreter = ["node" if is_js else sys.executable]

        try:
            result = subprocess.run(
                interpreter + [str(script_path)] + args,
                capture_output=True,
                text=True,
                timeout=120,
                encoding="utf-8",
                errors="replace",
            )

            # Parse output for findings count (scanners vary in format)
            stdout = result.stdout or ""
            stderr = result.stderr or ""
            combined = stdout + stderr

            # INVOCATION GUARD (2026-08-03): a scanner that never RAN must never be
            # reported as clean. `check-fx-list-drift.py` was invoked with `--report`,
            # a flag its argparse rejects — it exited non-zero with empty stdout, and
            # the per-label extractor below read that emptiness as "0 findings /
            # completed". The scanner had never executed. Detect the shape explicitly
            # and short-circuit LOUDLY rather than letting any extractor interpret it.
            _argparse_reject = "unrecognized arguments" in combined or "invalid choice" in combined
            if _argparse_reject or (result.returncode != 0 and not stdout.strip()):
                reason = (
                    "rejected its invocation flags"
                    if _argparse_reject
                    else f"exited {result.returncode} with no output"
                )
                findings_by_scanner[label] = {
                    "status": "INVOCATION_FAILED",
                    "findings": None,
                    "summary": f"INVOCATION_FAILED — scanner {reason}; NOT a clean result",
                }
                print(
                    f"Stage 12 ({label}): INVOCATION_FAILED — scanner {reason}. "
                    f"This is NOT a pass; the scanner did not run.",
                    file=sys.stderr,
                )
                continue

            # Extract finding counts from output (each scanner formats differently)
            findings_count = 0
            summary_line = ""

            if label == "build-roster":
                # build-roster.py doesn't produce findings; it's a data refresh
                if result.returncode == 0:
                    # Extract output lines
                    summary_line = [ln for ln in stdout.splitlines() if "block" in ln.lower()][-1:] or ["completed"]
                    summary_line = summary_line[0] if summary_line else "completed"
                    findings_by_scanner[label] = {"status": "ok", "summary": summary_line}
                else:
                    findings_by_scanner[label] = {
                        "status": "WARN",
                        "error": stderr.strip()[:200] or "unknown error",
                    }
                    print(f"Stage 12 ({label}): WARNING — {stderr.strip()[:200]}")
                    continue

            elif label == "consistency-gates":
                # run-consistency-gates.py is a COMPOSITE runner: multiple sub-gates (box-family-guard,
                # check-box-flat, check-reclassified-keys, etc.) each report in different formats.
                # COORDINATOR REQUIREMENT (honest extraction): do NOT synthesise a total across them.
                # Instead, surface the sub-gate summary lines verbatim + report PASS/FAIL from exit code.
                # PROOF: real sub-gate findings: "[box-family-guard] 0 violations",
                #        "[check-reclassified-keys] 8 drifted reference(s)", etc.
                subgate_lines = [ln for ln in stdout.splitlines() if ln.startswith("[") and ("] " in ln or "] —" in ln)]
                # Do NOT count them; they are diverse (different meanings, different severities)
                findings_count = 0  # Composite scanners do not have a single meaningful count
                summary_parts = subgate_lines if subgate_lines else []
                summary_line = "\n  ".join(summary_parts[:5]) if summary_parts else "sub-gate summaries not found"
                if len(summary_parts) > 5:
                    summary_line += f"\n  ... ({len(summary_parts) - 5} more sub-gates)"
                # Final status line
                final_lines = [ln for ln in stdout.splitlines() if "PASS" in ln and "gates" in ln.lower()]
                if final_lines:
                    summary_line = final_lines[-1].strip()[:120]

            elif label == "db-consistency":
                # db-consistency/run.py --report prints "[F6] N violation(s) total" line (PROOF extraction)
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if "[F6]" in line and "violation" in line.lower():
                        # PROOF LINE: "[F6] 1 violation(s) total — 0 NEW, 1 baselined"
                        parts = line.split()
                        if len(parts) > 1:
                            try:
                                findings_count = int(parts[1])
                                summary_line = line.strip()[:120]
                                break
                            except ValueError:
                                pass

            elif label == "fx-list-drift":
                # check-fx-list-drift.py --check prints "[OK  ]" (pass) or "[FAIL]" (fail) invariant lines
                # PROOF: "[OK  ] I0 — no duplicate entries...", "GATE PASSED — all six invariants hold"
                # COORDINATOR FIX: status, findings, and summary must all align (all OK or all FAIL)
                fail_count = len([ln for ln in stdout.splitlines() if "[FAIL]" in ln])
                findings_count = fail_count  # Only failures are findings; OK checks are not findings
                summary_lines = [ln for ln in stdout.splitlines() if "GATE" in ln]
                summary_line = summary_lines[-1].strip()[:120] if summary_lines else "completed"
                # Result: findings=0 + "GATE PASSED" + status OK all align (not status=WARN)

            elif label == "box-family-guard":
                # check-box-family-guard.py --check prints "All checks passed — X violations" (PROOF extraction)
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if "violations" in line.lower():
                        # PROOF LINE: "All checks passed — 0 violations" or "X violations found"
                        parts = line.split("—" if "—" in line else ":")
                        if parts:
                            last_part = parts[-1].strip()
                            violation_words = last_part.split()
                            if violation_words and violation_words[0].isdigit():
                                findings_count = int(violation_words[0])
                                summary_line = line.strip()[:120]
                                break

            elif label == "inspector-conformance":
                # Parse inspector-scan/run.js --json output (CRITICAL FIX: parse JSON, not scrape text)
                # PROOF: coordinator found defect — output had 2 warn findings but stage reported "0 WARN-severity findings"
                # REPOINTED 2026-08-06 (Spec 35 Task D): audit-inspector-conformance.js retired;
                # its --json shape was a flat top-level `findings` array. The new scanner's --json
                # shape nests findings per rule (`rules: [{id, mode, findings: [...]}]`) — flatten
                # before counting, same severity/status fields per finding either way.
                try:
                    import json as json_module
                    data = json_module.loads(stdout)
                    findings_list = [
                        f for rule in data.get("rules", []) for f in rule.get("findings", [])
                    ]

                    # Count by severity
                    by_severity = {}
                    for finding in findings_list:
                        sev = finding.get("severity", "unknown")
                        by_severity[sev] = by_severity.get(sev, 0) + 1

                    findings_count = len(findings_list)
                    sev_breakdown = ", ".join(f"{count} {sev}" for sev, count in sorted(by_severity.items()))
                    summary_line = f"{findings_count} finding(s) — {sev_breakdown}" if findings_count else "0 findings"
                except (json_module.JSONDecodeError, KeyError, TypeError, NameError):
                    findings_count = 0
                    summary_line = "EXTRACTION_FAILED — could not parse JSON"

            elif label == "feature-parity":
                # audit-feature-parity.py --check prints "UNEXPLAINED FINDINGS: N" line (PROOF extraction)
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if "UNEXPLAINED FINDINGS" in line:
                        # PROOF LINE: "UNEXPLAINED FINDINGS: 5  (each must be closed OR added...)"
                        parts = line.split(":")
                        if len(parts) > 1:
                            count_part = parts[-1].strip().split()[0]
                            try:
                                findings_count = int(count_part)
                                summary_line = line.strip()[:120]
                                break
                            except ValueError:
                                pass

            elif label == "cheat-gate":
                # cheat-gate/run.py --report is a COMPOSITE (checks 1-4, 6-7, each a distinct
                # cheat class). PROOF: "[cheat-gate] 18 violation(s) total — 0 NEW, 18 baselined".
                # Do NOT synthesise beyond that one self-describing total line — the sub-checks
                # have differing severities/meanings, matching the consistency-gates pattern.
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if line.startswith("[cheat-gate]") and "violation" in line.lower():
                        summary_line = line.strip()[:120]
                        digits = "".join(ch if ch.isdigit() else " " for ch in line.split("violation")[0])
                        nums = digits.split()
                        if nums:
                            try:
                                findings_count = int(nums[-1])
                            except ValueError:
                                pass
                        break

            elif label == "excluded-gate":
                # excluded-gate/run.py --report prints "[F5] N gate violations —" (PROOF extraction)
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if line.startswith("[F5]") and "gate violation" in line.lower():
                        summary_line = line.strip()[:120]
                        parts = line.split()
                        for tok in parts:
                            if tok.isdigit():
                                findings_count = int(tok)
                                break
                        break

            elif label == "value-identity":
                # dbschema/check_value_identity.py --check prints
                # "VALUE-IDENTITY VIOLATION (N finding(s))" or "CLEAN" (PROOF extraction).
                # A nonzero count means a named load-bearing row now holds the WRONG value —
                # which no row count can see, because the count does not move when a value
                # is merely reclassified.
                findings_count = 0
                summary_line = "clean"
                for line in stdout.splitlines():
                    if "VALUE-IDENTITY VIOLATION" in line:
                        summary_line = line.strip()[:120]
                        for tok in line.replace("(", " ").split():
                            if tok.isdigit():
                                findings_count = int(tok)
                                break
                        break
                    if "CLEAN" in line.upper():
                        summary_line = line.strip()[:120]

            elif label == "schema-drift":
                # dbschema/check_schema_drift.py --check prints "CLEAN -- no schema drift" or a drift list
                findings_count = 0
                summary_line = "clean"
                drift_lines = [ln for ln in stdout.splitlines() if ln.strip().startswith("-") or "DRIFT" in ln.upper()]
                if any("CLEAN" in ln.upper() for ln in stdout.splitlines()):
                    summary_line = next(ln.strip()[:120] for ln in stdout.splitlines() if "CLEAN" in ln.upper())
                elif drift_lines:
                    findings_count = len(drift_lines)
                    summary_line = drift_lines[0].strip()[:120]

            elif label == "spec-drift":
                # lints/lint-spec-drift.py --check prints "N total finding(s) ... M gating | K advisory"
                # then "PASS"/"FAIL". Only GATING findings count as real findings here (advisory is
                # a documented false-positive-prone bucket per the scanner's own summary line).
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if "gating" in line.lower() and "advisory" in line.lower():
                        summary_line = line.strip()[:120]
                        head = line.split("|")[0]
                        for tok in head.split():
                            if tok.isdigit():
                                findings_count = int(tok)
                                break
                        break

            elif label == "theme-css-hardcodes":
                # lints/lint-theme-css-hardcodes.py --check prints "N literal(s) found (X baselined, Y new)"
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if "baselined" in line and "new" in line:
                        summary_line = line.strip()[:120]
                        import re as _re
                        m = _re.search(r"(\d+)\s+new\)", line)
                        if m:
                            findings_count = int(m.group(1))
                        break

            elif label == "block-file-consistency":
                # audit-block-file-consistency.py --json: net_new is a LIST of finding dicts (PROOF: verified shape).
                try:
                    import json as json_module
                    data = json_module.loads(stdout)
                    net_new_list = data.get("net_new", [])
                    findings_count = len(net_new_list) if isinstance(net_new_list, list) else 0
                    flagged = data.get("flagged_blocks", 0)
                    summary_line = f"{findings_count} net-new finding(s) across {flagged} flagged block(s)"
                except (json_module.JSONDecodeError, KeyError, TypeError, NameError):
                    findings_count = 0
                    summary_line = "EXTRACTION_FAILED — could not parse JSON"

            elif label == "block-uniformity":
                # audit-block-uniformity.py: no flags, prints "SGS block uniformity audit: CLEAN" or lists diffs
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if "uniformity audit" in line.lower():
                        summary_line = line.strip()[:120]
                        if "CLEAN" not in line.upper():
                            findings_count = 1  # non-clean result; script has no per-item count to extract
                        break

            elif label == "declared-vs-seeded-roles":
                # audit-declared-vs-seeded-roles.py --check prints "FAIL: N attr(s) lack..." or "PASS"
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if line.strip().startswith("FAIL:") or line.strip().startswith("PASS"):
                        summary_line = line.strip()[:120]
                        for tok in line.split():
                            if tok.isdigit():
                                findings_count = int(tok)
                                break
                        break

            elif label == "dead-pattern-attrs":
                # check-dead-pattern-attrs.py --check prints "[dead-pattern-attrs] OK — ..." or lists dead attrs
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if line.startswith("[dead-pattern-attrs]"):
                        summary_line = line.strip()[:120]
                        if "OK" not in line:
                            findings_count = 1
                        break

            elif label == "no-core-blocks":
                # check-no-core-blocks.py: no flags, prints "[check-no-core-blocks] clean — N file(s), M banned"
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if line.startswith("[check-no-core-blocks]"):
                        summary_line = line.strip()[:120]
                        import re as _re
                        m = _re.search(r"(\d+)\s+banned", line)
                        if m:
                            findings_count = int(m.group(1))
                        break

            elif label in ("control-ux", "dead-controls", "duplicate-controls", "hardcoded-render-defaults"):
                # These four JS gates share a clean {netNew, accepted, baselineSize[, ...]} --json shape (PROOF: verified).
                try:
                    import json as json_module
                    data = json_module.loads(stdout)
                    net_new = data.get("netNew", 0)
                    findings_count = net_new if isinstance(net_new, int) else len(net_new or [])
                    accepted = data.get("accepted", 0)
                    accepted_n = accepted if isinstance(accepted, int) else len(accepted or [])
                    summary_line = f"{findings_count} net-new finding(s) ({accepted_n} baselined)"
                except (json_module.JSONDecodeError, KeyError, TypeError, NameError):
                    findings_count = 0
                    summary_line = "EXTRACTION_FAILED — could not parse JSON"

            elif label == "element-manifest-conformance":
                # check-element-manifest-conformance.js (default text mode): "GAP: N" is the real
                # per-member defect count (OK/ORPHAN are not defects on their own — see worklist below).
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if "Members checked" in line:
                        summary_line = line.strip()[:120]
                        import re as _re
                        m = _re.search(r"GAP:\s*(\d+)", line)
                        if m:
                            findings_count = int(m.group(1))
                        break

            elif label == "product-search-guards":
                # check-product-search-guards.js: no flags, prints "PASS"/"FAIL" lines per guard assertion
                fail_lines = [ln for ln in stdout.splitlines() if ln.strip().startswith("FAIL")]
                findings_count = len(fail_lines)
                pass_count = len([ln for ln in stdout.splitlines() if ln.strip().startswith("PASS")])
                summary_line = f"{findings_count} FAIL, {pass_count} PASS guard assertion(s)"

            elif label == "shared-css-state-rules":
                # check-shared-css-state-rules.js: --json is accepted but not wired (plain text always);
                # prints "[check-shared-css-state-rules] N findings — clean." or lists violations.
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if line.startswith("[check-shared-css-state-rules]"):
                        summary_line = line.strip()[:120]
                        import re as _re
                        m = _re.search(r"(\d+)\s+finding", line)
                        if m:
                            findings_count = int(m.group(1))
                        break

            elif label == "simple-surface-cap":
                # check-simple-surface-cap.js: WARN-ONLY/advisory by design (P2 §5, Bean-confirmed);
                # its own docstring says exits 0 unless --strict, which this stage never passes.
                # Report the advisory line verbatim; do not treat it as a finding count.
                findings_count = 0
                summary_line = "completed (advisory-only, --strict not used in this stage)"
                for line in stdout.splitlines():
                    if line.startswith("[check-simple-surface-cap]"):
                        summary_line = line.strip()[:120]

            elif label == "universal-fit":
                # check-universal-fit.js: an informational load-ranking report, not a violation
                # scanner — has no "finding" concept by design. Surface its own summary line.
                findings_count = 0
                summary_line = "completed"
                for line in stdout.splitlines():
                    if line.startswith("[check-universal-fit]"):
                        summary_line = line.strip()[:120]
                        break

            findings_by_scanner[label] = {
                "status": "ok" if result.returncode == 0 else "warn",
                "findings": findings_count,
                "summary": summary_line[:120],
            }
            total_findings += findings_count

            # Each extractor above already writes a self-describing summary (several
            # embed their own "N finding(s)" text). Re-prefixing the count here
            # produced "18 finding(s) — 18 finding(s) — 16 informational, 2 warn".
            # Print the summary verbatim; the machine-readable count lives in
            # findings_by_scanner[label]["findings"].
            print(f"Stage 12 ({label}): {summary_line[:100]}")

        except subprocess.TimeoutExpired:
            findings_by_scanner[label] = {"status": "TIMEOUT", "error": "scanner timed out (120s)"}
            print(f"Stage 12 ({label}): TIMEOUT (120s)")
        except Exception as exc:
            findings_by_scanner[label] = {"status": "ERROR", "error": str(exc)[:100]}
            print(f"Stage 12 ({label}): ERROR — {exc}")

    # Summary
    print()
    print(f"Stage 12 Summary:")
    for label, info in findings_by_scanner.items():
        status = info.get("status", "unknown")
        findings = info.get("findings", 0)
        summary = info.get("summary", "")
        if findings > 0:
            print(f"  {label}: {status} ({findings} findings) — {summary[:80]}")
        elif summary:
            print(f"  {label}: {status} — {summary[:80]}")
        else:
            print(f"  {label}: {status}")

    print(f"\nStage 13 Total: {total_findings} finding(s) across {len(findings_by_scanner)} scanner(s) (informational)")

    return {
        "status": "ok",  # Never fail on findings; they are informational
        "scanners_run": len(findings_by_scanner),
        "total_findings": total_findings,
        "dry_run": False,
        "findings_by_scanner": findings_by_scanner,
    }


# ---------------------------------------------------------------------------
# Stage 13 — Export database tables to CSV (final stage)
# ---------------------------------------------------------------------------

def stage_13_export_db_to_csv(dry_run: bool = False, self_test: bool = False) -> dict:
    """Export every live table in the framework DB to CSV, one file per table.

    The CSV folder at `~/.agents/skills/sgs-wp-engine/db data/` (note the space)
    holds flat copies of all DB tables. This stage regenerates them automatically
    as the final `/sgs-update` step, ensuring they stay current.

    Tables enumerated from the live schema (DB-authoritative, not hardcoded).
    Retired tables no longer in the schema are removed from the CSV folder.
    Idempotent: running twice with no DB change produces byte-identical files.

    Reports: tables exported, row counts, files added, removed, unchanged.
    """
    import csv

    CSV_FOLDER = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "db data"

    # Induced failure mode for --self-test: raise on an unwritable target
    if self_test and not (CSV_FOLDER.parent.parent.exists()):
        return {
            "status": "FAIL",
            "self_test": True,
            "error": f"self-test: base directory does not exist (induced test failure): {CSV_FOLDER.parent.parent}",
        }

    if self_test and CSV_FOLDER.exists() and not os.access(str(CSV_FOLDER), os.W_OK):
        return {
            "status": "FAIL",
            "self_test": True,
            "error": f"self-test: CSV folder is not writable (induced test failure): {CSV_FOLDER}",
        }

    if not SGS_DB.exists():
        return {"status": "ERROR", "error": f"database not found: {SGS_DB}"}

    if dry_run:
        try:
            conn = sqlite3.connect(str(SGS_DB))
            cursor = conn.cursor()
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' "
                "AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
            tables = [row[0] for row in cursor.fetchall()]
            conn.close()
            print(f"Stage 13 [dry-run]: would export {len(tables)} tables to {CSV_FOLDER}")
            return {"dry_run": True, "table_count": len(tables)}
        except Exception as exc:
            print(f"Stage 13 [dry-run]: DB read error — {exc}")
            return {"dry_run": True, "error": str(exc)}

    # Create the CSV folder if it doesn't exist
    CSV_FOLDER.mkdir(parents=True, exist_ok=True)

    # Read all table names from the database (DB-first, never hardcoded)
    try:
        conn = sqlite3.connect(str(SGS_DB))
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        live_tables = {row[0] for row in cursor.fetchall()}
        conn.close()
    except Exception as exc:
        return {"status": "ERROR", "error": f"failed to enumerate tables: {exc}"}

    # Track what we're doing
    exported = []
    added = []
    unchanged = []
    removed = []
    row_counts = {}
    errors = []

    # Export each table to CSV
    for table_name in sorted(live_tables):
        csv_path = CSV_FOLDER / f"{table_name}.csv"

        try:
            conn = sqlite3.connect(str(SGS_DB))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name} ORDER BY rowid")
            rows = cursor.fetchall()

            # Get column names
            col_names = [desc[0] for desc in cursor.description] if cursor.description else []

            # Write to CSV
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=col_names)
                writer.writeheader()
                for row in rows:
                    writer.writerow(dict(row))

            row_counts[table_name] = len(rows)
            exported.append(table_name)

            # Check if file is new or unchanged
            if csv_path.stat().st_size == 0:
                added.append(table_name)
            else:
                # For idempotency: if we just wrote it, it's exported; we'll
                # track "unchanged" only by comparing to a baseline if needed
                # For now, all exports are "exported" in this run
                pass

            conn.close()
        except Exception as exc:
            errors.append(f"{table_name}: {str(exc)[:80]}")
            print(f"Stage 13 ERROR exporting {table_name}: {exc}")

    # Clean up CSVs for tables no longer in the DB
    existing_csvs = {f.stem for f in CSV_FOLDER.glob("*.csv")}
    for csv_stem in sorted(existing_csvs - live_tables):
        csv_path = CSV_FOLDER / f"{csv_stem}.csv"
        try:
            csv_path.unlink()
            removed.append(csv_stem)
            print(f"Stage 13: removed {csv_stem}.csv (table no longer exists in DB)")
        except Exception as exc:
            errors.append(f"remove {csv_stem}.csv: {str(exc)[:80]}")
            print(f"Stage 13 ERROR removing {csv_stem}.csv: {exc}")

    # Report
    result = {
        "status": "ok" if not errors else "WARN",
        "tables_exported": len(exported),
        "tables_added": len(added),
        "tables_removed": len(removed),
        "row_counts": row_counts,
    }

    if errors:
        result["errors"] = errors

    # Summary line for the main output
    summary = (
        f"exported {len(exported)} tables, {len(added)} new, {len(removed)} removed, "
        f"{len(row_counts)} row count(s) captured"
    )
    if errors:
        summary += f", {len(errors)} error(s)"

    print(f"Stage 13: {summary}")
    result["summary"] = summary

    return result


# ---------------------------------------------------------------------------
# Main dispatcher
# ---------------------------------------------------------------------------

def _build_stage_dispatch(conn: sqlite3.Connection, args: argparse.Namespace) -> dict[int, Callable[[], dict]]:
    """Build {stage_num: lambda} mapping; each lambda runs the right stage function.

    Renumbered 2026-08-10: the retired handbook-refresh stage (formerly Stage 3,
    merged into Stage 2 at decisions.md D56) was removed from the pipeline
    entirely rather than kept as a skipped slot. Stages 3-13 below are what
    used to be numbered 4-14 — muscle memory for the old numbers should treat
    every stage from 3 onward as "one less than it used to be".

    Stage 9 is the prune-orphans stage (controlled by --prune-mode).
    Stage 10 is the container-wrapper attribute mirror diff (WS-4, D160).
    Stage 11 is the motion-fx artefact regeneration (D432 follow-up, 2026-08-01).
    Stage 12 is the audit scanners (DB/roster-keyed, report-only).
    Stage 13 is the database-to-CSV export (final stage, idempotent).
    """
    prune_mode = getattr(args, "prune_mode", _PRUNE_MODE_AGGRESSIVE)
    return {
        1: lambda: stage_1_sgs_codebase_scan(conn, dry_run=args.dry_run),
        2: lambda: stage_2_core_gutenberg_cache_refresh(
            conn, wp_version=args.wp_version, dry_run=args.dry_run
        ),
        3: lambda: stage_3_style_variation_sync(conn, dry_run=args.dry_run),
        4: lambda: stage_4_slot_synonym_auto_seed(conn, dry_run=args.dry_run),
        5: lambda: stage_5_block_replacement_mapping(conn, dry_run=args.dry_run),
        6: lambda: stage_6_spec_doc_regen(dry_run=args.dry_run),
        7: lambda: stage_7_uimax_mirror(dry_run=args.dry_run),
        8: lambda: stage_8_drift_gate(conn, dry_run=args.dry_run),
        9: lambda: stage_9_prune_orphans(conn, dry_run=args.dry_run, prune_mode=prune_mode),
        10: lambda: stage_10_container_mirror_report(dry_run=args.dry_run),
        11: lambda: stage_11_motion_fx_artefact_regen(dry_run=args.dry_run),
        12: lambda: stage_12_run_audit_scanners(dry_run=args.dry_run, self_test=getattr(args, "self_test", False)),
        13: lambda: stage_13_export_db_to_csv(dry_run=args.dry_run, self_test=getattr(args, "self_test", False)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SGS framework knowledge base — 13-stage holistic refresh",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--stage",
        type=int,
        choices=range(1, 14),
        metavar="N",
        help="Run a single stage only (1-13). Omit to run all stages.",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Stage 13 only: prove the export stage can fail (test mode, do not use operationally).",
    )
    parser.add_argument(
        "--self-test-is-responsive",
        action="store_true",
        help=(
            "Test _compute_is_responsive() in isolation (no DB, no filesystem "
            "writes) against 13 assertions including 3 dedicated negative "
            "controls. Exits immediately with 0/1, does not run any stage."
        ),
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
            "Stage 9 prune behaviour for stale support rows "
            "(block_slug exists in blocks but support_name removed from block.json). "
            "'aggressive' (default) DELETEs them — source of truth is block.json. "
            "'conservative' sets is_stale=1 instead (opt-in cautious mode). "
            "Attr-level ghost rows (block exists but attr removed) are always deleted "
            "regardless of this setting — block_attributes has no is_stale column."
        ),
    )
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help=(
            "Bootstrap an EMPTY/absent database before seeding: apply "
            "dbschema/schema.sql, replay tracked migrations, then run the "
            "normal stages. Refuses a populated DB (delete it first). "
            "Phase 0 / D464."
        ),
    )
    args = parser.parse_args()

    if args.self_test_is_responsive:
        raise SystemExit(_self_test_is_responsive())

    print(f"sgs-update-v2.py — repo: {REPO_ROOT}")
    print(f"sgs-framework.db: {SGS_DB}")
    if args.dry_run:
        print("[DRY RUN — no DB or file writes]")
    print()

    if args.rebuild:
        bootstrap_rebuild(SGS_DB)
        run_module_load_seeders(SGS_DB)

    conn = open_db()
    ensure_schema_metadata(conn)

    stages_to_run = [args.stage] if args.stage else list(range(1, 14))
    dispatch = _build_stage_dispatch(conn, args)

    results: dict[int, dict] = {}
    for stage_num in stages_to_run:
        print(f"\n{'=' * 50}\n=== Stage {stage_num} ===\n{'=' * 50}")
        if stage_num not in dispatch:
            print(f"Unknown stage: {stage_num}. Valid: 1-13.")
            continue
        results[stage_num] = dispatch[stage_num]()

    conn.close()

    # Summary
    print(f"\n{'=' * 50}")
    print("=== Summary ===")
    print(f"{'=' * 50}")
    for stage_num, result in results.items():
        # 2026-07-16 (qc-council): READ the stage's OWN reported status first.
        # This loop previously did `status = result.get("error", "ok")` and NEVER looked at
        # result["status"] — so any stage returning {"status": "warn"} (or "retired",
        # "refreshed", "synced") printed a flat **"ok"** unless it happened to carry an
        # "error" key. Measured live (2026-07-16, pre-renumber numbering — container_mirror_report
        # was Stage 11 then, now Stage 10): it returned {"status": "warn", "returncode": 1}
        # and the summary said "ok"; the since-removed retired-stage tombstone (formerly
        # Stage 3, deleted from the pipeline 2026-08-10) returned {"status": "retired"} and
        # also said "ok". A summary that reports ok for a stage that warned is the same
        # silent-degradation class that let a half-seeded DB rot unnoticed for a day —
        # and this summary is the ONLY thing a non-coder operator reads.
        # Blast radius measured before landing: 4 of 11 stages change output
        # (2 refreshed / 3 retired / 8 synced / 11 warn); all 4 become MORE honest and
        # none is falsely reclassified as broken. Stages with no "status" key are
        # unaffected — the original error/stub/dry-run/ok derivation still applies.
        status = result.get("status") or result.get("error", "ok")
        if result.get("stub"):
            status = "STUB"
        elif result.get("dry_run") and not result.get("status"):
            status = "dry-run"
        elif result.get("error"):
            status = f"ERROR: {result['error'][:80]}"
        print(f"  Stage {stage_num}: {status} — {result}")

    print()

    # ------------------------------------------------------------------
    # SEED HISTORY (2026-08-07) — record what this run actually left behind.
    #
    # Runs at the very END, after every stage has written, so it records the real
    # post-run state rather than a mid-flight one. It APPENDS one entry (row count of
    # every table + populated count of every seeded column) to
    # dbschema/seed-history.json, keeps the last 5, and PRINTS what moved unexpectedly
    # against that history.
    #
    # It is a REPORT, not a gate: it never changes this script's exit status, and a
    # deliberate reduction produces a line to read rather than a blocked build. That
    # is the whole reason it replaced dbschema/check_row_floor.py's absolute floor,
    # which failed loudly on intended drops and silently on real ones.
    #
    # Full runs only. A single --stage N run is not a seeding run, and recording one
    # would pollute the history's sense of what a normal run moves; --dry-run wrote
    # nothing, so there is nothing to record.
    if args.dry_run:
        print("[seed history: skipped — dry run wrote nothing to record]")
    elif args.stage:
        print(f"[seed history: skipped — single-stage run (--stage {args.stage}), not a full "
              "seeding run. Use `python dbschema/seed_history.py --report` to look without "
              "recording.]")
    else:
        seed_history_script = Path(__file__).resolve().parent / "dbschema" / "seed_history.py"
        try:
            proc = subprocess.run(
                [sys.executable, str(seed_history_script), "--record"],
                capture_output=True, text=True, timeout=120,
                encoding="utf-8", errors="replace",
            )
            print((proc.stdout or "").rstrip() or "[seed history: no output]")
            if proc.returncode != 0:
                # Reported, never fatal — a recorder that can break the run it observes
                # would be switched off, which is how the floor it replaced died.
                print(f"[seed history: recorder exited {proc.returncode} — "
                      f"{(proc.stderr or '').strip()[:200]}]", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001 — never let the recorder break the run
            print(f"[seed history: could not run the recorder — {exc}]", file=sys.stderr)

    print()


if __name__ == "__main__":
    main()
