"""Regression test for assign-canonical.apply_role_detection_inline (2026-06-30).

Root cause it guards: the role classifier was CLI-only (never run by the
deterministic /sgs-update reseed) AND NULL-only (never corrected a wrong
populated role). The inline pass — wired into run() — now (a) FILLS NULL
content roles and (b) UPGRADES the generic 'content' catch-all to a specific
content-bearing role on a high-confidence name-regex match, while NEVER touching
a specific non-'content' role (e.g. scalar-media).

See .claude/reports/2026-06-30-role-derivation-root-cause.md.
"""
import importlib.util
import sqlite3
from pathlib import Path

import pytest

_AC_PATH = (
    Path(__file__).resolve().parents[2]
    / "behavioural-analyser"
    / "assign-canonical.py"
)


def _load_ac():
    spec = importlib.util.spec_from_file_location("assign_canonical_mod", _AC_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _make_db(rows):
    """rows: list of (block_slug, attr_name, role|None, attr_type)."""
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE block_attributes ("
        " id INTEGER PRIMARY KEY, block_slug TEXT, attr_name TEXT, role TEXT,"
        " attr_type TEXT, enum_values TEXT, description TEXT)"
    )
    for i, (slug, attr, role, atype) in enumerate(rows, 1):
        conn.execute(
            "INSERT INTO block_attributes (id, block_slug, attr_name, role, attr_type)"
            " VALUES (?,?,?,?,?)",
            (i, slug, attr, role, atype),
        )
    conn.commit()
    return conn


def _role(conn, slug, attr):
    return conn.execute(
        "SELECT role FROM block_attributes WHERE block_slug=? AND attr_name=?",
        (slug, attr),
    ).fetchone()[0]


def test_inline_role_detection_fills_upgrades_and_protects():
    ac = _load_ac()
    conn = _make_db([
        ("sgs/icon", "linkUrl", "content", "string"),          # UPGRADE -> link-href
        ("sgs/media", "imageUrl", "content", "string"),         # UPGRADE -> image-object
        ("sgs/cart", "iconName", None, "string"),               # FILL    -> identity
        ("sgs/product-faq", "heading", None, "string"),         # FILL    -> text-content
        ("sgs/hero", "splitImage", "scalar-media", "object"),   # PROTECTED (untouched)
        ("sgs/button", "minHeight", "layout", "number"),        # PROTECTED (untouched)
    ])
    result = ac.apply_role_detection_inline(conn)

    assert _role(conn, "sgs/icon", "linkUrl") == "link-href"
    assert _role(conn, "sgs/media", "imageUrl") == "image-object"
    assert _role(conn, "sgs/cart", "iconName") == "identity"
    assert _role(conn, "sgs/product-faq", "heading") == "text-content"
    # A deliberate specific role is NEVER overwritten (only the generic 'content').
    assert _role(conn, "sgs/hero", "splitImage") == "scalar-media"
    assert _role(conn, "sgs/button", "minHeight") == "layout"

    assert result["upgraded"] == 2
    assert result["filled"] == 2


def test_inline_is_idempotent():
    ac = _load_ac()
    conn = _make_db([("sgs/icon", "linkUrl", "content", "string")])
    ac.apply_role_detection_inline(conn)
    second = ac.apply_role_detection_inline(conn)
    # After the first pass the role is 'link-href' (specific) — never re-touched.
    assert _role(conn, "sgs/icon", "linkUrl") == "link-href"
    assert second["upgraded"] == 0 and second["filled"] == 0
