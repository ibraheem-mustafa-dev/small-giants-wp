"""check_composition.py — Check #2: block.json hasInnerBlocks override sanity.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §1 (check #2)

Ports check-composition-sync.py exactly (AND-rule, regexes, block.json override),
then adds:
  G-A: a sgs/* block in src/blocks/ absent from block_composition → Violation
       (fail-CLOSED; replaces the old 'continue' fail-open)
  G-B: block.json declares supports.sgs.hasInnerBlocks AND it contradicts the
       AND-rule, AND no supports.sgs.hasInnerBlocksReason is present → Violation
       (the override may be masking a stale marker)

RETIRED at EXECUTION Step 16 (2026-07-05): the CORE check — "does the cached
block_composition.has_inner_blocks column match the AND-rule derivation" —
is gone along with the column it compared (migration
2026-07-05-drop-has-inner-blocks-column.py). has_inner_blocks is now derived
FRESH at convert-time (converter.services.has_inner.derive_delegates_content),
never a cached column, so there is nothing left to drift-guard (see
converter/tests/test_has_inner_derive.py's retirement note for the sibling
drift-guard TEST that was deleted for the same reason). G-A and G-B above are
KEPT — both are purely source-derived (block.json + save.js + render.php)
and never depended on the has_inner_blocks column value itself, only on a
block_composition ROW existing for the slug.

FIX command for all violations: "run python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, composition_key

# ---------------------------------------------------------------------------
# Source-tree root — derived from this file's location
# (scripts/db-consistency/check_composition.py → plugins/sgs-blocks/)
# ---------------------------------------------------------------------------
_PLUGIN_DIR = Path(__file__).resolve().parents[2]  # plugins/sgs-blocks/
_BLOCKS_DIR = _PLUGIN_DIR / "src" / "blocks"

_FIX_CMD = "run python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"

# ---------------------------------------------------------------------------
# Save-marker detection  (ported verbatim from check-composition-sync.py)
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
# Render-consumption detection  (ported verbatim from check-composition-sync.py)
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
# AND-rule derivation  (ported verbatim from check-composition-sync.py)
# ---------------------------------------------------------------------------

def _derive(block_dir: Path) -> int:
    return 1 if (_has_save_marker(block_dir) and _render_consumes(block_dir)) else 0


# ---------------------------------------------------------------------------
# block.json override reader  (ported verbatim from check-composition-sync.py)
# ---------------------------------------------------------------------------

def _has_inner_blocks_from_block_json(bj: dict) -> int | None:
    """Read supports.sgs.hasInnerBlocks from a parsed block.json dict.

    Returns the declared int (0 or 1) or None when absent.
    """
    supports = bj.get("supports", {}) if isinstance(bj, dict) else {}
    sgs = supports.get("sgs", {}) if isinstance(supports, dict) else {}
    if not isinstance(sgs, dict):
        return None
    if "hasInnerBlocks" in sgs:
        return 0 if not sgs["hasInnerBlocks"] else 1
    return None


def _has_inner_blocks_reason(bj: dict) -> str | None:
    """Read supports.sgs.hasInnerBlocksReason from a parsed block.json dict."""
    supports = bj.get("supports", {}) if isinstance(bj, dict) else {}
    sgs = supports.get("sgs", {}) if isinstance(supports, dict) else {}
    if not isinstance(sgs, dict):
        return None
    reason = sgs.get("hasInnerBlocksReason")
    return str(reason) if reason else None


# ---------------------------------------------------------------------------
# Main check runner
# ---------------------------------------------------------------------------

def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #2 against the live DB connection.

    Parameters
    ----------
    conn : open sqlite3.Connection to sgs-framework.db

    Returns
    -------
    list[Violation]
    """
    violations: list[Violation] = []

    if not _BLOCKS_DIR.exists():
        # Can't check — surface as a single violation rather than crashing
        violations.append(Violation(
            check="composition",
            block="(all)",
            detail=f"src/blocks/ directory not found at {_BLOCKS_DIR} — cannot run check #2.",
            fix="Ensure you are running from the correct repo root and src/blocks/ exists.",
            key=composition_key("(no-blocks-dir)"),
        ))
        return violations

    for block_dir in sorted(_BLOCKS_DIR.iterdir()):
        if not block_dir.is_dir() or block_dir.name == "extensions":
            continue

        bj_path = block_dir / "block.json"

        # G-A: fail-CLOSED on missing block.json — can't determine slug or source state.
        if not bj_path.exists():
            slug = f"sgs/{block_dir.name}"
            violations.append(Violation(
                check="composition",
                block=slug,
                detail=(
                    f"{slug}: block.json not found at {bj_path} — "
                    "cannot determine slug or validate has_inner_blocks."
                ),
                fix=f"Add block.json to src/blocks/{block_dir.name}/. Then {_FIX_CMD}",
                key=composition_key(slug),
            ))
            continue

        try:
            meta = json.loads(bj_path.read_text(encoding="utf-8"))
            slug = meta.get("name", f"sgs/{block_dir.name}")
        except Exception as exc:  # noqa: BLE001
            slug = f"sgs/{block_dir.name}"
            violations.append(Violation(
                check="composition",
                block=slug,
                detail=f"{slug}: failed to parse block.json — {exc}",
                fix=f"Fix JSON syntax in src/blocks/{block_dir.name}/block.json. Then {_FIX_CMD}",
                key=composition_key(slug),
            ))
            continue

        if not slug.startswith("sgs/"):
            continue  # core/* blocks — not our responsibility

        # Derive source-truth value.
        bj_override = _has_inner_blocks_from_block_json(meta)
        and_rule_derived = _derive(block_dir)

        # G-A (upgraded): block in src/blocks/ but absent from block_composition → Violation.
        # (RETIRED Step 16: previously SELECTed has_inner_blocks itself to also
        # feed the core drift check below; now only row EXISTENCE matters — the
        # column that check compared against is dropped. See module docstring.)
        row = conn.execute(
            "SELECT block_slug FROM block_composition WHERE block_slug = ?",
            (slug,),
        ).fetchone()
        if row is None:
            violations.append(Violation(
                check="composition",
                block=slug,
                detail=(
                    f"{slug}: present in src/blocks/ but has NO row in block_composition — "
                    "fail-CLOSED (was silently skipped in the old guard)."
                ),
                fix=f"Add {slug} to block_composition by running {_FIX_CMD}",
                key=composition_key(slug),
            ))
            continue

        # G-B: block.json override contradicts AND-rule AND no reason string provided.
        if bj_override is not None and bj_override != and_rule_derived:
            reason = _has_inner_blocks_reason(meta)
            if not reason:
                save_flag = _has_save_marker(block_dir)
                render_flag = _render_consumes(block_dir)
                violations.append(Violation(
                    check="composition",
                    block=slug,
                    detail=(
                        f"{slug}: block.json declares hasInnerBlocks={bool(bj_override)} "
                        f"but AND-rule derives {bool(and_rule_derived)} "
                        f"(save_marker={save_flag}, render_consumes={render_flag}). "
                        "No supports.sgs.hasInnerBlocksReason provided — override may mask a stale marker."
                    ),
                    fix=(
                        f"Either: (a) add 'hasInnerBlocksReason' to supports.sgs in "
                        f"src/blocks/{block_dir.name}/block.json explaining why the override is correct; "
                        f"or (b) remove the override and fix the source files. Then {_FIX_CMD}"
                    ),
                    key=composition_key(slug),
                ))

    return violations
