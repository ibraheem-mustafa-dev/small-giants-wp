"""The targets of the §13 detector: where saved blocks live, and a reader/rewriter for each carrier.

Repo targets (files, rewritten in place by `fix --apply`): theme patterns, templates and parts, `sites/*/build/`
trees and skeletons (backups listed apart), block fixtures, computed-route calibration fixtures.
Content targets (a mirror's saved posts, or a wp-cli export file): read-only here; `fix` prints their diff and never writes.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Callable, Iterator

import markup
from mapping import REPO

MARKUP_SUFFIXES = {".php", ".html", ".txt", ".md"}
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "vendor"}

# A mirror is a folder /var/www/local-<name>; only a plain name is accepted, and the one command run is a read-only `post list`.
MIRROR_NAME = re.compile(r"^[a-z0-9-]+$")
POST_TYPES = ("page,post,product,sgs_choice_flow,sgs_drawer,sgs_footer,sgs_form,sgs_header,sgs_mega_menu,"
              "sgs_product_template,wp_template,wp_template_part,wp_navigation,wp_block")
POST_STATUSES = "publish,draft,pending,private,future,trash,auto-draft,inherit"


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
    """(new text, changed block count, reformatted). A JSON file is re-serialised with its detected indent."""
    text = read_text(path)
    if path.suffix.lower() != ".json":
        new, count = markup.rewrite_markup(text, fn)
        return new, count, False
    try:
        data = json.loads(text)
    except ValueError:
        new, count = markup.rewrite_markup(text, fn)
        return new, count, False
    indent = 2 if '\n  "' in text or '\n  {' in text or '\n  [' in text else (4 if '\n    "' in text else None)
    unchanged = json.dumps(data, indent=indent, ensure_ascii=False)
    data, count = markup.rewrite_json(data, fn)
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


# ---------------------------------------------------------------- saved content (read-only)

def mirror_export(name: str) -> list[dict]:
    """Posts of a local mirror through a read-only `wp post list`; refuses any name that is not a plain folder name."""
    if not MIRROR_NAME.match(name):
        raise SystemExit(f"mirror name {name!r} must be lower-case letters, digits and hyphens")
    command = (f"wp --path=/var/www/local-{name} --allow-root post list --post_type={POST_TYPES} "
               f"--post_status={POST_STATUSES} --fields=ID,post_type,post_name,post_status,post_content --format=json")
    result = subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-c", command],
                            capture_output=True, text=True, encoding="utf-8", check=False)
    if result.returncode != 0 or not result.stdout.strip().startswith("["):
        raise SystemExit(f"wp-cli export of {name} failed: {result.stderr.strip()[:300]}")
    return json.loads(result.stdout)


def load_content(path: Path) -> list[dict]:
    posts = json.loads(read_text(path))
    if not isinstance(posts, list):
        raise SystemExit(f"{path}: expected a wp-cli post list (JSON array)")
    return posts


def content_blocks(posts: list[dict]) -> Iterator[tuple[str, str, dict]]:
    """(post label, block name, attrs) for every block in a post export."""
    for post in posts:
        label = f"{post.get('post_type')}:{post.get('ID')}:{post.get('post_name')}"
        for name, attrs in markup.iter_markup_blocks(post.get("post_content", "")):
            yield label, name, attrs


def rewrite_post(post: dict, fn: Callable) -> tuple[str, int]:
    return markup.rewrite_markup(post.get("post_content", ""), fn)
