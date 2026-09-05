"""db_lookup.py — DB-backed canonical lookups for the converter.

Replaces the hardcoded CLASS_TO_BLOCK table in convert.py with live queries
against the Phase-1-frozen vocabularies in sgs-framework.db:

  - blocks                  : registered SGS block slugs
  - slots                   : unified slot→block mapping (element + section scope).
                               Replaces retired slot_synonyms + legacy_role_lookup.
                               D99 2026-05-29. PK: (slot_name, scope).
  - roles                   : role-name → classification catalogue (D99 2026-05-29).
                               Replaces slot_synonyms.role_classification column.
                               Fixes link-href bug: classification now lives here,
                               not on slot rows (which never had a link-href row).
  - modifier_suffixes       : Primary/Hover/Mobile/etc.
  - property_suffixes       : Padding/Margin/FontSize/etc. + kind_override column.
  - block_attributes        : attr_name → canonical_slot mapping per block

And against uimax.naming_conventions for the SGS-BEM regex.

The architecture matches Spec 31 (Convention Layer) + §4 (Mapping Layer).

Moved here from ``orchestrator/converter_v2/db_lookup.py`` in EXECUTION Step 9
(Phase 3, 2026-07-04) — this IS the canonical implementation now; the old path
is a re-export shim.
"""
from __future__ import annotations

import functools
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import NamedTuple

SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Device-tier sibling suffixes — a name ending in one of these is a tier SIBLING,
# never a tier BASE (see tier_object_base condition 3).
_TIER_SIBLING_SUFFIX_RE = re.compile(r"(Tablet|Mobile|Desktop)$")
UIMAX_DB = Path.home() / ".agents" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"
if not UIMAX_DB.exists():
    UIMAX_DB = Path.home() / ".agents" / "skills" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"

# Checked ONCE at import time. Six migration functions below run automatically
# on every import of this module (idempotent — see each one's own docstring),
# and every one of them opens its OWN connection via a bare
# `sqlite3.connect(SGS_DB)` that sits BEFORE its try/except, not inside it —
# so the existing "except sqlite3.OperationalError: pass" never runs for a
# failure IN THE CONNECT CALL ITSELF, only for a failure in the query that
# follows a successful connect.
#
# On a machine with no local `sgs-framework.db` (a clean clone — the DB is
# DELIBERATELY UNVERSIONED, see .claude/dev-setup.md "sgs-framework.db"),
# `SGS_DB`'s parent directory does not exist at all, so
# `sqlite3.connect(SGS_DB)` raises OperationalError("unable to open database
# file") IMMEDIATELY — and because this happens during MODULE IMPORT, it
# crashes before any CALLER's own "DB not found, skip cleanly" check ever
# gets a chance to run. Verified empirically 2026-07-31 with a faked empty
# HOME: `python scripts/db-consistency/run.py --check` died on this exact
# line, inside `_migrate_roles_table()`, imported transitively via
# `db-consistency/resolver_bridge.py` — before db-consistency/run.py's own
# `_DB_PATH.exists()` guard (which sits later, inside `main()`) ever executed.
# This was the true root cause of the clean-clone `npm run build` failure
# Motion Wave D Step 11 was opened to fix, one layer beneath what the step's
# own framing described.
#
# Fix: gate every module-load migration call behind this one flag, so none of
# them ever calls sqlite3.connect() against a DB that is not there. A
# migration only makes sense against an EXISTING DB anyway (there is nothing
# to migrate in a DB that was never created) — /sgs-update owns creating it
# from scratch, not this module.
_SGS_DB_PRESENT_AT_IMPORT = SGS_DB.exists()


def get_connection() -> sqlite3.Connection:
    """Open a fresh, caller-owned connection to the SGS DB (``check_same_thread=False``).

    FR-31-8 (2026-07-05): the sole legitimate accessor for call sites that need
    an OPEN connection object to pass across the resolver dispatch call graph
    (``Ctx.conn`` — consumed by ``build_ctx``, ``lift_root_supports_to_style``,
    ``process_element`` and downstream resolvers), as opposed to a single
    query answered by one of this module's other accessors.

    NOT cached / NOT a singleton: every call opens a new connection and the
    CALLER is responsible for closing it (mirrors the pre-existing
    ``sqlite3.connect(SGS_DB, check_same_thread=False)`` call sites this
    replaces in ``converter/services/css_pass.py`` and
    ``converter/services/fold_helpers.py`` — both open-per-call,
    close-in-``finally``). Caching the connection itself would break that
    lifecycle (a cached connection closed by one caller would break the next).
    """
    return sqlite3.connect(SGS_DB, check_same_thread=False)


# ----------------------------------------------------------------------------
# Idempotent schema migration — `roles` table (D99 2026-05-29)
# ----------------------------------------------------------------------------
# D99 replaces slot_synonyms.role_classification with a standalone `roles`
# table. This removes the coupling between slot data and role-classification
# data, and closes the link-href bug (slot_synonyms never had a row with
# role='link-href', so the old column-based migration never seeded it).
#
# The `roles` table ships 20 rows seeded from _ROLE_CLASSIFICATION_MAP.
# INSERT OR REPLACE ensures the seed dict updates propagate on every module
# load (unlike the old INSERT OR IGNORE which froze initial values).
#
# Permitted classifications (CHECK constraint in DB schema):
#   - 'content-bearing'    — role routes content via block-equivalence
#   - 'styling-behaviour'  — role is a scalar styling/behaviour attr
#   - 'unclassified'       — role NULL or otherwise not yet classified
#
# Runtime callers query this table via _content_bearing_roles() and
# _styling_behaviour_roles() below. _ROLE_CLASSIFICATION_MAP is the seed
# source only — never a runtime lookup dict (R-31-1).
# MOVED TO A DATA FILE 2026-08-02 (Phase 1). This was a hardcoded dict of 21
# entries while the live DB held 29 rows. The 8 extra — icon-dashicon,
# icon-emoji, icon-lucide, icon-wp-icon, image-alt, position, rating,
# tag-identity — were each added by a ONE-OFF MIGRATION that wrote the DB row
# and never back-wrote the seed. So a rebuild-from-empty silently produced
# 21/29 roles, and `rating` (added 2026-08-01) shows the drift was still
# actively happening. That is precisely the decay class Phase 0/1 exists to end
# — and a hardcoded routing dict also breaches R-31-1.
#
# The seed now lives at scripts/data/roles.json, mirroring the proven
# atomic-tag-map.json pattern. Runtime callers still query the TABLE via
# _content_bearing_roles() / _styling_behaviour_roles() — never this file.
_ROLES_SEED_FILE = Path(__file__).resolve().parents[2] / "data" / "roles.json"


def _load_roles_seed() -> dict[str, tuple[str, str]]:
    """Load ``{role_name: (classification, description)}`` from roles.json.

    Data-file source (R-31-1 — no hardcoded routing dict in code). Keys starting
    with ``__`` are metadata. Soft-fails to ``{}`` if the file is missing or
    unreadable, in which case the migration leaves existing DB rows untouched
    rather than wiping a good table because a file went walkabout.
    """
    try:
        raw = json.loads(_ROLES_SEED_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    out: dict[str, tuple[str, str]] = {}
    for name, val in raw.items():
        if name.startswith("__") or not isinstance(val, list) or not val:
            continue
        out[name] = (val[0], val[1] if len(val) > 1 else "")
    return out


def _migrate_roles_table() -> None:
    """Idempotent migration: create `roles` and seed it from roles.json.

    INSERT OR REPLACE (not OR IGNORE) so edits to the data file propagate on
    every module load. The FILE is the canonical source for the role vocabulary;
    the DB table is the authoritative runtime query target. Honours R-31-1.

    Two-way sync: a role REMOVED from roles.json is deleted from the table, so
    the file genuinely is the source of truth for the key set (the D271
    precedent set by html_tag_to_core_block, where INSERT OR REPLACE alone left
    a retired `hr` row lingering forever). Unlike that table, a role here may be
    referenced by ``block_attributes.role``, so a deletion is announced with its
    referencing-attr count rather than performed silently — a silently dropped
    role would break routing for every attr carrying it, with nothing to notice.

    Safe to call repeatedly. Runs at module load.
    """
    seed = _load_roles_seed()
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS roles (
              role_name      TEXT PRIMARY KEY,
              classification TEXT NOT NULL CHECK (classification IN
                             ('content-bearing','styling-behaviour','unclassified')),
              description    TEXT,
              created_at     TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        if not seed:
            # Missing/unreadable data file: leave a good table alone rather than
            # wiping it. Better a stale table than an empty one.
            conn.commit()
            return

        for role_name, (classification, description) in seed.items():
            conn.execute(
                "INSERT OR REPLACE INTO roles (role_name, classification, description) "
                "VALUES (?, ?, ?)",
                (role_name, classification, description),
            )

        placeholders = ",".join("?" for _ in seed)
        orphans = [
            r[0] for r in conn.execute(
                f"SELECT role_name FROM roles WHERE role_name NOT IN ({placeholders})",  # noqa: S608 — placeholders only
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
            sys.stderr.write(
                f"[db_lookup] roles.json no longer lists '{role_name}' — deleting it "
                f"({refs if refs >= 0 else 'unknown'} block_attributes row(s) reference it). "
                f"If that was not intended, restore it in scripts/data/roles.json.\n"
            )
        if orphans:
            conn.execute(
                f"DELETE FROM roles WHERE role_name NOT IN ({placeholders})",  # noqa: S608 — placeholders only
                list(seed),
            )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail. Callers fall back to
        # empty-frozenset / unclassified-default behaviour.
        pass
    finally:
        conn.close()


# ----------------------------------------------------------------------------
# Idempotent seeder — `modifier_suffixes` (2026-08-02, Phase 1)
# ----------------------------------------------------------------------------
# This table had NO WRITER ANYWHERE while being CONVERTER-LOAD-BEARING: it is
# read at line ~585 (all suffix/kind pairs), ~2146 (kind='breakpoint') and
# ~2262 (per-kind, ORDER BY rowid). A rebuild-from-empty produced 0 rows, which
# silently breaks breakpoint/side resolution — no error, just wrong answers.
# Spec 31 §4 declares the table DB-OWNED, so the resolvers must never hardcode
# these literals; the vocabulary therefore lives in a git-tracked data file.
_MODIFIER_SUFFIXES_FILE = Path(__file__).resolve().parents[2] / "data" / "modifier-suffixes.json"


def _load_modifier_suffixes_seed() -> list[tuple[str, str, str | None]]:
    """Load the ORDERED [(suffix, kind, notes)] vocabulary from the data file.

    Soft-fails to ``[]`` if the file is missing/unreadable, so a good table is
    left alone rather than wiped.
    """
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


def _migrate_modifier_suffixes() -> None:
    """Idempotent seed of `modifier_suffixes`, PRESERVING ROW ORDER.

    ⚠ ORDER IS LOAD-BEARING. ``breakpoint_suffixes()``-style callers run
    ``SELECT suffix FROM modifier_suffixes WHERE kind = ? ORDER BY rowid``, so
    the table's physical row order is what the resolver sees — and for
    ``kind='side'`` that order is Top/Right/Bottom/Left, i.e. CSS shorthand
    order. ``INSERT OR REPLACE`` assigns a NEW rowid to a replaced row, so the
    usual upsert pattern would silently scramble that sequence.

    Therefore: compare first, and only if the table differs from the file do a
    full DELETE + ordered re-INSERT. That keeps it idempotent (an unchanged
    table is never rewritten) while guaranteeing rowid order matches the file.
    """
    seed = _load_modifier_suffixes_seed()
    if not seed:
        return
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS modifier_suffixes ("
            "  suffix TEXT PRIMARY KEY,"
            "  kind   TEXT NOT NULL,"
            "  notes  TEXT"
            ")"
        )
        current = conn.execute(
            "SELECT suffix, kind, notes FROM modifier_suffixes ORDER BY rowid"
        ).fetchall()
        if [tuple(r) for r in current] == [tuple(s) for s in seed]:
            return  # already exact, including order — nothing to do
        conn.execute("DELETE FROM modifier_suffixes")
        conn.executemany(
            "INSERT INTO modifier_suffixes (suffix, kind, notes) VALUES (?, ?, ?)",
            seed,
        )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail, as the sibling seeders do.
        pass
    finally:
        conn.close()


# ----------------------------------------------------------------------------
# Idempotent seeders — the three Phase-1 Group-5 gaps (2026-08-02)
# ----------------------------------------------------------------------------
# `property_suffixes` (154 rows), `slots` (104) and `excluded_properties` (10)
# were all CONVERTER-LOAD-BEARING with NO WRITER ANYWHERE. A rebuild-from-empty
# produced 0 rows in each — which does not error, it just makes the converter
# answer wrongly:
#   - property_suffixes empty ⇒ no CSS property resolves to an attribute suffix
#   - slots empty            ⇒ no BEM element resolves to a canonical slot/block
#   - excluded_properties    ⇒ every deliberately-excluded property looks liftable
#
# Their only historical source was one-off migrations, and MIGRATION REPLAY IS A
# PROVEN DEAD END (Phase 0 Step 0.5: three migrations reference `slot_synonyms`,
# retired in favour of `slots`, so a May migration cannot run against an August
# schema). The seed is therefore captured from LIVE state into git-tracked data
# files by `dbschema/capture_seed_data.py`, mirroring the roles.json /
# modifier-suffixes.json / atomic-tag-map.json precedent (R-31-1: the runtime
# path queries the TABLE, never these files).
#
# One writer per artefact: capture_seed_data.py owns the JSON, this module owns
# the tables. `capture_seed_data.py --check` fails when the two drift.
_DATA_DIR = Path(__file__).resolve().parents[2] / "data"

# table -> (data file, ordered columns, CREATE TABLE DDL matching live)
_SEEDED_TABLES: dict[str, tuple[str, tuple[str, ...], str]] = {
    "property_suffixes": (
        "property-suffixes.json",
        ("suffix", "role", "css_property", "is_token_matched",
         "token_source", "notes", "kind_override"),
        "CREATE TABLE IF NOT EXISTS property_suffixes ("
        "  suffix TEXT PRIMARY KEY,"
        "  role TEXT NOT NULL,"
        "  css_property TEXT,"
        "  is_token_matched INTEGER DEFAULT 1,"
        "  token_source TEXT,"
        "  notes TEXT,"
        "  kind_override TEXT"
        ")",
    ),
    "slots": (
        "slots.json",
        ("slot_name", "scope", "aliases", "standalone_block", "notes",
         "standalone_block_default_attrs"),
        "CREATE TABLE IF NOT EXISTS slots ("
        "  slot_name TEXT NOT NULL,"
        "  scope TEXT NOT NULL CHECK (scope IN ('section','element')),"
        "  aliases TEXT,"
        "  standalone_block TEXT,"
        "  notes TEXT,"
        "  created_at TEXT DEFAULT CURRENT_TIMESTAMP,"
        "  standalone_block_default_attrs TEXT,"
        "  PRIMARY KEY (slot_name, scope)"
        ")",
    ),
    "excluded_properties": (
        "excluded-properties.json",
        ("css_property", "reason", "decided_by", "date"),
        "CREATE TABLE IF NOT EXISTS excluded_properties ("
        "  css_property TEXT NOT NULL,"
        "  reason TEXT NOT NULL,"
        "  decided_by TEXT NOT NULL,"
        "  date TEXT NOT NULL,"
        "  UNIQUE(css_property)"
        ")",
    ),
}


def _load_seeded_table(table: str) -> list[tuple]:
    """Load the ORDERED row list for *table* from its data file.

    Soft-fails to ``[]`` if the file is missing, unreadable, or its ``__columns``
    header disagrees with the column list this module inserts by — a widened
    schema must not be unpacked positionally into the old column order. An empty
    return leaves any existing table untouched: better a stale table than one
    wiped because a file went walkabout.
    """
    filename, cols, _ = _SEEDED_TABLES[table]
    try:
        raw = json.loads((_DATA_DIR / filename).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if tuple(raw.get("__columns") or ()) != cols:
        sys.stderr.write(
            f"[db_lookup] {filename} __columns does not match the expected column "
            f"order for `{table}` — refusing to seed positionally. "
            f"Re-run dbschema/capture_seed_data.py --write.\n"
        )
        return []
    out: list[tuple] = []
    for row in raw.get("rows") or []:
        if not isinstance(row, list) or len(row) != len(cols):
            continue
        out.append(tuple(row))
    return out


def _seed_table_ordered(table: str) -> None:
    """Idempotently seed *table* from its data file, PRESERVING ROW ORDER.

    ⚠ ORDER IS LOAD-BEARING for ``property_suffixes``: several readers run
    ``... ORDER BY rowid``, and ``propose_attr_name()`` runs
    ``ORDER BY rowid LIMIT 1`` — so where a css_property has more than one suffix
    row, THE FIRST ROW WINS (``Colour`` before ``Color`` for ``color`` is
    deliberate). ``INSERT OR REPLACE`` assigns a NEW rowid to a replaced row, so
    the usual upsert would silently scramble that precedence — the same trap
    ``modifier_suffixes`` documented for its Top/Right/Bottom/Left ``side`` rows.

    Therefore: compare first, and only if the table differs from the file do a
    full DELETE + ordered re-INSERT. An unchanged table is never rewritten, so
    this is quiet and idempotent; a changed one comes back in exactly file order.

    ``slots.created_at`` is not captured and is re-defaulted on any rewrite —
    it is unread metadata, and capturing it would make every rebuild diff.
    """
    seed = _load_seeded_table(table)
    if not seed:
        return
    _, cols, ddl = _SEEDED_TABLES[table]
    collist = ", ".join(cols)
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute(ddl)
        current = conn.execute(
            f'SELECT {collist} FROM "{table}" ORDER BY rowid'  # noqa: S608 — fixed names
        ).fetchall()
        if [tuple(r) for r in current] == seed:
            return  # already exact, including order — nothing to do

        # ⚠ ANNOUNCE A SHRINK BEFORE PERFORMING IT.
        #
        # The data file is authoritative: this rebuild DELETEs whatever the table
        # held and re-INSERTs the file's rows. That is what makes the file the
        # source of truth — and it also means a file that has LOST rows silently
        # prunes the live database on the next import, with no error and nothing
        # to notice. Proven the hard way 2026-08-02: one row was removed from
        # slots.json to test a gate, an unrelated process imported this module,
        # and the `attribution` slot (added 2026-07-25 to fix the sgs/quote
        # cloning bug) was deleted from the live DB. Recovering it needed the
        # committed blob.
        #
        # A shrink is legitimate when someone genuinely retires a slot, so this
        # does NOT refuse — refusing would break the retirement path and invite a
        # bypass. It makes the event LOUD instead, matching the deletion notice
        # _migrate_roles_table() already emits for its orphans.
        if len(seed) < len(current):
            sys.stderr.write(
                f"[db_lookup] WARNING: {_SEEDED_TABLES[table][0]} has "
                f"{len(seed)} row(s) but `{table}` holds {len(current)} — "
                f"re-seeding will DELETE {len(current) - len(seed)}. If that was "
                f"not intended, restore the file (git) before anything else "
                f"imports this module.\n"
            )
        conn.execute(f'DELETE FROM "{table}"')  # noqa: S608 — fixed names
        conn.executemany(
            f'INSERT INTO "{table}" ({collist}) '  # noqa: S608 — fixed names
            f'VALUES ({", ".join("?" for _ in cols)})',
            seed,
        )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail, as the sibling seeders do.
        pass
    finally:
        conn.close()


def _migrate_property_suffixes() -> None:
    """Idempotent, order-preserving seed of `property_suffixes` (154 rows)."""
    _seed_table_ordered("property_suffixes")


def _migrate_slots() -> None:
    """Idempotent seed of `slots` (104 rows, element + section scope)."""
    _seed_table_ordered("slots")


def _migrate_excluded_properties() -> None:
    """Idempotent seed of `excluded_properties` (10 rows, F4 non-lift set)."""
    _seed_table_ordered("excluded_properties")


# ----------------------------------------------------------------------------
# Idempotent seeder — `scalar-media` role assignments (2026-08-02, D474)
# ----------------------------------------------------------------------------
# UNLIKE the seeders above this does NOT own a whole table. `block_attributes`
# is rebuilt from every block.json by /sgs-update; this only re-asserts ONE
# COLUMN on a named handful of rows.
#
# WHY IT EXISTS: D128 built art-directed media routing and set this role with a
# hand-typed DB UPDATE that was never captured in any migration or script. No
# rebuild could reproduce it, so it silently reverted and the auto-classifier
# refilled the blank with its generic guess `image-object`. Measured 2026-08-02:
# zero rows carried the role, and a hero clone put the MOBILE image into the
# DESKTOP attr while dropping the desktop image into a stray child block.
#
# The role is load-bearing for BOTH halves of the mechanism — see
# scripts/data/scalar-media-roles.json, which carries the full rationale and is
# the source of truth for the roster.
_SCALAR_MEDIA_ROLES_FILE = _DATA_DIR / "scalar-media-roles.json"
_SCALAR_MEDIA_ROLE = "scalar-media"


def _load_scalar_media_roles() -> list[tuple[str, str]]:
    """Load the [(block_slug, attr_name)] roster for the `block_attributes.role`
    RE-ASSERTION path only (``_migrate_scalar_media_roles``).

    Skips any entry marked ``"virtual": true`` in its 4th (options) field —
    added 2026-09-02 for the Tablet/video/svg tier-sibling entries. Those
    entries exist purely so ``scalar_media_emit_as``/``scalar_media_type_stem``
    can resolve their target attr names; they name a COMPOSITE attr
    (``splitImageTablet``, ``splitVideo``, …) that has no ``block_attributes``
    row at all (block.json never declares a composite object for those tiers —
    only the flat Id/Url/Alt trio, which the emit_as expansion writes to).
    Feeding them through the role re-assertion path would print a permanent
    false "no block_attributes row" warning on every module load. Real
    (non-virtual) entries are unaffected — same soft-fail-to-``[]`` contract.
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


def scalar_media_emit_as(block_slug: str, attr_name: str) -> dict[str, str] | None:
    """Optional 4th roster-entry field (``scalar-media-roles.json``'s own
    ``__emit_as`` docstring carries the full rationale): when a scalar-media
    attr's STORAGE shape has moved from the composite ``{id,url,alt}`` object
    ``run_mechanism_b``'s ``ScalarLift`` still produces to separate scalar
    keys (Wave 6, 2026-09-02 — sgs/hero's media-atom migration), this names
    the target attr names so ``assembly.py``'s ScalarLift handling can expand
    the composite value into them instead of writing the composite object to
    a name nothing reads any more.

    Widened 2026-09-02 (Tablet/video/svg tier routing): the shape is no
    longer fixed to the id/url/alt image trio — a video lift has no ``alt``
    (``{"id": ..., "url": ...}``), so this now returns WHATEVER key set the
    roster entry declares, verbatim, rather than requiring all three of
    id/url/alt to be present. ``assembly.py``'s consumer reads the returned
    dict generically (``r.value.get(key, ...)`` per declared key) so any
    subset of {id, url, alt} keys is safe to add here without a second change
    there. (An inline-SVG lift needs no expansion at all — ``splitSvgContent``
    is written directly as a plain string ScalarLift; it never appears here.)

    @return the entry's ``emit_as`` dict (target attr names) verbatim, or
        ``None`` for every roster entry that has not opted in — the
        overwhelming majority, which keep writing the composite object
        exactly as before.
    """
    try:
        raw = json.loads(_SCALAR_MEDIA_ROLES_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    for entry in raw.get("attrs", []):
        if not (isinstance(entry, list) and len(entry) >= 4):
            continue
        if entry[0] != block_slug or entry[1] != attr_name:
            continue
        opts = entry[3]
        emit_as = opts.get("emit_as") if isinstance(opts, dict) else None
        if isinstance(emit_as, dict) and emit_as:
            return dict(emit_as)
    return None


def scalar_media_type_stem(block_slug: str, media_kind: str) -> str | None:
    """Return the BASE attr-name STEM for `block_slug`'s scalar-media family
    matching `media_kind` (``'image'``, ``'video'`` or ``'svg'``).

    Added 2026-09-02 for the video/SVG split-media tier widening; widened the
    same day (Wave 7b re-anchor) to also cover ``'image'``. A scalar-media
    column (e.g. sgs/hero's split-media slot) may hold an ``<img>``, a
    ``<video>``, or an inline ``<svg>`` depending on the draft — each media
    kind writes to a DIFFERENT attr family (``splitImage*`` / ``splitVideo*``
    / ``splitSvgContent*``).

    ⚠ Before the Wave 7b re-anchor, the image family's stem was NOT declared
    here — it was read straight off ``scalar_media_attr_for``'s return value,
    because that function's DB-resolved anchor happened to BE ``splitImage``.
    That coincidence is exactly what the re-anchor removed: the anchor moved
    to ``splitMediaType`` (a presence/eligibility gate only — see
    ``scalar_media_attr_for``'s docstring), which shares no substring with
    any of the three content families, so NONE of them can be derived from
    it any more. All three are now declared explicitly and symmetrically in
    the roster's ``media_type_stems`` section instead of being guessed by
    string-substitution (R-31-1 — no invented naming convention).

    @return the stem string (e.g. ``'splitVideo'``, ``'splitSvgContent'``) or
        ``None`` when the block declares no stem for that media kind — the
        caller must treat this as "route not built for this block/kind", a
        loud ContentGap, never a guess.
    """
    try:
        raw = json.loads(_SCALAR_MEDIA_ROLES_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    stems = raw.get("media_type_stems", {})
    if not isinstance(stems, dict):
        return None
    block_stems = stems.get(block_slug)
    if not isinstance(block_stems, dict):
        return None
    stem = block_stems.get(media_kind)
    return stem if isinstance(stem, str) and stem else None


def _migrate_scalar_media_roles() -> None:
    """Re-assert ``role='scalar-media'`` on the rostered attrs. Idempotent.

    ⚠ THIS SEEDER IS ALSO A DRIFT DETECTOR, and that is the point. It writes
    only when a row does NOT already hold the role, and when it does write it
    says so on stderr. A silent run means nothing drifted; a noisy run means
    something reclassified these rows again and the message is the evidence.
    The previous loss was invisible precisely because the value was set once,
    by hand, with nothing to re-assert or announce it.

    It deliberately does NOT reset rows back to their previous role when an
    entry is REMOVED from the roster. Unlike the table seeders above, this file
    is not the owner of the `role` column — /sgs-update's classifier is — so
    inventing a "correct" value to revert to would be a guess. Removing an entry
    simply stops this seeder re-asserting it; the classifier then owns it again.
    """
    roster = _load_scalar_media_roles()
    if not roster:
        return
    conn = sqlite3.connect(SGS_DB)
    try:
        changed: list[tuple[str, str, str]] = []
        for block_slug, attr_name in roster:
            row = conn.execute(
                "SELECT role FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
                (block_slug, attr_name),
            ).fetchone()
            if row is None:
                # The attr itself is gone — a block.json change, not role drift.
                # Not this seeder's business to invent the row; announce and skip.
                sys.stderr.write(
                    f"[db_lookup] scalar-media roster names {block_slug}.{attr_name}, "
                    f"which has no block_attributes row — check the block's block.json.\n"
                )
                continue
            if row[0] == _SCALAR_MEDIA_ROLE:
                continue  # already correct — the quiet, expected path

            # ⛔ PRE-CONDITION GUARD (added 2026-08-02, same day as the incident it
            # prevents). `scalar-media` is NOT a content-bearing role, so applying it
            # REMOVES the attr from the universal walk's candidate set. The path meant
            # to take over — run_mechanism_b branch A — only fires when
            # `is_class_section_block(slug)` is True. On any other block the attr ends
            # up with NO route in either direction and silently lifts nothing.
            #
            # That is not hypothetical: `sgs/testimonial-slider.sideImage` was added to
            # the roster and measured BROKEN the same day (image-object lifts it,
            # scalar-media lifts nothing). D128 had already recorded this exact
            # constraint and deliberately left that block out; the roster entry
            # overrode a documented decision with an assumption.
            #
            # So the pre-condition is enforced HERE rather than trusted to the note in
            # the data file. A prose warning is not a gate.
            # ⛔ DO NOT widen this except. It was `except Exception` for about an hour
            # and that hid a NameError: this seeder is invoked at module load, and
            # `is_class_section_block` is defined ~2200 lines LOWER in this file, so the
            # call raised, the broad except swallowed it, `eligible` became False, and the
            # seeder REFUSED to repair sgs/hero while printing a message that said
            # `is_class_section_block(sgs/hero) is False` — which was untrue. A guard that
            # fails closed AND reports a fabricated reason is worse than no guard.
            #
            # 2026-09-02 (Wave 7b): the roster's only real (non-virtual) row for
            # sgs/hero is now 'splitMediaType', not 'splitImage'/'splitImageMobile' —
            # this precondition guard is unaffected (it keys on block_slug, not the
            # attr name), but a reader expecting 'splitImage' examples in older
            # comments nearby should treat 'splitMediaType' as the current anchor.
            # Fixed by moving the module-load invocation to the END of this file; the
            # narrow except keeps that class of mistake loud if the order ever regresses.
            eligible = is_class_section_block(block_slug)
            if not eligible:
                sys.stderr.write(
                    f"[db_lookup] REFUSING to set role='{_SCALAR_MEDIA_ROLE}' on "
                    f"{block_slug}.{attr_name}: is_class_section_block({block_slug}) is "
                    f"False, so run_mechanism_b branch A can never fire for it and this "
                    f"role would strand the attr with no route at all. Remove it from "
                    f"scripts/data/scalar-media-roles.json.\n"
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
                sys.stderr.write(
                    f"[db_lookup] RE-ASSERTED role='{_SCALAR_MEDIA_ROLE}' on "
                    f"{block_slug}.{attr_name} (found {was!r}). Something reclassified "
                    f"it — art-directed media routing was BROKEN until this ran.\n"
                )
    except sqlite3.OperationalError:
        pass  # DB read-only / locked / missing — soft-fail, as the siblings do
    finally:
        conn.close()


# Run migration at module load (idempotent).
#
# property_suffixes is seeded HERE, ahead of
# _migrate_property_suffixes_kind_override() further down the module, so a
# freshly-created table has its rows before that migration back-fills
# kind_override. The capture is taken POST-migration, so on a live database the
# two agree and neither rewrites the other's work on the next import.
if _SGS_DB_PRESENT_AT_IMPORT:
    _migrate_roles_table()
    _migrate_modifier_suffixes()
    _migrate_property_suffixes()
    _migrate_slots()
    _migrate_excluded_properties()
    # NOTE: _migrate_scalar_media_roles() is deliberately NOT called here. It depends on
    # is_class_section_block(), defined far below, so calling it at this point in module
    # execution raises NameError. It is invoked at the FOOT of this file instead.



# ----------------------------------------------------------------------------
# Idempotent schema migration — html_tag_to_core_block
# ----------------------------------------------------------------------------
# Spec 22 §14 Appendix B / R-31-1 (2026-05-28 hardening): the bridge between
# HTML primitive tags and canonical WordPress core block slugs moves out of
# a hardcoded Python dict into a DB table. Runtime path (atomic_tag_map()
# below) queries the DB ONLY.
#
# Mapping rationale:
#   - HTML semantics are an external standard (HTML living spec). The seed
#     below encodes that standard once, at migration time, into the DB.
#   - Per-runtime callers never read this Python dict — they query
#     html_tag_to_core_block via the public atomic_tag_map() helper.
#   - This mirrors the _ROLE_CLASSIFICATION_MAP precedent above: code-level
#     dict is one-time-seed data, never runtime routing.
# The bare-HTML-tag → SGS-block bridge is a version-controlled DATA FILE
# (scripts/data/atomic-tag-map.json), NOT a hardcoded dict (R-31-1). That file is
# the git-tracked SEED that (re)populates the html_tag_to_core_block DB table via
# the migration below — rebuild insurance for a from-scratch DB. The runtime path
# (atomic_tag_map()) queries the DB table ONLY, never this file. Values route each
# bare tag DIRECTLY to its SGS block — the converter never emits a core block
# (D270, 2026-07-04: repointed core/* → sgs/*; column name core_block_slug is
# retained for compat but holds the SGS target).
_ATOMIC_TAG_MAP_FILE = Path(__file__).resolve().parents[2] / "data" / "atomic-tag-map.json"


def _load_atomic_tag_seed() -> dict[str, tuple[str, str]]:
    """Load {html_tag: (target_sgs_slug, note)} from atomic-tag-map.json.

    Data-file source (R-31-1 — no hardcoded routing dict in code). Keys starting
    with ``__`` are metadata. Soft-fails to ``{}`` if the file is missing or
    unreadable, in which case the migration leaves existing DB rows untouched.
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


def _migrate_html_tag_to_core_block() -> None:
    """Idempotent migration: create html_tag_to_core_block table if absent
    and populate it from the atomic-tag-map.json seed (_load_atomic_tag_seed).

    Safe to call repeatedly. Runs at module load. Honours R-31-1: the seed is a
    version-controlled DATA FILE, NOT a hardcoded runtime dict — atomic_tag_map()
    queries the DB table only.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS html_tag_to_core_block ("
            "  html_tag TEXT PRIMARY KEY,"
            "  core_block_slug TEXT NOT NULL,"
            "  note TEXT,"
            "  created_at TEXT DEFAULT CURRENT_TIMESTAMP"
            ")"
        )
        # INSERT OR REPLACE — propagates atomic-tag-map.json edits on module
        # re-load (D99 2026-05-29 Fix 3: was INSERT OR IGNORE) so an updated seed
        # value refreshes the DB row automatically without manual edits.
        seed = _load_atomic_tag_seed()
        for html_tag, (target_slug, note) in seed.items():
            conn.execute(
                "INSERT OR REPLACE INTO html_tag_to_core_block "
                "(html_tag, core_block_slug, note) VALUES (?, ?, ?)",
                (html_tag, target_slug, note),
            )
        # Reconcile DELETIONS too: a key removed from the seed must not linger
        # in the DB (2026-07-05: the retired sgs/divider's hr row survived the
        # seed edit — INSERT OR REPLACE alone never deletes). The seed file is
        # the single source of truth for this table's key set (D271).
        if seed:
            placeholders = ",".join("?" for _ in seed)
            conn.execute(
                f"DELETE FROM html_tag_to_core_block WHERE html_tag NOT IN ({placeholders})",  # noqa: S608 — placeholders only
                list(seed.keys()),
            )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail. atomic_tag_map() then
        # returns an empty dict; walker callers must handle the empty-map case.
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent).
if _SGS_DB_PRESENT_AT_IMPORT:
    _migrate_html_tag_to_core_block()


# ----------------------------------------------------------------------------
# Trace emitter (debug-trace evidence chain)
# ----------------------------------------------------------------------------
# Mirrors the pattern in convert.py. set_trace() is called by convert.py's
# set_trace() so both modules emit into the same per-section trace file.
_TRACE = None  # type: ignore[assignment]
_TRACE_BOUNDARY = ""


def set_trace(tr, boundary_id: str = "") -> None:
    """Bind a per-section Trace + boundary tag. Pass tr=None to disable."""
    global _TRACE, _TRACE_BOUNDARY
    _TRACE = tr
    _TRACE_BOUNDARY = boundary_id or ""


def _trace(stage: str, **kwargs) -> None:
    """Soft-fail trace emission. No-op when no trace is bound."""
    if _TRACE is None:
        return
    try:
        kwargs.setdefault("boundary_id", _TRACE_BOUNDARY)
        _TRACE.event(stage=stage, **kwargs)
    except Exception:  # noqa: BLE001 — never break the converter
        pass


class BemParse(NamedTuple):
    """Parsed SGS-BEM class name. None fields mean the part wasn't present."""
    block: str | None       # 'featured-product', 'product-card', 'button'
    element: str | None     # 'inner', 'price-row', 'label', 'pill-group'
    modifier: str | None    # 'primary', 'trial', 'active'


# ----------------------------------------------------------------------------
# SGS-BEM parser — uses the regex stored in uimax.naming_conventions
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def _sgs_bem_regex() -> re.Pattern:
    """Fetch the canonical SGS-BEM regex from uimax.naming_conventions."""
    # Note: the validator regex in uimax allows `-` inside block/element capture
    # groups, which is greedy and eats `--modifier`. For PARSING (vs validating)
    # we need block/element groups that EXCLUDE the `--` boundary. The trick is
    # `(?:[a-z0-9]|-(?!-))*` — any single char that's not the start of `--`.
    return re.compile(
        r"^sgs-([a-z](?:[a-z0-9]|-(?!-))*)"          # block
        r"(?:__([a-z](?:[a-z0-9]|-(?!-))*))?"        # __element
        r"(?:--([a-z][a-z0-9-]*))?$"                  # --modifier (can contain hyphens)
    )


def parse_sgs_bem(class_name: str) -> BemParse | None:
    """Parse 'sgs-product-card__body--trial' → BemParse(block='product-card', element='body', modifier='trial')."""
    if not class_name.startswith("sgs-"):
        return None
    m = _sgs_bem_regex().match(class_name)
    if not m:
        return None
    return BemParse(block=m.group(1), element=m.group(2), modifier=m.group(3))


# ----------------------------------------------------------------------------
# Block registry — which SGS block slugs actually exist
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def registered_block_slugs() -> frozenset[str]:
    """Return the set of `sgs/<name>` slugs that have a working implementation.

    Important (per Sonnet QC 2026-05-14): only `status='built'` blocks are
    routable. `status='planned'` blocks are spec stubs with no PHP/JS — if
    the converter emits them, WordPress will throw "this block contains
    unexpected or invalid content" in the editor. Planned slugs fall through
    to sgs/container in the converter, which is correct.

    Degrades to an empty frozenset (never raises) when the DB cannot be
    opened at all — unlike most other lookups in this module, this one had
    no guard whatsoever (neither on the connect() call nor the query),
    unguarded even though the connect() call is exactly where a missing DB
    fails: SQLite raises on OPEN when the parent directory does not exist,
    not on the query. Verified empirically 2026-07-31 with a faked empty
    HOME: `python -m pytest scripts/oracle/tests/ -q` (wired into
    `prebuild`) crashed here via
    oracle/batch_runner.py -> converter/recognition.py -> block_exists().
    An empty result here is HONEST, not a silent false pass — it means
    "recognises no SGS blocks", the correct behaviour when there is no DB to
    recognise them against."""
    try:
        conn = sqlite3.connect(SGS_DB)
    except sqlite3.OperationalError:
        return frozenset()
    try:
        rows = conn.execute("SELECT slug FROM blocks WHERE status = 'built'").fetchall()
    except sqlite3.OperationalError:
        return frozenset()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


def block_exists(slug: str) -> bool:
    """Return True if `slug` (e.g. 'sgs/product-card') is a registered block."""
    return slug in registered_block_slugs()


# ----------------------------------------------------------------------------
# Canonical slot lookup — element → canonical_slot via `slots` table
# (D99 2026-05-29: was slot_synonyms; now slots WHERE scope='element')
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def _slot_synonyms() -> dict[str, str]:
    """Return {alias_or_canonical: canonical_slot} for element-scope slots.

    D99: queries `slots WHERE scope='element'` (was slot_synonyms).
    Includes self-mappings so canonical names resolve to themselves.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, aliases FROM slots WHERE scope='element'"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, str] = {}
    for canonical, aliases_json in rows:
        out[canonical] = canonical
        if aliases_json:
            import json
            try:
                for alias in json.loads(aliases_json):
                    out[alias] = canonical
            except (ValueError, TypeError):
                pass
    return out


@functools.lru_cache(maxsize=1)
def _slot_to_standalone_block() -> dict[str, str]:
    """Return {canonical_slot: standalone_block_slug} for element-scope slots.

    Source of truth for "this element-name routes to that block when the parent
    block doesn't claim the slot". D99: queries `slots WHERE scope='element'`
    (was slot_synonyms.standalone_block).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, standalone_block FROM slots "
            "WHERE scope='element' AND standalone_block IS NOT NULL AND standalone_block != ''"
        ).fetchall()
    finally:
        conn.close()
    return {c: b for c, b in rows}


def standalone_block_for(canonical_slot: str) -> str | None:
    """Return the standalone block slug for a canonical slot, or None.

    e.g. 'label' → 'sgs/label', 'badge' → 'sgs/label', 'card' → 'sgs/info-box'.

    Cross-checks that the resolved slug is actually built/registered (status='built'
    in the blocks table). If the DB row points at a planned/stub slug the converter
    would emit it and WP would throw a block-validation error. In that case we
    return None and fall back to sgs/container (the converter's correct fallback
    for unbuilt blocks — see registered_block_slugs() docstring).
    """
    import sys as _sys
    result = _slot_to_standalone_block().get(canonical_slot)
    if result is None:
        if canonical_slot:
            _trace("db_lookup_miss", lookup="standalone_block_for",
                   canonical_slot=canonical_slot)
        return None
    if result not in registered_block_slugs():
        print(
            f"[db_lookup] WARNING: standalone_block_for('{canonical_slot}') resolved to "
            f"'{result}' which is NOT in registered_block_slugs() (status != 'built'). "
            "Returning None — converter will fall back to sgs/container.",
            file=_sys.stderr,
        )
        return None
    return result


def _normalise(token: str) -> str:
    """Strip hyphens/underscores and lowercase. So 'max-width' == 'maxWidth' == 'max_width'.
    Per Bean's note 2026-05-14: multi-word attrs should auto-handle hyphen variants."""
    return re.sub(r"[-_]", "", token).lower()


def canonical_slot_for(token: str) -> str | None:
    """Resolve 'eyebrow' → 'label', 'description' → 'text', 'pack-size' → 'packSize'.
    Hyphen-insensitive, case-insensitive."""
    if not token:
        return None
    syn = _slot_synonyms()
    if token in syn:
        return syn[token]
    if token.lower() in syn:
        return syn[token.lower()]
    # Normalised match: max-width == maxWidth
    norm_target = _normalise(token)
    for key, val in syn.items():
        if _normalise(key) == norm_target:
            return val
    _trace("db_lookup_miss", lookup="canonical_slot_for", token=token)
    return None


def attr_name_for_slot_or_alias(block_slug: str, slot_or_alias: str) -> str | None:
    """Find the attr on `block_slug` whose canonical_slot OR attr_name itself
    matches `slot_or_alias` (hyphen/case-normalised). Returns the attr_name.

    e.g. attr_name_for_slot_or_alias('sgs/product-card', 'image') → 'image'
    e.g. attr_name_for_slot_or_alias('sgs/product-card', 'pack-sizes') → 'packSizes'
    e.g. attr_name_for_slot_or_alias('sgs/product-card', 'media') → 'image' (if canonical_slot='media' set)
    """
    norm_target = _normalise(slot_or_alias)
    # First pass: exact canonical_slot match
    for name, info in block_attrs(block_slug).items():
        cs = info.get("canonical_slot")
        if cs and (_normalise(cs) == norm_target or _normalise(name) == norm_target):
            return name
    # Second pass: by attr_name only (normalised)
    for name in block_attrs(block_slug):
        if _normalise(name) == norm_target:
            return name
    # Third pass: try the canonical of the input (e.g. 'eyebrow' → 'label')
    canonical = canonical_slot_for(slot_or_alias)
    if canonical and _normalise(canonical) != norm_target:
        for name, info in block_attrs(block_slug).items():
            if info.get("canonical_slot") and _normalise(info["canonical_slot"]) == _normalise(canonical):
                return name
            if _normalise(name) == _normalise(canonical):
                return name
    return None


def html_tag_for_slot(canonical_slot: str) -> str | None:
    """Return None — html_semantic_tag column retired in D99 (2026-05-29).

    slot_synonyms.html_semantic_tag was low-value (only 27/89 rows populated)
    and was NOT consulted by atomic_tag_map() (see that function's docstring
    for the rationale). The column is not present in the unified `slots` table.

    Callers should route via atomic_tag_map() for html-canonical tag→block
    resolution instead of per-slot html_semantic_tag hints.
    """
    return None


# ----------------------------------------------------------------------------
# Modifier handling
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def _canonical_modifiers() -> dict[str, str]:
    """Return {modifier_lowercase: kind}. e.g. 'primary' → 'variant', 'hover' → 'state'."""
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute("SELECT suffix, kind FROM modifier_suffixes").fetchall()
    finally:
        conn.close()
    return {s.lower(): k for s, k in rows}


def modifier_kind(modifier: str) -> str | None:
    """e.g. 'primary' → 'variant', 'hover' → 'state', 'trial' → None (not canonical)."""
    return _canonical_modifiers().get(modifier.lower())


# ----------------------------------------------------------------------------
# Block attribute introspection — which attrs does a block have, and which slots?
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=256)
def block_attrs(block_slug: str) -> dict[str, dict]:
    """Return {attr_name: {role, canonical_slot, attr_type, derived_selector}} for a block.

    `derived_selector` (added 2026-06-11 for the universal scalar-lift,
    _lift_scalar_attrs_by_selector) is the BEM class selector for the draft
    element this attr extracts from (e.g. '.sgs-testimonial__text'). NULL for
    attrs with no draft element. Consumed by FR-31-2 / FR-31-5 D1 selector-lift.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name, attr_type, role, canonical_slot, derived_selector "
            "FROM block_attributes WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()
    result = {
        name: {"attr_type": t, "role": role, "canonical_slot": cs, "derived_selector": ds}
        for name, t, role, cs, ds in rows
    }
    if not result:
        _trace("db_lookup_miss", lookup="block_attrs", block_slug=block_slug)
    return result


@functools.lru_cache(maxsize=1024)
def link_template_for(block_slug: str, attr_name: str) -> "str | None":
    """Return the URL TEMPLATE the block's render.php assembles around this
    attr's value (e.g. ``'https://wa.me/{value}'``), or None.

    Stored on ``block_attributes.output_signature`` under the ``link_template``
    key — NOT a column of its own (Bean, 2026-08-05): ``output_signature`` is
    already the structured record of what render.php does with a value, and a
    URL template is exactly that. Written by the behavioural analyser
    (``scripts/behavioural-analyser/extract-signatures.py``
    ``_detect_link_template``, commit ``580f7885``).

    SOLE CONSUMER: the ``link-content`` role — ``field_extractors``
    ``extract_link_fragment`` needs the template to subtract the block's own
    literal from the draft's rendered href. Returns None for every attr with no
    captured template, which makes the role a strict no-op rather than a guess.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT output_signature FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()
    if not row or not row[0]:
        return None
    try:
        signature = json.loads(row[0])
    except (ValueError, TypeError):
        return None
    if not isinstance(signature, dict):
        return None
    template = signature.get("link_template")
    return template if isinstance(template, str) and template else None


@functools.lru_cache(maxsize=1024)
def box_family_for(block_slug: str, attr_name: str) -> "str | None":
    """Return the ``box_family`` (e.g. ``'padding'``, ``'contentBandPadding'``)
    for a merged box-object attr, or ``None`` when the attr has no box_family
    (a scalar attr, or an attr that doesn't exist for this block).

    Box-object interface contract (`.claude/plans/2026-07-09-box-object-
    interface-contract.md` §3): the sole legitimate gate for whether a
    responsive-tier CSS write should ACCUMULATE into a merged object attr
    (``paddingTablet: {"top": ..., ...}``) rather than fall back to a flat
    per-side attr. Callers MUST branch on this return value, never on the
    attr NAME (regex/suffix matching) — that is exactly the collision the
    AST gate (§6) forbids.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT box_family FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    return row[0] or None


@functools.lru_cache(maxsize=1024)
def tier_object_base(block_slug: str, attr_name: str) -> bool:
    """True iff ``attr_name`` is a TIER-SHAPED object attr on this block.

    The TIER shape is ``{desktop, tablet, mobile}`` (Spec 35 Phase 1.4, Bean
    2026-08-10) — the successor to the legacy FLAT TIER SIBLINGS model
    (``fontSize`` + ``fontSizeTablet`` + ``fontSizeMobile``). When this returns
    True the caller MUST accumulate its per-tier writes into ONE object attr
    rather than re-appending a tier suffix, because the suffixed sibling no
    longer exists and ``services.validate`` would gap the write silently.

    Sibling of ``box_family_for`` and gated the same way — on DB columns, never
    on the attr NAME (R-31-1). The two shapes are INDEPENDENT axes and mutually
    exclusive at the storage layer: BOX is a CLOSED, named set
    (padding/margin/borderWidth/borderRadius + prefixed variants, carried by the
    ``box_family`` column); anything else object-typed is a TIER.

    Four conditions, each earning its place against a measured false positive:
      1. ``attr_type='object'``      — a scalar attr keeps the flat model.
      2. ``box_family IS NULL``      — a BOX attr accumulates by SIDE, not tier.
      3. the name is not itself a tier sibling — ``backgroundImageMobile`` is
         object-typed with no box_family, so conditions 1-2 alone classify it as
         a tier BASE and a caller would write ``{mobile: ...}`` INTO the mobile
         sibling. It is an asset sibling, not a base.
      4. no ``<attr>Tablet``/``<attr>Mobile`` sibling is declared — a block that
         still declares the flat siblings still uses the flat model, and the
         suffixed write is correct there. This is what keeps the 307 surviving
         flat-sibling attrs working unchanged.

    Verified against positive controls (sgs/heading.fontSize, sgs/text.fontSize
    and .lineHeight, sgs/container.gridTemplateColumns/.columns/.gap) and
    negative controls (sgs/hero.backgroundImage and .backgroundImageMobile,
    sgs/text.borderWidth, sgs/heading.fontSizeUnit and .lineHeight — the last
    being ``number`` on heading while ``object`` on text, which is exactly why
    this must be resolved per (block, attr) and never by name).
    """
    if _TIER_SIBLING_SUFFIX_RE.search(attr_name):
        return False
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT attr_type, box_family FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
        if not row or row[0] != "object" or row[1]:
            return False
        siblings = conn.execute(
            "SELECT 1 FROM block_attributes "
            "WHERE block_slug = ? AND attr_name IN (?, ?) LIMIT 1",
            (block_slug, attr_name + "Tablet", attr_name + "Mobile"),
        ).fetchone()
    finally:
        conn.close()
    return siblings is None


@functools.lru_cache(maxsize=1024)
def content_order_attr_for(block_slug: str) -> "str | None":
    """The block's MEDIA/CONTENT area-order tier-object attr, or None.

    A 2-region split composite (hero-shaped) declares ``grid-template-areas``
    on its own root — a PRE-LAYER GRID concern (dispatch_table.py
    ``_GRID_LAYOUT_PROPS``) — that swaps row/column order between device
    tiers (e.g. mobile: media above content; desktop: content beside media).
    That swap is a semantically DIFFERENT destination from
    ``grid-template-columns``/``grid-template-rows``: it stores which region
    reads first, not a track template.

    DB-driven (R-31-1 — no per-block name literal): a block is eligible ONLY
    when BOTH hold —
      1. it declares GRID_AREA-layer attrs for BOTH a ``media`` and a
         ``content`` ``css_element`` (the area-name vocabulary this block's
         own schema already uses for its two split regions, e.g.
         ``mediaBackground``/``contentBackground``); AND
      2. it declares exactly one ``object``-typed attr whose
         ``default_value`` JSON contains the literal enum member
         ``"media-first"`` — the destination the order swap writes into.
    Two or more candidate attrs → treated as none (ambiguous, honest gap
    upstream) rather than a silent rowid pick, matching
    ``attr_for_area_property``'s ambiguity discipline.

    ⚠ Condition 2 keys on ``default_value`` (a schema DEFAULT), not a
    declared enum column — there is no ``enum_values`` row for
    ``splitContentOrder`` to key on instead (verified: NULL in
    ``block_attributes`` at the time this was written). This is fragile if
    a block's default ever changes shape (e.g. normalises to ``{}``) —
    if this stops matching, re-point to the block's declared enum
    (``enum_values`` on the attr, or its block.json ``enum``) rather than
    silently deleting the eligibility check or the premise test that
    pins it (``test_premise_hero_resolves_to_split_content_order``).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        area_rows = conn.execute(
            "SELECT DISTINCT css_element FROM block_attributes "
            "WHERE block_slug = ? AND css_layer = 'GRID_AREA' "
            "AND css_element IN ('media', 'content')",
            (block_slug,),
        ).fetchall()
        area_tokens = {r[0] for r in area_rows}
        if not {"media", "content"} <= area_tokens:
            return None

        candidates = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND attr_type = 'object' "
            "AND default_value LIKE '%\"media-first\"%'",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()

    if len(candidates) != 1:
        return None
    return candidates[0][0]


@functools.lru_cache(maxsize=1024)
def attr_is_boolean(block_slug: str, attr_name: str) -> bool:
    """True iff the block declares ``attr_name`` with ``attr_type='boolean'``.

    Mirrors ``services.validate.attr_is_number`` / ``attr_is_colour_role``: the
    type-family comparison lives INSIDE the SQL WHERE clause (a string, not a
    Python ``==``) specifically so ``gates/no_slug_literal.py`` — which taints
    any local derived from an expression touching ``ctx.block_slug`` and flags
    a subsequent literal comparison in resolver/service bodies — never sees a
    Python ``attr_type == 'boolean'`` Compare node outside this module. Callers
    (e.g. ``services.state_value_lift._coerce_for_attr_type``) branch on the
    boolean return, never on a type-name string.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT 1 FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ? AND attr_type = 'boolean'",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()
    return row is not None


@functools.lru_cache(maxsize=1024)
def attr_is_colour_role(block_slug: str, attr_name: str) -> bool:
    """True iff the block's attr is DB-classified ``role='color'``.

    D307: the sole legitimate gate for whether an OUTER/CONTENT-layer
    resolver should route a value through colour serialisation
    (``extract_token_or_hex`` — token slug / hex / rgb() literal / named-
    colour-to-hex) rather than the generic string/numeric branches. The
    comparison against the literal ``'color'`` lives HERE (inside the SQL
    WHERE clause, a string, not a Python ``==``) rather than in a resolver
    body specifically so the ``gates/no_slug_literal.py`` AST gate — which
    taints any local derived from an expression touching ``ctx.block_slug``
    and flags a subsequent literal comparison — never sees a
    ``role == "color"`` Compare node in ``resolvers/`` or ``services/``
    (out of the gate's scan scope, same reasoning as ``attr_is_number`` in
    ``services/validate.py`` doing its type check inside SQL). Callers
    branch on the boolean return, never on the attr NAME (regex/suffix) —
    the same discipline ``box_family_for`` already enforces.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT 1 FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ? AND role = 'color'",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()
    return row is not None


@functools.lru_cache(maxsize=256)
def tag_identity_attrs(block_slug: str) -> "dict[str, frozenset[str] | None]":
    """Return {attr_name: allowed_tag_values} for the block's tag-identity attrs.

    A tag-identity attr (role='tag-identity', declared via the sanctioned
    ATTR_CLASSIFICATION_OVERRIDES channel, FR-31-2.1a) stores the source
    element's HTML TAG as its value (sgs/heading.level h1..h6,
    sgs/media.mediaType video/svg). R-31-2: tag is SHAPE — recognition picked
    the block; this preserves the shape fact the tag carries (heading level,
    media kind) instead of discarding it (the CG-2 zero-h1 defect). The
    enum_values list is the write gate: a node tag outside the enum writes
    nothing (an <img> is not in mediaType's enum — the block default stands).
    Explicit role gate, NEVER bare enum-contains (hero.variant contains
    'video', quote.attributionTag contains 'div' — R-31-9 over-broad).

    A declared attr's enum can take THREE shapes (all must work — different
    blocks/migration states carry different ones at the same time, e.g. the
    string-tag shape being rolled out is not required to land before this
    reads correctly): enum values are HTML tag strings (``["h1",...,"h6"]``,
    sgs/heading.level — the canonical shape), enum values are numeric levels
    (``[2,3,4]``, a legacy shape still live on some blocks), or the attr
    declares no enum at all (``enum_values IS NULL`` — a free-form
    tag-identity attr with no declared restriction). A dict VALUE of ``None``
    is the "no enum declared" sentinel (write the node tag unconditionally);
    a ``frozenset[str]`` is the declared allow-list, string-cast exactly as
    stored (matching/writing is shape-normalised by ``tag_identity_match``,
    not here — this accessor stays a faithful read of the DB row). Malformed
    or empty enum JSON is dropped from the result (never matches), same as
    before this fix — only a genuine SQL NULL earns the None sentinel.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name, enum_values FROM block_attributes "
            "WHERE block_slug = ? AND role = 'tag-identity'",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, "frozenset[str] | None"] = {}
    for name, raw in rows:
        if raw is None:
            out[name] = None
            continue
        try:
            vals = json.loads(raw) if raw.strip().startswith("[") else []
        except (ValueError, TypeError):
            vals = []
        allowed = frozenset(str(v) for v in vals if v is not None)
        if allowed:
            out[name] = allowed
    return out


def _canonical_tag_token(value: object) -> str:
    """Normalise a tag-identity token to a shape-agnostic comparable form.

    Heading levels compare equal regardless of which of the three enum
    shapes carried them: the integer level ``3``, the numeric string
    ``"3"``, and the HTML tag string ``"h3"`` all normalise to ``"h3"``.
    Every other token (``"p"``, ``"image"``, ``"video"``, ``"svg"``, a
    literal node tag like ``"div"``) normalises to its own lowercased
    string form and nothing else — ``"p"`` is a legitimate non-heading
    tag-identity value (FR-31-2.1a) and must never collide with a heading
    canonical form in either direction.
    """
    s = str(value).strip().lower()
    if s.isdigit() and 1 <= int(s) <= 6:
        return f"h{s}"
    if len(s) == 2 and s[0] == "h" and s[1].isdigit() and 1 <= int(s[1]) <= 6:
        return s
    return s


def _tag_identity_write_value(member: str) -> "str | int":
    """Cast a matched enum member back to the JSON type it was likely stored as.

    ``tag_identity_attrs`` string-casts every enum member for comparison
    (``json.loads`` gives ints for a numeric enum like ``[2,3,4]``, but the
    frozenset holds ``"2"``/``"3"``/``"4"``). A purely-numeric member is
    written back as an ``int`` so it round-trips through the block's own
    numeric attribute type (the legacy shape); anything else is written
    back as the string it already is (``"h3"``, ``"p"``, ``"image"``...).
    Generic on the member's own textual shape — no per-block table.
    """
    return int(member) if member.isdigit() else member


def tag_identity_match(node_tag: str, allowed: "frozenset[str] | None") -> "str | int | None":
    """Return the value assembly step 3a2 should write for ``node_tag``, or None.

    ``allowed=None`` is the "no enum declared" sentinel from
    ``tag_identity_attrs`` — the attr accepts any tag unconditionally, so
    the raw node tag is written verbatim (this is the shape that must not
    be silently excluded: an attr with no enum yet is still a genuine
    tag-identity declaration). Otherwise ``node_tag`` and every member of
    ``allowed`` are compared via their CANONICAL form (``_canonical_tag_token``),
    so a numeric-enum member and a string-tag member both recognise the
    same heading level regardless of which shape the block's enum carries;
    the ORIGINAL matched member is cast back to its likely JSON type
    (``_tag_identity_write_value``) so the write matches the block's own
    attribute type. Returns ``None`` when nothing matches — the caller
    must not write (the block's own default stands), so a genuinely
    out-of-range or out-of-enum tag is correctly rejected, not coerced.
    """
    if allowed is None:
        return node_tag
    canonical_node = _canonical_tag_token(node_tag)
    for member in allowed:
        if _canonical_tag_token(member) == canonical_node:
            return _tag_identity_write_value(member)
    return None


@functools.lru_cache(maxsize=512)
def _get_block_root_element(block_slug: str) -> "str | None":
    """Read the element marked `isWrapper: true` from a block's block.json.

    Returns the element key (e.g. 'frame' for sgs/before-after, 'media' for
    sgs/media) if the block declares an isWrapper element, or None if not
    found or if the block.json is inaccessible.

    Used by the root-domain element guard in declared_attrs_for_css_property
    and _base_domain_attrs_for_css_property to recognise each block's own
    declared root element name (Task 1 2026-08-27), rather than checking
    against a hardcoded list ('', 'root', 'self', 'wrapper'). This allows
    blocks with custom-named wrappers (e.g. before-after's 'frame') to be
    correctly gated as root-domain elements.

    Defensive: if block.json is missing or unparseable, returns None (the
    block's root element is not discoverable locally; the hardcoded list
    fallback in the guard will still apply, ensuring no silent regressions).
    Cached for performance (up to 512 blocks per session).
    """
    # Locate the block's block.json by block_slug (e.g. 'sgs/before-after'
    # → 'before-after'). The block.json files are at:
    # plugins/sgs-blocks/src/blocks/<block-name>/block.json
    # This file is at: plugins/sgs-blocks/scripts/converter/db/db_lookup.py
    # So we need to go up 4 levels to plugins/sgs-blocks, then into src/blocks.
    if not block_slug or "/" not in block_slug:
        return None
    block_name = block_slug.split("/", 1)[1]  # 'sgs/before-after' → 'before-after'
    # Navigate: db_lookup.py -> db -> converter -> scripts -> sgs-blocks -> src/blocks
    block_json_path = (
        Path(__file__).parent.parent.parent.parent / "src" / "blocks" / block_name / "block.json"
    )
    if not block_json_path.exists():
        return None
    try:
        data = json.loads(block_json_path.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError):
        return None
    elements = ((data.get("supports") or {}).get("sgs") or {}).get("elements")
    if not isinstance(elements, dict):
        return None
    # Return the first element marked with isWrapper: true.
    for elem_name, elem_data in elements.items():
        if isinstance(elem_data, dict) and elem_data.get("isWrapper") is True:
            return elem_name
    return None


def _get_block_root_selector(block_slug: str) -> str:
    """The block's own root/wrapper CSS selector, per the standard WordPress
    block class-name convention (mirrors core's ``get_block_default_classname``):
    ``.wp-block-`` + the slug with ``/`` replaced by ``-``. E.g.
    ``sgs/before-after`` -> ``.wp-block-sgs-before-after``.

    Pure string derivation — no block.json read, no DB query. Used ONLY to
    disambiguate a block's CUSTOM ``isWrapper`` element name (e.g.
    before-after's 'frame', media's 'media') from a same-named CHILD attr that
    merely shares that string as its own ``css_element`` label (see
    ``_root_domain_element_clause``).
    """
    return ".wp-block-" + block_slug.replace("/", "-")


# The GENERIC root-domain element names — conventions any block's own root/
# wrapper attr may carry REGARDLESS of what its block.json calls its isWrapper
# element. No selector restriction applies to this route: a genuine root attr
# may legitimately carry its OWN scoped BEM-shaped derived_selector (e.g.
# sgs/container.maxWidth -> '.sgs-container__max') without that making it a
# child attr — see _root_domain_element_clause's docstring.
_OUTER_ROOT_ELEMENTS = ("", "root", "self", "wrapper")


def _root_domain_element_clause(
    block_slug: str, column: str = "css_element",
) -> "tuple[str, list]":
    """Build the SQL clause + ordered params for "is this attribute's
    css_element within the block's root/self domain" — the guard shared by
    ``declared_attrs_for_css_property``'s OUTER branch and
    ``_base_domain_attrs_for_css_property``'s OUTER arm (Task 1, 2026-08-27
    re-fix, replacing the broken v1 attempt in commit ca99f6aee).

    Root-domain membership has two independent routes, and it is critical
    they are NOT conflated (v1's bug was applying route 2's selector
    restriction to route 1's rows too):

      1. GENERIC — ``css_element`` is NULL/''/root/self/wrapper (the common
         convention). NO selector restriction: e.g. sgs/container.maxWidth
         (css_element='wrapper') carries derived_selector='.sgs-container__max'
         — a BEM-shaped selector, but still root, because it's the block's OWN
         scoped modifier selector, not a reference to a child DOM node.

      2. CUSTOM ISWRAPPER NAME — the block declares some OTHER name as its
         isWrapper element in block.json (e.g. before-after's 'frame', media's
         'media') and THIS row's css_element equals that name. Because the
         same custom name can ALSO be used for a genuinely CHILD-scoped attr
         that merely happens to share the block's isWrapper string
         (sgs/media.boxShadowColour's css_element is 'media' but its
         derived_selector is '.sgs-media__img, .sgs-media__video' — two actual
         child nodes, not the block's root), this route additionally requires
         the row's derived_selector to be empty/NULL (no override -> defaults
         to root) OR to equal the block's own root CSS selector VERBATIM
         (``_get_block_root_selector`` — e.g. '.wp-block-sgs-before-after').

    v1's bug: it tried to tell these apart with
    ``derived_selector NOT LIKE '%.%__%'``. Two independent defects: (a) SQL
    LIKE's bare ``_`` is a single-character WILDCARD, not a literal
    underscore, so the pattern doesn't mean what it looks like it means; (b)
    even correctly escaped, "contains a literal __" is not a reliable
    root-vs-child discriminator at all — route 1 above is full of genuinely
    root attrs whose OWN scoped selector contains '__'. Selector IDENTITY with
    the block's real root selector is the only reliable signal, and it only
    ever needs to gate route 2 (route 1 rows are already root by construction
    of their generic css_element value).
    """
    params: list = [*_OUTER_ROOT_ELEMENTS]
    generic_placeholders = ",".join("?" for _ in _OUTER_ROOT_ELEMENTS)
    clause = f"({column} IS NULL OR {column} IN ({generic_placeholders}))"

    block_root = _get_block_root_element(block_slug)
    if block_root and block_root not in _OUTER_ROOT_ELEMENTS:
        root_selector = _get_block_root_selector(block_slug)
        clause += (
            f" OR ({column} = ? AND (derived_selector IS NULL OR derived_selector = '' "
            "OR derived_selector = ?))"
        )
        params.extend([block_root, root_selector])
    return clause, params


@functools.lru_cache(maxsize=4096)
def declared_attrs_for_css_property(
    block_slug: str,
    css_property: str,
    css_layer: "str | None" = None,
    base_only: bool = False,
) -> "tuple[str, ...]":
    """Column-first declarative CSS-property → attr lookup (Spec 31 FR-31-5.2/5.3).

    Returns the ordered tuple of attr names the block DECLARES for ``css_property``
    (optionally constrained to ``css_layer``) via the ``block_attributes.css_property``
    / ``css_layer`` columns — the DECLARATIVE replacement for name-guessing that
    strands mismatched attrs (``colourBorder`` never ``endswith`` the ``BorderColour``
    suffix). Empty tuple when the block declares no override for this property.

    Semantics (the council must-fixes, D281):
      * ``css_property IS NULL`` on an attr means "not corrected" — it never enters
        this path; only a non-NULL ``css_property`` declaration matches. NULL is NOT
        overloaded with OUTER/self.
      * ``css_layer=None`` → layer-agnostic (any layer), for ``attr_for_property`` /
        ``_css_prop_maps_to_typed_attr`` (their contract is first-by-rowid).
      * ``css_layer='OUTER'`` → an explicit OUTER tag OR a NULL (self/OUTER-
        default) layer, BOTH restricted to a root-domain css_element (the
        layer name itself means "the block's own root/outer box" — an
        explicit OUTER tag on a named child element is a data error, not a
        legitimate case).
      * ``css_layer='CONTENT'|'GRID'|'GRID_AREA'`` → an explicit tag for
        that layer (ANY css_element — these layers legitimately own
        non-root child elements when explicitly declared) OR a NULL
        (self/OUTER-default) layer RESTRICTED to a root-domain css_element
        (D873, 2026-08-27 — the NULL-fallback guard was OUTER-only before
        this fix, so a NULL-layer child-scoped attr like sgs/product-card's
        ctaBorderWidth [css_element='cta'] leaked into a CONTENT-layer
        probe for the same css_property ahead of the block's genuine
        OUTER-tagged root border). Used by ``attr_for_layer_property``.
      * ``ORDER BY rowid`` preserves determinism, matching the suffix fallback.
      * Callers decide the ambiguity policy on a ≥2 result (the layer resolver
        raises ``AmbiguousLayerAttrError``; the first-wins resolvers take [0]).

    Defensive: the columns are DERIVED (seeded by ``/sgs-update`` from
    ATTR_CLASSIFICATION_OVERRIDES). On a pre-seed DB the columns may not exist —
    an ``OperationalError`` is swallowed and treated as "no declaration", so the
    caller falls back to today's suffix resolver UNCHANGED (parity-neutral by
    construction: the ~650 undeclared attrs never enter this path).
    """
    if not block_slug or not css_property:
        return ()
    # base_only (Front 1, 2026-07-22): restrict to the BASE (unsuffixed/desktop) tier
    # and base state, so a responsive/state resolver gets the single base attr rather
    # than its mobile/tablet/hover siblings (which the breakpoint / state re-append
    # handle separately, Spec 31 §3.A step 4/4a). The base attr carries css_tier NULL
    # or 'desktop' (FR-31-5.2). This is what stops the layer resolver raising a spurious
    # AmbiguousLayerAttrError on e.g. (sgs/media, OUTER, order) → [order,orderMobile,
    # orderTablet]. Element is NOT excluded here — the layer resolver's CONTENT/GRID
    # layers legitimately own non-root elements; element narrowing lives in
    # _base_domain_attrs_for_css_property (the attr_for_property OUTER path) only.
    #
    # CORRECT-BY-DESIGN NULL (Track C root-cause, 2026-08-04, do NOT "fix"): because
    # this function derives a tier sibling's css_property from its BASE row at READ
    # TIME, the sibling's OWN css_property/css_tier columns are deliberately never
    # populated — a Mobile/Tablet-suffixed attr row correctly carries css_property IS
    # NULL and css_tier IS NULL. Measured 2026-08-04: 145 of 238 sgs/% tier-suffixed
    # rows whose base has css_property populated show this NULL pair; that is the
    # exact expected count, not a defect count. Denominator chain: 2,464 sgs/%
    # block_attributes rows -> 554 tier-suffixed -> 339 with a matching base row ->
    # 238 with a populated base css_property -> 145 NULL-on-sibling (61%, all correct).
    # A future session "fixing" these 145 by writing css_property/css_tier onto the
    # sibling row would be redundant at best and a fresh source of drift at worst —
    # see .claude/reports/2026-08-04-trackC-tier-sibling-rows-root-cause.md.
    _base_clause = (
        " AND (css_tier IS NULL OR css_tier = 'desktop') AND css_state IS NULL"
        if base_only else ""
    )
    conn = sqlite3.connect(SGS_DB)
    try:
        if css_layer is None:
            rows = conn.execute(
                "SELECT attr_name FROM block_attributes "
                "WHERE block_slug = ? AND css_property = ? "
                + _base_clause +
                " ORDER BY rowid",
                (block_slug, css_property),
            ).fetchall()
        else:
            # NULL-layer element guard (2026-07-24, FR-31-22 cardPadding fix;
            # 2026-08-27 Task 1, re-fixed same day per the reviewed v1 attempt
            # in commit ca99f6aee; 2026-08-27 Task D873, generalised from
            # OUTER-only to EVERY layer). A NULL css_layer row is treated as
            # "self/OUTER-default" (docstring above) — an attr the classifier
            # never explicitly tagged a layer for. That is only a safe
            # fallback match when the attr's OWN css_element is ALSO
            # root-domain, per ``_root_domain_element_clause`` (shared
            # verbatim with ``_base_domain_attrs_for_css_property``'s
            # identical OUTER arm — do NOT hand-roll a second copy of this
            # predicate here). Without this, a genuine LEAF sub-element attr
            # sharing the same css_property with its css_layer left NULL
            # (the leaf guard's documented, intentional value — e.g.
            # sgs/product-card's css_element='cta' ctaPadding/ctaBorderWidth/
            # ctaBorderStyle/ctaColourBorder, routed entirely by the separate
            # attr_for_area_property cross-node fold, which matches on
            # css_element alone and never reads css_layer) is WRONGLY ALSO
            # visible to a query for the SAME css_property on the block's
            # real root attr.
            #
            # D873 (2026-08-27): this restriction previously applied ONLY to
            # OUTER, so a CONTENT/GRID query's NULL-fallback branch matched
            # ANY css_element unconditionally. sgs/product-card's
            # ctaBorderWidth/ctaBorderStyle/ctaColourBorder (css_element=
            # 'cta', css_layer=NULL) leaked into a CONTENT-layer
            # border-width/style/color probe ahead of the correctly
            # OUTER-tagged card border (borderWidth/borderStyle/borderColour,
            # css_element='wrapper'), because content_band.py's
            # ``_layer_priorities()`` tries CONTENT before OUTER for
            # non-width/padding/gap-margin properties (border included) —
            # the leaked child attr won the race and the card's own border
            # never painted.
            #
            # The restriction's SHAPE differs by layer, and this split is
            # LOAD-BEARING (proven by test_root_modifier_element_guard.py's
            # synthetic fixtures, which fabricate a css_layer='OUTER' row on
            # a NAMED-CHILD css_element specifically to prove OUTER excludes
            # it even when EXPLICITLY tagged — an earlier version of this
            # fix applied the guard to the NULL branch only for every layer,
            # unifying the SQL shape, and that regressed those three tests):
            #
            #   * OUTER — root-domain is what the LAYER NAME MEANS: the
            #     block's own root/outer box. The restriction applies to
            #     BOTH branches of the OR (explicit ``css_layer='OUTER'``
            #     AND the NULL fallback) — an explicit OUTER tag on a named
            #     child element is a data error, not a legitimate case, and
            #     must still be excluded.
            #   * CONTENT / GRID — these layers legitimately own non-root
            #     child elements WHEN EXPLICITLY TAGGED (e.g. sgs/hero's
            #     contentWidth on css_element='content-band',
            #     sgs/mega-aside's asidePadding on css_element='wrapper'
            #     meaning ITS OWN wrapper not the block root,
            #     sgs/nav-drawer's drawerPadding on css_element='body') —
            #     the restriction applies ONLY to the NULL-fallback branch,
            #     per "NULL = self/OUTER-default" (docstring above): an
            #     UNTAGGED attr defaults toward being a root/self attr, so
            #     it should only surface via the fallback when it actually
            #     is root-domain. This is what closes the D873 leak without
            #     touching CONTENT/GRID's already-working explicit-tag path.
            _element_clause, _element_params = _root_domain_element_clause(block_slug)

            if css_layer == "OUTER":
                query_params = [block_slug, css_property, css_layer, *_element_params]
                _layer_or_clause = (
                    "(css_layer = ? OR css_layer IS NULL) AND (" + _element_clause + ")"
                )
            else:
                query_params = [block_slug, css_property, css_layer, *_element_params]
                _layer_or_clause = (
                    "(css_layer = ? OR (css_layer IS NULL AND (" + _element_clause + ")))"
                )

            rows = conn.execute(
                "SELECT attr_name FROM block_attributes "
                "WHERE block_slug = ? AND css_property = ? "
                "AND " + _layer_or_clause + " "
                + _base_clause +
                " ORDER BY rowid",
                query_params,
            ).fetchall()
    except sqlite3.OperationalError:
        # css_property/css_layer column absent (pre-seed DB) → no declaration.
        return ()
    finally:
        conn.close()
    return tuple(r[0] for r in rows)


class AmbiguousCssPropAttrError(RuntimeError):
    """Front 1 (Spec 31 §3.A step 2-4 / FR-31-2.8.4, P-CSSPROP-RUNTIME-RESOLVER-
    UNDER-KEYED): the column-first ``(block_slug, css_property)`` route matched ≥2
    registered attrs EVEN AFTER restricting to the base-resolver domain (root/self
    element + base/desktop tier + base state). A silent rowid-first pick between them
    is insert-order-fragile and misroutes CSS — fail loud instead (raise, never a
    guess; Bean-decided 2026-07-22, mirrors ``AmbiguousLayerAttrError`` / STOP-27).

    The base-resolver domain is proven collision-free against the current seeded data
    (0 residual), so this never fires today; it guards a future data change that
    introduces a genuine same-element/same-tier/same-state duplicate. Resolution: a
    ``css_element`` disambiguator on the routing unit, or removing the duplicate
    registration."""


# The set of css_element values the base OUTER/grid resolver treats as "the block's
# own root/self element" — the only elements attr_for_property routes for (per-child
# elements are served by styling_content.py's derived_selector path, NOT this one).
_BASE_ELEMENTS = ("", "root", "self")

# NOTE: the wider OUTER-layer root-domain set (_OUTER_ROOT_ELEMENTS) and the
# custom-isWrapper-name recognition it feeds into are defined once, earlier in
# this module, alongside _get_block_root_element/_get_block_root_selector and
# the shared ``_root_domain_element_clause`` helper both OUTER-layer guards in
# this file now call — see that helper's docstring for the full mechanism
# (Task 1, 2026-08-27, re-fixed same day per the reviewed v1 attempt in commit
# ca99f6aee). Do not re-declare a second copy of this constant here.


@functools.lru_cache(maxsize=4096)
def _base_domain_attrs_for_css_property(
    block_slug: str,
    css_property: str,
) -> "tuple[str, ...]":
    """Column-first attrs for (block, css_property) RESTRICTED to the base-resolver
    domain — Front 1 (P-CSSPROP-RUNTIME-RESOLVER-UNDER-KEYED, 2026-07-22).

    ``attr_for_property`` routes the block's OWN root/node CSS (via attr_resolve /
    grid). Its correct answer is the single BASE (unsuffixed / desktop) attr for the
    property; the mobile/tablet tier siblings are re-appended by the separate breakpoint
    mechanism (Spec 31 §3.A step 4), the ``:hover``/``:focus`` state siblings by step 4a,
    and the per-CHILD-element attrs (titleColour vs labelColour …) by styling_content.py
    keyed on each attr's own ``derived_selector``. So the base-resolver domain is:
      * an OWN-ROOT attr — EITHER css_element IN ('',root,self)/NULL, OR css_layer='OUTER'
        (the OUTER-LAYER union, D-2026-07-23): 57 of 59 isWrapper blocks name their root
        something other than root/self (`wrapper`/`box`/`grid`/`card`/`banner`…), so a
        wrapper attr like ``hero.minHeight`` (css_element='wrapper') was INVISIBLE to the
        element-only filter. Its now-seeded css_layer='OUTER' makes it visible by MEANING
        (the block's own outer box) rather than by the block's arbitrary element label.
        Collision-free on current data (26 wrapper attrs recovered, 0 new (block,property)
        ties — verified vs the css_state='hover' backfill that de-conflicted the quote
        box-shadow / testimonial colour Hover siblings). NAMED sub-element attrs stay OUT
        (they are NOT css_layer='OUTER' — a leaf/child element declares no container layer).
      * css_tier in {mobile, tablet} EXCLUDED (a responsive sibling — re-appended separately;
        the base/unsuffixed attr carries css_tier NULL or 'desktop' per FR-31-5.2),
      * css_state NOT NULL EXCLUDED (a state sibling — re-appended separately).

    Restricting to this domain collapses the raw column-first list (which the old
    2-arg ``declared_attrs_for_css_property`` returned in full, then blindly took [0]
    of — the mis-pick this fixes) to exactly one attr on the current data; ≥2 → the
    caller (``attr_for_property``) raises ``AmbiguousCssPropAttrError`` (fail loud).
    Defensive: the keyed columns are DERIVED (seeded by /sgs-update); an OperationalError
    on a pre-seed DB is swallowed → () → the caller falls back to the suffix loop UNCHANGED.
    """
    if not block_slug or not css_property:
        return ()
    conn = sqlite3.connect(SGS_DB)
    try:
        placeholders = ",".join("?" for _ in _BASE_ELEMENTS)

        # OUTER-layer element guard (2026-08-27, Task 1 / converter bug (b) fix,
        # re-fixed same day per the reviewed v1 attempt in commit ca99f6aee):
        # a css_layer='OUTER' row is admitted into the root/self domain ONLY when
        # its OWN css_element is ALSO root-domain, per
        # ``_root_domain_element_clause`` — shared verbatim with
        # ``declared_attrs_for_css_property``'s identical OUTER branch (do NOT
        # hand-roll a second copy of this predicate here). Before the original
        # 2026-08-27 fix the OR'd `css_layer = 'OUTER'` arm carried NO
        # css_element restriction at all, so a NAMED CHILD attr merely tagged
        # css_layer='OUTER' was wrongly treated as a root-domain match.
        # Verified live against the seeded DB (this module's connected
        # instance, not a synthetic fixture — see
        # test_root_modifier_element_guard.py for both the DB-dependent proof
        # and a schema-independent synthetic proof of the predicate itself):
        # sgs/hero.overlayGradient (css_element='overlay', background-image)
        # is wrongly admitted without this guard, correctly excluded with it.
        _element_clause, _element_params = _root_domain_element_clause(block_slug)
        rows = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND css_property = ? "
            f"AND ((css_element IS NULL OR css_element IN ({placeholders})) "
            f"OR (css_layer = 'OUTER' AND ({_element_clause}))) "
            "AND (css_tier IS NULL OR css_tier = 'desktop') "
            "AND css_state IS NULL "
            "ORDER BY rowid",
            (block_slug, css_property, *_BASE_ELEMENTS, *_element_params),
        ).fetchall()
    except sqlite3.OperationalError:
        # css_element/css_state/css_tier columns absent (pre-seed DB) → no declaration.
        return ()
    finally:
        conn.close()
    return tuple(r[0] for r in rows)


class AmbiguousStateAttrError(RuntimeError):
    """Spec 31 §3.A step 4a extension (2026-07-22, coupled UN-EXCLUDE + HOVER-LIFT):
    the direct (block, css_property, css_state) route matched ≥2 registered attrs.
    Mirrors ``AmbiguousCssPropAttrError`` — fail loud rather than a rowid-first guess.
    Resolution: a ``css_element`` disambiguator, or removing the duplicate row."""


@functools.lru_cache(maxsize=4096)
def attr_for_state_property(
    block_slug: str,
    css_property: str,
    state_suffix: str,
) -> "str | None":
    """Direct (block, css_property, css_state) -> attr NAME resolution for a
    hover-ONLY destination attr that has NO un-suffixed base sibling.

    Spec 31 §3.A step 4a (D309) assumes a base attr (e.g. ``backgroundColour``,
    css_property set, css_state NULL) exists, and its state companion (e.g.
    ``backgroundColourHover``) is a pure NAME-suffix derivation (base_attr + the
    StateSuffix) with NO ``css_property`` of its own -- ``tier_state_suffix``
    string-concatenates, never looks the companion up in the DB. That
    convention cannot represent an attr whose OWN name already carries the
    state (``scaleHover`` / ``grayscaleHover`` / ``imageZoomHover`` -- no bare
    ``scale``/``grayscale``/``imageZoom`` attr is ever registered, because the
    effect ONLY ever exists as a hover interaction, never a resting style).

    This is the sibling lookup for that shape: the attr's OWN row carries both
    ``css_property`` (e.g. ``'transform'``) AND ``css_state`` (the LOWERCASE
    state name, e.g. ``'hover'`` -- matching the pre-existing documentation
    convention already used on rows like ``sgs/brand-strip.backgroundColourHover``
    css_state='hover'). When a match is found, the returned attr name IS the
    final destination -- no further tier/state suffix append (D309 tier_state_
    suffix is for the OTHER shape). Callers try this FIRST when ``decl.state``
    is set; a ``None`` return means "no direct-state row" and the caller falls
    through to the ordinary ``attr_resolve`` + ``tier_state_suffix`` path
    UNCHANGED (parity-neutral for every existing base+Hover-companion pair,
    since those rows have ``css_property IS NULL`` and never match here).

    Restricted to the same root/self + base/desktop-tier domain as
    ``_base_domain_attrs_for_css_property`` (per-child-element attrs, e.g.
    ``sgs/post-grid.scaleHover`` css_element='card', are served by
    ``styling_content.py``'s derived_selector path, NOT this one).

    R-31-1: DB-only read path, no per-block slug literal. Raises
    ``AmbiguousStateAttrError`` on ≥2 matches (fail loud, never a guess).
    """
    if not block_slug or not css_property or not state_suffix:
        return None
    conn = sqlite3.connect(SGS_DB)
    try:
        placeholders = ",".join("?" for _ in _BASE_ELEMENTS)
        rows = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND css_property = ? AND css_state = ? "
            f"AND (css_element IS NULL OR css_element IN ({placeholders})) "
            "AND (css_tier IS NULL OR css_tier = 'desktop') "
            "ORDER BY rowid",
            (block_slug, css_property, state_suffix.lower(), *_BASE_ELEMENTS),
        ).fetchall()
    except sqlite3.OperationalError:
        # css_state/css_element/css_tier columns absent (pre-seed DB) -> no declaration.
        return None
    finally:
        conn.close()
    if len(rows) > 1:
        raise AmbiguousStateAttrError(
            f"attr_for_state_property({block_slug!r}, {css_property!r}, "
            f"{state_suffix!r}): {len(rows)} attrs match ({', '.join(r[0] for r in rows)}); "
            "add a css_element disambiguator or remove the duplicate registration."
        )
    if not rows:
        _trace("db_lookup_miss", lookup="attr_for_state_property",
               block_slug=block_slug, css_property=css_property, state_suffix=state_suffix)
        return None
    return rows[0][0]


class PerElementStateAttr(NamedTuple):
    """A hover/focus/active attr that lives on a NAMED CHILD element (not the
    block's own root/self), carrying its OWN css_property + css_state — the
    per-element sibling of the base-domain ``attr_for_state_property`` shape.

    E.g. ``sgs/post-grid.scaleHover`` (css_element='card') and the four
    ``imageZoomHover`` (css_element='image', on card-grid/gallery/team-member/
    post-grid): a ``:hover`` transform/filter on a child element that the base
    resolver's root/self domain (``_BASE_ELEMENTS``) deliberately excludes.
    """
    attr_name: str
    css_property: str
    css_element: str
    css_state: str
    attr_type: str
    derived_selector: "str | None"


def per_element_state_attrs(block_slug: str) -> "list[PerElementStateAttr]":
    """All of a block's state-carrying attrs whose ``css_element`` is a NAMED
    CHILD (i.e. NOT in ``_BASE_ELEMENTS`` and not NULL) — the domain the
    base-resolver ``attr_for_state_property`` explicitly does NOT route (Spec 31
    §3.A step 4a per-child extension; R-31-9 universal, no per-block branch).

    Returns every such attr regardless of ``css_property``; the CALLER
    (``styling_content.lift_per_element_state``) keeps this module free of the
    transform/filter value-grammar constant by filtering on whether a semantic
    parser exists for the property. An empty list is the universal no-op for
    every block that declares no per-child state attr.

    R-31-1: DB-only read path, no per-block slug literal. Defensive: an
    ``OperationalError`` on a pre-seed DB (css_state/css_element columns absent)
    → ``[]`` (no per-child state routing available yet).
    """
    if not block_slug:
        return []
    conn = sqlite3.connect(SGS_DB)
    try:
        placeholders = ",".join("?" for _ in _BASE_ELEMENTS)
        rows = conn.execute(
            "SELECT attr_name, css_property, css_element, css_state, "
            "COALESCE(attr_type, 'string'), derived_selector "
            "FROM block_attributes "
            "WHERE block_slug = ? "
            "AND css_state IS NOT NULL AND css_state != '' "
            "AND css_property IS NOT NULL AND css_property != '' "
            f"AND css_element IS NOT NULL AND css_element NOT IN ({placeholders}) "
            "ORDER BY rowid",
            (block_slug, *_BASE_ELEMENTS),
        ).fetchall()
    except sqlite3.OperationalError:
        return []
    finally:
        conn.close()
    return [PerElementStateAttr(*r) for r in rows]


@functools.lru_cache(maxsize=256)
# get_block_composition_role() DELETED 2026-08-02 (Phase 1b). Zero callers anywhere
# (repo-wide, two search shapes). It was a converter-side accessor for
# `block_composition.composition_role` that nothing ever called.
#
# ⛔ THE COLUMN ITSELF IS LIVE — DO NOT DELETE IT. `db-consistency/check_tier_composition.py`
# (Check #7, wired into `prebuild`) reads it to cross-check tier vs composition_role.
# Deleting the accessor is safe; deleting the column would break a running gate. The
# report that surfaced this scored the column "zero callers" from the converter's
# perspective, which was true and misleading — hence this note.
#
# ⚠ It is ALSO not duplicated by `content_select.py`'s wrapper-shell test, which looks
# superficially like the same classification. That one is per DOM NODE (does this node
# carry a BEM element class and have BEM descendants); the column is per BLOCK SLUG. A
# block legitimately contains nodes of several shapes, so they answer different
# questions. Do not "unify" them.


@functools.lru_cache(maxsize=256)
def get_container_kind(block_slug: str) -> str | None:
    """Return block_composition.container_kind for a block, or None.

    Values: 'section' | 'layout' | 'content' (populated 2026-06-02 D152 by
    /sgs-update from block.json supports.sgs.containerKind). Used by the modular
    converter's Stage-2 recognition (services.recognise_helpers._get_container_kind)
    to label a recognised block's container KIND and to tie-break multiple registered
    BEM root classes (prefer 'section' > 'layout' > 'content', design 2026-06-23-stage2
    §1 fold-L). Pure DB read; soft-fails to None on missing table/row/column.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/hero'.

    Returns:
        'section' | 'layout' | 'content', or None when the block has no row or the
        column is NULL.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT container_kind FROM block_composition WHERE block_slug = ?",
            (block_slug,),
        ).fetchone()
    except sqlite3.OperationalError:
        row = None
    finally:
        conn.close()
    if row and row[0]:
        _trace("db_lookup_hit", lookup="get_container_kind",
               block_slug=block_slug, container_kind=row[0])
        return row[0]
    _trace("db_lookup_miss", lookup="get_container_kind", block_slug=block_slug)
    return None


@functools.lru_cache(maxsize=1)
def container_default_slug() -> str | None:
    """Return the DB's canonical default-container slug (FR-31-4), DB-derived.

    FR-31-4 ("section base is always sgs/container"): a top-level class-section
    with no registered composite defaults to THE container block + recurses its
    children. This returns that container slug WITHOUT a block-slug literal
    (R-31-1 / the no_slug_literal contract) by deriving it from the DB as "the
    block that composites wrap" — every composite with a built-in wrapper carries
    `block_composition.wraps_block = <the container>` (the 31-block composite-mirror
    roster, FR-31-21.1). The most-wrapped `wraps_block` value IS the canonical
    container, name-free.

    Pure DB read; soft-fails to None on missing table/column (test/CI environments
    without the DB), so a caller can fall through to its own no-op — never a crash.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT wraps_block FROM block_composition "
            "WHERE wraps_block IS NOT NULL "
            "GROUP BY wraps_block ORDER BY COUNT(*) DESC LIMIT 1"
        ).fetchone()
    except sqlite3.OperationalError:
        row = None
    finally:
        conn.close()
    if row and row[0]:
        _trace("db_lookup_hit", lookup="container_default_slug", slug=row[0])
        return row[0]
    _trace("db_lookup_miss", lookup="container_default_slug")
    return None


# block_accepts_inner_blocks DELETED (post-programme QC, 2026-07-05): it read the
# block_composition.has_inner_blocks column DROPPED at Step 16 (migrations/
# 2026-07-05-drop-has-inner-blocks-column.py), so its OperationalError soft-fail
# made it permanently return True — broken for its stated purpose with zero live
# callers (STOP-48 consumer grep: only its own definition + one stale comment).
# The live block-level signal is services/has_inner.py::derive_delegates_content
# (source-derived); the per-attr signal is emit_shape_for below (FR-31-2.6).


def attr_for_slot(block_slug: str, canonical_slot: str) -> str | None:
    """Find the attr_name on `block_slug` whose canonical_slot matches.

    e.g. attr_for_slot('sgs/cta-section', 'heading') → 'headline' (or similar).
    Returns None if the block doesn't own that slot.
    """
    for name, info in block_attrs(block_slug).items():
        if info.get("canonical_slot") == canonical_slot:
            return name
    _trace("db_lookup_miss", lookup="attr_for_slot",
           block_slug=block_slug, canonical_slot=canonical_slot)
    return None


# ----------------------------------------------------------------------------
# Block supports — wp native supports flags (color/spacing/border/typography...)
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=256)
def block_supports_for(block_slug: str) -> dict:
    """Return the parsed WordPress `supports` map for a block, keyed by support_name.

    Reads sgs-framework.db `block_supports` (block_slug, support_name, support_value).
    Each support_value is parsed as JSON when it's an object/array, otherwise the
    literal string is returned. Used by the converter to gate which `style.*`
    properties may be emitted on the block when lifting block-root CSS.

    Example return for sgs/info-box:
        {
            "color":                 {"background": True, "text": True, "link": True},
            "typography":            {"fontSize": True, "lineHeight": True, ...},
            "spacing":               {"margin": True, "padding": True},
            "shadow":                True,
            "__experimentalBorder":  {"radius": True, "width": True, "color": True, "style": True},
            ...
        }
    """
    import json
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            # `is_stale` filter added 2026-08-02 (Phase 1b). The column existed and
            # NOTHING filtered on it, so a row marked stale would have been served as
            # live. Zero behavioural change today — `SELECT COUNT(*) … WHERE is_stale=1`
            # is 0 of 1354 — which is exactly why it is cheap to add now rather than
            # after something starts populating it. `IS NOT 1` (not `= 0`) so a NULL
            # from an older row is treated as live, never silently dropped.
            "SELECT support_name, support_value FROM block_supports "
            "WHERE block_slug = ? AND is_stale IS NOT 1",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()
    out: dict = {}
    for name, value in rows:
        if value is None:
            continue
        v = value.strip()
        # Parse JSON objects/arrays/bools/numbers — fall back to raw string
        if v.startswith(("{", "[")) or v in ("true", "false", "null") or (v and v[0].isdigit()):
            try:
                out[name] = json.loads(v)
                continue
            except (ValueError, TypeError):
                pass
        out[name] = v
    return out


# ----------------------------------------------------------------------------
# Block parent/child relationship — for InnerBlocks containers
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=256)
def parent_block_for(child_slug: str) -> str | None:
    """If `child_slug` has a registered parent, return it. e.g. sgs/button
    might have parent sgs/multi-button. Currently rows have parent_block=None
    for all — InnerBlocks relationships live in block.json."""
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT parent_block FROM blocks WHERE slug = ?", (child_slug,)
        ).fetchone()
    finally:
        conn.close()
    return row[0] if row and row[0] else None


# ----------------------------------------------------------------------------
# Block capabilities — DB-driven semantic tags per block
# ----------------------------------------------------------------------------
# Capability tags (e.g. 'icon-text', 'carousel', 'grid-layout', 'expandable')
# are stored in the `block_capabilities` table, seeded by
# `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py:CAPABILITY_RULES`.
# The pipeline consumes them via two helpers:
#   - capabilities_for(slug) — return all tags for a specific block
#   - blocks_with_capability(cap) — return all slugs that carry a tag
#
# The capability-aware TIEBREAKER is RETIRED (D278 QC, Bean-directed 2026-07-05).
# _CAPABILITY_PRIORITY (~40 hand-ordered capability names) + _capability_rank were
# deleted: a trace of EVERY recorded firing across all retained pipeline runs
# showed the genuine cross-block tie NEVER occurred — all recorded "ties" were
# the SAME slug twice (a bare class + its own --modifier class both parse to the
# same block), i.e. a missing dedupe, not ambiguity. Path 1 of
# `_resolve_slug_from_bem_tuple` now DEDUPES candidates; a residual tie between
# DISTINCT blocks is a draft-authoring ambiguity that goes LOUD (trace + no
# match → the node falls to the container-default/pass-through path, content
# preserved by recursion) for manual review — matching the section-level
# 2-registered-root precedent. FR-31-15 amended accordingly (Spec 31 §13.2).


@functools.lru_cache(maxsize=256)
def capabilities_for(block_slug: str) -> frozenset[str]:
    """Return the set of capability tags for `block_slug` from the DB.

    e.g. capabilities_for('sgs/accordion') → frozenset({'expandable', 'faq',
         'schema-faq', 'question-answer'})
    e.g. capabilities_for('sgs/unknown')  → frozenset()

    Queries `block_capabilities` table in sgs-framework.db. LRU-cached per slug.
    Safe to call per-node in the walker — the cache eliminates DB round-trips on
    repeated calls for the same slug within a section.

    R-31-1 compliance: no hardcoded slug→capability mapping in code. All data
    lives in the DB; this function is the single read path. The CAPABILITY_RULES
    dict in populate-db.py is one-time-seed data only.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/accordion'.

    Returns:
        frozenset of capability tag strings. Empty frozenset if the block has
        none or does not exist in the table.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        # kind='functional' is LOAD-BEARING (D528). block_capabilities also holds
        # kind='discovery' rows — each block's own block.json `keywords`, seeded so
        # the out-of-repo block-discovery tooling can score against them. Without
        # this filter a block would acquire a FUNCTIONAL capability merely by using
        # the word as a search term — e.g. a block keyworded "collection" would
        # read as declaring the capability `isCollectionKind()` tests.
        # ⚠ The hazard is STRUCTURAL, not dependent on any current example: the one
        # live collision measured 2026-08-08 was `sgs/content-collection`, which is
        # itself queued for deletion (absorbed into `sgs/card-grid`). Zero live
        # collisions after that is luck, not safety — keep the filter regardless.
        # Discovery readers deliberately do NOT filter; they want both kinds.
        rows = conn.execute(
            "SELECT capability FROM block_capabilities "
            "WHERE block_slug = ? AND kind = 'functional'",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        # Either the table is absent (first run) or the `kind` column predates
        # D528. Retry unfiltered so an un-migrated DB still returns the functional
        # rows it has, rather than silently reporting a block as capability-less.
        try:
            rows = conn.execute(
                "SELECT capability FROM block_capabilities WHERE block_slug = ?",
                (block_slug,),
            ).fetchall()
        except sqlite3.OperationalError:
            rows = []
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


@functools.lru_cache(maxsize=64)
def blocks_with_capability(capability: str) -> frozenset[str]:
    """Return the set of block slugs that carry `capability`.

    e.g. blocks_with_capability('carousel') → frozenset({'sgs/testimonial-slider',
         'sgs/brand-strip'})
    e.g. blocks_with_capability('unknown') → frozenset()

    Queries `block_capabilities` table. LRU-cached per capability tag.
    Intended for pattern-generation and diagnostic tooling — not hot-path during
    section walks (use capabilities_for() for per-node lookups instead).

    R-31-1 compliance: DB-only read path.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT block_slug FROM block_capabilities WHERE capability = ?",
            (capability,),
        ).fetchall()
    except sqlite3.OperationalError:
        rows = []
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


# ----------------------------------------------------------------------------
# array_item_fields — TABLE + MIGRATION + ACCESSOR REMOVED 2026-08-02 (Phase 1b)
# ----------------------------------------------------------------------------
# D248 built a create + prune + accessor trio for a per-item array field schema.
# The SEEDING HALF WAS NEVER BUILT: measured 2026-08-02 with two search shapes,
# there is not a single INSERT into `array_item_fields` anywhere in the repo —
# only `CREATE TABLE IF NOT EXISTS` (here and in sgs-update-v2.py), an ALTER, and
# a DELETE prune. So the table was created, pruned and read, but never written;
# it held 0 rows and the accessor had zero callers, including in tests.
#
# ⚠ The comment in sgs-update-v2.py claiming it is "Seeded from block.json
# supports.sgs.arrayItemSchema by the per-block loop below" was FALSE — that loop
# only DELETEs. Do not restore this on the strength of that comment.
#
# The live mechanism is the sibling `array_item_schema` (68 rows, real callers in
# resolvers/array_content.py and walk.py). One character apart, opposite status —
# do not confuse them. Rows archived to scripts/data/retired/array_item_fields.json.gz
# with its DDL, so this is reversible.
#
# ⛔ REMOVING THE TABLE ALONE WAS NOT ENOUGH and that is the lesson: the drop was
# undone within seconds because this module recreated it at import. A table with a
# `CREATE TABLE IF NOT EXISTS` on a hot path cannot be retired by dropping it —
# the creator has to go too, or the schema-drift gate stays red forever.


# _capability_rank DELETED (D278 QC, 2026-07-05) — see the retirement note at
# the _CAPABILITY_PRIORITY site above. Distinct-block ties in Path 1 are now
# LOUD (dedupe first; residual ambiguity → trace + no match), never silently
# ranked by an in-code ordering.


# ----------------------------------------------------------------------------
# CSS property → SGS attr suffix mapping (DB-driven, replaces hardcoded dict)
# ----------------------------------------------------------------------------

# Suffix → kind override for cases where the suffix name carries kind semantics
# the role column doesn't distinguish. Empty → fall through to role-based inference.
_KIND_BY_SUFFIX: dict[str, str] = {
    "LineHeight":    "number_unitless",
    "LetterSpacing": "number_px_or_em",
    # String-typed enums/keywords (defeat the role-based "number_px" default)
    "FontFamily":      "string",
    "FontWeight":      "string",
    "TextTransform":   "string",
    "TextAlign":       "string",
    "TextDecoration":  "string",
    "ObjectFit":       "string",
    "ObjectPosition":  "string",
    "BorderStyle":     "string",
    "BoxShadow":       "string",   # composite value or token ref
    "Easing":          "string",   # transition-timing-function: cubic-bezier(...) / ease
    "Columns":         "string",   # grid-template-columns: '1fr 1fr' etc.
    "AspectRatio":     "string",   # '16/9' syntax
    "Style":           "string",
    "Variant":         "string",
    "Alignment":       "string",
}


# ----------------------------------------------------------------------------
# Idempotent schema migration — property_suffixes.kind_override (D99 2026-05-29)
# ----------------------------------------------------------------------------
# Fix 4: _KIND_BY_SUFFIX dict (17 entries, defined above) moves into the DB as
# a `kind_override` column on property_suffixes. Honours R-31-1 (DB-first,
# no hardcoded dicts; blub.db row 260).
#
# _KIND_BY_SUFFIX is the ONE-TIME SEED source. _kind_for() queries DB first;
# the role-based fallback covers suffixes not yet in property_suffixes.
#
# UPDATE uses `WHERE kind_override IS NULL` to preserve manual operator
# overrides — idempotent re-runs are no-ops for already-populated rows.


def _migrate_property_suffixes_kind_override() -> None:
    """Idempotent migration: add property_suffixes.kind_override column if absent
    and seed from _KIND_BY_SUFFIX.

    Safe to call repeatedly. Runs at module load.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(property_suffixes)").fetchall()}
        if "kind_override" not in cols:
            conn.execute("ALTER TABLE property_suffixes ADD COLUMN kind_override TEXT")
        # UPDATE only NULL rows — preserves manual overrides set after seeding.
        for suffix, kind in _KIND_BY_SUFFIX.items():
            conn.execute(
                "UPDATE property_suffixes SET kind_override = ? "
                "WHERE suffix = ? AND kind_override IS NULL",
                (kind, suffix),
            )
        conn.commit()
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent — safe to call repeatedly).
if _SGS_DB_PRESENT_AT_IMPORT:
    _migrate_property_suffixes_kind_override()


# ----------------------------------------------------------------------------
# Idempotent schema migration — variant detection (FR-31-20, D133 2026-06-01)
# ----------------------------------------------------------------------------
# Universal variant detection (Spec 22 §FR-31-20) needs two schema additions:
#   - blocks.variant_attr  — names the variant-selector attr per block (e.g.
#     'variant', 'variantStyle', 'layout') so the converter never guesses it.
#     Populated by /sgs-update Stage 1 from block.json supports.sgs.variantAttr.
#   - variant_slots table  — (block_slug, variant_value, unique_slot) storing
#     each variant's DISCRIMINATING slots (set-difference vs sibling variants).
#     Populated by /sgs-update Stage 1 from block.json supports.sgs.variants.
#
# ADDITIVE (2026-09-05, VALUE-aware variant discrimination): variant_slots
# gains a nullable `slot_value` column. A CAPABILITY variant (hero, trust-bar,
# testimonial, product-card — the variant genuinely enables different
# ATTRIBUTES) keeps NULL here; presence-of-name was already the correct
# signal and this column changes nothing for it. A PRESET variant (nav-drawer
# — all variants share the same attribute vocabulary, differing only in
# VALUES) gets the literal value that attribute-name discriminates BY,
# extracted from the block's `variations.js` (never block.json, which only
# lists names). `detect_variant` treats a non-NULL `slot_value` as "must
# match this exact value", not merely "must be present" — see its docstring.
#
# This migration is pure schema (additive, no data). Population is a /sgs-update
# responsibility, so there is no seed dict here (R-31-1 dict-as-seed N/A).
#
# Safe to call repeatedly. Runs at module load.
def _migrate_variant_detection_schema() -> None:
    """Idempotent migration: add blocks.variant_attr column + create the
    variant_slots table (+ its `slot_value` column) if absent. Schema only —
    no data seeding.

    Safe to call repeatedly. Runs at module load.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(blocks)").fetchall()}
        if "variant_attr" not in cols:
            conn.execute("ALTER TABLE blocks ADD COLUMN variant_attr TEXT")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS variant_slots (
              block_slug    TEXT NOT NULL,
              variant_value TEXT NOT NULL,
              unique_slot   TEXT NOT NULL,
              created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (block_slug, variant_value, unique_slot)
            )
        """)
        vs_cols = {row[1] for row in conn.execute("PRAGMA table_info(variant_slots)").fetchall()}
        if "slot_value" not in vs_cols:
            conn.execute("ALTER TABLE variant_slots ADD COLUMN slot_value TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail. Variant detection then
        # no-ops (variant_attr_for returns None → detector skips).
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent — safe to call repeatedly).
if _SGS_DB_PRESENT_AT_IMPORT:
    _migrate_variant_detection_schema()


# ----------------------------------------------------------------------------
# Idempotent schema migration — variant_composition_slots (Task 2,
# InnerBlocks-composition fingerprinting, 2026-09-05)
# ----------------------------------------------------------------------------
# Sibling table to variant_slots above, but for CHILD BLOCK SLUGS rather than
# attribute (name, value) pairs: a variant's discriminating InnerBlocks
# composition, extracted from `variations.js` by
# `variant-value-extractor/extract-variation-values.js` (Task 1) and
# populated by `/sgs-update` Stage 1 (Task 2) via set-difference over each
# variant's `innerBlockSlugs`, exactly mirroring how variant_slots is
# populated over attribute pairs.
#
# DELIBERATELY DUPLICATED in both this file and sgs-update-v2.py, for the
# SAME REASON variant_slots's own schema-ensure is duplicated above: a
# one-off writer script (`/sgs-update`) and this converter package don't
# share a schema-migration import — see the block comment above
# `_migrate_variant_detection_schema` for the full rationale. This is pure
# schema (additive, no data); population is a `/sgs-update` responsibility.
#
# Safe to call repeatedly. Runs at module load.
def _migrate_variant_composition_schema() -> None:
    """Idempotent migration: create the `variant_composition_slots` table if
    absent. Schema only — no data seeding.

    Safe to call repeatedly. Runs at module load.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS variant_composition_slots (
                block_slug TEXT NOT NULL,
                variant_value TEXT NOT NULL,
                unique_child_slug TEXT NOT NULL,
                PRIMARY KEY (block_slug, variant_value, unique_child_slug)
            )
            """
        )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail. Composition detection
        # then simply has no rows to read (callers must treat absence as
        # "no fingerprint", never an error).
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent — safe to call repeatedly).
if _SGS_DB_PRESENT_AT_IMPORT:
    _migrate_variant_composition_schema()


# ----------------------------------------------------------------------------
# Idempotent schema migration — variant_composition_attr_slots
# (child-ATTRIBUTE-VALUE composition fingerprinting, 2026-09-06)
# ----------------------------------------------------------------------------
# THIRD variant-discrimination table, sibling to `variant_slots` (the PARENT's
# own attribute (name, value) pairs) and `variant_composition_slots` (the
# parent's uniquely-nested child block SLUGS). This one keys on a nested
# CHILD's own attribute value: `(child_slug, child_attr_name,
# child_attr_value)`.
#
# WHY A THIRD TABLE RATHER THAN TWO NULLABLE COLUMNS ON
# `variant_composition_slots`:
#
#   1. Different PRIMARY KEY. That table's PK is
#      (block_slug, variant_value, unique_child_slug) — one row per
#      discriminating slug. This signal needs several rows per (variant,
#      child_slug) pair, one per discriminating attribute, so the PK must
#      widen. SQLite cannot ALTER a PRIMARY KEY; widening it means rebuilding
#      the table (create-copy-drop-rename) on a DB shared live across
#      concurrent sessions, for zero behavioural gain.
#   2. Different SCORING TIER. The slug signal is checked FIRST and, when it
#      resolves, this one is never consulted (see `_composition_tiebreak`).
#      Two signals scored in different tiers read far more honestly as two
#      tables than as one table whose rows mean different things depending on
#      whether two columns are NULL.
#   3. PRECEDENT. `variant_slots` and `variant_composition_slots` are already
#      separate sibling tables rather than one table with a discriminator
#      column, for exactly this "different signal, different shape" reason.
#
# Populated by `/sgs-update` Stage 1
# (`sgs-update-v2.py::_populate_variant_composition_attr_slots`) by
# set-difference over each variant's `(child_slug, attr, canonical_value)`
# triples, extracted from `variations.js` by
# `variant-value-extractor/extract-variation-values.js` — the SAME
# methodology as the two tables above. No block, child slug or attribute name
# is named anywhere in code (R-31-1).
#
# `child_attr_value` is the canonical JSON form produced by
# `_canon_slot_value`, matching `variant_slots.slot_value` exactly, so the
# reader can compare an extracted value with a single string equality.
#
# DELIBERATELY DUPLICATED in both this file and sgs-update-v2.py, for the SAME
# REASON the two schema-ensures above are — see the block comment above
# `_migrate_variant_detection_schema`. Pure schema (additive, no data).
#
# Safe to call repeatedly. Runs at module load.
def _migrate_variant_composition_attr_schema() -> None:
    """Idempotent migration: create `variant_composition_attr_slots` if absent.

    Schema only — no data seeding. Safe to call repeatedly; runs at module load.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS variant_composition_attr_slots (
                block_slug TEXT NOT NULL,
                variant_value TEXT NOT NULL,
                child_slug TEXT NOT NULL,
                child_attr_name TEXT NOT NULL,
                child_attr_value TEXT NOT NULL,
                PRIMARY KEY (block_slug, variant_value, child_slug, child_attr_name, child_attr_value)
            )
            """
        )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail, identically to the two
        # sibling migrations above. Detection then simply has no rows to read
        # (absence is "no fingerprint", never an error).
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent — safe to call repeatedly).
if _SGS_DB_PRESENT_AT_IMPORT:
    _migrate_variant_composition_attr_schema()


# ----------------------------------------------------------------------------
# Idempotent schema migration — block_composition.container_kind (D150 2026-06-02)
# ----------------------------------------------------------------------------
# Workstream A: adds a container_kind TEXT column (section|layout|content|NULL)
# to block_composition. Values are written by sync-container-wrapping-blocks.py
# (run separately — never by the walker). The column is informational for the
# sync diff; it is NOT read by the walker (zero walker impact). Population via
# /sgs-update (Stage 1 reads supports.sgs.containerKind from block.json).
#
# Safe to call repeatedly. Runs at module load.

def _migrate_block_composition_container_kind() -> None:
    """Idempotent migration: add block_composition.container_kind column if absent.

    Schema only — no data seeding (data written by sync-container-wrapping-blocks.py
    at --apply time, or by /sgs-update Stage 1 for the containerKind flag from
    block.json supports.sgs.containerKind). Safe to call repeatedly.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(block_composition)").fetchall()}
        if "container_kind" not in cols:
            conn.execute(
                "ALTER TABLE block_composition ADD COLUMN container_kind TEXT "
                "CHECK (container_kind IN ('section', 'layout', 'content'))"
            )
            conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / table absent — soft-fail silently.
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent — safe to call repeatedly).
if _SGS_DB_PRESENT_AT_IMPORT:
    _migrate_block_composition_container_kind()


def _kind_for(suffix: str, role: str | None) -> str | None:
    """Infer the convert.py 'kind' for a property_suffixes row.

    Returns one of: 'colour', 'number_px', 'number_unitless', 'number_px_or_em',
    'string'. Returns None for rows that shouldn't be lifted via CSS (behaviour,
    select-from-enum, content roles — these aren't CSS-driven).

    D99 2026-05-29 (Fix 4): queries property_suffixes.kind_override FIRST
    (R-31-1 — DB-first, no hardcoded dicts). Falls through to role-based
    inference for suffixes not covered by the DB column. _KIND_BY_SUFFIX is
    retained as the seed source for _migrate_property_suffixes_kind_override()
    but is no longer the runtime lookup path.

    Wave 2 Change 3 (2026-05-22): added 'colour-gradient', 'select-from-enum',
    'spacing-token' to the lifted set. Schema evidence (blub.db 272):
      - colour-gradient: suffix='Gradient', css_property='background-image' — URL-valued
      - select-from-enum: suffix='FontStyle', css_property='font-style' — string enum
      - spacing-token: suffix='BlockGap', css_property='gap' — numeric px value
      - spacing-token: suffix='Spacing', css_property='padding/margin (preset)' — skipped
        (multi-property; no single CSS prop to match)
    """
    # DB-first (R-31-1): query kind_override column seeded from _KIND_BY_SUFFIX.
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT kind_override FROM property_suffixes WHERE suffix = ?", (suffix,)
        ).fetchone()
    except sqlite3.OperationalError:
        row = None
    finally:
        conn.close()
    if row and row[0]:
        return row[0]
    # Fall through to role-based inference for suffixes not in the DB.
    if role == "color" or any(t in suffix for t in ("Colour", "Color", "Background", "Foreground")):
        return "colour"
    if role in ("layout", "typography", "visual", "spacing", "shadow", "motion", "number-css-px"):
        return "number_px"
    if role == "number-css-percent":
        return "number_px"  # we strip the unit either way
    # Wave 2 Change 3: lift additional CSS-driven roles that previously returned None
    if role == "colour-gradient":
        return "string"  # background-image: url(...) or gradient string
    if role == "select-from-enum":
        return "string"  # e.g. font-style: italic/normal
    if role == "spacing-token" and suffix == "BlockGap":
        return "number_px"  # gap: Npx — single CSS property, safe to lift
    # spacing-token/Spacing maps to multi-property (padding + margin preset) — not CSS-lifted
    # Roles that aren't CSS-lifted (content, behaviour, etc.)
    return None


@functools.lru_cache(maxsize=1)
def css_property_suffixes() -> list[tuple[str, str, str]]:
    """Return list of (css_property, suffix, kind) tuples from property_suffixes
    table, filtered to rows where:
      - css_property IS NOT NULL (skip 'Style'/'Variant' etc. with no CSS prop)
      - kind can be inferred (skip behaviour/select-from-enum rows that aren't CSS-driven)

    Replaces the hardcoded _CSS_PROP_TO_SUFFIX dict in convert.py. The DB is
    canonical; this function is the single read path.

    The same CSS property may map to multiple suffixes (e.g. color → both
    'Colour' and 'Color'). Caller iterates the full list and tries each suffix
    in turn — _try_set() drops rows where the suffix doesn't exist in the
    target block's schema.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT suffix, css_property, role FROM property_suffixes "
            "WHERE css_property IS NOT NULL AND css_property != ''"
        ).fetchall()
    finally:
        conn.close()
    if not rows:
        import sys as _sys
        print(
            "[db_lookup] WARNING: property_suffixes table empty — "
            "suffix resolution will mis-classify all CSS properties. "
            "Re-run /sgs-update to seed the table.",
            file=_sys.stderr,
        )
    out: list[tuple[str, str, str]] = []
    for suffix, css_prop, role in rows:
        kind = _kind_for(suffix, role)
        if kind is None:
            continue
        out.append((css_prop, suffix, kind))
    return out


# ----------------------------------------------------------------------------
# Typography CSS → block-attr lift map (DB-driven, replaces _TYPOGRAPHY_CSS_TO_ATTRS)
# ----------------------------------------------------------------------------
# R-31-1: no hardcoded css-property→attribute literal dict/list.
# The 8 entries formerly hardcoded in convert.py._TYPOGRAPHY_CSS_TO_ATTRS are
# now derived at runtime from property_suffixes. The DB's css_property column
# already holds the css_property→suffix direction; iteration is driven entirely
# from the DB rows (typography role + the two colour css_properties), so adding
# a new typography suffix to the DB flows through with ZERO code edits here.
#
# Disambiguation: most css_properties have exactly ONE suffix row in the DB
# (font-size→FontSize, line-height→LineHeight, etc.) — those resolve directly,
# no constant needed. Only the two colour css_properties are ambiguous:
#   - 'color'            → Colour / Color / Foreground / TextColour / TextColor (5)
#   - 'background-color' → Background / BackgroundColour / BackgroundColor / Bg (4)
# The SGS block schema uses 'textColour' and 'backgroundColour' as the canonical
# flat attr names; any other suffix (e.g. 'Colour' → 'colour') is an attr no
# block declares, so the lift would no-op. This 2-entry table is the minimal
# WP/SGS naming-convention constant (same class as SKIP_TOP_LEVEL_TAGS) needed
# to pick the right DB row for those two ambiguous properties only.
_TYPO_CSS_SUFFIX_SELECTION: dict[str, str] = {
    "color":            "TextColour",       # → textColour (not 'colour')
    "background-color": "BackgroundColour", # → backgroundColour (not 'background')
}

# The two colour css_properties whose suffix is selected via the table above.
# All other lifted typography css_properties (role='typography') resolve their
# single DB suffix directly. Order matters for setdefault semantics downstream.
_TYPO_COLOUR_CSS_PROPS: tuple[str, ...] = ("color", "background-color")

# Lift SCOPE roster (ordered): the css_properties _lift_typography_to_block_attrs
# transfers from a draft element onto a leaf SGS text block. This is the lift
# *scope* decision (which CSS properties to lift) — NOT a css→attr mapping; the
# attr name + unit companion are derived from property_suffixes per entry.
# The DB classifies more properties as role='typography' (font-family,
# text-decoration, text-transform) but those are deliberately OUT of the typed
# flat-attr lift scope here (they have separate handling / no faithful-default
# need on the cloning path). Adding one to this tuple is the single edit needed
# to bring it into scope — the suffix/attr/unit then derive from the DB row.
_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS: tuple[str, ...] = (
    "font-size", "line-height", "letter-spacing",
    "font-weight", "font-style", "text-align",
    # Brought into scope 2026-07-11 (D309, universal hover): a draft's
    # text-decoration/text-transform must transfer faithfully — the announcement
    # `a:hover{text-decoration:underline}` is the first live consumer (its Hover
    # companion routes via the state axis). Both are string enums (kind_override
    # 'string' → no Unit companion). font-family stays out (font-stack/token
    # handling is a separate concern).
    "text-decoration", "text-transform",
)


@functools.lru_cache(maxsize=1)
def typography_css_to_attrs() -> list[tuple[str, str, "str | None"]]:
    """Return list of (css_prop, primary_attr, unit_attr_or_None) tuples used by
    _lift_typography_to_block_attrs in convert.py.

    Fully DB-driven from property_suffixes (R-31-1). Replaces the hardcoded
    _TYPOGRAPHY_CSS_TO_ATTRS list. The css_property→suffix→attr→unit derivation
    reads the DB; only the lift SCOPE (which css_properties to lift) and the
    2-property colour disambiguation are module constants.

    Iteration order = _TYPO_LIFT_TYPOGRAPHY_CSS_PROPS (the 6 typography props)
    then _TYPO_COLOUR_CSS_PROPS (color, background-color).

    Derivation rules:
      - For each lifted css_property, gather candidate suffixes from the DB
        css_property column. Unambiguous (one candidate) → use it. Ambiguous
        (color / background-color) → pick via _TYPO_CSS_SUFFIX_SELECTION.
      - primary_attr = lower-first-char of the chosen suffix ('FontSize' → 'fontSize')
      - unit_attr    = primary_attr + 'Unit' when role='typography' AND
                       kind_override != 'string' — i.e. the property accepts a
                       numeric value that may carry a CSS unit ('px','em',etc.)
                       or the 'unitless' sentinel. Colour-role entries never get a
                       unit attr; select-from-enum entries never get a unit attr.
      - Ordering preserves the original _TYPOGRAPHY_CSS_TO_ATTRS sequence so that
        setdefault semantics in _resolve_typo_value are unchanged.

    Soft-fail: on any DB error, warns to stderr and returns the known-good
    hardcoded fallback (same values as the original list) so the converter
    never breaks on a missing/locked DB.
    """
    _FALLBACK: list[tuple[str, str, "str | None"]] = [
        ("font-size",       "fontSize",        "fontSizeUnit"),
        ("line-height",     "lineHeight",       "lineHeightUnit"),
        ("letter-spacing",  "letterSpacing",    "letterSpacingUnit"),
        ("font-weight",     "fontWeight",       None),
        ("font-style",      "fontStyle",        None),
        ("text-align",      "textAlign",        None),
        ("color",           "textColour",       None),
        ("background-color","backgroundColour", None),
    ]
    # Ordered lift scope: 6 typography props then the 2 colour props.
    lifted_css_props = list(_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS) + list(_TYPO_COLOUR_CSS_PROPS)
    try:
        conn = sqlite3.connect(SGS_DB)
        try:
            # Pull every property_suffixes row whose css_property is in scope.
            # The DB's css_property column IS the css_property→suffix mapping —
            # we read it rather than re-encode it.
            placeholders = ",".join("?" for _ in lifted_css_props)
            db_rows = conn.execute(
                "SELECT css_property, suffix, role, kind_override "
                "FROM property_suffixes "
                f"WHERE css_property IN ({placeholders}) "
                "ORDER BY rowid",
                lifted_css_props,
            ).fetchall()
        finally:
            conn.close()
    except Exception as exc:  # noqa: BLE001 — DB unavailable → safe fallback
        import sys as _sys
        print(
            f"[db_lookup] WARNING: typography_css_to_attrs DB error ({exc!r}) — "
            "using hardcoded fallback. Re-run /sgs-update.",
            file=_sys.stderr,
        )
        return _FALLBACK

    # Build css_property → [(suffix, role, kind_override)] candidate map, in
    # rowid order (so the first candidate for an unambiguous prop is its only row).
    candidates: dict[str, list[tuple[str, str, "str | None"]]] = {}
    for css_property, suffix, role, kind_override in db_rows:
        candidates.setdefault(css_property, []).append((suffix, role, kind_override))

    def _resolve_one(css_prop: str) -> "tuple[str, str, str | None] | None":
        rows_for_prop = candidates.get(css_prop)
        if not rows_for_prop:
            return None
        if css_prop in _TYPO_CSS_SUFFIX_SELECTION:
            # Ambiguous colour property — pick the canonical suffix.
            wanted = _TYPO_CSS_SUFFIX_SELECTION[css_prop]
            chosen = next((r for r in rows_for_prop if r[0] == wanted), None)
            if chosen is None:
                return None
        else:
            # Unambiguous — exactly one suffix row in the DB for this css_property.
            chosen = rows_for_prop[0]
        suffix, role, kind_override = chosen
        primary_attr = suffix[0].lower() + suffix[1:]
        # unit_attr: only typography-role props that accept a CSS unit.
        # kind_override='string' → no unit (fontWeight, textAlign).
        # role='color' → no unit (textColour, backgroundColour).
        # role='select-from-enum' → no unit (fontStyle).
        if role == "typography" and kind_override != "string":
            unit_attr: "str | None" = primary_attr + "Unit"
        else:
            unit_attr = None
        return (css_prop, primary_attr, unit_attr)

    result: list[tuple[str, str, "str | None"]] = []
    for css_prop in lifted_css_props:
        resolved = _resolve_one(css_prop)
        if resolved is not None:
            result.append(resolved)
        else:
            # Couldn't resolve from DB → fall back to the hardcoded value if known.
            fb = next((t for t in _FALLBACK if t[0] == css_prop), None)
            if fb:
                result.append(fb)

    return result if result else _FALLBACK


# ----------------------------------------------------------------------------
# Commit 1b — per-declaration DB dispatch
# ----------------------------------------------------------------------------
# `attr_for_property` is the single function that decides, for a given
# (block_slug, css_property) pair, which write-path and flat attr name OWNS
# that declaration.  This removes the call-order precedence-chain from
# route_node_css (Commit 1a) and replaces it with an explicit DB-driven rule.
#
# Decision keys (per STAGE1-DESIGN.md §Commit-1b + D194):
#   1. TYPOGRAPHY scope  — css_property in _TYPO_LIFT_TYPOGRAPHY_CSS_PROPS or
#      _TYPO_COLOUR_CSS_PROPS, AND the block declares the corresponding flat attr
#      (e.g. sgs/heading.textColour for 'color').  Owner = "typography".
#      The typography writer handles unit companions correctly (fontSizeUnit etc.)
#      and applies the correct colour treatment (bare token vs hex), so it MUST
#      own the flat attr — not the wrapper-css writer.
#   2. WRAPPER-CSS scope — css_property in property_suffixes, block has a
#      matching flat attr, AND the property is NOT in the typography scope.
#      Owner = "wrapper_css".
#   3. ROOT-SUPPORTS (style.* path) — fires unconditionally in route_node_css
#      when block_supports_for allows it (always writes to style.*, a DIFFERENT
#      dest from flat attrs, so no contest with (1) or (2)).
#      NOT returned here — route_node_css handles it unconditionally.
#
# The function does NOT duplicate the root-supports path because it writes to a
# structurally different destination (style.* dict vs top-level flat attr) —
# both can legitimately fire for the same css_property (e.g. `color` on
# sgs/heading writes BOTH `textColour` AND `style.color.text`).
#
# R-31-1 compliance: all lookups via DB tables (property_suffixes,
# block_attributes).  _SUFFIX_ATTR_OVERRIDES is the ONLY constant (same
# exception class as SKIP_TOP_LEVEL_TAGS — handles `grid-template-columns`
# whose naive suffix derivation lands on the wrong attr, a WP-schema constant).
#
# Cache: LRU per (block_slug, css_property) — O(1) per declaration in the
# walker's per-node loop.
# ----------------------------------------------------------------------------

# The set of css_properties owned by the typography writer (R-31-1 permitted
# constant: these are the scope of _lift_typography_to_block_attrs, defined by
# the lift SCOPE decision documented in typography_css_to_attrs() above, not by
# per-block data.  Adding a new typography css_property to the DB scope is the
# single edit point).
_TYPOGRAPHY_CSS_SCOPE: frozenset[str] = frozenset(
    _TYPO_LIFT_TYPOGRAPHY_CSS_PROPS
) | frozenset(_TYPO_COLOUR_CSS_PROPS)

# Explicit attr-name overrides: mirrors the _SUFFIX_ATTR_OVERRIDES dict in
# convert.py._lift_wrapper_css_to_container_attrs so the derivation is
# consistent (R-31-1: these are WP-schema constants, not per-block data).
_ATTR_NAME_OVERRIDES: dict[tuple[str, str], str] = {
    ("grid-template-columns", "Columns"): "gridTemplateColumns",
}


@functools.lru_cache(maxsize=1024)
def css_property_has_suffix_row(css_property: str) -> bool:
    """True iff ``css_property`` has >=1 ``property_suffixes`` row — i.e. the DB
    declares it LIFTABLE (some attr-suffix destination exists somewhere).

    Spec 31 §4: property_suffixes IS the property->attr-suffix map, so "which CSS
    properties may a layer resolver attempt" is a DB FACT, never an in-code
    allowlist (R-31-1 — the Step-12 in-code `_OUTER_TRANSFER_PROPS` frozenset
    duplicated this fact and drifted the moment new rows were seeded; replaced
    by this accessor 2026-07-04, Bean-caught)."""
    if not css_property:
        return False
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT 1 FROM property_suffixes WHERE css_property = ? LIMIT 1",
            (css_property,),
        ).fetchone()
    except sqlite3.OperationalError:
        return False
    finally:
        conn.close()
    return row is not None



def _kind_from_ps_row(kind_override: "str | None", ps_role: "str | None") -> str:
    """Derive the value-conversion kind for a property_suffixes row.

    kind_override is the DB-first value; else a role-based fallback. Extracted so
    the suffix loop AND the column-first pre-check in ``attr_for_property`` derive
    kind identically (the fallback path is behaviour-identical — the conformance
    goldens pin it)."""
    if kind_override:
        return kind_override
    if ps_role == "color":
        return "colour"
    if ps_role == "typography":
        return "number_px"  # safe fallback; actual conversion in the writer
    if ps_role == "layout":
        return "number_px"
    if ps_role == "visual":
        return "string"
    return "string"


@functools.lru_cache(maxsize=4096)
def attr_for_property(
    block_slug: str,
    css_property: str,
) -> "tuple[str, str, str] | None":
    """Per-declaration DB dispatch: return (writer_path, attr_name, kind).

    Given (block_slug, css_property), decides which write-path OWNS the
    corresponding flat attr on the block.  Returns None when the property has
    no flat-attr destination on this block (it may still go to style.* via the
    root-supports path, which route_node_css handles unconditionally).

    Returns
    -------
    (writer_path, attr_name, kind) where:
      writer_path : "typography" | "wrapper_css"
      attr_name   : the flat block attribute name to write to
      kind        : value-conversion kind (colour / number_px / number_unitless /
                    number_px_or_em / string) from property_suffixes.kind_override
                    or role-based inference.

    Decision algorithm
    ------------------
    1. Query property_suffixes for css_property (ordered by rowid).
    2. For each (suffix, ps_role, kind_override) row:
       a. Derive candidate attr name = _ATTR_NAME_OVERRIDES.get((css_prop, suffix))
          or suffix[0].lower() + suffix[1:].
       b. Check block_attributes: does block_slug declare attr_name?
       c. If yes:
          - If css_property is in _TYPOGRAPHY_CSS_SCOPE → writer_path = "typography"
            (DB rule: typography writer owns this property's flat attr — it handles
             unit companions and colour treatment correctly).
          - Otherwise → writer_path = "wrapper_css"
          - Infer kind from kind_override → role-based fallback (mirrors _kind_for
            in this module).
          - Return immediately (first matching attr wins — same first-wins semantics
            as the existing setdefault ordering, now made explicit by DB rowid order
            rather than Python call order).
    3. If no matching flat attr found → return None.

    Performance: LRU-cached per (block_slug, css_property); cache size 4096 covers
    the typical walker's per-node-per-property call pattern across a full page.

    R-31-1: property_suffixes and block_attributes are the sole lookup sources.
    No hardcoded css_property→attr_name dict.
    """
    if not block_slug or not css_property:
        return None

    # Step 1: gather all (suffix, role, kind_override) rows for this css_property.
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT suffix, role, kind_override "
            "FROM property_suffixes "
            "WHERE css_property = ? "
            "ORDER BY rowid",
            (css_property,),
        ).fetchall()
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()

    if not rows:
        return None

    # Step 2: for each suffix, check block_attributes.
    block_attr_map = block_attrs(block_slug)
    if not block_attr_map:
        return None

    # Step 1a — COLUMN-FIRST (declarative, FR-31-5.2/5.3, D281; base-domain keyed
    # Front 1, 2026-07-22, P-CSSPROP-RUNTIME-RESOLVER-UNDER-KEYED). A block that
    # DECLARES css_property on one of its attrs wins over suffix name-guessing
    # (fixes the naming-mismatch strand: colourBorder never endswith BorderColour).
    # The match is RESTRICTED to the base-resolver domain (root/self element, base/
    # desktop tier, base state) — the old 2-arg lookup returned tier/state/child-
    # element siblings too and blindly took [0], an insert-order-fragile mis-pick
    # (e.g. `gap` → [gap, gapMobile, gapTablet]). Tier siblings are re-appended by
    # step 4, state by step 4a, per-child-element attrs served by styling_content.py.
    # ≥2 survivors after the base-domain restriction → AmbiguousCssPropAttrError
    # (Bean-decided fail-loud; proven 0-residual on current data, guards future drift).
    # An undeclared property returns () → the suffix loop below runs UNCHANGED
    # (parity-neutral: the ~650 undeclared attrs never enter this path).
    declared = tuple(
        a for a in _base_domain_attrs_for_css_property(block_slug, css_property)
        if a in block_attr_map
    )
    if len(declared) > 1:
        raise AmbiguousCssPropAttrError(
            f"attr_for_property({block_slug!r}, {css_property!r}): "
            f"{len(declared)} base-domain attrs match ({', '.join(declared)}); "
            "add a css_element disambiguator or remove the duplicate registration."
        )
    if declared:
        attr_name = declared[0]
        writer_path = "typography" if css_property in _TYPOGRAPHY_CSS_SCOPE else "wrapper_css"
        _first_suffix, _first_role, _first_kind_override = rows[0]
        kind = _kind_from_ps_row(_first_kind_override, _first_role)
        _trace("attr_for_property_column",
               block_slug=block_slug, css_property=css_property,
               attr_name=attr_name, writer_path=writer_path, kind=kind)
        return (writer_path, attr_name, kind)

    for suffix, ps_role, kind_override in rows:
        # Step 2a: derive candidate attr name.
        override_key = (css_property, suffix)
        if override_key in _ATTR_NAME_OVERRIDES:
            attr_name = _ATTR_NAME_OVERRIDES[override_key]
        elif suffix:
            attr_name = suffix[0].lower() + suffix[1:]
        else:
            continue

        # Step 2b: block_attributes membership check.
        if attr_name not in block_attr_map:
            continue

        # Step 2c: writer-path decision via DB rule.
        if css_property in _TYPOGRAPHY_CSS_SCOPE:
            writer_path = "typography"
        else:
            writer_path = "wrapper_css"

        # Infer kind (kind_override is the DB-first value; else role-based).
        kind = _kind_from_ps_row(kind_override, ps_role)

        _trace("attr_for_property_dispatch",
               block_slug=block_slug, css_property=css_property,
               attr_name=attr_name, writer_path=writer_path, kind=kind)
        return (writer_path, attr_name, kind)

    # No matching flat attr on this block for this css_property.
    return None


# ----------------------------------------------------------------------------
# Breakpoint suffix vocabulary (DB-driven, replaces hardcoded _BREAKPOINT_SUFFIXES)
# ----------------------------------------------------------------------------

# Standard breakpoint marker → [suffixes to try, in priority order]. Tablet+Desktop
# both fire for min-width: 768 because most mockups have only one breakpoint and
# the converter wants to populate both responsive attrs from that single rule.
# This mapping is convention, not data — the DB has the suffix vocabulary; this
# function maps @media query breakpoints to which suffixes those queries apply to.
# R-31-1 permitted-constant exception (same class as SKIP_TOP_LEVEL_TAGS): these
# are CSS @media-query breakpoint thresholds from the W3C / web-platform standard,
# not SGS per-block data. There is no DB table for @media boundary values.
# The suffix vocabulary IS DB-driven (verified via modifier_suffixes in
# breakpoint_suffix_rules() below); only the marker→suffix PAIRING is a constant.
_BREAKPOINT_RULES: list[tuple[str, list[str]]] = [
    ("min-width: 768",  ["Tablet", "Desktop"]),
    ("min-width: 1024", ["Desktop"]),
    ("min-width: 1280", ["Desktop"]),
    ("max-width: 767",  ["Mobile"]),
    ("max-width: 640",  ["Mobile"]),
]


@functools.lru_cache(maxsize=1)
def breakpoint_suffix_rules() -> list[tuple[str, list[str]]]:
    """Return the breakpoint marker → suffix-list mapping for CSS @media parsing.

    The suffix vocabulary is DB-canonical via modifier_suffixes (kind='breakpoint');
    this function pairs each breakpoint marker with the suffixes from that vocabulary
    that should be populated when the marker matches. Verifies at module load
    that every suffix referenced here exists in the DB's modifier_suffixes table.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        db_suffixes = {
            s for (s,) in conn.execute(
                "SELECT suffix FROM modifier_suffixes WHERE kind = 'breakpoint'"
            ).fetchall()
        }
    finally:
        conn.close()
    # Verify the convention rules only reference suffixes that exist in the DB
    for marker, suffixes in _BREAKPOINT_RULES:
        for sfx in suffixes:
            if sfx not in db_suffixes:
                raise RuntimeError(
                    f"breakpoint_suffix_rules: marker {marker!r} references "
                    f"suffix {sfx!r} not in modifier_suffixes (kind='breakpoint'). "
                    f"DB has {sorted(db_suffixes)}. Run /sgs-update to refresh."
                )
    return _BREAKPOINT_RULES


# ----------------------------------------------------------------------------
# Device-tier cascade samples (Spec 31 §3 F-fork / FR-31-5.2) — the numeric
# breakpoint model that replaces the substring-drop marker match.
# ----------------------------------------------------------------------------
#
# The SGS device system is fixed at 768/1024 (Spec 31 §3, §9 Q1). To resolve a
# draft `@media (min-width|max-width)` rule to the SGS device-tier attrs WITHOUT
# snapping or dropping, the CSS cascade is sampled at one representative interior
# width per tier: the EFFECTIVE value at each sample IS that tier's value.
#
#   Mobile  = width < 768     → sample 375
#   Tablet  = 768 <= w < 1024 → sample 800
#   Desktop = width >= 1024    → sample 1440  (Desktop is the SGS BASE/unsuffixed attr)
#
# `min-width:X` = "X and up" naturally populates every tier whose sample >= X;
# `max-width:X` = "X and down" every tier whose sample <= X — ONE symmetric
# calculation, both directions (FR-31-5.2). Order is Desktop -> Tablet -> Mobile
# so the A-collapse precedence (base = Desktop) is honoured by the caller.
#
# R-31-1 PERMITTED-CONSTANT exception (same class as SKIP_TOP_LEVEL_TAGS and the
# _BREAKPOINT_RULES marker table above): CSS @media boundary widths are a
# web-platform standard, not SGS per-block data — there is no DB table of pixel
# boundaries. The device-tier SUFFIX vocabulary (Mobile/Tablet/Desktop) remains
# DB-owned via modifier_suffixes(kind='breakpoint').
_DEVICE_TIER_SAMPLES: tuple[tuple[str, int], ...] = (
    ("Desktop", 1440),
    ("Tablet", 800),
    ("Mobile", 375),
)

# Canonical device-tier @media threshold values. A `min-width`/`max-width`
# threshold NOT in this set falls strictly inside a tier's range and creates a
# sub-tier band the 3-tier attr model cannot represent (e.g. min-width:600 = a
# 4-col band only for 600-767 of Mobile) — a D228 "arbitrary visual breakpoint"
# that must be preserved as an F-ii passthrough, NEVER snapped, NEVER dropped.
_DEVICE_TIER_THRESHOLDS: frozenset[int] = frozenset({767, 768, 1023, 1024})


def device_tier_samples() -> tuple[tuple[str, int], ...]:
    """Return the (tier_name, representative_width) samples, Desktop→Tablet→Mobile.

    Used by ``collect_css_decls_for_element`` to compute the effective CSS value
    per device tier via the cascade (Spec 31 §3 F-fork / FR-31-5.2).
    """
    return _DEVICE_TIER_SAMPLES


def device_tier_thresholds() -> frozenset[int]:
    """Return the canonical device-tier @media threshold values (767/768/1023/1024).

    A threshold outside this set is a non-device "visual" breakpoint (D228) whose
    residual sub-tier band routes to an F-ii passthrough, never a device tier.
    """
    return _DEVICE_TIER_THRESHOLDS


# Whole-tier (lo, hi) inclusive width ranges, derived from the SAME device
# thresholds above (Desktop ≥1024 / Tablet 768-1023 / Mobile ≤767). Desktop is
# unbounded above, represented by a large sentinel hi. A media rule folds into a
# tier's effective value ONLY if it applies across the tier's ENTIRE range (tested
# at both lo and hi) — so a non-device threshold that covers only PART of a tier
# (e.g. min-width:1280 inside Desktop, or max-width:1200 inside Desktop) is NOT
# absorbed into the tier's base value; it is peeled as an F-ii residual instead.
# Same R-31-1 permitted-constant class as _DEVICE_TIER_THRESHOLDS (web-platform
# @media boundaries, not SGS per-block data).
_DEVICE_TIER_RANGES: tuple[tuple[str, int, int], ...] = (
    ("Desktop", 1024, 2147483647),
    ("Tablet", 768, 1023),
    ("Mobile", 1, 767),
)


def device_tier_ranges() -> tuple[tuple[str, int, int], ...]:
    """Return (tier_name, lo, hi) inclusive width ranges, Desktop→Tablet→Mobile.

    Used by ``collect_css_decls_for_element`` for whole-tier folding (FR-31-5.2):
    a media rule contributes to a tier's effective value only if it applies across
    the tier's ENTIRE [lo, hi] range, so a non-device threshold that covers only
    PART of a tier is never silently absorbed — it routes to the F-ii residual
    passthrough (``sgsCustomCss``) instead of snapping to the tier. Replaces the
    single-interior-width ``device_tier_samples`` sampling, which wrongly absorbed a
    ``min-width`` rule nested inside the Desktop range into the Desktop base value.
    """
    return _DEVICE_TIER_RANGES


@functools.lru_cache(maxsize=None)
def modifier_suffixes(kind: str) -> tuple[str, ...]:
    """Return the suffix vocabulary for one ``modifier_suffixes.kind`` from the DB.

    R-31-1: the suffix grammar (side={Top,Right,Bottom,Left}, breakpoint=
    {Mobile,Tablet,Desktop}, unit={Unit}, corner={TL,TR,BL,BR}, state, variant) is
    DB-OWNED — hardcoding any of these literals in the resolvers is a violation.
    Cached per-kind (the vocabulary is process-stable). Spec 31 §4 (modifier_suffixes
    row) + §3.A step 4 (breakpoint) / Unit-companion derivation.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT suffix FROM modifier_suffixes WHERE kind = ? ORDER BY rowid",
            (kind,),
        ).fetchall()
    finally:
        conn.close()
    return tuple(s for (s,) in rows)


def unit_companion_attr(attr: str, conn: sqlite3.Connection) -> str | None:
    """Derive the ``…Unit`` companion attr name for a (possibly tier/side-suffixed)
    numeric attr — entirely from the DB suffix vocabulary (R-31-1, NO hardcoded
    suffix literals).

    A numeric box/typography attr stores its CSS unit on a shared companion attr:
    the per-area padding family (``contentPaddingTop`` / ``contentPaddingRight`` /
    ``contentPaddingTopTablet`` …) all share ONE ``contentPaddingUnit``. The
    companion is the base name with any breakpoint suffix THEN any side suffix
    stripped, with the DB ``unit`` suffix appended.

    Derivation (all suffix sets sourced from ``modifier_suffixes`` via the
    :func:`modifier_suffixes` accessor — no ``Top``/``Mobile``/etc. literals):
      1. strip a trailing breakpoint suffix (``Mobile``/``Tablet``/``Desktop``);
      2. then strip a trailing side suffix (``Top``/``Right``/``Bottom``/``Left``);
      3. append the DB ``unit`` suffix (``Unit``).

    ``conn`` is accepted for call-site symmetry with the other DB services (and to
    keep the signature stable); the suffix vocabulary itself is read via the cached
    module accessor. Returns ``None`` only if the DB has no ``unit`` suffix (a
    seeding error); the caller validates the derived name against the block schema,
    so a base that takes no unit simply fails that downstream ``validate`` check.
    """
    unit_suffixes = modifier_suffixes("unit")
    if not unit_suffixes:
        return None
    base = attr
    for kind in ("breakpoint", "side"):
        for sfx in modifier_suffixes(kind):
            if base.endswith(sfx) and len(base) > len(sfx):
                base = base[: -len(sfx)]
                break  # at most one suffix of each kind, longest-match irrelevant (disjoint)
    return f"{base}{unit_suffixes[0]}"


@functools.lru_cache(maxsize=512)
def image_alt_companion_for(block_slug: str, image_attr: str) -> str | None:
    """Return the ``role='image-alt'`` attr that stores ``image_attr``'s alt text,
    or ``None`` if this block declares no such companion (CG-8, 2026-07-05).

    Unlike :func:`unit_companion_attr`, the alt companion CANNOT be derived by
    suffix-stripping the base attr name: sgs/product-card's image attr is named
    ``image`` (companion ``imageAlt``) while sgs/media's is ``imageUrl``
    (companion ALSO ``imageAlt``, not ``imageUrlAlt``) — no consistent naming
    rule links an image attr to its alt attr across blocks. The companion is
    therefore a genuine per-attr DB FACT (``block_attributes.alt_companion_attr``,
    seeded via ``ATTR_CLASSIFICATION_OVERRIDES`` — same reseed-durable channel as
    every other source-truth correction, R-31-1), not a name-parsing heuristic.

    A block may declare more than one ``image-object`` attr sharing a role/slot
    (e.g. sgs/media's ``imageUrl`` AND ``videoPoster`` both role='image-object');
    only the row whose ``alt_companion_attr`` names THIS image_attr is returned,
    so an unrelated image-object attr with no declared alt companion (e.g.
    videoPoster) correctly yields ``None`` instead of a false match.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(block_attributes)").fetchall()]
        if "alt_companion_attr" not in cols:
            return None  # column not yet seeded in this DB (pre-migration state)
        row = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND role = 'image-alt' AND alt_companion_attr = ?",
            (block_slug, image_attr),
        ).fetchone()
    finally:
        conn.close()
    return row[0] if row else None


# ----------------------------------------------------------------------------
# Legacy role lookup — kebab-semantic class → SGS slug (DB-driven)
# D99 2026-05-29: queries `slots WHERE scope='section'` (was legacy_role_lookup).
# The legacy_role_lookup table has been retired and its 16 rows migrated to
# slots with scope='section'. Consumer API is unchanged.
# ----------------------------------------------------------------------------

# Module-level cache populated on first call. Avoids repeated DB round-trips
# across multiple sections in a single run.
_LEGACY_ROLE_CACHE: dict[str, str] | None = None


def _load_legacy_role_cache() -> dict[str, str]:
    """Query section-scope slots and return {slot_name: standalone_block}.

    D99: queries `slots WHERE scope='section'` (was legacy_role_lookup).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, standalone_block FROM slots WHERE scope='section'"
        ).fetchall()
    except sqlite3.OperationalError:
        # Table not yet created (pre-D99 DB). Soft-fail to empty.
        rows = []
    finally:
        conn.close()
    return {slot: block for slot, block in rows if block}


def legacy_role_lookup_for(kebab_role: str) -> str | None:
    """Return the SGS block slug for a legacy kebab-semantic role, or None.

    D99: queries `slots WHERE scope='section'` (was legacy_role_lookup table).
    Results cached in-module after the first call (warmup pattern).

    Examples:
        legacy_role_lookup_for('hero')           -> 'sgs/hero'
        legacy_role_lookup_for('trust-bar')      -> None  (not in section-scope slots)
        legacy_role_lookup_for('unknown-role')   -> None
    """
    global _LEGACY_ROLE_CACHE
    if _LEGACY_ROLE_CACHE is None:
        _LEGACY_ROLE_CACHE = _load_legacy_role_cache()
    result = _LEGACY_ROLE_CACHE.get(kebab_role)
    if result is None and kebab_role:
        _trace("db_lookup_miss", lookup="legacy_role_lookup_for", kebab_role=kebab_role)
    return result


# ----------------------------------------------------------------------------
# is_class_section_block — Spec 22 §FR-31-3 exception 3 + D1 explicit flag
# ----------------------------------------------------------------------------
# Returns True iff the given block slug is registered in the `blocks` table
# with tier='class-section'. Used by the per-section convention voter to gate
# the literal-slug fast-path: only class-section blocks (sgs/hero, sgs/cta-section)
# may be returned from a section-scope SGS-BEM class signature; everything
# else falls through to gap-candidate routing (Stage 2 FR-31-4 default to
# sgs/container).
#
# Cached after first call — `tier` is static for the lifetime of a pipeline run.

_CLASS_SECTION_CACHE: set[str] | None = None


def _load_class_section_cache() -> set[str]:
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slug FROM blocks WHERE tier = 'class-section'"
        ).fetchall()
        return {r[0] for r in rows}
    except sqlite3.OperationalError:
        # tier column not present yet (pre-XS-2). Soft-fail to empty set so
        # the voter degrades to "no class-section blocks", which preserves
        # historical fast-path-disabled behaviour rather than crashing.
        return set()
    finally:
        conn.close()


def is_class_section_block(slug: str) -> bool:
    """Return True iff `slug` is a registered SGS block with tier='class-section'."""
    global _CLASS_SECTION_CACHE
    if _CLASS_SECTION_CACHE is None:
        _CLASS_SECTION_CACHE = _load_class_section_cache()
    return slug in _CLASS_SECTION_CACHE


# ----------------------------------------------------------------------------
# scalar_media_attr_for — FR-31-19 composite scalar-media slot lookup
# ----------------------------------------------------------------------------
# Returns the attr_name of the 'scalar-media' attr on `block_slug` whose slot
# matches `bem_element`.  Used by _route_composite_interior in convert.py to
# decide whether a composite interior column should be lifted into a scalar attr
# (the media column) or folded as bare InnerBlocks (the content column).
#
# The DB query is intentionally cheap: it reads block_attributes once per
# (block_slug, bem_element) pair and caches the result with functools.lru_cache.
# The caller (_route_composite_interior) iterates per direct child, but the
# number of composites × their child columns is small (≤4 per section) so even
# cache-cold hits never cause measurable latency.
#
# R-31-1 compliance: no per-block slug literals.  Routing is driven entirely by
# the `block_attributes.role='scalar-media'` column and the `slots` aliases.


@functools.lru_cache(maxsize=256)
def has_scalar_media_attrs(block_slug: str) -> bool:
    """True if `block_slug` declares >=1 attr with role='scalar-media'.

    FR-31-19 gate (2026-06-01, corrected): the composite-interior router fires
    for any COMPOSITE that renders part of its interior itself as a scalar-media
    attr (sgs/hero.splitImage, sgs/testimonial-slider.sideImage) — NOT only
    class-section/section-root blocks (testimonial-slider is a composite but a
    content-block, not a section root). Gating on the PRESENCE of a scalar-media
    attr is precise: it covers every such composite AND naturally excludes blocks
    with no scalar-media attr (cta-section, info-box, product-card) so their
    interior routing is unchanged (resolves the cta-section over-fire risk).
    R-31-1: DB-driven, no slug literals; R-31-9: universal mechanism.
    """
    if not block_slug:
        return False
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT 1 FROM block_attributes WHERE block_slug = ? "
            "AND role = 'scalar-media' LIMIT 1",
            (block_slug,),
        ).fetchone()
    finally:
        conn.close()
    return row is not None


def scalar_media_attr_for(block_slug: str, bem_element: str) -> str | None:
    """Return the attr_name of the scalar-media ANCHOR row on `block_slug` for
    `bem_element` — a presence/eligibility gate, NOT necessarily the content
    family's write-target stem.

    A 'scalar-media' attr is one where:
      - block_attributes.role = 'scalar-media'  (classification='styling-behaviour'
        → equivalent_block_for returns None → walker lifts to scalar not child block)
      - Its canonical_slot aliases include `bem_element` (or canonical_slot itself
        equals `bem_element` after normalisation).

    ⚠ Wave 7b re-anchor (2026-09-02): for sgs/hero this now returns
    'splitMediaType', not 'splitImage'. Do NOT use the return value directly
    as an image/video/svg content-family stem (the old assumption, which
    happened to work only because the anchor and the image stem used to be
    the same string by coincidence). Callers building a CONTENT write target
    must resolve the family stem via `scalar_media_type_stem(block_slug,
    media_kind)` instead, for every media kind including 'image' — this
    function's only remaining job is "does a scalar-media anchor exist for
    this BEM element at all", the truthy/None gate that decides whether
    Branch A fires.

    The Mobile/Desktop distinction is the CALLER's job: this function returns the
    **base** (non-suffixed) anchor attr_name — never the '+Mobile' sibling. The
    caller appends 'Mobile'/'Tablet' to whatever stem it actually needs to write.

    Returns:
        attr_name string (e.g. 'splitMediaType') on a match, or None when the
        composite has no scalar-media attr at the given slot.

    Args:
        block_slug:  Fully-qualified block slug, e.g. 'sgs/hero'.
        bem_element: BEM element segment from the child's sgs- class, e.g.
                     'split-image', 'media', 'side-image'.

    Caching: LRU-cached per (block_slug, bem_element) pair.  Safe for repeated
    calls across a section walk.  Cache is module-level (shared across sections);
    values are static for the lifetime of a pipeline run.
    """
    return _scalar_media_attr_for_cached(block_slug, bem_element)


@functools.lru_cache(maxsize=512)
def _scalar_media_attr_for_cached(block_slug: str, bem_element: str) -> str | None:
    """LRU-cached implementation of scalar_media_attr_for."""
    import json as _json

    if not block_slug or not bem_element:
        return None

    # Normalise the element token once for matching (strip hyphens, lowercase).
    norm_elem = _normalise(bem_element)

    # Fetch all scalar-media attrs for this block from block_attributes.
    # Join to slots (scope='element') to read their canonical slot name + aliases.
    # We do NOT rely on canonical_slot being populated — Tier B (derived_selector
    # BEM element) would work too, but querying slot aliases is more robust and
    # consistent with the existing equivalent_block_for Tier A pattern.
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT ba.attr_name, ba.canonical_slot "
            "FROM block_attributes ba "
            "WHERE ba.block_slug = ? AND ba.role = 'scalar-media'",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()

    if not rows:
        _trace("db_lookup_miss", lookup="scalar_media_attr_for",
               block_slug=block_slug, bem_element=bem_element)
        return None

    # For each scalar-media attr, check whether the bem_element resolves to its slot.
    for attr_name, canonical_slot in rows:
        # Skip the '+Mobile' sibling attrs (attr_name ends with 'Mobile').
        # scalar_media_attr_for always returns the BASE attr; the caller appends 'Mobile'.
        if attr_name.endswith("Mobile"):
            continue

        # Check 1: direct canonical_slot name match (normalised).
        if canonical_slot and _normalise(canonical_slot) == norm_elem:
            _trace("db_lookup_hit", lookup="scalar_media_attr_for",
                   block_slug=block_slug, bem_element=bem_element,
                   attr_name=attr_name, match_via="canonical_slot_name")
            return attr_name

        # Check 2: look up the slot's aliases in the slots table.
        if canonical_slot:
            conn2 = sqlite3.connect(SGS_DB)
            try:
                slot_row = conn2.execute(
                    "SELECT aliases FROM slots WHERE slot_name = ? AND scope = 'element'",
                    (canonical_slot,),
                ).fetchone()
            finally:
                conn2.close()

            if slot_row and slot_row[0]:
                try:
                    aliases = _json.loads(slot_row[0])
                except (ValueError, TypeError):
                    aliases = []
                for alias in aliases:
                    if _normalise(str(alias)) == norm_elem:
                        _trace("db_lookup_hit", lookup="scalar_media_attr_for",
                               block_slug=block_slug, bem_element=bem_element,
                               attr_name=attr_name, match_via="slot_alias",
                               matched_alias=alias)
                        return attr_name

        # Check 3: fall back to normalised attr_name match (e.g. 'splitImage' → 'splitimage'
        # vs bem_element 'split-image' → 'splitimage').
        if _normalise(attr_name) == norm_elem:
            _trace("db_lookup_hit", lookup="scalar_media_attr_for",
                   block_slug=block_slug, bem_element=bem_element,
                   attr_name=attr_name, match_via="attr_name_normalised")
            return attr_name

    _trace("db_lookup_miss", lookup="scalar_media_attr_for",
           block_slug=block_slug, bem_element=bem_element)
    return None


# ----------------------------------------------------------------------------
# Variant detection — FR-31-20 (D133 2026-06-01)
# ----------------------------------------------------------------------------
# A block with multiple layout variants (hero: standard/split/video/svg-animated)
# renders the correct variant ONLY when its variant-selector attr is set. The
# cloning converter populates a variant's CONTENT (e.g. the hero's split images)
# but does not set the variant attr → the block renders its DEFAULT. FR-31-20
# closes this DB-first: each variant block declares supports.sgs.variantAttr +
# variants in block.json (→ blocks.variant_attr + variant_slots via /sgs-update),
# and the converter detects the variant from what the DRAFT extracted this run.
#
#   variant_attr_for(slug)       → the selector attr name, or None.
#   detect_variant(slug, attrs)  → the variant whose discriminating slots best
#                                  match the draft's extracted attrs, or None.
#
# R-31-1 (DB-driven — no per-block dict/slug literal). R-31-9 (one mechanism, all
# variant blocks). The detector reads the draft's extracted attrs (NOT the block's
# stored attrs) → closes the stale-data hole the $is_split band-aid had.


@functools.lru_cache(maxsize=256)
def variant_attr_for(block_slug: str) -> str | None:
    """Return the variant-selector attr name for `block_slug`, or None.

    Reads blocks.variant_attr (populated by /sgs-update from block.json
    supports.sgs.variantAttr). None when the block declares no variants OR the
    column/row is absent → the detector then skips the block (no behaviour change).
    """
    if not block_slug:
        return None
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT variant_attr FROM blocks WHERE slug = ? AND source = 'sgs'",
            (block_slug,),
        ).fetchone()
    except sqlite3.OperationalError:
        # Column absent (pre-FR-31-20 DB) — soft-fail to None.
        row = None
    finally:
        conn.close()
    return row[0] if row and row[0] else None


def _canon_slot_value(value) -> str:
    """Canonical string form of a variant discriminator's value.

    MUST behave identically to `sgs-update-v2.py::_canon_slot_value` — one
    writes `variant_slots.slot_value`, this reads it back to compare against
    the draft's extracted attrs (`detect_variant`). Duplicated on purpose
    (pure function, not a lookup dict — R-31-1 doesn't apply); see the
    writer's copy for the reasoning.
    """
    try:
        return json.dumps(value, sort_keys=True, separators=(",", ":"))
    except (TypeError, ValueError):
        return repr(value)


@functools.lru_cache(maxsize=256)
def _variant_slots_map(block_slug: str) -> tuple:
    """Return ((variant_value, frozenset((slot, slot_value_or_None))), ...).

    Reads the variant_slots table (populated by /sgs-update). `slot_value` is
    NULL for a capability-variant slot (name-only discrimination, unchanged
    behaviour — `detect_variant` treats `None` as "presence is enough") and a
    canonical JSON string for a preset-variant slot (value-aware
    discrimination, 2026-09-05 — `detect_variant` then requires an exact
    value match, not merely presence). Cached per slug — the data is static
    for a pipeline run. Returns a tuple of pairs (hashable, lru_cache-friendly);
    detect_variant consumes it.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT variant_value, unique_slot, slot_value FROM variant_slots WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        # `slot_value` column absent (pre-migration DB) — soft-fail to the
        # name-only shape rather than erroring the whole detector.
        try:
            rows = [
                (v, s, None)
                for v, s in conn.execute(
                    "SELECT variant_value, unique_slot FROM variant_slots WHERE block_slug = ?",
                    (block_slug,),
                ).fetchall()
            ]
        except sqlite3.OperationalError:
            rows = []
    finally:
        conn.close()
    grouped: dict = {}
    for variant_value, unique_slot, slot_value in rows:
        grouped.setdefault(variant_value, set()).add((unique_slot, slot_value))
    return tuple((v, frozenset(slots)) for v, slots in grouped.items())


@functools.lru_cache(maxsize=256)
def _variant_composition_slots_map(block_slug: str) -> tuple:
    """Return ((variant_value, (unique_child_slug, ...)), ...).

    Reads the `variant_composition_slots` table (populated by /sgs-update from
    the JS variant-value extractor's `innerBlockSlugs` output — Task 1/2 of the
    variant-composition-fingerprinting plan, 2026-09-05). Mirrors
    `_variant_slots_map`'s query/cache shape exactly, but the composition
    signal has no `slot_value` column — a discriminating child slug is a
    NAME-only fact (this variant's InnerBlocks seed uniquely includes this
    child block, full stop), so there's nothing analogous to preset-variant
    value-matching here. Cached per slug — static for a pipeline run, same as
    `_variant_slots_map`.

    Soft-fails to an empty tuple when the table is absent (pre-migration DB) —
    `detect_variant`'s composition tiebreak treats that as "no composition
    signal available", falling through to today's attribute-only behaviour
    exactly as it does when `child_slugs` itself is None.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT variant_value, unique_child_slug FROM variant_composition_slots "
            "WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        rows = []
    finally:
        conn.close()
    grouped: dict = {}
    for variant_value, unique_child_slug in rows:
        grouped.setdefault(variant_value, []).append(unique_child_slug)
    return tuple((v, tuple(slugs)) for v, slugs in grouped.items())


@functools.lru_cache(maxsize=256)
def _variant_composition_attr_slots_map(block_slug: str) -> tuple:
    """Return ((variant_value, ((child_slug, attr_name, canon_value), ...)), ...).

    Reads `variant_composition_attr_slots` (populated by /sgs-update from the
    JS variant-value extractor's per-child `attributes` output — the
    child-ATTRIBUTE-VALUE composition signal, 2026-09-06). Third sibling to
    `_variant_slots_map` (the parent's own attribute pairs) and
    `_variant_composition_slots_map` (uniquely-nested child slugs); same
    query/cache shape as both.

    Unlike the slug map, this one IS value-aware — a shared child slug at a
    DIFFERENT attribute value must score 0, exactly as `_slot_score` treats a
    shared attribute name at a different value. `child_attr_value` is stored in
    `_canon_slot_value`'s canonical JSON form, so scoring is one string
    comparison.

    Soft-fails to an empty tuple when the table is absent (pre-migration DB) —
    the caller then behaves exactly as it does when no child attribute data was
    supplied at all.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT variant_value, child_slug, child_attr_name, child_attr_value "
            "FROM variant_composition_attr_slots WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        rows = []
    finally:
        conn.close()
    grouped: dict = {}
    for variant_value, child_slug, attr_name, attr_value in rows:
        grouped.setdefault(variant_value, []).append((child_slug, attr_name, attr_value))
    return tuple((v, tuple(triples)) for v, triples in grouped.items())


@functools.lru_cache(maxsize=256)
def declared_variant_values(block_slug: str) -> frozenset:
    """Every variant value the block DECLARES, from the enum on `blocks.variant_attr`.

    THE DISTINCTION THIS EXISTS TO MAKE (2026-08-07). `variant_slots` answers "which
    slots DISCRIMINATE variant X?" — so a variant with no uniquely-its-own attr has no
    rows there at all. That is correct for attribute-based INFERENCE and wrong as an
    inventory of what variants exist: `sgs/trust-bar.text-only` is a real, selectable
    variant whose whole character is the ABSENCE of the icon/image attrs, so the
    set-difference can never give it a row.

    Using `variant_slots` as the value set made an explicit BEM modifier unmatchable
    for exactly those variants: a draft saying `sgs-trust-bar--text-only` fell through
    to the block default and cloned as `icon-circle`, SILENTLY. Measured on the real
    function before the fix: `detect_variant_for_node` returned `('badgeStyle', None)`
    for `--text-only` while correctly returning `image-badge` for a discriminable
    sibling. 9 variants across 4 blocks were in this state (nav-drawer 6, trust-bar
    text-only, testimonial minimal-quote, product-card standard).

    The enum on the variant-selector attr is the block's OWN declaration of its legal
    values — already populated for every variant-bearing block, so this is DB-first
    (R-31-1) with no new seeding. Empty-string members are dropped: the modifier regex
    requires at least one character, so `''` can never be matched by a class anyway.

    ⚠ This is the value set for MODIFIER matching only. `detect_variant`'s
    attribute-inference path still reads `variant_slots`, because inference genuinely
    needs discriminating slots and a variant without them cannot be inferred — only
    NAMED. An explicit modifier is direct evidence and outranks inference; that is why
    it should not be gated on the inference table.
    """
    variant_attr = variant_attr_for(block_slug)
    if variant_attr is None:
        return frozenset()
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT enum_values FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, variant_attr),
        ).fetchone()
    except sqlite3.OperationalError:
        row = None
    finally:
        conn.close()
    declared: set = set()
    if row and row[0]:
        try:
            declared = {v for v in json.loads(row[0]) if isinstance(v, str) and v}
        except (ValueError, TypeError):
            declared = set()
    # Union with variant_slots so a block whose enum is missing/unparsable keeps
    # exactly its previous behaviour rather than losing detection entirely.
    return frozenset(declared | {v for v, _slots in _variant_slots_map(block_slug)})


@functools.lru_cache(maxsize=256)
def preset_implications_for(block_slug: str) -> tuple:
    """Return ((preset_attr, enum_value, frozenset(implied_props), is_neutral), ...)
    for a block, from the `preset_implications` table (Build #3 Option B,
    AUTO-DERIVE preset-absence transfer, 2026-07-24).

    Populated by `/sgs-update` (`sgs-update-v2.py::_populate_preset_implications`)
    by parsing the block's OWN style.css against its declared
    `supports.sgs.presetSelectors` — the per-value CSS→meaning mapping is never
    hand-authored (R-31-1). Empty tuple when the block declares no preset
    selectors, or the table/column is absent (pre-seed DB, soft-fail — most
    blocks have zero rows here and this is a true no-op for them).
    """
    if not block_slug:
        return ()
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT preset_attr, enum_value, implied_property, is_neutral "
            "FROM preset_implications WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        rows = ()
    finally:
        conn.close()
    out = []
    for preset_attr, enum_value, implied_property, is_neutral in rows:
        props = frozenset(p for p in (implied_property or "").split(",") if p)
        out.append((preset_attr, enum_value, props, bool(is_neutral)))
    return tuple(out)


def attrs_for_css_property_state(
    block_slug: str, css_property: str, css_state: "str | None"
) -> "tuple[str, ...]":
    """Attrs `block_slug` declares for `css_property` at `css_state` ('hover'|None).

    Used by the preset-absence resolver's RECONCILIATION step (Component 4
    step 3): when another attr already claims the same (css_property,
    css_state) — e.g. `cardShadow` (box-shadow, base) or `scaleHover`
    (transform, hover) — that attr's WRITE presence is authoritative over a
    raw-declaration re-scan, so the two mechanisms never disagree or
    double-paint the same signal.

    ELEMENT/TIER SCOPING (qc-council finding, 2026-07-24; hardened same day).
    An unscoped match conflates the card's OWN signal attr with a per-CHILD
    attr sharing the same (css_property, css_state) — proven LIVE, not just
    theoretical: `sgs/card-grid` + `sgs/team-member` both register
    `imageZoomHover` (css_element='image', transform, hover) alongside
    `scaleHover` (css_element=NULL, transform, hover); before this fix, a
    draft where only the per-child image zooms on hover made the card's OWN
    `effectHover` wrongly resolve to 'zoom'.

    Applying the sibling functions' element/tier predicate (`_BASE_ELEMENTS` +
    `css_layer='OUTER'`, base/desktop tier — same as
    `_base_domain_attrs_for_css_property` / `attr_for_state_property`)
    unconditionally would ALSO exclude `cardShadow` on `sgs/card-grid`
    (css_element='card-tile') and `sgs/team-member` was only OUTER-tagged for
    THIS one attr — i.e. today's only two live base-state box-shadow writers
    are NOT both inside that domain (verified against sgs-framework.db,
    2026-07-24: `_base_domain_attrs_for_css_property('sgs/card-grid',
    'box-shadow')` returns `()`, not `('cardShadow',)`). A blanket predicate
    would therefore silently BREAK the working card-grid reconciliation this
    same day it hardened the transform/hover case.

    So scoping is applied ONLY once genuine ambiguity is proven (>=2 raw
    matches) — a single match (today's only live cardShadow cases, seeded
    without an OUTER/root disambiguator yet) is returned unchanged, and
    scoping never has a chance to wrongly drop it. When >=2 rows exist, the
    established element/tier predicate narrows to the block's own root/self/
    OUTER-layer signal; if that narrowing doesn't yield exactly one attr
    (still 0 or still >=2 — a genuinely unresolved case), fall back to the
    raw set rather than guessing, so this function can only ever get MORE
    correct, never regress a currently-working reconciliation.
    """
    if not block_slug or not css_property:
        return ()
    conn = sqlite3.connect(SGS_DB)
    try:
        if css_state is None:
            raw_rows = conn.execute(
                "SELECT attr_name FROM block_attributes "
                "WHERE block_slug = ? AND css_property = ? AND css_state IS NULL "
                "ORDER BY rowid",
                (block_slug, css_property),
            ).fetchall()
        else:
            raw_rows = conn.execute(
                "SELECT attr_name FROM block_attributes "
                "WHERE block_slug = ? AND css_property = ? AND css_state = ? "
                "ORDER BY rowid",
                (block_slug, css_property, css_state),
            ).fetchall()
        raw = tuple(r[0] for r in raw_rows)
        if len(raw) <= 1:
            # No ambiguity to resolve — return unchanged (preserves every
            # currently-working single-match reconciliation, incl. cardShadow
            # on card-tile/wrapper, byte-identical to pre-fix behaviour).
            return raw
        placeholders = ",".join("?" for _ in _BASE_ELEMENTS)
        if css_state is None:
            scoped_rows = conn.execute(
                "SELECT attr_name FROM block_attributes "
                "WHERE block_slug = ? AND css_property = ? AND css_state IS NULL "
                f"AND (css_element IS NULL OR css_element IN ({placeholders}) "
                "OR css_layer = 'OUTER') "
                "AND (css_tier IS NULL OR css_tier = 'desktop') "
                "ORDER BY rowid",
                (block_slug, css_property, *_BASE_ELEMENTS),
            ).fetchall()
        else:
            scoped_rows = conn.execute(
                "SELECT attr_name FROM block_attributes "
                "WHERE block_slug = ? AND css_property = ? AND css_state = ? "
                f"AND (css_element IS NULL OR css_element IN ({placeholders}) "
                "OR css_layer = 'OUTER') "
                "AND (css_tier IS NULL OR css_tier = 'desktop') "
                "ORDER BY rowid",
                (block_slug, css_property, css_state, *_BASE_ELEMENTS),
            ).fetchall()
        scoped = tuple(r[0] for r in scoped_rows)
        if len(scoped) == 1:
            return scoped
        # Scoping didn't cleanly resolve to exactly one attr (still 0 or
        # still >=2) — fail safe to the raw set rather than guessing.
        return raw
    except sqlite3.OperationalError:
        return ()
    finally:
        conn.close()


def _slot_extracted(value: object) -> bool:
    """True if `value` represents a slot the converter actually extracted.

    The detection signal is PRESENCE-of-a-meaningful-value, not truthiness: the
    lift paths (_route_composite_interior, lift_behavioural_attrs) only insert a
    key when they extracted something for it, so a present key is a real signal.
    A plain truthiness test would wrongly drop a legitimately-extracted numeric
    0 / boolean False / '0' (e.g. a variant whose discriminator is splitGap=0),
    flipping detection (qc-council 2026-06-01, Rater B). We therefore count any
    value EXCEPT None, empty string, and empty containers (which represent 'no
    real extraction' — e.g. a src-less image lifting to {} — rather than an
    intentional value).
    """
    if value is None or value == "":
        return False
    if isinstance(value, (dict, list, tuple, set, frozenset)) and len(value) == 0:
        return False
    return True


def _slot_score(slot_value: "str | None", populated_attrs: dict, unique_slot: str) -> int:
    """Score ONE discriminating slot against the draft's extracted attrs.

    `slot_value is None` — a CAPABILITY-variant slot (name-only, unchanged
    behaviour): presence of a meaningful value is the whole signal, worth 1.

    `slot_value` set — a PRESET-variant slot (value-aware, 2026-09-05): the
    extracted value must canonically EQUAL the stored value to score. This is
    the fix for the bug this mechanism exists to close — a name shared by
    every sibling variant (e.g. nav-drawer's `closeStyle`) must not score a
    hit for the WRONG variant just because the name is present; a DIFFERENT
    value at that name is worth 0, exactly the same as the name being absent
    (weak/neutral, per the design brief — never a negative score, never a
    hit).
    """
    actual = populated_attrs.get(unique_slot)
    if not _slot_extracted(actual):
        return 0
    if slot_value is None:
        return 1
    return 1 if _canon_slot_value(actual) == slot_value else 0


def _composition_attr_score(
    triples: "tuple", child_blocks: "list[tuple[str, dict]]"
) -> int:
    """Score ONE variant's child-attribute discriminators against real children.

    `triples` is that variant's `(child_slug, attr_name, canon_value)` rows;
    `child_blocks` is the draft's recognised children as `(slug, attrs)` pairs.
    A triple scores 1 when SOME child of that slug carries that attribute at
    that exact canonical value — the same value-aware contract as `_slot_score`
    for a preset-variant slot: a matching NAME at a different VALUE is worth 0,
    identical to the attribute being absent (weak/neutral, never negative,
    never a hit).

    Set semantics on the child list: several children may share a slug (a
    variant could nest two `sgs/button`s), so any one of them satisfying the
    triple is enough — order and multiplicity carry no meaning here, exactly as
    in the slug-set tiebreak above.
    """
    score = 0
    for child_slug, attr_name, canon_value in triples:
        for actual_slug, actual_attrs in child_blocks:
            if actual_slug != child_slug or not isinstance(actual_attrs, dict):
                continue
            if attr_name not in actual_attrs:
                continue
            actual = actual_attrs[attr_name]
            if not _slot_extracted(actual):
                continue
            if _canon_slot_value(actual) == canon_value:
                score += 1
                break
    return score


def _composition_attr_tiebreak(
    block_slug: str,
    tied_variants: "set[str] | frozenset[str]",
    child_blocks: "list[tuple[str, dict]] | None",
) -> str | None:
    """TIER 2 of the composition tiebreak — a nested CHILD's own attribute VALUE.

    WHY THIS TIER EXISTS (2026-09-06). Tier 1 (`_composition_tiebreak`'s slug
    set-overlap) can only separate variants whose nested child SLUG SETS
    differ. Two variants can legitimately nest the identical set of child block
    types and still be structurally different, because one of those children is
    configured differently — the measured case is `sgs/nav-drawer`'s
    `two-column-editorial` vs `floating-capped-card`: both nest exactly
    {`sgs/nav-menu`, `sgs/button`}, and `two-column-editorial` is the only
    variant across all seven whose nested `sgs/nav-menu` sets `listColumns`
    (a genuinely rendered, CSS-extractable `grid-template-columns` rule —
    `nav-menu/render.php`). Slug-uniqueness has nothing to discriminate on
    there; the child's attribute value does.

    Same discipline as tier 1: TIEBREAKER ONLY, never additive, and it returns
    the single tied variant with a STRICTLY higher score than every other tied
    variant — None on no data, a tie, or an all-zero field, so the caller falls
    through to its existing tie/miss behaviour.

    R-31-1: every (child slug, attribute, value) triple comes from
    `variant_composition_attr_slots`; no block, child or attribute is named in
    this code.
    """
    if not child_blocks:
        return None
    tied = set(tied_variants)
    if len(tied) < 2:
        return None
    attr_map = dict(_variant_composition_attr_slots_map(block_slug))
    scores = sorted(
        (
            (_composition_attr_score(attr_map.get(variant_value, ()), child_blocks), variant_value)
            for variant_value in tied
        ),
        reverse=True,
    )
    top_count, top_variant = scores[0]
    if top_count == 0:
        return None
    if len(scores) > 1 and scores[1][0] == top_count:
        return None
    _trace(
        "variant_detect_composition_attr_tiebreak_hit",
        block_slug=block_slug,
        tied=",".join(sorted(tied)),
        variant=top_variant,
    )
    return top_variant


def _composition_tiebreak(
    block_slug: str,
    tied_variants: "set[str] | frozenset[str]",
    child_slugs: "list[str] | None",
    child_blocks: "list[tuple[str, dict]] | None" = None,
) -> str | None:
    """Attempt to break an attribute-score tie using InnerBlocks composition.

    TIEBREAKER ONLY (variant-composition-fingerprinting plan, Task 3,
    2026-09-05) — never additive, never a way to detect a variant that the
    attribute signal didn't already narrow to a tie among `tied_variants`.
    Scoring is SET-OVERLAP membership (`len(variant_slugs & set(child_slugs))`),
    NOT an exact-sequence match: the walker's assembled child order reflects
    DOM order, which need not match a variant template's declaration order, so
    order isn't a meaningful part of "which variant is this" — only WHICH
    children are present is.

    Returns the single tied variant with a strictly-higher composition score
    than every other tied variant, or None when composition data is
    unavailable, still ties, or every tied variant scores 0 (no signal) — the
    caller falls through to today's existing tie/miss behaviour in every one
    of those cases.

    TWO TIERS, IN ORDER (2026-09-06):

      TIER 1 — child SLUG uniqueness (`child_slugs`, unchanged). Whenever it
      resolves, that answer is returned and tier 2 is never consulted, so this
      extension cannot change any result the slug signal already produced.

      TIER 2 — a nested child's own ATTRIBUTE VALUE (`child_blocks`, see
      `_composition_attr_tiebreak`). Reached only when tier 1 has nothing to
      discriminate on — the identical-child-slug-set case. Requires the
      caller to pass the children's real extracted attributes; a caller
      passing only `child_slugs` gets exactly the pre-2026-09-06 behaviour.
    """
    tied = set(tied_variants)
    if len(tied) < 2:
        return None
    if child_slugs:
        comp_map = dict(_variant_composition_slots_map(block_slug))
        input_slugs = set(child_slugs)
        comp_scores = sorted(
            (
                (len(set(comp_map.get(variant_value, ())) & input_slugs), variant_value)
                for variant_value in tied
            ),
            reverse=True,
        )
        top_comp_count, top_comp_variant = comp_scores[0]
        if top_comp_count > 0 and not (
            len(comp_scores) > 1 and comp_scores[1][0] == top_comp_count
        ):
            _trace(
                "variant_detect_composition_tiebreak_hit",
                block_slug=block_slug,
                tied=",".join(sorted(tied)),
                variant=top_comp_variant,
            )
            return top_comp_variant
    return _composition_attr_tiebreak(block_slug, tied, child_blocks)


def detect_variant(
    block_slug: str,
    populated_attrs: dict,
    child_slugs: "list[str] | None" = None,
    child_blocks: "list[tuple[str, dict]] | None" = None,
) -> str | None:
    """Detect a block's variant from the draft's extracted attrs THIS run.

    For each variant, sum `_slot_score` across its DISCRIMINATING slots
    (variant_slots) against `populated_attrs` this run (extracted THIS run —
    NOT the block's stored attrs). Return the variant with the
    strictly-highest score.

    A capability-variant slot (`slot_value IS NULL`) scores on PRESENCE alone,
    identical to pre-2026-09-05 behaviour. A preset-variant slot (`slot_value`
    set) scores only on an EXACT value match — a shared name at a different
    value contributes 0, never a false hit (see `_slot_score`).

    `child_slugs` (variant-composition-fingerprinting plan, Task 3, 2026-09-05)
    is the OPTIONAL recognized-child-slug list for THIS draft node (assembled
    by `assembly.py` before this call) — default `None` so every caller that
    doesn't pass it (today, none do) is byte-identical to pre-Task-3 behaviour.
    When supplied, it is consulted ONLY as a tiebreaker (see
    `_composition_tiebreak`), in two places:

      1. A 0-0(-0...) tie: `_variant_slots_map` only returns rows for variants
         that HAVE discriminating attrs at all — a variant with NONE (e.g.
         nav-drawer's `split-zone-serif`/`two-column-editorial`, whose every
         attribute value duplicates a sibling's) never appears in `scores` in
         the first place, so it can't even be a candidate for the ordinary
         tie check below. Composition can still discriminate these, so the
         candidate pool here is widened to every DECLARED variant
         (`declared_variant_values`), not just the ones `variant_slots` knows
         about.
      2. The ordinary tie check (>=2 variants matched, same top score >0):
         candidates are exactly the variants tied at that top score, per the
         existing ambiguity guard.

    `child_blocks` (child-attribute-value composition signal, 2026-09-06) is
    the OPTIONAL `[(child_slug, child_attrs_dict), ...]` list for the same
    children, carrying each recognised child's own extracted attributes rather
    than just its slug. It feeds TIER 2 of the composition tiebreak, consulted
    only when the tier-1 slug signal cannot discriminate — the case where two
    variants nest the identical set of child block types and differ only in how
    one of those children is configured (`sgs/nav-drawer`'s
    `two-column-editorial`). Default `None` keeps every caller that doesn't
    pass it byte-identical to pre-2026-09-06 behaviour.

    Returns None when:
      - the block declares no variant_slots, or
      - no variant scored above zero and composition didn't resolve it, or
      - the top score is a tie between >=2 variants and composition didn't
        resolve it either (ambiguous — leave the block's default rather than
        guess).

    R-31-1 (DB-driven, no slug literal).
    """
    variants = _variant_slots_map(block_slug)
    if not variants:
        return None
    scores = sorted(
        (
            (
                sum(_slot_score(slot_value, populated_attrs, unique_slot) for unique_slot, slot_value in slots),
                variant_value,
            )
            for variant_value, slots in variants
        ),
        reverse=True,
    )
    top_count, top_variant = scores[0]
    if top_count == 0:
        # See docstring point 1 — every declared variant is a candidate here,
        # not just the ones with variant_slots rows (those all scored 0 too,
        # but a variant absent from `variants` altogether is equally at 0 and
        # must not be excluded from the composition tiebreak).
        resolved = _composition_tiebreak(
            block_slug, declared_variant_values(block_slug), child_slugs, child_blocks
        )
        if resolved is not None:
            return resolved
        _trace("variant_detect_miss", block_slug=block_slug, reason="no_slots_matched")
        return None
    # Ambiguity guard: a tie at the top means we cannot disambiguate → leave default.
    if len(scores) > 1 and scores[1][0] == top_count:
        tied_names = {v for cnt, v in scores if cnt == top_count}
        resolved = _composition_tiebreak(block_slug, tied_names, child_slugs, child_blocks)
        if resolved is not None:
            return resolved
        tied = ",".join(v for cnt, v in scores if cnt == top_count)
        _trace("variant_detect_tie", block_slug=block_slug, top_count=top_count, tied=tied)
        return None
    _trace("variant_detect_hit", block_slug=block_slug, variant=top_variant, count=top_count)
    return top_variant


# ----------------------------------------------------------------------------
# equivalent_block_for — Spec 22 §FR-31-2.1 two-tier derivation
# ----------------------------------------------------------------------------
# Canonical implementation of the universal walker's block-equivalence question:
# "Given (block_slug, attr_name), is the attr block-equivalent — and if so,
#  which standalone block is its content emitted as?"
#
# Two tiers, in order (Tier C deleted 2026-05-27 per D85 / qc-council Rater B
# — see Spec 22 §15 F-AP-2 / F-SC-11 RESOLVED via deletion; will be re-added
# when role detection generates real Tier C inputs per parking entry
# P-SGS-UPDATE-ROLE-DETECTION-IMPROVE):
#   A. Direct join: block_attributes.canonical_slot IS NOT NULL → join
#      slot_synonyms.canonical_slot → return standalone_block.
#   B. BEM-element extraction: when canonical_slot IS NULL but derived_selector
#      is set (e.g. '.sgs-product-card__image'), extract the BEM element
#      (regex __([a-z0-9-]+)) → match against slot_synonyms.aliases
#      (JSON-decoded) → return standalone_block.
#
# FR-31-2.2 role-exclusion is applied BEFORE tier matching as a positive
# allowlist: return None when the attr's role is NOT classified
# 'content-bearing' on slot_synonyms.role_classification. Prevents the
# "typography looks like heading" trap (headlineFontSizeDesktop has
# canonical_slot='heading' but role='typography' → must NOT route content
# to a heading block). Per D85 the classification lives in the DB
# (slot_synonyms.role_classification), not in hardcoded Python frozensets
# (honours R-31-1; blub.db row 260).
#
# LRU cache (maxsize=2048): walker calls this function per-node-per-attr;
# canonical_slot + derived_selector + role are static for the lifetime of a
# pipeline run, so cached lookups are safe and necessary for the ≤2ms
# cache-warm performance threshold (FR-31-8).


@functools.lru_cache(maxsize=1)
def _content_bearing_roles() -> frozenset[str]:
    """Return the set of role names classified 'content-bearing' from the
    `roles` table (D99 2026-05-29 — was slot_synonyms.role_classification).

    D99 closes the link-href bug: the old column-based approach only set
    role_classification on slot_synonyms rows that HAD a given role; since
    no slot row had role='link-href', it was never seeded. The `roles` table
    is seeded from _ROLE_CLASSIFICATION_MAP which explicitly lists the
    content-bearing roles including link-href.

    Live row count is DB-authoritative (10 as of 2026-07-05: text-content,
    image-object, content, link-href, identity, rating + the 4 icon-* roles) —
    never hardcode the set; this accessor IS the source (R-31-1).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT role_name FROM roles WHERE classification = 'content-bearing'"
        ).fetchall()
    except sqlite3.OperationalError:
        # Table missing (migration soft-failed). Return empty — positive
        # allowlist closes by default, which is the safe direction.
        return frozenset()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


@functools.lru_cache(maxsize=1)
def _styling_behaviour_roles() -> frozenset[str]:
    """Return the set of role names classified 'styling-behaviour' from the
    `roles` table (D99 2026-05-29 — was slot_synonyms.role_classification).

    Diagnostic helper — not consulted by the gate in equivalent_block_for()
    (the gate is a positive allowlist on _content_bearing_roles()). Provided
    for downstream tooling that needs to enumerate styling-behaviour roles.

    Returns 15 roles.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT role_name FROM roles WHERE classification = 'styling-behaviour'"
        ).fetchall()
    except sqlite3.OperationalError:
        return frozenset()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)

# BEM element extractor: matches the FIRST __element segment in a selector.
# e.g. '.sgs-product-card__image' → 'image'; '.sgs-icon__glyph, [data-icon]'
# → 'glyph'; 'audio' / 'figure > a' / 'h1,h2,h3' → no match (core/* shapes).
_BEM_ELEMENT_RE = re.compile(r"__([a-z0-9-]+)")


def _extract_bem_element(selector: str) -> str | None:
    """Return the first BEM `__element` token across compound selectors.

    Extended 2026-05-30 per P-XS-4-TIER-B-FINGERPRINT-CHAIN to handle
    fingerprint-override fallback chains like
    `.sgs-hero__headline, h1, h2`. The base regex search already finds the
    first `__element` anywhere in the string, but this helper:
      1. Makes the comma-split + per-fragment intent explicit
      2. Skips fragments that have no BEM token (bare tags like `h1`, `audio`)
      3. Returns the first BEM token encountered (left-to-right priority)
    """
    if not selector:
        return None
    for fragment in selector.split(","):
        m = _BEM_ELEMENT_RE.search(fragment)
        if m:
            return m.group(1).lower()
    return None


@functools.lru_cache(maxsize=1)
def _slot_alias_to_standalone() -> dict[str, str]:
    """Return {alias_lowercase: standalone_block} from element-scope slots.

    D99: queries `slots WHERE scope='element'` (was slot_synonyms).
    Walks every row's slot_name + aliases JSON; maps each term (lowercased)
    to the row's standalone_block. Used by Tier B BEM-element matching.
    Excludes rows where standalone_block is NULL/empty.
    """
    import json
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, aliases, standalone_block FROM slots "
            "WHERE scope='element' AND standalone_block IS NOT NULL AND standalone_block != ''"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, str] = {}

    def _put(term: str, standalone: str) -> None:
        """Register `term` plus its no-hyphen variant. First writer wins so
        canonical slot names never get clobbered by hyphen-stripped aliases.

        Extended 2026-05-30 (P-XS-4-SLOT-VOCAB-GAPS) so camelCase attr names
        like `splitImage` (lowered to `splitimage`) resolve against
        kebab-case aliases like `split-image` automatically.
        """
        key = term.lower()
        if key not in out:
            out[key] = standalone
        nh = key.replace("-", "")
        if nh and nh != key and nh not in out:
            out[nh] = standalone

    for slot_name, aliases_json, standalone in rows:
        _put(slot_name, standalone)
        if aliases_json:
            try:
                for alias in json.loads(aliases_json):
                    _put(alias, standalone)
            except (ValueError, TypeError):
                pass
    return out


@functools.lru_cache(maxsize=1)
def _slot_alias_to_default_attrs() -> dict[str, dict]:
    """Return {alias_lowercase: default_attrs_dict} from element-scope slots that
    carry `standalone_block_default_attrs` (JSON). Mirrors `_slot_alias_to_standalone`
    alias expansion. Lets a slot SET attrs on its emitted block — e.g. the
    `button-primary`/`buttonSecondary`/`button-outline` slots each resolve to
    sgs/button AND set inheritStyle to the matching theme preset, and the parked
    `subheading` → sgs/heading{headingRole:'subheading'} routing. Added 2026-06-03."""
    import json
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, aliases, standalone_block_default_attrs FROM slots "
            "WHERE scope='element' AND standalone_block_default_attrs IS NOT NULL "
            "AND standalone_block_default_attrs != '' ORDER BY slot_name"
        ).fetchall()
    except sqlite3.OperationalError:
        return {}  # column absent on older DBs — no defaults
    finally:
        conn.close()
    out: dict[str, dict] = {}

    def _put(term: str, attrs: dict) -> None:
        key = term.lower()
        out.setdefault(key, attrs)
        nh = key.replace("-", "")
        if nh and nh != key:
            out.setdefault(nh, attrs)

    for slot_name, aliases_json, dattrs_json in rows:
        try:
            attrs = json.loads(dattrs_json)
        except (ValueError, TypeError):
            continue
        if not isinstance(attrs, dict) or not attrs:
            continue
        _put(slot_name, attrs)
        if aliases_json:
            try:
                for alias in json.loads(aliases_json):
                    _put(alias, attrs)
            except (ValueError, TypeError):
                pass
    return out


def slot_default_attrs_for(sgs_classes: list[str]) -> dict:
    """Per-slot default attrs for the first sgs BEM ELEMENT resolving to a slot that
    carries defaults (mirrors resolve_slug_from_bem Path 2 element matching, incl.
    the compound-element prefix-strip). E.g. `__subheading` →
    {'headingRole':'subheading'}, `__buttonSecondary` → {'inheritStyle':'secondary'}.
    Empty dict when none. Callers apply these via setdefault so any draft-extracted
    value wins (R-31-1 DB-driven, R-31-9 universal).

    ⚠ RESTORED 2026-08-07, having been deleted 2026-08-02 (Phase 1b) as an
    "ELEMENT-keyed duplicate of a working MODIFIER-keyed path". It was genuinely
    callerless at that moment, but it was not a duplicate — the two lookups are
    keyed on different things and are not interchangeable:

      * MODIFIER-keyed (`preset_style_for_element` -> `inherit_style_for_modifier`)
        reads a `--modifier` segment, and hard-reads ONLY `hit.get("inheritStyle")`.
        It cannot return any other attr, whatever the row holds.
      * ELEMENT-keyed (here) reads the `__element` segment and returns the WHOLE
        default_attrs dict.

    A subheading is an ELEMENT, not a modifier, so routing `__subheading` to
    sgs/heading with `headingRole` needs this reader; widening the modifier one
    would give a single function two keying models. The deletion note's own closing
    advice — check the call graph before declaring an accessor here dead — is worth
    extending: an accessor with zero callers may be a route that was never FINISHED
    rather than one that was abandoned. This one's data (four populated slots rows,
    the column, the seeder support) was all in place; only the caller was missing.
    """
    dmap = _slot_alias_to_default_attrs()
    if not dmap:
        return {}
    for cls in sorted(c for c in sgs_classes if c.startswith("sgs-")):
        bem = parse_sgs_bem(cls)
        if bem is None or not bem.element:
            continue
        hit = dmap.get(bem.element.lower())
        if hit:
            return dict(hit)
        if "-" in bem.element:  # compound element → try each segment (mirror Path 2b)
            for seg in bem.element.lower().split("-"):
                hit = dmap.get(seg)
                if hit:
                    return dict(hit)
    return {}


def inherit_style_presets() -> frozenset:
    """The set of `inheritStyle` preset values defined by the button-preset slots
    (derived from slots.standalone_block_default_attrs — e.g. {'primary','secondary',
    'outline'}). DB-driven so a BEM modifier matching one (`.sgs-button--secondary`)
    can set inheritStyle without a hardcoded list. Added 2026-06-03."""
    vals: set[str] = set()
    for attrs in _slot_alias_to_default_attrs().values():
        v = attrs.get("inheritStyle")
        if isinstance(v, str) and v:
            vals.add(v)
    return frozenset(vals)


def preset_style_for_element(classes, slug: str | None) -> str | None:
    """Resolve a button-style preset (``primary``/``secondary``/``outline``) from an
    element's OWN ``--modifier`` BEM classes.

    The SHARED mechanism behind BOTH the standalone ``sgs/button`` ``inheritStyle``
    clone (``services/assembly.py`` step 5) AND a composite's nested built-in CTA
    style attr (``walk.py`` foreign-identity arm, e.g. ``sgs/product-card`` ``ctaStyle``
    mirroring ``sgs/button``). Factored out so there is ONE implementation (Spec 31
    §13.5 preset-modifier detection; R-31-9 universal, R-31-1 DB-driven — no attr-name
    or slug literal). ``inherit_style_presets()`` resolves a direct preset modifier;
    ``inherit_style_for_modifier()`` resolves the slots alias channel (e.g. ``--ghost``
    → ``outline``). ``slug`` = the block whose alias vocabulary to consult (the button
    identity). Returns the resolved preset string, or ``None`` when no modifier resolves
    — the caller decides the fallback (assembly's ``'custom'`` vs a composite leaving
    its block default)."""
    presets = inherit_style_presets()
    for cls in (classes or []):
        if not isinstance(cls, str):
            continue
        bem = parse_sgs_bem(cls)
        if bem is None or not bem.modifier:
            continue
        mod = bem.modifier.lower()
        if mod in presets:
            return mod
        alias = inherit_style_for_modifier(mod, slug)
        if alias:
            return alias
    return None


def style_preset_attrs_for_identity(parent_slug: str, identity_slug: str) -> list[str]:
    """Return ``parent_slug``'s OWN string style-preset attr(s) that mirror the
    ``identity_slug`` block's ``inheritStyle`` — i.e. ``role='behaviour'`` string
    attrs whose ``canonical_slot`` maps (via ``slots.standalone_block``) to
    ``identity_slug``. e.g. ``('sgs/product-card','sgs/button') -> ['ctaStyle']``.

    Distinct from ``content_attrs_for_identity``/``equivalent_block_for``, which
    EXCLUDE non-content roles (FR-31-2.2 positive-allowlist) and so never surface a
    style-preset attr. This uses the SAME ``canonical_slot → standalone_block`` Tier-A
    map, minus the content-role filter — so the composite nested-CTA mirror
    (``walk.py`` foreign-identity arm) can find ``ctaStyle`` the way the standalone
    button finds ``inheritStyle``. DB-driven, no attr-name/slug literal (R-31-1); the
    caller gates on the identity declaring a string ``inheritStyle`` and resolves the
    value via ``preset_style_for_element`` (Spec 31 §13.5)."""
    if not parent_slug or not identity_slug:
        return []
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name, canonical_slot, role, attr_type "
            "FROM block_attributes WHERE block_slug = ?",
            (parent_slug,),
        ).fetchall()
    finally:
        conn.close()
    slot_map = _slot_alias_to_standalone()
    out: list[str] = []
    for attr_name, canonical_slot, role, attr_type in rows:
        if (
            role == "behaviour"
            and attr_type == "string"
            and canonical_slot
            and slot_map.get(canonical_slot.lower()) == identity_slug
        ):
            out.append(attr_name)
    return out


@functools.lru_cache(maxsize=256)
def variation_attrs_for(block_slug: str, variation_name: str) -> dict:
    """Return the full attribute seed for a block variation, or {} if none.

    ⛔ THE `variations` TABLE WAS RETIRED AND DROPPED 2026-08-02 (D469).
    This accessor therefore always returns {} — it soft-fails on the absent
    table, which is why it and its tests still pass. It is kept, rather than
    deleted, so the button-preset-seed feature has a seam to be wired into if
    it is ever actually built.

    ⛔ DO NOT RECREATE THE TABLE to "fix" this. It duplicated `variant_slots` +
    `blocks.variant_attr` (FR-31-20), which hold the same hero
    split/standard/video/svg-animated concepts WITH their discriminating slots,
    and it had ZERO production callers — only these tests and a trace line.
    Of its 205 rows: 161 were an orphaned WP+WooCommerce registry scrape whose
    upstream MCP database no longer exists, 41 `sgs` rows had no declaration in
    any block.json, and only the 3 `sgs/button` rows were regenerable — verbatim
    from `button/block.json`'s own `"variations"` key, which is WP-native STYLE
    variation data and the correct source for it.

    If the button-preset seed is wired up, read `block.json` directly rather
    than reviving a DB mirror that nothing maintained.
    Archived rows: `scripts/data/retired/variations.json.gz`.

    Historical behaviour (pre-retirement): read `variations.attributes_json` for
    (block_slug, variation_name), preferring source='sgs'. Returns a parsed
    dict; {} on missing row / null / malformed JSON.
    """
    if not block_slug or not variation_name:
        return {}
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT attributes_json FROM variations "
            "WHERE block_slug = ? AND variation_name = ? "
            "ORDER BY (source = 'sgs') DESC LIMIT 1",
            (block_slug, variation_name),
        ).fetchone()
    except sqlite3.OperationalError:
        # Table absent (pre-seed DB) — soft-fail to no seed.
        row = None
    finally:
        conn.close()
    if not row or not row[0]:
        _trace("db_lookup_miss", lookup="variation_attrs_for",
               block_slug=block_slug, variation_name=variation_name)
        return {}
    try:
        parsed = json.loads(row[0])
    except (ValueError, TypeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def inherit_style_for_modifier(mod: str, block_slug: str | None) -> str | None:
    """Resolve a BEM style ``--modifier`` that is NOT itself a preset value to an
    inheritStyle preset via the slots alias→default_attrs channel (R-31-1).

    Probes the DB-declared alias vocabulary with the modifier compounded with the
    block's identity token (``'ghost'`` on ``sgs/button`` → ``ghost-button`` /
    ``button-ghost`` / no-hyphen variants), mirroring the compound-element segment
    convention used by ``_slot_default_attrs_for_classes``. Returns the preset
    string or None. A new synonym is a slots ``aliases`` seed — never a code
    branch. (QC fix 2026-07-05: replaces the assembly.py hardcoded
    ``'ghost'→'outline'`` branch, whose own comment admitted it was shaped to
    evade cheat-gate Check #9.)
    """
    if not mod:
        return None
    dmap = _slot_alias_to_default_attrs()
    if not dmap:
        return None
    mod_l = mod.lower()
    # COMPOUND probes ONLY (reviewer M1 hardening, 2026-07-05): the alias map is
    # GLOBAL (not block-scoped), so a bare-modifier probe would let a future
    # bare alias row leak across every string-inheritStyle block. Requiring the
    # block-identity compound makes block-scoping a structural guarantee, not a
    # DB-seeding discipline.
    probes: list[str] = []
    if block_slug and "/" in block_slug:
        ident = block_slug.split("/", 1)[1].lower()
        probes = [f"{mod_l}-{ident}", f"{ident}-{mod_l}"]
    for probe in probes:
        hit = dmap.get(probe) or dmap.get(probe.replace("-", ""))
        if hit:
            v = hit.get("inheritStyle")
            if isinstance(v, str) and v:
                return v
    return None


@functools.lru_cache(maxsize=2048)
def emit_shape_for(block_slug: str, attr_name: str) -> str | None:
    """Return the nested-vs-child shape for a CONTENT attr: 'nested' | 'child' | None.

    Spec 31 §13.3 FR-31-2.6 (2026-07-04). The per-attr fork that REPLACES the
    block-level `has_inner_blocks` dispatch:
      - 'nested' → the block's own render emits this attr as its element → lift the
        draft content into the parent's scalar/array attr (processed per its IDENTITY,
        `equivalent_block_for`).
      - 'child'  → the content lives in the `$content` region → emit a child InnerBlock
        of the identity's standalone_block + recurse.
      - None     → not a content attr, or `emit_shape` not seeded (a non-content role,
        or a block the seeder flagged as a suspected parse failure). A None on a genuine
        content unit is a tracked GAP for the caller, never a silent drop (Rule 4) —
        enforced at walk.py leg 2 since D277 (2026-07-05).

    Seeding state (verified D277): every sgs/* content-role row is seeded
    (139/139 — 106 nested + 33 child). The only NULL rows are core/* blocks,
    unseeded BY DESIGN: the seeder derives from block SOURCE (render.php/
    save.js), which core blocks don't have in this repo — and no draft element
    can resolve to a core block through the walk (slots.standalone_block has
    zero core/* targets), so those rows are unreachable, not a gap.

    Source-of-truth: `block_attributes.emit_shape`, seeded from block SOURCE by
    `/sgs-update` (`_populate_emit_shape`) — read here as a plain DB fact (R-31-1),
    not a live PHP scan.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT emit_shape FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()
    return row[0] if row and row[0] in ("nested", "child") else None


@functools.lru_cache(maxsize=2048)
def equivalent_block_for(block_slug: str, attr_name: str) -> str | None:
    """Return the standalone block slug if (block_slug, attr_name) is block-equivalent,
    else None.

    Spec 22 §FR-31-2.1 two-tier derivation + §FR-31-2.2 role-exclusion.
    (Tier C deleted 2026-05-27 per D85 / qc-council Rater B — see module
    docstring above. Re-introduction gated on
    P-SGS-UPDATE-ROLE-DETECTION-IMPROVE generating real Tier C inputs.)

    Performance: cached per (block_slug, attr_name); cache size 2048 sized for the
    walker's per-node-per-attr call pattern across a full body-section run.

    Examples:
        equivalent_block_for('sgs/product-card', 'description')   -> 'sgs/text'
        equivalent_block_for('sgs/hero', 'headlineFontSizeDesktop') -> None
            (Tier A matches canonical_slot='heading' but role='typography' → excluded)
        equivalent_block_for('sgs/back-to-top', 'position')       -> None
            (triple-NULL; no tier matches)
        equivalent_block_for('sgs/icon', 'iconSource')            -> 'sgs/icon'
            (Tier B: derived_selector='.sgs-icon__glyph...', elem='glyph' →
             slot_synonyms.icon.aliases contains 'glyph' → standalone='sgs/icon')
    """
    if not block_slug or not attr_name:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT canonical_slot, derived_selector, role "
            "FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()

    if row is None:
        return None

    canonical_slot, derived_selector, role = row

    # FR-31-2.2 role-exclusion as positive-allowlist (D85 2026-05-27 — moved
    # from hardcoded frozenset to DB-driven query of slot_synonyms.role_classification
    # per Rater B finding; honours R-31-1).
    #
    # The original negative-blocklist `if role and role in _ROLE_EXCLUSION_ALLOWLIST`
    # short-circuited on falsy role (NULL/empty), letting 171 rows with
    # canonical_slot set + role NULL through to tier resolution. The 3 confirmed
    # misroutes were sgs/cta-section.textTransform / sgs/hero.textTransform /
    # sgs/info-box.textTransform — all returned 'sgs/text' because
    # canonical_slot='text' matched slot_synonyms.aliases but role-NULL
    # bypassed the exclusion check.
    #
    # Positive-allowlist closes the hole: a row's content is routed via
    # block-equivalence ONLY when role is explicitly content-bearing per the
    # DB-driven classification. Role-NULL → return None. Role in
    # styling/behaviour set → return None. Role unknown to either set → return
    # None (defensive — new roles must be classified before routing).
    if role not in _content_bearing_roles():
        return None

    # Tier A — direct join: canonical_slot → slot_synonyms.standalone_block
    if canonical_slot:
        standalone = _slot_alias_to_standalone().get(canonical_slot.lower())
        if standalone:
            return standalone
        # canonical_slot set but no standalone_block on slot_synonyms row
        # → falls through to next tier (defensive; should be rare).

    # Tier B — BEM-element from derived_selector → slot.aliases match.
    # Compound selectors split + per-fragment scan via _extract_bem_element
    # (P-XS-4-TIER-B-FINGERPRINT-CHAIN, 2026-05-30).
    if derived_selector:
        element = _extract_bem_element(derived_selector)
        if element:
            standalone = _slot_alias_to_standalone().get(element)
            if standalone:
                return standalone

    # Tier B2 (2026-05-30 P-XS-4-SLOT-VOCAB-GAPS) — attr-name fallback alias
    # lookup. Resolves cases where Tier A's canonical_slot points to a
    # layout-only slot with no standalone_block (e.g. `splitImage` resolves
    # to canonical_slot=`split` via property-suffix peel; `split` has no
    # standalone_block; but the camelCase attr-name `splitimage` matches the
    # `media.splitimage` alias and routes to sgs/media). Also covers attrs
    # where property-suffix peel produced an empty stem (e.g. attr_name
    # `image` peels to empty + role=`image-object`; full name `image` matches
    # `media.image` alias).
    alias_lookup = _slot_alias_to_standalone()
    nh_attr = attr_name.lower().replace("-", "")
    for key in (attr_name.lower(), nh_attr):
        standalone = alias_lookup.get(key)
        if standalone:
            return standalone

    return None


# ----------------------------------------------------------------------------
# Commit 2 — cross-node routing helpers (FR-31-5.3, 2026-06-10)
# ----------------------------------------------------------------------------
# Three pure DB-lookup functions required by the cross-node interior box-CSS
# routing step (`_route_interior_css_to_parent_slot`) described in
# STAGE1-DESIGN.md §Commit 2.  None of these functions modify the DB or the
# converter state — they are pure read-only lookups.
#
# Background:
#   The walker encounters a child DOM node whose BEM element belongs to a slot
#   on the PARENT composite block (e.g. `.sgs-hero__content`).  Before routing
#   the child's CSS to the parent, the walker must decide:
#     (a) Is the slot CONTENT-BEARING?  If yes → the CSS belongs to a child
#         InnerBlock, not to the parent's per-slot layout attr (D1 path).
#     (b) If NOT content-bearing → which parent attr owns this CSS for the
#         given layer (OUTER / CONTENT / GRID)?
#     (c) Does the parent have a dedicated child block that resolves this
#         element token?  (parent-scoped child-block resolution, FR-31-5.3
#         clause 5.)
#
# Design decisions used here:
#   DEC-1 (D194) — `canonical_slot` is NOT the structural-CSS routing key.
#   DEC-3 (D194) — Layer prefix families: OUTER = '' (unprefixed wrapper attrs),
#                  CONTENT = 'content', GRID = 'gridItem'.
#   R-31-1        — Pure DB lookups; no hardcoded per-slug dicts.
#   R-31-9        — Universal: applies to all 29 container-mirror composites.


@functools.lru_cache(maxsize=4096)
def slot_has_equivalent_block(block_slug: str, slot_name: str) -> bool:
    """CONTENT-fork predicate: does `block_slug` have a content-bearing attr
    tagged with `canonical_slot = slot_name`?

    Purpose (Spec 22 FR-31-5.3 / STAGE1-DESIGN.md §Commit 2 step 2):
        Before routing a child element's CSS to the parent's per-slot attr group,
        the walker must confirm the slot is NOT already served by a child InnerBlock
        (the D1 content path).  This predicate fires the CONTENT fork when True —
        meaning the CSS stays with the child block, not the parent's layout attrs.

    Contract:
        SELECT 1 FROM block_attributes
        WHERE block_slug = ? AND canonical_slot = ?
          AND role IN (<content-bearing roles>)
        LIMIT 1

    The query is SLOT-KEYED (``canonical_slot``), NOT attr-keyed.  The existing
    ``equivalent_block_for(block_slug, attr_name)`` function queries
    ``WHERE block_slug=? AND attr_name=?``; passing a slot name to it returns None
    for every call because slot names are never stored in ``attr_name``.  That
    is exactly the bug class this predicate exists to avoid.

    Content-bearing role set (DB-authoritative, queried live via
    ``_content_bearing_roles()``; do NOT duplicate here — R-31-1):
        text-content, image-object, content, link-href, identity
    Evidence: ``_ROLE_CLASSIFICATION_MAP`` in this module + the ``roles`` table
    seeded by ``_migrate_roles_table()``.

    Returns False for ``role='layout'`` rows (layout is NOT content-bearing;
    e.g. ``sgs/hero.contentPaddingTop`` has ``canonical_slot='content'`` +
    ``role='layout'`` and MUST return False so the CSS is routed to the parent's
    ``contentPadding*`` attrs, not emitted as a child InnerBlock).

    Args:
        block_slug:  Fully-qualified SGS slug, e.g. ``'sgs/hero'``.
        slot_name:   Canonical slot name, e.g. ``'heading'``, ``'content'``,
                     ``'media'``.

    Returns:
        True  — at least one attr on ``block_slug`` has ``canonical_slot=slot_name``
                AND its role is content-bearing.
        False — no such attr exists, OR all matching attrs have non-content-bearing
                roles (layout / styling / behaviour / NULL).
    """
    if not block_slug or not slot_name:
        return False

    content_roles = _content_bearing_roles()
    if not content_roles:
        # Migration soft-failed — safe default: treat as non-content (layout path).
        return False

    # Build a parameterised IN clause from the frozenset.
    # SQLite supports up to 999 parameters; the role set has at most 5 entries.
    placeholders = ",".join("?" for _ in content_roles)
    params = (block_slug, slot_name, *content_roles)

    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            f"SELECT 1 FROM block_attributes "
            f"WHERE block_slug = ? AND canonical_slot = ? "
            f"AND role IN ({placeholders}) "
            f"LIMIT 1",
            params,
        ).fetchone()
    except sqlite3.OperationalError:
        return False
    finally:
        conn.close()

    result = row is not None
    _trace(
        "slot_has_equivalent_block",
        block_slug=block_slug,
        slot_name=slot_name,
        result=result,
    )
    return result


# Layer prefix map (DEC-3, D194).  These are the ONLY three permitted layer
# names for ``attr_for_layer_property``.  The values are the camelCase prefix
# that the block's attr names carry for that layer.
# R-31-1 permitted-constant: these are CSS-architecture constants (the 3-layer
# model from Spec 22 FR-31-21), not per-block data.  There is no DB table for
# layer prefixes.
_LAYER_PREFIXES: dict[str, str] = {
    "OUTER":   "",          # unprefixed wrapper attrs: maxWidth, gap, padding*
    "CONTENT": "content",   # content-area attrs:       contentWidth, contentPadding*
    "GRID":    "gridItem",  # per-grid-item attrs:      gridItemPadding, gridItemShadow
}


def layer_attr_prefix(layer: str) -> str | None:
    """Return the camelCase attr prefix for a structural layer (OUTER/CONTENT/GRID).

    The single public accessor for ``_LAYER_PREFIXES`` (GRID -> 'gridItem') so callers
    identify a layer's attr family WITHOUT hardcoding the prefix literal (R-31-1). Used
    by build_block_markup to apply setdefault (CSS-pass-wins) semantics to the uniform
    grid-item fold, mirroring the frozen ``_lift_uniform_grid_item_css`` setdefault
    contract (convert.py:2888). Returns None for an unknown layer.
    """
    return _LAYER_PREFIXES.get(layer)

# CSS property equivalence for the CONTENT layer: max-width on a content-area
# element is semantically the content-width constraint, equivalent to ``width``
# for attr-matching purposes.  This mirrors the existing converter logic at
# convert.py line 3800 where ``max-width`` is lifted directly into
# ``contentWidth``.  (R-31-1 permitted-constant: CSS standard knowledge.)
_CONTENT_LAYER_MAX_WIDTH_EQUIV: frozenset[str] = frozenset({"max-width", "width"})


class AmbiguousLayerAttrError(RuntimeError):
    """MF-4 (Spec 31 §3 step 3 / FR-31-2.8.4): a (block, layer, css_property)
    lookup matched ≥2 registered attrs. A silent rowid-first pick between them
    is insert-order-fragile and misroutes CSS — fail loud instead (raise, never
    assert, STOP-27). Resolution: declare the css_property/css_layer columns
    on the correct attr via ``block_attributes.css_element``/``css_state``/
    ``css_tier`` (see the COLUMN-FIRST branch of ``attr_for_layer_property``
    below) or remove the duplicate attr registration. A
    ``block_selectors.element`` disambiguator was proposed for this and
    REJECTED on 2026-06-20 (F6 design v2,
    .claude/plans/archive/2026-06-20-f6-db-consistency-design.md — the
    resolver has zero non-comment references to ``block_selectors``, so a row
    there has no effect on routing)."""


@functools.lru_cache(maxsize=2048)
def attr_for_layer_property(
    block_slug: str,
    layer: str,
    css_property: str,
) -> "str | None":
    """Per-block layer → attr resolver for structural box CSS.

    Given ``(block_slug, layer, css_property)``, returns the block's ACTUAL
    ``attr_name`` from its registered attrs for that CSS property at that layer.

    Purpose (Spec 22 FR-31-5.3 / STAGE1-DESIGN.md §Commit 2 step 2, DEC-1/DEC-3):
        When the CONTENT fork is False (the slot is NOT content-bearing), the
        cross-node step lifts the child element's structural box CSS onto the
        parent composite's layer-specific attr.  This function resolves WHICH
        attr receives the value.

    Mechanism (name-free, per DEC-1 D194):
        The destination attr is found by layer-prefix + ``property_suffixes``
        membership — never by matching ``canonical_slot``.  This avoids the
        ``canonical_slot``-as-routing-key trap (see WRAPPER-CSS-ROUTING-DESIGN-
        GATE.md).

    Layer → attr prefix map (DEC-3, D194):
        OUTER    → '' (unprefixed)  e.g. ``maxWidth``, ``gap``, ``paddingTop``
        CONTENT  → 'content'        e.g. ``contentWidth``, ``contentPaddingTop``
        GRID     → 'gridItem'       e.g. ``gridItemPadding``, ``gridItemShadow``

    Algorithm (per-block lookup, NOT prefix concatenation):
        1. Resolve the layer prefix from ``_LAYER_PREFIXES``.
        2. Collect ALL ``property_suffixes`` rows for ``css_property`` (ordered
           by rowid for determinism, matching ``attr_for_property``).
           For the CONTENT layer and ``max-width``, ALSO include ``property_suffixes``
           rows for ``width`` — ``max-width`` on a content-area element is
           semantically the content-width constraint and maps to ``contentWidth``
           (mirrors convert.py line 3800; ``_CONTENT_LAYER_MAX_WIDTH_EQUIV``).
        3. For each (suffix, role) row, derive the camelCase attr candidate:
             • CONTENT/GRID layers: prefix + suffix[0].lower() + suffix[1:]
               e.g. (CONTENT, 'Width') → 'contentWidth'
             • OUTER layer: suffix[0].lower() + suffix[1:]
               e.g. (OUTER, 'MaxWidth') → 'maxWidth'
        4. Check whether ``block_slug`` has that attr in its ``block_attributes``.
           First match wins (preserves ``property_suffixes`` rowid ordering).
        5. Return the matched ``attr_name``, or None when the block has no matching
           attr for this layer/property combination.
           Callers log a gap-candidate on None (flag-not-drop, FR-31-21 step 6).

    Rationale for per-block lookup (NOT string concat):
        Attr names vary per block.  Hero historically used ``contentMaxWidth*``
        where other blocks use ``contentWidth``; a ``{prefix}+{suffix}`` concat
        cannot generate both from a single ``max-width`` signal without knowing
        which suffix the block registered its attr under.  The per-block lookup
        lets the DB tell us the actual attr name.  As of commit e49ff126 (2026-06-09)
        hero's ``contentMaxWidth*`` was deduped to ``contentWidth``, but the per-
        block lookup is retained for robustness against any future variance.

    Args:
        block_slug:    Fully-qualified SGS slug, e.g. ``'sgs/hero'``.
        layer:         One of ``'OUTER'``, ``'CONTENT'``, ``'GRID'``.
        css_property:  CSS property name, e.g. ``'max-width'``, ``'padding-top'``.

    Returns:
        The block's ``attr_name`` that owns ``css_property`` at ``layer``, or None.

    Examples:
        attr_for_layer_property('sgs/hero', 'CONTENT', 'max-width')   → 'contentWidth'
        attr_for_layer_property('sgs/container', 'OUTER', 'max-width') → 'maxWidth'
        attr_for_layer_property('sgs/hero', 'OUTER', 'padding-top')   → None
            (sgs/hero's paddingTop is NOT an OUTER-layer attr — hero exposes padding
            via contentPadding*, not unprefixed paddingTop)
        attr_for_layer_property('sgs/banana', 'CONTENT', 'gap')        → None
            (block does not exist)
    """
    if not block_slug or not css_property:
        return None

    prefix = _LAYER_PREFIXES.get(layer)
    if prefix is None:
        # Unknown layer name — caller error; soft-fail.
        _trace(
            "attr_for_layer_property_unknown_layer",
            block_slug=block_slug,
            layer=layer,
            css_property=css_property,
        )
        return None

    # COLUMN-FIRST (declarative, FR-31-5.2/5.3, D281). A block that DECLARES this
    # css_property at this layer wins over suffix name-guessing. The MF-4 loud-fail
    # contract is PRESERVED: ≥2 declared attrs for one (block, layer, property)
    # raise AmbiguousLayerAttrError (never a rowid-pick). An undeclared property
    # returns () → the suffix loop below runs UNCHANGED (parity-neutral).
    _declared = declared_attrs_for_css_property(
        block_slug, css_property, css_layer=layer, base_only=True
    )
    if len(_declared) > 1:
        raise AmbiguousLayerAttrError(
            f"MF-4 (column): ({block_slug}, {layer}, {css_property}) DECLARES "
            f"{len(_declared)} candidate attrs {list(_declared)} via css_property/"
            f"css_layer — refusing to pick. Fix the ATTR_CLASSIFICATION_OVERRIDES "
            f"declaration so only one attr owns this (layer, property)."
        )
    if _declared:
        _trace(
            "attr_for_layer_property_column",
            block_slug=block_slug, layer=layer,
            css_property=css_property, attr_name=_declared[0],
        )
        return _declared[0]

    # Collect property_suffixes rows for the given css_property.
    # For CONTENT layer + max-width, also include 'width' rows so that
    # max-width on a content element maps to contentWidth (mirrors convert.py:3800).
    css_properties_to_try: list[str] = [css_property]
    if layer == "CONTENT" and css_property in _CONTENT_LAYER_MAX_WIDTH_EQUIV:
        # Add the complementary property so both 'max-width' and 'width' are
        # tried (deduplication via seen-set in the loop below).
        for equiv in _CONTENT_LAYER_MAX_WIDTH_EQUIV:
            if equiv != css_property:
                css_properties_to_try.append(equiv)

    conn = sqlite3.connect(SGS_DB)
    try:
        # Fetch suffix rows for each css_property candidate, preserving
        # original property rowid order (primary css_property first, then equiv).
        all_suffix_rows: list[tuple[str, str]] = []
        seen_suffixes: set[str] = set()
        for cp in css_properties_to_try:
            rows = conn.execute(
                "SELECT suffix, role FROM property_suffixes "
                "WHERE css_property = ? ORDER BY rowid",
                (cp,),
            ).fetchall()
            for suffix, role in rows:
                if suffix and suffix not in seen_suffixes:
                    seen_suffixes.add(suffix)
                    all_suffix_rows.append((suffix, role))
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()

    if not all_suffix_rows:
        return None

    # Load this block's attr map (cached by block_attrs).
    block_attr_map = block_attrs(block_slug)
    if not block_attr_map:
        return None

    # Derive candidate attr names and collect EVERY match (MF-4, Spec 31 §3
    # step 3 / FR-31-2.8.4: when ≥2 candidate attrs exist for one (block,
    # layer, property), FAIL LOUD — never silently rowid-pick the first).
    matches: list[str] = []
    for suffix, _role in all_suffix_rows:
        # Build camelCase suffix (PascalCase suffix → camelCase).
        camel_suffix = suffix[0].lower() + suffix[1:]

        if prefix:
            # CONTENT or GRID layer: prefix the suffix.
            candidate = prefix + suffix[0].upper() + suffix[1:]
        else:
            # OUTER layer: suffix IS the full attr name (camelCase).
            candidate = camel_suffix

        if candidate in block_attr_map and candidate not in matches:
            matches.append(candidate)

    if len(matches) > 1:
        # MF-4 hard guard: an insert-order rowid-pick between two registered
        # attrs would be a silent misroute. Empirically ZERO (block, layer,
        # property) combos are ambiguous on the live DB (enumerated
        # 2026-07-04), so this raise is behaviour-identical today; it fires
        # only if a future block registers both attrs of an ambiguous pair —
        # the fix is declaring css_property/css_layer on the correct attr via
        # block_attributes.css_element/css_state/css_tier (the COLUMN-FIRST
        # branch above), not a block_selectors.element disambiguator — that
        # mechanism was proposed and REJECTED 2026-06-20 (F6 design v2,
        # .claude/plans/archive/2026-06-20-f6-db-consistency-design.md:28-31 —
        # the resolver has zero non-comment references to block_selectors).
        raise AmbiguousLayerAttrError(
            f"MF-4: ({block_slug}, {layer}, {css_property}) resolves to "
            f"{len(matches)} candidate attrs {matches} — refusing to "
            f"rowid-pick. Declare css_property/css_layer on block_attributes "
            f"(css_element/css_state/css_tier) for the correct attr, or "
            f"remove the duplicate attr registration."
        )

    if matches:
        _trace(
            "attr_for_layer_property_hit",
            block_slug=block_slug,
            layer=layer,
            css_property=css_property,
            attr_name=matches[0],
        )
        return matches[0]

    _trace(
        "attr_for_layer_property_miss",
        block_slug=block_slug,
        layer=layer,
        css_property=css_property,
    )
    return None


class AmbiguousAreaAttrError(RuntimeError):
    """Spec 31 §3.A L4 (per-area resolver): the declarative
    ``(block_slug, css_property, css_element=area)`` route matched ≥2 registered attrs
    EVEN restricted to the base-resolver domain (base/desktop tier, base state). A
    silent rowid-first pick misroutes a draft area's CSS — fail loud instead (mirrors
    ``AmbiguousCssPropAttrError`` / ``AmbiguousLayerAttrError``, Bean fail-loud policy;
    the callers do not catch it — a genuine two-attr contention is a data bug to fix,
    not to silently paper over). Proven 0-residual on current data (2026-07-23, after
    the hero split-image-height duplicate was de-routed); guards future drift.
    Resolution: a css_state/css_tier disambiguator, or remove the duplicate row."""


@functools.lru_cache(maxsize=512)
def attr_for_area_property(
    block_slug: str,
    area: str,
    css_property: str,
) -> "str | None":
    """Per-block GRID-PER-AREA (L4) → attr resolver: which attr owns the CSS a draft's
    NAMED grid sub-area (``content`` / ``media`` …) declares.

    DECLARATIVE (2026-07-23, qc-council-validated — replaces the former fuzzy
    ``areaName + PropertySuffix`` name-build). Match ``block_attributes`` on
    ``css_property`` + ``css_element = area``, restricted to the base-resolver domain
    (``css_tier IN (NULL,'desktop')``, ``css_state IS NULL``; the tier/state siblings are
    re-appended by fold_helpers.route_area_css_to_block_attrs's own tier mapping,
    Spec 31 §3.A.4). Exactly one → return;
    ≥2 → raise ``AmbiguousAreaAttrError`` (never rowid-pick); zero → None (honest gap;
    caller gap-tracks — flag-not-drop, Spec 31 §3.A.8).

    Why declarative beats the old name-build (measured differential, 2026-07-23,
    qc-council rater): the name-build glued ``area`` + a ``property_suffixes`` suffix and
    DB-existence-checked the built NAME — blind to ``css_state``/``css_tier`` and to the
    attr's real ``css_element``, so a RESTING declaration could land on a HOVER attr
    (option-picker ``pill``, tabs ``panel``) and it matched by NAME an attr whose real
    element differs (social-icons ``iconColour`` is element=``item``, not ``icon``). It
    silently MISSED 213 correct routes (attrs whose name doesn't follow the convention)
    and WRONG-routed 6; the declarative match is blind to none of those axes and loses
    ZERO correct routes (the 6 it drops are all wrong). Where a draft area token matches
    no ``css_element`` the declarative gaps — but so did the name-build (it builds a
    non-existent attr), so no correct route is lost.

    The former ``Band*`` skip (guarding the content/contentBand name-collision) is
    UNNECESSARY here: ``contentBandPadding*`` carry ``css_property=NULL`` so they never
    enter this equality match (verified) — the collision cannot occur by construction.
    """
    if not block_slug or not area or not css_property:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND css_property = ? AND css_element = ? "
            "AND (css_tier IS NULL OR css_tier = 'desktop') "
            "AND css_state IS NULL "
            "ORDER BY rowid",
            (block_slug, css_property, area),
        ).fetchall()
    except sqlite3.OperationalError:
        # css_element/css_property/css_state/css_tier columns absent (pre-seed DB).
        return None
    finally:
        conn.close()

    if len(rows) > 1:
        raise AmbiguousAreaAttrError(
            f"attr_for_area_property({block_slug!r}, {area!r}, {css_property!r}): "
            f"{len(rows)} base-domain attrs match ({', '.join(r[0] for r in rows)}); "
            "add a css_state/css_tier disambiguator or remove the duplicate registration."
        )
    if rows:
        _trace(
            "attr_for_area_property_hit",
            block_slug=block_slug,
            area=area,
            css_property=css_property,
            attr_name=rows[0][0],
        )
        return rows[0][0]

    _trace(
        "attr_for_area_property_miss",
        block_slug=block_slug,
        area=area,
        css_property=css_property,
    )
    return None


@functools.lru_cache(maxsize=256)
def child_block_for_parent_token(
    parent_block: str,
    element_token: str,
) -> "str | None":
    """Parent-scoped child-block resolver (FR-31-5.3 clause 5).

    Given ``(parent_block, element_token)``, returns the child block slug whose
    DB-derived token matches ``element_token`` within ``parent_block``'s roster,
    or None when no match exists.

    Purpose (STAGE1-DESIGN.md §Commit 2 build contract, parent-scoped resolution):
        The global ``slots`` alias table mis-resolves child-item tokens when the
        parent has a dedicated child block.  Two confirmed collisions:

          • ``sgs/accordion`` + ``item``  → global alias ``card.item`` → ``sgs/info-box``
            (wrong); correct → ``sgs/accordion-item``.
          • ``sgs/form`` + ``step``       → step alias → ``sgs/process-steps``
            (wrong); correct → ``sgs/form-step``.

        A parent-scoped pre-check that beats the global alias resolves both
        without a per-slug Python branch (R-31-1 / R-31-9).

    Mechanism — pure DB lookup via ``blocks.parent_block``:
        ``blocks.parent_block`` is itself derived STRAIGHT from each block's own
        block.json ``parent`` array (first entry only) by
        ``scripts/sgs-update-v2.py``'s Stage 1 scan — not a hand-maintained
        dict (a hardcoded 18-entry ``PARENT_CHILD`` dict was retired 2026-08-01
        for exactly this reason: it silently missed 5 blocks that declare
        ``parent`` — mega-aside, mega-group, product-faq-item, site-footer-row,
        site-header-row). The row count therefore tracks the codebase and is
        NOT a fixed number to cache here — query it live via
        ``SELECT COUNT(*) FROM blocks WHERE parent_block IS NOT NULL`` (or
        ``/sgs-db``) rather than trusting a comment.

        For each child registered under ``parent_block``, a token is derived
        from the child slug:
          • If the child's name portion (after ``sgs/``) starts with the parent's
            name portion followed by ``-``, the token is the REMAINDER after that
            prefix.  e.g. ``sgs/accordion-item`` under ``sgs/accordion`` →
            token = ``'item'``; ``sgs/form-step`` under ``sgs/form`` →
            token = ``'step'``; ``sgs/form-field-text`` under ``sgs/form`` →
            token = ``'field-text'``.
          • Otherwise the token is the child's full name after ``sgs/``.
            e.g. ``sgs/tab`` under ``sgs/tabs`` → token = ``'tab'``
            (``'tabs-tab'`` does not exist; the child simply has a shorter name).

        This derivation is performed in SQL via:
          ``CASE WHEN substr(slug, 5) LIKE substr(parent_block, 5) || '-%'
               THEN substr(slug, length(parent_block) + 2)
               ELSE substr(slug, 5)
           END``

        Precedence (STAGE1-DESIGN.md §Commit 2):
            Parent-scoped row beats global alias.  The walker calls this function
            as a PRE-CHECK before consulting the global ``slots`` table.

        Cache key: (parent_block, element_token).  NOT threaded into the LRU-
        cached ``_resolve_slug_from_bem_tuple`` core (which is keyed on the class
        tuple only — parent-aware resolution is a separate walker pre-check per
        the build contract).

        A hand-enumerated per-row audit table used to live here (verified
        2026-06-10 against the then-18 rows). It was REMOVED 2026-08-01 rather
        than updated by hand — a hand-maintained mirror of DB state is exactly
        the drift class this whole fix addresses (it would already be stale:
        the table never had the 5 blocks above, and would silently go stale
        again on the next new parent-declaring block). To verify the SQL
        derivation against the live rows, run:
          ``python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql
            "SELECT parent_block, slug FROM blocks WHERE parent_block IS NOT NULL"``
        and check each row against the CASE expression above by eye.

    Args:
        parent_block:   Fully-qualified slug of the resolved ancestor, e.g.
                        ``'sgs/accordion'``.
        element_token:  BEM element name extracted from the child class, e.g.
                        ``'item'``, ``'step'``, ``'tab'``.

    Returns:
        The child block slug (e.g. ``'sgs/accordion-item'``), or None when the
        parent has no child block matching ``element_token``.
    """
    if not parent_block or not element_token:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            """
            WITH child_tokens AS (
                SELECT slug,
                    CASE
                        WHEN substr(slug, 5) LIKE substr(parent_block, 5) || '-%'
                        THEN substr(slug, length(parent_block) + 2)
                        ELSE substr(slug, 5)
                    END AS derived_token
                FROM blocks
                WHERE parent_block = ?
            )
            SELECT slug FROM child_tokens WHERE derived_token = ?
            LIMIT 1
            """,
            (parent_block, element_token),
        ).fetchone()
    except sqlite3.OperationalError:
        # parent_block column absent (pre-D108 DB) — soft-fail.
        return None
    finally:
        conn.close()

    if row is None:
        _trace(
            "child_block_for_parent_token_miss",
            parent_block=parent_block,
            element_token=element_token,
        )
        return None

    child_slug = row[0]
    _trace(
        "child_block_for_parent_token_hit",
        parent_block=parent_block,
        element_token=element_token,
        child_slug=child_slug,
    )
    return child_slug


# ----------------------------------------------------------------------------
# atomic_tag_map — Spec 22 §14 Appendix B / Commit 1.2
# ----------------------------------------------------------------------------
# DB-driven replacement for the legacy hardcoded ATOMIC_TAG_MAP dict in
# _retired/convert_pre_spec22.py (9-entry dict, violated R-31-1).
#
# The atomic_tag_map operates at the walker's NO-BEM-CLASS fallback level —
# when a DOM node carries no `sgs-*` BEM classification, the walker uses this
# map to route the bare HTML tag to its html-canonical SGS block (Spec 22 §13
# walker pseudocode line 642).
#
# Resolution algorithm (two-tier html-canonical resolution, fully DB-driven):
#   Tier A — DB join: html_tag_to_core_block → blocks.replaces reverse-walk
#             For each row in html_tag_to_core_block, find the SGS block
#             whose `blocks.replaces` value matches the canonical core slug.
#   Tier B — fallback to core block slug
#             If no SGS block replaces the tag's canonical core slug, return
#             the core/* slug directly from html_tag_to_core_block.
#
# WHY slot_synonyms.html_semantic_tag is NOT consulted here (2026-05-28):
#   slot_synonyms.html_semantic_tag captures SLOT-CONTEXTUAL rendering
#   ("in slot X context, this slot is rendered as tag Y"). It is NOT a global
#   html-canonical tag→block routing table. Using it for atomic resolution
#   produced slot-contextual routing where html-canonical routing is needed.
#   slot_synonyms data stays unchanged; atomic_tag_map simply does not query it.
#
# R-31-1 compliance (2026-05-28 hardening):
#   No hardcoded SGS routing dict in code. The html-tag→SGS-block bridge data
#   lives in the html_tag_to_core_block DB table, seeded at module load from the
#   version-controlled data file scripts/data/atomic-tag-map.json. Runtime path
#   queries the DB only.


@functools.lru_cache(maxsize=1)
def _blocks_replaces_reverse() -> dict[str, str]:
    """Return {core_block_slug: sgs_block_slug} from blocks.replaces (status='built').

    blocks.replaces stores a COMMA-SEPARATED list of core slugs per row — one SGS
    block may replace several core blocks (many-core→one-sgs, e.g. sgs/media replaces
    'core/image,core/video,core/audio'); the legacy 6 store a single slug. A core
    block resolves to exactly one SGS block; if two SGS blocks claim the same core
    slug the first alphabetically wins (ORDER BY slug ASC) for determinism.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT replaces, slug FROM blocks "
            "WHERE replaces IS NOT NULL AND replaces != '' AND status = 'built' "
            "ORDER BY slug ASC"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, str] = {}
    for replaces_raw, sgs_slug in rows:
        for core_slug in (t.strip() for t in (replaces_raw or "").split(",")):
            # First writer wins (ORDER BY slug ASC gives determinism).
            if core_slug and core_slug not in out:
                out[core_slug] = sgs_slug
    return out


@functools.lru_cache(maxsize=1)
def atomic_tag_map() -> dict[str, str]:
    """Return {html_tag: block_slug} for all HTML tags the universal walker may encounter.

    Fully DB-driven (R-31-1 compliance, 2026-05-28 hardening). Reads
    html_tag_to_core_block at runtime and joins against blocks.replaces.
    No hardcoded routing dict in code.

    Resolution is html-canonical (NOT slot-contextual):
      Tier A: html_tag_to_core_block → blocks.replaces reverse-walk
      Tier B: fallback to core/* slug from html_tag_to_core_block

    See the module-level comment block above for why slot_synonyms.html_semantic_tag
    is intentionally NOT consulted here.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT html_tag, core_block_slug FROM html_tag_to_core_block"
        ).fetchall()
    finally:
        conn.close()

    replaces_reverse = _blocks_replaces_reverse()
    out: dict[str, str] = {}
    for html_tag, core_slug in rows:
        # Tier A: reverse-walk blocks.replaces — find SGS block that replaces this core slug
        sgs_slug = replaces_reverse.get(core_slug)
        # Tier B: fallback to the core slug itself
        out[html_tag] = sgs_slug if sgs_slug else core_slug
    return out


# ----------------------------------------------------------------------------
# array_item_slot_for — Spec 22 §FR-31-2.5 / Commit 1.3
# ----------------------------------------------------------------------------
# DB-driven resolution for array-typed attrs. When the walker encounters an
# array attr (block_attributes.attr_type='array') on a block, it asks this
# helper: "what's the per-item content slot?" The answer drives one of two
# emission paths in the universal walker (Commit 1.4):
#
#   Tier A (DB-populated canonical_slot — preferred):
#     equivalent_block_for(block_slug, attr_name) resolves canonical_slot to
#     a standalone_block; the walker emits one child block per array item.
#     e.g. sgs/product-card.packSizes (canonical_slot='button') → walker emits
#     one sgs/button child per pack-size item.
#
#   Tier B (NULL canonical_slot — walker falls back to children's BEM):
#     If canonical_slot is NULL, the walker queries the children's BEM
#     signature for the slot (per FR-31-2.5 §4). This helper returns None
#     for that case — the walker handles the BEM-fallback path itself.
#
# Replaces hardcoded ARRAY_LIFT_PATTERNS dict at _retired/convert_pre_spec22.py:1008-1031
# (R-31-1 compliance).

@functools.lru_cache(maxsize=2048)
def array_item_slot_for(block_slug: str, attr_name: str) -> str | None:
    """Return the canonical_slot for the items of an array-typed attribute.

    Returns:
        - The canonical_slot string when populated (Tier A — walker emits
          one child block per item via equivalent_block_for + standalone_block).
        - None when canonical_slot is NULL on a true array attr (Tier B —
          walker falls back to children's BEM signature per FR-31-2.5 §4).
        - None when the attribute does not exist OR is not array-typed
          (caller should not have invoked this helper for non-array attrs).

    The role gate is INCLUSIVE here (unlike equivalent_block_for): array
    attrs whose role is None but canonical_slot is populated still resolve.
    This matches the FR-31-2.5 §1 statement: "If the parent block's attr
    has canonical_slot populated → that's the array slot's content type".

    Caller (the walker) is responsible for then resolving canonical_slot via
    equivalent_block_for or standalone_block_for to get the emitted block slug.

    Examples:
        array_item_slot_for('sgs/product-card', 'packSizes') -> None
            (Tier B — canonical_slot=NULL; packSizes is OUT of array-resolver
            scope: render.php reads it 0×, not a per-item content repeater.
            Council MF-4, 2026-06-28. Previous docstring incorrectly showed
            -> 'button'; the live DB has canonical_slot=NULL.)
        array_item_slot_for('sgs/gallery', 'mediaItems')     -> 'media'
        array_item_slot_for('sgs/form-field-tiles', 'tiles') -> 'options'
        array_item_slot_for('sgs/info-box', 'elementOrder')  -> None
            (config array, role='layout', canonical_slot NULL — walker skips)
        array_item_slot_for('sgs/hero', 'headlineFontSize')  -> None
            (not an array attr — caller misuse)
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT canonical_slot, attr_type FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()

    if row is None:
        return None  # Attribute does not exist
    canonical_slot, attr_type = row
    if attr_type != "array":
        return None  # Caller misuse — non-array attr passed
    return canonical_slot  # May be None (Tier B fallback) or populated (Tier A)


def array_item_field_names(block_slug: str, attr_name: str) -> tuple[str, ...]:
    """The item field NAMES for an array attr, in declared order.

    The block's own data model — seeded from block.json
    ``attributes.<attr>.items.properties`` into ``array_item_schema`` by
    sgs-update-v2.py (2026-07-02). The DB-recognition array field-lift
    (``converter/resolvers/array_content.py``) reads these + derives each field's
    slot/role from the DB. Returns () when the table/rows are absent (pre-reseed
    safe — the resolver then no-ops for that attr, never errors).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT field_key FROM array_item_schema "
            "WHERE block_slug = ? AND array_attr = ? ORDER BY field_order",
            (block_slug, attr_name),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()  # table not created yet (no reseed) — safe no-op
    finally:
        conn.close()
    return tuple(r[0] for r in rows)


def array_item_field_schema(block_slug: str, attr_name: str) -> tuple[tuple[str, "str | None"], ...]:
    """(field_key, declared_role) pairs for an array attr, in declared order.

    ``role`` is the extraction role DECLARED in ``block.json``
    ``items.properties.<field>.role`` (FR-31-2.1a — read from the block's data
    model, never name-parsed) and seeded into ``array_item_schema.role`` by
    sgs-update-v2.py. It is NULL when the field declares no role — the resolver
    then falls back to its DB name→slot→role derivation for that field. Returns
    () when the table/column is absent (pre-reseed safe — no-op, never errors).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT field_key, role FROM array_item_schema "
            "WHERE block_slug = ? AND array_attr = ? ORDER BY field_order",
            (block_slug, attr_name),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()  # table/column absent (no reseed) — safe no-op
    finally:
        conn.close()
    return tuple((r[0], r[1]) for r in rows)


# ============================================================================
# Phase 1.4 Pass 1 — Universal walker helper functions
# ============================================================================
# These three helpers are consumed by the universal walker (Pass 2).
# They encode the three core walker operations without any per-block branches:
#   1. resolve_slug_from_bem  — FR-31-1 BEM→slug resolution
#   2. lift_behavioural_attrs — FR-31-2 scalar attr lifting
#   3. emit_sgs_container_wrapping — FR-31-3 exception 3 + FR-31-4
#
# R-31-1 compliance: no hardcoded SGS routing dicts; every routing decision
# queries the DB or delegates to existing helpers. No `if slug == 'sgs/X'`
# conditionals anywhere in this section.
# ============================================================================


# ----------------------------------------------------------------------------
# Helper 1 — resolve_slug_from_bem
# Spec 22 §FR-31-1 multi-class BEM→slug resolution
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=4096)
def _resolve_slug_from_bem_tuple(classes_tuple: tuple[str, ...]) -> str | None:
    """Core resolution logic — operates on a frozen sorted tuple for caching.

    Multi-class disambiguation rule (FR-31-1 + FR-31-15):
      Path 1 — bare block class (no __element suffix) present:
        Each class whose BemParse.element is None is a block-root candidate.
        Filter to those where `sgs/<block>` is a registered built slug, then
        DEDUPE (a bare class + its own --modifier class parse to the same
        block — not ambiguity).
        If exactly one distinct slug → return it.
        If multiple DISTINCT slugs → LOUD no-match (FR-31-15 as AMENDED D278):
          trace `bem_resolve_ambiguous_loud` + return None so the node falls
          to the container-default/pass-through path for manual review. The
          old capability-rank silent pick is retired (never fired on distinct
          blocks in recorded history).
      Path 2 — all classes are __element-suffixed (inner element of a parent):
        Walk each class's BemParse.block + every known slot synonym alias.
        Find the first canonical_slot whose standalone_block is non-NULL.
        Return that standalone_block slug.
      Neither path resolves → return None.
    """
    if not classes_tuple:
        return None

    registered = registered_block_slugs()
    slot_alias_map = _slot_alias_to_standalone()

    # Parse all sgs- classes via BEM
    parsed: list[tuple[str, BemParse]] = []  # (original_class, parse)
    for cls in classes_tuple:
        if not cls.startswith("sgs-"):
            continue
        bem = parse_sgs_bem(cls)
        if bem is not None:
            parsed.append((cls, bem))

    if not parsed:
        return None

    # ---- Path 1: bare block classes (no __element suffix) ----
    bare_block_slugs: list[str] = []
    for _cls, bem in parsed:
        if bem.element is None and bem.block is not None:
            candidate = f"sgs/{bem.block}"
            if candidate in registered:
                bare_block_slugs.append(candidate)

    if bare_block_slugs:
        # FR-31-15 (AMENDED D278, Bean-directed 2026-07-05): DEDUPE first —
        # a bare class and its own --modifier class both parse to the same
        # block, so same-slug duplicates are NOT ambiguity (every historically
        # recorded "tie" was this shape). A residual tie between DISTINCT
        # blocks is a draft-authoring ambiguity: go LOUD and return no match —
        # the node falls to the container-default/pass-through path (content
        # preserved by recursion) and the trace flags it for manual review.
        # The capability-rank silent pick is RETIRED (never fired on distinct
        # blocks in recorded history; silently guessing was wrong anyway).
        distinct = list(dict.fromkeys(bare_block_slugs))  # order-preserving
        if len(distinct) > 1:
            _trace("bem_resolve_ambiguous_loud",
                   classes=list(classes_tuple),
                   candidates=distinct,
                   chosen=None,
                   resolution="LOUD_NO_MATCH_manual_review")
            return None
        return distinct[0]

    # ---- Path 2: element-only classes — slot fallback ----
    # Walk in sorted order (deterministic) through parsed classes and try to
    # resolve each BEM element/block segment against slot_synonyms.
    #
    # SELF-NEST GUARD (P-QUOTE-PATH2-SELF-NESTING, 2026-07-25): a block can
    # NEVER recognise its OWN unrecognised child element as a fresh copy of
    # itself. Every block's short slug is registered as an element-scope slot
    # pointing at itself (`_slot_alias_to_standalone` runs `_put(slot_name,
    # standalone)` before the alias loop), so a miss on the element name used
    # to fall through to the block-segment lookup and self-resolve — e.g.
    # `sgs-quote__<unknown>` → 'sgs/quote' → a quote nested inside a quote.
    # Confirmed latent for heading/label/media/button/icon/tab/testimonial/
    # option-picker/accordion-item/quote. The fix is UNIVERSAL + name-free
    # (R-31-1/R-31-9): any match resolving to the element's OWN parent block
    # (`sgs/<bem.block>`) is refused, so the node falls through to None and
    # the walker keeps its content as pass-through inside the parent
    # (FR-31-4.1 / FR-31-11) instead of emitting a phantom self-copy. This is
    # a refinement of the RECOGNITION resolver, NOT a 4th walker branch —
    # R-31-3's three-exception contract is untouched.
    for cls, bem in sorted(parsed, key=lambda x: x[0]):
        self_slug = f"sgs/{bem.block}" if bem.block is not None else None
        # Try the element name first (most specific)
        if bem.element is not None:
            standalone = slot_alias_map.get(bem.element.lower())
            if standalone and standalone != self_slug:
                _trace("bem_resolve_slot_fallback",
                       class_=cls,
                       slot=bem.element,
                       slug=standalone)
                return standalone
            if standalone and standalone == self_slug:
                _trace("bem_resolve_self_nest_skipped",
                       class_=cls,
                       slot=bem.element,
                       blocked_slug=standalone)
        # Try the block segment (e.g. sgs-product-card__badge → 'product-card'
        # is block, 'badge' is element — already tried above; but the block
        # itself might also be a known slot alias in edge cases)
        if bem.block is not None:
            standalone = slot_alias_map.get(bem.block.lower())
            if standalone and standalone != self_slug:
                _trace("bem_resolve_slot_fallback",
                       class_=cls,
                       slot=bem.block,
                       slug=standalone)
                return standalone
            if standalone and standalone == self_slug:
                _trace("bem_resolve_self_nest_skipped",
                       class_=cls,
                       slot=bem.block,
                       blocked_slug=standalone)

    # ---- Path 2b: compound-element prefix strip (e.g. card-tag → tag) ----
    # A BEM element is frequently a `<head>-<tail>` compound where `head` names
    # the containing context (a card/panel slot) and `tail` is the real element
    # slot — e.g. `card-tag`, `card-description`, `card-price`. The literal
    # compound misses the slot vocabulary (Path 2 above), so the element's text
    # falls through to a slug-None container as raw inner content → WP editor
    # "unexpected/invalid content".
    #
    # Resolution = prefix/suffix decomposition against the SAME DB slot vocabulary
    # (no new table, no per-class Python literals — R-31-1; universal across every
    # `<slot>-<slot>` compound — R-31-9). Split on the FIRST hyphen and route the
    # tail ONLY when BOTH head and tail are themselves routable slots. Gating on
    # `head in slot_alias_map` is the safety boundary: it fires for container
    # prefixes (`card-`, `panel-`) but NEVER for non-slot prefixes (`skip-link`,
    # `cart-badge`, `trustpilot-logo`) which must stay structural wrappers.
    # `card-inner` is also correctly skipped (tail `inner` has no standalone_block
    # → not in the map → stays a passthrough wrapper). Verified zero collateral
    # across all 86 BEM classes in the Mama's Munches mockup (2026-06-03).
    #
    # PRECEDENCE: Path 2b is a FALLBACK — it runs only after Path 2's literal
    # element/block alias lookup misses. So an explicit alias (e.g. `card-body`
    # → sgs/info-box via the `card` row's aliases) always wins over the peel;
    # Path 2b only fills genuine vocabulary gaps. Multi-segment tails resolve fine
    # when the tail is itself a hyphenated alias (`x-split-image` → `split-image`
    # → sgs/media). For any compound that is actually a WRAPPER (sgs-classed
    # element children), the walker's leaf-misresolution guard (convert.py walk(),
    # ~line 1961) is the backstop: a peeled leaf slug with sgs-classed children is
    # re-treated as a slug-None container, so no wrapper is ever flattened to a leaf.
    for cls, bem in sorted(parsed, key=lambda x: x[0]):
        if bem.element is None or "-" not in bem.element:
            continue
        self_slug = f"sgs/{bem.block}" if bem.block is not None else None
        head, _, tail = bem.element.lower().partition("-")
        if head in slot_alias_map and tail in slot_alias_map:
            standalone = slot_alias_map[tail]
            # SELF-NEST GUARD (see Path 2 above): a peeled compound tail that
            # resolves to the element's own parent block is a self-nest — refuse
            # it and fall through to None (pass-through), never emit a self-copy.
            if standalone == self_slug:
                _trace("bem_resolve_self_nest_skipped",
                       class_=cls,
                       head=head,
                       tail=tail,
                       blocked_slug=standalone)
                continue
            _trace("bem_resolve_prefix_strip",
                   class_=cls,
                   head=head,
                   tail=tail,
                   slug=standalone)
            return standalone

    return None


def block_for_slot_token(token: str) -> str | None:
    """Return the standalone block a single BEM token resolves to, or None.

    Thin public accessor over the element-scope slot/alias map (the same map
    `resolve_slug_from_bem` uses). Used by the walker's text-leaf routing
    (Spec 22 §FR-31-4.1 content-leaf step) to resolve a compound element's
    individual hyphen-segments (e.g. `price` → sgs/text, `stars` →
    sgs/star-rating) so a content leaf can pick its correct content block.
    Hyphen/case-insensitive via the map's no-hyphen variant keys.
    """
    if not token:
        return None
    return _slot_alias_to_standalone().get(token.lower())


def resolve_slug_from_bem(sgs_classes: list[str]) -> str | None:
    """Return the canonical SGS block slug for a list of sgs-* BEM classes, or None.

    Spec 31 §FR-31-1 + §FR-31-15 (as AMENDED D278) — multi-class disambiguation:
      - Path 1: a class whose BEM block segment maps to a registered built
        slug (no __element suffix). Duplicates DEDUPED (bare + --modifier of
        the same block); a residual DISTINCT-block tie is LOUD no-match for
        manual review (the D96 capability-rank silent pick is retired).
      - Path 2: all classes carry __element (inner element). Walk slot_synonyms
        aliases; return the first canonical_slot whose standalone_block is set.
      - Neither → None.

    Non-sgs-* classes are silently filtered out. Safe to call with a node's
    full class list — the walker should pre-filter but this helper is defensive.
    """
    return _resolve_slug_from_bem_tuple(tuple(sorted(sgs_classes)))


# ----------------------------------------------------------------------------
# fx_attr_roster — the FULL fx* attribute contract (name, data-attr, type)
# Built 2026-09-04 (D951/D952-adversarial-council fix). Two canonical,
# already-maintained sources, combined — no hand-authored duplicate:
#   - includes/fx-attributes.php FX_ATTR_MAP: attr_name -> rendered
#     data-attribute name (Spec 38 §11.2). This is the file
#     scripts/db-consistency/check-fx-list-drift.py already gate-enforces
#     against fx.js, so it is guaranteed current — never derive a data-attr
#     name mechanically (kebab-casing an attr name) when this exists; several
#     real names are irregular (fxPathRotate -> data-sgs-fx-motion-path-
#     rotate, fxFieldType -> data-sgs-fx-field, not a mechanical kebab of the
#     attr name at all).
#   - includes/extension-attributes.generated.php: attr_name -> real JS type
#     (string/number/boolean/array), build-generated by
#     scripts/generate-extension-attributes.js FROM the actual fx.js
#     attribute declarations — not re-derived or guessed here.
# Prior to this fix, the cloning-lift's writer (_seed_missing_fx_attr_rows,
# sgs-update-v2.py) only knew about 29 of fx.js's ~79 registered fx* attrs
# (via a DIFFERENT, narrower map — seed-motion-fx-registry.py's
# FX_ATTR_CSS_PROPERTY, which exists for css_property classification, not as
# an attribute roster) and seeded every row as attr_type='string' regardless
# of the real JS type. Both were adversarial-council findings (Cynic;
# Spec-Lawyer; Ship-PM/Verification-Skeptic independently on the type bug).
# ----------------------------------------------------------------------------

_FX_ATTRIBUTES_PHP = (
    Path(__file__).resolve().parents[3] / "includes" / "fx-attributes.php"
)
_EXTENSION_ATTRS_GENERATED_PHP = (
    Path(__file__).resolve().parents[3]
    / "includes" / "extension-attributes.generated.php"
)

_FX_MAP_ENTRY_RE = re.compile(r"'(\w+)'\s*=>\s*'(data-sgs-[\w-]+)'")
_EXT_ATTR_TYPE_RE = re.compile(r"'(\w+)'\s*=>\s*array\(\s*'type'\s*=>\s*'(\w+)'")


@functools.lru_cache(maxsize=1)
def fx_attr_roster() -> dict[str, dict[str, str]]:
    """Return {attr_name: {"data_attr": "data-sgs-...", "type": "string"|...}}
    for every attribute FX_ATTR_MAP declares (the full fx* contract), typed
    from extension-attributes.generated.php. Missing type defaults to
    'string' (matches the prior uniform behaviour, only now the exception
    rather than the rule) — this can only happen if a name is in FX_ATTR_MAP
    but was somehow never generated into the JS-attrs artefact, which would
    itself indicate a drift the existing check-fx-list-drift.py gate should
    catch.

    Soft-optional like the sibling loaders in this module: a missing/
    unreadable PHP file degrades to an empty/partial roster rather than
    hard-failing an unrelated caller.
    """
    data_attrs: dict[str, str] = {}
    try:
        text = _FX_ATTRIBUTES_PHP.read_text(encoding="utf-8")
        for name, data_attr in _FX_MAP_ENTRY_RE.findall(text):
            data_attrs[name] = data_attr
    except Exception as exc:  # noqa: BLE001
        _trace("db_lookup_miss", lookup="fx_attr_roster",
               reason=f"FX_ATTR_MAP unreadable: {exc}")

    types: dict[str, str] = {}
    try:
        text = _EXTENSION_ATTRS_GENERATED_PHP.read_text(encoding="utf-8")
        for name, typ in _EXT_ATTR_TYPE_RE.findall(text):
            types[name] = typ
    except Exception as exc:  # noqa: BLE001
        _trace("db_lookup_miss", lookup="fx_attr_roster",
               reason=f"extension-attributes.generated.php unreadable: {exc}")

    roster = {
        name: {"data_attr": data_attr, "type": types.get(name, "string")}
        for name, data_attr in data_attrs.items()
    }

    # fxDisableTablet/fxDisableMobile are DELIBERATELY absent from
    # FX_ATTR_MAP's generic loop (fx-attributes.php:726-735, D446 Task 15) —
    # a plain "value or absent" loop can't distinguish a real `false` from
    # "unset", so these two booleans render via their own branch:
    # `data-sgs-fx-disable-tablet="1"` / `data-sgs-fx-disable-mobile="1"`.
    # Added explicitly here (not regex-derivable from FX_ATTR_MAP) so the
    # cloning lift can still recognise them on a draft.
    for _name, _data_attr in (
        ("fxDisableTablet", "data-sgs-fx-disable-tablet"),
        ("fxDisableMobile", "data-sgs-fx-disable-mobile"),
    ):
        if _name not in roster:
            roster[_name] = {
                "data_attr": _data_attr,
                "type": types.get(_name, "boolean"),
            }

    return roster


# ----------------------------------------------------------------------------
# Helper 2 — lift_behavioural_attrs
# Spec 22 §FR-31-2 — scalar attr lifting (NULL equivalent_block only)
# ----------------------------------------------------------------------------

def _coerce_lifted_value(value: object, attr_type: "str | None") -> object:
    """Coerce a raw HTML attribute string to `attr_type`'s real Python shape
    before it is written into an emitted block's attrs (D952-adversarial-
    council fix, 2026-09-04 — Ship-PM + Verification-Skeptic, independently).

    A DOM attribute value is ALWAYS a string (`data-sgs-fx-scrub="1.5"`).
    Left uncoerced, a 'number'/'boolean'-typed attr round-trips as the
    literal JSON STRING `"1.5"`/`"true"` in the emitted block comment. Real
    render code reads it back with a STRICT PHP comparison
    (`includes/fx-attributes.php`: `true === ( $attrs['fxDisableTablet'] ??
    false )`) — a string never satisfies that, so a client's "don't run
    this on mobile" setting would silently not apply. Falls back to the
    original string on any parse failure (defensive — never crashes the
    walk over a malformed draft value; the attr is still lifted, just
    unconverted, which matches the PRE-fix behaviour rather than dropping
    it).
    """
    if not isinstance(value, str):
        return value
    if attr_type == "boolean":
        low = value.strip().lower()
        if low in ("1", "true"):
            return True
        if low in ("0", "false"):
            return False
        return value
    if attr_type == "number":
        try:
            as_float = float(value)
            return int(as_float) if as_float.is_integer() else as_float
        except (ValueError, TypeError):
            return value
    return value


def _kebab_to_camel(name: str) -> str:
    """Convert a kebab-case remainder (`fx-trigger`) to camelCase (`fxTrigger`).

    Universal helper for matching a DOM `data-sgs-<kebab>` attribute against a
    block's camelCase attr names — used by `lift_behavioural_attrs` section
    (a); not fx-specific (R-31-9). A remainder with no hyphen is returned
    unchanged.
    """
    parts = name.split("-")
    if len(parts) == 1:
        return name
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:] if p)


def lift_behavioural_attrs(node: object, slug: str) -> "tuple[dict, list[tuple[str, str]]]":
    """Return (attrs, skipped) — scalar block attrs inferred from node's DOM
    attributes and classes, plus a Rule-4 skip-with-reason list.

    # TODO: FR-31-2 scalar lift — refine in Pass 2 as walker discovers attrs that
    # need lifting beyond the simple cases handled here. Current implementation
    # covers: (a) explicit data-sgs-X="Y" attributes, and (b) sgs-block--modifier
    # class patterns that map to known property_suffixes / modifier_suffixes rows.
    # Array attrs (FR-31-2.5) and equivalent_block-routed attrs (FR-31-2.1) are
    # walker concerns — this helper does NOT lift those.

    ⛔ Rule 4 (CLAUDE.md's 7 non-negotiable rules — NO SKIPPING): "every draft
    class's content + CSS transfers to the clone, OR is reported as
    skipped-with-reason". Before this (D949-D953), a `data-sgs-fx-*` marker
    the fx grammar genuinely recognises (present in `fx_attr_roster()`) but
    with no destination on THIS resolved block (e.g. an effect param the
    block doesn't support) was silently absent — a live instance of the
    exact violation Rule 4 exists to catch. Added 2026-09-04: when the fx
    reverse lookup recognises the data-attribute name but the target attr
    isn't in `attrs` for this slug, it is recorded in `skipped` instead of
    silently dropped. A non-fx `data-sgs-*` attribute that doesn't resolve
    via the generic kebab guess is NOT flagged here — it may legitimately be
    an author's unrelated custom marker, not a known grammar gap; only a
    RECOGNISED-but-unrouted fx attribute is a genuine skip.

    Args:
        node: BeautifulSoup Tag (or any object with .get() and .get('class') interface)
        slug: Resolved SGS block slug (e.g. 'sgs/hero')

    Returns:
        (attrs, skipped) — `attrs` is attr_name → value for scalar behavioural
        attrs inferred from the node without requiring content extraction
        (empty dict when none found). `skipped` is a list of (where, detail)
        pairs, each a `data-sgs-fx-*` marker the grammar recognises but this
        block has no destination for (empty list when none found) — the
        caller is responsible for routing these through `ContentGap`/
        `content_gap_collector` (kept out of this module: its own docstring
        describes it as pure "DB-backed canonical lookups", and
        `content_gap_collector` lives in the services layer, one layer up).
    """
    result: dict = {}
    skipped: list[tuple[str, str]] = []

    # ---- (a) Explicit data-sgs-X="Y" attributes ----
    # Mockup authors (or the pipeline's Stage 4 Playwright pass) may annotate
    # nodes with `data-sgs-<attrName>="<value>"` for unambiguous attr injection.
    # These override any derived value. We check ALL attrs on the node for the
    # data-sgs- prefix and lift any that have a matching attr on this block slug.
    attrs = block_attrs(slug)
    # Access node's HTML attributes — BeautifulSoup Tag.attrs is a dict.
    # We accept any object with a .get(key) interface as a duck-type contract.
    try:
        node_attrs: dict = node.attrs if hasattr(node, "attrs") else {}
    except Exception:
        node_attrs = {}

    # Authoritative reverse lookup for the fx* contract specifically
    # (full `data-sgs-fx-...` string -> real attr name), sourced from
    # FX_ATTR_MAP — several real names are irregular and do NOT mechanically
    # kebab-convert (`fxPathRotate` -> `data-sgs-fx-motion-path-rotate`,
    # `fxFieldType` -> `data-sgs-fx-field`). Checked before the generic
    # kebab guess below, which stays as the universal fallback for any
    # non-fx `data-sgs-*` attribute (R-31-9 — this helper is not fx-only).
    _fx_reverse = {v["data_attr"]: k for k, v in fx_attr_roster().items()}

    for html_attr, value in node_attrs.items():
        if not isinstance(html_attr, str):
            continue
        if html_attr.startswith("data-sgs-"):
            raw_remainder = html_attr[len("data-sgs-"):]
            # A DOM data-attribute is conventionally kebab-case
            # (`data-sgs-fx-trigger`) while the block attr it targets is
            # camelCase (`fxTrigger`) — try the fx roster's exact mapping
            # first, then the literal remainder (covers an author who
            # already writes `data-sgs-fxTrigger`), then the kebab->camelCase
            # conversion as a last resort. Fixed 2026-09-04 (FR-38-22
            # investigation): before this, ANY kebab-named data-sgs-*
            # attribute silently failed to lift — not just fx's; and even
            # after that first fix, several real fx attr names still
            # mismatched because they are not a mechanical kebab of the
            # attr name at all (adversarial-council, Cynic finding).
            candidates = (
                _fx_reverse.get(html_attr),
                raw_remainder,
                _kebab_to_camel(raw_remainder),
            )
            attr_name = next((c for c in candidates if c and c in attrs), None)
            # Only lift if the attr exists on this block AND is scalar (not array)
            if attr_name is not None and attrs[attr_name].get("attr_type") != "array":
                # Only lift if equivalent_block_for returns None (scalar, not block-equiv)
                if equivalent_block_for(slug, attr_name) is None:
                    # Value may be a list when BS4 parses multi-value attrs; take first
                    lifted_val = value[0] if isinstance(value, list) else value
                    lifted_val = _coerce_lifted_value(
                        lifted_val, attrs[attr_name].get("attr_type")
                    )
                    result[attr_name] = lifted_val
                    _trace("scalar_lift", slug=slug, attr=attr_name,
                           source="data-sgs-attr", value=lifted_val)
            elif html_attr in _fx_reverse:
                # Rule 4 (CLAUDE.md NO-SKIPPING): the fx grammar genuinely
                # recognises this data-attribute (it's in FX_ATTR_MAP), but
                # no candidate resolved to a real attr on THIS block — either
                # `attr_name` stayed None (block doesn't declare this fx
                # attr) or it resolved but is array-typed (shouldn't happen
                # for fx — defensive). Report, don't silently drop.
                fx_name = _fx_reverse[html_attr]
                skipped.append((
                    html_attr,
                    f"fx grammar attribute '{fx_name}' recognised but "
                    f"'{slug}' has no matching block_attributes row for it "
                    "— not fx-capable for this effect, or not yet seeded.",
                ))

    # ---- (b) sgs-block--modifier class patterns ----
    # A modifier class like `sgs-cta-section--large` carries potential attr info.
    # We parse the modifier, look it up in modifier_suffixes (kind=variant/state)
    # and also probe property_suffixes for block-level CSS class probes.
    # The block_attributes table's derived_selector column can carry
    # `--modifier` patterns — we scan for matches.
    try:
        css_classes: list[str] = node.get("class") or []
        if isinstance(css_classes, str):
            css_classes = css_classes.split()
    except Exception:
        css_classes = []

    # Check each sgs- class for a modifier segment
    canonical_modifiers = _canonical_modifiers()
    for cls in css_classes:
        if not cls.startswith("sgs-"):
            continue
        bem = parse_sgs_bem(cls)
        if bem is None or bem.modifier is None:
            continue
        modifier = bem.modifier.lower()
        # Check if the modifier maps to a known modifier_suffixes kind
        mod_kind = canonical_modifiers.get(modifier)
        if mod_kind not in ("variant", "state"):
            continue
        # Now look for a block_attribute on this slug whose derived_selector
        # ends with `--<modifier>` OR whose attr_name encodes the modifier.
        # We scan attrs looking for a match; this is the "enum-class-probe" pattern.
        for attr_name, attr_info in attrs.items():
            role = attr_info.get("role")
            if role not in ("select-from-enum", "enum-class-probe", "behaviour"):
                continue
            derived = attr_info.get("canonical_slot") or ""
            # Heuristic: the modifier matches if the attr_name normalised == modifier
            # or if derived_selector-like naming carries the modifier.
            norm_mod = _normalise(modifier)
            norm_attr = _normalise(attr_name)
            if norm_attr == norm_mod or norm_attr.endswith(norm_mod):
                if equivalent_block_for(slug, attr_name) is None:
                    result[attr_name] = modifier
                    _trace("scalar_lift", slug=slug, attr=attr_name,
                           source="modifier-class", value=modifier)
                    break

    return result, skipped


# ----------------------------------------------------------------------------
# Helper 3 — emit_sgs_container_wrapping
# Spec 22 §FR-31-3 exception 3 + §FR-31-4 (top-level section container wrap)
# ----------------------------------------------------------------------------

def _emit_wp_block_markup(slug: str, attrs: dict, children: list[str]) -> str:
    """Private helper — emit a single WP block markup string.

    Mirrors emit_wp_block() shape from _retired/convert_pre_spec22.py:964.
    Strips private underscore-prefixed keys from attrs (routing hints).

    Emit shape follows WP save() contract:
    - No children → self-closing (`/-->`).
      This handles dynamic blocks (save=null) emitted inside sgs/container.
      WP block validation rejects open+close form when the block's save() is
      null (save=null means self-closing is the ONLY valid serialisation).
    - Children present → open+close (`--> ... <!-- /wp:slug -->`).
      Section containers (sgs/container, sgs/hero etc.) always have children
      so they remain in open+close form.

    The original comment "never self-closing — section containers always have
    children" was correct for sgs/container callers but wrong when this function
    is invoked by emit_sgs_container_wrapping for a non-container inner block
    such as sgs/star-rating (2026-06-02 fix).
    """
    from converter.block_serialization import serialize_block_attributes
    clean = {
        k: v for k, v in attrs.items()
        if v not in (None, "", [], {}) and not k.startswith("_")
    }
    attr_json = ""
    if clean:
        # SECURITY: WP-core-faithful escaping, never plain json.dumps — an attr value
        # containing "-->" would otherwise close this comment early and inject raw
        # HTML into stored post_content (stored-XSS class). See block_serialization.
        attr_json = " " + serialize_block_attributes(clean)
    inner_str = "\n".join(children) if children else ""
    if not inner_str:
        # Self-close when no inner content — matches WP save()=null contract.
        return f"<!-- wp:{slug}{attr_json} /-->"
    return f"<!-- wp:{slug}{attr_json} -->\n{inner_str}\n<!-- /wp:{slug} -->"


def emit_sgs_container_wrapping(
    slug: str | None,
    attrs: dict,
    children_markup: list[str],
    css: str,
) -> str:
    """Wrap a resolved block in a sgs/container parent (FR-31-3 exception 3 + FR-31-4).

    Called by the walker when: is_top_level=True AND resolved slug != 'sgs/container'.
    Every top-level section's base is sgs/container (FR-31-4); non-container
    top-level sections are wrapped rather than emitted bare.

    When slug is None (top-level node had no BEM-resolved block slug per FR-31-11),
    no inner block is emitted — the walked children become direct InnerBlocks of
    the sgs/container wrapper. This preserves FR-31-4's invariant ("every top-level
    section is based on sgs/container") for sections whose root class is unknown
    to the slot_synonyms table, while keeping FR-31-11 pass-through semantics for
    non-top-level slug-None nodes (which never reach this function).

    Args:
        slug: Resolved block slug for the inner block (e.g. 'sgs/hero'), or None
              when the top-level section had no BEM-resolved block (children
              become direct container InnerBlocks).
        attrs: Block attrs dict to set on the inner block (ignored when slug=None)
        children_markup: List of child block markup strings (inner blocks)
        css: Section-scoped CSS string; appended as <style> inside the container
             div when non-empty (Spec 22 §FR-31-5 routing)

    Returns:
        WP block serialisation string with sgs/container as the outer wrapper.

    Example output shape:
        <!-- wp:sgs/container {} -->
        <div class="wp-block-sgs-container">
        <!-- wp:sgs/hero {"level":"h1"} -->
        <p>x</p>
        <!-- /wp:sgs/hero -->
        <style>a{color:red}</style>
        </div>
        <!-- /wp:sgs/container -->
    """
    import json as _json

    _trace("section_wrap", slug=slug, children_count=len(children_markup))

    # Build the container's inner HTML.
    # When slug is not None: emit inner resolved block (+ its attrs + children),
    # then optional CSS.
    # When slug is None (top-level FR-31-11 pass-through): children become direct
    # InnerBlocks of the container (no synthetic inner block emitted).
    container_children: list[str] = []
    if slug is not None:
        inner_markup = _emit_wp_block_markup(slug, attrs, children_markup)
        container_children.append(inner_markup)
    else:
        container_children.extend(c for c in children_markup if c)

    # Emit sgs/container with its children DIRECTLY between the block comments — NO static
    # <div class="wp-block-sgs-container"> wrapper and NO inline <style>. This mirrors
    # _emit_section_container (the slug-None path) which is already correct.
    #   * sgs/container's save() is <InnerBlocks.Content/> (no wrapper div). A static div in
    #     the saved markup fails WP block validation → "This block contains unexpected or
    #     invalid content" on EVERY cloned container in the editor (Bean 2026-06-02), AND
    #     adds an extra nesting level that breaks grid-on-section (the grid's items stop
    #     being its direct children).
    #   * The section's scoped CSS is already collected into variation_buf by the caller
    #     (walk: collect_css_for_classes → variation_buf.append) and deployed at Stage 10,
    #     so embedding an inline <style> here would only duplicate it.
    # FR-31-4: every top-level section is full-width (widthMode='full') so its background
    # fills the viewport; content is constrained by the inner block's own content-width
    # logic. The className post-process (guarantee_section_className) MERGES the section BEM
    # class on top, so widthMode is preserved.
    return _emit_wp_block_markup("sgs/container", {"widthMode": "full"}, container_children)


# ----------------------------------------------------------------------------
# content_attrs_with_selector / content_role_for_slot — Stage 3 helpers
# ----------------------------------------------------------------------------
# Two read-only DB accessors for Stage 3 recognition: which content-bearing
# attrs on a block carry a derived_selector (for CSS-to-attr routing), and
# what content role does a given canonical_slot carry on a block?
#
# Both use _content_bearing_roles() live (R-31-1 — no hardcoded role lists).
# Both use the same lru_cache + sqlite3.connect(SGS_DB) idiom as neighbours.
# ----------------------------------------------------------------------------


class AttrInfo(NamedTuple):
    """A content-bearing attr on a block that has a derived_selector."""
    attr_name: str
    role: str
    derived_selector: str
    attr_type: str


@functools.lru_cache(maxsize=256)
def content_attrs_with_selector(block_slug: str) -> tuple[AttrInfo, ...]:
    """Return content-bearing attrs for `block_slug` that have a derived_selector.

    Queries block_attributes for rows where:
      - block_slug = the given slug
      - derived_selector IS NOT NULL
      - role is in the live content-bearing role set (_content_bearing_roles())

    Returns a tuple of AttrInfo(attr_name, role, derived_selector). Empty tuple
    if none exist or the block is unknown. LRU-cached per slug.

    R-31-1: roles queried live from DB via _content_bearing_roles(); never
    hardcoded here. Used by Stage 3 content-extraction step to route draft CSS
    selectors to the correct block attr without per-block branches.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/testimonial'.

    Returns:
        Tuple of AttrInfo named tuples; empty tuple when none found.
    """
    content_roles = _content_bearing_roles()
    if not content_roles:
        _trace("db_lookup_miss", lookup="content_attrs_with_selector",
               block_slug=block_slug, reason="no_content_roles")
        return ()

    placeholders = ",".join("?" for _ in content_roles)
    params = (block_slug, *content_roles)

    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            f"SELECT attr_name, role, derived_selector, attr_type FROM block_attributes "
            f"WHERE block_slug = ? AND derived_selector IS NOT NULL "
            f"AND role IN ({placeholders})",
            params,
        ).fetchall()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="content_attrs_with_selector",
               block_slug=block_slug, reason="operational_error")
        return ()
    finally:
        conn.close()

    result = tuple(
        AttrInfo(attr_name=r[0], role=r[1], derived_selector=r[2], attr_type=r[3] or "")
        for r in rows
    )
    if result:
        _trace("db_lookup_hit", lookup="content_attrs_with_selector",
               block_slug=block_slug, count=len(result))
    else:
        _trace("db_lookup_miss", lookup="content_attrs_with_selector",
               block_slug=block_slug)
    return result


@functools.lru_cache(maxsize=2048)
def content_role_for_slot(block_slug: str, slot: str) -> str | None:
    """Return the content-bearing role of the attr on `block_slug` for `slot`.

    Queries block_attributes for a row where:
      - block_slug = the given slug
      - canonical_slot = the given slot
      - role is in the live content-bearing role set (_content_bearing_roles())

    Returns the role string (e.g. 'text-content') or None when no such attr
    exists or its role is not content-bearing. LRU-cached per (slug, slot).

    R-31-1: roles queried live from DB via _content_bearing_roles(); never
    hardcoded here. Slot-keyed (canonical_slot), NOT attr-keyed — mirrors the
    existing slot_has_content_equivalent predicate pattern. Used by Stage 3 to
    determine how to extract a slot's content from the draft DOM.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/testimonial'.
        slot:       Canonical slot name, e.g. 'quote', 'heading', 'media'.

    Returns:
        Role string or None.
    """
    if not block_slug or not slot:
        return None

    content_roles = _content_bearing_roles()
    if not content_roles:
        _trace("db_lookup_miss", lookup="content_role_for_slot",
               block_slug=block_slug, slot=slot, reason="no_content_roles")
        return None

    placeholders = ",".join("?" for _ in content_roles)
    params = (block_slug, slot, *content_roles)

    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            f"SELECT role FROM block_attributes "
            f"WHERE block_slug = ? AND canonical_slot = ? "
            f"AND role IN ({placeholders}) LIMIT 1",
            params,
        ).fetchone()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="content_role_for_slot",
               block_slug=block_slug, slot=slot, reason="operational_error")
        return None
    finally:
        conn.close()

    if row:
        _trace("db_lookup_hit", lookup="content_role_for_slot",
               block_slug=block_slug, slot=slot, role=row[0])
        return row[0]
    _trace("db_lookup_miss", lookup="content_role_for_slot",
           block_slug=block_slug, slot=slot)
    return None


def accepts_allowed_blocks(block_slug: str) -> list[str] | None:
    """Return the parent's allowed child-block list, or None for "no restriction".

    Spec 31 §3.B3(3) / Axis-3 child-routing: the VALIDATION gate for child-block
    CONTENT resolution. A resolved child block MUST be in this list, else the child
    is a flagged GAP (never silently dropped, never a per-block carve-out, R-31-9).

    Three-state contract (the G3 NULL case the design names explicitly):
      - ``None``  — ``block_composition.accepts_allowed_blocks`` is NULL/absent:
                    the parent declares NO restriction → caller emits the child
                    UNCONDITIONALLY (skip validation, do NOT fail). NULL != [].
      - ``[]``    — an explicit empty list: NO children allowed.
      - ``[...]`` — the allow-list (e.g. ``["sgs/accordion-item"]``); membership
                    is required.

    The column stores a JSON string. A malformed value traces + returns None
    (lenient — the validation step skips rather than crashing a clone; mirrors the
    existing accessors' fail-soft-with-trace pattern).

    R-31-1: pure DB read, no per-slug branch. Used by the interior walker (Stage 4f).
    """
    if not block_slug:
        return None
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT accepts_allowed_blocks FROM block_composition "
            "WHERE block_slug = ? LIMIT 1",
            (block_slug,),
        ).fetchone()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="accepts_allowed_blocks",
               block_slug=block_slug, reason="operational_error")
        return None
    finally:
        conn.close()

    if not row or row[0] is None or str(row[0]).strip() == "":
        _trace("db_lookup_miss", lookup="accepts_allowed_blocks",
               block_slug=block_slug, reason="null_no_restriction")
        return None  # NULL = no restriction (distinct from [] = allow nothing)
    try:
        parsed = json.loads(row[0])
    except (ValueError, TypeError):
        _trace("db_lookup_miss", lookup="accepts_allowed_blocks",
               block_slug=block_slug, reason="malformed_json")
        return None
    if not isinstance(parsed, list):
        _trace("db_lookup_miss", lookup="accepts_allowed_blocks",
               block_slug=block_slug, reason="not_a_list")
        return None
    result = [str(x) for x in parsed]
    _trace("db_lookup_hit", lookup="accepts_allowed_blocks",
           block_slug=block_slug, count=len(result))
    return result


@functools.lru_cache(maxsize=256)
def primary_content_attr(block_slug: str) -> str | None:
    """Return the primary TEXT content attr name for `block_slug`, or None.

    Queries block_attributes for rows where:
      - block_slug = the given slug
      - role IN ('content', 'text-content')  — DB-authoritative text-content signal
      - attr_type = 'string'                 — scalar text, not object/array

    Resolution:
      - Exactly one row → return it.
      - More than one → prefer by name order: 'content', 'text', 'label', 'body',
        'title' (SGS/WP primary-text convention); return the first match, else None
        (ambiguous — caller should fall back to inner HTML).
      - Zero rows → None.

    LRU-cached per slug. Used by Stage 3 build_block_markup to emit child-block
    text into the child's typed attr (not as bare inner HTML) so dynamic render.php
    blocks (e.g. sgs/heading) read the correct attr and don't render blank.

    R-31-1: DB-only read path. No hardcoded slug→attr dicts.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/heading'.

    Returns:
        Attr name string (e.g. 'content') or None.
    """
    if not block_slug:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND role IN ('content', 'text-content') "
            "AND attr_type = 'string'",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="primary_content_attr",
               block_slug=block_slug, reason="operational_error")
        return None
    finally:
        conn.close()

    if not rows:
        _trace("db_lookup_miss", lookup="primary_content_attr",
               block_slug=block_slug, reason="no_rows")
        return None

    names = [r[0] for r in rows]

    if len(names) == 1:
        _trace("db_lookup_hit", lookup="primary_content_attr",
               block_slug=block_slug, attr_name=names[0])
        return names[0]

    # More than one row — prefer by SGS/WP primary-text convention name order.
    _PREFERRED = ("content", "text", "label", "body", "title")
    for preferred in _PREFERRED:
        if preferred in names:
            _trace("db_lookup_hit", lookup="primary_content_attr",
                   block_slug=block_slug, attr_name=preferred, via="preference")
            return preferred

    # Ambiguous (multiple rows, none matching preferred names) — caller falls back.
    _trace("db_lookup_miss", lookup="primary_content_attr",
           block_slug=block_slug, reason="ambiguous", candidates=names)
    return None


def nested_attr_named(
    block_slug: str, name: str
) -> tuple[str, str | None, str | None] | None:
    """Return (attr_name, role, attr_type) when `block_slug` has a `nested`
    content-bearing attr whose OWN `attr_name` is LITERALLY `name` (kebab≡camel
    normalised) — else None.

    Deliberately narrower than `content_attr_for_element`'s Tier-0 (which also
    matches on `canonical_slot == bem_element`, e.g. accordion-item's `title`
    row has `canonical_slot='heading'`). This EXACT-NAME-ONLY lookup is the
    site for a cross-family element match (Mechanism B's generic path, a
    BEM __element token whose block prefix does NOT belong to `block_slug`'s
    own family, e.g. a draft's `sgs-brand__attribution` inside a promoted
    `sgs/quote`): the D279 QC regression guard proved that resolving a
    cross-family element via a canonical_slot/alias identity match is UNSAFE
    (it hijacked `sgs-accordion__heading` — element token 'heading' aliasing
    accordion-item's `title` via canonical_slot — into a scalar lift, silently
    dropping the child heading BLOCK the golden fixture expects). Requiring
    the attribute's OWN name to literally equal the element token is a much
    stronger, self-describing signal that only a genuinely-scoped attr
    (e.g. `attribution`) can satisfy — a generically-named attr like `title`
    can never accidentally match a differently-worded foreign element.

    R-31-1: DB-only read path. No hardcoded slug→attr dicts.
    """
    if not block_slug or not name:
        return None

    _content_roles = tuple(sorted(_content_bearing_roles()))
    if not _content_roles:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        _placeholders = ", ".join("?" for _ in _content_roles)
        rows = conn.execute(
            "SELECT attr_name, role, attr_type FROM block_attributes "
            f"WHERE block_slug = ? AND emit_shape = 'nested' AND role IN ({_placeholders})",
            (block_slug, *_content_roles),
        ).fetchall()
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()

    norm_name = name.replace("-", "").lower()
    for attr_name, role, attr_type in rows:
        if attr_name == name or attr_name.replace("-", "").lower() == norm_name:
            return (attr_name, role, attr_type)
    return None


def _variant_modifier_tiebreak(
    block_slug: str,
    candidates: list[tuple[str, str | None, str | None, str | None]],
    modifiers: tuple[str, ...],
) -> tuple[str, str | None, str | None, str | None] | None:
    """Disambiguate a same-tier `content_attr_for_element` alias tie using
    `variant_slots` (FR-31-20) — GENERAL, not product-card-specific.

    `candidates` are same-match-tier content-attr rows that all alias one
    draft BEM element token (e.g. `featuredTag`/`trialTag` both alias 'tag').
    `modifiers` are the BEM modifiers the draft's ACTUAL element carries
    (e.g. `('featured',)`). A candidate wins when its `attr_name` is the
    `unique_slot` `variant_slots` declares for a `variant_value` matching one
    of `modifiers` case-insensitively — i.e. the block's own DB-declared
    variant-discrimination fact says "this attr is what names the
    `--featured` variant", which is exactly the disambiguating signal the
    draft's modifier supplies. Returns None (no change) when zero or 2+
    candidates match — an unresolved ambiguity is never guessed at; the
    caller keeps its existing first-by-rowid default.

    R-31-1: reads `variant_slots` only, no per-block/per-attr literal.
    """
    if not modifiers:
        return None
    mods_lower = {m.lower() for m in modifiers if m}
    if not mods_lower:
        return None
    slot_to_variants: dict[str, set[str]] = {}
    for variant_value, slots in _variant_slots_map(block_slug):
        for slot_name, _slot_value in slots:
            if slot_name:
                slot_to_variants.setdefault(slot_name, set()).add(
                    str(variant_value).lower()
                )
    matches = [
        row for row in candidates
        if mods_lower & slot_to_variants.get(row[0], set())
    ]
    if len(matches) == 1:
        return matches[0]
    return None  # 0 or 2+ matches — genuinely ambiguous, do not guess


def content_attr_for_element(
    block_slug: str, bem_element: str, tier: str | None = None,
    modifiers: tuple[str, ...] = (),
) -> tuple[str, str | None, str | None, str | None] | None:
    """Resolve a draft BEM __element token to `block_slug`'s content attr.

    Spec 31 §13.3 FR-31-2.6: the per-attr content walk resolves each draft
    element to the composite's own typed attr by MATCH STRENGTH, not DB row
    order. Ranking (lower match-tier wins; a same-tier tie is broken by
    ``modifiers`` — see below — before falling back to the first DB row):

      Match-tier 0 (direct/exact): the attr's `canonical_slot` == element
              token, OR the attr's own `attr_name` == element token.
      Match-tier 1 (alias): the element token appears in the alias list of
              the element-scope `slots` row named by the attr's
              `canonical_slot`.

    ``modifiers`` (added — general BEM-modifier disambiguation, Task 3
    2026-09-05): when a same-tier alias match is AMBIGUOUS (2+ candidate
    attrs share the tier, e.g. `sgs/product-card`'s `featuredTag` and
    `trialTag` both alias element token 'tag' via `canonical_slot='label'`),
    a rowid tie-break silently always picks the same winner regardless of
    which variant the draft actually authored — proven live: a
    `--featured`-modified tag's text landed in `trialTag` every time,
    because `trialTag` has the lower rowid. This is NOT a product-card
    special case — it is a GENERAL BEM-modifier routing gap: the caller (the
    content walker) already extracts every own-family modifier an element
    carries (device-tier modifiers reuse the SAME mechanism below); passing
    them through here lets a same-tier ambiguity resolve via the block's
    OWN `variant_slots` declaration (FR-31-20) — the DB fact that already
    states which attr is the discriminating slot for which variant value —
    rather than an arbitrary DB row order. Resolution: among the tied
    candidates, an attr_name that is `variant_slots.unique_slot` for a
    `variant_value` matching one of ``modifiers`` (case-insensitive) wins.
    If zero or 2+ candidates match, behaviour is UNCHANGED (first-by-rowid)
    — this only narrows an existing ambiguity, never invents a new one.
    R-31-1: DB-only (`variant_slots`), no per-block/per-slug literal.

    ``tier`` (added — content-router device-tier axis, mirrors the CSS
    router's `modifier_suffixes(kind='breakpoint')` vocabulary so content and
    CSS share ONE suffix grammar, no new table):

    1. Base resolution (this function's existing match-strength ranking)
       EXCLUDES any attr that is itself tier-suffixed — i.e. whose name ends
       with a DB breakpoint suffix (Mobile/Tablet/Desktop, sourced from
       `modifier_suffixes(kind='breakpoint')`) AND whose name-minus-suffix is
       ALSO a declared content-role attr on this same block. This is the
       fix for the rowid-wins bug: `sgs/hero.splitImageMobile` no longer
       competes for the base `image` lookup that `splitImage` should win.
       Both clauses matter — an attr that merely ends in a suffix WORD but
       has no base sibling (e.g. a hypothetical `heroMobile` with no `hero`
       attr) is NOT excluded.
    2. If ``tier`` is given, the base attr is resolved first (per the
       exclusion above), then `{base_attr}{Suffix}` is looked up among the
       block's OWN declared attrs (any of the fetched rows, tier-suffixed or
       not).
    3. Found → that row's `(attr_name, emit_shape, role, attr_type)` wins.
    4. NOT found (``tier`` requested but no sibling attr exists) → returns
       None, no fallback to the base attr. A loud `db_lookup_miss` trace is
       emitted with `reason="tier_sibling_missing"` — this is a tracked gap
       for the responsive-toggle rollout, never a silent scalar substitution.

    NOT lru-cached: tests (and future callers) monkeypatch `SGS_DB`; a cache
    keyed on the args would leak rows across DB swaps.

    R-31-1: DB-only read path. No hardcoded slug→attr dicts, no hardcoded
    suffix literals — the breakpoint vocabulary is read from
    `modifier_suffixes(kind='breakpoint')`, the SAME accessor the CSS router
    uses, so content and CSS share one grammar.

    Args:
        block_slug:  Fully-qualified SGS slug, e.g. 'sgs/product-card'.
        bem_element: The draft BEM element token, e.g. 'name' from
                     '.sgs-product-card__name'.
        tier:        Optional DB breakpoint-suffix value (e.g. 'Mobile'),
                     already resolved by the caller against
                     `modifier_suffixes(kind='breakpoint')`. None = no tier
                     requested (byte-identical to the pre-tier behaviour,
                     modulo the rule-1 exclusion correction above).
        modifiers:   Every own-family BEM modifier token this draft element
                     carries (e.g. `('featured',)` from
                     `sgs-product-card__tag--featured`), in no particular
                     order. Used ONLY to break a same-tier alias tie via
                     `variant_slots` (see above) — an empty tuple (default)
                     reproduces the pre-existing behaviour exactly.

    Returns:
        (attr_name, emit_shape, role, attr_type) for the best match, or None.
    """
    if not block_slug or not bem_element:
        return None

    # FR-31-2.2 content-role allowlist — sourced from roles.classification like
    # every other call site (equivalent_block_for, array_content). QC fix
    # 2026-07-05: the previous in-code 5-tuple here had DRIFTED from the DB
    # fact (missing link-href + the 4 icon-* roles) — the exact R-31-1 duplicate
    # pattern; the roles table is the single source.
    _content_roles = tuple(sorted(_content_bearing_roles()))
    if not _content_roles:
        return None  # positive allowlist closes by default (safe direction)

    conn = sqlite3.connect(SGS_DB)
    try:
        _placeholders = ", ".join("?" for _ in _content_roles)
        attr_rows = conn.execute(
            "SELECT attr_name, canonical_slot, emit_shape, role, attr_type "
            "FROM block_attributes "
            f"WHERE block_slug = ? AND role IN ({_placeholders}) "
            "ORDER BY rowid",
            (block_slug, *_content_roles),
        ).fetchall()
        # EVERY attr name on the block, regardless of role — the tier-exclusion
        # base-sibling test below must NOT be content-filtered. If it were, an
        # asymmetric reclassification (tier row content, base row still
        # styling-behaviour) would leave the base name absent from the set, the
        # Mobile attr would escape exclusion, enter base_rows and win the base
        # lookup by rowid — silently resurrecting the exact defect the exclusion
        # exists to kill. Measured 2026-08-03: 0 such pairs today, but 331 of the
        # 339 base/tier pairs are one reclassification away (QC round 2).
        all_attr_names = {
            r[0] for r in conn.execute(
                "SELECT attr_name FROM block_attributes WHERE block_slug = ?",
                (block_slug,),
            ).fetchall()
        }
        slot_rows = conn.execute(
            "SELECT slot_name, aliases FROM slots WHERE scope = 'element'"
        ).fetchall()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element,
               reason="operational_error")
        return None
    finally:
        conn.close()

    if not attr_rows:
        _trace("db_lookup_miss", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element, reason="no_rows")
        return None

    # slot_name → set of alias tokens (malformed alias JSON = no aliases).
    slot_aliases: dict[str, set[str]] = {}
    for slot_name, aliases_json in slot_rows:
        try:
            parsed = json.loads(aliases_json) if aliases_json else []
        except (ValueError, TypeError):
            parsed = []
        if isinstance(parsed, list):
            slot_aliases[slot_name] = {str(a) for a in parsed}

    # Kebab≡camel normalisation for the attr-name tier-0 compare: a draft BEM
    # element token is kebab-case ('price-note') while attrs are camelCase
    # ('priceNote') — the SAME identifier in the two grammars. Normalising
    # (lowercase, hyphens stripped) is a spelling-convention bridge, not a
    # name-heuristic (FR-31-2.1a: no semantic parsing; both sides compared
    # whole). Added 2026-07-04 (Gate A — the card's __price-note element).
    _norm_el = bem_element.replace("-", "").lower()

    # Rule 1 (the fix): base resolution must exclude tier-suffixed siblings.
    # `_declared_names` is EVERY content-role attr name fetched above (the
    # full, unfiltered set) — an attr is tier-suffixed iff its name ends with
    # a DB breakpoint suffix AND the name-minus-suffix is ALSO in this set.
    # Degrades to an empty suffix vocabulary (no exclusion) if the
    # `modifier_suffixes` table itself is unavailable — this keeps the
    # isolated-fixture tests (which build only `block_attributes` + `slots`)
    # working unchanged; a missing table is a "nothing to exclude" signal,
    # not an error.
    try:
        _tier_suffixes = modifier_suffixes("breakpoint")
    except sqlite3.OperationalError:
        _tier_suffixes = ()

    # Role-AGNOSTIC (see the all_attr_names query above): the exclusion asks
    # "does a base sibling exist on this block", never "is that base content".
    _declared_names = all_attr_names or {r[0] for r in attr_rows}
    _by_name: dict[str, tuple[str, str | None, str | None, str | None]] = {
        r[0]: (r[0], r[2], r[3], r[4]) for r in attr_rows
    }

    def _is_tier_suffixed(name: str) -> str | None:
        """Return the base attr name if `name` is a tier-suffixed sibling of
        a declared content attr on this block, else None."""
        for sfx in _tier_suffixes:
            if sfx and name.endswith(sfx) and len(name) > len(sfx):
                base = name[: -len(sfx)]
                if base and base in _declared_names:
                    return base
        return None

    base_rows = [row for row in attr_rows if _is_tier_suffixed(row[0]) is None]

    best: tuple[str, str | None, str | None, str | None] | None = None
    best_tier: int | None = None
    # ALL rows at the current best tier, rowid-ordered — needed so a same-tier
    # ambiguity can be disambiguated by `modifiers` below rather than only ever
    # seeing the first (rowid-winning) candidate. Tier-0 still breaks the loop
    # immediately (unchanged): an exact name/canonical_slot match is definitional,
    # not an alias-tier ambiguity, so it is never a candidate for modifier
    # disambiguation.
    tier_candidates: list[tuple[str, str | None, str | None, str | None]] = []
    for attr_name, canonical_slot, emit_shape, role, attr_type in base_rows:
        if (canonical_slot == bem_element or attr_name == bem_element
                or attr_name.replace("-", "").lower() == _norm_el):
            best = (attr_name, emit_shape, role, attr_type)
            best_tier = 0
            break  # rows are rowid-ordered; the first tier-0 hit is final.
        elif bem_element in slot_aliases.get(canonical_slot or "", ()):
            match_tier = 1
            if best_tier is None or match_tier < best_tier:
                best_tier = match_tier
                tier_candidates = [(attr_name, emit_shape, role, attr_type)]
            elif match_tier == best_tier:
                tier_candidates.append((attr_name, emit_shape, role, attr_type))

    if best is None and tier_candidates:
        best = tier_candidates[0]  # unchanged default: first-by-rowid
        if len(tier_candidates) > 1 and modifiers:
            _disambiguated = _variant_modifier_tiebreak(
                block_slug, tier_candidates, modifiers
            )
            if _disambiguated is not None:
                best = _disambiguated

    if best is None:
        _trace("db_lookup_miss", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element, reason="no_match")
        return None

    if tier is None:
        _trace("db_lookup_hit", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element,
               attr_name=best[0], tier=best_tier)
        return best

    # A-COLLAPSE for Desktop: the SGS device system has no `...Desktop`
    # attribute at all — the unsuffixed BASE attr IS the desktop value.
    # Spec 31 §13.4 FR-31-5.2 states this for CSS routing ("Map Desktop ->
    # the base attr — there is no ...Desktop attr"); FR-31-5.2 itself
    # governs CSS routing only, so this is an EXTENSION BY ANALOGY to
    # content routing, not a direct application. Verified empirically
    # (2026-08-06): across all 23 content-bearing tier-sibling pairs on the
    # 8 blocks that declare them, not one block declares a `...Desktop`
    # sibling attr.
    #
    # WHICH tier is the base is decided by a stated RULE, never by position.
    # `device_tier_ranges()` is the R-31-1 permitted-constant (Spec 31 §13.4:
    # only the 768/1024 boundary widths and the ranges derived from them);
    # the base tier is the one whose range has NO upper bound. Deriving it
    # this way — rather than indexing the suffix vocabulary (`[-1]`) — keeps
    # the answer correct if `modifier_suffixes` is ever reordered, whose row
    # order is separately load-bearing. `styling_helpers.collect_css_decls_
    # for_element` performs the SAME Desktop→base collapse on the CSS side;
    # this is the content-side half of one rule, not a second mechanism.
    _ranges = device_tier_ranges()
    _desktop_suffix = max(_ranges, key=lambda r: r[2])[0] if _ranges else None
    if _desktop_suffix is not None and tier == _desktop_suffix:
        _trace("db_lookup_hit", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element,
               attr_name=best[0], tier=best_tier, device_tier=tier,
               base_attr=best[0], reason="desktop_collapse_to_base")
        return best

    # A Tablet/Mobile device tier WAS requested — the base attr must have a
    # declared `{base_attr}{Suffix}` sibling; no fallback to the base attr
    # (the owner's ruling — a silent fallback here would hide the exact gap
    # this mechanism exists to surface).
    sibling_name = f"{best[0]}{tier}"
    sibling = _by_name.get(sibling_name)
    if sibling is None:
        _trace("db_lookup_miss", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element,
               reason="tier_sibling_missing", base_attr=best[0],
               requested_tier=tier, sibling_name=sibling_name)
        return None

    _trace("db_lookup_hit", lookup="content_attr_for_element",
           block_slug=block_slug, element=bem_element,
           attr_name=sibling[0], tier=best_tier, device_tier=tier,
           base_attr=best[0])
    return sibling


def content_attrs_for_identity(
    parent_slug: str, identity_slug: str
) -> list[tuple[str, str | None, str | None, str | None]]:
    """Return EVERY (attr_name, emit_shape, role, attr_type) row on
    ``parent_slug`` whose ``equivalent_block_for`` resolves to ``identity_slug``.

    Spec 31 §13.3 FR-31-2.6 sibling to ``content_attr_for_element`` — the
    FOREIGN-IDENTITY leg-2 arm (D279): a child element that does NOT belong
    to the parent's own BEM family may still resolve (via its OWN classes,
    ``resolve_slug_from_bem``) to a DIFFERENT, DB-registered block that is
    EXACTLY the identity one or more of the parent's own content attrs
    declare (e.g. ``sgs/product-card``'s ``ctaText`` AND ``ctaUrl`` both
    resolve to ``sgs/button`` via ``canonical_slot='button'``). Unlike
    ``content_attr_for_element`` (keyed by a BEM __element token against a
    SINGLE best-match attr — its single-winner contract is unchanged by this
    function), this returns EVERY attr sharing the identity, so one foreign
    element can lift into MULTIPLE attrs in one pass (amendment 1 — the
    multi-attr loop). Return shape matches ``content_attr_for_element`` for
    drop-in reuse by the same caller-side role/type guard.

    R-31-1: DB-only read path; delegates entirely to the existing
    ``equivalent_block_for`` join (no duplicate slug/alias logic here).

    Args:
        parent_slug:   Fully-qualified SGS slug, e.g. 'sgs/product-card'.
        identity_slug: The resolved foreign block slug, e.g. 'sgs/button'.

    Returns:
        A list of (attr_name, emit_shape, role, attr_type) tuples, possibly
        empty when no attr on ``parent_slug`` shares that identity.
    """
    if not parent_slug or not identity_slug:
        return []
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name, emit_shape, role, attr_type "
            "FROM block_attributes WHERE block_slug = ?",
            (parent_slug,),
        ).fetchall()
    finally:
        conn.close()
    out: list[tuple[str, str | None, str | None, str | None]] = []
    for attr_name, emit_shape, role, attr_type in rows:
        if equivalent_block_for(parent_slug, attr_name) == identity_slug:
            out.append((attr_name, emit_shape, role, attr_type))
    if out:
        _trace("db_lookup_hit", lookup="content_attrs_for_identity",
               parent_slug=parent_slug, identity_slug=identity_slug,
               attrs=[a for a, *_ in out])
    else:
        _trace("db_lookup_miss", lookup="content_attrs_for_identity",
               parent_slug=parent_slug, identity_slug=identity_slug)
    return out


# ----------------------------------------------------------------------------
# Smoke test
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print("== block_exists ==")
    for s in ["sgs/container", "sgs/product-card", "sgs/button", "sgs/multi-button",
              "sgs/featured-product", "sgs/banana"]:
        print(f"  {s:30} -> {block_exists(s)}")
    print("\n== parse_sgs_bem ==")
    for c in ["sgs-featured-product", "sgs-product-card__body",
              "sgs-button--primary", "sgs-gift-section__card--trial",
              "sgs-section-heading__label"]:
        print(f"  {c:40} -> {parse_sgs_bem(c)}")
    print("\n== canonical_slot_for ==")
    for t in ["eyebrow", "label", "headline", "description", "pill",
              "subHeadline", "cta", "trial"]:
        print(f"  {t:20} -> {canonical_slot_for(t)}")
    print("\n== modifier_kind ==")
    for m in ["primary", "hover", "tablet", "trial", "active"]:
        print(f"  {m:15} -> {modifier_kind(m)}")
    print("\n== block_attrs(sgs/container) sample ==")
    for a, info in list(block_attrs("sgs/container").items())[:5]:
        print(f"  {a:25} -> {info}")

    # -----------------------------------------------------------------
    # equivalent_block_for — Spec 22 §FR-31-2.1 unit tests
    # -----------------------------------------------------------------
    print("\n== equivalent_block_for (Spec 22 §FR-31-2.1) ==")
    cases: list[tuple[str, str, str | None, str]] = [
        # (block_slug, attr_name, expected, label)
        ("sgs/product-card", "description", "sgs/text",
         "Tier A: role=text-content (in content allowlist) + canonical_slot='text' → sgs/text"),
        ("sgs/hero", "headlineFontSizeDesktop", None,
         "Positive-allowlist: role=typography NOT in content set → None"),
        ("sgs/back-to-top", "position", None,
         "Triple-NULL row: role=None → None (positive-allowlist closes by default)"),
        ("sgs/icon", "iconSource", "sgs/icon",
         "Tier A: role='image-object' (content-bearing per slot_synonyms.role_classification) "
         "+ canonical_slot='icon' → sgs/icon. Expectation updated 2026-05-27 (D85) — prior "
         "expectation of None assumed role=None, but DB has role='image-object' (verified)."),
        # Rater A adversarial test (2026-05-27 /qc-council finding): textTransform is a
        # styling attr whose canonical_slot was set to 'text' in the DB; original
        # negative-blocklist short-circuited on role=NULL and returned 'sgs/text',
        # producing the FR-31-2.2 "typography looks like heading" misroute. Positive-
        # allowlist closes the hole because role=None is not in _CONTENT_BEARING_ROLES.
        ("sgs/cta-section", "textTransform", None,
         "FR-31-2.2 adversarial (Rater A 2026-05-27): canonical_slot='text' matches "
         "Tier A but role=None bypasses content allowlist → None (was 'sgs/text' pre-fix)"),
    ]
    failures: list[str] = []
    for block_slug, attr_name, expected, label in cases:
        actual = equivalent_block_for(block_slug, attr_name)
        ok = actual == expected
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {block_slug}.{attr_name}")
        print(f"         expected={expected!r}  actual={actual!r}")
        print(f"         {label}")
        if not ok:
            failures.append(f"{block_slug}.{attr_name}: expected {expected!r} got {actual!r}")
    print()
    if failures:
        print(f"FAILURES: {len(failures)}")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("All equivalent_block_for tests PASS.")


# ----------------------------------------------------------------------------
# Module-load seeder — MUST be last (2026-08-02)
# ----------------------------------------------------------------------------
# `_migrate_scalar_media_roles()` calls `is_class_section_block()`, which is defined
# above this line but ~2200 lines BELOW the other module-load seeders. Invoking it with
# them raised NameError at import; the guard's broad except swallowed it and the seeder
# silently refused to repair anything. Keep this call at the foot of the file.
if _SGS_DB_PRESENT_AT_IMPORT:
    _migrate_scalar_media_roles()
