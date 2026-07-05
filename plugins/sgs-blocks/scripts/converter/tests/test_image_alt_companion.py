"""test_image_alt_companion.py — db_lookup.image_alt_companion_for (CG-8, 2026-07-05).

Root cause: field_extractors.scalar_media_from_img always builds a full
{"url", "id", "alt"} dict, but a STRING-typed image-object attr (e.g.
sgs/product-card.image, sgs/media.imageUrl) downcasts that dict to the bare
URL — discarding the alt even though both blocks declare a sibling `imageAlt`
string attr that render.php already reads into alt="". This module tests the
DB accessor in isolation (monkeypatched SGS_DB, mirrors
test_content_attr_resolver.py's isolated-DB style) — the walk-level
integration is covered by test_extraction.py's CG-8 tests, which exercise the
real, live sgs/product-card + sgs/media + sgs/team-member DB rows.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_image_alt_companion.py -q --import-mode=importlib
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.db import db_lookup


@pytest.fixture(autouse=True)
def _clear_companion_cache():
    """image_alt_companion_for is lru_cache'd (module-level, process-lifetime).
    Each test below monkeypatches SGS_DB to a throwaway fixture DB, so a value
    cached under a real (block_slug, attr) key inside this module would leak
    into every other test/production call using db_lookup's real DB for the
    SAME key for the rest of the pytest session (test pollution — caught live:
    running this file before test_converter_conformance.py cached a stale
    None for ("sgs/product-card", "image"), making the real conformance golden
    test fail only when run as part of the full suite, never in isolation).
    Clear before AND after every test so no fixture-DB value survives past it."""
    db_lookup.image_alt_companion_for.cache_clear()
    yield
    db_lookup.image_alt_companion_for.cache_clear()


def _make_db(tmp_path, rows):
    """rows: list of (block_slug, attr_name, attr_type, role, alt_companion_attr)."""
    db_path = tmp_path / "fixture.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT,"
        " attr_type TEXT, role TEXT, alt_companion_attr TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (block_slug, attr_name, attr_type, role,"
        " alt_companion_attr) VALUES (?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    conn.close()
    return db_path


def test_finds_the_declared_companion(tmp_path, monkeypatch):
    """A block with an explicit alt_companion_attr row must resolve it."""
    db_path = _make_db(tmp_path, [
        ("sgs/product-card", "image", "string", "image-object", None),
        ("sgs/product-card", "imageAlt", "string", "image-alt", "image"),
    ])
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)
    db_lookup.image_alt_companion_for.cache_clear()

    assert db_lookup.image_alt_companion_for("sgs/product-card", "image") == "imageAlt"


def test_no_naming_convention_required(tmp_path, monkeypatch):
    """The companion name need NOT be derivable from the image attr's name —
    unlike unit_companion_attr's suffix-stripping, this is a stored DB fact.
    sgs/media's image attr is `imageUrl` but its companion is `imageAlt`, not
    a suffix-derived `imageUrlAlt`."""
    db_path = _make_db(tmp_path, [
        ("sgs/media", "imageUrl", "string", "image-object", None),
        ("sgs/media", "imageAlt", "string", "image-alt", "imageUrl"),
    ])
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)
    db_lookup.image_alt_companion_for.cache_clear()

    assert db_lookup.image_alt_companion_for("sgs/media", "imageUrl") == "imageAlt"


def test_disambiguates_two_image_object_attrs_sharing_a_slot(tmp_path, monkeypatch):
    """sgs/media declares TWO role='image-object' attrs (imageUrl, videoPoster);
    only imageUrl has a declared alt companion. videoPoster must resolve to
    None, never falsely matching imageAlt via a shared canonical_slot."""
    db_path = _make_db(tmp_path, [
        ("sgs/media", "imageUrl", "string", "image-object", None),
        ("sgs/media", "videoPoster", "string", "image-object", None),
        ("sgs/media", "imageAlt", "string", "image-alt", "imageUrl"),
    ])
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)
    db_lookup.image_alt_companion_for.cache_clear()

    assert db_lookup.image_alt_companion_for("sgs/media", "imageUrl") == "imageAlt"
    assert db_lookup.image_alt_companion_for("sgs/media", "videoPoster") is None


def test_no_companion_declared_returns_none(tmp_path, monkeypatch):
    """A block with no role='image-alt' row at all (e.g. sgs/team-member, whose
    photo/memberMedia attrs are object-typed and never reach the collapse
    branch) must return None, not raise."""
    db_path = _make_db(tmp_path, [
        ("sgs/team-member", "photo", "object", "image-object", None),
    ])
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)
    db_lookup.image_alt_companion_for.cache_clear()

    assert db_lookup.image_alt_companion_for("sgs/team-member", "photo") is None


def test_pre_migration_schema_no_column_returns_none(tmp_path, monkeypatch):
    """Before the alt_companion_attr column exists (a DB not yet re-seeded via
    /sgs-update --stage 1), the lookup degrades to None rather than raising
    'no such column' — lets the converter run against a stale DB snapshot."""
    db_path = tmp_path / "no-column.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT,"
        " attr_type TEXT, role TEXT)"
    )
    conn.commit()
    conn.close()
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)
    db_lookup.image_alt_companion_for.cache_clear()

    assert db_lookup.image_alt_companion_for("sgs/product-card", "image") is None
