#!/usr/bin/env python3
"""stage_attribute_promotion.py — Operator-driven attribute-gap promotion stage.

Surfaces top `attribute_gap_candidates` rows from the uimax DB (ranked by
seen_count × confidence), lets the operator approve each one, then:
  - Adds the attr to `plugins/sgs-blocks/src/blocks/<slug>/block.json`
  - Adds an inline-style branch to `render.php`
  - Marks the DB row as promoted via `applied_at`

Commands:
  python stage_attribute_promotion.py list [--top N] [--source {uimax,sgs,both}]
  python stage_attribute_promotion.py promote --id <row_id> [--source {uimax,sgs}]
  python stage_attribute_promotion.py status

Idempotency: re-running with the same row_id is a no-op if already promoted.
Schema enumeration: uses `python ~/.claude/hooks/wp-blocks.py dump` contract.

Universal-extraction principle: code paths apply to ALL block_slugs, not
client-specific (Mama's Munches or otherwise). blub.db row 272 enforced here
— schema is enumerated at startup before any mutation.

UK English in all output and comments.

P2.ii of .claude/plans/phase-1-spec16-rewrite-2026-05-20.md
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from textwrap import dedent
from typing import Optional

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]  # small-giants-wp root
_BLOCKS_DIR = _REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"

# DB paths — canonical locations (never the worktree copies).
_SGS_DB = Path(os.path.expanduser("~/.agents/skills/sgs-wp-engine/sgs-framework.db"))
_UIMAX_DB = Path(os.path.expanduser("~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db"))

# ---------------------------------------------------------------------------
# Safety patterns
# ---------------------------------------------------------------------------

_BLOCK_SLUG_RE = re.compile(r"^[a-z][a-z0-9_-]*/[a-z][a-z0-9_-]*$")
_ATTR_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_.]*$")
_CSS_PROP_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9.\-_]*$")
# Allowed CSS value characters — no semicolons, no braces, no script injection
_CSS_VALUE_RE = re.compile(r"^[^;{}<>\"]*$")

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


def _sgs_conn() -> sqlite3.Connection:
    if not _SGS_DB.exists():
        raise FileNotFoundError(f"SGS framework DB not found: {_SGS_DB}")
    conn = sqlite3.connect(str(_SGS_DB))
    conn.row_factory = sqlite3.Row
    return conn


def _uimax_conn() -> sqlite3.Connection:
    if not _UIMAX_DB.exists():
        raise FileNotFoundError(f"uimax DB not found: {_UIMAX_DB}")
    conn = sqlite3.connect(str(_UIMAX_DB))
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# Schema enumeration (blub.db rule 272 — enumerate before any gap claim)
# ---------------------------------------------------------------------------


def _assert_schema() -> None:
    """Verify both DBs have the expected tables before proceeding."""
    errors: list[str] = []
    try:
        conn = _sgs_conn()
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        sgs_tables = {r[0] for r in cur.fetchall()}
        conn.close()
        for required in ("blocks", "block_attributes", "attribute_gap_candidates"):
            if required not in sgs_tables:
                errors.append(f"sgs-framework.db missing table: {required}")
    except FileNotFoundError as exc:
        errors.append(str(exc))

    try:
        conn = _uimax_conn()
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        uimax_tables = {r[0] for r in cur.fetchall()}
        conn.close()
        for required in ("attribute_gap_candidates",):
            if required not in uimax_tables:
                errors.append(f"uimax.db missing table: {required}")
    except FileNotFoundError as exc:
        errors.append(str(exc))

    if errors:
        print("SCHEMA ENUMERATION FAILED — cannot proceed:")
        for e in errors:
            print(f"  • {e}")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Block validation
# ---------------------------------------------------------------------------


def _known_block_slugs() -> set[str]:
    """Return all block slugs registered in the sgs-framework blocks table."""
    conn = _sgs_conn()
    cur = conn.execute("SELECT slug FROM blocks")
    slugs = {r[0] for r in cur.fetchall()}
    conn.close()
    return slugs


def _block_dir(block_slug: str) -> Optional[Path]:
    """Return the block source directory, or None if it does not exist."""
    name = block_slug.split("/", 1)[-1]  # e.g. "sgs/hero" → "hero"
    d = _BLOCKS_DIR / name
    return d if d.is_dir() else None


# ---------------------------------------------------------------------------
# Candidate listing
# ---------------------------------------------------------------------------


def _list_uimax(top: int) -> list[dict]:
    """Return top N pending uimax attribute_gap_candidates (seen_count desc)."""
    conn = _uimax_conn()
    cur = conn.execute(
        """
        SELECT id, block_slug, selector, css_property, value_seen,
               role_proposed, confidence, seen_count, status,
               staged_at, applied_at, provenance
        FROM attribute_gap_candidates
        WHERE status = 'pending' AND applied_at IS NULL
        ORDER BY (seen_count * MAX(confidence, 0.01)) DESC, seen_count DESC
        LIMIT ?
        """,
        (top,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def _list_sgs(top: int) -> list[dict]:
    """Return top N add-attr rows from sgs-framework attribute_gap_candidates."""
    conn = _sgs_conn()
    cur = conn.execute(
        """
        SELECT id, block_slug, attr_name, stem, proposed_action, created_at
        FROM attribute_gap_candidates
        WHERE proposed_action LIKE 'add attr:%'
        ORDER BY block_slug, attr_name
        LIMIT ?
        """,
        (top,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def _parse_sgs_proposed_action(action: str) -> dict:
    """Parse a sgs-framework 'add attr: css=X raw=Y class=Z run=W' string."""
    # Format variants:
    #   add attr: css=border-radius raw='10px' class=sgs-button run=...
    #   add attr: css=font-family raw="'Fraunces', serif" class=.heading run=...
    m = re.match(
        r"add attr: css=(\S+)\s+raw=(?:'([^']*)'|\"([^\"]*)\"|(\S+))\s+class=(\S*)\s+run=(.*)",
        action,
    )
    if not m:
        return {}
    css_prop = m.group(1)
    raw_val = m.group(2) or m.group(3) or m.group(4) or ""
    css_class = m.group(5)
    run_id = m.group(6)
    return {"css_property": css_prop, "value_seen": raw_val, "selector": css_class, "run_id": run_id}


# ---------------------------------------------------------------------------
# Render.php inline-style pattern generation
# ---------------------------------------------------------------------------

# Map from CSS property to PHP var name prefix and render.php sanitisation.
_CSS_PROP_PHP: dict[str, tuple[str, str]] = {
    # (php_var_suffix, sanitise_fn)
    "font-size": ("font_size", "sanitize_text_field"),
    "font-family": ("font_family", "sanitize_text_field"),
    "font-weight": ("font_weight", "sanitize_text_field"),
    "font-style": ("font_style", "sanitize_text_field"),
    "line-height": ("line_height", "sanitize_text_field"),
    "letter-spacing": ("letter_spacing", "sanitize_text_field"),
    "text-transform": ("text_transform", "sanitize_text_field"),
    "text-decoration": ("text_decoration", "sanitize_text_field"),
    "text-align": ("text_align", "sanitize_text_field"),
    "color": ("colour", "sanitize_text_field"),
    "background-color": ("background_colour", "sanitize_text_field"),
    "background": ("background", "sanitize_text_field"),
    "border-radius": ("border_radius", "sanitize_text_field"),
    "border-color": ("border_colour", "sanitize_text_field"),
    "border": ("border", "sanitize_text_field"),
    "border-style": ("border_style", "sanitize_text_field"),
    "border-width": ("border_width", "sanitize_text_field"),
    "padding": ("padding", "sanitize_text_field"),
    "padding-top": ("padding_top", "sanitize_text_field"),
    "padding-right": ("padding_right", "sanitize_text_field"),
    "padding-bottom": ("padding_bottom", "sanitize_text_field"),
    "padding-left": ("padding_left", "sanitize_text_field"),
    "margin": ("margin", "sanitize_text_field"),
    "margin-top": ("margin_top", "sanitize_text_field"),
    "margin-right": ("margin_right", "sanitize_text_field"),
    "margin-bottom": ("margin_bottom", "sanitize_text_field"),
    "margin-left": ("margin_left", "sanitize_text_field"),
    "width": ("width", "sanitize_text_field"),
    "max-width": ("max_width", "sanitize_text_field"),
    "min-width": ("min_width", "sanitize_text_field"),
    "height": ("height", "sanitize_text_field"),
    "max-height": ("max_height", "sanitize_text_field"),
    "min-height": ("min_height", "sanitize_text_field"),
    "gap": ("gap", "sanitize_text_field"),
    "display": ("display", "sanitize_text_field"),
    "flex": ("flex", "sanitize_text_field"),
    "flex-direction": ("flex_direction", "sanitize_text_field"),
    "justify-content": ("justify_content", "sanitize_text_field"),
    "align-items": ("align_items", "sanitize_text_field"),
    "grid-template-columns": ("grid_template_columns", "sanitize_text_field"),
    "grid-area": ("grid_area", "sanitize_text_field"),
    "overflow": ("overflow", "sanitize_text_field"),
    "opacity": ("opacity", "sanitize_text_field"),
    "transform": ("transform", "sanitize_text_field"),
    "transition": ("transition", "sanitize_text_field"),
    "box-shadow": ("box_shadow", "sanitize_text_field"),
    "object-fit": ("object_fit", "sanitize_text_field"),
    "object-position": ("object_position", "sanitize_text_field"),
}


def _php_var_from_attr(attr_name: str) -> str:
    """Convert camelCase attr name to PHP snake_case variable name."""
    # e.g. "headlineColour" → "headline_colour"
    s = re.sub(r"(?<!^)(?=[A-Z])", "_", attr_name).lower()
    return s


def _infer_attr_type(css_property: str, value_seen: str) -> str:
    """Infer the best block.json type for this CSS property + value pair."""
    numeric_props = {
        "font-size", "line-height", "letter-spacing", "border-radius",
        "border-width", "padding-top", "padding-right", "padding-bottom",
        "padding-left", "margin-top", "margin-right", "margin-bottom",
        "margin-left", "width", "max-width", "min-width",
        "height", "max-height", "min-height", "gap", "opacity",
    }
    if css_property in numeric_props:
        # Check if the raw value is a bare number
        try:
            float(re.sub(r"[a-z%]+$", "", value_seen, flags=re.I))
            return "number"
        except ValueError:
            pass
    if value_seen.lower() in ("true", "false"):
        return "boolean"
    return "string"


def _build_render_php_snippet(attr_name: str, css_property: str, default_value: str) -> str:
    """Generate the PHP inline-style snippet for render.php insertion."""
    php_var = _php_var_from_attr(attr_name)
    sanitise = _CSS_PROP_PHP.get(css_property, ("_val", "sanitize_text_field"))[1]
    snippet = dedent(f"""\
    // Promoted attr: {attr_name} ({css_property}) — auto-added by stage_attribute_promotion.py
    ${php_var} = isset( $attributes['{attr_name}'] ) && '' !== $attributes['{attr_name}']
        ? {sanitise}( $attributes['{attr_name}'] )
        : '';
    if ( ${{php_var}} ) {{
        $inline_styles[] = '{css_property}: ' . esc_attr( ${php_var} );
    }}
    """)
    return snippet


# ---------------------------------------------------------------------------
# block.json mutation
# ---------------------------------------------------------------------------


def _attr_already_exists(block_json: dict, attr_name: str) -> bool:
    return attr_name in block_json.get("attributes", {})


def _add_attr_to_block_json(
    block_json_path: Path,
    attr_name: str,
    attr_type: str,
    default_value: str,
    css_property: str,
    description: str = "",
) -> bool:
    """Add a new attribute entry to block.json. Returns True if mutated."""
    with open(block_json_path, encoding="utf-8") as fh:
        data = json.load(fh)

    if _attr_already_exists(data, attr_name):
        return False  # idempotent no-op

    if "attributes" not in data:
        data["attributes"] = {}

    # Determine the JSON-serialisable default
    if attr_type == "number":
        try:
            default_json = float(re.sub(r"[a-z%]+$", "", default_value, flags=re.I))
            default_json = int(default_json) if default_json == int(default_json) else default_json
        except (ValueError, TypeError):
            default_json = None
    elif attr_type == "boolean":
        default_json = default_value.lower() == "true"
    else:
        default_json = default_value if default_value else ""

    entry: dict = {"type": attr_type, "default": default_json}
    if description:
        entry["description"] = description  # type: ignore[assignment]

    data["attributes"][attr_name] = entry

    with open(block_json_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    return True


# ---------------------------------------------------------------------------
# render.php mutation
# ---------------------------------------------------------------------------


def _find_render_php_insertion_point(render_php: str) -> int:
    """
    Find the line index just before the closing of attribute extraction
    in render.php. Looks for the last $attributes[...] assignment or
    // CSS custom properties section.

    Returns the character offset (not line number) for insertion.
    """
    # Strategy: insert before the first occurrence of "// -----------" section
    # divider that isn't the very first one (attribute extraction section end).
    lines = render_php.split("\n")
    divider_count = 0
    for i, line in enumerate(lines):
        if re.match(r"\s*//\s*-{10,}", line):
            divider_count += 1
            if divider_count == 2:
                # Insert just before second major section divider
                return sum(len(l) + 1 for l in lines[:i])
    # Fallback: insert at the end of the file before the closing ?>
    return len(render_php)


def _add_inline_style_to_render_php(
    render_php_path: Path,
    attr_name: str,
    css_property: str,
    default_value: str,
) -> bool:
    """
    Add an inline-style branch to render.php.

    If the file already contains a reference to $attributes['{attr_name}'],
    this is a no-op.
    """
    content = render_php_path.read_text(encoding="utf-8")

    # Idempotency check
    if f"$attributes['{attr_name}']" in content or f'$attributes["{attr_name}"]' in content:
        return False

    snippet = _build_render_php_snippet(attr_name, css_property, default_value)

    # Find $inline_styles array initialisation — insert near there if present
    # Otherwise append before the closing of attribute-extraction section.
    inline_styles_match = re.search(r"\$inline_styles\s*=\s*(?:array\(\)|)\[\]?\s*;", content)
    if inline_styles_match:
        # Insert after the $inline_styles = [] line
        insert_at = inline_styles_match.end()
        new_content = (
            content[:insert_at]
            + "\n"
            + snippet
            + content[insert_at:]
        )
    else:
        # If render.php doesn't use $inline_styles yet, add a stub and the snippet
        # just before the first echo / return / ?> statement.
        first_output = re.search(r"(?:^\s*echo\s|^\s*\?>|^\s*return\s)", content, re.MULTILINE)
        if first_output:
            insert_at = first_output.start()
        else:
            insert_at = len(content)

        stub = "\n// Inline style accumulator (added by stage_attribute_promotion.py)\n$inline_styles = [];\n"
        new_content = (
            content[:insert_at]
            + stub
            + snippet
            + content[insert_at:]
        )

    render_php_path.write_text(new_content, encoding="utf-8")
    return True


# ---------------------------------------------------------------------------
# DB promotion tracking
# ---------------------------------------------------------------------------


def _mark_uimax_promoted(row_id: int) -> None:
    """Set applied_at on the uimax candidate row."""
    conn = _uimax_conn()
    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.execute(
        "UPDATE attribute_gap_candidates SET applied_at = ?, status = 'applied' WHERE id = ?",
        (now, row_id),
    )
    conn.commit()
    conn.close()


def _mark_sgs_promoted(row_id: int, promoted_to_block: str) -> None:
    """Mark a sgs-framework gap candidate as promoted (adds column if missing)."""
    conn = _sgs_conn()
    # Ensure the columns exist (idempotent ALTER TABLE)
    existing_cols = {
        r[1] for r in conn.execute("PRAGMA table_info(attribute_gap_candidates)").fetchall()
    }
    if "promoted" not in existing_cols:
        conn.execute(
            "ALTER TABLE attribute_gap_candidates ADD COLUMN promoted INTEGER DEFAULT 0"
        )
    if "promoted_at" not in existing_cols:
        conn.execute(
            "ALTER TABLE attribute_gap_candidates ADD COLUMN promoted_at TEXT"
        )
    if "promoted_to_block" not in existing_cols:
        conn.execute(
            "ALTER TABLE attribute_gap_candidates ADD COLUMN promoted_to_block TEXT"
        )
    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.execute(
        """UPDATE attribute_gap_candidates
           SET promoted = 1, promoted_at = ?, promoted_to_block = ?
           WHERE id = ?""",
        (now, promoted_to_block, row_id),
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def cmd_list(args: argparse.Namespace) -> None:
    """List top N pending attribute gap candidates."""
    source = getattr(args, "source", "both")
    top = getattr(args, "top", 10)

    print(f"\n{'='*70}")
    print(f"  Attribute Gap Candidates — Top {top}")
    print(f"  Source: {source}")
    print(f"{'='*70}\n")

    if source in ("uimax", "both"):
        rows = _list_uimax(top)
        if rows:
            print(f"{'─'*70}")
            print("  UIMAX DB (ranked by seen_count × confidence)\n")
            print(f"  {'ID':<6} {'Block Slug':<30} {'CSS Prop':<25} {'Seen':>5}  {'Conf':>5}")
            print(f"  {'─'*6} {'─'*30} {'─'*25} {'─'*5}  {'─'*5}")
            for r in rows:
                already = " [PROMOTED]" if r.get("applied_at") else ""
                print(
                    f"  {r['id']:<6} {r['block_slug']:<30} {r['css_property']:<25} "
                    f"{r['seen_count']:>5}  {r['confidence']:>5.2f}{already}"
                )
                print(f"         value_seen: {r['value_seen']!r}  selector: {r['selector']}")
        else:
            print("  No pending uimax candidates found.\n")

    if source in ("sgs", "both"):
        rows = _list_sgs(top)
        if rows:
            print(f"\n{'─'*70}")
            print("  SGS-FRAMEWORK DB (add-attr candidates)\n")
            print(f"  {'ID':<7} {'Block Slug':<30} {'Attr Name':<28}")
            print(f"  {'─'*7} {'─'*30} {'─'*28}")
            for r in rows:
                parsed = _parse_sgs_proposed_action(r["proposed_action"])
                print(
                    f"  {r['id']:<7} {r['block_slug']:<30} {r['attr_name']:<28}"
                )
                if parsed:
                    print(
                        f"           css: {parsed.get('css_property','?')}  "
                        f"raw: {parsed.get('value_seen','?')!r}  "
                        f"class: {parsed.get('selector','?')}"
                    )
        else:
            print("  No add-attr SGS candidates found.\n")

    print(f"\n{'='*70}")
    print("  To promote a candidate:")
    print("    python stage_attribute_promotion.py promote --id <row_id> --source uimax")
    print("    python stage_attribute_promotion.py promote --id <row_id> --source sgs")
    print(f"{'='*70}\n")


def cmd_promote(args: argparse.Namespace) -> None:
    """Promote a single attribute gap candidate into block.json + render.php."""
    row_id: int = args.id
    source: str = getattr(args, "source", "uimax")

    # ---------------------------------------------------------------------------
    # 1. Load the candidate row
    # ---------------------------------------------------------------------------
    candidate: dict = {}
    if source == "uimax":
        conn = _uimax_conn()
        cur = conn.execute(
            "SELECT * FROM attribute_gap_candidates WHERE id = ?", (row_id,)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            print(f"ERROR: No uimax candidate with id={row_id}")
            sys.exit(1)
        candidate = dict(row)
        if candidate.get("applied_at"):
            print(
                f"SKIP: Row {row_id} already promoted at {candidate['applied_at']} "
                f"(idempotent no-op)"
            )
            sys.exit(0)
    else:
        conn = _sgs_conn()
        cur = conn.execute(
            "SELECT * FROM attribute_gap_candidates WHERE id = ?", (row_id,)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            print(f"ERROR: No sgs-framework candidate with id={row_id}")
            sys.exit(1)
        candidate = dict(row)
        # Check idempotency
        if candidate.get("promoted"):
            print(
                f"SKIP: Row {row_id} already promoted at {candidate.get('promoted_at')} "
                f"(idempotent no-op)"
            )
            sys.exit(0)

    # ---------------------------------------------------------------------------
    # 2. Extract promotion details
    # ---------------------------------------------------------------------------
    block_slug: str = candidate.get("block_slug", "")
    if not _BLOCK_SLUG_RE.match(block_slug):
        print(f"ERROR: Invalid block_slug format: {block_slug!r}")
        sys.exit(1)

    if source == "uimax":
        css_property: str = candidate.get("css_property", "")
        attr_name: str = _derive_attr_name_from_css(
            css_property, candidate.get("selector", ""), block_slug
        )
        value_seen: str = str(candidate.get("value_seen", ""))
        role_proposed: str = candidate.get("role_proposed", "")
    else:
        parsed = _parse_sgs_proposed_action(candidate.get("proposed_action", ""))
        if not parsed:
            print(f"ERROR: Cannot parse proposed_action: {candidate.get('proposed_action')!r}")
            sys.exit(1)
        css_property = parsed.get("css_property", "")
        attr_name = candidate.get("attr_name", "")
        value_seen = parsed.get("value_seen", "")
        role_proposed = ""

    # Validate attr_name
    if not attr_name or not _ATTR_NAME_RE.match(attr_name):
        print(
            f"WARN: attr_name {attr_name!r} is not a valid camelCase identifier.\n"
            f"      Please provide a valid attribute name:"
        )
        attr_name = input("  attr_name: ").strip()
        if not _ATTR_NAME_RE.match(attr_name):
            print(f"ERROR: Invalid attr_name: {attr_name!r}")
            sys.exit(1)

    # Validate CSS property
    if not css_property or not _CSS_PROP_RE.match(css_property):
        print(f"ERROR: Invalid css_property: {css_property!r}")
        sys.exit(1)

    # ---------------------------------------------------------------------------
    # 3. Validate block exists
    # ---------------------------------------------------------------------------
    known = _known_block_slugs()
    if block_slug not in known:
        print(f"ERROR: Block {block_slug!r} not found in blocks table.")
        print(f"  Known SGS blocks: {sorted(known)[:10]}...")
        sys.exit(1)

    block_dir = _block_dir(block_slug)
    if block_dir is None:
        print(f"ERROR: Block directory not found for {block_slug!r}")
        print(f"  Expected: {_BLOCKS_DIR / block_slug.split('/')[-1]}")
        sys.exit(1)

    block_json_path = block_dir / "block.json"
    render_php_path = block_dir / "render.php"

    if not block_json_path.exists():
        print(f"ERROR: block.json not found at {block_json_path}")
        sys.exit(1)

    # ---------------------------------------------------------------------------
    # 4. Idempotency check against block.json
    # ---------------------------------------------------------------------------
    with open(block_json_path, encoding="utf-8") as fh:
        block_json_data = json.load(fh)

    if _attr_already_exists(block_json_data, attr_name):
        print(f"SKIP: Attribute {attr_name!r} already exists in {block_json_path}")
        print("      Marking DB row as promoted anyway (idempotent).")
        _mark_promoted(source, row_id, block_slug)
        sys.exit(0)

    # ---------------------------------------------------------------------------
    # 5. Show full context and ask for confirmation
    # ---------------------------------------------------------------------------
    attr_type = _infer_attr_type(css_property, value_seen)
    print(f"\n{'='*70}")
    print("  PROMOTION PREVIEW")
    print(f"{'='*70}")
    print(f"  Block:        {block_slug}")
    print(f"  Attr name:    {attr_name}")
    print(f"  CSS property: {css_property}")
    print(f"  Value seen:   {value_seen!r}")
    print(f"  Role:         {role_proposed or 'auto-detected'}")
    print(f"  Inferred type:{attr_type}")
    print(f"  Block dir:    {block_dir}")
    print()

    # Allow operator to override attr_name and default_value
    print("  Override attr_name? (press Enter to keep, or type new name)")
    override = input(f"  attr_name [{attr_name}]: ").strip()
    if override:
        if not _ATTR_NAME_RE.match(override):
            print(f"ERROR: Invalid attr_name: {override!r}")
            sys.exit(1)
        attr_name = override

    print(f"\n  Override attr_type? (press Enter to keep {attr_type!r})")
    print("  Options: string / number / boolean / object / array")
    type_override = input(f"  attr_type [{attr_type}]: ").strip()
    if type_override:
        allowed_types = {"string", "number", "boolean", "object", "array"}
        if type_override not in allowed_types:
            print(f"ERROR: Invalid attr_type: {type_override!r}")
            sys.exit(1)
        attr_type = type_override

    print(f"\n  Override default_value? (press Enter to use {value_seen!r})")
    default_val = input(f"  default_value [{value_seen}]: ").strip() or value_seen

    # Validate default value for injection safety
    if not _CSS_VALUE_RE.match(default_val):
        print(f"ERROR: default_value contains unsafe characters: {default_val!r}")
        sys.exit(1)

    print(f"\n{'─'*70}")
    print("  This will:")
    print(f"    1. Add attribute '{attr_name}' (type: {attr_type}) to {block_json_path.name}")
    print(f"    2. Add inline-style branch to {render_php_path.name}")
    print(f"    3. Mark DB row {row_id} as promoted")
    print()
    print("  Type 'promote' to proceed, anything else to abort:")
    confirm = input("  > ").strip().lower()
    if confirm != "promote":
        print("  Aborted.")
        sys.exit(0)

    # ---------------------------------------------------------------------------
    # 6. Mutate block.json
    # ---------------------------------------------------------------------------
    description = f"Promoted from attribute_gap_candidates id={row_id} — {css_property} on {candidate.get('selector', '')}"
    mutated_json = _add_attr_to_block_json(
        block_json_path, attr_name, attr_type, default_val, css_property, description
    )
    if mutated_json:
        print(f"\n  ✓ block.json updated: added '{attr_name}' (type: {attr_type}, default: {default_val!r})")
    else:
        print(f"\n  ─ block.json: attribute '{attr_name}' was already present (no change).")

    # ---------------------------------------------------------------------------
    # 7. Mutate render.php (if it exists)
    # ---------------------------------------------------------------------------
    if render_php_path.exists():
        mutated_php = _add_inline_style_to_render_php(
            render_php_path, attr_name, css_property, default_val
        )
        if mutated_php:
            print(f"  ✓ render.php updated: added inline-style branch for '{attr_name}'")
        else:
            print(f"  ─ render.php: '{attr_name}' reference already present (no change).")
    else:
        print(f"  ─ render.php not found at {render_php_path} — skipping PHP mutation.")
        print(f"    (Static block? Add the inline-style manually in save.js.)")

    # ---------------------------------------------------------------------------
    # 8. Mark DB row as promoted
    # ---------------------------------------------------------------------------
    _mark_promoted(source, row_id, block_slug)
    print(f"  ✓ DB row {row_id} marked as promoted.")

    print(f"\n{'='*70}")
    print("  PROMOTION COMPLETE")
    print(f"  Block: {block_slug}  Attr: {attr_name}  CSS: {css_property}")
    print(f"  Next step: rebuild the block plugin and run a pipeline test.")
    print(f"    cd plugins/sgs-blocks && npm run build")
    print(f"{'='*70}\n")


def _derive_attr_name_from_css(css_property: str, selector: str, block_slug: str) -> str:
    """
    Derive a camelCase attr_name from a CSS property and BEM selector.

    Strategy:
    - Strip vendor prefixes
    - Remove dots and BEM modifiers from selector to get the slot context
    - Convert 'font-size' → 'fontSize', 'background-color' → 'backgroundColour'

    UK English: 'color' → 'colour' in SGS naming convention.
    """
    # CSS property → camelCase
    parts = css_property.lstrip("-").split("-")
    camel = parts[0] + "".join(p.capitalize() for p in parts[1:])
    # UK English substitutions
    camel = camel.replace("Color", "Colour").replace("color", "colour")
    return camel


def _mark_promoted(source: str, row_id: int, block_slug: str) -> None:
    if source == "uimax":
        _mark_uimax_promoted(row_id)
    else:
        _mark_sgs_promoted(row_id, block_slug)


# ---------------------------------------------------------------------------
# Status command
# ---------------------------------------------------------------------------


def cmd_status(args: argparse.Namespace) -> None:  # noqa: ARG001
    """Show promoted vs pending counts across both DBs."""
    print(f"\n{'='*70}")
    print("  Attribute Gap Candidate Status")
    print(f"{'='*70}\n")

    # uimax
    try:
        conn = _uimax_conn()
        cur = conn.execute(
            """
            SELECT status, COUNT(*) cnt
            FROM attribute_gap_candidates
            GROUP BY status
            """
        )
        rows = cur.fetchall()
        conn.close()
        print("  uimax DB:")
        for r in rows:
            print(f"    {r[0]:<20}: {r[1]}")
        total_uimax = sum(r[1] for r in rows)
        print(f"    {'TOTAL':<20}: {total_uimax}")
    except Exception as exc:  # pragma: no cover
        print(f"  uimax DB error: {exc}")

    # sgs-framework
    try:
        conn = _sgs_conn()
        existing_cols = {
            r[1] for r in conn.execute("PRAGMA table_info(attribute_gap_candidates)").fetchall()
        }
        if "promoted" in existing_cols:
            cur = conn.execute(
                """
                SELECT
                    CASE WHEN promoted = 1 THEN 'promoted' ELSE 'pending' END status,
                    COUNT(*) cnt
                FROM attribute_gap_candidates
                GROUP BY promoted
                """
            )
        else:
            cur = conn.execute(
                "SELECT 'pending' status, COUNT(*) cnt FROM attribute_gap_candidates"
            )
        rows = cur.fetchall()
        conn.close()
        print("\n  sgs-framework DB:")
        for r in rows:
            print(f"    {r[0]:<20}: {r[1]}")
        total_sgs = sum(r[1] for r in rows)
        print(f"    {'TOTAL':<20}: {total_sgs}")
    except Exception as exc:  # pragma: no cover
        print(f"  sgs-framework DB error: {exc}")

    print(f"\n{'='*70}\n")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="stage_attribute_promotion.py",
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # list
    p_list = sub.add_parser("list", help="List top N pending candidates")
    p_list.add_argument("--top", type=int, default=10, help="Number of candidates to show (default: 10)")
    p_list.add_argument(
        "--source",
        choices=["uimax", "sgs", "both"],
        default="both",
        help="Which DB to query (default: both)",
    )

    # promote
    p_promote = sub.add_parser("promote", help="Promote a candidate into block.json + render.php")
    p_promote.add_argument("--id", type=int, required=True, help="Row ID from the attribute_gap_candidates table")
    p_promote.add_argument(
        "--source",
        choices=["uimax", "sgs"],
        default="uimax",
        help="Which DB the row ID belongs to (default: uimax)",
    )

    # status
    sub.add_parser("status", help="Show promoted vs pending counts")

    return parser


def main() -> None:
    _assert_schema()
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "list":
        cmd_list(args)
    elif args.command == "promote":
        cmd_promote(args)
    elif args.command == "status":
        cmd_status(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
