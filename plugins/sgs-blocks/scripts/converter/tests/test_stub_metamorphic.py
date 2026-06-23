"""test_stub_metamorphic.py — the 6 stub resolvers' metamorphic tests are xfail.

Design §4 #3 / §10 A14 / cheat MF-G: a stub's metamorphic test must be
@pytest.mark.xfail(strict=True), NEVER vacuously green — so an honest empty stub is
distinguishable from a finished resolver, and the test flips to a real PASS (xpass →
failure under strict) only when that stage builds real logic, forcing the test to be
rewritten as a genuine relation.
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.models import GAP, GapOrigin
from converter.resolvers import (
    content_band,
    grid,
    grid_area,
    scalar_content,
    scalar_media,
    typography,
)
from orchestrator.converter_v2.db_lookup import SGS_DB

_STUBS = {
    "content_band": content_band.resolve,
    "grid": grid.resolve,
    "grid_area": grid_area.resolve,
    "typography": typography.resolve,
    "scalar_content": scalar_content.resolve,
    "scalar_media": scalar_media.resolve,
}


def _ctx() -> Ctx:
    return Ctx("sgs/container", "section", 1, None, None, None, True, None,
               sqlite3.connect(SGS_DB))


@pytest.mark.parametrize("name,resolve", list(_STUBS.items()))
def test_stub_returns_unimplemented_gap(name, resolve):
    # The honest current behaviour: every stub returns UNIMPLEMENTED_STUB.
    out = resolve(Decl("color", "red", "Base"), _ctx())
    assert isinstance(out, GAP)
    assert out.origin is GapOrigin.UNIMPLEMENTED_STUB


@pytest.mark.parametrize("name,resolve", list(_STUBS.items()))
@pytest.mark.xfail(strict=True, reason="stub not built — real metamorphic relation lands in step 3")
def test_stub_metamorphic_real_transfer(name, resolve):
    # This asserts a REAL transfer (a Write), which a stub cannot produce. xfail(strict)
    # → this turns into a hard failure the moment the stub starts transferring, forcing
    # the stage to replace it with a genuine metamorphic relation.
    out = resolve(Decl("color", "red", "Base"), _ctx())
    from converter.models import Write
    assert isinstance(out, Write)
