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
# Test 1: D1 lift — D3 must NOT fire
# ---------------------------------------------------------------------------

def test_d1_lift_no_d3(temp_db):
    """When a CSS property lifts successfully via D1 (candidate exists in
    schema), _record_gap_candidate must NOT be called.
    """
    with _patch_db(temp_db):
        from orchestrator.converter_v2 import convert as cv

        cv.clear_gap_candidates()

        # Simulate: block sgs/hero has schema with "labelColour" (so D1 lands)
        # We call _lift_styling_attrs with a mock node + schema that includes
        # the candidate. Use _record_gap_candidate spy to verify it's not called.

        from bs4 import BeautifulSoup
        html = '<span class="sgs-hero__label" style="color: var(--text);">Test</span>'
        soup = BeautifulSoup(html, "html.parser")
        desc = soup.find("span")

        schema_with_candidate = {
            "label": {"attr_type": "string", "canonical_slot": "label"},       # anchor attr for prefix
            "labelColour": {"attr_type": "string", "canonical_slot": "label"},  # D1 candidate that SHOULD land
        }
        attrs: dict = {}
        css_rules: dict = {}

        # Call the internal function directly
        cv._lift_styling_attrs(desc, "label", "sgs/hero", schema_with_candidate, attrs, css_rules)

        # Verify D1 lifted the colour
        assert "labelColour" in attrs, f"D1 should have lifted labelColour; got attrs={attrs}"

        # Verify D3 did NOT fire (no gap candidate recorded)
        gaps = cv._GAP_CANDIDATES
        # The color property should be absent from gaps since it was lifted
        color_gaps = [g for g in gaps if g["css_property"] == "color"]
        assert len(color_gaps) == 0, (
            f"D3 must not fire when D1 successfully lifts; got color gap(s): {color_gaps}"
        )


# ---------------------------------------------------------------------------
# Test 2: D3 fires for CSS rule with no schema match
# ---------------------------------------------------------------------------

def test_d3_fires_for_unknown_prop(temp_db):
    """When a CSS property has no matching attr in the block schema,
    D3 must record a gap candidate and write it to the DB.
    """
    with _patch_db(temp_db):
        from orchestrator.converter_v2 import convert as cv
        from orchestrator.converter_v2 import db_lookup as db_mod

        cv.clear_gap_candidates()
        cv.seed_gap_context("test-run-001")

        from bs4 import BeautifulSoup
        # letter-spacing on a label — no matching attr in schema
        html = '<span class="sgs-hero__label">Test</span>'
        soup = BeautifulSoup(html, "html.parser")
        desc = soup.find("span")

        # Schema has only "label" anchor (no labelLetterSpacing yet — that's the gap)
        schema_without_letter_spacing = {
            "label": {"attr_type": "string", "canonical_slot": "label"},
        }
        attrs: dict = {}
        css_rules: dict = {
            ".sgs-hero__label": {"letter-spacing": "0.5px"},
        }

        cv._lift_styling_attrs(
            desc, "label", "sgs/hero", schema_without_letter_spacing, attrs, css_rules
        )

        # D3 should have recorded a gap for letter-spacing
        gaps = cv._GAP_CANDIDATES
        letter_gaps = [g for g in gaps if g["css_property"] == "letter-spacing"]
        assert len(letter_gaps) >= 1, (
            f"D3 must fire for letter-spacing with no schema match; _GAP_CANDIDATES={gaps}"
        )

        # Now flush — should write to DB
        flushed = cv.flush_gap_candidates()
        assert len(flushed) >= 1, f"flush_gap_candidates should return written rows; got {flushed}"

        # Verify the row landed in the DB
        conn = sqlite3.connect(str(temp_db))
        rows = conn.execute(
            "SELECT block_slug, attr_name, stem FROM attribute_gap_candidates "
            "WHERE block_slug = ? AND stem = ?",
            ("sgs/hero", "letter-spacing"),
        ).fetchall()
        conn.close()

        assert len(rows) == 1, f"Expected 1 DB row for letter-spacing gap; got {rows}"
        assert rows[0][0] == "sgs/hero"
        assert rows[0][2] == "letter-spacing"  # stem carries the CSS property


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
# Test 6: RC-2 — layout props removed from _SUPPORTS_HANDLED_PROPS now reach D3
# ---------------------------------------------------------------------------

def test_rc2_layout_props_reach_d3(temp_db):
    """RC-2 regression guard: justify-content and grid-template-columns were
    previously excluded from D3 via _SUPPORTS_HANDLED_PROPS despite NOT being
    handled by _lift_root_supports_to_style. After the fix they must flow into
    D3 Mode 1 (no suffix mapping) and produce _record_gap_candidate calls.

    Simulates .sgs-hero__content with justify-content: center on sgs/hero.
    Expects at least one gap candidate entry for 'justify-content'.

    Also verifies that a genuinely handled prop (e.g. color) does NOT reach D3
    when it lifts successfully — no regression on the no-double-write guarantee.
    """
    with _patch_db(temp_db):
        from orchestrator.converter_v2 import convert as cv

        cv.clear_gap_candidates()
        cv.seed_gap_context("test-run-rc2")

        from bs4 import BeautifulSoup

        # Simulate .sgs-hero__content with layout props + a colour that lifts
        html = '<div class="sgs-hero__content" style="justify-content: center; grid-template-columns: 1fr 1fr; color: var(--text);"></div>'
        soup = BeautifulSoup(html, "html.parser")
        desc = soup.find("div")

        # Schema: "content" anchor + "contentColour" so colour D1-lifts; no
        # attrs for justify-content / grid-template-columns → those must fall to D3.
        schema = {
            "content": {"attr_type": "string", "canonical_slot": "content"},
            "contentColour": {"attr_type": "string", "canonical_slot": "content"},
        }
        attrs: dict = {}
        css_rules: dict = {
            ".sgs-hero__content": {
                "justify-content": "center",
                "grid-template-columns": "1fr 1fr",
                "color": "var(--text)",
            },
        }

        cv._lift_styling_attrs(desc, "content", "sgs/hero", schema, attrs, css_rules)

        gaps = cv._GAP_CANDIDATES

        # 1. justify-content MUST be in gap candidates (RC-2 fix)
        jc_gaps = [g for g in gaps if g["css_property"] == "justify-content"]
        assert len(jc_gaps) >= 1, (
            f"RC-2 FAIL: justify-content must reach D3 after removing it from "
            f"_SUPPORTS_HANDLED_PROPS; _GAP_CANDIDATES={gaps}"
        )

        # 2. grid-template-columns MUST also be in gap candidates (RC-2 fix)
        gtc_gaps = [g for g in gaps if g["css_property"] == "grid-template-columns"]
        assert len(gtc_gaps) >= 1, (
            f"RC-2 FAIL: grid-template-columns must reach D3 after removing it from "
            f"_SUPPORTS_HANDLED_PROPS; _GAP_CANDIDATES={gaps}"
        )

        # 3. color must NOT appear in gap candidates (colour D1-lifted, no double-write)
        colour_gaps = [g for g in gaps if g["css_property"] == "color"]
        assert len(colour_gaps) == 0, (
            f"No-regression FAIL: color must not reach D3 when it D1-lifts "
            f"successfully; colour_gaps={colour_gaps}"
        )


# ---------------------------------------------------------------------------
# Test 7: RC-2 — padding still bypasses D3 (handled props must not regress)
# ---------------------------------------------------------------------------

def test_rc2_handled_props_still_bypass_d3(temp_db):
    """Verify that CSS properties genuinely handled by _lift_root_supports_to_style
    (padding, margin, gap, background-color, border-radius) do NOT appear as D3
    gap candidates — i.e. removing the layout props from _SUPPORTS_HANDLED_PROPS
    did not accidentally remove genuinely handled props too.
    """
    with _patch_db(temp_db):
        from orchestrator.converter_v2 import convert as cv

        cv.clear_gap_candidates()
        cv.seed_gap_context("test-run-rc2-noregress")

        from bs4 import BeautifulSoup

        html = '<div class="sgs-hero__content"></div>'
        soup = BeautifulSoup(html, "html.parser")
        desc = soup.find("div")

        schema = {
            "content": {"attr_type": "string", "canonical_slot": "content"},
        }
        attrs: dict = {}
        css_rules: dict = {
            ".sgs-hero__content": {
                "padding": "24px",
                "margin-top": "16px",
                "gap": "12px",
                "background-color": "#0F7E80",
                "border-radius": "8px",
            },
        }

        cv._lift_styling_attrs(desc, "content", "sgs/hero", schema, attrs, css_rules)

        gaps = cv._GAP_CANDIDATES
        handled_in_gaps = [
            g for g in gaps
            if g["css_property"] in {
                "padding", "margin-top", "gap", "background-color", "border-radius"
            }
        ]
        assert len(handled_in_gaps) == 0, (
            f"No-regression FAIL: handled props must not reach D3; found: {handled_in_gaps}"
        )


# ---------------------------------------------------------------------------
# Test 8: RC-1 — D3 Mode 2 emits breakpoint-suffixed gap candidates
# ---------------------------------------------------------------------------

def _seed_rc1_props(temp_db_path: "Path") -> None:
    """Add font-family and line-height rows to property_suffixes in the temp DB.

    These rows are needed so _css_prop_to_suffix() returns FontFamily and
    LineHeight entries, enabling D3 Mode 2 to check them against the schema.
    """
    conn = sqlite3.connect(str(temp_db_path))
    conn.executemany(
        "INSERT OR IGNORE INTO property_suffixes (suffix, role, css_property) VALUES (?, ?, ?)",
        [
            ("FontFamily", "typography", "font-family"),
            ("LineHeight", "typography", "line-height"),
        ],
    )
    conn.commit()
    conn.close()


def test_rc1_breakpoint_only_props_produce_gap_candidates(temp_db):
    """RC-1 smoke test: breakpoint-only CSS props that have a property_suffixes
    mapping but no matching schema attr must surface as D3 gap candidates with
    a breakpoint-suffixed source_class (e.g. ".sgs-hero__heading@Desktop").

    Simulates:
        h1 { color: red; }
        @media (min-width: 1280px) { h1 { font-family: Fraunces; line-height: 1.1; } }

    Against sgs/hero hero with schema:
        - "headline" (string, heading slot)         — prefix anchor
        - "headlineColour" (string, heading slot)   — so D1 lifts `color` from base

    Expected: gap candidates for headlineFontFamilyDesktop and
    headlineLineHeightDesktop (Mode 2 — suffix mapped but attr absent from schema).

    Also verifies zero double-emission: headlineColour lands via D1 for base_decls,
    must NOT appear as a D3 gap row.
    """
    # Seed font-family + line-height into the temp DB before patching
    _seed_rc1_props(temp_db)

    with _patch_db(temp_db):
        from orchestrator.converter_v2 import convert as cv

        cv.clear_gap_candidates()
        cv.seed_gap_context("test-run-rc1")

        from bs4 import BeautifulSoup

        # h1 element with SGS-BEM heading class so _slot_attr_prefix finds prefix
        html = '<h1 class="sgs-hero__heading">Hero Title</h1>'
        soup = BeautifulSoup(html, "html.parser")
        desc = soup.find("h1")

        # Schema: "headline" anchor + "headlineColour" (D1 lands for base color)
        # Deliberately NO headlineFontFamilyDesktop or headlineLineHeightDesktop
        # so those breakpoint props must fall to D3.
        schema = {
            "headline":      {"attr_type": "string", "canonical_slot": "heading"},
            "headlineColour": {"attr_type": "string", "canonical_slot": "heading"},
        }
        attrs: dict = {}

        # css_rules format: "media_cond::selector" → {prop: value} for media rules,
        # "selector" → {prop: value} for base rules.
        css_rules: dict = {
            # Base rule — color lifts via D1 into headlineColour
            ".sgs-hero__heading": {"color": "red"},
            # Breakpoint-only rules — font-family and line-height appear ONLY here
            "min-width: 1280px::h1": {
                "font-family": "Fraunces",
                "line-height": "1.1",
            },
        }

        cv._lift_styling_attrs(desc, "heading", "sgs/hero", schema, attrs, css_rules)

        gaps = cv._GAP_CANDIDATES

        # 1. font-family at Desktop breakpoint must produce a D3 gap candidate
        ff_gaps = [g for g in gaps if g["css_property"] == "font-family"]
        assert len(ff_gaps) >= 1, (
            f"RC-1 FAIL: font-family in @media (min-width:1280px) must produce a "
            f"D3 gap candidate; _GAP_CANDIDATES={gaps}"
        )
        # source_class must carry the breakpoint annotation
        ff_bp_gaps = [g for g in ff_gaps if "@Desktop" in g.get("source_class", "")]
        assert len(ff_bp_gaps) >= 1, (
            f"RC-1 FAIL: font-family gap row must have '@Desktop' in source_class; "
            f"ff_gaps={ff_gaps}"
        )

        # 2. line-height at Desktop breakpoint must produce a D3 gap candidate
        lh_gaps = [g for g in gaps if g["css_property"] == "line-height"]
        assert len(lh_gaps) >= 1, (
            f"RC-1 FAIL: line-height in @media (min-width:1280px) must produce a "
            f"D3 gap candidate; _GAP_CANDIDATES={gaps}"
        )
        lh_bp_gaps = [g for g in lh_gaps if "@Desktop" in g.get("source_class", "")]
        assert len(lh_bp_gaps) >= 1, (
            f"RC-1 FAIL: line-height gap row must have '@Desktop' in source_class; "
            f"lh_gaps={lh_gaps}"
        )

        # 3. Zero double-emission: color D1-lifted from base → must NOT appear in D3 gaps
        colour_gaps = [g for g in gaps if g["css_property"] == "color"]
        assert len(colour_gaps) == 0, (
            f"RC-1 no-double-emission FAIL: color lifted via D1 must not appear in "
            f"D3 gap candidates; colour_gaps={colour_gaps}"
        )
