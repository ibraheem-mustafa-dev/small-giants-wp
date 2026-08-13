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
    # `css_property`, `canonical_slot` and the `roles` table are part of this fixture
    # because `apply_role_detection_inline` grew tiers that read them — TIER 3 (generic
    # styling backstop, gated on `css_property IS NOT NULL`), TIER 3.6 (boolean sweep) and
    # TIER 3.7 (role/attr_type compatibility), the last two joining `roles` for its
    # `classification` column. Without them the fixture raised
    # `sqlite3.OperationalError: no such column: css_property` before reaching a single
    # assertion, so BOTH tests in this module failed for a schema reason, not a logic one.
    #
    # A fixture narrower than the schema its subject queries does not "test less" — it
    # fails closed and stops testing anything. Keep this in step with the real table when
    # a new tier reads a new column.
    conn.execute(
        "CREATE TABLE block_attributes ("
        " id INTEGER PRIMARY KEY, block_slug TEXT, attr_name TEXT, role TEXT,"
        " attr_type TEXT, enum_values TEXT, description TEXT,"
        " css_property TEXT, canonical_slot TEXT,"
        # TIER 3.18 (native_wp -> role='core', b3107413, 2026-08-13) reads `source`.
        # Added for the same reason as output_signature below: the fixture must carry
        # every column the real function READS, or the gate fires on schema drift
        # rather than on a real defect. It fired correctly here — this line is the
        # fixture catching up to the classifier, not a weakening of the check.
        " source TEXT,"
        # TIER 3.45 (link-fragment, 2026-08-06) reads output_signature to find the
        # `link_template` render.php assembles around a URL fragment. Added here
        # because the fixture must carry every column the real function READS --
        # a missing column raised OperationalError rather than quietly skipping,
        # which is the correct behaviour: swallowing it would hide schema drift.
        " output_signature TEXT)"
    )
    conn.execute("CREATE TABLE roles (role_name TEXT, classification TEXT)")
    # TIER 3.4 (unit inheritance) reads the unit suffix from `modifier_suffixes` rather
    # than hardcoding the literal 'Unit' (R-31-1, DB-first), so the fixture must carry it.
    conn.execute("CREATE TABLE modifier_suffixes (suffix TEXT, kind TEXT)")
    conn.executemany(
        "INSERT INTO modifier_suffixes (suffix, kind) VALUES (?,?)",
        [("Unit", "unit"), ("Tablet", "breakpoint"), ("Mobile", "breakpoint"),
         ("Desktop", "breakpoint"), ("Top", "side"), ("Right", "side"),
         ("Bottom", "side"), ("Left", "side")],
    )
    # Mirrors the real `roles` table's classification split — the only column these tiers
    # read. Content-bearing vs styling-behaviour is what decides whether a row is eligible
    # for the content walk, so both sides must be represented.
    conn.executemany(
        "INSERT INTO roles (role_name, classification) VALUES (?,?)",
        [
            ("text-content", "content-bearing"), ("content", "content-bearing"),
            ("image-object", "content-bearing"), ("image-alt", "content-bearing"),
            ("link-href", "content-bearing"), ("identity", "content-bearing"),
            ("styling", "styling-behaviour"), ("technical", "styling-behaviour"),
            ("layout", "styling-behaviour"), ("typography", "styling-behaviour"),
            ("boolean-visibility", "styling-behaviour"), ("enum-mode", "styling-behaviour"),
            ("select-from-enum", "styling-behaviour"), ("behaviour", "styling-behaviour"),
        ],
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
