#!/usr/bin/env python3
"""check-withdrawn-figures.py — a figure withdrawn in one file stays withdrawn everywhere.

WHY: eleven files restate "13 days and 25 corrections" as settled fact. That
figure was WITHDRAWN by THE-MIGRATION-METHOD.md itself (the seven cited
D-numbers span three days, not thirteen). Its replacement -- "71 commits, 23
fixes" -- also fails to reproduce: 67 and 21 today. A figure copied into eleven
files and corrected in one is the drift this repo keeps paying for.

The fix is not a better number. It is NO number outside the one canonical
table, and a bare pointer everywhere else.

Follows the method's own contract (THE-MIGRATION-METHOD.md Steps 4-10):
--survey / --fix / --fix --apply / --check / --self-test, with a negative
control AND a corpus control.

The corpus control exists because this script needed it: its transform-only
self-test passed 5/5 while the census found ZERO, because ROOT resolved
outside the repo and targets() returned []. A detector whose corpus silently
collapses reports the same clean census as a clean tree. That failure is now
a fixture (assert_corpus), and it is why Step 6 of the method lists a corpus
control as the sixth required fixture.
"""
from __future__ import annotations
import argparse, difflib, os, re, sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# CORPUS ANCHOR. Walking up from __file__ is correct for an in-repo script and
# WRONG for this one: it lives in a scratch dir, so the walk never reaches the
# repo and targets() returns []. The self-test passed 5/5 against synthetic
# fixtures while the census found zero -- a detector that had stopped detecting,
# invisible to a transform-only self-test. Hence assert_corpus() below.
# ⛔ The marker must be REPO-UNIQUE. `CLAUDE.md` is NOT: plugins/sgs-blocks has
# its own, so when the gate runner invokes this from that directory, ROOT bound
# there and the corpus silently fell from 380 files to 4 — and `--check` printed
# a clean PASS. Second corpus collapse in this one script, different cause.
_MARKER = Path(".claude") / "THE-MIGRATION-METHOD.md"


def _find_root() -> Path:
    for cand in (Path(os.environ["SGS_REPO"]).resolve() if os.environ.get("SGS_REPO") else None,
                 Path.cwd().resolve(), Path(__file__).resolve().parent):
        if cand is None:
            continue
        for d in (cand, *cand.parents):
            if (d / _MARKER).exists():
                return d
    raise SystemExit(f"FAIL-CLOSED: cannot locate repo root (no {_MARKER.as_posix()})")


ROOT = _find_root()

# The one file allowed to carry the figures: it is where they are DOCUMENTED as
# withdrawn, with the derivation. Excluding it is the whole point.
EXCLUDE = {
    ".claude/THE-MIGRATION-METHOD.md",   # the canonical table itself
}

_THESIS = (" What separated them was not the census — the slow rollout had one on day 2 —\n"
           "but whether the TARGET SHAPE was settled first. See THE-MIGRATION-METHOD.md Step 3.")

_INLINE = "a withdrawn figure — see THE-MIGRATION-METHOD.md, do not restate it here"

REPLACEMENT = ("Measured: a census-driven pass moves the corrections out of the tree and "
               "into the detector, where one commit fixes hundreds of sites. Figures + "
               "derivation live in ONE place — do not copy them here.")

# Two shapes. Under the method's own test they are two cases, not one:
# they differ in more than their hole values.
SHAPES = [
    # A: the "cost 13 days and 25 corrections ... 204 sites in one day" banner
    (re.compile(r"Block-by-block cost 13 days\s*\n?and 25 corrections for 33 blocks; "
                r"the detector-first path did 204 sites in one day\.", re.M), "A"),
    # B: the "took 33 blocks over 13 days and 25 correction commits" banner
    (re.compile(r"(?:Measured: three codemod\s*\n?migrations did [^\n]*\n?"
                r"|the block-by-block colour rollout\s*\n?)?"
                r"took 33 blocks over 13 days and 25 correction commits\.", re.M), "B"),
    # C + D were MISSED by the first census and survived in .claude/LEDGER.md --
    # the repo's single living status doc -- while this gate reported clean.
    # A and B are anchored on SENTENCES. C and D are anchored on the FIGURE,
    # which is the thing that actually must not recur: prose gets reworded,
    # the number is what misleads.
    (re.compile(r"\*\*33 blocks over 13 days and\s*\n?\s*25 correction commits\*\*", re.M), "C"),
    (re.compile(r"\b\d+ (?:call sites|closures|guards) in ONE day", re.M), "D"),
    # E: the OVERTURNED THESIS, not a figure. The 33-block colour wave WAS
    # census-driven on day 2 (f6f3c0331) and still cost a fortnight -- so
    # "the census was the only difference" is the claim the method now
    # rebuts. It survived in CLAUDE.md and plugins/sgs-blocks/CLAUDE.md,
    # both AUTO-LOADED, where a cold agent meets it before the method doc.
    (re.compile(r"\s*(?:Same repo, same week, same rules\.\s*)?"
                r"The only difference was building the census before the edit\.", re.M), "E"),
]


# PRUNE during the walk, never filter after it. `.claude/worktrees/` holds a
# whole second copy of the repo, so an rglob that descends and then discards
# pays the full cost of walking it. This is the same worktree hazard
# THE-MIGRATION-METHOD.md lists, met live.
_PRUNE = {"worktrees", "node_modules", "build", "vendor", "memory", ".git"}


def targets() -> list[Path]:
    out: list[Path] = []
    out.extend(ROOT.glob("*.md"))
    out.extend((ROOT / "plugins" / "sgs-blocks").glob("*.md"))
    for dirpath, dirnames, filenames in os.walk(ROOT / ".claude"):
        dirnames[:] = [d for d in dirnames
                       if d not in _PRUNE and "archive" not in d.lower()]
        for fn in filenames:
            if fn.endswith(".md"):
                out.append(Path(dirpath) / fn)
    return sorted({p for p in out if "archive" not in p.as_posix().lower()})


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def transform(text: str, relpath: str) -> tuple[str, list[tuple[str, str]]]:
    """Pure function of the text. Idempotent: re-running finds nothing."""
    records: list[tuple[str, str]] = []
    if relpath in EXCLUDE:
        for rx, tag in SHAPES:
            if rx.search(text):
                records.append((tag, "excluded"))
        return text, records
    for rx, tag in SHAPES:
        if rx.search(text):
            sub = REPLACEMENT if tag in ("A", "B") else (_THESIS if tag == "E" else _INLINE)
            text = rx.sub(sub, text)
            records.append((tag, "rewritten"))
    return text, records


def scan(apply_changes=False, show_diff=False):
    tally = {"rewritten": 0, "excluded": 0}
    changed = []
    for p in targets():
        r = rel(p)
        try:
            # newline="" on the READ too, or Python translates CRLF to LF and
            # writing back rewrites every line ending -- a 1-line change becomes
            # a whole-file diff. This script had that exact bug; it is the hazard
            # THE-MIGRATION-METHOD.md lists, made live.
            with open(p, encoding="utf-8", newline="") as fh:
                old = fh.read()
        except (UnicodeDecodeError, OSError):
            continue
        new, records = transform(old, r)
        for tag, kind in records:
            tally[kind] += 1
            print(f"  {kind:<10} shape {tag}  {r}")
        if new != old:
            changed.append(r)
            if show_diff:
                for line in difflib.unified_diff(old.splitlines(True), new.splitlines(True),
                                                 "a/" + r, "b/" + r, n=1):
                    print("    " + line.rstrip())
            if apply_changes:
                tmp = p.with_suffix(p.suffix + ".tmp")
                tmp.write_text(new, encoding="utf-8", newline="")
                os.replace(tmp, p)          # atomic, per the method's own hazard list
    return tally, changed


def assert_corpus() -> list[str]:
    """A control on the CORPUS, not the transform.

    A detector whose target list silently became empty reports the same clean
    census as a genuinely clean tree. transform()-only fixtures cannot see it.
    """
    fails = []
    t = targets()
    if len(t) < 20:
        fails.append(f"corpus collapsed: targets() returned {len(t)} files")
    if not (ROOT / "CLAUDE.md").exists():
        fails.append("ROOT does not look like the repo")
    return fails


def self_test() -> int:
    fails = assert_corpus()
    a = ("⛔ **More than 3 blocks? The first deliverable is the\n"
         "DETECTOR, not the edit — `.claude/THE-MIGRATION-METHOD.md`.** Block-by-block cost 13 days\n"
         "and 25 corrections for 33 blocks; the detector-first path did 204 sites in one day.\n")
    b = ("⛔ **MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST.**\n"
         "took 33 blocks over 13 days and 25 correction commits. Same repo, same week.\n")
    inert = "# A doc with no banner at all.\nNothing to see.\n"

    out_a, rec_a = transform(a, "x.md")
    if "13 days" in out_a or not rec_a:
        fails.append("positive A not rewritten")
    out_b, rec_b = transform(b, "y.md")
    if "13 days" in out_b or not rec_b:
        fails.append("positive B not rewritten")
    # NEGATIVE CONTROL: a file with no banner must come back byte-identical.
    out_i, rec_i = transform(inert, "z.md")
    if out_i != inert or rec_i:
        fails.append("negative control mutated")
    # EXCLUSION: the canonical file keeps its figures.
    out_e, rec_e = transform(a, ".claude/THE-MIGRATION-METHOD.md")
    if out_e != a or rec_e != [("A", "excluded")]:
        fails.append("excluded file was rewritten")
    # IDEMPOTENCE: running twice equals running once.
    if transform(out_a, "x.md")[0] != out_a:
        fails.append("not idempotent")
    for f in fails:
        print("  FAIL", f)
    print(f"  self-test: {7 - len(fails)}/7 assertions passed "
          f"(corpus: {len(targets())} files)")
    return 1 if fails else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    if a.self_test:
        return self_test()
    if a.check:
        corpus_fails = assert_corpus()
        if corpus_fails:
            for f in corpus_fails:
                print(f"  FAIL {f}")
            print("[check] FAIL-CLOSED: the corpus control tripped. A census over the "
                  "wrong tree prints the same PASS as a clean one.")
            return 1
        tally, changed = scan()
        print(f"[check] {len(changed)} file(s) still carry a withdrawn figure")
        return 1 if changed else 0
    tally, changed = scan(apply_changes=bool(a.fix and a.apply), show_diff=bool(a.fix))
    print(f"\nrewritten={tally['rewritten']} excluded={tally['excluded']} "
          f"files={len(changed)} {'APPLIED' if a.fix and a.apply else '(dry run)'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
