"""check_important_render.py — Check #3: !important over a faithful CSS property.

Spec 31 §7a check 3:
  Scan the PHP/CSS RENDER SURFACE (class-sgs-container-wrapper.php + every
  block style.css / editor.css) for CSS properties that are also in
  property_suffixes.css_property AND appear with !important.

  The converter already strips !important (_strip_important), so the cheat
  lives in the render surface, not the converter output.  Scanning converter
  output would be the wrong surface.

  DB query: SELECT DISTINCT css_property FROM property_suffixes
  Then grep render files for: <property>: ... !important

UK English throughout.
"""
from __future__ import annotations

import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from cheat_gate.models import Violation, important_render_key  # type: ignore[import]

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent           # scripts/cheat-gate/
_SCRIPTS_DIR = _HERE.parent                        # scripts/
_PLUGIN_ROOT = _SCRIPTS_DIR.parent                 # sgs-blocks/
_WRAPPER_PHP = _PLUGIN_ROOT / "includes" / "class-sgs-container-wrapper.php"

# src/ block directories (source CSS, before build)
_BLOCKS_SRC = _PLUGIN_ROOT / "src" / "blocks"

# build/ block directories (compiled CSS)
_BLOCKS_BUILD = _PLUGIN_ROOT / "build" / "blocks"

# Database
_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------
# Matches:  property-name: <value> !important;
# Captures the property name for grouping.
_IMPORTANT_DECL_RE = re.compile(
    r"([\w-]+)\s*:[^;{}\n]*?!important",
    re.IGNORECASE,
)


def _faithful_properties(conn: sqlite3.Connection) -> frozenset[str]:
    """Return the set of CSS property names that have a D1 lift destination."""
    rows = conn.execute(
        "SELECT DISTINCT css_property FROM property_suffixes WHERE css_property IS NOT NULL"
    ).fetchall()
    return frozenset(r[0].lower() for r in rows)


def _enclosing_selector(text: str, decl_start: int) -> str:
    """Return the CSS selector of the rule containing the declaration at decl_start.

    Back-scans to the `{` opening this rule, then to the previous `}`/`{` to slice out
    the selector text. Good enough for flagging variant/state scope (not a full parser)."""
    open_brace = text.rfind("{", 0, decl_start)
    if open_brace == -1:
        return ""
    prev = max(text.rfind("}", 0, open_brace), text.rfind("{", 0, open_brace))
    return text[prev + 1:open_brace].strip()


def _is_variant_scoped(selector: str) -> bool:
    """A !important on a VARIANT/STATE selector overrides a variant-specific render (e.g.
    the wrapper's OWN inline animation style for `--ken-burns`/`--parallax`, or a `:hover`
    state) — NOT the base faithful transfer, so it is not a converter cheat. Detected by a
    BEM modifier (`--`) or a pseudo-class/state (`:`) in the enclosing selector. A BASE
    selector (`.sgs-container`, `.sgs-x__y`) has neither → a real base-transfer override.
    (D249 accuracy fix — STOP-31 class: scope the gate to the real cheat context.)"""
    return "--" in selector or ":" in selector


def _scan_file_for_important(path: Path) -> list[str]:
    """Return CSS property names (lowercased) that use !important on a BASE selector.

    For .css files, a !important whose enclosing selector is variant/state-scoped is
    SKIPPED (not a base-transfer override). The PHP wrapper is scanned flat (it builds
    inline styles, not CSS rules with selectors)."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    is_css = path.suffix.lower() == ".css"
    props: list[str] = []
    for m in _IMPORTANT_DECL_RE.finditer(text):
        if is_css and _is_variant_scoped(_enclosing_selector(text, m.start())):
            continue  # variant/state-scoped — overrides a variant render, not the transfer
        props.append(m.group(1).lower())
    return props


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(_PLUGIN_ROOT))
    except ValueError:
        return str(path)


def _collect_render_files() -> list[Path]:
    """Return all PHP/CSS render-surface files to scan."""
    files: list[Path] = []

    if _WRAPPER_PHP.exists():
        files.append(_WRAPPER_PHP)

    # Prefer src/ CSS (authoritative source); fall back to build/ if src absent
    for css_dir in (_BLOCKS_SRC, _BLOCKS_BUILD):
        if not css_dir.exists():
            continue
        for css_path in sorted(css_dir.rglob("*.css")):
            # Skip editor.css in build — it mirrors src
            if css_path.name in ("style.css", "editor.css"):
                files.append(css_path)

    return files


def run(conn: sqlite3.Connection | None = None) -> list[Violation]:
    """Check PHP/CSS render surface for !important over faithful CSS properties.

    conn — optional live DB connection; opened internally if not provided.
    """
    violations: list[Violation] = []

    # Open DB if not provided
    owns_conn = conn is None
    if conn is None:
        if not _DB_PATH.exists():
            return violations  # DB absent — skip check gracefully
        conn = sqlite3.connect(str(_DB_PATH))

    try:
        faithful = _faithful_properties(conn)
    finally:
        if owns_conn:
            conn.close()

    if not faithful:
        return violations

    render_files = _collect_render_files()

    # Track which (file, property) combos we've already reported to avoid duplicates
    seen: set[tuple[str, str]] = set()

    for fpath in render_files:
        file_rel = _rel(fpath)
        props_with_important = _scan_file_for_important(fpath)
        for prop in props_with_important:
            if prop not in faithful:
                continue
            dedup_key = (file_rel, prop)
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            key = important_render_key(file_rel, prop)
            detail = (
                f"CSS property '{prop}' appears with !important in the render surface "
                f"({file_rel}), AND '{prop}' is a faithful D1 lift property "
                f"(it has a property_suffixes row). "
                f"This !important will override faithfully transferred attr values, "
                f"making correct converter output invisible to the browser."
            )
            fix = (
                f"Remove the !important from '{prop}' in {file_rel}. "
                f"If !important is required to override a WP-native base style, "
                f"use a higher-specificity selector instead. "
                f"See SGS container-wrapper architecture for the correct approach."
            )
            violations.append(Violation(
                check="important_render",
                file=file_rel,
                detail=detail,
                fix=fix,
                key=key,
            ))

    return violations
