"""
oracle.verdict — the verdict function for the F3 LANDED oracle.

Spec ref: .claude/plans/2026-06-18-f3-render-oracle-design.md §1 + §3 + §6

Precedence (§3, first match wins):
  NOT-RENDERED > GUARD-FAIL > UNVERIFIED > WRITTEN-not-LANDED > LANDED

LANDED tolerances (§1):
  - Colour properties: ΔE (Euclidean RGB) ≤ 1  — via _colour_delta from parity2
  - Length properties: ≤ 1px                   — via _parse_px from parity2
  - Everything else: exact after lowercase + strip

Reuse (R-22-1): imports _parse_px + _colour_delta from parity2.transfer_checker.
  NEVER imports parity2's BEM-pairing machinery (parity-bem-class-blind-spot,
  blub.db 2026-06-11 — native clone output does not carry draft BEM classes).

Independence: no DB queries.
"""
from __future__ import annotations

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Reuse from parity2 — tolerance helpers ONLY (R-22-1)
# Import these two helpers; do NOT import anything else from parity2.
# ---------------------------------------------------------------------------
try:
    from parity2.transfer_checker import _parse_px, _colour_delta  # type: ignore[import]
except ImportError:
    import sys as _sys
    from pathlib import Path as _Path
    _sys.path.insert(0, str(_Path(__file__).parent.parent))
    from parity2.transfer_checker import _parse_px, _colour_delta  # type: ignore[no-redef]

try:
    from .models import (
        Verdict,
        CellInput,
        CellResult,
        SectionResult,
        SectionGuards,
        RenderedObservation,
        LandedReport,
    )
    from .guards import (
        guard_empty_section,
        guard_element_present,
        guard_non_default_value,
        guard_height_parity,
    )
except ImportError:
    import sys as _sys
    from pathlib import Path as _Path
    _sys.path.insert(0, str(_Path(__file__).parent.parent))
    from oracle.models import (  # type: ignore[no-redef]
        Verdict,
        CellInput,
        CellResult,
        SectionResult,
        SectionGuards,
        RenderedObservation,
        LandedReport,
    )
    from oracle.guards import (  # type: ignore[no-redef]
        guard_empty_section,
        guard_element_present,
        guard_non_default_value,
        guard_height_parity,
    )

MODULE_NAME = "oracle.verdict"
MODULE_VERSION = "0.1.0"

# ---------------------------------------------------------------------------
# Colour / length property classifiers
# (Mirror parity2's intent; inline here since we use tighter tolerances)
# ---------------------------------------------------------------------------

# --- FIX-A: EXACT colour-bearing-property classifier ----------------------
# Substring matching ('background' / 'outline' / 'border') swallowed non-colour
# props (background-image/size/position, outline-style/width, border-style) and
# false-failed correct values via _colour_delta → inf.  This is an exact test:
# only properties whose VALUE is a colour.
_EXACT_COLOUR_PROPS = frozenset({
    "color",
    "fill",
    "stroke",
})
#: A property is colour-bearing if it is an exact colour prop OR ends in '-color'
#: (background-color, border-color, border-top-color, outline-color,
#: text-decoration-color, column-rule-color, caret-color, …).
_COLOUR_SUFFIX = "-color"

# --- FIX-A: real length allowlist (suffix + exact set) --------------------
# EXCLUDES bare shorthands border/background/font/transition (they are not a
# single length).  Includes real lengths only.
_EXACT_LENGTH_PROPS = frozenset({
    "width", "height",
    "gap", "row-gap", "column-gap",
    "font-size", "line-height",
    "top", "right", "bottom", "left",
})
#: Length-bearing if exact OR ends with one of these suffixes.
_LENGTH_SUFFIXES = (
    "-width", "-height",     # max-width, min-height, border-top-width, …
    "-radius",               # border-radius, border-top-left-radius
)
#: Length-bearing if the property STARTS with one of these prefixes.
_LENGTH_PREFIXES = (
    "padding",   # padding, padding-top, padding-inline-start, …
    "margin",    # margin, margin-bottom, …
    "inset",     # inset, inset-block-start, …
)

# --- FIX-D: properties whose computed serialisation is known-lossy ---------
# getComputedStyle normalises these so the draft-authored string rarely matches
# byte-for-byte even when the transfer is CORRECT (e.g. repeat(4,1fr) vs
# 'repeat(4, minmax(0px, 1fr))' / '300px 300px 300px 300px').  Comparing them
# exactly would emit a FALSE WRITTEN-not-LANDED; treating them as a match would
# risk a FALSE LANDED.  So a non-exact compare on these maps to UNVERIFIED with a
# 'needs normalisation' reason — a coverage gap for F3-runtime, never a hard fail
# and never a coincidental LANDED.
_LOSSY_SERIALISATION_PROPS = frozenset({
    "grid-template-columns",
    "grid-template-rows",
    "font-family",
    "transition",
    "background",   # shorthand
    "font",         # shorthand
    "border",       # shorthand
})

# --- FIX-D: text-align equivalence (ported from parity2._TEXT_ALIGN_EQUIV) --
_TEXT_ALIGN_EQUIV = {
    "start": "left",
    "end": "right",
    "left": "left",
    "right": "right",
    "center": "center",
    "centre": "center",
    "justify": "justify",
}

# --- FIX-F: named/keyword CSS colour → rgb map -----------------------------
# getComputedStyle returns rgb()/rgba(); draft-authored keyword colours
# ('white', 'transparent', …) parse to inf via parity2._parse_rgb and would
# false-fail.  Map the draft side to rgb() before _colour_delta.  Only the
# common keywords used in drafts; anything unmapped + unparseable → UNVERIFIED.
_NAMED_COLOURS = {
    "black": "rgb(0, 0, 0)",
    "white": "rgb(255, 255, 255)",
    "red": "rgb(255, 0, 0)",
    "green": "rgb(0, 128, 0)",
    "blue": "rgb(0, 0, 255)",
    "yellow": "rgb(255, 255, 0)",
    "orange": "rgb(255, 165, 0)",
    "purple": "rgb(128, 0, 128)",
    "grey": "rgb(128, 128, 128)",
    "gray": "rgb(128, 128, 128)",
    "silver": "rgb(192, 192, 192)",
    "navy": "rgb(0, 0, 128)",
    "teal": "rgb(0, 128, 128)",
    "maroon": "rgb(128, 0, 0)",
    "olive": "rgb(128, 128, 0)",
    "lime": "rgb(0, 255, 0)",
    "aqua": "rgb(0, 255, 255)",
    "fuchsia": "rgb(255, 0, 255)",
    "transparent": "rgba(0, 0, 0, 0)",
    # currentColor is context-dependent — cannot resolve offline; leave unmapped.
}

#: LANDED tolerance for colour properties (Euclidean RGB ΔE76 ≤ 1).
COLOUR_DELTA_TOLERANCE: float = 1.0

#: LANDED tolerance for length properties (px deviation ≤ 1).
LENGTH_PX_TOLERANCE: float = 1.0


def _is_colour_prop(prop: str) -> bool:
    """FIX-A: exact colour-bearing-property test (no substring over-match)."""
    p = prop.strip().lower()
    return p in _EXACT_COLOUR_PROPS or p.endswith(_COLOUR_SUFFIX)


def _is_length_prop(prop: str) -> bool:
    """FIX-A: real length allowlist — exact set, suffixes, or prefixes."""
    p = prop.strip().lower()
    if p in _EXACT_LENGTH_PROPS:
        return True
    if p.endswith(_LENGTH_SUFFIXES):
        return True
    if p.startswith(_LENGTH_PREFIXES):
        return True
    return False


def _is_lossy_serialisation_prop(prop: str) -> bool:
    """FIX-D: True if the property's computed serialisation is known-lossy."""
    return prop.strip().lower() in _LOSSY_SERIALISATION_PROPS


def _is_text_align_prop(prop: str) -> bool:
    return prop.strip().lower() in ("text-align", "textalign")


def _normalise_draft_colour(value: str) -> str:
    """FIX-F: map a draft-side named/keyword colour to rgb() if known.

    Leaves rgb()/rgba()/#hex values unchanged.  Unmapped keywords pass through
    (the colour comparator will return inf → caller maps to UNVERIFIED).
    """
    v = value.strip().lower()
    return _NAMED_COLOURS.get(v, value)


# ---------------------------------------------------------------------------
# Cell-level LANDED comparison
# ---------------------------------------------------------------------------

class _Match:
    """Result of a cell value comparison (FIX-D / FIX-F tri-state)."""
    LANDED = "landed"                  # values match within tolerance
    NOT_LANDED = "not-landed"          # values differ → WRITTEN-not-LANDED
    UNVERIFIABLE = "unverifiable"      # lossy serialisation / unparseable colour → UNVERIFIED


def _compare_values(prop: str, draft_value: str, computed_value: str) -> str:
    """Compare a draft value to its computed value; return a _Match constant.

    Returns LANDED / NOT_LANDED / UNVERIFIABLE.

    - Exact (case-insensitive, stripped) → LANDED.
    - text-align equivalence (start==left, end==right, centre==center) → LANDED.
    - Colour props: ΔE ≤ 1 → LANDED; parseable but ΔE > 1 → NOT_LANDED;
      unparseable (inf) → UNVERIFIABLE (never a hard fail on a parse failure, FIX-F).
    - Length props: BOTH sides px → |Δ| ≤ 1px → LANDED, else NOT_LANDED;
      EITHER side non-px (%/calc/vw/vh/auto/keyword) → UNVERIFIABLE (FIX-M —
      mirrors the colour-unparseable path; cannot conclude, never a hard fail).
    - Lossy-serialisation props: any non-exact → UNVERIFIABLE (FIX-D).
    - Everything else non-exact → NOT_LANDED.
    """
    dv = draft_value.strip()
    cv = computed_value.strip()

    # Exact match (case-insensitive) — always LANDED.
    if dv.lower() == cv.lower():
        return _Match.LANDED

    # text-align equivalence (FIX-D).
    if _is_text_align_prop(prop):
        if _TEXT_ALIGN_EQUIV.get(dv.lower()) == _TEXT_ALIGN_EQUIV.get(cv.lower()):
            return _Match.LANDED
        return _Match.NOT_LANDED

    # Known-lossy serialisation (FIX-D) — non-exact cannot be hard-failed.
    if _is_lossy_serialisation_prop(prop):
        return _Match.UNVERIFIABLE

    # Colour props (FIX-A exact classifier; FIX-F named-colour normalisation).
    if _is_colour_prop(prop):
        delta = _colour_delta(_normalise_draft_colour(dv), cv)
        if delta == float("inf"):
            # One side unparseable (e.g. currentColor, gradient) — cannot conclude.
            return _Match.UNVERIFIABLE
        return _Match.LANDED if delta <= COLOUR_DELTA_TOLERANCE else _Match.NOT_LANDED

    # Length props (FIX-A real allowlist).
    if _is_length_prop(prop):
        d_px = _parse_px(dv)
        c_px = _parse_px(cv)
        if d_px is not None and c_px is not None:
            # Both sides are real px — a genuine px mismatch still hard-fails.
            return _Match.LANDED if abs(d_px - c_px) <= LENGTH_PX_TOLERANCE else _Match.NOT_LANDED
        # FIX-M: either side is a non-px unit (%/calc/vw/vh/auto/keyword) that
        # _parse_px cannot resolve offline, and the exact-string check already
        # failed → CANNOT CONCLUDE.  Mirror the colour-unparseable→UNVERIFIABLE
        # path: a correct `width:50%` (computed `640px`) must NOT be a false hard
        # WRITTEN-not-LANDED (cry-wolf).  Needs container-resolved comparison in
        # F3-runtime.  Never a false PASS, never a false hard-fail.
        return _Match.UNVERIFIABLE

    # Everything else: exact already failed → not landed.
    return _Match.NOT_LANDED


def _values_match(prop: str, draft_value: str, computed_value: str) -> bool:
    """Backwards-compatible boolean wrapper: True only when the compare is LANDED."""
    return _compare_values(prop, draft_value, computed_value) == _Match.LANDED


# ---------------------------------------------------------------------------
# Cell verdict (§3 precedence)
# ---------------------------------------------------------------------------

def _cell_verdict(
    cell: CellInput,
    page_did_not_load: bool,
    section_guard_failed: bool,
) -> Verdict:
    """Compute the verdict for a single cell.

    Precedence (first match wins):
      NOT-RENDERED > GUARD-FAIL > UNVERIFIED > WRITTEN-not-LANDED > LANDED
    """
    # 1. NOT-RENDERED — the WHOLE PAGE failed to load (FIX-B).
    #    A single section's missing element with the page loaded is GUARD-FAIL,
    #    handled by section_guard_failed below (element-present guard 2).
    if page_did_not_load:
        return Verdict.NOT_RENDERED

    # 2. GUARD-FAIL — guard 1/2/4 fired at section level.
    if section_guard_failed:
        return Verdict.GUARD_FAIL

    # 3a. UNVERIFIED — the converter never WROTE this cell (FIX-E).
    #     F3 only evaluates cells in the F2/fate-transferred set; a non-written
    #     cell can never be LANDED, even if computed coincidentally equals draft.
    if not cell.written:
        return Verdict.UNVERIFIED

    # 3b. UNVERIFIED — guard 3 fired (draft == default).
    guard3 = guard_non_default_value(cell.draft_value, cell.expected_default)
    if not guard3.passed:
        # draft_value == expected_default → UNVERIFIED (coverage gap, not a fail).
        return Verdict.UNVERIFIED

    # 3c. UNVERIFIED — no computed value captured on an exercised cell (fail-closed).
    if cell.computed_value is None:
        return Verdict.UNVERIFIED

    # Compare (FIX-D / FIX-F tri-state).
    match = _compare_values(cell.property, cell.draft_value, cell.computed_value)

    # 3d. UNVERIFIED — lossy serialisation / unparseable colour: cannot conclude
    #     (never a false LANDED, never a false hard-fail).
    if match == _Match.UNVERIFIABLE:
        return Verdict.UNVERIFIED

    # 4. WRITTEN-not-LANDED — computed value present but does not match.
    if match == _Match.NOT_LANDED:
        return Verdict.WRITTEN_NOT_LANDED

    # 5. LANDED — all guards passed, values match within tolerance.
    return Verdict.LANDED


# ---------------------------------------------------------------------------
# Section-level result
# ---------------------------------------------------------------------------

def compute_section_result(obs: RenderedObservation) -> SectionResult:
    """Compute the full SectionResult (guards + per-cell verdicts) for one observation.

    Pure — no I/O, no DB.
    """
    # Determine page-level render status FIRST (FIX-B): NOT-RENDERED is a
    # whole-page failure, never a single missing section.
    page_did_not_load = not obs.page_loaded

    # Run section-level guards (1, 2, 4).
    g1 = guard_empty_section(obs.element_present, obs.inner_text_len)
    g2 = guard_element_present(obs.element_present, obs.element_selector)
    g4 = guard_height_parity(obs.rendered_height_px, obs.draft_height_px)

    # Guard 3 summary: True if at least one cell is non-default.
    g3_summary = any(
        guard_non_default_value(c.draft_value, c.expected_default).passed
        for c in obs.cells
    )

    section_guards = SectionGuards(
        empty=g1.passed,
        element=g2.passed,
        height=g4.passed,
        non_default=g3_summary,
    )

    # The page loaded but this section's guards may still fail (e.g. element
    # absent → GUARD-FAIL, not NOT-RENDERED).  When the page did NOT load, the
    # cell verdict short-circuits to NOT-RENDERED regardless of these guards.
    section_guard_failed = section_guards.section_level_fail()

    # Compute per-cell verdicts.
    cell_results: list[CellResult] = []
    for cell in obs.cells:
        v = _cell_verdict(
            cell,
            page_did_not_load=page_did_not_load,
            section_guard_failed=section_guard_failed,
        )
        cell_results.append(CellResult(
            property=cell.property,
            tier=cell.tier,
            draft_value=cell.draft_value,
            computed_value=cell.computed_value,
            expected_default=cell.expected_default,
            verdict=v,
        ))

    # FIX-C: a rendered section with zero measurable cells is a coverage gap,
    # not a silent empty cells:[].  Emit ONE synthetic UNVERIFIED cell so the
    # section contributes an F5 row and summary_verdict() is coherent.
    if not cell_results:
        if page_did_not_load:
            synth_verdict = Verdict.NOT_RENDERED
        elif section_guard_failed:
            synth_verdict = Verdict.GUARD_FAIL
        else:
            synth_verdict = Verdict.UNVERIFIED
        cell_results.append(CellResult(
            property="(no measurable cells)",
            tier="Base",
            draft_value="",
            computed_value=None,
            expected_default=None,
            verdict=synth_verdict,
        ))

    return SectionResult(
        section_id=obs.section_id,
        block_slug=obs.block_slug,
        guards=section_guards,
        element_selector=obs.element_selector,
        cells=cell_results,
    )


# ---------------------------------------------------------------------------
# Plain-English summary (§6 MF-5)
# ---------------------------------------------------------------------------

def _build_plain_summary(sections: list[SectionResult]) -> str:
    """Generate the plain-English summary for the non-coder QC owner (MF-5).

    COUNT-BASED + accurate for MIXED sections (FIX-K).  Each section reports the
    count of every verdict — e.g.
        "Section 'section-1' (container): 4 LANDED, 2 UNVERIFIED,
         0 WRITTEN-not-LANDED, 0 GUARD-FAIL."
    Never claims "all cells are X" unless they actually all are.

    For URGENT sections (≥1 WRITTEN-not-LANDED or GUARD-FAIL) the first offending
    cell's detail is appended:  "FAIL: <property> [<tier>] written X but rendered Y".

    A page-level NOT-RENDERED section (page_loaded=False) gets its own clear
    message and is not count-diluted.
    """
    parts: list[str] = []
    for sec in sections:
        slug_short = sec.block_slug.replace("sgs/", "")
        prefix = f"Section {sec.section_id!r} ({slug_short})"

        # Per-section verdict counts.
        counts = {v: 0 for v in Verdict}
        for c in sec.cells:
            counts[c.verdict] += 1

        n_landed = counts[Verdict.LANDED]
        n_unverified = counts[Verdict.UNVERIFIED]
        n_written = counts[Verdict.WRITTEN_NOT_LANDED]
        n_guard = counts[Verdict.GUARD_FAIL]
        n_notrendered = counts[Verdict.NOT_RENDERED]
        total = len(sec.cells)

        # Page-level NOT-RENDERED: its own message (every cell is NOT-RENDERED
        # only when the page failed to load — keep it clear, not count-diluted).
        if total > 0 and n_notrendered == total:
            parts.append(
                f"{prefix} NOT-RENDERED: the page did not load — "
                f"{total} cell(s) could not be checked."
            )
            continue

        # The accurate count line (always emitted for a rendered section).
        count_line = (
            f"{prefix}: {n_landed} LANDED, {n_unverified} UNVERIFIED, "
            f"{n_written} WRITTEN-not-LANDED, {n_guard} GUARD-FAIL."
        )

        # Append urgent detail for the first offending cell, if any.
        if n_written > 0:
            c = next(c for c in sec.cells if c.verdict == Verdict.WRITTEN_NOT_LANDED)
            count_line += (
                f" FAIL: {c.property} [{c.tier}] written {c.draft_value!r} "
                f"but rendered {c.computed_value!r} (not landed)."
            )
        elif n_guard > 0:
            count_line += (
                f" FAIL: guards — empty={sec.guards.empty}, "
                f"element={sec.guards.element}, height={sec.guards.height}."
            )
        elif n_landed == total and total > 0:
            count_line += " OK."

        parts.append(count_line)

    if not parts:
        return "No sections to report."
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Full report
# ---------------------------------------------------------------------------

def compute_report(
    fixture: str,
    observations: list[RenderedObservation],
) -> LandedReport:
    """Compute the full per-fixture LandedReport from a list of observations.

    Each observation is one rendered section on the canary page.

    Returns a LandedReport serialisable to the §6 contract schema.
    """
    sections = [compute_section_result(obs) for obs in observations]
    plain = _build_plain_summary(sections)

    return LandedReport(
        fixture=fixture,
        generated_by={
            "module": MODULE_NAME,
            "version": MODULE_VERSION,
        },
        sections=sections,
        plain_summary=plain,
    )
