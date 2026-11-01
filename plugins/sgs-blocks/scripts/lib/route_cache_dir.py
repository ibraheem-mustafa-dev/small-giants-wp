"""Where the cloning route's calibration cache lives (the Python twin of
scripts/computed-route/lib/cache-dir.mjs::routeCacheDir; route code is never imported from here).

Precedence: (1) the environment variable SGS_ROUTE_CACHE when non-empty; (2) the first
non-empty line of scripts/computed-route/cache-dir.local (gitignored); (3) the folder
scripts/computed-route/cache. The answer is an absolute path; nothing is created.
A repo other than this checkout has its own cache folder and ignores both overrides.
"""
from __future__ import annotations

import os
from pathlib import Path

CACHE_ENV = "SGS_ROUTE_CACHE"
CACHE_DIR_FILE = "cache-dir.local"
THIS_REPO = next(p for p in Path(__file__).resolve().parents if (p / ".git").exists())


def read_cache_dir_file(file: Path) -> str | None:
    """The first non-empty line of the override file (BOM and CR removed), or None."""
    if not file.is_file():
        return None
    text = file.read_text(encoding="utf-8").lstrip("﻿")
    for line in text.splitlines():
        if line.strip():
            return line.strip()
    return None


def route_cache_dir(repo: Path | None = None, env: dict[str, str] | None = None) -> Path:
    root = Path(repo).resolve() if repo is not None else THIS_REPO
    route = root / "scripts" / "computed-route"
    environ = os.environ if env is None else env
    if str(root).lower() == str(THIS_REPO).lower():
        chosen = (environ.get(CACHE_ENV) or "").strip() or read_cache_dir_file(route / CACHE_DIR_FILE)
        if chosen:
            return Path(chosen).resolve()
    return route / "cache"
