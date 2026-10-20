"""Gate: every `*TextStroke*` (text outline) attribute must be routable by the cloning resolver.

WHAT THIS CATCHES
-----------------
The resolver reads `css_property` only. The seeder (`behavioural-analyser/extract-signatures.py`,
the "Text-outline routes" pass just before the classifier file is written) refuses a vendor-prefixed
property (`-webkit-text-stroke-*`) when two attributes of one block land on the same
(property, element, state, tier) slot, and an attribute with no element at all shares the
element-less slot with every other element-less outline attribute of its block. Measured on
2026-10-20: 59 outline attributes across 10 blocks carried no `css_property` for that reason.

The only evidence that always wins is an explicit manifest claim: a `css:-webkit-text-stroke-*`
entry in `supports.sgs.elements.<element>.attrMap` (Width, Colour) or in
`supports.sgs.elements.<element>.states.hover.attrMap` (ColourHover). The seeder takes the
property, element and state from that entry whether or not the emission parser could trace the
paint. This gate therefore demands, for every outline attribute a block declares:

  * a claim whose css key matches the attribute's suffix (Width -> -webkit-text-stroke-width,
    Colour and ColourHover -> -webkit-text-stroke-color), and a ColourHover claim sits under
    `states.hover`, never the resting attrMap; OR
  * an existing `block_attributes` row that already routes it (css_property set) — the seeder's
    own emission evidence, read-only;

and that no two attributes of a block end up on the same (property, element, state) slot.

It works from `block.json` plus the DB read-only, so it can go green BEFORE a reseed.

Usage:
    python check-text-stroke-routing.py              # survey: list every finding
    python check-text-stroke-routing.py --json       # survey as JSON
    python check-text-stroke-routing.py --fix        # print the unified diff of the claims it would add
    python check-text-stroke-routing.py --fix --apply  # write the claims into the block.json files
    python check-text-stroke-routing.py --check      # gate: exit 1 while any finding remains
    python check-text-stroke-routing.py --self-test  # prove the detector can fail and can pass
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BLOCKS_DIR = ROOT / "src" / "blocks"
SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

STROKE_RE = re.compile(r"^(?P<stem>.*?)textstroke(?P<kind>width|colourhover|colour)$", re.IGNORECASE)
KEY_FOR_KIND = {
    "width": "css:-webkit-text-stroke-width",
    "colour": "css:-webkit-text-stroke-color",
    "colourhover": "css:-webkit-text-stroke-color",
}
PROP_FOR_KIND = {k: v[4:] for k, v in KEY_FOR_KIND.items()}


def parse_attr(name: str) -> "tuple[str, str] | None":
    """(stem, kind) for an outline attribute name, else None. Kind is lower-case."""
    m = STROKE_RE.match(name)
    if not m:
        return None
    return m.group("stem"), m.group("kind").lower()


def element_claims(elements: "dict[str, Any]") -> "dict[str, tuple[str, str | None, str]]":
    """attr -> (element, state, css key) for every outline claim in an element manifest.

    The block's own `isWrapper` element is reported as 'wrapper', exactly as the seeder
    normalises it when it writes `css_element`.
    """
    root_key = next((k for k, v in elements.items() if isinstance(v, dict) and v.get("isWrapper") is True), None)
    out: "dict[str, tuple[str, str | None, str]]" = {}
    for key, el in elements.items():
        if not isinstance(el, dict):
            continue
        name = "wrapper" if key == root_key else key
        for css_key, attr in (el.get("attrMap") or {}).items():
            if isinstance(attr, str) and css_key.startswith("css:-webkit-text-stroke"):
                out[attr] = (name, None, css_key)
        for state, sdef in (el.get("states") or {}).items():
            if not isinstance(sdef, dict):
                continue
            for css_key, attr in (sdef.get("attrMap") or {}).items():
                if isinstance(attr, str) and css_key.startswith("css:-webkit-text-stroke"):
                    out[attr] = (name, state, css_key)
    return out


def analyse(
    slug: str,
    attr_names: "list[str]",
    elements: "dict[str, Any]",
    db_rows: "dict[str, tuple[str | None, str | None, str | None]]",
) -> "list[dict[str, Any]]":
    """THE detector. Pure: block facts in, findings out, no file or DB access.

    `db_rows` maps attr -> (css_property, css_element, css_state) from the current DB.
    """
    claims = element_claims(elements)
    findings: "list[dict[str, Any]]" = []
    slots: "dict[tuple, list[str]]" = defaultdict(list)
    for attr in attr_names:
        parsed = parse_attr(attr)
        if not parsed:
            continue
        stem, kind = parsed
        want_key = KEY_FOR_KIND[kind]
        want_state = "hover" if kind == "colourhover" else None
        claim = claims.get(attr)
        if claim:
            element, state, css_key = claim
            if css_key != want_key:
                findings.append({"block": slug, "attr": attr, "rule": "wrong-key", "detail": f"claimed as {css_key}, expected {want_key}"})
            elif state != want_state:
                findings.append({"block": slug, "attr": attr, "rule": "wrong-state", "detail": f"claimed under state {state!r}, expected {want_state!r}"})
            slots[(PROP_FOR_KIND[kind], element, state)].append(attr)
            continue
        prop, element, state = db_rows.get(attr, (None, None, None))
        if not prop:
            findings.append({"block": slug, "attr": attr, "rule": "unrouted-unclaimed", "detail": "no element-manifest claim and the DB carries no css_property for it"})
            continue
        slots[(prop, element or None, state or None)].append(attr)
    for slot, members in slots.items():
        if len(members) > 1:
            for attr in members:
                findings.append({"block": slug, "attr": attr, "rule": "slot-collision", "detail": f"shares {slot} with {sorted(set(members) - {attr})}"})
    return findings


# ---- loading -----------------------------------------------------------------------------


def load_db() -> "dict[str, dict[str, tuple[str | None, str | None, str | None]]]":
    if not SGS_DB.exists():
        print(f"FAIL: framework DB not found at {SGS_DB}", file=sys.stderr)
        raise SystemExit(2)
    con = sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)
    try:
        cur = con.execute(
            "SELECT block_slug, attr_name, css_property, css_element, css_state "
            "FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND attr_name LIKE '%TextStroke%'"
        )
        out: "dict[str, dict[str, tuple]]" = defaultdict(dict)
        for slug, attr, prop, el, st in cur.fetchall():
            out[slug][attr] = (prop or None, el or None, st or None)
        return out
    finally:
        con.close()


def load_blocks() -> "list[tuple[str, Path, dict[str, Any]]]":
    blocks = []
    for bj in sorted(BLOCKS_DIR.glob("*/block.json")):
        data = json.loads(bj.read_text(encoding="utf-8"))
        blocks.append((data.get("name", f"sgs/{bj.parent.name}"), bj, data))
    return blocks


def survey() -> "list[dict[str, Any]]":
    db = load_db()
    findings: "list[dict[str, Any]]" = []
    for slug, _bj, data in load_blocks():
        elements = (((data.get("supports") or {}).get("sgs") or {}).get("elements")) or {}
        attrs = [a for a in (data.get("attributes") or {}) if parse_attr(a)]
        if not attrs:
            continue
        findings += analyse(slug, attrs, elements, db.get(slug, {}))
    return findings


# ---- fix: text-level insertion of the missing claims --------------------------------------


def _skip_string(s: str, i: int) -> int:
    """Index just past the string literal that starts at s[i] == '"'."""
    i += 1
    while s[i] != '"':
        i += 2 if s[i] == "\\" else 1
    return i + 1


def _skip_value(s: str, i: int) -> int:
    """Index just past the JSON value starting at s[i]."""
    if s[i] == '"':
        return _skip_string(s, i)
    if s[i] in "{[":
        depth = 0
        while True:
            c = s[i]
            if c == '"':
                i = _skip_string(s, i)
                continue
            if c in "{[":
                depth += 1
            elif c in "}]":
                depth -= 1
                if depth == 0:
                    return i + 1
            i += 1
    while s[i] not in ",}] \t\r\n":
        i += 1
    return i


def members(s: str, start: int) -> "list[tuple[str, int, int, int]]":
    """(key, key_start, value_start, value_end) for each member of the object that opens at s[start]."""
    assert s[start] == "{"
    out = []
    i = start + 1
    while True:
        while s[i] in " \t\r\n,":
            i += 1
        if s[i] == "}":
            return out
        k0 = i
        k1 = _skip_string(s, i)
        key = json.loads(s[k0:k1])
        i = k1
        while s[i] in " \t\r\n:":
            i += 1
        v1 = _skip_value(s, i)
        out.append((key, k0, i, v1))
        i = v1


def find_path(s: str, path: "list[str]") -> "tuple[int, int] | None":
    """(start, end) of the object at `path` from the document root, else None."""
    start = s.index("{")
    end = _skip_value(s, start)
    for key in path:
        hit = next((m for m in members(s, start) if m[0] == key), None)
        if hit is None:
            return None
        start, end = hit[2], hit[3]
    return start, end


def _layout(s: str, start: int) -> "tuple[str, str]":
    """(eol, one-level indent) for the object at `start`, read from its first member or its line."""
    eol = "\r\n" if "\r\n" in s else "\n"
    ms = members(s, start)
    line_start = s.rfind("\n", 0, ms[0][1] if ms else start) + 1
    member_indent = re.match(r"[ \t]*", s[line_start:]).group(0) if ms else ""
    obj_line = s.rfind("\n", 0, start) + 1
    obj_indent = re.match(r"[ \t]*", s[obj_line:]).group(0)
    unit = member_indent[len(obj_indent):] if ms and member_indent.startswith(obj_indent) and len(member_indent) > len(obj_indent) else "\t"
    return eol, unit or "\t"


def add_member(s: str, obj_path: "list[str]", key: str, value: Any) -> str:
    """Insert `key: value` at the end of the object at `obj_path`, matching its indentation."""
    span = find_path(s, obj_path)
    assert span, f"path not found: {obj_path}"
    start, end = span
    eol, unit = _layout(s, start)
    obj_line = s.rfind("\n", 0, start) + 1
    base = re.match(r"[ \t]*", s[obj_line:]).group(0)
    inner = base + unit
    body = json.dumps(value, indent=unit, ensure_ascii=False).replace("\n", eol + inner)
    entry = f"{json.dumps(key)}: {body}"
    ms = members(s, start)
    if ms:
        last_end = ms[-1][3]
        return s[:last_end] + "," + eol + inner + entry + s[last_end:]
    return s[:start] + "{" + eol + inner + entry + eol + base + "}" + s[end:]


def plan_claims(
    slug: str, data: "dict[str, Any]", findings: "list[dict[str, Any]]", db: "dict[str, tuple]"
) -> "tuple[list[tuple[str, str | None, str, str]], list[str]]":
    """Claims to add: [(element key, state, css key, attr)], plus the attrs that could not be placed.

    Every stem that has an unrouted, unclaimed member gets its whole trio claimed on one
    element, so the resting colour, width and hover share an element.
    """
    elements = (((data.get("supports") or {}).get("sgs") or {}).get("elements")) or {}
    declared = data.get("attributes") or {}
    claimed = set(element_claims(elements))
    stems = {parse_attr(f["attr"])[0] for f in findings if f["rule"] == "unrouted-unclaimed"}
    out: "list[tuple[str, str | None, str, str]]" = []
    unplaced: "list[str]" = []
    for stem in sorted(stems):
        element = resolve_element(elements, declared, stem)
        trio = [a for a in declared if (p := parse_attr(a)) and p[0] == stem and a not in claimed]
        if element is None:
            unplaced += trio
            continue
        for attr in trio:
            kind = parse_attr(attr)[1]
            out.append((element, "hover" if kind == "colourhover" else None, KEY_FOR_KIND[kind], attr))
    return out, unplaced


def resolve_element(elements: "dict[str, Any]", declared: "dict[str, Any]", stem: str) -> "str | None":
    """The manifest element an outline stem belongs to: wrapper for '', else prefix, key, then majority attrMap."""
    cands = {k: v for k, v in elements.items() if isinstance(v, dict)}
    if stem == "":
        roots = [k for k, v in cands.items() if v.get("isWrapper") is True]
        return roots[0] if len(roots) == 1 else None
    by_prefix = [k for k, v in cands.items() if v.get("prefix", k) == stem]
    if len(by_prefix) == 1:
        return by_prefix[0]
    by_key = [k for k, v in cands.items() if k == stem]
    if len(by_key) == 1:
        return by_key[0]
    votes: "dict[str, int]" = {}
    for k, v in cands.items():
        names = list((v.get("attrMap") or {}).values())
        for sdef in (v.get("states") or {}).values():
            names += list((sdef.get("attrMap") or {}).values()) if isinstance(sdef, dict) else []
        n = sum(1 for a in names if isinstance(a, str) and a.startswith(stem) and len(a) > len(stem) and a[len(stem)].isupper())
        if n:
            votes[k] = n
    if votes:
        best = sorted(votes.items(), key=lambda kv: -kv[1])
        if len(best) == 1 or best[0][1] > best[1][1]:
            return best[0][0]
    return None


def apply_claims(src: str, claims: "list[tuple[str, str | None, str, str]]") -> str:
    base = ["supports", "sgs", "elements"]
    for element, state, css_key, attr in claims:
        epath = base + [element]
        if state is None:
            if find_path(src, epath + ["attrMap"]):
                src = add_member(src, epath + ["attrMap"], css_key, attr)
            else:
                src = add_member(src, epath, "attrMap", {css_key: attr})
        else:
            hpath = epath + ["states", state, "attrMap"]
            if find_path(src, hpath):
                src = add_member(src, hpath, css_key, attr)
            elif find_path(src, epath + ["states", state]):
                src = add_member(src, epath + ["states", state], "attrMap", {css_key: attr})
            elif find_path(src, epath + ["states"]):
                src = add_member(src, epath + ["states"], state, {"attrMap": {css_key: attr}})
            else:
                src = add_member(src, epath, "states", {state: {"attrMap": {css_key: attr}}})
    return src


def run_fix(apply: bool) -> int:
    db = load_db()
    findings = survey()
    by_block: "dict[str, list]" = defaultdict(list)
    for f in findings:
        by_block[f["block"]].append(f)
    leftover = 0
    for slug, _bj, data in load_blocks():
        if slug not in by_block:
            continue
        claims, unplaced = plan_claims(slug, data, by_block[slug], db.get(slug, {}))
        if unplaced:
            leftover += len(unplaced)
            print(f"UNPLACED in {slug} (no single element owns the stem): {unplaced}")
        if not claims:
            continue
        old = _bj.read_text(encoding="utf-8", newline="")
        new = apply_claims(old, claims)
        json.loads(new)  # a write that does not parse is never produced
        print(f"--- {slug}: {len(claims)} claim(s)")
        for element, state, css_key, attr in claims:
            before = db.get(slug, {}).get(attr, (None, None, None))
            print(f"    {attr}: {element}{'/' + state if state else ''} {css_key}   (DB now: element={before[1]}, state={before[2]})")
        if apply:
            tmp = _bj.with_suffix(".json.tmp")
            tmp.write_text(new, encoding="utf-8", newline="")
            tmp.replace(_bj)
        else:
            sys.stdout.writelines(difflib.unified_diff(old.splitlines(True), new.splitlines(True), f"a/{_bj.name}", f"b/{_bj.name}", n=1))
    return 1 if leftover else 0


# ---- self-test ----------------------------------------------------------------------------


def self_test() -> int:
    W = "css:-webkit-text-stroke-width"
    C = "css:-webkit-text-stroke-color"
    els_ok = {
        "wrapper": {"isWrapper": True, "attrMap": {W: "textStrokeWidth", C: "textStrokeColour"}, "states": {"hover": {"attrMap": {C: "textStrokeColourHover"}}}},
        "title": {"prefix": "title", "attrMap": {W: "titleTextStrokeWidth", C: "titleTextStrokeColour"}, "states": {"hover": {"attrMap": {C: "titleTextStrokeColourHover"}}}},
    }
    names = ["textStrokeWidth", "textStrokeColour", "textStrokeColourHover", "titleTextStrokeWidth", "titleTextStrokeColour", "titleTextStrokeColourHover"]
    checks: "list[tuple[str, bool]]" = []

    checks.append(("positive control: fully claimed block has no findings", analyse("sgs/x", names, els_ok, {}) == []))

    # Negative control 1: the live failure shape. Two Hover siblings, no claim, DB unrouted.
    bare = {"wrapper": {"isWrapper": True}, "title": {"prefix": "title"}}
    got = analyse("sgs/x", ["textStrokeColourHover", "titleTextStrokeColourHover"], bare, {})
    checks.append(("negative control: unclaimed + unrouted siblings are flagged", {f["attr"] for f in got} == {"textStrokeColourHover", "titleTextStrokeColourHover"} and all(f["rule"] == "unrouted-unclaimed" for f in got)))

    # Negative control 2: two claims onto one slot.
    two_names = ["itemTextStrokeColour", "linkTextStrokeColour"]
    two_els = {"item": {"attrMap": {C: "itemTextStrokeColour"}}, "link": {"attrMap": {C: "linkTextStrokeColour"}}}
    checks.append(("distinct elements do not collide", analyse("sgs/x", two_names, two_els, {}) == []))
    db_clash = {"itemTextStrokeColour": ("-webkit-text-stroke-color", "item", None), "linkTextStrokeColour": ("-webkit-text-stroke-color", "item", None)}
    got = analyse("sgs/x", two_names, {}, db_clash)
    checks.append(("negative control: two routed rows on one slot collide", sorted(f["attr"] for f in got) == two_names and all(f["rule"] == "slot-collision" for f in got)))

    # An unclaimed attribute the DB already routes is not a finding (emission evidence).
    routed = {"textStrokeWidth": ("-webkit-text-stroke-width", None, None)}
    checks.append(("DB-routed unclaimed attribute passes", analyse("sgs/x", ["textStrokeWidth"], {}, routed) == []))

    # Wrong claim shapes.
    wrong_key = {"wrapper": {"isWrapper": True, "attrMap": {W: "textStrokeColour"}}}
    checks.append(("wrong css key is flagged", [f["rule"] for f in analyse("sgs/x", ["textStrokeColour"], wrong_key, {})] == ["wrong-key"]))
    hover_in_base = {"wrapper": {"isWrapper": True, "attrMap": {C: "textStrokeColourHover"}}}
    checks.append(("a Hover claim in the resting attrMap is flagged", [f["rule"] for f in analyse("sgs/x", ["textStrokeColourHover"], hover_in_base, {})] == ["wrong-state"]))

    # Name parsing: both the root and prefixed spellings, and a non-outline name.
    checks.append(("parse: root and prefixed names", parse_attr("textStrokeColourHover") == ("", "colourhover") and parse_attr("helpTextTextStrokeWidth") == ("helpText", "width") and parse_attr("textStrokeFoo") is None))

    # The fixer: claims land where the validator accepts them, in a tab-indented document.
    doc = '{\n\t"attributes": {\n\t\t"titleTextStrokeWidth": {},\n\t\t"titleTextStrokeColour": {},\n\t\t"titleTextStrokeColourHover": {}\n\t},\n\t"supports": {\n\t\t"sgs": {\n\t\t\t"elements": {\n\t\t\t\t"title": {\n\t\t\t\t\t"prefix": "title",\n\t\t\t\t\t"clusters": ["text"]\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}\n'
    data = json.loads(doc)
    pre = analyse("sgs/x", list(data["attributes"]), data["supports"]["sgs"]["elements"], {})
    plan, unplaced = plan_claims("sgs/x", data, pre, {})
    fixed = apply_claims(doc, plan)
    data2 = json.loads(fixed)
    post = analyse("sgs/x", list(data2["attributes"]), data2["supports"]["sgs"]["elements"], {})
    checks.append(("fixer: red before, green after, document still parses", len(pre) == 3 and not unplaced and post == []))
    checks.append(("fixer: idempotent (second pass plans nothing)", plan_claims("sgs/x", data2, post, {}) == ([], [])))
    checks.append(("fixer: indentation matches the file", '\t\t\t\t\t"attrMap": {' in fixed and '\t\t\t\t\t\t"css:-webkit-text-stroke-width": "titleTextStrokeWidth"' in fixed))

    failed = 0
    for name, ok in checks:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        failed += 0 if ok else 1
    print(f"\n{len(checks) - failed}/{len(checks)} self-test assertions passed.")
    return 1 if failed else 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="gate: exit 1 while any outline attribute cannot be routed")
    ap.add_argument("--json", action="store_true", help="survey output as JSON")
    ap.add_argument("--fix", action="store_true", help="print the diff of the claims it would add")
    ap.add_argument("--apply", action="store_true", help="with --fix: write the block.json files")
    ap.add_argument("--self-test", action="store_true", help="run the detector's own assertions")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if args.fix:
        return run_fix(args.apply)

    findings = survey()
    if args.json:
        print(json.dumps(findings, indent=2))
    else:
        if not findings:
            print("PASS: every text-outline attribute is claimed in its block's element manifest or already routed.")
        else:
            by_block: "dict[str, list]" = defaultdict(list)
            for f in findings:
                by_block[f["block"]].append(f)
            print(f"FAIL: {len(findings)} text-outline attribute finding(s) in {len(by_block)} block(s).\n")
            for slug in sorted(by_block):
                print(f"  {slug} ({len(by_block[slug])})")
                for f in by_block[slug]:
                    print(f"      {f['attr']}  [{f['rule']}] {f['detail']}")
            print("\nFIX: python scripts/check-text-stroke-routing.py --fix --apply   (adds the element-manifest claims)")
    return 1 if (args.check and findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
