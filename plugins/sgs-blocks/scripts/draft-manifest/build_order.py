"""Build order: a dependency-respecting sequence, tiers first, dependencies always winning.

Nodes are dicts ``{"id", "tier"}``; ``edges`` are (needs, needed_by) pairs: ``needs`` must be built
first. The order is the lowest tier that is free, by name, so the result is deterministic. A cycle is
reported, never looped on: the nodes left over are returned in ``cycle``.
"""
from __future__ import annotations


def order(nodes: list[dict], edges: list[tuple[str, str]]) -> tuple[list[str], list[str]]:
    tier = {n["id"]: n["tier"] for n in nodes}
    waiting = {n["id"]: set() for n in nodes}
    for needs, needed_by in edges:
        if needs in tier and needed_by in tier and needs != needed_by:
            waiting[needed_by].add(needs)
    built: list[str] = []
    while waiting:
        free = sorted((n for n, deps in waiting.items() if not deps), key=lambda n: (tier[n], n))
        if not free:
            return built, sorted(waiting)
        nxt = free[0]
        built.append(nxt)
        del waiting[nxt]
        for deps in waiting.values():
            deps.discard(nxt)
    return built, []
