"""manifest_layout_choices: layout choices read from the draft's structure (design 2026-09-23-google-reviews-baseline-and-slider-nav
section 4). Every rung has fixtures that DIFFER from the Eye Care draft (so the mechanism must write a non-default value) and a
negative control that breaks one half and checks the result changes. The lookup is a fake carrying the attribute CONTRACT the
redesign gives `sgs/google-reviews` (roles, element classes, enum values, defaults); nothing in the module names it.

Run from plugins/sgs-blocks/scripts:
  python -m pytest orchestrator/test_manifest_layout_choices.py -q -p no:cacheprovider
"""
import json
import re
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import manifest_annotation as ma  # noqa: E402
from manifest_annotation import DbBlockLookup, annotate_from_manifest  # noqa: E402
from test_manifest_box_header import _convert, _google_reviews_block  # noqa: E402
from test_manifest_reviews_header import EYE_FOOTER, EYE_HEADER, SLOTS, HdrLookup, _card  # noqa: E402

LA = ma._layout.LayoutAttr
P = ".sgs-google-reviews__"
NAV = ["below-end", "below-center", "below-split", "sides", "overlay-inset"]
BASELINE = [   # the contract, defaults = the Eye Care draft
    LA("navPosition", "string", "css-modifier", P + "arrow", tuple(NAV), "below-end"),
    LA("pagination", "string", "behaviour", P + "rail", ("scrollbar", "dots", "none"), "scrollbar"),
    LA("logoPosition", "string", "css-modifier", P + "google-logo", ("leading", "trailing"), "leading"),
    LA("showCardLogo", "boolean", "presence-boolean", P + "card-logo", (), True),
    LA("cardStyle", "string", "behaviour", P + "card", ("flat", "bordered", "elevated", "google-card"), "google-card"),
]
OLD_DEFAULTS = {"navPosition": "overlay-inset", "pagination": "dots", "logoPosition": "trailing", "showCardLogo": False}
LAYOUT_SLOTS = {**SLOTS, "card": {"card"}, "item": {"card"}}
RAIL = '<div class="rev-rail" style="display:flex;gap:16px;overflow-x:auto">{cards}</div>'
PREV = '<button onClick="{{ revPrev }}" aria-label="Previous reviews" style="width:40px;height:40px"><svg aria-hidden="true"></svg></button>'
NEXT = '<button onClick="{{ revNext }}" aria-label="More reviews" style="width:40px;height:40px"><svg aria-hidden="true"></svg></button>'


class LayoutLookup(HdrLookup):
    def __init__(self, attrs=BASELINE, defaults=None, slots=LAYOUT_SLOTS, **kw):
        super().__init__(**kw)
        self._attrs = [LA(a.name, a.kind, a.role, a.selector, a.enum, (defaults or {}).get(a.name, a.default)) for a in attrs]
        self._slots = slots

    def slots_of(self, term):
        return frozenset(self._slots.get(term, set()))

    def layout_attrs(self, slug):
        return list(self._attrs)


def draft(header=EYE_HEADER, body=None, footer=EYE_FOOTER, reviews=3, card=_card, style="", wrap="position:relative;padding-top:22px"):
    cards = "".join(card(i) for i in range(reviews))
    body = (body or RAIL + "{footer}").replace("{cards}", cards).replace("{footer}", footer)
    html = (f'<section class="sgs-revs"><div><h2>What people say</h2><div data-reveal="1" style="border:1px solid #DADCE0;'
            f'border-radius:12px;background:#fff">{header}<div style="{wrap}">{body}</div></div></div></section>')
    manifest = json.dumps({"sectionBlocks": {"sgs-revs": {"suggestedBlock": "google-reviews", "confidence": "high"}},
                           "repeatedGroups": [{"section": "sgs-revs", "count": reviews}]})
    return (f"<!doctype html><html><head><style>{style}</style></head><body>{html}\n"
            f'<script type="application/json" data-sgs-manifest>{manifest}</script></body></html>')


def run(html, lookup=None):
    out, rows = annotate_from_manifest(html, lookup or LayoutLookup())
    row = rows[0]
    return out, row, {e["attribute"]: e for e in row.get("layout_choices", [])}


def value(html, attr, lookup=None):
    return run(html, lookup)[2][attr]["value"]


def markers(out):
    """The layout carriers on the page: ``data-sgs-*`` markers (the draft's own manifest script excepted)."""
    return re.findall(r'data-sgs-(?!manifest)[a-z-]+="[^"]*"', out)


def classes(out):
    return [c for v in re.findall(r'class="([^"]*)"', out) for c in v.split()]


def root_tag(out):
    return re.search(r'<div class="sgs-google-reviews"[^>]*>', out).group(0)


# --------------------------------------------------------------------------------------------------------------------
# 0. The Eye Care draft matches the baseline: everything decided, nothing written
# --------------------------------------------------------------------------------------------------------------------

def test_the_eye_care_draft_decides_every_choice_and_writes_nothing_when_they_equal_the_defaults():
    out, row, ch = run(draft())
    assert {k: v["value"] for k, v in ch.items()} == {"navPosition": "below-end", "pagination": "scrollbar",
                                                      "logoPosition": "leading", "showCardLogo": True}
    assert not any(v["written"] for v in ch.values()) and "cardStyle" not in ch            # cardStyle: no rung names it
    assert not markers(out) and not [c for c in classes(out) if "--" in c]
    assert classes(out).count("sgs-google-reviews__card-logo") == 3 and row["status"] == "applied"


def test_negative_control_with_the_old_defaults_the_same_draft_writes_every_value():
    out, _row, ch = run(draft(), LayoutLookup(defaults=OLD_DEFAULTS))
    assert all(ch[a]["written"] for a in OLD_DEFAULTS)
    assert out.count("sgs-google-reviews__arrow--below-end") == 2 and "sgs-google-reviews__google-logo--leading" in out
    assert 'data-sgs-pagination="scrollbar"' in root_tag(out) and 'data-sgs-show-card-logo="true"' in root_tag(out)


def test_a_lookup_without_layout_attributes_is_inert():
    plain = HdrLookup()
    plain.slots_of = LayoutLookup().slots_of
    out, row = annotate_from_manifest(draft(), plain)
    assert "layout_choices" not in row[0] and "sgs-google-reviews__card-logo" not in classes(out) and not markers(out)


def test_the_annotation_is_idempotent():
    """A second pass changes nothing (its row is withheld by the older field ladder, the markers having been stripped by the
    first pass; a withheld row never changes the HTML)."""
    lookup = LayoutLookup(defaults=OLD_DEFAULTS)
    once, _r = annotate_from_manifest(draft(), lookup)
    twice, _again = annotate_from_manifest(once, lookup)
    assert twice == once and markers(once)


# --------------------------------------------------------------------------------------------------------------------
# 1. ORDER
# --------------------------------------------------------------------------------------------------------------------

LOGO = '<img src="assets/google-g.svg" alt="" aria-hidden="true" width="30" height="30" style="display:block">'
TRAILING = EYE_HEADER.replace(LOGO + "\n            <div>", "<div>").replace(
    "</div>\n          </div>\n          <div style=\"display:flex;gap:10px", "</div>" + LOGO + "\n          </div>\n          <div style=\"display:flex;gap:10px", 1)


def test_order_a_logo_after_its_caption_is_trailing_and_is_written_as_a_modifier():
    assert TRAILING != EYE_HEADER
    out, _row, ch = run(draft(header=TRAILING))
    assert ch["logoPosition"]["value"] == "trailing" and ch["logoPosition"]["written"]
    assert "sgs-google-reviews__google-logo--trailing" in out


def test_order_negative_control_a_reversed_row_flips_the_side():
    header = EYE_HEADER.replace('<div style="display:flex;align-items:center;gap:16px">',
                                '<div style="display:flex;flex-direction:row-reverse;align-items:center;gap:16px">', 1)
    assert value(draft(header=header), "logoPosition") == "trailing"


def test_order_the_css_order_property_makes_it_undecidable_and_nothing_is_written():
    header = EYE_HEADER.replace('width="30" height="30" style="display:block"', 'width="30" height="30" style="display:block;order:2"')
    out, _row, ch = run(draft(header=header), LayoutLookup(defaults=OLD_DEFAULTS))
    assert ch["logoPosition"]["value"] is None and "google-logo--" not in out


# --------------------------------------------------------------------------------------------------------------------
# 2. PRESENCE
# --------------------------------------------------------------------------------------------------------------------

def plain_card(i):
    return _card(i).replace('<img src="assets/google-g.svg" alt="" aria-hidden="true" width="17" height="17">', "")


def test_presence_no_mark_in_any_item_is_false_and_written_against_a_true_default():
    out, _row, ch = run(draft(card=plain_card))
    assert ch["showCardLogo"]["value"] is False and 'data-sgs-show-card-logo="false"' in root_tag(out)
    assert "sgs-google-reviews__card-logo" not in classes(out)


def test_presence_negative_control_the_marks_present_are_true_and_classed():
    out, _row, ch = run(draft())
    assert ch["showCardLogo"]["value"] is True and out.count('class="sgs-google-reviews__card-logo"') == 3


def photo_card(i):
    """The same card shape, its image a real (alt-texted) photo rather than a decorative mark."""
    return _card(i).replace('alt="" aria-hidden="true" width="17"', f'alt="Reviewer {i}" width="17"')


def test_presence_a_mark_in_only_some_items_is_undecided():
    cards = lambda i: _card(i) if i == 0 else photo_card(i)  # noqa: E731
    out, _row, ch = run(draft(card=cards))
    assert ch["showCardLogo"]["value"] is None and "sgs-google-reviews__card-logo" not in classes(out) and not markers(out)


def test_presence_different_marks_in_each_item_are_undecided():
    cards = lambda i: _card(i).replace("google-g.svg", f"mark-{i}.svg")  # noqa: E731
    assert value(draft(card=cards), "showCardLogo") is None


def test_presence_negative_control_a_qualifier_the_slot_vocabulary_does_not_tie_to_the_item_places_nothing():
    lookup = LayoutLookup(slots={**SLOTS})                          # no 'card' / 'item' slot rows
    out, _row, ch = run(draft(), lookup)
    assert ch["showCardLogo"]["value"] is None and "sgs-google-reviews__card-logo" not in classes(out)


def test_presence_a_reviewer_photo_with_alt_text_is_never_the_mark():
    out, _row, ch = run(draft(card=photo_card))
    assert ch["showCardLogo"]["value"] is False and "sgs-google-reviews__card-logo" not in classes(out)


# --------------------------------------------------------------------------------------------------------------------
# 3. PLACEMENT
# --------------------------------------------------------------------------------------------------------------------

def test_placement_a_centred_row_under_the_rail_is_below_center():
    footer = f'<div style="display:flex;justify-content:center;gap:8px">{PREV}{NEXT}</div>'
    out, _row, ch = run(draft(footer=footer))
    assert ch["navPosition"]["value"] == "below-center" and out.count("sgs-google-reviews__arrow--below-center") == 2


def test_placement_prev_and_next_at_the_two_ends_of_a_row_is_below_split():
    footer = f'<div style="display:flex;justify-content:space-between">{PREV}{NEXT}</div>'
    assert value(draft(footer=footer), "navPosition") == "below-split"


def test_placement_negative_control_the_same_row_with_other_content_first_is_not_split():
    footer = f'<div style="display:flex;justify-content:space-between"><p>More</p>{PREV}{NEXT}</div>'
    assert value(draft(footer=footer), "navPosition") is None


def test_placement_arrows_flanking_the_rail_in_a_row_are_sides():
    body = f'<div style="display:flex;align-items:center;gap:8px">{PREV}{RAIL}{NEXT}</div>'
    assert value(draft(body=body, footer=""), "navPosition") == "sides"


def test_placement_negative_control_the_same_order_stacked_is_undecided_not_sides():
    body = f'<div style="display:block">{PREV}{RAIL}{NEXT}</div>'
    assert value(draft(body=body, footer=""), "navPosition") is None


def test_placement_absolutely_positioned_arrows_over_the_rail_are_overlay():
    footer = f'<div style="position:absolute;top:50%;left:0;right:0;display:flex;justify-content:space-between">{PREV}{NEXT}</div>'
    assert value(draft(footer=footer), "navPosition") == "overlay-inset"


def test_placement_arrows_above_the_rail_are_undecided_and_nothing_is_written():
    body = f'<div style="display:flex;justify-content:flex-end">{PREV}{NEXT}</div>' + RAIL
    out, _row, ch = run(draft(body=body, footer=""), LayoutLookup(defaults=OLD_DEFAULTS))
    assert ch["navPosition"]["value"] is None and "arrow--" not in out


def test_placement_a_block_whose_enum_lacks_the_observed_placement_writes_nothing():
    attrs = [LA("navPosition", "string", "css-modifier", P + "arrow", ("overlay", "below-end"), "overlay")] + BASELINE[1:]
    footer = f'<div style="display:flex;justify-content:center;gap:8px">{PREV}{NEXT}</div>'
    out, _row, ch = run(draft(footer=footer), LayoutLookup(attrs=attrs))
    assert ch["navPosition"]["value"] is None and "no value for 'center'" in ch["navPosition"]["evidence"]


# --------------------------------------------------------------------------------------------------------------------
# 4. PAGINATION
# --------------------------------------------------------------------------------------------------------------------

# five dots beside three cards (pages, not items: three would be a second run of the declared count)
DOTS = '<div style="display:flex;gap:6px">' + '<span style="width:8px;height:8px;border-radius:50%;background:#ccc"></span>' * 5 + "</div>"


def test_pagination_dot_indicators_are_dots_and_written():
    out, _row, ch = run(draft(footer=EYE_FOOTER.replace('<div style="display:flex;gap:8px">', DOTS + '<div style="display:flex;gap:8px">', 1)))
    assert ch["pagination"]["value"] == "dots" and 'data-sgs-pagination="dots"' in root_tag(out)


def test_pagination_negative_control_large_text_less_boxes_are_not_dots():
    big = DOTS.replace("width:8px;height:8px", "width:80px;height:80px")
    assert value(draft(footer=EYE_FOOTER.replace('<div style="display:flex;gap:8px">', big + '<div style="display:flex;gap:8px">', 1)), "pagination") == "scrollbar"


@pytest.mark.parametrize("style, rail_style", [
    (".rev-rail::-webkit-scrollbar{display:none}", None),
    ("@media (max-width:767px){.rev-rail::-webkit-scrollbar{display:none}}", None),
    ("", "display:flex;overflow-x:auto;scrollbar-width:none"),
    (".rev-rail{scrollbar-width:none}", None),
    ("", "display:flex;overflow:hidden"),
])
def test_pagination_a_hidden_scrollbar_or_a_rail_that_does_not_scroll_is_none(style, rail_style):
    body = RAIL.replace('style="display:flex;gap:16px;overflow-x:auto"', f'style="{rail_style}"') + "{footer}" if rail_style else None
    out, _row, ch = run(draft(style=style, body=body))
    assert ch["pagination"]["value"] == "none" and 'data-sgs-pagination="none"' in root_tag(out)


def test_pagination_negative_control_a_styled_but_visible_scrollbar_is_scrollbar():
    style = ".rev-rail::-webkit-scrollbar{height:8px}.rev-rail::-webkit-scrollbar-thumb{display:none}"
    assert value(draft(style=style), "pagination") == "scrollbar"


# --------------------------------------------------------------------------------------------------------------------
# 5. Carriers and rung selection
# --------------------------------------------------------------------------------------------------------------------

def test_a_modifier_already_on_the_element_blocks_the_write_and_is_reported():
    header = EYE_HEADER.replace(LOGO, LOGO.replace("<img ", '<img class="sgs-google-reviews__google-logo--big" '), 1)
    out, _row, ch = run(draft(header=header), LayoutLookup(defaults=OLD_DEFAULTS))
    assert ch["logoPosition"]["written"] is False and "already sits on the element" in ch["logoPosition"]["evidence"]
    assert "google-logo--leading" not in out


def test_a_marker_the_draft_already_sets_is_kept():
    html = draft(card=plain_card).replace('<div data-reveal="1"', '<div data-reveal="1" data-sgs-show-card-logo="true"', 1)
    out, _row, ch = run(html)
    assert out.count("data-sgs-show-card-logo") == 1 and 'data-sgs-show-card-logo="true"' in out
    assert "already sets" in ch["showCardLogo"]["evidence"]


def test_a_name_that_does_not_survive_the_marker_is_not_written():
    attrs = [LA("showCTALogo", "boolean", "presence-boolean", P + "card-logo", (), True)]
    out, _row, ch = run(draft(card=plain_card), LayoutLookup(attrs=attrs))
    assert ch["showCTALogo"]["value"] is False and ch["showCTALogo"]["written"] is False and not markers(out)


@pytest.mark.parametrize("enum, rung", [
    (("leading", "trailing"), "order"), (("start", "end"), "order"), (("before", "after"), "order"),
    (("overlay", "below-end"), "placement"), (tuple(NAV), "placement"),
    (("scrollbar", "dots", "none"), "pagination"),
    (("none", "lift", "zoom"), None), (("flat", "bordered", "elevated", "google-card"), None), (("hidden", "thin", "visible"), None),
    (("leading", "centre"), None),
])
def test_which_rung_reads_an_attribute_is_decided_by_its_enum_values(enum, rung):
    assert ma._layout._rung_of(LA("x", "string", "behaviour", None, enum, None), ma) == rung


# --------------------------------------------------------------------------------------------------------------------
# 6. The REAL Eye Care draft, the real database, the unchanged converter
# --------------------------------------------------------------------------------------------------------------------

REPO = HERE.parents[3]
RUNS = sorted(REPO.glob("pipeline-state/eye-care-ward-end-eye-care-birmingham-*/site-info-resolved.html"))


@pytest.mark.skipif(not RUNS or not DbBlockLookup.DEFAULT_DB.exists(), reason="needs a local Eye Care run and the framework database")
def test_eye_care_real_draft_every_decided_value_reaches_the_block_and_nothing_else_changes():
    raw = RUNS[-1].read_text(encoding="utf-8", newline="")
    lookup = DbBlockLookup()
    try:
        out, rows = annotate_from_manifest(raw, lookup)
        declared = {a.name: a for a in lookup.layout_attrs("sgs/google-reviews")}
    finally:
        lookup.close()
    row = next(r for r in rows if r["block"] == "sgs/google-reviews")
    ch = {e["attribute"]: e for e in row["layout_choices"]}
    expected = {"showCardLogo": True, "logoPosition": "leading", "navPosition": "below-end", "pagination": "scrollbar"}
    for attr, want in expected.items():
        if attr in declared:
            assert ch[attr]["value"] == want, (attr, ch[attr])
    block = _google_reviews_block(_convert(out, "sgs-google-reviews"))
    for attr, entry in ch.items():
        if entry["written"]:
            assert block.get(attr) == entry["value"], (attr, block.get(attr))
    assert len(block["reviews"]) == 13 and all(not r.get("photo") for r in block["reviews"])


def test_presence_the_mark_is_not_classed_inside_items_whose_fields_are_not_classed():
    """Measured on the 2026-09-20 Eye Care run under keep_unmapped_text: one class inside an unclassed item switched the
    converter's item lift from role matching to class matching and 12 of 13 reviews came back empty. The value still
    travels on the block root; the mark is left alone."""
    unmarked = lambda i: re.sub(r' data-src-field(?:-style)?="[^"]*"', "", _card(i))  # noqa: E731
    out, rows = annotate_from_manifest(draft(card=unmarked), LayoutLookup(defaults=OLD_DEFAULTS), keep_unmapped_text=True)
    ch = {e["attribute"]: e for e in rows[0]["layout_choices"]}
    assert ch["showCardLogo"]["value"] is True and "NOT classed" in ch["showCardLogo"]["evidence"]
    assert "sgs-google-reviews__card-logo" not in classes(out) and 'data-sgs-show-card-logo="true"' in root_tag(out)


def test_presence_negative_control_class_driven_items_do_get_the_mark_class():
    out, _row, ch = run(draft(), LayoutLookup(defaults=OLD_DEFAULTS))
    assert classes(out).count("sgs-google-reviews__card-logo") == 3 and "NOT classed" not in ch["showCardLogo"]["evidence"]
