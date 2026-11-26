#!/usr/bin/env python3
"""check-editor-census-e3.py - reads the editor census for the Stage E3 panel rules of a block owner and fails on what Pass 2 must have fixed.

Stage E3 (plan Task 13): each owner applies the register's moves, dissolves repeated panel titles and places each part's colours in
that part's panel. The census (`investigate/i8-editor/census.mjs`, one JSON per run, taken on a scratch mirror with `SITE=<mirror>`)
records, per block, the inspector's panel list on first select, settled and on revisit, and every panel's controls. This script reads
that JSON against an owner's register file `scripts/data/e3-register-<owner>.json`. It is the live half; the source half of the
colour rule is `check-colour-count.py --stage whole-block`, and the first-panel rule is `check-editor-census.py open-panels`.

Rules (each a subcommand; `all` runs every one, and `open-panels` and `colour-panel` from check-editor-census.py with them):
  lone-panels     A panel that holds one control, on an owner's block, outside the register's `stays` rows (group leads, repeaters,
                  Kept) and outside the shared-extension panels the owner does not own (`shared`). A ToolsPanel counts too.
  repeated-titles No two panels in one tab share a title (settled). A title shared across the two tabs is a note, never a finding.
  tab-order       The panels of a tab hold the same order on first select, settled and revisit (the order that changes after a tab switch).
  register-moves  Every register row of verdict Moves or Style: the control sits in the panel `to` (its final title) and is gone from
                  the panel it came from (unless that panel is renamed to `to`).
  panels-expect   Every `expect` row: the panel exists in that tab and holds the listed controls; every `gone` row: no panel has that title.
  colour-main     On each block over 12 base colours (from check-colour-count.py), the main Colour panel (the first panel titled
                  Colour or Color in Styles) holds only whole-block colours (patterns in scripts/data/colour-whole-block.json: background,
                  text, heading, link, each with its hover or active version); a block with no whole-block colour has no main Colour panel.
  register-source The REGISTER ITSELF against a census taken BEFORE any change (`--before`): every Moves, Style and Stays row's control
                  is where the register says it is today. A register row that fails this is wrong, not the block.
  blind           Blocks the census could not read: reported, never failed.

USAGE (from plugins/sgs-blocks)
  python scripts/check-editor-census-e3.py <rule|all> --owner <owner> --census <census.json> [--survey|--check]
  python scripts/check-editor-census-e3.py register-source --owner <owner> --census <census-before.json> --check
  python scripts/check-editor-census-e3.py --self-test
"""
import argparse
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
DATA = Path(__file__).resolve().parent / "data"
SNAPSHOTS = ("first", "settled", "revisit")
RULES = ("lone-panels", "repeated-titles", "tab-order", "register-moves", "panels-expect", "colour-main", "blind")
ALL_RULES = RULES + ("register-source",)
COLOUR_TITLES = ("Colour", "Color")


def load_census(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))["results"]


def load_register(owner):
    return json.loads((DATA / f"e3-register-{owner}.json").read_text(encoding="utf-8"))


def tab_panels(rec, tab, snap="settled"):
    return (rec.get("L") or {}).get(f"{tab}_{snap}") or []


def deep_panels(rec, tab):
    return (rec.get("deep") or {}).get(tab) or []


def labels_of(panel):
    return [c.get("label", "") for c in ((panel.get("read") or {}).get("controls") or [])]


def norm(s):
    return re.sub(r"\s+", " ", (s or "").replace("’", "'")).strip().lower()


def has_label(panel, label):
    want = norm(label)
    return any(norm(l) == want or want in norm(l) for l in labels_of(panel))


def find_panels(rec, tab, title):
    return [p for p in deep_panels(rec, tab) if norm(p["title"]) == norm(title)]


def block_recs(res, reg):
    for b in reg["blocks"]:
        name = "sgs/" + b
        if name in res:
            yield name, res[name]


def rule_lone_panels(res, reg, ctx):
    found, info = [], []
    stays = {(s["block"], norm(s["panel"])) for s in reg.get("stays", [])}
    shared = {norm(t) for t in reg.get("shared", [])}
    shared_re = [re.compile(x, re.I) for x in reg.get("shared_re", [])]
    for name, rec in block_recs(res, reg):
        slug = name.removeprefix("sgs/")
        for tab in ("settings", "styles"):
            for p in deep_panels(rec, tab):
                if p["kind"] == "advanced" or len((p.get("read") or {}).get("controls", [])) != 1:
                    continue
                t = norm(p["title"])
                if (slug, t) in stays:
                    info.append(f"{name} {tab} \"{p['title']}\" is one control and stays (register)")
                elif t in shared or any(r.search(p["title"]) for r in shared_re):
                    info.append(f"{name} {tab} \"{p['title']}\" is one control in a shared panel another owner holds")
                else:
                    found.append(f"{name} {tab} \"{p['title']}\" holds one control ({labels_of(p)[0]})")
    return found, info


def rule_repeated_titles(res, reg, ctx):
    found, info = [], []
    for name, rec in block_recs(res, reg):
        seen = {}
        for tab in ("settings", "styles"):
            titles = [norm(p["title"]) for p in tab_panels(rec, tab)]  # case-insensitive: "Add to cart button" and "Add to Cart button" are one title
            for t in sorted({t for t in titles if titles.count(t) > 1}):
                found.append(f"{name} {tab} has {titles.count(t)} panels titled \"{t}\"")
            for t in titles:
                seen.setdefault(norm(t), set()).add(tab)
        for t, tabs in sorted(seen.items()):
            if len(tabs) > 1:
                info.append(f"{name} \"{t}\" appears in both tabs")
    return found, info


def rule_tab_order(res, reg, ctx):
    found = []
    for name, rec in block_recs(res, reg):
        for tab in ("settings", "styles"):
            snaps = {s: [p["title"] for p in tab_panels(rec, tab, s)] for s in SNAPSHOTS}
            ref = snaps["settled"]
            if not ref:
                continue
            for s in ("first", "revisit"):
                other = snaps[s]
                if not other:
                    continue
                if other != ref:
                    first_diff = next((i for i, (a, b) in enumerate(zip(ref, other)) if a != b), min(len(ref), len(other)))
                    found.append(f"{name} {tab} order differs on {s} from settled at position {first_diff + 1} ({ref[first_diff] if first_diff < len(ref) else '-'} vs {other[first_diff] if first_diff < len(other) else '-'})")
    return found, []


def rule_register_moves(res, reg, ctx):
    found = []
    for mv in reg.get("moves", []):
        rec = res.get("sgs/" + mv["block"])
        if not rec:
            continue
        dest = find_panels(rec, mv["tab"], mv["to"])
        if not dest:
            found.append(f"sgs/{mv['block']} {mv['tab']}: panel \"{mv['to']}\" is missing, so \"{mv['label']}\" has nowhere to sit")
            continue
        if not any(has_label(p, mv["label"]) for p in dest):
            found.append(f"sgs/{mv['block']} {mv['tab']}: \"{mv['label']}\" is not in \"{mv['to']}\"")
        if norm(mv["from"]) != norm(mv["to"]) or mv.get("from_tab", mv["tab"]) != mv["tab"]:
            for p in find_panels(rec, mv.get("from_tab", mv["tab"]), mv["from"]):
                if has_label(p, mv["label"]):
                    found.append(f"sgs/{mv['block']} {mv['tab']}: \"{mv['label']}\" is still in \"{mv['from']}\"")
    return found, []


def rule_panels_expect(res, reg, ctx):
    found = []
    for ex in reg.get("expect", []):
        rec = res.get("sgs/" + ex["block"])
        if not rec:
            continue
        ps = find_panels(rec, ex["tab"], ex["title"])
        if not ps:
            found.append(f"sgs/{ex['block']} {ex['tab']}: expected panel \"{ex['title']}\" is missing")
            continue
        for lab in ex.get("controls", []):
            if not any(has_label(p, lab) for p in ps):
                found.append(f"sgs/{ex['block']} {ex['tab']}: \"{ex['title']}\" does not hold \"{lab}\"")
    for g in reg.get("gone", []):
        rec = res.get("sgs/" + g["block"])
        if not rec:
            continue
        if find_panels(rec, g["tab"], g["title"]):
            found.append(f"sgs/{g['block']} {g['tab']}: panel \"{g['title']}\" is still there")
    return found, []


def whole_block_patterns():
    d = json.loads((DATA / "colour-whole-block.json").read_text(encoding="utf-8"))
    return [re.compile(p, re.I) for p in d["labels"]]


def is_whole_block_label(label, pats):
    # hover, active, focus and gradient partners sit with their base colour
    base = re.sub(r"\s*[\(\[]?(hover|active|focus|current|gradient|on hover)[\)\]]?\s*$", "", (label or "").strip(), flags=re.I)
    base = re.sub(r"\s*\(.*?\)\s*$", "", base).strip()
    return any(p.match(base) or p.match(label or "") for p in pats)


def rule_colour_main(res, reg, ctx):
    found, info = [], []
    pats = whole_block_patterns()
    for name, rec in block_recs(res, reg):
        slug = name.removeprefix("sgs/")
        if slug not in ctx["over12"]:
            continue
        mains = [p for p in deep_panels(rec, "styles") if p["title"] in COLOUR_TITLES and p["kind"] == "body"]
        if not mains:
            info.append(f"{name} has no main Colour panel ({ctx['over12'][slug]} base colours): right if no colour spans the block")
            continue
        main = mains[0]
        bad = [l for l in labels_of(main) if l and not is_whole_block_label(l, pats)]
        if bad:
            found.append(f"{name} main Colour panel holds {len(bad)} part colour(s): {', '.join(bad[:6])}{' ...' if len(bad) > 6 else ''}")
        if len(mains) > 1:
            info.append(f"{name} has {len(mains)} panels titled Colour (see repeated-titles)")
    return found, info


def rule_register_source(res, reg, ctx):
    """The register against a census taken before any change."""
    found = []
    for mv in reg.get("moves", []):
        rec = res.get("sgs/" + mv["block"])
        if not rec:
            continue
        ft = mv.get("from_tab", mv["tab"])
        src = find_panels(rec, ft, mv["from"])
        if not src:
            found.append(f"sgs/{mv['block']} {ft}: register's source panel \"{mv['from']}\" is not in the block today")
        elif not any(has_label(p, mv["label"]) for p in src):
            found.append(f"sgs/{mv['block']} {ft}: \"{mv['label']}\" is not in \"{mv['from']}\" today")
    for s in reg.get("stays", []):
        rec = res.get("sgs/" + s["block"])
        if rec and not any(find_panels(rec, tab, s["panel"]) for tab in ("settings", "styles")):
            found.append(f"sgs/{s['block']}: register's Stays panel \"{s['panel']}\" is not in the block today")
    return found, []


def rule_blind(res, reg, ctx):
    info = []
    for name, rec in block_recs(res, reg):
        if not rec.get("ok"):
            info.append(f"{name} could not be inserted")
        elif not rec.get("tabs") and not deep_panels(rec, "settings") and not deep_panels(rec, "styles"):
            info.append(f"{name} showed no tabs and no panels: the census read nothing")
    for b in reg["blocks"]:
        if "sgs/" + b not in res:
            info.append(f"sgs/{b} is not in the census")
    return [], info


FUNCS = {
    "lone-panels": rule_lone_panels, "repeated-titles": rule_repeated_titles, "tab-order": rule_tab_order,
    "register-moves": rule_register_moves, "panels-expect": rule_panels_expect, "colour-main": rule_colour_main,
    "register-source": rule_register_source, "blind": rule_blind,
}


def context():
    """The over-12 block list with each block's count, from check-colour-count.py's survey."""
    tmp = Path(tempfile.mkdtemp(prefix="cece3-")) / "cc.json"
    subprocess.run([sys.executable, "scripts/check-colour-count.py", "--survey", "--json", str(tmp)], cwd=PLUGIN, capture_output=True, check=False)
    over = {}
    if tmp.exists():
        over = {b: v["count"] for b, v in json.loads(tmp.read_text(encoding="utf-8"))["blocks"].items() if v.get("over")}
    return {"over12": over}


def census_e2_rule(rule, res):
    """The E2 detector's open-panels and colour-panel rules, loaded from check-editor-census.py."""
    spec = importlib.util.spec_from_file_location("check_editor_census", Path(__file__).resolve().parent / "check-editor-census.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    ctx = mod.context() if rule == "colour-panel" else {}
    return mod.FUNCS[rule](res, ctx)


def run(rule, owner, census, mode):
    res = load_census(census)
    reg = load_register(owner)
    ctx = context()
    rules = RULES if rule == "all" else (rule,)
    owned = {"sgs/" + b for b in reg["blocks"]}
    total = 0
    for r in rules:
        found, info = FUNCS[r](res, reg, ctx)
        print(f"[{r}] {len(found)} finding(s), {len(info)} note(s)")
        for f in found:
            print(f"  FINDING {f}")
        if mode == "survey":
            for i in info:
                print(f"  note    {i}")
        total += len(found)
    if rule == "all":
        mine = {k: v for k, v in res.items() if k in owned}
        found, info = census_e2_rule("open-panels", mine)
        print(f"[open-panels (check-editor-census.py)] {len(found)} finding(s), {len(info)} note(s)")
        for f in found:
            print(f"  FINDING {f}")
        total += len(found)
    return 1 if (mode == "check" and total) else 0


def self_test():
    fails = []

    def ok(label, cond):
        print(f"  {'PASS' if cond else 'FAIL'}  {label}")
        if not cond:
            fails.append(label)

    def ctl(*labels):
        return {"controls": [{"label": l} for l in labels]}

    def panel(title, *labels, kind="body", opened=False):
        return {"title": title, "kind": kind, "opened": opened, "read": ctl(*labels)}

    def rec(settings=None, styles=None, first=None, revisit=None):
        L = {}
        for tab, ps in (("settings", settings), ("styles", styles)):
            if ps is not None:
                titles = [{"title": p["title"], "kind": p["kind"], "opened": p["opened"]} for p in ps]
                L[f"{tab}_settled"] = titles
                L[f"{tab}_first"] = (first or {}).get(tab, titles)
                L[f"{tab}_revisit"] = (revisit or {}).get(tab, titles)
        return {"ok": True, "tabs": ["Settings", "Styles"], "L": L, "deep": {"settings": settings or [], "styles": styles or []}}

    reg = {"blocks": ["x"], "stays": [{"block": "x", "panel": "Lead"}], "shared": ["Size in row"],
           "moves": [{"block": "x", "label": "Sticky footer", "from": "Footer", "to": "Navigation", "tab": "settings"}],
           "expect": [{"block": "x", "tab": "settings", "title": "Navigation", "controls": ["Sticky footer"]}], "gone": [{"block": "x", "tab": "settings", "title": "Footer"}]}
    good = {"sgs/x": rec(settings=[panel("Navigation", "Back", "Sticky footer"), panel("Lead", "Switch", "More"), panel("Advanced", "A", kind="advanced")], styles=[panel("Colour", "Background", "Text colour (hover)")])}
    bad_lone = {"sgs/x": rec(settings=[panel("Footer", "Sticky footer"), panel("Navigation", "Back", "Next")])}
    ok("accepts a block with no lone panel", not rule_lone_panels(good, reg, {})[0])
    ok("CATCHES a one-control panel outside the register", len(rule_lone_panels(bad_lone, reg, {})[0]) == 1)
    stay = {"sgs/x": rec(settings=[panel("Lead", "Switch")])}
    f, i = rule_lone_panels(stay, reg, {})
    ok("a Stays row and a shared-extension panel are notes, not findings", not f and i)
    shared = {"sgs/x": rec(styles=[panel("Size in row", "Sizing")])}
    ok("a shared-extension lone panel is not the owner's finding", not rule_lone_panels(shared, reg, {})[0])
    adv = {"sgs/x": rec(settings=[panel("Advanced", "Anchor", kind="advanced"), panel("Two", "a", "b")])}
    ok("WordPress's Advanced panel is never lone", not rule_lone_panels(adv, reg, {})[0])
    dup = {"sgs/x": rec(styles=[panel("Colour", "a", "b"), panel("Colour", "c", "d")])}
    ok("CATCHES two panels with one title in a tab", len(rule_repeated_titles(dup, reg, {})[0]) == 1)
    both = {"sgs/x": rec(settings=[panel("Label", "a", "b")], styles=[panel("Label", "c", "d")])}
    f, i = rule_repeated_titles(both, reg, {})
    ok("one title in each tab is a note, not a finding", not f and i)
    ok("accepts distinct titles", not rule_repeated_titles(good, reg, {})[0])
    case = {"sgs/x": rec(styles=[panel("Add to cart button", "a", "b"), panel("Add to Cart button", "c", "d")])}
    ok("CATCHES two titles that differ only by case", len(rule_repeated_titles(case, reg, {})[0]) == 1)
    swapped = {"sgs/x": rec(settings=[panel("A", "a", "b"), panel("B", "c", "d")], first={"settings": [{"title": "B", "kind": "body", "opened": False}, {"title": "A", "kind": "body", "opened": False}]})}
    ok("CATCHES an order that changes between first select and settled", len(rule_tab_order(swapped, reg, {})[0]) == 1)
    ok("accepts a stable order", not rule_tab_order(good, reg, {})[0])
    ok("accepts a move that has landed and a gone panel that is gone", not rule_register_moves(good, reg, {})[0] and not rule_panels_expect(good, reg, {})[0])
    not_moved = {"sgs/x": rec(settings=[panel("Footer", "Sticky footer", "x"), panel("Navigation", "Back", "Next")])}
    f, _ = rule_register_moves(not_moved, reg, {})
    ok("CATCHES a control that did not leave its old panel and is missing from the new one", len(f) == 2)
    ok("CATCHES a gone panel that is still there", len(rule_panels_expect(not_moved, reg, {})[0]) >= 2)
    ctx = {"over12": {"x": 40}}
    ok("accepts a main Colour panel of whole-block colours (with a hover form)", not rule_colour_main(good, reg, ctx)[0])
    part = {"sgs/x": rec(styles=[panel("Colour", "Background", "Badge background", "Icon colour")])}
    ok("CATCHES a part colour in the main Colour panel of a block over 12", len(rule_colour_main(part, reg, ctx)[0]) == 1)
    ok("a block 12 or under is left to the kit rule", not rule_colour_main(part, reg, {"over12": {}})[0])
    none_main = {"sgs/x": rec(styles=[panel("Badge colour", "Badge background", "Badge text")])}
    ok("a block over 12 with no main Colour panel is a note", not rule_colour_main(none_main, reg, ctx)[0] and rule_colour_main(none_main, reg, ctx)[1])
    before = {"sgs/x": rec(settings=[panel("Footer", "Sticky footer"), panel("Lead", "Switch")])}
    ok("register-source accepts a register that matches the block today", not rule_register_source(before, reg, {})[0])
    wrong = {"sgs/x": rec(settings=[panel("Footer", "Something else"), panel("Lead", "Switch")])}
    ok("register-source CATCHES a register row whose control is not where it says", len(rule_register_source(wrong, reg, {})[0]) == 1)
    miss = {"sgs/y": rec(settings=[panel("A", "a", "b")])}
    ok("blind reports a block the census lacks", rule_blind(miss, reg, {})[1])
    print("\n[check-editor-census-e3 --self-test] " + ("ALL ASSERTIONS PASS." if not fails else f"{len(fails)} FAILURE(S)."))
    return 0 if not fails else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("rule", nargs="?", choices=list(ALL_RULES) + ["all"])
    ap.add_argument("--owner")
    ap.add_argument("--census")
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not a.rule or not a.census or not a.owner or not (a.survey or a.check):
        ap.print_usage()
        return 2
    return run(a.rule, a.owner, a.census, "check" if a.check else "survey")


if __name__ == "__main__":
    sys.exit(main())
