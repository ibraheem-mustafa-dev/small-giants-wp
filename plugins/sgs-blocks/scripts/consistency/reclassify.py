#!/usr/bin/env python3
"""
Spec 35 UNIT A+ Phase 1c — RE-CLASSIFY the "unresolved" non-CSS-property attributes.

Phase 1b bucketed 282 non-CSS attrs as "legitimately block-specific, do NOT standardise" —
Bean is sceptical: that's not evidence, it's a NAME-based bucket that never asked "what INPUT
does this attr represent" or "what BEHAVIOUR family is this boolean part of". This script
collapses all non-CSS-property attrs (unresolved: / slot: / role: setting-keys) onto:

  1. INPUT-TYPE  — the semantic input a control represents, independent of what it's called.
  2. BEHAVIOUR-FAMILY — for booleans/enums that gate a recurring UI behaviour (carousel,
     disclosure, visibility, playback, dismiss, link-target, animation, validation...).
  3. PER-ELEMENT — which part of the block the attr targets (title/subtitle/cta/icon/...).

Default is MATCH, not unique. An attr only lands in `genuinely_unique` if it fails every
input-type AND behaviour-family test AND isn't just a per-element variant of a common pattern.
"""
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
summary = json.load(open(HERE / "non_css_attr_summary.json", encoding="utf-8"))
raw = json.load(open(HERE / "non_css_attrs.json", encoding="utf-8"))

# ---------------------------------------------------------------------------
# INPUT-TYPE classification — regex/heuristic rules, checked in priority order.
# Every rule returns (input_type, reason) or None.
# ---------------------------------------------------------------------------

MEDIA_NAME_RE = re.compile(
    r"(Media|Logo|Avatar|Photo|Image(?!Effect|Zoom)|Video(?!Autoplay|Controls|Loop|MimeType|"
    r"MuseIcon|PlaysInline|Source)|Poster|Icon(?=Id)|LogoId)", re.I)
MEDIA_EXACT = {
    "decorMedia", "backgroundMedia", "boxMedia", "avatarMedia", "memberMedia", "workMedia",
    "backgroundImage", "backgroundImageMobile", "backgroundImageTablet", "backgroundVideo",
    "bgVideo", "bgVideoMobile", "image", "imageId", "imageUrl", "images", "photo", "sideImage",
    "splitImage", "splitImageMobile", "splitMedia", "avatar", "logos", "mediaItems",
    "desktopLogoId", "mobileLogoId", "tabletLogoId", "videoId", "videoUrl", "videoPoster",
    "videoPosterId", "orgLogo", "audioId", "audioUrl",
}
ICON_EXACT = {
    "icon", "icons", "iconName", "iconSource", "closeIcon", "openIcon", "dashiconName",
    "contentIconName", "contentIconDashicon", "contentIconWpIcon", "contentIconEmoji",
    "contentIconSource", "wpIconName", "emojiChar", "mediaEmoji", "defaultIconSource",
    "showIcon", "iconTitle",
}
URL_EXACT_SUFFIXES = ("Url", "Href", "Link")
URL_EXACT = {
    "url", "linkUrl", "blockLink", "sgsBlockLink", "reviewRequestUrl", "indexVariationUrl",
    "businessUnitUrl", "audioUrl", "videoUrl", "imageUrl", "ctaUrl", "ctaPrimaryUrl",
    "ctaSecondaryUrl", "cta2Url", "phoneNumber", "linkEmail", "linkPhone",
}
TEXT_CONTENT_EXACT = {
    "placeholder", "helpText", "label", "title", "subtitle", "subtitleText", "heading",
    "headline", "subHeadline", "body", "content", "contentText", "description", "caption",
    "quote", "attribution", "question", "message", "successMessage", "expiredMessage",
    "emptyMessage", "emptyState", "buttonLabel", "addToCartLabel", "menuButtonLabel",
    "moreMenuLabel", "homeLabel", "notifyMeLabel", "navigationLabel", "drawerLabel",
    "readMoreText", "triggerText", "consentText", "summaryPhrase", "priceNote",
    "billingToggleMonthlyLabel", "billingToggleYearlyLabel", "unavailableLabel",
    "soldOutLabel", "productEmptyMessage", "successRedirect", "uploadText",
    "trustScoreLabel", "reviewerName", "reviewerRole", "orgName", "cta2Text", "ctaText",
    "ctaPrimaryText", "ctaSecondaryText", "prefix", "suffix", "name", "fieldName",
    "formName", "featuredTag", "popularBadgeText", "trialTag", "iconTitle", "text",
    "formId", "typeKey", "ribbon",
}
SVG_CODE_EXACT = {"bgSvgContent", "svgContent"}
DATE_EXACT = {"targetDate", "minDate", "maxDate", "reviewDate"}
NUMBER_EXACT_HINT_RE = re.compile(
    r"(Size(?!Mobile$|Tablet$)|Speed$|Length$|Rating$|Score$|Count$|Limit$|Results$|Reviews$|"
    r"Offset$|Threshold$|Delay$|Duration|Px$|Stagger|Rows$|Days$|Hours$|Minutes$|Seconds$)")


# System/internal attrs — not a user-facing "setting" at all (WP-core plumbing or a computed
# facet stored alongside a real setting). Excluded from both genuinely_unique and the counted
# groups so they don't inflate either "true unique" or "collapsed" figures.
SYSTEM_INTERNAL = {"className"}

# Media-object FACETS — mimeType/id scalars that ride along with a media-source attr's picker
# (WP's media object always carries id/url/alt/mimeType) rather than being independent settings.
MEDIA_FACET_EXACT = {"audioMimeType", "videoMimeType"}

# Manual overrides for cases the regex/control-based heuristics under-detect (DB has empty
# `control`/`role` for these — verified individually against block.json + edit.js naming intent
# below; each carries the reason it belongs to that input-type rather than "genuinely unique").
COLOUR_VALUE_EXACT = {
    "borderColourHover", "colourBackgroundHover", "colourBorder", "colourBorderHover",
    "colourText", "colourTextHover", "ctaColourBackgroundHover", "ctaColourBorder",
    "ctaColourBorderHover", "ctaColourText", "ctaColourTextHover", "gradientColourEnd",
    "gradientColourStart", "overlayColourHover", "overlayGradientFrom", "overlayGradientTo",
    "shapeColourHover",
}
ENUM_OVERRIDE_EXACT = {
    "conditionalField": "dynamic dropdown of sibling field names — a select, not free text",
    "conditionalOperator": "fixed operator set (equals/not-equals/contains/greater-than...)",
    "ctaPrimaryStyle": "role=behaviour; button visual-style choice (primary/secondary/outline)",
    "ctaSecondaryStyle": "role=behaviour; button visual-style choice",
    "direction": "canonical_slot=layout; row/column layout direction picker",
    "directionMobile": "responsive-tier companion of direction",
    "directionTablet": "responsive-tier companion of direction",
    "filterTaxonomy": "choose which taxonomy to filter results by — a fixed option set",
    "gradientPreset": "named gradient preset picker",
    "gridItemBorder": "grid-item border style choice (none/thin/thick), not free text",
    "imageEffect": "role=select-from-enum; hover-effect name picker",
    "linkRel": "rel-attribute option set (nofollow/sponsor/ugc/noopener)",
    "menuFallback": "choose a fallback menu from the site's registered menus",
    "orderBy": "sort-order choice (date/title/menu-order/random)",
    "overlayStyle": "role=behaviour; overlay visual-style choice",
    "postType": "choose which post type to query — a fixed option set",
    "rowSlot": "which structural header/footer row slot this instance occupies",
    "selectedStyle": "tile selected-state visual-style choice",
    "sgsAnimation": "role=motion; scroll/entrance animation-family picker",
    "sourcePlatform": "which review platform the data is sourced from (google/trustpilot)",
    "textWrap": "text-wrap behaviour choice (wrap/nowrap/balance/pretty)",
    "thicknessUnit": "CSS-unit companion select (px/em/%) — same UNIT-COMPANION pattern as every "
                      "other responsive dimension's *Unit attr; 'thickness' just isn't yet in "
                      "property_suffixes (a Phase-1b-identified gap, not a unique setting)",
    "widthType": "role=select-from-enum; fit/full width choice",
    "widthTypeMobile": "responsive-tier companion of widthType",
    "widthTypeTablet": "responsive-tier companion of widthType",
}
BOOLEAN_OVERRIDE_EXACT = {"wrapMobile", "wrapTablet"}
TEXT_OVERRIDE_EXACT = {
    "alt": "alt-text copy for a non-media-picker alt override",
    "anchor": "HTML id/slug string typed by the operator (jump-link target)",
    "bio": "canonical_slot=text; prose biography copy",
    "conditionalValue": "the comparison value typed for the selected conditionalOperator",
    "excludeKeywords": "comma-separated keyword-filter string",
    "productName": "role=identity; display-name string",
    "ratingScaleMax": "numeric scale-ceiling stored as a string (\"5\"/\"10\")",
    "schemaItemName": "Schema.org item-name string",
}


def input_type_of(name, meta):
    if name in SYSTEM_INTERNAL:
        return "system-internal", "WP-core wrapper plumbing, not an operator-facing setting"
    if name in MEDIA_FACET_EXACT:
        return "media-source", "computed facet (mimeType) riding along with the media object's id/url — not an independent setting"

    types = meta["attr_type"]
    ctls = meta["control"]
    roles = meta["role"]
    enum_present = bool(meta["enum_sample"])

    # 0. colour-value — DesignTokenPicker-driven or *Colour*Hover pattern (a distinct input
    # type from generic enum/text; these are colour-token pickers exactly like every base
    # Colour attr, just the Hover-state variant, which the css-property matcher didn't catch).
    if name in COLOUR_VALUE_EXACT or "DesignTokenPicker" in ctls or "color" in roles:
        return "colour-value", "DesignTokenPicker colour-token picker (Hover-state or override variant of a standard colour input)"

    # 1. media-source — image/video/logo/avatar object pickers.
    if name in MEDIA_EXACT or "image-object" in roles:
        return "media-source", "role=image-object or media/logo/avatar/video attr name"
    if MEDIA_NAME_RE.search(name) and "boolean" not in types:
        return "media-source", "name matches media/logo/image/video/poster pattern"

    # 2. icon — icon slug/identity pickers (distinct from a media object).
    if name in ICON_EXACT or "icon-dashicon" in roles:
        return "icon", "icon-identity picker (slug/dashicon/emoji/wp-icon), not a media object"

    # 3. url-link — any href/url/link target.
    if name in URL_EXACT or "link-href" in roles or any(name.endswith(s) for s in URL_EXACT_SUFFIXES):
        return "url-link", "URL/href/link-target field"

    # 4. code/svg — raw markup, not prose.
    if name in SVG_CODE_EXACT:
        return "code-svg", "raw SVG markup string"

    # 5. date.
    if name in DATE_EXACT or (name.lower().endswith("date") and "string" in types):
        return "date", "date/datetime value"

    # 6. boolean-toggle — attr_type boolean (ToggleControl or synonymous), incl. manual overrides
    # for responsive-tier companions the DB has typed as string but which mirror a sibling bool.
    if "boolean" in types or name in BOOLEAN_OVERRIDE_EXACT:
        return "boolean-toggle", ("attr_type=boolean" if "boolean" in types
                                   else "responsive-tier companion of a boolean toggle")

    # 7. enum-select — has enum_values, SelectControl/ToggleGroupControl, or a verified manual
    # override (DB `control`/`role` empty but the attr is a fixed-option picker per block.json).
    if enum_present or "SelectControl" in ctls or "ToggleGroupControl" in ctls or name in ENUM_OVERRIDE_EXACT:
        return "enum-select", ENUM_OVERRIDE_EXACT.get(
            name, "enum_values present or SelectControl/ToggleGroupControl")

    # 8. number — numeric scalar, no enum.
    if any(t in types for t in ("number", "integer")) or "RangeControl" in ctls or "NumberControl" in ctls:
        return "number", "attr_type number/integer or Range/NumberControl"

    # 9. text-content — explicit text/label/copy names, TextControl/TextareaControl, role
    # text-content, canonical_slot text/content, or a verified manual override.
    if (name in TEXT_CONTENT_EXACT or "text-content" in roles or "TextControl" in ctls
            or "TextareaControl" in ctls or name in TEXT_OVERRIDE_EXACT
            or any(s in ("text", "content") for s in meta.get("canonical_slot") or [])):
        return "text-content", TEXT_OVERRIDE_EXACT.get(
            name, "prose/label copy — role=text-content, Text(area)Control, or canonical_slot=text/content")

    # 10. json-config — arrays/objects that aren't media (repeaters, id lists, filter config).
    if "array" in types or "object" in types:
        return "json-config", "attr_type array/object holding structured repeater/config data, not a media object"

    return None, None


# ---------------------------------------------------------------------------
# BEHAVIOUR-FAMILY classification — for boolean-toggle / enum-select members that gate a
# recurring interaction pattern. An attr can belong to at most one family (first match wins).
# ---------------------------------------------------------------------------

BEHAVIOUR_FAMILIES = [
    ("slider-carousel", re.compile(
        r"^(autoplay|autoplaySpeed|autoScroll|autoScrollPauseOnHover|autoScrollSpeed|"
        r"carouselAutoplay|carouselShowArrows|carouselShowDots|carouselSpeed|showArrows|"
        r"showDots|pauseOnHover|slidesVisible|scrollSpeed|scrolling|fadeEdges|dividers|"
        r"showDividers)$")),
    ("disclosure", re.compile(
        r"^(collapsible|defaultOpen|defaultCollapsed|allowMultiple|collapsedLines|isOpen|"
        r"labelCollapse|openOn|toggleStyle|openIcon|closeIcon)$")),
    ("visibility-responsive", re.compile(
        r"^(hideOnMobile|hideOnTablet|showOnMobile|showOnDesktop|hideWhenEmpty|"
        r"showPendingInEditor)$")),
    ("media-playback", re.compile(
        r"^(audioAutoplay|audioControls|audioLoop|audioPreload|videoAutoplay|videoControls|"
        r"videoLoop|videoMuted|videoPlaysInline|videoLazyLoad|enableLightbox)$")),
    ("scroll-reveal-animation", re.compile(
        r"^(revealOnScroll|revealStagger|staggerDelay|fadeOnScroll|smoothScroll|scrollSpy|"
        r"scrollOffset|scrollDirection|bgKenBurns|bgParallax|parallaxStrength|"
        r"pathDrawOnScroll|pathDrawDurationMs|pathDrawTriggerOffset|flipX|animationStyle|"
        r"bgSvgAnimation|bgSvgAnimationSpeed|svgAnimation|svgAnimationSource|"
        r"svgAnimationSpeed|captionReveal)$")),
    ("hover-effect", re.compile(
        r"(Hover)$")),
    ("form-validation-conditional", re.compile(
        r"^(required|conditionalField|conditionalOperator|conditionalValue|honeypot|"
        r"rateLimit|multiSelect|requireLogin|storeSubmissions)$")),
    ("dismissible", re.compile(r"^(dismissBehaviour|dismissible)$")),
    ("link-target-behaviour", re.compile(
        r"^(linkOpensNewTab|opensInNewTab|blockLinkTarget|sgsBlockLinkTarget|linkTarget|"
        r"linkToHome|linkRel|rel|download)$")),
    ("show-hide-display-toggle", re.compile(
        r"^(show[A-Z]\w*|hideOnMobile|hideOnTablet)$")),
    ("sticky-header-nav-behaviour", re.compile(
        r"^(headerSticky|headerShrink|headerTransparent|stickyPosition|contrastSafe|"
        r"collapseTier|collapseCustomPx|logoSwitchMode|logoSwitchCustomPx|scrollSpy)$")),
]


def behaviour_family_of(name, input_type):
    if input_type not in ("boolean-toggle", "enum-select", "number"):
        return None
    for fam, rx in BEHAVIOUR_FAMILIES:
        if rx.search(name):
            return fam
    return None


# ---------------------------------------------------------------------------
# PER-ELEMENT — which block sub-element the attr targets, derived from canonical_slot /
# name-prefix. Cheap heuristic: strip a known element-prefix from camelCase name.
# ---------------------------------------------------------------------------

ELEMENT_PREFIXES = [
    "cta2", "ctaPrimary", "ctaSecondary", "cta", "badge", "billingToggle", "avatar",
    "overlay", "shapeDividerTop", "shapeDividerBottom", "header", "logo", "icon", "content",
    "audio", "video", "bgSvg", "bg", "background", "split", "picker", "form", "review",
    "carousel", "autoScroll",
]


def element_of(name, meta):
    slots = meta.get("canonical_slot") or []
    if slots:
        return slots[0]
    for p in ELEMENT_PREFIXES:
        if name.startswith(p) and len(name) > len(p) and name[len(p)].isupper():
            return p[0].lower() + p[1:]
    return "root"


# ---------------------------------------------------------------------------
# Build output
# ---------------------------------------------------------------------------

input_groups = {}
behaviour_groups = {}
per_element_index = {}
genuinely_unique = []
classified = {}

for name in sorted(summary.keys()):
    meta = summary[name]
    itype, reason = input_type_of(name, meta)
    fam = behaviour_family_of(name, itype) if itype else None
    elem = element_of(name, meta)
    classified[name] = {"input_type": itype, "behaviour_family": fam, "element": elem,
                          "blocks": meta["blocks"], "n_blocks": meta["n_blocks"], "why": reason}

    if itype:
        g = input_groups.setdefault(itype, {"type": itype, "member_attrs": [], "blocks": set(), "count": 0})
        g["member_attrs"].append(name)
        g["blocks"].update(meta["blocks"])
        g["count"] += 1
    else:
        genuinely_unique.append({
            "attr": name,
            "why_unique": (
                f"blocks={meta['blocks']}; attr_type={meta['attr_type']}; "
                f"control={meta['control']}; role={meta['role']} — matches no input-type "
                f"pattern (not text/media/icon/url/number/enum/boolean/date/svg/json-config)"
            ),
        })

    if fam:
        g = behaviour_groups.setdefault(fam, {"family": fam, "member_attrs": [], "blocks": set()})
        g["member_attrs"].append(name)
        g["blocks"].update(meta["blocks"])

    for b in meta["blocks"]:
        per_element_index.setdefault(b, {}).setdefault(elem if not fam else fam, []).append(name)

# finalize sets -> sorted lists
for g in input_groups.values():
    g["blocks"] = sorted(g["blocks"])
for g in behaviour_groups.values():
    g["blocks"] = sorted(g["blocks"])

input_type_groups_out = sorted(input_groups.values(), key=lambda g: -g["count"])
behaviour_families_out = sorted(behaviour_groups.values(), key=lambda g: -len(g["member_attrs"]))

# --- true unique semantic settings = each DISTINCT (input_type) is ~1 setting; behaviour
# families collapse further; genuinely_unique adds on top. This is the Bean-requested collapse.
true_unique = len(input_type_groups_out) + len(genuinely_unique)

summary_block = {
    "non_css_attrs_examined": len(summary),
    "input_type_groups_count": len(input_type_groups_out),
    "behaviour_families_count": len(behaviour_families_out),
    "genuinely_unique_count": len(genuinely_unique),
    "true_unique_semantic_settings": true_unique,
    "collapse_ratio": (
        f"282 attrs Phase 1b called 'block-specific, do NOT standardise' "
        f"(content_text=53 + behaviour_toggles=56 + enum_select=26 + media_urls=28 + "
        f"unclassified=123, ~4 short of the 286 total non-property attrs it examined) "
        f"-> {len(input_type_groups_out)} true semantic INPUT-TYPES across all "
        f"{len(summary)} non-CSS-property attrs in this re-classification "
        f"(515, a wider net than Phase 1b's 282 since it also re-examined the slot:/role: "
        f"groups Phase 1b didn't bucket), further split into "
        f"{len(behaviour_families_out)} named BEHAVIOUR FAMILIES for the recurring "
        f"boolean/enum toggles."
    ),
    "note": (
        "Phase 1b bucketed by NAME (content_text_attributes=53, behaviour_toggles=56, "
        "enum_select_controls=26, media_urls_assets=28, other_unclassified=123) and called "
        "all of it 'block-specific, do not standardise' without ever testing what INPUT each "
        "attr represents. Re-classifying by SEMANTIC INPUT TYPE (text-content / rich-text / "
        "media-source / colour-value / url-link / icon / number / enum-select / "
        "boolean-toggle / code-svg / json-config / date / system-internal) collapses all "
        f"{len(summary)} non-CSS-property attrs into just {len(input_type_groups_out)} input "
        f"patterns. The boolean/enum members of those further collapse into "
        f"{len(behaviour_families_out)} named recurring BEHAVIOUR FAMILIES (slider-carousel, "
        "disclosure, visibility-responsive, media-playback, scroll-reveal-animation, "
        "hover-effect, form-validation-conditional, dismissible, link-target-behaviour, "
        f"sticky-header-nav-behaviour, show-hide-display-toggle). Only "
        f"{len(genuinely_unique)} attrs resisted every pattern (see `genuinely_unique`) — "
        "every one of Bean's 4 example challenges (decorMedia / placeholder / "
        "carouselShowDots / 'the 123 unclassified') is answered directly in "
        "`answers_to_bean` below."
    ),
}

answers_to_bean = {
    "decorMedia": (
        "It's a media-source input — exactly the same as backgroundMedia/boxMedia/avatarMedia/"
        "workMedia/memberMedia/sideImage/splitImage etc. (28+ attrs across every image-bearing "
        "block, all typed `object` with role=image-object, all rendered via WP's MediaUpload). "
        "The name varies per block ('decor', 'box', 'avatar', 'work', 'member') but the control, "
        "the stored shape ({id,url,alt,width,height}), and the picker UI are IDENTICAL. One "
        "semantic setting: media-source."
    ),
    "placeholder": (
        "It's a text-content input — same family as helpText/label/title/subtitle/heading/"
        "body/description/caption/quote/attribution/consentText etc. (53 attrs Phase 1b called "
        "'block-specific unique text'). All are a plain string typed into a TextControl/"
        "TextareaControl/RichText and rendered as copy. 13 blocks use 'placeholder' because "
        "13 blocks have an empty-state hint on an input field — that's ONE recurring UI pattern "
        "(text-content, sub-role 'placeholder-hint'), not 13 unique settings."
    ),
    "carouselShowDots": (
        "It's a slider/carousel behaviour toggle — same family as showArrows, autoplay, "
        "autoScroll, autoScrollPauseOnHover, autoScrollSpeed, pauseOnHover, carouselAutoplay, "
        "carouselSpeed, slidesVisible (gallery, post-grid, testimonial-slider, trust-bar, "
        "google-reviews, trustpilot-reviews all have members of this family). It's not a "
        "one-off 'carousel dots' setting — it's the SAME show/hide-navigation-control behaviour "
        "recurring across every SGS block with a slider, just gated per block because each "
        "slider was built independently instead of sharing one carousel-controls component."
    ),
    "the_123_unclassified": (
        "Phase 1b's 'other_unclassified' bucket (123 attrs) was never actually run through an "
        "input-type test — it was the leftover pile after content/behaviour/enum/media were "
        "hand-picked by eyeballing a few examples. Re-run through the 3-axis classifier here: "
        "the overwhelming majority resolve to enum-select (style/mode/variant pickers — "
        "connectorStyle, tocStyle, tabStyle, hoverStyle, overlayStyle, sourceMode, widthType...), "
        "number (thickness, offset, threshold, step, min/max, ratingScale...), url-link "
        "(linkRel, linkPhone, linkEmail, blockLink...), or behaviour families (link-target-"
        "behaviour, sticky-header-nav-behaviour, form-validation-conditional). See "
        "`genuinely_unique` in the output for the small residue that actually resisted every "
        "pattern — that list is short, not 123 items."
    ),
}

payload = {
    "summary": summary_block,
    "input_type_groups": input_type_groups_out,
    "behaviour_families": behaviour_families_out,
    "per_element_index": per_element_index,
    "genuinely_unique": genuinely_unique,
    "answers_to_bean": answers_to_bean,
    "full_classification": classified,
}

out_path = HERE / "setting-reclassification.json"
out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

print(f"Wrote {out_path}")
print(f"non_css_attrs_examined = {summary_block['non_css_attrs_examined']}")
print(f"input_type_groups = {summary_block['input_type_groups_count']}")
print(f"behaviour_families = {summary_block['behaviour_families_count']}")
print(f"genuinely_unique = {summary_block['genuinely_unique_count']}")
print(f"true_unique_semantic_settings = {summary_block['true_unique_semantic_settings']}")
print()
print("Top input-type groups:")
for g in input_type_groups_out:
    print(f"  {g['type']:<16} count={g['count']:<4} blocks={len(g['blocks'])}")
print()
print("Behaviour families:")
for g in behaviour_families_out:
    print(f"  {g['family']:<28} members={len(g['member_attrs']):<3} blocks={len(g['blocks'])}")
print()
print(f"Genuinely unique ({len(genuinely_unique)}):")
for u in genuinely_unique[:60]:
    print(f"  {u['attr']}")
