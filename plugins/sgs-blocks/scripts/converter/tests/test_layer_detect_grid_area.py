"""test_layer_detect_grid_area.py — the GRID_AREA branch added by the 2026-06-29 seam.

layer_detect returns GRID_AREA (Spec 31 §3.A L4) when the Ctx-builder has placed the
element in a named parent grid area (ctx.area_name set), in precedence ABOVE the
element's own display:grid signal — an element can be a grid ITEM (parent context)
while also declaring its own grid; per-area box routing wins.
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx
from converter.services.layer_detect import layer_detect
from converter.db.db_lookup import SGS_DB


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


def _ctx(conn, *, is_root, area=None):
    c = Ctx("sgs/hero", "section", 1, None, None, None, is_root, None, conn)
    c.area_name = area
    return c


def test_grid_area_when_area_name_set(conn):
    ctx = _ctx(conn, is_root=False, area="content")
    assert layer_detect(ctx, {}) == "GRID_AREA"


def test_grid_area_precedes_own_display_grid(conn):
    # The element declares its OWN grid, but it occupies a parent area → GRID_AREA.
    ctx = _ctx(conn, is_root=False, area="media")
    assert layer_detect(ctx, {"display": "grid"}) == "GRID_AREA"


def test_no_area_falls_through_to_grid(conn):
    ctx = _ctx(conn, is_root=False, area=None)
    assert layer_detect(ctx, {"display": "grid"}) == "GRID"


def test_root_is_outer_even_without_area(conn):
    ctx = _ctx(conn, is_root=True, area=None)
    assert layer_detect(ctx, {"max-width": "1200px", "margin": "0 auto"}) == "OUTER"
