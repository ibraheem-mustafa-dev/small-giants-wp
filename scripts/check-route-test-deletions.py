#!/usr/bin/env python3
"""Refuse a commit that deletes cloning-route tests without a stated reason.

The rewind of 2026-11-02 and the retirement of 2026-11-24 deleted route code together with the tests that proved it, so no
test failed and the loss went unseen. A staged deletion of a file under scripts/computed-route/tests/ (a `*.test.mjs` suite, its
`*.mutations.json` list, or a fixture it reads) now stops the commit until the commit states why.

The reason is the environment variable SGS_TESTS_REMOVED_OK, set for the one commit:

    SGS_TESTS_REMOVED_OK="the check moved to tests/new.test.mjs" git commit -m "..." -- <paths>

A rename is not a deletion (git reports it as R). Run from the repository root; wired in .githooks/sgs-gates.sh.

    python scripts/check-route-test-deletions.py --check        the gate (exit 1 when a deletion has no reason)
    python scripts/check-route-test-deletions.py --self-test    proves the gate refuses and allows what it should
"""
import os
import subprocess
import sys

TESTS_DIR = "scripts/computed-route/tests/"
REASON_VARIABLE = "SGS_TESTS_REMOVED_OK"


def deleted_route_tests(name_status):
    """The route test files a `git diff --cached --name-status` listing deletes."""
    out = []
    for line in name_status.splitlines():
        parts = line.split("\t")
        if len(parts) >= 2 and parts[0].startswith("D") and parts[-1].startswith(TESTS_DIR):
            out.append(parts[-1])
    return out


def refusal(deleted):
    lines = [
        f"route tests deleted without a stated reason ({len(deleted)}):",
        *[f"  - {path}" for path in deleted[:12]],
        *(["  - ..."] if len(deleted) > 12 else []),
        "",
        "A deleted test is a deleted proof: the check it ran no longer fails when the code it covered is lost.",
        f"Move the check into another test, or state why it goes, for this commit only:  {REASON_VARIABLE}=\"<reason>\" git commit ...",
    ]
    return "\n".join(lines)


def decide(name_status, reason):
    """(exit code, message) for a staged listing and the stated reason."""
    deleted = deleted_route_tests(name_status)
    if not deleted or reason.strip():
        return 0, ""
    return 1, refusal(deleted)


def check():
    listing = subprocess.run(
        ["git", "diff", "--cached", "--name-status", "--no-color", "--diff-filter=D"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if listing.returncode != 0:
        print("check-route-test-deletions: git diff failed, gate skipped", file=sys.stderr)
        return 0
    code, message = decide(listing.stdout, os.environ.get(REASON_VARIABLE, ""))
    if message:
        print(message, file=sys.stderr)
    return code


def self_test():
    gone = f"D\t{TESTS_DIR}fill-x.test.mjs\nM\tscripts/computed-route/fill.mjs\nD\t{TESTS_DIR}fill-x.mutations.json\n"
    assert decide(gone, "")[0] == 1, "a deleted suite with no reason must be refused"
    assert f"{TESTS_DIR}fill-x.test.mjs" in decide(gone, "")[1], "the refusal names the file"
    assert decide(gone, "   ")[0] == 1, "a blank reason is no reason"
    assert decide(gone, "moved to tests/y.test.mjs")[0] == 0, "a stated reason lets it through"
    assert decide(f"M\t{TESTS_DIR}fill-x.test.mjs\nA\t{TESTS_DIR}new.test.mjs\n", "")[0] == 0, "an edit or an added test is not a deletion"
    assert decide(f"R100\t{TESTS_DIR}a.test.mjs\t{TESTS_DIR}b.test.mjs\n", "")[0] == 0, "a rename is not a deletion"
    assert decide("D\tscripts/computed-route/lib/fill-x.mjs\nD\tsites/a/build/x.json\n", "")[0] == 0, "other deletions are not this gate's"
    print("check-route-test-deletions: self-test passed")
    return 0


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "--self-test":
        sys.exit(self_test())
    if mode == "--check":
        sys.exit(check())
    print(__doc__, file=sys.stderr)
    sys.exit(2)
