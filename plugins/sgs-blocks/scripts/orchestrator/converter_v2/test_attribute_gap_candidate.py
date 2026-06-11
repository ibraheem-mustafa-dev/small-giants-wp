"""Tests for D3 — Attribute gap candidate wiring.

Covers:
  1. A CSS rule that lifts via D1 (typed attr) — D3 must NOT fire.
  2. A CSS rule that has no schema match — D3 must fire and insert a row.
  3. Idempotency — same rule twice in same run inserts only once.
  4. attr_name_proposed derivation for letter-spacing on .sgs-hero__label.
  5. source_class preservation — gap row carries the original source class.

All tests use an in-memory SQLite DB patched over SGS_DB so the real
sgs-framework.db is never touched.
"""
from __future__ import annotations

import sqlite3
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

# Ensure the scripts directory is on the path so imports resolve.
_SCRIPTS_DIR = Path(__file__).parent.parent.parent  # .../sgs-blocks/scripts
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_temp_db() -> sqlite3.Connection:
    """Return an in-memory DB populated with the attribute_gap_candidates
    schema plus minimal rows in property_suffixes and slots so
    propose_attr_name() has something to work with.

    D99 2026-05-29: fixture uses `slots` (scope='element'), not the dropped
    `slot_synonyms` table.  db_lookup._slot_synonyms() queries
    `slots WHERE scope='element'`, so the fixture must match that schema.
    """
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE attribute_gap_candidates (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            block_slug     TEXT    NOT NULL,
            attr_name      TEXT    NOT NULL,
            stem           TEXT,
            proposed_action TEXT,
            created_at     TEXT    DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (block_slug, attr_name)
        )
    """)
    conn.execute("""
        CREATE TABLE property_suffixes (
            suffix        TEXT NOT NULL,
            role          TEXT NOT NULL,
            css_property  TEXT,
            is_token_matched INTEGER DEFAULT 1,
            token_source  TEXT,
            notes         TEXT
        )
    """)
    # D99 2026-05-29: slot_synonyms was dropped; unified `slots` table replaces it.
    # db_lookup._slot_synonyms() queries `slots WHERE scope='element'`.
    conn.execute("""
        CREATE TABLE slots (
            slot_name        TEXT NOT NULL,
            scope            TEXT NOT NULL DEFAULT 'element',
            aliases          TEXT,
            standalone_block TEXT,
            notes            TEXT,
            created_at       TEXT DEFAULT CURRENT_TIMESTAMP,
            standalone_block_default_attrs TEXT,
            PRIMARY KEY (slot_name, scope)
        )
    """)
    conn.execute("""
        CREATE TABLE modifier_suffixes (
            suffix TEXT PRIMARY KEY,
            kind   TEXT NOT NULL,
            notes  TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE blocks (
            slug     TEXT PRIMARY KEY,
            title    TEXT NOT NULL,
            category TEXT NOT NULL,
            type     TEXT NOT NULL,
            status   TEXT NOT NULL DEFAULT 'built'
        )
    """)
    conn.execute("""
        CREATE TABLE block_attributes (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            block_slug   TEXT NOT NULL,
            attr_name    TEXT NOT NULL,
            attr_type    TEXT NOT NULL,
            canonical_slot TEXT,
            role         TEXT,
            UNIQUE(block_slug, attr_name)
        )
    """)
    # Seed known suffix rows used by the tests
    conn.executemany(
        "INSERT INTO property_suffixes (suffix, role, css_property) VALUES (?, ?, ?)",
        [
            ("Colour", "color", "color"),
            ("FontSize", "typography", "font-size"),
            ("LetterSpacing", "typography", "letter-spacing"),
        ],
    )
    # Seed breakpoint modifier suffixes so breakpoint_suffix_rules() passes validation
    conn.executemany(
        "INSERT INTO modifier_suffixes (suffix, kind) VALUES (?, ?)",
        [
            ("Mobile", "breakpoint"),
            ("Tablet", "breakpoint"),
            ("Desktop", "breakpoint"),
        ],
    )
    # Seed a slot row: label (element scope) with aliases so _slot_synonyms()
    # can resolve "label" / "eyebrow" → canonical "label".
    # D99: was slot_synonyms.canonical_slot; now slots.slot_name with scope='element'.
    conn.execute(
        "INSERT INTO slots (slot_name, scope, aliases) VALUES (?, 'element', ?)",
        ("label", '["label", "eyebrow"]'),
    )
    conn.commit()
    return conn


@pytest.fixture
def temp_db(tmp_path):
    """Write a minimal DB to a temp file and patch SGS_DB in db_lookup + convert."""
    db_path = tmp_path / "test-sgs.db"
    conn = _make_temp_db()
    # Persist in-memory DB to the temp file
    disk_conn = sqlite3.connect(str(db_path))
    conn.backup(disk_conn)
    disk_conn.close()
    conn.close()
    return db_path


# ---------------------------------------------------------------------------
# Helper: patch the DB path in both modules
# ---------------------------------------------------------------------------

def _patch_db(temp_db_path: Path):
    """Context manager that redirects SGS_DB in both modules to temp_db_path."""
    from orchestrator.converter_v2 import db_lookup as db_mod
    from orchestrator.converter_v2 import convert as cv_mod

    import contextlib

    @contextlib.contextmanager
    def _ctx():
        original_db_path = db_mod.SGS_DB
        db_mod.SGS_DB = temp_db_path
        # Bust all lru_caches that query the DB so they re-query the temp DB.
        # Note: _slot_to_html_tag was retired at D99 (html_semantic_tag column
        # dropped); it is no longer present in db_lookup — excluded from this list.
        for fn in (
            db_mod._slot_synonyms,
            db_mod._slot_to_standalone_block,
            db_mod._canonical_modifiers,
            db_mod.css_property_suffixes,
            db_mod.registered_block_slugs,
            db_mod.breakpoint_suffix_rules,
        ):
            try:
                fn.cache_clear()
            except AttributeError:
                pass
        try:
            yield db_mod
        finally:
            db_mod.SGS_DB = original_db_path
            for fn in (
                db_mod._slot_synonyms,
                db_mod._slot_to_standalone_block,
                db_mod._canonical_modifiers,
                db_mod.css_property_suffixes,
                db_mod.registered_block_slugs,
                db_mod.breakpoint_suffix_rules,
            ):
                try:
                    fn.cache_clear()
                except AttributeError:
                    pass

    return _ctx()


# ---------------------------------------------------------------------------
# Tests 1 and 2 removed — they tested _lift_styling_attrs and _slot_attr_prefix
# which were deleted in Commit 1a (dead code, zero production callers).
# The gap-candidate recording they exercised is covered by the remaining tests
# (test_idempotency, test_source_class_preserved, test_rc2_*, test_rc1_*) via
# _record_gap_candidate directly, which is the production path.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Test 3: Idempotency — same rule twice only inserts once
# ---------------------------------------------------------------------------

def test_idempotency(temp_db):
    """Calling _record_gap_candidate twice with the same (block, prop, class)
    tuple must NOT create a duplicate row in the DB or in the accumulator.
    """
    with _patch_db(temp_db):
        from orchestrator.converter_v2 import convert as cv

        cv.clear_gap_candidates()
        cv.seed_gap_context("test-run-002")

        # Record same gap twice
        cv._record_gap_candidate("sgs/hero", "letter-spacing", "0.5px", ".sgs-hero__label")
        cv._record_gap_candidate("sgs/hero", "letter-spacing", "0.5px", ".sgs-hero__label")

        assert len(cv._GAP_CANDIDATES) == 1, (
            f"Accumulator should de-duplicate; got {len(cv._GAP_CANDIDATES)} entries"
        )

        # Flush twice — second flush should be a no-op (accumulator cleared after first)
        flushed1 = cv.flush_gap_candidates()
        flushed2 = cv.flush_gap_candidates()

        assert len(flushed1) == 1
        assert len(flushed2) == 0, "Second flush on empty accumulator should return []"

        # DB should have exactly one row
        conn = sqlite3.connect(str(temp_db))
        count = conn.execute(
            "SELECT COUNT(*) FROM attribute_gap_candidates WHERE block_slug='sgs/hero'"
        ).fetchone()[0]
        conn.close()

        assert count == 1, f"DB must have exactly 1 row after idempotent writes; got {count}"


# ---------------------------------------------------------------------------
# Test 4: attr_name_proposed derivation for letter-spacing on .sgs-hero__label
# ---------------------------------------------------------------------------

def test_attr_name_proposed_derivation(temp_db):
    """propose_attr_name() for css_property='letter-spacing' on source_class
    '.sgs-hero__label' should produce 'labelLetterSpacing'.

    Derivation:
      - property_suffixes: letter-spacing → suffix 'LetterSpacing'
      - BEM parse: sgs-hero__label → element='label'
      - slot_synonyms: label → canonical 'label'
      - result: 'label' + 'LetterSpacing' = 'labelLetterSpacing'
    """
    with _patch_db(temp_db):
        from orchestrator.converter_v2 import db_lookup as db_mod

        proposed = db_mod.propose_attr_name(
            "sgs/hero", "letter-spacing", ".sgs-hero__label"
        )
        assert proposed == "labelLetterSpacing", (
            f"Expected 'labelLetterSpacing'; got {proposed!r}"
        )


# ---------------------------------------------------------------------------
# Test 5: source_class preservation in gap row
# ---------------------------------------------------------------------------

def test_source_class_preserved(temp_db):
    """The gap row in DB must carry the original source class string in
    proposed_action so operators can trace which selector produced the gap.
    """
    with _patch_db(temp_db):
        from orchestrator.converter_v2 import convert as cv

        cv.clear_gap_candidates()
        cv.seed_gap_context("test-run-003")

        cv._record_gap_candidate(
            "sgs/hero", "text-transform", "uppercase", ".sgs-hero__label"
        )
        flushed = cv.flush_gap_candidates()

        assert len(flushed) == 1
        conn = sqlite3.connect(str(temp_db))
        row = conn.execute(
            "SELECT proposed_action FROM attribute_gap_candidates "
            "WHERE block_slug='sgs/hero' AND stem='text-transform'"
        ).fetchone()
        conn.close()

        assert row is not None, "Gap row not found in DB"
        assert ".sgs-hero__label" in row[0], (
            f"source_class '.sgs-hero__label' must appear in proposed_action; got {row[0]!r}"
        )
        assert "test-run-003" in row[0], (
            f"run_id 'test-run-003' must appear in proposed_action; got {row[0]!r}"
        )


# ---------------------------------------------------------------------------
# Tests 6, 7, and 8 removed — they tested _lift_styling_attrs (RC-2 and RC-1
# regression guards) which was deleted in Commit 1a (dead code, zero production
# callers).  The properties they guarded (_SUPPORTS_HANDLED_PROPS, breakpoint
# gap-candidate recording) are exercised via the production walker path in
# test_converter_conformance.py golden fixtures.
# ---------------------------------------------------------------------------
