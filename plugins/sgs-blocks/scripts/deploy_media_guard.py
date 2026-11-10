"""Spec 49 §13 deploy refusal: a post-cutover build never ships to a target whose saved content still holds old media attributes.

Post-cutover means some block.json under src/blocks declares `kinds` on a `supports.sgs.mediaElements` entry (the detector's own
marker, `migrate-media-system/mapping.py::any_block_adopted`). The target's saved content is exported over SSH with one read-only
command (`corpus.py::export_command`) and checked by `migrate-media-system/cli.py check --content FILE --active on`.
The detector is always called as a subprocess so this module never imports its generically named modules.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

from deploy_common import err, log, ssh_base_cmd

DETECTOR_DIR = Path(__file__).resolve().parent / "migrate-media-system"
FIRST_LINES = 6
# `check` also scans the repo's own files unless --target names kinds; a kind that matches nothing limits it to the exported content.
NO_REPO_KIND = "saved-content-only"

_MARKER = "import sys; sys.path.insert(0, sys.argv[1]); import mapping; print(int(bool(mapping.any_block_adopted())))"
# Prefers corpus.export_command; until it exists the same read-only command is built from corpus.POST_TYPES.
_EXPORT = (
    "import sys; sys.path.insert(0, sys.argv[1]); import corpus\n"
    "wp = sys.argv[2]\n"
    "if hasattr(corpus, 'export_command'):\n"
    "    print(corpus.export_command(wp))\n"
    "else:\n"
    "    import shlex\n"
    "    print(f'wp --path={shlex.quote(wp)} post list --post_type={corpus.POST_TYPES} --post_status={corpus.POST_STATUSES} "
    "--fields=ID,post_type,post_name,post_status,post_content --format=json')\n"
)


def build_is_post_cutover() -> bool:
    out = subprocess.run([sys.executable, "-c", _MARKER, str(DETECTOR_DIR)], capture_output=True, text=True, encoding="utf-8")
    if out.returncode != 0 or out.stdout.strip() not in ("0", "1"):
        raise RuntimeError(f"cutover marker unreadable: {(out.stderr or out.stdout).strip()[:300]}")
    return out.stdout.strip() == "1"


def export_command_for(wp_root: str) -> str:
    out = subprocess.run([sys.executable, "-c", _EXPORT, str(DETECTOR_DIR), wp_root], capture_output=True, text=True, encoding="utf-8")
    if out.returncode != 0 or not out.stdout.strip():
        raise RuntimeError(f"export command unavailable: {(out.stderr or '').strip()[:300]}")
    return out.stdout.strip()


def run_detector(content_file: Path) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(DETECTOR_DIR / "cli.py"), "check", "--content", str(content_file), "--active", "on",
                           "--target", NO_REPO_KIND],
                          capture_output=True, text=True, encoding="utf-8")


def verdict(returncode: int, stdout: str) -> tuple[bool, str]:
    """(clean, summary): the detector's own count line and its first few offending blocks."""
    lines = [ln for ln in stdout.splitlines() if ln.strip()]
    return returncode == 0, "\n".join(lines[: FIRST_LINES + 1])


def step_media_guard(dry_run: bool, use_alias: bool, target_key: str, wp_content: str, fetch=None, post_cutover=None) -> int:
    """Return 0 to continue, 1 to refuse. `fetch` and `post_cutover` are test seams; the real ones use SSH and the detector."""
    try:
        cutover = build_is_post_cutover() if post_cutover is None else post_cutover
    except RuntimeError as e:
        err(f"[media-guard] {e}")
        return 1
    if not cutover:
        log("[media-guard] SKIPPED: pre-cutover build (no block declares media `kinds`)")
        return 0
    if dry_run:
        log("[media-guard] SKIPPED (--dry-run); would export saved content from the target and run the media detector")
        return 0
    wp_root = wp_content.rsplit("/wp-content", 1)[0]
    log(f"[media-guard] post-cutover build: exporting saved content from {target_key} (read-only)")
    try:
        if fetch is None:
            remote = export_command_for(wp_root)
            out = subprocess.run(ssh_base_cmd(use_alias) + [remote], capture_output=True, text=True, encoding="utf-8",
                                 errors="replace", timeout=240)
            if out.returncode != 0:
                raise RuntimeError(f"SSH export failed (exit {out.returncode}): {(out.stderr or '').strip()[:300]}")
            raw = out.stdout
        else:
            raw = fetch(target_key)
        posts = json.loads(raw[raw.index("["):])
    except (RuntimeError, subprocess.SubprocessError, OSError, ValueError) as e:
        err(f"[media-guard] {target_key}: cannot read saved content: {e}")
        err("fail-closed on purpose: unchecked saved content cannot be shown free of old media attributes")
        return 1
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / f"{target_key}.json"
        path.write_text(json.dumps(posts), encoding="utf-8")
        res = run_detector(path)
    clean, summary = verdict(res.returncode, res.stdout)
    if clean:
        log(f"[media-guard] PASS: {target_key} saved content ({len(posts)} item(s)) holds no old media attributes")
        return 0
    err(f"[media-guard] REFUSED: target {target_key} still holds old media attributes under this post-cutover build:")
    for ln in summary.splitlines():
        err(f"  {ln}")
    err("deploy-and-migrate (Spec 49 §13: back up, deploy, fix, check, purge, or restore) is what clears this")
    return 1


def self_test() -> list[str]:
    """Clean export passes, one old attribute refuses (negative control), pre-cutover skips. No network."""
    failures: list[str] = []
    good = json.dumps([{"ID": 1, "post_type": "page", "post_name": "a", "post_status": "publish",
                        "post_content": '<!-- wp:sgs/hero {"headline":"x"} /-->'}])
    old = json.dumps([{"ID": 2, "post_type": "page", "post_name": "b", "post_status": "publish",
                       "post_content": '<!-- wp:sgs/hero {"backgroundImage":{"id":5,"url":"https://x/y.jpg"}} /-->'}])
    fail_fetch = (lambda _t: (_ for _ in ()).throw(AssertionError("pre-cutover must not fetch")))
    if step_media_guard(False, False, "t", "/x/wp-content", fetch=fail_fetch, post_cutover=False) != 0:
        failures.append("media guard: a pre-cutover build did not skip")
    if step_media_guard(False, False, "t", "/x/wp-content", fetch=lambda _t: good, post_cutover=True) != 0:
        failures.append("media guard: a clean export was refused")
    if step_media_guard(False, False, "t", "/x/wp-content", fetch=lambda _t: old, post_cutover=True) != 1:
        failures.append("media guard NEGATIVE CONTROL: an export with an old attribute was not refused")
    if step_media_guard(False, False, "t", "/x/wp-content", fetch=lambda _t: "not json", post_cutover=True) != 1:
        failures.append("media guard: an unreadable export did not fail closed")
    return failures
