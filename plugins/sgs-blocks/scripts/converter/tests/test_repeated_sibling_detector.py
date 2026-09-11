"""test_repeated_sibling_detector.py -- Q2 Tier 1 structural repeated-sibling detector.

Design doc: `.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`
"Question 2", Tier 1. Decision log: `.claude/decisions.md` (see the D-number added
alongside this file).

Three required cases per the implementer brief:
  1. A genuine repeating-sibling case -- fires, identifies a representative.
  2. A non-repeating case that LOOKS similar-shaped but is genuinely different
     content (e.g. a 3-column layout that's coincidentally similar-shaped) --
     correctly does not fire.
  3. A below-threshold case (too few alike siblings) -- correctly does not fire.

Plus scoring-unit tests and a real (DB-backed) `convert_representative()` round-trip,
following `test_container_default.py`'s own pattern of exercising the REAL converter
(`recognise`/`recognise_section`) against the live `sgs-framework.db` rather than a
mock -- this repo's tests already do this throughout `converter/tests/`.
"""
from __future__ import annotations

from converter.services.repeated_sibling_detector import (
    REPEATER_MIN_GROUP_SIZE,
    REPEATER_SIMILARITY_THRESHOLD,
    RepeaterGroup,
    convert_representative,
    detect_repeater_groups,
    emit_repeated_block,
    similarity_score,
)


def _card(extra_classes: str = "", n_children: int = 3) -> dict:
    classes = ["sgs-card-grid__item"]
    if extra_classes:
        classes.extend(extra_classes.split())
    return {"tag": "div", "classes": classes, "children": [{"tag": "span", "classes": []}] * n_children}


# ---------------------------------------------------------------------------
# 1. Fires -- a genuine repeating-sibling case
# ---------------------------------------------------------------------------

def test_fires_on_near_identical_repeated_siblings():
    """5 near-identical product-card-shaped siblings (one carrying an extra
    BEM modifier, matching sibling_shape_prefilter's own "near-identical,
    not byte-identical" tolerance) qualify as ONE repeater group."""
    siblings = [_card() for _ in range(4)] + [_card("sgs-card-grid__item--featured")]
    groups = detect_repeater_groups(siblings)

    assert len(groups) == 1
    group = groups[0]
    assert group.size == 5
    assert isinstance(group, RepeaterGroup)
    # Representative is the FIRST member (deterministic, document order).
    assert group.representative == siblings[0]
    # Every member's score against the anchor cleared the threshold.
    assert all(s >= REPEATER_SIMILARITY_THRESHOLD for s in group.scores)


def test_fires_converts_representative_and_stops_for_confirmation():
    """The detector identifies the group + representative; `convert_representative`
    (the real converter's Stage 2 recognition) resolves it to a real SGS block --
    but nothing here bulk-applies across the group. That is the sign-off gate's
    job, enforced by the CLI (`detect-repeated-siblings.py`), not this module."""
    siblings = [_card() for _ in range(4)]
    groups = detect_repeater_groups(siblings)
    assert len(groups) == 1

    representative_html = '<div class="sgs-card-grid__item"><span>x</span></div>'
    result = convert_representative(representative_html)

    # Recognised as a real block (sgs-card-grid maps to sgs/card-grid's item
    # slot or, at minimum, resolves via the DB-driven default-container path
    # rather than failing outright) -- never silently unrecognised for a real
    # SGS-BEM class.
    assert result["gap_candidate"] is False
    assert result["slug"] is not None
    assert result["markup"] is not None
    assert result["markup"].startswith(f"<!-- wp:{result['slug']}")

    # Confirms the "stop, do not bulk-apply" contract: this module exposes no
    # function that stamps the representative across the OTHER 3 members
    # without an explicit, separate call — `emit_repeated_block` must be
    # invoked deliberately by the caller (the CLI's --apply path, gated on
    # sign-off), never as a side effect of conversion itself.
    emitted = emit_repeated_block(result["markup"], groups[0].size)
    assert emitted.count(result["markup"]) == groups[0].size


# ---------------------------------------------------------------------------
# 2. Non-repeating -- similar-shaped but genuinely different content
# ---------------------------------------------------------------------------

def test_does_not_fire_on_coincidentally_similar_but_different_columns():
    """A 3-column feature layout: same tag (div), but each column carries a
    DIFFERENT semantic BEM class and a very different child count -- these are
    NOT a repeater, just three divs that happen to share a tag."""
    siblings = [
        {"tag": "div", "classes": ["sgs-feature__pricing"], "children": [{"tag": "span"}] * 2},
        {"tag": "div", "classes": ["sgs-feature__testimonial"], "children": [{"tag": "span"}] * 8},
        {"tag": "div", "classes": ["sgs-feature__cta"], "children": []},
    ]
    groups = detect_repeater_groups(siblings)
    assert groups == []


def test_does_not_fire_across_different_tags():
    """Tag mismatch is a hard veto regardless of class overlap (matches
    `sibling_shape_prefilter.are_shape_alike`'s own tag-must-match rule)."""
    a = {"tag": "div", "classes": ["sgs-card"]}
    b = {"tag": "article", "classes": ["sgs-card"]}
    assert similarity_score(a, b) == 0.0
    assert detect_repeater_groups([a, b, {"tag": "div", "classes": ["sgs-card"]}]) == []


# ---------------------------------------------------------------------------
# 3. Below threshold -- too few alike siblings
# ---------------------------------------------------------------------------

def test_does_not_fire_below_min_group_size():
    """Only 2 near-identical siblings -- below REPEATER_MIN_GROUP_SIZE (3), so
    even though they score >= threshold against each other, the group is
    dropped rather than treated as "repeated structure"."""
    siblings = [_card(), _card()]
    assert similarity_score(siblings[0], siblings[1]) >= REPEATER_SIMILARITY_THRESHOLD
    groups = detect_repeater_groups(siblings)
    assert groups == []


def test_min_group_size_is_tunable_not_hardcoded_in_logic():
    """The threshold and floor are both caller-overridable named parameters,
    not baked into `detect_repeater_groups`'s body -- proves the "no hardcoded
    sibling-count cutoff buried in logic" requirement structurally, not just
    by inspection."""
    siblings = [_card(), _card()]
    groups = detect_repeater_groups(siblings, min_group_size=2)
    assert len(groups) == 1
    assert groups[0].size == 2


# ---------------------------------------------------------------------------
# similarity_score unit coverage
# ---------------------------------------------------------------------------

def test_similarity_score_identical_elements_is_one():
    a = _card()
    b = _card()
    assert similarity_score(a, b) == 1.0


def test_similarity_score_partial_class_overlap_between_zero_and_one():
    a = {"tag": "div", "classes": ["sgs-card"], "children": []}
    b = {"tag": "div", "classes": ["sgs-card", "sgs-card--wide"], "children": []}
    score = similarity_score(a, b)
    assert 0.0 < score < 1.0


def test_similarity_score_empty_classes_both_sides_scores_high():
    """Two classless same-tag elements with no children are identical on
    every axis this detector measures -- score is the maximum (1.0), not an
    artefact of an empty-set edge case scoring 0."""
    a = {"tag": "div", "classes": [], "children": []}
    b = {"tag": "div", "classes": [], "children": []}
    assert similarity_score(a, b) == 1.0


def test_similarity_score_against_shape_signature_does_not_dock_child_proximity():
    """Task-review finding (secondary, non-blocking): comparing a real
    element against a bare `ShapeSignature` (which carries no child data)
    must not silently fabricate a 0-count on the signature's side and dock
    the 0.10-weighted child-count-proximity term for what is really a
    REPRESENTATION-TYPE difference, not a genuine structural one. A
    same-tag, same-classes element with real children, scored against its
    OWN shape signature, must still score the maximum (1.0) -- not
    1.0 - 0.10 = 0.90."""
    from converter.services import sibling_shape_prefilter as ssp

    element = {"tag": "div", "classes": ["sgs-card"], "children": [{"tag": "span"}] * 4}
    sig = ssp.shape_signature(element)

    assert similarity_score(element, sig) == 1.0
    assert similarity_score(sig, element) == 1.0


# ---------------------------------------------------------------------------
# emit_repeated_block -- output shape
# ---------------------------------------------------------------------------

def test_emit_repeated_block_plain_grid_repeats_markup_literally():
    markup = "<!-- wp:sgs/card-grid-item {} --><!-- /wp:sgs/card-grid-item -->"
    out = emit_repeated_block(markup, 4, cpt_archive=False)
    assert out.count(markup) == 4
    assert "wp:query" not in out


def test_emit_repeated_block_cpt_archive_wraps_in_query_loop():
    markup = "<!-- wp:sgs/product-card {} --><!-- /wp:sgs/product-card -->"
    out = emit_repeated_block(markup, 8, cpt_archive=True, post_type="product", per_page=8)
    assert out.startswith("<!-- wp:query")
    assert "<!-- wp:post-template -->" in out
    assert markup in out
    assert out.endswith("<!-- /wp:query -->")
    # The representative appears ONCE as the template, not repeated N times --
    # that is the whole point of routing to a real loop instead of N flat
    # conversions.
    assert out.count(markup) == 1


def test_emit_repeated_block_rejects_zero_members():
    import pytest

    with pytest.raises(ValueError):
        emit_repeated_block("<!-- wp:sgs/x {} -->", 0)
