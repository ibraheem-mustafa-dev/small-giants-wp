"""2026-09-04 — FR-38-22 cloning-lift regression coverage (D949/D951/D952).

Built specifically because the adversarial-council Verification-Skeptic found
that nothing asserted the fx-lift wiring stays wired: deleting `assembly.py`'s
step 3a1 (the `lift_behavioural_attrs` call site) would pass every pre-
existing gate, including Gate A. These tests run the REAL production entry
point (`converter.entry.convert_section`), not a synthetic call to
`lift_behavioural_attrs` in isolation — the same class of gap that let D949
close on a unit test while the real walker still silently dropped every fx
attribute (proven, not theoretical: see decisions.md D951).

Guards:
  1. A draft's `data-sgs-fx-*` attributes survive a real clone and appear in
     the emitted block's attrs (the core FR-38-22 fix). Regresses to the
     D949-era bug — every fx attr silently dropped — if step 3a1 is ever
     removed or its call site broken.
  2. Boolean/number-typed fx attrs emit as REAL JSON types (`true`/`0.6`),
     not quoted strings (`"true"`/`"0.6"`) — the D952 value-coercion fix.
     Regresses to a client's "disable on mobile" setting silently not
     applying (PHP `true === $value` never matches a string) if
     `_coerce_lifted_value` regresses or its wiring is removed.
  3. A magnet-family attribute (`fxMagnetAxis`) — part of the ~50 attrs
     D949 never seeded at all — survives. Regresses to the pre-D952
     "29-of-78 attrs seeded" gap if `fx_attr_roster()` reverts to the
     narrower `FX_ATTR_CSS_PROPERTY` map.
  4. An irregularly-named fx attr (`fxPathRotate`, whose data-attribute is
     `data-sgs-fx-motion-path-rotate` — not a mechanical kebab of the attr
     name) still resolves. Regresses to a silent drop if the roster's
     reverse lookup is removed and the generic kebab-to-camel guess is
     relied on alone.
  5. A non-fx `data-sgs-*` attribute (unrelated to the fx roster) still
     lifts via the generic kebab-to-camel path — proves fix #4 above did
     not narrow `lift_behavioural_attrs` to fx-only (R-31-9).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from converter.entry import convert_section  # noqa: E402
from converter.db import db_lookup  # noqa: E402


def test_fx_attributes_survive_a_real_clone():
    """Guard 1 — the core FR-38-22 fix, real pipeline, not a unit test."""
    draft = (
        '<section class="sgs-cta-section" data-sgs-fx="split-reveal" '
        'data-sgs-fx-trigger="scroll" data-sgs-fx-ease="power2.out">'
        '<div class="sgs-cta-section__content">'
        '<h2 class="sgs-cta-section__title">Get started today</h2>'
        "</div></section>"
    )
    result = convert_section(draft, "", {}, section_id="test-fx-survives")
    assert result["status"] == "complete"
    markup = result["block_markup"]
    assert '"fx":"split-reveal"' in markup
    assert '"fxTrigger":"scroll"' in markup
    assert '"fxEase":"power2.out"' in markup


def test_fx_boolean_and_number_attrs_emit_real_json_types():
    """Guard 2 — D952 value coercion. A quoted "true"/"0.6" would be a
    real client-facing bug (PHP's strict `true === $value` never matches
    a string), so this asserts the UNQUOTED form specifically."""
    draft = (
        '<section class="sgs-cta-section" data-sgs-fx-duration="0.6" '
        'data-sgs-fx-scrub="1.5" data-sgs-fx-disable-mobile="1">'
        '<div class="sgs-cta-section__content">'
        '<h2 class="sgs-cta-section__title">Title</h2>'
        "</div></section>"
    )
    result = convert_section(draft, "", {}, section_id="test-fx-types")
    markup = result["block_markup"]
    assert '"fxDuration":0.6' in markup, markup
    assert '"fxDuration":"0.6"' not in markup, "duration lifted as a quoted string, not a number"
    assert '"fxScrub":1.5' in markup, markup
    assert '"fxDisableMobile":true' in markup, markup
    assert '"fxDisableMobile":"1"' not in markup and '"fxDisableMobile":"true"' not in markup, (
        "disable-mobile lifted as a string — the exact bug that would make a client's "
        "'don't run this on mobile' setting silently not apply"
    )


def test_previously_unseeded_magnet_attribute_survives():
    """Guard 3 — fxMagnetAxis was one of ~50 fx.js-registered attrs D949
    never seeded a block_attributes row for at all (only 29 of ~78 were
    covered). Regresses if fx_attr_roster() narrows back to that map."""
    draft = (
        '<section class="sgs-cta-section" data-sgs-fx-magnet-axis="both" '
        'data-sgs-fx-magnet-strength="0.4">'
        '<div class="sgs-cta-section__content">'
        '<h2 class="sgs-cta-section__title">Title</h2>'
        "</div></section>"
    )
    result = convert_section(draft, "", {}, section_id="test-fx-magnet")
    markup = result["block_markup"]
    assert '"fxMagnetAxis":"both"' in markup, markup
    assert '"fxMagnetStrength":0.4' in markup, markup


def test_irregular_fx_data_attr_name_resolves():
    """Guard 4 — fxPathRotate's data-attribute is `data-sgs-fx-motion-path-
    rotate`, not a mechanical kebab of the attr name (`fx-path-rotate`,
    which would resolve to nothing). Only the roster's authoritative
    reverse lookup (FX_ATTR_MAP-sourced) resolves this correctly."""
    draft = (
        '<section class="sgs-cta-section" data-sgs-fx-motion-path-rotate="45">'
        '<div class="sgs-cta-section__content">'
        '<h2 class="sgs-cta-section__title">Title</h2>'
        "</div></section>"
    )
    result = convert_section(draft, "", {}, section_id="test-fx-irregular-name")
    markup = result["block_markup"]
    assert '"fxPathRotate":"45"' in markup or '"fxPathRotate":45' in markup, markup


def test_fx_attr_roster_covers_full_grammar_not_the_narrow_29():
    """Guard 3b — a direct assertion on the roster itself (not just one
    sample attr), so a future narrowing regresses loudly here even if a
    given probe draft happens not to exercise the missing name."""
    roster = db_lookup.fx_attr_roster()
    assert len(roster) >= 70, (
        f"fx_attr_roster() returned only {len(roster)} attrs — expected the full "
        "fx.js-registered set (~78), not the narrower 29-name FX_ATTR_CSS_PROPERTY "
        "map this function used to (incorrectly) rely on."
    )
    for family_sample in ("fxMagnetAxis", "fxParticleDensity", "fxGridDotColour", "fxWaveSpeed"):
        assert family_sample in roster, f"{family_sample} missing from fx_attr_roster()"


def test_non_fx_data_attr_still_lifts_via_generic_kebab_fallback():
    """Guard 5 — the fx roster's reverse lookup must not narrow
    lift_behavioural_attrs to fx-only attrs (R-31-9: this helper is
    general FR-31-2 infrastructure). Uses dragMomentum, a real,
    block.json-declared, non-fx-roster attr on a qualifying block."""
    node_html = '<div class="sgs-gallery" data-sgs-drag-momentum="true"></div>'
    from bs4 import BeautifulSoup

    node = BeautifulSoup(node_html, "html.parser").find("div")
    lifted, skipped = db_lookup.lift_behavioural_attrs(node, "sgs/gallery")
    assert skipped == []
    # dragMomentum resolves via the generic kebab-to-camel path (it is not
    # in the fx roster's reverse lookup at all) — proving fix #4 didn't
    # narrow this helper to fx-only. It genuinely IS boolean-typed in the
    # DB (a real block.json declaration), so the D952 coercion fix
    # correctly converts it to a real bool too — a bonus proof the
    # coercion is universal, not fx-specific, not a test bug.
    assert lifted.get("dragMomentum") is True


def test_recognised_fx_attr_with_no_destination_is_reported_not_silently_dropped():
    """Guard 6 — Rule 4 (CLAUDE.md NO-SKIPPING). A `data-sgs-fx-*` marker the
    grammar genuinely recognises (in fx_attr_roster()), authored on a block
    that isn't fx-capable at all (sgs/table-of-contents — not in the
    32-block qualifying set, zero fx* rows), must be reported via `skipped`
    rather than vanish with no trace. Before this fix (D949-D953), this was
    a live instance of the exact violation Rule 4 exists to catch."""
    from bs4 import BeautifulSoup

    node_html = '<div class="sgs-table-of-contents" data-sgs-fx-magnet-axis="both"></div>'
    node = BeautifulSoup(node_html, "html.parser").find("div")
    lifted, skipped = db_lookup.lift_behavioural_attrs(node, "sgs/table-of-contents")
    assert "fxMagnetAxis" not in lifted, "should not have lifted -- this block has no such row"
    assert len(skipped) == 1, skipped
    where, detail = skipped[0]
    assert where == "data-sgs-fx-magnet-axis"
    assert "fxMagnetAxis" in detail
    assert "sgs/table-of-contents" in detail


def test_unrecognised_non_fx_data_attr_is_not_falsely_flagged_as_skipped():
    """Guard 6b — the negative control for guard 6. A `data-sgs-*` attribute
    that is genuinely NOT part of the fx grammar (and doesn't resolve on
    this block either) must NOT be reported as a Rule-4 skip — it may be an
    author's unrelated custom marker, not a known grammar gap. Only a
    RECOGNISED-but-unrouted fx attribute is a genuine skip (guard 6)."""
    from bs4 import BeautifulSoup

    node_html = '<div class="sgs-table-of-contents" data-sgs-some-unrelated-marker="x"></div>'
    node = BeautifulSoup(node_html, "html.parser").find("div")
    lifted, skipped = db_lookup.lift_behavioural_attrs(node, "sgs/table-of-contents")
    assert skipped == [], skipped
