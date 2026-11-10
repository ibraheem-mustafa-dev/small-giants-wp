"""The §13 transform: one block's old attributes to its new ones. A pure function of (block name, attributes).

`migrate(name, attrs)` returns `(new_attrs, events)`. Each event is `(status, old attribute, target, note)` with status
`converted`, `deleted`, `pinned`, `reported` (resolved by hand: the old attribute stays) or `refused` (no safe
mapping: the old attribute stays). A second run over the output finds no old attribute and changes nothing.
"""
from __future__ import annotations

import copy
import re
from typing import Any

import mapping as M
import values as V
from mapping import DEVICES, TIERS, TIER_DEVICE, attr_name

EMBED = re.compile(r"youtube\.com|youtu\.be|vimeo\.com", re.I)
PLAYBACK_KEYS = (("VideoAutoplay", "autoplay"), ("VideoMuted", "muted"), ("VideoPlaysInline", "inline"),
                 ("VideoLoop", "loop"), ("VideoControls", "controls"), ("VideoLazyLoad", "lazy"))
FIT_OK = ("cover", "contain", "fill", "none", "scale-down")
REPEATS = ("repeat", "repeat-x", "repeat-y")

# Old defaults the new system does not share, pinned when the attribute was never saved (§13). Each is checked against
# the framework database by the self-test.
PIN_DEFAULTS = (
    ("sgs/decorative-image", "imageDecorative"),
    ("sgs/team-member", "photoShape"),
)
# Old defaults deliberately not pinned: Appendix A drops the hero's baked mobile focal bias unless it was saved.
UNPINNED = (("sgs/hero", "splitMediaObjectPosition"),)
OVERLAY_OPACITY_PINS = ("backgroundOverlayOpacity",)


class Ctx:
    def __init__(self, block: str, attrs: dict):
        self.block = block
        self.original = attrs
        self.attrs = copy.deepcopy(attrs)
        self.events: list[tuple] = []
        self.written: set[str] = set()

    def has(self, name: str) -> bool:
        return name in self.attrs

    def get(self, name: str, default=None):
        return self.attrs.get(name, default)

    def drop(self, name: str, status: str, target: str, note: str = "") -> None:
        if name in self.attrs and name not in self.written:
            del self.attrs[name]
            self.events.append((status, name, target, note))

    def keep(self, name: str, status: str, note: str) -> None:
        if name in self.attrs:
            self.events.append((status, name, "", note))

    def put(self, name: str, value: Any) -> None:
        self.attrs[name] = value
        self.written.add(name)


def _set(value: Any) -> bool:
    return value not in (None, "", {}, 0, "0")


class Slot:
    """A slot's old and new names. `olds` are the old entry prefixes; `new` the new prefix."""

    def __init__(self, ctx: Ctx, olds: list[str], new: str, bases: list[str]):
        self.ctx, self.olds, self.new, self.bases = ctx, olds, new, set(bases)

    def old_names(self, base: str, tier: str = "") -> list[str]:
        """Old attribute names of a base; a base the slot does not own has none."""
        return [attr_name(o, base + tier) for o in self.olds] if base in self.bases else []

    def present(self, base: str, tier: str = "") -> str | None:
        for name in self.old_names(base, tier):
            if self.ctx.has(name):
                return name
        return None

    def get(self, base: str, tier: str = ""):
        name = self.present(base, tier)
        return self.ctx.get(name) if name else None

    def all_old(self, base: str) -> list[str]:
        return [n for tier in TIERS for n in self.old_names(base, tier) if self.ctx.has(n)]

    def target(self, base: str) -> str:
        return attr_name(self.new, base)

    def stays(self, base: str) -> bool:
        """True for a base §13 leaves alone on this block (measurement data, not a display setting)."""
        return any(n in M.STAYS.get(self.ctx.block, ()) for n in self.old_names(base))

    def retire(self, base: str, status: str, target: str, note: str = "", tiers=TIERS) -> None:
        for tier in tiers:
            for name in self.old_names(base, tier):
                self.ctx.drop(name, status, target, note)

    def refuse(self, base: str, note: str) -> None:
        for tier in TIERS:
            for name in self.old_names(base, tier):
                self.ctx.keep(name, "refused", note)


# ---------------------------------------------------------------- source, alt, playback

def _file_entry(slot: Slot, kind: str, tier: str) -> dict:
    entry: dict = {"kind": kind}
    if kind == "image":
        ident, url = V.to_number(slot.get("ImageId", tier)), slot.get("ImageUrl", tier)
    elif kind == "video":
        ident, url = V.to_number(slot.get("VideoId", tier)), slot.get("VideoUrl", tier)
    else:
        markup = slot.get("SvgContent", tier)
        if isinstance(markup, str) and markup.strip():
            entry["markup"] = markup
        return entry
    if ident:
        entry["id"] = int(ident)
    if isinstance(url, str) and url:
        entry["url"] = url
    return entry


def _has_file(slot: Slot, kind: str, tier: str) -> bool:
    bases = {"image": ("ImageId", "ImageUrl"), "video": ("VideoId", "VideoUrl"), "svg": ("SvgContent",)}[kind]
    return any(_set(slot.get(b, tier)) for b in bases)


def migrate_source(slot: Slot) -> None:
    ctx = slot.ctx
    kinds = {}
    for tier in TIERS:
        raw = slot.get("MediaType", tier)
        if raw not in (None, ""):
            kinds[TIER_DEVICE[tier]] = raw
    if any(k not in ("image", "video", "svg") for k in kinds.values()):
        for base in ("MediaType", "ImageId", "ImageUrl", "VideoId", "VideoUrl", "SvgContent", "VideoSource", "VideoMimeType",
                     "Thumbnail", "ThumbnailId", "ImageWidth", "ImageHeight"):
            for name in slot.all_old(base):
                ctx.keep(name, "reported", "media type outside image, video and svg (Lottie): resolved by hand")
        return
    touched = any(slot.all_old(b) for b in ("ImageId", "ImageUrl", "VideoId", "VideoUrl", "SvgContent", "MediaType",
                                            "Thumbnail", "ThumbnailId", "VideoSource", "VideoMimeType", "ImageAlt"))
    if not touched:
        return
    source: dict = {}
    effective = "image"
    video_source = slot.get("VideoSource") or "external"
    has_video = False
    for tier in TIERS:
        device = TIER_DEVICE[tier]
        kind = kinds.get(device, effective)
        file_here = _has_file(slot, kind, tier)
        if device != "desktop" and device not in kinds and not file_here:
            continue
        entry = _file_entry(slot, kind, tier)
        if kind == "video":
            has_video = True
            if video_source != "internal" and EMBED.search(entry.get("url", "")):
                entry["kind"] = "embed"
            mime = slot.get("VideoMimeType")
            if _set(mime) and device == "desktop":
                entry["mime"] = mime
            poster = _poster(slot, tier)
            if poster:
                entry["poster"] = poster
            captions = _captions(slot, tier)
            if captions:
                entry["captions"] = captions
        if device == "desktop" and kind == "image" and not slot.stays("ImageWidth"):
            width, height = V.to_number(slot.get("ImageWidth")), V.to_number(slot.get("ImageHeight"))
            if width:
                entry["width"] = int(width)
            if height:
                entry["height"] = int(height)
        alt = slot.get("ImageAlt", tier) if tier else None
        if tier and isinstance(alt, str) and alt and alt != slot.get("ImageAlt"):
            entry["alt"] = alt
        source[device] = entry
        effective = kind
    target = slot.target("Source")
    if source:
        existing = ctx.get(target) if isinstance(ctx.get(target), dict) else {}
        ctx.put(target, {**existing, **source})
    for base in ("ImageId", "ImageUrl", "VideoId", "VideoUrl", "SvgContent", "MediaType", "VideoSource", "VideoMimeType",
                 "Thumbnail", "ThumbnailId", "ImageWidth", "ImageHeight", "VideoCaptionsId", "VideoCaptionsUrl",
                 "VideoCaptionsLabel", "VideoCaptionsSrcLang"):
        if not slot.stays(base):
            slot.retire(base, "converted", target)
    slot._has_video = has_video  # noqa: SLF001 (read by migrate_playback)


def _poster(slot: Slot, tier: str):
    ident, url = V.to_number(slot.get("ThumbnailId", tier)), slot.get("Thumbnail", tier)
    poster: dict = {}
    if ident:
        poster["id"] = int(ident)
    if isinstance(url, str) and url:
        poster["url"] = url
    return poster or None


def _captions(slot: Slot, tier: str):
    ident, url = V.to_number(slot.get("VideoCaptionsId", tier)), slot.get("VideoCaptionsUrl", tier)
    if not ident and not url:
        return None
    out: dict = {}
    if ident:
        out["id"] = int(ident)
    elif url:
        out["url"] = url
    out["label"] = slot.get("VideoCaptionsLabel", tier) or slot.get("VideoCaptionsLabel") or "English"
    out["lang"] = slot.get("VideoCaptionsSrcLang", tier) or slot.get("VideoCaptionsSrcLang") or "en"
    return out


def migrate_alt(slot: Slot) -> None:
    ctx = slot.ctx
    has_video = getattr(slot, "_has_video", False)
    alt = slot.get("ImageAlt")
    if not _set(alt) and has_video:
        alt = slot.get("VideoAlt")
    if isinstance(alt, str) and alt:
        ctx.put(slot.target("Alt"), alt)
    source = ctx.get(slot.target("Source")) if isinstance(ctx.get(slot.target("Source")), dict) else {}
    for tier in ("Tablet", "Mobile"):
        name = slot.present("ImageAlt", tier)
        value = ctx.get(name) if name else None
        device = TIER_DEVICE[tier]
        if isinstance(value, str) and value and value != alt and (source.get(device) or {}).get("alt") != value:
            ctx.drop(name, "deleted", "", f"dropped value {value!r}: the {device} has no file of its own, so its alt text has no Source to sit in")
    for name in slot.old_names("VideoAlt"):
        value = ctx.get(name) if ctx.has(name) else None
        if isinstance(value, str) and value and value != alt:
            ctx.drop(name, "deleted", "", f"dropped value {value!r}: the slot's media is not a video, so a video alt has nowhere to go")
    slot.retire("ImageAlt", "converted", slot.target("Alt"), "a per-device alt that differs moved into that device's Source")
    slot.retire("VideoAlt", "converted", slot.target("Alt"))
    decorative = slot.get("ImageDecorative")
    if isinstance(decorative, bool):
        ctx.put(slot.target("Decorative"), decorative)
    slot.retire("ImageDecorative", "converted", slot.target("Decorative"))


def migrate_playback(slot: Slot) -> None:
    ctx = slot.ctx
    names = [n for base, _ in PLAYBACK_KEYS for n in slot.all_old(base)]
    target = slot.target("Playback")
    has_video = getattr(slot, "_has_video", False)
    if not names and not has_video:
        return
    if not has_video:
        for name in names:
            ctx.drop(name, "deleted", target, "inert: the slot shows no video")
        return
    playback = {}
    for base, key in PLAYBACK_KEYS:
        raw = slot.get(base)
        if raw is None:
            if not slot.old_names(base):
                continue  # this slot never had the attribute (a before/after side has no playback attributes of its own)
            raw = M.old_default(ctx.block, slot.old_names(base)[0])
            if raw is None:
                continue
            ctx.events.append(("pinned", slot.old_names(base)[0], target, f"old default {raw!r} written explicitly"))
        playback[key] = bool(raw)
    differs = []
    for base, key in PLAYBACK_KEYS:
        for tier in ("Tablet", "Mobile"):
            raw = slot.get(base, tier)
            if raw is not None and bool(raw) != playback.get(key, bool(slot.get(base))):
                differs.append(slot.present(base, tier))
    for name in differs:
        ctx.keep(name, "refused", "per-device playback differs from desktop: Playback is not per device")
    if playback:
        ctx.put(target, playback)
    for base, _ in PLAYBACK_KEYS:
        for tier in TIERS:
            for name in slot.old_names(base, tier):
                if name not in differs:
                    ctx.drop(name, "converted", target)


# ---------------------------------------------------------------- fit, focal, sizing, shape, opacity

def migrate_fit(slot: Slot) -> None:
    ctx = slot.ctx
    fit: dict = {}
    for tier in TIERS:
        for base in ("ObjectFit", "Size"):
            name = slot.present(base, tier)
            if not name:
                continue
            raw = ctx.get(name)
            if raw in FIT_OK or (base == "Size" and raw in ("cover", "contain")):
                fit[TIER_DEVICE[tier]] = raw
            elif raw in (None, ""):
                continue
            else:
                ctx.drop(name, "deleted", "", f"value {raw!r} is outside the fit vocabulary and rendered as unset")
    if fit:
        ctx.put(slot.target("Fit"), fit)
    for base in ("ObjectFit", "Size"):
        slot.retire(base, "converted", slot.target("Fit"))


def _focal(slot: Slot, base: str, target: str) -> None:
    ctx = slot.ctx
    merged: dict = {}
    bad_names = []
    for tier in TIERS:
        name = slot.present(base, tier)
        if not name:
            continue
        parsed, bad = V.focal_value(ctx.get(name), )
        if tier:
            parsed = {TIER_DEVICE[tier]: parsed.get("desktop")} if "desktop" in parsed else {}
        if bad:
            bad_names.append(name)
            continue
        merged.update(parsed)
    for name in bad_names:
        ctx.keep(name, "refused", "focal position is not readable as keywords or percentages")
    pruned = V.prune_inherited(merged, {"x": 0.5, "y": 0.5})
    if pruned:
        ctx.put(target, pruned)
    for tier in TIERS:
        name = slot.present(base, tier)
        if name and name not in bad_names:
            ctx.drop(name, "converted", target)


def migrate_focal(slot: Slot) -> None:
    _focal(slot, "ObjectPosition", slot.target("Focal"))
    _focal(slot, "Position", slot.target("Focal"))


def migrate_background_fit(ctx: Ctx) -> None:
    """backgroundSize/Repeat/Attachment/Position (old scalar strings) to Fit, Repeat, Pinned and Focal."""
    size = ctx.get("backgroundSize") if isinstance(ctx.get("backgroundSize"), str) else None
    repeat = ctx.get("backgroundRepeat") if isinstance(ctx.get("backgroundRepeat"), str) else None
    tiled = repeat in REPEATS
    if size is not None or repeat is not None:
        fit = None
        if size in ("cover", "contain"):
            fit = size
        elif size in ("auto", None):
            fit = "tile" if tiled else ("none" if size == "auto" else None)
        else:
            ctx.keep("backgroundSize", "refused", f"background-size {size!r} has no Fit equivalent")
            return
        if fit is not None:
            ctx.put("backgroundFit", {"desktop": fit})
        if fit == "tile":
            ctx.put("backgroundRepeat", {"desktop": repeat})
        elif repeat is not None:
            ctx.attrs.pop("backgroundRepeat", None)
            ctx.events.append(("deleted", "backgroundRepeat", "", "inert without a tiled fit" if repeat != "no-repeat" else "no-repeat is the default"))
        if size is not None:
            ctx.events.append(("converted", "backgroundSize", "backgroundFit", ""))
            ctx.attrs.pop("backgroundSize", None)
    attachment = ctx.get("backgroundAttachment")
    if isinstance(attachment, str):
        if attachment == "fixed":
            ctx.put("backgroundPinned", True)
            ctx.events.append(("converted", "backgroundAttachment", "backgroundPinned", ""))
        else:
            ctx.events.append(("deleted", "backgroundAttachment", "", f"{attachment!r} is the default"))
        del ctx.attrs["backgroundAttachment"]
    position = ctx.get("backgroundPosition")
    if isinstance(position, str):
        parsed, bad = V.focal_value(position)
        if bad:
            ctx.keep("backgroundPosition", "refused", "background-position is not readable as keywords or percentages")
        else:
            pruned = V.prune_inherited(parsed, {"x": 0.5, "y": 0.5})
            if pruned:
                ctx.put("backgroundFocal", pruned)
            ctx.events.append(("converted", "backgroundPosition", "backgroundFocal", ""))
            del ctx.attrs["backgroundPosition"]


def _normalise_sizing_value(base: str, raw: Any, unit: str = "px") -> dict:
    if base == "AspectRatio":
        ratio = V.normalise_ratio(raw) if isinstance(raw, str) else None
        out = {}
        for device, value in V.device_values(raw).items():
            norm = V.normalise_ratio(value)
            if norm:
                out[device] = norm
        return out or ({"desktop": ratio} if ratio else {})
    return V.length_device_object(raw, unit)


def migrate_sizing(slot: Slot) -> None:
    ctx = slot.ctx
    mode = slot.get("MediaSizing")
    height_name = slot.present("Height")
    height = _normalise_sizing_value("Height", ctx.get(height_name)) if height_name else {}
    ratio = _normalise_sizing_value("AspectRatio", slot.get("AspectRatio"))
    if height_name and not height:
        height = {}
    if mode not in ("auto", "height", "ratio", "fill"):
        mode = "height" if height else ("ratio" if ratio else "auto")
    unit_for = {}
    for base in ("Width", "MaxWidth", "MaxHeight", "MinHeight", "Height"):
        unit = next((ctx.get(n) for n in slot.old_names(base, "Unit") if isinstance(ctx.get(n), str) and ctx.get(n)), None)
        unit_for[base] = unit or "px"
    width = _normalise_sizing_value("Width", slot.get("Width"), unit_for["Width"])
    if mode == "fill":
        new_height, new_ratio = {"desktop": "fill"}, {}
    elif mode == "ratio":
        new_height, new_ratio = {"desktop": "auto"}, ratio
    elif mode == "height":
        new_height, new_ratio = height, {}
        for device in DEVICES:
            if device in new_height and device not in width and new_height[device] not in ("auto", "fill"):
                width[device] = "auto"
    else:
        new_height, new_ratio = {}, {}
    if new_height:
        ctx.put(slot.target("Height"), new_height)
    if new_ratio:
        ctx.put(slot.target("Ratio"), new_ratio)
    if width:
        ctx.put(slot.target("Width"), width)
    for base in ("MaxWidth", "MaxHeight"):
        value = _normalise_sizing_value(base, slot.get(base), unit_for[base])
        if value:
            ctx.put(slot.target(base), value)
    min_height = _normalise_sizing_value("MinHeight", slot.get("MinHeight"), unit_for["MinHeight"])
    svg_min = slot.get("SvgMinHeight")
    if isinstance(svg_min, str) and svg_min:
        current = min_height.get("desktop")
        if current is None or (V.px_number(svg_min) or 0) > (V.px_number(current) or 0):
            min_height["desktop"] = V.length_string(svg_min) or svg_min
    if min_height:
        ctx.put(slot.target("MinHeight"), min_height)
    for base, new_base in (("MediaSizing", "Height"), ("AspectRatio", "Ratio"), ("Height", "Height"), ("Width", "Width"),
                           ("MaxWidth", "MaxWidth"), ("MaxHeight", "MaxHeight"), ("MinHeight", "MinHeight"),
                           ("SvgMinHeight", "MinHeight")):
        slot.retire(base, "converted", slot.target(new_base))
    for base in ("Width", "MaxWidth", "MaxHeight", "MinHeight", "Height"):
        for name in slot.old_names(base, "Unit"):
            ctx.drop(name, "deleted", slot.target(base), "retired length-unit partner: folded into the value")


def migrate_shape(slot: Slot) -> None:
    ctx = slot.ctx
    name = slot.present("Shape")
    if not name:
        return
    raw = ctx.get(name)
    if isinstance(raw, dict):
        return
    radius_target, shape_target = slot.target("Radius"), slot.target("Shape")
    if raw in (None, "", "none", "square"):
        ctx.drop(name, "deleted", "", f"shape {raw!r} draws nothing")
    elif raw == "rounded":
        if ctx.has(radius_target) or slot.present("BorderRadius"):
            ctx.keep(name, "refused", "rounded shape and a stored radius both set")
        else:
            ctx.put(radius_target, {"desktop": V.corners("12px")})
            ctx.drop(name, "converted", radius_target, "Corners 12px")
    elif raw in ("circle", "round"):
        ctx.put(shape_target, {"desktop": {"shape": "circle"}})
        ctx.drop(name, "converted", shape_target)
    else:
        ctx.keep(name, "refused", f"shape {raw!r} has no §8 equivalent")


def migrate_radius(slot: Slot) -> None:
    ctx = slot.ctx
    target = slot.target("Radius")
    out = dict(ctx.get(target) or {})
    for tier in TIERS:
        name = slot.present("BorderRadius", tier)
        if not name:
            continue
        raw = ctx.get(name)
        if isinstance(raw, dict) and any(k in raw for k in V.CORNERS):
            out[TIER_DEVICE[tier]] = {k: raw[k] for k in V.CORNERS if k in raw}
        elif isinstance(raw, dict) and V.is_device_object(raw):
            out.update({d: v for d, v in raw.items() if v})
        elif _set(raw):
            ctx.keep(name, "refused", "border radius is not a corner or device object")
            continue
        ctx.drop(name, "converted", target)
    if out:
        ctx.put(target, {d: out[d] for d in DEVICES if d in out})


def _opacity_device(raw: Any, scale: float) -> dict:
    out = {}
    for device, value in V.device_values(raw).items():
        number = V.to_number(value)
        if number is not None:
            out[device] = round(number * scale)
    return out


def migrate_opacity(slot: Slot) -> None:
    ctx = slot.ctx
    name = slot.present("Opacity")
    svg = V.to_number(slot.get("SvgOpacity"))
    target = slot.target("Opacity")
    if name and isinstance(ctx.get(name), dict):
        return
    if name:
        value = _opacity_device(ctx.get(name), 100)
        if svg is not None and "desktop" in value:
            value["desktop"] = round(value["desktop"] * svg / 100)
        if value:
            ctx.put(target, value)
    elif svg is not None and svg != 100:
        ctx.put(target, {"desktop": round(svg)})
    slot.retire("Opacity", "converted", target)
    slot.retire("SvgOpacity", "converted", target)


def migrate_overlay_opacity(slot: Slot) -> None:
    ctx = slot.ctx
    target = slot.target("OverlayOpacity")
    out: dict = {}
    for tier in TIERS:
        name = slot.present("OverlayOpacity", tier)
        if name:
            for device, value in V.device_values(ctx.get(name), TIER_DEVICE[tier]).items():
                number = V.to_number(value)
                if number is not None:
                    out[device] = number
    if out:
        ctx.put(target, {d: out[d] for d in DEVICES if d in out})
    slot.retire("OverlayOpacity", "converted", target)


def migrate_renames(slot: Slot) -> None:
    """Bases whose value is unchanged and whose name only takes the new prefix, or `OverlayBlend`."""
    ctx = slot.ctx
    for base, (family, target) in M.BASE_FAMILY.items():
        if family not in ("keep", "rename", "svglayer"):
            continue
        for tier in TIERS:
            for name in slot.old_names(base, tier):
                if not ctx.has(name):
                    continue
                new_name = attr_name(slot.new, target + tier)
                value = ctx.get(name)
                if family == "svglayer":
                    mapped = {"background": "behind", "foreground": "front"}.get(value)
                    if mapped is None:
                        ctx.keep(name, "refused", f"layer order {value!r} not recognised")
                        continue
                    value = mapped
                if new_name == name:
                    continue
                if new_name in ctx.attrs and ctx.get(new_name) != value:
                    ctx.keep(name, "refused", f"target {new_name} already holds a different value")
                    continue
                ctx.put(new_name, value)
                ctx.drop(name, "converted", new_name)


def migrate_report(slot: Slot) -> None:
    for base, (family, reason) in M.BASE_FAMILY.items():
        if family == "report":
            for name in slot.all_old(base):
                slot.ctx.keep(name, "reported", reason)


def migrate_slot(ctx: Ctx, olds: list[str], new: str, bases: list[str]) -> None:
    slot = Slot(ctx, olds, new, bases)
    migrate_report(slot)
    migrate_source(slot)
    migrate_alt(slot)
    migrate_playback(slot)
    migrate_fit(slot)
    migrate_focal(slot)
    migrate_sizing(slot)
    migrate_shape(slot)
    migrate_radius(slot)
    migrate_opacity(slot)
    migrate_overlay_opacity(slot)
    migrate_renames(slot)
