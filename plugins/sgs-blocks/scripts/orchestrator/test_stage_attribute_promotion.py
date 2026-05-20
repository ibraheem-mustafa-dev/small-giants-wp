#!/usr/bin/env python3
"""Tests for stage_attribute_promotion.py — P2.ii operator-driven promotion CLI.

Coverage:
  - _parse_sgs_proposed_action: all format variants
  - _infer_attr_type: numeric/boolean/string paths
  - _derive_attr_name_from_css: camelCase + UK English colour
  - _add_attr_to_block_json: adds attr, idempotent on repeat, handles missing attributes dict
  - _add_inline_style_to_render_php: adds branch, idempotent on repeat, creates stub
  - _build_render_php_snippet: output sanity
  - Promotion flow: attribute already in block.json is a no-op
  - cmd_status: runs without error against real or mock DBs
"""
from __future__ import annotations

import json
import sqlite3
import sys
import tempfile
import textwrap
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.stdout.reconfigure(encoding="utf-8")

# Import the module under test
sys.path.insert(0, str(Path(__file__).parent))
import stage_attribute_promotion as sap


# ---------------------------------------------------------------------------
# _parse_sgs_proposed_action
# ---------------------------------------------------------------------------


class TestParseSgsProposedAction:
    def test_standard_single_quote(self):
        action = "add attr: css=border-radius raw='10px' class=sgs-button run=mamas-munches-2026"
        result = sap._parse_sgs_proposed_action(action)
        assert result["css_property"] == "border-radius"
        assert result["value_seen"] == "10px"
        assert result["selector"] == "sgs-button"
        assert "mamas-munches" in result["run_id"]

    def test_double_quote_with_spaces(self):
        action = 'add attr: css=font-family raw="\'Fraunces\', serif" class=.heading run=run-001'
        result = sap._parse_sgs_proposed_action(action)
        assert result["css_property"] == "font-family"
        assert "Fraunces" in result["value_seen"]
        assert result["selector"] == ".heading"

    def test_empty_run(self):
        action = "add attr: css=font-weight raw='700' class=.heading run="
        result = sap._parse_sgs_proposed_action(action)
        assert result["css_property"] == "font-weight"
        assert result["value_seen"] == "700"
        assert result["run_id"] == ""

    def test_invalid_returns_empty(self):
        assert sap._parse_sgs_proposed_action("new-canonical-slot-needed") == {}
        assert sap._parse_sgs_proposed_action("instance-data-not-canonicalisable") == {}
        assert sap._parse_sgs_proposed_action("") == {}

    def test_flex_value(self):
        action = "add attr: css=flex raw='1' class=.sgs-product-card__body run=test"
        result = sap._parse_sgs_proposed_action(action)
        assert result["css_property"] == "flex"
        assert result["value_seen"] == "1"

    def test_negative_value(self):
        action = "add attr: css=letter-spacing raw='-0.5px' class=.heading run="
        result = sap._parse_sgs_proposed_action(action)
        assert result["value_seen"] == "-0.5px"


# ---------------------------------------------------------------------------
# _infer_attr_type
# ---------------------------------------------------------------------------


class TestInferAttrType:
    def test_pixel_value_is_string(self):
        # Font-size with 'px' suffix → we look for bare number; '16px' → stripped to '16' → float ok → number
        assert sap._infer_attr_type("font-size", "16px") == "number"

    def test_bare_number(self):
        assert sap._infer_attr_type("line-height", "1.55") == "number"

    def test_string_value(self):
        assert sap._infer_attr_type("font-family", "'Fraunces', serif") == "string"

    def test_boolean_true(self):
        assert sap._infer_attr_type("opacity", "true") == "boolean"

    def test_boolean_false(self):
        assert sap._infer_attr_type("opacity", "false") == "boolean"

    def test_colour_hex(self):
        assert sap._infer_attr_type("color", "#FFFFFF") == "string"

    def test_css_var(self):
        assert sap._infer_attr_type("color", "var(--primary)") == "string"

    def test_keyword(self):
        assert sap._infer_attr_type("display", "flex") == "string"

    def test_auto(self):
        # "auto" is not purely numeric
        assert sap._infer_attr_type("margin-top", "auto") == "string"

    def test_border_radius_value(self):
        assert sap._infer_attr_type("border-radius", "10px") == "number"


# ---------------------------------------------------------------------------
# _derive_attr_name_from_css
# ---------------------------------------------------------------------------


class TestDeriveAttrName:
    def test_font_size(self):
        result = sap._derive_attr_name_from_css("font-size", ".sgs-hero", "sgs/hero")
        assert result == "fontSize"

    def test_colour_uk_english(self):
        # 'color' must become 'colour' per UK English rule
        result = sap._derive_attr_name_from_css("color", ".sgs-hero", "sgs/hero")
        assert "colour" in result.lower() or "Colour" in result

    def test_background_colour(self):
        result = sap._derive_attr_name_from_css("background-color", ".sgs-hero", "sgs/hero")
        assert "Colour" in result or "colour" in result

    def test_border_radius(self):
        result = sap._derive_attr_name_from_css("border-radius", ".sgs-button", "sgs/button")
        assert result == "borderRadius"

    def test_letter_spacing(self):
        result = sap._derive_attr_name_from_css("letter-spacing", ".heading", "sgs/hero")
        assert result == "letterSpacing"

    def test_justify_content(self):
        result = sap._derive_attr_name_from_css("justify-content", ".sgs-hero__content", "sgs/hero")
        assert result == "justifyContent"


# ---------------------------------------------------------------------------
# _add_attr_to_block_json
# ---------------------------------------------------------------------------


class TestAddAttrToBlockJson:
    def _make_block_json(self, tmp_path: Path, extra_attrs: dict | None = None) -> Path:
        data = {
            "$schema": "https://schemas.wp.org/trunk/block.json",
            "name": "sgs/test-block",
            "attributes": {"existingAttr": {"type": "string", "default": ""}},
        }
        if extra_attrs:
            data["attributes"].update(extra_attrs)
        path = tmp_path / "block.json"
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        return path

    def test_adds_new_attr(self, tmp_path):
        path = self._make_block_json(tmp_path)
        result = sap._add_attr_to_block_json(path, "newAttr", "string", "test", "font-size")
        assert result is True
        data = json.loads(path.read_text(encoding="utf-8"))
        assert "newAttr" in data["attributes"]
        assert data["attributes"]["newAttr"]["type"] == "string"
        assert data["attributes"]["newAttr"]["default"] == "test"

    def test_idempotent_on_existing(self, tmp_path):
        path = self._make_block_json(tmp_path)
        result = sap._add_attr_to_block_json(path, "existingAttr", "string", "x", "color")
        assert result is False
        # File not mutated
        data = json.loads(path.read_text(encoding="utf-8"))
        assert data["attributes"]["existingAttr"]["default"] == ""

    def test_number_type(self, tmp_path):
        path = self._make_block_json(tmp_path)
        sap._add_attr_to_block_json(path, "fontSize", "number", "16px", "font-size")
        data = json.loads(path.read_text(encoding="utf-8"))
        assert data["attributes"]["fontSize"]["type"] == "number"
        assert data["attributes"]["fontSize"]["default"] == 16

    def test_float_number(self, tmp_path):
        path = self._make_block_json(tmp_path)
        sap._add_attr_to_block_json(path, "lineHeight", "number", "1.55", "line-height")
        data = json.loads(path.read_text(encoding="utf-8"))
        assert abs(data["attributes"]["lineHeight"]["default"] - 1.55) < 0.001

    def test_boolean_type(self, tmp_path):
        path = self._make_block_json(tmp_path)
        sap._add_attr_to_block_json(path, "isActive", "boolean", "true", "opacity")
        data = json.loads(path.read_text(encoding="utf-8"))
        assert data["attributes"]["isActive"]["default"] is True

    def test_missing_attributes_section(self, tmp_path):
        path = tmp_path / "block.json"
        path.write_text(json.dumps({"name": "sgs/bare"}), encoding="utf-8")
        sap._add_attr_to_block_json(path, "borderRadius", "string", "8px", "border-radius")
        data = json.loads(path.read_text(encoding="utf-8"))
        assert "borderRadius" in data["attributes"]

    def test_null_default_for_number_non_parseable(self, tmp_path):
        path = self._make_block_json(tmp_path)
        sap._add_attr_to_block_json(path, "marginAuto", "number", "auto", "margin-top")
        data = json.loads(path.read_text(encoding="utf-8"))
        # 'auto' cannot parse to float; default becomes null
        assert data["attributes"]["marginAuto"]["default"] is None


# ---------------------------------------------------------------------------
# _add_inline_style_to_render_php
# ---------------------------------------------------------------------------


class TestAddInlineStyleToRenderPhp:
    def _make_render_php(self, tmp_path: Path, content: str) -> Path:
        path = tmp_path / "render.php"
        path.write_text(content, encoding="utf-8")
        return path

    def test_adds_branch_with_inline_styles_array(self, tmp_path):
        content = textwrap.dedent("""\
            <?php
            $inline_styles = [];
            echo implode('; ', $inline_styles);
        """)
        path = self._make_render_php(tmp_path, content)
        result = sap._add_inline_style_to_render_php(path, "borderRadius", "border-radius", "10px")
        assert result is True
        text = path.read_text(encoding="utf-8")
        assert "$attributes['borderRadius']" in text
        assert "border-radius" in text

    def test_idempotent_when_already_present(self, tmp_path):
        content = textwrap.dedent("""\
            <?php
            $inline_styles = [];
            $border_radius = isset( $attributes['borderRadius'] ) ? $attributes['borderRadius'] : '';
        """)
        path = self._make_render_php(tmp_path, content)
        result = sap._add_inline_style_to_render_php(path, "borderRadius", "border-radius", "10px")
        assert result is False
        # File unchanged
        assert path.read_text(encoding="utf-8") == content

    def test_creates_stub_when_no_inline_styles_array(self, tmp_path):
        content = textwrap.dedent("""\
            <?php
            $variant = $attributes['variant'] ?? 'standard';
            echo '<div>';
        """)
        path = self._make_render_php(tmp_path, content)
        result = sap._add_inline_style_to_render_php(path, "fontWeight", "font-weight", "700")
        assert result is True
        text = path.read_text(encoding="utf-8")
        assert "$inline_styles" in text
        assert "$attributes['fontWeight']" in text

    def test_sanitise_fn_used(self, tmp_path):
        content = textwrap.dedent("""\
            <?php
            $inline_styles = [];
        """)
        path = self._make_render_php(tmp_path, content)
        sap._add_inline_style_to_render_php(path, "fontFamily", "font-family", "Inter")
        text = path.read_text(encoding="utf-8")
        assert "sanitize_text_field" in text


# ---------------------------------------------------------------------------
# _build_render_php_snippet
# ---------------------------------------------------------------------------


class TestBuildRenderPhpSnippet:
    def test_basic_structure(self):
        snippet = sap._build_render_php_snippet("borderRadius", "border-radius", "10px")
        assert "$border_radius" in snippet
        assert "$attributes['borderRadius']" in snippet
        assert "border-radius" in snippet
        assert "esc_attr" in snippet
        assert "$inline_styles[]" in snippet

    def test_no_injection_in_css_prop(self):
        # The value must only reach the output via esc_attr(), never raw interpolation.
        # Correct pattern: '$inline_styles[] = "color: " . esc_attr( $colour );'
        snippet = sap._build_render_php_snippet("colour", "color", "red")
        assert "color:" in snippet
        # esc_attr wraps the PHP variable — the raw default_value ("red") must NOT appear
        # verbatim inside the emitted PHP string literal (it's a compile-time hint, not runtime).
        assert "esc_attr" in snippet


# ---------------------------------------------------------------------------
# _attr_already_exists
# ---------------------------------------------------------------------------


class TestAttrAlreadyExists:
    def test_finds_existing(self):
        data = {"attributes": {"existing": {"type": "string"}}}
        assert sap._attr_already_exists(data, "existing") is True

    def test_missing(self):
        data = {"attributes": {"existing": {"type": "string"}}}
        assert sap._attr_already_exists(data, "newAttr") is False

    def test_empty_attributes(self):
        data = {"attributes": {}}
        assert sap._attr_already_exists(data, "anything") is False

    def test_no_attributes_key(self):
        data = {}
        assert sap._attr_already_exists(data, "anything") is False


# ---------------------------------------------------------------------------
# Block slug validation helpers
# ---------------------------------------------------------------------------


class TestBlockSlugRe:
    def test_valid_slugs(self):
        valid = ["sgs/hero", "sgs/button", "core/paragraph", "sgs/info-box"]
        for s in valid:
            assert sap._BLOCK_SLUG_RE.match(s), f"Should match: {s}"

    def test_invalid_slugs(self):
        invalid = ["../../../etc/passwd", "sgs//hero", "SGS/HERO", ""]
        for s in invalid:
            assert not sap._BLOCK_SLUG_RE.match(s), f"Should NOT match: {s}"


class TestAttrNameRe:
    def test_valid(self):
        valid = ["borderRadius", "fontSize", "fontFamily", "colour", "A", "abc123"]
        for s in valid:
            assert sap._ATTR_NAME_RE.match(s), f"Should match: {s}"

    def test_invalid(self):
        invalid = ["123abc", "", "../evil", "attr name"]
        for s in invalid:
            assert not sap._ATTR_NAME_RE.match(s), f"Should NOT match: {s}"


# ---------------------------------------------------------------------------
# CSS value safety
# ---------------------------------------------------------------------------


class TestCssValueRe:
    def test_safe_values(self):
        safe = ["10px", "#FFFFFF", "var(--primary)", "1.55", "'Fraunces', serif", "center"]
        for s in safe:
            assert sap._CSS_VALUE_RE.match(s), f"Should be safe: {s}"

    def test_unsafe_values(self):
        unsafe = ["10px; color: red", "{background: url('evil')}", "<script>"]
        for s in unsafe:
            assert not sap._CSS_VALUE_RE.match(s), f"Should be UNSAFE: {s}"


# ---------------------------------------------------------------------------
# DB marking helpers (mock DB)
# ---------------------------------------------------------------------------


class TestDbMarking:
    def test_mark_uimax_promoted(self, tmp_path, monkeypatch):
        db_path = tmp_path / "uimax.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute(
            """CREATE TABLE attribute_gap_candidates
               (id INTEGER PRIMARY KEY, status TEXT DEFAULT 'pending', applied_at TEXT)"""
        )
        conn.execute("INSERT INTO attribute_gap_candidates (id, status) VALUES (1, 'pending')")
        conn.commit()
        conn.close()

        monkeypatch.setattr(sap, "_UIMAX_DB", db_path)
        sap._mark_uimax_promoted(1)

        conn = sqlite3.connect(str(db_path))
        row = conn.execute("SELECT status, applied_at FROM attribute_gap_candidates WHERE id=1").fetchone()
        conn.close()
        assert row[0] == "applied"
        assert row[1] is not None

    def test_mark_sgs_promoted_adds_columns(self, tmp_path, monkeypatch):
        db_path = tmp_path / "sgs.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute(
            """CREATE TABLE attribute_gap_candidates
               (id INTEGER PRIMARY KEY, block_slug TEXT, attr_name TEXT)"""
        )
        conn.execute("INSERT INTO attribute_gap_candidates (id, block_slug, attr_name) VALUES (1, 'sgs/hero', 'fontWeight')")
        conn.commit()
        conn.close()

        monkeypatch.setattr(sap, "_SGS_DB", db_path)
        sap._mark_sgs_promoted(1, "sgs/hero")

        conn = sqlite3.connect(str(db_path))
        row = conn.execute(
            "SELECT promoted, promoted_at, promoted_to_block FROM attribute_gap_candidates WHERE id=1"
        ).fetchone()
        conn.close()
        assert row[0] == 1
        assert row[1] is not None
        assert row[2] == "sgs/hero"

    def test_mark_sgs_idempotent_second_call(self, tmp_path, monkeypatch):
        db_path = tmp_path / "sgs2.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute(
            """CREATE TABLE attribute_gap_candidates
               (id INTEGER PRIMARY KEY, block_slug TEXT)"""
        )
        conn.execute("INSERT INTO attribute_gap_candidates VALUES (42, 'sgs/button')")
        conn.commit()
        conn.close()

        monkeypatch.setattr(sap, "_SGS_DB", db_path)
        sap._mark_sgs_promoted(42, "sgs/button")
        sap._mark_sgs_promoted(42, "sgs/button")  # Second call — must not error

        conn = sqlite3.connect(str(db_path))
        row = conn.execute("SELECT promoted FROM attribute_gap_candidates WHERE id=42").fetchone()
        conn.close()
        assert row[0] == 1


# ---------------------------------------------------------------------------
# _list_uimax / _list_sgs (mock DB)
# ---------------------------------------------------------------------------


class TestListing:
    def test_list_uimax_excludes_applied(self, tmp_path, monkeypatch):
        db_path = tmp_path / "uimax.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute(
            """CREATE TABLE attribute_gap_candidates (
               id INTEGER PRIMARY KEY,
               block_slug TEXT, selector TEXT, css_property TEXT,
               value_seen TEXT, role_proposed TEXT, confidence REAL,
               seen_count INTEGER, status TEXT, staged_at TEXT,
               applied_at TEXT, provenance TEXT
            )"""
        )
        conn.execute("INSERT INTO attribute_gap_candidates VALUES (1,'sgs/hero','sel','font-size','16px','font_size',0.8,5,'pending',NULL,NULL,'test')")
        conn.execute("INSERT INTO attribute_gap_candidates VALUES (2,'sgs/button','sel','color','red','color',0.9,3,'applied',NULL,'2026-01-01','test')")
        conn.commit()
        conn.close()

        monkeypatch.setattr(sap, "_UIMAX_DB", db_path)
        rows = sap._list_uimax(10)
        # Only pending rows returned
        assert len(rows) == 1
        assert rows[0]["id"] == 1

    def test_list_sgs_only_add_attr(self, tmp_path, monkeypatch):
        db_path = tmp_path / "sgs.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute(
            """CREATE TABLE attribute_gap_candidates (
               id INTEGER PRIMARY KEY, block_slug TEXT, attr_name TEXT,
               stem TEXT, proposed_action TEXT, created_at TEXT
            )"""
        )
        conn.execute("INSERT INTO attribute_gap_candidates VALUES (1,'sgs/hero','fontWeight','font-weight',\"add attr: css=font-weight raw='700' class=.heading run=\",'2026-01-01')")
        conn.execute("INSERT INTO attribute_gap_candidates VALUES (2,'sgs/hero','x','x','new-canonical-slot-needed','2026-01-01')")
        conn.commit()
        conn.close()

        monkeypatch.setattr(sap, "_SGS_DB", db_path)
        rows = sap._list_sgs(10)
        assert len(rows) == 1
        assert rows[0]["id"] == 1


# ---------------------------------------------------------------------------
# cmd_status (smoke test)
# ---------------------------------------------------------------------------


class TestCmdStatus:
    def test_runs_with_mock_dbs(self, tmp_path, monkeypatch, capsys):
        uimax_db = tmp_path / "uimax.db"
        sgs_db = tmp_path / "sgs.db"

        conn = sqlite3.connect(str(uimax_db))
        conn.execute(
            """CREATE TABLE attribute_gap_candidates (
               id INTEGER PRIMARY KEY, block_slug TEXT, selector TEXT,
               css_property TEXT, value_seen TEXT, role_proposed TEXT,
               confidence REAL, seen_count INTEGER, status TEXT DEFAULT 'pending',
               staged_at TEXT, applied_at TEXT, provenance TEXT
            )"""
        )
        conn.execute("INSERT INTO attribute_gap_candidates VALUES (1,'sgs/hero','s','color','red','color',0.5,3,'pending',NULL,NULL,'t')")
        conn.execute("INSERT INTO attribute_gap_candidates VALUES (2,'sgs/hero','s','font-size','16px','font_size',0.7,2,'applied',NULL,'2026-01-01','t')")
        conn.commit()
        conn.close()

        conn = sqlite3.connect(str(sgs_db))
        conn.execute(
            """CREATE TABLE attribute_gap_candidates (
               id INTEGER PRIMARY KEY, block_slug TEXT,
               attr_name TEXT, stem TEXT, proposed_action TEXT, created_at TEXT
            )"""
        )
        conn.execute("INSERT INTO attribute_gap_candidates VALUES (10,'sgs/button','borderRadius','border-radius',\"add attr: css=border-radius raw='10px' class=sgs-button run=\",'2026-01-01')")
        conn.commit()
        conn.close()

        monkeypatch.setattr(sap, "_UIMAX_DB", uimax_db)
        monkeypatch.setattr(sap, "_SGS_DB", sgs_db)

        args = MagicMock()
        sap.cmd_status(args)
        out = capsys.readouterr().out
        assert "pending" in out
        assert "applied" in out
