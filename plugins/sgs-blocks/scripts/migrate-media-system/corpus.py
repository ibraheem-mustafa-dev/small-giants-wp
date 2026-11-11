"""The targets of the §13 detector: where saved blocks live, and a reader/rewriter for each carrier.

Repo targets (files, rewritten in place by `fix --apply`): theme patterns, templates and parts, `sites/*/build/`
trees and skeletons (backups listed apart), block fixtures, computed-route calibration fixtures.
Content targets (every store of a mirror that holds block markup, or an export file of the same shape): read by
`export_command`; `mirror.py` rewrites a mirror's rows.
"""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Callable, Iterator

import markup
import sizes
from mapping import REPO

MARKUP_SUFFIXES = {".php", ".html", ".txt", ".md"}
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "vendor"}

# A mirror is a folder /var/www/local-<name>; only a plain name is accepted.
MIRROR_NAME = re.compile(r"^[a-z0-9-]+$")


def _walk(root: Path, suffixes: set[str], skip: set[str] = frozenset()) -> Iterator[Path]:
    if not root.exists():
        return
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and d not in skip)
        for filename in sorted(filenames):
            if Path(filename).suffix.lower() in suffixes:
                yield Path(dirpath) / filename


def repo_targets() -> dict[str, list[Path]]:
    """{kind: files}. Kinds: patterns, theme-templates, build, build-backups, fixtures, calibration."""
    theme = REPO / "theme" / "sgs-theme"
    out: dict[str, list[Path]] = {
        "patterns": list(_walk(theme / "patterns", {".php", ".html"})),
        "theme-templates": list(_walk(theme / "templates", {".html"})) + list(_walk(theme / "parts", {".html"})),
        "build": [], "build-backups": [], "fixtures": [], "calibration": [],
    }
    for site in sorted((REPO / "sites").glob("*")):
        build = site / "build"
        out["build"] += [p for p in _walk(build, {".json", ".html", ".php", ".txt"}, {"backups"})]
        out["build-backups"] += list(_walk(build / "backups", {".json", ".html", ".php", ".txt"}))
    out["fixtures"] = list(_walk(REPO / "plugins" / "sgs-blocks" / "tests" / "fixtures", {".json", ".html", ".php"}))
    route = REPO / "scripts" / "computed-route"
    out["calibration"] = [p for p in (list(route.glob("calibration-*.json")) + list((route / "data").glob("*.json"))) if p.is_file()]
    return out


def read_text(path: Path) -> str:
    with open(path, "r", encoding="utf-8", newline="") as handle:
        return handle.read()


def file_blocks(path: Path) -> list[tuple[str, dict]]:
    text = read_text(path)
    if path.suffix.lower() == ".json":
        try:
            data = json.loads(text)
        except ValueError:
            return list(markup.iter_markup_blocks(text))
        return list(markup.iter_json_blocks(data))
    return list(markup.iter_markup_blocks(text))


def rewrite_file_text(path: Path, fn) -> tuple[str, int, bool]:
    """(new text, changed block count, reformatted). A JSON file with a changed block is re-serialised with the indent
    of its first indented line; a file with no changed block comes back byte for byte."""
    text = read_text(path)
    if path.suffix.lower() != ".json":
        new, count = markup.rewrite_markup(text, fn)
        return new, count, False
    try:
        data = json.loads(text)
    except ValueError:
        new, count = markup.rewrite_markup(text, fn)
        return new, count, False
    first = re.search(r'\n([ \t]+)\S', text)
    indent: str | None = first.group(1) if first else None
    unchanged = json.dumps(data, indent=indent, ensure_ascii=False)
    data, count = markup.rewrite_json(data, fn)
    if not count:
        return text, 0, False
    new = json.dumps(data, indent=indent, ensure_ascii=False)
    if text.endswith("\n"):
        new += "\n"
        unchanged += "\n"
    return new, count, unchanged != text


def write_atomic(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="") as handle:
        handle.write(text)
    os.replace(tmp, path)


# ---------------------------------------------------------------- saved content

HERE = Path(__file__).resolve().parent
UNSAFE_PATH = re.compile(r"[^A-Za-z0-9_./-]")


def check_wp_path(wp_path: str) -> str:
    """A WordPress folder as an absolute path of plain characters (it goes into a shell command unquoted)."""
    if not wp_path.startswith("/") or UNSAFE_PATH.search(wp_path) or ".." in wp_path:
        raise SystemExit(f"WordPress path {wp_path!r} must be absolute and use only letters, digits and _ . / -")
    return wp_path


def export_command(wp_path: str) -> str:
    """One read-only shell command that prints every saved block-markup record of the WordPress at `wp_path` as JSON.

    It runs on a WSL mirror or over SSH on a host: the PHP (`export-content.php`) travels inside the command, so
    nothing is copied to the host. The JSON is the list `load_content` and `--content FILE` accept.
    """
    code = (HERE / "export-content.php").read_bytes()
    encoded = base64.b64encode(code).decode("ascii")
    return f'wp --path={check_wp_path(wp_path)} --allow-root eval "$(echo {encoded} | base64 -d)"'


def check_mirror_name(name: str) -> str:
    if not MIRROR_NAME.match(name):
        raise SystemExit(f"mirror name {name!r} must be lower-case letters, digits and hyphens")
    return name


def wsl(script: str) -> subprocess.CompletedProcess:
    """Run a bash script in WSL Ubuntu as root. The script goes in on standard input as bytes, so no quoting layer
    and no Windows newline translation touches it."""
    return subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-s"], input=(script + "\n").encode("utf-8"),
                          capture_output=True, check=False)


def wsl_text(result: subprocess.CompletedProcess) -> tuple[str, str]:
    return result.stdout.decode("utf-8", "replace"), result.stderr.decode("utf-8", "replace")


def wsl_put(path: str, data: bytes) -> None:
    """Write `data` to a plain WSL path (a file the caller removes afterwards)."""
    if UNSAFE_PATH.search(path):
        raise SystemExit(f"WSL path {path!r} uses characters outside letters, digits and _ . / -")
    done = subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-c", f"cat>{path}"], input=data, capture_output=True, check=False)
    if done.returncode != 0:
        raise SystemExit(f"could not write {path} in WSL: {done.stderr.decode('utf-8', 'replace')[:200]}")


_EXPORTS: dict[str, list[dict]] = {}


def mirror_export(name: str, fresh: bool = False) -> list[dict]:
    """Every saved block-markup record of a local mirror, through the read-only export command (kept for the run; `fresh` re-reads)."""
    if name in _EXPORTS and not fresh:
        return _EXPORTS[name]
    result = wsl(export_command(f"/var/www/local-{check_mirror_name(name)}"))
    out, err = wsl_text(result)
    if result.returncode != 0 or not out.strip().startswith("["):
        raise SystemExit(f"wp-cli export of {name} failed: {err.strip()[:300] or out.strip()[:300]}")
    posts, files = sizes.split_export(json.loads(out))
    sizes.register(f"mirror:{name}", files, mirror=name)
    _EXPORTS[name] = posts
    return _EXPORTS[name]


def load_content(path: Path) -> list[dict]:
    records = json.loads(read_text(path))
    if not isinstance(records, list):
        raise SystemExit(f"{path}: expected a wp-cli post list (JSON array)")
    posts, files = sizes.split_export(records)
    sizes.register(f"content:{path.stem}", files)
    return posts


def content_blocks(posts: list[dict]) -> Iterator[tuple[str, str, dict]]:
    """(post label, block name, attrs) for every block in a post export."""
    for post in posts:
        label = f"{post.get('post_type')}:{post.get('ID')}:{post.get('post_name')}"
        for name, attrs in markup.iter_markup_blocks(post.get("post_content", "")):
            yield label, name, attrs


def rewrite_post(post: dict, fn: Callable) -> tuple[str, int]:
    return markup.rewrite_markup(post.get("post_content", ""), fn)
