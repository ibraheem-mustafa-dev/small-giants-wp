#!/usr/bin/env python3
"""
Per-tier section padding and gutter tokens (Spec 32 FR-32-15), added to the framework theme.json and every
client snapshot at the values each one renders today.

    python scripts/migrate-section-gutter-tokens.py --survey            census: which file lacks which token
    python scripts/migrate-section-gutter-tokens.py --survey --json     the census as JSON
    python scripts/migrate-section-gutter-tokens.py --fix               dry run: a unified diff per file
    python scripts/migrate-section-gutter-tokens.py --fix --apply       write it
    python scripts/migrate-section-gutter-tokens.py --check             gate: exit 1 while any file lacks a token
    python scripts/migrate-section-gutter-tokens.py --self-test         assertions + a negative control

Tokens: settings.custom.section.padding.{mobile,tablet,desktop} (a section's top and bottom padding) and
settings.custom.gutter.{mobile,tablet,desktop} (the side padding), read by theme/sgs-theme/assets/css/layout-tokens.css.
Values that keep today's rendering (snapshot_layout_tokens.py::todays_values): the gutter is the file's root side
padding, or 0 when it sets none; section padding is 0. An existing token is never overwritten.

Every file round-trips byte-for-byte through json.loads/json.dumps (tab or space indent as found, the file's own
line endings, non-ASCII kept), which the script asserts before writing; writes are atomic (.tmp then os.replace).
"""
from __future__ import annotations

import argparse
import copy
import difflib
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import snapshot_layout_tokens as tokens  # noqa: E402

ROOT = tokens.REPO_ROOT
FRAMEWORK = tokens.FRAMEWORK_THEME_JSON


def targets(root: Path = ROOT) -> list[Path]:
    return [root / "theme" / "sgs-theme" / "theme.json"] + sorted((root / "sites").glob("*/theme-snapshot.json"))


def _format(raw: str) -> tuple[object, str, bool]:
    """(indent, newline, trailing newline) of a JSON file."""
    nl = "\r\n" if "\r\n" in raw else "\n"
    second = raw.split("\n")[1].replace("\r", "") if "\n" in raw else ""
    indent: object = "\t" if second.startswith("\t") else len(second) - len(second.lstrip(" "))
    return indent, nl, raw.endswith("\n")


def dump(data: dict, raw: str) -> str:
    indent, nl, trailing = _format(raw)
    out = json.dumps(data, indent=indent, ensure_ascii=False).replace("\n", nl)
    return out + (nl if trailing else "")


def plan(data: dict) -> dict[str, str]:
    """Token path -> value for every token the file lacks."""
    wanted = tokens.todays_values(data)
    return {path: value for path, value in wanted.items() if tokens.token_value(data, path) is None}


def apply_plan(data: dict, additions: dict[str, str]) -> dict:
    out = copy.deepcopy(data)
    settings = out.setdefault("settings", {})
    custom = settings.setdefault("custom", {})
    for path, value in additions.items():
        node = custom
        keys = path.split(".")
        for key in keys[:-1]:
            node = node.setdefault(key, {})
        node[keys[-1]] = value
    return out


def survey(root: Path = ROOT) -> list[dict]:
    rows = []
    for path in targets(root):
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        additions = plan(data)
        rows.append({
            "file": path.relative_to(root).as_posix(),
            "roundtrip": dump(data, raw) == raw,
            "missing": sorted(additions),
            "values": additions,
        })
    return rows


def fix(root: Path = ROOT, write: bool = False) -> int:
    changed = 0
    for path in targets(root):
        raw = path.open(encoding="utf-8", newline="").read()
        data = json.loads(raw)
        if dump(data, raw) != raw:
            print(f"REFUSED {path.relative_to(root).as_posix()}: does not round-trip through JSON unchanged", file=sys.stderr)
            return 2
        additions = plan(data)
        if not additions:
            continue
        new = dump(apply_plan(data, additions), raw)
        changed += 1
        rel = path.relative_to(root).as_posix()
        if write:
            tmp = path.with_suffix(path.suffix + ".tmp")
            with tmp.open("w", encoding="utf-8", newline="") as fh:
                fh.write(new)
            os.replace(tmp, path)
            print(f"wrote {rel}: {', '.join(f'{k}={v}' for k, v in additions.items())}")
        else:
            sys.stdout.writelines(difflib.unified_diff(
                raw.splitlines(True), new.splitlines(True), f"a/{rel}", f"b/{rel}"))
    print(f"{'Applied to' if write else 'Would change'} {changed} file(s).")
    return 0


def check(root: Path = ROOT) -> int:
    problems = []
    for row in survey(root):
        if row["missing"]:
            problems.append(f"  {row['file']}: lacks {', '.join(row['missing'])}")
        if not row["roundtrip"]:
            problems.append(f"  {row['file']}: does not round-trip through JSON unchanged")
    required = tokens.framework_layout_tokens(root / "theme" / "sgs-theme" / "theme.json")
    if len(required) != 6:
        problems.append(f"  the framework theme.json declares {len(required)} layout tokens, expected 6")
    for line in problems:
        print(line)
    print(f"Section and gutter tokens: {len(problems)} problem(s)")
    return 1 if problems else 0


def self_test() -> int:
    failures = []
    base = {"version": 3, "settings": {"custom": {"borderRadius": {"small": "4px"}}},
            "styles": {"spacing": {"padding": {"left": "var:preset|spacing|40", "right": "var:preset|spacing|40"}}}}
    plain = {"version": 3, "settings": {}}

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "theme" / "sgs-theme").mkdir(parents=True)
        (root / "sites" / "a").mkdir(parents=True)
        (root / "sites" / "b").mkdir(parents=True)
        (root / "theme" / "sgs-theme" / "theme.json").write_text(json.dumps(base, indent="\t") + "\n", encoding="utf-8")
        (root / "sites" / "a" / "theme-snapshot.json").write_text(json.dumps(base, indent=2) + "\n", encoding="utf-8")
        (root / "sites" / "b" / "theme-snapshot.json").write_text(json.dumps(plain, indent=2), encoding="utf-8")

        if check(root) != 1:
            failures.append("negative control: --check passed files that lack every token")
        before_b = (root / "sites" / "b" / "theme-snapshot.json").read_text(encoding="utf-8")
        if fix(root, write=True) != 0:
            failures.append("--fix --apply failed")
        if check(root) != 0:
            failures.append("--check still fails after --fix --apply")
        a = json.loads((root / "sites" / "a" / "theme-snapshot.json").read_text(encoding="utf-8"))
        if tokens.token_value(a, "gutter.tablet") != "var(--wp--preset--spacing--40)":
            failures.append("a preset root padding did not become the gutter variable")
        if tokens.token_value(a, "section.padding.desktop") != "0":
            failures.append("section padding is not 0")
        if a["settings"]["custom"]["borderRadius"] != {"small": "4px"}:
            failures.append("an existing custom key was disturbed")
        b = json.loads((root / "sites" / "b" / "theme-snapshot.json").read_text(encoding="utf-8"))
        if tokens.token_value(b, "gutter.mobile") != "0":
            failures.append("a file with no root padding did not get a 0 gutter")
        if not (root / "sites" / "b" / "theme-snapshot.json").read_text(encoding="utf-8").startswith("{\n  "):
            failures.append("the file's indent was not kept")
        if before_b.endswith("\n"):
            failures.append("fixture error: b should have no trailing newline")
        # Idempotence: a second apply changes nothing.
        snapshot = {p: p.read_bytes() for p in targets(root)}
        fix(root, write=True)
        if any(p.read_bytes() != data for p, data in snapshot.items()):
            failures.append("a second --fix --apply changed a file")
        # An existing token is never overwritten.
        a["settings"]["custom"]["gutter"]["mobile"] = "12px"
        (root / "sites" / "a" / "theme-snapshot.json").write_text(json.dumps(a, indent=2) + "\n", encoding="utf-8")
        fix(root, write=True)
        a2 = json.loads((root / "sites" / "a" / "theme-snapshot.json").read_text(encoding="utf-8"))
        if tokens.token_value(a2, "gutter.mobile") != "12px":
            failures.append("an existing token was overwritten")
        # The negative control again: one token removed turns the gate red.
        del a2["settings"]["custom"]["section"]["padding"]["tablet"]
        (root / "sites" / "a" / "theme-snapshot.json").write_text(json.dumps(a2, indent=2) + "\n", encoding="utf-8")
        if check(root) != 1:
            failures.append("negative control: --check passed a snapshot missing section.padding.tablet")

    for f in failures:
        print(f"FAIL {f}")
    print("[migrate-section-gutter-tokens --self-test] " + ("ALL ASSERTIONS PASS." if not failures else f"{len(failures)} FAILURE(S)."))
    return 1 if failures else 0


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--fix", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    ap.add_argument("--apply", action="store_true", help="with --fix: write the files")
    ap.add_argument("--json", action="store_true", help="with --survey: print JSON")
    args = ap.parse_args()
    if args.survey:
        rows = survey()
        if args.json:
            print(json.dumps(rows, indent=2))
        else:
            for row in rows:
                state = "ok" if not row["missing"] else f"adds {row['values']}"
                print(f"{row['file']}: {state}{'' if row['roundtrip'] else ' (DOES NOT ROUND-TRIP)'}")
        return 0
    if args.fix:
        return fix(write=args.apply)
    if args.check:
        return check()
    return self_test()


if __name__ == "__main__":
    sys.exit(main())
