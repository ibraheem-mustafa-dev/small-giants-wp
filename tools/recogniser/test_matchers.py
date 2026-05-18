"""Unit tests for the Phase 2A selector-family matcher extensions.

Covers the four new SGS-BEM selector families added to the fingerprint
catalogue and body-class detector:

  1. .sgs-responsive-logo* -> sgs/responsive-logo
  2. .sgs-icon*            -> sgs/icon  (rebuilt Phase 2A attrs)
  3. .sgs-timeline*        -> sgs/timeline
  4. body.sgs-header-behaviour-* -> sgs_header_rules WP option rule dict

Tests are intentionally free of client-specific slugs or section names
(anti-cheat binding rule). All fixture HTML is synthetic.

Run:
    python -m pytest tools/recogniser/test_matchers.py -v
  or
    python tools/recogniser/test_matchers.py
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

# Ensure the recogniser package is importable when run from any cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from section_detector import detect_body_header_behaviour, _VALID_HEADER_BEHAVIOURS


# ---------------------------------------------------------------------------
# Fingerprint catalogue helpers
# ---------------------------------------------------------------------------

def _load_fingerprints() -> dict:
    fp = Path(__file__).resolve().parent / "data" / "fingerprints.json"
    with fp.open(encoding="utf-8") as fh:
        return json.load(fh)


def _has_class_match(fingerprint: dict, css_class: str) -> bool:
    """Return True if *css_class* is listed in required_html_pattern.class_includes_any."""
    pattern = fingerprint.get("required_html_pattern") or {}
    includes = pattern.get("class_includes_any") or []
    return css_class in includes


# ---------------------------------------------------------------------------
# 1. sgs/responsive-logo
# ---------------------------------------------------------------------------

class TestResponsiveLogoFingerprint(unittest.TestCase):
    """sgs/responsive-logo is registered in fingerprints.json with correct
    class names and attr_extractors targeting the alt and width slots."""

    def setUp(self):
        self.fps = _load_fingerprints()
        self.entry = self.fps.get("sgs/responsive-logo")

    def test_entry_exists(self):
        self.assertIsNotNone(
            self.entry,
            "sgs/responsive-logo must be present in fingerprints.json",
        )

    def test_block_name_field(self):
        self.assertEqual(self.entry["block_name"], "sgs/responsive-logo")

    def test_source_is_sgs(self):
        self.assertEqual(self.entry["source"], "sgs")

    def test_class_sgs_responsive_logo_matches(self):
        self.assertTrue(
            _has_class_match(self.entry, "sgs-responsive-logo"),
            "sgs-responsive-logo must be in class_includes_any",
        )

    def test_class_wp_block_sgs_responsive_logo_matches(self):
        self.assertTrue(
            _has_class_match(self.entry, "wp-block-sgs-responsive-logo"),
            "wp-block-sgs-responsive-logo must be in class_includes_any",
        )

    def test_has_attr_extractors(self):
        extractors = self.entry.get("attr_extractors") or []
        self.assertTrue(len(extractors) > 0, "attr_extractors must not be empty")

    def test_alt_extractor_present(self):
        extractors = self.entry.get("attr_extractors") or []
        attrs = [e["attr"] for e in extractors]
        self.assertIn("alt", attrs, "alt extractor must be listed for sgs/responsive-logo")

    def test_width_extractor_present(self):
        extractors = self.entry.get("attr_extractors") or []
        attrs = [e["attr"] for e in extractors]
        self.assertIn("width", attrs, "width extractor must be listed for sgs/responsive-logo")


# ---------------------------------------------------------------------------
# 2. sgs/icon (Phase 2A rebuilt attrs)
# ---------------------------------------------------------------------------

class TestIconFingerprint(unittest.TestCase):
    """sgs/icon is registered with Phase 2A attr_extractors (iconName,
    iconSource, ariaLabel, linkUrl, linkTarget, emojiChar)."""

    def setUp(self):
        self.fps = _load_fingerprints()
        self.entry = self.fps.get("sgs/icon")

    def test_entry_exists(self):
        self.assertIsNotNone(self.entry, "sgs/icon must be present in fingerprints.json")

    def test_block_name_field(self):
        self.assertEqual(self.entry["block_name"], "sgs/icon")

    def test_class_sgs_icon_matches(self):
        self.assertTrue(
            _has_class_match(self.entry, "sgs-icon"),
            "sgs-icon must be in class_includes_any",
        )

    def test_class_wp_block_sgs_icon_matches(self):
        self.assertTrue(
            _has_class_match(self.entry, "wp-block-sgs-icon"),
            "wp-block-sgs-icon must be in class_includes_any",
        )

    def test_icon_name_extractor_present(self):
        extractors = self.entry.get("attr_extractors") or []
        attrs = [e["attr"] for e in extractors]
        self.assertIn("iconName", attrs, "iconName extractor must be listed for sgs/icon")

    def test_icon_source_extractor_present(self):
        extractors = self.entry.get("attr_extractors") or []
        attrs = [e["attr"] for e in extractors]
        self.assertIn("iconSource", attrs, "iconSource extractor must be listed for sgs/icon")

    def test_aria_label_extractor_present(self):
        extractors = self.entry.get("attr_extractors") or []
        attrs = [e["attr"] for e in extractors]
        self.assertIn("ariaLabel", attrs, "ariaLabel extractor must be listed for sgs/icon")

    def test_link_url_extractor_present(self):
        extractors = self.entry.get("attr_extractors") or []
        attrs = [e["attr"] for e in extractors]
        self.assertIn("linkUrl", attrs, "linkUrl extractor must be listed for sgs/icon")

    def test_not_pointing_to_retired_icon_block(self):
        # sgs/icon-block is the RETIRED block; sgs/icon is the current one.
        self.assertNotEqual(
            self.entry.get("block_name"), "sgs/icon-block",
            "sgs/icon entry must not reference the retired sgs/icon-block slug",
        )

    def test_has_hover_optional_feature(self):
        optional = self.entry.get("optional_features") or []
        self.assertIn("hover", optional, "hover must be listed as an optional feature for sgs/icon")

    def test_has_colour_optional_feature(self):
        optional = self.entry.get("optional_features") or []
        self.assertIn("colour", optional, "colour must be listed as an optional feature for sgs/icon")


# ---------------------------------------------------------------------------
# 3. sgs/timeline
# ---------------------------------------------------------------------------

class TestTimelineFingerprint(unittest.TestCase):
    """sgs/timeline is registered with class names and an entries extractor."""

    def setUp(self):
        self.fps = _load_fingerprints()
        self.entry = self.fps.get("sgs/timeline")

    def test_entry_exists(self):
        self.assertIsNotNone(self.entry, "sgs/timeline must be present in fingerprints.json")

    def test_block_name_field(self):
        self.assertEqual(self.entry["block_name"], "sgs/timeline")

    def test_class_sgs_timeline_matches(self):
        self.assertTrue(
            _has_class_match(self.entry, "sgs-timeline"),
            "sgs-timeline must be in class_includes_any",
        )

    def test_class_wp_block_sgs_timeline_matches(self):
        self.assertTrue(
            _has_class_match(self.entry, "wp-block-sgs-timeline"),
            "wp-block-sgs-timeline must be in class_includes_any",
        )

    def test_has_attr_extractors(self):
        extractors = self.entry.get("attr_extractors") or []
        self.assertTrue(len(extractors) > 0, "attr_extractors must not be empty for sgs/timeline")

    def test_entries_extractor_present(self):
        extractors = self.entry.get("attr_extractors") or []
        attrs = [e["attr"] for e in extractors]
        self.assertIn("entries", attrs, "entries extractor must be listed for sgs/timeline")


# ---------------------------------------------------------------------------
# 4. body.sgs-header-behaviour-* -> sgs_header_rules
# ---------------------------------------------------------------------------

class TestBodyHeaderBehaviourDetection(unittest.TestCase):
    """detect_body_header_behaviour() returns a rule dict for each valid
    VALID_BEHAVIOURS slug and None for absent / unrecognised classes."""

    # --- sticky ---

    def test_sticky_returns_rule_dict(self):
        html = '<html><body class="sgs-header-behaviour-sticky"></body></html>'
        result = detect_body_header_behaviour(html)
        self.assertIsNotNone(result)
        self.assertEqual(result["behaviour"], "sticky")

    def test_sticky_scope_is_all(self):
        html = '<html><body class="sgs-header-behaviour-sticky"></body></html>'
        result = detect_body_header_behaviour(html)
        self.assertEqual(result["scope"], "all")

    def test_sticky_source_is_mockup_body_class(self):
        html = '<html><body class="sgs-header-behaviour-sticky"></body></html>'
        result = detect_body_header_behaviour(html)
        self.assertEqual(result["source"], "mockup-body-class")

    # --- transparent ---

    def test_transparent_returns_rule_dict(self):
        html = '<html><body class="sgs-has-header sgs-header-behaviour-transparent page-home"></body></html>'
        result = detect_body_header_behaviour(html)
        self.assertIsNotNone(result)
        self.assertEqual(result["behaviour"], "transparent")

    # --- hide-on-scroll-down ---

    def test_hide_on_scroll_down_returns_rule_dict(self):
        html = '<html><body class="sgs-header-behaviour-hide-on-scroll-down"></body></html>'
        result = detect_body_header_behaviour(html)
        self.assertIsNotNone(result)
        self.assertEqual(result["behaviour"], "hide-on-scroll-down")

    # --- absent / unrecognised ---

    def test_no_behaviour_class_returns_none(self):
        html = '<html><body class="sgs-has-header home"></body></html>'
        result = detect_body_header_behaviour(html)
        self.assertIsNone(result, "No behaviour class should return None")

    def test_unrecognised_slug_returns_none(self):
        # "floating" is NOT in VALID_BEHAVIOURS.
        html = '<html><body class="sgs-header-behaviour-floating"></body></html>'
        result = detect_body_header_behaviour(html)
        self.assertIsNone(result, "Unrecognised behaviour slug must return None")

    def test_no_body_tag_returns_none(self):
        html = '<div class="sgs-header-behaviour-sticky">no body</div>'
        result = detect_body_header_behaviour(html)
        self.assertIsNone(result)

    def test_only_first_valid_slug_returned(self):
        # Multiple valid classes: only one should be returned.
        html = (
            '<html><body class="sgs-header-behaviour-sticky '
            'sgs-header-behaviour-transparent"></body></html>'
        )
        result = detect_body_header_behaviour(html)
        self.assertIsNotNone(result)
        self.assertIn(result["behaviour"], _VALID_HEADER_BEHAVIOURS)

    def test_valid_behaviours_constant_matches_php_class(self):
        """_VALID_HEADER_BEHAVIOURS must cover exactly the slugs declared in
        Sgs_Header_Behaviours::VALID_BEHAVIOURS PHP constant."""
        expected = {"transparent", "sticky", "hide-on-scroll-down"}
        self.assertEqual(
            _VALID_HEADER_BEHAVIOURS,
            expected,
            "_VALID_HEADER_BEHAVIOURS must match Sgs_Header_Behaviours::VALID_BEHAVIOURS",
        )

    # --- idempotency ---

    def test_idempotent_sticky(self):
        html = '<html><body class="sgs-header-behaviour-sticky"></body></html>'
        r1 = detect_body_header_behaviour(html)
        r2 = detect_body_header_behaviour(html)
        self.assertEqual(r1, r2, "detect_body_header_behaviour must be idempotent")

    def test_idempotent_none(self):
        html = '<html><body class="sgs-has-header"></body></html>'
        r1 = detect_body_header_behaviour(html)
        r2 = detect_body_header_behaviour(html)
        self.assertEqual(r1, r2)


# ---------------------------------------------------------------------------
# 5. Catalogue integrity — all four selector families present
# ---------------------------------------------------------------------------

class TestCatalogueIntegrity(unittest.TestCase):
    """Smoke tests confirming all Phase 2A blocks are registered and the
    retired sgs/icon-block entry has NOT been removed (it may still be in
    the wild on pages that have not been migrated)."""

    def setUp(self):
        self.fps = _load_fingerprints()

    def test_responsive_logo_in_catalogue(self):
        self.assertIn("sgs/responsive-logo", self.fps)

    def test_icon_in_catalogue(self):
        self.assertIn("sgs/icon", self.fps)

    def test_timeline_in_catalogue(self):
        self.assertIn("sgs/timeline", self.fps)

    def test_icon_block_still_in_catalogue(self):
        # sgs/icon-block is retired but must remain so old documents can still
        # be recognised and migrated.
        self.assertIn(
            "sgs/icon-block", self.fps,
            "sgs/icon-block must remain in catalogue for backward-compatible matching",
        )

    def test_no_client_slug_in_selectors(self):
        """No fingerprint entry should hardcode a client-specific slug.
        Catches anti-cheat violations — selectors must be generic."""
        blocked = {"indus-foods", "mamas-munches", "helping-doctors",
                   "eye-care", "mosque", "construction"}
        for block_name, entry in self.fps.items():
            for extractor in entry.get("attr_extractors") or []:
                sel = extractor.get("selector", "")
                for slug in blocked:
                    self.assertNotIn(
                        slug, sel,
                        f"Client slug '{slug}' found in {block_name} selector: {sel}",
                    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.TestLoader().loadTestsFromModule(
        sys.modules[__name__]
    ))
    sys.exit(0 if result.wasSuccessful() else 1)
