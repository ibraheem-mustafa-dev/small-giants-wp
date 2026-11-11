#!/usr/bin/env python3
"""deploy_delta.py - what a deploy ships, what the live site already holds, and a package of only the difference.

- ``collect_payload`` reads every file a deploy ships into memory with its sha256: ``theme/sgs-theme`` and
  ``plugins/sgs-blocks`` under ``TAR_EXCLUDES``, symlinks followed (the isolated worktree links ``vendor/`` from the
  shared checkout; Windows ``tar`` stored that link as a link, so three sites ended up with a ``vendor`` pointing at a
  Windows path), empty folders left out, and the target's client ``theme.json`` in place of the framework one.
- ``live_listing_cmd`` / ``parse_live_listing`` read the type, mode and sha256 of every file the target holds, in one
  SSH call, ending with a file count so a cut-off answer is never read as a smaller tree.
- ``plan_delta`` decides ``nothing`` (the site already holds the payload), ``delta`` (send the changed and new files
  plus a delete list) or ``full`` (no usable listing, a symlink or special file on the site, ``--full-upload``, or a
  difference above half the payload).
- ``write_package`` writes one gzipped tar: the files to send plus ``.sgs-delta/`` (delete list, expected sha256 of
  every file, expected shape of the whole tree).
- ``build_remote_apply_cmd`` builds the new tree in a per-run staging folder (a copy of the live folders for a delta),
  applies the delete list, normalises modes to 644/755, checks every file's sha256 and the whole tree's shape against
  the payload, and only then swaps it in with the ``.bak`` rotation. A failed check stops before the swap, so the live
  site never serves a half-applied tree.

The live tree itself is the manifest: hashing it takes under a second on the host (2,107 files, 0.19 s measured
2026-11-11), and a manifest file kept on the server could go stale when someone restores a ``.bak`` by hand.

Self-test: ``python plugins/sgs-blocks/scripts/deploy_delta.py --self-test`` (also run by ``build-deploy.py --self-test``).
"""
from __future__ import annotations

import contextlib
import fnmatch
import gzip
import hashlib
import io
import os
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

from deploy_common import TAR_EXCLUDES

# (folder in the repo, folder under wp-content on the site). Blocks first: the rotation order the deploy always had.
ROOTS = {
    "blocks": ("plugins/sgs-blocks", "plugins/sgs-blocks"),
    "theme": ("theme/sgs-theme", "themes/sgs-theme"),
}
THEME_JSON = "themes/sgs-theme/theme.json"
FILE_MODE = "644"
DIR_MODE = "755"
META = ".sgs-delta"
# Above this share of the payload's bytes, one full package is simpler than a delta and costs little more to send.
DELTA_MAX_SHARE = 0.5
# A stray `nul` (a shell redirect meant for /dev/null) cannot be read on Windows and is never part of the plugin;
# tar used to ship it. Every Windows device name is skipped the same way.
WINDOWS_DEVICE = re.compile(r"(?i)(?:con|prn|aux|nul|com\d|lpt\d)(?:\..*)?")


class PayloadError(RuntimeError):
    """The payload cannot be collected (a missing root, a broken link, a symlink loop)."""


@dataclass(frozen=True)
class Entry:
    data: bytes
    sha256: str
    mtime: int


@dataclass
class Live:
    files: dict[str, str]                        # path -> sha256
    nodes: dict[str, tuple[str, str]]            # path -> (find %y type, find %m mode), files and folders
    other: list[str] = field(default_factory=list)  # symlinks and special files


@dataclass
class Plan:
    mode: str                                    # "nothing" | "delta" | "full"
    send: list[str]
    delete: list[str]
    reason: str
    send_bytes: int = 0
    payload_bytes: int = 0


def roots_for(theme: bool, blocks: bool) -> list[tuple[str, str]]:
    return [ROOTS[k] for k, on in (("blocks", blocks), ("theme", theme)) if on]


# ---------------------------------------------------------------------------
# What ships
# ---------------------------------------------------------------------------
def compile_excludes(patterns: list[str]) -> re.Pattern[str]:
    return re.compile("|".join(f"(?:{fnmatch.translate(p)})" for p in patterns))


def excluded(rel: str, rx: re.Pattern[str]) -> bool:
    """True when a pattern matches a run of whole path components, as tar's --exclude does.

    libarchive matches exclusions unanchored at both ends but only at component boundaries, so ``node_modules``
    excludes every folder of that name, and ``plugins/sgs-blocks/src`` excludes that folder and everything under it
    but not ``plugins/sgs-blocks/stackable/src``.
    """
    parts = rel.split("/")
    for i in range(len(parts)):
        for j in range(i + 1, len(parts) + 1):
            if rx.fullmatch("/".join(parts[i:j])):
                return True
    return False


# The one place a link may point outside the checkout: vendor/, which the isolated worktree builds from the shared
# checkout (deploy_ship.vendor_shell links each package folder; older worktrees linked vendor/ itself).
OUTSIDE_LINKS_ALLOWED = ("plugins/sgs-blocks/vendor",)


def allowed_outside(repo_root: Path, shared_root: str | None = None) -> list[str]:
    """Real paths a payload link may resolve into outside the checkout: vendor/ and each linked folder inside it.

    When the isolated deploy names the shared checkout (SGS_DEPLOY_SHARED_ROOT), a linked folder counts only if it
    resolves inside that checkout's own vendor/, so a stray link in vendor/ to anywhere else is refused, not shipped."""
    shared_root = os.environ.get("SGS_DEPLOY_SHARED_ROOT") if shared_root is None else shared_root
    out: list[str] = []
    for rel in OUTSIDE_LINKS_ALLOWED:
        path = repo_root / rel
        if not path.exists():
            continue
        out.append(os.path.realpath(path))
        source = os.path.realpath(Path(shared_root) / rel) if shared_root else None
        if path.is_dir():
            for child in path.iterdir():
                if child.is_symlink():
                    real = os.path.realpath(child)
                    if source is None or _within(real, source):
                        out.append(real)
    return out


def _within(path: str, root: str) -> bool:
    return path == root or path.startswith(root.rstrip(os.sep) + os.sep)


def collect_payload(repo_root: Path, theme: bool, blocks: bool, theme_json_payload: bytes | None = None,
                    excludes: list[str] | None = None) -> dict[str, Entry]:
    """Every file the deploy ships, keyed by its path under wp-content. Raises PayloadError.

    A theme payload needs the target's theme.json bytes (deploy_guards.resolve_theme_json_payload): without them the
    framework theme.json would ship and a client site would lose its fonts and palette (the PROVEN CAUSE note in
    deploy_common.py), so None is refused here rather than trusted to the caller.
    """
    if theme and theme_json_payload is None:
        raise PayloadError("a theme payload needs the target's theme.json; refusing to ship the framework one")
    rx = compile_excludes(TAR_EXCLUDES if excludes is None else excludes)
    repo_real = os.path.realpath(repo_root)
    allowed = allowed_outside(repo_root)
    out: dict[str, Entry] = {}
    for local_rel, server_rel in roots_for(theme, blocks):
        base = repo_root / local_rel
        if not base.is_dir():
            raise PayloadError(f"{local_rel} is missing in {repo_root}")
        real_of: dict[str, str] = {}
        for dirpath, dirnames, filenames in os.walk(base, followlinks=True):
            real = os.path.realpath(dirpath)
            # A loop is a folder that resolves to one of its own ancestors; two links to one folder are not.
            for parent in Path(dirpath).parents:
                if real_of.get(str(parent)) == real:
                    raise PayloadError(f"symlink loop at {dirpath}")
                if str(parent) == str(base.parent):
                    break
            real_of[dirpath] = real
            rel_dir = Path(dirpath).relative_to(repo_root).as_posix()
            if not _within(real, repo_real) and not any(_within(real, a) for a in allowed):
                raise PayloadError(f"{rel_dir} links outside the checkout ({real}); only "
                                   f"{', '.join(OUTSIDE_LINKS_ALLOWED)} may")
            dirnames[:] = sorted(d for d in dirnames if not excluded(f"{rel_dir}/{d}", rx))
            for name in sorted(filenames):
                rel = f"{rel_dir}/{name}"
                if excluded(rel, rx) or WINDOWS_DEVICE.fullmatch(name):
                    continue
                src = Path(dirpath) / name
                if not src.is_file():
                    raise PayloadError(f"{rel} is not a readable file (a broken link?)")
                src_real = os.path.realpath(src)
                if not _within(src_real, repo_real) and not any(_within(src_real, a) for a in allowed):
                    raise PayloadError(f"{rel} links outside the checkout ({src_real})")
                data = src.read_bytes()
                out[server_rel + rel[len(local_rel):]] = Entry(data, hashlib.sha256(data).hexdigest(),
                                                              int(src.stat().st_mtime))
    if theme:
        out[THEME_JSON] = Entry(theme_json_payload, hashlib.sha256(theme_json_payload).hexdigest(), int(time.time()))
    return dict(sorted(out.items()))


def dev_vendor_namespaces(excludes: list[str] | None = None) -> list[str]:
    """The dev-only Composer namespaces TAR_EXCLUDES leaves out of vendor/ (bin/ is not a namespace)."""
    prefix = "plugins/sgs-blocks/vendor/"
    return [e[len(prefix):] for e in (TAR_EXCLUDES if excludes is None else excludes)
            if e.startswith(prefix) and e[len(prefix):] not in ("bin",)]


def dev_autoload_leaks(payload: dict[str, Entry], namespaces: list[str] | None = None) -> list[str]:
    """Shipped Composer autoload files (vendor/composer/autoload_*.php) that still name a dev-only package.

    Those packages are excluded, so a dev-included autoload_files.php that requires them fatals every page (D849).
    The no-dev regeneration in deploy_ship.step_collect exists to prevent it; this proves it happened. Only the
    autoload_*.php files count: installed.php lists every installed package, dev ones included, whatever the mode,
    and is read only by Composer's InstalledVersions class, never required on a request."""
    names = dev_vendor_namespaces() if namespaces is None else namespaces
    needles = [f"/{ns}/".encode() for ns in names]
    return sorted(p for p, e in payload.items()
                  if p.startswith("plugins/sgs-blocks/vendor/composer/autoload_") and p.endswith(".php")
                  and any(n in e.data for n in needles))


def payload_bytes(payload: dict[str, Entry]) -> int:
    return sum(len(e.data) for e in payload.values())


def largest_folders(payload: dict[str, Entry], limit: int = 8) -> list[tuple[str, int]]:
    tops: dict[str, int] = {}
    for path, e in payload.items():
        key = "/".join(path.split("/")[:3])
        tops[key] = tops.get(key, 0) + len(e.data)
    return sorted(tops.items(), key=lambda kv: -kv[1])[:limit]


# ---------------------------------------------------------------------------
# What the site holds
# ---------------------------------------------------------------------------
def wp_expr(wp_content: str) -> str:
    """$WP as an absolute path: the targets' wp_content is relative to the SSH home."""
    return shlex.quote(wp_content) if wp_content.startswith("/") else f'"$PWD"/{shlex.quote(wp_content)}'


def live_listing_cmd(wp_content: str, roots: list[tuple[str, str]]) -> str:
    """One remote command printing (gzipped) every node's type, mode and path, then every file's sha256, then END <n>."""
    r = " ".join(shlex.quote(server) for _, server in roots)
    return (f"cd {shlex.quote(wp_content)} && {{ find {r} -printf '%y %m %p\\n' && echo -- && "
            f"find {r} -type f -print0 | xargs -0 -r sha256sum && echo \"END $(find {r} -type f | wc -l)\"; }} | gzip -c")


def parse_live_listing(raw: bytes, roots: list[tuple[str, str]]) -> tuple[Live | None, str]:
    """(listing, "") or (None, why it cannot be used). Anything unexpected is unusable, never an empty tree."""
    try:
        text = gzip.decompress(raw).decode("utf-8")
    except (OSError, EOFError, UnicodeDecodeError) as exc:
        return None, f"the listing is not readable ({type(exc).__name__})"
    lines = text.split("\n")
    while lines and lines[-1] == "":
        lines.pop()
    if not lines or not re.fullmatch(r"END \d+", lines[-1]):
        return None, "the listing has no END line (cut off)"
    count = int(lines[-1].split()[1])
    if "--" not in lines:
        return None, "the listing has no separator"
    sep = lines.index("--")
    prefixes = tuple(server for _, server in roots)
    nodes: dict[str, tuple[str, str]] = {}
    other: list[str] = []
    for line in lines[:sep]:
        m = re.fullmatch(r"([a-zA-Z]) ([0-7]{3,4}) (.+)", line)
        if not m:
            return None, f"unreadable node line: {line[:80]!r}"
        kind, mode, path = m.groups()
        if not (path in prefixes or path.startswith(tuple(p + "/" for p in prefixes))):
            return None, f"a node outside the deployed folders: {path[:80]!r}"
        if kind not in ("f", "d"):
            other.append(path)
        nodes[path] = (kind, mode)
    files: dict[str, str] = {}
    for line in lines[sep + 1:-1]:
        m = re.fullmatch(r"([0-9a-f]{64}) [ *](.+)", line)  # "*" marks binary mode (Git Bash)
        if not m:
            return None, f"unreadable checksum line: {line[:80]!r}"
        files[m.group(2)] = m.group(1)
    listed_files = {p for p, (k, _) in nodes.items() if k == "f"}
    if len(files) != count or set(files) != listed_files:
        return None, f"the listing is inconsistent ({len(files)} checksums, {len(listed_files)} files, END {count})"
    for _, server in roots:
        if nodes.get(server, ("", ""))[0] != "d":
            return None, f"{server} is not a folder on the site"
    return Live(files, nodes, other), ""


LISTING_ATTEMPTS = 3
LISTING_TIMEOUT_S = 60


def fetch_live_listing(use_alias: bool, wp_content: str, roots: list[tuple[str, str]], ssh_base: list[str],
                       timeout: int = LISTING_TIMEOUT_S, attempts: int = LISTING_ATTEMPTS,
                       runner=subprocess.run) -> tuple[Live | None, str]:
    """The live listing, asked up to `attempts` times. The host's link stalls at random: a listing that normally takes
    about a second hung for 180s on 2026-11-11 and made a good deploy read as stale, and a stall can as easily cut the
    gzip stream short. Every failure is asked again, an unparseable listing included; the listing is read-only, so a
    repeat costs only time."""
    why = "not asked"
    for _ in range(max(1, attempts)):
        try:
            done = runner(ssh_base + [live_listing_cmd(wp_content, roots)], capture_output=True, timeout=timeout,
                          check=False)
        except (subprocess.SubprocessError, OSError) as exc:
            why = f"ssh failed ({type(exc).__name__})"
            continue
        if done.returncode != 0:
            why = f"ssh exit {done.returncode}"
            continue
        live, why = parse_live_listing(done.stdout, roots)
        if live is not None:
            return live, why
    return None, f"{why}, {max(1, attempts)} attempt(s)"


# ---------------------------------------------------------------------------
# The difference
# ---------------------------------------------------------------------------
def expected_tree(paths: list[str], roots: list[tuple[str, str]]) -> list[str]:
    """Sorted `type mode path` lines for the finished tree, as `find -printf '%y %m %p'` prints them."""
    dirs = {server for _, server in roots}
    for p in paths:
        parts = p.split("/")
        for i in range(2, len(parts)):
            dirs.add("/".join(parts[:i]))
    lines = [f"d {DIR_MODE} {d}" for d in dirs] + [f"f {FILE_MODE} {p}" for p in paths]
    return sorted(lines)


def safe_rel(path: str, roots: list[tuple[str, str]]) -> bool:
    parts = path.split("/")
    return (not path.startswith("/") and ".." not in parts and "" not in parts
            and any(path.startswith(server + "/") for _, server in roots))


def plan_delta(payload: dict[str, Entry], live: Live | None, why: str, roots: list[tuple[str, str]],
               force_full: bool = False) -> Plan:
    total = payload_bytes(payload)

    def full(reason: str) -> Plan:
        return Plan("full", list(payload), [], reason, total, total)

    if force_full:
        return full("--full-upload")
    if live is None:
        return full(f"no usable live listing: {why}")
    if live.other:
        return full(f"the site holds {len(live.other)} symlink(s) or special file(s), e.g. {live.other[0]}")
    send = [p for p, e in payload.items() if live.files.get(p) != e.sha256]
    delete = sorted(set(live.files) - set(payload))
    unsafe = [p for p in delete if not safe_rel(p, roots)]
    if unsafe:
        return full(f"a live path cannot be deleted safely: {unsafe[0]!r}")
    want = {line.split(" ", 2)[2]: tuple(line.split(" ", 2)[:2]) for line in expected_tree(list(payload), roots)}
    shape_differs = want != live.nodes
    send_bytes = sum(len(payload[p].data) for p in send)
    if not send and not delete and not shape_differs:
        return Plan("nothing", [], [], "the site already holds this payload", 0, total)
    if send_bytes > total * DELTA_MAX_SHARE:
        return full(f"the difference is {send_bytes} of {total} bytes")
    reason = f"{len(send)} file(s) to send, {len(delete)} to delete" + ("; folder shape or modes differ" if shape_differs else "")
    return Plan("delta", send, delete, reason, send_bytes, total)


def _add(tar: tarfile.TarFile, name: str, data: bytes, mtime: int) -> None:
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = 0o644
    info.mtime = mtime
    info.uname = info.gname = ""
    tar.addfile(info, io.BytesIO(data))


def write_package(dest: Path, payload: dict[str, Entry], plan: Plan, roots: list[tuple[str, str]]) -> int:
    """Write the package for `plan` to `dest`; returns its size in bytes. Each file is re-hashed as it is written.

    Every sent file is stamped with the time of writing: asset URLs carry filemtime() as ?ver=
    (includes/asset-cache-busting.php), and a build restored from the deploy cache can be older than the live file,
    which would keep serving the old ?ver= to browsers and the CDN. Unchanged files keep their mtime through cp -a.
    """
    now = int(time.time())
    with tarfile.open(dest, "w:gz", compresslevel=6, format=tarfile.PAX_FORMAT) as tar:
        for path in plan.send:
            e = payload[path]
            if hashlib.sha256(e.data).hexdigest() != e.sha256:
                raise PayloadError(f"{path} changed in memory after it was hashed")
            _add(tar, path, e.data, now)
        _add(tar, f"{META}/delete.list", b"".join(p.encode() + b"\0" for p in plan.delete), now)
        _add(tar, f"{META}/expected.sha256",
             "".join(f"{e.sha256}  {p}\n" for p, e in payload.items()).encode(), now)
        _add(tar, f"{META}/expected.tree", ("\n".join(expected_tree(list(payload), roots)) + "\n").encode(), now)
    return dest.stat().st_size


# ---------------------------------------------------------------------------
# The remote step
# ---------------------------------------------------------------------------
# Exit codes of the remote apply. Only APPLY_STAGE_FAILED means "nothing was swapped", so only it allows the full
# package to be sent next (deploy_ship.step_ship); anything else (a swap that failed and was undone, a dropped
# connection, a timeout) stops the deploy, because a second apply would replace the .bak, the only rollback copy.
APPLY_STAGE_FAILED = 10
APPLY_SWAP_FAILED = 20
APPLY_AFTER_SWAP_FAILED = 30
# Leftover staging folders and packages of interrupted runs are swept once they are this old.
STALE_MINUTES = 180


def bak_path(server: str) -> str:
    """The single rollback copy: plugins/sgs-blocks.bak, and themes/.sgs-theme.bak (dot-prefixed so WordPress's theme
    scanner skips it). Recovery is one `mv` back (deploy_common.ROLLBACK_HINT)."""
    parent, name = server.split("/")
    return f'"$WP"/{parent}/{name}.bak' if parent == "plugins" else f'"$WP"/{parent}/.{name}.bak'


def stage_steps(roots: list[tuple[str, str]], mode: str, package: str) -> list[str]:
    """Build and check the new tree inside the staging folder (the current directory). Nothing here touches $WP.

    A delta starts from a copy of the live folders and applies the delete list BEFORE extracting, so a path that
    changes between file and folder is cleared first."""
    r = " ".join(server for _, server in roots)
    steps: list[str] = []
    if mode == "delta":
        for _, server in roots:
            steps += [f"mkdir -p {server.split('/')[0]}", f'cp -a "$WP"/{server} {server}']
        steps += [
            f"tar -xzf ../{package} {META}",
            f"xargs -0 -r rm -f -- < {META}/delete.list",
            f"find {r} -mindepth 1 -type d -empty -delete",
        ]
    steps += [
        f"tar -xzf ../{package}",
        # Five digits: GNU chmod keeps a folder's setgid bit under plain 755, and the tree check would never pass.
        f"find {r} -type d -exec chmod 00{DIR_MODE} {{}} +",
        f"find {r} -type f -exec chmod 0{FILE_MODE} {{}} +",
        f"sha256sum -c --quiet --strict {META}/expected.sha256",
        f"find {r} -printf '%y %m %p\\n' | LC_ALL=C sort > {META}/actual.tree",
        (f"{{ cmp -s {META}/actual.tree {META}/expected.tree || {{ echo '[apply] the staged tree is not the payload:'; "
         f"diff {META}/actual.tree {META}/expected.tree | head -20; false; }}; }}"),
    ]
    return steps


def build_remote_apply_cmd(wp_content: str, roots: list[tuple[str, str]], mode: str, package: str,
                           staging: str, steps: list[str] | None = None) -> str:
    """The remote command that stages, checks and swaps in the package. Pure, so the self-test runs it verbatim.

    Hangups are ignored, so a dropped SSH connection cannot stop it between the two moves of a swap. Each root is
    swapped (live -> .bak, staged -> live); if a move fails, that root and every root already swapped are put back
    and it exits APPLY_SWAP_FAILED. One line, POSIX shell only.
    """
    if mode not in ("delta", "full"):
        raise ValueError(mode)
    steps = stage_steps(roots, mode, package) if steps is None else steps
    parts = [
        "trap '' HUP PIPE INT TERM",
        'H="$PWD"',
        f"WP={wp_expr(wp_content)}",
        f'finish() {{ cd "$H" && chmod -R u+rwX {staging} 2>/dev/null; rm -rf {staging} {package}; exit "$1"; }}',
        f"find . -maxdepth 1 -name 'sgs-deploy-*' -mmin +{STALE_MINUTES} -exec rm -rf {{}} + 2>/dev/null",
        f"{{ rm -rf {staging} && mkdir {staging} && cd {staging}; }} || finish {APPLY_STAGE_FAILED}",
        "{ " + " && ".join(steps) + f"; }} || finish {APPLY_STAGE_FAILED}",
        "echo '[apply] the staged tree matches the payload; swapping it in' || true",
        # swap STAGED LIVE BAK: on a failed move the live folder is put back from BAK.
        'swap() { rm -rf "$3" && { [ ! -e "$2" ] || mv "$2" "$3"; } && mkdir -p "${2%/*}" && '
        '{ mv "$1" "$2" || { [ ! -e "$3" ] || mv "$3" "$2"; false; }; }; }',
        # unswap LIVE BAK PARKING: undo a finished swap; the new tree is parked inside the staging folder.
        'unswap() { mv "$1" "$3" && mv "$2" "$1"; }',
    ]
    done: list[tuple[str, str]] = []
    for i, (_, server) in enumerate(roots):
        live, bak = f'"$WP"/{server}', bak_path(server)
        undo = "".join(f"unswap {l} {b} undone-{j}; " for j, (l, b) in reversed(list(enumerate(done))))
        parts.append(f"swap {server} {live} {bak} || {{ {undo}finish {APPLY_SWAP_FAILED}; }}")
        done.append((live, bak))
    if any(server == "plugins/sgs-blocks" for _, server in roots):
        # The epoch of sgs_css_check_deploy() (class-sgs-css-registry.php) is SGS_BLOCKS_VERSION + this file's mtime;
        # cp -a keeps the old mtime, so touch it, and drop the lifted CSS so it regenerates.
        parts.append('{ touch "$WP"/plugins/sgs-blocks/sgs-blocks.php && rm -f "$WP"/uploads/sgs-css/sgs-*.css; } '
                     f"|| finish {APPLY_AFTER_SWAP_FAILED}")
    parts.append("finish 0")
    return "; ".join(parts)


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------
def self_test() -> list[str]:
    """Every check runs the real function and a planted faulty one; the planted fault must be caught.

    The remote commands run in bash against a temporary "server" folder, the way the theme.json cases do.
    """
    failures: list[str] = []
    bash = shutil.which("bash")
    if not bash:
        return ["deploy_delta self-test needs bash on PATH (Git Bash on Windows)"]
    roots = roots_for(theme=True, blocks=True)
    WPC = "wp-content"

    def sh(cmd: str, cwd: Path) -> subprocess.CompletedProcess:
        return subprocess.run([bash, "-c", cmd], cwd=cwd, capture_output=True)

    def tree_bytes(base: Path) -> dict[str, bytes]:
        return {p.relative_to(base).as_posix(): p.read_bytes() for p in sorted(base.rglob("*")) if p.is_file()}

    with tempfile.TemporaryDirectory(prefix="sgs-delta-selftest-") as td:
        base = Path(td)
        repo = base / "repo"
        blocks_dir = repo / "plugins" / "sgs-blocks"
        (blocks_dir / "build" / "blocks" / "card").mkdir(parents=True)
        (blocks_dir / "includes").mkdir(parents=True)
        (blocks_dir / "src").mkdir()
        (blocks_dir / "stackable" / "src").mkdir(parents=True)
        (blocks_dir / "scripts").mkdir()
        (blocks_dir / "build" / "cache" / "node_modules").mkdir(parents=True)
        (repo / "theme" / "sgs-theme" / "styles").mkdir(parents=True)
        (repo / "theme" / "sgs-theme" / "assets").mkdir()
        files = {
            "plugins/sgs-blocks/sgs-blocks.php": b"<?php // plugin\n",
            "plugins/sgs-blocks/build/blocks/card/style-index.css": b".sgs-card{color:red}\n",
            "plugins/sgs-blocks/build/blocks/card/block.json": b'{"name":"sgs/card"}\n',
            "plugins/sgs-blocks/includes/a.php": b"<?php // a\n",
            "plugins/sgs-blocks/includes/old.php": b"<?php // removed in the next build\n",
            "plugins/sgs-blocks/src/index.js": b"// excluded: anchored path\n",
            "plugins/sgs-blocks/stackable/src/x.js": b"// excluded: the stackable folder\n",
            "plugins/sgs-blocks/scripts/tool.py": b"# excluded\n",
            "plugins/sgs-blocks/build/cache/node_modules/m.js": b"// excluded: a node_modules at any depth\n",
            "plugins/sgs-blocks/includes/x.pyc": b"excluded by suffix",
            "theme/sgs-theme/theme.json": b'{"framework":true}\n',
            "theme/sgs-theme/style.css": b"/* Theme Name: SGS */\n",
            "theme/sgs-theme/styles/client.json": b"{}\n",
            "theme/sgs-theme/assets/site.css": b"body{margin:0}\n",
        }
        for rel, data in files.items():
            (repo / rel).write_bytes(data)
        # A linked folder, as the isolated worktree links vendor/ from the shared checkout.
        shared_vendor = base / "shared-vendor"
        (shared_vendor / "spatie").mkdir(parents=True)
        (shared_vendor / "autoload.php").write_bytes(b"<?php // autoload\n")
        (shared_vendor / "spatie" / "Hex.php").write_bytes(b"<?php // Hex\n")
        linked = True
        try:
            os.symlink(shared_vendor, blocks_dir / "vendor", target_is_directory=True)
        except OSError:
            linked = False
            shutil.copytree(shared_vendor, blocks_dir / "vendor")
        CLIENT = b'{"client":"acme"}\n'

        def collect(theme_json: bytes | None = CLIENT) -> dict[str, Entry]:
            return collect_payload(repo, theme=True, blocks=True, theme_json_payload=theme_json)

        # --- collection -----------------------------------------------------------------------------------
        payload = collect()
        must_have = {"plugins/sgs-blocks/sgs-blocks.php", "plugins/sgs-blocks/build/blocks/card/style-index.css",
                     "plugins/sgs-blocks/vendor/autoload.php", "plugins/sgs-blocks/vendor/spatie/Hex.php",
                     "themes/sgs-theme/theme.json", "themes/sgs-theme/assets/site.css"}
        must_not = {"plugins/sgs-blocks/src/index.js", "plugins/sgs-blocks/stackable/src/x.js",
                    "plugins/sgs-blocks/scripts/tool.py", "plugins/sgs-blocks/build/cache/node_modules/m.js",
                    "plugins/sgs-blocks/includes/x.pyc", "themes/sgs-theme/styles/client.json"}
        if not must_have <= set(payload):
            failures.append(f"collect: missing {sorted(must_have - set(payload))}")
        if must_not & set(payload):
            failures.append(f"collect: shipped excluded files {sorted(must_not & set(payload))}")
        if payload.get(THEME_JSON) and payload[THEME_JSON].data != CLIENT:
            failures.append("collect: the client theme.json did not replace the framework one")
        try:
            collect(None)
            failures.append("collect: a theme payload without the target's theme.json was accepted (the framework one would ship)")
        except PayloadError:
            pass
        if not linked:
            failures.append("collect: symlinks cannot be created here (Windows Developer Mode is off), so the linked-vendor "
                            "check is vacuous; the isolated deploy needs symlinks too")
        # Two links to one folder are not a loop; a folder linking to its own ancestor is; a link out of the checkout
        # other than vendor/ is refused.
        extra = blocks_dir / "assets2"
        try:
            os.symlink(shared_vendor, extra, target_is_directory=True)
            try:
                collect_payload(repo, theme=False, blocks=True)
            except PayloadError as exc:
                failures.append(f"collect: a second link to the vendor folder was refused ({exc})")
            os.remove(extra) if extra.is_symlink() else os.rmdir(extra)
            os.symlink(blocks_dir / "includes", blocks_dir / "includes" / "loop", target_is_directory=True)
            try:
                collect_payload(repo, theme=False, blocks=True)
                failures.append("collect: a symlink loop was not refused")
            except PayloadError:
                pass
            os.remove(blocks_dir / "includes" / "loop") if (blocks_dir / "includes" / "loop").is_symlink() else os.rmdir(blocks_dir / "includes" / "loop")
            outside = base / "outside"
            outside.mkdir()
            (outside / "secret.txt").write_bytes(b"not part of the plugin\n")
            os.symlink(outside, blocks_dir / "linked-out", target_is_directory=True)
            try:
                collect_payload(repo, theme=False, blocks=True)
                failures.append("collect: a link out of the checkout (not vendor/) was shipped")
            except PayloadError:
                pass
            os.remove(blocks_dir / "linked-out") if (blocks_dir / "linked-out").is_symlink() else os.rmdir(blocks_dir / "linked-out")
            # vendor/ as the worktree builds it (a real folder, packages linked): links into the shared checkout's
            # vendor/ ship, a link elsewhere is refused once the deploy names the shared checkout.
            shell_repo = base / "shell-repo"
            (shell_repo / "plugins" / "sgs-blocks" / "vendor").mkdir(parents=True)
            (shell_repo / "plugins" / "sgs-blocks" / "sgs-blocks.php").write_bytes(b"<?php\n")
            shared = base / "shared-checkout"
            (shared / "plugins" / "sgs-blocks" / "vendor" / "spatie").mkdir(parents=True)
            (shared / "plugins" / "sgs-blocks" / "vendor" / "spatie" / "Hex.php").write_bytes(b"<?php // Hex\n")
            os.symlink(shared / "plugins" / "sgs-blocks" / "vendor" / "spatie",
                       shell_repo / "plugins" / "sgs-blocks" / "vendor" / "spatie", target_is_directory=True)
            os.environ["SGS_DEPLOY_SHARED_ROOT"] = str(shared)
            try:
                got = collect_payload(shell_repo, theme=False, blocks=True)
                if "plugins/sgs-blocks/vendor/spatie/Hex.php" not in got:
                    failures.append("collect: a vendor/ package linked from the shared checkout did not ship")
                os.symlink(outside, shell_repo / "plugins" / "sgs-blocks" / "vendor" / "stray", target_is_directory=True)
                try:
                    collect_payload(shell_repo, theme=False, blocks=True)
                    failures.append("collect: a vendor/ link outside the shared checkout's vendor/ was shipped")
                except PayloadError:
                    pass
            finally:
                os.environ.pop("SGS_DEPLOY_SHARED_ROOT", None)
        except OSError as exc:
            failures.append(f"collect: could not build the link cases ({exc})")
        # The dev autoload detector: a shipped autoload file naming a dev-only package is found (planted), a clean one
        # is not, and a detector that only checks the exit code of composer would find neither.
        leaky = {"plugins/sgs-blocks/vendor/composer/autoload_files.php":
                 Entry(b"<?php return [ $vendorDir . '/phpstan/phpstan/bootstrap.php' ];", "", 0)}
        clean = {"plugins/sgs-blocks/vendor/composer/autoload_files.php":
                 Entry(b"<?php return [ $vendorDir . '/symfony/polyfill-mbstring/bootstrap.php' ];", "", 0)}
        clean["plugins/sgs-blocks/vendor/composer/installed.php"] = Entry(
            b"<?php return ['phpstan/phpstan' => ['install_path' => __DIR__ . '/../phpstan/phpstan', 'dev_requirement' => true]];", "", 0)
        if dev_autoload_leaks(leaky) != ["plugins/sgs-blocks/vendor/composer/autoload_files.php"] or dev_autoload_leaks(clean):
            failures.append("dev_autoload_leaks: a dev-included autoloader was not found, or a clean one (with installed.php "
                            "listing dev packages, as Composer always writes it) was flagged")
        if "phpstan" not in dev_vendor_namespaces():
            failures.append("dev_vendor_namespaces: phpstan is not among the excluded dev namespaces")
        # Planted fault: tar's anchored-prefix rule read as "any component named src".
        if not excluded("plugins/sgs-blocks/src/index.js", compile_excludes(TAR_EXCLUDES)):
            failures.append("excluded(): an anchored path pattern did not exclude its folder")
        if excluded("plugins/sgs-blocks/stackable/srcx/a.js", compile_excludes(["plugins/sgs-blocks/stackable/src"])):
            failures.append("excluded(): a pattern matched part of a component")
        print(f"  [delta case] collect: excludes, client theme.json, linked vendor ({'symlink' if linked else 'copied: no symlink rights'}): "
              f"{'GREEN' if not failures else 'RED'}")

        # --- the live listing round trip --------------------------------------------------------------------
        def server_with(tree: dict[str, bytes], name: str) -> Path:
            srv = base / name
            for rel, data in tree.items():
                f = srv / WPC / rel
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_bytes(data)
            return srv

        def listing(srv: Path) -> tuple[Live | None, str]:
            done = sh(live_listing_cmd(WPC, roots), srv)
            return parse_live_listing(done.stdout, roots) if done.returncode == 0 else (None, f"exit {done.returncode}")

        def deploy(srv: Path, new_payload: dict[str, Entry], planner=plan_delta, cmd_builder=build_remote_apply_cmd,
                   tamper=None) -> tuple[Plan, int, dict[str, bytes]]:
            """Plan against the server's real listing, package, apply; return (plan, rc, live tree afterwards)."""
            live, why = listing(srv)
            plan = planner(new_payload, live, why, roots)
            rc = 0
            if plan.mode != "nothing":
                pkg = srv / "pkg.tgz"
                write_package(pkg, new_payload, plan, roots)
                if tamper:
                    tamper(pkg)
                rc = sh(cmd_builder(WPC, roots, plan.mode, "pkg.tgz", "stage"), srv).returncode
            return plan, rc, tree_bytes(srv / WPC)

        first = {p: e.data for p, e in payload.items()}
        srv = server_with(first, "srv-a")
        live, why = listing(srv)
        if live is None or set(live.files) != set(payload):
            failures.append(f"listing: the round trip did not read the server's files ({why})")

        def check_parse(parse) -> list[str]:
            good = sh(live_listing_cmd(WPC, roots), srv).stdout
            text = gzip.decompress(good).decode()
            cut = text[: text.rindex("END")]
            bad = {
                "missing": b"",
                "garbage": b"not gzip",
                "cut off": gzip.compress(cut.encode()),
                "symlink": gzip.compress(text.replace("--\n", "l 777 plugins/sgs-blocks/vendor\n--\n", 1).encode()),
            }
            out = []
            for label, raw in bad.items():
                lv, w = parse(raw, roots)
                p = plan_delta(payload, lv, w, roots)
                # The reason must be the listing itself: the size rule also gives "full" for an empty-looking site,
                # and that must not be what keeps a bad listing safe.
                if p.mode != "full" or not p.reason.startswith(("no usable live listing", "the site holds")):
                    out.append(f"a {label} listing planned {p.mode} ({p.reason})")
            return out

        def faulty_parse(raw, roots_):
            """Reads anything unreadable as an empty site."""
            lv, w = parse_live_listing(raw, roots_)
            return (lv, w) if lv else (Live({}, {r: ("d", "755") for _, r in roots_}), "")

        # --- the cases --------------------------------------------------------------------------------------
        def nothing_case(planner) -> list[str]:
            p, _, _ = deploy(server_with(first, f"srv-n-{os.urandom(3).hex()}"), payload, planner=planner)
            return [] if p.mode == "nothing" else [f"an unchanged payload planned {p.mode} with {len(p.send)} file(s)"]

        def always_all(pl, lv, w, rts, force_full=False):
            return Plan("full", list(pl), [], "planted", 0, 0)

        changed = dict(payload)
        css = "plugins/sgs-blocks/build/blocks/card/style-index.css"
        new_css = b".sgs-card{color:blu}\n"  # same length as before
        changed[css] = Entry(new_css, hashlib.sha256(new_css).hexdigest(), 0)

        def one_file_case(planner) -> list[str]:
            s = server_with(first, f"srv-o-{os.urandom(3).hex()}")
            p, rc, after = deploy(s, changed, planner=planner)
            problems = []
            if p.mode != "delta" or p.send != [css]:
                problems.append(f"a one-file change planned {p.mode} sending {p.send[:3]}")
            if rc != 0 or after.get(css) != new_css:
                problems.append(f"the changed file did not land (rc={rc})")
            return problems

        def size_only(pl, lv, w, rts, force_full=False):
            sizes = {pth: len(first.get(pth, b"")) for pth in lv.files} if lv else {}
            send = [pth for pth, e in pl.items() if sizes.get(pth) != len(e.data)]
            return Plan("delta" if send else "nothing", send, [], "planted", 0, 0)

        removed = {p: e for p, e in payload.items() if p != "plugins/sgs-blocks/includes/old.php"}

        def delete_case(cmd_builder) -> list[str]:
            s = server_with(first, f"srv-d-{os.urandom(3).hex()}")
            p, rc, after = deploy(s, removed, cmd_builder=cmd_builder)
            gone = "plugins/sgs-blocks/includes/old.php" not in after
            return [] if (p.delete == ["plugins/sgs-blocks/includes/old.php"] and rc == 0 and gone) else \
                [f"a deleted file is still on the server (rc={rc}, delete={p.delete}, gone={gone})"]

        def no_delete_list(wpc, rts, mode, pkg, stg):
            steps = [x for x in stage_steps(rts, mode, pkg) if not x.startswith("xargs")]
            return build_remote_apply_cmd(wpc, rts, mode, pkg, stg, steps=steps)

        def tamper_case(cmd_builder) -> list[str]:
            s = server_with(first, f"srv-t-{os.urandom(3).hex()}")
            before = tree_bytes(s / WPC)

            def corrupt(pkg: Path) -> None:
                with tarfile.open(pkg, "r:gz") as t:
                    members = [(m, t.extractfile(m).read()) for m in t.getmembers()]
                with tarfile.open(pkg, "w:gz") as t:
                    for m, data in members:
                        if m.name == css:
                            data = b".sgs-card{color:BAD}\n"
                        _add(t, m.name, data, int(m.mtime))

            # A live file edited between the listing and the apply is the same fault seen from the other side.
            p, rc, after = deploy(s, changed, cmd_builder=cmd_builder, tamper=corrupt)
            problems = []
            if rc == 0:
                problems.append("a tampered delta applied with exit 0")
            if after != before:
                problems.append("a tampered delta changed the live folders")
            return problems

        def no_checks(wpc, rts, mode, pkg, stg):
            steps = [x for x in stage_steps(rts, mode, pkg) if not x.startswith(("sha256sum", "{ cmp"))]
            return build_remote_apply_cmd(wpc, rts, mode, pkg, stg, steps=steps)

        def extract_before_delete(wpc, rts, mode, pkg, stg):
            """The first cut's order: the whole package extracted before the delete list ran."""
            steps = stage_steps(rts, mode, pkg)
            full = f"tar -xzf ../{pkg}"
            if full in steps and mode == "delta":
                steps.remove(full)
                steps.insert(next(i for i, x in enumerate(steps) if x.startswith("tar -xzf")), full)
            return build_remote_apply_cmd(wpc, rts, mode, pkg, stg, steps=steps)

        def type_change_case(cmd_builder) -> list[str]:
            # build/blocks/card becomes a file; includes/a.php becomes a folder.
            s_ = server_with(first, f"srv-y-{os.urandom(3).hex()}")
            new = {p_: e for p_, e in payload.items() if not p_.startswith("plugins/sgs-blocks/build/blocks/card/")
                   and p_ != "plugins/sgs-blocks/includes/a.php"}
            for path_, data_ in (("plugins/sgs-blocks/build/blocks/card", b"now a file\n"),
                                 ("plugins/sgs-blocks/includes/a.php/inner.php", b"<?php // now a folder\n")):
                new[path_] = Entry(data_, hashlib.sha256(data_).hexdigest(), 0)
            new = dict(sorted(new.items()))
            p_, rc, after = deploy(s_, new, cmd_builder=cmd_builder)
            live_now = {k: v for k, v in after.items() if k.startswith(("plugins/sgs-blocks/", "themes/sgs-theme/"))}
            want_now = {k: e.data for k, e in new.items()}
            return [] if (p_.mode == "delta" and rc == 0 and live_now == want_now) else \
                [f"a file-folder type change did not apply as one delta (mode={p_.mode}, rc={rc})"]

        def swap_undo_case(cmd_builder) -> list[str]:
            # The theme swap fails after the plugin swap (wp-content/themes is a file): both must be left as before.
            s_ = base / f"srv-u-{os.urandom(3).hex()}"
            (s_ / WPC / "plugins" / "sgs-blocks").mkdir(parents=True)
            (s_ / WPC / "plugins" / "sgs-blocks" / "old.php").write_bytes(b"<?php // live before\n")
            (s_ / WPC / "themes").write_bytes(b"not a folder")
            before = tree_bytes(s_ / WPC)
            plan_ = Plan("full", list(payload), [], "self-test", 0, 0)
            write_package(s_ / "pkg.tgz", payload, plan_, roots)
            rc = sh(cmd_builder(WPC, roots, "full", "pkg.tgz", "stage"), s_).returncode
            after = {k: v for k, v in tree_bytes(s_ / WPC).items() if ".bak/" not in k}
            return [] if (rc == APPLY_SWAP_FAILED and after == before) else \
                [f"a failed second swap left the site changed (rc={rc}, plugin restored={after == before})"]

        def no_undo(wpc, rts, mode, pkg, stg):
            return re.sub(r"unswap [^;]*; ", "", build_remote_apply_cmd(wpc, rts, mode, pkg, stg))

        def mtime_case(writer) -> list[str]:
            pkg = base / f"m-{os.urandom(3).hex()}.tgz"
            started = int(time.time())
            plan_ = Plan("delta", [css], [], "self-test", 0, 0)
            writer(pkg, {**payload, css: Entry(payload[css].data, payload[css].sha256, 1)}, plan_, roots)
            with tarfile.open(pkg, "r:gz") as t:
                m = t.getmember(css)
            return [] if m.mtime >= started else [f"a sent file kept its old mtime ({m.mtime}), so its ?ver= would not change"]

        def write_keeping_mtime(dest, pl, plan_, rts):
            with tarfile.open(dest, "w:gz") as tar:
                for path_ in plan_.send:
                    _add(tar, path_, pl[path_].data, pl[path_].mtime)

        def full_case(planner) -> list[str]:
            # The full path on a server that has never had the plugin: builds the tree from the package alone.
            s = base / f"srv-f-{os.urandom(3).hex()}"
            (s / WPC).mkdir(parents=True)
            plan = planner(payload, None, "no listing", roots)
            if plan.mode != "full":
                return [f"no listing planned {plan.mode}"]
            write_package(s / "pkg.tgz", payload, plan, roots)
            rc = sh(build_remote_apply_cmd(WPC, roots, "full", "pkg.tgz", "stage"), s).returncode
            after = tree_bytes(s / WPC)
            ok = rc == 0 and after == {p: e.data for p, e in payload.items()}
            return [] if ok else [f"a full deploy did not produce the payload (rc={rc})"]

        def wrong_theme_json(cmd_builder) -> list[str]:
            # Case 11's guarantee: a staging tree whose theme.json is not the payload's never goes live.
            s = server_with(first, f"srv-j-{os.urandom(3).hex()}")
            before = tree_bytes(s / WPC)

            def swap_theme_json(pkg: Path) -> None:
                with tarfile.open(pkg, "r:gz") as t:
                    members = [(m, t.extractfile(m).read()) for m in t.getmembers()]
                with tarfile.open(pkg, "w:gz") as t:
                    for m, data in members:
                        _add(t, m.name, files["theme/sgs-theme/theme.json"] if m.name == THEME_JSON else data, int(m.mtime))

            client2 = dict(payload)
            c2 = b'{"client":"acme","v":2}\n'
            client2[THEME_JSON] = Entry(c2, hashlib.sha256(c2).hexdigest(), 0)
            p, rc, after = deploy(s, client2, cmd_builder=cmd_builder, tamper=swap_theme_json)
            return [] if (rc != 0 and after == before) else [f"a framework theme.json in the package went live (rc={rc})"]

        def force_case(planner) -> list[str]:
            lv, w = listing(srv)
            p = planner(payload, lv, w, roots, force_full=True)
            return [] if p.mode == "full" else [f"--full-upload planned {p.mode}"]

        def ignores_force(pl, lv, w, rts, force_full=False):
            return plan_delta(pl, lv, w, rts)

        def stall_case(attempts: int) -> list[str]:
            # The first ssh call stalls (a timeout) or arrives cut short; the second answers: the listing must arrive.
            good = sh(live_listing_cmd(WPC, roots), srv).stdout
            problems = []
            for first in ("timeout", "cut off"):
                calls = {"n": 0}

                def runner(cmd, **kw):
                    calls["n"] += 1
                    if calls["n"] == 1 and first == "timeout":
                        raise subprocess.TimeoutExpired(cmd, kw.get("timeout", 0))
                    if calls["n"] == 1:
                        return subprocess.CompletedProcess(cmd, 0, good[: len(good) // 2], b"")
                    return subprocess.CompletedProcess(cmd, 0, good, b"")

                live_, why_ = fetch_live_listing(True, WPC, roots, ["ssh"], attempts=attempts, runner=runner)
                if live_ is None:
                    problems.append(f"one {first} ssh answer lost the listing ({why_})")
            return problems

        cases = [
            ("an unchanged payload uploads nothing", nothing_case(plan_delta), nothing_case(always_all)),
            ("one stalled or cut-off ssh answer does not lose the live listing", stall_case(LISTING_ATTEMPTS), stall_case(1)),
            ("one changed file of the same size sends only that file", one_file_case(plan_delta), one_file_case(size_only)),
            ("a deleted file is deleted on the server", delete_case(build_remote_apply_cmd), delete_case(no_delete_list)),
            ("a missing, garbled, cut-off or symlink-holding listing gives a full upload",
             check_parse(parse_live_listing), check_parse(faulty_parse)),
            ("a delta that applies wrongly fails before the swap and leaves the site untouched",
             tamper_case(build_remote_apply_cmd), tamper_case(no_checks)),
            ("a staged theme.json that is not the payload's never goes live",
             wrong_theme_json(build_remote_apply_cmd), wrong_theme_json(no_checks)),
            ("a full upload builds the whole tree on an empty site", full_case(plan_delta), full_case(lambda *a, **k: Plan("nothing", [], [], "", 0, 0))),
            ("--full-upload forces a full upload", force_case(plan_delta), force_case(ignores_force)),
            ("a path that changes between file and folder applies as one delta",
             type_change_case(build_remote_apply_cmd), type_change_case(extract_before_delete)),
            ("a swap that fails after another root swapped puts both back and exits APPLY_SWAP_FAILED",
             swap_undo_case(build_remote_apply_cmd), swap_undo_case(no_undo)),
            ("a sent file is stamped with the deploy time, so its filemtime ?ver= changes",
             mtime_case(write_package), mtime_case(write_keeping_mtime)),
        ]
        for label, real_problems, planted_problems in cases:
            print(f"  [delta case] {label}: real={'GREEN' if not real_problems else 'RED'}; "
                  f"planted fault={'RED' if planted_problems else 'GREEN (check is vacuous)'}")
            failures.extend(f"delta: {label}: {p}" for p in real_problems)
            if not planted_problems:
                failures.append(f"delta NEGATIVE CONTROL: {label}: the planted fault was not detected")
    return failures


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if "--self-test" in sys.argv:
        problems = self_test()
        for line in problems:
            print("FAIL", line)
        print("self-test:", "FAIL" if problems else "ok")
        sys.exit(1 if problems else 0)
    print(__doc__)
    sys.exit(2)
