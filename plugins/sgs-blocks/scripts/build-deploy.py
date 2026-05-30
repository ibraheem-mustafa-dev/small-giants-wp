#!/usr/bin/env python3
"""
build-deploy.py — One-shot SGS build + tar + scp + remote extract + cleanup.

Usage examples:
    # Default (build + deploy theme & plugin to sandybrown canary)
    python plugins/sgs-blocks/scripts/build-deploy.py

    # Skip npm build (use existing build/ dir — for re-deploys)
    python plugins/sgs-blocks/scripts/build-deploy.py --skip-build

    # Deploy theme only
    python plugins/sgs-blocks/scripts/build-deploy.py --theme-only

    # Deploy to palestine-lives (requires explicit opt-in)
    python plugins/sgs-blocks/scripts/build-deploy.py --target palestine-lives

    # Dry run — print commands but do not execute
    python plugins/sgs-blocks/scripts/build-deploy.py --dry-run

    # With post-deploy URL verification
    python plugins/sgs-blocks/scripts/build-deploy.py --verify-url https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/

Guards (per spec):
    - Refuses to deploy with a dirty git working tree unless --allow-dirty
    - palestine-lives.org requires explicit --target palestine-lives (sandybrown is the safe canary)
    - Refuses to deploy if plugins/sgs-blocks/build/ is missing after build step

R-22-9 universal: hostnames and remote WP paths live in TARGETS dict — add a new
client by adding a single dict entry; no code changes needed elsewhere.
"""
from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Targets — extend here to add a new client deploy destination.
# ---------------------------------------------------------------------------
TARGETS = {
    "sandybrown": {
        "host": "sandybrown-nightingale-600381.hostingersite.com",
        "wp_content": "domains/sandybrown-nightingale-600381.hostingersite.com/public_html/wp-content",
        "explicit_opt_in_required": False,
    },
    "palestine-lives": {
        "host": "palestine-lives.org",
        "wp_content": "domains/palestine-lives.org/public_html/wp-content",
        "explicit_opt_in_required": True,
    },
}

# SSH endpoint is shared across targets (single Hostinger account).
SSH_ALIAS = "hd"
SSH_FALLBACK = ["-i", str(Path.home() / ".ssh" / "id_ed25519"), "-p", "65002"]
SSH_USER_HOST = "u945238940@141.136.39.73"

REPO_ROOT = Path(__file__).resolve().parents[3]
PLUGIN_DIR = REPO_ROOT / "plugins" / "sgs-blocks"
BUILD_DIR = PLUGIN_DIR / "build"
TARBALL_NAME = "sgs-deploy.tar"

TAR_EXCLUDES = [
    "node_modules",
    ".git",
    "plugins/sgs-blocks/src",
    "theme/sgs-theme/styles/*.json",
    "plugins/sgs-blocks/_retired",
    "*.pyc",
    "__pycache__",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    print(msg, flush=True)


def err(msg: str) -> None:
    print(f"[ERROR] {msg}", file=sys.stderr, flush=True)


def fmt_cmd(cmd: list[str]) -> str:
    return " ".join(shlex.quote(c) for c in cmd)


def run(cmd: list[str], *, dry_run: bool, cwd: Path | None = None) -> int:
    """Run command; honour dry-run; return exit code."""
    log(f"  $ {fmt_cmd(cmd)}" + (f"  (cwd={cwd})" if cwd else ""))
    if dry_run:
        return 0
    result = subprocess.run(cmd, cwd=cwd, check=False)
    return result.returncode


def ssh_has_alias(alias: str) -> bool:
    """Return True if the SSH config defines `alias`."""
    cfg = Path.home() / ".ssh" / "config"
    if not cfg.exists():
        return False
    try:
        text = cfg.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return False
    for line in text.splitlines():
        s = line.strip()
        if s.lower().startswith("host ") and alias in s.split()[1:]:
            return True
    return False


def ssh_base_cmd(use_alias: bool) -> list[str]:
    if use_alias:
        return ["ssh", SSH_ALIAS]
    return ["ssh", *SSH_FALLBACK, SSH_USER_HOST]


def scp_base_cmd(use_alias: bool, local: str, remote_path: str) -> list[str]:
    if use_alias:
        return ["scp", local, f"{SSH_ALIAS}:{remote_path}"]
    return ["scp", "-i", str(Path.home() / ".ssh" / "id_ed25519"), "-P", "65002",
            local, f"{SSH_USER_HOST}:{remote_path}"]


def git_is_dirty() -> bool:
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=REPO_ROOT, check=False, capture_output=True, text=True,
    )
    return bool(result.stdout.strip())


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------
def step_build(dry_run: bool) -> int:
    log("[1/5] npm run build")
    rc = run(["npm", "run", "build"], dry_run=dry_run, cwd=PLUGIN_DIR)
    if rc != 0:
        err(f"npm run build failed (exit {rc})")
        return rc
    if not dry_run and not BUILD_DIR.exists():
        err(f"build dir missing after build: {BUILD_DIR}")
        return 2
    log("[1/5] npm run build: OK")
    return 0


def step_tar(dry_run: bool, theme: bool, blocks: bool) -> int:
    log("[2/5] Packaging tarball")
    cmd: list[str] = ["tar", "-cf", TARBALL_NAME]
    for ex in TAR_EXCLUDES:
        cmd.append(f"--exclude={ex}")
    if theme:
        cmd.append("theme/sgs-theme")
    if blocks:
        cmd.append("plugins/sgs-blocks")
    rc = run(cmd, dry_run=dry_run, cwd=REPO_ROOT)
    if rc != 0:
        err(f"tar failed (exit {rc})")
        return rc
    if not dry_run and not (REPO_ROOT / TARBALL_NAME).exists():
        err(f"tarball not produced: {REPO_ROOT / TARBALL_NAME}")
        return 2
    log(f"[2/5] Packaging tarball: OK ({TARBALL_NAME})")
    return 0


def step_scp(dry_run: bool, use_alias: bool, host_label: str) -> int:
    log(f"[3/5] SCP to {host_label}")
    cmd = scp_base_cmd(use_alias, TARBALL_NAME, TARBALL_NAME)
    rc = run(cmd, dry_run=dry_run, cwd=REPO_ROOT)
    if rc != 0:
        err(f"scp failed (exit {rc})")
        return rc
    log("[3/5] SCP: OK")
    return 0


def step_remote_extract(dry_run: bool, use_alias: bool, wp_content: str,
                        theme: bool, blocks: bool) -> int:
    log("[4/5] Remote extract + install")
    parts: list[str] = [f"WP={shlex.quote(wp_content)}"]
    parts.append(f"tar -xf {TARBALL_NAME}")
    if blocks:
        parts.append("rm -rf $WP/plugins/sgs-blocks")
        parts.append("mkdir -p $WP/plugins")
        parts.append("mv plugins/sgs-blocks $WP/plugins/")
    if theme:
        parts.append("rm -rf $WP/themes/sgs-theme")
        parts.append("mkdir -p $WP/themes")
        parts.append("mv theme/sgs-theme $WP/themes/")
    # Cleanup remote staging dirs + tarball
    parts.append(f"rm -rf plugins theme {TARBALL_NAME}")
    remote_cmd = " && ".join(parts)
    cmd = ssh_base_cmd(use_alias) + [remote_cmd]
    rc = run(cmd, dry_run=dry_run)
    if rc != 0:
        err(f"remote extract failed (exit {rc})")
        return rc
    log("[4/5] Remote extract: OK")
    return 0


def step_local_cleanup(dry_run: bool) -> int:
    log("[5/5] Local cleanup")
    tarball = REPO_ROOT / TARBALL_NAME
    if dry_run:
        log(f"  $ rm {tarball}")
        log("[5/5] Local cleanup: OK")
        return 0
    if tarball.exists():
        try:
            tarball.unlink()
        except OSError as e:
            err(f"failed to remove {tarball}: {e}")
            return 1
    if tarball.exists():
        err(f"tarball still present after cleanup: {tarball}")
        return 1
    log("[5/5] Local cleanup: OK")
    return 0


def step_verify(url: str) -> None:
    """Optional post-deploy HTTP check. Warns on failure; never aborts."""
    log(f"[verify] GET {url}")
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={"User-Agent": "sgs-build-deploy/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            body = resp.read(8192).decode("utf-8", errors="ignore")
        log(f"[verify] HTTP {status}, {len(body)} bytes sampled")
        markers = ["wp-block-sgs", "sgs-", "wp-content"]
        found = [m for m in markers if m in body]
        if not found:
            log(f"[verify] WARNING: none of {markers} found in response (cache?)")
        else:
            log(f"[verify] markers present: {found}")
    except Exception as e:  # noqa: BLE001 — verify must never abort the run
        log(f"[verify] WARNING: verify request failed: {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Build, tar, scp, extract, and cleanup SGS deploy artefacts.",
    )
    p.add_argument("--target", choices=sorted(TARGETS.keys()), default="sandybrown",
                   help="Deploy target (default: sandybrown — the canary).")
    p.add_argument("--skip-build", action="store_true",
                   help="Skip npm run build; reuse existing build/.")
    scope = p.add_mutually_exclusive_group()
    scope.add_argument("--theme-only", action="store_true",
                       help="Deploy only theme/sgs-theme.")
    scope.add_argument("--blocks-only", action="store_true",
                       help="Deploy only plugins/sgs-blocks.")
    p.add_argument("--dry-run", action="store_true",
                   help="Print commands; do not execute.")
    p.add_argument("--allow-dirty", action="store_true",
                   help="Permit deploy with a dirty git working tree.")
    p.add_argument("--verify-url", default=None,
                   help="Optional URL to GET after deploy for a smoke check.")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    t0 = time.time()

    target_key = args.target
    target = TARGETS[target_key]

    # Explicit opt-in guard for protected targets
    if target["explicit_opt_in_required"] and "--target" not in sys.argv:
        err(f"target {target_key} requires explicit --target {target_key} opt-in")
        print(f"[ABORTED] reason: explicit-opt-in-required ({target_key})", flush=True)
        return 1

    # Git cleanliness guard
    if not args.allow_dirty and not args.dry_run:
        if git_is_dirty():
            err("git working tree is dirty; commit or pass --allow-dirty")
            print("[ABORTED] reason: git-status-dirty", flush=True)
            return 1

    # Resolve scope
    deploy_theme = not args.blocks_only
    deploy_blocks = not args.theme_only
    if not (deploy_theme or deploy_blocks):
        err("nothing to deploy (theme and blocks both excluded)")
        print("[ABORTED] reason: empty-scope", flush=True)
        return 1

    use_alias = ssh_has_alias(SSH_ALIAS)
    host_label = target["host"]
    log(f"[plan] target={target_key} host={host_label} theme={deploy_theme} "
        f"blocks={deploy_blocks} ssh-alias={'yes' if use_alias else 'no'} "
        f"dry-run={'yes' if args.dry_run else 'no'}")

    # [1/5] Build
    if args.skip_build:
        log("[1/5] npm run build: SKIPPED (--skip-build)")
        if deploy_blocks and not args.dry_run and not BUILD_DIR.exists():
            err(f"--skip-build but build dir missing: {BUILD_DIR}")
            print("[ABORTED] reason: build-dir-missing", flush=True)
            return 1
    else:
        if deploy_blocks:
            rc = step_build(args.dry_run)
            if rc != 0:
                print(f"[ABORTED] reason: build-failed (exit {rc})", flush=True)
                return 1
        else:
            log("[1/5] npm run build: SKIPPED (--theme-only)")

    # [2/5] Tar
    rc = step_tar(args.dry_run, theme=deploy_theme, blocks=deploy_blocks)
    if rc != 0:
        print(f"[ABORTED] reason: tar-failed (exit {rc})", flush=True)
        return 1

    # [3/5] SCP
    rc = step_scp(args.dry_run, use_alias, host_label)
    if rc != 0:
        print(f"[ABORTED] reason: scp-failed (exit {rc})", flush=True)
        return 1

    # [4/5] Remote extract
    rc = step_remote_extract(args.dry_run, use_alias, target["wp_content"],
                              theme=deploy_theme, blocks=deploy_blocks)
    if rc != 0:
        print(f"[ABORTED] reason: remote-extract-failed (exit {rc})", flush=True)
        return 1

    # [5/5] Local cleanup
    rc = step_local_cleanup(args.dry_run)
    if rc != 0:
        print(f"[ABORTED] reason: local-cleanup-failed (exit {rc})", flush=True)
        return 1

    # Optional verify
    if args.verify_url and not args.dry_run:
        step_verify(args.verify_url)
    elif args.verify_url and args.dry_run:
        log(f"[verify] SKIPPED (--dry-run); would GET {args.verify_url}")

    elapsed = int(time.time() - t0)
    print(f"[DONE] sgs-deploy completed in {elapsed}s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
