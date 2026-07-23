"""
oracle.guards — the four false-win guards for the F3 LANDED oracle.

Spec ref: .claude/plans/2026-06-18-f3-render-oracle-design.md §2

Each guard is a small, pure function returning a GuardResult(passed, reason).
A guard failure is ALWAYS a fail — never a match (STOP-10).

Guard 1 (empty-section) and Guard 2 (element-present) and Guard 4 (height-parity)
are SECTION-level guards — if any fires, every cell in the section is GUARD-FAIL.

Guard 3 (non-default-value) is CELL-level — if it fires the cell is UNVERIFIED
(not GUARD-FAIL; not a transfer fail either — a coverage gap for F5 to report).

Independence: no DB queries here. expected_default arrives as INPUT.
"""
from __future__ import annotations

from typing import Optional

try:
    from .models import GuardResult, HeightGuardResult
except ImportError:
    import sys as _sys
    from pathlib import Path as _Path
    _sys.path.insert(0, str(_Path(__file__).parent.parent))
    from oracle.models import GuardResult, HeightGuardResult  # type: ignore[no-redef]

# ---------------------------------------------------------------------------
# Tolerance constant
# ---------------------------------------------------------------------------

#: Maximum allowed absolute height difference (px) between draft and rendered
#: section before the height-parity guard *can* fire (combined with the
#: fractional threshold — BOTH must be exceeded).  Material divergence threshold.
HEIGHT_TOLERANCE_PX: float = 20.0

#: Maximum allowed FRACTIONAL height difference (relative to draft height).
#: A divergence fires only when it exceeds BOTH the absolute px AND the fraction —
#: so a large absolute delta on a very tall section is not flagged unless it is
#: also proportionally significant, and a small section is not flagged on noise.
HEIGHT_TOLERANCE_FRAC: float = 0.10


# ---------------------------------------------------------------------------
# Guard 1 — empty-section guard
# ---------------------------------------------------------------------------

def guard_empty_section(
    element_present: bool,
    inner_text_len: int,
    expects_text: bool = True,
) -> GuardResult:
    """Guard 1: the rendered section must be present, and non-empty IF its
    golden expects text.

    Fires when:
    - element_present is False (section did not render at all), OR
    - inner_text_len == 0 AND `expects_text` (section should have rendered text
      but rendered none).

    A section with no text is normally a false-win: a truncated render, or a
    completely empty block matching an empty draft section on background colour.

    `expects_text` (added 2026-07-23) makes the GOLDEN the reference rather than
    the assumption that every section renders text. Several fixtures legitimately
    convert to a content-less block carrying only box CSS — ``sgs-info-box``
    converts to one self-closing ``<!-- wp:sgs/info-box {...} /-->`` and its
    CURRENT golden records exactly that. Firing there flagged output that was
    byte-consistent with its own LANDED-verified baseline.

    This is NOT a way to silence the guard: `expects_text` defaults True, and a
    fixture whose golden DOES carry content keeps the full guard — that is the
    case this guard exists for and it must still fail. Only the golden-proven
    expected-empty case is reclassified, and the element-present half fires
    regardless of expectation.

    On fire: GUARD-FAIL (not a match).
    """
    if not element_present:
        return GuardResult(
            passed=False,
            reason="Guard 1 (empty-section): element not present in rendered page.",
        )
    if inner_text_len == 0:
        if expects_text:
            return GuardResult(
                passed=False,
                reason=(
                    "Guard 1 (empty-section): element present but innerText.length == 0, "
                    "and the golden expects rendered text. Section rendered empty — "
                    "possible false-win (STOP-10)."
                ),
            )
        return GuardResult(
            passed=True,
            reason=(
                "Guard 1 (empty-section): element rendered empty, and the golden "
                "expects NO text for this fixture — consistent with the baseline, "
                "not a false-win. Nothing to verify from text content here."
            ),
        )
    return GuardResult(passed=True, reason="Guard 1 (empty-section): passed.")


# ---------------------------------------------------------------------------
# Guard 2 — element-present guard
# ---------------------------------------------------------------------------

def guard_element_present(element_present: bool, element_selector: str) -> GuardResult:
    """Guard 2: the expected block element must exist in the rendered clone.

    Selector is resolved by the caller:
      block.json `selectors` → .wp-block-sgs-<slug> fallback.
      NEVER the draft BEM class (parity2's blind spot for native clone output —
      parity-bem-class-blind-spot-for-converted-output, blub.db 2026-06-11).

    On fire: GUARD-FAIL.
    """
    if not element_present:
        return GuardResult(
            passed=False,
            reason=(
                f"Guard 2 (element-present): querySelector('{element_selector}') "
                "returned null on the rendered clone."
            ),
        )
    return GuardResult(passed=True, reason="Guard 2 (element-present): passed.")


# ---------------------------------------------------------------------------
# Guard 3 — non-default-value guard (cell-level)
# ---------------------------------------------------------------------------

def guard_non_default_value(
    draft_value: str,
    expected_default: Optional[str],
) -> GuardResult:
    """Guard 3 (cell-level): the draft value must differ from the block.json default.

    Sourced from block.json attributes.<attr>.default by the orchestrator —
    NOT the converter DB (independence; design §2 guard 3).

    On fire: UNVERIFIED — not a transfer fail, not a pass.  Coverage gap for F5.

    If expected_default is None (default unknown), guard 3 is SKIPPED and the
    cell is treated as non-default (cannot verify, no evidence of trivial match).
    """
    if expected_default is None:
        return GuardResult(
            passed=True,
            reason=(
                "Guard 3 (non-default-value): expected_default not supplied — "
                "skipping (treated as non-default)."
            ),
        )
    if draft_value.strip().lower() == expected_default.strip().lower():
        return GuardResult(
            passed=False,
            reason=(
                f"Guard 3 (non-default-value): draft_value {draft_value!r} "
                f"== expected_default {expected_default!r} — UNVERIFIED "
                "(a transferred default proves nothing about routing correctness)."
            ),
        )
    return GuardResult(passed=True, reason="Guard 3 (non-default-value): passed.")


# ---------------------------------------------------------------------------
# Guard 4 — height-parity guard (section-level)
# ---------------------------------------------------------------------------

def guard_height_parity(
    rendered_height_px: Optional[float],
    draft_height_px: Optional[float],
    tolerance_px: float = HEIGHT_TOLERANCE_PX,
    tolerance_frac: float = HEIGHT_TOLERANCE_FRAC,
    comparable: bool = True,
) -> HeightGuardResult:
    """Guard 4: the rendered section height must match the draft within tolerance.

    A material height divergence is a FAIL regardless of any per-property match.
    It catches the truncated-section / dropped-element case that the empty-section
    guard misses (e.g. a section renders with some content but half the elements
    are missing, so it's shorter than the draft).

    Tolerance (FIX-G) — relative-OR-absolute, both must be exceeded to fire:
      fire only when  abs(delta) > tolerance_px  AND  abs(delta)/max(draft,1) > tolerance_frac.
    A large absolute delta on a very tall section is not flagged unless it is also
    proportionally significant; a small section is not flagged on px noise.

    If either height is None (unmeasured) → measured=False, passed=True (does not
    FAIL the section), but the caller surfaces measured=False so a LANDED verdict
    is not reported as height-confirmed when the height was never checked.

    On fire: GUARD-FAIL.
    """
    if not comparable:
        return HeightGuardResult(
            passed=True,
            measured=False,
            reason=(
                "Guard 4 (height-parity): draft and clone were rendered in "
                "NON-COMPARABLE environments (e.g. a bare file:// draft fragment "
                "vs a themed WordPress page), so an absolute height comparison "
                "would measure the theme, not transfer fidelity. Height parity is "
                "NOT confirmed — this is a coverage gap, never a pass."
            ),
        )
    if rendered_height_px is None or draft_height_px is None:
        return HeightGuardResult(
            passed=True,
            measured=False,
            reason=(
                "Guard 4 (height-parity): one or both heights are unmeasured — "
                "coverage gap (not a failure, but height parity is NOT confirmed)."
            ),
        )
    delta = abs(rendered_height_px - draft_height_px)
    frac = delta / max(abs(draft_height_px), 1.0)
    if delta > tolerance_px and frac > tolerance_frac:
        return HeightGuardResult(
            passed=False,
            measured=True,
            reason=(
                f"Guard 4 (height-parity): |{rendered_height_px:.1f}px - "
                f"{draft_height_px:.1f}px| = {delta:.1f}px "
                f"({frac * 100:.1f}%) exceeds BOTH {tolerance_px:.1f}px AND "
                f"{tolerance_frac * 100:.0f}% — GUARD-FAIL."
            ),
        )
    return HeightGuardResult(
        passed=True,
        measured=True,
        reason=(
            f"Guard 4 (height-parity): delta {delta:.1f}px ({frac * 100:.1f}%) "
            f"within tolerance (px {tolerance_px:.1f} / frac {tolerance_frac * 100:.0f}%) "
            "— passed."
        ),
    )
