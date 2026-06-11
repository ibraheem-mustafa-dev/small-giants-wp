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


class TestExpandBoxShorthand(unittest.TestCase):
    """_expand_box_shorthand — CSS 1-4 value expansion, paren-aware."""

    def test_three_value(self):
        from convert import _expand_box_shorthand
        out = _expand_box_shorthand({"padding": "28px 20px 40px"}, "padding")
        self.assertEqual(out, {"padding-top": "28px", "padding-right": "20px",
                               "padding-bottom": "40px", "padding-left": "20px"})

    def test_two_value(self):
        from convert import _expand_box_shorthand
        out = _expand_box_shorthand({"padding": "56px 48px"}, "padding")
        self.assertEqual(out["padding-top"], "56px")
        self.assertEqual(out["padding-left"], "48px")

    def test_one_and_four(self):
        from convert import _expand_box_shorthand
        self.assertEqual(_expand_box_shorthand({"padding": "8px"}, "padding")["padding-left"], "8px")
        out = _expand_box_shorthand({"padding": "1px 2px 3px 4px"}, "padding")
        self.assertEqual((out["padding-top"], out["padding-right"], out["padding-bottom"], out["padding-left"]),
                         ("1px", "2px", "3px", "4px"))

    def test_calc_var_paren_aware(self):
        from convert import _expand_box_shorthand
        out = _expand_box_shorthand({"padding": "calc(1px + 2px) var(--x, 3px)"}, "padding")
        self.assertEqual(out["padding-top"], "calc(1px + 2px)")
        self.assertEqual(out["padding-right"], "var(--x, 3px)")

    def test_existing_longhand_wins(self):
        from convert import _expand_box_shorthand
        out = _expand_box_shorthand({"padding": "8px", "padding-top": "99px"}, "padding")
        self.assertEqual(out["padding-top"], "99px")  # longhand is more specific

    def test_no_shorthand_noop(self):
        from convert import _expand_box_shorthand
        d = {"margin-top": "4px"}
        self.assertEqual(_expand_box_shorthand(d, "padding"), d)


class TestAttrForAreaProperty(unittest.TestCase):
    """db.attr_for_area_property — real-DB per-area resolution (the hero)."""

    def test_hero_content_padding(self):
        import db_lookup as db
        self.assertEqual(db.attr_for_area_property("sgs/hero", "content", "padding-top"),
                         "contentPaddingTop")

    def test_hero_media_padding(self):
        import db_lookup as db
        self.assertEqual(db.attr_for_area_property("sgs/hero", "media", "padding-top"),
                         "mediaPaddingTop")

    def test_miss_returns_none(self):
        import db_lookup as db
        self.assertIsNone(db.attr_for_area_property("sgs/hero", "zzz", "padding-top"))
        self.assertIsNone(db.attr_for_area_property("sgs/hero", "content", "flex-direction"))


class TestRouteAreaCssEndToEnd(unittest.TestCase):
    """_route_area_css_to_block_attrs — final attr VALUES + TYPES (qc finding 4)."""

    def _run(self, css):
        from convert import _route_area_css_to_block_attrs
        node = _tag('<div class="sgs-hero__content"></div>', "div")
        attrs = {}
        _route_area_css_to_block_attrs(node, "content", "sgs/hero", attrs, css)
        return attrs

    def test_hero_three_tier_numbers_and_unit(self):
        attrs = self._run({
            ".sgs-hero__content": {"padding": "28px 20px 40px"},
            "@media (min-width: 768px)::.sgs-hero__content": {"padding": "56px 48px"},
            "@media (min-width: 1280px)::.sgs-hero__content": {"padding": "72px 64px"},
        })
        # base attr = desktop (72/64); Tablet = 56/48; Mobile = draft base 28/20/40/20
        self.assertEqual(attrs["contentPaddingTop"], 72)
        self.assertEqual(attrs["contentPaddingRight"], 64)
        self.assertEqual(attrs["contentPaddingTopTablet"], 56)
        self.assertEqual(attrs["contentPaddingLeftTablet"], 48)
        self.assertEqual(attrs["contentPaddingTopMobile"], 28)
        self.assertEqual(attrs["contentPaddingBottomMobile"], 40)
        self.assertEqual(attrs["contentPaddingUnit"], "px")
        for k, v in attrs.items():
            if k.startswith("contentPadding") and k != "contentPaddingUnit":
                self.assertIsInstance(v, (int, float), f"{k} must be numeric, got {type(v)}")

    def test_rem_unit_captured_not_truncated(self):
        attrs = self._run({".sgs-hero__content": {"padding-top": "1.5rem"}})
        self.assertEqual(attrs["contentPaddingTopMobile"], 1.5)
        self.assertEqual(attrs["contentPaddingUnit"], "rem")

    def test_calc_unrepresentable_in_number_attr_dropped_flagged(self):
        attrs = self._run({".sgs-hero__content": {"padding-top": "calc(1px + 2vw)"}})
        self.assertNotIn("contentPaddingTopMobile", attrs)  # gap-candidate, not corruption

    def test_width_family_excluded_no_collision(self):
        attrs = self._run({".sgs-hero__content": {"width": "50%", "max-width": "600px"}})
        self.assertNotIn("contentWidth", attrs)  # collision guard (qc finding 3)

    def test_tablet_only_draft_inherits_to_desktop(self):
        attrs = self._run({
            ".sgs-hero__content": {"padding-top": "10px"},
            "@media (min-width: 768px)::.sgs-hero__content": {"padding-top": "30px"},
        })
        self.assertEqual(attrs["contentPaddingTop"], 30)        # desktop inherits @768
        self.assertEqual(attrs["contentPaddingTopTablet"], 30)
        self.assertEqual(attrs["contentPaddingTopMobile"], 10)
