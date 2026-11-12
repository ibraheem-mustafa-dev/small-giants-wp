#!/usr/bin/env python3
"""Spec 49 §13 migration detector: survey, fix, check, self-test.

  cli.py survey [--json] [--out FILE] [--repo] [--mirror NAME]... [--content FILE]...
  cli.py fix    [--dry-run | --apply] [--target KIND]... [--file PATH]... [--content FILE]... [--mirror NAME]
  cli.py check  [--active auto|on|off] [--target KIND]... [--content FILE]... [--mirror NAME]...
  cli.py restore (--mirror NAME | --remote TARGET) --backup FILE
  (survey, fix and check also take --remote TARGET: a live test site over SSH; fix --remote --apply backs up on the server first)
  cli.py rows   [--json | --regenerate]
  cli.py self-test [--break] [--mirror [--keep]]

The mapping rows and the facts they rest on are frozen in `mapping-frozen.json`; every command reads that file, never the
PHP mirror or the block.json files. `rows --regenerate` is refused; it used to rebuild it from the live files and refused once a block declared
`kinds` on a media slot.

`survey` counts old attributes per block and per target. `fix` rewrites block attributes per the mapping rows
(dry run prints a unified diff; `--apply` writes repo files atomically). `fix --mirror NAME --apply` rewrites the saved
content of a local mirror (`mirror.py`): database backup first, direct `$wpdb` writes, then the backup path and the restore
command; `restore` returns a mirror to a backup. Saved content means every store holding block markup: all post types and
statuses, post meta and options (`export-content.php`). `check` exits 1 while
any old attribute remains on a target (with `--mirror` or `--content` it reads only those, unless `--target` is named); it stays silent (exit 0) until a block declares `kinds` on a media slot
(`--active auto`), the cutover marker of Spec 49 §8.3. While some blocks `media-adoption.json` lists have not adopted,
`fix` and `check --active auto` touch only the adopted blocks (`mapping.migration_scope`; `--all-blocks` lifts it), so a
wave's migration never hands an unadopted block attributes its render.php cannot read. `self-test` runs the fixtures, negative controls and the
idempotence proof.
"""
from __future__ import annotations

import argparse
import collections
import difflib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import blocks as B  # noqa: E402
import corpus as C  # noqa: E402
import mapping as M  # noqa: E402
import mirror as MIR  # noqa: E402
import remote as REM  # noqa: E402
import sizes as S  # noqa: E402

MEDIAISH = re.compile(r"image|video|svg|photo|avatar|logo|poster|thumb|aspectratio|objectfit|objectposition|focal|lottie|^media", re.I)
NOT_MEDIA = re.compile(r"Typography|FontFamily|FontSize|FontStyle|FontWeight|LetterSp|LineHeight|TextStroke|TextTrans|TextDec|"
                       r"TextWrap|WritingMode|^caption|^videoTime|Colour|Hover|HideOn|^icon|Icon", re.I)
CHECK_KINDS = ("patterns", "theme-templates", "build", "fixtures", "calibration")


def records(args) -> list[tuple[str, str, dict]]:
    """(target label, block name, attributes) over every selected target."""
    out: list[tuple[str, str, dict]] = []
    kinds = args.target or (list(C.repo_targets()) if getattr(args, "repo", True) or not (args.mirror or args.content or getattr(args, "remote", None)) else [])
    if kinds:
        targets = C.repo_targets()
        for kind in kinds:
            for path in targets.get(kind, []):
                rel = path.relative_to(M.REPO).as_posix()
                out += [(f"{kind}:{rel}", n, a) for n, a in C.file_blocks(path)]
    for name in args.mirror or []:
        out += [(f"mirror:{name}:{label}", n, a) for label, n, a in C.content_blocks(C.mirror_export(name))]
    for name in getattr(args, "remote", None) or []:
        out += [(f"remote:{name}:{label}", n, a) for label, n, a in C.content_blocks(REM.remote_export(name))]
    for file in args.content or []:
        out += [(f"content:{Path(file).stem}:{label}", n, a) for label, n, a in C.content_blocks(C.load_content(Path(file)))]
    return out


def group(label: str) -> str:
    """Target group of a record label: `patterns`, `build`, `mirror:<name>` and so on."""
    parts = label.split(":")
    return ":".join(parts[:2]) if parts[0] in ("mirror", "remote", "content") else parts[0]


def site_key(label: str) -> str:
    """The site a record belongs to, for reading image sizes: `mirror:NAME`, `content:STEM`, or `repo` for repo files."""
    g = group(label)
    return g if g.startswith(("mirror:", "remote:", "content:")) else "repo"


def survey(recs) -> dict:
    per: dict = collections.defaultdict(lambda: collections.defaultdict(lambda: {"status": "", "count": 0, "statuses": collections.Counter(), "targets": collections.Counter()}))
    instances: dict = collections.defaultdict(collections.Counter)
    pins: dict = collections.defaultdict(collections.Counter)
    unclassified: dict = collections.defaultdict(collections.Counter)
    seen: dict = collections.defaultdict(collections.Counter)
    for label, name, attrs in recs:
        g = group(label)
        S.activate(site_key(label))
        seen[name][g] += 1
        if "__unparseable__" in attrs:
            unclassified[name]["__unparseable__"] += 1
            continue
        new, events, in_place = B.needs_migration(name, attrs)
        touched = set()
        for event in events:
            status, old, target, note = event
            if status == "pinned":
                pins[name][old] += 1
                continue
            row = per[name][old]
            row["statuses"][status] += 1
            row["target"], row["note"] = target or row.get("target", ""), note or row.get("note", "")
            row["count"] += 1
            row["targets"][g] += 1
            touched.add(old)
        for old in in_place:
            row = per[name][old]
            row["statuses"]["converted"] += 1
            row["target"] = row.get("target", old)
            row["note"] = row.get("note", "value reshaped in place (same attribute name)")
            row["count"] += 1
            row["targets"][g] += 1
            touched.add(old)
        if touched:
            instances[name][g] += 1
        known = {r["target"] for r in M.rows() if r["block"] in (name, "*")}
        for attr in attrs:
            if (not name.startswith("sgs/") or attr in touched or attr in known or attr in M.STAYS.get(name, ())
                    or not MEDIAISH.search(attr) or NOT_MEDIA.search(attr) or attrs[attr] in ([], {}, "", None)):
                continue
            unclassified[name][attr] += 1
    for attrs in per.values():
        for row in attrs.values():
            order = ("refused", "reported", "deleted", "converted")
            row["status"] = next(s for s in order if row["statuses"].get(s))
    return {
        "blocks": {n: {a: {**v, "statuses": dict(v["statuses"]), "targets": dict(v["targets"])} for a, v in sorted(attrs.items())} for n, attrs in sorted(per.items())},
        "blockInstancesWithOldAttributes": {n: dict(c) for n, c in sorted(instances.items())},
        "pinnedDefaults": {n: dict(c) for n, c in sorted(pins.items())},
        "unclassifiedMediaLooking": {n: dict(c) for n, c in sorted(unclassified.items())},
        "blockInstancesSeen": {n: dict(c) for n, c in sorted(seen.items())},
    }


def print_survey(result: dict) -> None:
    print("OLD ATTRIBUTES PER BLOCK (count of saved attributes; status = converted | deleted | reported | refused)")
    for block, attrs in result["blocks"].items():
        print(f"\n{block}  ({sum(result['blockInstancesWithOldAttributes'].get(block, {}).values())} blocks affected)")
        for attr, row in attrs.items():
            where = ", ".join(f"{k} {v}" for k, v in sorted(row["targets"].items()))
            mixed = "" if len(row["statuses"]) == 1 else "  (" + ", ".join(f"{k} {v}" for k, v in row["statuses"].items()) + ")"
            print(f"  {attr:34} {row['status']:9} x{row['count']:<4} -> {row.get('target') or '-':26} [{where}]{mixed}")
    if result["pinnedDefaults"]:
        print("\nPINNED OLD DEFAULTS (written explicitly by fix)")
        for block, attrs in result["pinnedDefaults"].items():
            print(f"  {block}: " + ", ".join(f"{a} x{n}" for a, n in attrs.items()))
    if result["unclassifiedMediaLooking"]:
        print("\nMEDIA-LOOKING ATTRIBUTES WITH NO ROW (read these: each is a mapping gap or a non-media name)")
        for block, attrs in result["unclassifiedMediaLooking"].items():
            print(f"  {block}: " + ", ".join(f"{a} x{n}" for a, n in sorted(attrs.items())))


def cmd_survey(args) -> int:
    result = survey(records(args))
    result["mappingRows"] = len(M.rows())
    if args.out:
        Path(args.out).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print_survey(result)
    return 0


SCOPE: frozenset[str] | None = None


def set_scope(args) -> None:
    """Limit fix and check to the adopted blocks while adoption is partial (`mapping.migration_scope`);
    `--all-blocks` lifts the limit."""
    global SCOPE
    SCOPE = None if getattr(args, "all_blocks", False) else M.migration_scope()
    if SCOPE is not None:
        print(f"migrate-media-system: adoption is partial; scope is the {len(SCOPE)} adopted block(s): "
              + ", ".join(sorted(SCOPE)) + " (--all-blocks for every block)", file=sys.stderr)


def in_scope(name: str) -> bool:
    return SCOPE is None or name in SCOPE


def fn_for(_name: str, _attrs: dict):
    if not in_scope(_name):
        return _attrs
    new, _ = B.migrate(_name, _attrs)
    return new


def unified(label: str, before: str, after: str) -> str:
    return "".join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), f"a/{label}", f"b/{label}"))


def saved_only_scope(args) -> bool:
    """True when `--content` or `--mirror` is named and nothing asks for repo files (`--repo`, `--target`, `--file`)."""
    return bool(args.mirror or args.content or getattr(args, "remote", None)) and not (getattr(args, "repo", False) or args.target or getattr(args, "file", None))


def refuse_unsupported_saved(args) -> None:
    """Refuse on every saved-content input (mirror or content file) that holds a record this tool cannot rewrite."""
    for name in args.mirror or []:
        MIR.refuse_unsupported(C.mirror_export(name), f"mirror {name}")
    for name in getattr(args, "remote", None) or []:
        MIR.refuse_unsupported(REM.remote_export(name), f"remote {name}")
    for file in args.content or []:
        MIR.refuse_unsupported(C.load_content(Path(file)), f"content {Path(file).name}")


def cmd_fix(args) -> int:
    if args.apply and args.dry_run:
        raise SystemExit("--apply and --dry-run exclude each other")
    if args.apply and args.content:
        raise SystemExit("--apply never writes a --content export file: use --mirror NAME to write a mirror, or run the dry run")
    if len(args.mirror or []) + len(args.remote or []) > 1 and args.apply:
        raise SystemExit("--apply writes one mirror or remote target at a time")
    refuse_unsupported_saved(args)
    set_scope(args)
    changed = 0
    files: list[Path] = [Path(f) for f in args.file or []]
    saved_only = saved_only_scope(args)
    if not files and not saved_only:
        targets = C.repo_targets()
        for kind in args.target or CHECK_KINDS:
            files += targets.get(kind, [])
    S.activate("repo")
    for path in files:
        before = C.read_text(path)
        after, count, reformatted = C.rewrite_file_text(path, fn_for)
        if after == before:
            continue
        changed += 1
        label = path.resolve().relative_to(M.REPO).as_posix() if M.REPO in path.resolve().parents else str(path)
        print(f"# {label}: {count} block(s) rewritten" + (" (JSON re-serialised: whole-file diff)" if reformatted else ""))
        if args.apply:
            C.write_atomic(path, after)
        else:
            sys.stdout.write(unified(label, before, after))
    for file in args.content or []:
        posts = C.load_content(Path(file))
        S.activate(f"content:{Path(file).stem}")
        for post in posts:
            after, count = C.rewrite_post(post, fn_for)
            if count:
                changed += 1
                label = f"{Path(file).stem}/{post.get('post_type')}-{post.get('ID')}"
                print(f"# {label}: {count} block(s) rewritten (dry run only)")
                sys.stdout.write(unified(label, post["post_content"], after))
    for name in args.mirror or []:
        posts = C.mirror_export(name)
        S.activate(f"mirror:{name}")
        plan = MIR.plan_rewrites(posts, fn_for)
        changed += len(plan)
        if args.apply and plan:
            MIR.apply_fix(name, plan)
        elif not args.apply:
            MIR.print_diffs(plan, unified)
            print(f"mirror {name}: {len(plan)} row(s) would change (dry run: nothing written)", file=sys.stderr)
        else:
            print(f"mirror {name}: nothing to rewrite; no backup taken", file=sys.stderr)
    for name in args.remote or []:
        posts = REM.remote_export(name)
        S.activate(f"remote:{name}")
        plan = MIR.plan_rewrites(posts, fn_for)
        changed += len(plan)
        if args.apply and plan:
            REM.get(name).apply_fix(plan)
        elif not args.apply:
            MIR.print_diffs(plan, unified)
            print(f"remote {name}: {len(plan)} row(s), {sum(r['blocks'] for r in plan)} block(s) would change (dry run: nothing written)", file=sys.stderr)
        else:
            print(f"remote {name}: nothing to rewrite; no backup taken", file=sys.stderr)
    print(f"\n{'applied to' if args.apply else 'would change'} {changed} file(s)/post(s)", file=sys.stderr)
    return 0


def cmd_check(args) -> int:
    if args.self_test:
        import selftest
        if selftest.run():
            return 1
    active = args.active == "on" or (args.active == "auto" and M.any_block_adopted())
    if not active:
        print("migrate-media-system check: inactive (no block declares `kinds` on a media slot yet); nothing to enforce")
        return 0
    saved_only = saved_only_scope(args)
    args.repo = not saved_only
    args.target = args.target or ([] if saved_only else list(CHECK_KINDS))
    refuse_unsupported_saved(args)
    if args.active == "auto":
        set_scope(args)
    found: collections.Counter = collections.Counter()
    where: dict = {}
    for label, name, attrs in records(args):
        if "__unparseable__" in attrs or not in_scope(name):
            continue
        S.activate(site_key(label))
        for attr, status in B.old_attributes(name, attrs):
            found[(name, attr, status)] += 1
            where.setdefault((name, attr, status), label)
    if not found:
        print("migrate-media-system check: 0 old media attributes on any target")
        return 0
    print(f"migrate-media-system check: {sum(found.values())} old media attribute(s) remain across {len(found)} (block, attribute) pairs")
    for (name, attr, status), count in sorted(found.items())[:40]:
        print(f"  {name} {attr} [{status}] x{count}  first in {where[(name, attr, status)]}")
    return 1


def cmd_rows(args) -> int:
    if args.regenerate:
        data = M.regenerate()
        print(f"regenerated {M.FROZEN.name}: {len(data['rows'])} rows, {len(data['declared'])} blocks", file=sys.stderr)
        return 0
    rows = M.rows()
    if args.json:
        print(json.dumps(rows, indent=1, ensure_ascii=False))
    else:
        for row in rows:
            print(f"{row['block']:24} {row['old']:34} {row['family']:15} {row['target']}")
        print(f"\n{len(rows)} rows", file=sys.stderr)
    return 0


def main(argv=None) -> int:
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    for name in ("survey", "fix", "check"):
        p = sub.add_parser(name)
        p.add_argument("--target", action="append", help="repo target kind: " + ", ".join(C.repo_targets()))
        p.add_argument("--content", action="append", help="a wp-cli `post list --format=json` export file")
        if name == "survey":
            p.add_argument("--json", action="store_true")
            p.add_argument("--out")
            p.add_argument("--repo", action="store_true", help="include the repo targets (default when nothing else is named)")
            p.add_argument("--mirror", action="append", help="read-only wp-cli export of a local mirror: " + "a folder name under /var/www/local-")
            p.add_argument("--remote", action="append", help="read-only export of a live test site over SSH: a deploy_common.TARGETS key")
        if name != "survey":
            p.add_argument("--repo", action="store_true", help="include the repo targets (default when no --content or --mirror is named)")
            p.add_argument("--all-blocks", action="store_true",
                           help="every block, even while adoption is partial (default: only the adopted blocks until all have adopted)")
        if name == "fix":
            p.add_argument("--apply", action="store_true")
            p.add_argument("--dry-run", action="store_true")
            p.add_argument("--file", action="append")
            p.add_argument("--mirror", action="append", help="a local mirror's saved content (a folder name under /var/www/local-)")
            p.add_argument("--remote", action="append", help="a live test site's saved content over SSH (a deploy_common.TARGETS key); --apply backs up on the server first")
        if name == "check":
            p.add_argument("--mirror", action="append", help="a local mirror's saved content (a folder name under /var/www/local-)")
            p.add_argument("--remote", action="append", help="a live test site's saved content over SSH (a deploy_common.TARGETS key)")
            p.add_argument("--active", choices=("auto", "on", "off"), default="auto")
            p.add_argument("--self-test", action="store_true", help="run the self-test first (the gate form)")
    restore_parser = sub.add_parser("restore", help="import a database backup `fix --mirror --apply` made")
    restore_parser.add_argument("--mirror")
    restore_parser.add_argument("--remote", help="a deploy_common.TARGETS key: import a backup on that server")
    restore_parser.add_argument("--backup", required=True, help="the backup path `fix` printed (WSL path)")
    rows_parser = sub.add_parser("rows")
    rows_parser.add_argument("--json", action="store_true")
    rows_parser.add_argument("--regenerate", action="store_true", help="rebuild the frozen rows from the live files (refused after adoption)")
    self_test = sub.add_parser("self-test")
    self_test.add_argument("--break", dest="break_mapping", action="store_true", help="run against a deliberately broken mapping: must exit 1")
    self_test.add_argument("--mirror", action="store_true", help="also prove fix, check and restore on a scratch copy of local-sandybrown (needs WSL)")
    self_test.add_argument("--keep", action="store_true", help="with --mirror: keep the scratch mirror afterwards")
    args = parser.parse_args(argv)
    if args.cmd == "self-test":
        import selftest
        code = selftest.run(args.break_mapping)
        if args.mirror and not args.break_mapping:
            import mirror_selftest
            code = mirror_selftest.run(args.keep) or code
        return code
    if args.cmd == "restore":
        if bool(args.mirror) == bool(args.remote):
            raise SystemExit("restore needs exactly one of --mirror NAME or --remote TARGET")
        if args.remote:
            REM.get(args.remote).restore(args.backup)
        else:
            MIR.restore(args.mirror, args.backup)
        return 0
    return {"survey": cmd_survey, "fix": cmd_fix, "check": cmd_check, "rows": cmd_rows}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
