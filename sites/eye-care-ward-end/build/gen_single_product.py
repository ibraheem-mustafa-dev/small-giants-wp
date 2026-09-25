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
        "sgsSameTermAs": taxonomy, "className": "sgs-product-rail"},
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
    txt("This pair, measured", margin={"desktop": {"bottom": "16px"}}, **LABEL),
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

tree = [
    B("core/template-part", {"slug": "header", "tagName": "header"}),
    B("sgs/container", dict(tagName="main", anchor="main", contentWidth={"desktop": "full"}), [
        B("sgs/container", dict(
            maxWidth={"desktop": "1440px"},
            padding={"desktop": {"top": "48px", "right": "52px", "bottom": "90px", "left": "52px"},
                     "mobile": {"top": "28px", "right": "20px", "bottom": "60px", "left": "20px"}}), [
            B("sgs/breadcrumbs", dict(productPageCrumbs="both", fontSize={"desktop": 12.5}, fontSizeUnit="px",
                                      letterSpacing={"desktop": 0.04}, letterSpacingUnit="em", linkColour="text-muted",
                                      currentColour="text-muted", margin={"desktop": {"bottom": "22px"}})),
            B("sgs/buybox", dict(rrpMetaKey="_sgs_rrp", rrpSavingFormat="amount", showStockStatus=True,
                                 stickyEnabled=True, stickyOffset="24px", showLadder=False, extrasBeforeCount=3), [
                btxt("brand", fontFamily="heading", fontWeight="500", fontSize={"desktop": 20}, fontSizeUnit="px",
                     letterSpacing={"desktop": 0.3}, letterSpacingUnit="em", textTransform="uppercase"),
                B("sgs/heading", dict(level="h1", content="", fontFamily="heading", fontWeight="500",
                                      fontSize={"desktop": 48, "mobile": 34}, fontSizeUnit="px",
                                      lineHeight={"desktop": 1.02}, lineHeightUnit="unitless",
                                      metadata=bind("content", "title"))),
                btxt("short_description", fontSize={"desktop": 13.5}, fontSizeUnit="px", textColour="text-muted"),
                B("sgs/button", dict(label="Add my prescription", url="/prescription-lenses/", inheritStyle="primary")),
                B("sgs/whatsapp-cta", dict(variant="card", cardTitle="Need advice?",
                                           cardSubline="Message me on WhatsApp — I'm an optician, and I'm happy to help.")),
                B("sgs/icon-list", dict(source="typed", markerType="none", items=[
                    {"text": "Genuine and boxed with the brand's own case, cloth and two-year guarantee."},
                    {"text": "Free UK delivery over £75, or collect in Birmingham and I'll adjust them to fit while you wait."},
                    {"text": "Adjustments, tightening and re-fitting are free for as long as you own them."}])),
            ]),
            B("sgs/container", dict(
                layout="grid",
                gridTemplateColumns={"desktop": "minmax(0,1.35fr) minmax(0,1fr)", "tablet": "minmax(0,1fr)",
                                     "mobile": "minmax(0,1fr)"},
                gap={"desktop": "18px", "mobile": "10px"}, margin=SECTION_GAP), [
                B("sgs/tabs", dict(hideEmptyTabs=True), [
                    B("sgs/tab", {"label": "Description"},
                      [btxt("short_description", fontSize={"desktop": 16.5}, fontSizeUnit="px", textColour="text-muted")]),
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
            B("sgs/container", dict(margin=SECTION_GAP), [
                B("sgs/heading", dict(content="", metadata=bind("content", "brand", before="More from "),
                                      margin={"desktop": {"bottom": "24px"}}, **H2)),
                collection("product_brand", 11)]),
            B("sgs/container", dict(margin=SECTION_GAP), [
                B("sgs/heading", dict(content="Similar shapes", margin={"desktop": {"bottom": "24px"}}, **H2)),
                collection("pa_shape", 12)]),
        ]),
    ]),
    B("core/template-part", {"slug": "footer", "tagName": "footer"}),
]

with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(tree, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print('wrote', OUT)
