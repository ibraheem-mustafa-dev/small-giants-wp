#!/usr/bin/env python3
"""Proves patch-block-attrs.php refuses a `set` of an attribute the block does not declare, in dry run too.

  python scripts/local-wp/test-patch-block-attrs.py --site local-indus --post 149 --match cr-ref-form-enquiry-5

The target is any mirror post holding one block with that className whose type declares `layout` and not `margin`
(sgs/form-field-tiles). Every case is a dry run, so nothing is written. Exit 0 only when all cases behave.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent


def dry_run(site: str, post: int, ops: list[dict]) -> tuple[int, str]:
    with tempfile.TemporaryDirectory() as tmp:
        patch = Path(tmp) / "patch.json"
        patch.write_text(json.dumps(ops), encoding="utf-8")
        r = subprocess.run(
            [sys.executable, str(HERE / "patch-block-attrs.py"), "--site", site, "--post", str(post), "--patch", str(patch), "--dry-run"],
            capture_output=True, text=True, encoding="utf-8",
        )
    return r.returncode, r.stdout + r.stderr


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", required=True)
    ap.add_argument("--post", required=True, type=int)
    ap.add_argument("--match", required=True)
    a = ap.parse_args()
    cases = [
        ("undeclared attribute is refused", [{"match": a.match, "set": {"margin": "0"}}], False, "declares no attribute"),
        ("one declared and one undeclared is refused whole", [{"match": a.match, "set": {"layout": "grid", "margin": "0"}}], False, "declares no attribute"),
        ("declared attribute passes", [{"match": a.match, "set": {"layout": "grid"}}], True, "Dry run"),
        ("unset of any key passes", [{"match": a.match, "unset": ["margin"]}], True, "Dry run"),
    ]
    failed = 0
    for name, ops, want_ok, needle in cases:
        rc, out = dry_run(a.site, a.post, ops)
        ok = (rc == 0) == want_ok and needle in out
        failed += not ok
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + ("" if ok else f"\n      rc={rc}\n      {out.strip()}"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
