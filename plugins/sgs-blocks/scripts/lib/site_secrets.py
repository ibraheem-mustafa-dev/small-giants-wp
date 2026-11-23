"""A site's secrets file and key, from its entry in scripts/computed-route/calibration-targets.json.

The Python twin of scripts/computed-route/lib/site-targets.mjs::secretsOf. A site's logins live in the file and under the key
its entry names (`envFile`, `envKey`), so a site whose file is named otherwise (the live shop's `.claude/secrets/live-mamas.env`,
keys `WP_*_MAMAS`) is found. A name with no entry uses `.claude/secrets/<name>.env` and its derived key (a scratch copy of a
mirror). scripts/check-secrets-lookup.py refuses a path or key built from a site name anywhere else.

    python plugins/sgs-blocks/scripts/lib/site_secrets.py <site>     prints the file name, a tab and the key (never a value);
                                                                     shell scripts read the site's login file through it.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

REPO = Path(__file__).resolve().parents[4]
ROUTE = Path("scripts") / "computed-route"


def read_targets(repo: Path = REPO) -> Dict[str, dict]:
    """{ site: target } from the committed calibration-targets.json and the gitignored local file beside it (a scratch copy's entry).

    A local entry that names a committed one raises, as lib/site-targets.mjs::readTargets does.
    """
    committed_file = Path(repo) / ROUTE / "calibration-targets.json"
    local_file = committed_file.with_name("calibration-targets.local.json")
    committed = json.loads(committed_file.read_text(encoding="utf-8")) if committed_file.is_file() else {}
    if not local_file.is_file():
        return committed
    extra = json.loads(local_file.read_text(encoding="utf-8"))
    for site in extra:
        if site in committed:
            raise ValueError(f'{local_file.name} entry "{site}" would replace the committed entry of the same name: a local entry only adds a site')
    return {**committed, **extra}


def conventional_secrets(name: str) -> Tuple[str, str]:
    """(file name, key) of a name with no entry: `.claude/secrets/<name>.env`, the name upper-cased without punctuation."""
    return f".claude/secrets/{name}.env", re.sub(r"[^A-Za-z0-9]", "", name).upper()


def secrets_of(site: str, targets: Optional[Dict[str, dict]] = None) -> Tuple[str, str]:
    """(env file name, env key) of `site`: its entry's when the entry names both, else the convention."""
    table = read_targets() if targets is None else targets
    entry = table.get(site) or {}
    if entry.get("envFile") and entry.get("envKey"):
        return entry["envFile"], entry["envKey"]
    return conventional_secrets(site)


def _main_checkout(repo: Path) -> Optional[Path]:
    """The main checkout's root (the parent of git's common directory): a worktree holds no gitignored secrets."""
    try:
        common = subprocess.run(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], cwd=repo, capture_output=True, text=True, check=True
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None
    return Path(common).parent if common else None


def secrets_file(env_file: str, repo: Path = REPO) -> Path:
    """The login file's full path: under SGS_SECRETS_ROOT, else `repo`, else the main checkout (the first that holds it; `repo`'s path when none does)."""
    for root in (os.environ.get("SGS_SECRETS_ROOT"), str(repo)):
        if root and (Path(root) / env_file).is_file():
            return (Path(root) / env_file).resolve()
    main = _main_checkout(Path(repo))
    if main and (main / env_file).is_file():
        return (main / env_file).resolve()
    return (Path(repo) / env_file).resolve()


def read_env(path: Path) -> Dict[str, str]:
    """The KEY=value lines of an env file (comments skipped, surrounding quotes dropped; values are never printed)."""
    env: Dict[str, str] = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip().strip("\"'")
    return env


def main(argv: list) -> int:
    if len(argv) != 2 or argv[1].startswith("-"):
        print("usage: site_secrets.py <site>", file=sys.stderr)
        return 2
    env_file, env_key = secrets_of(argv[1])
    sys.stdout.buffer.write(f"{env_file}\t{env_key}\n".encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
