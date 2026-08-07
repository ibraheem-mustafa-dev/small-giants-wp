#!/usr/bin/env python3
"""logical-props-lint.py — RTL-readiness WARN-only lint for the SGS nav blocks
(Spec 36 §8 / FR-36-16 "RTL/logical properties").

WHY WARN BY DEFAULT — AND WHAT `--check` ADDS
---------------------------------------------
A PHYSICAL property (margin-left, padding-right, bare `left:`/`right:`) is
not always wrong — some genuinely direction-agnostic uses exist (e.g. an
icon nudge that should stay on the same visual side regardless of writing
direction). So the DEFAULT mode is unchanged: it prints every hit with
file:line, lets a human decide, and always exits 0.

`--check` is the deliberate hard-gate mode the old header note asked a
future session to discuss first. The discussion happened: this script was
the ONLY detector for a real Spec 36 §8 requirement (RTL/logical
properties) and a repo-wide search found it referenced from nothing but its
own README — so the risk was never "it reads green forever", it was that
nobody ever runs it. `--check` fails (exit 1) on any hit that is NOT
already recorded in `logical-props-baseline.json`. Existing debt is frozen
and VISIBLE in that file; new debt breaks the build. Re-seed deliberately
with `--seed` (and expect the diff to be reviewed).

Baseline entries are keyed by file + property + the normalised declaration
text, with an occurrence COUNT — never by line number, which would go
stale on the first re-indent and turn the gate into noise.

SCOPE. DEFAULT_DIRS below is the nav surface, not the whole plugin. That
narrowness is deliberate: outside the nav blocks a physical property is far
more often correct than not, and a repo-wide gate would drown the signal.
Widening it is a separate decision — take it on purpose, not by accident.

SELF-TEST. `--self-test` proves the gate can still FAIL (it plants a
physical property in a temp tree and asserts `--check` rejects it, then
asserts the baseline suppresses a known hit and that one EXTRA occurrence
of an already-baselined declaration still breaks through). A gate that
cannot fail reads green forever.

WHAT IT SCANS
-------------
Physical CSS box-model + positioning properties that have a logical
equivalent:

  margin-left    -> margin-inline-start (LTR assumption noted below)
  margin-right   -> margin-inline-end
  padding-left   -> padding-inline-start
  padding-right  -> padding-inline-end
  left:          -> inset-inline-start
  right:         -> inset-inline-end

The LTR-assumption note: the suggested logical equivalent assumes the
current document direction is LTR (SGS's default). In an LTR document,
`left` maps to `inline-start` and `right` maps to `inline-end`; this flips
in an RTL document. The suggestion is a starting point for the reviewer,
not an auto-fix.

Already-logical properties (margin-inline-start/end, padding-inline-
start/end, inset-inline-start/end, and the `-inline`/`-block` shorthands)
are never flagged.

USAGE
-----
  python logical-props-lint.py [dir ...]            # WARN only, always exit 0
  python logical-props-lint.py --check [dir ...]    # exit 1 on NEW debt
  python logical-props-lint.py --seed [dir ...]     # rewrite the baseline
  python logical-props-lint.py --self-test          # prove the gate can fail

  # Default target dirs (the two nav blocks + the shared utils module —
  # update these paths once the nav blocks/shared module actually land,
  # see the DEFAULT_DIRS note below):
  python logical-props-lint.py

  # Explicit dirs once you know the real paths:
  python logical-props-lint.py src/blocks/nav-menu src/blocks/nav-drawer src/utils

A missing target directory is reported as a WARN line (the block/module
hasn't been built yet) rather than a crash — this script is meant to be
runnable from Wave-0 onward, before any of the target dirs exist.

Spec 36 coverage: FR-36-16 "RTL/logical properties" in the FR-36-16 live gate list.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
from collections import Counter
from pathlib import Path

# Resolved relative to this script's location (plugins/sgs-blocks/scripts/nav-qa/),
# so it works regardless of the caller's cwd.
SCRIPT_DIR = Path(__file__).resolve().parent
SGS_BLOCKS_ROOT = SCRIPT_DIR.parent.parent  # plugins/sgs-blocks/

# Default target dirs. `nav-menu` and `nav-drawer` are the two Spec 36 nav
# blocks (not yet built at Wave-0 — see block.json roster in the spec's
# FR-36-2). `utils` is the existing shared-JS-module convention
# (src/utils/responsive.js, tokens.js, icons.js) — the closest existing
# home for FR-36-7's "shared nav plumbing utility" until/unless that
# utility gets its own directory. Update this list the moment the real
# paths are known; do not let this drift silently.
DEFAULT_DIRS = [
    SGS_BLOCKS_ROOT / "src" / "blocks" / "nav-menu",
    SGS_BLOCKS_ROOT / "src" / "blocks" / "nav-drawer",
    SGS_BLOCKS_ROOT / "src" / "utils",
]

# CSS file extensions this lint scans. style.css / editor.css per the SGS
# block-file convention (see plugins/sgs-blocks/CLAUDE.md "Block Pattern").
CSS_EXTENSIONS = {".css", ".scss"}

# Frozen existing debt for `--check`. Lives beside this script so the gate and
# its baseline move together.
BASELINE_PATH = SCRIPT_DIR / "logical-props-baseline.json"

# property-name -> suggested logical equivalent (LTR-document assumption).
PHYSICAL_TO_LOGICAL = {
    "margin-left": "margin-inline-start",
    "margin-right": "margin-inline-end",
    "padding-left": "padding-inline-start",
    "padding-right": "padding-inline-end",
    "left": "inset-inline-start",
    "right": "inset-inline-end",
}

# Matches a CSS property declaration: `<prop-name>` optionally preceded by
# whitespace/`{`/`;`, followed by `:`. Captures the property name only.
# Deliberately simple (line-based) — this is a WARN nudge, not a full CSS
# parser; it can over- or under-match inside multi-line values, which is
# an acceptable tradeoff for a non-gating lint.
PROPERTY_RE = re.compile(
    r"(?:^|[;{]|\s)([a-zA-Z-]+)\s*:\s*[^;{}]*;?",
)

# A property name ending in one of these is already logical — never flag
# it even if it happens to contain "left"/"right" as a substring anywhere
# (defence against a naive substring match; the PROPERTY_RE above already
# captures the exact property name, so this is a second belt-and-braces
# check on the captured name itself).
ALREADY_LOGICAL_SUFFIXES = (
    "-inline-start",
    "-inline-end",
    "-inline",
    "-block-start",
    "-block-end",
    "-block",
)


def is_already_logical(prop_name: str) -> bool:
    return any(prop_name.endswith(suffix) for suffix in ALREADY_LOGICAL_SUFFIXES)


def strip_comments(text: str) -> str:
    """Strip /* ... */ CSS comments (including multi-line) before scanning,
    so a physical-property mention inside a comment never false-positives."""
    return re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)


def scan_file(path: Path) -> list[tuple[int, str, str, str]]:
    """Returns a list of (line_no, prop_name, suggestion, line_text) hits."""
    try:
        raw = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        print(f"WARN: could not read {path} — {e}", file=sys.stderr)
        return []

    cleaned = strip_comments(raw)
    hits: list[tuple[int, str, str, str]] = []

    for line_no, line in enumerate(cleaned.splitlines(), start=1):
        for match in PROPERTY_RE.finditer(line):
            prop_name = match.group(1).strip().lower()
            if prop_name not in PHYSICAL_TO_LOGICAL:
                continue
            if is_already_logical(prop_name):
                continue
            suggestion = PHYSICAL_TO_LOGICAL[prop_name]
            hits.append((line_no, prop_name, suggestion, line.strip()))

    return hits


def scan_dir(target: Path) -> list[tuple[Path, int, str, str, str]]:
    """Returns (file, line_no, prop_name, suggestion, line_text) across every
    CSS/SCSS file under target."""
    results: list[tuple[Path, int, str, str, str]] = []
    for ext in CSS_EXTENSIONS:
        for css_file in sorted(target.rglob(f"*{ext}")):
            for line_no, prop_name, suggestion, line_text in scan_file(css_file):
                results.append((css_file, line_no, prop_name, suggestion, line_text))
    return results


def rel_key(css_file: Path) -> str:
    """Repo-stable path key for a scanned file (POSIX separators, so a
    baseline seeded on Windows still matches on Linux CI)."""
    try:
        return css_file.resolve().relative_to(SGS_BLOCKS_ROOT).as_posix()
    except ValueError:
        return css_file.as_posix()


def hit_key(css_file: Path, prop_name: str, line_text: str) -> str:
    """Baseline key: file + property + normalised declaration text.

    Deliberately NOT line-number-keyed — a re-indent or an inserted rule
    would invalidate every entry and the gate would degrade into noise the
    first time anyone touched the file.
    """
    normalised = " ".join(line_text.split())
    return f"{rel_key(css_file)}|{prop_name}|{normalised}"


def collect(targets: list[Path]) -> tuple[Counter, list[tuple[Path, int, str, str, str]], bool]:
    """Scan every target dir. Returns (counted hit keys, raw hits, any_dir_scanned)."""
    counts: Counter = Counter()
    raw: list[tuple[Path, int, str, str, str]] = []
    any_dir_scanned = False

    for target in targets:
        if not target.exists():
            print(f"WARN: target directory not found (not built yet?): {target}")
            continue
        if not target.is_dir():
            print(f"WARN: target is not a directory, skipping: {target}")
            continue
        any_dir_scanned = True
        for hit in scan_dir(target):
            raw.append(hit)
            counts[hit_key(hit[0], hit[2], hit[4])] += 1

    return counts, raw, any_dir_scanned


def load_baseline() -> Counter:
    if not BASELINE_PATH.exists():
        return Counter()
    try:
        data = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"ERROR: baseline {BASELINE_PATH} is unreadable — {e}", file=sys.stderr)
        return Counter()
    return Counter(data.get("entries", {}))


def write_baseline(counts: Counter) -> None:
    payload = {
        "_comment": (
            "Frozen physical-property debt for logical-props-lint.py --check. "
            "Each key is 'file|property|normalised declaration' and each value is "
            "the number of times it occurs. --check fails on anything NOT here, or "
            "on more occurrences than recorded. Re-seed only deliberately (--seed) "
            "and review the diff."
        ),
        "entries": dict(sorted(counts.items())),
    }
    BASELINE_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def run_check(counts: Counter, raw: list[tuple[Path, int, str, str, str]]) -> int:
    """Fail on any hit not covered by the baseline. Returns the exit code."""
    baseline = load_baseline()
    if not BASELINE_PATH.exists():
        print(
            f"ERROR: --check needs a baseline. Run `--seed` first to freeze the "
            f"current debt into {BASELINE_PATH.name}.",
            file=sys.stderr,
        )
        return 1

    new_debt = {k: n - baseline[k] for k, n in counts.items() if n > baseline[k]}
    if not new_debt:
        print(
            f"logical-props-lint --check: PASS — {sum(counts.values())} known physical "
            f"property use(s), all covered by {BASELINE_PATH.name}. 0 new."
        )
        return 0

    print(f"logical-props-lint --check: FAIL — {sum(new_debt.values())} NEW physical property use(s):")
    for css_file, line_no, prop_name, suggestion, line_text in raw:
        key = hit_key(css_file, prop_name, line_text)
        if key not in new_debt:
            continue
        print(f"  {rel_key(css_file)}:{line_no}  `{prop_name}`  ->  use `{suggestion}`")
        print(f"    {line_text}")
    print(
        "\nEach hit is either a real RTL bug (use the logical property) or a genuinely "
        f"direction-agnostic use — if the latter, add it to {BASELINE_PATH.name} with `--seed`."
    )
    return 1


def self_test() -> int:
    """Prove --check can fail, that the baseline suppresses known debt, and that
    an EXTRA occurrence of an already-baselined declaration still breaks through."""
    failures: list[str] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        print(f"  {'ok  ' if ok else 'FAIL'}  {name}{' — ' + detail if detail else ''}")
        if not ok:
            failures.append(name)

    tmp = Path(tempfile.mkdtemp(prefix="logical-props-selftest-"))
    saved = BASELINE_PATH.read_bytes() if BASELINE_PATH.exists() else None
    try:
        css = tmp / "style.css"
        css.write_text(
            ".a{margin-left:8px;}\n"
            ".b{margin-inline-start:8px;}\n"
            "/* margin-right:4px; in a comment */\n",
            encoding="utf-8",
        )

        counts, raw, scanned = collect([tmp])
        check("scans the target dir", scanned)
        check("detects the physical margin-left", sum(counts.values()) == 1, f"got {sum(counts.values())}")
        check(
            "does NOT flag the logical property or the commented-out one",
            all("margin-inline-start" not in k and "margin-right" not in k for k in counts),
        )

        # Empty baseline -> must FAIL (the negative control that matters).
        write_baseline(Counter())
        check("--check FAILS on unbaselined debt", run_check(counts, raw) == 1)

        # Seeded baseline -> must PASS.
        write_baseline(counts)
        counts2, raw2, _ = collect([tmp])
        check("--check PASSES once baselined", run_check(counts2, raw2) == 0)

        # One EXTRA identical declaration -> must FAIL again (count-aware).
        css.write_text(css.read_text(encoding="utf-8") + ".c{margin-left:8px;}\n", encoding="utf-8")
        counts3, raw3, _ = collect([tmp])
        check("--check FAILS on one extra occurrence", run_check(counts3, raw3) == 1)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        if saved is None:
            BASELINE_PATH.unlink(missing_ok=True)
        else:
            BASELINE_PATH.write_bytes(saved)

    print(
        "logical-props-lint --self-test: PASS (the gate can fail)"
        if not failures
        else f"logical-props-lint --self-test: FAIL — {'; '.join(failures)}"
    )
    return 0 if not failures else 1


def main(argv: list[str]) -> int:
    mode_check = "--check" in argv
    mode_seed = "--seed" in argv
    if "--self-test" in argv:
        return self_test()
    rest = [a for a in argv if a not in ("--check", "--seed")]

    if rest:
        targets = [Path(arg) for arg in rest]
    else:
        targets = DEFAULT_DIRS

    if mode_check or mode_seed:
        counts, raw, any_scanned = collect(targets)
        if not any_scanned:
            print("logical-props-lint: no target directories exist — nothing to scan.")
            return 0
        if mode_seed:
            write_baseline(counts)
            print(
                f"logical-props-lint --seed: wrote {len(counts)} entr(y/ies) "
                f"({sum(counts.values())} occurrence(s)) to {BASELINE_PATH}."
            )
            return 0
        return run_check(counts, raw)

    total_hits = 0
    any_dir_scanned = False

    for target in targets:
        if not target.exists():
            print(f"WARN: target directory not found (not built yet?): {target}")
            continue
        if not target.is_dir():
            print(f"WARN: target is not a directory, skipping: {target}")
            continue

        any_dir_scanned = True
        hits = scan_dir(target)
        if not hits:
            print(f"OK: {target} — no physical left/right properties found.")
            continue

        print(f"WARN: {target} — {len(hits)} physical left/right property use(s):")
        for css_file, line_no, prop_name, suggestion, line_text in hits:
            rel = css_file.relative_to(SGS_BLOCKS_ROOT) if SGS_BLOCKS_ROOT in css_file.parents else css_file
            print(f"  {rel}:{line_no}  `{prop_name}`  ->  consider `{suggestion}`")
            print(f"    {line_text}")
        total_hits += len(hits)

    print()
    if not any_dir_scanned:
        print(
            "logical-props-lint: no target directories exist yet — nothing to scan. "
            "This is expected at Wave-0 before the nav blocks are built; re-run once "
            "src/blocks/nav-menu and src/blocks/nav-drawer exist."
        )
    elif total_hits == 0:
        print("logical-props-lint: 0 warnings across all scanned directories.")
    else:
        print(
            f"logical-props-lint: {total_hits} warning(s) total. "
            "This is a WARN-only nudge (Spec 36 §8 RTL/logical-properties coverage) — "
            "review each hit; it does not fail the build."
        )

    # Always exits 0 — see the "WHY WARN, NOT FAIL" header note.
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
