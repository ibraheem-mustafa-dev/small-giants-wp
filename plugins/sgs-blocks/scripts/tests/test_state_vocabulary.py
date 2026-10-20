"""
test_state_vocabulary.py
========================
The classifier's state tagging (Spec 48 FR-48-81, the states wave): `css_state` comes from the framework state
vocabulary (scripts/data/states.json) through behavioural-analyser/state_vocabulary.py, never from a list in code.

  MUST FAIL without the vocabulary: `[aria-expanded="true"]` tags open, `:disabled` disabled, `.is-active` current
  a negated token (`:not(:disabled)`) tags nothing; a state class name that only collides (`.is-muted`) tags nothing
  the BEM sibling rule: an element whose modifiers are all states is a state; a value variant beside it is not
  the families another wave owns are reported, not tagged

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_state_vocabulary.py -v
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

BA = Path(__file__).resolve().parent.parent / "behavioural-analyser"
sys.path.insert(0, str(BA))
import state_vocabulary as sv  # noqa: E402

_spec = importlib.util.spec_from_file_location("extract_signatures", BA / "extract-signatures.py")
es = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(es)


def test_states_come_from_the_vocabulary():
    assert sv.derive_state('.sgs-x__burger[aria-expanded="true"] .sgs-x__bar') == ("open", '[aria-expanded="true"]')
    assert sv.derive_state(".sgs-x__go:disabled")[0] == "disabled"
    assert sv.derive_state(".woocommerce-MyAccount-navigation-link.is-active > a")[0] == "current"
    assert sv.derive_state(".sgs-x__crumb[aria-current='page']")[0] == "current"
    assert sv.derive_state(".sgs-x[open] .sgs-x__icon")[0] == "open"
    assert es._derive_state_from_selector(".sgs-x__link:hover, .sgs-x__link:focus-visible") == "hover", "hover leads the vocabulary"
    assert es._derive_state_from_selector(".sgs-x__link:focus-visible") == "focus"


def test_negated_and_colliding_tokens_tag_nothing():
    assert sv.derive_state(".sgs-x__go:not(:disabled)") == (None, None)
    assert sv.derive_state(".sgs-choice-flow__continue.is-muted") == (None, None), "player states are not tagged"
    assert sv.derive_state(".sgs-x__plain") == (None, None)


def test_bem_modifiers_are_states_only_beside_other_states():
    css = ".sgs-tabs__tab--active{} .sgs-tabs__tab--disabled{} .sgs-buybox__price--current{} .sgs-buybox__price--regular{}"
    tabs = es._bem_modifier_siblings(css, "tabs")
    assert es._bem_modifier_state(".sgs-tabs__tab--active", "tabs", tabs) == "current"
    buybox = es._bem_modifier_siblings(css, "buybox")
    assert es._bem_modifier_state(".sgs-buybox__price--current", "buybox", buybox) is None, "a value variant beside it"
    lone = es._bem_modifier_siblings(".sgs-crumbs__item--current{}", "crumbs")
    assert es._bem_modifier_state(".sgs-crumbs__item--current", "crumbs", lone) == "current"


def test_families_another_wave_owns_are_reported_not_tagged():
    es._UNMAPPED_STATE_SELECTORS_SEEN.clear()
    assert es._derive_state_from_selector(".sgs-form__field:user-invalid") is None
    assert ".sgs-form__field:user-invalid" in es._UNMAPPED_STATE_SELECTORS_SEEN


def test_no_state_list_left_in_the_classifier():
    src = (BA / "extract-signatures.py").read_text(encoding="utf-8")
    assert "_STATE_SELECTOR_PATTERNS" not in src and "_BEM_CURRENT_MODIFIER_RE" not in src
