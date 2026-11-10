#!/usr/bin/env python3
"""Spec 49 §13 migration detector: survey, fix, check, self-test.

  cli.py survey [--json] [--out FILE] [--repo] [--mirror NAME]... [--content FILE]...
  cli.py fix    [--dry-run | --apply] [--target KIND]... [--file PATH]... [--content FILE]...
  cli.py check  [--active auto|on|off] [--target KIND]... [--content FILE]...
  cli.py rows   [--json]
  cli.py self-test

`survey` counts old attributes per block and per target. `fix` rewrites block attributes per the mapping rows
(dry run prints a unified diff; `--apply` writes repo files atomically and refuses saved content). `check` exits 1 while
any old attribute remains on a target; it stays silent (exit 0) until a block declares `kinds` on a media slot
(`--active auto`), the cutover marker of Spec 49 §8.3. `self-test` runs the fixtures, negative controls and the
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

MEDIAISH = re.compile(r"image|video|svg|photo|avatar|logo|poster|thumb|aspectratio|objectfit|objectposition|focal|lottie|^media", re.I)
NOT_MEDIA = re.compile(r"Typography|FontFamily|FontSize|FontStyle|FontWeight|LetterSp|LineHeight|TextStroke|TextTrans|TextDec|"
                       r"TextWrap|WritingMode|^caption|^videoTime|Colour|Hover|HideOn|^icon|Icon", re.I)
CHECK_KINDS = ("patterns", "theme-templates", "build", "fixtures", "calibration")


def records(args) -> list[tuple[str, str, dict]]:
    """(target label, block name, attributes) over every selected target."""
    out: list[tuple[str, str, dict]] = []
    kinds = args.target or (list(C.repo_targets()) if getattr(args, "repo", True) or not (args.mirror or args.content) else [])
    if kinds:
        targets = C.repo_targets()
        for kind in kinds:
            for path in targets.get(kind, []):
                rel = path.relative_to(M.REPO).as_posix()
                out += [(f"{kind}:{rel}", n, a) for n, a in C.file_blocks(path)]
    for name in args.mirror or []:
        out += [(f"mirror:{name}:{label}", n, a) for label, n, a in C.content_blocks(C.mirror_export(name))]
    for file in args.content or []:
        out += [(f"content:{Path(file).stem}:{label}", n, a) for label, n, a in C.content_blocks(C.load_content(Path(file)))]
    return out


def group(label: str) -> str:
    """Target group of a record label: `patterns`, `build`, `mirror:<name>` and so on."""
    parts = label.split(":")
    return ":".join(parts[:2]) if parts[0] in ("mirror", "content") else parts[0]


def survey(recs) -> dict:
    per: dict = collections.defaultdict(lambda: collections.defaultdict(lambda: {"status": "", "count": 0, "statuses": collections.Counter(), "targets": collections.Counter()}))
    instances: dict = collections.defaultdict(collections.Counter)
    pins: dict = collections.defaultdict(collections.Counter)
    unclassified: dict = collections.defaultdict(collections.Counter)
    seen: dict = collections.defaultdict(collections.Counter)
    for label, name, attrs in recs:
        g = group(label)
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


def fn_for(_name: str, _attrs: dict):
    new, _ = B.migrate(_name, _attrs)
    return new


def unified(label: str, before: str, after: str) -> str:
    return "".join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), f"a/{label}", f"b/{label}"))


def cmd_fix(args) -> int:
    if args.apply and (args.content or args.mirror):
        raise SystemExit("--apply never writes saved content: this package prints the diff only")
    changed = 0
    files: list[Path] = [Path(f) for f in args.file or []]
    if not files and not args.content:
        targets = C.repo_targets()
        for kind in args.target or CHECK_KINDS:
            files += targets.get(kind, [])
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
        for post in C.load_content(Path(file)):
            after, count = C.rewrite_post(post, fn_for)
            if count:
                changed += 1
                label = f"{Path(file).stem}/{post.get('post_type')}-{post.get('ID')}"
                print(f"# {label}: {count} block(s) rewritten (dry run only)")
                sys.stdout.write(unified(label, post["post_content"], after))
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
    args.repo = True
    args.mirror = []
    args.target = args.target or list(CHECK_KINDS)
    found: collections.Counter = collections.Counter()
    where: dict = {}
    for label, name, attrs in records(args):
        if "__unparseable__" in attrs:
            continue
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
    rows = M.rows()
    if args.json:
        print(json.dumps(rows, indent=1, ensure_ascii=False))
    else:
        for row in rows:
            print(f"{row['block']:24} {row['old']:34} {row['family']:15} {row['target']}")
        print(f"\n{len(rows)} rows", file=sys.stderr)
    return 0


def main(argv=None) -> int:
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
        if name == "fix":
            p.add_argument("--apply", action="store_true")
            p.add_argument("--dry-run", action="store_true")
            p.add_argument("--file", action="append")
            p.add_argument("--mirror", action="append")
        if name == "check":
            p.add_argument("--active", choices=("auto", "on", "off"), default="auto")
            p.add_argument("--self-test", action="store_true", help="run the self-test first (the gate form)")
    rows_parser = sub.add_parser("rows")
    rows_parser.add_argument("--json", action="store_true")
    sub.add_parser("self-test").add_argument("--break", dest="break_mapping", action="store_true",
                                             help="run against a deliberately broken mapping: must exit 1")
    args = parser.parse_args(argv)
    if args.cmd == "self-test":
        import selftest
        return selftest.run(args.break_mapping)
    return {"survey": cmd_survey, "fix": cmd_fix, "check": cmd_check, "rows": cmd_rows}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
