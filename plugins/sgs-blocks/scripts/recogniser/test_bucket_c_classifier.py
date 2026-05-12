"""Spec 15 Phase 5a.2 self-test for bucket-c-classifier.py.

Exercises three canonical mismatch types per the 5a.2 plan:
  (1) colour  -- element bearing colour-only CSS -> winning_role=color
  (2) spacing -- element bearing padding/margin/gap -> winning_role=layout
                 (the property_suffixes vocabulary uses `layout` as the
                 umbrella role for spacing-shape css; spacing-token is
                 reserved for token preset suffixes like BlockGap/Spacing)
  (3) text    -- element bearing typography CSS -> winning_role=typography

Each must vote with confidence >= 0.7.

Run: python test_bucket_c_classifier.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "bucket_c_classifier", HERE / "bucket-c-classifier.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def case_colour() -> dict:
    """Colour-leaning orphan -- bg + text colour + border colour."""
    return {
        "selector": ".cta-button-orphan",
        "computed_styles": {
            "color": "#1e1e1e",
            "background-color": "#fff7ed",
            "border-color": "#f87a1f",
        },
    }


def case_spacing() -> dict:
    """Spacing-leaning orphan -- padding + margin + gap."""
    return {
        "selector": ".grid-orphan",
        "computed_styles": {
            "padding-top": "16px",
            "padding-bottom": "16px",
            "margin-top": "32px",
            "gap": "24px",
        },
    }


def case_text() -> dict:
    """Typography-leaning orphan -- font + line + letter."""
    return {
        "selector": ".body-copy-orphan",
        "computed_styles": {
            "font-family": "Inter, sans-serif",
            "font-size": "18px",
            "line-height": "1.65",
            "letter-spacing": "0.02em",
        },
    }


def check(label: str, result: dict, expected_role: str, min_confidence: float = 0.7) -> None:
    role = result.get("winning_role")
    conf = result.get("confidence", 0.0)
    assert role == expected_role, (
        f"{label}: expected winning_role={expected_role}, got {role} (full result: {result})"
    )
    assert conf >= min_confidence, (
        f"{label}: confidence {conf} below threshold {min_confidence} (full result: {result})"
    )
    print(f"  PASS  {label}: role={role}, confidence={conf}, matched={result['matched_css_properties']}")


def case_empty_styles() -> dict:
    return {"selector": ".nothing", "computed_styles": {}}


def check_empty(label: str, result: dict) -> None:
    assert result.get("winning_role") is None, f"{label}: empty styles should yield None role, got {result}"
    assert result.get("confidence") == 0.0, f"{label}: empty styles should yield 0.0 confidence, got {result}"
    print(f"  PASS  {label}: winning_role=None, confidence=0.0")


def main() -> int:
    print("Spec 15 Phase 5a.2 -- bucket-c-classifier role voting")
    elements = [case_colour(), case_spacing(), case_text(), case_empty_styles()]
    results = mod.classify_batch(elements)
    check("colour",  results[0], expected_role="color",      min_confidence=0.7)
    check("spacing", results[1], expected_role="layout",     min_confidence=0.7)
    check("text",    results[2], expected_role="typography", min_confidence=0.7)
    check_empty("empty-styles", results[3])
    print("\nCLASSIFIER-5A.2: PASS (3 canonical mismatches >= 0.7 confidence + empty handled)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
