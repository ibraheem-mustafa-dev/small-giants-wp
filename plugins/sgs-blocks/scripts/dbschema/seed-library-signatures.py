#!/usr/bin/env python3
"""Seed ``library_runtime_signals`` -- Tier 4a DOM-runtime-signal lookup table.

WHY THIS EXISTS
----------------
Phase R8 (`.claude/plans/phase-r8-motion-recognition.md` Step 10, Tier 4a)
needs a DB-seeded table mapping each motion library (Lenis / GSAP
ScrollTrigger / Three.js) onto the durable class/attribute strings it
writes into the rendered DOM as a side effect of normal operation --
per the research at
`C:/Users/Bean/.claude/memory/research/2026-09-10-detecting-motion-libraries-in-bundled-js.md`.
The detector module (`converter/resolvers/motion_library_signals.py`) reads
this table at runtime; it never hand-types a signature dict itself -- that
shape of lookup is banned outright by this project's R-31-1 ("no hardcoded
Python dicts for exactly this kind of lookup").

SCHEMA SHAPE (pinned in Step 10)
----------------------------------------------------
Mirrors the `slots` table's `aliases` column exactly -- a JSON array of
strings in a TEXT column -- confirmed live via `PRAGMA table_info(slots)`
before writing this file (there is NO separate `slot_synonyms` table; that
name does not exist in this schema). This is a NEW, purpose-built table
(`library_runtime_signals`), not a repurposing of `slots` itself -- these
rows describe motion-LIBRARY runtime signatures, not SGS block slots, and
mixing the two concepts into one table would make `slots` ambiguous for
every existing reader of that table.

WHY THE THREE SIGNATURE VALUES ARE HARDCODED IN THIS SEEDER (R-31-1 exception,
same class as `seed-motion-shape-signatures.py`'s `_NAMED_EASING_CURVES`)
----------------------------------------------------
There is no file in THIS repository to regex-extract these three facts from
-- they are Lenis's own, GSAP's own, and Three.js's own published runtime
behaviour (external library source/docs), not an SGS shape-to-preset mapping
invented by this project. Exactly like `_NAMED_EASING_CURVES` (the CSS
spec's own fixed cubic-bezier control points) and `_DURATION_TOKEN_MS`
(theme.json's own duration tokens) in the sibling seeder, a fixed external
fact belongs in the ONE seeder that writes it to the DB, never in the
detector that reads it. R-31-1 bans a shape/preset LOOKUP DICT hand-typed
inside a detector/converter module -- it does not ban a seeder recording a
literal, sourced, external fact once.

SOURCES (verified in the 2026-09-10 research pass, high confidence)
----------------------------------------------------
  * Lenis applies `.lenis` / `.lenis-smooth` / `.lenis-scrolling` /
    `.lenis-stopped` classes to `<html>`/`<body>` at runtime.
    https://github.com/darkroomengineering/lenis/blob/main/README.md
  * GSAP ScrollTrigger's `pin: true` injects a literal `.pin-spacer` /
    `.pin-spacer-<id>` wrapper div into the rendered DOM.
    https://gsap.com/docs/v3/Plugins/ScrollTrigger/
  * Three.js (r95+) self-tags its own canvas with
    `data-engine="three.js r<version>"`.
    (Confirmed against Three.js's own `WebGLRenderer` source behaviour.)

Seeded (3 rows): lenis, gsap-scrolltrigger, three-js.
"""

from __future__ import annotations

import json
import os
import sqlite3

# Same resolution convention as seed-motion-shape-signatures.py (this script
# lives outside sgs-wp-engine's own scripts/ dir, so the path is spelled out
# via the user's home directory rather than a relative walk).
DB_PATH = os.path.expanduser(os.path.join("~", ".claude", "skills", "sgs-wp-engine", "sgs-framework.db"))

TABLE = "library_runtime_signals"

# Fixed, sourced, external facts (see module docstring) -- not a shape/
# preset mapping, so R-31-1 does not apply to this literal seed data.
_ROWS: list[dict] = [
    {
        "library_name": "lenis",
        "signal_type": "html_body_class",
        "aliases": ["lenis", "lenis-smooth", "lenis-scrolling", "lenis-stopped"],
        "confirms": "active-smooth-scroll (Lenis)",
        "notes": (
            "Lenis applies these classes to <html>/<body> at runtime as a "
            "side effect of normal operation; survives minification because "
            "they are string literals, not identifiers."
        ),
    },
    {
        "library_name": "gsap-scrolltrigger",
        "signal_type": "wrapper_class_prefix",
        "aliases": ["pin-spacer"],
        "confirms": "active-scroll-pinning (GSAP ScrollTrigger, pin: true)",
        "notes": (
            "ScrollTrigger injects a literal .pin-spacer / .pin-spacer-<id> "
            "wrapper div into the rendered DOM ONLY when pin: true is "
            "actually used -- confirms active pinning, not just 'GSAP is "
            "loaded on the page'."
        ),
    },
    {
        "library_name": "three-js",
        "signal_type": "canvas_attr_prefix",
        "aliases": ["three.js"],
        "confirms": "genuine-webgl-rendering (Three.js, self-tagged r95+)",
        "notes": (
            "Three.js (r95+) self-tags its own <canvas> with "
            "data-engine=\"three.js r<version>\" -- one DOM attribute "
            "confirms both 'Three.js' and 'genuinely rendering', no "
            "execution required."
        ),
    },
]


def ensure_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {TABLE} (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            library_name  TEXT NOT NULL,
            signal_type   TEXT NOT NULL
                CHECK(signal_type IN (
                    'html_body_class', 'wrapper_class_prefix', 'canvas_attr_prefix'
                )),
            aliases       TEXT NOT NULL,
            confirms      TEXT NOT NULL,
            notes         TEXT,
            created_at    TEXT DEFAULT (datetime('now'))
        )
        """
    )
    conn.execute(
        f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{TABLE}_library_name ON {TABLE}(library_name)"
    )


def seed(conn: sqlite3.Connection, rows: list[dict]) -> int:
    ensure_table(conn)
    conn.execute(f"DELETE FROM {TABLE}")  # idempotent full reseed -- table is derived, never hand-edited
    conn.executemany(
        f"""
        INSERT INTO {TABLE}
            (library_name, signal_type, aliases, confirms, notes)
        VALUES
            (:library_name, :signal_type, :aliases, :confirms, :notes)
        """,
        [
            {**r, "aliases": json.dumps(r["aliases"])}
            for r in rows
        ],
    )
    conn.commit()
    return len(rows)


def main() -> int:
    conn = sqlite3.connect(DB_PATH)
    try:
        n = seed(conn, _ROWS)
    finally:
        conn.close()

    print(f"Seeded {n} rows into {TABLE} ({DB_PATH})")
    for r in _ROWS:
        print(f"  {r['library_name']:<20} {r['signal_type']:<22} {r['aliases']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
