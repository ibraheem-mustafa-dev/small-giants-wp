#!/usr/bin/env python3
"""Migration runner + tracking table for the SGS knowledge-base DB.

WHY THIS EXISTS
---------------
The knowledge base is a gitignored SQLite file that cannot be rebuilt. Its
foundational tables exist only because ~29 one-off scripts in
``scripts/migrations/`` were each run by hand, once, with no runner, no replay
and no record of which ran. Every "it worked last month" regression on this
track traces back to that. ``schema_migrations`` gives the file a memory.

DESIGN NOTES (each is load-bearing -- do not "simplify" them away)
------------------------------------------------------------------
* **Never globs ``migrations/*.py``.** It reads ``migration-manifest.json``
  and replays ONLY entries classified ``DB-MIGRATION``. That directory also
  holds non-DB one-shots -- ``2026-07-16-fix-spec-drift.py`` rewrites Spec 17
  markdown and *raises* on a missed anchor, which would abort a rebuild for a
  reason that has nothing to do with the database.

* **Every migration runs as a subprocess under ``sandbox.py``, uniformly, with
  no per-file special case.** Measured 2026-08-02: exactly two migrations use
  ``argparse`` and both expose only ``--dry-run``; *no* migration accepts a
  ``--db`` argument. (An earlier plan said two did and told the runner to pass
  it -- that instruction targeted nothing and would have made argparse exit 2,
  which this runner would have recorded as a genuine failure.) Redirecting
  ``HOME`` is therefore the only mechanism, and it needs no exceptions.

* **Filename order is the replay order -- an ACCEPTED RISK, not a fact.**
  Verified by mtime: filename sort does not match true creation order, with
  same-date collisions on 05-16, 06-07, 06-13, 07-04, 07-05 and 07-22. On
  2026-07-05 the real order was drop -> prune -> fontstyle -> register-image ->
  register-tag, which filename sort gets wrong. This is tolerable today ONLY
  because adoption uses ``--mark-applied``, which never replays anything. If a
  real replay is ever performed, this assumption must be re-examined first.

* **``--apply`` refuses to touch the live database** without an explicit
  ``--allow-live``. Replaying history over the only copy of an irreplaceable
  file is not something to do by accident.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
MIGRATIONS_DIR = SCRIPTS / "migrations"
MANIFEST = HERE / "migration-manifest.json"

sys.path.insert(0, str(HERE))
from sandbox import (  # noqa: E402
    SandboxGuardError,
    live_db_paths,
    sandbox,
)

DB_CLASS = "DB-MIGRATION"


class MigrationError(RuntimeError):
    pass


# --------------------------------------------------------------------------
# manifest + tracking table
# --------------------------------------------------------------------------

def load_deleted_set(manifest: Path = MANIFEST) -> list[str]:
    """Names the manifest records as DELIBERATELY DELETED, not lost.

    Returns [] when the manifest is absent or carries no deleted block, so this is
    additive: an older manifest simply reports every absent file as MISSING, exactly
    as before.
    """
    if not manifest.exists():
        return []
    try:
        import json as _json
        blk = _json.loads(manifest.read_text(encoding="utf-8")).get("deleted_2026_08_02")
    except (OSError, ValueError):
        return []
    return list(blk.get("names", [])) if isinstance(blk, dict) else []


def load_replay_set(manifest: Path = MANIFEST) -> list[str]:
    """Filenames to replay, in filename order. DB-MIGRATION entries only."""
    if not manifest.exists():
        raise MigrationError(
            f"manifest not found: {manifest}\n"
            "Run Step 0.0(b) first -- the replay set is defined by the manifest, "
            "never by globbing migrations/*.py."
        )
    data = json.loads(manifest.read_text(encoding="utf-8"))
    entries = data.get("migrations", [])
    if not entries:
        raise MigrationError(f"manifest {manifest} lists no migrations")

    unclassified = [e["filename"] for e in entries
                    if e.get("classification") == "UNCLASSIFIED"]
    if unclassified:
        raise MigrationError(
            "manifest contains UNCLASSIFIED entries -- refusing to guess: "
            + ", ".join(sorted(unclassified))
        )
    return sorted(e["filename"] for e in entries
                  if e.get("classification") == DB_CLASS)


def ensure_tracking(con: sqlite3.Connection) -> None:
    con.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations ("
        "filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
    )
    con.commit()


def applied_set(con: sqlite3.Connection) -> set[str]:
    ensure_tracking(con)
    return {r[0] for r in con.execute("SELECT filename FROM schema_migrations")}


def applied_set_readonly(con: sqlite3.Connection) -> set[str]:
    """Read the tracking table WITHOUT creating it.

    ``--status`` must never mutate the database. The first version of this
    module reused :func:`applied_set` for status, so merely *asking* what was
    applied silently created ``schema_migrations`` -- caught 2026-08-02 when a
    before/after comparison showed the table already present before adoption
    ran. A read-only command that writes is precisely the class of silent
    mutation this whole phase exists to eliminate.
    """
    present = con.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
    ).fetchone()
    if not present:
        return set()
    return {r[0] for r in con.execute("SELECT filename FROM schema_migrations")}


def _record(con: sqlite3.Connection, filename: str) -> None:
    con.execute(
        "INSERT OR REPLACE INTO schema_migrations(filename, applied_at) VALUES (?,?)",
        (filename, datetime.now(timezone.utc).isoformat(timespec="seconds")),
    )
    con.commit()


def _is_live(path: Path) -> bool:
    try:
        resolved = path.resolve()
    except OSError:
        resolved = path.absolute()
    for live in live_db_paths():
        try:
            if resolved == live.resolve():
                return True
        except OSError:
            pass
        try:
            if path.exists() and live.exists() and os.stat(path).st_ino == os.stat(live).st_ino:
                return True
        except OSError:
            pass
    return False


# --------------------------------------------------------------------------
# commands
# --------------------------------------------------------------------------

def cmd_status(db: Path, manifest: Path, migrations_dir: Path) -> int:
    replay = load_replay_set(manifest)
    # read-only: opened with mode=ro AND using the non-creating reader, so
    # asking the status can never change the database.
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        done = applied_set_readonly(con)
    finally:
        con.close()

    # A migration whose FILE was deliberately deleted is not "missing" — it is
    # retired. Phase 1 (2026-08-02) deleted 28 of them once their effects became
    # reproducible from committed seed files, and the DB correctly still records
    # them as applied. Without this distinction `--status` printed 27 lines of
    # "FILE MISSING ON DISK" and a scary MISSING total for a deliberate act, which
    # is exactly the sort of alarming-but-meaningless gate output that trains
    # people to ignore gates.
    retired = set(load_deleted_set(manifest))

    pending = 0
    missing = 0
    retired_seen = 0
    for name in replay:
        state = "APPLIED" if name in done else "PENDING"
        if state == "PENDING":
            pending += 1
        flag = ""
        if not (migrations_dir / name).exists():
            if name in retired:
                flag = "  (file retired 2026-08-02 — effects now seed-file-derived)"
                retired_seen += 1
            else:
                flag = "  <-- FILE MISSING ON DISK"
                missing += 1
        print(f"  {state:8} {name}{flag}")

    orphans = sorted(done - set(replay))
    for name in orphans:
        print(f"  {'ORPHAN':8} {name}  <-- recorded but not in the manifest")

    print(f"\n  db       : {db}")
    print(f"  manifest : {len(replay)} DB-MIGRATION entries")
    print(f"  applied  : {len(replay) - pending}")
    print(f"  pending  : {pending}")
    if retired_seen:
        print(f"  retired  : {retired_seen} file(s) deliberately deleted (Phase 1); "
              f"still recorded as applied, effects reproduced from scripts/data/*.json")
    if missing:
        print(f"  MISSING  : {missing} file(s) named in the manifest are absent on disk "
              f"and are NOT in the manifest's deleted list — investigate")
    if orphans:
        print(f"  orphans  : {len(orphans)}")
    return 1 if (missing or orphans) else 0


def cmd_mark_applied(db: Path, manifest: Path) -> int:
    """Record every DB migration as applied WITHOUT running it (adoption)."""
    replay = load_replay_set(manifest)
    con = sqlite3.connect(str(db))
    try:
        before = applied_set(con)
        for name in replay:
            _record(con, name)
        after = applied_set(con)
    finally:
        con.close()
    newly = sorted(set(replay) - before)
    print(f"marked applied: {len(newly)} newly recorded, "
          f"{len(before & set(replay))} already recorded")
    for n in newly:
        print(f"  + {n}")
    print(f"schema_migrations now holds {len(after)} row(s)")
    return 0


def cmd_apply(db: Path, manifest: Path, migrations_dir: Path,
              allow_live: bool = False) -> int:
    """Replay PENDING migrations, in order, stopping at the first failure."""
    if _is_live(db) and not allow_live:
        print(
            f"REFUSING: {db} is the LIVE database.\n"
            "  --apply replays migration history; doing that to the only copy of an\n"
            "  irreplaceable, gitignored file is not something to do by accident.\n"
            "  Pass --allow-live if you genuinely mean it.",
            file=sys.stderr,
        )
        return 2

    replay = load_replay_set(manifest)
    con = sqlite3.connect(str(db))
    try:
        done = applied_set(con)
    finally:
        con.close()

    pending = [n for n in replay if n not in done]
    if not pending:
        print("nothing pending -- no migration was run")
        return 0

    print(f"applying {len(pending)} pending migration(s) to {db}")
    failed: str | None = None
    ran = 0

    # Seed a sandbox from the target, replay inside it, copy back only on
    # success. Migrations hardcode Path.home(), so this is the sole mechanism.
    with sandbox(seed_from=db if db.exists() and db.stat().st_size else None) as run:
        for name in pending:
            script = migrations_dir / name
            if not script.exists():
                failed = f"{name}: file missing on disk at {script}"
                print(f"  FAIL  {name} -- missing on disk", file=sys.stderr)
                break
            proc = run.run_python(script)
            if proc.returncode != 0:
                failed = f"{name}: exit {proc.returncode}"
                print(f"  FAIL  {name} -- exit {proc.returncode}", file=sys.stderr)
                tail = (proc.stderr or proc.stdout or "").strip().splitlines()[-6:]
                for line in tail:
                    print(f"        {line}", file=sys.stderr)
                break
            sbcon = sqlite3.connect(str(run.db))
            try:
                _record(sbcon, name)
            finally:
                sbcon.close()
            ran += 1
            print(f"  ok    {name}")

        if failed is None:
            src = sqlite3.connect(f"file:{run.db}?mode=ro", uri=True)
            dst = sqlite3.connect(str(db))
            with dst:
                src.backup(dst)
            dst.close()
            src.close()

    if failed is not None:
        print(
            f"\nSTOPPED at {failed}\n"
            f"  {ran} migration(s) succeeded inside the sandbox but were DISCARDED --\n"
            f"  {db} is untouched. Fix the failure and re-run.",
            file=sys.stderr,
        )
        return 1

    print(f"\napplied {ran} migration(s); {db} updated")
    return 0


# --------------------------------------------------------------------------
# self-test -- prove --apply can FAIL
# --------------------------------------------------------------------------

def _self_test() -> int:
    """A runner that cannot fail reads green forever. Prove this one can."""
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="sgs-migrate-selftest-"))
    mdir = tmp / "migrations"
    mdir.mkdir()

    good = mdir / "2026-01-01-good.py"
    good.write_text(
        "import sqlite3, pathlib\n"
        "db = pathlib.Path.home()/'.claude'/'skills'/'sgs-wp-engine'/'sgs-framework.db'\n"
        "c = sqlite3.connect(str(db))\n"
        "c.execute('CREATE TABLE IF NOT EXISTS canary(x INTEGER)')\n"
        "c.execute('INSERT INTO canary VALUES (1)')\n"
        "c.commit(); c.close()\n",
        encoding="utf-8",
    )
    bad = mdir / "2026-01-02-broken.py"
    bad.write_text(
        "import sys\n"
        "sys.stderr.write('deliberate failure for the self-test\\n')\n"
        "sys.exit(3)\n",
        encoding="utf-8",
    )
    never = mdir / "2026-01-03-never-runs.py"
    never.write_text(
        "import sqlite3, pathlib\n"
        "db = pathlib.Path.home()/'.claude'/'skills'/'sgs-wp-engine'/'sgs-framework.db'\n"
        "c = sqlite3.connect(str(db))\n"
        "c.execute('CREATE TABLE IF NOT EXISTS should_not_exist(x INTEGER)')\n"
        "c.commit(); c.close()\n",
        encoding="utf-8",
    )

    manifest = tmp / "migration-manifest.json"
    manifest.write_text(json.dumps({"migrations": [
        {"filename": good.name, "classification": DB_CLASS},
        {"filename": bad.name, "classification": DB_CLASS},
        {"filename": never.name, "classification": DB_CLASS},
        {"filename": "not-a-db.py", "classification": "NOT-A-DB-MIGRATION"},
    ]}), encoding="utf-8")

    # NEGATIVE CONTROL: a failing migration must stop the run, exit non-zero,
    # and leave NO schema_migrations row behind.
    target = tmp / "target.db"
    sqlite3.connect(str(target)).close()
    print("negative control -- a broken migration must fail the run:")
    rc = cmd_apply(target, manifest, mdir)
    if rc == 0:
        failures.append("--apply returned 0 despite a broken migration")
        print("  FAIL  exit code was 0")
    else:
        print(f"  PASS  non-zero exit ({rc})")

    con = sqlite3.connect(str(target))
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    rows = (list(con.execute("SELECT filename FROM schema_migrations"))
            if "schema_migrations" in tables else [])
    con.close()
    if rows:
        failures.append(f"schema_migrations rows written despite failure: {rows}")
        print(f"  FAIL  {len(rows)} schema_migrations row(s) written")
    else:
        print("  PASS  no schema_migrations row written")
    if "should_not_exist" in tables:
        failures.append("a migration after the failure still ran")
        print("  FAIL  a later migration ran anyway")
    else:
        print("  PASS  the run stopped -- later migrations did not execute")
    if "canary" in tables:
        failures.append("the pre-failure migration's write leaked to the target")
        print("  FAIL  pre-failure work leaked into the target DB")
    else:
        print("  PASS  pre-failure work discarded; target left untouched")

    # POSITIVE CONTROL: without the broken one, the same run must succeed.
    print("\npositive control -- a clean set must apply and be idempotent:")
    manifest.write_text(json.dumps({"migrations": [
        {"filename": good.name, "classification": DB_CLASS},
    ]}), encoding="utf-8")
    target2 = tmp / "target2.db"
    sqlite3.connect(str(target2)).close()
    rc = cmd_apply(target2, manifest, mdir)
    if rc != 0:
        failures.append(f"clean --apply returned {rc}")
        print(f"  FAIL  exit {rc}")
    else:
        print("  PASS  exit 0")
    con = sqlite3.connect(str(target2))
    t2 = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    n = len(list(con.execute("SELECT filename FROM schema_migrations"))) if "schema_migrations" in t2 else 0
    con.close()
    if "canary" not in t2:
        failures.append("clean run did not persist the migration's write")
        print("  FAIL  migration's table missing from the target")
    else:
        print("  PASS  the migration's write reached the target DB")
    if n != 1:
        failures.append(f"expected 1 schema_migrations row, got {n}")
        print(f"  FAIL  {n} tracking row(s)")
    else:
        print("  PASS  exactly 1 tracking row recorded")
    rc2 = cmd_apply(target2, manifest, mdir)
    if rc2 != 0:
        failures.append("re-running --apply was not a clean no-op")
        print(f"  FAIL  re-run exit {rc2}")
    else:
        print("  PASS  re-run is a no-op (idempotent)")

    # GUARD: --apply must refuse the live DB without --allow-live.
    print("\nguard -- --apply must refuse the live database:")
    live = next((p for p in live_db_paths() if p.exists()), None)
    if live is None:
        print("  SKIP  no live DB present")
    else:
        before = live.stat().st_mtime_ns
        rc3 = cmd_apply(live, manifest, mdir)
        if rc3 != 2:
            failures.append(f"live guard returned {rc3}, expected 2")
            print(f"  FAIL  returned {rc3}, expected refusal (2)")
        else:
            print("  PASS  refused with exit 2")
        if live.stat().st_mtime_ns != before:
            failures.append("live DB mtime changed during the guard test")
            print("  FAIL  live DB mtime changed")
        else:
            print("  PASS  live DB untouched")

    # GUARD: --status must be READ-ONLY. Regression test for the 2026-08-02
    # wart where status created schema_migrations just by being asked.
    print("\nguard -- --status must not mutate the database:")
    manifest.write_text(json.dumps({"migrations": [
        {"filename": good.name, "classification": DB_CLASS},
    ]}), encoding="utf-8")
    virgin = tmp / "virgin.db"
    sqlite3.connect(str(virgin)).close()
    v_before = virgin.stat().st_mtime_ns
    cmd_status(virgin, manifest, mdir)
    con = sqlite3.connect(str(virgin))
    made = con.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
    ).fetchone()
    con.close()
    if made:
        failures.append("--status created schema_migrations (must be read-only)")
        print("  FAIL  --status created the tracking table")
    else:
        print("  PASS  no tracking table created")
    if virgin.stat().st_mtime_ns != v_before:
        failures.append("--status changed the database file mtime")
        print("  FAIL  file mtime changed")
    else:
        print("  PASS  file mtime unchanged")

    # GUARD: an UNCLASSIFIED manifest entry must refuse rather than guess.
    print("\nguard -- UNCLASSIFIED manifest entries must refuse:")
    manifest.write_text(json.dumps({"migrations": [
        {"filename": good.name, "classification": "UNCLASSIFIED"},
    ]}), encoding="utf-8")
    try:
        load_replay_set(manifest)
    except MigrationError:
        print("  PASS  raised rather than guessing")
    else:
        failures.append("UNCLASSIFIED entry did not raise")
        print("  FAIL  did not raise")

    import shutil
    shutil.rmtree(tmp, ignore_errors=True)

    print()
    if failures:
        print(f"SELF-TEST FAILED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("SELF-TEST PASSED -- --apply was shown to FAIL, not merely to succeed.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", type=Path, default=live_db_paths()[0],
                    help="target database (default: the live knowledge base)")
    ap.add_argument("--manifest", type=Path, default=MANIFEST)
    ap.add_argument("--migrations-dir", type=Path, default=MIGRATIONS_DIR)
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--mark-applied", action="store_true",
                    help="record migrations as applied WITHOUT running them")
    ap.add_argument("--all", action="store_true",
                    help="with --mark-applied: every DB migration in the manifest")
    ap.add_argument("--allow-live", action="store_true",
                    help="permit --apply against the live database")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    try:
        if args.self_test:
            return _self_test()
        if args.mark_applied:
            return cmd_mark_applied(args.db, args.manifest)
        if args.apply:
            return cmd_apply(args.db, args.manifest, args.migrations_dir,
                             allow_live=args.allow_live)
        if args.status:
            return cmd_status(args.db, args.manifest, args.migrations_dir)
    except (MigrationError, SandboxGuardError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
