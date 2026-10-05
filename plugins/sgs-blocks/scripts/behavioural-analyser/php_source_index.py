"""Index of the PHP functions the css_property seeder can follow.

`extract-signatures.py::extract_css_property_and_layer` reads a block's render
source and needs to know what the shared emitters in `plugins/sgs-blocks/includes/`
do with the values handed to them. This module parses every PHP file under a
directory into `PhpFunction` records (name, parameter names, body text) with a
quote-aware brace matcher, so callers can derive helper contracts from the
helper source itself (`helper_maps.py`) and inline callees into a block's scan
(`php_include_graph.py`).

Top-level functions are keyed by their bare name; class methods by
`ClassName::method`. Closures (`function (...)`) are never indexed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

_FUNC_RE = re.compile(r"\bfunction\s+&?\s*(\w+)\s*\(")
_CLASS_RE = re.compile(r"\b(?:final\s+|abstract\s+)?class\s+(\w+)[^{;]*\{")
_PARAM_NAME_RE = re.compile(r"&?\.{0,3}\$(\w+)")


@dataclass
class PhpFunction:
    """One named PHP function or method."""

    name: str
    params: list[str]
    param_types: list[str]
    body: str
    file: Path
    owner_class: "str | None" = None
    calls: set[str] = field(default_factory=set)


def matching_close(src: str, open_idx: int, open_ch: str, close_ch: str) -> int:
    """Index of the bracket closing the one at `open_idx`, skipping quoted text.

    Returns -1 when the source ends first.
    """
    depth = 0
    quote: "str | None" = None
    i = open_idx
    n = len(src)
    while i < n:
        ch = src[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in ("'", '"'):
            quote = ch
        elif ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def split_top_level_args(text: str) -> list[str]:
    """Split a parameter or argument list on top-level commas."""
    out: list[str] = []
    cur: list[str] = []
    depth = 0
    quote: "str | None" = None
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if quote:
            cur.append(ch)
            if ch == "\\" and i + 1 < n:
                cur.append(text[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
        elif ch in ("'", '"'):
            quote = ch
            cur.append(ch)
        elif ch in "([{":
            depth += 1
            cur.append(ch)
        elif ch in ")]}":
            depth -= 1
            cur.append(ch)
        elif ch == "," and depth == 0:
            out.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
        i += 1
    if "".join(cur).strip():
        out.append("".join(cur))
    return out


def _class_spans(src: str) -> list[tuple[int, int, str]]:
    spans: list[tuple[int, int, str]] = []
    for m in _CLASS_RE.finditer(src):
        open_idx = m.end() - 1
        close_idx = matching_close(src, open_idx, "{", "}")
        if close_idx > 0:
            spans.append((open_idx, close_idx, m.group(1)))
    return spans


def parse_functions(src: str, path: Path) -> list[PhpFunction]:
    """Every named function or method defined in `src` (comment-stripped PHP)."""
    found: list[PhpFunction] = []
    classes = _class_spans(src)
    for m in _FUNC_RE.finditer(src):
        open_paren = m.end() - 1
        close_paren = matching_close(src, open_paren, "(", ")")
        if close_paren < 0:
            continue
        brace = src.find("{", close_paren)
        semi = src.find(";", close_paren)
        if brace < 0 or (0 <= semi < brace):
            continue  # abstract or interface declaration, no body
        body_end = matching_close(src, brace, "{", "}")
        if body_end < 0:
            continue
        raw_params = split_top_level_args(src[open_paren + 1 : close_paren])
        params: list[str] = []
        types: list[str] = []
        for raw in raw_params:
            pm = _PARAM_NAME_RE.search(raw)
            if not pm:
                continue
            params.append(pm.group(1))
            types.append(raw[: pm.start()].strip().lstrip("?").lower())
        owner = None
        for start, end, cls in classes:
            if start < m.start() < end:
                owner = cls
        body = src[brace + 1 : body_end]
        calls = set(re.findall(r"\b(sgs_\w+)\s*\(", body))
        calls |= {
            f"{owner}::{name}" if owner else name
            for name in re.findall(r"\b(?:self|static)::(\w+)\s*\(", body)
        }
        calls |= {f"{c}::{n}" for c, n in re.findall(r"\b([A-Z]\w+)::(\w+)\s*\(", body)}
        found.append(
            PhpFunction(
                name=f"{owner}::{m.group(1)}" if owner else m.group(1),
                params=params,
                param_types=types,
                body=body,
                file=path,
                owner_class=owner,
                calls=calls,
            )
        )
    return found


def index_functions(
    root: Path, strip_comments: Callable[[str], str]
) -> dict[str, PhpFunction]:
    """Index every function under `root` (recursive). First definition wins on a
    duplicate name, so the result is deterministic (files are read in sorted order)."""
    index: dict[str, PhpFunction] = {}
    for path in sorted(root.rglob("*.php")):
        try:
            src = strip_comments(path.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            continue
        for fn in parse_functions(src, path):
            index.setdefault(fn.name, fn)
    return index


_ATTRS_PARAM_NAMES = frozenset({"attributes", "attrs", "atts", "block_attributes"})


def attrs_param_index(fn: PhpFunction) -> "int | None":
    """Position of the parameter that receives the block's attribute array."""
    for i, (name, ptype) in enumerate(zip(fn.params, fn.param_types)):
        if name in _ATTRS_PARAM_NAMES:
            return i
        if ptype == "array" and name in ("a", "attr"):
            return i
    return None
