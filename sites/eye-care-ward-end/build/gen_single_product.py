"""Generates single-product.tree.json: Eye Care's product page (the site's own copy of the
single-product template), built with scripts/wp-build-page.js --template single-product.
Values come from the draft (Eye Care Birmingham.dc.html, sections sgs-breadcrumb to sgs-product-similar)."""
import json
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'single-product.tree.json')


def B(name, attrs=None, inner=None):
    d = {"name": name, "attributes": attrs or {}}
    if inner:
        d["innerBlocks"] = inner
    return d


def bind(attr, key, **args):
    a = {"key": key}
    a.update(args)
    return {"bindings": {attr: {"source": "sgs-product/field", "args": a}}}


def txt(text, **kw):
    return B("sgs/text", dict(text=text, **kw))


def btxt(key, extra=None, **kw):
    a = dict(text="", **kw)
    a["metadata"] = bind("text", key, **(extra or {}))
    return B("sgs/text", a)


BOX = {"top": "1px", "right": "1px", "bottom": "1px", "left": "1px"}
LABEL = dict(fontSize={"desktop": 11}, fontSizeUnit="px", letterSpacing={"desktop": 0.16}, letterSpacingUnit="em",
             textTransform="uppercase", textColour="text-label")
H2 = dict(level="h2", fontFamily="heading", fontWeight="500", fontSize={"desktop": 30}, fontSizeUnit="px")
SECTION_GAP = {"desktop": {"top": "84px"}, "mobile": {"top": "56px"}}

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


def collection(taxonomy, query_id):
    return B("woocommerce/product-collection", {
        "queryId": query_id,
        "query": {"perPage": 4, "pages": 1, "offset": 0, "postType": "product", "order": "asc", "orderBy": "title",
                  "search": "", "exclude": [], "inherit": False, "taxQuery": {}, "isProductCollectionBlock": True,
                  "featured": False, "woocommerceOnSale": False,
                  "woocommerceStockStatus": ["instock", "outofstock", "onbackorder"], "woocommerceAttributes": [],
                  "woocommerceHandPickedProducts": []},
        "tagName": "div", "displayLayout": {"type": "flex", "columns": 4, "shrinkColumns": True},
        "dimensions": {"widthType": "fill"}, "collection": "woocommerce/product-collection/product-catalog",
        "sgsSameTermAs": taxonomy},
        [B("woocommerce/product-template", {}, [B("sgs/product-card", dict(CARD))])])


DETAILS = [("Lens width", "meta._sgs_frame_eye", " mm"), ("Bridge", "meta._sgs_frame_bridge", " mm"),
           ("Temple length", "meta._sgs_frame_temple", " mm"), ("Style", "attribute.pa_shape", ""),
           ("Frame type", "attribute.pa_frame-type", ""), ("Material", "attribute.pa_material", ""),
           ("Hinge", "attribute.pa_hinge", ""), ("Nose pads", "attribute.pa_nose-pad", "")]
details_grid = B("sgs/container", dict(
    layout="grid", gridTemplateColumns={"desktop": "repeat(auto-fit,minmax(min(100%,170px),1fr))"},
    gap={"desktop": "1px"}, backgroundColour="border", borderWidth=BOX, borderColour="border"), [
    B("sgs/container", dict(backgroundColour="surface-alt",
                            padding={"desktop": {"top": "18px", "right": "20px", "bottom": "18px", "left": "20px"}}),
      [txt(k, **LABEL), btxt(key, {"after": after} if after else None, fontSize={"desktop": 16}, fontSizeUnit="px",
                             margin={"desktop": {"top": "6px"}})])
    for k, key, after in DETAILS])

MEASURES = [("Lens width", "meta._sgs_frame_eye", "Across one lens at its widest, rim to rim."),
            ("Bridge", "meta._sgs_frame_bridge", "The gap between the lenses, where the frame sits on your nose."),
            ("Temple length", "meta._sgs_frame_temple", "The arm, from the hinge to the tip, ear bend included.")]
sizing = [
    B("sgs/container", dict(layout="flex", justifyContent="space-between", alignItems="baseline", flexWrap="wrap",
                            gap={"desktop": "14px"}, margin={"desktop": {"bottom": "16px"}}), [
        txt("This pair, measured", **LABEL),
        txt('<a href="#size-guide">Which size am I?</a>', fontSize={"desktop": 13}, fontSizeUnit="px"),
    ]),
    B("sgs/container", dict(layout="stack", gap={"desktop": "1px"}, backgroundColour="border", borderWidth=BOX,
                            borderColour="border"), [
        B("sgs/container", dict(
            backgroundColour="surface-alt", layout="grid",
            gridTemplateColumns={"desktop": "150px auto", "mobile": "1fr auto"}, gap={"desktop": "4px 18px"},
            alignItems="baseline", padding={"desktop": {"top": "16px", "right": "18px", "bottom": "16px", "left": "18px"}}),
          [txt(k, **LABEL),
           btxt(key, {"after": " mm"}, fontFamily="heading", fontWeight="500", fontSize={"desktop": 20}, fontSizeUnit="px"),
           txt(d, fontSize={"desktop": 14}, fontSizeUnit="px", textColour="text-muted")])
        for k, key, d in MEASURES]),
]

FAQS = [
    ("Will prescription lenses work in these?", "Yes — single vision or varifocal. Frames with a strong curve suit prescriptions up to about ±4.00 best. I check yours before cutting anything and will suggest an alternative if this pair isn't the one."),
    ("What's in the box", "The frame, the brand's own hard case, a cleaning cloth and the manufacturer's warranty card. Nothing is unboxed, resealed or third-party."),
    ("Delivery and returns", "Free UK delivery over £75, otherwise £3.95 tracked. Free collection in Birmingham. 30 days to return unworn frames; prescription lenses are refundable only if I got them wrong."),
    ("Adjustments and repairs", "Bring them in any time and I'll straighten, tighten or re-fit them for nothing, whether you bought them here last week or last year."),
]

# The size guide's sgs_modal post on eye-care-test (gen_size_guide.py, built with wp-build-page.js --create sgs_modal).
SIZE_GUIDE_MODAL = 461

HOME = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'home.tree.json')


def _find(nodes, name):
    for n in nodes:
        if n.get('name') == name:
            return n
        hit = _find(n.get('innerBlocks', []), name)
        if hit:
            return hit
    return None


# The clinic's Google rating comes from the same Google reviews block settings as Home, shown compact.
with open(HOME, encoding='utf-8') as fh:
    GOOGLE = dict(_find(json.load(fh), 'sgs/google-reviews')['attributes'])
GOOGLE.update(variant="badge", showGoogleLogo=True, showAggregate=True)
# Inside the card the badge sits bare: no frame, ground or padding of its own.
for _k in [k for k in GOOGLE if k.startswith(('border', 'background', 'padding', 'boxShadow', 'shadow'))]:
    del GOOGLE[_k]

# Shown only while the product has no reviews (conditional visibility, "none-yet").
NO_REVIEWS = B("sgs/container", dict(
    margin=SECTION_GAP, sgsConditionProductReviews="none-yet",
    borderWidth={"top": "1px", "right": "0px", "bottom": "0px", "left": "0px"}, borderColour="border",
    padding={"desktop": {"top": "44px"}}), [
    B("sgs/container", dict(
        layout="grid", gridTemplateColumns={"desktop": "minmax(0,1fr) auto", "mobile": "minmax(0,1fr)"},
        alignItems="center", gap={"desktop": "20px"}, backgroundColour="surface-alt", borderWidth=BOX, borderColour="border",
        borderRadius={"desktop": {"topLeft": "12px", "topRight": "12px", "bottomLeft": "12px", "bottomRight": "12px"}},
        padding={"desktop": {"top": "26px", "right": "24px", "bottom": "26px", "left": "24px"}}), [
        B("sgs/container", {}, [
            txt("No reviews on this frame yet — it's new to the shop.", fontSize={"desktop": 15}, fontSizeUnit="px",
                fontWeight="500"),
            txt("Buy this pair and you can be the first to review it.", fontSize={"desktop": 13.5}, fontSizeUnit="px",
                textColour="text-muted", margin={"desktop": {"top": "4px"}}),
        ]),
        B("sgs/google-reviews", GOOGLE),
    ]),
])

tree = [
    B("core/template-part", {"slug": "header", "tagName": "header"}),
    B("sgs/container", dict(tagName="main", anchor="main", contentWidth={"desktop": "full"}), [
        B("sgs/container", dict(
            maxWidth={"desktop": "1440px"},
            padding={"desktop": {"top": "48px", "right": "52px", "bottom": "90px", "left": "52px"},
                     "mobile": {"top": "28px", "right": "20px", "bottom": "60px", "left": "20px"}}), [
            B("sgs/breadcrumbs", dict(productPageCrumbs="both", showArchiveCrumb=False, showCurrentCrumb=False, fontSize={"desktop": 12.5}, fontSizeUnit="px",
                                      letterSpacing={"desktop": 0.04}, letterSpacingUnit="em", linkColour="text-muted",
                                      currentColour="text-muted", margin={"desktop": {"bottom": "22px"}})),
            B("sgs/buybox", dict(
                rrpMetaKey="_sgs_rrp", rrpSavingFormat="amount", rrpShowPrice=True, rrpSavingPrefix="You save",
                rrpPillBackgroundColour="accent-light", rrpPillTextColour="accent-text",
                showStockStatus=True, stockInStockLabel="In stock — dispatched next working day",
                stockInStockColour="success", stickyEnabled=True, stickyOffset="24px", showLadder=False,
                priceFontFamily="heading", priceFontSize={"desktop": 38}, priceFontSizeUnit="px", priceFontWeight="500",
                pickerSwatchStyle="tile", pickerStyle="outlined", pickerSubLabelMetaKey="_sgs_size_measure",
                pickerShowSelectedTick=False, addToCartLabel="Add to bag as they are", addToCartStyle="outline",
                addToCartShowPrice=True, extrasBeforeCount=3, extrasBeforeCartCount=1, stackBelow="tablet"), [
                btxt("brand", fontFamily="heading", fontWeight="500", fontSize={"desktop": 20}, fontSizeUnit="px",
                     letterSpacing={"desktop": 0.3}, letterSpacingUnit="em", textTransform="uppercase"),
                B("sgs/heading", dict(level="h1", content="", fontFamily="heading", fontWeight="500",
                                      fontSize={"desktop": 48, "mobile": 34}, fontSizeUnit="px",
                                      lineHeight={"desktop": 1.02}, lineHeightUnit="unitless",
                                      metadata=bind("content", "title"))),
                btxt("short_description", fontSize={"desktop": 13.5}, fontSizeUnit="px", textColour="text-muted"),
                B("sgs/button", dict(label="Add my prescription", url="#lens-configurator", inheritStyle="primary",
                                     widthType={"desktop": "full"}, textTransform="uppercase",
                                     letterSpacing={"desktop": 0.12}, letterSpacingUnit="em",
                                     fontSize={"desktop": 13}, fontSizeUnit="px")),
                B("sgs/whatsapp-cta", dict(variant="card", cardTitle="Need advice?",
                                           cardSubline="Message me on WhatsApp — I'm an optician, and I'm happy to help.",
                                           backgroundColour="whatsapp-soft", cardBorderColour="whatsapp-line",
                                           cardBorderWidth=BOX, cardBorderStyle="solid", cardTitleColour="text",
                                           cardSublineColour="text-muted", margin={"desktop": {"top": "22px"}})),
                B("sgs/icon-list", dict(source="typed", markerType="icon", icon="check", iconColour="accent-text",
                                        iconBackgroundColour="accent-light", iconBoxSize="26px", iconSize="small",
                                        dividers=True, dividerEdges=True, dividerColour="border", itemPaddingBlock="16px",
                                        itemFontSize={"desktop": 14.5}, margin={"desktop": {"top": "24px"}}, items=[
                    {"text": "Genuine and boxed with the brand's own case, cloth and two-year guarantee."},
                    {"text": "Free UK delivery over £75, or collect in Birmingham and I'll adjust them to fit while you wait."},
                    {"text": "Adjustments, tightening and re-fitting are free for as long as you own them."}])),
            ]),
            B("sgs/container", dict(
                layout="grid",
                gridTemplateColumns={"desktop": "minmax(0,1.35fr) minmax(0,1fr)", "tablet": "minmax(0,1fr)",
                                     "mobile": "minmax(0,1fr)"},
                gap={"desktop": "18px", "mobile": "10px"}, margin=SECTION_GAP), [
                B("sgs/tabs", dict(hideEmptyTabs=True, mobileLayout="row"), [
                    B("sgs/tab", {"label": "Description"},
                      [B("core/post-content", {"textColor": "text-muted",
                                               "style": {"typography": {"fontSize": "16px", "lineHeight": "1.6"}}})]),
                    B("sgs/tab", {"label": "Details"}, [details_grid]),
                    B("sgs/tab", {"label": "Sizing"}, sizing),
                ]),
                B("sgs/container", {}, [
                    B("sgs/heading", dict(content="Good to know", margin={"desktop": {"bottom": "18px"}}, **H2)),
                    B("sgs/accordion", dict(accordionStyle="flush", allowMultiple=False, defaultOpen=-1, openIcon="plus",
                                            closeIcon="x", borderColour="border", headerColour="text",
                                            headerFontWeight="400", headerFontWeightOpen="400"),
                      [B("sgs/accordion-item", {"title": q},
                         [txt(a, fontSize={"desktop": 15}, fontSizeUnit="px", textColour="text-muted")]) for q, a in FAQS]),
                ]),
            ]),
            NO_REVIEWS,
            B("sgs/container", dict(layout="stack", margin=SECTION_GAP), [
                B("sgs/heading", dict(content="", metadata=bind("content", "brand", before="More from "),
                                      margin={"desktop": {"bottom": "24px"}}, **H2)),
                collection("product_brand", 11)]),
            B("sgs/container", dict(layout="stack", margin=SECTION_GAP), [
                B("sgs/heading", dict(content="Similar shapes", margin={"desktop": {"bottom": "24px"}}, **H2)),
                collection("pa_shape", 12)]),
        ]),
    ]),
    # Opened by links, never by a button of their own (triggerStyle none): "Add my prescription" links
    # #lens-configurator, "Which size am I?" links #size-guide. The lens flow is the saved Choice Flow
    # lens-configurator (gen_lens_configurator.py), shown by a linked sgs/choice-flow (Spec 43 FR-43-6).
    B("sgs/modal", dict(anchor="lens-configurator", triggerStyle="none", triggerText="Add prescription lenses",
                        size="fullscreen", modalBackground="surface"), [
        B("sgs/choice-flow", dict(flowId="lens-configurator", flowIsLinked=True)),
    ]),
    B("sgs/modal", dict(anchor="size-guide", triggerStyle="none", triggerText="Which size am I?", maxWidth="large",
                        modalBackground="surface", modalRef=SIZE_GUIDE_MODAL)),
    B("core/template-part", {"slug": "footer", "tagName": "footer"}),
]

with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(tree, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print('wrote', OUT)
