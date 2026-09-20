"""Markdown report for a draft manifest: the same facts as the JSON, in reading order."""
from __future__ import annotations


def render(m: dict) -> str:
    out = [f"# Draft manifest: {m['draft']}", "",
           f"Screens: {m['counts']['screens']} ({m['counts']['normal_pages']} normal pages, "
           f"{m['counts']['template_or_flow_screens']} templates or flows). Entities: {m['counts']['entities']}. "
           f"Chrome: {', '.join(m['chrome']) or 'none'}.", "", "## Screens", "",
           "| Screen | View | Route | Kind | Built as |", "|---|---|---|---|---|"]
    out += [f"| {s['label']} | {s['view']} | {s['route'] or ''} | {s['kind']} | {s['target']} |" for s in m["screens"]]
    out += ["", "## Entities other things point at", "", "| Id | Kind | Name | Opened by | Read from |", "|---|---|---|---|---|"]
    out += [f"| {e['id']} | {e['kind']} | {e['name']} | {', '.join(e['openers']) or ''} | {e['resolved_by']} |"
            for e in m["entities"]]
    out += ["", "## References and links", "", "| From | How | To | Times |", "|---|---|---|---|"]
    out += [f"| {r['from']} | {r['how']} | {r['to']} | {r['count']} |" for r in m["references"]]
    out += ["", "## Build order", ""] + [f"{n}. {step}" for n, step in enumerate(m["build_order"], 1)]
    if m["cycle"]:
        out += ["", "Cycle, could not be ordered: " + ", ".join(m["cycle"])]
    if m["unresolved"]:
        out += ["", "## Not resolved", ""] + [f"- {u}" for u in m["unresolved"]]
    return "\n".join(out) + "\n"
