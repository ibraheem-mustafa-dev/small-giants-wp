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


def inert_composition_attr_key(
    block: str, variant: str, child: str, attr: str
) -> str:
    """Check #11 (Inert Child-Attribute Discriminator) stable dedup key.

    Keyed per ROW, not per block: two variants of one block can name different
    child attributes, and only one of them may be inert — a block-keyed key
    would collapse them and hide the second finding behind the first.
    """
    return f"inertcompattr:{block}:{variant}:{child}:{attr}"


def dead_composition_signal_key(block: str) -> str:
    """Check #10 (Dead Composition Discriminator) stable dedup key.

    NOTE ON NUMBERING: motion_fx_qualifying_key above is ALSO commented
    "Check #10" — that check (check_fx_qualifying_blocks_stale.py) is loaded
    and run by run.py's main() but was never added to run.py's _CHECK_LABELS/
    _CHECK_ORDER dicts, so its docstring number was aspirational and never
    actually collided with a registered label. This check (key
    "dead_composition_signal") is the one that IS registered as "Check #10 —
    Dead Composition Discriminator" in run.py. Flagged, not fixed here — out
    of scope for the variant-composition-fingerprinting plan (see the
    2026-09-05 task-7 report for the discovery).
    """
    return f"deadcomp:{block}"
