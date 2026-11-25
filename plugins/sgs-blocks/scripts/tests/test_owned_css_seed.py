"""test_owned_css_seed.py: pytest coverage for sgs-update-v2.py::_populate_owned_css (Spec 48 FR-48-109).

Each attribute's `sgs.ownsCss` in its block.json (a list of the CSS properties the setting draws, for a setting the DB
records no css_property for) is seeded into `block_attributes.owns_css` as a sorted JSON array; every run clears the column
first, so an entry removed from block.json never survives. Every test but the last runs on an in-memory DB with fixture
block.json files in a temp directory; the last reads the real icon-list block.json and a private copy of the framework DB
(`SGS_OWNS_CSS_DB`, a copy the caller made: the shared DB is never opened for writing). `SGS_UPDATE_V2_PATH` points the
loader at another copy of the seeder (used to run this file against the seeder as committed before the change: every test
then fails).
"""
from __future__ import annotations

import importlib.util
import json
import os
import shutil
import sqlite3
import sys
from pathlib import Path

import pytest

sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
BLOCKS_DIR = SCRIPTS_DIR.parent / "src" / "blocks"


def _load_seeder():
    path = Path(os.environ.get("SGS_UPDATE_V2_PATH") or SCRIPTS_DIR / "sgs-update-v2.py")
    spec = importlib.util.spec_from_file_location("sgs_update_v2_owns_css_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SGS = _load_seeder()


def _db(rows):
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, attr_type TEXT)")
    conn.executemany("INSERT INTO block_attributes VALUES (?, ?, 'string')", rows)
    return conn


def _block(root, slug, attrs, name=None):
    d = root / slug
    d.mkdir()
    (d / "block.json").write_text(json.dumps({"name": name or f"sgs/{slug}", "attributes": attrs}), encoding="utf-8")


def _owns(conn, slug, attr):
    return conn.execute(
        "SELECT owns_css FROM block_attributes WHERE block_slug = ? AND attr_name = ?", (slug, attr)
    ).fetchone()[0]


def test_owned_properties_are_seeded_as_a_sorted_array(tmp_path):
    _block(tmp_path, "icon-list", {"markerType": {"type": "string", "sgs": {"ownsCss": ["list-style", "counter-reset", "list-style"]}}, "label": {"type": "string"}})
    conn = _db([("sgs/icon-list", "markerType"), ("sgs/icon-list", "label")])
    counts = SGS._populate_owned_css(tmp_path, conn, dry_run=False)
    assert counts["owns_css_seeded"] == 1
    assert json.loads(_owns(conn, "sgs/icon-list", "markerType")) == ["counter-reset", "list-style"]
    assert _owns(conn, "sgs/icon-list", "label") is None


def test_a_removed_entry_is_cleared(tmp_path):
    _block(tmp_path, "icon-list", {"markerType": {"type": "string"}})
    conn = _db([("sgs/icon-list", "markerType")])
    conn.execute("ALTER TABLE block_attributes ADD COLUMN owns_css TEXT")
    conn.execute("UPDATE block_attributes SET owns_css = '[\"list-style\"]'")
    counts = SGS._populate_owned_css(tmp_path, conn, dry_run=False)
    assert counts["owns_css_cleared"] == 1
    assert _owns(conn, "sgs/icon-list", "markerType") is None


def test_an_entry_with_no_row_is_reported_not_inserted(tmp_path):
    _block(tmp_path, "icon-list", {"markerType": {"type": "string", "sgs": {"ownsCss": ["list-style"]}}})
    conn = _db([])
    counts = SGS._populate_owned_css(tmp_path, conn, dry_run=False)
    assert counts["owns_css_no_row"] == ["sgs/icon-list.markerType"]
    assert conn.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0] == 0


@pytest.mark.parametrize("bad", ["list-style", [], [""], ["List Style"], [3], {"a": 1}])
def test_a_value_that_is_no_list_of_property_names_is_reported_and_skipped(tmp_path, bad):
    _block(tmp_path, "icon-list", {"markerType": {"type": "string", "sgs": {"ownsCss": bad}}})
    conn = _db([("sgs/icon-list", "markerType")])
    counts = SGS._populate_owned_css(tmp_path, conn, dry_run=False)
    assert counts["owns_css_invalid"] == ["sgs/icon-list.markerType"]
    assert counts["owns_css_seeded"] == 0
    assert _owns(conn, "sgs/icon-list", "markerType") is None


def test_a_non_sgs_block_is_ignored(tmp_path):
    _block(tmp_path, "core-copy", {"x": {"type": "string", "sgs": {"ownsCss": ["list-style"]}}}, name="core/copy")
    conn = _db([("core/copy", "x")])
    assert SGS._populate_owned_css(tmp_path, conn, dry_run=False)["owns_css_seeded"] == 0
    assert _owns(conn, "core/copy", "x") is None


def test_dry_run_writes_nothing_and_never_adds_the_column(tmp_path):
    _block(tmp_path, "icon-list", {"markerType": {"type": "string", "sgs": {"ownsCss": ["list-style"]}}})
    conn = _db([("sgs/icon-list", "markerType")])
    counts = SGS._populate_owned_css(tmp_path, conn, dry_run=True)
    assert counts["owns_css_seeded"] == 1
    assert "owns_css" not in [r[1] for r in conn.execute("PRAGMA table_info(block_attributes)").fetchall()]


def test_the_real_icon_list_marker_type_owns_list_style(tmp_path):
    source = os.environ.get("SGS_OWNS_CSS_DB")
    if not source:
        pytest.skip("SGS_OWNS_CSS_DB (a private copy of the framework DB) is not set")
    copy = tmp_path / "framework-copy.db"
    shutil.copyfile(source, copy)
    conn = sqlite3.connect(copy)
    counts = SGS._populate_owned_css(BLOCKS_DIR, conn, dry_run=False)
    assert counts["owns_css_no_row"] == [] and counts["owns_css_invalid"] == []
    rows = conn.execute("SELECT block_slug, attr_name, owns_css FROM block_attributes WHERE owns_css IS NOT NULL").fetchall()
    assert [(s, a, json.loads(o)) for s, a, o in rows] == [("sgs/icon-list", "markerType", ["list-style"])]
