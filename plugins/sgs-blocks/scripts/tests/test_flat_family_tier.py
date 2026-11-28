"""test_flat_family_tier.py: the seeder marks a scalar Tablet/Mobile family `flat_sibling` and gives each of its rows a
device (css_tier), so the cloning route can write a per-device value (sgs/brand-strip maxHeight, maxHeightTablet,
maxHeightMobile). Every test runs on an in-memory DB; the shared framework DB is never opened.
"""
from __future__ import annotations

import importlib.util
import os
import sqlite3
import sys
from pathlib import Path
from unittest.mock import patch

sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None

REPO_ROOT = Path(__file__).resolve().parents[4]
SCRIPTS_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR / "lib"))

import object_attr_shape as shape  # noqa: E402


def _load_seeder():
    path = Path(os.environ.get("SGS_UPDATE_V2_PATH") or SCRIPTS_DIR / "sgs-update-v2.py")
    spec = importlib.util.spec_from_file_location("sgs_update_v2_flat_family_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SGS = _load_seeder()

STRIP = {
    "maxHeight": {"type": "number", "default": 180},
    "maxHeightTablet": {"type": "number"},
    "maxHeightMobile": {"type": "number"},
    "columns": {"type": "object", "default": {}},
}


def classify(name: str, attrs: dict) -> str | None:
    return shape.classify_object_attr_shape(name, SGS._canonical_attr_type(attrs[name].get("type", "string")), attrs[name], attrs, set(), set())


def test_a_numeric_family_is_flat_sibling_in_all_three_rows():
    # MUST FAIL before the fix: a non-object attribute always classified None.
    assert [classify(n, STRIP) for n in ("maxHeight", "maxHeightTablet", "maxHeightMobile")] == ["flat_sibling"] * 3


def test_a_string_and_an_integer_family_are_flat_sibling_too():
    attrs = {"gap": {"type": "string"}, "gapTablet": {"type": "string"}, "rows": {"type": "integer"}, "rowsMobile": {"type": "integer"}}
    assert [classify(n, attrs) for n in attrs] == ["flat_sibling"] * 4


def test_negative_controls_a_lone_number_a_boolean_family_and_an_array_stay_unclassified():
    attrs = {
        "lone": {"type": "number"},
        "showLabel": {"type": "boolean"},
        "showLabelTablet": {"type": "boolean"},
        "items": {"type": "array"},
        "itemsMobile": {"type": "array"},
    }
    assert [classify(n, attrs) for n in attrs] == [None] * 5


def test_a_type_union_that_admits_an_object_is_classified_as_an_object():
    # MUST FAIL before the fix: ["string","object"] reached the classifier as "string" (the DB's canonical type), so a
    # setting that takes a flat value or a per-device object (sgs/buybox galleryColumnGap) was never per-device.
    attrs = {"galleryColumnGap": {"type": ["string", "object"], "default": ""}}
    assert classify("galleryColumnGap", attrs) == "tier_object"
    # Negative control: a union without an object stays a scalar.
    assert classify("size", {"size": {"type": ["number", "string"]}}) is None


def test_an_object_attribute_is_classified_as_before():
    # `columns` has no sibling and no evidence: the elimination fallback, tier_object, exactly as before the change.
    assert classify("columns", STRIP) == "tier_object"
    attrs = {"borderWidth": {"type": "object", "default": {}}}
    assert classify("borderWidth", attrs) == "box_only"
    siblings = {"backgroundImage": {"type": "object"}, "backgroundImageTablet": {"type": "object"}}
    assert classify("backgroundImage", siblings) == "flat_sibling"


def _db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes (id INTEGER PRIMARY KEY AUTOINCREMENT, block_slug TEXT, attr_name TEXT, attr_type TEXT, "
        "css_tier TEXT, tier_shape TEXT, UNIQUE(block_slug, attr_name))"
    )
    return conn


def _put(conn, slug, attr, attr_type, tier, shape_):
    conn.execute("INSERT INTO block_attributes (block_slug, attr_name, attr_type, css_tier, tier_shape) VALUES (?, ?, ?, ?, ?)", (slug, attr, attr_type, tier, shape_))


def _tiers(conn, slug):
    return dict(conn.execute("SELECT attr_name, css_tier FROM block_attributes WHERE block_slug = ?", (slug,)).fetchall())


def test_the_base_of_a_flat_family_is_desktop_and_a_missing_sibling_tier_follows_its_suffix():
    # MUST FAIL before the fix: no step named the base's device (the live brand-strip base reads NULL).
    conn = _db()
    _put(conn, "sgs/strip", "maxHeight", "number", None, "flat_sibling")
    _put(conn, "sgs/strip", "maxHeightTablet", "number", "tablet", "flat_sibling")
    _put(conn, "sgs/strip", "maxHeightMobile", "number", None, "flat_sibling")
    result = SGS._complete_flat_family_tiers(conn)
    assert _tiers(conn, "sgs/strip") == {"maxHeight": "desktop", "maxHeightTablet": "tablet", "maxHeightMobile": "mobile"}
    assert result["flat_family_tiers_filled"] == 2


def test_it_never_overwrites_a_tier_a_writer_set_and_leaves_other_shapes_alone_and_is_idempotent():
    conn = _db()
    _put(conn, "sgs/a", "size", "number", "desktop", "flat_sibling")
    _put(conn, "sgs/a", "sizeTablet", "number", "tablet", "flat_sibling")
    _put(conn, "sgs/a", "other", "object", None, "tier_object")
    _put(conn, "sgs/a", "toggle", "boolean", None, None)
    _put(conn, "sgs/a", "toggleMobile", "boolean", None, None)
    before = _tiers(conn, "sgs/a")
    assert SGS._complete_flat_family_tiers(conn)["flat_family_tiers_filled"] == 0
    assert _tiers(conn, "sgs/a") == before
    _put(conn, "sgs/a", "sizeMobile", "number", None, "flat_sibling")
    assert SGS._complete_flat_family_tiers(conn)["flat_family_tiers_filled"] == 1
    assert SGS._complete_flat_family_tiers(conn)["flat_family_tiers_filled"] == 0
    assert _tiers(conn, "sgs/a")["sizeMobile"] == "mobile"


def test_a_roster_family_without_a_tier_shape_is_marked_flat_sibling():
    extension = {
        "id": "fixtureSize",
        "file": "fixture-size.js",
        "rule": {"mode": "denylist", "hideSlug": "fixtureSize"},
        "attributes": {
            "sgsFixtureSize": {"type": "number", "role": "visual", "css_property": "font-size"},
            "sgsFixtureSizeTablet": {"type": "number", "role": "visual", "css_property": "font-size"},
            "sgsFixtureLone": {"type": "number", "role": "visual", "css_property": "width"},
        },
    }
    conn = sqlite3.connect(":memory:")
    conn.executescript(
        """
        CREATE TABLE blocks (slug TEXT PRIMARY KEY, source TEXT, is_stale INTEGER DEFAULT 0, title TEXT, category TEXT, type TEXT);
        CREATE TABLE block_attributes (id INTEGER PRIMARY KEY AUTOINCREMENT, block_slug TEXT NOT NULL, attr_name TEXT NOT NULL,
            attr_type TEXT NOT NULL, default_value TEXT, enum_values TEXT, description TEXT, is_responsive INTEGER DEFAULT 0,
            role TEXT, source TEXT NOT NULL DEFAULT 'sgs', css_layer TEXT, css_property TEXT, css_element TEXT, css_state TEXT,
            css_tier TEXT, tier_shape TEXT, UNIQUE(block_slug, attr_name));
        """
    )
    conn.execute("INSERT INTO blocks (slug, source) VALUES ('sgs/plain', 'sgs')")
    import tempfile

    with tempfile.TemporaryDirectory() as tmp, patch.object(SGS, "_load_extension_roster", return_value=[extension]):
        folder = Path(tmp) / "plain"
        folder.mkdir()
        (folder / "block.json").write_text('{"name": "sgs/plain", "attributes": {}, "supports": {"sgs": {}}}', encoding="utf-8")
        SGS._seed_extension_attr_rows(conn, Path(tmp), dry_run=False)
    shapes = dict(conn.execute("SELECT attr_name, tier_shape FROM block_attributes WHERE source = 'sgs-ext'").fetchall())
    assert shapes == {"sgsFixtureSize": "flat_sibling", "sgsFixtureSizeTablet": "flat_sibling", "sgsFixtureLone": None}
