#!/usr/bin/env python3
"""Refuse a commit that deletes cloning-route tests without a stated reason.

The rewind of 2026-11-02 and the retirement of 2026-11-24 deleted route code together with the tests that proved it, so no
test failed and the loss went unseen. A staged deletion of a file under scripts/computed-route/tests/ (a `*.test.mjs` suite, its
`*.mutations.json` list, or a fixture it reads) now stops the commit until the commit states why.

The reason is the environment variable SGS_TESTS_REMOVED_OK, set for the one commit:

    SGS_TESTS_REMOVED_OK="the check moved to tests/new.test.mjs" git commit -m "..." -- <paths>

A file moved out of the tests folder counts as a deletion (the listing is made with --no-renames); a file moved within it is a delete and an add, and states its reason too. Run from the repository root; wired in .githooks/sgs-gates.sh.

    python scripts/check-route-test-deletions.py --check        the gate (exit 1 when a deletion has no reason, 2 when git cannot list the staged changes)
    python scripts/check-route-test-deletions.py --self-test    proves the gate refuses and allows what it should
"""
import contextlib
import io
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
        ["git", "diff", "--cached", "--name-status", "--no-color", "--no-renames", "--diff-filter=D"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if listing.returncode != 0:
        print(f"check-route-test-deletions: git diff failed, so the gate cannot tell whether a test is deleted: {listing.stderr.strip()}", file=sys.stderr)
        return 2
    code, message = decide(listing.stdout, os.environ.get(REASON_VARIABLE, ""))
    if message:
        print(message, file=sys.stderr)
    return code


def git_failure_exit():
    """check()'s exit code when `git diff` fails (subprocess.run stood in for by a failed listing)."""
    real = subprocess.run
    subprocess.run = lambda *args, **kwargs: subprocess.CompletedProcess(args, 128, stdout="", stderr="fatal: not a git repository")
    try:
        with contextlib.redirect_stderr(io.StringIO()):
            return check()
    finally:
        subprocess.run = real


def self_test():
    gone = f"D\t{TESTS_DIR}fill-x.test.mjs\nM\tscripts/computed-route/fill.mjs\nD\t{TESTS_DIR}fill-x.mutations.json\n"
    assert decide(gone, "")[0] == 1, "a deleted suite with no reason must be refused"
    assert f"{TESTS_DIR}fill-x.test.mjs" in decide(gone, "")[1], "the refusal names the file"
    assert decide(gone, "   ")[0] == 1, "a blank reason is no reason"
    assert decide(gone, "moved to tests/y.test.mjs")[0] == 0, "a stated reason lets it through"
    assert decide(f"M\t{TESTS_DIR}fill-x.test.mjs\nA\t{TESTS_DIR}new.test.mjs\n", "")[0] == 0, "an edit or an added test is not a deletion"
    # --no-renames lists a moved file as a deletion of the old path and an addition of the new one, never as R100.
    moved = f"D\t{TESTS_DIR}a.test.mjs\nA\t{TESTS_DIR}b.test.mjs\n"
    assert decide(moved, "")[0] == 1, "a file moved within the tests folder is a deletion of the old path, refused unless a reason is stated"
    assert decide(moved, "renamed to tests/b.test.mjs")[0] == 0, "a stated reason lets the move through"
    assert decide(f"D\t{TESTS_DIR}a.test.mjs\nA\tscripts/computed-route/lib/a.mjs\n", "")[0] == 1, "a file moved out of the tests folder is a deletion"
    assert git_failure_exit() == 2, "when git cannot list the staged changes the gate exits 2, never 0"
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
