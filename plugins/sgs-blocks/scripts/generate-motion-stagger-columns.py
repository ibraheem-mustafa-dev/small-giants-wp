#!/usr/bin/env python3
"""generate-motion-stagger-columns.py -- writes the grid-columns attribute map the stagger helper reads (FR-38A-24).

Two copies of one map (block slug -> {desktop, tablet, mobile} -> attribute name):

- src/blocks/extensions/motion/stagger/generated-grid-columns.json   editor-only (the deploy excludes src/).
- includes/motion/data/stagger-grid-columns.php                       what `Sgs_Motion_Stagger::columns_for_block()` reads on
                                                                       the server (includes/ is deployed).

The JSON copy also lists `serverItems`: the blocks whose render code calls the server stagger (`Sgs_Motion_Loop_Delays`), so the
editor knows their stagger delays are written when the page renders and not stored on child blocks. They are found in the code,
never named in a list: a call `Sgs_Motion_Loop_Delays::item_array( 'sgs/<slug>', ...` names its block, and a `::post_grid(` call
inside a block folder names that folder's block.

A block's grid-columns attribute is found by its DB role, never by a name list (R-31-1): block_attributes rows with
role = 'layout', a tier-object responsive shape (attr_type 'object', tier_shape 'tier_object') and either the canonical
slot 'column' or the css_property 'grid-template-columns:count' (a list whose cells are counted in columns, for example
the drawer menu's list). A tier-object attribute stores {desktop, tablet, mobile}, so all three devices name the same
attribute; the reader picks the device key inside the value.

The framework DB is opened read-only. Output has no timestamp and a fixed key order, so a second run writes identical bytes.

Usage:
    python scripts/generate-motion-stagger-columns.py            write both files
    python scripts/generate-motion-stagger-columns.py --check    compare in memory, never write; exit 1 when stale
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

SCRIPTS_DIR = Path(__file__).resolve().parent
PLUGIN_DIR = SCRIPTS_DIR.parent
JSON_FILE = PLUGIN_DIR / "src" / "blocks" / "extensions" / "motion" / "stagger" / "generated-grid-columns.json"
PHP_FILE = PLUGIN_DIR / "includes" / "motion" / "data" / "stagger-grid-columns.php"
DEVICES = ("desktop", "tablet", "mobile")
QUERY = (
    "SELECT block_slug, attr_name FROM block_attributes "
    "WHERE source = 'sgs' AND role = 'layout' AND attr_type = 'object' AND tier_shape = 'tier_object' "
    "AND (canonical_slot = 'column' OR css_property = 'grid-template-columns:count') "
    "ORDER BY block_slug, attr_name"
)


def db_path() -> Path:
    """The framework DB: SGS_FRAMEWORK_DB, else the skill's copy under ~/.claude, else under ~/.agents."""
    env = os.environ.get("SGS_FRAMEWORK_DB")
    if env:
        return Path(env)
    for root in (".claude", ".agents"):
        candidate = Path.home() / root / "skills" / "sgs-wp-engine" / "sgs-framework.db"
        if candidate.exists():
            return candidate
    return Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


ITEM_ARRAY_CALL = re.compile(r"Sgs_Motion_Loop_Delays::item_array\(\s*'(sgs/[a-z0-9-]+)'")
POST_GRID_CALL = re.compile(r"Sgs_Motion_Loop_Delays::post_grid\(")


def server_items() -> list[str]:
    """Blocks whose render code calls the server stagger, found by scanning the code (R-31-1: no hand-written list)."""
    blocks_dir = PLUGIN_DIR / "src" / "blocks"
    found: set[str] = set()
    for php in blocks_dir.rglob("*.php"):
        text = php.read_text(encoding="utf-8", errors="replace")
        found.update(ITEM_ARRAY_CALL.findall(text))
        if POST_GRID_CALL.search(text):
            found.add("sgs/" + php.relative_to(blocks_dir).parts[0])
    for php in (PLUGIN_DIR / "includes").glob("*.php"):
        found.update(ITEM_ARRAY_CALL.findall(php.read_text(encoding="utf-8", errors="replace")))
    if not found:
        raise SystemExit("[generate-motion-stagger-columns] the code scan found no server stagger callers; has the call shape changed?")
    return sorted(found)


def load_map() -> dict[str, dict[str, str]]:
    path = db_path()
    if not path.exists():
        raise SystemExit(f"[generate-motion-stagger-columns] framework DB not found: {path}")
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        rows = con.execute(QUERY).fetchall()
    finally:
        con.close()
    out: dict[str, dict[str, str]] = {}
    for slug, attr in rows:
        if slug in out:
            raise SystemExit(f"[generate-motion-stagger-columns] {slug} has two grid-columns attributes ({out[slug]['desktop']}, {attr}); the reader needs one.")
        out[slug] = {device: attr for device in DEVICES}
    if not out:
        raise SystemExit("[generate-motion-stagger-columns] the DB query found no grid-columns attributes; is the DB seeded?")
    return out


def render(blocks: dict[str, dict[str, str]], items: list[str]) -> tuple[str, str]:
    note = "Generated by scripts/generate-motion-stagger-columns.py from the framework DB (role layout, tier-object columns) and the render code (server stagger callers). Do not edit."
    json_text = json.dumps({"_generated": note, "blocks": blocks, "serverItems": items}, indent="\t", sort_keys=True, ensure_ascii=False) + "\n"
    lines = [
        "<?php",
        "/**",
        " * " + note,
        " *",
        " * Block slug => device => the block attribute holding its grid column count. Read by",
        " * `Sgs_Motion_Stagger::columns_for_block()`.",
        " *",
        " * @package SGS" + chr(92) + "Blocks",
        " */",
        "",
        "defined( 'ABSPATH' ) || exit;",
        "",
        "return array(",
    ]
    for slug in sorted(blocks):
        lines.append(f"\t'{slug}' => array(")
        for device in DEVICES:
            lines.append(f"\t\t'{device}' => '{blocks[slug][device]}',")
        lines.append("\t),")
    lines += [");", ""]
    return json_text, "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="Compare in memory with the committed files; never write.")
    args = parser.parse_args()
    blocks = load_map()
    items = server_items()
    json_text, php_text = render(blocks, items)
    targets = ((JSON_FILE, json_text), (PHP_FILE, php_text))
    if args.check:
        stale = [p for p, text in targets if not p.exists() or p.read_text(encoding="utf-8") != text]
        if stale:
            for p in stale:
                print(f"[generate-motion-stagger-columns] STALE: {p}. Run without --check and commit the result.", file=sys.stderr)
            return 1
        print(f"[generate-motion-stagger-columns] OK: both files match the framework DB ({len(blocks)} blocks).")
        return 0
    for p, text in targets:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8", newline="\n")
        print(f"[generate-motion-stagger-columns] Generated {p}")
    print(f"[generate-motion-stagger-columns] {len(blocks)} blocks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
