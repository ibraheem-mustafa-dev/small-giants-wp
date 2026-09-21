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
