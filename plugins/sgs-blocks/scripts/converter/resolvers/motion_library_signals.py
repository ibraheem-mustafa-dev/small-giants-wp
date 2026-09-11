"""Tier 4a DOM-runtime-signal detection for GSAP/Lenis/Three.js -- Phase R8 Step 10.

WHY THIS EXISTS
----------------
`.claude/plans/phase-r8-motion-recognition.md` Step 10 + the research at
`C:/Users/Bean/.claude/memory/research/2026-09-10-detecting-motion-libraries-in-bundled-js.md`.
Rather than parsing minified/bundled JS to find GSAP/Lenis/Three.js call
sites (infeasible reliably -- rater B's original feasibility objection),
this module reads the durable DOM signals these libraries write into the
rendered page as a side effect of NORMAL operation. All three survive
minification by construction (string literals, not identifiers) and are
industry-precedented (Wappalyzer's own public detection rules use the same
class of runtime-state check, not bundle-content parsing).

BUILD-TIME CHECK (mandatory pre-flight, run BEFORE writing this module --
Step 10's pinned Hidden-Decisions gate)
----------------------------------------------------
Confirmed live 2026-09-11 by direct read of
`plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py::_harvest_functionality_gap_elements`
(lines ~872-927): it parses the FULL downloaded mockup HTML
(`mockup_path.read_text(encoding="utf-8")`, the same file this module's
`detect_from_html_file()` re-parses below) with BeautifulSoup and walks
`root.descendants`, reading `el.attrs` (every raw HTML attribute, not a
filtered subset) and `el.get("class")` (the full raw class list) for EVERY
descendant element under a matched section -- not just BEM-recognised
nodes. `per-section-convention-voter.py::collect_class_signature()`
separately confirms the section-boundary layer also reads `node.get("class")`
verbatim off a BeautifulSoup `Tag`. CONCLUSION: the pipeline's existing DOM
scrape (a BeautifulSoup parse of the complete mockup HTML file) already
retains the FULL raw `class` attribute string and other HTML attributes for
every element in the document -- the per-section BEM-recognition layer only
narrows that view for its own purpose, it does not lose the underlying data.
This module does NOT need a second network fetch; it re-parses the same
on-disk mockup HTML file the orchestrator already downloaded, exactly the
way `_harvest_functionality_gap_elements` already does for a different
purpose (behaviour-fingerprint attributes).

DATA MODEL (pinned in Step 10 -- mirrors `slots.aliases`, never a hardcoded dict)
----------------------------------------------------
Every signature this module matches against comes from the
`library_runtime_signals` DB table (seeded by
`dbschema/seed-library-signatures.py`), which mirrors the `slots` table's
`aliases` column shape (a JSON array of strings in a TEXT column) --
confirmed live via `PRAGMA table_info(slots)` before either script was
written; there is NO `slot_synonyms` table in this schema. This module
never hand-types the class/attribute patterns themselves (R-31-1).

⛔ CRITICAL CONSTRAINT (verify by grep before calling this module "done")
----------------------------------------------------
Every function in this module returns DATA ONLY -- a plain dict/list
describing what was found and why. NOTHING in this module imports, calls,
or writes to any Tier 4b/4c/4d module
(`converter/services/webgl_style_classifier.py`,
`converter/services/webgl_reference_puller.py` -- neither exists yet at
Step 10), and nothing here writes a Tier G/H/W block attribute value.
`to_leftover_bucket_items()` below produces operator-review-flag-shaped
rows for the existing leftover-buckets/gap flow (mirrors the dict shape
`leftover-bucket-router.py::_enrich_item()` already consumes: selector +
reason/confidence) -- it is a FLAG for a human to review, never an
auto-trigger into a heavier tier. Confirmed by direct grep of this file
(zero `import.*tier_4[bcd]|webgl_style_classifier|webgl_reference_puller`
matches) as part of Step 10's own QA gate.

UK English in comments + output.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable

try:  # pragma: no cover - import shape depends on caller's sys.path setup
    from converter.db import db_lookup
except ImportError:  # pragma: no cover - fallback when run as a loose script
    import sys

    sys.path.insert(
        0,
        os.path.join(os.path.dirname(__file__), "..", "db"),
    )
    import db_lookup  # type: ignore

# Same resolution convention as dbschema/seed-library-signatures.py and
# ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py.
DB_PATH = os.path.expanduser(os.path.join("~", ".claude", "skills", "sgs-wp-engine", "sgs-framework.db"))
TABLE = "library_runtime_signals"


def load_signals(db_path: str | None = None) -> list[dict]:
    """Read every seeded library-signal row from the DB (read-only connection --
    this module never writes to `library_runtime_signals`; only the seeder does).
    """
    conn = db_lookup.get_connection(db_path or DB_PATH)
    try:
        cur = conn.execute(
            f"SELECT library_name, signal_type, aliases, confirms FROM {TABLE}"
        )
        rows: list[dict] = []
        for library_name, signal_type, aliases_json, confirms in cur.fetchall():
            rows.append({
                "library_name": library_name,
                "signal_type": signal_type,
                "aliases": json.loads(aliases_json),
                "confirms": confirms,
            })
        return rows
    finally:
        conn.close()


def _classes_of(tag: Any) -> list[str]:
    """Full raw class list off a BeautifulSoup Tag -- same accessor shape
    as `per-section-convention-voter.py::collect_class_signature()`."""
    classes = tag.get("class") or []
    if isinstance(classes, str):
        classes = classes.split()
    return [c for c in classes if c]


def _detect_html_body_class(soup: Any, aliases: list[str]) -> dict | None:
    """Lenis-style signal: an exact class on <html> or <body>."""
    alias_set = set(aliases)
    for tag_name in ("html", "body"):
        tag = soup.find(tag_name)
        if tag is None:
            continue
        for cls in _classes_of(tag):
            if cls in alias_set:
                return {"matched_class": cls, "matched_tag": tag_name}
    return None


def _detect_wrapper_class_prefix(soup: Any, aliases: list[str]) -> dict | None:
    """GSAP ScrollTrigger-style signal: a wrapper div whose class is the
    bare alias OR the alias plus a "-<id>" suffix (e.g. pin-spacer-3)."""
    for tag in soup.find_all(class_=True):
        for cls in _classes_of(tag):
            for alias in aliases:
                if cls == alias or cls.startswith(alias + "-"):
                    return {"matched_class": cls, "matched_tag": getattr(tag, "name", None)}
    return None


def _detect_canvas_attr_prefix(soup: Any, aliases: list[str]) -> dict | None:
    """Three.js-style signal: a <canvas data-engine="..."> value starting
    with one of the seeded prefixes."""
    for canvas in soup.find_all("canvas"):
        data_engine = canvas.get("data-engine")
        if not data_engine:
            continue
        for alias in aliases:
            if data_engine.startswith(alias):
                return {"matched_attr": "data-engine", "matched_value": data_engine}
    return None


_DETECTORS: dict[str, Callable[[Any, list[str]], dict | None]] = {
    "html_body_class": _detect_html_body_class,
    "wrapper_class_prefix": _detect_wrapper_class_prefix,
    "canvas_attr_prefix": _detect_canvas_attr_prefix,
}


def detect_from_soup(soup: Any, signals: list[dict] | None = None) -> list[dict]:
    """Run every seeded signal against an already-parsed BeautifulSoup DOM.

    Returns a list of found-signal dicts:
        {"library_name", "signal_type", "confirms", "evidence"}
    Empty list means none of the three libraries showed a genuine
    runtime signal -- NOT the same as "the library's script tag is absent";
    a loaded-but-inactive library (e.g. GSAP loaded, no pinning used) is
    correctly reported as not-found here, by design (Step 10's Edge test).
    """
    signals = signals if signals is not None else load_signals()
    found: list[dict] = []
    for sig in signals:
        detector = _DETECTORS.get(sig["signal_type"])
        if detector is None:
            continue
        evidence = detector(soup, sig["aliases"])
        if evidence:
            found.append({
                "library_name": sig["library_name"],
                "signal_type": sig["signal_type"],
                "confirms": sig["confirms"],
                "evidence": evidence,
            })
    return found


def detect_from_html_file(mockup_path: "Path | str", signals: list[dict] | None = None) -> list[dict]:
    """Re-parse the SAME mockup HTML file the pipeline already downloaded
    (the identical file `sgs-clone-orchestrator.py::_harvest_functionality_gap_elements`
    reads via `mockup_path.read_text()`) -- no new network fetch, no second
    scrape mechanism invented; this just runs a different query over the
    same already-fetched document.
    """
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []
    mockup_path = Path(mockup_path)
    if not mockup_path.exists():
        return []
    soup = BeautifulSoup(mockup_path.read_text(encoding="utf-8"), "html.parser")
    return detect_from_soup(soup, signals)


def find_non_threejs_canvases(soup: Any) -> list[dict]:
    """Every <canvas> that does NOT carry a Three.js `data-engine` tag --
    the candidate set for the Playwright WebGL draw-call probe
    (`converter/webgl_draw_call_probe.py`). Presence alone proves nothing
    about whether the canvas is genuinely drawing WebGL frames (it may be
    a plain 2D-context canvas) -- that confirmation needs real browser
    execution, deliberately kept OUT of this DOM-only module.
    """
    out: list[dict] = []
    for idx, canvas in enumerate(soup.find_all("canvas")):
        data_engine = canvas.get("data-engine") or ""
        if data_engine.startswith("three.js"):
            continue
        out.append({
            "index": idx,
            "id": canvas.get("id"),
            "class": _classes_of(canvas),
        })
    return out


def to_leftover_bucket_items(found_signals: list[dict], boundary_selector: str = "body") -> list[dict]:
    """Shape each finding as an operator-review flag item.

    Mirrors the dict shape `leftover-bucket-router.py::_enrich_item()`
    already consumes (a `selector` + a confidence-bearing reason) so this
    can be handed straight into that flow's item lists without inventing a
    second schema. A DOM class/attribute match is a FACT (the string is
    either present or it isn't), so confidence is fixed at 1.0 -- this is
    intentionally NOT a scored/fuzzy match (Step 3's binary-match precedent
    applies equally here).

    THIS FUNCTION NEVER WRITES A BLOCK ATTRIBUTE AND NEVER CALLS A HEAVIER
    TIER. It returns plain review-queue data for a human to read.
    """
    items: list[dict] = []
    for sig in found_signals:
        items.append({
            "selector": boundary_selector,
            "reason": f"runtime-library-signal:{sig['library_name']}",
            "confirms": sig["confirms"],
            "evidence": sig["evidence"],
            "confidence": 1.0,
        })
    return items
