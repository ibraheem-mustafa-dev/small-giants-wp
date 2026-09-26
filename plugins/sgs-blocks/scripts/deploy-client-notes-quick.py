#!/usr/bin/env python3
"""
deploy-client-notes-quick.py — a small, one-off deploy path for
plugins/sgs-client-notes (unified-email plan row 5b, Spec 04).

WHY THIS EXISTS INSTEAD OF EXTENDING build-deploy.py. That script is a
carefully engineered pipeline built around exactly two deploy roots (theme,
sgs-blocks) as boolean flags threaded through ~10 functions, with its own
webpack build step, composer dev/no-dev autoload swap, tarball size guard,
.bak rollback rotation, dirty-file gate and post-deploy verify — all
calibrated to that pair. sgs-client-notes is pure PHP + vanilla JS (no build
step) and genuinely making it a third first-class root there, to the same
safety bar (rollback, dirty-gate coverage, self-test cases), is a real piece
of design work — and that file is shared, live infrastructure two other
sessions were mid-deploy through when this was written (2026-09-27). Bean's
decision: ship this plugin today with a minimal script that reuses
build-deploy.py's tar/scp/ssh helpers by import, and treat the properly
engineered build-deploy.py integration as its own follow-up (tracked in
`.claude/plans/2026-09-26-unified-email-plan.md` row 5b).

WHAT THIS DOES NOT DO, compared to build-deploy.py:
  - No dirty-working-tree gate (refuses nothing; check `git status` yourself
    first).
  - No .bak rollback rotation — a failed extract can leave the remote
    directory half-written. Recovery: re-run this script, or restore from
    the site's own backup.
  - No composer/vendor handling (this plugin has none).
  - No post-deploy verify step beyond the WP-CLI activation check at the end.

Usage:
    python plugins/sgs-blocks/scripts/deploy-client-notes-quick.py --target sandybrown
    python plugins/sgs-blocks/scripts/deploy-client-notes-quick.py --target sandybrown --dry-run
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

def _load_build_deploy():
    """`build-deploy.py`'s filename has a hyphen, so it can't be a plain
    `import` target — load it by path instead."""
    import importlib.util

    path = Path(__file__).resolve().parent / "build-deploy.py"
    spec = importlib.util.spec_from_file_location("sgs_build_deploy", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_bd = _load_build_deploy()
TARGETS = _bd.TARGETS
log = _bd.log
err = _bd.err
run = _bd.run
resolve_exe = _bd.resolve_exe
ssh_base_cmd = _bd.ssh_base_cmd
scp_base_cmd = _bd.scp_base_cmd

REPO_ROOT = Path(__file__).resolve().parents[3]
PLUGIN_SRC = "plugins/sgs-client-notes"
RUN_ID = f"{__import__('os').getpid()}-{int(time.time())}"
TARBALL_NAME = f"sgs-client-notes-deploy-{RUN_ID}.tar"
REMOTE_STAGING_DIR = f"sgs-client-notes-deploy-{RUN_ID}"

# Nothing under this plugin ships build residue today (no npm build), but
# exclude the obvious non-runtime dirs on principle — same reasoning as
# build-deploy.py's TAR_EXCLUDES, scoped to what this plugin actually has.
TAR_EXCLUDES = [
    ".git",
    "*.pyc",
    "__pycache__",
    f"{PLUGIN_SRC}/tests",
]


def build_tar_cmd() -> list[str]:
    cmd: list[str] = ["tar", "-cf", TARBALL_NAME]
    for ex in TAR_EXCLUDES:
        cmd.append(f"--exclude={ex}")
    cmd.append(PLUGIN_SRC)
    return cmd


def build_remote_extract_cmd(wp_content: str) -> str:
    import shlex

    wp = shlex.quote(wp_content) if wp_content.startswith("/") else f'"$PWD"/{shlex.quote(wp_content)}'
    parts = [
        f"WP={wp}",
        f"rm -rf {REMOTE_STAGING_DIR}",
        f"mkdir {REMOTE_STAGING_DIR}",
        f"cd {REMOTE_STAGING_DIR}",
        f"tar -xf ../{TARBALL_NAME}",
        "mkdir -p $WP/plugins",
        "rm -rf $WP/plugins/sgs-client-notes",
        f"mv {PLUGIN_SRC} $WP/plugins/",
        "cd ..",
        f"rm -rf {REMOTE_STAGING_DIR} {TARBALL_NAME}",
    ]
    return " && ".join(parts)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--target", choices=sorted(TARGETS.keys()), default="sandybrown")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--activate", action="store_true", default=True,
                    help="Activate the plugin via WP-CLI after extract (default on).")
    args = p.parse_args()

    target = TARGETS[args.target]
    wp_content = target["wp_content"]

    log(f"[1/3] Packaging {PLUGIN_SRC}")
    cmd = build_tar_cmd()
    rc = run(cmd, dry_run=args.dry_run, cwd=REPO_ROOT)
    if rc != 0:
        err(f"tar failed (exit {rc})")
        return rc
    log("[1/3] Packaging: OK")

    log(f"[2/3] SCP to {args.target}")
    rc = run(scp_base_cmd(True, TARBALL_NAME, TARBALL_NAME), dry_run=args.dry_run, cwd=REPO_ROOT)
    if rc != 0:
        err(f"scp failed (exit {rc})")
        return rc
    log("[2/3] SCP: OK")

    log("[3/3] Remote extract + install")
    remote_cmd = build_remote_extract_cmd(wp_content)
    rc = run(ssh_base_cmd(True) + [remote_cmd], dry_run=args.dry_run)
    if rc != 0:
        err(f"remote extract failed (exit {rc})")
        return rc
    log("[3/3] Remote extract: OK")

    if not args.dry_run:
        (REPO_ROOT / TARBALL_NAME).unlink(missing_ok=True)

    if args.activate and not args.dry_run:
        wp_path = wp_content.rsplit("/wp-content", 1)[0]
        activate_cmd = f"cd {wp_path} && wp plugin activate sgs-client-notes"
        rc = run(ssh_base_cmd(True) + [activate_cmd], dry_run=args.dry_run)
        if rc != 0:
            err(f"wp plugin activate failed (exit {rc}) — extract succeeded, activation did not")
            return rc
        log("Activated sgs-client-notes.")

    log("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
