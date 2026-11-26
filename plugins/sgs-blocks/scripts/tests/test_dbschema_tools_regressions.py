"""
test_dbschema_tools_regressions.py
==================================
Regression tests for the dbschema tools. Every database is built in a temp folder.

Covers:
  - retire_table.retire: a BLOB survives the archive round trip; a lossy archive refuses the DROP
  - wp_reference_archive.restore: restoring twice leaves one copy of each row
  - seed_reference_data._seed_property_equivalents: a row without the note key still seeds
  - migrate.cmd_mark_applied: a re-run keeps the original applied_at

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_dbschema_tools_regressions.py -q
"""

from __future__ import annotations

import gzip
import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

_DBSCHEMA = Path(__file__).resolve().parents[1] / "dbschema"
sys.path.insert(0, str(_DBSCHEMA))

import migrate  # noqa: E402
import retire_table  # noqa: E402
import seed_reference_data  # noqa: E402
import wp_reference_archive  # noqa: E402

import pytest  # noqa: E402


def test_retire_keeps_blob_bytes_and_drops(tmp_path, monkeypatch):
    db = tmp_path / "t.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE doomed (id INTEGER PRIMARY KEY, data BLOB)")
    con.execute("INSERT INTO doomed VALUES (1, ?)", (b"\x00\x01",))
    con.commit()
    con.close()
    monkeypatch.setattr(retire_table, "RETIRED_DIR", tmp_path / "retired")
    assert retire_table.retire(db, "doomed", "test", dry_run=False) == 0
    archived = json.loads(gzip.open(tmp_path / "retired" / "doomed.json.gz", "rt", encoding="utf-8").read())
    assert archived["rows"][0]["data"] == {"__bytes_b64": "AAE="}
    con = sqlite3.connect(db)
    try:
        assert con.execute("SELECT name FROM sqlite_master WHERE name='doomed'").fetchone() is None
    finally:
        con.close()


def test_retire_refuses_drop_when_archive_differs_from_live(tmp_path, monkeypatch):
    db = tmp_path / "t.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE doomed (id INTEGER PRIMARY KEY, data BLOB)")
    con.execute("INSERT INTO doomed VALUES (1, ?)", (b"\x00\x01",))
    con.commit()
    con.close()
    monkeypatch.setattr(retire_table, "RETIRED_DIR", tmp_path / "retired")
    monkeypatch.setattr(retire_table, "_encode_extra", lambda value: str(value))
    assert retire_table.retire(db, "doomed", "test", dry_run=False) == 3
    con = sqlite3.connect(db)
    try:
        assert con.execute("SELECT COUNT(*) FROM doomed").fetchone()[0] == 1
    finally:
        con.close()


def test_restore_twice_does_not_duplicate_rows(tmp_path, monkeypatch):
    archive_dir = tmp_path / "archive"
    archive_dir.mkdir()
    for table in wp_reference_archive.TABLES:
        payload = {"__columns": ["name"], "rows": [{"name": "a"}, {"name": "b"}]}
        with gzip.open(archive_dir / f"{table}.json.gz", "wb") as fh:
            fh.write(json.dumps(payload).encode("utf-8"))
    monkeypatch.setattr(wp_reference_archive, "ARCHIVE_DIR", archive_dir)
    db = tmp_path / "t.db"
    con = sqlite3.connect(db)
    for table in wp_reference_archive.TABLES:
        con.execute(f"CREATE TABLE {table} (id INTEGER PRIMARY KEY, name TEXT)")
    con.commit()
    con.close()
    assert wp_reference_archive.restore(db) == 0
    assert wp_reference_archive.restore(db) == 0
    con = sqlite3.connect(db)
    try:
        for table in wp_reference_archive.TABLES:
            assert con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] == 2
    finally:
        con.close()


def test_property_equivalents_row_without_note_seeds(tmp_path, monkeypatch):
    data = tmp_path / "property-equivalents.json"
    data.write_text(
        json.dumps({"rows": [{"draft_property": "a", "setting_property": "b", "hop": 1, "condition": None}]}),
        encoding="utf-8",
    )
    monkeypatch.setattr(seed_reference_data, "_PROPERTY_EQUIVALENTS_FILE", data)
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE property_equivalents (draft_property TEXT, setting_property TEXT, hop INTEGER, condition TEXT, note TEXT)"
    )
    seed_reference_data._seed_property_equivalents(conn)
    assert conn.execute("SELECT draft_property, note FROM property_equivalents").fetchall() == [("a", None)]


def _block_composition_conn(tmp_path, monkeypatch, rows):
    data = tmp_path / "block-composition.json"
    data.write_text(
        json.dumps({"__columns": ["block_slug", "wraps_block", "composition_role", "container_kind"], "rows": rows}),
        encoding="utf-8",
    )
    monkeypatch.setattr(seed_reference_data, "_BLOCK_COMPOSITION_FILE", data)
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE blocks (slug TEXT PRIMARY KEY)")
    conn.execute(
        "CREATE TABLE block_composition (block_slug TEXT PRIMARY KEY, wraps_block TEXT, composition_role TEXT NOT NULL, "
        "accepts_allowed_blocks TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, container_kind TEXT, "
        "FOREIGN KEY (block_slug) REFERENCES blocks(slug))"
    )
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def test_block_composition_seed_keeps_scraped_column_and_deletes_dropped_rows(tmp_path, monkeypatch):
    conn = _block_composition_conn(tmp_path, monkeypatch, [["sgs/a", None, "section-root", "section"], ["core/b", "sgs/a", "leaf", None]])
    conn.execute("INSERT INTO blocks VALUES ('sgs/a')")
    conn.execute("INSERT INTO block_composition (block_slug, composition_role, accepts_allowed_blocks) VALUES ('sgs/a', 'leaf', '[\"x\"]')")
    conn.execute("INSERT INTO blocks VALUES ('sgs/gone')")
    conn.execute("INSERT INTO block_composition (block_slug, composition_role) VALUES ('sgs/gone', 'leaf')")
    seed_reference_data._seed_block_composition(conn)
    rows = conn.execute(
        "SELECT block_slug, wraps_block, composition_role, accepts_allowed_blocks, container_kind FROM block_composition ORDER BY 1"
    ).fetchall()
    # the seeded columns follow the file, the scraped one is untouched, the unlisted row is gone, and the core row went in although
    # its `blocks` row does not exist yet (foreign keys were on when the seeder was called)
    assert rows == [("core/b", "sgs/a", "leaf", None, None), ("sgs/a", None, "section-root", '["x"]', "section")]


def test_block_composition_seed_refuses_a_file_with_other_columns(tmp_path, monkeypatch):
    data = tmp_path / "block-composition.json"
    data.write_text(json.dumps({"__columns": ["block_slug"], "rows": [["sgs/a"]]}), encoding="utf-8")
    monkeypatch.setattr(seed_reference_data, "_BLOCK_COMPOSITION_FILE", data)
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE block_composition (block_slug TEXT PRIMARY KEY, wraps_block TEXT, composition_role TEXT NOT NULL, accepts_allowed_blocks TEXT, container_kind TEXT)")
    conn.execute("INSERT INTO block_composition (block_slug, composition_role) VALUES ('sgs/keep', 'leaf')")
    seed_reference_data._seed_block_composition(conn)
    assert conn.execute("SELECT block_slug FROM block_composition").fetchall() == [("sgs/keep",)]


def test_mark_applied_rerun_keeps_original_timestamp(tmp_path, monkeypatch):
    db = tmp_path / "t.db"
    sqlite3.connect(db).close()
    manifest = tmp_path / "manifest.json"
    manifest.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(migrate, "load_replay_set", lambda _m: ["001-a.sql"])
    con = sqlite3.connect(db)
    migrate.ensure_tracking(con)
    con.execute("INSERT INTO schema_migrations VALUES ('001-a.sql', '2020-01-01T00:00:00+00:00')")
    con.commit()
    con.close()
    assert migrate.cmd_mark_applied(db, manifest) == 0
    con = sqlite3.connect(db)
    try:
        assert con.execute("SELECT applied_at FROM schema_migrations").fetchone()[0] == "2020-01-01T00:00:00+00:00"
    finally:
        con.close()


# --- setting records (seed_reference_data._seed_setting_records) ---

_RECORD_TABLES = ("setting_placements", "block_part_order", "setting_record_blocks")
_RECORD_MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "2026-11-22-setting-record-tables.py"


def _run_record_migration(db, monkeypatch, name):
    spec = importlib.util.spec_from_file_location(name, _RECORD_MIGRATION)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    monkeypatch.setattr(migration, "DB", db)
    assert migration.main() == 0


def _record_db(tmp_path, monkeypatch):
    """A temp DB holding the three setting record tables, made by the real migration."""
    db = tmp_path / "t.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE marker (x)")  # the migration refuses a 0-byte file
    con.commit()
    con.close()
    _run_record_migration(db, monkeypatch, "setting_record_migration")
    return db


def _entry(setting="gap", part="ROOT", **over):
    entry = {"setting": setting, "part": part, "props": ["gap"], "state": None, "tiers": [], "kind": "value"}
    entry.update(over)
    return entry


def _write_record(folder, stem, entries, parts=("p__a", "p__b"), **extra):
    folder.mkdir(parents=True, exist_ok=True)
    data = {"block": f"sgs/{stem}", "schemaVersion": 1, "parts": list(parts), "entries": entries}
    data.update(extra)
    (folder / f"{stem}.json").write_text(json.dumps(data), encoding="utf-8")


def _record_counts(db):
    con = sqlite3.connect(db)
    try:
        return {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in _RECORD_TABLES}  # noqa: S608
    finally:
        con.close()


def _seed_records(db, folder):
    con = sqlite3.connect(db)
    try:
        seed_reference_data._seed_setting_records(con, folder)
    finally:
        con.close()


def test_setting_record_migration_is_idempotent(tmp_path, monkeypatch):
    db = _record_db(tmp_path, monkeypatch)
    _run_record_migration(db, monkeypatch, "setting_record_migration_again")
    con = sqlite3.connect(db)
    try:
        names = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type IN ('table','index')")}
    finally:
        con.close()
    assert {*_RECORD_TABLES, "idx_setting_placements_block", "idx_setting_placements_setting"} <= names


def test_setting_records_two_files_seed_with_row_counts_equal_to_the_files(tmp_path, monkeypatch):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "alpha", [_entry("gap"), _entry("gap", tiers=["@media(max-width:767.98px)"]), _entry("colour", props=["color"])])
    _write_record(folder, "beta", [_entry("gap", part="p__a")], parts=("p__a",))
    _seed_records(db, folder)
    assert _record_counts(db) == {"setting_placements": 4, "block_part_order": 3, "setting_record_blocks": 2}
    con = sqlite3.connect(db)
    try:
        assert con.execute("SELECT block_slug, position, part FROM block_part_order ORDER BY block_slug, position").fetchall() == [
            ("sgs/alpha", 0, "p__a"), ("sgs/alpha", 1, "p__b"), ("sgs/beta", 0, "p__a")]
        record_json = con.execute("SELECT record_json FROM setting_record_blocks WHERE block_slug='sgs/beta'").fetchone()[0]
        assert json.loads(record_json)["entries"][0]["part"] == "p__a"
    finally:
        con.close()


def test_setting_records_schema_versions_one_and_two_both_seed(tmp_path, monkeypatch):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "old", [_entry()])
    v2 = {
        "block": "sgs/new", "schemaVersion": 2,
        "parts": ["p__a", {"part": "p__b", "tag": "span", "parent": "p__a", "builtBy": "script"}],
        "stamp": {"sha": "abc"},
        "accounted": {"testedNoPaint": ["x"], "replacesBlock": "sgs/old", "unvalued": ["y"], "partNotNamed": ["z"]},
        "proofKeys": {"ignored": True},
        "entries": [_entry(values=["a", "b"], symbolic={"colour": "var(--x)"}, unproved="no value", kind=None, accepted="proved on sgs/old")],
    }
    (folder / "new.json").write_text(json.dumps(v2), encoding="utf-8")
    _seed_records(db, folder)
    con = sqlite3.connect(db)
    try:
        assert con.execute("SELECT block_slug, schema_version FROM setting_record_blocks ORDER BY 1").fetchall() == [("sgs/new", 2), ("sgs/old", 1)]
        assert con.execute("SELECT part, tag, parent_part, built_by FROM block_part_order WHERE block_slug='sgs/new' AND position=1").fetchone() == ("p__b", "span", "p__a", "script")
        assert con.execute("SELECT tag, parent_part, built_by FROM block_part_order WHERE block_slug='sgs/new' AND position=0").fetchone() == (None, None, None)
        assert con.execute("SELECT setting_values, symbolic, kind, unproved, accepted FROM setting_placements WHERE block_slug='sgs/new'").fetchone() == (
            '["a", "b"]', '{"colour": "var(--x)"}', None, "no value", "proved on sgs/old")
        assert con.execute("SELECT stamp, tested_no_paint, replaces_block, unvalued, part_not_named FROM setting_record_blocks WHERE block_slug='sgs/new'").fetchone() == (
            '{"sha": "abc"}', '["x"]', "sgs/old", '["y"]', '["z"]')
    finally:
        con.close()


def test_setting_records_a_dropped_file_deletes_that_blocks_rows(tmp_path, monkeypatch):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "alpha", [_entry()])
    _write_record(folder, "beta", [_entry(), _entry("colour", props=["color"])])
    _seed_records(db, folder)
    assert _record_counts(db) == {"setting_placements": 3, "block_part_order": 4, "setting_record_blocks": 2}
    (folder / "beta.json").unlink()
    _seed_records(db, folder)
    assert _record_counts(db) == {"setting_placements": 1, "block_part_order": 2, "setting_record_blocks": 1}
    con = sqlite3.connect(db)
    try:
        assert {r[0] for r in con.execute("SELECT block_slug FROM setting_placements")} == {"sgs/alpha"}
    finally:
        con.close()


@pytest.mark.parametrize(
    "label, mutate, needle",
    [
        ("bad kind", lambda d: d["entries"][0].update(kind="guess"), "kind"),
        ("block does not match the file name", lambda d: d.update(block="sgs/other"), "file name"),
        ("runner entry", lambda d: d["entries"][0].update(runner="node x.mjs"), "runner"),
        ("duplicate key", lambda d: d["entries"].append(dict(d["entries"][0])), "repeats"),
        ("state None and empty string are one key", lambda d: d["entries"].append(dict(d["entries"][0], state="")), "repeats"),
        ("unknown schema version", lambda d: d.update(schemaVersion=3), "schemaVersion"),
        ("props not a list", lambda d: d["entries"][0].update(props="gap"), "props"),
    ],
)
def test_setting_records_a_malformed_file_raises_before_any_row_changes(tmp_path, monkeypatch, label, mutate, needle):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "alpha", [_entry(), _entry("colour", props=["color"])])
    _seed_records(db, folder)
    before = _record_counts(db)
    # A valid change to alpha (sorts before the bad file) and a new valid block must not land when zzz is bad.
    _write_record(folder, "alpha", [_entry()], parts=("p",))
    _write_record(folder, "beta", [_entry("a1"), _entry("a2", props=["a2"])])
    bad = {"block": "sgs/zzz", "schemaVersion": 1, "parts": ["p"], "entries": [_entry()]}
    mutate(bad)
    (folder / "zzz.json").write_text(json.dumps(bad), encoding="utf-8")
    with pytest.raises(seed_reference_data.SettingRecordError, match=needle) as exc:
        _seed_records(db, folder)
    assert "zzz.json" in str(exc.value), label
    assert _record_counts(db) == before, label


def test_setting_records_seed_all_lets_a_bad_file_through_and_changes_nothing(tmp_path, monkeypatch):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "alpha", [_entry(kind="guess")])
    monkeypatch.setattr(seed_reference_data, "seed_motion_presets", lambda _c: None)
    with pytest.raises(seed_reference_data.SettingRecordError, match="alpha.json"):
        seed_reference_data.seed_all(db, folder)
    assert _record_counts(db) == {t: 0 for t in _RECORD_TABLES}


def test_setting_records_seed_all_seeds_them_through_its_last_step(tmp_path, monkeypatch):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "alpha", [_entry()])
    monkeypatch.setattr(seed_reference_data, "seed_motion_presets", lambda _c: None)
    seed_reference_data.seed_all(db, folder)
    assert _record_counts(db) == {"setting_placements": 1, "block_part_order": 2, "setting_record_blocks": 1}


def test_setting_records_a_missing_folder_leaves_the_tables_untouched(tmp_path, monkeypatch, capsys):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "alpha", [_entry()])
    _seed_records(db, folder)
    before = _record_counts(db)
    _seed_records(db, tmp_path / "no-such-folder")
    assert _record_counts(db) == before
    assert "no data files" in capsys.readouterr().err
    (folder / "alpha.json").unlink()
    _seed_records(db, folder)  # an empty folder is treated the same
    assert _record_counts(db) == before


def test_setting_records_state_none_is_stored_as_empty_string(tmp_path, monkeypatch):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "alpha", [_entry(state=None), _entry(state="hover")])
    _seed_records(db, folder)
    con = sqlite3.connect(db)
    try:
        assert sorted(r[0] for r in con.execute("SELECT state FROM setting_placements")) == ["", "hover"]
    finally:
        con.close()


def test_setting_records_warns_when_a_table_shrinks_by_more_than_ten_percent(tmp_path, monkeypatch, capsys):
    db = _record_db(tmp_path, monkeypatch)
    folder = tmp_path / "records"
    _write_record(folder, "alpha", [_entry(f"s{i}", props=[f"p{i}"]) for i in range(10)])
    _seed_records(db, folder)
    capsys.readouterr()
    _write_record(folder, "alpha", [_entry(f"s{i}", props=[f"p{i}"]) for i in range(9)])
    _seed_records(db, folder)
    assert capsys.readouterr().err == ""  # exactly 10% is not more than 10%
    _write_record(folder, "alpha", [_entry(f"s{i}", props=[f"p{i}"]) for i in range(5)])
    _seed_records(db, folder)
    assert "setting_placements shrank from 9 to 5" in capsys.readouterr().err
