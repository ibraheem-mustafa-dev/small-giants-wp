"""Read a Claude Design draft's script: what each handler does and what each flag means.

Pure text, no browser. The script is the draft's own statement of behaviour, so a handler such as
``openSizeGuide`` is tied to the overlay it opens by the state it sets (``modal:'size'``) and the
flag that reads that state (``sizeModalOpen: S.modal === 'size'``), not by a similarity of names.
"""
from __future__ import annotations

import re

from manifest_vocab import ROUTER_CALLS

_SCRIPT_RE = re.compile(r"<script\b[^>]*\btype\s*=\s*[\"']text/x-dc[\"'][^>]*>", re.IGNORECASE)
_QUOTES = "'\"`"


def script_text(html: str) -> str:
    """The text/x-dc script, from its opening tag to the end of the file ('' when there is none)."""
    m = _SCRIPT_RE.search(html)
    return html[m.end():] if m else ""


def read_expr(script: str, start: int) -> str:
    """Text from ``start`` to the next top-level comma or closing bracket, quotes and nesting respected."""
    depth, quote, i = 0, "", start
    while i < len(script):
        ch = script[i]
        if quote:
            if ch == "\\":
                i += 1
            elif ch == quote:
                quote = ""
        elif ch in _QUOTES:
            quote = ch
        elif ch in "([{":
            depth += 1
        elif ch in ")]}":
            if depth == 0:
                break
            depth -= 1
        elif ch in ",;" and depth == 0:
            break
        i += 1
    return script[start:i]


def _is_handler(expr: str) -> bool:
    return "=>" in expr or bool(re.match(r"\s*(?:function\b|\w+\()", expr))


def _reads_state(expr: str) -> bool:
    return bool(re.search(r"\b[SL]\.\w+", expr))


def definition(script: str, name: str, accept=None) -> str | None:
    """The expression a name is defined as: ``name: <expr>`` or ``name = <expr>``.

    A name can appear first as a key inside another expression, so the first occurrence ``accept``
    approves is used (any non-empty one when ``accept`` is None)."""
    for m in re.finditer(r"(?<![\w.$])" + re.escape(name) + r"\s*[:=](?!=)\s*", script):
        expr = read_expr(script, m.end())
        if expr.strip() and (accept is None or accept(expr)):
            return expr
    return None


def _view_from_calls(expr: str, script: str, depth: int = 0) -> list[str]:
    """Views a handler expression navigates to: a literal ``go('x')``, or a helper that does it."""
    calls = "|".join(ROUTER_CALLS)
    views = re.findall(r"(?:this\.)?(?:%s)\(\s*['\"](\w+)['\"]" % calls, expr)
    if depth > 1:
        return views
    for helper, args in re.findall(r"(?<![\w.])(\w+)\(\s*((?:'[^']*'|\"[^\"]*\")?)", expr):
        body = definition(script, helper, _is_handler)
        if not body or helper in ROUTER_CALLS:
            continue
        param = re.match(r"\(?\s*(\w+)", body)
        literal = re.findall(r"(?:this\.)?(?:%s)\(\s*['\"](\w+)['\"]" % calls, body)
        if literal:
            views += literal
        elif param and re.search(r"(?:this\.)?(?:%s)\(\s*%s\b" % (calls, re.escape(param.group(1))), body):
            m = re.match(r"['\"](\w+)['\"]", args)
            if m:
                views.append(m.group(1))
        else:
            views += _view_from_calls(body, script, depth + 1)
    return list(dict.fromkeys(views))


def _state_sets(expr: str) -> dict[str, str]:
    """State keys a handler sets with ``setState({k: v})``; value is the literal, or ``*`` when dynamic."""
    sets: dict[str, str] = {}
    for m in re.finditer(r"setState\(\s*(?:\w+\s*=>\s*\(?\s*)?\{", expr):
        depth, i, body_start = 1, m.end(), m.end()
        while i < len(expr) and depth:
            depth += {"{": 1, "}": -1}.get(expr[i], 0)
            i += 1
        body = expr[body_start:i - 1]
        for key, val in re.findall(r"(\w+)\s*:\s*((?:'[^']*'|\"[^\"]*\"|true|false|null|[^,]*))", body):
            sets[key] = val.strip().strip("'\"")
    return sets


def analyse_handler(script: str, name: str) -> dict:
    """``{views: [...], sets: {key: value}}`` for one handler name. Empty lists when it is not defined."""
    expr = definition(script, name, _is_handler) or ""
    return {"views": _view_from_calls(expr, script), "sets": _state_sets(expr)}


def flag_state(script: str, flag: str) -> tuple[str, str] | None:
    """The (state key, value) a flag reads: ``S.k === 'v'`` -> (k, v); ``S.k`` / ``!!S.k`` -> (k, '*')."""
    expr = definition(script, flag, _reads_state)
    if not expr:
        return None
    m = re.search(r"\bS\.(\w+)\s*===?\s*['\"]([^'\"]+)['\"]", expr)
    if m:
        return m.group(1), m.group(2)
    m = re.search(r"(?<![!\w])(?:!!)?\bS\.(\w+)\b", expr)
    return (m.group(1), "*") if m else None


def opens(sets: dict[str, str], key: str, value: str) -> bool:
    """True when a handler's state change turns the (key, value) state ON."""
    if key not in sets or sets[key] in ("false", "null", "undefined", ""):
        return False
    return value == "*" or sets[key] in (value, "*")
