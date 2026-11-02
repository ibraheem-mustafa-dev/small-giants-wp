#!/usr/bin/env python3
"""Patch block settings in one post on a local WSL mirror, by block className (scripts/local-wp/patch-block-attrs.php).

  python scripts/local-wp/patch-block-attrs.py --site local-indus --post 90 --patch E:/sgs-tmp/home-c9.json [--dry-run]

The patch file format is documented at the top of patch-block-attrs.php. Every operation must match exactly one block
(or say "all": true), else nothing is written. The post is backed up on the mirror first. Mirrors only: the site must
be one of the local-* folders under /var/www in WSL, so a Hostinger site can never be the target. Run a dry run first.
"""
import argparse
import re
import shlex
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent


def to_wsl(path: Path) -> str:
    p = str(path.resolve()).replace("\\", "/")
    m = re.match(r"^([A-Za-z]):/(.*)$", p)
    if not m:
        sys.exit(f"Not a Windows drive path: {p}")
    return f"/mnt/{m.group(1).lower()}/{m.group(2)}"


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", required=True, help="mirror folder name, e.g. local-indus")
    ap.add_argument("--post", required=True, type=int)
    ap.add_argument("--patch", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--user", default="1", help="administrator id or login the write runs as (default 1). Without an administrator, the sgsCustomCss save filter strips every sgsCustomCss attribute in the post.")
    a = ap.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_.@-]+", a.user):
        sys.exit("--user must be a user id or login.")
    if not re.fullmatch(r"local-[a-z0-9-]+", a.site):
        sys.exit("--site must be a local mirror (local-<name>).")
    if not a.patch.is_file():
        sys.exit(f"No patch file: {a.patch}")
    php = to_wsl(REPO / "scripts/local-wp/patch-block-attrs.php")
    # One writer per post at a time: parallel workers patching the same post queue on a lock instead of one read-modify-write
    # overwriting another's.
    cmd = f"cd /var/www/{a.site} && flock -w 120 /tmp/patch-block-attrs-{a.site}-{a.post}.lock wp --allow-root --user={shlex.quote(a.user)} eval-file {shlex.quote(php)} {a.post} {shlex.quote(to_wsl(a.patch))}" + (" dry-run" if a.dry_run else "")
    r = subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-lc", cmd], capture_output=True, text=True)
    sys.stdout.write(r.stdout)
    sys.stderr.write("\n".join(l for l in r.stderr.splitlines() if "Deprecated" not in l and l.strip()) + ("\n" if r.stderr.strip() else ""))
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
