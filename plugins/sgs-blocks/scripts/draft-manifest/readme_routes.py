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
