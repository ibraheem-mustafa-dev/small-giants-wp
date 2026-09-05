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
# db_lookup.detect_variant — composition tiebreaker (variant-composition-
# fingerprinting plan, Task 3, 2026-09-05)
# ----------------------------------------------------------------------------
# Real fixture chosen deliberately, not a synthetic one: `sgs/nav-drawer`'s
# `split-zone-serif` variant is THE motivating case for this whole mechanism
# (Context section of .claude/plans/2026-09-05-variant-composition-
# fingerprinting.md) — every attribute value it sets is duplicated by at
# least one sibling variant, so `variant_slots` has no row for it at all and
# it scores 0 on attributes alone, same as every other variant with zero
# discriminating attrs. Using the real block/DB proves the fix against the
# actual bug, not an approximation of it.


def test_detect_variant_0_0_tie_resolved_by_composition():
    """`split-zone-serif` seeds [nav-menu, icon-list, text, social-icons,
    card-grid]; `variant_composition_slots` (Task 2's population, verified
    live against the real DB while writing this test) gives it exactly ONE
    discriminating child slug: 'sgs/card-grid' — no other nav-drawer variant's
    InnerBlocks template includes a card-grid. The attrs below are
    split-zone-serif's REAL preset values (drawerBg:footer-bg,
    drawerAlign:left, closeStyle:separate-x) — each one is shared by a sibling
    variant (drawerAlign:left matches nothing in variant_slots at all,
    drawerBg/closeStyle likewise), so every declared variant scores exactly 0
    on attributes and today's code returns None via the `no_slots_matched`
    miss path. Passing the real composition (child_slugs) must now resolve
    it correctly instead.
    """
    from converter.db import db_lookup

    attrs = {"drawerBg": "footer-bg", "drawerAlign": "left", "closeStyle": "separate-x"}
    child_slugs = [
        "sgs/nav-menu",
        "sgs/icon-list",
        "sgs/text",
        "sgs/social-icons",
        "sgs/card-grid",
    ]
    assert db_lookup.detect_variant("sgs/nav-drawer", attrs, child_slugs=child_slugs) == "split-zone-serif"


def test_detect_variant_0_0_tie_default_off_path_unchanged():
    """The SAME 0-0 tie, `child_slugs` omitted (today's pre-existing call
    shape, still used by the one live caller in assembly.py until Task 4) —
    must still return None. Proves the composition tiebreak is purely
    additive/opt-in and changes nothing for a caller that doesn't pass it.
    """
    from converter.db import db_lookup

    attrs = {"drawerBg": "footer-bg", "drawerAlign": "left", "closeStyle": "separate-x"}
    assert db_lookup.detect_variant("sgs/nav-drawer", attrs) is None
    # Also explicit None / empty list — both must behave identically to omission.
    assert db_lookup.detect_variant("sgs/nav-drawer", attrs, child_slugs=None) is None
    assert db_lookup.detect_variant("sgs/nav-drawer", attrs, child_slugs=[]) is None


def test_detect_variant_composition_tie_still_ambiguous_falls_through():
    """`two-column-editorial` seeds [nav-menu, button] — NEITHER slug is
    unique to it in `variant_composition_slots` (both are shared with other
    nav-drawer variants' templates, per Task 2's real population run), so its
    composition score is 0 against every candidate the same as
    split-zone-serif's real composition scores 0 against a `two-column-
    editorial`-shaped child list. Composition must never manufacture a result
    when it, too, has no discriminating signal — falls through to the
    existing miss behaviour, same as the no-child_slugs case.
    """
    from converter.db import db_lookup

    attrs = {"drawerBg": "footer-bg", "drawerAlign": "left", "closeStyle": "separate-x"}
    two_column_slugs = ["sgs/nav-menu", "sgs/button"]
    assert db_lookup.detect_variant("sgs/nav-drawer", attrs, child_slugs=two_column_slugs) is None


# ----------------------------------------------------------------------------
# db_lookup.detect_variant — TIER 2: child-ATTRIBUTE-VALUE composition
# (2026-09-06)
# ----------------------------------------------------------------------------
# Same real fixture, the case tier 1 provably cannot reach.
# `two-column-editorial` and `floating-capped-card` nest the IDENTICAL child
# slug set {sgs/nav-menu, sgs/button}, so slug-uniqueness has nothing to
# discriminate on (the test directly above pins that). What separates them is
# the nested nav-menu's own configuration: `two-column-editorial` is the only
# one of the seven variants whose nav-menu sets `listColumns` — a genuinely
# rendered, CSS-extractable responsive grid-template-columns rule
# (nav-menu/render.php).

_TWO_COLUMN_ATTRS = {"drawerBg": "surface", "closeStyle": "text-swap"}
_TWO_COLUMN_CHILD_SLUGS = ["sgs/nav-menu", "sgs/button"]
_TWO_COLUMN_CHILD_BLOCKS = [
    (
        "sgs/nav-menu",
        {
            "gap": "4px",
            "itemFontSize": 64,
            "listColumns": {"desktop": 2, "mobile": 1},
            "itemFontSizeMobile": 40,
        },
    ),
    ("sgs/button", {}),
]


def test_detect_variant_resolved_by_child_attribute_value():
    """`two-column-editorial`'s REAL preset attrs + REAL children, verbatim from
    `src/blocks/nav-drawer/variations.js`.

    Every one of its own attribute values is duplicated by a sibling variant
    (drawerBg:surface and closeStyle:text-swap both also appear on
    `floating-capped-card`), so it has no `variant_slots` row and scores 0 on
    attributes. Its child SLUG set is identical to `floating-capped-card`'s, so
    tier 1 scores 0 too. Passing the children's own attributes must resolve it
    via tier 2 — the `variant_composition_attr_slots` rows /sgs-update derived
    from those same nav-menu overrides.
    """
    from converter.db import db_lookup

    assert db_lookup.detect_variant(
        "sgs/nav-drawer",
        _TWO_COLUMN_ATTRS,
        child_slugs=_TWO_COLUMN_CHILD_SLUGS,
        child_blocks=_TWO_COLUMN_CHILD_BLOCKS,
    ) == "two-column-editorial"


def test_detect_variant_child_attribute_default_off_path_unchanged():
    """NEGATIVE CONTROL for the tier itself: the identical case with
    `child_blocks` omitted must STILL return None.

    This is the pre-2026-09-06 result (the FAIL row in the task-2 audit), and
    it proves the new tier is genuinely doing the work rather than something
    else having changed — and that the extension is purely opt-in for any
    caller that does not supply child attributes.
    """
    from converter.db import db_lookup

    assert db_lookup.detect_variant(
        "sgs/nav-drawer", _TWO_COLUMN_ATTRS, child_slugs=_TWO_COLUMN_CHILD_SLUGS
    ) is None
    assert db_lookup.detect_variant(
        "sgs/nav-drawer",
        _TWO_COLUMN_ATTRS,
        child_slugs=_TWO_COLUMN_CHILD_SLUGS,
        child_blocks=[],
    ) is None


def test_detect_variant_child_attribute_is_value_aware_not_name_aware():
    """NEGATIVE CONTROL for the SCORING: the same children carrying the same
    attribute NAMES at DIFFERENT values must not resolve.

    Mirrors `_slot_score`'s preset-variant contract — a shared name at a
    different value is worth 0, exactly as if the attribute were absent. Were
    the tier name-keyed instead of value-keyed, this would wrongly return
    `two-column-editorial`.
    """
    from converter.db import db_lookup

    wrong_values = [
        (
            "sgs/nav-menu",
            {
                "gap": "4px",
                "itemFontSize": 21,
                "listColumns": {"desktop": 5, "mobile": 4},
                "itemFontSizeMobile": 19,
            },
        ),
        ("sgs/button", {}),
    ]
    assert db_lookup.detect_variant(
        "sgs/nav-drawer",
        _TWO_COLUMN_ATTRS,
        child_slugs=_TWO_COLUMN_CHILD_SLUGS,
        child_blocks=wrong_values,
    ) is None


def test_detect_variant_child_attribute_tier1_still_wins():
    """Tier 1 (slug uniqueness) must keep precedence.

    `split-zone-serif`'s real children include the unique `sgs/card-grid`, AND
    its nav-menu carries no discriminating attributes at all. It must still
    resolve to `split-zone-serif` when child attributes are supplied — the new
    tier must not perturb a case the slug signal already answers.
    """
    from converter.db import db_lookup

    attrs = {"drawerBg": "footer-bg", "drawerAlign": "left", "closeStyle": "separate-x"}
    child_blocks = [
        ("sgs/nav-menu", {"gap": "4px"}),
        ("sgs/icon-list", {}),
        ("sgs/text", {}),
        ("sgs/social-icons", {}),
        ("sgs/card-grid", {}),
    ]
    assert db_lookup.detect_variant(
        "sgs/nav-drawer",
        attrs,
        child_slugs=[s for s, _a in child_blocks],
        child_blocks=child_blocks,
    ) == "split-zone-serif"


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
    markup = emit_block_markup("sgs/nav-menu", attrs)
    assert parse_block_open_comment(markup) == ("sgs/nav-menu", attrs)

    # No-attribute block: name resolves, attributes are an empty dict.
    assert parse_block_open_comment(emit_block_markup("sgs/card-grid", {})) == (
        "sgs/card-grid",
        {},
    )

    # Not a block comment at all — absence, never a guess.
    assert parse_block_open_comment("<div>not a block</div>") is None
    assert parse_block_open_comment("") is None
