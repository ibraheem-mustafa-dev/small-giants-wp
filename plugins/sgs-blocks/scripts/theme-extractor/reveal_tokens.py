"""reveal_tokens.py — the draft's scroll reveal as site tokens (Spec 38A FR-38A-61).

Reads the handoff's ``animations.json`` (format: ``handoff-schema/animations.schema.json``) and writes the
scroll reveal into ``settings.custom.entrance`` of the snapshot:

- ``distance``, ``duration``, ``easing`` and ``scale``: the item rule's values (the heading rule's when the
  draft has no item rule, the marked rule's when it has neither). ``start`` is the observer's bottom root margin
  as a percentage of the viewport. ``staggerStep``, ``staggerCap`` (ms) and ``staggerEvery`` (the index restarts
  after this many items) come from that record's stagger.
- ``reveal``: one named rule per structural selection, ``item`` (children of a grid or wrapped flex container)
  and ``heading`` (an ``h1`` to ``h6`` and what follows it), each ``{"from": {...}, "duration": ms, "easing": curve}``.
  ``from`` uses the keys of ``EntranceFrom`` in ``motion.schema.json`` (a ``blur(6px)`` filter is ``blur: "6px"``).

A record is a reveal record by its fields, never its id: group ``scroll-reveal``, trigger ``scroll-into-view``,
status not ``dead-code``, and properties made only of ``opacity``, a ``transform`` of translate and scale
functions, the standalone ``translate``, ``scale`` and ``rotate`` properties, and a ``blur`` filter, with an
``opacity`` property present (this leaves out line draws and clip reveals). The rule is named by what the record
selects: ``item``, ``heading``, or ``marked`` when the draft marks each revealing element with an attribute
(``[data-reveal]``). A marked reveal has no structure a renderer could select by, so it writes the tokens only and
no ``reveal`` rule: the clone sets the entrance on each marked element, pointing at these tokens. Several records
of one name (a draft with one file per page) give the values most of them share; a record that differs is a
per-page variant. Every ``scroll-reveal`` record that gives no value is named in the trace with its reason, as
is every variant. A draft with no usable record writes nothing, and an existing ``entrance.reveal`` of the
snapshot is left as it was whenever the draft gives no ``item`` or ``heading`` rule.
"""
from __future__ import annotations

import json
import pathlib
import re

import motion_tokens

_HEADING_RE = re.compile(r"\bh[1-6]\b", re.IGNORECASE)
_ITEM_RE = re.compile(r"\b(?:children|grid|flex)\b", re.IGNORECASE)
_MARK_RE = re.compile(r"\[\s*(data-[a-z0-9-]+)\s*\]", re.IGNORECASE)
_ROOT_MARGIN_RE = re.compile(r"rootMargin\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+?)[,;.]?(?:\s|$)", re.IGNORECASE)
_MODULO_RE = re.compile(r"modulo\s+(\d+)", re.IGNORECASE)
_FN_RE = re.compile(r"(translateX|translateY|scale)\(\s*([^)]+?)\s*\)")
_BLUR_RE = re.compile(r"^blur\(\s*([^)]+?)\s*\)$")
_NUMBER = re.compile(r"^-?\d*\.?\d+$")
_PERCENT_RE = re.compile(r"^(-?\d*\.?\d+)%$")
_ZERO_RE = re.compile(r"^-?(?:0+\.?0*|\.0+)(?:px|em|rem|%|vh|vw|svh|dvh)?$")
_ANGLE_RE = re.compile(r"^-?(?:\d{1,3}(?:\.\d+)?|\.\d+)deg$|^-?(?:\d(?:\.\d+)?|\.\d+)turn$")
STRUCTURAL = ("item", "heading")


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


def start_values(properties: list) -> tuple[dict | None, str | None]:
    """``(start, None)`` with the record's start values as ``EntranceFrom`` keys, or ``(None, why)`` naming the
    property that cannot be expressed."""
    start: dict = {}
    for prop in properties:
        name, value = prop.get("property"), prop.get("from")
        text = value.strip() if isinstance(value, str) else None
        if name == "opacity" and isinstance(value, (int, float)):
            start["opacity"] = _fmt(value)
        elif name == "transform" and text is not None:
            if _FN_RE.sub("", text).strip():
                return None, f"transform {value!r} holds more than translateX, translateY and scale"
            for fn, arg in _FN_RE.findall(text):
                if fn == "scale":
                    if not _NUMBER.match(arg):
                        return None, f"transform scale {arg!r} is not one number"
                    start["scale"] = _fmt(float(arg))
                else:
                    start[fn[0].lower() + fn[1:]] = arg.replace(" ", "")
        elif name == "translate" and text is not None:
            # The standalone property, `translate: <x> [<y>]`. A third value is depth, which an entrance has no key for.
            parts = [] if text == "none" else text.split()
            if text != "none" and (not 1 <= len(parts) <= 2 or any("(" in part for part in parts)):
                return None, f"translate {value!r} is not one or two lengths"
            for key, part in zip(("translateX", "translateY"), parts):
                if not _ZERO_RE.match(part):
                    start[key] = part
        elif name == "scale" and isinstance(value, (str, int, float)) and not isinstance(value, bool):
            parts = [] if str(value).strip() == "none" else str(value).split()
            if str(value).strip() != "none" and (not 1 <= len(parts) <= 2 or not all(_NUMBER.match(part) for part in parts)):
                return None, f"scale {value!r} is not one or two numbers"
            if len(parts) == 1 or (len(parts) == 2 and parts[0] == parts[1]):
                start["scale"] = _fmt(float(parts[0]))
            elif len(parts) == 2:
                start["scaleX"], start["scaleY"] = _fmt(float(parts[0])), _fmt(float(parts[1]))
        elif name == "rotate" and text is not None:
            if text != "none":
                if not _ANGLE_RE.match(text):
                    return None, f"rotate {value!r} is not one angle about the screen's own axis"
                start["rotate"] = text
        elif name == "filter" and text is not None:
            blur = _BLUR_RE.match(text)
            if not blur:
                return None, f"filter {value!r} is not a blur"
            start["blur"] = blur.group(1).replace(" ", "")
        else:
            return None, f"property {name!r} starting at {value!r} has no entrance value"
    if "opacity" not in start:
        return None, "it does not fade in (no opacity start value): a line draw or a clip, not a reveal"
    return start, None


def _selection(record: dict) -> str:
    element = record.get("element") or {}
    return f"{element.get('selector', '')} {element.get('selection_rule', '')}"


def _role(record: dict) -> str | None:
    text = _selection(record)
    if record.get("stagger") and _ITEM_RE.search(text):
        return "item"
    if _HEADING_RE.search(text):
        return "heading"
    if _MARK_RE.search(text):
        return "marked"
    return None


def mark_of(record: dict) -> str | None:
    """The attribute a marked reveal record selects by (``data-reveal``), or None."""
    found = _MARK_RE.search(_selection(record))
    return found.group(1).lower() if found else None


def _where(record: dict) -> str:
    """A record's id and the draft it was read from, for a trace row."""
    place = (record.get("element") or {}).get("dc") or ""
    return f"{record.get('id', '?')}{f' ({place})' if place else ''}"


def reveal_rules(records: list, refused: list | None = None) -> dict:
    """``{"item": {...}, "heading": {...}, "marked": {...}}`` for the reveal records. Each value is
    ``{"from", "duration", "easing", "record"}``; a name with no record is absent. Of several records with one
    name, the values most of them share win (the first on a tie). ``refused`` collects ``{"record", "reason"}``
    for every ``scroll-reveal`` record that gives no value and for every variant."""
    def refuse(record: dict, reason: str) -> None:
        if refused is not None:
            refused.append({"record": _where(record), "reason": reason})

    found: dict = {}
    for record in records:
        if record.get("group") != "scroll-reveal":
            continue
        if record.get("status") == "dead-code":
            refuse(record, "dead code: the draft never runs it")
            continue
        trigger = (record.get("trigger") or {}).get("type")
        if trigger != "scroll-into-view":
            refuse(record, f"its trigger is {trigger!r}, not scroll-into-view")
            continue
        start, why = start_values(record.get("properties") or [])
        if start is None:
            refuse(record, why)
            continue
        role = _role(record)
        if role is None:
            refuse(record, "it selects neither headings, a container's children nor elements marked with an attribute")
            continue
        duration, curve = record.get("duration_ms"), motion_tokens.normalise_easing(str(record.get("easing", "")))
        if not isinstance(duration, (int, float)) or isinstance(duration, bool) or not curve:
            refuse(record, f"its duration {record.get('duration_ms')!r} or easing {record.get('easing')!r} is not a value")
            continue
        found.setdefault(role, []).append({"from": start, "duration": _fmt(duration), "easing": curve, "record": record})
    rules: dict = {}
    for role, candidates in found.items():
        sign = [json.dumps({k: v for k, v in c.items() if k != "record"}, sort_keys=True) for c in candidates]
        chosen = max(range(len(candidates)), key=lambda i: (sign.count(sign[i]), -i))
        rules[role] = candidates[chosen]
        for i, candidate in enumerate(candidates):
            if sign[i] != sign[chosen]:
                refuse(candidate["record"], f"a variant of the {role} reveal: it holds {sign[i]} where the site's "
                       f"value is {sign[chosen]}, so the clone stores it on that draft's own elements")
    return rules


def _start_line(record: dict) -> int | float | None:
    """The observer's bottom root margin as a positive percentage of the viewport (``-4%`` is 4)."""
    match = _ROOT_MARGIN_RE.search((record.get("trigger") or {}).get("detail", ""))
    percent = _PERCENT_RE.match(match.group(3)) if match else None
    if not percent or float(percent.group(1)) > 0:
        return None
    return _fmt(-float(percent.group(1)))


def apply_reveal(snap: dict, records: list, trace: list) -> dict:
    """Write the reveal tokens and rules (see the module docstring); a draft with no usable reveal record leaves
    the snapshot as it was. Every refused record and every variant is a ``gap`` row in the trace."""
    refused: list = []
    rules = reveal_rules(records, refused)
    for row in refused:
        trace.append({"kind": "gap", "what": f"scroll-reveal record {row['record']}", "reason": row["reason"]})
    if not rules:
        return snap
    primary = rules.get("item") or rules.get("heading") or rules["marked"]
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
    written = dict(values)
    structural = {name: {k: v for k, v in rule.items() if k != "record"} for name, rule in rules.items() if name in STRUCTURAL}
    if structural:
        entrance["reveal"] = structural
        written["reveal"] = structural
    for key, value in written.items():
        trace.append({"kind": "motion", "what": f"settings.custom.entrance.{key}",
                      "reason": "the draft's scroll-reveal records in animations.json", "value": value})
    marked = rules.get("marked")
    if marked:
        trace.append({"kind": "motion", "what": "the marked reveal",
                      "reason": f"the draft marks each revealing element with [{mark_of(marked['record'])}] "
                                f"(record {_where(marked['record'])}); no rule can select them by structure, so "
                                "the clone sets the entrance on each marked element",
                      "value": {k: v for k, v in marked.items() if k != "record"}})
    return snap
