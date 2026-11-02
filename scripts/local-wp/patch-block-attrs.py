#!/usr/bin/env python3
"""Patch block settings in one post on a local WSL mirror, by block className (scripts/local-wp/patch-block-attrs.php).

  python scripts/local-wp/patch-block-attrs.py --site local-indus --post 90 --patch E:/sgs-tmp/home-c9.json [--dry-run]

The patch file format is documented at the top of patch-block-attrs.php. Every operation must match exactly one block
(or say "all": true), else nothing is written. The post is backed up on the mirror first. Mirrors only: the site must
be one of the local-* folders under /var/www in WSL, so a Hostinger site can never be the target. Run a dry run first.
"""
import argparse
import re
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
    a = ap.parse_args()
    if not re.fullmatch(r"local-[a-z0-9-]+", a.site):
        sys.exit("--site must be a local mirror (local-<name>).")
    if not a.patch.is_file():
        sys.exit(f"No patch file: {a.patch}")
    php = to_wsl(REPO / "scripts/local-wp/patch-block-attrs.php")
    cmd = f"cd /var/www/{a.site} && wp --allow-root eval-file {php} {a.post} {to_wsl(a.patch)}" + (" dry-run" if a.dry_run else "")
    r = subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-lc", cmd], capture_output=True, text=True)
    sys.stdout.write(r.stdout)
    sys.stderr.write("\n".join(l for l in r.stderr.splitlines() if "Deprecated" not in l and l.strip()) + ("\n" if r.stderr.strip() else ""))
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
