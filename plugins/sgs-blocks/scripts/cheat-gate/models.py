"""models.py — shared data types for the F5 cheat-detection gate.

Spec ref: Spec 31 §7a — check-converter-cheats.py

Each Violation has a stable key that survives line-number shifts (keyed by
violation-type + file + symbol/match, not by line number).  This is the
STOP-14 requirement: baseline against current violations, fail only on NEW.
"""
from __future__ import annotations

import sys

sys.stdout.reconfigure(encoding="utf-8")

from dataclasses import dataclass


@dataclass
class Violation:
    """A single finding from any cheat-detection check.

    Attributes
    ----------
    check   : short identifier — 'slug_literal', 'hardcoded_dict',
              'important_render', 'parallel_bp', 'd2_when_d1', 'sentinel'
    file    : relative path to the offending file (from repo root)
    detail  : human-readable description of the problem
    fix     : plain-English fix command a non-coder can act on
    key     : stable dedup key — type + file + symbol, NOT line number
    """
    check: str
    file: str
    detail: str
    fix: str
    key: str


# ---------------------------------------------------------------------------
# Stable-key factories (one per check — keys must be deterministic + unique)
# ---------------------------------------------------------------------------

def slug_literal_key(file: str, match: str, scope: str) -> str:
    """Check #1 stable dedup key — per-block slug literal."""
    return f"slug:{file}:{scope}:{match}"


def hardcoded_dict_key(file: str, symbol: str) -> str:
    """Check #2 stable dedup key — hardcoded property→attr dict."""
    return f"hdict:{file}:{symbol}"


def important_render_key(file: str, css_property: str) -> str:
    """Check #3 stable dedup key — !important over a faithful property."""
    return f"imp:{file}:{css_property}"


def parallel_bp_key(file: str, symbol_or_literal: str) -> str:
    """Check #4 stable dedup key — parallel breakpoint vocabulary."""
    return f"bp:{file}:{symbol_or_literal}"


def d2_when_d1_key(block_slug: str, css_property: str) -> str:
    """Check #6 stable dedup key — D2-stranded property that has a D1 destination."""
    return f"d2d1:{block_slug}:{css_property}"


def sentinel_key(file: str, context: str) -> str:
    """Check #7 stable dedup key — 'unitless' sentinel leakage."""
    return f"sentinel:{file}:{context}"


def converter_source_key(kind: str, file: str, symbol: str) -> str:
    """Check #9 stable dedup key — static source cheat in the new converter/ tree.

    kind ∈ {'classname', 'suffix_dict', 'side_regex'}. Keyed by kind + file + symbol
    (NOT line) so the key survives line shifts — the converter/ tree is actively edited,
    unlike the empty-baseline bound-emit case. After the D249 purge this check ships an
    EMPTY baseline (a pure tripwire for re-introduction)."""
    return f"convsrc:{kind}:{file}:{symbol}"


def bound_emit_key(file: str, line: int) -> str:
    """Check #8 stable dedup key — static sourceMode='bound' emit in converter source.

    Keyed by file + line so a new bound-emit anywhere is a NEW violation. (Line is
    acceptable here: this baseline is expected to stay EMPTY — the bound emit was
    purged D182 — so there are no legacy entries whose line-shifts would churn it.)
    """
    return f"bound:{file}:{line}"
