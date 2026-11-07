#!/usr/bin/env python3
"""Proves patch-block-attrs.php refuses a `set` of an attribute the block does not declare, in dry run too, and that its
`insert` op inserts, is idempotent and refuses a missing anchor, an undeclared attribute, a bad position and a non-dynamic block.

  python scripts/local-wp/test-patch-block-attrs.py --site local-indus --post 149 --match cr-ref-form-enquiry-5

The target is any mirror post holding one block with that className whose type declares `layout` and not `margin`
(sgs/form-field-tiles) and whose className is exactly that token (the idempotence case inserts a block with that className, which
is then already in the post). Every case is a dry run, so nothing is written. Exit 0 only when all cases behave.
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
    layer = {"block": "sgs/decorative-image", "attrs": {"className": "cr-ref-test-layer", "width": {"desktop": "10px"}}}
    cases += [
        ("insert after the anchor writes the block", [{"match": a.match, "insert": layer, "position": "after"}], True, "Insert after " + a.match + " <!-- wp:sgs/decorative-image"),
        ("insert before the anchor writes the block", [{"match": a.match, "insert": layer, "position": "before"}], True, "Insert before " + a.match),
        ("insert whose className is already in the post is a no-op", [{"match": a.match, "insert": {**layer, "attrs": {**layer["attrs"], "className": a.match}}, "position": "after"}], True, "already present (no change)"),
        ("insert beside a missing anchor is refused", [{"match": "cr-ref-no-such-anchor", "insert": layer, "position": "after"}], False, "matched 0 block(s)"),
        ("insert of an undeclared attribute is refused", [{"match": a.match, "insert": {**layer, "attrs": {**layer["attrs"], "margin": "0"}}, "position": "after"}], False, "declares no attribute"),
        ("insert at an unknown position is refused", [{"match": a.match, "insert": layer, "position": "inside"}], False, "needs \"position\""),
        ("insert of a block with no className is refused", [{"match": a.match, "insert": {"block": "sgs/decorative-image", "attrs": {"width": {"desktop": "10px"}}}, "position": "after"}], False, "needs a className"),
        ("insert of a static block is refused", [{"match": a.match, "insert": {"block": "core/paragraph", "attrs": {"className": "cr-ref-test-p"}}, "position": "after"}], False, "not a dynamic block"),
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
