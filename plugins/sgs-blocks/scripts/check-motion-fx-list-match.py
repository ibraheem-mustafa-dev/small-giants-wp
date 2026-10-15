#!/usr/bin/env python3
"""check-motion-fx-list-match.py - no reader of `data-sgs-fx` may match the whole value (Spec 38A FR-38A-23).

Thin motion-gate wrapper: the detector, the migration and the target shape live in migrate-fx-list-match.py.
    --check      runs `migrate-fx-list-match.py --check`
    --self-test  runs `migrate-fx-list-match.py --self-test`
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

MIGRATION = Path(__file__).resolve().parent / "migrate-fx-list-match.py"


def main() -> int:
    flags = [a for a in sys.argv[1:] if a in ("--check", "--self-test")]
    if not flags:
        print("usage: check-motion-fx-list-match.py --check | --self-test")
        return 2
    return subprocess.run([sys.executable, str(MIGRATION), flags[0]]).returncode


if __name__ == "__main__":
    sys.exit(main())
