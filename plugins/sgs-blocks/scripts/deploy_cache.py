#!/usr/bin/env python3
"""deploy_cache.py - build-deploy.py's memory of commits that already built and passed gate:full.

A deploy's build and gate:full depend only on the committed tree and the framework DB, so
once a commit has passed them they need not run again for another site or a repeat deploy.
After gate:full passes, the run stores a pass record, its plugin build/ and every file the
build left new or changed under the deploy roots (the prebuild generators write some, such
as assets/css/media-element.css) in ~/.cache/sgs-deploy/<key>/. A later run with the same
key restores those files and skips both steps.

The key is the commit's tree hash plus the framework DB's sha256: the full gates read the
theme, sites/, .claude/specs, .claude/plans and the DB, not only the plugin, so a narrower
key would let a gate "pass" for content it never read.

Only an isolated run uses the cache (build-deploy.py's worktree at HEAD holds exactly the
committed tree; run_isolated() sets SGS_DEPLOY_ISOLATED). A shared-checkout run may carry
uncommitted files, so it neither reads nor writes the cache.

package_lock() serialises packaging across every deploy on this machine: packaging swaps
the shared vendor/ autoloader to its no-dev form and back, and two deploys doing that at
once can ship the dev autoloader, which fatals the live site (D849).

Self-test:  python plugins/sgs-blocks/scripts/deploy_cache.py --self-test
"""
from __future__ import annotations

import contextlib
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Callable, Iterator

DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
KEEP = 5
ISOLATED_ENV = "SGS_DEPLOY_ISOLATED"
# Folders the build's leftovers are collected from (the deploy roots), and what is never cached.
ROOTS = ("plugins/sgs-blocks", "theme/sgs-theme")
NEVER = ("plugins/sgs-blocks/build/", "plugins/sgs-blocks/node_modules", "plugins/sgs-blocks/vendor")
LOCK_TIMEOUT_S = 900


def cache_root() -> Path:
    return Path(os.environ.get("SGS_DEPLOY_CACHE_DIR", Path.home() / ".cache" / "sgs-deploy"))


def _git(repo: Path, *args: str) -> str:
    done = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True, check=True)
    return done.stdout.strip()


def _sha256(path: Path) -> str:
    if not path.exists():
        return "no-db"
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_key(repo: Path, *, isolated: bool, no_cache: bool, db: Path = DB_PATH) -> str | None:
    """The cache key for this run, or None when the cache must not be used."""
    if no_cache or not isolated:
        return None
    tree = _git(repo, "rev-parse", "HEAD^{tree}")
    return hashlib.sha256(f"{tree}\n{_sha256(db)}".encode()).hexdigest()[:32]


def gate_pass(key: str | None) -> dict | None:
    """The pass record for this key, if gate:full already passed for it."""
    if not key:
        return None
    record = cache_root() / key / "gate-pass.json"
    try:
        return json.loads(record.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def build_leftovers(repo: Path) -> list[str]:
    """Files the build left new or changed under the deploy roots, outside build/."""
    out = _git(repo, "status", "--porcelain", "--untracked-files=all", "--", *ROOTS)
    paths = []
    for line in out.splitlines():
        path = line[3:].strip().strip('"')
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        if line[:2].strip() == "D" or any(path.startswith(n) for n in NEVER):
            continue
        paths.append(path)
    return sorted(paths)


def record_pass(key: str | None, repo: Path, build_dir: Path, seconds: float) -> None:
    """Stores the pass record, build/ and the build's leftovers. Written to a temp folder and
    renamed into place, so a half-written entry is never read."""
    if not key:
        return
    root = cache_root()
    root.mkdir(parents=True, exist_ok=True)
    final = root / key
    if final.exists():
        return
    work = Path(tempfile.mkdtemp(prefix=f".{key}-", dir=root))
    try:
        files = build_leftovers(repo)
        for rel in files:
            src = repo / rel
            if src.is_file():
                (work / "files" / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, work / "files" / rel)
        if build_dir.is_dir():
            shutil.copytree(build_dir, work / "build")
        record = {
            "commit": _git(repo, "rev-parse", "HEAD"),
            "passed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "gate_seconds": round(seconds),
            "has_build": build_dir.is_dir(),
            "files": files,
        }
        (work / "gate-pass.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
        os.replace(work, final)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    prune(root)


def restore_build(key: str | None, repo: Path, build_dir: Path) -> bool:
    """Puts the cached build/ and build leftovers in place; False when there is none."""
    record = gate_pass(key)
    entry = cache_root() / key if key else None
    if not record or not record.get("has_build") or not (entry / "build").is_dir():
        return False
    if build_dir.exists():
        shutil.rmtree(build_dir)
    shutil.copytree(entry / "build", build_dir)
    for rel in record.get("files", []):
        src = entry / "files" / rel
        if src.is_file():
            (repo / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, repo / rel)
    return True


def prune(root: Path, keep: int = KEEP) -> None:
    entries = sorted((p for p in root.iterdir() if p.is_dir() and not p.name.startswith(".")),
                     key=lambda p: p.stat().st_mtime, reverse=True)
    for old in entries[keep:]:
        shutil.rmtree(old, ignore_errors=True)


@contextlib.contextmanager
def package_lock(log: Callable[[str], None], path: Path | None = None,
                 timeout_s: float = LOCK_TIMEOUT_S) -> Iterator[None]:
    """Holds the machine-wide packaging lock: one deploy packages at a time."""
    path = path or Path(tempfile.gettempdir()) / "sgs-deploy-package.lock"
    fh = path.open("a+b")
    start = time.time()
    told = False
    try:
        while True:
            try:
                _lock(fh)
                break
            except OSError:
                if time.time() - start > timeout_s:
                    raise TimeoutError(f"packaging lock {path} held for over {timeout_s:.0f}s")
                if not told:
                    log(f"[package-lock] another deploy is packaging; waiting ({path})")
                    told = True
                time.sleep(1)
        yield
    finally:
        with contextlib.suppress(OSError):
            _unlock(fh)
        fh.close()


def _lock(fh) -> None:
    fh.seek(0)
    if os.name == "nt":
        import msvcrt
        msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
    else:
        import fcntl
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)


def _unlock(fh) -> None:
    fh.seek(0)
    if os.name == "nt":
        import msvcrt
        msvcrt.locking(fh.fileno(), msvcrt.LK_UNLCK, 1)
    else:
        import fcntl
        fcntl.flock(fh.fileno(), fcntl.LOCK_UN)


def self_test() -> list[str]:
    """Each case proves a guard rejects its unsafe case. Returns the failures."""
    failures: list[str] = []
    with tempfile.TemporaryDirectory(prefix="sgs-deploy-cache-selftest-") as td:
        base = Path(td)
        os.environ["SGS_DEPLOY_CACHE_DIR"] = str(base / "cache")
        repo = base / "repo"
        (repo / "plugins" / "sgs-blocks" / "build").mkdir(parents=True)
        (repo / "theme" / "sgs-theme").mkdir(parents=True)
        db = base / "fw.db"
        db.write_bytes(b"db-v1")

        def git(*a: str) -> None:
            subprocess.run(["git", *a], cwd=repo, check=True, capture_output=True)

        git("init", "-q")
        git("config", "user.email", "selftest@example.invalid")
        git("config", "user.name", "sgs-deploy-selftest")
        (repo / ".gitignore").write_text("plugins/sgs-blocks/build/\n", encoding="utf-8")
        (repo / "plugins" / "sgs-blocks" / "a.php").write_text("v1", encoding="utf-8")
        git("add", "-A")
        git("commit", "-qm", "one")

        k1 = run_key(repo, isolated=True, no_cache=False, db=db)
        if run_key(repo, isolated=False, no_cache=False, db=db) is not None:
            failures.append("a shared-checkout (non-isolated) run got a cache key")
        if run_key(repo, isolated=True, no_cache=True, db=db) is not None:
            failures.append("--no-cache still got a cache key")
        db.write_bytes(b"db-v2")
        if run_key(repo, isolated=True, no_cache=False, db=db) == k1:
            failures.append("the key did not change when the framework DB changed")
        db.write_bytes(b"db-v1")
        (repo / "theme" / "sgs-theme" / "t.css").write_text("x", encoding="utf-8")
        git("add", "-A")
        git("commit", "-qm", "two")
        k2 = run_key(repo, isolated=True, no_cache=False, db=db)
        if k2 == k1:
            failures.append("the key did not change when a THEME file changed (gates read the theme)")

        if gate_pass(k2) is not None:
            failures.append("a key that never passed reads as passed")
        # A build: build/ output plus a generated file the build writes into the plugin.
        build = repo / "plugins" / "sgs-blocks" / "build"
        (build / "index.js").write_text("built", encoding="utf-8")
        gen = repo / "plugins" / "sgs-blocks" / "assets" / "gen.css"
        gen.parent.mkdir(parents=True)
        gen.write_text("generated", encoding="utf-8")
        record_pass(k2, repo, build, 12.0)
        if not gate_pass(k2):
            failures.append("a recorded pass is not read back")
        shutil.rmtree(build)
        gen.unlink()
        if not restore_build(k2, repo, build):
            failures.append("restore_build found nothing for a recorded pass")
        elif not (build / "index.js").is_file() or not gen.is_file():
            failures.append("restore_build did not restore build/ and the build's generated file")
        if restore_build(k1, repo, build):
            failures.append("restore_build restored for a key that never passed")

        held: list[str] = []
        lock_path = base / "pkg.lock"
        with package_lock(held.append, lock_path):
            try:
                with package_lock(held.append, lock_path, timeout_s=1.5):
                    failures.append("a second holder got the packaging lock while it was held")
            except TimeoutError:
                pass
        with package_lock(held.append, lock_path, timeout_s=1.5):
            pass  # free again once released
        os.environ.pop("SGS_DEPLOY_CACHE_DIR", None)
    return failures


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        problems = self_test()
        for p in problems:
            print(f"  FAIL {p}")
        print("[deploy_cache SELF-TEST " + ("FAIL]" if problems else "PASS]"))
        sys.exit(1 if problems else 0)
    print(__doc__)
