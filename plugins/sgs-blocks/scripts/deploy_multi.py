#!/usr/bin/env python3
"""deploy_multi.py - build-deploy.py's multi-site run: one build and gate:full, then every site at once.

`--target sandybrown,eye-care-test` (or `--target all`) builds and gates once in the
isolated worktree, then starts one child deploy per site from that same worktree with
`--built-by-parent`, all at the same time. Each child runs everything that depends on its
site (stored-content audit, ownership marker, theme.json, packaging, upload, unpack,
purge, live checks) and writes its own log; the parent prints one line per site and exits
non-zero if any site did not finish with [DONE].

Self-test:  python plugins/sgs-blocks/scripts/deploy_multi.py --self-test
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Callable, Iterable

CANARY = "sandybrown"
STATUS = re.compile(r"^\[(DONE|ABORTED|DEPLOYED-BUT-[A-Z-]+)\].*")


def resolve_targets(value: str, known: Iterable[str]) -> list[str]:
    """`all`, one name or a comma list -> target names, the canary first. Unknown names raise."""
    names = sorted(known)
    if value.strip() == "all":
        wanted = names
    else:
        wanted = []
        for name in (n.strip() for n in value.split(",")):
            if name and name not in wanted:
                wanted.append(name)
    unknown = [n for n in wanted if n not in names]
    if unknown or not wanted:
        raise ValueError(f"unknown target(s) {unknown or [value]}; known: {', '.join(names)}, or all")
    return sorted(wanted, key=lambda n: (n != CANARY, wanted.index(n)))


def child_argv(argv: list[str], target: str) -> list[str]:
    """This run's arguments for one site: its own --target, and the build marked done."""
    out: list[str] = []
    skip = False
    for arg in argv:
        if skip:
            skip = False
            continue
        if arg == "--target":
            skip = True
            continue
        if arg.startswith("--target="):
            continue
        out.append(arg)
    return out + ["--target", target, "--built-by-parent"]


def run_children(script: Path, argv: list[str], targets: list[str],
                 log: Callable[[str], None]) -> int:
    """Deploys every target at once from this checkout; returns 0 only if all reached [DONE]."""
    stamp = f"{os.getpid()}-{int(time.time())}"
    running = []
    for target in targets:
        log_path = Path(tempfile.gettempdir()) / f"sgs-deploy-{target}-{stamp}.log"
        cmd = [sys.executable, str(script)] + child_argv(argv, target)
        fh = log_path.open("w", encoding="utf-8")
        proc = subprocess.Popen(cmd, stdout=fh, stderr=subprocess.STDOUT, env=dict(os.environ))
        running.append((target, proc, fh, log_path, time.time()))
        log(f"[multi] {target}: started (log {log_path})")
    failed = 0
    for target, proc, fh, log_path, began in running:
        rc = proc.wait()
        fh.close()
        status = last_status(log_path)
        if rc != 0 or not status.startswith("[DONE]"):
            failed += 1
        log(f"[multi] {target}: {status or f'no result line (exit {rc})'} "
            f"[{round(time.time() - began)}s] log {log_path}")
    if failed:
        print(f"[ABORTED] reason: {failed} of {len(targets)} site deploy(s) did not finish; "
              "read each log above", flush=True)
        return 1
    return 0


def last_status(log_path: Path) -> str:
    try:
        lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return ""
    found = [ln.strip() for ln in lines if STATUS.match(ln.strip())]
    return found[-1] if found else ""


def self_test() -> list[str]:
    failures: list[str] = []
    known = ["eye-care-test", "indus-test", "mamas-test", "sandybrown"]
    if resolve_targets("all", known)[0] != CANARY or len(resolve_targets("all", known)) != 4:
        failures.append("`all` did not resolve to every target, canary first")
    if resolve_targets("eye-care-test, sandybrown,eye-care-test", known) != ["sandybrown", "eye-care-test"]:
        failures.append("a comma list was not de-duplicated with the canary first")
    for bad in ("nope", "sandybrown,nope", ""):
        try:
            resolve_targets(bad, known)
            failures.append(f"an unknown target list was accepted: {bad!r}")
        except ValueError:
            pass
    got = child_argv(["--theme-only", "--target", "a,b", "--no-isolate", "--target=c"], "b")
    if got != ["--theme-only", "--no-isolate", "--target", "b", "--built-by-parent"]:
        failures.append(f"child_argv kept a parent --target or lost a flag: {got}")
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "x.log"
        p.write_text("[plan] x\n[ABORTED] reason: y\n", encoding="utf-8")
        if not last_status(p).startswith("[ABORTED]"):
            failures.append("last_status missed an [ABORTED] line")
        p.write_text("[verify] ok\n", encoding="utf-8")
        if last_status(p):
            failures.append("last_status invented a result for a log with none")
    return failures


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        problems = self_test()
        for p in problems:
            print(f"  FAIL {p}")
        print("[deploy_multi SELF-TEST " + ("FAIL]" if problems else "PASS]"))
        sys.exit(1 if problems else 0)
    print(__doc__)
