"""The Spec 49 §13 mapping rows as data.

The facts the rows rest on are frozen in `mapping-frozen.json` beside this file: the base vocabulary, the per-device
(tiered) bases and each atom's bases (from `includes/media-element-attributes.generated.php`), the pre-adoption
`supports.sgs.mediaElements` entries and attribute names of every block (from each `block.json`), the old defaults and
types (from the framework database) and the mapping rows built from them. Stage B rewrites or deletes all of those
sources, so every reader (`rows`, `survey`, `fix`, `check`, `self-test`) reads the frozen file only. `regenerate()`
rebuilds it from the live files and refuses once any block declares `kinds` (the cutover marker, §8.3). This file holds
the decisions §13 and Appendix A make: which old name becomes which new one, which attributes stay and why, and which
slots are exempt.
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
def live_generated_maps() -> dict:
    """{'atoms': {atom: [bases]}, 'tiered': [..]} read from the generated PHP mirror (regeneration only)."""
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
    return {"atoms": atoms, "tiered": sorted(tiered)}


@lru_cache(maxsize=1)
def live_declared_slots() -> dict:
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


EXTENSION_PHP = PLUGIN / "includes" / "extension-attributes.generated.php"


@lru_cache(maxsize=1)
def live_declared_attributes() -> dict:
    """{block name: attribute names it takes}: its block.json on disk plus the universal `sgs*` extension attributes the plugin
    injects into every block (sgsHideOnTablet and the rest). Read once per run (guard against writing a name the block dropped)."""
    extensions = set(re.findall(r"^\s*'(sgs[A-Za-z0-9]+)'\s*=>", EXTENSION_PHP.read_text(encoding="utf-8"), re.M)) if EXTENSION_PHP.is_file() else set()
    out: dict[str, set[str]] = {}
    for path in sorted(BLOCKS_DIR.glob("*/block.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("name"):
            motion = {"sgsMotion"} if (data.get("supports") or {}).get("sgs", {}).get("motion") else set()
            out[data["name"]] = set(data.get("attributes") or {}) | extensions | motion
    return out


def any_block_adopted() -> bool:
    """True once any block declares `kinds` on a media slot: the cutover marker (§8.3)."""
    return any(e["kinds"] for entries in live_declared_slots().values() for e in entries)


ADOPTION_MAP = PLUGIN / "scripts" / "data" / "media-adoption.json"


def adopted_blocks() -> set[str]:
    """Blocks whose block.json declares `kinds` on at least one media slot."""
    return {b for b, entries in live_declared_slots().items() if any(e["kinds"] for e in entries)}


@lru_cache(maxsize=1)
def migration_scope() -> frozenset[str] | None:
    """The blocks `fix` rewrites and `check` enforces under `--active auto`.

    While Stage B adopts wave by wave, only the adopted blocks: rewriting a block that has not adopted would hand its
    render.php attributes it cannot read. Once every block `media-adoption.json` lists has adopted, None (every block).
    """
    listed: set[str] = set()
    if ADOPTION_MAP.is_file():
        for wave in json.loads(ADOPTION_MAP.read_text(encoding="utf-8")).get("waves", []):
            listed |= set(wave.get("blocks", {}))
    adopted = adopted_blocks()
    if listed and not listed <= adopted:
        return frozenset(adopted)
    return None


def live_db_attributes() -> dict:
    """{block: {attr: [type, default_json]}} for source='sgs' attributes of the framework database (regeneration only)."""
    path = framework_db_path()
    if not Path(path).is_file():
        raise SystemExit(f"regenerate needs the framework database: {path} is missing")
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        out: dict[str, dict] = {}
        for block, attr, kind, default in con.execute(
            "SELECT block_slug, attr_name, attr_type, default_value FROM block_attributes WHERE source='sgs'"
        ):
            out.setdefault(block, {})[attr] = [kind, default]
        return out
    finally:
        con.close()


# ---------------------------------------------------------------- the frozen facts

FROZEN = HERE / "mapping-frozen.json"


@lru_cache(maxsize=1)
def frozen() -> dict:
    """The committed facts: atoms, tiered, declared, attributes, dbAttributes, rows."""
    return json.loads(FROZEN.read_text(encoding="utf-8"))


def generated_maps() -> dict:
    data = frozen()
    return {"atoms": data["atoms"], "tiered": set(data["tiered"]), "bases": {b for group in data["atoms"].values() for b in group}}


def declared_slots() -> dict:
    """{block: [{prefix, atoms|None, kinds|None}]} as the blocks declared them before adoption."""
    return frozen()["declared"]


def block_attribute_names(block: str) -> list[str]:
    """The attribute names a block declared before adoption (generated ones excluded)."""
    return frozen()["attributes"].get(block, [])


def db_attributes() -> dict:
    """{block: {attr: (type, default_json)}} frozen from the framework database."""
    return {b: {a: tuple(v) for a, v in attrs.items()} for b, attrs in frozen()["dbAttributes"].items()}


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

# The attributes a "fold" EXTRA row writes (its row target is a note, not a name): known to the unmapped-attribute check.
FOLD_TARGETS = {"sgs/before-after": ("beforePlayback", "afterPlayback")}

# Old values the old render clamped before drawing: (block, old name) -> (lowest, highest). The migration writes what was drawn.
CLAMPS = {("sgs/trust-bar", "badgeImageSize"): (24, 160)}
# The old default of a clamped number: the new block's own default is the same, so the saved value is dropped.
CLAMP_DEFAULTS = {("sgs/trust-bar", "badgeImageSize"): 60}

# Blocks whose old Shape string drew only the values listed (the new Shape each becomes); any other value painted nothing.
# option-picker's colour dot has a 3px stylesheet radius, so "square" (radius 0) is an explicit none, never a deleted default.
OLD_SHAPE_DRAWN = {
    "sgs/option-picker": {"round": "circle", "square": "none"},
    # brand-strip's tile: "none" is the no-card tile; "square" is the old default (the tile the stylesheet already draws)
    "sgs/brand-strip": {"circle": "circle", "none": "none"},
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
    ("sgs/trust-bar", "badgeImageBorderRadius"): ("radius", "badgeRadius"),
    ("sgs/product-card", "brandLogoHeight"): ("sizing", "logoHeight"),
    ("sgs/product-card", "brandLogoWidth"): ("sizing", "logoWidth"),
    ("sgs/product-card", "brandLogoMaxHeight"): ("sizing", "logoMaxHeight"),
    ("sgs/product-card", "brandLogoMaxWidth"): ("sizing", "logoMaxWidth"),
    ("sgs/hero", "splitMediaBorderColourHover"): ("report", "Hover effect on the media part (WP-10a)"),
    ("sgs/hero", "splitMediaBorderColourHoverGradient"): ("report", "Hover effect on the media part (WP-10a)"),
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
    ("sgs/measured-diagram", "drawingImageId"): ("source", "drawingSource"),
    ("sgs/measured-diagram", "drawingImageUrl"): ("source", "drawingSource"),
    ("sgs/measured-diagram", "drawingImageAlt"): ("alt", "drawingAlt"),
    ("sgs/measured-diagram", "drawingImageDecorative"): ("alt", "drawingDecorative"),
    ("sgs/decorative-image", "decorMedia"): ("source", "layerSource"),
    ("sgs/decorative-image", "shape"): ("shape", "layerShape"),
    ("sgs/decorative-image", "opacity"): ("opacity", "layerOpacity"),
    ("sgs/decorative-image", "width"): ("sizing", "layerWidth"),
    ("sgs/decorative-image", "maxWidth"): ("sizing", "layerMaxWidth"),
    ("sgs/decorative-image", "height"): ("sizing", "layerHeight"),
    ("sgs/decorative-image", "borderRadius"): ("radius", "layerRadius"),
    ("sgs/decorative-image", "borderWidth"): ("rename", "layerBorderWidth"),
    ("sgs/decorative-image", "borderStyle"): ("rename", "layerBorderStyle"),
    ("sgs/decorative-image", "borderColour"): ("rename", "layerBorderColour"),
    ("sgs/decorative-image", "borderColourGradient"): ("rename", "layerBorderColourGradient"),
    ("sgs/decorative-image", "boxShadow"): ("rename", "layerBoxShadow"),
    ("sgs/decorative-image", "boxShadowColour"): ("rename", "layerBoxShadowColour"),
    ("sgs/decorative-image", "boxShadowColourHover"): ("rename", "layerBoxShadowColourHover"),
    ("sgs/decorative-image", "boxShadowHover"): ("report", "the Hover panel owns lift: shadow on hover is Effects data (WP-10a)"),
    ("sgs/decorative-image", "backgroundColour"): ("rename", "layerBackground"),
    ("sgs/decorative-image", "backgroundColourGradient"): ("report", "no Background gradient form in §8"),
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
    ("sgs/responsive-logo", "alt"): ("alt", "logoAlt"),
    ("sgs/nav-drawer", "chromeLogoId"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoUrl"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoIdTablet"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoUrlTablet"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoIdMobile"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoUrlMobile"): ("source", "chromeLogoSource"),
    ("sgs/nav-drawer", "chromeLogoAlt"): ("alt", "chromeLogoAlt"),
    ("sgs/nav-drawer", "backgroundImageDecorative"): ("alt", "backgroundDecorative"),
    ("sgs/before-after", "videoAutoplay"): ("fold", "beforePlayback and afterPlayback autoplay: written for each side whose Source is a video"),
    ("sgs/before-after", "videoAutoplayTablet"): ("fold", "beforePlayback and afterPlayback autoplay: written for each side whose Source is a video"),
    ("sgs/before-after", "videoAutoplayMobile"): ("fold", "beforePlayback and afterPlayback autoplay: written for each side whose Source is a video"),
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
    ("sgs/buybox", "previewBorderWidth"): ("sides", "previewBorderWidth"),
    ("sgs/buybox", "previewRadius"): ("radius", "previewRadius"),
    ("sgs/buybox", "galleryThumbBorderColourHover"): ("rename", "thumbBorderColourHover"),
    ("sgs/product-card", "imageHeight"): ("sizing", "imageHeight"),
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

# Old attributes §13 leaves on the block, each with its reason: (block, reason) -> attributes. A block's media attribute
# that is neither a mapping row nor listed here is reported as "unmapped legacy attribute" by `fix`, `survey` and `check`.
_STAYS_GROUPS = (
    ("sgs/measured-diagram", "measurement data, not a display setting (§13)", ("drawingImageWidth", "drawingImageHeight")),
    ("sgs/container", "layout, not media: the box ratio stays (§13)", ("boxAspectRatio",)),
    ("sgs/responsive-logo", "logo switching and sizing are the block's own layout (Appendix A)",
     ("logoSwitchCustomPx", "logoSwitchMode", "width", "maxWidth", "maxHeight", "shrinkWidth")),
    ("sgs/responsive-logo", "the inline-SVG logo and its animated parts are the block's own attributes, declared in its block.json (Appendix A)",
     ("inlineSvg", "svgParts", "svgPartsTrigger", "svgPartsHoverCooldown")),
    ("sgs/nav-drawer", "the drawer's inline-SVG logo and its animated parts are the block's own attributes, declared in its block.json (Appendix A)",
     ("chromeLogoInlineSvg", "chromeLogoSvgParts", "chromeLogoSvgPartsTrigger", "chromeLogoSvgPartsHoverCooldown")),
    ("sgs/nav-drawer", "chrome logo box and link are the drawer's own layout (Appendix A)",
     ("chromeLogoWidth", "chromeLogoLink", "chromeLogoShow", "chromeLogoBoxBg", "chromeLogoBoxBgGradient", "chromeLogoBoxPadding",
      "chromeLogoBoxRadius", "chromeLogoBoxShadow", "chromeLogoBoxShadowColour", "chromeLogoAlt")),
    ("sgs/product-card", "card behaviour, not a slot setting: alt and decorative stay, the gallery strip and labels stay (Appendix A)",
     ("imageAlt", "imageDecorative", "brandUseLogo", "showGalleryThumbs", "noImageLabel", "thumbsFlexWrap")),
    ("sgs/brand-strip", "strip layout needs a common size (Appendix A)", ("logoGap", "logoLayout", "logoMaxWidth", "logoOpacity")),
    ("sgs/brand-strip", "the items array is rewritten by the items migration, not by a row", ("logos",)),
    ("sgs/mega-panel", "drawer card thumbnail is exempt (Appendix A)", ("drawerCardThumbSize", "drawerCardMediaHeight", "drawerCardMediaRatio")),
    ("sgs/mega-panel", "accent panel surface image on an exempt block (Appendix A): it keeps its own attributes",
     ("accentBackgroundImage", "accentBackgroundImageGradient")),
    ("sgs/choice-flow", "flow chrome sizing stays (Appendix A)", ("headerLogoHeight", "optionMediaSize")),
    ("sgs/choice-flow", "the summary photo is built by summary.js with explicit size: the toggle stays (Appendix A)", ("summaryShowImage",)),
    ("sgs/choice-flow-question", "flow chrome sizing stays (Appendix A)", ("optionMediaSize",)),
    ("sgs/card-grid", "empty-state and padding of the card, not the photo (Appendix A)",
     ("imagePadding", "imageFallback", "imageFallbackColour", "noImageLabel", "noImageLabelColour")),
    ("sgs/product-card", "empty-state label colour, not the photo (Appendix A)", ("noImageLabelColour",)),
    ("sgs/buybox", "thumbnail strip layout and states stay with the block (Appendix A: thumbnail strip, thumbSelectedScale)",
     ("thumbGap", "thumbsPerRow", "thumbSelectedScale", "thumbStripOffset", "thumbsFlexWrap")),
    ("sgs/buybox", "the strip's fixed thumbnail size is strip layout, read as a CSS custom property by extras.php",
     ("galleryThumbSize",)),
    ("sgs/buybox", "hover and selected states of the thumbnail strip belong to the strip (Appendix A: thumbnail strip)",
     ("galleryThumbBorderColourHover", "galleryThumbBorderColourCurrent")),
    ("sgs/post-grid", "the show-image toggle stays (Appendix A: post-grid showImage)", ("showImage",)),
    ("sgs/post-grid", "the new Decorative has the same name (imageDecorative): nothing to move", ("imageDecorative",)),
    ("sgs/trust-bar", "the badge shadow stays on the item (Appendix A: trust-bar badge)",
     ("badgeImageShadow", "badgeImageShadowColour", "badgeImageShadowColourHover")),
    ("sgs/before-after", "slider caption text, not media", ("beforeLabel", "afterLabel")),
    ("sgs/gallery", "the items array is rewritten by the items migration, not by a row", ("mediaItems",)),
    ("sgs/cart", "small fixed thumbnail on an exempt block (Appendix A)", ("itemThumbBg", "itemThumbSize", "itemThumbRadius", "iconSvg")),
    ("sgs/buybox", "the sticker's own enum (rounded, pill, tag) draws a badge, not a media Shape or Corners (W3b)", ("galleryStickerShape",)),
    ("sgs/media", "player readout typography (§13: videoTime typography stays)", ("videoTimeTextColumns",)),
    ("sgs/google-reviews", "remote avatar and card logo on an exempt block (Appendix A)",
     ("logoPosition", "avatarSize", "avatarBorderRadius", "showCardLogo", "cardLogoSize", "avatarTextAlign", "avatarTextColour")),
    ("sgs/hero", "content order is layout, not media", ("splitContentOrder",)),
    ("sgs/option-picker", "the colour dot's own length: it draws a colour chip, not a picture, so it is no Width or Fit (W3c)", ("swatchSize",)),
    ("sgs/option-picker", "swatch selected-state ring and tick are picker UI, not media",
     ("swatchRingWidth", "swatchRingColour", "swatchTickInside", "swatchTickColour")),
    ("sgs/decorative-image", "a floating layer's position, rotation, order and visibility describe the layer, not its media (Appendix A)",
     ("positionX", "positionY", "anchorTo", "positionTop", "positionRight", "positionBottom", "positionLeft", "rotation", "zIndex",
      "flipX", "fadeOnScroll", "overflow")),
)
STAYS: dict[str, tuple] = {}
STAYS_WHY: dict[tuple, str] = {}
for _block, _why, _names in _STAYS_GROUPS:
    STAYS[_block] = STAYS.get(_block, ()) + _names
    for _name in _names:
        STAYS_WHY[(_block, _name)] = _why

# Blocks whose every declared attribute the self-test classifies, because their entry prefix is empty: the slot grammar
# alone cannot tell the layer's own settings from the block's.
FULLY_CLASSIFIED = ("sgs/decorative-image",)

# Opacity scale of the old attribute (§8 Opacity is 0 to 100): sgs/media stored 0 to 1, decorative-image already 0 to 100.
OPACITY_SCALE = {"sgs/decorative-image": 1}

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


MEDIAISH = re.compile(r"image|video|svg|photo|avatar|logo|poster|thumb|aspectratio|objectfit|objectposition|focal|lottie|^media", re.I)
TYPOGRAPHY = re.compile(r"Typography|FontFamily|FontSize|FontStyle|FontWeight|LetterSp|LineHeight|TextStroke|TextTrans|TextDec|"
                        r"TextWrap|WritingMode", re.I)


def known_names(block: str) -> set[str]:
    """Every old name or new target a mapping row, a STAYS entry or a wildcard row gives this block."""
    out = set(STAYS.get(block, ())) | set(FOLD_TARGETS.get(block, ()))
    for row in rows():
        if row["block"] in (block, "*"):
            out |= {row["old"], row["target"]}
    return out


def slot_prefixes(block: str) -> list[str]:
    """The non-empty old entry prefixes of a block's mapped (non-exempt) slots."""
    return [e["prefix"] for e in declared_slots().get(block, []) if e["prefix"] and (block, e["prefix"]) in NEW_PREFIX]


def is_candidate(block: str, name: str) -> bool:
    """True for an attribute that is media-looking on a block with a slot: under a slot prefix, or (declared by the block
    before adoption) a media word outside typography. `FULLY_CLASSIFIED` blocks answer for every declared attribute."""
    if name.startswith("_"):
        return False
    for p in slot_prefixes(block):
        if name == p or (name.startswith(p) and name[len(p)].isupper()):
            # `sgs` is the universal-extension prefix (sgsMotion, sgsHideOnTablet): only its image-control bases are media.
            return p != "sgs" or re.sub(r"(Tablet|Mobile)$", "", name[len(p):]) in BASE_FAMILY
    declared = name in block_attribute_names(block)
    if block in FULLY_CLASSIFIED:
        return declared
    return declared and bool(MEDIAISH.search(name)) and not TYPOGRAPHY.search(name)


def unmapped_attributes(block: str, names) -> list[str]:
    """Candidate attributes among `names` that have neither a row nor a STAYS entry."""
    known = known_names(block)
    return sorted(n for n in names if n not in known and is_candidate(block, n))


def slots_for(block: str, declared: dict | None = None, maps: dict | None = None) -> list[dict]:
    """Slot specs of a block: one per `mediaElements` entry that is neither exempt nor unlisted."""
    maps = maps or generated_maps()
    declared = declared if declared is not None else declared_slots()
    out = []
    for entry in declared.get(block, []):
        key = (block, entry["prefix"])
        if key in EXEMPT or key not in NEW_PREFIX:
            continue
        atoms = entry["atoms"] or list(maps["atoms"])
        bases = {b for a in atoms for b in maps["atoms"].get(a, [])} | set(SLOT_EXTRA_BASES.get((block, NEW_PREFIX[key]), ()))
        out.append({"block": block, "old": entry["prefix"], "new": NEW_PREFIX[key], "bases": sorted(bases)})
    return out


def merged_slots(block: str, declared: dict | None = None, maps: dict | None = None) -> list[dict]:
    """A block's slots with entries sharing a new prefix merged (hero's `split` and `splitMedia`)."""
    merged: dict[str, dict] = {}
    for slot in slots_for(block, declared, maps):
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
    """Every mapping row {block, old, family, target, new_prefix, base, tier}: the frozen file's, with the rows of `EXTRA` (the
    attributes outside the prefix grammar, which Stage B packages amend after the freeze) taking precedence over the frozen
    copy of the same (block, old), and any `EXTRA` entry the frozen file lacks added."""
    out = []
    seen = set()
    for row in frozen()["rows"]:
        key = (row["block"], row["old"])
        if row.get("base") is None and row.get("new_prefix") is None and key in EXTRA:
            family, target = EXTRA[key]
            row = {**row, "family": family, "target": target}
            seen.add(key)
        out.append(row)
    for (block, old), (family, target) in sorted(EXTRA.items()):
        if (block, old) not in seen and not any(r["block"] == block and r["old"] == old for r in out):
            out.append({"block": block, "old": old, "family": family, "target": target, "new_prefix": None, "base": None, "tier": ""})
    return out


def build_rows(declared: dict, maps: dict) -> list[dict]:
    """The rows generated from a set of declared slots and atom maps (regeneration only)."""
    tiered = set(maps["tiered"])
    maps = {"atoms": maps["atoms"], "tiered": tiered, "bases": {b for group in maps["atoms"].values() for b in group}}
    out: list[dict] = []
    for block in sorted(declared):
        for slot in merged_slots(block, declared, maps):
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


def regenerate() -> dict:
    """Rebuild `mapping-frozen.json` from the live files; refuses once any block declares `kinds` (§8.3)."""
    if any_block_adopted():
        raise SystemExit("regenerate refused: a block already declares `kinds` on a media slot, so the live files no longer "
                         "describe the old shape. The frozen rows are final.")
    declared, maps = live_declared_slots(), live_generated_maps()
    attributes = {}
    for block in declared:
        data = json.loads((BLOCKS_DIR / block.split("/")[1] / "block.json").read_text(encoding="utf-8"))
        attributes[block] = [k for k, v in data.get("attributes", {}).items()
                             if not k.startswith("_") and not (isinstance(v, dict) and v.get("_generated"))]
    wanted = set(declared) | set(BACKGROUND_BLOCKS) | {b for b, _ in EXTRA} | {"sgs/team-member", "sgs/decorative-image"}
    db = {b: a for b, a in live_db_attributes().items() if b in wanted}
    out = {"atoms": maps["atoms"], "tiered": maps["tiered"], "declared": declared, "attributes": attributes,
           "dbAttributes": db, "rows": build_rows(declared, maps)}
    tmp = FROZEN.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(out, indent=1, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    tmp.replace(FROZEN)
    frozen.cache_clear()
    rows.cache_clear()
    return out
