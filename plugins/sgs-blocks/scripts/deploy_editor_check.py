"""deploy_editor_check.py - build-deploy.py's opt-in editor-crash check (`--editor-check local-<site>`).

A server-side build and gate:full never load the block editor, so an `edit()` that throws ships green. This step puts the
build under test into a local mirror and opens the mirror's real pages, posts and templates in the block editor
(editor-crash/check-editor-loads.mjs), which fails on any block the editor cannot draw and on any console error.

It overwrites the plugin and theme of the named mirror with this tree's build (scripts/local-wp/sync-build.sh), so it is
opt-in and takes only a `local-*` mirror, never a live or test site. The mirror is shared with other sessions: tell them
before running it.

Self-test:  python plugins/sgs-blocks/scripts/deploy_editor_check.py --self-test
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from typing import Callable

MIRROR = re.compile(r"local-[a-z0-9-]+")
CHECKER = Path("plugins") / "sgs-blocks" / "scripts" / "editor-crash" / "check-editor-loads.mjs"
SYNC = Path("scripts") / "local-wp" / "sync-build.sh"
SYNC_TIMEOUT_S = 900
CHECK_TIMEOUT_S = 2400


def to_wsl(path: Path) -> str:
    """C:/x/y -> /mnt/c/x/y (the mirrors live in WSL)."""
    posix = str(path.resolve()).replace("\\", "/")
    match = re.match(r"^([A-Za-z]):/(.*)$", posix)
    if not match:
        raise ValueError(f"not a Windows drive path: {posix}")
    return f"/mnt/{match.group(1).lower()}/{match.group(2)}"


def valid_mirror(site: str) -> bool:
    return bool(MIRROR.fullmatch(site or ""))


def run(repo: Path, site: str, log: Callable[[str], None]) -> int:
    """Sync this tree's build into the mirror, then load its content in the editor. 0 = every target clean."""
    if not valid_mirror(site):
        log(f"[editor-check] refused: {site!r} is not a local mirror (local-<name>)")
        return 1
    log(f"[editor-check] syncing this build into {site}")
    try:
        synced = subprocess.run(
            ["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", to_wsl(repo / SYNC), site],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=SYNC_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        log(f"[editor-check] UNANSWERED: the sync into {site} took longer than {SYNC_TIMEOUT_S}s (not a pass)")
        return 2
    if synced.returncode != 0:
        log(f"[editor-check] sync failed (exit {synced.returncode}): {(synced.stderr or synced.stdout).strip()[-300:]}")
        return 1
    log(f"[editor-check] opening {site}'s pages, posts and templates in the block editor")
    try:
        checked = subprocess.run(["node", str(repo / CHECKER), "--site", site], cwd=repo, text=True, encoding="utf-8", errors="replace", timeout=CHECK_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        log(f"[editor-check] UNANSWERED: the editor run on {site} took longer than {CHECK_TIMEOUT_S}s (not a pass)")
        return 2
    if checked.returncode == 0:
        log("[editor-check] every target loaded with no crashed block and no console error")
    elif checked.returncode == 2:
        log("[editor-check] UNANSWERED: the mirror could not be measured (not a pass); see the lines above")
    return checked.returncode


def self_test() -> list[str]:
    failures = []
    for site, want in (("local-indus", True), ("local-eye-care", True), ("sandybrown", False), ("local-", False), ("local-x;rm -rf", False), ("", False)):
        if valid_mirror(site) != want:
            failures.append(f"valid_mirror({site!r}) should be {want}")
    messages: list[str] = []
    if run(Path("."), "indus-test", messages.append) != 1 or "not a local mirror" not in " ".join(messages):
        failures.append("a non-mirror target was not refused")
    if to_wsl(Path("C:/a/b")) != "/mnt/c/a/b":
        failures.append("to_wsl did not convert a drive path")
    return failures


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        problems = self_test()
        for line in problems:
            print("FAIL", line)
        print("self-test:", "FAIL" if problems else "ok (mirror names, refusal of a live target, drive-path conversion)")
        sys.exit(1 if problems else 0)
    print(__doc__)
    sys.exit(2)
