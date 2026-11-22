#!/usr/bin/env python3
"""Gate: every typography family and paint-table setting a block paints has a part (`css_element`).

WHY THIS EXISTS (root cause, 2026-11-22, shop pages F-37). The cloning route's
part-look pairs a draft element with a block setting through the setting's part
(`block_attributes.css_element`). A setting with no part can never be paired, so a
draft's heading size, weight or case never reaches it. sgs/account lost 100 settings
this way (13 type families: addressTitle, authHeading, loginLink, ...): the
classifier (`behavioural-analyser/extract-signatures.py`) traced every one of them to
a real property, then its ambiguity safety net refused them because "no css_element
tells them apart", although the block's own manifest names the element (a prefix
convention entry: `"prefix": "addressTitle"` + the `text` cluster). The net only
looked for an element in the rendered selector, never in the manifest.

WHAT IT CHECKS (two passes). Pass 1, type families. A typography family is a prefix P whose block declares attributes
`P<Member>` for the members FontSize, FontFamily, FontWeight, FontStyle, LineHeight,
LetterSpacing, TextTransform, TextDecoration (the `...Unit` companions are length
units, not looks, and are excluded). A family is PAINTED when its prefix appears as the
literal second argument of `sgs_typography_css_rule( $attributes, 'P', ...)` in the
block's own PHP or in a plugin include the block requires (transitively). A painted
family with a member that has no part in the framework DB, and none in the classifier's
derived layer, is a finding. Prefixes passed as a variable (`$prefix` in a loop) cannot be
resolved here and are counted as `variable_prefix_calls` per block, never guessed.

Pass 2, paint tables. A block that paints spacing, size and border settings from a table of rows
`array( '<setting>', '<kind>', '<selector>', array( '<css property>' ), '<device>' )` (sgs/account's
`sgs_account_cell_rows`) hands the classifier a selector it cannot turn into a named part: a setting with no
element in `supports.sgs.elements` gets no part, and two such settings on one property are refused as ambiguous.
Every row's setting must have a part. Only sgs/account has such a table today; a table of the same shape in
another block is read the same way.

POPULATION DECLARED BEFORE THE FIRST RUN (2026-11-22, DB at the F-37 baseline): sgs/account
13 families (accountSection, addressEditLink, addressText, addressTitle, authHeading,
headerAccountTitle, loginLink, loginRememberText, lostPasswordRow, ordersRow, privacyLink,
privacyText, resetNoticeText), no other block expected to be large.

Run:
  python check-typography-family-has-part.py --survey [--json]
  python check-typography-family-has-part.py --check     # exit 1 when a painted family lacks a part
  python check-typography-family-has-part.py --self-test
Options: --db <path> (default: the framework DB), --classifications <path> (the derived
layer, default: the committed css-property-classifications.json; the classifier's fresh
output can be passed to prove a seeder change before the reseed).
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "lib"))
from framework_db import framework_db_path  # noqa: E402

PLUGIN = HERE.parent
BLOCKS_DIR = PLUGIN / "src" / "blocks"
CLASSIFICATIONS = HERE / "behavioural-analyser" / "css-property-classifications.json"

MEMBERS = (
    "FontSize", "FontFamily", "FontWeight", "FontStyle",
    "LineHeight", "LetterSpacing", "TextTransform", "TextDecoration",
)
LITERAL_CALL = re.compile(r"sgs_typography_css_rule\(\s*\$\w+\s*,\s*'([A-Za-z0-9_]+)'")
ANY_CALL = re.compile(r"sgs_typography_css_rule\(")
TABLE_ROW = re.compile(r"""array\(\s*'(\w+)',\s*'(?:len|box|edge|frame|rule|num|sel|tog)',\s*'[^']*',\s*array\(""")
INCLUDE_REF = re.compile(r"""['"](/includes/[\w./-]+\.php)['"]""")
DIR_REF = re.compile(r"""__DIR__\s*\.\s*['"]/([\w./-]+\.php)['"]""")


def php_closure(block_dir: Path) -> str:
    """The block's PHP text: every .php file in its folder plus the plugin includes it
    requires (transitively, by a literal `/includes/...php` path or a `__DIR__ . '/x.php'` path)."""
    seen: set[Path] = set()
    text: list[str] = []
    todo = sorted(block_dir.glob("*.php"))
    while todo:
        f = todo.pop()
        if f in seen or not f.is_file():
            continue
        seen.add(f)
        src = f.read_text(encoding="utf-8", errors="ignore")
        text.append(src)
        for rel in INCLUDE_REF.findall(src):
            todo.append(PLUGIN / rel.lstrip("/"))
        for rel in DIR_REF.findall(src):
            todo.append((f.parent / rel).resolve())
    return "\n".join(text)


def painted_prefixes(php: str) -> tuple[set[str], int]:
    """(literal prefixes painted through sgs_typography_css_rule, calls whose prefix is not a literal)."""
    literal = set(LITERAL_CALL.findall(php))
    return literal, len(ANY_CALL.findall(php)) - len(LITERAL_CALL.findall(php))


def table_settings(php: str) -> set[str]:
    """The settings named by paint-table rows in a block's PHP."""
    return set(TABLE_ROW.findall(php))


def find_gaps(
    attrs: set[str], painted: set[str], has_part: "dict[str, bool]",
) -> list[dict]:
    """One finding per painted family that has a member declared with no part.
    attrs: the block's attribute names; painted: prefixes it paints; has_part: attr -> bool."""
    gaps = []
    for prefix in sorted(painted):
        members = [prefix + m for m in MEMBERS if prefix + m in attrs]
        if not members:
            continue  # the prefix names no declared family on this block
        missing = [a for a in members if not has_part.get(a)]
        if missing:
            gaps.append({"prefix": prefix, "members": len(members), "missing": missing})
    return gaps


def load_state(db_path: Path, classifications: Path):
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    rows = conn.execute("SELECT block_slug, attr_name, css_element FROM block_attributes WHERE source='sgs'").fetchall()
    conn.close()
    attrs: dict[str, set[str]] = {}
    part: dict[tuple[str, str], bool] = {}
    for slug, attr, element in rows:
        attrs.setdefault(slug, set()).add(attr)
        part[(slug, attr)] = bool(element)
    if classifications.exists():
        for e in json.loads(classifications.read_text(encoding="utf-8")).get("entries", []):
            if (e["fields"] or {}).get("css_element"):
                part[(e["slug"], e["attr"])] = True
    return attrs, part


def survey(db_path: Path, classifications: Path) -> dict:
    attrs, part = load_state(db_path, classifications)
    blocks = {}
    tables: dict[str, list[str]] = {}
    total = 0
    for slug in sorted(attrs):
        block_dir = BLOCKS_DIR / slug.split("/", 1)[1]
        if not block_dir.is_dir():
            continue
        php = php_closure(block_dir)
        painted, variable = painted_prefixes(php)
        no_part = sorted(a for a in table_settings(php) & attrs[slug] if not part.get((slug, a)))
        if no_part:
            tables[slug] = no_part
        gaps = find_gaps(attrs[slug], painted, {a: part.get((slug, a), False) for a in attrs[slug]})
        if gaps or variable:
            blocks[slug] = {"families_without_part": gaps, "variable_prefix_calls": variable}
        total += sum(len(g["missing"]) for g in gaps)
    total += sum(len(v) for v in tables.values())
    return {"settings_without_part": total, "paint_table_settings_without_part": tables, "blocks": {b: v for b, v in blocks.items() if v["families_without_part"]},
            "variable_prefix_calls": {b: v["variable_prefix_calls"] for b, v in blocks.items() if v["variable_prefix_calls"]}}


def self_test() -> int:
    ok = True

    def expect(name: str, cond: bool) -> None:
        nonlocal ok
        print(("PASS " if cond else "FAIL ") + name)
        ok = ok and cond

    attrs = {"titleFontSize", "titleFontSizeUnit", "titleFontWeight", "bodyFontSize", "titleColour"}
    # A painted family where nothing has a part: found, with only declared non-Unit members.
    g = find_gaps(attrs, {"title"}, {})
    expect("painted family with no part is found", len(g) == 1 and g[0]["missing"] == ["titleFontSize", "titleFontWeight"])
    # One member missing among parted ones: still found (the setting is unreachable).
    g = find_gaps(attrs, {"title"}, {"titleFontSize": True})
    expect("a single member without a part is found", g and g[0]["missing"] == ["titleFontWeight"])
    # Fully parted: clean.
    expect("fully parted family is clean", find_gaps(attrs, {"title"}, {"titleFontSize": True, "titleFontWeight": True}) == [])
    # Negative control: an unpainted family (no call) is never a finding, and a prefix with no declared members is skipped.
    expect("unpainted family is not a finding", find_gaps(attrs, set(), {}) == [])
    expect("a prefix naming no declared family is skipped", find_gaps(attrs, {"ghost"}, {}) == [])
    # The Unit companion alone never counts as a family member.
    expect("a Unit companion is not a member", find_gaps({"titleFontSizeUnit"}, {"title"}, {}) == [])
    # The PHP reader: literal prefix resolved, variable prefix counted, comment-free call shapes.
    php = "$c[] = sgs_typography_css_rule( $attributes, 'addressTitle', $sel, '', false );\n" \
          "$c[] = sgs_typography_css_rule($a, $prefix, $row);"
    expect("literal prefix read, variable prefix counted", painted_prefixes(php) == ({"addressTitle"}, 1))
    # Pass 2: the table reader and its negative controls.
    row = "array( 'authPairGap', 'len', '@r .sgs-account__wc > #customer_login', array( 'gap' ), '' ),"
    expect("a paint-table row is read", table_settings(row) == {"authPairGap"})
    expect("a non-table array is not read", table_settings("array( 'a', 'b', 'c' )") == set())
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--verbose", action="store_true", help="also list blocks with variable-prefix calls")
    ap.add_argument("--db", type=Path, default=None)
    ap.add_argument("--classifications", type=Path, default=CLASSIFICATIONS)
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not (args.survey or args.check):
        ap.print_help()
        return 2
    result = survey(args.db or framework_db_path(), args.classifications)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for slug, v in result["blocks"].items():
            for g in v["families_without_part"]:
                print(f"{slug}: {g['prefix']} ({len(g['missing'])} of {g['members']} settings have no part): {', '.join(g['missing'])}")
        for slug, names in result["paint_table_settings_without_part"].items():
            print(f"{slug}: {len(names)} paint-table setting(s) have no part: {', '.join(names)}")
        for slug, n in (result["variable_prefix_calls"].items() if args.verbose else ()):
            print(f"note {slug}: {n} sgs_typography_css_rule call(s) with a variable prefix (not resolved)")
        print(f"{result['settings_without_part']} painted setting(s) without a part (type families and paint-table rows)")
    if args.check and result["settings_without_part"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
