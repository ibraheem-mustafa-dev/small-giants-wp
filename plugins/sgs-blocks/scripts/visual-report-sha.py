#!/usr/bin/env python3
"""Content hash binding a visual-diff report to the change it actually describes.

THE PROBLEM (found 2026-08-07). The visual-diff gate accepted any report at
`reports/visual-diff/<block>-<TODAY>.md` carrying `verdict: PASS`. It was keyed
on the DATE, not on the change. Measured that day: six blocks in a shadow-rename
commit were waved through on reports a DIFFERENT track had generated hours
earlier for ITS OWN edits to those same blocks. The gate read green while
verifying nothing about the change in front of it.

Two tracks sharing `main` is the normal state of this repo, so same-day reports
for the same block by different authors are not an edge case — they are the
expected case, and the gate was blind to exactly that.

THE FIX. A report declares the content it was written against:

    source_sha: <output of this script>

The gate recomputes it from the STAGED bytes at commit time and refuses a
mismatch. A report therefore certifies one specific version of one block's
source. Edit the block again and its report goes stale immediately — which is
the honest outcome, because the capture no longer describes what you are
committing.

Hashes the staged content of every file under the block's src directory, so it
is independent of the working tree, of file mtimes, and of any other block.

Usage:
    python visual-report-sha.py <block-name>          # print the sha
    python visual-report-sha.py <block> --check <sha> # exit 0 if it matches
    python visual-report-sha.py --self-test
"""
from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]


def _git(*args: str) -> bytes:
    return subprocess.run(["git", *args], capture_output=True, cwd=str(REPO)).stdout


def block_sha(block: str) -> str | None:
    """SHA-256 over the STAGED bytes of every file in the block's src dir."""
    prefix = f"plugins/sgs-blocks/src/blocks/{block}/"
    names = _git("diff", "--cached", "--name-only", "--", prefix).decode("utf-8", "replace").split()
    if not names:
        return None
    digest = hashlib.sha256()
    for name in sorted(names):
        # ":<path>" reads the INDEX (staged) copy — not the working tree, so an
        # unrelated later edit does not silently change the answer.
        blob = _git("show", f":{name}")
        digest.update(name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(blob)
        digest.update(b"\0")
    return digest.hexdigest()[:16]


def self_test() -> int:
    ok = True
    d1 = hashlib.sha256(b"a\0x\0").hexdigest()[:16]
    d2 = hashlib.sha256(b"a\0y\0").hexdigest()[:16]
    if d1 == d2:
        print("FAIL: differing content hashes equal"); ok = False
    # Field separators must prevent a rename/concat collision:
    # ("ab","c") and ("a","bc") must NOT hash alike.
    j = lambda *p: hashlib.sha256(b"".join(x + b"\0" for x in p)).hexdigest()
    if j(b"ab", b"c") == j(b"a", b"bc"):
        print("FAIL: separator does not prevent concat collision"); ok = False
    if block_sha("definitely-not-a-real-block") is not None:
        print("FAIL: unknown block did not return None"); ok = False
    print("SELF-TEST PASS" if ok else "SELF-TEST FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    if len(sys.argv) < 2:
        sys.exit("usage: visual-report-sha.py <block-name> [--check <sha>]")
    name = sys.argv[1]
    sha = block_sha(name)
    if sha is None:
        print(f"no staged files for block '{name}'")
        sys.exit(2)
    if "--check" in sys.argv:
        expected = sys.argv[sys.argv.index("--check") + 1]
        if expected == sha:
            print(f"MATCH {sha}")
            sys.exit(0)
        print(f"STALE: report declares {expected}, staged content is {sha}")
        sys.exit(1)
    print(sha)
