"""
test_assign_canonical_regressions.py
====================================
Regression tests for helper functions in behavioural-analyser/assign-canonical.py.

Covers:
  - detect_role_from_block_json: description keywords match whole words only
  - peel_property_suffix: a suffix is peeled only at a camelCase join
  - _singularise: only "-sses" words lose their "es"
  - load_slot_aliases: a canonical slot name is never overwritten by an alias
  - _TIER_B_BEM_ELEMENT_RE: a BEM modifier is not part of the element name

UK English throughout.
Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_assign_canonical_regressions.py -q
"""

from __future__ import annotations

import importlib.util
import sqlite3
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[4]
_MODULE_PATH = (
    _REPO_ROOT
    / "plugins"
    / "sgs-blocks"
    / "scripts"
    / "behavioural-analyser"
    / "assign-canonical.py"
)

_spec = importlib.util.spec_from_file_location("assign_canonical", _MODULE_PATH)
assert _spec is not None and _spec.loader is not None
assign_canonical = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(assign_canonical)


# ---------------------------------------------------------------------------
# detect_role_from_block_json — whole-word description matching
# ---------------------------------------------------------------------------

class TestDescriptionWordBoundaries:
    def test_keyword_inside_longer_word_does_not_match(self) -> None:
        """'the text' must not match inside 'the textTransform'."""
        role, _, _ = assign_canonical.detect_role_from_block_json(
            "sgs/heading",
            "transform",
            {"description": "Controls the textTransform of the box"},
        )
        assert role is None

    def test_whole_keyword_still_matches(self) -> None:
        role, source, confidence = assign_canonical.detect_role_from_block_json(
            "sgs/heading",
            "copy",
            {"description": "Controls the text of the button"},
        )
        assert role == "text-content"
        assert source == "description_substring:'the text'"
        assert confidence == "low"

    def test_plural_keyword_still_matches(self) -> None:
        role, _, _ = assign_canonical.detect_role_from_block_json(
            "sgs/gallery",
            "copy",
            {"description": "Sets the links shown under the logo"},
        )
        assert role == "link-href"


# ---------------------------------------------------------------------------
# peel_property_suffix — camelCase join only
# ---------------------------------------------------------------------------

_SUFFIXES = {
    "Text": {"role": "text-content", "css_property": None},
    "Width": {"role": "visual", "css_property": "width"},
    "BorderRadius": {"role": "visual", "css_property": "border-radius"},
    "Color": {"role": "color", "css_property": "color"},
}


class TestPropertySuffixBoundary:
    def test_lowercase_join_is_not_peeled(self) -> None:
        stem, suffix, info = assign_canonical.peel_property_suffix("context", _SUFFIXES)
        assert (stem, suffix, info) == ("context", None, None)

    def test_lowercase_join_bandwidth_is_not_peeled(self) -> None:
        stem, suffix, info = assign_canonical.peel_property_suffix("bandwidth", _SUFFIXES)
        assert (stem, suffix) == ("bandwidth", None)

    def test_camel_case_join_is_peeled(self) -> None:
        stem, suffix, info = assign_canonical.peel_property_suffix("backgroundColor", _SUFFIXES)
        assert (stem, suffix) == ("background", "Color")
        assert info is not None and info["role"] == "color"

    def test_camel_case_border_radius_is_peeled(self) -> None:
        stem, suffix, _ = assign_canonical.peel_property_suffix("borderRadius", _SUFFIXES)
        assert (stem, suffix) == ("", "BorderRadius")

    def test_bare_suffix_word_is_peeled(self) -> None:
        stem, suffix, info = assign_canonical.peel_property_suffix("Text", _SUFFIXES)
        assert (stem, suffix) == ("", "Text")
        assert info is not None


# ---------------------------------------------------------------------------
# _singularise — only "-sses" words lose their "es"
# ---------------------------------------------------------------------------

class TestSingularise:
    @pytest.mark.parametrize(
        ("plural", "singular"),
        [
            ("addresses", "address"),
            ("classes", "class"),
            ("courses", "course"),
            ("cases", "case"),
            ("responses", "response"),
            ("phases", "phase"),
            ("testimonials", "testimonial"),
            ("logos", "logo"),
            ("entries", "entry"),
            ("process", "process"),
        ],
    )
    def test_singular_form(self, plural: str, singular: str) -> None:
        assert assign_canonical._singularise(plural) == singular


# ---------------------------------------------------------------------------
# load_slot_aliases — canonical names win over aliases
# ---------------------------------------------------------------------------

def _slots_db(rows: list[tuple[str, str]]) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE slots (slot_name TEXT, scope TEXT, aliases TEXT)")
    conn.executemany(
        "INSERT INTO slots (slot_name, scope, aliases) VALUES (?, 'element', ?)",
        rows,
    )
    return conn


class TestSlotAliasPrecedence:
    def test_canonical_name_not_clobbered_by_earlier_alias(self) -> None:
        """'gallery' (alias 'media') is read before the 'media' row."""
        conn = _slots_db([("gallery", '["media"]'), ("media", "[]")])
        mapping = assign_canonical.load_slot_aliases(conn)
        assert mapping["media"]["canonical_slot"] == "media"
        assert mapping["gallery"]["canonical_slot"] == "gallery"

    def test_canonical_name_not_clobbered_when_alias_comes_last(self) -> None:
        conn = _slots_db([("media", "[]"), ("gallery", '["media"]')])
        mapping = assign_canonical.load_slot_aliases(conn)
        assert mapping["media"]["canonical_slot"] == "media"

    def test_alias_still_resolves_to_its_canonical(self) -> None:
        conn = _slots_db([("heading", '["headline"]'), ("text", "[]")])
        mapping = assign_canonical.load_slot_aliases(conn)
        assert mapping["headline"]["canonical_slot"] == "heading"


# ---------------------------------------------------------------------------
# _TIER_B_BEM_ELEMENT_RE — element stops before a BEM modifier
# ---------------------------------------------------------------------------

class TestBemElementExtractor:
    def test_modifier_is_not_part_of_element(self) -> None:
        match = assign_canonical._get_bem_regex().search(".sgs-hero__headline--large")
        assert match is not None and match.group(1) == "headline"

    def test_plain_element_still_matches(self) -> None:
        match = assign_canonical._get_bem_regex().search(".sgs-product-card__image")
        assert match is not None and match.group(1) == "image"

    def test_hyphenated_element_is_kept_whole(self) -> None:
        match = assign_canonical._get_bem_regex().search(".sgs-card__image-wrap--tall")
        assert match is not None and match.group(1) == "image-wrap"

    def test_no_element_returns_no_match(self) -> None:
        assert assign_canonical._get_bem_regex().search("figure > a") is None
