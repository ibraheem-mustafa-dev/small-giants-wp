#!/usr/bin/env python3
"""attribute-gap-writer.py -- Spec 31 Phase 5a.4 attribute-gap writes.

Single FR8-compliant entry point that inserts rows into
uimax.attribute_gap_candidates with the mandatory provenance + run_id
stamp on every row. Sibling of functionality-gap-detector.py (5a.3).

Schema (uimax.attribute_gap_candidates as of Spec 31 Phase 2):
    block_slug TEXT
    selector TEXT
    css_property TEXT
    value_seen TEXT
    role_proposed TEXT        -- output of bucket-c-classifier (5a.2)
    confidence REAL
    seen_count INTEGER default 1
    last_seen TEXT
    staged_at TEXT
    applied_at TEXT
    provenance TEXT           -- 'sgs-clone:<run_id>'  (5a.4 contract)
    status TEXT default 'pending'

Input shape (per gap):
    {
      "block_slug": "sgs/hero",      # nearest matched block, or None
      "selector": ".hero-cta",        # selector that surfaced the gap
      "css_property": "background-color",
      "value_seen": "#fff7ed",
      "role_proposed": "color",      # from classifier (5a.2), nullable
      "confidence": 0.83
    }

De-dupes against (block_slug, selector, css_property) so repeat clone
runs over the same draft don't proliferate identical rows.

Dry-run is the default mode -- enable `write=True` to persist.

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

UIMAX_DB_PATH = Path(
    os.environ.get(
        "UIMAX_DB",
        str(Path.home() / ".agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db"),
    )
)


def _now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _build_row(gap: dict, run_id: str | None) -> dict:
    """Augment a gap dict with the row-shape fields required by the FR8 schema.

    Provenance contract: every row carries `provenance='sgs-clone:<run_id>'`
    (or 'sgs-clone' bare when run_id missing). This is the traceability
    anchor that lets operators filter to a single clone run when
    reviewing gap candidates.
    """
    return {
        "block_slug":   gap.get("block_slug"),
        "selector":     gap.get("selector"),
        "css_property": gap.get("css_property"),
        "value_seen":   gap.get("value_seen"),
        "role_proposed":gap.get("role_proposed"),
        "confidence":   gap.get("confidence"),
        "seen_count":   1,
        "last_seen":    _now_iso(),
        "staged_at":    _now_iso(),
        "applied_at":   None,
        "provenance":   f"sgs-clone:{run_id}" if run_id else "sgs-clone",
        "status":       "pending",
    }


def write_rows(rows: list[dict], conn: sqlite3.Connection) -> dict:
    """Insert / upsert attribute-gap rows. Returns counts."""
    inserted = 0
    bumped = 0
    for row in rows:
        existing = conn.execute(
            """SELECT id, seen_count FROM attribute_gap_candidates
               WHERE COALESCE(block_slug,'') = COALESCE(?,'')
                 AND COALESCE(selector,'')   = COALESCE(?,'')
                 AND COALESCE(css_property,'') = COALESCE(?,'')""",
            (row["block_slug"], row["selector"], row["css_property"]),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE attribute_gap_candidates SET seen_count=?, last_seen=? WHERE id=?",
                (existing[1] + 1, row["last_seen"], existing[0]),
            )
            bumped += 1
            continue
        conn.execute(
            """INSERT INTO attribute_gap_candidates
                 (block_slug, selector, css_property, value_seen, role_proposed,
                  confidence, seen_count, last_seen, staged_at, applied_at,
                  provenance, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                row["block_slug"], row["selector"], row["css_property"],
                row["value_seen"], row["role_proposed"], row["confidence"],
                row["seen_count"], row["last_seen"], row["staged_at"],
                row["applied_at"], row["provenance"], row["status"],
            ),
        )
        inserted += 1
    conn.commit()
    return {"inserted": inserted, "bumped": bumped}


def stage(gaps: list[dict], run_id: str | None = None, write: bool = False) -> dict:
    """Build rows from gap descriptors + optionally persist them."""
    rows = [_build_row(g, run_id) for g in gaps]
    counts = {"inserted": 0, "bumped": 0}
    if write and rows:
        if not UIMAX_DB_PATH.exists():
            raise RuntimeError(f"uimax DB not found at {UIMAX_DB_PATH}")
        conn = sqlite3.connect(str(UIMAX_DB_PATH))
        try:
            counts = write_rows(rows, conn)
        finally:
            conn.close()
    return {
        "rows": rows,
        "row_count": len(rows),
        "inserted": counts["inserted"],
        "bumped": counts["bumped"],
        "mode": "write" if write else "dry-run",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--write", action="store_true",
                        help="Persist rows to uimax (default: dry-run)")
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args(argv)

    if not args.input.exists():
        sys.exit(f"ERROR: input not found at {args.input}")
    gaps = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(gaps, list):
        sys.exit("ERROR: --input must contain a JSON list")

    result = stage(gaps, run_id=args.run_id, write=args.write)
    payload = json.dumps(result, indent=2, ensure_ascii=False, default=str)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        print(f"[attr-gap-writer] wrote {args.out}")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
