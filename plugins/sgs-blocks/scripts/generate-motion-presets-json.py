#!/usr/bin/env python3
"""generate-motion-presets-json.py -- writes src/components/motion/generated-motion-presets.json.

The editor atoms (Intensity picker, Customised reset values, token-pointing preset stamps) read presets from this
generated copy because the framework DB is a local dev knowledge base that is never deployed. The copy is built from
`scripts/data/motion-presets.json`, the one source `motion_presets` is itself seeded from, so the two always carry the
same rows; when the framework DB has a `motion_presets` table it is compared with the source and a difference is
reported (the DB then needs `dbschema/seed_reference_data.py`).

The output has no timestamp and a fixed key order, so a second run writes identical bytes (build-deploy gates on dirty
deployed files; a file that changes every run would make its --allow-dirty override reflexive).

Usage:
    python scripts/generate-motion-presets-json.py            write the generated file
    python scripts/generate-motion-presets-json.py --check    diff in memory, never write; exit 1 when stale
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

SCRIPTS_DIR = Path(__file__).resolve().parent
SOURCE_FILE = SCRIPTS_DIR / "data" / "motion-presets.json"
OUTPUT_FILE = SCRIPTS_DIR.parent / "src" / "components" / "motion" / "generated-motion-presets.json"
DB_PATH = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db")
KEYS = ("slug", "panel", "effect", "family", "kind", "intensity", "label", "values", "devices", "trigger", "target")


def render() -> tuple[str, list[dict]]:
    """The generated file's text and its preset entries, in the source file's order (the picker's display order)."""
    entries = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))["presets"]
    out = [{k: e[k] for k in KEYS} for e in entries]
    return json.dumps({"presets": out}, indent="\t", sort_keys=True, ensure_ascii=False) + "\n", out


def db_drift(entries: list[dict]) -> str | None:
    """A message when the framework DB's motion_presets differs from the source; None when equal or not comparable."""
    if not DB_PATH.exists():
        return None
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        if not con.execute("SELECT 1 FROM sqlite_master WHERE name='motion_presets'").fetchone():
            return None
        rows = con.execute(
            "SELECT slug, panel, effect, family, kind, intensity, label, values_json, devices_json, trigger, target_level "
            "FROM motion_presets ORDER BY position"
        ).fetchall()
    finally:
        con.close()
    dump = lambda v: json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)  # noqa: E731
    want = [
        (e["slug"], e["panel"], e["effect"], e["family"], e["kind"], e["intensity"], e["label"],
         dump(e["values"]), dump(e["devices"]), e["trigger"], e["target"])
        for e in entries
    ]
    if rows == want:
        return None
    return f"motion_presets in {DB_PATH} has {len(rows)} row(s) that differ from the {len(want)} in {SOURCE_FILE.name}; run dbschema/seed_reference_data.py"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="Compare in memory with the committed file; never write.")
    args = parser.parse_args()
    text, entries = render()
    drift = db_drift(entries)
    if drift:
        print(f"[generate-motion-presets-json] NOTE: {drift}", file=sys.stderr)
    if args.check:
        if not OUTPUT_FILE.exists() or OUTPUT_FILE.read_text(encoding="utf-8") != text:
            print(
                f"[generate-motion-presets-json] STALE: {OUTPUT_FILE} no longer matches {SOURCE_FILE.name}. "
                "Run without --check and commit the result.",
                file=sys.stderr,
            )
            return 1
        print(f"[generate-motion-presets-json] OK: {OUTPUT_FILE.name} matches {SOURCE_FILE.name} ({len(entries)} presets).")
        return 1 if drift else 0
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(text, encoding="utf-8", newline="\n")
    print(f"[generate-motion-presets-json] Generated {OUTPUT_FILE} with {len(entries)} presets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
