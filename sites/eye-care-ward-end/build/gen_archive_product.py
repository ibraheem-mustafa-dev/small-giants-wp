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
ATTR = {'colour': 2, 'shape': 3, 'material': 4, 'frame-type': 5, 'hinge': 6, 'nose-pad': 7, 'frame-size': 8,
        'gender': 9, 'size': 10}  # gender and size: woo-seed/seed-facets.php, 2026-09-26


def B(name, attrs=None, inner=None):
    d = {"name": name, "attributes": attrs or {}}
    if inner:
        d["innerBlocks"] = inner
    return d


def group_heading(text, looks=""):
    # looks: the theme's per-group classes (sgs-filter-open, sgs-filter-count, sgs-filter-swatches, sgs-filter-segmented).
    return B("sgs/heading", {"content": text, "level": "h3",
                             "className": ("sgs-shop-filters__group-heading " + looks).strip(),
                             "fontSize": {"desktop": 12}, "fontSizeUnit": "px", "fontWeight": "400",
                             "letterSpacing": {"desktop": 0.18}, "letterSpacingUnit": "em",
                             "textTransform": "uppercase"})


def attribute_filter(label, slug, style, looks="", counts=True, order="", keep_empty=False):
    # counts: False drops the "(5)" after each option (the draft's Style chips carry none).
    # keep_empty: True keeps options with no matching products once a filter is chosen (the draft's swatches).
    # order: "menu_order-asc" lists terms in their set order (woo-seed/seed-facets.php) instead of WooCommerce's
    # default, most products first.
    display = "woocommerce/product-filter-chips" if style == "chips" else "woocommerce/product-filter-checkbox-list"
    return [group_heading(label, looks),
            B("woocommerce/product-filter-attribute", {"attributeId": ATTR[slug],
                                                       "queryType": "or", "displayStyle": display, "showCounts": counts,
                                                       **({"sortOrder": order} if order else {}),
                                                       **({"hideEmpty": False} if keep_empty else {})},
              [B(display)])]


def taxonomy_filter(label, taxonomy, style, looks="", search=""):
    # search: a placeholder puts the sgs/filter-search box above the options (Spec 30 FR-30-6).
    display = "woocommerce/product-filter-chips" if style == "chips" else "woocommerce/product-filter-checkbox-list"
    inner = [B(display)]
    if search:
        inner.insert(0, B("sgs/filter-search", {"taxonomy": taxonomy, "placeholder": search, "threshold": 2}))
    return [group_heading(label, looks),
            B("woocommerce/product-filter-taxonomy", {"taxonomy": taxonomy, "displayStyle": display, "showCounts": True},
              inner)]


CARD = dict(
    # The name wraps as the draft's, not balanced (the theme balances every heading): "Oversized Cat-" / "Eye".
    # "PHOTO TO COME" as the draft's label (10.5px, 0.16em spaced capitals) on a product showing the shop's
    # placeholder image, in text-muted (Bean 2026-09-28); the price row 6px further from the rating line.
    noImageLabel="Photo to come", noImageLabelFontSize={"desktop": 10.5}, noImageLabelFontSizeUnit="px",
    noImageLabelFontWeight="400", noImageLabelLetterSpacing={"desktop": 0.16}, noImageLabelLetterSpacingUnit="em",
    noImageLabelTextTransform="uppercase", priceRowSpaceAbove="6px",
    sourceMode="wc-product", titleTextWrap="wrap", showRating=True, noReviewsText="No reviews yet", showSavingBadge=True,
    savingBadgePosition="bottom-left", showBrandOverlay=True, brandFontFamily="heading", brandFontWeight="500",
    brandFontSize={"desktop": 12.5}, brandFontSizeUnit="px", brandLetterSpacing={"desktop": 0.26},
    brandLetterSpacingUnit="em", showPickers=False, showDescription=False, showCta=False, showWishlist=True,
    rrpMetaKey="_sgs_rrp", swatchMaxVisible=4, imageAspectRatio="1 / 1", showShadow=False,
    borderRadius={"desktop": {"topLeft": "0px", "topRight": "0px", "bottomLeft": "0px", "bottomRight": "0px"}},
    cardPadding={"top": "16px", "right": "16px", "bottom": "18px", "left": "16px"},
    titleFontFamily="body", titleFontSize={"desktop": 16}, titleFontSizeUnit="px", titleFontWeight="400",
    titleLineHeight=1.25, priceFontFamily="body", priceFontSize={"desktop": 18}, priceFontSizeUnit="px",
    priceFontWeight="500", showAttributeTag=True, attributeTagSource="tag", attributeTagTerm="polarised",
    attributeTagText="Polarised", attributeTagFontWeight="400", attributeTagBorderColour="border-strong",
    # The draft's card hover: 4px lift over 0.4s, a soft 18/44 shadow, the photo to 106% over 0.9s, border #CFC7BB.
    sgsHoverLift=4, sgsHoverDurationMs=400, sgsHoverShadow="diffuse", sgsHoverImageZoom=True, sgsHoverZoom=106,
    sgsHoverZoomDuration=900, borderColourHover="border-hover",
    # The draft's scroll-in: each card fades up as it comes into view, a row cascading (its 460ms, 26px, 70ms
    # steps; the framework's nearest motion tokens are 500ms, 30px and 100ms).
    sgsAnimation="fade-up", sgsAnimationDuration="slow", sgsAnimationEasing="ease-out", sgsAnimationDistance="30",
    # Card text parts: price 18/27, RRP in text-label, 17px colour dots growing to 125% when pointed at.
    priceLineHeight=27, priceLineHeightUnit="px", rrpColour="text-label", swatchSize=17, swatchHoverGrow=125,
    # The draft's photo fill, dot and heart rings, and the brand overlay's 12/14 padding.
    mediaBackgroundColour="surface-stage", swatchBorderColour="border-strong", wishlistBorderColour="#E0DAD1",
    brandPadding={"top": "12px", "right": "14px", "bottom": "12px", "left": "14px"})

# The Filter button and the panel header are built by the theme's sgs-shop-filters.js (WordPress 7.1 saves an
# editor-made Custom HTML block empty, so the template carries no raw HTML).

filters = [
    B("woocommerce/product-filter-active", {},
      [B("woocommerce/product-filter-removable-chips"),
       B("woocommerce/product-filter-clear-button", {}, [B("sgs/button", {"label": "Clear all",
                                                                         "className": "wp-block-button__link"})])]),
    # The draft's order and open state; "Polarised only" is the theme's toggle (apply_shop_settings.py).
    *attribute_filter("Gender", "gender", "chips", "sgs-filter-open sgs-filter-segmented", order="menu_order-asc"),
    *attribute_filter("Size", "size", "chips", order="menu_order-asc"),
    *attribute_filter("Colour", "colour", "chips", "sgs-filter-open sgs-filter-swatches", order="menu_order-asc",
                     keep_empty=True),
    group_heading("Price", "sgs-filter-open"),
    B("woocommerce/product-filter-price", {},
      # The prices as small plain text under the track, like the draft's "£59 ... £339".
      [B("woocommerce/product-filter-price-slider", {"showInputFields": False})]),
    *taxonomy_filter("Brand", "product_brand", "list", "sgs-filter-open sgs-filter-count", "Search brands"),
    *attribute_filter("Style", "shape", "chips", "sgs-filter-open sgs-filter-count", counts=False,
                     order="menu_order-asc"),
    *attribute_filter("Material", "material", "list"),
    *attribute_filter("Frame type", "frame-type", "list"),
    *attribute_filter("Hinge", "hinge", "list"),
    *attribute_filter("Nose pads", "nose-pad", "list"),
]

tree = [
    B("core/template-part", {"slug": "header", "tagName": "header"}),
    B("sgs/container", {"tagName": "main", "anchor": "main", "contentWidth": {"desktop": "full"}}, [
        B("sgs/container", {
            "maxWidth": {"desktop": "1440px"},
            "padding": {"desktop": {"top": "48px", "right": "52px", "bottom": "90px", "left": "52px"},
                        "mobile": {"top": "28px", "right": "20px", "bottom": "60px", "left": "20px"}}}, [
            # The title row ends 24px above a hairline in the border colour (the draft's, measured at every width).
            B("sgs/container", {"tagName": "div", "className": "sgs-shop-toolbar", "layout": "flex",
                                "justifyContent": "space-between", "alignItems": "flex-end", "flexWrap": "wrap",
                                "gap": {"desktop": "16px"}, "contentWidth": {"desktop": "full"},
                                "padding": {"desktop": {"bottom": "24px"}},
                                "borderWidth": {"top": "0px", "right": "0px", "bottom": "1px", "left": "0px"},
                                "borderStyle": "solid", "borderColour": "border"}, [
                B("sgs/container", {"tagName": "div", "contentWidth": {"desktop": "full"}}, [
                    B("sgs/text", {"text": "Shop", "fontSize": {"desktop": 12}, "fontSizeUnit": "px",
                                   "letterSpacing": {"desktop": 0.24}, "letterSpacingUnit": "em",
                                   "textTransform": "uppercase", "textColour": "accent-text",
                                   "margin": {"desktop": {"bottom": "10px"}}}),
                    B("core/query-title", {"type": "archive", "level": 1, "showPrefix": False,
                                           # The draft's 48px from 768 up and 34px at 375, as one clamp (WordPress would
                                           # otherwise scale a fixed 48px down fluidly from 1440).
                                           "style": {"typography": {"fontSize": "clamp(34px, 20.64px + 3.562vw, 48px)",
                                                                    "fontWeight": "500", "lineHeight": "1"}},
                                           "fontFamily": "heading"}),
                ]),
                B("sgs/container", {"tagName": "div", "layout": "flex", "alignItems": "center",
                                    "gap": {"desktop": "12px"}, "contentWidth": {"desktop": "full"}}, [
                    B("woocommerce/product-results-count", {"textColor": "text-subtle",
                                                            "style": {"typography": {"fontSize": "13.5px"}}}),
                    B("woocommerce/catalog-sorting"),
                ]),
            ]),
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
                    B("woocommerce/product-template", {}, [B("sgs/product-card", dict(CARD))]),
                    B("core/query-pagination", {"layout": {"type": "flex", "justifyContent": "center"}}, [
                        B("core/query-pagination-previous"), B("core/query-pagination-numbers"),
                        B("core/query-pagination-next")]),
                    B("woocommerce/product-collection-no-results", {}, [
                        B("sgs/text", {"text": "Nothing matches all of that. Loosen a filter, or message me and I'll see what I can find.",
                                       "textAlign": "center"})]),
                    # The note under the products, in the products column as the draft's (it starts at the grid's left).
                    B("sgs/text", {"text": "Every pair is genuine, bought through the brands' authorised UK suppliers, and comes boxed with its own case and cloth. Prescription lenses can go in any of them.",
                                   "fontSize": {"desktop": 13}, "fontSizeUnit": "px", "textColour": "text-label",
                                   "margin": {"desktop": {"top": "28px"}}}),
                ]),
            ]),
        ]),
    ]),
    B("core/template-part", {"slug": "footer", "tagName": "footer"}),
]

with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(tree, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print('wrote', OUT)
