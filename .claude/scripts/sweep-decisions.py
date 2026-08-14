#!/usr/bin/env python3
"""Sweep uncited decisions.md entries to memory/decisions-archive.md.

Selection rule (matches the 2026-08-08 sweep, documented in
.claude/hooks/doc-size-baseline.json): an entry qualifies for archiving only if
its D-number is cited by ZERO live docs (CLAUDE.md files, LEDGER, STOP-CATALOGUE,
parking, goals, mistakes, architecture.md, dev-setup.md, specs/ and plans/
excluding their archive/ subfolders, scripts/*.py excluding .claude/worktrees/)
-- checked both as an exact citation and as part of a D<N1>-D<N2> range citation.
Entries only present in the uncommitted working tree (not yet in git HEAD), or
added by the single most recent commit, are never swept -- they haven't had a
sweep cycle's worth of time to accumulate citations yet.

2026-08-14 adversarial-council review (4/6 personas independently converged):
a further "archive because the content is now redundant with its citing spec"
mechanism is NOT safe to automate -- tested against real entries, it targets
the WRONG ones (single-citation entries usually hold irreplaceable forensic
detail a spec deliberately doesn't restate, not duplication). This citation-
presence sweep is the correct, safe mechanical lever; don't extend it into a
semantic-redundancy judgment.

Usage: python .claude/scripts/sweep-decisions.py [--dry-run]
Run from the repo root (small-giants-wp/).
"""
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[2]
CLAUDE_DIR = REPO_ROOT / ".claude"
DECISIONS_PATH = CLAUDE_DIR / "decisions.md"
ARCHIVE_PATH = CLAUDE_DIR / "memory" / "decisions-archive.md"

SINGLE_PAT = re.compile(r"\bD(\d{3})\b")
RANGE_PAT = re.compile(r"\bD(\d{3})\s*-\s*D?(\d{2,3})\b")
HEADING_PAT = re.compile(r"(?m)^(## D\d+.*)$")


def scope_files():
    files = [
        REPO_ROOT / "CLAUDE.md",
        CLAUDE_DIR / "CLAUDE.md",
        CLAUDE_DIR / "LEDGER.md",
        CLAUDE_DIR / "STOP-CATALOGUE.md",
        CLAUDE_DIR / "parking.md",
        CLAUDE_DIR / "goals.md",
        CLAUDE_DIR / "mistakes.md",
        CLAUDE_DIR / "architecture.md",
        CLAUDE_DIR / "dev-setup.md",
    ]
    for base, pattern in [
        (CLAUDE_DIR / "specs", "*.md"),
        (CLAUDE_DIR / "plans", "*.md"),
    ]:
        if base.exists():
            for p in base.rglob(pattern):
                if "archive" in p.relative_to(base).parts:
                    continue
                files.append(p)
    for base in [REPO_ROOT / "plugins", REPO_ROOT / "theme", REPO_ROOT / "sites"]:
        if base.exists():
            files.extend(base.glob("*/CLAUDE.md"))
            files.extend(base.glob("*/*/CLAUDE.md"))
    for base in REPO_ROOT.rglob("scripts"):
        if "node_modules" in base.parts or ".claude\\worktrees" in str(base) or ".claude/worktrees" in str(base):
            continue
        files.extend(base.glob("*.py"))
    return [f for f in files if f.exists() and f.is_file()]


def build_cited_set():
    cited = set()
    for fp in scope_files():
        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for m in RANGE_PAT.finditer(text):
            a = int(m.group(1))
            braw = m.group(2)
            b = int(braw) if len(braw) == 3 else int(str(a)[0] + braw)
            if b >= a and (b - a) <= 50:
                for n in range(a, b + 1):
                    cited.add("D%03d" % n)
        for m in SINGLE_PAT.finditer(text):
            cited.add("D" + m.group(1))
    return cited


def parse_entries(text):
    parts = HEADING_PAT.split(text)
    preamble = parts[0]
    entries = {}  # D-number -> full entry text (heading + body)
    order = []
    for i in range(1, len(parts), 2):
        heading = parts[i]
        body = parts[i + 1] if i + 1 < len(parts) else ""
        m = re.match(r"## D(\d+)", heading)
        if not m:
            continue
        dnum = "D" + m.group(1)
        entries[dnum] = heading + body
        order.append(dnum)
    return preamble, entries, order


def committed_dnumbers():
    try:
        out = subprocess.run(
            ["git", "show", "HEAD:.claude/decisions.md"],
            cwd=REPO_ROOT, capture_output=True, check=True,
        ).stdout.decode("utf-8", errors="replace")
    except subprocess.CalledProcessError:
        return set()
    return set("D" + n for n in re.findall(r"^## D(\d+)", out, re.MULTILINE))


def most_recently_committed_dnumbers():
    """D-numbers added by the single most recent commit that touched decisions.md.

    A brand-new decision can be perfectly legitimate and still show zero external
    citations simply because it hasn't had time to be cited anywhere yet -- being
    freshly committed isn't proof it's safe to sweep. This gives entries from the
    latest commit one full sweep cycle of grace before they become eligible.
    """
    try:
        last_commit = subprocess.run(
            ["git", "log", "-1", "--format=%H", "--", "decisions.md"],
            cwd=CLAUDE_DIR, capture_output=True, check=True,
        ).stdout.decode("utf-8", errors="replace").strip()
        if not last_commit:
            return set()
        diff = subprocess.run(
            ["git", "diff", f"{last_commit}~1", last_commit, "--", "decisions.md"],
            cwd=CLAUDE_DIR, capture_output=True, check=True,
        ).stdout.decode("utf-8", errors="replace")
    except subprocess.CalledProcessError:
        return set()
    added = set()
    for line in diff.splitlines():
        if line.startswith("+## D"):
            m = re.match(r"\+## D(\d+)", line)
            if m:
                added.add("D" + m.group(1))
    return added


def main():
    dry_run = "--dry-run" in sys.argv

    raw = DECISIONS_PATH.read_bytes()
    text = raw.decode("utf-8")
    preamble, entries, order = parse_entries(text)

    cited = build_cited_set()
    committed = committed_dnumbers()
    just_added = most_recently_committed_dnumbers()

    candidates = [
        d for d in order
        if d not in cited and d in committed and d not in just_added
    ]
    skipped_uncommitted = [
        d for d in order
        if d not in cited and (d not in committed or d in just_added)
    ]

    kept = [d for d in order if d not in candidates]

    # cross-reference check: kept entries mentioning a swept D-number
    cross_refs = {}
    swept_set = set(candidates)
    for d in kept:
        refs = set("D" + r for r in SINGLE_PAT.findall(entries[d])) - {d}
        hits = refs & swept_set
        if hits:
            cross_refs[d] = sorted(hits, key=lambda x: int(x[1:]))

    total_before = len(raw)
    swept_bytes = sum(len(entries[d].encode("utf-8")) for d in candidates)

    print(f"Total entries: {len(order)}")
    print(f"Sweep candidates (uncited, committed): {len(candidates)}")
    if skipped_uncommitted:
        print(f"Skipped (uncited but not yet committed, e.g. in-flight work): {skipped_uncommitted}")
    print(f"Bytes to move: {swept_bytes:,} of {total_before:,} ({swept_bytes/total_before*100:.1f}%)")
    print(f"Kept entries referencing a swept entry ({len(cross_refs)}):")
    for d, refs in sorted(cross_refs.items(), key=lambda kv: int(kv[0][1:])):
        print(f"  {d} -> {refs}")

    if dry_run:
        print("\n[dry run] no files written.")
        return

    # Build new decisions.md (preamble + kept entries in original order)
    new_decisions = preamble + "".join(entries[d] for d in kept)

    # Build archive addition (candidates in ascending D-number order)
    candidates_sorted = sorted(candidates, key=lambda x: int(x[1:]))
    from datetime import date
    range_desc = (
        f"{candidates_sorted[0]}-{candidates_sorted[-1]}" if candidates_sorted else "none"
    )
    header = (
        f"\n## {date.today().isoformat()} — Sweep: uncited D-numbers "
        f"in the {range_desc} span\n\n"
        f"Selection rule: zero citations (exact or range) across CLAUDE.md, LEDGER, "
        f"STOP-CATALOGUE, parking, goals, mistakes, specs/ + plans/ (excl. archive/), "
        f"per-project/client CLAUDE.md files, and scripts/*.py. "
        f"{len(candidates_sorted)} entries moved verbatim. "
        f"Cross-referenced-by-a-kept-entry list (informational, not excluded from sweep): "
        f"{', '.join(f'{d}<-{refs}' for d, refs in sorted(cross_refs.items(), key=lambda kv: int(kv[0][1:])))}\n\n"
        f"---\n\n"
    )
    archive_addition = header + "".join(entries[d] for d in candidates_sorted)

    # decisions.md is pure LF; decisions-archive.md is pure CRLF. Preserve each
    # file's own convention rather than letting Python's text-mode writer pick
    # one -- the 2026-08-08 sweep note calls out CRLF->LF drift as a real past
    # mistake that produced a spurious whole-file diff.
    archive_before_bytes = ARCHIVE_PATH.read_bytes()
    archive_before = archive_before_bytes.decode("utf-8")
    archive_addition_crlf = archive_addition.replace("\r\n", "\n").replace("\n", "\r\n")
    new_archive = archive_before.rstrip("\r\n") + "\r\n" + archive_addition_crlf

    DECISIONS_PATH.write_bytes(new_decisions.encode("utf-8"))
    ARCHIVE_PATH.write_bytes(new_archive.encode("utf-8"))

    print(f"\ndecisions.md: {total_before:,} -> {len(new_decisions.encode('utf-8')):,} bytes")
    print(f"decisions-archive.md: {len(archive_before_bytes):,} -> {len(new_archive.encode('utf-8')):,} bytes")


if __name__ == "__main__":
    main()
