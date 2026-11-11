"""Value converters for the §13 mapping: lengths, ratios, focal points, corners, device objects. All pure."""
from __future__ import annotations

import re
from typing import Any

from mapping import DEVICES

KEYWORD_AXIS = {"left": ("x", 0.0), "right": ("x", 1.0), "top": ("y", 0.0), "bottom": ("y", 1.0)}
PCT = re.compile(r"^-?\d+(?:\.\d+)?%$")
RATIO = re.compile(r"^\d+(?:\.\d+)?\s*/\s*\d+(?:\.\d+)?$")
PX = re.compile(r"^(\d+(?:\.\d+)?)px$")
CORNERS = ("topLeft", "topRight", "bottomRight", "bottomLeft")
SIDES = ("top", "right", "bottom", "left")


def is_device_object(value: Any) -> bool:
    return isinstance(value, dict) and bool(value) and all(k in DEVICES for k in value)


def device_values(value: Any, scalar_device: str = "desktop") -> dict:
    """A stored value as {device: value}: a device object as is, any other non-empty value on `scalar_device`."""
    if value is None or value == "" or value == {}:
        return {}
    if is_device_object(value):
        return {d: value[d] for d in DEVICES if d in value and value[d] not in (None, "")}
    return {scalar_device: value}


def length_string(value: Any, unit: str = "px") -> str | None:
    """A stored length as a CSS length string. A bare number takes `unit` (`sgs_emit_responsive_css`'s unit_default is px)."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return None if value == 0 and False else f"{value:g}{unit}"
    if isinstance(value, str):
        text = value.strip()
        if text == "":
            return None
        if re.fullmatch(r"-?\d+(?:\.\d+)?", text):
            return f"{text}{unit}"
        return text
    return None


def length_device_object(value: Any, unit: str = "px") -> dict:
    out = {}
    for device, raw in device_values(value).items():
        text = length_string(raw, unit)
        if text is not None:
            out[device] = text
    return out


def normalise_ratio(value: Any) -> str | None:
    """`16/9` and `16 / 9` become the spaced form; `natural` stays; anything else is not a ratio."""
    if not isinstance(value, str):
        return None
    text = value.strip()
    if text == "natural":
        return text
    if RATIO.match(text):
        a, b = [part.strip() for part in text.split("/")]
        return f"{a} / {b}"
    return None


def parse_position(text: Any):
    """A CSS position string as {x, y} in 0..1, or None when it cannot be read (px, calc, unknown words)."""
    if not isinstance(text, str):
        return None
    tokens = text.lower().split()
    if len(tokens) not in (1, 2):
        return None
    pos: dict = {}
    rest: list[str] = []
    for token in tokens:
        if token in KEYWORD_AXIS:
            axis, value = KEYWORD_AXIS[token]
            if axis in pos:
                return None
            pos[axis] = value
        else:
            rest.append(token)
    free = [axis for axis in ("x", "y") if axis not in pos]
    if len(rest) > len(free):
        return None
    for axis, token in zip(free, rest):
        if token == "center":
            pos[axis] = 0.5
        elif PCT.match(token):
            pos[axis] = float(token[:-1]) / 100
        else:
            return None
    return {"x": round(pos.get("x", 0.5), 4), "y": round(pos.get("y", 0.5), 4)}


def focal_value(raw: Any):
    """A stored focal value as ({device: {x,y}}, unreadable) from a CSS string, an {x,y} object or a device object."""
    out: dict = {}
    bad: list = []
    if isinstance(raw, dict) and "x" in raw and "y" in raw:
        try:
            return {"desktop": {"x": float(raw["x"]), "y": float(raw["y"])}}, bad
        except (TypeError, ValueError):
            return {}, [raw]
    for device, item in device_values(raw).items():
        if isinstance(item, dict) and "x" in item and "y" in item:
            try:
                out[device] = {"x": float(item["x"]), "y": float(item["y"])}
            except (TypeError, ValueError):
                bad.append(item)
            continue
        parsed = parse_position(item)
        if parsed is None:
            bad.append(item)
        else:
            out[device] = parsed
    return out, bad


def prune_inherited(values: dict, default=None) -> dict:
    """Drop a device whose value equals what it would inherit (the previous device, or `default` for desktop)."""
    out: dict = {}
    effective = default
    for device in DEVICES:
        if device in values:
            if values[device] != effective:
                out[device] = values[device]
            effective = values[device]
    return out


def corners(value: str) -> dict:
    return {corner: value for corner in CORNERS}


def to_number(value: Any):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        try:
            return float(value) if "." in value else int(value)
        except ValueError:
            return None
    return None


def px_number(text: Any):
    match = PX.match(text.strip()) if isinstance(text, str) else None
    return float(match.group(1)) if match else None
