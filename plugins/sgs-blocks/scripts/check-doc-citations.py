#!/usr/bin/env python3
"""
check-doc-citations.py — a `file:line` citation in a doc must land on what it names.

⛔ WHY THIS EXISTS. `.claude/THE-MIGRATION-METHOD.md` carries a skeleton table
mapping symbol -> line in `migrate-length-sanitiser.py`. It went stale THREE
TIMES IN ONE DAY, each time because the model gained a function above the ones
cited and every number below shifted 50-odd lines. Each time a cold agent
following the doc opened the wrong line: once landing on an unrelated comment
about `gridItemPadding` while looking for a truncating write.

The doc already says "if a line number does not land on the named construct, the
model has moved — re-derive with grep". That instruction is correct and nothing
enforced it, so the numbers rotted anyway. A prose rule an agent can skip is not
a gate; this is.

WHAT IT CHECKS
--------------
Every markdown table row of the shape `| \\`symbol\\` | \\`:N\\` | ... |` in a
governed doc must have `symbol`'s bare name appear on line N of the file that
table is about. The file is declared per-doc in `_GOVERNED` below, because a
citation with no declared subject cannot be checked -- and silently skipping
unresolvable rows is how this class of gate goes vacuous.

    python scripts/check-doc-citations.py --check      # exit 1 on any stale citation
    python scripts/check-doc-citations.py --survey     # list every citation + verdict
    python scripts/check-doc-citations.py --self-test  # incl. a negative control

UK English throughout.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

_HERE = Path(__file__).resolve().parent
_PLUGIN = _HERE.parent
_REPO = _PLUGIN.parent.parent

# doc -> the source file its `| `sym` | `:N` |` table cites.
# ⛔ A doc whose subject is not declared here is NOT checked. Add the pair when
# you add a citation table, or the table is unguarded.
_GOVERNED = {
    _REPO / ".claude" / "THE-MIGRATION-METHOD.md":
        _PLUGIN / "scripts" / "migrate-length-sanitiser.py",
}

_ROW = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*`:(\d+)`\s*\|")


def _bare(symbol: str) -> str:
    """`scan(...)` -> `scan`; `rel(path)` -> `rel`; `ROOT` -> `ROOT`."""
    return re.sub(r"\(.*\)$", "", symbol).strip()


def citations(doc: Path):
    for n, line in enumerate(doc.read_text(encoding="utf-8").split("\n"), 1):
        m = _ROW.match(line)
        if m:
            yield n, m.group(1), int(m.group(2))


def audit():
    """Returns (results, failures). A result is (doc, docline, sym, srcline, ok)."""
    results, failures = [], []
    for doc, src in _GOVERNED.items():
        if not doc.exists():
            failures.append(f"governed doc missing: {doc}")
            continue
        if not src.exists():
            failures.append(f"cited source missing: {src}")
            continue
        src_lines = src.read_text(encoding="utf-8").split("\n")
        found = 0
        for docline, sym, ln in citations(doc):
            found += 1
            target = src_lines[ln - 1] if 0 < ln <= len(src_lines) else ""
            ok = _bare(sym) in target
            results.append((doc, docline, sym, ln, ok, target.strip()))
            if not ok:
                failures.append(
                    f"{doc.name}:{docline} cites `{sym}` at `:{ln}` of {src.name}, "
                    f"but that line is: {target.strip()[:60] or '(past end of file)'}"
                )
        if found == 0:
            # A governed doc that yields no citations means the table was renamed
            # or removed -- indistinguishable from "all citations pass" unless
            # we say so. Fail closed rather than report a vacuous green.
            failures.append(
                f"{doc.name}: NO citations found. Either the table moved (fix the "
                f"regex) or it was deleted (remove the _GOVERNED entry). A gate "
                f"over zero rows is not a passing gate."
            )
    return results, failures


def do_survey() -> int:
    results, failures = audit()
    for doc, docline, sym, ln, ok, target in results:
        print(f"  {'ok  ' if ok else 'STALE'} {sym:<20} :{ln:<5} {target[:56]}")
    print(f"\n  {sum(1 for r in results if r[4])} land, "
          f"{sum(1 for r in results if not r[4])} stale, across {len(_GOVERNED)} doc(s)")
    return 1 if failures else 0


def do_check() -> int:
    _, failures = audit()
    if failures:
        print(f"[doc-citations] {len(failures)} stale citation(s):")
        for f in failures:
            print(f"  - {f}")
        print("\n  Re-derive, do not hand-edit:")
        print("    grep -n '^def \\|^SELF_TEST\\|^BARE_OK\\|^WIDTH_OK\\|^ROOT' "
              "plugins/sgs-blocks/scripts/migrate-length-sanitiser.py")
        return 1
    total = sum(1 for _ in audit()[0])
    print(f"[doc-citations] {total} citation(s) land on the construct they name.")
    return 0


def do_self_test() -> int:
    fails = []

    def check(name, cond, detail=""):
        print(f"  {'ok  ' if cond else 'FAIL'} {name}" + (f" — {detail}" if detail and not cond else ""))
        if not cond:
            fails.append(name)

    print("SELF-TEST")
    results, failures = audit()
    check("the real doc's citations all land", not failures, str(failures[:1]))
    check("citations were actually found (not a vacuous pass)", len(results) > 0,
          f"{len(results)} rows")

    # Parser
    check("`scan(...)` reduces to `scan`", _bare("scan(...)") == "scan")
    check("`rel(path)` reduces to `rel`", _bare("rel(path)") == "rel")
    check("`ROOT` is unchanged", _bare("ROOT") == "ROOT")

    # NEGATIVE CONTROL — a deliberately wrong citation must be caught. Without
    # this, a parser that silently matched nothing would report a clean pass,
    # which is indistinguishable from every citation being correct.
    import tempfile
    d = Path(tempfile.mkdtemp())
    (d / "src.py").write_text("line one\ndef real_thing():\n    pass\n", encoding="utf-8")
    (d / "doc.md").write_text(
        "| Part | Where | What |\n|---|---|---|\n"
        "| `real_thing()` | `:2` | correct |\n"
        "| `real_thing()` | `:1` | WRONG — line 1 is 'line one' |\n", encoding="utf-8")
    global _GOVERNED
    saved = _GOVERNED
    _GOVERNED = {d / "doc.md": d / "src.py"}
    try:
        res, fail = audit()
        check("negative control: the wrong citation is caught", len(fail) == 1, f"{len(fail)} failures")
        check("negative control: the right citation still passes",
              sum(1 for r in res if r[4]) == 1)
    finally:
        _GOVERNED = saved
        for f in d.iterdir():
            f.unlink()
        d.rmdir()

    print()
    if fails:
        print(f"SELF-TEST FAIL — {len(fails)}: {fails}")
        return 1
    print("SELF-TEST PASS — including the negative control")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify doc file:line citations land.")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return do_self_test()
    if a.survey:
        return do_survey()
    return do_check()


if __name__ == "__main__":
    raise SystemExit(main())
