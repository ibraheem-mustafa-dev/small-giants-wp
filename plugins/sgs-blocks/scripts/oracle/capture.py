"""
oracle.capture — capture-adapter INTERFACE for the F3 LANDED oracle.

Spec ref: .claude/plans/2026-06-18-f3-render-oracle-design.md §1 (F3-core-B)

This module defines the probe function SIGNATURE and documents the contract.
The LIVE Playwright implementation (F3-core-B) is wired by the orchestrator.

The oracle engine (verdict.py / guards.py) is pure and testable without a browser.
Unit tests construct RenderedObservation synthetically — see oracle/tests/test_oracle.py.

Pairing discipline (parity-bem-class-blind-spot, blub.db 2026-06-11):
  Pair by block slug → .wp-block-sgs-<slug> / block.json selectors.
  NEVER by draft BEM class — native clone output does not carry those classes.
"""
from __future__ import annotations

from typing import Optional

try:
    from .models import RenderedObservation, CellInput
except ImportError:
    import sys as _sys
    from pathlib import Path as _Path
    _sys.path.insert(0, str(_Path(__file__).parent.parent))
    from oracle.models import RenderedObservation, CellInput  # type: ignore[no-redef]


# ---------------------------------------------------------------------------
# Sections spec — what the caller passes to describe what to probe
# ---------------------------------------------------------------------------

def _default_element_selector(block_slug: str) -> str:
    """Derive the default CSS selector for a block slug.

    .wp-block-sgs-<slug-without-namespace>  (e.g. sgs/hero → .wp-block-sgs-hero)
    The caller may override with a block.json `selectors` value if one is defined.
    """
    slug_no_ns = block_slug.replace("sgs/", "").replace("sgs-", "")
    return f".wp-block-sgs-{slug_no_ns}"


# ---------------------------------------------------------------------------
# Live probe (F3-core-B stub — orchestrator wires this)
# ---------------------------------------------------------------------------

def probe_rendered_observation(
    page_url: str,
    sections_spec: list[dict],
) -> list[RenderedObservation]:
    """Probe the rendered SGS clone page and return per-section observations.

    THIS FUNCTION IS A STUB — F3-core-B wires the live Playwright implementation.
    See docstring for the full contract the orchestrator must implement.

    Parameters
    ----------
    page_url : str
        URL of the rendered canary clone page (e.g. the sandybrown canary
        https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-../).

    sections_spec : list[dict]
        One entry per draft section to probe. Required keys per entry:
          section_id   : str   — matches data-f3-section-id on the fixture
          block_slug   : str   — SGS block slug (e.g. 'sgs/hero')
          element_selector : str | None — CSS selector to locate the block;
                            None → derive from block_slug via _default_element_selector()
          cells : list[dict]  — per-property/tier cells to capture; each:
            property         : str   — CSS property (lower-cased)
            tier             : str   — F2 vocabulary: Base|Mobile|Tablet|Desktop|Other:<cond>
            draft_value      : str   — the draft's intended value
            expected_default : str|None — block.json attributes default (or None)

    Returns
    -------
    list[RenderedObservation]
        One RenderedObservation per section_spec entry.

    Implementation notes for the orchestrator (F3-core-B)
    ------------------------------------------------------
    1. Launch Playwright (node subprocess, same pattern as visual_qa_capture.py).
       Authenticate as anonymous (no admin bar — cleaner computed styles).
    2. Navigate to page_url; wait for document.fonts.ready + network idle.
    3. For each section:
       a. Derive element_selector (use spec value or _default_element_selector).
       b. querySelector(element_selector) → element_present.
       c. If present: el.innerText.length → inner_text_len;
          el.getBoundingClientRect().height → rendered_height_px.
       d. For each cell, call window.getComputedStyle(el).getPropertyValue(property)
          at the specified tier viewport (Base=1440, Mobile=375, Tablet=768,
          Desktop=1440; Other → skip getComputedStyle for that tier as the
          viewport doesn't map to a single width).
       e. Assemble CellInput(property, tier, draft_value, computed_value,
          expected_default).
    4. draft_height_px should be measured from the fixture's draft DOM (or
       supplied by the orchestrator from the fixture's extract.json bounding box).
    5. Do NOT fake/mock a live result that could read as a real LANDED verdict.
    6. Selector must be the block's native WP class, NEVER the draft BEM class.

    Raises
    ------
    NotImplementedError
        Always — until the orchestrator implements the live Playwright capture.
    """
    raise NotImplementedError(
        "F3-core-B: orchestrator wires the live Playwright probe. "
        "This stub defines the contract; unit tests use synthetic RenderedObservation "
        "inputs constructed directly — see oracle/tests/test_oracle.py. "
        "\n\nContract: probe_rendered_observation(page_url, sections_spec) "
        "-> list[RenderedObservation]. "
        "See function docstring for the full implementation spec."
    )
