"""The written-reviews array of sgs/google-reviews is filled by the converter's array resolver.

Plan step "typed mode" (2026-09-21). `sgs/google-reviews` declares `supports.sgs.arrayContentLift` and a
`reviews[]` item schema (author, text, rating, date, datePublished, photo, meta, url, avatarColour) with
declared roles, so review cards written with the block's own BEM element classes lift into `reviews[]`.
`dataSource` defaults to `auto`, which means "written reviews when the block holds any", so the converter
sets no companion attribute.

Needs the framework DB registered with the block (`python scripts/sgs-update-v2.py --stage 1`).

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_google_reviews_array_lift.py -q --import-mode=importlib
"""
from __future__ import annotations

import json
import re

from converter.db import db_lookup
from converter.entry import convert_section

_CARD = (
    '<article class="sgs-google-reviews__review"><strong class="sgs-google-reviews__author">%s</strong>'
    '<span class="sgs-google-reviews__meta">%s</span>'
    '<time class="sgs-google-reviews__date">%s</time><p class="sgs-google-reviews__text">%s</p></article>'
)
_ROWS = [
    ("Neelum Mushtaq", "Local Guide · 11 reviews", "a year ago", "Highly recommended, great service."),
    ("Anonymous M.", "6 reviews", "2 years ago", "Lovely experience with my daughter."),
    ("Sam R.", "3 reviews", "3 weeks ago", "Fitted properly, no pressure."),
]


def _reviews_attr(rows) -> list:
    html = '<section class="sgs-social-proof"><h2>What people say</h2><div class="sgs-google-reviews">%s</div></section>' % "".join(
        _CARD % r for r in rows
    )
    markup = convert_section(html=html, css="", media_map={}, boundary_id="b1", section_id="s1")["block_markup"]
    match = re.search(r"wp:sgs/google-reviews (\{.*?\}) /?-->", markup)
    assert match, "the block was not emitted: " + markup[:300]
    return json.loads(match.group(1)).get("reviews", [])


def test_the_block_opts_in_and_is_registered_in_the_framework_db():
    assert "array-content-lift" in db_lookup.capabilities_for("sgs/google-reviews")
    fields = {key for key, _role in db_lookup.array_item_field_schema("sgs/google-reviews", "reviews")}
    assert {"author", "text", "rating", "date", "meta", "photo", "url"} <= fields


def test_every_card_lifts_with_its_author_date_detail_line_and_text():
    reviews = _reviews_attr(_ROWS)
    assert [(r["author"], r["date"], r["meta"], r["text"]) for r in reviews] == [
        (a, d, m, t) for a, m, d, t in _ROWS
    ]


def test_a_single_card_is_not_invented_into_a_one_item_array():
    """Negative control (the resolver's own >=2 threshold): one card is not a repeater."""
    assert _reviews_attr(_ROWS[:1]) == []
