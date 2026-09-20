"""Spec 33 script variant sets: switchable brand colour sets a draft holds in its own script.

An enum prop in a ``data-props`` attribute names the options; an object literal in the draft's script,
keyed by those option names, holds each option's colours. Read purely from text (no browser, no
network), then chooses the accent set the palette overlay uses. Returns plain, JSON-serialisable dicts.
Nothing here names a client.
"""
from __future__ import annotations

import html as html_lib
import json
import re

from declared_sources import HEX_RE, normalise_hex
from palette_vocab import ACCENT_SLUGS, VARIANT_KEY_TABLE, trace_row

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


# --------------------------------------------------------------------------- choosing the accent set


def slug_map(values: dict[str, str]) -> tuple[dict[str, str], list[tuple[str, str, str]]]:
    """One option's inner keys -> ({slug: HEX}, [(key, HEX, why unmapped)]). Nothing is dropped unseen."""
    mapped: dict[str, str] = {}
    unmapped: list[tuple[str, str, str]] = []
    for key, colour in values.items():
        slug = next((s for pattern, s in VARIANT_KEY_TABLE if re.match(pattern, key, re.I)), None)
        if slug is None:
            unmapped.append((key, colour, "has no role in the accent vocabulary"))
        elif slug in mapped:
            unmapped.append((key, colour, f"maps to {slug}, already taken by an earlier key"))
        else:
            mapped[slug] = colour
    return mapped, unmapped


def _rendered_option(mapped: dict[str, dict[str, str]], options: list[str], facts: dict) -> str | None:
    """The option whose accent equals a hex the rendered page holds in a custom property."""
    for prop in facts.get("customProps") or []:
        value = str(prop.get("value", "")).strip()
        if not HEX_RE.fullmatch(value):
            continue
        for option in options:
            if option in mapped and mapped[option].get("accent") == normalise_hex(value):
                return option
    return None


def _map_options(prop: str, spec: dict, trace: list) -> dict[str, dict[str, str]]:
    """Every option that maps at least an accent colour, its roles mapped; each unmapped key traced."""
    mapped: dict[str, dict[str, str]] = {}
    for option, values in spec["sets"].items():
        roles, unmapped = slug_map(values)
        for key, colour, why in unmapped:
            trace_row(trace, "skip", f"variant set {prop}.{option}.{key}", f"inner key {why}: left unmapped", colour)
        if "accent" in roles:
            mapped[option] = roles
        else:
            trace_row(trace, "skip", f"variant set {prop}.{option}",
                      "option maps no accent colour (inner keys: " + ", ".join(values) + "): left out")
    return mapped


def choose_accent_set(variant_sets: dict, facts: dict, trace: list) -> dict | None:
    """The first prop whose default option maps an accent colour, as ``{prop, active, sets, confirmed}``.

    An option lacking one role is still accepted (it maps the roles it has); a prop is rejected only
    when its default option maps no accent colour at all, and every rejection is traced with its reason.
    """
    for prop in sorted(variant_sets):
        spec = variant_sets[prop]
        mapped = _map_options(prop, spec, trace)
        if not mapped:
            trace_row(trace, "skip", f"variant set {prop}", "no option maps an accent colour")
            continue
        default = spec.get("default")
        if default not in mapped:
            trace_row(trace, "skip", f"variant set {prop}", "the default option's set is absent")
            continue
        rendered = _rendered_option(mapped, spec["options"], facts)
        active = rendered or default
        trace_row(trace, "declared", f"accentSets.{prop}", "active option " + (
            "confirmed by the rendered custom property" if rendered else "is the declared default"), active)
        sets = {opt: {s: m[s] for s in sorted(m) if s in ACCENT_SLUGS} for opt, m in sorted(mapped.items())}
        return {"prop": prop, "active": active, "sets": sets, "confirmed": rendered is not None}
    return None
