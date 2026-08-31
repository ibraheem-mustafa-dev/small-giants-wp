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
CENSUS = os.path.join(PLUGIN, "..", "..", "reports", "migrations",
                      "media-element-census.json")


def in_scope_surfaces():
    """Blocks that carry a real media atom. DERIVED, never a typed list.

    ⛔ The census file hardcodes six surfaces, and that list is INCOMPLETE.
    Measured 2026-08-31: TWENTY blocks carry at least one non-generic media
    atom. `sgs/trust-bar` carries five - as many as `sgs/hero` - and is absent
    from the census entirely, as are `site-header` and `site-footer` with four
    each. The architecture already recorded the direction at v2 section 11b:
    brand-strip and trust-bar were "missed outright... a standing correction to
    the census's population". This function follows that correction through.

    GENERIC ATOMS ARE EXCLUDED FROM THE TEST, not from the report. `box-shape`
    and `intrinsic` own bases named Height, Width, MaxWidth and ImageHeight,
    which every block with a width control matches. Judged on those, 61 blocks
    look like media surfaces, including every form field. A block qualifies on
    a DISCRIMINATING atom - one whose bases only appear on real media - and
    then its box-shape instances are reported too.

    `--census-scope` restores the census file's six, for comparing against it.
    """
    return None  # sentinel: computed in survey(), which has the scan available


GENERIC_ATOMS = ("box-shape", "intrinsic")


def census_file_surfaces():
    """The six the census file names. Kept for comparison, not as the default."""
    try:
        data = json.loads(read(CENSUS))
    except (IOError, OSError, ValueError):
        return set()
    return set((data.get("surfaces") or {}).keys())


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


BACKDROP_PREFIXES = ("bg", "background")

# Bases that belong to an atom's BACKDROP vocabulary. `Size` is
# background-size; Position/Repeat/Attachment are the background-* family. They
# describe a painted box, never a nested element, so they must not qualify a
# block as a media surface - `sgs/nav-drawer` qualified on `panelSize` until
# this list existed. They are still REPORTED once a block qualifies otherwise.
BACKDROP_BASES = ("Size", "Position", "Repeat", "Attachment")


def is_backdrop_attr(attr):
    """Is this attribute a painted BACKGROUND rather than a nested element?

    ⛔ THIS IS THE DISTINCTION THAT DEFINES THE POPULATION, and getting it wrong
    inflates the set by a factor of two. A block with a background image, video,
    SVG or overlay is NOT a media surface: it gets all of that from the shared
    `BackgroundPanel` and the container wrapper, which is a genuine shared
    container concern and is already standardised. NINE blocks mount that panel
    - container, cta-section, hero, multi-button, nav-drawer, physics-canvas,
    site-footer, site-header, trust-bar - and counting them as media surfaces
    put site-header and site-footer in a media-element migration they have
    nothing to do with.

    The media-ELEMENT work is about a block with a NESTED element that IS media:
    an <img>, <video> or inline <svg> rendered as content.
    """
    a = attr.lower()
    # CONTAINS, not starts-with. `linkHoverBackgroundImage` and
    # `accentBackgroundImage` are backgrounds that do not begin with the word,
    # and a prefix test let both qualify their blocks as media surfaces.
    return (a.startswith(BACKDROP_PREFIXES) or a.startswith("overlay")
            or "background" in a)


def derive_media_blocks(bases, blocks):
    """Blocks with a NESTED media element, plus the one that owns the backdrop.

    Qualifies on the STRONG test (exact base match, or a suffix match the DB
    independently places on the concept) AND on the attribute being a nested
    element rather than a background.

    `sgs/container` is admitted deliberately: it OWNS the background mechanism
    the other eight inherit, and the atoms carry a `backdrop` scope for exactly
    that. A host that merely mounts its panel does not qualify.

    Measured: 8 blocks. The census file names 6; the two it misses are
    `sgs/trust-bar` (badge images) and `sgs/brand-strip` (logos) - precisely the
    pair architecture v2 section 11b already recorded as a standing correction
    to the census's population.
    """
    qualifying = {"sgs/container"}
    for atom, base_list in bases.items():
        if atom in GENERIC_ATOMS:
            continue
        prop_rows = db_rows(CONCEPT_PROPS.get(atom, []))
        prop_blocks = {r["block_slug"] for r in prop_rows}
        # PROPERTY side can name an attribute the NAME side cannot see at all -
        # brand-strip's `logoFit` carries css_property object-fit but ends in
        # neither base, so only this branch finds it.
        #
        # ⛔ ONLY the REPLACED-ELEMENT properties may qualify a block here.
        # object-fit and object-position are meaningless on anything that is not
        # an <img> or <video>, so their presence IS evidence of a nested media
        # element. The other concept properties are not: `overlay` lists opacity
        # and background-color, which qualified 40 blocks - every block with an
        # opacity attribute - until the negative control caught it.
        for r in prop_rows:
            if r["css_property"] not in ("object-fit", "object-position"):
                continue
            if not is_backdrop_attr(r["attr_name"] or ""):
                qualifying.add(r["block_slug"])
        for base in base_list:
            lower = base[0].lower() + base[1:]
            if base in BACKDROP_BASES:
                continue
            for slug, info in blocks.items():
                for attr in info["attrs"]:
                    if is_backdrop_attr(attr):
                        continue
                    if attr == lower or (attr.endswith(base) and slug in prop_blocks):
                        qualifying.add(slug)
    # The census records WHY three media-ish blocks are out of scope, each with
    # a reason: responsive-logo is already better than the shared shape,
    # info-box's media attrs are dead legacy from the FR-22-6 migration, and
    # image-sequence is an agency-only frame rig. Honour that rather than
    # re-litigating it here - and read it from the file so it follows the
    # decision instead of drifting from it.
    try:
        excluded = set((json.loads(read(CENSUS)).get("excluded") or {}).keys())
    except (IOError, OSError, ValueError):
        excluded = set()
    return (qualifying - excluded) & set(blocks)


def survey(only_atom=None, scoped=True, census_scope=False):
    bases = atom_bases()
    blocks = block_attributes()
    if census_scope:
        scope = census_file_surfaces()
    elif scoped:
        scope = derive_media_blocks(bases, blocks)
    else:
        scope = set()
    if scope:
        blocks = {k: v for k, v in blocks.items() if k in scope}
    report = {"meta": {"blocks_scanned": len(blocks),
                       "db_present": os.path.exists(DB),
                       "scoped_to": sorted(scope) if scope else "ALL BLOCKS"}, "atoms": {}}

    for atom, base_list in bases.items():
        if only_atom and atom != only_atom:
            continue
        entry = {"bases": {}, "zero_hit_bases": [],
                 "property_side": [], "property_only": [], "name_only": []}
        name_blocks = set()

        # PROPERTY-side first, so the name side can use it to disambiguate.
        rows_early = db_rows(CONCEPT_PROPS.get(atom, []))
        if scope:
            rows_early = [r for r in rows_early if r["block_slug"] in scope]
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
    scope = report["meta"]["scoped_to"]
    out = ["MEDIA CONTROL-INSTANCE CENSUS",
           "  blocks scanned: %d   DB present: %s"
           % (report["meta"]["blocks_scanned"], report["meta"]["db_present"]),
           "  scope: %s" % (", ".join(scope) if isinstance(scope, list) else scope),
           ""]
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

    # SCOPED (the default, and what this plan actually acts on).
    scoped = survey()
    scope = set(scoped["meta"]["scoped_to"])
    if not 6 <= len(scope) <= 12:
        fails.append("derived media-block scope is %d - expected ~8. Too high "
                     "means BackgroundPanel hosts are being counted as media "
                     "surfaces; too low means the derivation has a hole."
                     % len(scope))
    # The two the census misses, both carrying a real nested <img>. Named
    # because architecture v2 s11b records them as a standing correction.
    for want in ("sgs/trust-bar", "sgs/brand-strip"):
        if want not in scope:
            fails.append("POSITIVE CONTROL FAILED: %s has a nested media "
                         "element and must qualify" % want)
    # A BackgroundPanel host with NO nested media must NOT qualify.
    for never in ("sgs/site-header", "sgs/site-footer", "sgs/nav-drawer"):
        if never in scope:
            fails.append("NEGATIVE CONTROL FAILED: %s qualified, but its media "
                         "is the shared background, not a nested element" % never)
    # The census file's six must be a SUBSET of what we derive. If one of them
    # is missing, the derivation has a hole; if the derived set is merely
    # larger, that is the recorded finding, not a bug.
    missing = census_file_surfaces() - scope
    if missing:
        fails.append("census surfaces absent from the derived scope: %s"
                     % sorted(missing))
    everywhere = {h["block"] for a in scoped["atoms"].values()
                  for v in a["bases"].values() for h in v}
    stray = everywhere - scope
    if stray:
        fails.append("SCOPE LEAK: %s reported while out of scope" % sorted(stray))
    of_scoped = {h["block"] for v in
                 scoped["atoms"].get("object-fit", {}).get("bases", {}).values()
                 for h in v}
    # POSITIVE CONTROL, scoped: the two surfaces known to carry object-fit.
    for want in ("sgs/media", "sgs/hero"):
        if want not in of_scoped:
            fails.append("POSITIVE CONTROL FAILED (scoped): %s missing from "
                         "object-fit" % want)

    # UNSCOPED, kept because it encodes a real lesson: a hand-written survey of
    # "the media blocks" missed brand-strip and trust-bar outright. --all must
    # still find them, or the widening has quietly stopped working.
    wide = survey(scoped=False)
    of_wide = {h["block"] for v in
               wide["atoms"].get("object-fit", {}).get("bases", {}).values()
               for h in v}
    for want in ("sgs/brand-strip", "sgs/trust-bar"):
        if want not in of_wide:
            fails.append("POSITIVE CONTROL FAILED (--all): %s missing from "
                         "object-fit" % want)
    # NEGATIVE CONTROL: even unscoped, a block with no media must not be swept in.
    if "sgs/collapsible-text" in of_wide:
        fails.append("NEGATIVE CONTROL FAILED: overmatched sgs/collapsible-text")
    # The two derivations must differ SOMEWHERE, or one is not running and the
    # census is single-sourced while looking fine.
    if not any(wide["atoms"][a]["property_only"] for a in wide["atoms"]):
        fails.append("no property-only block anywhere - the DB side is probably "
                     "not running, so this census is single-sourced")

    for f in fails:
        print("  FAIL " + f)
    print("%s - 9 checks: scope-leak, scoped + unscoped positive controls, negative control, single-source guard"
          % ("PASS" if not fails else "FAIL"))
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--atom")
    ap.add_argument("--all", action="store_true",
                    help="scan every block, generic atoms included")
    ap.add_argument("--census-scope", action="store_true", dest="censusscope",
                    help="use the census file's six surfaces, for comparison")
    ap.add_argument("--self-test", action="store_true", dest="selftest")
    args = ap.parse_args()
    if args.selftest:
        return self_test()
    rep = survey(args.atom, scoped=not args.all, census_scope=args.censusscope)
    print(json.dumps(rep, indent=1) if args.json else render(rep))
    return 0


if __name__ == "__main__":
    sys.exit(main())
