"""models.py — shared data types for the F5 excluded-literal gate.

Spec ref: .claude/plans/2026-06-18-f4-excluded-properties-design.md §3 (F5 hand-off)
         .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.4 (MF-4)
"""
from __future__ import annotations

import sys

sys.stdout.reconfigure(encoding="utf-8")

from dataclasses import dataclass, field


@dataclass
class ExclusionSignature:
    """A single in-code exclusion literal detected by the scanner.

    Attributes
    ----------
    file        : path relative to the orchestrator root
    line        : 1-based line number
    form        : one of 'inline_equality', 'membership', 'startswith_dashdash',
                  'named_set'
    prop        : the CSS property literal (None if the form is 'named_set' and
                  we can only enumerate the set at parse time, or the literal
                  value for inline/membership forms)
    snippet     : the raw source line for display (stripped)
    key         : stable dedup key for the baseline
    """
    file: str
    line: int
    form: str
    prop: str          # CSS property literal (or set-variable-name for named_set)
    snippet: str
    key: str


@dataclass
class GateViolation:
    """An exclusion signature whose property is NOT in the excluded_properties DB table.

    This is what causes --check to fail.
    """
    sig: ExclusionSignature
    detail: str
    fix: str
    key: str           # mirrors sig.key for baseline lookup


def signature_key(file: str, line: int, form: str, prop: str) -> str:
    """Stable dedup key — file:line:form:prop."""
    return f"excl:{file}:{line}:{form}:{prop}"
