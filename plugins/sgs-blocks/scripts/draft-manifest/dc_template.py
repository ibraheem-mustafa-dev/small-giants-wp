"""Read a Claude Design draft's template: its screens, overlay regions and the handlers wired to them.

Pure text. The template is everything before the ``text/x-dc`` script. Screens are ``<main
data-screen-label="...">`` elements (the draft's own name for each view, gated by an ``isX`` flag);
overlays are ``<sc-if value="{{ flag }}">`` regions whose flag a handler can turn on.
"""
from __future__ import annotations

import re

_SC_IF_RE = re.compile(r"<sc-if\b[^>]*?\bvalue=\"\{\{\s*(\w+)\s*\}\}\"[^>]*>", re.IGNORECASE)
_MAIN_RE = re.compile(r"<main\b[^>]*\bdata-screen-label=\"([^\"]*)\"[^>]*>", re.IGNORECASE)
_HANDLER_RE = re.compile(r"\bon[A-Za-z]+\s*=\s*\"\{\{\s*(\w+)\s*\}\}\"")
_FIRST_TAG_RE = re.compile(r"<(?!/)[a-zA-Z][^>]*>")


def template_text(html: str) -> str:
    """Everything before the text/x-dc script."""
    m = re.search(r"<script\b[^>]*\btype\s*=\s*[\"']text/x-dc[\"']", html, re.IGNORECASE)
    return html[: m.start()] if m else html


def balanced_end(tpl: str, open_end: int, tag: str) -> int:
    """Index just past the closing tag that balances an opening ``<tag>`` ending at ``open_end``."""
    depth = 1
    for m in re.finditer(r"<%s\b|</%s\s*>" % (tag, tag), tpl[open_end:], re.IGNORECASE):
        depth += -1 if m.group(0).startswith("</") else 1
        if depth == 0:
            return open_end + m.end()
    return len(tpl)


def find_screens(tpl: str) -> list[dict]:
    """Every labelled screen: label, the ``isX`` flag that gates it, and its span."""
    screens = []
    for m in _MAIN_RE.finditer(tpl):
        gate = None
        for g in _SC_IF_RE.finditer(tpl, max(0, m.start() - 300), m.start()):
            if not tpl[g.end():m.start()].strip():
                gate = g.group(1)
        end = tpl.find("</main>", m.end())
        screens.append({"label": m.group(1), "flag": gate, "start": m.start(), "end": len(tpl) if end < 0 else end})
    return screens


def find_tag_spans(tpl: str, tag: str) -> list[tuple[int, int]]:
    """Spans of every ``<tag>`` element (header, footer)."""
    return [(m.start(), balanced_end(tpl, m.end(), tag)) for m in re.finditer(r"<%s\b[^>]*>" % tag, tpl, re.IGNORECASE)]


def all_flags(tpl: str) -> list[str]:
    return list(dict.fromkeys(m.group(1) for m in _SC_IF_RE.finditer(tpl)))


def find_regions(tpl: str, flags: set[str]) -> list[dict]:
    """The ``<sc-if>`` region for each flag in ``flags``: span, the label of its dialog, its first tag."""
    regions = []
    for m in _SC_IF_RE.finditer(tpl):
        if m.group(1) not in flags:
            continue
        end = balanced_end(tpl, m.end(), "sc-if")
        inner = tpl[m.end():end]
        first = _FIRST_TAG_RE.search(inner)
        label = re.search(r"aria-label=\"([^\"]*)\"", inner[:1500])
        regions.append({"flag": m.group(1), "start": m.start(), "end": end,
                        "first_tag": first.group(0) if first else "", "label": label.group(1) if label else "",
                        "dialog": bool(re.search(r"role=\"dialog\"", inner[:1500]))})
    return regions


def handler_usage(tpl: str) -> list[tuple[str, int]]:
    """(handler name, position) for every event attribute bound to a ``{{ name }}``."""
    return [(m.group(1), m.start()) for m in _HANDLER_RE.finditer(tpl)]


def form_positions(tpl: str) -> list[int]:
    return [m.start() for m in re.finditer(r"<form\b", tpl, re.IGNORECASE)]


def container_of(pos: int, screens: list[dict], regions: list[dict], headers: list, footers: list) -> str:
    """Where a position sits: the smallest overlay region, else a screen, else header or footer, else body."""
    inside = [r for r in regions if r["start"] <= pos < r["end"]]
    if inside:
        return "overlay:" + min(inside, key=lambda r: r["end"] - r["start"])["flag"]
    for s in screens:
        if s["start"] <= pos < s["end"]:
            return "screen:" + s["label"]
    if any(a <= pos < b for a, b in headers):
        return "chrome:header"
    if any(a <= pos < b for a, b in footers):
        return "chrome:footer"
    return "body"
