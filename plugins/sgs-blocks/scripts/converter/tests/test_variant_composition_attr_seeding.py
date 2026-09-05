"""Regression tests for `_populate_variant_composition_attr_slots` — the DERIVATION
half of the tier-2 (child-attribute-value) variant composition signal.

WHY THIS FILE EXISTS (2026-09-06, task-5 review finding M5)
-----------------------------------------------------------------------------
`converter/tests/test_variant_detect.py` pins the READER (`detect_variant`'s
tier-2 scoring) against the rows already in the live DB. Nothing pinned the
WRITER: the set-difference derivation and the CSS-routability filter that decide
which rows exist at all. A throwaway driver script proved it once, by hand, and
then vanished — so a regression in the derivation would have been invisible to
the whole suite while every reader test stayed green.

These tests run the SHIPPED function (loaded by file path from `sgs-update-v2.py`,
which is hyphenated and cannot be imported as a module) against a purpose-built
in-memory DB, so they exercise the real derivation with no dependency on the
live DB's current contents.
"""
from __future__ import annotations

import importlib.util
import sqlite3
import sys
from pathlib import Path

import pytest

_SCRIPTS_DIR = Path(__file__).resolve().parents[2]   # plugins/sgs-blocks/scripts
_UPDATER_PATH = _SCRIPTS_DIR / "sgs-update-v2.py"


def _load_updater():
    """Load sgs-update-v2.py by file path (its name is not a valid module name)."""
    assert _UPDATER_PATH.exists(), f"missing writer script: {_UPDATER_PATH}"
    spec = importlib.util.spec_from_file_location("sgs_update_v2_under_test", str(_UPDATER_PATH))
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    sys.modules["sgs_update_v2_under_test"] = mod
    spec.loader.exec_module(mod)                 # type: ignore[union-attr]
    return mod


@pytest.fixture(scope="module")
def updater():
    return _load_updater()


def _fresh_db(routable: "list[tuple[str, str]]", unroutable: "list[tuple[str, str]]" = ()):
    """An in-memory DB with just the two tables the function touches.

    `routable`   — (child_slug, attr_name) pairs given a css_property.
    `unroutable` — (child_slug, attr_name) pairs DECLARED but with no routing.
    Anything named in variations.js and absent from both lists is undeclared
    entirely, the second real-world inert shape.
    """
    conn = sqlite3.connect(":memory:")
    c = conn.cursor()
    c.execute(
        "CREATE TABLE variant_composition_attr_slots ("
        " block_slug TEXT NOT NULL, variant_value TEXT NOT NULL,"
        " child_slug TEXT NOT NULL, child_attr_name TEXT NOT NULL,"
        " child_attr_value TEXT NOT NULL,"
        " PRIMARY KEY (block_slug, variant_value, child_slug, child_attr_name, child_attr_value))"
    )
    c.execute(
        "CREATE TABLE block_attributes ("
        " block_slug TEXT, attr_name TEXT, css_property TEXT, css_element TEXT)"
    )
    for child_slug, attr_name in routable:
        c.execute(
            "INSERT INTO block_attributes VALUES (?, ?, 'font-size', 'item')",
            (child_slug, attr_name),
        )
    for child_slug, attr_name in unroutable:
        c.execute(
            "INSERT INTO block_attributes VALUES (?, ?, NULL, NULL)",
            (child_slug, attr_name),
        )
    return conn, c


def _rows(c):
    return c.execute(
        "SELECT variant_value, child_slug, child_attr_name, child_attr_value "
        "FROM variant_composition_attr_slots ORDER BY 1, 2, 3"
    ).fetchall()


# Two variants nesting the IDENTICAL child slug set — the shape tier 1 cannot
# separate and this signal exists for. `shared` is carried by both (must never
# produce a row); `unique*` only by variant A.
_COMPOSITION = {
    "variant-a": [
        {"slug": "x/child", "attributes": {"shared": "4px", "uniqueRouted": 64, "uniqueDead": 40}},
        {"slug": "x/other", "attributes": {}},
    ],
    "variant-b": [
        {"slug": "x/child", "attributes": {"shared": "4px"}},
        {"slug": "x/other", "attributes": {}},
    ],
}


def test_set_difference_keeps_unique_drops_shared(updater, monkeypatch):
    """The derivation itself: a value carried by a sibling discriminates nothing."""
    monkeypatch.setattr(
        updater, "_extract_variation_composition_attrs", lambda _dir: _COMPOSITION
    )
    conn, c = _fresh_db(routable=[("x/child", "uniqueRouted"), ("x/child", "uniqueDead")])
    try:
        written = updater._populate_variant_composition_attr_slots(c, "x/block", Path("."))
        assert written == 2
        assert _rows(c) == [
            ("variant-a", "x/child", "uniqueDead", "40"),
            ("variant-a", "x/child", "uniqueRouted", "64"),
        ]
        # `shared` appears on both variants, so it must produce NO row at all.
        assert all(name != "shared" for _v, _s, name, _val in _rows(c))
    finally:
        conn.close()


def test_unroutable_child_attribute_is_skipped(updater, monkeypatch):
    """The CSS-routability filter (task-5 review, Important #1).

    A discriminating value whose child attribute has css_property AND
    css_element both NULL can never be populated from a draft's CSS, so seeding
    it would create a row that silences a Check #3 collision while resolving
    nothing. This is the `sgs/nav-menu.listColumns` shape.
    """
    monkeypatch.setattr(
        updater, "_extract_variation_composition_attrs", lambda _dir: _COMPOSITION
    )
    conn, c = _fresh_db(
        routable=[("x/child", "uniqueRouted")],
        unroutable=[("x/child", "uniqueDead")],
    )
    try:
        written = updater._populate_variant_composition_attr_slots(c, "x/block", Path("."))
        assert written == 1
        assert _rows(c) == [("variant-a", "x/child", "uniqueRouted", "64")]
    finally:
        conn.close()


def test_undeclared_child_attribute_is_skipped(updater, monkeypatch):
    """The OTHER inert shape: the child block declares no such attribute at all.

    This is `sgs/nav-menu.itemFontSizeMobile` — the flat tier sibling left in
    nav-drawer's variations.js after `itemFontSize` migrated to a tier OBJECT.
    WordPress discards an undeclared attribute on the editor surface, so a clone
    can never carry it either.
    """
    monkeypatch.setattr(
        updater, "_extract_variation_composition_attrs", lambda _dir: _COMPOSITION
    )
    conn, c = _fresh_db(routable=[("x/child", "uniqueRouted")])  # uniqueDead absent entirely
    try:
        written = updater._populate_variant_composition_attr_slots(c, "x/block", Path("."))
        assert written == 1
        assert _rows(c) == [("variant-a", "x/child", "uniqueRouted", "64")]
    finally:
        conn.close()


def test_negative_control_filter_off_would_seed_the_inert_row(updater, monkeypatch):
    """NEGATIVE CONTROL for the filter: with the predicate forced True, the inert
    row IS seeded.

    Without this, the two tests above would pass just as happily against a
    derivation that produced no rows at all for any reason — they would be
    asserting absence with nothing proving the absence is the filter's doing.
    """
    monkeypatch.setattr(
        updater, "_extract_variation_composition_attrs", lambda _dir: _COMPOSITION
    )
    monkeypatch.setattr(updater, "_child_attr_has_css_routing", lambda *_a: True)
    conn, c = _fresh_db(routable=[("x/child", "uniqueRouted")])
    try:
        written = updater._populate_variant_composition_attr_slots(c, "x/block", Path("."))
        assert written == 2
        assert ("variant-a", "x/child", "uniqueDead", "40") in _rows(c)
    finally:
        conn.close()


def test_delete_then_insert_is_idempotent(updater, monkeypatch):
    """Re-running must reflect the CURRENT variations.js, never accumulate."""
    monkeypatch.setattr(
        updater, "_extract_variation_composition_attrs", lambda _dir: _COMPOSITION
    )
    conn, c = _fresh_db(routable=[("x/child", "uniqueRouted")])
    try:
        first = updater._populate_variant_composition_attr_slots(c, "x/block", Path("."))
        second = updater._populate_variant_composition_attr_slots(c, "x/block", Path("."))
        assert first == second == 1
        assert len(_rows(c)) == 1

        # variations.js changes: the unique value moves to the other variant.
        moved = {
            "variant-a": [{"slug": "x/child", "attributes": {"shared": "4px"}}],
            "variant-b": [{"slug": "x/child", "attributes": {"shared": "4px", "uniqueRouted": 64}}],
        }
        monkeypatch.setattr(
            updater, "_extract_variation_composition_attrs", lambda _dir: moved
        )
        updater._populate_variant_composition_attr_slots(c, "x/block", Path("."))
        assert _rows(c) == [("variant-b", "x/child", "uniqueRouted", "64")]
    finally:
        conn.close()


def test_no_variations_js_clears_rows_and_returns_zero(updater, monkeypatch):
    """Soft-fail path: no extractable composition → the block's rows are removed."""
    monkeypatch.setattr(
        updater, "_extract_variation_composition_attrs", lambda _dir: _COMPOSITION
    )
    conn, c = _fresh_db(routable=[("x/child", "uniqueRouted")])
    try:
        assert updater._populate_variant_composition_attr_slots(c, "x/block", Path(".")) == 1
        monkeypatch.setattr(updater, "_extract_variation_composition_attrs", lambda _dir: None)
        assert updater._populate_variant_composition_attr_slots(c, "x/block", Path(".")) == 0
        assert _rows(c) == []
    finally:
        conn.close()
