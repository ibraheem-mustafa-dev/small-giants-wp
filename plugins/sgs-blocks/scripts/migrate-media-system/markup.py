"""Serialized block markup and JSON block trees: find every block and let a caller rewrite its attributes.

Two carriers hold saved blocks. Block markup (post content, theme patterns) holds each block as a comment
`<!-- wp:ns/name {json} -->` or `<!-- wp:ns/name {json} /-->`; every comment stands alone, so a rewrite of a parent
and of its inner blocks is the same pass over the text. A JSON tree (`sites/<client>/build/*.tree.json`, fixtures)
holds `{name, attributes, innerBlocks}` objects, and may also hold markup inside string values.

`rewrite_markup` and `rewrite_json` take `fn(block_name, attrs) -> attrs | None` (None means unchanged) and return the
new text plus how many blocks changed. A comment whose attributes did not change keeps its original bytes.
"""
from __future__ import annotations

import json
import re
from typing import Any, Callable, Iterator

# WordPress's own block-comment grammar: the JSON object ends at the first `}` followed by `-->` or `/-->`.
COMMENT_RE = re.compile(
    r"<!--\s+wp:([a-z][a-z0-9_-]*(?:/[a-z][a-z0-9_-]*)?)\s+(\{(?:(?!\}\s+/?-->).)*\})\s*(/?)-->",
    re.DOTALL,
)

Rewriter = Callable[[str, dict], "dict | None"]


def _escape(encoded: str) -> str:
    """WordPress's `serialize_block_attributes` escaping."""
    return (
        encoded.replace("--", "\u002d\u002d").replace("<", "\u003c").replace(">", "\u003e").replace("&", "\u0026")
    )


def encode_attrs(attrs: dict) -> str:
    return _escape(json.dumps(attrs, separators=(",", ":"), ensure_ascii=True))


def normalise_name(name: str) -> str:
    return name if "/" in name else f"core/{name}"


def iter_markup_blocks(text: str) -> Iterator[tuple[str, dict]]:
    """Yield (block name, attributes) for every block comment with attributes; unparseable JSON yields (name, {'__unparseable__': raw})."""
    for match in COMMENT_RE.finditer(text):
        name = normalise_name(match.group(1))
        try:
            attrs = json.loads(match.group(2))
        except ValueError:
            attrs = {"__unparseable__": match.group(2)}
        yield name, attrs if isinstance(attrs, dict) else {"__unparseable__": match.group(2)}


def rewrite_markup(text: str, fn: Rewriter) -> tuple[str, int]:
    changed = 0

    def sub(match: "re.Match[str]") -> str:
        nonlocal changed
        name = normalise_name(match.group(1))
        try:
            attrs = json.loads(match.group(2))
        except ValueError:
            return match.group(0)
        if not isinstance(attrs, dict):
            return match.group(0)
        new = fn(name, attrs)
        if new is None or new == attrs:
            return match.group(0)
        changed += 1
        tail = " /-->" if match.group(3) else " -->"
        return f"<!-- wp:{match.group(1)} {encode_attrs(new)}{tail}"

    return COMMENT_RE.sub(sub, text), changed


SCHEMA_KEYS = ("$schema", "apiVersion", "textdomain", "category")


def _is_tree_block(node: Any) -> bool:
    """A `{name, attributes}` block object; a `block.json` (which also has both keys) is a schema, not a block."""
    return isinstance(node, dict) and not any(k in node for k in SCHEMA_KEYS) and isinstance(node.get("name"), str) and "/" in node["name"] and (
        isinstance(node.get("attributes"), dict) or isinstance(node.get("attrs"), dict)
    )


def _walk_json(node: Any, visit_block: Callable[[dict], None], visit_string: Callable[[str], "str | None"] | None):
    """Depth-first over a parsed JSON value; `visit_string` may return a replacement for a string value."""
    if _is_tree_block(node):
        visit_block(node)
    if isinstance(node, dict):
        for key, value in list(node.items()):
            if isinstance(value, str) and visit_string and "<!-- wp:" in value:
                replaced = visit_string(value)
                if replaced is not None:
                    node[key] = replaced
            else:
                _walk_json(value, visit_block, visit_string)
    elif isinstance(node, list):
        for index, value in enumerate(node):
            if isinstance(value, str) and visit_string and "<!-- wp:" in value:
                replaced = visit_string(value)
                if replaced is not None:
                    node[index] = replaced
            else:
                _walk_json(value, visit_block, visit_string)


def iter_json_blocks(data: Any) -> Iterator[tuple[str, dict]]:
    found: list[tuple[str, dict]] = []

    def visit_block(node: dict) -> None:
        found.append((node["name"], node.get("attributes", node.get("attrs"))))

    def visit_string(value: str):
        found.extend(iter_markup_blocks(value))
        return None

    _walk_json(data, visit_block, visit_string)
    return iter(found)


def rewrite_json(data: Any, fn: Rewriter) -> tuple[Any, int]:
    """Rewrite a parsed JSON value in place; returns (data, changed block count)."""
    changed = 0

    def visit_block(node: dict) -> None:
        nonlocal changed
        key = "attributes" if isinstance(node.get("attributes"), dict) else "attrs"
        new = fn(node["name"], node[key])
        if new is not None and new != node[key]:
            node[key] = new
            changed += 1

    def visit_string(value: str):
        nonlocal changed
        out, count = rewrite_markup(value, fn)
        changed += count
        return out if count else None

    _walk_json(data, visit_block, visit_string)
    return data, changed
