#!/usr/bin/env python
"""Residual gate: every surviving vocabulary hit must be one we DECIDED to keep.

This is the check that catches what spot-checking cannot. After the purge, re-run the
detection vocabulary over the cleaned specs. Every line that still matches must map to a
row in the register - almost always an EXCLUDE row, occasionally a CONDENSE whose
replacement legitimately still contains a trigger word (e.g. a guard rail that says
"X was rejected").

A surviving hit with NO register row is a MISS: a site nobody ever looked at. That is
exactly how `02-SGS-BLOCKS.md:33` slipped through - it said "each with `deprecated.js`
shim for backward compat", which is the same false claim as the six registered sites in a
wording no pattern happened to catch, and no row existed to explain why it was still there.

Matching is by LINE CONTENT, not line number: the purge shifts every line below each edit,
so register line numbers are stale by construction. We compare the set of surviving hit
TEXTS against the BEFORE/AFTER text recorded in the register.
"""
import re
import pathlib
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HERE = pathlib.Path(__file__).parent
SPECS = HERE.parent.parent / "specs"
SKIP_SPECS = {
    "02-SGS-BLOCKS-REFERENCE.md",
    "common-wp-styling-errors.md",
    "go-live-checklist.md",
}

VOCAB = (
    r"~~|supersed|deprecat|OUTDATED|STALE|stale|was WRONG|corrected 20|CORRECTED|RETIRED|retired"
    r"|obsolete|replaced by|amended|kept for the|do not act on|correction|corrects|rejected"
    r"|overrul|rescind|revok|reverted|re-litigat|withdrawn|invalidat|misleading|false as written"
    r"|mis-cit|phantom|fossil|left in place|DELETED by|\bcancell?ed\b|\bMOOT\b|\bpurged\b"
    r"|chosen over|in favou?r of|considered and rejected|\bOption [A-D]\b"
)

# Distinctive substrings from every register row, per spec. A surviving hit is "explained"
# if it shares a long enough distinctive fragment with something the register recorded.
registered = {}
for reg in HERE.glob("*.md"):
    if reg.name in {"_CONTRACT.md", "_APPLY.md", "REVIEW.md", "ESCALATIONS-RESOLVED.md"}:
        continue
    text = reg.read_text(encoding="utf-8", errors="replace")
    for block in re.split(r"^### ", text, flags=re.M)[1:]:
        head = block.split("\n", 1)[0]
        spec = head.split(":")[0].strip()
        if not spec.endswith(".md"):
            continue
        registered.setdefault(spec, []).append(block)


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def explained(hit, blocks):
    """True if this surviving line looks like something the register accounted for."""
    h = norm(hit)
    if len(h) < 25:
        return True  # too short to attribute either way; not evidence of a miss
    for b in blocks:
        nb = norm(b)
        # Any 40-char run of the surviving line appearing in the row's text counts.
        for i in range(0, max(1, len(h) - 40), 12):
            if h[i:i + 40] and h[i:i + 40] in nb:
                return True
    return False


total_hits = 0
total_unexplained = 0
report = []
for spec in sorted(SPECS.glob("*.md")):
    if spec.name in SKIP_SPECS:
        continue
    blocks = registered.get(spec.name, [])
    unexplained = []
    hits = 0
    for i, line in enumerate(spec.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        if not re.search(VOCAB, line, re.I):
            continue
        hits += 1
        if not explained(line, blocks):
            unexplained.append((i, line.strip()[:120]))
    total_hits += hits
    total_unexplained += len(unexplained)
    if unexplained:
        report.append((spec.name, hits, unexplained))

print(f"surviving vocabulary hits across in-scope specs : {total_hits}")
print(f"hits with no matching register row              : {total_unexplained}\n")

for name, hits, un in report:
    print(f"--- {name}  ({hits} hits, {len(un)} unexplained) ---")
    for ln, txt in un[:12]:
        print(f"    {ln:>5}: {txt}")
    if len(un) > 12:
        print(f"    ... and {len(un) - 12} more")
    print()

if total_unexplained:
    print("REVIEW each line above: either it is a site nobody audited (a MISS - register and")
    print("fix it), or the register's wording diverged too far for the matcher (benign).")
    sys.exit(1)
print("OK - every surviving marker maps to a register row.")
sys.exit(0)
