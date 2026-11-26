#!/usr/bin/env python3
"""seed_reference_data.py -- idempotent seeders for the framework DB's reference tables.

Seeds the tables whose rows live in git-tracked data files under ``scripts/data/`` (the files are
the source of truth; the DB tables are the runtime query target, FP-1):

  roles                  <- roles.json
  modifier_suffixes      <- modifier-suffixes.json   (row order is load-bearing)
  property_suffixes      <- property-suffixes.json   (row order is load-bearing), then
                            ``kind_override`` back-filled for rows that have none
  slots                  <- slots.json
  html_tag_to_core_block <- atomic-tag-map.json      (bare HTML tag -> SGS block slug; the file
                            is the single source of the key set, so keys it lacks are deleted)
  property_equivalents   <- property-equivalents.json (rows the file drops are deleted)
  block_composition      <- block-composition.json   (block_slug, wraps_block, composition_role, container_kind;
                            accepts_allowed_blocks is left to Stage 1's allowedBlocks scrape; rows the file
                            drops are deleted)
  states                 <- states.json              (the state vocabulary, in file order; rows the file
                            drops are deleted)
  motion_presets        <- motion-presets.json      (validated against the motion schema first; a bad
                            preset aborts with a non-zero exit; rows the file lacks are deleted)
  setting_placements,    <- data/setting-records/*.json (one file per block; every file is validated before any
  block_part_order,         row changes and a bad file aborts with a non-zero exit; a block with no file loses
  setting_record_blocks     its rows; a missing or empty folder leaves the tables untouched)

Importing this module touches nothing: no database connection, no file read. ``seed_all(db_path)``
opens its own connection. The table DDL lives in ``dbschema/schema.sql``; a missing table or an
unwritable database is reported on stderr and that seeder is skipped.

Run as a script it refuses to write the shared DB from a checkout that is behind ``origin/main``
(``dbschema/tree_guard.py``); ``--allow-stale-tree`` overrides that deliberately.

Usage:
    python dbschema/seed_reference_data.py [--db PATH] [--allow-stale-tree]
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tree_guard  # noqa: E402
from motion_presets_seed import MotionPresetError, seed_motion_presets  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "lib"))
from framework_db import framework_db_path  # noqa: E402

_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
_DATA_DIR = _SCRIPTS_DIR / "data"
_PLUGIN_DIR = _SCRIPTS_DIR.parent

_ROLES_FILE = _DATA_DIR / "roles.json"
_MODIFIER_SUFFIXES_FILE = _DATA_DIR / "modifier-suffixes.json"
_ATOMIC_TAG_MAP_FILE = _DATA_DIR / "atomic-tag-map.json"
_PROPERTY_EQUIVALENTS_FILE = _DATA_DIR / "property-equivalents.json"
_PROPERTY_EQUIVALENTS_COLUMNS = ("draft_property", "setting_property", "hop", "condition", "note")
_STATES_FILE = _DATA_DIR / "states.json"
_SETTING_RECORDS_DIR = _DATA_DIR / "setting-records"
_STATES_COLUMNS = ("state", "family", "kind", "token", "reach", "call", "note")


_BLOCK_COMPOSITION_FILE = _DATA_DIR / "block-composition.json"
_BLOCK_COMPOSITION_COLUMNS = ("block_slug", "wraps_block", "composition_role", "container_kind")

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
    return framework_db_path()


def _warn(message: str) -> None:
    sys.stderr.write(f"[seed_reference_data] {message}\n")


# --- roles ---

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


# --- modifier_suffixes ---

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


# --- property_suffixes and slots ---

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


# --- block_composition ---

def _load_block_composition_seed() -> list[tuple]:
    """The ``(block_slug, wraps_block, composition_role, container_kind)`` rows from block-composition.json.

    ``[]`` (leaving the table alone) when the file is missing, unreadable, its ``__columns`` header disagrees with the
    column order read here, or ANY row is malformed (not a four-item list, a blank block_slug or composition_role, or a
    wraps_block / container_kind that is neither text nor null). A bad row is never skipped on its own: the seeder deletes every
    row the file does not list, so skipping one would delete that block's row from the database.
    """
    try:
        raw = json.loads(_BLOCK_COMPOSITION_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if tuple(raw.get("__columns") or ()) != _BLOCK_COMPOSITION_COLUMNS:
        _warn(
            "block-composition.json __columns does not match the expected column order for `block_composition` - "
            "refusing to seed positionally. Re-run dbschema/capture_seed_data.py --write."
        )
        return []
    rows = raw.get("rows") or []
    for index, row in enumerate(rows):
        if not (
            isinstance(row, list)
            and len(row) == len(_BLOCK_COMPOSITION_COLUMNS)
            and all(isinstance(row[i], str) and row[i].strip() for i in (0, 2))
            and all(row[i] is None or isinstance(row[i], str) for i in (1, 3))
        ):
            _warn(
                f"block-composition.json row {index} ({row!r}) is malformed - seeding nothing, so no `block_composition` row "
                f"is added, changed or deleted. Fix the row (four items: block_slug, wraps_block, composition_role, container_kind)."
            )
            return []
    return [tuple(r) for r in rows]


def _seed_block_composition(conn: sqlite3.Connection) -> None:
    """Upsert every block-composition.json row, then delete the rows the file no longer lists.

    The upsert writes only the four seeded columns, so ``accepts_allowed_blocks`` (derived from edit.js by Stage 1's
    allowedBlocks scrape, which runs after this on every run) and ``created_at`` survive. A row the file drops is deleted,
    announced with its count, as for ``roles``.

    Foreign keys are switched off for the write: a core block's row names a block whose ``blocks`` row exists only after a
    stage 2 scrape, so a stage-1-only rebuild (CI's) seeds those rows first and the scrape adds the block later. The
    pragma is a no-op inside a transaction, hence the commit before it. The connection's own setting is read first and put
    back afterwards, whatever happens.
    """
    seed = _load_block_composition_seed()
    if not seed:
        return
    conn.commit()
    foreign_keys = conn.execute("PRAGMA foreign_keys").fetchone()[0]
    conn.execute("PRAGMA foreign_keys = OFF")
    try:
        conn.executemany(
            "INSERT INTO block_composition (block_slug, wraps_block, composition_role, container_kind) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(block_slug) DO UPDATE SET wraps_block = excluded.wraps_block, "
            "composition_role = excluded.composition_role, container_kind = excluded.container_kind",
            seed,
        )
        placeholders = ",".join("?" for _ in seed)
        slugs = [r[0] for r in seed]
        orphans = conn.execute(
            f"SELECT COUNT(*) FROM block_composition WHERE block_slug NOT IN ({placeholders})",  # noqa: S608 - placeholders only
            slugs,
        ).fetchone()[0]
        if orphans:
            _warn(
                f"block-composition.json no longer lists {orphans} block_composition row(s) - deleting them. "
                f"If that was not intended, restore the rows in scripts/data/block-composition.json."
            )
            conn.execute(
                f"DELETE FROM block_composition WHERE block_slug NOT IN ({placeholders})",  # noqa: S608 - placeholders only
                slugs,
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.execute(f"PRAGMA foreign_keys = {1 if foreign_keys else 0}")


# --- html_tag_to_core_block ---

def _load_atomic_tag_seed() -> dict[str, tuple[str, str]]:
    """Load ``{html_tag: (target_sgs_slug, note)}`` from atomic-tag-map.json.

    Keys starting with ``__`` are metadata. A missing or unreadable file yields ``{}``, in which
    case the seeder leaves existing rows untouched.
    """
    try:
        raw = json.loads(_ATOMIC_TAG_MAP_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    out: dict[str, tuple[str, str]] = {}
    for tag, val in raw.items():
        if tag.startswith("__") or not isinstance(val, list) or not val:
            continue
        out[tag] = (val[0], val[1] if len(val) > 1 else "")
    return out


def _seed_html_tag_to_core_block(conn: sqlite3.Connection) -> None:
    """Upsert every atomic-tag-map.json entry, then delete rows whose tag the file no longer has.

    ``core_block_slug`` holds the target SGS block slug (the column name is kept for the
    consumers that read it).
    """
    seed = _load_atomic_tag_seed()
    if not seed:
        return
    for html_tag, (target_slug, note) in seed.items():
        conn.execute(
            "INSERT OR REPLACE INTO html_tag_to_core_block "
            "(html_tag, core_block_slug, note) VALUES (?, ?, ?)",
            (html_tag, target_slug, note),
        )
    placeholders = ",".join("?" for _ in seed)
    conn.execute(
        f"DELETE FROM html_tag_to_core_block WHERE html_tag NOT IN ({placeholders})",  # noqa: S608 - placeholders only
        list(seed.keys()),
    )
    conn.commit()


# --- property_equivalents ---

def _seed_property_equivalents(conn: sqlite3.Connection) -> None:
    """Replace the table's rows with property-equivalents.json's, so a row the file drops is deleted.

    A missing or unreadable file leaves the existing rows untouched.
    """
    try:
        rows = json.loads(_PROPERTY_EQUIVALENTS_FILE.read_text(encoding="utf-8"))["rows"]
    except (OSError, ValueError, KeyError):
        return
    conn.execute("DELETE FROM property_equivalents")
    cols = ", ".join(_PROPERTY_EQUIVALENTS_COLUMNS)
    marks = ", ".join("?" for _ in _PROPERTY_EQUIVALENTS_COLUMNS)
    conn.executemany(
        f"INSERT INTO property_equivalents ({cols}) VALUES ({marks})",  # noqa: S608 - fixed column names only
        [tuple(r.get(c) for c in _PROPERTY_EQUIVALENTS_COLUMNS) for r in rows],
    )
    conn.commit()


# --- states ---

def _seed_states(conn: sqlite3.Connection) -> None:
    """Replace the table's rows with states.json's, in file order (a reader matches the first row naming a token).

    A missing or unreadable file leaves the existing rows untouched.
    """
    try:
        rows = json.loads(_STATES_FILE.read_text(encoding="utf-8"))["states"]
    except (OSError, ValueError, KeyError):
        return
    conn.execute("DELETE FROM states")
    cols = ", ".join(_STATES_COLUMNS)
    marks = ", ".join("?" for _ in _STATES_COLUMNS)
    conn.executemany(
        f"INSERT INTO states (id, {cols}) VALUES (?, {marks})",  # noqa: S608 - fixed column names only
        [(i + 1, *(r.get(c) for c in _STATES_COLUMNS)) for i, r in enumerate(rows)],
    )
    conn.commit()


# --- setting records ---

class SettingRecordError(Exception):
    """A setting-record data file is malformed. Not a sqlite3.OperationalError, so seed_all lets it through."""


_RECORD_KINDS = ("value", "switched-on")
_RECORD_BUILT_BY = ("php", "script")
_RECORD_TABLES = ("setting_placements", "block_part_order", "setting_record_blocks")
_RECORD_SHRINK_WARN = 0.10


def _is_str_list(value: object) -> bool:
    return isinstance(value, list) and all(isinstance(v, str) for v in value)


def _optional_str(where: str, value: object, label: str) -> str | None:
    if value is not None and not isinstance(value, str):
        raise SettingRecordError(f"{where}: {label} must be a string or null")
    return value  # type: ignore[return-value]


def _accounted_text(where: str, value: object, label: str) -> str | None:
    """A string stays as written; a list or object is stored as JSON; null stays NULL."""
    if value is None or isinstance(value, str):
        return value  # type: ignore[return-value]
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    raise SettingRecordError(f"{where}: accounted.{label} must be a string, list, object or null")


def _parse_setting_record(path: Path) -> dict:
    """Validate one data file and return its rows: {block, parts, entries, block_row}. Writes nothing."""
    name = path.name
    try:
        text = path.read_text(encoding="utf-8")
        data = json.loads(text)
    except (OSError, ValueError) as exc:
        raise SettingRecordError(f"{name}: cannot read as JSON ({exc})") from exc
    if not isinstance(data, dict):
        raise SettingRecordError(f"{name}: the top level must be an object")
    block = data.get("block")
    if block != f"sgs/{path.stem}":
        raise SettingRecordError(f"{name}: block is {block!r} but the file name says 'sgs/{path.stem}'")
    version = data.get("schemaVersion")
    if isinstance(version, bool) or version not in (1, 2):
        raise SettingRecordError(f"{name}: schemaVersion must be 1 or 2, got {version!r}")

    parts_in = data.get("parts")
    if not isinstance(parts_in, list):
        raise SettingRecordError(f"{name}: parts must be a list")
    parts: list[tuple] = []
    seen_parts: set[str] = set()
    for i, item in enumerate(parts_in):
        if isinstance(item, str):
            part, tag, parent, built_by = item, None, None, None
        elif isinstance(item, dict):
            part = item.get("part")
            tag = _optional_str(f"{name}: parts[{i}]", item.get("tag"), "tag")
            parent = _optional_str(f"{name}: parts[{i}]", item.get("parent"), "parent")
            built_by = item.get("builtBy")
            if built_by is not None and built_by not in _RECORD_BUILT_BY:
                raise SettingRecordError(
                    f"{name}: parts[{i}] builtBy must be one of {_RECORD_BUILT_BY} or null, got {built_by!r}"
                )
        else:
            raise SettingRecordError(f"{name}: parts[{i}] must be a string or an object")
        if not isinstance(part, str) or not part:
            raise SettingRecordError(f"{name}: parts[{i}] needs a non-empty part name")
        if part in seen_parts:
            raise SettingRecordError(f"{name}: part {part!r} is listed twice")
        seen_parts.add(part)
        parts.append((block, i, part, tag, parent, built_by))

    entries_in = data.get("entries")
    if not isinstance(entries_in, list):
        raise SettingRecordError(f"{name}: entries must be a list")
    entries: list[tuple] = []
    seen_keys: set[tuple] = set()
    for i, entry in enumerate(entries_in):
        where = f"{name}: entries[{i}]"
        if not isinstance(entry, dict):
            raise SettingRecordError(f"{where} must be an object")
        if entry.get("runner") is not None:
            raise SettingRecordError(f"{where} carries a runner ({entry['runner']!r}): it is unchecked and may not be seeded")
        for key in ("setting", "part"):
            if not isinstance(entry.get(key), str) or not entry[key]:
                raise SettingRecordError(f"{where} needs a non-empty string {key}")
        for key in ("props", "tiers"):
            if not _is_str_list(entry.get(key)):
                raise SettingRecordError(f"{where} {key} must be a list of strings")
        state = _optional_str(where, entry.get("state"), "state") or ""
        kind = entry.get("kind")
        if kind is not None and kind not in _RECORD_KINDS:
            raise SettingRecordError(f"{where} kind must be one of {_RECORD_KINDS} or null, got {kind!r}")
        unproved = _optional_str(where, entry.get("unproved"), "unproved")
        accepted = _optional_str(where, entry.get("accepted"), "accepted")
        selector = _optional_str(where, entry.get("selector"), "selector")
        values = entry.get("values")
        if values is not None and not isinstance(values, list):
            raise SettingRecordError(f"{where} values must be a list or null")
        symbolic = entry.get("symbolic")
        if symbolic is not None and not isinstance(symbolic, (dict, list)):
            raise SettingRecordError(f"{where} symbolic must be an object or null")
        props = json.dumps(entry["props"], ensure_ascii=False)
        tiers = json.dumps(entry["tiers"], ensure_ascii=False)
        key = (entry["setting"], entry["part"], props, state, tiers)
        if key in seen_keys:
            raise SettingRecordError(
                f"{where} repeats an earlier entry (setting {entry['setting']!r}, part {entry['part']!r}, "
                f"props {props}, state {state!r}, tiers {tiers})"
            )
        seen_keys.add(key)
        entries.append((
            block, entry["setting"], entry["part"], props, state, tiers, kind, unproved, accepted, selector,
            None if values is None else json.dumps(values, ensure_ascii=False),
            None if symbolic is None else json.dumps(symbolic, ensure_ascii=False),
        ))

    stamp = data.get("stamp")
    if stamp is not None and not isinstance(stamp, dict):
        raise SettingRecordError(f"{name}: stamp must be an object or null")
    accounted = data.get("accounted")
    if accounted is None:
        accounted = {}
    if not isinstance(accounted, dict):
        raise SettingRecordError(f"{name}: accounted must be an object or null")
    tested = accounted.get("testedNoPaint")
    if tested is not None and not isinstance(tested, list):
        raise SettingRecordError(f"{name}: accounted.testedNoPaint must be a list or null")
    block_row = (
        block, version,
        None if stamp is None else json.dumps(stamp, ensure_ascii=False),
        None if tested is None else json.dumps(tested, ensure_ascii=False),
        _accounted_text(name, accounted.get("replacesBlock"), "replacesBlock"),
        _accounted_text(name, accounted.get("unvalued"), "unvalued"),
        _accounted_text(name, accounted.get("partNotNamed"), "partNotNamed"),
        text,
    )
    return {"block": block, "parts": parts, "entries": entries, "block_row": block_row}


def _seed_setting_records(conn: sqlite3.Connection, records_dir: Path | str | None = None) -> None:
    """Replace the setting record tables' rows with the data files' in ``records_dir`` (default ``data/setting-records``).

    Every file is validated before any row changes; a bad one raises SettingRecordError naming the file. Then, in one
    transaction, every block's rows are replaced in all three tables (a block with no file loses its rows) and the row
    counts are checked against the files. A missing or empty folder leaves the tables untouched.
    """
    folder = Path(records_dir) if records_dir is not None else _SETTING_RECORDS_DIR
    files = sorted(folder.glob("*.json")) if folder.is_dir() else []
    if not files:
        _warn(f"setting records: no data files in {folder}; the setting record tables are left as they are")
        return
    records = [_parse_setting_record(f) for f in files]

    before = {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in _RECORD_TABLES}  # noqa: S608 - fixed names
    try:
        for table in _RECORD_TABLES:
            conn.execute(f"DELETE FROM {table}")  # noqa: S608 - fixed names; every block with a file is re-inserted below
        conn.executemany(
            "INSERT INTO setting_record_blocks (block_slug, schema_version, stamp, tested_no_paint, replaces_block, "
            "unvalued, part_not_named, record_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [r["block_row"] for r in records],
        )
        conn.executemany(
            "INSERT INTO block_part_order (block_slug, position, part, tag, parent_part, built_by) VALUES (?, ?, ?, ?, ?, ?)",
            [row for r in records for row in r["parts"]],
        )
        conn.executemany(
            "INSERT INTO setting_placements (block_slug, setting, part, props, state, tiers, kind, unproved, accepted, "
            "selector, setting_values, symbolic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [row for r in records for row in r["entries"]],
        )
        expected = {
            "setting_placements": sum(len(r["entries"]) for r in records),
            "block_part_order": sum(len(r["parts"]) for r in records),
            "setting_record_blocks": len(records),
        }
        after = {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in _RECORD_TABLES}  # noqa: S608
        if after != expected:
            raise SettingRecordError(f"setting records: row counts {after} differ from the files' {expected}; nothing was written")
    except BaseException:
        conn.rollback()
        raise
    conn.commit()
    for table in _RECORD_TABLES:
        if before[table] and after[table] < before[table] * (1 - _RECORD_SHRINK_WARN):
            _warn(f"setting records: {table} shrank from {before[table]} to {after[table]} rows")


def seed_all(db_path: Path | str | None = None, records_dir: Path | str | None = None) -> None:
    """Run every seeder against ``db_path`` (default: ``default_db_path()``) over its own connection.

    Order matters: ``property_suffixes`` is seeded before its ``kind_override`` back-fill. Each seeder is independent: one that hits a missing table,
    a locked or read-only database is reported on stderr and the rest still run. A malformed setting-record file
    (SettingRecordError) is not skipped: it propagates after every earlier seeder has run, with no setting-record row changed.
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
            ("html_tag_to_core_block", _seed_html_tag_to_core_block),
            ("block_composition", _seed_block_composition),
            ("property_equivalents", _seed_property_equivalents),
            ("states", _seed_states),
            ("motion_presets", seed_motion_presets),
            ("setting_records", lambda c: _seed_setting_records(c, records_dir)),
        )
        for label, step in steps:
            try:
                step(conn)
            except sqlite3.OperationalError as exc:
                conn.rollback()
                _warn(f"{label} seeder skipped: {exc}")
    finally:
        conn.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed the framework DB's reference tables.")
    parser.add_argument("--db", type=Path, help="Database to seed (default: $SGS_FRAMEWORK_DB or the shared DB).")
    parser.add_argument(
        tree_guard.OVERRIDE_FLAG,
        dest="allow_stale_tree",
        action="store_true",
        help="Write the shared DB even though this checkout is behind origin/main (deliberate use only).",
    )
    args = parser.parse_args(argv)
    tree_guard.enforce(
        Path(__file__).resolve().parent,
        allow_stale=args.allow_stale_tree,
        target_db=args.db or default_db_path(),
        shared_dbs=(framework_db_path(),),
        label="seed_reference_data.py",
    )
    try:
        seed_all(args.db)
    except MotionPresetError as exc:
        _warn(f"motion_presets refused: {exc}")
        return 1
    except SettingRecordError as exc:
        _warn(f"setting records refused: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
