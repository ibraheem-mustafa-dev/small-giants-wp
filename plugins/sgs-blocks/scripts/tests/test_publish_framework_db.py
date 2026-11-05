"""publish-framework-db.py: compare-and-swap publish of a private reseed copy to the shared framework DB."""
from __future__ import annotations

import importlib.util
import json
import os
import sqlite3
import time
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "publish-framework-db.py"
spec = importlib.util.spec_from_file_location("publish_framework_db", SCRIPT)
pub = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pub)


def make_db(path: Path, marker: str) -> None:
    con = sqlite3.connect(str(path))
    con.execute("CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT)")
    con.execute("INSERT INTO block_attributes VALUES (?, ?)", (marker, "x"))
    con.commit()
    con.close()


def marker_of(path: Path) -> str:
    con = sqlite3.connect(str(path))
    try:
        return con.execute("SELECT block_slug FROM block_attributes").fetchone()[0]
    finally:
        con.close()


@pytest.fixture()
def shared(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    db = tmp_path / "shared" / "sgs-framework.db"
    db.parent.mkdir()
    make_db(db, "start")
    monkeypatch.setenv("SGS_FRAMEWORK_DB", str(db))
    return db


def reseed(copy: Path, marker: str) -> None:
    con = sqlite3.connect(str(copy))
    con.execute("UPDATE block_attributes SET block_slug = ?", (marker,))
    con.commit()
    con.close()


def test_begin_publish_replaces_shared(shared: Path, tmp_path: Path) -> None:
    copy = tmp_path / "copy.db"
    assert pub.main(["begin", "--copy", str(copy)]) == 0
    reseed(copy, "reseeded")
    assert pub.main(["publish", "--copy", str(copy)]) == 0
    assert marker_of(shared) == "reseeded"
    assert not shared.with_name(shared.name + ".publish.lock").exists()
    assert not shared.with_name(shared.name + ".publishing").exists()
    assert "published_sha256" in json.loads(pub.base_file(copy).read_text())


def test_conflict_when_shared_changed_leaves_shared_untouched(shared: Path, tmp_path: Path) -> None:
    a, b = tmp_path / "a.db", tmp_path / "b.db"
    assert pub.main(["begin", "--copy", str(a)]) == 0
    assert pub.main(["begin", "--copy", str(b)]) == 0
    reseed(a, "from-a")
    reseed(b, "from-b")
    assert pub.main(["publish", "--copy", str(a)]) == 0
    assert pub.main(["publish", "--copy", str(b)]) == pub.EXIT_CONFLICT
    assert marker_of(shared) == "from-a"


def test_reseed_again_after_conflict_succeeds(shared: Path, tmp_path: Path) -> None:
    a, b = tmp_path / "a.db", tmp_path / "b.db"
    pub.main(["begin", "--copy", str(a)])
    pub.main(["begin", "--copy", str(b)])
    reseed(a, "from-a")
    pub.main(["publish", "--copy", str(a)])
    assert pub.main(["publish", "--copy", str(b)]) == pub.EXIT_CONFLICT
    assert pub.main(["begin", "--copy", str(b)]) == 0
    reseed(b, "from-b")
    assert pub.main(["publish", "--copy", str(b)]) == 0
    assert marker_of(shared) == "from-b"


def test_corrupt_copy_is_refused(shared: Path, tmp_path: Path) -> None:
    copy = tmp_path / "copy.db"
    pub.main(["begin", "--copy", str(copy)])
    copy.write_bytes(b"not a database" * 500)
    assert pub.main(["publish", "--copy", str(copy)]) == pub.EXIT_REFUSED
    assert marker_of(shared) == "start"


def test_copy_without_block_attributes_is_refused(shared: Path, tmp_path: Path) -> None:
    copy = tmp_path / "copy.db"
    pub.main(["begin", "--copy", str(copy)])
    con = sqlite3.connect(str(copy))
    con.execute("DROP TABLE block_attributes")
    con.execute("CREATE TABLE other (x)")
    con.commit()
    con.close()
    assert pub.main(["publish", "--copy", str(copy)]) == pub.EXIT_REFUSED
    assert marker_of(shared) == "start"


def test_copy_not_made_by_begin_is_refused(shared: Path, tmp_path: Path) -> None:
    copy = tmp_path / "copy.db"
    make_db(copy, "stranger")
    assert pub.main(["publish", "--copy", str(copy)]) == pub.EXIT_REFUSED
    assert marker_of(shared) == "start"


def test_copy_that_started_from_another_shared_db_is_refused(shared: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    copy = tmp_path / "copy.db"
    pub.main(["begin", "--copy", str(copy)])
    other = tmp_path / "other" / "sgs-framework.db"
    other.parent.mkdir()
    make_db(other, "other")
    monkeypatch.setenv("SGS_FRAMEWORK_DB", str(other))
    assert pub.main(["publish", "--copy", str(copy)]) == pub.EXIT_REFUSED
    assert marker_of(other) == "other"


def test_non_empty_journal_sidecar_is_refused(shared: Path, tmp_path: Path) -> None:
    copy = tmp_path / "copy.db"
    pub.main(["begin", "--copy", str(copy)])
    shared.with_name(shared.name + "-wal").write_bytes(b"pending frames")
    assert pub.main(["publish", "--copy", str(copy)]) == pub.EXIT_REFUSED
    assert marker_of(shared) == "start"


def test_held_lock_blocks_then_stale_lock_is_broken(shared: Path) -> None:
    lock_path = shared.with_name(shared.name + ".publish.lock")
    lock_path.write_text("{}")
    with pytest.raises(pub.PublishRefused):
        with pub.PublishLock(shared, wait_s=0.6, stale_s=300):
            pass
    old = time.time() - 1000
    os.utime(lock_path, (old, old))
    with pub.PublishLock(shared, wait_s=2, stale_s=300) as lock:
        assert lock.held
    assert not lock_path.exists()


def test_lock_released_when_publish_conflicts(shared: Path, tmp_path: Path) -> None:
    copy = tmp_path / "copy.db"
    pub.main(["begin", "--copy", str(copy)])
    reseed_shared = sqlite3.connect(str(shared))
    reseed_shared.execute("UPDATE block_attributes SET block_slug = 'moved'")
    reseed_shared.commit()
    reseed_shared.close()
    assert pub.main(["publish", "--copy", str(copy)]) == pub.EXIT_CONFLICT
    assert not shared.with_name(shared.name + ".publish.lock").exists()


def test_regenerate_refuses_when_override_is_set(shared: Path) -> None:
    assert pub.main(["regenerate"]) == pub.EXIT_REFUSED


def test_begin_refuses_a_copy_that_is_the_shared_db_and_leaves_it_intact(shared: Path) -> None:
    assert pub.main(["begin", "--copy", str(shared)]) == pub.EXIT_REFUSED
    assert marker_of(shared) == "start"


def test_a_lock_that_was_broken_and_retaken_is_not_deleted_by_its_old_holder(shared: Path) -> None:
    lock_path = shared.with_name(shared.name + ".publish.lock")
    old_holder = pub.PublishLock(shared)
    old_holder.__enter__()
    lock_path.unlink()
    new_holder = pub.PublishLock(shared)
    new_holder.__enter__()
    old_holder.__exit__(None, None, None)
    assert lock_path.exists()
    new_holder.__exit__(None, None, None)
    assert not lock_path.exists()


def test_a_stale_lock_is_broken_by_rename_so_one_waiter_wins(shared: Path) -> None:
    lock_path = shared.with_name(shared.name + ".publish.lock")
    lock_path.write_text("{}")
    old = time.time() - 1000
    os.utime(lock_path, (old, old))
    first, second = pub.PublishLock(shared, stale_s=300), pub.PublishLock(shared, stale_s=300)
    first._break_if_stale()
    second._break_if_stale()
    assert not lock_path.exists()
    assert not list(lock_path.parent.glob("*.stale"))


def test_a_corrupt_shared_db_is_a_refusal_not_a_traceback(shared: Path, tmp_path: Path) -> None:
    shared.write_bytes(b"garbage" * 1000)
    assert pub.main(["begin", "--copy", str(tmp_path / "copy.db")]) == pub.EXIT_REFUSED


def test_a_path_with_uri_characters_is_copied(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    odd = tmp_path / "a#b%c d" / "sgs-framework.db"
    odd.parent.mkdir()
    make_db(odd, "odd")
    monkeypatch.setenv("SGS_FRAMEWORK_DB", str(odd))
    copy = tmp_path / "copy.db"
    assert pub.main(["begin", "--copy", str(copy)]) == 0
    assert marker_of(copy) == "odd"


def events(shared: Path) -> list[str]:
    return [e["event"] for e in pub.logged_events(shared)]


def write_directly(shared: Path, marker: str) -> None:
    con = sqlite3.connect(str(shared))
    con.execute("UPDATE block_attributes SET block_slug = ?", (marker,))
    con.commit()
    con.close()


def test_first_begin_records_a_baseline_and_warns_of_nothing(shared: Path, tmp_path: Path, capsys) -> None:
    assert pub.main(["begin", "--copy", str(tmp_path / "c.db")]) == 0
    assert events(shared) == ["baseline"]
    assert "WARNING" not in capsys.readouterr().err


def test_a_publish_is_logged_with_both_shas_and_the_log_then_matches(shared: Path, tmp_path: Path) -> None:
    copy = tmp_path / "c.db"
    pub.main(["begin", "--copy", str(copy)])
    reseed(copy, "reseeded")
    assert pub.main(["publish", "--copy", str(copy)]) == 0
    last = pub.logged_events(shared)[-1]
    assert last["event"] == "publish" and last["sha_before"] != last["sha_after"] and last["sha_after"] == pub.sha256_of(shared)
    assert pub.known_sha(shared) == pub.sha256_of(shared)


def test_a_write_outside_publish_is_warned_once_and_logged_with_its_time(shared: Path, tmp_path: Path, capsys) -> None:
    pub.main(["begin", "--copy", str(tmp_path / "a.db")])
    capsys.readouterr()
    write_directly(shared, "someone-else")
    assert pub.main(["begin", "--copy", str(tmp_path / "b.db")]) == 0
    assert "written outside publish-framework-db.py" in capsys.readouterr().err
    outside = [e for e in pub.logged_events(shared) if e["event"] == "outside-write"]
    assert len(outside) == 1 and outside[0]["mtime"] > 0
    assert pub.main(["begin", "--copy", str(tmp_path / "c.db")]) == 0
    assert "WARNING" not in capsys.readouterr().err
    assert len([e for e in pub.logged_events(shared) if e["event"] == "outside-write"]) == 1


def test_publish_after_a_write_outside_publish_still_conflicts_and_names_the_write(shared: Path, tmp_path: Path, capsys) -> None:
    copy = tmp_path / "c.db"
    pub.main(["begin", "--copy", str(copy)])
    write_directly(shared, "someone-else")
    assert pub.main(["publish", "--copy", str(copy)]) == pub.EXIT_CONFLICT
    assert "outside-write" in events(shared)
    assert marker_of(shared) == "someone-else"


def test_status_reports_a_matching_log_and_then_a_mismatch(shared: Path, capsys) -> None:
    assert pub.main(["status"]) == 0
    assert "matching the log" in capsys.readouterr().out
    write_directly(shared, "x")
    assert pub.main(["status"]) == 0
    assert "WARNING" in capsys.readouterr().out
