#!/usr/bin/env python3
"""check-colour-count.py - counts every block's base colours and checks where the two kits' colour rows sit.

Stage E2 item 4 and Stage E3. A block with 12 or fewer base colours has ONE Colour panel and the button kit's and the
carousel dots kit's colour rows join it; a block over 12 keeps each part's colours in that part's own panel (Bean, 2026-11-25),
so the main Colour panel holds only whole-block colours (background, text, heading, link).

Base colour count (per block): the attributes the block ships in block.json whose framework-DB `block_attributes` row has a colour
role (`color`, `colour-text`, `colour-background`) and no `css_state`. A hover, active, current, focus, open or checked version
has a `css_state`, so it is not counted apart from its base; a `colour-gradient` partner (the `...Gradient` attribute beside a
colour) is not counted apart from its colour. Border, shadow and stroke colours count (a colour attribute is a colour attribute);
the "panel" basis leaves them out, because Bean's 2026-09-07 rule keeps them in their own composite controls. Kit-generated
attributes (`_generated`: button-kit, carousel-dots) count, because they decide where the kit rows go.

USAGE (from plugins/sgs-blocks)
  python scripts/check-colour-count.py --survey [--json out.json] [--basis all|panel]
  python scripts/check-colour-count.py --check [--basis all|panel] [--stage kits|whole-block|all]
  python scripts/check-colour-count.py --self-test

--check stages: `kits` (Stage E2: the kit bodies mount no SgsColourPanel, every kit declaration has `showWhen`, every kit block with
12 or fewer colours feeds its main Colour panel), `whole-block` (Stage E3: on a block over 12, the main Colour panel's readable
rows are whole-block colours); `all` is both, the default. Rows are read statically by scripts/lib/colour-panel-rows.js; a row it
cannot read (a spread builder call, an expression) is counted as unread, not as a finding: the editor census is the final proof.
The whole-block patterns live in scripts/data/colour-whole-block.json.
"""
import argparse
import json
import re
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from framework_db import framework_db_path  # noqa: E402

DB = framework_db_path()
SRC = PLUGIN / "src"
WHOLE = Path(__file__).resolve().parent / "data" / "colour-whole-block.json"
LIMIT = 12
COLOUR_ROLES = ("color", "colour-text", "colour-background")
NOT_PANEL = re.compile(r"border|shadow|stroke")
KIT_BODIES = (
    "src/components/button-kit/BuiltinButtonPanelBody.js",
    "src/components/carousel-dots/CarouselDotsPanelBody.js",
)
HELPERS = ("builtinButtonColourRows", "carouselDotsColourRows", "carouselControlsColourRows")


def block_dirs(src: Path):
    for group in ("blocks", "commerce-blocks"):
        root = src / group
        if root.is_dir():
            for d in sorted(root.iterdir()):
                if (d / "block.json").is_file() and d.name != "extensions":
                    yield d


def read_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def db_colours(db_path: Path):
    """{ 'sgs/x': { attr: (role, css_property, css_state) } } for colour-role rows."""
    con = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    out = {}
    for slug, attr, role, prop, state in con.execute(
        "SELECT block_slug, attr_name, role, COALESCE(css_property,''), css_state FROM block_attributes "
        "WHERE block_slug LIKE 'sgs/%' AND role IN (?,?,?,?)",
        COLOUR_ROLES + ("colour-gradient",),
    ):
        out.setdefault(slug, {})[attr] = (role, prop, state)
    con.close()
    return out


def count_block(attrs: dict, rows: dict, basis: str):
    """(count, kit_count, db_only) for one block: attrs = block.json attributes, rows = DB colour rows for the block."""
    n = kit = 0
    for name, (role, prop, state) in rows.items():
        if role not in COLOUR_ROLES or state is not None or name not in attrs:
            continue
        if basis == "panel" and NOT_PANEL.search(prop):
            continue
        n += 1
        gen = attrs[name].get("_generated") if isinstance(attrs[name], dict) else None
        if gen in ("button-kit", "carousel-dots"):
            kit += 1
    db_only = sum(1 for name, (role, _p, state) in rows.items() if role in COLOUR_ROLES and state is None and name not in attrs)
    return n, kit, db_only


def registry_default_groups(src: Path):
    try:
        return read_json(src / "components" / "button-kit" / "registry.json").get("defaultGroups", [])
    except OSError:
        return []


def kit_entries(sgs: dict, default_groups):
    """Declared kit entries of one block: [{ kit, prefix, label, groups, colourRows, showWhen }]."""
    out = []
    for e in sgs.get("builtinButtons") or []:
        groups = e.get("groups") or default_groups
        rows = 0
        if "colour" in groups:
            rows = 2 + (0 if "border" in groups else 1)
        out.append({"kit": "builtinButtons", "prefix": e.get("prefix"), "label": e.get("label"), "groups": groups, "colourRows": rows, "showWhen": e.get("showWhen")})
    d = sgs.get("carouselDots")
    if isinstance(d, dict):
        out.append({"kit": "carouselDots", "prefix": d.get("prefix"), "label": d.get("label"), "groups": None, "colourRows": 2, "showWhen": d.get("showWhen")})
    return out


def php_files(slug: str, block_dir: Path, plugin: Path):
    files = sorted(block_dir.rglob("*.php"))
    inc = plugin / "includes"
    if inc.is_dir():
        files += sorted(p for p in inc.rglob("*.php") if slug.replace("-", "") in p.as_posix().replace("-", "").replace("_", "").lower())
    return files


def gate_hints(slug: str, block_dir: Path, plugin: Path, entry: dict):
    """Up to three PHP conditions that enclose the kit's CSS call or its prefix in the block's PHP: where the real gate is."""
    needle = "sgs_carousel_controls_css(" if entry["kit"] == "carouselDots" or entry["prefix"] in ("arrow", "dot") else f"'{entry['prefix']}'"
    hints = []
    for f in php_files(slug, block_dir, plugin) + ([plugin / "includes" / "class-sgs-container-wrapper.php"] if slug == "container" else []):
        lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
        for i, line in enumerate(lines):
            if needle not in line or line.lstrip().startswith(("//", "*")):
                continue
            indent = len(line) - len(line.lstrip("\t "))
            for j in range(i - 1, max(i - 80, -1), -1):
                m = re.match(r"^([\t ]*)(?:\}\s*)?(?:else)?if\s*\((.*)", lines[j])
                if m and len(m.group(1)) < indent and "function_exists" not in m.group(2):
                    hints.append({"file": f.relative_to(plugin).as_posix(), "condition": m.group(2).strip().rstrip("{").strip()[:140]})
                    break
            if len(hints) >= 3:
                return hints
    return hints


def run_rows(plugin: Path):
    proc = subprocess.run(["node", str(plugin / "scripts" / "lib" / "colour-panel-rows.js")], capture_output=True, text=True, encoding="utf-8", cwd=plugin)
    if proc.returncode:
        raise RuntimeError(proc.stderr)
    return json.loads(proc.stdout)


def whole_patterns():
    data = read_json(WHOLE) if WHOLE.is_file() else {"attributes": [], "labels": []}
    return [re.compile(p, re.I) for p in data.get("attributes", [])], [re.compile(p, re.I) for p in data.get("labels", [])]


def row_is_whole_block(row: dict, attr_pats, label_pats):
    if row.get("base"):
        return any(p.search(row["base"]) for p in attr_pats)
    text = " ".join(x for x in (row.get("key"), row.get("label")) if x)
    return bool(text) and any(p.search(text) for p in label_pats)


def survey(plugin: Path = PLUGIN, db_path: Path = DB, basis: str = "all", rows_data: dict | None = None):
    src = plugin / "src"
    colours = db_colours(db_path)
    rows_data = rows_data if rows_data is not None else run_rows(plugin)
    defaults = registry_default_groups(src)
    blocks = {}
    for d in block_dirs(src):
        j = read_json(d / "block.json")
        attrs = j.get("attributes", {})
        slug = d.name
        n_all, kit_all, db_only = count_block(attrs, colours.get(f"sgs/{slug}", {}), "all")
        n_panel, kit_panel, _ = count_block(attrs, colours.get(f"sgs/{slug}", {}), "panel")
        name_count = sum(1 for a in attrs if re.search(r"colou?r", a, re.I) and not re.search(r"Hover|Active|Focus|Current|Gradient", a))
        sgs = (j.get("supports") or {}).get("sgs") or {}
        entries = kit_entries(sgs, defaults)
        rec = rows_data["blocks"].get(slug, {"panels": [], "kitMounts": []})
        mounted = {(k["kit"], k["prefix"]) for k in rec["kitMounts"]}
        for e in entries:
            e["mounted"] = (e["kit"], e["prefix"]) in mounted
            e["gateHints"] = gate_hints(slug, d, plugin, e)
        count = n_all if basis == "all" else n_panel
        edit_text = "\n".join(p.read_text(encoding="utf-8", errors="replace") for p in d.rglob("*.js"))
        blocks[slug] = {
            "count": count,
            "countAll": n_all,
            "countPanel": n_panel,
            "kitGenerated": kit_all,
            "nameBasedLegacy": name_count,
            "dbOnly": db_only,
            "over": count > LIMIT,
            "kits": entries,
            "mainPanels": [{"file": p["file"], "rowsFrom": p.get("rowsFrom"), "rows": p["rows"]} for p in rec["panels"]],
            "usesKitHelpers": [h for h in HELPERS if h in edit_text],
        }
    return {"basis": basis, "limit": LIMIT, "blocks": blocks, "kitBodies": rows_data["kitBodies"]}


def findings(s: dict, stage: str = "all"):
    out = []
    attr_pats, label_pats = whole_patterns()
    if stage in ("kits", "all"):
        for f, info in s["kitBodies"].items():
            if info["colourPanelMounts"]:
                out.append({"block": "(kit)", "kind": "kit mounts its own Colour panel", "detail": f"{f} mounts SgsColourPanel {info['colourPanelMounts']} time(s): export the rows and let the block pass them to its main Colour panel"})
        for slug, b in s["blocks"].items():
            for e in b["kits"]:
                if e["showWhen"] is None:
                    out.append({"block": slug, "kind": "kit has no showWhen", "detail": f"{e['kit']} '{e['prefix']}' declares no showWhen (the PHP gate mirrored once in block.json)"})
            if b["kits"] and not b["over"] and any(e["mounted"] for e in b["kits"]) and not b["usesKitHelpers"]:
                out.append({"block": slug, "kind": "kit rows not in the main Colour panel", "detail": f"{b['count']} base colours (12 or fewer) but no file in the block uses {' / '.join(HELPERS)}"})
    if stage in ("whole-block", "all"):
        for slug, b in s["blocks"].items():
            if not b["over"]:
                continue
            for p in b["mainPanels"]:
                for r in p["rows"]:
                    if r["via"] == "unreadable" or (r["base"] is None and not r["key"] and not r["label"]):
                        continue
                    if not row_is_whole_block(r, attr_pats, label_pats):
                        out.append({"block": slug, "kind": "part colour in the main Colour panel", "detail": f"{p['file']}: row '{r['key'] or r['label']}' ({r['base'] or 'attribute not literal'}) is not a whole-block colour; {b['count']} base colours, so it belongs in its part's panel"})
    return out


def render(s: dict):
    blocks = s["blocks"]
    over = sorted(((b["count"], k) for k, b in blocks.items() if b["over"]), reverse=True)
    other = "panel" if s["basis"] == "all" else "all"
    lines = [f"Base colours per block (basis: {s['basis']}); {len(blocks)} blocks; over {s['limit']}: {len(over)}"]
    for n, k in over:
        b = blocks[k]
        lines.append(f"  {k}: {n} (all {b['countAll']}, panel {b['countPanel']}, name-only legacy {b['nameBasedLegacy']})")
    kit = [(k, b) for k, b in sorted(blocks.items()) if b["kits"]]
    lines.append(f"Kit blocks: {len(kit)}; with 12 or fewer on this basis: " + ", ".join(k for k, b in kit if not b["over"]))
    return "\n".join(lines)


def self_test():
    failures = []

    def ok(label, cond):
        print(f"  {'PASS' if cond else 'FAIL'}  {label}")
        if not cond:
            failures.append(label)

    print("[check-colour-count --self-test]\n")
    attrs = {
        "backgroundColour": {"type": "string"},
        "backgroundColourHover": {"type": "string"},
        "backgroundColourGradient": {"type": "string"},
        "borderColour": {"type": "string"},
        "dotColour": {"type": "string", "_generated": "carousel-dots"},
    }
    rows = {
        "backgroundColour": ("color", "background-color", None),
        "backgroundColourHover": ("color", "background-color", "hover"),
        "backgroundColourGradient": ("colour-gradient", "background-image", None),
        "borderColour": ("color", "border-color", None),
        "dotColour": ("color", "background-color", None),
        "ghost": ("color", "color", None),
    }
    ok("a hover version and a gradient partner are not counted apart", count_block(attrs, rows, "all")[0] == 3)
    ok("the panel basis leaves out border colours", count_block(attrs, rows, "panel")[0] == 2)
    ok("kit-generated colours are counted and reported", count_block(attrs, rows, "all")[1] == 1)
    ok("a DB colour the block does not ship is reported, not counted", count_block(attrs, rows, "all")[2] == 1)
    ok("a carousel dots declaration is read with its two rows", kit_entries({"carouselDots": {"prefix": "dot", "label": "Dots"}}, [])[0]["colourRows"] == 2)
    ok("a button entry with a border group has two colour rows, without one has three", [e["colourRows"] for e in kit_entries({"builtinButtons": [{"prefix": "a", "groups": ["colour", "border"]}, {"prefix": "b", "groups": ["colour"]}]}, [])] == [2, 3])
    ok("showWhen is read from a declaration", kit_entries({"builtinButtons": [{"prefix": "a", "showWhen": {"attr": "x"}}]}, ["colour"])[0]["showWhen"] == {"attr": "x"})

    def mk(count, over, rows_in_panel, kit_mounts_own=0, show_when=None, helper=False, mounted=True):
        return {
            "basis": "all",
            "limit": 12,
            "kitBodies": {"src/components/button-kit/BuiltinButtonPanelBody.js": {"colourPanelMounts": kit_mounts_own}},
            "blocks": {
                "x": {
                    "count": count, "over": over,
                    "kits": [{"kit": "builtinButtons", "prefix": "arrow", "mounted": mounted, "showWhen": show_when}],
                    "mainPanels": [{"file": "src/blocks/x/edit.js", "rows": rows_in_panel}],
                    "usesKitHelpers": list(HELPERS[:1]) if helper else [],
                }
            },
        }

    whole = [{"key": "background", "label": "Background", "base": "backgroundColour", "via": "fillRow"}, {"key": "text", "label": "Text", "base": "textColour", "via": "fillRow"}]
    part = [{"key": "tabHover", "label": "Tab hover", "base": "tabColourHover", "via": "literal"}]
    kinds = lambda s: {f["kind"] for f in findings(s)}
    ok("CATCHES a kit body that still mounts its own Colour panel", "kit mounts its own Colour panel" in kinds(mk(8, False, whole, kit_mounts_own=1, show_when={"a": 1}, helper=True)))
    ok("CATCHES a kit declaration with no showWhen", "kit has no showWhen" in kinds(mk(8, False, whole, helper=True)))
    ok("CATCHES a block of 12 or fewer that does not feed the main panel", "kit rows not in the main Colour panel" in kinds(mk(8, False, whole, show_when={"a": 1})))
    ok("CATCHES a part colour in the main panel of a block over 12", "part colour in the main Colour panel" in kinds(mk(40, True, whole + part, show_when={"a": 1})))
    ok("ACCEPTS a clean block of 12 or fewer", not findings(mk(8, False, whole, show_when={"a": 1}, helper=True)))
    ok("ACCEPTS whole-block rows on a block over 12", not findings(mk(40, True, whole, show_when={"a": 1})))
    ok("does not hold a block over 12 to the feed-the-panel rule", "kit rows not in the main Colour panel" not in kinds(mk(40, True, whole, show_when={"a": 1})))
    print(f"\n[check-colour-count --self-test] {'ALL ASSERTIONS PASS.' if not failures else str(len(failures)) + ' FAILURE(S).'}")
    return 0 if not failures else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--json")
    ap.add_argument("--basis", choices=("all", "panel"), default="all")
    ap.add_argument("--stage", choices=("kits", "whole-block", "all"), default="all")
    a = ap.parse_args()
    if a.self_test:
        sys.exit(self_test())
    if not (a.survey or a.check):
        ap.print_usage()
        sys.exit(2)
    s = survey(basis=a.basis)
    f = findings(s, a.stage)
    if a.survey:
        print(render(s))
        print(f"\nFindings now (stage {a.stage}): {len(f)}")
        if a.json:
            Path(a.json).write_text(json.dumps({**s, "findings": f}, indent=2), encoding="utf-8")
        sys.exit(0)
    for x in f:
        print(f"[{x['block']}] {x['kind']}: {x['detail']}")
    print(f"\n[check-colour-count] {'OK' if not f else str(len(f)) + ' finding(s)'}")
    sys.exit(1 if f else 0)


if __name__ == "__main__":
    main()
