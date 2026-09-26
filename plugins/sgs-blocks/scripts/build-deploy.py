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

    # Dry run — print commands but do not execute
    python plugins/sgs-blocks/scripts/build-deploy.py --dry-run

    # Verify a specific page instead of the target's homepage
    python plugins/sgs-blocks/scripts/build-deploy.py --verify-url https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/

Guards (per spec):
    - Refuses to deploy when a file that SHIPS AND EXECUTES is uncommitted, unless
      --allow-dirty (see deployed_dirty_files() — scoped on purpose; a repo-wide
      dirty check is always true on a shared worktree, so it would be bypassed
      every run and protect nothing)
    - Post-deploy smoke test runs BY DEFAULT and ABORTS on a 5xx or a WordPress
      fatal (opt out with --skip-verify). Verify defaults on and fails closed
      because a deploy of an unfinished edit that reports [DONE] is how a PHP
      fatal reaches live sites unnoticed.
    - The default target is sandybrown; the other TARGETS entries
      (indus-test, eye-care-test) are flagged explicit_opt_in_required and must
      be named with --target before they will deploy
    - Refuses to deploy if plugins/sgs-blocks/build/ is missing after build step
    - Never hand-roll tar/scp: the remote step swaps directories with a .bak
      rotation so a failed extract leaves something to roll back to.

R-22-9 universal: hostnames and remote WP paths live in TARGETS dict — add a new
client by adding a single dict entry; no code changes needed elsewhere.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def urlopen_tls(req, tag, timeout=20):
    """Open `req` through the shared trust-store fallback (scripts/tls_urlopen.py), logging via log()."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from tls_urlopen import urlopen_tls as _shared

    return _shared(req, tag, timeout=timeout, log=log)


sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Targets — extend here to add a new client deploy destination.
# ---------------------------------------------------------------------------
# Only live hosts belong here. This script's remote step does
# `rm -rf $WP/plugins/sgs-blocks.bak` and moves directories around inside
# `wp_content`, so a target pointing at a host that is gone (or, worse, at a
# hostname someone else later owns) is a live hazard.
# Adding a target is one dict entry, per R-22-9 above.
#
# "client" names the `sites/<client>/` whose theme-snapshot.json IS that site's
# theme.json (None = the framework theme.json). A theme deploy ships the snapshot as
# the theme's theme.json, so a deploy can never revert a client site to the framework
# default — see resolve_theme_json_payload(). Keyed on this data, never on a site name.
TARGETS = {
    "sandybrown": {
        "host": "sandybrown-nightingale-600381.hostingersite.com",
        "wp_content": "domains/sandybrown-nightingale-600381.hostingersite.com/public_html/wp-content",
        "explicit_opt_in_required": False,
        "client": "mamas-munches",
    },
    # Dedicated Indus Foods test site — separate from sandybrown because
    # sandybrown has a single global active-header/footer/theme-snapshot pointer,
    # so Indus content there would un-render Mama's Munches sitewide.
    "indus-test": {
        "host": "lavender-dinosaur-183533.hostingersite.com",
        "wp_content": "domains/lavender-dinosaur-183533.hostingersite.com/public_html/wp-content",
        "explicit_opt_in_required": True,
        "client": "indus-foods",
    },
    # Dedicated Eye Care Birmingham test site — sgs-theme + sgs-blocks +
    # WooCommerce, so deploy-and-verify clone runs of the Eye Care draft are checked on a
    # real rendered page without touching sandybrown's global active-header/footer/
    # theme-snapshot pointers. Credentials: .claude/secrets/eye-care-test.env (gitignored).
    "eye-care-test": {
        "host": "darkcyan-grouse-898606.hostingersite.com",
        "wp_content": "domains/darkcyan-grouse-898606.hostingersite.com/public_html/wp-content",
        "explicit_opt_in_required": True,
        "client": "eye-care-ward-end",
    },
}

# SSH endpoint is shared across targets (single Hostinger account).
SSH_ALIAS = "hd"
SSH_FALLBACK = ["-i", str(Path.home() / ".ssh" / "id_ed25519"), "-p", "65002"]
SSH_USER_HOST = "u945238940@141.136.39.73"

REPO_ROOT = Path(__file__).resolve().parents[3]
PLUGIN_DIR = REPO_ROOT / "plugins" / "sgs-blocks"
BUILD_DIR = PLUGIN_DIR / "build"
# `composer.phar` is GITIGNORED (only a developer's primary clone has a copy that
# was hand-downloaded once). REPO_ROOT here is *this checkout's* root — in a git
# worktree (e.g. `.claude/worktrees/wave-deploy`) or a fresh clone/CI checkout that
# is a directory that never had the phar dropped into it, so
# `REPO_ROOT / "composer.phar"` alone points at a file that does not exist there.
# composer_dump_autoload() is SUPPOSED to fail closed rather than skip the
# dev-package purge (see its docstring) — but "fails closed" should mean
# "refuses to deploy with a useful message", not "cannot run at all from a
# worktree". `resolve_composer()` below tries every real location, in order,
# and only fails once none of them work.
COMPOSER_PHAR = REPO_ROOT / "composer.phar"
# Every deploy uploads to the same shared SSH home, so each run names its own
# upload, theme.json payload and unpacking folder: two sessions deploying at
# once (to any target) no longer overwrite or delete each other's files.
RUN_ID = f"{os.getpid()}-{int(time.time())}"
TARBALL_NAME = f"sgs-deploy-{RUN_ID}.tar"
REMOTE_STAGING_DIR = f"sgs-deploy-{RUN_ID}"
# Ceiling for the packaged tarball. MEASURED, not guessed. With scripts/, the
# dev-only vendor packages (per composer's own `dev-package-names` list -- see
# TAR_EXCLUDES) and the test/pipeline residue excluded, a blocks-only tarball is
# ~28.6MB and theme/sgs-theme/ adds ~2.1MB on a full deploy. 45MB sits above the
# ~31MB combined baseline (~1.4x margin) and still catches the case this guard
# exists for -- a stray untracked tree landing inside the plugin/theme dir.
# ⚠ Raise this ONLY after measuring, and say what grew.
TARBALL_MAX_MB = 45

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
    # Third-party reference checkouts + scratch output that sit INSIDE the plugin
    # dir without being part of it. They are UNTRACKED, and an untracked file is
    # invisible to deployed_dirty_files() -- which reads tracked files from
    # `git status` -- while being perfectly visible to tar, so without these
    # excludes a competitor's GPL source would land web-accessible inside the
    # live plugin directory. The "plugins/sgs-blocks/src" pattern is
    # PATH-ANCHORED and so does NOT match "plugins/sgs-blocks/stackable/src".
    "plugins/sgs-blocks/stackable",
    "plugins/sgs-blocks/now.tmp.json",
    # --- dev-tooling / build-residue exclusions ----------------------------
    # None of these paths is reached at runtime: includes/, src/ and
    # sgs-blocks.php contain no require/include/plugin_dir_path reach into them
    # (only human-facing comments/error-message strings MENTION
    # "scripts/generate-*.py" as instructions for a developer to re-run by
    # hand; none of them execute it). The `wp sgs` CLI command
    # tree (`WP_CLI::add_command`) is registered from includes/class-sgs-cli-
    # commands.php and includes/class-sgs-header-footer-cli-commands.php --
    # i.e. INSIDE includes/, never scripts/ -- so excluding scripts/ does not
    # remove any WP-CLI command the site exposes.
    "plugins/sgs-blocks/scripts",
    # Pipeline run artefacts, Python/PHP test residue -- none read by
    # render.php/includes/src at runtime. tests/ is also exempt from the
    # DIRTY-file gate below because it never executes on the site.
    "plugins/sgs-blocks/pipeline-state",
    "plugins/sgs-blocks/tests",
    "plugins/sgs-blocks/.pytest_cache",
    "plugins/sgs-blocks/.ruff_cache",
    "plugins/sgs-blocks/.phpunit.cache",
    # --- vendor/: dev-only Composer packages -------------------------------
    # `vendor/autoload.php` IS required unconditionally at plugin bootstrap
    # (sgs-blocks.php) -- vendor/ as a whole is NOT excluded,
    # that would break the live site. But `composer.json`'s `require-dev` (PHPStan
    # + PHPUnit + the WordPress stub/test toolchain) pulls ~40MB of packages that
    # exist only to support local static analysis and tests, never loaded by any
    # PHP that runs on a request. Composer itself computed
    # the full transitive dependency graph and recorded it in
    # `vendor/composer/installed.json`'s `dev-package-names` array -- these 11
    # vendor NAMESPACES (not individual packages -- verified every package under
    # each namespace is dev-only, so excluding the whole namespace dir is safe)
    # are the packages composer itself marked dev-only, matched 1:1 against that
    # list. `symfony/*`, `psr/*`, `carbonphp/*` are runtime deps of nesbot/carbon
    # and are NOT in the dev list, so they stay.
    "plugins/sgs-blocks/vendor/bin",
    "plugins/sgs-blocks/vendor/myclabs",
    "plugins/sgs-blocks/vendor/nikic",
    "plugins/sgs-blocks/vendor/phar-io",
    "plugins/sgs-blocks/vendor/php-stubs",
    "plugins/sgs-blocks/vendor/phpstan",
    "plugins/sgs-blocks/vendor/phpunit",
    "plugins/sgs-blocks/vendor/sebastian",
    "plugins/sgs-blocks/vendor/staabm",
    "plugins/sgs-blocks/vendor/szepeviktor",
    "plugins/sgs-blocks/vendor/theseer",
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
    "plugins/sgs-blocks/scripts/",    # excluded from the tar — dev tooling, never executes in WP
    "plugins/sgs-blocks/tests/",      # excluded from the tar — tests, never execute in WP
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


def deploy_roots_for_scope(theme_only: bool, blocks_only: bool) -> tuple[str, ...]:
    """The deploy roots THIS INVOCATION will actually ship.

    ``DEPLOY_ROOTS`` names everything the script CAN deploy; a given run may
    deploy less. ``--blocks-only`` never writes a theme file, so a dirty theme
    template is not "about to execute on a live site" for that run — and that is
    precisely the contract ``deployed_dirty_files()`` promises when it fires.

    WHY THIS IS A NARROWING, NOT A WEAKENING. A guard that fires on files a run
    cannot touch (another track's uncommitted theme templates, on a
    ``--blocks-only`` deploy) trains the operator to reach for
    ``--allow-dirty``, and that reflex removes the guard's protection for the
    files that do ship.

    Returns a strictly SMALLER set than ``DEPLOY_ROOTS``, never a larger one, and
    returns ``DEPLOY_ROOTS`` unchanged for a full deploy. ``self_test()`` cases 5-7 prove
    both directions, including that an in-scope dirty file STILL blocks.
    """
    if blocks_only:
        return ("plugins/sgs-blocks/",)
    if theme_only:
        return ("theme/sgs-theme/",)
    return DEPLOY_ROOTS

ROLLBACK_HINT = (
    "roll back: ssh in and swap the .bak copy back, then reset OPcache:\n"
    "    mv $WP/plugins/sgs-blocks $WP/plugins/sgs-blocks.broken && \\\n"
    "    mv $WP/plugins/sgs-blocks.bak $WP/plugins/sgs-blocks\n"
    "  (themes/sgs-theme's backup is DOT-PREFIXED so WordPress's theme scanner\n"
    "  skips it: mv $WP/themes/sgs-theme $WP/themes/sgs-theme.broken && \\\n"
    "  mv $WP/themes/.sgs-theme.bak $WP/themes/sgs-theme; then curl an\n"
    "  opcache_reset() page)"
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


def resolve_composer() -> tuple[list[str], str] | None:
    """Resolve a runnable Composer invocation, trying every real location in turn.

    Resolved LAZILY (called at the point of use, not at import time) so a
    failure surfaces with a useful message right when it matters, rather than
    crashing the whole script at module load with a bare traceback.

    Returns ``(base_cmd, description)`` for the FIRST candidate that resolves,
    where ``base_cmd`` is the argv prefix to which ``dump-autoload --optimize
    [--no-dev]`` gets appended — or ``None`` if nothing resolved, in which case
    the caller must fail closed and name every location tried (see
    ``composer_dump_autoload()`` below).

    Candidates, in order:
      1. ``composer.phar`` at THIS checkout's repo root — the normal
         primary-clone case.
      2. ``composer.phar`` at the MAIN worktree's root, derived via
         ``git rev-parse --git-common-dir``. A git worktree's own directory
         never holds the gitignored phar, but ``--git-common-dir`` always
         points at the shared ``.git`` inside the primary clone, whose parent
         is the primary clone's root. This is the case that applies when
         deploying from a worktree (see COMPOSER_PHAR's comment above).
      3. ``composer`` on PATH as a plain executable, via ``resolve_exe()``.
    """
    php = resolve_exe("php")

    # Candidate 1 — this checkout's own repo root (unchanged default path).
    if COMPOSER_PHAR.is_file():
        return ([php, str(COMPOSER_PHAR)], f"composer.phar at {COMPOSER_PHAR}")

    # Candidate 2 — the main worktree's root, via git's own bookkeeping. A
    # worktree's `.git` is a FILE pointing at the real gitdir inside the
    # primary clone, and `--git-common-dir` resolves that indirection for us
    # rather than us hand-parsing the `.git` file.
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--git-common-dir"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            common_dir = Path(result.stdout.strip())
            if not common_dir.is_absolute():
                common_dir = (REPO_ROOT / common_dir).resolve()
            main_worktree_root = common_dir.parent
            candidate = main_worktree_root / "composer.phar"
            if candidate.is_file():
                return ([php, str(candidate)], f"composer.phar at the main worktree root ({candidate})")
    except OSError:
        # git itself not runnable — fall through to the next candidate rather
        # than treat that as fatal here; the final all-miss message covers it.
        pass

    # Candidate 3 — `composer` on PATH as a plain executable. Note the command
    # shape differs from the phar branches above: no `php` prefix, and the
    # subcommand is `dump-autoload` directly rather than `php composer.phar
    # dump-autoload`.
    composer_exe = shutil.which("composer")
    if composer_exe:
        return ([composer_exe], f"composer on PATH ({composer_exe})")

    return None


def composer_dump_autoload(dry_run: bool, *, no_dev: bool) -> int:
    """Regenerate plugins/sgs-blocks's Composer autoloader, dev-included or not.

    Two DIFFERENT autoloaders are needed by two DIFFERENT consumers, and
    conflating them is the exact bug this function exists to stop happening a
    third time:

    - The DEPLOYED tarball must ship an autoloader with ZERO references to
      dev-only packages (PHPStan/PHPUnit/etc — see TAR_EXCLUDES's `vendor/`
      block). Those packages' directories are excluded from the tarball, but
      a dev-included `vendor/composer/autoload_files.php` still `require`s
      files inside them unconditionally — proven live: it fatal'd the site
      with a 500 on every page load until root-caused.
    - The LOCAL working tree needs a dev-included autoloader so
      `check-render-undefined-vars.py`/PHPStan (which needs
      `szepeviktor/phpstan-wordpress`'s rule classes in the classmap) keeps
      working for `npm run build`'s local gates. A prior session "fixed" the
      first bug by regenerating dev-included ON DISK — which silently undid
      the safe autoloader and reopened the fatal.

    `--no-dev` is for packaging ONLY, always followed by a dev-included
    regenerate to restore the working tree (see step_tar()'s finally block).
    Never call this with `no_dev=True` and leave it there.

    WHEN and WHETHER this runs, and the `no_dev` semantics, are unchanged by
    the resolution logic below — only HOW composer is located and invoked
    changed (see `resolve_composer()`).
    """
    resolved = resolve_composer()
    if resolved is None:
        err(
            "Could not locate a runnable Composer — tried all of:\n"
            f"    1. {COMPOSER_PHAR} (this checkout's repo root)\n"
            "    2. composer.phar at the main worktree's root (via `git "
            "rev-parse --git-common-dir`)\n"
            "    3. `composer` on PATH\n"
            "  Fix: drop composer.phar at the repo root, or install Composer "
            "on PATH."
        )
        return 1

    base_cmd, description = resolved
    cmd = [*base_cmd, "dump-autoload", "--optimize"]
    if no_dev:
        cmd.insert(len(base_cmd) + 1, "--no-dev")
    label = "--no-dev (safe for deploy)" if no_dev else "dev-included (safe for local gates)"
    log(f"  [composer] regenerating autoloader — {label} — using {description}")
    return run(cmd, dry_run=dry_run, cwd=PLUGIN_DIR)


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


def deployed_dirty_files(
    repo_root: Path = REPO_ROOT,
    roots: tuple[str, ...] = DEPLOY_ROOTS,
) -> list[str]:
    """Tracked, uncommitted files that BOTH ship in the tarball AND run at runtime.

    Deliberately narrower than a repo-wide ``git status``. A repo-wide check is
    always true here (``.claude/`` reports, ``package-lock.json``, ``reports/*.txt``
    churn constantly), so it would be bypassed with ``--allow-dirty`` on every
    run and therefore protect nothing — and an unfinished edit would reach live
    client sites. Scoped this way the guard stays quiet during normal work, so
    when it fires it means a file that is about to execute on a live site
    differs from HEAD.

    ``repo_root`` is overridable (default: the real repo) so this can be exercised
    against an isolated temp repo in ``self_test()`` without touching real git state.

    ``roots`` is the set of deploy roots THIS RUN will ship — see
    ``deploy_roots_for_scope()``. It defaults to every root.
    """
    result = subprocess.run(
        ["git", "status", "--porcelain", "--untracked-files=no"],
        cwd=repo_root, check=False, capture_output=True, text=True,
    )
    hits: list[str] = []
    for line in result.stdout.splitlines():
        path = line[3:].strip()
        if "->" in path:  # rename entries read "old -> new"
            path = path.split("->")[-1].strip()
        path = path.strip('"')
        if not path.startswith(roots):
            continue
        if path.startswith(DEPLOY_SKIP_PREFIXES):
            continue
        if Path(path).name in DEPLOY_SKIP_BASENAMES:
            continue
        if not path.endswith(RUNTIME_SUFFIXES):
            continue
        hits.append(path)
    return hits


def split_dirty_by_payload(dirty: list[str], payload_prefixes: list[str]) -> tuple[list[str], list[str]]:
    """Split deploy-relevant dirty files into (covered, uncovered) by declared payload.

    Breaks the deploy<->commit deadlock: ``build-deploy.py`` refuses to run dirty,
    while the pre-commit visual-diff gate refuses a commit without a report that
    requires a live deploy to produce. Neither could go first, so the deploy gate
    distinguishes "dirty with the payload being deployed" from "dirty with
    unrelated unfinished work" rather than the visual-diff gate's ordering being
    relaxed. The tree is SHARED across concurrent tracks, so at any moment there
    is very likely dirty work that has NOTHING to do with the wave being deployed.
    A caller who names their own payload
    (``--payload plugins/sgs-blocks/src/blocks/quote/``) is asserting "this, and only
    this, is what I intend to ship uncommitted"; anything else dirty in deploy scope
    is presumptively someone else's unfinished work and must still block. The
    visual-diff gate is the one that enforces "no unverified visual change
    ships", so its produce-report-before-commit ordering is left alone.

    A file is "covered" only when it falls under one of the declared prefixes. An
    EMPTY prefix list covers nothing, so calling this with ``payload_prefixes=[]``
    gives the all-or-nothing behaviour: every dirty file blocks.
    """
    norm_prefixes = [p.replace("\\", "/").rstrip("/") + "/" for p in payload_prefixes if p]
    covered: list[str] = []
    uncovered: list[str] = []
    for f in dirty:
        f_norm = f.replace("\\", "/")
        if any(f_norm == p.rstrip("/") or f_norm.startswith(p) for p in norm_prefixes):
            covered.append(f)
        else:
            uncovered.append(f)
    return covered, uncovered


# ---------------------------------------------------------------------------
# Client theme.json — a theme deploy ships the target's client snapshot.
# ---------------------------------------------------------------------------
# PROVEN CAUSE (2026-09-23). push-theme-snapshot.py writes a client's snapshot over
# `wp-content/themes/sgs-theme/theme.json` — a file INSIDE the theme directory. A theme
# deploy swaps that whole directory for the repo's `theme/sgs-theme/`, whose theme.json is
# the FRAMEWORK default. So every theme deploy silently reverted the client to the framework
# fonts and palette. Eye Care's push backups record it three times (Playfair/Outfit pushed,
# Inter back on the next backup), and all three targets were serving a framework theme.json.
#
# DESIGN: the theme upload CARRIES the client's theme.json, so no deploy can ship the
# default to a client site in the first place. That is chosen over "re-apply the snapshot
# after the upload", which leaves a window where the default is live and depends on a second
# step that can be skipped or fail after the damage is done. The snapshot bytes come from
# push-theme-snapshot.py::deploy_theme_json_bytes — one function, so a deploy re-ships exactly
# what a push wrote. The user layer (wp_global_styles) lives in the database and a theme
# deploy never touches it, so nothing needs re-applying there.
THEME_JSON_PAYLOAD_NAME = f"sgs-theme-json-{RUN_ID}.payload"
SNAPSHOT_REL = "sites/{client}/theme-snapshot.json"
FRAMEWORK_THEME_JSON_REL = "theme/sgs-theme/theme.json"


def _load_push_module():
    """Import push-theme-snapshot.py (hyphenated filename) from this scripts directory."""
    import importlib.util
    path = Path(__file__).resolve().parent / "push-theme-snapshot.py"
    spec = importlib.util.spec_from_file_location("sgs_push_theme_snapshot", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def resolve_theme_json_payload(target: dict, root: Path = REPO_ROOT) -> tuple[bytes | None, str]:
    """Return (the theme.json bytes this target must end up with, a label or error message).

    ``target["client"]`` None -> the framework ``theme/sgs-theme/theme.json``. A named client ->
    that client's ``theme-snapshot.json``, prepared exactly as push-theme-snapshot.py prepares
    it. FAILS CLOSED: a named client whose snapshot is missing, unparseable or not a theme.json
    returns (None, reason), and the deploy aborts before anything is uploaded — it never falls
    back to the framework file, because that fallback IS the bug.
    """
    client = target.get("client")
    if not client:
        path = root / FRAMEWORK_THEME_JSON_REL
        try:
            return path.read_bytes(), f"framework default ({FRAMEWORK_THEME_JSON_REL})"
        except OSError as exc:
            return None, f"framework theme.json unreadable: {exc}"
    path = root / SNAPSHOT_REL.format(client=client)
    if not path.is_file():
        return None, (f"target names client '{client}' but {path.relative_to(root).as_posix()} "
                      "does not exist")
    try:
        data, note = _load_push_module().deploy_theme_json_bytes(path)
        parsed = json.loads(data.decode("utf-8"))
    except (OSError, ValueError) as exc:
        return None, f"client '{client}' snapshot could not be prepared: {exc}"
    if not (isinstance(parsed, dict) and parsed.get("version") and isinstance(parsed.get("settings"), dict)):
        return None, f"client '{client}' snapshot is not a theme.json (no version/settings)"
    label = f"client snapshot {SNAPSHOT_REL.format(client=client)}"
    return data, label + (f" ({note})" if note else "")


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


def theme_json_guard_decision(live_md5: str | None, payload_md5: str,
                              checkout_snapshot_md5: str | None) -> str:
    """PRE-UPLOAD: may this deploy replace the live theme.json with the payload? Pure.

      ``unchanged``          live already equals the payload
      ``replace``            live differs (e.g. the framework default a past deploy left, or no
                             file yet) — the payload restores the client's committed snapshot
      ``abort-uncommitted``  live equals the SHARED CHECKOUT's working copy of the client
                             snapshot, which differs from the committed one being shipped: an
                             uncommitted snapshot was pushed, and this deploy would silently
                             discard it. Commit the snapshot, or pass --takeover to replace it.
    """
    if live_md5 == payload_md5:
        return "unchanged"
    if checkout_snapshot_md5 and checkout_snapshot_md5 != payload_md5 and live_md5 == checkout_snapshot_md5:
        return "abort-uncommitted"
    return "replace"


def _remote_md5(use_alias: bool, path: str) -> tuple[str | None, str]:
    """(md5 or None, status) of a remote file. status: found | absent | error."""
    remote_cmd = (f"if [ -f {shlex.quote(path)} ]; then md5sum {shlex.quote(path)}; "
                  "else echo __ABSENT__; fi")
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote_cmd], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=60)
    except (subprocess.SubprocessError, OSError) as exc:
        err(f"[theme-json] SSH failed: {exc}")
        return None, "error"
    text = (out.stdout or "").strip()
    if out.returncode != 0:
        err(f"[theme-json] SSH exit {out.returncode}: {(out.stderr or '').strip()[:200]}")
        return None, "error"
    if text == "__ABSENT__":
        return None, "absent"
    md5 = text.split()[0] if text else ""
    return (md5, "found") if len(md5) == 32 else (None, "error")


def step_theme_json_guard(use_alias: bool, target: dict, payload: bytes, label: str,
                          takeover: bool) -> int:
    """Pre-upload: log what the deploy will do to the live theme.json; abort on the one case
    where replacing it would silently discard a snapshot someone deliberately pushed."""
    import hashlib
    payload_md5 = hashlib.md5(payload).hexdigest()
    live_path = f"{target['wp_content']}/themes/sgs-theme/theme.json"
    live_md5, status = _remote_md5(use_alias, live_path)
    if status == "error":
        err("[theme-json] could not read the live theme.json, so this deploy cannot tell what "
            "it would replace. Nothing was uploaded.")
        return 1
    checkout_md5 = None
    client = target.get("client")
    if client:
        # A worktree-isolated run is re-exec'd from a checkout of HEAD; the operator's working
        # copy (where an uncommitted push came from) is the shared checkout run_isolated names.
        shared_root = Path(os.environ.get("SGS_DEPLOY_SHARED_ROOT") or REPO_ROOT)
        snap = shared_root / SNAPSHOT_REL.format(client=client)
        if snap.is_file():
            try:
                wc_bytes, _ = _load_push_module().deploy_theme_json_bytes(snap)
                checkout_md5 = hashlib.md5(wc_bytes).hexdigest()
            except (OSError, ValueError):
                checkout_md5 = None
    decision = theme_json_guard_decision(live_md5, payload_md5, checkout_md5)
    log(f"[theme-json] payload: {label} md5={payload_md5[:8]}; live md5="
        f"{(live_md5 or status)[:8]} -> {decision}")
    if decision == "abort-uncommitted" and not takeover:
        err(f"[theme-json] the LIVE theme.json is the UNCOMMITTED working copy of "
            f"{SNAPSHOT_REL.format(client=client)} (pushed by push-theme-snapshot.py), and this "
            "deploy ships the COMMITTED version. Deploying would silently discard the pushed "
            "snapshot. Commit the snapshot and re-run, or pass --takeover to replace it on "
            "purpose. Nothing was uploaded.")
        return 1
    if decision == "abort-uncommitted":
        log("[theme-json] --takeover: replacing the pushed uncommitted snapshot on purpose")
    return 0


def theme_json_verify_result(expected_md5: str, live_md5: str | None) -> bool:
    """Post-deploy: the live theme.json must be byte-identical to the payload. Pure."""
    return live_md5 is not None and live_md5 == expected_md5


def step_verify_theme_json(use_alias: bool, wp_content: str, payload: bytes, label: str) -> int:
    """POST-DEPLOY, fail closed: is the live theme.json the one this target must have?

    Not governed by --skip-verify: it is the only check that the client's theme settings
    survived the deploy, and a deploy that silently reverts them is the bug it guards."""
    import hashlib
    expected = hashlib.md5(payload).hexdigest()
    live_md5, status = _remote_md5(use_alias, f"{wp_content}/themes/sgs-theme/theme.json")
    if theme_json_verify_result(expected, live_md5):
        log(f"[theme-json] PASS: live theme.json is the {label} (md5 {expected[:8]})")
        return 0
    err(f"[theme-json] FAIL: live theme.json md5={(live_md5 or status)[:8]}, expected the "
        f"{label} md5={expected[:8]}. The client's theme settings are NOT what this deploy "
        "shipped. Re-apply with push-theme-snapshot.py, then re-check.")
    return 1


def self_test_theme_json() -> list[str]:
    """Self-test cases 8-15: the client theme.json survives a theme deploy (no network).

    Runs the REAL tar command and the REAL remote extract command against a temp "repo" and a
    temp "server" directory, so it proves the packaged bytes, not a model of them.
    """
    import hashlib
    failures: list[str] = []
    bash = shutil.which("bash")
    if not bash:
        return ["theme.json self-test needs bash on PATH (Git Bash on Windows)"]
    FRAMEWORK = b'{"version": 3, "settings": {"typography": {"fontFamilies": [{"slug": "heading", "fontFamily": "Inter"}]}}}\n'
    SNAPSHOT = b'{"version": 3, "settings": {"typography": {"fontFamilies": [{"slug": "heading", "fontFamily": "\\"Playfair Display\\", serif"}]}}}\n'

    def md5(b: bytes | None) -> str | None:
        return hashlib.md5(b).hexdigest() if b is not None else None

    with tempfile.TemporaryDirectory(prefix="sgs-deploy-themejson-") as td:
        base = Path(td)
        repo = base / "repo"
        (repo / "theme" / "sgs-theme").mkdir(parents=True)
        (repo / FRAMEWORK_THEME_JSON_REL).write_bytes(FRAMEWORK)
        (repo / "theme" / "sgs-theme" / "style.css").write_text("/* Theme Name: SGS */\n", encoding="utf-8")
        (repo / "sites" / "acme").mkdir(parents=True)
        (repo / SNAPSHOT_REL.format(client="acme")).write_bytes(SNAPSHOT)

        def simulate(target: dict, use_payload: bool = True, drop_payload: bool = False) -> tuple[int, bytes | None]:
            """Package + extract exactly as a real theme deploy does; return (rc, live theme.json)."""
            server = base / f"server-{os.urandom(4).hex()}"
            live = server / "wp-content" / "themes" / "sgs-theme"
            live.mkdir(parents=True)
            live.joinpath("theme.json").write_bytes(SNAPSHOT if target.get("client") else FRAMEWORK)
            payload, _label = resolve_theme_json_payload(target, root=repo)
            if payload is None:
                return 99, live.joinpath("theme.json").read_bytes()
            stage = repo / THEME_JSON_PAYLOAD_NAME
            if use_payload:
                stage.write_bytes(payload)
            tar = subprocess.run(build_tar_cmd(True, False, use_payload and not drop_payload),
                                 cwd=repo, capture_output=True, text=True)
            stage.unlink(missing_ok=True)
            if tar.returncode != 0:
                return 98, None
            shutil.move(str(repo / TARBALL_NAME), str(server / TARBALL_NAME))
            cmd = build_remote_extract_cmd("wp-content", True, False, use_payload)
            rc = subprocess.run([bash, "-c", cmd], cwd=server, capture_output=True, text=True).returncode
            f = live.joinpath("theme.json")
            return rc, (f.read_bytes() if f.exists() else None)

        client_target = {"client": "acme"}
        plain_target = {"client": None}

        # 8. NEGATIVE CONTROL — the pre-fix deploy (no payload) DOES lose the snapshot. Without
        #    this, case 9 could pass on a simulation that never overwrote anything.
        rc, live = simulate(client_target, use_payload=False)
        if rc != 0 or live != FRAMEWORK:
            failures.append(f"NEGATIVE CONTROL: the pre-fix deploy did not reproduce the loss "
                            f"(rc={rc}, live={live!r}) - the simulation cannot detect the bug")
        # 9. A theme deploy on a target WITH a client ends with the client snapshot live.
        rc, live = simulate(client_target)
        if rc != 0 or live != SNAPSHOT:
            failures.append(f"client target: live theme.json is not the snapshot after deploy "
                            f"(rc={rc}, live={live!r})")
        # 10. A target with NO client keeps the framework default.
        rc, live = simulate(plain_target)
        if rc != 0 or live != FRAMEWORK:
            failures.append(f"no-client target: live theme.json is not the framework default "
                            f"(rc={rc}, live={live!r})")
        # 11. A payload missing from the tarball FAILS the extract, and the live theme (the
        #     client's snapshot) is left untouched — never swapped for the default.
        rc, live = simulate(client_target, drop_payload=True)
        if rc == 0:
            failures.append("missing payload: the remote extract exited 0 - a failed re-apply passed green")
        if live != SNAPSHOT:
            failures.append(f"missing payload: the live theme was swapped anyway (live={live!r})")
        # 12. A named client with no snapshot file fails closed (no framework fallback).
        payload, why = resolve_theme_json_payload({"client": "ghost"}, root=repo)
        if payload is not None:
            failures.append("missing snapshot: resolve fell back to a payload instead of failing closed")
        # 13. An unparseable snapshot fails closed.
        (repo / "sites" / "broken").mkdir()
        (repo / SNAPSHOT_REL.format(client="broken")).write_bytes(b"{not json")
        payload, why = resolve_theme_json_payload({"client": "broken"}, root=repo)
        if payload is not None:
            failures.append("broken snapshot: resolve returned a payload instead of failing closed")
        # 14. Guard decisions, including the one abort case.
        fw, sn, wc = md5(FRAMEWORK), md5(SNAPSHOT), md5(b"working-copy")
        cases = [
            ((sn, sn, sn), "unchanged"),
            ((fw, sn, sn), "replace"),            # live is the default a past deploy left
            ((None, sn, None), "replace"),        # no theme.json yet
            ((wc, sn, wc), "abort-uncommitted"),  # an uncommitted pushed snapshot is live
            ((fw, sn, wc), "replace"),            # WIP snapshot never pushed: not a reason to block
        ]
        for args_, want in cases:
            got = theme_json_guard_decision(*args_)
            if got != want:
                failures.append(f"guard{args_} -> {got}, expected {want}")
        # 15. Post-deploy verify: mismatch and unreadable both FAIL.
        if theme_json_verify_result(sn, fw) or theme_json_verify_result(sn, None):
            failures.append("verify: a live theme.json that is not the payload passed")
        if not theme_json_verify_result(sn, sn):
            failures.append("verify: a matching live theme.json failed (positive control)")
    # 16. DATA: every real target that names a client has a real, preparable snapshot.
    for key, tgt in TARGETS.items():
        if "client" not in tgt:
            failures.append(f"TARGETS['{key}'] has no 'client' key (use None for the framework default)")
            continue
        payload, why = resolve_theme_json_payload(tgt)
        if payload is None:
            failures.append(f"TARGETS['{key}']: {why}")
    return failures


def self_test() -> int:
    """Prove the payload-scoped dirty gate REJECTS the unsafe case, not just the happy path.

    A gate that cannot fail reads green forever. This builds an ISOLATED temp git repo — never the real
    working tree — with two dirty files under a deploy root: one declared as the
    wave's own ``--payload``, one left undeclared (standing in for "another
    track's unrelated modified files").

    Asserts, in order:
      0. The negative control actually LANDED (``git diff --stat`` shows both
         files changed) before trusting any gate output — a write that silently
         no-ops must not read as a pass.
      1. ``deployed_dirty_files()`` detects both dirty files.
      2. POSITIVE CONTROL — declaring the payload file via ``--payload`` removes
         it from ``uncovered`` (this is the deadlock-breaker actually working).
      3. NEGATIVE CONTROL / KNOWN FAILURE — the undeclared file STAYS in
         ``uncovered`` even though a payload was declared (declaring a payload
         does not weaken the guard).
      4. NO PAYLOAD — with NO ``--payload`` at all, both files are uncovered.
    """
    failures: list[str] = []
    with tempfile.TemporaryDirectory(prefix="sgs-deploy-selftest-") as td:
        repo = Path(td)

        def git(*a: str) -> None:
            subprocess.run(["git", *a], cwd=repo, check=True, capture_output=True, text=True)

        git("init", "-q")
        git("config", "user.email", "selftest@example.invalid")
        git("config", "user.name", "sgs-deploy-selftest")

        payload_dir = repo / "plugins" / "sgs-blocks" / "includes"
        payload_dir.mkdir(parents=True)
        payload_file = payload_dir / "payload-target.php"
        unrelated_file = payload_dir / "unrelated-inflight.php"
        payload_file.write_text("<?php // v1\n", encoding="utf-8")
        unrelated_file.write_text("<?php // v1\n", encoding="utf-8")
        # A THEME file, for the scope cases (5-7): another track's template.
        theme_dir = repo / "theme" / "sgs-theme" / "templates"
        theme_dir.mkdir(parents=True)
        theme_file = theme_dir / "archive.html"
        theme_file.write_text("<!-- v1 -->", encoding="utf-8")
        git("add", "-A")
        git("commit", "-q", "-m", "initial")

        # Modify BOTH — this wave's own payload AND another track's unfinished edit.
        payload_file.write_text("<?php // v2 -- this wave's declared payload\n", encoding="utf-8")
        unrelated_file.write_text("<?php // v2 -- someone else's unfinished edit\n", encoding="utf-8")

        theme_file.write_text("<!-- v2 another track -->", encoding="utf-8")

        # 0. Confirm the plant actually landed. `sed`/write-with-no-effect exits 0
        # on a no-op; check the diff itself, not the write command's return code.
        diffstat = subprocess.run(
            ["git", "diff", "--stat"], cwd=repo, check=False, capture_output=True, text=True,
        ).stdout
        if (
            "payload-target.php" not in diffstat
            or "unrelated-inflight.php" not in diffstat
            or "archive.html" not in diffstat
        ):
            print("[SELF-TEST FAIL] negative control did not land — git diff --stat:")
            print(diffstat)
            return 1

        dirty = deployed_dirty_files(repo_root=repo)
        rel_payload = "plugins/sgs-blocks/includes/payload-target.php"
        rel_unrelated = "plugins/sgs-blocks/includes/unrelated-inflight.php"

        # 1. Both dirty files detected.
        if rel_payload not in dirty or rel_unrelated not in dirty:
            failures.append(f"deployed_dirty_files() did not detect both dirty files: {dirty}")

        # 2. POSITIVE CONTROL: declared payload is covered -> not blocking.
        covered, uncovered = split_dirty_by_payload(
            dirty, ["plugins/sgs-blocks/includes/payload-target.php"]
        )
        if rel_payload not in covered:
            failures.append(
                f"POSITIVE CONTROL FAILED: declared --payload file was not covered "
                f"(deadlock-breaker inert): covered={covered}"
            )

        # 3. NEGATIVE CONTROL / KNOWN FAILURE PROBE: undeclared file must still block.
        if rel_unrelated not in uncovered:
            failures.append(
                f"NEGATIVE CONTROL FAILED: an undeclared dirty file was NOT blocked "
                f"-- this would weaken D336's protection: uncovered={uncovered}"
            )

        # 4. NO PAYLOAD: no --payload at all -> everything blocks.
        covered_none, uncovered_none = split_dirty_by_payload(dirty, [])
        if covered_none:
            failures.append(
                f"BACKWARD-COMPAT FAILED: with no --payload, files were covered anyway: {covered_none}"
            )
        if set(uncovered_none) != set(dirty):
            failures.append(
                f"BACKWARD-COMPAT FAILED: with no --payload, not everything blocked: "
                f"uncovered={uncovered_none} dirty={dirty}"
            )

        # 5. SCOPE: a --blocks-only run must NOT be blocked by a dirty THEME
        #    file — that run cannot write one, so it is not a risk it creates.
        blocks_scope = deploy_roots_for_scope(theme_only=False, blocks_only=True)
        dirty_blocks_only = deployed_dirty_files(repo_root=repo, roots=blocks_scope)
        rel_theme = "theme/sgs-theme/templates/archive.html"
        if rel_theme in dirty_blocks_only:
            failures.append(
                "SCOPE FAILED: a dirty THEME file still blocked a --blocks-only "
                f"deploy, which cannot ship it: {dirty_blocks_only}"
            )

        # 6. NEGATIVE CONTROL for case 5 — scoping must NARROW, not DISABLE. An
        #    in-scope dirty file MUST still block, or the guard has been switched
        #    off and would read green forever.
        if rel_unrelated not in dirty_blocks_only:
            failures.append(
                "SCOPE NEGATIVE CONTROL FAILED: an in-scope dirty file was NOT "
                "detected under --blocks-only -- the scoping disabled the guard "
                f"rather than narrowing it: {dirty_blocks_only}"
            )

        # 7. The narrowing is CONDITIONAL: a FULL deploy still sees the theme
        #    file. Without this, case 5 would also pass if the theme root had
        #    simply been dropped from DEPLOY_ROOTS outright.
        dirty_full = deployed_dirty_files(repo_root=repo, roots=DEPLOY_ROOTS)
        if rel_theme not in dirty_full:
            failures.append(
                "SCOPE FAILED: a FULL deploy did not see the dirty theme file -- "
                f"the theme root is being dropped unconditionally: {dirty_full}"
            )

    failures.extend(self_test_theme_json())

    if failures:
        print("[SELF-TEST FAIL]")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("[SELF-TEST PASS]")
    print("  0. negative control confirmed landed via git diff --stat before trusting the gate")
    print("  1. deployed_dirty_files() detects dirty files in an isolated repo")
    print("  2. POSITIVE CONTROL: declared --payload file is covered (deadlock-breaker works)")
    print("  3. NEGATIVE CONTROL (known failure probe): undeclared dirty file stays blocked (D336 intact)")
    print("  4. BACKWARD COMPAT: no --payload => identical to pre-existing all-blocking behaviour")
    print("  5. SCOPE: a dirty THEME file does not block --blocks-only (it cannot ship it)")
    print("  6. SCOPE NEGATIVE CONTROL: an in-scope dirty file STILL blocks --blocks-only")
    print("  7. SCOPE is CONDITIONAL: a full deploy still sees the dirty theme file")
    print("  8. NEGATIVE CONTROL: the pre-fix theme deploy DOES replace a client snapshot with the default")
    print("  9. a theme deploy on a target WITH a client ends with the client snapshot live")
    print(" 10. a target with NO client keeps the framework default theme.json")
    print(" 11. a payload missing from the tarball FAILS the extract and leaves the live theme untouched")
    print(" 12. a named client with no snapshot fails closed (no framework fallback)")
    print(" 13. an unparseable snapshot fails closed")
    print(" 14. pre-upload guard: aborts only when an UNCOMMITTED pushed snapshot is live")
    print(" 15. post-deploy verify: a live theme.json that is not the payload FAILS")
    print(" 16. every real TARGETS entry names a client whose snapshot prepares")
    return 0


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


def step_gate_full(dry_run: bool) -> int:
    """PRE-DEPLOY heavyweight gate tier (`npm run gate:full`).

    ⛔ WHY THIS EXISTS AND WHY IT IS NOT OPTIONAL. `prebuild` is FAIL-FAST — a
    change tripping five gates shows ONE failure per build — so the gate chain is
    split into two tiers (`scripts/gates.json`): `fast` runs on every build;
    `full` holds the slowest gates (pytest, check-dead-api-calls,
    audit-block-file-consistency, inspector-scan).

    Moving a gate to a later tier is only legitimate if something actually runs
    that tier. WITHOUT THIS STEP the split would be enforcement laundering: four
    gates would sit in a roster, run on no build, and the repo would read green
    while nothing checked them. `run-gates.py --assert-wired` proves this call is
    still here, and fails closed if it is deleted.

    It runs PRE-tar so a failure costs nothing: nothing has been uploaded yet.
    All four are static source checks, so they need no live canary — unlike
    `step_motion_qa()`, which is post-deploy precisely because it does.

    ⚠ Opting out with `--skip-gate-full` re-creates the hole. Do not make it
    reflex.
    """
    if dry_run:
        log("[gate:full] SKIPPED (--dry-run)")
        return 0
    log("[gate:full] running the pre-deploy heavyweight gate tier")
    return run([resolve_exe("npm"), "run", "gate:full"], dry_run=False, cwd=PLUGIN_DIR)


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


# ---------------------------------------------------------------------------
# Deploy isolation — worktree-isolated build+deploy is the DEFAULT, not opt-in.
# ---------------------------------------------------------------------------
# `plugins/sgs-blocks/build/` is gitignored and shared across every concurrent
# session on this machine (150+ per the project's own git-hygiene docs).
# `npm run build` runs `rm -rf build` first. A deploy's gate window (gate:full
# alone is ~47s+) is long enough for a concurrent session's `npm run build` to
# wipe the shared `build/` out from under an in-flight deploy: the target would
# serve a `sgs-blocks` plugin with ZERO working render.php files, and the
# deploy's own `[payload-verify]` step would only catch it AFTER the broken
# plugin was already live (the checksum comparison runs against the
# deleted local reference copy, not the tarball's actual contents at
# pack time).
#
# DESIGN: a `git worktree add <tmp-dir> HEAD`, THEN A RE-EXEC of this same script — the WORKTREE'S OWN COPY of
# `build-deploy.py` — with `--no-isolate` appended, rather than threading a
# repo-root parameter through step_build()/step_tar()/etc. `REPO_ROOT` /
# `PLUGIN_DIR` / `BUILD_DIR` are all derived from `Path(__file__)`, so running
# the WORKTREE'S copy of the script makes every existing step function resolve
# worktree paths automatically, with ZERO changes to any of them and therefore
# no new risk to the build/tar/scp/verify chain. This is chosen over a lock
# file DELIBERATELY: a lock only protects a session that respects it, and this
# repo cannot assume that.
#
# ⚠ ISOLATION ONLY COVERS A COMMITTED (or clean) DEPLOY. `git worktree add
# <dir> HEAD` checks out the committed tree — it does NOT carry this
# checkout's uncommitted working-directory edits into the new worktree. A
# `--payload`/`--allow-dirty` deploy of UNCOMMITTED files would silently ship
# a STALE build from the worktree (missing the very payload the operator
# intended to deploy) if isolation ran anyway. Rather than build a
# patch-and-apply mechanism to carry dirty state across (real, separate
# engineering, and a wrong copy would be a worse bug than the race this
# exists to fix), isolation AUTO-SKIPS whenever this run would ship any
# deploy-relevant dirty file — the exact same `deployed_dirty_files()` check
# `main()` already runs for the dirty-tree gate, scoped the same way. That
# deploy proceeds against the shared checkout (the race with a concurrent
# `npm run build` remains for that case; isolation covers the common one: a
# normal deploy of committed work).
ISOLATION_WORKTREE_PREFIX = "sgs-deploy-wt"


def should_isolate(args: "argparse.Namespace", dirty_files: list[str]) -> bool:
    """Whether THIS run should build+deploy from an isolated worktree.

    ONLY the flag-based eligibility checks live here: --no-isolate (explicit
    opt-out), --skip-build (no build race to protect against — reusing an
    existing build/ touches nothing that a concurrent `rm -rf build` could
    clobber during THIS run), --dry-run (nothing is built), --self-test
    (never reaches main()'s deploy path).

    Whether this run INTENDS to ship uncommitted content (and must therefore
    skip isolation regardless of these flags, since a worktree at HEAD cannot
    carry it) is decided by the CALLER before this function is even invoked
    — see `intends_dirty_ship` in main(). `dirty_files` is accepted only for
    an informational log line; it is not itself a disqualifying condition
    here, because the caller already screened for the disqualifying case.
    """
    if args.no_isolate:
        return False
    if args.skip_build:
        return False
    if args.dry_run:
        return False
    if dirty_files:
        log(f"[isolate] {len(dirty_files)} dirty deploy-relevant file(s) exist in "
            "the shared checkout, none declared for THIS run to ship — isolating "
            "anyway (a worktree at HEAD cannot carry them regardless).")
    return True


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
        for rel in (
            Path("plugins/sgs-blocks/node_modules"),
            Path("plugins/sgs-blocks/vendor"),
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
        child_env = dict(os.environ, SGS_DEPLOY_SHARED_ROOT=str(REPO_ROOT))
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


def step_purge_caches(dry_run: bool, use_alias: bool, wp_content: str,
                      host: str) -> int:
    """Post-deploy cache purge - THREE DIFFERENT CACHES, deliberately all.

    WHY THIS EXISTS. A cache reset that is only described in docs (or in
    ROLLBACK_HINT's MANUAL instructions) and enforced nowhere leaves theme assets
    served STALE to every warm browser cache after a deploy.

    The two layers are not interchangeable:

      OPcache   holds COMPILED PHP.   Stale => the server runs yesterday's render.php.
      LiteSpeed holds RENDERED HTML.  Stale => the server never runs today's PHP at all.
      Pattern   holds the parsed THEME PATTERN FILES, keyed on the theme version.  Stale =>
                a pattern file added by the deploy is on disk but never registered.

    Clearing one does nothing for the others.

    OPCACHE MUST BE RESET OVER HTTP, NOT OVER SSH. Each PHP SAPI keeps its OWN
    OPcache: `wp eval` runs in the CLI pool and resets the CLI's cache, leaving the
    web pool - the one that actually serves visitors - untouched, while reporting
    success. So a temporary file is written into the webroot, fetched over HTTPS so
    the WEB pool executes it, then removed. The filename carries a random token: it
    is world-reachable for the ~1s it exists, and a guessable opcache_reset()
    endpoint is a free cache-stampede lever. The payload ships base64-encoded so no
    PHP quoting can be mangled by the shell on the way.

    FAILS SOFT, LOUDLY. By this point the files are already live, so a failed purge
    is not grounds to abort - that would read as "nothing shipped" and invite a
    retry loop. But a leg that did not run is NEVER reported as OK: the whole point
    of this step is that a silent skip makes stale caches invisible.
    """
    log("[purge] clearing cache layers (OPcache + page cache + theme pattern cache)")
    if dry_run:
        log("[purge] SKIPPED (--dry-run); would reset OPcache over HTTPS "
            "and run `wp litespeed-purge all`")
        return 0

    webroot = (wp_content[: -len("/wp-content")]
               if wp_content.endswith("/wp-content") else wp_content)
    ok_opcache = False
    ok_page = False

    # ---- leg 1: OPcache, via the WEB pool ---------------------------------
    probe = "sgs-opcache-" + os.urandom(8).hex() + ".php"
    remote_probe = webroot + "/" + probe
    php = ("<?php if (function_exists('opcache_reset')) { echo opcache_reset() "
           "? 'SGS-OPCACHE-RESET-OK' : 'SGS-OPCACHE-RESET-FAILED'; } "
           "else { echo 'SGS-OPCACHE-ABSENT'; }")
    b64 = base64.b64encode(php.encode("utf-8")).decode("ascii")
    write_cmd = ssh_base_cmd(use_alias) + [
        "echo " + shlex.quote(b64) + " | base64 -d > " + shlex.quote(remote_probe)]
    rm_cmd = ssh_base_cmd(use_alias) + ["rm -f " + shlex.quote(remote_probe)]
    try:
        w = subprocess.run(write_cmd, check=False, capture_output=True, text=True)
        if w.returncode != 0:
            err("[purge] could not write the OPcache probe (exit %d): %s"
                % (w.returncode, (w.stderr or "").strip()[:200]))
        else:
            import urllib.error
            import urllib.request
            url = "https://" + host + "/" + probe
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "sgs-deploy/opcache"})
                with urlopen_tls(req, "purge") as resp:
                    body = resp.read(200).decode("utf-8", "replace")
                if "SGS-OPCACHE-RESET-OK" in body:
                    log("[purge] OPcache: RESET (web pool)")
                    ok_opcache = True
                elif "SGS-OPCACHE-ABSENT" in body:
                    log("[purge] OPcache: not enabled on this host - nothing to reset")
                    ok_opcache = True
                else:
                    err("[purge] OPcache reset did not confirm; probe said: %r"
                        % body.strip()[:120])
            except (urllib.error.URLError, OSError) as e:
                err("[purge] OPcache probe request failed: %s" % e)
    finally:
        subprocess.run(rm_cmd, check=False, capture_output=True, text=True)
        # Prove the probe is gone rather than assuming the rm landed - it is a
        # publicly reachable file that resets a shared cache.
        chk = subprocess.run(
            ssh_base_cmd(use_alias)
            + ["test -e " + shlex.quote(remote_probe)
               + " && echo PRESENT || echo GONE"],
            check=False, capture_output=True, text=True)
        if "PRESENT" in (chk.stdout or ""):
            err("[purge] the OPcache probe is STILL on the server: %s "
                "- remove it by hand" % remote_probe)

    # ---- leg 2: page cache (LiteSpeed) ------------------------------------
    # Gated on the plugin actually being active so a target without LiteSpeed
    # reports "not installed" rather than a red error on every deploy.
    page_cmd = ssh_base_cmd(use_alias) + [
        "cd " + shlex.quote(webroot) + " && "
        "if wp plugin is-active litespeed-cache 2>/dev/null; then "
        "wp litespeed-purge all 2>&1; else echo SGS-NO-LITESPEED; fi"]
    pc = subprocess.run(page_cmd, check=False, capture_output=True, text=True)
    out = ((pc.stdout or "") + (pc.stderr or "")).strip()
    if "SGS-NO-LITESPEED" in out:
        log("[purge] page cache: LiteSpeed not active on this target - skipped")
        ok_page = True
    elif pc.returncode == 0 and "Purged" in out:
        log("[purge] page cache: PURGED (LiteSpeed)")
        ok_page = True
    else:
        err("[purge] page-cache purge did not confirm (exit %d): %s"
            % (pc.returncode, out[:200]))

    # ---- leg 3: theme pattern cache ---------------------------------------
    pattern_cmd = ssh_base_cmd(use_alias) + [
        "cd " + shlex.quote(webroot) + " && "
        "wp eval 'wp_get_theme()->delete_pattern_cache(); echo \"SGS-PATTERN-CACHE-CLEARED\";' 2>&1"]
    pt = subprocess.run(pattern_cmd, check=False, capture_output=True, text=True)
    pout = ((pt.stdout or "") + (pt.stderr or "")).strip()
    ok_patterns = "SGS-PATTERN-CACHE-CLEARED" in pout
    if ok_patterns:
        log("[purge] theme pattern cache: CLEARED")
    else:
        err("[purge] theme pattern cache did not clear (exit %d): %s"
            % (pt.returncode, pout[:200]))

    if ok_opcache and ok_page and ok_patterns:
        log("[purge] OK - all layers clear")
        return 0
    # Non-fatal by design (see the docstring), but never silent.
    err("[purge] NOT FULLY PURGED - the deploy IS live, but visitors with a warm "
        "cache may still be served the previous version. Re-run the failing leg "
        "by hand before trusting a visual check.")
    return 0


def step_oldshape_audit(dry_run: bool, use_alias: bool, target_key: str,
                        wp_content: str) -> int:
    """Pre-deploy content-compat gate. Scans the TARGET site's stored post_content against
    the LOCAL block.json schemas (i.e. the code about to be deployed) for:
      * stranded content — old scalar shapes an InnerBlocks render no longer reads
        (the empty-Indus-homepage class), and
      * undeclared attrs — dropped from the EDITOR schema (not from render.php's
        `$attributes`; PHP keeps an unrecognised key), DELETED on next editor save.

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
    # of them. Only WP-internal types that structurally
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
        # convention ("<target>/<post id>|sgs/hero|…").
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
    """Post-deploy structural gate (scoped-selector match): run the LIVE
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


# Deploy-ownership marker. Deliberately OUTSIDE the webroot (the SSH home dir):
# it names a username, a branch and a commit SHA, and anything under wp-content
# is publicly fetchable. Per-target because several sites share this account.
def marker_path(target_key: str) -> str:
    return f".sgs-deploy-marker-{target_key}.json"


def read_deploy_marker(use_alias: bool, target_key: str) -> dict | None:
    """The marker left by whoever deployed this target last, or None.

    Returns None for BOTH "no marker yet" and "could not read it" — the caller
    treats an absent marker as permission to proceed, because a first-ever
    deploy must not be blocked by its own bookkeeping.
    """
    remote = f"cat {shlex.quote(marker_path(target_key))} 2>/dev/null || echo __NO_MARKER__"
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=60)
    except (subprocess.SubprocessError, OSError):
        return None
    body = (out.stdout or "").strip()
    if out.returncode != 0 or not body or "__NO_MARKER__" in body:
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def step_deploy_ownership(use_alias: bool, target_key: str, takeover: bool,
                          dry_run: bool) -> int:
    """PRE-deploy gate: refuse to clobber a deploy carrying work this HEAD lacks.

    ⛔ WHY. This canary is shared, and a co-active session deploys from its OWN
    git worktree — so it ships ITS build/, not yours. Deploying an older build
    over a newer one silently reverts every migrated block.json to the
    pre-migration schema; WordPress then discards every object-valued attribute
    before render, and the deploy reports success.

    The test is ANCESTRY, not equality: if the recorded commit is an ancestor of
    HEAD, this deploy carries everything the last one did and overwriting is
    safe. If it is NOT, the live site holds work this checkout does not have, and
    deploying would destroy it — abort and make the operator choose.

    Fail-OPEN on the unknowns (no marker / unreadable / no SHA recorded): a
    first-ever deploy, or a marker written by an older version of this script,
    must not be blocked by its own bookkeeping. Fail-CLOSED only on the one case
    that is genuinely provable: a recorded commit that is real and is not an
    ancestor.
    """
    if dry_run:
        log("[ownership] SKIPPED (--dry-run)")
        return 0

    marker = read_deploy_marker(use_alias, target_key)
    if not marker:
        log("[ownership] no previous marker on this target - proceeding (first deploy "
            "by this mechanism)")
        return 0

    sha = str(marker.get("commit") or "").strip()
    who = marker.get("deployer") or "unknown"
    when = marker.get("at") or "unknown time"
    branch = marker.get("branch") or "unknown branch"
    if not sha:
        log(f"[ownership] marker has no commit recorded (written by {who} at {when}) "
            "- proceeding")
        return 0

    # Is the recorded commit even in this clone? If not, we cannot reason about
    # ancestry, and the safe reading is "someone deployed something we have never
    # fetched" - which is exactly the case worth stopping for.
    known = subprocess.run(["git", "cat-file", "-e", f"{sha}^{{commit}}"],
                           cwd=REPO_ROOT, capture_output=True)
    if known.returncode != 0:
        if takeover:
            log(f"[ownership] --takeover: overwriting a deploy at unknown commit {sha[:8]} "
                f"({who}, {when})")
            return 0
        err(f"[ownership] ABORT: the live target was deployed at commit {sha[:8]} "
            f"({branch}, by {who} at {when}), which does not exist in this clone.")
        err("[ownership] run `git fetch --all` first. If that commit is genuinely gone "
            "or irrelevant, re-run with --takeover.")
        return 1

    anc = subprocess.run(["git", "merge-base", "--is-ancestor", sha, "HEAD"],
                         cwd=REPO_ROOT, capture_output=True)
    if anc.returncode == 0:
        log(f"[ownership] OK: live is at {sha[:8]} ({who}), an ancestor of HEAD - "
            "this deploy is a fast-forward")
        return 0

    if takeover:
        log(f"[ownership] --takeover: deliberately overwriting {sha[:8]} ({branch}, "
            f"{who}, {when}), which is NOT an ancestor of HEAD")
        return 0

    err(f"[ownership] ABORT: the live target carries commit {sha[:8]} on {branch} "
        f"(deployed by {who} at {when}), which is NOT an ancestor of your HEAD.")
    err("[ownership] Deploying would DESTROY work that is live and not in this checkout. "
        "This is the D576 failure, made visible instead of silent.")
    err("[ownership] Choose: `git pull --rebase` (or merge that work) and re-run, or "
        "re-run with --takeover if you genuinely intend to replace it.")
    return 1


def write_deploy_marker(use_alias: bool, target_key: str, dry_run: bool) -> int:
    """Record who deployed what, AFTER a successful extract.

    Best-effort: a failure here is logged, never fatal. The files are already
    live at this point, and refusing to finish over bookkeeping would be worse
    than a missing marker.
    """
    if dry_run:
        return 0
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT,
                          capture_output=True, text=True)
    branch = subprocess.run(["git", "branch", "--show-current"], cwd=REPO_ROOT,
                            capture_output=True, text=True)
    payload = {
        "commit": (head.stdout or "").strip(),
        "branch": (branch.stdout or "").strip() or "(detached)",
        "deployer": os.environ.get("USERNAME") or os.environ.get("USER") or "unknown",
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "target": target_key,
    }
    blob = json.dumps(payload, separators=(",", ":"))
    remote = f"cat > {shlex.quote(marker_path(target_key))} <<'SGSEOF'\n{blob}\nSGSEOF"
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=60)
        if out.returncode != 0:
            log(f"[ownership] WARN: could not write the marker (exit {out.returncode}) "
                "- deploy stands, but the next session will not see this one")
            return 0
    except (subprocess.SubprocessError, OSError) as e:
        log(f"[ownership] WARN: could not write the marker ({e}) - deploy stands")
        return 0
    log(f"[ownership] marker written: {payload['commit'][:8]} on {payload['branch']} "
        f"by {payload['deployer']}")
    return 0


def step_motion_qa(dry_run: bool) -> int:
    """Post-deploy LIVE motion regression check.

    ⛔ WHY THIS IS HERE AND NOT IN `prebuild`. Every motion probe needs a live canary.
    A network-dependent check inside a BUILD gate can only fail when the canary is
    merely unreachable, or warn-and-pass — and warn-and-pass is precisely the vacuity
    `check-no-inline.py --live-default` already carries (it PASSES on a disconnected
    machine, so a green run there proves nothing). Post-deploy is the honest home: the
    canary is up by definition, and `step_verify_payload()` has just proven the live
    plugin IS this run's payload, so a motion regression here is genuinely attributable
    to this deploy rather than to ambient site state.

    ⚠ Probes under `scripts/motion-qa/` that `package.json` does not reference are
    "built but never wired": they run on no build. Opting out with
    `--skip-motion-qa` leaves them unrun.
    """
    if dry_run:
        log("[motion-qa] SKIPPED (--dry-run)")
        return 0
    log("[motion-qa] running live motion probes against the canary")
    # npm is a shell shim on Windows; shell=False needs the .cmd form there.
    npm = "npm.cmd" if os.name == "nt" else "npm"
    return run([npm, "run", "qa:motion"], dry_run=False, cwd=PLUGIN_DIR)


def step_verify_payload(use_alias: bool, wp_content: str, blocks: bool) -> int:
    """CHANGE-SPECIFIC verify: does the LIVE plugin match the payload we just shipped?

    ⛔ WHY THIS EXISTS. `step_verify()` above is deliberately cause-agnostic and
    GENERIC — it asserts the page returns 200 and contains `wp-block-sgs`. Every
    one of those assertions passes just as happily on LAST WEEK'S build. If a
    co-active session deploying from its own worktree ships an OLDER `build/`
    over this track's, every migrated `block.json` reverts to the pre-migration
    `type:string` schema. WordPress then rejects each object-valued attribute in
    `prepare_attributes_for_render()` and refills it from the old scalar default,
    so the value never reaches render.php at all — and a generic verify stays
    green.

    Compares the md5 of every deployed `build/blocks/*/block.json` against the
    local copy that was just packaged. block.json is the right file to check
    because it carries the ATTRIBUTE SCHEMA — the thing WordPress validates stored
    content against, and therefore the thing whose staleness silently discards
    data rather than erroring. It is also cheap: one SSH round trip, no per-file
    fetch.

    Cause-agnostic by construction: it does not care WHY the live copy differs
    (a racing deploy, a partial extract, a stale tar). Any difference fails.
    """
    import hashlib

    local_root = REPO_ROOT / "plugins" / "sgs-blocks" / "build" / "blocks"
    if not local_root.is_dir():
        err(f"[payload-verify] local build dir missing: {local_root}")
        return 1

    local: dict[str, str] = {}
    for bj in sorted(local_root.glob("*/block.json")):
        local[bj.parent.name] = hashlib.md5(bj.read_bytes()).hexdigest()
    if not local:
        err(f"[payload-verify] no block.json found under {local_root}")
        return 1

    remote_dir = f"{wp_content}/plugins/sgs-blocks/build/blocks"
    remote_cmd = (
        f"cd {shlex.quote(remote_dir)} 2>/dev/null && "
        "md5sum */block.json 2>/dev/null || echo __MISSING__"
    )
    log(f"[payload-verify] comparing {len(local)} block.json checksums against the live plugin")
    try:
        out = subprocess.run(ssh_base_cmd(use_alias) + [remote_cmd], capture_output=True,
                             text=True, encoding="utf-8", errors="replace", timeout=120)
    except (subprocess.SubprocessError, OSError) as e:
        err(f"[payload-verify] SSH failed: {e}")
        return 1
    if out.returncode != 0 or "__MISSING__" in (out.stdout or ""):
        err("[payload-verify] could not read the deployed build/blocks dir - "
            f"expected at {remote_dir}")
        return 1

    remote: dict[str, str] = {}
    for line in (out.stdout or "").splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1].endswith("/block.json"):
            remote[parts[1].rsplit("/block.json", 1)[0]] = parts[0]

    if not remote:
        err("[payload-verify] the live plugin reported no block.json files at all")
        return 1

    mismatched = sorted(k for k in local if k in remote and local[k] != remote[k])
    missing = sorted(k for k in local if k not in remote)

    if not mismatched and not missing:
        log(f"[payload-verify] PASS: all {len(local)} deployed block.json match the payload")
        return 0

    # ASCII only past this point: err() writes to stderr, which is not
    # reconfigured to utf-8, so non-ASCII mangles on a Windows console.
    err(f"[payload-verify] FAIL: the LIVE plugin is not what this run shipped "
        f"({len(mismatched)} differ, {len(missing)} missing)")
    for name in mismatched[:12]:
        err(f"    differs : {name}  local={local[name][:8]} live={remote[name][:8]}")
    for name in missing[:12]:
        err(f"    missing : {name}")
    if len(mismatched) + len(missing) > 24:
        err(f"    ... and {len(mismatched) + len(missing) - 24} more")
    err("[payload-verify] MOST LIKELY CAUSE: another session deployed over this one "
        "(the canary is shared, and a worktree deploy ships ITS build/, not yours). "
        "Re-run this deploy, then re-check. Do NOT assume your code is live because "
        "the page returned 200 - that is exactly the D576 failure.")
    return 1


def step_verify(url: str) -> int:
    """Post-deploy smoke test. Returns non-zero when the deploy has broken the site.

    Runs by default (opt out with --skip-verify) and can fail: a verify that is
    opt-in or warn-only lets a deploy that took live sites down still report
    [DONE].

    Deliberately cause-agnostic: it does not care WHY the page is broken. That
    matters because a missing `use` statement is a RUNTIME class-resolution
    failure — `php -l` passes it cleanly and only fetching the real page
    catches it.
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
            with urlopen_tls(req, "verify") as resp:
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
        # This branch fails closed: a verify leg that cannot fail reads green
        # forever.
        # NOTE this is a GENERIC assertion (these markers match any
        # working SGS page, including one running last week's build); it is
        # not change-specific — deliberately, because its job is "is the site
        # alive", not "is my code live".
        # The change-specific half is `step_verify_payload()` above: it md5s
        # every deployed block.json against the local payload over the SSH
        # connection this script already opens.
        # ⚠ That check proves AGREEMENT, not correctness — matching bytes mean
        # the live plugin is what this run shipped, never that what it shipped
        # is right. The deploy-ownership marker (`step_deploy_ownership()`)
        # turns a silent clobber of another session's deploy into a deliberate
        # one.
        err(f"[verify] none of {markers} found in {url} - "
            "the deployed page is not rendering SGS markup")
        err(f"[verify] {ROLLBACK_HINT}")
        return 1
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
    p.add_argument("--skip-gate-full", action="store_true",
                   help="Skip the pre-deploy heavyweight gate tier (gate:full). "
                        "This DISABLES four real gates for this deploy.")
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
    p.add_argument("--skip-motion-qa", action="store_true",
                   help="skip the post-deploy live motion probes. Doing so is "
                        "the D338 mistake: it makes the probes unreachable again.")
    p.add_argument("--skip-purge", action="store_true",
                   help="Skip the post-deploy cache purge (OPcache + LiteSpeed). "
                        "NOT recommended: the deploy still lands, but warm caches "
                        "keep serving the previous version — that is D709.")
    p.add_argument("--takeover", action="store_true",
                   help="Deploy even when the live target carries a commit that is NOT "
                        "an ancestor of HEAD (i.e. deliberately overwrite another "
                        "session's newer deploy). Without this the deploy ABORTS - see "
                        "D576, where a silent clobber cost two sessions of debugging.")
    p.add_argument("--payload", action="append", default=[],
                   help="Repo-relative path prefix (e.g. "
                        "plugins/sgs-blocks/src/blocks/quote/) that is THIS wave's "
                        "deliberate uncommitted payload. Repeatable. Deploys proceed "
                        "without --allow-dirty when every deploy-relevant dirty file "
                        "falls under a declared --payload prefix; any OTHER dirty "
                        "deploy-relevant file (another track's unfinished work) still "
                        "blocks exactly as before (D336). Breaks the deploy<->commit "
                        "deadlock: canary-deploy the payload uncommitted, capture the "
                        "visual-diff report the pre-commit gate demands, THEN commit.")
    p.add_argument("--self-test", action="store_true",
                   help="Run the self-test (payload-scoped dirty gate + client theme.json "
                        "survival) against isolated temp dirs (proves each guard still "
                        "rejects its unsafe case) and exit. Touches no real git state or site.")
    p.add_argument("--no-isolate", action="store_true",
                   help="Build+deploy directly from this shared checkout instead of "
                        "an isolated git worktree. Isolation is the DEFAULT (D-incident "
                        "2026-09-07 — a concurrent session's `npm run build` wiped the "
                        "shared build/ mid-deploy and shipped a broken plugin). Only "
                        "use this if you understand the race it reopens.")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    if args.self_test:
        return self_test()
    t0 = time.time()

    target_key = args.target
    target = TARGETS[target_key]

    # Explicit opt-in guard for protected targets
    if target["explicit_opt_in_required"] and "--target" not in sys.argv:
        err(f"target {target_key} requires explicit --target {target_key} opt-in")
        print(f"[ABORTED] reason: explicit-opt-in-required ({target_key})", flush=True)
        return 1

    # Resolve scope
    deploy_theme = not args.blocks_only
    deploy_blocks = not args.theme_only
    if not (deploy_theme or deploy_blocks):
        err("nothing to deploy (theme and blocks both excluded)")
        print("[ABORTED] reason: empty-scope", flush=True)
        return 1

    # The theme.json this target must end up with (client snapshot, or the framework
    # default when the target names no client). Resolved BEFORE anything runs so a
    # missing/broken client snapshot aborts with nothing uploaded — see
    # resolve_theme_json_payload(). A --blocks-only deploy never touches the theme.
    theme_json_payload: bytes | None = None
    theme_json_label = ""
    if deploy_theme:
        theme_json_payload, theme_json_label = resolve_theme_json_payload(target)
        if theme_json_payload is None:
            err(f"[theme-json] {theme_json_label}")
            err("[theme-json] refusing to deploy the theme: it would replace this target's "
                "theme.json with the framework default. Fix the snapshot or the TARGETS "
                "'client' entry. Nothing was uploaded.")
            print("[ABORTED] reason: client-theme-json-unavailable", flush=True)
            return 1
        log(f"[theme-json] this deploy ships: {theme_json_label}")

    # Git cleanliness guard — scoped to files that ship AND execute on the site.
    # Computed once, unconditionally (also feeds the isolation decision below).
    dirty = deployed_dirty_files(
        roots=deploy_roots_for_scope(args.theme_only, args.blocks_only)
    )
    covered, uncovered = split_dirty_by_payload(dirty, args.payload) if dirty else ([], [])
    # Whether THIS invocation actually intends to ship uncommitted content —
    # either every dirty file is a declared --payload, or the operator passed
    # --allow-dirty outright. Only this case needs the shared (non-isolated)
    # checkout: a worktree built from `git worktree add <dir> HEAD` cannot
    # carry uncommitted content by construction, so it would silently DROP an
    # intended dirty payload.
    intends_dirty_ship = bool(dirty) and (args.allow_dirty or not uncovered)

    # Deploy isolation — see the module-level
    # note above run_isolated(). A worktree at HEAD is dirty-immune BY
    # CONSTRUCTION: it can only ever contain committed content, so when this
    # run does not intend to ship anything uncommitted, isolating makes the
    # git-cleanliness guard below MOOT for THIS run — other sessions' unrelated
    # dirty files in the shared checkout (a near-certainty on a 150+-session
    # tree) cannot leak into a worktree checkout regardless, so there is
    # nothing left to abort on. Without isolation, a fully-committed
    # single-block deploy is wrongly aborted by OTHER sessions' unrelated dirty
    # blocks sitting in the shared checkout — none of which a worktree at HEAD
    # would ship in the first place.
    if not intends_dirty_ship and should_isolate(args, dirty):
        log("[isolate] dirty-tree gate satisfied by construction (worktree "
            "checks out committed HEAD only) — skipping the shared-checkout "
            "dirty-file abort for this run.")
        return run_isolated(args)

    if not args.allow_dirty and not args.dry_run and dirty:
        if covered:
            log("[payload] declared --payload covers these dirty files — "
                "deploying them uncommitted:")
            for path in covered:
                log(f"    {path}")
        if uncovered:
            err("uncommitted changes in files this deploy would push live, "
                "NOT covered by --payload:")
            for path in uncovered:
                err(f"    {path}")
            err("commit them, add them to --payload if they are THIS wave's "
                "intended payload, or re-run with --allow-dirty if this is "
                "deliberate")
            print("[ABORTED] reason: deployed-files-dirty", flush=True)
            return 1

    use_alias = ssh_has_alias(SSH_ALIAS)
    host_label = target["host"]
    log(f"[plan] target={target_key} host={host_label} theme={deploy_theme} "
        f"blocks={deploy_blocks} ssh-alias={'yes' if use_alias else 'no'} "
        f"dry-run={'yes' if args.dry_run else 'no'}")

    # Pre-deploy content-compat gate: the target's stored post_content vs the
    # schemas in THIS tree. Runs before the build — no point compiling code that
    # would strand stored content (an InnerBlocks render that no longer reads an
    # old scalar shape).
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

    # Pre-deploy heavyweight gate tier. Runs before tar so an abort costs
    # nothing. See step_gate_full()'s docstring for why omitting it would
    # silently disable four gates.
    if args.skip_gate_full:
        log("[gate:full] SKIPPED (--skip-gate-full) — four gates did NOT run")
    else:
        rc = step_gate_full(args.dry_run)
        if rc != 0:
            print(f"[ABORTED] reason: gate-full-failed (exit {rc}). Nothing was "
                  "uploaded.", flush=True)
            return 1

    # [2/5] Tar
    # Pre-deploy ownership gate: would this deploy clobber work that is live and
    # NOT in this checkout? Runs BEFORE tar/scp so an abort costs nothing.
    rc = step_deploy_ownership(use_alias, target_key, args.takeover, args.dry_run)
    if rc != 0:
        print("[ABORTED] reason: deploy-ownership (the live target carries work this "
              "HEAD does not have). Nothing was uploaded.", flush=True)
        return 1

    # Would replacing the live theme.json discard a snapshot someone deliberately pushed?
    if deploy_theme and not args.dry_run:
        rc = step_theme_json_guard(use_alias, target, theme_json_payload, theme_json_label,
                                   args.takeover)
        if rc != 0:
            print("[ABORTED] reason: theme-json-guard (the live theme.json is an uncommitted "
                  "pushed snapshot, or could not be read). Nothing was uploaded.", flush=True)
            return 1

    rc = step_tar(args.dry_run, theme=deploy_theme, blocks=deploy_blocks,
                  theme_json_payload=theme_json_payload)
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
                              theme=deploy_theme, blocks=deploy_blocks,
                              theme_json_payload=theme_json_payload is not None)
    if rc != 0:
        print(f"[ABORTED] reason: remote-extract-failed (exit {rc})", flush=True)
        return 1

    # [5/5] Local cleanup
    write_deploy_marker(use_alias, target_key, args.dry_run)

    rc = step_local_cleanup(args.dry_run)
    if rc != 0:
        print(f"[ABORTED] reason: local-cleanup-failed (exit {rc})", flush=True)
        return 1

    # Cache purge — BEFORE verify, so the smoke test measures what a visitor gets
    # rather than what a cache-busting query string gets. Never aborts: see the
    # step's docstring.
    if args.skip_purge:
        log("[purge] SKIPPED (--skip-purge) — a warm cache may serve the OLD version")
    else:
        step_purge_caches(args.dry_run, use_alias, target["wp_content"],
                          target["host"])

    # Post-deploy, fail closed, NOT skippable by --skip-verify: did the client's theme.json
    # survive? A deploy that silently reverts it is exactly what this guards.
    if deploy_theme and not args.dry_run:
        rc = step_verify_theme_json(use_alias, target["wp_content"], theme_json_payload,
                                    theme_json_label)
        if rc != 0:
            print("[DEPLOYED-BUT-THEME-SETTINGS-LOST] the deploy completed but the live "
                  "theme.json is not this target's theme.json. Re-apply the client snapshot "
                  "with push-theme-snapshot.py.", flush=True)
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

    # Post-deploy CHANGE-SPECIFIC gate: is the live plugin what we just shipped?
    # Runs after the smoke test so a broken SITE is reported before a stale PAYLOAD.
    if deploy_blocks and not args.skip_verify and not args.dry_run:
        rc = step_verify_payload(use_alias, target["wp_content"], deploy_blocks)
        if rc != 0:
            print("[DEPLOYED-BUT-STALE] the deploy completed and the site responds, "
                  "but the LIVE plugin does not match this run's payload. Your code "
                  "is probably NOT what is running (D576).", flush=True)
            return 1

    # Post-deploy LIVE motion gate: do the shipped scroll effects still work?
    # Runs after the payload gate so a STALE payload is reported before motion is blamed.
    if deploy_blocks and not args.skip_motion_qa and not args.dry_run:
        rc = step_motion_qa(args.dry_run)
        if rc != 0:
            print("[DEPLOYED-BUT-MOTION-REGRESSED] the deploy completed, the site "
                  "responds and the payload matches, but a live motion probe failed. "
                  "Read the probe output: it distinguishes a real regression from a "
                  "rotted canary fixture, and re-running the deploy fixes neither.",
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
