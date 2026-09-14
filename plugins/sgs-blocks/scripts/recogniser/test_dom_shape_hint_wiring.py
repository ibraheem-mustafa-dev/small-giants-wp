"""Self-test for per-section-convention-voter.py's dom_shape_hint wiring
(Q1 Tier 2, BEM-recognition brainstorm doc).

Isolated from test_per_section_convention_voter.py (which covers
vote_block_slug and carries 5 pre-existing unrelated failures) so these
regression cases stay easy to find and don't get lost in unrelated noise.

Both cases here are qc-council findings (2026-09-14) caught AFTER the
Tier 2 commit shipped -- see decisions.md / the qc-council report for the
full empirical trail.

Run: python test_dom_shape_hint_wiring.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "voter", HERE / "per-section-convention-voter.py"
)
voter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(voter)

from bs4 import BeautifulSoup


def _build(html: str, selector: str = "section.x") -> dict:
    soup = BeautifulSoup(html, "html.parser")
    node = soup.find("section")
    return voter.build_boundary(node, selector, set(), 1)


def test_first_child_regression_authored_identity_never_overridden() -> None:
    """qc-council finding 1 (HIGH, 2026-09-14): dom_shape_hint_for_gap_candidate
    passed [] instead of the first child's real class_signature to the
    heading-position check, so an authored sgs-hero__headline class inside
    an otherwise-unrecognised wrapper section got overridden by a shape
    guess -- violating constraint 1. Must be None after the fix."""
    b = _build(
        '<section class="random-webflow-wrapper">'
        '<h1 class="sgs-hero__headline">Title</h1></section>',
        "section.random-webflow-wrapper",
    )
    assert b["fallback_strategy"] == "gap-candidate", f"got {b['fallback_strategy']}"
    assert b.get("dom_shape_hint") is None, (
        f"authored identity was overridden by a shape guess: {b.get('dom_shape_hint')}"
    )
    print("  PASS  first-child-regression: authored sgs-hero__headline never overridden")


def test_first_child_still_fires_when_genuinely_unclassed() -> None:
    """Sanity check alongside the regression above: the SAME shape (bare h1,
    first child, unrecognised wrapper) with NO authored class on the child
    must still fire -- proves the fix gates correctly rather than just
    breaking the feature."""
    b = _build(
        '<section class="random-webflow-wrapper"><h1>Title</h1></section>',
        "section.random-webflow-wrapper",
    )
    assert b["fallback_strategy"] == "gap-candidate"
    hint = b.get("dom_shape_hint")
    assert hint is not None and hint["block"] == "hero", f"got {hint}"
    print(f"  PASS  first-child-still-fires: {hint}")


def test_webflow_repeated_siblings_still_fires_end_to_end() -> None:
    """Confirms the end-to-end Webflow card-grid case (exercised inline
    during the original build, now captured as a durable test) still works
    after the RULES-ordering fix (qc-council finding 2)."""
    html = (
        '<section class="random-webflow-section">'
        + "".join(f'<div class="w-dyn-item">{i}</div>' for i in range(4))
        + "</section>"
    )
    b = _build(html, "section.random-webflow-section")
    assert b["fallback_strategy"] == "gap-candidate"
    hint = b.get("dom_shape_hint")
    assert hint is not None and hint["block"] == "card-grid", f"got {hint}"
    print(f"  PASS  webflow-repeated-siblings-e2e: {hint}")


def main() -> int:
    print("Q1 Tier 2 -- dom_shape_hint wiring (qc-council regression cases)")
    test_first_child_regression_authored_identity_never_overridden()
    test_first_child_still_fires_when_genuinely_unclassed()
    test_webflow_repeated_siblings_still_fires_end_to_end()
    print("\nDOM-SHAPE-HINT-WIRING: PASS (qc-council findings 1 + 2 regression-guarded)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
