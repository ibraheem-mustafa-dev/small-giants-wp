"""sync-container-wrapping-blocks.py --apply writes block-composition.json (the one source), then seeds the DB from it.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_sync_container_apply.py -v
"""
from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS / "dbschema"))
import seed_reference_data  # noqa: E402

_spec = importlib.util.spec_from_file_location("sync_container_wrapping_blocks", SCRIPTS / "sync-container-wrapping-blocks.py")
sync = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sync)

COLUMNS = ["block_slug", "wraps_block", "composition_role", "container_kind"]


def _seed(tmp_path, rows):
    f = tmp_path / "block-composition.json"
    f.write_text(json.dumps({"__doc": "kept", "__columns": COLUMNS, "rows": rows}), encoding="utf-8")
    return f


def test_apply_sets_wraps_block_and_kind_for_roster_blocks_only(tmp_path):
    f = _seed(tmp_path, [["sgs/a", None, "content-block", None], ["sgs/b", None, "leaf", None], ["core/c", None, "leaf", None]])
    text, missing = sync.apply_to_seed_file([("sgs/a", "layout", [])], f)
    out = json.loads(text)
    assert missing == []
    assert out["rows"] == [["sgs/a", "sgs/container", "content-block", "layout"], ["sgs/b", None, "leaf", None], ["core/c", None, "leaf", None]]
    assert out["__doc"] == "kept" and out["__columns"] == COLUMNS


def test_apply_names_a_roster_block_that_has_no_row_in_the_file(tmp_path):
    f = _seed(tmp_path, [["sgs/a", None, "leaf", None]])
    _, missing = sync.apply_to_seed_file([("sgs/a", "section", []), ("sgs/new", "layout", [])], f)
    assert missing == ["sgs/new"]


def test_a_seed_after_apply_keeps_the_applied_values(tmp_path, monkeypatch):
    # The failure this replaces: a DB-only write was overwritten by the next seed from the file.
    f = _seed(tmp_path, [["sgs/a", None, "content-block", None]])
    text, _ = sync.apply_to_seed_file([("sgs/a", "layout", [])], f)
    f.write_text(text, encoding="utf-8")
    monkeypatch.setattr(seed_reference_data, "_BLOCK_COMPOSITION_FILE", f)
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_composition (block_slug TEXT PRIMARY KEY, wraps_block TEXT, composition_role TEXT NOT NULL, "
        "accepts_allowed_blocks TEXT, created_at TEXT, container_kind TEXT)"
    )
    seed_reference_data._seed_block_composition(conn)
    seed_reference_data._seed_block_composition(conn)
    assert conn.execute("SELECT wraps_block, container_kind FROM block_composition").fetchall() == [("sgs/container", "layout")]
