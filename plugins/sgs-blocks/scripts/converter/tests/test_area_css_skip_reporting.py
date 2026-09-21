"""Rule 4 (NO SKIPPING) for the PER-AREA style fold (Eye Care reviews card, 2026-09-21).

Cause, reproduced before the fix:
  ``fold_helpers.route_area_css_to_block_attrs`` asks
  ``db_lookup.attr_for_area_property(block, area, prop)`` for a destination and, on
  ``None``, emitted ONLY ``trace("cross_node_gap_candidate", reason="no_area_attr")``.
  ``assembly`` injects ``_fold_trace``, which is a ``_LOG.warning`` and nothing else —
  no gap row, no ``content-gaps.json`` entry. A live ``convert_section()`` on the Eye
  Care reviews draft returned ``content_gaps == []`` while 13 real declarations
  (the gold star colour, the request link's colour/border/radius/background, the
  avatar's size and radius, the aggregate figure's font-size and colour) were
  discarded. On the live page the stars render taupe and the outlined pill renders
  black, with no report anywhere.

Fix: ``fold_helpers._report_area_skip`` / ``_report_area_skip_every_tier`` put each
non-transfer on the EXISTING content-gap channel
(``content_gap_collector.record_declaration_skip_candidate``), which the orchestrator
already harvests into ``content-gaps.json``. Reporting only — the emitted markup is
unchanged, which ``test_the_markup_is_byte_identical_with_and_without_reporting``
pins.

Three suppressions keep it honest rather than spammy:
  1. a declaration ROUTED by any pass over the same element is never reported
     (``note_declaration_routed``, keyed per device tier);
  2. a declaration the CONTENT side consumed is never reported — decided by running
     the real ``field_extractors.extract_field_value`` against a probe carrying the
     declaration and an identical probe carrying none (its own negative control);
  3. a SHORTHAND whose longhands are present is not counted twice.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_area_css_skip_reporting.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re

import pytest

from converter.entry import convert_section
from converter.services import fold_helpers

_SLUG = "sgs/google-reviews"

_CARD = (
    '<article class="sgs-google-reviews__review">'
    '<span class="sgs-google-reviews__avatar-colour"'
    ' style="width:40px;height:40px;border-radius:50%;background:#1A73E8;color:#fff">{i}</span>'
    '<strong class="sgs-google-reviews__author">{n}</strong>'
    '<span class="sgs-google-reviews__rating" style="color:#FBBC04">&#9733;&#9733;&#9733;&#9733;&#9733;</span>'
    '<p class="sgs-google-reviews__text">{t}</p></article>'
)
_HEADER = (
    '<span class="sgs-google-reviews__average-rating" style="font-size:32px;color:#202124">4.7</span>'
    '<span class="sgs-google-reviews__review-count">15 reviews</span>'
    '<a class="sgs-google-reviews__review-request-url" href="https://share.google/9YZzTiRj2gvW1Xrpr"'
    ' style="color:#1A73E8;border:1px solid #DADCE0;border-radius:20px;background:#fff">Write a review</a>'
)
_ROWS = [
    ("A", "Anonymous M.", "Lovely experience here."),
    ("N", "Neelum Mushtaq", "Highly recommended here."),
    ("S", "Sam R.", "Fitted properly here."),
]


def _draft() -> str:
    cards = "".join(_CARD.format(i=i, n=n, t=t) for i, n, t in _ROWS)
    return (
        '<section class="sgs-social-proof"><h2>What people say</h2>'
        f'<div class="sgs-google-reviews">{_HEADER}'
        f'<div class="rev-rail">{cards}</div></div></section>'
    )


def _run() -> dict:
    return convert_section(
        html=_draft(),
        css=".rev-rail { overflow-x:auto; scroll-snap-type:x mandatory; }",
        media_map={},
        boundary_id="b8",
        section_id="s1",
    )


def _style_rows(result: dict) -> list[dict]:
    return [g for g in result["content_gaps"] if g.get("property")]


def _pairs(result: dict) -> set[tuple[str, str]]:
    return {(g["element"], g["property"]) for g in _style_rows(result)}


# ---------------------------------------------------------------------------
# The four elements the live page renders wrong are now reported
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("element, prop, value", [
    ("sgs-google-reviews__rating", "color", "#FBBC04"),                 # gold stars -> taupe
    ("sgs-google-reviews__review-request-url", "color", "#1A73E8"),     # blue pill text -> black
    ("sgs-google-reviews__review-request-url", "border-color", "#DADCE0"),
    ("sgs-google-reviews__review-request-url", "border-width", "1px"),
    ("sgs-google-reviews__review-request-url", "border-style", "solid"),
    ("sgs-google-reviews__review-request-url", "border-radius", "20px"),
    ("sgs-google-reviews__review-request-url", "background-color", "#fff"),
    ("sgs-google-reviews__avatar-colour", "width", "40px"),
    ("sgs-google-reviews__avatar-colour", "height", "40px"),
    ("sgs-google-reviews__avatar-colour", "border-radius", "50%"),
    ("sgs-google-reviews__avatar-colour", "color", "#fff"),
    ("sgs-google-reviews__average-rating", "font-size", "32px"),
    ("sgs-google-reviews__average-rating", "color", "#202124"),
])
def test_every_unroutable_declaration_is_reported_with_its_value(element, prop, value):
    rows = [g for g in _style_rows(_run()) if g["element"] == element and g["property"] == prop]
    assert len(rows) == 1, f"expected exactly one row for {element} {{ {prop} }}, got {len(rows)}"
    assert rows[0]["value"] == value
    assert rows[0]["kind"] == "dropped"
    assert rows[0]["block_slug"].startswith("sgs/")
    assert "no_area_attr" in rows[0]["reason"] or "excluded" in rows[0]["reason"]


def test_the_report_is_exactly_the_thirteen_genuine_skips():
    """Not vacuous, and not spammy: the count is pinned, so a future change that
    starts reporting routed declarations fails here."""
    rows = _style_rows(_run())
    assert len(rows) == 13, json.dumps(
        [(g["element"], g["property"], g["value"]) for g in rows], indent=1)


def test_one_row_per_element_property_however_many_blocks_the_element_is_offered_to():
    """The same element is routed once for the recognised composite and again for
    the wrapping container. Both passes miss; ONE row is produced."""
    rows = _style_rows(_run())
    keys = [(g["element"], g["property"], g["value"]) for g in rows]
    assert len(keys) == len(set(keys))


def test_a_declaration_the_content_side_carried_is_never_reported():
    """``reviews[].avatarColour`` (role ``colour-background``) lifts the avatar's
    inline background, so the per-area style miss for the SAME declaration is a
    false alarm and must not appear — while the avatar's genuinely-lost size and
    letter colour on the same element still do."""
    result = _run()
    markup = result["block_markup"]
    assert '"avatarColour":"#1A73E8"' in markup.replace(" ", "")
    assert ("sgs-google-reviews__avatar-colour", "background") not in _pairs(result)
    assert ("sgs-google-reviews__avatar-colour", "background-color") not in _pairs(result)
    assert ("sgs-google-reviews__avatar-colour", "width") in _pairs(result)


def test_a_shorthand_is_not_counted_beside_its_own_longhands():
    """``border: 1px solid #DADCE0`` expands to three longhands; the shorthand key
    survives in the decls dict and would otherwise be a fourth row for one
    declaration."""
    pairs = _pairs(_run())
    assert ("sgs-google-reviews__review-request-url", "border") not in pairs
    assert ("sgs-google-reviews__review-request-url", "border-width") in pairs


def test_the_markup_is_byte_identical_with_and_without_reporting(monkeypatch):
    """Reporting-only: silencing every report must not move a single byte of the
    emitted markup."""
    with_reporting = _run()["block_markup"]
    monkeypatch.setattr(fold_helpers, "_report_area_skip", lambda *a, **k: None)
    monkeypatch.setattr(fold_helpers, "_report_area_skip_every_tier", lambda *a, **k: None)
    monkeypatch.setattr(fold_helpers, "_note_area_lift", lambda *a, **k: None)
    assert _run()["block_markup"] == with_reporting


def test_the_channel_does_not_leak_between_runs():
    first = _style_rows(_run())
    second = _style_rows(_run())
    assert len(first) == len(second) == 13


# ---------------------------------------------------------------------------
# NEGATIVE CONTROLS — each breaks exactly one half of the fix
# ---------------------------------------------------------------------------

def test_negative_control_without_the_report_call_the_drop_is_silent_again(monkeypatch):
    """Break ONLY the reporting call: the same 13 declarations are still dropped
    and the run goes back to reporting nothing — the pre-fix behaviour."""
    monkeypatch.setattr(fold_helpers, "_report_area_skip", lambda *a, **k: None)
    monkeypatch.setattr(fold_helpers, "_report_area_skip_every_tier", lambda *a, **k: None)
    assert _style_rows(_run()) == []


def test_negative_control_without_the_content_role_probe_the_avatar_background_is_falsely_reported(
    monkeypatch,
):
    """Break ONLY the content-consumption check: the avatar background — which DID
    transfer, as ``avatarColour`` — is reported as a skip. Proves the probe is
    load-bearing rather than always-false."""
    monkeypatch.setattr(fold_helpers, "_consumed_by_a_content_role", lambda *a, **k: False)
    assert ("sgs-google-reviews__avatar-colour", "background-color") in _pairs(_run())


def test_negative_control_without_the_routed_note_a_transferred_property_is_reported(
    monkeypatch,
):
    """Break ONLY the routed ledger: declarations another pass DID route lose their
    cancellation and the row count rises above the 13 genuine skips."""
    monkeypatch.setattr(fold_helpers, "_note_area_lift", lambda *a, **k: None)
    assert len(_style_rows(_run())) > 13


def test_negative_control_the_probe_distinguishes_a_reading_role_from_a_blind_one():
    """The probe's own control: ``colour-background`` reads an inline background
    and ``rating`` does not, so only the first suppresses."""
    assert fold_helpers._consumed_by_a_content_role(
        _SLUG, "avatar-colour", "background", "#1A73E8") is True
    assert fold_helpers._consumed_by_a_content_role(
        _SLUG, "rating", "color", "#FBBC04") is False
    assert fold_helpers._consumed_by_a_content_role(
        _SLUG, "avatar-colour", "border-radius", "50%") is False


def test_the_element_token_derivation_matches_the_array_field_names():
    assert fold_helpers._kebab("avatarColour") == "avatar-colour"
    assert fold_helpers._kebab("datePublished") == "date-published"
    assert fold_helpers._kebab("text") == "text"
    roles = fold_helpers._content_roles_bound_to_area(_SLUG, "avatar-colour")
    assert "colour-background" in roles
    # Negative control: an element the block declares nothing for binds no role.
    assert fold_helpers._content_roles_bound_to_area(_SLUG, "not-a-real-element") == set()


# ---------------------------------------------------------------------------
# The real Eye Care run's own annotated markup (not a hand-built fixture)
# ---------------------------------------------------------------------------

_RUN_DIR = "eye-care-ward-end-eye-care-birmingham-2026-09-21-175447"
_REVIEW_CLASSES = (
    "sgs-google-reviews__rating",
    "sgs-google-reviews__review-request-url",
    "sgs-google-reviews__avatar-colour",
    "sgs-google-reviews__average-rating",
)


def _real_run_markup() -> str | None:
    from pathlib import Path
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "pipeline-state" / _RUN_DIR / "manifest-annotated.html"
        if candidate.exists():
            return candidate.read_text(encoding="utf-8", errors="replace")
    return None


def test_the_real_run_annotates_the_classes_this_fix_reports_on():
    """Grounding: the reported element classes are the ones the live annotation
    stage really put on the Eye Care reviews card — not invented for this test."""
    markup = _real_run_markup()
    if markup is None:
        pytest.skip(f"pipeline-state/{_RUN_DIR}/manifest-annotated.html not present")
    for cls in _REVIEW_CLASSES:
        assert re.search(rf'class="[^"]*{re.escape(cls)}', markup), cls
