#!/usr/bin/env python3
"""run-motion-gates.py - run every motion gate and print one table (Spec 38A phase M1).

Discovers by glob, not by list:
  check-motion-*.py    runs `--check` and `--self-test`
  migrate-motion-*.py  runs `--check`
A script that does not mention a flag in its source is shown as "n/a" for it, not as a failure. Writes nothing;
exits 1 when any run fails. Run from anywhere:  python plugins/sgs-blocks/scripts/run-motion-gates.py
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parents[2]
TIMEOUT_SECONDS = 600
PLAN = (("check-motion-*.py", ("--check", "--self-test")), ("migrate-motion-*.py", ("--check",)))


def run(script: Path, flag: str) -> tuple[str, float, str]:
    if flag not in script.read_text(encoding="utf-8", errors="replace"):
        return "n/a", 0.0, ""
    started = time.monotonic()
    try:
        done = subprocess.run([sys.executable, str(script), flag], cwd=REPO, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        return "FAIL", time.monotonic() - started, f"timed out after {TIMEOUT_SECONDS}s"
    tail = (done.stdout.strip().splitlines() or done.stderr.strip().splitlines() or [""])[-1]
    return ("ok" if done.returncode == 0 else "FAIL"), time.monotonic() - started, tail


def main() -> int:
    rows: list[tuple[str, str, str, float, str]] = []
    for pattern, flags in PLAN:
        for script in sorted(SCRIPTS.glob(pattern)):
            for flag in flags:
                status, seconds, tail = run(script, flag)
                rows.append((script.name, flag, status, seconds, tail))
    if not rows:
        print("run-motion-gates: no motion gate scripts found")
        return 1
    width = max(len(r[0]) for r in rows)
    for name, flag, status, seconds, tail in rows:
        print(f"{status:<5} {name:<{width}}  {flag:<11} {seconds:5.1f}s  {tail[:90]}")
    failed = [r for r in rows if r[2] == "FAIL"]
    print(f"run-motion-gates: {len(rows) - len(failed)}/{len(rows)} ok" + (f", {len(failed)} FAILED" if failed else ""))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
