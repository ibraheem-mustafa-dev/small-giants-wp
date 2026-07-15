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

    # Verify a specific page instead of the target's homepage
    python plugins/sgs-blocks/scripts/build-deploy.py --verify-url https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/

Guards (per spec):
    - Refuses to deploy when a file that SHIPS AND EXECUTES is uncommitted, unless
      --allow-dirty (see deployed_dirty_files() — scoped on purpose; a repo-wide
      dirty check is always true here, so it was bypassed every run and protected
      nothing)
    - Post-deploy smoke test runs BY DEFAULT and ABORTS on a 5xx or a WordPress
      fatal (opt out with --skip-verify)
    - palestine-lives.org requires explicit --target palestine-lives (sandybrown is the safe canary)
    - Refuses to deploy if plugins/sgs-blocks/build/ is missing after build step

Both guards were hardened on 2026-07-14 after an unfinished, uncommitted edit was
deployed to BOTH live client sites and took them down with a PHP fatal for ~2.5
hours. All three safety mechanisms were inert at the time: the dirty gate was
bypassed by a permanently-dirty repo, verify was opt-in, and verify could only
warn — so the deploy that broke both sites reported [DONE].

R-22-9 universal: hostnames and remote WP paths live in TARGETS dict — add a new
client by adding a single dict entry; no code changes needed elsewhere.
"""
from __future__ import annotations

import argparse
import json
import shlex
import shutil
import subprocess
import sys
import tempfile
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

# WP-internal post types whose post_content structurally cannot carry SGS block
# markup. Everything else on the site — pages, posts, reusable blocks, templates,
# template parts, and any client CPT — IS scanned by step_oldshape_audit. This is
# an exclusion list, not a roster: a CPT added tomorrow is covered automatically.
NON_BLOCK_POST_TYPES = (
    "attachment", "revision", "nav_menu_item", "custom_css", "customize_changeset",
    "oembed_cache", "user_request", "wp_global_styles", "wp_font_family", "wp_font_face",
)

TAR_EXCLUDES = [
    "node_modules",
    ".git",
    "plugins/sgs-blocks/src",
    "theme/sgs-theme/styles/*.json",
    "plugins/sgs-blocks/_retired",
    "*.pyc",
    "__pycache__",
]

# Mirror of the tarball scope, used by deployed_dirty_files(). Keep in step with
# TAR_EXCLUDES above: these describe which tracked files actually reach a live
# site and execute there. plugins/sgs-blocks/build/ is gitignored, so compiled
# output never shows up in `git status` and needs no entry here.
DEPLOY_ROOTS = ("theme/sgs-theme/", "plugins/sgs-blocks/")
DEPLOY_SKIP_PREFIXES = (
    # NOTE: plugins/sgs-blocks/src/ is deliberately NOT skipped. It is excluded
    # from the tarball, but `npm run build` COMPILES it into build/ (and
    # --webpack-copy-php copies each block's render.php across), and build/ does
    # ship. So an uncommitted src/ file reaches production just as surely as one
    # in includes/ — skipping it would leave exactly the hole this gate exists to
    # close. build/ itself is gitignored, so it never appears in `git status`;
    # src/ is the only place that churn is visible.
    "plugins/sgs-blocks/_retired/",   # excluded from the tar
    "theme/sgs-theme/styles/",        # per-client snapshots, pushed separately
    "plugins/sgs-blocks/scripts/",    # tooling — ships but never executes in WP
    "plugins/sgs-blocks/tests/",      # tests — ship but never execute in WP
)
DEPLOY_SKIP_BASENAMES = {
    "package-lock.json",
    "package.json",
    # Generated by scripts/build-lucide-icons: every regeneration rewrites the
    # "Last generated:" header timestamp, so the file is near-permanently dirty
    # while its PHP is unchanged. Left in, it would fire the gate on almost every
    # run, --allow-dirty would become reflex, and the gate would die exactly the
    # way the old whole-repo check did. Narrow + named + justified on purpose:
    # do NOT widen this set without the same reasoning written down.
    "lucide-icons.php",
}
RUNTIME_SUFFIXES = (".php", ".js", ".css", ".html", ".json")

ROLLBACK_HINT = (
    "roll back: ssh in and swap the .bak copy back, then reset OPcache:\n"
    "    mv $WP/plugins/sgs-blocks $WP/plugins/sgs-blocks.broken && \\\n"
    "    mv $WP/plugins/sgs-blocks.bak $WP/plugins/sgs-blocks\n"
    "  (same shape for themes/sgs-theme; then curl an opcache_reset() page)"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    print(msg, flush=True)


def err(msg: str) -> None:
    print(f"[ERROR] {msg}", file=sys.stderr, flush=True)


def fmt_cmd(cmd: list[str]) -> str:
    return " ".join(shlex.quote(c) for c in cmd)


def resolve_exe(name: str) -> str:
    """Resolve an executable to its full path.

    On Windows, bare ``subprocess.run(["npm", ...])`` fails for ``.cmd``/``.CMD``
    shims (npm, npx) because CreateProcess only auto-appends ``.exe`` — not the
    other PATHEXT entries. ``shutil.which`` honours PATHEXT, so it finds
    ``npm.CMD`` where a bare name would not. Falls back to the bare name on POSIX
    (where bare names resolve fine) or when the command is not found.
    """
    return shutil.which(name) or name


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


def deployed_dirty_files() -> list[str]:
    """Tracked, uncommitted files that BOTH ship in the tarball AND run at runtime.

    Deliberately narrower than a repo-wide ``git status``. A repo-wide check is
    always true here (``.claude/`` reports, ``package-lock.json``, ``reports/*.txt``
    churn constantly), so the guard was bypassed with ``--allow-dirty`` on every
    run and therefore protected nothing — that is how an unfinished edit reached
    two live client sites on 2026-07-14. Scoped this way the guard stays quiet
    during normal work, so when it fires it means a file that is about to execute
    on a live site differs from HEAD.
    """
    result = subprocess.run(
        ["git", "status", "--porcelain", "--untracked-files=no"],
        cwd=REPO_ROOT, check=False, capture_output=True, text=True,
    )
    hits: list[str] = []
    for line in result.stdout.splitlines():
        path = line[3:].strip()
        if "->" in path:  # rename entries read "old -> new"
            path = path.split("->")[-1].strip()
        path = path.strip('"')
        if not path.startswith(DEPLOY_ROOTS):
            continue
        if path.startswith(DEPLOY_SKIP_PREFIXES):
            continue
        if Path(path).name in DEPLOY_SKIP_BASENAMES:
            continue
        if not path.endswith(RUNTIME_SUFFIXES):
            continue
        hits.append(path)
    return hits


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
    """Extract + install, rotating the previous copy aside instead of deleting it.

    This USED to `rm -rf` the live directory before extracting, so a bad deploy
    left nothing to roll back to — which is why the 2026-07-14 outage lasted
    ~2.5 hours instead of ~30 seconds. Now the outgoing copy is renamed to
    ``<dir>.bak`` (previous .bak dropped first, so exactly one generation is
    kept and disk use stays bounded). Recovery is then a single `mv` back —
    see ROLLBACK_HINT, which step_verify prints on failure.
    """
    log("[4/5] Remote extract + install")
    parts: list[str] = [f"WP={shlex.quote(wp_content)}"]
    parts.append(f"tar -xf {TARBALL_NAME}")
    if blocks:
        # Rotate: drop the older backup, move the live copy aside, install new.
        parts.append("rm -rf $WP/plugins/sgs-blocks.bak")
        parts.append("if [ -d $WP/plugins/sgs-blocks ]; then "
                     "mv $WP/plugins/sgs-blocks $WP/plugins/sgs-blocks.bak; fi")
        parts.append("mkdir -p $WP/plugins")
        parts.append("mv plugins/sgs-blocks $WP/plugins/")
    if theme:
        parts.append("rm -rf $WP/themes/sgs-theme.bak")
        parts.append("if [ -d $WP/themes/sgs-theme ]; then "
                     "mv $WP/themes/sgs-theme $WP/themes/sgs-theme.bak; fi")
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


def step_oldshape_audit(dry_run: bool, use_alias: bool, target_key: str,
                        wp_content: str) -> int:
    """Pre-deploy content-compat gate (Track B, 2026-07-15 — the gate D182 used
    and D270/D271 skipped). Scans the TARGET site's stored post_content against
    the LOCAL block.json schemas (i.e. the code about to be deployed) for:
      * stranded content — old scalar shapes an InnerBlocks render no longer reads
        (the empty-Indus-homepage class), and
      * undeclared attrs — silently discarded at parse, DELETED on next editor save.

    Read-only on the site (`wp post get` — the guard-sanctioned route). Findings
    already dispositioned in the casualty register live in
    oldshape-audit-baseline.json; only NEW findings fail the deploy. ON by
    default; --skip-oldshape-audit opts out (then compatibility is YOUR problem).
    """
    if dry_run:
        log("[oldshape-audit] SKIPPED (--dry-run); would scan target post_content "
            "against the schemas being deployed")
        return 0
    wp_root = wp_content.rsplit("/wp-content", 1)[0]
    # Post types are ENUMERATED from the live site, never hardcoded — a client CPT
    # (sgs_header/sgs_footer/sgs_product_template) or a reusable block holds block
    # markup exactly like a page does, and a page,post-only scan was blind to all
    # of them (QC council 2026-07-15). Only WP-internal types that structurally
    # cannot carry block markup in post_content are excluded.
    #
    # TWO WP bootstraps total (enumerate types, then one bulk JSON fetch). The
    # obvious per-post `wp post get` loop costs one bootstrap PER POST and timed
    # out at 180s on the canary — a gate that aborts a healthy deploy on its own
    # slowness is worse than no gate. JSON also escapes content correctly, where a
    # text delimiter can be forged by post content containing the delimiter.
    skip_types = "|".join(NON_BLOCK_POST_TYPES)
    remote = (
        f"cd {shlex.quote(wp_root)} && "
        f"types=$(wp post-type list --field=name | grep -Ev '^({skip_types})$' | paste -sd,) && "
        "wp post list --post_type=\"$types\" --post_status=any --fields=ID,post_content "
        "--format=json"
    )
    log("[oldshape-audit] fetching stored post_content from target (read-only)")
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=180)
    except (subprocess.SubprocessError, OSError) as e:
        err(f"[oldshape-audit] SSH fetch failed: {e}")
        err("fix connectivity first; use --skip-oldshape-audit ONLY if stored-content "
            "compatibility has been verified another way")
        return 1
    if out.returncode != 0:
        err(f"[oldshape-audit] SSH fetch failed (exit {out.returncode}): "
            f"{(out.stderr or '').strip()[:300]}")
        err("fix connectivity first; use --skip-oldshape-audit ONLY if stored-content "
            "compatibility has been verified another way")
        return 1
    try:
        posts = json.loads(out.stdout[out.stdout.index("["):])
    except (ValueError, json.JSONDecodeError) as e:
        err(f"[oldshape-audit] could not read the post list from the target: {e}")
        err("this is fail-closed on purpose — an unreadable content list cannot be "
            "audited, and an unaudited deploy is how content gets stranded silently")
        return 1
    audit = Path(__file__).resolve().parent / "audit-post-content-blocks.py"
    baseline = Path(__file__).resolve().parent / "oldshape-audit-baseline.json"
    with tempfile.TemporaryDirectory() as td:
        # Subdir named after the target so finding keys match the register/baseline
        # convention ("palestine-lives/13|sgs/hero|…").
        site_dir = Path(td) / target_key
        site_dir.mkdir()
        for post in posts:
            with open(site_dir / f"{post['ID']}.txt", "w", encoding="utf-8", newline="") as fh:
                fh.write(post.get("post_content") or "")
        count = len(posts)
        log(f"[oldshape-audit] scanning {count} post(s) against local block.json schemas")
        cmd = [sys.executable, str(audit), str(site_dir), "--check"]
        if baseline.exists():
            cmd += ["--baseline", str(baseline)]
        rc = subprocess.call(cmd)
    if rc != 0:
        log("[oldshape-audit] FAIL: deploying these schemas would strand or delete "
            "stored content — migrate it first (scripts/wp-migrate-oldshape-blocks.js)")
    else:
        log("[oldshape-audit] PASS: stored content is compatible with the schemas "
            "being deployed")
    return rc


def step_scoped_selector_audit(page_id: str, dry_run: bool) -> int:
    """Post-deploy structural gate (P-SCOPED-SELECTOR-MATCH, D303): run the LIVE
    scoped-selector audit against the just-deployed canary page. Catches the
    "scoped rule whose class the element never carries" bug class (multi-button)
    on the painted DOM — the STOP-21-authoritative signal a static check can't
    give. Returns the audit exit code (non-zero = dead per-instance selectors)."""
    if dry_run:
        log(f"[scoped-audit] SKIPPED (--dry-run); would audit page {page_id}")
        return 0
    audit_js = Path(__file__).resolve().parent / "audit-scoped-selector-live.js"
    cmd = ["node", str(audit_js), "--page", str(page_id)]
    log(f"[scoped-audit] {' '.join(cmd)}")
    try:
        rc = subprocess.call(cmd)
    except Exception as e:  # noqa: BLE001
        log(f"[scoped-audit] WARNING: could not run audit ({e}) — skipping")
        return 0
    if rc != 0:
        log("[scoped-audit] FAIL: dead per-instance scoped selectors on the deployed page")
    else:
        log("[scoped-audit] PASS: every per-instance scope class lands on an element")
    return rc


def step_verify(url: str) -> int:
    """Post-deploy smoke test. Returns non-zero when the deploy has broken the site.

    Runs by default (opt out with --skip-verify). This USED to be opt-in and
    warn-only — it could not fail — so a deploy that took two live client sites
    down on 2026-07-14 still reported [DONE].

    Deliberately cause-agnostic: it does not care WHY the page is broken. That
    matters because the 2026-07-14 fatal was a missing `use` statement, which is
    a RUNTIME class-resolution failure — `php -l` passes it cleanly and only
    fetching the real page catches it.
    """
    import urllib.error
    import urllib.request

    # Cache-bust + ask for an uncached render. LiteSpeed is active on sandybrown,
    # so a full-page-cached 200 can mask a live fatal — checking a cached copy is
    # checking a photograph of the site, not the site (cf. the project's own
    # "test-with-actual-cache-layer" lesson).
    bust = f"sgs_deploy_check={int(time.time())}"
    probe_url = f"{url}{'&' if '?' in url else '?'}{bust}"

    log(f"[verify] GET {probe_url}")
    status: int | None = None
    body = ""
    try:
        req = urllib.request.Request(probe_url, headers={
            "User-Agent": "sgs-build-deploy/1.0",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            # No Accept-Encoding: keep the body uncompressed so the fatal-string
            # check below reads real text rather than gzip bytes.
            "Accept-Encoding": "identity",
        })
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                status = resp.status
                body = resp.read(16384).decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as e:
            # An HTTP 500 arrives as an exception but still carries the body.
            status = e.code
            body = e.read(16384).decode("utf-8", errors="ignore")
    except Exception as e:  # noqa: BLE001 — network/DNS/timeout
        err(f"[verify] request failed: {e}")
        return 1

    log(f"[verify] HTTP {status}, {len(body)} bytes sampled")

    if status is None or status >= 500:
        # ASCII only: err() writes to stderr, which (unlike stdout, line 53) is
        # not reconfigured to utf-8, so non-ASCII mangles on a Windows console.
        err(f"[verify] HTTP {status} - this deploy has broken {url}")
        err(f"[verify] {ROLLBACK_HINT}")
        return 1
    if "There has been a critical error" in body:
        err("[verify] WordPress fatal on the deployed page "
            "('There has been a critical error on this website')")
        err(f"[verify] {ROLLBACK_HINT}")
        return 1
    if status >= 400:
        err(f"[verify] HTTP {status} on {url}")
        return 1

    markers = ["wp-block-sgs", "sgs-", "wp-content"]
    found = [m for m in markers if m in body]
    if not found:
        log(f"[verify] WARNING: none of {markers} found in response (cache?)")
    else:
        log(f"[verify] markers present: {found}")
    return 0


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
    p.add_argument("--skip-verify", action="store_true",
                   help="Skip the post-deploy smoke test (NOT recommended — it is the "
                        "only check that catches a deploy which breaks the live site).")
    p.add_argument("--verify-url", default=None,
                   help="Optional URL to GET after deploy for a smoke check.")
    p.add_argument("--audit-scoped-page", default=None,
                   help="Post-deploy: page_id to run the live scoped-selector "
                        "match audit against (P-SCOPED-SELECTOR-MATCH gate). "
                        "e.g. 8 (the sandybrown homepage clone).")
    p.add_argument("--skip-oldshape-audit", action="store_true",
                   help="Skip the pre-deploy stored-content compatibility gate "
                        "(NOT recommended — it is the only check that catches a "
                        "deploy whose schemas strand or delete stored content).")
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

    # Git cleanliness guard — scoped to files that ship AND execute on the site.
    if not args.allow_dirty and not args.dry_run:
        dirty = deployed_dirty_files()
        if dirty:
            err("uncommitted changes in files this deploy would push live:")
            for path in dirty:
                err(f"    {path}")
            err("commit them, or re-run with --allow-dirty if this is deliberate")
            print("[ABORTED] reason: deployed-files-dirty", flush=True)
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

    # Pre-deploy content-compat gate: the target's stored post_content vs the
    # schemas in THIS tree. Runs before the build — no point compiling code that
    # would strand stored content (the empty-Indus-homepage class, Track B).
    if args.skip_oldshape_audit:
        log("[oldshape-audit] SKIPPED (--skip-oldshape-audit)")
    else:
        rc = step_oldshape_audit(args.dry_run, use_alias, target_key,
                                 target["wp_content"])
        if rc != 0:
            print("[ABORTED] reason: oldshape-audit-failed (stored content would "
                  "silently lose render or attrs under the schemas being deployed)",
                  flush=True)
            return 1

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

    # Post-deploy smoke test — ON by default, aborts on a broken site.
    verify_url = args.verify_url or f"https://{target['host']}/"
    if args.skip_verify:
        log("[verify] SKIPPED (--skip-verify)")
    elif args.dry_run:
        log(f"[verify] SKIPPED (--dry-run); would GET {verify_url}")
    else:
        rc = step_verify(verify_url)
        if rc != 0:
            # Deliberately NOT "[ABORTED]": the deploy already happened and the
            # files are live. "ABORTED" reads as "nothing shipped" and invites a
            # retry loop, which would just re-deploy the same broken build.
            print("[DEPLOYED-BUT-BROKEN] the files ARE live and the site is "
                  f"returning an error: {verify_url}", flush=True)
            print("[DEPLOYED-BUT-BROKEN] do NOT re-run this deploy - roll back "
                  "or fix forward. If the site was ALREADY broken before this "
                  "run, this check cannot tell the difference; confirm first.",
                  flush=True)
            return 1

    # Post-deploy structural gate: live scoped-selector match audit.
    if args.audit_scoped_page:
        rc = step_scoped_selector_audit(args.audit_scoped_page, args.dry_run)
        if rc != 0:
            print("[ABORTED] reason: scoped-selector-audit-failed "
                  "(dead per-instance selectors on the deployed page)", flush=True)
            return 1

    elapsed = int(time.time() - t0)
    print(f"[DONE] sgs-deploy completed in {elapsed}s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
