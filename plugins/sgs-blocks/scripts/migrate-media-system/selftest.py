"""Self-test of the §13 detector: a fixture per mapping family (with its expected output written out), negative
controls (byte-identical afterwards, or refused with the old attribute kept), nested blocks in markup and JSON trees,
idempotence (fix twice equals fix once), and consistency of the mapping with the code and the framework database."""
from __future__ import annotations

import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path

import blocks as B
import corpus as C
import markup
import apply_selftest
import export_selftest
import mapping as M
import sizes as S

U = "http://x/u.jpg"
CASES: list[tuple] = []
# The sizes the stub file reader knows (the real reader reads the file or the site's attachment map).
STUB_SIZES = {U: (640, 480), "http://x/t.jpg": (320, 240), "http://x/m.jpg": (160, 120), "http://x/m.svg": (100, 100),
              "http://x/p.jpg": (50, 50), "http://x/v.mp4": (1, 1)}


def _stub_read(url: str, _site: dict):
    return STUB_SIZES.get(url)


def _sized(node):
    """An expected output with the stub's width and height added to each bare-URL image Source entry (FR-49-16)."""
    if isinstance(node, dict):
        out = {k: _sized(v) for k, v in node.items()}
        if out.get("kind") == "image" and out.get("url") in STUB_SIZES and not out.get("id") and not (out.get("width") and out.get("height")):
            out["width"], out["height"] = STUB_SIZES[out["url"]]
        return out
    if isinstance(node, list):
        return [_sized(v) for v in node]
    return node


def case(label: str, block: str, attrs: dict, expected: dict | None) -> None:
    """expected None means a negative control: the output equals the input."""
    CASES.append((label, block, attrs, attrs if expected is None else _sized(expected)))


# ---- source, alt, decorative (sgs/media)
case("media: image id and url, alt, decorative", "sgs/media",
     {"imageId": 5, "imageUrl": U, "imageAlt": "A", "imageDecorative": True},
     {"source": {"desktop": {"kind": "image", "id": 5, "url": U}}, "alt": "A", "decorative": True})
case("media: per-device files and a differing tablet alt", "sgs/media",
     {"imageUrl": U, "imageUrlTablet": "http://x/t.jpg", "imageAlt": "A", "imageAltTablet": "B"},
     {"source": {"desktop": {"kind": "image", "url": U}, "tablet": {"kind": "image", "url": "http://x/t.jpg", "alt": "B"}}, "alt": "A", "width": {"desktop": "100%"}})
case("media: video with poster, captions, mime and the old defaults pinned", "sgs/media",
     {"mediaType": "video", "videoSource": "internal", "videoId": 9, "videoUrl": U, "videoMimeType": "video/mp4",
      "thumbnailId": 4, "thumbnail": "http://x/p.jpg", "videoCaptionsUrl": "http://x/c.vtt", "videoAutoplay": True},
     {"source": {"desktop": {"kind": "video", "id": 9, "url": U, "mime": "video/mp4", "poster": {"id": 4, "url": "http://x/p.jpg"},
                             "captions": {"url": "http://x/c.vtt", "label": "English", "lang": "en"}}},
      "playback": {"autoplay": True, "muted": True, "inline": True, "loop": False, "controls": True, "lazy": True},
      "width": {"desktop": "100%"}})
case("media: external YouTube url is an embed", "sgs/media",
     {"mediaType": "video", "videoSource": "external", "videoUrl": "https://youtu.be/abcdefghijk"},
     {"source": {"desktop": {"kind": "embed", "url": "https://youtu.be/abcdefghijk"}},
      "playback": {"autoplay": False, "muted": True, "inline": True, "loop": False, "controls": True, "lazy": True}})
case("media: inline svg", "sgs/media", {"mediaType": "svg", "svgContent": "<svg/>"},
     {"source": {"desktop": {"kind": "svg", "markup": "<svg/>"}}, "width": {"desktop": "100%"}})
case("media: intrinsic size folded into Source", "sgs/media", {"imageUrl": U, "imageWidth": 600, "imageHeight": 400},
     {"source": {"desktop": {"kind": "image", "url": U, "width": 600, "height": 400}}})
# ---- sizing
case("media: sizing fill", "sgs/media", {"mediaSizing": "fill", "height": {"desktop": "300px"}}, {"height": {"desktop": "fill"}})
case("media: sizing height gains Width auto", "sgs/media", {"mediaSizing": "height", "height": {"desktop": "440px", "mobile": "300px"}, "width": {"mobile": "50%"}},
     {"height": {"desktop": "440px", "mobile": "300px"}, "width": {"mobile": "50%", "desktop": "auto"}})
case("media: sizing ratio", "sgs/media", {"mediaSizing": "ratio", "aspectRatio": "4/5", "height": {"desktop": "300px"}},
     {"height": {"desktop": "auto"}, "ratio": {"desktop": "4 / 5"}})
case("media: sizing auto drops the inert height and ratio", "sgs/media", {"mediaSizing": "auto", "aspectRatio": "1 / 1", "height": {"desktop": "9px"}}, {})
# FR-49-16: an image Source gets its own size (a bare URL is refused by the renderer); the stub reader supplies it here.
case("size: a bare image URL gets the file's width and height", "sgs/media", {"imageUrl": "http://x/t.jpg"},
     {"source": {"desktop": {"kind": "image", "url": "http://x/t.jpg", "width": 320, "height": 240}}})
case("size: a size saved on the block is kept, not read again", "sgs/media", {"imageUrl": U, "imageWidth": 999, "imageHeight": 111},
     {"source": {"desktop": {"kind": "image", "url": U, "width": 999, "height": 111}}})
case("size: a per-device image gets its own size", "sgs/media", {"imageUrl": U, "imageUrlMobile": "http://x/m.jpg"},
     {"source": {"desktop": {"kind": "image", "url": U, "width": 640, "height": 480}, "mobile": {"kind": "image", "url": "http://x/m.jpg", "width": 160, "height": 120}}, "width": {"desktop": "100%"}})
case("size: a hero split image gets its size", "sgs/hero", {"splitMediaImageUrl": "http://x/m.svg"},
     {"splitSource": {"desktop": {"kind": "image", "url": "http://x/m.svg", "width": 100, "height": 100}}})
case("size: an unreadable image is refused and the block stays as saved", "sgs/media", {"imageUrl": "http://x/unreadable.png", "imageAlt": "A"}, None)
case("size: an unreadable image in a migrated block is refused", "sgs/media", {"source": {"desktop": {"kind": "image", "url": "http://x/unreadable.png"}}}, None)
case("size: a video's url is not an image and needs no size", "sgs/media", {"mediaType": "video", "videoUrl": "http://x/v.mp4", "mediaSizing": "height", "height": {"desktop": "200px"}},
     {"source": {"desktop": {"kind": "video", "url": "http://x/v.mp4"}}, "width": {"desktop": "100%"},
      "playback": {"autoplay": False, "muted": True, "inline": True, "loop": False, "controls": True, "lazy": True}})
# Width pins for sgs/media (measured on the old block): a figure's media was 100% wide, a bare image its file's width.
case("pin: an image in a figure (caption) with no sizing is 100% wide", "sgs/media", {"imageUrl": U, "caption": "C"},
     {"source": {"desktop": {"kind": "image", "url": U}}, "caption": "C", "width": {"desktop": "100%"}})
case("pin: a bare image with no sizing keeps the new default (its own width)", "sgs/media", {"imageUrl": U},
     {"source": {"desktop": {"kind": "image", "url": U}}})
case("pin: a linked image is a figure, 100% wide", "sgs/media", {"imageUrl": U, "linkUrl": "https://x.test/"},
     {"source": {"desktop": {"kind": "image", "url": U}}, "linkUrl": "https://x.test/", "width": {"desktop": "100%"}})
case("pin: a figure image in height mode gets no Width auto (a Height alone is already 100% wide)", "sgs/media",
     {"imageUrl": U, "caption": "C", "mediaSizing": "height", "height": {"desktop": "200"}},
     {"source": {"desktop": {"kind": "image", "url": U}}, "caption": "C", "height": {"desktop": "200px"}})
case("pin: a bare image in height mode keeps its proportions: Width auto", "sgs/media",
     {"imageUrl": U, "mediaSizing": "height", "height": {"desktop": "440px"}},
     {"source": {"desktop": {"kind": "image", "url": U}}, "height": {"desktop": "440px"}, "width": {"desktop": "auto"}})
case("pin: a Height the old block ignored on an SVG is dropped and the SVG is 100% wide", "sgs/media",
     {"mediaType": "svg", "svgContent": "<svg/>", "caption": "C", "mediaSizing": "height", "height": {"desktop": "200px"}},
     {"source": {"desktop": {"kind": "svg", "markup": "<svg/>"}}, "caption": "C", "width": {"desktop": "100%"}})
case("pin: a stored Width is never overwritten", "sgs/media", {"mediaType": "svg", "svgContent": "<svg/>", "width": {"desktop": "50%"}},
     {"source": {"desktop": {"kind": "svg", "markup": "<svg/>"}}, "width": {"desktop": "50%"}})
case("pin: an embed keeps the embed default (100% wide, 16 / 9)", "sgs/media", {"mediaType": "video", "videoSource": "external", "videoUrl": "https://youtu.be/abcdefghijk"},
     {"source": {"desktop": {"kind": "embed", "url": "https://youtu.be/abcdefghijk"}},
      "playback": {"autoplay": False, "muted": True, "inline": True, "loop": False, "controls": True, "lazy": True}})
case("pin: a bare image with a ratio was drawn at its file's width", "sgs/media", {"imageUrl": U, "mediaSizing": "ratio", "aspectRatio": "4/3"},
     {"source": {"desktop": {"kind": "image", "url": U}}, "height": {"desktop": "auto"}, "ratio": {"desktop": "4 / 3"}, "width": {"desktop": "640px"}})
case("pin: a figure image with a ratio keeps the new default (100% wide)", "sgs/media", {"imageUrl": U, "caption": "C", "mediaSizing": "ratio", "aspectRatio": "4/3"},
     {"source": {"desktop": {"kind": "image", "url": U}}, "caption": "C", "height": {"desktop": "auto"}, "ratio": {"desktop": "4 / 3"}})
case("pin: the hero's split Height mode still writes Width auto (the pins are sgs/media's)", "sgs/hero",
     {"splitMediaSizing": "height", "splitMediaHeight": {"desktop": "300px"}},
     {"splitHeight": {"desktop": "300px"}, "splitWidth": {"desktop": "auto"}})
case("media: numeric height becomes px", "sgs/before-after", {"height": {"desktop": 400}}, None)
# ---- fit, focal
case("media: fit and keyword focal", "sgs/media", {"objectFit": "contain", "objectFitMobile": "cover", "objectPosition": "left top"},
     {"fit": {"desktop": "contain", "mobile": "cover"}, "focal": {"desktop": {"x": 0.0, "y": 0.0}}})
case("hero split: focal strings per device, redundant centre dropped, percentage read", "sgs/hero",
     {"splitMediaImageUrl": U, "splitMediaObjectPosition": {"desktop": "66% 94%", "tablet": "center center", "mobile": "center center"}},
     {"splitSource": {"desktop": {"kind": "image", "url": U}}, "splitFocal": {"desktop": {"x": 0.66, "y": 0.94}, "tablet": {"x": 0.5, "y": 0.5}}})
case("hero split: the baked mobile focal default is not pinned (Appendix A)", "sgs/hero", {"splitMediaImageUrl": U},
     {"splitSource": {"desktop": {"kind": "image", "url": U}}})
case("hero split: out-of-vocabulary fit 'custom' renders as unset and is deleted", "sgs/hero", {"splitMediaObjectFit": "custom"}, {})
case("hero split: width number with its retired unit partner", "sgs/hero", {"splitMediaWidth": {"desktop": 40}, "splitMediaWidthUnit": "%"},
     {"splitWidth": {"desktop": "40%"}})
case("hero split: per-tier type, files, alt and a zero id", "sgs/hero",
     {"splitMediaType": "image", "splitMediaImageUrl": U, "splitMediaImageIdMobile": 0, "splitMediaImageUrlMobile": "http://x/m.jpg",
      "splitMediaImageAlt": "A", "splitMediaImageAltMobile": "M"},
     {"splitSource": {"desktop": {"kind": "image", "url": U}, "mobile": {"kind": "image", "url": "http://x/m.jpg", "alt": "M"}}, "splitAlt": "A"})
# ---- shape, radius, opacity, overlay
case("media: rounded becomes Corners 12px", "sgs/media", {"shape": "rounded"}, {"radius": {"desktop": {"topLeft": "12px", "topRight": "12px", "bottomRight": "12px", "bottomLeft": "12px"}}})
case("media: circle becomes Shape circle", "sgs/media", {"shape": "circle"}, {"shape": {"desktop": {"shape": "circle"}}})
case("media: square draws nothing", "sgs/media", {"shape": "square"}, {})
case("media: opacity 0 to 1 becomes 0 to 100", "sgs/media", {"opacity": 0.5}, {"opacity": {"desktop": 50}})
case("media: overlay opacity siblings become one device object, blend renamed", "sgs/media",
     {"overlayColour": "primary", "overlayOpacity": 40, "overlayOpacityMobile": 60, "overlayBlendMode": "multiply"},
     {"overlayColour": "primary", "overlayOpacity": {"desktop": 40, "mobile": 60}, "overlayBlend": "multiply"})
case("media: displayWidth deleted, imageBlendMode becomes blend, alignment becomes per device", "sgs/media",
     {"displayWidth": {"desktop": 200}, "imageBlendMode": "screen", "alignment": "center"},
     {"blend": "screen", "alignment": {"desktop": "center"}})
# ---- background family
case("container: image, tablet image, fit, focal, overlay default pinned", "sgs/container",
     {"backgroundImage": {"url": U, "id": 3}, "backgroundImageTablet": {"url": "http://x/t.jpg"}, "backgroundSize": "cover",
      "backgroundPosition": "center top", "backgroundOverlayColour": "#000"},
     {"backgroundSource": {"desktop": {"kind": "image", "id": 3, "url": U}, "tablet": {"kind": "image", "url": "http://x/t.jpg"}},
      "backgroundFit": {"desktop": "cover"}, "backgroundFocal": {"desktop": {"x": 0.5, "y": 0.0}}, "backgroundOverlayColour": "#000",
      "backgroundOverlayOpacity": {"desktop": 30}})
case("container: video with its cover image, fixed attachment becomes Pinned", "sgs/container",
     {"bgVideo": {"url": "http://x/v.mp4"}, "backgroundImage": {"url": U}, "backgroundAttachment": "fixed"},
     {"backgroundSource": {"desktop": {"kind": "video", "url": "http://x/v.mp4", "poster": {"url": U}}}, "backgroundPinned": True})
case("container: svg background with layer, opacity and min height", "sgs/container",
     {"bgSvgContent": "<svg/>", "bgSvgPosition": "foreground", "bgSvgOpacity": 60, "bgSvgMinHeight": "300px"},
     {"backgroundSource": {"desktop": {"kind": "svg", "markup": "<svg/>"}}, "backgroundSvgLayer": "front",
      "backgroundOpacity": {"desktop": 60}, "minHeight": {"desktop": "300px"}})
case("container: tiled background", "sgs/container", {"backgroundImage": {"url": U}, "backgroundSize": "auto", "backgroundRepeat": "repeat"},
     {"backgroundSource": {"desktop": {"kind": "image", "url": U}}, "backgroundFit": {"desktop": "tile"}, "backgroundRepeat": {"desktop": "repeat"}})
SVG = "<svg><path d='M0 0'/></svg>"
KEPT = {"bgSvgContent": SVG, "bgSvgPosition": "foreground", "bgSvgOpacity": 60, "bgSvgMinHeight": "300px", "bgSvgTextShadow": "0 1px #000"}
case("container: image plus svg: the photo becomes the Source, the SVG and its settings stay on the kept layer", "sgs/container",
     {"backgroundImage": {"url": U, "id": 3}, "backgroundImageMobile": {"url": "http://x/m.jpg"}, "backgroundSize": "cover", **KEPT},
     {"backgroundSource": {"desktop": {"kind": "image", "id": 3, "url": U}, "mobile": {"kind": "image", "url": "http://x/m.jpg"}},
      "backgroundFit": {"desktop": "cover"}, **KEPT})
case("container: video plus svg: the video becomes the Source, the SVG stays; its parts move to the declared parts attributes", "sgs/container",
     {"bgVideo": {"url": "http://x/v.mp4"}, "bgSvgParts": [{"id": "a"}], "bgSvgPartsTrigger": "scroll", **KEPT},
     {"backgroundSource": {"desktop": {"kind": "video", "url": "http://x/v.mp4"}}, "backgroundSvgParts": [{"id": "a"}],
      "backgroundSvgPartsTrigger": "scroll", **KEPT})
case("container: an empty image object beside an svg does not stop the svg becoming the Source", "sgs/container",
     {"backgroundImage": {}, "bgSvgContent": SVG}, {"backgroundSource": {"desktop": {"kind": "svg", "markup": SVG}}})
case("site-footer: image plus svg overlay blend and pinned strength still apply", "sgs/site-footer",
     {"backgroundImage": {"url": U}, "bgSvgContent": SVG, "backgroundOverlayColour": "#000", "backgroundOverlayBlendMode": "multiply"},
     {"backgroundSource": {"desktop": {"kind": "image", "url": U}}, "bgSvgContent": SVG, "backgroundOverlayColour": "#000",
      "backgroundOverlayBlend": "multiply", "backgroundOverlayOpacity": {"desktop": 30}})
case("multi-button: svg min height stays on its declared bgSvgMinHeight (no minHeight to receive it)", "sgs/multi-button",
     {"bgSvgContent": SVG, "bgSvgMinHeight": "300px"}, {"backgroundSource": {"desktop": {"kind": "svg", "markup": SVG}}, "bgSvgMinHeight": "300px"})
case("negative: a migrated photo beside a kept svg layer is untouched", "sgs/container",
     {"backgroundSource": {"desktop": {"kind": "image", "url": U, "width": 640, "height": 480}}, **KEPT}, None)
case("negative: an unreadable photo object beside an svg is refused and both stay", "sgs/container",
     {"backgroundImage": {"url": U, "zzz": 1}, "bgSvgContent": SVG}, None)
G1, G2 = "linear-gradient(90deg,#000,#fff)", "linear-gradient(0deg,#111,#222)"
case("container: overlayGradient and its hover take the overlay family's names, the old strength 30 is pinned", "sgs/container",
     {"overlayGradient": G1, "overlayGradientHover": G2, "backgroundImage": {"url": U}},
     {"backgroundSource": {"desktop": {"kind": "image", "url": U}}, "backgroundOverlayGradient": G1, "backgroundOverlayGradientHover": G2,
      "backgroundOverlayOpacity": {"desktop": 30}})
case("trust-bar: an empty overlayGradient is dropped, not written", "sgs/trust-bar", {"overlayGradient": ""}, {})
case("container: cover with repeat-x stays Fit cover, the inert repeat is dropped", "sgs/container",
     {"backgroundImage": {"url": U}, "backgroundSize": "cover", "backgroundRepeat": "repeat-x"},
     {"backgroundSource": {"desktop": {"kind": "image", "url": U}}, "backgroundFit": {"desktop": "cover"}})
case("container: contain with repeat stays Fit contain", "sgs/container",
     {"backgroundImage": {"url": U}, "backgroundSize": "contain", "backgroundRepeat": "repeat"},
     {"backgroundSource": {"desktop": {"kind": "image", "url": U}}, "backgroundFit": {"desktop": "contain"}})
case("container: no saved size means the old default cover, so a repeat alone is dropped", "sgs/container",
     {"backgroundImage": {"url": U}, "backgroundRepeat": "repeat-y"}, {"backgroundSource": {"desktop": {"kind": "image", "url": U}}})
case("container: size auto with repeat-x is a tile with that repeat", "sgs/container",
     {"backgroundImage": {"url": U}, "backgroundSize": "auto", "backgroundRepeat": "repeat-x"},
     {"backgroundSource": {"desktop": {"kind": "image", "url": U}}, "backgroundFit": {"desktop": "tile"}, "backgroundRepeat": {"desktop": "repeat-x"}})
case("gallery: tileFitContain merges into the saved itemFit and clears each item's own fit", "sgs/gallery",
     {"tileFitContain": True, "itemFit": {"desktop": "cover", "mobile": "cover"},
      "mediaItems": [{"source": {"desktop": {"kind": "image", "url": U}}, "fit": {"desktop": "cover"}, "_key": "k"}]},
     {"itemFit": {"desktop": "contain", "mobile": "contain"}, "mediaItems": [{"source": {"desktop": {"kind": "image", "url": U}}, "_key": "k"}]})
case("gallery: tileFitContain with no saved itemFit writes desktop contain", "sgs/gallery", {"tileFitContain": True}, {"itemFit": {"desktop": "contain"}})
case("gallery: tileFitContain false is the default and is dropped, itemFit untouched", "sgs/gallery",
     {"tileFitContain": False, "itemFit": {"desktop": "cover"}}, {"itemFit": {"desktop": "cover"}})
case("negative: a gallery without tileFitContain is untouched", "sgs/gallery", {"itemFit": {"desktop": "cover"}, "mediaItems": [{"fit": {"desktop": "contain"}, "_key": "k"}]}, None)
case("negative: an already migrated overlay gradient is untouched", "sgs/container",
     {"backgroundOverlayGradient": G1, "backgroundOverlayOpacity": {"desktop": 50}}, None)
# ---- W3b: product-card logo and image height, buybox preview, thumb hover colour, sticker shape
case("product-card: the brand logo box becomes the logo slot's sizing", "sgs/product-card",
     {"brandLogoHeight": {"desktop": "24px", "mobile": "16px"}, "brandLogoWidth": {"desktop": "auto"}, "brandLogoMaxHeight": {"desktop": 32}, "brandLogoMaxWidth": {"tablet": "80%"}},
     {"logoHeight": {"desktop": "24px", "mobile": "16px"}, "logoWidth": {"desktop": "auto"}, "logoMaxHeight": {"desktop": "32px"}, "logoMaxWidth": {"tablet": "80%"}})
case("product-card: an old string imageHeight becomes the image slot's Height", "sgs/product-card",
     {"imageHeight": "180px"}, {"imageHeight": {"desktop": "180px"}})
case("negative: a product-card imageHeight already per device is untouched", "sgs/product-card", {"imageHeight": {"desktop": "180px"}}, None)
case("buybox: preview border width and radius strings become Sides and Corners", "sgs/buybox",
     {"previewBorderWidth": "2px", "previewRadius": "6px"},
     {"previewBorderWidth": {"top": "2px", "right": "2px", "bottom": "2px", "left": "2px"},
      "previewRadius": {"desktop": {"topLeft": "6px", "topRight": "6px", "bottomRight": "6px", "bottomLeft": "6px"}}})
case("negative: buybox preview border width and radius already reshaped are untouched", "sgs/buybox",
     {"previewBorderWidth": {"top": "2px", "right": "2px", "bottom": "2px", "left": "2px"}, "previewRadius": {"desktop": {"topLeft": "6px", "topRight": "6px", "bottomRight": "6px", "bottomLeft": "6px"}}}, None)
case("buybox: the thumb hover border colour takes the slot's name", "sgs/buybox",
     {"galleryThumbBorderColourHover": "primary"}, {"thumbBorderColourHover": "primary"})
case("negative: buybox galleryStickerShape stays its own enum and writes no Corners", "sgs/buybox",
     {"galleryStickerShape": "rounded", "galleryStickerRadius": "4px"}, None)
# ---- other blocks
case("decorative-image: legacy files, tiers and the old default decorative=true pinned", "sgs/decorative-image",
     {"imageId": 8, "imageUrl": U, "imageUrlTablet": "http://x/t.jpg", "hideOnTablet": True},
     {"layerSource": {"desktop": {"kind": "image", "id": 8, "url": U}, "tablet": {"kind": "image", "url": "http://x/t.jpg"}},
      "sgsHideOnTablet": True, "layerDecorative": True})
case("decorative-image: width, height, border and a 0 to 100 opacity map to the layer's attributes", "sgs/decorative-image",
     {"width": {"desktop": "200px"}, "height": {"desktop": "80px"}, "borderWidth": {"desktop": "2px"}, "opacity": 60},
     {"layerWidth": {"desktop": "200px"}, "layerHeight": {"desktop": "80px"}, "layerBorderWidth": {"desktop": "2px"}, "layerOpacity": {"desktop": 60}})
case("decorative-image: the default opacity 100 writes nothing", "sgs/decorative-image", {"opacity": 100}, {})
case("decorative-image: position and rotation stay", "sgs/decorative-image",
     {"positionX": {"desktop": 20}, "rotation": {"desktop": 5}, "zIndex": 3}, None)
case("media: a tablet alt with no tablet file is reported as dropped", "sgs/media",
     {"imageUrl": U, "imageAlt": "A", "imageAltTablet": "B"}, {"source": {"desktop": {"kind": "image", "url": U}}, "alt": "A"})
case("before-after: a video side with no playback attributes of its own migrates without error", "sgs/before-after",
     {"beforeMediaType": "video", "beforeVideoUrl": U, "beforeImageAlt": "Before"},
     {"beforeSource": {"desktop": {"kind": "video", "url": U}}, "beforeAlt": "Before"})
case("media: a video alt on an image is reported as dropped", "sgs/media",
     {"imageUrl": U, "imageAlt": "A", "videoAlt": "V"}, {"source": {"desktop": {"kind": "image", "url": U}}, "alt": "A"})
case("media: a video alt on a video becomes the alt", "sgs/media",
     {"mediaType": "video", "videoUrl": U, "videoAlt": "V", "videoAutoplay": True, "videoMuted": True, "videoLoop": False, "videoControls": True,
      "videoPlaysInline": True, "videoLazyLoad": True},
     {"source": {"desktop": {"kind": "video", "url": U}}, "alt": "V", "width": {"desktop": "100%"},
      "playback": {"autoplay": True, "muted": True, "inline": True, "loop": False, "controls": True, "lazy": True}})
case("team-member: photo object and the old default shape circle pinned", "sgs/team-member",
     {"photo": {"id": 2, "url": U}},
     {"photoSource": {"desktop": {"kind": "image", "id": 2, "url": U}}, "photoShape": {"desktop": {"shape": "circle"}}, "photoRatio": {"desktop": "1 / 1"}})
case("team-member: square shape is written as an explicit none so the old circle default cannot return", "sgs/team-member",
     {"photoShape": "square"}, {"photoShape": {"desktop": {"shape": "none"}}})
case("product-card: image url and id, ratio, fill", "sgs/product-card",
     {"image": U, "imageId": 12, "imageAspectRatio": "1/1", "imageFill": True, "imageSize": "large"},
     {"imageSource": {"desktop": {"kind": "image", "id": 12, "url": U}}, "imageRatio": {"desktop": "1 / 1"}, "imageHeight": {"desktop": "fill"}})
case("responsive-logo: id and url pairs per device, dark id", "sgs/responsive-logo",
     {"logoId": 7, "logoUrl": U, "logoUrlMobile": "http://x/m.svg", "darkLogoId": 9, "width": 140},
     {"logoSource": {"desktop": {"kind": "image", "id": 7, "url": U}, "mobile": {"kind": "image", "url": "http://x/m.svg"}},
      "logoDarkSource": {"desktop": {"kind": "image", "id": 9}}, "width": 140})
case("measured-diagram: source and alt move, its width and height stay as measurements", "sgs/measured-diagram",
     {"drawingImageId": 3, "drawingImageUrl": U, "drawingImageAlt": "D", "drawingImageWidth": 800, "drawingImageHeight": 600},
     {"drawingSource": {"desktop": {"kind": "image", "id": 3, "url": U}}, "drawingAlt": "D", "drawingImageWidth": 800, "drawingImageHeight": 600})
case("gallery: items fold into source, alt, fit, focal", "sgs/gallery",
     {"mediaItems": [{"id": 1, "url": U, "alt": "g", "caption": "c", "objectFit": "contain", "focalPoint": {"x": 0.3, "y": 0.6}, "_key": "k"}], "aspectRatio": "1 / 1"},
     {"mediaItems": [{"caption": "c", "_key": "k", "source": {"desktop": {"kind": "image", "id": 1, "url": U}}, "alt": "g",
                      "fit": {"desktop": "contain"}, "focal": {"desktop": {"x": 0.3, "y": 0.6}}}], "itemRatio": {"desktop": "1 / 1"}})
case("brand-strip: logos[].media folds into source", "sgs/brand-strip",
     {"logos": [{"media": {"id": 5, "url": U, "type": "image", "mime": "image/jpeg", "width": 500, "height": 500}, "alt": "S", "name": "S"}], "logoFit": "contain"},
     {"logos": [{"alt": "S", "name": "S", "source": {"desktop": {"kind": "image", "id": 5, "url": U, "mime": "image/jpeg", "width": 500, "height": 500}}}],
      "logoFit": {"desktop": "contain"}})
case("buybox: main photo radius string and renames", "sgs/buybox",
     {"mainPhotoRadius": "8px", "mainPhotoShadow": "0 2px 4px", "galleryThumbBorderStyle": "dashed"},
     {"mainRadius": {"desktop": {"topLeft": "8px", "topRight": "8px", "bottomRight": "8px", "bottomLeft": "8px"}},
      "mainBoxShadow": "0 2px 4px", "thumbBorderStyle": "dashed"})
case("hero: mediaPadding and background move to the split surface", "sgs/hero",
     {"mediaPadding": {"desktop": {"top": "9px"}}, "mediaBackground": "#fff"}, {"splitPadding": {"desktop": {"top": "9px"}}, "splitBackground": "#fff"})
case("timeline: media height, ratio, radius and width", "sgs/timeline",
     {"mediaHeight": {"tablet": 190}, "mediaAspectRatio": {"desktop": "4/5"}, "mediaBorderRadius": {"desktop": "4px"}, "milestoneMediaWidth": "180px"},
     {"entryHeight": {"tablet": "190px"}, "entryRatio": {"desktop": "4 / 5"}, "entryRadius": {"desktop": "4px"}, "entryWidth": {"desktop": "180px"}})
case("timeline: entry image id, video and empty entries fold into source; the decorative switch moves onto each entry", "sgs/timeline",
     {"entries": [{"date": "2019", "image": 7, "imageUrl": U, "mediaType": "image", "video": [], "svg": ""},
                  {"date": "2020", "image": 0, "mediaType": "image", "video": [], "svg": ""},
                  {"date": "2021", "image": 0, "mediaType": "video", "video": {"id": 9, "url": "http://x/v.mp4"}, "svg": ""}],
      "milestoneMediaDecorative": True},
     {"entries": [{"date": "2019", "source": {"desktop": {"kind": "image", "id": 7, "url": U}}, "decorative": True},
                  {"date": "2020"},
                  {"date": "2021", "source": {"desktop": {"kind": "video", "id": 9, "url": "http://x/v.mp4"}}, "decorative": True}]})
case("timeline: an SVG entry keeps its old keys (the slot takes images and video)", "sgs/timeline",
     {"entries": [{"date": "2019", "mediaType": "svg", "svg": "<svg/>"}]}, None)
# ---- negative controls: refusals keep the old attribute; unrelated and new-shape attributes stay byte-identical
case("negative: an unreadable focal position is refused and stays", "sgs/media", {"objectPosition": "calc(1px + 2px) 5px"}, None)
case("negative: Lottie is reported and stays", "sgs/media", {"mediaType": "lottie", "imageUrl": U}, None)
case("negative: a block with no media attribute is untouched", "sgs/heading", {"content": "Hi", "level": "h2"}, None)
case("negative: an already migrated block is untouched", "sgs/media",
     {"source": {"desktop": {"kind": "image", "url": U, "width": 640, "height": 480}}, "alt": "A", "fit": {"desktop": "cover"}, "opacity": {"desktop": 50}}, None)
case("negative: hero mediaPadding and splitMediaPadding both set is refused", "sgs/hero",
     {"mediaPadding": {"desktop": {"top": "1px"}}, "splitMediaPadding": {"desktop": {"top": "2px"}}}, {"splitPadding": {"desktop": {"top": "2px"}}, "mediaPadding": {"desktop": {"top": "1px"}}})
case("negative: inline SVG logo parts are reported and stay", "sgs/responsive-logo", {"inlineSvg": True, "svgParts": []}, None)
case("negative: an out-of-vocabulary shape is refused and stays", "sgs/media", {"shape": "star"}, None)

REFUSED_STAYS = ("negative: an unreadable photo object", "size: an unreadable image", "negative: an unreadable focal", "negative: Lottie", "negative: an out-of-vocabulary shape",
                 "negative: hero mediaPadding", "negative: inline SVG")


def _fail(label: str, detail: str, failures: list[str]) -> None:
    failures.append(f"FAIL {label}: {detail}")


def run_cases(failures: list[str]) -> int:
    count = 0
    for label, block, attrs, expected in CASES:
        count += 1
        new, events = B.migrate(block, attrs)
        if new != expected:
            _fail(label, f"expected {json.dumps(expected, sort_keys=True)}\n     got      {json.dumps(new, sort_keys=True)}", failures)
            continue
        again, _ = B.migrate(block, new)
        if again != new:
            _fail(label, "not idempotent: a second pass changed the output", failures)
        refused = [e for e in events if e[0] in ("refused", "reported")]
        if label.startswith(REFUSED_STAYS) and not refused:
            _fail(label, "an attribute that must be refused or reported was neither", failures)
        if label.startswith("negative:") and not label.startswith(REFUSED_STAYS) and events:
            _fail(label, f"a negative control produced events {events}", failures)
        remaining = B.old_attributes(block, new)
        if not label.startswith(REFUSED_STAYS) and remaining:
            _fail(label, f"old attributes still reported after the fix: {remaining}", failures)
    return count


def svg_lost(old: dict, new: dict) -> str:
    """Empty when the SVG a block saved is still present afterwards (kept layer or Source), else why it was lost."""
    markup_in = old.get("bgSvgContent")
    if not isinstance(markup_in, str) or not markup_in.strip():
        return ""
    if new.get("bgSvgContent") == markup_in:
        return ""
    for entry in (new.get("backgroundSource") or {}).values():
        if isinstance(entry, dict) and entry.get("kind") == "svg" and entry.get("markup") == markup_in:
            return ""
    return "the saved SVG is in neither bgSvgContent nor an svg Source"


def run_svg_keep(failures: list[str]) -> int:
    """Every saved image-or-video-plus-SVG block keeps its SVG on all seven blocks; a lossy migration is caught (negative control)."""
    checks = 0
    seven = ("container", "multi-button", "physics-canvas", "site-header", "site-footer", "trust-bar", "nav-drawer")
    for name in seven:
        for label, extra in (("image", {"backgroundImage": {"url": U}}), ("video", {"bgVideo": {"url": "http://x/v.mp4"}}),
                             ("tablet image", {"backgroundImageTablet": {"url": U}})):
            checks += 1
            attrs = {**extra, **KEPT}
            new, _ = B.migrate(f"sgs/{name}", attrs)
            lost = svg_lost(attrs, new)
            if lost:
                _fail(f"svg kept: {name} {label}", lost, failures)
            if B.old_attributes(f"sgs/{name}", new):
                _fail(f"svg kept: {name} {label}", f"old attributes remain after the fix: {B.old_attributes(f'sgs/{name}', new)}", failures)
    checks += 1
    lossy = {"backgroundSource": {"desktop": {"kind": "image", "url": U}}}
    if not svg_lost({"backgroundImage": {"url": U}, "bgSvgContent": SVG}, lossy):
        _fail("svg kept: negative control", "a migration that drops the SVG beside a photo was not caught", failures)
    checks += 1
    if svg_lost({"backgroundImage": {"url": U}, "bgSvgContent": SVG}, {"backgroundSource": lossy["backgroundSource"], "bgSvgContent": SVG}):
        _fail("svg kept: control", "a migration that keeps the SVG was reported as losing it", failures)
    return checks


def run_background_rules(failures: list[str]) -> int:
    """Negative controls: cover or contain never becomes a tile whatever the repeat; an overlay gradient is never lost."""
    checks = 0
    for size in ("cover", "contain", None):
        for repeat in ("repeat", "repeat-x", "repeat-y"):
            checks += 1
            attrs = {"backgroundImage": {"url": U}, **({"backgroundSize": size} if size else {}), "backgroundRepeat": repeat}
            new, _ = B.migrate("sgs/container", attrs)
            if new.get("backgroundFit", {}).get("desktop") == "tile" or "backgroundRepeat" in new:
                _fail(f"tile rule: {size} with {repeat}", f"became a tile or kept a repeat: {new}", failures)
    for name in ("container", "multi-button", "physics-canvas", "site-header", "site-footer", "trust-bar", "nav-drawer"):
        checks += 1
        new, _ = B.migrate(f"sgs/{name}", {"overlayGradient": G1, "overlayGradientHover": G2})
        if new.get("backgroundOverlayGradient") != G1 or new.get("backgroundOverlayGradientHover") != G2 or "overlayGradient" in new:
            _fail(f"overlay names: {name}", f"gradient lost or not renamed: {new}", failures)
    checks += 1
    unmigrated = {"overlayGradient": G1, "overlayGradientHover": G2}
    if unmigrated.get("backgroundOverlayGradient") == G1:
        _fail("overlay names: control", "an unmigrated block was read as carrying the gradient under its new name", failures)
    return checks


def run_carriers(failures: list[str]) -> int:
    """Nested blocks: a parent and its inner blocks in markup, and innerBlocks in a JSON tree."""
    text = ('<!-- wp:sgs/container {"backgroundImage":{"url":"%s"}} -->\n<div class="x">\n'
            '<!-- wp:sgs/media {"imageUrl":"%s","objectFit":"contain"} /-->\n'
            '<!-- wp:sgs/container {"backgroundSize":"cover","backgroundImage":{"url":"%s"}} -->\n'
            '<!-- wp:sgs/media {"mediaSizing":"fill"} /-->\n<!-- /wp:sgs/container -->\n</div>\n<!-- /wp:sgs/container -->') % (U, U, U)

    def fn(name, attrs):
        return B.migrate(name, attrs)[0]

    out, count = markup.rewrite_markup(text, fn)
    checks = 0
    checks += 1
    if count != 4 or "backgroundImage" in out or "imageUrl" in out or "mediaSizing" in out or 'class="x"' not in out:
        _fail("carrier: nested markup", f"{count} rewrites; output {out!r}", failures)
    again, count2 = markup.rewrite_markup(out, fn)
    checks += 1
    if count2 != 0 or again != out:
        _fail("carrier: markup idempotence", f"second pass rewrote {count2} blocks", failures)
    tree = [{"name": "sgs/container", "attributes": {"backgroundImage": {"url": U}}, "innerBlocks": [
        {"name": "sgs/container", "attributes": {}, "innerBlocks": [{"name": "sgs/media", "attributes": {"imageUrl": U}, "innerBlocks": []}]}]}]
    data, count = markup.rewrite_json(tree, fn)
    checks += 1
    if count != 2 or "source" not in data[0]["innerBlocks"][0]["innerBlocks"][0]["attributes"] or "backgroundSource" not in data[0]["attributes"]:
        _fail("carrier: JSON tree innerBlocks", f"{count} rewrites; {json.dumps(data)}", failures)
    schema = {"name": "sgs/media", "apiVersion": 3, "attributes": {"imageUrl": {"type": "string"}}}
    checks += 1
    if list(markup.iter_json_blocks(schema)):
        _fail("carrier: negative control", "a block.json schema was read as a saved block", failures)
    return checks


def run_scope(failures: list[str]) -> int:
    """`check` and `fix` read only `--content` / `--mirror` unless `--repo`, `--target` or `--file` is named; an old attribute in
    a content file fails `check` (negative control) and a clean one passes."""
    import argparse
    import cli
    checks = 0
    with tempfile.TemporaryDirectory() as tmp:
        clean = Path(tmp) / "clean.json"
        dirty = Path(tmp) / "dirty.json"
        clean.write_text(json.dumps([{"store": "posts", "ID": 1, "post_type": "page", "post_name": "a", "post_content": '<!-- wp:sgs/media {"alt":"A"} /-->'}]), encoding="utf-8")
        dirty.write_text(json.dumps([{"store": "posts", "ID": 2, "post_type": "page", "post_name": "b", "post_content": '<!-- wp:sgs/media {"imageUrl":"%s"} /-->' % U}]), encoding="utf-8")
        for label, file, extra, want_repo, want_exit in (
            ("clean content file alone", clean, [], False, 0),
            ("old attribute in a content file alone (negative control)", dirty, [], False, 1),
            ("content file with --repo adds the repo targets", clean, ["--repo"], True, None),
        ):
            checks += 1
            args = argparse.Namespace(mirror=None, content=[str(file)], target=None, repo="--repo" in extra, file=None)
            repo_scan = not cli.saved_only_scope(args)
            if repo_scan != want_repo:
                _fail(f"scope: {label}", f"repo targets scanned = {repo_scan}, expected {want_repo}", failures)
            if want_exit is not None:
                code = cli.main(["check", "--content", str(file), "--active", "on", *extra])
                if code != want_exit:
                    _fail(f"scope: {label}", f"check exit {code}, expected {want_exit}", failures)
        checks += 1
        import mirror_selftest
        script = mirror_selftest.checksum_script("xq9_")
        if "xq9_posts" not in script or "wp_posts" in script:
            _fail("mirror self-test: table prefix", f"the checksum command does not use the mirror's prefix: {script}", failures)
        stuck = Path(tmp) / "unsupported.json"
        stuck.write_text(json.dumps([{"store": "unsupported", "ID": "postmeta:7:_blob", "sub": "", "post_type": "postmeta:_blob", "post_name": "post-1", "post_content": "", "md5": ""}]), encoding="utf-8")
        for command in ("check", "fix"):
            checks += 1
            extra = ["--active", "on"] if command == "check" else ["--dry-run"]
            try:
                cli.main([command, "--content", str(stuck), *extra])
                _fail(f"unsupported record: {command} --content", "an unsupported record was not refused", failures)
            except SystemExit as stop:
                if "postmeta:7:_blob" not in str(stop):
                    _fail(f"unsupported record: {command} --content", f"the refusal does not name the record: {stop}", failures)
    return checks


def run_consistency(failures: list[str]) -> int:
    """The mapping against the code and the framework database."""
    checks = 0
    declared = M.declared_slots()
    for block, entries in declared.items():
        for entry in entries:
            checks += 1
            key = (block, entry["prefix"])
            if key not in M.NEW_PREFIX and key not in M.EXEMPT:
                _fail("mapping: slot coverage", f"{block} entry with prefix {entry['prefix']!r} has neither a new prefix nor an exemption", failures)
    for key in list(M.NEW_PREFIX) + list(M.EXEMPT):
        checks += 1
        if key[0] not in declared or key[1] not in {e["prefix"] for e in declared[key[0]]}:
            _fail("mapping: stale slot", f"{key} names a mediaElements entry no block.json declares", failures)
    adopted = M.REPO / "plugins" / "sgs-blocks" / "src" / "components" / "media" / "emit"
    vocabulary = (adopted / "adopted-settings.js").read_text(encoding="utf-8") + (adopted / "kinds-settings.js").read_text(encoding="utf-8")
    known = set(re.findall(r"base:\s*'([A-Za-z]+)'", vocabulary)) | set(re.findall(r"entry\(\s*'([A-Za-z]+)'", vocabulary))
    for row in M.rows():
        if row["base"] and row["family"] in ("keep", "rename", "fit", "focal", "opacity", "overlayopacity", "radius", "shape", "sizing", "alt", "svglayer", "playback"):
            if "." in row["target"]:
                continue
            checks += 1
            prefix = row["new_prefix"] or ""
            base = row["target"][len(prefix):] if prefix else row["target"][:1].upper() + row["target"][1:]
            if base not in known and re.sub(r"(GradientHover|Gradient|Hover)$", "", base) not in known:
                _fail("mapping: new base", f"{row['block']} {row['old']} -> {row['target']}: {base!r} is not an adopted setting", failures)
    db = M.db_attributes()
    if db:
        for (block, old), (family, _target) in M.EXTRA.items():
            checks += 1
            if old not in db.get(block, {}) and (block, old) not in LEGACY_UNDECLARED:
                _fail("mapping: extra row", f"{block}.{old} is not a declared attribute in the framework database", failures)
        for block, old in __import__("transform").PIN_DEFAULTS:
            checks += 1
            if M.old_default(block, old) in (None, ""):
                _fail("mapping: pin", f"{block}.{old} has no old default in the database to pin", failures)
    return checks


HERO_PROBE = {"splitMediaImageUrl": U, "splitMediaObjectFit": "contain"}


def run_declared_guard(failures: list[str]) -> int:
    """A target the block's block.json does not declare refuses the block whole (negative control); a declared one passes; the
    known narrowed slots delete what painted nothing and refuse a decorative-image overlay that did paint."""
    checks = 0
    svg = {"layerSource": {"desktop": {"kind": "svg", "markup": "<svg/>"}}}
    original = {"imageUrl": U}
    declared = B.guard_declared("sgs/media", original, {"alt": "A"}, [("converted", "imageAlt", "alt", "")])
    undeclared = B.guard_declared("sgs/media", original, {"noSuchTarget": 1}, [("converted", "imageUrl", "noSuchTarget", "")])
    checks += 1
    if declared != ({"alt": "A"}, [("converted", "imageAlt", "alt", "")]):
        _fail("guard: declared target", f"a declared target was changed: {declared}", failures)
    checks += 1
    refused = [e for e in undeclared[1] if e[0] == "refused"]
    if undeclared[0] != original or len(refused) != 1 or "noSuchTarget" not in refused[0][3] or refused[0][1] != "imageUrl":
        _fail("guard: undeclared target (negative control)", f"expected a refusal naming noSuchTarget and imageUrl, got {undeclared}", failures)
    checks += 1
    unscoped = B.guard_declared("sgs/hero", original, {"noSuchTarget": 1}, [])
    if M.migration_scope() is not None and unscoped[0] != {"noSuchTarget": 1}:
        _fail("guard: unadopted block", "a block outside the migration scope was refused", failures)
    for label, block, attrs, want_events, want_refused, want_keep in (
        ("repeat and attachment on an image delete", "sgs/media", {"attachment": "fixed", "repeat": "repeat"}, {"deleted"}, False, None),
        ("repeat and attachment on a decorative image delete", "sgs/decorative-image", {**svg, "attachment": "fixed", "repeat": "repeat"}, {"deleted"}, False, None),
        ("an overlay that painted nothing deletes", "sgs/decorative-image", {**svg, "overlayOpacity": 40, "overlayBlendMode": "multiply"}, {"deleted"}, False, None),
        ("an overlay colour refuses the block", "sgs/decorative-image", {**svg, "overlayColour": "#f00"}, {"refused"}, True, "overlayColour"),
    ):
        checks += 1
        new, events = B.migrate(block, attrs)
        kinds = {e[0] for e in events} - {"pinned"}
        problems = []
        if want_events != kinds:
            problems.append(f"events {sorted(kinds)}, expected {sorted(want_events)}")
        if want_refused != (new == attrs):
            problems.append("the block was " + ("not refused whole" if want_refused else "left unchanged"))
        if not want_refused and any(k in new for k in ("attachment", "repeat", *B.OVERLAY_SETTINGS)):
            problems.append(f"a deleted attribute is still saved: {new}")
        if want_keep and not any(e[1] == want_keep and "layerOverlayColour" in e[3] for e in events):
            problems.append(f"the refusal does not name {want_keep} and its target: {events}")
        if problems:
            _fail(f"guard: {label}", "; ".join(problems), failures)
    checks += 1
    before = M.live_declared_attributes.cache_info().misses
    B.guard_declared("sgs/media", original, {"alt": "A"}, [])
    B.guard_declared("sgs/gallery", original, {"alt": "A"}, [])
    if M.live_declared_attributes.cache_info().misses != before:
        _fail("guard: declarations cached", "the live block.json files were read again within a run", failures)
    return checks


def reset_caches() -> None:
    """The one place the mapping's kept facts and the kept migration results are cleared."""
    M.live_generated_maps.cache_clear()
    M.live_declared_slots.cache_clear()
    M.live_declared_attributes.cache_clear()
    B.clear_memo()


def frozen_independent(before_rows: str, before_out) -> bool:
    """True when rows and a migration come out the same from fresh caches under the current (absent) paths."""
    reset_caches()
    return json.dumps(M.rows(), sort_keys=True) == before_rows and B.migrate("sgs/hero", HERO_PROBE) == before_out


def run_frozen(failures: list[str]) -> int:
    """The frozen facts stand alone, every legacy attribute is classified, and dropped or unmapped values are reported."""
    checks = 0
    gone = Path(tempfile.gettempdir()) / "migrate-media-system-absent"
    saved = (M.GENERATED_PHP, M.BLOCKS_DIR)
    before_rows, before_out = json.dumps(M.rows(), sort_keys=True), B.migrate("sgs/hero", HERO_PROBE)
    M.GENERATED_PHP, M.BLOCKS_DIR = gone / "generated.php", gone / "blocks"
    try:
        checks += 1
        if not frozen_independent(before_rows, before_out):
            _fail("frozen: independence", "rows or a migration changed with the PHP mirror and block.json files absent", failures)
        checks += 1
        real = B._migrate
        B._migrate = lambda _n, _a: ({"mirrorPresent": M.GENERATED_PHP.exists()}, [])
        try:
            M.GENERATED_PHP = saved[0]
            reset_caches()
            with_mirror = B.migrate("sgs/hero", HERO_PROBE)
            M.GENERATED_PHP = gone / "generated.php"
            caught = not frozen_independent(before_rows, with_mirror)
        finally:
            B._migrate = real
        if not caught:
            _fail("frozen: independence control", "a migration that reads the PHP mirror was not caught (a stale kept result hides it)", failures)
    finally:
        M.GENERATED_PHP, M.BLOCKS_DIR = saved
        reset_caches()
    live = M.live_declared_slots
    M.live_declared_slots = lambda: {"sgs/media": [{"prefix": "", "atoms": None, "kinds": ["image"]}]}
    digest = hashlib.sha256(M.FROZEN.read_bytes()).hexdigest()
    try:
        checks += 1
        try:
            M.regenerate()
            _fail("frozen: regenerate", "regenerate ran although a block declares `kinds`", failures)
        except SystemExit:
            pass
        checks += 1
        if hashlib.sha256(M.FROZEN.read_bytes()).hexdigest() != digest:
            _fail("frozen: regenerate", "the refused regenerate still changed the frozen file", failures)
    finally:
        M.live_declared_slots = live
    for block in sorted(set(M.declared_slots()) | set(M.FULLY_CLASSIFIED)):
        checks += 1
        gaps = M.unmapped_attributes(block, M.block_attribute_names(block))
        if gaps:
            _fail("legacy coverage", f"{block}: {', '.join(gaps)} have neither a mapping row nor a STAYS entry", failures)
    for key in M.STAYS_WHY:
        checks += 1
        if key[1] not in M.STAYS.get(key[0], ()) or not M.STAYS_WHY[key].strip():
            _fail("legacy coverage", f"{key} STAYS entry has no reason", failures)
    for block, names in M.STAYS.items():
        for name in names:
            checks += 1
            if (block, name) not in M.STAYS_WHY:
                _fail("legacy coverage", f"{block}.{name} is in STAYS without a reason", failures)
    for label, block, attrs, status, text in (
        ("unmapped event", "sgs/trust-bar", {"badgeImageZzz": "x"}, "refused", "unmapped legacy attribute"),
        ("dropped tablet alt", "sgs/media", {"imageUrl": U, "imageAlt": "A", "imageAltTablet": "B"}, "deleted", "dropped value 'B'"),
        ("dropped video alt", "sgs/media", {"imageUrl": U, "videoAlt": "V"}, "deleted", "dropped value 'V'"),
        ("report: preview image id", "sgs/buybox", {"previewImageId": 5}, "reported", "WP-9"),
    ):
        checks += 1
        _, events = B.migrate(block, attrs)
        if not any(e[0] == status and text in e[3] for e in events):
            _fail(f"event: {label}", f"no {status} event containing {text!r}: {events}", failures)
    checks += 1
    new, _ = B.migrate("sgs/decorative-image", {"opacity": 60})
    media, _ = B.migrate("sgs/media", {"imageUrl": U, "opacity": 0.6})
    if new.get("layerOpacity") != {"desktop": 60} or media.get("opacity") != {"desktop": 60}:
        _fail("opacity scale", f"decorative-image 60 and media 0.6 must both be 60: {new} {media}", failures)
    return checks


# Old attributes saved in content but declared nowhere (stale partners); mapped explicitly so they are deleted, not ignored.
LEGACY_UNDECLARED = {
    ("sgs/hero", "splitMediaWidthUnit"), ("sgs/hero", "splitMediaHeightUnit"), ("sgs/hero", "splitMediaMaxWidthUnit"),
    ("sgs/hero", "splitMediaMaxHeightUnit"), ("sgs/hero", "splitMediaBackground"), ("sgs/card-grid", "imageSize"),
}


def run_inplace_json(failures: list[str]) -> int:
    """A hand-formatted JSON file keeps every unchanged byte when one block in it is rewritten: inline objects
    elsewhere stay inline. Negative control: a file whose block does not change comes back identical."""
    import tempfile
    text = ('{\n  "keep": { "a": 1, "b": [1, 2] },\n  "tree": [\n    {\n      "name": "sgs/x",\n'
            '      "attributes": { "old": 1 }\n    }\n  ]\n}\n')

    def rename(name, attrs):
        return {"new": attrs["old"]} if "old" in attrs else attrs

    checks = 0
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "hand.json"
        path.write_bytes(text.encode("utf-8"))
        out, count, _ = C.rewrite_file_text(path, rename)
        checks += 1
        if count != 1 or '"keep": { "a": 1, "b": [1, 2] }' not in out or json.loads(out)["tree"][0]["attributes"] != {"new": 1}:
            failures.append(f"FAIL in-place JSON: unchanged bytes not kept or block not rewritten: {out!r}")
        same, count, _ = C.rewrite_file_text(path, lambda n, a: a)
        checks += 1
        if count or same != text:
            failures.append("FAIL in-place JSON negative: a file with no changed block was altered")
    return checks


def run_http_retry(failures: list[str]) -> int:
    """A dropped connection is retried, so one pass reads the size; a 404 is not retried. Negative control: a reader
    that always drops returns None after every attempt."""
    import io
    import urllib.error
    import urllib.request
    png = bytes.fromhex("89504e470d0a1a0a0000000d49484452") + (640).to_bytes(4, "big") + (480).to_bytes(4, "big") + bytes.fromhex("0802000000")
    calls = {"n": 0}

    class Resp(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def flaky(request, timeout=0):
        calls["n"] += 1
        if calls["n"] == 1:
            raise ConnectionResetError("dropped")
        return Resp(png)

    def gone(request, timeout=0):
        calls["n"] += 1
        raise urllib.error.HTTPError(request.full_url, 404, "Not Found", {}, None)

    def always_drop(request, timeout=0):
        calls["n"] += 1
        raise ConnectionResetError("dropped")

    real_open, real_sleep = urllib.request.urlopen, S.time.sleep
    S.time.sleep = lambda _s: None
    checks = 0
    try:
        for opener, want, want_calls, label in ((flaky, (640, 480), 2, "a dropped first read is retried"),
                                                 (gone, None, 1, "a 404 is not retried"),
                                                 (always_drop, None, S.HTTP_ATTEMPTS, "negative: always dropped gives up")):
            calls["n"] = 0
            urllib.request.urlopen = opener
            got = S._http("http://remote.test/x.png")
            checks += 1
            if got != want or calls["n"] != want_calls:
                failures.append(f"FAIL http retry: {label}: got {got} after {calls['n']} call(s), want {want} after {want_calls}")
    finally:
        urllib.request.urlopen, S.time.sleep = real_open, real_sleep
    return checks


def run_sizes(failures: list[str]) -> int:
    """FR-49-16 against a registered attachment map: an own upload (a sized copy too) gets its attachment id, another file
    its read size, and the same URL on another site resolves on that site's map. Negative control: a site without the
    upload in its map does not borrow another site's id."""
    checks = 0
    files = {"2026/09/photo.jpeg": [41, 1200, 800, "image/jpeg"], "2026/09/photo-300x200.jpeg": [41, 300, 200, "image/jpeg"]}
    S.register("mirror:a", files)
    S.register("mirror:b", {"2026/09/photo.jpeg": [77, 1200, 800, "image/jpeg"]})
    try:
        for key, url, want in (
            ("mirror:a", "http://old.test/wp-content/uploads/2026/09/photo.jpeg", {"id": 41}),
            ("mirror:a", "http://old.test/wp-content/uploads/2026/09/photo-300x200.jpeg", {"id": 41}),
            ("mirror:b", "http://old.test/wp-content/uploads/2026/09/photo.jpeg", {"id": 77}),
            ("mirror:a", U, {"width": 640, "height": 480}),
        ):
            checks += 1
            S.activate(key)
            B.clear_memo()
            new, _ = B.migrate("sgs/media", {"imageUrl": url})
            entry = new.get("source", {}).get("desktop", {})
            if {k: entry.get(k) for k in want} != want or ("id" in want and "width" in entry):
                _fail("sizes: own upload", f"{key} {url}: wanted {want}, got {entry}", failures)
        checks += 1
        S.activate("mirror:c")
        B.clear_memo()
        got = B.migrate("sgs/media", {"imageUrl": "http://old.test/wp-content/uploads/2026/09/photo.jpeg"})[0]
        if "source" in got:
            _fail("sizes: negative control", "an upload missing from the site's map was resolved from another site's map", failures)
        checks += 1
        S.activate("repo")
        B.clear_memo()
        _, events = B.migrate("sgs/media", {"imageUrl": "http://x/unreadable.png"})
        if not any(e[0] == "refused" and "size could not be read" in e[3] for e in events):
            _fail("sizes: refusal", f"no refused event naming the size: {events}", failures)
        checks += 1
        got = [S.dimensions(blob) for blob in (_png_blob(), _jpeg_blob(), b'<svg xmlns="x" viewBox="0 0 30 20"></svg>', b"not an image")]
        if got != [(7, 5), (9, 4), (30, 20), None]:
            _fail("sizes: file headers", f"png, jpeg, svg, junk read as {got}", failures)
    finally:
        for key in ("mirror:a", "mirror:b"):
            S._SITES.pop(key, None)
        S.activate("repo")
        B.clear_memo()
    return checks


def _png_blob() -> bytes:
    import struct
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + struct.pack(">II", 7, 5) + b"\x08\x02\x00\x00\x00"


def _jpeg_blob() -> bytes:
    import struct
    return b"\xff\xd8\xff\xe0" + struct.pack(">H", 4) + b"\x00\x00" + b"\xff\xc0" + struct.pack(">HBHH", 11, 8, 4, 9) + b"\x00\x00\x00\x00"


def run(break_mapping: bool = False) -> int:
    saved_reader = S.READER
    S.READER = _stub_read
    S.activate("repo")
    B.clear_memo()
    try:
        return _run(break_mapping)
    finally:
        S.READER = saved_reader
        B.clear_memo()


def _run(break_mapping: bool = False) -> int:
    if break_mapping:
        M.NEW_PREFIX[("sgs/hero", "splitMedia")] = "splitMedium"
        M.BASE_FAMILY["ObjectFit"] = ("fit", "Fitt")
        M.frozen()["rows"] = [r for r in M.rows() if not (r["block"] == "sgs/decorative-image" and r["old"] == "opacity")]
        M.rows.cache_clear()
        M.STAYS["sgs/post-grid"] = ()
    failures: list[str] = []
    total = run_cases(failures) + run_svg_keep(failures) + run_background_rules(failures) + run_carriers(failures) + run_consistency(failures) + run_frozen(failures) + run_declared_guard(failures) + run_scope(failures) + run_sizes(failures) + run_http_retry(failures) + run_inplace_json(failures) + export_selftest.run(failures) + apply_selftest.run(failures)
    for line in failures:
        print(line)
    print(f"migrate-media-system self-test: {total - len(failures)} of {total} checks passed"
          + (" (deliberately broken mapping)" if break_mapping else ""))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run("--break" in sys.argv))
