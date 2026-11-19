#!/usr/bin/env python3
"""mutate-php.py: prove a PHPUnit test can fail. Apply each listed mutation, run the test, require it to go red, restore.

A mutation list is a JSON array of {"file", "find", "replace", "why"}: `file` relative to plugins/sgs-blocks, `find` a string
occurring exactly once. The file is restored after every mutation, and on any error. Exit 0 only when every mutation is
killed (the test fails) and the unmutated baseline is green.

  python scripts/qa/mutate-php.py tests/php/ButtonPresetNamesTest.mutations.json ButtonPresetNamesTest
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[2]


def run(filter_name: str) -> int:
    cmd = ["php", "vendor/phpunit/phpunit/phpunit", "--filter", filter_name]
    return subprocess.run(cmd, cwd=PLUGIN, capture_output=True, text=True).returncode


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    mutations = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    name = sys.argv[2]
    if run(name) != 0:
        print("baseline is red: nothing to mutate")
        return 1
    survived = 0
    for m in mutations:
        path = PLUGIN / m["file"]
        original = path.read_bytes()
        text = original.decode("utf-8")
        if text.count(m["find"]) != 1:
            print(f"BAD      {m['file']}: find occurs {text.count(m['find'])} times: {m['why']}")
            survived += 1
            continue
        try:
            path.write_bytes(text.replace(m["find"], m["replace"], 1).encode("utf-8"))
            red = run(name) != 0
        finally:
            path.write_bytes(original)
        print(("KILLED   " if red else "SURVIVED ") + m["why"])
        survived += 0 if red else 1
    print(f"{len(mutations) - survived} of {len(mutations)} mutations killed")
    return 1 if survived else 0


if __name__ == "__main__":
    sys.exit(main())
