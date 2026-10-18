#!/usr/bin/env python3
"""
check-rule-labels.py: the framework principles are cited as FP-<n>, never by an archived spec's number.

THE RULE (Bean, 2026-10-18)
---------------------------
The binding framework principles live in `.claude/rules/framework-principles.md` and are cited as
`FP-<n>`. Their old labels (`R-31-<n>` from the archived Spec 31, `R-22-<n>` from the archived
Spec 22) read as references to specs that no longer govern anything, so they may not appear in
live files.

HOW TO READ THE RULES BELOW
---------------------------
  RENAMED    old label -> FP-<n>, for every old label whose principle is in the rules file with the
             same meaning. `--fix` rewrites these in place.
  RETIRED    any other old label: its principle was dropped when its spec was archived, or the two
             old specs gave the number different meanings (Spec 22's rules 4 and 6 are not FP-4 and FP-6).
             `--check` reports each one; it is rewritten by hand in plain words, never mapped.
  SCOPE      tracked and untracked-but-not-ignored text files (`git ls-files -co --exclude-standard`).
  EXEMPT_PREFIXES  frozen history that is never rewritten: archive folders, page-content backups,
             the in-repo session memory and absorbed drafts. They cite the old labels; the rules
             file's last line says how to read them.

MODES
-----
  --survey     Count old labels by label and list each file.
  --check      Exit 1 when any old label remains outside the exempt folders.
  --fix        Rewrite every RENAMED label in place; RETIRED labels are listed for a hand rewrite.
  --self-test  Prove the detector renames, reports a retired label and ignores an exempt folder.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parent.parent

CURRENT = {1, 4, 5, 6, 8, 9, 11, 13, 14}
RENAMED = {("31", n): n for n in CURRENT} | {("22", n): n for n in (1, 5, 9, 11, 13, 14)}

LABEL = re.compile(r"(?<![A-Za-z0-9-])R-(31|22)-(\d+)(?!\d)")

EXEMPT_PREFIXES = (
    ".claude/archive/",
    ".claude/backups/",
    ".claude/memory/",
    ".claude/scratch/absorbed/",
    "memory/",
)
EXEMPT_PARTS = ("/archive/",)
MAX_BYTES = 5_000_000


def exempt(rel: str) -> bool:
    return rel.startswith(EXEMPT_PREFIXES) or any(part in "/" + rel for part in EXEMPT_PARTS)


def files() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files", "-co", "--exclude-standard"], cwd=REPO, capture_output=True, text=True, check=True
    ).stdout
    return [f for f in out.splitlines() if f and not exempt(f)]


def read(path: Path) -> str | None:
    try:
        if path.stat().st_size > MAX_BYTES:
            return None
        return path.read_bytes().decode("utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def rename(text: str) -> tuple[str, list[str]]:
    """The text with every RENAMED label rewritten, and the RETIRED labels left in it."""
    retired: list[str] = []

    def sub(m: re.Match[str]) -> str:
        n = RENAMED.get((m.group(1), int(m.group(2))))
        if n is None:
            retired.append(m.group(0))
            return m.group(0)
        return f"FP-{n}"

    return LABEL.sub(sub, text), retired


def scan(paths: list[str], root: Path = REPO):
    for rel in paths:
        text = read(root / rel)
        if text is None or not LABEL.search(text):
            continue
        yield rel, text


def self_test() -> int:
    import tempfile

    old = lambda spec, n: "R-" + spec + "-" + str(n)  # noqa: E731 (built so this file never carries a label)
    failed = 0
    fixed, retired = rename(f"DB first ({old('31', 1)}); eye ({old('22', 13)}); BEM ({old('31', 2)}); {old('22', 6)}.")
    if fixed != f"DB first (FP-1); eye (FP-13); BEM ({old('31', 2)}); {old('22', 6)}.":
        print("FAIL rename:", fixed)
        failed += 1
    if retired != [old("31", 2), old("22", 6)]:
        print("FAIL retired list:", retired)
        failed += 1
    if rename("FR-31-1 and FR-22-11 and SR-31-4")[1]:
        print("FAIL: a requirement ID was read as a rule label")
        failed += 1
    if not exempt(".claude/plans/archive/x.md") or not exempt(".claude/backups/a/1.txt") or exempt(".claude/plans/x.md"):
        print("FAIL exempt prefixes")
        failed += 1
    with tempfile.TemporaryDirectory() as td:
        Path(td, "live.md").write_text(f"see {old('31', 9)}", encoding="utf-8")
        hits = [rel for rel, _ in scan(["live.md"], Path(td))]
        if hits != ["live.md"]:
            print("FAIL scan missed a planted label:", hits)
            failed += 1
    print("self-test OK" if not failed else f"self-test FAILED ({failed})")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--fix", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()

    labels: Counter[str] = Counter()
    hits: dict[str, list[str]] = {}
    retired_left: dict[str, list[str]] = {}
    for rel, text in scan(files()):
        found = [m.group(0) for m in LABEL.finditer(text)]
        labels.update(found)
        hits[rel] = found
        if args.fix:
            new, retired = rename(text)
            if new != text:
                with open(REPO / rel, "w", encoding="utf-8", newline="") as fh:
                    fh.write(new)
            if retired:
                retired_left[rel] = retired

    if args.survey:
        for label, count in sorted(labels.items(), key=lambda kv: (kv[0][:4], int(kv[0][5:]))):
            kind = "renamed" if (label[2:4], int(label[5:])) in RENAMED else "RETIRED"
            print(f"{count:5d}  {label}  {kind}")
        print(f"{len(hits)} file(s)")
        for rel, found in sorted(hits.items()):
            print(f"  {rel}: {', '.join(sorted(set(found)))}")
        return 0
    if args.fix:
        print(f"renamed old labels in {len(hits) - len(retired_left) if hits else 0} file(s) fully")
        for rel, retired in sorted(retired_left.items()):
            print(f"  RETIRED, rewrite by hand: {rel}: {', '.join(sorted(set(retired)))}")
        return 1 if retired_left else 0
    if hits:
        for rel, found in sorted(hits.items()):
            print(f"{rel}: {', '.join(sorted(set(found)))}")
        print(f"FAIL: {sum(labels.values())} old rule label(s) in {len(hits)} file(s); cite FP-<n> "
              "(python scripts/check-rule-labels.py --fix; a retired label is rewritten in plain words)")
        return 1
    print("OK: no old rule labels outside the exempt history folders")
    return 0


if __name__ == "__main__":
    sys.exit(main())
