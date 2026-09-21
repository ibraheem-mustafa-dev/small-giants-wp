"""manifest_annotation: a draft's `data-sgs-manifest` block proposals become SGS-BEM classes on the run copy.

The annotator is a pure function over the draft HTML plus an injectable block lookup, so the logic tests use
small synthetic drafts and a fake lookup (no database). The end-to-end tests use the REAL Eye Care run copy
(a local pipeline-state artefact) and the REAL framework database, and prove the result the way it matters:
the UNCHANGED converter (`converter.entry.convert_section`) turns the annotated section into the declared block.

Every guard has a negative control (see the report that accompanies this file for the commands and output).

Run from plugins/sgs-blocks/scripts:
  python -m pytest orchestrator/test_manifest_annotation.py -q --import-mode=importlib
"""
import ast
import argparse
import importlib.util
import json
import os
import re
import shutil
import sys
import textwrap
import types
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
sys.path.insert(0, str(HERE))

from manifest_annotation import (  # noqa: E402
    ArraySchema,
    DbBlockLookup,
    ItemField,
    annotate_from_manifest,
)

REPO = HERE.parents[3]
ORCHESTRATOR = Path(os.environ.get("MA_TEST_ORCHESTRATOR", SCRIPTS / "sgs-clone-orchestrator.py"))
EYE_CARE_RUN = REPO / "pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-20-222113/site-info-resolved.html"
MAMAS_HOME = REPO / "sites/mamas-munches/mockups/homepage/index.html"
VOTER = SCRIPTS / "recogniser/per-section-convention-voter.py"

needs_eye_care = pytest.mark.skipif(not EYE_CARE_RUN.exists(), reason="needs the local Eye Care run copy in pipeline-state")
needs_db = pytest.mark.skipif(not DbBlockLookup.DEFAULT_DB.exists(), reason="needs the framework database")


# --------------------------------------------------------------------------------------------------------------
# A fake lookup and synthetic drafts
# --------------------------------------------------------------------------------------------------------------

class FakeLookup:
    """slug -> (is class-section, schemas or None for "no arrayContentLift")."""

    def __init__(self):
        text = lambda k: ItemField(k, "text-content", True)  # noqa: E731
        self.blocks = {
            "sgs/trust-bar": (True, [ArraySchema("items", (ItemField("icon", "icon", False), ItemField("label", None, True),
                                                           ItemField("url", "url-href", False)))]),
            "sgs/review-wall": (False, [ArraySchema("reviews", (text("author"), text("text"), text("date")))]),
            "sgs/logo-wall": (False, [ArraySchema("logos", (ItemField("media", "image-object", False),
                                                            ItemField("name", None, False)))]),
            "sgs/plain": (False, None),
            "sgs/banner": (True, None),
        }

    def canonical_slug(self, name):
        slug = name if "/" in name else f"sgs/{name}"
        return slug if slug in self.blocks else None

    def is_class_section(self, slug):
        return self.blocks[slug][0]

    def array_schemas(self, slug):
        return self.blocks[slug][1]


LOOKUP = FakeLookup()

_TICKER_BODY = (
    '<div class="sgs-trust-ticker"><div>'
    + "".join(
        f'<span style="x"><svg><path d="M{i}"/></svg>\n   Claim number {i}\n  </span>' for i in range(1, 5)
    )
    + "</div></div>"
)


def draft(body: str, section_blocks: dict | None = None, groups: list | None = None, raw_manifest: str | None = None) -> str:
    manifest = raw_manifest if raw_manifest is not None else json.dumps(
        {"sectionBlocks": section_blocks or {}, "repeatedGroups": groups or []}
    )
    return (f'<!doctype html><html><body>{body}\n<script type="application/json" data-sgs-manifest>{manifest}</script>'
            "</body></html>")


def ticker_draft(confidence: str = "medium", block: str = "trust-bar", body: str = _TICKER_BODY) -> str:
    return draft(body, {"sgs-trust-ticker": {"suggestedBlock": block, "confidence": confidence, "status": "proposed"}},
                 [{"section": "sgs-trust-ticker", "count": 4}])


# --------------------------------------------------------------------------------------------------------------
# Synthetic: a class-section block claimed on a section root
# --------------------------------------------------------------------------------------------------------------

def test_a_class_section_root_gets_the_block_class_first_and_keeps_its_own():
    out, rows = annotate_from_manifest(ticker_draft(), LOOKUP)
    assert '<div class="sgs-trust-bar sgs-trust-ticker">' in out           # block class FIRST, draft class kept
    assert [r["status"] for r in rows] == ["applied"] and rows[0]["target"] == "root"


def test_every_item_gets_the_item_class_and_its_loose_text_is_wrapped_as_the_label():
    out, rows = annotate_from_manifest(ticker_draft(), LOOKUP)
    assert out.count('class="sgs-trust-bar__item"') == 4
    assert out.count('<span class="sgs-trust-bar__label">Claim number ') == 4
    assert all(f"Claim number {i}" in out for i in range(1, 5))            # no text lost
    assert rows[0]["items"] == 4 and rows[0]["fields"] == ["label"]


def test_only_the_intended_changes_are_made_to_the_draft():
    """Undo exactly the annotations and the draft comes back byte for byte (nothing else was re-serialised)."""
    original = ticker_draft()
    out, _ = annotate_from_manifest(original, LOOKUP)
    assert _undo(out, "trust-bar") == original


def _undo(text: str, *blocks: str) -> str:
    names = "|".join(re.escape(b) for b in blocks)
    text = re.sub(rf'<span class="sgs-(?:{names})__label">(.*?)</span>', r"\1", text, flags=re.DOTALL)
    text = re.sub(rf' class="sgs-(?:{names})(?:__[a-z-]+)?"(?=[ >])', "", text)
    return re.sub(rf'class="sgs-(?:{names}) ', 'class="', text)


def test_a_class_attribute_in_single_quotes_or_unquoted_is_edited_in_place():
    for opening, expected in (("<div class='sgs-trust-ticker'>", "<div class='sgs-banner sgs-trust-ticker'>"),
                              ("<div class=sgs-trust-ticker>", '<div class="sgs-banner sgs-trust-ticker">')):
        html = draft(opening + "<p>A</p><p>B</p></div>", {"sgs-trust-ticker": {"suggestedBlock": "banner", "confidence": "high"}})
        out, rows = annotate_from_manifest(html, LOOKUP)
        assert rows[0]["status"] == "applied" and expected in out, (opening, out)


def test_a_class_lookalike_inside_another_attribute_value_is_not_mistaken_for_the_class_attribute():
    decoy = """<div id="a" data-x=" class='y' ">t</div>"""
    html = draft(decoy + '<div class="sgs-trust-ticker">z</div>',
                 {"sgs-trust-ticker": {"suggestedBlock": "banner", "confidence": "high"}})
    out, _ = annotate_from_manifest(html, LOOKUP)
    assert decoy in out and '<div class="sgs-banner sgs-trust-ticker">' in out


def test_an_element_with_no_class_attribute_gets_one_after_the_tag_name():
    from manifest_annotation import _class_edit, _parse
    src = '<p id="a">x</p>'
    node = _parse(src).children[0]
    start, end, repl = _class_edit(src, node, ["sgs-x"])
    assert src[:start] + repl + src[end:] == '<p class="sgs-x" id="a">x</p>'


# --------------------------------------------------------------------------------------------------------------
# Synthetic: a block that cannot claim a section root goes on the inner element that repeats
# --------------------------------------------------------------------------------------------------------------

def _wall(cards: str, count: int | None = None, block: str = "logo-wall") -> str:
    return draft(f'<section class="sgs-logos"><h2>Brands</h2><div class="rail">{cards}</div></section>',
                 {"sgs-logos": {"suggestedBlock": block, "confidence": "high"}},
                 [{"section": "sgs-logos", **({"count": count} if count else {})}])


def test_a_non_class_section_block_annotates_the_repeating_parent_and_leaves_the_section_root_alone():
    html = _wall("".join(f'<a href="#"><img src="l{i}.png" alt="Brand {i}"></a>' for i in range(5)), count=5)
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert '<div class="sgs-logo-wall rail">' in out and '<section class="sgs-logos">' in out
    assert out.count('class="sgs-logo-wall__logo"') == 5
    assert rows[0]["target"] == "inner" and rows[0]["items"] == 5 and rows[0]["status"] == "applied"


def test_the_declared_count_picks_the_run_when_several_runs_exist():
    body = ('<section class="sgs-logos"><ul><li>a</li><li>b</li><li>c</li></ul>'
            '<div class="rail"><a><img src="1"></a><a><img src="2"></a></div></section>')
    html = draft(body, {"sgs-logos": {"suggestedBlock": "logo-wall", "confidence": "high"}}, [{"section": "sgs-logos", "count": 2}])
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert '<div class="sgs-logo-wall rail">' in out and "<ul>" in out and rows[0]["items"] == 2


def test_a_run_of_slightly_different_siblings_is_found_by_the_declared_count():
    cards = "".join(f'<a><img src="{i}"></a>' for i in range(3)) + '<a><img src="x"><img src="y"></a>'
    out, rows = annotate_from_manifest(_wall(cards, count=4), LOOKUP)
    assert out.count('class="sgs-logo-wall__logo"') == 4 and rows[0]["items"] == 4 and rows[0]["status"] == "applied"


def test_ambiguous_text_is_withheld_not_guessed():
    """Each card has 3 pieces of text and the block has 3 text fields: assigning them by order would be a guess,
    and the converter then drops the card text. So nothing changes and the row says why."""
    cards = "".join(f"<figure><b>Name {i}</b><i>May {i}</i><p>Words {i}</p></figure>" for i in range(3))
    html = _wall(cards, count=3, block="review-wall")
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == html
    assert rows[0]["status"] == "rejected" and "withheld" in rows[0]["reason"] and rows[0]["items"] == 0


def test_keep_unmapped_text_applies_the_classes_anyway_and_reports_partial():
    cards = "".join(f"<figure><b>Name {i}</b><i>May {i}</i><p>Words {i}</p></figure>" for i in range(3))
    out, rows = annotate_from_manifest(_wall(cards, count=3, block="review-wall"), LOOKUP, keep_unmapped_text=True)
    assert '<div class="sgs-review-wall rail">' in out and out.count('class="sgs-review-wall__review"') == 3
    assert rows[0]["status"] == "partial" and rows[0]["fields"] == []


def test_items_that_are_direct_children_of_the_section_root_cannot_carry_a_non_class_section_block():
    html = draft('<section class="sgs-logos"><a><img src="1"></a><a><img src="2"></a></section>',
                 {"sgs-logos": {"suggestedBlock": "logo-wall", "confidence": "high"}}, [{"section": "sgs-logos", "count": 2}])
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == html and rows[0]["status"] == "rejected" and "direct children of the section root" in rows[0]["reason"]


def test_an_unexpanded_loop_is_not_taken_for_items():
    body = ('<section class="sgs-logos"><div class="rail"><sc-for list="{{ xs }}" as="x"><a><img src="{{ x.i }}"></a>'
            "</sc-for></div><sc-if value=\"{{ y }}\"><span>a</span><span>b</span></sc-if></section>")
    html = draft(body, {"sgs-logos": {"suggestedBlock": "logo-wall", "confidence": "high"}}, [{"section": "sgs-logos"}])
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == html and rows[0]["status"] == "rejected" and "unexpanded" in rows[0]["reason"]


# --------------------------------------------------------------------------------------------------------------
# Planted violations, threshold, no manifest, idempotence
# --------------------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("case", ["unknown block", "class not in draft", "class on two elements", "no block proposed",
                                  "repeated group but no arrayContentLift", "no group for a non-section block"])
def test_planted_violations_are_rejected_with_the_right_reason_and_leave_the_html_unchanged(case):
    if case == "unknown block":
        html, want = ticker_draft(block="does-not-exist"), "not a built block"
    elif case == "class not in draft":
        html, want = draft("<div class='other'>x</div>", {"sgs-trust-ticker": {"suggestedBlock": "trust-bar", "confidence": "high"}}), "no element in the draft carries"
    elif case == "class on two elements":
        html, want = ticker_draft(body=_TICKER_BODY + _TICKER_BODY), "more than one element carries"
    elif case == "no block proposed":
        html, want = ticker_draft(block=None), "proposes no block"
    elif case == "repeated group but no arrayContentLift":
        html, want = ticker_draft(block="plain"), "no arrayContentLift"
    else:
        html = draft('<div class="sgs-x"><p>a</p></div>', {"sgs-x": {"suggestedBlock": "plain", "confidence": "high"}})
        want = "declares no repeated group"
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == html
    assert len(rows) == 1 and rows[0]["status"] == "rejected" and want in rows[0]["reason"], rows


def test_a_class_section_block_inside_another_declared_section_is_rejected():
    body = '<section class="sgs-outer"><div class="sgs-inner"><p>x</p></div></section>'
    html = draft(body, {"sgs-outer": {"suggestedBlock": "plain", "confidence": "high"},
                        "sgs-inner": {"suggestedBlock": "banner", "confidence": "high"}})
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == html and rows[1]["status"] == "rejected" and "inside another declared section" in rows[1]["reason"]


def test_a_root_that_already_names_a_different_block_is_rejected():
    html = draft('<div class="sgs-banner sgs-trust-ticker"><p>x</p></div>',
                 {"sgs-trust-ticker": {"suggestedBlock": "trust-bar", "confidence": "high"}})
    # `sgs-banner` is not in the FAKE lookup as a name clash target unless it is a built block: it is.
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == html and rows[0]["status"] == "rejected" and "different block" in rows[0]["reason"]


def test_every_declaration_yields_exactly_one_row_in_manifest_order():
    sb = {"sgs-a": {"suggestedBlock": "nope", "confidence": "high"}, "sgs-b": {"suggestedBlock": None, "confidence": "low"},
          "sgs-c": {"suggestedBlock": "trust-bar", "confidence": "low"}, "sgs-d": "not an object"}
    _, rows = annotate_from_manifest(draft("<p>x</p>", sb), LOOKUP)
    assert [r["root_class"] for r in rows] == list(sb) and [r["status"] for r in rows] == ["rejected", "rejected", "queued", "rejected"]
    assert all(set(r) == {"root_class", "block", "confidence", "status", "reason", "target", "items", "fields"} for r in rows)


def test_below_the_confidence_threshold_is_queued_and_changes_nothing():
    html = ticker_draft(confidence="low")
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == html and rows[0]["status"] == "queued" and "below the 'medium' threshold" in rows[0]["reason"]
    lowered, rows = annotate_from_manifest(html, LOOKUP, min_confidence="low")
    assert lowered != html and rows[0]["status"] == "applied"
    high_only, rows = annotate_from_manifest(ticker_draft(confidence="medium"), LOOKUP, min_confidence="high")
    assert rows[0]["status"] == "queued"


def test_a_bad_min_confidence_is_refused():
    with pytest.raises(ValueError):
        annotate_from_manifest(ticker_draft(), LOOKUP, min_confidence="certain")


@pytest.mark.parametrize("html", [
    "<div class='sgs-trust-ticker'>x</div>",
    '<p>x</p><script type="application/json" data-sgs-manifest>{ not json</script>',
    '<p>x</p><script type="application/json" data-sgs-manifest>[1, 2]</script>',
    '<p>x</p><script type="application/json" data-sgs-manifest>{"name": "no sectionBlocks"}</script>',
    "",
])
def test_no_usable_manifest_returns_the_draft_byte_identical_with_no_rows(html):
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == html and rows == []


def test_the_mamas_munches_homepage_draft_is_byte_identical():
    raw = MAMAS_HOME.read_bytes().decode("utf-8")
    assert "data-sgs-manifest" not in raw
    out, rows = annotate_from_manifest(raw, LOOKUP)
    assert out.encode("utf-8") == MAMAS_HOME.read_bytes() and rows == []


def test_running_it_twice_gives_the_same_html_and_the_same_rows():
    once, rows = annotate_from_manifest(ticker_draft(), LOOKUP)
    twice, rows_again = annotate_from_manifest(once, LOOKUP)
    assert twice == once and rows_again == rows
    wall, _ = annotate_from_manifest(_wall("".join(f'<a><img src="{i}"></a>' for i in range(4)), count=4), LOOKUP)
    again, _ = annotate_from_manifest(wall, LOOKUP)
    assert again == wall


def test_line_endings_and_non_ascii_text_survive_the_edit():
    body = _TICKER_BODY.replace("\n", "\r\n").replace("Claim number 1", "Free delivery over £75, 7–10 days")
    out, rows = annotate_from_manifest(ticker_draft(body=body), LOOKUP)
    assert rows[0]["status"] == "applied" and "Free delivery over £75, 7–10 days</span>\r\n" in out


# --------------------------------------------------------------------------------------------------------------
# The real Eye Care run copy, the real database, the UNCHANGED converter
# --------------------------------------------------------------------------------------------------------------

@pytest.fixture(scope="module")
def eye_care():
    raw = EYE_CARE_RUN.read_text(encoding="utf-8", newline="")
    lookup = DbBlockLookup()
    out, rows = annotate_from_manifest(raw, lookup)
    kept, kept_rows = annotate_from_manifest(raw, lookup, keep_unmapped_text=True)
    yield {"raw": raw, "out": out, "rows": {r["root_class"]: r for r in rows}, "kept": kept,
           "kept_rows": {r["root_class"]: r for r in kept_rows}, "lookup": lookup}
    lookup.close()


def _convert(html_fragment: str, page_html: str) -> str:
    sys.path.insert(0, str(SCRIPTS))
    from bs4 import BeautifulSoup
    from converter.entry import convert_section
    css = "\n\n".join(t.get_text() for t in BeautifulSoup(page_html, "html.parser").find_all("style"))
    return convert_section(html=html_fragment, css=css, media_map={}, boundary_id="b1", section_id="s1")["block_markup"]


def _element(page_html: str, cls: str) -> str:
    from bs4 import BeautifulSoup
    return str(BeautifulSoup(page_html, "html.parser").find(class_=cls))


@needs_db
@needs_eye_care
def test_eye_care_ticker_is_annotated_and_the_converter_emits_a_trust_bar_with_the_text(eye_care):
    out, row = eye_care["out"], eye_care["rows"]["sgs-trust-ticker"]
    assert row["status"] == "applied" and row["block"] == "sgs/trust-bar" and row["items"] == 4 and row["fields"] == ["label"]
    assert '<div class="sgs-trust-bar sgs-trust-ticker" ' in out
    assert out.count('class="sgs-trust-bar__item"') == 4 and out.count('<span class="sgs-trust-bar__label">') == 4
    assert "100% genuine, supplied direct by the brands" in out
    markup = _convert(_element(out, "sgs-trust-bar"), out)
    assert "wp:sgs/trust-bar" in markup and "100% genuine" in markup
    block = json.loads(re.search(r"wp:sgs/trust-bar (\{.*?\}) /?-->", markup, re.S).group(1))
    assert [i["label"] for i in block["items"]][0].startswith("100% genuine") and len(block["items"]) == 4


@needs_db
@needs_eye_care
def test_without_the_annotation_the_converter_does_not_emit_a_trust_bar_for_the_ticker(eye_care):
    """Negative control for the end-to-end proof: the same section, un-annotated, is a plain container."""
    markup = _convert(_element(eye_care["raw"], "sgs-trust-ticker"), eye_care["raw"])
    assert "wp:sgs/trust-bar" not in markup


@needs_db
@needs_eye_care
def test_the_annotated_ticker_root_is_a_section_boundary_named_by_its_first_class(eye_care):
    spec = importlib.util.spec_from_file_location("voter_under_test", VOTER)
    voter = importlib.util.module_from_spec(spec)
    sys.modules["voter_under_test"] = voter
    spec.loader.exec_module(voter)
    from bs4 import BeautifulSoup

    def selectors(ticker_html: str) -> list[str]:
        page = ('<html><body><header class="sgs-header"><p>h</p></header>' + ticker_html +
                '<main><section class="sgs-hero"><h1>x</h1></section></main></body></html>')
        return [sel for _n, sel in voter.auto_detect_sections(BeautifulSoup(page, "html.parser"))]

    assert "div.sgs-trust-bar" in selectors(_element(eye_care["out"], "sgs-trust-bar"))
    assert "div.sgs-trust-ticker" not in selectors(_element(eye_care["out"], "sgs-trust-bar"))
    assert "div.sgs-trust-bar" not in selectors(_element(eye_care["raw"], "sgs-trust-ticker"))   # negative control


@needs_db
@needs_eye_care
def test_eye_care_reviews_are_withheld_by_default_and_the_section_keeps_every_review(eye_care):
    """13 cards, 6 pieces of text each (initial, name, review count, stars, date, quote), one card shaped
    differently, 4 text fields in the block. No certain mapping, so nothing is annotated and the converter still
    produces every review as ordinary blocks."""
    row = eye_care["rows"]["sgs-google-reviews"]
    assert row["status"] == "rejected" and "withheld" in row["reason"] and row["items"] == 0
    section = _element(eye_care["out"], "sgs-google-reviews")
    assert section == _element(eye_care["raw"], "sgs-google-reviews")            # not a byte of it changed
    markup = _convert(section, eye_care["out"])
    assert "wp:sgs/google-reviews" not in markup
    for text in ("Anonymous M.", "Had a lovely experience", "2 years ago", "6 reviews"):
        assert text in markup


@needs_db
@needs_eye_care
def test_eye_care_reviews_annotated_anyway_become_a_google_reviews_block_that_drops_the_card_text(eye_care):
    """MEASURED (2026-09-21), pinned so a converter improvement shows up here. With keep_unmapped_text the rail is
    annotated and the converter emits a container holding an `sgs/google-reviews` block with 13 review items, but
    it lifts only the photo, rating and link: the names, dates and quotes are gone and no content gap says so.
    When the converter can carry those fields this test should start failing, and the default should be revisited."""
    row = eye_care["kept_rows"]["sgs-google-reviews"]
    assert row["status"] == "partial" and row["items"] == 13 and row["target"] == "inner"
    kept = eye_care["kept"]
    assert '<div class="sgs-google-reviews rev-rail"' in kept and kept.count('class="sgs-google-reviews__review"') == 13
    markup = _convert(_element(kept, "sgs-google-reviews"), kept)
    assert markup.lstrip().startswith("<!-- wp:sgs/container") and "wp:sgs/google-reviews" in markup
    block = json.loads(re.search(r"wp:sgs/google-reviews (\{.*?\}) /?-->", markup, re.S).group(1))
    assert len(block["reviews"]) == 13
    assert all(set(r) <= {"photo", "rating", "url"} for r in block["reviews"])
    assert "Anonymous M." not in markup


@needs_db
@needs_eye_care
def test_eye_care_brand_marquee_logos_are_lifted_into_a_brand_strip(eye_care):
    row = eye_care["rows"]["sgs-brand-marquee"]
    assert row["status"] == "applied" and row["block"] == "sgs/brand-strip" and row["items"] == 32
    out = eye_care["out"]
    markup = _convert(_element(out, "sgs-brand-marquee"), out)
    block = json.loads(re.search(r"wp:sgs/brand-strip (\{.*?\}) /?-->", markup, re.S).group(1))
    assert len(block["logos"]) == 32 and block["logos"][0]["media"]["alt"] == "Ray-Ban"


@needs_db
@needs_eye_care
def test_eye_care_every_declaration_is_reported_and_only_the_intended_markup_changed(eye_care):
    manifest = json.loads(re.search(r"<script[^>]*data-sgs-manifest[^>]*>(.*?)</script>", eye_care["raw"], re.S).group(1))
    assert list(eye_care["rows"]) == list(manifest["sectionBlocks"])                        # one row each, none skipped
    assert {r["status"] for r in eye_care["rows"].values()} <= {"applied", "partial", "queued", "rejected"}
    assert eye_care["rows"]["sgs-hero"]["status"] == "applied"                              # already carries its class
    assert eye_care["rows"]["sgs-about-strip"]["status"] == "queued"                        # low confidence
    assert eye_care["rows"]["sgs-product-more-from-brand"]["status"] == "rejected"          # unexpanded loop
    assert _undo(eye_care["out"], "trust-bar", "brand-strip") == eye_care["raw"]


@needs_db
@needs_eye_care
def test_eye_care_annotation_is_idempotent(eye_care):
    again, rows = annotate_from_manifest(eye_care["out"], eye_care["lookup"])
    assert again == eye_care["out"] and {r["root_class"]: r for r in rows} == eye_care["rows"]


@needs_db
def test_the_real_lookup_reads_the_framework_database_read_only():
    import sqlite3
    lookup = DbBlockLookup()
    try:
        assert lookup.canonical_slug("trust-bar") == "sgs/trust-bar" and lookup.canonical_slug("sgs/trust-bar") == "sgs/trust-bar"
        assert lookup.canonical_slug("no-such-block") is None
        assert lookup.is_class_section("sgs/trust-bar") and not lookup.is_class_section("sgs/google-reviews")
        assert lookup.array_schemas("sgs/feature-grid") is None                       # no arrayContentLift
        fields = {f.key: f for f in lookup.array_schemas("sgs/trust-bar")[0].fields}
        assert fields["label"].text_like and not fields["icon"].text_like and not fields["url"].text_like
        reviews = {f.key: f.text_like for f in lookup.array_schemas("sgs/google-reviews")[0].fields}
        assert reviews["author"] and reviews["text"] and not reviews["rating"] and not reviews["photo"]
        with pytest.raises(sqlite3.OperationalError):
            lookup._conn.execute("CREATE TABLE should_not_be_writable (x)")
    finally:
        lookup.close()


# --------------------------------------------------------------------------------------------------------------
# Stage wiring in sgs-clone-orchestrator.py
# --------------------------------------------------------------------------------------------------------------

def _orchestrator_source() -> str:
    return ORCHESTRATOR.read_text(encoding="utf-8")


def _flag_kwargs() -> dict:
    tree = ast.parse(_orchestrator_source())
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and node.args and isinstance(node.args[0], ast.Constant) \
                and node.args[0].value == "--manifest-annotation":
            return {k.arg: k.value for k in node.keywords}
    raise AssertionError("--manifest-annotation is not declared in sgs-clone-orchestrator.py")


def test_the_manifest_annotation_flag_is_default_on_and_can_be_switched_off():
    kwargs = _flag_kwargs()
    assert ast.unparse(kwargs["action"]) == "argparse.BooleanOptionalAction" and kwargs["default"].value is True
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest-annotation", action=argparse.BooleanOptionalAction, default=True)
    assert parser.parse_args([]).manifest_annotation is True
    assert parser.parse_args(["--no-manifest-annotation"]).manifest_annotation is False


def _stage_source() -> str:
    src = _orchestrator_source()
    start = src.index("    # Stage -1.44 -- MANIFEST ANNOTATION")
    end = src.index("    # Stage -1.4 -- SCRIPT BINDINGS")
    assert src.index("# Stage -1.45 -- SITE DETAILS") < start < end
    return textwrap.dedent(src[start:end])


def _run_stage(tmp_path: Path, html: str, flag: bool = True, load=None):
    mockup = tmp_path / "draft.html"
    mockup.write_text(html, encoding="utf-8")
    run_dir = tmp_path / "run"
    run_dir.mkdir(exist_ok=True)

    def load_module(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)
        if hasattr(module, "LOG_PATH"):
            # The decision-log module defaults to the live, git-tracked Spec 44 log: a test must never write there.
            module.LOG_PATH = tmp_path / "recognition-log.jsonl"
        return module

    args = types.SimpleNamespace(mockup=mockup, manifest_annotation=flag)
    scope = {"args": args, "run_dir": run_dir, "json": json, "ORCHESTRATOR_DIR": HERE,
             "_load_module_from_path": load or load_module}
    exec(compile(_stage_source(), "stage", "exec"), scope)
    return args, run_dir, mockup


@needs_db
def test_the_stage_is_inert_without_a_manifest(tmp_path, capsys):
    args, run_dir, mockup = _run_stage(tmp_path, "<div class='sgs-trust-ticker'>x</div>")
    assert args.mockup == mockup and not (run_dir / "manifest-annotated.html").exists()
    assert not (run_dir / "manifest-annotation-report.json").exists()


@needs_db
def test_the_stage_writes_the_annotated_copy_and_the_report_and_repoints_the_mockup(tmp_path, capsys):
    args, run_dir, mockup = _run_stage(tmp_path, ticker_draft())
    assert args.mockup == run_dir / "manifest-annotated.html"
    assert 'class="sgs-trust-bar sgs-trust-ticker"' in args.mockup.read_text(encoding="utf-8")
    rows = json.loads((run_dir / "manifest-annotation-report.json").read_text(encoding="utf-8"))
    assert [r["status"] for r in rows] == ["applied"]
    assert mockup.read_text(encoding="utf-8") == ticker_draft()                              # the source is never edited
    assert "manifest-annotation: 1 declaration(s)" in capsys.readouterr().out


@needs_db
def test_the_stage_reports_but_does_not_repoint_when_nothing_was_applied(tmp_path):
    args, run_dir, mockup = _run_stage(tmp_path, ticker_draft(confidence="low"))
    assert args.mockup == mockup and not (run_dir / "manifest-annotated.html").exists()
    assert json.loads((run_dir / "manifest-annotation-report.json").read_text(encoding="utf-8"))[0]["status"] == "queued"


@needs_db
def test_the_stage_does_nothing_when_switched_off(tmp_path):
    args, run_dir, mockup = _run_stage(tmp_path, ticker_draft(), flag=False)
    assert args.mockup == mockup and list(run_dir.iterdir()) == []


def test_the_stage_is_fail_soft(tmp_path, capsys):
    def broken(name, path):
        raise RuntimeError("boom")

    args, run_dir, mockup = _run_stage(tmp_path, ticker_draft(), load=broken)
    assert args.mockup == mockup and list(run_dir.iterdir()) == []
    assert "[manifest-annotation] skipped (boom)" in capsys.readouterr().out


# --------------------------------------------------------------------------------------------------------------
# FR-31-31: the field-marker mapping ladder (synthetic, fake lookup)
# --------------------------------------------------------------------------------------------------------------
# The resolver leaves `data-src-field="<draft field>"` on an element whose whole content is one field. The annotator
# maps those names to the block's text fields: (1) manifest fieldMap, (2) the same name, (3) a DB synonym (two names
# that share a `slots` row), else the field is reported as skipped and, when the block still has a free text field it
# might belong to, the whole declaration is withheld. The markers never leave the annotator.

MARKER_RE = re.compile(r' data-src-field(?:-[a-z0-9-]+)?="[^"]*"')


class SynonymLookup(FakeLookup):
    """A fake with a slot table: `who` and `author` share the `attribution` slot, as they would once seeded."""

    SLOTS = {"who": {"attribution"}, "author": {"attribution", "text"}, "text": {"text"}, "date": {"date"},
             "initial": set(), "either": {"attribution", "date"}}

    def slots_of(self, term):
        return frozenset(self.SLOTS.get(term, set()))


SYNONYMS = SynonymLookup()


def _card(i: int, extra: str = "", who: str = '<b data-src-field="who">Name {i}</b>') -> str:
    return ('<figure><span data-src-field="initial">N</span>' + who.format(i=i) +
            f'<i data-src-field="date">May {i}</i><p data-src-field="text">Words {i}</p>'
            '<span>&#9733;&#9733;&#9733;</span>' + extra + "</figure>")


def _marked_wall(cards: list[str], group: dict | None = None) -> str:
    return draft('<section class="sgs-logos"><h2>Brands</h2><div class="rail">' + "".join(cards) + "</div></section>",
                 {"sgs-logos": {"suggestedBlock": "review-wall", "confidence": "high"}},
                 [{"section": "sgs-logos", "count": len(cards), **(group or {})}])


def _plain(html: str) -> str:
    """What the annotator must hand back for a declaration it did not apply: the draft minus the markers."""
    return MARKER_RE.sub("", html)


def test_a_marked_field_with_the_blocks_own_name_and_a_synonym_is_mapped_and_the_leftovers_are_reported():
    html = _marked_wall([_card(i) for i in range(3)])
    out, rows = annotate_from_manifest(html, SYNONYMS)
    row = rows[0]
    assert row["status"] == "applied" and row["items"] == 3 and row["fields"] == ["author", "text", "date"]
    assert out.count('class="sgs-review-wall__author"') == 3
    assert out.count('class="sgs-review-wall__text"') == 3 and out.count('class="sgs-review-wall__date"') == 3
    skipped = {s["field"]: s["reason"] for s in row["skipped_fields"]}
    assert "initial" in skipped and "no synonym" in skipped["initial"]                # a derived initial, no field for it
    assert any("furniture" in reason for f, reason in skipped.items() if f.startswith("unmarked text"))
    assert all("Name %d" % i in out and "Words %d" % i in out for i in range(3))     # no text lost from the markup


def test_the_markers_never_leave_the_annotator_whatever_the_outcome():
    html = _marked_wall([_card(i) for i in range(3)])
    assert "data-src-field" in html
    for lookup in (SYNONYMS, LOOKUP):                       # mapped, and withheld (no synonym source)
        out, _ = annotate_from_manifest(html, lookup)
        assert "data-src-field" not in out
    assert "data-src-field" not in annotate_from_manifest(html, SYNONYMS, min_confidence="high")[0]
    noisy = html.replace('"sectionBlocks": {"sgs-logos"', '"x": {"sgs-logos"')       # no sectionBlocks at all
    assert "data-src-field" not in annotate_from_manifest(noisy, SYNONYMS)[0]


def test_only_the_markers_and_the_intended_annotations_change_the_draft():
    """Undo the annotations and the markers and the draft comes back byte for byte."""
    html = _marked_wall([_card(i) for i in range(3)])
    out, _ = annotate_from_manifest(html, SYNONYMS)
    undone = re.sub(r' class="sgs-review-wall__[a-z-]+"', "", out)
    undone = re.sub(r'class="sgs-review-wall rail"', 'class="rail"', undone)
    assert undone == _plain(html)


def test_marked_annotation_is_idempotent():
    html = _marked_wall([_card(i) for i in range(3)])
    once, _ = annotate_from_manifest(html, SYNONYMS)
    twice, _ = annotate_from_manifest(once, SYNONYMS)
    assert twice == once


def test_an_unmapped_field_withholds_the_section_when_the_block_has_a_free_text_field_it_could_be():
    """Negative control for the synonym rung: with no synonym for `who`, `author` is still free, so the text could
    belong there. Guessing would misplace it, so the section is left as the draft has it."""
    html = _marked_wall([_card(i) for i in range(3)])
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == _plain(html)
    assert rows[0]["status"] == "rejected" and "withheld" in rows[0]["reason"] and "'who'" in rows[0]["reason"]


def test_keep_unmapped_text_applies_the_mapped_part_and_reports_partial():
    html = _marked_wall([_card(i) for i in range(3)])
    out, rows = annotate_from_manifest(html, LOOKUP, keep_unmapped_text=True)
    assert rows[0]["status"] == "partial" and rows[0]["fields"] == ["text", "date"]
    assert out.count('class="sgs-review-wall__text"') == 3 and "sgs-review-wall__author" not in out


def test_a_manifest_field_map_names_the_target_and_null_means_deliberately_not_lifted():
    html = _marked_wall([_card(i) for i in range(3)], {"fieldMap": {"who": "author", "initial": None}})
    out, rows = annotate_from_manifest(html, LOOKUP)                                # no synonym source needed
    assert rows[0]["status"] == "applied" and rows[0]["fields"] == ["author", "text", "date"]
    skipped = {s["field"]: s["reason"] for s in rows[0]["skipped_fields"]}
    assert skipped["initial"] == "the manifest's fieldMap marks it as not lifted"
    assert out.count("sgs-review-wall__author") == 3


def test_a_field_map_beats_the_same_name_and_a_bad_target_is_refused_with_its_reason():
    swapped = _marked_wall([_card(i) for i in range(3)], {"fieldMap": {"text": "date", "date": "text", "who": "author", "initial": None}})
    out, rows = annotate_from_manifest(swapped, LOOKUP)
    assert rows[0]["status"] == "applied" and 'class="sgs-review-wall__date"' in out and out.count("sgs-review-wall__text") == 3
    bad = _marked_wall([_card(i) for i in range(3)], {"fieldMap": {"who": "nickname"}})
    out, rows = annotate_from_manifest(bad, LOOKUP)
    assert rows[0]["status"] == "rejected" and "'nickname', which is not a text field of the block" in rows[0]["reason"]
    assert out == _plain(bad)


def test_a_malformed_field_map_is_ignored_not_fatal():
    for junk in ("who=author", ["who"], {"who": 3}, None):
        html = _marked_wall([_card(i) for i in range(3)], {"fieldMap": junk})
        out, rows = annotate_from_manifest(html, SYNONYMS)
        assert rows[0]["status"] == "applied" and "sgs-review-wall__author" in out, junk


def test_two_draft_fields_that_fill_one_block_field_withhold_the_section_with_a_reason():
    html = _marked_wall([_card(i) for i in range(3)], {"fieldMap": {"who": "author", "initial": "author"}})
    out, rows = annotate_from_manifest(html, LOOKUP)
    assert out == _plain(html)
    assert rows[0]["status"] == "rejected" and "would both fill 'author'" in rows[0]["reason"]


def test_a_synonym_that_fits_two_block_fields_is_not_guessed():
    """`either` shares a slot with `author` (attribution) and with `date`: it cannot be told apart."""
    cards = [_card(i, who='<b data-src-field="either">Name {i}</b>') for i in range(3)]
    out, rows = annotate_from_manifest(_marked_wall(cards), SYNONYMS)
    assert rows[0]["status"] == "rejected" and "more than one block field" in rows[0]["reason"]
    assert out == _plain(_marked_wall(cards))


def test_text_with_no_field_name_that_varies_between_cards_withholds_while_a_field_is_free():
    """Negative control for the furniture rule: `Reviewer N` differs per card and nothing says what it is."""
    cards = [f'<figure><i data-src-field="date">May {i}</i><p data-src-field="text">Words {i}</p><em>Reviewer {i}</em></figure>'
             for i in range(3)]                             # every marked field maps; `author` stays free
    out, rows = annotate_from_manifest(_marked_wall(cards), SYNONYMS)
    assert out == _plain(_marked_wall(cards)) and rows[0]["status"] == "rejected"
    assert "no field name says what it is" in rows[0]["reason"]


def test_unlabelled_varying_text_is_only_skipped_once_every_text_field_is_claimed():
    cards = [_card(i, extra=f"<em>Reviewer {i}</em>") for i in range(3)]
    out, rows = annotate_from_manifest(_marked_wall(cards), SYNONYMS)
    assert rows[0]["status"] == "applied" and any("varies" in s["reason"] for s in rows[0]["skipped_fields"])
    assert "Reviewer 1" in out


def test_an_optional_link_label_in_one_card_is_furniture_not_a_reason_to_withhold():
    """The Eye Care `Read the full review` sits in a retained <sc-if> in ONE card, so it can be neither compared
    across cards nor left unexplained."""
    extra = '<sc-if value="x"><a href="#">Read the full review</a></sc-if>'
    cards = [_card(0, extra=extra)] + [_card(i) for i in (1, 2)]
    out, rows = annotate_from_manifest(_marked_wall(cards), SYNONYMS)
    assert rows[0]["status"] == "applied" and rows[0]["items"] == 3
    skipped = {s["field"]: s["reason"] for s in rows[0]["skipped_fields"]}
    assert "furniture" in skipped["unmarked text 'Read the full review'"] and "Read the full review" in out


def test_the_same_one_card_text_outside_a_conditional_is_not_furniture():
    """Negative control for the previous test: without the `<sc-if>` a one-card text is unexplained content."""
    cards = [_card(0, extra="<a href='#'>Read the full review</a>")] + [_card(i) for i in (1, 2)]
    out, rows = annotate_from_manifest(_marked_wall(cards), SYNONYMS)
    assert rows[0]["status"] == "applied"           # every text field is claimed, so it is skipped, not withheld
    assert any("varies" in s["reason"] for s in rows[0]["skipped_fields"])
    cards = [_card(0, extra="<a href='#'>Read the full review</a>", who="")] + [_card(i, who="") for i in (1, 2)]
    _, rows = annotate_from_manifest(_marked_wall(cards), SYNONYMS)
    assert rows[0]["status"] == "rejected"          # ...but with `author` still free the unexplained text withholds


def test_a_field_shown_twice_in_one_card_lifts_the_first_and_reports_the_second():
    extra = '<u data-src-field="text">Words again</u>'
    out, rows = annotate_from_manifest(_marked_wall([_card(i, extra=extra) for i in range(3)]), SYNONYMS)
    assert rows[0]["status"] == "applied" and out.count('class="sgs-review-wall__text"') == 3
    assert any("shown more than once" in s["reason"] for s in rows[0]["skipped_fields"])


def test_a_draft_with_markers_on_only_some_cards_still_maps_by_name():
    """The count-and-shape rule needed every card to hold the same amount of text; names do not."""
    cards = [_card(0), _card(1, who=""), _card(2)]          # card 1 has no name at all
    out, rows = annotate_from_manifest(_marked_wall(cards), SYNONYMS)
    assert rows[0]["status"] == "applied" and rows[0]["fields"] == ["author", "text", "date"] and out.count("sgs-review-wall__author") == 2


def test_a_draft_without_markers_still_takes_the_count_and_shape_path():
    """Negative control: nothing here is marked, so `who`-style mapping cannot run and the old withholding applies."""
    cards = "".join(f"<figure><b>Name {i}</b><i>May {i}</i><p>Words {i}</p></figure>" for i in range(3))
    out, rows = annotate_from_manifest(_wall(cards, count=3, block="review-wall"), SYNONYMS)
    assert rows[0]["status"] == "rejected" and "assigning them by order would be a guess" in rows[0]["reason"]
    assert "skipped_fields" not in rows[0]


def test_every_field_marker_variant_is_stripped_and_nothing_else_is_touched():
    html = '<img data-src-field-alt="name" data-src-field-src="logo" src="a.png"><b data-src-field="who">x</b><p data-sgs-fx="1" data-src="k">y</p>'
    wrapped = draft(html, {"sgs-none": {"suggestedBlock": "banner", "confidence": "high"}})
    out, _ = annotate_from_manifest(wrapped, SYNONYMS)
    assert out == wrapped.replace(' data-src-field-alt="name"', "").replace(' data-src-field-src="logo"', "").replace(' data-src-field="who"', "")
    assert 'data-sgs-fx="1" data-src="k"' in out                                     # look-alikes are left alone


# --------------------------------------------------------------------------------------------------------------
# FR-31-31 rung 3: a synonym counts only through a NARROW slot (a catch-all slot is no evidence)
# --------------------------------------------------------------------------------------------------------------
# Live database: `verified`, `bio`, `excerpt`, `intro`, `message` and `author` are all aliases of slot `text` (16 names),
# so "shares a slot with the block's text field" would map a badge onto a review's only text field and drop the body.

class SlotLookup(FakeLookup):
    """A block with ONE text key (`text`) and a slot table whose `text` slot is a catch-all, as on the live database."""

    SLOTS = {"verified": {"text"}, "bio": {"text"}, "text": {"text"}, "author": {"attribution", "text"},
             "who": {"attribution"}, "name": {"attribution"}, "date": {"date"}, "posted": {"date"}}

    def __init__(self, broad: frozenset = frozenset({"text"})):
        super().__init__()
        self.broad = broad
        text = lambda k: ItemField(k, "text-content", True)  # noqa: E731
        self.blocks["sgs/one-text"] = (False, [ArraySchema("reviews", (text("text"),))])
        self.blocks["sgs/named"] = (False, [ArraySchema("reviews", (text("author"), text("text")))])

    def slots_of(self, term):
        return frozenset(self.SLOTS.get(term, set()))

    def is_broad_slot(self, slot):
        return slot in self.broad


def _badge_and_body(cards: int = 3, badge: str = "verified", body: str = "body") -> str:
    figs = "".join(f'<figure><span data-src-field="{badge}">Verified buyer</span>'
                   f'<p data-src-field="{body}">Really lovely, number {i}</p></figure>' for i in range(cards))
    return draft('<section class="sgs-logos"><h2>R</h2><div class="rail">' + figs + "</div></section>",
                 {"sgs-logos": {"suggestedBlock": "one-text", "confidence": "high"}},
                 [{"section": "sgs-logos", "count": cards}])


def _named_draft(*fields: tuple[str, str]) -> str:
    tags = ("b", "i", "p", "span")                        # different tags, so the fields are not mistaken for a run of items
    figs = "".join("<figure>" + "".join(f'<{tags[n]} data-src-field="{name}">{text} {i}</{tags[n]}>'
                                        for n, (name, text) in enumerate(fields)) + "</figure>" for i in range(3))
    return draft('<section class="sgs-logos"><div class="rail">' + figs + "</div></section>",
                 {"sgs-logos": {"suggestedBlock": "named", "confidence": "high"}}, [{"section": "sgs-logos", "count": 3}])


def test_a_badge_that_only_shares_a_catch_all_slot_does_not_claim_the_only_text_field():
    """THE REVIEWER'S SCENARIO. `verified` and `text` share the catch-all slot `text`; `body` maps nowhere. Before the
    fix the badge was written into the review-body field, the real body was dropped and the row said `applied`."""
    html = _badge_and_body()
    out, rows = annotate_from_manifest(html, SlotLookup())
    assert rows[0]["status"] == "rejected" and out == _plain(html)          # withheld: the section keeps every word
    assert "catch-all slot 'text'" in rows[0]["reason"]
    assert "'verified'" in rows[0]["reason"] and "'body'" in rows[0]["reason"]      # both named, so the operator can fix it
    assert "sgs-one-text__text" not in out


def test_negative_control_the_same_draft_is_wrongly_applied_when_no_slot_counts_as_a_catch_all():
    """Break just this fix (nothing is broad) and the reviewer's defect comes back: the badge lands in the text field."""
    out, rows = annotate_from_manifest(_badge_and_body(), SlotLookup(broad=frozenset()))
    assert rows[0]["status"] == "applied" and rows[0]["fields"] == ["text"]
    assert 'class="sgs-one-text__text"' in out and "Verified buyer" in out.split("sgs-one-text__text")[1]


def test_a_manifest_field_map_can_still_place_a_field_the_catch_all_slot_refused():
    html = _badge_and_body().replace('"count": 3}', '"count": 3, "fieldMap": {"body": "text", "verified": null}}')
    out, rows = annotate_from_manifest(html, SlotLookup())
    assert rows[0]["status"] == "applied" and rows[0]["fields"] == ["text"]
    assert out.count('class="sgs-one-text__text"') == 3 and "Really lovely, number 0" in out.split("sgs-one-text__text")[1]


def test_a_narrow_slot_synonym_still_maps_and_a_leftover_with_no_free_field_is_only_reported():
    """`who` and `author` share the narrow slot `attribution`; the derived initial has no field to go to (the Eye Care shape)."""
    out, rows = annotate_from_manifest(_named_draft(("initial", "N"), ("who", "Ada"), ("text", "Words")), SlotLookup())
    assert rows[0]["status"] == "applied" and rows[0]["fields"] == ["author", "text"]
    assert out.count("sgs-named__author") == 3 and [s["field"] for s in rows[0]["skipped_fields"]] == ["initial"]


def test_two_draft_fields_that_are_both_narrow_synonyms_of_one_key_withhold_the_section():
    html = _named_draft(("who", "Ada"), ("name", "A. Lovelace"), ("text", "Words"))
    out, rows = annotate_from_manifest(html, SlotLookup())
    assert rows[0]["status"] == "rejected" and "would both fill 'author'" in rows[0]["reason"] and out == _plain(html)


@needs_db
def test_the_real_databases_catch_all_slots_are_measured_from_the_table_not_named(tmp_path):
    lookup = DbBlockLookup()
    try:
        assert lookup.is_broad_slot("text") and lookup.is_broad_slot("label")
        assert not lookup.is_broad_slot("attribution") and not lookup.is_broad_slot("date")
        assert not lookup.is_broad_slot("no-such-slot")
        assert all(lookup.slots_of(t) == frozenset({"text"}) for t in ("verified", "bio", "excerpt", "message"))
    finally:
        lookup.close()
    # Same code, different data: give `attribution` twenty aliases in a COPY of the database and it becomes broad.
    import sqlite3
    copy = tmp_path / "wide.db"
    source = sqlite3.connect(f"file:{DbBlockLookup.DEFAULT_DB.as_posix()}?mode=ro", uri=True)
    target = sqlite3.connect(str(copy))
    source.backup(target)
    source.close()
    target.execute("UPDATE slots SET aliases = ? WHERE slot_name = 'attribution' AND scope = 'element'",
                   (json.dumps(["alias%d" % i for i in range(20)]),))
    target.commit()
    target.close()
    wide = DbBlockLookup(db_path=copy)
    try:
        assert wide.is_broad_slot("attribution")
    finally:
        wide.close()


@needs_db
def test_the_reviewers_scenario_on_the_real_database_is_withheld():
    """The same defect through the REAL slot table (a fake block schema, the live `slots` rows)."""
    class RealSlots(SlotLookup):
        def __init__(self):
            super().__init__()
            self.real = DbBlockLookup()

        def slots_of(self, term):
            return self.real.slots_of(term)

        def is_broad_slot(self, slot):
            return self.real.is_broad_slot(slot)

    lookup = RealSlots()
    try:
        out, rows = annotate_from_manifest(_badge_and_body(), lookup)
    finally:
        lookup.real.close()
    assert rows[0]["status"] == "rejected" and "catch-all slot 'text'" in rows[0]["reason"]


# --------------------------------------------------------------------------------------------------------------
# FR-31-31: the real Eye Care draft, resolved by the real browser, the real DB, the UNCHANGED converter
# --------------------------------------------------------------------------------------------------------------

EYE_CARE_V2 = REPO / "sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2"
needs_draft = pytest.mark.skipif(shutil.which("node") is None or not (EYE_CARE_V2 / "Eye Care Birmingham.dc.html").exists(),
                                 reason="needs node and the Eye Care v2 bundle")


def _with_who_alias(src_db: Path, dest: Path, present: bool) -> Path:
    """A copy of the framework DB where `who` IS (or is NOT) an alias of the `attribution` slot. The live DB is only
    ever opened read-only; the copy is written through sqlite's own backup API."""
    import sqlite3
    source = sqlite3.connect(f"file:{src_db.as_posix()}?mode=ro", uri=True)
    target = sqlite3.connect(str(dest))
    source.backup(target)
    source.close()
    aliases = json.loads(target.execute("SELECT aliases FROM slots WHERE slot_name = 'attribution' AND scope = 'element'").fetchone()[0])
    aliases = [a for a in aliases if a != "who"] + (["who"] if present else [])
    target.execute("UPDATE slots SET aliases = ? WHERE slot_name = 'attribution' AND scope = 'element'", (json.dumps(aliases),))
    target.commit()
    target.close()
    return dest


@pytest.fixture(scope="module")
def marked_run():
    """The run copy the pipeline would hand the annotator: the real draft with its loops expanded and marked."""
    from js_content_resolver import resolve_js_array_content_with_report
    raw = (EYE_CARE_V2 / "Eye Care Birmingham.dc.html").read_text(encoding="utf-8")
    html, count, report = resolve_js_array_content_with_report(raw, EYE_CARE_V2)
    if count == 0:
        pytest.skip("no browser available here: %s" % report)
    return {"html": html, "report": report}


@pytest.fixture(scope="module")
def alias_dbs(tmp_path_factory):
    folder = tmp_path_factory.mktemp("slot-dbs")
    return {"with": _with_who_alias(DbBlockLookup.DEFAULT_DB, folder / "with-who.db", True),
            "without": _with_who_alias(DbBlockLookup.DEFAULT_DB, folder / "without-who.db", False)}


def _annotated(html: str, db: Path | None = None, **kwargs):
    lookup = DbBlockLookup(db_path=db)
    try:
        out, rows = annotate_from_manifest(html, lookup, **kwargs)
    finally:
        lookup.close()
    return out, {r["root_class"]: r for r in rows}


def _draft_reviews(marked: str) -> list[dict[str, str]]:
    """Every review's own values, read from the markers the real browser run left (so they are the draft's data)."""
    import html as _h
    cards = re.split(r'<figure style="margin:0;background:#fff;border:1px solid #E8EAED', marked.split('class="rev-rail"', 1)[1])[1:]
    out = []
    for card in cards:
        fields = {name: _h.unescape(v) for name, v in re.findall(r'data-src-field="(\w+)"[^>]*>([^<]*)<', card)}
        if "who" in fields:
            out.append(fields)
    return out


def _google_reviews_block(markup: str) -> dict:
    return json.loads(re.search(r"wp:sgs/google-reviews (\{.*?\}) /?-->", markup, re.S).group(1))


@needs_db
def test_the_real_databases_slot_table_lists_author_under_two_slots_and_only_reads(alias_dbs):
    lookup = DbBlockLookup()
    try:
        assert lookup.slots_of("author") >= {"attribution", "text"} and lookup.slots_of("Author") == lookup.slots_of("author")
        assert lookup.slots_of("no-such-field-name") == frozenset()
    finally:
        lookup.close()
    with_who = DbBlockLookup(db_path=alias_dbs["with"])
    try:
        assert with_who.slots_of("who") == frozenset({"attribution"})
    finally:
        with_who.close()


@needs_db
@needs_draft
def test_eye_care_reviews_become_a_google_reviews_block_with_every_field_the_draft_names(marked_run, alias_dbs):
    """END TO END. Real draft -> real browser -> markers -> annotation (DB has the `who` synonym) -> the UNCHANGED
    converter. 13 reviews, each with author, text, date and meta, none of it missing, none in the wrong field."""
    out, rows = _annotated(marked_run["html"], alias_dbs["with"])
    row = rows["sgs-google-reviews"]
    assert row["status"] == "applied" and row["items"] == 13 and row["fields"] == ["author", "text", "date", "meta"]
    assert "data-src-field" not in out
    markup = _convert(_element(out, "sgs-google-reviews"), out)
    assert "data-src-field" not in markup
    assert "wp:sgs/google-reviews" in markup and "Anonymous M." in markup
    block = _google_reviews_block(markup)
    expected = _draft_reviews(marked_run["html"])
    assert len(block["reviews"]) == 13 == len(expected)
    for got, want in zip(block["reviews"], expected):
        assert (got["author"], got["text"], got["date"], got["meta"]) == (want["who"], want["text"], want["date"], want["meta"])
    assert any(r["text"].startswith("I have had the pleasure of being a patient of Ward End Eye Care") for r in block["reviews"])


@needs_db
@needs_draft
def test_h1_author_and_text_do_not_collapse_into_one_field_although_the_alias_overlap_exists(marked_run, alias_dbs):
    """H1 (an investigator's hypothesis): `author` is an alias of both `attribution` and `text`, so `__author` and
    `__text` might resolve to one slot and put the review body in the name field. Refuted on the real output: the
    array resolver matches the block's own item keys, so the names stay names and the bodies stay bodies."""
    out, _ = _annotated(marked_run["html"], alias_dbs["with"])
    block = _google_reviews_block(_convert(_element(out, "sgs-google-reviews"), out))
    authors, texts = {r["author"] for r in block["reviews"]}, {r["text"] for r in block["reviews"]}
    assert authors == {w["who"] for w in _draft_reviews(marked_run["html"])} and len(authors) == 13
    assert not (authors & texts) and all(" " in t for t in texts)


@needs_db
@needs_draft
def test_the_decorative_google_g_mark_is_never_lifted_as_a_reviewers_photo(marked_run, alias_dbs):
    """H2, resolved by the decorative-image rule (converter/services/lift_helpers.py::is_decorative_img). The only image in
    a card is the 17px Google 'G' mark (aria-hidden), which used to be lifted as `photo` on every review, leaving 13
    broken images because WordPress refuses .svg uploads. It must not be lifted now."""
    out, _ = _annotated(marked_run["html"], alias_dbs["with"])
    block = _google_reviews_block(_convert(_element(out, "sgs-google-reviews"), out))
    assert all("photo" not in r for r in block["reviews"])
    assert all(not ({"rating", "avatarColour", "initial"} & set(r)) for r in block["reviews"])          # still not populated
    assert [i for i, r in enumerate(block["reviews"]) if "url" in r] == [2]      # only the long review has a link to lift


@needs_db
@needs_draft
def test_without_the_synonym_the_reviews_are_withheld_and_the_section_survives_as_ordinary_blocks(marked_run, alias_dbs):
    """Negative control for the DB rung. `who` has no synonym, `author` is free, so nothing is guessed."""
    out, rows = _annotated(marked_run["html"], alias_dbs["without"])
    row = rows["sgs-google-reviews"]
    assert row["status"] == "rejected" and "'who'" in row["reason"] and "withheld" in row["reason"]
    assert _element(out, "sgs-google-reviews") == MARKER_RE.sub("", _element(marked_run["html"], "sgs-google-reviews"))
    markup = _convert(_element(out, "sgs-google-reviews"), out)
    assert "wp:sgs/google-reviews" not in markup and "Anonymous M." in markup and "data-src-field" not in markup


@needs_db
@needs_draft
def test_a_manifest_field_map_reaches_the_same_result_without_any_synonym_row(marked_run, alias_dbs):
    manifest = re.search(r"(<script[^>]*data-sgs-manifest[^>]*>)(.*?)(</script>)", marked_run["html"], re.S)
    data = json.loads(manifest.group(2))
    group = next(g for g in data["repeatedGroups"] if g["section"] == "sgs-google-reviews")
    group["fieldMap"] = {"who": "author", "initial": None}
    html = marked_run["html"][:manifest.start(2)] + json.dumps(data) + marked_run["html"][manifest.end(2):]
    out, rows = _annotated(html, alias_dbs["without"])
    assert rows["sgs-google-reviews"]["status"] == "applied" and rows["sgs-google-reviews"]["fields"] == ["author", "text", "date", "meta"]
    block = _google_reviews_block(_convert(_element(out, "sgs-google-reviews"), out))
    assert len(block["reviews"]) == 13 and all(r["author"] and r["text"] and r["date"] and r["meta"] for r in block["reviews"])


@needs_db
@needs_draft
def test_the_brand_marquee_lifts_sixteen_logos_not_thirty_two(marked_run, alias_dbs):
    out, rows = _annotated(marked_run["html"], alias_dbs["with"])
    assert rows["sgs-brand-marquee"]["status"] == "applied" and rows["sgs-brand-marquee"]["items"] == 16
    markup = _convert(_element(out, "sgs-brand-marquee"), out)
    block = json.loads(re.search(r"wp:sgs/brand-strip (\{.*?\}) /?-->", markup, re.S).group(1))
    assert len(block["logos"]) == 16 and block["logos"][0]["media"]["alt"] == "Ray-Ban"
    assert len({logo["media"]["alt"] for logo in block["logos"]}) == 16
    assert "data-src-field" not in markup


# --------------------------------------------------------------------------------------------------------------
# FR-31-31 rule 6, at the orchestrator: a field marker NEVER reaches the converter, whichever branch of Stage -1.44 ran
# --------------------------------------------------------------------------------------------------------------
# The resolver stamps markers whenever the draft mentions `data-sgs-manifest` (a bare-word test, valid JSON not
# needed). The annotator strips what it returns, but only the orchestrator decides which file the converter reads,
# so these run the REAL Stage -1.44 source: no sectionBlocks (no rows), an annotator that raises, and the opt-out.

MARKED_BODY = '<div class="card"><b data-src-field="who">Ada</b><i data-src-field-title="t">x</i></div>'


def _marked_draft(manifest: str = '{"note": "no sectionBlocks here"}') -> str:
    return (f'<html><body>{MARKED_BODY}<script type="application/json" data-sgs-manifest>{manifest}</script>'
            "</body></html>")


def _assert_converter_input_is_clean(args, mockup: Path, expected_body_without_markers: str = None) -> str:
    seen = args.mockup.read_text(encoding="utf-8")
    assert "data-src-field" not in seen, f"markers reach the converter through {args.mockup}"
    assert 'class="card"' in seen and ">Ada<" in seen                      # nothing but the markers was lost
    assert "data-src-field" in mockup.read_text(encoding="utf-8")            # the source draft itself is never edited
    return seen


def _loader_where_annotation_raises(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    if hasattr(module, "annotate_from_manifest"):
        def boom(*_a, **_k):
            raise RuntimeError("annotator exploded")
        module.annotate_from_manifest = boom
    if hasattr(module, "LOG_PATH"):
        raise AssertionError("the decision log must not be loaded on this path")
    return module


@needs_db
def test_markers_never_reach_the_converter_when_the_manifest_has_no_section_blocks(tmp_path):
    """Path 1: the annotator returns `(stripped html, [])`. The old stage only repointed inside `if rows:`."""
    args, run_dir, mockup = _run_stage(tmp_path, _marked_draft())
    _assert_converter_input_is_clean(args, mockup)
    assert not (run_dir / "manifest-annotation-report.json").exists()


def test_markers_never_reach_the_converter_when_the_annotator_raises(tmp_path):
    """Path 2: the `except` branch used to leave the marked copy in place."""
    args, run_dir, mockup = _run_stage(tmp_path, _marked_draft(), load=_loader_where_annotation_raises)
    _assert_converter_input_is_clean(args, mockup)
    assert args.mockup == run_dir / "field-markers-stripped.html"


def test_markers_never_reach_the_converter_under_no_manifest_annotation(tmp_path):
    """Path 3: the opt-out skips the annotator, and the resolver has already marked the copy."""
    args, run_dir, mockup = _run_stage(tmp_path, _marked_draft(), flag=False)
    _assert_converter_input_is_clean(args, mockup)
    assert args.mockup == run_dir / "field-markers-stripped.html"


def test_a_marked_run_copy_that_cannot_be_stripped_stops_the_run(tmp_path):
    """The guard fails closed: a leaked marker is a rule violation, so an unloadable strip is an error, not a skip."""
    def broken(name, path):
        raise RuntimeError("no module")

    with pytest.raises(RuntimeError, match="could not be stripped"):
        _run_stage(tmp_path, _marked_draft(), flag=False, load=broken)


def test_a_draft_without_markers_is_left_exactly_as_it_was_and_loads_nothing(tmp_path):
    """The guard's cheap test: no `data-src-field` in the file, so no module load and no new file."""
    def must_not_load(name, path):
        raise AssertionError("no module should load for an unmarked draft")

    args, run_dir, mockup = _run_stage(tmp_path, "<p>plain</p>", flag=False, load=must_not_load)
    assert args.mockup == mockup and list(run_dir.iterdir()) == []


@needs_db
@needs_draft
def test_the_real_marked_draft_never_reaches_the_converter_with_markers_on_any_path(marked_run, tmp_path):
    """The real Eye Care run copy, resolved by the real browser, run through the real stage with annotation OFF."""
    assert "data-src-field" in marked_run["html"]
    args, _run_dir, _mockup = _run_stage(tmp_path, marked_run["html"], flag=False)
    assert "data-src-field" not in args.mockup.read_text(encoding="utf-8")


STRIP_CASES = {
    "an element attribute": ('<b data-src-field="who" class="x">A</b>', '<b class="x">A</b>'),
    "an attribute-marker variant, single-quoted": ("<img data-src-field-alt='n' src=\"a.png\">", '<img src="a.png">'),
    "an unquoted value across a newline": ("<p\n data-src-field=who\n class=a>t</p>", "<p\n class=a>t</p>"),
    "a marker on a tag inside <pre>": ('<pre><b data-src-field="x">y</b></pre>', "<pre><b>y</b></pre>"),
    "a marker beside a data-src-field lookalike in a value": (
        '<a title="data-src-field=1" data-src-field="f">z</a>', '<a title="data-src-field=1">z</a>'),
}
STRIP_UNTOUCHED = {
    "a text node": '<p>the attribute data-src-field="x" is documented</p>',
    "escaped markup in a <pre> sample": '<pre>&lt;b data-src-field="x"&gt;</pre>',
    "a <script>": "<script>var s = '<b data-src-field=1>';</script>",
    "a <style>": '<style>[data-src-field="x"] { color: red }</style>',
    "a <textarea>": '<textarea><b data-src-field="x"></textarea>',
    "a comment": '<!-- <b data-src-field="x"> -->',
    "lookalike attribute names": '<p data-src-fields="k" data-src="k" data-sgs-fx="1">y</p>',
}


@pytest.mark.parametrize("label", sorted(STRIP_CASES))
def test_strip_field_markers_removes_real_attributes_on_real_tags(label):
    from manifest_annotation import strip_field_markers
    before, after = STRIP_CASES[label]
    assert strip_field_markers(before) == after


@pytest.mark.parametrize("label", sorted(STRIP_UNTOUCHED))
def test_strip_field_markers_leaves_text_scripts_styles_and_comments_alone(label):
    """The old regex ran over the whole document, so it ate the same words wherever they appeared."""
    from manifest_annotation import strip_field_markers
    assert strip_field_markers(STRIP_UNTOUCHED[label]) == STRIP_UNTOUCHED[label]


def test_strip_field_markers_is_idempotent_and_leaves_a_clean_document_byte_identical():
    from manifest_annotation import strip_field_markers
    doc = "".join(before for before, _ in STRIP_CASES.values()) + "".join(STRIP_UNTOUCHED.values())
    once = strip_field_markers(doc)
    assert strip_field_markers(once) == once and once != doc
    clean = "<div class='a'>" + chr(13) + chr(10) + " é <p>x</p></div>"
    assert strip_field_markers(clean) is clean


@needs_db
@needs_draft
def test_the_other_declarations_on_the_real_draft_are_unaffected_by_markers(marked_run, alias_dbs):
    out, rows = _annotated(marked_run["html"], alias_dbs["with"])
    assert rows["sgs-trust-ticker"]["status"] == "applied" and rows["sgs-trust-ticker"]["fields"] == ["label"]
    assert rows["sgs-hero"]["status"] == "applied" and rows["sgs-about-strip"]["status"] == "queued"
    twice, again = _annotated(out, alias_dbs["with"])
    assert twice == out                                       # HTML idempotent on the annotated, marker-free copy


_LIVE_HAS_WHO = None


def _live_has_who() -> bool:
    global _LIVE_HAS_WHO
    if _LIVE_HAS_WHO is None:
        try:
            lookup = DbBlockLookup()
            _LIVE_HAS_WHO = "attribution" in lookup.slots_of("who")
            lookup.close()
        except FileNotFoundError:
            _LIVE_HAS_WHO = False
    return _LIVE_HAS_WHO


@needs_db
@needs_draft
@pytest.mark.skipif(not _live_has_who(), reason="the live framework DB has no `who` alias on the `attribution` slot yet: "
                    "add \"who\" to that row's aliases in plugins/sgs-blocks/scripts/data/slots.json and re-seed")
def test_the_live_database_carries_the_who_synonym_once_seeded(marked_run):
    out, rows = _annotated(marked_run["html"])
    assert rows["sgs-google-reviews"]["status"] == "applied" and rows["sgs-google-reviews"]["items"] == 13
