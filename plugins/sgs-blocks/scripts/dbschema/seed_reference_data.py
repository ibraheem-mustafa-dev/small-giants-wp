#!/usr/bin/env python3
"""seed_reference_data.py -- idempotent seeders for the framework DB's reference tables.

Seeds the tables whose rows live in git-tracked data files under ``scripts/data/`` (the files are
the source of truth; the DB tables are the runtime query target, R-31-1):

  roles                  <- roles.json
  modifier_suffixes      <- modifier-suffixes.json   (row order is load-bearing)
  property_suffixes      <- property-suffixes.json   (row order is load-bearing), then
                            ``kind_override`` back-filled for rows that have none
  slots                  <- slots.json
  block_attributes.role  <- scalar-media-roles.json  (re-asserts role='scalar-media' on the
                            rostered attrs; only a column, never a whole table)

Also exposes ``fx_attr_roster()``, the full ``fx*`` attribute roster read from
``includes/fx-attributes.php`` and ``includes/extension-attributes.generated.php``.

Importing this module touches nothing: no database connection, no file read. ``seed_all(db_path)``
opens its own connection. The table DDL lives in ``dbschema/schema.sql``; a missing table or an
unwritable database is reported on stderr and that seeder is skipped.

Usage:
    python dbschema/seed_reference_data.py [--db PATH]
"""
from __future__ import annotations

import argparse
import functools
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
_DATA_DIR = _SCRIPTS_DIR / "data"
_PLUGIN_DIR = _SCRIPTS_DIR.parent

_ROLES_FILE = _DATA_DIR / "roles.json"
_MODIFIER_SUFFIXES_FILE = _DATA_DIR / "modifier-suffixes.json"
_SCALAR_MEDIA_ROLES_FILE = _DATA_DIR / "scalar-media-roles.json"
_SCALAR_MEDIA_ROLE = "scalar-media"

_FX_ATTRIBUTES_PHP = _PLUGIN_DIR / "includes" / "fx-attributes.php"
_EXTENSION_ATTRS_GENERATED_PHP = _PLUGIN_DIR / "includes" / "extension-attributes.generated.php"
_FX_MAP_ENTRY_RE = re.compile(r"'(\w+)'\s*=>\s*'(data-sgs-[\w-]+)'")
_EXT_ATTR_TYPE_RE = re.compile(r"'(\w+)'\s*=>\s*array\(\s*'type'\s*=>\s*'(\w+)'")

# table -> (data file, ordered columns)
_SEEDED_TABLES: dict[str, tuple[str, tuple[str, ...]]] = {
    "property_suffixes": (
        "property-suffixes.json",
        ("suffix", "role", "css_property", "is_token_matched",
         "token_source", "notes", "kind_override"),
    ),
    "slots": (
        "slots.json",
        ("slot_name", "scope", "aliases", "standalone_block", "notes",
         "standalone_block_default_attrs", "resolves_whole_instance"),
    ),
}

# Suffix -> kind for property_suffixes rows whose name carries kind semantics the role column
# cannot distinguish. Applied only to rows whose kind_override is still NULL, so a value set by
# hand afterwards survives.
_KIND_BY_SUFFIX: dict[str, str] = {
    "LineHeight": "number_unitless",
    "LetterSpacing": "number_px_or_em",
    "FontFamily": "string",
    "FontWeight": "string",
    "TextTransform": "string",
    "TextAlign": "string",
    "TextDecoration": "string",
    "ObjectFit": "string",
    "ObjectPosition": "string",
    "BorderStyle": "string",
    "BoxShadow": "string",
    "Easing": "string",
    "Columns": "string",
    "AspectRatio": "string",
    "Style": "string",
    "Variant": "string",
    "Alignment": "string",
}


def default_db_path() -> Path:
    """$SGS_FRAMEWORK_DB when set, else the shared framework DB."""
    override = os.environ.get("SGS_FRAMEWORK_DB")
    if override:
        return Path(override)
    return Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def _warn(message: str) -> None:
    sys.stderr.write(f"[seed_reference_data] {message}\n")


# ---------------------------------------------------------------------------
# roles
# ---------------------------------------------------------------------------

def _load_roles_seed() -> dict[str, tuple[str, str]]:
    """``{role_name: (classification, description)}`` from roles.json.

    Keys starting with ``__`` are metadata. Soft-fails to ``{}`` when the file is missing or
    unreadable, in which case the seeder leaves existing rows untouched.
    """
    try:
        raw = json.loads(_ROLES_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    out: dict[str, tuple[str, str]] = {}
    for name, val in raw.items():
        if name.startswith("__") or not isinstance(val, list) or not val:
            continue
        out[name] = (val[0], val[1] if len(val) > 1 else "")
    return out


def _seed_roles(conn: sqlite3.Connection) -> None:
    """INSERT OR REPLACE every role from roles.json; delete roles the file no longer lists.

    A role removed from the file is deleted from the table, announced with the count of
    ``block_attributes`` rows that reference it.
    """
    seed = _load_roles_seed()
    if not seed:
        return
    for role_name, (classification, description) in seed.items():
        conn.execute(
            "INSERT OR REPLACE INTO roles (role_name, classification, description) VALUES (?, ?, ?)",
            (role_name, classification, description),
        )
    placeholders = ",".join("?" for _ in seed)
    orphans = [
        r[0] for r in conn.execute(
            f"SELECT role_name FROM roles WHERE role_name NOT IN ({placeholders})",  # noqa: S608 - placeholders only
            list(seed),
        )
    ]
    for role_name in orphans:
        try:
            refs = conn.execute(
                "SELECT COUNT(*) FROM block_attributes WHERE role = ?", (role_name,)
            ).fetchone()[0]
        except sqlite3.OperationalError:
            refs = -1
        _warn(
            f"roles.json no longer lists '{role_name}' - deleting it "
            f"({refs if refs >= 0 else 'unknown'} block_attributes row(s) reference it). "
            f"If that was not intended, restore it in scripts/data/roles.json."
        )
    if orphans:
        conn.execute(
            f"DELETE FROM roles WHERE role_name NOT IN ({placeholders})",  # noqa: S608 - placeholders only
            list(seed),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# modifier_suffixes
# ---------------------------------------------------------------------------

def _load_modifier_suffixes_seed() -> list[tuple[str, str, str | None]]:
    """The ordered ``[(suffix, kind, notes)]`` vocabulary; ``[]`` when the file is unreadable."""
    try:
        raw = json.loads(_MODIFIER_SUFFIXES_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    out: list[tuple[str, str, str | None]] = []
    for entry in raw.get("suffixes", []):
        if not isinstance(entry, list) or len(entry) < 2:
            continue
        out.append((entry[0], entry[1], entry[2] if len(entry) > 2 else None))
    return out


def _seed_modifier_suffixes(conn: sqlite3.Connection) -> None:
    """Seed ``modifier_suffixes`` preserving row order.

    Row order is load-bearing: readers run ``ORDER BY rowid`` and ``kind='side'`` must come back
    Top/Right/Bottom/Left. ``INSERT OR REPLACE`` would assign a new rowid and scramble that, so
    the table is compared with the file first and rewritten (DELETE + ordered INSERT) only when
    it differs.
    """
    seed = _load_modifier_suffixes_seed()
    if not seed:
        return
    current = conn.execute(
        "SELECT suffix, kind, notes FROM modifier_suffixes ORDER BY rowid"
    ).fetchall()
    if [tuple(r) for r in current] == [tuple(s) for s in seed]:
        return
    conn.execute("DELETE FROM modifier_suffixes")
    conn.executemany(
        "INSERT INTO modifier_suffixes (suffix, kind, notes) VALUES (?, ?, ?)", seed
    )
    conn.commit()


# ---------------------------------------------------------------------------
# property_suffixes and slots
# ---------------------------------------------------------------------------

def _load_seeded_table(table: str) -> list[tuple]:
    """The ordered row list for ``table`` from its data file.

    Returns ``[]`` (leaving the table alone) when the file is missing, unreadable, or its
    ``__columns`` header disagrees with the column order inserted by.
    """
    filename, cols = _SEEDED_TABLES[table]
    try:
        raw = json.loads((_DATA_DIR / filename).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if tuple(raw.get("__columns") or ()) != cols:
        _warn(
            f"{filename} __columns does not match the expected column order for `{table}` - "
            f"refusing to seed positionally. Re-run dbschema/capture_seed_data.py --write."
        )
        return []
    out: list[tuple] = []
    for row in raw.get("rows") or []:
        if not isinstance(row, list) or len(row) != len(cols):
            continue
        out.append(tuple(row))
    return out


def _seed_table_ordered(conn: sqlite3.Connection, table: str) -> None:
    """Seed ``table`` from its data file preserving row order.

    Row order is load-bearing for ``property_suffixes``: readers run ``ORDER BY rowid`` and
    ``propose_attr_name()`` takes ``ORDER BY rowid LIMIT 1``, so where a css_property has several
    suffix rows the first wins. The table is compared with the file and rewritten (DELETE +
    ordered INSERT) only when it differs. A rewrite that shrinks the table is announced first.
    ``slots.created_at`` is not captured and is re-defaulted on a rewrite.
    """
    seed = _load_seeded_table(table)
    if not seed:
        return
    filename, cols = _SEEDED_TABLES[table]
    collist = ", ".join(cols)
    existing_cols = {r[1] for r in conn.execute(f'PRAGMA table_info("{table}")').fetchall()}  # noqa: S608
    for col in cols:
        if col not in existing_cols:
            conn.execute(f'ALTER TABLE "{table}" ADD COLUMN {col} TEXT')  # noqa: S608
    current = conn.execute(
        f'SELECT {collist} FROM "{table}" ORDER BY rowid'  # noqa: S608 - fixed names
    ).fetchall()
    if [tuple(r) for r in current] == seed:
        return
    if len(seed) < len(current):
        _warn(
            f"WARNING: {filename} has {len(seed)} row(s) but `{table}` holds {len(current)} - "
            f"re-seeding will DELETE {len(current) - len(seed)}. If that was not intended, "
            f"restore the file (git) before anything else seeds."
        )
    conn.execute(f'DELETE FROM "{table}"')  # noqa: S608 - fixed names
    conn.executemany(
        f'INSERT INTO "{table}" ({collist}) '  # noqa: S608 - fixed names
        f'VALUES ({", ".join("?" for _ in cols)})',
        seed,
    )
    conn.commit()


def _seed_property_suffixes_kind_override(conn: sqlite3.Connection) -> None:
    """Add ``property_suffixes.kind_override`` when absent and back-fill it from ``_KIND_BY_SUFFIX``.

    Updates only rows whose ``kind_override`` is NULL, so a value set by hand survives.
    """
    cols = {row[1] for row in conn.execute("PRAGMA table_info(property_suffixes)").fetchall()}
    if "kind_override" not in cols:
        conn.execute("ALTER TABLE property_suffixes ADD COLUMN kind_override TEXT")
    for suffix, kind in _KIND_BY_SUFFIX.items():
        conn.execute(
            "UPDATE property_suffixes SET kind_override = ? "
            "WHERE suffix = ? AND kind_override IS NULL",
            (kind, suffix),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# scalar-media role re-assertion
# ---------------------------------------------------------------------------

def _load_scalar_media_roles() -> list[tuple[str, str]]:
    """The ``[(block_slug, attr_name)]`` roster to re-assert; ``[]`` when the file is unreadable.

    Entries marked ``"virtual": true`` in their 4th (options) field are skipped: they name
    composite attrs that have no ``block_attributes`` row.
    """
    try:
        raw = json.loads(_SCALAR_MEDIA_ROLES_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    out: list[tuple[str, str]] = []
    for entry in raw.get("attrs", []):
        if not (isinstance(entry, list) and len(entry) >= 2):
            continue
        opts = entry[3] if len(entry) >= 4 else None
        if isinstance(opts, dict) and opts.get("virtual"):
            continue
        out.append((entry[0], entry[1]))
    return out


def _class_section_blocks(conn: sqlite3.Connection) -> set[str]:
    """Slugs of every block with ``blocks.tier = 'class-section'``."""
    try:
        return {r[0] for r in conn.execute("SELECT slug FROM blocks WHERE tier = 'class-section'")}
    except sqlite3.OperationalError:
        return set()


def _seed_scalar_media_roles(conn: sqlite3.Connection) -> None:
    """Re-assert ``role='scalar-media'`` on the rostered attrs. Idempotent.

    Writes only when a row does not already hold the role, and says so on stderr: a silent run
    means nothing drifted. A rostered attr whose block is not a class-section block is refused,
    because the role removes the attr from the universal walk and only a class-section block has
    another route for it. Removing an entry from the roster does not revert the row; the
    classifier owns the column again.
    """
    roster = _load_scalar_media_roles()
    if not roster:
        return
    class_section = _class_section_blocks(conn)
    changed: list[tuple[str, str, str]] = []
    for block_slug, attr_name in roster:
        row = conn.execute(
            "SELECT role FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
        if row is None:
            _warn(
                f"scalar-media roster names {block_slug}.{attr_name}, which has no "
                f"block_attributes row - check the block's block.json."
            )
            continue
        if row[0] == _SCALAR_MEDIA_ROLE:
            continue
        if block_slug not in class_section:
            _warn(
                f"REFUSING to set role='{_SCALAR_MEDIA_ROLE}' on {block_slug}.{attr_name}: "
                f"{block_slug} is not a class-section block, so this role would strand the attr "
                f"with no route at all. Remove it from scripts/data/scalar-media-roles.json."
            )
            continue
        conn.execute(
            "UPDATE block_attributes SET role = ? WHERE block_slug = ? AND attr_name = ?",
            (_SCALAR_MEDIA_ROLE, block_slug, attr_name),
        )
        changed.append((block_slug, attr_name, row[0]))
    if changed:
        conn.commit()
        for block_slug, attr_name, was in changed:
            _warn(
                f"RE-ASSERTED role='{_SCALAR_MEDIA_ROLE}' on {block_slug}.{attr_name} "
                f"(found {was!r}). Something reclassified it."
            )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def seed_all(db_path: Path | str | None = None) -> None:
    """Run every seeder against ``db_path`` (default: ``default_db_path()``) over its own connection.

    Order matters: ``property_suffixes`` is seeded before its ``kind_override`` back-fill, and the
    scalar-media re-assertion runs last. Each seeder is independent: one that hits a missing table,
    a locked or read-only database is reported on stderr and the rest still run.
    """
    path = Path(db_path) if db_path else default_db_path()
    if not path.exists():
        raise FileNotFoundError(f"framework DB not found: {path}")
    conn = sqlite3.connect(path)
    try:
        steps = (
            ("roles", _seed_roles),
            ("modifier_suffixes", _seed_modifier_suffixes),
            ("property_suffixes", lambda c: _seed_table_ordered(c, "property_suffixes")),
            ("slots", lambda c: _seed_table_ordered(c, "slots")),
            ("property_suffixes.kind_override", _seed_property_suffixes_kind_override),
            ("scalar-media roles", _seed_scalar_media_roles),
        )
        for label, step in steps:
            try:
                step(conn)
            except sqlite3.OperationalError as exc:
                conn.rollback()
                _warn(f"{label} seeder skipped: {exc}")
    finally:
        conn.close()


@functools.lru_cache(maxsize=1)
def fx_attr_roster() -> dict[str, dict[str, str]]:
    """``{attr_name: {"data_attr": "data-sgs-...", "type": "string"|...}}`` for every ``fx*`` attr.

    Names and data attributes come from ``FX_ATTR_MAP`` in ``includes/fx-attributes.php``; types
    come from ``includes/extension-attributes.generated.php`` (a name missing there is typed
    'string'). ``fxDisableTablet`` and ``fxDisableMobile`` render through their own branch rather
    than the generic map loop, so they are added explicitly (type 'boolean' by default). A missing
    or unreadable PHP file degrades to an empty or partial roster.
    """
    data_attrs: dict[str, str] = {}
    try:
        text = _FX_ATTRIBUTES_PHP.read_text(encoding="utf-8")
        for name, data_attr in _FX_MAP_ENTRY_RE.findall(text):
            data_attrs[name] = data_attr
    except Exception as exc:  # noqa: BLE001
        _warn(f"fx_attr_roster: FX_ATTR_MAP unreadable: {exc}")

    types: dict[str, str] = {}
    try:
        text = _EXTENSION_ATTRS_GENERATED_PHP.read_text(encoding="utf-8")
        for name, typ in _EXT_ATTR_TYPE_RE.findall(text):
            types[name] = typ
    except Exception as exc:  # noqa: BLE001
        _warn(f"fx_attr_roster: extension-attributes.generated.php unreadable: {exc}")

    roster = {
        name: {"data_attr": data_attr, "type": types.get(name, "string")}
        for name, data_attr in data_attrs.items()
    }
    for name, data_attr in (
        ("fxDisableTablet", "data-sgs-fx-disable-tablet"),
        ("fxDisableMobile", "data-sgs-fx-disable-mobile"),
    ):
        if name not in roster:
            roster[name] = {"data_attr": data_attr, "type": types.get(name, "boolean")}
    return roster


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the framework DB's reference tables.")
    parser.add_argument("--db", type=Path, help="Database to seed (default: $SGS_FRAMEWORK_DB or the shared DB).")
    args = parser.parse_args()
    seed_all(args.db)
    return 0


if __name__ == "__main__":
    sys.exit(main())
