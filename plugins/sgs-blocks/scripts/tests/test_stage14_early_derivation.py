"""Stage 14's code read starts during Stage 12 (its database inputs are loaded first, on the seeder's connection)."""
import importlib.util
import sqlite3
import sys
import threading
from pathlib import Path
from types import SimpleNamespace

import pytest

SCRIPTS = Path(__file__).resolve().parents[1]


def _load(name: str, relative: str):
    sys.path[:0] = [str(SCRIPTS / "dbschema"), str(SCRIPTS), str(SCRIPTS / "lib"), str(SCRIPTS / "content-role-detect")]
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def update():
    return _load("update_stage14_under_test", "sgs-update-v2.py")


@pytest.fixture(autouse=True)
def _clean(update):
    update._IDENTITY_DERIVATION.clear()
    yield
    update._IDENTITY_DERIVATION.clear()


def _conn_with_table():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE block_identity_facts (block_slug, fact, value, state, source, evidence)")
    return conn


def test_nothing_started_means_nothing_to_collect(update):
    assert update._collect_identity_derivation() is None


def test_without_the_table_no_early_read_is_started(update):
    update._start_identity_derivation(sqlite3.connect(":memory:"))
    assert update._collect_identity_derivation() is None


def test_the_read_runs_in_another_thread_and_its_result_is_collected_once(update, monkeypatch):
    import block_identity_facts as facts
    import identity_markup as markup
    seen = {}
    monkeypatch.setattr(markup, "load_db_inputs", lambda conn: "db-inputs")

    def fake_derive(db, paths=None):
        seen["db"] = db
        seen["thread"] = threading.current_thread()
        return ["row"], "extractor"

    monkeypatch.setattr(facts, "derive_from", fake_derive)
    update._start_identity_derivation(_conn_with_table())
    assert update._collect_identity_derivation() == (["row"], "extractor")
    assert seen["db"] == "db-inputs" and seen["thread"] is not threading.main_thread()
    assert update._collect_identity_derivation() is None


def test_a_failed_early_read_raises_when_stage_14_collects_it(update, monkeypatch):
    import block_identity_facts as facts
    import identity_markup as markup
    monkeypatch.setattr(markup, "load_db_inputs", lambda conn: "db-inputs")

    def boom(db, paths=None):
        raise RuntimeError("source unreadable")

    monkeypatch.setattr(facts, "derive_from", boom)
    update._start_identity_derivation(_conn_with_table())
    with pytest.raises(RuntimeError, match="source unreadable"):
        update._collect_identity_derivation()
    assert update._collect_identity_derivation() is None


def test_seed_uses_the_finished_read_and_does_not_read_again(monkeypatch, tmp_path):
    facts = _load("facts_under_test3", "lib/block_identity_facts.py")
    monkeypatch.setattr(facts, "_derive", lambda *a, **k: pytest.fail("the code read ran again"))
    fake_x = SimpleNamespace(p=SimpleNamespace(live=tmp_path / "absent-live.json"))
    result = facts.seed(_conn_with_table(), dry_run=True, derived=([], fake_x))
    assert result["rows"] == 0 and result["blocks"] == 0


def test_seed_without_a_finished_read_runs_the_read_itself(monkeypatch, tmp_path):
    facts = _load("facts_under_test4", "lib/block_identity_facts.py")
    called = []
    fake_x = SimpleNamespace(p=SimpleNamespace(live=tmp_path / "absent-live.json"))
    monkeypatch.setattr(facts, "_derive", lambda conn, paths=None: called.append(1) or ([], fake_x))
    facts.seed(_conn_with_table(), dry_run=True)
    assert called == [1]
