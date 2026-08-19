#!/usr/bin/env python
"""Merge per-branch registers into one review document, ordered by verdict.

Reads every *.md register in this directory (skipping _CONTRACT.md and REVIEW.md),
parses the `### file:line` / RULE / BEFORE / AFTER / NOTE blocks, and emits REVIEW.md
with ESCALATE first (they need Bean's judgement), then CONDENSE, then CUT, then a
compact EXCLUDE appendix.

Counts are derived from parsed rows only - never from the registers' own Counts blocks,
which is exactly the error this audit had to correct in every branch.
"""
import re
import pathlib

HERE = pathlib.Path(__file__).parent
SKIP = {"_CONTRACT.md", "REVIEW.md"}

BLOCK = re.compile(
    r"^### (?P<site>.+?)\n"
    r"RULE:\s*(?P<rule>[A-Z0-9]+)\s*\n"
    r"(?P<body>.*?)(?=^### |\Z)",
    re.M | re.S,
)

CUT_RULES = {"C1", "C2", "C3", "C4", "C5", "C6"}
CONDENSE_RULES = {"K1", "K2", "K3", "K4", "K5", "K6"}

rows = []
for path in sorted(HERE.glob("*.md")):
    if path.name in SKIP:
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    for m in BLOCK.finditer(text):
        rows.append({
            "source": path.name,
            "site": m.group("site").strip(),
            "rule": m.group("rule").strip(),
            "body": m.group("body").rstrip(),
        })

def bucket(rule):
    """Tolerant: branches wrote 'CONDENSE', 'CONDENSE (K1)', 'EXCLUDE (batched ...)' as well
    as bare rule codes. Classify on the first recognised token, not on an exact match."""
    toks = re.findall(r"[A-Z]+[0-9]?", rule.upper())
    for t in toks:
        if t == "ESCALATE":
            return "ESCALATE"
        if t == "EXCLUDE":
            return "EXCLUDE"
        if t in CONDENSE_RULES or t == "CONDENSE":
            return "CONDENSE"
        if t in CUT_RULES or t == "CUT":
            return "CUT"
    return "UNKNOWN"

for r in rows:
    r["bucket"] = bucket(r["rule"])

order = ["ESCALATE", "CONDENSE", "CUT", "UNKNOWN", "EXCLUDE"]
counts = {b: sum(1 for r in rows if r["bucket"] == b) for b in order}

out = []
out.append("# Spec staleness purge - review register\n")
out.append("Consolidated from the per-branch registers. **Nothing has been applied to any spec.**\n")
out.append("Counts below are derived by parsing rows, not copied from any branch's own totals.\n")
out.append("## Totals\n")
out.append("| Verdict | Rows | What happens |")
out.append("|---|---|---|")
out.append(f"| ESCALATE | {counts['ESCALATE']} | Needs your call - resolved against code, not prose |")
out.append(f"| CONDENSE | {counts['CONDENSE']} | Dead text removed, the rule it carried survives as one line |")
out.append(f"| CUT | {counts['CUT']} | Deleted outright, nothing of value lost |")
out.append(f"| EXCLUDE | {counts['EXCLUDE']} | Deliberately left alone - listed so the gate knows they were considered |")
if counts["UNKNOWN"]:
    out.append(f"| UNKNOWN | {counts['UNKNOWN']} | Unrecognised rule tag - needs attention |")
out.append(f"\n**Total rows: {len(rows)}**\n")

per_file = {}
for r in rows:
    key = r["site"].split(":")[0]
    per_file.setdefault(key, {}).setdefault(r["bucket"], 0)
    per_file[key][r["bucket"]] += 1
out.append("## Per-spec breakdown\n")
out.append("| Spec | ESCALATE | CONDENSE | CUT | EXCLUDE |")
out.append("|---|---|---|---|---|")
for spec in sorted(per_file):
    c = per_file[spec]
    out.append(
        f"| {spec} | {c.get('ESCALATE',0)} | {c.get('CONDENSE',0)} "
        f"| {c.get('CUT',0)} | {c.get('EXCLUDE',0)} |"
    )
out.append("")

for b in order:
    sel = [r for r in rows if r["bucket"] == b]
    if not sel:
        continue
    out.append(f"\n---\n\n# {b} ({len(sel)})\n")
    if b == "ESCALATE":
        out.append("These need the code, not the prose. Each carries both candidate truths "
                   "and the command that settles it.\n")
    if b == "EXCLUDE":
        out.append("Left alone on purpose. Listed compactly so the Phase-3 gate can tell "
                   "'deliberately kept' from 'missed'.\n")
        for r in sel:
            note = ""
            nm = re.search(r"^NOTE:\s*(.+)$", r["body"], re.M)
            if nm:
                note = " - " + nm.group(1).strip()
            out.append(f"- `{r['site']}`{note}")
        continue
    for r in sel:
        out.append(f"### {r['site']}  ({r['rule']}, from {r['source']})\n")
        out.append(r["body"] + "\n")

(HERE / "REVIEW.md").write_text("\n".join(out), encoding="utf-8")
print(f"registers parsed : {len({r['source'] for r in rows})}")
print(f"rows parsed      : {len(rows)}")
for b in order:
    print(f"  {b:<9}: {counts[b]}")
print("\nwrote REVIEW.md")
