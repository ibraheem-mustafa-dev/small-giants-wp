#!/usr/bin/env python3
"""check-nav-panels.py - checks the inspector panel layout of the menu, header, footer and logo blocks (Stage E3, track W7).

The 17 blocks: nav-bar-menu, nav-drawer-menu, nav-drawer, mega-panel, mega-group, mega-aside, site-header, site-header-row,
site-footer, site-footer-row, responsive-logo, language-switch, theme-toggle, social-icons, icon, breadcrumbs, whatsapp-cta.

Two halves.
  Census half (needs `--census <census.json>` from the editor census, run on a scratch mirror with SITE=<mirror>):
    single-control    A panel that holds one control, outside the plan's `single_ok` list (the register's Stays and Kept rows).
    repeated-title    Two panels share a title in one tab.
    order-stable      The panel order differs between first select, settled and revisit of the same tab.
    open-panels       A panel past the first of its tab is open (a ToolsPanel cannot close, so it is a note, not a finding).
    plan              Each `gone` title is absent, each `must` title is present, each `controls` pair sits in the named panel.
  Source half (reads the repo, no census):
    source            A block no longer imports the panels the dissolve removed, the logo mounts one MediaElementPanel, the
                      files the plan names exist, and the dissolved panels' own files are gone.

The plan lives in scripts/data/nav-panel-plan.json: one entry per line of the track's LISTS.md. Colour rows are not checked here:
nav-bar-menu and nav-drawer-menu keep theirs this pass (Bean, 2026-11-26), and scripts/check-colour-count.py owns the colour rule.

USAGE (from plugins/sgs-blocks)
  python scripts/check-nav-panels.py --survey [--census <census.json>]   # list what each rule finds
  python scripts/check-nav-panels.py --check  [--census <census.json>]   # exit 1 on a finding; without --census only `source` runs
  python scripts/check-nav-panels.py --self-test
"""
import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
PLAN = Path(__file__).resolve().parent / "data" / "nav-panel-plan.json"
SNAPSHOTS = ("first", "settled", "revisit")
TABS = ("settings", "styles")


def load_plan():
    return json.loads(PLAN.read_text(encoding="utf-8"))


def load_census(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))["results"]


def slug_of(name):
    return name.removeprefix("sgs/")


def snaps_of(rec, tab):
    return {s: (rec.get("L") or {}).get(f"{tab}_{s}") for s in SNAPSHOTS}


def settled(rec, tab):
    return (rec.get("L") or {}).get(f"{tab}_settled") or []


def deep(rec, tab):
    return (rec.get("deep") or {}).get(tab) or []


def ctrl_labels(panel):
    return [c.get("label", "") for c in (panel.get("read") or {}).get("controls", [])]


def holds(panel, label):
    """True when the panel's visible controls include `label`, or its text opens with it.

    The census reads a control's label from the wrapper around it. A box control whose sides are unlinked draws its group
    label outside any wrapper the census reads (the four side selects carry Top, Right, Bottom and Left instead), so a panel
    whose first row is such a box opens its text with the label.
    """
    if label in ctrl_labels(panel):
        return True
    return (panel.get("read") or {}).get("bodyText", "").startswith(label)


def mine(res, plan):
    for name, rec in sorted(res.items()):
        if slug_of(name) in plan["blocks"] and rec.get("ok") and rec.get("L"):
            yield slug_of(name), rec


def rule_single_control(res, plan):
    found = []
    universal = set(plan["universal_single_ok"])
    for slug, rec in mine(res, plan):
        ok = universal | set(plan["blocks"][slug].get("single_ok", []))
        for tab in TABS:
            for p in deep(rec, tab):
                if p.get("title") in ok:
                    continue
                n = len(ctrl_labels(p))
                if n == 1:
                    found.append(f"{slug} {tab} \"{p['title']}\" holds one control ({ctrl_labels(p)[0]})")
    return found, []


def rule_repeated_title(res, plan):
    found = []
    for slug, rec in mine(res, plan):
        for tab in TABS:
            titles = [p["title"] for p in settled(rec, tab)]
            for t in sorted({t for t in titles if titles.count(t) > 1}):
                found.append(f"{slug} {tab} has {titles.count(t)} panels titled \"{t}\"")
    return found, []


def rule_order_stable(res, plan):
    found = []
    for slug, rec in mine(res, plan):
        for tab in TABS:
            snaps = snaps_of(rec, tab)
            ref = [p["title"] for p in snaps["settled"] or []]
            for snap in ("first", "revisit"):
                other = [p["title"] for p in snaps[snap] or []]
                if snaps[snap] is not None and other != ref:
                    moved = [t for t in ref if t in other and ref.index(t) != other.index(t)]
                    missing = [t for t in ref if t not in other]
                    found.append(
                        f"{slug} {tab} order on {snap} differs from settled"
                        + (f"; moved: {', '.join(moved[:4])}" if moved else "")
                        + (f"; missing on {snap}: {', '.join(missing[:4])}" if missing else "")
                    )
    return found, []


def rule_open_panels(res, plan):
    found, info = [], []
    for slug, rec in mine(res, plan):
        for tab in TABS:
            for snap, lst in snaps_of(rec, tab).items():
                for i, p in enumerate(lst or []):
                    if i == 0:
                        continue
                    if p["kind"] == "tools":
                        if snap == "settled":
                            info.append(f"{slug} {tab} \"{p['title']}\" is a ToolsPanel past the first: always open, no collapse")
                    elif p.get("opened"):
                        found.append(f"{slug} {tab} \"{p['title']}\" is open at position {i + 1} ({snap})")
    return found, info


def rule_plan(res, plan):
    found = []
    for slug, rec in mine(res, plan):
        for tab in TABS:
            spec = plan["blocks"][slug].get(tab)
            if not spec:
                continue
            titles = [p["title"] for p in settled(rec, tab)]
            panels = {p["title"]: p for p in deep(rec, tab)}
            for t in spec.get("gone", []):
                if t in titles:
                    found.append(f"{slug} {tab} still has the panel \"{t}\"")
            for t in spec.get("must", []):
                if titles.count(t) != 1:
                    found.append(f"{slug} {tab} has {titles.count(t)} panels titled \"{t}\", the plan wants exactly 1")
            for label, panel in spec.get("controls", []):
                p = panels.get(panel)
                if p is None:
                    found.append(f"{slug} {tab} has no panel \"{panel}\" to hold \"{label}\"")
                elif not holds(p, label):
                    found.append(f"{slug} {tab} \"{panel}\" does not hold \"{label}\"")
    return found, []


def rule_source(plan, root=PLUGIN):
    found = []
    src = plan["source"]
    for symbol, files in src.get("no_import", {}).items():
        for f in files:
            path = root / f
            if path.exists() and re.search(rf"\bimport\s+{symbol}\b", path.read_text(encoding="utf-8")):
                found.append(f"{f} still imports {symbol}")
    for f, counts in src.get("mount_count", {}).items():
        path = root / f
        text = path.read_text(encoding="utf-8") if path.exists() else ""
        for needle, want in counts.items():
            have = len(re.findall(re.escape(needle) + r"\b", text))
            if have != want:
                found.append(f"{f} has {have} \"{needle}\" mounts, the plan wants {want}")
    for f in src.get("files_exist", []):
        if not (root / f).exists():
            found.append(f"{f} does not exist yet")
    for f in src.get("files_gone", []):
        if (root / f).exists():
            found.append(f"{f} still exists")
    return found, []


CENSUS_RULES = {
    "single-control": rule_single_control, "repeated-title": rule_repeated_title, "order-stable": rule_order_stable,
    "open-panels": rule_open_panels, "plan": rule_plan,
}


def run(census, mode, plan=None, root=PLUGIN, out=print):
    plan = plan or load_plan()
    total = 0
    found, info = rule_source(plan, root)
    out(f"[source] {len(found)} finding(s)")
    for f in found:
        out(f"  FINDING {f}")
    total += len(found)
    if census:
        res = load_census(census) if not isinstance(census, dict) else census
        for name, fn in CENSUS_RULES.items():
            found, info = fn(res, plan)
            out(f"[{name}] {len(found)} finding(s), {len(info)} note(s)")
            for f in found:
                out(f"  FINDING {f}")
            if mode == "survey":
                for i in info:
                    out(f"  note    {i}")
            total += len(found)
    else:
        out("[census rules] skipped: no --census")
    return 1 if (mode == "check" and total) else 0


def panel(title, kind="body", opened=False, labels=(), text=""):
    return {"title": title, "kind": kind, "opened": opened, "read": {"controls": [{"label": l} for l in labels], "bodyText": text}}


def rec(settings, styles, first_styles=None):
    def short(ps):
        return [{"title": p["title"], "kind": p["kind"], "opened": p["opened"]} for p in ps]
    return {
        "ok": True,
        "L": {
            "settings_first": short(settings), "settings_settled": short(settings), "settings_revisit": short(settings),
            "styles_first": short(first_styles if first_styles is not None else styles),
            "styles_settled": short(styles), "styles_revisit": short(styles),
        },
        "deep": {"settings": settings, "styles": styles},
    }


def self_test():
    plan = {
        "universal_single_ok": ["Size in row"],
        "blocks": {
            "nav-bar-menu": {
                "single_ok": ["Menu"],
                "settings": {"gone": ["Burger Menu"], "controls": [["Show the burger on", "Menu Button"]]},
                "styles": {"gone": ["List layout"], "must": ["Spacing"], "controls": [["Padding", "Spacing"]]},
            }
        },
        "source": {
            "no_import": {"ListLayoutPanel": ["edit.js"]},
            "mount_count": {"edit.js": {"<MediaElementPanel": 1}},
            "files_exist": ["Dark.js"],
            "files_gone": ["Gone.js"],
        },
    }
    good = {
        "sgs/nav-bar-menu": rec(
            [panel("Menu", opened=True, labels=["Menu"]), panel("Menu Button", labels=["Show the burger on", "Icon"])],
            [panel("Spacing", opened=True, labels=["Padding", "Margin"]), panel("Typography", labels=["Font", "Weight"]),
             panel("Size in row", labels=["Sizing"])],
        )
    }
    bad = {
        "sgs/nav-bar-menu": rec(
            [panel("Menu", opened=True, labels=["Menu"]), panel("Burger Menu", labels=["Show the burger on"]),
             panel("Menu Button", opened=True, labels=["Icon"])],
            [panel("List layout", kind="tools", opened=True, labels=["Item gap", "Padding"]),
             panel("Effects", labels=["Magnetic hover pull"]), panel("Effects", labels=["Target", "Effect"])],
            first_styles=[panel("Effects"), panel("List layout", kind="tools", opened=True)],
        )
    }
    expect_bad = {
        "single-control": 2, "repeated-title": 1, "order-stable": 1, "open-panels": 1,
    }
    failures = []
    for name, fn in CENSUS_RULES.items():
        g, _ = fn(good, plan)
        b, _ = fn(bad, plan)
        if g:
            failures.append(f"clean census: {name} reported {g}")
        want = expect_bad.get(name)
        if name == "plan":
            kinds = " | ".join(b)
            for needle in ("still has the panel \"Burger Menu\"", "still has the panel \"List layout\"", "0 panels titled \"Spacing\"",
                           "has no panel \"Spacing\" to hold \"Padding\"", "\"Menu Button\" does not hold \"Show the burger on\""):
                if needle not in kinds:
                    failures.append(f"plan rule missed: {needle}")
        elif want is None or len(b) < want:
            failures.append(f"defective census: {name} found {len(b)}, wanted at least {want}")
    # An unlinked box control shows Top, Right, Bottom, Left as its labels: the group label is found at the head of the panel text.
    unlinked = {"sgs/nav-bar-menu": rec(
        [panel("Menu", opened=True, labels=["Menu"]), panel("Menu Button", labels=["Show the burger on", "Icon"])],
        [panel("Spacing", opened=True, labels=["Top", "Right"], text="Padding Padding Top Right"), panel("Typography", labels=["Font", "Weight"])],
    )}
    f, _ = rule_plan(unlinked, plan)
    if f:
        failures.append(f"plan rule refused a box control whose group label heads the panel text: {f}")
    unlinked["sgs/nav-bar-menu"]["deep"]["styles"][0] = panel("Spacing", opened=True, labels=["Top", "Right"], text="Margin Top Right Padding")
    f, _ = rule_plan(unlinked, plan)
    if not any("\"Spacing\" does not hold \"Padding\"" in x for x in f):
        failures.append("plan rule accepted a panel whose text only mentions the label further in")
    tmp = Path(tempfile.mkdtemp(prefix="nav-panels-"))
    (tmp / "edit.js").write_text("import ListLayoutPanel from 'x';\n<MediaElementPanel a/>\n<MediaElementPanel b/>\n", encoding="utf-8")
    (tmp / "Gone.js").write_text("", encoding="utf-8")
    f, _ = rule_source(plan, tmp)
    if len(f) != 4:
        failures.append(f"source rule on a defective tree: wanted 4 findings, got {f}")
    (tmp / "Gone.js").unlink()
    (tmp / "edit.js").write_text("import Other from 'x';\n<MediaElementPanel a/>\n", encoding="utf-8")
    (tmp / "Dark.js").write_text("", encoding="utf-8")
    f, _ = rule_source(plan, tmp)
    if f:
        failures.append(f"source rule on a clean tree: {f}")
    real = [e for e in load_plan()["blocks"]]
    if len(real) != 17:
        failures.append(f"nav-panel-plan.json names {len(real)} blocks, the track owns 17")
    for line in failures:
        print("SELF-TEST FAIL:", line)
    print("self-test:", "FAILED" if failures else "ok")
    return 1 if failures else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--census")
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not (a.survey or a.check):
        ap.error("pass --survey, --check or --self-test")
    return run(a.census, "check" if a.check else "survey")


if __name__ == "__main__":
    sys.exit(main())
