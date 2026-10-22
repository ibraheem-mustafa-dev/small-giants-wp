"""Regression tests for sgs-update-v2.py: allowedBlocks clearing and scraping, block type,
colour tokens, field-guide URL, slot LIKE matching, dry-run pruning, archive restore, CSV export.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_sgs_update_v2_regressions.py -q
Set SGS_UPDATE_V2_PATH to test another copy of the script.
"""

from __future__ import annotations

import base64
import importlib.util
import json
import os
import sqlite3
import sys
from pathlib import Path

import pytest

_SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
_SCRIPT = Path(os.environ.get("SGS_UPDATE_V2_PATH", _SCRIPTS_ROOT / "sgs-update-v2.py"))

sys.path.insert(0, str(_SCRIPTS_ROOT))
_spec = importlib.util.spec_from_file_location("sgs_update_v2_regr", str(_SCRIPT))
mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(mod)  # type: ignore[union-attr]


def _block(tmp_path: Path, name: str, edit_js: str) -> Path:
    d = tmp_path / name
    d.mkdir()
    (d / "edit.js").write_text(edit_js, encoding="utf-8")
    (d / "block.json").write_text(json.dumps({"name": f"sgs/{name}"}), encoding="utf-8")
    return d


def _composition_db(stored: str | None) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE block_composition (block_slug TEXT PRIMARY KEY, accepts_allowed_blocks TEXT)")
    conn.execute("INSERT INTO block_composition VALUES ('sgs/card', ?)", (stored,))
    return conn


def test_h3_removed_allowed_blocks_is_cleared(tmp_path):
    _block(tmp_path, "card", "const x = 1;\n")
    conn = _composition_db('["core/heading"]')
    mod._populate_allowed_blocks(tmp_path, conn.cursor(), dry_run=False)
    assert conn.execute("SELECT accepts_allowed_blocks FROM block_composition").fetchone()[0] is None


def test_h3_dynamic_allowed_blocks_is_cleared(tmp_path):
    _block(tmp_path, "card", "const ALLOWED_BLOCKS = [ cond ? 'core/a' : 'core/b' ];\n")
    conn = _composition_db('["core/heading"]')
    stats = mod._populate_allowed_blocks(tmp_path, conn.cursor(), dry_run=False)
    assert conn.execute("SELECT accepts_allowed_blocks FROM block_composition").fetchone()[0] is None
    assert stats["allowed_blocks_dynamic_skipped"] == 1
    assert stats["allowed_blocks_populated"] == 0


def test_h3_literal_still_written(tmp_path):
    _block(tmp_path, "card", "const ALLOWED_BLOCKS = ['core/paragraph'];\n")
    conn = _composition_db(None)
    mod._populate_allowed_blocks(tmp_path, conn.cursor(), dry_run=False)
    assert json.loads(conn.execute("SELECT accepts_allowed_blocks FROM block_composition").fetchone()[0]) == ["core/paragraph"]


def test_h4_core_block_without_render_is_static(monkeypatch):
    captured = {}

    def fake_insert(c, new_rows, table, dry_run, insert_sql, insert_params, **kw):
        captured["type"] = insert_params[4]
        return 0

    block_json = {"$schema": "https://schemas.wp.org/trunk/block.json", "name": "core/paragraph", "title": "Paragraph"}
    payload = {"content": base64.b64encode(json.dumps(block_json).encode()).decode()}
    monkeypatch.setattr(mod, "_github_api_get", lambda url, tok: payload)
    monkeypatch.setattr(mod, "_insert_or_count", fake_insert)
    mod._process_gutenberg_block_dir(None, None, {"name": "paragraph"}, "v1", {}, True)
    assert captured["type"] == "static"

    block_json["render"] = "file:./render.php"
    payload["content"] = base64.b64encode(json.dumps(block_json).encode()).decode()
    mod._process_gutenberg_block_dir(None, None, {"name": "paragraph"}, "v1", {}, True)
    assert captured["type"] == "dynamic"


def test_m14_marker_in_comment_or_string_is_not_dynamic(tmp_path):
    f = tmp_path / "edit.js"
    f.write_text(
        "const ALLOWED_BLOCKS = [\n  'core/a', // why? maybe\n  /* spread ... undefined */ 'core/b',\n];\n",
        encoding="utf-8",
    )
    assert mod.scrape_allowed_blocks(f) == ["core/a", "core/b"]


def test_m14_real_ternary_is_still_dynamic(tmp_path):
    f = tmp_path / "edit.js"
    f.write_text("const ALLOWED_BLOCKS = [ x ? 'core/a' : 'core/b' ];\n", encoding="utf-8")
    assert mod.scrape_allowed_blocks(f) is mod._DYNAMIC_SKIP


def test_m15_non_hex_colours_are_kept():
    settings = {"color": {"palette": [
        {"slug": "a", "color": "#fff"},
        {"slug": "b", "color": "rgb(1, 2, 3)"},
        {"slug": "c", "color": "hsl(10 20% 30%)"},
        {"slug": "d", "color": "var(--x)"},
    ]}}
    slugs = [t["slug"] for t in mod._extract_colour_tokens(settings, "x")]
    assert slugs == ["color-a", "color-b", "color-c"]


def test_m16_field_guide_url_is_looked_up_by_version():
    urls = mod._FIELD_GUIDE_URLS
    assert "7-0-field-guide" in urls["7.0"]
    assert "7.1" not in urls  # an unpublished version is never given the 7.0 page


def test_m17_underscore_is_literal_in_like():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE blocks (slug TEXT, source TEXT)")
    conn.execute("INSERT INTO blocks VALUES ('sgs/card-grid', 'sgs')")
    conn.execute("INSERT INTO blocks VALUES ('sgs/card_grid_x', 'sgs')")
    cur = conn.cursor()
    assert mod._match_slot_to_block(cur, "card_grid") == ("medium-prefix", "sgs/card_grid_x", [])


def test_m18_dry_run_prune_does_not_alter_schema():
    conn = sqlite3.connect(":memory:")
    schema = (_SCRIPTS_ROOT / "dbschema" / "schema.sql").read_text(encoding="utf-8")
    conn.executescript(schema)
    conn.execute("ALTER TABLE blocks DROP COLUMN is_stale") if "is_stale" in [
        r[1] for r in conn.execute("PRAGMA table_info(blocks)")
    ] else None
    mod._prune_orphans_on_conn(conn, "t", frozenset(), {}, {}, "aggressive", True)
    assert "is_stale" not in [r[1] for r in conn.execute("PRAGMA table_info(blocks)")]


def test_l1_corrupt_archive_is_non_fatal(monkeypatch, tmp_path):
    import types

    fake = types.ModuleType("wp_reference_archive")

    def boom(*a, **k):
        raise EOFError("Compressed file ended before the end-of-stream marker was reached")

    fake.restore = boom
    monkeypatch.setitem(sys.modules, "wp_reference_archive", fake)
    mod.restore_wp_reference_archive(tmp_path / "x.db")


def test_l2_csv_export_reports_added_and_unchanged(monkeypatch, tmp_path):
    db = tmp_path / "f.db"
    conn = sqlite3.connect(db)
    conn.execute("CREATE TABLE t (a TEXT)")
    conn.execute("INSERT INTO t VALUES ('x')")
    conn.commit()
    conn.close()
    monkeypatch.setattr(mod, "SGS_DB", db)
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: tmp_path / "home"))
    first = mod.stage_13_export_db_to_csv()
    assert first["tables_added"] == 1
    second = mod.stage_13_export_db_to_csv()
    assert second["tables_added"] == 0
    assert second["tables_unchanged"] == 1
