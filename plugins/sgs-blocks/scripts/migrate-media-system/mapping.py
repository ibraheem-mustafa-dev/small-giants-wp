"""The Spec 49 §13 mapping rows as data.

Facts come from the code, not from this file: the base vocabulary, the per-device (tiered) bases and each atom's bases
are read from `includes/media-element-attributes.generated.php` (the PHP mirror of `MediaElementControls.js` and the
atom registry); which blocks declare which slots is read from each `block.json`'s `supports.sgs.mediaElements`; old
defaults, types and the declared attribute names are read from the framework database (read-only, through
`scripts/lib/framework_db.py::framework_db_path`). This file holds only the decisions §13 and Appendix A make: which
old name becomes which new one, and which slots are exempt.
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parents[1]
REPO = PLUGIN.parents[1]
sys.path.insert(0, str(PLUGIN / "scripts" / "lib"))
from framework_db import framework_db_path  # noqa: E402

DEVICES = ("desktop", "tablet", "mobile")
TIERS = ("", "Tablet", "Mobile")
TIER_DEVICE = {"": "desktop", "Tablet": "tablet", "Mobile": "mobile"}

GENERATED_PHP = PLUGIN / "includes" / "media-element-attributes.generated.php"
BLOCKS_DIR = PLUGIN / "src" / "blocks"


def lower_first(text: str) -> str:
    return text[:1].lower() + text[1:]


def attr_name(prefix: str, base: str) -> str:
    """`{prefix}{Base}`, or the base with a lower-case first letter when the prefix is empty (§8)."""
    return prefix + base if prefix else lower_first(base)


# ---------------------------------------------------------------- facts read from the code

@lru_cache(maxsize=1)
def generated_maps() -> dict:
    """{'atoms': {atom: [bases]}, 'tiered': set, 'bases': set} from the generated PHP mirror."""
    text = GENERATED_PHP.read_text(encoding="utf-8")

    def section(name: str) -> str:
        start = text.index(f"'{name}'")
        depth = 0
        first = text.index("array(", start)
        for k in range(first + len("array"), len(text)):
            if text[k] == "(":
                depth += 1
            elif text[k] == ")":
                depth -= 1
                if depth == 0:
                    return text[first : k + 1]
        raise ValueError(name)

    atoms: dict[str, list[str]] = {}
    for m in re.finditer(r'"([a-z-]+)"\s*=>\s*array\(([^)]*)\)', section("atoms")):
        atoms[m.group(1)] = re.findall(r'"([A-Za-z]+)"', m.group(2))
    tiered = set(re.findall(r'"([A-Za-z]+)"', section("tiered")))
    return {"atoms": atoms, "tiered": tiered, "bases": {b for group in atoms.values() for b in group}}


@lru_cache(maxsize=1)
def declared_slots() -> dict:
    """{block: [{prefix, atoms|None, kinds|None}]} from every block.json's supports.sgs.mediaElements."""
    out: dict[str, list[dict]] = {}
    for path in sorted(BLOCKS_DIR.glob("*/block.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        entries = ((data.get("supports") or {}).get("sgs") or {}).get("mediaElements")
        if entries:
            out[data["name"]] = [
                {"prefix": e.get("prefix", ""), "atoms": e.get("atoms"), "kinds": e.get("kinds")} for e in entries
            ]
    return out


def any_block_adopted() -> bool:
    """True once any block declares `kinds` on a media slot: the cutover marker (§8.3)."""
    return any(e["kinds"] for entries in declared_slots().values() for e in entries)


@lru_cache(maxsize=1)
def db_attributes() -> dict:
    """{block: {attr: (type, default_json)}} for source='sgs' attributes; {} when the database is unavailable."""
    path = framework_db_path()
    if not Path(path).is_file():
        return {}
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        out: dict[str, dict] = {}
        for block, attr, kind, default in con.execute(
            "SELECT block_slug, attr_name, attr_type, default_value FROM block_attributes WHERE source='sgs'"
        ):
            out.setdefault(block, {})[attr] = (kind, default)
        return out
    finally:
        con.close()


def old_default(block: str, attr: str):
    """The stored default of an old attribute, parsed from JSON; None when it has none."""
    entry = db_attributes().get(block, {}).get(attr)
    if not entry or entry[1] in (None, ""):
        return None
    try:
        return json.loads(entry[1])
    except ValueError:
        return entry[1]


# ---------------------------------------------------------------- the decisions (§13, Appendix A)

# (block, old entry prefix) -> new slot prefix. An entry missing here and from EXEMPT is named by the survey.
NEW_PREFIX = {
    ("sgs/media", ""): "",
    ("sgs/hero", "split"): "split",
    ("sgs/hero", "splitMedia"): "split",
    ("sgs/before-after", "before"): "before",
    ("sgs/before-after", "after"): "after",
    ("sgs/decorative-image", ""): "layer",
    ("sgs/product-card", "main"): "image",
    ("sgs/product-card", "thumb"): "thumb",
    ("sgs/buybox", "main"): "main",
    ("sgs/buybox", "thumb"): "thumb",
    ("sgs/card-grid", "sgs"): "image",
    ("sgs/post-grid", ""): "image",
    ("sgs/gallery", "sgs"): "item",
    ("sgs/team-member", "sgs"): "photo",
    ("sgs/testimonial", "avatar"): "avatar",
    ("sgs/testimonial", "work"): "work",
    ("sgs/trust-bar", "badgeImage"): "badge",
    ("sgs/option-picker", "swatch"): "swatch",
    ("sgs/measured-diagram", "drawing"): "drawing",
    ("sgs/image-sequence", ""): "thumbnail",
    ("sgs/brand-strip", ""): "logo",
}

# Small fixed thumbnails and non-media uses (Appendix A): not slots, nothing to migrate.
EXEMPT = {
    ("sgs/cart", ""): "small fixed thumbnail, keeps its own attributes (Appendix A)",
    ("sgs/google-reviews", ""): "remote avatar, keeps its own attributes (Appendix A)",
    ("sgs/mega-panel", ""): "drawer card thumbnail, keeps its own attributes (Appendix A)",
    ("sgs/product-search", ""): "search result thumbnail, keeps its own attributes (Appendix A)",
}

# Blocks whose background family moves to slot `background` (Appendix A).
BACKGROUND_BLOCKS = (
    "sgs/container", "sgs/hero", "sgs/trust-bar", "sgs/multi-button", "sgs/physics-canvas", "sgs/site-header",
    "sgs/site-footer", "sgs/nav-drawer",
)

# Old base -> (family, new base). `new base` is `{prefix}{Base}`-named through attr_name, or a dotted path into Source.
BASE_FAMILY = {
    "ImageId": ("source", "Source"), "ImageUrl": ("source", "Source"), "VideoId": ("source", "Source"),
    "VideoUrl": ("source", "Source"), "SvgContent": ("source", "Source"), "Thumbnail": ("source", "Source.poster"),
    "ThumbnailId": ("source", "Source.poster"), "MediaType": ("source", "Source.kind"),
    "VideoSource": ("source", "Source.kind"), "VideoMimeType": ("source", "Source.mime"),
    "ImageWidth": ("source", "Source.width"), "ImageHeight": ("source", "Source.height"),
    "VideoCaptionsId": ("source", "Source.captions"), "VideoCaptionsUrl": ("source", "Source.captions"),
    "VideoCaptionsLabel": ("source", "Source.captions"), "VideoCaptionsSrcLang": ("source", "Source.captions"),
    "ImageAlt": ("alt", "Alt"), "VideoAlt": ("alt", "Source.alt"), "ImageDecorative": ("alt", "Decorative"),
    "VideoAutoplay": ("playback", "Playback"), "VideoLoop": ("playback", "Playback"),
    "VideoMuted": ("playback", "Playback"), "VideoControls": ("playback", "Playback"),
    "VideoPlaysInline": ("playback", "Playback"), "VideoLazyLoad": ("playback", "Playback"),
    "LottieId": ("report", "Lottie is not a media kind: resolved by hand"),
    "LottieTrigger": ("report", "Lottie is not a media kind: resolved by hand"),
    "LottieSpeed": ("report", "Lottie is not a media kind: resolved by hand"),
    "SvgAnimation": ("report", "Effects SVG loop on the SVG part (WP-10a data)"),
    "SvgAnimationSpeed": ("report", "Effects SVG loop on the SVG part (WP-10a data)"),
    "SvgOpacity": ("opacity", "Opacity"), "SvgPosition": ("svglayer", "SvgLayer"),
    "SvgMinHeight": ("sizing", "MinHeight"), "SvgTextShadow": ("keep", "SvgTextShadow"),
    "ObjectFit": ("fit", "Fit"), "Size": ("fit", "Fit"), "ObjectPosition": ("focal", "Focal"),
    "Position": ("focal", "Focal"), "Repeat": ("fit", "Repeat"), "Attachment": ("fit", "Pinned"),
    "MediaSizing": ("sizing", "Height"), "AspectRatio": ("sizing", "Ratio"), "Height": ("sizing", "Height"),
    "Width": ("sizing", "Width"), "MaxHeight": ("sizing", "MaxHeight"), "MaxWidth": ("sizing", "MaxWidth"),
    "MinHeight": ("sizing", "MinHeight"), "Shape": ("shape", "Shape"), "BorderRadius": ("radius", "Radius"),
    "BorderWidth": ("keep", "BorderWidth"), "BorderStyle": ("keep", "BorderStyle"),
    "BorderColour": ("keep", "BorderColour"), "BorderColourGradient": ("keep", "BorderColourGradient"),
    "OverlayColour": ("keep", "OverlayColour"), "OverlayColourHover": ("keep", "OverlayColourHover"),
    "OverlayGradient": ("keep", "OverlayGradient"), "OverlayGradientHover": ("keep", "OverlayGradientHover"),
    "OverlayOpacity": ("overlayopacity", "OverlayOpacity"), "OverlayBlendMode": ("rename", "OverlayBlend"),
    "Opacity": ("opacity", "Opacity"), "BoxShadow": ("keep", "BoxShadow"), "BoxShadowColour": ("keep", "BoxShadowColour"),
    "BoxShadowColourHover": ("keep", "BoxShadowColourHover"), "Padding": ("keep", "Padding"),
    "Caption": ("keep", "Caption"), "CaptionTag": ("keep", "CaptionTag"), "LinkUrl": ("keep", "LinkUrl"),
    "LinkOpensNewTab": ("keep", "LinkOpensNewTab"), "LinkRel": ("keep", "LinkRel"), "LinkUrlSource": ("keep", "LinkUrlSource"),
}

# Old attributes outside the prefix grammar: (block, old name) -> (family, full new attribute name or note).
EXTRA = {
    ("sgs/media", "displayWidth"): ("delete", "deleted (§13): sizes are derived"),
    ("sgs/media", "imageBlendMode"): ("rename", "blend"),
    ("sgs/media", "alignment"): ("alignment", "alignment"),
    ("sgs/hero", "splitMediaDecorative"): ("alt", "splitDecorative"),
    ("sgs/hero", "splitMediaAlign"): ("alignment", "splitAlignment"),
    ("sgs/hero", "splitMediaAspectRatio"): ("sizing", "splitRatio"),
    ("sgs/hero", "splitMediaBackground"): ("rename", "splitBackground"),
    ("sgs/hero", "splitMediaWidthUnit"): ("delete", "retired length-unit partner: folded into the width value"),
    ("sgs/hero", "splitMediaHeightUnit"): ("delete", "retired length-unit partner: folded into the height value"),
    ("sgs/hero", "splitMediaMaxWidthUnit"): ("delete", "retired length-unit partner: folded into the value"),
    ("sgs/hero", "splitMediaMaxHeightUnit"): ("delete", "retired length-unit partner: folded into the value"),
    ("sgs/hero", "mediaPadding"): ("rename", "splitPadding"),
    ("sgs/hero", "mediaBackground"): ("rename", "splitBackground"),
    ("sgs/hero", "mediaBackgroundGradient"): ("report", "no Background gradient form in §8"),
    ("sgs/product-card", "image"): ("source", "imageSource"),
    ("sgs/product-card", "imageId"): ("source", "imageSource"),
    ("sgs/product-card", "imageFill"): ("sizing", "imageHeight"),
    ("sgs/product-card", "imageAspectRatio"): ("sizing", "imageRatio"),
    ("sgs/product-card", "imageSize"): ("delete", "deleted (§13): sizes are derived"),
    ("sgs/product-card", "mediaBackgroundColour"): ("rename", "imageBackground"),
    ("sgs/card-grid", "imageSize"): ("delete", "deleted (§13): sizes are derived"),
    ("sgs/post-grid", "imageSize"): ("delete", "deleted (§13): sizes are derived"),
    ("sgs/gallery", "imageSize"): ("delete", "deleted (§13): sizes are derived"),
    ("sgs/card-grid", "aspectRatio"): ("sizing", "imageRatio"),
    ("sgs/post-grid", "aspectRatio"): ("sizing", "imageRatio"),
    ("sgs/gallery", "aspectRatio"): ("sizing", "itemRatio"),
    ("sgs/card-grid", "imageHeight"): ("sizing", "imageHeight"),
    ("sgs/post-grid", "imageHeight"): ("sizing", "imageHeight"),
    ("sgs/timeline", "mediaHeight"): ("sizing", "entryHeight"),
    ("sgs/timeline", "mediaAspectRatio"): ("sizing", "entryRatio"),
    ("sgs/timeline", "mediaBorderRadius"): ("rename", "entryRadius"),
    ("sgs/timeline", "milestoneMediaWidth"): ("sizing", "entryWidth"),
    ("sgs/trust-bar", "badgeImageSize"): ("sizing", "badgeWidth"),
    ("sgs/brand-strip", "tileShape"): ("shape", "logoShape"),
    ("sgs/brand-strip", "logoFit"): ("fit", "logoFit"),
    ("sgs/trust-bar", "badgeImageObjectFit"): ("fit", "badgeFit"),
    ("sgs/brand-strip", "imageEffect"): ("report", "grey to colour belongs to Hover (decision pending)"),
    ("sgs/team-member", "photo"): ("source", "photoSource"),
    ("sgs/team-member", "photoTablet"): ("source", "photoSource"),
    ("sgs/team-member", "photoMobile"): ("source", "photoSource"),
    ("sgs/team-member", "photoDecorative"): ("alt", "photoDecorative"),
    ("sgs/team-member", "photoShape"): ("shape", "photoShape"),
    ("sgs/testimonial", "avatarMedia"): ("source", "avatarSource"),
    ("sgs/testimonial", "avatarMediaTablet"): ("source", "avatarSource"),
    ("sgs/testimonial", "avatarMediaMobile"): ("source", "avatarSource"),
    ("sgs/testimonial", "avatarDecorative"): ("alt", "avatarDecorative"),
    ("sgs/testimonial", "orgLogo"): ("source", "logoSource"),
    ("sgs/testimonial", "orgLogoDecorative"): ("alt", "logoDecorative"),
    ("sgs/testimonial", "workMedia"): ("source", "workSource"),
    ("sgs/testimonial", "workMediaDecorative"): ("alt", "workDecorative"),
    ("sgs/image-sequence", "thumbnail"): ("source", "thumbnailSource"),
    ("sgs/image-sequence", "thumbnailTablet"): ("source", "thumbnailSource"),
    ("sgs/image-sequence", "thumbnailMobile"): ("source", "thumbnailSource"),
    ("sgs/image-sequence", "thumbnailAlt"): ("alt", "thumbnailAlt"),
    ("sgs/image-sequence", "thumbnailDecorative"): ("alt", "thumbnailDecorative"),
    ("sgs/image-sequence", "aspectRatio"): ("sizing", "thumbnailRatio"),
    ("sgs/option-picker", "swatchShape"): ("shape", "swatchShape"),
    ("sgs/buybox", "galleryStickerShape"): ("shape", "galleryStickerShape"),
    ("sgs/measured-diagram", "drawingImageId"): ("source", "drawingSource"),
    ("sgs/measured-diagram", "drawingImageUrl"): ("source", "drawingSource"),
    ("sgs/measured-diagram", "drawingImageAlt"): ("alt", "drawingAlt"),
    ("sgs/measured-diagram", "drawingImageDecorative"): ("alt", "drawingDecorative"),
    ("sgs/decorative-image", "decorMedia"): ("source", "layerSource"),
    ("sgs/decorative-image", "shape"): ("shape", "layerShape"),
    ("sgs/decorative-image", "hideOnTablet"): ("hideon", "sgsHideOnTablet"),
    ("sgs/decorative-image", "hideOnMobile"): ("hideon", "sgsHideOnMobile"),
    ("sgs/responsive-logo", "logoId"): ("source", "logoSource"),
    ("sgs/responsive-logo", "logoUrl"): ("source", "logoSource"),
    ("sgs/responsive-logo", "logoIdTablet"): ("source", "logoSource"),
    ("sgs/responsive-logo", "logoUrlTablet"): ("source", "logoSource"),
    ("sgs/responsive-logo", "logoIdMobile"): ("source", "logoSource"),
    ("sgs/responsive-logo", "logoUrlMobile"): ("source", "logoSource"),
    ("sgs/responsive-logo", "darkLogoId"): ("source", "logoDarkSource"),
    ("sgs/responsive-logo", "logoDecorative"): ("alt", "logoDecorative"),
    ("sgs/responsive-logo", "inlineSvg"): ("report", "inline SVG Source plus SvgParts: shape set by WP-9"),
    ("sgs/nav-drawer", "chromeLogoId"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoUrl"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoIdTablet"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoUrlTablet"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoIdMobile"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoUrlMobile"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoAlt"): ("alt", "chromeLogoAlt"),
    ("sgs/nav-drawer", "chromeLogoInlineSvg"): ("report", "inline SVG Source plus SvgParts: shape set by WP-9"),
    ("sgs/nav-drawer", "backgroundImageDecorative"): ("alt", "backgroundDecorative"),
    ("sgs/before-after", "videoAutoplay"): ("report", "folds into Playback per side: needs each side's video kind"),
    ("sgs/before-after", "videoAutoplayTablet"): ("report", "folds into Playback per side: needs each side's video kind"),
    ("sgs/before-after", "videoAutoplayMobile"): ("report", "folds into Playback per side: needs each side's video kind"),
    ("sgs/choice-flow", "headerLogo"): ("source", "headerLogoSource"),
    ("sgs/buybox", "mainPhotoRadius"): ("radius", "mainRadius"),
    ("sgs/buybox", "galleryThumbBorderRadius"): ("radius", "thumbRadius"),
    ("sgs/buybox", "mainPhotoBorderStyle"): ("rename", "mainBorderStyle"),
    ("sgs/buybox", "mainPhotoBorderColour"): ("rename", "mainBorderColour"),
    ("sgs/buybox", "mainPhotoBorderWidth"): ("rename", "mainBorderWidth"),
    ("sgs/buybox", "mainPhotoShadow"): ("rename", "mainBoxShadow"),
    ("sgs/buybox", "mainPhotoShadowColour"): ("rename", "mainBoxShadowColour"),
    ("sgs/buybox", "mainPhotoBackgroundColour"): ("rename", "mainBackground"),
    ("sgs/buybox", "galleryThumbBorderStyle"): ("rename", "thumbBorderStyle"),
    ("sgs/buybox", "galleryThumbBorderColour"): ("rename", "thumbBorderColour"),
    ("sgs/buybox", "galleryThumbBorderWidth"): ("rename", "thumbBorderWidth"),
    ("sgs/buybox", "previewImageId"): ("report", "preview image Source: slot named by WP-9"),
    ("sgs/responsive-logo", "svgParts"): ("report", "inline SVG Source plus SvgParts: shape set by WP-9"),
    ("sgs/responsive-logo", "svgPartsTrigger"): ("report", "inline SVG Source plus SvgParts: shape set by WP-9"),
    ("sgs/nav-drawer", "chromeLogoSvgParts"): ("report", "inline SVG Source plus SvgParts: shape set by WP-9"),
    ("sgs/nav-drawer", "chromeLogoSvgPartsTrigger"): ("report", "inline SVG Source plus SvgParts: shape set by WP-9"),
}

# Bases a slot owns beyond its declared atoms: the block stores them under the same grammar without declaring the atom.
SOURCE_BASES = ("ImageId", "ImageUrl", "VideoId", "VideoUrl", "SvgContent", "MediaType", "ImageAlt", "VideoAlt", "ImageDecorative")
SLOT_EXTRA_BASES = {
    ("sgs/decorative-image", "layer"): ("ImageId", "ImageUrl", "ImageAlt", "ImageDecorative"),
    ("sgs/hero", "split"): ("ImageAlt",),
    ("sgs/media", ""): ("ImageWidth", "ImageHeight"),
    ("sgs/before-after", "before"): SOURCE_BASES,
    ("sgs/before-after", "after"): SOURCE_BASES,
}

# Old attributes §13 leaves on the block: measurement data, not display settings.
STAYS = {
    "sgs/measured-diagram": ("drawingImageWidth", "drawingImageHeight"),
    "sgs/container": ("boxAspectRatio",),
    "sgs/responsive-logo": ("logoSwitchCustomPx", "logoSwitchMode", "width", "maxWidth", "maxHeight", "shrinkWidth"),
    "sgs/nav-drawer": ("chromeLogoWidth", "chromeLogoLink", "chromeLogoShow", "chromeLogoBoxBg", "chromeLogoBoxBgGradient",
                       "chromeLogoBoxPadding", "chromeLogoBoxRadius", "chromeLogoBoxShadow", "chromeLogoBoxShadowColour",
                       "chromeLogoAlt"),
    "sgs/product-card": ("imageAlt", "imageDecorative", "brandUseLogo", "showGalleryThumbs", "noImageLabel", "thumbsFlexWrap"),
    "sgs/brand-strip": ("logoGap", "logoLayout", "logoMaxWidth", "logoOpacity"),
    "sgs/mega-panel": ("drawerCardThumbSize", "drawerCardMediaHeight", "drawerCardMediaRatio"),
    "sgs/choice-flow": ("headerLogoHeight", "optionMediaSize"),
    "sgs/choice-flow-question": ("optionMediaSize",),
    "sgs/card-grid": ("imagePadding", "imageFallback", "imageFallbackColour", "noImageLabel", "noImageLabelColour"),
    "sgs/buybox": ("thumbGap", "thumbsPerRow", "thumbSelectedScale", "thumbStripOffset", "thumbsFlexWrap"),
}

# Hover and effect attributes (§13 "Hover effects on the media part", "Motion layers on old parts"): the target is
# Effects data owned by WP-10a, so the detector reports and refuses them until that shape exists.
REPORT_ALWAYS = {
    "sgsObjectPosition": "Focal (universal image-controls extension: per-block target)",
    "sgsObjectFit": "Fit (universal image-controls extension: per-block target)",
    "imageZoomHover": "Hover effect on the media part (WP-10a)",
    "scaleHover": "Hover effect on the media part (WP-10a)",
    "grayscaleHover": "Hover effect on the media part (WP-10a)",
    "sgsColourTreatment": "Colour (natural, greyscale, white) or Hover filter (WP-10a)",
}
REPORT_PATTERNS = (re.compile(r"^sgsHoverZoom"),)

# Old background names shared by container, hero, trust-bar, multi-button, physics-canvas, site header and footer and
# nav-drawer: (old name, family, new name).
BACKGROUND_OLD = (
    ("backgroundImage", "bgsource", "backgroundSource"), ("backgroundImageTablet", "bgsource", "backgroundSource"),
    ("backgroundImageMobile", "bgsource", "backgroundSource"), ("bgVideo", "bgsource", "backgroundSource"),
    ("bgVideoTablet", "bgsource", "backgroundSource"), ("bgVideoMobile", "bgsource", "backgroundSource"),
    ("bgSvgContent", "bgsource", "backgroundSource"), ("backgroundSize", "bgfit", "backgroundFit"),
    ("backgroundPosition", "bgfit", "backgroundFocal"), ("backgroundRepeat", "bgfit", "backgroundRepeat"),
    ("backgroundAttachment", "bgfit", "backgroundPinned"), ("bgSvgOpacity", "bgsvg", "backgroundOpacity"),
    ("bgSvgMinHeight", "bgsvg", "minHeight"), ("bgSvgPosition", "bgsvg", "backgroundSvgLayer"),
    ("bgSvgTextShadow", "bgsvg", "backgroundSvgTextShadow"), ("bgSvgParts", "bgsvg", "backgroundSvgParts"),
    ("bgSvgPartsTrigger", "bgsvg", "backgroundSvgPartsTrigger"),
    ("backgroundOverlayBlendMode", "bgoverlay", "backgroundOverlayBlend"),
)

# Rows whose old name renames only the prefix (family keep/rename): the new name is {new prefix}{new base}.
NAME_FAMILIES = ("keep", "rename", "fit", "focal", "opacity", "overlayopacity", "radius", "shape", "sizing", "alt", "svglayer")


def slots_for(block: str) -> list[dict]:
    """Slot specs of a block: one per `mediaElements` entry that is neither exempt nor unlisted."""
    maps = generated_maps()
    out = []
    for entry in declared_slots().get(block, []):
        key = (block, entry["prefix"])
        if key in EXEMPT or key not in NEW_PREFIX:
            continue
        atoms = entry["atoms"] or list(maps["atoms"])
        bases = {b for a in atoms for b in maps["atoms"].get(a, [])} | set(SLOT_EXTRA_BASES.get((block, NEW_PREFIX[key]), ()))
        out.append({"block": block, "old": entry["prefix"], "new": NEW_PREFIX[key], "bases": sorted(bases)})
    return out


def merged_slots(block: str) -> list[dict]:
    """A block's slots with entries sharing a new prefix merged (hero's `split` and `splitMedia`)."""
    merged: dict[str, dict] = {}
    for slot in slots_for(block):
        item = merged.setdefault(slot["new"], {"block": block, "new": slot["new"], "olds": [], "bases": set()})
        item["olds"].append(slot["old"])
        item["bases"] |= set(slot["bases"])
    return [dict(v, bases=sorted(v["bases"])) for v in merged.values()]


def new_target(family: str, target: str, new_prefix: str) -> str:
    """The attribute name (or Source path) a base row lands in."""
    if target.startswith("Source"):
        return attr_name(new_prefix, "Source") + target[len("Source"):]
    if family in NAME_FAMILIES:
        return attr_name(new_prefix, target)
    return target if family not in ("playback",) else attr_name(new_prefix, target)


@lru_cache(maxsize=1)
def rows() -> list[dict]:
    """Every mapping row {block, old, family, target, new_prefix, base, tier}, generated from the facts above."""
    tiered = generated_maps()["tiered"]
    out: list[dict] = []
    for block in sorted(declared_slots()):
        for slot in merged_slots(block):
            for old_prefix in slot["olds"]:
                for base in slot["bases"]:
                    family, target = BASE_FAMILY.get(base, ("refuse", "no mapping"))
                    named = family != "report" and family != "refuse"
                    for tier in TIERS if base in tiered or base in ("MediaType", "ImageAlt") else ("",):
                        out.append({
                            "block": block, "old": attr_name(old_prefix, base + tier), "family": family,
                            "target": new_target(family, target, slot["new"]) if named else target,
                            "new_prefix": slot["new"], "base": base, "tier": tier,
                        })
    for (block, old), (family, target) in sorted(EXTRA.items()):
        out.append({"block": block, "old": old, "family": family, "target": target, "new_prefix": None, "base": None, "tier": ""})
    for block in BACKGROUND_BLOCKS:
        for old, family, target in BACKGROUND_OLD:
            out.append({"block": block, "old": old, "family": family, "target": target, "new_prefix": "background", "base": None, "tier": ""})
    for old, reason in REPORT_ALWAYS.items():
        out.append({"block": "*", "old": old, "family": "report", "target": reason, "new_prefix": None, "base": None, "tier": ""})
    return out
