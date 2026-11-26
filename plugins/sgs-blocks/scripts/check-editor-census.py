#!/usr/bin/env python3
"""check-editor-census.py - reads the editor census and fails on what Stage E2's codemods must have removed.

The census (`investigate/i8-editor/census.mjs`, one JSON for every block, run on a scratch mirror with `SITE=<mirror>`)
records, per block, the inspector's panel list on first select, settled, and on revisit, and every panel's controls.
This script reads that JSON. It proves the LIVE half of each rule; the source half is each item's own detector.

Rules (each is a subcommand; `all` runs every one):
  open-panels   No panel past the first of its tab is open (first select, settled, revisit). A ToolsPanel has no
                collapse arrow, so a ToolsPanel past the first cannot close: reported, never failed.
  panel-menus   0 media "Panel options" menus, and 0 menus on a reset-only ToolsPanel (the class comes from
                check-reset-only-menus.js).
  focus-panel   0 panels titled "Keyboard focus".
  colour-panel  One Colour panel per block with 12 or fewer base colours (a second panel titled "Colour" is a kit
                panel that should have joined the main one); a block over 12 may carry kit Colour panels.
  media-place   Every media panel holds the same index on first select, settled and revisit.
  blind         Blocks the census could not read (no tabs and no panels): reported, never failed.

USAGE (from plugins/sgs-blocks)
  python scripts/check-editor-census.py <rule|all> --census <census.json> [--survey]   # list what each rule finds
  python scripts/check-editor-census.py <rule|all> --census <census.json> --check      # exit 1 on a finding
  python scripts/check-editor-census.py --self-test
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
MEDIA_TITLES = {
    "Media", "Caption and link", "Video", "Size and crop", "Position in the layout", "Border and shape", "Shadow",
    "Overlay and filters", "SVG", "Background",
}
SNAPSHOTS = ("first", "settled", "revisit")
RULES = ("open-panels", "panel-menus", "focus-panel", "colour-panel", "media-place", "blind")


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))["results"]


def tabs_of(rec):
    """{tab: {snapshot: [panels]}} for one block record."""
    out = {}
    for tab in ("settings", "styles"):
        snaps = {s: rec["L"].get(f"{tab}_{s}") for s in SNAPSHOTS}
        if any(v is not None for v in snaps.values()):
            out[tab] = snaps
    return out


def controls(rec):
    """Every (tab, panel record) from the deep read."""
    for tab, lst in (rec.get("deep") or {}).items():
        for p in lst or []:
            yield tab, p


def rule_open_panels(res, ctx):
    found, info = [], []
    for name, rec in sorted(res.items()):
        if not rec.get("ok") or not rec.get("L"):
            continue
        for tab, snaps in tabs_of(rec).items():
            open_at = {}
            for snap, lst in snaps.items():
                for i, p in enumerate(lst or []):
                    if i == 0:
                        continue
                    if p["kind"] == "tools":
                        if snap == "settled":
                            info.append(f"{name} {tab} \"{p['title']}\" is a ToolsPanel past the first: always open, no collapse")
                    elif p.get("opened"):
                        open_at.setdefault((p["title"], i + 1), []).append(snap)
            for (title, pos), snap_list in open_at.items():
                found.append(f"{name} {tab} \"{title}\" is open at position {pos} ({', '.join(snap_list)})")
    return found, info


def rule_panel_menus(res, ctx):
    found, info = [], []
    reset_only = ctx["reset_only_titles"]
    for name, rec in sorted(res.items()):
        slug = name.removeprefix("sgs/")
        for tab, p in controls(rec):
            read = p.get("read") or {}
            for c in read.get("controls", []):
                if c.get("label") == "Panel options":
                    found.append(f"{name} {tab} \"{p['title']}\" draws a media \"Panel options\" menu")
            if p["kind"] == "tools" and read.get("hasMenu"):
                if (slug, p["title"]) in reset_only:
                    found.append(f"{name} {tab} ToolsPanel \"{p['title']}\" is reset-only and still draws core's menu")
                else:
                    info.append(f"{name} {tab} ToolsPanel \"{p['title']}\" keeps core's menu (standard)")
    return found, info


def rule_focus_panel(res, ctx):
    found = []
    for name, rec in sorted(res.items()):
        for tab, snaps in tabs_of(rec).items():
            for p in snaps.get("settled") or []:
                if p["title"] == "Keyboard focus":
                    found.append(f"{name} {tab} still has a \"Keyboard focus\" panel")
        for tab, p in controls(rec):
            if p["title"] == "Keyboard focus" and not any(f.startswith(name + " ") for f in found):
                found.append(f"{name} {tab} still has a \"Keyboard focus\" panel")
    return found, []


def rule_colour_panel(res, ctx):
    found, info = [], []
    over = ctx["over12"]
    for name, rec in sorted(res.items()):
        slug = name.removeprefix("sgs/")
        styles = (tabs_of(rec).get("styles") or {}).get("settled") or []
        n = sum(1 for p in styles if p["title"] in ("Colour", "Color") and p["kind"] == "body")
        if n > 1 and slug not in over:
            found.append(f"{name} has {n} Colour panels but 12 or fewer base colours: kit colours belong in the main one")
        elif n > 1:
            info.append(f"{name} has {n} Colour panels (over 12 base colours: a kit panel is allowed)")
    return found, info


def rule_media_place(res, ctx):
    found = []
    for name, rec in sorted(res.items()):
        for tab, snaps in tabs_of(rec).items():
            ref = snaps.get("settled") or []
            for snap in ("first", "revisit"):
                other = snaps.get(snap) or []
                for title in {p["title"] for p in ref} & {p["title"] for p in other}:
                    if title.split(": ")[-1] not in MEDIA_TITLES:
                        continue
                    a = [p["title"] for p in ref].index(title)
                    b = [p["title"] for p in other].index(title)
                    if a != b:
                        found.append(f"{name} {tab} \"{title}\" is at {b + 1} on {snap} but {a + 1} settled")
                for title in {p["title"] for p in ref} - {p["title"] for p in other}:
                    if title.split(": ")[-1] in MEDIA_TITLES:
                        found.append(f"{name} {tab} \"{title}\" is missing on {snap} (settled has it)")
    return found, []


def rule_blind(res, ctx):
    info = []
    for name, rec in sorted(res.items()):
        if not rec.get("ok"):
            info.append(f"{name} could not be inserted")
        elif not rec.get("tabs") and not (rec.get("deep") or {}).get("single"):
            info.append(f"{name} showed no tabs and no panels: the census read nothing")
    return [], info


FUNCS = {
    "open-panels": rule_open_panels, "panel-menus": rule_panel_menus, "focus-panel": rule_focus_panel,
    "colour-panel": rule_colour_panel, "media-place": rule_media_place, "blind": rule_blind,
}


def context():
    """Reset-only ToolsPanel titles per block and the over-12 block list, from the other detectors' surveys."""
    tmp = Path(tempfile.mkdtemp(prefix="cec-"))
    ro = tmp / "ro.json"
    cc = tmp / "cc.json"
    subprocess.run(["node", "scripts/check-reset-only-menus.js", "--survey", "--json", str(ro)], cwd=PLUGIN, capture_output=True, check=False)
    subprocess.run([sys.executable, "scripts/check-colour-count.py", "--survey", "--json", str(cc)], cwd=PLUGIN, capture_output=True, check=False)
    reset_only = set()
    if ro.exists():
        for r in json.loads(ro.read_text(encoding="utf-8"))["rows"]:
            if r["kind"] == "tools-panel" and r["cls"] == "reset-only":
                parts = r["file"].split("/")
                slug = parts[2] if parts[1] in ("blocks", "commerce-blocks") else ""
                reset_only.add((slug, r["label"]))
    over = set()
    if cc.exists():
        over = {b for b, v in json.loads(cc.read_text(encoding="utf-8"))["blocks"].items() if v.get("over")}
    return {"reset_only_titles": reset_only, "over12": over}


def run(rule, census, mode):
    res = load(census)
    ctx = context()
    rules = RULES if rule == "all" else (rule,)
    total = 0
    for r in rules:
        found, info = FUNCS[r](res, ctx)
        print(f"[{r}] {len(found)} finding(s), {len(info)} note(s)")
        for f in found:
            print(f"  FINDING {f}")
        if mode == "survey":
            for i in info:
                print(f"  note    {i}")
        total += len(found)
    return 1 if (mode == "check" and total) else 0


def self_test():
    fails = []

    def ok(label, cond):
        print(f"  {'PASS' if cond else 'FAIL'}  {label}")
        if not cond:
            fails.append(label)

    def panel(title, opened=False, kind="body"):
        return {"title": title, "kind": kind, "opened": opened, "hasToggle": kind == "body"}

    def rec(styles_first, styles_settled=None, styles_revisit=None, deep=None):
        s = styles_settled or styles_first
        return {"ok": True, "tabs": ["Styles"], "L": {"styles_first": styles_first, "styles_settled": s, "styles_revisit": styles_revisit or s}, "deep": deep or {}}

    ctx = {"reset_only_titles": {("x", "Reset me")}, "over12": {"big"}}
    good = {"sgs/x": rec([panel("Colour", True), panel("Layout")])}
    ok("accepts only the first panel open", not rule_open_panels(good, ctx)[0])
    bad = {"sgs/x": rec([panel("Colour", True), panel("Layout", True)])}
    ok("CATCHES a second panel open", 1 == len(rule_open_panels(bad, ctx)[0]))
    tools = {"sgs/x": rec([panel("Colour", True), panel("Tools", True, "tools")])}
    ok("a ToolsPanel past the first is a note, not a finding", not rule_open_panels(tools, ctx)[0] and rule_open_panels(tools, ctx)[1])
    menu = {"sgs/x": rec([panel("A")], deep={"styles": [{"title": "A", "kind": "body", "read": {"controls": [{"label": "Panel options"}]}}]})}
    ok("CATCHES a Panel options menu", 1 == len(rule_panel_menus(menu, ctx)[0]))
    tp = {"sgs/x": rec([panel("A")], deep={"styles": [{"title": "Reset me", "kind": "tools", "read": {"controls": [], "hasMenu": 1}}, {"title": "Std", "kind": "tools", "read": {"controls": [], "hasMenu": 1}}]})}
    f, i = rule_panel_menus(tp, ctx)
    ok("CATCHES a reset-only ToolsPanel menu and leaves a standard one", 1 == len(f) and 1 == len(i))
    kf = {"sgs/x": rec([panel("Keyboard focus")])}
    ok("CATCHES a Keyboard focus panel", 1 == len(rule_focus_panel(kf, ctx)[0]))
    ok("accepts a block with none", not rule_focus_panel(good, ctx)[0])
    two = {"sgs/x": rec([panel("Colour", True), panel("Colour")]), "sgs/big": rec([panel("Colour", True), panel("Colour")])}
    f, i = rule_colour_panel(two, ctx)
    ok("CATCHES a second Colour panel on a block with 12 or fewer colours, allows it over 12", 1 == len(f) and 1 == len(i))
    moved = {"sgs/x": rec([panel("Colour", True), panel("Background")], styles_settled=[panel("Colour", True), panel("Size and crop"), panel("Background")], styles_revisit=[panel("Colour", True), panel("Size and crop"), panel("Background")])}
    ok("CATCHES a media panel that moves between first select and settled", 1 <= len(rule_media_place(moved, ctx)[0]))
    ok("accepts a media panel that holds its place", not rule_media_place({"sgs/x": rec([panel("Colour"), panel("Background")])}, ctx)[0])
    blind = {"sgs/x": {"ok": True, "tabs": [], "L": {}, "deep": {"single": []}}}
    ok("reports a census-blind block as a note", 1 == len(rule_blind(blind, ctx)[1]))
    print("\n[check-editor-census --self-test] " + ("ALL ASSERTIONS PASS." if not fails else f"{len(fails)} FAILURE(S)."))
    return 0 if not fails else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("rule", nargs="?", choices=list(RULES) + ["all"])
    ap.add_argument("--census")
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not a.rule or not a.census or not (a.survey or a.check):
        ap.print_usage()
        return 2
    return run(a.rule, a.census, "check" if a.check else "survey")


if __name__ == "__main__":
    sys.exit(main())
