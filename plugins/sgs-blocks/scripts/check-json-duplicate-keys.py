#!/usr/bin/env python3
"""check-json-duplicate-keys.py - a committed JSON file the plugins or theme load never repeats an object key.

A JSON parser silently keeps the last of two equal keys, and git can merge two branches that each add the same key
into one file without a conflict. Every tracked `*.json` under plugins/ and theme/ is parsed with
`object_pairs_hook`, so block.json, theme.json, selectors.json, extension-roster.json and the generated data all
fail here before commit.

Run from plugins/sgs-blocks:  python scripts/check-json-duplicate-keys.py --check | --self-test
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
REPO = Path(__file__).resolve().parents[3]
ROOTS = ("plugins/", "theme/")
SKIP_PARTS = {"node_modules", "vendor", "build", "tests", "reports", "goldens"}


def duplicates(text: str) -> list[str]:
    """Return the repeated keys of every object in `text`,."""
    found: list[str] = []

    def hook(pairs):
        seen: set[str] = set()
        for k, _ in pairs:
            if k in seen:
                found.append(k)
            seen.add(k)
        return dict(pairs)

    json.loads(text, object_pairs_hook=hook)
    return found


def tracked() -> list[Path]:
    out = subprocess.run(["git", "-C", str(REPO), "ls-files", "-z", "--", "*.json"], capture_output=True, text=True, check=True).stdout
    paths = [REPO / p for p in out.split("\0") if p.startswith(ROOTS)]
    return [p for p in paths if p.is_file() and not SKIP_PARTS.intersection(p.relative_to(REPO).parts)]


def self_test() -> int:
    red = '{"a": {"x": 1, "next-button": 2, "next-button": 3}}'
    green = '{"a": {"x": 1, "next-button": 2}, "b": {"next-button": 3}}'
    ok = duplicates(red) == ["next-button"] and duplicates(green) == []
    print("[check-json-duplicate-keys] self-test", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def check() -> int:
    bad: list[str] = []
    files = tracked()
    for f in files:
        rel = f.relative_to(REPO).as_posix()
        try:
            dups = duplicates(f.read_text(encoding="utf-8-sig"))
        except (ValueError, OSError) as e:
            bad.append(f"{rel}: unreadable JSON ({e})")
            continue
        if dups:
            bad.append(f"{rel}: repeated key(s) {sorted(set(dups))}: a parser keeps only the last; rename or merge them")
    print("\n".join(bad) if bad else f"[check-json-duplicate-keys] OK ({len(files)} files)")
    return 1 if bad else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    sys.exit(self_test() if a.self_test else check())
