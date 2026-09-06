#!/usr/bin/env python3
"""seed-component-adoption.py — write the unification ADOPTION LEDGER to `components`.

WHY
---
Bean, 2026-08-24. The `components` table held 13 rows of editor JS with placeholder
descriptions and `props` all NULL — a file listing wearing the name. It had ZERO
readers and ZERO writers inside this repo (grepped across .py/.js/.php); the rows
came from an out-of-repo populate-db.py, which is why every description said
nothing. Rebuilt here as the registry of every shared helper and injector built for
unification, WITH ADOPTION COUNTS, and the writer now lives IN the repo so it
refreshes with /sgs-update instead of needing a manual out-of-tree run.

The counts are what make it an audit rather than a list: borderRow.js has 0
adopters while its two siblings have 22 and 7, and helpers-box.php sat at 4
adopters until a codemod migrated 121 definitions across 57 files.

DETECTION LIVES IN THE NODE SCANNER, NOT HERE
---------------------------------------------
`scan-component-adoption.js` owns every measurement, because resolving a block ->
shared-component hop needs inspector-scan's own resolver (core/components.js's
getSharedOwnerScan). Re-implementing that in Python would be a SECOND mechanism,
and two mechanisms are how two numbers start disagreeing. This file is a thin
writer: run the scanner, validate, write.

Usage:
    python plugins/sgs-blocks/scripts/seed-component-adoption.py           # dry run
    python plugins/sgs-blocks/scripts/seed-component-adoption.py --apply   # write
    python plugins/sgs-blocks/scripts/seed-component-adoption.py --check   # gate

UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
SCANNER = SCRIPTS / "scan-component-adoption.js"

VALID_FAMILIES = {
    "editor-component", "util", "render-helper", "injector", "wrapper",
    "render-helper-function",
}


def resolve_db() -> Path:
    """Resolve the live DB the way sgs-db.py does, and FAIL CLOSED on a stub.

    ⚠ Several sgs-framework.db files exist and three are 0-BYTE STUBS. Opening a
    stub yields zero rows, which is indistinguishable from a clean answer — this
    repo's signature failure mode.
    """
    candidates = [
        Path.home() / ".agents/skills/sgs-wp-engine/sgs-framework.db",
        Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db",
    ]
    for p in candidates:
        if p.exists() and p.stat().st_size > 100_000:
            return p
    raise SystemExit(
        "FATAL: no non-stub sgs-framework.db found. Checked:\n  "
        + "\n  ".join(str(c) for c in candidates)
        + "\nRefusing to write — a 0-byte stub reads as a clean empty table."
    )


def run_scanner() -> list[dict]:
    proc = subprocess.run(
        ["node", str(SCANNER), "--json"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if proc.returncode != 0:
        raise SystemExit(
            f"FATAL: scanner exited {proc.returncode}. It fails closed on a duplicate\n"
            f"surface name (the `name` column is the PRIMARY KEY), so this is a real\n"
            f"stop, not a flake.\n--- stderr ---\n{proc.stderr[:4000]}"
        )
    data = json.loads(proc.stdout)
    rows = data["rows"]
    if not rows:
        raise SystemExit("FATAL: scanner returned zero surfaces — a broken probe, not a clean tree.")
    bad = sorted({r["family"] for r in rows} - VALID_FAMILIES)
    if bad:
        raise SystemExit(f"FATAL: unknown family value(s) {bad} — update VALID_FAMILIES deliberately.")
    return rows


def ensure_schema(conn: sqlite3.Connection) -> None:
    """Add the ledger columns idempotently.

    The original CHECK on component_type only permits editor/util/extension, which
    cannot express render-helper / injector / wrapper. `family` is added as the new
    discriminator rather than fighting that constraint; component_type is left
    alone so nothing depending on the old shape breaks.
    """
    cols = {r[1] for r in conn.execute("PRAGMA table_info(components)")}
    for name, decl in (
        ("family", "TEXT"),
        ("functionality", "TEXT"),
        ("adopters", "INTEGER"),
        ("adopter_list", "TEXT"),
    ):
        if name not in cols:
            conn.execute(f"ALTER TABLE components ADD COLUMN {name} {decl}")


def legacy_type(family: str) -> str:
    """Keep the pre-existing CHECK-constrained column satisfied and meaningful."""
    return {
        "editor-component": "editor",
        "util": "util",
        "render-helper-function": "helper-function",
    }.get(family, "extension")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--apply", action="store_true", help="write to the DB (default: dry run)")
    ap.add_argument("--check", action="store_true", help="exit 1 if the table is stale")
    args = ap.parse_args()

    rows = run_scanner()
    db = resolve_db()
    conn = sqlite3.connect(db)
    ensure_schema(conn)

    if args.check:
        have = {
            r[0]: (r[1], r[2])
            for r in conn.execute("SELECT name, family, adopters FROM components")
        }
        want = {r["name"]: (r["family"], r["adopters"]) for r in rows}
        if have != want:
            missing = sorted(set(want) - set(have))
            extra = sorted(set(have) - set(want))
            drifted = sorted(k for k in set(want) & set(have) if want[k] != have[k])
            print("components table is STALE.")
            if missing:
                print(f"  missing ({len(missing)}): {', '.join(missing[:12])}")
            if extra:
                print(f"  no longer on disk ({len(extra)}): {', '.join(extra[:12])}")
            if drifted:
                print(f"  adoption changed ({len(drifted)}): {', '.join(drifted[:12])}")
            print("  Re-run: python plugins/sgs-blocks/scripts/seed-component-adoption.py --apply")
            conn.close()
            return 1
        print(f"components table is fresh — {len(rows)} surfaces.")
        conn.close()
        return 0

    if not args.apply:
        fams: dict[str, int] = {}
        for r in rows:
            fams[r["family"]] = fams.get(r["family"], 0) + 1
        zero = [r for r in rows if r["adopters"] == 0]
        print(f"DRY RUN — {len(rows)} surfaces would be written "
              f"({' '.join(f'{k}={v}' for k, v in sorted(fams.items()))})")
        print(f"  zero-adoption: {len(zero)} — {', '.join(r['name'] for r in zero[:10])}")
        print("  re-run with --apply to write")
        conn.close()
        return 0

    # Full replace: the ledger is DERIVED, so a stale row is a wrong row. The
    # container_kind column (D762) drifted for exactly the opposite reason — its
    # writer only ever SET and never cleared, so a surface that stopped
    # qualifying kept its old value permanently. Replace-not-merge here by design.
    conn.execute("DELETE FROM components")
    conn.executemany(
        "INSERT INTO components (name, component_type, file_path, description, props, "
        "family, functionality, adopters, adopter_list) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        [
            (
                r["name"], legacy_type(r["family"]), r["file_path"],
                r["functionality"] or None, None,
                r["family"], r["functionality"] or None,
                r["adopters"], ",".join(r["adopter_list"]),
            )
            for r in rows
        ],
    )
    conn.commit()
    written = conn.execute("SELECT COUNT(*) FROM components").fetchone()[0]
    if written != len(rows):
        conn.close()
        raise SystemExit(f"FATAL: wrote {written} rows, expected {len(rows)}.")
    zero = conn.execute("SELECT COUNT(*) FROM components WHERE adopters = 0").fetchone()[0]
    print(f"components: wrote {written} surfaces, {zero} with zero adopters.")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
