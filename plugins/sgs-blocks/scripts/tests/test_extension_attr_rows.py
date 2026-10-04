"""test_extension_attr_rows.py: pytest coverage for
sgs-update-v2.py::_seed_extension_attr_rows and the layer 2.6 routing columns.

The editor extensions add their `sgs*` attributes client-side, so no block.json
declares them and Stage 1 never made `block_attributes` rows for them. The seeder
reads src/blocks/extensions/extension-roster.json and writes `source='sgs-ext'`
rows for every block that opts in.

Every test runs on an in-memory DB with fixture block.json files in a temp
directory; the shared framework DB is never opened. `SGS_UPDATE_V2_PATH` points
the loader at another copy of the seeder (used to run this file against the seeder
as committed before the change).
"""
from __future__ import annotations

import importlib.util
import json
import os
import sqlite3
import sys
from pathlib import Path
from unittest.mock import patch

sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None

REPO_ROOT = Path(__file__).resolve().parents[4]
SCRIPTS_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
REAL_BLOCKS_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"


def _load_seeder():
    path = Path(os.environ.get("SGS_UPDATE_V2_PATH") or SCRIPTS_DIR / "sgs-update-v2.py")
    spec = importlib.util.spec_from_file_location("sgs_update_v2_ext_rows_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SGS = _load_seeder()


def _make_db(blocks: list[str]) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript(
        """
        CREATE TABLE blocks (slug TEXT PRIMARY KEY, source TEXT, is_stale INTEGER DEFAULT 0);
        CREATE TABLE block_supports (id INTEGER PRIMARY KEY, block_slug TEXT, support_name TEXT,
                                     source TEXT DEFAULT 'sgs', is_stale INTEGER DEFAULT 0);
        CREATE TABLE block_capabilities (id INTEGER PRIMARY KEY, block_slug TEXT);
        CREATE TABLE block_attributes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_slug TEXT NOT NULL,
            attr_name TEXT NOT NULL,
            attr_type TEXT NOT NULL,
            default_value TEXT,
            enum_values TEXT,
            description TEXT,
            is_responsive INTEGER DEFAULT 0,
            role TEXT,
            source TEXT NOT NULL DEFAULT 'sgs',
            css_layer TEXT,
            css_property TEXT,
            css_element TEXT,
            css_state TEXT,
            css_tier TEXT,
            tier_shape TEXT,
            UNIQUE(block_slug, attr_name)
        );
        """
    )
    conn.executemany("INSERT INTO blocks (slug, source) VALUES (?, 'sgs')", [(b,) for b in blocks])
    conn.commit()
    return conn


def _write_block(blocks_dir: Path, slug: str, supports_sgs: dict | None = None, supports: dict | None = None) -> None:
    folder = blocks_dir / slug.replace("sgs/", "", 1)
    folder.mkdir(parents=True)
    body = {"name": slug, "attributes": {}, "supports": {**(supports or {}), "sgs": supports_sgs or {}}}
    (folder / "block.json").write_text(json.dumps(body), encoding="utf-8")


def _fixture(tmp_path: Path):
    """sgs/container opts into childSizing + hover; sgs/plain opts into nothing;
    sgs/quiet opts out of animation, parallax and click effects."""
    _write_block(tmp_path, "sgs/container", {"enabledExtensions": ["childSizing", "hover"]})
    _write_block(tmp_path, "sgs/plain")
    _write_block(tmp_path, "sgs/quiet", {"hideExtensions": ["animation", "parallax", "clickEffects"]})
    return _make_db(["sgs/container", "sgs/plain", "sgs/quiet"])


def _attrs(conn: sqlite3.Connection, slug: str, source: str | None = "sgs-ext") -> set[str]:
    sql = "SELECT attr_name FROM block_attributes WHERE block_slug = ?"
    params: list = [slug]
    if source:
        sql += " AND source = ?"
        params.append(source)
    return {r[0] for r in conn.execute(sql, params).fetchall()}


def _row(conn: sqlite3.Connection, slug: str, attr: str):
    conn.row_factory = sqlite3.Row
    try:
        return conn.execute(
            "SELECT * FROM block_attributes WHERE block_slug = ? AND attr_name = ?", (slug, attr)
        ).fetchone()
    finally:
        conn.row_factory = None


def _apply_layers(conn: sqlite3.Connection):
    """Run the real `_apply_attr_classification_overrides` with the other layers stubbed
    so only layer 2.6 (the extension roster) is under test."""
    with (
        patch.object(SGS, "_load_css_property_classifications", return_value={}),
        patch.object(SGS, "_collect_boxfamily_overrides", return_value={}),
        patch.object(SGS, "_collect_fx_attr_namespace_overrides", return_value={}),
        patch.object(SGS, "ATTR_CLASSIFICATION_OVERRIDES", {}),
    ):
        return SGS._apply_attr_classification_overrides(conn, blocks_dir=REAL_BLOCKS_DIR, dry_run=False)


def test_container_gets_child_sizing_rows(tmp_path):
    """The worked example: an opted-in block gets sgsChildSizing as an sgs-ext row
    carrying its enum, tier shape and default."""
    conn = _fixture(tmp_path)
    SGS._seed_extension_attr_rows(conn, tmp_path)
    row = _row(conn, "sgs/container", "sgsChildSizing")
    assert row is not None, "sgs/container opted into childSizing but has no sgsChildSizing row"
    assert row["source"] == "sgs-ext"
    assert row["attr_type"] == "object"
    assert json.loads(row["enum_values"]) == ["fit", "fill", "fixed"]
    assert row["tier_shape"] == "tier_object"
    assert row["default_value"] == "{}"
    assert "sgsChildWidth" in _attrs(conn, "sgs/container")


def test_block_without_the_opt_in_gets_no_child_sizing(tmp_path):
    conn = _fixture(tmp_path)
    SGS._seed_extension_attr_rows(conn, tmp_path)
    assert "sgsChildSizing" not in _attrs(conn, "sgs/plain")
    assert "sgsChildSizing" not in _attrs(conn, "sgs/quiet")
    assert not {a for a in _attrs(conn, "sgs/plain") if a.startswith("sgsHover")}, "hover is opt-in"


def test_hide_extensions_blocks_get_none_of_the_hidden_extension(tmp_path):
    conn = _fixture(tmp_path)
    SGS._seed_extension_attr_rows(conn, tmp_path)
    quiet = _attrs(conn, "sgs/quiet")
    assert not {a for a in quiet if a.startswith("sgsAnimation")}, "animation is hidden on sgs/quiet"
    assert not {"sgsParallax", "sgsParallaxStrength"} & quiet
    assert not {"sgsClickEffect", "sgsClickRippleColour", "sgsClickRippleDuration"} & quiet
    # Positive control: the same block still gets the extensions it did not hide.
    assert "sgsHideOnMobile" in quiet and "sgsCustomCss" in quiet
    assert "sgsAnimation" in _attrs(conn, "sgs/plain"), "an unhidden block gets animation"


def test_rows_survive_the_stage_9_prune(tmp_path):
    """Stage 9 deletes source='sgs' rows missing from block.json; sgs-ext rows must outlive it."""
    conn = _fixture(tmp_path)
    SGS._seed_extension_attr_rows(conn, tmp_path)
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, source) "
        "VALUES ('sgs/container', 'ghostAttr', 'string', 'sgs')"
    )
    before = len(_attrs(conn, "sgs/container", "sgs-ext"))
    live_attrs = {slug: frozenset() for slug in ("sgs/container", "sgs/plain", "sgs/quiet")}
    SGS._prune_orphans_on_conn(
        conn, ".test", frozenset(live_attrs), {slug: frozenset() for slug in live_attrs},
        live_attrs, SGS._PRUNE_MODE_AGGRESSIVE, False,
    )
    assert "ghostAttr" not in _attrs(conn, "sgs/container", "sgs"), "negative control: the prune must have run"
    assert len(_attrs(conn, "sgs/container", "sgs-ext")) == before > 0


def test_existing_block_declared_row_is_never_touched(tmp_path):
    conn = _fixture(tmp_path)
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, default_value, source) "
        "VALUES ('sgs/container', 'sgsAnimation', 'string', '\"fade-in\"', 'sgs')"
    )
    SGS._seed_extension_attr_rows(conn, tmp_path)
    row = _row(conn, "sgs/container", "sgsAnimation")
    assert (row["source"], row["default_value"]) == ("sgs", '"fade-in"')
    assert conn.execute(
        "SELECT COUNT(*) FROM block_attributes WHERE block_slug='sgs/container' AND attr_name='sgsAnimation'"
    ).fetchone()[0] == 1


def test_dropping_the_opt_in_removes_the_rows_and_a_rerun_is_stable(tmp_path):
    conn = _fixture(tmp_path)
    first = SGS._seed_extension_attr_rows(conn, tmp_path)
    again = SGS._seed_extension_attr_rows(conn, tmp_path)
    assert first["ext_rows_inserted"] > 0
    assert (again["ext_rows_inserted"], again["ext_rows_deleted"]) == (0, 0), "a second run changes nothing"
    (tmp_path / "container" / "block.json").write_text(
        json.dumps({"name": "sgs/container", "attributes": {}, "supports": {"sgs": {}}}), encoding="utf-8"
    )
    gone = SGS._seed_extension_attr_rows(conn, tmp_path)
    assert gone["ext_rows_deleted"] > 0
    assert not {"sgsChildSizing", "sgsChildWidth"} & _attrs(conn, "sgs/container")


def test_dry_run_writes_nothing(tmp_path):
    conn = _fixture(tmp_path)
    counts = SGS._seed_extension_attr_rows(conn, tmp_path, dry_run=True)
    assert counts["ext_rows_inserted"] > 0
    assert conn.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0] == 0


def test_routing_columns_come_from_layer_2_6_and_survive_the_reset(tmp_path):
    """css_property/css_element/css_state/role are reset to NULL every run, so they
    must be re-written from the roster; consumers' constraints are honoured."""
    conn = _fixture(tmp_path)
    SGS._seed_extension_attr_rows(conn, tmp_path)
    conn.execute("UPDATE block_attributes SET css_property = 'rogue' WHERE attr_name = 'sgsChildWidth'")
    _apply_layers(conn)
    width = _row(conn, "sgs/container", "sgsChildWidth")
    assert (width["css_property"], width["role"]) == (None, "layout"), "a width slot a block can already own stays NULL"
    sizing = _row(conn, "sgs/container", "sgsChildSizing")
    assert sizing["css_property"] is None, "a discovered enum has no css_property"
    lift = _row(conn, "sgs/container", "sgsHoverLift")
    assert (lift["css_property"], lift["css_state"]) == ("transform", "hover")
    for attr in ("sgsHoverOpacity", "sgsHoverIndent"):
        row = _row(conn, "sgs/container", attr)
        assert row["css_property"] and row["css_state"] == "hover", f"{attr}: a hover row needs css_state"
    hide = {a: _row(conn, "sgs/plain", a) for a in ("sgsHideOnMobile", "sgsHideOnTablet", "sgsHideOnDesktop")}
    assert [r["css_tier"] for r in hide.values()] == ["mobile", "tablet", "desktop"], "one tier each, or the slot is ambiguous"
    assert _row(conn, "sgs/plain", "sgsClickRippleColour")["css_property"] is None
    assert all(r[0] is None for r in conn.execute("SELECT css_layer FROM block_attributes").fetchall())
    assert _row(conn, "sgs/plain", "sgsAnimationStart")["css_property"] is None


def test_every_declared_role_is_an_existing_role():
    roles_json = json.loads((SCRIPTS_DIR / "data" / "roles.json").read_text(encoding="utf-8"))
    known = {k for k in roles_json if not k.startswith("__")}
    declared = {
        spec["role"]
        for ext in SGS._load_extension_roster()
        for spec in ext["attributes"].values()
    }
    assert declared, "the roster declares no roles"
    assert known, "roles.json lists no roles"
    assert declared <= known, f"roles not in roles.json: {sorted(declared - known)}"


def test_real_roster_gives_the_real_container_child_sizing():
    """Against the real roster and real block.json files: sgs/container lists childSizing."""
    block_json = json.loads((REAL_BLOCKS_DIR / "container" / "block.json").read_text(encoding="utf-8"))
    rows = SGS._extension_rows_for_block(SGS._load_extension_roster(), block_json)
    assert {"sgsChildSizing", "sgsChildWidth"} <= set(rows)


def test_no_two_roster_attributes_share_a_css_slot():
    """db-consistency/check_routing flags two attributes on one (css_property, css_element,
    css_state, css_tier) slot of a block. A block can opt into every extension at once, so the
    roster as a whole must declare each slot once."""
    seen: dict[tuple, str] = {}
    for ext in SGS._load_extension_roster():
        for name, spec in ext["attributes"].items():
            if not spec.get("css_property"):
                continue
            slot = (spec["css_property"], spec.get("css_element"), spec.get("css_state"), spec.get("css_tier"))
            assert slot not in seen, f"{name} and {seen[slot]} both claim {slot}"
            seen[slot] = name
