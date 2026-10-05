"""Which values a helper paints only in the hover state, read from the helper body.

A prefix helper such as `sgs_link_colour_css( $attributes, $prefix, $selector )`
paints `{prefix}LinkColour` on the resting selector and `{prefix}LinkColourHover`
through `sgs_hover_state_rules()`. The seeder routes both suffixes to the same
property, so without a state the hover twin is indistinguishable from the resting
one. This module derives, from the includes/ source alone:

- the **hover markers**: `:hover` and `(hover: hover)` in a string literal, plus any
  constant (`const X = '...'` / `define( 'X', '...' )`) whose value holds one;
- the **hover emitters**: functions that wrap one of their parameters in a rule
  whose selector or media query carries a hover marker (`sgs_hover_state_rules`,
  `sgs_hover_guarded_rule`, and anything that forwards a parameter into them);
- the **hover attributes** of a rewritten helper body: every attribute whose value
  reaches an emitter's declarations argument, or is concatenated after a hover
  marker in the same statement.
"""

from __future__ import annotations

import re
from typing import Callable

from php_source_index import PhpFunction, matching_close, split_top_level_args

_HOVER_TEXT_RE = re.compile(r":hover\b|\(\s*hover\s*:\s*hover\s*\)")
_STRING_RE = re.compile(r"'([^'\\]*(?:\\.[^'\\]*)*)'|\"([^\"\\]*(?:\\.[^\"\\]*)*)\"")
_CONST_RE = re.compile(
    r"\bconst\s+(\w+)\s*=\s*'([^']*)'|\bdefine\(\s*'(\w+)'\s*,\s*'([^']*)'"
)
_MAX_ROUNDS = 6


def hover_constants(sources: "list[str]") -> frozenset[str]:
    """Names of the constants whose string value carries a hover marker."""
    names = set()
    for src in sources:
        for m in _CONST_RE.finditer(src):
            name, value = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4))
            if _HOVER_TEXT_RE.search(value):
                names.add(name)
    return frozenset(names)


def _marker_positions(text: str, constants: frozenset[str]) -> "list[int]":
    """End offsets of every hover marker in `text` (literal or constant)."""
    ends = [m.end() for m in _STRING_RE.finditer(text) if _HOVER_TEXT_RE.search(m.group(1) or m.group(2) or "")]
    for name in constants:
        ends += [m.end() for m in re.finditer(r"\b" + re.escape(name) + r"\b", text)]
    return sorted(ends)


def has_marker(text: str, constants: frozenset[str]) -> bool:
    """Whether `text` carries a hover marker."""
    return bool(_marker_positions(text, constants))


def derive_hover_emitters(index: "dict[str, PhpFunction]", constants: frozenset[str]) -> dict[str, int]:
    """{function: index of the parameter it paints inside a hover rule}."""
    emitters: dict[str, int] = {}
    for name, fn in index.items():
        if fn.owner_class or not _marker_positions(fn.body, constants):
            continue
        for i, p in enumerate(fn.params):
            if re.search(r"'[^'\\]*\{'\s*\.\s*\$" + re.escape(p) + r"\b", fn.body):
                emitters[name] = i
                break
    for _ in range(_MAX_ROUNDS):
        changed = False
        for name, fn in index.items():
            if fn.owner_class or name in emitters:
                continue
            for callee, arg_i in list(emitters.items()):
                for cm in re.finditer(r"\b" + re.escape(callee) + r"\s*\(", fn.body):
                    close = matching_close(fn.body, cm.end() - 1, "(", ")")
                    args = split_top_level_args(fn.body[cm.end() : close]) if close > 0 else []
                    if arg_i < len(args):
                        p = re.fullmatch(r"\s*\$(\w+)\s*", args[arg_i])
                        if p and p.group(1) in fn.params:
                            emitters[name] = fn.params.index(p.group(1))
                            changed = True
                            break
                if name in emitters:
                    break
        if not changed:
            break
    return emitters


def reachable_attrs(src: str) -> dict[str, set[str]]:
    """var -> every attribute its value is built from, across all its assignments."""
    direct: dict[str, set[str]] = {}
    uses: dict[str, set[str]] = {}
    for m in re.finditer(r"\$(\w+)\s*(?:\[\])?\s*\.?=(?![=>])\s*(.+?);", src, re.DOTALL):
        var, rhs = m.group(1), m.group(2)
        direct.setdefault(var, set()).update(re.findall(r"\$attributes\['(\w+)'\]", rhs))
        uses.setdefault(var, set()).update(v for v in re.findall(r"\$(\w+)", rhs) if v not in (var, "attributes"))
    out = {v: set(a) for v, a in direct.items()}
    for _ in range(_MAX_ROUNDS):
        changed = False
        for var, used in uses.items():
            for u in used:
                extra = out.get(u, set()) - out[var]
                if extra:
                    out[var] |= extra
                    changed = True
        if not changed:
            break
    return out


def _refs(text: str, reach: dict[str, set[str]]) -> set[str]:
    found = set(re.findall(r"\$attributes\['(\w+)'\]", text))
    for v in re.findall(r"\$(\w+)", text):
        found |= reach.get(v, set())
    return found


def hover_attrs(
    src: str,
    emitters: dict[str, int],
    constants: frozenset[str],
    split_statements: Callable[[str], "list[str]"],
) -> set[str]:
    """Attributes painted only inside a hover rule in `src`."""
    reach = reachable_attrs(src)
    hover: set[str] = set()
    for callee, arg_i in emitters.items():
        for cm in re.finditer(r"\b" + re.escape(callee) + r"\s*\(", src):
            close = matching_close(src, cm.end() - 1, "(", ")")
            args = split_top_level_args(src[cm.end() : close]) if close > 0 else []
            if arg_i < len(args):
                hover |= _refs(args[arg_i], reach)
    for stmt in split_statements(src):
        ends = _marker_positions(stmt, constants)
        if ends:
            hover |= _refs(stmt[ends[0]:], reach)
    return hover


def hover_flow_vars(
    src: str,
    emitters: dict[str, int],
    constants: frozenset[str],
    split_statements: Callable[[str], "list[str]"],
) -> set[str]:
    """Variables whose value ends up in a hover rule: those named in an emitter's
    declarations argument or after a hover marker, and every variable they are
    built from (`$hover_decls[] = 'color:' ...; ... implode( ';', $hover_decls )`)."""
    flow: set[str] = set()
    for callee, arg_i in emitters.items():
        for cm in re.finditer(r"\b" + re.escape(callee) + r"\s*\(", src):
            close = matching_close(src, cm.end() - 1, "(", ")")
            args = split_top_level_args(src[cm.end() : close]) if close > 0 else []
            if arg_i < len(args):
                flow |= set(re.findall(r"\$(\w+)", args[arg_i]))
    for stmt in split_statements(src):
        ends = _marker_positions(stmt, constants)
        if ends:
            flow |= set(re.findall(r"\$(\w+)", stmt[ends[0]:]))
    uses: dict[str, set[str]] = {}
    for m in re.finditer(r"\$(\w+)\s*(?:\[\])?\s*\.?=(?![=>])\s*(.+?);", src, re.DOTALL):
        uses.setdefault(m.group(1), set()).update(re.findall(r"\$(\w+)", m.group(2)))
    for _ in range(_MAX_ROUNDS):
        grown = {u for v in flow for u in uses.get(v, ())} - flow - {"attributes"}
        if not grown:
            break
        flow |= grown
    return flow
