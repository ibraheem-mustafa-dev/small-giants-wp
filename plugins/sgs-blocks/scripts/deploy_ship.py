#!/usr/bin/env python3
"""deploy_ship.py - build-deploy.py's build and shipping steps: npm build, collecting the payload, sending only what
the site lacks (deploy_delta.py) through the resumable upload, the checked remote apply with its .bak rotation, local
cleanup and the isolated-worktree run.
"""
from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
import deploy_cache

import deploy_delta
import deploy_minify
import deploy_timing

from deploy_common import BUILD_DIR, FULL_PACKAGE_NAME, ISOLATION_WORKTREE_PREFIX, PLUGIN_DIR, REMOTE_STAGING_DIR, REPO_ROOT, SSH_ALIAS, SSH_USER_HOST, TARBALL_MAX_MB, TARBALL_NAME, composer_dump_autoload, err, fmt_cmd, log, resolve_exe, run, ssh_base_cmd


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------
def step_build(dry_run: bool) -> int:
    log("[1/5] npm run build")
    rc = run([resolve_exe("npm"), "run", "build"], dry_run=dry_run, cwd=PLUGIN_DIR)
    if rc != 0:
        err(f"npm run build failed (exit {rc})")
        return rc
    if not dry_run and not BUILD_DIR.exists():
        err(f"build dir missing after build: {BUILD_DIR}")
        return 2
    log("[1/5] npm run build: OK")
    return 0


def step_collect(dry_run: bool, theme: bool, blocks: bool,
                 theme_json_payload: bytes | None = None) -> tuple[int, dict[str, deploy_delta.Entry] | None]:
    """Read every file this deploy ships into memory with its sha256 (deploy_delta.collect_payload).

    A blocks deploy regenerates a dev-free Composer autoloader first and ALWAYS restores the dev-included one
    afterwards, even on failure. The payload must carry an autoloader with zero references to PHPStan/PHPUnit (their
    folders are excluded, and a dev-included vendor/composer/autoload_files.php requiring them fatal'd the live site,
    D849), while the working tree needs the dev-included one for check-render-undefined-vars.py and PHPStan. The bytes
    are read inside that window and held in memory, so a fallback full upload later ships exactly the same files.
    The target's client theme.json is placed in the payload here (the PROVEN CAUSE note in deploy_common.py).
    """
    log("[2/5] Collecting the payload")
    if dry_run:
        log("  (dry run) would regenerate the no-dev autoloader, read and hash every shipped file, restore the autoloader")
        return 0, {}
    regen_composer = blocks
    if regen_composer:
        rc = composer_dump_autoload(False, no_dev=True)
        if rc != 0:
            err(f"composer dump-autoload --no-dev failed (exit {rc}): refusing to ship a dev-included autoloader "
                "(the bug that fatal'd the live site, D849). Nothing was collected.")
            return rc, None
    try:
        try:
            payload = deploy_delta.collect_payload(REPO_ROOT, theme, blocks, theme_json_payload if theme else None)
        except (deploy_delta.PayloadError, OSError) as exc:
            err(f"payload: {exc}")
            return 2, None
        try:
            payload, css_before, css_after = deploy_minify.minify_payload(payload)
        except (RuntimeError, OSError, UnicodeDecodeError) as exc:
            err(f"payload: minifying the hand-written CSS failed, nothing was shipped: {exc}")
            return 2, None
        if css_before:
            log(f"[2/5] Hand-written CSS minified: {css_before / 1024:.0f} KB -> {css_after / 1024:.0f} KB")
        leaks = deploy_delta.dev_autoload_leaks(payload)
        if leaks:
            err("the payload's Composer autoloader still names dev-only packages (PHPStan/PHPUnit), which are not "
                f"shipped, so every page would fatal (D849): {', '.join(leaks)}. The --no-dev regeneration did not take.")
            return 2, None
        # SIZE GUARD. Any untracked tree dropped inside the plugin or theme folder ships silently; the only symptom
        # is a suddenly large payload, so fail closed and name the biggest folders.
        size_mb = deploy_delta.payload_bytes(payload) / (1024 * 1024)
        if size_mb > TARBALL_MAX_MB:
            err(f"the payload is {size_mb:.1f}MB, over the {TARBALL_MAX_MB}MB ceiling. Something that is not part of "
                "the plugin/theme is being shipped:")
            for path, nbytes in deploy_delta.largest_folders(payload):
                err(f"    {nbytes / (1024 * 1024):8.1f}MB  {path}")
            err("Fix: add it to TAR_EXCLUDES + .gitignore, or move it out of the plugin/theme folder. Do NOT raise "
                "the ceiling to get past this.")
            return 2, None
        log(f"[2/5] Payload: {len(payload)} files, {size_mb:.1f}MB")
        return 0, payload
    finally:
        if regen_composer:
            restore_rc = composer_dump_autoload(False, no_dev=False)
            if restore_rc != 0:
                err(f"composer dump-autoload --optimize (dev-included) restore FAILED (exit {restore_rc}): the working "
                    "tree's vendor/composer/autoload_*.php are left in the --no-dev state and local PHPStan gates will "
                    "fail until this is re-run by hand: php composer.phar dump-autoload --optimize (from "
                    "plugins/sgs-blocks/, composer.phar is at the repo root).")


UPLOAD_ATTEMPTS = 8
UPLOAD_PAUSE_SECONDS = 5


def sftp_batch_cmd(use_alias: bool, batch_path: str) -> list[str]:
    """The sftp command that runs one batch file against the deploy host."""
    if use_alias:
        return ["sftp", "-q", "-b", batch_path, SSH_ALIAS]
    return ["sftp", "-q", "-i", str(Path.home() / ".ssh" / "id_ed25519"), "-P", "65002", "-b", batch_path, SSH_USER_HOST]


def remote_file_size(use_alias: bool, remote: str) -> int | None:
    """Bytes the host holds for `remote` (relative to the login folder), None when the file does not exist.

    Raises OSError when the host cannot be asked, so the caller retries and never treats an unreachable host as an empty one.
    """
    result = subprocess.run(
        ssh_base_cmd(use_alias) + [f"stat -c %s {shlex.quote(remote)} 2>/dev/null; echo rc=$?"],
        capture_output=True, text=True, check=False,
    )
    if result.returncode != 0:
        raise OSError(f"ssh exit {result.returncode}")
    lines = result.stdout.split()
    if lines and lines[-1] == "rc=0" and len(lines) >= 2 and lines[-2].isdigit():
        return int(lines[-2])
    return None


def upload_resumable(use_alias: bool, local: str, remote: str, dry_run: bool, *, runner=run, remote_size=remote_file_size,
                     attempts: int = UPLOAD_ATTEMPTS, pause: float = UPLOAD_PAUSE_SECONDS, sleep=time.sleep) -> int:
    """Upload `local` to `remote` over sftp, resuming after a dropped connection; returns 0 only when the host holds every byte.

    The first attempt is `put`. After a failure the host's file size decides the next one: no file means `put` again,
    a smaller partial file means `reput` (sftp appends from the bytes already held), a larger leftover means `put` (overwrite), a complete file means done. A zero exit
    code counts only when the host reports the full size.
    """
    local_path = REPO_ROOT / local
    expected = 0 if dry_run else local_path.stat().st_size
    rc = 1
    for attempt in range(1, attempts + 1):
        verb = "put"
        if attempt > 1:
            try:
                held = remote_size(use_alias, remote)
            except OSError as exc:
                log(f"  [upload] attempt {attempt}: cannot reach the host ({exc}); waiting {pause}s")
                sleep(pause)
                continue
            if held == expected:
                return 0
            verb = "reput" if held and held < expected else "put"
        with tempfile.TemporaryDirectory(prefix="sgs-upload-") as td:
            batch = Path(td) / "upload.batch"
            batch.write_text(f'{verb} "{local}" "{remote}"\n', encoding="utf-8")
            rc = runner(sftp_batch_cmd(use_alias, str(batch)), dry_run=dry_run, cwd=REPO_ROOT)
        if dry_run:
            return rc
        if rc == 0:
            try:
                held = remote_size(use_alias, remote)
            except OSError:
                held = None
            if held == expected:
                return 0
            log(f"  [upload] attempt {attempt}: exit 0 but the host holds {held} of {expected} bytes")
            rc = rc or 1
        else:
            log(f"  [upload] attempt {attempt} dropped (exit {rc}); resuming")
        if attempt < attempts:
            sleep(pause)
    return rc


SHIP_UPLOAD_FAILED = 3
SHIP_APPLY_FAILED = 4      # the swap failed and was undone, the connection dropped, or the apply timed out
SHIP_TREE_DIFFERS = 5
SHIP_STAGE_FAILED = 6      # the staged tree failed its check; nothing was swapped
APPLY_TIMEOUT_S = 900


def run_remote(cmd: list[str], *, dry_run: bool, cwd=None) -> int:
    """run() with a timeout: a half-open connection must not hang the deploy. The remote command ignores hangups, so
    stopping the local ssh cannot interrupt a swap."""
    log(f"  $ {fmt_cmd(cmd)}")
    try:
        return subprocess.run(cmd, cwd=cwd, check=False, timeout=APPLY_TIMEOUT_S).returncode
    except subprocess.TimeoutExpired:
        err(f"the remote apply did not answer within {APPLY_TIMEOUT_S}s")
        return 124


def _send(plan: deploy_delta.Plan, payload: dict[str, deploy_delta.Entry], roots: list[tuple[str, str]],
          use_alias: bool, wp_content: str, package: str, *, uploader=None, runner=None) -> int:
    """Write the package for `plan`, upload it (resumable) and apply it remotely. 0, or a SHIP_* code."""
    uploader = uploader or upload_resumable
    runner = runner or run_remote
    deploy_timing.note("upload_mode", plan.mode)
    if plan.mode == "nothing":
        deploy_timing.note("upload_bytes", 0)
        log(f"[upload] mode=nothing ({plan.reason}): no upload, no swap")
        return 0
    size = deploy_timing.timed("package-write", deploy_delta.write_package, REPO_ROOT / package, payload, plan, roots)
    deploy_timing.note("upload_bytes", size)
    log(f"[upload] mode={plan.mode} files={len(plan.send)} deleted={len(plan.delete)} bytes={size} "
        f"(payload {plan.payload_bytes} bytes; {plan.reason})")
    rc = deploy_timing.timed("scp", uploader, use_alias, package, package, False)
    if rc != 0:
        err(f"upload failed after {UPLOAD_ATTEMPTS} attempts (exit {rc})")
        return SHIP_UPLOAD_FAILED
    remote = deploy_delta.build_remote_apply_cmd(wp_content, roots, plan.mode, package, REMOTE_STAGING_DIR)
    rc = deploy_timing.timed("remote-apply", runner, ssh_base_cmd(use_alias) + [remote], dry_run=False)
    if rc == 0:
        return 0
    if rc == deploy_delta.APPLY_STAGE_FAILED:
        err("the staged tree failed its check; nothing was swapped")
        return SHIP_STAGE_FAILED
    if rc == deploy_delta.APPLY_SWAP_FAILED:
        err("a folder swap failed; every swapped folder was put back, so the site runs the previous files")
    elif rc == deploy_delta.APPLY_AFTER_SWAP_FAILED:
        err("the new files are live, but touching sgs-blocks.php or clearing uploads/sgs-css failed")
    else:
        err(f"the remote apply ended with exit {rc} (a dropped connection or a timeout); the host ignores hangups, so "
            "it may have finished. Re-run the deploy: its listing shows what the site now holds.")
    return SHIP_APPLY_FAILED


def step_ship(dry_run: bool, use_alias: bool, wp_content: str, theme: bool, blocks: bool,
              payload: dict[str, deploy_delta.Entry] | None, force_full: bool = False, *,
              lister=None, uploader=None, runner=None) -> int:
    """[3/5]+[4/5] Send only what the site lacks, apply it in a checked staging copy, then confirm the live tree.

    The live listing decides nothing / delta / full (deploy_delta.plan_delta). A delta whose staged tree fails its
    check swaps nothing, and the full package is sent once instead. Any other apply failure stops: a second apply
    would replace the .bak, the only rollback copy. After the swap the live tree is listed again
    and must equal the payload file for file; a difference returns SHIP_TREE_DIFFERS (the files are live).
    """
    roots = deploy_delta.roots_for(theme, blocks)
    lister = lister or (lambda: deploy_delta.fetch_live_listing(use_alias, wp_content, roots, ssh_base_cmd(use_alias)))
    if dry_run:
        log("[3/5] (dry run) would list the live tree, upload only the difference and apply it in a checked copy:")
        log(f"  $ {fmt_cmd(ssh_base_cmd(use_alias) + [deploy_delta.live_listing_cmd(wp_content, roots)])}")
        log(f"  $ {fmt_cmd(ssh_base_cmd(use_alias) + [deploy_delta.build_remote_apply_cmd(wp_content, roots, 'delta', TARBALL_NAME, REMOTE_STAGING_DIR)])}")
        return 0
    assert payload is not None
    live, why = deploy_timing.timed("live-listing", lister)
    plan = deploy_delta.plan_delta(payload, live, why, roots, force_full=force_full)
    rc = _send(plan, payload, roots, use_alias, wp_content, TARBALL_NAME, uploader=uploader, runner=runner)
    if rc == SHIP_STAGE_FAILED and plan.mode == "delta":
        log("[delta] the staged tree failed its check and nothing was swapped; sending the full package once")
        deploy_timing.note("upload_fallback", True)
        total = deploy_delta.payload_bytes(payload)
        plan = deploy_delta.Plan("full", list(payload), [], "the delta failed its check", total, total)
        rc = _send(plan, payload, roots, use_alias, wp_content, FULL_PACKAGE_NAME, uploader=uploader, runner=runner)
    if rc != 0:
        return rc
    if plan.mode == "nothing":
        return 0
    after, why = deploy_timing.timed("verify-tree", lister)
    want = {p: e.sha256 for p, e in payload.items()}
    if after is None or after.other or after.files != want:
        if after is None:
            err(f"[verify-tree] could not list the live tree after the swap: {why}")
        else:
            differ = sorted(p for p in set(want) | set(after.files) if want.get(p) != after.files.get(p))
            err(f"[verify-tree] the live tree is not the payload ({len(differ)} path(s) differ, "
                f"{len(after.other)} symlink(s) or special file(s)):")
            for p in (differ + after.other)[:12]:
                err(f"    {p}")
        return SHIP_TREE_DIFFERS
    log(f"[verify-tree] PASS: the live tree holds exactly the {len(want)} payload files")
    return 0


def step_local_cleanup(dry_run: bool) -> int:
    log("[5/5] Local cleanup")
    packages = [REPO_ROOT / TARBALL_NAME, REPO_ROOT / FULL_PACKAGE_NAME]
    if dry_run:
        log(f"  $ rm -f {' '.join(str(p) for p in packages)}")
        log("[5/5] Local cleanup: OK")
        return 0
    for package in packages:
        try:
            package.unlink(missing_ok=True)
        except OSError as e:
            err(f"failed to remove {package}: {e}")
            return 1
        if package.exists():
            err(f"package still present after cleanup: {package}")
            return 1
    log("[5/5] Local cleanup: OK")
    return 0


def vendor_shell(src: Path, dst: Path) -> None:
    """A real vendor/ for the worktree: its own copy of composer/ and autoload.php (the only files
    composer_dump_autoload() writes), and a link to each package folder of the shared vendor/.

    Composer computes the autoloader's base path from vendor/'s real location. With vendor/ itself a link, that is
    the shared checkout, so the base path climbed into this temp worktree, the shared checkout's autoloader was
    rewritten under every other session, and the shipped autoload_*.php changed on every deploy (a five-file delta
    for an unchanged payload). With a real vendor/ the base path is dirname($vendorDir) and the shared one is
    never written.
    """
    dst.mkdir()
    for entry in src.iterdir():
        if entry.name in ("composer", "autoload.php"):
            if entry.is_dir():
                shutil.copytree(entry, dst / entry.name)
            else:
                shutil.copy2(entry, dst / entry.name)
        else:
            os.symlink(entry, dst / entry.name, target_is_directory=entry.is_dir())


def run_isolated(args: "argparse.Namespace") -> int:
    """Create an isolated worktree at HEAD, re-exec this script's WORKTREE COPY
    with the same argv plus --no-isolate, and clean the worktree up after —
    success, failure, or exception. Returns the child process's exit code.
    """
    wt_dir = Path(tempfile.gettempdir()) / f"{ISOLATION_WORKTREE_PREFIX}-{os.getpid()}-{int(time.time())}"
    log(f"[isolate] creating worktree at {wt_dir}")
    created = subprocess.run(
        ["git", "worktree", "add", str(wt_dir), "HEAD"],
        cwd=str(REPO_ROOT), capture_output=True, text=True, check=False,
    )
    if created.returncode != 0:
        err(f"[isolate] git worktree add failed: {created.stderr.strip()}")
        print("[ABORTED] reason: worktree-create-failed", flush=True)
        return 1

    try:
        # node_modules is gitignored and was never part of the worktree checkout,
        # so it is linked from the main checkout rather than reinstalled (a build
        # writes only build/). vendor/ is a real folder instead (vendor_shell()):
        # composer_dump_autoload() writes vendor/autoload.php and vendor/composer/,
        # and through a link to the shared vendor/ those writes landed in the
        # shared checkout with a base path into this temp worktree, which also
        # shipped (proven 2026-11-11 on sandybrown's autoload_psr4.php).
        # scripts/computed-route/node_modules is linked too: the prebuild's
        # run-motion-fx-generators.js runs validate-motion-presets.mjs, which
        # imports scripts/computed-route/lib/motion-schema.mjs and its ajv 8
        # (plugins/sgs-blocks/node_modules holds only ajv 6, without dist/2020).
        for rel in (
            Path("plugins/sgs-blocks/node_modules"),
            Path("plugins/sgs-blocks/vendor"),
            Path("scripts/computed-route/node_modules"),
        ):
            src = REPO_ROOT / rel
            dst = wt_dir / rel
            if not src.exists() or dst.exists():
                continue
            dst.parent.mkdir(parents=True, exist_ok=True)
            try:
                if rel.name == "vendor":
                    vendor_shell(src, dst)
                else:
                    os.symlink(src, dst, target_is_directory=True)
            except OSError as exc:
                err(f"[isolate] symlink failed for {rel}: {exc} — on Windows this "
                    "needs Developer Mode enabled or an elevated shell for "
                    "os.symlink(); re-run with --no-isolate to opt out.")
                print("[ABORTED] reason: worktree-symlink-failed", flush=True)
                return 1

        wt_script = wt_dir / "plugins" / "sgs-blocks" / "scripts" / "build-deploy.py"
        if not wt_script.exists():
            err(f"[isolate] worktree script missing: {wt_script}")
            print("[ABORTED] reason: worktree-script-missing", flush=True)
            return 1

        child_argv = [sys.executable, str(wt_script)] + sys.argv[1:] + ["--no-isolate"]
        log(f"[isolate] re-exec: {fmt_cmd(child_argv)}")
        # The child's REPO_ROOT is the worktree; step_theme_json_guard needs the SHARED
        # checkout's working copy of the client snapshot (where an uncommitted push came from).
        # SGS_DEPLOY_ISOLATED: the child's tree is exactly HEAD, so deploy_cache may serve it.
        child_env = dict(os.environ, SGS_DEPLOY_SHARED_ROOT=str(REPO_ROOT),
                         **{deploy_cache.ISOLATED_ENV: "1"})
        proc = subprocess.run(child_argv, check=False, env=child_env)
        return proc.returncode
    finally:
        log(f"[isolate] removing worktree {wt_dir}")
        cleanup = subprocess.run(
            ["git", "worktree", "remove", "--force", str(wt_dir)],
            cwd=str(REPO_ROOT), capture_output=True, text=True, check=False,
        )
        if cleanup.returncode != 0:
            err(f"[isolate] worktree remove failed (leaked at {wt_dir}): "
                f"{cleanup.stderr.strip()} — clean up by hand: "
                f"git worktree remove --force {wt_dir}")
