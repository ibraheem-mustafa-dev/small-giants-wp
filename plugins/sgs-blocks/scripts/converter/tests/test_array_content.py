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
