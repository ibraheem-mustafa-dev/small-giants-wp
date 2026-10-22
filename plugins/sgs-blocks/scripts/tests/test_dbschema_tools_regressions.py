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
