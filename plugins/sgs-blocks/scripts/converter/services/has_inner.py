"""has_inner — derive delegates_content at convert-time from save.js + render.php.

Design ref: `.claude/plans/2026-06-23-stage2-recognition-design.md` §3 +
Spec 31 §12.7 Stage-2 row: "derive at convert-time from the save.js marker, NOT a
cached column." FR-31-2.6 retired `block_composition.has_inner_blocks` as the
content-dispatch SIGNAL (the per-attr `block_attributes.emit_shape` replaced it);
the block-level fact that legitimately survives — "this block's source delegates a
$content region" — is renamed here to `delegates_content` to avoid the retired name.

So this does NOT read `block_composition.has_inner_blocks` (a stale column mis-routes
silently — the exact failure the spec forbids). It computes the AND-rule FRESH from the
block's own source:

    delegates_content = 1  iff  (save.js emits <InnerBlocks.Content)
                              AND (render.php consumes $content non-trivially)

honouring a `block.json supports.sgs.hasInnerBlocks` override (+ hasInnerBlocksReason).

The regexes are RE-IMPLEMENTED here (not imported from the hyphenated
`db-consistency/check_composition.py` package — which cannot be imported as
`db-consistency` and would couple the fresh engine to a consistency checker). F6
db-consistency remains the PRE-FLIGHT cross-check (it verifies the cached column agrees
with the same AND-rule); `tests/test_has_inner_derive.py` adds a drift-guard asserting
THIS derivation agrees with F6's across the whole block set, so the deliberate
re-implementation cannot silently drift (duplicated-calculation-drifts guard).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

# scripts/converter/services/has_inner.py -> plugins/sgs-blocks/
_PLUGIN_DIR = Path(__file__).resolve().parents[3]
_BLOCKS_DIR = _PLUGIN_DIR / "src" / "blocks"

# save-marker: save.js (or inline index.js save) emits <InnerBlocks.Content
_SAVE_MARKER_RE = re.compile(r"<InnerBlocks\.Content")

# render.php consumes $content / inner_blocks non-trivially
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


def _strip_block_comments(src: str) -> str:
    return re.sub(r"/\*.*?\*/", " ", src, flags=re.DOTALL)


def _is_js_comment_line(line: str) -> bool:
    s = line.strip()
    return s.startswith(("//", "*", "/*"))


def _is_php_comment_line(line: str) -> bool:
    s = line.strip()
    return s.startswith(("*", "//", "#", "/*"))


def _block_dir(slug: str) -> Path:
    """plugins/sgs-blocks/src/blocks/<name> for an 'sgs/<name>' slug."""
    return _BLOCKS_DIR / slug.split("/")[-1]


def _has_save_marker(block_dir: Path) -> bool:
    for name in ("save.js", "index.js"):
        f = block_dir / name
        if not f.exists():
            continue
        src = _strip_block_comments(f.read_text(encoding="utf-8", errors="replace"))
        for line in src.splitlines():
            if _is_js_comment_line(line):
                continue
            if _SAVE_MARKER_RE.search(line):
                return True
        if name == "save.js":
            return False  # save.js present but no marker — authoritative
    return False


def _render_consumes(block_dir: Path) -> bool:
    render_php = block_dir / "render.php"
    if not render_php.exists():
        return False
    for line in render_php.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip() or _is_php_comment_line(line):
            continue
        if _RENDER_CONTENT_RE.search(line):
            return True
    return False


def _block_json_override(block_dir: Path) -> int | None:
    """supports.sgs.hasInnerBlocks (0|1) from block.json, or None when absent."""
    bj = block_dir / "block.json"
    if not bj.exists():
        return None
    try:
        meta = json.loads(bj.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return None
    sgs = ((meta.get("supports") or {}).get("sgs") or {}) if isinstance(meta, dict) else {}
    if isinstance(sgs, dict) and "hasInnerBlocks" in sgs:
        return 0 if not sgs["hasInnerBlocks"] else 1
    return None


def derive_delegates_content(slug: str) -> int:
    """Return 1 if the block composes child InnerBlocks, else 0 — derived FRESH.

    The block.json override wins when present (it carries a hasInnerBlocksReason for
    deliberate exceptions); otherwise the AND-rule (save-marker AND render-consumes).
    A block with no source on disk fails CLOSED to 0 (a leaf cannot host children — the
    safe non-content-dropping default for recognition, where the caller already knows
    the slug is registered).
    """
    block_dir = _block_dir(slug)
    override = _block_json_override(block_dir)
    if override is not None:
        return override
    return 1 if (_has_save_marker(block_dir) and _render_consumes(block_dir)) else 0


# MIGRATION SHIM `derive_has_inner_blocks` REMOVED (EXECUTION Step 16,
# 2026-07-05) — block_composition.has_inner_blocks column is dropped and every
# external reader (coverage-matrix/db_queries.py,
# recogniser/leftover-bucket-router.py) was repointed to
# derive_delegates_content directly in the same session; zero remaining
# importers of the old name (verified by grep before deletion).
