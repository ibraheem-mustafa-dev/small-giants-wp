"""reveal_tokens.py — the draft's scroll reveal as site tokens (Spec 38A FR-38A-61).

Reads the handoff's ``animations.json`` (format: ``handoff-schema/animations.schema.json``) and writes the
scroll reveal into ``settings.custom.entrance`` of the snapshot:

- ``distance``, ``duration``, ``easing`` and ``scale``: the item rule's values (the heading rule's when the
  draft has no item rule). ``start`` is the observer's bottom root margin as a percentage of the viewport.
  ``staggerStep``, ``staggerCap`` (ms) and ``staggerEvery`` (the index restarts after this many items) come
  from the item record's stagger.
- ``reveal``: one named rule per record, ``item`` (children of a grid or wrapped flex container) and
  ``heading`` (an ``h1`` to ``h6`` and what follows it), each ``{"from": {...}, "duration": ms, "easing": curve}``.
  ``from`` uses the keys of ``EntranceFrom`` in ``motion.schema.json`` (a ``blur(6px)`` filter is ``blur: "6px"``).

A record is a reveal record by its fields, never its id: group ``scroll-reveal``, trigger ``scroll-into-view``,
status not ``dead-code``, and properties made only of ``opacity``, a ``transform`` of translate and scale
functions, and a ``blur`` filter, with an ``opacity`` property present (this leaves out line draws and clip
reveals). The rule is named by what the record selects. A draft with no such record writes nothing, and an
existing ``entrance.reveal`` of the snapshot is then left as it was.
"""
from __future__ import annotations

import json
import pathlib
import re

import motion_tokens

_HEADING_RE = re.compile(r"\bh[1-6]\b", re.IGNORECASE)
_ITEM_RE = re.compile(r"\b(?:children|grid|flex)\b", re.IGNORECASE)
_ROOT_MARGIN_RE = re.compile(r"rootMargin\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+?)[,;.]?(?:\s|$)", re.IGNORECASE)
_MODULO_RE = re.compile(r"modulo\s+(\d+)", re.IGNORECASE)
_FN_RE = re.compile(r"(translateX|translateY|scale)\(\s*([^)]+?)\s*\)")
_BLUR_RE = re.compile(r"^blur\(\s*([^)]+?)\s*\)$")
_NUMBER = re.compile(r"^-?\d*\.?\d+$")
_PERCENT_RE = re.compile(r"^(-?\d*\.?\d+)%$")


def _fmt(num: float):
    return int(num) if float(num).is_integer() else round(num, 4)


def read_records(handoff: pathlib.Path) -> list:
    """Every record of the handoff's ``animations.json``, or an empty list when the file is missing."""
    path = pathlib.Path(handoff) / "animations.json"
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    found: list = []

    def walk(node) -> None:
        if isinstance(node, dict):
            if "mechanism" in node and "trigger" in node and "properties" in node:
                found.append(node)
                return
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(data)
    return found


def _from_values(properties: list) -> dict | None:
    """The record's start values as ``EntranceFrom`` keys, or None when a property cannot be expressed."""
    start: dict = {}
    for prop in properties:
        name, value = prop.get("property"), prop.get("from")
        if name == "opacity" and isinstance(value, (int, float)):
            start["opacity"] = _fmt(value)
        elif name == "transform" and isinstance(value, str):
            rest = _FN_RE.sub("", value).strip()
            if rest:
                return None
            for fn, arg in _FN_RE.findall(value):
                if fn == "scale":
                    if not _NUMBER.match(arg):
                        return None
                    start["scale"] = _fmt(float(arg))
                else:
                    start[fn[0].lower() + fn[1:]] = arg.replace(" ", "")
        elif name == "filter" and isinstance(value, str):
            blur = _BLUR_RE.match(value.strip())
            if not blur:
                return None
            start["blur"] = blur.group(1).replace(" ", "")
        else:
            return None
    return start if "opacity" in start else None


def _role(record: dict) -> str | None:
    element = record.get("element") or {}
    text = f"{element.get('selector', '')} {element.get('selection_rule', '')}"
    if record.get("stagger") and _ITEM_RE.search(text):
        return "item"
    if _HEADING_RE.search(text):
        return "heading"
    return None


def reveal_rules(records: list) -> dict:
    """``{"item": {...}, "heading": {...}}`` for the reveal records, the first record of each name winning.
    Each value is ``{"from", "duration", "easing", "record"}``; a name with no record is absent."""
    rules: dict = {}
    for record in records:
        if (record.get("group") != "scroll-reveal" or record.get("status") == "dead-code"
                or (record.get("trigger") or {}).get("type") != "scroll-into-view"):
            continue
        start = _from_values(record.get("properties") or [])
        duration, curve = record.get("duration_ms"), motion_tokens.normalise_easing(str(record.get("easing", "")))
        role = _role(record)
        if not start or role is None or role in rules or not isinstance(duration, (int, float)) or not curve:
            continue
        rules[role] = {"from": start, "duration": _fmt(duration), "easing": curve, "record": record}
    return rules


def _start_line(record: dict) -> int | float | None:
    """The observer's bottom root margin as a positive percentage of the viewport (``-4%`` is 4)."""
    match = _ROOT_MARGIN_RE.search((record.get("trigger") or {}).get("detail", ""))
    percent = _PERCENT_RE.match(match.group(3)) if match else None
    if not percent or float(percent.group(1)) > 0:
        return None
    return _fmt(-float(percent.group(1)))


def apply_reveal(snap: dict, records: list, trace: list) -> dict:
    """Write the reveal tokens and rules (see the module docstring); a draft with no reveal record changes nothing."""
    rules = reveal_rules(records)
    if not rules:
        return snap
    primary = rules.get("item") or rules["heading"]
    entrance = snap.setdefault("settings", {}).setdefault("custom", {}).setdefault("entrance", {})
    values: dict = {"duration": f"{primary['duration']}ms", "easing": primary["easing"]}
    travel = primary["from"].get("translateY") or primary["from"].get("translateX")
    if travel:
        values["distance"] = travel.lstrip("-")
    if "scale" in primary["from"]:
        values["scale"] = primary["from"]["scale"]
    line = _start_line(primary["record"])
    if line is not None:
        values["start"] = line
    stagger = primary["record"].get("stagger") or {}
    if isinstance(stagger.get("ms"), (int, float)):
        values["staggerStep"] = _fmt(stagger["ms"])
        if isinstance(stagger.get("cap_ms"), (int, float)):
            values["staggerCap"] = _fmt(stagger["cap_ms"])
        modulo = _MODULO_RE.search(str(stagger.get("basis", "")))
        if modulo:
            values["staggerEvery"] = int(modulo.group(1))
    entrance.update(values)
    entrance["reveal"] = {name: {k: v for k, v in rule.items() if k != "record"} for name, rule in rules.items()}
    for key, value in {**values, "reveal": entrance["reveal"]}.items():
        trace.append({"kind": "motion", "what": f"settings.custom.entrance.{key}",
                      "reason": "the draft's scroll-reveal records in animations.json", "value": value})
    return snap
