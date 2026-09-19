"""test_variant_detect.py — variant from BEM modifier matched to variant_slots (real).

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_variant_detect.py
Design ref: .claude/plans/2026-06-23-stage2-recognition-design.md §2.
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.services import variant_detect
from converter.services.variant_detect import detect_variant_for_node


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def test_split_modifier_matches():
    node = _node('<section class="sgs-hero sgs-hero--split"></section>')
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", "split")


def test_no_modifier_leaves_default():
    node = _node('<section class="sgs-hero"></section>')
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", None)


def test_non_variant_modifier_ignored():
    # --align-left / --desktop are NOT variant_values -> ignored, no variant.
    node = _node('<section class="sgs-hero sgs-hero--align-left sgs-hero--desktop"></section>')
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", None)


def test_two_distinct_variant_modifiers_is_ambiguous_not_guessed():
    # sgs/hero's 'video' and 'svg-animated' variants were retired 2026-08-12 (dead-variant
    # purge — no shipped draft used them; the shared wrapper already provides video/SVG
    # backgrounds on every variant via bgVideo/bgSvg*). sgs/trust-bar still carries >=2
    # distinct BEM-modifier variants, so it exercises the same ambiguity-detection path.
    node = _node('<div class="sgs-trust-bar sgs-trust-bar--text-only sgs-trust-bar--image-badge"></div>')
    # >=2 distinct variant matches -> None (never guess one), variant_attr still known.
    assert detect_variant_for_node(node, "sgs/trust-bar") == ("badgeStyle", None)


def test_non_variant_block_returns_none_none():
    # sgs/heading declares no variant attr.
    node = _node('<h1 class="sgs-heading sgs-heading--split">x</h1>')
    assert detect_variant_for_node(node, "sgs/heading") == (None, None)


def test_db_coupling_value_comes_from_the_declared_value_set(monkeypatch):
    """The matched value MUST come from the DB, not a literal. Point the declared-value
    set at a DIFFERENT set and the same draft modifier no longer matches.

    REPOINTED 2026-08-07: the source moved from `_variant_slots_map` to
    `declared_variant_values`. The test's INTENT is unchanged and still load-bearing —
    prove the value is read from the database rather than hardcoded — so it is aimed at
    the new source rather than deleted or loosened. (Mocking the old function would now
    prove nothing: the enum would still supply 'split', so the assertion would fail for
    a reason that has nothing to do with hardcoding.)
    """
    node = _node('<section class="sgs-hero sgs-hero--split"></section>')
    # Real DB: 'split' is a declared variant value -> matches.
    assert detect_variant_for_node(node, "sgs/hero")[1] == "split"
    # Mock the DB to NOT contain 'split' -> the modifier no longer matches.
    monkeypatch.setattr(variant_detect.db_lookup, "declared_variant_values",
                        lambda slug: frozenset({"standard"}))
    assert detect_variant_for_node(node, "sgs/hero") == ("variant", None)


def test_variant_with_no_discriminating_slots_still_matches_its_modifier():
    """REGRESSION (2026-08-07). A variant defined by the ABSENCE of attrs has no
    `variant_slots` rows, and the value set used to be read from that table — so a draft
    that NAMED the variant outright fell through to the block default and cloned as
    something else, silently.

    `sgs/trust-bar.text-only` is the live case: it declares an empty discriminator set
    (its character IS the absence of the icon/image attrs), so before this fix
    `--text-only` returned None and the clone rendered as `icon-circle`. The
    discriminable sibling below is the positive control — it passed before AND after, so
    a failure here is about undiscriminable variants specifically, not about detection
    generally.
    """
    assert "text-only" not in {
        v for v, _s in variant_detect.db_lookup._variant_slots_map("sgs/trust-bar")
    }, "premise gone: text-only now HAS discriminating slots, so this no longer tests it"

    node = _node('<div class="sgs-trust-bar sgs-trust-bar--text-only"></div>')
    assert detect_variant_for_node(node, "sgs/trust-bar") == ("badgeStyle", "text-only")

    control = _node('<div class="sgs-trust-bar sgs-trust-bar--image-badge"></div>')
    assert detect_variant_for_node(control, "sgs/trust-bar") == ("badgeStyle", "image-badge")

    # Widening the value set must not make matching permissive: a modifier that names
    # no declared variant still yields None.
    bogus = _node('<div class="sgs-trust-bar sgs-trust-bar--not-a-variant"></div>')
    assert detect_variant_for_node(bogus, "sgs/trust-bar") == ("badgeStyle", None)


# ----------------------------------------------------------------------------
# db_lookup.detect_variant — composition tiebreaker, tiers 1 and 2
# ----------------------------------------------------------------------------
# These tests are HERMETIC: they run against the synthetic throwaway block in
# `converter/tests/_variant_composition_fixture.py` (read its module docstring
# for the three shapes and why each one exists), monkeypatched onto
# `db_lookup`'s variant loaders. No live-DB row can make them pass or fail.

from converter.tests._variant_composition_fixture import (  # noqa: E402
    CHILD_BUTTON,
    CHILD_GRID,
    CHILD_MENU,
    CHILD_TEXT,
    FIXTURE_BLOCK,
    IDENTICAL_A_CHILD_BLOCKS,
    IDENTICAL_CHILD_SLUGS,
    TIED_ATTRS,
    UNIQUE_CHILD_SLUGS,
    db,  # noqa: F401  — the pytest fixture, used by name below
)


def test_detect_variant_0_0_tie_resolved_by_unique_child_slug(db):
    """TIER 1. A variant with no discriminating attributes at all is still
    resolvable when its InnerBlocks seed nests a child block type no sibling
    nests.

    `TIED_ATTRS` matches no variant's discriminating slot value, so every
    variant scores exactly 0 and the attribute-only path returns None via the
    `no_slots_matched` miss. Supplying the real child composition must resolve
    it instead — and the candidate pool has to widen to every DECLARED variant,
    because a variant with no `variant_slots` rows never appears in the score
    list in the first place.
    """
    assert (
        db.detect_variant(FIXTURE_BLOCK, TIED_ATTRS, child_slugs=UNIQUE_CHILD_SLUGS)
        == "unique-child"
    )


def test_detect_variant_0_0_tie_negative_control_without_composition_rows(db, monkeypatch):
    """NEGATIVE CONTROL for the test above — break tier 1's data and it fails.

    With the uniquely-nested-child rows removed, the identical call must return
    None. Without this, the positive test could not distinguish "tier 1 resolved
    it" from "some other path happened to return the right name".
    """
    monkeypatch.setattr(db, "_variant_composition_slots_map", lambda slug: ())
    assert (
        db.detect_variant(FIXTURE_BLOCK, TIED_ATTRS, child_slugs=UNIQUE_CHILD_SLUGS)
        is None
    )


def test_detect_variant_0_0_tie_default_off_path_unchanged(db):
    """The SAME 0-0 tie with `child_slugs` omitted — the pre-existing call shape
    — must still return None. Proves the composition tiebreak is purely
    additive/opt-in and changes nothing for a caller that doesn't pass it.
    """
    assert db.detect_variant(FIXTURE_BLOCK, TIED_ATTRS) is None
    # Explicit None / empty list must behave identically to omission.
    assert db.detect_variant(FIXTURE_BLOCK, TIED_ATTRS, child_slugs=None) is None
    assert db.detect_variant(FIXTURE_BLOCK, TIED_ATTRS, child_slugs=[]) is None


def test_detect_variant_composition_tie_still_ambiguous_falls_through(db):
    """The IDENTICAL-SET child slug list gives tier 1 nothing: neither slug is
    unique to either variant of that pair, so every candidate scores 0 on
    composition too. Composition must never manufacture a result when it has no
    discriminating signal — it falls through to the existing miss behaviour,
    same as the no-`child_slugs` case.
    """
    assert (
        db.detect_variant(FIXTURE_BLOCK, TIED_ATTRS, child_slugs=IDENTICAL_CHILD_SLUGS)
        is None
    )


def test_detect_variant_identical_slug_set_resolves_on_child_attribute_values(db):
    """TIER 2. The pair tier 1 provably cannot reach, separated by the nested
    child's own configuration.

    Both variants of the pair nest the identical child slug set (the test
    directly above pins that tier 1 is blind here). Tier 2 carries two
    discriminating rows for `identical-a`, both written in the tier-object shape
    a real extraction produces, so the exact canonical value match lands.
    """
    assert (
        db.detect_variant(
            FIXTURE_BLOCK,
            TIED_ATTRS,
            child_slugs=IDENTICAL_CHILD_SLUGS,
            child_blocks=IDENTICAL_A_CHILD_BLOCKS,
        )
        == "identical-a"
    )


def test_detect_variant_identical_slug_set_negative_control_dead_tier2_scoring(
    db, monkeypatch
):
    """NEGATIVE CONTROL for the test above — kill tier 2's arithmetic and it fails.

    Forcing `_composition_attr_score` to 0 makes every candidate score 0, which
    must return None. This is what proves the positive result comes from real
    value scoring rather than from the tier declining while some other path
    supplies the answer.
    """
    monkeypatch.setattr(db, "_composition_attr_score", lambda _triples, _children: 0)
    assert (
        db.detect_variant(
            FIXTURE_BLOCK,
            TIED_ATTRS,
            child_slugs=IDENTICAL_CHILD_SLUGS,
            child_blocks=IDENTICAL_A_CHILD_BLOCKS,
        )
        is None
    )


def test_detect_variant_flat_child_attribute_shape_still_fails_closed(db):
    """NEGATIVE CONTROL on the SHAPE — a flat scalar where the seeded value is a
    tier object must resolve to None, not to the variant that seeds it.

    This proves the match is genuinely value-shape-aware (an exact string match
    against the seeded canonical JSON), not merely "some value is present": a
    flat `64` plus a flat mobile sibling can never equal
    `{"desktop":64,"mobile":40}`, so a regression back to the flat write shape
    keeps failing closed rather than half-matching.
    """
    flat_shape = [
        (CHILD_MENU, {"gap": "4px", "itemSize": 64, "itemSizeMobile": 40}),
        (CHILD_BUTTON, {}),
    ]
    assert (
        db.detect_variant(
            FIXTURE_BLOCK,
            TIED_ATTRS,
            child_slugs=IDENTICAL_CHILD_SLUGS,
            child_blocks=flat_shape,
        )
        is None
    )


def test_composition_attr_tier_resolves_a_seeded_scalar_row(db):
    """POSITIVE CONTROL for the tier itself, on a plain scalar child attribute.

    Without this the file would assert only Nones and could not tell "tier 2
    correctly declines" from "tier 2 is dead". The ATTR-DISCRIMINATED pair each
    seed the same child attribute NAME at a different VALUE, so forcing them
    into a tie must resolve to the one whose children actually match.

    Exercised through `_composition_attr_tiebreak` directly because both
    variants resolve on their own parent attributes long before a tie can arise
    via `detect_variant` — a constructed tie is the only honest way to reach the
    tier with a scalar discriminator.
    """
    tied = {"attr-heavy", "attr-light"}
    heavy_children = [(CHILD_MENU, {"gap": "4px", "itemWeight": "200"})]
    assert (
        db._composition_attr_tiebreak(FIXTURE_BLOCK, tied, heavy_children) == "attr-heavy"
    )

    light_children = [(CHILD_MENU, {"gap": "4px", "itemWeight": "100"})]
    assert (
        db._composition_attr_tiebreak(FIXTURE_BLOCK, tied, light_children) == "attr-light"
    )


def test_composition_attr_tier_is_value_aware_not_name_aware(db):
    """NEGATIVE CONTROL for the SCORING, against the same constructed tie.

    The same attribute NAME at a value neither variant seeds must score 0 for
    both and return None — a name-keyed implementation would score them equal
    and could still return None, so the positive control above is what makes
    this control meaningful rather than vacuous.
    """
    tied = {"attr-heavy", "attr-light"}
    wrong = [(CHILD_MENU, {"gap": "4px", "itemWeight": "700"})]
    assert db._composition_attr_tiebreak(FIXTURE_BLOCK, tied, wrong) is None


def test_composition_attr_tier_off_path_unchanged(db):
    """The tier is opt-in: no child attributes supplied means no tier-2 result."""
    tied = {"attr-heavy", "attr-light"}
    assert db._composition_attr_tiebreak(FIXTURE_BLOCK, tied, None) is None
    assert db._composition_attr_tiebreak(FIXTURE_BLOCK, tied, []) is None


def test_composition_attr_score_rejects_tier_object_vs_flat_shape():
    """The shape contract pinned at the scoring layer — a pure function, so no
    fixture data is involved at all.

    A flat seeded value and the tier object a real extraction writes can never
    match. This asserts the arithmetic directly, so the reason the seeder
    refuses such a row is documented by an executable fact rather than prose.
    """
    from converter.db import db_lookup

    triples = ((CHILD_MENU, "itemSize", db_lookup._canon_slot_value(64)),)
    tier_write = [(CHILD_MENU, {"itemSize": {"desktop": 64}})]
    flat_write = [(CHILD_MENU, {"itemSize": 64})]

    assert db_lookup._composition_attr_score(triples, tier_write) == 0
    # Positive control: the arithmetic itself works — it is the SHAPE that
    # cannot meet, not the comparison that is broken.
    assert db_lookup._composition_attr_score(triples, flat_write) == 1


def test_detect_variant_child_attribute_tier1_still_wins(db):
    """Tier 1 (slug uniqueness) must keep precedence over tier 2.

    The UNIQUE-CHILD variant's children include the uniquely-nested child block
    type, and its nested menu carries no discriminating attributes at all. It
    must still resolve to that variant when child attributes are supplied — the
    attribute tier must not perturb a case the slug signal already answers.
    """
    child_blocks = [
        (CHILD_MENU, {"gap": "4px"}),
        (CHILD_TEXT, {}),
        (CHILD_GRID, {}),
    ]
    assert (
        db.detect_variant(
            FIXTURE_BLOCK,
            TIED_ATTRS,
            child_slugs=[s for s, _a in child_blocks],
            child_blocks=child_blocks,
        )
        == "unique-child"
    )

    # Stronger form of the same rule: make tier 2 actively DISAGREE. The nested
    # menu now carries the other variant's discriminating values, so tier 2
    # alone would answer `identical-a`. Tier 1 resolves first and is returned,
    # so the answer must be unchanged.
    disagreeing = [
        (
            CHILD_MENU,
            {
                "itemSize": {"desktop": 64, "mobile": 40},
                "listColumns": {"desktop": 2, "mobile": 1},
            },
        ),
        (CHILD_TEXT, {}),
        (CHILD_GRID, {}),
    ]
    assert (
        db.detect_variant(
            FIXTURE_BLOCK,
            TIED_ATTRS,
            child_slugs=[s for s, _a in disagreeing],
            child_blocks=disagreeing,
        )
        == "unique-child"
    )


def test_parse_block_open_comment_round_trips_child_attributes():
    """The plumbing this tier depends on: `assembly.py` holds each child only as
    SERIALISED markup, and reads its attributes back with
    `parse_block_open_comment`. Prove that read-back is exact for a value that
    exercises core's comment-escaping (a `-->` inside a string), and that an
    unreadable opener reports absence rather than a guessed `{}`.
    """
    from converter.block_serialization import parse_block_open_comment
    from converter.dispatch_spine import emit_block_markup

    attrs = {"listColumns": {"desktop": 2, "mobile": 1}, "label": "a --> b"}
    markup = emit_block_markup(CHILD_MENU, attrs)
    assert parse_block_open_comment(markup) == (CHILD_MENU, attrs)

    # No-attribute block: name resolves, attributes are an empty dict.
    assert parse_block_open_comment(emit_block_markup(CHILD_GRID, {})) == (
        CHILD_GRID,
        {},
    )

    # Not a block comment at all — absence, never a guess.
    assert parse_block_open_comment("<div>not a block</div>") is None
    assert parse_block_open_comment("") is None
