"""models.py — shared data types for the F6 DB-consistency suite.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §5
"""
from __future__ import annotations

import sys

sys.stdout.reconfigure(encoding="utf-8")

from dataclasses import dataclass


@dataclass
class Violation:
    """A single finding from any F6 consistency check.

    Attributes
    ----------
    check   : short identifier for the check that raised this (e.g. "routing", "composition", "variants")
    block   : block slug (e.g. "sgs/hero")
    detail  : human-readable description of the problem
    fix     : plain-English fix command a non-coder can act on
    key     : stable dedup key — used in the baseline file
    """
    check: str
    block: str
    detail: str
    fix: str
    key: str


# ---------------------------------------------------------------------------
# Stable-key factories (one per check — keys must be deterministic + unique)
# ---------------------------------------------------------------------------

def routing_key(block: str, css_property: str, writer_path: str) -> str:
    """Check #1 stable dedup key."""
    return f"amb:{block}:{css_property}:{writer_path}"


def composition_key(block: str) -> str:
    """Check #2 stable dedup key."""
    return f"ihb:{block}"


def variant_key(block: str, slot: str) -> str:
    """Check #3 stable dedup key."""
    return f"vc:{block}:{slot}"


def variant_reseed_key(block: str, slot: str) -> str:
    """Check #5 stable dedup key."""
    return f"vslot:{block}:{slot}"


def orphan_role_key(role: str) -> str:
    """Check #6 stable dedup key."""
    return f"orphan:{role}"


def tier_composition_key(block: str) -> str:
    """Check #7 stable dedup key."""
    return f"tiercomp:{block}"


def css_property_reseed_key(block: str, attr: str, kind: str) -> str:
    """Check #8 (css_property/css_layer reseed-survival) stable dedup key."""
    return f"cssprop:{kind}:{block}:{attr}"
