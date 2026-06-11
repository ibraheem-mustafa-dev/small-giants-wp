"""Grid-awareness fold gate — _grid_item_areas + the widened FR-22-4.1 gate.

Captured 2026-06-11 (D207 root cause → D208 design gate, Bean-approved).

Pre-fix: `fold_eligible = len(element_children) == 1` meant a grid parent with
TWO named grid items (hero: __content + __media, areas "media"/"content") never
dissolved __content — it emitted as a nested BEM-classed sgs/container (the
double-nesting) and the FR-22-5.3 cross-node routing inside the fold branch
never fired (dropped contentPadding*).

Fix (ROUTING-CATEGORISATION-DESIGN §Grid awareness / Principle B): the parent's
OWN `display:grid` + `grid-template-areas` name its grid items; a slug-None
child whose BEM element token matches an area name dissolves regardless of
sibling count. The sole-child count gate is PRESERVED for non-grid parents
(brand b5 +44pp column-collapse evidence).
"""
import unittest

from bs4 import BeautifulSoup

from convert import _grid_item_areas


def _tag(html: str, selector_tag: str = "section"):
    return BeautifulSoup(html, "html.parser").find(selector_tag)


class TestGridItemAreas(unittest.TestCase):
    """_grid_item_areas — detection + parsing across breakpoint tiers."""

    def test_hero_canonical_base_grid_with_areas(self):
        """The hero shape: display:grid + stacked areas at base."""
        node = _tag('<section class="sgs-hero"></section>')
        css = {
            ".sgs-hero": {
                "display": "grid",
                "grid-template-areas": '"media" "content"',
            },
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset({"media", "content"}))

    def test_areas_only_in_media_tier(self):
        """Mobile-first draft: grid + areas declared only inside a @media tier."""
        node = _tag('<section class="sgs-hero"></section>')
        css = {
            ".sgs-hero": {"padding": "20px"},
            "@media (min-width: 1280px)::.sgs-hero": {
                "display": "grid",
                "grid-template-areas": '"content media"',
            },
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset({"content", "media"}))

    def test_union_across_tiers(self):
        """Area names union across base + tiers (same names → same set)."""
        node = _tag('<section class="sgs-hero"></section>')
        css = {
            ".sgs-hero": {
                "display": "grid",
                "grid-template-areas": '"media" "content"',
            },
            "@media (min-width: 1280px)::.sgs-hero": {
                "grid-template-areas": '"content media"',
            },
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset({"media", "content"}))

    def test_no_grid_returns_empty(self):
        """No display:grid anywhere → empty (count gate stays in charge)."""
        node = _tag('<section class="sgs-brand"></section>')
        css = {
            ".sgs-brand": {
                "display": "flex",
                "grid-template-areas": '"a b"',  # nonsensical without grid — ignored
            },
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset())

    def test_grid_without_areas_returns_empty(self):
        """display:grid but NO grid-template-areas → empty set (positional grids
        keep current behaviour; G1 positional fallback owns them)."""
        node = _tag('<div class="sgs-products"></div>', "div")
        css = {
            ".sgs-products": {
                "display": "grid",
                "grid-template-columns": "repeat(3, 1fr)",
            },
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset())

    def test_null_cell_token_ignored(self):
        """`.` (null cell) is never an area name."""
        node = _tag('<section class="sgs-x"></section>')
        css = {
            ".sgs-x": {
                "display": "grid",
                "grid-template-areas": '"media ." ". content"',
            },
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset({"media", "content"}))

    def test_none_value_ignored(self):
        """grid-template-areas:none → empty."""
        node = _tag('<section class="sgs-x"></section>')
        css = {
            ".sgs-x": {"display": "grid", "grid-template-areas": "none"},
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset())

    def test_important_stripped(self):
        """!important on either property does not break detection."""
        node = _tag('<section class="sgs-hero"></section>')
        css = {
            ".sgs-hero": {
                "display": "grid !important",
                "grid-template-areas": '"media" "content" !important',
            },
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset({"media", "content"}))

    def test_names_lowercased(self):
        """Area names are case-normalised for BEM-token matching."""
        node = _tag('<section class="sgs-hero"></section>')
        css = {
            ".sgs-hero": {
                "display": "grid",
                "grid-template-areas": '"Media" "CONTENT"',
            },
        }
        self.assertEqual(_grid_item_areas(node, css), frozenset({"media", "content"}))


if __name__ == "__main__":
    unittest.main()
