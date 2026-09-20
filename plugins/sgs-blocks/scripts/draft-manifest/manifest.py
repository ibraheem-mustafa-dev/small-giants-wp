"""Spec 31 draft manifest: what a draft contains, what refers to what, and the order to build it in.

Read-only. Reads the draft file and the README beside it; writes a JSON manifest and, on request, a
markdown report. It changes nothing in the pipeline, the theme or any site.

    python manifest.py --draft "<draft.dc.html>" --out manifest.json [--report manifest.md]

For a draft with no labelled screens (a static single-page draft) the manifest is one page with no
overlays, so it is inert for those drafts.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
for p in (str(HERE), str(HERE.parent)):
    if p not in sys.path:
        sys.path.insert(0, p)

import build_order  # noqa: E402
import dc_script  # noqa: E402
import dc_template as tpl_mod  # noqa: E402
from manifest_vocab import (CART_WORDS, DEFAULT_SCREEN_KIND, FULLSCREEN_RE, GEOMETRY_RULES,  # noqa: E402
                            SCREEN_KIND_RULES, TARGETS, TIERS)
from readme_routes import read_readme_routes  # noqa: E402
from shared_utils import is_claude_design_draft, read_readme_text  # noqa: E402


def _norm(word: str) -> str:
    return re.sub(r"^is(?=[A-Z])", "", word).lower()


def _same(a: str, b: str) -> bool:
    """Same word, allowing a plural ('lens' and 'lenses', 'frame' and 'frames')."""
    a, b = _norm(a), _norm(b)
    return a == b or a + "s" == b or a + "es" == b or b + "s" == a or b + "es" == a


def _tokens(text: str) -> set[str]:
    return {_norm(t) for t in re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])", text) if len(t) > 2}


def screen_kind(label: str, route: str, purpose: str) -> str:
    fields = {"label": label, "route": route, "purpose": purpose}
    for names, pattern, kind in SCREEN_KIND_RULES:
        if any(re.search(pattern, fields[n], re.IGNORECASE) for n in names):
            return kind
    return DEFAULT_SCREEN_KIND


def overlay_kind(region: dict) -> str | None:
    tag = region["first_tag"]
    for pattern, kind in GEOMETRY_RULES:
        if re.search(pattern, tag):
            return kind
    if re.search(FULLSCREEN_RE, tag):
        return "modal" if region["dialog"] or 'role="dialog"' in tag else "drawer"
    return None


def _match_readme(view_key: str, label: str, routes: list[dict]) -> dict | None:
    for r in routes:
        if _same(r["view"], view_key) or _same(r["view"], label):
            return r
    return None


def build_manifest(draft: pathlib.Path) -> dict:
    html = draft.read_text(encoding="utf-8")
    readme = read_readme_text(draft.parent)
    routes = read_readme_routes(readme)
    tpl, script = tpl_mod.template_text(html), dc_script.script_text(html)
    screens = tpl_mod.find_screens(tpl)
    headers, footers = tpl_mod.find_tag_spans(tpl, "header"), tpl_mod.find_tag_spans(tpl, "footer")
    usage = tpl_mod.handler_usage(tpl)
    handlers = {n: dc_script.analyse_handler(script, n) for n in dict.fromkeys(n for n, _ in usage)}

    # Screens.
    out_screens, view_of_label = [], {}
    for s in screens:
        view = _norm(s["flag"] or s["label"])
        readme_row = _match_readme(s["flag"] or s["label"], s["label"], routes)
        kind = screen_kind(s["label"], (readme_row or {}).get("route", ""), (readme_row or {}).get("purpose", ""))
        view_of_label[s["label"]] = view
        out_screens.append({"label": s["label"], "view": view, "gate_flag": s["flag"], "kind": kind,
                            "target": TARGETS[kind], "route": (readme_row or {}).get("route"),
                            "readme_view": (readme_row or {}).get("view")})
    def label_for(view: str) -> str | None:
        return next((k for k, v in view_of_label.items() if _same(v, view)), None)

    # Overlays: a flag a handler can turn on, found by the state the handler sets.
    flags = tpl_mod.all_flags(tpl)
    screen_flags = {s["flag"] for s in screens}
    overlay_flags: dict[str, dict] = {}
    for flag in flags:
        if flag in screen_flags:
            continue
        state = dc_script.flag_state(script, flag)
        openers = [h for h, a in handlers.items() if state and dc_script.opens(a["sets"], *state)]
        basis = "state"
        if not openers:
            m = re.fullmatch(r"(\w+?)Open", flag)
            if m:
                want = m.group(1).lower()
                openers = [h for h in handlers if h.lower() in ("open" + want, "toggle" + want)]
                basis = "name"
        if openers:
            overlay_flags[flag] = {"openers": sorted(openers), "resolved_by": basis}
    regions = tpl_mod.find_regions(tpl, set(overlay_flags))
    region_of = {r["flag"]: r for r in regions}
    top = [r for r in regions if not any(o is not r and o["start"] < r["start"] and r["end"] <= o["end"] for o in regions)]
    # A region inside a screen is a state of that screen (a filter drawer, a "sent" message), not an entity.
    in_screen = [{"screen": s["label"], "flag": r["flag"]} for r in top for s in screens if s["start"] <= r["start"] < s["end"]]
    top = [r for r in top if not any(s["start"] <= r["start"] < s["end"] for s in screens)]
    unresolved: list[str] = [f"overlay flag {f} has no opener handler" for f in flags
                             if f not in overlay_flags and f not in screen_flags and re.search(r"Open$|Any$", f)]

    # Entities.
    choice_views = {s["view"] for s in out_screens if s["kind"] == "choice-flow"}
    entities, entity_of_flag = [], {}
    for r in top:
        kind = overlay_kind(r)
        info = overlay_flags[r["flag"]]
        toks = _tokens(" ".join([r["flag"], r["label"], *info["openers"]]))
        entity_id = "overlay:" + r["flag"]
        if kind is None:
            unresolved.append(f"overlay {r['flag']}: geometry matched no rule; kind not decided")
            continue
        if kind in ("drawer", "modal") and toks & choice_views:
            kind, entity_id = "choice-flow", "choice-flow:" + sorted(toks & choice_views)[0]
        elif kind in ("drawer", "modal") and re.search(CART_WORDS, " ".join(sorted(toks)), re.IGNORECASE):
            kind = "cart-drawer"
        panels = sorted({o["flag"] for o in regions if o is not r and r["start"] < o["start"] and o["end"] <= r["end"]})
        entities.append({"id": entity_id, "kind": kind, "target": TARGETS[kind], "name": r["label"] or r["flag"],
                         "flag": r["flag"], "openers": info["openers"], "resolved_by": info["resolved_by"],
                         "panels": panels})
        for f in [r["flag"], *panels]:
            entity_of_flag[f] = entity_id
    opener_entity = {h: e["id"] for e in entities for h in e["openers"]}
    for e in entities:  # panel openers open their parent
        for f in e["panels"]:
            for h in overlay_flags.get(f, {}).get("openers", []):
                opener_entity.setdefault(h, e["id"])

    # Forms: one per <form>, on a page screen only (a template owns its own forms).
    if not out_screens:  # a static single-page draft: one page, nothing to route
        out_screens = [{"label": "Page", "view": "page", "gate_flag": None, "kind": DEFAULT_SCREEN_KIND,
                        "target": TARGETS[DEFAULT_SCREEN_KIND], "route": None, "readme_view": None}]
    kind_of = {s["label"]: s["kind"] for s in out_screens}
    forms = []
    for pos in tpl_mod.form_positions(tpl):
        where = tpl_mod.container_of(pos, screens, regions, headers, footers)
        label = where.split(":", 1)[1] if where.startswith("screen:") else where
        owned = kind_of.get(label) == DEFAULT_SCREEN_KIND
        forms.append({"in": where, "target": TARGETS["form"] if owned else "part of the template it sits in"})
        if owned:
            entities.append({"id": f"form:{label}", "kind": "form", "target": TARGETS["form"], "name": f"{label} form",
                             "flag": None, "openers": [], "resolved_by": "markup", "panels": []})

    # References (handler used somewhere) and page links.
    def node_of(container: str) -> str | None:
        if container.startswith("screen:"):
            return "content:" + container[7:]
        if container.startswith("chrome:"):
            return container[7:]
        if container.startswith("overlay:"):
            return entity_of_flag.get(container[8:])
        return None

    refs: dict[tuple[str, str, str], int] = {}
    for name, pos in usage:
        src = node_of(tpl_mod.container_of(pos, screens, regions, headers, footers))
        if not src:
            continue
        targets = []
        if name in opener_entity:
            targets.append(("references", opener_entity[name]))
        for v in handlers[name]["views"]:
            if label_for(v):
                targets.append(("links to", "shell:" + label_for(v)))
            else:
                unresolved.append(f"handler {name} goes to view '{v}', which is not a labelled screen")
        for how, dst in targets:
            if dst != src:
                refs[(src, dst, how)] = refs.get((src, dst, how), 0) + 1
    for f in forms:
        if f["in"].startswith("screen:"):
            refs[("content:" + f["in"][7:], "form:" + f["in"][7:], "references")] = 1
    references = [{"from": a, "to": b, "how": h, "count": n} for (a, b, h), n in sorted(refs.items())]

    # README routes the draft has no screen for.
    matched = {s["readme_view"] for s in out_screens if s["readme_view"]}
    for r in routes:
        if r["view"] in matched:
            continue
        home = next((e for e in entities if r["view"].lower() in _tokens(" ".join([e["flag"] or "", e["name"], *e["openers"]]))), None)
        unresolved.append(f"README route '{r['view']}' {r['route']} has no screen; "
                          + (f"it is presented as {home['id']}" if home else "no overlay matches it either"))

    # Build order: shells, then leaf entities, then header and footer, then content.
    nodes = [{"id": "global-styles", "tier": TIERS["global"]}, {"id": "site-info", "tier": TIERS["global"]}]
    nodes += [{"id": "shell:" + s["label"], "tier": TIERS["shell"]} for s in out_screens]
    nodes += [{"id": "content:" + s["label"], "tier": TIERS["content"]} for s in out_screens]
    nodes += [{"id": e["id"], "tier": TIERS[e["kind"]]} for e in entities]
    if headers:
        nodes.append({"id": "header", "tier": TIERS["header"]})
    if footers:
        nodes.append({"id": "footer", "tier": TIERS["footer"]})
    edges = [(n["id"], other["id"]) for n in nodes[:2] for other in nodes[2:]]
    edges += [("shell:" + s["label"], "content:" + s["label"]) for s in out_screens]
    edges += [(r["to"], r["from"]) for r in references if r["how"] == "references"]
    sequence, cycle = build_order.order(nodes, edges)

    normal = [s["label"] for s in out_screens if s["kind"] == DEFAULT_SCREEN_KIND]
    return {
        "draft": draft.name, "claude_design": is_claude_design_draft(html), "readme_found": readme is not None,
        "screens": out_screens, "chrome": [n for n, spans in (("header", headers), ("footer", footers)) if spans],
        "entities": entities, "in_screen_regions": in_screen, "forms": forms, "references": references, "build_order": sequence,
        "cycle": cycle, "unresolved": unresolved,
        "counts": {"screens": len(out_screens), "normal_pages": len(normal), "template_or_flow_screens":
                   len(out_screens) - len(normal), "entities": len(entities)},
        "normal_pages": normal,
    }


def main(argv=None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Read-only draft manifest (screens, entities, references, build order)")
    ap.add_argument("--draft", required=True)
    ap.add_argument("--out", default=None)
    ap.add_argument("--report", default=None)
    args = ap.parse_args(argv)
    manifest = build_manifest(pathlib.Path(args.draft).resolve())
    text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    if args.out:
        pathlib.Path(args.out).write_text(text, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(text)
    if args.report:
        from manifest_report import render
        pathlib.Path(args.report).write_text(render(manifest), encoding="utf-8")
        print(f"Wrote {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
