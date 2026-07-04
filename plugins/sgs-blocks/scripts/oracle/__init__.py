"""
oracle — F3 LANDED render-oracle (F3-core).

Pure, offline-testable verdict engine for the cloning-pipeline.

Spec ref: .claude/plans/2026-06-18-f3-render-oracle-design.md
          .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.2 + §12.7

Independence contract:
  - NO DB queries inside verdict/guards/models.
  - guard-3's expected_default arrives as INPUT.
  - Tier vocabulary IDENTICAL to ledger (F2): Base|Mobile|Tablet|Desktop|Other:<cond>
  - _parse_px + _colour_delta are defined directly in oracle.verdict (parity2
    dependency removed 2026-07-04 -- parity2 also held an unreliable BEM matcher
    this module never used).
"""
from .models import (
    Verdict,
    CellInput,
    CellResult,
    SectionResult,
    LandedReport,
    RenderedObservation,
    GuardResult,
    HeightGuardResult,
    SectionGuards,
    validate_tier,
)
from .verdict import compute_section_result, compute_report

__all__ = [
    "Verdict",
    "CellInput",
    "CellResult",
    "SectionResult",
    "LandedReport",
    "RenderedObservation",
    "GuardResult",
    "HeightGuardResult",
    "SectionGuards",
    "validate_tier",
    "compute_section_result",
    "compute_report",
]
