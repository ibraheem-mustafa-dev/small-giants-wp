"""Ratchet baseline (Bean's decision D2, 2026-10-04): the gate blocks NEW gaps
only. Every gap present when the baseline was written is listed; `--check`
fails only for a blocking gap that is not listed, and reports listed gaps that
have disappeared so the baseline can be tightened.
"""
from __future__ import annotations

import json
from pathlib import Path

HEADER = (
    "Wiring-fingerprint ratchet baseline (check-wiring-fingerprint.py). Each entry is "
    "<block>::<attr>::<link>. --check fails only for a blocking gap not listed here; "
    "regenerate with --update-baseline after fixing gaps."
)


def gap_id(f: dict) -> str:
    return f"{f['block']}::{f['attr']}::{f['link']}"


def load(path: Path) -> set[str]:
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    return set(data.get("gaps", []))


def write(path: Path, findings: list[dict], summary: dict) -> None:
    gaps = sorted({gap_id(f) for f in findings})
    data = {"_comment": HEADER, "counts": summary.get("links", {}), "gaps": gaps}
    path.write_text(json.dumps(data, indent=1, sort_keys=False) + "\n", encoding="utf-8", newline="\n")


def compare(findings: list[dict], baseline: set[str], advisory: frozenset) -> tuple[list[str], list[str], list[str]]:
    """(new blocking gaps, new advisory gaps, baselined gaps now fixed)."""
    current = {gap_id(f): f for f in findings}
    new = sorted(g for g, f in current.items() if g not in baseline)
    new_blocking = [g for g in new if current[g]["link"] not in advisory]
    new_advisory = [g for g in new if current[g]["link"] in advisory]
    fixed = sorted(baseline - set(current))
    return new_blocking, new_advisory, fixed
