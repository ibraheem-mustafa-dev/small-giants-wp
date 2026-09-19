"""Spec 33 script variant sets: switchable brand colour sets a draft holds in its own script.

An enum prop in a ``data-props`` attribute names the options; an object literal in the draft's script,
keyed by those option names, holds each option's colours. Read purely from text (no browser, no
network). Returns plain, JSON-serialisable dicts. Nothing here names a client.
"""
from __future__ import annotations

import html as html_lib
import json
import re

from declared_sources import normalise_hex

_DATA_PROPS_RE = re.compile(r"""data-props\s*=\s*(?:"([^"]*)"|'([^']*)')""", re.IGNORECASE | re.DOTALL)
_KEY_OPEN_RE = r"""['"]?{key}['"]?\s*:\s*\{{"""
_VALUE_HEX_RE = re.compile(
    r"""['"]?([A-Za-z_$][\w$\-]*)['"]?\s*:\s*(['"])(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\2"""
)


def _enum_props(html: str) -> dict[str, dict]:
    props: dict[str, dict] = {}
    for m in _DATA_PROPS_RE.finditer(html):
        raw = html_lib.unescape(m.group(1) if m.group(1) is not None else m.group(2))
        try:
            data = json.loads(raw)
        except ValueError:
            continue
        if not isinstance(data, dict):
            continue
        for name, spec in data.items():
            if (isinstance(spec, dict) and spec.get("editor") == "enum"
                    and isinstance(spec.get("options"), list) and spec["options"]
                    and all(isinstance(o, str) for o in spec["options"])):
                props.setdefault(name, {"default": spec.get("default"), "options": list(spec["options"])})
    return props


def _match_brace(text: str, start: int) -> int:
    """Index of the ``}`` closing the ``{`` at ``start`` (quote-aware); -1 when unbalanced."""
    depth = 0
    quote = ""
    i = start
    while i < len(text):
        c = text[i]
        if quote:
            if c == "\\":
                i += 1
            elif c == quote:
                quote = ""
        elif c in "'\"`":
            quote = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def _parse_option_sets(literal: str) -> dict[str, dict[str, str]]:
    """Depth-1 ``key:{...}`` entries of an object literal -> {key: {inner_key: HEX}}."""
    sets: dict[str, dict[str, str]] = {}
    i = 1
    while i < len(literal) - 1:
        m = re.compile(_KEY_OPEN_RE.format(key=r"([A-Za-z_$][\w$\-]*)")).match(literal, i)
        if not m:
            i += 1
            continue
        open_at = m.end() - 1
        close_at = _match_brace(literal, open_at)
        if close_at < 0:
            break
        inner = literal[open_at:close_at + 1]
        sets[m.group(1)] = {k: normalise_hex(h) for k, _q, h in _VALUE_HEX_RE.findall(inner)}
        i = close_at + 1
    return sets


def _find_option_sets(html: str, options: list[str]) -> dict[str, dict[str, str]] | None:
    opener = re.compile(
        r"\{\s*" + _KEY_OPEN_RE.format(key="(?:" + "|".join(re.escape(o) for o in options) + ")")
    )
    for m in opener.finditer(html):
        end = _match_brace(html, m.start())
        if end < 0:
            continue
        sets = _parse_option_sets(html[m.start():end + 1])
        if all(sets.get(o) for o in options):
            return {o: sets[o] for o in options}
    return None


def read_script_variant_sets(html: str) -> dict:
    """Switchable brand sets: ``{prop: {"default", "options", "sets": {option: {key: HEX}}}}``."""
    result: dict = {}
    for name, spec in _enum_props(html).items():
        sets = _find_option_sets(html, spec["options"])
        if sets is not None:
            result[name] = {"default": spec["default"], "options": spec["options"], "sets": sets}
    return result
