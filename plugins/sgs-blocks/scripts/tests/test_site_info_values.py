"""Tests for orchestrator/site_info_values.py: the draft's own business details replace the bindings that carry them (A2a, D1133).

Run from plugins/sgs-blocks/scripts:
    python -m pytest tests/test_site_info_values.py -q -p no:cacheprovider
"""
from __future__ import annotations

import pathlib
import sys

_SCRIPTS = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_SCRIPTS / "orchestrator"))

import site_info_values as siv  # noqa: E402

REPO = _SCRIPTS.parents[2]
EYE_CARE_V2 = REPO / "sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2/Eye Care Birmingham.dc.html"
MAMAS = REPO / "sites/mamas-munches/mockups/homepage/index.html"

DRAFT = (
    '<head><script src="support.js"></script></head>'
    '<body><a href="{{ gmbHref }}">Read</a> <a href="{{ phoneHref }}">{{ phone }}</a>'
    '<sc-for list="{{ items }}" as="p"><span>{{ p.phone }}</span></sc-for></body>'
    '<script type="text/x-dc">const C = {phone:\'0121 729 8233\', phoneHref:\'tel:01217298233\', '
    "gmbHref:'https://share.google/abc', bogusHref:'nothing'};</script>"
)


def test_names_are_replaced_with_the_scripts_own_values() -> None:
    out, counts = siv.resolve_site_info_bindings(DRAFT)
    assert counts == {"gmbHref": 1, "phoneHref": 1, "phone": 1}
    assert 'href="https://share.google/abc"' in out
    assert 'href="tel:01217298233">0121 729 8233</a>' in out


def test_a_loop_item_field_with_the_same_last_word_is_left_raw() -> None:
    """Negative control: `{{ p.phone }}` is a field of a loop row, not the business phone."""
    out, _ = siv.resolve_site_info_bindings(DRAFT)
    assert "{{ p.phone }}" in out


def test_the_script_itself_is_never_edited() -> None:
    """Negative control: only the template part changes; everything from the draft's own script on is untouched."""
    out, _ = siv.resolve_site_info_bindings(DRAFT)
    assert out[out.index('<script type="text/x-dc"'):] == DRAFT[DRAFT.index('<script type="text/x-dc"'):]


def test_a_value_that_fails_its_shape_check_is_not_used() -> None:
    """Negative control: a phone key holding text is not a phone, so its binding stays raw."""
    html = '<p>{{ phone }}</p><script type="text/x-dc">const C = {phone:\'ring us any time\'};</script>'
    assert siv.resolve_site_info_bindings(html) == (html, {})


def test_a_value_that_is_itself_a_binding_is_not_used() -> None:
    html = '<a href="{{ gmbHref }}">x</a><script type="text/x-dc">const C = {gmbHref:\'{{ other }}\'};</script>'
    assert siv.resolve_site_info_bindings(html) == (html, {})


def test_a_draft_with_none_of_them_is_returned_unchanged() -> None:
    html = '<section class="sgs-hero"><h1>Hi</h1></section>'
    out, counts = siv.resolve_site_info_bindings(html)
    assert out is html and counts == {}


def test_the_value_is_escaped_for_the_attribute_it_lands_in() -> None:
    html = '<a href="{{ gmbHref }}">x</a><script type="text/x-dc">const C = {gmbHref:\'https://g.page/r/a?b=1&c="2"\'};</script>'
    out, _ = siv.resolve_site_info_bindings(html)
    assert 'href="https://g.page/r/a?b=1&amp;c=&quot;2&quot;"' in out


def test_mamas_munches_is_byte_identical() -> None:
    html = MAMAS.read_text(encoding="utf-8")
    out, counts = siv.resolve_site_info_bindings(html)
    assert counts == {} and out == html


def test_the_eye_care_v2_draft_loses_every_gmb_binding_and_keeps_its_script() -> None:
    html = EYE_CARE_V2.read_text(encoding="utf-8")
    out, counts = siv.resolve_site_info_bindings(html)
    assert counts["gmbHref"] == html.count("{{ gmbHref }}") == 7
    assert "{{ gmbHref }}" not in out
    assert out[out.index('<script type="text/x-dc"'):] == html[html.index('<script type="text/x-dc"'):]
