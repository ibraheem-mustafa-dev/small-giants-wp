"""test_variant_probe_identity.py -- an icon holder votes for a variant only on that variant's OWN element.

``assembly._draft_declares_probe`` used to match a holder to a slot element when the holder's canonical slot was
any hyphen word of the slot's ``css_element``. ``.sgs-trust-bar__badge`` resolves to the slot ``badge`` and
``badge`` is a word of BOTH ``icon-badge`` (the icon-circle disc) and ``badge-img`` (the image-badge picture), so
one styled svg holder voted for two variants: they tied, ``detect_variant`` returned None and a correct
icon-circle pick was lost (measured: ``badgeStyle`` absent for a sized-svg badge with a disc).

Identity is now DB-resolved (``assembly._element_identity_slots``): a css_element the synonym table resolves
whole is that one slot (``badge-img`` -> ``image``), so an svg holder never votes for it.

Draft-agnostic synthetic HTML, no run artefacts. Every behaviour carries a negative control (the old word match
restored): the same input gives the OLD wrong answer.
Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_variant_probe_identity.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re

import pytest
from bs4 import BeautifulSoup

from converter.db import db_lookup
from converter.entry import convert_section
from converter.services import assembly
from converter.services import content_gap_collector as gap_collector
from converter.services.css_parse import parse_css

SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" width="15" height="15" stroke="#123456" '
       'stroke-width="1.6"><path d="M2 3h19v18H2z"/></svg>')
DISC = ".sgs-trust-bar__{h}{{width:44px;height:44px;border-radius:50%;box-shadow:0 1px 2px rgba(0,0,0,.06)}}"


@pytest.fixture(autouse=True)
def _clean():
    gap_collector.clear()
    yield
    gap_collector.clear()


def _badge_style(holder: str, css: str, svg: str = SVG) -> "str | None":
    items = "".join(
        f'<span class="sgs-trust-bar__item"><span class="sgs-trust-bar__{holder}">{svg}</span>'
        f'<span class="sgs-trust-bar__label">Claim {n}</span></span>' for n in range(3))
    html = f'<div class="sgs-trust-bar"><div class="sgs-trust-bar__track">{items}</div></div>'
    res = convert_section(html=html, css=css, media_map={}, boundary_id="b1", section_id="s1")
    m = re.search(r"<!-- wp:sgs/trust-bar (\{.*?\}) /?-->", res["block_markup"], re.S)
    assert m, res["block_markup"][:200]
    return json.loads(m.group(1)).get("badgeStyle")


def _old_word_match(monkeypatch) -> None:
    """Restore the previous behaviour: every hyphen word of the css_element is an identity."""
    monkeypatch.setattr(assembly, "_element_identity_slots", lambda element: frozenset(element.split("-")))


# ---- the reviewer's scenario: a holder named ``badge`` -------------------------------------------------

def test_a_styled_badge_holder_with_a_sized_svg_is_icon_circle_not_a_lost_tie():
    assert _badge_style("badge", DISC.format(h="badge")) == "icon-circle"


def test_negative_control_the_word_match_ties_icon_circle_with_image_badge_and_drops_the_pick(monkeypatch):
    _old_word_match(monkeypatch)
    assert _badge_style("badge", DISC.format(h="badge")) is None      # the measured defect


# ---- the three ordinary drafts stay right ---------------------------------------------------------------

def test_a_circled_icon_draft_is_still_icon_circle():
    assert _badge_style("icon", DISC.format(h="icon")) == "icon-circle"


def test_a_bare_icon_draft_is_still_icon_bare():
    assert _badge_style("icon", "") == "icon-bare"
    assert _badge_style("badge", "") == "icon-bare"


def test_a_draft_that_populated_nothing_still_leaves_the_variant_to_the_default():
    assert _badge_style("badge", DISC.format(h="badge"), svg=SVG.replace(' width="15" height="15"', "")) is None
    assert _badge_style("icon", "", svg=SVG.replace(' width="15" height="15"', "")) is None


def test_negative_control_the_disc_draft_test_would_fail_under_a_probe_that_never_votes(monkeypatch):
    """Proves the icon-circle assertions above are carried by the probe, not by the populated size."""
    monkeypatch.setattr(assembly, "_draft_declares_probe", lambda *_a, **_k: (lambda *_b: False))
    assert _badge_style("icon", DISC.format(h="icon")) == "icon-bare"


# ---- the probe itself, on the DB's real element names ----------------------------------------------------

def _probe(holder_class: str, css: str):
    root = BeautifulSoup(f'<div class="sgs-trust-bar"><span class="{holder_class}">{SVG}</span></div>',
                         "html.parser").find()
    return assembly._draft_declares_probe(root, parse_css(css))


def test_an_svg_holder_votes_for_the_disc_element_and_not_for_the_image_element():
    declares = _probe("sgs-trust-bar__badge", ".sgs-trust-bar__badge{border-radius:50%;box-shadow:0 1px 2px red}")
    assert declares("border-radius", "icon-badge") is True
    assert declares("box-shadow", "icon-badge") is True
    assert declares("border-radius", "badge-img") is False      # resolves to `image`: not an svg holder's element
    assert declares("box-shadow", "badge-img") is False


def test_an_icon_holder_votes_for_both_icon_elements_but_never_the_image_element():
    declares = _probe("sgs-trust-bar__icon", ".sgs-trust-bar__icon{width:44px;height:44px;border-radius:50%}")
    assert declares("height,width", "icon-bare") is True
    assert declares("height,width", "icon-badge") is True
    assert declares("border-radius", "badge-img") is False


def test_a_holder_whose_class_is_the_exact_element_name_votes_for_that_element_only():
    declares = _probe("sgs-trust-bar__icon-badge", ".sgs-trust-bar__icon-badge{border-radius:50%}")
    assert declares("border-radius", "icon-badge") is True
    assert declares("border-radius", "icon-bare") is False
    assert declares("border-radius", "badge-img") is False


def test_a_property_the_draft_does_not_declare_is_false_and_a_background_shorthand_counts():
    declares = _probe("sgs-trust-bar__badge", ".sgs-trust-bar__badge{background:#fff}")
    assert declares("background-color", "icon-badge") is True
    assert declares("box-shadow", "icon-badge") is False


def test_negative_control_the_word_match_lets_the_badge_holder_vote_for_the_image_element(monkeypatch):
    _old_word_match(monkeypatch)
    declares = _probe("sgs-trust-bar__badge", ".sgs-trust-bar__badge{border-radius:50%}")
    assert declares("border-radius", "badge-img") is True        # the defect: one holder, two variants


def test_the_identity_slots_come_from_the_db_synonym_table_for_the_blocks_real_elements():
    assert assembly._element_identity_slots("badge-img") == frozenset({"image"})
    assert assembly._element_identity_slots("icon-bare") == frozenset({"icon"})
    assert assembly._element_identity_slots("icon-badge") == frozenset({"icon", "badge"})
    assert db_lookup.canonical_slot_for("badge-img") == "image"
