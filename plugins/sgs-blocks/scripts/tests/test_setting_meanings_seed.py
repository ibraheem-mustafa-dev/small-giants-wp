"""test_setting_meanings_seed.py: pytest coverage for sgs-update-v2.py::_populate_setting_meanings (U11, FR-2-12).

Each attribute's `sgs.meaning` in its block.json is seeded into `block_attributes.meaning` as sorted-key JSON;
every run clears the column first, so a meaning removed from block.json never survives. Every test runs on an
in-memory DB with fixture block.json files in a temp directory; the shared framework DB is never opened.
`SGS_UPDATE_V2_PATH` points the loader at another copy of the seeder (used to run this file against the seeder
as committed before the change: every test then fails).
"""
from __future__ import annotations

import importlib.util
import json
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None

SCRIPTS_DIR = Path(__file__).resolve().parents[1]


def _load_seeder():
    path = Path(os.environ.get("SGS_UPDATE_V2_PATH") or SCRIPTS_DIR / "sgs-update-v2.py")
    spec = importlib.util.spec_from_file_location("sgs_update_v2_meanings_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SGS = _load_seeder()

MAGNET = {
    "what": "pulls each nav item's label towards the pointer",
    "trigger": "pointer moving over a nav item",
    "parameters": {"strength": {"unit": "factor"}},
}


def _db(rows):
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, attr_type TEXT)")
    conn.executemany("INSERT INTO block_attributes VALUES (?, ?, 'string')", rows)
    return conn


def _block(root, slug, attrs, name=None):
    d = root / slug
    d.mkdir()
    (d / "block.json").write_text(json.dumps({"name": name or f"sgs/{slug}", "attributes": attrs}), encoding="utf-8")


def _meaning(conn, slug, attr):
    return conn.execute(
        "SELECT meaning FROM block_attributes WHERE block_slug = ? AND attr_name = ?", (slug, attr)
    ).fetchone()[0]


def test_meaning_is_seeded_as_sorted_json(tmp_path):
    _block(tmp_path, "nav-bar-menu", {"itemMagnetStrength": {"type": "number", "sgs": {"meaning": MAGNET}}, "label": {"type": "string"}})
    conn = _db([("sgs/nav-bar-menu", "itemMagnetStrength"), ("sgs/nav-bar-menu", "label")])
    counts = SGS._populate_setting_meanings(tmp_path, conn, dry_run=False)
    assert counts["meaning_seeded"] == 1
    assert json.loads(_meaning(conn, "sgs/nav-bar-menu", "itemMagnetStrength")) == MAGNET
    assert _meaning(conn, "sgs/nav-bar-menu", "itemMagnetStrength") == json.dumps(MAGNET, sort_keys=True, ensure_ascii=False)
    assert _meaning(conn, "sgs/nav-bar-menu", "label") is None


def test_a_removed_meaning_is_cleared(tmp_path):
    _block(tmp_path, "nav-bar-menu", {"itemMagnetStrength": {"type": "number"}})
    conn = _db([("sgs/nav-bar-menu", "itemMagnetStrength")])
    conn.execute("ALTER TABLE block_attributes ADD COLUMN meaning TEXT")
    conn.execute("UPDATE block_attributes SET meaning = '{\"what\": \"stale\"}'")
    counts = SGS._populate_setting_meanings(tmp_path, conn, dry_run=False)
    assert counts["meaning_cleared"] == 1
    assert _meaning(conn, "sgs/nav-bar-menu", "itemMagnetStrength") is None


def test_a_meaning_with_no_row_is_reported_not_inserted(tmp_path):
    _block(tmp_path, "nav-bar-menu", {"itemMagnetStrength": {"type": "number", "sgs": {"meaning": MAGNET}}})
    conn = _db([])
    counts = SGS._populate_setting_meanings(tmp_path, conn, dry_run=False)
    assert counts["meaning_no_row"] == ["sgs/nav-bar-menu.itemMagnetStrength"]
    assert conn.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0] == 0


def test_a_non_sgs_block_and_a_non_object_meaning_are_ignored(tmp_path):
    _block(tmp_path, "core-copy", {"x": {"type": "string", "sgs": {"meaning": MAGNET}}}, name="core/copy")
    _block(tmp_path, "faq", {"open": {"type": "boolean", "sgs": {"meaning": "opens"}}})
    conn = _db([("core/copy", "x"), ("sgs/faq", "open")])
    counts = SGS._populate_setting_meanings(tmp_path, conn, dry_run=False)
    assert counts["meaning_seeded"] == 0
    assert _meaning(conn, "core/copy", "x") is None and _meaning(conn, "sgs/faq", "open") is None


def test_dry_run_writes_nothing(tmp_path):
    _block(tmp_path, "nav-bar-menu", {"itemMagnetStrength": {"type": "number", "sgs": {"meaning": MAGNET}}})
    conn = _db([("sgs/nav-bar-menu", "itemMagnetStrength")])
    conn.execute("ALTER TABLE block_attributes ADD COLUMN meaning TEXT")
    SGS._populate_setting_meanings(tmp_path, conn, dry_run=True)
    assert _meaning(conn, "sgs/nav-bar-menu", "itemMagnetStrength") is None


def test_dry_run_never_adds_the_column(tmp_path):
    _block(tmp_path, "nav-bar-menu", {"itemMagnetStrength": {"type": "number", "sgs": {"meaning": MAGNET}}})
    conn = _db([("sgs/nav-bar-menu", "itemMagnetStrength")])
    counts = SGS._populate_setting_meanings(tmp_path, conn, dry_run=True)
    assert counts["meaning_seeded"] == 1
    assert "meaning" not in [r[1] for r in conn.execute("PRAGMA table_info(block_attributes)").fetchall()]
