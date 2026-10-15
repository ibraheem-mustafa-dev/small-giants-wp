#!/usr/bin/env python3
"""deploy_ship.py - build-deploy.py's build and shipping steps: npm build, packaging, upload, the
remote extract with its .bak rotation, local cleanup and the isolated-worktree run.
"""
from __future__ import annotations

import argparse
import os
import shlex
import subprocess
import sys
import tempfile
import time
from pathlib import Path
import deploy_cache

from deploy_common import BUILD_DIR, ISOLATION_WORKTREE_PREFIX, PLUGIN_DIR, REMOTE_STAGING_DIR, REPO_ROOT, TARBALL_MAX_MB, TARBALL_NAME, TAR_EXCLUDES, THEME_JSON_PAYLOAD_NAME, composer_dump_autoload, err, fmt_cmd, log, resolve_exe, run, scp_base_cmd, ssh_base_cmd


def build_tar_cmd(theme: bool, blocks: bool, theme_json_payload: bool) -> list[str]:
    """The tar command step_tar runs. Pure, so the self-test packages with the real command."""
    cmd: list[str] = ["tar", "-cf", TARBALL_NAME]
    for ex in TAR_EXCLUDES:
        cmd.append(f"--exclude={ex}")
    if theme:
        cmd.append("theme/sgs-theme")
    if blocks:
        cmd.append("plugins/sgs-blocks")
    if theme and theme_json_payload:
        cmd.append(THEME_JSON_PAYLOAD_NAME)
    return cmd


def build_remote_extract_cmd(wp_content: str, theme: bool, blocks: bool,
                             theme_json_payload: bool) -> str:
    """The remote shell command step_remote_extract runs. Pure, so the self-test runs it verbatim.

    With ``theme_json_payload`` the staged theme.json replaces the framework one INSIDE THE
    STAGING COPY, straight after extraction and before any live directory is moved. The chain is
    `&&`-joined: if the payload is missing or empty the command stops there, the live theme is
    never swapped, and the deploy aborts with the client's current theme.json still in place.
    """
    # $WP is absolute before the cd below: the targets' wp_content is relative to the SSH home.
    wp = shlex.quote(wp_content) if wp_content.startswith("/") else f'"$PWD"/{shlex.quote(wp_content)}'
    parts: list[str] = [f"WP={wp}"]
    parts.append(f"rm -rf {REMOTE_STAGING_DIR}")
    parts.append(f"mkdir {REMOTE_STAGING_DIR}")
    parts.append(f"cd {REMOTE_STAGING_DIR}")
    parts.append(f"tar -xf ../{TARBALL_NAME}")
    if theme and theme_json_payload:
        parts.append(f"test -s {THEME_JSON_PAYLOAD_NAME}")
        parts.append(f"mv -f {THEME_JSON_PAYLOAD_NAME} theme/sgs-theme/theme.json")
    if blocks:
        # Rotate: drop the older backup, move the live copy aside, install new.
        parts.append("rm -rf $WP/plugins/sgs-blocks.bak")
        parts.append("if [ -d $WP/plugins/sgs-blocks ]; then "
                     "mv $WP/plugins/sgs-blocks $WP/plugins/sgs-blocks.bak; fi")
        parts.append("mkdir -p $WP/plugins")
        parts.append("mv plugins/sgs-blocks $WP/plugins/")
        # Bust the CSS-lift cache. `tar` PRESERVES mtimes on extraction, so
        # sgs-blocks.php keeps its ORIGINAL (pre-deploy) mtime after the move
        # above — sgs_css_check_deploy() (class-sgs-css-registry.php) keys its
        # epoch-bump signature on SGS_BLOCKS_VERSION + that file's mtime, so a
        # CSS-only change (no version bump) would silently never trip it and
        # every block's lifted <style> + ?ver= would keep serving the OLD CSS
        # after a deploy that "succeeded". touch forces the signature to
        # change on every deploy; the rm clears the stale lifted files so
        # they regenerate fresh on next render rather than serving until GC.
        parts.append("touch $WP/plugins/sgs-blocks/sgs-blocks.php")
        parts.append("rm -f $WP/uploads/sgs-css/sgs-*.css")
    if theme:
        # Dot-prefixed so WordPress's theme scanner (search_theme_directories())
        # skips it — WP excludes any directory starting with "." from the theme
        # listing, so the backup does not show up as a second "SGS Theme" on
        # the Themes admin page. Same rotation logic as sgs-blocks.bak above,
        # just a hidden folder name instead of a visible one.
        parts.append("rm -rf $WP/themes/.sgs-theme.bak")
        parts.append("if [ -d $WP/themes/sgs-theme ]; then "
                     "mv $WP/themes/sgs-theme $WP/themes/.sgs-theme.bak; fi")
        parts.append("mkdir -p $WP/themes")
        parts.append("mv theme/sgs-theme $WP/themes/")
    # Cleanup this run's staging folder and tarball only
    parts.append("cd ..")
    parts.append(f"rm -rf {REMOTE_STAGING_DIR} {TARBALL_NAME}")
    return " && ".join(parts)


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


def step_tar(dry_run: bool, theme: bool, blocks: bool,
             theme_json_payload: bytes | None = None) -> int:
    log("[2/5] Packaging tarball")

    # PRE-TAR: regenerate a dev-free autoloader before packaging, and ALWAYS
    # restore the dev-included one afterwards — even if packaging fails
    # partway. Only relevant for a blocks deploy (vendor/ lives inside
    # plugins/sgs-blocks); a --theme-only deploy never touches vendor/ at
    # all, and dry-run never writes to disk in the first place.
    #
    # Why this exists: the deployed tarball must ship an autoloader with zero
    # references to PHPStan/PHPUnit/etc (see TAR_EXCLUDES's `vendor/` block, and
    # composer_dump_autoload()'s docstring for the two-consumer split). A
    # dev-included autoloader in the tarball fatals the live site, and a local
    # gate that regenerates the working tree's autoloader dev-included would
    # silently undo the deploy-safe one. See:
    # `python plugins/sgs-blocks/scripts/check-render-undefined-vars.py --check`
    regen_composer = blocks and not dry_run
    if regen_composer:
        rc = composer_dump_autoload(dry_run, no_dev=True)
        if rc != 0:
            err(
                f"composer dump-autoload --no-dev failed (exit {rc}) — refusing to "
                "package a tarball with a dev-included autoloader (that is the exact "
                "bug that fatal'd the live site, D849). Nothing was packaged."
            )
            return rc

    stage = REPO_ROOT / THEME_JSON_PAYLOAD_NAME
    try:
        # The target's theme.json travels as its own member and replaces the framework copy
        # inside the remote staging dir (build_remote_extract_cmd), never after the swap.
        ship_payload = theme and theme_json_payload is not None
        if ship_payload and not dry_run:
            stage.write_bytes(theme_json_payload)
        cmd = build_tar_cmd(theme, blocks, ship_payload)
        rc = run(cmd, dry_run=dry_run, cwd=REPO_ROOT)
        if rc != 0:
            err(f"tar failed (exit {rc})")
            return rc
        if not dry_run and not (REPO_ROOT / TARBALL_NAME).exists():
            err(f"tarball not produced: {REPO_ROOT / TARBALL_NAME}")
            return 2

        # STRUCTURAL SIZE GUARD. The named excludes cover the known strays;
        # this catches the NEXT one. Any untracked tree dropped inside
        # plugins/sgs-blocks or theme/sgs-theme is invisible to the dirty gate and ships
        # silently -- the only symptom is a suddenly huge tarball, and "the deploy is a
        # bit slow" is exactly how that goes unnoticed. Fail closed and NAME the biggest
        # members, so the next person is not left guessing what got in.
        if not dry_run:
            size_mb = (REPO_ROOT / TARBALL_NAME).stat().st_size / (1024 * 1024)
            if size_mb > TARBALL_MAX_MB:
                err(
                    f"tarball is {size_mb:.0f}MB, over the {TARBALL_MAX_MB}MB ceiling. "
                    "Something that is not part of the plugin/theme is being packaged."
                )
                try:
                    import subprocess as _sp
                    out = _sp.run(
                        ["tar", "-tvf", TARBALL_NAME],
                        cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=180,
                    ).stdout.splitlines()
                    tops: dict[str, int] = {}
                    # `tar -tvf` prints: perms owner group SIZE date time path.
                    # Do NOT index a fixed column: the first two cuts of this guard did
                    # (parts[2], then "first digit in parts[1:5]") and both silently read
                    # the OWNER id 0, accumulating zeros and printing an alphabetical list
                    # of 0.0MB rows that named nothing. Anchor on the DATE instead and take
                    # the integer immediately before it. Verified against the real 113MB
                    # tarball: totals 108.6MB and names scripts/vendor/build, matching an
                    # independent awk pass. A diagnostic that fails quietly is worse than
                    # no diagnostic, because it reads as an answer.
                    import re as _re
                    _MONTH = _re.compile(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$")
                    _DATE = _re.compile(r"^\d{4}-\d{2}-\d{2}$")
                    for line in out:
                        parts = line.split()
                        if not parts:
                            continue
                        nbytes = None
                        for idx, tok in enumerate(parts):
                            if _MONTH.match(tok) or _DATE.match(tok):
                                for j in range(idx - 1, -1, -1):
                                    if parts[j].isdigit():
                                        nbytes = int(parts[j])
                                        break
                                break
                        if nbytes is None:
                            continue
                        key = "/".join(parts[-1].rstrip("/").split("/")[:3])
                        tops[key] = tops.get(key, 0) + nbytes
                    for path, nbytes in sorted(tops.items(), key=lambda kv: -kv[1])[:8]:
                        err(f"    {nbytes / (1024 * 1024):8.1f}MB  {path}")
                except Exception as exc:  # noqa: BLE001 - diagnostics only
                    err(f"    (could not enumerate tar members: {exc})")
                err(
                    "Fix: add it to TAR_EXCLUDES + .gitignore, or move it out of the "
                    "plugin/theme directory. Do NOT raise the ceiling to get past this."
                )
                return 2
        log(f"[2/5] Packaging tarball: OK ({TARBALL_NAME})")
        return 0
    finally:
        stage.unlink(missing_ok=True)
        # POST-TAR restore — runs on every exit path (success, tar failure, size
        # guard). NEVER leave the working tree in the --no-dev state: the next
        # developer's `npm run build` needs PHPStan's classmap present for
        # check-render-undefined-vars.py to run at all.
        if regen_composer:
            restore_rc = composer_dump_autoload(dry_run, no_dev=False)
            if restore_rc != 0:
                err(
                    f"composer dump-autoload --optimize (dev-included) restore FAILED "
                    f"(exit {restore_rc}) — the working tree's vendor/composer/"
                    "autoload_*.php are left in the --no-dev state. Local PHPStan gates "
                    "will fail until this is re-run by hand: "
                    "php composer.phar dump-autoload --optimize (from plugins/sgs-blocks/, "
                    "composer.phar is at the repo root)."
                )


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
                        theme: bool, blocks: bool, theme_json_payload: bool = False) -> int:
    """Extract + install, rotating the previous copy aside instead of deleting it.

    Deleting the live directory before extracting would leave nothing to roll
    back to after a bad deploy, so the outgoing copy is renamed to
    ``<dir>.bak`` (previous .bak dropped first, so exactly one generation is
    kept and disk use stays bounded). Recovery is then a single `mv` back —
    see ROLLBACK_HINT, which step_verify prints on failure.

    The theme's backup is named ``.sgs-theme.bak`` (dot-prefixed) rather than
    ``sgs-theme.bak`` — WordPress's theme directory scanner
    (``search_theme_directories()``) skips any directory starting with ``.``,
    so the backup does not show up as a second "SGS Theme" entry on the
    Themes admin page while still living in the same rollback location. The
    plugins backup keeps its visible name; WordPress's plugin scanner doesn't
    surface it the same way in normal use.
    """
    log("[4/5] Remote extract + install")
    remote_cmd = build_remote_extract_cmd(wp_content, theme, blocks, theme_json_payload)
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
        # node_modules/vendor are both gitignored and were never part of the
        # worktree checkout — symlink them read-only from the main checkout
        # rather than reinstalling. Safe to share: neither is written to by a
        # build (npm run build only writes build/; composer_dump_autoload()
        # writes vendor/autoload_*.php, which is why it is regenerated INSIDE
        # the worktree by the normal step_tar() call, same as any other run —
        # the symlink target is the shared vendor/, so that write lands in the
        # shared checkout too, exactly as it does for a single-checkout run).
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
