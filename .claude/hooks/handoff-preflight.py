#!/usr/bin/env python
"""handoff-preflight.py — mechanical enforcement of the doc-hygiene rules /handoff CLAIMS.

Why this exists (2026-07-28 docs audit):
Five rules were documented as "enforced every /handoff" and enforced NOWHERE. They were
prose the model was asked to obey, and — as `autopilot/SKILL.md` puts it — "a prose rule
the agent can skip is not a gate". The evidence they were being skipped:
  * LEDGER.md reached 38,799 bytes against a 24,576 cap that only existed as a sentence;
  * a 2026-05-09 `CONVERSATION-HANDOFF.md` sat at a live path being copied to OpenClaw
    every session while the "no tombstones at live paths" rule read as satisfied;
  * `.claude/CLAUDE.md` asserted "Enforce every /handoff" for the parking archive-on-resolve
    rule against a command containing no such gate;
  * parking.md carried TWO `Status:` syntaxes, so any regex written against one silently
    passed the other ~68% of entries;
  * the D101 STOP carry-forward count-check — the defence that stops captured failure
    patterns evaporating — was asserted in four docs and machine-checked in zero.

This script is the missing mechanical layer. Six checks, machine evidence only, no prose.

USAGE
  python .claude/hooks/handoff-preflight.py            # report, exit 0 always
  python .claude/hooks/handoff-preflight.py --check    # gate mode: exit 1 on any violation
  python .claude/hooks/handoff-preflight.py --self-test # prove each check can FAIL

DESIGN NOTES
  * REPORT-only by default so it can be run any time without wedging anything; `--check`
    is the gating form /handoff calls.
  * It NEVER edits a file. Detection and remediation only — the same rule ledger-rotate.py
    follows, and for the same reason (a hook that rewrites a doc the agent just wrote
    fights the agent).
  * Each failure names the file, the measured value and the fix. A gate that fails
    illegibly gets switched off.
  * `--self-test` exists because a check that cannot fail is worse than no check
    (STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS). It injects a synthetic violation into
    an in-memory copy of each check's input and asserts the check rejects it.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
_CLAUDE = _REPO / ".claude"

# The byte cap used repo-wide for LEDGER.md / MEMORY.md (see .claude/CLAUDE.md).
# Mirrors ledger-rotate.py's _THRESHOLD_BYTES deliberately: the Stop hook snapshots at
# this size, this gate refuses to close a handoff above it.
CAP_BYTES = 24576

# parking.md's four permitted Status values (Bean-locked 2026-06-02, D150).
LEGAL_STATUS = ("OPEN", "PARTIAL", "BLOCKED", "DEFERRED")
# Values that mean the entry is finished and belongs in memory/parking-archive.md.
TERMINAL_STATUS = ("CLOSED", "RESOLVED", "DROPPED", "SUPERSEDED", "DONE", "COMPLETE")

# BOTH Status syntaxes found live in parking.md: `**Status:** OPEN` and `**Status: OPEN**`.
# A regex covering only the first form sees 32% of entries. This one covers both.
STATUS_RE = re.compile(
    r"\*\*Status:\s*(?:\*\*)?\s*([A-Z-]+)",
)
# Entry headings, both regimes: `### P-SLUG` and `**P-SLUG**` / `> **P-SLUG**`.
ENTRY_RE = re.compile(r"^\s*>?\s*(?:###\s+(P-[A-Z0-9-]+)|\*\*(P-[A-Z0-9-]+)\*\*)", re.M)

# Paths that must NOT exist: each was collapsed into LEDGER.md or archived. A file here is
# a tombstone at a live path — the failure mode where a stale doc reads as current.
TOMBSTONE_PATHS = (
    ".claude/state.md",
    ".claude/handoff.md",
    ".claude/next-session-prompt.md",
    ".claude/plan.md",
    "CONVERSATION-HANDOFF.md",
    "NEXT-SESSION-PROMPT.md",
)
TOMBSTONE_GLOBS = (".claude/next-session-prompt-*.md",)

# Docs whose outbound .md links must resolve. These are the session-start reads: a dangling
# link here is a broken read for every future session.
LINK_SOURCES = (
    ".claude/CLAUDE.md",
    ".claude/specs/README.md",
    ".claude/LEDGER.md",
)
LINK_RE = re.compile(r"\]\(([^)\s#]+\.md)(?:#[^)]*)?\)")

# The STOP-CATALOGUE's OWN documented count command, so this gate's number always matches
# the receipts written into that file's section D. re.M is load-bearing: without it `^`
# anchors to the start of the STRING, the count silently reads 0 on any real file, and the
# check then passes everything. The --self-test caught exactly that on first run.
STOP_RE = re.compile(r"^\s*-\s+\*\*(STOP-[A-Z0-9]+(?:-[A-Z0-9]+)*)", re.M)


class Result:
    """One check's verdict. `ok` False means a real violation, not a warning."""

    def __init__(self, name: str, ok: bool, detail: str, fix: str = ""):
        self.name = name
        self.ok = ok
        self.detail = detail
        self.fix = fix


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _count_stops(text: str) -> int:
    return len({m.group(1) for m in STOP_RE.finditer(text)})


def _parking_entries(text: str) -> list[tuple[str, int, int]]:
    """Return [(slug, start_offset, end_offset)] for every parking entry."""
    matches = [(m.group(1) or m.group(2), m.start()) for m in ENTRY_RE.finditer(text)]
    out = []
    for i, (slug, start) in enumerate(matches):
        end = matches[i + 1][1] if i + 1 < len(matches) else len(text)
        out.append((slug, start, end))
    return out


# --------------------------------------------------------------------------- checks


def check_ledger_size(ledger_text: str | None = None) -> Result:
    """1 — LEDGER.md must stay under the byte cap its own header declares."""
    path = _CLAUDE / "LEDGER.md"
    if ledger_text is None:
        if not path.exists():
            return Result("ledger-size", True, "no LEDGER.md (not a LEDGER-mode project)")
        size = path.stat().st_size
    else:
        size = len(ledger_text.encode("utf-8"))
    if size <= CAP_BYTES:
        return Result("ledger-size", True, f"{size:,} / {CAP_BYTES:,} bytes")
    return Result(
        "ledger-size",
        False,
        f"LEDGER.md is {size:,} bytes, cap is {CAP_BYTES:,} (over by {size - CAP_BYTES:,})",
        "Sweep closed narrative to .claude/memory/session-YYYY-MM-DD*.md and REPLACE the "
        "living-status section. Keep current fronts + standing constraints + pointers.",
    )


def check_stop_carry_forward(now_text: str | None = None) -> Result:
    """2 — D101: the STOP catalogue may only grow. A drop needs a recorded justification."""
    path = _CLAUDE / "STOP-CATALOGUE.md"
    if not path.exists():
        return Result("stop-carry-forward", True, "no STOP-CATALOGUE.md")
    now = _count_stops(now_text if now_text is not None else _read(path))
    try:
        prev_text = subprocess.run(
            ["git", "show", "HEAD:.claude/STOP-CATALOGUE.md"],
            cwd=_REPO, capture_output=True, text=True, timeout=15,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return Result("stop-carry-forward", True, f"{now} STOPs (no git baseline available)")
    if not prev_text.strip():
        return Result("stop-carry-forward", True, f"{now} STOPs (no committed baseline)")
    prev = _count_stops(prev_text)
    if now >= prev:
        return Result("stop-carry-forward", True, f"{now} STOPs (was {prev}) — no defence dropped")
    return Result(
        "stop-carry-forward",
        False,
        f"STOP count DROPPED {prev} -> {now}: {prev - now} defence(s) removed",
        "D101: carry every STOP forward verbatim. Restore the dropped entries, or record an "
        "inline justification in the catalogue's count-check receipt (section D) and re-run.",
    )


def check_parking_status(text: str | None = None) -> Result:
    """3 — every parking entry carries a Status, and it is one of the four legal values."""
    path = _CLAUDE / "parking.md"
    if text is None:
        if not path.exists():
            return Result("parking-status", True, "no parking.md")
        text = _read(path)
    missing, illegal = [], []
    entries = _parking_entries(text)
    for slug, start, end in entries:
        m = STATUS_RE.search(text[start:end])
        if not m:
            missing.append(slug)
        elif m.group(1) not in LEGAL_STATUS and m.group(1) not in TERMINAL_STATUS:
            illegal.append(f"{slug}={m.group(1)}")
    if not missing and not illegal:
        return Result("parking-status", True, f"{len(entries)} entries, all carry a legal Status")
    parts = []
    if missing:
        parts.append(f"{len(missing)} with NO Status: {', '.join(missing[:8])}")
    if illegal:
        parts.append(f"{len(illegal)} with an unrecognised Status: {', '.join(illegal[:8])}")
    return Result(
        "parking-status", False, "; ".join(parts),
        "Every entry needs `**Status:** OPEN|PARTIAL|BLOCKED|DEFERRED` within its body.",
    )


def check_parking_no_closed(text: str | None = None) -> Result:
    """4 — a finished entry belongs in the archive, not in parking.md (D150)."""
    path = _CLAUDE / "parking.md"
    if text is None:
        if not path.exists():
            return Result("parking-no-closed", True, "no parking.md")
        text = _read(path)
    closed = []
    for slug, start, end in _parking_entries(text):
        m = STATUS_RE.search(text[start:end])
        if m and m.group(1) in TERMINAL_STATUS:
            closed.append(f"{slug}={m.group(1)}")
    if not closed:
        return Result("parking-no-closed", True, "zero finished entries left in parking.md")
    return Result(
        "parking-no-closed", False,
        f"{len(closed)} finished entr(y/ies) still in parking.md: {', '.join(closed[:8])}",
        "Move each VERBATIM to .claude/memory/parking-archive.md under a dated pass heading, "
        "with the completion date and why it closed.",
    )


def check_no_tombstones(extra: list[str] | None = None) -> Result:
    """5 — no retired doc may sit at a live path pretending to be current."""
    found = list(extra or [])
    for rel in TOMBSTONE_PATHS:
        if (_REPO / rel).exists():
            found.append(rel)
    for pattern in TOMBSTONE_GLOBS:
        parent = _REPO / Path(pattern).parent
        if parent.is_dir():
            found += [
                str(p.relative_to(_REPO)).replace("\\", "/")
                for p in parent.glob(Path(pattern).name)
            ]
    if not found:
        return Result("no-tombstones", True, "no retired doc at a live path")
    return Result(
        "no-tombstones", False,
        f"{len(found)} tombstone(s) at live path(s): {', '.join(sorted(set(found)))}",
        "These were collapsed into LEDGER.md or archived. Move each to "
        ".claude/memory/archived-YYYY-MM-DD-<name>.md with a dated header, or delete it.",
    )


def check_no_dangling_links(overrides: dict[str, str] | None = None) -> Result:
    """6 — every .md link out of a session-start doc must resolve."""
    dangling = []
    checked = 0
    for rel in LINK_SOURCES:
        src = _REPO / rel
        if overrides and rel in overrides:
            text = overrides[rel]
        elif src.exists():
            text = _read(src)
        else:
            continue
        for m in LINK_RE.finditer(text):
            target = m.group(1)
            checked += 1
            if target.startswith(("http://", "https://")):
                continue
            candidates = [src.parent / target, _REPO / target, _CLAUDE / target]
            if not any(c.exists() for c in candidates):
                dangling.append(f"{rel} -> {target}")
    if not dangling:
        return Result("no-dangling-links", True, f"{checked} links checked, all resolve")
    return Result(
        "no-dangling-links", False,
        f"{len(dangling)} dangling link(s): {'; '.join(dangling[:8])}",
        "Repoint at the doc that now owns that content, or at its archived path.",
    )


CHECKS = (
    check_ledger_size,
    check_stop_carry_forward,
    check_parking_status,
    check_parking_no_closed,
    check_no_tombstones,
    check_no_dangling_links,
)


# ------------------------------------------------------------------------ self-test


def self_test() -> int:
    """Negative control: prove each check REJECTS a synthetic violation.

    A gate that cannot fail is indistinguishable from no gate at all, and reads as a PASS
    forever. Each case below feeds a known-bad input and asserts ok is False.
    """
    cases = [
        ("ledger-size", lambda: check_ledger_size("x" * (CAP_BYTES + 1))),
        ("stop-carry-forward", lambda: check_stop_carry_forward("- **STOP-ONLY-ONE** — x\n")),
        ("parking-status", lambda: check_parking_status("### P-NO-STATUS — t\nbody\n")),
        ("parking-no-closed",
         lambda: check_parking_no_closed("### P-DONE — t\n**Status:** RESOLVED\n")),
        ("no-tombstones", lambda: check_no_tombstones(extra=["SYNTHETIC-TOMBSTONE.md"])),
        ("no-dangling-links",
         lambda: check_no_dangling_links(
             overrides={".claude/CLAUDE.md": "[x](does-not-exist-xyz.md)"})),
    ]
    failures = 0
    print("Negative control — each check must REJECT a synthetic violation:\n")
    for name, run in cases:
        res = run()
        verdict = "PASS (correctly rejected)" if not res.ok else "BROKEN (accepted bad input)"
        print(f"  [{verdict:28}] {name}: {res.detail}")
        if res.ok:
            failures += 1
    print()
    if failures:
        print(f"SELF-TEST FAILED — {failures} check(s) cannot detect their own violation.")
        return 1
    print("SELF-TEST PASSED — all 6 checks reject their violation. The gate is not vacuous.")
    return 0


# ----------------------------------------------------------------------------- main


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Mechanical doc-hygiene gate for /handoff (LEDGER size, D101 STOP "
                    "carry-forward, parking Status conformance, archive-on-resolve, "
                    "tombstones at live paths, dangling links).")
    ap.add_argument("--check", action="store_true",
                    help="gate mode: exit 1 if any check fails")
    ap.add_argument("--self-test", action="store_true",
                    help="prove each check can fail (negative control)")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    results = [c() for c in CHECKS]
    failed = [r for r in results if not r.ok]

    print("=" * 70)
    print("  handoff-preflight — doc-hygiene gate")
    print("=" * 70)
    for r in results:
        print(f"  [{'PASS' if r.ok else 'FAIL'}] {r.name}: {r.detail}")
        if not r.ok and r.fix:
            for line in r.fix.split(". "):
                if line.strip():
                    print(f"         fix: {line.strip().rstrip('.')}.")
    print("-" * 70)
    if failed:
        print(f"  {len(failed)} of {len(results)} checks FAILED.")
        if args.check:
            print("  Gate mode: handoff BLOCKED until these are fixed.")
            return 1
        print("  Report mode: not blocking. Re-run with --check to gate.")
        return 0
    print(f"  All {len(results)} checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
