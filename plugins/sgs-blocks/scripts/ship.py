#!/usr/bin/env python3
"""ship.py - one command from a committed tree to a deployed, published, pushed release.

    python plugins/sgs-blocks/scripts/ship.py --target <site> [--reseed auto|yes|no] [--takeover] [--no-push] [--plan]

Steps, each stopping the run on failure:
  1. Preconditions: tracked files under plugins/ and theme/ are clean, and HEAD is not behind origin/main (rebase first:
     the gate pass is keyed on HEAD's tree, so a rebase after gating would void it).
  2. Reseed only when it is needed (--reseed auto): the shared framework DB lacks an attribute some block.json declares
     (read from the DB itself, because generated files can be committed by a private reseed that was never published),
     or the composition seeder or the DB seeder changed since the last commit that wrote any of the generated files
     (GENERATED; a change to those files themselves never triggers a reseed). The reseed runs on a private copy (publish-framework-db.py begin, sgs-update-v2.py --db, seed_reference_data.py, regenerate) and the
     regenerated files are committed.
  3. ONE build-deploy.py pass for the target, with SGS_FRAMEWORK_DB pointing at the copy when reseeded: build, both gate
     tiers and the deploy; with --editor-check (off by default) also the editor check on the target's own mirror
     (TARGETS["editor_mirror"] in deploy_common.py).
     That pass records the gate pass publish needs, so no separate --gate-only run is made.
  4. Publish the copy to the shared framework DB (only when reseeded).
  5. git push origin HEAD:main (unless --no-push).
Another session's commits between your "starting" and "done" messages reject the push; send them before running this.
--plan prints the steps it would run and exits 0. Self-test: python plugins/sgs-blocks/scripts/tests/test_ship.py
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS.parents[2]
sys.path.insert(0, str(SCRIPTS))
import deploy_common  # noqa: E402

GENERATED = (
    "plugins/sgs-blocks/scripts/behavioural-analyser/css-property-classifications.json",
    "plugins/sgs-blocks/scripts/consistency/attr-role-map.json",
    "plugins/sgs-blocks/scripts/consistency/roster.json",
    "plugins/sgs-blocks/scripts/dbschema/seed-history.json",
)
# A change to any of these after the last commit of a GENERATED file means the DB no longer describes the blocks.
# The GENERATED files themselves never count: dbschema/seed-history.json sits under a trigger prefix, and a reseed
# that leaves attr-role-map.json unchanged commits seed-history.json alone, so counting it made every ship reseed,
# commit and change the tree, and the gate cache (keyed on the tree) never hit.
RESEED_TRIGGERS = (
    "plugins/sgs-blocks/src/blocks/",
    "plugins/sgs-blocks/scripts/seed-composition-roles.py",
    "plugins/sgs-blocks/scripts/sgs-update-v2.py",
    "plugins/sgs-blocks/scripts/dbschema/",
)


def needs_reseed(changed: list[str]) -> list[str]:
    """The changed paths that make a reseed necessary: a block.json under src/blocks/, or a seeder file."""
    hits = []
    for path in changed:
        p = path.replace("\\", "/")
        if p in GENERATED:
            continue
        if p.startswith("plugins/sgs-blocks/src/blocks/"):
            if p.endswith("/block.json"):
                hits.append(p)
        elif any(p.startswith(t) for t in RESEED_TRIGGERS):
            hits.append(p)
    return hits


def missing_from_db(blocks_dir: Path, db: Path) -> list[str]:
    """Every `<block>::<attribute>` a block.json declares that the framework DB does not hold (read-only).

    This is the reseed condition itself: generated files can be committed by a private reseed whose publish never
    happened (its gate failed), so git history alone cannot say whether the shared DB is current."""
    import json
    import sqlite3

    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        have = set(con.execute("SELECT block_slug, attr_name FROM block_attributes"))
    finally:
        con.close()
    missing = []
    for path in sorted(blocks_dir.glob("*/block.json")):
        meta = json.loads(path.read_text(encoding="utf-8"))
        slug = meta.get("name", "")
        for attr in meta.get("attributes", {}):
            # A key starting with "_" is a note left in block.json (e.g. "_comment_..."), not an attribute WordPress registers.
            if attr.startswith("_"):
                continue
            if (slug, attr) not in have:
                missing.append(f"{slug}::{attr}")
    return missing


def last_reseed_commit(git_fn) -> str:
    """The last commit that wrote any GENERATED file: the last reseed this tree carries."""
    return git_fn("log", "-1", "--format=%H", "--", *GENERATED)


def plan(target: str, reseed: bool, copy: str, takeover: bool, push: bool,
         editor_check: bool = False) -> list[tuple[str, list[str], dict]]:
    """The ordered steps: (name, argv, extra env). Pure, so the self-test can read it."""
    py = sys.executable
    s = "plugins/sgs-blocks/scripts/"
    steps: list[tuple[str, list[str], dict]] = []
    db_env = {"SGS_FRAMEWORK_DB": copy} if reseed else {}
    if reseed:
        steps += [
            ("begin", [py, s + "publish-framework-db.py", "begin", "--copy", copy], {}),
            ("reseed", [py, s + "sgs-update-v2.py", "--db", copy], {}),
            ("seed-reference", [py, s + "dbschema/seed_reference_data.py"], db_env),
            ("regenerate", [py, s + "publish-framework-db.py", "regenerate", "--copy", copy, "--restore-first"], {}),
            ("commit-generated", ["git", "commit", "-q", "-m", "chore(db): generated files from a private reseed (ship.py)", "--", *GENERATED], {}),
        ]
    deploy = [py, s + "build-deploy.py", "--target", target]
    # The editor check opens every page of a local mirror in the block editor (about 15 minutes); it is asked for with
    # --editor-check, never run by default (Bean, 2026-11-11).
    mirror = deploy_common.TARGETS.get(target, {}).get("editor_mirror")
    if editor_check and mirror:
        deploy += ["--editor-check", mirror]
    if takeover:
        deploy.append("--takeover")
    steps.append(("build-deploy", deploy, db_env))
    if reseed:
        steps.append(("publish", [py, s + "publish-framework-db.py", "publish", "--copy", copy], {}))
    if push:
        steps.append(("push", ["git", "push", "-q", "origin", "HEAD:main"], {}))
    return steps


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, text=True, check=False).stdout.strip()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--target", required=True, help="One target from deploy_common.TARGETS")
    ap.add_argument("--reseed", choices=("auto", "yes", "no"), default="auto")
    ap.add_argument("--takeover", action="store_true", help="Passed to build-deploy.py (see its help)")
    ap.add_argument("--editor-check", action="store_true",
                    help="Also open the target's local mirror in the block editor before upload (about 15 minutes; off by default)")
    ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--plan", action="store_true", help="Print the steps and exit")
    args = ap.parse_args()
    if args.target not in deploy_common.TARGETS:
        print(f"[ship] unknown target {args.target!r}; known: {', '.join(deploy_common.TARGETS)}", file=sys.stderr)
        return 2

    dirty = [line for line in git("status", "--porcelain", "--", "plugins", "theme").splitlines() if not line.startswith("??")]
    if dirty and not args.plan:
        print("[ship] tracked files under plugins/ or theme/ are not committed:\n  " + "\n  ".join(dirty), file=sys.stderr)
        return 2
    git("fetch", "-q", "origin")
    behind = git("rev-list", "--count", "HEAD..origin/main")
    if behind not in ("", "0") and not args.plan:
        print(f"[ship] HEAD is {behind} commit(s) behind origin/main: rebase first, then run ship again.", file=sys.stderr)
        return 2

    # Reseed when the shared DB lacks an attribute some block.json declares, or a seeder changed since the last
    # generated-files commit (a seeder change alters rows without adding attributes).
    sys.path.insert(0, str(SCRIPTS / "lib"))
    from framework_db import framework_db_path  # noqa: PLC0415

    shared = Path(framework_db_path())
    missing = missing_from_db(REPO_ROOT / "plugins/sgs-blocks/src/blocks", shared) if shared.is_file() else ["(no shared DB found)"]
    marker = last_reseed_commit(git)
    changed = git("diff", "--name-only", f"{marker}..HEAD").splitlines() if marker else []
    seeders = [p for p in needs_reseed(changed) if not p.endswith("/block.json")]
    hits = missing + seeders
    reseed = {"yes": True, "no": False}.get(args.reseed, bool(hits))
    print(f"[ship] shared DB {shared}; reseed: {'yes' if reseed else 'no'}"
          + (f" ({len(hits)} reason(s): {', '.join(hits[:4])}{' ...' if len(hits) > 4 else ''})" if hits else ""))

    copy = str(Path(tempfile.gettempdir()) / f"ship-{os.getpid()}.db")
    steps = plan(args.target, reseed, copy, args.takeover, not args.no_push, args.editor_check)
    for name, argv, env in steps:
        shown = " ".join(argv[1:] if argv[0] == sys.executable else argv)
        print(f"[ship] {name}: {shown}" + (f"  (env {env})" if env else ""), flush=True)
        if args.plan:
            continue
        if name == "commit-generated":
            subprocess.run(["git", "add", "--", *GENERATED], cwd=REPO_ROOT, check=False)
            if not git("diff", "--cached", "--name-only", "--", *GENERATED):
                print("[ship] commit-generated: nothing changed")
                continue
        rc = subprocess.run(argv, cwd=REPO_ROOT, env={**os.environ, **env}, check=False).returncode
        if rc != 0:
            print(f"[ship] STOP: {name} exited {rc}", file=sys.stderr)
            return rc
    if not args.plan:
        print(f"[ship] done: main {git('rev-parse', '--short', 'HEAD')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
