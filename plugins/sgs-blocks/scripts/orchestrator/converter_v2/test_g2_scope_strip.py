"""Regression test for G2 — .page-id-N scope prefix must not block CSS selector match.

Captured 2026-05-20 by honest-path council (Rater C pipeline forensics).
Fix: unconditional re.sub(r"^\.page-id-\d+\s+", "", individual_sel) at top of
per-selector loop in _collect_css_decls_for_element.

Pre-fix: variation CSS emitted by css_router.py (P1.B.x) scopes D2 rules
with `.page-id-N` for cascade isolation. cv2's matcher worked on bare BEM
selectors and silently returned "no value extracted" for 142/171 hero slots
+ 14/15 trust-bar slots.

See specs/common-wp-styling-errors.md §U + specs/16 §14.2.
"""
import unittest

from bs4 import BeautifulSoup, Tag

from convert import _collect_css_decls_for_element


def _make_tag(tag_name: str, classes: list[str] | None = None,
              style: str = "", parent_classes: list[str] | None = None) -> Tag:
    """Create a BeautifulSoup Tag, optionally nested inside a parent."""
    if parent_classes:
        html = (
            f'<div class="{" ".join(parent_classes)}">'
            f'<{tag_name}'
            + (f' class="{" ".join(classes)}"' if classes else "")
            + (f' style="{style}"' if style else "")
            + f"></{tag_name}></div>"
        )
        soup = BeautifulSoup(html, "html.parser")
        return soup.find(tag_name)
    html = (
        f'<{tag_name}'
        + (f' class="{" ".join(classes)}"' if classes else "")
        + (f' style="{style}"' if style else "")
        + f"></{tag_name}>"
    )
    return BeautifulSoup(html, "html.parser").find(tag_name)


class TestG2PageIdScopeStrip(unittest.TestCase):
    """G2 — .page-id-N scope prefix stripped before selector matching."""

    def test_scoped_direct_class_match(self):
        """G2 core case: .page-id-144 .sgs-hero__sub must match <div class="sgs-hero__sub">."""
        node = _make_tag("div", classes=["sgs-hero__sub"])
        css_rules = {
            ".page-id-144 .sgs-hero__sub": {"color": "#FF0000"},
        }
        base, _bp = _collect_css_decls_for_element(node, css_rules)
        self.assertEqual(
            base.get("color"), "#FF0000",
            f"Scoped rule .page-id-144 .sgs-hero__sub must match after strip; got base={base!r}",
        )

    def test_scoped_descendant_tag_match(self):
        """G2 parent+tag case: .page-id-144 .sgs-hero__content h1 must match <h1> inside .sgs-hero__content."""
        node = _make_tag("h1", parent_classes=["sgs-hero__content"])
        css_rules = {
            ".page-id-144 .sgs-hero__content h1": {"font-size": "58px"},
        }
        base, _bp = _collect_css_decls_for_element(node, css_rules)
        self.assertEqual(
            base.get("font-size"), "58px",
            f"Scoped parent+tag rule must match after prefix strip; got base={base!r}",
        )

    def test_scoped_grouped_selector(self):
        """G2 grouped: .page-id-144 .sgs-hero__sub, .page-id-144 .sgs-hero__label must match."""
        node = _make_tag("div", classes=["sgs-hero__label"])
        css_rules = {
            ".page-id-144 .sgs-hero__sub, .page-id-144 .sgs-hero__label": {
                "font-size": "14px",
            },
        }
        base, _bp = _collect_css_decls_for_element(node, css_rules)
        self.assertEqual(
            base.get("font-size"), "14px",
            f"Scoped grouped selector must match second group member after strip; got base={base!r}",
        )

    def test_unscoped_selector_still_matches(self):
        """G2 idempotent: unscoped .sgs-hero__sub must still match (no regression)."""
        node = _make_tag("div", classes=["sgs-hero__sub"])
        css_rules = {
            ".sgs-hero__sub": {"color": "#00FF00"},
        }
        base, _bp = _collect_css_decls_for_element(node, css_rules)
        self.assertEqual(
            base.get("color"), "#00FF00",
            f"Unscoped selector must still match after no-op strip; got base={base!r}",
        )

    def test_scoped_rule_with_media_query(self):
        """G2 media: @media :: .page-id-144 .sgs-hero__sub must match at breakpoint."""
        node = _make_tag("div", classes=["sgs-hero__sub"])
        css_rules = {
            "@media (min-width: 768px) :: .page-id-144 .sgs-hero__sub": {
                "font-size": "18px",
            },
        }
        _base, bp = _collect_css_decls_for_element(node, css_rules)
        has_font_size = any(
            "font-size" in decls for decls in bp.values()
        )
        self.assertTrue(
            has_font_size,
            f"Scoped media rule must match after strip; bp_decls={bp!r}",
        )

    def test_non_hero_scoped_rule_does_not_cross_match(self):
        """G2 boundary: .page-id-144 .sgs-brand__headline must NOT match .sgs-hero__sub."""
        node = _make_tag("div", classes=["sgs-hero__sub"])
        css_rules = {
            ".page-id-144 .sgs-brand__headline": {"color": "#ABCDEF"},
        }
        base, _bp = _collect_css_decls_for_element(node, css_rules)
        self.assertNotIn(
            "color", base,
            f"Cross-section scoped rule must not match wrong element; got base={base!r}",
        )

    def test_scoped_rule_with_different_page_id(self):
        """G2 idempotent across page IDs: .page-id-999 .sgs-hero__sub must still match."""
        node = _make_tag("div", classes=["sgs-hero__sub"])
        css_rules = {
            ".page-id-999 .sgs-hero__sub": {"color": "#CCCCCC"},
        }
        base, _bp = _collect_css_decls_for_element(node, css_rules)
        self.assertEqual(
            base.get("color"), "#CCCCCC",
            f"Any page-id-N prefix must be stripped regardless of N; got base={base!r}",
        )


if __name__ == "__main__":
    unittest.main()
