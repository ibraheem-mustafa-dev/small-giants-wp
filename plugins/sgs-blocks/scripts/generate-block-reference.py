#!/usr/bin/env python3
"""
SGS Blocks Reference Generator
Auto-generates .claude/specs/02-SGS-BLOCKS-REFERENCE.md from the SGS framework SQLite DB.

Usage:
    python plugins/sgs-blocks/scripts/generate-block-reference.py
    python plugins/sgs-blocks/scripts/generate-block-reference.py --output some/other/path.md
"""
import sqlite3
import sys
import argparse
from pathlib import Path
from datetime import datetime

DEFAULT_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def find_repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in [here] + list(here.parents):
        if (parent / "plugins" / "sgs-blocks").is_dir():
            return parent
    return Path.cwd()


REPO_ROOT = find_repo_root()
DEFAULT_OUTPUT = REPO_ROOT / ".claude" / "specs" / "02-SGS-BLOCKS-REFERENCE.md"

CATEGORY_ORDER = [
    "sgs-layout",
    "sgs-content",
    "sgs-forms",
    "sgs-interactive",
    "sgs-utility",
]

CATEGORY_TITLES = {
    "sgs-layout": "Layout",
    "sgs-content": "Content",
    "sgs-forms": "Forms",
    "sgs-interactive": "Interactive",
    "sgs-utility": "Utility",
}


def truncate(value, length: int = 40) -> str:
    if value is None:
        return "—"
    s = str(value).strip()
    if not s:
        return "—"
    if len(s) > length:
        return s[: length - 3] + "..."
    return s


def fetch_blocks(conn):
    cur = conn.cursor()
    cur.execute(
        "SELECT slug, title, category, description, has_render_php, grade, grade_score "
        "FROM blocks ORDER BY category, slug"
    )
    return cur.fetchall()


def fetch_attributes(conn, slug):
    cur = conn.cursor()
    cur.execute(
        "SELECT attr_name, attr_type, default_value, enum_values, is_responsive "
        "FROM block_attributes WHERE block_slug = ? ORDER BY attr_name",
        (slug,),
    )
    return cur.fetchall()


def fetch_supports(conn, slug):
    cur = conn.cursor()
    cur.execute(
        "SELECT support_name, support_value FROM block_supports "
        "WHERE block_slug = ? ORDER BY support_name",
        (slug,),
    )
    return cur.fetchall()


def fetch_selectors(conn, slug):
    cur = conn.cursor()
    cur.execute(
        "SELECT element, selector FROM block_selectors "
        "WHERE block_slug = ? ORDER BY element",
        (slug,),
    )
    return cur.fetchall()


def render_block(conn, block_row):
    slug, title, category, description, has_render_php, grade, grade_score = block_row
    out = []
    title_str = title if title else slug
    out.append("### `" + slug + "`")
    out.append("_" + title_str + "_")
    out.append("")

    block_type = "Dynamic" if has_render_php else "Static"
    type_line = "**Type:** " + block_type
    if grade:
        type_line += " — **Grade:** " + str(grade)
    out.append(type_line)
    out.append("")

    if description and description.strip():
        out.append(description.strip())
        out.append("")

    attrs = fetch_attributes(conn, slug)
    out.append("**Attributes** (" + str(len(attrs)) + "):")
    out.append("")
    if attrs:
        out.append("| Name | Type | Default | Responsive |")
        out.append("|------|------|---------|------------|")
        for a in attrs:
            attr_name, attr_type, default_value, enum_values, is_responsive = a
            type_cell = attr_type or "—"
            if enum_values:
                type_cell = type_cell + " (enum)"
            default_cell = truncate(default_value, 40).replace("|", "\\|")
            responsive_cell = "Yes" if is_responsive else "—"
            out.append(
                "| `" + attr_name + "` | `" + type_cell + "` | `"
                + default_cell + "` | " + responsive_cell + " |"
            )
    else:
        out.append("_(no attributes declared)_")
    out.append("")

    supports = fetch_supports(conn, slug)
    out.append("**Supports:**")
    if supports:
        items = []
        for s in supports:
            sup_name, sup_value = s
            if sup_value and sup_value not in ("1", "true", "True"):
                items.append("`" + sup_name + "` (" + truncate(sup_value, 30) + ")")
            else:
                items.append("`" + sup_name + "`")
        out.append("- " + ", ".join(items))
    else:
        out.append("_(none declared)_")
    out.append("")

    selectors = fetch_selectors(conn, slug)
    if selectors:
        out.append("**Selectors:**")
        out.append("")
        out.append("| Element | Selector |")
        out.append("|---------|----------|")
        for sel in selectors:
            element, selector = sel
            out.append("| `" + str(element) + "` | `" + str(selector) + "` |")
        out.append("")

    out.append("---")
    out.append("")
    return out


def category_sort_key(cat):
    if cat in CATEGORY_ORDER:
        return (0, CATEGORY_ORDER.index(cat))
    return (1, cat or "")


def generate(db_path, output_path):
    if not db_path.exists():
        print("ERROR: DB not found at " + str(db_path), file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    try:
        all_blocks = fetch_blocks(conn)

        by_category = {}
        for b in all_blocks:
            cat = b[2] or "uncategorised"
            by_category.setdefault(cat, []).append(b)

        sorted_cats = sorted(by_category.keys(), key=category_sort_key)

        total_blocks = len(all_blocks)
        dynamic_count = sum(1 for b in all_blocks if b[4])
        static_count = total_blocks - dynamic_count

        cur = conn.cursor()
        total_attrs = cur.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0]

        out = []
        out.append("# SGS Blocks Reference")
        out.append("")
        out.append("> **AUTO-GENERATED.** Do not edit by hand. This file is regenerated from")
        out.append("> `~/.claude/skills/sgs-wp-engine/sgs-framework.db` by")
        out.append("> `plugins/sgs-blocks/scripts/generate-block-reference.py`.")
        out.append("> Refresh: `python plugins/sgs-blocks/scripts/generate-block-reference.py`.")
        out.append("")
        out.append("**Last generated:** " + datetime.now().isoformat(timespec="seconds"))
        out.append("")
        out.append(
            "**For architectural patterns, customisation standards, and build status, see "
            "[`02-SGS-BLOCKS.md`](02-SGS-BLOCKS.md).** This file is the per-block "
            "attribute/supports/selector reference only."
        )
        out.append("")
        out.append("---")
        out.append("")

        out.append("## Contents")
        out.append("")
        for cat in sorted_cats:
            cat_label = CATEGORY_TITLES.get(cat, cat)
            count = len(by_category[cat])
            anchor = cat_label.lower().replace(" ", "-")
            out.append("- [" + cat_label + "](#" + anchor + ") (" + str(count) + " blocks)")
        out.append("")
        out.append("---")
        out.append("")

        for cat in sorted_cats:
            cat_label = CATEGORY_TITLES.get(cat, cat)
            out.append("## " + cat_label)
            out.append("")
            for block_row in by_category[cat]:
                out.extend(render_block(conn, block_row))

        out.append("## Stats")
        out.append("")
        out.append("- **Total blocks:** " + str(total_blocks))
        out.append("- **Dynamic (render.php):** " + str(dynamic_count))
        out.append("- **Static (save.js):** " + str(static_count))
        out.append("- **Total attributes:** " + str(total_attrs))
        out.append("")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("\n".join(out), encoding="utf-8")

        return {
            "blocks": total_blocks,
            "attributes": total_attrs,
            "dynamic": dynamic_count,
            "static": static_count,
            "output": str(output_path),
        }
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    result = generate(args.db, args.output)
    print(
        "Wrote: " + result["output"]
        + " (" + str(result["blocks"]) + " blocks, "
        + str(result["attributes"]) + " attributes — "
        + str(result["dynamic"]) + " dynamic, "
        + str(result["static"]) + " static)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
