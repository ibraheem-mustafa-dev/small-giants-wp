"""Generates archive-product.tree.json: Eye Care's shop page (the site's own copy of the archive-product
template), built with scripts/wp-build-page.js --template archive-product.
Mirrors the theme template's working structure (sgs-shop-layout grid, #sgs-shop-filters aside, the drawer toggle and
header the theme's sgs-shop-filters.js drives, the filter group headings it makes collapsible) with the draft's
filters (Eye Care Birmingham.dc.html, sgs-shop-layout) and the task 1 listing card."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'archive-product.tree.json')

# Attribute IDs on eye-care-test (wc_get_attribute_taxonomies, 2026-09-25).
ATTR = {'colour': 2, 'shape': 3, 'material': 4, 'frame-type': 5, 'hinge': 6, 'nose-pad': 7, 'frame-size': 8}


def B(name, attrs=None, inner=None):
    d = {"name": name, "attributes": attrs or {}}
    if inner:
        d["innerBlocks"] = inner
    return d


def group_heading(text):
    return B("sgs/heading", {"content": text, "level": "h3", "className": "sgs-shop-filters__group-heading",
                             "fontSize": {"desktop": 12}, "fontSizeUnit": "px", "fontWeight": "400",
                             "letterSpacing": {"desktop": 0.18}, "letterSpacingUnit": "em",
                             "textTransform": "uppercase"})


def attribute_filter(label, slug, style):
    display = "woocommerce/product-filter-chips" if style == "chips" else "woocommerce/product-filter-checkbox-list"
    return [group_heading(label),
            B("woocommerce/product-filter-attribute", {"attributeId": ATTR[slug],
                                                       "queryType": "or", "displayStyle": display, "showCounts": True},
              [B(display)])]


def taxonomy_filter(label, taxonomy, style):
    display = "woocommerce/product-filter-chips" if style == "chips" else "woocommerce/product-filter-checkbox-list"
    return [group_heading(label),
            B("woocommerce/product-filter-taxonomy", {"taxonomy": taxonomy, "displayStyle": display, "showCounts": True},
              [B(display)])]


CARD = dict(
    sourceMode="wc-product", showRating=True, noReviewsText="No reviews yet", showSavingBadge=True,
    savingBadgePosition="bottom-left", showBrandOverlay=True, brandFontFamily="heading", brandFontWeight="500",
    brandFontSize={"desktop": 12.5}, brandFontSizeUnit="px", brandLetterSpacing={"desktop": 0.26},
    brandLetterSpacingUnit="em", showPickers=False, showDescription=False, showCta=False, showWishlist=True,
    rrpMetaKey="_sgs_rrp", swatchMaxVisible=4, imageAspectRatio="1 / 1", showShadow=False,
    borderRadius={"desktop": {"topLeft": "0px", "topRight": "0px", "bottomLeft": "0px", "bottomRight": "0px"}},
    cardPadding={"top": "16px", "right": "16px", "bottom": "18px", "left": "16px"},
    titleFontFamily="body", titleFontSize={"desktop": 16}, titleFontSizeUnit="px", titleFontWeight="400",
    titleLineHeight=1.25, priceFontFamily="body", priceFontSize={"desktop": 18}, priceFontSizeUnit="px",
    priceFontWeight="500", showAttributeTag=True, attributeTagSource="tag", attributeTagTerm="polarised",
    attributeTagText="Polarised")

# The Filter button and the panel header are built by the theme's sgs-shop-filters.js (WordPress 7.1 saves an
# editor-made Custom HTML block empty, so the template carries no raw HTML).

filters = [
    B("woocommerce/product-filter-active", {},
      [B("woocommerce/product-filter-removable-chips"),
       B("woocommerce/product-filter-clear-button", {}, [B("sgs/button", {"label": "Clear all filters",
                                                                         "className": "wp-block-button__link"})])]),
    *attribute_filter("Colour", "colour", "chips"),
    group_heading("Price"),
    B("woocommerce/product-filter-price", {},
      [B("woocommerce/product-filter-price-slider")]),
    *taxonomy_filter("Brand", "product_brand", "list"),
    *attribute_filter("Style", "shape", "chips"),
    *attribute_filter("Material", "material", "list"),
    *attribute_filter("Frame type", "frame-type", "list"),
    *attribute_filter("Hinge", "hinge", "list"),
    *attribute_filter("Nose pads", "nose-pad", "list"),
    *taxonomy_filter("Lenses", "product_tag", "chips"),
]

tree = [
    B("core/template-part", {"slug": "header", "tagName": "header"}),
    B("sgs/container", {"tagName": "main", "anchor": "main", "contentWidth": {"desktop": "full"}}, [
        B("sgs/container", {
            "maxWidth": {"desktop": "1440px"},
            "padding": {"desktop": {"top": "48px", "right": "52px", "bottom": "90px", "left": "52px"},
                        "mobile": {"top": "28px", "right": "20px", "bottom": "60px", "left": "20px"}}}, [
            B("sgs/text", {"text": "Shop", "fontSize": {"desktop": 12}, "fontSizeUnit": "px",
                           "letterSpacing": {"desktop": 0.24}, "letterSpacingUnit": "em", "textTransform": "uppercase",
                           "textColour": "accent-text", "margin": {"desktop": {"bottom": "10px"}}}),
            B("core/query-title", {"type": "archive", "level": 1, "showPrefix": False,
                                   "style": {"typography": {"fontSize": "46px", "fontWeight": "500",
                                                            "lineHeight": "1.02"}},
                                   "fontFamily": "heading"}),
            B("sgs/container", {"tagName": "div", "className": "sgs-shop-layout", "contentWidth": {"desktop": "full"},
                                "margin": {"desktop": {"top": "28px"}}}, [
                B("sgs/container", {"tagName": "aside", "anchor": "sgs-shop-filters", "className": "sgs-shop-filters"}, [
                    B("woocommerce/product-filters", {"style": {"spacing": {"padding": {"top": "0", "bottom": "0"}}}},
                      filters),
                ]),
                B("woocommerce/product-collection", {
                    "queryId": 0, "query": {"inherit": True, "perPage": 24, "isProductCollectionBlock": True},
                    "tagName": "div", "displayLayout": {"type": "flex", "columns": 3, "shrinkColumns": True},
                    "queryContextIncludes": ["collection"]}, [
                    B("sgs/container", {"tagName": "div", "className": "sgs-shop-toolbar", "layout": "flex",
                                        "justifyContent": "space-between", "alignItems": "center",
                                        "flexWrap": "wrap", "contentWidth": {"desktop": "full"},
                                        "margin": {"desktop": {"bottom": "18px"}}}, [
                        B("woocommerce/product-results-count"),
                        B("woocommerce/catalog-sorting"),
                    ]),
                    B("woocommerce/product-template", {}, [B("sgs/product-card", dict(CARD))]),
                    B("core/query-pagination", {"layout": {"type": "flex", "justifyContent": "center"}}, [
                        B("core/query-pagination-previous"), B("core/query-pagination-numbers"),
                        B("core/query-pagination-next")]),
                    B("woocommerce/product-collection-no-results", {}, [
                        B("sgs/text", {"text": "Nothing matches all of that. Loosen a filter, or message me and I'll see what I can find.",
                                       "textAlign": "center"})]),
                ]),
            ]),
            B("sgs/text", {"text": "Every pair is genuine, bought through the brands' authorised UK suppliers, and comes boxed with its own case and cloth. Prescription lenses can go in any of them.",
                           "fontSize": {"desktop": 13}, "fontSizeUnit": "px", "textColour": "text-label",
                           "margin": {"desktop": {"top": "28px"}}}),
        ]),
    ]),
    B("core/template-part", {"slug": "footer", "tagName": "footer"}),
]

with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(tree, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print('wrote', OUT)
