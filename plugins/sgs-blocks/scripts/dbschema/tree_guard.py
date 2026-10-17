#!/usr/bin/env python3
"""tree_guard.py -- refuse to write the shared framework DB from a stale checkout.

The framework DB is ONE file shared by every session and worktree. A reseed run from a checkout
that is behind ``origin/main`` writes that checkout's old schema and old rows into it: on
2026-10-17 a leftover worktree at an old commit ran ``sgs-update-v2.py`` stage 1, whose
``_index_sgs_block_files`` runs ``CREATE TABLE IF NOT EXISTS`` for three tables the current tree
had retired, and the shared DB gained them back.

``enforce`` is the one check both DB writers call (``sgs-update-v2.py`` and
``dbschema/seed_reference_data.py``):

* the tree passes when the LOCAL ref ``origin/main`` is an ancestor of the tree's ``HEAD``
  (``git merge-base --is-ancestor origin/main HEAD``): a fresh worktree at ``origin/main`` and the
  main checkout (equal or ahead) both pass;
* otherwise it exits 2 with a plain-English message naming the stale commit and the fix;
* a missing ``origin/main`` ref, a non-repository directory or an unavailable ``git`` is NOT proof
  of staleness, so it prints a warning and carries on (fail-open);
* ``--allow-stale-tree`` on the calling script overrides the refusal deliberately;
* a dry run writes nothing, and a run against a database other than the shared one is not guarded.

The check never touches the network: it reads the ref as it is, so run ``git fetch`` first if you
want it current.

Importing this module touches nothing.
"""
from __future__ import annotations

import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ORIGIN_REF = "refs/remotes/origin/main"
EXIT_STALE = 2
OVERRIDE_FLAG = "--allow-stale-tree"


@dataclass(frozen=True)
class TreeStatus:
    """``state`` is ``current``, ``stale`` or ``unknown`` (the check could not be made)."""

    state: str
    head: str
    origin: str
    detail: str


def _git(tree: Path, *args: str) -> subprocess.CompletedProcess[str] | None:
    try:
        return subprocess.run(
            ["git", "-C", str(tree), *args], capture_output=True, text=True, timeout=30, check=False
        )
    except (OSError, subprocess.SubprocessError):
        return None


def check_tree(tree: Path) -> TreeStatus:
    """Classify ``tree`` against the local ``origin/main`` ref."""
    head = _git(tree, "rev-parse", "--verify", "--quiet", "HEAD")
    if head is None:
        return TreeStatus("unknown", "", "", "git is not available")
    if 0 != head.returncode:
        return TreeStatus("unknown", "", "", f"{tree} is not a git work tree with a commit")
    origin = _git(tree, "rev-parse", "--verify", "--quiet", ORIGIN_REF)
    if origin is None or 0 != origin.returncode:
        return TreeStatus("unknown", head.stdout.strip(), "", "the local ref origin/main does not exist")
    head_sha = head.stdout.strip()
    origin_sha = origin.stdout.strip()
    ancestor = _git(tree, "merge-base", "--is-ancestor", ORIGIN_REF, "HEAD")
    if ancestor is None:
        return TreeStatus("unknown", head_sha, origin_sha, "git merge-base could not run")
    if 0 == ancestor.returncode:
        return TreeStatus("current", head_sha, origin_sha, "origin/main is an ancestor of HEAD")
    if 1 == ancestor.returncode:
        return TreeStatus("stale", head_sha, origin_sha, "origin/main is not an ancestor of HEAD")
    return TreeStatus("unknown", head_sha, origin_sha, f"git merge-base failed: {ancestor.stderr.strip()}")


def _same_file(a: Path, b: Path) -> bool:
    try:
        return os.path.samefile(a, b)
    except OSError:
        return a.resolve() == b.resolve()


def _stale_message(status: TreeStatus, tree: Path, label: str) -> str:
    head = status.head[:9]
    origin = status.origin[:9]
    return (
        f"REFUSED: {label} will not write the shared framework database from this checkout.\n"
        f"  This checkout ({tree}) is at commit {head}, which does not contain origin/main ({origin}).\n"
        "  Every session shares one database file, and a reseed from an old checkout puts its old\n"
        "  tables and rows back into it.\n"
        "  Fix: run the reseed from the main checkout after `git pull --rebase`, or from a fresh\n"
        "  worktree at origin/main (`git fetch`, then `git worktree add <dir> origin/main`).\n"
        f"  If you really mean to write from this old tree, add {OVERRIDE_FLAG}."
    )


def enforce(
    tree: Path,
    *,
    allow_stale: bool = False,
    dry_run: bool = False,
    target_db: Path | None = None,
    shared_dbs: Iterable[Path] = (),
    label: str = "this script",
) -> str:
    """Exit 2 when ``tree`` is stale; otherwise return the state that was acted on.

    Returns ``skipped`` (nothing to guard), ``current``, ``unknown`` (warned) or ``stale``
    (override flag given, warned).
    """
    if dry_run:
        return "skipped"
    shared = tuple(shared_dbs)
    if target_db is not None and shared and not any(_same_file(Path(target_db), s) for s in shared):
        return "skipped"
    status = check_tree(tree)
    if "current" == status.state:
        return "current"
    if "unknown" == status.state:
        print(
            f"WARNING: {label} could not check whether this checkout is behind origin/main "
            f"({status.detail}); carrying on, because that is not proof the tree is stale.",
            file=sys.stderr,
        )
        return "unknown"
    if allow_stale:
        print(
            f"WARNING: {label} is writing the shared framework database from a checkout at "
            f"{status.head[:9]} that is behind origin/main ({status.origin[:9]}); {OVERRIDE_FLAG} was given.",
            file=sys.stderr,
        )
        return "stale"
    print(_stale_message(status, tree, label), file=sys.stderr)
    raise SystemExit(EXIT_STALE)


if __name__ == "__main__":
    here = Path(__file__).resolve().parent
    result = check_tree(here)
    print(f"{result.state}: HEAD {result.head[:9]} origin/main {result.origin[:9]} ({result.detail})")
    sys.exit(EXIT_STALE if "stale" == result.state else 0)
