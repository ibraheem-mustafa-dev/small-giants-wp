"""
tooling-map-drift-check.py — RETIRED 2026-05-21
================================================

The .claude/tooling-map.md doc this hook enforces was ABSORBED into
.claude/cloning-pipeline-flow.md "Script inventory" section on 2026-05-21.
The doc this hook checks is now a 9-line redirect stub; the drift check
returns false positives.

This hook is NOT currently wired into .claude/settings.json. It's an
orphan script kept on disk for git-history continuity. If a future session
wants drift detection on the absorbed Script inventory section, repurpose
the regex/AST parsing logic below to walk the section in cloning-pipeline-
flow.md instead. The drift-detection algorithm is sound; only the target
file path needs updating.

DO NOT WIRE THIS HOOK AS-IS — it will fire false positives on the
absorbed stub.

Original purpose follows for reference:

The tooling-map.md was the authoritative inventory of every script in the
SGS pipeline. New scripts could appear in plugins/sgs-blocks/scripts/,
scripts/, and tools/ without anyone updating the inventory. This script
caught that gap before it became stale documentation.

WHAT IT CHECKS
--------------
  Type A drift - file on disk but not mentioned in tooling-map.md
  Type B drift - filename in tooling-map.md but no matching file on disk
                 (excluding entries explicitly marked as MISSING or GHOST)

INVOCATION
----------
  # From repo root:
  python .claude/hooks/tooling-map-drift-check.py
  python .claude/hooks/tooling-map-drift-check.py --verbose
  python .claude/hooks/tooling-map-drift-check.py --report
  python .claude/hooks/tooling-map-drift-check.py --strict-ghost

  # Flags:
  #   --verbose      print confirmation even when no drift found
  #   --report       always print report; exit 0 regardless
  #   --strict-ghost treat MISSING/GHOST inventory entries as drift too
  #   --help         show usage

WIRING AS A PRE-COMMIT HOOK
-----------------------------
Add the following to .git/hooks/pre-commit (create the file if absent,
make it executable with: chmod +x .git/hooks/pre-commit):

  #!/usr/bin/env bash
  python .claude/hooks/tooling-map-drift-check.py
  if [ $? -ne 0 ]; then
      echo ""
      echo "Commit blocked: tooling-map.md is out of sync with disk."
      echo "Update .claude/tooling-map.md before committing."
      exit 1
  fi

Or add as a step in a pre-commit config (pre-commit.com):

  - repo: local
    hooks:
      - id: tooling-map-drift-check
        name: Tooling map drift check
        entry: python .claude/hooks/tooling-map-drift-check.py
        language: system
        pass_filenames: false
"""

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import NamedTuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[2]

INVENTORY_FILE = REPO_ROOT / ".claude" / "tooling-map.md"

SCRIPT_FOLDERS = [
    REPO_ROOT / "plugins" / "sgs-blocks" / "scripts",
    REPO_ROOT / "scripts",
    REPO_ROOT / "tools",
]

EXCLUDED_DIR_NAMES = {"__pycache__", "node_modules", ".git", "build"}

SCRIPT_EXTENSIONS = {".py", ".js"}

# Regex that matches a script filename inside a markdown table cell.
#
# Design constraints:
#   - Must match: bem-lint.py, apply-phase-3.5-vocab.py, __init__.py,
#     test_orchestrator_main.py, capture.js, copy-built-styles.js
#   - Must NOT consume strikethrough syntax: ~~validate-naming.py~~
#   - Filenames may contain dots in the stem (e.g. "3.5" in apply-phase-3.5-vocab.py)
#
# Strategy:
#   - Require a word boundary (no preceding word-char, tilde, or backtick)
#   - Allow start with letter, digit-free underscore runs (for __init__.py),
#     or a letter followed by any mix of alnum / hyphen / underscore / dot
#   - Extension is the LAST .py or .js in the token
#
# Two alternatives in the alternation:
#   1. __init__ style: starts with two underscores -> only "__init__.py" effectively
#   2. Normal style: starts with letter, allows [a-zA-Z0-9_.-] in the middle,
#      requires the final segment (after last dot) to be "py" or "js"
SCRIPT_FILENAME_RE = re.compile(
    r"(?<![~`\w])"
    r"("
    r"__[a-zA-Z0-9_]*\.(?:py|js)"          # __init__.py style
    r"|"
    r"[a-zA-Z][a-zA-Z0-9_./-]*[a-zA-Z0-9_]\.(?:py|js)"  # multi-segment: apply-phase-3.5-vocab.py
    r"|"
    r"[a-zA-Z][a-zA-Z0-9_-]*\.(?:py|js)"  # simple: bem-lint.py, capture.js
    r")"
    r"(?![~`\w])"
)

# Phrases that mark an entry as explicitly absent / retired - these should
# not generate Type B (ghost) drift. Matched case-insensitively against the
# TABLE ROW that contains the filename.
ABSENT_MARKERS = [
    "missing from disk",
    "ghost reference",
    "not a missing script",
    "resolved",
    "only .pyc",
    "no .py source",
    "no .py or .pyc",
    "does not exist on disk",
]


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

class DriftResult(NamedTuple):
    type_a: list[str]   # relative paths of files on disk but absent in inventory
    type_b: list[str]   # basenames declared in inventory first-cell but absent on disk
    all_names: set[str]   # every basename mentioned anywhere in the inventory
    entry_names: set[str]  # basenames from inventory first-cell (declared entries)
    disk_files: list[Path]  # all script files found on disk


# ---------------------------------------------------------------------------
# Disk walk
# ---------------------------------------------------------------------------

def _is_excluded(path: Path) -> bool:
    """Return True if any component of path is in EXCLUDED_DIR_NAMES."""
    return any(part in EXCLUDED_DIR_NAMES for part in path.parts)


def collect_disk_scripts() -> list[Path]:
    """
    Walk SCRIPT_FOLDERS and return a sorted list of .py / .js files,
    excluding __pycache__, node_modules, .git, build directories,
    *.min.js, and *.map files.
    """
    found: list[Path] = []
    for folder in SCRIPT_FOLDERS:
        if not folder.is_dir():
            continue
        for path in folder.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix not in SCRIPT_EXTENSIONS:
                continue
            if path.name.endswith(".min.js") or path.name.endswith(".map"):
                continue
            # Check every path component against excluded names
            relative = path.relative_to(REPO_ROOT)
            if _is_excluded(relative):
                continue
            found.append(path)
    return sorted(found)


# ---------------------------------------------------------------------------
# Inventory parsing
# ---------------------------------------------------------------------------

def _row_is_absent(row_text: str) -> bool:
    """
    Return True when a markdown table row contains an explicit absent /
    retired / ghost marker, meaning the file is KNOWN to be off-disk and
    should not generate Type B drift.
    """
    lower = row_text.lower()
    return any(marker in lower for marker in ABSENT_MARKERS)


def parse_inventory(strict_ghost: bool = False) -> tuple[set[str], set[str], set[str]]:
    """
    Parse tooling-map.md and return three sets:
      - all_names:            every script basename mentioned anywhere in the doc
                              (used for Type A: is this file referenced at all?)
      - entry_names:          basenames from the FIRST content cell of each table row
                              (the canonical file column; used for Type B ghost detection)
      - exempt_names:         entry_names on rows explicitly marked as absent / ghost
                              (excluded from Type B when strict_ghost=False)

    Strategy:
      1. Read the file line by line.
      2. For lines that look like markdown table rows (contain '|'), split by '|'.
      3. Scan ALL cells with SCRIPT_FILENAME_RE to populate all_names (Type A check).
      4. Separately, look only at the FIRST non-empty cell for entry_names (Type B check).
         This avoids treating filenames mentioned in description / notes columns
         as inventory declarations (e.g. "edit.js + save.js" in a description cell,
         or "update-db.py" as a cross-reference in a Notes column).
      5. If the row is explicitly marked absent/ghost, add matching entry_names to
         exempt_names so they are skipped for Type B.
    """
    if not INVENTORY_FILE.is_file():
        raise FileNotFoundError(
            f"Inventory file not found: {INVENTORY_FILE}\n"
            "Expected at .claude/tooling-map.md relative to repo root."
        )

    all_names: set[str] = set()
    entry_names: set[str] = set()
    exempt_names: set[str] = set()

    text = INVENTORY_FILE.read_text(encoding="utf-8")

    for line in text.splitlines():
        stripped = line.strip()
        # Only parse lines that could be markdown table rows
        if "|" not in stripped:
            continue

        is_absent_row = _row_is_absent(stripped)
        cells = [c.strip() for c in stripped.split("|")]

        # ALL cells -> all_names (for Type A: "is this basename mentioned anywhere?")
        for cell in cells:
            for match in SCRIPT_FILENAME_RE.finditer(cell):
                # Only take the basename (last path component) so that path-column
                # entries like "tools/recogniser-v2/overrides/__init__.py" reduce
                # to "__init__.py" and match the disk basename.
                raw = match.group(1)
                name = raw.split("/")[-1].split("\\")[-1]
                all_names.add(name)

        # FIRST non-empty cell -> entry_names (for Type B: "is this an inventory row?")
        # Skip header separator rows (cells are all dashes/spaces)
        first_cell = next((c for c in cells if c and not set(c).issubset({"-", " ", "|"})), None)
        if first_cell:
            # Skip table header rows (e.g. "File", "---", "#")
            if set(first_cell).issubset({"-", " "}):
                continue
            for match in SCRIPT_FILENAME_RE.finditer(first_cell):
                raw = match.group(1)
                name = raw.split("/")[-1].split("\\")[-1]
                entry_names.add(name)
                if is_absent_row and not strict_ghost:
                    exempt_names.add(name)

    return all_names, entry_names, exempt_names


# ---------------------------------------------------------------------------
# Drift detection
# ---------------------------------------------------------------------------

def detect_drift(strict_ghost: bool = False) -> DriftResult:
    """
    Compare disk state to inventory and return a DriftResult.

    Type A uses all_names: a file is NOT drifted if its basename is mentioned
    ANYWHERE in the inventory (including path column, notes column, etc.).

    Type B uses entry_names: only basenames that appear in the FIRST cell of a
    table row are treated as declared inventory entries. This prevents
    cross-referenced filenames (e.g. "edit.js" in a description cell) from
    falsely generating ghost reports.
    """
    disk_files = collect_disk_scripts()
    disk_basenames = {f.name for f in disk_files}

    all_names, entry_names, exempt_names = parse_inventory(strict_ghost=strict_ghost)

    # Type A: files on disk not mentioned anywhere in the inventory
    type_a: list[str] = []
    for path in disk_files:
        if path.name not in all_names:
            rel = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
            type_a.append(rel)

    # Type B: declared inventory entries that have no matching file on disk
    # Exclude entries that are explicitly marked as absent/ghost
    effective_entries = entry_names - exempt_names
    type_b: list[str] = []
    for name in sorted(effective_entries):
        if name not in disk_basenames:
            type_b.append(name)

    return DriftResult(
        type_a=sorted(type_a),
        type_b=sorted(type_b),
        all_names=all_names,
        entry_names=entry_names,
        disk_files=disk_files,
    )


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def format_report(result: DriftResult) -> str:
    """Format a human-readable drift report."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines: list[str] = []

    lines.append(f"TOOLING MAP DRIFT DETECTED ({timestamp})")
    lines.append("")

    if result.type_a:
        lines.append(
            f"Type A drift ({len(result.type_a)} files on disk missing from inventory):"
        )
        for path in result.type_a:
            lines.append(f"  - {path}")
    else:
        lines.append("Type A drift: none")

    lines.append("")

    if result.type_b:
        lines.append(
            f"Type B drift ({len(result.type_b)} inventory entries missing from disk):"
        )
        for name in result.type_b:
            lines.append(
                f"  - {name} (claimed by doc but absent on disk)"
            )
    else:
        lines.append("Type B drift: none")

    lines.append("")
    lines.append("Fix by either:")
    lines.append(
        "  1. Adding the missing entries to .claude/tooling-map.md, OR"
    )
    lines.append(
        "  2. Removing the orphan files / removing the ghost inventory entries"
    )
    lines.append("")
    lines.append(
        'See .claude/docs-registry.md update_trigger: '
        '"Add a new script under plugins/sgs-blocks/scripts/..."'
    )

    return "\n".join(lines)


def format_clean_report(result: DriftResult) -> str:
    """Format a short confirmation for the --verbose / --report clean path."""
    n_inv = len(result.entry_names)
    n_disk = len(result.disk_files)
    return f"tooling-map.md is in sync with disk ({n_inv} scripts inventoried, {n_disk} on disk)"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Check that .claude/tooling-map.md stays in sync with script "
            "files on disk. Exits 1 if drift is detected."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python .claude/hooks/tooling-map-drift-check.py\n"
            "  python .claude/hooks/tooling-map-drift-check.py --verbose\n"
            "  python .claude/hooks/tooling-map-drift-check.py --report\n"
            "  python .claude/hooks/tooling-map-drift-check.py --strict-ghost\n"
        ),
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print confirmation message even when no drift is found.",
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help=(
            "Always print a full report (even on success). "
            "Exit code is still 0 when no drift found."
        ),
    )
    parser.add_argument(
        "--strict-ghost",
        action="store_true",
        dest="strict_ghost",
        help=(
            "Treat MISSING / GHOST inventory entries as Type B drift too. "
            "Off by default."
        ),
    )
    return parser


def main() -> int:
    """
    Main entry point. Returns the exit code (0 = clean, 1 = drift).
    """
    parser = build_arg_parser()
    args = parser.parse_args()

    try:
        result = detect_drift(strict_ghost=args.strict_ghost)
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    has_drift = bool(result.type_a or result.type_b)

    if has_drift:
        print(format_report(result))
        if args.report:
            return 0
        return 1

    # No drift
    if args.verbose or args.report:
        print(format_clean_report(result))

    return 0


if __name__ == "__main__":
    sys.exit(main())
