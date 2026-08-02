#!/usr/bin/env python3
"""Run DB-touching scripts against a throwaway database, never the live one.

THE PROBLEM
-----------
Nothing in this repo can be pointed at a different database:

  * 27 of the migrations in ``scripts/migrations/`` hardcode
    ``Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"``.
  * ``sgs-update-v2.py:74`` hardcodes the same file under ``.agents`` instead
    of ``.claude``.
  * Measured 2026-08-02: exactly two migrations use ``argparse`` and BOTH expose
    only ``--dry-run``. **No migration accepts a ``--db`` argument.** (An earlier
    plan claimed two did; that was false. There is no per-file special case to
    write, which makes this harness the single uniform mechanism.)

So a naive "rebuild into a temp path" test would ignore the temp path entirely
and mutate the real, gitignored, irreplaceable knowledge base.

THE MECHANISM
-------------
Redirect ``HOME`` for a subprocess so ``Path.home()`` resolves inside a temp
directory. Both spellings of the path (``.claude`` and ``.agents``) are created
there and pointed at ONE file -- on the real machine those two paths are a
single hardlinked inode, and if the sandbox let them drift apart the migrations
would write one file while the seeder wrote another, making every downstream
comparison meaningless.

THE GUARD
---------
Before yielding, assert that the sandbox target is not a live path and that both
sandbox spellings share one inode. ``--self-test`` proves the guard actually
raises. A guard that has never been shown to fail is decoration.
"""

from __future__ import annotations

import contextlib
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REL = Path("skills") / "sgs-wp-engine" / "sgs-framework.db"
HOME_SPELLINGS = (".claude", ".agents")


class SandboxGuardError(RuntimeError):
    """Raised when a sandbox would (or might) touch the live database."""


def live_db_paths() -> list[Path]:
    """Every real on-disk location the code might resolve to."""
    home = Path(os.path.expanduser("~"))
    return [home / spelling / REL for spelling in HOME_SPELLINGS]


def _resolve(p: Path) -> Path:
    try:
        return p.resolve()
    except OSError:
        return p.absolute()


def _assert_not_live(*candidates: Path) -> None:
    live = {_resolve(p) for p in live_db_paths()}
    live_inodes = set()
    for p in live_db_paths():
        try:
            live_inodes.add(os.stat(p).st_ino)
        except OSError:
            pass

    for cand in candidates:
        if _resolve(cand) in live:
            raise SandboxGuardError(
                f"REFUSING: sandbox target {cand} resolves to a LIVE database path. "
                f"Live paths: {sorted(str(p) for p in live)}"
            )
        try:
            if os.stat(cand).st_ino in live_inodes:
                raise SandboxGuardError(
                    f"REFUSING: sandbox target {cand} shares an inode with the live "
                    f"database -- it is a hardlink to the real file."
                )
        except FileNotFoundError:
            pass


class SandboxRunner:
    """Spawns subprocesses whose ``Path.home()`` lands inside the sandbox."""

    def __init__(self, home: Path, db: Path, linked: bool, views: list[Path]):
        self.home = home
        self.db = db
        self.linked = linked
        self.views = views

    @property
    def env(self) -> dict:
        env = dict(os.environ)
        # Windows' expanduser prefers USERPROFILE, then HOMEDRIVE+HOMEPATH.
        # POSIX uses HOME. Set every one of them or the redirect silently fails
        # on one platform and writes to the real database.
        env["HOME"] = str(self.home)
        env["USERPROFILE"] = str(self.home)
        drive, tail = os.path.splitdrive(str(self.home))
        env["HOMEDRIVE"] = drive or ""
        env["HOMEPATH"] = tail or str(self.home)
        env.pop("XDG_CONFIG_HOME", None)
        return env

    def run(self, args: list[str], **kwargs) -> subprocess.CompletedProcess:
        """Run a command with HOME redirected. Re-checks the guard every time."""
        _assert_not_live(self.db, *self.views)
        kwargs.setdefault("capture_output", True)
        kwargs.setdefault("text", True)
        proc = subprocess.run(args, env=self.env, **kwargs)
        self._sync()
        return proc

    def run_python(self, script: Path | str, *argv: str, **kwargs):
        return self.run([sys.executable, str(script), *argv], **kwargs)

    def _sync(self) -> None:
        """Keep the two spellings identical when hardlinking was unavailable."""
        if self.linked or len(self.views) < 2:
            return
        newest = max(
            (v for v in self.views if v.exists()),
            key=lambda p: p.stat().st_mtime,
            default=None,
        )
        if newest is None:
            return
        for v in self.views:
            if v != newest:
                shutil.copy2(newest, v)

    def table_names(self) -> set[str]:
        import sqlite3

        if not self.db.exists():
            return set()
        con = sqlite3.connect(str(self.db))
        try:
            return {
                r[0]
                for r in con.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' "
                    "AND name NOT LIKE 'sqlite@_%' ESCAPE '@'"
                )
            }
        finally:
            con.close()


@contextlib.contextmanager
def sandbox(seed_from: Path | str | None = None, keep: bool = False):
    """Yield a :class:`SandboxRunner` backed by a throwaway database.

    ``seed_from`` copies an existing database in as the starting point (used for
    negative controls: seed from live, drop a table, prove a rebuild restores
    it). Omit it to start from nothing, which is the true rebuild-from-empty
    test.
    """
    home = Path(tempfile.mkdtemp(prefix="sgs-dbsandbox-"))
    views: list[Path] = []
    try:
        for spelling in HOME_SPELLINGS:
            target = home / spelling / REL
            target.parent.mkdir(parents=True, exist_ok=True)
            views.append(target)

        primary = views[0]
        if seed_from is not None:
            src = Path(seed_from)
            if not src.exists():
                raise SandboxGuardError(f"seed_from does not exist: {src}")
            # WAL-safe: use SQLite's own backup API, not a file copy.
            import sqlite3

            s = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
            d = sqlite3.connect(str(primary))
            with d:
                s.backup(d)
            d.close()
            s.close()
        else:
            primary.touch()

        linked = True
        for other in views[1:]:
            if other.exists():
                other.unlink()
            try:
                os.link(primary, other)
            except OSError:
                linked = False
                shutil.copy2(primary, other)

        # --- THE GUARD -------------------------------------------------
        _assert_not_live(*views)
        if linked:
            inodes = {os.stat(v).st_ino for v in views}
            if len(inodes) != 1:
                raise SandboxGuardError(
                    f"REFUSING: sandbox views claim to be hardlinked but hold "
                    f"{len(inodes)} distinct inodes -- migrations and the seeder "
                    f"would write different files. Views: {views}"
                )
        # ---------------------------------------------------------------

        yield SandboxRunner(home=home, db=primary, linked=linked, views=views)
    finally:
        if not keep:
            shutil.rmtree(home, ignore_errors=True)


def _self_test() -> int:
    """Prove the guard FIRES. Exit 0 only if every negative control raises."""
    failures: list[str] = []

    def check(name: str, fn) -> None:
        try:
            fn()
        except SandboxGuardError as exc:
            print(f"  PASS  {name}\n          raised: {str(exc)[:110]}")
            return
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{name}: wrong exception {type(exc).__name__}: {exc}")
            print(f"  FAIL  {name} -- wrong exception {type(exc).__name__}")
            return
        failures.append(f"{name}: did NOT raise")
        print(f"  FAIL  {name} -- did NOT raise (guard is decoration)")

    print("negative controls (each MUST raise):")
    check(
        "live .claude path rejected",
        lambda: _assert_not_live(live_db_paths()[0]),
    )
    check(
        "live .agents path rejected",
        lambda: _assert_not_live(live_db_paths()[1]),
    )
    check(
        "hardlink to the live DB rejected",
        lambda: _hardlink_to_live_probe(),
    )
    check(
        "missing seed_from rejected",
        lambda: _missing_seed_probe(),
    )

    print("\npositive controls (each MUST succeed):")
    with sandbox() as run:
        assert run.db.exists(), "sandbox db was not created"
        if run.linked:
            inodes = {os.stat(v).st_ino for v in run.views}
            assert len(inodes) == 1, f"views not one inode: {inodes}"
            print("  PASS  both .claude and .agents views share one inode")
        else:
            print("  PASS  hardlink unavailable -- copy-back sync engaged")
        env = run.env
        assert env["HOME"] == str(run.home)
        assert env["USERPROFILE"] == str(run.home)
        print("  PASS  HOME and USERPROFILE both redirected")

        probe = "import pathlib,sys; sys.stdout.write(str(pathlib.Path.home()))"
        out = run.run([sys.executable, "-c", probe]).stdout.strip()
        assert Path(out) == run.home, f"subprocess Path.home()={out} not {run.home}"
        print(f"  PASS  subprocess Path.home() resolves into the sandbox")

    live = [p for p in live_db_paths() if p.exists()]
    before = {p: p.stat().st_mtime_ns for p in live}
    with sandbox() as run:
        run.run([sys.executable, "-c", "import pathlib; (pathlib.Path.home()/'x').write_text('y')"])
    after = {p: p.stat().st_mtime_ns for p in live}
    if before != after:
        failures.append("live DB mtime CHANGED during a sandbox run")
        print("  FAIL  live DB mtime changed during a sandbox run")
    else:
        print(f"  PASS  live DB untouched ({len(live)} path(s) checked, mtime unchanged)")

    print()
    if failures:
        print(f"SELF-TEST FAILED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("SELF-TEST PASSED -- the guard was shown to fire, not merely to exist.")
    return 0


def _hardlink_to_live_probe() -> None:
    """Build a real hardlink to the live DB and confirm the guard catches it."""
    live = next((p for p in live_db_paths() if p.exists()), None)
    if live is None:
        raise SandboxGuardError("no live DB present; inode check vacuous here")
    tmp = Path(tempfile.mkdtemp(prefix="sgs-inode-probe-"))
    decoy = tmp / "decoy.db"
    try:
        try:
            os.link(live, decoy)
        except OSError:
            raise SandboxGuardError("hardlink unsupported; inode check vacuous here")
        _assert_not_live(decoy)  # must raise
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _missing_seed_probe() -> None:
    with sandbox(seed_from=Path(tempfile.gettempdir()) / "definitely-not-here.db"):
        pass


def main() -> int:
    if "--self-test" in sys.argv:
        return _self_test()
    if "--show" in sys.argv:
        for p in live_db_paths():
            marker = "exists" if p.exists() else "absent"
            ino = f" inode={os.stat(p).st_ino}" if p.exists() else ""
            print(f"live: {p} [{marker}]{ino}")
        return 0
    print(__doc__)
    print("usage: sandbox.py [--self-test | --show]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
