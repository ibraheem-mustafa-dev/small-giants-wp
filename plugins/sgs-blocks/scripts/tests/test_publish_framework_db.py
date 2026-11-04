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
