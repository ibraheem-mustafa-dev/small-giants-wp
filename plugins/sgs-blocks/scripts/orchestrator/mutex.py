#!/usr/bin/env python3
"""mutex.py -- Spec 31 Phase 5b.4 build mutex (FR19).

Prevents parallel `/sgs-update` + `/sgs-clone` runs from corrupting
sgs-framework.db. File-based lock at `.claude/scratch/spec-15-mutex.lock`
with stale-lock detection (lock older than `stale_after_seconds`
defaults to 3600 = 1 hour, configurable).

The mutex is INTENTIONALLY file-based (not OS fcntl) so it works
across Windows + POSIX without flock semantics. The lock file holds a
JSON payload `{holder, pid, started_at, command}` so contention errors
name the current holder.

Usage as context manager:
    from mutex import build_mutex
    with build_mutex(holder="sgs-clone", command="clone Mama's mockup"):
        ...  # protected region

Usage explicit:
    lock = build_mutex(holder="sgs-update")
    lock.acquire()
    try: ...
    finally: lock.release()

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_LOCK_PATH = Path(".claude/scratch/spec-15-mutex.lock")
DEFAULT_STALE_SECONDS = 3600  # 1 hour


class MutexBusy(RuntimeError):
    """Raised when the lock is held by another live holder."""

    def __init__(self, current_holder: dict):
        self.current_holder = current_holder
        super().__init__(
            f"build mutex held by {current_holder.get('holder')!r} "
            f"(pid={current_holder.get('pid')}, "
            f"started_at={current_holder.get('started_at')!r}, "
            f"command={current_holder.get('command')!r})"
        )


class BuildMutex:
    """File-based exclusive lock with stale-lock detection."""

    def __init__(
        self,
        holder: str,
        command: str | None = None,
        lock_path: Path = DEFAULT_LOCK_PATH,
        stale_after_seconds: int = DEFAULT_STALE_SECONDS,
    ) -> None:
        self.holder = holder
        self.command = command or ""
        self.lock_path = Path(lock_path)
        self.stale_after_seconds = stale_after_seconds
        self._acquired = False

    def _read_lock(self) -> dict | None:
        if not self.lock_path.exists():
            return None
        try:
            return json.loads(self.lock_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

    def _is_stale(self, current: dict) -> bool:
        ts = current.get("started_at_epoch")
        if not isinstance(ts, (int, float)):
            return True  # malformed lock, treat as stale
        age = time.time() - float(ts)
        return age > self.stale_after_seconds

    def acquire(self) -> None:
        """Take the lock. Raises MutexBusy if a live holder exists."""
        current = self._read_lock()
        if current is not None and not self._is_stale(current):
            raise MutexBusy(current)
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "holder": self.holder,
            "pid": os.getpid(),
            "started_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "started_at_epoch": time.time(),
            "command": self.command,
        }
        self.lock_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        self._acquired = True

    def release(self) -> None:
        """Release the lock if we own it. Silent no-op if not acquired."""
        if not self._acquired:
            return
        if self.lock_path.exists():
            current = self._read_lock() or {}
            if current.get("pid") == os.getpid() and current.get("holder") == self.holder:
                self.lock_path.unlink()
        self._acquired = False

    def status(self) -> dict:
        """Return a snapshot of the current lock state (held / free / stale)."""
        current = self._read_lock()
        if current is None:
            return {"state": "free"}
        if self._is_stale(current):
            return {"state": "stale", "holder": current}
        return {"state": "held", "holder": current}


@contextmanager
def build_mutex(
    holder: str,
    command: str | None = None,
    lock_path: Path = DEFAULT_LOCK_PATH,
    stale_after_seconds: int = DEFAULT_STALE_SECONDS,
):
    """Context-manager wrapper. Releases even on exception."""
    lock = BuildMutex(holder, command, lock_path, stale_after_seconds)
    lock.acquire()
    try:
        yield lock
    finally:
        lock.release()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_status = sub.add_parser("status")
    p_status.add_argument("--lock-path", type=Path, default=DEFAULT_LOCK_PATH)
    p_break = sub.add_parser("break", help="Force-remove a stale lock (use with care)")
    p_break.add_argument("--lock-path", type=Path, default=DEFAULT_LOCK_PATH)
    args = parser.parse_args(argv)

    if args.cmd == "status":
        lock = BuildMutex(holder="status-check", lock_path=args.lock_path)
        print(json.dumps(lock.status(), indent=2))
        return 0
    if args.cmd == "break":
        lock = BuildMutex(holder="break", lock_path=args.lock_path)
        status = lock.status()
        if status["state"] != "stale":
            print(f"refusing to break non-stale lock: {status}")
            return 1
        args.lock_path.unlink(missing_ok=True)
        print("stale lock removed")
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
