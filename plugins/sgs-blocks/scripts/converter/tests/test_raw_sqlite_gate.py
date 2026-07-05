"""test_raw_sqlite_gate.py — proves the raw-sqlite gate catches direct sqlite3
connections under converter/, exempts the accessor layer + tests, and that the
real converter/ tree is clean post the FR-31-8 db_lookup.get_connection() migration.

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_raw_sqlite_gate.py

STOP-31: plant-tested — a planted raw-sqlite.connect() file is caught; the
accessor layer (db/db_lookup.py) and test files are exempt; the current tree
(post task-1 fixes: array_content.py, css_pass.py, fold_helpers.py routed
through db_lookup) is clean.
"""
from __future__ import annotations

from pathlib import Path

from converter.gates.check_raw_sqlite import run


def _scan(tmp_path: Path, filename: str, source: str) -> list[dict]:
    path = tmp_path / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source, encoding="utf-8")
    return run(converter_dir=tmp_path)


# -- caught ------------------------------------------------------------------

def test_catches_bare_sqlite3_connect(tmp_path):
    v = _scan(tmp_path, "probe.py", "import sqlite3\nsqlite3.connect('x.db')\n")
    assert len(v) == 1
    assert v[0]["file"] == "probe.py"


def test_catches_aliased_module_import(tmp_path):
    src = "import sqlite3 as db\ndb.connect('x.db')\n"
    v = _scan(tmp_path, "probe.py", src)
    assert len(v) == 1


def test_catches_from_import_connect(tmp_path):
    src = "from sqlite3 import connect\nconnect('x.db')\n"
    v = _scan(tmp_path, "probe.py", src)
    assert len(v) == 1


def test_catches_aliased_from_import_connect(tmp_path):
    src = "from sqlite3 import connect as c\nc('x.db')\n"
    v = _scan(tmp_path, "probe.py", src)
    assert len(v) == 1


def test_catches_in_nested_service_dir(tmp_path):
    src = "import sqlite3\ndef f():\n    return sqlite3.connect('x.db')\n"
    v = _scan(tmp_path, "services/some_service.py", src)
    assert len(v) == 1
    assert v[0]["file"] == str(Path("services") / "some_service.py")


# -- exempt --------------------------------------------------------------

def test_exempts_accessor_layer(tmp_path):
    """converter/db/db_lookup.py IS the accessor layer — permitted to connect."""
    src = "import sqlite3\nsqlite3.connect('x.db')\n"
    v = _scan(tmp_path, str(Path("db") / "db_lookup.py"), src)
    assert v == []


def test_exempts_test_files(tmp_path):
    src = "import sqlite3\nsqlite3.connect('x.db')\n"
    v = _scan(tmp_path, "test_something.py", src)
    assert v == []


def test_exempts_files_under_tests_dir(tmp_path):
    src = "import sqlite3\nsqlite3.connect('x.db')\n"
    v = _scan(tmp_path, str(Path("tests") / "fixture_helper.py"), src)
    assert v == []


def test_ignores_unrelated_connect_call(tmp_path):
    """A `.connect(...)` call on something that isn't the sqlite3 module/function
    must not false-positive (e.g. a signal/socket-style .connect())."""
    src = "class Bus:\n    def connect(self, x):\n        pass\nBus().connect('x')\n"
    v = _scan(tmp_path, "probe.py", src)
    assert v == []


# -- real tree is clean ---------------------------------------------------

def test_current_converter_tree_is_clean():
    """Post task-1 (array_content.py / css_pass.py / fold_helpers.py routed
    through db_lookup.get_connection() / db_lookup accessors), the real
    converter/ tree has zero raw sqlite3.connect() calls outside db_lookup.py."""
    violations = run()
    assert violations == [], violations
