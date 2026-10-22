"""
test_theme_extractor_g2_regressions.py
======================================
Regression tests for theme-extractor (typography, token_map, palette, declared_sources) and business_info.shapes.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_theme_extractor_g2_regressions.py -q
"""

from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_SCRIPTS / "theme-extractor"))
sys.path.insert(0, str(_SCRIPTS))

import declared_sources  # noqa: E402
import palette  # noqa: E402
import token_map  # noqa: E402
import typography  # noqa: E402
from business_info import shapes  # noqa: E402


def test_unitless_line_height_is_returned_as_the_ratio():
    assert typography._ratio("1.5", "16px", 16) == 1.5
    assert typography._ratio("24px", "16px", 16) == 1.5


def test_root_token_map_ignores_attribute_variants_of_root():
    css = ":root{--bg:#fff} :root[data-theme=dark]{--bg:#000} :root, html{--fg:#111}"
    tokens = token_map.build_draft_root_token_map(css)
    assert tokens["bg"] == "#fff"
    assert tokens["fg"] == "#111"


def test_primary_nav_selector_is_not_the_primary_button():
    facts = {"buttons": [{"classes": ["sgs-button--primary"], "rest": {"backgroundColor": "rgb(255, 0, 0)"}}]}
    rules = [
        (".primary-nav", "background", "var(--navy)", False, 0),
        (".sgs-button--primary", "background", "var(--coral)", False, 1),
    ]
    measured = palette._measured_token_values({}, rules, facts)
    assert "navy" not in measured
    assert measured["coral"] == "#ff0000"


def test_thousands_separator_in_max_width_is_kept_whole():
    layout: dict = {}
    declared_sources._layout_fact("Max content width", "1,200px", layout)
    assert layout["max_content_width"] == "1200px"
    layout = {}
    declared_sources._layout_fact("Max content width", "1200px", layout)
    assert layout["max_content_width"] == "1200px"


def test_hours_range_wrapping_the_week_expands():
    out = shapes.hours_fields("Sat-Mon 9.30-17.30")
    assert set(out) == {"opening_hours.sat", "opening_hours.sun", "opening_hours.mon"}
    assert shapes.hours_fields("Mon-Wed 9-5").keys() == {"opening_hours.mon", "opening_hours.tue", "opening_hours.wed"}
