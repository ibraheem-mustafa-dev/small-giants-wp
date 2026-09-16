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
    """A bare <footer> that is NOT the section's top-level root -- a
    top-level one is already chrome-skipped by the walker's own existing
    exception, so this classifier must only fire on the non-top-level case.

    Re-pointed from a `{"tag": "nav"}` fixture (Spec 45 §10.1) -- `nav` was
    removed from `_LANDMARK_TAG_BLOCK` entirely, so a fixture built on it
    would no longer be a positive control for this classifier at all. The
    resolved `block` is now the REAL row-level slug directly (the constant
    itself holds it post-fix), not the bare word "footer"."""
    element = {"tag": "footer", "classes": []}
    hint = mod.classify_element(element, [], is_top_level=False)
    assert hint is not None, "expected a header/footer hint from a non-top-level bare <footer>"
    assert hint.block == "sgs/site-footer-row", f"got {hint.block}"
    print(f"  PASS  non-top-level-landmark: {hint.to_dict()}")


def test_top_level_landmark_does_not_fire() -> None:
    """The SAME bare <footer>, but marked top-level -- must defer entirely to
    the walker's existing SKIP_TOP_LEVEL_TAGS chrome-skip; no overlap.

    Re-pointed from `{"tag": "nav"}` alongside the fixture above -- with
    `nav` removed from `_LANDMARK_TAG_BLOCK`, that input would no longer
    exercise this classifier's top-level gate at all (it would return None
    from the missing-key branch regardless of `is_top_level`), turning the
    test into a vacuous pass against a dead code path."""
    element = {"tag": "footer", "classes": []}
    hint = mod.classify_element(element, [], is_top_level=True)
    assert hint is None, f"top-level landmark must never fire here, got {hint}"
    print("  PASS  top-level-landmark: correctly defers to the walker's chrome-skip")


def test_bare_nav_never_fires_landmark() -> None:
    """Spec 45 §10.1's removal, proven directly: a bare <nav> (no BEM class,
    non-top-level -- the shape that fired a "header" hint before this fix)
    must now produce NO hint at all, never a silent fallback to a header-row
    block. The real nav-block choice (sgs/nav-bar-menu / sgs/nav-drawer /
    sgs/nav-drawer-menu) has no signal here to resolve it."""
    element = {"tag": "nav", "classes": []}
    hint = mod.classify_element(element, [], is_top_level=False)
    assert hint is None, f"bare <nav> must never fire a landmark hint any more, got {hint}"
    print("  PASS  bare-nav: nav's removal from _LANDMARK_TAG_BLOCK landed, never fires")


def test_button_shaped_signals_absent_default_safely() -> None:
    """Spec 45 §10.1 landing note: the existing bare `{"tag": "button",
    "classes": []}` fixture (as used by `test_bare_button_fires_cta` etc.)
    must still pass UNCHANGED -- `classify_button_shaped` reads the two new
    signals via `.get()`, never direct key access, so a dict carrying
    neither key must not raise and must still resolve the bare "cta" guess.
    The two signal fields default safely to 0/False."""
    element = {"tag": "button", "classes": []}
    hint = mod.classify_element(element, [])
    assert hint is not None
    assert hint.block == "cta", f"got {hint.block}"
    assert hint.child_count == 0, f"got {hint.child_count}"
    assert hint.has_heading_or_paragraph_sibling is False
    print(f"  PASS  button-shaped-signals-absent: {hint.to_dict()}")


def test_button_shaped_carries_composite_signals_for_cta_section_shape() -> None:
    """A button-shaped element carrying the composite signals a real
    sgs/cta-section shape would have (several children, a heading/paragraph
    sibling) -- the bare guess is still "cta" (disambiguation is Tier 4's
    job, Spec 45 §10.1/§10.2), but the Hint must carry the real signal
    values through for that downstream disambiguation to use."""
    element = {
        "tag": "button",
        "classes": [],
        "_child_count": 3,
        "_has_heading_or_paragraph_sibling": True,
    }
    hint = mod.classify_element(element, [])
    assert hint is not None
    assert hint.block == "cta", f"got {hint.block}"
    assert hint.child_count == 3, f"got {hint.child_count}"
    assert hint.has_heading_or_paragraph_sibling is True
    print(f"  PASS  button-shaped-composite-signals: {hint.to_dict()}")


def test_button_shaped_carries_floating_signals_for_whatsapp_cta_shape() -> None:
    """The opposite shape -- a single floating action element (the real
    sgs/whatsapp-cta shape): near-zero children, no heading/paragraph
    sibling. Same "cta" bare guess, different carried signals."""
    element = {
        "tag": "button",
        "classes": [],
        "_child_count": 0,
        "_has_heading_or_paragraph_sibling": False,
    }
    hint = mod.classify_element(element, [])
    assert hint is not None
    assert hint.block == "cta", f"got {hint.block}"
    assert hint.child_count == 0
    assert hint.has_heading_or_paragraph_sibling is False
    print(f"  PASS  button-shaped-floating-signals: {hint.to_dict()}")


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
    test_bare_nav_never_fires_landmark()
    test_button_shaped_signals_absent_default_safely()
    test_button_shaped_carries_composite_signals_for_cta_section_shape()
    test_button_shaped_carries_floating_signals_for_whatsapp_cta_shape()
    test_hashed_css_modules_class_fires_low_confidence()
    test_negative_control_partially_canonical_never_overridden()
    test_gate_helper_is_any_not_all()
    print("\nDOM-SHAPE-CLASSIFIER-TIER-2: PASS (siblings + button + heading + landmark + hashed-class + negative control)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
