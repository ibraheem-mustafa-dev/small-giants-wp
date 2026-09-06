"""test_array_content — the DB-recognition array field-lift (Spec 31 §3.B4 / FR-31-2.5).

Replaces the 2026-06-28 hand-declared-selector tests (deleted with the
``array_item_fields``/``_lift_field`` mechanism, 2026-07-02). These exercise the
DB-recognition resolver on a REAL block (sgs/trust-bar) + the real Mama's badge
structure: structural item detection + the 2-layer field match (slot name, then
role-fallback) — no hand-declared selectors anywhere.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_array_content.py -v --import-mode=importlib
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.resolvers.array_content import lift_array_content

# The real Mama's trust-bar section shape: __inner grid → 3 __badge siblings,
# each with __icon (svg) + __text (caption). Note __text, NOT __label — the
# role-fallback must still fill the block's `label` field (text-content).
_TRUST_BAR = """
<section class="sgs-trust-bar"><div class="sgs-trust-bar__inner">
  <div class="sgs-trust-bar__badge">
    <span class="sgs-trust-bar__icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
    <span class="sgs-trust-bar__text">Registered Food Business</span></div>
  <div class="sgs-trust-bar__badge">
    <span class="sgs-trust-bar__icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
    <span class="sgs-trust-bar__text">Free UK Delivery</span></div>
  <div class="sgs-trust-bar__badge">
    <span class="sgs-trust-bar__icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
    <span class="sgs-trust-bar__text">Trusted Service</span></div>
</div></section>
"""


def _root(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def test_structural_item_detection_finds_all_badges():
    """The resolver detects the repeating __badge siblings with no item_selector."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    assert "items" in attrs
    assert len(attrs["items"]) == 3  # all 3 badges detected structurally


def test_role_fallback_fills_label_from_text_child():
    """A draft __text child (text-content role) fills the block's `label` field
    (also text-content) via the role-fallback — the mechanism's whole point."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    labels = [it.get("label") for it in attrs["items"]]
    assert labels == ["Registered Food Business", "Free UK Delivery", "Trusted Service"]


def test_slot_name_match_fills_icon():
    """__icon → icon slot → icon field by direct name/slot match (Layer 1)."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    # The check-path svg resolves to the lucide 'check' slug on every badge.
    assert all(it.get("icon") == "check" for it in attrs["items"])


def test_no_client_copy_leak_only_draft_content():
    """The lifted items carry the DRAFT captions, never the block.json default."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    joined = " ".join(it.get("label", "") for it in attrs["items"])
    assert "Handmade in Birmingham" not in joined  # the old client-copy default


# A filled-polygon star (fill=currentColor, stroke=none) beside an outline check.
_TRUST_BAR_FILLED_STAR = """
<section class="sgs-trust-bar"><div class="sgs-trust-bar__inner">
  <div class="sgs-trust-bar__badge">
    <span class="sgs-trust-bar__icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span>
    <span class="sgs-trust-bar__text">Certified</span></div>
  <div class="sgs-trust-bar__badge">
    <span class="sgs-trust-bar__icon"><svg viewBox="0 0 24 24"><polygon points="12 2 15 8 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 8" fill="currentColor" stroke="none"/></svg></span>
    <span class="sgs-trust-bar__text">Trusted service</span></div>
</div></section>
"""


def test_filled_polygon_star_sets_fillstyle_filled():
    """Spec 31 §3.B.0 — styling follows the recognised element: a SOLID glyph
    (filled polygon star, preserved verbatim into iconSvg) sets the per-icon
    fillStyle='filled' so the clone renders it filled, not the uniform outline.
    An outline icon (the check path → slug) leaves fillStyle unset."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR_FILLED_STAR), "sgs/trust-bar", media_map={})
    items = attrs["items"]
    assert len(items) == 2
    assert items[0].get("fillStyle") is None          # outline check — no fill
    assert items[1].get("fillStyle") == "filled"       # filled star — fill set
    assert "polygon" in (items[1].get("iconSvg") or "")  # raw SVG preserved


def test_capability_gate_blocks_uncapable():
    """A block without array-content-lift is a no-op (opt-in, R-31-1)."""
    attrs, gaps = lift_array_content(_root(_TRUST_BAR), "sgs/container", media_map={})
    assert attrs == {} and gaps == []


# ---------------------------------------------------------------------------
# FR-31-2.1a (D258) — declared role + BEM-segment disambiguation + flat-item
# self-extraction. These lock the 5 gap-blocks whose content previously dropped
# because their field NAMES didn't resolve. Roles are DECLARED in block.json
# items.properties (seeded to array_item_schema.role); the resolver reads them,
# never name-parses. (These 5 blocks are absent from the Mama's homepage, so
# resolver-level regression tests are their verification floor — §7b.)
# ---------------------------------------------------------------------------

_PRICING = """
<div class="sgs-pricing-table"><div class="sgs-pricing-table__plans">
  <div class="sgs-pricing-table__plan">
    <span class="sgs-pricing-table__icon" data-lucide="star"></span>
    <h3 class="sgs-pricing-table__name">Starter</h3>
    <p class="sgs-pricing-table__price">9</p>
    <p class="sgs-pricing-table__price-yearly">90</p>
    <p class="sgs-pricing-table__description">Get going.</p>
    <span class="sgs-pricing-table__ribbon">New</span>
    <span class="sgs-pricing-table__savings-badge">Save 20%</span>
    <a class="sgs-pricing-table__cta" href="/buy">Choose</a></div>
  <div class="sgs-pricing-table__plan">
    <span class="sgs-pricing-table__icon" data-lucide="crown"></span>
    <h3 class="sgs-pricing-table__name">Pro</h3>
    <p class="sgs-pricing-table__price">29</p>
    <p class="sgs-pricing-table__price-yearly">290</p>
    <p class="sgs-pricing-table__description">Grow.</p>
    <span class="sgs-pricing-table__ribbon">Popular</span>
    <span class="sgs-pricing-table__savings-badge">Save 30%</span>
    <a class="sgs-pricing-table__cta" href="/pro">Choose</a></div>
</div></div>"""


def test_pricing_same_role_fields_disambiguated_by_bem_segment():
    attrs, gaps = lift_array_content(_root(_PRICING), "sgs/pricing-table")
    plans = attrs.get("plans", [])
    assert len(plans) == 2 and not gaps
    p0 = plans[0]
    # five text-content fields each resolve to their OWN element (not collided)
    assert p0["name"] == "Starter"
    assert p0["description"] == "Get going."
    assert p0["ribbonText"] == "New"
    assert p0["savingsBadgeText"] == "Save 20%"
    assert p0["priceYearly"] == "90"          # __price-yearly, not __price
    assert p0["price"] == "9"


def test_pricing_cta_element_serves_text_and_url_by_role():
    attrs, _ = lift_array_content(_root(_PRICING), "sgs/pricing-table")
    p0 = attrs["plans"][0]
    # ONE <a>__cta feeds ctaText (text-content) AND ctaUrl (url-href)
    assert p0["ctaText"] == "Choose"
    assert p0["ctaUrl"] == "/buy"
    assert p0["iconName"] == "star"           # declared icon-slug via data-lucide


def test_icon_list_direct_child_items_lift():
    html = ('<ul class="sgs-icon-list">'
            '<li class="sgs-icon-list__item"><span class="sgs-icon-list__icon" data-lucide="check"></span>'
            '<span class="sgs-icon-list__text">Fast</span><a class="sgs-icon-list__url" href="/a">m</a></li>'
            '<li class="sgs-icon-list__item"><span class="sgs-icon-list__icon" data-lucide="zap"></span>'
            '<span class="sgs-icon-list__text">Cheap</span><a class="sgs-icon-list__url" href="/b">m</a></li></ul>')
    attrs, gaps = lift_array_content(_root(html), "sgs/icon-list")
    items = attrs.get("items", [])
    assert len(items) == 2 and not gaps
    assert items[0] == {"text": "Fast", "iconName": "check", "url": "/a"}


def test_social_icons_flat_item_self_extraction():
    html = ('<div class="sgs-social-icons">'
            '<a class="sgs-social-icons__icon" href="https://fb.com/x" data-lucide="facebook"></a>'
            '<a class="sgs-social-icons__icon" href="https://ig.com/x" data-lucide="instagram"></a></div>')
    attrs, gaps = lift_array_content(_root(html), "sgs/social-icons")
    icons = attrs.get("icons", [])
    assert len(icons) == 2 and not gaps
    # platform (icon-slug) + url (url-href) both read off the <a> ITSELF
    assert icons[0] == {"platform": "facebook", "url": "https://fb.com/x"}


def test_trust_bar_url_field_now_lifts():
    html = ('<div class="sgs-trust-bar"><div class="sgs-trust-bar__inner">'
            '<div class="sgs-trust-bar__badge"><span class="sgs-trust-bar__icon" data-lucide="truck"></span>'
            '<span class="sgs-trust-bar__label">Free delivery</span>'
            '<a class="sgs-trust-bar__url" href="/ship">d</a></div>'
            '<div class="sgs-trust-bar__badge"><span class="sgs-trust-bar__icon" data-lucide="shield"></span>'
            '<span class="sgs-trust-bar__label">Secure</span>'
            '<a class="sgs-trust-bar__url" href="/sec">d</a></div></div></div>')
    attrs, _ = lift_array_content(_root(html), "sgs/trust-bar")
    items = attrs.get("items", [])
    assert items[0].get("url") == "/ship"     # url-href declared role, previously dropped


# ---------------------------------------------------------------------------
# L3 — bare-tag item fields (Spec 31 §2.6 + §3.B.0 consequence 2), 2026-07-31.
# A CONFORMING draft may write an item's fields as bare content tags rather than
# BEM-classed elements; §2.6 resolves those via the shared html_tag_to_core_block
# map. Before L3 every tier needed a BEM token, so such a repeater lifted ZERO
# items (the sgs-card-grid conformance fixture, live-reproduced).
# ---------------------------------------------------------------------------

_CARD_GRID_BARE_TAGS = """
<section class="sgs-card-grid"><div class="sgs-card-grid__inner">
  <div class="sgs-card-grid__item"><h3>Card One</h3><p>First card body text.</p></div>
  <div class="sgs-card-grid__item"><h3>Card Two</h3><p>Second card body text.</p></div>
</div></section>
"""


def test_l3_bare_tag_item_fields_lift():
    """<h3>/<p> inside an item resolve via the shared tag map to the fields whose
    identity they match: h3 -> sgs/heading -> `title`; p -> sgs/text -> `subtitle`.
    This is the exact case that lifted nothing before L3."""
    attrs, _gaps = lift_array_content(
        _root(_CARD_GRID_BARE_TAGS), "sgs/card-grid", media_map={}
    )
    items = attrs.get("items") or []
    assert len(items) == 2, f"expected 2 items, got {len(items)}: {items}"
    assert items[0].get("title") == "Card One"
    assert items[0].get("subtitle") == "First card body text."
    assert items[1].get("title") == "Card Two"
    assert items[1].get("subtitle") == "Second card body text."


def test_l3_does_not_cross_assign_identities():
    """The heading text must never land in the text-identity field (or vice
    versa) — L3 matches on IDENTITY, not on 'first unused child'."""
    attrs, _gaps = lift_array_content(
        _root(_CARD_GRID_BARE_TAGS), "sgs/card-grid", media_map={}
    )
    for item in attrs["items"]:
        assert "body text" not in (item.get("title") or "")
        assert not (item.get("subtitle") or "").startswith("Card ")


def test_l3_is_additive_bem_classed_items_unchanged():
    """NEGATIVE CONTROL for the additive claim: a BEM-classed draft still resolves
    through L1/L1b/L2 exactly as before — L3 only runs where every earlier tier
    returned nothing, so no already-resolving block can change."""
    attrs, _gaps = lift_array_content(_root(_TRUST_BAR), "sgs/trust-bar", media_map={})
    assert len(attrs["items"]) == 3
    assert attrs["items"][0].get("label") == "Registered Food Business"


def test_l3_ignores_a_field_whose_slot_routes_to_no_block():
    """card-grid's `badge` field resolves to NO standalone block (the known
    P-BADGE-SLOT-ROUTE-TO-LABEL gap), so it must not compete for the <p> that
    belongs to `subtitle`."""
    attrs, _gaps = lift_array_content(
        _root(_CARD_GRID_BARE_TAGS), "sgs/card-grid", media_map={}
    )
    for item in attrs["items"]:
        assert "badge" not in item, f"badge should not have matched: {item}"


# ---------------------------------------------------------------------------
# Root-cause regression (2026-09-05) — _slot_extraction_role() candidate-slot
# filter. An array-item field whose block.json declares NO role (role=NULL in
# array_item_schema) and whose target block carries MORE THAN ONE
# content-bearing attr (e.g. sgs/media: imageUrl role='image-object'
# canonical_slot='image', videoUrl role='content' canonical_slot='video')
# used to resolve to whichever content-bearing attr the DB happened to return
# FIRST (row-insertion order), regardless of whether that attr's own
# canonical_slot matched the slot being resolved. For the `image`/`media`
# slot this picked videoUrl's role='content' — routing an <img> through the
# rich-text extractor, which finds no text and silently drops the field.
#
# Fixed by filtering candidates on `info.get("canonical_slot") == slot`
# AND by declaring an explicit `role: "image-object"` in each affected
# block's block.json items.properties (reseed durability — see block.json
# diffs). These four tests are LIVE REPRODUCTIONS confirmed against the real
# array_content_lift pipeline (lift_array_content), one per affected block:
# sgs/trust-bar, sgs/brand-strip, sgs/card-grid, sgs/form-field-tiles.
# ---------------------------------------------------------------------------

_TRUST_BAR_IMAGE_BADGES = """
<section class="sgs-trust-bar"><div class="sgs-trust-bar__inner">
  <div class="sgs-trust-bar__badge">
    <img class="sgs-trust-bar__badge-img" src="badge1.png" alt="Certified">
    <span class="sgs-trust-bar__text">Certified Organic</span></div>
  <div class="sgs-trust-bar__badge">
    <img class="sgs-trust-bar__badge-img" src="badge2.png" alt="Trusted">
    <span class="sgs-trust-bar__text">Trusted Service</span></div>
</div></section>
"""


def test_trust_bar_image_badge_media_field_lifts_from_img_src():
    """Regression: trust-bar's `items.media` field (target block sgs/media)
    must lift the draft's real <img src>, not drop it via the wrong role."""
    attrs, _gaps = lift_array_content(
        _root(_TRUST_BAR_IMAGE_BADGES), "sgs/trust-bar", media_map={}
    )
    items = attrs.get("items") or []
    assert len(items) == 2, f"expected 2 items, got {len(items)}: {items}"
    assert items[0].get("media", {}).get("url") == "badge1.png", items[0]
    assert items[1].get("media", {}).get("url") == "badge2.png", items[1]


_BRAND_STRIP_LOGOS = """
<div class="sgs-brand-strip"><div class="sgs-brand-strip__inner">
  <div class="sgs-brand-strip__tile">
    <img class="sgs-brand-strip__media" src="logo1.png" alt="Acme">
    <span class="sgs-brand-strip__name">Acme</span></div>
  <div class="sgs-brand-strip__tile">
    <img class="sgs-brand-strip__media" src="logo2.png" alt="Globex">
    <span class="sgs-brand-strip__name">Globex</span></div>
</div></div>
"""


def test_brand_strip_logo_media_field_lifts_from_img_src():
    """Regression: brand-strip's `logos.media` field (target block sgs/media)
    must lift the draft's real <img src>, not drop it via the wrong role."""
    attrs, _gaps = lift_array_content(
        _root(_BRAND_STRIP_LOGOS), "sgs/brand-strip", media_map={}
    )
    items = attrs.get("logos") or []
    assert len(items) == 2, f"expected 2 items, got {len(items)}: {items}"
    assert items[0].get("media", {}).get("url") == "logo1.png", items[0]
    assert items[1].get("media", {}).get("url") == "logo2.png", items[1]


_CARD_GRID_MEDIA_ITEMS = """
<section class="sgs-card-grid"><div class="sgs-card-grid__inner">
  <div class="sgs-card-grid__item">
    <img class="sgs-card-grid__media" src="card1.jpg" alt="Card One">
    <h3 class="sgs-card-grid__title">Card One</h3>
    <p class="sgs-card-grid__subtitle">First card body text.</p></div>
  <div class="sgs-card-grid__item">
    <img class="sgs-card-grid__media" src="card2.jpg" alt="Card Two">
    <h3 class="sgs-card-grid__title">Card Two</h3>
    <p class="sgs-card-grid__subtitle">Second card body text.</p></div>
</div></section>
"""


def test_card_grid_item_media_field_lifts_from_img_src():
    """Regression: card-grid's `items.media` field (target block sgs/media)
    must lift the draft's real <img src>, not drop it via the wrong role."""
    attrs, _gaps = lift_array_content(
        _root(_CARD_GRID_MEDIA_ITEMS), "sgs/card-grid", media_map={}
    )
    items = attrs.get("items") or []
    assert len(items) == 2, f"expected 2 items, got {len(items)}: {items}"
    assert items[0].get("media", {}).get("url") == "card1.jpg", items[0]
    assert items[1].get("media", {}).get("url") == "card2.jpg", items[1]
    assert items[0].get("title") == "Card One"
    assert items[0].get("subtitle") == "First card body text."


_FORM_FIELD_TILES = """
<div class="sgs-form-field-tiles"><div class="sgs-form-field-tiles__inner">
  <div class="sgs-form-field-tiles__tile">
    <img class="sgs-form-field-tiles__image" src="tile1.png" alt="Small">
    <span class="sgs-form-field-tiles__label">Small</span></div>
  <div class="sgs-form-field-tiles__tile">
    <img class="sgs-form-field-tiles__image" src="tile2.png" alt="Large">
    <span class="sgs-form-field-tiles__label">Large</span></div>
</div></div>
"""


def test_form_field_tiles_declares_no_array_content_lift_capability():
    """DIAGNOSIS CORRECTION (2026-09-05), not a regression test.

    Task brief claimed the role-fallback bug was "confirmed live" on
    sgs/form-field-tiles same as trust-bar/brand-strip/card-grid. Verified
    against the real code: unlike those three, form-field-tiles' block.json
    does NOT declare `supports.sgs.arrayContentLift: true` — so
    `lift_array_content()` returns `({}, [])` at its capability gate
    (R-31-1 opt-in) before ever reaching `_item_field_schema()` /
    `_slot_extraction_role()`. This block's `tiles` array is therefore NOT
    populated by this resolver at all today, and the role-fallback bug this
    task fixes could never have manifested on it via this mechanism.

    The `role: "image-object"` declaration was still added to this block's
    block.json (+ reseeded into array_item_schema.role) per the task brief,
    for reseed-durability / forward-compatibility should arrayContentLift
    ever be opted into — but it is CURRENTLY INERT (no consumer reads it),
    and NO live img-src-drop repro can be written for this block, because
    there is no live bug to reproduce. Adding `arrayContentLift` capability
    to this block would be a separate, design-gated decision (Rule 7) outside
    this task's scope. This test asserts the capability-gate short-circuit
    stays true so a future capability-add is noticed rather than silently
    changing this block's behaviour."""
    attrs, gaps = lift_array_content(
        _root(_FORM_FIELD_TILES), "sgs/form-field-tiles", media_map={}
    )
    assert attrs == {} and gaps == []
