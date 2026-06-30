"""check_d2_when_d1.py — Check #6: D2-when-D1-exists (run_dir-dependent, best-effort).

Spec 31 §7a check 6:
  When a pipeline-state run_dir is available, for each property stranded in
  variation-d0-d2.css, query property_suffixes + block_attributes to see if a
  D1 destination (a typed block attribute) exists for that (block, property).
  If so, flag it: the property has a proper home but was silently routed to D2.

  run_dir is OPTIONAL (like check_no_mirror.py's optional run_dir).
  If absent, this check is skipped gracefully — that is expected behaviour.

  A D3 gap-candidate entry that is ALSO routed to D2 is a cheat (the converter
  looks like it logged an honest gap, but the property still went to D2 scoped
  CSS).  That cross-check requires the attribute_gap_candidates table which is
  pipeline-state-dependent; it is noted in the report but not hard-gated here
  because it requires both run_dir AND the populated DB table.

UK English throughout.
"""
from __future__ import annotations

import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from cheat_gate.models import Violation, d2_when_d1_key  # type: ignore[import]

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent           # scripts/cheat-gate/
_SCRIPTS_DIR = _HERE.parent                        # scripts/
_PIPELINE_STATE = _SCRIPTS_DIR / "pipeline-state"
_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# CSS rule extractor: selector { declarations }
# Note: _LAYOUT_PROP_RE pre-filter REMOVED — it was itself an R-31-1 hardcoded
# property literal and silently skipped any D2-stranded property that wasn't in
# the ~18-item list.  We now pass EVERY property to the DB cross-join, which is
# the authoritative answer to "does a D1 destination exist for this property?"
_RULE_RE = re.compile(r"([.#][\w\s,.:>#~\[\]=*@()-]+?)\{([^{}]+)\}", re.DOTALL)
# Block slug from .sgs- selector: e.g. .sgs-hero or .page-id-N .sgs-hero
_SLUG_FROM_SELECTOR_RE = re.compile(r"\.sgs-([\w-]+)")


def _latest_run_dir() -> Path | None:
    """Return the most-recently-modified pipeline-state subdirectory."""
    if not _PIPELINE_STATE.exists():
        return None
    candidates = [d for d in _PIPELINE_STATE.iterdir() if d.is_dir() and not d.name.startswith(".")]
    if not candidates:
        return None
    return max(candidates, key=lambda d: d.stat().st_mtime)


def _block_has_d1_destination(conn: sqlite3.Connection, block_slug: str, css_property: str) -> bool:
    """Return True if block_slug has a typed attr for css_property in the DB."""
    rows = conn.execute(
        """
        SELECT ba.attr_name
        FROM block_attributes ba
        JOIN property_suffixes ps ON LOWER(ba.attr_name) LIKE '%' || LOWER(ps.suffix)
        WHERE ba.block_slug = ?
          AND LOWER(ps.css_property) = LOWER(?)
        LIMIT 1
        """,
        (block_slug, css_property),
    ).fetchall()
    return bool(rows)


# Individual declaration extractor: captures the property name from each
# "property: value;" line inside a CSS rule body.
_DECL_PROP_RE = re.compile(r"^\s*([\w-]+)\s*:", re.MULTILINE)


def _parse_d2_css(css_text: str) -> list[tuple[str, str]]:
    """Return list of (selector, css_property) from D2 section of the CSS file.

    Every declaration property is extracted (no pre-filter).  The DB cross-join
    in _block_has_d1_destination is the authoritative gate.
    """
    # Find the D2 section
    d2_start = css_text.find("D2 —")
    if d2_start == -1:
        d2_start = css_text.find("D2 -")
    d2_text = css_text[d2_start:] if d2_start >= 0 else css_text

    results: list[tuple[str, str]] = []
    for m in _RULE_RE.finditer(d2_text):
        selector = m.group(1).strip()
        body = m.group(2)
        if ".sgs-" not in selector and ".page-id-" not in selector:
            continue
        for prop_m in _DECL_PROP_RE.finditer(body):
            results.append((selector, prop_m.group(1).lower()))
    return results


def run(
    run_dir: Path | None = None,
    conn: sqlite3.Connection | None = None,
) -> list[Violation]:
    """Check for D2-stranded properties that have a D1 destination.

    run_dir  — pipeline-state run directory (optional; skipped gracefully if absent)
    conn     — optional live DB connection; opened internally if not provided.

    Returns a list of Violation objects.
    """
    violations: list[Violation] = []

    # Resolve run_dir
    actual_run_dir = run_dir or _latest_run_dir()
    if actual_run_dir is None:
        # No pipeline run available — skip check 6 gracefully
        return violations

    d2_css_path = actual_run_dir / "variation-d0-d2.css"
    if not d2_css_path.exists():
        return violations

    # DB check
    if conn is None:
        if not _DB_PATH.exists():
            return violations
        conn = sqlite3.connect(str(_DB_PATH))
        owns_conn = True
    else:
        owns_conn = False

    try:
        css_text = d2_css_path.read_text(encoding="utf-8", errors="replace")
        stranded = _parse_d2_css(css_text)

        seen: set[tuple[str, str]] = set()
        for selector, css_property in stranded:
            # Extract block slug from selector (best-effort)
            slug_m = _SLUG_FROM_SELECTOR_RE.search(selector)
            if not slug_m:
                continue
            block_name = slug_m.group(1)  # e.g. "hero", "trust-bar"
            block_slug = f"sgs/{block_name}"

            dedup = (block_slug, css_property)
            if dedup in seen:
                continue
            seen.add(dedup)

            # Check if D1 destination exists
            if _block_has_d1_destination(conn, block_slug, css_property):
                key = d2_when_d1_key(block_slug, css_property)
                detail = (
                    f"Property '{css_property}' is stranded in D2 CSS for "
                    f"block '{block_slug}' (selector: {selector.strip()[:80]}), "
                    f"but a D1 attribute destination EXISTS in the DB. "
                    f"This is a converter cheat: the property should have been "
                    f"lifted to a typed block attribute, not scoped to D2."
                )
                fix = (
                    f"Fix the converter to lift '{css_property}' for '{block_slug}' "
                    f"onto the correct block attribute (query block_attributes + "
                    f"property_suffixes for the right attr name). "
                    f"Remove the D2 rule from variation-d0-d2.css."
                )
                violations.append(Violation(
                    check="d2_when_d1",
                    file=str(d2_css_path),
                    detail=detail,
                    fix=fix,
                    key=key,
                ))
    finally:
        if owns_conn:
            conn.close()

    return violations
