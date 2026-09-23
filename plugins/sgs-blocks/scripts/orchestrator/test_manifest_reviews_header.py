"""manifest_annotation: the redesigned reviews header (design 2026-09-21-google-reviews-block-design.md section 5, R3).

The annotator now names, on the run copy, what the redesigned `sgs/google-reviews` has attributes for:

* the TWO header pills: each anchor is decided by a ladder that reports the rung (`header_link_rungs`): the anchor's wording
  against each link attribute's vocabulary, then what the draft calls the anchor (aria-label, data-*, id, class), and only
  last its position; an anchor no rung decides is reported, never guessed;
* the review-source caption (`sourceLabel`) apart from a business name (`businessName`);
* the footnote (`footnote`): found by structure (the only text after the items that shares a row with the draft's own
  controls, and the block's only text attribute left over), never by its wording;
* the structure the block lists a class for (`header`, `rail`, `arrow`, `google-logo`), keyed to the classes the block's
  attributes list in `derived_selector` (`derived_classes`), never to a name in this module's code.

Every rule has a NEGATIVE CONTROL that breaks exactly one half and checks that the result changes. The fixtures are the REAL
Eye Care header row and footer row (Eye Care Birmingham.dc.html v2, lines 977-993 and 1019-1029, copied verbatim; only the
`{{ gmbHref }}` mustache is the address the runtime resolves it to).

Run from plugins/sgs-blocks/scripts:
  python -m pytest orchestrator/test_manifest_reviews_header.py -q -p no:cacheprovider
"""
import json
import re
import sqlite3
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import manifest_annotation as ma  # noqa: E402
from manifest_annotation import DbBlockLookup, ScalarAttr, annotate_from_manifest  # noqa: E402
from test_manifest_box_header import (  # noqa: E402
    RUN_NEW, SCRIPTS, RevLookup, SCALARS, STAR_SLOTS, ELEMENTS, _convert, _google_reviews_block, _review, _skipped, _tag_with,
)

EYE_HEADER = "        <div style=\"display:flex;justify-content:space-between;align-items:center;gap:22px;flex-wrap:wrap;padding-bottom:22px;border-bottom:1px solid #E8EAED\">\n          <div style=\"display:flex;align-items:center;gap:16px\">\n            <img src=\"assets/google-g.svg\" alt=\"\" aria-hidden=\"true\" width=\"30\" height=\"30\" style=\"display:block\">\n            <div>\n              <div style=\"font-size:13px;color:#5F6368;letter-spacing:.01em\">Google Reviews</div>\n              <div style=\"display:flex;align-items:center;gap:10px;margin-top:5px;flex-wrap:wrap\">\n                <span style=\"font-size:32px;line-height:1;color:#202124;font-weight:500\">4.7</span>\n                <span style=\"position:relative;display:inline-block;font-size:18px;letter-spacing:.12em;line-height:1;color:#DADCE0\" aria-label=\"4.7 out of 5\">\u2605\u2605\u2605\u2605\u2605<span style=\"position:absolute;left:0;top:0;width:94%;overflow:hidden;color:#FBBC04\">\u2605\u2605\u2605\u2605\u2605</span></span>\n                <span style=\"font-size:13.5px;color:#5F6368\">15 reviews</span>\n              </div>\n            </div>\n          </div>\n          <div style=\"display:flex;gap:10px;flex-wrap:wrap\">\n            <a href=\"https://share.google/9YZzTiRj2gvW1Xrpr\" target=\"_blank\" rel=\"noopener\" style=\"display:inline-flex;align-items:center;min-height:40px;padding:0 22px;border-radius:20px;background:#1A73E8;color:#fff;font-size:14px;font-weight:500;transition:background .2s\" style-hover=\"background:#1765CC\">See all reviews</a>\n            <a href=\"https://share.google/9YZzTiRj2gvW1Xrpr\" target=\"_blank\" rel=\"noopener\" style=\"display:inline-flex;align-items:center;min-height:40px;padding:0 22px;border-radius:20px;border:1px solid #DADCE0;color:#1A73E8;font-size:14px;font-weight:500;transition:background .2s\" style-hover=\"background:#F1F6FE\">Write a review</a>\n          </div>\n        </div>"
EYE_FOOTER = "          <div style=\"display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:6px\">\n            <p style=\"margin:0;font-size:13px;color:#5F6368\">Scroll for more \u2014 13 of the 15 reviews left a comment.</p>\n            <div style=\"display:flex;gap:8px\">\n              <button onClick=\"{{ revPrev }}\" aria-label=\"Previous reviews\" style=\"width:40px;height:40px;border-radius:50%;border:1px solid #DADCE0;background:#fff;color:#1A73E8;display:flex;align-items:center;justify-content:center;transition:background .2s\" style-hover=\"background:#F1F6FE\">\n                <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M15 5 8 12l7 7\"></path></svg>\n              </button>\n              <button onClick=\"{{ revNext }}\" aria-label=\"More reviews\" style=\"width:40px;height:40px;border-radius:50%;border:1px solid #DADCE0;background:#fff;color:#1A73E8;display:flex;align-items:center;justify-content:center;transition:background .2s\" style-hover=\"background:#F1F6FE\">\n                <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 5l7 7-7 7\"></path></svg>\n              </button>\n            </div>\n          </div>"
URL = "https://share.google/9YZzTiRj2gvW1Xrpr"
SEE_ALL_SEL = ".sgs-google-reviews__see-all, .sgs-google-reviews__see-all-url"
WRITE_SEL = ".sgs-google-reviews__write-review, .sgs-google-reviews__review-request-url"
NEW_SCALARS = [
    ScalarAttr("averageRating", "numeric-content", "number"), ScalarAttr("reviewCount", "numeric-content", "number"),
    ScalarAttr("reviewRequestUrl", "link-href", "string", True),                  # declared FIRST, as in the live block
    ScalarAttr("seeAllUrl", "link-href", "string", True, SEE_ALL_SEL),
    ScalarAttr("seeAllLabel", "text-content", "string", False, SEE_ALL_SEL),
    ScalarAttr("writeReviewLabel", "text-content", "string", False, WRITE_SEL),
    ScalarAttr("sourceLabel", "text-content", "string", False, ".sgs-google-reviews__source-label"),
    ScalarAttr("footnote", "text-content", "string", False, ".sgs-google-reviews__footnote"),
    ScalarAttr("businessName", "text-content", "string", False, ".sgs-google-reviews__business-name"),
]
# every element class the live block's attributes list in derived_selector (the ones this change looks at, plus decoys)
LISTED = frozenset("sgs-google-reviews__" + e for e in (
    "header", "aggregate", "rail", "list", "arrow", "show-arrows", "arrow-colour", "google-logo", "card-logo", "source-label",
    "footnote", "see-all", "see-all-url", "write-review", "review-request-url", "business-name", "average-rating", "review-count"))
NEW_ELEMENTS = ELEMENTS | {"header", "list", "footnote", "google-logo", "card-logo", "see-all", "source-label"}
SLOTS = {**STAR_SLOTS, "label": {"label"}, "eyebrow": {"label"}}


class HdrLookup(RevLookup):
    """The reviews block as the redesign leaves it: both link attributes, the caption and footnote text attributes, and the
    classes its attributes list."""

    def __init__(self, scalars=None, classes=LISTED, elements=NEW_ELEMENTS):
        super().__init__(scalars=list(scalars if scalars is not None else NEW_SCALARS), elements=elements)
        self._classes = classes

    def slots_of(self, term):
        return frozenset(SLOTS.get(term, set()))

    def derived_classes(self, slug):
        return self._classes


def _card(i: int) -> str:
    """A marked review card that also carries the per-card Google 'G' (the real draft has one in every card)."""
    return _review(i).replace("<figure>", '<figure><img src="assets/google-g.svg" alt="" aria-hidden="true" width="17" height="17">', 1)


def eye_draft(header: str = EYE_HEADER, footer: str = EYE_FOOTER, reviews: int = 3, before_rail: str = "") -> str:
    cards = "".join(_card(i) for i in range(reviews))
    card_style = "border:1px solid #DADCE0;border-radius:12px;background:#fff;padding:28px 26px"
    body = (f'<section class="sgs-revs"><div style="max-width:1440px;margin:0 auto"><h2>What people say</h2>'
            f'<div data-reveal="1" style="{card_style}">{header}{before_rail}<div style="position:relative;padding-top:22px">'
            f'<div class="rev-rail" style="display:flex;gap:16px;overflow-x:auto">{cards}</div>{footer}</div></div></div></section>')
    manifest = json.dumps({"sectionBlocks": {"sgs-revs": {"suggestedBlock": "google-reviews", "confidence": "high"}},
                           "repeatedGroups": [{"section": "sgs-revs", "count": reviews}]})
    return (f'<!doctype html><html><head></head><body>{body}\n<script type="application/json" data-sgs-manifest>{manifest}'
            "</script></body></html>")


def run(html: str, lookup=None):
    out, rows = annotate_from_manifest(html, lookup or HdrLookup())
    return out, rows[0]


def pills(header: str, first: str = "", second: str = "", texts: tuple[str, str] | None = None) -> str:
    """The real header with extra attributes on the two pill anchors, and optionally different link text."""
    head, _a, rest = header.partition("<a href=")
    mid, _b, tail = rest.partition("<a href=")
    out = f"{head}<a {first} href={mid}<a {second} href={tail}"
    if texts:
        out = out.replace("See all reviews", "@@1@@").replace("Write a review", "@@2@@").replace("@@1@@", texts[0]).replace("@@2@@", texts[1])
    return out


def rungs(row: dict) -> dict[str, tuple[str, str]]:
    return {r["link"]: (r["attribute"], r["rung"]) for r in row.get("header_link_rungs", [])}


def structure(row: dict) -> dict[str, dict]:
    return {s["element"]: s for s in row.get("header_structure", [])}


# --------------------------------------------------------------------------------------------------------------
# 1. The two header pills
# --------------------------------------------------------------------------------------------------------------

def test_the_two_pills_are_told_apart_by_their_wording_and_each_reports_its_rung():
    out, row = run(eye_draft())
    filled, outlined = _tag_with(out, "sgs-google-reviews__see-all-url"), _tag_with(out, "sgs-google-reviews__review-request-url")
    assert "background:#1A73E8" in filled and "border:1px solid #DADCE0" in outlined          # the filled pill is 'See all'
    assert rungs(row) == {"See all reviews": ("seeAllUrl", "link text"), "Write a review": ("reviewRequestUrl", "link text")}
    assert {"seeAllUrl", "seeAllLabel", "reviewRequestUrl", "writeReviewLabel"} <= set(row["header_fields"])
    assert not any(f.startswith("header link") for f in _skipped(row))                            # nothing left unclassed


def test_negative_control_swap_the_wording_and_the_classes_swap_so_wording_and_not_order_decided():
    out, row = run(eye_draft(pills(EYE_HEADER, texts=("Write a review", "See all reviews"))))
    assert "background:#1A73E8" in _tag_with(out, "sgs-google-reviews__review-request-url")      # the filled pill now says 'Write'
    assert "border:1px solid #DADCE0" in _tag_with(out, "sgs-google-reviews__see-all-url")
    assert rungs(row) == {"Write a review": ("reviewRequestUrl", "link text"), "See all reviews": ("seeAllUrl", "link text")}


def test_the_draft_s_own_names_decide_when_the_wording_is_neutral_and_that_is_the_reported_rung():
    header = pills(EYE_HEADER, 'data-cta="see-all"', 'data-cta="write-review"', texts=("Open", "Open"))
    out, row = run(eye_draft(header))
    assert "background:#1A73E8" in _tag_with(out, "sgs-google-reviews__see-all-url")
    assert "border:1px solid #DADCE0" in _tag_with(out, "sgs-google-reviews__review-request-url")
    assert {v[1] for v in rungs(row).values()} == {"own names"}


def test_negative_control_without_the_draft_s_names_the_ladder_falls_to_position_and_says_it_is_weak():
    out, row = run(eye_draft(pills(EYE_HEADER, texts=("Open", "Open"))))
    assert {v[1] for v in rungs(row).values()} == {"position"}
    assert "background:#1A73E8" in _tag_with(out, "sgs-google-reviews__review-request-url")   # link 1 takes the attribute declared first
    assert all("weak" in r["evidence"] for r in row["header_link_rungs"])


def test_position_reads_the_order_the_block_declares_it_never_a_name_in_the_code():
    """Negative control for the position rung: declare the two link attributes the other way round and link 1 follows."""
    reversed_scalars = [s for s in NEW_SCALARS if s.name not in ("reviewRequestUrl", "seeAllUrl")] + [NEW_SCALARS[3], NEW_SCALARS[2]]
    out, _row = run(eye_draft(pills(EYE_HEADER, texts=("Open", "Open"))), HdrLookup(scalars=reversed_scalars))
    assert "background:#1A73E8" in _tag_with(out, "sgs-google-reviews__see-all-url")


def test_negative_control_position_is_not_used_when_the_counts_do_not_match_and_every_anchor_is_reported():
    header = pills(EYE_HEADER, texts=("Open one", "Open two"))
    end = header.rindex("</a>") + 4
    header = header[:end] + '<a href="https://x.test/three">Open three</a>' + header[end:]           # a third link, two attributes
    out, row = run(eye_draft(header, reviews=5))            # five cards: three sibling anchors must not read as the declared run
    assert "see-all-url" not in out and "review-request-url" not in out
    skipped = _skipped(row)
    assert len([f for f in skipped if f.startswith("header link")]) == 3                          # rule 4: all three reported
    assert {r["rung"] for r in row["header_link_rungs"]} == {"none"}


def test_an_anchor_with_no_address_is_reported_and_never_classed():
    parts = EYE_HEADER.split(f' href="{URL}"')
    header = parts[0] + f' href="{URL}"' + parts[1] + parts[2]                                   # the second pill loses its href
    out, row = run(eye_draft(header))
    assert "review-request-url" not in out and _skipped(row)["header link 'Write a review'"] == "it has no address to lift"


def test_a_block_with_one_link_attribute_keeps_the_old_single_link_behaviour_exactly():
    one = [s for s in NEW_SCALARS if s.name != "seeAllUrl"]
    out, row = run(eye_draft(), HdrLookup(scalars=one))
    assert "see-all-url" not in out and "header_link_rungs" not in row
    assert 'class="sgs-google-reviews__review-request-url"' in out and "header link 'See all reviews'" in _skipped(row)


# --------------------------------------------------------------------------------------------------------------
# 2. The caption (source label) and the footnote
# --------------------------------------------------------------------------------------------------------------

def test_the_caption_that_is_the_blocks_own_name_is_the_source_label_not_the_business():
    out, row = run(eye_draft())
    tag = _tag_with(out, "sgs-google-reviews__source-label")
    assert "font-size:13px" in tag and "sourceLabel" in row["header_fields"] and "businessName" not in row["header_fields"]
    assert "header text 'Google Reviews'" not in _skipped(row)


def test_negative_control_a_block_with_no_source_label_attribute_still_only_reports_the_caption():
    scalars = [s for s in NEW_SCALARS if s.name != "sourceLabel"]
    out, row = run(eye_draft(), HdrLookup(scalars=scalars))
    assert "source-label" not in out and "these are the block's own name words" in _skipped(row)["header text 'Google Reviews'"]


def test_negative_control_a_caption_that_is_not_the_blocks_name_goes_to_the_business_attribute_not_the_source_label():
    out, row = run(eye_draft(EYE_HEADER.replace("Google Reviews", "Ward End Eye Care")))
    assert "font-size:13px" in _tag_with(out, "sgs-google-reviews__business-name")
    assert "source-label" not in out and "businessName" in row["header_fields"]


def test_the_footnote_is_found_by_structure_so_its_wording_does_not_matter():
    for wording in ("Scroll for more — 13 of the 15 reviews left a comment.", "Zebra quilt marmalade."):
        out, row = run(eye_draft(footer=EYE_FOOTER.replace("Scroll for more — 13 of the 15 reviews left a comment.", wording)))
        assert "font-size:13px" in _tag_with(out, "sgs-google-reviews__footnote") and "footnote" in row["header_fields"], wording
        assert not any("scroll controls" in r for r in _skipped(row).values())


def test_negative_control_the_same_text_before_the_rail_is_not_a_footnote():
    before = '<p style="margin:0">Scroll for more, 13 of the 15 reviews left a comment.</p>'
    footer = re.sub(r"<p[^>]*>.*?</p>", "", EYE_FOOTER, flags=re.S)
    out, row = run(eye_draft(footer=footer, before_rail=before), )
    assert "footnote" not in out and "footnote" not in row.get("header_fields", [])


def test_negative_control_with_two_unassigned_text_attributes_the_footnote_is_not_guessed():
    two = NEW_SCALARS + [ScalarAttr("disclaimer", "text-content", "string", False, ".sgs-google-reviews__disclaimer")]
    out, row = run(eye_draft(), HdrLookup(scalars=two))
    reason = next(r for f, r in _skipped(row).items() if f.startswith("header text 'Scroll for more"))
    assert "footnote" not in out and "the row of the draft's own scroll controls" in reason


def test_negative_control_a_text_attribute_that_does_not_list_its_own_class_is_not_a_footnote_candidate():
    scalars = [s if s.name != "footnote" else ScalarAttr("footnote", "text-content", "string", False, None) for s in NEW_SCALARS]
    out, row = run(eye_draft(), HdrLookup(scalars=scalars))
    assert "footnote" not in out


# --------------------------------------------------------------------------------------------------------------
# 3. Structure: header row, rail, arrows, the source mark
# --------------------------------------------------------------------------------------------------------------

def test_the_structure_the_block_lists_a_class_for_is_classed_by_the_drafts_own_structure():
    out, row = run(eye_draft())
    assert "padding-bottom:22px" in _tag_with(out, "sgs-google-reviews__header")               # the flex row that holds the aggregate
    assert 'class="sgs-google-reviews__rail rev-rail"' in out                                  # the parent of the review cards
    assert out.count('class="sgs-google-reviews__arrow"') == 2                                 # both round buttons
    assert set(structure(row)) == {"header", "rail", "arrow", "google-logo"}
    assert all(s["recognised"] == "yes" for s in structure(row).values())
    assert "{{ revPrev }}" in structure(row)["arrow"]["signal"]                                # the draft's own handler is the evidence


def test_the_source_mark_keeps_its_decorative_attributes_and_the_per_card_mark_is_never_touched():
    out, _row = run(eye_draft())
    tag = _tag_with(out, "sgs-google-reviews__google-logo")
    assert tag == '<img class="sgs-google-reviews__google-logo" src="assets/google-g.svg" alt="" aria-hidden="true" width="30" height="30" style="display:block">'
    assert out.count("sgs-google-reviews__google-logo") == 1
    assert out.count('<img src="assets/google-g.svg" alt="" aria-hidden="true" width="17" height="17">') == 3


def test_negative_control_two_decorative_marks_in_the_header_are_not_guessed_and_are_reported():
    header = EYE_HEADER.replace('<div style="display:flex;align-items:center;gap:16px">',
                                '<div style="display:flex;align-items:center;gap:16px"><img src="a.svg" alt="" aria-hidden="true" width="9" height="9">', 1)
    out, row = run(eye_draft(header))
    assert "sgs-google-reviews__google-logo" not in out
    assert structure(row)["google-logo"]["recognised"] == "no" and "2 decorative images" in structure(row)["google-logo"]["signal"]


def test_negative_control_a_header_image_with_alt_text_is_content_not_the_source_mark():
    header = EYE_HEADER.replace('alt="" aria-hidden="true" width="30"', 'alt="Google" width="30"', 1)
    out, row = run(eye_draft(header))
    assert "sgs-google-reviews__google-logo" not in out
    assert row["status"] == "rejected"                                                        # a content image the block has no field for withholds the section


def test_negative_control_a_toggle_class_and_another_mark_are_not_the_arrow_and_the_logo():
    """`show-arrows` (a toggle) names 'arrow' too and `card-logo` names 'logo': only the exact element is taken."""
    only_decoys = frozenset(c for c in LISTED if c.split("__")[1] in ("show-arrows", "card-logo", "arrow-colour"))
    out, row = run(eye_draft(), HdrLookup(classes=only_decoys))
    assert not any(c in out for c in only_decoys) and "header_structure" not in row


def test_negative_control_a_lookup_that_lists_no_classes_classes_no_structure():
    out, row = run(eye_draft(), RevLookup(scalars=NEW_SCALARS, elements=NEW_ELEMENTS))
    assert "header_structure" not in row
    for element in ("header", "rail", "arrow", "google-logo"):
        assert "sgs-google-reviews__" + element not in out


@pytest.mark.parametrize("classes, word, expected", [
    ({"sgs-x-y__header", "sgs-x-y__aggregate"}, "header", "header"),
    ({"sgs-x-y__show-arrows", "sgs-x-y__arrow"}, "arrow", "arrow"),
    ({"sgs-x-y__x-logo", "sgs-x-y__card-logo"}, "logo", "x-logo"),        # 'x' is a word of the block's name 'x-y'; 'card' is not
    ({"sgs-x-y__x-logo", "sgs-x-y__y-logo"}, "logo", None),               # two of the block's own marks: not certain
    ({"sgs-x-y__rail-padding"}, "rail", None),
    (set(), "rail", None),
])
def test_declared_element_names_one_element_or_none(classes, word, expected):
    assert ma._declared_element(frozenset(classes), "sgs-x-y__", word, {"x", "y"}) == expected


# --------------------------------------------------------------------------------------------------------------
# 4. Inert without the new facts; idempotent
# --------------------------------------------------------------------------------------------------------------

def test_the_annotation_is_deterministic_and_a_second_pass_changes_nothing():
    html = eye_draft()
    once, rows = annotate_from_manifest(html, HdrLookup())
    twice, again = annotate_from_manifest(once, HdrLookup())
    assert once != html and twice == once


def test_a_draft_with_no_manifest_comes_back_byte_identical():
    html = eye_draft().split("<script type", 1)[0] + "</body></html>"
    assert annotate_from_manifest(html, HdrLookup()) == (ma.strip_field_markers(html), [])


@pytest.mark.skipif(not DbBlockLookup.DEFAULT_DB.exists(), reason="needs the framework database")
def test_the_real_mamas_drafts_come_back_byte_identical():
    """Mama's has no manifest: the stage must not touch it (only the resolver's own markers are stripped, and it has none)."""
    repo = HERE.parents[3]
    lookup = DbBlockLookup()
    try:
        drafts = sorted((repo / "sites/mamas-munches/mockups").rglob("*.html"))
        assert drafts
        for path in drafts:
            raw = path.read_text(encoding="utf-8", newline="")
            assert annotate_from_manifest(raw, lookup) == (ma.strip_field_markers(raw), []), path.name
    finally:
        lookup.close()


# --------------------------------------------------------------------------------------------------------------
# 5. The REAL Eye Care run, a database copy carrying the redesigned block's contract, the UNCHANGED converter
# --------------------------------------------------------------------------------------------------------------

CONTRACT = [   # (attr, type, role, derived_selector): what the redesign lists for each class this change puts on the draft
    ("seeAllUrl", "string", "link-href", SEE_ALL_SEL), ("seeAllLabel", "string", "text-content", SEE_ALL_SEL),
    ("writeReviewLabel", "string", "text-content", WRITE_SEL), ("sourceLabel", "string", "text-content", ".sgs-google-reviews__source-label"),
    ("footnote", "string", "text-content", ".sgs-google-reviews__footnote"),
    ("headerGap", "object", None, ".sgs-google-reviews__aggregate, .sgs-google-reviews__header"),
    ("railPadding", "object", None, ".sgs-google-reviews__list, .sgs-google-reviews__rail"),
    ("arrowSize", "string", None, ".sgs-google-reviews__arrow"), ("logoSize", "string", None, ".sgs-google-reviews__google-logo"),
    ("cardLogoSize", "string", None, ".sgs-google-reviews__card-logo"), ("showArrows", "boolean", None, ".sgs-google-reviews__show-arrows"),
]


@pytest.fixture(scope="module")
def contract_db(tmp_path_factory):
    dest = tmp_path_factory.mktemp("contract") / "with-contract.db"
    source = sqlite3.connect(f"file:{DbBlockLookup.DEFAULT_DB.as_posix()}?mode=ro", uri=True)
    target = sqlite3.connect(str(dest))
    source.backup(target)
    source.close()
    target.execute("UPDATE array_item_schema SET role = 'colour-background' WHERE block_slug = 'sgs/google-reviews' AND field_key = 'avatarColour'")
    for attr, role in (("averageRating", "numeric-content"), ("reviewCount", "numeric-content"), ("reviewRequestUrl", "link-href")):
        target.execute("UPDATE block_attributes SET role = ? WHERE block_slug = 'sgs/google-reviews' AND attr_name = ?", (role, attr))
    for attr, kind, role, selector in CONTRACT:
        target.execute("DELETE FROM block_attributes WHERE block_slug = 'sgs/google-reviews' AND attr_name = ?", (attr,))
        target.execute("INSERT INTO block_attributes (block_slug, attr_name, attr_type, role, derived_selector, source) "
                       "VALUES ('sgs/google-reviews', ?, ?, ?, ?, 'sgs')", (attr, kind, role, selector))
    target.commit()
    target.close()
    return dest


@pytest.fixture(scope="module")
def eye_care(contract_db):
    raw = (RUN_NEW / "site-info-resolved.html").read_text(encoding="utf-8", newline="")
    lookup = DbBlockLookup(db_path=contract_db)
    try:
        out, rows = annotate_from_manifest(raw, lookup)
    finally:
        lookup.close()
    return {"raw": raw, "out": out, "row": next(r for r in rows if r["block"] == "sgs/google-reviews")}


real_run = pytest.mark.skipif(not (RUN_NEW / "site-info-resolved.html").exists() or not DbBlockLookup.DEFAULT_DB.exists(),
                              reason="needs the local Eye Care run in pipeline-state and the framework database")


@real_run
def test_eye_care_every_new_class_lands_on_the_right_element_of_the_real_draft(eye_care):
    out, row = eye_care["out"], eye_care["row"]
    assert re.search(r'<div class="sgs-google-reviews__source-label"[^>]*>Google Reviews</div>', out)
    assert re.search(r'<a class="sgs-google-reviews__see-all-url" href="[^"]+"[^>]*background:#1A73E8[^>]*>See all reviews</a>', out)
    assert re.search(r'<a class="sgs-google-reviews__review-request-url" href="[^"]+"[^>]*>Write a review</a>', out)
    assert re.search(r'<p class="sgs-google-reviews__footnote"[^>]*>Scroll for more', out)
    # the arrows and the logo may ALSO carry a layout modifier (`__arrow--below-end`, `__google-logo--leading`) when the database's
    # default differs from the draft (design 2026-09-23 section 4, manifest_layout_choices); count the elements, not the strings
    assert 'class="sgs-google-reviews__rail rev-rail"' in out
    assert len(re.findall(r'class="sgs-google-reviews__arrow(?: sgs-google-reviews__arrow--[a-z-]+)?"', out)) == 2
    assert len(re.findall(r'class="sgs-google-reviews__google-logo(?: sgs-google-reviews__google-logo--[a-z-]+)?"', out)) == 1
    assert "sgs-google-reviews__header" in re.search(r'<div class="[^"]*"[^>]*justify-content:space-between[^>]*padding-bottom:22px', out).group(0)
    assert rungs(row) == {"See all reviews": ("seeAllUrl", "link text"), "Write a review": ("reviewRequestUrl", "link text")}
    assert set(structure(row)) == {"header", "rail", "arrow", "google-logo"} and row["status"] == "applied"


@real_run
def test_eye_care_the_new_classes_add_no_child_block_in_the_unchanged_converter_and_the_mark_is_never_a_photo(eye_care):
    """`arrow` is an alias of the `items` slot and `logo` of a slot with a standalone block: prove the annotated classes do not
    make the walker emit a child block for them (the block multiset equals the one with the new classes removed)."""
    def blocks(page):
        return sorted(re.findall(r"<!-- wp:(sgs/[a-z-]+)", _convert(page, "sgs-google-reviews")))
    stripped = eye_care["out"]
    for element in ("header", "rail", "arrow", "google-logo", "source-label", "footnote", "see-all-url"):
        cls = "sgs-google-reviews__" + element
        stripped = stripped.replace(f' class="{cls}"', "").replace(cls + " ", "")
    assert blocks(eye_care["out"]) == blocks(stripped) and "wp:sgs/google-reviews" in _convert(eye_care["out"], "sgs-google-reviews")
    block = _google_reviews_block(_convert(eye_care["out"], "sgs-google-reviews"))
    assert len(block["reviews"]) == 13 and all(not r.get("photo") for r in block["reviews"])
    assert "google-g" not in _convert(eye_care["out"], "sgs-google-reviews")


@real_run
def test_eye_care_only_classes_were_added_to_the_draft(eye_care):
    section = lambda page: re.search(r'<section class="sgs-google-reviews".*?</section>', page, re.S).group(0)  # noqa: E731
    undone = section(eye_care["out"])
    for cls in re.findall(r"sgs-google-reviews__[a-z-]+", undone):
        undone = undone.replace(f' class="{cls}"', "").replace(cls + " ", "")
    undone = undone.replace('<div class="sgs-google-reviews" data-reveal="1"', '<div data-reveal="1"')
    # the layout carriers (design 2026-09-23 section 4): a `data-sgs-<attr>` marker on the block root for each written choice
    written = [e for e in eye_care["row"].get("layout_choices", []) if e["written"] and "on the block root" in e["evidence"]]
    for entry in written:
        undone = undone.replace(f' data-sgs-{ma._kebab(entry["attribute"])}="{str(entry["value"]).lower()}"', "", 1)
    assert undone == ma.strip_field_markers(section(eye_care["raw"]))


@real_run
def test_eye_care_negative_control_the_database_before_the_redesign_classes_none_of_it(tmp_path):
    """The database as it was before the redesign lists none of these classes and has one link attribute: the stage is inert
    for the redesign (only the older header ladder acts)."""
    dest = tmp_path / "before.db"
    source = sqlite3.connect(f"file:{DbBlockLookup.DEFAULT_DB.as_posix()}?mode=ro", uri=True)
    target = sqlite3.connect(str(dest))
    source.backup(target)
    source.close()
    target.execute("DELETE FROM block_attributes WHERE block_slug = 'sgs/google-reviews' AND (derived_selector LIKE '%see-all%' OR "
                   "derived_selector LIKE '%__header%' OR derived_selector LIKE '%__rail%' OR derived_selector LIKE '%__arrow%' OR "
                   "derived_selector LIKE '%google-logo%' OR derived_selector LIKE '%source-label%' OR derived_selector LIKE '%footnote%')")
    target.commit()
    target.close()
    lookup = DbBlockLookup(db_path=dest)
    try:
        out, rows = annotate_from_manifest((RUN_NEW / "site-info-resolved.html").read_text(encoding="utf-8", newline=""), lookup)
    finally:
        lookup.close()
    row = next(r for r in rows if r["block"] == "sgs/google-reviews")
    assert "header_structure" not in row and "header_link_rungs" not in row
    for element in ("see-all-url", "source-label", "footnote", "header", "rail", "arrow", "google-logo"):
        assert "sgs-google-reviews__" + element + '"' not in out and "sgs-google-reviews__" + element + " " not in out
