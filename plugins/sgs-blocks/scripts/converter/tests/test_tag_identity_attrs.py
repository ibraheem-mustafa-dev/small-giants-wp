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
    """Replicate step 3a2's write decision for a (slug, node-tag) pair."""
    out: dict = {}
    for attr, allowed in db_lookup.tag_identity_attrs(slug).items():
        if tag in allowed:
            out.setdefault(attr, tag)
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
