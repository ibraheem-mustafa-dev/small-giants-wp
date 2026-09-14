"""Self-test for dom_shape_classifier.py -- Q1 Tier 2 (BEM-recognition brainstorm doc).

Plan contract:
  - Real (not synthetic-canonical) non-BEM fixtures, authored fresh -- none
    existed anywhere in the repo for non-BEM sources before this file.
  - The NEGATIVE CONTROL (an element carrying one canonical class alongside
    one incidental utility class) is the single most important test here --
    it proves constraint 1 (never override an authored identity) actually
    holds, not just that the classifiers fire on the cases they're meant to.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import dom_shape_classifier as mod


def test_webflow_repeated_siblings_fires_card_grid() -> None:
    """A Webflow CMS collection-list shape: 4 near-identical `w-dyn-item`
    divs -- no BEM signal anywhere, only structural repetition."""
    siblings = [
        {"tag": "div", "classes": ["w-dyn-item", "w-dyn-item-1"]},
        {"tag": "div", "classes": ["w-dyn-item", "w-dyn-item-2"]},
        {"tag": "div", "classes": ["w-dyn-item", "w-dyn-item-3"]},
        {"tag": "div", "classes": ["w-dyn-item", "w-dyn-item-4"]},
    ]
    hint = mod.classify_element(siblings[0], [], siblings=siblings)
    assert hint is not None, "expected a card-grid hint from 4 near-identical siblings"
    assert hint.block == "card-grid", f"got {hint.block}"
    assert hint.confidence <= mod.TIER2_MAX_CONFIDENCE
    print(f"  PASS  webflow-repeated-siblings: {hint.to_dict()}")


def test_bare_button_fires_cta() -> None:
    """A bare <button>Book now</button> with zero classes -- no class-name
    signal at all, only tag shape."""
    element = {"tag": "button", "classes": [], "text": "Book now"}
    hint = mod.classify_element(element, [])
    assert hint is not None, "expected a CTA hint from a bare <button>"
    assert hint.block == "cta", f"got {hint.block}"
    print(f"  PASS  bare-button: {hint.to_dict()}")


def test_role_button_div_fires_cta() -> None:
    """A <div role="button"> -- common in framework-generated markup where
    the real element is a styled div, not a semantic <button>."""
    element = {"tag": "div", "classes": [], "attrs": {"role": "button"}}
    hint = mod.classify_element(element, [])
    assert hint is not None
    assert hint.block == "cta", f"got {hint.block}"
    print(f"  PASS  role-button-div: {hint.to_dict()}")


def test_first_heading_fires_hero() -> None:
    """A bare <h1> as the first child of a section -- heading level +
    position is the only signal, no class at all."""
    element = {"tag": "h1", "classes": []}
    hint = mod.classify_element(element, [], is_first_child=True)
    assert hint is not None, "expected a hero hint from a first-child h1"
    assert hint.block == "hero", f"got {hint.block}"
    print(f"  PASS  first-heading: {hint.to_dict()}")


def test_heading_not_first_child_does_not_fire() -> None:
    """The SAME h1, NOT the section's first child -- position matters, not
    just tag."""
    element = {"tag": "h1", "classes": []}
    hint = mod.classify_element(element, [], is_first_child=False)
    assert hint is None, f"expected no hint when not first child, got {hint}"
    print("  PASS  heading-not-first-child: correctly does not fire")


def test_non_top_level_landmark_fires() -> None:
    """A bare <nav> that is NOT the section's top-level root -- a top-level
    one is already chrome-skipped by the walker's own existing exception,
    so this classifier must only fire on the non-top-level case."""
    element = {"tag": "nav", "classes": []}
    hint = mod.classify_element(element, [], is_top_level=False)
    assert hint is not None, "expected a header hint from a non-top-level bare <nav>"
    assert hint.block == "header", f"got {hint.block}"
    print(f"  PASS  non-top-level-landmark: {hint.to_dict()}")


def test_top_level_landmark_does_not_fire() -> None:
    """The SAME bare <nav>, but marked top-level -- must defer entirely to
    the walker's existing SKIP_TOP_LEVEL_TAGS chrome-skip; no overlap."""
    element = {"tag": "nav", "classes": []}
    hint = mod.classify_element(element, [], is_top_level=True)
    assert hint is None, f"top-level landmark must never fire here, got {hint}"
    print("  PASS  top-level-landmark: correctly defers to the walker's chrome-skip")


def test_hashed_css_modules_class_fires_low_confidence() -> None:
    """Tier 2's whole reason to exist: a CSS-Modules hashed class carries
    literally zero string signal -- Tier 0/1 cannot reach this case at all,
    only structural shape can. A bare button tag alongside the hash still
    fires via classify_button_shaped."""
    element = {"tag": "button", "classes": ["Button_primary__x7f2a"]}
    hint = mod.classify_element(element, ["Button_primary__x7f2a"])
    assert hint is not None, "expected a low-confidence hint for a hashed-class button"
    assert hint.block == "cta", f"got {hint.block}"
    assert 0 < hint.confidence <= mod.TIER2_MAX_CONFIDENCE
    print(f"  PASS  hashed-css-modules-class: {hint.to_dict()}")


def test_negative_control_partially_canonical_never_overridden() -> None:
    """THE HARD-CONSTRAINT TEST. An element carrying one canonical
    `sgs-hero__headline` class alongside one incidental `text-center`
    utility class must NEVER be overridden by a shape guess -- even though
    its tag (h1, first child) would otherwise fire classify_heading."""
    element = {"tag": "h1", "classes": ["sgs-hero__headline", "text-center"]}
    hint = mod.classify_element(
        element,
        ["sgs-hero__headline", "text-center"],
        is_first_child=True,
    )
    assert hint is None, (
        f"Tier 2 must NEVER fire on a partially-canonical element, got {hint}"
    )
    print("  PASS  negative-control: partially-canonical element never overridden")


def test_gate_helper_is_any_not_all() -> None:
    """_any_class_already_canonical must gate on ANY canonical class, the
    OPPOSITE of stage1_boundary_hook's ALL-canonical fast-path check."""
    assert mod._any_class_already_canonical(["sgs-hero__headline", "text-center"])
    assert mod._any_class_already_canonical(["sgs-hero"])
    assert not mod._any_class_already_canonical(["text-center", "flex"])
    assert not mod._any_class_already_canonical([])
    print("  PASS  gate-helper: ANY canonical class blocks, not ALL")


def main() -> int:
    print("Q1 Tier 2 -- dom_shape_classifier contract")
    test_webflow_repeated_siblings_fires_card_grid()
    test_bare_button_fires_cta()
    test_role_button_div_fires_cta()
    test_first_heading_fires_hero()
    test_heading_not_first_child_does_not_fire()
    test_non_top_level_landmark_fires()
    test_top_level_landmark_does_not_fire()
    test_hashed_css_modules_class_fires_low_confidence()
    test_negative_control_partially_canonical_never_overridden()
    test_gate_helper_is_any_not_all()
    print("\nDOM-SHAPE-CLASSIFIER-TIER-2: PASS (siblings + button + heading + landmark + hashed-class + negative control)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
