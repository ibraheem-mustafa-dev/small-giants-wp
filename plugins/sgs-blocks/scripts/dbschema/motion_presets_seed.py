#!/usr/bin/env python3
"""motion_presets_seed.py -- seeds `motion_presets` from scripts/data/motion-presets.json (Spec 38A FR-38A-6).

The file is the one source of presets (hover, entrance, the reconciled keyframe presets and the Intensity trios);
the table is the runtime query target for the cloner and the generators (R-31-1). Before any row is written the
file is validated against `schemas/motion.schema.json` by `validate-motion-presets.mjs` (the cloning tool's own
validator), and a preset that fails raises `MotionPresetError` naming every failing slug, so a bad value stops the
seeder with a non-zero exit instead of reaching the DB. Rows the file no longer lists are deleted.

Importing this module touches nothing. `seed_motion_presets(conn)` is called by `seed_reference_data.seed_all`.

Usage:
    python dbschema/motion_presets_seed.py [--db PATH] [--presets FILE]   seed (default: $SGS_FRAMEWORK_DB or the shared DB)
    python dbschema/motion_presets_seed.py --self-test                    exit 0 when a planted bad preset is refused
                                                                           naming it, and the real file seeds clean
"""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
_DEFAULT_FILE = _SCRIPTS_DIR / "data" / "motion-presets.json"
_VALIDATOR = _SCRIPTS_DIR / "validate-motion-presets.mjs"
_MIGRATION = _SCRIPTS_DIR / "migrations" / "2026-10-13-motion-presets-and-fx-columns.py"
_COLUMNS = (
    "slug", "panel", "effect", "family", "kind", "intensity", "label",
    "values_json", "devices_json", "trigger", "target_level", "source", "position",
)


class MotionPresetError(Exception):
    """The presets file failed validation; the message names each failing slug."""


def presets_file() -> Path:
    """$SGS_MOTION_PRESETS_FILE when set, else scripts/data/motion-presets.json."""
    override = os.environ.get("SGS_MOTION_PRESETS_FILE")
    return Path(override) if override else _DEFAULT_FILE


def validate_presets(path: Path) -> int:
    """Run the schema validator over `path`; return the entry count or raise MotionPresetError."""
    node = shutil.which("node")
    if not node:
        raise MotionPresetError("node is not on PATH, so the presets cannot be validated against the motion schema")
    proc = subprocess.run([node, str(_VALIDATOR), str(path)], capture_output=True, text=True, encoding="utf-8", timeout=120)
    try:
        verdict = json.loads(proc.stdout.strip().splitlines()[-1])
    except (IndexError, ValueError):
        raise MotionPresetError(f"the preset validator produced no verdict (exit {proc.returncode}): {proc.stderr.strip()[:400]}") from None
    if verdict["failures"] or proc.returncode:
        detail = "; ".join(f"{f['slug']}: {' | '.join(f['problems'][:3])}" for f in verdict["failures"]) or proc.stderr.strip()[:400]
        raise MotionPresetError(f"{len(verdict['failures'])} preset(s) failed validation: {detail}")
    return int(verdict["count"])


def _rows(path: Path) -> list[tuple]:
    entries = json.loads(path.read_text(encoding="utf-8"))["presets"]
    dump = lambda v: json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)  # noqa: E731
    return [
        (e["slug"], e["panel"], e["effect"], e["family"], e["kind"], e["intensity"], e["label"],
         dump(e["values"]), dump(e.get("devices") or {}), e["trigger"], e["target"], e["source"], i)
        for i, e in enumerate(entries)
    ]


def seed_motion_presets(conn: sqlite3.Connection, path: Path | None = None) -> tuple[int, int]:
    """Validate then upsert every preset by slug and delete the rows the file no longer lists.

    Returns (rows now in the file, rows deleted). Validation runs before the first write.
    """
    path = path or presets_file()
    validate_presets(path)
    rows = _rows(path)
    assignments = ", ".join(f"{c}=excluded.{c}" for c in _COLUMNS[1:])
    conn.executemany(
        f"INSERT INTO motion_presets ({', '.join(_COLUMNS)}) VALUES ({', '.join('?' for _ in _COLUMNS)}) "  # noqa: S608
        f"ON CONFLICT(slug) DO UPDATE SET {assignments}",
        rows,
    )
    marks = ",".join("?" for _ in rows)
    deleted = conn.execute(f"DELETE FROM motion_presets WHERE slug NOT IN ({marks})", [r[0] for r in rows]).rowcount  # noqa: S608
    conn.commit()
    return len(rows), deleted


def _scalar(db: Path, sql: str, params: tuple = ()) -> int:
    with contextlib.closing(sqlite3.connect(db)) as con:
        return con.execute(sql, params).fetchone()[0]


def _self_test() -> int:
    """A stub DB gets the real migration; the real seeder entry point then runs on the real file (must pass) and on a
    copy with one out-of-band preset appended (must exit non-zero naming that preset)."""
    plant = "planted-out-of-band"
    ok = True
    with tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "fw.db"
        with contextlib.closing(sqlite3.connect(db)) as con:
            con.execute("CREATE TABLE fx_effects (effect TEXT PRIMARY KEY)")
            con.commit()
        env = {**os.environ, "SGS_FRAMEWORK_DB": str(db)}
        mig = subprocess.run([sys.executable, str(_MIGRATION)], env=env, capture_output=True, text=True)
        seeder = [sys.executable, str(Path(__file__).resolve().parent / "seed_reference_data.py"), "--db", str(db)]
        good = subprocess.run(seeder, env={**env, "SGS_MOTION_PRESETS_FILE": str(_DEFAULT_FILE)}, capture_output=True, text=True)
        count = _scalar(db, "SELECT COUNT(*) FROM motion_presets")
        expected = len(json.loads(_DEFAULT_FILE.read_text(encoding="utf-8"))["presets"])
        passed = mig.returncode == 0 and good.returncode == 0 and count == expected
        print(f"  {'PASS' if passed else 'FAIL'}  positive control: real file seeds clean ({count} of {expected} rows, exit {good.returncode})")
        ok &= passed

        doc = json.loads(_DEFAULT_FILE.read_text(encoding="utf-8"))
        doc["presets"].append({
            "slug": plant, "panel": "hover", "effect": None, "family": plant, "kind": "preset", "intensity": None,
            "label": "Planted", "values": {"scale": 99}, "devices": {}, "trigger": "hover", "target": "part", "source": "self-test",
        })
        bad_file = Path(tmp) / "planted.json"
        bad_file.write_text(json.dumps(doc), encoding="utf-8")
        bad = subprocess.run(seeder, env={**env, "SGS_MOTION_PRESETS_FILE": str(bad_file)}, capture_output=True, text=True)
        caught = bad.returncode != 0 and plant in bad.stderr
        planted_rows = _scalar(db, "SELECT COUNT(*) FROM motion_presets WHERE slug=?", (plant,))
        caught &= planted_rows == 0
        print(f"  {'PASS' if caught else 'FAIL'}  planted scale 99: seeder exit {bad.returncode}, named '{plant}': {plant in bad.stderr}, row written: {planted_rows}")
        ok &= caught
    print(f"[motion-presets-seed] self-test {'passed' if ok else 'FAILED'}")
    return 0 if ok else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", type=Path)
    parser.add_argument("--presets", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    if args.self_test:
        return _self_test()
    from seed_reference_data import default_db_path  # noqa: PLC0415

    conn = sqlite3.connect(args.db or default_db_path())
    try:
        written, deleted = seed_motion_presets(conn, args.presets)
    except MotionPresetError as exc:
        sys.stderr.write(f"[motion-presets-seed] {exc}\n")
        return 1
    finally:
        conn.close()
    print(f"[motion-presets-seed] {written} preset(s) seeded, {deleted} deleted")
    return 0


if __name__ == "__main__":
    sys.exit(main())
