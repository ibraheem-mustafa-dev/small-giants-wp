"""manifest_annotation: the box owner climb, the header field ladder, the per-review rating and the avatar colour
(Spec 31 FR-31-31 rules 8 to 10).

Two kinds of test, every guard with a NEGATIVE CONTROL (the guard is removed or the input is planted so the rule
would misfire, and the result must change):

* synthetic drafts + an injected lookup (`RevLookup`, the shape of the real block's facts: item schema with a
  `rating` and a `colour-background` field, scalar attributes with their DB roles, the element slots it styles);
* the REAL Eye Care run artefact and draft, the REAL framework database (a COPY with the review roles applied, so
  the tests do not depend on which seed the live DB holds), and the UNCHANGED converter.

Run from plugins/sgs-blocks/scripts:
  python -m pytest orchestrator/test_manifest_box_header.py -q -p no:cacheprovider
"""
import json
import re
import shutil
import sqlite3
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
sys.path.insert(0, str(HERE))

import manifest_annotation as ma  # noqa: E402
from manifest_annotation import (  # noqa: E402
    ArraySchema,
    DbBlockLookup,
    ItemField,
    ScalarAttr,
    annotate_from_manifest,
)

REPO = HERE.parents[3]
RUN = REPO / "pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-21-134838"
RUN_COPY = RUN / "site-info-resolved.html"
V2 = REPO / "sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2"
needs_run = pytest.mark.skipif(not RUN_COPY.exists(), reason="needs the local Eye Care run in pipeline-state")
needs_db = pytest.mark.skipif(not DbBlockLookup.DEFAULT_DB.exists(), reason="needs the framework database")
needs_draft = pytest.mark.skipif(shutil.which("node") is None or not (V2 / "Eye Care Birmingham.dc.html").exists(),
                                 reason="needs node and the Eye Care v2 bundle")

# --------------------------------------------------------------------------------------------------------------
# A lookup with the facts of a reviews block, and a draft builder
# --------------------------------------------------------------------------------------------------------------

IDENTITY = frozenset({"border-width", "border-style", "border-color", "border-radius", "background-color", "background-image"})
STAR_SLOTS = {"stars": {"rating"}, "rating": {"rating"}, "author": {"attribution", "text"}, "who": {"attribution"},
              "text": {"text"}, "date": {"date"}, "meta": {"meta"}, "name": {"heading"}}
SCALARS = [ScalarAttr("averageRating", "numeric-content", "number"), ScalarAttr("reviewCount", "numeric-content", "number"),
           ScalarAttr("reviewRequestUrl", "link-href", "string", True),
           # the LIVE shape of businessName: role text-content (not identity) with the element class it is lifted from
           ScalarAttr("businessName", "text-content", "string", False, ".sgs-google-reviews__business-name")]
ELEMENTS = frozenset({"star", "arrow", "write-review", "wrapper", "inner"})


def _reviews_schema(rating: bool = True, colour: bool = True) -> ArraySchema:
    fields = [ItemField("author", "text-content", True), ItemField("text", "text-content", True),
              ItemField("date", "text-content", True), ItemField("meta", "text-content", True)]
    if rating:
        fields.append(ItemField("rating", "rating", False))
    if colour:
        fields.append(ItemField("avatarColour", "colour-background", False))
    return ArraySchema("reviews", tuple(fields))


class RevLookup:
    """`sgs/google-reviews`: a block that cannot claim a section root (tier `block`), with an item schema, scalar attributes,
    element slots and box properties, as the real reviews block has them."""

    def __init__(self, identity=IDENTITY, scalars=SCALARS, elements=ELEMENTS, rating=True, colour=True):
        self._identity, self._scalars, self._elements = identity, scalars, elements
        self._schema = _reviews_schema(rating, colour)

    def canonical_slug(self, name):
        slug = name if "/" in name else f"sgs/{name}"
        return slug if slug in ("sgs/google-reviews", "sgs/other-block") else None

    def is_class_section(self, slug):
        return False

    def array_schemas(self, slug):
        return [self._schema]

    def slots_of(self, term):
        return frozenset(STAR_SLOTS.get(term, set()))

    def is_broad_slot(self, slot):
        return slot == "text"

    def identity_properties(self, slug):
        return self._identity

    def scalar_attrs(self, slug):
        return list(self._scalars)

    def element_names(self, slug):
        return self._elements


class OldLookup:
    """The block through a lookup that has only the three required methods: no box properties, scalars or elements."""

    def __init__(self):
        self._rev = RevLookup()

    def canonical_slug(self, name):
        return self._rev.canonical_slug(name)

    def is_class_section(self, slug):
        return False

    def array_schemas(self, slug):
        return self._rev.array_schemas(slug)

    def slots_of(self, term):                       # the synonym rung is older than the box rung and every lookup has it
        return self._rev.slots_of(term)

    def is_broad_slot(self, slot):
        return self._rev.is_broad_slot(slot)


class BoxOnlyLookup(OldLookup):
    """Knows the block's box properties but has no scalar attributes or element slots to map a header onto."""

    def identity_properties(self, slug):
        return IDENTITY


HEADER = (
    '<div style="display:flex;gap:22px">'
    '<img src="assets/google-g.svg" alt="" aria-hidden="true" width="30" height="30">'
    '<div>'
    '<div style="font-size:13px">Google Reviews</div>'
    '<span style="font-size:32px">4.7</span>'
    '<span style="position:relative" aria-label="4.7 out of 5">★★★★★'
    '<span style="position:absolute;width:94%">★★★★★</span></span>'
    '<span style="font-size:13.5px">15 reviews</span>'
    '</div>'
    '<div><a href="https://x.test/r" style="background:#1A73E8">See all reviews</a>'
    '<a href="https://x.test/r" style="border:1px solid #DADCE0">Write a review</a></div>'
    '</div>'
)
CONTROLS = ('<div style="display:flex"><p>Scroll for more, 13 of the 15 reviews left a comment.</p>'
            '<div><button aria-label="Previous"><svg><path d="M1"/></svg></button>'
            '<button aria-label="Next"><svg><path d="M2"/></svg></button></div></div>')
CARD_STYLE = "border:1px solid #DADCE0;border-radius:12px;background:#fff;padding:20px"


def _review(i: int, colour: str = "#1A73E8", stars: str = "★★★★★", marked: bool = True) -> str:
    m = (lambda f: f' data-src-field="{f}"') if marked else (lambda f: "")
    return (f'<figure><span{m("initial")} data-src-field-style="colour:background" style="width:40px;background: {colour}">N</span>'
            f'<b{m("who")}>Name {i}</b><i{m("meta")}>{i} reviews</i>'
            f'<span style="color:#FBBC04">{stars}</span><u{m("date")}>May {i}</u><p{m("text")}>Words {i}</p></figure>')


def rev_draft(header: str = HEADER, controls: str = CONTROLS, card_style: str = CARD_STYLE, wrapper_style: str = "position:relative;padding-top:22px",
              reviews: int = 3, section_style: str = "", group_extra: dict | None = None, style_sheet: str = "", cards: str | None = None,
              outer_style: str = "max-width:1440px;margin:0 auto") -> str:
    cards = cards if cards is not None else "".join(_review(i) for i in range(reviews))
    body = (f'<section class="sgs-revs" style="{section_style}"><div style="{outer_style}"><h2>What people say</h2>'
            f'<div class="card" style="{card_style}">{header}<div style="{wrapper_style}"><div class="rail">{cards}</div></div>{controls}</div>'
            "</div></section>")
    manifest = json.dumps({"sectionBlocks": {"sgs-revs": {"suggestedBlock": "google-reviews", "confidence": "high"}},
                           "repeatedGroups": [{"section": "sgs-revs", "count": reviews, **(group_extra or {})}]})
    sheet = f"<style>{style_sheet}</style>" if style_sheet else ""
    return (f'<!doctype html><html><head>{sheet}</head><body>{body}\n<script type="application/json" data-sgs-manifest>{manifest}'
            "</script></body></html>")


def run(html: str, lookup=None, **kwargs):
    out, rows = annotate_from_manifest(html, lookup or RevLookup(), **kwargs)
    return out, rows[0]


def _tag_with(out: str, cls: str) -> str:
    """The opening tag of the first element whose class list contains `cls`."""
    return re.search(r'<[a-z0-9]+\b[^>]*\bclass="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>', out).group(0)


def _skipped(row: dict) -> dict[str, str]:
    return {s["field"]: s["reason"] for s in row.get("skipped_fields", [])}


# --------------------------------------------------------------------------------------------------------------
# 1. The box owner climb
# --------------------------------------------------------------------------------------------------------------

def test_the_block_root_climbs_from_the_rail_past_a_layout_only_wrapper_to_the_bordered_card():
    out, row = run(rev_draft())
    tag = _tag_with(out, "sgs-google-reviews")
    assert 'style="' + CARD_STYLE in tag and 'class="sgs-google-reviews card"' in tag          # block root FIRST, draft class kept
    assert '<div class="rail">' in out and "sgs-google-reviews" not in _tag_with(out, "rail")   # the rail is not the block
    assert row["status"] == "applied" and row["target"] == "ancestor" and row["climbed"] == 2 and row["items"] == 3


def test_layout_and_inherited_properties_do_not_count_as_a_box():
    """position, padding, margin, display, gap, width, max-width, overflow, opacity and colour on the wrapper: still a
    layout wrapper, so the climb goes on to the card."""
    wrapper = "position:relative;padding:22px 0 0;margin:0;display:block;gap:4px;width:100%;max-width:900px;overflow:hidden;opacity:.9;color:#333"
    out, row = run(rev_draft(wrapper_style=wrapper))
    assert 'class="sgs-google-reviews card"' in _tag_with(out, "sgs-google-reviews") and row["climbed"] == 2


def test_negative_control_the_same_wrapper_with_a_border_IS_the_box_and_the_nearest_owner_wins():
    """Two ancestors qualify (the wrapper and the card): the FIRST one from the rail outward wins."""
    out, row = run(rev_draft(wrapper_style="position:relative;border:1px solid #ccc"), keep_unmapped_text=True)
    assert 'style="position:relative;border:1px solid #ccc"' in _tag_with(out, "sgs-google-reviews")
    assert row["climbed"] == 1 and row["target"] == "ancestor"
    # the header now sits OUTSIDE that box: by default the declaration is withheld rather than losing the header
    _, withheld = run(rev_draft(wrapper_style="position:relative;border:1px solid #ccc"))
    assert withheld["status"] == "rejected" and "outside the block root" in withheld["reason"]


def test_the_repeating_parent_itself_is_the_owner_when_it_paints_the_box():
    out, row = run(rev_draft().replace('<div class="rail">', '<div class="rail" style="background:#f7f7f7">'), keep_unmapped_text=True)
    assert 'class="sgs-google-reviews rail"' in out and row["climbed"] == 0 and row["target"] == "inner"


def test_no_qualifying_ancestor_keeps_the_block_on_the_repeating_parent_and_reports_climbed_zero():
    """Only the section ROOT has a border, and the climb is strictly inside it: nothing qualifies."""
    html = rev_draft(card_style="padding:20px", section_style="border:1px solid #ccc;background:#fff")
    out, row = run(html, keep_unmapped_text=True)
    assert 'class="sgs-google-reviews rail"' in out and row["climbed"] == 0 and row["target"] == "inner"
    assert "no element between the repeated items and the section root paints" in row["reason"]
    assert any("sits outside the block root" in r for r in _skipped(row).values())        # the safety net names what it left
    _, withheld = run(html)                                                                # ...and by default the header is not lost
    assert withheld["status"] == "rejected" and "outside the block root" in withheld["reason"]


def test_negative_control_the_section_root_is_never_the_box_owner():
    """Same draft, but the card's box comes back: the card, not the section root, still wins."""
    out, row = run(rev_draft(section_style="border:1px solid #ccc"))
    assert row["climbed"] == 2 and "sgs-google-reviews" not in _tag_with(out, "sgs-revs")


@pytest.mark.parametrize("prop, painted", [
    ("border", True), ("border-top", True), ("border-top-color", True), ("border-left-width", True), ("border-radius", True),
    ("border-top-left-radius", True), ("border-color", True), ("background", True), ("background-color", True),
    ("background-image", True), ("border-style", True),
    ("background-position", False), ("border-collapse", False), ("padding", False), ("position", False),
    ("box-sizing", False), ("margin", False), ("overflow", False), ("color", False), ("width", False), ("gap", False),
])
def test_identity_property_matching_covers_shorthands_and_side_longhands_and_nothing_else(prop, painted):
    assert bool(ma._paints_identity({prop: "1px solid #ccc"}, IDENTITY)) is painted


@pytest.mark.parametrize("value", ["none", "0", "0px", "transparent", "0 none", "initial"])
def test_a_value_that_paints_nothing_is_not_a_box(value):
    assert ma._paints_identity({"border": value, "background": value}, IDENTITY) == []


def test_a_box_property_the_block_does_not_declare_is_not_identity():
    """Negative control for `identity_properties`: the card paints only a box-shadow, which this block does not have."""
    out, row = run(rev_draft(card_style="box-shadow:0 1px 3px #ccc;padding:20px"), keep_unmapped_text=True)
    assert row["climbed"] == 0 and 'class="sgs-google-reviews rail"' in out
    out, row = run(rev_draft(card_style="box-shadow:0 1px 3px #ccc;padding:20px"), RevLookup(identity=IDENTITY | {"box-shadow"}))
    assert row["climbed"] == 2                                            # ...and does count for a block that declares one


def test_a_single_class_rule_in_a_style_block_can_make_the_card_the_owner():
    sheet = ".card{border:1px solid #DADCE0;border-radius:12px}"
    out, row = run(rev_draft(card_style="padding:20px", style_sheet=sheet))
    assert row["climbed"] == 2 and 'class="sgs-google-reviews card"' in out


@pytest.mark.parametrize("sheet", [
    "@media (min-width:600px){.card{border:1px solid #ccc}}",         # conditional
    "section .card{border:1px solid #ccc}",                          # descendant selector
    ".card:hover{border:1px solid #ccc}",                            # pseudo
    ".card.wide{border:1px solid #ccc}",                             # compound
    ".other{border:1px solid #ccc}",                                 # another element's rule
])
def test_negative_control_a_conditional_descendant_pseudo_or_compound_rule_is_not_read(sheet):
    out, row = run(rev_draft(card_style="padding:20px", style_sheet=sheet), keep_unmapped_text=True)
    assert row["climbed"] == 0 and row["target"] == "inner"


def test_the_climb_stops_at_another_built_blocks_root_and_at_another_declared_section():
    html = rev_draft().replace('<div class="card"', '<div class="sgs-other-block card"')
    out, row = run(html, keep_unmapped_text=True)
    assert row["climbed"] == 0 and row["target"] == "inner" and "sgs-google-reviews" in _tag_with(out, "rail")
    two = rev_draft().replace('<div class="card"', '<div class="sgs-elsewhere card"').replace(
        '{"sectionBlocks": {"sgs-revs"', '{"sectionBlocks": {"sgs-elsewhere": {"suggestedBlock": "google-reviews"}, "sgs-revs"')
    out, rows = annotate_from_manifest(two, RevLookup(), keep_unmapped_text=True)
    assert rows[1]["climbed"] == 0


def test_a_lookup_that_knows_no_box_properties_keeps_todays_behaviour_exactly():
    out, row = run(rev_draft(), OldLookup())
    assert row["climbed"] == 0 and row["target"] == "inner" and 'class="sgs-google-reviews rail"' in out


def test_the_climbed_annotation_is_deterministic_and_a_second_pass_over_its_output_changes_nothing():
    html = rev_draft()
    once, row = run(html)
    assert run(html) == (once, row)                          # same input, same output and row
    twice, _ = annotate_from_manifest(once, RevLookup())     # the markers are gone from `once`: the block is not re-annotated
    assert twice == once


# --------------------------------------------------------------------------------------------------------------
# 2. The header field ladder
# --------------------------------------------------------------------------------------------------------------

def test_the_header_is_mapped_by_role_and_shape_and_every_other_unit_is_reported():
    out, row = run(rev_draft())
    assert row["status"] == "applied" and row["header_fields"] == ["reviewRequestUrl", "averageRating", "reviewCount"]
    assert 'class="sgs-google-reviews__average-rating" style="font-size:32px">4.7' in out
    assert 'class="sgs-google-reviews__review-count" style="font-size:13.5px">15 reviews' in out
    assert re.search(r'<a class="sgs-google-reviews__review-request-url" href="https://x.test/r" style="border:1px solid #DADCE0">Write a review', out)
    skipped = _skipped(row)
    assert "no block attribute for a second link" in skipped["header link 'See all reviews'"]
    assert "draws its own stars" in next(r for f, r in skipped.items() if f.startswith("header star bar"))
    assert "block's own name words" in skipped["header text 'Google Reviews'"]
    assert "decorative image" in skipped["header image 'google-g.svg'"]
    assert "scroll controls" in next(r for f, r in skipped.items() if f.startswith("header text 'Scroll for more"))
    assert "previous / next arrows" in skipped["header button 'Previous'"] and "header button 'Next'" in skipped


def test_no_silent_drop_every_header_text_is_mapped_or_reported():
    """Every text unit of the header appears in the output classed, or in `skipped_fields`: nothing just vanishes."""
    out, row = run(rev_draft())
    reported = " | ".join(_skipped(row))
    for text, classed in (("4.7", "average-rating"), ("15 reviews", "review-count"), ("Write a review", "review-request-url"),
                          ("See all reviews", None), ("Google Reviews", None), ("Scroll for more", None)):
        assert (f"__{classed}" in _tag_with(out, f"sgs-google-reviews__{classed}") if classed else text in reported), text


def test_the_climbed_header_does_not_leak_into_the_items_or_the_rating_field():
    """The header's overlaid star bar is NOT an item rating: no header element carries the rating class."""
    out, _ = run(rev_draft())
    header = out.split('<div style="position:relative;padding-top:22px">')[0]
    assert "sgs-google-reviews__rating" not in header


def test_two_different_header_addresses_are_never_guessed_into_one_link_attribute():
    header = HEADER.replace('<a href="https://x.test/r" style="border', '<a href="https://x.test/other" style="border')
    out, row = run(rev_draft(header=header))
    assert "review-request-url" not in out and "reviewRequestUrl" not in row.get("header_fields", [])
    assert all("different addresses" in r for f, r in _skipped(row).items() if f.startswith("header link"))
    assert row["status"] == "applied"                       # the link text is a verdict, not unexplained content


def test_two_links_with_one_address_and_no_word_tying_either_to_the_attribute_are_reported_not_guessed():
    """Two anchors, one address, both score 0: nothing says which is the block's link, so neither is claimed."""
    header = HEADER.replace("See all reviews", "Read more").replace("Write a review", "See all")
    out, row = run(rev_draft(header=header))
    assert "review-request-url" not in out and "reviewRequestUrl" not in row["header_fields"]
    skipped = _skipped(row)
    assert all("no evidence which link" in skipped[f"header link '{t}'"] for t in ("Read more", "See all"))
    assert row["status"] == "applied"                                  # a reported link is a verdict, not unexplained content


def test_negative_control_a_single_zero_score_link_is_still_the_blocks_link():
    """One anchor and no word tying it to the attribute: it is still the only address, so it is claimed (today's behaviour)."""
    header = HEADER.replace('<a href="https://x.test/r" style="background:#1A73E8">See all reviews</a>', "").replace("Write a review", "Learn more")
    out, row = run(rev_draft(header=header))
    assert 'class="sgs-google-reviews__review-request-url" href="https://x.test/r"' in out and "reviewRequestUrl" in row["header_fields"]


def test_negative_control_without_the_element_vocabulary_the_two_links_tie_and_the_first_wins():
    """The `write-review` element the block styles is what ties 'Write a review' to the request URL. Take it away and
    both anchors score equally (one shared word each), so the FIRST is taken."""
    out, row = run(rev_draft(), RevLookup(elements=frozenset({"star", "arrow"})))
    assert 'class="sgs-google-reviews__review-request-url" href="https://x.test/r" style="background:#1A73E8">See all reviews' in out
    assert "header link 'Write a review'" in _skipped(row)


def test_a_block_with_no_link_attribute_reports_every_header_link():
    scalars = [a for a in SCALARS if not a.link_like]
    out, row = run(rev_draft(), RevLookup(scalars=scalars))
    assert "review-request-url" not in out
    assert all("no link attribute" in r for f, r in _skipped(row).items() if f.startswith("header link"))


def test_a_rating_needs_the_star_bar_beside_it_and_the_same_number_in_its_label():
    """Negative controls: no star bar after the number, and a star bar that names a different rating."""
    plain = HEADER.replace('<span style="position:relative" aria-label="4.7 out of 5">', '<em>x</em><span style="position:relative" aria-label="4.7 out of 5">')
    out, row = run(rev_draft(header=plain))
    assert row["status"] == "rejected" and "'4.7'" in row["reason"] and "average-rating" not in out
    other = HEADER.replace('aria-label="4.7 out of 5"', 'aria-label="3.1 out of 5"').replace("★★★★★<span", "★★<span")
    out, row = run(rev_draft(header=other))
    assert row["status"] == "rejected" and "average-rating" not in out


def test_a_count_needs_a_noun_that_is_a_word_of_the_attribute_name():
    out, row = run(rev_draft(header=HEADER.replace("15 reviews", "15 patients")))
    assert row["status"] == "rejected" and "'15 patients'" in row["reason"] and "review-count" not in out


def test_the_rating_attribute_is_found_through_the_slot_vocabulary_not_a_name():
    """Negative control: with no `stars` term in the slot table the star bar cannot be tied to a rating attribute, so
    the number is unexplained and the declaration is withheld (nothing is guessed)."""
    class NoSlots(RevLookup):
        def slots_of(self, term):
            return frozenset()
    out, row = run(rev_draft(), NoSlots())
    assert row["status"] == "rejected" and "'4.7'" in row["reason"]


def test_unexplained_header_text_withholds_the_section_with_its_reason_and_keep_unmapped_text_applies_it_partially():
    header = HEADER + "<p>Trusted by patients since 1998</p>"
    html = rev_draft(header=header)
    out, row = run(html)
    assert row["status"] == "rejected" and "Trusted by patients" in row["reason"] and "withheld" in row["reason"]
    assert out == ma.strip_field_markers(html)
    kept, row = run(html, keep_unmapped_text=True)
    assert row["status"] == "partial" and "Trusted by patients" in row["reason"] and "sgs-google-reviews" in kept


def test_a_caption_that_is_not_the_blocks_own_name_maps_to_the_identity_attribute():
    out, row = run(rev_draft(header=HEADER.replace("Google Reviews", "Ward End Eye Care")))
    assert 'class="sgs-google-reviews__business-name"' in out and "businessName" in row["header_fields"]


def test_negative_control_the_blocks_own_name_is_never_a_business_name():
    out, row = run(rev_draft())
    assert "business-name" not in out and "businessName" not in row["header_fields"]


def test_a_non_decorative_header_image_the_block_has_no_field_for_withholds_the_section():
    header = HEADER.replace('alt="" aria-hidden="true"', 'alt="Practice front"')
    out, row = run(rev_draft(header=header))
    assert row["status"] == "rejected" and "header image 'google-g.svg'" in row["reason"]


def test_a_lookup_without_scalar_attributes_withholds_rather_than_dropping_the_header():
    out, row = run(rev_draft(), OldLookup())                  # not climbed, so the header is outside the block: unchanged
    assert row["status"] == "applied" and row["climbed"] == 0
    out, row = run(rev_draft(), BoxOnlyLookup())              # climbed: the header is inside the block and has nowhere to go
    assert row["status"] == "rejected" and "withheld" in row["reason"] and "'4.7'" in row["reason"]


# --------------------------------------------------------------------------------------------------------------
# 3. The per-review rating
# --------------------------------------------------------------------------------------------------------------

def test_each_cards_star_row_becomes_the_rating_field_and_the_header_star_bar_does_not():
    out, row = run(rev_draft(reviews=4))
    assert out.count('class="sgs-google-reviews__rating"') == 4 and "rating" in row["fields"]
    assert all('style="color:#FBBC04">★★★★★' in tag for tag in re.findall(r'<span class="sgs-google-reviews__rating"[^>]*>[^<]*', out))


def test_negative_control_a_schema_with_no_rating_field_leaves_the_star_row_as_furniture():
    out, row = run(rev_draft(reviews=3), RevLookup(rating=False))
    assert "sgs-google-reviews__rating" not in out and "rating" not in row["fields"]
    assert any("furniture" in reason for field, reason in _skipped(row).items() if "★" in field)


def test_only_the_first_glyph_row_of_a_card_is_the_rating():
    cards = "".join(_review(i).replace("</figure>", '<em>★★★</em></figure>') for i in range(3))
    out, row = run(rev_draft(cards=cards))
    assert out.count('class="sgs-google-reviews__rating"') == 3


def test_a_conditional_or_non_glyph_row_is_not_a_rating():
    cards = "".join(_review(i, stars="4 stars") for i in range(3))
    out, _ = run(rev_draft(cards=cards))
    assert "sgs-google-reviews__rating" not in out


# --------------------------------------------------------------------------------------------------------------
# 4. The avatar colour
# --------------------------------------------------------------------------------------------------------------

def test_a_style_bound_background_colour_maps_to_the_colour_background_item_field_and_is_classed():
    cards = "".join(_review(i, colour=c) for i, c in enumerate(("#1A73E8", "#E8710A", "#34A853")))
    out, row = run(rev_draft(cards=cards))
    assert out.count("sgs-google-reviews__avatar-colour") == 3 and "avatarColour" in row["fields"]
    assert re.findall(r'class="sgs-google-reviews__avatar-colour"[^>]*style="[^"]*background: (#\w+)', out) == ["#1A73E8", "#E8710A", "#34A853"]
    assert "data-src-field" not in out                                            # the marker never leaves the annotator


def test_negative_control_a_schema_with_no_colour_field_reports_the_style_value_and_lifts_nothing():
    out, row = run(rev_draft(), RevLookup(colour=False))
    assert "avatar-colour" not in out
    assert "no background-colour item field" in _skipped(row)["style value 'colour' (background)"]


def test_negative_control_a_text_colour_is_not_the_backgrounds_colour_field():
    cards = "".join(_review(i).replace('data-src-field-style="colour:background"', 'data-src-field-style="colour:color"') for i in range(3))
    out, row = run(rev_draft(cards=cards))
    assert "avatar-colour" not in out and "background field" not in _skipped(row).get("style value 'colour' (color)", "background field") \
        or "an element's background" in _skipped(row)["style value 'colour' (color)"]


def test_a_field_map_decides_and_null_means_not_lifted():
    cards = "".join(_review(i).replace('colour:background', 'tint:background') for i in range(3))
    out, row = run(rev_draft(cards=cards, group_extra={"fieldMap": {"tint": "avatarColour"}}))
    assert out.count("sgs-google-reviews__avatar-colour") == 3
    out, row = run(rev_draft(cards=cards, group_extra={"fieldMap": {"tint": None}}))
    assert "avatar-colour" not in out and "not lifted" in _skipped(row)["style value 'tint' (background)"]


def test_two_colour_fields_are_told_apart_by_name_and_never_guessed():
    class Two(RevLookup):
        def __init__(self):
            super().__init__()
            self._schema = ArraySchema("reviews", (*self._schema.fields, ItemField("badgeColour", "colour-background", False)))
    cards = "".join(_review(i).replace("colour:background", "badge:background") for i in range(3))
    out, row = run(rev_draft(cards=cards), Two())
    assert out.count("sgs-google-reviews__badge-colour") == 3 and "avatar-colour" not in out
    cards = "".join(_review(i).replace("colour:background", "tint:background") for i in range(3))
    out, row = run(rev_draft(cards=cards), Two())
    assert "avatar-colour" not in out and "badge-colour" not in out
    assert "matches no colour field" in _skipped(row)["style value 'tint' (background)"]
    out, row = run(rev_draft(), Two())                                    # `colour` is a word of BOTH colour fields
    assert "avatar-colour" not in out and "matches more than one colour field" in _skipped(row)["style value 'colour' (background)"]


def test_the_resolver_and_the_annotator_agree_on_the_style_marker_name():
    from js_content_resolver import STYLE_MARKER
    assert STYLE_MARKER == ma._STYLE_MARKER


# --------------------------------------------------------------------------------------------------------------
# 5. Rows and the Spec 44 log
# --------------------------------------------------------------------------------------------------------------

def test_a_row_with_the_new_keys_is_logged_once_per_run_and_the_log_row_is_unchanged(tmp_path):
    import manifest_decisions_log as log
    _, row = run(rev_draft())
    path = tmp_path / "log.jsonl"
    assert log.append_manifest_decisions([row], "eye-care", "run-1", path) == 1
    assert log.append_manifest_decisions([row], "eye-care", "run-1", path) == 0          # idempotent per run label
    logged = json.loads(path.read_text(encoding="utf-8").splitlines()[0])
    assert logged["target"] == "ancestor" and logged["outcome"] == "applied" and logged["fields"] == row["fields"]
    assert log.LOG_PATH != path                                                             # this test never touches the live log


def test_rejected_and_queued_rows_keep_their_exact_key_set():
    _, rejected = run(rev_draft(header=HEADER + "<p>Trusted by patients</p>"))
    assert set(rejected) == {"root_class", "block", "confidence", "status", "reason", "target", "items", "fields"}


# --------------------------------------------------------------------------------------------------------------
# 6. The real Eye Care run, the real database (with the review roles applied), the UNCHANGED converter
# --------------------------------------------------------------------------------------------------------------

def _db_copy(tmp_path_factory) -> Path:
    dest = tmp_path_factory.mktemp("roles") / "with-roles.db"
    source = sqlite3.connect(f"file:{DbBlockLookup.DEFAULT_DB.as_posix()}?mode=ro", uri=True)
    target = sqlite3.connect(str(dest))
    source.backup(target)
    source.close()
    target.execute("UPDATE array_item_schema SET role = 'colour-background' WHERE block_slug = 'sgs/google-reviews' AND field_key = 'avatarColour'")
    for attr, role in (("averageRating", "numeric-content"), ("reviewCount", "numeric-content"), ("reviewRequestUrl", "link-href")):
        target.execute("UPDATE block_attributes SET role = ? WHERE block_slug = 'sgs/google-reviews' AND attr_name = ?", (role, attr))
    target.commit()
    target.close()
    return dest


@pytest.fixture(scope="module")
def roles_db(tmp_path_factory):
    return _db_copy(tmp_path_factory)


@pytest.fixture(scope="module")
def eye_care(roles_db):
    raw = RUN_COPY.read_text(encoding="utf-8", newline="")
    lookup = DbBlockLookup(db_path=roles_db)
    out, rows = annotate_from_manifest(raw, lookup)
    lookup.close()
    return {"raw": raw, "out": out, "rows": {r["root_class"]: r for r in rows}}


def _convert(page: str, cls: str) -> str:
    sys.path.insert(0, str(SCRIPTS))
    from bs4 import BeautifulSoup
    from converter.entry import convert_section
    soup = BeautifulSoup(page, "html.parser")
    css = "\n\n".join(t.get_text() for t in soup.find_all("style"))
    return convert_section(html=str(soup.find(class_=cls)), css=css, media_map={}, boundary_id="b1", section_id="s1")["block_markup"]


def _google_reviews_block(markup: str) -> dict:
    return json.loads(re.search(r"wp:sgs/google-reviews (\{.*?\}) /?-->", markup, re.S).group(1))


@needs_db
@needs_run
def test_eye_care_the_block_root_is_the_bordered_card_that_holds_the_header_and_the_rail(eye_care):
    row, out = eye_care["rows"]["sgs-google-reviews"], eye_care["out"]
    assert row["status"] == "applied" and row["target"] == "ancestor" and row["climbed"] == 2 and row["items"] == 13
    card = re.search(r'<div class="sgs-google-reviews" data-reveal="1" style="border:1px solid #DADCE0;border-radius:12px;background:#fff;[^"]*"[^>]*>', out)   # + layout markers (manifest_layout_choices)
    assert card is not None                                            # the class is on the div that carries the border
    rail = re.search(r'<div class="(?:sgs-google-reviews__rail )?rev-rail"[^>]*>', out).group(0)      # the rail may also carry the block's `__rail` class
    assert not re.search(r'class="[^"]*\bsgs-google-reviews\b(?!__)', rail)                            # never the block ROOT class
    # the section root keeps only the draft's own class (the manifest's root class is the same word as the block class)
    assert {"reviewRequestUrl", "averageRating", "reviewCount"} <= set(row["header_fields"])      # the redesigned block adds more (see test_manifest_reviews_header.py)


@needs_db
@needs_run
def test_eye_care_header_rows_and_every_header_unit_is_accounted_for(eye_care):
    row = eye_care["rows"]["sgs-google-reviews"]
    assert row["fields"] == ["author", "text", "date", "meta", "rating"]
    skipped = _skipped(row)
    for label in ("header image 'google-g.svg'", "header button 'Previous reviews'", "header button 'More reviews'"):
        assert label in skipped, label
    # a unit is either reported skipped (the block has no field) or mapped (the redesigned block has one): never absent
    fields = set(row["header_fields"])
    assert "header link 'See all reviews'" in skipped or "seeAllUrl" in fields
    assert "header text 'Google Reviews'" in skipped or "sourceLabel" in fields
    assert any(f.startswith("header star bar") for f in skipped)
    assert any(f.startswith("header text 'Scroll for more") for f in skipped) or "footnote" in fields
    out = eye_care["out"]
    assert re.search(r'<span class="sgs-google-reviews__average-rating"[^>]*>4\.7</span>', out)
    assert re.search(r'<span class="sgs-google-reviews__review-count"[^>]*>15 reviews</span>', out)
    assert re.search(r'<a class="sgs-google-reviews__review-request-url" href="[^"]+"[^>]*>Write a review</a>', out)


@needs_db
@needs_run
def test_eye_care_every_review_star_row_is_the_rating_class_and_the_converter_lifts_five_for_all_thirteen(eye_care):
    out = eye_care["out"]
    assert out.count('class="sgs-google-reviews__rating"') == 13
    markup = _convert(out, "sgs-google-reviews")
    block = _google_reviews_block(markup)
    assert len(block["reviews"]) == 13 and [r["rating"] for r in block["reviews"]] == [5] * 13


@needs_db
@needs_run
def test_eye_care_the_unchanged_converter_emits_one_google_reviews_block_with_the_thirteen_reviews_and_the_header_is_inside_it(eye_care):
    """Recognition of the descendant card is not subject to the R1 gate: the converter (unchanged) emits the block for
    the card, so the header text no longer falls into generic text blocks."""
    markup = _convert(eye_care["out"], "sgs-google-reviews")
    assert markup.count("wp:sgs/google-reviews ") == 1
    block = _google_reviews_block(markup)
    assert len(block["reviews"]) == 13 and block["reviews"][0]["author"] == "Anonymous M."
    # not stranded as loose text blocks: outside the google-reviews block's own attributes the header text is absent
    # (the redesigned block lifts the caption and the second link's label INTO its attributes, which is the point)
    outside = re.sub(r"<!-- wp:sgs/google-reviews .*?-->", "", markup, flags=re.S)
    for text in ("Google Reviews", "See all reviews", "Scroll for more"):
        assert text not in outside, text
    assert block.get("sourceLabel") == "Google Reviews"
    assert block.get("seeAllLabel") == "See all reviews"
    assert "What people say" in markup                                  # the heading above the card stays its own block
    assert markup.count("wp:sgs/text") <= _convert(eye_care["raw"], "sgs-google-reviews").count("wp:sgs/text") // 2


@needs_db
@needs_run
def test_eye_care_negative_control_the_un_annotated_section_strands_the_header_in_generic_blocks(eye_care):
    markup = _convert(eye_care["raw"], "sgs-google-reviews")
    assert "wp:sgs/google-reviews" not in markup
    for text in ("4.7", "15 reviews", "Write a review", "Scroll for more"):
        assert text in markup


@needs_db
@needs_run
def test_eye_care_annotation_is_deterministic_a_second_pass_changes_nothing_and_only_classes_were_added(eye_care, roles_db):
    lookup = DbBlockLookup(db_path=roles_db)
    try:
        same, rows = annotate_from_manifest(eye_care["raw"], lookup)
        again, _ = annotate_from_manifest(eye_care["out"], lookup)
    finally:
        lookup.close()
    assert same == eye_care["out"] and {r["root_class"]: r for r in rows} == eye_care["rows"]
    assert again == eye_care["out"]
    section = lambda page: re.search(r'<section class="sgs-google-reviews".*?</section>', page, re.S).group(0)  # noqa: E731
    undone = section(eye_care["out"])
    for _ in range(3):                                                  # an element may carry an element class AND its layout modifier
        undone = re.sub(r'(?<=class=")sgs-google-reviews__[a-z-]+ ', "", undone)                # an annotation class first in an existing list
        undone = re.sub(r' class="sgs-google-reviews__[a-z-]+"', "", undone)
    undone = re.sub(r' data-sgs-(?!manifest)[a-z-]+="[^"]*"', "", undone)   # the layout carriers on the block root (manifest_layout_choices)
    undone = undone.replace('<div class="sgs-google-reviews" data-reveal="1"', '<div data-reveal="1"')
    assert undone == ma.strip_field_markers(section(eye_care["raw"]))       # only the annotation classes were added


@needs_db
@needs_draft
def test_eye_care_avatar_colours_are_classed_and_lifted_per_review_from_the_draft_the_real_runtime_rendered(roles_db):
    from js_content_resolver import resolve_js_array_content_with_report
    raw = (V2 / "Eye Care Birmingham.dc.html").read_text(encoding="utf-8")
    html, count, report = resolve_js_array_content_with_report(raw, V2)
    if count == 0:
        pytest.skip("no browser available here: %s" % report)
    assert html.count('data-src-field-style="colour:background"') == 13
    lookup = DbBlockLookup(db_path=roles_db)
    try:
        out, rows = annotate_from_manifest(html, lookup)
    finally:
        lookup.close()
    row = next(r for r in rows if r["root_class"] == "sgs-google-reviews")
    assert row["status"] == "applied" and "avatarColour" in row["fields"]
    assert out.count("sgs-google-reviews__avatar-colour") == 13 and "data-src-field" not in out
    block = _google_reviews_block(_convert(out, "sgs-google-reviews"))
    colours = [r["avatarColour"] for r in block["reviews"]]
    assert len(colours) == 13 and len(set(colours)) > 5 and all(re.fullmatch(r"#[0-9A-Fa-f]{6}", c) for c in colours)


@needs_db
def test_the_real_databases_box_properties_for_the_reviews_block_are_measured_from_its_own_attributes(roles_db):
    lookup = DbBlockLookup(db_path=roles_db)
    try:
        identity = lookup.identity_properties("sgs/google-reviews")
        base = frozenset({"border-width", "border-style", "border-color", "border-radius", "background-color", "background-image"})
        assert base <= identity and all(p.startswith("border-") for p in identity - base)     # a side-specific border (a divider) may be added
        assert not (identity & {"padding", "margin", "gap", "width", "max-width", "position", "display", "overflow", "color", "fill"})
        assert {"star", "arrow", "write-review"} <= lookup.element_names("sgs/google-reviews")
        scalars = {a.name: a for a in lookup.scalar_attrs("sgs/google-reviews")}
        assert scalars["averageRating"].role == "numeric-content" and scalars["reviewRequestUrl"].link_like
        assert not scalars["averageRating"].link_like and "maxReviews" not in scalars
    finally:
        lookup.close()


# --------------------------------------------------------------------------------------------------------------
# 7. Fix wave FX2: what makes a box, what sits outside it, and the header guards
# --------------------------------------------------------------------------------------------------------------

def _live_copy(tmp_path_factory, name: str = "live-copy.db") -> Path:
    """A byte-for-byte COPY of the live framework database (no roles rewritten): tests that must not drift from reality."""
    dest = tmp_path_factory.mktemp("live") / name
    source = sqlite3.connect(f"file:{DbBlockLookup.DEFAULT_DB.as_posix()}?mode=ro", uri=True)
    target = sqlite3.connect(str(dest))
    source.backup(target)
    source.close()
    target.close()
    return dest


@pytest.fixture()
def live_db(tmp_path_factory):
    return _live_copy(tmp_path_factory)


DIVIDER = "position:relative;border-bottom:1px solid #eee"


def test_finding_1_a_wrapper_with_only_a_divider_rule_is_not_the_box_and_the_climb_reaches_the_card():
    """The reviewer's scenario: `border-bottom` on a layout wrapper used to stop the climb (climbed 1, header outside)."""
    out, row = run(rev_draft(wrapper_style=DIVIDER))
    assert row["status"] == "applied" and row["climbed"] == 2 and row["target"] == "ancestor"
    assert row["header_fields"] == ["reviewRequestUrl", "averageRating", "reviewCount"]      # the header is INSIDE the block now
    assert 'class="sgs-google-reviews card"' in _tag_with(out, "sgs-google-reviews")


def test_finding_1_negative_control_with_the_old_rule_the_divider_wrapper_is_the_owner_and_the_safety_net_still_catches_it(monkeypatch):
    """Put the OLD ownership rule back (any painted identity property): the wrapper is the owner again (climbed 1), and
    the second layer alone still refuses to lose the header: the declaration is withheld naming what sits outside."""
    monkeypatch.setattr(ma, "_makes_box", lambda declared, identity: ma._paints_identity(declared, identity))
    _, row = run(rev_draft(wrapper_style=DIVIDER))
    assert row["status"] == "rejected" and "outside the block root" in row["reason"] and "'4.7'" in row["reason"]
    _, kept = run(rev_draft(wrapper_style=DIVIDER), keep_unmapped_text=True)
    assert kept["status"] == "partial" and kept["climbed"] == 1
    assert any(f.startswith("header text 'Google Reviews'") and "sits outside the block root" in r for f, r in _skipped(kept).items())


@pytest.mark.parametrize("declared, is_box", [
    ({"border": "1px solid #ccc"}, True),                                                  # the shorthand encloses
    ({"border-top": "1px solid", "border-right": "1px solid", "border-bottom": "1px solid", "border-left": "1px solid"}, True),
    ({"border-inline": "1px solid", "border-block": "1px solid"}, True),                    # logical sides enclose too
    ({"border-width": "1px", "border-style": "solid"}, True),
    ({"border-radius": "8px", "border-bottom": "1px solid #eee"}, True),                    # a radius together with a border side
    ({"box-shadow": "0 1px 3px #ccc"}, True), ({"background": "#f7f7f7"}, True), ({"background-color": "#fff"}, True),
    ({"background-image": "url(x.png)"}, True),
    ({"border-bottom": "1px solid #eee"}, False), ({"border-top": "1px solid #eee"}, False),      # a divider
    ({"border-top": "1px solid", "border-bottom": "1px solid"}, False),                          # two opposite sides do not enclose
    ({"border-top": "1px solid", "border-left": "1px solid"}, False),                             # two adjacent sides do not either
    ({"border-width": "0 0 1px 0", "border-style": "solid"}, False),
    ({"border-top-width": "1px"}, False), ({"border-color": "#ccc"}, False),                # a colour alone draws nothing
    ({"border-radius": "8px"}, False),                                                     # a radius with nothing drawn
    ({"border": "0 solid red"}, False), ({"border": "none"}, False), ({"background": "transparent"}, False),
    ({"outline": "1px solid #ccc"}, False), ({"outline-color": "red", "outline-width": "2px"}, False),
])
def test_finding_1_a_containing_box_is_a_full_border_a_radius_with_a_border_a_shadow_or_a_fill(declared, is_box):
    assert bool(ma._makes_box(declared, IDENTITY | {"box-shadow"})) is is_box


def test_finding_1_the_real_eye_care_card_shape_still_climbs_to_the_bordered_card():
    out, row = run(rev_draft())
    assert row["climbed"] == 2 and row["status"] == "applied"


def test_finding_1_safety_net_reports_header_units_beside_the_block_when_no_element_is_a_box():
    """Neither the wrapper nor the card paints a box: the block stays on the rail and the header/controls beside it are
    named, never silently left. The numbers (a rating beside stars, a count) would map to block fields, so by default the
    declaration is withheld; with a header of nothing shape-mapped the rest is reported."""
    _, row = run(rev_draft(card_style="padding:20px"))
    assert row["status"] == "rejected" and "outside the block root" in row["reason"] and "'4.7'" in row["reason"]
    header = '<div><span>Ward End Eye Care</span><a href="https://x.test/r">Write a review</a></div>'
    out, row = run(rev_draft(card_style="padding:20px", header=header))              # nothing shape-mapped: reported only
    assert row["status"] == "applied" and row["climbed"] == 0
    skipped = _skipped(row)
    assert "sits outside the block root" in skipped["header text 'Ward End Eye Care'"]
    assert "sits outside the block root" in skipped["header link 'Write a review'"]
    assert "sits outside the block root" in next(r for f, r in skipped.items() if f.startswith("header text 'Scroll for more"))


def test_finding_1_negative_control_the_heading_region_and_units_inside_the_block_are_not_reported_as_outside():
    """A section heading (`h2` and the eyebrow beside it) is not header text, and text INSIDE the owner is the ladder's."""
    heading = "<p>From the clinic</p><h2>What people say</h2>"
    html = rev_draft().replace("<h2>What people say</h2>", f"<div>{heading}</div>")
    _, row = run(html)
    assert row["status"] == "applied" and not any("sits outside" in r for r in _skipped(row).values())
    _, row = run(rev_draft(card_style="padding:20px", header="<span>Ward End Eye Care</span>", controls="").replace(
        "<h2>What people say</h2>", f"<div>{heading}</div>"))
    assert not any("What people say" in f or "From the clinic" in f for f in _skipped(row))
    assert any("Ward End Eye Care" in f for f in _skipped(row))                     # ...while the header beside the block is


@needs_db
def test_finding_2_the_real_databases_paint_only_properties_are_never_box_identity(live_db):
    """Every built block on the live DB: no box-identity set holds a property that paints without enclosing."""
    lookup = DbBlockLookup(db_path=live_db)
    try:
        slugs = [r[0] for r in lookup._conn.execute("SELECT slug FROM blocks WHERE status = 'built'")]
        sets = {slug: lookup.identity_properties(slug) for slug in slugs}
    finally:
        lookup.close()
    never = {"object-fit", "object-position", "background-position", "background-size", "background-repeat",
             "background-attachment", "color", "fill", "stroke", "overflow", "opacity"}
    assert not [(slug, props & never) for slug, props in sets.items() if props & never]
    assert all(ma._is_box_paint(p) for props in sets.values() for p in props)
    assert "box-shadow" in sets["sgs/brand-strip"] and "border-radius" in sets["sgs/brand-strip"]      # real box properties remain


@needs_db
@pytest.mark.parametrize("prop", ["object-fit", "object-position", "background-position", "background-size", "background-repeat",
                                  "background-attachment", "color", "fill", "stroke", "overflow", "opacity", "outline-color"])
def test_finding_2_negative_control_each_excluded_property_is_a_box_only_when_the_filter_is_removed(live_db, monkeypatch, prop):
    """Plant an attribute carrying `prop` on the reviews block in a DB copy: it never reaches the identity set; remove
    the box filter and it does when the DB says the property paints at all (so the filter is what excludes it)."""
    conn = sqlite3.connect(str(live_db))
    conn.execute("INSERT INTO block_attributes (block_slug, attr_name, attr_type, css_property) VALUES ('sgs/google-reviews', 'plantedAttr', 'string', ?)", (prop,))
    conn.commit()
    conn.close()
    lookup = DbBlockLookup(db_path=live_db)
    try:
        assert prop not in lookup.identity_properties("sgs/google-reviews")
        monkeypatch.setattr(ma, "_is_box_paint", lambda p: True)
        paints = {r[0] for r in lookup._conn.execute(
            "SELECT DISTINCT css_property FROM property_suffixes WHERE css_property IS NOT NULL AND role IN ('visual', 'color', 'colour-gradient')")}
        assert (prop in lookup.identity_properties("sgs/google-reviews")) is (prop in paints)
    finally:
        lookup.close()


def test_finding_2_a_paint_only_property_does_not_stop_the_climb():
    """`object-fit:cover` on a wrapper (a brand-strip-like identity set that holds it) no longer makes the wrapper the box."""
    identity = IDENTITY | {"object-fit", "background-position"}
    out, row = run(rev_draft(wrapper_style="position:relative;object-fit:cover;background-position:center"), RevLookup(identity=identity))
    assert row["climbed"] == 2 and 'class="sgs-google-reviews card"' in _tag_with(out, "sgs-google-reviews")


def _rated(label: str, glyphs: str = "★★★★★") -> str:
    return HEADER.replace('aria-label="4.7 out of 5">★★★★★', f'aria-label="{label}">{glyphs}')


@pytest.mark.parametrize("label", ["Rated 3.2 out of 5", "3.2 out of 5", "4.7 out of 5, based on 15 reviews", "5 star rating"])
def test_finding_3_a_star_bar_label_that_names_another_number_is_never_the_rating(label):
    out, row = run(rev_draft(header=_rated(label)))
    assert row["status"] == "rejected" and "'4.7'" in row["reason"] and "average-rating" not in out


@pytest.mark.parametrize("label", ["4.7 out of 5", "Rated 4.7 out of 5", "Rated 4.7/5", "4.7 stars out of 5"])
def test_finding_3_a_label_that_names_the_same_number_is_the_rating(label):
    out, row = run(rev_draft(header=_rated(label)))
    assert row["status"] == "applied" and "averageRating" in row["header_fields"]


def test_finding_3_a_label_with_no_numeral_gives_no_evidence_and_the_glyph_bar_is_the_only_one():
    """'Five stars' names no number: today's behaviour (a sibling made only of star glyphs) is kept, and it is a
    weaker test than a label; recorded in `_star_bar_after`."""
    out, row = run(rev_draft(header=_rated("Five stars")))
    assert row["status"] == "applied" and "averageRating" in row["header_fields"]


def test_finding_3_negative_control_without_the_numeral_check_a_disagreeing_label_is_accepted(monkeypatch):
    monkeypatch.setattr(ma, "_label_agrees", lambda label, number: None)
    out, row = run(rev_draft(header=_rated("Rated 3.2 out of 5")))
    assert row["status"] == "applied" and "averageRating" in row["header_fields"]      # the pre-fix outcome


@needs_db
def test_finding_4_the_business_name_attribute_is_found_on_the_live_database_by_role_selector_and_slot_vocabulary(live_db):
    """The live `businessName` has role text-content (not identity) and the derived selector the converter lifts from.
    A real business-name caption maps to it; the fixture is the live row, so it cannot drift from reality."""
    conn = sqlite3.connect(str(live_db))
    row = conn.execute("SELECT role, derived_selector FROM block_attributes WHERE block_slug = 'sgs/google-reviews' AND attr_name = 'businessName'").fetchone()
    conn.close()
    assert row == ("text-content", ".sgs-google-reviews__business-name")                 # pin the fixture to the live shape
    lookup = DbBlockLookup(db_path=live_db)
    try:
        out, row = run(rev_draft(header=HEADER.replace("Google Reviews", "Ward End Eye Care")), lookup)
        assert row["status"] == "applied" and "businessName" in row["header_fields"]
        assert 'class="sgs-google-reviews__business-name"' in out
        out, row = run(rev_draft(), lookup)                                                # the block's own name is never a business name
        assert "business-name" not in out and "businessName" not in row["header_fields"]
    finally:
        lookup.close()


@needs_db
def test_finding_4_negative_controls_two_candidates_or_no_declared_selector_withhold_the_caption(live_db):
    header = HEADER.replace("Google Reviews", "Ward End Eye Care")
    conn = sqlite3.connect(str(live_db))
    conn.execute("INSERT INTO block_attributes (block_slug, attr_name, attr_type, role, derived_selector, emit_shape) VALUES "
                 "('sgs/google-reviews', 'outletName', 'string', 'text-content', '.sgs-google-reviews__outlet-name', 'nested')")
    conn.commit()
    conn.close()
    lookup = DbBlockLookup(db_path=live_db)
    try:
        out, row = run(rev_draft(header=header), lookup)                                    # two name-like text attributes
        assert row["status"] == "rejected" and "'Ward End Eye Care'" in row["reason"] and "business-name" not in out
    finally:
        lookup.close()
    conn = sqlite3.connect(str(live_db))
    conn.execute("DELETE FROM block_attributes WHERE block_slug = 'sgs/google-reviews' AND attr_name = 'outletName'")
    conn.execute("UPDATE block_attributes SET derived_selector = NULL WHERE block_slug = 'sgs/google-reviews' AND attr_name IN ('businessName', 'sourceLabel')")
    conn.commit()
    conn.close()
    lookup = DbBlockLookup(db_path=live_db)
    try:
        out, row = run(rev_draft(header=header), lookup)                                    # no selector: not scalar-liftable
        assert row["status"] == "rejected" and "'Ward End Eye Care'" in row["reason"]
    finally:
        lookup.close()


def test_finding_4_the_identity_role_is_not_a_business_name():
    """On the live database `identity` names icon identities (iconName, iconSource), so a caption is never mapped to one."""
    scalars = [ScalarAttr("iconName", "identity", "string", False, ".sgs-google-reviews__icon-name")]
    out, row = run(rev_draft(header=HEADER.replace("Google Reviews", "Ward End Eye Care")),
                   RevLookup(scalars=scalars + [a for a in SCALARS if a.name != "businessName"]))
    assert row["status"] == "rejected" and "icon-name" not in out


def test_finding_5_a_zero_score_link_tie_is_not_resolved_by_document_order():
    header = '<div><a href="https://x.test/r">Read more</a><a href="https://x.test/r">See all</a></div>'
    out, row = run(rev_draft(header=header))
    assert "review-request-url" not in out and "reviewRequestUrl" not in (row.get("header_fields") or [])


def test_finding_6_the_converter_counts_the_filled_stars_so_a_partial_row_lifts_correctly_and_a_row_it_cannot_count_is_not_claimed():
    """Cause check: `extract_star_count` counts the filled glyphs only, so ★★★★☆ lifts as 4 and ☆☆☆☆☆ as 0 (both right):
    a row with an empty star is not a defect. What IS wrong is a row of glyphs the converter does not count (✭ ✮ ✯)."""
    sys.path.insert(0, str(SCRIPTS))
    from bs4 import BeautifulSoup
    from converter.services.lift_helpers import extract_star_count
    count = lambda text: extract_star_count(BeautifulSoup(f"<span>{text}</span>", "html.parser").span)  # noqa: E731
    assert count("★★★★☆") == 4 and count("☆☆☆☆☆") == 0 and count("⭐⭐⭐") == 3
    assert count("✭✭✭✭✭") == 0 and count("✯✯✯✯✯") == 0
    out, row = run(rev_draft(cards="".join(_review(i, stars="★★★★☆") for i in range(3))))
    assert out.count('class="sgs-google-reviews__rating"') == 3
    out, row = run(rev_draft(cards="".join(_review(i, stars="☆☆☆☆☆") for i in range(3))))
    assert out.count('class="sgs-google-reviews__rating"') == 3
    out, row = run(rev_draft(cards="".join(_review(i, stars="✭✭✭✭✭") for i in range(3))))
    assert "sgs-google-reviews__rating" not in out


def test_finding_6_the_rating_row_glyph_set_is_exactly_what_the_converter_counts_plus_the_empty_stars():
    sys.path.insert(0, str(SCRIPTS))
    from bs4 import BeautifulSoup
    from converter.services.lift_helpers import extract_star_count
    for glyph in ma._STAR_GLYPHS:
        counted = extract_star_count(BeautifulSoup(f"<span>{glyph}</span>", "html.parser").span) == 1
        assert (glyph in ma._RATING_ROW_GLYPHS) == (counted or glyph in "☆✩"), glyph


def test_finding_6_negative_control_with_every_star_glyph_claimable_an_uncounted_row_is_claimed_and_would_lift_zero(monkeypatch):
    monkeypatch.setattr(ma, "_RATING_ROW_GLYPHS", ma._STAR_GLYPHS)
    out, _ = run(rev_draft(cards="".join(_review(i, stars="✭✭✭✭✭") for i in range(3))))
    assert out.count('class="sgs-google-reviews__rating"') == 3


def test_finding_7_aria_hidden_header_text_is_decorative_reported_and_does_not_block_the_block():
    header = HEADER.replace('<span style="font-size:13.5px">15 reviews</span>',
                            '<span style="font-size:13.5px">15 reviews</span><p aria-hidden="true">decorative words</p>')
    out, row = run(rev_draft(header=header))
    assert row["status"] == "applied" and row["header_fields"] == ["reviewRequestUrl", "averageRating", "reviewCount"]
    assert "decorative" in _skipped(row)["header text 'decorative words'"] and "aria-hidden" in _skipped(row)["header text 'decorative words'"]
    nested = header.replace('<p aria-hidden="true">decorative words</p>', '<p aria-hidden="true"><b>decorative</b> words</p>')
    _, row = run(rev_draft(header=nested))
    assert row["status"] == "applied"                                                # a child of a hidden element is hidden too


def test_finding_7_negative_control_the_same_text_without_aria_hidden_withholds_the_section():
    header = HEADER.replace('<span style="font-size:13.5px">15 reviews</span>',
                            '<span style="font-size:13.5px">15 reviews</span><p>decorative words</p>')
    _, row = run(rev_draft(header=header))
    assert row["status"] == "rejected" and "decorative words" in row["reason"]


def test_finding_7_an_aria_hidden_unit_does_not_count_against_the_only_caption_rule():
    header = HEADER.replace("Google Reviews", "Ward End Eye Care").replace(
        '<span style="font-size:13.5px">15 reviews</span>', '<span style="font-size:13.5px">15 reviews</span><p aria-hidden="true">decorative words</p>')
    out, row = run(rev_draft(header=header), RevLookup(scalars=SCALARS))
    assert row["status"] == "applied" and "businessName" in row["header_fields"]


RUN_NEW = REPO / "pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-21-175447"


@needs_db
@pytest.mark.skipif(not (RUN_NEW / "site-info-resolved.html").exists(), reason="needs the local Eye Care run in pipeline-state")
def test_the_real_eye_care_run_reviews_row_is_unchanged_by_the_fix_wave():
    """The recorded report of run 175447 (`climbed: 2`) is what the annotator still produces from that run's input."""
    raw = (RUN_NEW / "site-info-resolved.html").read_text(encoding="utf-8", newline="")
    lookup = DbBlockLookup()
    try:
        out, rows = annotate_from_manifest(raw, lookup)
    finally:
        lookup.close()
    row = next(r for r in rows if r["root_class"] == "sgs-google-reviews")
    assert (row["status"], row["target"], row["climbed"]) == ("applied", "ancestor", 2)
    assert {"reviewRequestUrl", "averageRating", "reviewCount"} <= set(row["header_fields"])
    assert row["fields"] == ["author", "text", "date", "meta", "rating", "avatarColour"]
    assert not any("sits outside" in r for r in _skipped(row).values())          # the section heading and eyebrow are not header text
    out = re.sub(r' data-sgs-(?!manifest)[a-z-]+="[^"]*"', "", out)          # the layout carriers (manifest_layout_choices)
    out = re.sub(r' ?sgs-google-reviews__[a-z-]+--[a-z-]+', "", out)             # their modifier classes
    for element in ("see-all-url", "source-label", "footnote", "header", "rail", "arrow", "google-logo", "card-logo"):    # the redesign's own classes
        cls = "sgs-google-reviews__" + element
        out = out.replace(f' class="{cls}"', "").replace(cls + " ", "")
    assert out == (RUN_NEW / "manifest-annotated.html").read_text(encoding="utf-8", newline="")   # the recorded annotated copy, byte for byte
