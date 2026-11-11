"""Block-level parts of the §13 transform: the background family, attributes outside the prefix grammar, item sets,
pinned defaults and the one entry point `migrate(name, attrs)`."""
from __future__ import annotations

import copy
import json
import re
from typing import Any

import mapping as M
import transform as T
import values as V
from mapping import DEVICES, TIERS, TIER_DEVICE

BG_OBJECT_KEYS = {"id", "url", "alt", "mime", "type", "width", "height", "poster"}
MEDIA_EXT = {"mp4": "video", "webm": "video", "mov": "video", "m4v": "video", "ogv": "video"}


# ---------------------------------------------------------------- shared helpers

def object_entry(value: Any):
    """An old media object or bare URL as (Source entry, alt, extra keys). None when it is empty."""
    if isinstance(value, str):
        value = {"url": value} if value else {}
    if not isinstance(value, dict) or not value:
        return None
    entry: dict = {}
    ident = V.to_number(value.get("id"))
    url = value.get("url")
    kind = value.get("type") if value.get("type") in ("image", "video", "svg") else None
    if kind is None:
        mime = value.get("mime") or ""
        ext = (url or "").split("?")[0].rsplit(".", 1)[-1].lower() if isinstance(url, str) else ""
        kind = "video" if mime.startswith("video/") or MEDIA_EXT.get(ext) else "image"
    entry["kind"] = kind
    if ident:
        entry["id"] = int(ident)
    if isinstance(url, str) and url:
        entry["url"] = url
    for key in ("mime", "width", "height"):
        if value.get(key) not in (None, "", 0):
            entry[key] = value[key]
    extra = sorted(set(value) - BG_OBJECT_KEYS)
    return entry, value.get("alt") if isinstance(value.get("alt"), str) else "", extra


def _source_from_objects(ctx: T.Ctx, names: dict, target: str, id_name: str | None = None, flat_id: str | None = None) -> bool:
    """names: {device: attribute holding an object or URL}. Writes the R Source; returns whether it was written."""
    source: dict = {}
    consumed = []
    for device in DEVICES:
        name = names.get(device)
        if not name or not ctx.has(name):
            continue
        got = object_entry(ctx.get(name))
        if got is None:
            consumed.append(name)
            continue
        entry, alt, extra = got
        if extra:
            ctx.keep(name, "refused", f"unexpected keys {extra} in a media object")
            return False
        if device == "desktop" and flat_id and V.to_number(ctx.get(flat_id)) and "id" not in entry:
            entry["id"] = int(V.to_number(ctx.get(flat_id)))
        source[device] = entry
        consumed.append(name)
    if flat_id and ctx.has(flat_id) and "desktop" not in source and V.to_number(ctx.get(flat_id)):
        source["desktop"] = {"kind": "image", "id": int(V.to_number(ctx.get(flat_id)))}
    if source:
        existing = ctx.get(target) if isinstance(ctx.get(target), dict) else {}
        ctx.put(target, {**existing, **source})
    for name in consumed + ([flat_id] if flat_id and ctx.has(flat_id) else []):
        ctx.drop(name, "converted", target)
    return bool(source)


# ---------------------------------------------------------------- background family

def migrate_background(ctx: T.Ctx) -> None:
    image = {d: ("backgroundImage" + t) for t, d in ((t, TIER_DEVICE[t]) for t in TIERS) if ctx.has("backgroundImage" + t)}
    video = {d: ("bgVideo" + t) for t, d in ((t, TIER_DEVICE[t]) for t in TIERS) if ctx.has("bgVideo" + t)}
    svg = ctx.get("bgSvgContent")
    has_svg = isinstance(svg, str) and svg.strip() != ""
    if has_svg and (image or video):
        for name in ("bgSvgContent", *image.values(), *video.values()):
            ctx.keep(name, "refused", "an SVG background combined with an image or video: kinds are exclusive per device")
        return
    source: dict = {}
    consumed: list[str] = []
    alt_text = ""
    for device in DEVICES:
        if device in video:
            got = object_entry(ctx.get(video[device]))
            consumed.append(video[device])
            if got and not got[2]:
                entry = got[0]
                entry["kind"] = "embed" if re.search(r"youtube\.com|youtu\.be|vimeo\.com", entry.get("url", "")) else "video"
                poster = object_entry(ctx.get(image[device])) if device in image else None
                if poster:
                    entry["poster"] = {k: v for k, v in poster[0].items() if k in ("id", "url")}
                    consumed.append(image[device])
                source[device] = entry
            elif got:
                ctx.keep(video[device], "refused", f"unexpected keys {got[2]} in a media object")
                return
        elif device in image:
            got = object_entry(ctx.get(image[device]))
            consumed.append(image[device])
            if got and not got[2]:
                source[device] = got[0]
                alt_text = alt_text or got[1]
            elif got:
                ctx.keep(image[device], "refused", f"unexpected keys {got[2]} in a media object")
                return
    if has_svg:
        source["desktop"] = {"kind": "svg", "markup": svg}
        consumed.append("bgSvgContent")
    if source:
        ctx.put("backgroundSource", source)
        if alt_text:
            ctx.put("backgroundAlt", alt_text)
            ctx.put("backgroundDecorative", False)
    for name in consumed:
        ctx.drop(name, "converted", "backgroundSource")
    # Background fit, focal point, pinned and repeat.
    if any(ctx.has(n) for n in ("backgroundSize", "backgroundRepeat", "backgroundAttachment", "backgroundPosition")):
        T.migrate_background_fit(ctx)
    # SVG presentation.
    layer = ctx.get("bgSvgPosition")
    if layer is not None:
        mapped = {"background": "behind", "foreground": "front"}.get(layer)
        if mapped:
            ctx.put("backgroundSvgLayer", mapped)
            ctx.drop("bgSvgPosition", "converted", "backgroundSvgLayer")
        else:
            ctx.keep("bgSvgPosition", "refused", f"layer order {layer!r} not recognised")
    opacity = V.to_number(ctx.get("bgSvgOpacity"))
    if ctx.has("bgSvgOpacity"):
        if opacity is not None and opacity != 100 and "desktop" in source and source["desktop"].get("kind") == "svg":
            ctx.put("backgroundOpacity", {"desktop": opacity})
        ctx.drop("bgSvgOpacity", "converted", "backgroundOpacity", "100 is the default")
    min_height = ctx.get("bgSvgMinHeight")
    if ctx.has("bgSvgMinHeight"):
        text = V.length_string(min_height)
        if text:
            existing = V.device_values(ctx.get("minHeight")) if ctx.has("minHeight") else {}
            if existing and (V.px_number(existing.get("desktop")) or 0) >= (V.px_number(text) or 0):
                pass
            else:
                merged = dict(existing)
                merged["desktop"] = text
                ctx.put("minHeight", merged)
        ctx.drop("bgSvgMinHeight", "converted", "minHeight")
    for old in ("bgSvgTextShadow", "bgSvgParts", "bgSvgPartsTrigger"):
        new = "background" + old[2:]
        if ctx.has(old):
            ctx.put(new, ctx.get(old))
            ctx.drop(old, "converted", new)
    if ctx.has("backgroundOverlayBlendMode"):
        ctx.put("backgroundOverlayBlend", ctx.get("backgroundOverlayBlendMode"))
        ctx.drop("backgroundOverlayBlendMode", "converted", "backgroundOverlayBlend")
    # Pinned default: the old overlay strength was 30 per cent where the new default is 100.
    if (ctx.has("backgroundOverlayColour") or ctx.has("backgroundOverlayGradient")) and not ctx.has("backgroundOverlayOpacity"):
        default = M.old_default(ctx.block, "backgroundOverlayOpacity")
        if isinstance(default, dict) and default:
            ctx.put("backgroundOverlayOpacity", default)
            ctx.events.append(("pinned", "backgroundOverlayOpacity", "backgroundOverlayOpacity", f"old default {default!r} written explicitly"))


# ---------------------------------------------------------------- attributes outside the prefix grammar

def _device_string(value: Any) -> dict:
    return {d: v for d, v in V.device_values(value).items() if isinstance(v, str) and v}


def migrate_extras(ctx: T.Ctx) -> None:
    block = ctx.block
    for (b, old), (family, target) in M.EXTRA.items():
        if b != block or not ctx.has(old):
            continue
        value = ctx.get(old)
        if family == "delete":
            ctx.drop(old, "deleted", "", target)
        elif family == "rename":
            _move(ctx, old, target, value)
        elif family == "alignment":
            moved = {"desktop": value} if isinstance(value, str) and value else value
            _move(ctx, old, target, moved)
        elif family == "hideon":
            if value is True and ctx.get(target) is not True:
                ctx.put(target, True)
            ctx.drop(old, "converted", target)
        elif family == "report":
            ctx.keep(old, "reported", target)
        elif family == "fit":
            fit = value if isinstance(value, dict) else ({"desktop": value} if value in T.FIT_OK else {})
            if fit:
                ctx.put(target, fit)
            ctx.drop(old, "converted", target)
        elif family == "sizing":
            _plain_sizing(ctx, old, target, value)
        elif family == "shape":
            _plain_shape(ctx, old, target, value)
        elif family == "radius":
            _plain_radius(ctx, old, target, value)
        elif family == "opacity":
            _plain_opacity(ctx, old, target, value)
        elif family == "alt":
            if isinstance(value, bool) or isinstance(value, str):
                _move(ctx, old, target, value)
        elif family == "source":
            pass  # handled by migrate_object_sources
    migrate_object_sources(ctx)


def _move(ctx: T.Ctx, old: str, target: str, value: Any) -> None:
    if target == old:
        if ctx.get(old) != value:
            ctx.put(old, value)
            ctx.events.append(("converted", old, target, "value reshaped in place"))
        return
    if ctx.has(target) and ctx.get(target) != value:
        ctx.keep(old, "refused", f"target {target} already holds a different value")
        return
    ctx.put(target, value)
    ctx.drop(old, "converted", target)


def _plain_sizing(ctx: T.Ctx, old: str, target: str, value: Any) -> None:
    if isinstance(value, bool):
        if value and target.endswith("Height"):
            ctx.put(target, {"desktop": "fill"})
        ctx.drop(old, "converted" if value else "deleted", target, "" if value else "false is the default")
        return
    if target.endswith("Ratio"):
        out = {}
        for device, item in V.device_values(value).items():
            norm = V.normalise_ratio(item)
            if norm:
                out[device] = norm
        if V.device_values(value) and not out:
            ctx.keep(old, "refused", "aspect ratio is not in w / h form")
            return
    else:
        out = V.length_device_object(value)
    if out and target == old and out == value:
        return
    if out:
        ctx.put(target, out)
    if target != old or not out:
        ctx.drop(old, "converted", target)


def _plain_opacity(ctx: T.Ctx, old: str, target: str, value: Any) -> None:
    """Photo opacity as a per-device 0 to 100 number (§8 Opacity); the block's old scale comes from `OPACITY_SCALE`."""
    scale = M.OPACITY_SCALE.get(ctx.block, 100)
    out = {}
    for device, raw in V.device_values(value).items():
        number = V.to_number(raw)
        if number is not None:
            out[device] = round(number * scale)
    if not out and value not in (None, "", {}):
        ctx.keep(old, "refused", "opacity is not a number or device object")
        return
    if out and any(v != 100 for v in out.values()):
        ctx.put(target, out)
    ctx.drop(old, "converted", target, "" if out and any(v != 100 for v in out.values()) else "100 is the default")


def _plain_radius(ctx: T.Ctx, old: str, target: str, value: Any) -> None:
    if isinstance(value, str) and value.strip():
        new = {"desktop": V.corners(value.strip())}
    elif isinstance(value, dict) and any(k in value for k in V.CORNERS):
        new = {"desktop": value}
    elif isinstance(value, dict) and V.is_device_object(value):
        new = value
    else:
        if value not in (None, "", {}):
            ctx.keep(old, "refused", "radius is not a length, corner object or device object")
        return
    _move(ctx, old, target, new)


def _plain_shape(ctx: T.Ctx, old: str, target: str, value: Any) -> None:
    if not isinstance(value, str):
        return
    prefix = target[: -len("Shape")]
    radius, shape = M.attr_name(prefix, "Radius"), M.attr_name(prefix, "Shape")
    if value in ("", "none", "square"):
        if M.old_default(ctx.block, old) not in (None, "", "none", "square"):
            ctx.drop(old, "converted", shape, f"{value!r} written as an explicit none: the old default {M.old_default(ctx.block, old)!r} must not return")
            ctx.put(shape, {"desktop": {"shape": "none"}})
        else:
            ctx.drop(old, "deleted", "", f"shape {value!r} draws nothing")
    elif value == "rounded":
        if ctx.has(radius):
            ctx.keep(old, "refused", "rounded shape and a stored radius both set")
            return
        ctx.put(radius, {"desktop": V.corners("12px")})
        ctx.drop(old, "converted", radius, "Corners 12px")
    elif value in ("circle", "round"):
        ctx.drop(old, "converted", shape)
        ctx.put(shape, {"desktop": {"shape": "circle"}})
        if old == "photoShape" and not ctx.has("photoRatio"):
            ctx.put("photoRatio", {"desktop": "1 / 1"})
    else:
        ctx.keep(old, "refused", f"shape {value!r} has no §8 equivalent")


# Sources stored as one object (or a bare URL) per device outside the prefix grammar: block -> [(target, {device: attribute}, flat id attribute)].
OBJECT_SOURCES = {
    "sgs/team-member": [("photoSource", {"desktop": "photo", "tablet": "photoTablet", "mobile": "photoMobile"}, None)],
    "sgs/testimonial": [
        ("avatarSource", {"desktop": "avatarMedia", "tablet": "avatarMediaTablet", "mobile": "avatarMediaMobile"}, None),
        ("logoSource", {"desktop": "orgLogo"}, None),
        ("workSource", {"desktop": "workMedia"}, None),
    ],
    "sgs/image-sequence": [("thumbnailSource", {"desktop": "thumbnail", "tablet": "thumbnailTablet", "mobile": "thumbnailMobile"}, None)],
    "sgs/decorative-image": [("layerSource", {"desktop": "decorMedia"}, None)],
    "sgs/product-card": [("imageSource", {"desktop": "image"}, "imageId")],
    "sgs/choice-flow": [("headerLogoSource", {"desktop": "headerLogo"}, None)],
    "sgs/responsive-logo": [("logoDarkSource", {}, "darkLogoId")],
}


def migrate_object_sources(ctx: T.Ctx) -> None:
    for target, names, flat_id in OBJECT_SOURCES.get(ctx.block, []):
        if any(ctx.has(n) for n in names.values()) or (flat_id and ctx.has(flat_id)):
            _source_from_objects(ctx, names, target, flat_id=flat_id)
    for id_name, url_name, target, device in _pairs(ctx):
        entry: dict = {"kind": "image"}
        ident, url = V.to_number(ctx.get(id_name)), ctx.get(url_name)
        if ident:
            entry["id"] = int(ident)
        if isinstance(url, str) and url:
            entry["url"] = url
        if len(entry) > 1:
            source = dict(ctx.get(target)) if isinstance(ctx.get(target), dict) else {}
            source[device] = entry
            ctx.put(target, source)
        ctx.drop(id_name, "converted", target)
        ctx.drop(url_name, "converted", target)


PAIR_SPECS = (
    ("sgs/responsive-logo", "logoId", "logoUrl", "logoSource"),
    ("sgs/nav-drawer", "chromeLogoId", "chromeLogoUrl", "chromeLogoSource"),
    ("sgs/measured-diagram", "drawingImageId", "drawingImageUrl", "drawingSource"),
)


def _pairs(ctx: T.Ctx):
    for block, id_base, url_base, target in PAIR_SPECS:
        if block != ctx.block:
            continue
        for tier in TIERS:
            id_name, url_name = id_base + tier, url_base + tier
            if ctx.has(id_name) or ctx.has(url_name):
                yield id_name, url_name, target, TIER_DEVICE[tier]


# ---------------------------------------------------------------- item sets

ITEM_SETS = (
    ("sgs/gallery", "mediaItems", "gallery"),
    ("sgs/brand-strip", "logos", "brand"),
    ("sgs/card-grid", "items", "card"),
    ("sgs/form-field-tiles", "tiles", "tile"),
    ("sgs/option-picker", "optionItems", "option"),
)


def migrate_items(ctx: T.Ctx) -> None:
    for block, attr, shape in ITEM_SETS:
        if block != ctx.block or not isinstance(ctx.get(attr), list):
            continue
        items = ctx.get(attr)
        out = []
        for item in items:
            out.append(_item(ctx, attr, item, shape))
        if out != items:
            ctx.put(attr, out)
            ctx.events.append(("converted", attr, attr, f"{len(items)} items"))


def _item(ctx: T.Ctx, attr: str, item: Any, shape: str):
    if not isinstance(item, dict) or "source" in item:
        return item
    new = dict(item)
    entry = None
    alt = item.get("alt") if isinstance(item.get("alt"), str) else ""
    if shape == "brand":
        got = object_entry(new.pop("media", None))
        if got:
            entry, media_alt, _ = got
            alt = alt or media_alt
    elif shape == "gallery":
        if item.get("url") or item.get("id"):
            got = object_entry({k: item[k] for k in ("id", "url", "mime", "width", "height") if k in item})
            entry = got[0] if got else None
            for key in ("id", "url", "mime", "width", "height"):
                new.pop(key, None)
    else:
        key = {"card": "media", "tile": "image", "option": "image"}[shape]
        got = object_entry(new.pop(key, None))
        if got:
            entry, media_alt, _ = got
            alt = alt or media_alt
    if entry is None:
        return item
    new["source"] = {"desktop": entry}
    if alt:
        new["alt"] = alt
    if new.pop("decorative", None) is True:
        new["decorative"] = True
    fit = new.pop("objectFit", None)
    if fit in T.FIT_OK:
        new["fit"] = {"desktop": fit}
    focal = new.pop("focalPoint", None)
    parsed, bad = V.focal_value(focal) if focal else ({}, [])
    if parsed and V.prune_inherited(parsed, {"x": 0.5, "y": 0.5}):
        new["focal"] = V.prune_inherited(parsed, {"x": 0.5, "y": 0.5})
    return new


# ---------------------------------------------------------------- pinned defaults

def apply_pins(ctx: T.Ctx) -> None:
    original = ctx.original
    if ctx.block == "sgs/decorative-image" and "imageDecorative" not in original and "layerDecorative" not in original:
        default = M.old_default(ctx.block, "imageDecorative")
        if default is True and (ctx.has("layerSource") or ctx.has("decorMedia") or ctx.has("imageUrl") or ctx.has("imageId")):
            ctx.put("layerDecorative", True)
            ctx.events.append(("pinned", "imageDecorative", "layerDecorative", "old default true written explicitly"))
    if ctx.block == "sgs/team-member" and "photoShape" not in original:
        if M.old_default(ctx.block, "photoShape") == "circle":
            ctx.put("photoShape", {"desktop": {"shape": "circle"}})
            ctx.events.append(("pinned", "photoShape", "photoShape", "old default circle written explicitly"))
            if not ctx.has("photoRatio"):
                ctx.put("photoRatio", {"desktop": "1 / 1"})


def migrate_report_always(ctx: T.Ctx) -> None:
    for name in list(ctx.attrs):
        if name in M.REPORT_ALWAYS:
            ctx.keep(name, "reported", M.REPORT_ALWAYS[name])
        elif any(p.match(name) for p in M.REPORT_PATTERNS):
            ctx.keep(name, "reported", "Hover effect on the media part (WP-10a)")


UNLISTED_PREFIXES = ("splitMedia", "badgeImage")


def migrate_unlisted(ctx: T.Ctx) -> None:
    """A saved attribute under a long, media-only slot prefix that no row maps is refused, never ignored."""
    rows = [r for r in M.rows() if r["block"] in (ctx.block, "*")]
    known = {r["old"] for r in rows} | {r["target"] for r in rows}
    for prefix in UNLISTED_PREFIXES:
        if prefix not in {o for s in M.merged_slots(ctx.block) for o in s["olds"]}:
            continue
        for name in list(ctx.attrs):
            rest = name[len(prefix):]
            if name.startswith(prefix) and rest[:1].isupper() and name not in known and name not in ctx.written:
                ctx.keep(name, "refused", "unmapped legacy attribute: no mapping row for this attribute under the slot prefix")


UNMAPPED_NOTE = "unmapped legacy attribute: no mapping row and not in STAYS"


def migrate_unmapped(ctx: T.Ctx) -> None:
    """A saved media-looking attribute with neither a row nor a STAYS entry is reported, never left silently."""
    reported = {e[1] for e in ctx.events}
    for name in M.unmapped_attributes(ctx.block, [n for n in ctx.attrs if n not in ctx.written and n not in reported]):
        ctx.keep(name, "refused", UNMAPPED_NOTE)


# ---------------------------------------------------------------- entry point

_MEMO: dict = {}


def clear_memo() -> None:
    """Forget every kept result (call wherever the mapping caches are cleared, so no result outlives the facts it came from)."""
    _MEMO.clear()


def migrate(name: str, attrs: dict):
    """(new attributes, events). Saved content repeats the same attribute set across revisions, so results are kept per input."""
    key = (name, json.dumps(attrs, sort_keys=True, ensure_ascii=True))
    if key not in _MEMO:
        _MEMO[key] = _migrate(name, attrs)
    new, events = _MEMO[key]
    return copy.deepcopy(new), list(events)


def _migrate(name: str, attrs: dict):
    ctx = T.Ctx(name, attrs)
    for slot in M.merged_slots(name):
        T.migrate_slot(ctx, slot["olds"], slot["new"], slot["bases"])
    if name in M.BACKGROUND_BLOCKS:
        migrate_background(ctx)
    migrate_extras(ctx)
    migrate_items(ctx)
    apply_pins(ctx)
    migrate_report_always(ctx)
    migrate_unlisted(ctx)
    migrate_unmapped(ctx)
    return ctx.attrs, ctx.events


def needs_migration(name: str, attrs: dict):
    """(new attrs, events, in-place changes): what a fix would do. Empty events and no in-place change means clean."""
    new, events = migrate(name, attrs)
    in_place = sorted(k for k in attrs if k in new and new[k] != attrs[k])
    return new, events, in_place


def old_attributes(name: str, attrs: dict) -> list[tuple]:
    """(attribute, status) for every old attribute the transform touches or refuses, in-place changes included."""
    _, events, in_place = needs_migration(name, attrs)
    found = {(e[1], e[0]) for e in events if e[0] != "pinned"}
    found |= {(k, "converted") for k in in_place}
    return sorted(found)


def pinned_defaults(name: str, attrs: dict) -> list[str]:
    _, events = migrate(name, attrs)
    return [e[1] for e in events if e[0] == "pinned"]
