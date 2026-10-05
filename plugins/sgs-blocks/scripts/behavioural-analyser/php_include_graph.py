"""The PHP text the seeder's supplementary pass scans for one block.

`extract-signatures.py::extract_css_property_and_layer` first reads a block's
render.php (plus the shared container wrapper when render.php calls it). An
attribute that pass cannot route is retried against a wider text built here:

1. every other `*.php` file in the block folder (variant renderers, partials);
2. the body of every `includes/` function the block's text hands `$attributes`
   to, followed recursively (a wrapper method's own callees included), with the
   callee's attributes parameter renamed to `$attributes` and a literal prefix
   argument substituted into the callee's `$prefix . 'Suffix'` reads;
3. the source rewrites in `php_preprocess.py` (interpolated strings, reader
   closures, config maps passed by variable, literal prefix-map loops).

Prefix helpers and value composers are not inlined: their contracts are already
applied at each call site (`helper_maps.py`).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Callable

import php_preprocess as pp
from php_source_index import PhpFunction, attrs_param_index, matching_close, split_top_level_args

_MAX_DEPTH = 4
_ATTRS_ARG_RE = re.compile(r"^\s*\$(?:attributes|attrs)\s*$")


def block_sibling_php(block_dir: Path, strip_comments: Callable[[str], str]) -> str:
    """Every PHP file in the block folder except render.php, in a stable order."""
    parts = []
    for path in sorted(block_dir.rglob("*.php")):
        if path.name == "render.php" and path.parent == block_dir:
            continue
        try:
            parts.append(strip_comments(path.read_text(encoding="utf-8", errors="ignore")))
        except OSError:
            continue
    return "\n".join(parts)


def _call_targets(src: str, index: dict[str, PhpFunction], owner: "str | None") -> list[tuple[PhpFunction, list[str]]]:
    """(callee, args) for each call in `src` to an indexed function or method."""
    found: list[tuple[PhpFunction, list[str]]] = []
    for m in re.finditer(r"(?:\b([A-Z]\w*|self|static)::)?\b(\w+)\s*\(", src):
        cls, name = m.group(1), m.group(2)
        if cls in ("self", "static"):
            key = f"{owner}::{name}" if owner else None
        elif cls:
            key = f"{cls}::{name}"
        else:
            key = name
        fn = index.get(key) if key else None
        if fn is None:
            continue
        close = matching_close(src, m.end() - 1, "(", ")")
        if close < 0:
            continue
        found.append((fn, split_top_level_args(src[m.end() : close])))
    return found


def _inline_body(fn: PhpFunction, args: list[str]) -> "str | None":
    """The callee body ready to append, or None when it does not take `$attributes`."""
    ai = attrs_param_index(fn)
    if ai is None or ai >= len(args) or not _ATTRS_ARG_RE.match(args[ai]):
        return None
    body = pp.rename_variable(fn.body, fn.params[ai], "attributes")
    for i, param in enumerate(fn.params):
        if "prefix" not in param or i >= len(args):
            continue
        lit = re.fullmatch(r"\s*'(\w*)'\s*", args[i])
        if not lit:
            continue
        literal = lit.group(1)
        body = re.sub(
            r"sgs_typography_attr\(\s*\$" + re.escape(param) + r"\s*,\s*'(\w+)'\s*\)",
            lambda m: "'" + (literal + m.group(1) if literal else m.group(1)[0].lower() + m.group(1)[1:]) + "'",
            body,
        )
        body = re.sub(
            r"\$" + re.escape(param) + r"\s*\.\s*'(\w+)'", lambda m: f"'{literal}{m.group(1)}'", body
        )
        body = pp.rewrite_reader_closures(body, prefix_var=param, literal_prefix=literal)
        body = re.sub(r"\$" + re.escape(param) + r"\b(?!\s*=(?![=>]))", f"'{literal}'", body)
    return body


_KEEP_VARS = frozenset({"attributes", "this", "GLOBALS"})


def scope_locals(body: str, tag: str) -> str:
    """Suffix every local variable of an inlined body so it cannot share a name
    (and so a traced identity) with a variable of the caller or another callee."""
    return re.sub(
        r"\$(\w+)\b",
        lambda m: m.group(0) if m.group(1) in _KEEP_VARS else f"${m.group(1)}__{tag}",
        body,
    )


def inline_callees(
    src: str,
    index: dict[str, PhpFunction],
    skip: "set[str]",
    owner: "str | None" = None,
) -> str:
    """Append the bodies of the `includes/` functions `src` passes `$attributes` to."""
    appended: list[str] = []
    seen: set[str] = set()
    frontier: list[tuple[str, "str | None", int]] = [(src, owner, 0)]
    while frontier:
        text, text_owner, depth = frontier.pop()
        if depth >= _MAX_DEPTH:
            continue
        for fn, args in _call_targets(text, index, text_owner):
            if fn.name in skip:
                continue
            body = _inline_body(fn, args)
            if body is None:
                continue
            key = fn.name + "|" + "|".join(a.strip() for a in args if re.fullmatch(r"\s*'\w*'\s*", a))
            if key in seen:
                continue
            seen.add(key)
            body = scope_locals(body, f"i{len(seen)}")
            appended.append(body)
            frontier.append((body, fn.owner_class, depth + 1))
    if not appended:
        return src
    return src + "\n" + "\n".join(appended) + "\n"


def extended_source(
    php_src: str,
    php_src_own: str,
    block_dir: Path,
    index: dict[str, PhpFunction],
    skip: "set[str]",
    prefix_helper_names: "set[str]",
    config_map_helpers: "set[str]",
    strip_comments: Callable[[str], str],
) -> tuple[str, str]:
    """(widened text, block-own widened text) for the supplementary pass."""
    siblings = block_sibling_php(block_dir, strip_comments)
    own = php_src_own + ("\n" + siblings if siblings else "")
    text = php_src + ("\n" + siblings if siblings else "")
    text = inline_callees(text, index, skip)

    def rewrite(t: str) -> str:
        t = pp.expand_double_quoted(t)
        t = pp.normalise_attr_index(t)
        t = pp.rewrite_reader_closures(t)
        t = pp.inline_array_variables(t, config_map_helpers)
        return pp.expand_prefix_loops(t, prefix_helper_names)

    return rewrite(text), rewrite(own)
