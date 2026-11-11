#!/usr/bin/env python
"""Spec 49 Stage B folder freeze: a pre-commit check on the staged files.

From the moment the integration branch `feature/media-stage-b` exists (a local branch or `origin/feature/media-stage-b`),
every block folder that `plugins/sgs-blocks/scripts/data/media-adoption.json` names (`waves[].blocks` keys, matched to
`src/blocks/**/block.json` by `name`) is frozen: a commit that stages a file under one is refused, unless it is made on
that branch or on any HEAD, named or detached, that has the branch's tip among its ancestors (agents commit in detached worktrees on
top of it; once the branch is merged, `main` contains the tip and the freeze no longer applies to it, even if a stale
`origin/` ref remains). The frozen folders come from HEAD's tree as well as the working tree, so staging the deletion of a
frozen folder or a change of a block's `name` does not escape.
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
    """True when a branch tip is among HEAD's ancestors (HEAD itself counts): the branch, a detached HEAD above it, or a merge of it."""
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


def block_json_names(root):
    """[(block.json path relative to root, name)] from the working tree and from HEAD's tree (a path may appear in both)."""
    found = []
    for bj in sorted((Path(root) / BLOCKS).rglob("block.json")):
        try:
            found.append((bj.relative_to(root).as_posix(), json.loads(bj.read_text(encoding="utf-8")).get("name")))
        except ValueError:
            continue
    code, listing = git(root, "ls-tree", "-r", "--name-only", "HEAD", "--", BLOCKS)
    for path in listing.splitlines() if code == 0 else []:
        if path.endswith("/block.json"):
            code, text = git(root, "show", f"HEAD:{path}")
            try:
                found.append((path, json.loads(text).get("name")))
            except ValueError:
                continue
    return found


def frozen_folders(root, names):
    """{folder prefix ending in '/': block name} for every block.json (working tree or HEAD) whose `name` is in names."""
    return {path.rsplit("/", 1)[0] + "/": name for path, name in block_json_names(root) if name in names}


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
    print(f"Rule: a frozen block folder changes only on `{BRANCH}` (or any HEAD that has its tip as an ancestor). "
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
        base = g("rev-parse", "HEAD").stdout.strip()

        frozen, free = BLOCKS + "media/render.php", BLOCKS + "other/render.php"
        for f in (frozen, free):
            (root / f).write_text("<?php // edit\n")

        g("add", "--", free)
        expect("no branch: staged free file passes silently", root, 0, True)
        g("reset", "-q")
        g("add", "--", frozen)
        expect("no branch: staged frozen file passes silently", root, 0, True)

        g("branch", BRANCH)
        g("checkout", "-q", BRANCH)
        (root / "tip.txt").write_text("tip\n")
        g("add", "--", "tip.txt")
        g("commit", "-q", "-m", "branch tip", "--", "tip.txt")
        g("checkout", "-q", "main")
        g("reset", "-q")
        g("add", "--", frozen)
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

        g("reset", "-q", "--hard")
        g("checkout", "-q", "-b", "side", base)
        (root / frozen).write_text("<?php // edit 6\n")
        g("add", "--", frozen)
        expect("a named branch that lacks the tip: refused", root, 1)
        g("reset", "-q", "--hard")
        g("checkout", "-q", "main")
        g("merge", "-q", "-s", "ours", "--no-edit", "elsewhere")
        (root / frozen).write_text("<?php // edit 7\n")
        g("add", "--", frozen)
        expect("merged: main contains the tip, a stale origin/ ref no longer freezes it", root, 0)
        g("reset", "-q")
        g("branch", BRANCH, "elsewhere")
        g("add", "--", frozen)
        expect("merged: main contains the tip of the local branch too", root, 0)
        g("reset", "-q", "--hard")
        g("checkout", "-q", "side")
        g("merge", "-q", "--no-edit", "main")
        (root / frozen).write_text("<?php // edit 8\n")
        g("add", "--", frozen)
        expect("a named branch that has merged the tip: allowed", root, 0)
        g("reset", "-q", "--hard")
        g("checkout", "-q", "-b", "gone", base)
        g("rm", "-q", "-r", "--", BLOCKS + "media")
        expect("a staged deletion of a frozen folder is refused (names come from HEAD's tree)", root, 1)
        g("reset", "-q", "--hard")
        (root / BLOCKS / "media" / "block.json").write_text(json.dumps({"name": "sgs/renamed"}))
        g("add", "--", BLOCKS + "media/block.json")
        expect("a staged `name` change of a frozen block is refused", root, 1)
        g("reset", "-q", "--hard")
        g("checkout", "-q", "main")

        (root / ADOPTION).unlink()
        expect("adoption file missing: nothing frozen, silent", root, 0, True)
    print(f"stage-b freeze self-test: {'FAILED ' + str(failures) if failures else 'all cases passed'}")
    return 1 if failures else 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    code, top = git(".", "rev-parse", "--show-toplevel")
    sys.exit(check(top) if code == 0 else 0)
