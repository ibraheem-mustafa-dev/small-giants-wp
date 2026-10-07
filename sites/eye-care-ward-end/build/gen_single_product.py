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
    # The name wraps as the draft's, not balanced (the theme balances every heading): "Oversized Cat-" / "Eye".
    # "PHOTO TO COME" as the draft's label (10.5px, 0.16em spaced capitals) on a product showing the shop's
    # placeholder image, in text-muted (Bean 2026-09-28); the price row 6px further from the rating line.
    noImageLabel="Photo to come", noImageLabelFontSize={"desktop": 10.5}, noImageLabelFontSizeUnit="px",
    noImageLabelFontWeight="400", noImageLabelLetterSpacing={"desktop": 0.16}, noImageLabelLetterSpacingUnit="em",
    noImageLabelTextTransform="uppercase", priceRowSpaceAbove="6px",
    sourceMode="wc-product", titleTextWrap="wrap", showRating=True, showSavingBadge=True,
    savingBadgePosition="bottom-left", showBrandOverlay=True, brandFontFamily="heading", brandFontWeight="500",
    brandFontSize={"desktop": 12.5}, brandFontSizeUnit="px", brandLetterSpacing={"desktop": 0.26},
    brandLetterSpacingUnit="em", showPickers=False, showDescription=False, showCta=False, showWishlist=True,
    rrpMetaKey="_sgs_rrp", swatchMaxVisible=4, imageAspectRatio="1 / 1", showShadow=False,
    borderRadius={"desktop": {"topLeft": "0px", "topRight": "0px", "bottomLeft": "0px", "bottomRight": "0px"}},
    cardPadding={"top": "16px", "right": "16px", "bottom": "18px", "left": "16px"},
    titleFontFamily="body", titleFontSize={"desktop": 16}, titleFontSizeUnit="px", titleFontWeight="400",
    titleLineHeight=1.25, priceFontFamily="body", priceFontSize={"desktop": 18}, priceFontSizeUnit="px",
    priceFontWeight="500", showAttributeTag=True, attributeTagSource="tag", attributeTagTerm="polarised",
    attributeTagText="Polarised", attributeTagFontWeight="400", attributeTagBorderColour="border-strong")


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


# The draft's 17-row Details grid, matched against real product data (2026-09-28 parity fixes, plan
# plans/archive/2026-09-28-eye-care-product-page-parity.md, Content C1). Each row is either "bind" (a real
# `sgs-product/field` key: brand, short_description, stock_status, attribute.<taxonomy> or meta.<key>) or
# "text" (the draft's fixed copy, true of every frame in the shop). The model code is the short description,
# as the buybox's code line ("GG1566S · 001"); "Lenses as supplied" is seeded from the draft's catalogue
# (woo-seed/seed-facets.php, _sgs_lens_supplied).
DETAILS = [
    ("Brand", "bind", "brand", ""),
    ("Model code", "bind", "short_description", ""),
    ("Lens width", "bind", "meta._sgs_frame_eye", " mm"),
    ("Bridge", "bind", "meta._sgs_frame_bridge", " mm"),
    ("Temple length", "bind", "meta._sgs_frame_temple", " mm"),
    ("Style", "bind", "attribute.pa_shape", ""),
    ("Frame type", "bind", "attribute.pa_frame-type", ""),
    ("Material", "bind", "attribute.pa_material", ""),
    ("Hinge", "bind", "attribute.pa_hinge", ""),
    ("Nose pads", "bind", "attribute.pa_nose-pad", ""),
    ("Lenses as supplied", "bind", "meta._sgs_lens_supplied", ""),
    ("UV protection", "text", "100% UV400", ""),
    # "Prescription": the universal answer to "Will prescription lenses work in these?" (Good to know,
    # first FAQ, this same tree, every product) — true of the whole shop, not invented for this row.
    ("Prescription", "text", "Single vision & varifocal", ""),
    ("Gender", "bind", "attribute.pa_gender", ""),
    ("Availability", "bind", "stock_status", ""),
    # "Warranty": matches the icon-list tick "two-year guarantee" a few rows above (this same tree).
    ("Warranty", "text", "2 years, manufacturer", ""),
    # "Dispatch": matches sgs/buybox's stockInStockLabel ("In stock — dispatched next working day", below).
    ("Dispatch", "text", "1 working day", ""),
    # "With lenses": matches the header trust bar ("Prescription lenses glazed here in 7–10 days", site-wide).
    ("With lenses", "text", "7–10 working days", ""),
]


def detail_field(mode, value, after):
    if "bind" == mode:
        return btxt(value, {"after": after} if after else None, fontSize={"desktop": 16}, fontSizeUnit="px",
                    margin={"desktop": {"top": "6px"}})
    return txt(value + after, fontSize={"desktop": 16}, fontSizeUnit="px", margin={"desktop": {"top": "6px"}})


details_grid = B("sgs/container", dict(
    layout="grid", gridTemplateColumns={"desktop": "repeat(auto-fit,minmax(min(100%,170px),1fr))"},
    # Hairlines between the cells are the grid's own separators (the tree's current shape).
    gap={"desktop": "1px"}, separators={"row": {"style": "solid", "width": {"desktop": "1px"}, "colour": "border"},
                                        "column": {"style": "solid", "width": {"desktop": "1px"}, "colour": "border"}},
    borderWidth=BOX, borderColour="border"), [
    B("sgs/container", dict(backgroundColour="surface-alt",
                            padding={"desktop": {"top": "18px", "right": "20px", "bottom": "18px", "left": "20px"}}),
      [txt(label, **LABEL), detail_field(mode, value, after)])
    for label, mode, value, after in DETAILS])

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
    # The draft's note under the table, its "56▫17 145" left out: the numbers sit in the table above (N30, N36S).
    txt("Every pair of glasses carries three numbers inside the arm: lens width, bridge, then temple length, "
        "the same measurements as above. Compare them against a pair you already wear and you'll know straight "
        "away whether these will fit.", fontSize={"desktop": 14}, fontSizeUnit="px", textColour="text-muted",
        margin={"desktop": {"top": "16px"}}),
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
            # Measured on the draft at 1440 (2026-09-28): "/" with 10px either side, and no bold on the current crumb
            # (fontWeight is one shared value across link, separator and current).
            B("sgs/breadcrumbs", dict(productPageCrumbs="both", showArchiveCrumb=False, showCurrentCrumb=False, fontSize={"desktop": 12.5}, fontSizeUnit="px",
                                      fontWeight="400", itemGap="10px",
                                      letterSpacing={"desktop": 0.04}, letterSpacingUnit="em", linkColour="text-muted",
                                      currentColour="text-muted", margin={"desktop": {"bottom": "22px"}})),
            B("sgs/buybox", dict(
                # The draft fades the main photo up on load (register 73).
                photoEntrance="rise",
                rrpMetaKey="_sgs_rrp", rrpSavingFormat="amount", rrpShowPrice=True, rrpSavingPrefix="You save",
                rrpPillBackgroundColour="accent-light", rrpPillTextColour="accent-text",
                showStockStatus=True, stockInStockLabel="In stock — dispatched next working day",
                stockInStockColour="success", stickyEnabled=True, stickyOffset="24px", showLadder=False,
                priceFontFamily="heading", priceFontSize={"desktop": 38}, priceFontSizeUnit="px", priceFontWeight="500",
                pickerSwatchStyle="tile", pickerStyle="outlined", pickerSubLabelMetaKey="_sgs_size_measure",
                pickerShowSelectedTick=False, addToCartLabel="Add to bag as they are", addToCartStyle="outline",
                addToCartShowPrice=True,
                # Measured on the draft at 1440 (2026-09-28): price 38px on a 38px line; stock line above the pickers
                # under a hairline; picker labels 13px capitals 0.14em with the chosen value at the right; "Add to bag"
                # 13px capitals 0.12em, weight 400, 56px, a solid 1px text-colour border on white, no icon, 2px lift.
                priceLineHeight={"desktop": 1}, stockLinePosition="above", stockLineHairline=True,
                pickerLabelFontSize={"desktop": 13}, pickerLabelFontSizeUnit="px", pickerLabelLetterSpacing={"desktop": 0.14},
                pickerLabelLetterSpacingUnit="em", pickerLabelTextTransform="uppercase", pickerLabelColour="text",
                pickerShowSelectedValue=True,
                addToCartTextTransform="uppercase", addToCartLetterSpacing={"desktop": 0.12}, addToCartLetterSpacingUnit="em",
                addToCartFontWeight="400", addToCartFontSize={"desktop": 13}, addToCartFontSizeUnit="px",
                addToCartMinHeight="56px", addToCartShowIcon=False,
                addToCartBorderColour="text", addToCartBackgroundColour="surface-alt",
                # Bean 2026-09-28: sizes shown by universal band (S up to 52mm, M up to 57mm, L), only this frame's own,
                # a one-size frame included; "Which size am I?" at the right of the Size label; the draft's "Save £51
                # off RRP" tag on the photo; the draft's gallery split (725 : 536, measured) and 60px gap.
                pickerAlwaysShowAxes=["pa_frame-size"], pickerBandAxis="pa_frame-size", pickerBandScale="S:52,M:57,L",
                pickerLabelLinkAxis="pa_frame-size", pickerLabelLinkText="Which size am I?", pickerLabelLinkUrl="#size-guide",
                galleryColumnRatio=1.353, galleryColumnGap="60px", extrasBeforeCount=3, extrasBeforeCartCount=1, stackBelow="tablet"), [
                # D8 / register N33A: the brand's logo (every brand has one) above the name, linking to the
                # brand page; its text alternative is the brand name.
                B("sgs/media", dict(mediaType="image", imageUrl="", imageAlt="", linkUrl="", height={"desktop": "40px"},
                                    objectFit="contain", maxWidth={"desktop": "180px"}, alignment="left",
                                    metadata={"bindings": {
                                        "imageUrl": {"source": "sgs-product/field", "args": {"key": "brand_logo_url"}},
                                        "imageAlt": {"source": "sgs-product/field", "args": {"key": "brand"}},
                                        "linkUrl": {"source": "sgs-product/field", "args": {"key": "brand_url"}}}})),
                B("sgs/heading", dict(level="h1", content="", fontFamily="heading", fontWeight="500",
                                      fontSize={"desktop": 48, "mobile": 34}, fontSizeUnit="px",
                                      lineHeight={"desktop": 1.02}, lineHeightUnit="unitless",
                                      metadata=bind("content", "title"))),
                btxt("short_description", fontSize={"desktop": 13.5}, fontSizeUnit="px", textColour="text-muted"),
                B("sgs/button", dict(label="Add my prescription", url="#lens-configurator", inheritStyle="primary",
                                     # The draft's price hint at the button's far end (pennies, Bean 2026-09-25).
                                     note="from +£59", minHeight={"desktop": 56}, minHeightUnit="px",
                                     transitionDuration=250,
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
                                        separators={"row": {"style": "solid", "width": {"desktop": "1px"}, "colour": "border"}, "edges": "all"}, itemPaddingBlock="16px",
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
                B("sgs/tabs", dict(hideEmptyTabs=True, mobileLayout="row",
                    # The draft's tab buttons (measured 2026-09-28): 12.5px capitals, 1.75px tracking, 0 18px, 52px tall,
                    # the active one underlined 2px in the text colour.
                    tabFontSize={"desktop": 12.5}, tabFontSizeUnit="px", tabTextTransform="uppercase",
                    tabLetterSpacing={"desktop": 1.75}, tabLetterSpacingUnit="px",
                    tabPadding={"top": "0", "right": "18px", "bottom": "0", "left": "18px"}, tabMinHeight="52px", tabIndicatorThickness="2px",
                    tabActiveIndicatorColour="text"), [
                    B("sgs/tab", {"label": "Description"},
                      [B("core/post-content", {"textColor": "text-muted", "className": "is-style-sgs-plain-lists",
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
            # Each related section hides, heading and all, when its list has no products (condition 9).
            B("sgs/container", dict(layout="stack", margin=SECTION_GAP, sgsConditionCollectionQueryId=11), [
                B("sgs/heading", dict(content="", metadata=bind("content", "brand", before="More from "),
                                      margin={"desktop": {"bottom": "24px"}}, **H2)),
                collection("product_brand", 11)]),
            B("sgs/container", dict(layout="stack", margin=SECTION_GAP, sgsConditionCollectionQueryId=12), [
                B("sgs/heading", dict(content="Similar shapes", margin={"desktop": {"bottom": "24px"}}, **H2)),
                collection("pa_shape", 12)]),
        ]),
    ]),
    # Opened by links, never by a button of their own (triggerStyle none): "Add my prescription" links
    # #lens-configurator, "Which size am I?" links #size-guide, the site-wide size guide in the footer (footer.tree.json). The lens flow is the saved Choice Flow
    # lens-configurator (gen_lens_configurator.py), shown by a linked sgs/choice-flow (Spec 43 FR-43-6).
    B("sgs/modal", dict(anchor="lens-configurator", triggerStyle="none", triggerText="Add prescription lenses",
                        size="fullscreen", modalBackground="surface"), [
        B("sgs/choice-flow", dict(flowId="lens-configurator", flowIsLinked=True)),
    ]),
    B("core/template-part", {"slug": "footer", "tagName": "footer"}),
]

with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(tree, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print('wrote', OUT)
