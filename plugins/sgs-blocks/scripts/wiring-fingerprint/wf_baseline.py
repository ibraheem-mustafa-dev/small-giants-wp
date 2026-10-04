"""Ratchet baseline (Bean's decision D2, 2026-10-04): the gate blocks NEW gaps
only. Every blocking gap present when the baseline was written is listed;
`--check` fails only for a blocking gap that is not listed, and reports listed
gaps that have disappeared so the baseline can be tightened. Advisory links
(L3-state, L6-token) never block, so they are never written into the baseline.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

HEADER = (
    "Wiring-fingerprint ratchet baseline (check-wiring-fingerprint.py). Each entry is "
    "<block>::<attr>::<link>. --check fails only for a blocking gap not listed here; "
    "regenerate with --update-baseline after fixing gaps, or add named gaps with --accept. "
    "Advisory links (L3-state, L6-token) are never listed."
)


def gap_id(f: dict) -> str:
    return f"{f['block']}::{f['attr']}::{f['link']}"


def load(path: Path) -> set[str]:
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    return set(data.get("gaps", []))


def save(path: Path, gaps: set[str]) -> None:
    ordered = sorted(gaps)
    counts = Counter(g.rsplit("::", 1)[-1] for g in ordered)
    data = {"_comment": HEADER, "counts": dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))), "gaps": ordered}
    path.write_text(json.dumps(data, indent=1, sort_keys=False) + "\n", encoding="utf-8", newline="\n")


def write(path: Path, findings: list[dict], advisory: frozenset) -> None:
    save(path, {gap_id(f) for f in findings if f["link"] not in advisory})


def accept(path: Path, ids: list[str], findings: list[dict], advisory: frozenset) -> tuple[list[str], list[str]]:
    """Add the named current blocking gaps to the baseline. Returns (added, refused
    with the reason); nothing is written when any id is refused."""
    current = {gap_id(f): f for f in findings}
    refused = []
    for g in ids:
        if g not in current:
            refused.append(f"{g}: not a current finding")
        elif current[g]["link"] in advisory:
            refused.append(f"{g}: advisory, never blocks (nothing to accept)")
    if refused:
        return [], refused
    baseline = load(path)
    added = sorted(set(ids) - baseline)
    save(path, baseline | set(ids))
    return added, []


def compare(findings: list[dict], baseline: set[str], advisory: frozenset) -> tuple[list[str], list[str], list[str]]:
    """(new blocking gaps, advisory gaps, baselined gaps now fixed)."""
    current = {gap_id(f): f for f in findings}
    new_blocking = sorted(g for g, f in current.items() if g not in baseline and f["link"] not in advisory)
    advisory_now = sorted(g for g, f in current.items() if f["link"] in advisory)
    fixed = sorted(baseline - set(current))
    return new_blocking, advisory_now, fixed
