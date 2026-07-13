"""token_map.py — declared-CSS parsing for the Spec 33 extractor (tinycss2, not regex).

Two jobs:
  1. ``build_draft_root_token_map(css)`` — the FR-33-10 service: parse every ``:root`` block, resolve
     ``var()`` chains (with fallbacks), return ``{name(lower): resolved_value_string}`` for ALL value
     types (hex, non-hex, clamp/calc, refs). This is the NEW composed service; the frozen hex-only
     ``converter/services/styling_helpers.build_draft_root_colour_map`` is left byte-identical.
  2. ``parse_base_rules(css)`` — the top-level (non-@media) rule stream as
     ``[(selector, prop, value, important, offset)…]`` so the role table + reconciliation can read
     what the draft DECLARES (names/roles only — the VALUE that ships comes from computed facts).

Parsing is via ``tinycss2`` (a real CSS tokeniser) so brace-nesting, comments, and function values
are handled correctly. This module lives OUTSIDE ``converter/`` so it may import tinycss2 without
tripping ``converter/tests/test_import_ban.py``.
"""
from __future__ import annotations

import re

import tinycss2

_VAR_RE = re.compile(r"var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*(.*?))?\)\s*$", re.DOTALL)
_VAR_ANY_RE = re.compile(r"var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]*))?\)")


def _serialise(tokens) -> str:
    return tinycss2.serialize(tokens).strip()


def _iter_qualified_rules(css: str):
    """Yield (selector_str, declarations, offset) for every top-level qualified rule.

    @media / @supports blocks are skipped for base extraction (they carry responsive/conditional
    OVERRIDES, not the base — handled elsewhere/deferred). ``offset`` = source position for
    deterministic ordering (FR-33-8).
    """
    rules = tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True)
    for rule in rules:
        if rule.type != "qualified-rule":
            continue
        selector = _serialise(rule.prelude)
        offset = getattr(rule, "source_line", 0) * 100000 + getattr(rule, "source_column", 0)
        decls = tinycss2.parse_declaration_list(rule.content, skip_comments=True, skip_whitespace=True)
        yield selector, decls, offset


def build_draft_root_token_map(css: str) -> dict:
    """Parse ``--name: value`` from every ``:root {}`` block, resolving ``var()`` chains.

    Returns ``{name(lower, no leading --): resolved_value_string}``. Unlike the frozen hex-only
    ``build_draft_root_colour_map``, this keeps NON-hex values (clamp/calc/rgb/refs) and resolves
    ``var(--x[, fallback])`` against the same map (bounded recursion; a fallback wins when the ref
    is unknown). A self-referential / unresolvable var keeps its literal ``var(...)`` string.
    """
    raw: dict = {}
    if not css:
        return {}
    for selector, decls, _off in _iter_qualified_rules(css):
        # A rule may be ``:root`` or ``:root, html`` etc. — accept any selector list containing :root.
        if ":root" not in selector.replace(" ", ""):
            continue
        for d in decls:
            if d.type != "declaration" or not d.name.startswith("--"):
                continue
            raw[d.name[2:].strip().lower()] = _serialise(d.value)

    resolved: dict = {}

    def resolve(name: str, seen: frozenset) -> str:
        if name in resolved:
            return resolved[name]
        val = raw.get(name)
        if val is None or name in seen:
            return val if val is not None else ""

        def repl(m):
            ref = m.group(1)[2:].lower()
            fallback = (m.group(2) or "").strip()
            if ref in raw and ref not in seen:
                return resolve(ref, seen | {name})
            return fallback  # unknown ref → fallback (may be '')

        out = _VAR_ANY_RE.sub(repl, val).strip()
        return out

    for name in raw:
        resolved[name] = resolve(name, frozenset())
    return resolved


def parse_base_rules(css: str) -> list:
    """Return the top-level declaration stream as ``[(selector, prop, value, important, offset)…]``.

    Comma-joined selectors are SPLIT so ``h1, h2, h3 { line-height: 1.2 }`` yields one row per
    selector. Custom-property declarations (``--x``) are excluded here (they live in the token map).
    """
    out: list = []
    for selector, decls, offset in _iter_qualified_rules(css):
        selectors = [s.strip() for s in selector.split(",") if s.strip()]
        for d in decls:
            if d.type != "declaration" or d.name.startswith("--"):
                continue
            value = _serialise(d.value)
            for i, sel in enumerate(selectors):
                out.append((sel, d.lower_name, value, bool(d.important), offset + i))
    return out


def resolve_value(value: str, token_map: dict) -> str:
    """Resolve any ``var(--x[, fallback])`` references in a declared value against ``token_map``."""
    if not value or "var(" not in value:
        return value

    def repl(m):
        ref = m.group(1)[2:].lower()
        fallback = (m.group(2) or "").strip()
        return token_map.get(ref, fallback)

    prev = None
    cur = value
    # bounded fixed-point (handles nested refs), max 8 passes
    for _ in range(8):
        prev, cur = cur, _VAR_ANY_RE.sub(repl, cur).strip()
        if cur == prev:
            break
    return cur
