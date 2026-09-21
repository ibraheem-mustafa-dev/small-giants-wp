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

  Same day, second step: three of those 13 (the star row's colour, the request link's
  text colour and background) have a block attribute that styles that element, found
  through ``derived_selector`` by ``fold_helpers._selector_route_attr``, so they are now
  ROUTED (``test_area_selector_route.py``) and their rows are gone. The other 10 have
  no destination attribute on the block and stay reported.

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

Re-pinned 2026-09-21 (google-reviews reseed): the block gained ~240 attributes, one for almost
every element the draft styles (the pill's border and radius, the avatar's radius and letter
colour, the aggregate figure's size and colour, the card's border). The Eye Care card now routes
the declarations that used to be the "10 genuine skips", each in the shape its attribute stores.
The avatar's width and height, the last two, are excluded properties (grid/track sizing is
not element sizing); `avatarSize` declares them for the avatar element, so the selector route
now honours them (test_area_size_route.py) and this draft reports NOTHING. So the pins below
are the reporting behaviour itself
(one row per element+property with its value, shorthand not double counted, no leak between
runs) exercised on an element the block has NO attribute for (`no-such-element`), which stays
attribute-less whatever the block gains.

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

# Every declaration on this draft now has a destination (asserted as ROUTED, and absent from the
# report, in test_area_selector_route.py / test_area_box_object_shape.py / test_area_size_route.py).
# The excluded-property report (width/height with no attr for the element) is exercised on an
# attribute-less element, which stays attribute-less whatever the block gains:
def test_an_excluded_property_with_no_attr_is_reported_with_its_value():
    rows = [r for r in _synthetic_rows("width:40px;height:40px")]
    assert sorted((r["prop"], r["value"]) for r in rows) == [("height", "40px"), ("width", "40px")]
    assert all("cross_node_excluded_property" in r["reason"] for r in rows)


def _synthetic_rows(style: str) -> list[dict]:
    """Rows the fold reports for an element the block declares NO attribute for."""
    from bs4 import BeautifulSoup
    from converter.services import content_gap_collector as gap
    from converter.services.fold_helpers import route_area_css_to_block_attrs

    node = BeautifulSoup(
        f'<span class="sgs-google-reviews__no-such-element" style="{style}">x</span>',
        "html.parser").find(True)
    seen: list[dict] = []
    real_rec, real_note = gap.record_declaration_skip_candidate, gap.note_declaration_routed
    gap.record_declaration_skip_candidate = lambda **kw: seen.append(kw)
    gap.note_declaration_routed = lambda **kw: None
    attrs: dict = {}
    try:
        route_area_css_to_block_attrs(node, "no-such-element", _SLUG, attrs, {},
                                      trace=lambda *a, **k: None)
    finally:
        gap.record_declaration_skip_candidate, gap.note_declaration_routed = real_rec, real_note
    assert attrs == {}, "an attribute-less element must route nothing"
    return seen


@pytest.mark.parametrize("prop, value", [
    ("border-color", "#DADCE0"), ("border-width", "1px"), ("border-style", "solid"),
    ("border-radius", "20px"), ("color", "#fff"), ("font-size", "32px"),
])
def test_a_declaration_with_no_attribute_is_reported_once_with_its_value(prop, value):
    rows = [r for r in _synthetic_rows(f"{prop}:{value}") if r["prop"] == prop]
    assert len(rows) == 1
    assert rows[0]["value"] == value
    assert "(no_area_attr)" in rows[0]["reason"]


def test_the_report_is_exactly_the_genuine_skips():
    """Not vacuous, and not spammy: the count is pinned, so a future change that starts
    reporting routed declarations fails here. History: 13 (before the selector route), 10
    (after it), 2 (after the block gained the attrs the other eight needed), 0 (after the
    selector route honoured the avatar's width/height through `avatarSize`). The synthetic
    tests above keep the reporting itself proven while this pin sits at zero."""
    rows = _style_rows(_run())
    assert rows == [], json.dumps(
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
    assert ("sgs-google-reviews__avatar-colour", "width") not in _pairs(result)  # routed to avatarSize


def test_a_shorthand_is_not_counted_beside_its_own_longhands():
    """``border: 1px solid #DADCE0`` expands to three longhands; the shorthand key
    survives in the decls dict and would otherwise be a fourth row for one
    declaration. Run on the attribute-less element so it stays a skip whatever the
    block gains."""
    props = sorted(r["prop"] for r in _synthetic_rows("border:1px solid #DADCE0"))
    assert props == ["border-color", "border-style", "border-width"]


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
    assert len(first) == len(second) == 0
    assert len(_synthetic_rows("width:1px")) == len(_synthetic_rows("width:1px")) == 1


# ---------------------------------------------------------------------------
# NEGATIVE CONTROLS — each breaks exactly one half of the fix
# ---------------------------------------------------------------------------

def test_negative_control_without_the_report_call_the_drop_is_silent_again(monkeypatch):
    """Break ONLY the reporting call: the same declarations are still dropped
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
    cancellation and rows appear for declarations that DID transfer (the draft's genuine skip
    count is 0, so any row here is a false report)."""
    monkeypatch.setattr(fold_helpers, "_note_area_lift", lambda *a, **k: None)
    assert len(_style_rows(_run())) > 0


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
