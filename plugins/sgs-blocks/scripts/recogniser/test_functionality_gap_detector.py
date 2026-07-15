"""Spec 31 Phase 5a.3 self-test for functionality-gap-detector.py.

Synthesises a click-toggle widget, runs the detector in dry-run mode
(no DB writes), and asserts the FR8 functionality gap row has the
required fields:

  selector  -> stored in css_signal (full string includes the selector)
  observed_behaviour -> stored in feature_type AND debug _observed_behaviour
  block_slug, confidence, provenance, status

Also asserts a benign element (no behaviour attrs) returns zero gaps.

Dry-run only -- this test must NEVER pollute uimax.functionality_gap_candidates.

Run: python test_functionality_gap_detector.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "functionality_gap_detector", HERE / "functionality-gap-detector.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def case_click_toggle() -> dict:
    """A bespoke toggle widget with no SGS counterpart -- unrouted."""
    return {
        "selector": ".bespoke-toggle",
        "matched_block_slug": None,        # no SGS block routed
        "html_attrs": {
            "data-action": "toggle",
            "data-target": "#panel-1",
            "aria-expanded": "false",
        },
        "html_tag": "button",
        "inline_handlers": ["onclick"],
    }


def case_modal_on_hero() -> dict:
    """Modal-open on a matched sgs/hero -- hero has no modal attribute."""
    return {
        "selector": ".hero-cta",
        "matched_block_slug": "sgs/hero",
        "html_attrs": {"data-modal-open": "enquiry"},
        "html_tag": "button",
    }


def case_benign_paragraph() -> dict:
    return {
        "selector": "p.body-copy",
        "matched_block_slug": "sgs/hero",
        "html_attrs": {},
        "html_tag": "p",
    }


def check_click_toggle(result: dict) -> None:
    candidates = result["candidates"]
    sels = {c["_selector"] for c in candidates}
    assert ".bespoke-toggle" in sels, (
        f"click-toggle: expected .bespoke-toggle in candidates, got selectors={sels}"
    )
    toggle_cands = [c for c in candidates if c["_selector"] == ".bespoke-toggle"]
    feature_types = {c["feature_type"] for c in toggle_cands}
    # Must surface at minimum the data-action behaviour. Detector maps by
    # attribute NAME (data-action -> click-action), not value. Bonuses:
    # data-target -> target-ref, aria-expanded -> expandable, onclick -> inline-handler.
    assert "click-action" in feature_types, (
        f"click-toggle: expected feature_type=click-action, got {feature_types}"
    )
    # All four behaviour signals must surface as separate gap rows.
    expected = {"click-action", "target-ref", "expandable", "inline-handler"}
    assert expected.issubset(feature_types), (
        f"click-toggle: expected all of {expected} to surface, got {feature_types}"
    )
    for c in toggle_cands:
        # FR8 required field shape:
        assert c["css_signal"], f"click-toggle: css_signal must be populated, got {c}"
        assert ".bespoke-toggle" in c["css_signal"], (
            f"click-toggle: selector must appear in css_signal, got {c['css_signal']}"
        )
        assert c["feature_type"], "click-toggle: feature_type must be populated"
        assert c["_observed_behaviour"] == c["feature_type"], (
            "click-toggle: _observed_behaviour debug field must mirror feature_type"
        )
        assert 0.0 <= c["confidence"] <= 1.0, "click-toggle: confidence in [0,1]"
        assert c["provenance"].startswith("sgs-clone"), "click-toggle: provenance namespaced"
        assert c["status"] == "pending", "click-toggle: status defaults to pending"
    print(f"  PASS  click-toggle: {len(toggle_cands)} candidate(s), features={feature_types}")


def check_modal_on_hero(result: dict) -> None:
    candidates = result["candidates"]
    hero_cands = [c for c in candidates if c["_selector"] == ".hero-cta"]
    assert hero_cands, f"modal-on-hero: expected gap row, got {candidates}"
    c = hero_cands[0]
    assert c["block_slug"] == "sgs/hero", f"modal-on-hero: block_slug should be sgs/hero, got {c}"
    assert c["feature_type"] == "modal-open", f"modal-on-hero: expected modal-open, got {c['feature_type']}"
    print(f"  PASS  modal-on-hero: confidence={c['confidence']}, feature_type={c['feature_type']}")


def check_benign(result: dict) -> None:
    candidates = [c for c in result["candidates"] if c["_selector"] == "p.body-copy"]
    assert not candidates, f"benign: expected zero gap rows for plain <p>, got {candidates}"
    print("  PASS  benign-paragraph: zero gap rows (no behaviour signals)")


def main() -> int:
    elements = [case_click_toggle(), case_modal_on_hero(), case_benign_paragraph()]
    result = mod.detect_batch(elements, run_id="test-5a.3", write=False)
    assert result["mode"] == "dry-run", "DB writes must be GATED behind --write; test must run dry"
    assert result["rows_written"] == 0, "test must not write any rows"
    print(f"Spec 31 Phase 5a.3 -- functionality-gap-detector ({result['candidate_count']} candidates surfaced)")
    check_click_toggle(result)
    check_modal_on_hero(result)
    check_benign(result)
    print("\nDETECTOR-5A.3: PASS (click-toggle widget surfaces FR8 row + benign no-op + dry-run gated)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
