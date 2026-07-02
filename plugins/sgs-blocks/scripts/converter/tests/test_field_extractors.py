"""test_field_extractors.py — Focused tests for the shared field_extractors module.

Proves that extract_field_value is the single shared dispatch path, and that
icon-slug resolution now reaches icon_resolver.resolve_icon for inline SVGs
(the capability that was blocked when icon_resolver was absent from import_ban's
allowlist).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_field_extractors.py -v --import-mode=importlib

Key assertions
--------------
1. Every role is handled by extract_field_value (behaviour parity with the old
   private _lift_field role branches).
2. icon-slug with an inline <svg> resolves via resolve_icon (the import-ban
   allowlist addition in D248 is the enabler).
3. array_content._lift_field and the scalar_content value step both call
   extract_field_value — proven by monkeypatching extract_field_value and
   confirming the mock is reached from both paths.
"""
from __future__ import annotations

import pytest
from bs4 import BeautifulSoup

from converter.services.field_extractors import extract_field_value


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _el(html: str):
    """Parse HTML and return the first real Tag element."""
    return BeautifulSoup(html, "html.parser").find(True)


# ---------------------------------------------------------------------------
# text-content
# ---------------------------------------------------------------------------

def test_text_content_returns_string():
    el = _el('<p class="sgs-hero__headline">Hello <strong>World</strong></p>')
    result = extract_field_value(el, "text-content")
    assert "Hello" in result
    assert "<strong>World</strong>" in result


def test_text_content_returns_none_for_empty():
    el = _el('<p class="sgs-hero__headline">  </p>')
    result = extract_field_value(el, "text-content")
    assert result is None


# ---------------------------------------------------------------------------
# image-object
# ---------------------------------------------------------------------------

def test_image_object_from_img_element():
    el = _el('<img class="sgs-team-member__photo" src="/img/team.jpg" alt="Alice">')
    result = extract_field_value(el, "image-object")
    assert isinstance(result, dict)
    assert result["url"] == "/img/team.jpg"
    assert result["alt"] == "Alice"
    assert result["id"] == 0


def test_image_object_from_wrapper_with_img_descendant():
    el = _el('<div class="sgs-team-member__photo"><img src="/img/bob.jpg" alt="Bob"></div>')
    result = extract_field_value(el, "image-object")
    assert isinstance(result, dict)
    assert result["url"] == "/img/bob.jpg"


def test_image_object_returns_none_when_no_img():
    el = _el('<div class="sgs-team-member__photo">No image here</div>')
    result = extract_field_value(el, "image-object")
    assert result is None


# ---------------------------------------------------------------------------
# rating (STAR-count — distinct from plain-integer)
# ---------------------------------------------------------------------------

def test_rating_from_aria_label():
    el = _el('<div class="sgs-testimonial__stars" aria-label="5 stars"></div>')
    result = extract_field_value(el, "rating")
    assert result == 5


def test_rating_from_glyph_count():
    el = _el('<span class="sgs-testimonial__stars">★★★★</span>')
    result = extract_field_value(el, "rating")
    assert result == 4


def test_rating_clamped_to_zero_when_empty():
    el = _el('<span class="sgs-testimonial__stars"></span>')
    result = extract_field_value(el, "rating")
    assert result == 0


# ---------------------------------------------------------------------------
# url-href
# ---------------------------------------------------------------------------

def test_url_href_from_anchor_element():
    el = _el('<a class="sgs-card-grid__link" href="https://example.com">Read more</a>')
    result = extract_field_value(el, "url-href")
    assert result == "https://example.com"


def test_url_href_from_descendant_anchor():
    el = _el(
        '<div class="sgs-pricing__cta">'
        '<a href="https://shop.example.com">Get started</a>'
        '</div>'
    )
    result = extract_field_value(el, "url-href")
    assert result == "https://shop.example.com"


def test_url_href_rejects_javascript():
    el = _el('<a class="sgs-link" href="javascript:void(0)">Click</a>')
    result = extract_field_value(el, "url-href")
    assert result is None


def test_url_href_returns_none_when_no_anchor():
    el = _el('<span class="sgs-link">No anchor</span>')
    result = extract_field_value(el, "url-href")
    assert result is None


# ---------------------------------------------------------------------------
# plain-integer
# ---------------------------------------------------------------------------

def test_plain_integer_preserves_plus_suffix():
    el = _el('<span class="sgs-hero__count">500+</span>')
    result = extract_field_value(el, "plain-integer")
    assert result == "500+"


def test_plain_integer_preserves_leading_zero():
    el = _el('<span class="sgs-process-steps__number">01</span>')
    result = extract_field_value(el, "plain-integer")
    assert result == "01"


def test_plain_integer_returns_none_for_empty():
    el = _el('<span class="sgs-process-steps__number"></span>')
    result = extract_field_value(el, "plain-integer")
    assert result is None


# ---------------------------------------------------------------------------
# css-modifier
# ---------------------------------------------------------------------------

def test_css_modifier_extracts_bem_suffix():
    el = _el('<div class="sgs-badge sgs-badge--light">New</div>')
    result = extract_field_value(el, "css-modifier")
    assert result == "light"


def test_css_modifier_returns_none_when_no_modifier():
    el = _el('<div class="sgs-badge">New</div>')
    result = extract_field_value(el, "css-modifier")
    assert result is None


def test_css_modifier_card_grid_badge_variant_new():
    """css-modifier on .sgs-card-grid__badge extracts the variant modifier.

    card-grid badgeVariant was flipped from gap-pending to css-modifier (D248+).
    render.php emits: class="sgs-card-grid__badge sgs-card-grid__badge--{badgeVariant}"
    The handler must return the modifier value (e.g. "new") from that element.
    The selector .sgs-card-grid__badge (base class) matches the element; the
    handler reads the --modifier from the class list.
    """
    el = _el('<span class="sgs-card-grid__badge sgs-card-grid__badge--new">New</span>')
    result = extract_field_value(el, "css-modifier")
    assert result == "new"


def test_css_modifier_card_grid_badge_variant_sale():
    """css-modifier correctly extracts a different variant value (sale)."""
    el = _el('<span class="sgs-card-grid__badge sgs-card-grid__badge--sale">Sale</span>')
    result = extract_field_value(el, "css-modifier")
    assert result == "sale"


def test_css_modifier_returns_first_modifier_only():
    """When an element has multiple --modifier classes, only the FIRST is returned.

    This is the documented behaviour — and the reason hero badges position + style
    remain gap-pending: both map to the same .sgs-hero__badge element which carries
    TWO modifiers (--bottom-left --light), so the handler can't distinguish them.
    """
    el = _el(
        '<div class="sgs-hero__badge sgs-hero__badge--bottom-left sgs-hero__badge--light">'
        '<span class="sgs-hero__badge-number">4.9</span>'
        '</div>'
    )
    result = extract_field_value(el, "css-modifier")
    # Returns the FIRST modifier found — "bottom-left" — not "light".
    # This proves why position + style are still gap-pending: the generic handler
    # cannot distinguish which modifier is position vs style.
    assert result == "bottom-left"


# ---------------------------------------------------------------------------
# icon-slug — data-icon / data-lucide / BEM modifier
# ---------------------------------------------------------------------------

def test_icon_slug_from_data_icon():
    el = _el('<span class="sgs-icon-list__icon" data-icon="star"></span>')
    result = extract_field_value(el, "icon-slug")
    assert result == "star"


def test_icon_slug_from_data_lucide():
    el = _el('<span class="sgs-process-steps__icon" data-lucide="check-circle"></span>')
    result = extract_field_value(el, "icon-slug")
    assert result == "check-circle"


def test_icon_slug_data_icon_beats_bem_modifier():
    """data-icon has higher priority than BEM modifier."""
    el = _el(
        '<span class="sgs-social-icons__icon sgs-social-icons__icon--facebook" '
        'data-icon="facebook-overridden"></span>'
    )
    result = extract_field_value(el, "icon-slug")
    assert result == "facebook-overridden"


def test_icon_slug_from_bem_modifier():
    el = _el(
        '<a class="sgs-social-icons__icon sgs-social-icons__icon--twitter" '
        'href="https://twitter.com/example"></a>'
    )
    result = extract_field_value(el, "icon-slug")
    assert result == "twitter"


def test_icon_slug_returns_none_when_no_signal():
    el = _el('<span class="sgs-process-steps__icon"></span>')
    result = extract_field_value(el, "icon-slug")
    assert result is None


# ---------------------------------------------------------------------------
# icon-slug — inline SVG resolved via icon_resolver (the D248 import unlock)
#
# This test proves the import-ban allowlist addition works end-to-end:
# extract_field_value can import + call resolve_icon for inline SVGs.
# ---------------------------------------------------------------------------

def test_icon_slug_inline_svg_resolved_via_icon_resolver():
    """icon-slug with an inline <svg> calls resolve_icon (the D248 allowlist unlock).

    Uses the classic Lucide 'check' SVG path (d='M20 6 9 17l-5-5') which is in
    the reverse index and returns confidence='high', slug='check'.

    This is the key proof that icon_resolver is now a permitted import from
    converter/services/field_extractors.py — previously the import_ban gate
    would have rejected it.
    """
    check_svg_html = (
        '<span class="sgs-trust-bar__badge-icon">'
        '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>'
        '</span>'
    )
    el = _el(check_svg_html)
    result = extract_field_value(el, "icon-slug")

    # The icon_resolver may not have lucide-icons.json available in the test env.
    # If it does: result == "check" (high confidence).
    # If not: result == None (confidence="none", raw_svg not returned by this func).
    # Either way the call must NOT raise an ImportError or AttributeError.
    assert result is None or isinstance(result, str), (
        f"extract_field_value must return str or None for icon-slug+SVG, got: {result!r}"
    )

    # Stronger assertion: if the lucide index is available, we should get 'check'.
    try:
        import os
        from orchestrator.converter_v2.icon_resolver import _LUCIDE_JSON
        if os.path.exists(_LUCIDE_JSON):
            assert result == "check", (
                f"Expected slug='check' from lucide index for standard check path, "
                f"got: {result!r}"
            )
    except ImportError:
        pass  # icon_resolver not importable — skip the stronger assertion


# ---------------------------------------------------------------------------
# Shared-path de-duplication proof
#
# Prove that array_content._lift_field and scalar_content's value step BOTH
# reach extract_field_value by monkeypatching it and asserting the mock is hit.
# ---------------------------------------------------------------------------

# (Removed 2026-07-02) test_array_content_delegates_to_extract_field_value —
# targeted the deleted hand-declared _lift_field. The DB-recognition resolver's
# delegation to extract_field_value is now proven by test_array_content.py
# (real labels/icons only appear if extract_field_value ran).


def test_scalar_content_delegates_to_extract_field_value(monkeypatch):
    """lift_scalar_content's value step calls extract_field_value for text/media/rating.

    Patch extract_field_value in scalar_content's own module namespace so the
    call-time lookup picks up the mock.
    """
    import converter.resolvers.scalar_content as sc_mod
    import converter.services.field_extractors as fe_mod
    import orchestrator.converter_v2.db_lookup as db_mod
    from converter.resolvers.scalar_content import lift_scalar_content

    calls: list[tuple] = []
    # Keep a reference to the real function to call through.
    original_extract = fe_mod.extract_field_value

    def _mock_extract(element, role, media_map=None):
        calls.append((role, media_map))
        return original_extract(element, role, media_map)

    # Patch in the resolver module's namespace (where lift_scalar_content resolves it).
    monkeypatch.setattr(sc_mod, "extract_field_value", _mock_extract)

    # Patch the DB gate to let a test block through with a text-content attr.
    monkeypatch.setattr(db_mod, "capabilities_for",
                        lambda slug: frozenset({"scalar-content-lift"}))
    monkeypatch.setattr(db_mod, "block_attrs", lambda slug: {
        "headline": {
            "attr_type": "string",
            "role": "text-content",
            "derived_selector": ".sgs-test-block__headline",
        }
    })

    html = '<div class="sgs-test-block"><h2 class="sgs-test-block__headline">Hello</h2></div>'
    node = _el(html)
    result = lift_scalar_content(node, "sgs/test-block", {})

    assert any(r == "text-content" for r, _ in calls), (
        f"lift_scalar_content should call extract_field_value with role='text-content'; "
        f"calls were: {calls}"
    )
    assert "headline" in result, (
        f"lift_scalar_content should return the lifted attr, got: {result}"
    )


# ---------------------------------------------------------------------------
# Unknown role — no error, returns None
# ---------------------------------------------------------------------------

def test_unknown_role_returns_none():
    el = _el('<span class="sgs-x__y">Some content</span>')
    result = extract_field_value(el, "some-future-role-not-yet-handled")
    assert result is None
