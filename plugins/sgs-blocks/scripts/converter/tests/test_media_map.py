"""test_media_map.py — W3 Step 8 (A1) media-map loader + Mechanism B threading.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_media_map.py -q --import-mode=importlib
"""
from __future__ import annotations

import json
import pathlib

import pytest
from bs4 import BeautifulSoup

from converter.context import Recognition, ScalarLift
from converter.services.media_map import load_media_map
from converter.services.extraction import run_mechanism_b


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node(html: str):
    """Parse a minimal HTML snippet and return the first real element."""
    return BeautifulSoup(html, "html.parser").find(True)


def _stub_rec(slug: str, has_inner_blocks: int = 1) -> Recognition:
    """Build a minimal Recognition for Mechanism B testing (mirrors test_extraction.py)."""
    return Recognition(
        kind="named",
        slug=slug,
        container_kind="section",
        has_inner_blocks=has_inner_blocks,
    )


# ---------------------------------------------------------------------------
# test_load_media_map
# ---------------------------------------------------------------------------


def test_load_media_map_none_returns_empty():
    """load_media_map(None) must return {} — safe no-op when no path given."""
    assert load_media_map(None) == {}


def test_load_media_map_missing_file_returns_empty(tmp_path):
    """load_media_map with a non-existent path must return {} (no crash)."""
    missing = str(tmp_path / "does_not_exist.json")
    assert load_media_map(missing) == {}


def test_load_media_map_parses_real_file(tmp_path):
    """load_media_map must return the parsed dict for a real JSON media-map file."""
    data = {
        "hero.jpg": {"url": "https://wp.example/wp-content/uploads/hero.jpg", "id": 7, "alt": "x"},
        "logo.png": {"url": "https://wp.example/wp-content/uploads/logo.png", "id": 12, "alt": "Logo"},
    }
    map_file = tmp_path / "media-map.json"
    map_file.write_text(json.dumps(data), encoding="utf-8")

    result = load_media_map(str(map_file))
    assert result == data


def test_load_media_map_empty_file_returns_empty(tmp_path):
    """load_media_map with an empty JSON object must return {}."""
    map_file = tmp_path / "empty.json"
    map_file.write_text("{}", encoding="utf-8")
    assert load_media_map(str(map_file)) == {}


# ---------------------------------------------------------------------------
# test_mech_b_media_map_threading — splitImage remap
# ---------------------------------------------------------------------------


def test_mech_b_media_map_remaps_split_image(monkeypatch):
    """Mechanism B must thread media_map into scalar_media_from_img so the
    splitImage src is remapped to the WP URL when a matching basename entry
    exists in the map.

    Monkeypatches (mirrors existing test_mech_b_scalar_media_column_emits_scalar_lift):
      - is_class_section_block → True  (activates composite-interior path)
      - scalar_media_attr_for(slug, 'split-image') → 'splitImage'
      - breakpoint_suffix_rules → minimal Mobile/Desktop pair
    """
    import orchestrator.converter_v2.db_lookup as db

    monkeypatch.setattr(db, "is_class_section_block", lambda s: True)
    monkeypatch.setattr(
        db, "scalar_media_attr_for",
        lambda slug, elem: "splitImage" if elem == "split-image" else None,
    )
    monkeypatch.setattr(
        db, "breakpoint_suffix_rules",
        lambda: [("Mobile", ["Mobile"]), ("Desktop", ["Desktop"])],
    )

    html = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <img src="/mockup/hero.jpg" alt="Hero" />'
        '  </div>'
        '</section>'
    )
    root = _node(html)
    rec = _stub_rec("sgs/hero")

    media_map = {
        "hero.jpg": {
            "url": "https://wp.example/wp-content/uploads/hero.jpg",
            "id": 7,
            "alt": "x",
        }
    }

    results = run_mechanism_b(rec, root, media_map=media_map)

    scalar_lifts = [r for r in results if isinstance(r, ScalarLift)]
    assert scalar_lifts, f"Expected ScalarLift from scalar-media column, got: {results}"
    lift = scalar_lifts[0]
    assert lift.attr == "splitImage", f"Expected attr='splitImage', got {lift.attr!r}"
    assert isinstance(lift.value, dict), f"Expected dict value, got {type(lift.value)}"
    assert lift.value.get("url") == "https://wp.example/wp-content/uploads/hero.jpg", (
        f"Expected WP URL, got {lift.value!r} — media_map threading failed"
    )


def test_mech_b_no_media_map_keeps_mockup_src(monkeypatch):
    """Mechanism B with no media_map (or empty map) must leave the mockup src
    unchanged — faithful Spec 31 §3.B1 no-op (gap tracking is a separate step)."""
    import orchestrator.converter_v2.db_lookup as db

    monkeypatch.setattr(db, "is_class_section_block", lambda s: True)
    monkeypatch.setattr(
        db, "scalar_media_attr_for",
        lambda slug, elem: "splitImage" if elem == "split-image" else None,
    )
    monkeypatch.setattr(
        db, "breakpoint_suffix_rules",
        lambda: [("Mobile", ["Mobile"]), ("Desktop", ["Desktop"])],
    )

    html = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <img src="/mockup/hero.jpg" alt="Hero" />'
        '  </div>'
        '</section>'
    )
    root = _node(html)
    rec = _stub_rec("sgs/hero")

    # Case A: media_map omitted (defaults to None)
    results_none = run_mechanism_b(rec, root)
    lifts_none = [r for r in results_none if isinstance(r, ScalarLift)]
    assert lifts_none, f"Expected ScalarLift even with no media_map: {results_none}"
    assert lifts_none[0].value.get("url") == "/mockup/hero.jpg", (
        f"Expected original mockup src on None map, got {lifts_none[0].value!r}"
    )

    # Case B: media_map explicitly empty
    results_empty = run_mechanism_b(rec, root, media_map={})
    lifts_empty = [r for r in results_empty if isinstance(r, ScalarLift)]
    assert lifts_empty, f"Expected ScalarLift even with empty media_map: {results_empty}"
    assert lifts_empty[0].value.get("url") == "/mockup/hero.jpg", (
        f"Expected original mockup src on empty map, got {lifts_empty[0].value!r}"
    )
