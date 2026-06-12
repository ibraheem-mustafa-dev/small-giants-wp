#!/usr/bin/env python3
"""check-composition-sync.py — prebuild guard for block_composition.has_inner_blocks.

STRUCTURAL GUARD (2026-06-12) — prevents the D212 testimonial-empty class of bug
from regressing. A stale has_inner_blocks=1 on a typed leaf block causes the
converter to recurse into children that render.php ignores, producing an empty
frontend render. A stale has_inner_blocks=0 on a genuine InnerBlocks block causes
the converter to skip child recursion, also producing an empty frontend render.

This guard fails (exit 1) if, for any sgs/* block in block_composition, the stored
has_inner_blocks differs from the value derived by the AND rule:

  has_inner_blocks = 1  IFF:
    (a) save.js / index.js emits <InnerBlocks.Content (non-comment, not deprecated.js)
    AND
    (b) render.php references $content or $block->inner_blocks non-trivially.

Fix: run `python sgs-update-v2.py --stage 1` to auto-correct the stored value.

Usage:
    python scripts/check-composition-sync.py          # report (exit 0 unless mismatch)
    python scripts/check-composition-sync.py --check   # same, exit 1 on any mismatch

Wired into prebuild / prestart in package.json alongside check-dead-controls.js.
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

BLOCKS_DIR = Path(__file__).resolve().parents[1] / "src" / "blocks"
# DB is in the user's home dir — hard-linked between .agents and .claude.
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# ---------------------------------------------------------------------------
# Save-marker detection (same logic as sgs-update-v2.py sub-step B)
# ---------------------------------------------------------------------------

_SAVE_MARKER_RE = re.compile(r"<InnerBlocks\.Content")


def _strip_block_comments(src: str) -> str:
    return re.sub(r"/\*.*?\*/", " ", src, flags=re.DOTALL)


def _is_js_comment_line(line: str) -> bool:
    s = line.strip()
    return s.startswith(("//", "*", "/*"))


def _has_save_marker(block_dir: Path) -> bool:
    """True if save.js (or index.js inline save) emits <InnerBlocks.Content."""
    save_js = block_dir / "save.js"
    if save_js.exists():
        src = _strip_block_comments(save_js.read_text(encoding="utf-8", errors="replace"))
        for line in src.splitlines():
            if _is_js_comment_line(line):
                continue
            if _SAVE_MARKER_RE.search(line):
                return True
        return False

    index_js = block_dir / "index.js"
    if not index_js.exists():
        return False
    src = _strip_block_comments(index_js.read_text(encoding="utf-8", errors="replace"))
    for line in src.splitlines():
        if _is_js_comment_line(line):
            continue
        if _SAVE_MARKER_RE.search(line):
            return True
    return False


# ---------------------------------------------------------------------------
# Render-consumption detection (same logic as sgs-update-v2.py sub-step B)
# ---------------------------------------------------------------------------

_RENDER_CONTENT_RE = re.compile(
    r"echo\s+\$content"
    r"|\.\s*\$content"
    r"|\$content\s*\."
    r"|\$content\s*;"
    r"|\$content\s*//"
    r"|:\s*\$content"
    r"|\{\$content\}"
    r"|\$content\s*,"
    r"|if\s*\(\s*\$content"
    r"|\$block\s*->\s*inner_blocks"
    r"|do_blocks\s*\(\s*\$content\s*\)"
)


def _is_php_comment_line(line: str) -> bool:
    s = line.strip()
    return s.startswith(("*", "//", "#", "/*"))


def _render_consumes(block_dir: Path) -> bool:
    """True if render.php uses $content / $block->inner_blocks non-trivially."""
    render_php = block_dir / "render.php"
    if not render_php.exists():
        return False
    for line in render_php.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip() or _is_php_comment_line(line):
            continue
        if _RENDER_CONTENT_RE.search(line):
            return True
    return False


# ---------------------------------------------------------------------------
# Derivation
# ---------------------------------------------------------------------------

def _derive(block_dir: Path) -> int:
    return 1 if (_has_save_marker(block_dir) and _render_consumes(block_dir)) else 0


# Canonical override layer — MUST mirror HAS_INNER_BLOCKS_OVERRIDES in
# sgs-update-v2.py (genuine serialisation != routing cases + a cited source-bug
# follow-up). Keep the two dicts in sync.
HAS_INNER_BLOCKS_OVERRIDES: dict[str, int] = {
    # (empty — all current blocks derive correctly; entries added only for genuine serialisation≠routing cases)
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit 1 if any mismatch is found (for prebuild gate).",
    )
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(
            f"[check-composition-sync] DB not found: {DB_PATH}\n"
            "  Run sgs-update-v2.py first or check DB_PATH.",
            file=sys.stderr,
        )
        return 1 if args.check else 0

    con = sqlite3.connect(str(DB_PATH))
    mismatches: list[str] = []
    checked = 0

    for block_dir in sorted(BLOCKS_DIR.iterdir()):
        if not block_dir.is_dir() or block_dir.name == "extensions":
            continue
        bj_path = block_dir / "block.json"
        if not bj_path.exists():
            continue
        try:
            meta = json.loads(bj_path.read_text(encoding="utf-8"))
            slug = meta.get("name", f"sgs/{block_dir.name}")
        except Exception:  # noqa: BLE001
            slug = f"sgs/{block_dir.name}"

        if not slug.startswith("sgs/"):
            continue  # never touch core/* rows

        row = con.execute(
            "SELECT has_inner_blocks FROM block_composition WHERE block_slug = ?",
            (slug,),
        ).fetchone()
        if row is None:
            continue  # missing row — not this guard's responsibility

        stored = row[0]
        derived = HAS_INNER_BLOCKS_OVERRIDES.get(slug, _derive(block_dir))
        checked += 1

        if stored != derived:
            save_flag = _has_save_marker(block_dir)
            render_flag = _render_consumes(block_dir)
            mismatches.append(
                f"  {slug}: DB has_inner_blocks={stored} but derived={derived}"
                f" (save={save_flag}, render_consumes={render_flag})"
            )

    con.close()

    if mismatches:
        sys.stderr.write(
            f"[check-composition-sync] {len(mismatches)} mismatch(es) across {checked} blocks:\n"
        )
        for msg in mismatches:
            sys.stderr.write(msg + "\n")
        sys.stderr.write(
            "Fix: run `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1`"
            " to auto-correct has_inner_blocks from source.\n"
        )
        if args.check:
            return 1
    else:
        print(
            f"[check-composition-sync] OK — has_inner_blocks in sync"
            f" across {checked} sgs/* blocks."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
