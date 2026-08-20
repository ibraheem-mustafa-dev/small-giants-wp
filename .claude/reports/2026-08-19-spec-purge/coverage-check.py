#!/usr/bin/env python
"""Coverage gate: does each spec have enough register rows for its vocabulary hits?

A completeness error is invisible to every correctness gate - each registered row can be
perfectly correct while a third of the sites were never looked at. This compares, per spec,
the number of LINES matching the detection vocabulary against the number of register rows
that name that spec, and flags any spec whose coverage ratio is an outlier.

Not a pass/fail oracle - vocabulary lines and register rows are not 1:1 (one row can cover a
multi-line block; one line can hold two hits). It is a *disproportion* detector: it finds the
spec that was swept differently from its peers, which is what under-auditing looks like.
"""
import pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).parent
SPECS = HERE.parent.parent / "specs"
SKIP_SPECS = {"02-SGS-BLOCKS-REFERENCE.md", "common-wp-styling-errors.md", "go-live-checklist.md"}

VOCAB = (
    r"~~|supersed|deprecat|OUTDATED|STALE|stale|was WRONG|corrected 20|CORRECTED|RETIRED|retired"
    r"|obsolete|replaced by|amended|kept for the|do not act on|correction|corrects|rejected"
    r"|overrul|rescind|revok|reverted|re-litigat|withdrawn|invalidat|misleading|false as written"
    r"|mis-cit|phantom|fossil|left in place|DELETED by|\bcancell?ed\b|\bMOOT\b|\bpurged\b"
    r"|chosen over|in favou?r of|considered and rejected|\bOption [A-D]\b"
)

# Gather register rows per spec filename
rows = {}
for reg in HERE.glob("*.md"):
    if reg.name in {"_CONTRACT.md", "REVIEW.md"}:
        continue
    for m in re.finditer(r"^### ([^\s:]+\.md)", reg.read_text(encoding="utf-8", errors="replace"), re.M):
        rows[m.group(1)] = rows.get(m.group(1), 0) + 1

print(f"{'spec':<46} {'hits':>5} {'rows':>5} {'ratio':>7}  flag")
print("-" * 78)
ratios = []
for spec in sorted(SPECS.glob("*.md")):
    if spec.name in SKIP_SPECS:
        continue
    try:
        text = spec.read_text(encoding="utf-8", errors="replace")
    except OSError:
        continue
    hits = sum(1 for line in text.splitlines() if re.search(VOCAB, line, re.I))
    if hits == 0:
        continue
    n = rows.get(spec.name, 0)
    ratio = n / hits if hits else 0
    ratios.append((ratio, spec.name, hits, n))

# Median over specs that HAVE been registered. A zero-row spec means "not audited yet",
# which is a different condition from "audited thinly" - including it drags the median to 0
# and blinds the disproportion test that is the whole point of this gate.
audited = [r[0] for r in ratios if r[3] > 0]
median = sorted(audited)[len(audited) // 2] if audited else 0
bad = 0
pending = 0
for ratio, name, hits, n in sorted(ratios):
    flag = ""
    if n == 0:
        flag = "not registered yet"
        pending += 1
        print(f"{name:<46} {hits:>5} {n:>5} {'-':>7}  {flag}")
        continue
    elif median and ratio < median * 0.5:
        flag = f"UNDER-SWEPT (median ratio {median:.2f})"
        bad += 1
    print(f"{name:<46} {hits:>5} {n:>5} {ratio:>7.2f}  {flag}")

print("-" * 78)
print(f"median coverage ratio: {median:.2f}")
print(f"under-swept          : {bad}")
print(f"awaiting register    : {pending}")
sys.exit(1 if bad else 0)
