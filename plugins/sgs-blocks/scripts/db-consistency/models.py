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


def motion_fx_reseed_key(effect: str, kind: str) -> str:
    """Check #9 (Spec 38 fx_effects reseed-survival) stable dedup key."""
    return f"fxreseed:{kind}:{effect}"


def motion_fx_qualifying_key(block: str, kind: str) -> str:
    """Check #10 (Spec 38 fx qualifying-blocks map staleness) stable dedup key."""
    return f"fxqualify:{kind}:{block}"


def role_resolution_guess_key(slot: str) -> str:
    """Check #12 (Order-Dependent Role Resolution) stable dedup key.

    Keyed per SLOT, not per block: the slot is the unit of the defect. Several
    array-item fields (and any number of draft children) can route through one
    ambiguous slot, and they share a single fix — a block-keyed or field-keyed
    key would either collapse distinct ambiguous slots on the same target block
    or report one problem N times.

    The drift-guard variant is keyed "drift:<slot>" by its caller, so a check
    that has stopped modelling the real resolver can never be mistaken for, or
    baselined alongside, a genuine resolution guess on the same slot.
    """
    return f"roleguess:{slot}"
