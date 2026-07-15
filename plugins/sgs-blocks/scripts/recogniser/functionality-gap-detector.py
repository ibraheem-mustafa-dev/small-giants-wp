#!/usr/bin/env python3
"""functionality-gap-detector.py -- Spec 31 Phase 5a.3 (FR8 functionality leg).

Detects when a draft DOM element expects BEHAVIOUR (data-action,
data-toggle, click-handlers, modal opens, tab triggers, aria-expanded,
scroll reveal, etc.) that the nearest-matched SGS block does NOT
currently render.

Writes rows to uimax.functionality_gap_candidates so operators can
review which behaviours need new attributes (or whole new blocks).

Counter-discipline (FR8): rows are written -- NEVER auto-deleted. The
operator decides when a gap candidate is resolved.

Input shape (single element):
    {
      "selector": ".hero-cta[data-action=open-modal]",
      "matched_block_slug": "sgs/hero",   # may be None for un-routed orphans
      "html_attrs": {
        "data-action": "open-modal",
        "data-target": "#enquiry"
      },
      "html_tag": "button",
      "inline_handlers": ["onclick"]      # optional list of inline-attr handler names
    }

Output (per element): dict with `feature_type`, `css_signal`,
`role_proposed`, `confidence`, plus the proposed DB row.

DB writes are GATED behind `--write`; default mode is dry-run so QC
inline tests don't pollute the gap-candidate table.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SGS_DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)
UIMAX_DB_PATH = Path(
    os.environ.get(
        "UIMAX_DB",
        str(Path.home() / ".agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db"),
    )
)

# Behavioural HTML-attribute fingerprints. Each fires when the named
# attribute is observed on a draft element. Maps the attribute to a
# canonical `feature_type` label written to uimax.
_BEHAVIOUR_HTML_ATTRS: dict[str, str] = {
    "data-action":         "click-action",
    "data-toggle":         "toggle",
    "data-target":         "target-ref",
    "data-modal-open":     "modal-open",
    "data-modal-close":    "modal-close",
    "data-tab-trigger":    "tab-trigger",
    "data-tab-panel":      "tab-panel",
    "data-accordion":      "accordion-toggle",
    "data-dropdown":       "dropdown-toggle",
    "data-scroll-to":      "scroll-to",
    "data-reveal":         "scroll-reveal",
    "data-animate":        "animate-on-scroll",
    "data-lightbox":       "lightbox",
    "aria-expanded":       "expandable",
    "aria-controls":       "controls-target",
    "aria-haspopup":       "popup-trigger",
    "data-copy-to-clipboard": "copy-to-clipboard",
}

# Inline JS handlers (onclick / onchange / onsubmit / ...) are an HTML
# 4-era anti-pattern but real-world drafts still use them. Any present
# = functionality not yet routed through Interactivity API.
_INLINE_HANDLER_PREFIX = "on"


def _now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def load_block_output_signatures(conn: sqlite3.Connection, block_slug: str) -> set[str]:
    """Return the set of attribute names a block declares an output_signature for.

    The detector uses this as a coarse "this block handles X" oracle.
    When a draft surfaces a data-action and the matched block has NO
    output_signature row for an action-shaped attribute, that's a gap.
    """
    rows = conn.execute(
        "SELECT attr_name FROM block_attributes WHERE block_slug=? AND output_signature IS NOT NULL",
        (block_slug,),
    ).fetchall()
    return {r[0] for r in rows}


_ACTION_SHAPED_ATTR_HINTS = (
    "action", "toggle", "open", "close", "expand", "trigger",
    "lightbox", "modal", "tab", "accordion", "dropdown", "reveal",
    "animate", "scroll", "copy",
)


def _block_handles_feature(handled_attrs: set[str], feature_type: str) -> bool:
    """Heuristic: does the block declare an attribute whose name suggests
    it handles this feature_type?

    Examples:
      feature_type='modal-open' + handled_attrs={'modalEnabled', 'modalTitle'} -> True
      feature_type='tab-trigger' + handled_attrs={'activeTab', 'tabs'} -> True
    """
    feature_lc = feature_type.lower()
    feature_keywords = [feature_lc.replace("-", ""), *feature_lc.split("-")]
    for attr in handled_attrs:
        attr_lc = attr.lower()
        if any(kw and kw in attr_lc for kw in feature_keywords):
            return True
        # Generic action-shaped match
        if feature_lc == "click-action" and any(h in attr_lc for h in _ACTION_SHAPED_ATTR_HINTS):
            return True
    return False


def detect_element(
    element: dict,
    sgs_conn: sqlite3.Connection,
    run_id: str | None = None,
) -> list[dict]:
    """Return zero or more gap-candidate rows for the element.

    Each row carries the fields needed for an INSERT into
    uimax.functionality_gap_candidates plus extra debug fields.
    """
    selector = element.get("selector") or ""
    matched_slug = element.get("matched_block_slug")
    html_attrs = element.get("html_attrs") or {}
    inline_handlers = element.get("inline_handlers") or []

    # Collect candidate features observed on this element.
    observed: list[tuple[str, str]] = []  # (feature_type, signal)
    for attr, value in html_attrs.items():
        attr_lc = attr.lower()
        feature_type = _BEHAVIOUR_HTML_ATTRS.get(attr_lc)
        if feature_type:
            signal = f"{selector} @{attr_lc}={value!r}" if value is not None else f"{selector} @{attr_lc}"
            observed.append((feature_type, signal))
    for handler in inline_handlers:
        if handler.lower().startswith(_INLINE_HANDLER_PREFIX):
            observed.append(("inline-handler", f"{selector} @{handler.lower()}"))

    if not observed:
        return []

    # If no matched block, every observed feature is a gap by definition.
    if matched_slug is None:
        handled_attrs: set[str] = set()
    else:
        handled_attrs = load_block_output_signatures(sgs_conn, matched_slug)

    rows: list[dict] = []
    for feature_type, signal in observed:
        if matched_slug and _block_handles_feature(handled_attrs, feature_type):
            continue  # not a gap -- the block already handles it
        # Confidence heuristic: behaviour signal alone -> 0.8; if the
        # matched block exists but lacks the feature -> 0.9 (strong gap).
        confidence = 0.9 if matched_slug else 0.8
        rows.append({
            "block_slug": matched_slug,
            "feature_type": feature_type,
            "css_signal": signal,
            "role_proposed": None,
            "confidence": confidence,
            "seen_count": 1,
            "last_seen": _now_iso(),
            "staged_at": _now_iso(),
            "applied_at": None,
            "provenance": f"sgs-clone:{run_id}" if run_id else "sgs-clone",
            "status": "pending",
            # Debug fields (not persisted to DB):
            "_selector": selector,
            "_observed_behaviour": feature_type,
        })
    return rows


def _selector_only(css_signal: str) -> str:
    """Strip the attribute/value tail from css_signal for stable de-dupe.

    css_signal is shaped `'.selector @attr=value'` -- the value mutates
    between clone runs when the draft tweaks its data-* attrs, so de-dupe
    on the FULL signal proliferates near-duplicate rows. The leading
    selector token is the stable identity; use it as the de-dupe key.
    """
    if not css_signal:
        return ""
    return css_signal.split(" @", 1)[0].strip()


def write_rows(rows: list[dict], conn: sqlite3.Connection) -> int:
    """Insert candidate rows. Returns number of rows actually inserted.

    De-dupes against (block_slug, feature_type, selector-prefix-of-css_signal)
    so re-runs over the same draft don't proliferate identical gap rows
    even when the data-attr VALUE shifts. Existing matches bump
    seen_count + last_seen.
    """
    inserted = 0
    for row in rows:
        selector_part = _selector_only(row["css_signal"])
        existing = conn.execute(
            """SELECT id, seen_count FROM functionality_gap_candidates
               WHERE COALESCE(block_slug,'') = COALESCE(?,'')
                 AND feature_type = ?
                 AND (css_signal = ? OR css_signal LIKE ? || ' @%')""",
            (row["block_slug"], row["feature_type"], selector_part, selector_part),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE functionality_gap_candidates SET seen_count=?, last_seen=? WHERE id=?",
                (existing[1] + 1, row["last_seen"], existing[0]),
            )
            continue
        conn.execute(
            """INSERT INTO functionality_gap_candidates
                 (block_slug, feature_type, css_signal, role_proposed, confidence,
                  seen_count, last_seen, staged_at, applied_at, provenance, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                row["block_slug"], row["feature_type"], row["css_signal"],
                row["role_proposed"], row["confidence"], row["seen_count"],
                row["last_seen"], row["staged_at"], row["applied_at"],
                row["provenance"], row["status"],
            ),
        )
        inserted += 1
    conn.commit()
    return inserted


def detect_batch(
    elements: list[dict],
    run_id: str | None = None,
    write: bool = False,
) -> dict:
    """Run detection across a list of elements; optionally write rows."""
    sgs_conn = sqlite3.connect(str(SGS_DB_PATH))
    all_rows: list[dict] = []
    try:
        for element in elements:
            all_rows.extend(detect_element(element, sgs_conn, run_id=run_id))
    finally:
        sgs_conn.close()

    written = 0
    if write and all_rows:
        uimax_conn = sqlite3.connect(str(UIMAX_DB_PATH))
        try:
            written = write_rows(all_rows, uimax_conn)
        finally:
            uimax_conn.close()
    return {
        "candidates": all_rows,
        "candidate_count": len(all_rows),
        "rows_written": written,
        "mode": "write" if write else "dry-run",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--write", action="store_true",
                        help="Persist gap-candidate rows to uimax (default: dry-run)")
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args(argv)

    if not SGS_DB_PATH.exists():
        sys.exit(f"ERROR: SGS DB not found at {SGS_DB_PATH}")
    if args.write and not UIMAX_DB_PATH.exists():
        sys.exit(f"ERROR: uimax DB not found at {UIMAX_DB_PATH} (required for --write)")

    elements = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(elements, list):
        sys.exit("ERROR: --input must contain a JSON list of element dicts")

    result = detect_batch(elements, run_id=args.run_id, write=args.write)
    payload = json.dumps(result, indent=2, ensure_ascii=False, default=str)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        print(f"[detector] wrote {args.out}")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
