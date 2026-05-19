"""Regression test for RC-4: grouped CSS selector bug fix.

Tests that _collect_css_decls_for_element correctly handles grouped selectors
like `h1, h2, h3 { font-family: Fraunces; }` by checking if ANY part of the
comma-separated list matches the target element.
"""
import unittest
from bs4 import Tag
from convert import _collect_css_decls_for_element


class TestGroupedSelectorMatching(unittest.TestCase):
    """Regression suite for RC-4 grouped selector bug."""

    def _make_tag(self, tag_name, classes=None, style=""):
        """Create a BeautifulSoup Tag for testing."""
        tag = Tag(name=tag_name)
        if classes:
            tag["class"] = classes
        if style:
            tag["style"] = style
        return tag

    def test_grouped_selector_matches_first_element(self):
        """h1, h2, h3 { font-family: Fraunces; } should match <h1>."""
        h1_tag = self._make_tag("h1")
        css_rules = {
            "h1, h2, h3": {"font-family": "Fraunces"},
        }
        base_decls, _ = _collect_css_decls_for_element(h1_tag, css_rules)
        self.assertEqual(base_decls.get("font-family"), "Fraunces",
                         "Grouped selector should match first element in group")

    def test_grouped_selector_matches_middle_element(self):
        """h1, h2, h3 { font-family: Fraunces; } should match <h2>."""
        h2_tag = self._make_tag("h2")
        css_rules = {
            "h1, h2, h3": {"font-family": "Fraunces"},
        }
        base_decls, _ = _collect_css_decls_for_element(h2_tag, css_rules)
        self.assertEqual(base_decls.get("font-family"), "Fraunces",
                         "Grouped selector should match middle element in group")

    def test_grouped_selector_matches_last_element(self):
        """h1, h2, h3 { font-family: Fraunces; } should match <h3>."""
        h3_tag = self._make_tag("h3")
        css_rules = {
            "h1, h2, h3": {"font-family": "Fraunces"},
        }
        base_decls, _ = _collect_css_decls_for_element(h3_tag, css_rules)
        self.assertEqual(base_decls.get("font-family"), "Fraunces",
                         "Grouped selector should match last element in group")

    def test_grouped_selector_does_not_match_unrelated(self):
        """h1, h2, h3 { font-family: Fraunces; } should NOT match <p>."""
        p_tag = self._make_tag("p")
        css_rules = {
            "h1, h2, h3": {"font-family": "Fraunces"},
        }
        base_decls, _ = _collect_css_decls_for_element(p_tag, css_rules)
        self.assertNotIn("font-family", base_decls,
                         "Grouped selector should not match unrelated element")

    def test_single_selector_still_works(self):
        """h1 { color: red; } should still work (regression check)."""
        h1_tag = self._make_tag("h1")
        css_rules = {
            "h1": {"color": "red"},
        }
        base_decls, _ = _collect_css_decls_for_element(h1_tag, css_rules)
        self.assertEqual(base_decls.get("color"), "red",
                         "Single selector should still work")

    def test_grouped_selector_with_classes(self):
        """.hero__title, .card__title { font-size: 2rem; } should match matching classes."""
        title_tag = self._make_tag("div", classes=["hero__title"])
        css_rules = {
            ".hero__title, .card__title": {"font-size": "2rem"},
        }
        base_decls, _ = _collect_css_decls_for_element(title_tag, css_rules)
        self.assertEqual(base_decls.get("font-size"), "2rem",
                         "Grouped class selector should match element with matching class")

    def test_grouped_selector_with_media_query(self):
        """@media (min-width: 768px):: h1, h2, h3 { font-size: 3rem; } should work."""
        h1_tag = self._make_tag("h1")
        css_rules = {
            "@media (min-width: 768px):: h1, h2, h3": {"font-size": "3rem"},
        }
        _, bp_decls = _collect_css_decls_for_element(h1_tag, css_rules)
        # Media queries go into bp_decls, not base_decls
        self.assertTrue(bp_decls, "Media query should be routed to breakpoint bucket")
        self.assertIn("font-size", str(bp_decls),
                      "Grouped selector with media query should apply font-size to breakpoint")

    def test_whitespace_handling_in_grouped_selectors(self):
        """Grouped selectors with extra whitespace should work: 'h1  ,  h2  ,  h3'."""
        h2_tag = self._make_tag("h2")
        css_rules = {
            "h1  ,  h2  ,  h3": {"color": "blue"},
        }
        base_decls, _ = _collect_css_decls_for_element(h2_tag, css_rules)
        self.assertEqual(base_decls.get("color"), "blue",
                         "Grouped selector with extra whitespace should still match")


if __name__ == "__main__":
    unittest.main()
