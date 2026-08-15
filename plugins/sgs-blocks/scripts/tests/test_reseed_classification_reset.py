"""test_reseed_classification_reset.py — pytest coverage for the css_element/
css_tier stale-survives-reseed fix in sgs-update-v2.py::_apply_attr_classification_overrides.

Spec ref: this session's fix, D6xx (2026-08-15) — Class 1 of the four defect classes
handed down for this branch (fix/element-manifest-placement-gate).

Root cause (proven by a live read-only diagnostic against sgs-framework.db, not
guessed): the per-row UPDATE inside `_apply_attr_classification_overrides` is
ADDITIVE-PER-FIELD — it only SETs columns present in the `combined` dict for that
(slug, attr) key this run. When the derived classifier legitimately stops claiming
an element/tier for a pair, the column that isn't in `combined` this run is never
touched, so its prior value survives forever. `css_layer` already had a blanket
`UPDATE ... SET css_layer = NULL` BEFORE the per-row loop to make the reseed
authoritative; this fix extends that same reset to `css_element` and `css_tier`
(the two columns proven to carry live stale rows today — 5 and 1 respectively).
`css_property`/`css_state` were also audited and found to have ZERO current stale
rows, so they are deliberately left un-reset (prove-the-cause-before-fix).

Tests use an in-memory SQLite DB seeded with a minimal `block_attributes` schema —
no mutation of the real DB, no /sgs-update invocation, no network.
"""
from __future__ import annotations

import importlib.util
import sqlite3
import sys
from pathlib import Path
from unittest.mock import patch

sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None

REPO_ROOT = Path(__file__).resolve().parents[4]
SCRIPTS_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"


def _load_sgs_update_v2():
    spec = importlib.util.spec_from_file_location(
        "sgs_update_v2_under_test", SCRIPTS_DIR / "sgs-update-v2.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SGS = _load_sgs_update_v2()


def _make_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute(
        """
        CREATE TABLE block_attributes (
            id INTEGER PRIMARY KEY,
            block_slug TEXT,
            attr_name TEXT,
            attr_type TEXT,
            role TEXT,
            css_property TEXT,
            css_layer TEXT,
            css_element TEXT,
            css_state TEXT,
            css_tier TEXT
        )
        """
    )
    return conn


def _run_apply_with_fake_layer1(conn, fake_layer1: dict):
    """Call the real `_apply_attr_classification_overrides` against `conn`, with
    layer 1 (the classifications JSON) and every other optional layer/override
    stubbed to a controlled fixture — isolates the reset-vs-additive-UPDATE
    behaviour under test from the real (large, live-editing) JSON truth files."""
    with (
        patch.object(SGS, "_load_css_property_classifications", return_value=fake_layer1),
        patch.object(SGS, "_collect_boxfamily_overrides", return_value={}),
        patch.object(SGS, "_collect_fx_attr_namespace_overrides", return_value={}),
        patch.object(SGS, "ATTR_CLASSIFICATION_OVERRIDES", {}),
    ):
        return SGS._apply_attr_classification_overrides(
            conn, blocks_dir=REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks", dry_run=False
        )


def test_stale_css_element_is_cleared_when_classifier_drops_it():
    """POSITIVE CONTROL — the exact bug shape: a row previously carried
    css_element='breakdown-fill' (mirrors the real sgs/google-reviews.starColour
    finding). This run's classifier no longer claims an element for this attr at
    all. Before the fix, the additive-per-field UPDATE would never touch
    css_element for this row (it isn't in `combined`), so the stale value would
    survive. After the fix, the blanket pre-reset clears it to NULL."""
    conn = _make_db()
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, css_element) "
        "VALUES ('sgs/google-reviews', 'starColour', 'string', 'breakdown-fill')"
    )
    conn.commit()

    # This run's classifier output for this (slug, attr) has NO css_element field —
    # it legitimately stopped claiming one (only css_property survives).
    fake_layer1 = {("sgs/google-reviews", "starColour"): {"css_property": "color"}}
    _run_apply_with_fake_layer1(conn, fake_layer1)

    row = conn.execute(
        "SELECT css_property, css_element FROM block_attributes "
        "WHERE block_slug='sgs/google-reviews' AND attr_name='starColour'"
    ).fetchone()
    assert row[0] == "color", "css_property should still be (re)written from combined"
    assert row[1] is None, (
        "css_element must be cleared once the classifier stops claiming an element — "
        "this is the exact reseed-stale-survival bug (Class 1)"
    )


def test_stale_css_tier_is_cleared_when_classifier_drops_it():
    """POSITIVE CONTROL — the second proven-stale column (mirrors the real
    sgs/nav-menu.gap finding, attr_type='string' so the narrower object_tier_fossils
    cleanup does not reach it)."""
    conn = _make_db()
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, css_tier) "
        "VALUES ('sgs/nav-menu', 'gap', 'string', 'desktop')"
    )
    conn.commit()

    fake_layer1 = {("sgs/nav-menu", "gap"): {"css_property": "gap"}}
    _run_apply_with_fake_layer1(conn, fake_layer1)

    row = conn.execute(
        "SELECT css_tier FROM block_attributes WHERE block_slug='sgs/nav-menu' AND attr_name='gap'"
    ).fetchone()
    assert row[0] is None, "css_tier must be cleared once the classifier stops claiming a tier"


def test_current_css_element_value_is_reapplied_not_lost():
    """NEGATIVE CONTROL — a row whose css_element the classifier STILL claims this
    run must come out with the CURRENT (possibly-changed) value, not NULL and not
    silently unchanged garbage. Proves the reset-then-rewrite two-step doesn't just
    blank everything — it restores every row `combined` still declares."""
    conn = _make_db()
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, css_element) "
        "VALUES ('sgs/card-grid', 'imageZoomHover', 'string', 'stale-old-value')"
    )
    conn.commit()

    fake_layer1 = {
        ("sgs/card-grid", "imageZoomHover"): {"css_property": "transform", "css_element": "image"}
    }
    _run_apply_with_fake_layer1(conn, fake_layer1)

    row = conn.execute(
        "SELECT css_element FROM block_attributes "
        "WHERE block_slug='sgs/card-grid' AND attr_name='imageZoomHover'"
    ).fetchone()
    assert row[0] == "image", "a still-claimed css_element must be rewritten to this run's value"


def test_untouched_row_outside_combined_is_left_at_null_not_errored():
    """NEGATIVE CONTROL — a (slug, attr) that never appears in `combined` at all
    (was NULL before, is NULL after) must not raise and must not gain a phantom
    value from the reset."""
    conn = _make_db()
    conn.execute(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type) "
        "VALUES ('sgs/unrelated-block', 'unrelatedAttr', 'string')"
    )
    conn.commit()

    _run_apply_with_fake_layer1(conn, {})

    row = conn.execute(
        "SELECT css_element, css_tier FROM block_attributes "
        "WHERE block_slug='sgs/unrelated-block' AND attr_name='unrelatedAttr'"
    ).fetchone()
    assert row[0] is None
    assert row[1] is None


if __name__ == "__main__":
    import pytest

    raise SystemExit(pytest.main([__file__, "-v"]))
