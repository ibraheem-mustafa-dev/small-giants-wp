"""check_preset_absence_no_slug_literal.py — scoped static gate for
converter/resolvers/preset_absence.py (Build #3 Option B, 2026-07-24).

Fails if the file contains an `if rec.slug ==` / `if block_slug ==` (or the
`in (...)` / `in [...]` literal-membership variant) carve-out — the R-31-9
universal-mechanism guard for this specific new file.

NOTE: `converter/gates/no_slug_literal.py` ALREADY scans the whole
`converter/resolvers/` + `converter/services/` tree via full AST analysis, and
`preset_absence.py` is inside that scope — so this script is a narrow, fast,
explicit confirmation for THIS file only, requested as an additional named
deliverable. It is NOT a replacement for the general gate; both run as part of
the local build gate chain (`prebuild` / `scripts/gates.json`) — this repo has
no CI.

CLI: python converter/gates/check_preset_absence_no_slug_literal.py
Exit 0 = clean, exit 1 = violation found (prints the offending line).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_TARGET = Path(__file__).resolve().parent.parent / "resolvers" / "preset_absence.py"

_PATTERNS = [
    re.compile(r"\brec\s*\.\s*slug\s*==\s*['\"]"),
    re.compile(r"\bblock_slug\s*==\s*['\"]"),
    re.compile(r"\brec\s*\.\s*slug\s+in\s+[\(\[]"),
    re.compile(r"\bblock_slug\s+in\s+[\(\[]"),
]


_TRIPLE_QUOTED_RE = re.compile(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'')


def main() -> int:
    if not _TARGET.exists():
        print(f"check_preset_absence_no_slug_literal: SKIP — {_TARGET} not found")
        return 0
    text = _TARGET.read_text(encoding="utf-8")
    # Strip docstrings/triple-quoted strings and `#` comments FIRST — this file's
    # own module docstring documents the FORBIDDEN pattern as prose (so a reader
    # knows what would be rejected); scanning raw text would false-positive on
    # that documentation. Blank out (not delete) so line numbers stay accurate.
    text_no_docstrings = _TRIPLE_QUOTED_RE.sub(lambda m: "\n" * m.group(0).count("\n"), text)
    code_lines = []
    for line in text_no_docstrings.splitlines():
        code_lines.append(line.split("#", 1)[0])
    violations: list[tuple[int, str]] = []
    for lineno, line in enumerate(code_lines, start=1):
        for pat in _PATTERNS:
            if pat.search(line):
                violations.append((lineno, line.strip()))
    if violations:
        print(
            "check_preset_absence_no_slug_literal: FAIL — slug/block-slug "
            "literal carve-out found in preset_absence.py:"
        )
        for lineno, line in violations:
            print(f"  line {lineno}: {line}")
        return 1
    print("check_preset_absence_no_slug_literal: OK — no slug literal carve-out")
    return 0


if __name__ == "__main__":
    sys.exit(main())
