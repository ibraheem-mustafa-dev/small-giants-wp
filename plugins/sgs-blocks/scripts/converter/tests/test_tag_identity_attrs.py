"""
test_tag_identity_attrs.py
==========================
Regression suite for the R-31-2 TAG-IDENTITY write (assembly step 3a2 +
`db_lookup.tag_identity_attrs`) — the CG-2 zero-h1 fix (2026-07-05).

Recognition uses the source tag to pick the block, then discarded it on every
path; nothing wrote sgs/heading.level, so render.php's h2 default flattened
h1/h3/h4 (live page: 0×h1 / 15×h2 — SEO + WCAG hierarchy). The write is gated
on an EXPLICIT role='tag-identity' declaration (ATTR_CLASSIFICATION_OVERRIDES,
FR-31-2.1a) + enum membership — never bare enum-contains (hero.variant holds
"video", quote.attributionTag holds "div" — R-31-9 over-broad).

Run from the canonical cwd plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_tag_identity_attrs.py -q --import-mode=importlib
"""

from __future__ import annotations

from converter.db import db_lookup


# -- the DB accessor (role-gated, enum-valued) --------------------------------

def test_heading_declares_level_tag_identity():
    ti = db_lookup.tag_identity_attrs("sgs/heading")
    assert "level" in ti
    assert ti["level"] == frozenset({"h1", "h2", "h3", "h4", "h5", "h6"})


def test_media_declares_media_type_tag_identity():
    ti = db_lookup.tag_identity_attrs("sgs/media")
    assert "mediaType" in ti
    # video + svg are tag-reachable; image is the default (an <img> tag is
    # OUTSIDE the enum by name, so the write never fires for it — by design).
    assert {"image", "video", "svg"} <= set(ti["mediaType"])


def test_enum_contains_is_not_the_gate():
    """Blocks whose enums merely CONTAIN tag names must NOT be tag-identity:
    hero.variant has "video", quote.attributionTag has "div",
    pricing-table.toggleStyle has "button" — none carry the role, so the
    accessor returns nothing for them (the R-31-9 over-broad trap)."""
    for slug in ("sgs/hero", "sgs/quote", "sgs/pricing-table"):
        assert db_lookup.tag_identity_attrs(slug) == {}, slug


# -- the assembly step 3a2 write ----------------------------------------------

def _tag_identity_writes(slug: str, tag: str) -> dict:
    """Replicate step 3a2's write decision for a (slug, node-tag) pair.

    Calls the SAME production function assembly.py step 3a2 calls
    (`db_lookup.tag_identity_match`) rather than a hand-duplicated
    membership test, so this helper can't silently drift from what the
    converter actually does (the 2026-08-17 fix moved the match/write-value
    logic into that function precisely so both the assembly call site and
    this suite exercise one shared implementation).
    """
    out: dict = {}
    for attr, allowed in db_lookup.tag_identity_attrs(slug).items():
        value = db_lookup.tag_identity_match(tag, allowed)
        if value is not None:
            out.setdefault(attr, value)
    return out


def test_h1_writes_level_h1():
    assert _tag_identity_writes("sgs/heading", "h1") == {"level": "h1"}


def test_h4_writes_level_h4():
    assert _tag_identity_writes("sgs/heading", "h4") == {"level": "h4"}


def test_video_writes_media_type():
    assert _tag_identity_writes("sgs/media", "video") == {"mediaType": "video"}


def test_img_outside_enum_writes_nothing():
    """<img> is not an enum member ('image' is) — the block default stands."""
    assert _tag_identity_writes("sgs/media", "img") == {}


def test_section_tag_never_matches_hero_variant():
    """A hero root (<section>) must not trip variant even though the variant
    enum contains 'video' — the role gate excludes hero entirely."""
    assert _tag_identity_writes("sgs/hero", "section") == {}
    assert _tag_identity_writes("sgs/hero", "video") == {}


# -- 2026-08-17 fix: shape-agnostic matching (numeric enum / no enum) ---------
#
# Root-cause correction to the reported defect: the reported description
# said the SQL's `enum_values IS NOT NULL` clause plus a bare `tag in allowed`
# membership test excluded sgs/icon-list, sgs/product-card, sgs/product-faq.
# That mechanism is real (confirmed below), but it is NOT the only reason
# those three blocks currently transfer nothing — verified against the live
# sgs-framework.db (2026-08-17): sgs/product-card.headingLevel and
# sgs/product-faq.headingLevel carry role='enum-mode' (not 'tag-identity'),
# and sgs/icon-list.headingLevel carries role='technical'. `tag_identity_attrs`
# is role-gated (role = 'tag-identity' in the SQL WHERE clause, unchanged by
# this fix — test_enum_contains_is_not_the_gate below still proves the gate
# holds), so today it returns {} for all three regardless of this fix; a
# separate, hand-authored ATTR_CLASSIFICATION_OVERRIDES reclassification +
# `/sgs-update` reseed of the SHARED sgs-framework.db is needed before the
# role gate opens for them — deliberately NOT done here (out of converter-
# code scope, and a live DB reseed while two sibling agents are mid-migration
# on these exact blocks in separate worktrees is a cross-track action this
# project's own memory already flags as having broken both tracks before).
#
# What IS fixed here, and provably converter-scoped: once role='tag-identity'
# is set (by that separate reclassification, whenever it lands, in whichever
# enum shape it lands in), the write must work correctly for a NUMERIC enum
# ([2,3,4], today's legacy shape on product-card/product-faq), a STRING-TAG
# enum (["h2",...], today's shape on sgs/heading and the canonical shape the
# sibling migrations are rolling out), and NO enum at all (today's actual
# live shape on icon-list.headingLevel — enum_values IS NULL). These tests
# prove all three via `db_lookup.tag_identity_match` directly (the pure
# function, no DB needed) plus one monkeypatched end-to-end pass through
# `_tag_identity_writes` per shape (the exact call path assembly.py step 3a2
# uses), so the fix is proven ready the moment the DB reclassification lands,
# independent of whether or which sibling migration lands first.

def test_accessor_sql_no_longer_drops_a_null_enum_tag_identity_row(monkeypatch, tmp_path):
    """SQL-level proof (not just the pure function): a role='tag-identity' row
    with enum_values IS NULL must come back as the `None` sentinel, not be
    filtered out by the WHERE clause (the literal bug in the reported
    description — `AND enum_values IS NOT NULL` — which this fix removes)."""
    import sqlite3

    db_path = tmp_path / "fixture.db"
    conn = sqlite3.connect(db_path)
    conn.execute(
        "CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, "
        "role TEXT, enum_values TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (block_slug, attr_name, role, enum_values) "
        "VALUES (?,?,?,?)",
        [
            ("sgs/icon-list", "headingLevel", "tag-identity", None),
            ("sgs/heading", "level", "tag-identity", '["h1","h2","h3","h4","h5","h6"]'),
            ("sgs/icon-list", "defaultIconSource", "enum-mode", '["lucide","wp-icon"]'),
        ],
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)
    db_lookup.tag_identity_attrs.cache_clear()
    try:
        result = db_lookup.tag_identity_attrs("sgs/icon-list")
    finally:
        db_lookup.tag_identity_attrs.cache_clear()  # never leak a fixture-DB result into later tests

    assert "headingLevel" in result, "a NULL-enum tag-identity row must not be silently dropped"
    assert result["headingLevel"] is None
    # the role gate still holds: enum-mode is not tag-identity, so it's absent
    assert "defaultIconSource" not in result


def test_canonical_tag_token_normalises_all_three_shapes_to_the_same_form():
    assert db_lookup._canonical_tag_token("h3") == "h3"
    assert db_lookup._canonical_tag_token(3) == "h3"
    assert db_lookup._canonical_tag_token("3") == "h3"


def test_canonical_tag_token_leaves_non_heading_tokens_alone():
    # 'p' is a legitimate tag-identity value meaning "not a heading" (FR-31-2.1a)
    # — it must never canonicalise into a heading form or vice versa.
    assert db_lookup._canonical_tag_token("p") == "p"
    assert db_lookup._canonical_tag_token("image") == "image"
    assert db_lookup._canonical_tag_token("div") == "div"


def test_match_numeric_enum_recognises_h3_and_writes_an_int():
    """The legacy numeric-enum shape ([2,3,4], live today on
    sgs/product-card.headingLevel / sgs/product-faq.headingLevel): a draft
    <h3> must match member 3 and write back the INT 3, not the string "h3"
    or "3" — the attr's own type is numeric on these blocks."""
    allowed = frozenset({"2", "3", "4"})  # tag_identity_attrs' str-cast shape
    value = db_lookup.tag_identity_match("h3", allowed)
    assert value == 3
    assert isinstance(value, int)


def test_match_string_enum_recognises_h3_and_writes_a_string():
    """The canonical string-tag enum shape (["h2","h3","h4",...]): a draft
    <h3> matches member "h3" and writes back the STRING "h3"."""
    allowed = frozenset({"h2", "h3", "h4", "h5", "h6"})
    value = db_lookup.tag_identity_match("h3", allowed)
    assert value == "h3"
    assert isinstance(value, str)


def test_match_no_enum_writes_the_node_tag_unconditionally():
    """No enum declared at all (enum_values IS NULL — icon-list.headingLevel's
    actual live shape today) must NOT be silently excluded: the sentinel
    `allowed=None` means 'no declared restriction', so the raw node tag is
    written verbatim."""
    assert db_lookup.tag_identity_match("h3", None) == "h3"
    assert db_lookup.tag_identity_match("h5", None) == "h5"


def test_match_numeric_enum_rejects_a_level_outside_the_enum():
    """Negative control: a numeric enum [2,3,4] must REJECT h5/h1 — proves
    the shape-normalisation fix does not degrade into 'always transfer'."""
    allowed = frozenset({"2", "3", "4"})
    assert db_lookup.tag_identity_match("h5", allowed) is None
    assert db_lookup.tag_identity_match("h1", allowed) is None


def test_match_p_never_collides_with_a_heading_enum_member():
    """Negative control, both directions: an enum containing both heading
    tags and the legitimate non-heading value "p" must match each input to
    itself only — "p" must never satisfy a heading tag and a heading tag
    must never satisfy "p"."""
    allowed = frozenset({"h2", "h3", "h4", "p"})
    assert db_lookup.tag_identity_match("p", allowed) == "p"
    assert db_lookup.tag_identity_match("h3", allowed) == "h3"
    # a node tag that is neither a declared heading level nor "p" still rejects
    assert db_lookup.tag_identity_match("div", allowed) is None


def test_end_to_end_numeric_enum_write_via_monkeypatched_role_gate(monkeypatch):
    """Full step-3a2 call path (`_tag_identity_writes`, which calls the same
    `tag_identity_attrs` + `tag_identity_match` pair assembly.py step 3a2
    calls) for a block whose tag-identity attr carries the legacy numeric
    enum shape — simulated via monkeypatch since sgs/product-card.headingLevel
    is not yet role='tag-identity' in the live DB (see module docstring)."""
    monkeypatch.setattr(
        db_lookup,
        "tag_identity_attrs",
        lambda slug: {"headingLevel": frozenset({"2", "3", "4"})} if slug == "sgs/product-card" else {},
    )
    assert _tag_identity_writes("sgs/product-card", "h3") == {"headingLevel": 3}
    assert _tag_identity_writes("sgs/product-card", "h6") == {}  # negative control


def test_end_to_end_no_enum_write_via_monkeypatched_role_gate(monkeypatch):
    """Same, for a block whose tag-identity attr declares NO enum at all —
    icon-list.headingLevel's actual live shape (enum_values IS NULL) once
    role-gated to 'tag-identity'."""
    monkeypatch.setattr(
        db_lookup,
        "tag_identity_attrs",
        lambda slug: {"headingLevel": None} if slug == "sgs/icon-list" else {},
    )
    assert _tag_identity_writes("sgs/icon-list", "h4") == {"headingLevel": "h4"}


# -- step 3a2 is wired in assembly (not just the accessor existing) -----------

def test_assembly_wires_step_3a2():
    from pathlib import Path
    src = (Path(__file__).resolve().parents[1] / "services" / "assembly.py").read_text(
        encoding="utf-8"
    )
    assert "tag_identity_attrs" in src, "assembly step 3a2 must call the accessor"
    assert "setdefault" in src.split("tag_identity_attrs", 1)[1][:400], (
        "step 3a2 must setdefault (explicit values win)"
    )
