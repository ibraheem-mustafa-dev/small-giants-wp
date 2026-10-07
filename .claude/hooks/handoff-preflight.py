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
  5. plans-folder       plans/ holds only live plans: none with a finished `status:`, none whose
                        checkboxes are all ticked, and no plans/<name>.md reference that points at
                        a missing file (LEDGER, specs and live plans).

It never edits a file: detection only (a hook that rewrites a doc the agent just wrote
fights the agent). Each failure names the file, the measured value and the fix.
`--self-test` is two-sided: every check must reject a synthetic violation AND accept clean input.
"""
import argparse
import re
import sys
import tempfile
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


FINISHED_STATUS_RE = re.compile(r"^[\s\"']*(complete|done|closed|superseded)", re.IGNORECASE)
CHECKBOX_RE = re.compile(r"^[ \t]*[-*][ \t]+\[([ xX])\]", re.MULTILINE)
_PLAN_PATH_RE = r"(?:\.claude/)?plans/(?:archive/)?"
_WHOLE_PATH_RE = re.compile(r"^(?:\.{1,2}/)*" + _PLAN_PATH_RE + r"[^/]+\.md$")
_BACKTICK_RE = re.compile(r"`([^`\n]*plans/[^`\n]*\.md[^`\n]*)`")
_LINK_RE = re.compile(r"\]\(([^)\n]*plans/[^)\n]*\.md[^)\n]*)\)")
_BARE_RE = re.compile(r"(?<![\w./-])(" + _PLAN_PATH_RE + r"[^\s`()\[\]<>*\"'#/]+\.md)")


def _front_matter_status(text: str) -> str | None:
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    m = re.search(r"^status:[ \t]*(.*)$", text[3:end], re.MULTILINE)
    return m.group(1) if m else None


def _plan_refs(text: str) -> set[str]:
    """Every plans/<name>.md reference in `text`, as a path relative to .claude/ (spaces are
    kept only inside backticks or a link target)."""
    refs: set[str] = set()
    for pattern in (_BACKTICK_RE, _LINK_RE):
        for m in pattern.finditer(text):
            cand = m.group(1).split("#")[0].strip()
            if "<" in cand or "*" in cand:
                continue
            if _WHOLE_PATH_RE.match(cand):
                refs.add(cand)
            else:
                refs.update(b.group(1) for b in _BARE_RE.finditer(cand))
    refs.update(b.group(1) for b in _BARE_RE.finditer(text))
    out = set()
    for r in refs:
        r = re.sub(r"^(?:\.{1,2}/)*(?:\.claude/)?", "", r)
        out.add(r)
    return out


def check_plans_folder(claude_dir: Path | None = None) -> Result:
    root = claude_dir if claude_dir is not None else _CLAUDE
    plans = root / "plans"
    problems: list[str] = []
    plan_files = sorted(plans.glob("*.md")) if plans.is_dir() else []
    for f in plan_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        status = _front_matter_status(text)
        if status is not None and FINISHED_STATUS_RE.match(status):
            problems.append(f"plans/{f.name}: status '{status.strip()[:30]}' is finished (move to plans/archive/)")
        boxes = CHECKBOX_RE.findall(text)
        if boxes and " " not in boxes:
            problems.append(f"plans/{f.name}: all {len(boxes)} checkbox(es) ticked (move to plans/archive/)")
    sources = [root / "LEDGER.md"]
    sources += sorted((root / "specs").glob("*.md")) if (root / "specs").is_dir() else []
    sources += plan_files
    for src in sources:
        if not src.is_file():
            continue
        text = src.read_text(encoding="utf-8", errors="replace")
        for ref in sorted(_plan_refs(text)):
            if not (root / ref).exists():
                problems.append(f"{src.relative_to(root).as_posix()} -> {ref} (missing)")
    if not problems:
        return Result("plans-folder", True, f"{len(plan_files)} live plan(s), none finished, no dangling plan reference")
    return Result(
        "plans-folder", False,
        f"{len(problems)} problem(s): " + "; ".join(problems),
        "Move finished plans to plans/archive/ (git mv) and repoint or remove every reference "
        "to a plan file that no longer exists.",
    )


CHECKS = (check_ledger_size, check_no_tombstones, check_no_dangling_links, check_memory_size,
          check_plans_folder)


def _plans_case(files: dict[str, str]) -> Result:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for rel, body in files.items():
            target = root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body, encoding="utf-8")
        return check_plans_folder(root)


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
        ("plans-folder: finished status",
         lambda: _plans_case({"plans/a.md": "---\nstatus: COMPLETE\n---\n- [ ] open\n"}),
         lambda: _plans_case({"plans/a.md": "---\nstatus: phase 1 shipped\n---\n- [ ] open\n",
                              "plans/b.md": "---\nstatus: BUILD IN PROGRESS\n---\n- [x] a\n- [ ] b\n"})),
        ("plans-folder: all ticked",
         lambda: _plans_case({"plans/a.md": "- [x] one\n* [X] two\n"}),
         lambda: _plans_case({"plans/a.md": "no checkboxes here\n"})),
        ("plans-folder: missing reference",
         lambda: _plans_case({"LEDGER.md": "see `plans/missing-plan.md`\n"}),
         lambda: _plans_case({"LEDGER.md": "see `.claude/plans/a.md`, [x](plans/archive/z.md#top) and plans/<name>.md\n",
                              "plans/a.md": "- [ ] open\n", "plans/archive/z.md": "- [x] done\n"})),
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
