"""Synthetic variant-composition fixture for `db_lookup.detect_variant`'s tiers.

HERMETIC BY CONSTRUCTION. The tests that use this own their data: a throwaway
block (`sgs/test-variant-block`) whose variant tables are monkeypatched onto
`db_lookup`'s cached loaders. Nothing reads the live framework DB, and no live
block's variant roster can make those tests pass or fail.

The shapes below are the ones the mechanism exists to separate, stated
generically:

  UNIQUE-CHILD       one variant whose InnerBlocks seed nests a child block type
                     no sibling variant nests. Tier 1 (child-slug uniqueness)
                     resolves it even though it has no discriminating attributes
                     of its own at all.
  IDENTICAL-SET      two variants nesting the SAME child block types, differing
                     only in how one of those children is configured. Tier 1 is
                     blind to these; tier 2 (child attribute VALUE) separates
                     them, and only on an exact canonical value match.
  ATTR-DISCRIMINATED two variants that each carry a discriminating attribute of
                     their own, used to construct a tie that reaches tier 2 with
                     a plain scalar child attribute.

Stored values are built through `db_lookup._canon_slot_value`, the same
canonicaliser the seeder writes with, so the shape under test is the real one
rather than a hand-typed JSON string.
"""
from __future__ import annotations

import pytest

FIXTURE_BLOCK = "sgs/test-variant-block"
CHILD_MENU = "sgs/test-child-menu"
CHILD_BUTTON = "sgs/test-child-button"
CHILD_GRID = "sgs/test-child-grid"
CHILD_TEXT = "sgs/test-child-text"

# Every variant the fixture block DECLARES (the enum on its variant attr).
# `unique-child` and the identical-set pair have no `variant_slots` rows at all,
# exactly like a real variant whose every attribute value is duplicated by a
# sibling.
DECLARED = frozenset(
    {"unique-child", "identical-a", "identical-b", "attr-heavy", "attr-light"}
)

# Parent-attribute discriminators. Only the ATTR-DISCRIMINATED pair has any, so
# an `accent` value matching neither leaves every variant at score 0 — the 0-0
# tie the composition tiers exist to rescue.
SLOTS = {
    FIXTURE_BLOCK: (
        ("attr-heavy", frozenset({("accent", '"gold"')})),
        ("attr-light", frozenset({("accent", '"silver"')})),
    )
}

# Tier 1: uniquely-nested child slugs. Only `unique-child` has one.
COMPOSITION_SLOTS = {FIXTURE_BLOCK: (("unique-child", (CHILD_GRID,)),)}

# Attrs matching no discriminating slot value, so every variant scores 0.
TIED_ATTRS = {"accent": "bronze", "align": "left", "closeStyle": "separate-x"}

# The UNIQUE-CHILD variant's composition, as a clone would assemble it.
UNIQUE_CHILD_SLUGS = [CHILD_MENU, CHILD_TEXT, CHILD_GRID]

# The IDENTICAL-SET child slug list, shared verbatim by both of that pair.
IDENTICAL_CHILD_SLUGS = [CHILD_MENU, CHILD_BUTTON]

# `identical-a`'s children in the shape a real extraction produces — tier
# objects, not flat scalars.
IDENTICAL_A_CHILD_BLOCKS = [
    (
        CHILD_MENU,
        {
            "gap": "4px",
            "itemSize": {"desktop": 64, "mobile": 40},
            "listColumns": {"desktop": 2, "mobile": 1},
        },
    ),
    (CHILD_BUTTON, {}),
]


def build_attr_slots(canon):
    """Tier 2 rows: (child slug, attribute name, canonical value) triples.

    `identical-a` carries two TIER-SHAPED object attrs — the shape a real
    extraction writes, which a flat scalar can never equal. The
    ATTR-DISCRIMINATED pair carry one plain scalar attribute at two different
    values, which is the value-awareness case.
    """
    return {
        FIXTURE_BLOCK: (
            (
                "identical-a",
                (
                    (CHILD_MENU, "itemSize", canon({"desktop": 64, "mobile": 40})),
                    (CHILD_MENU, "listColumns", canon({"desktop": 2, "mobile": 1})),
                ),
            ),
            ("attr-heavy", ((CHILD_MENU, "itemWeight", canon("200")),)),
            ("attr-light", ((CHILD_MENU, "itemWeight", canon("100")),)),
        )
    }


@pytest.fixture
def db(monkeypatch):
    """Point `db_lookup`'s variant loaders at the synthetic fixture and yield it.

    All four loaders are module-level `lru_cache` functions that the code under
    test resolves by global name at call time, so patching the names is enough —
    no temporary database, no live-DB read, and every other block slug simply
    gets an empty result. The ORIGINALS' caches are cleared on teardown (the
    originals are captured before patching, since `monkeypatch` undoes its
    patches after this fixture finalises) so no value read here or earlier can
    leak into another test.
    """
    from converter.db import db_lookup

    originals = (
        db_lookup._variant_slots_map,
        db_lookup._variant_composition_slots_map,
        db_lookup._variant_composition_attr_slots_map,
        db_lookup.declared_variant_values,
    )
    attr_slots = build_attr_slots(db_lookup._canon_slot_value)

    monkeypatch.setattr(
        db_lookup, "_variant_slots_map", lambda slug: SLOTS.get(slug, ())
    )
    monkeypatch.setattr(
        db_lookup,
        "_variant_composition_slots_map",
        lambda slug: COMPOSITION_SLOTS.get(slug, ()),
    )
    monkeypatch.setattr(
        db_lookup,
        "_variant_composition_attr_slots_map",
        lambda slug: attr_slots.get(slug, ()),
    )
    monkeypatch.setattr(
        db_lookup,
        "declared_variant_values",
        lambda slug: DECLARED if slug == FIXTURE_BLOCK else frozenset(),
    )
    try:
        yield db_lookup
    finally:
        for fn in originals:
            fn.cache_clear()
