"""test_decorative_img_lift -- a decorative <img> is never lifted as a content image.

Measured on the live Eye Care page (2026-09-21): each of 13 review cards holds
``<img src="assets/google-g.svg" alt="" aria-hidden="true" width="17">`` (the Google "G" source mark),
and the image-object lift took "the first <img> in the item" as the reviewer's ``photo``, so 13 reviews
carried a dead relative URL (the media endpoint also refuses ``.svg``, so it could never be hosted).

Definition (lift_helpers.is_decorative_img): ``aria-hidden="true"`` OR ``role="presentation"`` /
``role="none"``. An empty ``alt`` on its own is NOT decorative (an unlabelled content image still lifts).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_decorative_img_lift.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.entry import convert_section
from converter.resolvers.array_content import lift_array_content
from converter.resolvers.scalar_content import lift_scalar_content
from converter.services import content_gap_collector as gap_collector
from converter.services import lift_helpers
from converter.services.field_extractors import extract_field_value
from converter.services.lift_helpers import DECORATIVE_IMG_REASON, is_decorative_img


def _el(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


_G_MARK = '<img src="assets/google-g.svg" alt="" aria-hidden="true" width="17" height="17">'
_AVATAR = '<img src="/img/reviewer.jpg" alt="Sam R.">'


# ---------------------------------------------------------------------------
# The predicate
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("html,expected", [
    ('<img src="a.svg" alt="" aria-hidden="true">', True),
    ('<img src="a.svg" aria-hidden="TRUE">', True),
    ('<img src="a.svg" role="presentation">', True),
    ('<img src="a.svg" role="none" alt="">', True),
    ('<img src="a.jpg" alt="">', False),                     # empty alt alone = unlabelled CONTENT image
    ('<img src="a.jpg" alt="Sam">', False),
    ('<img src="a.jpg" aria-hidden="false">', False),
    ('<img src="a.jpg" role="img">', False),
    ('<span aria-hidden="true">x</span>', False),            # only an <img> can be a decorative image
])
def test_is_decorative_img_definition(html, expected):
    assert is_decorative_img(_el(html)) is expected


def test_is_decorative_img_tolerates_non_tags():
    assert is_decorative_img(None) is False
    assert is_decorative_img("img") is False


# ---------------------------------------------------------------------------
# extract_field_value(role="image-object") -- the shared extractor
# ---------------------------------------------------------------------------

def test_a_container_holding_only_a_decorative_img_lifts_no_image():
    assert extract_field_value(_el("<figure>%s<p>Text</p></figure>" % _G_MARK), "image-object") is None


def test_a_container_skips_the_decorative_img_and_lifts_the_real_one():
    result = extract_field_value(_el("<figure>%s%s</figure>" % (_G_MARK, _AVATAR)), "image-object")
    assert result == {"url": "/img/reviewer.jpg", "id": 0, "alt": "Sam R."}


def test_an_unlabelled_content_img_still_lifts():
    """Negative control for the definition: alt="" without aria-hidden is a content image."""
    result = extract_field_value(_el('<figure><img src="/img/p.jpg" alt=""></figure>'), "image-object")
    assert result == {"url": "/img/p.jpg", "id": 0, "alt": ""}


def test_an_img_bound_explicitly_is_not_second_guessed():
    """The element IS the <img> (an atomic leaf block recognised on it): it keeps its own src."""
    result = extract_field_value(_el('<img class="x" src="/blob.png" alt="" aria-hidden="true">'), "image-object")
    assert result == {"url": "/blob.png", "id": 0, "alt": ""}


# ---------------------------------------------------------------------------
# Array items (sgs/google-reviews.reviews[].photo)
# ---------------------------------------------------------------------------

def _flat_card(author: str, extra: str) -> str:
    """Draft shape: a flat item (class-less children), the item only carrying its BEM class."""
    return (
        '<figure class="sgs-google-reviews__review"><div>%s<span>%s</span></div>'
        "<p>Really good service, would come again.</p></figure>" % (extra, author)
    )


def _bem_card(author: str, extra: str) -> str:
    return (
        '<article class="sgs-google-reviews__review">%s<strong class="sgs-google-reviews__author">%s</strong>'
        '<p class="sgs-google-reviews__text">Lovely experience.</p></article>' % (extra, author)
    )


def _reviews(card, extras):
    root = _el('<div class="sgs-google-reviews">%s</div>' % "".join(card("Reviewer %d" % i, e) for i, e in enumerate(extras)))
    return lift_array_content(root, "sgs/google-reviews", media_map={})


@pytest.mark.parametrize("card", [_flat_card, _bem_card], ids=["flat-item", "bem-item"])
def test_a_decorative_source_mark_never_becomes_a_reviews_photo(card):
    attrs, gaps = _reviews(card, [_G_MARK, _G_MARK, _G_MARK])
    assert len(attrs["reviews"]) == 3
    assert all("photo" not in r for r in attrs["reviews"]), attrs["reviews"]


@pytest.mark.parametrize("card", [_flat_card, _bem_card], ids=["flat-item", "bem-item"])
def test_each_skipped_decorative_img_is_reported(card):
    _attrs, gaps = _reviews(card, [_G_MARK, _G_MARK])
    rows = [g for g in gaps if DECORATIVE_IMG_REASON in g.detail]
    assert [g.where for g in rows] == ["reviews[0].photo", "reviews[1].photo"]
    assert all("assets/google-g.svg" in g.detail for g in rows)


@pytest.mark.parametrize("card", [_flat_card, _bem_card], ids=["flat-item", "bem-item"])
def test_a_real_avatar_still_lifts_beside_a_decorative_mark(card):
    attrs, gaps = _reviews(card, [_G_MARK + _AVATAR, _AVATAR])
    assert [r["photo"]["url"] for r in attrs["reviews"]] == ["/img/reviewer.jpg", "/img/reviewer.jpg"]
    # the mark on item 0 is still reported; item 1 had none
    assert [g.where for g in gaps if DECORATIVE_IMG_REASON in g.detail] == ["reviews[0].photo"]


def test_a_bem_classed_photo_marked_decorative_is_still_not_content():
    mark = '<img class="sgs-google-reviews__photo" src="assets/g.svg" alt="" aria-hidden="true">'
    attrs, gaps = _reviews(_bem_card, [mark, mark])
    assert all("photo" not in r for r in attrs["reviews"])
    assert len([g for g in gaps if DECORATIVE_IMG_REASON in g.detail]) == 2


def test_an_item_with_no_decorative_img_reports_nothing():
    _attrs, gaps = _reviews(_flat_card, [_AVATAR, _AVATAR])
    assert not [g for g in gaps if DECORATIVE_IMG_REASON in g.detail]


# ---------------------------------------------------------------------------
# Scalar lift (sgs/team-member.photo -- an image-object attr with a derived selector)
# ---------------------------------------------------------------------------

def test_scalar_photo_slot_holding_only_a_decorative_img_lifts_nothing_and_reports():
    gap_collector.clear()
    node = _el('<div class="sgs-team-member"><div class="sgs-team-member__photo">%s</div></div>' % _G_MARK)
    lifted = lift_scalar_content(node, "sgs/team-member", {})
    assert "photo" not in lifted
    rows = [g for g in gap_collector.flush() if g["detail"] == DECORATIVE_IMG_REASON]
    assert [(g["block_slug"], g["where"]) for g in rows] == [("sgs/team-member", "sgs/team-member.photo")]


def test_scalar_photo_slot_with_a_real_img_still_lifts():
    gap_collector.clear()
    node = _el('<div class="sgs-team-member"><div class="sgs-team-member__photo">%s%s</div></div>' % (_G_MARK, _AVATAR))
    assert lift_scalar_content(node, "sgs/team-member", {})["photo"]["url"] == "/img/reviewer.jpg"


def test_scalar_bare_tag_fallback_never_claims_a_decorative_img():
    """No BEM photo class at all: the bare-tag fallback claims the first loose <img>, but not a decorative one."""
    gap_collector.clear()
    mark = _el('<div class="sgs-team-member">%s</div>' % _G_MARK)
    assert lift_scalar_content(mark, "sgs/team-member", {}) == {}
    assert [g["where"] for g in gap_collector.flush() if g["detail"] == DECORATIVE_IMG_REASON] == ["sgs/team-member.photo"]
    real = _el('<div class="sgs-team-member">%s</div>' % _AVATAR)
    assert lift_scalar_content(real, "sgs/team-member", {})["photo"]["url"] == "/img/reviewer.jpg"


# ---------------------------------------------------------------------------
# Mama's committed draft: nothing there is decorative, so its output cannot change
# ---------------------------------------------------------------------------

REPO = Path(__file__).resolve().parents[5]
MAMAS = REPO / "sites" / "mamas-munches" / "mockups" / "homepage" / "index.html"


@pytest.mark.skipif(not MAMAS.exists(), reason="needs the committed Mama's homepage draft")
def test_mamas_draft_output_is_identical_with_the_decorative_rule_off(monkeypatch):
    soup = BeautifulSoup(MAMAS.read_text(encoding="utf-8"), "html.parser")
    decorative = [i for i in soup.find_all("img") if is_decorative_img(i)]
    css = "\n".join(t.get_text() for t in soup.find_all("style"))
    sections = [s for s in soup.find_all("section")][:6]

    def run() -> list[str]:
        out = []
        for i, sec in enumerate(sections):
            gap_collector.clear()
            res = convert_section(html=str(sec), css=css, media_map={}, boundary_id="b%d" % i, section_id="s%d" % i)
            out.append(res["block_markup"])
        return out

    with_rule = run()
    monkeypatch.setattr(lift_helpers, "is_decorative_img", lambda _t: False)
    import converter.resolvers.array_content as ac
    import converter.resolvers.scalar_content as sc
    monkeypatch.setattr(ac, "is_decorative_img", lambda _t: False)
    monkeypatch.setattr(sc, "is_decorative_img", lambda _t: False)
    monkeypatch.setattr(sc, "has_only_decorative_imgs", lambda _e: False)
    without_rule = run()
    assert with_rule == without_rule
    assert decorative == [], "Mama's homepage now carries a decorative <img>: %s" % decorative


# ---------------------------------------------------------------------------
# The real Eye Care run: 13 reviews, none carrying the G mark as a photo
# ---------------------------------------------------------------------------

RUN = REPO / "pipeline-state" / "eye-care-ward-end-eye-care-birmingham-2026-09-21-131739"
needs_run = pytest.mark.skipif(
    not (RUN / "manifest-annotated.html").exists() or not (RUN / "script-bindings.json").exists(),
    reason="needs the local Eye Care run artefacts in pipeline-state",
)


@needs_run
def test_the_real_eye_care_reviews_carry_no_google_g_photo():
    soup = BeautifulSoup((RUN / "manifest-annotated.html").read_text(encoding="utf-8"), "html.parser")
    css = "\n\n".join(t.get_text() for t in soup.find_all("style"))
    variation = RUN / "variation-d0-d2.css"
    if variation.exists():
        css += "\n\n" + variation.read_text(encoding="utf-8")
    bindings = json.loads((RUN / "script-bindings.json").read_text(encoding="utf-8"))["resolved"]
    gap_collector.clear()
    section = BeautifulSoup(str(soup.find(class_="sgs-google-reviews")), "html.parser").find()
    if section.has_attr("data-sgs-boundary-id"):
        del section["data-sgs-boundary-id"]
    result = convert_section(html=str(section), css=css, media_map={}, boundary_id="b1", section_id="s1", tier_bindings=bindings)
    match = re.search(r"<!-- wp:sgs/google-reviews (\{.*?\}) /?-->", result["block_markup"], re.S)
    assert match, result["block_markup"][:200]
    reviews = json.loads(match.group(1))["reviews"]
    assert len(reviews) == 13
    assert all(not r.get("photo") for r in reviews), [r.get("photo") for r in reviews]
    assert all(r.get("author") and r.get("text") and r.get("date") and r.get("meta") for r in reviews)
    assert any(r["author"] == "Anonymous M." for r in reviews)
    skipped = [g for g in result["content_gaps"] if DECORATIVE_IMG_REASON in g["detail"] and g["block_slug"] == "sgs/google-reviews"]
    assert len(skipped) == 13
