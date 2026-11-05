#!/usr/bin/env python3
"""publish-framework-db.py - reseed on a private copy, publish it to the shared framework DB in a short locked step.

Sessions no longer queue behind one long shared reseed. The flow is compare-and-swap:

  1. begin       python publish-framework-db.py begin --copy E:/sgs-tmp/my-reseed.db
                 Copies the shared DB (SQLite backup, so a consistent snapshot) and records the shared file's sha256 in
                 <copy>.base.json.
  2. reseed      python sgs-update-v2.py --db E:/sgs-tmp/my-reseed.db
  3. regenerate  python publish-framework-db.py regenerate --copy E:/sgs-tmp/my-reseed.db [--restore-first]
                 Rebuilds consistency/attr-role-map.json, consistency/roster.json and dbschema/seed-history.json from the
                 copy (the generators run with SGS_FRAMEWORK_DB=<copy>); --restore-first checks them out from HEAD first.
  4. commit      Commit the regenerated files and the reseed's own output (behavioural-analyser/css-property-classifications.json)
                 before gating, so the gated tree is the tree that gets pushed. If origin/main moved, rebase now, before gating.
  5. gate        SGS_FRAMEWORK_DB=E:/sgs-tmp/my-reseed.db python build-deploy.py --gate-only --blocks-only [--editor-check local-<site>]
                 Builds and runs gate:full in an isolated worktree at HEAD and records a pass for (HEAD's tree, the copy's sha256).
  6. publish     python publish-framework-db.py publish --copy E:/sgs-tmp/my-reseed.db
                 Refused (exit 2) unless that pass is on record for HEAD and the tracked files are clean. Takes a lock for a few
                 seconds and replaces the shared DB only when it still has the sha256 the copy started from (exit 3 means another
                 session published first: run `begin` and reseed again). Then carries the pass to the key for (same tree, published
                 sha256): the published DB is a SQLite backup of the gated copy, identical content, so the gates already ran on it.
  7. push, then deploy with build-deploy.py: it restores the cached build and skips build and gate:full.

A rebase onto a moved origin/main after gating changes the tree, so the pass no longer matches HEAD and publish refuses with
the gate command: rebase before gating.

Every publish is logged in <shared>.publish.log (JSON lines: who, which tree, sha before and after). `begin`, `publish` and
`status` compare the shared DB's sha256 with the last one the log knows; a different sha means something wrote the file
outside `publish`, and the log records that write once with the file's modification time, so a later overwrite can be
traced to the minute it happened.

Exit codes: 0 done, 2 refused (bad input, corrupt copy, shared DB open in WAL mode), 3 the shared DB changed (reseed again).
`--self-test` is `python -m pytest plugins/sgs-blocks/scripts/tests/test_publish_framework_db.py`.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from framework_db import framework_db_path  # noqa: E402
import deploy_cache  # noqa: E402

SCRIPTS = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS.parents[2]
GENERATED = (
    "plugins/sgs-blocks/scripts/consistency/attr-role-map.json",
    "plugins/sgs-blocks/scripts/consistency/roster.json",
    "plugins/sgs-blocks/scripts/dbschema/seed-history.json",
)
LOCK_WAIT_S = 120.0
LOCK_STALE_S = 300.0
REPLACE_WAIT_S = 30.0
EXIT_REFUSED = 2
EXIT_CONFLICT = 3


class PublishRefused(Exception):
    """The publish cannot go ahead; the message says why."""


class SharedChanged(Exception):
    """The shared DB no longer has the sha256 the copy started from."""


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def base_file(copy: Path) -> Path:
    return copy.with_name(copy.name + ".base.json")


class PublishLock:
    """An exclusive lock file beside the shared DB: created with O_EXCL, broken only when older than LOCK_STALE_S."""

    def __init__(self, shared: Path, wait_s: float = LOCK_WAIT_S, stale_s: float = LOCK_STALE_S) -> None:
        self.path = shared.with_name(shared.name + ".publish.lock")
        self.wait_s = wait_s
        self.stale_s = stale_s
        self.held = False
        self.token = uuid.uuid4().hex

    def __enter__(self) -> "PublishLock":
        deadline = time.monotonic() + self.wait_s
        while True:
            try:
                fd = os.open(str(self.path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            except FileExistsError:
                self._break_if_stale()
                if time.monotonic() >= deadline:
                    raise PublishRefused(f"another session holds {self.path} (waited {self.wait_s:.0f}s); try again")
                time.sleep(0.25)
                continue
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(json.dumps({"pid": os.getpid(), "at": time.time(), "token": self.token}))
            self.held = True
            return self

    def _break_if_stale(self) -> None:
        try:
            age = time.time() - self.path.stat().st_mtime
        except FileNotFoundError:
            return
        if age > self.stale_s:
            # rename, not unlink: of several waiters that saw the same old lock only one rename succeeds
            graveyard = self.path.with_name(self.path.name + "." + uuid.uuid4().hex + ".stale")
            try:
                os.rename(str(self.path), str(graveyard))
            except OSError:
                return
            try:
                graveyard.unlink()
            except OSError:
                pass

    def _owned(self) -> bool:
        try:
            return json.loads(self.path.read_text(encoding="utf-8")).get("token") == self.token
        except (OSError, ValueError):
            return False

    def __exit__(self, *_exc: object) -> None:
        if self.held:
            # a lock that was broken as stale and re-taken by another session is not ours to delete
            if self._owned():
                try:
                    self.path.unlink()
                except FileNotFoundError:
                    pass
            self.held = False


def log_path(shared: Path) -> Path:
    return shared.with_name(shared.name + ".publish.log")


def record_event(shared: Path, event: str, **fields: object) -> None:
    entry = {
        "at": time.time(), "event": event, "pid": os.getpid(), "tree": str(REPO_ROOT),
        "user": os.environ.get("USERNAME") or os.environ.get("USER") or "", **fields,
    }
    with log_path(shared).open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry) + "\n")


def logged_events(shared: Path) -> list[dict]:
    try:
        lines = log_path(shared).read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    events = []
    for line in lines:
        try:
            events.append(json.loads(line))
        except ValueError:
            continue
    return events


def known_sha(shared: Path) -> str | None:
    """The sha256 the log last saw the shared DB with: a publish's result, an outside write seen, or the first sighting."""
    for entry in reversed(logged_events(shared)):
        if entry.get("event") == "publish":
            return entry.get("sha_after")
        if entry.get("event") in ("outside-write", "baseline"):
            return entry.get("sha")
    return None


def note_outside_write(shared: Path, current: str) -> str | None:
    """Compare `current` with the last sha the log knows. A difference means the file was written outside `publish`: the
    write is logged once (with the file's modification time) and a sentence is returned for the caller to print."""
    known = known_sha(shared)
    if known is None:
        record_event(shared, "baseline", sha=current)
        return None
    if known == current:
        return None
    written = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(shared.stat().st_mtime))
    record_event(shared, "outside-write", sha=current, previous=known, mtime=shared.stat().st_mtime)
    return (f"the shared DB ({current[:12]}) was written outside publish-framework-db.py: it was last published or seen as "
            f"{known[:12]}, and the file was modified {written}. Match that time against the other sessions' reseeds and deploys.")


def snapshot(source: Path, dest: Path) -> None:
    """Consistent copy of `source` at `dest` through SQLite's backup API (safe while another process has it open)."""
    if dest.resolve() == source.resolve():
        raise PublishRefused(f"the copy and the source are the same file: {dest}")
    if dest.exists():
        dest.unlink()
    src = sqlite3.connect(f"file:{quote(source.resolve().as_posix(), safe='/:')}?mode=ro", uri=True)
    try:
        dst = sqlite3.connect(str(dest))
        try:
            src.backup(dst)
        finally:
            dst.close()
    finally:
        src.close()


def begin(copy: Path, shared: Path) -> dict:
    if not shared.is_file() or shared.stat().st_size == 0:
        raise PublishRefused(f"shared framework DB not found or empty: {shared}")
    if copy.resolve() == shared.resolve():
        raise PublishRefused(f"--copy is the shared DB itself ({shared}); name a different file, and leave SGS_FRAMEWORK_DB unset for begin and publish")
    with PublishLock(shared):
        before = sha256_of(shared)
        warning = note_outside_write(shared, before)
        snapshot(shared, copy)
        if sha256_of(shared) != before:
            raise PublishRefused("the shared DB changed while the copy was taken (a reseed is writing it directly); retry")
    record = {"shared": str(shared), "sha256": before, "taken_at": time.time()}
    base_file(copy).write_text(json.dumps(record, indent=2), encoding="utf-8")
    return {**record, "warning": warning}


def check_copy(copy: Path) -> None:
    if not copy.is_file():
        raise PublishRefused(f"copy not found: {copy}")
    con = sqlite3.connect(str(copy))
    try:
        con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        verdict = con.execute("PRAGMA integrity_check").fetchone()
        blocks = con.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='block_attributes'").fetchone()[0]
    except sqlite3.DatabaseError as exc:
        raise PublishRefused(f"copy is not a readable SQLite database: {exc}") from exc
    finally:
        con.close()
    if not verdict or verdict[0] != "ok":
        raise PublishRefused(f"copy failed PRAGMA integrity_check: {verdict}")
    if not blocks:
        raise PublishRefused("copy has no block_attributes table, so it is not a framework DB")


def refuse_if_shared_in_use(shared: Path) -> None:
    for suffix in ("-wal", "-journal"):
        sidecar = shared.with_name(shared.name + suffix)
        if sidecar.is_file() and sidecar.stat().st_size > 0:
            raise PublishRefused(f"{sidecar.name} is not empty: a process has the shared DB open mid-write; retry shortly")


def replace_with_retry(staged: Path, shared: Path) -> None:
    deadline = time.monotonic() + REPLACE_WAIT_S
    while True:
        try:
            os.replace(str(staged), str(shared))
            return
        except PermissionError as exc:
            if time.monotonic() >= deadline:
                raise PublishRefused(f"the shared DB is open in another process and could not be replaced: {exc}") from exc
            time.sleep(0.5)


def gate_command(copy: Path) -> str:
    return (f"SGS_FRAMEWORK_DB={copy} python plugins/sgs-blocks/scripts/build-deploy.py --gate-only --blocks-only "
            "[--editor-check local-<site>]")


def tracked_changes() -> list[str]:
    done = subprocess.run(["git", "status", "--porcelain", "--untracked-files=no"], cwd=str(REPO_ROOT),
                          capture_output=True, text=True, check=True)
    return [line for line in done.stdout.splitlines() if line.strip()]


def require_gate_pass(copy: Path) -> str:
    """The cache key of the recorded gate:full pass for (HEAD's tree, the copy's sha256); refuses when there is none or
    when tracked files differ from HEAD (the pass would describe different code)."""
    dirty = tracked_changes()
    if dirty:
        raise PublishRefused(f"{len(dirty)} tracked file(s) differ from HEAD ({dirty[0].strip()}): commit them, then gate. "
                             f"Run: {gate_command(copy)}")
    key = deploy_cache.run_key(REPO_ROOT, isolated=True, no_cache=False, db=copy)
    if not deploy_cache.gate_pass(key):
        raise PublishRefused(f"no gate:full pass is recorded for HEAD's tree and this copy. Run: {gate_command(copy)}")
    return key


def publish(copy: Path, shared: Path) -> dict:
    marker = base_file(copy)
    if not marker.is_file():
        raise PublishRefused(f"{marker.name} not found: the copy was not made by `begin`")
    base = json.loads(marker.read_text(encoding="utf-8"))
    if copy.resolve() == shared.resolve():
        raise PublishRefused(f"--copy is the shared DB itself ({shared}): SGS_FRAMEWORK_DB still names the copy; unset it for publish")
    if Path(base["shared"]) != shared:
        raise PublishRefused(f"the copy started from {base['shared']}, not {shared}")
    pass_key = require_gate_pass(copy)  # before check_copy, which may checkpoint (rewrite) the copy
    check_copy(copy)
    staged = shared.with_name(shared.name + ".publishing")
    with PublishLock(shared):
        current = sha256_of(shared)
        warning = note_outside_write(shared, current)
        if current != base["sha256"]:
            raise SharedChanged(f"shared DB is {current[:12]}, the copy started from {base['sha256'][:12]}")
        refuse_if_shared_in_use(shared)
        snapshot(copy, staged)
        with staged.open("r+b") as staged_handle:
            os.fsync(staged_handle.fileno())
        try:
            replace_with_retry(staged, shared)
        finally:
            if staged.exists():
                staged.unlink()
        for suffix in ("-wal", "-shm"):
            stale = shared.with_name(shared.name + suffix)
            try:
                if stale.is_file():
                    stale.unlink()
            except OSError:
                pass  # the new DB is already live; an empty sidecar is rebuilt by SQLite
        published = sha256_of(shared)
        record_event(shared, "publish", sha_before=current, sha_after=published, copy=str(copy))
    # The published DB is a SQLite backup of the gated copy (identical content), so the pass for the copy holds for it.
    deploy_cache.carry_pass(pass_key, deploy_cache.run_key(REPO_ROOT, isolated=True, no_cache=False, db=shared))
    marker.write_text(json.dumps({**base, "published_sha256": published, "published_at": time.time()}, indent=2), encoding="utf-8")
    return {"sha256": published, "warning": warning}


def status(shared: Path) -> list[str]:
    """The last log entries and whether the shared DB still matches the last sha the log knows."""
    if not shared.is_file():
        raise PublishRefused(f"shared framework DB not found: {shared}")
    lines = []
    with PublishLock(shared):
        current = sha256_of(shared)
        warning = note_outside_write(shared, current)
    for entry in logged_events(shared)[-5:]:
        when = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(entry.get("at", 0)))
        detail = entry.get("sha_after") or entry.get("sha") or ""
        lines.append(f"{when}  {entry.get('event'):13} {str(detail)[:12]}  {entry.get('user', '')}  {entry.get('tree', '')}")
    lines.append(f"shared DB now {current[:12]}" + (f"\nWARNING: {warning}" if warning else ", matching the log"))
    return lines


def regenerate(restore_first: bool, copy: Path | None = None) -> None:
    """Rebuild the three generated files from `copy` (the generators run with SGS_FRAMEWORK_DB=<copy>), or from the shared
    DB when no copy is named (SGS_FRAMEWORK_DB must then be unset)."""
    env = dict(os.environ)
    if copy is None:
        if os.environ.get("SGS_FRAMEWORK_DB"):
            raise PublishRefused("unset SGS_FRAMEWORK_DB: the generated files are rebuilt from the shared DB (or name a private copy with --copy)")
    else:
        if not copy.is_file():
            raise PublishRefused(f"copy not found: {copy}")
        env["SGS_FRAMEWORK_DB"] = str(copy.resolve())
    if restore_first:
        subprocess.run(["git", "checkout", "HEAD", "--", *GENERATED], cwd=str(REPO_ROOT), check=True)
    steps = (
        [sys.executable, str(SCRIPTS / "consistency" / "build-roster.py")],
        [sys.executable, str(SCRIPTS / "generate-attr-role-map.py")],
        [sys.executable, str(SCRIPTS / "dbschema" / "seed_history.py"), "--record"],
    )
    for command in steps:
        done = subprocess.run(command, cwd=str(REPO_ROOT), env=env)
        if done.returncode != 0:
            raise PublishRefused(f"{Path(command[1]).name} exited {done.returncode}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("begin", "publish"):
        step = sub.add_parser(name)
        step.add_argument("--copy", type=Path, required=True)
    sub.add_parser("status")
    regen = sub.add_parser("regenerate")
    regen.add_argument("--copy", type=Path, default=None, help="rebuild from this private copy instead of the shared DB")
    regen.add_argument("--restore-first", action="store_true", help="git checkout HEAD -- the three generated files first")
    args = parser.parse_args(argv)
    shared = framework_db_path()
    try:
        if args.command == "begin":
            record = begin(args.copy, shared)
            print(f"[begin] copy {args.copy} taken from {shared} (sha256 {record['sha256'][:12]})")
            if record["warning"]:
                print(f"[begin] WARNING: {record['warning']}", file=sys.stderr)
        elif args.command == "publish":
            result = publish(args.copy, shared)
            print(f"[publish] shared DB replaced (sha256 {result['sha256'][:12]}). The gate pass is carried to it. Next: push, then deploy.")
            if result["warning"]:
                print(f"[publish] WARNING: {result['warning']}", file=sys.stderr)
        elif args.command == "status":
            print("\n".join(status(shared)))
        else:
            regenerate(args.restore_first, args.copy)
            source = args.copy or "the shared DB"
            print(f"[regenerate] attr-role-map.json, roster.json and seed-history.json rebuilt from {source}")
    except SharedChanged as exc:
        print(f"[publish] REFUSED, the shared DB changed since the copy started: {exc}. Run `begin` and reseed again.", file=sys.stderr)
        return EXIT_CONFLICT
    except PublishRefused as exc:
        print(f"[{args.command}] REFUSED: {exc}", file=sys.stderr)
        return EXIT_REFUSED
    except (sqlite3.Error, OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(f"[{args.command}] REFUSED: {type(exc).__name__}: {exc}", file=sys.stderr)
        return EXIT_REFUSED
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
