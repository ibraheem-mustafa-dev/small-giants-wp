"""Population rules (blind spots 1-2): paint is decided from the source and the
DB role, never from the calibration cache; every run states the population and
the not-paint reasons."""
from __future__ import annotations

from wf_testkit import record

from wf_paint import PaintClassifier, strip_modifiers


def test_unit_companion_is_not_paint(report):
    assert record(report, "sgs/paint", "gapUnit")["basis"] == "unit-companion"


def test_content_role_is_not_paint(report):
    assert record(report, "sgs/paint", "titleText")["category"] == "not"


def test_css_bearing_suffix_paints_without_a_role(report):
    rec = record(report, "sgs/paint", "boxRadius")
    assert (rec["category"], rec["basis"]) == ("css", "suffix:Radius")


def test_fx_pseudo_property_is_the_js_category(report):
    assert record(report, "sgs/paint", "fxTrigger")["category"] == "js"


def test_modifier_class_with_a_rule_paints(report):
    rec = record(report, "sgs/paint", "layoutMode")
    assert (rec["category"], rec["basis"]) == ("css", "class-modifier-rule")


def test_behaviour_data_attribute_is_not_paint(report):
    assert record(report, "sgs/paint", "autoplay")["category"] == "not"


def test_summary_states_population_and_reasons(report):
    s = report["summary"]
    assert s["population"]["css"] + s["population"]["js"] + s["population"]["not-paint"] == s["attributes"]
    assert s["not_paint_reasons"]["unit-companion"] >= 1


def test_extra_suffixes_and_modifier_stripping():
    pc = PaintClassifier([])
    for attr, sfx in (("textIndent", "TextIndent"), ("imageSaturate", "Saturate"), ("bgBlurMobile", "Blur"),
                      ("titleWritingMode", "WritingMode"), ("headingTextWrapTablet", "TextWrap")):
        assert pc.suffix_hit(attr) == sfx
    assert strip_modifiers("transitionEasingCustomMobile") == "transitionEasing"


def test_shared_focus_modifier_is_not_a_switchs_own_paint(report):
    """A behaviour switch whose guarded branch emits `sgs-focus--inset` (a focus-system
    modifier every focusable element gets) is a behaviour switch, not a painting setting."""
    rec = record(report, "sgs/toggle-paint", "enableOpen")
    assert (rec["category"], rec["basis"]) == ("not", "role:boolean-visibility")


def test_shared_ground_classes_are_not_a_switchs_own_paint(report):
    """`sgs-on-dark` / `sgs-on-light` (sgs_surface_tone_class) on a guarded element is the ground's, not the switch's."""
    rec = record(report, "sgs/toggle-paint", "enableGround")
    assert (rec["category"], rec["basis"]) == ("not", "role:boolean-visibility")


def test_a_modifier_the_block_owns_still_paints(report):
    """Negative control: the exclusion is only for shared system classes."""
    rec = record(report, "sgs/toggle-paint", "openStyle")
    assert (rec["category"], rec["basis"]) == ("css", "class-modifier-rule")


def test_every_shared_system_class_family_is_excluded():
    from wf_css import is_shared_system_class, own_modifier

    for token in ("sgs-focus--inset", "sgs-focus--duotone", "sgs-on-dark", "sgs-on-light",
                  "sgs-focus-source", "sgs-focus-proxy", "sgs-focus-scope", "sgs-focus-card"):
        assert is_shared_system_class(token), token
        assert not own_modifier(token), token
    for token in ("sgs-gallery--lightbox-open", "sgs-has-hover", "sgs-on-hover-card", "sgs-gallery__lightbox"):
        assert not is_shared_system_class(token), token
    assert own_modifier("sgs-gallery--lightbox-open")
