"""Self-test of the §13 detector: a fixture per mapping family (with its expected output written out), negative
controls (byte-identical afterwards, or refused with the old attribute kept), nested blocks in markup and JSON trees,
idempotence (fix twice equals fix once), and consistency of the mapping with the code and the framework database."""
from __future__ import annotations

import json
import re
import sys

import blocks as B
import markup
import mapping as M

U = "http://x/u.jpg"
CASES: list[tuple] = []


def case(label: str, block: str, attrs: dict, expected: dict | None) -> None:
    """expected None means a negative control: the output equals the input."""
    CASES.append((label, block, attrs, attrs if expected is None else expected))


# ---- source, alt, decorative (sgs/media)
case("media: image id and url, alt, decorative", "sgs/media",
     {"imageId": 5, "imageUrl": U, "imageAlt": "A", "imageDecorative": True},
     {"source": {"desktop": {"kind": "image", "id": 5, "url": U}}, "alt": "A", "decorative": True})
case("media: per-device files and a differing tablet alt", "sgs/media",
     {"imageUrl": U, "imageUrlTablet": "http://x/t.jpg", "imageAlt": "A", "imageAltTablet": "B"},
     {"source": {"desktop": {"kind": "image", "url": U}, "tablet": {"kind": "image", "url": "http://x/t.jpg", "alt": "B"}}, "alt": "A"})
case("media: video with poster, captions, mime and the old defaults pinned", "sgs/media",
     {"mediaType": "video", "videoSource": "internal", "videoId": 9, "videoUrl": U, "videoMimeType": "video/mp4",
      "thumbnailId": 4, "thumbnail": "http://x/p.jpg", "videoCaptionsUrl": "http://x/c.vtt", "videoAutoplay": True},
     {"source": {"desktop": {"kind": "video", "id": 9, "url": U, "mime": "video/mp4", "poster": {"id": 4, "url": "http://x/p.jpg"},
                             "captions": {"url": "http://x/c.vtt", "label": "English", "lang": "en"}}},
      "playback": {"autoplay": True, "muted": True, "inline": True, "loop": False, "controls": True, "lazy": True}})
case("media: external YouTube url is an embed", "sgs/media",
     {"mediaType": "video", "videoSource": "external", "videoUrl": "https://youtu.be/abcdefghijk"},
     {"source": {"desktop": {"kind": "embed", "url": "https://youtu.be/abcdefghijk"}},
      "playback": {"autoplay": False, "muted": True, "inline": True, "loop": False, "controls": True, "lazy": True}})
case("media: inline svg", "sgs/media", {"mediaType": "svg", "svgContent": "<svg/>"},
     {"source": {"desktop": {"kind": "svg", "markup": "<svg/>"}}})
case("media: intrinsic size folded into Source", "sgs/media", {"imageUrl": U, "imageWidth": 600, "imageHeight": 400},
     {"source": {"desktop": {"kind": "image", "url": U, "width": 600, "height": 400}}})
# ---- sizing
case("media: sizing fill", "sgs/media", {"mediaSizing": "fill", "height": {"desktop": "300px"}}, {"height": {"desktop": "fill"}})
case("media: sizing height gains Width auto", "sgs/media", {"mediaSizing": "height", "height": {"desktop": "440px", "mobile": "300px"}, "width": {"mobile": "50%"}},
     {"height": {"desktop": "440px", "mobile": "300px"}, "width": {"mobile": "50%", "desktop": "auto"}})
case("media: sizing ratio", "sgs/media", {"mediaSizing": "ratio", "aspectRatio": "4/5", "height": {"desktop": "300px"}},
     {"height": {"desktop": "auto"}, "ratio": {"desktop": "4 / 5"}})
case("media: sizing auto drops the inert height and ratio", "sgs/media", {"mediaSizing": "auto", "aspectRatio": "1 / 1", "height": {"desktop": "9px"}}, {})
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
# ---- other blocks
case("decorative-image: legacy files, tiers and the old default decorative=true pinned", "sgs/decorative-image",
     {"imageId": 8, "imageUrl": U, "imageUrlTablet": "http://x/t.jpg", "hideOnTablet": True},
     {"layerSource": {"desktop": {"kind": "image", "id": 8, "url": U}, "tablet": {"kind": "image", "url": "http://x/t.jpg"}},
      "sgsHideOnTablet": True, "layerDecorative": True})
case("decorative-image: its own width, height and border are not slot attributes", "sgs/decorative-image",
     {"width": {"desktop": "200px"}, "height": {"desktop": "80px"}, "borderWidth": {"desktop": "2px"}, "opacity": 80}, None)
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
# ---- negative controls: refusals keep the old attribute; unrelated and new-shape attributes stay byte-identical
case("negative: an unreadable focal position is refused and stays", "sgs/media", {"objectPosition": "calc(1px + 2px) 5px"}, None)
case("negative: Lottie is reported and stays", "sgs/media", {"mediaType": "lottie", "imageUrl": U}, None)
case("negative: a block with no media attribute is untouched", "sgs/heading", {"content": "Hi", "level": "h2"}, None)
case("negative: an already migrated block is untouched", "sgs/media",
     {"source": {"desktop": {"kind": "image", "url": U}}, "alt": "A", "fit": {"desktop": "cover"}, "opacity": {"desktop": 50}}, None)
case("negative: hero mediaPadding and splitMediaPadding both set is refused", "sgs/hero",
     {"mediaPadding": {"desktop": {"top": "1px"}}, "splitMediaPadding": {"desktop": {"top": "2px"}}}, {"splitPadding": {"desktop": {"top": "2px"}}, "mediaPadding": {"desktop": {"top": "1px"}}})
case("negative: inline SVG logo parts are reported and stay", "sgs/responsive-logo", {"inlineSvg": True, "svgParts": []}, None)
case("negative: an out-of-vocabulary shape is refused and stays", "sgs/media", {"shape": "star"}, None)

REFUSED_STAYS = ("negative: an unreadable focal", "negative: Lottie", "negative: an out-of-vocabulary shape",
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


# Old attributes saved in content but declared nowhere (stale partners); mapped explicitly so they are deleted, not ignored.
LEGACY_UNDECLARED = {
    ("sgs/hero", "splitMediaWidthUnit"), ("sgs/hero", "splitMediaHeightUnit"), ("sgs/hero", "splitMediaMaxWidthUnit"),
    ("sgs/hero", "splitMediaMaxHeightUnit"), ("sgs/hero", "splitMediaBackground"), ("sgs/card-grid", "imageSize"),
}


def run(break_mapping: bool = False) -> int:
    if break_mapping:
        M.NEW_PREFIX[("sgs/hero", "splitMedia")] = "splitMedium"
        M.BASE_FAMILY["ObjectFit"] = ("fit", "Fitt")
    failures: list[str] = []
    total = run_cases(failures) + run_carriers(failures) + run_consistency(failures)
    for line in failures:
        print(line)
    print(f"migrate-media-system self-test: {total - len(failures)} of {total} checks passed"
          + (" (deliberately broken mapping)" if break_mapping else ""))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run("--break" in sys.argv))
