#!/usr/bin/env python3
"""SGS Framework DB Enrichment — 10 targets in one idempotent pass.

Targets:
  2.1  slots — 26 anomaly attrs + container's 15 new attrs (D99: slot_synonyms → slots)
  2.2  block_attributes.enum_values — verify/fix auto-population
  2.3  block_attributes.equivalent_implementations — Rosetta Stone seed
  2.4  style_variations sync — scan theme/sgs-theme/styles/*.json, upsert
  2.5  block_attributes.inspector_control_type — new column + regex parse
  2.6  block_supports.sgs.* — verify SGS custom supports captured
  2.7  design_tokens refresh — re-scan theme.json + all variation JSONs
  2.8  pattern_coverage — populate from patterns table + theme patterns
  2.9  hooks — upsert all sgs_* hooks found in PHP
  2.10 /sgs-update post-flight health check wire-up

Dual-DB: always writes to both
  ~/.claude/skills/sgs-wp-engine/sgs-framework.db
  ~/.agents/skills/sgs-wp-engine/sgs-framework.db

Idempotent: INSERT OR IGNORE / UPSERT throughout.

Usage:
    python plugins/sgs-blocks/scripts/uimax-tools/enrich-db.py [--repo PATH] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# DB paths
# ---------------------------------------------------------------------------
_CLAUDE_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_AGENTS_DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

BOTH_DBS = [_CLAUDE_DB, _AGENTS_DB]


def get_conn(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def auto_repo() -> Path | None:
    """Auto-detect repo root from script location."""
    script_dir = Path(__file__).resolve().parent
    candidate = script_dir.parent.parent.parent.parent  # 4 levels up
    if (candidate / "plugins" / "sgs-blocks").exists():
        return candidate
    return None


# ===========================================================================
# TARGET 2.1 — slot_synonyms: anomaly attrs + container new attrs
# ===========================================================================

# Anomaly blocks attrs that have NULL canonical_slot.
# Format: attr_name -> canonical_slot (mapping to the nearest matching canonical)
ANOMALY_ATTR_SLOTS: dict[str, str] = {
    # sgs/multi-button — 14 attrs (flex layout controls)
    "direction": "layout",
    "directionTablet": "layout",
    "directionMobile": "layout",
    "gap": "gap",
    "gapTablet": "gap",
    "gapMobile": "gap",
    "gapUnit": "gap",
    "justifyContent": "layout",
    "justifyContentTablet": "layout",
    "justifyContentMobile": "layout",
    "wrap": "layout",
    "wrapTablet": "layout",
    "wrapMobile": "layout",
    "alignItems": "layout",
    # sgs/form-field-hidden — 5 attrs
    "fieldName": "label",
    "defaultValue": "text",
    "conditionalField": "text",
    "conditionalOperator": "text",
    "conditionalValue": "text",
    # sgs/accordion-item — 2 attrs
    "title": "heading",
    "isOpen": "text",
    # sgs/featured-product, sgs/footer, sgs/gift-section, sgs/header, sgs/social-proof — 1 each
    "text": "text",
}

# container's 15 new attrs with NULL canonical_slot
CONTAINER_NEW_ATTR_SLOTS: dict[str, str] = {
    "backgroundOverlayColour": "overlay",
    "backgroundOverlayOpacity": "overlay",
    "backgroundRepeat": "backgroundMedia",
    "bgAnimationDuration": "animation",
    "bgKenBurns": "animation",
    "bgParallax": "parallax",
    "bgVideo": "backgroundMedia",
    "bgVideoMobile": "backgroundMedia",
    "overlayGradientAngle": "overlay",
    "overlayGradientFrom": "overlay",
    "overlayGradientTo": "overlay",
    # Already set to overlay / backgroundMedia but may be NULL in some rows
    "columns": "column",
    "columnsMobile": "column",
    "columnsTablet": "column",
    "customWidth": "width",
    "customWidthUnit": "width",
    "gap": "gap",
    "gapMobile": "gap",
    "gapTablet": "gap",
    "gridTemplateColumns": "layout",
    "gridTemplateColumnsMobile": "layout",
    "gridTemplateColumnsTablet": "layout",
    "layout": "layout",
    "maxWidth": "max",
    "minHeight": "min",
    "shadow": "shadow",
    "shapeDividerBottom": "separator",
    "shapeDividerBottomColour": "separator",
    "shapeDividerBottomFlip": "separator",
    "shapeDividerBottomScale": "separator",
    "shapeDividerBottomInvert": "separator",
    "shapeDividerTop": "separator",
    "shapeDividerTopColour": "separator",
    "shapeDividerTopFlip": "separator",
    "shapeDividerTopScale": "separator",
    "shapeDividerTopInvert": "separator",
}


def target_21_canonical_slots(conn: sqlite3.Connection, dry_run: bool) -> int:
    """Backfill canonical_slot for anomaly block attrs + container new attrs.

    ⚠ RENAMED 2026-08-02 (was ``target_21_slot_synonyms``). The old name was a
    STALE LABEL, not a stale behaviour — this writes the current ``slots`` table
    and has done since D99 — but it cost real time: a grep for "slot_synonyms"
    flagged this function, and the resulting "one target still writes the retired
    slot_synonyms" claim was recorded as a BLOCKER on wiring this script. Reading
    the body cleared it. The real slot_synonyms reference was three targets away,
    in the health check (2.10), where the name gave no hint at all.

    D99 2026-05-29: slot vocab now lives in `slots` (scope='element') not
    slot_synonyms (dropped). NEW_SYNONYMS seeds `slots` accordingly.
    html_semantic_tag and role columns retired — not present in `slots`.
    """
    updated = 0

    # Build combined map: attr_name -> slot (anomaly + container)
    all_map = {**ANOMALY_ATTR_SLOTS, **CONTAINER_NEW_ATTR_SLOTS}

    # Also make sure the canonical slots used above exist in the `slots` table
    # (D99 2026-05-29: slot_synonyms was dropped; unified `slots` table with
    # scope='element'/'section'. html_semantic_tag and role columns were NOT
    # migrated — html_semantic_tag retired deliberately; role is in `roles` table).
    # New slots needed: layout, parallax, column.
    NEW_SYNONYMS = [
        ("layout", ["layoutType", "direction", "flexDirection", "gridColumns"],
         "Layout mode / direction control for flex/grid containers"),
        ("parallax", ["parallaxSpeed", "bgParallax", "parallaxOffset"],
         "Parallax scroll effect attributes"),
        ("column", ["columns", "columnCount", "numColumns"],
         "Column count / layout column control"),
    ]
    if not dry_run:
        for slot_name, aliases, notes in NEW_SYNONYMS:
            conn.execute(
                """INSERT OR IGNORE INTO slots
                   (slot_name, scope, aliases, notes)
                   VALUES (?, 'element', ?, ?)""",
                (slot_name, json.dumps(aliases), notes),
            )

    # Now backfill NULL canonical_slot rows
    for attr_name, canonical in all_map.items():
        if dry_run:
            rows = conn.execute(
                "SELECT block_slug FROM block_attributes WHERE attr_name=? AND canonical_slot IS NULL",
                (attr_name,),
            ).fetchall()
            if rows:
                updated += len(rows)
        else:
            cur = conn.execute(
                "UPDATE block_attributes SET canonical_slot=? WHERE attr_name=? AND canonical_slot IS NULL",
                (canonical, attr_name),
            )
            updated += cur.rowcount

    if not dry_run:
        conn.commit()
    return updated


# ===========================================================================
# TARGET 2.2 — enum_values auto-population verification
# ===========================================================================

def target_22_enum_values(conn: sqlite3.Connection, repo_path: Path | None, dry_run: bool) -> int:
    """Verify enum_values are populated from block.json; fill gaps."""
    if repo_path is None:
        print("  2.2 SKIP: no repo path")
        return 0

    blocks_dir = repo_path / "plugins" / "sgs-blocks" / "src" / "blocks"
    updated = 0

    for block_dir in sorted(blocks_dir.iterdir()):
        if not block_dir.is_dir():
            continue
        block_json_path = block_dir / "block.json"
        if not block_json_path.exists():
            continue
        try:
            data = json.loads(block_json_path.read_text(encoding="utf-8"))
        except Exception:
            continue

        slug = data.get("name", f"sgs/{block_dir.name}")
        attributes = data.get("attributes", {})

        for attr_name, attr_def in attributes.items():
            if not isinstance(attr_def, dict):
                continue  # skip _comment_* pseudo-attrs (string values)
            enum_vals = attr_def.get("enum")
            if enum_vals is None:
                continue
            enum_json = json.dumps(enum_vals)

            # Check current DB value
            row = conn.execute(
                "SELECT id, enum_values FROM block_attributes WHERE block_slug=? AND attr_name=?",
                (slug, attr_name),
            ).fetchone()
            if row is None:
                continue  # attr not in DB — update-db.py handles inserts

            if row["enum_values"] != enum_json:
                if not dry_run:
                    conn.execute(
                        "UPDATE block_attributes SET enum_values=? WHERE id=?",
                        (enum_json, row["id"]),
                    )
                updated += 1

    if not dry_run and updated:
        conn.commit()
    return updated


# ===========================================================================
# TARGET 2.3 — equivalent_implementations Rosetta Stone seed
# ===========================================================================

def _make_rosetta(slug: str, attr_name: str, attr_type: str, enum_vals: str | None) -> str:
    """Build equivalent_implementations JSON for one attr."""
    block_name = slug.replace("sgs/", "")
    # SGS-BEM slot guess: use attr_name converted to lowercase-hyphen
    bem_element = re.sub(r"([A-Z])", r"-\1", attr_name).lower().lstrip("-")

    if enum_vals:
        try:
            vals = json.loads(enum_vals)
            modifier_example = vals[0] if vals else "value"
        except Exception:
            modifier_example = "value"
        html_example = f'<div class="sgs-{block_name}__{bem_element}--{modifier_example}"></div>'
        wp_example = f'<!-- wp:sgs/{block_name} {{{json.dumps(attr_name)}: {json.dumps(modifier_example)}}} /-->'
    else:
        if attr_type in ("boolean",):
            html_example = f'<div class="sgs-{block_name}__{bem_element}--true"></div>'
            wp_example = f'<!-- wp:sgs/{block_name} {{{json.dumps(attr_name)}: true}} /-->'
        elif attr_type in ("integer", "number"):
            html_example = f'<div class="sgs-{block_name}__{bem_element}" style="{bem_element}: 100px"></div>'
            wp_example = f'<!-- wp:sgs/{block_name} {{{json.dumps(attr_name)}: 100}} /-->'
        else:
            html_example = f'<div class="sgs-{block_name}__{bem_element}">value</div>'
            wp_example = f'<!-- wp:sgs/{block_name} {{{json.dumps(attr_name)}: "value"}} /-->'

    result = {
        "sgs_wp": wp_example,
        "html_css": html_example,
        "sgs_bem_element": f"sgs-{block_name}__{bem_element}",
    }
    return json.dumps(result, ensure_ascii=False)


def target_23_equivalent_implementations(conn: sqlite3.Connection, dry_run: bool) -> int:
    """Seed equivalent_implementations for all rows where NULL."""
    rows = conn.execute(
        "SELECT id, block_slug, attr_name, attr_type, enum_values FROM block_attributes WHERE equivalent_implementations IS NULL"
    ).fetchall()

    updated = 0
    for row in rows:
        rosetta = _make_rosetta(row["block_slug"], row["attr_name"], row["attr_type"] or "string", row["enum_values"])
        if not dry_run:
            conn.execute(
                "UPDATE block_attributes SET equivalent_implementations=? WHERE id=?",
                (rosetta, row["id"]),
            )
        updated += 1

    if not dry_run and updated:
        conn.commit()
    return updated


# ===========================================================================
# TARGET 2.4 — style_variations sync from *.json files
# ===========================================================================

def target_24_style_variations(conn: sqlite3.Connection, repo_path: Path | None, dry_run: bool) -> int:
    """Scan styles/*.json and upsert into style_variations with source_path + last_modified."""
    if repo_path is None:
        print("  2.4 SKIP: no repo path")
        return 0

    # Ensure source_path + last_modified columns exist (add if missing)
    existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(style_variations)").fetchall()}
    if not dry_run:
        if "source_path" not in existing_cols:
            conn.execute("ALTER TABLE style_variations ADD COLUMN source_path TEXT")
        if "last_modified" not in existing_cols:
            conn.execute("ALTER TABLE style_variations ADD COLUMN last_modified TEXT")
        conn.commit()

    styles_dir = repo_path / "theme" / "sgs-theme" / "styles"
    if not styles_dir.exists():
        print("  2.4 SKIP: styles dir not found")
        return 0

    upserted = 0
    for json_file in sorted(styles_dir.glob("*.json")):
        slug = json_file.stem
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  2.4 WARN: could not parse {json_file.name}: {e}")
            continue

        title = data.get("title", slug)
        settings = data.get("settings", {})
        palette = settings.get("color", {}).get("palette", [])
        font_families = settings.get("typography", {}).get("fontFamilies", [])

        # Build tokens_json from palette
        tokens = {}
        for c in palette:
            token_slug = c.get("slug", "")
            color = c.get("color", "")
            if token_slug and color:
                tokens[token_slug] = color

        tokens_json = json.dumps(tokens)

        # Font families
        font_heading = None
        font_body = None
        for fam in font_families:
            fs = fam.get("slug", "")
            name = fam.get("name", "")
            if fs == "heading":
                font_heading = name
            elif fs == "body":
                font_body = name

        import time
        last_modified = time.strftime(
            "%Y-%m-%dT%H:%M:%S",
            time.localtime(json_file.stat().st_mtime),
        )
        source_path = str(json_file.relative_to(repo_path)).replace("\\", "/")

        if not dry_run:
            conn.execute(
                """INSERT INTO style_variations
                       (slug, title, tokens_json, font_heading, font_body, source_path, last_modified)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(slug) DO UPDATE SET
                       title=excluded.title,
                       tokens_json=excluded.tokens_json,
                       font_heading=excluded.font_heading,
                       font_body=excluded.font_body,
                       source_path=excluded.source_path,
                       last_modified=excluded.last_modified""",
                (slug, title, tokens_json, font_heading, font_body, source_path, last_modified),
            )
        upserted += 1

    if not dry_run and upserted:
        conn.commit()
    return upserted


# ===========================================================================
# TARGET 2.5 — inspector_control_type column + regex parse
# ===========================================================================

def target_25_inspector_control_type(
    conn: sqlite3.Connection, repo_path: Path | None, dry_run: bool
) -> int:
    """Ensure the inspector_control_type column exists.

    REMOVED 2026-07-21 (Bean instruction: "wire the inspector controls seeder into
    sgs-update and remove whatever is setting the current data"): this function used
    to ALSO populate the column via a crude regex parse (`_parse_edit_js_controls` —
    a "look backwards up to 15 lines for a control component" heuristic that missed
    nested render-prop shapes like `<MediaUpload render={({open}) => <Button.../>}>`
    and dual-bound fallback ternaries). That heuristic produced 93 wrong values which
    then persisted forever, because the BETTER parser (extract-signatures.py's Task
    B) had a fill-NULL-only policy and never overwrote them.

    The population responsibility has moved entirely to
    `behavioural-analyser/extract-signatures.py::extract_inspector_control_types`,
    now wired into `sgs-update-v2.py` Stage 1 as a tail step
    (`_run_inspector_control_type_seed`) with an overwrite-on-disagreement policy,
    justified by `.claude/reports/inspector-control-type-audit-2026-07-21.md` (88/93
    DERIVED_CORRECT, 0 STORED_CORRECT). This function now ONLY ensures the column
    exists (idempotent, harmless to keep here since other enrich-db.py targets may
    run before sgs-update-v2.py on a fresh DB) — it writes NO row data.
    """
    existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(block_attributes)").fetchall()}
    if "inspector_control_type" not in existing_cols:
        if not dry_run:
            conn.execute("ALTER TABLE block_attributes ADD COLUMN inspector_control_type TEXT")
            conn.commit()
    return 0


# ===========================================================================
# TARGET 2.6 — block_supports.sgs.* verification
# ===========================================================================

def target_26_block_supports_sgs(conn: sqlite3.Connection, repo_path: Path | None, dry_run: bool) -> int:
    """Verify block_supports captures sgs.* flags from block.json; fill gaps."""
    if repo_path is None:
        print("  2.6 SKIP: no repo path")
        return 0

    blocks_dir = repo_path / "plugins" / "sgs-blocks" / "src" / "blocks"
    upserted = 0

    for block_dir in sorted(blocks_dir.iterdir()):
        if not block_dir.is_dir():
            continue
        block_json_path = block_dir / "block.json"
        if not block_json_path.exists():
            continue
        try:
            data = json.loads(block_json_path.read_text(encoding="utf-8"))
        except Exception:
            continue

        slug = data.get("name", f"sgs/{block_dir.name}")
        supports = data.get("supports", {})
        sgs_supports = supports.get("sgs")

        if sgs_supports is None:
            continue

        sgs_json = json.dumps(sgs_supports, sort_keys=True)

        # Check if already in DB
        row = conn.execute(
            "SELECT support_value FROM block_supports WHERE block_slug=? AND support_name='sgs'",
            (slug,),
        ).fetchone()

        if row is None:
            # Insert
            if not dry_run:
                conn.execute(
                    "INSERT OR IGNORE INTO block_supports (block_slug, support_name, support_value) VALUES (?, 'sgs', ?)",
                    (slug, sgs_json),
                )
            upserted += 1
        elif row["support_value"] != sgs_json:
            # Update stale value
            if not dry_run:
                conn.execute(
                    "UPDATE block_supports SET support_value=? WHERE block_slug=? AND support_name='sgs'",
                    (sgs_json, slug),
                )
            upserted += 1

    if not dry_run and upserted:
        conn.commit()
    return upserted


# ===========================================================================
# TARGET 2.7 — design_tokens refresh from theme.json + variation JSONs
# ===========================================================================

def target_27_design_tokens(conn: sqlite3.Connection, repo_path: Path | None, dry_run: bool) -> int:
    """Re-scan theme.json and all variation JSONs, upsert design_tokens."""
    if repo_path is None:
        print("  2.7 SKIP: no repo path")
        return 0

    theme_json_path = repo_path / "theme" / "sgs-theme" / "theme.json"
    if not theme_json_path.exists():
        print("  2.7 SKIP: theme.json not found")
        return 0

    try:
        theme_data = json.loads(theme_json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  2.7 WARN: could not parse theme.json: {e}")
        return 0

    upserted = 0
    settings = theme_data.get("settings", {})

    # token_type CHECK constraint: ('colour', 'font', 'spacing', 'size', 'shadow') — UK English.
    # (Corrected 2026-08-24: this comment previously claimed "no shadow type" — the live
    # CHECK constraint has carried 'shadow' since before this audit; verified via
    # `SELECT sql FROM sqlite_master WHERE name='design_tokens'`.)
    # token_type IS included in the UPDATE SET so a re-run can correct a previously
    # mistyped row (e.g. a shadow row upserted before 'shadow' was used as its type) —
    # a plain default_value/css_var/description-only SET can never fix that.
    def _upsert_token(c: sqlite3.Connection, slug: str, token_type: str, value: str, css_var: str, desc: str) -> None:
        c.execute(
            """INSERT INTO design_tokens (slug, token_type, default_value, css_var, description)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(slug) DO UPDATE SET
                   token_type=excluded.token_type,
                   default_value=excluded.default_value,
                   css_var=excluded.css_var,
                   description=excluded.description""",
            (slug, token_type, value, css_var, desc),
        )

    # Colours
    for c in settings.get("color", {}).get("palette", []):
        slug = c.get("slug", "")
        color = c.get("color", "")
        if not slug or not color:
            continue
        css_var = f"var(--wp--preset--color--{slug})"
        desc = c.get("name", slug)
        if not dry_run:
            _upsert_token(conn, slug, "colour", color, css_var, desc)
        upserted += 1

    # Font sizes — map to 'size' token type (font-size not in constraint)
    for fs in settings.get("typography", {}).get("fontSizes", []):
        slug = fs.get("slug", "")
        size_val = str(fs.get("size", ""))
        if not slug or not size_val:
            continue
        css_var = f"var(--wp--preset--font-size--{slug})"
        desc = fs.get("name", slug)
        if not dry_run:
            _upsert_token(conn, f"font-size-{slug}", "size", size_val, css_var, desc)
        upserted += 1

    # Spacing
    for sp in settings.get("spacing", {}).get("spacingSizes", []):
        slug = sp.get("slug", "")
        size_val = str(sp.get("size", ""))
        if not slug or not size_val:
            continue
        css_var = f"var(--wp--preset--spacing--{slug})"
        desc = sp.get("name", slug)
        if not dry_run:
            _upsert_token(conn, slug, "spacing", size_val, css_var, desc)
        upserted += 1

    # Shadows — 'shadow' is its own token_type in the CHECK constraint (see comment above);
    # matches the writer in sgs-update-v2.py's _extract_shadow_tokens (token_type='shadow').
    for sh in settings.get("shadow", {}).get("presets", []):
        slug = sh.get("slug", "")
        shadow = sh.get("shadow", "")
        if not slug or not shadow:
            continue
        css_var = f"var(--wp--preset--shadow--{slug})"
        desc = sh.get("name", slug)
        if not dry_run:
            _upsert_token(conn, f"shadow-{slug}", "shadow", shadow, css_var, desc)
        upserted += 1

    if not dry_run and upserted:
        conn.commit()
    return upserted


# ===========================================================================
# TARGET 2.8 — pattern_coverage from patterns table + theme patterns
# ===========================================================================

# Industry slugs we track
INDUSTRIES = [
    "restaurant", "wholesale-food", "healthcare", "construction",
    "mosque", "professional-services", "eye-care", "wedding",
]

# Section types for industry coverage matrix
SECTION_TYPES = [
    "hero", "features", "testimonials", "cta", "stats", "team",
    "faq", "pricing", "contact", "footer", "gallery", "form",
    "process", "about", "trust", "partners",
]


def target_28_pattern_coverage(conn: sqlite3.Connection, repo_path: Path | None, dry_run: bool) -> int:
    """Populate pattern_coverage from patterns + theme pattern files."""
    inserted = 0

    # Get all patterns from patterns table
    patterns = conn.execute("SELECT slug, category, industry FROM patterns").fetchall()

    for pattern in patterns:
        slug = pattern["slug"]
        # Map to known section types
        matched_section = "other"
        for st in SECTION_TYPES:
            if st in slug.lower() or slug.lower().startswith(f"sgs/{st}"):
                matched_section = st
                break

        # Industry from pattern or 'general'
        industry = pattern["industry"] if pattern["industry"] else "general"

        if not dry_run:
            conn.execute(
                """INSERT OR IGNORE INTO pattern_coverage (industry, section_type, pattern_slug, status)
                   VALUES (?, ?, ?, 'complete')""",
                (industry, matched_section, slug),
            )
            inserted += 1
        else:
            existing = conn.execute(
                "SELECT 1 FROM pattern_coverage WHERE pattern_slug=?", (slug,)
            ).fetchone()
            if not existing:
                inserted += 1

    # Also scan theme pattern PHP files not yet in patterns table
    if repo_path:
        patterns_dir = repo_path / "theme" / "sgs-theme" / "patterns"
        if patterns_dir.exists():
            existing_slugs = {row[0] for row in conn.execute("SELECT pattern_slug FROM pattern_coverage").fetchall()}
            for php_file in sorted(patterns_dir.glob("*.php")):
                content = php_file.read_text(encoding="utf-8", errors="replace")
                slug_match = re.search(r"\*\s*Slug:\s*(.+)", content)
                if not slug_match:
                    continue
                slug = slug_match.group(1).strip()
                if slug in existing_slugs:
                    continue

                # Derive section type from slug
                matched_section = "other"
                slug_lower = slug.lower()
                for st in SECTION_TYPES:
                    if st in slug_lower:
                        matched_section = st
                        break

                if not dry_run:
                    conn.execute(
                        """INSERT OR IGNORE INTO pattern_coverage (industry, section_type, pattern_slug, status)
                           VALUES ('general', ?, ?, 'complete')""",
                        (matched_section, slug),
                    )
                    inserted += 1
                else:
                    inserted += 1

    if not dry_run and inserted:
        conn.commit()
    return inserted


# ===========================================================================
# TARGET 2.9 — hooks table: upsert all sgs_* hooks
# ===========================================================================

def target_29_hooks(conn: sqlite3.Connection, repo_path: Path | None, dry_run: bool) -> int:
    """Scan PHP files for sgs_* hooks and upsert into hooks table."""
    if repo_path is None:
        print("  2.9 SKIP: no repo path")
        return 0

    found: dict[str, dict] = {}

    for php_file in sorted(repo_path.rglob("*.php")):
        parts = php_file.parts
        if any(x in parts for x in ("vendor", "node_modules", "build")):
            continue
        if ".claude" in parts and "worktrees" in parts:
            continue  # skip worktree copies
        try:
            content = php_file.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        for m in re.finditer(
            r"(do_action|apply_filters)\s*\(\s*['\"]([^'\"]*sgs_[^'\"]*)['\"]",
            content,
        ):
            hook_fn = m.group(1)
            hook_name = m.group(2)
            hook_type = "action" if hook_fn == "do_action" else "filter"
            rel_path = php_file.relative_to(repo_path).as_posix()
            if hook_name not in found:
                found[hook_name] = {"type": hook_type, "file": rel_path}

    # Derive plugin_slug from file path
    upserted = 0
    for hook_name, info in found.items():
        file_path = info["file"]
        if "sgs-blocks" in file_path:
            plugin_slug = "sgs-blocks"
        elif "sgs-booking" in file_path:
            plugin_slug = "sgs-booking"
        elif "sgs-client-notes" in file_path:
            plugin_slug = "sgs-client-notes"
        elif "theme" in file_path:
            plugin_slug = "sgs-theme"
        else:
            plugin_slug = None

        if not dry_run:
            conn.execute(
                """INSERT INTO hooks (name, hook_type, plugin_slug, file_path)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(name, hook_type) DO UPDATE SET
                       plugin_slug=excluded.plugin_slug,
                       file_path=excluded.file_path""",
                (hook_name, info["type"], plugin_slug, file_path),
            )
        upserted += 1

    if not dry_run and upserted:
        conn.commit()
    return upserted


# ===========================================================================
# TARGET 2.10 — post-flight health check wiring
# ===========================================================================

def target_210_health_check(dry_run: bool) -> bool:
    """Write /sgs-update post-flight health summary JSON."""
    health_path = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-update-health.json"

    # Gather live counts from agents DB
    summary: dict = {"status": "ok", "tables": {}, "warnings": []}

    try:
        conn = get_conn(_AGENTS_DB)
        # `slot_synonyms` was DROPPED at D99 (2026-05-29) in favour of `slots`, and
        # this loop kept querying it — so target 2.10 has been guaranteed to throw
        # ever since, landing in the broad `except` below and reporting
        # `status: error` with no indication of which table was at fault.
        #
        # Two fixes, not one: the roster now names `slots`, AND a missing table is
        # skipped with a recorded warning instead of aborting the whole health
        # check. The second matters more — the next table to be retired must
        # degrade this target, never disable it. (`block_styles` and
        # `_meta_schema_version` were retired 2026-08-02; neither was in this
        # roster, but the next one might be.)
        for tbl in ["block_attributes", "slots", "design_tokens", "style_variations",
                    "pattern_coverage", "hooks", "patterns", "blocks"]:
            try:
                count = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
            except sqlite3.OperationalError:
                summary["warnings"].append(f"table `{tbl}` no longer exists — skipped")
                continue
            summary["tables"][tbl] = count

        # Check for nulls that indicate gaps
        null_slots = conn.execute(
            "SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NULL"
        ).fetchone()[0]
        null_equiv = conn.execute(
            "SELECT COUNT(*) FROM block_attributes WHERE equivalent_implementations IS NULL"
        ).fetchone()[0]
        null_control = conn.execute(
            "SELECT COUNT(*) FROM block_attributes WHERE inspector_control_type IS NULL"
        ).fetchone()[0]
        conn.close()

        summary["null_canonical_slot"] = null_slots
        summary["null_equivalent_implementations"] = null_equiv
        summary["null_inspector_control_type"] = null_control

        if null_slots > 100:
            summary["warnings"].append(f"{null_slots} block_attributes rows still have null canonical_slot")
        if null_equiv > 0:
            summary["warnings"].append(f"{null_equiv} rows missing equivalent_implementations")

    except Exception as e:
        summary["status"] = "error"
        summary["error"] = str(e)

    import time
    summary["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")

    if not dry_run:
        health_path.parent.mkdir(parents=True, exist_ok=True)
        health_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  2.10 health JSON written to {health_path}")

    return summary["status"] == "ok"


# ===========================================================================
# Main orchestrator
# ===========================================================================

# ===========================================================================
# Target registry + orchestrator
# ===========================================================================
#
# WHY A REGISTRY (2026-08-02, T1.6): `run_all` used to hardcode ten call sites in
# sequence, so this script was all-or-nothing. That was the stated blocker on
# wiring its two genuinely idempotent, genuinely useful seeders
# (`style_variations` 2.4 and `pattern_coverage` 2.8) into `/sgs-update`: you
# could not ask for those two without also firing eight other targets, one of
# which (2.7 design_tokens) rewrites data a rebuild also produces, and one of
# which (2.10) was silently broken. A registry makes `--only` a one-line filter
# and keeps the ordering explicit and reviewable in one place.
#
# `needs_repo` marks targets that read files from the repo checkout; `scope`
# distinguishes the per-database targets from 2.10, which runs once against the
# agents DB only. ORDER IS MEANINGFUL: 2.8 pattern_coverage reads `patterns`, so
# anything reseeding `patterns` must run before it.
_TARGETS: list[dict] = [
    {"id": "2.1", "title": "canonical slots (anomaly + container attrs)",
     "fn": target_21_canonical_slots, "needs_repo": False, "scope": "per-db",
     "verb": "backfilled canonical_slot"},
    {"id": "2.2", "title": "enum_values from block.json",
     "fn": target_22_enum_values, "needs_repo": True, "scope": "per-db",
     "verb": "enum_values updated"},
    {"id": "2.3", "title": "equivalent_implementations Rosetta Stone",
     "fn": target_23_equivalent_implementations, "needs_repo": False, "scope": "per-db",
     "verb": "seeded equivalent_implementations"},
    {"id": "2.4", "title": "style_variations sync",
     "fn": target_24_style_variations, "needs_repo": True, "scope": "per-db",
     "verb": "upserted style_variations"},
    {"id": "2.5", "title": "inspector_control_type column + parse",
     "fn": target_25_inspector_control_type, "needs_repo": True, "scope": "per-db",
     "verb": "populated inspector_control_type"},
    {"id": "2.6", "title": "block_supports sgs.* verification",
     "fn": target_26_block_supports_sgs, "needs_repo": True, "scope": "per-db",
     "verb": "upserted sgs supports"},
    {"id": "2.7", "title": "design_tokens refresh",
     "fn": target_27_design_tokens, "needs_repo": True, "scope": "per-db",
     "verb": "upserted design_tokens"},
    {"id": "2.8", "title": "pattern_coverage from patterns + block_composition",
     "fn": target_28_pattern_coverage, "needs_repo": True, "scope": "per-db",
     "verb": "inserted pattern_coverage"},
    {"id": "2.9", "title": "hooks upsert from PHP scan",
     "fn": target_29_hooks, "needs_repo": True, "scope": "per-db",
     "verb": "upserted hooks"},
    {"id": "2.10", "title": "post-flight health check JSON",
     "fn": target_210_health_check, "needs_repo": False, "scope": "once",
     "verb": "health status"},
]

TARGET_IDS = [t["id"] for t in _TARGETS]


def resolve_targets(only: str | None) -> list[dict]:
    """Return the targets to run. ``only=None`` means all of them.

    Unknown ids are a hard error listing the valid set — a typo'd ``--only``
    that silently ran nothing (or everything) would be worse than no selector.
    """
    if not only:
        return list(_TARGETS)
    wanted = [x.strip() for x in only.split(",") if x.strip()]
    unknown = [w for w in wanted if w not in TARGET_IDS]
    if unknown:
        raise SystemExit(
            f"unknown target id(s): {', '.join(unknown)}\n"
            f"valid ids: {', '.join(TARGET_IDS)}"
        )
    return [t for t in _TARGETS if t["id"] in wanted]


def run_all(repo_path: Path | None, dry_run: bool, only: str | None = None) -> None:
    verb = "[DRY-RUN] " if dry_run else ""
    selected = resolve_targets(only)
    if only:
        print(f"{verb}running {len(selected)} of {len(_TARGETS)} target(s): "
              f"{', '.join(t['id'] for t in selected)}")

    results: dict[str, dict] = {}
    per_db = [t for t in selected if t["scope"] == "per-db"]
    once = [t for t in selected if t["scope"] == "once"]

    if per_db:
        for label, db_path in [("sgs-claude", _CLAUDE_DB), ("sgs-agents", _AGENTS_DB)]:
            if not db_path.exists():
                print(f"  SKIP {label}: DB not found at {db_path}")
                continue

            print(f"\n{'='*60}")
            print(f"DB: {label}  ({db_path})")
            print(f"{'='*60}")

            conn = get_conn(db_path)
            try:
                for t in per_db:
                    print(f"\n{verb}Target {t['id']} — {t['title']}")
                    if t["needs_repo"]:
                        n = t["fn"](conn, repo_path, dry_run)
                    else:
                        n = t["fn"](conn, dry_run)
                    print(f"  {verb}{t['verb']}: {n}")
                    results.setdefault(t["id"], {})[label] = n
            finally:
                conn.close()

    for t in once:
        print(f"\n{verb}Target {t['id']} — {t['title']}")
        ok = t["fn"](dry_run)
        print(f"  {t['verb']}: {'ok' if ok else 'warnings present'}")

    print(f"\n{'='*60}")
    print("ENRICHMENT SUMMARY")
    print(f"{'='*60}")
    for target, db_results in sorted(results.items()):
        print(f"  {target}: {list(db_results.values())}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="SGS Framework DB Enrichment — 10 targets")
    parser.add_argument("--repo", default=None, help="Path to small-giants-wp repo root")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be done without writing")
    parser.add_argument("--only", default=None,
                        help="Comma-separated target ids to run (e.g. '2.4,2.8'). "
                             "Default: all.")
    parser.add_argument("--list-targets", action="store_true",
                        help="List the target ids and exit")
    args = parser.parse_args(argv)

    if args.list_targets:
        for t in _TARGETS:
            scope = "once" if t["scope"] == "once" else "per-db"
            repo = " [needs --repo]" if t["needs_repo"] else ""
            print(f"  {t['id']:<5} {t['title']}  ({scope}){repo}")
        return 0

    repo_path = Path(args.repo) if args.repo else auto_repo()
    if repo_path is None:
        print("WARNING: could not auto-detect repo path. Pass --repo to enable "
              "file-based targets.")

    run_all(repo_path, args.dry_run, args.only)
    return 0


if __name__ == "__main__":
    sys.exit(main())
