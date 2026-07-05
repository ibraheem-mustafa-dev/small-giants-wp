"""test_foreign_identity_lift.py — D279 leg-2 FOREIGN-IDENTITY arm proofs.

Spec 31 §13.3 FR-31-2.6 (walk.py NESTED leg 2). Covers the QC-council-amended
build: a child element whose BEM class belongs to a DIFFERENT, DB-registered
block (e.g. a plain <a class="sgs-button sgs-button--primary">) that is
EXACTLY the identity one or more of the parent's own content attrs declare
(db_lookup.equivalent_block_for) now lifts into those attrs instead of being
silently dropped — the product-card CTA bug (sites/mamas-munches/mockups/
homepage/index.html line ~861: <a href="/product/zookies/" class="sgs-button
sgs-button--primary">Add to Cart — £10</a>).

Per project convention (`synthetic-fixture-green-not-real-draft-correct` —
STOP-34), the PRIMARY proof (test 1) runs the real production entry point
against the REAL mockup HTML, not a hand-built node — a synthetic fixture can
take a different recognition path than the real draft and pass while real
input fails. The remaining tests plant specific mechanism edges (array-guard,
first-wins, consumed_ids) that are not reachable via the current real draft
and use monkeypatch in the same style as test_walk_registry.py.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_foreign_identity_lift.py -q --import-mode=importlib
"""
from __future__ import annotations

import importlib.util as _importlib_util
import sys
from pathlib import Path

from bs4 import BeautifulSoup

from converter.context import ChildBlock, Recognition, ScalarLift
from converter.db import db_lookup
from converter.recognition import recognise
from converter.services.assembly import build_block_markup
from converter import walk

# ---------------------------------------------------------------------------
# Load tests/seed_conformance_goldens.py by FILE PATH (mirrors
# test_metamorphic_real_draft.py's own setup — several sibling "tests"
# directories in this repo make a bare package import unreliable under a
# combined multi-path pytest run).
# ---------------------------------------------------------------------------

_SCRIPTS_ROOT = Path(__file__).resolve().parents[2]  # plugins/sgs-blocks/scripts
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

_SEED_MODULE_PATH = _SCRIPTS_ROOT / "tests" / "seed_conformance_goldens.py"
_seed_spec = _importlib_util.spec_from_file_location(
    "sgs_conformance_golden_seeder_fil", _SEED_MODULE_PATH
)
_seed_mod = _importlib_util.module_from_spec(_seed_spec)
_seed_spec.loader.exec_module(_seed_mod)  # type: ignore[union-attr]

collect_real_draft_sections = _seed_mod.collect_real_draft_sections
run_converter_full = _seed_mod.run_converter_full


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def _real_draft_section(suffix: str):
    """Return the real-draft (tag, css_text) pair whose golden_id ends with
    ``suffix`` (e.g. 'featured-product', 'gift-section')."""
    for gid, tag, css in collect_real_draft_sections():
        if gid.endswith(suffix):
            return tag, css
    raise AssertionError(f"No real-draft section found ending with {suffix!r}")


# ---------------------------------------------------------------------------
# 1. REAL-DRAFT: the featured product card lifts BOTH ctaText and ctaUrl
# ---------------------------------------------------------------------------

def test_real_draft_featured_card_lifts_both_cta_attrs():
    """The real mockup's featured product card
    (<a href="/product/zookies/" class="sgs-button sgs-button--primary">Add
    to Cart — £10</a>) must land as ctaText + ctaUrl on the emitted
    sgs/product-card, run through the REAL production entry point against
    the REAL draft file (not a synthetic node — STOP-34)."""
    tag, css = _real_draft_section("featured-product")
    result = run_converter_full(tag, css)
    markup = result["block_markup"]

    assert '"ctaText":"Add to Cart \\u2014 \\u00a310"' in markup, markup[:800]
    assert '"ctaUrl":"/product/zookies/"' in markup, markup[:800]


def test_real_draft_trial_card_gets_its_own_distinct_cta_not_the_featured_cards():
    """The second ('trial') product card in the same real section has its
    OWN CTA (<a href="/product/trial-pack/" class="sgs-button
    sgs-button--secondary">Try 3 for £5</a>) — uniqueness: it must get ITS
    OWN ctaText/ctaUrl, never the featured card's values."""
    tag, css = _real_draft_section("featured-product")
    result = run_converter_full(tag, css)
    markup = result["block_markup"]

    assert '"ctaText":"Try 3 for \\u00a35"' in markup, markup[:800]
    assert '"ctaUrl":"/product/trial-pack/"' in markup, markup[:800]

    # Uniqueness: the trial card block must not carry the featured card's CTA.
    cards = markup.split("<!-- wp:sgs/product-card ")
    assert len(cards) == 3, f"expected 2 product-card comments, got {len(cards) - 1}"
    featured_card, trial_card = cards[1], cards[2]
    assert "/product/zookies/" in featured_card and "/product/zookies/" not in trial_card
    assert "/product/trial-pack/" in trial_card and "/product/trial-pack/" not in featured_card


# ---------------------------------------------------------------------------
# 2. REAL-DRAFT: the announcement-strip plain link gets inheritStyle='custom'
# ---------------------------------------------------------------------------

def test_real_draft_plain_contextual_link_gets_custom_inherit_style():
    """The gift-section announcement strip's <a href="/send-to-ward/">Find
    out more →</a> carries NEITHER a bare 'sgs-button' class NOR any
    'sgs-button--*' modifier — it is a plain contextual link, atomic-tag-
    swapped to sgs/button. It must emit inheritStyle='custom', never fall
    through to the block's default 'primary' preset look (Part 7 / UX-Q2)."""
    tag, css = _real_draft_section("gift-section")
    result = run_converter_full(tag, css)
    markup = result["block_markup"]

    idx = markup.find("Find out more")
    assert idx != -1, "the plain contextual link's text did not survive the clone"
    # The nearest preceding wp:sgs/button comment is this link's own block.
    button_start = markup.rfind("<!-- wp:sgs/button", 0, idx)
    assert button_start != -1
    button_comment_end = markup.find("-->", button_start)
    button_attrs = markup[button_start:button_comment_end]
    assert '"inheritStyle":"custom"' in button_attrs, button_attrs


def test_real_draft_modifier_button_still_maps_via_inherit_style_for_modifier():
    """Regression: a genuine modifier button elsewhere in the same section
    (<a class="sgs-button sgs-button--primary">Shop Gift Box</a>) must keep
    resolving inheritStyle via the EXISTING preset-match path — the Part 7
    fallback must never fire for it."""
    tag, css = _real_draft_section("gift-section")
    result = run_converter_full(tag, css)
    markup = result["block_markup"]

    idx = markup.find("Shop Gift Box")
    assert idx != -1
    button_start = markup.rfind("<!-- wp:sgs/button", 0, idx)
    button_comment_end = markup.find("-->", button_start)
    button_attrs = markup[button_start:button_comment_end]
    assert '"inheritStyle":"primary"' in button_attrs, button_attrs


# ---------------------------------------------------------------------------
# 3. Multi-attr / first-wins (Amendments 1 + 4) — plant test, product-card
# ---------------------------------------------------------------------------

def test_multi_attr_lift_covers_both_attrs_and_first_wins_on_a_second_button():
    """A product-card body with TWO qualifying `sgs-button` anchors: the
    FIRST populates both ctaText AND ctaUrl (multi-attr loop, Amendment 1);
    a SECOND button must never overwrite either attr (first-wins, Amendment
    4) — proving lifted_attrs correctly gates the foreign-identity arm same
    as the family-element arm."""
    node = _node(
        '<div class="sgs-product-card">'
        '  <div class="sgs-product-card__body">'
        '    <a class="sgs-button sgs-button--primary" href="/first/">First CTA</a>'
        '    <a class="sgs-button sgs-button--secondary" href="/second/">Second CTA</a>'
        "  </div>"
        "</div>"
    )
    rec = recognise(node)
    assert rec.slug == "sgs/product-card"

    results = walk.run_universal_content_walk(rec, node, media_map={}, css_rules={})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert lifts.get("ctaText") == "First CTA", lifts
    assert lifts.get("ctaUrl") == "/first/", lifts
    # First-wins: the second button's values must NOT appear anywhere.
    assert "Second CTA" not in lifts.values()
    assert "/second/" not in lifts.values()
    # Exactly one ScalarLift per attr — no duplicate/overwrite entries.
    cta_text_lifts = [r for r in results if isinstance(r, ScalarLift) and r.attr == "ctaText"]
    cta_url_lifts = [r for r in results if isinstance(r, ScalarLift) and r.attr == "ctaUrl"]
    assert len(cta_text_lifts) == 1
    assert len(cta_url_lifts) == 1


# ---------------------------------------------------------------------------
# 4. Array-ownership guard (Amendment 3) — plant test, product-card
# ---------------------------------------------------------------------------

def test_array_owned_button_does_not_leak_into_parent_scalar_attrs():
    """A `sgs-button`-classed link nested INSIDE a product-card pill
    (array-owned unit, canonical_slot='pill' per the D278 packSizes
    override) must NEVER leak into the parent's ctaText/ctaUrl — the array
    arm owns that unit, not leg 2's foreign-identity arm."""
    node = _node(
        '<div class="sgs-product-card">'
        '  <div class="sgs-product-card__pill-group">'
        '    <div class="sgs-product-card__pill">'
        '      <a class="sgs-button sgs-button--primary" href="/inside-pill/">Pill CTA</a>'
        "    </div>"
        "  </div>"
        "</div>"
    )
    rec = recognise(node)
    assert rec.slug == "sgs/product-card"

    results = walk.run_universal_content_walk(rec, node, media_map={}, css_rules={})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert lifts.get("ctaText") != "Pill CTA"
    assert lifts.get("ctaUrl") != "/inside-pill/"
    assert "ctaText" not in lifts
    assert "ctaUrl" not in lifts


def test_array_owned_guard_does_not_reject_a_legitimate_sibling_cta():
    """Sanity companion to the guard test above: a qualifying button OUTSIDE
    the array-owned pill-group (a sibling, not a descendant of it) must
    still lift normally — the guard must not become over-broad and reject
    everything in the card."""
    node = _node(
        '<div class="sgs-product-card">'
        '  <div class="sgs-product-card__pill-group">'
        '    <div class="sgs-product-card__pill">8-pack</div>'
        "  </div>"
        '  <a class="sgs-button sgs-button--primary" href="/legit/">Buy now</a>'
        "</div>"
    )
    rec = recognise(node)
    results = walk.run_universal_content_walk(rec, node, media_map={}, css_rules={})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert lifts.get("ctaText") == "Buy now", lifts
    assert lifts.get("ctaUrl") == "/legit/", lifts


# ---------------------------------------------------------------------------
# 5. consumed_ids prevents double-routing (Amendment 4) — plant test
# ---------------------------------------------------------------------------

def test_consumed_ids_excludes_the_lifted_element_from_the_child_leg(monkeypatch):
    """When the foreign-identity arm lifts an element into a 'nested' attr,
    that element's id() must be added to consumed_ids so the CHILD leg
    (run_mechanism_b's composite-interior column walk, which the SAME
    exclude_ids frozenset already protects for the family-element leg) never
    ALSO tries to route it — proven here by forcing a delegates_content=1,
    is_class_section_block=True block (sgs/hero) to treat its CTA identity
    as 'nested' (monkeypatched — the REAL hero seeds these 'child', so this
    plants the edge the real DB doesn't currently exercise) and asserting
    the bare-root <a class="sgs-button..."> produces ONLY the two
    ScalarLifts, with NO 'cannot route by slot' ContentGap or duplicate
    ChildBlock for the same element."""
    real_content_attrs_for_identity = db_lookup.content_attrs_for_identity

    def _fake(parent_slug, identity_slug):
        if parent_slug == "sgs/hero" and identity_slug == "sgs/button":
            return [
                ("ctaPrimaryText", "nested", "text-content", "string"),
                ("ctaPrimaryUrl", "nested", "link-href", "string"),
            ]
        return real_content_attrs_for_identity(parent_slug, identity_slug)

    monkeypatch.setattr(db_lookup, "content_attrs_for_identity", _fake)

    node = _node(
        '<div class="sgs-hero">'
        '  <a class="sgs-button sgs-button--primary" href="/x">Go</a>'
        "</div>"
    )
    rec = recognise(node)
    assert rec.slug == "sgs/hero"
    assert rec.delegates_content == 1  # the CHILD leg must actually run

    results = walk.run_universal_content_walk(rec, node, media_map={}, css_rules={})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert lifts.get("ctaPrimaryText") == "Go", results
    assert lifts.get("ctaPrimaryUrl") == "/x", results
    assert not any(isinstance(r, ChildBlock) for r in results), (
        "the lifted element must not ALSO be emitted as a child block: " f"{results}"
    )
    gap_details = [r.detail for r in results if hasattr(r, "detail")]
    assert not any("cannot route by slot" in d for d in gap_details), (
        "consumed_ids did not exclude the lifted element from the CHILD leg: "
        f"{gap_details}"
    )


# ---------------------------------------------------------------------------
# 6. No regression on a genuine no-match (Case 7 — true no-op)
# ---------------------------------------------------------------------------

def test_unregistered_bare_class_produces_no_scalar_lift_and_no_crash():
    """A bare-root class that does NOT resolve to any registered block (e.g.
    a draft author's ad-hoc `sgs-cookie-banner` wrapper) must be a true
    no-op for the foreign-identity arm — never a crash, never a spurious
    lift."""
    node = _node(
        '<div class="sgs-product-card">'
        '  <div class="sgs-cookie-banner">Not a registered block</div>'
        "</div>"
    )
    rec = recognise(node)
    results = walk.run_universal_content_walk(rec, node, media_map={}, css_rules={})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert "ctaText" not in lifts
    assert "ctaUrl" not in lifts


def test_element_suffixed_foreign_class_does_not_hijack_a_different_blocks_slot_child():
    """D279 QC regression guard: an __element-suffixed class belonging to a
    DIFFERENT block family (e.g. a draft author reusing
    `sgs-accordion__heading` inside an `sgs/accordion-item`) must NEVER be
    treated as a foreign-identity bare-root match — only a genuine bare
    block-root class (element=None) qualifies. Mirrors the real
    tests/fixtures/conformance/sgs-accordion.html golden fixture that caught
    this live."""
    node = _node(
        '<div class="sgs-accordion-item">'
        '  <h3 class="sgs-accordion__heading">What are the ingredients?</h3>'
        "</div>"
    )
    rec = recognise(node)
    assert rec.slug == "sgs/accordion-item"
    results = walk.run_universal_content_walk(rec, node, media_map={}, css_rules={})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    # The heading must NOT be lifted into accordion-item's 'title' via the
    # foreign-identity arm (it belongs to the CHILD leg's own slot-fallback
    # child routing, which emits a child sgs/heading block instead).
    assert lifts.get("title") != "What are the ingredients?"
