#!/usr/bin/env python3
"""List the `cr-ref-` blocks of posts on a local WSL mirror, with their saved attributes (scripts/local-wp/read-block-attrs.php).

  python scripts/local-wp/read-block-attrs.py --site local-indus --out E:/sgs-tmp/attrs.json 90 92 201

Read-only. Mirrors only: the site must be one of the local-* folders under /var/www in WSL.
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
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", required=True)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("posts", nargs="+", type=int)
    a = ap.parse_args()
    if not re.fullmatch(r"local-[a-z0-9-]+", a.site):
        sys.exit("--site must be a local mirror (local-<name>).")
    php = to_wsl(REPO / "scripts/local-wp/read-block-attrs.php")
    ids = " ".join(str(p) for p in a.posts)
    cmd = f"cd /var/www/{a.site} && wp --allow-root --user=1 eval-file {shlex.quote(php)} {shlex.quote(to_wsl(a.out))} {ids}"
    r = subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "--", "bash", "-lc", cmd], capture_output=True, text=True)
    sys.stderr.write("\n".join(l for l in r.stderr.splitlines() if "Deprecated" not in l and l.strip()) + ("\n" if r.stderr.strip() else ""))
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
