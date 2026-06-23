"""coverage_report.py — the Bean-visible sign-off grid (design §5).

Every (block, layer, property) row → the resolver it routed to → a colour status.
Bean signs off by reading the grid: "every row lands somewhere, no red, no silent drop."

LEGEND (design §10 A1 — the honesty rule):
  ✅ RESOLVED      a real Write (transferred to a native attr). The ONLY faithful row.
  🟡 STUB          UNIMPLEMENTED_STUB — resolver not built yet (NOT-yet-faithful).
  🟡 GAP-add-attr  NO_DESTINATION — real gap, the block needs a new attr (NOT faithful).
  ⬜ EXCLUDED      F4 intentional non-lift (still cloned via passthrough).
  🔴 UNROUTED      suspected routing bug — MUST be zero.

STUB / GAP rows are NOT-yet-faithful — only the RESOLVED (and live-LANDED) count
measures progress. Conservation being 100% green means "no leaks", NOT "faithful".
"""
from __future__ import annotations

from typing import Any

from converter.models import GapOrigin

_STATUS = {
    GapOrigin.UNIMPLEMENTED_STUB: ("🟡", "STUB"),
    GapOrigin.NO_DESTINATION: ("🟡", "GAP-add-attr"),
    GapOrigin.EXCLUDED: ("⬜", "EXCLUDED"),
    GapOrigin.UNROUTED: ("🔴", "UNROUTED"),
}


def _rows(result: Any) -> list[tuple[str, str, str, str, str]]:
    """(layer, property, resolver/status, value, status-label) per declaration."""
    rows = []
    for w in result.writes:
        rows.append((result.block_slug, w.property, "outer_box→" + w.attr, w.value, "✅ RESOLVED"))
    for g in result.gaps:
        icon, label = _STATUS[g.origin]
        rows.append((result.block_slug, g.property, g.detail[:48], "", f"{icon} {label}"))
    return rows


def render_markdown(results: list[Any], fixture_name: str) -> str:
    lines = [
        f"# Coverage report — `{fixture_name}`",
        "",
        "| Block | Property | Resolver / detail | Value | Status |",
        "|-------|----------|-------------------|-------|--------|",
    ]
    landed = total = 0
    for result in results:
        for block, prop, detail, value, status in _rows(result):
            lines.append(f"| `{block}` | `{prop}` | {detail} | {value} | {status} |")
            total += 1
            if status.startswith("✅"):
                landed += 1
    lines += [
        "",
        f"**{landed}/{total} RESOLVED** (the only faithful rows — §10 A1). "
        f"STUB/GAP rows are NOT-yet-faithful; conservation-green ≠ faithful.",
        "",
        "_Symptom→file: section width/spacing/background → `outer_box.py` · inner band → "
        "`content_band.py` · columns/gaps → `grid.py` · fonts → `typography.py` · "
        "quote/name/stars → `scalar_content.py` · images → `scalar_media.py`._",
    ]
    return "\n".join(lines)
