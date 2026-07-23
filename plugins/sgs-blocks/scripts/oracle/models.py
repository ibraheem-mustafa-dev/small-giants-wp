"""
oracle.models — data model for F3 LANDED render-oracle.

Spec ref: .claude/plans/2026-06-18-f3-render-oracle-design.md §3 (verdict taxonomy) + §6 (contract)

The F3→F5 contract is FROZEN — key field names matter (F5 joins on them).
Join key: (section_id, block_slug, property, tier)

Tier vocabulary MUST match F2 (ledger) EXACTLY:
  Base | Mobile | Tablet | Desktop | Other:<verbatim-condition>

Independence: no DB imports. guard-3's expected_default arrives as INPUT.
"""
from __future__ import annotations

import enum
import re
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Tier vocabulary (MUST match F2 / ledger.declare_input._derive_tier EXACTLY)
# F2 emits 'Other:<media>' with NO space after the colon (declare_input.py:215).
# ---------------------------------------------------------------------------

_DEVICE_TIERS = frozenset({"Base", "Mobile", "Tablet", "Desktop"})
_OTHER_TIER_RE = re.compile(r"^Other:.+$")


def validate_tier(tier: str) -> None:
    """Raise ValueError if `tier` is not in the F2 vocabulary.

    Valid: Base | Mobile | Tablet | Desktop | Other:<verbatim-condition>
    F2 emits 'Other:<cond>' with NO space after the colon (declare_input.py:215).
    """
    if tier in _DEVICE_TIERS:
        return
    if _OTHER_TIER_RE.match(tier):
        return
    raise ValueError(
        f"Invalid tier {tier!r}: must be one of {sorted(_DEVICE_TIERS)} "
        "or 'Other:<verbatim-condition>' (F2 vocabulary, no space after colon)."
    )


# ---------------------------------------------------------------------------
# Verdict — the five values, EXACT (F3→F5 contract)
# ---------------------------------------------------------------------------

class Verdict(str, enum.Enum):
    """Per-cell verdict.  Precedence (first match wins): NOT_RENDERED > GUARD_FAIL >
    UNVERIFIED > WRITTEN_NOT_LANDED > LANDED.

    String values written to JSON — do NOT change them (F5 joins on them).
    """
    NOT_RENDERED = "NOT-RENDERED"
    GUARD_FAIL = "GUARD-FAIL"
    UNVERIFIED = "UNVERIFIED"
    WRITTEN_NOT_LANDED = "WRITTEN-not-LANDED"
    LANDED = "LANDED"


# ---------------------------------------------------------------------------
# Guard result helper
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GuardResult:
    """Outcome of a single guard check."""
    passed: bool
    reason: str


@dataclass(frozen=True)
class HeightGuardResult:
    """Outcome of the height-parity guard (guard 4).

    `measured` is False when one or both heights were unavailable — the guard
    does not FAIL the section in that case (passed=True), but `measured=False`
    is surfaced so the section's height-guard field reflects 'not measured'
    honestly rather than a false green, and so LANDED is not reported as
    height-confirmed when it was never checked (FIX-G).
    """
    passed: bool
    measured: bool
    reason: str


# ---------------------------------------------------------------------------
# Section guards summary (written into the §6 contract)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SectionGuards:
    """Boolean pass/fail for each of the four false-win guards at section level.

    All four must pass before any cell can be LANDED.
    """
    empty: bool
    """Guard 1: inner_text_len > 0 AND element_present."""

    element: bool
    """Guard 2: element_present (selector resolved)."""

    height: bool
    """Guard 4: |rendered_height - draft_height| <= HEIGHT_TOLERANCE_PX.
    True when draft_height is None (unmeasured — not comparable, not a fail)."""

    non_default: bool
    """Guard 3: evaluated per-cell (draft_value != expected_default).
    At section level: True when at least one cell is non-default (summary only)."""

    def section_level_fail(self) -> bool:
        """True if any section-level guard fired (guards 1, 2, 4).

        Guard 3 is cell-level only (does not fail the whole section).
        """
        return not (self.empty and self.element and self.height)

    def as_dict(self) -> dict:
        return {
            "empty": self.empty,
            "element": self.element,
            "height": self.height,
            "non_default": self.non_default,
        }


# ---------------------------------------------------------------------------
# Cell-level input (what the live Playwright probe will supply)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class CellInput:
    """One property/tier cell input for the verdict engine.

    The live Playwright probe produces these from getComputedStyle; unit tests
    construct them synthetically.  No DB access — computed values arrive as strings.
    """
    property: str
    """CSS property name, lower-cased (e.g. 'background-color')."""

    tier: str
    """Device-tier label — MUST match F2 vocabulary:
    Base | Mobile | Tablet | Desktop | Other:<verbatim-condition>."""

    draft_value: str
    """The draft's intended CSS value for this property/tier."""

    computed_value: Optional[str]
    """getComputedStyle result on the rendered SGS block. None = not captured
    (e.g. selector resolved but getComputedStyle call failed, or section did not
    render).  None on an exercised cell → UNVERIFIED, never LANDED."""

    expected_default: Optional[str]
    """The block.json attributes.<attr>.default value for this property.
    Sourced from block.json by the orchestrator — NOT the converter DB.
    None = default unknown (guard 3 skipped — cell treated as non-default)."""

    written: bool = True
    """True if the converter actually WROTE this property (i.e. it is in the
    F2/fate-transferred set).  F3 only evaluates cells the converter wrote
    (§6 / F3→F5 join: 'a cell transferred in F2/fate but WRITTEN-not-LANDED in
    F3 = hard fail').  written=False → can never be LANDED → UNVERIFIED, even if
    the computed value coincidentally equals the draft (guards against a
    coincidental initial-value LANDED without needing a CSS-initial-value table)."""

    def __post_init__(self) -> None:
        # FIX-I: validate tier against the F2 vocabulary at construction time.
        validate_tier(self.tier)


# ---------------------------------------------------------------------------
# Section-level observation (the engine's pure input boundary)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RenderedObservation:
    """Per-section observation produced by the live Playwright probe.

    This is the pure boundary between the oracle engine (offline/testable) and the
    live browser capture (F3-core-B, wired by the orchestrator later).

    Unit tests construct RenderedObservation synthetically — no network required.
    """
    section_id: str
    """Stable draft-section identifier (carried as data-f3-section-id in the fixture)."""

    block_slug: str
    """SGS block slug for this section (e.g. 'sgs/hero').
    Used to build the element selector: .wp-block-sgs-<slug-without-namespace>."""

    element_selector: str
    """The CSS selector used to locate the rendered block element.
    Caller resolves: block.json selectors → .wp-block-sgs-<slug> fallback.
    NEVER the draft BEM class (parity2's blind spot for native clone output)."""

    element_present: bool
    """True if querySelector(element_selector) !== null on the rendered page."""

    inner_text_len: int
    """el.innerText.length on the matched element (0 if element_present is False)."""

    rendered_height_px: Optional[float]
    """Bounding-box height of the rendered section element (px).
    None if element was not present or measurement failed."""

    draft_height_px: Optional[float]
    """Height of the draft section (px), from the fixture.
    None if draft height was not measured (height guard skips, not fails)."""

    cells: list[CellInput]
    """Per-property/tier cells to be verdict-ed."""

    page_loaded: bool = True
    """True if the canary page itself loaded (HTTP 200 + DOM ready).
    A whole-page render failure (page_loaded=False) is the ONLY trigger for
    NOT-RENDERED (§3).  A single section's block element being absent while the
    page loaded is a GUARD-FAIL (element-present guard 2), NOT NOT-RENDERED.
    F3-runtime splits NOT-RENDERED into infra-vs-content (§5)."""

    expects_text: bool = True
    """Whether this section's GOLDEN expects any rendered text (see
    oracle/golden_expectations.py).

    Guard 1 was written assuming every converted section renders text, so an
    empty render is a false-win. That does not hold across the fixture corpus:
    several fixtures legitimately convert to a content-less block carrying only
    box CSS, and their CURRENT goldens record exactly that. Defaults True (the
    STRICT setting) so an unknown expectation is never the lenient one — a
    caller must opt IN to expected-empty by proving it from the golden."""

    height_comparable: bool = True
    """Whether draft and rendered heights were captured in COMPARABLE
    environments.

    Guard 4 compares absolute heights. That is only meaningful when the draft
    and the clone render under the same theme/CSS. The fixture-canary harness
    renders the draft as a bare file:// fragment with no theme, against a full
    WordPress page with header, footer and theme CSS — heights there differ for
    reasons that say nothing about transfer fidelity. The F3 design doc says the
    same of pixel-diff: render the draft in the same environment, or gate on a
    delta baseline, "never an absolute". When False, guard 4 reports
    measured=False (honestly NOT confirmed) instead of fabricating a failure.
    Defaults True so same-environment callers (run_canary_proof) are unchanged."""


# ---------------------------------------------------------------------------
# Output: per-cell result (§6 contract)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class CellResult:
    """One row in the §6 contract's cells array.

    All field names are FROZEN — F5 joins on (section_id, block_slug, property, tier).
    """
    property: str
    tier: str
    draft_value: str
    computed_value: Optional[str]
    expected_default: Optional[str]
    verdict: Verdict

    def as_dict(self) -> dict:
        """Serialise to a JSON-compatible dict matching §6 exactly."""
        return {
            "property": self.property,
            "tier": self.tier,
            "draft_value": self.draft_value,
            "computed_value": self.computed_value,
            "expected_default": self.expected_default,
            "verdict": self.verdict.value,
        }


# ---------------------------------------------------------------------------
# Output: per-section result (§6 contract)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SectionResult:
    """One entry in the §6 contract's sections array."""
    section_id: str
    block_slug: str
    guards: SectionGuards
    element_selector: str
    cells: list[CellResult]

    def as_dict(self) -> dict:
        return {
            "section_id": self.section_id,
            "block_slug": self.block_slug,
            "guards": self.guards.as_dict(),
            "element_selector": self.element_selector,
            "cells": [c.as_dict() for c in self.cells],
        }

    def summary_verdict(self) -> str:
        """Worst verdict across all cells (for the plain-English HUMAN summary).

        FIX-J — DELIBERATE PRECEDENCE INVERSION vs the §3 per-CELL precedence:
        for the human summary, WRITTEN-not-LANDED is ranked WORSE than UNVERIFIED
        (a real broken transfer is more urgent for a human than a coverage gap),
        whereas the §3 per-cell precedence orders UNVERIFIED above
        WRITTEN-not-LANDED (so guard-3/lossy cells are classified before a
        transfer-fail).  This inversion affects ONLY the cosmetic summary string;
        the per-cell `verdict` field (the F5-authoritative value) is unchanged.

        With FIX-C, `cells` is never empty for a processed section.
        """
        if not self.cells:
            # Defensive: an unprocessed/raw SectionResult — treat as no signal.
            return Verdict.UNVERIFIED.value
        # Human-summary worst-first ordering (NOTE the WRITTEN/UNVERIFIED swap).
        order = [
            Verdict.NOT_RENDERED,
            Verdict.GUARD_FAIL,
            Verdict.WRITTEN_NOT_LANDED,
            Verdict.UNVERIFIED,
            Verdict.LANDED,
        ]
        seen = {c.verdict for c in self.cells}
        for v in order:
            if v in seen:
                return v.value
        return Verdict.LANDED.value


# ---------------------------------------------------------------------------
# Output: per-fixture report (§6 contract root)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class LandedReport:
    """Root object of the per-fixture §6 contract artefact.

    Serialises to:
    {
      fixture,
      generated_by: {module, version},
      sections: [{section_id, block_slug, guards:{...}, element_selector,
                  cells:[{property, tier, draft_value, computed_value,
                          expected_default, verdict}]}],
      plain_summary: str
    }
    """
    fixture: str
    generated_by: dict  # {module: str, version: str}
    sections: list[SectionResult]
    plain_summary: str

    def as_dict(self) -> dict:
        """Serialise to the EXACT §6 schema."""
        return {
            "fixture": self.fixture,
            "generated_by": self.generated_by,
            "sections": [s.as_dict() for s in self.sections],
            "plain_summary": self.plain_summary,
        }
