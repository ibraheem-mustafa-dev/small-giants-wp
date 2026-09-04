"""test_tier_object_typography.py — per-device typography → merged TIER object.

Proves the Spec 35 TIER shape ({desktop,tablet,mobile}) is emitted for a
tier-shaped object attr, instead of the retired flat siblings
(`fontSizeTablet` / `fontSizeMobile`) that blocks no longer declare.

WHY THIS EXISTS (measured, 2026-08-28). The Mama's homepage clone rendered its
hero h1 at 52px on a 375px viewport where the draft says 34px. Cause: the
resolver re-appended a tier suffix, `services.validate` found no such attr
(the tiers had moved INSIDE the object on 2026-08-11), and gapped the write as
NO_DESTINATION — silently. Across the whole page ZERO tier-suffixed typography
attrs were written, so every heading carried only its DESKTOP size. Typography
was 38% of all mobile computed-parity divergence, the single largest share.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_tier_object_typography.py

Uses the REAL framework DB. Blocks are resolved DYNAMICALLY against the declared
shape rather than hardcoded, so these controls keep discriminating as blocks
migrate — the same self-guarding discipline test_border_side.py's negative
control now carries after it silently inverted on 2026-08-28.
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.db.db_lookup import SGS_DB, tier_object_base
from converter.dispatch_spine import process_element


def _ctx(conn: sqlite3.Connection, *, block_slug: str,
         base_layer: str = "CONTENT") -> Ctx:
    return Ctx(
        block_slug=block_slug,
        container_kind="content",
        delegates_content=0,
        variant_value=None,
        variant_attr=None,
        node=None,
        is_root=False,
        base_layer=base_layer,
        conn=conn,
    )


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


# ---------------------------------------------------------------------------
# Premise — assert the shape every test below depends on
# ---------------------------------------------------------------------------

def test_premise_heading_fontsize_is_a_tier_object(conn):
    """sgs/heading.fontSize must BE a tier object, or the tests below are vacuous.

    If this fails the block has migrated shape again; re-point the tests rather
    than deleting them.
    """
    assert tier_object_base("sgs/heading", "fontSize") is True
    row = conn.execute(
        "SELECT attr_type, box_family FROM block_attributes "
        "WHERE block_slug='sgs/heading' AND attr_name='fontSize'"
    ).fetchone()
    assert row == ("object", None)
    gone = conn.execute(
        "SELECT 1 FROM block_attributes WHERE block_slug='sgs/heading' "
        "AND attr_name IN ('fontSizeTablet','fontSizeMobile') LIMIT 1"
    ).fetchone()
    assert gone is None, "the retired flat siblings are back — re-check the shape"


# ---------------------------------------------------------------------------
# The slice proof
# ---------------------------------------------------------------------------

def test_mobile_font_size_lands_in_the_mobile_tier_key(conn):
    """The exact defect: a Mobile-tier font-size must reach the object, not a gap."""
    result = process_element(
        _ctx(conn, block_slug="sgs/heading"),
        [Decl("font-size", "34px", "Mobile")],
    )
    assert result.attrs().get("fontSize") == {"mobile": 34}
    assert not result.gaps, [g.reason for g in result.gaps]


def test_three_tiers_merge_into_one_object(conn):
    """Three declarations at three tiers accumulate into ONE attr, not three."""
    result = process_element(
        _ctx(conn, block_slug="sgs/heading"),
        [
            Decl("font-size", "52px", "Base"),
            Decl("font-size", "44px", "Tablet"),
            Decl("font-size", "34px", "Mobile"),
        ],
    )
    attrs = result.attrs()
    assert attrs.get("fontSize") == {"desktop": 52, "tablet": 44, "mobile": 34}
    # The unit companion is a FLAT scalar attr, written once, alongside Base only.
    assert attrs.get("fontSizeUnit") == "px"
    assert "fontSizeTablet" not in attrs and "fontSizeMobile" not in attrs


def test_tier_values_are_numbers_not_px_strings(conn):
    """A STRING desktop value is read as a theme PRESET SLUG by render.php.

    heading/render.php:485 resolves a non-numeric desktop value to
    `var(--wp--preset--font-size--<value>)`. Storing "52px" would emit
    `var(--wp--preset--font-size--52px)` — an undefined custom property, so the
    declaration is invalid and the heading silently falls back to its inherited
    size. That is the measured D574 defect; this asserts we never re-create it.
    """
    result = process_element(
        _ctx(conn, block_slug="sgs/heading"),
        [Decl("font-size", "52px", "Base")],
    )
    val = result.attrs()["fontSize"]["desktop"]
    assert isinstance(val, (int, float)) and not isinstance(val, bool)
    assert val == 52


def test_unitless_line_height_keeps_its_number(conn):
    """line-height:1.15 is unitless — the number lands in the tier key."""
    slug = "sgs/text"
    if not tier_object_base(slug, "lineHeight"):
        pytest.skip(f"{slug}.lineHeight is not a tier object on this DB")
    result = process_element(
        _ctx(conn, block_slug=slug),
        [Decl("line-height", "1.15", "Mobile")],
    )
    assert result.attrs().get("lineHeight") == {"mobile": 1.15}


# ---------------------------------------------------------------------------
# Negative controls — the new path must NOT fire where it should not
# ---------------------------------------------------------------------------

def test_flat_sibling_block_still_writes_the_suffixed_attr(conn):
    """A block that STILL declares flat tier siblings must keep the old behaviour.

    Hundreds of attrs across the framework are still flat-sibling shaped; the
    tier-object path must leave every one untouched. Resolved dynamically — if
    no such block remains the migration is complete and the control retires
    knowingly rather than silently passing.
    """
    row = conn.execute(
        "SELECT block_slug, attr_name FROM block_attributes "
        "WHERE attr_name LIKE '%Mobile' AND attr_name NOT LIKE '%Unit' "
        "AND block_slug LIKE 'sgs/%' LIMIT 1"
    ).fetchone()
    if not row:
        pytest.skip("no flat-sibling attrs remain — control retired knowingly")
    slug, sibling = row
    base = sibling[: -len("Mobile")]
    assert tier_object_base(slug, base) is False, (
        f"{slug}.{base} declares a {sibling} sibling, so it is NOT a tier object; "
        f"tier_object_base must return False or the flat path would be bypassed."
    )


def test_box_family_attr_is_not_treated_as_a_tier_object(conn):
    """BOX and TIER are independent axes — a box attr must never take the tier path."""
    row = conn.execute(
        "SELECT block_slug, attr_name FROM block_attributes "
        "WHERE box_family IS NOT NULL AND box_family != '' LIMIT 1"
    ).fetchone()
    assert row, "no box-family attrs in the DB — this control cannot discriminate"
    slug, attr = row
    assert tier_object_base(slug, attr) is False


def test_a_tier_sibling_name_is_never_itself_a_tier_base(conn):
    """`backgroundImageMobile` is object-typed with no box_family, so conditions
    1-2 alone would classify it as a tier BASE and a caller would write
    {mobile: ...} INTO the mobile sibling. It is an asset sibling; the suffix
    guard is what catches it."""
    row = conn.execute(
        "SELECT block_slug, attr_name FROM block_attributes "
        "WHERE attr_type='object' AND (box_family IS NULL OR box_family='') "
        "AND (attr_name LIKE '%Mobile' OR attr_name LIKE '%Tablet') LIMIT 1"
    ).fetchone()
    if not row:
        pytest.skip("no object-typed tier siblings in the DB")
    slug, attr = row
    assert tier_object_base(slug, attr) is False
