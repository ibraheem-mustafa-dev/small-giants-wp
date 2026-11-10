#!/usr/bin/env python
"""Spec 49 Stage B folder freeze: a pre-commit check on the staged files.

From the moment the integration branch `feature/media-stage-b` exists (a local branch or `origin/feature/media-stage-b`),
every block folder that `plugins/sgs-blocks/scripts/data/media-adoption.json` names (`waves[].blocks` keys, matched to
`src/blocks/**/block.json` by `name`) is frozen: a commit that stages a file under one is refused, unless it is made on
that branch or on a detached HEAD that descends from the branch's tip (agents commit in detached worktrees on top of it).
When neither ref exists, or the adoption file is missing, or nothing staged is under `src/blocks/`, it exits 0 in silence.
It reads local and remote-tracking refs only; it never touches the network.

Usage:
  python scripts/check-stage-b-freeze.py            check the staged files of the repository in the current directory
  python scripts/check-stage-b-freeze.py --self-test
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

BRANCH = "feature/media-stage-b"
REFS = (f"refs/heads/{BRANCH}", f"refs/remotes/origin/{BRANCH}")
BLOCKS = "plugins/sgs-blocks/src/blocks/"
ADOPTION = "plugins/sgs-blocks/scripts/data/media-adoption.json"


def git(root, *args):
    r = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, encoding="utf-8")
    return r.returncode, r.stdout.strip()


def branch_tips(root):
    """Commit ids of the integration branch: local and remote-tracking, whichever exist."""
    tips = []
    for ref in REFS:
        code, out = git(root, "rev-parse", "--verify", "-q", ref + "^{commit}")
        if code == 0 and out:
            tips.append(out)
    return tips


def commit_allowed(root, tips):
    """On the integration branch, or detached with a branch tip among HEAD's ancestors."""
    code, current = git(root, "symbolic-ref", "-q", "--short", "HEAD")
    if code == 0:
        return current == BRANCH
    return any(git(root, "merge-base", "--is-ancestor", tip, "HEAD")[0] == 0 for tip in tips)


def adopted_block_names(root):
    path = Path(root) / ADOPTION
    if not path.is_file():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        sys.exit(f"stage-b freeze: {ADOPTION} is not valid JSON; fix it before committing")
    return {name for wave in data.get("waves", []) for name in wave.get("blocks", {})}


def frozen_folders(root, names):
    """{folder prefix ending in '/': block name} for every block.json whose `name` is in names."""
    out = {}
    base = Path(root) / BLOCKS
    for bj in sorted(base.rglob("block.json")):
        try:
            name = json.loads(bj.read_text(encoding="utf-8")).get("name")
        except ValueError:
            continue
        if name in names:
            out[bj.parent.relative_to(root).as_posix() + "/"] = name
    return out


def violations(root):
    code, out = git(root, "diff", "--cached", "--name-only", "--no-renames", "--diff-filter=ACDMRTU")
    staged = [f for f in out.splitlines() if f.startswith(BLOCKS)]
    if not staged:
        return []
    tips = branch_tips(root)
    if not tips or commit_allowed(root, tips):
        return []
    names = adopted_block_names(root)
    if not names:
        return []
    folders = frozen_folders(root, names)
    return [(f, name) for f in staged for prefix, name in folders.items() if f.startswith(prefix)]


def check(root):
    bad = violations(root)
    if not bad:
        return 0
    print(f"stage-b freeze BLOCKED: `{BRANCH}` exists, and these staged files are in block folders Stage B edits (Spec 49 section 14.1):", file=sys.stderr)
    for f, name in bad:
        print(f"  {f}  ({name})", file=sys.stderr)
    print(f"Rule: a frozen block folder changes only on `{BRANCH}` (or a detached HEAD on top of its tip). "
          f"Make the change there, or unstage these files.", file=sys.stderr)
    return 1


def self_test():
    me = str(Path(__file__).resolve())
    failures = []

    def expect(label, root, code, silent=None):
        r = subprocess.run([sys.executable, me], cwd=root, capture_output=True, text=True, encoding="utf-8")
        ok = r.returncode == code and (silent is None or (r.stdout + r.stderr == "") == silent)
        print(("ok   " if ok else "FAIL ") + label + ("" if ok else f"  (exit {r.returncode}: {r.stderr.strip()})"))
        if not ok:
            failures.append(label)
        return r

    scratch = "E:/sgs-tmp" if Path("E:/sgs-tmp").is_dir() else None
    with tempfile.TemporaryDirectory(dir=scratch) as tmp:
        root = Path(tmp) / "repo"
        root.mkdir()

        def g(*a):
            return subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *a], cwd=root, check=True,
                                  capture_output=True, text=True)

        g("init", "-q", "-b", "main")
        for slug, name in (("media", "sgs/media"), ("other", "sgs/other")):
            d = root / BLOCKS / slug
            d.mkdir(parents=True)
            (d / "block.json").write_text(json.dumps({"name": name}))
            (d / "render.php").write_text("<?php\n")
        (root / ADOPTION).parent.mkdir(parents=True)
        (root / ADOPTION).write_text(json.dumps({"branch": BRANCH, "waves": [
            {"id": "wave-1", "blocks": {"sgs/media": {"slots": {}}}}]}))
        g("add", "-A")
        g("commit", "-q", "-m", "base")

        frozen, free = BLOCKS + "media/render.php", BLOCKS + "other/render.php"
        for f in (frozen, free):
            (root / f).write_text("<?php // edit\n")

        g("add", "--", free)
        expect("no branch: staged free file passes silently", root, 0, True)
        g("reset", "-q")
        g("add", "--", frozen)
        expect("no branch: staged frozen file passes silently", root, 0, True)

        g("branch", BRANCH)
        r = expect("NEGATIVE CONTROL branch exists, frozen file on main is refused", root, 1)
        ok = frozen in r.stderr and "sgs/media" in r.stderr and "Rule:" in r.stderr
        print(("ok   " if ok else "FAIL ") + "refusal names the file, the block and the rule")
        if not ok:
            failures.append("refusal text")
        g("reset", "-q")
        g("add", "--", free)
        expect("branch exists: staged non-frozen block file passes silently", root, 0, True)

        g("reset", "-q")
        g("checkout", "-q", BRANCH)
        g("add", "--", frozen)
        expect("on the branch: frozen file passes", root, 0)
        g("reset", "-q")
        g("checkout", "-q", "main")

        g("checkout", "-q", "--detach", BRANCH)
        g("add", "--", frozen)
        expect("detached at the branch tip: frozen file passes", root, 0)
        g("commit", "-q", "-m", "on branch", "--", frozen)
        (root / frozen).write_text("<?php // edit 2\n")
        g("add", "--", frozen)
        expect("detached above the branch tip: frozen file passes", root, 0)
        g("reset", "-q", "--hard")
        g("branch", "-f", BRANCH, "HEAD")
        g("checkout", "-q", "main")

        (root / frozen).write_text("<?php // edit 3\n")
        g("add", "--", frozen)
        g("commit", "-q", "-m", "main moves on", "--", frozen)
        g("checkout", "-q", "--detach", "HEAD~1")
        (root / frozen).write_text("<?php // edit 4\n")
        g("add", "--", frozen)
        expect("detached on an old main commit, not above the tip: refused", root, 1)
        g("reset", "-q", "--hard")
        g("checkout", "-q", "main")

        g("branch", "-m", BRANCH, "elsewhere")
        g("update-ref", f"refs/remotes/origin/{BRANCH}", "elsewhere")
        (root / frozen).write_text("<?php // edit 5\n")
        g("add", "--", frozen)
        expect("only the origin/ ref exists: refused on main", root, 1)

        (root / ADOPTION).unlink()
        expect("adoption file missing: nothing frozen, silent", root, 0, True)
    print(f"stage-b freeze self-test: {'FAILED ' + str(failures) if failures else 'all cases passed'}")
    return 1 if failures else 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    code, top = git(".", "rev-parse", "--show-toplevel")
    sys.exit(check(top) if code == 0 else 0)
