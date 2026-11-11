#!/usr/bin/env python3
"""run-motion-gates.py - run every motion gate and print one table (Spec 38A phase M1).

Discovers by glob, not by list:
  check-motion-*.py    runs `--check` and `--self-test`
  migrate-motion-*.py  runs `--check`
  migrate-easing-*.js  runs `--check` and `--self-test` under node (the FR-38A-54 single easing list)
A script that does not mention a flag in its source is shown as "n/a" for it, not as a failure. Writes nothing;
exits 1 when any run fails. Run from anywhere:  python plugins/sgs-blocks/scripts/run-motion-gates.py [--jobs N]

--jobs N runs N scripts at a time (default 1, one after another) and the table keeps discovery order. That is safe
because every script writes only to its own temp folder under --check and --self-test (the real-tree writes sit behind
--fix/--apply/--update-baseline, which this runner never passes). The default stays 1 because the full tier already
runs six gates at once: four motion scripts on top of that pushed check-motion-entrance-cascade.py --self-test from
33s to past the 600s timeout on a loaded machine (2026-11-11) and failed gate:full. Self-test: --self-test.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parents[2]
TIMEOUT_SECONDS = 600
PLAN = (("check-motion-*.py", ("--check", "--self-test")), ("migrate-motion-*.py", ("--check",)),
        ("migrate-easing-*.js", ("--check", "--self-test")))


def run(script: Path, flag: str) -> tuple[str, float, str]:
    if flag not in script.read_text(encoding="utf-8", errors="replace"):
        return "n/a", 0.0, ""
    started = time.monotonic()
    try:
        interpreter = shutil.which("node") if ".js" == script.suffix else sys.executable
        if not interpreter:
            return "FAIL", 0.0, "node not found on PATH"
        done = subprocess.run([interpreter, str(script), flag], cwd=REPO, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        return "FAIL", time.monotonic() - started, f"timed out after {TIMEOUT_SECONDS}s"
    tail = (done.stdout.strip().splitlines() or done.stderr.strip().splitlines() or [""])[-1]
    return ("ok" if done.returncode == 0 else "FAIL"), time.monotonic() - started, tail


DEFAULT_JOBS = 1


def discover(scripts: Path = SCRIPTS) -> list[tuple[Path, str]]:
    return [(script, flag) for pattern, flags in PLAN for script in sorted(scripts.glob(pattern)) for flag in flags]


def execute(work: list[tuple[Path, str]], jobs: int, runner=run) -> list[tuple[str, str, str, float, str]]:
    """Run every (script, flag), `jobs` at a time; rows come back in the order of `work`."""
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as pool:
        results = list(pool.map(lambda item: runner(*item), work))
    return [(script.name, flag, *result) for (script, flag), result in zip(work, results)]


def self_test() -> int:
    """Every planned run still runs, the table keeps discovery order, and one failing run still fails the whole.

    Each check runs against the real execute() and a planted faulty one (rows in finishing order, the natural
    mistake with a thread pool); the planted fault must be caught.
    """
    from concurrent.futures import as_completed

    work = [(Path(f"check-motion-{i}.py"), flag) for i in range(6) for flag in ("--check", "--self-test")]

    def fake(script, flag):
        time.sleep(0.03 * (6 - int(script.stem[-1])))  # later scripts finish first
        return ("FAIL", 0.0, "planted") if (script.name, flag) == ("check-motion-3.py", "--check") else ("ok", 0.0, "")

    def finishing_order(items, jobs, runner):
        with ThreadPoolExecutor(max_workers=jobs) as pool:
            futures = {pool.submit(runner, *item): item for item in items}
            return [(futures[f][0].name, futures[f][1], *f.result()) for f in as_completed(futures)]

    def problems_with(executor) -> list[str]:
        rows = executor(work, 4, fake)
        found = []
        if sorted((r[0], r[1]) for r in rows) != sorted((s.name, f) for s, f in work):
            found.append("not every planned run ran")
        if [(r[0], r[1]) for r in rows] != [(s.name, f) for s, f in work]:
            found.append("the table is not in discovery order")
        if [r for r in rows if r[2] == "FAIL"] != [("check-motion-3.py", "--check", "FAIL", 0.0, "planted")]:
            found.append("the planted failure was not reported exactly once")
        return found

    real, planted = problems_with(execute), problems_with(finishing_order)
    for line in real:
        print("FAIL", line)
    if not planted:
        print("FAIL negative control: rows in finishing order were not caught")
    ok = not real and planted
    print("run-motion-gates self-test:", "ok (every run runs, discovery order kept, a failure is reported; "
          "finishing-order rows caught)" if ok else "FAIL")
    return 0 if ok else 1


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    jobs = int(sys.argv[sys.argv.index("--jobs") + 1]) if "--jobs" in sys.argv else DEFAULT_JOBS
    rows = execute(discover(), jobs)
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
