#!/usr/bin/env python3
"""Every CONTROL INSTANCE in the library, for every media-atom attribute.

WHY THIS EXISTS
---------------
The media atoms are meant to ship the BEST control in the library for each
concept, not a fresh simplification. Deciding that needs the FULL population of
existing implementations - and a hand-written list of "the media blocks" is not
that population. Measured 2026-08-31: a hand-picked survey missed
`sgs/brand-strip` (logoFit) and `sgs/trust-bar` (badgeImageObjectFit) outright,
and a concept-level search seeded from a known-sites list is the same failure
one level up.

So the population is DERIVED, two independent ways, and the DISAGREEMENT between
them is itself an output:

  A. NAME side - every attribute in every src/blocks/*/block.json whose name
     ends with one of the atom's bases (any prefix). Sees block-declared attrs.
  B. PROPERTY side - every DB row whose css_property expresses the concept.
     Sees attributes reachable through an EXTENSION, which the name scan cannot.

Neither alone is complete, which is the point. `sgs/before-after` carries
object-fit via `supports.sgs.imageControls`, so it shows on the PROPERTY side
and not the NAME side; the DB in turn only knows attributes someone seeded.

This script REPORTS CANDIDATES for a reader to judge. It does not decide which
control is best - that needs reading the code.

USAGE
    python scripts/surveys/census-media-control-instances.py
    python scripts/surveys/census-media-control-instances.py --json
    python scripts/surveys/census-media-control-instances.py --atom overlay
    python scripts/surveys/census-media-control-instances.py --self-test
"""
import argparse
import io
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(os.path.dirname(HERE))  # surveys/ -> scripts/ -> sgs-blocks/
BLOCKS = os.path.join(PLUGIN, "src", "blocks")
ATOMS = os.path.join(PLUGIN, "src", "components", "media", "atoms")
MEC = os.path.join(PLUGIN, "src", "components", "MediaElementControls.js")
DB = os.path.expanduser("~/.claude/skills/sgs-wp-engine/sgs-framework.db")

# Concept -> CSS properties that express it, for the PROPERTY-side derivation.
# Held here rather than in the JS so this runs with no build step; the atom ids
# themselves are read from registry.js and never hardcoded.
CONCEPT_PROPS = {
    "object-fit": ["object-fit", "background-size"],
    "focal-point": ["object-position", "background-position",
                    "background-repeat", "background-attachment"],
    "box-shape": ["height", "width", "min-height", "max-width", "max-height",
                  "aspect-ratio", "clip-path"],
    "overlay": ["background-color", "background-image", "opacity",
                "mix-blend-mode"],
    "source": ["background-image"],
    "svg-presentation": ["z-index", "opacity", "text-shadow", "min-height"],
    "intrinsic": ["width", "height"],
    "meaning": [],
    "media-type": [],
    "video-behaviour": [],
}

PRIMITIVES = [
    "ToggleControl", "CheckboxControl", "SelectControl", "TextControl",
    "TextareaControl", "RangeControl", "UnitControl", "SgsLengthControl",
    "ToggleGroupControl", "FocalPointPicker", "FocalPositionField",
    "MediaPicker", "MediaUpload", "DesignTokenPicker", "SgsColourPanel",
    "GradientCapableColourControl", "BooleanResponsiveControl",
    "ResponsiveTriStateControl", "ResponsiveControl", "ResponsiveOverride",
    "NumberControl", "ColorPalette", "ShadowControl", "SgsBorderControl",
]


def read(path):
    with io.open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def atom_bases():
    """atom id -> its bases, read from the real modules. Never hardcoded."""
    mec = read(MEC)
    start = mec.index("export const MEDIA_BASES")
    end = mec.index("export const MEDIA_TIERED_BASES")
    groups = {}
    for gm in re.finditer(r"(\w+):\s*\[([^\]]*)\]", mec[start:end]):
        groups[gm.group(1)] = re.findall(r"'([A-Za-z]+)'", gm.group(2))

    reg = read(os.path.join(ATOMS, "registry.js"))
    out = {}
    for am in re.finditer(r"id: '([a-z-]+)',\s*\n\s*bases: MEDIA_BASES\.(\w+)", reg):
        out[am.group(1)] = groups.get(am.group(2), [])
    return out


def block_attributes():
    """block slug -> its declared attributes, from every block.json."""
    out = {}
    if not os.path.isdir(BLOCKS):
        return out
    for name in sorted(os.listdir(BLOCKS)):
        bj = os.path.join(BLOCKS, name, "block.json")
        if not os.path.isfile(bj):
            continue
        try:
            data = json.loads(read(bj))
        except ValueError:
            continue
        out[data.get("name") or ("sgs/" + name)] = {
            "dir": name,
            "attrs": data.get("attributes", {}) or {},
        }
    return out


def db_rows(props):
    """PROPERTY-side derivation. Read-only; an absent DB is reported, not fatal."""
    if not props or not os.path.exists(DB):
        return []
    uri = "file:" + DB.replace(os.sep, "/") + "?mode=ro"
    try:
        con = sqlite3.connect(uri, uri=True)
    except sqlite3.Error:
        return []
    try:
        marks = ",".join("?" * len(props))
        cur = con.execute(
            "SELECT block_slug, attr_name, css_property, css_element, css_tier "
            "FROM block_attributes WHERE css_property IN (" + marks + ")", props)
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, r)) for r in cur]
    except sqlite3.Error:
        return []
    finally:
        con.close()


def controls_for(block_dir, attr):
    """Control primitives sitting near this attribute in the block's editor.

    A heuristic ON PURPOSE, and it says so: it reports CANDIDATES to read, never
    a verdict. It walks the block's whole directory, because shared panels are
    often mounted from a block-private components dir - BackgroundPanel and
    ContainerWrapperControls both live under src/blocks/container/components/,
    not src/components/, which is this track's recurring blind spot.
    """
    found = set()
    root = os.path.join(BLOCKS, block_dir)
    for dirpath, _dirs, files in os.walk(root):
        for fn in files:
            if not fn.endswith(".js"):
                continue
            src = read(os.path.join(dirpath, fn))
            if attr not in src:
                continue
            for prim in PRIMITIVES:
                if ("<" + prim) in src or (prim + "(") in src:
                    found.add(prim)
    return sorted(found)


def survey(only_atom=None):
    bases = atom_bases()
    blocks = block_attributes()
    report = {"meta": {"blocks_scanned": len(blocks),
                       "db_present": os.path.exists(DB)}, "atoms": {}}

    for atom, base_list in bases.items():
        if only_atom and atom != only_atom:
            continue
        entry = {"bases": {}, "zero_hit_bases": [],
                 "property_side": [], "property_only": [], "name_only": []}
        name_blocks = set()

        # PROPERTY-side first, so the name side can use it to disambiguate.
        rows_early = db_rows(CONCEPT_PROPS.get(atom, []))
        prop_blocks_early = {r["block_slug"] for r in rows_early}

        for base in base_list:
            lower = base[0].lower() + base[1:]
            hits = []
            weak = []
            for slug, info in blocks.items():
                for attr in info["attrs"]:
                    exact = attr == lower
                    suffix = attr.endswith(base) and not exact
                    if not exact and not suffix:
                        continue
                    # ⛔ A SUFFIX MATCH ALONE OVERMATCHES, and short generic bases
                    # are where it bites: `Size` catches fontSize/iconSize,
                    # `Height` catches lineHeight, `Position` catches
                    # backgroundPosition on a block with no media at all. The
                    # negative control in --self-test caught exactly this
                    # (sgs/collapsible-text arriving under object-fit).
                    #
                    # So a suffix match is only STRONG when the DB independently
                    # puts this block on the concept. Everything else is reported
                    # as AMBIGUOUS for a reader to judge - visible, not silently
                    # dropped and not silently counted.
                    strong = exact or (slug in prop_blocks_early)
                    target = hits if strong else weak
                    target.append({
                        "block": slug,
                        "attr": attr,
                        "type": info["attrs"][attr].get("type"),
                        "match": "exact" if exact else
                                 ("suffix+db" if strong else "suffix-only"),
                        "controls": controls_for(info["dir"], attr),
                    })
                    if strong:
                        name_blocks.add(slug)
            entry["bases"][base] = hits
            entry.setdefault("ambiguous", {})[base] = weak
            if not hits:
                entry["zero_hit_bases"].append(base)

        entry["property_side"] = rows_early
        prop_blocks = prop_blocks_early
        entry["property_only"] = sorted(prop_blocks - name_blocks)
        entry["name_only"] = sorted(name_blocks - prop_blocks)
        report["atoms"][atom] = entry
    return report


def render(report):
    out = ["MEDIA CONTROL-INSTANCE CENSUS",
           "  blocks scanned: %d   DB present: %s"
           % (report["meta"]["blocks_scanned"], report["meta"]["db_present"]), ""]
    for atom, e in report["atoms"].items():
        total = sum(len(v) for v in e["bases"].values())
        blocks = sorted({h["block"] for v in e["bases"].values() for h in v})
        out.append("=" * 78)
        out.append("ATOM %s  -  %d instance(s) across %d block(s)"
                   % (atom, total, len(blocks)))
        for base, hits in e["bases"].items():
            if not hits:
                continue
            out.append("  " + base)
            for h in hits:
                out.append("      %-24s %-30s %s"
                           % (h["block"], h["attr"],
                              ", ".join(h["controls"]) or "(no primitive found)"))
        if e["zero_hit_bases"]:
            out.append("  ZERO-HIT (a claim, not a result - verify by a second "
                       "method): " + ", ".join(e["zero_hit_bases"]))
        if e["property_only"]:
            out.append("  PROPERTY-SIDE ONLY (the name scan CANNOT see these; "
                       "usually extension-provided): " + ", ".join(e["property_only"]))
    return "\n".join(out)


def self_test():
    fails = []
    bases = atom_bases()
    if len(bases) != 10:
        fails.append("expected 10 atoms from registry.js, got %d" % len(bases))
    total = sum(len(v) for v in bases.values())
    if total != 59:
        fails.append("expected 59 bases, got %d" % total)
    if len(block_attributes()) < 50:
        fails.append("fewer than 50 blocks scanned - the block scan is broken")

    rep = survey()
    of = rep["atoms"].get("object-fit", {})
    hit_blocks = {h["block"] for v in of.get("bases", {}).values() for h in v}

    # POSITIVE CONTROL: the two blocks a hand-written survey missed must appear.
    for want in ("sgs/brand-strip", "sgs/trust-bar"):
        if want not in hit_blocks:
            fails.append("POSITIVE CONTROL FAILED: %s missing from object-fit" % want)

    # NEGATIVE CONTROL: a block with no media must not be swept in.
    if "sgs/collapsible-text" in hit_blocks:
        fails.append("NEGATIVE CONTROL FAILED: overmatched sgs/collapsible-text")

    # The two derivations must differ SOMEWHERE, or one of them is not running
    # and the census is silently single-sourced.
    if not any(rep["atoms"][a]["property_only"] for a in rep["atoms"]):
        fails.append("no property-only block anywhere - the DB side is probably "
                     "not running, so this census is single-sourced")

    for f in fails:
        print("  FAIL " + f)
    print("%s - 6 check(s), incl. positive + negative controls"
          % ("PASS" if not fails else "FAIL"))
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--atom")
    ap.add_argument("--self-test", action="store_true", dest="selftest")
    args = ap.parse_args()
    if args.selftest:
        return self_test()
    rep = survey(args.atom)
    print(json.dumps(rep, indent=1) if args.json else render(rep))
    return 0


if __name__ == "__main__":
    sys.exit(main())
