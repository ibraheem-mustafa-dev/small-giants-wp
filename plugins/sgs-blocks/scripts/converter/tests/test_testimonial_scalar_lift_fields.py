"""test_testimonial_scalar_lift_fields.py — sgs/testimonial scalar-lift selectors.

Two defects, one root cause (a wrong/absent ``derived_selector``):

  * ``summaryPhrase`` and ``orgName`` carry ``role='text-content'`` but a NULL
    ``derived_selector``. ``scalar_content.lift_scalar_content`` skips on the
    selector at ``resolvers/scalar_content.py:158-160`` BEFORE role is ever
    consulted (``:162-173``), so those two fields can never lift — no draft
    markup can make them fire. (The parking entry P-TESTIMONIAL-CONVERTER-FR2220
    recorded the cause as ``role=NULL``; that is WRONG, both roles are set.)

  * ``reviewDate.derived_selector`` was ``.sgs-testimonial__card`` — the card
    ROOT, not a date element. ``node.find(class_=...)`` searches DESCENDANTS, so
    the first draft to name a wrapper ``sgs-testimonial__card`` (a completely
    natural BEM name) would have lifted that wrapper's ENTIRE concatenated text
    into ``reviewDate``. The class appears nowhere in the block's own render.php
    (which emits ``sgs-testimonial__date``), so the old selector was pure
    latent breakage.

The fix is three ``derived_selector`` entries in the reseed-durable truth file
``scripts/attr-classification-overrides.json``. THE DATABASE IS NOT RESEEDED BY
THIS CHANGE — the ``block_attributes`` rows only move on the next
``/sgs-update``. These tests therefore drive the resolver through a catalogue
built from the LIVE DB with that JSON file's overrides applied on top, which is
exactly the composition ``/sgs-update`` Stage 1C performs. Each fix ships with a
negative control that runs the RAW DB catalogue and asserts the defect.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_testimonial_scalar_lift_fields.py -q
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.resolvers import scalar_content
from converter.resolvers.scalar_content import lift_scalar_content

_SLUG = "sgs/testimonial"
_OVERRIDES_JSON = (
    Path(__file__).resolve().parents[2] / "attr-classification-overrides.json"
)


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# Bound at import time, BEFORE any monkeypatch. Reading the attribute off the module
# inside the helper would re-enter whichever fixture patched it and recurse forever.
_REAL_BLOCK_ATTRS = scalar_content.db_lookup.block_attrs


def _raw_catalogue(slug: str) -> dict:
    """The live DB's block_attributes rows — no override layer applied."""
    return {k: dict(v) for k, v in _REAL_BLOCK_ATTRS(slug).items()}


def _catalogue_with_overrides(slug: str) -> dict:
    """DB rows + the JSON truth file's overrides — what /sgs-update Stage 1C seeds.

    Mirrors ``sgs-update-v2.py._load_attr_classification_overrides``: ``_``-prefixed
    keys are human annotations, never columns, so they are dropped.
    """
    catalogue = _raw_catalogue(slug)
    entries = json.loads(_OVERRIDES_JSON.read_text(encoding="utf-8"))["entries"]
    for entry in entries:
        if entry["slug"] != slug or entry["attr"] not in catalogue:
            continue
        catalogue[entry["attr"]].update(
            {k: v for k, v in entry["fields"].items() if not k.startswith("_")}
        )
    return catalogue


@pytest.fixture
def seeded(monkeypatch):
    """Resolve block_attrs through DB-rows-plus-overrides (post-/sgs-update state)."""
    monkeypatch.setattr(
        scalar_content.db_lookup, "block_attrs", _catalogue_with_overrides
    )


@pytest.fixture
def unseeded(monkeypatch):
    """Negative control: resolve through the RAW DB rows, overrides NOT applied."""
    monkeypatch.setattr(scalar_content.db_lookup, "block_attrs", _raw_catalogue)


@pytest.fixture
def patched_selectors(monkeypatch):
    """Lift with `derived_selector` forced to an EXPLICIT value per attr.

    Added 2026-08-07. The two negative controls below used to express "no selector"
    and "the old landmine selector" by riding the RAW DB rows, which silently assumed
    the DB still held the pre-correction values. A reseed derived the corrected
    selectors into those very rows, so both controls stopped exercising anything —
    the failure mode this project already has a name for (`negative-control-or-the-
    test-is-vacuous`, and its sibling `a-negative-control-has-its-own-vacuity-mode`).

    Stating the selector under test explicitly makes each control a statement about
    the RESOLVER'S CONTRACT, which no reseed can void.
    """
    def _lift(html: str, selectors: dict) -> dict:
        def _catalogue(slug: str) -> dict:
            catalogue = _catalogue_with_overrides(slug)
            for attr, selector in selectors.items():
                if attr not in catalogue:
                    raise AssertionError(
                        f"{slug}.{attr} is not in block_attributes — this control "
                        f"would be vacuous; fix the attr name, do not delete the test"
                    )
                catalogue[attr]["derived_selector"] = selector
            return catalogue
        monkeypatch.setattr(scalar_content.db_lookup, "block_attrs", _catalogue)
        return lift_scalar_content(_node(html), _SLUG, {})
    return _lift


# A fully BEM-classed draft testimonial: every content element carries its class,
# so nothing reaches the bare-tag fallback and each assertion is about selectors.
_CLASSED_HTML = (
    '<div class="sgs-testimonial">'
    '<p class="sgs-testimonial__quote">The team rebuilt our whole ordering flow.</p>'
    '<p class="sgs-testimonial__summary">Transformed our operations</p>'
    '<p class="sgs-testimonial__name">Jane Smith</p>'
    '<p class="sgs-testimonial__org">Northgate Foods</p>'
    '<p class="sgs-testimonial__date">14 March 2026</p>'
    "</div>"
)

# The landmine draft: a wrapper legitimately named `sgs-testimonial__card` sits
# between the block root and the content. `find(class_=...)` walks descendants,
# so the OLD `.sgs-testimonial__card` selector matches this wrapper and lifts its
# entire concatenated text.
_CARD_WRAPPER_HTML = (
    '<div class="sgs-testimonial">'
    '<div class="sgs-testimonial__card">'
    '<p class="sgs-testimonial__quote">The team rebuilt our whole ordering flow.</p>'
    '<p class="sgs-testimonial__name">Jane Smith</p>'
    '<p class="sgs-testimonial__date">14 March 2026</p>'
    "</div></div>"
)


# -- the fix: three selectors that let the fields lift -------------------------


def test_summary_org_and_date_lift_from_their_own_elements(seeded):
    """All three fields lift their OWN element's text, not a neighbour's."""
    lifted = lift_scalar_content(_node(_CLASSED_HTML), _SLUG, {})
    assert lifted.get("summaryPhrase") == "Transformed our operations"
    assert lifted.get("orgName") == "Northgate Foods"
    assert lifted.get("reviewDate") == "14 March 2026"
    # The pre-existing fields are untouched by the new selectors.
    assert lifted.get("quote") == "The team rebuilt our whole ordering flow."
    assert lifted.get("reviewerName") == "Jane Smith"


def test_negative_control_without_overrides_the_fields_never_lift(patched_selectors):
    """Proves the fields are blocked by the NULL selector, not by the fixture.

    With ``derived_selector`` NULL the resolver skips both attrs at
    ``scalar_content.py:158-160`` and emits no key — even though the draft carries
    perfectly-named ``__summary`` / ``__org`` elements.

    ⚠ REWRITTEN 2026-08-07. This control used to ride the ``unseeded`` fixture, i.e.
    the RAW DB rows, on the assumption that the corrected selectors live ONLY in the
    overrides JSON. A reseed derived them into the DB rows themselves — the correction
    GRADUATED from a hand override to a mechanism-derived value, which is the direction
    this project wants — and the control silently became vacuous: `unseeded` and
    `seeded` now agree, so it was asserting nothing about selectors at all. It now
    NULLs the selector explicitly, so it tests the resolver's contract rather than a
    transient DB state, and cannot be voided by any future reseed.
    """
    lifted = patched_selectors(
        _CLASSED_HTML, {"summaryPhrase": None, "orgName": None}
    )
    assert "summaryPhrase" not in lifted
    assert "orgName" not in lifted
    # Same fixture still lifts the attrs that DO have a selector — so the absence
    # above is about these two attrs, not a dead call.
    assert lifted.get("quote") == "The team rebuilt our whole ordering flow."


# -- the landmine: `.sgs-testimonial__card` swallowed the whole card ------------


def test_landmine_negative_control_old_selector_lifts_the_entire_card(patched_selectors):
    """The landmine is REAL: a `.sgs-testimonial__card` selector on ``reviewDate``
    lifts the wrapper's full concatenated text.

    ⚠ REWRITTEN 2026-08-07, and its own warning is why. The assertion carried the
    message "if this fails the DB has already been reseeded and this control is
    vacuous" — and that is exactly what happened: a reseed corrected the DB row to
    `.sgs-testimonial__date`, so the control began failing while the PRODUCT was
    healthier than before. The landmine selector is now stated explicitly here rather
    than borrowed from whatever the DB currently holds, so this proves the hazard is
    real for as long as `find(class_=...)` walks descendants — independent of seeding.
    """
    lifted = patched_selectors(
        _CARD_WRAPPER_HTML, {"reviewDate": ".sgs-testimonial__card"}
    )
    review_date = lifted.get("reviewDate") or ""
    assert "Jane Smith" in review_date, (
        "the card-wrapper selector should swallow the card's concatenated text"
    )
    assert review_date != "14 March 2026"


def test_landmine_fixed_card_wrapper_does_not_poison_review_date(seeded):
    """Regression: with `.sgs-testimonial__date`, a `__card` wrapper is inert."""
    lifted = lift_scalar_content(_node(_CARD_WRAPPER_HTML), _SLUG, {})
    assert lifted.get("reviewDate") == "14 March 2026"
    assert "Jane Smith" not in (lifted.get("reviewDate") or "")
    assert "rebuilt our whole ordering flow" not in (lifted.get("reviewDate") or "")
