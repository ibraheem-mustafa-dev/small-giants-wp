#!/usr/bin/env python
"""handoff-preflight — the mechanical doc-hygiene gate /handoff runs before it closes.

    python .claude/hooks/handoff-preflight.py            # report
    python .claude/hooks/handoff-preflight.py --check    # gate: exit 1 on any failure
    python .claude/hooks/handoff-preflight.py --self-test

Checks:
  1. ledger-size        LEDGER.md stays under CAP_BYTES (it is replaced each handoff, never appended).
  2. no-tombstones      no retired status doc sits at a live path pretending to be current.
  3. no-dangling-links  every .md link out of a session-start doc resolves.
  4. memory-size        the auto-memory MEMORY.md index stays under MEMORY_CAP_BYTES — past
                        Claude Code's load limit the bottom entries silently stop loading.

It never edits a file: detection only (a hook that rewrites a doc the agent just wrote
fights the agent). Each failure names the file, the measured value and the fix.
`--self-test` is two-sided: every check must reject a synthetic violation AND accept clean input.
"""
import argparse
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
_CLAUDE = _REPO / ".claude"

CAP_BYTES = 24576          # LEDGER.md
MEMORY_CAP_BYTES = 16384   # auto-memory MEMORY.md index

TOMBSTONE_PATHS = (
    ".claude/state.md",
    ".claude/handoff.md",
    ".claude/next-session-prompt.md",
    ".claude/plan.md",
    ".claude/parking.md",
    ".claude/decisions.md",
    ".claude/mistakes.md",
    ".claude/STOP-CATALOGUE.md",
    ".claude/goals.md",
    "CONVERSATION-HANDOFF.md",
    "NEXT-SESSION-PROMPT.md",
)
TOMBSTONE_GLOBS = (".claude/next-session-prompt-*.md",)

LINK_SOURCES = (".claude/CLAUDE.md", ".claude/specs/README.md", ".claude/LEDGER.md", "CLAUDE.md")


class Result:
    """One check's verdict. `ok` False means a real violation, not a warning."""

    def __init__(self, name: str, ok: bool, detail: str, fix: str = ""):
        self.name = name
        self.ok = ok
        self.detail = detail
        self.fix = fix


def check_ledger_size(ledger_text: str | None = None) -> Result:
    path = _CLAUDE / "LEDGER.md"
    if ledger_text is None:
        if not path.exists():
            return Result("ledger-size", True, "no LEDGER.md")
        size = path.stat().st_size
    else:
        size = len(ledger_text.encode("utf-8"))
    if size <= CAP_BYTES:
        return Result("ledger-size", True, f"{size:,} / {CAP_BYTES:,} bytes")
    return Result(
        "ledger-size", False,
        f"LEDGER.md is {size:,} bytes, cap is {CAP_BYTES:,} (over by {size - CAP_BYTES:,})",
        "Cut finished items (git holds them) and keep only current fronts, what is next and "
        "pointers to where parked work is recorded.",
    )


def check_no_tombstones(extra: list[str] | None = None, scan: bool = True) -> Result:
    found = list(extra or [])
    if scan:
        found += [rel for rel in TOMBSTONE_PATHS if (_REPO / rel).exists()]
    for pattern in TOMBSTONE_GLOBS if scan else ():
        parent = _REPO / Path(pattern).parent
        if parent.is_dir():
            found += [str(p.relative_to(_REPO)).replace("\\", "/")
                      for p in parent.glob(Path(pattern).name)]
    if not found:
        return Result("no-tombstones", True, "no retired doc at a live path")
    return Result(
        "no-tombstones", False,
        f"{len(found)} retired doc(s) at live path(s): {', '.join(sorted(set(found)))}",
        "Move the content to its home (LEDGER, the relevant plan or spec, or auto memory) and "
        "delete the file.",
    )


def check_no_dangling_links(overrides: dict[str, str] | None = None) -> Result:
    import re
    link_re = re.compile(r"\]\(([^)\s#]+\.md)(?:#[^)]*)?\)")
    dangling, checked = [], 0
    for rel in (overrides if overrides is not None else LINK_SOURCES):
        src = _REPO / rel
        if overrides is not None:
            text = overrides[rel]
        elif src.exists():
            text = src.read_text(encoding="utf-8", errors="replace")
        else:
            continue
        for m in link_re.finditer(text):
            target = m.group(1)
            checked += 1
            if target.startswith(("http://", "https://")):
                continue
            if not any(c.exists() for c in (src.parent / target, _REPO / target, _CLAUDE / target)):
                dangling.append(f"{rel} -> {target}")
    if not dangling:
        return Result("no-dangling-links", True, f"{checked} links checked, all resolve")
    return Result(
        "no-dangling-links", False,
        f"{len(dangling)} dangling link(s): {'; '.join(dangling[:8])}",
        "Repoint at the doc that now owns that content, or remove the link.",
    )


def _find_memory_files() -> list[Path]:
    """The Claude Code auto-memory index for this repo (matched by the repo folder name, so a
    worktree checkout resolves to the main repo's memory)."""
    main_name = Path(_REPO.as_posix().split("/.claude/worktrees/")[0]).name
    projects = Path.home() / ".claude" / "projects"
    if not projects.is_dir():
        return []
    return [d / "memory" / "MEMORY.md" for d in sorted(projects.iterdir())
            if d.is_dir() and d.name.endswith(main_name) and (d / "memory" / "MEMORY.md").exists()]


def check_memory_size(sizes: dict[str, int] | None = None) -> Result:
    if sizes is None:
        sizes = {p.as_posix(): p.stat().st_size for p in _find_memory_files()}
    if not sizes:
        return Result("memory-size", True, "no MEMORY.md found")
    over = {n: s for n, s in sizes.items() if s > MEMORY_CAP_BYTES}
    if not over:
        biggest = max(sizes.values())
        return Result("memory-size", True, f"largest MEMORY.md {biggest:,} / {MEMORY_CAP_BYTES:,} bytes")
    detail = "; ".join(f"{n} is {s:,}" for n, s in sorted(over.items()))
    return Result(
        "memory-size", False, f"MEMORY.md over the {MEMORY_CAP_BYTES:,}-byte cap: {detail}",
        "Merge or delete the weakest lessons (and their files) until the index fits. "
        "Past the limit, the bottom entries silently stop loading.",
    )


CHECKS = (check_ledger_size, check_no_tombstones, check_no_dangling_links, check_memory_size)


def self_test() -> int:
    cases = [
        ("ledger-size",
         lambda: check_ledger_size("x" * (CAP_BYTES + 1)),
         lambda: check_ledger_size("short file\n")),
        ("no-tombstones",
         lambda: check_no_tombstones(extra=["SYNTHETIC-TOMBSTONE.md"], scan=False),
         lambda: check_no_tombstones(extra=[], scan=False)),
        ("no-dangling-links",
         lambda: check_no_dangling_links(overrides={".claude/CLAUDE.md": "[x](does-not-exist-xyz.md)"}),
         lambda: check_no_dangling_links(overrides={".claude/CLAUDE.md": "no links here\n"})),
        ("memory-size",
         lambda: check_memory_size({"synthetic/MEMORY.md": MEMORY_CAP_BYTES + 1}),
         lambda: check_memory_size({"synthetic/MEMORY.md": MEMORY_CAP_BYTES - 1})),
    ]
    failures = 0
    for name, bad_fn, good_fn in cases:
        bad, good = bad_fn(), good_fn()
        ok = (not bad.ok) and good.ok
        failures += not ok
        print(f"  {'ok  ' if ok else 'FAIL'} {name}: rejects '{bad.detail}' / accepts '{good.detail}'")
    print("SELF-TEST " + ("PASSED" if not failures else f"FAILED ({failures})"))
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="gate mode: exit 1 if any check fails")
    ap.add_argument("--self-test", action="store_true", help="prove each check can fail and pass")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    results = [c() for c in CHECKS]
    failed = [r for r in results if not r.ok]
    for r in results:
        print(f"  [{'PASS' if r.ok else 'FAIL'}] {r.name}: {r.detail}")
        if not r.ok and r.fix:
            print(f"         fix: {r.fix}")
    if failed and args.check:
        print(f"  {len(failed)} of {len(results)} checks FAILED — handoff blocked until fixed.")
        return 1
    print(f"  {len(results) - len(failed)} of {len(results)} checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
