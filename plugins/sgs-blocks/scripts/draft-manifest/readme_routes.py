"""The README's routes table: which views the design says exist, their route and purpose.

A table counts as a routes table when its header row has a cell containing "route". The first cell of
each row is the view name, the cell headed "route" the route, the cell headed "purpose" (or the last
cell) the purpose. Text only.
"""
from __future__ import annotations

import re


def _cells(line: str) -> list[str]:
    return [c.strip().replace("`", "").replace("**", "") for c in line.strip().strip("|").split("|")]


def read_readme_routes(text: str | None) -> list[dict]:
    if not text:
        return []
    lines = text.splitlines()
    routes: list[dict] = []
    i = 0
    while i < len(lines) - 1:
        head = _cells(lines[i]) if lines[i].lstrip().startswith("|") else []
        route_col = next((n for n, h in enumerate(head) if "route" in h.lower()), None)
        if route_col is None or not re.fullmatch(r"\s*\|?[\s:\-|]+\|?\s*", lines[i + 1]):
            i += 1
            continue
        purpose_col = next((n for n, h in enumerate(head) if "purpose" in h.lower()), len(head) - 1)
        j = i + 2
        while j < len(lines) and lines[j].lstrip().startswith("|"):
            row = _cells(lines[j])
            if len(row) > max(route_col, purpose_col):
                routes.append({"view": row[0], "route": row[route_col], "purpose": row[purpose_col]})
            j += 1
        i = j
    return routes


def norm_view(word: str) -> str:
    """A view key or flag as a bare lowercase word: ``isHome`` -> ``home``."""
    return re.sub(r"^is(?=[A-Z])", "", word).lower()


def same_word(a: str, b: str) -> bool:
    """Same word, allowing a plural ('lens' and 'lenses', 'frame' and 'frames')."""
    a, b = norm_view(a), norm_view(b)
    return a == b or a + "s" == b or a + "es" == b or b + "s" == a or b + "es" == a


def match_route(view_key: str, label: str, routes: list[dict]) -> dict | None:
    """The README routes row for a screen, matched on its gate-flag view or its label."""
    return next((r for r in routes if same_word(r["view"], view_key) or same_word(r["view"], label)), None)


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_BULLET_NAME_RE = re.compile(r"^\s*[-*+]\s+\*\*(.+?)\*\*")
_QUOTED_RE = re.compile(r"[\"“]([^\"”]{6,})[\"”]")


def read_screen_sections(text: str | None, screen_words: list[str]) -> list[dict]:
    """The named sections the README lists under the heading for a screen.

    The heading is the first one containing any of ``screen_words`` (case-insensitive, whole word);
    its sections are the bullets that open with a bold name, up to the next heading of the same or a
    higher level. Each is ``{"name", "phrases"}`` where ``phrases`` are the name plus any quoted
    string in the bullet. Text only; an empty list when nothing is found.
    """
    if not text:
        return []
    lines, out, level = text.splitlines(), [], None
    words = [w.lower() for w in screen_words if w]
    for line in lines:
        h = _HEADING_RE.match(line)
        if h:
            if level is not None and len(h.group(1)) <= level:
                break
            if level is None and any(re.search(r"\b%s\b" % re.escape(w), h.group(2), re.I) for w in words):
                level = len(h.group(1))
            continue
        m = _BULLET_NAME_RE.match(line) if level is not None else None
        if m:
            out.append({"name": m.group(1).strip(), "phrases": [m.group(1).strip(), *_QUOTED_RE.findall(line)]})
    return out
