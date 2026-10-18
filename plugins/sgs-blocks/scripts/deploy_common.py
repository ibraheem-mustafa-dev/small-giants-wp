#!/usr/bin/env python3
"""deploy_common.py - Shared settings and helpers for build-deploy.py: the deploy targets, paths, run ID,
tarball and dirty-gate rules, logging, command running, SSH and composer helpers.
Imported by every deploy module and by scripts that need TARGETS or the SSH helpers.
"""
from __future__ import annotations

import os
import shlex
import shutil
import subprocess
import sys
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
# Adding a target is one dict entry, per FP-9 above.
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
    # Dedicated Mama's Munches redesign test site: a fresh WordPress for the redesign draft
    # (sites/mamas-munches-redesign/), independent of sandybrown, which keeps the live catalogue.
    # Credentials: .claude/secrets/mamas-test.env (gitignored).
    "mamas-test": {
        "host": "lightsalmon-tarsier-683012.hostingersite.com",
        "wp_content": "domains/lightsalmon-tarsier-683012.hostingersite.com/public_html/wp-content",
        "explicit_opt_in_required": True,
        "client": "mamas-munches-redesign",
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
    # The npm lockfile and the plugin's reports/ folder (design notes and audit
    # output) are read by nothing on the server; only PHP comments name reports/.
    "plugins/sgs-blocks/package-lock.json",
    "plugins/sgs-blocks/reports",
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
