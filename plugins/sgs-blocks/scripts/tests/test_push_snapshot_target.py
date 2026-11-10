"""push-theme-snapshot.py ships the snapshot the target site owns, the same file build-deploy.py ships.

A client with two sites (Eye Care: eye-care-test and eye-care-clone-test) keeps one snapshot per site, named by the
target's "snapshot" in deploy_common.TARGETS. Pushing the client's default snapshot to the other site would rename the
palette its blocks use.

Run: python plugins/sgs-blocks/scripts/tests/test_push_snapshot_target.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
sys.path.insert(0, str(SCRIPTS))

spec = importlib.util.spec_from_file_location("push_theme_snapshot", SCRIPTS / "push-theme-snapshot.py")
pts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pts)
import deploy_common  # noqa: E402

failures = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f": {detail}"))
    if not cond:
        failures.append(name)


own = next(t for t in deploy_common.TARGETS.values() if t.get("snapshot"))
path = pts.local_snapshot_path(own["client"], own["host"])
check("a target with its own snapshot ships that file", path.as_posix().endswith(own["snapshot"]), path)

plain = next(t for t in deploy_common.TARGETS.values() if t.get("client") == own["client"] and not t.get("snapshot"))
path = pts.local_snapshot_path(plain["client"], plain["host"])
check("a sibling target without one ships the client's snapshot", path.as_posix().endswith(f"sites/{plain['client']}/theme-snapshot.json"), path)

path = pts.local_snapshot_path(own["client"], "not-a-known-host.example")
check("an unknown domain ships the client's snapshot", path.as_posix().endswith(f"sites/{own['client']}/theme-snapshot.json"), path)

sys.exit(1 if failures else 0)
