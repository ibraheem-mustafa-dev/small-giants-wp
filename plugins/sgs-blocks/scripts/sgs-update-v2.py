"""
sgs-update-v2.py — 11-stage holistic refresh of the SGS framework knowledge base.

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
 11. container_mirror_report — run sync-container-wrapping-blocks.py --write-block-json
                               (report-only; NO --apply — operator-gated). Surfaces which
                               KIND-scoped sgs/container attrs each composite is missing
                               so a version-bump is visible before any operator-gated --apply.

Usage:
    python sgs-update-v2.py [--stage N] [--dry-run] [--wp-version X.Y] [--prune-mode MODE]

    --stage N               Run only stage N (1-11; stage 3 is retired). Omit to run all.
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

    # --- array_item_fields schema (D248, array-resolver) ---
    # Stores the per-item field schema for array-content-lift blocks.
    # Seeded from block.json supports.sgs.arrayItemSchema by the per-block
    # loop below.  Consumed by the array_content resolver + the
    # db_lookup.array_item_fields() accessor.  Idempotent.
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS array_item_fields (
          block_slug      TEXT NOT NULL,
          array_attr      TEXT NOT NULL,
          item_selector   TEXT NOT NULL,
          field_key       TEXT NOT NULL,
          field_selector  TEXT NOT NULL,
          role            TEXT NOT NULL,
          attr_type       TEXT NOT NULL DEFAULT 'string',
          enum_values     TEXT,
          gap_reason      TEXT,
          created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (block_slug, array_attr, field_key)
        )
        """
    )
    # Idempotent column migration: add gap_reason if the table was created
    # by an earlier run that predates this column.
    _aif_cols = {row[1] for row in c.execute(
        "PRAGMA table_info(array_item_fields)"
    ).fetchall()}
    if "gap_reason" not in _aif_cols:
        c.execute("ALTER TABLE array_item_fields ADD COLUMN gap_reason TEXT")

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
        # `replaces` is sourced from the canonical record (block-replacements.json,
        # loaded above), NOT block.json — the mapping lives in ONE version-controlled
        # place (D270, 2026-07-04). A record entry is a list of core slugs (many-core
        # →one-sgs, e.g. sgs/media replaces image+video). Normalise to the comma-
        # separated string Stage 6 + _blocks_replaces_reverse split on. Absent → None.
        _raw_replaces = replacements_record.get(slug)
        if isinstance(_raw_replaces, list):
            replaces = ",".join(t.strip() for t in _raw_replaces if str(t).strip()) or None
        elif isinstance(_raw_replaces, str) and _raw_replaces.strip():
            replaces = _raw_replaces.strip()
        else:
            replaces = None
        attrs = data.get("attributes", {})
        supports = data.get("supports", {})

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
        # reflects the current block.json on every run). A variant's discriminating
        # slots = its slots minus the union of every sibling variant's slots, so
        # shared attrs (e.g. minHeight) never act as a discriminator.
        c.execute("DELETE FROM variant_slots WHERE block_slug = ?", (slug,))
        if variants_map:
            for v_value, v_slots in variants_map.items():
                if not isinstance(v_slots, list):
                    continue
                sibling_slots: set = set()
                for other_value, other_slots in variants_map.items():
                    if other_value == v_value or not isinstance(other_slots, list):
                        continue
                    sibling_slots.update(other_slots)
                discriminating = [s for s in v_slots if s not in sibling_slots]
                for slot in discriminating:
                    c.execute(
                        "INSERT OR IGNORE INTO variant_slots "
                        "(block_slug, variant_value, unique_slot) VALUES (?, ?, ?)",
                        (slug, v_value, slot),
                    )

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

        scanned += 1

        # --- array_item_schema seeder (2026-07-02) ---
        # The DB-recognition array field-lift reads a block's item field NAMES from
        # here — the block's own data model (attributes.<attr>.items.properties) —
        # and derives each field's slot/role from the DB (Spec 31 §3.B4 / FR-31-2.5,
        # converter/resolvers/array_content.py). This REPLACES the retired
        # hand-declared arrayItemSchema → array_item_fields mechanism (D248): prune
        # its stale rows so they can't mis-drive a lift, then seed the field names.
        c.execute("DELETE FROM array_item_fields WHERE block_slug = ?", (slug,))
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
ATTR_CLASSIFICATION_OVERRIDES: dict[tuple[str, str], dict[str, object]] = {
    # TAG-IDENTITY attrs (CG-2 zero-h1 fix, 2026-07-05; role registered by
    # migrations/2026-07-05-register-tag-identity-role.py). These attrs store the
    # source element's HTML TAG (R-31-2 shape fact); assembly step 3a2 writes
    # them, gated on enum membership. Explicit declaration per FR-31-2.1a —
    # NEVER derived from enum-contains (hero.variant contains "video",
    # quote.attributionTag contains "div" — over-broad, R-31-9).
    #
    # heading.level: render.php:94 defaults 'h2'; without this the whole page
    #   rendered 0×h1/15×h2 (SEO + WCAG hierarchy, proven live 2026-07-05).
    ("sgs/heading", "level"): {"role": "tag-identity"},
    # media.mediaType: html_tag_to_core_block routes <video>/<iframe> to
    #   sgs/media but nothing set the mode — a draft <video> emitted an
    #   image-mode block (code-confirmed gap, H2 investigation 2026-07-05).
    ("sgs/media", "mediaType"): {"role": "tag-identity"},
    # sgs/trust-bar label family — the CG-9 residual finish (2026-07-05): the
    # block's own element vocabulary is __label/__badge-label (render.php:284-292
    # typography rule targets both), but Bean-controlled drafts write the badge
    # caption as __text (mockup :356/:799+). The B1/B2 selector mechanism already
    # supports comma-separated multi-selectors, first-non-None wins — the
    # DOCUMENTED pattern for exactly this drift class ("handles __text↔__quote
    # drift", scalar_content.py). Extending the declared selector is the
    # FR-31-2.1a channel; a global slots alias would corrupt the distinct 'text'
    # slot, and a code fallback would be a carve-out.
    ("sgs/trust-bar", "labelFontSize"): {"derived_selector": ".sgs-trust-bar__label, .sgs-trust-bar__text"},
    ("sgs/trust-bar", "labelFontSizeUnit"): {"derived_selector": ".sgs-trust-bar__label, .sgs-trust-bar__text"},
    ("sgs/trust-bar", "labelFontSizeTablet"): {"derived_selector": ".sgs-trust-bar__label, .sgs-trust-bar__text"},
    ("sgs/trust-bar", "labelFontSizeMobile"): {"derived_selector": ".sgs-trust-bar__label, .sgs-trust-bar__text"},
    ("sgs/trust-bar", "labelFontWeight"): {"derived_selector": ".sgs-trust-bar__label, .sgs-trust-bar__text"},
    ("sgs/trust-bar", "labelColour"): {"derived_selector": ".sgs-trust-bar__label, .sgs-trust-bar__text"},
    # bgSvgTextShadow: a BOOLEAN toggle mis-seeded role='color' with the __text
    # selector — inert while the capability gate no-op'd the whole block, but
    # LIVE once scalarStylingLift flipped (2026-07-05 rater catch): a draft
    # box/text-shadow on __text would write a raw CSS string into a boolean
    # attr. It is a behaviour toggle, not a colour value.
    ("sgs/trust-bar", "bgSvgTextShadow"): {"role": "behaviour", "derived_selector": None},
    # title family: stale '__heading' selectors — render.php emits __title
    # only (2026-07-05 rater catch; harmless no-op before the capability, a
    # live wrong-element path after).
    ("sgs/trust-bar", "title"): {"derived_selector": ".sgs-trust-bar__title"},
    ("sgs/trust-bar", "titleColour"): {"derived_selector": ".sgs-trust-bar__title"},
    ("sgs/trust-bar", "titleFontSize"): {"derived_selector": ".sgs-trust-bar__title"},
    ("sgs/trust-bar", "titleFontSizeUnit"): {"derived_selector": ".sgs-trust-bar__title"},
    ("sgs/trust-bar", "titleFontSizeTablet"): {"derived_selector": ".sgs-trust-bar__title"},
    ("sgs/trust-bar", "titleFontSizeMobile"): {"derived_selector": ".sgs-trust-bar__title"},
    # ---- scalar-styling-lift rollout — latent boolean mis-seed fixes (D285, 2026-07-06) ----
    # STOP-54: enabling `scalar-styling-lift` wakes EVERY role∈{color,typography}
    # attr whose name suffix-matches a css_property. A BOOLEAN attr mis-classed
    # role='color' with a selector would then have a raw CSS string written into
    # it (_compute_value fall-through `return raw` → schema-invalid boolean). A
    # full-roster pre-audit (2026-07-06, re-verified vs current code/DB, STOP-43)
    # confirmed exactly the D280 four (the number FontSize/LineHeight attrs are
    # the INTENDED targets — trust-bar precedent proves the split-value+unit path).
    # Same one-line correction as the trust-bar bgSvgTextShadow fix (line 1002):
    # role='behaviour' (a toggle, not a colour) + derived_selector=None (nothing
    # to lift). Reseed-durable (STOP-24). accentStroke: counter's "draw a stroke
    # around the accent" toggle. bgSvgTextShadow: the SVG-background text-shadow
    # toggle on the 3 section composites carrying it.
    ("sgs/counter", "accentStroke"): {"role": "behaviour", "derived_selector": None},
    ("sgs/hero", "bgSvgTextShadow"): {"role": "behaviour", "derived_selector": None},
    ("sgs/cta-section", "bgSvgTextShadow"): {"role": "behaviour", "derived_selector": None},
    ("sgs/container", "bgSvgTextShadow"): {"role": "behaviour", "derived_selector": None},
    # ---- scalar-styling-lift rollout — selector-drift corrections (D285, 2026-07-06) ----
    # Render-verified DEAD selectors: the lift reads these classes off the DRAFT,
    # but the block renders a DIFFERENT class, so the draft uses the current class
    # too and the old selector matches nothing (harmless no-op, but the per-element
    # style never lifts). Same __heading→__title correction as the trust-bar
    # precedent (line 1006+). Confirmed against the blocks' true render surface
    # (src/blocks/<b>/ + includes/), STOP-43. Only the genuinely-dead typography
    # selectors are corrected — colour attrs on wrapper/state elements that no-op
    # harmlessly are left as-is (not corruption, not a typography lift).
    #
    # card-grid: render emits __title/__subtitle (NOT __heading/__subheading).
    ("sgs/card-grid", "titleColour"): {"derived_selector": ".sgs-card-grid__title"},
    ("sgs/card-grid", "titleFontSize"): {"derived_selector": ".sgs-card-grid__title"},
    ("sgs/card-grid", "titleFontSizeUnit"): {"derived_selector": ".sgs-card-grid__title"},
    ("sgs/card-grid", "titleFontSizeTablet"): {"derived_selector": ".sgs-card-grid__title"},
    ("sgs/card-grid", "titleFontSizeMobile"): {"derived_selector": ".sgs-card-grid__title"},
    ("sgs/card-grid", "subtitleColour"): {"derived_selector": ".sgs-card-grid__subtitle"},
    ("sgs/card-grid", "subtitleFontSize"): {"derived_selector": ".sgs-card-grid__subtitle"},
    ("sgs/card-grid", "subtitleFontSizeUnit"): {"derived_selector": ".sgs-card-grid__subtitle"},
    ("sgs/card-grid", "subtitleFontSizeTablet"): {"derived_selector": ".sgs-card-grid__subtitle"},
    ("sgs/card-grid", "subtitleFontSizeMobile"): {"derived_selector": ".sgs-card-grid__subtitle"},
    # quote: render emits ONLY __attribution (the old __text body element is gone —
    # the quote body is now wrapper/InnerBlocks typography, HC2 inheritable default).
    ("sgs/quote", "attributionColour"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionFontFamily"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionFontSize"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionFontSizeUnit"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionFontSizeTablet"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionFontSizeMobile"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionFontWeight"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionLineHeight"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionLineHeightUnit"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionTextDecoration"): {"derived_selector": ".sgs-quote__attribution"},
    ("sgs/quote", "attributionTextTransform"): {"derived_selector": ".sgs-quote__attribution"},
    # product-card: the card TITLE lift targets __heading, but includes/product-
    # card-builtin-render.php emits the title as __title (verified render source,
    # FR-31-2.1a / STOP-43). Correct the title family only — the pill*/pickerLabel*/
    # cta* selectors are entangled with the D284 embedded-option-picker rework
    # (the pills are now the child option-picker's __pill, not product-card's own),
    # so those are left as harmless no-ops pending that area settling, not guessed.
    ("sgs/product-card", "titleColour"): {"derived_selector": ".sgs-product-card__title"},
    ("sgs/product-card", "titleFontSize"): {"derived_selector": ".sgs-product-card__title"},
    ("sgs/product-card", "titleFontSizeUnit"): {"derived_selector": ".sgs-product-card__title"},
    ("sgs/product-card", "titleFontSizeTablet"): {"derived_selector": ".sgs-product-card__title"},
    ("sgs/product-card", "titleFontSizeMobile"): {"derived_selector": ".sgs-product-card__title"},
    ("sgs/product-card", "titleFontWeight"): {"derived_selector": ".sgs-product-card__title"},
    ("sgs/product-card", "titleLineHeight"): {"derived_selector": ".sgs-product-card__title"},
    ("sgs/product-card", "titleLineHeightUnit"): {"derived_selector": ".sgs-product-card__title"},
    # product-card DESCRIPTION family (D314, 2026-07-12): desc* was MISSED in the
    # D285 title-family pass (role=NULL + derived_selector=NULL), so the draft's
    # `.sgs-product-card__description { color:var(--text-muted); font-size:14px }`
    # never routed and the clone fell to the block default `--text`. NOT entangled
    # with the D284 cta* rework — render.php consumes descColour (:165) + the 'desc'
    # typography family (:188) at `.sgs-product-card__description` (verified render
    # source, STOP-44); the draft class is `.sgs-product-card__description`. Seed both
    # role (canonical assignment skipped it) + derived_selector, mirroring title*.
    ("sgs/product-card", "descColour"): {"role": "color", "derived_selector": ".sgs-product-card__description"},
    ("sgs/product-card", "descFontSize"): {"role": "typography", "derived_selector": ".sgs-product-card__description"},
    ("sgs/product-card", "descFontSizeUnit"): {"role": "typography", "derived_selector": ".sgs-product-card__description"},
    ("sgs/product-card", "descFontSizeTablet"): {"role": "typography", "derived_selector": ".sgs-product-card__description"},
    ("sgs/product-card", "descFontSizeMobile"): {"role": "typography", "derived_selector": ".sgs-product-card__description"},
    ("sgs/product-card", "descLineHeight"): {"role": "typography", "derived_selector": ".sgs-product-card__description"},
    ("sgs/product-card", "descLineHeightUnit"): {"role": "typography", "derived_selector": ".sgs-product-card__description"},
    # product-card PRICE-NOTE family (D314 same-type sweep): the C-type null-role gap
    # is NOT desc-only — the price-note ALSO drops. Draft `.sgs-product-card__price-note
    # { font-size:13px; color:var(--text-muted) }` never routed (role=NULL). render.php
    # consumes priceNoteColour (:166) + the 'priceNote' typography family (:193) at
    # `.sgs-product-card__price-note` (verified render source, STOP-44). Same clean
    # text-element pattern as desc*. (priceFromLabel* = bound-mode WC label, no typed
    # draft element — seeded for completeness, harmless no-op on typed clones.)
    ("sgs/product-card", "priceNoteColour"): {"role": "color", "derived_selector": ".sgs-product-card__price-note"},
    ("sgs/product-card", "priceNoteFontSize"): {"role": "typography", "derived_selector": ".sgs-product-card__price-note"},
    ("sgs/product-card", "priceNoteFontSizeUnit"): {"role": "typography", "derived_selector": ".sgs-product-card__price-note"},
    ("sgs/product-card", "priceNoteFontSizeTablet"): {"role": "typography", "derived_selector": ".sgs-product-card__price-note"},
    ("sgs/product-card", "priceNoteFontSizeMobile"): {"role": "typography", "derived_selector": ".sgs-product-card__price-note"},
    # ---- scalar-styling-lift residual selector-drift (D285 completeness pass) ----
    # Render-verified only (STOP-43): each corrected selector is where the block's
    # render actually paints the attr. product-card tag*: the tag chip is __tag
    # (includes/product-card-builtin-render.php:96/106/111), not __label. NOT
    # touched (documented no-ops, P-SCALAR-LIFT-RESIDUAL-DRIFT): product-card
    # pill*/pickerLabel* (the pills are now the embedded child sgs/option-picker,
    # render_block :164 — no product-card pill element), product-card cta* (D284
    # owns CTA styling via sgs_button_element_style_css on __cta--primary), and
    # mobile-nav chrome colours (wrapper --sgs-mn-* CSS vars, no clean 1:1 element).
    ("sgs/product-card", "tagFontSize"): {"derived_selector": ".sgs-product-card__tag"},
    ("sgs/product-card", "tagFontSizeUnit"): {"derived_selector": ".sgs-product-card__tag"},
    ("sgs/product-card", "tagFontSizeTablet"): {"derived_selector": ".sgs-product-card__tag"},
    ("sgs/product-card", "tagFontSizeMobile"): {"derived_selector": ".sgs-product-card__tag"},
    # option-picker pill*: render scopes pill typography/colour to __pill
    # (render.php:255 $sel_pill), NOT __label (:254 is the group legend, correct
    # for label*). Fix the 7 pill* attrs; leave label* untouched (already correct).
    ("sgs/option-picker", "pillFontSize"): {"derived_selector": ".sgs-option-picker__pill"},
    ("sgs/option-picker", "pillFontSizeUnit"): {"derived_selector": ".sgs-option-picker__pill"},
    ("sgs/option-picker", "pillFontSizeTablet"): {"derived_selector": ".sgs-option-picker__pill"},
    ("sgs/option-picker", "pillFontSizeMobile"): {"derived_selector": ".sgs-option-picker__pill"},
    ("sgs/option-picker", "pillFontWeight"): {"derived_selector": ".sgs-option-picker__pill"},
    ("sgs/option-picker", "pillTextColour"): {"derived_selector": ".sgs-option-picker__pill"},
    ("sgs/option-picker", "pillBorderColour"): {"derived_selector": ".sgs-option-picker__pill"},
    # NOTE (D281): the CSS-property naming-mismatch corrections for sgs/button's
    # colourBorder/colourBackground/colourText were TRIALLED here then REVERTED —
    # the column-first mechanism works (border-color lifts to colourBorder, D2
    # shrinks) but the lifted VALUE is the draft's `var(--border)`, which the theme
    # deploys as `--border-subtle` (not bare `--border`) so it doesn't resolve →
    # a dark ghost-button border (proven live 2026-07-05). The faithful fix is a
    # converter feature: resolve draft `var(--X)` colours against the draft :root
    # map before token-snap. Re-add these overrides ONLY after that lands (parking:
    # P-DRAFT-CSSVAR-COLOUR-RESOLUTION). The column MECHANISM + the reseed guard
    # stay; the button SEED is deferred so page 8 keeps its faithful D2 border.
    # sgs/product-card — 3 mis-seeds blocking the FR-31-2.6 per-attr walk from
    # landing the card (QA Gate A, 2026-07-04). Every field verified against the
    # BLOCK SOURCE (includes/product-card-builtin-render.php — the authoritative
    # element↔attr map per FR-31-2.1a):
    #
    # priceLarge: mis-seeded role='select-from-enum' (it is the card's BIG price
    #   TEXT — builtin-render.php:155 paints it inside
    #   <span class="sgs-product-card__price">). role='text-content' admits it to
    #   the content walk; canonical_slot='price' (already correct) gives the
    #   draft's __price element a tier-0 match.
    ("sgs/product-card", "priceLarge"): {"role": "text-content", "derived_selector": ".sgs-product-card__price"},
    # priceNote: canonical_slot was 'price' — colliding tier-0 with priceLarge on
    #   the draft's __price element (insert-order-fragile pick). Its REAL element
    #   is __price-note (builtin-render.php:158); the normalised attr-name tier-0
    #   match ('price-note' ≡ priceNote) resolves it without a slot row.
    ("sgs/product-card", "priceNote"): {"canonical_slot": None, "derived_selector": ".sgs-product-card__price-note"},
    # packSizes: the pack-size pills' owner (builtin-render.php:130-138 renders
    #   the array as __pill buttons). canonical_slot='pill' marks the pill token
    #   ARRAY-OWNED so the per-element walk never mis-binds a pill's text into a
    #   scalar attr (trialTag got "8-pack", proven live 2026-07-04); the array
    #   lift itself needs an items schema (tracked, Phase-5 backlog).
    ("sgs/product-card", "packSizes"): {"canonical_slot": "pill", "derived_selector": ".sgs-product-card__pill"},
    # trialTag: selector hygiene — the real element is __tag--trial
    #   (builtin-render.php:106), not a derived guess.
    ("sgs/product-card", "trialTag"): {"derived_selector": ".sgs-product-card__tag--trial"},
    # ---- Trial-tag BOX attrs (2026-07-12, no-inline label/trial-tag mirror) ----
    # The in-body trial tag renders through the SHARED sgs_label_box_css_rule()
    # helper (render.php typed branch), scoped to the trial span's uid+BEM. Point
    # every tag-box attr at the DRAFT's real trial-tag element so the universal
    # lift reads the right rule. The two COLOUR attrs (role='color') transfer via
    # the existing universal styling lift (styling_content.py — colour/typography
    # only). The two GEOMETRY attrs (tagPadding/tagBorderRadius) are NOT lifted by
    # the current engine (styling_helpers.py: geometry radius/padding is
    # intentionally not routed) — seeded here for selector hygiene + a future
    # per-element geometry lift; on page 8 they are moot (the draft trial tag's
    # 4px 10px / 6px EQUAL the SGS style.css defaults). tagFullWidth is a card-
    # design constant (block.json default true), not a lifted value.
    ("sgs/product-card", "tagBackgroundColour"): {"role": "color", "canonical_slot": "label", "derived_selector": ".sgs-product-card__tag--trial"},
    ("sgs/product-card", "tagTextColour"): {"role": "color", "canonical_slot": "label", "derived_selector": ".sgs-product-card__tag--trial"},
    ("sgs/product-card", "tagBorderRadius"): {"role": "visual", "canonical_slot": "label", "derived_selector": ".sgs-product-card__tag--trial"},
    ("sgs/product-card", "tagPadding"): {"role": "visual", "canonical_slot": "label", "derived_selector": ".sgs-product-card__tag--trial"},
    # ctaUrl: mis-seeded role='content' (generic text role) instead of
    #   'link-href' — builtin-render.php emits the CTA as
    #   <a href="$cta_url" class="sgs-product-card__button">, i.e. this attr
    #   is a HREF, not a text node. role='content' passed the
    #   equivalent_block_for content-bearing gate (both are content-bearing
    #   roles), so identity resolution to sgs/button already worked, but the
    #   VALUE extraction dispatch (field_extractors.extract_field_value) has
    #   no 'content' handler for hrefs — 'link-href' routes it through the
    #   shared url-href/link-href extractor (walk.py leg-2 foreign-identity
    #   arm, D279, 2026-07-05) so the featured-product card's CTA link
    #   correctly lifts BOTH ctaText (role='text-content', unchanged) and
    #   ctaUrl (now role='link-href') from the SAME <a class="sgs-button
    #   sgs-button--primary" href="/product/zookies/">.
    ("sgs/product-card", "ctaUrl"): {"role": "link-href"},
    # sgs/team-member.name: assign-canonical routes this to canonical_slot='heading'
    # → standalone_block='sgs/heading' → equivalent_block_for() returns 'sgs/heading'.
    # has_inner_blocks derives to 0 naturally (save.js returns null, render.php never
    # reads $content) so the walker never recurses children, and equivalent_block_for
    # is never consulted for child routing.
    # to lift the person's name from the <h3 class="sgs-team-member__name"> element.
    # Setting role='text-content' is safe: the per-attr emit_shape walk
    # (FR-31-2.6; the old block_accepts_inner_blocks gate died with the
    # has_inner_blocks column, 2026-07-05) prevents the sgs/heading
    # dead-child bug recurring. D221 regression fix. 2026-06-13.
    ("sgs/team-member", "name"): {"role": "text-content", "derived_selector": ".sgs-team-member__name"},
    # sgs/team-member.role: person's job title. canonical_slot='role' →
    # standalone_block='sgs/label' → would emit a dead child with has_inner_blocks=1.
    # has_inner_blocks derives to 0 naturally. Force role='text-content' so the scalar text of the
    # <p class="sgs-team-member__role"> element is lifted into this string attr. 2026-06-13.
    ("sgs/team-member", "role"): {"role": "text-content", "derived_selector": ".sgs-team-member__role"},
    # sgs/team-member.photo + .memberMedia: object-typed scalar image attrs. Two
    # corrections the heuristic gets wrong:
    #   (1) derived_selector: assign-canonical derives '.sgs-team-member__media' from
    #       the 'media' canonical_slot, but render.php + edit.js BOTH emit the image
    #       under class '.sgs-team-member__photo' (render.php:125/133). The lift element
    #       must match the REAL BEM class, so force '.sgs-team-member__photo'.
    #   (2) role: NULL by default → _lift_scalar_attrs_by_selector skips it. Force
    #       role='image-object' (content-bearing) so the G3-attrs path lifts the <img>
    #       into the object attr via _lift_scalar_media_from_img.
    # Both fields MUST live in this override (not a direct DB edit) so they survive
    # every /sgs-update reseed — assign-canonical would otherwise re-derive __media +
    # reset role to NULL, breaking the photo lift. 2026-06-13.
    ("sgs/team-member", "photo"): {"role": "image-object", "derived_selector": ".sgs-team-member__photo"},
    ("sgs/team-member", "memberMedia"): {"role": "image-object", "derived_selector": ".sgs-team-member__photo"},
    # sgs/testimonial — 5 styling attrs mis-classified by assign-canonical.
    # Verified against render.php (D222 2026-06-13).
    #
    # quoteFontSize: assign-canonical likely derives role='typography' + selector
    #   '.sgs-testimonial__quote' correctly (DB confirmed). No change — left here
    #   for completeness of the audit (do not add an override for a correct row).
    #
    # quoteColour: assign-canonical derives role='color' + selector
    #   '.sgs-testimonial__quote' correctly (DB confirmed). No change.
    #
    # quoteFontStyle (CG-11, 2026-07-05; renamed from quoteStyle to match the
    #   FontSize/FontWeight/LineHeight/FontStyle typography-suffix family —
    #   property_suffixes.FontStyle.role corrected 'select-from-enum'->'typography'
    #   the same day via migrations/2026-07-05-fontstyle-role-typography.py).
    #   Pre-rename, assign-canonical peeled suffix 'Style' (longest-match;
    #   'FontStyle' doesn't match 'quoteStyle') -> role='behaviour',
    #   css_property=NULL. Post-rename the 'FontStyle' suffix now matches
    #   correctly, but the override is kept explicit (belt-and-braces) with the
    #   real selector. render.php: $quote_style emitted as font-style inline on
    #   <blockquote class="sgs-testimonial__quote">.
    ("sgs/testimonial", "quoteFontStyle"): {"role": "typography", "derived_selector": ".sgs-testimonial__quote"},
    #
    # CG-11 (2026-07-05): 4 more testimonial styling attrs left role=NULL +
    #   derived_selector=NULL by assign-canonical (the 'Media' problem's sibling
    #   for typography/colour suffixes on attrs whose canonical_slot doesn't
    #   route them to the CSS-lift). Verified against render.php:
    #     nameFontWeight: <cite>/name node is class="sgs-testimonial__name"
    #       (render.php attribution block) — font-weight typography attr.
    #     orgColour: org text renders in class="sgs-testimonial__org" — colour attr.
    #     summaryColour / summaryFontSize: summary phrase renders in
    #       <p class="sgs-testimonial__summary"> (render.php:272) — colour +
    #       typography attrs (mirrors quoteColour/quoteFontSize's own override
    #       precedent above; summaryFontSize already flows through the same
    #       sgs_font_size_value()/style-attr mechanism as quoteFontSize).
    #   Must live here (not DB-only) so they survive every /sgs-update reseed.
    ("sgs/testimonial", "nameFontWeight"): {"role": "typography", "derived_selector": ".sgs-testimonial__name"},
    ("sgs/testimonial", "orgColour"): {"role": "color", "derived_selector": ".sgs-testimonial__org"},
    ("sgs/testimonial", "summaryColour"): {"role": "color", "derived_selector": ".sgs-testimonial__summary"},
    ("sgs/testimonial", "summaryFontSize"): {"role": "typography", "derived_selector": ".sgs-testimonial__summary"},
    #
    # ratingSize: stale role='content' + selector '.sgs-testimonial__text, ...'.
    #   Real element: <svg width="$rating_size" height="$rating_size"> inside
    #   <div class="sgs-testimonial__rating sgs-testimonial__stars"> (lines 203/215).
    #   ratingSize drives SVG width/height attributes, NOT a CSS font-size property.
    #   Size.css_property = NULL in property_suffixes → NOT CSS-liftable by suffix.
    #   BLOCKER: the CSS-lift cannot resolve ratingSize via suffix alone. Fix the
    #   role to 'select-from-enum' (closest correct: it controls a dimension) and
    #   the selector to the real rating container. The lift-capability gap is a
    #   separate task — documented here, not papered over.
    ("sgs/testimonial", "ratingSize"): {"role": "select-from-enum", "derived_selector": ".sgs-testimonial__rating"},
    # sgs/testimonial — 3 object-typed media attrs. assign-canonical leaves their
    # role=NULL + derived_selector=NULL because 'Media' suffix matches no typed
    # property_suffix row → the content-extraction engine skips them entirely.
    # Correct: role='image-object' (lifts <img> via _lift_scalar_media_from_img)
    # + derived_selector matching the real BEM element in render.php + the draft.
    #   avatarMedia: rendered in <div class="sgs-testimonial__avatar"> (render.php:249)
    #   orgLogo:     rendered in <div class="sgs-testimonial__logo">   (render.php:257)
    #   workMedia:   rendered in <figure class="sgs-testimonial__work"> (render.php:265)
    # Must live here (not DB-only) so they survive every /sgs-update reseed.
    # Paired with migration 2026-06-26-testimonial-media-role-selector.py for
    # immediate effect without a full reseed. 2026-06-26.
    ("sgs/testimonial", "avatarMedia"): {"role": "image-object", "derived_selector": ".sgs-testimonial__avatar"},
    ("sgs/testimonial", "orgLogo"):     {"role": "image-object", "derived_selector": ".sgs-testimonial__logo"},
    ("sgs/testimonial", "workMedia"):   {"role": "image-object", "derived_selector": ".sgs-testimonial__work"},
    # Container→item selector fixes — council MF-2, 2026-06-28.
    # assign-canonical derives __items (the container) from the plural BEM convention;
    # the CSS-lift and array-resolver both need the PER-ITEM element selector so they
    # target the rendered child, not the wrapper.
    # sgs/card-grid.items: render.php:288 emits class="sgs-card-grid__item" (singular).
    # Current derived_selector .sgs-card-grid__items is the container wrapper — wrong target.
    ("sgs/card-grid", "items"): {"derived_selector": ".sgs-card-grid__item"},
    # sgs/icon-list.items: render.php:140 emits class="sgs-icon-list__item" (singular).
    # Current derived_selector .sgs-icon-list__items is the container wrapper — wrong target.
    ("sgs/icon-list", "items"): {"derived_selector": ".sgs-icon-list__item"},
    # sgs/hero.badges: render.php:621 emits class="sgs-hero__badge sgs-hero__badge--..." per item.
    # Container is .sgs-hero__badges (render.php:633). Per-item class is .sgs-hero__badge.
    ("sgs/hero", "badges"): {"derived_selector": ".sgs-hero__badge"},
    # --- fingerprints.json migration (2026-07-03, P-FINGERPRINT-MIGRATION) ---
    # The stale tools/recogniser/data/fingerprints.json attr_extractors[].selector
    # overrides are folded into this live, reseed-surviving channel and the load is
    # dropped from assign-canonical.py. Values are the CURRENT effective
    # derived_selector for each fingerprint-covered (slug, attr) pair — so as the
    # FINAL Stage-1 writer this reproduces the exact live state (verified: a full
    # reseed produces a zero derived_selector diff). Any redundant-with-heuristic
    # entries are harmless. team-member.name/.role carried their fingerprint
    # selectors into the existing role overrides above.
    ("core/button", "text"): {"derived_selector": "a,button"},  # migrated from fingerprints.json (db-current)
    ("core/button", "url"): {"derived_selector": "a"},  # migrated from fingerprints.json (db-current)
    ("core/heading", "content"): {"derived_selector": "h1,h2,h3,h4,h5,h6"},  # migrated from fingerprints.json (db-current)
    ("core/image", "alt"): {"derived_selector": "img"},  # migrated from fingerprints.json (db-current)
    ("core/image", "caption"): {"derived_selector": "figcaption"},  # migrated from fingerprints.json (db-current)
    ("core/image", "url"): {"derived_selector": "img"},  # migrated from fingerprints.json (db-current)
    ("core/list-item", "content"): {"derived_selector": "li"},  # migrated from fingerprints.json (db-current)
    ("core/paragraph", "content"): {"derived_selector": "p"},  # migrated from fingerprints.json (db-current)
    ("core/quote", "citation"): {"derived_selector": "cite"},  # migrated from fingerprints.json (db-current)
    ("core/quote", "value"): {"derived_selector": "blockquote"},  # migrated from fingerprints.json (db-current)
    ("sgs/accordion-item", "title"): {"derived_selector": ".sgs-accordion-item__title"},  # migrated from fingerprints.json (db-current)
    ("sgs/counter", "label"): {"derived_selector": ".sgs-counter__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/cta-section", "headline"): {"derived_selector": ".sgs-cta-section__headline, h1, h2"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-address", "label"): {"derived_selector": ".sgs-form-field-address__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-checkbox", "label"): {"derived_selector": ".sgs-form-field-checkbox__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-consent", "label"): {"derived_selector": ".sgs-form-field-consent__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-date", "label"): {"derived_selector": ".sgs-form-field-date__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-email", "label"): {"derived_selector": ".sgs-form-field-email__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-file", "label"): {"derived_selector": ".sgs-form-field-file__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-number", "label"): {"derived_selector": ".sgs-form-field-number__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-phone", "label"): {"derived_selector": ".sgs-form-field-phone__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-radio", "label"): {"derived_selector": ".sgs-form-field-radio__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-select", "label"): {"derived_selector": ".sgs-form-field-select__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-text", "label"): {"derived_selector": ".sgs-form-field-text__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-textarea", "label"): {"derived_selector": ".sgs-form-field-textarea__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-field-tiles", "label"): {"derived_selector": ".sgs-form-field-tiles__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-review", "heading"): {"derived_selector": ".sgs-form-review__heading"},  # migrated from fingerprints.json (db-current)
    ("sgs/form-step", "label"): {"derived_selector": ".sgs-form-step__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/hero", "ctaPrimaryText"): {"derived_selector": ".sgs-hero__cta--primary"},  # migrated from fingerprints.json (db-current)
    ("sgs/hero", "ctaPrimaryUrl"): {"derived_selector": ".sgs-hero__cta--primary"},  # migrated from fingerprints.json (db-current)
    ("sgs/hero", "ctaSecondaryText"): {"derived_selector": ".sgs-hero__cta--secondary"},  # migrated from fingerprints.json (db-current)
    ("sgs/hero", "ctaSecondaryUrl"): {"derived_selector": ".sgs-hero__cta--secondary"},  # migrated from fingerprints.json (db-current)
    ("sgs/hero", "headline"): {"derived_selector": ".sgs-hero__headline, h1, h2"},  # migrated from fingerprints.json (db-current)
    ("sgs/hero", "subHeadline"): {"derived_selector": ".sgs-hero__sub-headline, p"},  # migrated from fingerprints.json (db-current)
    ("sgs/icon", "ariaLabel"): {"derived_selector": ".sgs-icon, [aria-label]"},  # migrated from fingerprints.json (db-current)
    # NOTE (2026-07-16): emojiChar/iconName previously appeared TWICE in this dict —
    # here with a derived_selector, and again below with an icon-source role. Python
    # dict literals are last-wins, so these two derived_selectors were SILENTLY
    # DISCARDED at parse time (leg-1 lift_scalar_content needs them). Merged into the
    # single entries below; a duplicate-key AST gate now fails the build on a repeat.
    ("sgs/icon", "iconSource"): {"derived_selector": ".sgs-icon__glyph, [data-icon-source]"},  # migrated from fingerprints.json (db-current)
    ("sgs/icon", "linkTarget"): {"derived_selector": ".sgs-icon__link, a"},  # migrated from fingerprints.json (db-current)
    ("sgs/icon", "linkUrl"): {"derived_selector": ".sgs-icon__link, a"},  # migrated from fingerprints.json (db-current)
    ("sgs/info-box", "description"): {"derived_selector": ".sgs-info-box__description"},  # migrated from fingerprints.json (db-current)
    ("sgs/info-box", "heading"): {"derived_selector": ".sgs-info-box__heading"},  # migrated from fingerprints.json (db-current)
    ("sgs/mega-menu", "label"): {"derived_selector": ".sgs-mega-menu__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/mobile-nav", "ctaText"): {"derived_selector": ".sgs-mobile-nav__cta--primary"},  # migrated from fingerprints.json (db-current)
    ("sgs/mobile-nav", "ctaUrl"): {"derived_selector": ".sgs-mobile-nav__cta--primary"},  # migrated from fingerprints.json (db-current)
    ("sgs/notice-banner", "text"): {"derived_selector": ".sgs-notice-banner__text"},  # migrated from fingerprints.json (db-current)
    ("sgs/responsive-logo", "alt"): {"derived_selector": ".sgs-responsive-logo__image, img"},  # migrated from fingerprints.json (db-current)
    ("sgs/responsive-logo", "width"): {"derived_selector": ".sgs-responsive-logo__image, img"},  # migrated from fingerprints.json (db-current)
    ("sgs/star-rating", "label"): {"derived_selector": ".sgs-star-rating__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/tab", "label"): {"derived_selector": ".sgs-tab__label"},  # migrated from fingerprints.json (db-current)
    ("sgs/table-of-contents", "title"): {"derived_selector": ".sgs-table-of-contents__title"},  # migrated from fingerprints.json (db-current)
    ("sgs/testimonial", "nameColour"): {"derived_selector": ".sgs-testimonial__heading, .sgs-testimonial__author"},  # migrated from fingerprints.json (db-current)
    # 2026-07-16 (qc-council, 2 raters + measured baseline): `role` ADDED alongside the
    # existing selector. Both attrs below were the single root cause of 7 red converter
    # tests. The two attrs fail at DIFFERENT gates in scalar_content.py, so they need
    # DIFFERENT corrections — a role row alone fixes neither:
    #   quote        — HAS a selector, so it clears :159, but role=NULL fails the
    #                  :164 gate `role in ("text-content","content") and attr_type=="string"`
    #                  -> needs ROLE.
    #   reviewerName — has NEITHER, and :159 (`if not selector: continue`) skips it
    #                  BEFORE :164 is ever reached -> needs SELECTOR **and** role.
    # Selector shape mirrors quote's: the render-side class (`__name`, render.php) plus the
    # draft-side synonym (`__author`, used by the drafts + the fixtures) — the documented
    # comma-separated multi-selector drift pattern, first-non-None wins.
    # WHY AN OVERRIDE AND NOT A SEEDER FIX: block.json DOES declare `"role": "content"` on
    # both, and the seeder ignores it — but reading that declaration first was measured and
    # REJECTED by the council: all 94 declared roles are the identical bulk marker
    # `"content"` (the GENERIC CATCH-ALL that assign-canonical.py:1283-1286 deliberately
    # UPGRADES AWAY FROM into link-href/image-object/image-alt). Declaration-first would
    # DOWNGRADE 9 attrs — `sgs/button.url` would take the button's label text as its href.
    # `ATTR_CLASSIFICATION_OVERRIDES` is the FR-31-2.1a-sanctioned channel for exactly this
    # ("fix it via ATTR_CLASSIFICATION_OVERRIDES ... or by reading the block code") and is
    # named the R-31-1 channel at decisions.md:329. Safe by measurement:
    # detect_role_from_block_json proposes (None,None,None) for both, so the upgrade pass
    # cannot steal them back, and this dict is the final writer regardless.
    # RESIDUAL (tracked, NOT closed by this fix): the `_ATTR_NAME_RULES` name-regex tier
    # remains a live FR-31-2.1a violation. Closing it needs the 9 wrong block.json
    # declarations corrected at source THEN declaration-first + deleting the regex tier —
    # its own design gate.
    ("sgs/testimonial", "quote"): {
        "role": "content",
        "derived_selector": ".sgs-testimonial__text, .sgs-testimonial__quote",
    },
    ("sgs/testimonial", "reviewerName"): {
        "role": "content",
        "derived_selector": ".sgs-testimonial__name, .sgs-testimonial__author",
    },  # migrated from fingerprints.json (db-current)
    ("sgs/testimonial", "quoteColour"): {"derived_selector": ".sgs-testimonial__quote, .sgs-testimonial__text"},  # migrated from fingerprints.json (db-current)
    ("sgs/testimonial", "quoteFontSize"): {"derived_selector": ".sgs-testimonial__quote, .sgs-testimonial__text"},  # migrated from fingerprints.json (db-current)
    ("sgs/testimonial", "quoteLineHeight"): {"derived_selector": ".sgs-testimonial__quote, .sgs-testimonial__text"},  # migrated from fingerprints.json (db-current)
    ("sgs/timeline", "entries"): {"derived_selector": ".sgs-timeline__item"},  # migrated from fingerprints.json (db-current)
    ("sgs/whatsapp-cta", "label"): {"derived_selector": ".sgs-whatsapp-cta__label"},  # migrated from fingerprints.json (db-current)
    # sgs/icon — icon-source role tags (Spec 31 §3.B.0, 2026-07-03). The named-leaf
    # icon arm finds the target attr BY ROLE (like text/image/link) and writes the DB
    # attr_name — never a hardcoded attr name (R-31-1). Each source value attr carries
    # an `icon-<kind>` role so `resolve_icon_kind`'s kind binds to the attr via the DB.
    # `iconSource` stays role='identity' (the discriminator storing the kind string);
    # `iconName` is RETAGGED off 'identity' -> 'icon-lucide' so `iconSource` is the sole
    # 'identity' attr the arm reads as the discriminator. Reseed-durable: assign-canonical
    # re-derives block_attributes.role each reseed, so these MUST live here (the roles
    # themselves are registered by migrations/2026-07-03-register-icon-source-roles.py).
    ("sgs/icon", "iconName"): {"role": "icon-lucide", "derived_selector": ".sgs-icon__glyph, [data-icon-name]"},
    ("sgs/icon", "emojiChar"): {"role": "icon-emoji", "derived_selector": ".sgs-icon__emoji"},
    ("sgs/icon", "dashiconName"): {"role": "icon-dashicon"},
    ("sgs/icon", "wpIconName"): {"role": "icon-wp-icon"},
    # CG-8 (2026-07-05): the image-extractor builds a full {url,id,alt} dict, but
    # walk.py/extraction.py DOWNCAST it to the bare URL for a string-typed image
    # attr (sgs/product-card.image, sgs/media.imageUrl, sgs/decorative-image.
    # imageUrl) — the alt was discarded even though all 3 blocks declare a
    # sibling `imageAlt` string attr that render.php already reads + escapes
    # into alt="" (product-card-builtin-render.php + media/render.php:313/691 +
    # decorative-image/render.php:22). role=NULL on imageAlt meant nothing ever
    # populated it (a11y defect — page 8 had 3 empty alt="" images). Found by a
    # full-DB sweep for the SAME shape (role='image-object' + attr_type='string'
    # + a sibling *Alt attr) — R-31-9 "no carve-outs": all 3 fixed together, not
    # just the 2 verified live on page 8.
    #
    # role='image-alt' (registered by
    # migrations/2026-07-05-register-image-alt-role.py) admits the attr to the
    # DB-driven companion lookup (db_lookup.image_alt_companion_for); the NEW
    # `alt_companion_attr` column names the image attr this alt belongs to — a
    # genuine per-attr fact, NOT suffix-derivable (product-card's image attr is
    # `image`, media's/decorative-image's is `imageUrl` — no shared naming rule,
    # unlike the Unit-companion suffix family). Both fields MUST live here so
    # they survive every /sgs-update reseed (assign-canonical would otherwise
    # re-derive role=NULL + canonical_slot from the bare attr-name heuristic).
    ("sgs/product-card", "imageAlt"): {"role": "image-alt", "alt_companion_attr": "image"},
    ("sgs/media", "imageAlt"): {"role": "image-alt", "alt_companion_attr": "imageUrl"},
    ("sgs/decorative-image", "imageAlt"): {"role": "image-alt", "alt_companion_attr": "imageUrl"},
    # sgs/quote.attribution (2026-07-05, ONE-content-model rebuild): the block
    # NEVER had an `equivalent_block_for` route into sgs/text for its footer
    # string — assign-canonical mis-seeds role=NULL + emit_shape=NULL on this
    # attr. role=NULL fails the FR-31-2.2 content-bearing allowlist in both
    # db_lookup.equivalent_block_for() and content_attr_for_element(), so the
    # per-attr walk could never route a draft's attribution paragraph here —
    # it fell through Mechanism B's generic G-resolve (slot alias 'attribution'
    # -> standalone sgs/text) and emitted as an indistinguishable 4th sgs/text
    # child (verified live against sites/mamas-munches, brand-story section,
    # 2026-07-05). role='text-content' admits it to the content-bearing
    # allowlist; emit_shape='nested' marks it a scalar (not child-block) unit.
    #
    # canonical_slot explicitly cleared to NULL (mirrors the product-card
    # priceNote override precedent above): assign-canonical's bare-name
    # heuristic lands it on the shared 'text' slot, whose ALIAS LIST also
    # contains 'body'/'author'/'caption'/'bio' etc. (generic text-slot
    # synonyms used for IDENTITY resolution across many unrelated blocks).
    # Once `body` stopped being its own dedicated attr (this same rebuild),
    # a `.sgs-quote__body` element lost its Tier-0 attr-name destination and
    # fell to Tier-1 alias matching on the SAME shared 'text' canonical_slot
    # — silently and WRONGLY winning the 'attribution' attr ahead of the
    # genuine `.sgs-quote__author`/`.sgs-quote__attribution` element (proven
    # live against tests/fixtures/conformance/sgs-quote.html, whose
    # `.sgs-quote__body` blockquote text was captured into `attribution`
    # instead of the `.sgs-quote__author` cite text). canonical_slot=NULL
    # closes the Tier-1 hole; `attr_name == bem_element` ('attribution' ==
    # 'attribution') still gives content_attr_for_element() a Tier-0 direct
    # match for a draft using the literal `attribution` token, and
    # `derived_selector='.sgs-quote__text'` still gives equivalent_block_for()
    # its identity resolution to sgs/text via Tier B — no identity is lost.
    # Extraction-side wiring: run_mechanism_b's generic path
    # (converter/services/extraction.py, `nested_attr_named` — EXACT attr-name
    # match only, deliberately narrower than content_attr_for_element's Tier-1
    # alias match, per the D279 QC regression guard) now checks for a 'nested'
    # hit before falling back to a generic ChildBlock, so this attr routes
    # without any block-slug literal and without the alias-collision risk.
    ("sgs/quote", "attribution"): {"role": "text-content", "emit_shape": "nested", "canonical_slot": None},
    # ---- box-object interface (Phase-1 pilot: container + button, 2026-07-09) ----
    # Merged box families classify via box_family (the family name). box_side stays
    # absent/None — the object attr holds all sides. Contract: .claude/plans/
    # 2026-07-09-box-object-interface-contract.md §3 DB categorisation.
    # These entries pre-register the classification; the object attrs are added to
    # block.json in a later wave. The override dict is applied at the next /sgs-update
    # after block.json lands.
    #
    # container: 3 box families × 3 tiers (base/tablet/mobile) = 9 attrs.
    # button: 3 box families × 2–3 tiers (borderWidth/borderRadius have no base object
    # currently, only tiers; padding/margin follow WP-native spacing base + tiers).
    # Wave-1 box-family rollout (2026-07-09): heading/text/quote merge their flat
    # per-side borderWidth into one SGS object attr. border-radius base routes to
    # WP-native style.border.radius (no SGS attr → no seed); padding/margin are
    # outside the border roster for these blocks (native or unchanged custom).
    # quote (block-private, content-KIND → block-private per qc-council 2026-07-09):
    # padding/margin tiers merge to SGS object attrs (base padding/margin route to
    # WP-native style.spacing.*). border-radius base → WP-native style.border.radius.
    # media (block-private, atomic img clone target → block-private): only border-radius
    # migrates. Base radius → WP-native style.border.radius (no seed). Tier radius →
    # SGS object attrs, seeded like button's radius tiers so the converter accumulator
    # builds them from a draft's responsive corner declarations.
    # hero (Task 2, section-KIND composite → KEEPS wrapper; 5 per-area SGS-custom box
    # families rendered block-privately, migrated flat→object. Base per-area families are
    # SGS custom objects (NOT WP-native — they target __content/__media/__split-image, not
    # the section root). imageBorderWidth has no tiers (desktop only). contentBandPadding
    # is consumed by SGS_Container_Wrapper (object, mirrors container).
    # Wave-1 leaf blocks (2026-07-10, D297): 8 single-element/leaf blocks migrated
    # block-private to no-inline. Each adds SGS padding/margin tier objects (base
    # padding/margin route to WP-native style.spacing.*, already object-shaped, no
    # seed). counter + whatsapp-cta also add border-radius tier objects (base radius
    # -> WP-native style.border.radius, no seed). label has NO WP padding support
    # (padding:false), so its BASE padding is a custom SGS object -> seeded here;
    # its borderRadius stays a single scalar (uniform, not a 4-corner family -> no seed).
    # Wave-2 batch 1 (2026-07-10): 4 leaf/inline block-private blocks migrated
    # to no-inline. padding/margin base route to WP-native style.spacing.* (already
    # object-shaped, no seed); tier objects seeded here. table-of-contents +
    # countdown-timer add border-radius tier objects (base radius -> WP-native
    # style.border.radius, no seed). decorative-image is an absolute-position/
    # transform block with no box family -> no seed (inline-render fix only).
    # Wave-2 batch 2 (2026-07-10): 4 leaf/array/timeline block-private blocks.
    # padding/margin base -> WP-native style.spacing.* (object, no seed); tiers seeded.
    # icon-list/timeline/process-steps take the quote route for border (custom
    # borderWidth object + scalar colour/style, radius base native); brand-strip keeps
    # native border wholesale (radius tiers only). process-steps has no responsive
    # radius (no radius tier attrs). box-shadow (timeline/process-steps) stays the
    # native shadow support, scoped -> NOT a box family, no seed.
    # Wave-2 batch 3 (2026-07-10): the 2 keep-structure InnerBlocks navs.
    # mobile-nav adds padding tier objects (base padding -> WP-native style.spacing.*,
    # object, no seed). mega-menu is colour-only (no box family -> no seed).
    # sgs/option-picker (2026-07-10, cloning-fidelity + no-inline pass): the
    # option-picker's pill states are now converter-liftable via the universal
    # styling-lift (Spec 31 §3.B B2 — the frozen __hover/__active/__focus
    # exclusion was removed 2026-07-10, so a state-keyed derived_selector now
    # routes correctly). RESTING attrs key on the base pill element
    # (.sgs-option-picker__pill — already correct for pillTextColour/
    # pillBorderColour, seeded 2026-07-05 — see the existing pillFontSize
    # block above). SELECTED attrs key on the draft's STATIC `--active`
    # modifier class: a mockup marks its selected pill by baking
    # `sgs-option-picker__pill--active` directly into the markup (no live
    # interaction in a static draft), and derived_selector resolution is a
    # plain BeautifulSoup class match (`node.find(class_=...)`, no CSS
    # pseudo-class support) — so ONLY a literal element class can be matched.
    # pillBgColour was missing a role/derived_selector row entirely (verified
    # against render.php: :164 emits it as `--sgs-op-bg` on the SAME pill
    # element pillTextColour/pillBorderColour already route through).
    ("sgs/option-picker", "pillBgColour"): {"role": "color", "derived_selector": ".sgs-option-picker__pill"},
    ("sgs/option-picker", "pillSelectedBgColour"): {"role": "color", "derived_selector": ".sgs-option-picker__pill--active"},
    ("sgs/option-picker", "pillSelectedTextColour"): {"role": "color", "derived_selector": ".sgs-option-picker__pill--active"},
    ("sgs/option-picker", "pillSelectedBorderColour"): {"role": "color", "derived_selector": ".sgs-option-picker__pill--active"},
    # Border-radius — KEPT SCALAR (Spec 32 §6.1c discretion clause: a pill is
    # semantically always uniform-radius, no per-corner design use-case, unlike
    # button/heading/media/quote/text which DO merge to the 4-corner object —
    # see this session's cloning report for the full reasoning). The attr is a
    # CSS-length STRING ("6px"), matching the styling-lift's generic string value
    # (SHIP-WITH-FIX: number->string migration removes the number/string mismatch
    # AND makes an explicit "0"/"0px" distinguishable from unset). role='typography'
    # is the SAME generic scalar-CSS-value bucket letter-spacing/line-height use in
    # styling_content.py's `_compute_value` fallback (raw-string passthrough for any
    # non-colour/font-weight/font-size css_property) — NOT a semantic mis-seed, it is
    # the established mechanism for "any scalar element-level CSS value lifted by
    # suffix", which the codebase names 'typography' for historical (font-first)
    # reasons. UNVERIFIED: this session could not query a live sgs-framework.db
    # (worktree copy has zero tables) to confirm property_suffixes has a resolvable
    # 'BorderRadius' suffix -> css_property 'border-radius' row; the main session
    # MUST verify this before/at the next /sgs-update (if the suffix is absent or
    # NULL, these two rows are inert — no crash, just a silent non-lift, per the
    # styling_content.py no-op floor).
    ("sgs/option-picker", "pillBorderRadius"): {"role": "typography", "derived_selector": ".sgs-option-picker__pill"},
    ("sgs/option-picker", "pillSelectedBorderRadius"): {"role": "typography", "derived_selector": ".sgs-option-picker__pill--active"},
    # Root box-family migration (mirrors sgs/quote exactly — content-KIND,
    # block-private, box+width only).
    # pillPadding — SGS custom box family, NEW (2026-07-10): the pill is a
    # content CHILD (not the block root), so there is no WP-native spacing
    # support to route through; base + tiers are a dedicated box_family so a
    # future converter accumulator pass can lift a draft's per-size pill
    # padding onto it (currently authored-only via the editor BoxControl —
    # no converter resolver targets `pillPadding*` yet, an honest gap, see
    # the cloning report).
    # sgs/product-card — R4 forward attrs (2026-07-10): liftable so a cloned
    # card (a draft rendering its OWN `.sgs-product-card__pill` BEM elements,
    # not a live sgs/option-picker block) routes the draft's pill CSS onto the
    # card's own pickerPill* attrs, which render.php then forwards into every
    # nested render_block('sgs/option-picker') call. Same resting/selected
    # selector-pair convention as option-picker itself (static `--active`
    # modifier class for the selected pill in the draft markup).
    ("sgs/product-card", "pickerPillBgColour"): {"role": "color", "derived_selector": ".sgs-product-card__pill"},
    ("sgs/product-card", "pickerPillTextColour"): {"role": "color", "derived_selector": ".sgs-product-card__pill"},
    ("sgs/product-card", "pickerPillBorderColour"): {"role": "color", "derived_selector": ".sgs-product-card__pill"},
    ("sgs/product-card", "pickerPillSelectedBgColour"): {"role": "color", "derived_selector": ".sgs-product-card__pill--active"},
    ("sgs/product-card", "pickerPillSelectedTextColour"): {"role": "color", "derived_selector": ".sgs-product-card__pill--active"},
    ("sgs/product-card", "pickerPillSelectedBorderColour"): {"role": "color", "derived_selector": ".sgs-product-card__pill--active"},
    # Same discretion + same unverified-suffix caveat as option-picker's own
    # pillBorderRadius/pillSelectedBorderRadius above.
    ("sgs/product-card", "pickerPillBorderRadius"): {"role": "typography", "derived_selector": ".sgs-product-card__pill"},
    ("sgs/product-card", "pickerPillSelectedBorderRadius"): {"role": "typography", "derived_selector": ".sgs-product-card__pill--active"},
}


# _derive_has_inner_blocks / _populate_has_inner_blocks RETIRED (EXECUTION
# Step 16, 2026-07-05) — see the retirement banner near
# _render_consumes_content's definition. has_inner_blocks is now derived
# fresh at convert-time (converter.services.has_inner), never seeded here.


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


def _apply_attr_classification_overrides(
    conn: sqlite3.Connection,
    blocks_dir: Path,
    dry_run: bool = False,
) -> dict:
    """Stage 1 sub-step C: apply ATTR_CLASSIFICATION_OVERRIDES + declarative
    block.json box_family overrides (`supports.sgs.boxFamilies`).

    Runs AFTER `_run_canonical_assignment` so it is the final writer on
    block_attributes.role/canonical_slot for the listed (slug, attr) pairs —
    correcting genuine mis-derivations the assign-canonical heuristic makes.
    box_family is NO LONGER hardcoded here — it is derived per-block from
    block.json (`_collect_boxfamily_overrides`) and merged in, so the dict holds
    only role/derived_selector/emit-shape corrections. Idempotent; re-applies on
    every /sgs-update.

    Returns counts dict: {"override_applied": int, "override_missing_row": int}.
    """
    c = conn.cursor()
    applied = 0
    missing = 0
    # Combine the hand-authored role/derived_selector corrections with the
    # DECLARATIVE box_family map read from each block.json (single source of
    # truth; a block never appears in both for the SAME field).
    combined: dict[tuple[str, str], dict[str, object]] = {
        k: dict(v) for k, v in ATTR_CLASSIFICATION_OVERRIDES.items()
    }
    for key, fields in _collect_boxfamily_overrides(blocks_dir).items():
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

    # --- Stage 1 sub-step A: populate block_composition.accepts_allowed_blocks ---
    ab_counts = _populate_allowed_blocks(blocks_dir, c, dry_run)
    ab_scanned = ab_counts["allowed_blocks_scanned"]
    ab_populated = ab_counts["allowed_blocks_populated"]
    ab_updated = ab_counts["allowed_blocks_updated"]
    ab_dynamic_skipped = ab_counts["allowed_blocks_dynamic_skipped"]

    if not dry_run:
        conn.commit()
        _run_canonical_assignment(conn)

        # --- Stage 1 sub-step C: apply per-attr classification overrides ---
        # (AFTER canonical assignment so overrides are the final writer.)
        ov_counts = _apply_attr_classification_overrides(conn, blocks_dir, dry_run=False)
        print(
            f"Stage 1 (attr-overrides): applied={ov_counts['override_applied']}, "
            f"missing_row={ov_counts['override_missing_row']}."
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
        errors="replace",
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
        errors="replace",
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
            errors="replace",
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
# Stage 11 — Container-wrapper attribute mirror (WS-4, D160)
# ---------------------------------------------------------------------------
# Runs sync-container-wrapping-blocks.py in --write-block-json mode (report-only
# by default — NO --apply flag so no block.json files are written).  A container
# version-bump surfaces the diff for operator review; --apply is gated behind an
# explicit operator command.
#
# The script is invoked as a subprocess (same pattern as Stage 7 / Stage 8) so
# it runs in its own Python process and cannot import-side-effect this module.


def stage_11_container_mirror_report(dry_run: bool = False) -> dict:
    """Stage 11 — container-wrapper attribute mirror diff (report-only).

    Calls sync-container-wrapping-blocks.py --write-block-json (no --apply).
    dry_run=True: just prints what Stage 11 would invoke and returns stub output.
    """
    sync_script = (
        Path(__file__).resolve().parent / "sync-container-wrapping-blocks.py"
    )
    if not sync_script.exists():
        msg = f"sync-container-wrapping-blocks.py not found at {sync_script}"
        print(f"Stage 11 ERROR: {msg}")
        return {"error": msg, "dry_run": dry_run}

    if dry_run:
        print(
            f"Stage 11 [dry-run]: would run:\n"
            f"  python {sync_script} --write-block-json\n"
            "(no --apply — operator-gated; this stage only surfaces the diff)"
        )
        return {"status": "dry-run", "dry_run": True}

    cmd = [sys.executable, str(sync_script), "--write-block-json"]
    print(f"Stage 11: running {' '.join(cmd)}")
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
            print(f"Stage 11 WARN: {msg}")
            return {"status": "warn", "returncode": result.returncode, "dry_run": False}
        print("Stage 11: container-wrapper mirror diff complete.")
        return {"status": "ok", "dry_run": False}
    except subprocess.TimeoutExpired:
        msg = "sync-container-wrapping-blocks.py timed out after 120 s"
        print(f"Stage 11 ERROR: {msg}")
        return {"error": msg, "dry_run": False}
    except Exception as exc:
        msg = str(exc)
        print(f"Stage 11 ERROR: {msg}")
        return {"error": msg, "dry_run": False}


# ---------------------------------------------------------------------------
# Main dispatcher
# ---------------------------------------------------------------------------

def _build_stage_dispatch(conn: sqlite3.Connection, args: argparse.Namespace) -> dict[int, Callable[[], dict]]:
    """Build {stage_num: lambda} mapping; each lambda runs the right stage function.

    Stage 3 is retired — its lambda prints the tombstone line and returns
    {"status": "retired", "dry_run": args.dry_run}.
    Stage 10 is the prune-orphans stage (controlled by --prune-mode).
    Stage 11 is the container-wrapper attribute mirror diff (WS-4, D160).
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
        11: lambda: stage_11_container_mirror_report(dry_run=args.dry_run),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SGS framework knowledge base — 11-stage holistic refresh",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--stage",
        type=int,
        choices=range(1, 12),
        metavar="N",
        help="Run a single stage only (1-11). Omit to run all stages.",
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

    stages_to_run = [args.stage] if args.stage else list(range(1, 12))
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
        # 2026-07-16 (qc-council): READ the stage's OWN reported status first.
        # This loop previously did `status = result.get("error", "ok")` and NEVER looked at
        # result["status"] — so any stage returning {"status": "warn"} (or "retired",
        # "refreshed", "synced") printed a flat **"ok"** unless it happened to carry an
        # "error" key. Measured live: Stage 11 returned {"status": "warn", "returncode": 1}
        # and the summary said "Stage 11: ok"; Stage 3 returned {"status": "retired"} and
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


if __name__ == "__main__":
    main()
